/**
 * Publish Safety Service
 * Enforces safety checks and approval gates before any content is published
 */

import { kvGet, kvSet, readFile, writeFile, PATHS } from './puterService';
import { loadBrandKit } from './memoryService';
import { universalChat } from './aiService';
import type { BrandKit } from '@/lib/types';

export interface PublishSafetyConfig {
  requireApproval: boolean;
  requireReview: boolean;
  maxDailyPosts: number;
  blockedWords: string[];
  requiredHashtags: string[];
  sensitiveTopics: string[];
  minQualityScore: number;
  allowAutoPublish: boolean;
  safeModeEnabled: boolean;
}

export interface SafetyCheckResult {
  passed: boolean;
  score: number;
  checks: {
    name: string;
    passed: boolean;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }[];
  requiresHumanReview: boolean;
  blockedReasons: string[];
}

export interface ApprovalRequest {
  id: string;
  contentId: string;
  content: string;
  platforms: string[];
  scheduledTime?: string;
  safetyCheck: SafetyCheckResult;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
}

const DEFAULT_CONFIG: PublishSafetyConfig = {
  requireApproval: true,
  requireReview: true,
  maxDailyPosts: 10,
  blockedWords: [],
  requiredHashtags: [],
  sensitiveTopics: ['politics', 'religion', 'controversy'],
  minQualityScore: 0.6,
  allowAutoPublish: false,
  safeModeEnabled: true,
};

// Load safety configuration
export async function loadSafetyConfig(): Promise<PublishSafetyConfig> {
  try {
    const config = await readFile<PublishSafetyConfig>(`${PATHS.settings}/safety-config.json`);
    return { ...DEFAULT_CONFIG, ...config };
  } catch {
    return DEFAULT_CONFIG;
  }
}

// Save safety configuration
export async function saveSafetyConfig(config: Partial<PublishSafetyConfig>): Promise<boolean> {
  const current = await loadSafetyConfig();
  return writeFile(`${PATHS.settings}/safety-config.json`, { ...current, ...config });
}

