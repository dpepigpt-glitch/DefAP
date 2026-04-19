'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from './Sidebar'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import type { Profile } from '@/types'

interface DashboardShellProps {
  profile: Profile | null
  children: React.ReactNode
}

export function DashboardShell({ profile, children }: DashboardShellProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar profile={profile} onLogout={handleLogout} />

      {/* Main content area */}
      <div className="ml-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white border-b border-green-100 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1 h-6 rounded-full bg-green-600 inline-block" />
            <span className="text-sm font-semibold text-green-800 tracking-wide">
              Defensoria Pública
            </span>
          </div>
          <div className="flex items-center gap-3">
            {profile && <NotificationBell userId={profile.id} />}
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
