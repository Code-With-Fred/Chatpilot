// Constant-time secret comparison for the admin key. A plain `===` leaks
// timing information proportional to how many leading characters match,
// which is a real (if minor) side channel for a bearer-token gate like ours.
// Hashing both sides first also sidesteps timingSafeEqual's requirement
// that both buffers be the same length.

const crypto = require('crypto');

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

module.exports = { safeCompare };
