import { loadSkill, saveSkill } from './memoryService';

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: string;
  enabled: boolean;
  createdAt: string;
  usageCount: number;
}

type AgentSkillTemplate = Omit<AgentSkill, 'id' | 'createdAt' | 'usageCount'>;
type StoredSkillProfile = { id: SkillProfileId; appliedAt: string };

export type SkillProfileId = 'creator' | 'business' | 'agency';

export interface SkillProfile {
  id: SkillProfileId;
  name: string;
  description: string;
  enableCategories: string[];
  pinSkillNames?: string[];
}

export const DEFAULT_APP_AGENT_SKILLS: AgentSkillTemplate[] = [
  {
    name: 'Direct Execution Mode',
    description: 'When user asks for output, produce it directly without advisory detours.',
    prompt: 'If the user asks for a deliverable, return the deliverable immediately. Do not reply with tutorials unless explicitly requested.',
    category: 'execution',
    enabled: true,
  },
  {
    name: 'Character Prompt Resolver',
    description: 'Treat rich character descriptions as image-generation requests by default.',
    prompt: 'If a message contains a detailed character description, route to direct image generation even when the user does not explicitly say "create image".',
    category: 'media',
    enabled: true,
  },
  {
    name: 'Provider Fallback Discipline',
    description: 'When one media provider fails, try alternatives before returning an error.',
    prompt: 'Attempt configured provider fallback chains for image/video generation before surfacing a failure to the user.',
    category: 'media',
    enabled: true,
  },
  {
    name: 'Fast First Draft',
    description: 'Optimize for response speed with a quality-preserving fast path.',
    prompt: 'Prefer a fast generation pass first, then escalate quality passes only when requested or when quality checks fail.',
    category: 'latency',
    enabled: true,
  },
  {
    name: 'Clarify Ambiguity Briefly',
    description: 'Ask one concise question only when missing details block execution.',
    prompt: 'If required inputs are missing, ask one short clarifying question. Otherwise execute immediately.',
    category: 'conversation',
    enabled: true,
  },
  {
    name: 'Premium Realism Bias',
    description: 'Honor premium cinematic requests with stricter quality constraints.',
    prompt: 'For requests mentioning Netflix, Seedance, premium cinematic, or ultra realism, prioritize identity continuity, natural motion, and high-fidelity output.',
    category: 'quality',
    enabled: true,
  },
  {
    name: 'Hook Variants Engine',
    description: 'Generate multiple scroll-stopping hooks for every concept.',
    prompt: 'Create 5 hook variants with different angles: curiosity, bold claim, pain point, contrarian, and story-led.',
    category: 'hooks',
    enabled: true,
  },
  {
    name: 'Storytelling Framework',
    description: 'Structure narratives for watch-time and retention.',
    prompt: 'Structure storytelling content as Hook -> Context -> Conflict -> Shift -> Practical takeaway -> CTA.',
    category: 'storytelling',
    enabled: true,
  },
  {
    name: 'Platform Native Rewriter',
    description: 'Adapt content for each platform tone and constraints.',
    prompt: 'Rewrite output natively for Instagram, TikTok, X, LinkedIn, and YouTube without sounding copied across channels.',
    category: 'repurpose',
    enabled: true,
  },
  {
    name: 'Content Calendar Planner',
    description: 'Turn ideas into weekly and monthly publishing plans.',
    prompt: 'Generate a practical content calendar with posting cadence, themes, and priority slots for each platform.',
    category: 'strategy',
    enabled: true,
  },
  {
    name: 'Trend to Angle Mapper',
    description: 'Convert trends into brand-safe content opportunities.',
    prompt: 'Map trending topics to audience pain points and convert them into unique, brand-aligned content angles.',
    category: 'strategy',
    enabled: true,
  },
  {
    name: 'Competitor Differentiator',
    description: 'Avoid generic clone content and sharpen positioning.',
    prompt: 'When comparing competitors, extract gaps and position the output with clear differentiation instead of imitation.',
    category: 'strategy',
    enabled: true,
  },
  {
    name: 'Hashtag Cluster Builder',
    description: 'Create intentional hashtag mixes by intent.',
    prompt: 'Generate a balanced hashtag cluster: high-volume, mid-volume, niche, and branded tags tied to post intent.',
    category: 'growth',
    enabled: true,
  },
  {
    name: 'Community Reply Manager',
    description: 'Draft high-quality replies to comments and audience questions.',
    prompt: 'Draft concise, human replies that acknowledge sentiment, add value, and move the conversation forward.',
    category: 'community',
    enabled: true,
  },
  {
    name: 'DM Outreach Writer',
    description: 'Compose ethical outreach and collaboration messages.',
    prompt: 'Write brief personalized outreach DMs for creators, partners, and leads with clear value and no spam tone.',
    category: 'community',
    enabled: true,
  },
  {
    name: 'LinkedIn Ghostwriter',
    description: 'Produce professional, insight-led LinkedIn posts.',
    prompt: 'Write LinkedIn posts with strong opening, practical insight, and a professional but human voice.',
    category: 'platform',
    enabled: true,
  },
  {
    name: 'YouTube Script Optimizer',
    description: 'Build scripts for retention and completion rate.',
    prompt: 'Write YouTube scripts with chaptered flow, retention loops, and clear scene-to-scene progression.',
    category: 'platform',
    enabled: true,
  },
  {
    name: 'Reel Shotlist Builder',
    description: 'Convert ideas into short-form visual production plans.',
    prompt: 'Turn short-form video ideas into a shot list with scene beats, on-screen text, voiceover lines, and B-roll cues.',
    category: 'media',
    enabled: true,
  },
  {
    name: 'Carousel Outline Builder',
    description: 'Build swipe-optimized carousel structures.',
    prompt: 'Create carousel slide structures with hook slide, value progression, proof slides, and conversion slide.',
    category: 'media',
    enabled: true,
  },
  {
    name: 'UGC Ad Script Builder',
    description: 'Draft creator-style ad scripts that feel natural.',
    prompt: 'Generate UGC-style ad scripts with problem setup, authentic product proof, social proof, and compliant CTA.',
    category: 'conversion',
    enabled: true,
  },
  {
    name: 'CTA Optimizer',
    description: 'Strengthen conversion actions without sounding pushy.',
    prompt: 'Generate CTA options: direct, soft, urgency, and value-first, and choose based on platform and audience intent.',
    category: 'conversion',
    enabled: true,
  },
  {
    name: 'A/B Variant Generator',
    description: 'Create test-ready variants for experimentation.',
    prompt: 'For every important post, generate at least 2 high-contrast variants to test hooks, CTA, and format.',
    category: 'analytics',
    enabled: true,
  },
  {
    name: 'Analytics Feedback Loop',
    description: 'Use performance data to improve future outputs.',
    prompt: 'When performance context is available, incorporate top-performing patterns and avoid repeated low-performing formats.',
    category: 'analytics',
    enabled: true,
  },
  {
    name: 'SEO Metadata Crafter',
    description: 'Generate discoverability metadata for search surfaces.',
    prompt: 'Generate SEO-friendly titles, descriptions, and keyword phrasing for YouTube, blogs, and social search indexing.',
    category: 'seo',
    enabled: true,
  },
  {
    name: 'Long-to-Short Repurposer',
    description: 'Convert long assets into short clips and posts.',
    prompt: 'Repurpose long-form content into clips, quote posts, threads, and carousel summaries without losing core message.',
    category: 'repurpose',
    enabled: true,
  },
  {
    name: 'Brand Voice Lock',
    description: 'Keep outputs consistent with established tone.',
    prompt: 'Maintain consistent brand voice, vocabulary, and tone across all platforms and content formats.',
    category: 'quality',
    enabled: true,
  },
  {
    name: 'Crisis Response Drafting',
    description: 'Handle sensitive community moments carefully.',
    prompt: 'Draft calm, accountable, non-defensive response statements for sensitive incidents and public feedback.',
    category: 'community',
    enabled: true,
  },
  {
    name: 'Offer Positioning Engine',
    description: 'Turn product/service offers into clear messaging.',
    prompt: 'Translate product features into concrete audience outcomes and position offers with clear problem-solution framing.',
    category: 'strategy',
    enabled: true,
  },
];

