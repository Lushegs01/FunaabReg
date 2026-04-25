export interface GradeBand {
  minScore: number;
  grade: string;
  point: number;
}

export interface CourseResult {
  creditUnits: number;
  totalScore: number;
}

export const defaultFivePointScale: GradeBand[] = [
  { minScore: 70, grade: "A", point: 5 },
  { minScore: 60, grade: "B", point: 4 },
  { minScore: 50, grade: "C", point: 3 },
  { minScore: 45, grade: "D", point: 2 },
  { minScore: 40, grade: "E", point: 1 },
  { minScore: 0, grade: "F", point: 0 }
];

export function gradeForScore(score: number, scale = defaultFivePointScale): GradeBand {
  if (score < 0 || score > 100) {
    throw new RangeError("Score must be between 0 and 100.");
  }

  const band = scale.find((item) => score >= item.minScore);
  if (!band) {
    throw new Error("Invalid grading scale.");
  }

  return band;
}

export function calculateGpa(results: CourseResult[], scale = defaultFivePointScale): number {
  const totals = results.reduce(
    (acc, result) => {
      if (result.creditUnits <= 0) {
        throw new RangeError("Credit units must be positive.");
      }

      const grade = gradeForScore(result.totalScore, scale);
      return {
        qualityPoints: acc.qualityPoints + grade.point * result.creditUnits,
        creditUnits: acc.creditUnits + result.creditUnits
      };
    },
    { qualityPoints: 0, creditUnits: 0 }
  );

  if (totals.creditUnits === 0) {
    return 0;
  }

  return Number((totals.qualityPoints / totals.creditUnits).toFixed(2));
}
