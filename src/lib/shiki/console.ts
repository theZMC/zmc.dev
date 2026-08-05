// ```console fences: terminal transcripts where commands and output are
// different things. `$ `/`# `/`❯ ` lines are commands (bare `# ` is always a
// root prompt, never a comment — annotate at a prompt instead: `$ # note`),
// `> ` continues the previous command (PS2, which is also how heredocs appear
// in a real session), a trailing `\` continues it too, and everything else is
// output. Prompt sigils are stripped from the emitted DOM and re-drawn with
// CSS ::before, so selection and copy always yield clean pasteable shell.
//
// REPL transcripts declare themselves in the fence meta. A preset names the
// whole signature — ```console repl="node" gives `> ` as a PRIMARY prompt
// (each line a fresh command, even after output), `| ` as the REPL's own
// continuation, and javascript tokenization for REPL input. Explicit props
// declare unregistered REPLs or override a preset field: repl-prompt="db=>"
// repl-cont="..." repl-lang="sql". Shell lines in the same block keep their
// shell reading; when the REPL's sigil collides with PS2 (`>`), the declared
// REPL owns it. REPL output (banners, return values) stays flat dim ink —
// bright means typed, dim means returned.
//
// One transformer serves both pipelines (Astro's shiki 3, Slidev's shiki 4):
// it discards the base `shellsession` tokenization — whose prompt rules
// disagree with ours — and re-tokenizes each logical command through the
// context's synchronous codeToHast with the `shellscript` grammar, which is
// guaranteed loaded because shiki's `console` lang embeds it.

// hast node types derived per the rehype-mermaid precedent: a root
// @types/hast devDep would resolve separately from the copy the astro
// chain links against and break astro.config.mjs's checked plugin types.
import type { Element, ElementContent, Root } from "../diagrams/rehype-mermaid";

export interface ConsoleLine {
  kind: "cmd" | "out";
  /** Absent on trailing-`\` continuation lines and on output. */
  prompt?: string;
  /** Prompt-stripped for cmd lines; the raw line for output. */
  text: string;
  /** Logical-command index — cmd lines only. */
  group?: number;
  /** True on continuation lines (PS2 or a REPL's) — dim prompt, same command. */
  cont?: boolean;
  /** True on lines belonging to a REPL command — tokenized in the REPL's lang. */
  repl?: boolean;
}

export interface ConsoleRepl {
  /** The REPL's primary prompt — every such line is a fresh command. */
  prompt: string;
  /** The REPL's continuation prompt (node `|`, python `...`), if it has one. */
  cont?: string;
  /** Grammar for REPL input; shell lines keep shellscript regardless. */
  lang?: string;
}

export interface ParseConsoleOptions {
  repl?: ConsoleRepl;
}

/** Known REPL signatures, addressable as ```console repl="name". */
export const REPL_PRESETS: Record<string, ConsoleRepl> = {
  node: { prompt: ">", cont: "|", lang: "javascript" },
  python: { prompt: ">>>", cont: "...", lang: "python" },
  terraform: { prompt: ">", lang: "hcl" },
};

/* A prompt is the sigil alone or the sigil plus exactly one space; `$FOO=1`,
   `#!/bin/sh` and `>>file` never read as prompts. `❯` covers modern shell
   prompts (starship/pure) so real transcripts paste in verbatim. */
