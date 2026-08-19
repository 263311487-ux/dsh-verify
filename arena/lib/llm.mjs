// Minimal DeepSeek chat client for the arena (OpenAI-compatible API).
export async function chat({ model, messages, temperature = 0.7, maxTokens = 6000, apiKey }) {
  // Bring-your-own-model: any OpenAI-compatible endpoint works.
  const key = apiKey || process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("LLM_API_KEY (or DEEPSEEK_API_KEY) not set");
  const baseUrl = process.env.LLM_BASE_URL || "https://api.deepseek.com/v1/chat/completions";
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DeepSeek API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// Extract a single self-contained HTML document from a model reply.
export function extractHtml(reply) {
  const fences = reply.match(/```(?:html)?\s*([\s\S]*?)```/gi);
  if (fences) {
    for (const f of fences) {
      const code = f.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "");
      if (/<html[\s>]/i.test(code) || /<!doctype\s+html/i.test(code)) return code;
    }
  }
  // No fenced block: try the whole reply, or the longest <html>...</html> block.
  const whole = reply.trim();
  if (/<html[\s>]/i.test(whole)) return whole;
  const m = reply.match(/<html[\s>][\s\S]*?<\/html>/i);
  if (m) return m[0];
  throw new Error("no HTML document found in model reply");
}
