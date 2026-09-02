// Shared Claude API caller, used by both the landing-page sales demo
// and every client's embedded widget. Keeps the API key server-side only.

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

async function chatWithClaude(systemPrompt, messages, maxTokens = 400) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const err = new Error('ANTHROPIC_API_KEY not configured');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
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
    })
  });

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

module.exports = { chatWithClaude, MODEL };
