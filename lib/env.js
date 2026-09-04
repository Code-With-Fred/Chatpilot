// Startup environment validation. This project intentionally keeps running
// with clear warnings rather than crashing on missing optional config (the
// landing page's fallback answers and the admin dashboard's "not configured"
// messages are meant to degrade gracefully) — but it's still worth surfacing
// every problem once, loudly, at boot instead of letting each one surprise
// you individually at request time.

const logger = require('./logger');
const { isKeyConfigured } = require('./anthropic');

function checkEnv() {
  const problems = [];
  const warnings = [];

  if (!isKeyConfigured()) {
    warnings.push('ANTHROPIC_API_KEY is missing or still the placeholder value — chat endpoints will return a clear error until a real key is set.');
  }

  if (!process.env.ADMIN_KEY) {
    warnings.push('ADMIN_KEY is not set — /admin.html and /api/admin/* are disabled until it is configured.');
  } else if (process.env.ADMIN_KEY.length < 16) {
    warnings.push('ADMIN_KEY is short — use a long random value (see .env.example for a generator command).');
  }

  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port <= 0) {
    problems.push(`PORT is invalid: "${process.env.PORT}"`);
  }

  const smtpFieldsSet = [process.env.SMTP_HOST, process.env.SMTP_USER, process.env.SMTP_PASS].filter(Boolean).length;
  if (smtpFieldsSet > 0 && smtpFieldsSet < 3) {
    warnings.push('SMTP is partially configured (SMTP_HOST/SMTP_USER/SMTP_PASS) — lead notification emails will be silently skipped until all three are set.');
  }

  warnings.forEach((w) => logger.warn(w));
  problems.forEach((p) => logger.error(p));

  if (problems.length > 0) {
    throw new Error(`Invalid configuration:\n${problems.join('\n')}`);
  }
}

module.exports = { checkEnv };
