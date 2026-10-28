// About.jsx - Place4U /about
//
// The company story and the leadership team used to live as a single section on
// the landing page. They now have their own address so the landing page can
// stay focused on tenants and landlords, and so the team can be linked to
// directly (e.g. from a pitch deck or a press mention).
//
// Theme matches the landing page: Primary #006194, Secondary #006c4a,
// Surface #faf8ff. Keep it that way — this page is part of the public site.
import React from 'react'
import { Link } from 'react-router-dom'
import { HiArrowRight, HiShieldCheck, HiCheckCircle } from 'react-icons/hi'
import Navbar from '../../component/Navbar'
import Footer from '../../component/Footer'
import TeamSection from '../../component/TeamSection'
import useHashScroll from '../../hooks/useHashScroll'

const About = () => {
	// Keeps direct links to individual team cards aligned below the sticky navbar.
	useHashScroll()

	return (
		<div className="min-h-screen bg-[#faf8ff] text-[#131b2e] font-sans antialiased selection:bg-[#006194] selection:text-white">
			<a
				href="#main"
				className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2.5 focus:rounded-lg focus:bg-[#006194] focus:text-white focus:text-sm focus:font-semibold focus:shadow-lg"
			>
				Skip to content
			</a>

			<Navbar />

			<main id="main">
				{/* ===================== HERO ===================== */}
				<section className="relative overflow-hidden pt-32 pb-14 md:pt-40 md:pb-16 px-6 lg:px-12 bg-gradient-to-b from-[#cce5ff]/30 via-[#faf8ff] to-[#faf8ff]">
					<div className="max-w-3xl mx-auto text-center">
						<span className="inline-flex items-center gap-2 bg-[#85f8c4]/50 text-[#005137] px-3.5 py-1 rounded-full text-xs font-semibold border border-[#68dba9]/40 shadow-sm">
							<HiShieldCheck className="w-4 h-4" />
							About Place4U
						</span>

						<h1 className="font-['Space_Grotesk'] text-4xl sm:text-5xl font-bold tracking-tight leading-[1.12] mt-5">
							Leadership
						</h1>

						<p className="text-sm sm:text-base text-[#3f4850] leading-relaxed mt-4">
							Place4U is built by a small team who have rented in South Africa, been
							scammed by it, and decided to fix it. We review the ownership documents
							before a listing goes live, then match one application to reviewed homes
							instead of making you apply a dozen times.
						</p>

						<p className="text-sm sm:text-base text-[#3f4850] leading-relaxed mt-3">
							These are the people accountable for that promise.
						</p>
					</div>
				</section>

				{/* ===================== TEAM ===================== */}
				<TeamSection
					eyebrow="Our team"
					heading="Teams and people"
				/>

				{/* ===================== STORY ===================== */}
				<section className="py-20 px-6 lg:px-12 bg-[#f2f3ff]/50 border-t border-[#dae2fd]/60">
					<div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
						<div className="lg:col-span-4">
							<span className="text-xs font-bold text-[#006194] uppercase tracking-wider">
								Our story
							</span>
							<h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold tracking-tight mt-1">
								Built by someone who lived the problem
							</h2>
							<p className="text-sm text-[#3f4850] leading-relaxed mt-3">
								Place4U exists because renting in South Africa should not cost you
								your savings or your peace of mind.
							</p>
						</div>

						<div className="lg:col-span-8 space-y-5">
							<div className="p-7 sm:p-8 rounded-2xl bg-white border border-[#dae2fd]">
								<p className="text-sm sm:text-base text-[#3f4850] leading-relaxed">
									Place4U was founded in{' '}
									<strong className="text-[#131b2e]">2026</strong> out of a
									frustration that every South African renter knows too well.
									Watching friends and family hunt for student digs and backrooms,
									only to meet &ldquo;agents&rdquo; with no mandate, listings that
									did not exist, and deposits that vanished with a blocked number.
									The turning point came when a close friend paid a R4,500 deposit
									on a Braamfontein flat that turned out to be a stolen photograph
									and a phantom landlord.
								</p>
								<p className="text-sm sm:text-base text-[#3f4850] leading-relaxed mt-4">
									That month, Jacob started building the fix: a marketplace where
									every listing is tied to an owner who has submitted
									proof-of-ownership and ID documents for review before a tenant
									ever pays a cent. What began as a handful of reviewed cottages in
									Johannesburg has grown into a national trust layer for student
									accommodation, township backrooms, and urban apartments. We are
									not just a listing site — we are the document-review desk between
									a hopeful tenant and an honest landlord.
								</p>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="p-6 rounded-2xl bg-[#eaedff] border border-[#dae2fd]">
									<span className="material-symbols-outlined text-[#006194] text-[26px]">
										diversity_3
									</span>
									<h3 className="font-['Space_Grotesk'] text-base font-bold mt-3 mb-1">
										Why we started
									</h3>
									<p className="text-sm text-[#3f4850] leading-relaxed">
										To end the deposit scam economy and give every renter the same
										protection money should not have to buy.
									</p>
								</div>
								<div className="p-6 rounded-2xl bg-[#85f8c4]/25 border border-[#68dba9]/40">
									<span className="material-symbols-outlined text-[#005137] text-[26px]">
										flag
									</span>
									<h3 className="font-['Space_Grotesk'] text-base font-bold mt-3 mb-1">
										Our mission
									</h3>
									<p className="text-sm text-[#3f4850] leading-relaxed">
										Bring dignity, transparency, and documented safety to housing
										across Mzansi — from Soweto backrooms to Cape Town lofts.
									</p>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* ===================== HOW WE OPERATE ===================== */}
				<section className="py-20 px-6 lg:px-12 bg-white border-t border-[#dae2fd]/60">
					<div className="max-w-5xl mx-auto">
						<div className="text-center max-w-2xl mx-auto mb-12">
							<span className="text-xs font-bold text-[#006194] uppercase tracking-wider">
								How we operate
							</span>
							<h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold tracking-tight mt-1">
								Documented, reviewed, accountable
							</h2>
						</div>

						<ul className="grid grid-cols-1 md:grid-cols-3 gap-6">
							{[
								{
									title: 'Ownership reviewed first',
									body: 'A listing goes live only after the owner has submitted proof of ownership and identity for review.'
								},
								{
									title: 'One application, not ten',
									body: 'You build your tenant passport once. We match it to reviewed homes and introduce you directly.'
								},
								{
									title: 'A named human on the file',
									body: 'Every application is assigned to a person, and every match moves through a recorded pipeline — not a WhatsApp black hole.'
								}
							].map((item) => (
								<li
									key={item.title}
									className="p-6 rounded-2xl bg-[#faf8ff] border border-[#dae2fd]"
								>
									<HiCheckCircle className="w-5 h-5 text-[#006194]" />
									<h3 className="font-['Space_Grotesk'] text-base font-bold mt-3 mb-1">
										{item.title}
									</h3>
									<p className="text-sm text-[#3f4850] leading-relaxed">{item.body}</p>
								</li>
							))}
						</ul>
					</div>
				</section>

				{/* ===================== CTA ===================== */}
				<section className="py-20 px-6 lg:px-12 bg-[#faf8ff] border-t border-[#dae2fd]/60">
					<div className="max-w-4xl mx-auto p-8 sm:p-12 rounded-3xl bg-[#131b2e] text-white flex flex-col md:flex-row md:items-center justify-between gap-8">
						<div>
							<h2 className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-bold tracking-tight">
								Renting a home should feel like an opportunity, not a gamble.
							</h2>
							<p className="text-sm text-white/75 leading-relaxed mt-3 max-w-xl">
								Start your application, or list a property for review.
							</p>
						</div>
						<div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
							<Link
								to="/signup"
								className="inline-flex items-center justify-center gap-2 bg-white text-[#131b2e] font-['Space_Grotesk'] font-bold text-sm px-6 py-3 rounded-xl hover:bg-[#eaedff] transition-colors"
							>
								Get matched
								<HiArrowRight className="w-4 h-4" />
							</Link>
							<Link
								to="/"
								className="inline-flex items-center justify-center gap-2 border border-white/25 text-white font-['Space_Grotesk'] font-bold text-sm px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
							>
								Browse spaces
							</Link>
						</div>
					</div>
				</section>
			</main>

			<Footer theme="light" />
		</div>
	)
}

export default About
