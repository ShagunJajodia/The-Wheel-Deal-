import { Link, Outlet, Route, Routes, useNavigate } from "react-router";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { CartProvider, useCart } from "./cart/CartContext";
import { Wordmark } from "./components/Wordmark";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

function CartButton() {
  const { count, openCart } = useCart();
  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
      className="btn btn-dark relative px-3 py-2"
    >
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2.5 3.5h2.2l1.9 8.6h8l1.5-6H5.4" />
        <circle cx="7.5" cy="15.5" r="1.2" />
        <circle cx="14" cy="15.5" r="1.2" />
      </svg>
      {count > 0 && (
        <span aria-hidden="true" className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-bold leading-5 text-stone-950">
          {count}
        </span>
      )}
    </button>
  );
}

function Shell() {
  const { user } = useAuth();
  return (
    <CartProvider key={user?.id ?? "anon"} userId={user?.id ?? null}>
      <ShellFrame />
    </CartProvider>
  );
}

function ShellFrame() {
  const { user, logout } = useAuth();
  const { clear } = useCart();
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
            <CartButton />
            <button
              type="button"
              onClick={() => {
                clear();
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
