import React from 'react'
import Box from '@mui/material/Box'
import { Typography, Button, Alert } from '@mui/material'
import { Link } from 'react-router-dom'
import { QualitySustainabilityDashboard } from '../../components/quality_sustainability/quality_sustainability'

export const QualitySustainabilityPage = () => {
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
            品質と持続性
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
        <strong>分析内容:</strong> テストコードの有無・増え方、CIの失敗頻度、リファクタリング系PRの存在
        <br />
        <strong>読み取れること:</strong> 短期成果重視か長期保守重視か、技術的負債への向き合い方
      </Alert>

      {/* メインコンテンツ */}
      <QualitySustainabilityDashboard />
    </Box>
  )
}
