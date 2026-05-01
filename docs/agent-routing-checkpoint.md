# Agent Routing Checkpoint

Date: 2026-04-30
Workspace: `/data/data/com.termux/files/home/extracted_project`

## User Goal

Make the app route all creative work correctly through the agent system:

- Text/content generation
- Image generation
- Video generation
- Voice/audio generation
- Music generation
- Sound design and final mix
- Queue, scheduler, platform adapter, upload worker, monitoring, analytics, and optimization

The requested architecture is a universal multi-agent content engine that behaves like a creative director and production system, not a basic chatbot.

## Current Implementation State

- Added `make_audio` and `make_music` media intents.
- Routed ElevenLabs-style audio requests directly to voice generation without Puter side effects.
- Routed music/soundtrack requests through `generateBackgroundMusic()`.
- Prevented music mood analysis from calling Puter chat sidecars.
- Made direct brand-intro/promo/commercial video requests use the full universal production pipeline when they imply voice, music, final mix, or full production.
- Added media attachments for universal pipeline outputs so generated image/video/audio assets are returned in chat.
- Updated the assistant system prompt with the natural conversational layer and internal multi-agent build order.
- Hardened LTX video provider order so production does not try unreachable localhost open endpoints.
- Tightened Puter storage/FS calls so Puter does not pop up unless a cached Puter session exists.
- Changed God Mode defaults away from hard Puter calls and routed through `universalChat(... avoidPuter: true)`.
- Added explicit upload-worker cycle functions:
  - `selectNextQueuedPostJob()`
  - `validateQueuedPostJob()`
  - `routeQueuedJobToAdapters()`
  - `uploadAdaptedJob()`
  - `storeUploadResult()`
- Added worker validation for empty text, unsupported platforms, max attempts, invalid schedules, and non-public media URLs.
- Added platform adapter routing before upload.
- Added analytics update after successful upload.
- Updated monitor/retry to run engagement analytics sync after upload worker processing.

## Files Changed

- `app/(app)/media-providers/page.tsx`
- `app/(app)/settings/page.tsx`
- `lib/constants/prompts.ts`
- `lib/context/AgentContext.tsx`
- `lib/context/agentBehavior.mjs`
- `lib/services/agentMediaService.ts`
- `lib/services/godModeEngine.ts`
- `lib/services/monitorRetryService.ts`
- `lib/services/musicEngine.ts`
- `lib/services/puterService.ts`
- `lib/services/uploadWorkerPrimitives.mjs`
- `lib/services/uploadWorkerService.ts`
- `lib/services/videoGenerationService.ts`
- `lib/types/index.ts`
- `package.json`
- `tests/agent-behavior.test.mjs`
- `tests/upload-worker.test.mjs`
- `tests/video-generation.test.mjs`

## Verification Completed

Passed:

- `pnpm run test:agent`
- `pnpm run test:video-generation`
- `pnpm run test:puter-service`
- `pnpm test` before later worker-cycle additions
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm build` before later worker-cycle additions
- `pnpm run test:upload-worker`

Latest after worker-cycle additions:

- `pnpm run test:agent` passed
- `pnpm run test:upload-worker` passed
- `pnpm exec tsc --noEmit` passed
- `pnpm lint` passed

## Still Needed Before Commit/Deploy

Run the final full verifier after this checkpoint:

```sh
pnpm test
pnpm build
```

Then commit and deploy:

```sh
git add .
git commit -m "Route agent media engines and upload worker cycle"
git push origin main
node /data/data/com.termux/files/usr/lib/node_modules/vercel/dist/vc.js deploy --prod --yes
```

Verify deployment:

```sh
node /data/data/com.termux/files/usr/lib/node_modules/vercel/dist/vc.js inspect extractedproject-theta.vercel.app
curl -I https://extractedproject-theta.vercel.app
```

## Important Behavioral Contract

The app should treat user requests as production tasks:

1. Interpret intent.
2. Route to internal production agents.
3. Generate assets through the correct engine.
4. Attach playable/viewable outputs when assets are produced.
5. Queue/schedule/publish through platform adapters.
6. Monitor worker results.
7. Sync analytics and feed optimization.

The conversational layer should stay natural and concise, and should not expose internal pipeline structure unless the user asks.
