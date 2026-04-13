// Web fallback for trips using localStorage
export interface Trip {
  id: number; name: string; description: string;
  latitude: number; longitude: number;
  mapImageUri: string | null; emergencyNotes: string;
  createdAt: string; active: boolean;
}
export interface Waypoint {
  id: number; tripId: number; name: string;
  type: 'start' | 'camp' | 'water' | 'danger' | 'exit' | 'custom';
  latitude: number; longitude: number; notes: string; createdAt: string;
}
export interface Breadcrumb {
  id: number; tripId: number; latitude: number;
  longitude: number; altitude: number | null; timestamp: string;
}

const KEY = 'cs_trips';
const getAll = (): Trip[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const saveAll = (t: Trip[]) => localStorage.setItem(KEY, JSON.stringify(t));
const wpKey = (id: number) => `cs_wp_${id}`;
const bcKey = (id: number) => `cs_bc_${id}`;

export async function createTrip(trip: Omit<Trip, 'id' | 'createdAt' | 'active'>): Promise<number> {
  const trips = getAll();
  const id = Date.now();
  trips.push({ id, ...trip, createdAt: new Date().toISOString(), active: false });
  saveAll(trips);
  return id;
}
export async function getTrips(): Promise<Trip[]> { return getAll(); }
export async function getActiveTrip(): Promise<Trip | null> { return getAll().find((t) => t.active) || null; }
export async function activateTrip(tripId: number): Promise<void> {
  const trips = getAll().map((t) => ({ ...t, active: t.id === tripId }));
  saveAll(trips);
}
export async function deleteTrip(tripId: number): Promise<void> {
  saveAll(getAll().filter((t) => t.id !== tripId));
  localStorage.removeItem(wpKey(tripId));
  localStorage.removeItem(bcKey(tripId));
}
export async function updateTripMap(tripId: number, mapUri: string): Promise<void> {
  saveAll(getAll().map((t) => t.id === tripId ? { ...t, mapImageUri: mapUri } : t));
}
export async function addWaypoint(wp: Omit<Waypoint, 'id' | 'createdAt'>): Promise<number> {
  const wps: Waypoint[] = JSON.parse(localStorage.getItem(wpKey(wp.tripId)) || '[]');
  const id = Date.now();
  wps.push({ id, ...wp, createdAt: new Date().toISOString() });
  localStorage.setItem(wpKey(wp.tripId), JSON.stringify(wps));
  return id;
}
export async function getWaypoints(tripId: number): Promise<Waypoint[]> {
  return JSON.parse(localStorage.getItem(wpKey(tripId)) || '[]');
}
export async function deleteWaypoint(id: number): Promise<void> { /* simplified for web */ }
export async function addBreadcrumb(tripId: number, lat: number, lon: number, alt: number | null): Promise<void> {
  const bcs: Breadcrumb[] = JSON.parse(localStorage.getItem(bcKey(tripId)) || '[]');
  bcs.push({ id: Date.now(), tripId, latitude: lat, longitude: lon, altitude: alt, timestamp: new Date().toISOString() });
  localStorage.setItem(bcKey(tripId), JSON.stringify(bcs));
}
export async function getBreadcrumbs(tripId: number): Promise<Breadcrumb[]> {
  return JSON.parse(localStorage.getItem(bcKey(tripId)) || '[]');
}
export function distanceBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
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
  return `${dirs[Math.round(degrees / 45) % 8]} (${Math.round(degrees)}°)`;
}
