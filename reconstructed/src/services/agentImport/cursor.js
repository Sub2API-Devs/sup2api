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
import { join, dirname, relative, sep, basename } from "path";
import { homedir } from "os";
import { readdir, mkdir, writeFile, lstat } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, array, record, unknown, union } from "../../../vendor/zod/v4/classic/schemas.js";
import { firstLineOf, plural, countCharInString, truncateCodePoints } from "../../utils/stringUtils.js";
import {
  readImportFileChecked,
  describeUnexpectedTableShape,
  sanitizeImportName,
  pinPathInside,
  hasShellExecBlock,
  pathExists,
  isEagerLighthouseEnabled,
  appendImportedInstructions,
  collapseDashes,
  findShellExecHazard,
  resolveInsideReal,
  isHomeDirMismatch,
  toFsSafeName,
  isOutsideDirectory,
} from "./importSafety.js";
import { isENOENT } from "../../utils/errors.js";
import { parseJsonc } from "../../utils/json.js";
import { userScopeMcpServerExists, readRawMcpJsonServersFromCwd, addMcpConfig } from "../mcp/config.js";
import { runInRemoteCallFrameMain } from "../../remote/remoteMode.js";
import { safeWriteFile } from "../../skills/bundledSkills.js";
import { MAX_SCOPE_RESPONSE_BYTES } from "../plugins/accountSync/pluginsScopeGate.js";
import {
  parseFrontmatter,
  parseBooleanishFrontmatter,
  serializeFrontmatter,
} from "../../utils/frontmatterParser.js";
import { unwrapResults } from "../../utils/suggestions/slackChannelSuggestions.js";
import { isSyncedDirName } from "../../utils/plugins/syncedItems.js";
import { escapeShellBangs } from "../../utils/promptShellExecution.js";
import { importSkillDirectory } from "./codex.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { getOriginalCwd } from "../../bootstrap/state.js";

//@ chunk-hddjmtjj.js:29064-29456 placement
/**
 * Cursor 导入的 schema：MCP 服务器、mcp.json、规则 frontmatter、hooks，及上限。
 */
var CURSOR_MCP_SERVER_SCHEMA = DoctorLazy(() =>
  u({
    command: string().optional(),
    args: array(string()).optional(),
    env: record(string(), string()).optional(),
    url: string().optional(),
    headers: record(string(), string()).optional(),
  }).loose(),
);
var CURSOR_MCP_FILE_SCHEMA = DoctorLazy(() =>
  u({
    mcpServers: unknown().optional(),
  }).loose(),
);
var CURSOR_RULE_FRONTMATTER_SCHEMA = DoctorLazy(() =>
  u({
    description: string().optional().catch(undefined),
    globs: union([string(), array(string())])
      .optional()
      .catch(undefined),
    alwaysApply: unknown().optional(),
  }).loose(),
);
var CURSOR_HOOKS_FILE_SCHEMA = DoctorLazy(() =>
  u({
    hooks: unknown().optional(),
  }).loose(),
);
var MAX_CURSOR_ITEMS = 100;
//@ chunk-hddjmtjj.js:29456-29507 placement
function cursorHomeDir(n) {
  return n.homeDir ?? join(homedir(), ".cursor");
}
//@ chunk-hddjmtjj.js:29507-29557 placement
function projectAgentsSkillsDir(n) {
  return join(dirname(n), ".agents", "skills");
}
//@ chunk-hddjmtjj.js:29557-29639 placement
function escapeHtmlComment(n) {
  return n.replaceAll("-->", "\u2014>").replaceAll("<!--", "<!\u2014");
}
//@ chunk-hddjmtjj.js:29639-29684 placement
var VSCODE_ENV_PLACEHOLDER_RE = /\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g;
//@ chunk-hddjmtjj.js:29684-29765 placement
function replaceWorkspacePlaceholders(n, e) {
  return n.replace(VSCODE_ENV_PLACEHOLDER_RE, "${$1}").replaceAll("${workspaceFolder}", e);
}
//@ chunk-hddjmtjj.js:29765-29859 placement
function mapPlaceholders(n, e) {
  if (!n) return;
  let r = {};
  for (let [key, value] of Object.entries(n)) r[key] = replaceWorkspacePlaceholders(value, e);
  return r;
}
//@ chunk-hddjmtjj.js:29859-29978 placement
/**
 * ${VAR} 形式的占位符（可带认证前缀）。
 */
