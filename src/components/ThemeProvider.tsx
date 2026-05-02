import * as React from "react";

export type ThemeName = "sky" | "dark";

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "hrgreatly.theme";

function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("theme-dark");
    root.classList.remove("theme-sky");
  } else {
    root.classList.add("theme-sky");
    root.classList.remove("theme-dark");
  }
  root.setAttribute("data-theme", theme);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode; defaultTheme?: ThemeName }> = ({
  children,
  defaultTheme = "sky",
}) => {
  const [theme, setThemeState] = React.useState<ThemeName>(() => {
    if (typeof window === "undefined") return defaultTheme;
    const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    return saved === "dark" || saved === "sky" ? saved : defaultTheme;
  });

  React.useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setTheme = React.useCallback((t: ThemeName) => setThemeState(t), []);

  const value = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
