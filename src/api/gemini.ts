import type { AnalysisInput } from '../types';
import { systemPrompt, userPrompt } from '../engine/prompt-builder';

const PROXY_URL = 'https://camposeguro-api.vercel.app/api/analyze';

export async function isOnline(): Promise<boolean> {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return navigator.onLine !== false;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://clients3.google.com/generate_204', {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.status === 204 || res.ok;
  } catch {
    return false;
  }
}

export async function analyzeWithGemini(
  input: AnalysisInput,
): Promise<Record<string, unknown>> {
  const prompt = `${systemPrompt()}\n\n${userPrompt(input)}`;

  const body = JSON.stringify({
    prompt,
    image: input.image || null,
    generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
  });

  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Proxy error ${response.status}: ${err}`);
  }

  const data = await response.json();
  if (!data.text) throw new Error('Empty proxy response');

  console.log(`[CampoSeguro] ${data.model || 'proxy'} OK:`, data.text.slice(0, 300));
  return parseGeminiJson(data.text);
}

// --- JSON parsing (robust) ---

function cleanJsonText(text: string): string {
  return text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/""(\w)/g, '"$1')
    .replace(/(\w)""/g, '$1"')
    .trim();
}

function tryParse(text: string): Record<string, unknown> | null {
  try { return JSON.parse(text); } catch { return null; }
}

function repairTruncatedJson(text: string): string {
  let inString = false;
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    if (escape) { escape = false; continue; }
    if (text[i] === '\\') { escape = true; continue; }
    if (text[i] === '"') inString = !inString;
  }
  let repaired = text;
  if (inString) repaired += '"';
  let braces = 0, brackets = 0;
  inString = false; escape = false;
  for (let i = 0; i < repaired.length; i++) {
    if (escape) { escape = false; continue; }
    if (repaired[i] === '\\') { escape = true; continue; }
    if (repaired[i] === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (repaired[i] === '{') braces++;
    if (repaired[i] === '}') braces--;
    if (repaired[i] === '[') brackets++;
    if (repaired[i] === ']') brackets--;
  }
  while (brackets > 0) { repaired += ']'; brackets--; }
  while (braces > 0) { repaired += '}'; braces--; }
  return repaired;
}

function parseGeminiJson(text: string): Record<string, unknown> {
  const cleaned = cleanJsonText(text);
  const candidates = [text, cleaned];

  for (const attempt of candidates) {
    const parsed = tryParse(attempt);
    if (parsed) return parsed;

    const start = attempt.indexOf('{');
    const end = attempt.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const extracted = tryParse(attempt.slice(start, end + 1));
      if (extracted) return extracted;
    }

    if (start >= 0) {
      const repaired = repairTruncatedJson(attempt.slice(start));
      const parsed2 = tryParse(repaired);
      if (parsed2) return parsed2;
    }
  }

  throw new Error(`Gemini did not return valid JSON: ${text.slice(0, 200)}`);
}
