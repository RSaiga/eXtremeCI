import React from 'react'
import { Box, Card, CardContent, Stack, Tooltip as MuiTooltip, Typography } from '@mui/material'
import { ResponsiveContainer, LineChart, Line } from 'recharts'

export const COLOR = {
  primary: '#1976d2',
  primaryLight: '#e3f2fd',
  success: '#2e7d32',
  warning: '#ed6c02',
  error: '#d32f2f',
  border: '#e0e0e0',
  textMuted: '#6b7280',
  bgSoft: '#f9fafb',
  fast: '#2e7d32',
  normal: '#1976d2',
  slow: '#ed6c02',
  vslow: '#d32f2f',
}

export const formatHours = (h: number): string => {
  if (!Number.isFinite(h) || h <= 0) return '—'
  return h < 24 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`
}

export const formatInt = (n: number): string => n.toLocaleString('ja-JP')

interface DeltaBadgeProps {
  current: number
  previous: number
  invertGood?: boolean
  suffix?: string
}

export const DeltaBadge: React.FC<DeltaBadgeProps> = ({
  current,
  previous,
  invertGood = true,
  suffix = '前スプリント比',
}) => {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0 || current === 0) {
    return (
      <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
        — {suffix}
      </Typography>
    )
  }
  const delta = ((current - previous) / previous) * 100
  if (Math.abs(delta) < 0.5) {
    return (
      <Typography variant="caption" sx={{ color: COLOR.textMuted, fontWeight: 600 }}>
        ± 0% {suffix}
      </Typography>
    )
  }
  const isUp = delta > 0
  const good = invertGood ? !isUp : isUp
  const color = good ? COLOR.success : COLOR.error
  const arrow = isUp ? '▲' : '▼'
  return (
    <Typography variant="caption" sx={{ color, fontWeight: 700 }}>
      {arrow} {Math.abs(delta).toFixed(0)}%{' '}
      <Typography component="span" variant="caption" sx={{ color: COLOR.textMuted, fontWeight: 400 }}>
        {suffix}
      </Typography>
    </Typography>
  )
}

interface KpiProps {
  label: string
  value: string
  sub?: React.ReactNode
  hint?: string
  accent?: string
  spark?: Array<{ x: number | string; y: number }>
  active?: boolean
  onClick?: () => void
}

export const KpiCard: React.FC<KpiProps> = ({
  label,
  value,
  sub,
  hint,
  accent = COLOR.primary,
  spark,
  active,
  onClick,
}) => (
  <Card
    variant="outlined"
    onClick={onClick}
    sx={{
      height: '100%',
      borderColor: active ? accent : COLOR.border,
      borderWidth: active ? 2 : 1,
      borderRadius: 2,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all .2s',
      position: 'relative',
      '&:hover': onClick
        ? {
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            borderColor: accent,
          }
        : {},
    }}
  >
    {active && (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          bgcolor: accent,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      />
    )}
    <CardContent sx={{ pb: '16px !important' }}>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: COLOR.textMuted, fontWeight: 500, letterSpacing: 0.3 }}>
          {label.toUpperCase()}
        </Typography>
        {hint && (
          <MuiTooltip title={hint} arrow>
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 13,
                height: 13,
                borderRadius: '50%',
                border: `1px solid ${COLOR.textMuted}`,
                color: COLOR.textMuted,
                fontSize: 9,
                fontWeight: 700,
                cursor: 'help',
              }}
            >
              i
            </Box>
          </MuiTooltip>
        )}
      </Stack>
      <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.1, color: '#111827' }}>
        {value}
      </Typography>
      <Box sx={{ mt: 0.5, minHeight: 18 }}>{sub}</Box>
      {spark && spark.length > 1 && (
        <Box sx={{ mt: 1, height: 28 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spark}>
              <Line type="monotone" dataKey="y" stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </CardContent>
  </Card>
)

interface SectionHeaderProps {
  overline: string
  title: string
  desc?: string
  right?: React.ReactNode
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ overline, title, desc, right }) => (
  <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ mb: 2 }}>
    <Box>
      <Typography variant="overline" sx={{ color: COLOR.textMuted, letterSpacing: 1 }}>
        {overline}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {desc && (
        <Typography variant="body2" sx={{ color: COLOR.textMuted, mt: 0.5 }}>
          {desc}
        </Typography>
      )}
    </Box>
    {right}
  </Stack>
)
