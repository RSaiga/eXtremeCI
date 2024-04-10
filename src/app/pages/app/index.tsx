import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from '../../routes/app'
import {createTheme, ThemeProvider} from "@mui/material";
import React from "react";

export function App() {
  const darkTheme = createTheme({
    palette: {
      mode: 'light',
    },
  });

  return (
    <ThemeProvider theme={darkTheme}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  )
}
