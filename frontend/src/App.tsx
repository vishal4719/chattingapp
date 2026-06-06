import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { WhatsAppLayout } from "./components/WhatsAppLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { EmptyChat } from "./pages/EmptyChat";
import { Join } from "./pages/Join";
import { ChatRoute } from "./pages/ChatRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route element={<WhatsAppLayout />}>
        <Route path="/dashboard" element={<EmptyChat />} />
        <Route path="/chat/:conversationId" element={<ChatRoute />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/admin-dashboard" element={<Dashboard />} />
      </Route>
      <Route path="/join/:token" element={<Join />} />
    </Routes>
  );
}
