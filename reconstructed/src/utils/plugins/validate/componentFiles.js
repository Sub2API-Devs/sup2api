/**
 * utils/plugins/validate/componentFiles.ts
 *
 * 2.1.316 新增：插件目录校验：组件文件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5aas12zq.js (15)
 * attribution: placement 13, sole-consumer 2
 */
import * as pathModule from "path";
import { isUtf8 } from "buffer";
import { N, makeFinding, extractToolInputForTelemetry, readPluginFileSafe } from "./helpers.js";
import { K, Y, R, un } from "./validatePluginDirectory.js";
import { De, hasPathTraversal } from "./readmeAndListing.js";
import { isPlainObject } from "../../isPlainObject.js";
import { markRemoteMcpServer, markRemoteHooks } from "./archiveChecks.js";
import { ONE_MIB } from "../schemas.js";
import { jsonParse } from "../../slowOperations.js";
import { isPositiveSafeInteger, isValidMcpOAuthConfig } from "../../../services/mcp/types.js";
import { isValidToolPolicyEntry } from "./_new/isValidToolPolicyEntry.js";

/**
 * 读取并校验插件的 MCP 配置（.mcp.json 与 manifest.mcpServers 引用的文件）和 hooks 文件：不可读、JSON 语法错、 结构错误、路径穿越都记发现项；同时记录是否连接远程服务（http/sse/ws MCP 或 http 钩子）。
 */
//@ chunk-5aas12zq.js:32821-34820 placement
async function checkComponentFiles(e, n, t) {
  let r = { connectsToRemote: !1 },
    s = new Map(),
    o = { mcp: new Set(), hooks: new Set() },
    a = [],
    l = [],
    d = { mcp: 0, hooks: 0 },
    f = async (c, h, y) => {
      let m = s.get(c);
      if (m === void 0) {
        if (y !== void 0 && y.left-- <= 0) {
          o[h].add(c);
          return;
        }
        ((m = await readJsonComponentFile(e, c)), s.set(c, m));
      }
      if (m.unread !== void 0) N(t, unreadFileFindings(c, h, m.unread));
      if (m.invalid === "syntax")
        a.push({
          file: c,
          reason: "is not valid JSON",
          todo: "Fix the JSON.",
          rule: h === "mcp" ? "MCPJSON_UNPARSEABLE" : "HOOKS_JSON_INVALID",
        });
      else if (m.invalid !== void 0) t.push(jsonInvalidFinding(c, h, m.invalid));
      return m.parsed;
    },
    p = { left: K },
    S = { left: K },
    b = (c, h) => {
      let y = checkMcpConfigShape(c, h);
      if (y !== void 0) return (t.push(y), []);
      return listValidMcpServerEntries(h);
    },
    I = new Map(),
    M = (c) => {
      (I.delete(c.name), I.set(c.name, c));
    };
  for (let c of b(Te, await f(Te, "mcp"))) M(c);
  let L = De(n.mcpServers),
    C = new Map();
  for (let [c, h] of L.entries()) {
    let y = normalizeJsonRefPath(h);
    if (y !== void 0) C.set(y, c);
  }
  for (let [c, h] of L.entries()) {
    if (isPlainObject(h)) {
      for (let m of Object.keys(h).sort()) {
        let v = h[m];
        if (isPlainObject(v) && isValidMcpServerConfig(v)) M({ name: m, config: v });
      }
      continue;
    }
    if (typeof h === "string" && hasPathTraversal(h)) {
      if (d.mcp++ >= Y) continue;
      t.push(
        makeFinding(
          "PATH_TRAVERSAL",
          R,
          Array.isArray(n.mcpServers) ? `mcpServers[${c}]` : "mcpServers",
          `Path contains ".." which could be a path traversal attempt: ${extractToolInputForTelemetry(h, 200)}`,
        ),
      );
      continue;
    }
    let y = normalizeJsonRefPath(h);
    if (y !== void 0 && C.get(y) === c) for (let m of b(y, await f(y, "mcp", p))) M(m);
  }
  for (let c of I.values()) markRemoteMcpServer(r, c);
  let P = (c, h) => {
    if (h === void 0) return;
    let y = checkHooksFileShape(h);
    if (y !== void 0) a.push({ file: c, ...y });
    if (isPlainObject(h)) {
      if (
        (markRemoteHooks(r, h.hooks),
        y === void 0 && Array.isArray(h.modules) && h.modules.some((m) => typeof m === "string"))
      )
        l.push(c);
    }
  };
  P(HOOKS_HOOKS_JSON, await f(HOOKS_HOOKS_JSON, "hooks"));
  let x = new Set([HOOKS_HOOKS_JSON]);
  for (let [c, h] of De(n.hooks).entries()) {
    if (isPlainObject(h)) {
      markRemoteHooks(r, h);
      continue;
    }
    if (typeof h === "string" && h.includes("..")) {
      if (d.hooks++ >= Y) continue;
      t.push({
        ...makeFinding(
          "PATH_TRAVERSAL",
          R,
          `hooks[${c}]`,
          `Path contains ".." which could be a path traversal attempt: ${h}`,
        ),
        fix: null,
      });
      continue;
    }
    let y = ut(h);
    if (y !== void 0 && !x.has(y)) (x.add(y), P(y, await f(y, "hooks", S)));
  }
  return {
    ...r,
    leftOut: { mcp: [...o.mcp], hooks: [...o.hooks] },
    unusable: a,
    hooksModuleFiles: l,
    traversalsNotListed: { mcp: Math.max(0, d.mcp - Y), hooks: Math.max(0, d.hooks - Y) },
  };
}
/**
 * hooks 文件结构校验（modules、description、surface、hooks 包装）。
 */
