/**
 * CNJ process number format: 0000000-00.0000.0.00.0000
 * 7 digits - 2 digits . 4 digits . 1 digit . 2 digits . 4 digits
 * Total: 20 digits
 */

export const PROCESSO_REGEX = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/

/**
 * Applies CNJ mask to a string of digits.
 * Input: "12345678901234567890" → "1234567-89.0123.4.56.7890"
 */
export function maskProcesso(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 20)

  if (digits.length <= 7) return digits
  if (digits.length <= 9) return `${digits.slice(0, 7)}-${digits.slice(7)}`
  if (digits.length <= 13) return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9)}`
  if (digits.length <= 14) return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13)}`
  if (digits.length <= 16) return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14)}`
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`
}

/**
 * Validates if a string matches the CNJ format.
 */
export function isValidProcesso(value: string): boolean {
  return PROCESSO_REGEX.test(value)
}

/**
 * Strips mask from a CNJ number, returning only digits.
 */
export function stripProcessoMask(value: string): string {
  return value.replace(/\D/g, '')
}
