/**
 * services/mcp/identityChange.ts
 *
 * 2.1.316 新增：MCP 身份变化（代际）处理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0qyh5wah.js (14)
 * attribution: placement 14
 */
import { isDiscoveryCacheOn, getDiscoveryCacheStore, resolveMcpAccountIdentity } from "./mcpAccountKey.js";
import { getCliOwnedState } from "./cliOwnedClients.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";

//@ chunk-0qyh5wah.js:1567-1761 placement
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
//@ chunk-0qyh5wah.js:1761-2028 placement
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
//@ chunk-0qyh5wah.js:2028-2157 placement
function setIdentityTrippedHandler(e) {
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.identityTrippedHandler = e;
  return () => {
    if (cliOwnedState.identityTrippedHandler === e) cliOwnedState.identityTrippedHandler = null;
  };
}
//@ chunk-0qyh5wah.js:2157-2241 placement
/**
 * 取出并清空“身份变化未被认领”标记。
 */
function takeIdentityTripUnowned() {
  let cliOwnedState = getCliOwnedState();
  let identityTripUnowned = cliOwnedState.identityTripUnowned;
  cliOwnedState.identityTripUnowned = false;
  return identityTripUnowned;
}
//@ chunk-0qyh5wah.js:2241-2281 placement
/**
 * 必要时解析并记录当前 MCP 账号身份。
 */
function resolveIdentityIfNeeded() {
  if (!isDiscoveryCacheOn()) return;
  noteResolvedIdentity(resolveMcpAccountIdentity());
}
//@ chunk-0qyh5wah.js:2281-2323 placement
function getMcpIdentitySnapshot() {
  let mcpAccountIdentity = resolveMcpAccountIdentity();
  noteResolvedIdentity(mcpAccountIdentity);
  return mcpAccountIdentity;
}
//@ chunk-0qyh5wah.js:2323-2414 placement
function isMcpIdentityIncomplete() {
  let mcpIdentitySnapshot = getMcpIdentitySnapshot();
  return mcpIdentitySnapshot.kind === "unwired" || mcpIdentitySnapshot.kind === "incomplete"
    ? undefined
    : mcpIdentitySnapshot.token;
}
//@ chunk-0qyh5wah.js:2414-2459 placement
function identityEpoch() {
  resolveIdentityIfNeeded();
  return getCliOwnedState().identityEpoch;
}
//@ chunk-0qyh5wah.js:2459-2559 placement
function bumpIdentityEpoch() {
  let cliOwnedState = getCliOwnedState();
  if (!isDiscoveryCacheOn()) return cliOwnedState.identityEpoch;
  cliOwnedState.identityEpoch += 1;
  return cliOwnedState.identityEpoch;
}
//@ chunk-0qyh5wah.js:2559-2585 placement
var BASELINE_REARMED = "baseline:rearmed";
//@ chunk-0qyh5wah.js:2585-2655 placement
/**
 * 重新设定身份基线并递增身份代号。
 */
function rearmIdentityBaseline() {
  if (!isDiscoveryCacheOn()) return;
  bumpIdentityEpoch();
  getDiscoveryCacheStore().lastResolvedAccountToken = BASELINE_REARMED;
}
//@ chunk-0qyh5wah.js:2655-2705 placement
function isCurrentIdentityEpoch(e) {
  resolveIdentityIfNeeded();
  return e === getCliOwnedState().identityEpoch;
}
//@ chunk-0qyh5wah.js:2705-2846 placement
function noteIdentityChanged() {
  let cliOwnedState = getCliOwnedState();
  if (cliOwnedState.identityChangedThisProcess) return;
  cliOwnedState.identityChangedThisProcess = true;
  logFeatureSad("mcp_discovery_cache", "identity_changed");
}
//@ chunk-0qyh5wah.js:2846-2904 placement
function identityChangedThisProcess() {
  resolveIdentityIfNeeded();
  return getCliOwnedState().identityChangedThisProcess;
}
export {
  identityChangedThisProcess,
  getMcpIdentitySnapshot,
  isCurrentIdentityEpoch,
  identityEpoch,
  noteIdentityChanged,
  bumpIdentityEpoch,
  setIdentityTrippedHandler,
  takeIdentityTripUnowned,
  rearmIdentityBaseline,
  isMcpIdentityIncomplete,
};
