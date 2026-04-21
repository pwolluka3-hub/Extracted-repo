// Comment/Reply Suggestions Service
import { universalChat } from './aiService';
import type { BrandKit, Platform } from '@/lib/types';

export interface Comment {
  id: string;
  author: string;
  content: string;
  platform: Platform;
  postId?: string;
  timestamp?: string;
  sentiment?: 'positive' | 'negative' | 'neutral' | 'question';
}

export interface ReplySuggestion {
  reply: string;
  tone: 'friendly' | 'professional' | 'playful' | 'grateful' | 'helpful';
  sentiment: string;
  confidence: number;
}

export interface CommentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral' | 'question';
  intent: 'compliment' | 'complaint' | 'question' | 'suggestion' | 'spam' | 'engagement' | 'other';
  priority: 'high' | 'medium' | 'low';
  requiresResponse: boolean;
  suggestedAction: string;
}

// Generate reply suggestions for a comment
export async function generateReplySuggestions(
  comment: Comment,
  brandKit: BrandKit | null,
  options: {
    count?: number;
    tones?: string[];
    maxLength?: number;
  } = {}
): Promise<ReplySuggestion[]> {
  const { count = 3, tones = ['friendly', 'professional', 'playful'], maxLength = 280 } = options;
  
  const prompt = `Generate ${count} reply suggestions for this ${comment.platform} comment.

Comment by @${comment.author}: "${comment.content}"

Brand voice: ${brandKit?.tone || 'professional'}
Brand name: ${brandKit?.name || 'our brand'}
Max reply length: ${maxLength} characters

Create replies with these tones: ${tones.join(', ')}

Return JSON:
{
  "suggestions": [
    {
      "reply": "The reply text",
      "tone": "the tone used",
      "sentiment": "brief sentiment of the reply",
      "confidence": 0-100 how confident this is a good reply
    }
  ]
}

Guidelines:
- Keep replies authentic and on-brand
- Address the commenter's point directly
- Include their name if appropriate
- Encourage further engagement when relevant
- Never be defensive, even with negative comments
- For questions, provide helpful answers
- For compliments, show genuine appreciation

Return ONLY valid JSON.`;

  try {
    const response = await universalChat(prompt, { brandKit });
    const parsed = JSON.parse(response);
    return parsed.suggestions || [];
  } catch {
    return [{
      reply: `Thanks for your comment, @${comment.author}! We appreciate you taking the time to engage with us.`,
      tone: 'friendly',
      sentiment: 'grateful',
      confidence: 60,
    }];
  }
}

// Analyze a comment
export async function analyzeComment(
  comment: Comment,
  brandKit: BrandKit | null
): Promise<CommentAnalysis> {
  const prompt = `Analyze this ${comment.platform} comment:

"${comment.content}" - @${comment.author}

Return JSON:
{
  "sentiment": "positive|negative|neutral|question",
  "intent": "compliment|complaint|question|suggestion|spam|engagement|other",
  "priority": "high|medium|low",
  "requiresResponse": true/false,
  "suggestedAction": "what action to take"
}

Priority guide:
- High: Complaints, urgent questions, potential PR issues
- Medium: Questions, suggestions, meaningful engagement
- Low: Simple compliments, generic comments, spam

Return ONLY valid JSON.`;

  try {
    const response = await universalChat(prompt, { brandKit });
    return JSON.parse(response);
  } catch {
    return {
      sentiment: 'neutral',
      intent: 'other',
      priority: 'low',
      requiresResponse: false,
      suggestedAction: 'Review manually',
    };
  }
}

// Batch analyze multiple comments
export async function analyzeComments(
  comments: Comment[],
  brandKit: BrandKit | null
): Promise<Map<string, CommentAnalysis>> {
  const results = new Map<string, CommentAnalysis>();
  
  // Process in parallel (max 5 at a time)
  const batchSize = 5;
  for (let i = 0; i < comments.length; i += batchSize) {
    const batch = comments.slice(i, i + batchSize);
    const analyses = await Promise.all(
      batch.map(comment => analyzeComment(comment, brandKit))
    );
    
    batch.forEach((comment, index) => {
      results.set(comment.id, analyses[index]);
    });
  }
  
  return results;
}

