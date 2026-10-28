// useHashScroll.js — scroll to `#id` links that arrive via client-side routing.
//
// Why this exists: React Router changes the URL with history.pushState, and
// pushState does NOT perform the native "jump to the anchor" scroll. So a link
// like <Link to="/about#donald-masine"> opens the page at the top. Every route
// that renders anchor targets and can be reached with a hash needs this.
//
// The retry loop is deliberate: routes are lazy-loaded (React.lazy + Suspense),
// so the target element usually does not exist on the first frame. We poll
// briefly instead of guessing a delay, then give up quietly — a missing anchor
// must never break the page.
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const MAX_ATTEMPTS = 12
const RETRY_MS = 100

const useHashScroll = () => {
	const { hash } = useLocation()

	useEffect(() => {
		if (!hash) {
			// A fresh navigation to the page without a hash should start at the
			// top; without this the previous scroll position is kept.
			window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
			return
		}

		const id = decodeURIComponent(hash.replace(/^#/, ''))
		let attempts = 0
		let cancelled = false

		const tryScroll = () => {
			if (cancelled) return
			const el = document.getElementById(id)
			if (el) {
				el.scrollIntoView({ behavior: 'smooth', block: 'start' })
				return
			}
			if (attempts++ < MAX_ATTEMPTS) {
				window.setTimeout(tryScroll, RETRY_MS)
			}
		}

		tryScroll()

		return () => {
			cancelled = true
		}
	}, [hash])
}

export default useHashScroll
