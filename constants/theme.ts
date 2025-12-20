import { Platform } from 'react-native';

const palette = {
  // Light Mode
  coralOrange: '#FF6B58',
  deepTeal: '#0D9488',
  amber: '#F59E0B',
  warmWhite: '#FAFAF9',
  charcoal: '#1C1917',
  emerald: '#10B981',
  rose: '#F43F5E',

  // Dark Mode
  vibrantCoral: '#FF8A7A',
  cyanTeal: '#14B8A6',
  goldenAmber: '#FBB040',
  richBlack: '#0A0A0A',
  darkGray: '#171717',
  softWhite: '#FAFAF9',
  mint: '#34D399',
  pink: '#FB7185',
};

export const Colors = {
  light: {
    primary: palette.coralOrange,
    secondary: palette.deepTeal,
    accent: palette.amber,
    background: palette.warmWhite,
    text: palette.charcoal,
    success: palette.emerald,
    error: palette.rose,
    surface: '#FFFFFF',
    card: '#FFFFFF',
    tint: palette.coralOrange,
    icon: palette.charcoal,
    tabIconDefault: '#9BA1A6',
    tabIconSelected: palette.coralOrange,
  },
  dark: {
    primary: palette.vibrantCoral,
    secondary: palette.cyanTeal,
    accent: palette.goldenAmber,
    background: palette.richBlack,
    text: palette.softWhite,
    success: palette.mint,
    error: palette.pink,
    surface: palette.darkGray,
    card: palette.darkGray,
    tint: palette.vibrantCoral,
    icon: palette.softWhite,
    tabIconDefault: '#9BA1A6',
    tabIconSelected: palette.vibrantCoral,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
