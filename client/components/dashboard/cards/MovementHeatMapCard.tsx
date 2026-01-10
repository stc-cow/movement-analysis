import { useMemo, useEffect } from "react";
import { CowMovementsFact, DimLocation } from "@shared/models";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";

interface MovementHeatMapCardProps {
  movements: CowMovementsFact[];
  locations: DimLocation[];
}

interface MovementFlow {
  fromLoc: DimLocation;
  toLoc: DimLocation;
  count: number;
  movementIds: string[];
}

// Saudi Arabia bounding box
const SAUDI_BOUNDS = L.latLngBounds([16.4, 34.4], [32.15, 55.67]);

// Custom hook to fit map bounds to all markers within Saudi Arabia
function FitBounds({
  locations,
}: {
  locations: DimLocation[];
}) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) return;

    // Create bounds from location coordinates
    const locationBounds = L.latLngBounds(
      locations.map((loc) => [loc.Latitude, loc.Longitude]),
    );

    // Check if location bounds are within Saudi Arabia
    if (SAUDI_BOUNDS.contains(locationBounds.getNorthEast()) &&
        SAUDI_BOUNDS.contains(locationBounds.getSouthWest())) {
      // All locations are within Saudi Arabia, fit to them
      map.fitBounds(locationBounds, { padding: [50, 50] });
    } else {
      // Fit to Saudi Arabia bounds
      map.fitBounds(SAUDI_BOUNDS, { padding: [50, 50] });
    }
  }, [map, locations]);

  return null;
}

// Custom hook to enforce Saudi Arabia boundary
function EnforceSaudiBoundary() {
  const map = useMap();

  useEffect(() => {
    // Set max bounds to prevent panning outside Saudi Arabia
    map.setMaxBounds(SAUDI_BOUNDS);

    // Restrict zoom levels
    map.setMinZoom(4); // Can't zoom out too far
    map.setMaxZoom(15); // Can't zoom in too far

    // Constrain the map view to Saudi Arabia on load and pan
    const constrainView = () => {
      const bounds = map.getBounds();
      if (!SAUDI_BOUNDS.contains(bounds)) {
        map.fitBounds(SAUDI_BOUNDS, { padding: [50, 50] });
      }
    };

    map.on("dragend", constrainView);
    map.on("zoomend", constrainView);

    // Initial constraint
    constrainView();

    return () => {
      map.off("dragend", constrainView);
      map.off("zoomend", constrainView);
    };
  }, [map]);

  return null;
}

// Helper function to check if coordinates are within Saudi Arabia
function isWithinSaudiBounds(lat: number, lon: number): boolean {
  // Saudi Arabia bounds: South 16.4°, North 32.15°, West 34.4°, East 55.67°
  return lat >= 16.4 && lat <= 32.15 && lon >= 34.4 && lon <= 55.67;
}

