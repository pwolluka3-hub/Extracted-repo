import type { PlatformConfig, Platform } from '@/lib/types';

export const PLATFORMS: Record<Platform, PlatformConfig> = {
  twitter: {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: 'twitter',
    maxLength: 280,
    supportsImages: true,
    supportsVideo: true,
    aspectRatios: ['16:9', '1:1'],
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    maxLength: 2200,
    supportsImages: true,
    supportsVideo: true,
    aspectRatios: ['1:1', '4:5', '9:16'],
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'tiktok',
    maxLength: 2200,
    supportsImages: false,
    supportsVideo: true,
    aspectRatios: ['9:16'],
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'linkedin',
    maxLength: 3000,
    supportsImages: true,
    supportsVideo: true,
    aspectRatios: ['1:1', '16:9', '1.91:1'],
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    maxLength: 63206,
    supportsImages: true,
    supportsVideo: true,
    aspectRatios: ['16:9', '1:1', '4:5'],
  },
  threads: {
    id: 'threads',
    name: 'Threads',
    icon: 'threads',
    maxLength: 500,
    supportsImages: true,
    supportsVideo: true,
    aspectRatios: ['1:1', '4:5'],
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    icon: 'youtube',
    maxLength: 5000,
    supportsImages: false,
    supportsVideo: true,
    aspectRatios: ['16:9', '9:16'],
  },
  pinterest: {
    id: 'pinterest',
    name: 'Pinterest',
    icon: 'pinterest',
    maxLength: 500,
    supportsImages: true,
    supportsVideo: true,
    aspectRatios: ['2:3', '1:1'],
  },
};

export const PLATFORM_LIST = Object.values(PLATFORMS);

export const DEFAULT_POSTING_TIMES: Record<Platform, string[]> = {
  twitter: ['09:00', '13:00', '18:00'],
  instagram: ['11:00', '14:00', '19:00'],
  tiktok: ['07:00', '15:00', '21:00'],
  linkedin: ['08:00', '12:00', '17:00'],
  facebook: ['09:00', '13:00', '16:00'],
  threads: ['10:00', '14:00', '20:00'],
  youtube: ['14:00', '17:00'],
  pinterest: ['20:00', '21:00'],
};
