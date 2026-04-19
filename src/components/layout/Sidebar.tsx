'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import {
  Building2,
  BarChart3,
  LogOut,
  Scale,
} from 'lucide-react'
import type { Profile } from '@/types'

interface SidebarProps {
  profile: Profile | null
  onLogout: () => void
}

const navItems = [
  { href: '/unidades', label: 'Unidades', icon: Building2 },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
]

export function Sidebar({ profile, onLogout }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col z-40"
      style={{ background: 'linear-gradient(180deg, #0f3d22 0%, #14532d 100%)' }}
    >
      {/* Logo */}
      <div className="p-6 border-b border-green-800/60">
        <div className="flex items-center gap-3">
          <div className="bg-green-600 p-2 rounded-lg shadow-sm">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white tracking-wide">SGP-D</p>
            <p className="text-xs text-green-300 leading-tight">Gestão de Prazos</p>
          </div>
        </div>
        <p className="text-[10px] text-green-400 mt-3 leading-tight font-medium uppercase tracking-wider">
          Defensoria Pública
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-green-100 hover:bg-green-800/60 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User info + logout */}
      <div className="p-4 border-t border-green-800/60">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold text-white shadow-sm">
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {profile?.full_name ?? 'Usuário'}
            </p>
            <p className="text-xs text-green-300 capitalize">
              {profile?.role === 'defensor' ? 'Defensor(a)' : 'Executor(a)'}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-200 hover:text-white hover:bg-green-800/60 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
