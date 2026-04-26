export const fetchRoute = async (start, end) => {
  try {
    // OSRM requires coordinates in [longitude, latitude] order
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch route');
    }
    
    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      // OSRM returns coordinates as [lng, lat], react-leaflet Polyline needs [lat, lng]
      const coords = data.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
      return coords;
    }
    return null;
  } catch (error) {
    console.error("Error fetching route:", error);
    return null;
  }
};
