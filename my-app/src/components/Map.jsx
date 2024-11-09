import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "/src/styles/Map.css";  // Import a CSS file for styling

export default function Map({ gridSpacingKm = 5 }) {
  const mapRef = useRef(null);
  const gridLayerRef = useRef(null);
  const [sidePanelContent, setSidePanelContent] = useState(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false); // Initially, side panel is closed

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map("map").setView([51.505, -0.09], 13);
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const createVisibleGrid = (spacingKm) => {
        if (gridLayerRef.current) {
          map.removeLayer(gridLayerRef.current);
        }

        const gridLayer = L.layerGroup();
        gridLayerRef.current = gridLayer;

        const bounds = map.getBounds();
        const topLeft = bounds.getNorthWest();
        const bottomRight = bounds.getSouthEast();

        const spacingLat = spacingKm / 111;
        const spacingLng = spacingKm / (111 * Math.cos((topLeft.lat * Math.PI) / 180));

        for (let lat = Math.floor(bottomRight.lat / spacingLat) * spacingLat; lat < topLeft.lat; lat += spacingLat) {
          for (let lng = Math.floor(topLeft.lng / spacingLng) * spacingLng; lng < bottomRight.lng; lng += spacingLng) {
            const cellBounds = [
              [lat, lng],
              [lat + spacingLat, lng + spacingLng],
            ];

            const cell = L.rectangle(cellBounds, {
              color: "blue",
              weight: 1,
              fillOpacity: 0.1,
            });

            cell.on("mouseover", () => {
              cell.setStyle({ fillOpacity: 0.3, color: "orange" });
            });
            cell.on("mouseout", () => {
              cell.setStyle({ fillOpacity: 0.1, color: "blue" });
            });
            cell.on("click", () => {
              setSidePanelContent(`Cell center: (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
              setIsSidePanelOpen(true);  // Open the side panel when a square is clicked
            });

            cell.addTo(gridLayer);
          }
        }

        gridLayer.addTo(map);
      };

      createVisibleGrid(gridSpacingKm);

      map.on("moveend", () => {
        createVisibleGrid(gridSpacingKm);
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [gridSpacingKm]);

  const toggleSidePanel = () => {
    setIsSidePanelOpen(!isSidePanelOpen);  // Toggle the side panel visibility
  };

  return (
    <div className="map-container">
      <div id="map" style={{ height: "100vh", width: isSidePanelOpen ? "calc(100% - 300px)" : "100%" }}></div>
      
      {isSidePanelOpen && sidePanelContent && (
        <div className="side-panel">
          <button className="close-btn" onClick={toggleSidePanel}>X</button>
          <h2>Details</h2>
          <p>{sidePanelContent}</p>
        </div>
      )}
    </div>
  );
}
