/**
 * services/agentImport/cursor.ts
 *
 * 2.1.316 新增：从 Cursor（mcp.json、rules/*.mdc、commands、skills、hooks、.cursorignore）导入
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ndr12bqk.js (40)
 * attribution: placement 40
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, dirname, relative, sep, basename } from "path";
import { homedir } from "os";
import { readdir, mkdir, writeFile, lstat } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  array,
  record,
  unknown,
  union,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { parseJsonc_2 } from "../../utils/json.js";
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
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
import { getOriginalCwd } from "../../bootstrap/state.js";

//@ chunk-ndr12bqk.js:29097-29489 placement
/**
 * Cursor 导入的 schema：MCP 服务器、mcp.json、规则 frontmatter、hooks，及上限。
 */
var CURSOR_MCP_SERVER_SCHEMA = DoctorLazy(() =>
  objectSchema({
    command: stringSchema().optional(),
    args: array(stringSchema()).optional(),
    env: record(stringSchema(), stringSchema()).optional(),
    url: stringSchema().optional(),
    headers: record(stringSchema(), stringSchema()).optional(),
  }).loose(),
);
var CURSOR_MCP_FILE_SCHEMA = DoctorLazy(() =>
  objectSchema({
    mcpServers: unknown().optional(),
  }).loose(),
);
var CURSOR_RULE_FRONTMATTER_SCHEMA = DoctorLazy(() =>
  objectSchema({
    description: stringSchema().optional().catch(undefined),
    globs: union([stringSchema(), array(stringSchema())])
      .optional()
      .catch(undefined),
    alwaysApply: unknown().optional(),
  }).loose(),
);
var CURSOR_HOOKS_FILE_SCHEMA = DoctorLazy(() =>
  objectSchema({
    hooks: unknown().optional(),
  }).loose(),
);
var MAX_CURSOR_ITEMS = 100;
//@ chunk-ndr12bqk.js:29489-29540 placement
function cursorHomeDir(options) {
  return options.homeDir ?? join(homedir(), ".cursor");
}
//@ chunk-ndr12bqk.js:29540-29590 placement
function projectAgentsSkillsDir(projectRoot) {
  return join(dirname(projectRoot), ".agents", "skills");
}
//@ chunk-ndr12bqk.js:29590-29672 placement
function escapeHtmlComment(text) {
  return text.replaceAll("-->", "\u2014>").replaceAll("<!--", "<!\u2014");
}
//@ chunk-ndr12bqk.js:29672-29717 placement
var VSCODE_ENV_PLACEHOLDER_RE = /\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g;
//@ chunk-ndr12bqk.js:29717-29798 placement
function replaceWorkspacePlaceholders(value, workspace) {
  return value.replace(VSCODE_ENV_PLACEHOLDER_RE, "${$1}").replaceAll("${workspaceFolder}", workspace);
}
//@ chunk-ndr12bqk.js:29798-29892 placement
function mapPlaceholders(env, workspace) {
  if (!env) return;
  let mapped = {};
  for (let [key, value] of Object.entries(env)) mapped[key] = replaceWorkspacePlaceholders(value, workspace);
  return mapped;
}
//@ chunk-ndr12bqk.js:29892-30011 placement
/**
 * ${VAR} 形式的占位符（可带认证前缀）。
 */
