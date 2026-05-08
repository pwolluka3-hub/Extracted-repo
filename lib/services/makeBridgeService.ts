/**
 * MAKE BRIDGE SERVICE
 * Handles communication with Make.com (Integromat) API
 * 
 * Responsibilities:
 * - Create and update scenarios
 * - Trigger scenarios via webhooks
 * - Manage connection and template data
 */

export class makeBridgeService {
  private static apiKey = process.env.MAKE_API_KEY || '';
  private static organizationId = process.env.MAKE_ORGANIZATION_ID || '';
  private static baseUrl = 'https://eu1.make.com/api/v1'; // Default EU1, can be parameterized

  /**
   * Trigger a Make scenario via webhook
   * @param webhookUrl The specific Make webhook URL
   * @param payload The data to send
   */
  static async triggerWebhook(webhookUrl: string, payload: any) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          timestamp: new Date().toISOString(),
          source: 'nexusai-control-plane',
        }),
      });

      if (!response.ok) {
        throw new Error(`Make webhook trigger failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[makeBridgeService] Error triggering webhook:`, error);
      throw error;
    }
  }

  /**
   * Create a new scenario from a blueprint (JSON)
   * @param blueprint The blueprint JSON for the scenario
   */
  static async createScenario(blueprint: any) {
    if (!this.apiKey) {
      throw new Error('MAKE_API_KEY is not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/scenarios`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'NexusAI Generated Automation',
          blueprint: blueprint,
          organizationId: this.organizationId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Make API create scenario failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[makeBridgeService] Error creating scenario:`, error);
      throw error;
    }
  }

  /**
   * Generic API call to Make.com
   */
  static async callMakeApi(endpoint: string, options: any = {}) {
    if (!this.apiKey) throw new Error('MAKE_API_KEY is not configured');

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Make API call failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[makeBridgeService] Error calling Make API ${endpoint}:`, error);
      throw error;
    }
  }
}

export { makeBridgeService };