//@ chunk-5aas12zq.js:34820-36340 placement
function checkHooksFileShape(e) {
  if (!isPlainObject(e))
    return {
      reason: "is read as a hooks file and is not a JSON object",
      todo: 'Write it as {"hooks": {}}, with the hook events inside the inner braces.',
      rule: "HOOKS_SCHEMA_INVALID",
    };
  let modules = e.modules;
  if (
    Object.hasOwn(e, "modules") &&
    !(Array.isArray(modules) && modules.length <= 1 && modules.every((s) => typeof s === "string"))
  )
    return {
      reason: 'has a "modules" that is not a list of at most one string',
      todo: 'Write "modules" as a list that holds the path of one hooks module, or remove it.',
      rule: "HOOKS_SCHEMA_INVALID",
    };
  if (Object.hasOwn(e, "description") && typeof e.description !== "string")
    return {
      reason: 'has a "description" that is not a string',
      todo: 'Make "description" a string, or remove it.',
      rule: "HOOKS_SCHEMA_INVALID",
    };
  if (Object.hasOwn(e, "surface"))
    return {
      reason: 'has a "surface" key',
      todo: 'Remove "surface" from the hooks file.',
      rule: "HOOKS_SCHEMA_INVALID",
    };
  if (!Object.hasOwn(e, "hooks")) {
    if (Array.isArray(modules) && modules.length > 0) return;
    return {
      reason: 'is read as a hooks file and has no "hooks" key',
      todo: 'If it is meant to hold hooks, put the hook events under a "hooks" key, or write {"hooks": {}} if there are none.',
      rule: "HOOKS_MISSING_WRAPPER",
    };
  }
  let hooks = e.hooks;
  if (!isPlainObject(hooks))
    return {
      reason: 'has a "hooks" that is not an object',
      todo: 'Make "hooks" an object that maps each hook event to a list.',
      rule: "HOOKS_SCHEMA_INVALID",
    };
  let found = Object.keys(hooks).find((s) => un.has(s) && !Array.isArray(hooks[s]));
  return found === void 0
    ? void 0
    : {
        reason: `has a hook event (${found}) whose value is not a list`,
        todo: "Give that event a list of matchers.",
        rule: "HOOKS_SCHEMA_INVALID",
      };
}
/**
 * MCP/hooks 文件 JSON 无效（BOM、非 UTF-8、过深）的发现项。
 */
//@ chunk-5aas12zq.js:36340-36781 placement
function jsonInvalidFinding(e, n, t) {
  let { error: error, fix: fix } = JSON_ENCODING_PROBLEMS[t];
  if (n === "mcp")
    return {
      ...makeFinding(
        "MCPJSON_UNPARSEABLE",
        e,
        "json",
        `Invalid JSON syntax: ${error}. The loader skips this file, so none of its servers are configured.`,
      ),
      fix: `${fix} Until then every server in this file is ignored.`,
    };
  return {
    ...makeFinding(
      "HOOKS_JSON_INVALID",
      e,
      "json",
      `Invalid JSON syntax: ${error}. At runtime this breaks the entire plugin load.`,
    ),
    fix: e === HOOKS_HOOKS_JSON ? `${fix} A broken hooks.json fails the whole plugin.` : fix,
  };
}
/**
 * MCP 配置须是对象，mcpServers 须是对象。
 */