// Generate a reply for a negative comment
export async function handleNegativeComment(
  comment: Comment,
  brandKit: BrandKit | null,
  context?: string
): Promise<{
  publicReply: string;
  privateFollowUp: string;
  escalationNeeded: boolean;
  escalationReason?: string;
}> {
  const prompt = `Help handle this negative ${comment.platform} comment professionally.

Comment: "${comment.content}" - @${comment.author}
${context ? `Additional context: ${context}` : ''}

Brand voice: ${brandKit?.tone || 'professional'}

Return JSON:
{
  "publicReply": "A professional, empathetic public reply that acknowledges concern and offers to help",
  "privateFollowUp": "A template for DM/email follow-up if needed",
  "escalationNeeded": true/false,
  "escalationReason": "if escalation needed, explain why"
}

Guidelines:
- Never be defensive
- Acknowledge their frustration
- Take the conversation private if appropriate
- Offer a solution or next step
- Keep public reply brief and professional
- Flag for escalation if: legal threats, serious allegations, viral potential, safety concerns

Return ONLY valid JSON.`;

  try {
    const response = await universalChat(prompt, { brandKit });
    return JSON.parse(response);
  } catch {
    return {
      publicReply: `We're sorry to hear about your experience, @${comment.author}. We'd love to help resolve this. Please DM us so we can assist you directly.`,
      privateFollowUp: `Hi ${comment.author}, thank you for bringing this to our attention. We take all feedback seriously and would like to understand more about your experience so we can help resolve this for you.`,
      escalationNeeded: false,
    };
  }
}

// Generate responses for FAQ-type comments
export async function handleFAQComment(
  comment: Comment,
  faqs: Array<{ question: string; answer: string }>,
  brandKit: BrandKit | null
): Promise<{
  matchedFAQ: boolean;
  reply: string;
  confidence: number;
}> {
  const prompt = `Match this comment to an FAQ and generate a personalized reply.

Comment: "${comment.content}" - @${comment.author}

Available FAQs:
${faqs.map((f, i) => `${i + 1}. Q: ${f.question}\n   A: ${f.answer}`).join('\n')}

Return JSON:
{
  "matchedFAQ": true/false,
  "reply": "personalized reply based on FAQ or general helpful response",
  "confidence": 0-100 how confident the match is
}

If matched, personalize the FAQ answer for this specific comment.
If not matched, provide a helpful response anyway.

Return ONLY valid JSON.`;

  try {
    const response = await universalChat(prompt, { brandKit });
    return JSON.parse(response);
  } catch {
    return {
      matchedFAQ: false,
      reply: `Thanks for your question, @${comment.author}! We'd be happy to help. Could you provide a bit more detail so we can assist you better?`,
      confidence: 30,
    };
  }
}

// Generate engagement responses (for positive comments)
export async function generateEngagementResponse(
  comment: Comment,
  brandKit: BrandKit | null
): Promise<string> {
  const prompt = `Generate a warm, engaging reply to this positive ${comment.platform} comment.

Comment: "${comment.content}" - @${comment.author}

Brand voice: ${brandKit?.tone || 'friendly'}

Create a reply that:
- Shows genuine appreciation
- Encourages continued engagement
- Feels personal, not generic
- Is appropriate length for ${comment.platform}

Return ONLY the reply text, no JSON or explanation.`;

  try {
    return await universalChat(prompt, { brandKit });
  } catch {
    return `Thank you so much for your kind words, @${comment.author}! 🙏 We really appreciate your support!`;
  }
}

// Detect if comment needs human review
export function needsHumanReview(analysis: CommentAnalysis): boolean {
  return (
    analysis.priority === 'high' ||
    analysis.sentiment === 'negative' ||
    analysis.intent === 'complaint' ||
    !analysis.requiresResponse === false
  );
}
