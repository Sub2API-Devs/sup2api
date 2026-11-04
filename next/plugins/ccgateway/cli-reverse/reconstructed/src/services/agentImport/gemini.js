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
import { join, basename } from "path";
import { homedir } from "os";
import { readdir, mkdir, writeFile } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, unknown, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { normalizeShellCommandText, findPromptShellCommands } from "../../utils/promptShellExecution.js";
import {
  findShellExecHazard,
  readCappedImportFile,
  describeUnexpectedTableShape,
  sanitizeImportName,
  pathExists,
  collapseDashes,
  appendImportedInstructions,
  pinPathInside,
  isHomeDirMismatch,
  toFsSafeName,
  isOutsideDirectory,
} from "./importSafety.js";
import { isENOENT, errorMessage } from "../../utils/errors.js";
import { parseJsonc_2 } from "../../utils/json.js";
import { getSemverPart } from "../../hooks/useUpdateNotification.js";
import { userScopeMcpServerExists, addMcpConfig } from "../mcp/config.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { readTomlConfig, CODEX_IMPORT_SOURCE } from "./codex.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { serializeFrontmatter } from "../../utils/frontmatterParser.js";
import { getOriginalCwd, getProjectConfigRoot } from "../../bootstrap/state.js";
import { CURSOR_IMPORT_SOURCE } from "./cursor.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../analytics/index.js";

//@ chunk-hddjmtjj.js:53634-53940 placement
/**
 * Gemini MCP 服务器配置转为 Claude Code 配置（http/sse/stdio，含超时）。
 */
function convertGeminiMcpServer(server) {
  let timeoutOpt =
    server.timeout !== undefined && Number.isInteger(server.timeout) && server.timeout > 0
      ? {
          timeout: server.timeout,
        }
      : undefined;
  if (server.httpUrl)
    return {
      type: "http",
      url: server.httpUrl,
      headers: server.headers,
      ...timeoutOpt,
    };
  if (server.url)
    return {
      type: "sse",
      url: server.url,
      headers: server.headers,
      ...timeoutOpt,
    };
  return {
    type: "stdio",
    command: server.command,
    args: server.args,
    env: server.env,
    ...timeoutOpt,
  };
}
//@ chunk-hddjmtjj.js:53940-54092 placement
var GEMINI_SETTINGS_SCHEMA = DoctorLazy(() =>
  objectSchema({
    mcpServers: unknown().optional(),
    contextFileName: stringSchema().optional().catch(undefined),
  }).loose(),
);
var GEMINI_COMMAND_SCHEMA = DoctorLazy(() =>
  objectSchema({
    prompt: stringSchema(),
    description: stringSchema().optional(),
  }),
);
//@ chunk-hddjmtjj.js:54092-54143 placement
function geminiHomeDir(options) {
  return options.homeDir ?? join(homedir(), ".gemini");
}
//@ chunk-hddjmtjj.js:54143-56805 placement
/**
 * 把 Gemini 命令正文（{{args}}、!{…}、@{…}）翻译为 Claude Code 语法，标出无法安全翻译的情况。
 */
