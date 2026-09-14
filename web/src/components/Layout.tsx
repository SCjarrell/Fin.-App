import { NavLink, Outlet } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/income", label: "Income", icon: "💵", end: false },
  { to: "/expenses", label: "Expenses", icon: "🛒", end: false },
  { to: "/debts", label: "Debts", icon: "💳", end: false },
  { to: "/strategies", label: "Strategies", icon: "🚀", end: false },
];

export default function Layout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">DebtCompass</span>
      </header>

      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => "nav-link" + (isActive ? " nav-link-active" : "")}
          >
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
