// Puter.js Service Wrapper
// All Puter operations go through this service

const PUTER_READY_TIMEOUT = 500; // Ultra-fast - don't block page load

// Wait for Puter to be available
export async function waitForPuter(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  // If already available, return immediately
  if (window.puter) return true;
  
  const start = Date.now();
  
  return new Promise((resolve) => {
    const check = () => {
      if (window.puter) {
        resolve(true);
        return;
      }
      
      if (Date.now() - start >= PUTER_READY_TIMEOUT) {
        console.log('[v0] Puter.js load timeout after', PUTER_READY_TIMEOUT, 'ms');
        resolve(false);
        return;
      }
      
      setTimeout(check, 100);
    };
    
    check();
  });
}

// Check if Puter is available
export function isPuterAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.puter;
}

// Authentication
export async function signIn(): Promise<{ username: string } | null> {
  try {
    const ready = await waitForPuter();
    if (!ready) throw new Error('Puter not available');
    
    const user = await window.puter.auth.signIn();
    return user;
  } catch (error) {
    console.error('Puter signIn error:', error);
    return null;
  }
}

export async function signOut(): Promise<void> {
  try {
    if (!isPuterAvailable()) return;
    await window.puter.auth.signOut();
  } catch (error) {
    console.error('Puter signOut error:', error);
  }
}

export async function getUser(): Promise<{ username: string } | null> {
  try {
    const ready = await waitForPuter();
    if (!ready) return null;
    
    return await window.puter.auth.getUser();
  } catch (error) {
    console.error('Puter getUser error:', error);
    return null;
  }
}

export async function isSignedIn(): Promise<boolean> {
  try {
    const ready = await waitForPuter();
    if (!ready) return false;
    
    return await window.puter.auth.isSignedIn();
  } catch (error) {
    console.error('Puter isSignedIn error:', error);
    return false;
  }
}

// Key-Value Store
export async function kvSet(key: string, value: unknown): Promise<boolean> {
  try {
    if (!isPuterAvailable()) return false;
    
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await window.puter.kv.set(key, stringValue);
    return true;
  } catch (error) {
    console.error('Puter kv.set error:', error);
    return false;
  }
}

export async function kvGet<T = string>(key: string, parse = false): Promise<T | null> {
  try {
    if (!isPuterAvailable()) return null;
    
    const value = await window.puter.kv.get(key);
    if (value === null) return null;
    
    if (parse) {
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    }
    
    return value as unknown as T;
  } catch (error) {
    console.error('Puter kv.get error:', error);
    return null;
  }
}

export async function kvDelete(key: string): Promise<boolean> {
  try {
    if (!isPuterAvailable()) return false;
    await window.puter.kv.del(key);
    return true;
  } catch (error) {
    console.error('Puter kv.del error:', error);
    return false;
  }
}

export async function kvList(): Promise<string[]> {
  try {
    if (!isPuterAvailable()) return [];
    return await window.puter.kv.list();
  } catch (error) {
    console.error('Puter kv.list error:', error);
    return [];
  }
}

// File System
const BASE_PATH = '/NexusAI';

async function ensureDir(path: string): Promise<void> {
  try {
    const exists = await window.puter.fs.exists(path);
    if (!exists) {
      await window.puter.fs.mkdir(path);
    }
  } catch {
    // Directory might already exist or parent doesn't exist
    // Try to create it anyway
    try {
      await window.puter.fs.mkdir(path);
    } catch {
      // Ignore if already exists
    }
  }
}

export async function initFileSystem(): Promise<void> {
  if (!isPuterAvailable()) return;
  
  const dirs = [
    BASE_PATH,
    `${BASE_PATH}/brand`,
    `${BASE_PATH}/content`,
    `${BASE_PATH}/content/drafts`,
    `${BASE_PATH}/content/published`,
    `${BASE_PATH}/content/templates`,
    `${BASE_PATH}/skills`,
    `${BASE_PATH}/analytics`,
    `${BASE_PATH}/system`,
    `${BASE_PATH}/system/chat-history`,
  ];
  
  for (const dir of dirs) {
    await ensureDir(dir);
  }
}

