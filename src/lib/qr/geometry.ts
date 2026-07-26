// Function-pattern positions, computed from version/size alone (ISO/IEC
// 18004). The matrix's reservedBit flags cover the same ground; these
// exist because the renderer draws finders and alignment patterns as
// composed shapes, not module-by-module.

/** light modules of margin on every side, per spec minimum */
export const QUIET_ZONE = 4;

/** top-left corner of each 7×7 finder */
export const finderOrigins = (
  size: number,
): Array<{ row: number; col: number }> => [
  { row: 0, col: 0 },
  { row: 0, col: size - 7 },
  { row: size - 7, col: 0 },
];

// Alignment pattern center coordinates per version (ISO 18004 Annex E).
// Row 0 is version 1 (none). Centers land on the cross product, minus the
// three that would sit on finders.
const ALIGNMENT_COORDS: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
];

export const alignmentCenters = (
  version: number,
): Array<{ row: number; col: number }> => {
  const coords = ALIGNMENT_COORDS[version - 1];
  if (coords === undefined) throw new Error(`qr: no version ${version}`);
  const last = coords[coords.length - 1];
  return coords.flatMap((row) =>
    coords
      .filter(
        (col) =>
          !(row === 6 && col === 6) &&
          !(row === 6 && col === last) &&
          !(row === last && col === 6),
      )
      .map((col) => ({ row, col })),
  );
};

export const inFinder = (row: number, col: number, size: number): boolean =>
  finderOrigins(size).some(
    (o) => row >= o.row && row < o.row + 7 && col >= o.col && col < o.col + 7,
  );

/** inside any 5×5 alignment zone */
export const inAlignment = (
  row: number,
  col: number,
  version: number,
): boolean =>
  alignmentCenters(version).some(
    (c) => Math.abs(row - c.row) <= 2 && Math.abs(col - c.col) <= 2,
  );
