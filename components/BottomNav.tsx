'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, User } from 'lucide-react'

const navItems = [
  { href: '/home', label: '홈', icon: Home },
  { href: '/briefing', label: '브리핑', icon: FileText },
  { href: '/mypage', label: '마이페이지', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center justify-around h-16">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center flex-1 py-2 px-1 text-xs font-medium transition-colors ${
              pathname === href
                ? 'text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span
              className={`mb-1 inline-flex h-9 w-9 items-center justify-center rounded-2xl transition-colors ${
                pathname === href ? 'bg-primary/10' : 'bg-transparent'
              }`}
            >
              <Icon className="h-5 w-5" />
            </span>
            {label}
          </Link>
        ))}
        </div>
      </div>
    </nav>
  )
}
