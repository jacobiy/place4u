import React from 'react'
import { HiLocationMarker } from 'react-icons/hi'
import CountUp from 'react-countup'
import { motion } from 'framer-motion'
import Navbar from '../../component/Navbar'
import Value from '../../component/Values'
import Services from '../../component/Services'
import Footer from '../../component/Footer'

const Landing = () => {
	return (
		<section
			className="relative text-white h-screen"
			style={{
				backgroundImage: "url('/download.png')",
				backgroundSize: 'cover',
				backgroundPosition: 'center',
				backgroundRepeat: 'no-repeat',
				backgroundAttachment: 'fixed'
			}}
		>
			<div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 via-gray-900/55 to-gray-900/80" />
			<Navbar />
			{/* Added pt-24 to push content below fixed navbar */}
			<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-15 sm:pt-28 lg:pt-32 pb-32">
				<div className="max-w-2xl">
					<div className="relative">
						<div className="absolute w-16 h-16 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full -left-5 -top-6 -z-10 blur-sm opacity-80" />
						<motion.h1
							initial={{ y: '2rem', opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							transition={{ duration: 1.6, type: 'spring' }}
							className="font-semibold text-4xl sm:text-5xl lg:text-6xl leading-tight lg:leading-[4rem] drop-shadow"
						>
							Explore <br /> Your Dream <br /> Property
						</motion.h1>
					</div>

					<div className="mt-5 flex flex-col gap-2">
						<span className="text-gray-200 text-sm sm:text-base drop-shadow">
							Your Gateway to Extraordinary Living
						</span>
						<span className="text-gray-200 text-sm sm:text-base drop-shadow">
							Discover Unparalleled Properties that Define Luxury
						</span>
					</div>

					<div className="mt-7 flex items-center bg-white/95 rounded-lg shadow-lg border border-white/20 p-2 sm:p-3 justify-between w-full max-w-md backdrop-blur">
						<div className="flex items-center gap-2 flex-1">
							<HiLocationMarker className="text-blue-600" size={25} />
							<input
								type="text"
								placeholder="Search location..."
								className="border-none outline-none text-gray-900 w-full text-sm sm:text-base placeholder-gray-400 bg-transparent"
							/>
						</div>
						<button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 active:scale-95">
							Search
						</button>
					</div>

					<div className="mt-8 flex justify-between w-full max-w-md">
						<StatCard start={8800} end={9000} label="Exceptional Quality" />
						<StatCard start={1950} end={2000} label="Satisfied Clients" />
						<StatCard end={28} label="Industry Recognition" />
					</div>
				</div>
				
			</div>
			<Services />
			<Value />
			<Footer />
		</section>
	)
}

// StatCard Component
const StatCard = ({ start, end, label }) => (
	<div className="flex flex-col items-center group">
		<span
			className="text-2xl sm:text-3xl font-bold group-hover:text-blue-400 
                       transition-colors duration-300"
		>
			{start ? (
				<CountUp start={start} end={end} duration={4} />
			) : (
				<CountUp end={end} />
			)}
			<span className="text-blue-500 ml-1 group-hover:text-blue-400">
				+
			</span>
		</span>
		<span
			className="text-gray-400 text-xs sm:text-sm text-center 
                       group-hover:text-gray-300 transition-colors duration-300"
		>
			{label}
		</span>
	</div>
)

export default Landing
