// Multi-Agent Orchestration Service
// Implements dynamic specialized agents with task orchestration

import { kvGet, kvSet } from './puterService';
import { generateId } from './memoryService';

// Agent Types
export type AgentRole = 
  | 'writer' 
  | 'hook' 
  | 'strategist' 
  | 'optimizer' 
  | 'critic' 
  | 'visual' 
  | 'hashtag' 
  | 'engagement'
  | 'hybrid';

export type AgentCapability = 
  | 'text_generation'
  | 'hook_creation'
  | 'strategy_planning'
  | 'content_optimization'
  | 'quality_critique'
  | 'visual_description'
  | 'hashtag_research'
  | 'engagement_prediction'
  | 'multi_task';

export interface AgentConfig {
  id: string;
  name: string;
  role: AgentRole;
  capabilities: AgentCapability[];
  promptTemplate: string;
  scoringWeights: {
    creativity: number;
    relevance: number;
    engagement: number;
    brandAlignment: number;
  };
  performanceScore: number;
  taskHistory: AgentTaskRecord[];
  evolutionState: 'active' | 'promoted' | 'demoted' | 'deprecated' | 'hybrid';
  version: number;
  parentAgents?: string[]; // For hybrid agents
  createdAt: string;
  updatedAt: string;
}

export interface AgentTaskRecord {
  taskId: string;
  taskType: string;
  input: string;
  output: string;
  score: number;
  timestamp: string;
  duration: number;
}

export interface AgentOutput {
  agentId: string;
  agentRole: AgentRole;
  content: string;
  score: number;
  reasoning: string;
  metadata: Record<string, unknown>;
}

export interface SubTask {
  id: string;
  type: 'hook' | 'body' | 'strategy' | 'optimize' | 'critique' | 'visual' | 'hashtag';
  input: string;
  assignedAgent: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: AgentOutput;
  dependencies?: string[];
}

export interface OrchestrationPlan {
  id: string;
  userRequest: string;
  subtasks: SubTask[];
  parallelGroups: string[][];
  aggregationStrategy: 'best_score' | 'combine' | 'vote' | 'weighted';
  status: 'planning' | 'executing' | 'aggregating' | 'completed' | 'failed';
  finalOutput?: string;
  createdAt: string;
}

