/**
 * services/teleport/relayState.ts
 *
 * 2.1.316 新增。teleport 中继（提示缓存中继）的进程内状态：激活/回退、gzip 与 thinking 处理、启动判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fft78xw8.js (41)
 * attribution: placement 41
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-fft78xw8.js:334-659 placement
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
//@ chunk-fft78xw8.js:659-687 placement
var teleportLatches = new SessionRootSlot(() => new TeleportLatch());
//@ chunk-fft78xw8.js:687-719 placement
/**
 * 取当前会话的中继闩锁状态。
 */
function currentTeleportLatch() {
  return teleportLatches.of(getRootSession());
}
//@ chunk-fft78xw8.js:719-750 placement
function getTeleportCacheState() {
  return currentTeleportLatch().state;
}
//@ chunk-fft78xw8.js:750-852 placement
function activateTeleportCache(state) {
  let latch = currentTeleportLatch();
  if (latch.state.status !== "inactive") return;
  latch.state = state;
  latch.relayThinkingStripOwed = false;
}
//@ chunk-fft78xw8.js:852-1264 placement
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
//@ chunk-fft78xw8.js:1264-1400 placement
function recordEnableStubCall(stubName, id) {
  let enableStubsCalled = currentTeleportLatch().enableStubsCalled;
  if (!enableStubsCalled.has(stubName)) {
    enableStubsCalled.set(stubName, id);
    return "not_repeat";
  }
  return !!id && id === enableStubsCalled.get(stubName) ? "not_repeat" : "repeat";
}
//@ chunk-fft78xw8.js:1400-1439 placement
function noteChromeSwitch(chromeSwitchedOn) {
  currentTeleportLatch().chromeSwitchedOn = chromeSwitchedOn;
}
//@ chunk-fft78xw8.js:1439-1482 placement
function chromeSwitchNote() {
  return currentTeleportLatch().chromeSwitchedOn;
}
//@ chunk-fft78xw8.js:1482-1500 placement
var weakMap = new WeakMap();
//@ chunk-fft78xw8.js:1500-1529 placement
function registerRelayFetch(fetchToken, loop) {
  weakMap.set(fetchToken, loop);
}
//@ chunk-fft78xw8.js:1529-1723 placement
function relayThinkingDisposition(request) {
  let latch = currentTeleportLatch();
  if (latch.relayThinkingStripOwed) return request.mainLoop ? "strip_and_mark" : "strip";
  if (latch.state.status !== "active") return "keep";
  return request.fetch !== undefined && weakMap.has(request.fetch) ? "keep" : "strip";
}
//@ chunk-fft78xw8.js:1723-1805 placement
function isRelayedRequest(fetchToken) {
  return (
    currentTeleportLatch().state.status === "active" &&
    fetchToken !== undefined &&
    weakMap.get(fetchToken) === "main"
  );
}
//@ chunk-fft78xw8.js:1805-1843 placement
function holdRelayBootVerdictOpen(openBootVerdict) {
  currentTeleportLatch().openBootVerdict = openBootVerdict;
}
//@ chunk-fft78xw8.js:1843-1894 placement
function isRelayBootVerdictOpen() {
  return currentTeleportLatch().openBootVerdict !== undefined;
}
//@ chunk-fft78xw8.js:1894-1928 placement
function noteRelayBootSettled() {
  currentTeleportLatch().bootSettled = true;
}
//@ chunk-fft78xw8.js:1928-1997 placement
function relayStillUsableInProcess() {
  return (
    !currentTeleportLatch().bootSettled ||
    getTeleportCacheState().status === "active" ||
    isRelayBootVerdictOpen()
  );
}
//@ chunk-fft78xw8.js:1997-2076 placement
function takeOpenRelayBootVerdict() {
  let latch = currentTeleportLatch();
  let openBootVerdict = latch.openBootVerdict;
  latch.openBootVerdict = undefined;
  return openBootVerdict;
}
//@ chunk-fft78xw8.js:2076-2116 placement
function noteHandoffMarkerStep(handoffMarkerStep) {
  currentTeleportLatch().handoffMarkerStep = handoffMarkerStep;
}
//@ chunk-fft78xw8.js:2116-2199 placement
function takeHandoffMarkerStep() {
  let latch = currentTeleportLatch();
  let handoffMarkerStep = latch.handoffMarkerStep;
  latch.handoffMarkerStep = undefined;
  return handoffMarkerStep;
}
//@ chunk-fft78xw8.js:2199-2433 placement
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
//@ chunk-fft78xw8.js:2433-2478 placement
function oweRelayThinkingStrip() {
  currentTeleportLatch().relayThinkingStripOwed = true;
}
//@ chunk-fft78xw8.js:2478-2527 placement
function isRelayThinkingStripOwed() {
  return currentTeleportLatch().relayThinkingStripOwed;
}
//@ chunk-fft78xw8.js:2527-2570 placement
function relayTakesGzip() {
  return !currentTeleportLatch().relayRefusedGzip;
}
//@ chunk-fft78xw8.js:2570-2690 placement
function noteRelayRefusedGzip() {
  let latch = currentTeleportLatch();
  if (latch.relayRefusedGzip) return;
  latch.relayRefusedGzip = true;
  logForDiagnosticsNoPII("warn", "cli_teleport_relay_gzip_refused");
}
//@ chunk-fft78xw8.js:2690-2770 placement
function noteRelayDispatch(lastDispatchRelayed) {
  let latch = currentTeleportLatch();
  latch.lastDispatchRelayed = lastDispatchRelayed;
  latch.lastDispatchFallback = undefined;
}
//@ chunk-fft78xw8.js:2770-2836 placement
function noteRelayFallback(cause, httpStatus) {
  currentTeleportLatch().lastDispatchFallback = {
    cause,
    httpStatus,
  };
}
//@ chunk-fft78xw8.js:2836-2883 placement
function getLastDispatchFallback() {
  return currentTeleportLatch().lastDispatchFallback;
}
//@ chunk-fft78xw8.js:2883-2964 placement
function relayStoppedInLastDispatch() {
  let latch = currentTeleportLatch();
  return latch.relayThinkingStripOwed && !latch.lastDispatchRelayed;
}
//@ chunk-fft78xw8.js:2964-3114 placement
function markRelayThinkingStripRecorded(outcome) {
  let latch = currentTeleportLatch();
  if (!latch.relayThinkingStripOwed) return;
  latch.relayThinkingStripOwed = false;
  logForDiagnosticsNoPII("info", "cli_teleport_relay_thinking_settled", {
    outcome,
  });
}
//@ chunk-fft78xw8.js:3114-3241 placement
function logTeleportFallbackOnce(reason) {
  let latch = currentTeleportLatch();
  if (latch.fallbackSadEmitted.has(reason)) return;
  latch.fallbackSadEmitted.add(reason);
  logFeatureSad("upgrade_teleport_cache", reason);
  logTeleportRelayFallback(reason);
}
//@ chunk-fft78xw8.js:3241-3369 placement
function revertAfterDirectServe(cause, reason) {
  if (currentTeleportLatch().state.status !== "active") return;
  logTeleportRelayFallback("direct_served", cause);
  logUpgradeRelayEnd(reason, `direct_served_${cause}`);
  revertTeleportCache("direct_served", reason, cause);
}
//@ chunk-fft78xw8.js:3369-3520 placement
function noteForkWentDirect(lineUuids, reason) {
  let latch = currentTeleportLatch();
  if (latch.state.status !== "active") return;
  let last = lineUuids.at(-1);
  if (last !== undefined) latch.forkDirectLines.add(last);
  logFeatureSad("upgrade_relay_fork_direct", reason);
}
//@ chunk-fft78xw8.js:3520-3601 placement
function hasForkGoneDirect(lineUuids) {
  let forkDirectLines = currentTeleportLatch().forkDirectLines;
  return forkDirectLines.size > 0 && lineUuids.some((uuid) => forkDirectLines.has(uuid));
}
//@ chunk-fft78xw8.js:3601-3652 placement
/**
 * 上报中继升级结束的差评事件（原因 + 结果拼接）。
 */
