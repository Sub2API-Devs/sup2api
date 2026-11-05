/**
 * services/teleport/relayState.ts
 *
 * 2.1.316 新增。teleport 中继（提示缓存中继）的进程内状态：激活/回退、gzip 与 thinking 处理、启动判定。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-w83r403t.js (41)
 * attribution: placement 41
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-w83r403t.js:367-692 placement
class TeleportLatch {
  state = {
    status: "inactive",
  };
  fallbackSadEmitted = new Set();
  toolsBaseline = {
    captured: false,
  };
  relayThinkingStripOwed = false;
  lastDispatchRelayed = false;
  lastDispatchFallback = undefined;
  openBootVerdict = undefined;
  bootSettled = false;
  handoffMarkerStep = undefined;
  enableStubsCalled = new Map();
  chromeSwitchedOn = undefined;
  forkDirectLines = new Set();
  relayRefusedGzip = false;
}
//@ chunk-w83r403t.js:692-720 placement
var teleportLatches; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-w83r403t.js:692", () => {
  teleportLatches = new SessionRootSlot(() => new TeleportLatch());
});
//@ chunk-w83r403t.js:720-752 placement
/**
 * 取当前会话的中继闩锁状态。
 */
function currentTeleportLatch() {
  return teleportLatches.of(getRootSession());
}
//@ chunk-w83r403t.js:752-783 placement
function getTeleportCacheState() {
  return currentTeleportLatch().state;
}
//@ chunk-w83r403t.js:783-885 placement
function activateTeleportCache(state) {
  let latch = currentTeleportLatch();
  if (latch.state.status !== "inactive") return;
  latch.state = state;
  latch.relayThinkingStripOwed = false;
}
//@ chunk-w83r403t.js:885-1297 placement
function revertTeleportCache(reason, sessionId, detail) {
  let latch = currentTeleportLatch();
  if (latch.state.status === "reverted") return;
  if (latch.state.status === "active") {
    if (
      reason === "device_tool_requested" ||
      reason === "device_tool_request_repeated" ||
      reason === "account_memory_withdrawn"
    )
      logForDiagnosticsNoPII("info", "cli_teleport_relay_ended", {
        reason,
      });
    else if (reason !== "direct_served") {
      logFeatureSad("upgrade_teleport_cache", reason);
      logTeleportRelayFallback(reason);
    }
    if (reason !== "direct_served") logUpgradeRelayEnd(sessionId, reason);
    latch.relayThinkingStripOwed = true;
  }
  latch.state = {
    status: "reverted",
    reason,
    detail,
  };
}
//@ chunk-w83r403t.js:1297-1433 placement
function recordEnableStubCall(stubName, id) {
  let enableStubsCalled = currentTeleportLatch().enableStubsCalled;
  if (!enableStubsCalled.has(stubName)) {
    enableStubsCalled.set(stubName, id);
    return "not_repeat";
  }
  return !!id && id === enableStubsCalled.get(stubName) ? "not_repeat" : "repeat";
}
//@ chunk-w83r403t.js:1433-1472 placement
function noteChromeSwitch(chromeSwitchedOn) {
  currentTeleportLatch().chromeSwitchedOn = chromeSwitchedOn;
}
//@ chunk-w83r403t.js:1472-1515 placement
function chromeSwitchNote() {
  return currentTeleportLatch().chromeSwitchedOn;
}
//@ chunk-w83r403t.js:1515-1533 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-w83r403t.js:1515", () => {
  weakMap = new WeakMap();
});
//@ chunk-w83r403t.js:1533-1562 placement
function registerRelayFetch(fetchToken, loop) {
  weakMap.set(fetchToken, loop);
}
//@ chunk-w83r403t.js:1562-1756 placement
function relayThinkingDisposition(request) {
  let latch = currentTeleportLatch();
  if (latch.relayThinkingStripOwed) return request.mainLoop ? "strip_and_mark" : "strip";
  if (latch.state.status !== "active") return "keep";
  return request.fetch !== undefined && weakMap.has(request.fetch) ? "keep" : "strip";
}
//@ chunk-w83r403t.js:1756-1838 placement
function isRelayedRequest(fetchToken) {
  return (
    currentTeleportLatch().state.status === "active" &&
    fetchToken !== undefined &&
    weakMap.get(fetchToken) === "main"
  );
}
//@ chunk-w83r403t.js:1838-1876 placement
function holdRelayBootVerdictOpen(openBootVerdict) {
  currentTeleportLatch().openBootVerdict = openBootVerdict;
}
//@ chunk-w83r403t.js:1876-1927 placement
function isRelayBootVerdictOpen() {
  return currentTeleportLatch().openBootVerdict !== undefined;
}
//@ chunk-w83r403t.js:1927-1961 placement
function noteRelayBootSettled() {
  currentTeleportLatch().bootSettled = true;
}
//@ chunk-w83r403t.js:1961-2030 placement
function relayStillUsableInProcess() {
  return (
    !currentTeleportLatch().bootSettled ||
    getTeleportCacheState().status === "active" ||
    isRelayBootVerdictOpen()
  );
}
//@ chunk-w83r403t.js:2030-2109 placement
function takeOpenRelayBootVerdict() {
  let latch = currentTeleportLatch();
  let openBootVerdict = latch.openBootVerdict;
  latch.openBootVerdict = undefined;
  return openBootVerdict;
}
//@ chunk-w83r403t.js:2109-2149 placement
function noteHandoffMarkerStep(handoffMarkerStep) {
  currentTeleportLatch().handoffMarkerStep = handoffMarkerStep;
}
//@ chunk-w83r403t.js:2149-2232 placement
function takeHandoffMarkerStep() {
  let latch = currentTeleportLatch();
  let handoffMarkerStep = latch.handoffMarkerStep;
  latch.handoffMarkerStep = undefined;
  return handoffMarkerStep;
}
//@ chunk-w83r403t.js:2232-2466 placement
function closeOpenRelayBootVerdict() {
  let verdict = takeOpenRelayBootVerdict();
  if (verdict === undefined) return;
  logFeatureSad("upgrade_teleport_cache", verdict);
  logForDiagnosticsNoPII("warn", "cli_teleport_arm_verdict", {
    outcome: "refused",
    error_code: verdict,
  });
  logForDebugging(`prompt-cache relay stays off: boot had no marker (${verdict}) and no hand-off armed it`);
}
//@ chunk-w83r403t.js:2466-2511 placement
function oweRelayThinkingStrip() {
  currentTeleportLatch().relayThinkingStripOwed = true;
}
//@ chunk-w83r403t.js:2511-2560 placement
function isRelayThinkingStripOwed() {
  return currentTeleportLatch().relayThinkingStripOwed;
}
//@ chunk-w83r403t.js:2560-2603 placement
function relayTakesGzip() {
  return !currentTeleportLatch().relayRefusedGzip;
}
//@ chunk-w83r403t.js:2603-2723 placement
function noteRelayRefusedGzip() {
  let latch = currentTeleportLatch();
  if (latch.relayRefusedGzip) return;
  latch.relayRefusedGzip = true;
  logForDiagnosticsNoPII("warn", "cli_teleport_relay_gzip_refused");
}
//@ chunk-w83r403t.js:2723-2803 placement
function noteRelayDispatch(lastDispatchRelayed) {
  let latch = currentTeleportLatch();
  latch.lastDispatchRelayed = lastDispatchRelayed;
  latch.lastDispatchFallback = undefined;
}
//@ chunk-w83r403t.js:2803-2869 placement
function noteRelayFallback(cause, httpStatus) {
  currentTeleportLatch().lastDispatchFallback = {
    cause,
    httpStatus,
  };
}
//@ chunk-w83r403t.js:2869-2916 placement
function getLastDispatchFallback() {
  return currentTeleportLatch().lastDispatchFallback;
}
//@ chunk-w83r403t.js:2916-2997 placement
function relayStoppedInLastDispatch() {
  let latch = currentTeleportLatch();
  return latch.relayThinkingStripOwed && !latch.lastDispatchRelayed;
}
//@ chunk-w83r403t.js:2997-3147 placement
function markRelayThinkingStripRecorded(outcome) {
  let latch = currentTeleportLatch();
  if (!latch.relayThinkingStripOwed) return;
  latch.relayThinkingStripOwed = false;
  logForDiagnosticsNoPII("info", "cli_teleport_relay_thinking_settled", {
    outcome,
  });
}
//@ chunk-w83r403t.js:3147-3274 placement
function logTeleportFallbackOnce(reason) {
  let latch = currentTeleportLatch();
  if (latch.fallbackSadEmitted.has(reason)) return;
  latch.fallbackSadEmitted.add(reason);
  logFeatureSad("upgrade_teleport_cache", reason);
  logTeleportRelayFallback(reason);
}
//@ chunk-w83r403t.js:3274-3402 placement
function revertAfterDirectServe(cause, reason) {
  if (currentTeleportLatch().state.status !== "active") return;
  logTeleportRelayFallback("direct_served", cause);
  logUpgradeRelayEnd(reason, `direct_served_${cause}`);
  revertTeleportCache("direct_served", reason, cause);
}
//@ chunk-w83r403t.js:3402-3553 placement
function noteForkWentDirect(lineUuids, reason) {
  let latch = currentTeleportLatch();
  if (latch.state.status !== "active") return;
  let last = lineUuids.at(-1);
  if (last !== undefined) latch.forkDirectLines.add(last);
  logFeatureSad("upgrade_relay_fork_direct", reason);
}
//@ chunk-w83r403t.js:3553-3634 placement
function hasForkGoneDirect(lineUuids) {
  let forkDirectLines = currentTeleportLatch().forkDirectLines;
  return forkDirectLines.size > 0 && lineUuids.some((uuid) => forkDirectLines.has(uuid));
}
//@ chunk-w83r403t.js:3634-3685 placement
/**
 * 上报中继升级结束的差评事件（原因 + 结果拼接）。
 */
