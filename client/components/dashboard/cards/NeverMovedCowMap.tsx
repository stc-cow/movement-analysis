import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { NeverMovedCow } from "@shared/models";

interface NeverMovedCowMapProps {
  cows: NeverMovedCow[];
}

// Create custom icons for ON-AIR and OFF-AIR markers
const createIcon = (status: "ON-AIR" | "OFF-AIR") => {
  const color = status === "ON-AIR" ? "#22c55e" : "#ef4444";
  const bgColor = status === "ON-AIR" ? "#dcfce7" : "#fee2e2";

  const svgString = `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="${bgColor}" stroke="${color}" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="${color}"/>
      <circle cx="16" cy="16" r="3" fill="white"/>
    </svg>
  `;

  return L.icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svgString)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

export function NeverMovedCowMap({ cows }: NeverMovedCowMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    // Initialize map on component mount
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([23.6345, 46.7917], 6);

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Restrict bounds to Saudi Arabia (approximate)
    const saudiaBounds = L.latLngBounds(
      [16.0, 32.0], // Southwest
      [32.0, 55.0], // Northeast
    );
    map.setMaxBounds(saudiaBounds);
    map.fitBounds(saudiaBounds);

    mapRef.current = map;

    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when cows change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (cows.length === 0) {
      mapRef.current.setView([23.6345, 46.7917], 6);
      return;
    }

    // Add new markers
    const group = L.featureGroup();

    cows.forEach((cow) => {
      if (cow.Latitude && cow.Longitude) {
        const marker = L.marker([cow.Latitude, cow.Longitude], {
          icon: createIcon(cow.Status),
        });

        marker.bindPopup(`
          <div class="p-2 text-sm">
            <p class="font-semibold">${cow.COW_ID}</p>
            <p class="text-xs text-gray-600">${cow.Location}</p>
            <p class="text-xs text-gray-500">${cow.Region}, ${cow.District}, ${cow.City}</p>
            <p class="mt-2">
              <span class="inline-block px-2 py-1 rounded text-xs font-medium ${
                cow.Status === "ON-AIR"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }">
                ${cow.Status}
              </span>
            </p>
            <p class="text-xs text-gray-600 mt-1">
              Last Deploy: ${new Date(cow.Last_Deploy_Date).toLocaleDateString()}
            </p>
            <p class="text-xs text-gray-600">
              Days: ${cow.Days_On_Air} days
            </p>
          </div>
        `);

        marker.addTo(group);
        markersRef.current.push(marker);
      }
    });

    group.addTo(mapRef.current);

    // Fit map to markers
    if (markersRef.current.length > 0) {
      mapRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  }, [cows]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full bg-gray-100"
      style={{ minHeight: "500px" }}
    />
  );
}
