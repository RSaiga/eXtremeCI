import { octokit } from '../../../shared/octokit';
import { prDataCache, PrDetailData } from '../../../infra/github/pr_data';
import {
  QualitySustainabilityMetrics,
  TestCodeMetrics,
  CIMetrics,
  RefactoringMetrics,
  PrWithQualityInfo,
  WeeklyTestData,
  WeeklyCIData,
  WeeklyRefactoringData,
  TEST_FILE_PATTERNS,
  detectPrType,
  calculateSustainabilityScore,
  getSustainabilityGrade,
  determineOrientation,
} from '../../models/quality_sustainability/quality_sustainability';

// ファイル一覧のキャッシュ
const prFilesCache = new Map<number, string[]>();

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(weekStart: Date): string {
  const month = weekStart.getMonth() + 1;
  const day = weekStart.getDate();
  return `${month}/${day}週`;
}

function isTestFile(filename: string): boolean {
  return TEST_FILE_PATTERNS.some(pattern => pattern.test(filename));
}

async function fetchPrFiles(prNumber: number): Promise<string[]> {
  // キャッシュチェック
  if (prFilesCache.has(prNumber)) {
    return prFilesCache.get(prNumber)!;
  }

  try {
    const owner = import.meta.env.VITE_GITHUB_OWNER as string;
    const repo = import.meta.env.VITE_GITHUB_REPO as string;

    const response = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    const files = response.data.map((f: { filename: string }) => f.filename);
    prFilesCache.set(prNumber, files);
    return files;
  } catch (e) {
    console.error(`Failed to fetch files for PR #${prNumber}:`, e);
    return [];
  }
}

export async function analyzeQualitySustainability(): Promise<QualitySustainabilityMetrics> {
  // GraphQLで基本データを取得
  const closedPrs = await prDataCache.getClosedPrs();
  const mergedPrs = closedPrs.filter(pr => pr.merged_at);

  // PRの詳細情報を収集（ファイル一覧はREST APIで並列取得）
  const prsWithQualityInfo = await collectPrQualityInfo(mergedPrs.slice(0, 30));

  // テストメトリクス
  const testMetrics = analyzeTestMetrics(prsWithQualityInfo, mergedPrs);

  // CIメトリクス（GraphQLで取得済み）
  const ciMetrics = analyzeCIMetrics(mergedPrs);

  // リファクタリングメトリクス
  const refactoringMetrics = analyzeRefactoringMetrics(mergedPrs);

  // 総合評価
  const sustainabilityScore = calculateSustainabilityScore(
    testMetrics.testInclusionRate,
    ciMetrics.successRate,
    refactoringMetrics.refactoringRate
  );

  const sustainabilityGrade = getSustainabilityGrade(sustainabilityScore);

  const { orientation, label: orientationLabel } = determineOrientation(
    testMetrics.testInclusionRate,
    refactoringMetrics.refactoringRate
  );

  return {
    testMetrics,
    ciMetrics,
    refactoringMetrics,
    sustainabilityScore,
    sustainabilityGrade,
    orientation,
    orientationLabel,
  };
}

async function collectPrQualityInfo(prs: PrDetailData[]): Promise<PrWithQualityInfo[]> {
  // ファイル一覧をREST APIで並列取得
  const filesPromises = prs.map(pr => fetchPrFiles(pr.number));
  const allFiles = await Promise.all(filesPromises);

  return prs.map((pr, index) => {
    const files = allFiles[index];
    const hasTests = files.some(f => isTestFile(f));
    const prType = detectPrType(pr.title, pr.labels);

    return {
      number: pr.number,
      title: pr.title,
      author: pr.user?.login || 'unknown',
      createdAt: new Date(pr.created_at),
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      hasTests,
      prType,
      ciStatus: pr.ciStatus,
    };
  });
}