function logUpgradeRelayEnd(reason, loop) {
  logFeatureSad("upgrade_relay_end", `${reason}_${loop}`);
}
//@ chunk-w83r403t.js:3685-3777 placement
/**
 * 记录提示缓存中继回退的原因（诊断日志）。
 */
function logTeleportRelayFallback(reason, cause) {
  logForDiagnosticsNoPII("warn", "cli_teleport_relay_fallback", {
    reason,
    ...(cause !== undefined && {
      cause,
    }),
  });
}
//@ chunk-w83r403t.js:3777-3890 placement
/**
 * 活动锚点快照仍成立时为真；被改动时记录 context_reduced 回退。auto 名 clearFastModeCooldown 错配，与 fast mode 无关。
 */
function verifyPreAnchorIntact(lineUuids) {
  let mismatch = describeAnchorSnapshotMismatch(lineUuids);
  if (mismatch === undefined) return getTeleportCacheState().status === "active";
  revertTeleportCache("context_reduced", "main", mismatch);
  return false;
}
//@ chunk-w83r403t.js:3890-3951 placement (2.1.88 match: runtimeState, 1)
/**
 * 旧版名 runtimeState 为错配。
 */
function isPreAnchorIntact(lineUuids) {
  return (
    getTeleportCacheState().status === "active" && describeAnchorSnapshotMismatch(lineUuids) === undefined
  );
}
//@ chunk-w83r403t.js:3951-4244 placement
/**
 * 比较实时视图的锚点前行 uuid 与快照，返回不一致说明。
 */
