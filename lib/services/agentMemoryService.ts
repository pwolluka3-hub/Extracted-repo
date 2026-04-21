// Agent Memory Service - Persistent memory that survives model switches
// This stores learned information, user preferences, niche details, and content ideas
import { kvGet, kvSet, readFile, writeFile, PATHS } from './puterService';

export interface AgentMemory {
  // Core brand/niche knowledge
  niche: string;
  nicheDetails: string[];
  targetAudience: string;
  audienceInsights: string[];
  
  // Content ideas and themes
  contentIdeas: ContentIdea[];
  contentPillars: string[];
  contentThemes: string[];
  
  // Learned preferences
  preferredTone: string;
  writingStyle: string;
  avoidTopics: string[];
  preferredHashtags: string[];
  
  // User-specific knowledge
  userFacts: UserFact[];
  businessGoals: string[];
  competitors: string[];
  
  // Conversation summaries (compressed context)
  conversationSummaries: ConversationSummary[];
  
  // Last updated
  lastUpdated: string;
}

export interface ContentIdea {
  id: string;
  idea: string;
  category: string;
  platform?: string;
  status: 'new' | 'used' | 'archived';
  createdAt: string;
  usedAt?: string;
}

export interface UserFact {
  key: string;
  value: string;
  confidence: number;
  source: string; // 'user_stated' | 'inferred' | 'onboarding'
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  summary: string;
  keyPoints: string[];
  createdAt: string;
  messageCount: number;
}

const MEMORY_PATH = `${PATHS.system}/agent_memory.json`;

// Default empty memory
const DEFAULT_MEMORY: AgentMemory = {
  niche: '',
  nicheDetails: [],
  targetAudience: '',
  audienceInsights: [],
  contentIdeas: [],
  contentPillars: [],
  contentThemes: [],
  preferredTone: '',
  writingStyle: '',
  avoidTopics: [],
  preferredHashtags: [],
  userFacts: [],
  businessGoals: [],
  competitors: [],
  conversationSummaries: [],
  lastUpdated: new Date().toISOString(),
};

// Load agent memory
export async function loadAgentMemory(): Promise<AgentMemory> {
  try {
    const memory = await readFile<AgentMemory>(MEMORY_PATH, true);
    return memory || { ...DEFAULT_MEMORY };
  } catch {
    return { ...DEFAULT_MEMORY };
  }
}

// Save agent memory
export async function saveAgentMemory(memory: AgentMemory): Promise<boolean> {
  memory.lastUpdated = new Date().toISOString();
  return writeFile(MEMORY_PATH, memory);
}

// Update specific fields in memory
export async function updateAgentMemory(updates: Partial<AgentMemory>): Promise<boolean> {
  const current = await loadAgentMemory();
  const updated = { ...current, ...updates, lastUpdated: new Date().toISOString() };
  return saveAgentMemory(updated);
}

// Add a content idea
export async function addContentIdea(idea: string, category: string, platform?: string): Promise<boolean> {
  const memory = await loadAgentMemory();
  
  const newIdea: ContentIdea = {
    id: `idea-${Date.now()}`,
    idea,
    category,
    platform,
    status: 'new',
    createdAt: new Date().toISOString(),
  };
  
  memory.contentIdeas.push(newIdea);
  
  // Keep only last 100 ideas
  if (memory.contentIdeas.length > 100) {
    memory.contentIdeas = memory.contentIdeas.slice(-100);
  }
  
  return saveAgentMemory(memory);
}

// Get unused content ideas
export async function getUnusedIdeas(limit = 10): Promise<ContentIdea[]> {
  const memory = await loadAgentMemory();
  return memory.contentIdeas
    .filter(i => i.status === 'new')
    .slice(-limit);
}

