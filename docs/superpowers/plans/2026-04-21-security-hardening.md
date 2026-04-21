# NexusAI Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all HIGH and MEDIUM security vulnerabilities identified in the NexusAI codebase audit — axios SSRF CVE, approvals auth bypass, missing .env.example, insecure cookie flags, CSP hardening, and hardcoded API URLs.

**Architecture:** Client-side Next.js 16 app using Puter.js as backend. All AI provider calls originate from the browser, so NEXT_PUBLIC_ env vars are appropriate for API URLs. The approach is to fix each vulnerability in dependency order — starting with the one-line axios upgrade, then the approvals auth bypass, then .env.example, then cookie hardening, then CSP, then hardcoded URLs across service files.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, pnpm, axios, Tailwind CSS 4

---

## Task Map

| # | Task | Files |
|---|------|-------|
| 1 | Upgrade axios to fix CVE-2024-39338 | package.json |
| 2 | Fix approvals auth bypass | app/(app)/approvals/page.tsx |
| 3 | Create .env.example | .env.example (new) |
| 4 | Harden sidebar cookie with HttpOnly/Secure/SameSite | components/ui/sidebar.tsx |
| 5 | Harden CSP in next.config.mjs | next.config.mjs |
| 6 | Move hardcoded API URLs to NEXT_PUBLIC_ env vars | 10+ service files |
| 7 | Create env var constants module | lib/constants/api.ts (new) |

---

## Pre-flight: Verify TypeScript is clean before starting

- [ ] Run: node node_modules/typescript/bin/tsc --noEmit
     Expected: zero errors

---

## Task 1: Upgrade axios to fix CVE-2024-39338

**Files:**
- Modify: package.json:44

CVE-2024-39338 allows an attacker to craft redirects that bypass security checks using absolute URLs. Axios >= 1.7.4 fixes this. Current version is ^1.6.0 which is vulnerable.

- [ ] **Step 1: Update axios version in package.json**

Change line 44 from:
  "axios": "^1.6.0",
to:
  "axios": "^1.7.4",

- [ ] **Step 2: Commit**

  git add package.json
  git commit -m "fix: upgrade axios to ^1.7.4 (CVE-2024-39338)"

---

## Task 2: Fix approvals auth bypass

**Files:**
- Modify: app/(app)/approvals/page.tsx (around lines 55-67)

The handleApprove and handleReject functions fall back to the string 'admin' when user?.username is falsy. Any authenticated Puter.js user can approve/reject content. Fix: throw if username is missing.

- [ ] **Step 1: Read the approvals page**

Locate handleApprove and handleReject functions.

- [ ] **Step 2: Add guard clause to both functions**

  const username = user?.username
  if (!username) {
    throw new Error('Unauthorized: no username found')
  }

Remove all '|| 'admin'' fallbacks and replace with the guarded username variable.

- [ ] **Step 3: Verify TypeScript**

  node node_modules/typescript/bin/tsc --noEmit

- [ ] **Step 4: Commit**

  git add "app/(app)/approvals/page.tsx"
  git commit -m "fix: block approvals when user is unauthenticated"

---

## Task 3: Create .env.example

**Files:**
- Create: .env.example

Based on docs/DEPLOYMENT.md, all provider keys are optional and entered via the Settings UI. Document them so deployers know what is available.

- [ ] **Write .env.example**

NEXT_PUBLIC_GROQ_API_KEY=
NEXT_PUBLIC_OPENROUTER_API_KEY=
NEXT_PUBLIC_NVIDIA_API_KEY=
NEXT_PUBLIC_GEMINI_API_KEY=
NEXT_PUBLIC_TOGETHER_API_KEY=
NEXT_PUBLIC_FIREWORKS_API_KEY=
NEXT_PUBLIC_DEEPSEEK_API_KEY=
NEXT_PUBLIC_OLLAMA_URL=

NEXT_PUBLIC_STABILITY_API_KEY=
NEXT_PUBLIC_LEONARDO_API_KEY=
NEXT_PUBLIC_IDEOGRAM_API_KEY=