function describeAnchorSnapshotMismatch(lineUuids) {
  let teleportCacheState = getTeleportCacheState();
  if (teleportCacheState.status !== "active") return;
  let preAnchorLineUuids = teleportCacheState.preAnchorLineUuids;
  if (lineUuids.length < preAnchorLineUuids.length)
    return `live view has ${lineUuids.length} lines before its tail; the arm snapshot guarded ${preAnchorLineUuids.length}`;
  for (let j = 0; j < preAnchorLineUuids.length; j++)
    if (lineUuids[j] !== preAnchorLineUuids[j]) return `pre-anchor line ${j} changed since arm`;
  return;
}
//@ chunk-w83r403t.js:4244-4756 placement
/**
 * teleport 中继（提示缓存中继）的进程内状态：激活/回退、gzip 与 thinking 处理、启动判定。
 */
function verifyToolsBaselineIntact(model, fingerprint) {
  let latch = currentTeleportLatch();
  if (latch.state.status !== "active") return false;
  let toolsBaseline = latch.toolsBaseline;
  if (!toolsBaseline.captured) {
    latch.toolsBaseline = {
      captured: true,
      model,
      fingerprint,
    };
    return true;
  }
  if (model !== toolsBaseline.model) return false;
  if (toolsBaseline.fingerprint === fingerprint) return true;
  revertTeleportCache(
    "tools_changed",
    "main",
    toolsBaseline.fingerprint === null
      ? "session gained a toolset after a toolless first relay-attempted dispatch"
      : fingerprint === null
        ? "session lost its toolset after a tooled first relay-attempted dispatch"
        : "outgoing toolset diverged from the first relay-attempted dispatch baseline",
  );
  return false;
}
//@ chunk-w83r403t.js:4756-4970 placement
function toolsBaselineVerdict(model, fingerprint) {
  let latch = currentTeleportLatch();
  if (latch.state.status !== "active") return "not_comparable";
  let toolsBaseline = latch.toolsBaseline;
  if (!toolsBaseline.captured) return "intact";
  if (model !== toolsBaseline.model) return "not_comparable";
  return toolsBaseline.fingerprint === fingerprint ? "intact" : "changed";
}
export {
  getTeleportCacheState,
  activateTeleportCache,
  noteRelayBootSettled,
  closeOpenRelayBootVerdict,
  holdRelayBootVerdictOpen,
  noteHandoffMarkerStep,
  isRelayBootVerdictOpen,
  isRelayThinkingStripOwed,
  takeOpenRelayBootVerdict,
  oweRelayThinkingStrip,
  takeHandoffMarkerStep,
  revertTeleportCache,
  recordEnableStubCall,
  chromeSwitchNote,
  noteRelayDispatch,
  noteForkWentDirect,
  logTeleportFallbackOnce,
  noteRelayFallback,
  revertAfterDirectServe,
  isPreAnchorIntact,
  hasForkGoneDirect,
  verifyPreAnchorIntact,
  toolsBaselineVerdict,
  verifyToolsBaselineIntact,
  relayTakesGzip,
  noteRelayRefusedGzip,
  registerRelayFetch,
  TeleportLatch,
  getLastDispatchFallback,
  isRelayedRequest,
  markRelayThinkingStripRecorded,
  noteChromeSwitch,
  relayStillUsableInProcess,
  relayStoppedInLastDispatch,
  relayThinkingDisposition,
  teleportLatches,
};
