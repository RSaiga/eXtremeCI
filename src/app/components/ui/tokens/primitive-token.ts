export const PrimitiveToken = {
  colors: {
    gray: {
      0: '#FFFFFF',
      20: '#F2F4F7',
      60: '#D8D8D8',
      70: '#AFAFAF',
      80: '#727272',
      100: '#000000',
    },
    red: {
      50: '#AF4B4B',
      60: '#F44336', // Material Red
      70: '#FF6384', // Chart Red
    },
    green: {
      50: '#4CAF50', // Material Green
      60: '#4BC05C', // Chart Green
      70: '#8BC34A', // Light Green
    },
    blue: {
      50: '#2196F3', // Material Blue
      60: '#4285F4', // Google Blue
    },
    yellow: {
      50: '#FFC107', // Amber
      60: '#FFCE56', // Chart Yellow
      70: '#CDDC39', // Lime
    },
    orange: {
      50: '#FF9800', // Material Orange
      60: '#FF5722', // Deep Orange
    },
    purple: {
      50: '#AB47BC', // Material Purple
    },
  },
  typography: {
    fontSize: {
      10: 10,
      12: 12,
      14: 14,
      16: 16,
      18: 18,
      20: 20,
    },
    weight: {
      regular: 300,
      bold: 600,
    },
    lineHeight: 1.6,
    fontFamily: ['Hiragino Kaku Gothic Pro', 'Meiryo', 'sans-serif'],
  },
  radius: {
    0: 0,
    2: 2,
    4: 4,
    8: 8,
    16: 16,
    1000: 1000,
  },
} as const

/**
 * HEXカラーをRGBA形式に変換するユーティリティ
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