export function MovementHeatMapCard({
  movements,
  locations,
}: MovementHeatMapCardProps) {
  // Filter locations to only include those within Saudi Arabia
  const validLocations = useMemo(() => {
    return locations.filter(
      (loc) => isWithinSaudiBounds(loc.Latitude, loc.Longitude),
    );
  }, [locations]);

  const locMap = useMemo(
    () => new Map(validLocations.map((l) => [l.Location_ID, l])),
    [validLocations],
  );

  // Aggregate movements by from-to location pairs (only valid locations)
  const flowData = useMemo(() => {
    const flowsMap = new Map<string, MovementFlow>();

    movements.forEach((mov) => {
      const fromLoc = locMap.get(mov.From_Location_ID);
      const toLoc = locMap.get(mov.To_Location_ID);

      if (!fromLoc || !toLoc) return;

      const key = `${mov.From_Location_ID}|${mov.To_Location_ID}`;

      if (!flowsMap.has(key)) {
        flowsMap.set(key, {
          fromLoc,
          toLoc,
          count: 0,
          movementIds: [],
        });
      }

      const flow = flowsMap.get(key)!;
      flow.count++;
      flow.movementIds.push(mov.COW_ID);
    });

    return Array.from(flowsMap.values()).sort((a, b) => b.count - a.count);
  }, [movements, locMap]);

  // Calculate max count for color scaling
  const maxCount = useMemo(() => {
    return Math.max(...flowData.map((f) => f.count), 1);
  }, [flowData]);

  // Generate color based on movement intensity (yellow to red gradient)
  const getColorForIntensity = (count: number, max: number): string => {
    const intensity = Math.min(count / max, 1);
    // Yellow (60°) to Red (0°) gradient
    const hue = 60 * (1 - intensity); // 60° (yellow) to 0° (red)
    const saturation = 100; // Full saturation for vibrant colors
    const lightness = 50; // Medium lightness for visibility

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // Get unique locations for markers
  const uniqueLocations = useMemo(() => {
    const locSet = new Set<string>();
    flowData.forEach((flow) => {
      locSet.add(flow.fromLoc.Location_ID);
      locSet.add(flow.toLoc.Location_ID);
    });
    return Array.from(locSet).map((id) => locMap.get(id)!);
  }, [flowData, locMap]);

  return (
    <div className="h-full w-full overflow-y-auto flex flex-col bg-gradient-to-br from-white via-blue-50/20 to-white dark:from-slate-800 dark:via-slate-800/50 dark:to-slate-800 p-6">
      <div className="flex-shrink-0 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Movement Heat Map
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Origin coordinates (S, T) to Destination coordinates (W, X) - Line thickness and color indicate movement frequency
        </p>
      </div>

      <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-slate-700 shadow-lg">
        {flowData.length > 0 ? (
          <MapContainer
            center={[24.0, 46.0]}
            zoom={5}
            style={{ width: "100%", height: "100%" }}
            maxBounds={SAUDI_BOUNDS}
            maxBoundsViscosity={1.0}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Enforce Saudi Arabia boundary */}
            <EnforceSaudiBoundary />

            {/* Draw movement flow lines */}
            {flowData.map((flow, idx) => {
              const color = getColorForIntensity(flow.count, maxCount);
              const weight = Math.max(1, (flow.count / maxCount) * 8); // 1 to 8px
              const opacity = 0.6 + (flow.count / maxCount) * 0.4; // 0.6 to 1.0

              return (
                <Polyline
                  key={`flow-${idx}`}
                  positions={[
                    [flow.fromLoc.Latitude, flow.fromLoc.Longitude],
                    [flow.toLoc.Latitude, flow.toLoc.Longitude],
                  ]}
                  color={color}
                  weight={weight}
                  opacity={opacity}
                  dashArray={flow.count < maxCount * 0.2 ? "5, 5" : ""}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold text-gray-900 mb-2">
                        {flow.fromLoc.Location_Name} → {flow.toLoc.Location_Name}
                      </p>
                      <div className="space-y-1 text-gray-700">
                        <p>
                          <strong>Movements:</strong> {flow.count}
                        </p>
                        <p>
                          <strong>From:</strong> {flow.fromLoc.Latitude.toFixed(3)}°,{" "}
                          {flow.fromLoc.Longitude.toFixed(3)}°
                        </p>
                        <p>
                          <strong>To:</strong> {flow.toLoc.Latitude.toFixed(3)}°,{" "}
                          {flow.toLoc.Longitude.toFixed(3)}°
                        </p>
                        <p>
                          <strong>Distance:</strong>{" "}
                          {(
                            Math.sqrt(
                              Math.pow(
                                flow.toLoc.Latitude - flow.fromLoc.Latitude,
                                2,
                              ) +
                                Math.pow(
                                  flow.toLoc.Longitude - flow.fromLoc.Longitude,
                                  2,
                                ),
                            ) * 111
                          ).toFixed(1)}{" "}
                          km
                        </p>
                      </div>
                    </div>
                  </Popup>
                </Polyline>
              );
            })}

            {/* Draw location markers */}
            {uniqueLocations.map((loc) => {
              // Count outgoing and incoming flows
              const outgoing = flowData.filter(
                (f) => f.fromLoc.Location_ID === loc.Location_ID,
              ).length;
              const incoming = flowData.filter(
                (f) => f.toLoc.Location_ID === loc.Location_ID,
              ).length;
              const total = outgoing + incoming;

              const markerColor =
                loc.Location_Type === "Warehouse" ? "#8b7355" : "#06b6d4";
              const markerRadius = Math.max(5, Math.min(15, 5 + total * 1.5));

              return (
                <CircleMarker
                  key={`marker-${loc.Location_ID}`}
                  center={[loc.Latitude, loc.Longitude]}
                  radius={markerRadius}
                  fill={true}
                  fillColor={markerColor}
                  fillOpacity={0.8}
                  color="#ffffff"
                  weight={2}
                  opacity={1}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold text-gray-900 mb-2">
                        {loc.Location_Name}
                      </p>
                      <div className="space-y-1 text-gray-700">
                        <p>
                          <strong>Type:</strong> {loc.Location_Type}
                        </p>
                        <p>
                          <strong>Region:</strong> {loc.Region}
                        </p>
                        <p>
                          <strong>Coordinates:</strong> {loc.Latitude.toFixed(3)}°,{" "}
                          {loc.Longitude.toFixed(3)}°
                        </p>
                        <p>
                          <strong>Outgoing:</strong> {outgoing}
                        </p>
                        <p>
                          <strong>Incoming:</strong> {incoming}
                        </p>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            <FitBounds locations={uniqueLocations} />
          </MapContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <p className="text-lg">No movement data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
