// Shared Claude API caller, used by both the landing-page sales demo
// and every client's embedded widget. Keeps the API key server-side only.

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

// The value shipped in .env.example — if this is still what's in .env,
// the key was never actually swapped for a real one.
const PLACEHOLDER_KEY = 'your_anthropic_api_key_here';

function isKeyConfigured() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return Boolean(apiKey && apiKey.trim() && apiKey.trim() !== PLACEHOLDER_KEY);
}

async function chatWithClaude(systemPrompt, messages, maxTokens = 400) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!isKeyConfigured()) {
    const err = new Error(
      apiKey === PLACEHOLDER_KEY
        ? 'ANTHROPIC_API_KEY is still the placeholder value from .env.example — replace it with a real key.'
        : 'ANTHROPIC_API_KEY not configured'
    );
    err.code = 'NO_API_KEY';
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let upstream;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages
      }),
      signal: controller.signal
    });
  } catch (e) {
    const err = new Error(e.name === 'AbortError' ? 'Anthropic API request timed out' : e.message);
    err.code = 'UPSTREAM_ERROR';
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    const err = new Error(`Anthropic API error ${upstream.status}: ${text}`);
    err.code = 'UPSTREAM_ERROR';
    throw err;
  }

  const data = await upstream.json();
  return (data.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

module.exports = { chatWithClaude, isKeyConfigured, MODEL };
