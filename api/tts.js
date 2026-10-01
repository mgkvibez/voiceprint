// POST -> synthesize speech with a cloned (or built-in) Inworld voice
module.exports = async (req, res) => {
  const { getDb, hasInworld, inworld, checkAuth, json } = require("./_lib");
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Use POST." });
    if (!checkAuth(req)) return json(res, 401, { error: "Wrong app password." });
    if (!hasInworld()) return json(res, 503, { error: "Inworld API key not configured yet.", needsSetup: true });

    const { text, voiceId, modelId } = req.body || {};
    if (!text || !voiceId) return json(res, 400, { error: "text and voiceId are required." });
    if (text.length > 3000) return json(res, 400, { error: "Text too long (3000 char max)." });

    const out = await inworld("/tts/v1/voice", {
      text,
      voiceId,
      modelId: modelId || "inworld-tts-2",
    });
    if (!out.audioContent)
      return json(res, 502, { error: "Inworld returned no audio.", detail: Object.keys(out) });

    // Fire-and-forget usage log (never blocks the response)
    getDb().collection("voiceapp_generations").add({
      voiceId,
      chars: text.length,
      usage: out.usage || null,
      at: new Date().toISOString(),
    }).catch(() => {});

    return json(res, 200, { audioBase64: out.audioContent, format: "mp3" });
  } catch (e) {
    console.error("tts error:", e.message);
    return json(res, e.status || 500, { error: e.message || "Server error." });
  }
};
