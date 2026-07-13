import { defineShikiSetup } from '@slidev/types'
// The site's Shiki themes are the single source of truth for token colors —
// the theme package lives in the same workspace precisely so code on slides
// and code in posts never drift apart. (No ts-expect-error: the root
// tsconfig's allowJs infers types for the .mjs, so the import checks.)
import { zmcDark, zmcLight } from '../../../src/lib/shiki/zmc-themes.mjs'

export default defineShikiSetup(() => {
  return {
    themes: {
      dark: zmcDark,
      light: zmcLight,
    },
    transformers: [
      {
        // Surface the fence language on the <pre> so CSS can render the
        // site's code-head language chip without any runtime DOM work.
        pre(node: any) {
          const lang = (this as any).options?.lang ?? ''
          if (lang && lang !== 'text' && lang !== 'plaintext')
            node.properties['data-lang'] = lang
        },
      },
    ],
  }
})
