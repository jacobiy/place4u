// Navbar.jsx - Place4U Dark Sleek Navbar
import React, { useState } from 'react'
import { BiMenuAltRight } from 'react-icons/bi'
import { HiX, HiArrowRight } from 'react-icons/hi'
import OutsideClickHandler from 'react-outside-click-handler'
import { Link, useLocation } from 'react-router-dom'
import { openAuthModal } from '../utils/authModal'

const Navbar = () => {
	const [menuOpened, setMenuOpened] = useState(false)
	const { pathname } = useLocation()

	// The navbar is shared by every public page, but its items are landing-page
	// anchors. Rendered as a bare `#id` on any other route they change only the
	// hash and scroll nowhere, so off "/" they point at "/#id" and the landing
	// page's useHashScroll does the scrolling.
	const navItems = [
		{ name: 'Featured Spaces', hash: '#residencies' },
		{ name: 'How It Works', hash: '#how-it-works' },
		{ name: 'WhatsApp Desk', hash: '#whatsapp-desk' }
	].map((item) => ({
		...item,
		href: pathname === '/' ? item.hash : `/${item.hash}`
	}))

	return (
		<nav className="fixed top-0 left-0 w-full z-50 bg-[#f7f8f5]/95 backdrop-blur-xl border-b border-[#d5e0df] shadow-[0_8px_24px_-22px_rgba(24,55,65,0.55)]">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 min-h-[72px] flex items-center justify-between lg:grid lg:grid-cols-[1fr_auto_1fr]">
				{/* Brand Logo */}
				<Link
					to="/"
					className="flex items-center gap-3 group focus:outline-none py-1 justify-self-start"
					aria-label="Place4U home"
				>
					<img
						src="/logo.png"
						alt="Place4U Logo"
						className="h-9 sm:h-10 lg:h-11 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02] brightness-0"
					/>
				</Link>

				{/* Desktop Menu - centered */}
				<div className="hidden lg:flex items-center justify-center gap-7 justify-self-center">
					{navItems.map((item) => (
						<Link
							key={item.name}
							to={item.href}
							className="text-sm font-medium text-[#47545a] hover:text-[#006194] transition-colors relative py-1 group whitespace-nowrap"
						>
							{item.name}
							<span className="absolute bottom-0 left-0 w-0 h-px bg-[#006194] transition-all duration-200 group-hover:w-full" />
						</Link>
					))}
				</div>

				{/* Desktop Auth CTAs - right */}
				<div className="hidden lg:flex items-center justify-end gap-3 justify-self-end">
					<button
						type="button"
						onClick={() => openAuthModal('login')}
						className="px-4 py-2 text-sm font-medium text-[#28434e] hover:text-[#006194] rounded-lg transition-colors"
					>
						Sign In
					</button>
					<button
						onClick={() => openAuthModal('signup')}
						className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#006194] hover:bg-[#004b73] transition-colors duration-200 active:scale-[0.98]"
					>
						<span>Get Matched</span>
						<HiArrowRight className="w-4 h-4" />
					</button>
				</div>

				{/* Mobile Menu Toggle Button */}
				<button
					className="lg:hidden text-[#28434e] bg-white/70 border border-[#d5e0df] p-2.5 rounded-lg hover:bg-white active:scale-95 transition-all"
					onClick={() => setMenuOpened(!menuOpened)}
					aria-label="Toggle navigation menu"
					aria-expanded={menuOpened}
					aria-controls="public-navigation-drawer"
				>
					{menuOpened ? <HiX size={22} /> : <BiMenuAltRight size={22} />}
				</button>
			</div>

			{/* Mobile Drawer */}
			{menuOpened && (
				<OutsideClickHandler onOutsideClick={() => setMenuOpened(false)}>
					<div id="public-navigation-drawer" className="lg:hidden fixed top-[70px] inset-x-4 max-w-md mx-auto bg-[#f7f8f5]/98 backdrop-blur-2xl rounded-xl shadow-[0_24px_56px_-34px_rgba(24,55,65,0.45)] p-6 border border-[#d5e0df] z-50">
						<div className="flex items-center justify-between pb-4 mb-4 border-b border-[#d5e0df]">
							<img
								src="/logo.png"
								alt="Place4U Logo"
								className="h-10 w-auto object-contain brightness-0"
							/>
						</div>

						<div className="flex flex-col gap-2.5">
							{navItems.map((item) => (
								<Link
									key={item.name}
									to={item.href}
								className="text-[#28434e] hover:text-[#006194] font-medium py-2.5 px-3 rounded-lg hover:bg-[#e7eef0] transition-colors flex items-center justify-between text-sm"
									onClick={() => setMenuOpened(false)}
								>
									<span>{item.name}</span>
								<HiArrowRight className="w-4 h-4 text-[#75858a]" />
								</Link>
							))}

							<div className="pt-4 mt-2 border-t border-[#d5e0df] flex flex-col gap-2.5">
								<button
									onClick={() => {
										setMenuOpened(false)
									openAuthModal('login')
									}}
									className="w-full py-2.5 text-center text-sm font-medium text-[#28434e] hover:text-[#006194] bg-white border border-[#d5e0df] rounded-lg transition-colors"
								>
									Sign In to Portal
								</button>
								<button
									onClick={() => {
										setMenuOpened(false)
									openAuthModal('signup')
									}}
									className="w-full py-3 text-center text-sm font-semibold text-white bg-[#006194] hover:bg-[#004b73] rounded-lg transition-colors"
								>
								Get matched
								</button>
							</div>
						</div>
					</div>
				</OutsideClickHandler>
			)}
		</nav>
	)
}

export default Navbar
