/**
 * Tiny client for Groq's OpenAI-compatible chat completions API.
 * Set EXPO_PUBLIC_GROQ_API_KEY in .env (see .env.example). Prefer a backend proxy for production.
 */

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Small/fast Llama model — perfect for a simple chat helper.
const DEFAULT_MODEL = 'llama-3.1-8b-instant';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export const SALLY_SYSTEM_PROMPT: ChatMessage = {
  role: 'system',
  content:
    "You are Sally, a calm, concise emergency-preparedness assistant inside a public safety app used in Cluj-Napoca, Romania. " +
    "The app and this chat are in English. Always respond in English only, even if the user writes in another language. " +
    "Help users stay safe during fires, floods, earthquakes, and chemical incidents. " +
    "Keep answers short (max 4-6 sentences), practical, and step-by-step when relevant. " +
    "If a question is outside emergency safety, you can still answer briefly. Never invent emergency numbers — for Romania say 112.",
};

export async function sendChatMessage(
  history: ChatMessage[],
  options: { model?: string; signal?: AbortSignal } = {}
): Promise<string> {
  const { model = DEFAULT_MODEL, signal } = options;

  if (!GROQ_API_KEY) {
    throw new Error(
      'Missing EXPO_PUBLIC_GROQ_API_KEY. Copy .env.example to .env and set your Groq API key.'
    );
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: history,
      temperature: 0.4,
      max_tokens: 512,
    }),
    signal,
  });

  if (!res.ok) {
    let detail = '';
    try {
      const errBody = await res.json();
      detail = errBody?.error?.message ?? '';
    } catch {
      // ignore
    }
    throw new Error(
      detail ? `Groq API ${res.status}: ${detail}` : `Groq API request failed (${res.status})`
    );
  }

  const data = await res.json();
  const reply: string | undefined = data?.choices?.[0]?.message?.content;
  if (!reply) {
    throw new Error('Empty response from Groq API');
  }
  return reply.trim();
}
