import { createShikiHighlighter } from "@astrojs/markdown-remark";
import { describe, expect, it } from "vitest";
import type { Element, Root } from "../diagrams/rehype-mermaid";
import {
  consoleReplFromMeta,
  consoleTransformer,
  parseConsole,
} from "./console";
import { zmcDark, zmcLight } from "./zmc-themes.mjs";

describe("parseConsole", () => {
  it("classifies $ and # prefixed lines as commands, the rest as output", () => {
    const lines = parseConsole(
      ["$ kubectl get nodes", "NAME     STATUS", "# systemctl restart"].join(
        "\n",
      ),
    );
    expect(lines).toEqual([
      { kind: "cmd", prompt: "$", text: "kubectl get nodes", group: 0 },
      { kind: "out", text: "NAME     STATUS" },
      { kind: "cmd", prompt: "#", text: "systemctl restart", group: 1 },
    ]);
  });

  it("treats a bare # line as a root prompt, never a comment", () => {
    const [line] = parseConsole("# wrong: looks like a comment");
    expect(line.kind).toBe("cmd");
    expect(line.prompt).toBe("#");
  });

  it("continues a command through > lines (PS2 / heredoc)", () => {
    const lines = parseConsole(
      ["$ cat <<EOF", "> hello", "> EOF", "hello"].join("\n"),
    );
    expect(lines.map((l) => l.kind)).toEqual(["cmd", "cmd", "cmd", "out"]);
    expect(lines[1]).toEqual({
      kind: "cmd",
      prompt: ">",
      text: "hello",
      group: 0,
      cont: true,
    });
  });

  it("continues a command through unprompted lines after a trailing backslash", () => {
    const lines = parseConsole(
      [
        "$ cosign verify \\",
        "    --certificate-identity-regexp '.*' \\",
        "    --certificate-oidc-issuer-regexp '.*' \"$IMG\"",
        "",
      ].join("\n"),
    );
    expect(lines.map((l) => l.kind)).toEqual(["cmd", "cmd", "cmd", "out"]);
    // Indentation is real command text; no prompt on these lines.
    expect(lines[1].prompt).toBeUndefined();
    expect(lines[1].text).toBe("    --certificate-identity-regexp '.*' \\");
    expect(lines.slice(0, 3).every((l) => l.group === 0)).toBe(true);
  });

  it("lets a fresh prompt open a new command even after a trailing backslash", () => {
    const lines = parseConsole(["$ echo one \\", "$ echo two"].join("\n"));
    expect(lines[1]).toEqual({
      kind: "cmd",
      prompt: "$",
      text: "echo two",
      group: 1,
    });
  });

  it("treats a lone sigil as an empty command", () => {
    expect(parseConsole("$")).toEqual([
      { kind: "cmd", prompt: "$", text: "", group: 0 },
    ]);
    expect(parseConsole("#")).toEqual([
      { kind: "cmd", prompt: "#", text: "", group: 0 },
    ]);
  });

  it("treats > as output at block start and after output or blanks", () => {
    const lines = parseConsole(
      ["> quoted at start", "$ true", "ok", "> quoted after output"].join("\n"),
    );
    expect(lines[0].kind).toBe("out");
    expect(lines[3].kind).toBe("out");
  });

  it("never reads sigils without a following space as prompts", () => {
    const lines = parseConsole(["$FOO=1", "#!/bin/sh", ">>file"].join("\n"));
    expect(lines.every((l) => l.kind === "out")).toBe(true);
  });

  it("classifies leading-space lines as output", () => {
    const [line] = parseConsole("  => exporting layers");
    expect(line).toEqual({ kind: "out", text: "  => exporting layers" });
  });

  it("closes an open command at a blank line, even after a trailing backslash", () => {
    const lines = parseConsole(["$ echo dangling \\", "", "orphan"].join("\n"));
    expect(lines.map((l) => l.kind)).toEqual(["cmd", "out", "out"]);
  });

  it("parses blank-separated command groups like the talk's syft slide", () => {
    const lines = parseConsole(
      [
        "$ syft orders-api:naive -o cyclonedx-json > sbom-naive.json",
        " ✔ Cataloged 1,247 packages",
        "",
        "$ syft orders-api:hardened -o cyclonedx-json > sbom-hardened.json",
        " ✔ Cataloged 213 packages",
      ].join("\n"),
    );
    expect(lines.map((l) => l.kind)).toEqual([
      "cmd",
      "out",
      "out",
      "cmd",
      "out",
    ]);
    expect(lines[0].group).toBe(0);
    expect(lines[3].group).toBe(1);
  });
});

