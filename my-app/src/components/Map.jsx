import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "/src/styles/Map.css";  

export default function Map({ gridSpacingKm = 5, gridColor = "blue", maxZoom = 19 }) {
  const mapRef = useRef(null);
  const gridLayerRef = useRef(null);
  const [sidePanelContent, setSidePanelContent] = useState(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

  const MIN_ZOOM_LEVEL = 10;

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map("map", { maxZoom }).setView([51.505, -0.09], 13);  // Set custom maxZoom
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const createGrid = () => {
        const zoomLevel = map.getZoom();
        // Remove the grid if zoom is too low
        if (zoomLevel < MIN_ZOOM_LEVEL) {
          gridLayerRef.current && map.removeLayer(gridLayerRef.current);
          return;
        }

        const bounds = map.getBounds();
        const [topLeft, bottomRight] = [bounds.getNorthWest(), bounds.getSouthEast()];
        const spacingLat = gridSpacingKm / 111, spacingLng = gridSpacingKm / (111 * Math.cos(topLeft.lat * Math.PI / 180));

        if (gridLayerRef.current) map.removeLayer(gridLayerRef.current);
        const gridLayer = L.layerGroup();
        gridLayerRef.current = gridLayer;

        for (let lat = Math.floor(bottomRight.lat / spacingLat) * spacingLat; lat < topLeft.lat; lat += spacingLat) {
          for (let lng = Math.floor(topLeft.lng / spacingLng) * spacingLng; lng < bottomRight.lng; lng += spacingLng) {
            const cellBounds = [[lat, lng], [lat + spacingLat, lng + spacingLng]];
            const cell = L.rectangle(cellBounds, {
              color: gridColor,
              weight: 1,
              fillOpacity: 0.1,
            });
            const center = [(lat + lat + spacingLat) / 2, (lng + lng + spacingLng) / 2];

            // Mouseover and mouseout events to change the style
            cell.on("mouseover", () => cell.setStyle({ fillOpacity: 0.3, color: "orange" }));
            cell.on("mouseout", () => cell.setStyle({ fillOpacity: 0.1, color: gridColor }));

            // Click event to open side panel with the grid cell info
            cell.on("click", () => {
              setSidePanelContent(`Cell center: (${center[0].toFixed(3)}, ${center[1].toFixed(3)})`);
              setIsSidePanelOpen(true);
            });

            gridLayer.addLayer(cell);
          }
        }

        gridLayer.addTo(map);
      };

      createGrid();
      map.on("moveend zoomend", createGrid);

    }

    return () => mapRef.current && mapRef.current.remove();
  }, [gridSpacingKm, gridColor, maxZoom]); 

  return (
    <div className="map-container">
      <div id="map"></div>
      {isSidePanelOpen && sidePanelContent && (
        <div className={`side-panel ${isSidePanelOpen ? "open" : ""}`}>
          <button className="close-btn" onClick={() => setIsSidePanelOpen(false)}>X</button>
          <h2>Details</h2>
          <p>{sidePanelContent}</p>
        </div>
      )}
    </div>
  );
}
