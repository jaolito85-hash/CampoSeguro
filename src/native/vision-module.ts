import type { Classification } from '../types';

// In production, this would be a React Native Native Module wrapping
// MediaPipe Vision Tasks. For development, we use a mock.

export async function classifyImage(
  _imageUri: string,
  category?: string,
): Promise<Classification[]> {
  // Simulate classification time
  // In production: NativeModules.VisionModule.classifyImage(imageUri, category)
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Mock response based on category
  const mockResults: Record<string, Classification[]> = {
    plant: [
      { label: 'plant_leaf', confidence: 0.75 },
      { label: 'green_vegetation', confidence: 0.6 },
    ],
    snake: [
      { label: 'snake_like', confidence: 0.5 },
      { label: 'reptile', confidence: 0.4 },
    ],
    mushroom: [
      { label: 'mushroom_cap', confidence: 0.65 },
      { label: 'fungus', confidence: 0.5 },
    ],
    insect: [
      { label: 'insect', confidence: 0.6 },
      { label: 'arthropod', confidence: 0.45 },
    ],
    injury: [
      { label: 'skin_mark', confidence: 0.55 },
      { label: 'wound', confidence: 0.4 },
    ],
    general: [
      { label: 'outdoor_scene', confidence: 0.7 },
      { label: 'nature', confidence: 0.6 },
    ],
  };

  return mockResults[category || 'general'] || mockResults.general;
}

export async function isAvailable(): Promise<boolean> {
  // In production: check if MediaPipe is available on device
  return true;
}
