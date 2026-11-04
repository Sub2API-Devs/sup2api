/**
 * services/mcp/deviceMcpServers.ts
 *
 * 2.1.316 新增：设备桥可转发的 MCP 服务器配置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p0p8bkgp.js (9)
 * attribution: placement 9
 */
import { isMcpServerDenied, isMcpServerDisabled, emptyServerMap, getClaudeCodeMcpConfigs } from "./config.js";
import { REMOTE_DEVICES } from "./firstPartyServerIds.js";
import { awaitPolicyColdStartWaiter } from "../policyLimits/coldStartWaiter.js";
import { ensureMdmLoaded } from "../../utils/settings/mdm/mdmLoader.js";
import { shouldAskPerServer } from "../deviceBridge/deviceMcpConsent.js";
import { pickByHelper } from "../../utils/git/gitSafeEnv.js";
import { getStrictMcpConfig } from "../../bootstrap/state.js";
import { isBareMode } from "../../utils/envUtils.js";

//@ chunk-p0p8bkgp.js:490-519 placement
function isDeviceMcpDenied() {
  return isMcpServerDenied(REMOTE_DEVICES);
}
//@ chunk-p0p8bkgp.js:519-572 placement
async function loadDeviceMcpSources() {
  await Promise.all([awaitPolicyColdStartWaiter(), ensureMdmLoaded()]);
}
//@ chunk-p0p8bkgp.js:572-618 placement
function isDeviceScopeEnabled(name, config) {
  return shouldAskPerServer(config.scope) && !isMcpServerDisabled(name);
}
//@ chunk-p0p8bkgp.js:618-659 placement
function isForwardableDeviceMcp(name, config) {
  return isDeviceScopeEnabled(name, config) && !isFirstPartyDesignConfig(config);
}
//@ chunk-p0p8bkgp.js:659-763 placement
function isFirstPartyDesignConfig(config) {
  return require("./emitTripwireEvent.lazy.js").mcpClientModule().isFirstPartyDesignServerConfig(config);
}
//@ chunk-p0p8bkgp.js:763-925 placement = expandEnvVars (0.913)
/**
 * isDeviceBridgeTransport：设备桥接只转发 stdio/http/sse/ws 服务器。
 */
function isDeviceBridgeTransport(config) {
  switch (config.type) {
    case undefined:
    case "stdio":
    case "http":
    case "sse":
    case "ws":
      return true;
    case "sdk":
    case "sse-ide":
    case "ws-ide":
    case "claudeai-proxy":
      return false;
  }
}
//@ chunk-p0p8bkgp.js:925-976 placement
/**
 * 收集可转发给设备桥接的 MCP 服务器配置。
 */
function getDeviceBridgeMcpConfigs(servers) {
  return Object.assign(emptyServerMap(), pickByHelper(servers, isDeviceBridgeTransport));
}
//@ chunk-p0p8bkgp.js:976-1189 placement
/**
 * getDeviceBridgeMcpConfigs：为设备桥接（deviceBridge 目的）收集可转发的服务器配置。
 */
async function getDeviceBridgeMcpConfigs_2({ storageV5 } = {}) {
  if (getStrictMcpConfig() || isBareMode())
    return {
      configs: emptyServerMap(),
      deniedBySettings: false,
    };
  await loadDeviceMcpSources();
  let { servers } = await getClaudeCodeMcpConfigs(
    {},
    {
      purpose: "deviceBridge",
      storageV5,
    },
  );
  return {
    configs: getDeviceBridgeMcpConfigs(servers),
    deniedBySettings: isDeviceMcpDenied(),
  };
}
//@ chunk-p0p8bkgp.js:1189-1277 placement
async function getDeviceBridgeMcpServers(options = {}) {
  let { configs, deniedBySettings } = await getDeviceBridgeMcpConfigs_2(options);
  return deniedBySettings ? emptyServerMap() : configs;
}
export {
  loadDeviceMcpSources,
  isDeviceMcpDenied,
  getDeviceBridgeMcpServers,
  isForwardableDeviceMcp,
  isDeviceBridgeTransport,
  getDeviceBridgeMcpConfigs_2,
  isDeviceScopeEnabled,
};
