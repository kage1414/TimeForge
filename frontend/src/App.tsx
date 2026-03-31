import { useState, useRef, useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import ClientsPage from "./pages/ClientsPage";
import ProjectsPage from "./pages/ProjectsPage";
import TimeEntriesPage from "./pages/TimeEntriesPage";
import InvoicesPage from "./pages/InvoicesPage";
import InvoiceDetailPage from "./pages/InvoiceDetailPage";
import CreateInvoicePage from "./pages/CreateInvoicePage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ImportPage from "./pages/ImportPage";
import InvitesPage from "./pages/InvitesPage";

interface NavItem {
  path: string;
  label: string;
  children?: NavItem[];
  adminOnly?: boolean;
}

function NavDropdown({ item, location }: { item: NavItem; location: ReturnType<typeof useLocation> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isActive =
    location.pathname === item.path ||
    (item.path !== "/" && location.pathname.startsWith(item.path)) ||
    item.children?.some(
      (c) => location.pathname === c.path || location.pathname.startsWith(c.path)
    );

  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Link
        to={item.path}
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? "bg-indigo-100 text-indigo-700"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        }`}
      >
        {item.label}
        <svg className="inline ml-1 w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Link>
      {open && (
        <div className="absolute top-full left-0 mt-0 pt-1 z-50">
          <div className="bg-white rounded-md shadow-lg border py-1 min-w-[160px]">
            {item.children!.map((child) => (
              <Link
                key={child.path}
                to={child.path}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2 text-sm transition-colors ${
                  location.pathname === child.path || location.pathname.startsWith(child.path)
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {child.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();

  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/signup";

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Routes>
    );
  }

  const navItems: NavItem[] = [
    { path: "/", label: "Dashboard" },
    {
      path: "/clients",
      label: "Clients",
      children: [{ path: "/projects", label: "Projects" }],
    },
    {
      path: "/time",
      label: "Time Tracking",
      children: [
        { path: "/invoices", label: "Invoices" },
        { path: "/import", label: "Import" },
      ],
    },
    {
      path: "/settings",
      label: "Settings",
      children: isAdmin ? [{ path: "/admin/invites", label: "Invites" }] : undefined,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/logo.png" alt="TimeForge" className="h-8" />
              <span className="text-xl font-bold text-indigo-600">
                TimeForge
              </span>
            </Link>
            <div className="flex items-center space-x-1">
              {navItems.map((item) =>
                item.children ? (
                  <NavDropdown key={item.path} item={item} location={location} />
                ) : (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === item.path
                        ? "bg-indigo-100 text-indigo-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              )}
              {user && (
                <button
                  onClick={logout}
                  className="ml-4 px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/time" element={<TimeEntriesPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/new" element={<CreateInvoicePage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin/invites" element={<InvitesPage />} />
            </Route>
          </Route>
        </Routes>
      </main>
    </div>
  );
}
