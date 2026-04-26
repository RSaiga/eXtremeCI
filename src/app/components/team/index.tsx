import React, { useMemo, useState } from 'react'
import {
  Box,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip as MuiTooltip,
  Typography,
} from '@mui/material'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Layer,
  Legend,
  Rectangle,
  ResponsiveContainer,
  Sankey,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Contributors } from '../../domain/models/contributor/contributors'
import { ReviewNetwork } from '../../domain/models/review_network/review_network'
import { MemberStats, TeamMetrics } from '../../domain/models/team/team_metrics'
import { PrDetailData } from '../../infra/github/pr_data'
import { TeamService } from '../../domain/services/team/team_service'
import { useSprint } from '../../shared/sprint/context'
import { SprintRange } from '../../shared/sprint/calc'
import { COLOR, DeltaBadge, formatHours, formatInt, KpiCard, SectionHeader } from '../flow/shared'

interface Props {
  contributors: Contributors
  reviewNetwork: ReviewNetwork
  teamMetricsAllTime: TeamMetrics
  closedPrs: PrDetailData[]
  tabsNav?: React.ReactNode
}

type Scope = 'sprint' | 'all'

const STACK_COLORS = [
  '#1976d2',
  '#2e7d32',
  '#ed6c02',
  '#9c27b0',
  '#0288d1',
  '#c2185b',
  '#5d4037',
  '#f57c00',
  '#388e3c',
  '#7b1fa2',
]

export const TeamTab: React.FC<Props> = ({
  contributors: contributorsAllTime,
  reviewNetwork: networkAllTime,
  teamMetricsAllTime,
  closedPrs,
  tabsNav,
}) => {
  const { current, previous, all } = useSprint()
  const [scope, setScope] = useState<Scope>('sprint')

  const { teamMetrics, contributors, network, prev } = useMemo(() => {
    if (scope === 'all') {
      return {
        teamMetrics: teamMetricsAllTime,
        contributors: contributorsAllTime,
        network: networkAllTime,
        prev: null as { metrics: TeamMetrics; contributors: Contributors; network: ReviewNetwork } | null,
      }
    }
    const startMs = current.start.getTime()
    const endMs = current.end.getTime()
    const result = TeamService.buildForRange(closedPrs, contributorsAllTime, startMs, endMs)
    const prevResult = TeamService.buildForRange(
      closedPrs,
      contributorsAllTime,
      previous.start.getTime(),
      previous.end.getTime(),
    )
    return {
      teamMetrics: result.metrics,
      contributors: result.contributors,
      network: result.network,
      prev: { metrics: prevResult.metrics, contributors: prevResult.contributors, network: prevResult.network },
    }
  }, [
    scope,
    current.start,
    current.end,
    previous.start,
    previous.end,
    closedPrs,
    contributorsAllTime,
    networkAllTime,
    teamMetricsAllTime,
  ])

  return (
    <Stack spacing={3}>
      {tabsNav}
      <SectionHeader
        overline="TEAM HEALTH"
        title="チーム"
        desc="分布・偏り・ネットワーク · 健全に回っているか？"
        right={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
              {scope === 'sprint' ? `現スプリント ${current.label}` : '全期間 (90日)'}
            </Typography>
            <ScopeToggle scope={scope} onChange={setScope} />
          </Stack>
        }
      />

      <SummaryKpis contributors={contributors} network={network} teamMetrics={teamMetrics} prev={prev} />
      <ContributionSection contributors={contributors} />
      <ReviewLoadSection network={network} teamMetrics={teamMetrics} />
      <ReviewNetworkSection network={network} />
      <CycleBreakdownSection teamMetrics={teamMetrics} />
      <CycleTrendSection allSprints={all} closedPrs={closedPrs} contributorsAllTime={contributorsAllTime} />
      <ActivityTimelineSection contributorsAllTime={contributorsAllTime} allSprints={all} />
      <MemberTableSection teamMetrics={teamMetrics} />
      {teamMetrics.inactiveMembers.length > 0 && <InactiveMembersSection teamMetrics={teamMetrics} />}
    </Stack>
  )
}

