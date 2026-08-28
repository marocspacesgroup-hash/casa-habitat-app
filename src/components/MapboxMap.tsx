"use client";

import { useEffect, useRef, useState } from "react";

type MapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
};

const CASABLANCA_CENTER: [number, number] = [-7.6322, 33.5731];

export default function MapboxMap({
  markers = [],
  center = CASABLANCA_CENTER,
  zoom = 11,
}: {
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    if (!containerRef.current || !token) return;

    let map: import("mapbox-gl").Map | undefined;
    let cancelled = false;

    async function loadMap() {
      const { default: mapboxgl } = await import("mapbox-gl");
      if (cancelled || !containerRef.current) return;

      mapboxgl.accessToken = token;
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center,
        zoom,
        attributionControl: true,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      map.on("error", () => setMapError(true));

      markers.forEach((marker) => {
        const element = document.createElement("button");
        element.type = "button";
        element.className = "casa-map-marker";
        element.setAttribute("aria-label", `Zone générale : ${marker.label}`);
        element.title = `Zone générale : ${marker.label}`;

        new mapboxgl.Marker({ element })
          .setLngLat([marker.longitude, marker.latitude])
          .addTo(map!);
      });
    }

    loadMap().catch(() => setMapError(true));

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [center, markers, token, zoom]);

  if (!token) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center bg-navy-deep px-6 text-center text-sm text-ivory/70">
        La carte interactive sera disponible prochainement.
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center bg-navy-deep px-6 text-center text-sm text-ivory/70">
        La carte est momentanément indisponible. Contactez Casa Habitat pour en savoir plus sur ce quartier.
      </div>
    );
  }

  return <div ref={containerRef} className="h-full min-h-[360px] w-full" aria-label="Carte générale de Casablanca" />;
}
