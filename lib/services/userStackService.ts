// lib/services/userStackService.ts
import { API_CONFIG, getApiKey } from '@/lib/api-config';

export interface UserInteraction {
  interactionId: string;
  userAgent: string;
  os: string;
  browser: string;
  device: string;
  timestamp: string;
}

export async function trackUserInteraction(interaction: UserInteraction): Promise<void> {
  const key = getApiKey('userStack');
  const url = `${API_CONFIG.userStack.baseUrl}/interactions?access_key=${key}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(interaction),
    });
    if (!response.ok) throw new Error(`Userstack API error: ${response.statusText}`);
  } catch (error) {
    console.error('[UserStackService] Error tracking interaction:', error);
    throw error;
  }
}
