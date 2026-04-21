/**
 * VIRAL SCORING ENGINE
 * Scores content based on emotional triggers, readability, and engagement potential
 * 
 * Score Categories:
 * - Emotional Trigger (0-100)
 * - Readability (0-100)
 * - Engagement Strength (0-100)
 * - Hook Quality (0-100)
 * - CTA Effectiveness (0-100)
 * 
 * Final Score: Weighted average (0-100)
 */

export interface ViralScore {
  total: number;
  breakdown: ScoreBreakdown;
  insights: string[];
  improvements: string[];
  predictedEngagement: number; // 0-10%
  viralPotential: 'low' | 'medium' | 'high' | 'viral';
}

export interface ScoreBreakdown {
  emotionalTrigger: number;
  readability: number;
  engagementStrength: number;
  hookQuality: number;
  ctaEffectiveness: number;
  structureScore: number;
}

// Emotional trigger words and their weights
const EMOTIONAL_TRIGGERS: Record<string, number> = {
  // High impact positive
  'amazing': 8, 'incredible': 8, 'unbelievable': 9, 'shocking': 9,
  'secret': 10, 'exclusive': 9, 'limited': 8, 'free': 9,
  'instant': 7, 'guaranteed': 8, 'proven': 7, 'discover': 8,
  
  // Curiosity triggers
  'how': 6, 'why': 6, 'what': 5, 'revealed': 8, 'hidden': 8,
  'truth': 7, 'finally': 7, 'actually': 6, 'really': 5,
  
  // Urgency triggers
  'now': 7, 'today': 6, 'immediately': 8, 'urgent': 9,
  'last chance': 10, 'ending soon': 9, 'don\'t miss': 8,
  
  // Social proof
  'everyone': 6, 'most people': 6, 'experts': 7, 'studies show': 7,
  'millions': 7, 'thousands': 6, 'viral': 8,
  
  // Negative emotion (also engaging)
  'mistake': 7, 'wrong': 6, 'fail': 7, 'avoid': 7, 'never': 6,
  'stop': 6, 'warning': 8, 'danger': 8,
};

