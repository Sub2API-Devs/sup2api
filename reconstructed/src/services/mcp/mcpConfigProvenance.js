/**
 * services/mcp/mcpConfigProvenance.ts
 *
 * 2.1.316 新增：MCP 配置来源合并与策略剔除
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wek6r2k.js (12)
 * attribution: placement 12
 */
import { classifyServerLocation } from "../../cli/cloudSession/validateCloudFlags.js";
import { isByocEnvironment } from "../../utils/remoteEnvironment.js";
import { env } from "../../utils/env.js";
import { parseMcpConfigFromFilePath, supportsEnvExpansion, isBuiltinInProcessMcpServer } from "./config.js";
import { logForDebugging } from "../../utils/debug.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { isChildSession } from "../../utils/sessionShape.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { getPrefixServerKey } from "../../components/agents/ToolSelector.js";
import { isPluginServerConfig } from "./types.js";
import { firstPartyServerIdFor, getCliOwnedState } from "./cliOwnedClients.js";
import { isSafeMode } from "../../utils/envUtils.js";
import { isHermeticRemoteSession } from "../cloudSessions/eligibility.js";
import { isCcrInjectedConfig, isOwnToolContainerConfig } from "../analytics/metadata.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-3wek6r2k.js:60150-60423 placement
function mcpServerKindFlags(mcpConfigs) {
  let o = new Set();
  for (let n of mcpConfigs) o.add(classifyServerLocation(n));
  return {
    has_mcp_stdio: o.has("stdio"),
    has_mcp_managed: o.has("managed"),
    has_mcp_localhost: o.has("localhost"),
    has_mcp_private_network: o.has("private_network"),
    has_mcp_public: o.has("public"),
    has_mcp_other: o.has("other"),
  };
}
//@ chunk-3wek6r2k.js:60469-61058 placement
function loadRemoteMcpConfig(bridgeSessionId, getServerUrl) {
  let CLAUDE_CODE_REMOTE_MCP_CONFIG = isByocEnvironment() ? env.CLAUDE_CODE_REMOTE_MCP_CONFIG : undefined;
  if (!CLAUDE_CODE_REMOTE_MCP_CONFIG) return;
  let { config, errors } = parseMcpConfigFromFilePath({
    filePath: CLAUDE_CODE_REMOTE_MCP_CONFIG,
    expandVars: true,
    scope: "dynamic",
    bridgeSessionId,
  });
  if (config === null)
    logForDebugging(
      `--mcp-config: the runner's copy of the MCP servers it delivered cannot be used (${errors[0]?.message ?? "no reason given"}); updates and removals of the delivered MCP servers are ignored for this session`,
      {
        level: "warn",
      },
    );
  let mcpServers = config?.mcpServers ?? {};
  for (let [key, value] of Object.entries(mcpServers)) getServerUrl(key, value);
  return {
    servers: mcpServers,
    skippedNames: new Set(
      errors.flatMap(({ mcpErrorMetadata }) =>
        mcpErrorMetadata?.skipReason && mcpErrorMetadata.serverName != null
          ? [mcpErrorMetadata.serverName]
          : [],
      ),
    ),
  };
}
//@ chunk-3wek6r2k.js:61058-61672 placement
function mcpConfigProvenanceNote(hostOwnedNames, o) {
  if (hostOwnedNames !== undefined)
    return {
      text: replaceControlChars(
        `--mcp-config provenance: declared (${hostOwnedNames.size} host-delivered: ${[...hostOwnedNames].join(", ")})`,
      ),
      level: "debug",
    };
  if (o === 0) return;
  return isByocEnvironment() && !isChildSession()
    ? {
        text: "--mcp-config: CLAUDE_CODE_REMOTE_MCP_CONFIG did not reach this runner's session (a runner that does not send it, or a wrapper that does not pass it on), so an update of the delivered MCP servers shuts down every --mcp-config server it does not name, the operator's own included. Upgrade a self-hosted runner, or have the wrapper pass the variable on.",
        level: "warn",
      }
    : {
        text: "--mcp-config provenance: undeclared",
        level: "debug",
      };
}
//@ chunk-3wek6r2k.js:61672-61857 placement
function sameCommandServers(e, servers) {
  if (servers === undefined) return;
  let n = new Set();
  for (let [key, value] of Object.entries(e))
    if (
      Object.hasOwn(servers, key) &&
      En(Uo(value, "configuredCommand"), Uo(servers[key], "configuredCommand"))
    )
      n.add(key);
  return n;
}
//@ chunk-3wek6r2k.js:61857-62915 placement
/**
 * 合并多个来源的 MCP 配置，并按 --mcp-config 来源声明标记或剔除。
 */
