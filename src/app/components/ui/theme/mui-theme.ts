/**
 * MUIテーマをSemanticTokenで定義
 */

import { createTheme } from '@mui/material'
import { SemanticToken } from '../tokens/semantic-token'
import { PrimitiveToken } from '../tokens/primitive-token'

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: SemanticToken.color.primary.base,
      light: SemanticToken.color.primary.hover,
      dark: SemanticToken.color.primary.base,
      contrastText: SemanticToken.color['primary-foreground'].base,
    },
    secondary: {
      main: SemanticToken.color.secondary.DEFAULT,
    },
    error: {
      main: SemanticToken.color.danger.base,
    },
    background: {
      default: SemanticToken.color.bg.base,
      paper: SemanticToken.color.bg.white,
    },
    text: {
      primary: SemanticToken.color.primary.base,
      secondary: SemanticToken.color.secondary.DEFAULT,
      disabled: SemanticToken.color.primary.disabled,
    },
    divider: SemanticToken.color.border.base,
    grey: {
      50: PrimitiveToken.colors.gray[0],
      100: PrimitiveToken.colors.gray[20],
      200: PrimitiveToken.colors.gray[60],
      300: PrimitiveToken.colors.gray[60],
      400: PrimitiveToken.colors.gray[70],
      500: PrimitiveToken.colors.gray[70],
      600: PrimitiveToken.colors.gray[80],
      700: PrimitiveToken.colors.gray[80],
      800: PrimitiveToken.colors.gray[100],
      900: PrimitiveToken.colors.gray[100],
    },
  },
  typography: {
    fontFamily: SemanticToken.typography.base.fontFamily.join(', '),
    fontSize: 14,
    fontWeightRegular: SemanticToken.typography.fontWeight.regular,
    fontWeightBold: SemanticToken.typography.fontWeight.bold,
    h1: {
      fontSize: SemanticToken.typography.heading.large.fontSize,
      fontWeight: SemanticToken.typography.fontWeight.bold,
      lineHeight: SemanticToken.typography.base.lineHeight,
    },
    h2: {
      fontSize: SemanticToken.typography.heading.large.fontSize,
      fontWeight: SemanticToken.typography.fontWeight.bold,
      lineHeight: SemanticToken.typography.base.lineHeight,
    },
    h3: {
      fontSize: SemanticToken.typography.heading.medium.fontSize,
      fontWeight: SemanticToken.typography.fontWeight.bold,
      lineHeight: SemanticToken.typography.base.lineHeight,
    },
    h4: {
      fontSize: SemanticToken.typography.heading.medium.fontSize,
      fontWeight: SemanticToken.typography.fontWeight.bold,
      lineHeight: SemanticToken.typography.base.lineHeight,
    },
    h5: {
      fontSize: SemanticToken.typography.body.large.fontSize,
      fontWeight: SemanticToken.typography.fontWeight.bold,
      lineHeight: SemanticToken.typography.base.lineHeight,
    },
    h6: {
      fontSize: SemanticToken.typography.body.large.fontSize,
      fontWeight: SemanticToken.typography.fontWeight.bold,
      lineHeight: SemanticToken.typography.base.lineHeight,
    },
    body1: {
      fontSize: SemanticToken.typography.body.medium.fontSize,
      lineHeight: SemanticToken.typography.base.lineHeight,
    },
    body2: {
      fontSize: SemanticToken.typography.body.small.fontSize,
      lineHeight: SemanticToken.typography.base.lineHeight,
    },
    caption: {
      fontSize: SemanticToken.typography.body.caption.fontSize,
      lineHeight: SemanticToken.typography.base.lineHeight,
    },
  },
  shape: {
    borderRadius: SemanticToken.typography.radius.md,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: SemanticToken.typography.radius.lg,
          border: `1px solid ${SemanticToken.color.border.base}`,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: SemanticToken.typography.radius.lg,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: SemanticToken.typography.radius.md,
          textTransform: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: SemanticToken.color.border.table,
        },
        head: {
          backgroundColor: SemanticToken.color.bg.base,
          fontWeight: SemanticToken.typography.fontWeight.bold,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: SemanticToken.typography.radius.full,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: SemanticToken.typography.radius.md,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: SemanticToken.typography.radius.sm,
        },
      },
    },
  },
})