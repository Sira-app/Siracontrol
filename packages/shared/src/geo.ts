import type { GeoPoint } from './types';

const EARTH_RADIUS_METERS = 6_371_000;

/**
 * Distancia en metros entre dos puntos GPS (fórmula de Haversine).
 */
export function distanceBetween(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function isWithinRadius(
  point: GeoPoint,
  center: GeoPoint,
  radiusMeters: number
): boolean {
  return distanceBetween(point, center) <= radiusMeters;
}

/**
 * Ray casting para verificar si un punto está dentro de un polígono.
 */
export function isWithinPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  const x = point.longitude;
  const y = point.latitude;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export interface LocationValidation {
  isValid: boolean;
  reason?: 'low_accuracy' | 'mock_location' | 'no_location' | 'impossible_speed';
  warnings: string[];
}

export function validateLocationReading(reading: {
  location?: GeoPoint;
  accuracyMeters?: number;
  isMockLocation?: boolean;
  speedMps?: number;
  maxAccuracyMeters?: number;
}): LocationValidation {
  const warnings: string[] = [];
  const maxAccuracy = reading.maxAccuracyMeters ?? 100;

  if (!reading.location) {
    return {
      isValid: false,
      reason: 'no_location',
      warnings: ['No se pudo obtener ubicación'],
    };
  }

  if (reading.isMockLocation) {
    return {
      isValid: false,
      reason: 'mock_location',
      warnings: ['Ubicación falsa detectada'],
    };
  }

  if (reading.accuracyMeters !== undefined && reading.accuracyMeters > maxAccuracy) {
    return {
      isValid: false,
      reason: 'low_accuracy',
      warnings: [
        `Precisión GPS insuficiente: ±${Math.round(reading.accuracyMeters)}m. Sal a un espacio abierto.`,
      ],
    };
  }

  if (reading.accuracyMeters !== undefined && reading.accuracyMeters > 50) {
    warnings.push(`Precisión moderada: ±${Math.round(reading.accuracyMeters)}m`);
  }

  if (reading.speedMps !== undefined && reading.speedMps > 83) {
    return {
      isValid: false,
      reason: 'impossible_speed',
      warnings: ['Velocidad imposible detectada (posible spoofing)'],
    };
  }

  return { isValid: true, warnings };
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Calcula el centro promedio de varios puntos GPS.
 */
export function centerOfPoints(points: GeoPoint[]): GeoPoint {
  if (points.length === 0) return { latitude: 0, longitude: 0 };
  const sum = points.reduce(
    (acc, p) => ({
      latitude: acc.latitude + p.latitude,
      longitude: acc.longitude + p.longitude,
    }),
    { latitude: 0, longitude: 0 }
  );
  return {
    latitude: sum.latitude / points.length,
    longitude: sum.longitude / points.length,
  };
}
