import React, { useEffect, useState } from 'react'
import { Box, Button, CircularProgress, Container, Stack, Tab, Tabs, Typography } from '@mui/material'
import { RepoSwitcher } from '../../components/repo_switcher'
import { SprintSelector } from '../../components/sprint_selector'
import { FlowTab } from '../../components/flow'
import { QualityTab } from '../../components/quality'
import { TeamTab } from '../../components/team'
import { DoraTab } from '../../components/dora'
import { useSprint } from '../../shared/sprint/context'
import { DashboardService } from '../../domain/services/dashboard'
import { ReadTimes } from '../../domain/models/read_time/read.times'
import { PrSizes } from '../../domain/models/pr_size/pr_sizes'
import { ReviewTimes } from '../../domain/models/review_time/review_times'
import { OpenPrs } from '../../domain/models/open_pr/open_prs'
import { Contributors } from '../../domain/models/contributor/contributors'
import { ReviewNetwork } from '../../domain/models/review_network/review_network'
import { TeamMetrics } from '../../domain/models/team/team_metrics'
import { PrDetailData } from '../../infra/github/pr_data'
import { useActiveRepo } from '../../shared/repos/context'
import { repoKey } from '../../shared/repos/config'

type TabKey = 'flow' | 'quality' | 'team' | 'dora'

interface TabDef {
  key: TabKey
  label: string
  question: string
  ready: boolean
}

const TABS: TabDef[] = [
  { key: 'flow', label: 'フロー', question: '速くマージできているか？', ready: true },
  { key: 'quality', label: '品質', question: '良いやり方で作れているか？', ready: true },
  { key: 'team', label: 'チーム', question: '健全に回っているか？', ready: true },
  { key: 'dora', label: 'DORA', question: 'Four Keys で見るとどうか？', ready: true },
]

export const DashboardPage: React.FC = () => {
  const { activeRepo, selectedRepos, repos } = useActiveRepo()
  const { current: currentSprint } = useSprint()
  const [loading, setLoading] = useState(false)
  const [readTimes, setReadTimes] = useState<ReadTimes>(new ReadTimes([]))
  const [prSizes, setPrSizes] = useState<PrSizes>(new PrSizes([]))
  const [reviewTimes, setReviewTimes] = useState<ReviewTimes>(new ReviewTimes([]))
  const [openPrs, setOpenPrs] = useState<OpenPrs>(new OpenPrs([]))
  const [contributors, setContributors] = useState<Contributors>(new Contributors([]))
  const [reviewNetwork, setReviewNetwork] = useState<ReviewNetwork>(new ReviewNetwork([]))
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null)
  const [closedPrs, setClosedPrs] = useState<PrDetailData[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('flow')
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const data = await DashboardService.fetchAll(selectedRepos)
        if (!cancelled) {
          setReadTimes(data.readTimes)
          setPrSizes(data.prSizes)
          setReviewTimes(data.reviewTimes)
          setOpenPrs(data.openPrs)
          setContributors(data.contributors)
          setReviewNetwork(data.reviewNetwork)
          setTeamMetrics(data.teamMetrics)
          setClosedPrs(data.closedPrs)
        }
      } catch (e) {
        console.error('Failed to fetch dashboard data:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRepo])

  // 印刷モードへ入ったら、recharts が display:none → block への切替後に
  // 再計測・再描画するのを 1 秒ほど待ってから window.print() を呼ぶ。
  // データは各タブがマウント時に取得済みで state に保持されているので再取得しない。
  useEffect(() => {
    if (!printing) return undefined
    const timer = setTimeout(() => window.print(), 1000)
    const onAfter = () => setPrinting(false)
    window.addEventListener('afterprint', onAfter)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('afterprint', onAfter)
    }
  }, [printing])

  const handlePrint = () => {
    if (!teamMetrics) return
    setPrinting(true)
  }

  const repoName = activeRepo ? repoKey(activeRepo) : `全リポジトリ合計 (${repos.length})`

  const renderTabsNav = (activeKey: TabKey) => (
    <Box sx={{ borderBottom: 1, borderColor: '#e0e0e0', mb: 1 }}>
      <Tabs
        value={activeKey}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 56,
          '& .MuiTab-root': {
            minHeight: 56,
            textTransform: 'none',
            alignItems: 'flex-start',
            py: 1,
            px: 2.5,
          },
        }}
      >
        {TABS.map((t) => (
          <Tab
            key={t.key}
            value={t.key}
            label={
              <Box sx={{ textAlign: 'left' }}>
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <Typography component="span" sx={{ fontWeight: 700, fontSize: 15 }}>
                    {t.label}
                  </Typography>
                  {!t.ready && (
                    <Box
                      component="span"
                      sx={{
                        fontSize: 10,
                        px: 0.75,
                        py: 0.1,
                        borderRadius: 0.5,
                        bgcolor: '#f3f4f6',
                        color: '#9ca3af',
                        fontWeight: 600,
                      }}
                    >
                      準備中
                    </Box>
                  )}
                </Stack>
                <Typography
                  component="span"
                  sx={{
                    display: 'block',
                    fontSize: 11,
                    color: '#9ca3af',
                    fontWeight: 400,
                    mt: 0.25,
                  }}
                >
                  {t.question}
                </Typography>
              </Box>
            }
          />
        ))}
      </Tabs>
    </Box>
  )

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            eXtremeCI Dashboard
          </Typography>
          <Typography variant="subtitle2" sx={{ color: '#6b7280' }}>
            {repoName} · 現スプリント {currentSprint.label}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center" className="no-print">
          <Button variant="outlined" size="small" onClick={handlePrint} disabled={loading || !teamMetrics || printing}>
            {printing ? '印刷準備中...' : '全タブをPDF印刷'}
          </Button>
          <SprintSelector />
          <RepoSwitcher />
        </Stack>
      </Stack>

      {!printing && renderTabsNav(activeTab)}
      <Box sx={{ mb: 3 }} />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* 全タブを常にマウントし、非アクティブタブは display:none で隠す。
              これで各タブのデータは画面表示時に一度取得され、state に保持された
              まま印刷ボタンから再利用できる。 */}
          <Box sx={{ display: printing || activeTab === 'flow' ? 'block' : 'none' }}>
            <FlowTab
              readTimes={readTimes}
              prSizes={prSizes}
              reviewTimes={reviewTimes}
              openPrs={openPrs}
              printAll={printing}
              tabsNav={printing ? renderTabsNav('flow') : undefined}
            />
          </Box>
          <Box
            sx={{ display: printing || activeTab === 'quality' ? 'block' : 'none' }}
            className={printing ? 'print-page-break' : undefined}
          >
            <QualityTab printAll={printing} tabsNav={printing ? renderTabsNav('quality') : undefined} />
          </Box>
          <Box
            sx={{ display: printing || activeTab === 'team' ? 'block' : 'none' }}
            className={printing ? 'print-page-break' : undefined}
          >
            {teamMetrics ? (
              <TeamTab
                contributors={contributors}
                reviewNetwork={reviewNetwork}
                teamMetricsAllTime={teamMetrics}
                closedPrs={closedPrs}
                tabsNav={printing ? renderTabsNav('team') : undefined}
              />
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress />
              </Box>
            )}
          </Box>
          <Box
            sx={{ display: printing || activeTab === 'dora' ? 'block' : 'none' }}
            className={printing ? 'print-page-break' : undefined}
          >
            <DoraTab
              readTimes={readTimes}
              closedPrs={closedPrs}
              tabsNav={printing ? renderTabsNav('dora') : undefined}
            />
          </Box>
        </>
      )}
    </Container>
  )
}
