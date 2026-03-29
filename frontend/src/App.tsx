import { useState, MouseEvent } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar, Toolbar, Typography, Button, Box, Menu, MenuItem,
  Container, ListItemText,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
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
import InvitesPage from "./pages/InvitesPage";

interface NavDropdownItem {
  path: string;
  label: string;
  children: { path: string; label: string }[];
}

function NavDropdownButton({ item, location }: { item: NavDropdownItem; location: ReturnType<typeof useLocation> }) {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const isActive =
    location.pathname === item.path ||
    (item.path !== "/" && location.pathname.startsWith(item.path)) ||
    item.children.some((c) => location.pathname === c.path || location.pathname.startsWith(c.path));

  const handleOpen = (e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget);
  const handleClose = () => setAnchor(null);

  return (
    <>
      <Button
        color="inherit"
        onClick={() => navigate(item.path)}
        onMouseEnter={handleOpen}
        endIcon={<ArrowDropDownIcon />}
        sx={{
          bgcolor: isActive ? "rgba(255,255,255,0.15)" : "transparent",
          "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
        }}
      >
        {item.label}
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={handleClose}
        slotProps={{ list: { onMouseLeave: handleClose } }}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        disableAutoFocusItem
      >
        {item.children.map((child) => (
          <MenuItem
            key={child.path}
            selected={location.pathname === child.path || location.pathname.startsWith(child.path)}
            onClick={() => { navigate(child.path); handleClose(); }}
          >
            <ListItemText>{child.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();

  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup";

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Routes>
    );
  }

  const dropdownItems: NavDropdownItem[] = [
    { path: "/clients", label: "Clients", children: [{ path: "/projects", label: "Projects" }] },
    { path: "/time", label: "Time Tracking", children: [{ path: "/invoices", label: "Invoices" }] },
    {
      path: "/settings",
      label: "Settings",
      children: isAdmin ? [{ path: "/admin/invites", label: "Invites" }] : [],
    },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static">
        <Toolbar>
          <Box
            component={Link}
            to="/"
            sx={{ display: "flex", alignItems: "center", gap: 1, textDecoration: "none", color: "inherit", mr: 3 }}
          >
            <img src="/logo.png" alt="TimeForge" style={{ height: 32 }} />
            <Typography variant="h6" fontWeight="bold">TimeForge</Typography>
          </Box>

          <Button
            color="inherit"
            onClick={() => navigate("/")}
            sx={{
              bgcolor: location.pathname === "/" ? "rgba(255,255,255,0.15)" : "transparent",
              "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
            }}
          >
            Dashboard
          </Button>

          {dropdownItems.map((item) =>
            item.children.length > 0 ? (
              <NavDropdownButton key={item.path} item={item} location={location} />
            ) : (
              <Button
                key={item.path}
                color="inherit"
                onClick={() => navigate(item.path)}
                sx={{
                  bgcolor:
                    location.pathname === item.path || location.pathname.startsWith(item.path)
                      ? "rgba(255,255,255,0.15)"
                      : "transparent",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                }}
              >
                {item.label}
              </Button>
            )
          )}

          <Box sx={{ flexGrow: 1 }} />

          {user && (
            <Button color="inherit" onClick={logout} sx={{ "&:hover": { bgcolor: "rgba(255,255,255,0.1)" } }}>
              Logout
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/time" element={<TimeEntriesPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/new" element={<CreateInvoicePage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin/invites" element={<InvitesPage />} />
            </Route>
          </Route>
        </Routes>
      </Container>
    </Box>
  );
}
