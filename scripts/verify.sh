#!/usr/bin/env bash
# The gate for voiceprint. Everything here is offline and dependency-free so CI and a laptop run the same checks.
#
# Why each check exists, in the order they have actually caught something:
#   1  a missing route or entry file (the app 404s in production, not locally)
#   2  a secret committed in plain text (this repo went public)
#   3  a credential read from anywhere but process.env (same reason)
#   4  package.json version drifting from CHANGELOG (the 0.1.1 class of bug)
#   5  a route that exists but is undocumented (v1.0.0 shipped that way)
#   6  a JavaScript file that does not parse
set -uo pipefail

fail=0
note() { printf '  %s\n' "$*"; }
bad() { printf '  FAIL: %s\n' "$*"; fail=1; }
ok() { printf '  ok: %s\n' "$*"; }

echo "== 1. required files"
for f in index.html README.md LICENSE CHANGELOG.md package.json vercel.json \
         api/_lib.js api/voices.js api/tts.js api/say.js api/history.js api/usage.js; do
  if [ -f "$f" ]; then ok "$f"; else bad "missing $f"; fi
done

echo "== 2. no secrets in tracked files"
leaks=$(grep -rnE 'AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{30,}|xox[baprs]-' \
          --include='*.js' --include='*.html' --include='*.json' --include='*.md' --include='*.yml' . \
        | grep -v '^./node_modules/' | grep -v '^./scripts/verify.sh' || true)
if [ -n "$leaks" ]; then printf '%s\n' "$leaks" | head -5; bad "possible secret material"; else ok "no key material"; fi

echo "== 3. credentials come from process.env"
for name in INWORLD_API_KEY FIREBASE_PROJECT_ID FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY APP_PASSWORD; do
  if grep -rq "process\.env\.$name" api/; then ok "$name via process.env"; else bad "$name never read from process.env"; fi
done

echo "== 4. version consistency"
pkg=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' package.json | head -1)
top=$(sed -n 's/^## *\[\([0-9][^]]*\)\].*/\1/p' CHANGELOG.md | head -1)
if [ "$pkg" = "$top" ]; then ok "package.json $pkg == CHANGELOG $top"; else bad "package.json '$pkg' != CHANGELOG top '$top'"; fi

echo "== 5. every route is documented"
for path in api/*.js; do
  name=$(basename "$path" .js)
  [ "$name" = "_lib" ] && continue
  if grep -q "/api/$name" README.md; then ok "/api/$name documented"; else bad "/api/$name exists but README never mentions it"; fi
done

echo "== 6. server files parse"
for path in api/*.js; do
  if node --check "$path"; then ok "$path parses"; else bad "$path does not parse"; fi
done

echo
if [ "$fail" -ne 0 ]; then echo "GATE FAILED"; exit 1; fi
echo "GATE PASSED (6 checks)"
