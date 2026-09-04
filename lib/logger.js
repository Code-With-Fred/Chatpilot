// Minimal structured logger — no external dependency needed for a project
// this size. Every line is one JSON object: easy to grep locally and easy
// for any hosting provider's log pipeline to parse later.

function write(level, message, meta) {
  const entry = { time: new Date().toISOString(), level, message };
  if (meta && Object.keys(meta).length) entry.meta = meta;

  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

module.exports = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
  debug: (message, meta) => {
    if (process.env.LOG_LEVEL === 'debug') write('debug', message, meta);
  }
};
