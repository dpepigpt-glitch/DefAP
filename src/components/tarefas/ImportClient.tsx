'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { importarTarefas, type TarefaPayload } from '@/actions/tarefas'
import { maskProcesso } from '@/lib/utils/processoMask'
import { dateToISO } from '@/lib/utils/dateMask'
import { toTitleCase } from '@/lib/utils/titleCase'
import { calcPrazoFinal } from '@/lib/utils/workdays'
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Users,
  FileText,
} from 'lucide-react'

const COLUMN_MAP: Record<string, string> = {
  // Processo
  'processo': 'numero_processo',
  'numero do processo': 'numero_processo',
  'n processo': 'numero_processo',
  'n° processo': 'numero_processo',
  'no processo': 'numero_processo',
  // Assistido / Acusado
  'assistido': 'assistido',
  'nome': 'assistido',
  'nome do acusado': 'assistido',
  'acusado': 'assistido',
  'reu': 'assistido',
  // Data da intimação / expedição
  'data do ciente': 'data_intimacao',
  'ciente': 'data_intimacao',
  'data intimacao': 'data_intimacao',
  'data de intimacao': 'data_intimacao',
  'expedicao': 'data_intimacao',
  'data expedicao': 'data_intimacao',
  'data de expedicao': 'data_intimacao',
  // Início
  'inicio': 'inicio',
  // Tipo de petição / providência
  'peticao': 'tipo_peticao_nome',
  'tipo de peticao': 'tipo_peticao_nome',
  'tipo peticao': 'tipo_peticao_nome',
  'tipo': 'tipo_peticao_nome',
  'providencia': 'tipo_peticao_nome',
  'providencias': 'tipo_peticao_nome',
  'ato': 'tipo_peticao_nome',
  // Prazo em dias
  'prazo': 'prazo_dias',
  // Prazo final PJE / expressa
  'prazo final pje': 'prazo_final_pje',
  'prazo pje': 'prazo_final_pje',
  'final do prazo': 'prazo_final_pje',
  'data da final do prazo': 'prazo_final_pje',
  'data final do prazo': 'prazo_final_pje',
  'final': 'prazo_final_pje',
  'expressa': 'prazo_final_pje',
  // Prazo interno / P.D. termina em / Prazo do estagiário
  'prazo interno': 'prazo_interno',
  'prazo do estagiario': 'prazo_interno',
  'p. d. termina em': 'prazo_interno',
  'p. d. termina em:': 'prazo_interno',
  'p.d. termina em': 'prazo_interno',
  'p.d. termina em:': 'prazo_interno',
  'pd termina em': 'prazo_interno',
  'prazo definitivo': 'prazo_interno',
  'prazo definitivo termina em': 'prazo_interno',
  'termina em': 'prazo_interno',
  // Executor
  'executor': 'executor_nome',
  'responsavel': 'executor_nome',
  // Status
  'protocolo': 'status_raw',
  'status': 'status_raw',
}

/**
 * Normalize a column header for COLUMN_MAP lookup.
 * Strips Unicode combining diacritics (NFD decomposition) so that
 * "PROVIDÊNCIA" (from Excel) matches "providencia" in the map
 * regardless of NFC/NFD form or encoding differences.
 */
