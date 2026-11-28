// NotFound.jsx - Place4U /404
//
// Replaces the old `<Route path="*" element={<Navigate to="/" />} />` catch-all.
// Silently redirecting an unknown URL to the home page hides broken links from
// the person who followed them and tells search engines every bad URL is a
// duplicate of the home page. This page keeps the address, says what happened,
// and offers the four destinations people actually arrive looking for.
//
// Theme matches the public site (About/legal pages): Primary #006194,
// Secondary #006c4a, Surface #faf8ff. Keep it that way.
import React from 'react'
import { Link } from 'react-router-dom'
import { HiArrowRight, HiHome, HiMail, HiPhone, HiShieldCheck } from 'react-icons/hi'
import Navbar from '../../component/Navbar'
import Footer from '../../component/Footer'

const SUPPORT_EMAIL = 'support@place4u.xyz'
const SUPPORT_PHONE = '082 482 2611'

// `to` for router destinations, `href` for anything external (mailto here).
const DESTINATIONS = [
  {
    title: 'Featured spaces',
    description: 'Reviewed listings that are live right now.',
    to: '/#residencies'
  },
  {
    title: 'How it works',
    description: 'One application, matched to homes we have checked.',
    to: '/#how-it-works'
  },
  {
    title: 'About Place4U',
    description: 'The people who review every listing before it goes live.',
    to: '/about'
  },
  {
    title: 'Support desk',
    description: `WhatsApp ${SUPPORT_PHONE} or email ${SUPPORT_EMAIL}.`,
    href: `mailto:${SUPPORT_EMAIL}`
  }
]

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] font-sans antialiased selection:bg-[#006194] selection:text-white flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2.5 focus:rounded-lg focus:bg-[#006194] focus:text-white focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Skip to content
      </a>

      <Navbar />

      <main
        id="main"
        className="relative flex-1 overflow-hidden pt-40 md:pt-44 pb-16 md:pb-20 px-6 lg:px-12 bg-gradient-to-b from-[#cce5ff]/30 via-[#faf8ff] to-[#faf8ff]"
      >
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 bg-white/80 text-[#006194] px-3.5 py-1 rounded-full text-xs font-semibold border border-[#93ccff]/60 shadow-sm">
            <HiShieldCheck className="w-4 h-4" />
            Error 404 &middot; Page not found
          </span>

          <h1 className="font-['Space_Grotesk'] text-4xl sm:text-5xl font-bold tracking-tight leading-[1.12] mt-5 text-balance">
            This address doesn&rsquo;t lead to a home.
          </h1>

          <p className="text-sm sm:text-base text-[#3f4850] leading-relaxed mt-4 max-w-xl mx-auto text-balance">
            The link may be out of date, or the page may have been taken down.
            Nothing has changed on your account &mdash; pick a direction below
            and you&rsquo;ll be back on solid ground.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-[#006194] hover:bg-[#004b73] text-white text-sm font-semibold px-5 py-3 shadow-[0_18px_34px_-24px_rgba(0,97,148,0.9)] transition-colors"
            >
              <HiHome className="w-4 h-4" />
              Back to home
            </Link>
            <Link
              to="/#residencies"
              className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-[#f2f7ff] text-[#006194] text-sm font-semibold px-5 py-3 border border-[#dae2fd] transition-colors"
            >
              Browse verified spaces
              <HiArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="max-w-4xl mx-auto mt-12 md:mt-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#707881] text-center">
            Or pick up where you left off
          </p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DESTINATIONS.map((item) => {
              const content = (
                <>
                  <span className="min-w-0">
                    <span className="block font-['Space_Grotesk'] text-base font-bold text-[#131b2e]">
                      {item.title}
                    </span>
                    <span className="block text-xs text-[#3f4850] leading-relaxed mt-1">
                      {item.description}
                    </span>
                  </span>
                  <HiArrowRight className="w-4 h-4 shrink-0 mt-1 text-[#93ccff] group-hover:text-[#006194] group-hover:translate-x-0.5 transition-all" />
                </>
              )

              const className =
                'group flex items-start justify-between gap-4 rounded-2xl bg-white border border-[#dae2fd] p-5 text-left transition-all hover:border-[#93ccff] hover:shadow-[0_18px_38px_-30px_rgba(0,97,148,0.55)]'

              return item.to ? (
                <Link key={item.title} to={item.to} className={className}>
                  {content}
                </Link>
              ) : (
                <a key={item.title} href={item.href} className={className}>
                  {content}
                </a>
              )
            })}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-2 text-xs text-[#707881]">
            <span className="inline-flex items-center gap-2">
              <HiMail className="w-4 h-4 text-[#006194]" />
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-semibold text-[#006194] hover:text-[#004b73] transition-colors"
              >
                {SUPPORT_EMAIL}
              </a>
            </span>
            <span className="hidden sm:inline text-[#dae2fd]">|</span>
            <span className="inline-flex items-center gap-2">
              <HiPhone className="w-4 h-4 text-[#006194]" />
              {SUPPORT_PHONE}
            </span>
          </div>

          <p className="mt-3 text-center text-xs text-[#707881]">
            Followed a link that should work? Tell us and we&rsquo;ll fix it.
          </p>
        </div>
      </main>

      <Footer theme="light" />
    </div>
  )
}
