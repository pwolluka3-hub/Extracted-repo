'use client';

import type { Platform } from '@/lib/types';
import { generateContent } from './contentEngine';
import { generateAgentImage, generateAgentVideo } from './agentMediaService';
import { generateBackgroundMusic } from './musicEngine';
import { generateVoice } from './voiceGenerationService';
import { analyzeNiche, type BrandProfile } from './nicheAnalyzerService';
import { persistBrandProfile, saveCharacterLock } from './brandMemoryAgentService';
import {
  createCharacterLock,
  enforceCharacterLock,
  scoreCharacterConsistency,
  type CharacterIdentity,
} from './characterLockAgentService';
import { buildStoryContent } from './storyEngineService';
import { directScenes } from './sceneDirectorService';
import { mapEmotionFromScene } from './emotionMappingEngine';
import { buildBeatTimingPlan } from './beatTimingEngine';
import { buildSoundDesignPlan } from './soundDesignService';
import { buildAudioMixPlan } from './audioMixingService';
import { amplifyHook } from './hookAmplifierService';
import { buildVisualPromptPackage } from './visualPromptEngineService';
import { optimizeForPlatforms } from './platformOptimizerService';
import { runQualityControl } from './qualityControlAgentService';
import { resolveGenerationRoute } from './generationControllerService';
import { enqueuePostJob } from './postQueueService';

const DEFAULT_PLATFORMS: Platform[] = ['instagram', 'tiktok', 'youtube'];

export interface UniversalPipelineRequest {
  prompt: string;
  generationId?: string;
  niche?: string;
  tone?: string;
  goal?: string;
  platforms?: Platform[];
  includeImage?: boolean;
  includeVideo?: boolean;
  includeVoice?: boolean;
  includeMusic?: boolean;
  enqueueForPosting?: boolean;
}

export interface UniversalPipelineResult {
  executionPlan: string[];
  brandProfile: BrandProfile;
  identity: string;
  rules: string[];
  structure: string;
  content: {
    hook: string;
    script: string;
    variations: string[];
    hashtags: string[];
  };
  visualPrompts: {
    imagePrompts: string[];
    videoPrompts: string[];
  };
  platformPackages: ReturnType<typeof optimizeForPlatforms>['packages'];
  audio: {
    voiceUrl?: string;
    musicUrl?: string;
    mixPlan: ReturnType<typeof buildAudioMixPlan>;
  };
  media: {
    imageUrl?: string;
    videoUrl?: string;
  };
  criticVerdict: {
    approved: boolean;
    score: number;
    reasons: string[];
  };
  warnings: string[];
  queueIds: string[];
}

function buildIdentity(profile: BrandProfile, character: CharacterIdentity | null): string {
  if (profile.contentType === 'story' && character) {
    return `Story identity centered on ${character.name} with strict character lock and loop-based suspense progression.`;
  }
  if (profile.contentType === 'business') {
    return `Authority identity for ${profile.niche}: direct, proof-oriented, conversion-aware communication.`;
  }
  if (profile.contentType === 'education') {
    return `Educator identity for ${profile.niche}: clarity-first, practical, structured explanation style.`;
  }
  return `Creator persona for ${profile.niche}: ${profile.tone}, emotionally engaging, retention-focused delivery.`;
}

function buildRuleSet(profile: BrandProfile): string[] {
  const baseRules = [
    'No generic phrasing or filler.',
    'First 3 seconds must create curiosity or tension.',
    'Every output must match the niche and audience intent.',
    'Keep tone natural, direct, and human.',
  ];

  if (profile.contentType === 'story') {
    return [
      ...baseRules,
      'Mystery over explanation.',
      'Scene-based progression with loop-friendly ending.',
      'Include one anomaly or tension spike per major beat.',
    ];
  }
  if (profile.contentType === 'education') {
    return [
      ...baseRules,
      'Clarity first, then depth.',
      'Use structured steps with concrete takeaways.',
      'Avoid ambiguity and vague advice.',
    ];
  }
  if (profile.contentType === 'entertainment') {
    return [
      ...baseRules,
      'Fast hooks and frequent pattern interrupts.',
      'Escalate energy every major beat.',
      'End on replay trigger.',
    ];
  }

  return [...baseRules, 'Balance narrative engagement with practical value.'];
}

function buildStructure(profile: BrandProfile): string {
  if (profile.contentType === 'story') return 'Scene -> Escalation -> Cliffhanger Loop';
  if (profile.contentType === 'education') return 'Hook -> Value -> Takeaway -> CTA';
  return 'Hook -> Retention Beat -> Loop/CTA';
}

