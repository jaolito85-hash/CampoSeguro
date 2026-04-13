import type { AnalysisInput, AnalysisResult } from '../types';
import { criticalRuleResult, fallbackResult, normalizedResult } from './safety-engine';
import { analyzeWithGemini, isOnline } from '../api/gemini';

export interface AnalyzeDebug {
  source: 'gemini' | 'offline' | 'critical';
  error?: string;
}

export async function analyze(input: AnalysisInput): Promise<{ result: AnalysisResult; debug: AnalyzeDebug }> {
  // Step 1: Check critical safety rules (bypass AI entirely)
  const critical = criticalRuleResult(input);
  if (critical) return { result: critical, debug: { source: 'critical' } };

  // Step 2: Try Gemini via cloud proxy (API key is on the server)
  const online = await isOnline();
  if (online) {
    try {
      const rawJson = await analyzeWithGemini(input);
      const result = normalizedResult(input, rawJson, true);
      return { result, debug: { source: 'gemini' } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[CampoSeguro] Gemini error:', msg);
      return { result: fallbackResult(input), debug: { source: 'offline', error: `Gemini falhou: ${msg}` } };
    }
  }

  // Step 3: Offline fallback
  return { result: fallbackResult(input), debug: { source: 'offline', error: 'Sem conexao com internet' } };
}
