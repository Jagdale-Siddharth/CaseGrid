import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, BarChart3, Building2, ChevronRight, GitCompareArrows, Home, LayoutDashboard, ListChecks, LogOut, Route, ScrollText, UserRound, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { Brand, Footer, Tricolor, UtilityBar } from "./Gov";
import api from "./api";

const NAV = [
  ["/", "Dashboard", LayoutDashboard, "dashboard:view"],
  ["/cases", "Cases", ListChecks, "case:read"],
  ["/institutions", "Institutions", Building2, "institution:read"],
  ["/overlaps", "Related cases", GitCompareArrows, "case:read"],
  ["/routing", "Routing", Route, "case:read"],
  ["/alerts", "Alerts", Bell, "case:read"],
  ["/reports", "Reports", BarChart3, "report:view"],
  ["/audit", "Audit trail", ScrollText, "audit:read"],
  ["/admin", "Users", Users, "user:manage"],
];

function Crumbs({ links }) {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  const first = links.find(([to]) => to !== "/" && to === `/${parts[0]}`);
  return (
    <nav aria-label="Breadcrumb" className="border-b border-line bg-surface">
      <ol className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-1.5 px-4 py-2 text-xs text-muted sm:px-8">
        <li><Link to="/" className="flex items-center gap-1 font-semibold text-brand hover:underline"><Home size={13} />Home</Link></li>
        {first && (<>
          <li aria-hidden><ChevronRight size={13} /></li>
          <li>{parts.length > 1 ? <Link to={first[0]} className="font-semibold text-brand hover:underline">{first[1]}</Link> : <span className="font-semibold text-ink" aria-current="page">{first[1]}</span>}</li>
        </>)}
        {parts.length > 1 && (<><li aria-hidden><ChevronRight size={13} /></li><li className="font-semibold text-ink" aria-current="page">{decodeURIComponent(parts[parts.length - 1])}</li></>)}
      </ol>
    </nav>
  );
}

export default function Layout() {
  const { user, logout, can } = useAuth();
  const nav = useNavigate();
  const [unread, setUnread] = useState(0);
  useEffect(() => { api.get("/notifications", { params: { unread_only: true } }).then((r) => setUnread(r.data.length)).catch(() => {}); }, []);
  const links = NAV.filter((n) => can(n[3]));
  const roleLabel = `${user.role.name.replace("_", " ")}${user.bureau ? `, ${user.bureau.name}` : ""}`;
  return (
    <div className="flex min-h-screen flex-col">
      <UtilityBar />
      <header className="bg-surface">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Brand />
          <div className="flex items-center gap-3">
            <Link to="/alerts" className="relative rounded-full border border-line p-2 text-brand transition hover:bg-raised" aria-label={`Alerts, ${unread} unread`}>
              <Bell size={18} />
              {unread > 0 && <span className="absolute -right-1 -top-1 grid min-w-[1.1rem] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{unread}</span>}
            </Link>
            <div className="flex items-center gap-2.5 rounded-lg border border-line bg-bg py-1.5 pl-2 pr-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-brand text-onbrand"><UserRound size={18} /></div>
              <div className="leading-tight">
                <div className="text-sm font-bold text-heading">{user.full_name}</div>
                <div className="max-w-[220px] truncate text-xs capitalize text-muted">{roleLabel}</div>
              </div>
            </div>
            <button onClick={() => { logout(); nav("/login"); }} className="btn" aria-label="Sign out"><LogOut size={15} /><span className="hidden sm:inline">Sign out</span></button>
          </div>
        </div>
        <Tricolor className="h-1" />
      </header>
      <div className="sticky top-0 z-30 bg-nav text-white shadow-md">
        <nav aria-label="Main" className="mx-auto flex max-w-[1400px] gap-0.5 overflow-x-auto px-2 sm:px-6">
          {links.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === "/"}
              className={({ isActive }) => `relative flex shrink-0 items-center gap-2 border-b-4 px-3.5 py-3 text-sm font-semibold transition ${isActive ? "border-accent bg-white/10 text-white" : "border-transparent text-white/80 hover:bg-white/10 hover:text-white"}`}>
              <Icon size={16} />{label}
              {label === "Alerts" && unread > 0 && <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold text-onaccent">{unread}</span>}
            </NavLink>
          ))}
        </nav>
      </div>
      <Crumbs links={links} />
      <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-8 sm:py-8"><Outlet /></main>
      <Footer links={links.slice(0, 6).map(([to, label]) => [to, label])} />
    </div>
  );
}
