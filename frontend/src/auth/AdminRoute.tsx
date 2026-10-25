import { Navigate, Outlet } from "react-router";

import { useAuth } from "./AuthContext";

export function AdminRoute() {
  const { token, user, isLoading } = useAuth();
  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading account…</div>;
  if (!token) return <Navigate to="/login" replace />;
  return user?.role === "admin" ? <Outlet /> : <Navigate to="/" replace />;
}
