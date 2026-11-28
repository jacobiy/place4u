// ErrorScreen.jsx — full-screen failure surface for the app-level boundary.
//
// Rendered by ChunkErrorBoundary in App.jsx, so it deliberately depends on
// nothing that could itself be broken: no router hooks, no context, no data
// fetching. Links are plain <a href> and the only images are public assets.
//
// Two kinds:
//   module  — a chunk/dynamic import failed (stale deploy, offline, ad blocker).
//             The boundary auto-reloads once before this is shown.
//   runtime — an unexpected React error. "Try again" re-mounts the tree.
//
// Styling follows the public site (About / legal / 404): #faf8ff surface,
// Space Grotesk headings, #006194 accent.
import React from 'react'
import { AlertTriangle, Home, RotateCw, WifiOff } from 'lucide-react'

const COPY = {
  module: {
    badge: 'Module loading interrupted',
    title: 'We couldn’t finish loading this page.',
    body: 'A network interruption or an ad blocker stopped part of the app from downloading. Reloading usually fixes it.',
    hint: 'If it keeps happening, allow place4u.xyz in your ad blocker and reload.',
    Icon: WifiOff
  },
  runtime: {
    badge: 'Unexpected error',
    title: 'Something went wrong.',
    body: 'This view hit an error it could not recover from. Reloading starts the app fresh — nothing on your account has been changed.',
    hint: 'Still stuck? Email support@place4u.xyz and tell us what you were doing.',
    Icon: AlertTriangle
  }
}

export default function ErrorScreen({
  kind = 'runtime',
  detail = '',
  onRetry,
  onReload,
  homeHref = '/'
}) {
  const copy = COPY[kind] || COPY.runtime
  const Icon = copy.Icon
  const reload = onReload || (() => window.location.reload())
  const isRuntime = kind === 'runtime'

  const primary =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-[#006194] hover:bg-[#004b73] text-white text-sm font-semibold px-5 py-3 shadow-[0_18px_34px_-24px_rgba(0,97,148,0.9)] transition-colors'
  const secondary =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-[#f2f7ff] text-[#006194] text-sm font-semibold px-5 py-3 border border-[#dae2fd] transition-colors'
  const ghost =
    'inline-flex items-center justify-center gap-2 rounded-xl text-[#006194] hover:bg-white text-sm font-semibold px-4 py-3 border border-transparent hover:border-[#dae2fd] transition-colors'

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] font-sans antialiased flex flex-col">
      <header className="px-6 lg:px-12 py-6">
        <a href={homeHref} className="inline-flex items-center gap-2" aria-label="Place4U home">
          <img
            src="/logo.png"
            alt="Place4U"
            className="h-9 sm:h-10 w-auto object-contain brightness-0"
          />
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-20 pt-4">
        <div className="w-full max-w-xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white border border-[#dae2fd] px-3.5 py-1 text-xs font-semibold text-[#006194] shadow-sm">
            <Icon className="w-4 h-4" aria-hidden="true" />
            {copy.badge}
          </span>

          <h1 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold tracking-tight leading-[1.15] mt-5 text-balance">
            {copy.title}
          </h1>

          <p className="text-sm sm:text-base text-[#3f4850] leading-relaxed mt-4 max-w-md mx-auto text-balance">
            {copy.body}
          </p>

          {detail && isRuntime && (
            <div className="mt-6 rounded-xl border border-[#f6d4d4] bg-[#fff7f7] p-3 text-left">
              <p className="text-[11px] font-mono text-[#b91c1c] break-words line-clamp-3">
                {detail}
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {isRuntime && typeof onRetry === 'function' && (
              <button type="button" onClick={onRetry} className={primary}>
                Try again
              </button>
            )}

            <button
              type="button"
              onClick={reload}
              className={isRuntime && typeof onRetry === 'function' ? secondary : primary}
            >
              <RotateCw className="w-4 h-4" aria-hidden="true" />
              Reload page
            </button>

            <a href={homeHref} className={ghost}>
              <Home className="w-4 h-4" aria-hidden="true" />
              Back to home
            </a>
          </div>

          {copy.hint && (
            <p className="text-xs text-[#707881] leading-relaxed mt-6 max-w-md mx-auto">
              {copy.hint}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
