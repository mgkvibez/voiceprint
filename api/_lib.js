// Shared server utilities: Firebase Admin init + Inworld API helper
const admin = require("firebase-admin");

let db = null;
function getDb() {
  if (!db) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Vercel stores multi-line values fine; handle escaped newlines just in case
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        }),
      });
    }
    db = admin.firestore();
  }
  return db;
}

const INWORLD_KEY = process.env.INWORLD_API_KEY || "";
const hasInworld = () => INWORLD_KEY.length > 0;

async function inworld(endpoint, body) {
  const res = await fetch(`https://api.inworld.ai${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${INWORLD_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }
  if (!res.ok) {
    const err = new Error(data.error || data.message || `Inworld API error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Simple app-password gate so randos who find the URL can't burn the free tier
function checkAuth(req) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return true; // no password configured -> open (dev mode)
  const got = req.headers["x-app-password"];
  return got === expected;
}

function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  return res.end(JSON.stringify(obj));
}

module.exports = { getDb, hasInworld, inworld, checkAuth, json };
