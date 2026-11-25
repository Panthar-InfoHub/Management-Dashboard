"use client";

// Office location picker. Open-source only:
//   - map tiles: OpenStreetMap
//   - address search: Photon (photon.komoot.io), an OSM-based geocoder that
//     supports search-as-you-type
// The pin stays fixed in the centre; you move the map under it, so dragging to
// look around never drops a pin by accident. Loaded only when the dialog opens.
import { useEffect, useEffectEvent, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PickedPlace = { lat: number; lng: number; label: string | null };

type SearchResult = { id: string; title: string; subtitle: string; lat: number; lng: number };

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: { osm_id?: number; name?: string; housenumber?: string; street?: string; district?: string; city?: string; state?: string; postcode?: string; country?: string };
};

function describe(p: PhotonFeature["properties"]) {
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const title = p.name || street || p.city || p.state || "Unnamed place";
  const subtitle = [p.name ? street : null, p.district, p.city, p.state, p.postcode, p.country].filter(Boolean).join(", ");
  return { title, subtitle };
}

const round6 = (n: number) => Number(n.toFixed(6));

export default function OfficeMap({
  initial,
  radiusMeters,
  onChange,
}: {
  initial: { lat: number; lng: number };
  radiusMeters: number;
  /** Called whenever the centre (the office point) settles, with a label if it came from search. */
  onChange: (place: PickedPlace) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const labelRef = useRef<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const emitChange = useEffectEvent((place: PickedPlace) => onChange(place));

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const start: L.LatLngExpression = [initial.lat, initial.lng];
    const map = L.map(containerRef.current, { zoomControl: true }).setView(start, 17);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Search by <a href="https://photon.komoot.io">Photon</a>',
    }).addTo(map);
    const circle = L.circle(start, { radius: radiusMeters, color: "#006bff", weight: 1, fillOpacity: 0.1, interactive: false }).addTo(map);

    map.on("move", () => circle.setLatLng(map.getCenter()));
    map.on("moveend", () => {
      const c = map.getCenter();
      emitChange({ lat: round6(c.lat), lng: round6(c.lng), label: labelRef.current });
    });
    // A manual pan means the point no longer matches the searched label.
    map.on("dragstart", () => { labelRef.current = null; });

    mapRef.current = map;
    circleRef.current = circle;
    // The dialog animates in; measure again once it has its final size.
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once
  }, []);

  useEffect(() => {
    if (Number.isFinite(radiusMeters) && radiusMeters > 0) circleRef.current?.setRadius(radiusMeters);
  }, [radiusMeters]);

  // Search as you type (debounced), biased towards the current map area.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return; // results are hidden below 3 characters
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const c = mapRef.current?.getCenter();
        // Strong bias to the area on screen, so local places rank first.
        const params = new URLSearchParams({
          q, limit: "6", lang: "en",
          ...(c ? { lat: String(c.lat), lon: String(c.lng), zoom: "12", location_bias_scale: "0.1" } : {}),
        });
        const res = await fetch(`https://photon.komoot.io/api/?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data: { features: PhotonFeature[] } = await res.json();
        setResults(data.features.map((f, i) => {
          const { title, subtitle } = describe(f.properties);
          return { id: `${f.properties.osm_id ?? i}-${i}`, title, subtitle, lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] };
        }));
        setShowResults(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  const goTo = (lat: number, lng: number, label: string | null) => {
    labelRef.current = label;
    mapRef.current?.flyTo([lat, lng], 18, { duration: 0.6 });
  };

  const pick = (r: SearchResult) => {
    setShowResults(false);
    setQuery(r.title);
    goTo(r.lat, r.lng, [r.title, r.subtitle].filter(Boolean).join(", "));
  };

  const locateMe = () => {
    if (!("geolocation" in navigator)) return toast.error("This browser can't share location.");
    navigator.geolocation.getCurrentPosition(
      (pos) => goTo(pos.coords.latitude, pos.coords.longitude, null),
      () => toast.error("Location not shared. Allow location access and try again."),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setShowResults(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); if (results[0]) pick(results[0]); }
                if (e.key === "Escape") setShowResults(false);
              }}
              placeholder="Search a building, street or area"
              aria-label="Search for a place"
              className="pl-9"
              autoComplete="off"
            />
          </div>
          <Button type="button" variant="outline" className="gap-2" onClick={locateMe}>
            <LocateFixed className="h-4 w-4" /> My Location
          </Button>
        </div>
        {showResults && query.trim().length >= 3 && (
          <ul role="listbox" className="absolute z-[1000] mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border/60 bg-popover py-1 shadow-md">
            {searching && results.length === 0 && <li className="px-3 py-2 text-xs text-muted-foreground">Searching…</li>}
            {!searching && results.length === 0 && <li className="px-3 py-2 text-xs text-muted-foreground">No places found. Try a nearby landmark or street.</li>}
            {results.map((r) => (
              <li key={r.id}>
                <button type="button" role="option" aria-selected={false} onClick={() => pick(r)} className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-accent">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{r.title}</span>
                    {r.subtitle && <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative h-[420px] w-full overflow-hidden rounded-lg border border-border/40">
        <div ref={containerRef} className="h-full w-full" aria-label="Map. Move the map to place the office under the pin." />
        {/* Fixed centre pin: the office is wherever the map is centred. */}
        <div className={cn("pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full")} aria-hidden>
          <MapPin className="h-9 w-9 fill-[#006bff] text-white drop-shadow-md" strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Move the map so the pin sits on the office entrance. The circle is the clock-in radius.</p>
    </div>
  );
}
