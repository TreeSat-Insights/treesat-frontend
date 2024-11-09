import { useEffect, useRef } from "react";
import L from "leaflet";

export default function Map({ gridSpacingKm = 5 }) {
  const mapRef = useRef(null);
  const gridLayerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) {
      // Initialize the map
      const map = L.map("map").setView([51.505, -0.09], 13);
      mapRef.current = map;

      // Add the OpenStreetMap tile layer
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Function to create a grid within the current map bounds
      const createVisibleGrid = (spacingKm) => {
        if (gridLayerRef.current) {
          map.removeLayer(gridLayerRef.current); // Remove old grid layer
        }

        const gridLayer = L.layerGroup(); // New layer for grid cells
        gridLayerRef.current = gridLayer;

        const bounds = map.getBounds();
        const topLeft = bounds.getNorthWest();
        const bottomRight = bounds.getSouthEast();

        // Convert spacing from kilometers to degrees (approximate)
        const spacingLat = spacingKm / 111; // 1 degree latitude ~ 111 km
        const spacingLng = spacingKm / (111 * Math.cos((topLeft.lat * Math.PI) / 180));

        // Draw grid cells only within the visible bounds
        for (let lat = Math.floor(bottomRight.lat / spacingLat) * spacingLat; lat < topLeft.lat; lat += spacingLat) {
          for (let lng = Math.floor(topLeft.lng / spacingLng) * spacingLng; lng < bottomRight.lng; lng += spacingLng) {
            const cellBounds = [
              [lat, lng],
              [lat + spacingLat, lng + spacingLng],
            ];

            // Create an interactive rectangle for each visible cell
            const cell = L.rectangle(cellBounds, {
              color: "blue",
              weight: 1,
              fillOpacity: 0.1,
            });

            // Add interactivity
            cell.on("mouseover", () => {
              cell.setStyle({ fillOpacity: 0.3, color: "orange" });
            });
            cell.on("mouseout", () => {
              cell.setStyle({ fillOpacity: 0.1, color: "blue" });
            });
            cell.on("click", () => {
              L.popup()
                .setLatLng([lat + spacingLat / 2, lng + spacingLng / 2]) // Center of the cell
                .setContent(`Cell center: (${lat.toFixed(3)}, ${lng.toFixed(3)})`)
                .openOn(map);
            });

            cell.addTo(gridLayer);
          }
        }

        gridLayer.addTo(map); // Add the grid layer to the map
      };

      // Create the initial grid within the visible area
      createVisibleGrid(gridSpacingKm);

      // Update the grid on map movement
      map.on("moveend", () => {
        createVisibleGrid(gridSpacingKm);
      });
    }

    // Cleanup on component unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [gridSpacingKm]);

  return <div id="map" style={{ height: "100vh", width: "100%" }}></div>;
}