const PROMPT = /^([$#❯])(?: (.*))?$/;
const CONTINUE = /^>(?: (.*))?$/;

/** `raw` with `sigil ` stripped, "" for the bare sigil, null for no match. */
function stripPrompt(raw: string, sigil: string): string | null {
  if (raw === sigil) return "";
  if (raw.startsWith(`${sigil} `)) return raw.slice(sigil.length + 1);
  return null;
}

export function parseConsole(
  source: string,
  options: ParseConsoleOptions = {},
): ConsoleLine[] {
  const repl = options.repl;
  const lines: ConsoleLine[] = [];
  let group = -1; // open logical command, -1 = closed
  let groups = 0;
  let groupRepl = false; // whether the open command is REPL input
  let prevText = ""; // last cmd text in the open group, for `\` detection

  for (const raw of source.split("\n")) {
    // The declared REPL prompt is checked first: as a primary prompt it
    // outranks both the shell sigils and the PS2 reading — in a REPL block
    // the REPL owns its sigil, even where a heredoc would have used it.
    const replText = repl ? stripPrompt(raw, repl.prompt) : null;
    if (replText !== null) {
      group = groups++;
      groupRepl = true;
      prevText = replText;
      lines.push({
        kind: "cmd",
        prompt: repl!.prompt,
        text: replText,
        group,
        repl: true,
      });
      continue;
    }

    // The REPL's own continuation extends the open REPL command only —
    // a stray `| ` after shell or output is just output.
    const replCont =
      repl?.cont && group >= 0 && groupRepl
        ? stripPrompt(raw, repl.cont)
        : null;
    if (replCont !== null && replCont !== undefined) {
      prevText = replCont;
      lines.push({
        kind: "cmd",
        prompt: repl!.cont,
        text: replCont,
        group,
        cont: true,
        repl: true,
      });
      continue;
    }

    const prompt = raw.match(PROMPT);
    if (prompt) {
      // A fresh prompt always opens a new command, even mid-`\` — the
      // author's sigil outranks the dangling backslash.
      group = groups++;
      groupRepl = false;
      prevText = prompt[2] ?? "";
      lines.push({ kind: "cmd", prompt: prompt[1], text: prevText, group });
      continue;
    }

    // `> ` only continues an open SHELL command; anywhere else (block
    // start, after output, inside a REPL) a leading `>` is quoted output
    // — unless the REPL claimed it above.
    const cont = group >= 0 && !groupRepl ? raw.match(CONTINUE) : null;
    if (cont) {
      prevText = cont[1] ?? "";
      lines.push({ kind: "cmd", prompt: ">", text: prevText, group, cont: true });
      continue;
    }

    // Unprompted continuation after a trailing `\` — indentation is real
    // command text. Shell-only: REPLs continue via their own sigil. A
    // blank line instead closes the command (rule below).
    if (group >= 0 && !groupRepl && raw !== "" && prevText.endsWith("\\")) {
      prevText = raw;
      lines.push({ kind: "cmd", text: raw, group });
      continue;
    }

    group = -1;
    groupRepl = false;
    prevText = "";
    lines.push({ kind: "out", text: raw });
  }
  return lines;
}

/* --- transformer ---------------------------------------------------------
   Typed structurally (not against either shiki major's ShikiTransformer):
   the two pipelines link different shiki versions, and this is the stable
   surface both share. */

interface TransformerContext {
  source: string;
  options: { lang?: string; meta?: { __raw?: string } };
  // `any` on purpose: shiki 3 and 4 type this param with different
  // CodeToHastOptions identities, and either nominal pick would reject
  // the other pipeline's context.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  codeToHast(code: string, options: any): Root;
}

function metaProp(raw: string, name: string): string | undefined {
  const m = raw.match(
    new RegExp(`(?:^|\\s)${name}=(?:"([^"]*)"|'([^']*)'|(\\S+))`),
  );
  return m?.[1] || m?.[2] || m?.[3] || undefined;
}

/** The REPL signature a fence meta declares, if any. */
export function consoleReplFromMeta(
  raw: string | undefined,
): ConsoleRepl | undefined {
  if (!raw) return undefined;
  const preset = REPL_PRESETS[metaProp(raw, "repl") ?? ""];
  const prompt = metaProp(raw, "repl-prompt") ?? preset?.prompt;
  if (!prompt) return undefined;
  return {
    prompt,
    cont: metaProp(raw, "repl-cont") ?? preset?.cont,
    lang: metaProp(raw, "repl-lang") ?? preset?.lang,
  };
}

function isElement(node: unknown): node is Element {
  return (
    typeof node === "object" &&
    node !== null &&
    (node as { type?: string }).type === "element"
  );
}

function hasClass(node: Element, name: string): boolean {
  const cls = node.properties?.className ?? node.properties?.class;
  if (Array.isArray(cls)) return cls.includes(name);
  if (typeof cls === "string") return cls.split(/\s+/).includes(name);
  return false;
}

function addClass(node: Element, name: string): void {
  node.properties ??= {};
  // Both pipelines emit line spans with a string `class`, but stay liberal
  // in what we accept — some transformers normalize to a className array.
  const props = node.properties as Record<string, unknown>;
  const cls = props.className ?? props.class;
  if (Array.isArray(cls)) {
    cls.push(name);
  } else if (typeof cls === "string") {
    props[props.className === cls ? "className" : "class"] = `${cls} ${name}`;
  } else {
    props.class = name;
  }
}

function lineSpans(code: Element): Element[] {
  return code.children.filter(
    (child): child is Element =>
      isElement(child) && child.tagName === "span" && hasClass(child, "line"),
  );
}

/** The nested render's line spans: root > pre > code > span.line[]. */
function renderedLines(root: Root): Element[] {
  const pre = root.children.find(
    (child): child is Element => isElement(child) && child.tagName === "pre",
  );
  const code = pre?.children.find(
    (child): child is Element => isElement(child) && child.tagName === "code",
  );
  return code ? lineSpans(code) : [];
}

export interface ConsoleShikiTransformer {
  name: string;
  code(this: TransformerContext, node: Element): void;
}

export function consoleTransformer(): ConsoleShikiTransformer {
  return {
    name: "zmc:console",
    code(node) {
      const lang = String(this.options.lang ?? "");
      if (lang !== "console" && lang !== "shellsession") return;

      const repl = consoleReplFromMeta(this.options.meta?.__raw);
      const parsed = parseConsole(this.source, { repl });

      // Each logical command tokenizes as one unit — shellscript for shell
      // commands (quoting, `\` continuations and heredoc state carry across
      // lines), the REPL's grammar for REPL input (a multi-line function
      // body brace-matches as one render).
      const groups: { texts: string[]; repl: boolean }[] = [];
      for (const line of parsed) {
        if (line.kind !== "cmd") continue;
        if (line.group === groups.length)
          groups.push({ texts: [], repl: line.repl === true });
        groups[line.group as number].texts.push(line.text);
      }
      const rendered = groups.map((g) => {
        const lang = g.repl && repl?.lang ? repl.lang : "shellscript";
        try {
          return renderedLines(
            this.codeToHast(g.texts.join("\n"), {
              ...this.options,
              lang,
              // No transformers on the nested render: prevents recursion and
              // keeps pipeline-internal hooks off command sub-renders.
              transformers: [],
              meta: undefined,
              decorations: undefined,
            }),
          );
        } catch {
          // The nested render is synchronous, so a REPL grammar not loaded
          // in this highlighter can't be fetched here — degrade to plain
          // bright text (the per-line fallback below) instead of dying.
          // Preload REPL grammars via shikiConfig.langs / the theme's
          // shiki setup to get real tokens.
          return null;
        }
      });

      // Rewrite the outer line spans in place. The spans themselves — and
      // the newline text nodes between them — are load-bearing: the theme's
      // inline-block line CSS and Slidev's click-range indexing both depend
      // on their count and order staying exactly as shiki emitted them.
      const cursor = groups.map(() => 0);
      let i = 0;
      for (const child of node.children) {
        if (!isElement(child) || !hasClass(child, "line")) continue;
        const line = parsed[i++];
        if (!line) break;
        if (line.kind === "cmd") {
          const g = line.group as number;
          const tokens = rendered[g]?.[cursor[g]++];
          child.children = tokens
            ? tokens.children
            : ([{ type: "text", value: line.text }] as ElementContent[]);
          addClass(child, "console-cmd");
          if (line.cont) addClass(child, "console-cont");
          if (line.prompt) {
            child.properties ??= {};
            child.properties["data-prompt"] = line.prompt;
          }
        } else if (line.text !== "") {
          // Output is flat prose, not shell: one text node, no tokens.
          child.children = [
            { type: "text", value: line.text },
          ] as ElementContent[];
          addClass(child, "console-out");
        }
        // Blank lines stay exactly as shiki left them.
      }
    },
  };
}
