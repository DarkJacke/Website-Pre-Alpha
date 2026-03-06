import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../api';

const ThemeContext = createContext(null);

const ACCENT_PRESETS = [
  { name: 'Neon Red', color: '#FF2A6D', rgb: '255,42,109' },
  { name: 'Neon Pink', color: '#FF00FF', rgb: '255,0,255' },
  { name: 'Electric Blue', color: '#05D9E8', rgb: '5,217,232' },
  { name: 'Acid Green', color: '#39FF14', rgb: '57,255,20' },
  { name: 'Cyber Yellow', color: '#FAFF00', rgb: '250,255,0' },
  { name: 'Void Purple', color: '#BD00FF', rgb: '189,0,255' },
  { name: 'Sunset Orange', color: '#FF6B35', rgb: '255,107,53' },
  { name: 'Ice White', color: '#E0F7FA', rgb: '224,247,250' },
];

const WALLPAPERS = [
  { name: 'None', url: '' },
  { name: 'Cyberpunk Alley', url: 'https://images.unsplash.com/photo-1764986313458-dd8964cf3942?crop=entropy&cs=srgb&fm=jpg&q=85' },
  { name: 'Dark Hallway', url: 'https://images.unsplash.com/photo-1674453736349-029f0ffc863a?crop=entropy&cs=srgb&fm=jpg&q=85' },
  { name: 'Abstract Neon', url: 'https://images.unsplash.com/photo-1712002991787-06cb1dcda1c6?crop=entropy&cs=srgb&fm=jpg&q=85' },
];

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [accentColor, setAccentColor] = useState('#FF2A6D');
  const [wallpaperUrl, setWallpaperUrl] = useState('');

  useEffect(() => {
    if (user?.theme_settings) {
      if (user.theme_settings.accent_color) setAccentColor(user.theme_settings.accent_color);
      if (user.theme_settings.wallpaper_url !== undefined) setWallpaperUrl(user.theme_settings.wallpaper_url);
    }
  }, [user]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', accentColor);
    document.documentElement.style.setProperty('--accent-rgb', hexToRgb(accentColor));
  }, [accentColor]);

  const changeAccent = useCallback(async (color) => {
    setAccentColor(color);
    try { await api.updateTheme({ accent_color: color }); } catch {}
  }, []);

  const changeWallpaper = useCallback(async (url) => {
    setWallpaperUrl(url);
    try { await api.updateTheme({ wallpaper_url: url }); } catch {}
  }, []);

  return (
    <ThemeContext.Provider value={{ accentColor, wallpaperUrl, changeAccent, changeWallpaper, ACCENT_PRESETS, WALLPAPERS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
