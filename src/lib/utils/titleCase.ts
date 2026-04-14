// Portuguese particles that should remain lowercase (unless first word)
const LOWERCASE_PARTICLES = new Set([
  'da', 'de', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'no', 'na',
  'nos', 'nas', 'ao', 'aos', 'às', 'por', 'para', 'com', 'sem', 'sob',
])

/**
 * Converts a string to Title Case respecting Portuguese articles and prepositions.
 * "JOÃO DA SILVA" → "João da Silva"
 * "MARIA DE FATIMA" → "Maria de Fatima"
 */
export function toTitleCase(input: string): string {
  if (!input) return input
  return input
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word, index) => {
      if (index !== 0 && LOWERCASE_PARTICLES.has(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}
