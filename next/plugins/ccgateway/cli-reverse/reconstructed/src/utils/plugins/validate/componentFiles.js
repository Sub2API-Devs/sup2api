/**
 * utils/plugins/validate/componentFiles.ts
 *
 * 2.1.316 新增：插件目录校验：组件文件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6vxyfwtv.js (16)
 * attribution: placement 14, sole-consumer 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import * as pathModule from "path";
import { isUtf8 } from "buffer";
import { appendAll, makeFinding, extractToolInputForTelemetry, readPluginFileSafe } from "./helpers.js";
import {
  MAX_LISTED_MODULE_FILES,
  MAX_LISTED_TRAVERSALS,
  PLUGIN_MANIFEST_PATH,
  HOOK_EVENT_NAMES,
} from "./validatePluginDirectory.js";
import { toArray, hasPathTraversal } from "./readmeAndListing.js";
import { isPlainObject } from "../../isPlainObject.js";
import { markRemoteMcpServer, markRemoteHooks } from "./archiveChecks.js";
import { ONE_MIB } from "../schemas.js";
import { jsonParse } from "../../slowOperations.js";
import { isPositiveSafeInteger, isValidMcpOAuthConfig } from "../../../services/mcp/types.js";

//@ chunk-6vxyfwtv.js:33108-35107 placement
/**
 * 读取并校验插件的 MCP 配置（.mcp.json 与 manifest.mcpServers 引用的文件）和 hooks 文件：不可读、JSON 语法错、 结构错误、路径穿越都记发现项；同时记录是否连接远程服务（http/sse/ws MCP 或 http 钩子）。
 */
