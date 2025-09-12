// src/auth/AuthContext.tsx
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import AxiosInstance from "../../api/AxiosInstance";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  // Проверяем наличие access_token в cookie при инициализации
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!Cookies.get("access_token")
  );

  // Логин через form-urlencoded (для FastAPI OAuth2PasswordRequestForm)
  const login = async (email: string, password: string) => {
    try {
      const params = new URLSearchParams();
      params.append("username", email); // FastAPI ждёт поле username
      params.append("password", password);

      const res = await AxiosInstance.post("/login", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        withCredentials: true, // для отправки cookie при CORS
      });

      const { access_token, refresh_token } = res.data;

      // Сохраняем токены в cookie
      // access_token: 60 минут = 1 час = 1/24 дня
      Cookies.set("access_token", access_token, {
        expires: 1 / 24,
        secure: false, // secure: true,
        sameSite: "lax", // sameSite: "strict",
      });

      console.log(res.data);

      // refresh_token: 1440 минут = 1 день
      Cookies.set("refresh_token", refresh_token, {
        expires: 1,
        secure: false, // secure: true,
        sameSite: "lax", //sameSite: "strict",
      });

      setIsAuthenticated(true);
      navigate("/");
    } catch (err: any) {
      console.error("Login error:", err);
      throw err;
    }
  };

  const logout = () => {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    setIsAuthenticated(false);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Хук для удобного использования AuthContext
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
