import React, { useEffect, useState } from 'react'
import { Box, CircularProgress, Container, Paper, Stack, Tab, Tabs, Typography } from '@mui/material'
import { RepoSwitcher } from '../../components/repo_switcher'
import { SprintSelector } from '../../components/sprint_selector'
import { FlowTab } from '../../components/flow'
import { useSprint } from '../../shared/sprint/context'
import { DashboardService } from '../../domain/services/dashboard'
import { ReadTimes } from '../../domain/models/read_time/read.times'
import { PrSizes } from '../../domain/models/pr_size/pr_sizes'
import { ReviewTimes } from '../../domain/models/review_time/review_times'
import { OpenPrs } from '../../domain/models/open_pr/open_prs'
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
  { key: 'quality', label: '品質', question: '良いやり方で作れているか？', ready: false },
  { key: 'team', label: 'チーム', question: '健全に回っているか？', ready: false },
  { key: 'dora', label: 'DORA', question: 'Four Keys で見るとどうか？', ready: false },
]

const ComingSoon: React.FC<{ label: string }> = ({ label }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 6,
      textAlign: 'center',
      borderColor: '#e0e0e0',
      borderRadius: 2,
      borderStyle: 'dashed',
    }}
  >
    <Typography variant="h6" sx={{ color: '#6b7280', mb: 1 }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
      このセクションは準備中です
    </Typography>
  </Paper>
)

export const DashboardPage: React.FC = () => {
  const { activeRepo, selectedRepos, repos } = useActiveRepo()
  const { current: currentSprint } = useSprint()
  const [loading, setLoading] = useState(false)
  const [readTimes, setReadTimes] = useState<ReadTimes>(new ReadTimes([]))
  const [prSizes, setPrSizes] = useState<PrSizes>(new PrSizes([]))
  const [reviewTimes, setReviewTimes] = useState<ReviewTimes>(new ReviewTimes([]))
  const [openPrs, setOpenPrs] = useState<OpenPrs>(new OpenPrs([]))
  const [activeTab, setActiveTab] = useState<TabKey>('flow')

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

  const repoName = activeRepo ? repoKey(activeRepo) : `全リポジトリ合計 (${repos.length})`

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      )
    }
    switch (activeTab) {
      case 'flow':
        return <FlowTab readTimes={readTimes} prSizes={prSizes} reviewTimes={reviewTimes} openPrs={openPrs} />
      default: {
        const tab = TABS.find((t) => t.key === activeTab)
        return <ComingSoon label={tab?.label ?? ''} />
      }
    }
  }

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
        <Stack direction="row" spacing={1.5} alignItems="center">
          <SprintSelector />
          <RepoSwitcher />
        </Stack>
      </Stack>

      <Box sx={{ borderBottom: 1, borderColor: '#e0e0e0', mb: 1 }}>
        <Tabs
          value={activeTab}
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
      <Box sx={{ mb: 3 }} />

      {renderContent()}
    </Container>
  )
}
