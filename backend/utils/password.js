const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

function getDefaultPassword() {
  return process.env.DEFAULT_USER_PASSWORD || '123rey44';
}

function getAdminSignupCode() {
  return process.env.ADMIN_SIGNUP_CODE || '1488Fh2234';
}

async function hashPassword(plain) {
  return bcrypt.hash(String(plain), SALT_ROUNDS);
}

async function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  return bcrypt.compare(String(plain), String(hash));
}

async function hashDefaultPassword() {
  return hashPassword(getDefaultPassword());
}

function assertAdminCode(code) {
  const expected = getAdminSignupCode();
  return Boolean(code) && String(code) === expected;
}

module.exports = {
  getDefaultPassword,
  getAdminSignupCode,
  hashPassword,
  verifyPassword,
  hashDefaultPassword,
  assertAdminCode,
};
