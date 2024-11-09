import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "/src/styles/Map.css";
import CustomSlider from "./ImgSlider";

// Function to fetch the grid data
const fetchGridData = async (lat, lng) => {
  try {
    const response = await fetch(`http://ec2-35-152-142-1.eu-south-1.compute.amazonaws.com/scan/1/1`);
    if (!response.ok) {
      throw new Error('Network response error');
    }

    const data = await response.json();
    console.log(data);

    if (data.status !== 'success') {
      throw new Error('API returned an error status');
    }

    // Convert the base64 strings to images
    const images = data.content.map((base64String) => {
      return `data:image/png;base64,${base64String}`;
    });

    return { success: true, images };
  } catch (error) {
    console.error("Error fetching or processing data:", error);
    return { success: false, images: [] }; 
  }
};

export default function Map({ gridSpacingKm = 5, gridColor = "blue" }) {
  const mapRef = useRef(null);
  const gridLayerRef = useRef(null);
  const [sidePanelContent, setSidePanelContent] = useState(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [images, setImages] = useState([]); // State to hold the images for the side panel

  const MIN_ZOOM_LEVEL_FOR_GRID = 10;
  const MIN_ZOOM_LEVEL = 5;
  const MAX_ZOOM_LEVEL = 18;

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map("map", {
        minZoom: MIN_ZOOM_LEVEL,
        maxZoom: MAX_ZOOM_LEVEL,
      }).setView([51.505, -0.09], 13);
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: MAX_ZOOM_LEVEL,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const createGrid = () => {
        const zoomLevel = map.getZoom();
        // Remove the grid if zoom is too low
        if (zoomLevel < MIN_ZOOM_LEVEL_FOR_GRID) {
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

            // Click event to open side panel with the grid cell info and images
            cell.on("click", async () => {
              setIsSidePanelOpen(false);

              // Fetch grid data and images from the API
              const { success, images } = await fetchGridData(center[0], center[1]);
              if (success) {
                setImages(images); 
              } else {
                setImages([]);
              }

              setSidePanelContent({
                text: `Cell center: (${center[0].toFixed(3)}, ${center[1].toFixed(3)})`,
                images: images || [], 
              });

              setIsSidePanelOpen(true);

              // Adjust the center position to make the clicked cell appear higher
              const adjustedCenter = [
                center[0] - 0.1, // Decrease latitude to move the view higher
                center[1], // Keep the longitude the same
              ];

              // Set the map view to center on the adjusted position
              mapRef.current.setView(adjustedCenter, mapRef.current.getZoom(), {
                animate: true, // Smooth transition
              });

              // Optionally set z-index to ensure the clicked cell is visible
              cell.setStyle({ zIndex: 2001 }); // Higher than the side panel z-index
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
  }, [gridSpacingKm, gridColor]);

  return (
    <div className="map-container">
      <div id="map"></div>
      {isSidePanelOpen && sidePanelContent && (
        <div className={`side-panel ${isSidePanelOpen ? "open" : ""}`}>
          <button className="close-btn" onClick={() => setIsSidePanelOpen(false)}>X</button>
          <h2>Details</h2>
          <p>{sidePanelContent.text}</p>
          <div className="slider">
          <CustomSlider>
            {sidePanelContent.images.length > 0 ? (
                sidePanelContent.images.map((img, index) => (
                  <img key={index} src={img} alt={`Grid Cell ${index + 1}`} />
                ))
              ) : (
                <p>No images available</p>
              )}
          </CustomSlider>
        </div>
        </div>
      )}
    </div>
  );
}
