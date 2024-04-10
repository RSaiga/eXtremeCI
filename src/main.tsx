import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/pages/app'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  // TODO: 2回呼ばれるので
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
)
