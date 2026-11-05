/**
 * services/mcp/mcpConfigProvenance.ts
 *
 * 2.1.316 新增：MCP 配置来源合并与策略剔除
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hjswk319.js (12)
 * attribution: placement 12
 */
import { classifyServerLocation } from "../../cli/cloudSession/validateCloudFlags.js";
import { isByocEnvironment } from "../../utils/remoteEnvironment.js";
import { env } from "../../utils/env.js";
import { parseMcpConfigFromFilePath, supportsEnvExpansion, isBuiltinInProcessMcpServer } from "./config.js";
import { logForDebugging } from "../../utils/debug.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { isChildSession } from "../../utils/sessionShape.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { getPrefixServerKey } from "./mcpStringUtils.js";
import { isPluginServerConfig } from "./types.js";
import { firstPartyServerIdFor, getCliOwnedState } from "./cliOwnedClients.js";
import { isSafeMode } from "../../utils/envUtils.js";
import { isHermeticRemoteSession } from "../cloudSessions/eligibility.js";
import { isCcrInjectedConfig, isOwnToolContainerConfig } from "../analytics/metadata.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-hjswk319.js:59579-59852 placement
function mcpServerKindFlags(mcpConfigs) {
  let kinds = new Set();
  for (let config of mcpConfigs) kinds.add(classifyServerLocation(config));
  return {
    has_mcp_stdio: kinds.has("stdio"),
    has_mcp_managed: kinds.has("managed"),
    has_mcp_localhost: kinds.has("localhost"),
    has_mcp_private_network: kinds.has("private_network"),
    has_mcp_public: kinds.has("public"),
    has_mcp_other: kinds.has("other"),
  };
}
//@ chunk-hjswk319.js:59898-60487 placement
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
//@ chunk-hjswk319.js:60487-61101 placement
function mcpConfigProvenanceNote(hostOwnedNames, declaredCount) {
  if (hostOwnedNames !== undefined)
    return {
      text: replaceControlChars(
        `--mcp-config provenance: declared (${hostOwnedNames.size} host-delivered: ${[...hostOwnedNames].join(", ")})`,
      ),
      level: "debug",
    };
  if (declaredCount === 0) return;
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
//@ chunk-hjswk319.js:61101-61286 placement
function sameCommandServers(configs, servers) {
  if (servers === undefined) return;
  let same = new Set();
  for (let [key, value] of Object.entries(configs))
    if (
      Object.hasOwn(servers, key) &&
      import_sortedIndex_2(
        omitAlias(value, "configuredCommand"),
        omitAlias(servers[key], "configuredCommand"),
      )
    )
      same.add(key);
  return same;
}
//@ chunk-hjswk319.js:61286-62339 placement
/**
 * 合并多个来源的 MCP 配置，并按 --mcp-config 来源声明标记或剔除。
 */
function mergeMcpConfigs(localConfigs, skippedNames, remoteMcpConfig) {
  let merged = Object.fromEntries(localConfigs.flatMap((configs) => Object.entries(configs)));
  if (remoteMcpConfig === undefined)
    return {
      servers: merged,
      ownership: undefined,
      refused: [],
    };
  let operatorByName = new Map();
  let deliveredSameCommand = new Set();
  for (let configs of localConfigs) {
    let sameCommand = sameCommandServers(configs, remoteMcpConfig.servers);
    for (let [key, value] of Object.entries(configs))
      if (sameCommand?.has(key)) deliveredSameCommand.add(key);
      else operatorByName.set(key, value);
  }
  let operatorNames = new Set([
    ...operatorByName.keys(),
    ...skippedNames.filter((name) => !remoteMcpConfig.skippedNames.has(name)),
  ]);
  let byPrefix = new Map([...operatorNames].map((name) => [getPrefixServerKey(name), name]));
  let kept = [];
  let hostOwnedNames = new Set();
  let refused = [];
  for (let [key, value] of Object.entries(merged)) {
    let operatorConfig = operatorByName.get(key);
    if (operatorConfig !== undefined) kept.push([key, operatorConfig]);
    if (!deliveredSameCommand.has(key)) continue;
    let prefixServerKey = getPrefixServerKey(key);
    let conflictingName = byPrefix.get(prefixServerKey);
    if (conflictingName === undefined) {
      kept.push([key, value]);
      hostOwnedNames.add(key);
      continue;
    }
    refused.push({
      name: key,
      type: "reserved_name",
      message: replaceControlChars(
        operatorNames.has(key)
          ? `The delivered MCP server "${key}" was not loaded: this runner's operator defines a server of that name with --mcp-config. Rename one of the two.`
          : `MCP server "${key}" was not loaded: its tool names would start with mcp__${prefixServerKey}__, the same as those of "${conflictingName}", which this runner's operator added with --mcp-config. Rename one of the two.`,
      ),
    });
  }
  return {
    servers: Object.fromEntries(kept),
    ownership: {
      hostOwnedNames,
      operatorNames,
    },
    refused,
  };
}
//@ chunk-hjswk319.js:62339-62740 placement
function partitionOperatorServers(clients, ownership) {
  let hostOwnedConfigs = Object.create(null);
  let operatorOwnedNames = new Set(ownership?.operatorNames);
  let operatorOwnedConfigs = Object.create(null);
  for (let client of clients) {
    if (!(
      client.config.scope === "dynamic" &&
      !isPluginServerConfig(client.config) &&
      supportsEnvExpansion(client.config) &&
      !isBuiltinInProcessMcpServer(client.name) &&
      firstPartyServerIdFor(client.config) === undefined
    ))
      continue;
    if (ownership === undefined || ownership.hostOwnedNames.has(client.name))
      hostOwnedConfigs[client.name] = client.config;
    else {
      operatorOwnedNames.add(client.name);
      operatorOwnedConfigs[client.name] = client.config;
    }
  }
  return {
    hostOwnedConfigs,
    operatorOwnedMcpConfigNames: operatorOwnedNames,
    operatorOwnedConfigs,
  };
}
//@ chunk-hjswk319.js:62740-62820 placement
var OPERATOR_SUPPLIED_IGNORED_TEXT = "Configured via --mcp-config on this host (operator-supplied); ignored";
//@ chunk-hjswk319.js:62820-63538 placement
/**
 * 按企业 MCP 配置与侧载策略剔除服务器，记录被保留但不在允许列表中的项。
 */
function applyMcpPolicyDrops(
  servers,
  { dropForEnterpriseMcpConfig, dropForSideloadPolicy = false, keptDespiteAllowlist = [] },
) {
  let dropReason = isSafeMode()
    ? "safe mode"
    : isHermeticRemoteSession()
      ? "hermetic mode"
      : dropForEnterpriseMcpConfig
        ? "enterprise MCP config"
        : dropForSideloadPolicy
          ? "disableSideloadFlags policy"
          : undefined;
  if (!dropReason)
    return {
      servers,
      dropped: [],
      keptNotes: removalNoteLines(
        "allowedMcpServers",
        keptDespiteAllowlist.filter((name) => Object.hasOwn(servers, name)),
      ),
      reason: dropReason,
    };
  let keptServers = {};
  let dropped = [];
  let keptNotes = [];
  let isEnterprise = dropReason === "enterprise MCP config" || dropReason === "disableSideloadFlags policy";
  for (let [key, value] of Object.entries(servers))
    if (isAlwaysKeptServer(value, isEnterprise, dropReason === "disableSideloadFlags policy")) {
      keptServers[key] = value;
      if (isEnterprise && isCcrInjectedConfig(value)) keptNotes.push(key);
    } else dropped.push(key);
  return {
    servers: keptServers,
    dropped,
    keptNotes: [
      ...removalNoteLines(
        "allowedMcpServers",
        keptDespiteAllowlist.filter((name) => Object.hasOwn(keptServers, name)),
      ),
      ...removalNoteLines(
        dropReason === "enterprise MCP config" ? "managed-mcp.json" : "disableSideloadFlags",
        keptNotes,
      ),
    ],
    reason: dropReason,
  };
}
//@ chunk-hjswk319.js:63538-63602 placement
function isAlwaysKeptServer(config, keepCcrInjected, keepOwnToolContainer) {
  return (
    config.type === "sdk" ||
    (keepOwnToolContainer && isOwnToolContainerConfig(config)) ||
    (keepCcrInjected && isCcrInjectedConfig(config))
  );
}
//@ chunk-hjswk319.js:63602-63903 placement
function removalNoteLines(settingName, names) {
  if (names.length === 0) return [];
  let isSingle = names.length === 1;
  return [
    `Note: ${settingName} does not remove the MCP ${plural(names.length, "server")} Claude Code adds to its own remote sessions: ${names.join(", ")}. To remove ${isSingle ? "it" : "one"}, add {"serverName": "${isSingle ? names[0] : "<name>"}"} to deniedMcpServers in managed settings.`,
  ];
}
//@ chunk-hjswk319.js:63903-63956 placement
function recordSkippedDynamicServers(names) {
  getCliOwnedState().skippedDynamicServers.push(...names);
}
//@ chunk-hjswk319.js:63956-64005 placement
function getSkippedDynamicServers() {
  return getCliOwnedState().skippedDynamicServers;
}
export {
  OPERATOR_SUPPLIED_IGNORED_TEXT,
  isAlwaysKeptServer,
  partitionOperatorServers,
  getSkippedDynamicServers,
  mcpServerKindFlags,
  loadRemoteMcpConfig,
  mergeMcpConfigs,
  recordSkippedDynamicServers,
  applyMcpPolicyDrops,
  mcpConfigProvenanceNote,
};
