import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { NeverMovedCow } from "@shared/models";

interface NeverMovedCowMapProps {
  cows: NeverMovedCow[];
  onCowSelected?: (cow: NeverMovedCow) => void;
}

// Create custom icons based on years on-air bucket
const createIcon = (yearsOnAir: number) => {
  // Determine color based on years on-air bucket (matching chart colors)
  let color: string;
  let bgColor: string;

  if (yearsOnAir <= 3) {
    color = "#FF375E"; // Red (Base) - 1-3 Years
    bgColor = "#FFE8ED";
  } else if (yearsOnAir <= 6) {
    color = "#1Bced8"; // Teal (Base) - 4-6 Years
    bgColor = "#E0F7FB";
  } else if (yearsOnAir <= 9) {
    color = "#4F008C"; // Purple (Base) - 7-9 Years
    bgColor = "#F3E5FF";
  } else if (yearsOnAir <= 12) {
    color = "#FF6F8A"; // Red (Light) - 10-12 Years
    bgColor = "#FFE8ED";
  } else {
    color = "#5FE0E7"; // Teal (Light) - 12+ Years
    bgColor = "#E0F7FB";
  }

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

export function NeverMovedCowMap({
  cows,
  onCowSelected,
}: NeverMovedCowMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    // Initialize map on component mount
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([23.6345, 46.7917], 6);

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    // Restrict bounds to Saudi Arabia (approximate)
    const saudiaBounds = L.latLngBounds(
      [16.0, 32.0], // Southwest
      [32.0, 55.0], // Northeast
    );
    map.setMaxBounds(saudiaBounds);
    map.fitBounds(saudiaBounds);

    // Add legend
    const legend = L.control({ position: "bottomright" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend");
      const legendData = [
        { range: "1-3 Years", color: "#FF375E" },
        { range: "4-6 Years", color: "#1Bced8" },
        { range: "7-9 Years", color: "#4F008C" },
        { range: "10-12 Years", color: "#FF6F8A" },
        { range: "12+ Years", color: "#5FE0E7" },
      ];

      div.innerHTML = `
        <div style="background: white; padding: 12px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-size: 12px;">
          <div style="font-weight: bold; margin-bottom: 8px; color: #374151;">Years On-Air</div>
          ${legendData
            .map(
              (item) =>
                `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <div style="width: 16px; height: 16px; border-radius: 50%; background-color: ${item.color}; border: 2px solid ${item.color};"></div>
            <span style="color: #6b7280;">${item.range}</span>
          </div>`,
            )
            .join("")}
        </div>
      `;
      return div;
    };
    legend.addTo(map);

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
        const yearsOnAir = (cow.Days_On_Air || 0) / 365;
        const marker = L.marker([cow.Latitude, cow.Longitude], {
          icon: createIcon(yearsOnAir),
        });

        // Add click handler to show full details
        marker.on("click", () => {
          onCowSelected?.(cow);
        });

        // Set cursor to pointer on hover to indicate clickability
        marker.on("mouseover", function () {
          this.setOpacity(0.8);
        });

        marker.on("mouseout", function () {
          this.setOpacity(1);
        });

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