var ENV_PLACEHOLDER_RE = /^\$\{[A-Za-z_][A-Za-z0-9_]*(?::-)?\}$/;
var AUTH_PLACEHOLDER_RE = /^(?:(?:Bearer|Basic|Token) )?\$\{[A-Za-z_][A-Za-z0-9_]*(?::-)?\}$/i;
//@ chunk-ndr12bqk.js:30011-30071 placement
function mcpTransportType(url) {
  return /\/sse(?:$|[?#])/.test(url) ? "sse" : "http";
}
//@ chunk-ndr12bqk.js:30071-30170 placement
function sanitizeEnvKey(key) {
  return (
    key
      .replace(/[^A-Za-z0-9_]/g, "_")
      .replace(/^(?=[0-9])/, "_")
      .toUpperCase() || "_"
  );
}
//@ chunk-ndr12bqk.js:30170-30194 placement
var CURSOR_IMPORT = "CURSOR_IMPORT_";
//@ chunk-ndr12bqk.js:30194-30587 placement
/**
 * 把 MCP 服务器 env 与 headers 中的字面值替换成 ${CURSOR_IMPORT_...} 占位符，返回新配置与占位名。
 */
function placeholderSecrets(serverName, scope, used = new Set()) {
  let names = [];
  let placeholderFor = (key) => {
    let base = `${CURSOR_IMPORT}${sanitizeEnvKey(scope)}_${sanitizeEnvKey(key)}`;
    let name = base;
    for (let j = 2; used.has(name); j++) name = `${base}_${j}`;
    used.add(name);
    names.push(name);
    return name;
  };
  let converted = {
    ...serverName,
  };
  if (serverName.env) {
    let env = {};
    for (let [key, value] of Object.entries(serverName.env))
      env[key] = ENV_PLACEHOLDER_RE.test(value) ? value : `\${${placeholderFor(key)}}`;
    converted.env = env;
  }
  if (serverName.headers) {
    let headers = {};
    for (let [key, value] of Object.entries(serverName.headers))
      headers[key] = AUTH_PLACEHOLDER_RE.test(value) ? value : `\${${placeholderFor(key)}}`;
    converted.headers = headers;
  }
  return {
    server: converted,
    placeholdered: names,
  };
}
//@ chunk-ndr12bqk.js:30587-30677 placement
var SECRET_LIKE_KEY_RE = /(?:api[-_]?key|access[-_]?key|secret|token|password|passwd|auth|authorization)$/i;
//@ chunk-ndr12bqk.js:30677-30739 placement
function isNonPlaceholderValue(value) {
  return value !== "" && !AUTH_PLACEHOLDER_RE.test(value.replace(VSCODE_ENV_PLACEHOLDER_RE, "${$1}"));
}
//@ chunk-ndr12bqk.js:30739-31036 placement
/**
 * URL 的用户信息或查询参数中是否含有密钥样式的值。
 */
function urlHasSecret(url) {
  let password = /^[a-z][a-z0-9+.-]*:\/\/[^/?#@:]*:([^/?#@]*)@/i.exec(url)?.[1];
  if (password !== undefined && isNonPlaceholderValue(password)) return true;
  let line = firstLineOf(url, "#");
  let index = line.indexOf("?");
  let query = index === -1 ? "" : line.slice(index + 1);
  for (let pair of query === "" ? [] : query.split("&")) {
    let index = pair.indexOf("=");
    if (
      index !== -1 &&
      SECRET_LIKE_KEY_RE.test(pair.slice(0, index)) &&
      isNonPlaceholderValue(pair.slice(index + 1))
    )
      return true;
  }
  return false;
}
//@ chunk-ndr12bqk.js:31036-31529 placement
/**
 * MCP 服务器的参数或 URL 中是否内联了密钥。
 */
function serverHasInlineSecret(server) {
  let isUrl = (value) => /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
  let hasSecret = (key, value) => {
    if (SECRET_LIKE_KEY_RE.test(key) && isNonPlaceholderValue(value)) return true;
    let match = /^([^:\s]+)\s*:\s*(.*)$/.exec(value);
    if (match !== null && SECRET_LIKE_KEY_RE.test(match[1]) && isNonPlaceholderValue(match[2])) return true;
    return isUrl(value) && urlHasSecret(value);
  };
  let args = server.args ?? [];
  for (let index = 0; index < args.length; index++) {
    let arg = args[index];
    if (!arg.startsWith("-")) {
      if (isUrl(arg) && urlHasSecret(arg)) return true;
      continue;
    }
    let index_2 = arg.indexOf("=");
    if (index_2 !== -1) {
      if (hasSecret(arg.slice(0, index_2), arg.slice(index_2 + 1))) return true;
      continue;
    }
    let nextArg = args[index + 1];
    if (nextArg !== undefined && !nextArg.startsWith("-") && hasSecret(arg, nextArg)) return true;
  }
  return server.url !== undefined && urlHasSecret(server.url);
}
//@ chunk-ndr12bqk.js:31529-32916 placement
function convertCursorMcpServer(server, workspace, scope, used, names = new Set()) {
  let mapValue = (value) =>
    value === undefined ? undefined : replaceWorkspacePlaceholders(value, workspace);
  let mapped = {
    ...server,
    command: mapValue(server.command),
    url: mapValue(server.url),
    args: server.args?.map((arg) => replaceWorkspacePlaceholders(arg, workspace)),
    env: mapPlaceholders(server.env, workspace),
    headers: mapPlaceholders(server.headers, workspace),
  };
  if (scope === "project") {
    if (
      [mapped.url, mapped.command, ...(mapped.args ?? [])].some(
        (value) => value !== undefined && value.includes("${"),
      )
    )
      return {
        refused:
          "Its url, command or args reference an environment variable; on connect Claude Code would expand it into a repo-authored command or url. Add it manually with `claude mcp add` if you trust this repo.",
      };
    let dropped = Object.keys(mapped.env ?? {}).length + Object.keys(mapped.headers ?? {}).length;
    return {
      config: mapped.url
        ? {
            type: mcpTransportType(mapped.url),
            url: mapped.url,
          }
        : {
            type: "stdio",
            command: mapped.command,
            args: mapped.args ?? [],
          },
      placeholdered: [],
      dropped,
    };
  }
  if (
    [server.url, server.command, ...(server.args ?? [])].some((value) =>
      value?.replace(VSCODE_ENV_PLACEHOLDER_RE, "${$1}").includes("${workspaceFolder}"),
    )
  )
    return {
      refused:
        "References `${workspaceFolder}` \u2014 per-workspace in Cursor, but Claude Code's user-scope MCP servers are global. Importing would pin it to this checkout and run it in every project. Add it as a project-scope server (in the specific project's .mcp.json) instead.",
    };
  let stripped = mapped.url
    ? {
        ...mapped,
        env: undefined,
      }
    : {
        ...mapped,
        headers: undefined,
      };
  let dropped = Object.keys((mapped.url ? mapped.env : mapped.headers) ?? {}).length;
  let { server: server_2, placeholdered } = placeholderSecrets(stripped, used, names);
  return {
    config: server_2.url
      ? {
          type: mcpTransportType(server_2.url),
          url: server_2.url,
          ...(server_2.headers && {
            headers: server_2.headers,
          }),
        }
      : {
          type: "stdio",
          command: server_2.command,
          args: server_2.args ?? [],
          ...(server_2.env && {
            env: server_2.env,
          }),
        },
    placeholdered,
    dropped,
  };
}
//@ chunk-ndr12bqk.js:32916-35408 placement
/**
 * 读取 Cursor mcp.json 并转换（读不了/结构异常时提示人工检查）。
 */
async function importCursorMcpServers(filePath, scope, workspace, projectRoot, plan, warnings) {
  let text;
  try {
    text = await readImportFileChecked(scope, projectRoot, filePath);
  } catch (error) {
    if (isENOENT(error)) return;
    warnings.push({
      scope,
      label: workspace,
      reason: "Could not read. Review your MCP servers there manually.",
    });
    return;
  }
  let parsed = CURSOR_MCP_FILE_SCHEMA().safeParse(parseJsonc_2(text));
  if (!parsed.success) {
    warnings.push({
      scope,
      label: workspace,
      reason: "Could not parse (unexpected structure). Review your MCP servers there manually.",
    });
    return;
  }
  let projectBase = scope === "project" ? "." : projectRoot;
  let serversTable = describeUnexpectedTableShape(
    parsed.data.mcpServers,
    "mcpServers",
    scope,
    warnings,
    `Has an unexpected shape in ${workspace} (expected an object of named entries). Review it manually.`,
  );
  let entries = Object.entries(serversTable);
  if (entries.length > MAX_CURSOR_ITEMS)
    warnings.push({
      scope,
      label: workspace,
      reason: "Has more MCP servers than the import scans. Review the remaining servers manually.",
    });
  let usedNames = new Set();
  for (let [name, raw] of entries.slice(0, MAX_CURSOR_ITEMS)) {
    let parsedServer = CURSOR_MCP_SERVER_SCHEMA().safeParse(raw);
    if (!parsedServer.success) {
      warnings.push({
        scope,
        label: `MCP server "${name}"`,
        reason: `Entry in ${workspace} has an unexpected shape. Review it manually.`,
      });
      continue;
    }
    let server = parsedServer.data;
    if (!server.url && !server.command) {
      warnings.push({
        scope,
        label: `MCP server "${name}"`,
        reason: "Has neither a url nor a command \u2014 nothing to import. Review it manually.",
      });
      continue;
    }
    let safeName = sanitizeImportName(name);
    let converted = convertCursorMcpServer(server, projectBase, scope, name, usedNames);
    if ("refused" in converted) {
      warnings.push({
        scope,
        label: `MCP server "${name}"`,
        reason: converted.refused,
      });
      continue;
    }
    let { config, placeholdered, dropped } = converted;
    let warning =
      scope === "project"
        ? "Repo-authored MCP server \u2014 connecting runs its command or sends requests to its url. Only import if you trust this repo."
        : serverHasInlineSecret(server)
          ? `Its url or args look like they carry a literal credential, which /import copies as-is into your Claude Code config. Move the value into an environment variable (\`\${env:VAR}\`) in ${workspace} first, or add the server manually with \`claude mcp add\`.`
          : undefined;
    let detail =
      (placeholdered.length > 0
        ? ` \u2014 set ${plural(placeholdered.length, "env var")} ${placeholdered.join(", ")} (literal ${plural(placeholdered.length, "value")} in ${workspace} not copied)`
        : "") +
      (dropped > 0
        ? ` \u2014 ${dropped} ${plural(dropped, "env/header entry", "env/header entries")} dropped (see ${workspace}); re-add auth manually if needed`
        : "");
    plan.push({
      id: `cursor:${scope}:mcp:${name}`,
      kind: "mcp",
      scope,
      label: `MCP server "${name}"`,
      description: server.url ?? server.command,
      fingerprint: JSON.stringify(config),
      ...(warning && {
        warning,
      }),
      async apply({ dryRun, storageV5 }) {
        let targetScope = scope === "user" ? "user" : "project";
        if (
          targetScope === "project" &&
          (await pinPathInside(projectRoot, join(projectRoot, ".mcp.json"))) === null
        )
          return {
            skipped: `${safeName}: .mcp.json is (or is under) a symlink \u2014 refusing project-scope write`,
          };
        if (
          targetScope === "user"
            ? userScopeMcpServerExists(safeName)
            : (await runInRemoteCallFrameMain(projectRoot, readRawMcpJsonServersFromCwd))[safeName] !==
              undefined
        )
          return {
            skipped: `${safeName}: MCP server already exists in ${targetScope} config`,
          };
        if (dryRun) return `would add MCP server ${safeName} (${targetScope})${detail}`;
        await (targetScope === "project"
          ? runInRemoteCallFrameMain(projectRoot, () =>
              addMcpConfig(safeName, config, targetScope, storageV5),
            )
          : addMcpConfig(safeName, config, targetScope, storageV5));
        return `added MCP server ${safeName} (${targetScope})${detail}`;
      },
    });
  }
}
//@ chunk-ndr12bqk.js:35408-35424 placement
var MAX_RULE_DIR_DEPTH = 4;
var MAX_RULE_FILES = 200;
//@ chunk-ndr12bqk.js:35424-35782 placement
/**
 * 递归收集 .mdc 规则文件（深度与数量上限）。
 */
async function walkRuleFiles(dir, relDir, depth, out, state) {
  let sorted = (
    await readdir(dir, {
      withFileTypes: true,
    }).catch(() => [])
  ).sort((left, right) => left.name.localeCompare(right.name));
  for (let entry of sorted) {
    let relPath = relDir === "" ? entry.name : `${relDir}/${entry.name}`;
    if (entry.isFile() && entry.name.endsWith(".mdc")) {
      if (out.length >= MAX_RULE_FILES) {
        state.truncated = true;
        return;
      }
      out.push(relPath);
    } else if (entry.isDirectory()) {
      if (depth >= MAX_RULE_DIR_DEPTH) {
        state.truncated = true;
        continue;
      }
      await walkRuleFiles(join(dir, entry.name), relPath, depth + 1, out, state);
    }
  }
}
//@ chunk-ndr12bqk.js:35782-35898 placement
/**
 * 列出规则目录下的 .mdc 文件（排序），并标记是否截断。
 */
async function listRuleFiles(dir) {
  let files = [];
  let state = {
    truncated: false,
  };
  await walkRuleFiles(dir, "", 0, files, state);
  files.sort();
  return {
    files,
    truncated: state.truncated,
  };
}
//@ chunk-ndr12bqk.js:35898-36068 placement
/**
 * 定位正文中 shell 执行标记所在行。
 */
function locateShellExecLine(content, baseLine) {
  let lines = content.split(`
`);
  let index = lines.findIndex((line) => hasShellExecBlock(line));
  if (index === -1) index = lines.findIndex((line) => line.includes("```!") || line.includes("!`"));
  return {
    line: baseLine + index + 1,
    text: lines[index]?.trim() ?? "",
  };
}
//@ chunk-ndr12bqk.js:36068-36129 placement
function lineIndexBefore(content, prefix) {
  return countCharInString(
    content.slice(0, content.length - prefix.length),
    `
`,
  );
}
//@ chunk-ndr12bqk.js:36129-36428 placement
function describeShellExecLine(content, baseLine) {
  let { line, text } = locateShellExecLine(content, baseLine);
  return {
    description: `\u26A0 line ${line}: ${truncateCodePoints(text, 80)}`,
    warning: `Line ${line} has a Claude Code shell-exec marker (\`\`\`! or !\`\u2026\`), inert in Cursor but run when the skill loads; if imported it is written escaped, so nothing runs \u2014 review the file.`,
  };
}
//@ chunk-ndr12bqk.js:36428-36955 placement
/**
 * Cursor 规则映射为 Claude Code 规则/技能时的说明文本。
 */
var NAME_COLLISION_NOTE =
  "Its filesystem-safe name collides with another imported rule, skill or command that targets the same path. Rename one of them and re-run the import.";
var SKILL_IMPORT_DESCRIPTION =
  "Becomes a Claude Code skill: its description is always in context, and once Claude loads it the body stays in context for the rest of the session. Unchecked by default; review before importing.";
var COMMAND_IMPORT_DESCRIPTION =
  "Becomes a Claude Code skill you run with /<name>; once loaded, the body stays in context for the rest of the session. Unchecked by default; review before importing.";
//@ chunk-ndr12bqk.js:36955-37082 placement
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
    .find((line) => line !== "");
  return found === undefined ? undefined : truncateCodePoints(found, 200);
}
//@ chunk-ndr12bqk.js:37082-37547 placement
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
//@ chunk-ndr12bqk.js:37547-40640 placement
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
  let projectContainRoot = scope === "project" ? projectRoot : undefined;
  let { files, truncated } = await listRuleFiles(rulesDir);
  if (truncated)
    unmappable.push({
      scope,
      label: `${sourceLabel}/`,
      reason:
        "Has more rule files, or deeper folders, than the import scans. Review the remaining rules manually.",
    });
  for (let file of files) {
    let filePath = join(rulesDir, ...file.split("/"));
    let label = `${sourceLabel}/${file}`;
    let rawText;
    try {
      if ((await lstat(filePath)).size > MAX_SCOPE_RESPONSE_BYTES) {
        unmappable.push({
          scope,
          label,
          reason:
            "Is larger than the 1 MB Claude Code loads for a skill or rule. Trim it and re-run, or port it manually.",
        });
        continue;
      }
      rawText = await readImportFileChecked(scope, projectRoot, filePath);
    } catch {
      unmappable.push({
        scope,
        label,
        reason: "Could not read. Review it manually.",
      });
      continue;
    }
    rawText = rawText.replaceAll(
      `\r
`,
      `
`,
    );
    let { frontmatter, content, parseError } = parseFrontmatter(rawText);
    if (parseError !== undefined) {
      unmappable.push({
        scope,
        label,
        reason:
          "Its frontmatter is not valid YAML, so its activation mode is unknown. Fix the frontmatter and re-run, or port it manually.",
      });
      continue;
    }
    let frontmatterParse = CURSOR_RULE_FRONTMATTER_SCHEMA().safeParse(frontmatter);
    let ruleMeta = frontmatterParse.success ? frontmatterParse.data : {};
    let description = ruleMeta.description?.trim() || undefined;
    let text = (Array.isArray(ruleMeta.globs) ? ruleMeta.globs : [ruleMeta.globs ?? ""])
      .map((pattern) => pattern.trim())
      .filter((pattern) => pattern !== "");
    let sliced = file.slice(0, -4);
    let mapped = sliced.split("/").map(sanitizeImportName);
    let joined = mapped.join("_");
    let ruleId = `cursor:${scope}:rule:${sliced}`;
    let heading = description
      ? `# ${description.replace(/\s+/g, " ")}

`
      : "";
    if (parseBooleanishFrontmatter(ruleMeta.alwaysApply) === true) {
      let ruleBody = `${heading}${content.trimEnd()}
`;
      items.push({
        id: ruleId,
        kind: "instructions",
        scope,
        label: `Rule "${sliced}" (always applied)`,
        description,
        fingerprint: ruleBody,
        apply: ({ dryRun }) =>
          appendImportedInstructions(
            claudeMd,
            filePath,
            ruleBody,
            escapeHtmlComment(ruleId),
            dryRun,
            projectContainRoot,
          ),
      });
      continue;
    }
    if (text.length > 0) {
      let targetPath = join(rulesOut, ...mapped) + ".md";
      if (claimedTargets.has(targetPath)) {
        unmappable.push({
          scope,
          label,
          reason: NAME_COLLISION_NOTE,
        });
        continue;
      }
      claimedTargets.add(targetPath);
      let mapped_2 = text.map(collapseDashes);
      let ruleFileText = `---
${serializeFrontmatter({
  paths: mapped_2.length === 1 ? mapped_2[0] : mapped_2,
})}---

${heading}${content.trimEnd()}
`;
      let patternCount = unwrapResults(text).length;
      items.push({
        id: ruleId,
        kind: "instructions",
        scope,
        label: `Rule "${sliced}" (scoped to ${patternCount} path ${plural(patternCount, "pattern")})`,
        description: description ?? `\u2192 ${targetPath}`,
        fingerprint: ruleFileText,
        apply: ({ dryRun }) =>
          planWriteTarget({
            target: targetPath,
            existing: targetPath,
            out: ruleFileText,
            safeName: joined,
            dryRun,
            containIn: projectContainRoot,
          }),
      });
      continue;
    }
    let hasDescription = description === undefined;
    let skillDir = join(skillsOut, joined);
    if (claimedTargets.has(skillDir)) {
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
    let shellExecHazard_2 = hasShellExecBlock(content)
      ? describeShellExecLine(content, lineIndexBefore(rawText, content))
      : null;
    let fallbackDescription =
      description ?? firstHeadingText(content) ?? `Imported Cursor rule ${sliced} (manual)`;
    let skillMdText = `---
${serializeFrontmatter({
  name: joined,
  description: collapseDashes(fallbackDescription),
  ...(hasDescription && {
    "disable-model-invocation": true,
  }),
})}---

${(shellExecHazard_2 ? escapeShellBangs(content) : content).trimEnd()}
`;
    if (Buffer.byteLength(skillMdText, "utf8") > MAX_SCOPE_RESPONSE_BYTES) {
      unmappable.push({
        scope,
        label,
        reason:
          "Is larger than the 1 MB Claude Code loads for a skill or rule. Trim it and re-run, or port it manually.",
      });
      continue;
    }
    claimedTargets.add(skillDir);
    let skillPath = join(skillDir, "SKILL.md");
    let importNote = hasDescription ? COMMAND_IMPORT_DESCRIPTION : SKILL_IMPORT_DESCRIPTION;
    items.push({
      id: ruleId,
      kind: "skill",
      scope,
      label: `Rule "${sliced}" (${hasDescription ? "manual" : "agent-requested"} \u2192 skill)`,
      description: shellExecHazard_2 ? shellExecHazard_2.description : `\u2192 ${skillPath}`,
      fingerprint: skillMdText,
      warning: shellExecHazard_2 ? `${shellExecHazard_2.warning} ${importNote}` : importNote,
      async apply({ dryRun }) {
        let writeResult = await planWriteTarget({
          target: skillPath,
          existing: skillDir,
          out: skillMdText,
          safeName: joined,
          dryRun,
          containIn: projectContainRoot,
        });
        return typeof writeResult === "string" && shellExecHazard_2
          ? `${writeResult} \u2014 shell-exec marker escaped to plain text`
          : writeResult;
      },
    });
  }
}
//@ chunk-ndr12bqk.js:40640-40831 placement
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
//@ chunk-ndr12bqk.js:40831-41034 placement
/**
 * frontmatter 值标准化（字符串、布尔、数字、字符串数组）。
 */
function normalizeFrontmatterValue(value) {
  if (typeof value === "string") return collapseDashes(value);
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value) && value.every((item) => typeof item === "string"))
    return value.map(collapseDashes);
  return;
}
//@ chunk-ndr12bqk.js:41034-41723 placement
function parseSkillFrontmatter(text, name, fileName) {
  text = text.replaceAll(
    `\r
`,
    `
`,
  );
  let { frontmatter, content, parseError } = parseFrontmatter(text);
  if (parseError !== undefined)
    return {
      ok: false,
      reason:
        "Its SKILL.md frontmatter is not valid YAML. Fix the frontmatter and re-run, or copy the skill manually.",
    };
  let body = fileName ? escapeShellBangs(content) : content;
  if (content === text)
    return {
      ok: true,
      out: `${body.trimEnd()}
`,
      body: content,
      dropped: [],
    };
  let converted = {};
  let droppedKeys = [];
  for (let [key, value] of Object.entries(frontmatter)) {
    if (DROPPED_SKILL_FRONTMATTER_KEYS.has(key)) continue;
    if (key === "name") {
      converted.name = name;
      continue;
    }
    let targetKey = key === "globs" && !("paths" in frontmatter) ? "paths" : key;
    let normalized = ALLOWED_SKILL_FRONTMATTER_KEYS.has(targetKey)
      ? normalizeFrontmatterValue(value)
      : undefined;
    if (normalized === undefined) {
      droppedKeys.push(key);
      continue;
    }
    converted[targetKey] = normalized;
  }
  let normalizedBody =
    Object.keys(converted).length > 0
      ? `---
${serializeFrontmatter(converted)}---
`
      : "";
  let frontmatterText =
    normalizedBody === "" && body.trimStart().startsWith("---")
      ? `
`
      : "";
  return {
    ok: true,
    out: `${normalizedBody}${frontmatterText}${body.trimEnd()}
`,
    body: content,
    dropped: droppedKeys,
  };
}
//@ chunk-ndr12bqk.js:41723-42049 placement
/**
 * 递归找含 SKILL.md 的目录（深度与数量上限）。
 */
