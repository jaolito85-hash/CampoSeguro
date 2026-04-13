import type { ModelStatus } from '../types';

// In production, this would be a React Native Native Module wrapping
// Google AI Edge SDK. For development and testing, we use a mock
// that simulates the model behavior.

type GenerateOptions = {
  temperature?: number;
  maxTokens?: number;
};

let _status: ModelStatus = { loaded: false, loading: false };
const _listeners: Set<(s: ModelStatus) => void> = new Set();

function notify(status: ModelStatus) {
  _status = status;
  _listeners.forEach((fn) => fn(status));
}

export function onStatusChange(listener: (s: ModelStatus) => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

export function getModelStatus(): ModelStatus {
  return _status;
}

export async function loadModel(): Promise<void> {
  if (_status.loaded || _status.loading) return;
  notify({ loaded: false, loading: true, modelName: 'gemma-4-nano-1b-int4' });

  // Simulate model loading time
  // In production: NativeModules.GemmaModule.loadModel()
  await new Promise((resolve) => setTimeout(resolve, 1500));
  notify({ loaded: true, loading: false, modelName: 'gemma-4-nano-1b-int4' });
}

export async function generate(prompt: string, _options?: GenerateOptions): Promise<string> {
  if (!_status.loaded) {
    throw new Error('Model not loaded. Call loadModel() first.');
  }

  // Simulate inference time
  // In production: NativeModules.GemmaModule.generate(prompt, options)
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Mock response — safety-first conservative JSON
  // In production, this would be the actual model output
  return JSON.stringify({
    risk: 'moderate',
    confidence: 'low',
    likelyIdentification: 'uncertain',
    summary: 'Analise local realizada. Sem confianca suficiente para identificacao.',
    doNow: ['Mantenha distancia.', 'Tire mais fotos.', 'Consulte especialista.'],
    avoid: ['Nao toque.', 'Nao consuma.'],
    needMore: ['Foto mais detalhada.', 'Contexto do local.'],
  });
}

export async function unloadModel(): Promise<void> {
  notify({ loaded: false, loading: false });
}

export function isReady(): boolean {
  return _status.loaded;
}
