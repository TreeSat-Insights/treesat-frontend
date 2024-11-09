import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "/src/styles/Map.css";
import CustomSlider from "./ImgSlider";
import Loader from "./loader";

const fetchGridData = async (lat, lng) => {
  try {
    const response = await fetch(`http://ec2-35-152-142-1.eu-south-1.compute.amazonaws.com/scan/1/${lat}/${lng}`);
    if (!response.ok) throw new Error('Network error');
    
    const data = await response.json();
    if (data.status !== 'success') throw new Error('API error');

    return { success: true, images: data.content.map(base64 => `data:image/png;base64,${base64}`) };
  } catch (error) {
    console.error("Data fetch error:", error);
    return { success: false, images: [] };
  }
};

export default function Map({ gridSpacingKm = 5, gridColor = "blue" }) {
  const mapRef = useRef(null), gridLayerRef = useRef(null);
  const [sidePanelContent, setSidePanelContent] = useState({ open: false, text: "", images: [], loading: false });

  const MIN_ZOOM_LEVEL = 5, MAX_ZOOM_LEVEL = 18, MIN_ZOOM_GRID = 15;

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map("map", { minZoom: MIN_ZOOM_LEVEL, maxZoom: MAX_ZOOM_LEVEL }).setView([51.505, -0.09], 13);
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: MAX_ZOOM_LEVEL }).addTo(map);

      const createGrid = () => {
        const zoom = map.getZoom();
        if (zoom < MIN_ZOOM_GRID) return gridLayerRef.current && map.removeLayer(gridLayerRef.current);
        
        const bounds = map.getBounds(), spacingLat = gridSpacingKm / 111, spacingLng = gridSpacingKm / (111 * Math.cos(bounds.getNorthWest().lat * Math.PI / 180));
        gridLayerRef.current && map.removeLayer(gridLayerRef.current);
        
        const gridLayer = L.layerGroup();
        for (let lat = Math.floor(bounds.getSouthEast().lat / spacingLat) * spacingLat; lat < bounds.getNorthWest().lat; lat += spacingLat) {
          for (let lng = Math.floor(bounds.getNorthWest().lng / spacingLng) * spacingLng; lng < bounds.getSouthEast().lng; lng += spacingLng) {
            const cellBounds = [[lat, lng], [lat + spacingLat, lng + spacingLng]], center = [lat + spacingLat / 2, lng + spacingLng / 2];
            const cell = L.rectangle(cellBounds, { color: gridColor, weight: 0.4, fillOpacity: 0.1})
              .on("mouseover", () => cell.setStyle({ fillOpacity: 0.3, color: "orange" }))
              .on("mouseout", () => cell.setStyle({ fillOpacity: 0.1, color: gridColor }))
              .on("click", async () => {
                setSidePanelContent({ open: true, text: `Cell center: (${center[0].toFixed(3)}, ${center[1].toFixed(3)})`, images: [], loading: true });
                const { success, images } = await fetchGridData(center[0], center[1]);
                setSidePanelContent({ open: true, text: `Cell center: (${center[0].toFixed(3)}, ${center[1].toFixed(3)})`, images, loading: false });
                map.setView([center[0] - 0.1, center[1]], map.getZoom(), { animate: true });
                cell.setStyle({ zIndex: 2001 });
              });
            gridLayer.addLayer(cell);
          }
        }
        gridLayerRef.current = gridLayer;
        gridLayer.addTo(map);
      };
      
      createGrid();
      map.on("moveend zoomend", createGrid);
    }
    
    return () => mapRef.current && mapRef.current.remove();
  }, [gridSpacingKm, gridColor]);

  return (
    <div className="map-container">
      <div id="map"></div>
      {sidePanelContent.open && (
        <div className={`side-panel open`}>
          <button className="close-btn" onClick={() => setSidePanelContent({ open: false })}>X</button>
          <h2>Details</h2>
          <p>{sidePanelContent.text}</p>
          <div className="slider">
            {sidePanelContent.loading ? (
              <div className="loader"><Loader /></div>
            ) : sidePanelContent.images.length > 0 ? (
              <CustomSlider>
                {sidePanelContent.images.map((img, index) => (
                  <img key={index} src={img} alt={`Grid Cell ${index + 1}`} />
                ))}
              </CustomSlider>
            ) : (
              <p>No images available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}