function analyzeTestMetrics(
  prsWithInfo: PrWithQualityInfo[],
  allMergedPrs: PrDetailData[]
): TestCodeMetrics {
  const prsWithTests = prsWithInfo.filter(pr => pr.hasTests).length;
  const prsWithoutTests = prsWithInfo.length - prsWithTests;
  const testInclusionRate = prsWithInfo.length > 0
    ? prsWithTests / prsWithInfo.length
    : 0;

  // 著者別のテスト状況
  const authorTestMap = new Map<string, { with: number; without: number }>();
  for (const pr of prsWithInfo) {
    const current = authorTestMap.get(pr.author) || { with: 0, without: 0 };
    if (pr.hasTests) {
      current.with++;
    } else {
      current.without++;
    }
    authorTestMap.set(pr.author, current);
  }

  let authorsWithTests = 0;
  let authorsWithoutTests = 0;
  for (const [, stats] of authorTestMap) {
    if (stats.with > 0) {
      authorsWithTests++;
    } else {
      authorsWithoutTests++;
    }
  }

  const authorTestRate = authorTestMap.size > 0
    ? authorsWithTests / authorTestMap.size
    : 0;

  // 週次トレンド（PRタイトルからテスト関連キーワードで推定）
  const weeklyTrend = calculateWeeklyTestTrend(allMergedPrs);

  // テスト文化の評価
  let testCulture: 'strong' | 'moderate' | 'weak' | 'none';
  let testCultureLabel: string;

  if (testInclusionRate >= 0.7) {
    testCulture = 'strong';
    testCultureLabel = '強い（テスト必須の文化）';
  } else if (testInclusionRate >= 0.4) {
    testCulture = 'moderate';
    testCultureLabel = '中程度（テストを書く意識あり）';
  } else if (testInclusionRate > 0) {
    testCulture = 'weak';
    testCultureLabel = '弱い（テストが少ない）';
  } else {
    testCulture = 'none';
    testCultureLabel = 'なし（テストがほぼない）';
  }

  return {
    prsWithTests,
    prsWithoutTests,
    testInclusionRate,
    weeklyTestTrend: weeklyTrend,
    authorsWithTests,
    authorsWithoutTests,
    authorTestRate,
    testCulture,
    testCultureLabel,
  };
}

function calculateWeeklyTestTrend(prs: PrDetailData[]): WeeklyTestData[] {
  const weekMap = new Map<string, { total: number; withTests: number }>();

  for (const pr of prs) {
    if (!pr.merged_at) continue;

    const weekStart = getWeekStart(new Date(pr.merged_at));
    const key = weekStart.toISOString();
    const current = weekMap.get(key) || { total: 0, withTests: 0 };

    current.total++;

    // タイトルからテスト関連キーワードを検出（簡易判定）
    const lowerTitle = pr.title.toLowerCase();
    if (lowerTitle.includes('test') || lowerTitle.includes('テスト') ||
        lowerTitle.includes('spec') || lowerTitle.includes('coverage')) {
      current.withTests++;
    }

    weekMap.set(key, current);
  }

  const results: WeeklyTestData[] = [];
  for (const [weekKey, data] of weekMap) {
    results.push({
      weekStart: new Date(weekKey),
      weekLabel: formatWeekLabel(new Date(weekKey)),
      totalPrs: data.total,
      prsWithTests: data.withTests,
      testRate: data.total > 0 ? data.withTests / data.total : 0,
    });
  }

  return results.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
}

