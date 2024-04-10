import { Route, Routes } from 'react-router-dom'
import { route } from '../routes'
import { DashboardPage } from '../../pages/dashboard'

export function AppRoutes() {
  return (
    <Routes>
      <Route path={route.mainPage} element={<DashboardPage />} />
    </Routes>
  )
}
