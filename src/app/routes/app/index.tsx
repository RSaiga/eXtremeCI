import { Route, Routes } from 'react-router-dom'
import { route } from '../routes'
import { DashboardPage } from '../../pages/dashboard'
import { CommitQualityPage } from '../../pages/commit_quality'
import { QualitySustainabilityPage } from '../../pages/quality_sustainability'
import { FlowMetricsPage } from '../../pages/flow_metrics'

export function AppRoutes() {
  return (
    <Routes>
      <Route path={route.mainPage} element={<DashboardPage />} />
      <Route path={route.commitQuality} element={<CommitQualityPage />} />
      <Route path={route.qualitySustainability} element={<QualitySustainabilityPage />} />
      <Route path={route.flowMetrics} element={<FlowMetricsPage />} />
    </Routes>
  )
}
