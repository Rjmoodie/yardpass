import { Theme } from '@/types';

export const lightTheme: Theme = {
  colors: {
    primary: '#6366F1', // Indigo - main brand color
    secondary: '#EC4899', // Pink - for highlights and CTAs
    accent: '#8B5CF6', // Purple - accent color
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
    overlay: 'rgba(0, 0, 0, 0.5)',
    gated: '#F59E0B', // Amber for gated content
    vip: '#A855F7', // Purple for VIP access
    crew: '#DC2626', // Red for crew access
  },
  eventColors: {
    music: '#EC4899', // Pink
    sports: '#10B981', // Green
    culture: '#F59E0B', // Amber
    nightlife: '#8B5CF6', // Purple
    business: '#3B82F6', // Blue
    education: '#8B5CF6', // Purple
    food: '#F59E0B', // Amber
    technology: '#3B82F6', // Blue
    health: '#10B981', // Green
    other: '#6B7280', // Gray
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: 'bold',
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: 'bold',
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
    },
    h5: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 20,
    },
    h6: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 18,
    },
    body: {
      fontSize: 16,
      fontWeight: 'normal',
      lineHeight: 24,
    },
    caption: {
      fontSize: 12,
      fontWeight: 'normal',
      lineHeight: 16,
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 20,
    },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 12,
    },
  },
};

export const darkTheme: Theme = {
  colors: {
    primary: '#818CF8', // Lighter indigo for dark mode
    secondary: '#F472B6', // Lighter pink for dark mode
    accent: '#A78BFA', // Lighter purple for dark mode
    background: '#0F172A',
    surface: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    border: '#334155',
    error: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
    info: '#60A5FA',
    overlay: 'rgba(0, 0, 0, 0.7)',
    gated: '#FBBF24', // Lighter amber for dark mode
    vip: '#C084FC', // Lighter purple for dark mode
    crew: '#F87171', // Lighter red for dark mode
  },
  eventColors: {
    music: '#F472B6', // Lighter pink for dark mode
    sports: '#34D399', // Lighter green for dark mode
    culture: '#FBBF24', // Lighter amber for dark mode
    nightlife: '#A78BFA', // Lighter purple for dark mode
    business: '#60A5FA', // Lighter blue for dark mode
    education: '#A78BFA', // Lighter purple for dark mode
    food: '#FBBF24', // Lighter amber for dark mode
    technology: '#60A5FA', // Lighter blue for dark mode
    health: '#34D399', // Lighter green for dark mode
    other: '#94A3B8', // Lighter gray for dark mode
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: 'bold',
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: 'bold',
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
    },
    h5: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 20,
    },
    h6: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 18,
    },
    body: {
      fontSize: 16,
      fontWeight: 'normal',
      lineHeight: 24,
    },
    caption: {
      fontSize: 12,
      fontWeight: 'normal',
      lineHeight: 16,
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 20,
    },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 12,
    },
  },
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: 'normal',
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: 'normal',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: 'normal',
    lineHeight: 16,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
};

// Event-specific colors
export const eventColors = {
  music: '#EC4899', // Pink
  sports: '#10B981', // Green
  culture: '#F59E0B', // Amber
  nightlife: '#8B5CF6', // Purple
  business: '#3B82F6', // Blue
  education: '#8B5CF6', // Purple
  food: '#F59E0B', // Amber
  technology: '#3B82F6', // Blue
  health: '#10B981', // Green
  other: '#6B7280', // Gray
};

// Access level colors
export const accessColors = {
  general: '#6366F1', // Indigo
  vip: '#A855F7', // Purple
  crew: '#DC2626', // Red
};

// Status colors
export const statusColors = {
  active: '#10B981', // Green
  used: '#6B7280', // Gray
  expired: '#EF4444', // Red
  cancelled: '#F59E0B', // Amber
  transferred: '#3B82F6', // Blue
};

// Default theme export (for backward compatibility)
export const theme = lightTheme;
