const crypto = require('crypto');

function hashOtp(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function createAsyncSideEffect(promiseLike) {
  Promise.resolve(promiseLike).catch(() => {});
}

function buildActor(user, roleOverride) {
  return {
    id: user?._id,
    role: roleOverride || user?.role,
    name: user?.name
  };
}

module.exports = {
  hashOtp,
  createAsyncSideEffect,
  buildActor
};
