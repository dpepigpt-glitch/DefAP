// SGP-D Domain Types

export type UserRole = 'defensor' | 'executor'
export type TarefaStatus = 'pendente' | 'remetido_ao_defensor' | 'protocolado'
export type ColunaTipo = 'texto' | 'numero' | 'data' | 'lista'
export type SeloTipo = 'flamengo' | 'diamante' | 'ouro' | 'prata' | 'bronze' | null
export type PrazoStatusColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  email: string
  created_at: string
  updated_at: string
}

export interface Unidade {
  id: string
  nome: string
  defensor_id: string
  created_at: string
  updated_at: string
}

export interface UnidadeMembro {
  id: string
  unidade_id: string
  profile_id: string
  created_at: string
  profile?: Profile
}

export interface TipoTarefa {
  id: string
  unidade_id: string
  nome: string
  ativo: boolean
  created_at: string
}

export interface ColunaCustomizada {
  id: string
  unidade_id: string
  nome: string
  tipo: ColunaTipo
  opcoes: string[] | null
  obrigatorio: boolean
  ordem: number
  ativo: boolean
  created_at: string
}

export interface Tarefa {
  id: string
  unidade_id: string
  numero_processo: string
  assistido: string
  data_intimacao: string
  tipo_tarefa_id: string | null
  prazo_final_pje: string
  prazo_interno: string           // ISO datetime string
  executor_id: string | null
  status: TarefaStatus
  arquivo_url: string | null
  arquivo_nome: string | null
  alert_24h_sent: boolean
  alert_overdue_sent: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  protocolado_at: string | null
  protocolado_by: string | null
  // Joined fields
  executor?: Profile
  tipo_tarefa?: TipoTarefa
  valores_customizados?: TarefaValorCustomizado[]
}

export interface TarefaValorCustomizado {
  id: string
  tarefa_id: string
  coluna_id: string
  valor: string | null
  coluna?: ColunaCustomizada
}

export interface TarefaLog {
  id: string
  tarefa_id: string
  changed_by: string | null
  old_status: TarefaStatus | null
  new_status: TarefaStatus
  created_at: string
}

export interface Notificacao {
  id: string
  tarefa_id: string | null
  destinatario_id: string
  tipo: 'aviso_24h' | 'vencida' | 'remetida'
  mensagem: string
  lida: boolean
  created_at: string
  tarefa?: Pick<Tarefa, 'numero_processo' | 'assistido'>
}

// Form types
export interface TarefaFormValues {
  numero_processo: string
  assistido: string
  data_intimacao: string
  tipo_tarefa_id: string
  prazo_final_pje: string
  prazo_interno: string
  executor_id: string
  valores_customizados?: Record<string, string>
}

export interface UnidadeFormValues {
  nome: string
}

export interface TipoTarefaFormValues {
  nome: string
}

export interface ColunaFormValues {
  nome: string
  tipo: ColunaTipo
  opcoes?: string
  obrigatorio: boolean
}

// Report types
export interface ExecutorPerformance {
  executor: Profile
  total_tarefas: number
  no_prazo: number
  atrasadas: number
  pct_no_prazo: number
  avg_pct_tempo_usado: number
  selo: SeloTipo
}

// Unidade with stats
export interface UnidadeComStats extends Unidade {
  total_tarefas: number
  pendentes: number
  vencidas: number
  membros_count: number
}
