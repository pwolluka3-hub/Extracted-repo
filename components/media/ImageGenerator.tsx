'use client';

import { useState } from 'react';
import { generateImage as generateAIImage } from '@/lib/services/aiService';
import { GlassCard } from '@/components/nexus/GlassCard';
import { NeonButton } from '@/components/nexus/NeonButton';
import { LoadingPulse } from '@/components/nexus/LoadingPulse';

interface ImageGeneratorProps {
  prompt: string;
  onGenerate?: (imageUrl: string) => void;
}

export default function ImageGenerator({ prompt, onGenerate }: ImageGeneratorProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const generateImage = async () => {
    if (!prompt) {
      setError('Please provide a prompt');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const url = await generateAIImage(prompt);
      setImageUrl(url);
      setRetryCount(0);
      onGenerate?.(url);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate image';
      setError(errorMsg);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (retryCount < 3) {
      generateImage();
    }
  };

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Image Generation</h3>

      {imageUrl && (
        <div className="mb-6">
          <img
            src={imageUrl}
            alt="Generated"
            className="w-full rounded-lg border border-border mb-4"
          />
          <a
            href={imageUrl}
            download="generated-image.png"
            className="w-full px-4 py-2 bg-cyan/20 text-cyan border border-cyan/50 rounded-lg hover:bg-cyan/30 transition-colors text-center block font-semibold"
          >
            Download Image
          </a>
        </div>
      )}

      <button
        onClick={generateImage}
        disabled={loading}
        className="w-full px-4 py-2 bg-cyan/20 text-cyan border border-cyan/50 rounded-lg hover:bg-cyan/30 disabled:opacity-50 transition-colors font-semibold"
      >
        {loading ? 'Generating...' : 'Generate Image'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-error/10 border border-error/50 rounded-lg">
          <p className="text-error text-sm">{error}</p>
          {retryCount < 3 && (
            <button
              onClick={handleRetry}
              className="mt-2 text-error text-sm font-semibold hover:underline"
            >
              Retry ({retryCount}/3)
            </button>
          )}
        </div>
      )}
    </GlassCard>
  );
}
