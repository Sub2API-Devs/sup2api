/**
 * services/agentImport/cursor.ts
 *
 * 2.1.316 新增：从 Cursor（mcp.json、rules/*.mdc、commands、skills、hooks、.cursorignore）导入
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hddjmtjj.js (40)
 * attribution: placement 40
 */
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  relative,
  relative as relative_2,
  sep,
  sep as sep_2,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
} from "path";
import { homedir, homedir as homedir_2, homedir as homedir_3, homedir as homedir_4 } from "os";
import { readdir, mkdir, writeFile, lstat } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, A, pe, oe, Ue } from "../../../vendor/zod/v4/classic/schemas.js";
import { firstLineOf, plural, countCharInString, truncateCodePoints } from "../../utils/stringUtils.js";
import {
  fe,
  describeUnexpectedTableShape,
  sanitizeImportName,
  pinPathInside,
  ie,
  R,
  me,
  appendImportedInstructions,
  ce,
  findShellExecHazard,
  resolveInsideReal,
  ne,
  ue,
  isOutsideDirectory,
} from "./importSafety.js";
import { isENOENT } from "../../utils/errors.js";
import { parseJsonc } from "../../utils/json.js";
import { userScopeMcpServerExists, readRawMcpJsonServersFromCwd, addMcpConfig } from "../mcp/config.js";
import { Yg } from "../../remote/remoteMode.js";
import { safeWriteFile } from "../../skills/bundledSkills.js";
import { By } from "../plugins/accountSync/pluginsScopeGate.js";
import { parseFrontmatter, parseBooleanishFrontmatter, fwe } from "../../utils/frontmatterParser.js";
import { unwrapResults } from "../../utils/suggestions/slackChannelSuggestions.js";
import { f3 } from "../../utils/plugins/syncedItems.js";
import { xM } from "../../utils/promptShellExecution.js";
import { importSkillDirectory } from "./codex.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { getOriginalCwd } from "../../bootstrap/state.js";

/**
 * Cursor 导入的 schema：MCP 服务器、mcp.json、规则 frontmatter、hooks，及上限。
 */
//@ chunk-hddjmtjj.js:29064-29456 placement
var CURSOR_MCP_SERVER_SCHEMA = DoctorLazy(() =>
    u({
      command: o().optional(),
      args: A(o()).optional(),
      env: pe(o(), o()).optional(),
      url: o().optional(),
      headers: pe(o(), o()).optional(),
    }).loose(),
  ),
  CURSOR_MCP_FILE_SCHEMA = DoctorLazy(() => u({ mcpServers: oe().optional() }).loose()),
  CURSOR_RULE_FRONTMATTER_SCHEMA = DoctorLazy(() =>
    u({
      description: o()
        .optional()
        .catch(void 0),
      globs: Ue([o(), A(o())])
        .optional()
        .catch(void 0),
      alwaysApply: oe().optional(),
    }).loose(),
  ),
  CURSOR_HOOKS_FILE_SCHEMA = DoctorLazy(() => u({ hooks: oe().optional() }).loose()),
  MAX_CURSOR_ITEMS = 100;
//@ chunk-hddjmtjj.js:29456-29507 placement
function Pt(n) {
  return n.homeDir ?? join_4(homedir_3(), ".cursor");
}
//@ chunk-hddjmtjj.js:29507-29557 placement
function Ln(n) {
  return join_4(dirname_3(n), ".agents", "skills");
}
//@ chunk-hddjmtjj.js:29557-29639 placement
function On(n) {
  return n.replaceAll("-->", "\u2014>").replaceAll("<!--", "<!\u2014");
}
//@ chunk-hddjmtjj.js:29639-29684 placement
var et = /\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g;
//@ chunk-hddjmtjj.js:29684-29765 placement
function Je(n, e) {
  return n.replace(et, "${$1}").replaceAll("${workspaceFolder}", e);
}
//@ chunk-hddjmtjj.js:29765-29859 placement
function Et(n, e) {
  if (!n) return;
  let r = {};
  for (let [l, i] of Object.entries(n)) r[l] = Je(i, e);
  return r;
}
/**
 * ${VAR} 形式的占位符（可带认证前缀）。
 */
//@ chunk-hddjmtjj.js:29859-29978 placement
var ENV_PLACEHOLDER_RE = /^\$\{[A-Za-z_][A-Za-z0-9_]*(?::-)?\}$/,
  AUTH_PLACEHOLDER_RE = /^(?:(?:Bearer|Basic|Token) )?\$\{[A-Za-z_][A-Za-z0-9_]*(?::-)?\}$/i;
