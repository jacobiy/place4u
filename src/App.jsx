import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./component/ProtectedRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AgentDashboard from "./pages/Agent/MainAgent";
import Landing from "./pages/landing/Landing";
import LandlordDashboard from "./pages/Landlord/MainLandLord";
import Login from "./pages/login/Login";
import ResetPassword from "./pages/resetpassword/resetpassword";
import Signup from "./pages/Signup/SignUp";
import TenantDashboard from "./pages/Tenant/TenantDashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/tenant"
        element={
          <ProtectedRoute allowedRoles={["tenant"]}>
            <TenantDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/landlord"
        element={
          <ProtectedRoute allowedRoles={["landlord"]}>
            <LandlordDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/agent"
        element={
          <ProtectedRoute allowedRoles={["agent"]}>
            <AgentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="/dashboard" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
