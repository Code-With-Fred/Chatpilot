// Wraps an async Express route handler so a rejected promise is forwarded
// to next(err) instead of becoming an unhandled rejection that crashes the
// process (Express 4 does not do this automatically — Express 5 does, but
// we're pinned to 4.x).

function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
