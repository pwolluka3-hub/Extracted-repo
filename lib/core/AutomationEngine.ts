/**
 * AUTOMATION ENGINE
 * Manages automated content generation cycles
 * 
 * Features:
 * - ON/OFF toggle control
 * - Configurable generation intervals
 * - Automatic learning system updates
 * - Rate limiting and safety controls
 * - Output storage and history
 */

import { kvGet, kvSet } from '../services/puterService';
import { nexusCore, type NexusRequest, type NexusResult } from './NexusCore';
import { memoryManager } from './MemoryManager';

// Automation Types
export interface AutomationConfig {
  enabled: boolean;
  intervalMinutes: number;
  maxGenerationsPerHour: number;
  minScoreToStore: number;
  platforms: string[];
  taskTypes: string[];
  pauseOnFailure: boolean;
  maxConsecutiveFailures: number;
  autoPublish: boolean;
  requireApproval: boolean;
}

export interface AutomationState {
  isRunning: boolean;
  lastRun: string | null;
  nextRun: string | null;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  consecutiveFailures: number;
  generationsThisHour: number;
  hourStartTime: string;
  pausedReason: string | null;
}

export interface AutomationOutput {
  id: string;
  result: NexusResult;
  request: NexusRequest;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected' | 'published';
  approvedAt?: string;
  publishedAt?: string;
}

export interface AutomationStats {
  totalGenerations: number;
  successRate: number;
  avgScore: number;
  topPlatform: string;
  lastRunTime: string | null;
  isRunning: boolean;
}

// Storage keys
const KEYS = {
  config: 'nexus_automation_config',
  state: 'nexus_automation_state',
  outputs: 'nexus_automation_outputs',
  queue: 'nexus_automation_queue',
};

/**
 * AutomationEngine Class
 * Controls automated content generation
 */
export class AutomationEngine {
  private config: AutomationConfig;
  private state: AutomationState;
  private outputs: AutomationOutput[] = [];
  private queue: NexusRequest[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private initialized = false;

  constructor() {
    this.config = {
      enabled: false,
      intervalMinutes: 30,
      maxGenerationsPerHour: 4,
      minScoreToStore: 65,
      platforms: ['twitter', 'linkedin'],
      taskTypes: ['content', 'hook'],
      pauseOnFailure: true,
      maxConsecutiveFailures: 3,
      autoPublish: false,
      requireApproval: true,
    };

    this.state = {
      isRunning: false,
      lastRun: null,
      nextRun: null,
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      consecutiveFailures: 0,
      generationsThisHour: 0,
      hourStartTime: new Date().toISOString(),
      pausedReason: null,
    };
  }

  /**
   * Initialize the automation engine
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[AutomationEngine] Initializing...');

    // Load saved config and state
    const savedConfig = await this.loadConfig();
    if (savedConfig) {
      this.config = { ...this.config, ...savedConfig };
    }

    const savedState = await this.loadState();
    if (savedState) {
      this.state = { ...this.state, ...savedState };
      // Reset running state on initialization
      this.state.isRunning = false;
    }

    await this.loadOutputs();
    await this.loadQueue();

    // Reset hourly counter if needed
    this.checkHourlyReset();

    this.initialized = true;
    console.log('[AutomationEngine] Initialized');

    // Auto-start if was enabled
    if (this.config.enabled) {
      await this.start();
    }
  }

  // ==================== CONTROL METHODS ====================

  /**
   * Start automation
   */
  async start(): Promise<boolean> {
    if (!this.initialized) await this.initialize();

    if (this.state.isRunning) {
      console.log('[AutomationEngine] Already running');
      return true;
    }

    // Check if paused due to failures
    if (this.state.pausedReason) {
      console.warn('[AutomationEngine] Cannot start - paused:', this.state.pausedReason);
      return false;
    }

    this.config.enabled = true;
    this.state.isRunning = true;
    this.state.pausedReason = null;

    // Schedule next run
    this.scheduleNextRun();

    await this.saveConfig();
    await this.saveState();

    console.log('[AutomationEngine] Started. Next run:', this.state.nextRun);
    return true;
  }

  /**
   * Stop automation
   */
  async stop(): Promise<void> {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }

    this.config.enabled = false;
    this.state.isRunning = false;
    this.state.nextRun = null;

    await this.saveConfig();
    await this.saveState();

    console.log('[AutomationEngine] Stopped');
  }

