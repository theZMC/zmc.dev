declare module "virtual:zmc-qr" {
  /** the canonical talk URL, null outside a talk deck */
  export const url: string | null;
  /** the var()-skinned inline star-QR markup, null outside a talk deck */
  export const svg: string | null;
}
