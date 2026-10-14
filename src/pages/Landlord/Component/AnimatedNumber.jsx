import { useEffect, useRef, useState } from "react";

/* Lightweight count-up that runs once the element scrolls into view.
   Re-animates whenever `value` changes so KPI figures never freeze on the
   first render (e.g. before the portfolio has loaded). */
export const AnimatedNumber = ({ value, duration = 1100, prefix = "", suffix = "", decimals = 0, className = "", style = {} }) => {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(0);
  const [inView, setInView] = useState(false);
  const ref = useRef(null);
  const displayRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setInView(true); }),
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const from = displayRef.current;
    const to = target;
    if (from === to) return;

    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = from + (to - from) * eased;
      displayRef.current = next;
      setDisplay(next);
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        displayRef.current = to;
        setDisplay(to);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);

  const formatted = display.toLocaleString("en-ZA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className} style={style}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

export default AnimatedNumber;