var ENV_PLACEHOLDER_RE = /^\$\{[A-Za-z_][A-Za-z0-9_]*(?::-)?\}$/;
var AUTH_PLACEHOLDER_RE = /^(?:(?:Bearer|Basic|Token) )?\$\{[A-Za-z_][A-Za-z0-9_]*(?::-)?\}$/i;
//@ chunk-hddjmtjj.js:29978-30038 placement
function mcpTransportType(url) {
  return /\/sse(?:$|[?#])/.test(url) ? "sse" : "http";
}
//@ chunk-hddjmtjj.js:30038-30137 placement
function sanitizeEnvKey(n) {
  return (
    n
      .replace(/[^A-Za-z0-9_]/g, "_")
      .replace(/^(?=[0-9])/, "_")
      .toUpperCase() || "_"
  );
}
//@ chunk-hddjmtjj.js:30137-30161 placement
var CURSOR_IMPORT = "CURSOR_IMPORT_";
//@ chunk-hddjmtjj.js:30161-30554 placement
/**
 * 把 MCP 服务器 env 与 headers 中的字面值替换成 ${CURSOR_IMPORT_...} 占位符，返回新配置与占位名。
 */
function placeholderSecrets(n, e, r = new Set()) {
  let l = [];
  let i = (c) => {
    let m = `${CURSOR_IMPORT}${sanitizeEnvKey(e)}_${sanitizeEnvKey(c)}`;
    let f = m;
    for (let j = 2; r.has(f); j++) f = `${m}_${j}`;
    r.add(f);
    l.push(f);
    return f;
  };
  let s = {
    ...n,
  };
  if (n.env) {
    let c = {};
    for (let [key, value] of Object.entries(n.env))
      c[key] = ENV_PLACEHOLDER_RE.test(value) ? value : `\${${i(key)}}`;
    s.env = c;
  }
  if (n.headers) {
    let c = {};
    for (let [key, value] of Object.entries(n.headers))
      c[key] = AUTH_PLACEHOLDER_RE.test(value) ? value : `\${${i(key)}}`;
    s.headers = c;
  }
  return {
    server: s,
    placeholdered: l,
  };
}
//@ chunk-hddjmtjj.js:30554-30644 placement
var SECRET_LIKE_KEY_RE = /(?:api[-_]?key|access[-_]?key|secret|token|password|passwd|auth|authorization)$/i;
//@ chunk-hddjmtjj.js:30644-30706 placement
function isNonPlaceholderValue(n) {
  return n !== "" && !AUTH_PLACEHOLDER_RE.test(n.replace(VSCODE_ENV_PLACEHOLDER_RE, "${$1}"));
}
//@ chunk-hddjmtjj.js:30706-31003 placement
/**
 * URL 的用户信息或查询参数中是否含有密钥样式的值。
 */
function urlHasSecret(n) {
  let e = /^[a-z][a-z0-9+.-]*:\/\/[^/?#@:]*:([^/?#@]*)@/i.exec(n)?.[1];
  if (e !== undefined && isNonPlaceholderValue(e)) return true;
  let r = firstLineOf(n, "#");
  let index = r.indexOf("?");
  let i = index === -1 ? "" : r.slice(index + 1);
  for (let s of i === "" ? [] : i.split("&")) {
    let index = s.indexOf("=");
    if (
      index !== -1 &&
      SECRET_LIKE_KEY_RE.test(s.slice(0, index)) &&
      isNonPlaceholderValue(s.slice(index + 1))
    )
      return true;
  }
  return false;
}
//@ chunk-hddjmtjj.js:31003-31496 placement
/**
 * MCP 服务器的参数或 URL 中是否内联了密钥。
 */
function serverHasInlineSecret(n) {
  let e = (i) => /^[a-z][a-z0-9+.-]*:\/\//i.test(i);
  let r = (i, s) => {
    if (SECRET_LIKE_KEY_RE.test(i) && isNonPlaceholderValue(s)) return true;
    let match = /^([^:\s]+)\s*:\s*(.*)$/.exec(s);
    if (match !== null && SECRET_LIKE_KEY_RE.test(match[1]) && isNonPlaceholderValue(match[2])) return true;
    return e(s) && urlHasSecret(s);
  };
  let args = n.args ?? [];
  for (let i = 0; i < args.length; i++) {
    let s = args[i];
    if (!s.startsWith("-")) {
      if (e(s) && urlHasSecret(s)) return true;
      continue;
    }
    let index = s.indexOf("=");
    if (index !== -1) {
      if (r(s.slice(0, index), s.slice(index + 1))) return true;
      continue;
    }
    let m = args[i + 1];
    if (m !== undefined && !m.startsWith("-") && r(s, m)) return true;
  }
  return n.url !== undefined && urlHasSecret(n.url);
}
//@ chunk-hddjmtjj.js:31496-32883 placement
function convertCursorMcpServer(n, e, r, l, i = new Set()) {
  let s = (C) => (C === undefined ? undefined : replaceWorkspacePlaceholders(C, e));
  let c = {
    ...n,
    command: s(n.command),
    url: s(n.url),
    args: n.args?.map((arg) => replaceWorkspacePlaceholders(arg, e)),
    env: mapPlaceholders(n.env, e),
    headers: mapPlaceholders(n.headers, e),
  };
  if (r === "project") {
    if ([c.url, c.command, ...(c.args ?? [])].some((v) => v !== undefined && v.includes("${")))
      return {
        refused:
          "Its url, command or args reference an environment variable; on connect Claude Code would expand it into a repo-authored command or url. Add it manually with `claude mcp add` if you trust this repo.",
      };
    let dropped = Object.keys(c.env ?? {}).length + Object.keys(c.headers ?? {}).length;
    return {
      config: c.url
        ? {
            type: mcpTransportType(c.url),
            url: c.url,
          }
        : {
            type: "stdio",
            command: c.command,
            args: c.args ?? [],
          },
      placeholdered: [],
      dropped,
    };
  }
  if (
    [n.url, n.command, ...(n.args ?? [])].some((C) =>
      C?.replace(VSCODE_ENV_PLACEHOLDER_RE, "${$1}").includes("${workspaceFolder}"),
    )
  )
    return {
      refused:
        "References `${workspaceFolder}` \u2014 per-workspace in Cursor, but Claude Code's user-scope MCP servers are global. Importing would pin it to this checkout and run it in every project. Add it as a project-scope server (in the specific project's .mcp.json) instead.",
    };
  let m = c.url
    ? {
        ...c,
        env: undefined,
      }
    : {
        ...c,
        headers: undefined,
      };
  let dropped = Object.keys((c.url ? c.env : c.headers) ?? {}).length;
  let { server, placeholdered } = placeholderSecrets(m, l, i);
  return {
    config: server.url
      ? {
          type: mcpTransportType(server.url),
          url: server.url,
          ...(server.headers && {
            headers: server.headers,
          }),
        }
      : {
          type: "stdio",
          command: server.command,
          args: server.args ?? [],
          ...(server.env && {
            env: server.env,
          }),
        },
    placeholdered,
    dropped,
  };
}
//@ chunk-hddjmtjj.js:32883-35375 placement
/**
 * 读取 Cursor mcp.json 并转换（读不了/结构异常时提示人工检查）。
 */
async function importCursorMcpServers(n, e, r, l, i, s) {
  let c;
  try {
    c = await readImportFileChecked(e, l, n);
  } catch (error) {
    if (isENOENT(error)) return;
    s.push({
      scope: e,
      label: r,
      reason: "Could not read. Review your MCP servers there manually.",
    });
    return;
  }
  let m = CURSOR_MCP_FILE_SCHEMA().safeParse(parseJsonc(c));
  if (!m.success) {
    s.push({
      scope: e,
      label: r,
      reason: "Could not parse (unexpected structure). Review your MCP servers there manually.",
    });
    return;
  }
  let f = e === "project" ? "." : l;
  let h = describeUnexpectedTableShape(
    m.data.mcpServers,
    "mcpServers",
    e,
    s,
    `Has an unexpected shape in ${r} (expected an object of named entries). Review it manually.`,
  );
  let entries = Object.entries(h);
  if (entries.length > MAX_CURSOR_ITEMS)
    s.push({
      scope: e,
      label: r,
      reason: "Has more MCP servers than the import scans. Review the remaining servers manually.",
    });
  let w = new Set();
  for (let [C, y] of entries.slice(0, MAX_CURSOR_ITEMS)) {
    let v = CURSOR_MCP_SERVER_SCHEMA().safeParse(y);
    if (!v.success) {
      s.push({
        scope: e,
        label: `MCP server "${C}"`,
        reason: `Entry in ${r} has an unexpected shape. Review it manually.`,
      });
      continue;
    }
    let b = v.data;
    if (!b.url && !b.command) {
      s.push({
        scope: e,
        label: `MCP server "${C}"`,
        reason: "Has neither a url nor a command \u2014 nothing to import. Review it manually.",
      });
      continue;
    }
    let S = sanitizeImportName(C);
    let x = convertCursorMcpServer(b, f, e, C, w);
    if ("refused" in x) {
      s.push({
        scope: e,
        label: `MCP server "${C}"`,
        reason: x.refused,
      });
      continue;
    }
    let { config, placeholdered, dropped } = x;
    let _ =
      e === "project"
        ? "Repo-authored MCP server \u2014 connecting runs its command or sends requests to its url. Only import if you trust this repo."
        : serverHasInlineSecret(b)
          ? `Its url or args look like they carry a literal credential, which /import copies as-is into your Claude Code config. Move the value into an environment variable (\`\${env:VAR}\`) in ${r} first, or add the server manually with \`claude mcp add\`.`
          : undefined;
    let H =
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
      ...(_ && {
        warning: _,
      }),
      async apply({ dryRun, storageV5 }) {
        let q = e === "user" ? "user" : "project";
        if (q === "project" && (await pinPathInside(l, join(l, ".mcp.json"))) === null)
          return {
            skipped: `${S}: .mcp.json is (or is under) a symlink \u2014 refusing project-scope write`,
          };
        if (
          q === "user"
            ? userScopeMcpServerExists(S)
            : (await runInRemoteCallFrameMain(l, readRawMcpJsonServersFromCwd))[S] !== undefined
        )
          return {
            skipped: `${S}: MCP server already exists in ${q} config`,
          };
        if (dryRun) return `would add MCP server ${S} (${q})${H}`;
        await (q === "project"
          ? runInRemoteCallFrameMain(l, () => addMcpConfig(S, config, q, storageV5))
          : addMcpConfig(S, config, q, storageV5));
        return `added MCP server ${S} (${q})${H}`;
      },
    });
  }
}
//@ chunk-hddjmtjj.js:35375-35391 placement
var MAX_RULE_DIR_DEPTH = 4;
var MAX_RULE_FILES = 200;
//@ chunk-hddjmtjj.js:35391-35749 placement
/**
 * 递归收集 .mdc 规则文件（深度与数量上限）。
 */
async function walkRuleFiles(n, e, r, l, i) {
  let sorted = (
    await readdir(n, {
      withFileTypes: true,
    }).catch(() => [])
  ).sort((c, m) => c.name.localeCompare(m.name));
  for (let c of sorted) {
    let m = e === "" ? c.name : `${e}/${c.name}`;
    if (c.isFile() && c.name.endsWith(".mdc")) {
      if (l.length >= MAX_RULE_FILES) {
        i.truncated = true;
        return;
      }
      l.push(m);
    } else if (c.isDirectory()) {
      if (r >= MAX_RULE_DIR_DEPTH) {
        i.truncated = true;
        continue;
      }
      await walkRuleFiles(join(n, c.name), m, r + 1, l, i);
    }
  }
}
//@ chunk-hddjmtjj.js:35749-35865 placement
/**
 * 列出规则目录下的 .mdc 文件（排序），并标记是否截断。
 */
async function listRuleFiles(rulesDir) {
  let e = [];
  let r = {
    truncated: false,
  };
  await walkRuleFiles(rulesDir, "", 0, e, r);
  e.sort();
  return {
    files: e,
    truncated: r.truncated,
  };
}
//@ chunk-hddjmtjj.js:35865-36035 placement
/**
 * 定位正文中 shell 执行标记所在行。
 */
function locateShellExecLine(n, e) {
  let lines = n.split(`
`);
  let index = lines.findIndex((line) => hasShellExecBlock(line));
  if (index === -1) index = lines.findIndex((line) => line.includes("```!") || line.includes("!`"));
  return {
    line: e + index + 1,
    text: lines[index]?.trim() ?? "",
  };
}
//@ chunk-hddjmtjj.js:36035-36096 placement
function lineIndexBefore(n, e) {
  return countCharInString(
    n.slice(0, n.length - e.length),
    `
`,
  );
}
//@ chunk-hddjmtjj.js:36096-36395 placement
function describeShellExecLine(n, e) {
  let { line, text } = locateShellExecLine(n, e);
  return {
    description: `\u26A0 line ${line}: ${truncateCodePoints(text, 80)}`,
    warning: `Line ${line} has a Claude Code shell-exec marker (\`\`\`! or !\`\u2026\`), inert in Cursor but run when the skill loads; if imported it is written escaped, so nothing runs \u2014 review the file.`,
  };
}
//@ chunk-hddjmtjj.js:36395-36922 placement
/**
 * Cursor 规则映射为 Claude Code 规则/技能时的说明文本。
 */
var NAME_COLLISION_NOTE =
  "Its filesystem-safe name collides with another imported rule, skill or command that targets the same path. Rename one of them and re-run the import.";
var SKILL_IMPORT_DESCRIPTION =
  "Becomes a Claude Code skill: its description is always in context, and once Claude loads it the body stays in context for the rest of the session. Unchecked by default; review before importing.";
var COMMAND_IMPORT_DESCRIPTION =
  "Becomes a Claude Code skill you run with /<name>; once loaded, the body stays in context for the rest of the session. Unchecked by default; review before importing.";
//@ chunk-hddjmtjj.js:36922-37049 placement
/**
 * 第一行非空文本（去掉 #），截断到 200 字符。
 */
function firstHeadingText(content) {
  let found = content
    .split(
      `
`,
    )
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .find((r) => r !== "");
  return found === undefined ? undefined : truncateCodePoints(found, 200);
}
//@ chunk-hddjmtjj.js:37049-37514 placement
async function planWriteTarget({ target, existing, out, safeName, dryRun, containIn }) {
  if (containIn && (await pinPathInside(containIn, target)) === null)
    return {
      skipped: `${safeName}: target is under a symlink \u2014 refusing project-scope write`,
    };
  if (await pathExists(existing))
    return {
      skipped: `${safeName}: \`${existing}\` already exists`,
    };
  if (dryRun) return `would write \`${target}\``;
  if (containIn && isEagerLighthouseEnabled()) {
    if (!(await safeWriteFile(containIn, target, out)))
      return {
        skipped: `${safeName}: \`${target}\` already exists`,
      };
    return `wrote \`${target}\``;
  }
  await mkdir(dirname(target), {
    recursive: true,
  });
  await writeFile(target, out, "utf8");
  return `wrote \`${target}\``;
}
//@ chunk-hddjmtjj.js:37514-40607 placement
/**
 * 导入 Cursor rules：按 alwaysApply/globs/描述映射为 CLAUDE.md、规则或技能（数量/大小上限）。
 */
async function importCursorRules({
  rulesDir,
  scope,
  projectRoot,
  claudeMd,
  rulesOut,
  skillsOut,
  sourceLabel,
  claimedTargets,
  items,
  unmappable,
}) {
  let g = scope === "project" ? projectRoot : undefined;
  let { files, truncated } = await listRuleFiles(rulesDir);
  if (truncated)
    unmappable.push({
      scope,
      label: `${sourceLabel}/`,
      reason:
        "Has more rule files, or deeper folders, than the import scans. Review the remaining rules manually.",
    });
  for (let file of files) {
    let v = join(rulesDir, ...file.split("/"));
    let label = `${sourceLabel}/${file}`;
    let S;
    try {
      if ((await lstat(v)).size > MAX_SCOPE_RESPONSE_BYTES) {
        unmappable.push({
          scope,
          label,
          reason:
            "Is larger than the 1 MB Claude Code loads for a skill or rule. Trim it and re-run, or port it manually.",
        });
        continue;
      }
      S = await readImportFileChecked(scope, projectRoot, v);
    } catch {
      unmappable.push({
        scope,
        label,
        reason: "Could not read. Review it manually.",
      });
      continue;
    }
    S = S.replaceAll(
      `\r
`,
      `
`,
    );
    let { frontmatter, content, parseError } = parseFrontmatter(S);
    if (parseError !== undefined) {
      unmappable.push({
        scope,
        label,
        reason:
          "Its frontmatter is not valid YAML, so its activation mode is unknown. Fix the frontmatter and re-run, or port it manually.",
      });
      continue;
    }
    let U = CURSOR_RULE_FRONTMATTER_SCHEMA().safeParse(frontmatter);
    let _ = U.success ? U.data : {};
    let H = _.description?.trim() || undefined;
    let text = (Array.isArray(_.globs) ? _.globs : [_.globs ?? ""])
      .map((B) => B.trim())
      .filter((B) => B !== "");
    let sliced = file.slice(0, -4);
    let mapped = sliced.split("/").map(sanitizeImportName);
    let joined = mapped.join("_");
    let ge = `cursor:${scope}:rule:${sliced}`;
    let tt = H
      ? `# ${H.replace(/\s+/g, " ")}

`
      : "";
    if (parseBooleanishFrontmatter(_.alwaysApply) === true) {
      let B = `${tt}${content.trimEnd()}
`;
      items.push({
        id: ge,
        kind: "instructions",
        scope,
        label: `Rule "${sliced}" (always applied)`,
        description: H,
        fingerprint: B,
        apply: ({ dryRun }) => appendImportedInstructions(claudeMd, v, B, escapeHtmlComment(ge), dryRun, g),
      });
      continue;
    }
    if (text.length > 0) {
      let B = join(rulesOut, ...mapped) + ".md";
      if (claimedTargets.has(B)) {
        unmappable.push({
          scope,
          label,
          reason: NAME_COLLISION_NOTE,
        });
        continue;
      }
      claimedTargets.add(B);
      let mapped_2 = text.map(collapseDashes);
      let ot = `---
${serializeFrontmatter({
  paths: mapped_2.length === 1 ? mapped_2[0] : mapped_2,
})}---

${tt}${content.trimEnd()}
`;
      let st = unwrapResults(text).length;
      items.push({
        id: ge,
        kind: "instructions",
        scope,
        label: `Rule "${sliced}" (scoped to ${st} path ${plural(st, "pattern")})`,
        description: H ?? `\u2192 ${B}`,
        fingerprint: ot,
        apply: ({ dryRun }) =>
          planWriteTarget({
            target: B,
            existing: B,
            out: ot,
            safeName: joined,
            dryRun,
            containIn: g,
          }),
      });
      continue;
    }
    let We = H === undefined;
    let Re = join(skillsOut, joined);
    if (claimedTargets.has(Re)) {
      unmappable.push({
        scope,
        label,
        reason: NAME_COLLISION_NOTE,
      });
      continue;
    }
    if (isSyncedDirName(joined)) {
      unmappable.push({
        scope,
        label,
        reason:
          "Its name is the skills directory name Claude Code reserves for synced skills, so the skill would never load. Rename the rule and re-run the import.",
      });
      continue;
    }
    let shellExecHazard = findShellExecHazard(content, []);
    if (shellExecHazard !== null) {
      unmappable.push({
        scope,
        label,
        reason: shellExecHazard,
      });
      continue;
    }
    let Se = hasShellExecBlock(content) ? describeShellExecLine(content, lineIndexBefore(S, content)) : null;
    let Zt = H ?? firstHeadingText(content) ?? `Imported Cursor rule ${sliced} (manual)`;
    let Be = `---
${serializeFrontmatter({
  name: joined,
  description: collapseDashes(Zt),
  ...(We && {
    "disable-model-invocation": true,
  }),
})}---

${(Se ? escapeShellBangs(content) : content).trimEnd()}
`;
    if (Buffer.byteLength(Be, "utf8") > MAX_SCOPE_RESPONSE_BYTES) {
      unmappable.push({
        scope,
        label,
        reason:
          "Is larger than the 1 MB Claude Code loads for a skill or rule. Trim it and re-run, or port it manually.",
      });
      continue;
    }
    claimedTargets.add(Re);
    let rt = join(Re, "SKILL.md");
    let it = We ? COMMAND_IMPORT_DESCRIPTION : SKILL_IMPORT_DESCRIPTION;
    items.push({
      id: ge,
      kind: "skill",
      scope,
      label: `Rule "${sliced}" (${We ? "manual" : "agent-requested"} \u2192 skill)`,
      description: Se ? Se.description : `\u2192 ${rt}`,
      fingerprint: Be,
      warning: Se ? `${Se.warning} ${it}` : it,
      async apply({ dryRun }) {
        let se = await planWriteTarget({
          target: rt,
          existing: Re,
          out: Be,
          safeName: joined,
          dryRun,
          containIn: g,
        });
        return typeof se === "string" && Se ? `${se} \u2014 shell-exec marker escaped to plain text` : se;
      },
    });
  }
}
//@ chunk-hddjmtjj.js:40607-40798 placement
/**
 * 技能目录扫描深度/数量上限与允许的 frontmatter 键。
 */
var MAX_SKILL_DEPTH = 3;
var MAX_SKILLS = 100;
var ALLOWED_SKILL_FRONTMATTER_KEYS = new Set([
  "description",
  "paths",
  "disable-model-invocation",
  "user-invocable",
  "argument-hint",
  "when_to_use",
  "version",
  "license",
  "compatibility",
]);
var DROPPED_SKILL_FRONTMATTER_KEYS = new Set(["icon", "color"]);
//@ chunk-hddjmtjj.js:40798-41001 placement
/**
 * frontmatter 值标准化（字符串、布尔、数字、字符串数组）。
 */
function normalizeFrontmatterValue(n) {
  if (typeof n === "string") return collapseDashes(n);
  if (typeof n === "boolean") return n;
  if (typeof n === "number") return String(n);
  if (Array.isArray(n) && n.every((e) => typeof e === "string")) return n.map(collapseDashes);
  return;
}
//@ chunk-hddjmtjj.js:41001-41690 placement
function parseSkillFrontmatter(n, name, r) {
  n = n.replaceAll(
    `\r
`,
    `
`,
  );
  let { frontmatter, content, parseError } = parseFrontmatter(n);
  if (parseError !== undefined)
    return {
      ok: false,
      reason:
        "Its SKILL.md frontmatter is not valid YAML. Fix the frontmatter and re-run, or copy the skill manually.",
    };
  let c = r ? escapeShellBangs(content) : content;
  if (content === n)
    return {
      ok: true,
      out: `${c.trimEnd()}
`,
      body: content,
      dropped: [],
    };
  let m = {};
  let f = [];
  for (let [key, value] of Object.entries(frontmatter)) {
    if (DROPPED_SKILL_FRONTMATTER_KEYS.has(key)) continue;
    if (key === "name") {
      m.name = name;
      continue;
    }
    let y = key === "globs" && !("paths" in frontmatter) ? "paths" : key;
    let v = ALLOWED_SKILL_FRONTMATTER_KEYS.has(y) ? normalizeFrontmatterValue(value) : undefined;
    if (v === undefined) {
      f.push(key);
      continue;
    }
    m[y] = v;
  }
  let h =
    Object.keys(m).length > 0
      ? `---
${serializeFrontmatter(m)}---
`
      : "";
  let g =
    h === "" && c.trimStart().startsWith("---")
      ? `
`
      : "";
  return {
    ok: true,
    out: `${h}${g}${c.trimEnd()}
`,
    body: content,
    dropped: f,
  };
}
//@ chunk-hddjmtjj.js:41690-42016 placement
/**
 * 递归找含 SKILL.md 的目录（深度与数量上限）。
 */
async function walkSkillDirs(n, e, r, l) {
  let sorted = (
    await readdir(n, {
      withFileTypes: true,
    }).catch(() => [])
  ).sort((s, c) => s.name.localeCompare(c.name));
  for (let s of sorted) {
    if (!s.isDirectory()) continue;
    let c = join(n, s.name);
    if (await pathExists(join(c, "SKILL.md"))) {
      if (r.length >= MAX_SKILLS) {
        l.truncated = true;
        return;
      }
      r.push(c);
      continue;
    }
    if (e >= MAX_SKILL_DEPTH) {
      l.truncated = true;
      continue;
    }
    await walkSkillDirs(c, e + 1, r, l);
  }
}
//@ chunk-hddjmtjj.js:42016-42278 placement
var SKILL_COPY_NOTE =
  "Skill directories are copied as-is \u2014 bundled scripts and body instructions become active in Claude Code, and once Claude loads the skill it stays in context for the session. Unchecked by default; review SKILL.md and its directory before importing.";
//@ chunk-hddjmtjj.js:42278-44545 placement
/**
 * 导入 Cursor skills 目录（数量/深度上限、SKILL.md 非普通文件时提示）。
 */
async function importCursorSkills({
  root,
  scope,
  projectRoot,
  skillsOut,
  sourceLabel,
  claimedTargets,
  items,
  unmappable,
}) {
  let f = [];
  let h = {
    truncated: false,
  };
  await walkSkillDirs(root, 0, f, h);
  if (h.truncated)
    unmappable.push({
      scope,
      label: `${sourceLabel}/`,
      reason:
        "Has more skills, or deeper folders, than the import scans. Review the remaining skills manually.",
    });
  f.sort();
  for (let g of f) {
    let joined = relative(root, g).split(sep).join("/");
    let label = `${sourceLabel}/${joined}`;
    let name = sanitizeImportName(basename(g));
    let v = join(skillsOut, name);
    if (claimedTargets.has(v)) {
      unmappable.push({
        scope,
        label,
        reason: NAME_COLLISION_NOTE,
      });
      continue;
    }
    let b = join(g, "SKILL.md");
    let S;
    try {
      S = await lstat(b);
    } catch {
      S = null;
    }
    if (S === null || !S.isFile()) {
      unmappable.push({
        scope,
        label,
        reason: "Its SKILL.md is not a regular file (a symlink?). Copy the skill manually.",
      });
      continue;
    }
    if (S.size > MAX_SCOPE_RESPONSE_BYTES) {
      unmappable.push({
        scope,
        label,
        reason:
          "Its SKILL.md is larger than the 1 MB Claude Code loads for a skill. Trim it and re-run, or copy the skill manually.",
      });
      continue;
    }
    let x;
    try {
      x = await readImportFileChecked(scope, projectRoot, b);
    } catch {
      unmappable.push({
        scope,
        label,
        reason: "Could not read. Review it manually.",
      });
      continue;
    }
    x = x.replaceAll(
      `\r
`,
      `
`,
    );
    let skillFrontmatter = parseSkillFrontmatter(x, name, false);
    if (!skillFrontmatter.ok) {
      unmappable.push({
        scope,
        label,
        reason: skillFrontmatter.reason,
      });
      continue;
    }
    let shellExecHazard = findShellExecHazard(skillFrontmatter.body, []);
    if (shellExecHazard !== null) {
      unmappable.push({
        scope,
        label,
        reason: shellExecHazard,
      });
      continue;
    }
    let U = hasShellExecBlock(skillFrontmatter.body)
      ? describeShellExecLine(skillFrontmatter.body, lineIndexBefore(x, skillFrontmatter.body))
      : null;
    claimedTargets.add(v);
    let _ =
      skillFrontmatter.dropped.length > 0
        ? `dropped ${skillFrontmatter.dropped.length} ${plural(skillFrontmatter.dropped.length, "frontmatter key")}${scope === "user" ? ` (${skillFrontmatter.dropped.join(", ")})` : ""} that Claude Code does not share with Cursor`
        : "";
    items.push({
      id: `cursor:${scope}:skill:${joined}`,
      kind: "skill",
      scope,
      label: `Skill "${name}"`,
      description: U ? U.description : `\u2192 ${v}`,
      fingerprint: JSON.stringify([joined, skillFrontmatter.out]),
      warning: [
        ...(U ? [U.warning] : []),
        SKILL_COPY_NOTE,
        ...(_ ? [`${_[0].toUpperCase()}${_.slice(1)}.`] : []),
      ].join(" "),
      async apply({ dryRun }) {
        let T = scope === "project" ? await pinPathInside(projectRoot, g) : await resolveInsideReal(root, g);
        if (T === null)
          return {
            skipped: `${name}: path escapes \`${root}\` (symlink) or is missing`,
          };
        let K = await importSkillDirectory({
          name,
          real: T,
          targetDir: v,
          scope,
          projectRoot,
          dryRun,
          prepareSkillMd(q) {
            let skillFrontmatter = parseSkillFrontmatter(q, name, U !== null);
            if (!skillFrontmatter.ok)
              return {
                skipped: `${name}: ${skillFrontmatter.reason}`,
              };
            let shellExecHazard = findShellExecHazard(skillFrontmatter.body, []);
            if (shellExecHazard !== null)
              return {
                skipped: `${name}: ${shellExecHazard}`,
              };
            if (U === null && hasShellExecBlock(skillFrontmatter.body))
              return {
                skipped: `${name}: SKILL.md gained a shell-exec marker since the scan \u2014 re-run /import to review it`,
              };
            return skillFrontmatter.out;
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
var MAX_SORTED_RULES = 200;
//@ chunk-hddjmtjj.js:44556-46432 placement
async function importCursorCommands({
  dir,
  scope,
  projectRoot,
  sourceLabel,
  claimedTargets,
  items,
  unmappable,
}) {
  let sorted = (
    await readdir(dir, {
      withFileTypes: true,
    }).catch(() => [])
  )
    .filter((h) => h.isFile() && h.name.endsWith(".md"))
    .sort((h, g) => h.name.localeCompare(g.name));
  if (sorted.length > MAX_SORTED_RULES)
    unmappable.push({
      scope,
      label: `${sourceLabel}/`,
      reason: "Has more command files than the import scans. Review the remaining commands manually.",
    });
  let claudeConfigDir = getClaudeConfigDir();
  for (let h of sorted.slice(0, MAX_SORTED_RULES)) {
    let g = join(dir, h.name);
    let w = basename(h.name, ".md");
    let C = sanitizeImportName(w);
    let y =
      scope === "user"
        ? join(claudeConfigDir, "commands", `${C}.md`)
        : join(projectRoot, ".claude", "commands", `${C}.md`);
    if (claimedTargets.has(y)) {
      unmappable.push({
        scope,
        label: `Command /${w}`,
        reason: NAME_COLLISION_NOTE,
      });
      continue;
    }
    let v;
    try {
      if ((await lstat(g)).size > MAX_SCOPE_RESPONSE_BYTES) {
        unmappable.push({
          scope,
          label: `Command /${w}`,
          reason:
            "Is larger than the 1 MB Claude Code loads for a command. Trim it and re-run, or port it manually.",
        });
        continue;
      }
      v = await readImportFileChecked(scope, projectRoot, g);
    } catch {
      unmappable.push({
        scope,
        label: `Command /${w}`,
        reason: "Could not read. Review it manually.",
      });
      continue;
    }
    if (hasShellExecBlock(v)) {
      unmappable.push({
        scope,
        label: `Command /${w}`,
        reason:
          "Contains a `` !`\u2026` `` or ```! shell-exec marker (inert in Cursor, live in Claude Code). Port it manually.",
      });
      continue;
    }
    let shellExecHazard = findShellExecHazard(v, []);
    if (shellExecHazard !== null) {
      unmappable.push({
        scope,
        label: `Command /${w}`,
        reason: shellExecHazard,
      });
      continue;
    }
    claimedTargets.add(y);
    items.push({
      id: `cursor:${scope}:command:${w}`,
      kind: "command",
      scope,
      label: `Command /${w}`,
      description: `\u2192 ${y}`,
      fingerprint: v,
      async apply({ dryRun }) {
        if (scope === "project" && (await pinPathInside(projectRoot, y)) === null)
          return {
            skipped: `${C}: target is under a symlink \u2014 refusing project-scope write`,
          };
        if (await pathExists(y))
          return {
            skipped: `${C}: \`${y}\` already exists`,
          };
        if (dryRun) return `would copy \`${g}\` \u2192 \`${y}\``;
        let x = v.trimStart().startsWith("---")
          ? `
`
          : "";
        if (scope === "project" && isEagerLighthouseEnabled()) {
          if (
            !(await safeWriteFile(
              projectRoot,
              y,
              `${x}${v.trimEnd()}
`,
            ))
          )
            return {
              skipped: `${C}: \`${y}\` already exists`,
            };
          return `copied \u2192 \`${y}\``;
        }
        await mkdir(dirname(y), {
          recursive: true,
        });
        await writeFile(
          y,
          `${x}${v.trimEnd()}
`,
          "utf8",
        );
        return `copied \u2192 \`${y}\``;
      },
    });
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
//@ chunk-hddjmtjj.js:46839-47907 placement
/**
 * 导入 Cursor hooks（读不了、结构异常时提示人工重加）。
 */
async function importCursorHooks(n, e, r, l, i) {
  let s;
  try {
    s = await readImportFileChecked(e, l, n);
  } catch (error) {
    if (isENOENT(error)) return;
    i.push({
      scope: e,
      label: r,
      reason: "Could not read. Review your hooks there manually.",
    });
    return;
  }
  let c = CURSOR_HOOKS_FILE_SCHEMA().safeParse(parseJsonc(s));
  if (!c.success) {
    i.push({
      scope: e,
      label: r,
      reason:
        "Could not parse (unexpected structure). Re-add any hooks you need under the `hooks` key in settings.json.",
    });
    return;
  }
  let m = describeUnexpectedTableShape(
    c.data.hooks,
    r,
    e,
    i,
    "Has an unexpected shape (expected a `hooks` object keyed by event). Re-add any hooks you need under the `hooks` key in settings.json.",
  );
  let keys = Object.keys(m);
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
async function importCursorIgnore(n, e, scope, l, i) {
  let scope_2 = l ? "user" : "project";
  if (scope !== "user" && (await pathExists(join(e, ".cursorignore"))))
    i.push({
      scope: scope_2,
      label: ".cursorignore",
      reason:
        "Claude Code has no direct equivalent. If you need to exclude paths, add Read/Glob deny rules under `permissions` in settings.json.",
    });
  if (scope !== "user" && (await pathExists(join(e, ".cursorindexingignore"))))
    i.push({
      scope: scope_2,
      label: ".cursorindexingignore",
      reason: "Claude Code has no codebase index; nothing to configure.",
    });
  if (scope !== "project" && (await pathExists(n)))
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
//@ chunk-hddjmtjj.js:49126-53365 placement
/**
 * Cursor 导入源定义：检测与扫描各类配置。
 */
var CURSOR_IMPORT_SOURCE = {
  id: "cursor",
  displayName: "Cursor",
  async detect(n) {
    let e = cursorHomeDir(n);
    let r = n.cwd ?? getOriginalCwd();
    if (n.homeDir === undefined && isHomeDirMismatch()) return true;
    return (
      (await pathExists(join(e, "mcp.json"))) ||
      (await pathExists(join(e, "commands"))) ||
      (await pathExists(join(e, "rules"))) ||
      (await pathExists(join(e, "skills"))) ||
      (await pathExists(join(r, ".cursorrules"))) ||
      (await pathExists(join(r, ".cursor")))
    );
  },
  async scan(n) {
    let e = cursorHomeDir(n);
    let r = n.cwd ?? getOriginalCwd();
    let claudeConfigDir = getClaudeConfigDir();
    let i = [];
    let s = [];
    let c =
      (n.homeDir === undefined && isHomeDirMismatch()) ||
      (process.env.CLAUDE_CONFIG_DIR !== undefined &&
        (toFsSafeName(claudeConfigDir) || (await isOutsideDirectory(claudeConfigDir, r))));
    if (c)
      s.push({
        scope: "user",
        label: "Cursor user-scope config",
        reason:
          "The user-scope read or write root has been redirected (resolves inside this project, to a network path, or away from the real home directory) \u2014 skipping user-scope scan for safety.",
      });
    let scope = c ? "project" : n.scope;
    if (scope !== "project") {
      let claimedTargets = new Set();
      await importCursorMcpServers(join(e, "mcp.json"), "user", "~/.cursor/mcp.json", r, i, s);
      await importCursorCommands({
        dir: join(e, "commands"),
        scope: "user",
        projectRoot: r,
        sourceLabel: "~/.cursor/commands",
        claimedTargets,
        items: i,
        unmappable: s,
      });
      await importCursorRules({
        rulesDir: join(e, "rules"),
        scope: "user",
        projectRoot: r,
        claudeMd: join(claudeConfigDir, "CLAUDE.md"),
        rulesOut: join(claudeConfigDir, "rules"),
        skillsOut: join(claudeConfigDir, "skills"),
        sourceLabel: "~/.cursor/rules",
        claimedTargets,
        items: i,
        unmappable: s,
      });
      for (let [g, w] of [
        [join(e, "skills"), "~/.cursor/skills"],
        [projectAgentsSkillsDir(e), "~/.agents/skills"],
      ])
        await importCursorSkills({
          root: g,
          scope: "user",
          projectRoot: r,
          skillsOut: join(claudeConfigDir, "skills"),
          sourceLabel: w,
          claimedTargets,
          items: i,
          unmappable: s,
        });
      await importCursorHooks(join(e, "hooks.json"), "user", "~/.cursor/hooks.json", r, s);
    }
    let f = join(r, ".cursor") === e;
    if (scope !== "user" && f) {
      if (await pathExists(join(r, ".cursorrules")))
        s.push({
          scope: "user",
          label: "~/.cursorrules",
          reason:
            "At $HOME this is user-scope. Not yet auto-imported; append it to ~/.claude/CLAUDE.md (your user-level memory file).",
        });
    }
    if (scope !== "user" && !f) {
      let claimedTargets = new Set();
      let g = join(r, ".cursorrules");
      if (await pathExists(g))
        i.push({
          id: "cursor:project:cursorrules",
          kind: "instructions",
          scope: "project",
          label: ".cursorrules",
          fingerprint: g,
          apply: ({ dryRun }) =>
            appendImportedInstructions(
              join(r, "CLAUDE.md"),
              g,
              undefined,
              "cursor:project:cursorrules",
              dryRun,
              r,
            ),
        });
      let w = join(r, ".cursor");
      if ((await pinPathInside(r, w)) === null) {
        if (await pathExists(w))
          s.push({
            scope: "project",
            label: ".cursor/",
            reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
          });
      } else {
        let v = join(w, "rules");
        if ((await pinPathInside(r, v)) !== null)
          await importCursorRules({
            rulesDir: v,
            scope: "project",
            projectRoot: r,
            claudeMd: join(r, "CLAUDE.md"),
            rulesOut: join(r, ".claude", "rules"),
            skillsOut: join(r, ".claude", "skills"),
            sourceLabel: ".cursor/rules",
            claimedTargets,
            items: i,
            unmappable: s,
          });
        else if (await pathExists(v))
          s.push({
            scope: "project",
            label: ".cursor/rules/",
            reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
          });
        let b = join(w, "mcp.json");
        if ((await pinPathInside(r, b)) !== null)
          await importCursorMcpServers(b, "project", ".cursor/mcp.json", r, i, s);
        else if (await pathExists(b))
          s.push({
            scope: "project",
            label: ".cursor/mcp.json",
            reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
          });
        let S = join(w, "commands");
        if ((await pinPathInside(r, S)) !== null)
          await importCursorCommands({
            dir: S,
            scope: "project",
            projectRoot: r,
            sourceLabel: ".cursor/commands",
            claimedTargets,
            items: i,
            unmappable: s,
          });
        else if (await pathExists(S))
          s.push({
            scope: "project",
            label: ".cursor/commands/",
            reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
          });
        let x = join(w, "skills");
        if ((await pinPathInside(r, x)) !== null)
          await importCursorSkills({
            root: x,
            scope: "project",
            projectRoot: r,
            skillsOut: join(r, ".claude", "skills"),
            sourceLabel: ".cursor/skills",
            claimedTargets,
            items: i,
            unmappable: s,
          });
        else if (await pathExists(x))
          s.push({
            scope: "project",
            label: ".cursor/skills/",
            reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
          });
        let j = join(w, "hooks.json");
        if ((await pinPathInside(r, j)) !== null)
          await importCursorHooks(j, "project", ".cursor/hooks.json", r, s);
        else if (await pathExists(j))
          s.push({
            scope: "project",
            label: ".cursor/hooks.json",
            reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
          });
      }
      let C = join(r, ".agents");
      let y = join(C, "skills");
      if ((await pinPathInside(r, C)) === null) {
        if (await pathExists(C))
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
          skillsOut: join(r, ".claude", "skills"),
          sourceLabel: ".agents/skills",
          claimedTargets,
          items: i,
          unmappable: s,
        });
      else if (await pathExists(y))
        s.push({
          scope: "project",
          label: ".agents/skills/",
          reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
        });
    }
    await importCursorIgnore(e, r, scope, f, s);
    return {
      items: i,
      unmappable: s,
    };
  },
};
export { CURSOR_IMPORT_SOURCE };
