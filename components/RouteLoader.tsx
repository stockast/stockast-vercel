'use client'

export function RouteLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-gray-900 rounded-full animate-[loader_1.2s_ease-in-out_infinite]" />
        </div>
        <div className="mt-6 space-y-3">
          <div className="h-10 rounded-xl bg-white shadow-sm border animate-pulse" />
          <div className="h-24 rounded-2xl bg-white shadow-sm border animate-pulse" />
          <div className="h-24 rounded-2xl bg-white shadow-sm border animate-pulse" />
        </div>
        <style jsx global>{`
          @keyframes loader {
            0% { transform: translateX(-20%); }
            50% { transform: translateX(140%); }
            100% { transform: translateX(-20%); }
          }
        `}</style>
      </div>
    </div>
  )
}
