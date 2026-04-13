import { getDbSync } from './database';

export interface Trip {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  mapImageUri: string | null;
  emergencyNotes: string;
  createdAt: string;
  active: boolean;
}

export interface Waypoint {
  id: number;
  tripId: number;
  name: string;
  type: 'start' | 'camp' | 'water' | 'danger' | 'exit' | 'custom';
  latitude: number;
  longitude: number;
  notes: string;
  createdAt: string;
}

export interface Breadcrumb {
  id: number;
  tripId: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  timestamp: string;
}

// --- Trips ---

export async function createTrip(trip: Omit<Trip, 'id' | 'createdAt' | 'active'>): Promise<number> {
  const db = getDbSync();
  const result = db.runSync(
    'INSERT INTO trips (name, description, latitude, longitude, map_image_uri, emergency_notes, created_at, active) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
    trip.name, trip.description, trip.latitude, trip.longitude, trip.mapImageUri, trip.emergencyNotes, new Date().toISOString(),
  );
  return result.lastInsertRowId;
}

export async function getTrips(): Promise<Trip[]> {
  const db = getDbSync();
  const rows = db.getAllSync<{
    id: number; name: string; description: string; latitude: number; longitude: number;
    map_image_uri: string | null; emergency_notes: string; created_at: string; active: number;
  }>('SELECT * FROM trips ORDER BY active DESC, created_at DESC');

  return rows.map((r) => ({
    id: r.id, name: r.name, description: r.description || '',
    latitude: r.latitude, longitude: r.longitude,
    mapImageUri: r.map_image_uri, emergencyNotes: r.emergency_notes || '',
    createdAt: r.created_at, active: r.active === 1,
  }));
}

export async function getActiveTrip(): Promise<Trip | null> {
  const db = getDbSync();
  const row = db.getFirstSync<{
    id: number; name: string; description: string; latitude: number; longitude: number;
    map_image_uri: string | null; emergency_notes: string; created_at: string; active: number;
  }>('SELECT * FROM trips WHERE active = 1 LIMIT 1');
  if (!row) return null;
  return {
    id: row.id, name: row.name, description: row.description || '',
    latitude: row.latitude, longitude: row.longitude,
    mapImageUri: row.map_image_uri, emergencyNotes: row.emergency_notes || '',
    createdAt: row.created_at, active: true,
  };
}

export async function activateTrip(tripId: number): Promise<void> {
  const db = getDbSync();
  db.runSync('UPDATE trips SET active = 0');
  db.runSync('UPDATE trips SET active = 1 WHERE id = ?', tripId);
}

export async function deleteTrip(tripId: number): Promise<void> {
  const db = getDbSync();
  db.runSync('DELETE FROM breadcrumbs WHERE trip_id = ?', tripId);
  db.runSync('DELETE FROM waypoints WHERE trip_id = ?', tripId);
  db.runSync('DELETE FROM trips WHERE id = ?', tripId);
}

export async function updateTripMap(tripId: number, mapUri: string): Promise<void> {
  const db = getDbSync();
  db.runSync('UPDATE trips SET map_image_uri = ? WHERE id = ?', mapUri, tripId);
}

// --- Waypoints ---

export async function addWaypoint(wp: Omit<Waypoint, 'id' | 'createdAt'>): Promise<number> {
  const db = getDbSync();
  const result = db.runSync(
    'INSERT INTO waypoints (trip_id, name, type, latitude, longitude, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    wp.tripId, wp.name, wp.type, wp.latitude, wp.longitude, wp.notes, new Date().toISOString(),
  );
  return result.lastInsertRowId;
}

export async function getWaypoints(tripId: number): Promise<Waypoint[]> {
  const db = getDbSync();
  const rows = db.getAllSync<{
    id: number; trip_id: number; name: string; type: string;
    latitude: number; longitude: number; notes: string; created_at: string;
  }>('SELECT * FROM waypoints WHERE trip_id = ? ORDER BY created_at ASC', tripId);

  return rows.map((r) => ({
    id: r.id, tripId: r.trip_id, name: r.name,
    type: r.type as Waypoint['type'],
    latitude: r.latitude, longitude: r.longitude,
    notes: r.notes || '', createdAt: r.created_at,
  }));
}

export async function deleteWaypoint(id: number): Promise<void> {
  const db = getDbSync();
  db.runSync('DELETE FROM waypoints WHERE id = ?', id);
}

// --- Breadcrumbs ---

export async function addBreadcrumb(tripId: number, lat: number, lon: number, alt: number | null): Promise<void> {
  const db = getDbSync();
  db.runSync(
    'INSERT INTO breadcrumbs (trip_id, latitude, longitude, altitude, timestamp) VALUES (?, ?, ?, ?, ?)',
    tripId, lat, lon, alt, new Date().toISOString(),
  );
}

export async function getBreadcrumbs(tripId: number): Promise<Breadcrumb[]> {
  const db = getDbSync();
  const rows = db.getAllSync<{
    id: number; trip_id: number; latitude: number; longitude: number;
    altitude: number | null; timestamp: string;
  }>('SELECT * FROM breadcrumbs WHERE trip_id = ? ORDER BY timestamp ASC', tripId);

  return rows.map((r) => ({
    id: r.id, tripId: r.trip_id, latitude: r.latitude,
    longitude: r.longitude, altitude: r.altitude, timestamp: r.timestamp,
  }));
}

// --- Utilities ---

export function distanceBetween(
  lat1: number, lon1: number, lat2: number, lon2: number,
): number {
  const R = 6371e3; // meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bearingTo(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatBearing(degrees: number): string {
  const dirs = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
  const index = Math.round(degrees / 45) % 8;
  return `${dirs[index]} (${Math.round(degrees)}°)`;
}
