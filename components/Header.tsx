'use client'

import Link from 'next/link'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto w-full max-w-md px-4 h-14 flex items-center justify-between">
        <Link
          href="/home"
          className="text-[18px] font-semibold tracking-tight text-gray-900 hover:opacity-80 transition-opacity"
        >
          stockast
        </Link>
        <div className="flex items-center space-x-4">
          {/* Additional header items if needed */}
        </div>
      </div>
    </header>
  )
}
