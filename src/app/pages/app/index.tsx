import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material'
import React from 'react'
import { AppRoutes } from '../../routes/app'
import { appTheme } from '../../components/ui/theme/mui-theme'
import { RepoProvider } from '../../shared/repos/context'
import { SprintProvider } from '../../shared/sprint/context'

export function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <RepoProvider>
        <SprintProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SprintProvider>
      </RepoProvider>
    </ThemeProvider>
  )
}