async function checkComponentFiles(rootDir, manifest, findings) {
  let remoteFlags = {
    connectsToRemote: false,
  };
  let fileCache = new Map();
  let leftOutFiles = {
    mcp: new Set(),
    hooks: new Set(),
  };
  let unusable = [];
  let hooksModuleFiles = [];
  let traversalCounts = {
    mcp: 0,
    hooks: 0,
  };
  let readJsonComponent = async (relPath, kind, budget) => {
    let cached = fileCache.get(relPath);
    if (cached === undefined) {
      if (budget !== undefined && budget.left-- <= 0) {
        leftOutFiles[kind].add(relPath);
        return;
      }
      cached = await readJsonComponentFile(rootDir, relPath);
      fileCache.set(relPath, cached);
    }
    if (cached.unread !== undefined) appendAll(findings, unreadFileFindings(relPath, kind, cached.unread));
    if (cached.invalid === "syntax")
      unusable.push({
        file: relPath,
        reason: "is not valid JSON",
        todo: "Fix the JSON.",
        rule: kind === "mcp" ? "MCPJSON_UNPARSEABLE" : "HOOKS_JSON_INVALID",
      });
    else if (cached.invalid !== undefined) findings.push(jsonInvalidFinding(relPath, kind, cached.invalid));
    return cached.parsed;
  };
  let mcpBudget = {
    left: MAX_LISTED_MODULE_FILES,
  };
  let hooksBudget = {
    left: MAX_LISTED_MODULE_FILES,
  };
  let collectMcpEntries = (relPath, parsed) => {
    let shapeFinding = checkMcpConfigShape(relPath, parsed);
    if (shapeFinding !== undefined) {
      findings.push(shapeFinding);
      return [];
    }
    return listValidMcpServerEntries(parsed);
  };
  let mcpServersByName = new Map();
  let addServer = (server) => {
    mcpServersByName.delete(server.name);
    mcpServersByName.set(server.name, server);
  };
  for (let server of collectMcpEntries(
    MCP_JSON_RELATIVE_PATH,
    await readJsonComponent(MCP_JSON_RELATIVE_PATH, "mcp"),
  ))
    addServer(server);
  let array = toArray(manifest.mcpServers);
  let firstRefIndex = new Map();
  for (let [index, spec] of array.entries()) {
    let refPath = normalizeJsonRefPath(spec);
    if (refPath !== undefined) firstRefIndex.set(refPath, index);
  }
  for (let [index, spec] of array.entries()) {
    if (isPlainObject(spec)) {
      for (let key of Object.keys(spec).sort()) {
        let config = spec[key];
        if (isPlainObject(config) && isValidMcpServerConfig(config))
          addServer({
            name: key,
            config,
          });
      }
      continue;
    }
    if (typeof spec === "string" && hasPathTraversal(spec)) {
      if (traversalCounts.mcp++ >= MAX_LISTED_TRAVERSALS) continue;
      findings.push(
        makeFinding(
          "PATH_TRAVERSAL",
          PLUGIN_MANIFEST_PATH,
          Array.isArray(manifest.mcpServers) ? `mcpServers[${index}]` : "mcpServers",
          `Path contains ".." which could be a path traversal attempt: ${extractToolInputForTelemetry(spec, 200)}`,
        ),
      );
      continue;
    }
    let refPath = normalizeJsonRefPath(spec);
    if (refPath !== undefined && firstRefIndex.get(refPath) === index)
      for (let server of collectMcpEntries(refPath, await readJsonComponent(refPath, "mcp", mcpBudget)))
        addServer(server);
  }
  for (let server of mcpServersByName.values()) markRemoteMcpServer(remoteFlags, server);
  let handleHooksFile = (relPath, parsed) => {
    if (parsed === undefined) return;
    let shapeProblem = checkHooksFileShape(parsed);
    if (shapeProblem !== undefined)
      unusable.push({
        file: relPath,
        ...shapeProblem,
      });
    if (isPlainObject(parsed)) {
      markRemoteHooks(remoteFlags, parsed.hooks);
      if (
        shapeProblem === undefined &&
        Array.isArray(parsed.modules) &&
        parsed.modules.some((moduleSpec) => typeof moduleSpec === "string")
      )
        hooksModuleFiles.push(relPath);
    }
  };
  handleHooksFile(HOOKS_HOOKS_JSON, await readJsonComponent(HOOKS_HOOKS_JSON, "hooks"));
  let seenHooksFiles = new Set([HOOKS_HOOKS_JSON]);
  for (let [index, spec] of toArray(manifest.hooks).entries()) {
    if (isPlainObject(spec)) {
      markRemoteHooks(remoteFlags, spec);
      continue;
    }
    if (typeof spec === "string" && spec.includes("..")) {
      if (traversalCounts.hooks++ >= MAX_LISTED_TRAVERSALS) continue;
      findings.push({
        ...makeFinding(
          "PATH_TRAVERSAL",
          PLUGIN_MANIFEST_PATH,
          `hooks[${index}]`,
          `Path contains ".." which could be a path traversal attempt: ${spec}`,
        ),
        fix: null,
      });
      continue;
    }
    let refPath = normalizeComponentFileRef(spec);
    if (refPath !== undefined && !seenHooksFiles.has(refPath)) {
      seenHooksFiles.add(refPath);
      handleHooksFile(refPath, await readJsonComponent(refPath, "hooks", hooksBudget));
    }
  }
  return {
    ...remoteFlags,
    leftOut: {
      mcp: [...leftOutFiles.mcp],
      hooks: [...leftOutFiles.hooks],
    },
    unusable,
    hooksModuleFiles,
    traversalsNotListed: {
      mcp: Math.max(0, traversalCounts.mcp - MAX_LISTED_TRAVERSALS),
      hooks: Math.max(0, traversalCounts.hooks - MAX_LISTED_TRAVERSALS),
    },
  };
}
//@ chunk-6vxyfwtv.js:35107-36627 placement
/**
 * hooks 文件结构校验（modules、description、surface、hooks 包装）。
 */
