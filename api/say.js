// POST -> "Say it with the cloned voice": record yourself delivering the line,
// STT extracts the words + emotion/style/pitch, TTS-2 renders it in the
// cloned voice with steering tags that copy your delivery.
module.exports = async (req, res) => {
  const { getDb, hasInworld, inworld, checkAuth, json } = require("./_lib");
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Use POST." });
    if (!checkAuth(req)) return json(res, 401, { error: "Wrong app password." });
    if (!hasInworld()) return json(res, 503, { error: "Inworld API key not configured yet.", needsSetup: true });

    const { audioBase64, voiceId, encoding, voiceName } = req.body || {};
    const enc = ["LINEAR16", "MP3"].includes(encoding) ? encoding : "LINEAR16";
    if (!audioBase64 || !voiceId) return json(res, 400, { error: "audioBase64 and voiceId are required." });
    if (audioBase64.length > 4_000_000) return json(res, 413, { error: "Recording too large. Keep it under ~3MB." });

    // 1) Transcribe with voice profiling
    const st = await inworld("/stt/v1/transcribe", {
      transcribeConfig: {
        modelId: "inworld/inworld-stt-1",
        audioEncoding: enc,
        sampleRateHertz: 16000,
        language: "en-US",
        voiceProfileConfig: { enableVoiceProfile: true },
      },
      audioData: { content: audioBase64 },
    });
    const t = st.transcription || {};
    const transcript = (t.transcript || "").trim();
    if (!transcript) return json(res, 422, { error: "Couldn't hear any speech in that recording. Try again a bit closer to the mic." });

    // 2) Map delivery signals -> steering tags (verified vocabulary only)
    const vp = t.voiceProfile || {};
    const top = (sig) => {
      const list = (vp[sig] || []).filter((x) => x.confidence >= 0.5);
      return list.length ? list[0].label : null;
    };
    const emotion = top("emotion");
    const style = top("style");
    const pitch = top("pitch");

    const tags = [];
    if (style === "whispering") tags.push("[Whisper]");
    else if (style === "soft") tags.push("[Speak softly]");
    else if (style === "shouting") tags.push("[Speak loudly]");
    if (["sad", "happy", "excited", "frustrated", "angry", "fearful"].includes(emotion)) {
      const tone = emotion === "happy" || emotion === "excited" ? "excited" : emotion;
      if (!(style === "whispering" && (tone === "sad" || tone === "fearful"))) tags.push(`[with a ${tone} tone]`);
    }
    const steeredText = (tags.join(" ") + " " + transcript).trim();

    // 3) Synthesize in the cloned voice
    const out = await inworld("/tts/v1/voice", {
      text: steeredText,
      voiceId,
      modelId: "inworld-tts-2",
    });
    if (!out.audioContent) return json(res, 502, { error: "Inworld returned no audio." });

    getDb().collection("voiceapp_generations").add({
      voiceId,
      voiceName: voiceName || null,
      source: "say",
      transcript: transcript.slice(0, 160),
      chars: transcript.length,
      delivery: { emotion, style, pitch },
      tags,
      audioBase64: out.audioContent.length <= 900_000 ? out.audioContent : null,
      at: new Date().toISOString(),
    }).catch(() => {});

    return json(res, 200, {
      audioBase64: out.audioContent,
      format: "mp3",
      transcript,
      delivery: { emotion, style, pitch },
      tags,
    });
  } catch (e) {
    console.error("say error:", e.message);
    return json(res, e.status || 500, { error: e.message || "Server error." });
  }
};
