// GPS-карта — СТРОГО opt-in (план Phase 2, §B.3).
// Leaflet и его CSS грузятся только динамически, после явного клика пользователя.
// Тайлы OSM уходят третьей стороне и раскрывают примерный регион — об этом
// честно предупреждает подпись в ExifTool ДО включения карты.

import { useEffect, useRef, useState } from "react";

interface ExifMapProps {
  lat: number;
  lon: number;
}

export function ExifMap({ lat, lon }: ExifMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leaflet, setLeaflet] = useState<typeof import("leaflet") | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")])
      .then(([L]) => {
        if (!cancelled) setLeaflet(L);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!leaflet || !containerRef.current) return;
    const map = leaflet.map(containerRef.current).setView([lat, lon], 13);
    leaflet
      .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      })
      .addTo(map);
    leaflet.marker([lat, lon]).addTo(map);
    return () => {
      map.remove();
    };
  }, [leaflet, lat, lon]);

  if (failed) {
    return (
      <div className="flex h-64 items-center justify-center rounded-md border text-sm text-muted-foreground">
        Could not load the map library. Coordinates: {lat.toFixed(6)}, {lon.toFixed(6)}
      </div>
    );
  }

  return (
    <div>
      {leaflet ? (
        <div ref={containerRef} className="h-64 w-full rounded-md border" />
      ) : (
        <div className="flex h-64 items-center justify-center rounded-md border">
          <span className="text-sm text-muted-foreground">Loading map…</span>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Map data &copy; OpenStreetMap contributors. Tile requests go to openstreetmap.org and reveal
        the approximate region of this location to a third party. Your file itself never leaves your device.
      </p>
    </div>
  );
}
