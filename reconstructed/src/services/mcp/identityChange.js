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
import { fd, getDiscoveryCacheStore, resolveMcpAccountIdentity } from "./mcpAccountKey.js";
import { ht } from "./cliOwnedClients.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";

//@ chunk-0qyh5wah.js:1567-1761 placement
function noteResolvedIdentity(e) {
  if (e.kind !== "resolved" || !fd()) return;
  let r = getDiscoveryCacheStore(),
    lastResolvedAccountToken = r.lastResolvedAccountToken;
  if (
    ((r.lastResolvedAccountToken = e.token),
    lastResolvedAccountToken === void 0 || lastResolvedAccountToken === e.token)
  )
    return;
  ((ht().identityEpoch += 1), noteIdentityChanged(), notifyIdentityTripped());
}
//@ chunk-0qyh5wah.js:1761-2028 placement
function notifyIdentityTripped() {
  let e = ht();
  if (!e.identityTrippedHandler) {
    e.identityTripUnowned = !0;
    return;
  }
  queueMicrotask(() => {
    let identityTrippedHandler = ht().identityTrippedHandler;
    if (!identityTrippedHandler) {
      ht().identityTripUnowned = !0;
      return;
    }
    try {
      identityTrippedHandler();
    } catch (error) {
      logForDebugging(`MCP identity-change handler failed: ${errorMessage(error)}`, { level: "warn" });
    }
  });
}
//@ chunk-0qyh5wah.js:2028-2157 placement
function setIdentityTrippedHandler(e) {
  let r = ht();
  return (
    (r.identityTrippedHandler = e),
    () => {
      if (r.identityTrippedHandler === e) r.identityTrippedHandler = null;
    }
  );
}
//@ chunk-0qyh5wah.js:2157-2241 placement
function V4n() {
  let e = ht(),
    identityTripUnowned = e.identityTripUnowned;
  return ((e.identityTripUnowned = !1), identityTripUnowned);
}
//@ chunk-0qyh5wah.js:2241-2281 placement
function ue() {
  if (!fd()) return;
  noteResolvedIdentity(resolveMcpAccountIdentity());
}
//@ chunk-0qyh5wah.js:2281-2323 placement
function getMcpIdentitySnapshot() {
  let e = resolveMcpAccountIdentity();
  return (noteResolvedIdentity(e), e);
}
//@ chunk-0qyh5wah.js:2323-2414 placement
function isMcpIdentityIncomplete() {
  let e = getMcpIdentitySnapshot();
  return e.kind === "unwired" || e.kind === "incomplete" ? void 0 : e.token;
}
//@ chunk-0qyh5wah.js:2414-2459 placement
function identityEpoch() {
  return (ue(), ht().identityEpoch);
}
//@ chunk-0qyh5wah.js:2459-2559 placement
function bumpIdentityEpoch() {
  let e = ht();
  if (!fd()) return e.identityEpoch;
  return ((e.identityEpoch += 1), e.identityEpoch);
}
//@ chunk-0qyh5wah.js:2559-2585 placement
var BASELINE_REARMED = "baseline:rearmed";
//@ chunk-0qyh5wah.js:2585-2655 placement
function uzs() {
  if (!fd()) return;
  (bumpIdentityEpoch(), (getDiscoveryCacheStore().lastResolvedAccountToken = BASELINE_REARMED));
}
//@ chunk-0qyh5wah.js:2655-2705 placement
function isCurrentIdentityEpoch(e) {
  return (ue(), e === ht().identityEpoch);
}
//@ chunk-0qyh5wah.js:2705-2846 placement
function noteIdentityChanged() {
  let e = ht();
  if (e.identityChangedThisProcess) return;
  ((e.identityChangedThisProcess = !0), logFeatureSad("mcp_discovery_cache", "identity_changed"));
}
//@ chunk-0qyh5wah.js:2846-2904 placement
function identityChangedThisProcess() {
  return (ue(), ht().identityChangedThisProcess);
}

export {
  identityChangedThisProcess,
  getMcpIdentitySnapshot,
  isCurrentIdentityEpoch,
  identityEpoch,
  noteIdentityChanged,
  bumpIdentityEpoch,
  setIdentityTrippedHandler,
  V4n,
  uzs,
  isMcpIdentityIncomplete,
};