export const SKILL_PROFILES: SkillProfile[] = [
  {
    id: 'creator',
    name: 'Creator',
    description: 'Short-form growth, hooks, scripts, repurposing, and audience engagement.',
    enableCategories: [
      'execution',
      'conversation',
      'latency',
      'quality',
      'media',
      'hooks',
      'storytelling',
      'growth',
      'repurpose',
      'platform',
      'community',
      'analytics',
      'seo',
    ],
    pinSkillNames: ['Reel Shotlist Builder', 'YouTube Script Optimizer', 'Hook Variants Engine'],
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Conversion, offer positioning, brand consistency, and channel planning.',
    enableCategories: [
      'execution',
      'conversation',
      'quality',
      'strategy',
      'conversion',
      'platform',
      'community',
      'analytics',
      'seo',
      'repurpose',
      'growth',
    ],
    pinSkillNames: ['Offer Positioning Engine', 'CTA Optimizer', 'Brand Voice Lock'],
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'Broad multi-client coverage with strategy, production, reporting, and community ops.',
    enableCategories: [
      'execution',
      'conversation',
      'latency',
      'quality',
      'strategy',
      'media',
      'hooks',
      'storytelling',
      'repurpose',
      'platform',
      'community',
      'conversion',
      'analytics',
      'seo',
      'growth',
    ],
    pinSkillNames: ['Content Calendar Planner', 'A/B Variant Generator', 'Analytics Feedback Loop'],
  },
];