// Mark idea as used
export async function markIdeaUsed(ideaId: string): Promise<boolean> {
  const memory = await loadAgentMemory();
  const idea = memory.contentIdeas.find(i => i.id === ideaId);
  if (idea) {
    idea.status = 'used';
    idea.usedAt = new Date().toISOString();
    return saveAgentMemory(memory);
  }
  return false;
}

// Add user fact
export async function addUserFact(key: string, value: string, source: string = 'inferred'): Promise<boolean> {
  const memory = await loadAgentMemory();
  
  // Update existing fact or add new one
  const existingIndex = memory.userFacts.findIndex(f => f.key === key);
  
  const fact: UserFact = {
    key,
    value,
    confidence: source === 'user_stated' ? 1.0 : 0.8,
    source,
    createdAt: new Date().toISOString(),
  };
  
  if (existingIndex >= 0) {
    memory.userFacts[existingIndex] = fact;
  } else {
    memory.userFacts.push(fact);
  }
  
  return saveAgentMemory(memory);
}

// Add niche detail
export async function addNicheDetail(detail: string): Promise<boolean> {
  const memory = await loadAgentMemory();
  if (!memory.nicheDetails.includes(detail)) {
    memory.nicheDetails.push(detail);
    return saveAgentMemory(memory);
  }
  return true;
}

// Add audience insight
export async function addAudienceInsight(insight: string): Promise<boolean> {
  const memory = await loadAgentMemory();
  if (!memory.audienceInsights.includes(insight)) {
    memory.audienceInsights.push(insight);
    return saveAgentMemory(memory);
  }
  return true;
}

// Add conversation summary (for context compression)
export async function addConversationSummary(summary: string, keyPoints: string[], messageCount: number): Promise<boolean> {
  const memory = await loadAgentMemory();
  
  const newSummary: ConversationSummary = {
    id: `summary-${Date.now()}`,
    summary,
    keyPoints,
    createdAt: new Date().toISOString(),
    messageCount,
  };
  
  memory.conversationSummaries.push(newSummary);
  
  // Keep only last 20 summaries
  if (memory.conversationSummaries.length > 20) {
    memory.conversationSummaries = memory.conversationSummaries.slice(-20);
  }
  
  return saveAgentMemory(memory);
}

// Build memory context string for injection into prompts
export async function buildMemoryContext(): Promise<string> {
  const memory = await loadAgentMemory();
  
  const sections: string[] = [];
  
  // Niche and audience
  if (memory.niche) {
    sections.push(`NICHE: ${memory.niche}`);
  }
  if (memory.nicheDetails.length > 0) {
    sections.push(`NICHE DETAILS:\n${memory.nicheDetails.map(d => `- ${d}`).join('\n')}`);
  }
  if (memory.targetAudience) {
    sections.push(`TARGET AUDIENCE: ${memory.targetAudience}`);
  }
  if (memory.audienceInsights.length > 0) {
    sections.push(`AUDIENCE INSIGHTS:\n${memory.audienceInsights.map(i => `- ${i}`).join('\n')}`);
  }
  
  // Content pillars and themes
  if (memory.contentPillars.length > 0) {
    sections.push(`CONTENT PILLARS: ${memory.contentPillars.join(', ')}`);
  }
  if (memory.contentThemes.length > 0) {
    sections.push(`CONTENT THEMES: ${memory.contentThemes.join(', ')}`);
  }
  
  // Style preferences
  if (memory.preferredTone) {
    sections.push(`TONE: ${memory.preferredTone}`);
  }
  if (memory.writingStyle) {
    sections.push(`WRITING STYLE: ${memory.writingStyle}`);
  }
  if (memory.avoidTopics.length > 0) {
    sections.push(`AVOID TOPICS: ${memory.avoidTopics.join(', ')}`);
  }
  
  // User facts
  if (memory.userFacts.length > 0) {
    const highConfidenceFacts = memory.userFacts.filter(f => f.confidence >= 0.7);
    if (highConfidenceFacts.length > 0) {
      sections.push(`USER FACTS:\n${highConfidenceFacts.map(f => `- ${f.key}: ${f.value}`).join('\n')}`);
    }
  }
  
  // Business goals
  if (memory.businessGoals.length > 0) {
    sections.push(`BUSINESS GOALS:\n${memory.businessGoals.map(g => `- ${g}`).join('\n')}`);
  }
  
  // Competitors
  if (memory.competitors.length > 0) {
    sections.push(`COMPETITORS: ${memory.competitors.join(', ')}`);
  }
  
  // Recent content ideas (for reference)
  const recentIdeas = memory.contentIdeas.filter(i => i.status === 'new').slice(-5);
  if (recentIdeas.length > 0) {
    sections.push(`SAVED CONTENT IDEAS:\n${recentIdeas.map(i => `- ${i.idea}`).join('\n')}`);
  }
  
  // Recent conversation summaries
  const recentSummaries = memory.conversationSummaries.slice(-3);
  if (recentSummaries.length > 0) {
    sections.push(`RECENT CONTEXT:\n${recentSummaries.map(s => s.summary).join('\n')}`);
  }
  
  if (sections.length === 0) {
    return '';
  }
  
  return `\n\n=== PERSISTENT MEMORY ===\n${sections.join('\n\n')}\n=== END MEMORY ===`;
}

