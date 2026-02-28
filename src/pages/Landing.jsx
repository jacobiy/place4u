import React from 'react'
import { HiLocationMarker } from 'react-icons/hi'
import CountUp from 'react-countup'
import { motion } from 'framer-motion'
import Navbar from '../component/Navbar'
import Value from '../component/Values'
import Services from '../component/Services'
import Footer from '../component/Footer'

const Landing = () => {
	return (
		<section className="relative text-white bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen">
			<Navbar />
			{/* Added pt-24 to push content below fixed navbar */}
			<div
				className="flex justify-around items-end max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 
                          pt-24 sm:pt-28 lg:pt-32 pb-8
                          flex-col lg:flex-row gap-8 lg:gap-0"
			>
				{/* Left Side */}
				<div className="flex flex-col gap-12 lg:gap-16 w-full lg:w-auto">
					<div className="relative z-10">
						<div
							className="absolute w-16 h-16 bg-gradient-to-r from-blue-400 to-blue-600 
                                      rounded-full right-[28%] -top-[10%] -z-10 animate-pulse"
						/>
						<motion.h1
							initial={{ y: '2rem', opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							transition={{ duration: 2, type: 'spring' }}
							className="font-semibold text-4xl sm:text-5xl lg:text-6xl 
                                     leading-tight lg:leading-[4rem]"
						>
							Explore <br /> Your Dream
							<br /> Property
						</motion.h1>
					</div>

					<div className="flex flex-col gap-2">
						<span className="text-gray-300 text-sm sm:text-base">
							Your Gateway to Extraordinary Living
						</span>
						<span className="text-gray-300 text-sm sm:text-base">
							Discover Unparalleled Properties that Define Luxury
						</span>
					</div>

					<div
						className="flex items-center bg-white rounded-lg shadow-lg 
                                  border border-gray-400/30 p-2 sm:p-3 justify-between w-full max-w-md
                                  hover:shadow-xl transition-shadow duration-300"
					>
						<div className="flex items-center gap-2 flex-1">
							<HiLocationMarker
								className="text-blue-500"
								size={25}
							/>
							<input
								type="text"
								placeholder="Search location..."
								className="border-none outline-none text-gray-800 w-full 
                                         text-sm sm:text-base placeholder-gray-400"
							/>
						</div>
						<button
							className="bg-gradient-to-r from-blue-500 to-blue-600 
                                       text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg 
                                       text-sm sm:text-base hover:from-blue-600 
                                       hover:to-blue-700 transition-all duration-300 
                                       transform hover:scale-105 active:scale-95"
						>
							Search
						</button>
					</div>

					<div className="flex justify-between w-full max-w-md">
						<StatCard
							start={8800}
							end={9000}
							label="Exceptional Quality"
						/>
						<StatCard
							start={1950}
							end={2000}
							label="Satisfied Clients"
						/>
						<StatCard end={28} label="Industry Recognition" />
					</div>
				</div>

				{/* Right Side */}
				<div className="flex justify-center w-full lg:w-auto mt-8 lg:mt-0">
					<motion.div
						initial={{ x: '7rem', opacity: 0 }}
						animate={{ x: 0, opacity: 1 }}
						transition={{ duration: 2, type: 'spring' }}
						className="w-full sm:w-96 lg:w-[30rem] h-64 sm:h-80 lg:h-[35rem] 
                                 relative group cursor-pointer"
					>
						{/* Image with clip path for the custom shape */}
						<div
							className="absolute inset-0 bg-gradient-to-r from-blue-500 
                                      to-purple-600 opacity-0 group-hover:opacity-20 
                                      transition-opacity duration-500 rounded-lg"
							style={{
								clipPath:
									'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
							}}
						/>
						<img
							src="./hero-image.png"
							alt="Hero Section Image"
							className="w-full h-full object-cover shadow-2xl"
							style={{
								clipPath:
									'polygon(0% 0%, 100% 0%, 100% 80%, 80% 100%, 0% 100%)',
								borderRadius: '50% 0 50% 0'
							}}
						/>
					</motion.div>
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