function translateGeminiCommandBody(prompt) {
  let replaced = prompt.replaceAll("{{args}}", "$ARGUMENTS");
  let shellBlocks = replaced.match(/!\{[^}]+\}/g) ?? [];
  for (let [, body] of replaced.matchAll(/!\{([^}]+)\}/g)) {
    if (body.includes("{"))
      return {
        body: replaced,
        hasShellExec: true,
        untranslatable:
          "Its `!{\u2026}` shell block contains nested braces, which this importer would truncate. Port it manually.",
      };
    if (body.includes("`"))
      return {
        body: replaced,
        hasShellExec: true,
        untranslatable:
          "Its `!{\u2026}` shell block contains a backtick, which Claude Code's `` !`cmd` `` syntax can't represent. Port it manually.",
      };
  }
  for (let [, pathExpr] of replaced.matchAll(/@\{([^}]+)\}/g))
    if (pathExpr.includes("{"))
      return {
        body: replaced,
        hasShellExec: false,
        untranslatable:
          "Its `@{\u2026}` path contains a nested brace, which this importer would truncate. Port it manually.",
      };
  for (let match of replaced.matchAll(/!\{[^}]+\}/g)) {
    let prevChar = replaced[match.index - 1];
    if (prevChar !== undefined && !/\s/.test(prevChar))
      return {
        body: replaced,
        hasShellExec: true,
        untranslatable:
          "Its `!{\u2026}` block isn't preceded by whitespace \u2014 Claude Code's `` !`cmd` `` marker requires it, so the shell exec would be silently lost. Port it manually.",
      };
  }
  if (replaced.replace(/!\{[^}]+\}/g, "").includes("!`"))
    return {
      body: replaced,
      hasShellExec: true,
      untranslatable:
        "It has a literal `` !` `` outside any `!{\u2026}` block (inert in Gemini, live in Claude Code \u2014 and it may pair with a translated block's backtick to run something other than the block). Port it manually.",
    };
  let filtered = [...replaced.matchAll(/!\{([^}]+)\}/g)]
    .map((match) => normalizeShellCommandText(match[1]))
    .filter((command) => command.length > 0);
  let text = replaced
    .replace(/@\{([^}]+)\}/g, (full, path) => "@" + path.replaceAll(" ", "\\ "))
    .replace(/!\{([^}]+)\}/g, "!`$1`");
  if (text.includes("```!"))
    return {
      body: replaced,
      hasShellExec: true,
      untranslatable:
        "Its body contains a ```! fenced shell block (inert in Gemini, live in Claude Code). Port it manually.",
    };
  if ((text.match(/!`[^`]*`/g) ?? []).length > shellBlocks.length)
    return {
      body: replaced,
      hasShellExec: true,
      untranslatable:
        "Its translated body contains a `` !`cmd` `` shell-exec marker that wasn't a `!{\u2026}` block in the Gemini prompt (inert there, live in Claude Code). Port it manually.",
    };
  let mapped = findPromptShellCommands(text).map((entry) => entry.command);
  let unexpectedCommands = [...mapped];
  for (let command of filtered) {
    let index = unexpectedCommands.indexOf(command);
    if (index !== -1) unexpectedCommands.splice(index, 1);
  }
  let droppedCommands = [...filtered];
  for (let command of mapped) {
    let index = droppedCommands.indexOf(command);
    if (index !== -1) droppedCommands.splice(index, 1);
  }
  if (unexpectedCommands.length > 0)
    return {
      body: replaced,
      hasShellExec: true,
      untranslatable:
        "Its translated body would execute a shell command that wasn't a `!{\u2026}` block in the Gemini prompt (inert there, live in Claude Code). Port it manually.",
    };
  if (droppedCommands.length > 0)
    return {
      body: replaced,
      hasShellExec: true,
      untranslatable:
        "A `!{\u2026}` shell block would be silently dropped by Claude Code's `` !`cmd` `` parsing after translation (its marker re-pairs with nearby backticks). Port it manually.",
    };
  let shellExecHazard = findShellExecHazard(text, filtered);
  if (shellExecHazard !== null)
    return {
      body: replaced,
      hasShellExec: true,
      untranslatable: shellExecHazard,
    };
  return {
    body: text,
    hasShellExec: filtered.length > 0,
  };
}
//@ chunk-hddjmtjj.js:56805-58407 placement
async function importGeminiMcpServers(homeDir, scope, warnings) {
  let settingsPath = join(homeDir, "settings.json");
  let text;
  try {
    text = await readCappedImportFile(settingsPath);
  } catch (error) {
    if (isENOENT(error)) return;
    warnings.push({
      scope: "user",
      label: "~/.gemini/settings.json",
      reason: "Could not read. Review your MCP servers there manually.",
    });
    return;
  }
  let parsed = GEMINI_SETTINGS_SCHEMA().safeParse(parseJsonc_2(text));
  if (!parsed.success) {
    warnings.push({
      scope: "user",
      label: "~/.gemini/settings.json",
      reason: "Could not parse (unexpected structure). Review your MCP servers there manually.",
    });
    return;
  }
  let settings = parsed.data;
  let serversTable = describeUnexpectedTableShape(
    settings.mcpServers,
    "mcpServers",
    "user",
    warnings,
    "Has an unexpected shape in ~/.gemini/settings.json (expected an object of named entries). Review it manually.",
  );
  for (let [key, value] of Object.entries(serversTable)) {
    let parsed = getSemverPart().safeParse(value);
    if (!parsed.success) {
      warnings.push({
        scope: "user",
        label: `MCP server "${key}"`,
        reason: "Entry in ~/.gemini/settings.json has an unexpected shape. Review it manually.",
      });
      continue;
    }
    let server = parsed.data;
    if (!server.httpUrl && !server.url && !server.command) {
      warnings.push({
        scope: "user",
        label: `MCP server "${key}"`,
        reason: "Has neither a url nor a command \u2014 nothing to import. Review it manually.",
      });
      continue;
    }
    let safeName = sanitizeImportName(key);
    let config = convertGeminiMcpServer(server);
    scope.push({
      id: `gemini:user:mcp:${key}`,
      kind: "mcp",
      scope: "user",
      label: `MCP server "${key}"`,
      fingerprint: JSON.stringify(config),
      async apply({ dryRun, storageV5 }) {
        if (userScopeMcpServerExists(safeName))
          return {
            skipped: `${safeName}: MCP server already exists in user config`,
          };
        if (dryRun) return `would add MCP server ${safeName} (user)`;
        await addMcpConfig(safeName, config, "user", storageV5);
        return `added MCP server ${safeName} (user)`;
      },
    });
  }
  let knownKeys = new Set(["mcpServers", "model"]);
  let filtered = Object.keys(settings).filter((key) => !knownKeys.has(key));
  if (filtered.length > 0)
    warnings.push({
      scope: "user",
      label: `settings.json keys: ${filtered.join(", ")}`,
      reason: "No direct Claude Code equivalent, or cosmetic. Review manually if you relied on them.",
    });
}
//@ chunk-hddjmtjj.js:58407-60214 placement
async function importGeminiCommands(homeDir, scope, plan) {
  let commandsDir = join(homeDir, "commands");
  let entries = await readdir(commandsDir, {
    withFileTypes: true,
  }).catch(() => []);
  let claudeConfigDir = getClaudeConfigDir();
  let mapped = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  if (mapped.length > 0)
    plan.push({
      scope: "user",
      label: `namespaced commands (${mapped.join(", ")})`,
      reason: "Subdirectory-organized commands are not auto-imported yet.",
    });
  for (let entry of entries) {
    if (!entry.isFile()) continue;
    let fileName = entry.name;
    if (!fileName.endsWith(".toml")) continue;
    let sourcePath = join(commandsDir, fileName);
    let baseName = basename(fileName, ".toml");
    let safeName = sanitizeImportName(baseName);
    let targetPath = join(claudeConfigDir, "commands", `${safeName}.md`);
    let config;
    try {
      config = await readTomlConfig(sourcePath);
    } catch {
      plan.push({
        scope: "user",
        label: `Command /${safeName}`,
        reason: "Could not parse as TOML. Review it manually.",
      });
      continue;
    }
    let parsed = GEMINI_COMMAND_SCHEMA().safeParse(config);
    if (!parsed.success) {
      plan.push({
        scope: "user",
        label: `Command /${safeName}`,
        reason: "Doesn't match the expected command format (needs a 'prompt' string). Review it manually.",
      });
      continue;
    }
    let { body, hasShellExec, untranslatable } = translateGeminiCommandBody(parsed.data.prompt);
    if (untranslatable) {
      plan.push({
        scope: "user",
        label: `Command /${safeName}`,
        reason: untranslatable,
      });
      continue;
    }
    let description = parsed.data.description;
    scope.push({
      id: `gemini:user:command:${baseName}`,
      kind: "command",
      scope: "user",
      label: `Command /${safeName}`,
      description: `\u2192 ${targetPath}`,
      fingerprint: JSON.stringify([body, description, hasShellExec]),
      ...(hasShellExec && {
        warning:
          "Uses `!{cmd}` shell exec \u2014 import grants the command `allowed-tools: [Bash, PowerShell]` (any shell command, not just the named ones) and marks it `disable-model-invocation` so, like the Gemini original, only you can run it via `/name`. Unchecked by default; review before importing.",
      }),
      async apply({ dryRun }) {
        if (await pathExists(targetPath))
          return {
            skipped: `${safeName}: \`${targetPath}\` already exists`,
          };
        if (dryRun) return `would write \`${targetPath}\``;
        await mkdir(join(claudeConfigDir, "commands"), {
          recursive: true,
        });
        let warning = {
          ...(description && {
            description: collapseDashes(description),
          }),
          ...(hasShellExec && {
            "allowed-tools": [BASH_TOOL_NAME, POWERSHELL_TOOL_NAME],
            "disable-model-invocation": true,
          }),
        };
        let bodyText =
          Object.keys(warning).length > 0
            ? `---
${serializeFrontmatter(warning)}---

`
            : "";
        let detail =
          bodyText === "" && body.trimStart().startsWith("---")
            ? `
`
            : "";
        await writeFile(
          targetPath,
          `${bodyText}${detail}${body}
`,
          "utf8",
        );
        return `wrote \`${targetPath}\``;
      },
    });
  }
}
//@ chunk-hddjmtjj.js:60214-61303 placement
async function importGeminiInstructions(homeDir, scope, scope_2, projectRoot, plan) {
  let claudeConfigDir = getClaudeConfigDir();
  let candidates = [
    {
      id: "gemini:user:instructions",
      src: join(homeDir, "GEMINI.md"),
      target: join(claudeConfigDir, "CLAUDE.md"),
      scope: "user",
    },
    {
      id: "gemini:project:instructions",
      src: join(scope, "GEMINI.md"),
      target: join(scope, "CLAUDE.md"),
      scope: "project",
      containIn: scope,
    },
  ];
  for (let candidate of candidates) {
    if (scope_2 !== undefined && scope_2 !== candidate.scope) continue;
    if (!(await pathExists(candidate.src))) continue;
    let text;
    if (candidate.scope === "user")
      try {
        text = await readCappedImportFile(candidate.src);
      } catch {
        plan.push({
          scope: "user",
          label: "GEMINI.md",
          reason: "Could not read. Review it manually.",
        });
        continue;
      }
    projectRoot.push({
      id: candidate.id,
      kind: "instructions",
      scope: candidate.scope,
      label: "GEMINI.md",
      fingerprint: text ?? candidate.src,
      apply: ({ dryRun }) =>
        appendImportedInstructions(
          candidate.target,
          candidate.src,
          text,
          candidate.id,
          dryRun,
          candidate.containIn,
        ),
    });
  }
  if (scope_2 === "user") return;
  if (
    (await pinPathInside(scope, join(scope, ".gemini"))) !== null &&
    (await pathExists(join(scope, ".gemini", "system.md")))
  )
    plan.push({
      scope: "project",
      label: ".gemini/system.md",
      reason:
        "Gemini system.md replaces the system prompt; Claude Code output-styles augment it. Review and add as an output-style manually if wanted.",
    });
  if (await pathExists(join(scope, "gemini-extension.json")))
    plan.push({
      scope: "project",
      label: "gemini-extension.json",
      reason: "Gemini extensions map to Claude Code plugins. Not auto-converted yet.",
    });
}
//@ chunk-hddjmtjj.js:61303-62358 placement
var GEMINI_IMPORT_SOURCE = {
  id: "gemini",
  displayName: "Google Gemini CLI",
  async detect(input) {
    let homeDir = geminiHomeDir(input);
    let projectRoot = input.cwd ?? getOriginalCwd();
    if (input.homeDir === undefined && isHomeDirMismatch()) return true;
    return (
      (await pathExists(join(homeDir, "settings.json"))) ||
      (await pathExists(join(homeDir, "GEMINI.md"))) ||
      (await pathExists(join(homeDir, "commands"))) ||
      (await pathExists(join(projectRoot, "GEMINI.md"))) ||
      (await pathExists(join(projectRoot, ".gemini")))
    );
  },
  async scan(input) {
    let homeDir = geminiHomeDir(input);
    let projectRoot = input.cwd ?? getOriginalCwd();
    let plan = [];
    let unmappable = [];
    let ctx =
      (input.homeDir === undefined && isHomeDirMismatch()) ||
      (process.env.CLAUDE_CONFIG_DIR !== undefined &&
        (toFsSafeName(getClaudeConfigDir()) ||
          (await isOutsideDirectory(getClaudeConfigDir(), projectRoot))));
    if (ctx)
      unmappable.push({
        scope: "user",
        label: "Gemini user-scope config",
        reason:
          "The user-scope read or write root has been redirected (resolves inside this project, to a network path, or away from the real home directory) \u2014 skipping user-scope scan for safety.",
      });
    let scope = ctx ? "project" : input.scope;
    if (scope !== "project") {
      await importGeminiMcpServers(homeDir, plan, unmappable);
      await importGeminiCommands(homeDir, plan, unmappable);
    }
    if (
      scope !== "user" &&
      join(projectRoot, ".gemini") !== homeDir &&
      (await pinPathInside(projectRoot, join(projectRoot, ".gemini"))) !== null &&
      (await pathExists(join(projectRoot, ".gemini", "settings.json")))
    )
      unmappable.push({
        scope: "project",
        label: ".gemini/settings.json",
        reason: "Project-level Gemini settings are not auto-imported yet. Review it manually.",
      });
    await importGeminiInstructions(homeDir, projectRoot, scope, plan, unmappable);
    return {
      items: plan,
      unmappable,
    };
  },
};
//@ chunk-hddjmtjj.js:62358-62376 placement
var IMPORT_SOURCES = [CODEX_IMPORT_SOURCE, GEMINI_IMPORT_SOURCE, CURSOR_IMPORT_SOURCE];
//@ chunk-hddjmtjj.js:62376-62421 placement
function importSourceById(from) {
  return IMPORT_SOURCES.find((source) => source.id === from);
}
//@ chunk-hddjmtjj.js:62421-62507 placement
async function detectImportSources(input) {
  let detected = [];
  for (let source of IMPORT_SOURCES) if (await source.detect(input)) detected.push(source);
  return detected;
}
//@ chunk-hddjmtjj.js:62507-62592 placement
function normalizeImportScope(scope) {
  if (getProjectConfigRoot() !== null) return "user";
  return scope === "user" || scope === "project" ? scope : undefined;
}
//@ chunk-hddjmtjj.js:62592-63685 placement
/**
 * 扫描指定或全部已检测的导入源（Codex/Cursor/Gemini），返回各自的可导入项与无法映射项。
 */
