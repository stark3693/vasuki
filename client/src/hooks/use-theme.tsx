import { createContext, useContext, useState, useEffect } from 'react';
import { useIndexedDB } from './use-indexeddb';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage first, then IndexedDB
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('vasukii-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {
      console.log('localStorage not available, using dark mode');
    }
    return 'dark';
  });
  
  const { isReady: isDbReady, getItem, setItem } = useIndexedDB();

  // Load theme from IndexedDB when ready
  useEffect(() => {
    const loadTheme = async () => {
      if (!isDbReady) return;
      
      try {
        const savedTheme = await getItem('theme');
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
          setThemeState(savedTheme);
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      }
    };

    loadTheme();
  }, [isDbReady, getItem]);

  // Apply theme to DOM and save
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    
    // Save to both localStorage (instant) and IndexedDB (persistent)
    try {
      localStorage.setItem('vasukii-theme', theme);
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
    
    if (isDbReady) {
      setItem('theme', theme).catch(console.error);
    }
  }, [theme, isDbReady, setItem]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
