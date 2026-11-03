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
import { kA } from "../policyLimits/coldStartWaiter.js";
import { t1e } from "../../utils/settings/managedPluginTiers.js";
import { eAs } from "../deviceBridge/deviceMcpConsent.js";
import { Do } from "../../utils/git/gitSafeEnv.js";
import { getStrictMcpConfig } from "../../bootstrap/state.js";
import { isBareMode } from "../../utils/envUtils.js";

//@ chunk-p0p8bkgp.js:490-519 placement
function isDeviceMcpDenied() {
  return isMcpServerDenied(REMOTE_DEVICES);
}
//@ chunk-p0p8bkgp.js:519-572 placement
async function loadDeviceMcpSources() {
  await Promise.all([kA(), t1e()]);
}
//@ chunk-p0p8bkgp.js:572-618 placement
function isDeviceScopeEnabled(e, r) {
  return eAs(r.scope) && !isMcpServerDisabled(e);
}
//@ chunk-p0p8bkgp.js:618-659 placement
function isForwardableDeviceMcp(e, r) {
  return isDeviceScopeEnabled(e, r) && !isFirstPartyDesignConfig(r);
}
//@ chunk-p0p8bkgp.js:659-763 placement
function isFirstPartyDesignConfig(e) {
  return require("./chunk-asne9cp8.js").mcpClientModule().isFirstPartyDesignServerConfig(e);
}
/**
 * isDeviceBridgeTransport：设备桥接只转发 stdio/http/sse/ws 服务器。
 */
//@ chunk-p0p8bkgp.js:763-925 placement = expandEnvVars (0.913)
function isDeviceBridgeTransport(config) {
  switch (config.type) {
    case void 0:
    case "stdio":
    case "http":
    case "sse":
    case "ws":
      return !0;
    case "sdk":
    case "sse-ide":
    case "ws-ide":
    case "claudeai-proxy":
      return !1;
  }
}
//@ chunk-p0p8bkgp.js:925-976 placement
function i(e) {
  return Object.assign(emptyServerMap(), Do(e, isDeviceBridgeTransport));
}
/**
 * getDeviceBridgeMcpConfigs：为设备桥接（deviceBridge 目的）收集可转发的服务器配置。
 */
//@ chunk-p0p8bkgp.js:976-1189 placement
async function getDeviceBridgeMcpConfigs({ storageV5: e } = {}) {
  if (getStrictMcpConfig() || isBareMode()) return { configs: emptyServerMap(), deniedBySettings: !1 };
  await loadDeviceMcpSources();
  let { servers: servers } = await getClaudeCodeMcpConfigs({}, { purpose: "deviceBridge", storageV5: e });
  return { configs: i(servers), deniedBySettings: isDeviceMcpDenied() };
}
//@ chunk-p0p8bkgp.js:1189-1277 placement
async function getDeviceBridgeMcpServers(e = {}) {
  let { configs: configs, deniedBySettings: deniedBySettings } = await getDeviceBridgeMcpConfigs(e);
  return deniedBySettings ? emptyServerMap() : configs;
}

export {
  loadDeviceMcpSources,
  isDeviceMcpDenied,
  getDeviceBridgeMcpServers,
  isForwardableDeviceMcp,
  isDeviceBridgeTransport,
  getDeviceBridgeMcpConfigs,
  isDeviceScopeEnabled,
};
