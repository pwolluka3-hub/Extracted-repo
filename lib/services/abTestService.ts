// A/B Testing Service
import { universalChat } from './aiService';
import { readFile, writeFile, PATHS } from './puterService';
import type { ABMetrics, ABTest, ABVariant, BrandKit, Platform } from '@/lib/types';

export type ABTestVariant = ABVariant;

export interface CreateABTestInput {
  name: string;
  description?: string;
  platform: Platform;
  variants: Array<Partial<ABVariant> & { content: string; label?: string; name?: string; metrics?: Partial<ABMetrics> }>;
  startDate?: string;
  endDate?: string;
  status?: ABTest['status'];
}

// Generate content variants for A/B testing
export async function generateVariants(
  baseContent: string,
  variationType: 'hook' | 'cta' | 'tone' | 'length' | 'format' | 'all',
  count: number = 3,
  brandKit: BrandKit | null
): Promise<ABVariant[]> {
  const prompt = getVariantPrompt(baseContent, variationType, count, brandKit);
  
  try {
    const response = await universalChat(prompt, { brandKit });
    const parsed = JSON.parse(response);
    
    return parsed.variants.map((v: { name: string; content: string }, i: number) => ({
      id: `variant_${Date.now()}_${i}`,
      name: v.name || `Variant ${String.fromCharCode(65 + i)}`,
      content: v.content,
      isControl: i === 0,
    }));
  } catch {
    return [{
      id: `variant_${Date.now()}_0`,
      name: 'Control',
      content: baseContent,
      isControl: true,
    }];
  }
}

function getVariantPrompt(
  baseContent: string,
  variationType: string,
  count: number,
  brandKit: BrandKit | null
): string {
  const base = `Create ${count} variants of this social media post for A/B testing.

Original content:
"${baseContent}"

Brand voice: ${brandKit?.tone || 'professional'}`;

  const variations: Record<string, string> = {
    hook: `${base}

Focus on varying the HOOK (opening line). Keep the main message but test different attention-grabbing openings:
- Question hook
- Bold statement hook
- Story hook
- Statistic hook`,
    
    cta: `${base}

Focus on varying the CALL TO ACTION. Keep the main content but test different CTAs:
- Direct CTA
- Soft CTA
- Question CTA
- Urgency CTA`,
    
    tone: `${base}

Focus on varying the TONE while keeping the same message:
- Professional/formal
- Casual/friendly
- Humorous/playful
- Inspiring/motivational`,
    
    length: `${base}

Focus on varying the LENGTH:
- Ultra-short (1-2 sentences)
- Standard (original length)
- Detailed (expanded version)`,
    
    format: `${base}

Focus on varying the FORMAT:
- Paragraph style
- Bullet points
- Numbered list
- Story format`,
    
    all: `${base}

Create completely different approaches while keeping the core message. Vary hooks, structure, tone, and CTAs.`,
  };

  return `${variations[variationType] || variations.all}

Return JSON:
{
  "variants": [
    { "name": "Variant name", "content": "Full post content" },
    ...
  ]
}

Return ONLY valid JSON with ${count} variants.`;
}

// Create a new A/B test
export async function createABTest(
  input: CreateABTestInput
): Promise<ABTest> {
  const test: ABTest = {
    id: `abtest_${Date.now()}`,
    name: input.name,
    description: input.description,
    status: input.status || 'draft',
    platform: input.platform,
    variants: input.variants.map((variant, index) => ({
      id: variant.id || `variant_${Date.now()}_${index}`,
      name: variant.name || variant.label || `Variant ${String.fromCharCode(65 + index)}`,
      label: variant.label,
      content: variant.content,
      imageUrl: variant.imageUrl,
      hashtags: variant.hashtags,
      metrics: variant.metrics,
      isControl: variant.isControl ?? index === 0,
    })),
    startDate: input.startDate,
    endDate: input.endDate,
    createdAt: new Date().toISOString(),
  };
  
  await saveABTest(test);
  return test;
}

// Save A/B test
export async function saveABTest(test: ABTest): Promise<void> {
  const tests = await getAllABTests();
  const index = tests.findIndex(t => t.id === test.id);
  
  if (index >= 0) {
    tests[index] = test;
  } else {
    tests.push(test);
  }
  
  await writeFile(`${PATHS.analytics}/ab_tests.json`, tests);
}

// Get all A/B tests
export async function getAllABTests(): Promise<ABTest[]> {
  const data = await readFile<ABTest[]>(`${PATHS.analytics}/ab_tests.json`, true);
  return data || [];
}

export async function getABTests(): Promise<ABTest[]> {
  return getAllABTests();
}

// Get a single A/B test
export async function getABTest(id: string): Promise<ABTest | null> {
  const tests = await getAllABTests();
  return tests.find(t => t.id === id) || null;
}

// Start an A/B test
export async function startABTest(id: string): Promise<ABTest | null> {
  const test = await getABTest(id);
  if (!test) return null;
  
  test.status = 'active';
  test.startDate = new Date().toISOString();
  
  await saveABTest(test);
  return test;
}

