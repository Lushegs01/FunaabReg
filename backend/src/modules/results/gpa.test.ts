import { describe, expect, it } from "vitest";
import { calculateGpa, gradeForScore } from "./gpa.js";

describe("GPA engine", () => {
  it("maps scores to a five-point Nigerian grading scale", () => {
    expect(gradeForScore(70)).toMatchObject({ grade: "A", point: 5 });
    expect(gradeForScore(44)).toMatchObject({ grade: "E", point: 1 });
    expect(gradeForScore(39)).toMatchObject({ grade: "F", point: 0 });
  });

  it("calculates weighted GPA by credit unit", () => {
    const gpa = calculateGpa([
      { creditUnits: 3, totalScore: 72 },
      { creditUnits: 2, totalScore: 62 },
      { creditUnits: 1, totalScore: 48 }
    ]);

    expect(gpa).toBe(4.17);
  });
});
