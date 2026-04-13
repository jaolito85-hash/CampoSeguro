import { getSetting, setSetting } from '../data/database';

const SETTING_KEY = 'gemini_api_key';

export async function getApiKey(): Promise<string | null> {
  return getSetting(SETTING_KEY);
}

export async function setApiKey(key: string): Promise<void> {
  await setSetting(SETTING_KEY, key.trim());
}

export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey();
  return !!key && key.length > 10;
}
