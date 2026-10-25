import { Navigate, Outlet } from "react-router";

import { useAuth } from "./AuthContext";

export function ProtectedRoute() {
  const { token, isLoading } = useAuth();
  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading account…</div>;
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
