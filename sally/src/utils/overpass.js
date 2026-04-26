/**
 * Fetches hospitals from OpenStreetMap using the Overpass API.
 */
export const fetchNearbyHospitals = async (lat, lng, radiusMeters) => {
  const overpassUrl = "https://overpass-api.de/api/interpreter";
  
  // Overpass QL query: find hospitals in a radius around a coordinate
  const query = `
    [out:json];
    (
      node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      relation["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
    );
    out center;
  `;

  try {
    const response = await fetch(overpassUrl, {
      method: "POST",
      body: query
    });

    if (!response.ok) {
      throw new Error("Failed to fetch data from Overpass API");
    }

    const data = await response.json();
    
    // Map the results to a simpler format
    return data.elements.map(element => {
      const location = element.type === "node" ? { lat: element.lat, lng: element.lon } : { lat: element.center.lat, lng: element.center.lon };
      return {
        id: element.id,
        name: element.tags.name || "Unnamed Hospital",
        lat: location.lat,
        lng: location.lng,
        address: element.tags["addr:street"] || ""
      };
    });
  } catch (error) {
    console.error("Error fetching hospitals:", error);
    return [];
  }
};