describe("parseConsole with a declared REPL", () => {
  const TERRAFORM = [
    "$ terraform console",
    "> cidrsubnet(\"10.0.0.0/21\", 3, 4)",
    '"10.0.4.0/24"',
    "> cidrsubnets(\"10.0.0.0/22\", 1, 1)",
    "[",
    '  "10.0.0.0/23",',
    "]",
    "> exit",
  ].join("\n");

  const NODE = [
    "❯ node",
    "Welcome to Node.js v26.5.0.",
    'Type ".help" for more information.',
    "> function do_stuff() {",
    '| console.log("hey");',
    "| }",
    "undefined",
    ">",
  ].join("\n");

  it("treats every REPL-prompt line as a fresh command, even after output", () => {
    const lines = parseConsole(TERRAFORM, { repl: { prompt: ">" } });
    expect(lines.map((l) => l.kind)).toEqual([
      "cmd",
      "cmd",
      "out",
      "cmd",
      "out",
      "out",
      "out",
      "cmd",
    ]);
    // Each REPL line opens its own group — no PS2 run-on with the shell cmd.
    expect(lines.slice(0, 2).map((l) => l.group)).toEqual([0, 1]);
    expect(lines[7]).toEqual({
      kind: "cmd",
      prompt: ">",
      text: "exit",
      group: 3,
      repl: true,
    });
    expect(lines.every((l) => !l.cont)).toBe(true);
  });

  it("keeps shell sigils as primary prompts alongside the REPL prompt", () => {
    const lines = parseConsole(TERRAFORM, { repl: { prompt: ">" } });
    expect(lines[0]).toEqual({
      kind: "cmd",
      prompt: "$",
      text: "terraform console",
      group: 0,
    });
  });

  it("parses a full node session: ❯ shell, banner output, | continuations, bare prompt", () => {
    const lines = parseConsole(NODE, {
      repl: { prompt: ">", cont: "|", lang: "javascript" },
    });
    expect(lines.map((l) => l.kind)).toEqual([
      "cmd",
      "out",
      "out",
      "cmd",
      "cmd",
      "cmd",
      "out",
      "cmd",
    ]);
    // ❯ opens a shell command; the function is ONE three-line REPL group.
    expect(lines[0]).toEqual({ kind: "cmd", prompt: "❯", text: "node", group: 0 });
    expect(lines.slice(3, 6).map((l) => l.group)).toEqual([1, 1, 1]);
    expect(lines[4]).toEqual({
      kind: "cmd",
      prompt: "|",
      text: 'console.log("hey");',
      group: 1,
      cont: true,
      repl: true,
    });
    // The bare trailing > is an empty REPL command, not output.
    expect(lines[7]).toEqual({ kind: "cmd", prompt: ">", text: "", group: 2, repl: true });
  });

  it("treats the REPL continuation as output when no REPL command is open", () => {
    const lines = parseConsole(["| stray", "> f()", "| body"].join("\n"), {
      repl: { prompt: ">", cont: "|" },
    });
    expect(lines[0].kind).toBe("out");
    expect(lines[2]).toMatchObject({ kind: "cmd", cont: true, group: 0 });
  });

  it("supports multi-char prompts and leaves PS2 alive when they differ from >", () => {
    const lines = parseConsole(
      ['>>> print("hi")', "hi", "$ cat <<EOF", "> body", "> EOF"].join("\n"),
      { repl: { prompt: ">>>", cont: "..." } },
    );
    expect(lines[0]).toEqual({
      kind: "cmd",
      prompt: ">>>",
      text: 'print("hi")',
      group: 0,
      repl: true,
    });
    expect(lines[1].kind).toBe("out");
    // `> ` after the open shell command is still a PS2 continuation.
    expect(lines[3]).toEqual({ kind: "cmd", prompt: ">", text: "body", group: 1, cont: true });
  });

  it("groups python-style ... continuations with their >>> opener", () => {
    const lines = parseConsole(
      [">>> def f():", "...     pass", "...", "$ echo done"].join("\n"),
      { repl: { prompt: ">>>", cont: "..." } },
    );
    expect(lines.slice(0, 3).map((l) => l.group)).toEqual([0, 0, 0]);
    expect(lines[1].text).toBe("    pass");
    expect(lines[2]).toMatchObject({ kind: "cmd", text: "", cont: true });
    expect(lines[3]).toMatchObject({ kind: "cmd", prompt: "$", group: 1 });
  });

  it("never reads sigils without a following space as prompts", () => {
    const lines = parseConsole(
      [">exit", "> exit", "...done"].join("\n"),
      { repl: { prompt: ">", cont: "..." } },
    );
    expect(lines[0].kind).toBe("out");
    expect(lines[1].kind).toBe("cmd");
    expect(lines[2].kind).toBe("out");
  });

  it("recognizes ❯ as a builtin shell prompt without any meta", () => {
    const lines = parseConsole(["❯ ls -la", "total 8"].join("\n"));
    expect(lines[0]).toEqual({ kind: "cmd", prompt: "❯", text: "ls -la", group: 0 });
    expect(lines[1].kind).toBe("out");
  });

  it("marks default-mode PS2 lines as continuations", () => {
    const lines = parseConsole(["$ cat <<EOF", "> hello"].join("\n"));
    expect(lines[1].cont).toBe(true);
  });
});

