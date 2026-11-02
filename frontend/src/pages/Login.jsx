import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  ChevronRight,
  Clock3,
  Eye,
  GitCompareArrows,
  Home,
  Lock,
  ShieldCheck,
  Smartphone,
  User,
} from "lucide-react";
import { useAuth } from "../auth";
import { errText } from "../api";
import { Brand, Footer, Tricolor, UtilityBar } from "../Gov";
import MobileDemo from "./MobileDemo";

const DEMO = [
  ["admin", "Admin", "Configuration, users, everything"],
  ["supervisor", "Supervisor", "All bureaus, reassign and review"],
  ["kulkarni", "Technical Bureau officer", "Sees only Technical Bureau cases"],
  ["deshmukh", "Approval Bureau officer", "Sees only Approval Bureau cases"],
  ["iyer", "Grievance Cell officer", "Sees only Student Grievance Cell cases"],
  ["management", "Management", "Read-only, reports and export"],
];

const POINTS = [
  [Eye, "One view per institution", "See every complaint and which bureau or cell is handling it."],
  [GitCompareArrows, "Related cases flagged early", "Possible duplicates are surfaced for an officer to review. Nothing is merged automatically."],
  [Clock3, "Deadlines tracked", "Cases due soon, overdue and escalated are shown first, with a recorded reason for every decision."],
];

