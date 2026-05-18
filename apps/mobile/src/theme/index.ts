/**
 * Sistema de diseño centralizado.
 * Soporta light y dark mode automáticamente.
 */

import { useColorScheme } from 'react-native';

const palette = {
  amber50: '#FAEEDA',
  amber100: '#FAC775',
  amber500: '#EF9F27',
  amber600: '#BA7517',
  amber900: '#412402',

  green50: '#EAF3DE',
  green500: '#639922',
  green800: '#27500A',

  red50: '#FCEBEB',
  red500: '#E24B4A',
  red800: '#791F1F',

  neutral0: '#FFFFFF',
  neutral50: '#F9F9F8',
  neutral100: '#F1EFE8',
  neutral200: '#D3D1C7',
  neutral400: '#888780',
  neutral600: '#5F5E5A',
  neutral800: '#2C2C2A',
  neutral900: '#1C1C1A',
};

export const lightTheme = {
  colors: {
    background: palette.neutral50,
    surface: palette.neutral0,
    surfaceVariant: palette.neutral100,
    primary: palette.amber500,
    primaryDark: palette.amber600,
    textPrimary: palette.neutral900,
    textSecondary: palette.neutral600,
    textTertiary: palette.neutral400,
    textOnPrimary: palette.neutral0,
    border: palette.neutral200,
    borderStrong: palette.neutral400,
    success: palette.green500,
    successBg: palette.green50,
    successText: palette.green800,
    warning: palette.amber500,
    warningBg: palette.amber50,
    warningText: palette.amber900,
    danger: palette.red500,
    dangerBg: palette.red50,
    dangerText: palette.red800,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  typography: {
    title: { fontSize: 28, fontWeight: '600' as const },
    headline: { fontSize: 22, fontWeight: '600' as const },
    subtitle: { fontSize: 18, fontWeight: '500' as const },
    body: { fontSize: 16, fontWeight: '400' as const },
    caption: { fontSize: 13, fontWeight: '400' as const },
    overline: {
      fontSize: 11,
      fontWeight: '500' as const,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
  },
};

export const darkTheme: typeof lightTheme = {
  ...lightTheme,
  colors: {
    background: palette.neutral900,
    surface: palette.neutral800,
    surfaceVariant: '#3A3A38',
    primary: palette.amber500,
    primaryDark: palette.amber600,
    textPrimary: palette.neutral0,
    textSecondary: palette.neutral200,
    textTertiary: palette.neutral400,
    textOnPrimary: palette.neutral0,
    border: '#3A3A38',
    borderStrong: palette.neutral400,
    success: palette.green500,
    successBg: '#1A2D0E',
    successText: '#A8D67A',
    warning: palette.amber500,
    warningBg: '#3D2A0A',
    warningText: palette.amber100,
    danger: palette.red500,
    dangerBg: '#3D1818',
    dangerText: '#F4A0A0',
  },
};

export const theme = lightTheme;

export function useTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}

export type Theme = typeof lightTheme;
