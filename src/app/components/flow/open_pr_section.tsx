import React, { useMemo } from 'react'
import {
  Box,
  Chip,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip as MuiTooltip,
  Typography,
} from '@mui/material'
import { OpenPrs } from '../../domain/models/open_pr/open_prs'
import { COLOR, SectionHeader } from './shared'

interface Props {
  openPrs: OpenPrs
}

const STATUS_META: Record<keyof ReturnType<OpenPrs['statusCount']>, { label: string; color: string }> = {
  approved: { label: '承認済み', color: COLOR.success },
  pending: { label: 'レビュー中', color: COLOR.primary },
  reviewWaiting: { label: 'レビュー待ち', color: COLOR.warning },
  changesRequested: { label: '変更要求', color: COLOR.error },
  draft: { label: 'Draft', color: COLOR.textMuted },
}

export const OpenPrSection: React.FC<Props> = ({ openPrs }) => {
  const statusData = useMemo(() => {
    const counts = openPrs.statusCount()
    const total = openPrs.totalCount || 1
    return (Object.keys(STATUS_META) as Array<keyof typeof STATUS_META>).map((key) => ({
      key,
      ...STATUS_META[key],
      count: counts[key],
      pct: (counts[key] / total) * 100,
    }))
  }, [openPrs])

  const sorted = openPrs.sortedByOpenDays().slice(0, 15)

  if (openPrs.totalCount === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderColor: COLOR.border }}>
        <Typography color="text.secondary">現在オープンの PR はありません</Typography>
      </Paper>
    )
  }

  return (
    <Stack spacing={3}>
      <SectionHeader
        overline="OPEN PRS"
        title="オープン中の PR"
        desc="現在マージされていない PR · 古い PR が多いと WIP 過多でフロー効率が下がる"
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
          gap: 2,
        }}
      >
        <SummaryTile label="オープン総数" value={openPrs.totalCount} />
        <SummaryTile label="7日以上更新なし" value={openPrs.staleCount} danger={openPrs.staleCount > 0} />
        <SummaryTile
          label="14日以上経過"
          value={openPrs.oldCount}
          danger={openPrs.oldCount > 0}
          suffix={`平均 ${openPrs.avgOpenDays}日`}
        />
      </Box>

      <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
          ステータス内訳
        </Typography>
        <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
          どのフェーズで詰まっているか
        </Typography>
        <Box
          sx={{
            mt: 2,
            display: 'flex',
            height: 36,
            borderRadius: 1,
            overflow: 'hidden',
            border: `1px solid ${COLOR.border}`,
          }}
        >
          {statusData.map((s) =>
            s.pct > 0 ? (
              <MuiTooltip key={s.key} title={`${s.label}: ${s.count} PR (${s.pct.toFixed(1)}%)`} arrow>
                <Box
                  sx={{
                    width: `${s.pct}%`,
                    bgcolor: s.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {s.pct >= 8 ? `${s.pct.toFixed(0)}%` : ''}
                </Box>
              </MuiTooltip>
            ) : null,
          )}
        </Box>
        <Stack direction="row" spacing={2} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
          {statusData.map((s) => (
            <Stack key={s.key} direction="row" alignItems="center" spacing={0.75}>
              <Box sx={{ width: 10, height: 10, bgcolor: s.color, borderRadius: 0.5 }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {s.label}
              </Typography>
              <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
                {s.count}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
          古い PR（経過日数順）
        </Typography>
        <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
          上位15件
        </Typography>
        <TableContainer sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>#</TableCell>
                <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>タイトル</TableCell>
                <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>作成者</TableCell>
                <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>ステータス</TableCell>
                <TableCell align="right" sx={{ color: COLOR.textMuted, fontWeight: 600 }}>
                  経過
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((pr) => {
                const color = pr.isOld ? COLOR.error : pr.isStale ? COLOR.warning : COLOR.textMuted
                return (
                  <TableRow key={pr.prNumber} sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ color: COLOR.textMuted }}>#{pr.prNumber}</TableCell>
                    <TableCell sx={{ maxWidth: 380 }}>
                      <Link
                        href={pr.url}
                        target="_blank"
                        rel="noopener"
                        sx={{
                          color: '#111827',
                          fontWeight: 500,
                          textDecoration: 'none',
                          '&:hover': { color: COLOR.primary },
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {pr.title}
                      </Link>
                    </TableCell>
                    <TableCell>{pr.author}</TableCell>
                    <TableCell>
                      <Chip label={pr.statusLabel} size="small" sx={{ height: 22, fontWeight: 600, fontSize: 11 }} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color }}>
                      {pr.openDays}日
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  )
}

const SummaryTile: React.FC<{
  label: string
  value: number
  danger?: boolean
  suffix?: string
}> = ({ label, value, danger, suffix }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2.5,
      borderColor: COLOR.border,
      borderRadius: 2,
    }}
  >
    <Typography variant="caption" sx={{ color: COLOR.textMuted, letterSpacing: 0.3 }}>
      {label.toUpperCase()}
    </Typography>
    <Typography variant="h4" sx={{ fontWeight: 700, color: danger ? COLOR.error : '#111827', mt: 0.5 }}>
      {value}
    </Typography>
    {suffix && (
      <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
        {suffix}
      </Typography>
    )}
  </Paper>
)
