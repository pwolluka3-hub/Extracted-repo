// Memory Service - Persistent storage for brand kit, drafts, settings
import type { BrandKit, ContentDraft, ScheduledPost, AppSettings, ChatMessage } from '@/lib/types';
export type { BrandKit } from '@/lib/types';
import { readFile, writeFile, listFiles, deleteFile, PATHS, initFileSystem, kvGet, kvSet } from './puterService';

// Initialize memory system
export async function initMemory(): Promise<void> {
  await initFileSystem();
}

// Brand Kit
export async function saveBrandKit(brandKit: BrandKit): Promise<boolean> {
  return writeFile(PATHS.brandKit, brandKit);
}

export async function loadBrandKit(): Promise<BrandKit | null> {
  return readFile<BrandKit>(PATHS.brandKit, true);
}

// Content Drafts
export async function saveDraft(draft: ContentDraft): Promise<boolean> {
  const path = `${PATHS.drafts}/${draft.id}.json`;
  return writeFile(path, draft);
}

export async function loadDraft(id: string): Promise<ContentDraft | null> {
  const path = `${PATHS.drafts}/${id}.json`;
  return readFile<ContentDraft>(path, true);
}

export async function deleteDraft(id: string): Promise<boolean> {
  const path = `${PATHS.drafts}/${id}.json`;
  return deleteFile(path);
}

export async function listDrafts(): Promise<ContentDraft[]> {
  const files = await listFiles(PATHS.drafts);
  const drafts: ContentDraft[] = [];
  
  for (const file of files) {
    if (file.name.endsWith('.json') && !file.is_dir) {
      const draft = await readFile<ContentDraft>(`${PATHS.drafts}/${file.name}`, true);
      if (draft) {
        drafts.push(draft);
      }
    }
  }
  
  // Sort by updated date descending
  return drafts.sort((a, b) => 
    new Date(b.updated).getTime() - new Date(a.updated).getTime()
  );
}

// Published Content
export async function savePublishedContent(draft: ContentDraft): Promise<boolean> {
  const path = `${PATHS.published}/${draft.id}.json`;
  return writeFile(path, draft);
}

export async function listPublishedContent(): Promise<ContentDraft[]> {
  const files = await listFiles(PATHS.published);
  const published: ContentDraft[] = [];
  
  for (const file of files) {
    if (file.name.endsWith('.json') && !file.is_dir) {
      const content = await readFile<ContentDraft>(`${PATHS.published}/${file.name}`, true);
      if (content) {
        published.push(content);
      }
    }
  }
  
  return published.sort((a, b) => 
    new Date(b.publishedAt || b.updated).getTime() - new Date(a.publishedAt || a.updated).getTime()
  );
}

// Schedule
export async function saveSchedule(posts: ScheduledPost[]): Promise<boolean> {
  return writeFile(PATHS.schedule, posts);
}

export async function loadSchedule(): Promise<ScheduledPost[]> {
  const schedule = await readFile<ScheduledPost[]>(PATHS.schedule, true);
  return schedule || [];
}

export async function addToSchedule(post: ScheduledPost): Promise<boolean> {
  const schedule = await loadSchedule();
  schedule.push(post);
  return saveSchedule(schedule);
}

export async function updateScheduledPost(id: string, updates: Partial<ScheduledPost>): Promise<boolean> {
  const schedule = await loadSchedule();
  const index = schedule.findIndex(p => p.id === id);
  
  if (index === -1) return false;
  
  schedule[index] = { ...schedule[index], ...updates };
  return saveSchedule(schedule);
}

export async function removeFromSchedule(id: string): Promise<boolean> {
  const schedule = await loadSchedule();
  const filtered = schedule.filter(p => p.id !== id);
  return saveSchedule(filtered);
}

// App Settings
const DEFAULT_SETTINGS: AppSettings = {
  defaultModel: 'gpt-4o',
  defaultPlatforms: ['twitter', 'instagram'],
  autoSaveDrafts: true,
  notificationsEnabled: true,
  theme: 'dark',
};

export async function saveSettings(settings: AppSettings): Promise<boolean> {
  return writeFile(PATHS.settings, settings);
}

export async function loadSettings(): Promise<AppSettings> {
  const settings = await readFile<AppSettings>(PATHS.settings, true);
  return settings || DEFAULT_SETTINGS;
}

// Chat History
const MAX_CHAT_HISTORY = 100;

export async function saveChatMessage(message: ChatMessage): Promise<boolean> {
  const historyPath = `${PATHS.chatHistory}/messages.json`;
  const messages = await readFile<ChatMessage[]>(historyPath, true) || [];
  
  messages.push(message);
  
  // Keep only last MAX_CHAT_HISTORY messages
  const trimmed = messages.slice(-MAX_CHAT_HISTORY);
  
  return writeFile(historyPath, trimmed);
}

export async function loadChatHistory(): Promise<ChatMessage[]> {
  const historyPath = `${PATHS.chatHistory}/messages.json`;
  const messages = await readFile<ChatMessage[]>(historyPath, true);
  return messages || [];
}

export async function clearChatHistory(): Promise<boolean> {
  const historyPath = `${PATHS.chatHistory}/messages.json`;
  return writeFile(historyPath, []);
}

// Onboarding state
export async function isOnboardingComplete(): Promise<boolean> {
  const complete = await kvGet('onboarding_complete');
  return complete === 'true';
}

export async function setOnboardingComplete(complete: boolean): Promise<boolean> {
  return kvSet('onboarding_complete', complete.toString());
}

// Recent topics (for avoiding repetition)
export async function getRecentTopics(limit = 10): Promise<string[]> {
  const published = await listPublishedContent();
  const drafts = await listDrafts();
  
  const all = [...published, ...drafts]
    .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
    .slice(0, limit);
  
  // Extract topics from content (first 50 chars as summary)
  return all
    .map(item => {
      const latestVersion = item.versions[item.versions.length - 1];
      return latestVersion?.text?.substring(0, 50) || '';
    })
    .filter(Boolean);
}

// Skills
export async function saveSkill(name: string, data: unknown): Promise<boolean> {
  const path = `${PATHS.skills}/${name}.json`;
  return writeFile(path, data);
}

export async function loadSkill<T = unknown>(name: string): Promise<T | null> {
  const path = `${PATHS.skills}/${name}.json`;
  return readFile<T>(path, true);
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
