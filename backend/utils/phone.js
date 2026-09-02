/**
 * Normalize Nigerian phone numbers to E.164-ish local storage form: 234XXXXXXXXXX
 * Accepts: +234..., 234..., 0..., or bare 10-digit (e.g. 8148429834)
 */
function normalizeNgPhone(input) {
  if (input == null) return null;
  let digits = String(input).trim().replace(/[^\d]/g, '');
  if (!digits) return null;

  if (digits.startsWith('234') && digits.length >= 13) {
    digits = digits.slice(0, 13);
  } else if (digits.startsWith('0') && digits.length >= 11) {
    digits = `234${digits.slice(1, 11)}`;
  } else if (digits.length === 10) {
    digits = `234${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = `234${digits.slice(1)}`;
  }

  if (!/^234\d{10}$/.test(digits)) {
    return null;
  }

  return digits;
}

/** Candidate forms for looking up legacy rows that were stored inconsistently. */
function phoneLookupCandidates(input) {
  const normalized = normalizeNgPhone(input);
  const raw = String(input || '').trim().replace(/[^\d+]/g, '');
  const digits = raw.replace(/\D/g, '');
  const set = new Set();

  if (normalized) {
    set.add(normalized);
    set.add(`+${normalized}`);
    set.add(`0${normalized.slice(3)}`);
    set.add(normalized.slice(3));
  }
  if (digits) set.add(digits);
  if (raw) set.add(raw);

  // International numbers (e.g. Kenyan 254XXXXXXXXX): include the +E.164 form
  // so logins/lookups resolve no matter which shape was stored.
  if (!normalized && digits.length >= 11 && digits.length <= 15 && !digits.startsWith('0')) {
    set.add(`+${digits}`);
  }

  return [...set].filter(Boolean);
}

module.exports = {
  normalizeNgPhone,
  phoneLookupCandidates,
};