// Run comprehensive safety checks on content
export async function runSafetyChecks(
  content: string,
  platforms: string[],
  brandKit?: BrandKit | null
): Promise<SafetyCheckResult> {
  const config = await loadSafetyConfig();
  const checks: SafetyCheckResult['checks'] = [];
  let totalScore = 100;
  const blockedReasons: string[] = [];

  // 1. Check for blocked words
  const blockedWordsFound = config.blockedWords.filter(word => 
    content.toLowerCase().includes(word.toLowerCase())
  );
  if (blockedWordsFound.length > 0) {
    checks.push({
      name: 'Blocked Words',
      passed: false,
      message: `Contains blocked words: ${blockedWordsFound.join(', ')}`,
      severity: 'error',
    });
    totalScore -= 50;
    blockedReasons.push('Contains blocked words');
  } else {
    checks.push({
      name: 'Blocked Words',
      passed: true,
      message: 'No blocked words detected',
      severity: 'info',
    });
  }

  // 2. Check content length per platform
  const lengthChecks = platforms.map(platform => {
    const limits: Record<string, number> = {
      twitter: 280,
      instagram: 2200,
      linkedin: 3000,
      facebook: 63206,
      tiktok: 2200,
      youtube: 5000,
    };
    const limit = limits[platform] || 2000;
    const passed = content.length <= limit;
    return { platform, passed, limit, actual: content.length };
  });

  const failedLengthChecks = lengthChecks.filter(c => !c.passed);
  if (failedLengthChecks.length > 0) {
    checks.push({
      name: 'Content Length',
      passed: false,
      message: `Exceeds limit for: ${failedLengthChecks.map(c => `${c.platform} (${c.actual}/${c.limit})`).join(', ')}`,
      severity: 'error',
    });
    totalScore -= 30;
  } else {
    checks.push({
      name: 'Content Length',
      passed: true,
      message: 'Content length within limits for all platforms',
      severity: 'info',
    });
  }

  // 3. Check for sensitive topics
  const sensitiveFound = config.sensitiveTopics.filter(topic =>
    content.toLowerCase().includes(topic.toLowerCase())
  );
  if (sensitiveFound.length > 0) {
    checks.push({
      name: 'Sensitive Topics',
      passed: false,
      message: `May contain sensitive topics: ${sensitiveFound.join(', ')}`,
      severity: 'warning',
    });
    totalScore -= 15;
  } else {
    checks.push({
      name: 'Sensitive Topics',
      passed: true,
      message: 'No sensitive topics detected',
      severity: 'info',
    });
  }

  // 4. Check required hashtags
  if (config.requiredHashtags.length > 0) {
    const missingHashtags = config.requiredHashtags.filter(tag =>
      !content.includes(tag)
    );
    if (missingHashtags.length > 0) {
      checks.push({
        name: 'Required Hashtags',
        passed: false,
        message: `Missing required hashtags: ${missingHashtags.join(', ')}`,
        severity: 'warning',
      });
      totalScore -= 10;
    } else {
      checks.push({
        name: 'Required Hashtags',
        passed: true,
        message: 'All required hashtags present',
        severity: 'info',
      });
    }
  }

  // 5. AI-powered brand alignment check
  if (brandKit) {
    try {
      const alignmentPrompt = `
Analyze this social media content for brand alignment:

Content: "${content}"

Brand Guidelines:
- Niche: ${brandKit.niche}
- Tone: ${brandKit.tone}
- Content Pillars: ${brandKit.contentPillars?.join(', ')}

Rate the alignment from 0-100 and identify any issues.
Respond in JSON format: { "score": number, "issues": string[], "suggestions": string[] }
`;
      const response = await universalChat(alignmentPrompt);
      const result = JSON.parse(response);
      
      if (result.score < 70) {
        checks.push({
          name: 'Brand Alignment',
          passed: false,
          message: `Low brand alignment (${result.score}%): ${result.issues?.join(', ') || 'Review recommended'}`,
          severity: 'warning',
        });
        totalScore -= (100 - result.score) / 4;
      } else {
        checks.push({
          name: 'Brand Alignment',
          passed: true,
          message: `Good brand alignment (${result.score}%)`,
          severity: 'info',
        });
      }
    } catch {
      checks.push({
        name: 'Brand Alignment',
        passed: true,
        message: 'Could not verify brand alignment',
        severity: 'warning',
      });
    }
  }

  // 6. Check daily post limit
  const todayPosts = await getTodayPostCount();
  if (todayPosts >= config.maxDailyPosts) {
    checks.push({
      name: 'Daily Limit',
      passed: false,
      message: `Daily post limit reached (${todayPosts}/${config.maxDailyPosts})`,
      severity: 'error',
    });
    blockedReasons.push('Daily post limit reached');
  } else {
    checks.push({
      name: 'Daily Limit',
      passed: true,
      message: `Within daily limit (${todayPosts}/${config.maxDailyPosts})`,
      severity: 'info',
    });
  }

  // 7. Check for spam patterns
  const spamPatterns = [
    /(.)\1{4,}/,  // Repeated characters
    /(https?:\/\/[^\s]+\s*){3,}/,  // Multiple links
    /[A-Z\s]{20,}/,  // Excessive caps
  ];
  const spamFound = spamPatterns.some(pattern => pattern.test(content));
  if (spamFound) {
    checks.push({
      name: 'Spam Detection',
      passed: false,
      message: 'Content may appear spammy',
      severity: 'warning',
    });
    totalScore -= 20;
  } else {
    checks.push({
      name: 'Spam Detection',
      passed: true,
      message: 'No spam patterns detected',
      severity: 'info',
    });
  }

  const finalScore = Math.max(0, Math.min(100, totalScore)) / 100;
  const hasErrors = checks.some(c => c.severity === 'error' && !c.passed);
  const hasWarnings = checks.some(c => c.severity === 'warning' && !c.passed);

  return {
    passed: !hasErrors && finalScore >= config.minQualityScore,
    score: finalScore,
    checks,
    requiresHumanReview: config.requireApproval || hasWarnings || finalScore < 0.8,
    blockedReasons,
  };
}

