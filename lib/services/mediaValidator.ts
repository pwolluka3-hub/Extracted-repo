// Media Validator - Image quality and content validation
import { chat } from './aiService';
import { IMAGE_VALIDATION_PROMPT } from '@/lib/constants/prompts';

interface ValidationResult {
  passed: boolean;
  reason?: string;
  score?: number;
  details?: {
    anatomy: boolean;
    quality: boolean;
    composition: boolean;
    brandSafe: boolean;
  };
}

// Validate image quality using AI vision
export async function validateImageQuality(imageUrl: string): Promise<ValidationResult> {
  try {
    // If the image is a data URL, extract the base64
    let imageData = imageUrl;
    if (!imageUrl.startsWith('data:')) {
      // For external URLs, we need to fetch and convert
      // But DALL-E 3 returns URLs that are already accessible
      imageData = imageUrl;
    }

    // Use AI to analyze the image
    const analysisPrompt = `Analyze this image for quality issues.
    
Check for:
1. ANATOMY: Extra/missing fingers, deformed hands, asymmetrical faces, unrealistic body proportions
2. QUALITY: Blurriness, artifacts, low resolution, visible watermarks
3. COMPOSITION: Poor framing, cut-off subjects, awkward poses
4. BRAND SAFETY: Inappropriate content, violence, offensive material

For each category, rate as PASS or FAIL.

Respond with JSON:
{
  "anatomy": "PASS" or "FAIL: [reason]",
  "quality": "PASS" or "FAIL: [reason]", 
  "composition": "PASS" or "FAIL: [reason]",
  "brandSafe": "PASS" or "FAIL: [reason]",
  "overallScore": 0-100,
  "summary": "brief summary"
}`;

    // For vision analysis, we need to structure the message properly
    const messages = [
      {
        role: 'user' as const,
        content: [
          { type: 'image_url' as const, image_url: { url: imageData } },
          { type: 'text' as const, text: analysisPrompt }
        ]
      }
    ];

    const response = await chat(messages as any, { model: 'gpt-4o' });
    
    // Parse the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Default to pass if parsing fails
      return { passed: true, score: 70, reason: 'Could not parse validation response' };
    }

    const result = JSON.parse(jsonMatch[0]);
    
    const anatomyPassed = result.anatomy?.toUpperCase()?.startsWith('PASS') ?? true;
    const qualityPassed = result.quality?.toUpperCase()?.startsWith('PASS') ?? true;
    const compositionPassed = result.composition?.toUpperCase()?.startsWith('PASS') ?? true;
    const brandSafePassed = result.brandSafe?.toUpperCase()?.startsWith('PASS') ?? true;

    const allPassed = anatomyPassed && qualityPassed && compositionPassed && brandSafePassed;

    // Collect failure reasons
    const failures: string[] = [];
    if (!anatomyPassed) failures.push(result.anatomy);
    if (!qualityPassed) failures.push(result.quality);
    if (!compositionPassed) failures.push(result.composition);
    if (!brandSafePassed) failures.push(result.brandSafe);

    return {
      passed: allPassed,
      score: result.overallScore || (allPassed ? 85 : 50),
      reason: allPassed ? undefined : failures.join('; '),
      details: {
        anatomy: anatomyPassed,
        quality: qualityPassed,
        composition: compositionPassed,
        brandSafe: brandSafePassed,
      },
    };
  } catch (error) {
    console.error('Image validation error:', error);
    // Default to pass on error to not block the pipeline
    return { 
      passed: true, 
      score: 70, 
      reason: 'Validation error - defaulting to pass',
    };
  }
}

// Quick validation without AI (checks basic properties)
export function quickValidateImage(
  imageUrl: string
): { valid: boolean; reason?: string } {
  if (!imageUrl) {
    return { valid: false, reason: 'No image URL provided' };
  }

  // Check if it's a valid URL or data URL
  if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
    return { valid: false, reason: 'Invalid image URL format' };
  }

  // Check for common error patterns in URL
  if (imageUrl.includes('error') || imageUrl.includes('failed')) {
    return { valid: false, reason: 'Image URL indicates an error' };
  }

  return { valid: true };
}

// Validate text content for platform compliance
export async function validateTextContent(
  text: string,
  platform: string
): Promise<{
  valid: boolean;
  issues: string[];
  suggestions: string[];
}> {
  const prompt = `Analyze this social media post for ${platform}:

"${text}"

Check for:
1. Length compliance (is it within platform limits?)
2. Tone appropriateness 
3. Potential engagement issues
4. Call-to-action presence
5. Hashtag usage (appropriate count and relevance)

Respond with JSON:
{
  "valid": true/false,
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"]
}`;

  try {
    const response = await chat(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Text validation error:', error);
  }

  return { valid: true, issues: [], suggestions: [] };
}

// Check for potentially problematic content
export async function checkContentSafety(
  text: string
): Promise<{
  safe: boolean;
  flags: string[];
}> {
  const prompt = `Analyze this content for potential issues:

"${text}"

Check for:
1. Inappropriate language
2. Potentially offensive content
3. Misleading claims
4. Copyright/trademark concerns
5. Platform policy violations

Respond with JSON:
{
  "safe": true/false,
  "flags": ["flag1", "flag2"] // empty if safe
}`;

  try {
    const response = await chat(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Content safety check error:', error);
  }

  return { safe: true, flags: [] };
}

// Validate aspect ratio for platform
export function validateAspectRatio(
  width: number,
  height: number,
  platform: string
): { valid: boolean; recommendedRatio: string } {
  const ratio = width / height;
  
  const platformRatios: Record<string, { min: number; max: number; recommended: string }[]> = {
    instagram: [
      { min: 0.8, max: 0.8, recommended: '4:5' },
      { min: 1, max: 1, recommended: '1:1' },
      { min: 1.91, max: 1.91, recommended: '1.91:1' },
    ],
    twitter: [
      { min: 1.77, max: 1.78, recommended: '16:9' },
      { min: 1, max: 1, recommended: '1:1' },
    ],
    tiktok: [
      { min: 0.56, max: 0.57, recommended: '9:16' },
    ],
    linkedin: [
      { min: 1, max: 1, recommended: '1:1' },
      { min: 1.77, max: 1.78, recommended: '16:9' },
    ],
  };

  const ratios = platformRatios[platform] || platformRatios.instagram;
  
  for (const r of ratios) {
    if (ratio >= r.min - 0.05 && ratio <= r.max + 0.05) {
      return { valid: true, recommendedRatio: r.recommended };
    }
  }

  return { valid: false, recommendedRatio: ratios[0].recommended };
}