async function walkSkillDirs(dir, depth, out, state) {
  let sorted = (
    await readdir(dir, {
      withFileTypes: true,
    }).catch(() => [])
  ).sort((a, b) => a.name.localeCompare(b.name));
  for (let entry of sorted) {
    if (!entry.isDirectory()) continue;
    let child = join(dir, entry.name);
    if (await pathExists(join(child, "SKILL.md"))) {
      if (out.length >= MAX_SKILLS) {
        state.truncated = true;
        return;
      }
      out.push(child);
      continue;
    }
    if (depth >= MAX_SKILL_DEPTH) {
      state.truncated = true;
      continue;
    }
    await walkSkillDirs(child, depth + 1, out, state);
  }
}
//@ chunk-ndr12bqk.js:42049-42311 placement
var SKILL_COPY_NOTE =
  "Skill directories are copied as-is \u2014 bundled scripts and body instructions become active in Claude Code, and once Claude loads the skill it stays in context for the session. Unchecked by default; review SKILL.md and its directory before importing.";
//@ chunk-ndr12bqk.js:42311-44578 placement
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
  let skillDirs = [];
  let walkState = {
    truncated: false,
  };
  await walkSkillDirs(root, 0, skillDirs, walkState);
  if (walkState.truncated)
    unmappable.push({
      scope,
      label: `${sourceLabel}/`,
      reason:
        "Has more skills, or deeper folders, than the import scans. Review the remaining skills manually.",
    });
  skillDirs.sort();
  for (let skillDir of skillDirs) {
    let joined = relative(root, skillDir).split(sep).join("/");
    let label = `${sourceLabel}/${joined}`;
    let name = sanitizeImportName(basename(skillDir));
    let targetDir = join(skillsOut, name);
    if (claimedTargets.has(targetDir)) {
      unmappable.push({
        scope,
        label,
        reason: NAME_COLLISION_NOTE,
      });
      continue;
    }
    let skillMdPath = join(skillDir, "SKILL.md");
    let stats;
    try {
      stats = await lstat(skillMdPath);
    } catch {
      stats = null;
    }
    if (stats === null || !stats.isFile()) {
      unmappable.push({
        scope,
        label,
        reason: "Its SKILL.md is not a regular file (a symlink?). Copy the skill manually.",
      });
      continue;
    }
    if (stats.size > MAX_SCOPE_RESPONSE_BYTES) {
      unmappable.push({
        scope,
        label,
        reason:
          "Its SKILL.md is larger than the 1 MB Claude Code loads for a skill. Trim it and re-run, or copy the skill manually.",
      });
      continue;
    }
    let rawText;
    try {
      rawText = await readImportFileChecked(scope, projectRoot, skillMdPath);
    } catch {
      unmappable.push({
        scope,
        label,
        reason: "Could not read. Review it manually.",
      });
      continue;
    }
    rawText = rawText.replaceAll(
      `\r
`,
      `
`,
    );
    let skillFrontmatter = parseSkillFrontmatter(rawText, name, false);
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
    let shellExecHazard_2 = hasShellExecBlock(skillFrontmatter.body)
      ? describeShellExecLine(skillFrontmatter.body, lineIndexBefore(rawText, skillFrontmatter.body))
      : null;
    claimedTargets.add(targetDir);
    let parsed =
      skillFrontmatter.dropped.length > 0
        ? `dropped ${skillFrontmatter.dropped.length} ${plural(skillFrontmatter.dropped.length, "frontmatter key")}${scope === "user" ? ` (${skillFrontmatter.dropped.join(", ")})` : ""} that Claude Code does not share with Cursor`
        : "";
    items.push({
      id: `cursor:${scope}:skill:${joined}`,
      kind: "skill",
      scope,
      label: `Skill "${name}"`,
      description: shellExecHazard_2 ? shellExecHazard_2.description : `\u2192 ${targetDir}`,
      fingerprint: JSON.stringify([joined, skillFrontmatter.out]),
      warning: [
        ...(shellExecHazard_2 ? [shellExecHazard_2.warning] : []),
        SKILL_COPY_NOTE,
        ...(parsed ? [`${parsed[0].toUpperCase()}${parsed.slice(1)}.`] : []),
      ].join(" "),
      async apply({ dryRun }) {
        let realPath =
          scope === "project"
            ? await pinPathInside(projectRoot, skillDir)
            : await resolveInsideReal(root, skillDir);
        if (realPath === null)
          return {
            skipped: `${name}: path escapes \`${root}\` (symlink) or is missing`,
          };
        let importResult = await importSkillDirectory({
          name,
          real: realPath,
          targetDir,
          scope,
          projectRoot,
          dryRun,
          prepareSkillMd(skillMd) {
            let skillFrontmatter = parseSkillFrontmatter(skillMd, name, shellExecHazard_2 !== null);
            if (!skillFrontmatter.ok)
              return {
                skipped: `${name}: ${skillFrontmatter.reason}`,
              };
            let shellExecHazard = findShellExecHazard(skillFrontmatter.body, []);
            if (shellExecHazard !== null)
              return {
                skipped: `${name}: ${shellExecHazard}`,
              };
            if (shellExecHazard_2 === null && hasShellExecBlock(skillFrontmatter.body))
              return {
                skipped: `${name}: SKILL.md gained a shell-exec marker since the scan \u2014 re-run /import to review it`,
              };
            return skillFrontmatter.out;
          },
        });
        return typeof importResult === "string"
          ? `${importResult}${shellExecHazard_2 ? " \u2014 shell-exec marker escaped to plain text" : ""}${parsed ? ` \u2014 ${parsed}` : ""}`
          : importResult;
      },
    });
  }
}
//@ chunk-ndr12bqk.js:44578-44589 placement
var MAX_SORTED_RULES = 200;
//@ chunk-ndr12bqk.js:44589-46465 placement
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
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (sorted.length > MAX_SORTED_RULES)
    unmappable.push({
      scope,
      label: `${sourceLabel}/`,
      reason: "Has more command files than the import scans. Review the remaining commands manually.",
    });
  let claudeConfigDir = getClaudeConfigDir();
  for (let entry of sorted.slice(0, MAX_SORTED_RULES)) {
    let filePath = join(dir, entry.name);
    let baseName = basename(entry.name, ".md");
    let safeName = sanitizeImportName(baseName);
    let entry_2 =
      scope === "user"
        ? join(claudeConfigDir, "commands", `${safeName}.md`)
        : join(projectRoot, ".claude", "commands", `${safeName}.md`);
    if (claimedTargets.has(entry_2)) {
      unmappable.push({
        scope,
        label: `Command /${baseName}`,
        reason: NAME_COLLISION_NOTE,
      });
      continue;
    }
    let text;
    try {
      if ((await lstat(filePath)).size > MAX_SCOPE_RESPONSE_BYTES) {
        unmappable.push({
          scope,
          label: `Command /${baseName}`,
          reason:
            "Is larger than the 1 MB Claude Code loads for a command. Trim it and re-run, or port it manually.",
        });
        continue;
      }
      text = await readImportFileChecked(scope, projectRoot, filePath);
    } catch {
      unmappable.push({
        scope,
        label: `Command /${baseName}`,
        reason: "Could not read. Review it manually.",
      });
      continue;
    }
    if (hasShellExecBlock(text)) {
      unmappable.push({
        scope,
        label: `Command /${baseName}`,
        reason:
          "Contains a `` !`\u2026` `` or ```! shell-exec marker (inert in Cursor, live in Claude Code). Port it manually.",
      });
      continue;
    }
    let shellExecHazard = findShellExecHazard(text, []);
    if (shellExecHazard !== null) {
      unmappable.push({
        scope,
        label: `Command /${baseName}`,
        reason: shellExecHazard,
      });
      continue;
    }
    claimedTargets.add(entry_2);
    items.push({
      id: `cursor:${scope}:command:${baseName}`,
      kind: "command",
      scope,
      label: `Command /${baseName}`,
      description: `\u2192 ${entry_2}`,
      fingerprint: text,
      async apply({ dryRun }) {
        if (scope === "project" && (await pinPathInside(projectRoot, entry_2)) === null)
          return {
            skipped: `${safeName}: target is under a symlink \u2014 refusing project-scope write`,
          };
        if (await pathExists(entry_2))
          return {
            skipped: `${safeName}: \`${entry_2}\` already exists`,
          };
        if (dryRun) return `would copy \`${filePath}\` \u2192 \`${entry_2}\``;
        let hasFrontmatter = text.trimStart().startsWith("---")
          ? `
`
          : "";
        if (scope === "project" && isEagerLighthouseEnabled()) {
          if (
            !(await safeWriteFile(
              projectRoot,
              entry_2,
              `${hasFrontmatter}${text.trimEnd()}
`,
            ))
          )
            return {
              skipped: `${safeName}: \`${entry_2}\` already exists`,
            };
          return `copied \u2192 \`${entry_2}\``;
        }
        await mkdir(dirname(entry_2), {
          recursive: true,
        });
        await writeFile(
          entry_2,
          `${hasFrontmatter}${text.trimEnd()}
`,
          "utf8",
        );
        return `copied \u2192 \`${entry_2}\``;
      },
    });
  }
}
//@ chunk-ndr12bqk.js:46465-46872 placement
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
//@ chunk-ndr12bqk.js:46872-47940 placement
/**
 * 导入 Cursor hooks（读不了、结构异常时提示人工重加）。
 */
