/**
 * services/agentImport/gemini.ts
 *
 * 2.1.316 新增：从 Google Gemini CLI（~/.gemini/settings.json、GEMINI.md、commands/*.toml）导入，并汇总检测到的来源
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hddjmtjj.js (13)
 * attribution: placement 13
 */
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
} from "path";
import { homedir, homedir as homedir_2, homedir as homedir_3, homedir as homedir_4 } from "os";
import { readdir, mkdir, writeFile } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, oe, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { d$o, findPromptShellCommands } from "../../utils/promptShellExecution.js";
import {
  findShellExecHazard,
  readCappedImportFile,
  describeUnexpectedTableShape,
  sanitizeImportName,
  R,
  ce,
  appendImportedInstructions,
  pinPathInside,
  ne,
  ue,
  isOutsideDirectory,
} from "./importSafety.js";
import { isENOENT, errorMessage } from "../../utils/errors.js";
import { parseJsonc } from "../../utils/json.js";
import { getSemverPart } from "../../hooks/useUpdateNotification.js";
import { userScopeMcpServerExists, addMcpConfig } from "../mcp/config.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { De, CODEX_IMPORT_SOURCE } from "./codex.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { fwe } from "../../utils/frontmatterParser.js";
import { getOriginalCwd, getProjectConfigRoot } from "../../bootstrap/state.js";
import { CURSOR_IMPORT_SOURCE } from "./cursor.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../analytics/index.js";

/**
 * Gemini MCP 服务器配置转为 Claude Code 配置（http/sse/stdio，含超时）。
 */
//@ chunk-hddjmtjj.js:53634-53940 placement
function convertGeminiMcpServer(n) {
  let e =
    n.timeout !== void 0 && Number.isInteger(n.timeout) && n.timeout > 0 ? { timeout: n.timeout } : void 0;
  if (n.httpUrl) return { type: "http", url: n.httpUrl, headers: n.headers, ...e };
  if (n.url) return { type: "sse", url: n.url, headers: n.headers, ...e };
  return { type: "stdio", command: n.command, args: n.args, env: n.env, ...e };
}
//@ chunk-hddjmtjj.js:53940-54092 placement
var GEMINI_SETTINGS_SCHEMA = DoctorLazy(() =>
    u({
      mcpServers: oe().optional(),
      contextFileName: o()
        .optional()
        .catch(void 0),
    }).loose(),
  ),
  GEMINI_COMMAND_SCHEMA = DoctorLazy(() => u({ prompt: o(), description: o().optional() }));
//@ chunk-hddjmtjj.js:54092-54143 placement
function Bt(n) {
  return n.homeDir ?? join_5(homedir_4(), ".gemini");
}
/**
 * 把 Gemini 命令正文（{{args}}、!{…}、@{…}）翻译为 Claude Code 语法，标出无法安全翻译的情况。
 */
