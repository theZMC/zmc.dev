import { describe, expect, it } from "vitest";
import {
  alignmentCenters,
  finderOrigins,
  inAlignment,
  inFinder,
} from "./geometry";

describe("finderOrigins", () => {
  it("puts the three finders in their corners", () => {
    expect(finderOrigins(25)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 18 },
      { row: 18, col: 0 },
    ]);
  });
});

describe("alignmentCenters", () => {
  it("version 1 has none", () => {
    expect(alignmentCenters(1)).toEqual([]);
  });

  it("version 2 has the single ISO center", () => {
    expect(alignmentCenters(2)).toEqual([{ row: 18, col: 18 }]);
  });

  it("version 7 drops the three finder-overlapping centers", () => {
    const centers = alignmentCenters(7);
    // 3×3 cross product of [6, 22, 38] minus the three corners on finders
    expect(centers).toHaveLength(6);
    expect(centers).toContainEqual({ row: 22, col: 22 });
    expect(centers).toContainEqual({ row: 6, col: 22 });
    expect(centers).not.toContainEqual({ row: 6, col: 6 });
    expect(centers).not.toContainEqual({ row: 6, col: 38 });
    expect(centers).not.toContainEqual({ row: 38, col: 6 });
  });
});

describe("zone tests", () => {
  it("inFinder covers exactly the three 7×7 corners", () => {
    expect(inFinder(0, 0, 25)).toBe(true);
    expect(inFinder(6, 6, 25)).toBe(true);
    expect(inFinder(7, 7, 25)).toBe(false);
    expect(inFinder(0, 18, 25)).toBe(true);
    expect(inFinder(18, 0, 25)).toBe(true);
    expect(inFinder(18, 18, 25)).toBe(false);
  });

  it("inAlignment covers the 5×5 zone around each center", () => {
    expect(inAlignment(18, 18, 2)).toBe(true);
    expect(inAlignment(16, 16, 2)).toBe(true);
    expect(inAlignment(15, 16, 2)).toBe(false);
    expect(inAlignment(20, 20, 2)).toBe(true);
    expect(inAlignment(21, 20, 2)).toBe(false);
  });
});
