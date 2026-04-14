'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Notificacao } from '@/types'
import { cn } from '@/lib/utils/cn'
import { isoToDisplay } from '@/lib/utils/dateMask'

interface NotificationBellProps {
  userId: string
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notificacao[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    fetchNotifications()

    // Realtime subscription
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `destinatario_id=eq.${userId}`,
        },
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('destinatario_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) setNotifications(data as Notificacao[])
  }

  async function markAllRead() {
    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('destinatario_id', userId)
      .eq('lida', false)

    setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })))
  }

  const unreadCount = notifications.filter((n) => !n.lida).length

  const tipoLabel: Record<Notificacao['tipo'], string> = {
    aviso_24h: 'Vence em 24h',
    vencida: 'Prazo vencido',
    remetida: 'Remetido ao Defensor',
  }

  const tipoBgClass: Record<Notificacao['tipo'], string> = {
    aviso_24h: 'border-l-4 border-yellow-400 bg-yellow-50',
    vencida: 'border-l-4 border-red-500 bg-red-50',
    remetida: 'border-l-4 border-blue-500 bg-blue-50',
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                Notificações
                {unreadCount > 0 && (
                  <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    {unreadCount} não lidas
                  </span>
                )}
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  Nenhuma notificação
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'p-4 border-b border-gray-50 transition-colors',
                      tipoBgClass[n.tipo],
                      !n.lida && 'font-medium'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          {tipoLabel[n.tipo]}
                        </p>
                        <p className="text-sm text-gray-800">{n.mensagem}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {isoToDisplay(n.created_at.split('T')[0])}
                        </p>
                      </div>
                      {!n.lida && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
