// Navbar.jsx - Place4U Dark Sleek Navbar
import React, { useState, useEffect } from 'react'
import { BiMenuAltRight } from 'react-icons/bi'
import { HiX, HiArrowRight } from 'react-icons/hi'
import OutsideClickHandler from 'react-outside-click-handler'
import { Link, useNavigate } from 'react-router-dom'

const Navbar = () => {
	const [menuOpened, setMenuOpened] = useState(false)
	const [scrolled, setScrolled] = useState(false)
	const navigate = useNavigate()

	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 15)
		}
		window.addEventListener('scroll', handleScroll)
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	const navItems = [
		{ name: 'Featured Spaces', href: '#residencies' },
		{ name: 'How It Works', href: '#how-it-works' },
		{ name: 'About Us', href: '#about' },
		{ name: 'WhatsApp Desk', href: '#whatsapp-desk' }
	]

	return (
		<nav
			className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
				scrolled
					? 'bg-slate-950/95 backdrop-blur-xl border-b border-white/[0.08] py-2.5 shadow-2xl shadow-black/50'
					: 'bg-slate-950/85 backdrop-blur-lg py-4 border-b border-white/[0.06]'
			}`}
		>
			<div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between lg:grid lg:grid-cols-[1fr_auto_1fr]">
				{/* Brand Logo */}
				<Link
					to="/"
					className="flex items-center gap-3 group focus:outline-none py-1 justify-self-start ml-2 sm:ml-4 lg:ml-10"
					aria-label="Place4U - Home"
				>
					<img
						src="/logo.png"
						alt="Place4U Logo"
						className="h-9 sm:h-10 lg:h-11 w-auto object-contain transition-all duration-300 group-hover:scale-105 filter brightness-0 invert drop-shadow-[0_2px_8px_rgba(255,255,255,0.2)]"
					/>
				</Link>

				{/* Desktop Menu — centered */}
				<div className="hidden lg:flex items-center justify-center gap-7 justify-self-center">
					{navItems.map((item) => (
						<a
							key={item.name}
							href={item.href}
							className="text-sm font-medium text-slate-300 hover:text-white transition-colors relative py-1 group whitespace-nowrap"
						>
							{item.name}
							<span className="absolute bottom-0 left-0 w-0 h-[2px] bg-blue-500 transition-all duration-200 group-hover:w-full rounded-full" />
						</a>
					))}
				</div>

				{/* Desktop Auth CTAs — right */}
				<div className="hidden lg:flex items-center justify-end gap-3 justify-self-end">
					<Link
						to="/login"
						className="px-4 py-2 text-sm font-medium text-slate-200 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all border border-transparent hover:border-white/10"
					>
						Sign In
					</Link>
					<button
						onClick={() => navigate('/signup')}
						className="btn-tactile inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-lg shadow-blue-600/25 border border-blue-400/30"
					>
						<span>Get Matched</span>
						<HiArrowRight className="w-4 h-4" />
					</button>
				</div>

				{/* Mobile Menu Toggle Button */}
				<button
					className="lg:hidden text-slate-200 bg-white/[0.06] border border-white/10 p-2.5 rounded-xl hover:bg-white/[0.1] active:scale-95 transition-all"
					onClick={() => setMenuOpened(!menuOpened)}
					aria-label="Toggle Navigation Menu"
				>
					{menuOpened ? <HiX size={22} /> : <BiMenuAltRight size={22} />}
				</button>
			</div>

			{/* Mobile Drawer */}
			{menuOpened && (
				<OutsideClickHandler onOutsideClick={() => setMenuOpened(false)}>
					<div className="lg:hidden fixed top-[70px] inset-x-4 max-w-md mx-auto bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl p-6 border border-white/10 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
						<div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.08]">
							<img
								src="/logo.png"
								alt="Place4U Logo"
								className="h-10 w-auto object-contain filter brightness-0 invert"
							/>
						</div>

						<div className="flex flex-col gap-2.5">
							{navItems.map((item) => (
								<a
									key={item.name}
									href={item.href}
									className="text-slate-200 hover:text-white font-medium py-2 px-3 rounded-xl hover:bg-white/[0.06] transition-all flex items-center justify-between text-sm"
									onClick={() => setMenuOpened(false)}
								>
									<span>{item.name}</span>
									<HiArrowRight className="w-4 h-4 text-slate-500" />
								</a>
							))}

							<div className="pt-4 mt-2 border-t border-white/[0.08] flex flex-col gap-2.5">
								<button
									onClick={() => {
										setMenuOpened(false)
										navigate('/login')
									}}
									className="w-full py-2.5 text-center text-sm font-medium text-slate-200 hover:text-white bg-white/[0.04] border border-white/10 rounded-xl transition-all"
								>
									Sign In to Portal
								</button>
								<button
									onClick={() => {
										setMenuOpened(false)
										navigate('/signup')
									}}
									className="w-full py-3 text-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-600/30"
								>
									Get Matched Free
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