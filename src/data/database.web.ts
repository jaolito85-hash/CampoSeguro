// Web fallback using localStorage — for demo/preview only
import type { Protocol, HistoryEntry, Language, AnalysisResult } from '../types';
import { SEED_PROTOCOLS } from './seed-data';

const STORAGE_PREFIX = 'cs_';

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem(key: string, value: unknown): void {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
}

// Fake db object for compatibility
const fakeDb = {};
export function getDbSync(): any { return fakeDb; }
export async function getDb(): Promise<any> { return fakeDb; }

// --- Protocols ---
export async function getProtocols(lang: Language): Promise<Protocol[]> {
  return SEED_PROTOCOLS.map((p) => ({
    id: p.id,
    category: p.category,
    riskLevel: p.risk_level as Protocol['riskLevel'],
    title: (lang === 'es' ? p.title_es : lang === 'en' ? p.title_en : p.title_pt) || p.title_pt,
    doNow: JSON.parse((lang === 'es' ? p.do_now_es : lang === 'en' ? p.do_now_en : p.do_now_pt) || p.do_now_pt),
    avoid: JSON.parse((lang === 'es' ? p.avoid_es : lang === 'en' ? p.avoid_en : p.avoid_pt) || p.avoid_pt),
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
  const history = getItem<any[]>('history', []);
  history.unshift({ id: Date.now(), ...entry });
  setItem('history', history.slice(0, 100));
}

export async function getHistory(): Promise<HistoryEntry[]> {
  return getItem<HistoryEntry[]>('history', []);
}

export async function clearHistory(): Promise<void> {
  setItem('history', []);
}

// --- Settings ---
export async function getSetting(key: string): Promise<string | null> {
  return getItem<string | null>(`setting_${key}`, null);
}

export async function setSetting(key: string, value: string): Promise<void> {
  setItem(`setting_${key}`, value);
}
