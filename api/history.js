// GET -> recent generations (for the History panel, with replayable audio where stored)
module.exports = async (req, res) => {
  const { getDb, checkAuth, json } = require("./_lib");
  try {
    if (req.method !== "GET") return json(res, 405, { error: "Use GET." });
    if (!checkAuth(req)) return json(res, 401, { error: "Wrong app password." });

    const snap = await getDb().collection("voiceapp_generations")
      .orderBy("at", "desc").limit(20).get();

    const items = snap.docs.map((d) => {
      const g = d.data();
      return {
        id: d.id,
        at: g.at,
        voiceId: g.voiceId,
        voiceName: g.voiceName || null,
        source: g.source || "type",
        transcript: g.transcript || null,
        chars: g.chars || 0,
        delivery: g.delivery || null,
        audioBase64: g.audioBase64 || null,
      };
    });
    return json(res, 200, { items });
  } catch (e) {
    console.error("history error:", e.message);
    return json(res, e.status || 500, { error: e.message || "Server error." });
  }
};
