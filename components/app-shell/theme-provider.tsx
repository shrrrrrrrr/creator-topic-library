"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "@/lib/constants";
import type { ThemeColor, UserSettings } from "@/types/settings";

type ThemeDefinition = {
  label: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  background?: string;
  foreground?: string;
  card?: string;
  cardForeground?: string;
  border?: string;
  input?: string;
  muted?: string;
  mutedForeground?: string;
};

type ThemeContextValue = {
  applyTheme: (themeColor: ThemeColor) => void;
  currentThemeColor: ThemeColor;
  themes: Record<ThemeColor, ThemeDefinition>;
};

const defaultSettings: UserSettings = {
  nickname: "创作者",
  avatarUrl: "",
  themeColor: "cyan",
};

export const themes: Record<ThemeColor, ThemeDefinition> = {
  red: {
    label: "红",
    primary: "0 72% 51%",
    primaryForeground: "0 0% 100%",
    accent: "24 90% 60%",
    accentForeground: "0 0% 100%",
  },
  orange: {
    label: "橙",
    primary: "24 90% 50%",
    primaryForeground: "0 0% 100%",
    accent: "39 92% 55%",
    accentForeground: "30 30% 12%",
  },
  yellow: {
    label: "黄",
    primary: "45 93% 47%",
    primaryForeground: "35 35% 12%",
    accent: "54 92% 56%",
    accentForeground: "35 35% 12%",
  },
  green: {
    label: "绿",
    primary: "142 71% 34%",
    primaryForeground: "0 0% 100%",
    accent: "160 84% 39%",
    accentForeground: "0 0% 100%",
  },
  cyan: {
    label: "青",
    primary: "173 72% 30%",
    primaryForeground: "0 0% 100%",
    accent: "24 90% 60%",
    accentForeground: "0 0% 100%",
  },
  blue: {
    label: "蓝",
    primary: "217 91% 48%",
    primaryForeground: "0 0% 100%",
    accent: "199 89% 48%",
    accentForeground: "0 0% 100%",
  },
  purple: {
    label: "紫",
    primary: "262 83% 58%",
    primaryForeground: "0 0% 100%",
    accent: "326 78% 55%",
    accentForeground: "0 0% 100%",
  },
  light: {
    label: "浅色",
    primary: "215 20% 28%",
    primaryForeground: "0 0% 100%",
    accent: "39 77% 91%",
    accentForeground: "215 28% 17%",
    background: "48 29% 97%",
    foreground: "215 28% 17%",
    card: "0 0% 100%",
    cardForeground: "215 28% 17%",
    border: "214 21% 88%",
    input: "214 21% 88%",
    muted: "210 20% 94%",
    mutedForeground: "215 16% 47%",
  },
  dark: {
    label: "深色",
    primary: "188 86% 43%",
    primaryForeground: "210 40% 98%",
    accent: "24 90% 60%",
    accentForeground: "210 40% 98%",
    background: "222 47% 8%",
    foreground: "210 40% 96%",
    card: "222 40% 12%",
    cardForeground: "210 40% 96%",
    border: "217 33% 20%",
    input: "217 33% 20%",
    muted: "217 33% 16%",
    mutedForeground: "215 20% 72%",
  },
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredThemeColor(): ThemeColor {
  if (typeof window === "undefined") {
    return defaultSettings.themeColor;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEYS.userSettings);

    if (!rawValue) {
      return defaultSettings.themeColor;
    }

    const settings = JSON.parse(rawValue) as Partial<UserSettings>;

    return settings.themeColor && settings.themeColor in themes
      ? settings.themeColor
      : defaultSettings.themeColor;
  } catch {
    return defaultSettings.themeColor;
  }
}

function setVariable(name: string, value: string | undefined) {
  if (!value) {
    return;
  }

  document.documentElement.style.setProperty(name, value);
}

function applyThemeVariables(themeColor: ThemeColor) {
  const theme = themes[themeColor];

  setVariable("--primary", theme.primary);
  setVariable("--primary-foreground", theme.primaryForeground);
  setVariable("--ring", theme.primary);
  setVariable("--accent", theme.accent);
  setVariable("--accent-foreground", theme.accentForeground);
  setVariable("--background", theme.background);
  setVariable("--foreground", theme.foreground);
  setVariable("--card", theme.card);
  setVariable("--card-foreground", theme.cardForeground);
  setVariable("--border", theme.border);
  setVariable("--input", theme.input);
  setVariable("--muted", theme.muted);
  setVariable("--muted-foreground", theme.mutedForeground);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentThemeColor, setCurrentThemeColor] = useState<ThemeColor>(
    defaultSettings.themeColor
  );

  useEffect(() => {
    const storedThemeColor = readStoredThemeColor();
    setCurrentThemeColor(storedThemeColor);
    applyThemeVariables(storedThemeColor);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      applyTheme: (themeColor) => {
        setCurrentThemeColor(themeColor);
        applyThemeVariables(themeColor);
      },
      currentThemeColor,
      themes,
    }),
    [currentThemeColor]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
}
