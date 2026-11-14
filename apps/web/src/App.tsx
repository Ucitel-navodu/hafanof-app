import { useState, type FormEvent } from "react";
import { collect, allowed } from "./modules";
import { NavLink, Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./auth";
import { USER_ROLE } from "./labels";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { DogList, DogNew } from "./pages/Dogs";
import { DogDetail } from "./pages/DogDetail";
import { PeopleList, PersonDetail } from "./pages/People";
import { Adoptions } from "./pages/Adoptions";
import { Tasks } from "./pages/Tasks";
import { Calendar } from "./pages/Calendar";
import { Stats } from "./pages/Stats";
import { AuditLog } from "./pages/Audit";
import { Admin } from "./pages/Admin";
import { SearchPage } from "./pages/Search";
import { Profile } from "./pages/Profile";

function Shell() {
  const { me, logout, can } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [q, setQ] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const items = collect("nav")
    .filter((n) => allowed(can, n))
    .sort((a, b) => a.order - b.order);
  const mobileItems = items.filter((n) => n.mobile);
  const moreItems = items.filter((n) => !n.mobile);

  function search(e: FormEvent) {
    e.preventDefault();
    if (q.trim().length >= 2) nav(`/hledat?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.png" alt="Hafanof" />
        </div>
        <nav>
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"} className="nav-item">
              <span className="nav-icon" aria-hidden>
                {n.icon}
              </span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <NavLink to="/profil" className="nav-item small">
            {me!.name}
            <br />
            <span className="muted">{me!.roles.map((r) => USER_ROLE[r] ?? r).join(", ")}</span>
          </NavLink>
          <button className="btn ghost small" onClick={logout}>
            Odhlásit
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <img className="topbar-logo" src="/logo.png" alt="Hafanof" />
          <form className="search" onSubmit={search} role="search">
            <input type="search" placeholder="Hledat psa, osobu, dokument, úkol…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Globální vyhledávání" />
          </form>
        </header>
        <main className="content" key={loc.pathname}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/psi" element={<DogList />} />
            <Route path="/psi/novy" element={<DogNew />} />
            <Route path="/psi/:id" element={<DogDetail />} />
            <Route path="/osoby" element={<PeopleList />} />
            <Route path="/osoby/:id" element={<PersonDetail />} />
            <Route path="/adopce" element={<Adoptions />} />
            <Route path="/ukoly" element={<Tasks />} />
            <Route path="/kalendar" element={<Calendar />} />
            <Route path="/statistiky" element={<Stats />} />
            <Route path="/historie" element={<AuditLog />} />
            <Route path="/sprava" element={<Admin />} />
            <Route path="/hledat" element={<SearchPage />} />
            <Route path="/profil" element={<Profile />} />
            {collect("routes").map((r) => (
              <Route key={r.path} path={r.path} element={r.element} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <nav className="bottombar" aria-label="Hlavní navigace">
        {mobileItems.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === "/"} className="bottom-item" onClick={() => setMoreOpen(false)}>
            <span aria-hidden>{n.icon}</span>
            {n.label === "Můj Hafanof" ? "Domů" : n.label}
          </NavLink>
        ))}
        <button className="bottom-item" onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen}>
          <span aria-hidden>☰</span>Více
        </button>
      </nav>
      {moreOpen && (
        <div className="more-sheet" onClick={() => setMoreOpen(false)}>
          <div className="more-panel" onClick={(e) => e.stopPropagation()}>
            {moreItems.map((n) => (
              <NavLink key={n.to} to={n.to} className="nav-item" onClick={() => setMoreOpen(false)}>
                <span className="nav-icon" aria-hidden>
                  {n.icon}
                </span>
                {n.label}
              </NavLink>
            ))}
            <NavLink to="/profil" className="nav-item" onClick={() => setMoreOpen(false)}>
              <span className="nav-icon">☺</span>
              Můj účet ({me!.name})
            </NavLink>
            <button className="btn ghost" onClick={logout}>
              Odhlásit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function App() {
  const { me, ready } = useAuth();
  if (!ready) return <p className="muted pad">Načítám…</p>;
  if (!me) return <Login />;
  return <Shell />;
}
