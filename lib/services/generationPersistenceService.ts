/**
 * GENERATION PERSISTENCE SERVICE
 * Implements the "AI Generation Persistence" pattern
 * 
 * Responsibilities:
 * - Persist every LLM generation result
 * - Track token usage and costs
 * - Provide addressable IDs for every generation
 * - Handle storage of generated media URLs
 */

import { supabaseServer } from './supabase/server';
import { nanoid } from 'nanoid';

export interface GenerationRecord {
  id: string;
  userId: string;
  workspaceId?: string;
  model: string;
  prompt: string;
  result: string;
  mediaUrls: string[];
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  estimatedCostCents: number;
  status: 'pending' | 'streaming' | 'complete' | 'error';
  taskType?: string;
  platform?: string;
}

export class GenerationPersistenceService {
  /**
   * Create a pending record before generation starts
   */
  async createPendingGeneration(userId: string, workspaceId: string, model: string, prompt: string, taskType?: string, platform?: string): Promise<string> {
    const id = nanoid();
    
    const { error } = await supabaseServer.from('generations').insert({
      id,
      user_id: userId,
      workspace_id: workspaceId,
      model,
      prompt,
      status: 'pending',
      task_type: taskType,
      platform,
    });

    if (error) {
      console.error('[GenerationPersistenceService] Failed to create pending record:', error);
      throw error;
    }

    return id;
  }

  /**
   * Update a generation record with the final result and metadata
   */
  async completeGeneration(id: string, result: string, tokenUsage: any, costCents: number, mediaUrls: string[] = []): Promise<void> {
    const { error } = await supabaseServer
      .from('generations')
      .update({
        result,
        token_usage: tokenUsage,
        estimated_cost_cents: costCents,
        media_urls: mediaUrls,
        status: 'complete',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('[GenerationPersistenceService] Failed to complete record:', error);
      throw error;
    }
  }

  /**
   * Mark a generation as failed
   */
  async markAsFailed(id: string, error: string): Promise<void> {
    const { error: updateError } = await supabaseServer
      .from('generations')
      .update({
        status: 'error',
        result: `Error: ${error}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('[GenerationPersistenceService] Failed to mark as failed:', updateError);
    }
  }

  /**
   * Retrieve a specific generation by ID
   */
  async getGeneration(id: string) {
    const { data, error } = await supabaseServer
      .from('generations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get recent generations for a user
   */
  async getUserGenerations(userId: string, limit = 20) {
    const { data, error } = await supabaseServer
      .from('generations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
}

export const generationPersistenceService = new GenerationPersistenceService();
