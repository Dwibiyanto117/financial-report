import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("finreport_token") || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.get("/auth/me");
          if (res.data.success) {
            setUser(res.data.data);
            localStorage.setItem("finreport_user", JSON.stringify(res.data.data));
          }
        } catch (err) {
          console.error("Gagal memuat profil pengguna:", err);
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    if (res.data.success) {
      const { user: userData, token: userToken } = res.data.data;
      setToken(userToken);
      setUser(userData);
      localStorage.setItem("finreport_token", userToken);
      localStorage.setItem("finreport_user", JSON.stringify(userData));
    }
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password });
    if (res.data.success) {
      const { user: userData, token: userToken } = res.data.data;
      setToken(userToken);
      setUser(userData);
      localStorage.setItem("finreport_token", userToken);
      localStorage.setItem("finreport_user", JSON.stringify(userData));
    }
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("finreport_token");
    localStorage.removeItem("finreport_user");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}