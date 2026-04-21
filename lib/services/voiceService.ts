// Voice Service - ElevenLabs + Web Speech API fallback
import { kvGet } from './puterService';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

// ElevenLabs voice IDs (popular voices)
export const ELEVENLABS_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'American, warm' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'American, strong' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'American, soft' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'American, well-rounded' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', description: 'American, clear' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'American, deep' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'American, crisp' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'American, deep' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', description: 'American, raspy' },
];

// Check if ElevenLabs is configured
export async function isElevenLabsConfigured(): Promise<boolean> {
  const key = await kvGet('elevenlabs_key');
  return !!key && key.length > 10;
}

// Get available voices
export async function getAvailableVoices(): Promise<Array<{ id: string; name: string; description: string }>> {
  const hasElevenlabs = await isElevenLabsConfigured();
  
  if (hasElevenlabs) {
    try {
      const key = await kvGet('elevenlabs_key');
      const response = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
        headers: { 'xi-api-key': key! },
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.voices.map((v: { voice_id: string; name: string; labels?: { description?: string } }) => ({
          id: v.voice_id,
          name: v.name,
          description: v.labels?.description || 'Custom voice',
        }));
      }
    } catch {
      // Fall through to defaults
    }
    return ELEVENLABS_VOICES;
  }
  
  // Web Speech API voices
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return new Promise(resolve => {
      const getVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          resolve(
            voices.slice(0, 10).map(v => ({
              id: v.name,
              name: v.name,
              description: v.lang,
            }))
          );
        }
      };
      
      getVoices();
      window.speechSynthesis.onvoiceschanged = getVoices;
      
      // Timeout fallback
      setTimeout(() => resolve([{ id: 'default', name: 'System Default', description: 'Browser default voice' }]), 1000);
    });
  }
  
  return [{ id: 'default', name: 'System Default', description: 'Browser default voice' }];
}

// Generate speech with ElevenLabs
async function generateElevenLabsSpeech(
  text: string,
  options: {
    voiceId?: string;
    stability?: number;
    similarityBoost?: number;
  } = {}
): Promise<Blob> {
  const key = await kvGet('elevenlabs_key');
  if (!key) {
    throw new Error('ElevenLabs API key not configured');
  }

  const { voiceId = '21m00Tcm4TlvDq8ikWAM', stability = 0.5, similarityBoost = 0.75 } = options;

  // Process text for better speech (handle markers)
  const processedText = text
    .replace(/\[pause\]/gi, '...')
    .replace(/\[emphasis\]/gi, '')
    .trim();

  const response = await fetch(`${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: processedText,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${error}`);
  }

  return response.blob();
}

// Generate speech with Web Speech API
function generateWebSpeechSynthesis(
  text: string,
  options: {
    voiceId?: string;
    rate?: number;
    pitch?: number;
  } = {}
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      reject(new Error('Web Speech API not supported'));
      return;
    }

    const { voiceId, rate = 1, pitch = 1 } = options;

    // Process text for better speech
    const processedText = text
      .replace(/\[pause\]/gi, ', ')
      .replace(/\[emphasis\]/gi, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(processedText);
    utterance.rate = rate;
    utterance.pitch = pitch;

    // Set voice if specified
    if (voiceId) {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.name === voiceId);
      if (voice) {
        utterance.voice = voice;
      }
    }

    // For Web Speech, we can't easily get a blob
    // We'll use MediaRecorder to capture audio output
    // This is a fallback that plays the speech directly
    
    // Create a simple audio context to generate silence as placeholder
    // In a real implementation, you'd use AudioContext + MediaRecorder
    try {
      const audioContext = new AudioContext();
      const sampleRate = audioContext.sampleRate;
      const duration = processedText.length * 0.06; // Rough estimate
      const numSamples = Math.ceil(sampleRate * duration);
      const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
      
      // Create a WAV blob (silent - actual audio plays via speechSynthesis)
      const wavBlob = createWavBlob(buffer);
      
      // Play the speech
      window.speechSynthesis.speak(utterance);
      
      utterance.onend = () => resolve(wavBlob);
      utterance.onerror = (e) => reject(new Error(`Speech synthesis error: ${e.error}`));
    } catch (error) {
      reject(error);
    }
  });
}

// Helper to create WAV blob from AudioBuffer
function createWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const samples = buffer.getChannelData(0);
  const dataLength = samples.length * bytesPerSample;
  const bufferLength = 44 + dataLength;
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, bufferLength - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  // Write samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Main text-to-speech function with automatic fallback
export async function textToSpeech(
  text: string,
  options: {
    voiceId?: string;
    rate?: number;
    pitch?: number;
    stability?: number;
    similarityBoost?: number;
    preferElevenlabs?: boolean;
  } = {}
): Promise<{ blob: Blob; provider: 'elevenlabs' | 'webspeech' }> {
  const { preferElevenlabs = true, ...restOptions } = options;
  
  // Try ElevenLabs first if configured and preferred
  if (preferElevenlabs) {
    const hasElevenlabs = await isElevenLabsConfigured();
    if (hasElevenlabs) {
      try {
        const blob = await generateElevenLabsSpeech(text, restOptions);
        return { blob, provider: 'elevenlabs' };
      } catch (error) {
        console.warn('ElevenLabs failed, falling back to Web Speech:', error);
      }
    }
  }
  
  // Fall back to Web Speech API
  const blob = await generateWebSpeechSynthesis(text, restOptions);
  return { blob, provider: 'webspeech' };
}

export async function synthesizeVoice(
  text: string,
  options: {
    voiceId?: string;
    rate?: number;
    pitch?: number;
    stability?: number;
    similarityBoost?: number;
    preferElevenlabs?: boolean;
  } = {}
): Promise<string> {
  const { blob } = await textToSpeech(text, options);
  return URL.createObjectURL(blob);
}

// Preview speech (plays directly without returning blob)
export function previewSpeech(
  text: string,
  options: {
    voiceId?: string;
    rate?: number;
    pitch?: number;
  } = {}
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech synthesis not available');
    return;
  }

  const { voiceId, rate = 1, pitch = 1 } = options;
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  const processedText = text
    .replace(/\[pause\]/gi, ', ')
    .replace(/\[emphasis\]/gi, '')
    .trim();

  const utterance = new SpeechSynthesisUtterance(processedText);
  utterance.rate = rate;
  utterance.pitch = pitch;

  if (voiceId && voiceId !== 'default') {
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.name === voiceId);
    if (voice) {
      utterance.voice = voice;
    }
  }

  window.speechSynthesis.speak(utterance);
}

// Stop speech preview
export function stopSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
