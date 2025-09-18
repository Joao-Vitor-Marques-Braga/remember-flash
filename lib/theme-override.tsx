import React from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type Scheme = 'light' | 'dark';

type Ctx = {
  scheme: Scheme;
  setScheme: (s: Scheme) => void;
  toggle: () => void;
};

const ThemeOverrideContext = React.createContext<Ctx | undefined>(undefined);

export function ThemeOverrideProvider({ children }: { children: React.ReactNode }) {
  const system = (useSystemColorScheme() ?? 'light') as Scheme;
  const [scheme, setScheme] = React.useState<Scheme>(system);
  const value = React.useMemo<Ctx>(
    () => ({ scheme, setScheme, toggle: () => setScheme((s) => (s === 'light' ? 'dark' : 'light')) }),
    [scheme]
  );
  return <ThemeOverrideContext.Provider value={value}>{children}</ThemeOverrideContext.Provider>;
}

export function useThemeOverride(): Ctx {
  const ctx = React.useContext(ThemeOverrideContext);
  if (!ctx) throw new Error('useThemeOverride must be used within ThemeOverrideProvider');
  return ctx;
}


