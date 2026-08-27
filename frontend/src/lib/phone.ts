/**
 * Normalize Nigerian phones to 234XXXXXXXXXX for display/API payloads.
 */
export function normalizeNgPhone(input: string | null | undefined): string | null {
  if (input == null) return null
  let digits = String(input).trim().replace(/[^\d]/g, "")
  if (!digits) return null

  if (digits.startsWith("234") && digits.length >= 13) {
    digits = digits.slice(0, 13)
  } else if (digits.startsWith("0") && digits.length >= 11) {
    digits = `234${digits.slice(1, 11)}`
  } else if (digits.length === 10) {
    digits = `234${digits}`
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = `234${digits.slice(1)}`
  }

  if (!/^234\d{10}$/.test(digits)) return null
  return digits
}