// Power words for hooks
const POWER_HOOK_PATTERNS: RegExp[] = [
  /^(stop|wait|listen|attention|breaking)/i,
  /^(the|a) (secret|truth|reason|mistake)/i,
  /^(most people|nobody|everyone) (don't|doesn't|thinks)/i,
  /^(i|we) (never|always|finally|just)/i,
  /^(here's|this is) (why|how|what)/i,
  /^(you're|you are) (probably|definitely|likely)/i,
  /\d+ (things|ways|reasons|tips|secrets)/i,
  /^(unpopular opinion|hot take|confession)/i,
];

// CTA patterns
const CTA_PATTERNS: RegExp[] = [
  /(follow|subscribe|like|share|comment|save|bookmark)/i,
  /(click|tap|swipe|check out|visit)/i,
  /(dm|message|reach out|contact)/i,
  /(link in bio|link below|learn more)/i,
  /(what do you think|agree|thoughts)/i,
  /(drop a|leave a|tell me)/i,
];

// Robotic/generic patterns to penalize
const ROBOTIC_PATTERNS: RegExp[] = [
  /\b(furthermore|moreover|additionally|consequently)\b/i,
  /\b(in conclusion|to summarize|in summary)\b/i,
  /\b(it is important to note|it should be noted)\b/i,
  /\b(leverage|synergy|paradigm|optimize)\b/i,
  /\b(utilize|facilitate|implement|streamline)\b/i,
];

/**
 * ViralScoringEngine Class
 * Analyzes and scores content for viral potential
 */
export class ViralScoringEngine {
  private scoringWeights = {
    emotionalTrigger: 0.25,
    readability: 0.15,
    engagementStrength: 0.25,
    hookQuality: 0.20,
    ctaEffectiveness: 0.10,
    structureScore: 0.05,
  };

  /**
   * Score content for viral potential
   */
  async score(content: string): Promise<ViralScore> {
    if (!content || content.trim().length === 0) {
      return this.createEmptyScore();
    }

    const breakdown: ScoreBreakdown = {
      emotionalTrigger: this.scoreEmotionalTriggers(content),
      readability: this.scoreReadability(content),
      engagementStrength: this.scoreEngagementStrength(content),
      hookQuality: this.scoreHookQuality(content),
      ctaEffectiveness: this.scoreCTAEffectiveness(content),
      structureScore: this.scoreStructure(content),
    };

    // Calculate weighted total
    const total = Math.round(
      breakdown.emotionalTrigger * this.scoringWeights.emotionalTrigger +
      breakdown.readability * this.scoringWeights.readability +
      breakdown.engagementStrength * this.scoringWeights.engagementStrength +
      breakdown.hookQuality * this.scoringWeights.hookQuality +
      breakdown.ctaEffectiveness * this.scoringWeights.ctaEffectiveness +
      breakdown.structureScore * this.scoringWeights.structureScore
    );

    const insights = this.generateInsights(breakdown);
    const improvements = this.generateImprovements(breakdown);

    return {
      total,
      breakdown,
      insights,
      improvements,
      predictedEngagement: this.calculatePredictedEngagement(total),
      viralPotential: this.categorizeViralPotential(total),
    };
  }

  /**
   * Score emotional triggers
   */
  private scoreEmotionalTriggers(content: string): number {
    let score = 50; // Base score
    const words = content.toLowerCase().split(/\s+/);

    // Check for emotional trigger words
    for (const word of words) {
      const cleanWord = word.replace(/[^a-z]/g, '');
      if (EMOTIONAL_TRIGGERS[cleanWord]) {
        score += EMOTIONAL_TRIGGERS[cleanWord];
      }
    }

    // Check for exclamation marks (emotion indicator)
    const exclamations = (content.match(/!/g) || []).length;
    score += Math.min(exclamations * 3, 15);

    // Check for questions (engagement driver)
    const questions = (content.match(/\?/g) || []).length;
    score += Math.min(questions * 4, 12);

    // Check for personal pronouns (relatability)
    const youCount = (content.match(/\byou\b/gi) || []).length;
    score += Math.min(youCount * 3, 15);

    // Penalize robotic language
    for (const pattern of ROBOTIC_PATTERNS) {
      if (pattern.test(content)) {
        score -= 15;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score readability
   */
  private scoreReadability(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const characters = content.replace(/\s/g, '').length;

    if (words.length === 0) return 0;

    // Average word length
    const avgWordLength = characters / words.length;
    
    // Average sentence length
    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : words.length;

    let score = 70; // Base score

    // Optimal word length: 4-6 characters
    if (avgWordLength >= 4 && avgWordLength <= 6) {
      score += 15;
    } else if (avgWordLength < 4 || avgWordLength > 8) {
      score -= 10;
    }

    // Optimal sentence length: 10-20 words
    if (avgSentenceLength >= 10 && avgSentenceLength <= 20) {
      score += 15;
    } else if (avgSentenceLength > 30) {
      score -= 15;
    } else if (avgSentenceLength < 5) {
      score -= 5;
    }

    // Check for line breaks (good for readability)
    const lineBreaks = (content.match(/\n/g) || []).length;
    if (lineBreaks > 0 && lineBreaks < 10) {
      score += Math.min(lineBreaks * 3, 15);
    }

    // Penalize walls of text
    if (content.length > 500 && lineBreaks < 2) {
      score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score engagement strength
   */
  private scoreEngagementStrength(content: string): number {
    let score = 50;

    // Direct address (using "you")
    const youCount = (content.match(/\byou\b/gi) || []).length;
    score += Math.min(youCount * 4, 20);

    // Questions encourage comments
    const questions = (content.match(/\?/g) || []).length;
    score += Math.min(questions * 5, 20);

    // Story elements (I, we, my, our)
    const storyElements = (content.match(/\b(i|we|my|our)\b/gi) || []).length;
    score += Math.min(storyElements * 2, 10);

    // Controversy/opinion signals
    const opinionSignals = (content.match(/\b(think|believe|opinion|agree|disagree)\b/gi) || []).length;
    score += Math.min(opinionSignals * 4, 12);

    // Lists and numbers
    const numbers = (content.match(/\d+/g) || []).length;
    score += Math.min(numbers * 3, 10);

    // Emoji usage (moderate is good)
    const emojis = (content.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojis >= 1 && emojis <= 5) {
      score += 8;
    } else if (emojis > 10) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score hook quality (first line)
   */
  private scoreHookQuality(content: string): number {
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return 0;

    const hook = lines[0].trim();
    let score = 40;

    // Check against power hook patterns
    for (const pattern of POWER_HOOK_PATTERNS) {
      if (pattern.test(hook)) {
        score += 20;
        break;
      }
    }

    // Optimal hook length: 30-80 characters
    if (hook.length >= 30 && hook.length <= 80) {
      score += 15;
    } else if (hook.length > 120) {
      score -= 15;
    }

    // Starts with number
    if (/^\d/.test(hook)) {
      score += 10;
    }

    // Contains emotional trigger
    const hookLower = hook.toLowerCase();
    for (const [word, weight] of Object.entries(EMOTIONAL_TRIGGERS)) {
      if (hookLower.includes(word)) {
        score += Math.min(weight, 10);
        break;
      }
    }

    // Ends with question or exclamation
    if (hook.endsWith('?') || hook.endsWith('!')) {
      score += 8;
    }

    // Penalize generic starts
    const genericStarts = [
      /^(hi|hey|hello|good morning)/i,
      /^(i just|i wanted|i'm going)/i,
      /^(check out|take a look)/i,
    ];
    for (const pattern of genericStarts) {
      if (pattern.test(hook)) {
        score -= 20;
        break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score CTA effectiveness
   */
  private scoreCTAEffectiveness(content: string): number {
    let score = 30;

    // Check for CTA patterns
    let ctaCount = 0;
    for (const pattern of CTA_PATTERNS) {
      if (pattern.test(content)) {
        ctaCount++;
      }
    }

    score += Math.min(ctaCount * 15, 45);

    // CTA in last sentence is most effective
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 0) {
      const lastSentence = sentences[sentences.length - 1];
      for (const pattern of CTA_PATTERNS) {
        if (pattern.test(lastSentence)) {
          score += 15;
          break;
        }
      }
    }

    // Penalize too many CTAs (seems desperate)
    if (ctaCount > 3) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score content structure (Hook -> Value -> CTA)
   */
  private scoreStructure(content: string): number {
    let score = 50;
    const lines = content.split('\n').filter(l => l.trim().length > 0);

    // Has clear sections
    if (lines.length >= 3) {
      score += 15;
    }

    // Has line breaks for readability
    if (lines.length > 1) {
      score += 10;
    }

    // First line is short (hook)
    if (lines[0] && lines[0].length <= 100) {
      score += 10;
    }

    // Last part has CTA
    if (lines.length > 0) {
      const lastPart = lines.slice(-2).join(' ');
      for (const pattern of CTA_PATTERNS) {
        if (pattern.test(lastPart)) {
          score += 15;
          break;
        }
      }
    }

    // Middle has value/content (not just fluff)
    if (lines.length >= 3) {
      const middle = lines.slice(1, -1).join(' ');
      if (middle.length > 100) {
        score += 10;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate insights from scores
   */
  private generateInsights(breakdown: ScoreBreakdown): string[] {
    const insights: string[] = [];

    if (breakdown.hookQuality >= 80) {
      insights.push('Strong opening hook that captures attention');
    }
    if (breakdown.emotionalTrigger >= 80) {
      insights.push('High emotional resonance will drive shares');
    }
    if (breakdown.readability >= 80) {
      insights.push('Easy to read and digest quickly');
    }
    if (breakdown.engagementStrength >= 80) {
      insights.push('Strong engagement drivers present');
    }
    if (breakdown.ctaEffectiveness >= 70) {
      insights.push('Clear call-to-action will convert viewers');
    }

    if (insights.length === 0) {
      insights.push('Content has room for optimization');
    }

    return insights;
  }

  /**
   * Generate improvement suggestions
   */
  private generateImprovements(breakdown: ScoreBreakdown): string[] {
    const improvements: string[] = [];

    if (breakdown.hookQuality < 60) {
      improvements.push('Strengthen the opening line with a curiosity gap or bold claim');
    }
    if (breakdown.emotionalTrigger < 60) {
      improvements.push('Add emotional trigger words to increase resonance');
    }
    if (breakdown.readability < 60) {
      improvements.push('Break up text with line breaks and shorter sentences');
    }
    if (breakdown.engagementStrength < 60) {
      improvements.push('Add questions or direct address ("you") to boost engagement');
    }
    if (breakdown.ctaEffectiveness < 50) {
      improvements.push('Include a clear call-to-action at the end');
    }
    if (breakdown.structureScore < 60) {
      improvements.push('Follow Hook -> Value -> CTA structure');
    }

    return improvements;
  }

  /**
   * Calculate predicted engagement rate
   */
  private calculatePredictedEngagement(totalScore: number): number {
    // Map score to engagement percentage (0-10%)
    if (totalScore >= 90) return 8 + Math.random() * 2;
    if (totalScore >= 80) return 5 + Math.random() * 3;
    if (totalScore >= 70) return 3 + Math.random() * 2;
    if (totalScore >= 60) return 2 + Math.random() * 1;
    if (totalScore >= 50) return 1 + Math.random() * 1;
    return 0.5 + Math.random() * 0.5;
  }

  /**
   * Categorize viral potential
   */
  private categorizeViralPotential(totalScore: number): 'low' | 'medium' | 'high' | 'viral' {
    if (totalScore >= 90) return 'viral';
    if (totalScore >= 75) return 'high';
    if (totalScore >= 55) return 'medium';
    return 'low';
  }

  /**
   * Create empty score for invalid content
   */
  private createEmptyScore(): ViralScore {
    return {
      total: 0,
      breakdown: {
        emotionalTrigger: 0,
        readability: 0,
        engagementStrength: 0,
        hookQuality: 0,
        ctaEffectiveness: 0,
        structureScore: 0,
      },
      insights: ['No content to analyze'],
      improvements: ['Provide content to receive scoring'],
      predictedEngagement: 0,
      viralPotential: 'low',
    };
  }

  /**
   * Update scoring weights
   */
  updateWeights(weights: Partial<typeof this.scoringWeights>): void {
    this.scoringWeights = { ...this.scoringWeights, ...weights };
  }
}

// Export singleton
export const viralScoringEngine = new ViralScoringEngine();