function toStoredSkill(template: AgentSkillTemplate, index: number): AgentSkill {
  return {
    ...template,
    id: `skill_builtin_${index}_${Date.now()}`,
    createdAt: new Date().toISOString(),
    usageCount: 0,
  };
}

export async function ensureAgentSkillsInstalled(): Promise<AgentSkill[]> {
  const existing = await loadSkill<AgentSkill[]>('all_skills');
  const normalized = Array.isArray(existing) ? existing : [];

  if (normalized.length === 0) {
    const initial = DEFAULT_APP_AGENT_SKILLS.map(toStoredSkill);
    await saveSkill('all_skills', initial);
    return initial;
  }

  const existingNames = new Set(normalized.map((skill) => skill.name));
  const missing = DEFAULT_APP_AGENT_SKILLS
    .filter((template) => !existingNames.has(template.name))
    .map(toStoredSkill);

  if (missing.length === 0) {
    return normalized;
  }

  const merged = [...normalized, ...missing];
  await saveSkill('all_skills', merged);
  return merged;
}

export async function getEnabledAgentSkills(): Promise<AgentSkill[]> {
  const skills = await ensureAgentSkillsInstalled();
  return skills.filter((skill) => skill.enabled !== false);
}

export function applySkillProfilePreset(skills: AgentSkill[], profileId: SkillProfileId): AgentSkill[] {
  const profile = SKILL_PROFILES.find((entry) => entry.id === profileId);
  if (!profile) return skills;

  const allowedCategories = new Set(profile.enableCategories);
  const pinnedNames = new Set(profile.pinSkillNames || []);

  return skills.map((skill) => ({
    ...skill,
    enabled: allowedCategories.has(skill.category) || pinnedNames.has(skill.name),
  }));
}

export async function loadSelectedSkillProfile(): Promise<SkillProfileId | null> {
  const saved = await loadSkill<StoredSkillProfile | string>('skill_profile');
  if (!saved) return null;
  if (typeof saved === 'string') {
    return saved === 'creator' || saved === 'business' || saved === 'agency' ? saved : null;
  }
  const profileId = saved.id;
  return profileId === 'creator' || profileId === 'business' || profileId === 'agency' ? profileId : null;
}

export async function saveSelectedSkillProfile(profileId: SkillProfileId): Promise<void> {
  await saveSkill('skill_profile', {
    id: profileId,
    appliedAt: new Date().toISOString(),
  } satisfies StoredSkillProfile);
}

export function buildAgentSkillContext(skills: AgentSkill[]): string {
  if (!skills.length) return '';

  const lines = skills.slice(0, 24).map((skill) => `- ${skill.name}: ${skill.prompt}`);
  return `\n\nActive App Skills:\n${lines.join('\n')}`;
}
