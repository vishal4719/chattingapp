import { Navigate, Outlet } from "react-router-dom";

export function UserProtectedRoute() {
  const userToken = localStorage.getItem("userToken");
  const adminToken = localStorage.getItem("adminToken");

  if (!userToken && !adminToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
