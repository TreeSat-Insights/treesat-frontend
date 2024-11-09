import { useEffect, useRef } from "react";
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

export default function Map() {
  const mapRef = useRef(null); // Reference to the map

  useEffect(() => {
    // Initialize the map only once
    if (!mapRef.current) {
      mapRef.current = leaflet
        .map("map")
        .setView([60.1717, 24.9349], 13);

      // Add the tile layer to the map
      leaflet
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
        .addTo(mapRef.current);
    }
  }, []);

  return <div id="map" style={{ width: "100%", height: "100vh" }}></div>;
}
