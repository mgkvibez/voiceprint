// GET  -> list cloned voice profiles
// POST -> clone a new voice from 5-15s of reference audio
// DELETE -> remove a voice from Inworld + the local profile list
module.exports = async (req, res) => {
  const { getDb, hasInworld, inworld, checkAuth, json } = require("./_lib");
  try {
    if (!checkAuth(req)) return json(res, 401, { error: "Wrong app password." });

    const db = getDb();
    const col = db.collection("voiceapp_profiles");

    if (req.method === "GET") {
      const snap = await col.orderBy("createdAt", "desc").limit(200).get();
      return json(res, 200, {
        needsSetup: !hasInworld(),
        voices: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      });
    }

    if (req.method === "DELETE") {
      const { voiceId } = req.body || {};
      if (!voiceId) return json(res, 400, { error: "voiceId is required." });
      if (hasInworld()) {
        const r = await fetch(`https://api.inworld.ai/voices/v1/voices/${voiceId}`, {
          method: "DELETE",
          headers: { Authorization: `Basic ${process.env.INWORLD_API_KEY}` },
        });
        if (!r.ok) return json(res, 502, { error: `Inworld refused delete (${r.status}).` });
      }
      const snap = await col.where("voiceId", "==", voiceId).limit(1).get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
      return json(res, 200, { deleted: voiceId });
    }

    if (req.method === "POST") {
      if (!hasInworld()) return json(res, 503, { error: "Inworld API key not configured yet.", needsSetup: true });
      const { displayName, langCode, audioBase64 } = req.body || {};
      if (!displayName || !audioBase64)
        return json(res, 400, { error: "displayName and audioBase64 are required." });
      if (audioBase64.length > 4_000_000)
        return json(res, 413, { error: "Reference audio too large. Keep it under ~3MB." });

      const clone = await inworld("/voices/v1/voices:clone", {
        displayName: String(displayName).slice(0, 60),
        langCode: langCode || "EN_US",
        voiceSamples: [{ audioData: audioBase64 }],
      });
      const voiceId = clone.voice && clone.voice.voiceId;
      if (!voiceId) return json(res, 502, { error: "Inworld did not return a voiceId.", detail: clone });

      const doc = await col.add({
        voiceId,
        displayName: String(displayName).slice(0, 60),
        langCode: langCode || "EN_US",
        createdAt: new Date().toISOString(),
      });
      return json(res, 200, { id: doc.id, voiceId, displayName });
    }

    return json(res, 405, { error: "Use GET, POST or DELETE." });
  } catch (e) {
    console.error("voices error:", e.message);
    return json(res, e.status || 500, { error: e.message || "Server error." });
  }
};
