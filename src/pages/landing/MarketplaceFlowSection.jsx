import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Landing "marketplace architecture" section.
 *
 * Three tiers, read top to bottom:
 *   01 PRODUCT   — Your application (the tenant's single Place4U application)
 *   02 PLATFORM  — Place4U, the centralised housing marketplace
 *   03 SUPPLY    — the six streams that feed it
 *
 * "Your application" physically docks into Place4U through a measured two-rail
 * connector; the six supply streams converge into the hub with curved wires.
 * Geometry is measured from the DOM (ResizeObserver + fonts.ready) so the
 * wires always land on the real card edges at any width.
 */

const SUPPLY_STREAMS = [
	{ id: 'agencies', n: '01', title: 'Real estate agencies', body: 'Rental properties and apartments' },
	{ id: 'landlords', n: '02', title: 'Private landlords', body: 'Houses, flats and rooms' },
	{ id: 'management', n: '03', title: 'Property management', body: 'Managed residential properties' },
	{ id: 'owners', n: '04', title: 'Individual owners', body: 'Rooms and shared accommodation' },
	{ id: 'roommates', n: '05', title: 'Roommate seekers', body: 'Available rooms and shared living' },
	{ id: 'student', n: '06', title: 'Student accommodation', body: 'Residences and private student housing' }
];

const MARKET_ENTRY = [
	'Student accommodation',
	'Room rentals',
	'Property agencies',
	'Roommate connections',
	'Broader residential rentals'
];

const DESKTOP_QUERY = '(min-width: 1024px)';

const round = (value) => Math.round(value * 10) / 10;

const TierLabel = ({ n, title, detail }) => (
	<div className="pointer-events-none absolute left-0 top-1/2 hidden w-[132px] -translate-y-1/2 lg:block">
		<span className="absolute -left-[3px] top-[5px] h-[7px] w-[7px] bg-[#0f1416]" aria-hidden="true" />
		<p className="pl-4 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#18262d]">
			{n} · {title}
		</p>
		<p className="pl-4 font-serif-display text-[13px] italic leading-tight text-[#8a9699]">{detail}</p>
	</div>
);

export default function MarketplaceFlowSection({ footerNote = null }) {
	const containerRef = useRef(null);
	const appRef = useRef(null);
	const hubRef = useRef(null);
	const gridRef = useRef(null);
	const columnRefs = useRef([]);
	const signatureRef = useRef('');

	const [geometry, setGeometry] = useState({ width: 0, height: 0, dock: [], plug: null, wires: [], trunk: null });
	const [hotStream, setHotStream] = useState(null);
	const [appHot, setAppHot] = useState(false);
	const [reducedMotion, setReducedMotion] = useState(false);

	useEffect(() => {
		const query = window.matchMedia('(prefers-reduced-motion: reduce)');
		const apply = () => setReducedMotion(query.matches);
		apply();
		if (query.addEventListener) query.addEventListener('change', apply);
		return () => {
			if (query.removeEventListener) query.removeEventListener('change', apply);
		};
	}, []);

	const measure = useCallback(() => {
		const container = containerRef.current;
		const app = appRef.current;
		const hub = hubRef.current;
		const grid = gridRef.current;
		if (!container || !app || !hub || !grid) return;

		const cr = container.getBoundingClientRect();
		if (cr.width < 40 || cr.height < 40) return;

		const rel = (rect) => ({
			left: rect.left - cr.left,
			top: rect.top - cr.top,
			bottom: rect.bottom - cr.top,
			width: rect.width,
			height: rect.height
		});

		const a = rel(app.getBoundingClientRect());
		const h = rel(hub.getBoundingClientRect());
		const g = rel(grid.getBoundingClientRect());
		const desktop = window.matchMedia(DESKTOP_QUERY).matches;
		const hubCentre = h.left + h.width / 2;

		// Your application ⇄ Place4U: twin rails with an inline socket.
		const dock = [-11, 11].map((offset, i) => ({
			id: `p4u-dock-${i}`,
			d: `M ${round(hubCentre + offset)} ${round(a.bottom)} L ${round(hubCentre + offset)} ${round(h.top)}`
		}));

		let wires = [];
		let trunk = null;

		if (desktop) {
			const columns = columnRefs.current.slice(0, SUPPLY_STREAMS.length).filter(Boolean);
			const spread = Math.min(h.width * 0.5 - 90, 200);
			wires = columns.map((column, i) => {
				const r = rel(column.getBoundingClientRect());
				const startX = r.left + r.width / 2;
				const startY = g.top;
				const offset = columns.length > 1 ? i / (columns.length - 1) - 0.5 : 0;
				const endX = hubCentre + offset * 2 * spread;
				const endY = h.bottom;
				const lift = Math.max(56, startY - endY);
				return {
					id: `p4u-wire-${i}`,
					d:
						`M ${round(startX)} ${round(startY)} ` +
						`C ${round(startX)} ${round(startY - lift * 0.52)}, ` +
						`${round(endX)} ${round(endY + lift * 0.55)}, ` +
						`${round(endX)} ${round(endY)}`,
					arrow: { x: endX, y: endY }
				};
			});
		} else {
			// Small screens stack the streams, so they join as one trunk.
			const startX = g.left + g.width / 2;
			const startY = g.top;
			const endY = h.bottom;
			const lift = Math.max(40, startY - endY);
			trunk = {
				id: 'p4u-trunk',
				d:
					`M ${round(startX)} ${round(startY)} ` +
					`C ${round(startX)} ${round(startY - lift * 0.4)}, ` +
					`${round(hubCentre)} ${round(endY + lift * 0.55)}, ` +
					`${round(hubCentre)} ${round(endY)}`,
				arrow: { x: hubCentre, y: endY }
			};
		}

		const next = { width: cr.width, height: cr.height, dock, plug: { x: hubCentre, y: (a.bottom + h.top) / 2 }, wires, trunk };
		const signature = JSON.stringify(next);
		if (signature === signatureRef.current) return;
		signatureRef.current = signature;
		setGeometry(next);
	}, []);

	useLayoutEffect(() => {
		measure();

		const resize = () => measure();
		window.addEventListener('resize', resize);

		let observer = null;
		if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
			observer = new ResizeObserver(() => measure());
			observer.observe(containerRef.current);
		}

		let cancelled = false;
		if (document.fonts?.ready) {
			document.fonts.ready.then(() => {
				if (!cancelled) measure();
			});
		}
		window.addEventListener('load', resize);

		return () => {
			cancelled = true;
			window.removeEventListener('resize', resize);
			window.removeEventListener('load', resize);
			if (observer) observer.disconnect();
		};
	}, [measure]);

	const chevronPath = (arrow) =>
		`M ${round(arrow.x - 3.5)} ${round(arrow.y + 5.5)} L ${round(arrow.x)} ${round(arrow.y - 1)} L ${round(arrow.x + 3.5)} ${round(arrow.y + 5.5)}`;

	const renderMotionDot = (id, index, duration) => {
		if (reducedMotion) return null;
		return (
			<circle key={`${id}-dot-${index}`} r="2.6" className="p4u-flow-dot">
				<animateMotion dur={`${duration}s`} begin={`${round(index * -0.55 - 1.2)}s`} repeatCount="indefinite">
					<mpath href={`#${id}`} />
				</animateMotion>
			</circle>
		);
	};

	return (
		<section id="how-it-works" className="relative scroll-mt-24 bg-white px-6 py-20 lg:px-12">
			{/* Scoped to this section so the rest of the site's motion setup is untouched. */}
			<style>{`
				.p4u-flow-base{fill:none;stroke:#18262d;stroke-width:1.15;opacity:.32;transition:opacity .25s ease,stroke-width .25s ease}
				.p4u-flow-wire--hot .p4u-flow-base{opacity:1;stroke-width:2}
				.p4u-flow-dash{fill:none;stroke:#93a1a4;stroke-width:1;stroke-dasharray:2.5 7.5;opacity:.75;transition:opacity .25s ease,stroke .25s ease}
				.p4u-flow-wire--hot .p4u-flow-dash{stroke:#18262d;opacity:1}
				.p4u-flow-march{animation:p4u-flow-march 1.15s linear infinite}
				.p4u-flow-wire--hot .p4u-flow-march{animation-duration:.7s}
				@keyframes p4u-flow-march{to{stroke-dashoffset:-10}}
				.p4u-flow-dock{fill:none;stroke:#0f1416;stroke-width:2;opacity:.85;transition:opacity .25s ease}
				.p4u-flow-dock--hot .p4u-flow-dock{opacity:1}
				.p4u-flow-chev{fill:none;stroke:#18262d;stroke-width:1.8;opacity:.55;transition:opacity .25s ease}
				.p4u-flow-wire--hot .p4u-flow-chev{opacity:1}
				.p4u-flow-dot{fill:#0f1416}
				@media (prefers-reduced-motion: reduce){
					.p4u-flow-march{animation:none}
				}
			`}</style>

			<div className="mx-auto max-w-7xl">
				<header>
					<div className="flex flex-wrap items-baseline justify-between gap-3 border-y border-[#18262d] py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#18262d]">
						<span>Fig. 01 — Marketplace architecture</span>
						<span className="text-[#8a9699]">Place4U / South Africa</span>
					</div>

					<div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-end">
						<h2 className="font-serif-display text-[2rem] font-normal leading-[1.06] tracking-[-0.03em] text-[#18262d] sm:text-[2.6rem] lg:text-[3.1rem]">
							Every housing opportunity,
							<span className="block italic">flowing into one Place4U.</span>
						</h2>
						<p className="max-w-[44ch] text-sm leading-relaxed text-[#47545a] lg:justify-self-end lg:text-[15px]">
							Agencies, landlords, property managers, owners and roommates converge into a single marketplace — and
							your application docks straight into it. Student accommodation leads our entry; it is not the whole
							identity.
						</p>
					</div>
				</header>

				<div ref={containerRef} className="relative mt-12 lg:mt-16">
					<span
						className="pointer-events-none absolute bottom-0 left-0 top-0 hidden w-px bg-[#d5e0df] lg:block"
						aria-hidden="true"
					/>

					{geometry.width > 0 && (
						<svg
							className="pointer-events-none absolute inset-0 z-0 overflow-visible"
							width={geometry.width}
							height={geometry.height}
							viewBox={`0 0 ${geometry.width} ${geometry.height}`}
							aria-hidden="true"
							focusable="false"
						>
							{/* Your application → Place4U */}
							<g className={appHot ? 'p4u-flow-dock--hot' : undefined}>
								{geometry.dock.map((rail) => (
									<path key={rail.id} id={rail.id} d={rail.d} className="p4u-flow-dock" />
								))}
								{geometry.plug && (
									<rect
										x={round(geometry.plug.x - 13)}
										y={round(geometry.plug.y - 8)}
										width="26"
										height="16"
										rx="2.5"
										fill="#0f1416"
									/>
								)}
								{geometry.dock.map((rail, i) => renderMotionDot(rail.id, i, 2.4))}
							</g>

							{/* Supply → Place4U */}
							{geometry.wires.map((wire, i) => (
								<g key={wire.id} className={hotStream === i ? 'p4u-flow-wire--hot' : undefined}>
									<path id={wire.id} d={wire.d} className="p4u-flow-base" />
									<path
										d={wire.d}
										className={reducedMotion ? 'p4u-flow-dash' : 'p4u-flow-dash p4u-flow-march'}
									/>
									<path d={chevronPath(wire.arrow)} className="p4u-flow-chev" />
									{renderMotionDot(wire.id, i, 3.6)}
								</g>
							))}

							{geometry.trunk && (
								<g>
									<path id={geometry.trunk.id} d={geometry.trunk.d} className="p4u-flow-base" />
									<path
										d={geometry.trunk.d}
										className={reducedMotion ? 'p4u-flow-dash' : 'p4u-flow-dash p4u-flow-march'}
									/>
									<path d={chevronPath(geometry.trunk.arrow)} className="p4u-flow-chev" />
									{[0, 1, 2].map((i) => renderMotionDot(geometry.trunk.id, i, 3.3))}
								</g>
							)}
						</svg>
					)}

					{/* 01 · Product — your application */}
					<div className="relative">
						<TierLabel n="01" title="Product" detail="Your application" />
						<div className="lg:pl-[152px]">
							<div
								ref={appRef}
								onMouseEnter={() => setAppHot(true)}
								onMouseLeave={() => setAppHot(false)}
								className="relative z-10 mx-auto w-full max-w-[470px] rounded-xl border border-[#0f1416] bg-white shadow-[0_1px_0_0_rgba(15,20,22,0.04)]"
							>
								<span className="absolute -top-[9px] left-4 z-20 rounded-[3px] bg-[#0f1416] px-2.5 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-white">
									Your application
								</span>

								<div className="flex h-10 items-center gap-3 border-b border-[#0f1416] px-4">
									<span className="flex gap-1.5" aria-hidden="true">
										<span className="h-[7px] w-[7px] rounded-full border border-[#0f1416]" />
										<span className="h-[7px] w-[7px] rounded-full border border-[#0f1416]" />
										<span className="h-[7px] w-[7px] rounded-full border border-[#0f1416]" />
									</span>
									<span className="rounded-full border border-[#d5e0df] px-3 py-1 font-mono text-[10px] text-[#6b757a]">
										place4u.xyz
									</span>
									<span className="ml-auto flex flex-col gap-[3px]" aria-hidden="true">
										<span className="h-[1.5px] w-3 bg-[#0f1416]" />
										<span className="h-[1.5px] w-3 bg-[#0f1416]" />
									</span>
								</div>

								<div className="px-4 pb-5 pt-4">
									<div className="flex h-9 items-center gap-2.5 rounded-full border border-[#0f1416] px-3.5">
										<span className="h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px] border-[#0f1416]" aria-hidden="true" />
										<span className="h-[7px] w-[46%] rounded bg-[#dcdcdc]" aria-hidden="true" />
									</div>
									<div className="mt-3 flex gap-2" aria-hidden="true">
										<span className="h-5 w-[58px] rounded-full border border-[#e3e8e7]" />
										<span className="h-5 w-[42px] rounded-full border border-[#e3e8e7]" />
										<span className="h-5 w-[64px] rounded-full border border-[#e3e8e7]" />
										<span className="h-5 w-[38px] rounded-full border border-[#e3e8e7]" />
									</div>
									<div className="mt-4 grid grid-cols-3 gap-2.5">
										{[0, 1, 2].map((i) => (
											<div key={i} className="rounded-lg border border-[#e3e8e7] p-2">
												<span className="block h-[54px] rounded bg-[#ececec]" aria-hidden="true" />
												<span className="mt-2 block h-[7px] w-[82%] rounded bg-[#d9d9d9]" aria-hidden="true" />
												<span className="mt-1.5 block h-[7px] w-[44%] rounded bg-[#e7e7e7]" aria-hidden="true" />
											</div>
										))}
									</div>
								</div>

							</div>
						</div>
					</div>

					{/* connector gap — the rails are drawn by the SVG above */}
					<div className="h-14 lg:h-16" aria-hidden="true" />

					{/* 02 · Platform — Place4U */}
					<div className="relative">
						<TierLabel n="02" title="Platform" detail="One Place4U" />
						<div className="lg:pl-[152px]">
							<div
								ref={hubRef}
								className="relative z-10 mx-auto flex w-full max-w-[640px] flex-wrap items-center justify-between gap-x-7 gap-y-3 rounded-[10px] bg-[#0f1416] px-7 py-6 text-white"
							>
								<span className="text-[clamp(1.6rem,3.2vw,2.05rem)] font-semibold leading-none tracking-tight">
									Place4U
								</span>
								<span className="flex flex-col items-start gap-1.5 sm:items-end sm:text-right">
									<span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/55">
										Centralised housing marketplace
									</span>
									<span className="font-serif-display text-sm italic text-white/85">Housing, brought together.</span>
								</span>
							</div>
						</div>
					</div>

					{/* 03 · Supply — the six streams */}
					<div className="relative mt-14 lg:mt-32">
						<TierLabel n="03" title="Supply" detail="Six streams" />
						<div className="lg:pl-[152px]">
							<p className="relative z-10 mb-3 flex justify-center lg:hidden">
								<span className="rounded-full border border-[#d5e0df] bg-white px-3 py-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#8a9699]">
									Six supply streams
								</span>
							</p>

							<div
								ref={gridRef}
								className="grid grid-cols-1 divide-y divide-[#d5e0df] border-t border-[#18262d] md:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-y-0"
							>
								{SUPPLY_STREAMS.map((stream, i) => (
									<article
										key={stream.id}
										ref={(el) => {
											columnRefs.current[i] = el;
										}}
										onMouseEnter={() => setHotStream(i)}
										onMouseLeave={() => setHotStream((current) => (current === i ? null : current))}
										className="relative px-4 pb-4 pt-5 first:pl-0 last:pr-0 lg:px-4"
									>
										<span
											className="absolute -top-[5px] left-1/2 hidden h-[9px] w-[9px] -translate-x-1/2 rounded-full border-[1.5px] border-[#0f1416] transition-colors duration-200 lg:block"
											style={hotStream === i ? { backgroundColor: '#0f1416' } : undefined}
											aria-hidden="true"
										/>
										<span className="block font-mono text-[9.5px] tracking-[0.14em] text-[#8a9699]">{stream.n}</span>
										<h3 className="mt-2.5 text-[15px] font-semibold leading-snug text-[#18262d]">{stream.title}</h3>
										<p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6b757a]">{stream.body}</p>
									</article>
								))}
							</div>
						</div>
					</div>

					{/* Demand side */}
					<div className="mt-9 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-[#d5e0df] pt-4 lg:pl-[152px]">
						<span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#8a9699]">Demand</span>
						<p className="max-w-[66ch] text-[12.5px] leading-relaxed text-[#6b757a]">
							Students · Young professionals · Families · Room seekers · Anyone looking for a place to call home
						</p>
					</div>
				</div>

				<footer className="mt-10 border-t border-[#18262d] pt-5 lg:pl-[152px]">
					<p className="font-serif-display text-lg leading-snug text-[#18262d]">
						One platform. Multiple housing opportunities. <span className="italic">A place for everyone.</span>
					</p>

					<p className="mt-4 max-w-[92ch] font-mono text-[9.5px] uppercase leading-[2.1] tracking-[0.12em] text-[#8a9699]">
						Market entry —{' '}
						{MARKET_ENTRY.map((step, i) => (
							<span key={step}>
								{String(i + 1).padStart(2, '0')} {step}
								{i < MARKET_ENTRY.length - 1 ? ' → ' : ''}
							</span>
						))}
					</p>

					{footerNote && <div className="mt-7 max-w-3xl text-xs leading-relaxed text-[#47545a]">{footerNote}</div>}
				</footer>
			</div>
		</section>
	);
}
