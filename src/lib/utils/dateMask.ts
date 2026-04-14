/**
 * Date mask utilities for DD/MM/YYYY format.
 */

/**
 * Applies DD/MM/YYYY mask to a string of digits.
 */
export function maskDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)

  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/**
 * Converts DD/MM/YYYY string to ISO date (YYYY-MM-DD) for storage.
 */
export function dateToISO(ddmmyyyy: string): string {
  const parts = ddmmyyyy.split('/')
  if (parts.length !== 3) return ''
  const [dd, mm, yyyy] = parts
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

/**
 * Converts ISO date (YYYY-MM-DD) to DD/MM/YYYY for display.
 */
export function isoToDisplay(isoDate: string): string {
  if (!isoDate) return ''
  const parts = isoDate.split('T')[0].split('-')
  if (parts.length < 3) return isoDate
  const [yyyy, mm, dd] = parts
  return `${dd}/${mm}/${yyyy}`
}

/**
 * Validates a DD/MM/YYYY date string.
 */
export function isValidDate(value: string): boolean {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return false
  const [, dd, mm, yyyy] = match.map(Number)
  const date = new Date(yyyy, mm - 1, dd)
  return date.getFullYear() === yyyy && date.getMonth() === mm - 1 && date.getDate() === dd
}