function checkHooksFileShape(parsed) {
  if (!isPlainObject(parsed))
    return {
      reason: "is read as a hooks file and is not a JSON object",
      todo: 'Write it as {"hooks": {}}, with the hook events inside the inner braces.',
      rule: "HOOKS_SCHEMA_INVALID",
    };
  let modules = parsed.modules;
  if (
    Object.hasOwn(parsed, "modules") &&
    !(
      Array.isArray(modules) &&
      modules.length <= 1 &&
      modules.every((moduleSpec) => typeof moduleSpec === "string")
    )
  )
    return {
      reason: 'has a "modules" that is not a list of at most one string',
      todo: 'Write "modules" as a list that holds the path of one hooks module, or remove it.',
      rule: "HOOKS_SCHEMA_INVALID",
    };
  if (Object.hasOwn(parsed, "description") && typeof parsed.description !== "string")
    return {
      reason: 'has a "description" that is not a string',
      todo: 'Make "description" a string, or remove it.',
      rule: "HOOKS_SCHEMA_INVALID",
    };
  if (Object.hasOwn(parsed, "surface"))
    return {
      reason: 'has a "surface" key',
      todo: 'Remove "surface" from the hooks file.',
      rule: "HOOKS_SCHEMA_INVALID",
    };
  if (!Object.hasOwn(parsed, "hooks")) {
    if (Array.isArray(modules) && modules.length > 0) return;
    return {
      reason: 'is read as a hooks file and has no "hooks" key',
      todo: 'If it is meant to hold hooks, put the hook events under a "hooks" key, or write {"hooks": {}} if there are none.',
      rule: "HOOKS_MISSING_WRAPPER",
    };
  }
  let hooks = parsed.hooks;
  if (!isPlainObject(hooks))
    return {
      reason: 'has a "hooks" that is not an object',
      todo: 'Make "hooks" an object that maps each hook event to a list.',
      rule: "HOOKS_SCHEMA_INVALID",
    };
  let found = Object.keys(hooks).find((key) => HOOK_EVENT_NAMES.has(key) && !Array.isArray(hooks[key]));
  return found === undefined
    ? undefined
    : {
        reason: `has a hook event (${found}) whose value is not a list`,
        todo: "Give that event a list of matchers.",
        rule: "HOOKS_SCHEMA_INVALID",
      };
}
//@ chunk-6vxyfwtv.js:36627-37068 placement
/**
 * MCP/hooks 文件 JSON 无效（BOM、非 UTF-8、过深）的发现项。
 */
function jsonInvalidFinding(relPath, kind, invalid) {
  let { error, fix } = JSON_ENCODING_PROBLEMS[invalid];
  if (kind === "mcp")
    return {
      ...makeFinding(
        "MCPJSON_UNPARSEABLE",
        relPath,
        "json",
        `Invalid JSON syntax: ${error}. The loader skips this file, so none of its servers are configured.`,
      ),
      fix: `${fix} Until then every server in this file is ignored.`,
    };
  return {
    ...makeFinding(
      "HOOKS_JSON_INVALID",
      relPath,
      "json",
      `Invalid JSON syntax: ${error}. At runtime this breaks the entire plugin load.`,
    ),
    fix: relPath === HOOKS_HOOKS_JSON ? `${fix} A broken hooks.json fails the whole plugin.` : fix,
  };
}
//@ chunk-6vxyfwtv.js:37068-37397 placement
/**
 * MCP 配置须是对象，mcpServers 须是对象。
 */
function checkMcpConfigShape(relPath, parsed) {
  if (parsed === undefined) return;
  if (!isPlainObject(parsed))
    return makeFinding(
      "MCPJSON_UNPARSEABLE",
      relPath,
      "root",
      'MCP config must be a JSON object ({"mcpServers": {...}} or a bare {name: config} map).',
    );
  return "mcpServers" in parsed && !isPlainObject(parsed.mcpServers)
    ? makeFinding(
        "MCPJSON_UNPARSEABLE",
        relPath,
        "mcpServers",
        "mcpServers must be an object mapping server names to configs.",
      )
    : undefined;
}
//@ chunk-6vxyfwtv.js:37397-38823 placement
/**
 * MCP/hooks 文件未读（过大、链接、非普通文件）的发现项。
 */
