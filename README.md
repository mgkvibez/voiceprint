# voiceprint

Personal voice cloning studio. Clone a voice from 5-15s of audio, then make it
speak anything. Inworld Realtime TTS-2 + Firestore (Firebase Admin, server-side
only) + Vercel serverless.

## Routes
- `GET/POST /api/voices` — list / clone voice profiles (Firestore: voiceapp_profiles)
- `POST /api/tts` — synthesize via Inworld /tts/v1/voice (usage logged to voiceapp_generations)

## Env vars (Vercel project settings)
- INWORLD_API_KEY — from platform.inworld.ai (free tier: free cloning + 70 min/month synthesis)
- FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY — Firebase Admin creds
- APP_PASSWORD — gate so strangers can't burn the free tier

## Swap the Inworld backend later
All Inworld calls live in api/_lib.js `inworld()`. A self-hosted Coqui XTTS-v2
service (e.g. on Render) can replace it by matching the same request/response shape.
