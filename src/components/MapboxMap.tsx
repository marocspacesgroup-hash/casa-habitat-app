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
    const container = containerRef.current;
    if (!container || !token) return;
    const accessToken = token;

    let map: import("mapbox-gl").Map | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let cancelled = false;

    async function loadMap() {
      const { default: mapboxgl } = await import("mapbox-gl");
      if (cancelled || !container) return;

      mapboxgl.accessToken = accessToken;
      const instance = new mapboxgl.Map({
        container,
        style: "mapbox://styles/mapbox/dark-v11",
        center,
        zoom,
        attributionControl: true,
      });
      map = instance;

      instance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

      // Pas de boussole affichée : on bloque la rotation pour qu'un geste à deux
      // doigts sur mobile ne laisse pas la carte tournée sans moyen de revenir au nord.
      // Le zoom au pincement reste actif.
      instance.dragRotate.disable();
      instance.touchZoomRotate.disableRotation();

      // Sur mobile, le conteneur peut changer de taille après l'initialisation :
      // on recalcule les dimensions au chargement puis à chaque redimensionnement.
      let loaded = false;
      instance.once("load", () => {
        loaded = true;
        instance.resize();
      });
      resizeObserver = new ResizeObserver(() => instance.resize());
      resizeObserver.observe(container);

      // Seule une erreur avant le premier rendu (token, style) masque la carte ;
      // une tuile en échec ensuite ne doit pas la remplacer par le message d'erreur.
      instance.on("error", (event) => {
        console.error("[MapboxMap]", event.error);
        if (!loaded) setMapError(true);
      });

      markers.forEach((marker) => {
        const element = document.createElement("button");
        element.type = "button";
        element.className = "casa-map-marker";
        element.setAttribute("aria-label", `Zone générale : ${marker.label}`);
        element.title = `Zone générale : ${marker.label}`;

        // Toucher / cliquer le marqueur affiche le nom du quartier (texte brut, pas de HTML).
        const popup = new mapboxgl.Popup({ offset: 18, closeButton: false, className: "casa-map-popup" })
          .setText(`Zone générale : ${marker.label}`);

        new mapboxgl.Marker({ element })
          .setLngLat([marker.longitude, marker.latitude])
          .setPopup(popup)
          .addTo(instance);
      });
    }

    loadMap().catch((error) => {
      console.error("[MapboxMap]", error);
      setMapError(true);
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
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
