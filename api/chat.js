// api/chat.js
import OpenAI from "openai";

if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch {}
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  try {
    const response = await openai.chat.completions.create({
	  model: "o4-mini",
	  messages: [{ role: "user", content: prompt }],
	});
	res.json({
	  reply: response.choices[0].message.content
});
  } catch (err) {
	  console.error("OpenAI error:", err);
	  res.status(500).json({
		error: err.message || "Unknown error",
		stack: err.stack   // <-- include stack trace
	  });
	}
}
