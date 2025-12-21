import React from "react";
import Box from "@mui/material/Box";
import { Typography, Button, Alert } from "@mui/material";
import { Link } from "react-router-dom";
import { CommitQualityDashboard } from "../../components/commit_quality/commit_quality";

export const CommitQualityPage = () => {
  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const repoName = import.meta.env.VITE_GITHUB_REPO || 'Unknown Repository';

  return (
    <Box component="section" sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1">
            コミット品質分析
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {repoName} - {today}（過去90日間）
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            component={Link}
            to="/"
            variant="outlined"
            className="no-print"
          >
            ダッシュボードに戻る
          </Button>
          <Button
            variant="contained"
            onClick={handlePrint}
            className="no-print"
          >
            PDF出力 / 印刷
          </Button>
        </Box>
      </Box>

      {/* 説明 */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>測定内容:</strong> 1コミットあたりの変更行数、サイズ分布、担当者別の働き方パターン。
        <br />
        <strong>注意:</strong> 巨大コミットが多いと「後出しでまとめてコミット」の傾向。レビューが困難になり、バグ見逃しリスクが高まります。
        <br />
        <strong>理想:</strong> 小さなコミット（XS+S）が70%以上。刻みながら設計・実装を進める働き方。
      </Alert>

      {/* メインコンテンツ */}
      <CommitQualityDashboard />
    </Box>
  );
};