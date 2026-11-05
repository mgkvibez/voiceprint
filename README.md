# voiceprint

Personal voice cloning studio. Clone a voice from 5-15s of audio, then make it
speak anything. Inworld Realtime TTS-2 + Firestore (Firebase Admin, server-side
only) + Vercel serverless.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Routes

Each route lives in `api/` as a Vercel serverless function. All of them require
the app password (header, checked by `checkAuth` in `api/_lib.js`) and return
JSON. `405` means the wrong method, `401` the wrong password.

- `GET/POST/DELETE /api/voices` — manage voice profiles (Firestore: `voiceapp_profiles`).
  `GET` lists them newest first and reports `needsSetup` when no Inworld key is
  configured. `POST` clones from `{ displayName, audioBase64 }` (reference audio
  under ~3 MB). `DELETE` removes one by `voiceId`.
- `POST /api/tts` — synthesize `{ text, voiceId }` via Inworld `/tts/v1/voice`.
  Text is capped at 3,000 characters. Returns `audioBase64` (mp3). Usage is
  logged to `voiceapp_generations`.
- `POST /api/say` — say-it mode: send `{ audioBase64, voiceId }`, the recording is
  transcribed, the delivery profiled, and the text spoken back in the cloned
  voice. Recordings under ~3 MB; `422` when no speech is found in the clip.
- `GET /api/history` — the most recent generations, newest first, from
  `voiceapp_generations`.
- `GET /api/usage` — this month's estimate: `generations`, `sayModeTranscriptions`,
  `synthesizedChars`, `estMinutes`, `budgetMinutes` (70 on the free tier) and
  `percentUsed`. The estimate comes from this app's own log at ~14 chars/sec;
  Inworld's counter is authoritative and resets are assumed calendar-monthly.

## What this is not

A single-user personal studio, not a service. There is no account system: one
password guards the whole thing, and every visitor shares the same voices and
history. It depends on Inworld's free tier (free cloning, 70 min/month
synthesis) and will stop working if that changes. Audio is stored in Firestore,
so the Firebase project is not optional.

## Env vars (Vercel project settings)

- `INWORLD_API_KEY` — from platform.inworld.ai (free tier: free cloning + 70 min/month synthesis)
- `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` — Firebase Admin creds
- `APP_PASSWORD` — gate so strangers can't burn the free tier

Nothing is read from a committed file. Every credential comes from
`process.env`, and `scripts/verify.sh` fails the build if that stops being true.

## Verify

```bash
bash scripts/verify.sh
```

Six offline checks, no dependencies: required files present, no key material in
tracked files, every credential read from `process.env`, `package.json` version
matching `CHANGELOG.md`, every `api/*.js` route documented below, and every
server file parsing under `node --check`. CI runs the identical script.

## Swap the Inworld backend later

All Inworld calls live in api/_lib.js `inworld()`. A self-hosted Coqui XTTS-v2
service (e.g. on Render) can replace it by matching the same request/response shape.

## License

MIT — see [LICENSE](LICENSE).