export async function runUniversalContentPipeline(
  request: UniversalPipelineRequest
): Promise<UniversalPipelineResult> {
  const pipelineRunId = `pipeline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const platforms = request.platforms?.length ? request.platforms : DEFAULT_PLATFORMS;
  const brandProfile = await analyzeNiche({
    request: request.prompt,
    niche: request.niche,
    tone: request.tone,
    goal: request.goal,
  });

  const character = brandProfile.contentType === 'story' ? createCharacterLock(request.prompt) : null;
  if (character) {
    await saveCharacterLock({
      name: character.name,
      faceSignature: character.faceSignature,
      clothingSignature: character.clothingSignature,
      physicalTraits: character.physicalTraits,
      identityVector: character.identityVector,
      referenceDescriptor: character.referenceDescriptor,
    });
  }

  await persistBrandProfile(brandProfile);

  const identity = buildIdentity(brandProfile, character);
  const rules = buildRuleSet(brandProfile);
  const structure = buildStructure(brandProfile);

  const story = await buildStoryContent(request.prompt, brandProfile);
  const amplifiedHook = amplifyHook(story.hook);
  const lockedScript = character ? enforceCharacterLock(story.script, character) : story.script;
  const warnings: string[] = [];
  if (character) {
    const consistencyScore = scoreCharacterConsistency(lockedScript, character);
    if (consistencyScore < 70) {
      warnings.push(`Character consistency is weak (${consistencyScore}/100). Regeneration or tighter brief is recommended.`);
    }
  }

  let generated: Awaited<ReturnType<typeof generateContent>>;

  try {
    generated = await generateContent({
      idea: `${amplifiedHook.hook}\n\n${lockedScript}`,
      platforms,
      customInstructions: `Apply identity: ${identity}\nRules:\n- ${rules.join('\n- ')}\nStructure: ${structure}`,
    });
  } catch (error) {
    warnings.push(
      `Text generation fallback used: ${error instanceof Error ? error.message : 'Unknown generation error'}`
    );
    generated = {
      text: `${amplifiedHook.hook}\n\n${lockedScript}`.trim(),
      variations: [],
      hashtags: [],
      platformPackages: [],
    };
  }

  const scenes = directScenes(generated.text);
  const emotion = mapEmotionFromScene(scenes.map((scene) => scene.description).join('\n'));
  const beatPlan = buildBeatTimingPlan(12, emotion.emotion);
  const soundDesign = buildSoundDesignPlan(emotion.emotion, beatPlan);
  const mixPlan = buildAudioMixPlan(soundDesign);

  const visualPromptSource = buildVisualPromptPackage(
    scenes,
    brandProfile.styleTags,
    character
      ? `${character.name}, ${character.faceSignature}, ${character.clothingSignature}, identity-anchor-${character.identityVector.join('-')}`
      : undefined
  );

  const route = await resolveGenerationRoute();
  let imageUrl: string | undefined;
  let videoUrl: string | undefined;

  if (request.includeImage !== false && visualPromptSource.imagePrompts[0]) {
    try {
      const imageResult = await generateAgentImage(visualPromptSource.imagePrompts[0], {
        preferredModel: route.textModel,
        provider: route.imageProvider,
      });
      imageUrl = imageResult.media[0]?.url;
      if (!imageUrl) {
        warnings.push('Image generation returned no asset URL.');
      }
    } catch (error) {
      warnings.push(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown image error'}`);
    }
  }

  if (request.includeVideo !== false && visualPromptSource.videoPrompts[0]) {
    try {
      const videoResult = await generateAgentVideo(visualPromptSource.videoPrompts[0], {
        preferredModel: route.textModel,
        provider: route.videoProvider,
      });
      videoUrl = videoResult.media[0]?.url;
      if (!videoUrl) {
        warnings.push('Video generation returned no asset URL.');
      }
    } catch (error) {
      warnings.push(`Video generation failed: ${error instanceof Error ? error.message : 'Unknown video error'}`);
    }
  }

  let voiceUrl: string | undefined;
  if (request.includeVoice !== false) {
    try {
      const voice = await generateVoice({
        text: generated.text,
        provider: 'web-speech',
        speed: emotion.pacing === 'slow' ? 0.88 : emotion.pacing === 'fast' ? 1.08 : 1,
      });
      voiceUrl = typeof voice === 'string' ? voice : undefined;
    } catch {
      voiceUrl = undefined;
    }
  }

  let musicUrl: string | undefined;
  if (request.includeMusic !== false) {
    try {
      const music = await generateBackgroundMusic(generated.text, { duration: beatPlan.durationSeconds });
      musicUrl = music?.url;
      if (!musicUrl) {
        warnings.push('Music generation returned no asset URL.');
      }
    } catch (error) {
      warnings.push(`Music generation failed: ${error instanceof Error ? error.message : 'Unknown music error'}`);
    }
  }

  const platformOptimized = optimizeForPlatforms(generated.text, generated.hashtags, platforms);
  const quality = await runQualityControl({
    text: generated.text,
    platform: platforms[0],
  });

  const queueIds: string[] = [];
  if (request.enqueueForPosting) {
    for (const pkg of platformOptimized.packages) {
      const job = await enqueuePostJob({
        text: `${pkg.text}\n\n${pkg.hashtags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)).join(' ')}`.trim(),
        platforms: [pkg.platform],
        mediaUrl: videoUrl || imageUrl,
        generationId: request.generationId,
        pipelineRunId,
        niche: brandProfile.niche,
        hook: amplifiedHook.hook,
      });
      queueIds.push(job.id);
    }
  }

  const allReasons = [...quality.reasons, ...warnings];
  const adjustedScore = Math.max(0, quality.score - warnings.length * 6);

  return {
    executionPlan: [
      'Analyze niche and audience intent',
      'Lock brand identity and rules',
      'Generate hook, script, scenes, and prompts',
      'Generate optional voice/music and build mix plan',
      'Optimize output per platform and run quality control',
    ],
    brandProfile,
    identity,
    rules,
    structure,
    content: {
      hook: amplifiedHook.hook,
      script: generated.text,
      variations: generated.variations,
      hashtags: generated.hashtags,
    },
    visualPrompts: visualPromptSource,
    platformPackages: platformOptimized.packages,
    audio: {
      voiceUrl,
      musicUrl,
      mixPlan,
    },
    media: {
      imageUrl,
      videoUrl,
    },
    criticVerdict: {
      approved: quality.approved && warnings.length === 0,
      score: adjustedScore,
      reasons: allReasons,
    },
    warnings,
    queueIds,
  };
}
