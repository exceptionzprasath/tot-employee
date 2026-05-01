// Thambioru Tea Employee App - Brand Color Palette
// Matching customer app branding

export const COLORS = {
    // Primary - Vibrant Red
    primary: '#D32F2F',
    primaryLight: '#EF5350',
    primaryDark: '#B71C1C',

    // Secondary - Bright Yellow
    secondary: '#FBC02D',
    secondaryLight: '#FFF176',
    secondaryDark: '#F9A825',

    // Accent - Changed from Green to Red
    accent: '#D32F2F',
    accentLight: '#EF5350',
    accentDark: '#B71C1C',

    // Supporting Colors
    blue: '#1976D2',
    blueLight: '#42A5F5',
    brown: '#795548',
    brownLight: '#A1887F',

    // Dark Background Logic (Red as requested)
    darkBg: '#B71C1C',

    // Neutrals
    white: '#FFFFFF',
    black: '#000000',
    lightGray: '#F5F5F5',
    gray: '#E0E0E0',
    mediumGray: '#9E9E9E',
    darkGray: '#616161',

    // Status colors
    success: '#D32F2F', // Changed from Green to Red
    warning: '#FBC02D', // Yellow
    error: '#B71C1C',   // Red
    info: '#1976D2',    // Blue

    // Order status colors
    pending: '#FBC02D',    // Yellow
    accepted: '#1976D2',   // Blue
    preparing: '#795548',  // Brown
    onTheWay: '#D32F2F',   // Red
    delivered: '#D32F2F',  // Red (Previously Green)
    cancelled: '#B71C1C',  // Dark Red

    // Backgrounds
    background: '#FAFAFA',
    cardBackground: '#FFFFFF',
    headerBackground: '#B71C1C',

    // Text
    textPrimary: '#212121',
    textSecondary: '#757575',
    textLight: '#FFFFFF',
    textMuted: '#9E9E9E',

    // Employee specific
    online: '#FBC02D', // Yellow instead of Red
    offline: '#9E9E9E',
    busy: '#FBC02D',

    // Tab bar
    tabActive: '#D32F2F',
    tabInactive: '#9E9E9E',
    tabBarBg: '#FFFFFF',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(255, 255, 255, 0.9)',
};

// Font sizes
export const SIZES = {
    xs: 10,
    small: 12,
    medium: 14,
    regular: 16,
    large: 18,
    xlarge: 20,
    xxlarge: 24,
    xxxlarge: 28,
    title: 32,

    // Spacing
    paddingXS: 4,
    paddingS: 8,
    padding: 16,
    paddingL: 24,
    paddingXL: 32,
    margin: 16,
    radius: 12,
    radiusLarge: 16,
    radiusXL: 24,

    // Icon sizes
    iconSmall: 18,
    iconMedium: 24,
    iconLarge: 32,
    iconXL: 48,
};

// Shadows
export const SHADOWS = {
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 3,
    },
    large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
};

export default { COLORS, SIZES, SHADOWS };
