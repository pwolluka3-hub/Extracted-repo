// lib/services/ipStackService.ts
import { API_CONFIG, getApiKey } from '@/lib/api-config';

export interface GeoData {
  city: string;
  region: string;
  country_name: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export async function getUserLocation(ip?: string): Promise<GeoData> {
  const key = getApiKey('ipStack');
  const url = `${API_CONFIG.ipStack.baseUrl}/${ip || ''}?access_key=${key}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`IPstack API error: ${response.statusText}`);
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[IPStackService] Error fetching location:', error);
    throw error;
  }
}
