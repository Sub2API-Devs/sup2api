/**
 * services/mcp/identityChange.ts
 *
 * 2.1.316 新增：MCP 身份变化（代际）处理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kbr8ch1e.js (14)
 * attribution: placement 14
 */
import { isDiscoveryCacheOn, getDiscoveryCacheStore, resolveMcpAccountIdentity } from "./mcpAccountKey.js";
import { getCliOwnedState } from "./cliOwnedClients.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";

//@ chunk-kbr8ch1e.js:1565-1759 placement
function noteResolvedIdentity(mcpAccountIdentity) {
  if (mcpAccountIdentity.kind !== "resolved" || !isDiscoveryCacheOn()) return;
  let discoveryCacheStore = getDiscoveryCacheStore();
  let lastResolvedAccountToken = discoveryCacheStore.lastResolvedAccountToken;
  discoveryCacheStore.lastResolvedAccountToken = mcpAccountIdentity.token;
  if (lastResolvedAccountToken === undefined || lastResolvedAccountToken === mcpAccountIdentity.token) return;
  getCliOwnedState().identityEpoch += 1;
  noteIdentityChanged();
  notifyIdentityTripped();
}
//@ chunk-kbr8ch1e.js:1759-2026 placement
function notifyIdentityTripped() {
  let cliOwnedState = getCliOwnedState();
  if (!cliOwnedState.identityTrippedHandler) {
    cliOwnedState.identityTripUnowned = true;
    return;
  }
  queueMicrotask(() => {
    let identityTrippedHandler = getCliOwnedState().identityTrippedHandler;
    if (!identityTrippedHandler) {
      getCliOwnedState().identityTripUnowned = true;
      return;
    }
    try {
      identityTrippedHandler();
    } catch (error) {
      logForDebugging(`MCP identity-change handler failed: ${errorMessage(error)}`, {
        level: "warn",
      });
    }
  });
}
//@ chunk-kbr8ch1e.js:2026-2155 placement
function setIdentityTrippedHandler(handler) {
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.identityTrippedHandler = handler;
  return () => {
    if (cliOwnedState.identityTrippedHandler === handler) cliOwnedState.identityTrippedHandler = null;
  };
}
//@ chunk-kbr8ch1e.js:2155-2239 placement
/**
 * 取出并清空“身份变化未被认领”标记。
 */
function takeIdentityTripUnowned() {
  let cliOwnedState = getCliOwnedState();
  let identityTripUnowned = cliOwnedState.identityTripUnowned;
  cliOwnedState.identityTripUnowned = false;
  return identityTripUnowned;
}
//@ chunk-kbr8ch1e.js:2239-2279 placement
/**
 * 必要时解析并记录当前 MCP 账号身份。
 */
function resolveIdentityIfNeeded() {
  if (!isDiscoveryCacheOn()) return;
  noteResolvedIdentity(resolveMcpAccountIdentity());
}
//@ chunk-kbr8ch1e.js:2279-2321 placement
function getMcpIdentitySnapshot() {
  let mcpAccountIdentity = resolveMcpAccountIdentity();
  noteResolvedIdentity(mcpAccountIdentity);
  return mcpAccountIdentity;
}
//@ chunk-kbr8ch1e.js:2321-2412 placement
function isMcpIdentityIncomplete() {
  let mcpIdentitySnapshot = getMcpIdentitySnapshot();
  return mcpIdentitySnapshot.kind === "unwired" || mcpIdentitySnapshot.kind === "incomplete"
    ? undefined
    : mcpIdentitySnapshot.token;
}
//@ chunk-kbr8ch1e.js:2412-2457 placement
function identityEpoch() {
  resolveIdentityIfNeeded();
  return getCliOwnedState().identityEpoch;
}
//@ chunk-kbr8ch1e.js:2457-2557 placement
function bumpIdentityEpoch() {
  let cliOwnedState = getCliOwnedState();
  if (!isDiscoveryCacheOn()) return cliOwnedState.identityEpoch;
  cliOwnedState.identityEpoch += 1;
  return cliOwnedState.identityEpoch;
}
//@ chunk-kbr8ch1e.js:2557-2583 placement
var BASELINE_REARMED = "baseline:rearmed";
//@ chunk-kbr8ch1e.js:2583-2653 placement
/**
 * 重新设定身份基线并递增身份代号。
 */
function rearmIdentityBaseline() {
  if (!isDiscoveryCacheOn()) return;
  bumpIdentityEpoch();
  getDiscoveryCacheStore().lastResolvedAccountToken = BASELINE_REARMED;
}
//@ chunk-kbr8ch1e.js:2653-2703 placement
function isCurrentIdentityEpoch(epoch) {
  resolveIdentityIfNeeded();
  return epoch === getCliOwnedState().identityEpoch;
}
//@ chunk-kbr8ch1e.js:2703-2844 placement
function noteIdentityChanged() {
  let cliOwnedState = getCliOwnedState();
  if (cliOwnedState.identityChangedThisProcess) return;
  cliOwnedState.identityChangedThisProcess = true;
  logFeatureSad("mcp_discovery_cache", "identity_changed");
}
//@ chunk-kbr8ch1e.js:2844-2902 placement
function identityChangedThisProcess() {
  resolveIdentityIfNeeded();
  return getCliOwnedState().identityChangedThisProcess;
}
export {
  identityEpoch,
  setIdentityTrippedHandler,
  takeIdentityTripUnowned,
  rearmIdentityBaseline,
  noteIdentityChanged,
  bumpIdentityEpoch,
  isCurrentIdentityEpoch,
  getMcpIdentitySnapshot,
  isMcpIdentityIncomplete,
  identityChangedThisProcess,
};
