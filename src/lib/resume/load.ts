import { getEntry } from "astro:content";

/**
 * The site's single resume entry. Lives apart from schema.ts, which must
 * stay astro:content-free for vitest and the browser PDF chunk.
 */
export async function loadResume() {
  const entry = await getEntry("resume", "resume");
  if (!entry) throw new Error("resume collection entry missing");
  return entry.data;
}