const ScopeToggle: React.FC<{ scope: Scope; onChange: (s: Scope) => void }> = ({ scope, onChange }) => (
  <Box
    sx={{
      display: 'inline-flex',
      p: 0.5,
      bgcolor: COLOR.bgSoft,
      border: `1px solid ${COLOR.border}`,
      borderRadius: 2,
    }}
  >
    {[
      { key: 'sprint' as Scope, label: '現スプリント' },
      { key: 'all' as Scope, label: '全期間 (90日)' },
    ].map((o) => {
      const active = scope === o.key
      return (
        <Box
          key={o.key}
          onClick={() => onChange(o.key)}
          sx={{
            px: 2,
            py: 0.5,
            borderRadius: 1.5,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            color: active ? '#111827' : COLOR.textMuted,
            bgcolor: active ? '#fff' : 'transparent',
            boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all .15s',
          }}
        >
          {o.label}
        </Box>
      )
    })}
  </Box>
)

// =============================================================================
// 1. Summary KPIs
// =============================================================================

const SummaryKpis: React.FC<{
  contributors: Contributors
  network: ReviewNetwork
  teamMetrics: TeamMetrics
  prev: { metrics: TeamMetrics; contributors: Contributors; network: ReviewNetwork } | null
}> = ({ contributors, network, teamMetrics, prev }) => {
  const top3 = contributors.top3CommitShare
  const cv = network.reviewLoadImbalance
  const mutual = teamMetrics.mutualReviewParticipationRate * 100

  const busAccent = top3 < 50 ? COLOR.success : top3 < 70 ? COLOR.warning : COLOR.error
  const cvAccent = cv < 0.5 ? COLOR.success : cv < 1.0 ? COLOR.warning : COLOR.error
  const mutualAccent = mutual >= 80 ? COLOR.success : mutual >= 50 ? COLOR.warning : COLOR.error

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
      <KpiCard
        label="アクティブ人数"
        value={formatInt(contributors.contributorCount)}
        sub={
          prev ? (
            <DeltaBadge
              current={contributors.contributorCount}
              previous={prev.contributors.contributorCount}
              invertGood={false}
            />
          ) : (
            <Sub>スコープ内にコミットした著者</Sub>
          )
        }
        accent={COLOR.primary}
      />
      <KpiCard
        label="バス係数リスク"
        value={`Top3 ${top3.toFixed(0)}%`}
        sub={
          <Stack spacing={0.25}>
            <Sub>50%占有に必要 {teamMetrics.busFactorN}人</Sub>
            {prev && (
              <DeltaBadge current={teamMetrics.busFactorN} previous={prev.metrics.busFactorN} invertGood={false} />
            )}
          </Stack>
        }
        hint="上位3人のコミットシェア。高いほど知識集中リスクが大きい。busFactorN が増えると分散化（良い方向）"
        accent={busAccent}
      />
      <KpiCard
        label="レビュー負荷の偏り"
        value={cv.toFixed(2)}
        sub={
          <Stack spacing={0.25}>
            <Sub>変動係数 · 低いほど均等</Sub>
            {prev && <DeltaBadge current={cv} previous={prev.network.reviewLoadImbalance} invertGood />}
          </Stack>
        }
        hint="レビュー数の標準偏差 / 平均。0に近いほど全員均等、1超は偏り大"
        accent={cvAccent}
      />
      <KpiCard
        label="レビュー相互参加率"
        value={`${mutual.toFixed(0)}%`}
        sub={
          <Stack spacing={0.25}>
            <Sub>著者のうちレビューも行う人</Sub>
            {prev && (
              <DeltaBadge
                current={mutual}
                previous={prev.metrics.mutualReviewParticipationRate * 100}
                invertGood={false}
              />
            )}
          </Stack>
        }
        hint="PRを出している著者のうち、自身も誰かをレビューしている人の割合"
        accent={mutualAccent}
      />
    </Box>
  )
}

// =============================================================================
// 2. Contribution distribution
// =============================================================================

