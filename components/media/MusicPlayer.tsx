'use client';

import { useState, useRef, useEffect } from 'react';
import { GlassCard } from '@/components/nexus/GlassCard';
import { NeonButton } from '@/components/nexus/NeonButton';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Music, 
  Wand2,
  Loader2 
} from 'lucide-react';
import { 
  generateBackgroundMusic, 
  getBrowserMusicGenerator,
  type MusicMood,
  type GeneratedMusic 
} from '@/lib/services/musicEngine';

interface MusicPlayerProps {
  content?: string;
  autoGenerate?: boolean;
  onMoodChange?: (mood: MusicMood) => void;
}

export function MusicPlayer({ content, autoGenerate = false, onMoodChange }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);
  const [currentMusic, setCurrentMusic] = useState<GeneratedMusic | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const browserGeneratorRef = useRef(getBrowserMusicGenerator());

  // Auto-generate when content changes
  useEffect(() => {
    if (autoGenerate && content) {
      handleGenerate();
    }
  }, [content, autoGenerate]);

  // Handle audio element
  useEffect(() => {
    if (currentMusic && currentMusic.source !== 'browser' && currentMusic.url !== 'browser-generated') {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = currentMusic.url;
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.loop = true;
      
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentMusic]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    browserGeneratorRef.current.setVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  const handleGenerate = async () => {
    if (!content) {
      setError('No content to analyze');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Stop current playback
      handleStop();

      const music = await generateBackgroundMusic(content, { duration: 30 });
      
      if (music) {
        setCurrentMusic(music);
        onMoodChange?.(music.mood);
        
        // Auto-play after generation
        if (music.source === 'browser') {
          browserGeneratorRef.current.playAmbient(music.mood);
          setIsPlaying(true);
        } else {
          setIsPlaying(true);
        }
      } else {
        setError('Failed to generate music');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = () => {
    if (!currentMusic) {
      handleGenerate();
      return;
    }

    if (isPlaying) {
      if (currentMusic.source === 'browser') {
        browserGeneratorRef.current.stop();
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      if (currentMusic.source === 'browser') {
        browserGeneratorRef.current.playAmbient(currentMusic.mood);
      } else if (audioRef.current) {
        audioRef.current.play().catch(console.error);
      }
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    browserGeneratorRef.current.stop();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const getMoodColor = (mood: MusicMood['primary']): string => {
    const colors: Record<string, string> = {
      happy: '#FFD700',
      sad: '#6B8DD6',
      energetic: '#FF4500',
      calm: '#00CED1',
      dramatic: '#8B0000',
      mysterious: '#9400D3',
      inspiring: '#00FF7F',
      nostalgic: '#DDA0DD',
    };
    return colors[mood] || '#00F5FF';
  };

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-4">
        {/* Music icon with mood visualization */}
        <div 
          className="relative w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            background: currentMusic 
              ? `radial-gradient(circle, ${getMoodColor(currentMusic.mood.primary)}40, transparent)`
              : 'rgba(0,245,255,0.1)',
          }}
        >
          <Music 
            className={`w-6 h-6 ${isPlaying ? 'animate-pulse' : ''}`}
            style={{ color: currentMusic ? getMoodColor(currentMusic.mood.primary) : '#00F5FF' }}
          />
          {isPlaying && (
            <div 
              className="absolute inset-0 rounded-full animate-ping opacity-30"
              style={{ background: getMoodColor(currentMusic?.mood.primary || 'calm') }}
            />
          )}
        </div>

        {/* Controls */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={handlePlayPause}
              disabled={isGenerating}
              className="w-10 h-10 rounded-full bg-nexus-cyan/20 hover:bg-nexus-cyan/30 flex items-center justify-center transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 text-nexus-cyan animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 text-nexus-cyan" />
              ) : (
                <Play className="w-5 h-5 text-nexus-cyan ml-0.5" />
              )}
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-foreground/60" />
              ) : (
                <Volume2 className="w-4 h-4 text-foreground/60" />
              )}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 accent-nexus-cyan"
            />

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !content}
              className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors disabled:opacity-50"
              title="Regenerate music"
            >
              <RefreshCw className={`w-4 h-4 text-foreground/60 ${isGenerating ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Mood display */}
          {currentMusic && (
            <div className="text-xs text-foreground/60">
              <span 
                className="font-medium capitalize"
                style={{ color: getMoodColor(currentMusic.mood.primary) }}
              >
                {currentMusic.mood.primary}
              </span>
              {currentMusic.mood.secondary && (
                <span> / {currentMusic.mood.secondary}</span>
              )}
              <span className="mx-2">|</span>
              <span>{currentMusic.mood.tempo} tempo</span>
              <span className="mx-2">|</span>
              <span>{currentMusic.mood.genre}</span>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-400 mt-1">{error}</div>
          )}
        </div>

        {/* Generate button when no music */}
        {!currentMusic && !isGenerating && (
          <NeonButton
            onClick={handleGenerate}
            disabled={!content}
            variant="secondary"
            size="sm"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Generate Music
          </NeonButton>
        )}
      </div>
    </GlassCard>
  );
}

// Compact version for embedding in content cards
export function MusicPlayerCompact({ mood }: { mood?: MusicMood }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const browserGeneratorRef = useRef(getBrowserMusicGenerator());

  const handleToggle = () => {
    if (!mood) return;
    
    if (isPlaying) {
      browserGeneratorRef.current.stop();
    } else {
      browserGeneratorRef.current.playAmbient(mood);
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    return () => {
      browserGeneratorRef.current.stop();
    };
  }, []);

  if (!mood) return null;

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-xs"
    >
      <Music className={`w-3 h-3 ${isPlaying ? 'text-nexus-cyan animate-pulse' : 'text-foreground/60'}`} />
      <span className="text-foreground/60 capitalize">{mood.primary}</span>
    </button>
  );
}
