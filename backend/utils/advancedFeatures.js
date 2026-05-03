const STOP_WORDS = new Set([
  'what', 'which', 'when', 'where', 'why', 'how', 'the', 'and', 'for', 'with',
  'from', 'that', 'this', 'have', 'has', 'had', 'into', 'your', 'their', 'about',
  'true', 'false', 'does', 'each', 'one', 'two', 'three', 'briefly', 'explain'
]);

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function calculateIntegrityFingerprint({ tabSwitches = 0, timeTaken = 0, durationMinutes = 60, answered = 0, totalQuestions = 1 }) {
  const durationSeconds = Math.max(1, safeNumber(durationMinutes) * 60);
  const completionRatio = Math.min(1, Math.max(0, safeNumber(timeTaken) / durationSeconds));
  const answerCoverage = Math.min(1, Math.max(0, safeNumber(answered) / Math.max(1, safeNumber(totalQuestions))));

  let score = 100;
  const flags = [];

  if (tabSwitches >= 10) {
    score -= 30;
    flags.push('HIGH_TAB_SWITCHING');
  } else if (tabSwitches >= 5) {
    score -= 15;
    flags.push('MODERATE_TAB_SWITCHING');
  }

  if (completionRatio < 0.15 && answerCoverage > 0.8) {
    score -= 20;
    flags.push('UNUSUALLY_FAST_COMPLETION');
  }

  if (answerCoverage < 0.4) {
    score -= 10;
    flags.push('LOW_ANSWER_COVERAGE');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  let riskLevel = 'low';
  if (score < 45) riskLevel = 'high';
  else if (score < 70) riskLevel = 'medium';

  return { score, riskLevel, flags, completionRatio, answerCoverage };
}

function tokenizeConcepts(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
}

function extractConcepts(questionText, limit = 3) {
  const words = tokenizeConcepts(questionText);
  const counts = {};
  for (const w of words) counts[w] = (counts[w] || 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

function jaccardSimilarity(a, b) {
  const setA = new Set(tokenizeConcepts(a));
  const setB = new Set(tokenizeConcepts(b));
  if (setA.size === 0 && setB.size === 0) return 1;
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size || 1;
  return intersection / union;
}

function buildLearningPath(weakConcepts = []) {
  return weakConcepts.map((concept, idx) => ({
    day: idx + 1,
    concept,
    action: `Review ${concept} fundamentals and solve 10 targeted practice problems.`,
    evidence: `Complete mini-quiz for ${concept} with at least 80% score.`
  }));
}

function calculateQuestionQuality({ attempts = 0, correct = 0, avgMarks = 0, maxMarks = 1 }) {
  const a = Math.max(0, safeNumber(attempts));
  const c = Math.max(0, safeNumber(correct));
  const difficulty = a > 0 ? 1 - c / a : 1;
  const effectiveness = Math.min(1, Math.max(0, safeNumber(avgMarks) / Math.max(1, safeNumber(maxMarks))));
  const qualityScore = Math.round((0.6 * (1 - Math.abs(difficulty - 0.5)) + 0.4 * effectiveness) * 100);

  let status = 'good';
  if (qualityScore < 45) status = 'needs_review';
  else if (qualityScore < 65) status = 'watchlist';

  return { difficulty: Number(difficulty.toFixed(2)), effectiveness: Number(effectiveness.toFixed(2)), qualityScore, status };
}

function equateScore(rawPercentage, cohortMean, cohortStd, referenceMean, referenceStd) {
  const raw = safeNumber(rawPercentage);
  const std = Math.max(1, safeNumber(cohortStd, 1));
  const z = (raw - safeNumber(cohortMean)) / std;
  const adjusted = safeNumber(referenceMean) + z * Math.max(1, safeNumber(referenceStd, 1));
  return Math.max(0, Math.min(100, Number(adjusted.toFixed(2))));
}

module.exports = {
  calculateIntegrityFingerprint,
  extractConcepts,
  jaccardSimilarity,
  buildLearningPath,
  calculateQuestionQuality,
  equateScore,
  safeNumber
};