async function scanAgentImportSources(input) {
  let ctx = {
    scope: normalizeImportScope(input.scope),
    homeDir: input.homeDir,
    cwd: input.cwd,
  };
  let sources = input.from
    ? [importSourceById(input.from)].filter((source) => source !== undefined)
    : await detectImportSources(ctx);
  if (input.from && sources.length === 0)
    return {
      scans: [],
      error: `Unknown source "${input.from}". Known: ${IMPORT_SOURCES.map((source) => source.id).join(", ")}`,
    };
  if (sources.length === 0)
    return {
      scans: [],
      error:
        "No other AI coding agents detected (looked for: " +
        IMPORT_SOURCES.map((source) => source.displayName).join(", ") +
        ").",
    };
  let results = [];
  let unmappable = [];
  for (let source of sources) {
    let scanResult;
    try {
      scanResult = await source.scan(ctx);
    } catch (error) {
      logForDebugging(`[agentImport] ${source.id} scan failed: ${errorMessage(error)}`, {
        level: "error",
      });
      unmappable.push(`Couldn't read ${source.displayName} config \u2014 it may be malformed. Skipping.`);
      continue;
    }
    if (getProjectConfigRoot() !== null)
      scanResult = {
        ...scanResult,
        items: scanResult.items.filter((item) => item.scope === "user"),
      };
    if (scanResult.items.length > 0 || scanResult.unmappable.length > 0)
      results.push({
        sourceId: source.id,
        displayName: source.displayName,
        result: scanResult,
      });
  }
  logEvent("tengu_import_scan", {
    source_count: results.length,
    codex: results.some((result) => result.sourceId === "codex"),
    gemini: results.some((result) => result.sourceId === "gemini"),
    cursor: results.some((result) => result.sourceId === "cursor"),
    item_count: results.reduce((acc, result) => acc + result.result.items.length, 0),
  });
  if (results.length === 0 && unmappable.length > 0)
    return {
      scans: results,
      error: unmappable.join(`
`),
    };
  return {
    scans: results,
    warnings: unmappable,
  };
}
export { scanAgentImportSources };
