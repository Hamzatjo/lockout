// LOCKOUT Dark Gym Aesthetic Color Palette

export const colors = {
  // Primary - Electric Green (Valid/Success)
  primary: '#00FF87',
  primaryDark: '#00CC6A',
  primaryLight: '#33FF9F',
  
  // Background - Deep Black
  background: '#0A0A0A',
  backgroundSecondary: '#111111',
  
  // Surface - Dark Grey
  surface: '#1A1A1A',
  surfaceLight: '#2A2A2A',
  surfaceLighter: '#3A3A3A',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#666666',
  
  // Error/CAP - Red
  error: '#FF3B3B',
  errorDark: '#CC2E2E',
  cap: '#FF3B3B', // Alias for CAP votes
  
  // Valid - Green (same as primary)
  valid: '#00FF87',
  
  // Warning - Orange
  warning: '#FF9500',
  
  // Accent - Electric Purple
  accent: '#8B5CF6',
  accentLight: '#A78BFA',
  
  // Borders
  border: '#2A2A2A',
  borderLight: '#3A3A3A',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
} as const;

export type ColorKey = keyof typeof colors;
