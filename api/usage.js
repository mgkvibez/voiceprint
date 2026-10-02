// GET -> usage meter: what the key has spent this calendar month.
// No official quota endpoint exists, so this is an app-side estimate:
// synthesized chars -> minutes at ~14 chars/sec against the 70 min free tier.
module.exports = async (req, res) => {
  const { getDb, checkAuth, json } = require("./_lib");
  try {
    if (req.method !== "GET") return json(res, 405, { error: "Use GET." });
    if (!checkAuth(req)) return json(res, 401, { error: "Wrong app password." });

    const db = getDb();
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    const [genSnap, profSnap] = await Promise.all([
      db.collection("voiceapp_generations").where("at", ">=", monthStart).get(),
      db.collection("voiceapp_profiles").limit(500).get(),
    ]);

    let chars = 0, count = 0, sttCount = 0;
    genSnap.forEach((d) => {
      const g = d.data();
      chars += g.chars || 0;
      count += 1;
      if (g.source === "say") sttCount += 1;
    });

    const estMinutes = chars / 840; // ~14 chars per second of speech
    const budgetMinutes = 70;
    const pct = Math.min(100, Math.round((estMinutes / budgetMinutes) * 100));

    return json(res, 200, {
      month: monthStart.slice(0, 7),
      generations: count,
      sayModeTranscriptions: sttCount,
      synthesizedChars: chars,
      estMinutes: +estMinutes.toFixed(1),
      budgetMinutes,
      percentUsed: pct,
      note: "Estimate from this app's logs (~14 chars/sec). Inworld's own counter is authoritative; resets are assumed calendar-monthly.",
    });
  } catch (e) {
    console.error("usage error:", e.message);
    return json(res, e.status || 500, { error: e.message || "Server error." });
  }
};
