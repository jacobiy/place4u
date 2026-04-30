// Navbar.jsx
import React, { useState, useEffect } from 'react'
import { BiMenuAltRight } from 'react-icons/bi'
import OutsideClickHandler from 'react-outside-click-handler'
import { useNavigate } from 'react-router-dom'  // Import here

const Navbar = () => {
	const [menuOpened, setMenuOpened] = useState(false)
	const [scrolled, setScrolled] = useState(false)
	const navigate = useNavigate()  // Initialize inside the component

	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 20)
		}
		window.addEventListener('scroll', handleScroll)
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	const GetStarted = () => {
		navigate('/signup')  // Use lowercase for consistency
	}

	const navItems = [
		{ name: 'Residencies', href: '#residencies' },
		{ name: 'Our Value', href: '#value' },
		{ name: 'Contact Us', href: '#contact' },
		{ name: 'Get Started', href: '#get-started' }
	]

	return (
		<nav
			className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
				scrolled
					? 'bg-gray-900/95 backdrop-blur-md shadow-lg py-3'
					: 'bg-transparent py-5'
			}`}
		>
			<div className="flex justify-between items-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{/* Logo */}
				<div style={{
          width: "42px",
          height: "42px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "10px",
          overflow: "hidden",
          background: "transparent"
        }}>
          <img
            src="/logo.png"
            alt="Place4U Logo"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              filter: "brightness(0) invert(1)",
              transition: "transform 0.3s ease-in-out"
            }}
            className="hover:scale-105"
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          />
        </div>
				{/* Desktop Menu - Hidden on mobile */}
				<div className="hidden lg:flex items-center gap-8">
					{navItems.map((item) => (
						<a
							key={item.name}
							href={item.href}
							className="text-gray-300 hover:text-white font-medium 
                       transition-colors duration-300 relative group"
						>
							{item.name}
							<span
								className="absolute -bottom-1 left-0 w-0 h-0.5 
                             bg-gradient-to-r from-blue-400 to-blue-600 
                             group-hover:w-full transition-all duration-300"
							/>
						</a>
					))}

					<button
						className="bg-gradient-to-r from-blue-500 to-blue-600 
                           text-white px-6 py-2.5 rounded-lg font-medium
                           hover:from-blue-600 hover:to-blue-700 
                           transition-all duration-300 shadow-lg 
                           hover:shadow-blue-500/25"
						onClick={GetStarted}
					>
						Get Started
					</button>
				</div>

				{/* Mobile Menu Button */}
				<button
					className="lg:hidden text-white bg-gray-800/50 p-2 rounded-lg 
                     hover:bg-gray-700 transition-colors"
					onClick={() => setMenuOpened(!menuOpened)}
				>
					<BiMenuAltRight size={30} />
				</button>
			</div>

			{/* Mobile Menu Panel */}
			{menuOpened && (
				<OutsideClickHandler onOutsideClick={() => setMenuOpened(false)}>
					<div
						className="lg:hidden fixed top-20 right-4 w-64 
                        bg-gray-900/95 backdrop-blur-md rounded-2xl 
                        shadow-2xl p-6 border border-gray-800
                        animate-slide-down"
					>
						<div className="flex flex-col gap-4">
							{navItems.map((item) => (
								<a
									key={item.name}
									href={item.href}
									className="text-gray-300 hover:text-white font-medium 
                           py-2 px-3 rounded-lg hover:bg-gray-800 
                           transition-all duration-300"
									onClick={() => setMenuOpened(false)}
								>
									{item.name}
								</a>
							))}

							<button
								className="bg-gradient-to-r from-blue-500 to-blue-600 
                               text-white px-4 py-2.5 rounded-lg font-medium
                               hover:from-blue-600 hover:to-blue-700 
                               transition-all duration-300 mt-2"
								onClick={() => {
									setMenuOpened(false)
									GetStarted()
								}}
							>
								Get Started
							</button>
						</div>
					</div>
				</OutsideClickHandler>
			)}
		</nav>
	)
}

export default Navbar