function unreadFileFindings(relPath, kind, unread) {
  if (kind === "mcp")
    return [
      {
        ...makeFinding(
          "MCP_FILE_UNREAD",
          relPath,
          "file",
          unread.why === "too-large"
            ? `MCP config is larger than ${ONE_MIB} bytes and was not read. The loader reads it anyway, so none of its servers were checked.`
            : "MCP config is a symlink, goes through one, or is not a regular file and was not read. The loader reads it anyway, so none of its servers were checked.",
        ),
        fix:
          unread.why === "too-large"
            ? "Keep MCP config files small; move large data elsewhere."
            : "Ship the config as a regular file inside the plugin.",
      },
    ];
  if (relPath !== HOOKS_HOOKS_JSON)
    return [
      {
        ...makeFinding(
          "HOOKS_FILE_UNREAD",
          relPath,
          "hooks",
          `This hooks file is a symlink, goes through one, is not a regular file, or is larger than ${ONE_MIB} bytes, and was not read. The plugin loader reads it anyway and would run these hooks unscreened, so the directory refuses them.`,
        ),
        fix: "Ship the hooks file as a regular file under the size cap.",
      },
    ];
  let isRootLink = unread.refusedAt?.segment === 0;
  if (isRootLink && unread.refusedAt?.isLink !== true) return [];
  let reason =
    unread.why === "too-large"
      ? "hooks.json is past the size cap and was not read"
      : isRootLink
        ? "The hooks directory is a symlink and was not read"
        : "hooks.json is not a regular file (a symlink, a FIFO, a directory)";
  return [
    {
      ...makeFinding(
        "HOOKS_FILE_UNREAD",
        HOOKS_HOOKS_JSON,
        "hooks",
        `${reason} \u2014 hooks are read without following symlinks and are capped at ${ONE_MIB} bytes. The plugin loader has neither limit and would run these hooks unscreened, so the directory refuses them.`,
      ),
      fix: "Ship hooks/hooks.json as a regular file under the size cap.",
    },
  ];
}
//@ chunk-6vxyfwtv.js:38823-38863 placement
var MCP_JSON_RELATIVE_PATH = ".mcp.json";
var HOOKS_HOOKS_JSON = "hooks/hooks.json";
//@ chunk-6vxyfwtv.js:38863-38959 placement
function normalizeRelativeComponentPath(ref) {
  let replaced = pathModule.posix.normalize(ref.slice(2)).replace(/^\/+|\/+$/g, "");
  return replaced === "" ? "." : replaced;
}
//@ chunk-6vxyfwtv.js:38959-39056 placement
function normalizeComponentFileRef(ref) {
  if (typeof ref !== "string" || !ref.startsWith("./") || ref.includes("..")) return;
  return normalizeRelativeComponentPath(ref);
}
//@ chunk-6vxyfwtv.js:39056-39175 placement
function normalizeJsonRefPath(ref) {
  if (typeof ref !== "string" || !ref.startsWith("./") || !ref.endsWith(".json") || ref.includes(".."))
    return;
  return normalizeRelativeComponentPath(ref);
}
//@ chunk-6vxyfwtv.js:39175-39622 placement
/**
 * JSON 编码问题说明与最大嵌套深度。
 */
var JSON_ENCODING_PROBLEMS = {
  bom: {
    error: "JSON Parse error: Unrecognized token (UTF-8 BOM at start of file)",
    fix: "Re-save the file as UTF-8 without a byte-order mark (BOM); the JSON itself may be fine.",
  },
  "not-utf8": {
    error: "JSON Parse error: file is not valid UTF-8",
    fix: "Re-save the file as UTF-8.",
  },
  "too-deep": {
    error: "JSON Parse error: nesting depth 65 exceeds the maximum of 64",
    fix: "Flatten the JSON: it nests objects or lists deeper than this check reads.",
  },
};
var MAX_JSON_DEPTH = 64;
//@ chunk-6vxyfwtv.js:39622-39790 placement
function detectJsonEncodingProblem(bytes) {
  let kind;
  if (bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191) kind = "bom";
  else if (!isUtf8(bytes)) kind = "not-utf8";
  else if (exceedsJsonDepth(bytes, MAX_JSON_DEPTH)) kind = "too-deep";
  return kind === undefined
    ? undefined
    : {
        kind,
        ...JSON_ENCODING_PROBLEMS[kind],
      };
}
//@ chunk-6vxyfwtv.js:39790-40003 placement
function exceedsJsonDepth(bytes, maxDepth) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let byte of bytes)
    if (inString) {
      if (escaped) escaped = false;
      else if (byte === 92) escaped = true;
      else if (byte === 34) inString = false;
    } else if (byte === 34) inString = true;
    else if (byte === 123 || byte === 91) {
      if (++depth > maxDepth) return true;
    } else if ((byte === 125 || byte === 93) && depth > 0) depth--;
  return false;
}
//@ chunk-6vxyfwtv.js:40003-40407 placement
/**
 * 安全读组件 JSON 文件并解析。
 */
