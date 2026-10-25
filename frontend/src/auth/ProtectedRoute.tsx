import { Navigate, Outlet } from "react-router";

import { useAuth } from "./AuthContext";

export function ProtectedRoute() {
  const { token, isLoading } = useAuth();
  if (isLoading) return <div className="p-8 text-center text-stone-500 dark:text-stone-400">Loading account…</div>;
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
