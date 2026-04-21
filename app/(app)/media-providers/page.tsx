'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/nexus/PageHeader';
import { GlassCard } from '@/components/nexus/GlassCard';
import { LoadingPulse } from '@/components/nexus/LoadingPulse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Settings, 
  Volume2, 
  Music, 
  Check, 
  ExternalLink,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { kvGet, kvSet } from '@/lib/services/puterService';

type VoiceProvider = 'web-speech' | 'google' | 'speechify' | 'elevenlabs' | 'azure' | 'piper' | 'coqui';
type MusicProvider = 'musicfy' | 'dadabots' | 'soundraw' | 'jukebox' | 'amper' | 'suno' | 'beatoven' | 'aiva';

interface ProviderConfig {
  id: string;
  name: string;
  provider: VoiceProvider | MusicProvider;
  description: string;
  signupUrl: string;
  keyName: string;
  freeInfo: string;
  requiresKey: boolean;
}

const VOICE_PROVIDERS: ProviderConfig[] = [
  {
    id: 'web-speech',
    name: 'Web Speech API',
    provider: 'web-speech',
    description: 'Built-in browser TTS. Works offline, no setup needed.',
    signupUrl: '',
    keyName: '',
    freeInfo: 'Always free - built into your browser',
    requiresKey: false,
  },
  {
    id: 'piper',
    name: 'Piper TTS',
    provider: 'piper',
    description: 'Open-source neural TTS. High quality, runs locally.',
    signupUrl: 'https://github.com/rhasspy/piper',
    keyName: '',
    freeInfo: '100% free and open source',
    requiresKey: false,
  },
  {
    id: 'coqui',
    name: 'Coqui TTS',
    provider: 'coqui',
    description: 'Open-source deep learning TTS with voice cloning.',
    signupUrl: 'https://coqui.ai',
    keyName: 'coqui_key',
    freeInfo: 'Free tier: unlimited local use',
    requiresKey: false,
  },
  {
    id: 'speechify',
    name: 'Speechify',
    provider: 'speechify',
    description: 'Natural voices with free tier. Good ElevenLabs alternative.',
    signupUrl: 'https://speechify.com/api',
    keyName: 'speechify_key',
    freeInfo: 'Free tier: 10,000 characters/month',
    requiresKey: true,
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    provider: 'elevenlabs',
    description: 'Premium AI voices with excellent quality.',
    signupUrl: 'https://elevenlabs.io',
    keyName: 'elevenlabs_key',
    freeInfo: 'Free tier: 10,000 characters/month',
    requiresKey: true,
  },
  {
    id: 'azure',
    name: 'Azure Speech',
    provider: 'azure',
    description: 'Microsoft neural TTS with 200+ voices.',
    signupUrl: 'https://azure.microsoft.com/en-us/services/cognitive-services/text-to-speech/',
    keyName: 'azure_speech_key',
    freeInfo: 'Free tier: 500,000 characters/month',
    requiresKey: true,
  },
];

const MUSIC_PROVIDERS: ProviderConfig[] = [
  {
    id: 'musicfy',
    name: 'Musicfy',
    provider: 'musicfy',
    description: 'AI music generation with free tier. No key required for basic use.',
    signupUrl: 'https://musicfy.ai',
    keyName: '',
    freeInfo: 'Free tier available - no signup needed for basic',
    requiresKey: false,
  },
  {
    id: 'dadabots',
    name: 'Dadabots',
    provider: 'dadabots',
    description: 'Free AI-generated experimental music. Always streaming.',
    signupUrl: 'https://dadabots.com',
    keyName: '',
    freeInfo: '100% free - no signup required',
    requiresKey: false,
  },
  {
    id: 'beatoven',
    name: 'Beatoven.ai',
    provider: 'beatoven',
    description: 'Royalty-free music for content creators. Good Suno alternative.',
    signupUrl: 'https://www.beatoven.ai',
    keyName: 'beatoven_key',
    freeInfo: 'Free tier: 5 downloads/month',
    requiresKey: true,
  },
  {
    id: 'aiva',
    name: 'AIVA',
    provider: 'aiva',
    description: 'AI composer for emotional soundtracks.',
    signupUrl: 'https://www.aiva.ai',
    keyName: 'aiva_key',
    freeInfo: 'Free tier: 3 downloads/month (non-commercial)',
    requiresKey: true,
  },
  {
    id: 'soundraw',
    name: 'SoundRaw',
    provider: 'soundraw',
    description: 'Customizable AI music generation.',
    signupUrl: 'https://soundraw.io',
    keyName: 'soundraw_key',
    freeInfo: 'Free generation with watermark',
    requiresKey: true,
  },
  {
    id: 'suno',
    name: 'Suno AI',
    provider: 'suno',
    description: 'Premium full-song generation with vocals.',
    signupUrl: 'https://suno.ai',
    keyName: 'suno_key',
    freeInfo: 'Free tier: 50 credits/day',
    requiresKey: true,
  },
];

