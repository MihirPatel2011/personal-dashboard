import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

// Apply theme before first React paint to avoid flash
const bootstrap = () => {
  const saved = localStorage.getItem('apex-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  return saved;
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(bootstrap);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('apex-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be within ThemeProvider');
  return ctx;
};
