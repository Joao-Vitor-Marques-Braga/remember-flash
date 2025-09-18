import * as SecureStore from 'expo-secure-store';

const KEY = 'GEMINI_API_KEY';
const MODEL_KEY = 'GEMINI_MODEL_NAME';

export async function saveApiKey(value: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, value);
}

export async function getApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

export async function deleteApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

export async function saveModelName(value: string): Promise<void> {
  await SecureStore.setItemAsync(MODEL_KEY, value);
}

export async function getModelName(): Promise<string | null> {
  return SecureStore.getItemAsync(MODEL_KEY);
}