NEXT_PUBLIC_ELEVENLABS_API_KEY=
NEXT_PUBLIC_SPEECHIFY_API_KEY=
NEXT_PUBLIC_PLAYHT_API_KEY=
NEXT_PUBLIC_RESEMBLE_API_KEY=

NEXT_PUBLIC_SUNO_API_KEY=
NEXT_PUBLIC_UDIO_API_KEY=
NEXT_PUBLIC_BEATOVEN_API_KEY=
NEXT_PUBLIC_SOUNDRAW_API_KEY=

NEXT_PUBLIC_AYRSHARE_API_KEY=

NEXT_PUBLIC_GROQ_URL=https://api.groq.com
NEXT_PUBLIC_OPENROUTER_URL=https://openrouter.ai
NEXT_PUBLIC_OLLAMA_URL=http://localhost:11434

- [ ] **Commit**

  git add .env.example
  git commit -m "docs: add .env.example with all provider keys"

---

## Task 4: Harden sidebar cookie flags

**Files:**
- Modify: components/ui/sidebar.tsx (around line 86)

Current cookie sets no security flags. Add HttpOnly, Secure, SameSite=Lax.

- [ ] **Step 1: Read sidebar.tsx around line 86**

Confirm the exact document.cookie line and cookie name constant.

- [ ] **Step 2: Update cookie string**

Change from:
  document.cookie = SIDEBAR_COOKIE_NAME + "=" + openState + "; path=/; max-age=" + SIDEBAR_COOKIE_MAX_AGE

To (with conditional Secure flag for HTTP local dev):
  const cookieFlags = typeof window !== 'undefined' && window.location.protocol === 'https:'
    ? '; Secure; SameSite=Lax'
    : '; SameSite=Lax'
  document.cookie = SIDEBAR_COOKIE_NAME + "=" + openState + "; path=/; max-age=" + SIDEBAR_COOKIE_MAX_AGE + "; HttpOnly" + cookieFlags

- [ ] **Step 3: Verify TypeScript**

  node node_modules/typescript/bin/tsc --noEmit

- [ ] **Step 4: Commit**

  git add components/ui/sidebar.tsx
  git commit -m "fix: add HttpOnly, Secure, SameSite=Lax to sidebar cookie"

---

## Task 5: Harden CSP in next.config.mjs

**Files:**
- Modify: next.config.mjs (headers section, around lines 30-42)

Current CSP problems:
- unsafe-eval in script-src allows eval-based XSS
- unsafe-inline in script-src weakens XSS protection
- Broad data: and blob: in script-src enables data URI attacks
- default-src also has unsafe-inline/unsafe-eval

Hardened CSP:
  default-src 'self';
  script-src 'self' 'unsafe-inline' blob: https://js.puter.com;
  connect-src 'self' https: ws: wss: blob:;
  style-src 'self' https: 'unsafe-inline';
  worker-src 'self' blob:;
  img-src 'self' data: blob: https:;
  font-src 'self' data:;

unsafe-inline for scripts is retained because Next.js inlines runtime code. To remove it requires nonce-based CSP which requires Next.js config changes.

- [ ] **Step 1: Read next.config.mjs**

Locate the Content-Security-Policy header value.

- [ ] **Step 2: Replace CSP header value**

Keep the existing source/headers structure, replace only the header value string.

- [ ] **Step 3: Commit**

  git add next.config.mjs
  git commit -m "fix: harden CSP — remove unsafe-eval, restrict data/blob URIs"

---

## Task 6: Move hardcoded API URLs to env var constants

**Files (create/modify):**
- Create: lib/constants/api.ts
- Modify: lib/services/aiService.ts
- Modify: lib/services/voiceService.ts
- Modify: lib/services/voiceGenerationService.ts
- Modify: lib/services/musicGenerationService.ts
- Modify: lib/services/imageGenerationService.ts
- Modify: lib/services/publishService.ts
- Modify: lib/services/diagnosticsService.ts

**Strategy:** Single lib/constants/api.ts exports URL constants from NEXT_PUBLIC_ vars with defaults. Each service imports from it instead of hardcoding strings.

