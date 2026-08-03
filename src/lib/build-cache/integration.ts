import type { AstroIntegration } from "astro";
import { cacheState, sweep } from "./store";

/**
 * Sweeps the artifact store after a successful build and reports per-class
 * traffic. Registered last in astro.config.mjs so every other producer —
 * the talks integration marks its deck entries back at astro:build:start —
 * has finished marking before the sweep. Dev never reaches build:done, so
 * the store is only ever pruned by a completed build.
 */
export default function buildCache(): AstroIntegration {
  return {
    name: "build-cache",
    hooks: {
      "astro:build:done": ({ logger }) => {
        const swept = sweep();
        const { stats } = cacheState();
        const classes = [
          ...new Set([...Object.keys(stats), ...Object.keys(swept)]),
        ].sort();
        for (const cls of classes) {
          const { hits, misses } = stats[cls] ?? { hits: 0, misses: 0 };
          logger.info(
            `${cls}: ${hits} hits · ${misses} misses · ${swept[cls] ?? 0} swept`,
          );
        }
      },
    },
  };
}
