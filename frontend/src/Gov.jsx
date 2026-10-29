import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Landmark, Moon, Sun } from "lucide-react";
import { useTheme } from "./theme";

/** Tricolour hairline (saffron, white, green) */
export const Tricolor = ({ className = "h-1" }) => <div className={`tricolor ${className}`} aria-hidden />;

/** Emblem placeholder: swap this for the official AICTE logo file when available. */
export function Emblem({ size = 52 }) {
  return (
    <div className="relative grid shrink-0 place-items-center rounded-full bg-rail text-white ring-2 ring-accent" style={{ width: size, height: size }} aria-hidden>
      <Landmark size={size * 0.5} strokeWidth={1.8} />
    </div>
  );
}

export function Brand({ light = false }) {
  const t = light ? "text-white" : "text-heading";
  return (
    <div className="flex items-center gap-3">
      <Emblem />
      <div className="leading-tight">
        <div className={`text-[13px] font-bold ${light ? "text-white/80" : "text-muted"}`}>अखिल भारतीय तकनीकी शिक्षा परिषद</div>
        <div className={`text-lg font-bold sm:text-xl ${t}`}>All India Council for Technical Education</div>
        <div className={`text-[13px] font-semibold ${light ? "text-accent" : "text-brand"}`}>Complaint Monitoring and Coordination Portal</div>
      </div>
    </div>
  );
}

const SCALES = [["A-", 92], ["A", 100], ["A+", 112]];

/** Government-style utility bar: ministry line, skip link, text size, theme */
export function UtilityBar() {
  const { theme, toggle } = useTheme();
  const [scale, setScale] = useState(() => { try { return Number(localStorage.getItem("fontScale")) || 100; } catch { return 100; } });
  useEffect(() => {
    document.documentElement.style.fontSize = `${scale}%`;
    try { localStorage.setItem("fontScale", String(scale)); } catch { /* ignore */ }
  }, [scale]);
  return (
    <div className="bg-rail text-onrail">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-1.5 text-xs sm:px-8">
        <div className="flex items-center gap-2 font-medium">
          <span className="inline-flex h-3.5 w-5 overflow-hidden rounded-[2px] ring-1 ring-white/30" aria-hidden><i className="tricolor block h-full w-full" style={{ background: "linear-gradient(#FF9933 33%, #fff 33% 66%, #138808 66%)" }} /></span>
          <span>भारत सरकार | Government of India</span>
          <span className="hidden text-white/40 sm:inline">|</span>
          <span className="hidden sm:inline">शिक्षा मंत्रालय | Ministry of Education</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="#main" className="font-medium underline-offset-2 hover:underline">Skip to main content</a>
          <span className="text-white/30">|</span>
          <div className="flex items-center gap-1" role="group" aria-label="Text size">
            {SCALES.map(([l, v]) => (
              <button key={l} onClick={() => setScale(v)} aria-pressed={scale === v} aria-label={`Text size ${l}`}
                className={`min-w-[1.75rem] rounded px-1.5 py-0.5 font-bold transition ${scale === v ? "bg-accent text-onaccent" : "bg-white/10 hover:bg-white/20"}`}>{l}</button>
            ))}
          </div>
          <button onClick={toggle} className="flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 font-semibold transition hover:bg-white/20" aria-label="Toggle light or dark theme">
            {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}{theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Footer({ links = [], className = "mt-12" }) {
  const year = new Date().getFullYear();
  return (
    <footer className={`${className} bg-rail text-onrail print:hidden`}>
      <Tricolor className="h-1.5" />
      <div className={`mx-auto grid max-w-[1400px] gap-8 px-4 py-8 sm:px-8 ${links.length ? "md:grid-cols-[1.4fr_1fr_1fr]" : "md:grid-cols-[1.4fr_1fr]"}`}>
        <div>
          <Brand light />
          <p className="mt-4 max-w-md text-sm text-white/70">Brings every complaint against an institution into one view, so each bureau and cell can see what the others are handling, avoid duplicate work, and meet its deadline.</p>
        </div>
        {links.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-bold !text-accent">Quick links</h2>
            <ul className="space-y-1.5 text-sm">{links.map(([to, label]) => <li key={to}><Link to={to} className="text-white/80 underline-offset-2 hover:text-white hover:underline">{label}</Link></li>)}</ul>
          </div>
        )}
        <div>
          <h2 className="mb-3 text-sm font-bold !text-accent">AICTE Headquarters</h2>
          <address className="text-sm not-italic leading-relaxed text-white/80">Nelson Mandela Marg, Vasant Kunj<br />New Delhi, 110070</address>
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-white/65 sm:px-8">
          <span>&copy; {year} All India Council for Technical Education, Ministry of Education, Government of India.</span>
          <span>Prototype build. All data shown is synthetic.</span>
        </div>
      </div>
    </footer>
  );
}
