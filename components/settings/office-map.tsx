"use client";

// Office location picker: OpenStreetMap tiles via Leaflet. Click the map or
// drag the pin to move the office; the circle shows the clock-in radius.
// Loaded with next/dynamic (ssr: false) only on Settings → Office.
import { useEffect, useEffectEvent, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// A CSS pin, so no marker image files need to be bundled.
const pinIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:#006bff;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export default function OfficeMap({
  lat,
  lng,
  radiusMeters,
  onChange,
}: {
  lat: number;
  lng: number;
  radiusMeters: number;
  onChange: (point: { lat: number; lng: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  // Always calls the latest onChange from Leaflet's event handlers.
  const emitChange = useEffectEvent((point: { lat: number; lng: number }) => onChange(point));

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const start: L.LatLngExpression = [Number.isFinite(lat) ? lat : 25.45637, Number.isFinite(lng) ? lng : 78.5322];
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(start, 17);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const marker = L.marker(start, { draggable: true, icon: pinIcon, keyboard: true, title: "Office location" }).addTo(map);
    const circle = L.circle(start, { radius: radiusMeters, color: "#006bff", weight: 1, fillOpacity: 0.12 }).addTo(map);

    const move = (p: L.LatLng) => {
      marker.setLatLng(p);
      circle.setLatLng(p);
      emitChange({ lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)) });
    };
    marker.on("dragend", () => move(marker.getLatLng()));
    map.on("click", (e: L.LeafletMouseEvent) => move(e.latlng));

    mapRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; updates below keep it in sync
  }, []);

  // Follow typed coordinates and "Use My Location".
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !markerRef.current) return;
    const current = markerRef.current.getLatLng();
    if (Math.abs(current.lat - lat) < 1e-7 && Math.abs(current.lng - lng) < 1e-7) return;
    markerRef.current.setLatLng([lat, lng]);
    circleRef.current?.setLatLng([lat, lng]);
    mapRef.current?.panTo([lat, lng]);
  }, [lat, lng]);

  useEffect(() => {
    if (Number.isFinite(radiusMeters) && radiusMeters > 0) circleRef.current?.setRadius(radiusMeters);
  }, [radiusMeters]);

  return <div ref={containerRef} className="h-[320px] w-full overflow-hidden rounded-lg border border-border/40" aria-label="Office location map" />;
}
