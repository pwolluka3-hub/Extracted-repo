# Deployment Checklist

This app is ready to deploy on Vercel as a standard Next.js project.

## What Vercel needs

- Connect the repository to Vercel
- Use the repo root as the project root
- Let Vercel detect the framework automatically as Next.js
- No build-time environment variables are required for the app to compile

## What the app needs at runtime

- The Puter.js browser script loads from `https://js.puter.com/v2/`
- User data and app settings are stored in Puter KV after sign-in
- Optional provider keys are entered in the app's Settings screen, not as Vercel env vars

## Optional provider keys managed inside the app

The app can use keys for services such as:

- Gemini
- Groq
- OpenRouter
- NVIDIA
- Together
- Fireworks
- DeepSeek
- Ollama URL
- Stability
- Leonardo
- Ideogram
- ElevenLabs
- Speechify
- PlayHT
- Resemble
- Suno
- Udio
- Beatoven
- Soundraw
- Ayrshare

## Local verification

Before deploying, the repo should pass:

- `npm run build`
- `npm run dev`

On this environment, both commands are already working through `scripts/run-next.sh`.

## Notes

- `next.config.mjs` disables webpack's persistent cache only on Android/Termux to keep local preview logs quiet.
- No custom `vercel.json` is required for the current setup.
