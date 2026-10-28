// TeamSection.jsx - "Teams and people" leadership block
//
// Shared by the landing page (a short introduction to the team) and /about
// (the full leadership page), so the people and their copy are defined ONCE.
// Edit the TEAM array below to change a name, role, photo or LinkedIn URL -
// both surfaces update together.
import React from 'react'
import { FaLinkedinIn } from 'react-icons/fa'

// NOTE: the two non-founder blurbs are draft copy written to match the card
// format. Replace them with each person's own words before launch.
// TODO(owner): add the COO's LinkedIn URL when available.
export const TEAM = [
	{
		id: 'jacob-molomo',
		name: 'Jacob Molomo',
		role: 'Chief Executive Officer',
		photo: '/Founder.png',
		photoPosition: 'center 18%',
		quote:
			'As head of the company, my job is to keep everyone focused on a single goal: making renting in South Africa transparent, documented and fair for the people who can least afford to be scammed.',
		linkedin: 'https://www.linkedin.com/in/jacob-molomo-002428242/'
	},
	{
		id: 'coo',
		name: 'Kgothatso Monama',
		role: 'Chief Operating Officer',
		photo: '/COO.png',
		photoPosition: 'center 22%',
		quote:
			'Every landlord, tenant and listing passes through operations. My job is to make that path fast, consistent and accountable, so reviewed listings move without unnecessary delays.',
		linkedin: null
	},
	{
		id: 'donald-masine',
		name: 'Donald Masine',
		role: 'Chief Technology Officer',
		photo: '/CTO.png',
		photoPosition: 'center 22%',
		quote:
			'Technology should remove friction, not add it. I oversee the matching, document review and payment systems that make trust the default rather than an exception.',
		linkedin: 'https://www.linkedin.com/in/donald-masine-17a430270/'
	}
]

/**
 * @param {object}   props
 * @param {string}   props.eyebrow    Small uppercase label above the heading.
 * @param {string}   props.heading    Section heading.
 * @param {string}   props.intro      Supporting paragraph.
 * @param {Array}    props.members    Defaults to TEAM.
 * @param {string}   props.className  Extra wrapper classes.
 */
const TeamSection = ({
	eyebrow = 'Leadership',
	heading = 'Teams and people',
	intro =
		'Even the best technology needs the best people with the right spirit behind it. We are a small team of builders and operators, and these are the folks leading the charge.',
	members = TEAM,
	className = ''
}) => {
	return (
		<section
			id="team"
			aria-labelledby="team-heading"
			className={`py-20 px-6 lg:px-12 bg-white border-t border-[#d5e0df]/60 scroll-mt-24 ${className}`}
		>
			<div className="max-w-7xl mx-auto">
				{/* Heading block - centred, deliberately narrow so the intro wraps like a sentence. */}
				<div className="text-center max-w-2xl mx-auto mb-14">
					<span className="text-xs font-bold text-[#006194] uppercase tracking-wider">
						{eyebrow}
					</span>
					<h2
						id="team-heading"
						className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold text-[#18262d] mt-1 tracking-tight"
					>
						{heading}
					</h2>
					<p className="text-sm sm:text-base text-[#47545a] mt-3 leading-relaxed">
						{intro}
					</p>
				</div>

				{/* Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
					{members.map((member) => (
						<article
							key={member.id}
							id={member.id}
							className="group flex flex-col items-center text-center bg-[#f7f8f5] border border-[#d5e0df] rounded-3xl px-7 py-9 scroll-mt-28 transition-all duration-300 hover:border-[#86c1cc] hover:shadow-[0_28px_60px_-40px_rgba(0,97,148,0.55)]"
						>
							{/* Circular portrait. Greyscale at rest, colour on hover - the
							    photos are mixed sources, so this keeps the row visually even. */}
							<div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-white shadow-[0_16px_34px_-20px_rgba(0,97,148,0.6)] bg-[#e7eef0]">
								<img
									src={member.photo}
									alt={`${member.name}, ${member.role} at Place4U`}
									loading="lazy"
									decoding="async"
									style={{ objectPosition: member.photoPosition || 'center 20%' }}
									className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-[filter] duration-500"
								/>
							</div>

							<p className="text-sm text-[#47545a] leading-relaxed mt-7">
								&ldquo;{member.quote}&rdquo;
							</p>

							<div className="mt-6 pt-5 border-t border-[#d5e0df] w-full">
								<h3 className="font-['Space_Grotesk'] text-lg font-bold text-[#18262d] tracking-tight">
									{member.name}
								</h3>
								<p className="text-xs font-semibold uppercase tracking-wider text-[#006194] mt-1">
									{member.role}
								</p>

								{member.linkedin && (
									<a
										href={member.linkedin}
										target="_blank"
										rel="noopener noreferrer"
										aria-label={`${member.name} on LinkedIn`}
										className="mt-4 inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#0A66C2] bg-white border border-[#d5e0df] hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2] transition-colors"
									>
										<FaLinkedinIn size={13} />
									</a>
								)}
							</div>
						</article>
					))}
				</div>
			</div>
		</section>
	)
}

export default TeamSection
