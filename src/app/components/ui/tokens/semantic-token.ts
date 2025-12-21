
import { PrimitiveToken as token } from './primitive-token'

export const SemanticToken = {
  color: {
    primary: {
      base: token.colors.gray[100],
      hover: token.colors.gray[80],
      disabled: token.colors.gray[70],
    },
    'primary-foreground': {
      base: token.colors.gray[0],
      disabled: token.colors.gray[80],
    },
    danger: {
      base: token.colors.red[50],
    },
    border: {
      input: token.colors.gray[100],
      base: token.colors.gray[70],
      table: token.colors.gray[60],
    },
    accent: {
      base: token.colors.gray[20],
    },
    secondary: {
      DEFAULT: token.colors.gray[80],
    },
    muted: {
      base: token.colors.gray[70],
    },
    bg: {
      base: token.colors.gray[20],

      dark: token.colors.gray[100],
      darkgray: token.colors.gray[80],
      gray: token.colors.gray[70],
      lightgray: token.colors.gray[60],
      white: token.colors.gray[0],
    },
    // 状態表示用カラー
    status: {
      good: {
        base: token.colors.green[50],
        light: token.colors.green[70],
      },
      warning: {
        base: token.colors.orange[50],
        deep: token.colors.orange[60],
      },
      danger: {
        base: token.colors.red[50],
        light: token.colors.red[70],
      },
      info: {
        base: token.colors.blue[50],
      },
    },
    // チャート用カラー
    chart: {
      blue: {
        base: token.colors.blue[60],
        light: token.colors.blue[50],
      },
      green: {
        base: token.colors.green[60],
        light: token.colors.green[70],
      },
      yellow: {
        base: token.colors.yellow[60],
        amber: token.colors.yellow[50],
        lime: token.colors.yellow[70],
      },
      orange: {
        base: token.colors.orange[50],
        deep: token.colors.orange[60],
      },
      red: {
        base: token.colors.red[70],
        deep: token.colors.red[60],
      },
      purple: {
        base: token.colors.purple[50],
      },
      gray: {
        base: token.colors.gray[80],
        light: token.colors.gray[70],
      },
    },
  },
  typography: {
    base: {
      fontFamily: token.typography.fontFamily,
      lineHeight: token.typography.lineHeight,
      fontWeight: token.typography.weight.regular,
    },
    heading: {
      large: {
        fontSize: token.typography.fontSize[20],
      },
      medium: {
        fontSize: token.typography.fontSize[18],
      },
    },
    body: {
      large: {
        fontSize: token.typography.fontSize[16],
      },
      medium: {
        fontSize: token.typography.fontSize[14],
      },
      small: {
        fontSize: token.typography.fontSize[12],
      },
      caption: {
        fontSize: token.typography.fontSize[10],
      },
    },
    icon: {
      medium: {
        fontSize: token.typography.fontSize[20],
      },
      small: {
        fontSize: token.typography.fontSize[16],
      },
    },
    fontWeight: {
      regular: token.typography.weight.regular,
      bold: token.typography.weight.bold,
    },
    radius: {
      none: token.radius[0],
      sm: token.radius[2],
      md: token.radius[4],
      lg: token.radius[8],
      xl: token.radius[16],
      full: token.radius[1000],
    },
  },
} as const
