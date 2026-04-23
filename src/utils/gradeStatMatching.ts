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
    .replace(/[()（）［］\[\]{}｛｝「」『』【】]/g, '')
);

export const normalizeSubjectCode = (value: string | undefined) => (
  normalizeMatchValue(value).replace(/[^a-z0-9]/g, '')
);

export const buildCodeCandidates = (...values: Array<string | undefined>) => (
  Array.from(
    new Set(
      values
        .map(normalizeSubjectCode)
        .filter(Boolean)
    )
  )
);

export const buildNameCandidates = (value: string | undefined) => {
  const source = (value || '').normalize('NFKC');
  const fragments = source
    .split(/[／/]/)
    .flatMap(part => part.split(/[()（）［］\[\]{}｛｝「」『』【】]/))
    .map(part => normalizeMatchValue(part))
    .filter(Boolean);

  const full = normalizeMatchValue(source);
  return Array.from(new Set([full, ...fragments])).filter(candidate => candidate.length >= 2);
};

export const subjectNameMatches = (left: string | undefined, right: string | undefined) => {
  const leftCandidates = buildNameCandidates(left);
  const rightCandidates = buildNameCandidates(right);

  return leftCandidates.some(leftCandidate =>
    rightCandidates.some(rightCandidate =>
      leftCandidate === rightCandidate ||
      leftCandidate.includes(rightCandidate) ||
      rightCandidate.includes(leftCandidate)
    )
  );
};

export const getGradeStatMatchScore = (
  target: GradeStatMatchTarget,
  stat: ClassGradeStat,
  options: GradeStatMatchOptions = {}
) => {
  const { allowLooseNameMatch = true } = options;
  const targetCodeCandidates = buildCodeCandidates(
    target.registration_code,
    target.subject_code
  );
  const statCodeCandidates = buildCodeCandidates(
    stat.registration_code,
    stat.subject_code
  );
  const targetNameCandidates = buildNameCandidates(target.subject_name);
  const statNameCandidates = buildNameCandidates(stat.subject_name);
  const normalizedTargetInstructor = normalizeMatchValue(target.instructor);
  const normalizedStatInstructor = normalizeMatchValue(stat.instructor);
  const targetSemesterToken = getSemesterToken(target.semester);
  const statSemesterToken = getSemesterToken(stat.semester);

  let score = 0;

  targetCodeCandidates.forEach((targetCode) => {
    statCodeCandidates.forEach((statCode) => {
      if (statCode === targetCode) {
        score = Math.max(score, 100);
      } else if (statCode.includes(targetCode) || targetCode.includes(statCode)) {
        score = Math.max(score, 70);
      }
    });
  });

  targetNameCandidates.forEach((targetName) => {
    statNameCandidates.forEach((statName) => {
      if (targetName === statName) {
        score = Math.max(score, 50);
      } else if (
        allowLooseNameMatch &&
        (targetName.includes(statName) || statName.includes(targetName))
      ) {
        score = Math.max(score, 25);
      }
    });
  });

  if (targetSemesterToken && statSemesterToken && targetSemesterToken === statSemesterToken && score > 0) {
    score += 10;
  }

  if (target.academic_year && stat.year === target.academic_year && score > 0) {
    score += 20;
  }

  if (
    normalizedTargetInstructor &&
    normalizedStatInstructor &&
    score > 0
  ) {
    if (normalizedTargetInstructor === normalizedStatInstructor) {
      score += 30;
    } else if (
      normalizedTargetInstructor.includes(normalizedStatInstructor) ||
      normalizedStatInstructor.includes(normalizedTargetInstructor)
    ) {
      score += 15;
    }
  }

  return score;
};
