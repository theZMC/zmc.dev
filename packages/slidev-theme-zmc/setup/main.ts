import { defineAppSetup } from '@slidev/types'

// Slidev's built-in copy button pastes the whole block's textContent. On
// ```console transcripts the commands are the copyable thing — output is
// context — so intercept the click in capture phase (ahead of the button's
// own handler) and put only the command lines on the clipboard. Prompts are
// already absent from DOM text (they're CSS ::before), so the paste runs
// as-is. CSS can't do this one: textContent is blind to styling.
export default defineAppSetup(() => {
  if (typeof document === 'undefined')
    return
  document.addEventListener(
    'click',
    (e) => {
      const btn = (e.target as Element | null)?.closest?.('.slidev-code-copy')
      if (!btn)
        return
      const cmds = btn
        .closest('.slidev-code-wrapper')
        ?.querySelectorAll('.line.console-cmd')
      // Not a transcript, or no Clipboard API (insecure context): stand
      // aside and let Slidev's own copy run.
      if (!cmds?.length || !navigator.clipboard)
        return
      e.stopPropagation()
      e.preventDefault()
      const text = Array.from(cmds, l => l.textContent ?? '').join('\n')
      navigator.clipboard.writeText(text).then(() => {
        // The bypassed button never flips its Vue `copied` state, so the
        // "Copied" feedback is ours to show — code.css draws it from this
        // class.
        btn.classList.add('zmc-copied')
        setTimeout(() => btn.classList.remove('zmc-copied'), 1600)
      })
    },
    { capture: true },
  )
})
