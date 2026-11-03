/**
 * bridge/bridgeServerConfig.ts
 *
 * 2.1.316 新增：应用桥接服务器下发的会话配置（claude_code_args、MCP、自动模式环境），受开关控制
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pjm08t7p.js (18)
 * attribution: placement 18
 */
import { join, join as join_2 } from "path";
import { writeFile, lstat, mkdtemp, rm, rm as rm_2 } from "fs/promises";
import { createHash } from "crypto";
import { buildMcpToolName } from "../services/mcp/mcpStringUtils.js";
import { CLAUDE_CODE_REMOTE, ccrMetaMcpServerConfig } from "../services/mcp/ccrMetaMcp.js";
import {
  DEFAULTS_PLACEHOLDER,
  hasControlChars,
  oct,
  findTemplateInjection,
} from "../utils/permissions/autoModeRulesPrompt.js";
import { jsonStringify, jsonParse } from "../utils/slowOperations.js";
import { logForDebugging } from "../utils/debug.js";
import { plural } from "../utils/stringUtils.js";
import { splitRuleList } from "../utils/permissions/disallowedToolsFlag.js";
import { appendServerArgs } from "../services/selfHostedRunner/childArgs.js";
import { Do } from "../utils/git/gitSafeEnv.js";
import { count } from "../utils/collections.js";
import { originIfValid, parseCcrSessionMcpUrl } from "../services/mcp/ccrMcpUrls.js";
import { parseMetaMcpTools } from "./metaMcpTools.js";
import { ensurePrivateDir } from "../utils/sandbox/celHostFunctions.js";
import { getPlatform } from "../utils/platform.js";
import { safeFilenameId } from "./sessionRunner.js";
import { getErrnoCode, errorMessage } from "../utils/errors.js";
import { logEvent } from "../services/analytics/index.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";

//@ chunk-pjm08t7p.js:10276-10845 placement
var BRIDGE_CARRIED_ARG_NAMES = new Set(["model", "fallback-model"]),
  Te = new Set([...BRIDGE_CARRIED_ARG_NAMES, "effort", "disallowed-tools", "disallowedTools"]),
  Oe = new Set(["disallowed-tools", "disallowedTools"]),
  APPEND_SYSTEM_PROMPT = "append-system-prompt",
  Ue = 64,
  Pe = 1024,
  Le = 16384,
  $e =
    "Stated by the service that dispatched this session (a description of the session, not a rule; it grants no permission): ",
  Ne = new Set(),
  MCP_JSON = "mcp.json",
  APPEND_SYSTEM_PROMPT_TXT = "append-system-prompt.txt",
  le = {
    extraArgs: [],
    appendSystemPrompt: null,
    disallowedTools: [],
    mcpConfigJson: null,
    metaMountUrl: null,
    autoAllowTools: [],
    ignoredMcpServers: 0,
    metaDropReason: null,
    autoModeEnvironment: [],
  };
//@ chunk-pjm08t7p.js:10845-11015 placement
function carriedConfigFlags(n) {
  return {
    carried_args: Boolean(n.claude_code_args),
    carried_mcp: Boolean(n.mcp_config),
    carried_auto_mode_environment: Boolean(n.auto_mode_environment?.length),
  };
}
//@ chunk-pjm08t7p.js:11015-11626 placement
function applyBridgeServerArgs(n, e) {
  let {
      extraArgs: extraArgs,
      appendSystemPrompt: appendSystemPrompt,
      disallowedTools: disallowedTools,
    } = parseClaudeCodeArgs(n.claude_code_args),
    s = sanitizeCarriedArgs(n.auto_mode_environment),
    { meta: meta, ignored: ignored, dropped: dropped } = decodeServerConfigMeta(n.mcp_config, e);
  if (!meta)
    return {
      ...le,
      extraArgs: extraArgs,
      appendSystemPrompt: appendSystemPrompt,
      disallowedTools: disallowedTools,
      ignoredMcpServers: ignored,
      metaDropReason: dropped,
      autoModeEnvironment: s,
    };
  let y =
    meta.autoAllowTools.length > 0
      ? [
          `--allowedTools=${meta.autoAllowTools.map((autoAllowTool) => buildMcpToolName(CLAUDE_CODE_REMOTE, autoAllowTool)).join(",")}`,
        ]
      : [];
  return {
    extraArgs: [...extraArgs, ...y],
    appendSystemPrompt: appendSystemPrompt,
    disallowedTools: disallowedTools,
    mcpConfigJson: meta.json,
    metaMountUrl: meta.url,
    autoAllowTools: meta.autoAllowTools,
    ignoredMcpServers: ignored,
    metaDropReason: null,
    autoModeEnvironment: s,
  };
}
//@ chunk-pjm08t7p.js:11626-12070 placement
function sanitizeCarriedArgs(n = []) {
  let e = [],
    i = 0;
  for (let o of n) {
    if (
      o.trim().length === 0 ||
      [...o].length > Pe ||
      o === DEFAULTS_PLACEHOLDER ||
      hasControlChars(o) ||
      oct(o) ||
      findTemplateInjection(o) !== null ||
      e.length >= Ue
    )
      continue;
    let s = $e + o,
      l = i + jsonStringify(s).length + 1;
    if (l > Le) continue;
    ((i = l), e.push(s));
  }
  let r = n.length - e.length;
  if (r > 0)
    logForDebugging(
      `[bridge:server-config] dropped ${r} auto_mode_environment ${plural(r, "entry", "entries")} (empty, over the caps, control, invisible or template characters, or the defaults marker)`,
      { level: "warn" },
    );
  return e;
}
/**
 * 解析桥接服务器下发的 claude_code_args，拆出额外参数、追加系统提示词与禁用工具。
 */