const ContributionSection: React.FC<{ contributors: Contributors }> = ({ contributors }) => {
  const top10 = contributors.topByCommits(10)
  const shares = contributors.contributionShares
  const top1 = shares.sort((a, b) => b.commitShare - a.commitShare)[0]
  const top3Commit = contributors.top3CommitShare
  const data = top10.map((c) => ({
    name: c.author,
    commits: c.commitCount,
    changes: c.totalChanges,
  }))

  return (
    <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        コントリビューション分布
      </Typography>
      <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
        上位10人のコミット数とコード変更量 · Top1 {top1?.commitShare.toFixed(0) ?? 0}% / Top3 {top3Commit.toFixed(0)}%
      </Typography>
      <Box
        sx={{
          mt: 2,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
        }}
      >
        <Box sx={{ height: 320 }}>
          <Typography variant="caption" sx={{ color: COLOR.textMuted, fontWeight: 600 }}>
            コミット数
          </Typography>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, bottom: 0, left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: COLOR.textMuted }} allowDecimals={false} />
              <YAxis
                dataKey="name"
                type="category"
                width={80}
                tick={{ fontSize: 11, fill: COLOR.textMuted }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: `1px solid ${COLOR.border}`, fontSize: 12 }}
                formatter={(v: number) => [formatInt(v), 'コミット数']}
              />
              <Bar dataKey="commits" fill={COLOR.primary} radius={[0, 4, 4, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
        <Box sx={{ height: 320 }}>
          <Typography variant="caption" sx={{ color: COLOR.textMuted, fontWeight: 600 }}>
            コード変更量 (行)
          </Typography>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, bottom: 0, left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: COLOR.textMuted }} />
              <YAxis
                dataKey="name"
                type="category"
                width={80}
                tick={{ fontSize: 11, fill: COLOR.textMuted }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: `1px solid ${COLOR.border}`, fontSize: 12 }}
                formatter={(v: number) => [formatInt(v), 'コード変更量']}
              />
              <Bar dataKey="changes" fill={COLOR.success} radius={[0, 4, 4, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    </Paper>
  )
}

// =============================================================================
// 3. Review load distribution
// =============================================================================

const ReviewLoadSection: React.FC<{ network: ReviewNetwork; teamMetrics: TeamMetrics }> = ({
  network,
  teamMetrics,
}) => {
  const stats = network.reviewerStats.slice(0, 10)
  const data = stats.map((s) => ({
    name: s.name,
    reviewCount: s.reviewCount,
    ratio: s.ratio,
  }))

  return (
    <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        レビュー負荷分布
      </Typography>
      <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
        上位10レビュアー · 貢献度比 = レビュー数 / 被レビュー数（1.0超 = 貢献者）
      </Typography>
      <Box sx={{ height: 320, mt: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, bottom: 0, left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: COLOR.textMuted }} />
            <YAxis
              dataKey="name"
              type="category"
              width={80}
              tick={{ fontSize: 11, fill: COLOR.textMuted }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: `1px solid ${COLOR.border}`, fontSize: 12 }}
              formatter={(v: number, name: string) => [
                name === 'reviewCount' ? formatInt(v) : v.toFixed(2),
                name === 'reviewCount' ? 'レビュー数' : '貢献度比',
              ]}
            />
            <Bar dataKey="reviewCount" name="レビュー数" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.ratio >= 1 ? COLOR.success : COLOR.primary} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {teamMetrics.unreviewedAuthors.length > 0 && (
        <Box sx={{ mt: 2, p: 2, bgcolor: COLOR.bgSoft, borderRadius: 1, border: `1px solid ${COLOR.border}` }}>
          <Typography variant="caption" sx={{ color: COLOR.warning, fontWeight: 700 }}>
            ⚠ 未レビュー著者 {teamMetrics.unreviewedAuthors.length}名
          </Typography>
          <Typography variant="caption" sx={{ color: COLOR.textMuted, display: 'block', mt: 0.5 }}>
            PRを出しているが一度もレビューしていない:{' '}
            {teamMetrics.unreviewedAuthors.map((a) => `${a.author}(PR${a.prCount})`).join(', ')}
          </Typography>
        </Box>
      )}
    </Paper>
  )
}

// =============================================================================
// 4. Review network heatmap
// =============================================================================