//@ chunk-5aas12zq.js:36781-37110 placement
function checkMcpConfigShape(e, n) {
  if (n === void 0) return;
  if (!isPlainObject(n))
    return makeFinding(
      "MCPJSON_UNPARSEABLE",
      e,
      "root",
      'MCP config must be a JSON object ({"mcpServers": {...}} or a bare {name: config} map).',
    );
  return "mcpServers" in n && !isPlainObject(n.mcpServers)
    ? makeFinding(
        "MCPJSON_UNPARSEABLE",
        e,
        "mcpServers",
        "mcpServers must be an object mapping server names to configs.",
      )
    : void 0;
}
/**
 * MCP/hooks 文件未读（过大、链接、非普通文件）的发现项。
 */
//@ chunk-5aas12zq.js:37110-38536 placement
function unreadFileFindings(e, n, t) {
  if (n === "mcp")
    return [
      {
        ...makeFinding(
          "MCP_FILE_UNREAD",
          e,
          "file",
          t.why === "too-large"
            ? `MCP config is larger than ${ONE_MIB} bytes and was not read. The loader reads it anyway, so none of its servers were checked.`
            : "MCP config is a symlink, goes through one, or is not a regular file and was not read. The loader reads it anyway, so none of its servers were checked.",
        ),
        fix:
          t.why === "too-large"
            ? "Keep MCP config files small; move large data elsewhere."
            : "Ship the config as a regular file inside the plugin.",
      },
    ];
  if (e !== HOOKS_HOOKS_JSON)
    return [
      {
        ...makeFinding(
          "HOOKS_FILE_UNREAD",
          e,
          "hooks",
          `This hooks file is a symlink, goes through one, is not a regular file, or is larger than ${ONE_MIB} bytes, and was not read. The plugin loader reads it anyway and would run these hooks unscreened, so the directory refuses them.`,
        ),
        fix: "Ship the hooks file as a regular file under the size cap.",
      },
    ];
  let r = t.refusedAt?.segment === 0;
  if (r && t.refusedAt?.isLink !== !0) return [];
  let s =
    t.why === "too-large"
      ? "hooks.json is past the size cap and was not read"
      : r
        ? "The hooks directory is a symlink and was not read"
        : "hooks.json is not a regular file (a symlink, a FIFO, a directory)";
  return [
    {
      ...makeFinding(
        "HOOKS_FILE_UNREAD",
        HOOKS_HOOKS_JSON,
        "hooks",
        `${s} \u2014 hooks are read without following symlinks and are capped at ${ONE_MIB} bytes. The plugin loader has neither limit and would run these hooks unscreened, so the directory refuses them.`,
      ),
      fix: "Ship hooks/hooks.json as a regular file under the size cap.",
    },
  ];
}
//@ chunk-5aas12zq.js:38536-38576 placement
var Te = ".mcp.json",
  HOOKS_HOOKS_JSON = "hooks/hooks.json";
//@ chunk-5aas12zq.js:38576-38672 placement
function Ye(e) {
  let replaced = pathModule.posix.normalize(e.slice(2)).replace(/^\/+|\/+$/g, "");
  return replaced === "" ? "." : replaced;
}
//@ chunk-5aas12zq.js:38672-38769 placement
function ut(e) {
  if (typeof e !== "string" || !e.startsWith("./") || e.includes("..")) return;
  return Ye(e);
}
//@ chunk-5aas12zq.js:38769-38888 placement
function normalizeJsonRefPath(e) {
  if (typeof e !== "string" || !e.startsWith("./") || !e.endsWith(".json") || e.includes("..")) return;
  return Ye(e);
}
/**
 * JSON 编码问题说明与最大嵌套深度。
 */
//@ chunk-5aas12zq.js:38888-39335 placement
var JSON_ENCODING_PROBLEMS = {
    bom: {
      error: "JSON Parse error: Unrecognized token (UTF-8 BOM at start of file)",
      fix: "Re-save the file as UTF-8 without a byte-order mark (BOM); the JSON itself may be fine.",
    },
    "not-utf8": { error: "JSON Parse error: file is not valid UTF-8", fix: "Re-save the file as UTF-8." },
    "too-deep": {
      error: "JSON Parse error: nesting depth 65 exceeds the maximum of 64",
      fix: "Flatten the JSON: it nests objects or lists deeper than this check reads.",
    },
  },
  MAX_JSON_DEPTH = 64;