export default function MediaProvidersPage() {
  const [loading, setLoading] = useState(true);
  const [configuredProviders, setConfiguredProviders] = useState<Set<string>>(new Set());
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<{ provider: string; status: 'saving' | 'saved' | 'error' } | null>(null);

  useEffect(() => {
    loadConfiguredProviders();
  }, []);

  const loadConfiguredProviders = async () => {
    setLoading(true);
    try {
      const configured = new Set<string>();
      
      // Check which providers have keys configured
      const allProviders = [...VOICE_PROVIDERS, ...MUSIC_PROVIDERS];
      for (const provider of allProviders) {
        if (!provider.requiresKey) {
          configured.add(provider.id);
        } else if (provider.keyName) {
          const key = await kvGet(provider.keyName);
          if (key && key.length > 5) {
            configured.add(provider.id);
          }
        }
      }
      
      setConfiguredProviders(configured);
    } catch (err) {
      console.error('Failed to load providers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKey = async (provider: ProviderConfig) => {
    if (!apiKeyInput.trim() || !provider.keyName) return;
    
    setSaveStatus({ provider: provider.id, status: 'saving' });
    
    try {
      await kvSet(provider.keyName, apiKeyInput.trim());
      setConfiguredProviders(prev => new Set([...prev, provider.id]));
      setSaveStatus({ provider: provider.id, status: 'saved' });
      setApiKeyInput('');
      setEditingProvider(null);
      
      // Clear status after 2 seconds
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      console.error('Failed to save key:', err);
      setSaveStatus({ provider: provider.id, status: 'error' });
    }
  };

  const handleSignupAndSave = (provider: ProviderConfig) => {
    // Open signup in new tab
    if (provider.signupUrl) {
      window.open(provider.signupUrl, '_blank');
    }
    // Show the API key input
    setEditingProvider(provider.id);
  };

  const renderProviderCard = (provider: ProviderConfig) => {
    const isConfigured = configuredProviders.has(provider.id);
    const isEditing = editingProvider === provider.id;
    const isSaving = saveStatus?.provider === provider.id && saveStatus.status === 'saving';
    const isSaved = saveStatus?.provider === provider.id && saveStatus.status === 'saved';

    return (
      <GlassCard key={provider.id} className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{provider.name}</h3>
              {isConfigured && (
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{provider.description}</p>
            <p className="text-xs text-primary mt-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {provider.freeInfo}
            </p>
          </div>
        </div>

        {provider.requiresKey && (
          <div className="mt-4 pt-4 border-t border-border">
            {isEditing ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <KeyRound className="w-4 h-4" />
                  <span>Paste your API key after signing up:</span>
                </div>
                <Input
                  type="password"
                  placeholder="Paste API key here"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="bg-background/50"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSaveKey(provider)}
                    disabled={!apiKeyInput.trim() || isSaving}
                    className="flex-1"
                  >
                    {isSaving ? 'Saving...' : isSaved ? 'Saved!' : 'Save Key'}
                    {isSaved && <Check className="w-4 h-4 ml-1" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingProvider(null);
                      setApiKeyInput('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : isConfigured ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-500 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  Configured
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingProvider(provider.id)}
                >
                  Update Key
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSignupAndSave(provider)}
                className="w-full gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Sign up and configure
              </Button>
            )}
          </div>
        )}

        {!provider.requiresKey && (
          <div className="mt-4 pt-4 border-t border-border">
            <span className="text-sm text-green-500 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Ready to use - no setup required
            </span>
          </div>
        )}
      </GlassCard>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <LoadingPulse size="lg" text="Loading media providers..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <PageHeader
        title="Media Providers"
        description="Configure voice and music generation services"
        icon={<Settings className="w-8 h-8" />}
      />

      {/* Quick Info Banner */}
      <GlassCard className="mt-6 p-4 border-primary/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Free Alternatives Available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Web Speech API and Piper TTS are free ElevenLabs alternatives. 
              Musicfy and Dadabots are free Suno AI alternatives. 
              Click &quot;Sign up and configure&quot; to get started - your API keys will be saved automatically.
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Voice Providers */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-cyan-500" />
            Voice Providers
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            ElevenLabs alternatives: Speechify, Piper TTS, Coqui
          </p>
          <div className="space-y-3">
            {VOICE_PROVIDERS.map(renderProviderCard)}
          </div>
        </div>

        {/* Music Providers */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Music className="w-5 h-5 text-violet-500" />
            Music Providers
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Suno AI alternatives: Beatoven.ai, AIVA, Musicfy
          </p>
          <div className="space-y-3">
            {MUSIC_PROVIDERS.map(renderProviderCard)}
          </div>
        </div>
      </div>

      {/* Setup Guide */}
      <GlassCard className="mt-8 p-6">
        <h3 className="text-lg font-bold mb-4">Quick Setup Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-semibold text-cyan-400 mb-2">Voice (ElevenLabs Alternatives)</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Web Speech</strong> - No setup, works instantly</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Speechify</strong> - 10K chars/month free, sign up to get key</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Azure</strong> - 500K chars/month free (best value)</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-violet-400 mb-2">Music (Suno AI Alternatives)</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Musicfy</strong> - Free tier, no signup needed</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Beatoven.ai</strong> - 5 free downloads/month, great for content</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Dadabots</strong> - 100% free, unique experimental music</span>
              </li>
            </ul>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
