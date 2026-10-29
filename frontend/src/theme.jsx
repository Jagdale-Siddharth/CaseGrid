import { createContext, useContext, useEffect, useState } from "react";

const Ctx = createContext(null);
export const useTheme = () => useContext(Ctx);

// Chart colours as plain values (SVG fills cannot rely on Tailwind classes)
export const PALETTE = {
  light: { ink: "#0B1F42", muted: "#586378", grid: "#dde3ee", brand: "#2F63B5", accent: "#FF9933", danger: "#C12026", good: "#138808", series: ["#163E80", "#FF9933", "#138808", "#7FA3DA", "#C12026"] },
  dark: { ink: "#E8EDF6", muted: "#98A5BC", grid: "#2C3C5C", brand: "#6EA0EE", accent: "#FF9933", danger: "#FF786E", good: "#54C864", series: ["#6EA0EE", "#FF9933", "#54C864", "#A9C4F0", "#FF786E"] },
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || "light");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);
  return <Ctx.Provider value={{ theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")), c: PALETTE[theme] }}>{children}</Ctx.Provider>;
}
