import React, { useState } from 'react'
import { Box, Button, MenuItem, Popover, Stack, TextField, Typography } from '@mui/material'
import { useSprint } from '../../shared/sprint/context'
import { defaultSprintConfig } from '../../shared/sprint/config'
import { alignStartDateToToday } from '../../shared/sprint/calc'

function dateToInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${hh}:${mm}`
}

export const SprintSelector: React.FC = () => {
  const { config, setConfig, current, now } = useSprint()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [startDate, setStartDate] = useState(dateToInput(current.start))
  const [weeks, setWeeks] = useState<number>(Math.max(1, Math.min(4, Math.round(config.lengthDays / 7))))

  const open = (e: React.MouseEvent<HTMLElement>) => {
    setStartDate(dateToInput(current.start))
    setWeeks(Math.max(1, Math.min(4, Math.round(config.lengthDays / 7))))
    setAnchorEl(e.currentTarget)
  }
  const close = () => setAnchorEl(null)

  const save = () => {
    if (!startDate || Number.isNaN(new Date(startDate).getTime())) return
    if (weeks < 1 || weeks > 4) return
    const lengthDays = weeks * 7
    const aligned = alignStartDateToToday(startDate, lengthDays, now)
    setConfig({ startDate: aligned, lengthDays })
    close()
  }

  const reset = () => {
    const d = defaultSprintConfig()
    setStartDate(d.startDate)
    setWeeks(Math.round(d.lengthDays / 7))
  }

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        onClick={open}
        sx={{
          textTransform: 'none',
          borderColor: '#e0e0e0',
          color: '#111827',
          fontWeight: 600,
          '&:hover': { borderColor: '#1976d2', bgcolor: '#f9fafb' },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box component="span" sx={{ fontSize: 11, color: '#6b7280' }}>
            スプリント
          </Box>
          <Box component="span">{current.label}</Box>
          <Box component="span" sx={{ fontSize: 11, color: '#6b7280' }}>
            · {config.lengthDays / 7}週
          </Box>
        </Stack>
      </Button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { p: 2.5, width: 280, borderRadius: 2 } } }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          スプリント設定
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="現スプリント開始日時"
            type="datetime-local"
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="スプリント期間"
            select
            size="small"
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            fullWidth
          >
            {[1, 2, 3, 4].map((w) => (
              <MenuItem key={w} value={w}>
                {w}週（{w * 7}日）
              </MenuItem>
            ))}
          </TextField>
          <Typography variant="caption" sx={{ color: '#6b7280' }}>
            現スプリント: {current.label}
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" onClick={reset} sx={{ textTransform: 'none' }}>
              デフォルト
            </Button>
            <Button size="small" variant="contained" onClick={save} sx={{ textTransform: 'none' }}>
              保存
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </>
  )
}