function mergeMcpConfigs(e, o, remoteMcpConfig) {
  let r = Object.fromEntries(e.flatMap((w) => Object.entries(w)));
  if (remoteMcpConfig === undefined)
    return {
      servers: r,
      ownership: undefined,
      refused: [],
    };
  let u = new Map();
  let p = new Set();
  for (let w of e) {
    let P = sameCommandServers(w, remoteMcpConfig.servers);
    for (let [key, value] of Object.entries(w))
      if (P?.has(key)) p.add(key);
      else u.set(key, value);
  }
  let h = new Set([...u.keys(), ...o.filter((w) => !remoteMcpConfig.skippedNames.has(w))]);
  let S = new Map([...h].map((w) => [getPrefixServerKey(w), w]));
  let y = [];
  let M = new Set();
  let E = [];
  for (let [key, value] of Object.entries(r)) {
    let A = u.get(key);
    if (A !== undefined) y.push([key, A]);
    if (!p.has(key)) continue;
    let prefixServerKey = getPrefixServerKey(key);
    let q = S.get(prefixServerKey);
    if (q === undefined) {
      y.push([key, value]);
      M.add(key);
      continue;
    }
    E.push({
      name: key,
      type: "reserved_name",
      message: replaceControlChars(
        h.has(key)
          ? `The delivered MCP server "${key}" was not loaded: this runner's operator defines a server of that name with --mcp-config. Rename one of the two.`
          : `MCP server "${key}" was not loaded: its tool names would start with mcp__${prefixServerKey}__, the same as those of "${q}", which this runner's operator added with --mcp-config. Rename one of the two.`,
      ),
    });
  }
  return {
    servers: Object.fromEntries(y),
    ownership: {
      hostOwnedNames: M,
      operatorNames: h,
    },
    refused: E,
  };
}
//@ chunk-3wek6r2k.js:62915-63316 placement
function partitionOperatorServers(e, o) {
  let n = Object.create(null);
  let r = new Set(o?.operatorNames);
  let u = Object.create(null);
  for (let p of e) {
    if (!(
      p.config.scope === "dynamic" &&
      !isPluginServerConfig(p.config) &&
      supportsEnvExpansion(p.config) &&
      !isBuiltinInProcessMcpServer(p.name) &&
      firstPartyServerIdFor(p.config) === undefined
    ))
      continue;
    if (o === undefined || o.hostOwnedNames.has(p.name)) n[p.name] = p.config;
    else {
      r.add(p.name);
      u[p.name] = p.config;
    }
  }
  return {
    hostOwnedConfigs: n,
    operatorOwnedMcpConfigNames: r,
    operatorOwnedConfigs: u,
  };
}
//@ chunk-3wek6r2k.js:63316-63396 placement
var OPERATOR_SUPPLIED_IGNORED_TEXT = "Configured via --mcp-config on this host (operator-supplied); ignored";
//@ chunk-3wek6r2k.js:63396-64114 placement
/**
 * 按企业 MCP 配置与侧载策略剔除服务器，记录被保留但不在允许列表中的项。
 */
function applyMcpPolicyDrops(
  e,
  { dropForEnterpriseMcpConfig, dropForSideloadPolicy = false, keptDespiteAllowlist = [] },
) {
  let u = isSafeMode()
    ? "safe mode"
    : isHermeticRemoteSession()
      ? "hermetic mode"
      : dropForEnterpriseMcpConfig
        ? "enterprise MCP config"
        : dropForSideloadPolicy
          ? "disableSideloadFlags policy"
          : undefined;
  if (!u)
    return {
      servers: e,
      dropped: [],
      keptNotes: removalNoteLines(
        "allowedMcpServers",
        keptDespiteAllowlist.filter((M) => Object.hasOwn(e, M)),
      ),
      reason: u,
    };
  let p = {};
  let h = [];
  let S = [];
  let y = u === "enterprise MCP config" || u === "disableSideloadFlags policy";
  for (let [key, value] of Object.entries(e))
    if (isAlwaysKeptServer(value, y, u === "disableSideloadFlags policy")) {
      p[key] = value;
      if (y && isCcrInjectedConfig(value)) S.push(key);
    } else h.push(key);
  return {
    servers: p,
    dropped: h,
    keptNotes: [
      ...removalNoteLines(
        "allowedMcpServers",
        keptDespiteAllowlist.filter((M) => Object.hasOwn(p, M)),
      ),
      ...removalNoteLines(u === "enterprise MCP config" ? "managed-mcp.json" : "disableSideloadFlags", S),
    ],
    reason: u,
  };
}
//@ chunk-3wek6r2k.js:64114-64178 placement
function isAlwaysKeptServer(e, o, n) {
  return e.type === "sdk" || (n && isOwnToolContainerConfig(e)) || (o && isCcrInjectedConfig(e));
}
//@ chunk-3wek6r2k.js:64178-64479 placement
function removalNoteLines(e, o) {
  if (o.length === 0) return [];
  let n = o.length === 1;
  return [
    `Note: ${e} does not remove the MCP ${plural(o.length, "server")} Claude Code adds to its own remote sessions: ${o.join(", ")}. To remove ${n ? "it" : "one"}, add {"serverName": "${n ? o[0] : "<name>"}"} to deniedMcpServers in managed settings.`,
  ];
}
//@ chunk-3wek6r2k.js:64479-64532 placement
function recordSkippedDynamicServers(e) {
  getCliOwnedState().skippedDynamicServers.push(...e);
}
//@ chunk-3wek6r2k.js:64532-64581 placement
function getSkippedDynamicServers() {
  return getCliOwnedState().skippedDynamicServers;
}
export {
  mcpServerKindFlags,
  partitionOperatorServers,
  OPERATOR_SUPPLIED_IGNORED_TEXT,
  isAlwaysKeptServer,
  getSkippedDynamicServers,
  loadRemoteMcpConfig,
  mergeMcpConfigs,
  recordSkippedDynamicServers,
  applyMcpPolicyDrops,
  mcpConfigProvenanceNote,
};
