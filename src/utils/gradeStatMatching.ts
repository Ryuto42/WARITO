import type { ClassGradeStat } from '../types';

type GradeStatMatchTarget = {
  academic_year?: number;
  registration_code?: string;
  subject_code?: string;
  subject_name?: string;
  instructor?: string;
  semester?: string;
};

type GradeStatMatchOptions = {
  allowLooseNameMatch?: boolean;
};

// 3=科目コード一致, 2=科目名一致, 1=あいまい一致
type Tier = 0 | 1 | 2 | 3;
type Match = { stat: ClassGradeStat; tier: Tier; score: number };

const getSemesterToken = (value: string | undefined) => {
  const normalized = normalizeMatchValue(value);
  if (normalized.includes('春')) return 'spring';
  if (normalized.includes('秋')) return 'autumn';
  return normalized || '';
};

export const normalizeMatchValue = (value: string | undefined) => (
  (value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[‐‑‒–—―ーｰ-]/g, '-')
);

// 【Aブロック】/＜理工共通＞/末尾の * などの開講区分表記を除去
const stripSectionMarkers = (value: string) => (
  value
    .replace(/【[^】]*】/g, '')
    .replace(/＜[^＞]*＞/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[「」『』]/g, '')
    .replace(/\*+$/g, '')
);

const normalizeSubjectCode = (value: string | undefined) => (
  normalizeMatchValue(value).replace(/[^a-z0-9]/g, '')
);

const buildCodeCandidates = (...values: Array<string | undefined>) => (
  Array.from(new Set(values.map(normalizeSubjectCode).filter(Boolean)))
);

// base=区分マーカーのみ除去 / core=副題の括弧も除去した弱いキー
const buildNameKeys = (value: string | undefined) => {
  const source = (value || '').normalize('NFKC');
  const base = normalizeMatchValue(stripSectionMarkers(source));
  const core = base.replace(/[(（][^)）]*[)）]/g, '').replace(/[()（）]/g, '');
  return { base, core: core.length >= 3 ? core : '' };
};

const getInstructorBonus = (target: GradeStatMatchTarget, stat: ClassGradeStat) => {
  const t = normalizeMatchValue(target.instructor);
  const s = normalizeMatchValue(stat.instructor);
  if (!t || !s) return 0;
  if (t === s) return 30;
  if (t.includes(s) || s.includes(t)) return 15;
  return 0;
};

const getGradeStatMatch = (
  target: GradeStatMatchTarget,
  stat: ClassGradeStat,
  options: GradeStatMatchOptions = {}
): Match => {
  const { allowLooseNameMatch = true } = options;

  const targetCodes = buildCodeCandidates(target.registration_code, target.subject_code);
  const statCodes = buildCodeCandidates(stat.subject_code);
  const targetName = buildNameKeys(target.subject_name);
  const statName = buildNameKeys(stat.subject_name);
  const instructorBonus = getInstructorBonus(target, stat);

  let tier: Tier = 0;
  let score = 0;

  // 科目コードは完全一致のみ採用（前方一致だと別科目を誤結合しうる）
  if (targetCodes.some((code) => statCodes.includes(code))) {
    tier = 3;
    score = 100;
  } else if (targetName.base && targetName.base === statName.base) {
    tier = 2;
    score = 60;
  } else if (
    allowLooseNameMatch &&
    instructorBonus > 0 &&
    targetName.core &&
    (targetName.core === statName.core ||
      targetName.base.includes(statName.base) ||
      statName.base.includes(targetName.base))
  ) {
    // あいまい一致は担当教員一致時のみ（別科目混入防止）
    tier = 1;
    score = 25;
  }

  if (tier === 0) return { stat, tier, score: 0 };

  const targetSemester = getSemesterToken(target.semester);
  const statSemester = getSemesterToken(stat.semester);
  if (targetSemester && statSemester && targetSemester === statSemester) score += 10;
  if (target.academic_year && stat.year === target.academic_year) score += 20;
  score += instructorBonus;

  return { stat, tier, score };
};

// 最上位 tier だけ残す（コード一致があれば名前一致は捨てる）
export const selectGradeStatMatches = (
  target: GradeStatMatchTarget,
  stats: ClassGradeStat[],
  options: GradeStatMatchOptions = {}
): ClassGradeStat[] => {
  const matches = stats
    .map((stat) => getGradeStatMatch(target, stat, options))
    .filter((m) => m.tier > 0);

  if (matches.length === 0) return [];

  const bestTier = Math.max(...matches.map((m) => m.tier));
  let candidates = matches.filter((m) => m.tier === bestTier);

  // 同名別ブロック対策: 担当教員が一致するものだけ残す
  const withInstructor = candidates.filter((m) => getInstructorBonus(target, m.stat) > 0);
  if (withInstructor.length > 0) candidates = withInstructor;

  return candidates
    .sort((a, b) => (
      b.score - a.score ||
      b.stat.year - a.stat.year ||
      (a.stat.semester || '').localeCompare(b.stat.semester || '', 'ja')
    ))
    .filter((m, index, list) => list.findIndex((other) => (
      other.stat.year === m.stat.year &&
      other.stat.semester === m.stat.semester &&
      other.stat.subject_code === m.stat.subject_code
    )) === index)
    .map((m) => m.stat);
};