// Update variant metrics
export async function updateVariantMetrics(
  testId: string,
  variantId: string,
  metrics: Partial<ABMetrics>
): Promise<void> {
  const test = await getABTest(testId);
  if (!test) return;
  
  const variant = test.variants.find(v => v.id === variantId);
  if (!variant) return;
  
  variant.metrics = {
    impressions: metrics.impressions || variant.metrics?.impressions || 0,
    engagements: metrics.engagements || variant.metrics?.engagements || 0,
    clicks: metrics.clicks || variant.metrics?.clicks || 0,
    shares: metrics.shares || variant.metrics?.shares || 0,
    saves: metrics.saves || variant.metrics?.saves || 0,
    comments: metrics.comments || variant.metrics?.comments || 0,
    engagementRate: 0,
    clickThroughRate: 0,
  };
  
  // Calculate rates
  if (variant.metrics.impressions > 0) {
    variant.metrics.engagementRate = (variant.metrics.engagements / variant.metrics.impressions) * 100;
    variant.metrics.clickThroughRate = (variant.metrics.clicks / variant.metrics.impressions) * 100;
  }
  
  await saveABTest(test);
}

export async function updateABTestMetrics(
  testId: string,
  variantId: string,
  metrics: Partial<ABMetrics>
): Promise<void> {
  return updateVariantMetrics(testId, variantId, metrics);
}

// Analyze test results and determine winner
export async function analyzeTestResults(testId: string): Promise<{
  winner: ABVariant | null;
  confidence: number;
  insights: string[];
}> {
  const test = await getABTest(testId);
  if (!test) return { winner: null, confidence: 0, insights: [] };
  
  const variantsWithMetrics = test.variants.filter(v => v.metrics);
  if (variantsWithMetrics.length === 0) {
    return { winner: null, confidence: 0, insights: ['No metrics data available yet'] };
  }
  
  // Find winner by engagement rate
  let winner: ABVariant | null = null;
  let highestEngagement = 0;
  
  for (const variant of variantsWithMetrics) {
    if (variant.metrics && variant.metrics.engagementRate > highestEngagement) {
      highestEngagement = variant.metrics.engagementRate;
      winner = variant;
    }
  }
  
  // Calculate statistical confidence (simplified)
  const totalImpressions = variantsWithMetrics.reduce(
    (sum, v) => sum + (v.metrics?.impressions || 0), 0
  );
  
  let confidence = Math.min(95, (totalImpressions / 1000) * 10 + 50);
  
  // Generate insights
  const insights: string[] = [];
  
  if (winner) {
    const control = variantsWithMetrics.find(v => v.isControl);
    if (control && control.metrics && winner.metrics) {
      const improvement = ((winner.metrics.engagementRate - control.metrics.engagementRate) / control.metrics.engagementRate) * 100;
      
      if (improvement > 0) {
        insights.push(`"${winner.name}" outperformed control by ${improvement.toFixed(1)}%`);
      }
    }
    
    insights.push(`Winner achieved ${highestEngagement.toFixed(2)}% engagement rate`);
  }
  
  if (totalImpressions < 1000) {
    insights.push('Consider running the test longer for more reliable results');
    confidence = Math.min(confidence, 60);
  }
  
  return { winner, confidence, insights };
}

// Complete an A/B test
export async function completeABTest(testId: string): Promise<ABTest | null> {
  const test = await getABTest(testId);
  if (!test) return null;
  
  const analysis = await analyzeTestResults(testId);
  
  test.status = 'completed';
  test.endDate = new Date().toISOString();
  test.winner = analysis.winner?.id;
  test.insights = analysis.insights;
  
  await saveABTest(test);
  return test;
}

// Delete an A/B test
export async function deleteABTest(testId: string): Promise<void> {
  const tests = await getAllABTests();
  const filtered = tests.filter(t => t.id !== testId);
  await writeFile(`${PATHS.analytics}/ab_tests.json`, filtered);
}

// Get test suggestions based on content
export async function getTestSuggestions(
  content: string,
  brandKit: BrandKit | null
): Promise<Array<{ type: string; description: string; impact: string }>> {
  const prompt = `Analyze this social media post and suggest A/B tests that could improve its performance:

Content: "${content}"

Return JSON array with 3-5 test suggestions:
[
  {
    "type": "hook|cta|tone|length|format",
    "description": "What to test",
    "impact": "Expected impact (high/medium/low)"
  }
]

Return ONLY valid JSON.`;

  try {
    const response = await universalChat(prompt, { brandKit });
    return JSON.parse(response);
  } catch {
    return [
      { type: 'hook', description: 'Test different opening lines', impact: 'high' },
      { type: 'cta', description: 'Test different calls to action', impact: 'medium' },
      { type: 'tone', description: 'Test casual vs professional tone', impact: 'medium' },
    ];
  }
}