// Default Agent Templates
const DEFAULT_AGENTS: Omit<AgentConfig, 'id' | 'taskHistory' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'HookMaster',
    role: 'hook',
    capabilities: ['hook_creation', 'engagement_prediction'],
    promptTemplate: `You are a master hook creator. Your job is to write attention-grabbing opening lines.

Rules:
- First line MUST stop the scroll
- Use curiosity gaps, bold claims, or emotional triggers
- Maximum 15 words for the hook
- Never start with "I" or generic phrases

Input: {{input}}
Brand Context: {{brandContext}}

Generate 3 different hooks, ranked by expected engagement.`,
    scoringWeights: { creativity: 0.3, relevance: 0.2, engagement: 0.4, brandAlignment: 0.1 },
    performanceScore: 75,
    evolutionState: 'active',
    version: 1,
  },
  {
    name: 'ContentWriter',
    role: 'writer',
    capabilities: ['text_generation', 'content_optimization'],
    promptTemplate: `You are an expert content writer specializing in social media.

Rules:
- Write engaging, conversational content
- Use short paragraphs and line breaks
- Include a clear call-to-action
- Match the brand voice exactly

Input: {{input}}
Hook to expand: {{hook}}
Brand Context: {{brandContext}}

Write the full post body (without the hook).`,
    scoringWeights: { creativity: 0.25, relevance: 0.3, engagement: 0.25, brandAlignment: 0.2 },
    performanceScore: 75,
    evolutionState: 'active',
    version: 1,
  },
  {
    name: 'StrategyAdvisor',
    role: 'strategist',
    capabilities: ['strategy_planning', 'engagement_prediction'],
    promptTemplate: `You are a social media strategy expert.

Your job is to:
- Analyze the content direction
- Suggest optimal posting time
- Recommend content format
- Predict engagement potential

Input: {{input}}
Brand Context: {{brandContext}}
Recent Performance: {{recentPerformance}}

Provide strategic recommendations.`,
    scoringWeights: { creativity: 0.1, relevance: 0.4, engagement: 0.3, brandAlignment: 0.2 },
    performanceScore: 75,
    evolutionState: 'active',
    version: 1,
  },
  {
    name: 'QualityCritic',
    role: 'critic',
    capabilities: ['quality_critique', 'content_optimization'],
    promptTemplate: `You are a harsh but fair content critic.

Your job is to:
- Identify weaknesses in the content
- Check for generic/robotic language
- Verify brand alignment
- Score the content quality
- Suggest specific improvements

Content to review: {{content}}
Brand Context: {{brandContext}}

Provide a detailed critique with a score from 0-100.`,
    scoringWeights: { creativity: 0.2, relevance: 0.3, engagement: 0.2, brandAlignment: 0.3 },
    performanceScore: 75,
    evolutionState: 'active',
    version: 1,
  },
  {
    name: 'ContentOptimizer',
    role: 'optimizer',
    capabilities: ['content_optimization', 'engagement_prediction'],
    promptTemplate: `You are a content optimization specialist.

Your job is to:
- Improve readability
- Enhance emotional impact
- Optimize for platform algorithms
- Strengthen the call-to-action

Original content: {{content}}
Critique feedback: {{critique}}
Brand Context: {{brandContext}}

Rewrite the content with improvements.`,
    scoringWeights: { creativity: 0.2, relevance: 0.25, engagement: 0.35, brandAlignment: 0.2 },
    performanceScore: 75,
    evolutionState: 'active',
    version: 1,
  },
  {
    name: 'HashtagResearcher',
    role: 'hashtag',
    capabilities: ['hashtag_research', 'engagement_prediction'],
    promptTemplate: `You are a hashtag research expert.

Your job is to:
- Research relevant hashtags
- Mix popular and niche tags
- Consider platform best practices
- Optimize for discoverability

Content: {{content}}
Platform: {{platform}}
Niche: {{niche}}

Provide 10-15 optimized hashtags with reasoning.`,
    scoringWeights: { creativity: 0.1, relevance: 0.4, engagement: 0.4, brandAlignment: 0.1 },
    performanceScore: 75,
    evolutionState: 'active',
    version: 1,
  },
  {
    name: 'EngagementPredictor',
    role: 'engagement',
    capabilities: ['engagement_prediction', 'strategy_planning'],
    promptTemplate: `You are an engagement prediction AI.

Analyze the content and predict:
- Expected engagement rate (0-10%)
- Viral potential (low/medium/high)
- Best posting time
- Target audience segment

Content: {{content}}
Platform: {{platform}}
Historical data: {{historicalData}}

Provide detailed predictions with confidence levels.`,
    scoringWeights: { creativity: 0.05, relevance: 0.35, engagement: 0.5, brandAlignment: 0.1 },
    performanceScore: 75,
    evolutionState: 'active',
    version: 1,
  },
];

// Storage Keys
const AGENTS_KEY = 'nexus_agents';
const ORCHESTRATION_HISTORY_KEY = 'nexus_orchestration_history';

// Initialize agents
export async function initializeAgents(): Promise<AgentConfig[]> {
  const existing = await loadAgents();
  if (existing.length > 0) return existing;
  
  const now = new Date().toISOString();
  const agents: AgentConfig[] = DEFAULT_AGENTS.map(template => ({
    ...template,
    id: generateId(),
    taskHistory: [],
    createdAt: now,
    updatedAt: now,
  }));
  
  await saveAgents(agents);
  return agents;
}

