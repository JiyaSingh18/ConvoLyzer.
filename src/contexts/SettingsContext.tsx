import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
  theme: 'light' | 'dark';
  color: 'blue' | 'pink' | 'yellow';
  fontSize: 'small' | 'medium' | 'large';
  notifications: boolean;
  sound: boolean;
  setTheme: (theme: 'light' | 'dark') => void;
  setColor: (color: 'blue' | 'pink' | 'yellow') => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setNotifications: (enabled: boolean) => void;
  setSound: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load settings from localStorage or use defaults
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  const [color, setColor] = useState<'blue' | 'pink' | 'yellow'>(() => {
    const saved = localStorage.getItem('color');
    return (saved as 'blue' | 'pink' | 'yellow') || 'blue';
  });

  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>(() => {
    const saved = localStorage.getItem('fontSize');
    return (saved as 'small' | 'medium' | 'large') || 'medium';
  });

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('notifications');
    return saved ? JSON.parse(saved) : true;
  });

  const [sound, setSound] = useState(() => {
    const saved = localStorage.getItem('sound');
    return saved ? JSON.parse(saved) : true;
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('color', color);
    document.documentElement.setAttribute('data-color', color);
  }, [color]);

  useEffect(() => {
    localStorage.setItem('fontSize', fontSize);
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('sound', JSON.stringify(sound));
  }, [sound]);

  const value = {
    theme,
    color,
    fontSize,
    notifications,
    sound,
    setTheme,
    setColor,
    setFontSize,
    setNotifications,
    setSound,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}; 