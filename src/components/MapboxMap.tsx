 'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Correction des icônes par défaut de Leaflet en React
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface MapboxMapProps {
  latitude?: number | null;
  longitude?: number | null;
  zoom?: number;
  name?: string;
}

export default function MapboxMap({
  latitude = 33.5731,
  longitude = -7.5898,
  zoom = 14,
  name = 'Casablanca',
}: MapboxMapProps) {
  const position: [number, number] = [latitude ?? 33.5731, longitude ?? -7.5898];

  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden shadow-md z-0">
      <MapContainer
        center={position}
        zoom={zoom}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={defaultIcon}>
          <Popup>
            <div className="text-sm font-semibold">Secteur : {name}</div>
            <div className="text-xs text-gray-500">Zone générale de recherche</div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}