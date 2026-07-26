import QRCode from "qrcode";

// qrcode's BitMatrix carries a parallel reservedBit array marking function
// modules (finders, timing, alignment, format/version). @types/qrcode
// doesn't declare it, so we name the shape ourselves.
interface BitMatrix {
  size: number;
  data: Uint8Array;
  reservedBit: Uint8Array;
}

export interface QrMatrix {
  /** modules per side, quiet zone not included */
  size: number;
  version: number;
  isDark(row: number, col: number): boolean;
  isFunction(row: number, col: number): boolean;
}

// Past this density the stars shrink to where real-world scanning starts
// to suffer; tripping it is the signal to revisit a short-URL scheme
// rather than quietly shipping a worse code.
export const MAX_VERSION = 10;

export const qrMatrix = (text: string): QrMatrix => {
  const code = QRCode.create(text, { errorCorrectionLevel: "H" });
  if (code.version > MAX_VERSION) {
    throw new Error(
      `qr: "${text}" needs version ${code.version} at EC-H (max ${MAX_VERSION}) — time to decide on short URLs`,
    );
  }
  const { size, data, reservedBit } = code.modules as unknown as BitMatrix;
  return {
    size,
    version: code.version,
    isDark: (row, col) => !!data[row * size + col],
    isFunction: (row, col) => !!reservedBit[row * size + col],
  };
};