function normalizeHeader(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

const PETICAO_NORMALIZE: Record<string, string> = {
  'ra': 'Resposta',
  'r.a': 'Resposta',
  'r.a.': 'Resposta',
  'resposta': 'Resposta',
  'contrirazoes': 'Contrarrazões',
  'contrarrazoes': 'Contrarrazões',
  'contrarrazão': 'Contrarrazões',
  'contrarrazao': 'Contrarrazões',
  'contrarrazões': 'Contrarrazões',
  'embargos de declaração': 'Embargos de Declaração',
  'embargos de declaracao': 'Embargos de Declaração',
  'embargos declaracao': 'Embargos de Declaração',
  'embargo de declaração': 'Embargos de Declaração',
  'apelação': 'Apelação',
  'apelacao': 'Apelação',
  'recurso de apelação': 'Recurso de Apelação',
  'recurso de apelacao': 'Recurso de Apelação',
  'petição inicial': 'Petição Inicial',
  'peticao inicial': 'Petição Inicial',
}

function normalizePeticaoName(val: string): string {
  const lower = val.toLowerCase().trim()
  return PETICAO_NORMALIZE[lower] ?? toTitleCase(val)
}

function parseStatusRaw(val: string): 'pendente' | 'remetido_ao_defensor' | 'protocolado' {
  const v = (val ?? '').toLowerCase().trim()
  if (v.includes('protocol')) return 'protocolado'
  if (v.includes('remetid')) return 'remetido_ao_defensor'
  return 'pendente'
}

type ParsedRow = Record<string, string>

function cellToDateString(val: unknown): string {
  if (val == null || val === '') return ''
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, '0')
    const m = String(val.getMonth() + 1).padStart(2, '0')
    return `${d}/${m}/${val.getFullYear()}`
  }
  const str = String(val).trim()
  if (!str || str === 'undefined') return ''
  const serial = Number(str)
  if (!isNaN(serial) && serial > 25000 && serial < 100000) {
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000))
    return `${String(date.getUTCDate()).padStart(2,'0')}/${String(date.getUTCMonth()+1).padStart(2,'0')}/${date.getUTCFullYear()}`
  }
  // ISO: YYYY-MM-DD
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`
  // DD/MM/YYYY or MM/DD/YYYY
  const slash = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) {
    const [, a, b, y] = slash
    const ap = a.padStart(2,'0'), bp = b.padStart(2,'0')
    if (parseInt(b) > 12) return `${bp}/${ap}/${y}`
    return `${ap}/${bp}/${y}`
  }
  // DD-MM-YYYY or DD.MM.YYYY (common in Brazilian spreadsheets)
  const dash = str.match(/^(\d{1,2})[-.](\d{1,2})[-.](\d{4})$/)
  if (dash) {
    const [, d, m, y] = dash
    return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`
  }
  // DD/MM/YY (2-digit year)
  const short = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (short) {
    const [, d, m, y] = short
    return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/20${y}`
  }
  return str
}

function cellToString(val: unknown): string {
  if (val == null) return ''
  if (val instanceof Date) return cellToDateString(val)
  return String(val)
}

export interface Profile {
  id: string
  full_name: string
  email: string
}

export interface TipoTarefaOption {
  id: string
  nome: string
}

interface ImportClientProps {
  unidadeId: string
  profiles: Profile[]
  tiposTarefa: TipoTarefaOption[]
}

export function ImportClient({ unidadeId, profiles, tiposTarefa }: ImportClientProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [preview, setPreview] = useState<ParsedRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ inserted: number; errors: { row: number; message: string }[] } | null>(null)
  const [parseStats, setParseStats] = useState<{ totalInFile: number; withProcesso: number } | null>(null)

  // Executor mapping: name from file → profile_id
  const [executorNames, setExecutorNames] = useState<string[]>([])
  const [executorMap, setExecutorMap] = useState<Record<string, string>>({})

  // Petition type mapping: normalized name from file → tipo_tarefa_id
  const [peticaoNames, setPeticaoNames] = useState<string[]>([])
  const [peticaoMap, setPeticaoMap] = useState<Record<string, string>>({})

  async function parseFile(file: File): Promise<{ rows: ParsedRow[]; hdrs: string[] }> {
    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      const { default: Papa } = await import('papaparse')
      const text = await file.text()
      const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true })
      const rawData = parsed.data as string[][]
      if (rawData.length < 2) return { rows: [], hdrs: [] }
      const hdrs = rawData[0].map((h) => normalizeHeader(h))
      const rows = rawData.slice(1).map((row) => {
        const obj: ParsedRow = {}
        hdrs.forEach((h, i) => { obj[h] = row[i] ?? '' })
        return obj
      })
      return { rows, hdrs }
    } else {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { cellDates: true })

      // Read ALL sheets and combine rows (supports multi-tab files, e.g. one tab per month)
      const allRows: ParsedRow[] = []
      let firstHdrs: string[] = []

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][]
        if (data.length < 2) continue

        // Find the real header row — some tabs have a title row before the column headers.
        // Use COLUMN_MAP matching: the header row is the first row where ≥2 cells are
        // known column names, or exactly 1 cell is 'processo'. Title rows (e.g.
        // "CONTROLE DE PROCESSOS - FEVEREIRO") won't have 2+ COLUMN_MAP matches.
        let headerRowIdx = -1
        for (let r = 0; r < Math.min(data.length, 10); r++) {
          const cells = (data[r] as unknown[]).map((cell) => normalizeHeader(cellToString(cell)))
          const knownCount = cells.filter((s) => s && COLUMN_MAP[s] !== undefined).length
          if (knownCount >= 2 || cells.includes('processo')) {
            headerRowIdx = r
            break
          }
        }
        if (headerRowIdx === -1) continue // no header found in this sheet

        const sheetHdrs = (data[headerRowIdx] as unknown[]).map((h) => normalizeHeader(cellToString(h)))
        if (firstHdrs.length === 0) firstHdrs = sheetHdrs

        const sheetRows = data.slice(headerRowIdx + 1).map((row) => {
          const obj: ParsedRow = {}
          sheetHdrs.forEach((h, i) => { obj[h] = cellToString((row as unknown[])[i]) })
          return obj
        }).filter((row) => Object.values(row).some((v) => v.trim() !== ''))

        allRows.push(...sheetRows)
      }

      if (firstHdrs.length === 0) return { rows: [], hdrs: [] }
      return { rows: allRows, hdrs: firstHdrs }
    }
  }

  async function handleFile(file: File) {
    setFileName(file.name)
    setResult(null)
    try {
      const { rows, hdrs } = await parseFile(file)
      setHeaders(hdrs)
      setPreview(rows.slice(0, 5))

      // Collect unique executor names; blank cells → 'Estagiário não Informado'
      const execNames = new Set<string>()
      // Collect unique petition type names (normalized)
      const petNames = new Set<string>()

      rows.forEach((row) => {
        Object.entries(row).forEach(([key, val]) => {
          const mk = COLUMN_MAP[normalizeHeader(key)]
          if (mk === 'executor_nome') {
            execNames.add(val && val.trim() ? val.trim() : 'Estagiário não Informado')
          }
          if (mk === 'tipo_peticao_nome' && val && val.trim()) {
            petNames.add(normalizePeticaoName(val.trim()))
          }
        })
      })

      setExecutorNames(Array.from(execNames).sort())
      setExecutorMap({})
      setPeticaoNames(Array.from(petNames).sort())
      // Auto-match petition types by exact name
      const autoMap: Record<string, string> = {}
      petNames.forEach((name) => {
        const match = tiposTarefa.find(
          (t) => t.nome.toLowerCase() === name.toLowerCase()
        )
        if (match) autoMap[name] = match.id
      })
      setPeticaoMap(autoMap)
    } catch (e) {
      console.error('Error parsing file:', e)
    }
  }

  function rowToPayload(
    row: ParsedRow,
    execMap: Record<string, string>,
    petMap: Record<string, string>,
  ): Omit<TarefaPayload, 'unidade_id'> {
    const mapped: Record<string, string> = {}
    Object.entries(row).forEach(([key, val]) => {
      const mk = COLUMN_MAP[normalizeHeader(key)]
      if (mk) mapped[mk] = val
    })

    const inicioStr = cellToDateString(mapped.inicio ?? '')
    const prazoDias = parseInt(mapped.prazo_dias ?? '', 10)
    let prazoFinalStr = cellToDateString(mapped.prazo_final_pje ?? '')

    if (!prazoFinalStr && inicioStr && prazoDias > 0) {
      prazoFinalStr = calcPrazoFinal(inicioStr, prazoDias)
    }

    const prazoFinalISO = dateToISO(prazoFinalStr)
    const inicioISO = dateToISO(inicioStr)
    const prazoInternoISO =
      dateToISO(cellToDateString(mapped.prazo_interno ?? '')) || prazoFinalISO
    const dataIntimacaoISO =
      dateToISO(cellToDateString(mapped.data_intimacao ?? '')) || inicioISO || prazoFinalISO || prazoInternoISO

    const payload: Omit<TarefaPayload, 'unidade_id'> = {
      numero_processo: maskProcesso(mapped.numero_processo ?? ''),
      assistido: toTitleCase(mapped.assistido ?? ''),
      data_intimacao: dataIntimacaoISO,
      prazo_final_pje: prazoFinalISO,
      prazo_interno: (prazoInternoISO || prazoFinalISO) + 'T17:00:00',
      status: parseStatusRaw(mapped.status_raw ?? ''),
    }

    // Resolve executor from mapping; blank cells use 'Estagiário não Informado' as key
    const executorNome = (mapped.executor_nome ?? '').trim() || 'Estagiário não Informado'
    if (execMap[executorNome]) {
      payload.executor_id = execMap[executorNome]
    }

    // Resolve petition type from mapping
    if (mapped.tipo_peticao_nome) {
      const normalized = normalizePeticaoName(mapped.tipo_peticao_nome)
      if (petMap[normalized]) {
        payload.tipo_tarefa_id = petMap[normalized]
      }
    }

    if (inicioISO) payload.inicio = inicioISO
    if (prazoDias > 0) payload.prazo_dias = prazoDias
    return payload
  }

  async function handleImport() {
    if (preview.length === 0) return
    setLoading(true)
    const file = fileRef.current?.files?.[0]
    if (!file) { setLoading(false); return }

    try {
      const { rows } = await parseFile(file)
      const rowsWithProcesso = rows.filter((row) => {
        const mapped: Record<string, string> = {}
        Object.entries(row).forEach(([k, v]) => {
          const mk = COLUMN_MAP[normalizeHeader(k)]
          if (mk) mapped[mk] = v
        })
        return (mapped.numero_processo ?? '').trim() !== ''
      })
      setParseStats({ totalInFile: rows.length, withProcesso: rowsWithProcesso.length })
      const payloads = rowsWithProcesso.map((row) => rowToPayload(row, executorMap, peticaoMap))

      const importResult = await importarTarefas(unidadeId, payloads)
      setResult(importResult)
      if (importResult.inserted > 0) {
        setTimeout(() => router.push(`/unidades/${unidadeId}`), 2000)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Arquivo CSV ou Excel
          </CardTitle>
          <CardDescription>
            Colunas esperadas: Data do Ciente · Início · Nº Processo · Petição · Assistido · Prazo · Final do Prazo · Responsável · Protocolo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files[0]
              if (file) {
                const input = fileRef.current
                if (input) {
                  const dt = new DataTransfer()
                  dt.items.add(file)
                  input.files = dt.files
                }
                handleFile(file)
              }
            }}
          >
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            {fileName ? (
              <p className="text-sm font-medium text-blue-600">{fileName}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">Arraste ou clique para selecionar</p>
                <p className="text-xs text-gray-400 mt-1">.csv, .xls, .xlsx</p>
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xls,.xlsx,.txt"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />

          {preview.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Pré-visualização (5 primeiras linhas):</p>
              <div className="overflow-x-auto border rounded-lg">
                <table className="text-xs w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {headers.slice(0, 8).map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.map((row, i) => (
                      <tr key={i}>
                        {headers.slice(0, 8).map((h) => (
                          <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-32 truncate">
                            {row[h] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {parseStats && (
            <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 space-y-0.5">
              <div>📄 Linhas no arquivo: <strong>{parseStats.totalInFile}</strong></div>
              <div>🔢 Com número de processo: <strong>{parseStats.withProcesso}</strong></div>
              {parseStats.totalInFile > parseStats.withProcesso && (
                <div className="text-amber-600">
                  ⚠️ {parseStats.totalInFile - parseStats.withProcesso} linhas sem processo foram ignoradas
                  (linhas em branco, cabeçalhos extras, etc.)
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="space-y-2">
              {result.inserted > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                  <CheckCircle2 className="h-4 w-4" />
                  {result.inserted} tarefa{result.inserted !== 1 ? 's' : ''} importada{result.inserted !== 1 ? 's' : ''} com sucesso!
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 font-medium mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    {result.errors.length} linha{result.errors.length !== 1 ? 's' : ''} ignorada{result.errors.length !== 1 ? 's' : ''}:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-xs max-h-40 overflow-y-auto pr-1">
                    {result.errors.map((e, i) => <li key={i}>{e.message}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <Button onClick={handleImport} disabled={preview.length === 0 || loading} className="w-full">
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importando...</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" />Importar Arquivo</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Executor mapping — only shown when file has executor names */}
      {executorNames.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Mapear Responsáveis
            </CardTitle>
            <CardDescription>
              Associe cada nome da planilha a um perfil cadastrado nesta unidade.
              Deixe em branco para importar sem responsável.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {executorNames.map((name) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 w-40 shrink-0 truncate" title={name}>
                    {name}
                  </span>
                  <span className="text-gray-400 text-sm shrink-0">→</span>
                  <Select
                    value={executorMap[name] ?? '__none__'}
                    onValueChange={(val) =>
                      setExecutorMap((prev) => {
                        const next = { ...prev }
                        if (val === '__none__') delete next[name]
                        else next[name] = val
                        return next
                      })
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecionar perfil..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— sem responsável —</SelectItem>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name} ({p.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Petition type mapping — only shown when file has petition names AND unit has tipos */}
      {peticaoNames.length > 0 && tiposTarefa.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Mapear Tipos de Petição
              {peticaoNames.filter((n) => !peticaoMap[n]).length > 0 && (
                <span className="ml-auto text-xs font-normal text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  {peticaoNames.filter((n) => !peticaoMap[n]).length} sem vínculo
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Vincule cada nome encontrado na planilha a um tipo cadastrado aqui no sistema.
              Vários nomes da planilha podem apontar para o mesmo tipo — por exemplo,
              &ldquo;Razões simples&rdquo;, &ldquo;Razões com absolvição&rdquo; e &ldquo;Razões e Contrarrazões&rdquo;
              podem todos ser mapeados como <strong>Razões de Apelação</strong>.
              Itens sem vínculo serão importados sem tipo de petição.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100 border rounded-lg overflow-hidden">
              {peticaoNames.map((name) => {
                const isMapped = !!peticaoMap[name]
                return (
                  <div key={name} className={`p-3 space-y-2 ${isMapped ? 'bg-white' : 'bg-amber-50'}`}>
                    <div className="flex items-start gap-2">
                      <span className={`inline-block text-xs font-medium px-2 py-1 rounded leading-snug break-all ${
                        isMapped
                          ? 'bg-purple-50 text-purple-800 border border-purple-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm shrink-0">↳</span>
                      <Select
                        value={peticaoMap[name] ?? '__none__'}
                        onValueChange={(val) =>
                          setPeticaoMap((prev) => {
                            const next = { ...prev }
                            if (val === '__none__') delete next[name]
                            else next[name] = val
                            return next
                          })
                        }
                      >
                        <SelectTrigger className={`flex-1 text-sm ${!isMapped ? 'border-amber-300' : ''}`}>
                          <SelectValue placeholder="Selecionar tipo cadastrado..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— importar sem tipo —</SelectItem>
                          {tiposTarefa.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
