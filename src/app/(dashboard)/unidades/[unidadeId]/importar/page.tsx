'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { importarTarefas, type TarefaPayload } from '@/actions/tarefas'
import { maskProcesso } from '@/lib/utils/processoMask'
import { dateToISO } from '@/lib/utils/dateMask'
import { toTitleCase } from '@/lib/utils/titleCase'
import { calcPrazoFinal } from '@/lib/utils/workdays'
import { Upload, FileSpreadsheet, ArrowLeft, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

// Column name mapping
const COLUMN_MAP: Record<string, string> = {
  'processo': 'numero_processo',
  'número do processo': 'numero_processo',
  'numero do processo': 'numero_processo',
  'n processo': 'numero_processo',
  'nº processo': 'numero_processo',
  'assistido': 'assistido',
  'nome': 'assistido',
  'data do ciente': 'data_intimacao',
  'ciente': 'data_intimacao',
  'data intimação': 'data_intimacao',
  'data intimacao': 'data_intimacao',
  'data de intimação': 'data_intimacao',
  'data de intimacao': 'data_intimacao',
  'início': 'inicio',
  'inicio': 'inicio',
  'petição': 'tipo_peticao_nome',
  'peticao': 'tipo_peticao_nome',
  'tipo de petição': 'tipo_peticao_nome',
  'tipo de peticao': 'tipo_peticao_nome',
  'tipo petição': 'tipo_peticao_nome',
  'tipo peticao': 'tipo_peticao_nome',
  'tipo': 'tipo_peticao_nome',
  'prazo': 'prazo_dias',
  'prazo final pje': 'prazo_final_pje',
  'prazo pje': 'prazo_final_pje',
  'final do prazo': 'prazo_final_pje',
  'data da final do prazo': 'prazo_final_pje',
  'data final do prazo': 'prazo_final_pje',
  'final': 'prazo_final_pje',
  'executor': 'executor_nome',
  'responsável': 'executor_nome',
  'responsavel': 'executor_nome',
  'prazo interno': 'prazo_interno',
  'protocolo': 'status_raw',
  'status': 'status_raw',
}

// Normalize petição values — fix typos and abbreviations
const PETICAO_MAP: Record<string, string> = {
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

function _normalizePeticao(val: string): string {
  const lower = val.toLowerCase().trim()
  return PETICAO_MAP[lower] ?? toTitleCase(val)
}

function parseStatusRaw(val: string): 'pendente' | 'remetido_ao_defensor' | 'protocolado' {
  const v = (val ?? '').toLowerCase().trim()
  if (v.includes('protocol')) return 'protocolado'
  if (v.includes('remetid')) return 'remetido_ao_defensor'
  return 'pendente'
}

type ParsedRow = Record<string, string>

// Convert cell to DD/MM/YYYY, detecting and correcting American format MM/DD/YYYY
function cellToDateString(val: unknown): string {
  if (val == null || val === '') return ''
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, '0')
    const m = String(val.getMonth() + 1).padStart(2, '0')
    return `${d}/${m}/${val.getFullYear()}`
  }
  const str = String(val).trim()
  if (!str || str === 'undefined') return ''
  // Excel serial
  const serial = Number(str)
  if (!isNaN(serial) && serial > 25000 && serial < 100000) {
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000))
    return `${String(date.getUTCDate()).padStart(2,'0')}/${String(date.getUTCMonth()+1).padStart(2,'0')}/${date.getUTCFullYear()}`
  }
  // ISO YYYY-MM-DD
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`
  // DD/MM/YYYY or MM/DD/YYYY — detect by checking if second segment > 12
  const parts = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (parts) {
    const [, a, b, y] = parts
    const ap = a.padStart(2,'0'), bp = b.padStart(2,'0')
    // If second number > 12, it must be a day → format is MM/DD/YYYY
    if (parseInt(b) > 12) return `${bp}/${ap}/${y}`
    return `${ap}/${bp}/${y}`
  }
  return str
}

function cellToString(val: unknown): string {
  if (val == null) return ''
  if (val instanceof Date) return cellToDateString(val)
  return String(val)
}

export default function ImportarPage() {
  const params = useParams()
  const router = useRouter()
  const unidadeId = params.unidadeId as string
  const fileRef = useRef<HTMLInputElement>(null)

  const [preview, setPreview] = useState<ParsedRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ inserted: number; errors: { row: number; message: string }[] } | null>(null)

  async function parseFile(file: File): Promise<{ rows: ParsedRow[]; hdrs: string[] }> {
    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      const { default: Papa } = await import('papaparse')
      const text = await file.text()
      const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true })
      const rawData = parsed.data as string[][]
      if (rawData.length < 2) return { rows: [], hdrs: [] }
      const hdrs = rawData[0].map((h) => h.toLowerCase().trim())
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
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][]
      if (data.length < 2) return { rows: [], hdrs: [] }
      const hdrs = (data[0] as unknown[]).map((h) => cellToString(h).toLowerCase().trim())
      const rows = data.slice(1).map((row) => {
        const obj: ParsedRow = {}
        hdrs.forEach((h, i) => { obj[h] = cellToString((row as unknown[])[i]) })
        return obj
      })
      return { rows, hdrs }
    }
  }

  async function handleFile(file: File) {
    setFileName(file.name)
    setResult(null)
    try {
      const { rows, hdrs } = await parseFile(file)
      setHeaders(hdrs)
      setPreview(rows.slice(0, 5))
    } catch (e) {
      console.error('Error parsing file:', e)
    }
  }

  function rowToPayload(row: ParsedRow): Omit<TarefaPayload, 'unidade_id'> {
    const mapped: Record<string, string> = {}
    Object.entries(row).forEach(([key, val]) => {
      const mk = COLUMN_MAP[key.toLowerCase().trim()]
      if (mk) mapped[mk] = val
    })

    const inicioStr = cellToDateString(mapped.inicio ?? '')
    const prazoDias = parseInt(mapped.prazo_dias ?? '', 10)
    let prazoFinalStr = cellToDateString(mapped.prazo_final_pje ?? '')

    // Auto-calc Final do Prazo from Início + Prazo (dias)
    if (!prazoFinalStr && inicioStr && prazoDias > 0) {
      prazoFinalStr = calcPrazoFinal(inicioStr, prazoDias)
    }

    const prazoFinalISO = dateToISO(prazoFinalStr)
    const inicioISO = dateToISO(inicioStr)
    const dataIntimacaoISO =
      dateToISO(cellToDateString(mapped.data_intimacao ?? '')) || inicioISO || prazoFinalISO
    const prazoInternoISO =
      dateToISO(cellToDateString(mapped.prazo_interno ?? '')) || prazoFinalISO

    return {
      numero_processo: maskProcesso(mapped.numero_processo ?? ''),
      assistido: toTitleCase(mapped.assistido ?? ''),
      data_intimacao: dataIntimacaoISO,
      inicio: inicioISO || undefined,
      prazo_dias: prazoDias > 0 ? prazoDias : undefined,
      prazo_final_pje: prazoFinalISO,
      prazo_interno: prazoInternoISO ? prazoInternoISO + 'T17:00:00' : '',
      status: parseStatusRaw(mapped.status_raw ?? ''),
    } as Omit<TarefaPayload, 'unidade_id'>
  }

  async function handleImport() {
    if (preview.length === 0) return
    setLoading(true)
    const file = fileRef.current?.files?.[0]
    if (!file) { setLoading(false); return }

    try {
      const { rows } = await parseFile(file)
      const payloads = rows
        .filter((row) => {
          const mapped: Record<string, string> = {}
          Object.entries(row).forEach(([k, v]) => {
            const mk = COLUMN_MAP[k.toLowerCase().trim()]
            if (mk) mapped[mk] = v
          })
          return (mapped.numero_processo ?? '').trim() !== ''
        })
        .map(rowToPayload)

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
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/unidades/${unidadeId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importar Tarefas</h1>
          <p className="text-gray-500 text-sm">Upload de CSV ou Excel</p>
        </div>
      </div>

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
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    {result.errors.length} erro{result.errors.length !== 1 ? 's' : ''}:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e.message}</li>)}
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
    </div>
  )
}