describe("consoleReplFromMeta", () => {
  it("expands presets", () => {
    expect(consoleReplFromMeta('repl="node"')).toEqual({
      prompt: ">",
      cont: "|",
      lang: "javascript",
    });
    expect(consoleReplFromMeta('repl="python"')).toEqual({
      prompt: ">>>",
      cont: "...",
      lang: "python",
    });
    expect(consoleReplFromMeta('repl="terraform"')).toEqual({
      prompt: ">",
      cont: undefined,
      lang: "hcl",
    });
  });

  it("builds a REPL from explicit props alone", () => {
    expect(consoleReplFromMeta('repl-prompt="db=>" repl-lang="sql"')).toEqual({
      prompt: "db=>",
      cont: undefined,
      lang: "sql",
    });
  });

  it("lets explicit props override a preset field", () => {
    expect(consoleReplFromMeta('repl="node" repl-prompt="»"')).toEqual({
      prompt: "»",
      cont: "|",
      lang: "javascript",
    });
  });

  it("requires a prompt and tolerates other meta around the props", () => {
    expect(consoleReplFromMeta('{all|1-3|all} repl="node"')).toBeDefined();
    expect(consoleReplFromMeta('repl-lang="sql"')).toBeUndefined();
    expect(consoleReplFromMeta("{2,5-7}")).toBeUndefined();
    expect(consoleReplFromMeta(undefined)).toBeUndefined();
    expect(consoleReplFromMeta('repl="not-a-preset"')).toBeUndefined();
  });
});

/* --- end-to-end through Astro's real shiki pipeline, no mocks ---------- */

const FIXTURE = [
  "$ kubectl get nodes",
  "NAME     STATUS   ROLES",
  "node-1   Ready    worker",
  "",
  "$ sudo -i",
  "# cosign attest --key cosign.key \\",
  "    --predicate sbom.json \"$IMG\"",
  "$ cat <<EOF",
  "> hello",
  "> EOF",
].join("\n");

function isElement(node: unknown): node is Element {
  return (
    typeof node === "object" &&
    node !== null &&
    (node as { type?: string }).type === "element"
  );
}

function findCode(root: Root): Element {
  const pre = root.children.find(
    (c): c is Element => isElement(c) && c.tagName === "pre",
  );
  const code = pre?.children.find(
    (c): c is Element => isElement(c) && c.tagName === "code",
  );
  if (!code) throw new Error("no code element in render");
  return code;
}

function lines(code: Element): Element[] {
  return code.children.filter(
    (c): c is Element =>
      isElement(c) &&
      c.tagName === "span" &&
      String(c.properties?.class ?? c.properties?.className).includes("line"),
  );
}

function textOf(node: Element): string {
  let text = "";
  for (const child of node.children) {
    if (child.type === "text") text += child.value;
    else if (isElement(child)) text += textOf(child);
  }
  return text;
}

function classesOf(node: Element): string {
  return String(node.properties?.class ?? node.properties?.className ?? "");
}

async function render(
  source: string,
  lang: string,
  meta?: string,
  langs?: string[],
): Promise<Root> {
  const highlighter = await createShikiHighlighter({
    themes: { light: zmcLight, dark: zmcDark },
    // Same shape astro.config.mjs uses: bundled-language names work at
    // runtime even though Astro types langs as registration objects.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    langs: langs as any,
  });
  return highlighter.codeToHast(source, lang, {
    defaultColor: false,
    meta,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transformers: [consoleTransformer() as any],
  }) as Promise<Root>;
}

