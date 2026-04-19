export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 40%, #a5d6a7 100%)' }}
    >
      {children}
    </div>
  )
}
