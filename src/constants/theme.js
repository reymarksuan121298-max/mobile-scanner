export const COLORS = {
  // Brand Primary & Accent
  primary: '#002B66',       // Deep Corporate Navy
  primaryDark: '#001D47',   // Darker Navy for headers/status bars
  primaryLight: '#0A3F8A',  // Lighter Navy
  accent: '#FFD700',        // STL Gold Accent
  accentDark: '#E6C200',    // Darker Gold for active pressed states
  
  // Status Colors
  success: '#059669',       // Emerald Green (Claimed / Valid)
  successLight: '#D1FAE5',  // Light Green badge bg
  warning: '#D97706',       // Amber / Gold (Pending / Unclaimed)
  warningLight: '#FEF3C7',  // Light Amber badge bg
  danger: '#DC2626',        // Crimson Red (Void / Error / Cancel)
  dangerLight: '#FEE2E2',   // Light Red badge bg
  info: '#2563EB',          // Royal Blue
  infoLight: '#DBEAFE',

  // Neutrals & Surfaces
  background: '#F1F5F9',    // Slate-100 screen background
  surface: '#FFFFFF',       // Card & Sheet white
  surfaceAlt: '#F8FAFC',    // Slate-50 alternative card
  border: '#CBD5E1',        // Slate-300 border
  borderLight: '#E2E8F0',   // Slate-200 subtle divider
  
  // Text Colors
  textPrimary: '#0F172A',   // Slate-900 High contrast
  textSecondary: '#475569', // Slate-600 Subtitles
  textMuted: '#94A3B8',     // Slate-400 Placeholders / Labels
  textInverse: '#FFFFFF',   // White text
  textAccent: '#FFD700',    // Gold text

  // Dark overlay
  overlay: 'rgba(15, 23, 42, 0.75)',
  scannerBackdrop: 'rgba(0, 29, 71, 0.85)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FONTS = {
  regular: 'System',
  bold: 'System',
  mono: 'monospace',
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#002B66',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  large: {
    shadowColor: '#002B66',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
};
