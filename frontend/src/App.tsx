import { Link, Outlet, Route, Routes, useNavigate } from "react-router";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { Wordmark } from "./components/Wordmark";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-page">
      <header className="on-dark sticky top-0 z-30 bg-showroom text-white">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6" aria-label="Main">
          <Link to="/" className="rounded-lg">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {user && (
              <span className="hidden items-center gap-2 text-stone-300 sm:inline-flex">
                {user.full_name}
                {user.role === "admin" && (
                  <span className="rounded-full border border-stone-600 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-stone-300">
                    Admin
                  </span>
                )}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="btn btn-dark px-3 py-2"
            >
              Sign out
            </button>
          </div>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}

function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-page px-4">
      <div className="text-center">
        <h1 className="text-5xl font-extrabold text-stone-950">Page not found</h1>
        <Link to="/" className="btn btn-primary mt-6">
          Back to vehicles
        </Link>
      </div>
    </main>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            <Route path="/" element={<DashboardPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}