export default function Login({ initialTab = "citizen" }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab: 'citizen' | 'officer'
  const [tab, setTab] = useState(() => {
    const q = searchParams.get("tab");
    if (q === "officer" || q === "login") return "officer";
    if (q === "citizen" || q === "register") return "citizen";
    if (location.pathname === "/login") return "officer";
    if (location.pathname === "/register-complaint" || location.pathname === "/citizen") return "citizen";
    return initialTab;
  });

  useEffect(() => {
    const q = searchParams.get("tab");
    if (q === "officer" || q === "login") setTab("officer");
    else if (q === "citizen" || q === "register") setTab("citizen");
  }, [searchParams]);

  const handleTabChange = (nextTab) => {
    setTab(nextTab);
    setSearchParams({ tab: nextTab }, { replace: true });
  };

  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await login(u, p);
      navigate("/");
    } catch (x) {
      setErr(errText(x));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Top Government Utility Bar (with A- A A+ magnifier tools on top right) */}
      <UtilityBar />

      {/* Main Header */}
      <header className="bg-surface">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Brand />

          {/* Top Right Header Options (Directly below the magnifier A- A A+) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTabChange("citizen")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition border ${
                tab === "citizen"
                  ? "border-accent bg-accent/15 text-heading ring-2 ring-accent/30 shadow-sm"
                  : "border-line bg-surface text-ink hover:border-brand hover:text-brand"
              }`}
            >
              <Smartphone size={15} className="text-accent" />
              <span>Register a Complaint</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("officer")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition border ${
                tab === "officer"
                  ? "border-brand bg-brand text-onbrand shadow-sm ring-2 ring-brand/30"
                  : "border-line bg-surface text-ink hover:border-brand hover:text-brand"
              }`}
            >
              <ShieldCheck size={15} className={tab === "officer" ? "text-white" : "text-brand"} />
              <span>Officer Sign In</span>
            </button>
          </div>
        </div>
        <Tricolor className="h-1" />
      </header>

      {/* Sticky Blue Navigation Bar with the 2 Portal Options in the Top Right */}
      <div className="sticky top-0 z-30 bg-nav text-white shadow-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2 py-2.5 text-xs font-semibold text-white/80">
            <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="hidden sm:inline">AICTE Grievance Redressal & Bureau Coordination Portal</span>
            <span className="sm:hidden">AICTE Portal</span>
          </div>

          <nav aria-label="Portal Navigation" className="flex items-center gap-1.5 py-1.5">
            <button
              type="button"
              onClick={() => handleTabChange("citizen")}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition ${
                tab === "citizen"
                  ? "bg-accent text-onaccent shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Smartphone size={15} />
              <span>Register a Complaint</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("officer")}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition ${
                tab === "officer"
                  ? "bg-accent text-onaccent shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <ShieldCheck size={15} />
              <span>Officer Sign In</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Breadcrumb Bar */}
      <nav aria-label="Breadcrumb" className="border-b border-line bg-surface">
        <ol className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-1.5 px-4 py-2 text-xs text-muted sm:px-8">
          <li>
            <button
              type="button"
              onClick={() => handleTabChange("citizen")}
              className="flex items-center gap-1 font-semibold text-brand hover:underline"
            >
              <Home size={13} /> Home
            </button>
          </li>
          <li aria-hidden><ChevronRight size={13} /></li>
          <li>
            <span className="font-semibold text-ink" aria-current="page">
              {tab === "citizen" ? "Register a Complaint (Citizen Portal)" : "Officer Sign In"}
            </span>
          </li>
        </ol>
      </nav>

      {/* Main Content Area */}
      {tab === "citizen" ? (
        <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <MobileDemo />
        </main>
      ) : (
        <main id="main" className="grid flex-1 lg:grid-cols-[1.2fr_1fr]">
          <section className="hero-pattern flex flex-col justify-center gap-10 px-6 py-12 text-white sm:px-14 lg:py-16">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-sm font-semibold">
                <ShieldCheck size={16} className="text-accent" />
                For authorised AICTE officers
              </p>
              <h1 className="mt-5 max-w-2xl text-3xl font-bold leading-tight !text-white sm:text-5xl sm:leading-[1.12]">
                Every complaint, one institution, all bureaus.
              </h1>
              <p className="mt-4 max-w-xl text-base text-white/80 sm:text-lg">
                Know what each bureau and cell is handling for an institution, catch related cases early and meet every deadline.
              </p>
            </div>
            <ul className="grid max-w-3xl gap-3 sm:grid-cols-3">
              {POINTS.map(([Icon, t, d]) => (
                <li
                  key={t}
                  className="rounded-lg border border-white/15 border-t-2 border-t-accent bg-white/[0.07] p-4 backdrop-blur-sm"
                >
                  <Icon size={22} className="text-accent" />
                  <h2 className="mt-2 text-sm font-bold !text-white">{t}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-white/75">{d}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex items-center justify-center bg-bg px-4 py-10 sm:px-10">
            <div className="w-full max-w-md overflow-hidden rounded-xl2 border border-line bg-surface shadow-card">
              <div className="bg-nav px-6 py-4 text-white">
                <h2 className="text-xl font-bold !text-white">Officer sign in</h2>
                <p className="mt-0.5 text-xs text-white/75">
                  Prototype with synthetic data. Each role sees a different scope.
                </p>
              </div>
              <Tricolor className="h-1" />
              <div className="space-y-6 p-6">
                <form onSubmit={submit} className="space-y-4">
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold">Username</span>
                    <span className="relative block">
                      <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        className="field pl-9"
                        value={u}
                        onChange={(e) => setU(e.target.value)}
                        autoComplete="username"
                      />
                    </span>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold">Password</span>
                    <span className="relative block">
                      <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        className="field pl-9"
                        type="password"
                        value={p}
                        onChange={(e) => setP(e.target.value)}
                        autoComplete="current-password"
                      />
                    </span>
                  </label>
                  {err && (
                    <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger" role="alert">
                      {err}
                    </p>
                  )}
                  <button
                    className="btn btn-primary w-full py-2.5"
                    disabled={busy || !u || !p}
                  >
                    {busy ? "Signing in..." : "Sign in"}
                  </button>
                </form>

                <div>
                  <div className="mb-2 flex items-center gap-3">
                    <p className="text-sm font-semibold">Demo accounts</p>
                    <span className="h-px flex-1 bg-line" />
                    <span className="text-xs text-muted">Password Demo@1234</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {DEMO.map(([id, name, d]) => (
                      <button
                        key={id}
                        type="button"
                        className="rounded-lg border border-line bg-bg p-2.5 text-left transition hover:border-brand hover:bg-raised"
                        onClick={() => {
                          setU(id);
                          setP("Demo@1234");
                        }}
                      >
                        <div className="text-sm font-bold text-heading">{name}</div>
                        <div className="text-xs text-muted">{d}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      <Footer className="mt-0" />
    </div>
  );
}
