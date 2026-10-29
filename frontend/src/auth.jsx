import { createContext, useContext, useEffect, useState } from "react";
import api from "./api";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [ready, setReady] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      return;
    }
    // Verify token validity in background
    api
      .get("/auth/me")
      .then((r) => {
        setUser(r.data);
        localStorage.setItem("user", JSON.stringify(r.data));
      })
      .catch((err) => {
        // ONLY log out if the server explicitly confirmed the token is invalid/expired
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        }
      });
  }, []);

  const login = async (username, password) => {
    const body = new URLSearchParams({ username, password });
    const r = await api.post("/auth/login", body);
    localStorage.setItem("token", r.data.access_token);
    localStorage.setItem("user", JSON.stringify(r.data.user));
    setUser(r.data.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const can = (p) => !!user?.role?.permissions?.includes(p);

  return <Ctx.Provider value={{ user, ready, login, logout, can }}>{children}</Ctx.Provider>;
}