async function readJsonComponentFile(rootDir, relPath) {
  let pluginFile = await readPluginFileSafe(rootDir, relPath, ONE_MIB);
  if (!pluginFile.found)
    return {
      parsed: undefined,
      ...(pluginFile.refused !== undefined && {
        unread: {
          why: "refused",
          refusedAt: pluginFile.refused,
        },
      }),
    };
  if (pluginFile.bytes === undefined)
    return {
      parsed: undefined,
      unread: {
        why: pluginFile.tooLarge === true ? "too-large" : "refused",
      },
    };
  let jsonEncodingProblem = detectJsonEncodingProblem(pluginFile.bytes);
  if (jsonEncodingProblem !== undefined)
    return {
      parsed: undefined,
      invalid: jsonEncodingProblem.kind,
    };
  try {
    return {
      parsed: jsonParse(pluginFile.bytes.toString("utf-8")),
    };
  } catch {
    return {
      parsed: undefined,
      invalid: "syntax",
    };
  }
}
//@ chunk-6vxyfwtv.js:40407-40606 sole-consumer
/**
 * listValidMcpServerEntries：接受 {mcpServers:{…}} 或裸对象，按名排序，只返回通过 isValidMcpServerConfig 的 {name, config}。
 */
function listValidMcpServerEntries(parsed) {
  if (!isPlainObject(parsed)) return [];
  let mcpServers = parsed.mcpServers;
  if (mcpServers !== undefined && !isPlainObject(mcpServers)) return [];
  let serverMap = isPlainObject(mcpServers) ? mcpServers : parsed;
  let entries = [];
  for (let key of Object.keys(serverMap).sort()) {
    let config = serverMap[key];
    if (isPlainObject(config) && isValidMcpServerConfig(config))
      entries.push({
        name: key,
        config,
      });
  }
  return entries;
}
//@ chunk-6vxyfwtv.js:40606-41796 sole-consumer
/**
 * isValidMcpServerConfig：不依赖 zod 的手写配置校验，按 type 检查 stdio/sse/http/streamable-http/ws/sse-ide/ws-ide/sdk/claudeai-proxy 必需字段与 timeout/alwaysLoad/oauth/tools/toolPermissions 形状。
 */
function isValidMcpServerConfig(config) {
  let isStringMap = (value) =>
    value === undefined ||
    (isPlainObject(value) && Object.values(value).every((entryValue) => typeof entryValue === "string"));
  let commonFieldsValid =
    (config.timeout === undefined || isPositiveSafeInteger(config.timeout)) &&
    (config.alwaysLoad === undefined || typeof config.alwaysLoad === "boolean");
  switch (config.type) {
    case undefined:
    case "stdio":
      return (
        typeof config.command === "string" &&
        config.command !== "" &&
        (config.args === undefined ||
          (Array.isArray(config.args) && config.args.every((arg) => typeof arg === "string"))) &&
        isStringMap(config.env) &&
        commonFieldsValid
      );
    case "sse":
    case "http":
    case "streamable-http":
      return (
        typeof config.url === "string" &&
        isStringMap(config.headers) &&
        (config.headersHelper === undefined || typeof config.headersHelper === "string") &&
        commonFieldsValid &&
        (config.discoveryCache === undefined || typeof config.discoveryCache === "boolean") &&
        (config.oauth === undefined || isValidMcpOAuthConfig(config.oauth)) &&
        (config.tools === undefined ||
          (Array.isArray(config.tools) && config.tools.every(isValidToolPolicyEntry))) &&
        (config.toolPermissions === undefined ||
          (isPlainObject(config.toolPermissions) &&
            Object.values(config.toolPermissions).every(
              (toolPermission) =>
                typeof toolPermission === "string" && ["allow", "ask", "blocked"].includes(toolPermission),
            )))
      );
    case "ws":
      return (
        typeof config.url === "string" &&
        isStringMap(config.headers) &&
        (config.headersHelper === undefined || typeof config.headersHelper === "string") &&
        commonFieldsValid
      );
    case "sse-ide":
    case "ws-ide":
      return typeof config.url === "string" && typeof config.ideName === "string";
    case "sdk":
      return typeof config.name === "string";
    case "claudeai-proxy":
      return typeof config.url === "string" && typeof config.id === "string";
    default:
      return false;
  }
}
//@ chunk-6vxyfwtv.js:42227-42426 placement
/**
 * isValidToolPolicyEntry：{name, permission_policy?: always_allow|always_ask|always_deny}。
 */
function isValidToolPolicyEntry(entry) {
  return (
    isPlainObject(entry) &&
    typeof entry.name === "string" &&
    (entry.permission_policy === undefined ||
      (typeof entry.permission_policy === "string" &&
        ["always_allow", "always_ask", "always_deny"].includes(entry.permission_policy)))
  );
}
export { detectJsonEncodingProblem, checkComponentFiles };