function analyzeCIMetrics(prs: PrDetailData[]): CIMetrics {
  // GraphQLで取得済みのciStatusを使用（API呼び出し不要）
  let successfulChecks = 0;
  let failedChecks = 0;
  let pendingChecks = 0;
  let totalChecks = 0;

  const weeklyData = new Map<string, { total: number; success: number }>();

  for (const pr of prs) {
    if (pr.ciStatus === 'unknown') continue;

    totalChecks++;
    if (pr.ciStatus === 'success') {
      successfulChecks++;
    } else if (pr.ciStatus === 'failure') {
      failedChecks++;
    } else if (pr.ciStatus === 'pending') {
      pendingChecks++;
    }

    // 週次データ
    if (pr.merged_at) {
      const weekStart = getWeekStart(new Date(pr.merged_at));
      const key = weekStart.toISOString();
      const current = weeklyData.get(key) || { total: 0, success: 0 };
      current.total++;
      if (pr.ciStatus === 'success') {
        current.success++;
      }
      weeklyData.set(key, current);
    }
  }

  const successRate = totalChecks > 0 ? successfulChecks / totalChecks : 0;

  // 週次トレンド
  const weeklyTrend: WeeklyCIData[] = [];
  for (const [weekKey, data] of weeklyData) {
    weeklyTrend.push({
      weekStart: new Date(weekKey),
      weekLabel: formatWeekLabel(new Date(weekKey)),
      totalChecks: data.total,
      successRate: data.total > 0 ? data.success / data.total : 0,
    });
  }
  weeklyTrend.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

  // CI健全性の評価
  let ciHealth: 'excellent' | 'good' | 'needs-improvement' | 'critical';
  let ciHealthLabel: string;

  if (successRate >= 0.9) {
    ciHealth = 'excellent';
    ciHealthLabel = '優秀（90%以上成功）';
  } else if (successRate >= 0.75) {
    ciHealth = 'good';
    ciHealthLabel = '良好（75%以上成功）';
  } else if (successRate >= 0.5) {
    ciHealth = 'needs-improvement';
    ciHealthLabel = '要改善（50-75%成功）';
  } else {
    ciHealth = 'critical';
    ciHealthLabel = '深刻（50%未満）';
  }

  return {
    totalChecks,
    successfulChecks,
    failedChecks,
    successRate,
    avgFixTime: null,
    weeklyTrend,
    ciHealth,
    ciHealthLabel,
  };
}

function analyzeRefactoringMetrics(prs: PrDetailData[]): RefactoringMetrics {
  let refactoringPrs = 0;
  let featurePrs = 0;
  let bugfixPrs = 0;
  let otherPrs = 0;

  const weeklyData = new Map<string, { total: number; refactoring: number }>();

  for (const pr of prs) {
    const prType = detectPrType(pr.title, pr.labels);

    switch (prType) {
      case 'refactoring':
        refactoringPrs++;
        break;
      case 'feature':
        featurePrs++;
        break;
      case 'bugfix':
        bugfixPrs++;
        break;
      default:
        otherPrs++;
    }

    // 週次データ
    if (pr.merged_at) {
      const weekStart = getWeekStart(new Date(pr.merged_at));
      const key = weekStart.toISOString();
      const current = weeklyData.get(key) || { total: 0, refactoring: 0 };
      current.total++;
      if (prType === 'refactoring') {
        current.refactoring++;
      }
      weeklyData.set(key, current);
    }
  }

  const totalPrs = prs.length;
  const refactoringRate = totalPrs > 0 ? refactoringPrs / totalPrs : 0;

  // 週次トレンド
  const weeklyTrend: WeeklyRefactoringData[] = [];
  for (const [weekKey, data] of weeklyData) {
    weeklyTrend.push({
      weekStart: new Date(weekKey),
      weekLabel: formatWeekLabel(new Date(weekKey)),
      totalPrs: data.total,
      refactoringPrs: data.refactoring,
      refactoringRate: data.total > 0 ? data.refactoring / data.total : 0,
    });
  }
  weeklyTrend.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

  // 技術的負債への姿勢
  let techDebtAttitude: 'proactive' | 'reactive' | 'neglecting';
  let techDebtAttitudeLabel: string;

  if (refactoringRate >= 0.15) {
    techDebtAttitude = 'proactive';
    techDebtAttitudeLabel = '積極的（定期的にリファクタリング）';
  } else if (refactoringRate >= 0.05) {
    techDebtAttitude = 'reactive';
    techDebtAttitudeLabel = '受動的（必要に応じてリファクタリング）';
  } else {
    techDebtAttitude = 'neglecting';
    techDebtAttitudeLabel = '放置気味（リファクタリングが少ない）';
  }

  return {
    refactoringPrs,
    featurePrs,
    bugfixPrs,
    otherPrs,
    totalPrs,
    refactoringRate,
    weeklyTrend,
    techDebtAttitude,
    techDebtAttitudeLabel,
  };
}