'use client';

import type { BrandKit, ChatMediaAsset } from '@/lib/types';
import { universalChat } from './aiService';
import { loadBrandKit } from './memoryService';
import { buildMemoryContext } from './agentMemoryService';
import { initializeAgents, loadAgents, executeAgentTask, type AgentOutput } from './multiAgentService';
import { validateContent, makeGovernorDecision, recordCost } from './governorService';
import {
  generateImage as generateImageAsset,
  type ImageProvider,
} from './imageGenerationService';
import { validateImageQuality, quickValidateImage } from './mediaValidator';
import {
  generateVideo as generateVideoAsset,
  type VideoProvider,
} from './videoGenerationService';

type MediaKind = 'image' | 'video';

interface MediaPromptPlan {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5';
  durationSeconds?: number;
  reasoning: string;
  agentOutputs: AgentOutput[];
}

export interface MediaGenerationResult {
  content: string;
  media: ChatMediaAsset[];
  prompt: string;
  provider: string;
}

function clampAspectRatio(input?: string): '16:9' | '9:16' | '1:1' | '4:5' {
  if (input === '9:16' || input === '1:1' || input === '4:5') return input;
  return '16:9';
}

async function buildMediaPrompt(
  request: string,
  kind: MediaKind,
  preferredModel?: string
): Promise<MediaPromptPlan> {
  await initializeAgents();
  const brandKit = await loadBrandKit();
  const memoryContext = await buildMemoryContext();
  const agents = await loadAgents();

  const visualAgent = agents.find(a => a.role === 'visual' && a.evolutionState !== 'deprecated');
  const strategistAgent = agents.find(a => a.role === 'strategist' && a.evolutionState !== 'deprecated');

  const aiProvider = async (prompt: string): Promise<string> =>
    universalChat(prompt, { model: preferredModel || 'gpt-4o', brandKit });

  const context = {
    brandContext: brandKit ? JSON.stringify(brandKit) : '',
    memoryContext,
    format: kind,
    platform: kind === 'video' ? 'video' : 'image',
    recentPerformance: 'Media requests should return finished assets, not a concept summary.',
  };

  const agentOutputs = (
    await Promise.all(
      [visualAgent, strategistAgent]
        .filter(Boolean)
        .map(agent => executeAgentTask(agent!, request, context, aiProvider))
    )
  ).filter(output => output.content.trim().length > 0);

  const synthesisPrompt = `You are the Nexus media governor.

User request:
${request}

Media type: ${kind}
Brand context: ${brandKit ? JSON.stringify(brandKit) : 'none'}
Memory context: ${memoryContext || 'none'}

Specialist outputs:
${agentOutputs.map(output => `[${output.agentRole}] ${output.content}`).join('\n\n') || 'No specialist output available.'}

Build a production-ready ${kind} generation plan that can be sent directly to a media model.
- Do not return a concept pitch.
- Do not ask for confirmation.
- The prompt must target final asset generation.
- The negative prompt should aggressively avoid low quality, distorted anatomy, watermarks, text overlays, and extra limbs.
- For video, optimize for motion, shot continuity, and a short social clip.

Return strict JSON:
{
  "prompt": "final prompt",
  "negativePrompt": "negative prompt",
  "aspectRatio": "16:9 | 9:16 | 1:1 | 4:5",
  "durationSeconds": 5,
  "reasoning": "one short sentence"
}`;

  const synthesis = await universalChat(synthesisPrompt, {
    model: preferredModel || 'gpt-4o',
    brandKit,
  });

  const jsonMatch = synthesis.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to build a media generation plan');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const prompt = String(parsed.prompt || '').trim();
  if (!prompt) {
    throw new Error('Media prompt plan was empty');
  }

  const validation = await validateContent(prompt, {
    isRegeneration: false,
  });
  const governorDecision = await makeGovernorDecision(validation, {
    currentModel: preferredModel || 'gpt-4o',
    regenerationCount: 0,
  });

  if (!governorDecision.approved) {
    throw new Error(governorDecision.reason || 'Governor rejected the media prompt plan');
  }

  return {
    prompt,
    negativePrompt: String(parsed.negativePrompt || '').trim() || undefined,
    aspectRatio: clampAspectRatio(parsed.aspectRatio),
    durationSeconds: Number(parsed.durationSeconds) || 5,
    reasoning: String(parsed.reasoning || '').trim() || 'Prompt synthesized by the media agent system.',
    agentOutputs,
  };
}

export async function generateAgentImage(
  request: string,
  options: {
    preferredModel?: string;
    provider?: ImageProvider;
  } = {}
): Promise<MediaGenerationResult> {
  const plan = await buildMediaPrompt(request, 'image', options.preferredModel);
  const result = await generateImageAsset({
    prompt: plan.prompt,
    negativePrompt: plan.negativePrompt,
    provider: options.provider,
    width: plan.aspectRatio === '9:16' ? 1024 : 1024,
    height: plan.aspectRatio === '9:16' ? 1792 : 1024,
  });

  const quickValidation = quickValidateImage(result.url);
  if (!quickValidation.valid) {
    throw new Error(quickValidation.reason || 'Generated image was invalid');
  }

  const quality = await validateImageQuality(result.url);
  if (!quality.passed) {
    throw new Error(quality.reason || 'Generated image failed quality validation');
  }

  await recordCost({
    provider: result.provider,
    model: 'image-generation',
    tokens: plan.prompt.length,
    cost: 1,
    taskType: 'image_generation',
  });

  return {
    content: `Generated an image with ${result.provider}.\n\nPrompt used: ${plan.prompt}`,
    media: [
      {
        type: 'image',
        url: result.url,
        provider: result.provider,
        prompt: plan.prompt,
      },
    ],
    prompt: plan.prompt,
    provider: result.provider,
  };
}

export async function generateAgentVideo(
  request: string,
  options: {
    preferredModel?: string;
    provider?: VideoProvider;
  } = {}
): Promise<MediaGenerationResult> {
  const plan = await buildMediaPrompt(request, 'video', options.preferredModel);
  const result = await generateVideoAsset({
    prompt: plan.prompt,
    negativePrompt: plan.negativePrompt,
    provider: options.provider || 'ltx23',
    aspectRatio: plan.aspectRatio,
    durationSeconds: plan.durationSeconds,
  });

  await recordCost({
    provider: result.provider,
    model: 'video-generation',
    tokens: plan.prompt.length,
    cost: 3,
    taskType: 'video_generation',
  });

  return {
    content: `Generated a video with ${result.provider}.\n\nPrompt used: ${plan.prompt}`,
    media: [
      {
        type: 'video',
        url: result.url,
        provider: result.provider,
        prompt: plan.prompt,
        thumbnailUrl: result.thumbnailUrl,
      },
    ],
    prompt: plan.prompt,
    provider: result.provider,
  };
}