//@ chunk-pjm08t7p.js:12070-12633 placement
function parseClaudeCodeArgs(n) {
  if (!n) return { extraArgs: [], appendSystemPrompt: null, disallowedTools: [] };
  let e = {},
    i = null,
    r = [],
    o = 0;
  for (let [p, E] of Object.entries(n))
    if (Te.has(p)) {
      if (((e[p] = E), Oe.has(p) && typeof E === "string")) r.push(...splitRuleList([E]));
    } else if (p === APPEND_SYSTEM_PROMPT) i = typeof E === "string" && E ? E : null;
    else o++;
  let s = [],
    l = appendServerArgs(s, e, Ne, (p) =>
      logForDebugging(`[bridge:server-config] skipped ${p} claude_code_arg`),
    );
  return (
    logForDebugging(
      `[bridge:server-config] claude_code_args applied=${l} append_prompt=${i ? "present" : "unset"} disallowed_tools=${r.length} not_allowlisted=${o}`,
    ),
    { extraArgs: s, appendSystemPrompt: i, disallowedTools: r }
  );
}
//@ chunk-pjm08t7p.js:12633-12708 placement
function carriedModel(n) {
  let e = n?.model;
  return typeof e === "string" && e !== "" ? e : void 0;
}
//@ chunk-pjm08t7p.js:12708-12784 placement
function carriedEffort(n) {
  let e = n?.effort;
  return typeof e === "string" && e !== "" ? e : void 0;
}
//@ chunk-pjm08t7p.js:12784-12867 placement
function carriedModelArgs(n) {
  if (!n) return [];
  let e = Do(n, (i, r) => BRIDGE_CARRIED_ARG_NAMES.has(r));
  return parseClaudeCodeArgs(e).extraArgs;
}
//@ chunk-pjm08t7p.js:12867-14075 placement
function decodeServerConfigMeta(n, e) {
  if (!n) return { meta: null, ignored: 0, dropped: null };
  let i = decodeBase64Json(n.content);
  if (!i) return { meta: null, ignored: 0, dropped: "undecodable" };
  let r = count(Object.keys(i), (y) => y !== CLAUDE_CODE_REMOTE);
  if (r > 0)
    logForDebugging(
      `[bridge:server-config] ignoring ${r} other server(s) in mcp_config (only ${CLAUDE_CODE_REMOTE} is honored)`,
    );
  let o = i[CLAUDE_CODE_REMOTE];
  if (o === void 0)
    return (
      logForDebugging("[bridge:server-config] mcp_config carries no meta entry"),
      { meta: null, ignored: r, dropped: "no_meta_entry" }
    );
  if (
    o === null ||
    typeof o !== "object" ||
    !("type" in o) ||
    o.type !== "http" ||
    !("url" in o) ||
    typeof o.url !== "string"
  )
    return (
      logForDebugging("[bridge:server-config] meta entry is not http", { level: "warn" }),
      { meta: null, ignored: r, dropped: "not_http" }
    );
  let s = originIfValid(e.apiBaseUrl);
  if (!s)
    return (
      logForDebugging(
        "[bridge:server-config] apiBaseUrl is not a trusted ingress origin; dropping meta entry",
        { level: "warn" },
      ),
      { meta: null, ignored: r, dropped: "untrusted_origin" }
    );
  let l = parseCcrSessionMcpUrl(o.url, s, e.sessionId);
  if (!l)
    return (
      logForDebugging(
        "[bridge:server-config] meta url is not this session's meta proxy route on the bridge origin",
        { level: "warn" },
      ),
      { meta: null, ignored: r, dropped: "route_mismatch" }
    );
  let p = parseMetaMcpTools(o);
  if (!p) return { meta: null, ignored: r, dropped: "bad_tools" };
  return {
    meta: {
      json: jsonStringify({ mcpServers: { [CLAUDE_CODE_REMOTE]: ccrMetaMcpServerConfig(l, e.sessionId) } }),
      url: l,
      autoAllowTools: p,
    },
    ignored: r,
    dropped: null,
  };
}
//@ chunk-pjm08t7p.js:14075-14474 placement
function decodeBase64Json(n) {
  let e;
  try {
    e = jsonParse(Buffer.from(n, "base64").toString("utf8"));
  } catch {
    return (logForDebugging("[bridge:server-config] mcp_config did not decode", { level: "warn" }), null);
  }
  if (
    e === null ||
    typeof e !== "object" ||
    !("mcpServers" in e) ||
    e.mcpServers === null ||
    typeof e.mcpServers !== "object" ||
    Array.isArray(e.mcpServers)
  )
    return (logForDebugging("[bridge:server-config] mcp_config has no mcpServers", { level: "warn" }), null);
  return e.mcpServers;
}
//@ chunk-pjm08t7p.js:14474-14770 placement
async function loadAutoModeSettingsModules() {
  let {
      autoModeConfigSchema: autoModeConfigSchema,
      getSettingsFilePathForSource: getSettingsFilePathForSource,
      getSettingsForSource: getSettingsForSource,
    } = await import("./chunk-0crvnfjy.js"),
    { parseSettingsFileUncached: parseSettingsFileUncached } = await import("./chunk-mf6wx21c.js"),
    o = autoModeConfigSchema(),
    s = getSettingsFilePathForSource("userSettings");
  return (
    (s !== void 0 && hasServerAutoModeEnvironment(o, parseSettingsFileUncached(s).settings)) ||
    hasServerAutoModeEnvironment(o, getSettingsForSource("policySettings"))
  );
}
//@ chunk-pjm08t7p.js:14770-14871 placement
function hasServerAutoModeEnvironment(n, e) {
  let safeParse = n.safeParse(e?.autoMode);
  return safeParse.success && (safeParse.data?.environment?.length ?? 0) > 0;
}
//@ chunk-pjm08t7p.js:14871-15618 placement
async function applyAutoModeEnvironment(n, e) {
  let i =
    n.autoModeEnvironment.length === 0
      ? void 0
      : e.userAutoModeEnvironmentConfigured
        ? n.autoModeEnvironment
        : [DEFAULTS_PLACEHOLDER, ...n.autoModeEnvironment];
  if (!n.mcpConfigJson && !n.appendSystemPrompt)
    return n.extraArgs.length > 0 || i !== void 0
      ? { extraArgs: n.extraArgs, autoModeEnvironment: i }
      : void 0;
  let r = await writePrivateConfigDir(e.sessionId);
  try {
    let o;
    if (n.mcpConfigJson) {
      let l = join(r, MCP_JSON);
      (await writeFile(l, n.mcpConfigJson, { flag: "wx", mode: 384 }),
        (o = { path: l, ingressUrl: e.apiBaseUrl }));
    }
    let s;
    if (n.appendSystemPrompt) {
      let l = join(r, APPEND_SYSTEM_PROMPT_TXT),
        buffer = Buffer.from(n.appendSystemPrompt, "utf8");
      (await writeFile(l, buffer, { flag: "wx", mode: 384 }),
        (s = { path: l, sha256: createHash("sha256").update(buffer).digest("hex") }));
    }
    return { extraArgs: n.extraArgs, dir: r, mcpConfig: o, appendSystemPrompt: s, autoModeEnvironment: i };
  } catch (error) {
    throw (await removeRecursiveQuietly(r), error);
  }
}
//@ chunk-pjm08t7p.js:15618-16151 placement
async function writePrivateConfigDir(n) {
  for (let e = 0; ; e++)
    try {
      let i = await ensurePrivateDir(),
        r = await lstat(i);
      if (!r.isDirectory()) throw Error("bridge spawn root is not a directory");
      if (getPlatform() !== "windows") {
        if ((typeof process.getuid === "function" && r.uid !== process.getuid()) || (r.mode & 63) !== 0)
          throw Error("bridge spawn root has unexpected owner or mode");
      }
      let o = await mkdtemp(join(i, `${safeFilenameId(n)}-`)),
        s = await lstat(i).catch(() => null);
      if (s?.dev !== r.dev || s.ino !== r.ino)
        throw (await removeRecursiveQuietly(o), Error("bridge spawn root changed identity during mkdtemp"));
      return o;
    } catch (error) {
      if (e > 0 || getErrnoCode(error) !== "ENOENT") throw error;
    }
}
//@ chunk-pjm08t7p.js:16151-16221 placement = convertDirectoryToZipInPlace (1)
async function removeRecursiveQuietly(n) {
  await rm(n, { recursive: !0, force: !0 }).catch(() => {});
}
//@ chunk-pjm08t7p.js:16221-16268 placement
async function cleanupServerConfigDir(n) {
  if (n?.dir) await removeRecursiveQuietly(n.dir);
}
//@ chunk-pjm08t7p.js:16268-16531 placement
function logConfigNotApplied(n, e) {
  (logForDebugging(
    `[bridge:server-config] not applied sessionId=${n}: gate_off (tengu_bridge_apply_server_session_config=false)`,
    { level: "warn" },
  ),
    logEvent("tengu_bridge_server_config_rejected", { ...e, reason: lit("gate_off") }),
    logFeatureSad("bridge_server_session_config", "gate_off", e));
}
/**
 * 把桥接服务器下发的会话配置（参数、MCP、自动模式环境等）应用到本地启动，受开关控制。
 */