//@ chunk-hddjmtjj.js:29978-30038 placement
function Rt(n) {
  return /\/sse(?:$|[?#])/.test(n) ? "sse" : "http";
}
//@ chunk-hddjmtjj.js:30038-30137 placement
function _t(n) {
  return (
    n
      .replace(/[^A-Za-z0-9_]/g, "_")
      .replace(/^(?=[0-9])/, "_")
      .toUpperCase() || "_"
  );
}
//@ chunk-hddjmtjj.js:30137-30161 placement
var CURSOR_IMPORT = "CURSOR_IMPORT_";
/**
 * 把 MCP 服务器 env 与 headers 中的字面值替换成 ${CURSOR_IMPORT_...} 占位符，返回新配置与占位名。
 */
//@ chunk-hddjmtjj.js:30161-30554 placement
function placeholderSecrets(n, e, r = new Set()) {
  let l = [],
    i = (c) => {
      let m = `${CURSOR_IMPORT}${_t(e)}_${_t(c)}`,
        f = m;
      for (let h = 2; r.has(f); h++) f = `${m}_${h}`;
      return (r.add(f), l.push(f), f);
    },
    s = { ...n };
  if (n.env) {
    let c = {};
    for (let [m, f] of Object.entries(n.env)) c[m] = ENV_PLACEHOLDER_RE.test(f) ? f : `\${${i(m)}}`;
    s.env = c;
  }
  if (n.headers) {
    let c = {};
    for (let [m, f] of Object.entries(n.headers)) c[m] = AUTH_PLACEHOLDER_RE.test(f) ? f : `\${${i(m)}}`;
    s.headers = c;
  }
  return { server: s, placeholdered: l };
}
//@ chunk-hddjmtjj.js:30554-30644 placement
var Ve = /(?:api[-_]?key|access[-_]?key|secret|token|password|passwd|auth|authorization)$/i;
//@ chunk-hddjmtjj.js:30644-30706 placement
function Ge(n) {
  return n !== "" && !AUTH_PLACEHOLDER_RE.test(n.replace(et, "${$1}"));
}
/**
 * URL 的用户信息或查询参数中是否含有密钥样式的值。
 */
//@ chunk-hddjmtjj.js:30706-31003 placement
function urlHasSecret(n) {
  let e = /^[a-z][a-z0-9+.-]*:\/\/[^/?#@:]*:([^/?#@]*)@/i.exec(n)?.[1];
  if (e !== void 0 && Ge(e)) return !0;
  let r = firstLineOf(n, "#"),
    index = r.indexOf("?"),
    i = index === -1 ? "" : r.slice(index + 1);
  for (let s of i === "" ? [] : i.split("&")) {
    let index = s.indexOf("=");
    if (index !== -1 && Ve.test(s.slice(0, index)) && Ge(s.slice(index + 1))) return !0;
  }
  return !1;
}
/**
 * MCP 服务器的参数或 URL 中是否内联了密钥。
 */
//@ chunk-hddjmtjj.js:31003-31496 placement
function serverHasInlineSecret(n) {
  let e = (i) => /^[a-z][a-z0-9+.-]*:\/\//i.test(i),
    r = (i, s) => {
      if (Ve.test(i) && Ge(s)) return !0;
      let match = /^([^:\s]+)\s*:\s*(.*)$/.exec(s);
      if (match !== null && Ve.test(match[1]) && Ge(match[2])) return !0;
      return e(s) && urlHasSecret(s);
    },
    l = n.args ?? [];
  for (let i = 0; i < l.length; i++) {
    let s = l[i];
    if (!s.startsWith("-")) {
      if (e(s) && urlHasSecret(s)) return !0;
      continue;
    }
    let index = s.indexOf("=");
    if (index !== -1) {
      if (r(s.slice(0, index), s.slice(index + 1))) return !0;
      continue;
    }
    let m = l[i + 1];
    if (m !== void 0 && !m.startsWith("-") && r(s, m)) return !0;
  }
  return n.url !== void 0 && urlHasSecret(n.url);
}
//@ chunk-hddjmtjj.js:31496-32883 placement
function convertCursorMcpServer(n, e, r, l, i = new Set()) {
  let s = (C) => (C === void 0 ? void 0 : Je(C, e)),
    c = {
      ...n,
      command: s(n.command),
      url: s(n.url),
      args: n.args?.map((C) => Je(C, e)),
      env: Et(n.env, e),
      headers: Et(n.headers, e),
    };
  if (r === "project") {
    if ([c.url, c.command, ...(c.args ?? [])].some((v) => v !== void 0 && v.includes("${")))
      return {
        refused:
          "Its url, command or args reference an environment variable; on connect Claude Code would expand it into a repo-authored command or url. Add it manually with `claude mcp add` if you trust this repo.",
      };
    let C = Object.keys(c.env ?? {}).length + Object.keys(c.headers ?? {}).length;
    return {
      config: c.url
        ? { type: Rt(c.url), url: c.url }
        : { type: "stdio", command: c.command, args: c.args ?? [] },
      placeholdered: [],
      dropped: C,
    };
  }
  if (
    [n.url, n.command, ...(n.args ?? [])].some((C) => C?.replace(et, "${$1}").includes("${workspaceFolder}"))
  )
    return {
      refused:
        "References `${workspaceFolder}` \u2014 per-workspace in Cursor, but Claude Code's user-scope MCP servers are global. Importing would pin it to this checkout and run it in every project. Add it as a project-scope server (in the specific project's .mcp.json) instead.",
    };
  let m = c.url ? { ...c, env: void 0 } : { ...c, headers: void 0 },
    f = Object.keys((c.url ? c.env : c.headers) ?? {}).length,
    { server: server, placeholdered: placeholdered } = placeholderSecrets(m, l, i);
  return {
    config: server.url
      ? { type: Rt(server.url), url: server.url, ...(server.headers && { headers: server.headers }) }
      : {
          type: "stdio",
          command: server.command,
          args: server.args ?? [],
          ...(server.env && { env: server.env }),
        },
    placeholdered: placeholdered,
    dropped: f,
  };
}
/**
 * 读取 Cursor mcp.json 并转换（读不了/结构异常时提示人工检查）。
 */
//@ chunk-hddjmtjj.js:32883-35375 placement
async function importCursorMcpServers(n, e, r, l, i, s) {
  let c;
  try {
    c = await fe(e, l, n);
  } catch (error) {
    if (isENOENT(error)) return;
    s.push({ scope: e, label: r, reason: "Could not read. Review your MCP servers there manually." });
    return;
  }
  let safeParse = CURSOR_MCP_FILE_SCHEMA().safeParse(parseJsonc(c));
  if (!safeParse.success) {
    s.push({
      scope: e,
      label: r,
      reason: "Could not parse (unexpected structure). Review your MCP servers there manually.",
    });
    return;
  }
  let f = e === "project" ? "." : l,
    h = describeUnexpectedTableShape(
      safeParse.data.mcpServers,
      "mcpServers",
      e,
      s,
      `Has an unexpected shape in ${r} (expected an object of named entries). Review it manually.`,
    ),
    entries = Object.entries(h);
  if (entries.length > MAX_CURSOR_ITEMS)
    s.push({
      scope: e,
      label: r,
      reason: "Has more MCP servers than the import scans. Review the remaining servers manually.",
    });
  let w = new Set();
  for (let [C, y] of entries.slice(0, MAX_CURSOR_ITEMS)) {
    let safeParse = CURSOR_MCP_SERVER_SCHEMA().safeParse(y);
    if (!safeParse.success) {
      s.push({
        scope: e,
        label: `MCP server "${C}"`,
        reason: `Entry in ${r} has an unexpected shape. Review it manually.`,
      });
      continue;
    }
    let b = safeParse.data;
    if (!b.url && !b.command) {
      s.push({
        scope: e,
        label: `MCP server "${C}"`,
        reason: "Has neither a url nor a command \u2014 nothing to import. Review it manually.",
      });
      continue;
    }
    let S = sanitizeImportName(C),
      x = convertCursorMcpServer(b, f, e, C, w);
    if ("refused" in x) {
      s.push({ scope: e, label: `MCP server "${C}"`, reason: x.refused });
      continue;
    }
    let { config: config, placeholdered: placeholdered, dropped: dropped } = x,
      _ =
        e === "project"
          ? "Repo-authored MCP server \u2014 connecting runs its command or sends requests to its url. Only import if you trust this repo."
          : serverHasInlineSecret(b)
            ? `Its url or args look like they carry a literal credential, which /import copies as-is into your Claude Code config. Move the value into an environment variable (\`\${env:VAR}\`) in ${r} first, or add the server manually with \`claude mcp add\`.`
            : void 0,
      H =
        (placeholdered.length > 0
          ? ` \u2014 set ${plural(placeholdered.length, "env var")} ${placeholdered.join(", ")} (literal ${plural(placeholdered.length, "value")} in ${r} not copied)`
          : "") +
        (dropped > 0
          ? ` \u2014 ${dropped} ${plural(dropped, "env/header entry", "env/header entries")} dropped (see ${r}); re-add auth manually if needed`
          : "");
    i.push({
      id: `cursor:${e}:mcp:${C}`,
      kind: "mcp",
      scope: e,
      label: `MCP server "${C}"`,
      description: b.url ?? b.command,
      fingerprint: JSON.stringify(config),
      ...(_ && { warning: _ }),
      async apply({ dryRun: T, storageV5: K }) {
        let q = e === "user" ? "user" : "project";
        if (q === "project" && (await pinPathInside(l, join_4(l, ".mcp.json"))) === null)
          return {
            skipped: `${S}: .mcp.json is (or is under) a symlink \u2014 refusing project-scope write`,
          };
        if (
          q === "user"
            ? userScopeMcpServerExists(S)
            : (await Yg(l, readRawMcpJsonServersFromCwd))[S] !== void 0
        )
          return { skipped: `${S}: MCP server already exists in ${q} config` };
        if (T) return `would add MCP server ${S} (${q})${H}`;
        return (
          await (q === "project"
            ? Yg(l, () => addMcpConfig(S, config, q, K))
            : addMcpConfig(S, config, q, K)),
          `added MCP server ${S} (${q})${H}`
        );
      },
    });
  }
}
//@ chunk-hddjmtjj.js:35375-35391 placement
var Dn = 4,
  Hn = 200;
/**
 * 递归收集 .mdc 规则文件（深度与数量上限）。
 */
//@ chunk-hddjmtjj.js:35391-35749 placement
async function walkRuleFiles(n, e, r, l, i) {
  let sorted = (await readdir(n, { withFileTypes: !0 }).catch(() => [])).sort((c, m) =>
    c.name.localeCompare(m.name),
  );
  for (let c of sorted) {
    let m = e === "" ? c.name : `${e}/${c.name}`;
    if (c.isFile() && c.name.endsWith(".mdc")) {
      if (l.length >= Hn) {
        i.truncated = !0;
        return;
      }
      l.push(m);
    } else if (c.isDirectory()) {
      if (r >= Dn) {
        i.truncated = !0;
        continue;
      }
      await walkRuleFiles(join_4(n, c.name), m, r + 1, l, i);
    }
  }
}
/**
 * 列出规则目录下的 .mdc 文件（排序），并标记是否截断。
 */
//@ chunk-hddjmtjj.js:35749-35865 placement
async function listRuleFiles(n) {
  let e = [],
    r = { truncated: !1 };
  return (await walkRuleFiles(n, "", 0, e, r), e.sort(), { files: e, truncated: r.truncated });
}
/**
 * 定位正文中 shell 执行标记所在行。
 */
//@ chunk-hddjmtjj.js:35865-36035 placement
function locateShellExecLine(n, e) {
  let parts = n.split(`
`),
    index = parts.findIndex((i) => ie(i));
  if (index === -1) index = parts.findIndex((i) => i.includes("```!") || i.includes("!`"));
  return { line: e + index + 1, text: parts[index]?.trim() ?? "" };
}
//@ chunk-hddjmtjj.js:36035-36096 placement
function Ht(n, e) {
  return countCharInString(
    n.slice(0, n.length - e.length),
    `
`,
  );
}
//@ chunk-hddjmtjj.js:36096-36395 placement
function describeShellExecLine(n, e) {
  let { line: line, text: text } = locateShellExecLine(n, e);
  return {
    description: `\u26A0 line ${line}: ${truncateCodePoints(text, 80)}`,
    warning: `Line ${line} has a Claude Code shell-exec marker (\`\`\`! or !\`\u2026\`), inert in Cursor but run when the skill loads; if imported it is written escaped, so nothing runs \u2014 review the file.`,
  };
}
/**
 * Cursor 规则映射为 Claude Code 规则/技能时的说明文本。
 */
//@ chunk-hddjmtjj.js:36395-36922 placement
var NAME_COLLISION_NOTE =
    "Its filesystem-safe name collides with another imported rule, skill or command that targets the same path. Rename one of them and re-run the import.",
  Wn =
    "Becomes a Claude Code skill: its description is always in context, and once Claude loads it the body stays in context for the rest of the session. Unchecked by default; review before importing.",
  Bn =
    "Becomes a Claude Code skill you run with /<name>; once loaded, the body stays in context for the rest of the session. Unchecked by default; review before importing.";
/**
 * 第一行非空文本（去掉 #），截断到 200 字符。
 */
//@ chunk-hddjmtjj.js:36922-37049 placement
function firstHeadingText(n) {
  let found = n
    .split(
      `
`,
    )
    .map((r) => r.replace(/^#+\s*/, "").trim())
    .find((r) => r !== "");
  return found === void 0 ? void 0 : truncateCodePoints(found, 200);
}
//@ chunk-hddjmtjj.js:37049-37514 placement
async function planWriteTarget({
  target: target,
  existing: existing,
  out: out,
  safeName: safeName,
  dryRun: dryRun,
  containIn: containIn,
}) {
  if (containIn && (await pinPathInside(containIn, target)) === null)
    return { skipped: `${safeName}: target is under a symlink \u2014 refusing project-scope write` };
  if (await R(existing)) return { skipped: `${safeName}: \`${existing}\` already exists` };
  if (dryRun) return `would write \`${target}\``;
  if (containIn && me()) {
    if (!(await safeWriteFile(containIn, target, out)))
      return { skipped: `${safeName}: \`${target}\` already exists` };
    return `wrote \`${target}\``;
  }
  return (
    await mkdir(dirname_3(target), { recursive: !0 }),
    await writeFile(target, out, "utf8"),
    `wrote \`${target}\``
  );
}
/**
 * 导入 Cursor rules：按 alwaysApply/globs/描述映射为 CLAUDE.md、规则或技能（数量/大小上限）。
 */
//@ chunk-hddjmtjj.js:37514-40607 placement
async function importCursorRules({
  rulesDir: rulesDir,
  scope: scope,
  projectRoot: projectRoot,
  claudeMd: claudeMd,
  rulesOut: rulesOut,
  skillsOut: skillsOut,
  sourceLabel: sourceLabel,
  claimedTargets: claimedTargets,
  items: items,
  unmappable: unmappable,
}) {
  let g = scope === "project" ? projectRoot : void 0,
    { files: files, truncated: truncated } = await listRuleFiles(rulesDir);
  if (truncated)
    unmappable.push({
      scope: scope,
      label: `${sourceLabel}/`,
      reason:
        "Has more rule files, or deeper folders, than the import scans. Review the remaining rules manually.",
    });
  for (let y of files) {
    let v = join_4(rulesDir, ...y.split("/")),
      b = `${sourceLabel}/${y}`,
      S;
    try {
      if ((await lstat(v)).size > By) {
        unmappable.push({
          scope: scope,
          label: b,
          reason:
            "Is larger than the 1 MB Claude Code loads for a skill or rule. Trim it and re-run, or port it manually.",
        });
        continue;
      }
      S = await fe(scope, projectRoot, v);
    } catch {
      unmappable.push({ scope: scope, label: b, reason: "Could not read. Review it manually." });
      continue;
    }
    S = S.replaceAll(
      `\r
`,
      `
`,
    );
    let { frontmatter: frontmatter, content: content, parseError: parseError } = parseFrontmatter(S);
    if (parseError !== void 0) {
      unmappable.push({
        scope: scope,
        label: b,
        reason:
          "Its frontmatter is not valid YAML, so its activation mode is unknown. Fix the frontmatter and re-run, or port it manually.",
      });
      continue;
    }
    let safeParse = CURSOR_RULE_FRONTMATTER_SCHEMA().safeParse(frontmatter),
      _ = safeParse.success ? safeParse.data : {},
      H = _.description?.trim() || void 0,
      filtered = (Array.isArray(_.globs) ? _.globs : [_.globs ?? ""])
        .map((B) => B.trim())
        .filter((B) => B !== ""),
      sliced = y.slice(0, -4),
      mapped = sliced.split("/").map(sanitizeImportName),
      joined = mapped.join("_"),
      ge = `cursor:${scope}:rule:${sliced}`,
      tt = H
        ? `# ${H.replace(/\s+/g, " ")}

`
        : "";
    if (parseBooleanishFrontmatter(_.alwaysApply) === !0) {
      let B = `${tt}${content.trimEnd()}
`;
      items.push({
        id: ge,
        kind: "instructions",
        scope: scope,
        label: `Rule "${sliced}" (always applied)`,
        description: H,
        fingerprint: B,
        apply: ({ dryRun: dryRun }) => appendImportedInstructions(claudeMd, v, B, On(ge), dryRun, g),
      });
      continue;
    }
    if (filtered.length > 0) {
      let B = join_4(rulesOut, ...mapped) + ".md";
      if (claimedTargets.has(B)) {
        unmappable.push({ scope: scope, label: b, reason: NAME_COLLISION_NOTE });
        continue;
      }
      claimedTargets.add(B);
      let mapped_2 = filtered.map(ce),
        ot = `---
${fwe({ paths: mapped_2.length === 1 ? mapped_2[0] : mapped_2 })}---

${tt}${content.trimEnd()}
`,
        st = unwrapResults(filtered).length;
      items.push({
        id: ge,
        kind: "instructions",
        scope: scope,
        label: `Rule "${sliced}" (scoped to ${st} path ${plural(st, "pattern")})`,
        description: H ?? `\u2192 ${B}`,
        fingerprint: ot,
        apply: ({ dryRun: dryRun }) =>
          planWriteTarget({
            target: B,
            existing: B,
            out: ot,
            safeName: joined,
            dryRun: dryRun,
            containIn: g,
          }),
      });
      continue;
    }
    let We = H === void 0,
      Re = join_4(skillsOut, joined);
    if (claimedTargets.has(Re)) {
      unmappable.push({ scope: scope, label: b, reason: NAME_COLLISION_NOTE });
      continue;
    }
    if (f3(joined)) {
      unmappable.push({
        scope: scope,
        label: b,
        reason:
          "Its name is the skills directory name Claude Code reserves for synced skills, so the skill would never load. Rename the rule and re-run the import.",
      });
      continue;
    }
    let nt = findShellExecHazard(content, []);
    if (nt !== null) {
      unmappable.push({ scope: scope, label: b, reason: nt });
      continue;
    }
    let Se = ie(content) ? describeShellExecLine(content, Ht(S, content)) : null,
      Zt = H ?? firstHeadingText(content) ?? `Imported Cursor rule ${sliced} (manual)`,
      Be = `---
${fwe({ name: joined, description: ce(Zt), ...(We && { "disable-model-invocation": !0 }) })}---

${(Se ? xM(content) : content).trimEnd()}
`;
    if (Buffer.byteLength(Be, "utf8") > By) {
      unmappable.push({
        scope: scope,
        label: b,
        reason:
          "Is larger than the 1 MB Claude Code loads for a skill or rule. Trim it and re-run, or port it manually.",
      });
      continue;
    }
    claimedTargets.add(Re);
    let rt = join_4(Re, "SKILL.md"),
      it = We ? Bn : Wn;
    items.push({
      id: ge,
      kind: "skill",
      scope: scope,
      label: `Rule "${sliced}" (${We ? "manual" : "agent-requested"} \u2192 skill)`,
      description: Se ? Se.description : `\u2192 ${rt}`,
      fingerprint: Be,
      warning: Se ? `${Se.warning} ${it}` : it,
      async apply({ dryRun: B }) {
        let se = await planWriteTarget({
          target: rt,
          existing: Re,
          out: Be,
          safeName: joined,
          dryRun: B,
          containIn: g,
        });
        return typeof se === "string" && Se ? `${se} \u2014 shell-exec marker escaped to plain text` : se;
      },
    });
  }
}
/**
 * 技能目录扫描深度/数量上限与允许的 frontmatter 键。
 */
//@ chunk-hddjmtjj.js:40607-40798 placement
var MAX_SKILL_DEPTH = 3,
  MAX_SKILLS = 100,
  ALLOWED_SKILL_FRONTMATTER_KEYS = new Set([
    "description",
    "paths",
    "disable-model-invocation",
    "user-invocable",
    "argument-hint",
    "when_to_use",
    "version",
    "license",
    "compatibility",
  ]),
  DROPPED_SKILL_FRONTMATTER_KEYS = new Set(["icon", "color"]);
/**
 * frontmatter 值标准化（字符串、布尔、数字、字符串数组）。
 */
//@ chunk-hddjmtjj.js:40798-41001 placement
function normalizeFrontmatterValue(n) {
  if (typeof n === "string") return ce(n);
  if (typeof n === "boolean") return n;
  if (typeof n === "number") return String(n);
  if (Array.isArray(n) && n.every((e) => typeof e === "string")) return n.map(ce);
  return;
}
//@ chunk-hddjmtjj.js:41001-41690 placement
function parseSkillFrontmatter(n, e, r) {
  n = n.replaceAll(
    `\r
`,
    `
`,
  );
  let { frontmatter: frontmatter, content: content, parseError: parseError } = parseFrontmatter(n);
  if (parseError !== void 0)
    return {
      ok: !1,
      reason:
        "Its SKILL.md frontmatter is not valid YAML. Fix the frontmatter and re-run, or copy the skill manually.",
    };
  let c = r ? xM(content) : content;
  if (content === n)
    return {
      ok: !0,
      out: `${c.trimEnd()}
`,
      body: content,
      dropped: [],
    };
  let m = {},
    f = [];
  for (let [w, C] of Object.entries(frontmatter)) {
    if (DROPPED_SKILL_FRONTMATTER_KEYS.has(w)) continue;
    if (w === "name") {
      m.name = e;
      continue;
    }
    let y = w === "globs" && !("paths" in frontmatter) ? "paths" : w,
      v = ALLOWED_SKILL_FRONTMATTER_KEYS.has(y) ? normalizeFrontmatterValue(C) : void 0;
    if (v === void 0) {
      f.push(w);
      continue;
    }
    m[y] = v;
  }
  let h =
      Object.keys(m).length > 0
        ? `---
${fwe(m)}---
`
        : "",
    g =
      h === "" && c.trimStart().startsWith("---")
        ? `
`
        : "";
  return {
    ok: !0,
    out: `${h}${g}${c.trimEnd()}
`,
    body: content,
    dropped: f,
  };
}
/**
 * 递归找含 SKILL.md 的目录（深度与数量上限）。
 */
//@ chunk-hddjmtjj.js:41690-42016 placement
async function walkSkillDirs(n, e, r, l) {
  let sorted = (await readdir(n, { withFileTypes: !0 }).catch(() => [])).sort((s, c) =>
    s.name.localeCompare(c.name),
  );
  for (let s of sorted) {
    if (!s.isDirectory()) continue;
    let c = join_4(n, s.name);
    if (await R(join_4(c, "SKILL.md"))) {
      if (r.length >= MAX_SKILLS) {
        l.truncated = !0;
        return;
      }
      r.push(c);
      continue;
    }
    if (e >= MAX_SKILL_DEPTH) {
      l.truncated = !0;
      continue;
    }
    await walkSkillDirs(c, e + 1, r, l);
  }
}
//@ chunk-hddjmtjj.js:42016-42278 placement
var SKILL_COPY_NOTE =
  "Skill directories are copied as-is \u2014 bundled scripts and body instructions become active in Claude Code, and once Claude loads the skill it stays in context for the session. Unchecked by default; review SKILL.md and its directory before importing.";
/**
 * 导入 Cursor skills 目录（数量/深度上限、SKILL.md 非普通文件时提示）。
 */
//@ chunk-hddjmtjj.js:42278-44545 placement
async function importCursorSkills({
  root: root,
  scope: scope,
  projectRoot: projectRoot,
  skillsOut: skillsOut,
  sourceLabel: sourceLabel,
  claimedTargets: claimedTargets,
  items: items,
  unmappable: unmappable,
}) {
  let f = [],
    h = { truncated: !1 };
  if ((await walkSkillDirs(root, 0, f, h), h.truncated))
    unmappable.push({
      scope: scope,
      label: `${sourceLabel}/`,
      reason:
        "Has more skills, or deeper folders, than the import scans. Review the remaining skills manually.",
    });
  f.sort();
  for (let g of f) {
    let joined = relative_2(root, g).split(sep_2).join("/"),
      C = `${sourceLabel}/${joined}`,
      y = sanitizeImportName(basename_3(g)),
      v = join_4(skillsOut, y);
    if (claimedTargets.has(v)) {
      unmappable.push({ scope: scope, label: C, reason: NAME_COLLISION_NOTE });
      continue;
    }
    let b = join_4(g, "SKILL.md"),
      S;
    try {
      S = await lstat(b);
    } catch {
      S = null;
    }
    if (S === null || !S.isFile()) {
      unmappable.push({
        scope: scope,
        label: C,
        reason: "Its SKILL.md is not a regular file (a symlink?). Copy the skill manually.",
      });
      continue;
    }
    if (S.size > By) {
      unmappable.push({
        scope: scope,
        label: C,
        reason:
          "Its SKILL.md is larger than the 1 MB Claude Code loads for a skill. Trim it and re-run, or copy the skill manually.",
      });
      continue;
    }
    let x;
    try {
      x = await fe(scope, projectRoot, b);
    } catch {
      unmappable.push({ scope: scope, label: C, reason: "Could not read. Review it manually." });
      continue;
    }
    x = x.replaceAll(
      `\r
`,
      `
`,
    );
    let j = parseSkillFrontmatter(x, y, !1);
    if (!j.ok) {
      unmappable.push({ scope: scope, label: C, reason: j.reason });
      continue;
    }
    let D = findShellExecHazard(j.body, []);
    if (D !== null) {
      unmappable.push({ scope: scope, label: C, reason: D });
      continue;
    }
    let U = ie(j.body) ? describeShellExecLine(j.body, Ht(x, j.body)) : null;
    claimedTargets.add(v);
    let _ =
      j.dropped.length > 0
        ? `dropped ${j.dropped.length} ${plural(j.dropped.length, "frontmatter key")}${scope === "user" ? ` (${j.dropped.join(", ")})` : ""} that Claude Code does not share with Cursor`
        : "";
    items.push({
      id: `cursor:${scope}:skill:${joined}`,
      kind: "skill",
      scope: scope,
      label: `Skill "${y}"`,
      description: U ? U.description : `\u2192 ${v}`,
      fingerprint: JSON.stringify([joined, j.out]),
      warning: [
        ...(U ? [U.warning] : []),
        SKILL_COPY_NOTE,
        ...(_ ? [`${_[0].toUpperCase()}${_.slice(1)}.`] : []),
      ].join(" "),
      async apply({ dryRun: H }) {
        let T = scope === "project" ? await pinPathInside(projectRoot, g) : await resolveInsideReal(root, g);
        if (T === null) return { skipped: `${y}: path escapes \`${root}\` (symlink) or is missing` };
        let K = await importSkillDirectory({
          name: y,
          real: T,
          targetDir: v,
          scope: scope,
          projectRoot: projectRoot,
          dryRun: H,
          prepareSkillMd(q) {
            let Z = parseSkillFrontmatter(q, y, U !== null);
            if (!Z.ok) return { skipped: `${y}: ${Z.reason}` };
            let ge = findShellExecHazard(Z.body, []);
            if (ge !== null) return { skipped: `${y}: ${ge}` };
            if (U === null && ie(Z.body))
              return {
                skipped: `${y}: SKILL.md gained a shell-exec marker since the scan \u2014 re-run /import to review it`,
              };
            return Z.out;
          },
        });
        return typeof K === "string"
          ? `${K}${U ? " \u2014 shell-exec marker escaped to plain text" : ""}${_ ? ` \u2014 ${_}` : ""}`
          : K;
      },
    });
  }
}
//@ chunk-hddjmtjj.js:44545-44556 placement
var Nt = 200;
//@ chunk-hddjmtjj.js:44556-46432 placement
async function importCursorCommands({
  dir: dir,
  scope: scope,
  projectRoot: projectRoot,
  sourceLabel: sourceLabel,
  claimedTargets: claimedTargets,
  items: items,
  unmappable: unmappable,
}) {
  let sorted = (await readdir(dir, { withFileTypes: !0 }).catch(() => []))
    .filter((h) => h.isFile() && h.name.endsWith(".md"))
    .sort((h, g) => h.name.localeCompare(g.name));
  if (sorted.length > Nt)
    unmappable.push({
      scope: scope,
      label: `${sourceLabel}/`,
      reason: "Has more command files than the import scans. Review the remaining commands manually.",
    });
  let f = getClaudeConfigDir();
  for (let h of sorted.slice(0, Nt)) {
    let g = join_4(dir, h.name),
      w = basename_3(h.name, ".md"),
      C = sanitizeImportName(w),
      y =
        scope === "user"
          ? join_4(f, "commands", `${C}.md`)
          : join_4(projectRoot, ".claude", "commands", `${C}.md`);
    if (claimedTargets.has(y)) {
      unmappable.push({ scope: scope, label: `Command /${w}`, reason: NAME_COLLISION_NOTE });
      continue;
    }
    let v;
    try {
      if ((await lstat(g)).size > By) {
        unmappable.push({
          scope: scope,
          label: `Command /${w}`,
          reason:
            "Is larger than the 1 MB Claude Code loads for a command. Trim it and re-run, or port it manually.",
        });
        continue;
      }
      v = await fe(scope, projectRoot, g);
    } catch {
      unmappable.push({
        scope: scope,
        label: `Command /${w}`,
        reason: "Could not read. Review it manually.",
      });
      continue;
    }
    if (ie(v)) {
      unmappable.push({
        scope: scope,
        label: `Command /${w}`,
        reason:
          "Contains a `` !`\u2026` `` or ```! shell-exec marker (inert in Cursor, live in Claude Code). Port it manually.",
      });
      continue;
    }
    let b = findShellExecHazard(v, []);
    if (b !== null) {
      unmappable.push({ scope: scope, label: `Command /${w}`, reason: b });
      continue;
    }
    (claimedTargets.add(y),
      items.push({
        id: `cursor:${scope}:command:${w}`,
        kind: "command",
        scope: scope,
        label: `Command /${w}`,
        description: `\u2192 ${y}`,
        fingerprint: v,
        async apply({ dryRun: S }) {
          if (scope === "project" && (await pinPathInside(projectRoot, y)) === null)
            return { skipped: `${C}: target is under a symlink \u2014 refusing project-scope write` };
          if (await R(y)) return { skipped: `${C}: \`${y}\` already exists` };
          if (S) return `would copy \`${g}\` \u2192 \`${y}\``;
          let x = v.trimStart().startsWith("---")
            ? `
`
            : "";
          if (scope === "project" && me()) {
            if (
              !(await safeWriteFile(
                projectRoot,
                y,
                `${x}${v.trimEnd()}
`,
              ))
            )
              return { skipped: `${C}: \`${y}\` already exists` };
            return `copied \u2192 \`${y}\``;
          }
          return (
            await mkdir(dirname_3(y), { recursive: !0 }),
            await writeFile(
              y,
              `${x}${v.trimEnd()}
`,
              "utf8",
            ),
            `copied \u2192 \`${y}\``
          );
        },
      }));
  }
}
//@ chunk-hddjmtjj.js:46432-46839 placement
var CURSOR_HOOK_EVENTS = {
  beforeShellExecution: "PreToolUse",
  afterShellExecution: "PostToolUse",
  beforeMCPExecution: "PreToolUse",
  afterMCPExecution: "PostToolUse",
  beforeReadFile: "PreToolUse",
  afterFileEdit: "PostToolUse",
  beforeSubmitPrompt: "UserPromptSubmit",
  preToolUse: "PreToolUse",
  postToolUse: "PostToolUse",
  sessionStart: "SessionStart",
  sessionEnd: "SessionEnd",
  subagentStart: "SubagentStart",
  subagentStop: "SubagentStop",
  stop: "Stop",
};
/**
 * 导入 Cursor hooks（读不了、结构异常时提示人工重加）。
 */
//@ chunk-hddjmtjj.js:46839-47907 placement
async function importCursorHooks(n, e, r, l, i) {
  let s;
  try {
    s = await fe(e, l, n);
  } catch (error) {
    if (isENOENT(error)) return;
    i.push({ scope: e, label: r, reason: "Could not read. Review your hooks there manually." });
    return;
  }
  let safeParse = CURSOR_HOOKS_FILE_SCHEMA().safeParse(parseJsonc(s));
  if (!safeParse.success) {
    i.push({
      scope: e,
      label: r,
      reason:
        "Could not parse (unexpected structure). Re-add any hooks you need under the `hooks` key in settings.json.",
    });
    return;
  }
  let m = describeUnexpectedTableShape(
      safeParse.data.hooks,
      r,
      e,
      i,
      "Has an unexpected shape (expected a `hooks` object keyed by event). Re-add any hooks you need under the `hooks` key in settings.json.",
    ),
    keys = Object.keys(m);
  if (keys.length > MAX_CURSOR_ITEMS)
    i.push({
      scope: e,
      label: r,
      reason: "Has more hook events than the import scans. Review the remaining hooks manually.",
    });
  for (let h of keys.slice(0, MAX_CURSOR_ITEMS)) {
    let g = CURSOR_HOOK_EVENTS[h];
    i.push({
      scope: e,
      label: `${r}: ${h}${g ? ` \u2192 ${g}` : ""}`,
      reason: g
        ? "Hook scripts are not translated (event payloads and exit-code contracts differ). Re-add it under the Claude Code event named here, via the `hooks` key in settings.json."
        : "No matching Claude Code hook event. See the `hooks` key in settings.json for the events Claude Code offers.",
    });
  }
}
//@ chunk-hddjmtjj.js:47907-49126 placement
async function importCursorIgnore(n, e, r, l, i) {
  let s = l ? "user" : "project";
  if (r !== "user" && (await R(join_4(e, ".cursorignore"))))
    i.push({
      scope: s,
      label: ".cursorignore",
      reason:
        "Claude Code has no direct equivalent. If you need to exclude paths, add Read/Glob deny rules under `permissions` in settings.json.",
    });
  if (r !== "user" && (await R(join_4(e, ".cursorindexingignore"))))
    i.push({
      scope: s,
      label: ".cursorindexingignore",
      reason: "Claude Code has no codebase index; nothing to configure.",
    });
  if (r !== "project" && (await R(n)))
    i.push(
      {
        scope: "user",
        label: "Cursor User Rules",
        reason:
          "Stored in Cursor Settings \u2192 Rules, not on disk. Paste the ones you want into ~/.claude/CLAUDE.md (your user-level memory file).",
      },
      {
        scope: "user",
        label: "Cursor Team Rules",
        reason:
          "Managed in the Cursor dashboard, not on disk. The Claude Code equivalents are an organization-wide CLAUDE.md or managed settings.",
      },
      {
        scope: "user",
        label: "Cursor Memories",
        reason:
          "Stored in Cursor app-data with no file-based export. Open Cursor \u2192 Settings \u2192 Rules & Memories and copy anything you need into CLAUDE.md.",
      },
      {
        scope: "user",
        label: "Cursor Custom Modes",
        reason:
          "UI state backed by a skill, with no Claude Code equivalent; run the imported skill with /<name> when you want it in context.",
      },
    );
}
/**
 * Cursor 导入源定义：检测与扫描各类配置。
 */
//@ chunk-hddjmtjj.js:49126-53365 placement
var CURSOR_IMPORT_SOURCE = {
  id: "cursor",
  displayName: "Cursor",
  async detect(n) {
    let e = Pt(n),
      r = n.cwd ?? getOriginalCwd();
    if (n.homeDir === void 0 && ne()) return !0;
    return (
      (await R(join_4(e, "mcp.json"))) ||
      (await R(join_4(e, "commands"))) ||
      (await R(join_4(e, "rules"))) ||
      (await R(join_4(e, "skills"))) ||
      (await R(join_4(r, ".cursorrules"))) ||
      (await R(join_4(r, ".cursor")))
    );
  },
  async scan(n) {
    let e = Pt(n),
      r = n.cwd ?? getOriginalCwd(),
      l = getClaudeConfigDir(),
      i = [],
      s = [],
      c =
        (n.homeDir === void 0 && ne()) ||
        (process.env.CLAUDE_CONFIG_DIR !== void 0 && (ue(l) || (await isOutsideDirectory(l, r))));
    if (c)
      s.push({
        scope: "user",
        label: "Cursor user-scope config",
        reason:
          "The user-scope read or write root has been redirected (resolves inside this project, to a network path, or away from the real home directory) \u2014 skipping user-scope scan for safety.",
      });
    let m = c ? "project" : n.scope;
    if (m !== "project") {
      let h = new Set();
      (await importCursorMcpServers(join_4(e, "mcp.json"), "user", "~/.cursor/mcp.json", r, i, s),
        await importCursorCommands({
          dir: join_4(e, "commands"),
          scope: "user",
          projectRoot: r,
          sourceLabel: "~/.cursor/commands",
          claimedTargets: h,
          items: i,
          unmappable: s,
        }),
        await importCursorRules({
          rulesDir: join_4(e, "rules"),
          scope: "user",
          projectRoot: r,
          claudeMd: join_4(l, "CLAUDE.md"),
          rulesOut: join_4(l, "rules"),
          skillsOut: join_4(l, "skills"),
          sourceLabel: "~/.cursor/rules",
          claimedTargets: h,
          items: i,
          unmappable: s,
        }));
      for (let [g, w] of [
        [join_4(e, "skills"), "~/.cursor/skills"],
        [Ln(e), "~/.agents/skills"],
      ])
        await importCursorSkills({
          root: g,
          scope: "user",
          projectRoot: r,
          skillsOut: join_4(l, "skills"),
          sourceLabel: w,
          claimedTargets: h,
          items: i,
          unmappable: s,
        });
      await importCursorHooks(join_4(e, "hooks.json"), "user", "~/.cursor/hooks.json", r, s);
    }
    let f = join_4(r, ".cursor") === e;
    if (m !== "user" && f) {
      if (await R(join_4(r, ".cursorrules")))
        s.push({
          scope: "user",
          label: "~/.cursorrules",
          reason:
            "At $HOME this is user-scope. Not yet auto-imported; append it to ~/.claude/CLAUDE.md (your user-level memory file).",
        });
    }
    if (m !== "user" && !f) {
      let h = new Set(),
        g = join_4(r, ".cursorrules");
      if (await R(g))
        i.push({
          id: "cursor:project:cursorrules",
          kind: "instructions",
          scope: "project",
          label: ".cursorrules",
          fingerprint: g,
          apply: ({ dryRun: dryRun }) =>
            appendImportedInstructions(
              join_4(r, "CLAUDE.md"),
              g,
              void 0,
              "cursor:project:cursorrules",
              dryRun,
              r,
            ),
        });
      let w = join_4(r, ".cursor");
      if ((await pinPathInside(r, w)) === null) {
        if (await R(w))
          s.push({
            scope: "project",
            label: ".cursor/",
            reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
          });
      } else {
        let v = join_4(w, "rules");
        if ((await pinPathInside(r, v)) !== null)
          await importCursorRules({
            rulesDir: v,
            scope: "project",
            projectRoot: r,
            claudeMd: join_4(r, "CLAUDE.md"),
            rulesOut: join_4(r, ".claude", "rules"),
            skillsOut: join_4(r, ".claude", "skills"),
            sourceLabel: ".cursor/rules",
            claimedTargets: h,
            items: i,
            unmappable: s,
          });
        else if (await R(v))
          s.push({
            scope: "project",
            label: ".cursor/rules/",
            reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
          });
        let b = join_4(w, "mcp.json");
        if ((await pinPathInside(r, b)) !== null)
          await importCursorMcpServers(b, "project", ".cursor/mcp.json", r, i, s);
        else if (await R(b))
          s.push({
            scope: "project",
            label: ".cursor/mcp.json",
            reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
          });
        let S = join_4(w, "commands");
        if ((await pinPathInside(r, S)) !== null)
          await importCursorCommands({
            dir: S,
            scope: "project",
            projectRoot: r,
            sourceLabel: ".cursor/commands",
            claimedTargets: h,
            items: i,
            unmappable: s,
          });
        else if (await R(S))
          s.push({
            scope: "project",
            label: ".cursor/commands/",
            reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
          });
        let x = join_4(w, "skills");
        if ((await pinPathInside(r, x)) !== null)
          await importCursorSkills({
            root: x,
            scope: "project",
            projectRoot: r,
            skillsOut: join_4(r, ".claude", "skills"),
            sourceLabel: ".cursor/skills",
            claimedTargets: h,
            items: i,
            unmappable: s,
          });
        else if (await R(x))
          s.push({
            scope: "project",
            label: ".cursor/skills/",
            reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
          });
        let j = join_4(w, "hooks.json");
        if ((await pinPathInside(r, j)) !== null)
          await importCursorHooks(j, "project", ".cursor/hooks.json", r, s);
        else if (await R(j))
          s.push({
            scope: "project",
            label: ".cursor/hooks.json",
            reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
          });
      }
      let C = join_4(r, ".agents"),
        y = join_4(C, "skills");
      if ((await pinPathInside(r, C)) === null) {
        if (await R(C))
          s.push({
            scope: "project",
            label: ".agents/",
            reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
          });
      } else if ((await pinPathInside(r, y)) !== null)
        await importCursorSkills({
          root: y,
          scope: "project",
          projectRoot: r,
          skillsOut: join_4(r, ".claude", "skills"),
          sourceLabel: ".agents/skills",
          claimedTargets: h,
          items: i,
          unmappable: s,
        });
      else if (await R(y))
        s.push({
          scope: "project",
          label: ".agents/skills/",
          reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
        });
    }
    return (await importCursorIgnore(e, r, m, f, s), { items: i, unmappable: s });
  },
};

export { CURSOR_IMPORT_SOURCE };