describe("consoleTransformer through the astro shiki pipeline", () => {
  it("strips every prompt sigil from the emitted DOM text", async () => {
    const code = findCode(await render(FIXTURE, "console"));
    for (const line of lines(code)) {
      expect(textOf(line)).not.toMatch(/^[$#>] /);
      expect(textOf(line)).not.toMatch(/^[$#>]$/);
    }
  });

  it("keeps the line-span count equal to the source line count (click-index invariant)", async () => {
    const code = findCode(await render(FIXTURE, "console"));
    expect(lines(code).length).toBe(FIXTURE.split("\n").length);
  });

  it("marks command lines with console-cmd, data-prompt and dual-theme tokens", async () => {
    const code = findCode(await render(FIXTURE, "console"));
    const all = lines(code);
    const first = all[0];
    expect(classesOf(first)).toContain("console-cmd");
    expect(first.properties?.["data-prompt"]).toBe("$");
    expect(textOf(first)).toBe("kubectl get nodes");
    // Tokenized: at least one child span carrying both theme custom props.
    const token = first.children.find(
      (c): c is Element => isElement(c) && c.tagName === "span",
    );
    expect(token).toBeDefined();
    expect(String(token?.properties?.style)).toContain("--shiki-dark");
    expect(String(token?.properties?.style)).toContain("--shiki-light");
    // Root prompt and PS2 continuation carry their own sigils.
    expect(all[5].properties?.["data-prompt"]).toBe("#");
    expect(all[8].properties?.["data-prompt"]).toBe(">");
    // Unprompted backslash continuation is a command without a sigil.
    expect(classesOf(all[6])).toContain("console-cmd");
    expect(all[6].properties?.["data-prompt"]).toBeUndefined();
  });

  it("renders output lines as a single flat text node", async () => {
    const code = findCode(await render(FIXTURE, "console"));
    const out = lines(code)[1];
    expect(classesOf(out)).toContain("console-out");
    expect(out.children).toHaveLength(1);
    expect(out.children[0].type).toBe("text");
    expect(textOf(out)).toBe("NAME     STATUS   ROLES");
  });

  it("leaves blank lines untouched and unclassified", async () => {
    const code = findCode(await render(FIXTURE, "console"));
    const blank = lines(code)[3];
    expect(classesOf(blank)).not.toContain("console-out");
    expect(classesOf(blank)).not.toContain("console-cmd");
  });

  it("honors repl= fence meta end to end, tokenizing REPL input in its language", async () => {
    const session = [
      "❯ node",
      "Welcome to Node.js v26.5.0.",
      "> function do_stuff() {",
      '| console.log("hey");',
      "| }",
      "undefined",
      ">",
    ].join("\n");
    const code = findCode(
      await render(session, "console", 'repl="node"', ["javascript"]),
    );
    const all = lines(code);
    expect(all.length).toBe(7);
    // ❯ shell command, brass primary prompt.
    expect(all[0].properties?.["data-prompt"]).toBe("❯");
    expect(classesOf(all[0])).not.toContain("console-cont");
    // The function body is a REPL continuation: dim | prompt, same command,
    // javascript tokens, sigil absent from text.
    expect(classesOf(all[3])).toContain("console-cmd");
    expect(classesOf(all[3])).toContain("console-cont");
    expect(all[3].properties?.["data-prompt"]).toBe("|");
    expect(textOf(all[3])).toBe('console.log("hey");');
    const token = all[3].children.find(
      (c): c is Element => isElement(c) && c.tagName === "span",
    );
    expect(String(token?.properties?.style)).toContain("--shiki-dark");
    // Banner and return value are flat output.
    expect(classesOf(all[1])).toContain("console-out");
    expect(classesOf(all[5])).toContain("console-out");
    // The bare trailing prompt is an (empty) command awaiting input.
    expect(classesOf(all[6])).toContain("console-cmd");
    expect(textOf(all[6])).toBe("");
  });

  it("degrades to plain bright text when the REPL grammar is not loaded", async () => {
    const session = ["$ terraform console", "> cidrsubnet(1)"].join("\n");
    // hcl deliberately NOT preloaded here.
    const code = findCode(await render(session, "console", 'repl="terraform"'));
    const all = lines(code);
    expect(classesOf(all[1])).toContain("console-cmd");
    expect(all[1].properties?.["data-prompt"]).toBe(">");
    // Fallback: one plain text node, no token spans — but never a crash.
    expect(textOf(all[1])).toBe("cidrsubnet(1)");
    expect(all[1].children).toHaveLength(1);
    expect(all[1].children[0].type).toBe("text");
  });

  it("marks PS2 continuations with console-cont in default mode", async () => {
    const code = findCode(await render(FIXTURE, "console"));
    const heredoc = lines(code)[8];
    expect(classesOf(heredoc)).toContain("console-cont");
  });

  it("leaves non-console fences completely alone", async () => {
    const code = findCode(await render('$ not-a-prompt-here\necho "hi"', "bash"));
    for (const line of lines(code)) {
      expect(classesOf(line)).not.toContain("console-cmd");
      expect(classesOf(line)).not.toContain("console-out");
    }
    expect(textOf(code)).toContain("$ not-a-prompt-here");
  });
});
