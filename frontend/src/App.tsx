import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { UserProtectedRoute } from "./components/UserProtectedRoute";
import { WhatsAppLayout } from "./components/WhatsAppLayout";
import { NotificationsBootstrap } from "./components/NotificationsBootstrap";
import { PwaBootstrap } from "./components/PwaBootstrap";
import { SeoManager } from "./components/SeoManager";
import { Login } from "./pages/Login";
import { UserRegister } from "./pages/UserRegister";
import { Dashboard } from "./pages/Dashboard";
import { EmptyChat } from "./pages/EmptyChat";
import { Join } from "./pages/Join";
import { ChatRoute } from "./pages/ChatRoute";
import { Download } from "./pages/Download";

export default function App() {
  return (
    <>
      <PwaBootstrap />
      <NotificationsBootstrap />
      <SeoManager />
      <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/user-login" element={<Navigate to="/login" replace />} />
      <Route path="/register" element={<UserRegister />} />
      <Route path="/download" element={<Download />} />
      <Route path="/join/:token" element={<Join />} />
      <Route element={<UserProtectedRoute />}>
        <Route element={<WhatsAppLayout />}>
          <Route path="/dashboard" element={<EmptyChat />} />
          <Route path="/chat/:conversationId" element={<ChatRoute />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/admin-dashboard" element={<Dashboard />} />
      </Route>
    </Routes>
    </>
  );
}
