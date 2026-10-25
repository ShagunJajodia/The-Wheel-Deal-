import { Link, Outlet, Route, Routes, useNavigate } from "react-router";
import { AdminRoute } from "./auth/AdminRoute";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AdminPage } from "./pages/AdminPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return <div className="min-h-screen bg-slate-50"><header className="border-b border-slate-200 bg-white"><nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6"><Link to="/" className="text-xl font-black tracking-tight text-indigo-600">The Wheel Deal<span className="text-amber-500">.</span></Link><div className="flex items-center gap-4 text-sm font-semibold"><Link to="/" className="text-slate-600 hover:text-indigo-600">Browse</Link>{user?.role === "admin" && <Link to="/admin" className="text-slate-600 hover:text-indigo-600">Manage</Link>}<span className="hidden text-slate-400 sm:inline">{user?.full_name}</span><button type="button" onClick={() => { logout(); navigate("/login"); }} className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700 hover:bg-slate-200">Sign out</button></div></nav></header><Outlet /></div>;
}

export function App() {
  return <AuthProvider><Routes><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /><Route element={<ProtectedRoute />}><Route element={<Shell />}><Route path="/" element={<DashboardPage />} /><Route element={<AdminRoute />}><Route path="/admin" element={<AdminPage />} /></Route></Route></Route><Route path="*" element={<main className="grid min-h-screen place-items-center bg-slate-50"><div className="text-center"><h1 className="text-5xl font-black">Page not found</h1><Link to="/" className="mt-5 inline-block text-indigo-600">Back to vehicles</Link></div></main>} /></Routes></AuthProvider>;
}