// Sync memory with brand kit (one-time or when brand kit updates)
export async function syncWithBrandKit(brandKit: {
  brandName?: string;
  niche?: string;
  targetAudience?: string;
  tone?: string;
  contentPillars?: string[];
  avoidTopics?: string[];
}): Promise<boolean> {
  const memory = await loadAgentMemory();
  
  if (brandKit.niche && brandKit.niche !== memory.niche) {
    memory.niche = brandKit.niche;
  }
  if (brandKit.targetAudience && brandKit.targetAudience !== memory.targetAudience) {
    memory.targetAudience = brandKit.targetAudience;
  }
  if (brandKit.tone && brandKit.tone !== memory.preferredTone) {
    memory.preferredTone = brandKit.tone;
  }
  if (brandKit.contentPillars && brandKit.contentPillars.length > 0) {
    memory.contentPillars = [...new Set([...memory.contentPillars, ...brandKit.contentPillars])];
  }
  if (brandKit.avoidTopics && brandKit.avoidTopics.length > 0) {
    memory.avoidTopics = [...new Set([...memory.avoidTopics, ...brandKit.avoidTopics])];
  }
  
  // Add brand name as user fact
  if (brandKit.brandName) {
    await addUserFact('brand_name', brandKit.brandName, 'onboarding');
  }
  
  return saveAgentMemory(memory);
}

// Parse AI response for memory-worthy information
export function extractMemoryFromResponse(response: string): {
  ideas: string[];
  facts: { key: string; value: string }[];
  insights: string[];
} {
  const result = {
    ideas: [] as string[],
    facts: [] as { key: string; value: string }[],
    insights: [] as string[],
  };
  
  // Look for content ideas (lines starting with numbers or bullets)
  const ideaPatterns = response.match(/(?:^|\n)[\d\.\-\*]+\s*(.{20,150})(?:\n|$)/g);
  if (ideaPatterns) {
    result.ideas = ideaPatterns
      .map(p => p.replace(/^[\d\.\-\*\n\s]+/, '').trim())
      .filter(i => i.length > 20);
  }
  
  // Look for key insights (sentences with insight keywords)
  const insightKeywords = ['your audience', 'your niche', 'your brand', 'recommend', 'suggest', 'important', 'key insight'];
  const sentences = response.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 30);
  
  for (const sentence of sentences) {
    if (insightKeywords.some(k => sentence.toLowerCase().includes(k))) {
      result.insights.push(sentence);
    }
  }
  
  return result;
}

// Clear all memory (for reset)
export async function clearAgentMemory(): Promise<boolean> {
  return saveAgentMemory({ ...DEFAULT_MEMORY });
}