const ReviewNetworkSection: React.FC<{ network: ReviewNetwork }> = ({ network }) => {
  const { relations } = network

  // Sankey 用: author と reviewer は同名でも別ノードとして扱う（suffix で区別）
  const sankeyData = useMemo(() => {
    const authorNames = Array.from(new Set(relations.map((r) => r.author)))
    const reviewerNames = Array.from(new Set(relations.map((r) => r.reviewer)))
    const authorIndex = new Map(authorNames.map((n, i) => [n, i]))
    const reviewerIndex = new Map(reviewerNames.map((n, i) => [n, authorNames.length + i]))
    const nodes = [
      ...authorNames.map((n) => ({ name: `${n} (著者)` })),
      ...reviewerNames.map((n) => ({ name: `${n} (レビュアー)` })),
    ]
    const links = relations.map((r) => ({
      source: authorIndex.get(r.author)!,
      target: reviewerIndex.get(r.reviewer)!,
      value: r.count,
    }))
    return { nodes, links }
  }, [relations])

  const topPairs = useMemo(() => [...relations].sort((a, b) => b.count - a.count).slice(0, 20), [relations])

  if (relations.length === 0) return null

  return (
    <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        レビューネットワーク
      </Typography>
      <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
        左: 著者 / 右: レビュアー · 線の太さ = レビュー回数
      </Typography>
      <Box sx={{ height: Math.max(280, sankeyData.nodes.length * 18), mt: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={sankeyData}
            node={<SankeyNode />}
            link={{ stroke: COLOR.primary, strokeOpacity: 0.25 }}
            nodePadding={12}
            margin={{ top: 10, right: 160, bottom: 10, left: 160 }}
          >
            <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${COLOR.border}`, fontSize: 12 }} />
          </Sankey>
        </ResponsiveContainer>
      </Box>

      <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
        Top ペアランキング
      </Typography>
      <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
        レビュー回数上位 {Math.min(20, topPairs.length)} ペア
      </Typography>
      <TableContainer sx={{ mt: 1, maxHeight: 360 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>#</TableCell>
              <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>著者</TableCell>
              <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>レビュアー</TableCell>
              <TableCell align="right" sx={{ color: COLOR.textMuted, fontWeight: 600 }}>
                回数
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {topPairs.map((p, i) => (
              <TableRow key={`${p.author}-${p.reviewer}`} sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell sx={{ color: COLOR.textMuted }}>{i + 1}</TableCell>
                <TableCell sx={{ fontWeight: 500 }}>{p.author}</TableCell>
                <TableCell>{p.reviewer}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {p.count}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}

// Sankey ノードラベル（名前を右端に表示）
const SankeyNode: React.FC<any> = ({ x, y, width, height, index, payload, containerWidth }) => {
  const isLeft = x < (containerWidth ?? 800) / 2
  return (
    <Layer key={`node-${index}`}>
      <Rectangle x={x} y={y} width={width} height={height} fill="#1976d2" fillOpacity={0.8} />
      <text
        textAnchor={isLeft ? 'end' : 'start'}
        x={isLeft ? x - 6 : x + width + 6}
        y={y + height / 2}
        fontSize={11}
        fill="#374151"
        dominantBaseline="middle"
      >
        {payload?.name}
      </text>
    </Layer>
  )
}

// =============================================================================
// 5. Cycle time breakdown
// =============================================================================

const CycleBreakdownSection: React.FC<{ teamMetrics: TeamMetrics }> = ({ teamMetrics }) => {
  const b = teamMetrics.cycleBreakdown
  const segments = [
    { label: 'コミット→PR作成', value: b.commitToPrHours, color: COLOR.primary },
    { label: 'PR作成→初回レビュー', value: b.prToFirstReviewHours, color: COLOR.warning },
    { label: '初回レビュー→承認', value: b.firstReviewToApprovedHours, color: COLOR.success },
    { label: '承認→マージ', value: b.approvedToMergedHours, color: '#9c27b0' },
  ]
  const total = b.totalHours > 0 ? b.totalHours : 0
  const bottleneck = segments.reduce((a, s) => (s.value > a.value ? s : a), segments[0])

  return (
    <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        サイクルタイム区間分解
      </Typography>
      <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
        各区間の中央値 · 合計 {formatHours(b.totalHours)} · N = {formatInt(b.sampleSize)}
      </Typography>
      <Box
        sx={{
          mt: 2,
          display: 'flex',
          height: 44,
          borderRadius: 1,
          overflow: 'hidden',
          border: `1px solid ${COLOR.border}`,
        }}
      >
        {segments.map((s) => {
          const pct = total > 0 ? (s.value / total) * 100 : 0
          if (pct < 0.1) return null
          return (
            <MuiTooltip key={s.label} title={`${s.label}: ${formatHours(s.value)}`} arrow>
              <Box
                sx={{
                  width: `${pct}%`,
                  bgcolor: s.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {pct >= 10 ? formatHours(s.value) : ''}
              </Box>
            </MuiTooltip>
          )
        })}
      </Box>
      <Stack direction="row" spacing={2} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
        {segments.map((s) => (
          <Stack key={s.label} direction="row" alignItems="center" spacing={0.75}>
            <Box sx={{ width: 12, height: 12, bgcolor: s.color, borderRadius: 0.5 }} />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {s.label}
            </Typography>
            <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
              {formatHours(s.value)}
            </Typography>
          </Stack>
        ))}
      </Stack>
      {b.sampleSize > 0 && bottleneck.value > 0 && (
        <Typography variant="caption" sx={{ color: COLOR.error, fontWeight: 700, display: 'block', mt: 1.5 }}>
          ボトルネック: {bottleneck.label}（{formatHours(bottleneck.value)}）
        </Typography>
      )}
    </Paper>
  )
}

// =============================================================================
// 5b. Cycle breakdown sprint trend
// =============================================================================

const CycleTrendSection: React.FC<{
  allSprints: SprintRange[]
  closedPrs: PrDetailData[]
  contributorsAllTime: Contributors
}> = ({ allSprints, closedPrs, contributorsAllTime }) => {
  const data = useMemo(
    () =>
      allSprints.map((sp) => {
        const { metrics } = TeamService.buildForRange(
          closedPrs,
          contributorsAllTime,
          sp.start.getTime(),
          sp.end.getTime(),
        )
        const b = metrics.cycleBreakdown
        return {
          label: sp.label,
          commitToPr: b.commitToPrHours,
          prToFirstReview: b.prToFirstReviewHours,
          firstReviewToApproved: b.firstReviewToApprovedHours,
          approvedToMerged: b.approvedToMergedHours,
          total: b.totalHours,
          sampleSize: b.sampleSize,
        }
      }),
    [allSprints, closedPrs, contributorsAllTime],
  )

  if (data.length === 0) return null

  const segmentMeta = [
    { key: 'commitToPr', label: 'コミット→PR作成', color: COLOR.primary },
    { key: 'prToFirstReview', label: 'PR作成→初回レビュー', color: COLOR.warning },
    { key: 'firstReviewToApproved', label: '初回レビュー→承認', color: COLOR.success },
    { key: 'approvedToMerged', label: '承認→マージ', color: '#9c27b0' },
  ] as const

  return (
    <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            サイクルタイム区間分解 スプリント推移
          </Typography>
          <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
            x軸 = スプリント · 各棒 = 4区間中央値の積み上げ
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          {segmentMeta.map((s) => (
            <Stack key={s.key} direction="row" alignItems="center" spacing={0.5}>
              <Box sx={{ width: 10, height: 10, bgcolor: s.color, borderRadius: 0.5 }} />
              <Typography variant="caption" sx={{ fontSize: 10 }}>
                {s.label}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
      <Box sx={{ height: 260, mt: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: COLOR.textMuted }}
              axisLine={{ stroke: COLOR.border }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: COLOR.textMuted }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v < 24 ? `${v}h` : `${(v / 24).toFixed(0)}d`)}
            />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: `1px solid ${COLOR.border}`, fontSize: 12 }}
              formatter={(v: number, name: string) => {
                const meta = segmentMeta.find((s) => s.key === name)
                return [formatHours(v), meta?.label ?? name]
              }}
              labelFormatter={(l) => `スプリント: ${l}`}
            />
            {segmentMeta.map((s) => (
              <Bar key={s.key} dataKey={s.key} stackId="cycle" fill={s.color} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  )
}

// =============================================================================
// 6. Activity timeline (90 days)
// =============================================================================

const ActivityTimelineSection: React.FC<{
  contributorsAllTime: Contributors
  allSprints: SprintRange[]
}> = ({ contributorsAllTime, allSprints }) => {
  const { rows, topAuthors } = useMemo(() => {
    // 全期間の上位10著者を固定（スプリント間で色を一貫させる）
    const top10 = contributorsAllTime.topByCommits(10).map((c) => c.author)
    const topSet = new Set(top10)

    const sprintRows = allSprints.map((sp) => {
      const startMs = sp.start.getTime()
      const endMs = sp.end.getTime()
      const row: { label: string; total: number; [k: string]: string | number } = { label: sp.label, total: 0 }
      for (const a of top10) row[a] = 0
      row['その他'] = 0

      for (const d of contributorsAllTime.dailyCommits) {
        const t = new Date(d.date).getTime()
        if (t < startMs || t >= endMs) continue
        for (const [author, count] of Object.entries(d.authorCounts)) {
          if (count === 0) continue
          if (topSet.has(author)) {
            row[author] = (row[author] as number) + count
          } else {
            row['その他'] += count
          }
          row.total += count
        }
      }
      return row
    })
    return { rows: sprintRows, topAuthors: top10 }
  }, [contributorsAllTime, allSprints])

  if (rows.length === 0) return null

  return (
    <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        活動 スプリント推移
      </Typography>
      <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
        x軸 = スプリント · 各棒 = スプリント内コミット数（著者別スタック · 上位10 + その他）
      </Typography>
      <Box sx={{ height: 280, mt: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: COLOR.textMuted }}
              axisLine={{ stroke: COLOR.border }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: COLOR.textMuted }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: `1px solid ${COLOR.border}`, fontSize: 12 }}
              labelFormatter={(l) => `スプリント: ${l}`}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {topAuthors.map((a, i) => (
              <Bar
                key={a}
                dataKey={a}
                stackId="c"
                fill={STACK_COLORS[i % STACK_COLORS.length]}
                isAnimationActive={false}
              />
            ))}
            <Bar dataKey="その他" stackId="c" fill="#bdbdbd" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  )
}

// =============================================================================
// 7. Member table
// =============================================================================

type SortKey = 'commitCount' | 'prCount' | 'reviewCount' | 'avgCycleTimeHours' | 'avgReviewResponseHours'

const MemberTableSection: React.FC<{ teamMetrics: TeamMetrics }> = ({ teamMetrics }) => {
  const [sortKey, setSortKey] = useState<SortKey>('commitCount')
  const [asc, setAsc] = useState(false)

  const sorted = useMemo(() => {
    const arr = [...teamMetrics.memberStats]
    arr.sort((a, b) => {
      const av = a[sortKey] ?? -Infinity
      const bv = b[sortKey] ?? -Infinity
      if (av === bv) return a.author.localeCompare(b.author)
      return asc ? av - bv : bv - av
    })
    return arr
  }, [teamMetrics, sortKey, asc])

  const toggle = (k: SortKey) => {
    if (sortKey === k) setAsc(!asc)
    else {
      setSortKey(k)
      setAsc(false)
    }
  }

  const headers: { key: SortKey; label: string; align?: 'right' }[] = [
    { key: 'commitCount', label: 'コミット', align: 'right' },
    { key: 'prCount', label: 'PR数', align: 'right' },
    { key: 'reviewCount', label: 'レビュー数', align: 'right' },
    { key: 'avgCycleTimeHours', label: '平均サイクル', align: 'right' },
    { key: 'avgReviewResponseHours', label: '平均応答', align: 'right' },
  ]

  return (
    <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        メンバー別サマリー
      </Typography>
      <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
        列ヘッダークリックでソート · 個人評価ではなく分布把握用
      </Typography>
      <TableContainer sx={{ mt: 2, maxHeight: 480 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>名前</TableCell>
              {headers.map((h) => (
                <TableCell key={h.key} align={h.align} sx={{ color: COLOR.textMuted, fontWeight: 600 }}>
                  <TableSortLabel
                    active={sortKey === h.key}
                    direction={asc ? 'asc' : 'desc'}
                    onClick={() => toggle(h.key)}
                  >
                    {h.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((m: MemberStats) => (
              <TableRow key={m.author} sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell sx={{ fontWeight: 500 }}>{m.author}</TableCell>
                <TableCell align="right">{formatInt(m.commitCount)}</TableCell>
                <TableCell align="right">{formatInt(m.prCount)}</TableCell>
                <TableCell align="right">{formatInt(m.reviewCount)}</TableCell>
                <TableCell align="right" sx={{ color: COLOR.textMuted }}>
                  {m.avgCycleTimeHours ? formatHours(m.avgCycleTimeHours) : '—'}
                </TableCell>
                <TableCell align="right" sx={{ color: COLOR.textMuted }}>
                  {m.avgReviewResponseHours ? formatHours(m.avgReviewResponseHours) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}

// =============================================================================
// Inactive members alert
// =============================================================================

const InactiveMembersSection: React.FC<{ teamMetrics: TeamMetrics }> = ({ teamMetrics }) => (
  <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.warning, borderRadius: 2 }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: COLOR.warning, mb: 0.5 }}>
      ⚠ 直近30日以上コミットがないメンバー
    </Typography>
    <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
      離脱 / 休止の可能性あり · 参考情報
    </Typography>
    <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
      {teamMetrics.inactiveMembers.map((m) => (
        <Box
          key={m.author}
          sx={{
            px: 1.5,
            py: 0.5,
            bgcolor: COLOR.bgSoft,
            border: `1px solid ${COLOR.border}`,
            borderRadius: 1,
            fontSize: 12,
          }}
        >
          <strong>{m.author}</strong>{' '}
          <Typography component="span" variant="caption" sx={{ color: COLOR.textMuted }}>
            {m.daysSinceLastCommit}日前
          </Typography>
        </Box>
      ))}
    </Stack>
  </Paper>
)

// =============================================================================
// Shared
// =============================================================================

const Sub: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
    {children}
  </Typography>
)
