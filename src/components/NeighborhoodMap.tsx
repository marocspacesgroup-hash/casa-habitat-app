'use client';

import dynamic from 'next/dynamic';

const MapboxMap = dynamic(() => import('@/components/MapboxMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-gray-100 rounded-xl animate-pulse flex items-center justify-center text-gray-400">
      Chargement de la carte interactive...
    </div>
  ),
});

interface NeighborhoodMapProps {
  latitude?: number | null;
  longitude?: number | null;
  zoom?: number;
  name?: string;
}

export default function NeighborhoodMap(props: NeighborhoodMapProps) {
  return <MapboxMap {...props} />;
}