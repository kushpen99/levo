// api/chat.js
// 1. Import the default export
import OpenAI from "openai";

// 2. Instantiate with your API key
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
	  model: "gpt-4.1",
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