export async function writeFile(path: string, content: unknown): Promise<boolean> {
  if (!isPuterAvailable()) return false;
  
  const fullPath = path.startsWith('/') ? path : `${BASE_PATH}/${path}`;
  const stringContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  
  try {
    // Ensure parent directories exist
    const parentPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
    if (parentPath) {
      await ensureDirectoryPath(parentPath);
    }
    
    await window.puter.fs.write(fullPath, stringContent, { createMissingParents: true });
    return true;
  } catch (error: unknown) {
    // Silently handle expected errors during first write
    const errorStr = String(error);
    if (errorStr.includes('404') || errorStr.includes('not found') || errorStr.includes('subject_does_not_exist')) {
      // Try again after creating base path
      try {
        await initFileSystem();
        await window.puter.fs.write(fullPath, stringContent, { createMissingParents: true });
        return true;
      } catch {
        // Still failed - this is okay for new users, files will be created on next save
        return false;
      }
    }
    // Only log unexpected errors
    console.error('Puter fs.write error:', error);
    return false;
  }
}

export async function saveFile(path: string, content: unknown): Promise<boolean> {
  return writeFile(path, content);
}

// Recursively ensure all directories in a path exist
async function ensureDirectoryPath(path: string): Promise<void> {
  if (!isPuterAvailable() || !path || path === '/') return;
  
  const parts = path.split('/').filter(Boolean);
  let currentPath = '';
  
  for (const part of parts) {
    currentPath += '/' + part;
    await ensureDir(currentPath);
  }
}

export async function readFile<T = string>(path: string, parse = false): Promise<T | null> {
  try {
    if (!isPuterAvailable()) return null;
    
    const fullPath = path.startsWith('/') ? path : `${BASE_PATH}/${path}`;
    const blob = await window.puter.fs.read(fullPath);
    const text = await blob.text();
    
    if (parse) {
      try {
        return JSON.parse(text) as T;
      } catch {
        return text as unknown as T;
      }
    }
    
    return text as unknown as T;
  } catch (error: unknown) {
    // File doesn't exist is a normal case for new users - don't log these
    const errorStr = String(error);
    const errorObj = error as { code?: string };
    if (
      errorStr.includes('not found') || 
      errorStr.includes('ENOENT') ||
      errorStr.includes('subject_does_not_exist') ||
      errorObj?.code === 'subject_does_not_exist'
    ) {
      return null;
    }
    console.error('Puter fs.read error:', error);
    return null;
  }
}

export async function deleteFile(path: string): Promise<boolean> {
  try {
    if (!isPuterAvailable()) return false;
    
    const fullPath = path.startsWith('/') ? path : `${BASE_PATH}/${path}`;
    await window.puter.fs.delete(fullPath);
    return true;
  } catch (error) {
    console.error('Puter fs.delete error:', error);
    return false;
  }
}

export async function listFiles(path: string): Promise<{ name: string; is_dir: boolean }[]> {
  try {
    if (!isPuterAvailable()) return [];
    
    const fullPath = path.startsWith('/') ? path : `${BASE_PATH}/${path}`;
    return await window.puter.fs.readdir(fullPath);
  } catch (error: unknown) {
    // Directory not existing is expected for new users - only log if it's a different error
    const errorObj = error as { code?: string };
    if (errorObj?.code !== 'subject_does_not_exist') {
      console.error('Puter fs.readdir error:', error);
    }
    return [];
  }
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    if (!isPuterAvailable()) return false;
    
    const fullPath = path.startsWith('/') ? path : `${BASE_PATH}/${path}`;
    return await window.puter.fs.exists(fullPath);
  } catch (error) {
    console.error('Puter fs.exists error:', error);
    return false;
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Convenience paths
export const PATHS = {
  base: BASE_PATH,
  brandKit: `${BASE_PATH}/brand/brandkit.json`,
  voice: `${BASE_PATH}/brand/voice.json`,
  niche: `${BASE_PATH}/brand/niche.json`,
  drafts: `${BASE_PATH}/content/drafts`,
  published: `${BASE_PATH}/content/published`,
  templates: `${BASE_PATH}/content/templates`,
  skills: `${BASE_PATH}/skills`,
  analytics: `${BASE_PATH}/analytics`,
  chatHistory: `${BASE_PATH}/system/chat-history`,
  schedule: `${BASE_PATH}/system/schedule.json`,
  settings: `${BASE_PATH}/system/settings`,
  system: `${BASE_PATH}/system`,
};

export const puterService = {
  waitForPuter,
  isPuterAvailable,
  signIn,
  signOut,
  getUser,
  isSignedIn,
  kvSet,
  kvGet,
  kvDelete,
  kvList,
  initFileSystem,
  writeFile,
  saveFile,
  readFile,
  deleteFile,
  listFiles,
  fileExists,
  generateId,
  PATHS,
};