async function importCursorHooks(filePath, scope, label, projectRoot, unmappable) {
  let text;
  try {
    text = await readImportFileChecked(scope, projectRoot, filePath);
  } catch (error) {
    if (isENOENT(error)) return;
    unmappable.push({
      scope,
      label,
      reason: "Could not read. Review your hooks there manually.",
    });
    return;
  }
  let parsed = CURSOR_HOOKS_FILE_SCHEMA().safeParse(parseJsonc_2(text));
  if (!parsed.success) {
    unmappable.push({
      scope,
      label,
      reason:
        "Could not parse (unexpected structure). Re-add any hooks you need under the `hooks` key in settings.json.",
    });
    return;
  }
  let hooksTable = describeUnexpectedTableShape(
    parsed.data.hooks,
    label,
    scope,
    unmappable,
    "Has an unexpected shape (expected a `hooks` object keyed by event). Re-add any hooks you need under the `hooks` key in settings.json.",
  );
  let keys = Object.keys(hooksTable);
  if (keys.length > MAX_CURSOR_ITEMS)
    unmappable.push({
      scope,
      label,
      reason: "Has more hook events than the import scans. Review the remaining hooks manually.",
    });
  for (let eventName of keys.slice(0, MAX_CURSOR_ITEMS)) {
    let claudeEvent = CURSOR_HOOK_EVENTS[eventName];
    unmappable.push({
      scope,
      label: `${label}: ${eventName}${claudeEvent ? ` \u2192 ${claudeEvent}` : ""}`,
      reason: claudeEvent
        ? "Hook scripts are not translated (event payloads and exit-code contracts differ). Re-add it under the Claude Code event named here, via the `hooks` key in settings.json."
        : "No matching Claude Code hook event. See the `hooks` key in settings.json for the events Claude Code offers.",
    });
  }
}
//@ chunk-ndr12bqk.js:47940-49159 placement
async function importCursorIgnore(ignorePath, projectRoot, scope, scopeArg, unmappable) {
  let scope_2 = scopeArg ? "user" : "project";
  if (scope !== "user" && (await pathExists(join(projectRoot, ".cursorignore"))))
    unmappable.push({
      scope: scope_2,
      label: ".cursorignore",
      reason:
        "Claude Code has no direct equivalent. If you need to exclude paths, add Read/Glob deny rules under `permissions` in settings.json.",
    });
  if (scope !== "user" && (await pathExists(join(projectRoot, ".cursorindexingignore"))))
    unmappable.push({
      scope: scope_2,
      label: ".cursorindexingignore",
      reason: "Claude Code has no codebase index; nothing to configure.",
    });
  if (scope !== "project" && (await pathExists(ignorePath)))
    unmappable.push(
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
//@ chunk-ndr12bqk.js:49159-53398 placement
/**
 * Cursor 导入源定义：检测与扫描各类配置。
 */
var CURSOR_IMPORT_SOURCE = {
  id: "cursor",
  displayName: "Cursor",
  async detect(input) {
    let homeDir = cursorHomeDir(input);
    let projectRoot = input.cwd ?? getOriginalCwd();
    if (input.homeDir === undefined && isHomeDirMismatch()) return true;
    return (
      (await pathExists(join(homeDir, "mcp.json"))) ||
      (await pathExists(join(homeDir, "commands"))) ||
      (await pathExists(join(homeDir, "rules"))) ||
      (await pathExists(join(homeDir, "skills"))) ||
      (await pathExists(join(projectRoot, ".cursorrules"))) ||
      (await pathExists(join(projectRoot, ".cursor")))
    );
  },
  async scan(input) {
    let homeDir = cursorHomeDir(input);
    let projectRoot = input.cwd ?? getOriginalCwd();
    let claudeConfigDir = getClaudeConfigDir();
    let plan = [];
    let unmappable = [];
    let userScopeBlocked =
      (input.homeDir === undefined && isHomeDirMismatch()) ||
      (process.env.CLAUDE_CONFIG_DIR !== undefined &&
        (toFsSafeName(claudeConfigDir) || (await isOutsideDirectory(claudeConfigDir, projectRoot))));
    if (userScopeBlocked)
      unmappable.push({
        scope: "user",
        label: "Cursor user-scope config",
        reason:
          "The user-scope read or write root has been redirected (resolves inside this project, to a network path, or away from the real home directory) \u2014 skipping user-scope scan for safety.",
      });
    let scope = userScopeBlocked ? "project" : input.scope;
    if (scope !== "project") {
      let claimedTargets = new Set();
      await importCursorMcpServers(
        join(homeDir, "mcp.json"),
        "user",
        "~/.cursor/mcp.json",
        projectRoot,
        plan,
        unmappable,
      );
      await importCursorCommands({
        dir: join(homeDir, "commands"),
        scope: "user",
        projectRoot,
        sourceLabel: "~/.cursor/commands",
        claimedTargets,
        items: plan,
        unmappable,
      });
      await importCursorRules({
        rulesDir: join(homeDir, "rules"),
        scope: "user",
        projectRoot,
        claudeMd: join(claudeConfigDir, "CLAUDE.md"),
        rulesOut: join(claudeConfigDir, "rules"),
        skillsOut: join(claudeConfigDir, "skills"),
        sourceLabel: "~/.cursor/rules",
        claimedTargets,
        items: plan,
        unmappable,
      });
      for (let [root, label] of [
        [join(homeDir, "skills"), "~/.cursor/skills"],
        [projectAgentsSkillsDir(homeDir), "~/.agents/skills"],
      ])
        await importCursorSkills({
          root,
          scope: "user",
          projectRoot,
          skillsOut: join(claudeConfigDir, "skills"),
          sourceLabel: label,
          claimedTargets,
          items: plan,
          unmappable,
        });
      await importCursorHooks(
        join(homeDir, "hooks.json"),
        "user",
        "~/.cursor/hooks.json",
        projectRoot,
        unmappable,
      );
    }
    let cursorDirIsProject = join(projectRoot, ".cursor") === homeDir;
    if (scope !== "user" && cursorDirIsProject) {
      if (await pathExists(join(projectRoot, ".cursorrules")))
        unmappable.push({
          scope: "user",
          label: "~/.cursorrules",
          reason:
            "At $HOME this is user-scope. Not yet auto-imported; append it to ~/.claude/CLAUDE.md (your user-level memory file).",
        });
    }
    if (scope !== "user" && !cursorDirIsProject) {
      let claimedTargets = new Set();
      let rulesFilePath = join(projectRoot, ".cursorrules");
      if (await pathExists(rulesFilePath))
        plan.push({
          id: "cursor:project:cursorrules",
          kind: "instructions",
          scope: "project",
          label: ".cursorrules",
          fingerprint: rulesFilePath,
          apply: ({ dryRun }) =>
            appendImportedInstructions(
              join(projectRoot, "CLAUDE.md"),
              rulesFilePath,
              undefined,
              "cursor:project:cursorrules",
              dryRun,
              projectRoot,
            ),
        });
      let projectCursorDir = join(projectRoot, ".cursor");
      if ((await pinPathInside(projectRoot, projectCursorDir)) === null) {
        if (await pathExists(projectCursorDir))
          unmappable.push({
            scope: "project",
            label: ".cursor/",
            reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
          });
      } else {
        let rulesDir = join(projectCursorDir, "rules");
        if ((await pinPathInside(projectRoot, rulesDir)) !== null)
          await importCursorRules({
            rulesDir,
            scope: "project",
            projectRoot,
            claudeMd: join(projectRoot, "CLAUDE.md"),
            rulesOut: join(projectRoot, ".claude", "rules"),
            skillsOut: join(projectRoot, ".claude", "skills"),
            sourceLabel: ".cursor/rules",
            claimedTargets,
            items: plan,
            unmappable,
          });
        else if (await pathExists(rulesDir))
          unmappable.push({
            scope: "project",
            label: ".cursor/rules/",
            reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
          });
        let mcpPath = join(projectCursorDir, "mcp.json");
        if ((await pinPathInside(projectRoot, mcpPath)) !== null)
          await importCursorMcpServers(mcpPath, "project", ".cursor/mcp.json", projectRoot, plan, unmappable);
        else if (await pathExists(mcpPath))
          unmappable.push({
            scope: "project",
            label: ".cursor/mcp.json",
            reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
          });
        let commandsDir = join(projectCursorDir, "commands");
        if ((await pinPathInside(projectRoot, commandsDir)) !== null)
          await importCursorCommands({
            dir: commandsDir,
            scope: "project",
            projectRoot,
            sourceLabel: ".cursor/commands",
            claimedTargets,
            items: plan,
            unmappable,
          });
        else if (await pathExists(commandsDir))
          unmappable.push({
            scope: "project",
            label: ".cursor/commands/",
            reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
          });
        let skillsDir = join(projectCursorDir, "skills");
        if ((await pinPathInside(projectRoot, skillsDir)) !== null)
          await importCursorSkills({
            root: skillsDir,
            scope: "project",
            projectRoot,
            skillsOut: join(projectRoot, ".claude", "skills"),
            sourceLabel: ".cursor/skills",
            claimedTargets,
            items: plan,
            unmappable,
          });
        else if (await pathExists(skillsDir))
          unmappable.push({
            scope: "project",
            label: ".cursor/skills/",
            reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
          });
        let hooksPath = join(projectCursorDir, "hooks.json");
        if ((await pinPathInside(projectRoot, hooksPath)) !== null)
          await importCursorHooks(hooksPath, "project", ".cursor/hooks.json", projectRoot, unmappable);
        else if (await pathExists(hooksPath))
          unmappable.push({
            scope: "project",
            label: ".cursor/hooks.json",
            reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
          });
      }
      let agentsDir = join(projectRoot, ".agents");
      let agentsSkillsDir = join(agentsDir, "skills");
      if ((await pinPathInside(projectRoot, agentsDir)) === null) {
        if (await pathExists(agentsDir))
          unmappable.push({
            scope: "project",
            label: ".agents/",
            reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
          });
      } else if ((await pinPathInside(projectRoot, agentsSkillsDir)) !== null)
        await importCursorSkills({
          root: agentsSkillsDir,
          scope: "project",
          projectRoot,
          skillsOut: join(projectRoot, ".claude", "skills"),
          sourceLabel: ".agents/skills",
          claimedTargets,
          items: plan,
          unmappable,
        });
      else if (await pathExists(agentsSkillsDir))
        unmappable.push({
          scope: "project",
          label: ".agents/skills/",
          reason: "Is (or is under) a symlink \u2014 skipping project-scope read for safety.",
        });
    }
    await importCursorIgnore(homeDir, projectRoot, scope, cursorDirIsProject, unmappable);
    return {
      items: plan,
      unmappable,
    };
  },
};
export { CURSOR_IMPORT_SOURCE };
