import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import Layout from "./Layout";
import { Spinner } from "./ui";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Cases from "./pages/Cases";
import NewCase from "./pages/NewCase";
import CaseDetail from "./pages/CaseDetail";
import Institutions from "./pages/Institutions";
import InstitutionProfile from "./pages/InstitutionProfile";
import Overlaps from "./pages/Overlaps";
import Routing from "./pages/Routing";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";
import Audit from "./pages/Audit";
import Admin from "./pages/Admin";

function Guard({ perm, children }) {
  const { user, ready, can } = useAuth();
  if (!ready) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (perm && !can(perm)) return <div className="card"><h2 className="font-display text-xl font-extrabold">You do not have access to this page</h2><p className="mt-1 text-sm text-muted">Your role does not include the permission this page needs ({perm}).</p></div>;
  return children;
}

export default function App() {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner />;
  const g = (perm, el) => <Guard perm={perm}>{el}</Guard>;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<Guard><Layout /></Guard>}>
        <Route index element={g("dashboard:view", <Dashboard />)} />
        <Route path="cases" element={g("case:read", <Cases />)} />
        <Route path="cases/new" element={<Navigate to="/cases" replace />} />
        <Route path="cases/:id" element={g("case:read", <CaseDetail />)} />
        <Route path="institutions" element={g("institution:read", <Institutions />)} />
        <Route path="institutions/:id" element={g("institution:read", <InstitutionProfile />)} />
        <Route path="overlaps" element={g("case:read", <Overlaps />)} />
        <Route path="routing" element={g("case:read", <Routing />)} />
        <Route path="alerts" element={g("case:read", <Alerts />)} />
        <Route path="reports" element={g("report:view", <Reports />)} />
        <Route path="audit" element={g("audit:read", <Audit />)} />
        <Route path="admin" element={g("user:manage", <Admin />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
