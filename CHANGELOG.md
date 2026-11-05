# Changelog

## [1.0.1] - 2026-11-05

Documentation and project hygiene. No application behaviour changed.

- Added `LICENSE` (MIT). v1.0.0 shipped with no license, which meant default
  all-rights-reserved by accident rather than by choice.
- README now documents all five API routes. `POST /api/say`, `GET /api/history`
  and `GET /api/usage` existed and were used by the UI, but were never written
  down, so anyone reading the repo would not know they were there.
- Added `scripts/verify.sh`, a six-check offline gate, and a CI workflow that
  runs the same script. It fails when a route is undocumented, when a secret
  appears in a tracked file, when a credential is read from anywhere other than
  `process.env`, when `package.json` drifts from this file, or when a server
  file does not parse.
- Added the MIT badge, Node/pnpm note and license section to the README.

## [1.0.0] - 2026-10-02

First release.

- Clone a voice from 5-15 s of reference audio via Inworld, store the profile in
  Firestore (`voiceapp_profiles`), synthesize speech with Realtime TTS-2.
- Say-it mode: record a sentence, transcribe it, profile the delivery, then speak
  the same text back in the cloned voice.
- Studio UI: voice cards, waveform player, generation history.
- Usage meter derived from this app's own generation log, because Inworld's free
  tier is 70 minutes/month and the app should warn before it is spent.
- Password gate (`APP_PASSWORD`) so a public URL cannot burn the free tier.