function logUpgradeRelayEnd(reason, loop) {
  logFeatureSad("upgrade_relay_end", `${reason}_${loop}`);
}
//@ chunk-fft78xw8.js:3652-3744 placement
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
//@ chunk-fft78xw8.js:3744-3857 placement
/**
 * 活动锚点快照仍成立时为真；被改动时记录 context_reduced 回退。auto 名 clearFastModeCooldown 错配，与 fast mode 无关。
 */
function verifyPreAnchorIntact(lineUuids) {
  let mismatch = describeAnchorSnapshotMismatch(lineUuids);
  if (mismatch === undefined) return getTeleportCacheState().status === "active";
  revertTeleportCache("context_reduced", "main", mismatch);
  return false;
}
//@ chunk-fft78xw8.js:3857-3918 placement (2.1.88 match: runtimeState, 1)
/**
 * 旧版名 runtimeState 为错配。
 */
function isPreAnchorIntact(lineUuids) {
  return (
    getTeleportCacheState().status === "active" && describeAnchorSnapshotMismatch(lineUuids) === undefined
  );
}
//@ chunk-fft78xw8.js:3918-4211 placement
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
//@ chunk-fft78xw8.js:4211-4723 placement
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
//@ chunk-fft78xw8.js:4723-4937 placement
function toolsBaselineVerdict(model, fingerprint) {
  let latch = currentTeleportLatch();
  if (latch.state.status !== "active") return "not_comparable";
  let toolsBaseline = latch.toolsBaseline;
  if (!toolsBaseline.captured) return "intact";
  if (model !== toolsBaseline.model) return "not_comparable";
  return toolsBaseline.fingerprint === fingerprint ? "intact" : "changed";
}
export {
  closeOpenRelayBootVerdict,
  getTeleportCacheState,
  revertTeleportCache,
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
  activateTeleportCache,
  noteRelayBootSettled,
  holdRelayBootVerdictOpen,
  recordEnableStubCall,
  chromeSwitchNote,
  noteHandoffMarkerStep,
  isRelayBootVerdictOpen,
  isRelayThinkingStripOwed,
  takeOpenRelayBootVerdict,
  oweRelayThinkingStrip,
  takeHandoffMarkerStep,
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