//@ chunk-hddjmtjj.js:54143-56805 placement
function translateGeminiCommandBody(n) {
  let replaced = n.replaceAll("{{args}}", "$ARGUMENTS"),
    r = replaced.match(/!\{[^}]+\}/g) ?? [];
  for (let [, g] of replaced.matchAll(/!\{([^}]+)\}/g)) {
    if (g.includes("{"))
      return {
        body: replaced,
        hasShellExec: !0,
        untranslatable:
          "Its `!{\u2026}` shell block contains nested braces, which this importer would truncate. Port it manually.",
      };
    if (g.includes("`"))
      return {
        body: replaced,
        hasShellExec: !0,
        untranslatable:
          "Its `!{\u2026}` shell block contains a backtick, which Claude Code's `` !`cmd` `` syntax can't represent. Port it manually.",
      };
  }
  for (let [, g] of replaced.matchAll(/@\{([^}]+)\}/g))
    if (g.includes("{"))
      return {
        body: replaced,
        hasShellExec: !1,
        untranslatable:
          "Its `@{\u2026}` path contains a nested brace, which this importer would truncate. Port it manually.",
      };
  for (let g of replaced.matchAll(/!\{[^}]+\}/g)) {
    let w = replaced[g.index - 1];
    if (w !== void 0 && !/\s/.test(w))
      return {
        body: replaced,
        hasShellExec: !0,
        untranslatable:
          "Its `!{\u2026}` block isn't preceded by whitespace \u2014 Claude Code's `` !`cmd` `` marker requires it, so the shell exec would be silently lost. Port it manually.",
      };
  }
  if (replaced.replace(/!\{[^}]+\}/g, "").includes("!`"))
    return {
      body: replaced,
      hasShellExec: !0,
      untranslatable:
        "It has a literal `` !` `` outside any `!{\u2026}` block (inert in Gemini, live in Claude Code \u2014 and it may pair with a translated block's backtick to run something other than the block). Port it manually.",
    };
  let filtered = [...replaced.matchAll(/!\{([^}]+)\}/g)].map((g) => d$o(g[1])).filter((g) => g.length > 0),
    replaced_2 = replaced
      .replace(/@\{([^}]+)\}/g, (g, w) => "@" + w.replaceAll(" ", "\\ "))
      .replace(/!\{([^}]+)\}/g, "!`$1`");
  if (replaced_2.includes("```!"))
    return {
      body: replaced,
      hasShellExec: !0,
      untranslatable:
        "Its body contains a ```! fenced shell block (inert in Gemini, live in Claude Code). Port it manually.",
    };
  if ((replaced_2.match(/!`[^`]*`/g) ?? []).length > r.length)
    return {
      body: replaced,
      hasShellExec: !0,
      untranslatable:
        "Its translated body contains a `` !`cmd` `` shell-exec marker that wasn't a `!{\u2026}` block in the Gemini prompt (inert there, live in Claude Code). Port it manually.",
    };
  let mapped = findPromptShellCommands(replaced_2).map((g) => g.command),
    m = [...mapped];
  for (let g of filtered) {
    let index = m.indexOf(g);
    if (index !== -1) m.splice(index, 1);
  }
  let f = [...filtered];
  for (let g of mapped) {
    let index = f.indexOf(g);
    if (index !== -1) f.splice(index, 1);
  }
  if (m.length > 0)
    return {
      body: replaced,
      hasShellExec: !0,
      untranslatable:
        "Its translated body would execute a shell command that wasn't a `!{\u2026}` block in the Gemini prompt (inert there, live in Claude Code). Port it manually.",
    };
  if (f.length > 0)
    return {
      body: replaced,
      hasShellExec: !0,
      untranslatable:
        "A `!{\u2026}` shell block would be silently dropped by Claude Code's `` !`cmd` `` parsing after translation (its marker re-pairs with nearby backticks). Port it manually.",
    };
  let h = findShellExecHazard(replaced_2, filtered);
  if (h !== null) return { body: replaced, hasShellExec: !0, untranslatable: h };
  return { body: replaced_2, hasShellExec: filtered.length > 0 };
}
//@ chunk-hddjmtjj.js:56805-58407 placement
async function importGeminiMcpServers(n, e, r) {
  let l = join_5(n, "settings.json"),
    i;
  try {
    i = await readCappedImportFile(l);
  } catch (error) {
    if (isENOENT(error)) return;
    r.push({
      scope: "user",
      label: "~/.gemini/settings.json",
      reason: "Could not read. Review your MCP servers there manually.",
    });
    return;
  }
  let safeParse = GEMINI_SETTINGS_SCHEMA().safeParse(parseJsonc(i));
  if (!safeParse.success) {
    r.push({
      scope: "user",
      label: "~/.gemini/settings.json",
      reason: "Could not parse (unexpected structure). Review your MCP servers there manually.",
    });
    return;
  }
  let c = safeParse.data,
    m = describeUnexpectedTableShape(
      c.mcpServers,
      "mcpServers",
      "user",
      r,
      "Has an unexpected shape in ~/.gemini/settings.json (expected an object of named entries). Review it manually.",
    );
  for (let [g, w] of Object.entries(m)) {
    let safeParse = getSemverPart().safeParse(w);
    if (!safeParse.success) {
      r.push({
        scope: "user",
        label: `MCP server "${g}"`,
        reason: "Entry in ~/.gemini/settings.json has an unexpected shape. Review it manually.",
      });
      continue;
    }
    let y = safeParse.data;
    if (!y.httpUrl && !y.url && !y.command) {
      r.push({
        scope: "user",
        label: `MCP server "${g}"`,
        reason: "Has neither a url nor a command \u2014 nothing to import. Review it manually.",
      });
      continue;
    }
    let v = sanitizeImportName(g),
      b = convertGeminiMcpServer(y);
    e.push({
      id: `gemini:user:mcp:${g}`,
      kind: "mcp",
      scope: "user",
      label: `MCP server "${g}"`,
      fingerprint: JSON.stringify(b),
      async apply({ dryRun: S, storageV5: x }) {
        if (userScopeMcpServerExists(v)) return { skipped: `${v}: MCP server already exists in user config` };
        if (S) return `would add MCP server ${v} (user)`;
        return (await addMcpConfig(v, b, "user", x), `added MCP server ${v} (user)`);
      },
    });
  }
  let f = new Set(["mcpServers", "model"]),
    filtered = Object.keys(c).filter((g) => !f.has(g));
  if (filtered.length > 0)
    r.push({
      scope: "user",
      label: `settings.json keys: ${filtered.join(", ")}`,
      reason: "No direct Claude Code equivalent, or cosmetic. Review manually if you relied on them.",
    });
}
//@ chunk-hddjmtjj.js:58407-60214 placement
async function importGeminiCommands(n, e, r) {
  let l = join_5(n, "commands"),
    i = await readdir(l, { withFileTypes: !0 }).catch(() => []),
    s = getClaudeConfigDir(),
    mapped = i.filter((m) => m.isDirectory()).map((m) => m.name);
  if (mapped.length > 0)
    r.push({
      scope: "user",
      label: `namespaced commands (${mapped.join(", ")})`,
      reason: "Subdirectory-organized commands are not auto-imported yet.",
    });
  for (let m of i) {
    if (!m.isFile()) continue;
    let f = m.name;
    if (!f.endsWith(".toml")) continue;
    let h = join_5(l, f),
      g = basename_4(f, ".toml"),
      w = sanitizeImportName(g),
      C = join_5(s, "commands", `${w}.md`),
      y;
    try {
      y = await De(h);
    } catch {
      r.push({
        scope: "user",
        label: `Command /${w}`,
        reason: "Could not parse as TOML. Review it manually.",
      });
      continue;
    }
    let safeParse = GEMINI_COMMAND_SCHEMA().safeParse(y);
    if (!safeParse.success) {
      r.push({
        scope: "user",
        label: `Command /${w}`,
        reason: "Doesn't match the expected command format (needs a 'prompt' string). Review it manually.",
      });
      continue;
    }
    let {
      body: body,
      hasShellExec: hasShellExec,
      untranslatable: untranslatable,
    } = translateGeminiCommandBody(safeParse.data.prompt);
    if (untranslatable) {
      r.push({ scope: "user", label: `Command /${w}`, reason: untranslatable });
      continue;
    }
    let description = safeParse.data.description;
    e.push({
      id: `gemini:user:command:${g}`,
      kind: "command",
      scope: "user",
      label: `Command /${w}`,
      description: `\u2192 ${C}`,
      fingerprint: JSON.stringify([body, description, hasShellExec]),
      ...(hasShellExec && {
        warning:
          "Uses `!{cmd}` shell exec \u2014 import grants the command `allowed-tools: [Bash, PowerShell]` (any shell command, not just the named ones) and marks it `disable-model-invocation` so, like the Gemini original, only you can run it via `/name`. Unchecked by default; review before importing.",
      }),
      async apply({ dryRun: D }) {
        if (await R(C)) return { skipped: `${w}: \`${C}\` already exists` };
        if (D) return `would write \`${C}\``;
        await mkdir(join_5(s, "commands"), { recursive: !0 });
        let U = {
            ...(description && { description: ce(description) }),
            ...(hasShellExec && {
              "allowed-tools": [BASH_TOOL_NAME, POWERSHELL_TOOL_NAME],
              "disable-model-invocation": !0,
            }),
          },
          _ =
            Object.keys(U).length > 0
              ? `---
${fwe(U)}---

`
              : "",
          H =
            _ === "" && body.trimStart().startsWith("---")
              ? `
`
              : "";
        return (
          await writeFile(
            C,
            `${_}${H}${body}
`,
            "utf8",
          ),
          `wrote \`${C}\``
        );
      },
    });
  }
}
//@ chunk-hddjmtjj.js:60214-61303 placement
async function importGeminiInstructions(n, e, r, l, i) {
  let s = getClaudeConfigDir(),
    c = [
      {
        id: "gemini:user:instructions",
        src: join_5(n, "GEMINI.md"),
        target: join_5(s, "CLAUDE.md"),
        scope: "user",
      },
      {
        id: "gemini:project:instructions",
        src: join_5(e, "GEMINI.md"),
        target: join_5(e, "CLAUDE.md"),
        scope: "project",
        containIn: e,
      },
    ];
  for (let f of c) {
    if (r !== void 0 && r !== f.scope) continue;
    if (!(await R(f.src))) continue;
    let h;
    if (f.scope === "user")
      try {
        h = await readCappedImportFile(f.src);
      } catch {
        i.push({ scope: "user", label: "GEMINI.md", reason: "Could not read. Review it manually." });
        continue;
      }
    l.push({
      id: f.id,
      kind: "instructions",
      scope: f.scope,
      label: "GEMINI.md",
      fingerprint: h ?? f.src,
      apply: ({ dryRun: dryRun }) =>
        appendImportedInstructions(f.target, f.src, h, f.id, dryRun, f.containIn),
    });
  }
  if (r === "user") return;
  if ((await pinPathInside(e, join_5(e, ".gemini"))) !== null && (await R(join_5(e, ".gemini", "system.md"))))
    i.push({
      scope: "project",
      label: ".gemini/system.md",
      reason:
        "Gemini system.md replaces the system prompt; Claude Code output-styles augment it. Review and add as an output-style manually if wanted.",
    });
  if (await R(join_5(e, "gemini-extension.json")))
    i.push({
      scope: "project",
      label: "gemini-extension.json",
      reason: "Gemini extensions map to Claude Code plugins. Not auto-converted yet.",
    });
}
//@ chunk-hddjmtjj.js:61303-62358 placement
var GEMINI_IMPORT_SOURCE = {
  id: "gemini",
  displayName: "Google Gemini CLI",
  async detect(n) {
    let e = Bt(n),
      r = n.cwd ?? getOriginalCwd();
    if (n.homeDir === void 0 && ne()) return !0;
    return (
      (await R(join_5(e, "settings.json"))) ||
      (await R(join_5(e, "GEMINI.md"))) ||
      (await R(join_5(e, "commands"))) ||
      (await R(join_5(r, "GEMINI.md"))) ||
      (await R(join_5(r, ".gemini")))
    );
  },
  async scan(n) {
    let e = Bt(n),
      r = n.cwd ?? getOriginalCwd(),
      l = [],
      i = [],
      s =
        (n.homeDir === void 0 && ne()) ||
        (process.env.CLAUDE_CONFIG_DIR !== void 0 &&
          (ue(getClaudeConfigDir()) || (await isOutsideDirectory(getClaudeConfigDir(), r))));
    if (s)
      i.push({
        scope: "user",
        label: "Gemini user-scope config",
        reason:
          "The user-scope read or write root has been redirected (resolves inside this project, to a network path, or away from the real home directory) \u2014 skipping user-scope scan for safety.",
      });
    let c = s ? "project" : n.scope;
    if (c !== "project") (await importGeminiMcpServers(e, l, i), await importGeminiCommands(e, l, i));
    if (
      c !== "user" &&
      join_5(r, ".gemini") !== e &&
      (await pinPathInside(r, join_5(r, ".gemini"))) !== null &&
      (await R(join_5(r, ".gemini", "settings.json")))
    )
      i.push({
        scope: "project",
        label: ".gemini/settings.json",
        reason: "Project-level Gemini settings are not auto-imported yet. Review it manually.",
      });
    return (await importGeminiInstructions(e, r, c, l, i), { items: l, unmappable: i });
  },
};
//@ chunk-hddjmtjj.js:62358-62376 placement
var Ee = [CODEX_IMPORT_SOURCE, GEMINI_IMPORT_SOURCE, CURSOR_IMPORT_SOURCE];
//@ chunk-hddjmtjj.js:62376-62421 placement
function qt(n) {
  return Ee.find((e) => e.id === n);
}
//@ chunk-hddjmtjj.js:62421-62507 placement
async function Xt(n) {
  let e = [];
  for (let r of Ee) if (await r.detect(n)) e.push(r);
  return e;
}
//@ chunk-hddjmtjj.js:62507-62592 placement
function mr(n) {
  if (getProjectConfigRoot() !== null) return "user";
  return n === "user" || n === "project" ? n : void 0;
}
/**
 * 扫描指定或全部已检测的导入源（Codex/Cursor/Gemini），返回各自的可导入项与无法映射项。
 */
