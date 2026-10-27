import { CacheProvider } from "@emotion/react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { rtlCache } from "./rtl";
import { createAppTheme } from "./theme";
import type { ColorMode } from "./tokens";

const STORAGE_KEY = "csc.color-mode";

interface ColorModeValue {
  mode: ColorMode;
  toggle: () => void;
}

const ColorModeContext = createContext<ColorModeValue>({ mode: "light", toggle: () => undefined });

function readStoredMode(): ColorMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** Light is the default; the user's choice is remembered in this browser only. */
export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ColorMode>(readStoredMode);
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  const toggle = useCallback(() => {
    setMode((current) => {
      const next = current === "light" ? "dark" : "light";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Storage may be unavailable (private window): the choice lasts for this visit.
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ mode, toggle }), [mode, toggle]);

  return (
    <ColorModeContext.Provider value={value}>
      <CacheProvider value={rtlCache}>
        <ThemeProvider theme={theme}>
          <CssBaseline enableColorScheme />
          {children}
        </ThemeProvider>
      </CacheProvider>
    </ColorModeContext.Provider>
  );
}

export function useColorMode(): ColorModeValue {
  return useContext(ColorModeContext);
}
