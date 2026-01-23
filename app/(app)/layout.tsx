import { Header } from '@/components/Header'
import { BottomNav } from '@/components/BottomNav'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh bg-gray-50">
      <Header />
      <main className="pb-16">
        <div className="mx-auto w-full max-w-md px-4 py-4">{children}</div>
      </main>
      <BottomNav />
    </div>
  )
}