//@ chunk-pjm08t7p.js:16531-18590 placement
async function applyBridgeServerConfig(n, e) {
  let i = carriedConfigFlags(n);
  if (!Object.values(i).some(Boolean)) return;
  if (!e.enabled) {
    logConfigNotApplied(e.sessionId, i);
    return;
  }
  let r = le,
    o,
    s;
  try {
    r = applyBridgeServerArgs(
      e.dropAutoModeEnvironment === void 0 ? n : { ...n, auto_mode_environment: void 0 },
      e,
    );
    let E =
      r.autoModeEnvironment.length > 0 && e.userAutoModeEnvironmentConfigured === void 0
        ? { ...e, userAutoModeEnvironmentConfigured: await loadAutoModeSettingsModules() }
        : e;
    o = await applyAutoModeEnvironment(r, E);
  } catch (error) {
    s = errorMessage(error);
  }
  let l = {
    ...i,
    extra_args: r.extraArgs.length,
    append_prompt: r.appendSystemPrompt !== null,
    meta_mcp: r.mcpConfigJson !== null,
    auto_allow: r.autoAllowTools.length,
    auto_mode_environment: r.autoModeEnvironment.length,
    ...(e.dropAutoModeEnvironment !== void 0 && {
      auto_mode_environment_drop: fromEnum(e.dropAutoModeEnvironment),
    }),
    ignored_mcp: r.ignoredMcpServers,
    ...(r.metaDropReason !== null && { meta_drop: fromEnum(r.metaDropReason) }),
  };
  if (s !== void 0) {
    (logForDebugging(`[bridge:server-config] not applied sessionId=${e.sessionId}: ${s}`, { level: "warn" }),
      logEvent("tengu_bridge_server_config_rejected", { ...l, reason: lit("prepare_failed") }),
      logFeatureBad("bridge_server_session_config", "prepare_failed", l));
    return;
  }
  if (!o) {
    (logForDebugging(
      `[bridge:server-config] nothing applied sessionId=${e.sessionId}: every carried value was rejected`,
      { level: "warn" },
    ),
      logEvent("tengu_bridge_server_config_rejected", { ...l, reason: lit("nothing_applied") }),
      logFeatureSad("bridge_server_session_config", "nothing_applied", l));
    return;
  }
  let p = r.mcpConfigJson ? "present" : r.metaDropReason ? `dropped:${r.metaDropReason}` : "unset";
  if (
    (logForDebugging(
      `[bridge:server-config] applied sessionId=${e.sessionId} args=${r.extraArgs.length} appendPrompt=${r.appendSystemPrompt ? "present" : "unset"} metaMcp=${p} autoAllow=${r.autoAllowTools.length} autoModeEnvironment=${r.autoModeEnvironment.length}`,
      { level: r.metaDropReason ? "warn" : "debug" },
    ),
    logEvent("tengu_bridge_server_config_applied", l),
    r.metaDropReason !== null)
  )
    logFeatureSad("bridge_server_session_config", "meta_mcp_not_verified", l);
  else if (i.carried_auto_mode_environment && r.autoModeEnvironment.length === 0)
    logFeatureSad(
      "bridge_server_session_config",
      e.dropAutoModeEnvironment === void 0
        ? "auto_mode_environment_dropped"
        : `auto_mode_environment_${e.dropAutoModeEnvironment}`,
      l,
    );
  else logFeatureOk("bridge_server_session_config", l);
  return o;
}

export {
  applyBridgeServerConfig,
  carriedModelArgs,
  cleanupServerConfigDir,
  logConfigNotApplied,
  carriedConfigFlags,
  applyBridgeServerArgs,
  carriedModel,
  carriedEffort,
};
