"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

/**
 * A Suspense boundary that starts over whenever the URL's query changes, so a
 * new month, date, tab or filter shows the skeleton straight away instead of
 * leaving the old content on screen until the new data arrives.
 * Use it in place of <Suspense> around a page body that reads searchParams.
 */
export function ParamsSuspense({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  return (
    // Outer boundary: reading the query on the client needs one while prerendering.
    <Suspense fallback={fallback}>
      <Keyed fallback={fallback}>{children}</Keyed>
    </Suspense>
  );
}

function Keyed({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const params = useSearchParams();
  return (
    <Suspense key={params.toString()} fallback={fallback}>
      {children}
    </Suspense>
  );
}
