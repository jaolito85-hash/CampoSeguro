import * as SQLite from 'expo-sqlite';
import type { Protocol, HistoryEntry, Language, AnalysisResult } from '../types';
import { seedProtocols } from './seed';

let db: SQLite.SQLiteDatabase | null = null;

export function getDbSync(): SQLite.SQLiteDatabase {
  if (db) return db;

  db = SQLite.openDatabaseSync('camposeguro3.db');

  db.execSync(`CREATE TABLE IF NOT EXISTS protocols (
    id TEXT PRIMARY KEY, category TEXT NOT NULL, risk_level TEXT NOT NULL,
    title_pt TEXT NOT NULL, title_es TEXT, title_en TEXT,
    do_now_pt TEXT NOT NULL, do_now_es TEXT, do_now_en TEXT,
    avoid_pt TEXT NOT NULL, avoid_es TEXT, avoid_en TEXT,
    version INTEGER DEFAULT 1)`);

  db.execSync(`CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT NOT NULL,
    category TEXT, question TEXT, image_uri TEXT, result_json TEXT,
    risk_level TEXT, latitude REAL, longitude REAL)`);

  db.execSync(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL)`);

  db.execSync(`CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    description TEXT, latitude REAL NOT NULL, longitude REAL NOT NULL,
    map_image_uri TEXT, emergency_notes TEXT, created_at TEXT NOT NULL,
    active INTEGER DEFAULT 0)`);

  db.execSync(`CREATE TABLE IF NOT EXISTS waypoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT, trip_id INTEGER NOT NULL,
    name TEXT NOT NULL, type TEXT NOT NULL, latitude REAL NOT NULL,
    longitude REAL NOT NULL, notes TEXT, created_at TEXT NOT NULL)`);

  db.execSync(`CREATE TABLE IF NOT EXISTS breadcrumbs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, trip_id INTEGER NOT NULL,
    latitude REAL NOT NULL, longitude REAL NOT NULL, altitude REAL,
    timestamp TEXT NOT NULL)`);

  seedProtocolsSync(db);
  return db;
}

// Keep async wrapper for compatibility
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  return getDbSync();
}

function seedProtocolsSync(database: SQLite.SQLiteDatabase): void {
  const count = database.getFirstSync<{ c: number }>('SELECT COUNT(*) as c FROM protocols');
  if (count && count.c > 0) return;
  seedProtocols(database);
}

// --- Protocols ---

export async function getProtocols(lang: Language): Promise<Protocol[]> {
  const database = getDbSync();
  const rows = database.getAllSync<{
    id: string; category: string; risk_level: string;
    title_pt: string; title_es: string | null; title_en: string | null;
    do_now_pt: string; do_now_es: string | null; do_now_en: string | null;
    avoid_pt: string; avoid_es: string | null; avoid_en: string | null;
  }>('SELECT * FROM protocols ORDER BY category, risk_level DESC');

  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    riskLevel: row.risk_level as Protocol['riskLevel'],
    title: (lang === 'es' ? row.title_es : lang === 'en' ? row.title_en : row.title_pt) || row.title_pt,
    doNow: JSON.parse((lang === 'es' ? row.do_now_es : lang === 'en' ? row.do_now_en : row.do_now_pt) || row.do_now_pt),
    avoid: JSON.parse((lang === 'es' ? row.avoid_es : lang === 'en' ? row.avoid_en : row.avoid_pt) || row.avoid_pt),
  }));
}

export async function searchProtocols(query: string, lang: Language): Promise<Protocol[]> {
  const all = await getProtocols(lang);
  if (!query.trim()) return all;
  const q = query.toLowerCase();
  return all.filter((p) => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
}

// --- History ---

export async function saveHistory(entry: Omit<HistoryEntry, 'id'>): Promise<void> {
  const database = getDbSync();
  database.runSync(
    'INSERT INTO history (timestamp, category, question, image_uri, result_json, risk_level, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    entry.timestamp,
    entry.category,
    entry.question,
    entry.imageUri || null,
    JSON.stringify(entry.result),
    entry.riskLevel,
    entry.latitude || null,
    entry.longitude || null,
  );
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const database = getDbSync();
  const rows = database.getAllSync<{
    id: number; timestamp: string; category: string; question: string;
    image_uri: string | null; result_json: string; risk_level: string;
    latitude: number | null; longitude: number | null;
  }>('SELECT * FROM history ORDER BY timestamp DESC LIMIT 100');

  return rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp,
    category: row.category as HistoryEntry['category'],
    question: row.question,
    imageUri: row.image_uri || undefined,
    result: JSON.parse(row.result_json) as AnalysisResult,
    riskLevel: row.risk_level as HistoryEntry['riskLevel'],
    latitude: row.latitude || undefined,
    longitude: row.longitude || undefined,
  }));
}

export async function clearHistory(): Promise<void> {
  const database = getDbSync();
  database.runSync('DELETE FROM history');
}

// --- Settings ---

export async function getSetting(key: string): Promise<string | null> {
  const database = getDbSync();
  const row = database.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value || null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = getDbSync();
  database.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
}
