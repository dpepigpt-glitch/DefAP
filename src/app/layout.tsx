import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SGP-D — Sistema de Gestão de Prazos',
  description: 'Sistema de gestão de prazos jurídicos para Defensoria Pública',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  )
}
