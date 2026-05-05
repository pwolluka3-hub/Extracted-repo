// lib/services/numVerifyService.ts
import { API_CONFIG, getApiKey } from '@/lib/api-config';

export interface PhoneValidationResult {
  valid: boolean;
  number: string;
  local_format: string;
  international_format: string;
  country_code: string;
  country_name: string;
  location: string;
  carrier: string;
  line_type: string;
}

export async function validatePhoneNumber(number: string): Promise<PhoneValidationResult> {
  const key = getApiKey('numVerify');
  const url = `${API_CONFIG.numVerify.baseUrl}/validate?access_key=${key}&number=${encodeURIComponent(number)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Numverify API error: ${response.statusText}`);
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[NumVerifyService] Error validating phone number:', error);
    throw error;
  }
}
