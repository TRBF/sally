import * as turf from '@turf/turf';

/**
 * Takes an array of circle objects {lat, lng, radius} and merges them into a single GeoJSON blob.
 * It also automatically connects the dots with a buffered line corridor.
 */
export const mergeCircles = (circles) => {
  if (!circles || circles.length === 0) return null;

  let mergedBlob = null;

  try {
    for (let i = 0; i < circles.length; i++) {
      const circle = circles[i];
      const point = turf.point([circle.lng, circle.lat]);
      const radiusKm = circle.radius / 1000;
      const bufferedPoint = turf.buffer(point, radiusKm, { units: 'kilometers', steps: 32 });

      if (!mergedBlob) {
        mergedBlob = bufferedPoint;
      } else {
        // Union the new point
        mergedBlob = turf.union(turf.featureCollection([mergedBlob, bufferedPoint]));
        
        // Connect to the previous point with a buffered line (corridor)
        const prevCircle = circles[i - 1];
        const line = turf.lineString([
          [prevCircle.lng, prevCircle.lat],
          [circle.lng, circle.lat]
        ]);
        
        // Use the average radius for the connecting corridor
        const corridorRadiusKm = ((circle.radius + prevCircle.radius) / 2) / 1000;
        const bufferedLine = turf.buffer(line, corridorRadiusKm, { units: 'kilometers', steps: 32 });
        
        mergedBlob = turf.union(turf.featureCollection([mergedBlob, bufferedLine]));
      }
    }
    return mergedBlob;
  } catch (error) {
    console.error("Error merging circles with Turf:", error);
    return null;
  }
};

/**
 * Buffers an existing GeoJSON blob outward by a specific radius in kilometers.
 */
export const bufferBlob = (geoJson, radiusInKm) => {
  if (!geoJson || !radiusInKm) return null;
  try {
    return turf.buffer(geoJson, radiusInKm, { units: 'kilometers', steps: 32 });
  } catch (error) {
    console.error("Error buffering blob:", error);
    return null;
  }
};

/**
 * Clips a route so it doesn't go inside the start or end GeoJSON polygons.
 * It iterates from start and end to find the first points outside the shapes.
 */
export const clipRoute = (routeCoords, startGeoJson, endGeoJson) => {
  if (!routeCoords || routeCoords.length === 0) return routeCoords;

  let startIndex = 0;
  let endIndex = routeCoords.length - 1;

  if (startGeoJson) {
    for (let i = 0; i < routeCoords.length; i++) {
      const pt = turf.point([routeCoords[i].lng, routeCoords[i].lat]);
      if (!turf.booleanPointInPolygon(pt, startGeoJson)) {
        startIndex = Math.max(0, i - 1); // Keep the last point just inside to ensure it touches border
        break;
      }
    }
  }

  if (endGeoJson) {
    for (let i = routeCoords.length - 1; i >= startIndex; i--) {
      const pt = turf.point([routeCoords[i].lng, routeCoords[i].lat]);
      if (!turf.booleanPointInPolygon(pt, endGeoJson)) {
        endIndex = Math.min(routeCoords.length - 1, i + 1); // Keep the first point just inside to ensure it touches border
        break;
      }
    }
  }

  return routeCoords.slice(startIndex, endIndex + 1);
};

/**
 * Finds the two closest points between two GeoJSON features (polygons).
 */
export const findClosestPoints = (poly1, poly2) => {
  if (!poly1 || !poly2) return null;
  
  try {
    const vertices1 = turf.explode(poly1).features;
    const vertices2 = turf.explode(poly2).features;
    
    let minDistance = Infinity;
    let closestPair = null;

    for (const v1 of vertices1) {
      for (const v2 of vertices2) {
        const dist = turf.distance(v1, v2);
        if (dist < minDistance) {
          minDistance = dist;
          closestPair = {
            start: { lat: v1.geometry.coordinates[1], lng: v1.geometry.coordinates[0] },
            end: { lat: v2.geometry.coordinates[1], lng: v2.geometry.coordinates[0] }
          };
        }
      }
    }
    return closestPair;
  } catch (error) {
    console.error("Error finding closest points:", error);
    return null;
  }
};

/**
 * Generates a set of random points within a circular area.
 */
export const generateRandomPoints = (center, radiusMeters, count) => {
  const points = [];
  const R = 6371000; // Earth's radius
  
  for (let i = 0; i < count; i++) {
    const distance = radiusMeters * Math.sqrt(Math.random());
    const bearing = Math.random() * 2 * Math.PI;
    
    const lat1 = center.lat * Math.PI / 180;
    const lon1 = center.lng * Math.PI / 180;
    
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance / R) +
                 Math.cos(lat1) * Math.sin(distance / R) * Math.cos(bearing));
    const lon2 = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(distance / R) * Math.cos(lat1),
                 Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2));
    
    points.push({
      id: `person-${Math.random().toString(36).substr(2, 9)}`,
      lat: lat2 * 180 / Math.PI,
      lng: lon2 * 180 / Math.PI
    });
  }
  return points;
};

/**
 * Generates random points specifically constrained within a GeoJSON polygon.
 */
export const generatePointsInPolygon = (polygon, count) => {
  if (!polygon) return [];
  const points = [];
  const bbox = turf.bbox(polygon);
  
  let attempts = 0;
  // Try to generate points until we hit the count or too many fails
  while (points.length < count && attempts < count * 10) {
    const randomPt = turf.randomPoint(1, { bbox }).features[0];
    if (turf.booleanPointInPolygon(randomPt, polygon)) {
      points.push({
        id: `gps-${Math.random().toString(36).substr(2, 9)}`,
        lat: randomPt.geometry.coordinates[1],
        lng: randomPt.geometry.coordinates[0]
      });
    }
    attempts++;
  }
  return points;
};


/**
 * Calculates the area of a GeoJSON feature in square kilometers.
 */
export const calculateAreaSqKm = (geoJson) => {
  if (!geoJson) return 0;
  try {
    const areaSqM = turf.area(geoJson);
    return areaSqM / 1000000;
  } catch (e) {
    return 0;
  }
};

