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
  let r = currentTeleportLatch();
  if (r.state.status !== "inactive") return;
  r.state = state;
  r.relayThinkingStripOwed = false;
}
//@ chunk-fft78xw8.js:852-1264 placement
function revertTeleportCache(reason, r, detail) {
  let a = currentTeleportLatch();
  if (a.state.status === "reverted") return;
  if (a.state.status === "active") {
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
    if (reason !== "direct_served") logUpgradeRelayEnd(r, reason);
    a.relayThinkingStripOwed = true;
  }
  a.state = {
    status: "reverted",
    reason,
    detail,
  };
}
//@ chunk-fft78xw8.js:1264-1400 placement
function recordEnableStubCall(e, id) {
  let enableStubsCalled = currentTeleportLatch().enableStubsCalled;
  if (!enableStubsCalled.has(e)) {
    enableStubsCalled.set(e, id);
    return "not_repeat";
  }
  return !!id && id === enableStubsCalled.get(e) ? "not_repeat" : "repeat";
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
function registerRelayFetch(e, loop) {
  weakMap.set(e, loop);
}
//@ chunk-fft78xw8.js:1529-1723 placement
function relayThinkingDisposition(e) {
  let r = currentTeleportLatch();
  if (r.relayThinkingStripOwed) return e.mainLoop ? "strip_and_mark" : "strip";
  if (r.state.status !== "active") return "keep";
  return e.fetch !== undefined && weakMap.has(e.fetch) ? "keep" : "strip";
}
//@ chunk-fft78xw8.js:1723-1805 placement
function isRelayedRequest(e) {
  return currentTeleportLatch().state.status === "active" && e !== undefined && weakMap.get(e) === "main";
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
  let e = currentTeleportLatch();
  let openBootVerdict = e.openBootVerdict;
  e.openBootVerdict = undefined;
  return openBootVerdict;
}
//@ chunk-fft78xw8.js:2076-2116 placement
function noteHandoffMarkerStep(handoffMarkerStep) {
  currentTeleportLatch().handoffMarkerStep = handoffMarkerStep;
}
//@ chunk-fft78xw8.js:2116-2199 placement
function takeHandoffMarkerStep() {
  let e = currentTeleportLatch();
  let handoffMarkerStep = e.handoffMarkerStep;
  e.handoffMarkerStep = undefined;
  return handoffMarkerStep;
}
//@ chunk-fft78xw8.js:2199-2433 placement
function closeOpenRelayBootVerdict() {
  let e = takeOpenRelayBootVerdict();
  if (e === undefined) return;
  logFeatureSad("upgrade_teleport_cache", e);
  logForDiagnosticsNoPII("warn", "cli_teleport_arm_verdict", {
    outcome: "refused",
    error_code: e,
  });
  logForDebugging(`prompt-cache relay stays off: boot had no marker (${e}) and no hand-off armed it`);
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
  let e = currentTeleportLatch();
  if (e.relayRefusedGzip) return;
  e.relayRefusedGzip = true;
  logForDiagnosticsNoPII("warn", "cli_teleport_relay_gzip_refused");
}
//@ chunk-fft78xw8.js:2690-2770 placement
function noteRelayDispatch(lastDispatchRelayed) {
  let r = currentTeleportLatch();
  r.lastDispatchRelayed = lastDispatchRelayed;
  r.lastDispatchFallback = undefined;
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
  let e = currentTeleportLatch();
  return e.relayThinkingStripOwed && !e.lastDispatchRelayed;
}
//@ chunk-fft78xw8.js:2964-3114 placement
function markRelayThinkingStripRecorded(outcome) {
  let r = currentTeleportLatch();
  if (!r.relayThinkingStripOwed) return;
  r.relayThinkingStripOwed = false;
  logForDiagnosticsNoPII("info", "cli_teleport_relay_thinking_settled", {
    outcome,
  });
}
//@ chunk-fft78xw8.js:3114-3241 placement
function logTeleportFallbackOnce(reason) {
  let r = currentTeleportLatch();
  if (r.fallbackSadEmitted.has(reason)) return;
  r.fallbackSadEmitted.add(reason);
  logFeatureSad("upgrade_teleport_cache", reason);
  logTeleportRelayFallback(reason);
}
//@ chunk-fft78xw8.js:3241-3369 placement
function revertAfterDirectServe(e, loop) {
  if (currentTeleportLatch().state.status !== "active") return;
  logTeleportRelayFallback("direct_served", e);
  logUpgradeRelayEnd(loop, `direct_served_${e}`);
  revertTeleportCache("direct_served", loop, e);
}
//@ chunk-fft78xw8.js:3369-3520 placement
function noteForkWentDirect(e, r) {
  let o = currentTeleportLatch();
  if (o.state.status !== "active") return;
  let last = e.at(-1);
  if (last !== undefined) o.forkDirectLines.add(last);
  logFeatureSad("upgrade_relay_fork_direct", r);
}
//@ chunk-fft78xw8.js:3520-3601 placement
function hasForkGoneDirect(e) {
  let forkDirectLines = currentTeleportLatch().forkDirectLines;
  return forkDirectLines.size > 0 && e.some((o) => forkDirectLines.has(o));
}
//@ chunk-fft78xw8.js:3601-3652 placement
/**
 * 上报中继升级结束的差评事件（原因 + 结果拼接）。
 */
function logUpgradeRelayEnd(e, r) {
  logFeatureSad("upgrade_relay_end", `${e}_${r}`);
}
//@ chunk-fft78xw8.js:3652-3744 placement
/**
 * 记录提示缓存中继回退的原因（诊断日志）。
 */
function logTeleportRelayFallback(reason, r) {
  logForDiagnosticsNoPII("warn", "cli_teleport_relay_fallback", {
    reason,
    ...(r !== undefined && {
      cause: r,
    }),
  });
}
//@ chunk-fft78xw8.js:3744-3857 placement
/**
 * 活动锚点快照仍成立时为真；被改动时记录 context_reduced 回退。auto 名 clearFastModeCooldown 错配，与 fast mode 无关。
 */
function verifyPreAnchorIntact(e) {
  let r = describeAnchorSnapshotMismatch(e);
  if (r === undefined) return getTeleportCacheState().status === "active";
  revertTeleportCache("context_reduced", "main", r);
  return false;
}
//@ chunk-fft78xw8.js:3857-3918 placement = runtimeState (1)
/**
 * 旧版名 runtimeState 为错配。
 */
function isPreAnchorIntact(e) {
  return getTeleportCacheState().status === "active" && describeAnchorSnapshotMismatch(e) === undefined;
}
//@ chunk-fft78xw8.js:3918-4211 placement
/**
 * 比较实时视图的锚点前行 uuid 与快照，返回不一致说明。
 */
function describeAnchorSnapshotMismatch(e) {
  let teleportCacheState = getTeleportCacheState();
  if (teleportCacheState.status !== "active") return;
  let preAnchorLineUuids = teleportCacheState.preAnchorLineUuids;
  if (e.length < preAnchorLineUuids.length)
    return `live view has ${e.length} lines before its tail; the arm snapshot guarded ${preAnchorLineUuids.length}`;
  for (let j = 0; j < preAnchorLineUuids.length; j++)
    if (e[j] !== preAnchorLineUuids[j]) return `pre-anchor line ${j} changed since arm`;
  return;
}
//@ chunk-fft78xw8.js:4211-4723 placement
/**
 * teleport 中继（提示缓存中继）的进程内状态：激活/回退、gzip 与 thinking 处理、启动判定。
 */
function verifyToolsBaselineIntact(e, r) {
  let o = currentTeleportLatch();
  if (o.state.status !== "active") return false;
  let toolsBaseline = o.toolsBaseline;
  if (!toolsBaseline.captured) {
    o.toolsBaseline = {
      captured: true,
      model: e,
      fingerprint: r,
    };
    return true;
  }
  if (e !== toolsBaseline.model) return false;
  if (toolsBaseline.fingerprint === r) return true;
  revertTeleportCache(
    "tools_changed",
    "main",
    toolsBaseline.fingerprint === null
      ? "session gained a toolset after a toolless first relay-attempted dispatch"
      : r === null
        ? "session lost its toolset after a tooled first relay-attempted dispatch"
        : "outgoing toolset diverged from the first relay-attempted dispatch baseline",
  );
  return false;
}
//@ chunk-fft78xw8.js:4723-4937 placement
function toolsBaselineVerdict(e, r) {
  let o = currentTeleportLatch();
  if (o.state.status !== "active") return "not_comparable";
  let toolsBaseline = o.toolsBaseline;
  if (!toolsBaseline.captured) return "intact";
  if (e !== toolsBaseline.model) return "not_comparable";
  return toolsBaseline.fingerprint === r ? "intact" : "changed";
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
};
