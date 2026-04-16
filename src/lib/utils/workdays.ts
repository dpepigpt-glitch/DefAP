// Brazilian national holidays (fixed dates MM-DD)
const FERIADOS_FIXOS = new Set([
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência do Brasil
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '11-20', // Consciência Negra
  '12-25', // Natal
])

// Calculate Easter Sunday for a given year (Gauss algorithm)
function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

// Variable holidays derived from Easter
function getVariableHolidays(year: number): Set<string> {
  const easter = easterSunday(year)
  const fmt = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const offset = (d: Date, days: number) => {
    const r = new Date(d)
    r.setDate(r.getDate() + days)
    return r
  }

  return new Set([
    fmt(offset(easter, -48)), // Segunda de Carnaval
    fmt(offset(easter, -47)), // Terça de Carnaval
    fmt(offset(easter, -2)),  // Sexta-feira Santa
    fmt(easter),              // Páscoa (não é feriado nacional mas boa prática)
    fmt(offset(easter, 60)),  // Corpus Christi
  ])
}

function isHoliday(date: Date): boolean {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const mmdd = `${mm}-${dd}`
  if (FERIADOS_FIXOS.has(mmdd)) return true
  return getVariableHolidays(date.getFullYear()).has(mmdd)
}

export function isWorkday(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6 && !isHoliday(date)
}

/**
 * Returns the date that is `n` workdays from startDate,
 * counting startDate as day 1 if it is a workday.
 * If startDate is a weekend/holiday, counting starts from the next workday.
 *
 * Example: inicio=01/02 (Mon), prazo=5 → result=05/02 (Fri)
 */
export function addWorkdays(startDate: Date, n: number): Date {
  if (n <= 0) return new Date(startDate)
  const current = new Date(startDate)
  let count = 0

  while (count < n) {
    if (isWorkday(current)) count++
    if (count < n) current.setDate(current.getDate() + 1)
  }

  return new Date(current)
}

/**
 * Given a DD/MM/YYYY string and number of workdays,
 * returns the resulting date as DD/MM/YYYY string.
 * Returns '' if input is invalid.
 */
export function calcPrazoFinal(inicioStr: string, prazoDias: number): string {
  if (!inicioStr || prazoDias <= 0) return ''
  // Parse DD/MM/YYYY
  const parts = inicioStr.split('/')
  if (parts.length !== 3) return ''
  const [dd, mm, yyyy] = parts.map(Number)
  if (!dd || !mm || !yyyy || yyyy < 1900) return ''

  const inicio = new Date(yyyy, mm - 1, dd)
  if (isNaN(inicio.getTime())) return ''

  const result = addWorkdays(inicio, prazoDias)
  return [
    String(result.getDate()).padStart(2, '0'),
    String(result.getMonth() + 1).padStart(2, '0'),
    result.getFullYear(),
  ].join('/')
}