  /**
   * Toggle automation on/off
   */
  async toggle(): Promise<boolean> {
    if (this.state.isRunning) {
      await this.stop();
      return false;
    } else {
      return await this.start();
    }
  }

  /**
   * Reset paused state
   */
  async resume(): Promise<boolean> {
    this.state.pausedReason = null;
    this.state.consecutiveFailures = 0;
    await this.saveState();
    return await this.start();
  }

  // ==================== EXECUTION ====================

  /**
   * Schedule the next run
   */
  private scheduleNextRun(): void {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
    }

    const intervalMs = this.config.intervalMinutes * 60 * 1000;
    const nextRunTime = new Date(Date.now() + intervalMs);
    this.state.nextRun = nextRunTime.toISOString();

    this.intervalId = setTimeout(() => {
      this.runCycle();
    }, intervalMs);
  }

  /**
   * Run a single automation cycle
   */
  async runCycle(): Promise<void> {
    if (!this.state.isRunning) return;

    console.log('[AutomationEngine] Running cycle...');

    // Check hourly limit
    this.checkHourlyReset();
    if (this.state.generationsThisHour >= this.config.maxGenerationsPerHour) {
      console.log('[AutomationEngine] Hourly limit reached, skipping');
      this.scheduleNextRun();
      return;
    }

    this.state.lastRun = new Date().toISOString();
    this.state.totalRuns++;

    try {
      // Get request from queue or generate one
      const request = this.queue.shift() || this.generateRequest();

      // Execute via NexusCore
      const result = await nexusCore.execute(request);

      // Process result
      await this.processResult(result, request);

      // Update state
      if (result.success) {
        this.state.successfulRuns++;
        this.state.consecutiveFailures = 0;
      } else {
        this.state.failedRuns++;
        this.state.consecutiveFailures++;

        // Check for pause condition
        if (this.config.pauseOnFailure && 
            this.state.consecutiveFailures >= this.config.maxConsecutiveFailures) {
          this.state.pausedReason = `${this.state.consecutiveFailures} consecutive failures`;
          await this.stop();
          return;
        }
      }

      this.state.generationsThisHour++;

    } catch (error) {
      console.error('[AutomationEngine] Cycle error:', error);
      this.state.failedRuns++;
      this.state.consecutiveFailures++;
    }

    await this.saveState();
    await this.saveQueue();

    // Schedule next run if still running
    if (this.state.isRunning) {
      this.scheduleNextRun();
    }
  }

  /**
   * Generate a request based on config
   */
  private generateRequest(): NexusRequest {
    // Rotate through platforms and task types
    const platformIndex = this.state.totalRuns % this.config.platforms.length;
    const taskIndex = this.state.totalRuns % this.config.taskTypes.length;

    return {
      userInput: 'Generate engaging content for my audience',
      taskType: this.config.taskTypes[taskIndex] as 'content' | 'hook',
      platform: this.config.platforms[platformIndex],
    };
  }

  /**
   * Process generation result
   */
  private async processResult(result: NexusResult, request: NexusRequest): Promise<void> {
    // Only store if meets minimum score
    if (result.success && result.score >= this.config.minScoreToStore) {
      const output: AutomationOutput = {
        id: `auto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        result,
        request,
        timestamp: new Date().toISOString(),
        status: this.config.requireApproval ? 'pending' : 'approved',
      };

      this.outputs.push(output);

      // Trim outputs if too many
      if (this.outputs.length > 100) {
        this.outputs = this.outputs.slice(-100);
      }

      await this.saveOutputs();

      // Add to memory
      await memoryManager.addContent({
        content: result.output,
        score: result.score,
        platform: request.platform || 'general',
        wasPublished: false,
      });

      // Auto-publish if enabled and approved
      if (this.config.autoPublish && !this.config.requireApproval) {
        await this.publishOutput(output.id);
      }
    }
  }

  /**
   * Check and reset hourly counter
   */
  private checkHourlyReset(): void {
    const hourStart = new Date(this.state.hourStartTime);
    const now = new Date();

    if (now.getTime() - hourStart.getTime() >= 60 * 60 * 1000) {
      this.state.generationsThisHour = 0;
      this.state.hourStartTime = now.toISOString();
    }
  }

  // ==================== QUEUE MANAGEMENT ====================

  /**
   * Add request to queue
   */
  async addToQueue(request: NexusRequest): Promise<void> {
    this.queue.push(request);
    await this.saveQueue();
  }

  /**
   * Get queue
   */
  getQueue(): NexusRequest[] {
    return [...this.queue];
  }

  /**
   * Clear queue
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
  }

  // ==================== OUTPUT MANAGEMENT ====================

  /**
   * Get outputs
   */
  getOutputs(filter?: { status?: string; limit?: number }): AutomationOutput[] {
    let filtered = [...this.outputs];

    if (filter?.status) {
      filtered = filtered.filter(o => o.status === filter.status);
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  /**
   * Approve output
   */
  async approveOutput(outputId: string): Promise<boolean> {
    const output = this.outputs.find(o => o.id === outputId);
    if (!output) return false;

    output.status = 'approved';
    output.approvedAt = new Date().toISOString();

    await this.saveOutputs();
    return true;
  }

  /**
   * Reject output
   */
  async rejectOutput(outputId: string): Promise<boolean> {
    const output = this.outputs.find(o => o.id === outputId);
    if (!output) return false;

    output.status = 'rejected';
    await this.saveOutputs();
    return true;
  }

  /**
   * Publish output
   */
  async publishOutput(outputId: string): Promise<boolean> {
    const output = this.outputs.find(o => o.id === outputId);
    if (!output || output.status !== 'approved') return false;

    // TODO: Integrate with actual publishing service
    output.status = 'published';
    output.publishedAt = new Date().toISOString();

    await this.saveOutputs();
    return true;
  }

  // ==================== CONFIGURATION ====================

  /**
   * Update configuration
   */
  async updateConfig(updates: Partial<AutomationConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();

    // Restart if running and interval changed
    if (this.state.isRunning && updates.intervalMinutes) {
      await this.stop();
      await this.start();
    }
  }

  /**
   * Get configuration
   */
  getConfig(): AutomationConfig {
    return { ...this.config };
  }

  /**
   * Get state
   */
  getState(): AutomationState {
    return { ...this.state };
  }

  /**
   * Get stats
   */
  getStats(): AutomationStats {
    const avgScore = this.outputs.length > 0
      ? this.outputs.reduce((sum, o) => sum + o.result.score, 0) / this.outputs.length
      : 0;

    // Find top platform
    const platformCounts = new Map<string, number>();
    for (const output of this.outputs.filter(o => o.result.success)) {
      const platform = output.request.platform || 'general';
      platformCounts.set(platform, (platformCounts.get(platform) || 0) + 1);
    }
    
    let topPlatform = 'none';
    let maxCount = 0;
    for (const [platform, count] of platformCounts) {
      if (count > maxCount) {
        maxCount = count;
        topPlatform = platform;
      }
    }

    return {
      totalGenerations: this.state.totalRuns,
      successRate: this.state.totalRuns > 0
        ? Math.round((this.state.successfulRuns / this.state.totalRuns) * 100)
        : 100,
      avgScore: Math.round(avgScore),
      topPlatform,
      lastRunTime: this.state.lastRun,
      isRunning: this.state.isRunning,
    };
  }

  // ==================== PERSISTENCE ====================

  private async loadConfig(): Promise<AutomationConfig | null> {
    try {
      const data = await kvGet(KEYS.config);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await kvSet(KEYS.config, JSON.stringify(this.config));
    } catch {
      console.error('[AutomationEngine] Failed to save config');
    }
  }

  private async loadState(): Promise<AutomationState | null> {
    try {
      const data = await kvGet(KEYS.state);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private async saveState(): Promise<void> {
    try {
      await kvSet(KEYS.state, JSON.stringify(this.state));
    } catch {
      console.error('[AutomationEngine] Failed to save state');
    }
  }

  private async loadOutputs(): Promise<void> {
    try {
      const data = await kvGet(KEYS.outputs);
      this.outputs = data ? JSON.parse(data) : [];
    } catch {
      this.outputs = [];
    }
  }

  private async saveOutputs(): Promise<void> {
    try {
      await kvSet(KEYS.outputs, JSON.stringify(this.outputs));
    } catch {
      console.error('[AutomationEngine] Failed to save outputs');
    }
  }

  private async loadQueue(): Promise<void> {
    try {
      const data = await kvGet(KEYS.queue);
      this.queue = data ? JSON.parse(data) : [];
    } catch {
      this.queue = [];
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await kvSet(KEYS.queue, JSON.stringify(this.queue));
    } catch {
      console.error('[AutomationEngine] Failed to save queue');
    }
  }
}

// Export singleton
export const automationEngine = new AutomationEngine();