// Load agents
export async function loadAgents(): Promise<AgentConfig[]> {
  try {
    const data = await kvGet(AGENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Save agents
export async function saveAgents(agents: AgentConfig[]): Promise<void> {
  await kvSet(AGENTS_KEY, JSON.stringify(agents));
}

// Get agent by role
export async function getAgentByRole(role: AgentRole): Promise<AgentConfig | null> {
  const agents = await loadAgents();
  // Get the best performing active agent for this role
  const roleAgents = agents
    .filter(a => a.role === role && a.evolutionState !== 'deprecated')
    .sort((a, b) => b.performanceScore - a.performanceScore);
  return roleAgents[0] || null;
}

// Get agent by ID
export async function getAgentById(id: string): Promise<AgentConfig | null> {
  const agents = await loadAgents();
  return agents.find(a => a.id === id) || null;
}

// Update agent
export async function updateAgent(id: string, updates: Partial<AgentConfig>): Promise<void> {
  const agents = await loadAgents();
  const index = agents.findIndex(a => a.id === id);
  if (index >= 0) {
    agents[index] = {
      ...agents[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await saveAgents(agents);
  }
}

// Record task completion
export async function recordAgentTask(
  agentId: string,
  task: Omit<AgentTaskRecord, 'taskId' | 'timestamp'>
): Promise<void> {
  const agents = await loadAgents();
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return;
  
  const record: AgentTaskRecord = {
    ...task,
    taskId: generateId(),
    timestamp: new Date().toISOString(),
  };
  
  // Keep last 100 tasks
  agent.taskHistory = [record, ...agent.taskHistory].slice(0, 100);
  
  // Update performance score based on recent tasks
  const recentTasks = agent.taskHistory.slice(0, 20);
  if (recentTasks.length >= 5) {
    const avgScore = recentTasks.reduce((sum, t) => sum + t.score, 0) / recentTasks.length;
    agent.performanceScore = Math.round(avgScore);
  }
  
  agent.updatedAt = new Date().toISOString();
  await saveAgents(agents);
}

// Task Orchestration
export async function createOrchestrationPlan(
  userRequest: string,
  requestType: 'content' | 'strategy' | 'full'
): Promise<OrchestrationPlan> {
  const planId = generateId();
  const subtasks: SubTask[] = [];
  const parallelGroups: string[][] = [];
  
  const agents = await loadAgents();
  const getAgent = (role: AgentRole) => 
    agents.find(a => a.role === role && a.evolutionState !== 'deprecated');
  
  if (requestType === 'content' || requestType === 'full') {
    // Phase 1: Strategy + Hook (parallel)
    const hookTask: SubTask = {
      id: generateId(),
      type: 'hook',
      input: userRequest,
      assignedAgent: getAgent('hook')?.id || '',
      status: 'pending',
    };
    
    const strategyTask: SubTask = {
      id: generateId(),
      type: 'strategy',
      input: userRequest,
      assignedAgent: getAgent('strategist')?.id || '',
      status: 'pending',
    };
    
    subtasks.push(hookTask, strategyTask);
    parallelGroups.push([hookTask.id, strategyTask.id]);
    
    // Phase 2: Body writing (depends on hook)
    const bodyTask: SubTask = {
      id: generateId(),
      type: 'body',
      input: userRequest,
      assignedAgent: getAgent('writer')?.id || '',
      status: 'pending',
      dependencies: [hookTask.id],
    };
    subtasks.push(bodyTask);
    parallelGroups.push([bodyTask.id]);
    
    // Phase 3: Critique + Hashtags (parallel, depends on body)
    const critiqueTask: SubTask = {
      id: generateId(),
      type: 'critique',
      input: '',
      assignedAgent: getAgent('critic')?.id || '',
      status: 'pending',
      dependencies: [bodyTask.id],
    };
    
    const hashtagTask: SubTask = {
      id: generateId(),
      type: 'hashtag',
      input: '',
      assignedAgent: getAgent('hashtag')?.id || '',
      status: 'pending',
      dependencies: [bodyTask.id],
    };
    
    subtasks.push(critiqueTask, hashtagTask);
    parallelGroups.push([critiqueTask.id, hashtagTask.id]);
    
    // Phase 4: Optimization (depends on critique)
    const optimizeTask: SubTask = {
      id: generateId(),
      type: 'optimize',
      input: '',
      assignedAgent: getAgent('optimizer')?.id || '',
      status: 'pending',
      dependencies: [critiqueTask.id],
    };
    subtasks.push(optimizeTask);
    parallelGroups.push([optimizeTask.id]);
  } else if (requestType === 'strategy') {
    const strategyTask: SubTask = {
      id: generateId(),
      type: 'strategy',
      input: userRequest,
      assignedAgent: getAgent('strategist')?.id || '',
      status: 'pending',
    };
    subtasks.push(strategyTask);
    parallelGroups.push([strategyTask.id]);
  }
  
  const plan: OrchestrationPlan = {
    id: planId,
    userRequest,
    subtasks,
    parallelGroups,
    aggregationStrategy: requestType === 'full' ? 'combine' : 'best_score',
    status: 'planning',
    createdAt: new Date().toISOString(),
  };
  
  return plan;
}

// Execute a single agent task
export async function executeAgentTask(
  agent: AgentConfig,
  input: string,
  context: Record<string, string>,
  aiProvider: (prompt: string) => Promise<string>
): Promise<AgentOutput> {
  const startTime = Date.now();
  
  // Build prompt from template
  let prompt = agent.promptTemplate;
  prompt = prompt.replace('{{input}}', input);
  for (const [key, value] of Object.entries(context)) {
    prompt = prompt.replace(`{{${key}}}`, value);
  }
  
  try {
    const content = await aiProvider(prompt);
    const duration = Date.now() - startTime;
    
    // Calculate score based on output characteristics
    const score = calculateOutputScore(content, agent.scoringWeights);
    
    // Record the task
    await recordAgentTask(agent.id, {
      taskType: agent.role,
      input,
      output: content,
      score,
      duration,
    });
    
    return {
      agentId: agent.id,
      agentRole: agent.role,
      content,
      score,
      reasoning: `Generated by ${agent.name} (v${agent.version})`,
      metadata: { duration, promptLength: prompt.length },
    };
  } catch (error) {
    return {
      agentId: agent.id,
      agentRole: agent.role,
      content: '',
      score: 0,
      reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: { error: true },
    };
  }
}

// Calculate output score
function calculateOutputScore(
  content: string,
  weights: AgentConfig['scoringWeights']
): number {
  let score = 0;
  
  // Creativity: Check for unique phrases, varied sentence structure
  const sentences = content.split(/[.!?]+/).filter(Boolean);
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / (sentences.length || 1);
  const creativityScore = Math.min(100, avgSentenceLength > 50 && avgSentenceLength < 150 ? 80 : 60);
  score += creativityScore * weights.creativity;
  
  // Relevance: Check content length and completeness
  const relevanceScore = content.length > 100 ? 85 : content.length > 50 ? 70 : 50;
  score += relevanceScore * weights.relevance;
  
  // Engagement: Check for hooks, questions, CTAs
  const hasQuestion = content.includes('?');
  const hasCTA = /\b(click|tap|follow|share|comment|like|save|dm|link)\b/i.test(content);
  const hasHook = sentences[0]?.length < 100;
  const engagementScore = (hasQuestion ? 25 : 0) + (hasCTA ? 35 : 0) + (hasHook ? 25 : 0) + 15;
  score += engagementScore * weights.engagement;
  
  // Brand alignment: Placeholder (would need brand context)
  const brandScore = 75;
  score += brandScore * weights.brandAlignment;
  
  return Math.round(score);
}

// Agent voting system
export function selectBestOutput(outputs: AgentOutput[]): AgentOutput | null {
  if (outputs.length === 0) return null;
  if (outputs.length === 1) return outputs[0];
  
  // Sort by score descending
  const sorted = [...outputs].sort((a, b) => b.score - a.score);
  
  // If top 2 are close (within 5 points), consider other factors
  if (sorted.length >= 2 && sorted[0].score - sorted[1].score <= 5) {
    // Prefer longer, more detailed content
    const byLength = sorted.slice(0, 2).sort((a, b) => b.content.length - a.content.length);
    return byLength[0];
  }
  
  return sorted[0];
}

// Combine multiple outputs
export function combineOutputs(outputs: AgentOutput[], strategy: 'merge' | 'sections'): string {
  if (outputs.length === 0) return '';
  if (outputs.length === 1) return outputs[0].content;
  
  if (strategy === 'sections') {
    return outputs.map(o => `[${o.agentRole.toUpperCase()}]\n${o.content}`).join('\n\n');
  }
  
  // Merge strategy: Use best hook, best body, etc.
  const hookOutput = outputs.find(o => o.agentRole === 'hook');
  const bodyOutput = outputs.find(o => o.agentRole === 'writer');
  const hashtagOutput = outputs.find(o => o.agentRole === 'hashtag');
  
  let result = '';
  if (hookOutput) result += hookOutput.content + '\n\n';
  if (bodyOutput) result += bodyOutput.content;
  if (hashtagOutput) result += '\n\n' + hashtagOutput.content;
  
  return result.trim();
}

// Get agent statistics
export async function getAgentStats(): Promise<{
  totalAgents: number;
  activeAgents: number;
  avgPerformance: number;
  topPerformer: AgentConfig | null;
  recentTasks: number;
}> {
  const agents = await loadAgents();
  const activeAgents = agents.filter(a => a.evolutionState !== 'deprecated');
  const totalTasks = agents.reduce((sum, a) => sum + a.taskHistory.length, 0);
  
  return {
    totalAgents: agents.length,
    activeAgents: activeAgents.length,
    avgPerformance: Math.round(
      activeAgents.reduce((sum, a) => sum + a.performanceScore, 0) / (activeAgents.length || 1)
    ),
    topPerformer: activeAgents.sort((a, b) => b.performanceScore - a.performanceScore)[0] || null,
    recentTasks: totalTasks,
  };
}

// Create hybrid agent from top performers
export async function createHybridAgent(
  parentIds: string[],
  name: string
): Promise<AgentConfig | null> {
  const agents = await loadAgents();
  const parents = agents.filter(a => parentIds.includes(a.id));
  
  if (parents.length < 2) return null;
  
  // Combine capabilities
  const capabilities = [...new Set(parents.flatMap(p => p.capabilities))] as AgentCapability[];
  
  // Average scoring weights
  const avgWeights = {
    creativity: parents.reduce((sum, p) => sum + p.scoringWeights.creativity, 0) / parents.length,
    relevance: parents.reduce((sum, p) => sum + p.scoringWeights.relevance, 0) / parents.length,
    engagement: parents.reduce((sum, p) => sum + p.scoringWeights.engagement, 0) / parents.length,
    brandAlignment: parents.reduce((sum, p) => sum + p.scoringWeights.brandAlignment, 0) / parents.length,
  };
  
  // Combine prompt templates
  const combinedPrompt = `You are a hybrid AI combining multiple specializations.

Your capabilities: ${capabilities.join(', ')}

Base your approach on these successful strategies:
${parents.map(p => `- ${p.name}: ${p.promptTemplate.substring(0, 200)}...`).join('\n')}

Input: {{input}}
Brand Context: {{brandContext}}

Generate optimized content using your combined expertise.`;
  
  const now = new Date().toISOString();
  const hybrid: AgentConfig = {
    id: generateId(),
    name,
    role: 'hybrid',
    capabilities,
    promptTemplate: combinedPrompt,
    scoringWeights: avgWeights,
    performanceScore: Math.round(parents.reduce((sum, p) => sum + p.performanceScore, 0) / parents.length),
    taskHistory: [],
    evolutionState: 'hybrid',
    version: 1,
    parentAgents: parentIds,
    createdAt: now,
    updatedAt: now,
  };
  
  agents.push(hybrid);
  await saveAgents(agents);
  
  return hybrid;
}