// Get today's post count
async function getTodayPostCount(): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const count = await kvGet(`posts_count_${today}`);
  return parseInt(count || '0', 10);
}

// Increment today's post count
export async function incrementPostCount(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const current = await getTodayPostCount();
  await kvSet(`posts_count_${today}`, String(current + 1));
}

// Create approval request
export async function createApprovalRequest(
  contentId: string,
  content: string,
  platforms: string[],
  scheduledTime?: string
): Promise<ApprovalRequest> {
  const brandKit = await loadBrandKit();
  const safetyCheck = await runSafetyChecks(content, platforms, brandKit);
  
  const request: ApprovalRequest = {
    id: `apr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    contentId,
    content,
    platforms,
    scheduledTime,
    safetyCheck,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  // Save to pending approvals
  const pending = await loadPendingApprovals();
  pending.push(request);
  await writeFile(`${PATHS.settings}/pending-approvals.json`, pending);

  return request;
}

// Load pending approvals
export async function loadPendingApprovals(): Promise<ApprovalRequest[]> {
  try {
    const approvals = await readFile<ApprovalRequest[]>(`${PATHS.settings}/pending-approvals.json`);
    return approvals || [];
  } catch {
    return [];
  }
}

// Approve content
export async function approveContent(
  requestId: string,
  reviewedBy: string,
  notes?: string
): Promise<ApprovalRequest | null> {
  const pending = await loadPendingApprovals();
  const index = pending.findIndex(r => r.id === requestId);
  
  if (index === -1) return null;

  pending[index] = {
    ...pending[index],
    status: 'approved',
    reviewedAt: new Date().toISOString(),
    reviewedBy,
    notes,
  };

  await writeFile(`${PATHS.settings}/pending-approvals.json`, pending);
  
  // Move to approved history
  const history = await loadApprovalHistory();
  history.push(pending[index]);
  await writeFile(`${PATHS.settings}/approval-history.json`, history);

  return pending[index];
}

// Reject content
export async function rejectContent(
  requestId: string,
  reviewedBy: string,
  notes: string
): Promise<ApprovalRequest | null> {
  const pending = await loadPendingApprovals();
  const index = pending.findIndex(r => r.id === requestId);
  
  if (index === -1) return null;

  pending[index] = {
    ...pending[index],
    status: 'rejected',
    reviewedAt: new Date().toISOString(),
    reviewedBy,
    notes,
  };

  await writeFile(`${PATHS.settings}/pending-approvals.json`, pending);
  
  // Move to history
  const history = await loadApprovalHistory();
  history.push(pending[index]);
  await writeFile(`${PATHS.settings}/approval-history.json`, history);

  // Remove from pending
  pending.splice(index, 1);
  await writeFile(`${PATHS.settings}/pending-approvals.json`, pending);

  return pending[index];
}

// Load approval history
export async function loadApprovalHistory(): Promise<ApprovalRequest[]> {
  try {
    const history = await readFile<ApprovalRequest[]>(`${PATHS.settings}/approval-history.json`);
    return history || [];
  } catch {
    return [];
  }
}

// Check if content can be auto-published (no human review needed)
export async function canAutoPublish(content: string, platforms: string[]): Promise<boolean> {
  const config = await loadSafetyConfig();
  
  if (!config.allowAutoPublish || config.safeModeEnabled) {
    return false;
  }

  const brandKit = await loadBrandKit();
  const safetyCheck = await runSafetyChecks(content, platforms, brandKit);
  
  return safetyCheck.passed && !safetyCheck.requiresHumanReview && safetyCheck.score >= 0.9;
}

// Enable/disable safe mode
export async function setSafeMode(enabled: boolean): Promise<void> {
  await saveSafetyConfig({ safeModeEnabled: enabled });
}

// Check if safe mode is enabled
export async function isSafeModeEnabled(): Promise<boolean> {
  const config = await loadSafetyConfig();
  return config.safeModeEnabled;
}