//@ chunk-5aas12zq.js:39335-39503 placement
function detectJsonEncodingProblem(e) {
  let n;
  if (e[0] === 239 && e[1] === 187 && e[2] === 191) n = "bom";
  else if (!isUtf8(e)) n = "not-utf8";
  else if (exceedsJsonDepth(e, MAX_JSON_DEPTH)) n = "too-deep";
  return n === void 0 ? void 0 : { kind: n, ...JSON_ENCODING_PROBLEMS[n] };
}
//@ chunk-5aas12zq.js:39503-39716 placement
function exceedsJsonDepth(e, n) {
  let t = 0,
    r = !1,
    s = !1;
  for (let o of e)
    if (r) {
      if (s) s = !1;
      else if (o === 92) s = !0;
      else if (o === 34) r = !1;
    } else if (o === 34) r = !0;
    else if (o === 123 || o === 91) {
      if (++t > n) return !0;
    } else if ((o === 125 || o === 93) && t > 0) t--;
  return !1;
}
/**
 * 安全读组件 JSON 文件并解析。
 */
//@ chunk-5aas12zq.js:39716-40120 placement
async function readJsonComponentFile(e, n) {
  let t = await readPluginFileSafe(e, n, ONE_MIB);
  if (!t.found)
    return {
      parsed: void 0,
      ...(t.refused !== void 0 && { unread: { why: "refused", refusedAt: t.refused } }),
    };
  if (t.bytes === void 0)
    return { parsed: void 0, unread: { why: t.tooLarge === !0 ? "too-large" : "refused" } };
  let r = detectJsonEncodingProblem(t.bytes);
  if (r !== void 0) return { parsed: void 0, invalid: r.kind };
  try {
    return { parsed: jsonParse(t.bytes.toString("utf-8")) };
  } catch {
    return { parsed: void 0, invalid: "syntax" };
  }
}
/**
 * listValidMcpServerEntries：接受 {mcpServers:{…}} 或裸对象，按名排序，只返回通过 isValidMcpServerConfig 的 {name, config}。
 */
//@ chunk-5aas12zq.js:40120-40319 sole-consumer
function listValidMcpServerEntries(e) {
  if (!isPlainObject(e)) return [];
  let mcpServers = e.mcpServers;
  if (mcpServers !== void 0 && !isPlainObject(mcpServers)) return [];
  let t = isPlainObject(mcpServers) ? mcpServers : e,
    r = [];
  for (let s of Object.keys(t).sort()) {
    let o = t[s];
    if (isPlainObject(o) && isValidMcpServerConfig(o)) r.push({ name: s, config: o });
  }
  return r;
}
/**
 * isValidMcpServerConfig：不依赖 zod 的手写配置校验，按 type 检查 stdio/sse/http/streamable-http/ws/sse-ide/ws-ide/sdk/claudeai-proxy 必需字段与 timeout/alwaysLoad/oauth/tools/toolPermissions 形状。
 */
//@ chunk-5aas12zq.js:40319-41509 sole-consumer
function isValidMcpServerConfig(e) {
  let n = (r) => r === void 0 || (isPlainObject(r) && Object.values(r).every((s) => typeof s === "string")),
    t =
      (e.timeout === void 0 || isPositiveSafeInteger(e.timeout)) &&
      (e.alwaysLoad === void 0 || typeof e.alwaysLoad === "boolean");
  switch (e.type) {
    case void 0:
    case "stdio":
      return (
        typeof e.command === "string" &&
        e.command !== "" &&
        (e.args === void 0 || (Array.isArray(e.args) && e.args.every((arg) => typeof arg === "string"))) &&
        n(e.env) &&
        t
      );
    case "sse":
    case "http":
    case "streamable-http":
      return (
        typeof e.url === "string" &&
        n(e.headers) &&
        (e.headersHelper === void 0 || typeof e.headersHelper === "string") &&
        t &&
        (e.discoveryCache === void 0 || typeof e.discoveryCache === "boolean") &&
        (e.oauth === void 0 || isValidMcpOAuthConfig(e.oauth)) &&
        (e.tools === void 0 || (Array.isArray(e.tools) && e.tools.every(isValidToolPolicyEntry))) &&
        (e.toolPermissions === void 0 ||
          (isPlainObject(e.toolPermissions) &&
            Object.values(e.toolPermissions).every(
              (r) => typeof r === "string" && ["allow", "ask", "blocked"].includes(r),
            )))
      );
    case "ws":
      return (
        typeof e.url === "string" &&
        n(e.headers) &&
        (e.headersHelper === void 0 || typeof e.headersHelper === "string") &&
        t
      );
    case "sse-ide":
    case "ws-ide":
      return typeof e.url === "string" && typeof e.ideName === "string";
    case "sdk":
      return typeof e.name === "string";
    case "claudeai-proxy":
      return typeof e.url === "string" && typeof e.id === "string";
    default:
      return !1;
  }
}

export { detectJsonEncodingProblem, checkComponentFiles };
