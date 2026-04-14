import React from 'react'
import Box from '@mui/material/Box'
import { Typography, Button, Alert } from '@mui/material'
import { Link } from 'react-router-dom'
import { FlowMetricsDashboard } from '../../components/flow_metrics/flow_metrics'

export const FlowMetricsPage = () => {
  const handlePrint = () => {
    window.print()
  }

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const repoName = import.meta.env.VITE_GITHUB_REPO || 'Unknown Repository'

  return (
    <Box component="section" sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1">
            DORA フロー指標
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {repoName} - {today}（過去90日間）
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button component={Link} to="/" variant="outlined" className="no-print">
            ダッシュボードに戻る
          </Button>
          <Button variant="contained" onClick={handlePrint} className="no-print">
            PDF出力 / 印刷
          </Button>
        </Box>
      </Box>

      {/* 説明 */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>DORA フロー指標:</strong> PRのライフサイクルを分析し、フィードバックループの健全性を可視化します。
        <br />
        <strong>主な指標:</strong> サイクルタイム（PR作成〜マージ）、レビュー待ち時間、修正往復回数、PRサイズ
        <br />
        <strong>目的:</strong>{' '}
        ボトルネックが「人」「設計」「個人作業」「チーム作業」のどこにあるかを特定し、改善につなげる。
      </Alert>

      {/* メインコンテンツ */}
      <FlowMetricsDashboard />
    </Box>
  )
}