//@ chunk-hddjmtjj.js:62592-63685 placement
async function scanAgentImportSources(n) {
  let e = { scope: mr(n.scope), homeDir: n.homeDir, cwd: n.cwd },
    r = n.from ? [qt(n.from)].filter((s) => s !== void 0) : await Xt(e);
  if (n.from && r.length === 0)
    return { scans: [], error: `Unknown source "${n.from}". Known: ${Ee.map((s) => s.id).join(", ")}` };
  if (r.length === 0)
    return {
      scans: [],
      error:
        "No other AI coding agents detected (looked for: " + Ee.map((s) => s.displayName).join(", ") + ").",
    };
  let l = [],
    i = [];
  for (let s of r) {
    let c;
    try {
      c = await s.scan(e);
    } catch (error) {
      (logForDebugging(`[agentImport] ${s.id} scan failed: ${errorMessage(error)}`, { level: "error" }),
        i.push(`Couldn't read ${s.displayName} config \u2014 it may be malformed. Skipping.`));
      continue;
    }
    if (getProjectConfigRoot() !== null) c = { ...c, items: c.items.filter((item) => item.scope === "user") };
    if (c.items.length > 0 || c.unmappable.length > 0)
      l.push({ sourceId: s.id, displayName: s.displayName, result: c });
  }
  if (
    (logEvent("tengu_import_scan", {
      source_count: l.length,
      codex: l.some((s) => s.sourceId === "codex"),
      gemini: l.some((s) => s.sourceId === "gemini"),
      cursor: l.some((s) => s.sourceId === "cursor"),
      item_count: l.reduce((s, c) => s + c.result.items.length, 0),
    }),
    l.length === 0 && i.length > 0)
  )
    return {
      scans: l,
      error: i.join(`
`),
    };
  return { scans: l, warnings: i };
}

export { scanAgentImportSources };