- [ ] **Step 1: Create lib/constants/api.ts**

  // AI Provider URLs
  export const GROQ_URL = process.env.NEXT_PUBLIC_GROQ_URL || 'https://api.groq.com'
  export const OPENROUTER_URL = process.env.NEXT_PUBLIC_OPENROUTER_URL || 'https://openrouter.ai'
  export const NVIDIA_URL = process.env.NEXT_PUBLIC_NVIDIA_URL || 'https://integrate.api.nvidia.com'
  export const TOGETHER_URL = process.env.NEXT_PUBLIC_TOGETHER_URL || 'https://api.together.xyz'
  export const FIREWORKS_URL = process.env.NEXT_PUBLIC_FIREWORKS_URL || 'https://api.fireworks.ai'
  export const DEEPSEEK_URL = process.env.NEXT_PUBLIC_DEEPSEEK_URL || 'https://api.deepseek.com'
  export const OLLAMA_URL = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434'

  // Image Generation URLs
  export const STABILITY_URL = process.env.NEXT_PUBLIC_STABILITY_URL || 'https://api.stability.ai'
  export const LEONARDO_URL = process.env.NEXT_PUBLIC_LEONARDO_URL || 'https://api.leonardo.ai'
  export const IDEOGRAM_URL = process.env.NEXT_PUBLIC_IDEOGRAM_URL || 'https://api.ideogram.ai'

  // Voice URLs
  export const ELEVENLABS_URL = process.env.NEXT_PUBLIC_ELEVENLABS_URL || 'https://api.elevenlabs.io'
  export const SPEECHIFY_URL = process.env.NEXT_PUBLIC_SPEECHIFY_URL || 'https://api.speechify.com'
  export const PLAYHT_URL = process.env.NEXT_PUBLIC_PLAYHT_URL || 'https://api.play.ht'
  export const RESEMBLE_URL = process.env.NEXT_PUBLIC_RESEMBLE_URL || 'https://api.resemble.ai'

  // Music URLs
  export const SUNO_URL = process.env.NEXT_PUBLIC_SUNO_URL || 'https://api.suno.ai'
  export const UDIO_URL = process.env.NEXT_PUBLIC_UDIO_URL || 'https://api.udio.ai'
  export const BEATOVEN_URL = process.env.NEXT_PUBLIC_BEATOVEN_URL || 'https://api.beatoven.ai'
  export const SOUNDRAW_URL = process.env.NEXT_PUBLIC_SOUNDRAW_URL || 'https://api.soundraw.io'

  // Publishing URLs
  export const AYRSHARE_URL = process.env.NEXT_PUBLIC_AYRSHARE_URL || 'https://app.ayrshare.com/api'

- [ ] **Step 2: Update aiService.ts**

Find all hardcoded base URLs and replace with imports from api.ts.
Pattern: import { GROQ_URL } from '@/lib/constants/api'
Then: axios.post(GROQ_URL + '/v1/chat/completions', ...)

- [ ] **Step 3: Update remaining service files**

Repeat for voiceService.ts, voiceGenerationService.ts, musicGenerationService.ts, imageGenerationService.ts, publishService.ts, diagnosticsService.ts.

- [ ] **Step 4: Verify TypeScript**

  node node_modules/typescript/bin/tsc --noEmit

- [ ] **Step 5: Commit**

  git add lib/constants/api.ts
  git add lib/services/aiService.ts lib/services/voiceService.ts lib/services/voiceGenerationService.ts lib/services/musicGenerationService.ts lib/services/imageGenerationService.ts lib/services/publishService.ts lib/services/diagnosticsService.ts
  git commit -m "feat: centralize all AI provider URLs in lib/constants/api.ts"

---

## Task 7: Final TypeScript verification

- [ ] Run: node node_modules/typescript/bin/tsc --noEmit
     Expected: zero errors

---

## Post-Implementation Notes

- The dangerouslySetInnerHTML in components/ui/chart.tsx:83 was audited and is NOT exploitable. The id is a React-generated unique ID and color values come from a developer-defined static ChartConfig object, not user-controlled input.
- The axios SSRF fix in Task 1 is the only dependency upgrade required for security.
- Hardcoded API keys are not in the codebase — they are entered through the Settings UI and stored in Puter KV, which is the correct pattern.
- SWR 2.4.1 to 2.5+ upgrade is available but out of scope (not a security fix).
