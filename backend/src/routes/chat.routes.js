const express = require("express");
const router  = express.Router();
const https   = require("https");
const { authenticate } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { success, badRequest } = require("../utils/response");

const GEMINI_MODEL = "gemini-3.6-flash";

const callGemini = (messages) => new Promise((resolve, reject) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) { reject(new Error("GEMINI_API_KEY not configured")); return; }

  // Build contents array from chat history
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const body = JSON.stringify({ contents });
  const path = "/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + key;

  const req = https.request({
    hostname: "generativelanguage.googleapis.com",
    path, method: "POST",
    headers: { "Content-Type": "application/json" }
  }, res => {
    let d = "";
    res.on("data", c => d += c);
    res.on("end", () => {
      try {
        const json = JSON.parse(d);
        if (json.error) { reject(new Error(json.error.message)); return; }
        resolve(json.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I could not generate a response.");
      } catch(e) { reject(e); }
    });
  });
  req.on("error", reject);
  req.write(body);
  req.end();
});

// POST /api/chat
router.post("/", authenticate, asyncHandler(async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return badRequest(res, "messages array is required");
  }

  // Prepend system context as first user message
  const systemMsg = {
    role: "user",
    content: `You are HealthSync AI, a helpful medical assistant integrated into the HealthSync healthcare platform. 
You help patients understand their symptoms, medications, and general health questions.
You are talking to a ${req.user.role.toLowerCase()} named ${req.user.firstName} ${req.user.lastName}.
Always be empathetic, clear, and remind users to consult their doctor for serious concerns.
Keep responses concise and formatted clearly. Current date: ${new Date().toDateString()}.`
  };

  const fullMessages = [systemMsg, ...messages];

  try {
    const reply = await callGemini(fullMessages);
    return success(res, { reply });
  } catch(e) {
    // Graceful fallback
    return success(res, {
      reply: "I am having trouble connecting right now. Please try again in a moment, or contact your healthcare provider directly."
    });
  }
}));

module.exports = router;