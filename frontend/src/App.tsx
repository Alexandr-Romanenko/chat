import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Chat from "./features/chat/Chat";
import ProtectedRoute from "./features/auth/ProtectedRoutes";
import { useAuth } from "./features/auth/AuthContext";

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />

      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      {/* если пользователь авторизован → на /chat, иначе на /login */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? "/chat" : "/login"} replace />}
      />
    </Routes>
  );
}

export default App;
