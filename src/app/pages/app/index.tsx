import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from '../../routes/app'
import { ThemeProvider } from "@mui/material";
import React from "react";
import { appTheme } from '../../components/ui/theme/mui-theme'

export function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  )
}
