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
  state = { status: "inactive" };
  fallbackSadEmitted = new Set();
  toolsBaseline = { captured: !1 };
  relayThinkingStripOwed = !1;
  lastDispatchRelayed = !1;
  lastDispatchFallback = void 0;
  openBootVerdict = void 0;
  bootSettled = !1;
  handoffMarkerStep = void 0;
  enableStubsCalled = new Map();
  chromeSwitchedOn = void 0;
  forkDirectLines = new Set();
  relayRefusedGzip = !1;
}
//@ chunk-fft78xw8.js:659-687 placement
var teleportLatches = new SessionRootSlot(() => new TeleportLatch());
//@ chunk-fft78xw8.js:687-719 placement
function n() {
  return teleportLatches.of(getRootSession());
}
//@ chunk-fft78xw8.js:719-750 placement
function getTeleportCacheState() {
  return n().state;
}
//@ chunk-fft78xw8.js:750-852 placement
function activateTeleportCache(e) {
  let r = n();
  if (r.state.status !== "inactive") return;
  ((r.state = e), (r.relayThinkingStripOwed = !1));
}
//@ chunk-fft78xw8.js:852-1264 placement
function revertTeleportCache(e, r, o) {
  let a = n();
  if (a.state.status === "reverted") return;
  if (a.state.status === "active") {
    if (
      e === "device_tool_requested" ||
      e === "device_tool_request_repeated" ||
      e === "account_memory_withdrawn"
    )
      logForDiagnosticsNoPII("info", "cli_teleport_relay_ended", { reason: e });
    else if (e !== "direct_served") (logFeatureSad("upgrade_teleport_cache", e), l(e));
    if (e !== "direct_served") s(r, e);
    a.relayThinkingStripOwed = !0;
  }
  a.state = { status: "reverted", reason: e, detail: o };
}
//@ chunk-fft78xw8.js:1264-1400 placement
function recordEnableStubCall(e, r) {
  let enableStubsCalled = n().enableStubsCalled;
  if (!enableStubsCalled.has(e)) return (enableStubsCalled.set(e, r), "not_repeat");
  return !!r && r === enableStubsCalled.get(e) ? "not_repeat" : "repeat";
}
//@ chunk-fft78xw8.js:1400-1439 placement
function noteChromeSwitch(e) {
  n().chromeSwitchedOn = e;
}
//@ chunk-fft78xw8.js:1439-1482 placement
function chromeSwitchNote() {
  return n().chromeSwitchedOn;
}
//@ chunk-fft78xw8.js:1482-1500 placement
var weakMap = new WeakMap();
//@ chunk-fft78xw8.js:1500-1529 placement
function registerRelayFetch(e, r) {
  weakMap.set(e, r);
}
//@ chunk-fft78xw8.js:1529-1723 placement
function relayThinkingDisposition(e) {
  let r = n();
  if (r.relayThinkingStripOwed) return e.mainLoop ? "strip_and_mark" : "strip";
  if (r.state.status !== "active") return "keep";
  return e.fetch !== void 0 && weakMap.has(e.fetch) ? "keep" : "strip";
}
//@ chunk-fft78xw8.js:1723-1805 placement
function isRelayedRequest(e) {
  return n().state.status === "active" && e !== void 0 && weakMap.get(e) === "main";
}
//@ chunk-fft78xw8.js:1805-1843 placement
function holdRelayBootVerdictOpen(e) {
  n().openBootVerdict = e;
}
//@ chunk-fft78xw8.js:1843-1894 placement
function isRelayBootVerdictOpen() {
  return n().openBootVerdict !== void 0;
}
//@ chunk-fft78xw8.js:1894-1928 placement
function noteRelayBootSettled() {
  n().bootSettled = !0;
}
//@ chunk-fft78xw8.js:1928-1997 placement
function relayStillUsableInProcess() {
  return !n().bootSettled || getTeleportCacheState().status === "active" || isRelayBootVerdictOpen();
}
//@ chunk-fft78xw8.js:1997-2076 placement
function takeOpenRelayBootVerdict() {
  let e = n(),
    openBootVerdict = e.openBootVerdict;
  return ((e.openBootVerdict = void 0), openBootVerdict);
}
//@ chunk-fft78xw8.js:2076-2116 placement
function noteHandoffMarkerStep(e) {
  n().handoffMarkerStep = e;
}
//@ chunk-fft78xw8.js:2116-2199 placement
function takeHandoffMarkerStep() {
  let e = n(),
    handoffMarkerStep = e.handoffMarkerStep;
  return ((e.handoffMarkerStep = void 0), handoffMarkerStep);
}
//@ chunk-fft78xw8.js:2199-2433 placement
function closeOpenRelayBootVerdict() {
  let e = takeOpenRelayBootVerdict();
  if (e === void 0) return;
  (logFeatureSad("upgrade_teleport_cache", e),
    logForDiagnosticsNoPII("warn", "cli_teleport_arm_verdict", { outcome: "refused", error_code: e }),
    logForDebugging(`prompt-cache relay stays off: boot had no marker (${e}) and no hand-off armed it`));
}
//@ chunk-fft78xw8.js:2433-2478 placement
function oweRelayThinkingStrip() {
  n().relayThinkingStripOwed = !0;
}
//@ chunk-fft78xw8.js:2478-2527 placement
function isRelayThinkingStripOwed() {
  return n().relayThinkingStripOwed;
}
//@ chunk-fft78xw8.js:2527-2570 placement
function relayTakesGzip() {
  return !n().relayRefusedGzip;
}
//@ chunk-fft78xw8.js:2570-2690 placement
function noteRelayRefusedGzip() {
  let e = n();
  if (e.relayRefusedGzip) return;
  ((e.relayRefusedGzip = !0), logForDiagnosticsNoPII("warn", "cli_teleport_relay_gzip_refused"));
}
//@ chunk-fft78xw8.js:2690-2770 placement
function noteRelayDispatch(e) {
  let r = n();
  ((r.lastDispatchRelayed = e), (r.lastDispatchFallback = void 0));
}
//@ chunk-fft78xw8.js:2770-2836 placement
function noteRelayFallback(e, r) {
  n().lastDispatchFallback = { cause: e, httpStatus: r };
}
//@ chunk-fft78xw8.js:2836-2883 placement
function getLastDispatchFallback() {
  return n().lastDispatchFallback;
}
//@ chunk-fft78xw8.js:2883-2964 placement
function relayStoppedInLastDispatch() {
  let e = n();
  return e.relayThinkingStripOwed && !e.lastDispatchRelayed;
}
//@ chunk-fft78xw8.js:2964-3114 placement
function markRelayThinkingStripRecorded(e) {
  let r = n();
  if (!r.relayThinkingStripOwed) return;
  ((r.relayThinkingStripOwed = !1),
    logForDiagnosticsNoPII("info", "cli_teleport_relay_thinking_settled", { outcome: e }));
}
//@ chunk-fft78xw8.js:3114-3241 placement
function logTeleportFallbackOnce(e) {
  let r = n();
  if (r.fallbackSadEmitted.has(e)) return;
  (r.fallbackSadEmitted.add(e), logFeatureSad("upgrade_teleport_cache", e), l(e));
}
//@ chunk-fft78xw8.js:3241-3369 placement
function revertAfterDirectServe(e, r) {
  if (n().state.status !== "active") return;
  (l("direct_served", e), s(r, `direct_served_${e}`), revertTeleportCache("direct_served", r, e));
}
//@ chunk-fft78xw8.js:3369-3520 placement
function noteForkWentDirect(e, r) {
  let o = n();
  if (o.state.status !== "active") return;
  let at = e.at(-1);
  if (at !== void 0) o.forkDirectLines.add(at);
  logFeatureSad("upgrade_relay_fork_direct", r);
}
//@ chunk-fft78xw8.js:3520-3601 placement
function hasForkGoneDirect(e) {
  let forkDirectLines = n().forkDirectLines;
  return forkDirectLines.size > 0 && e.some((o) => forkDirectLines.has(o));
}
//@ chunk-fft78xw8.js:3601-3652 placement
function s(e, r) {
  logFeatureSad("upgrade_relay_end", `${e}_${r}`);
}
//@ chunk-fft78xw8.js:3652-3744 placement
function l(e, r) {
  logForDiagnosticsNoPII("warn", "cli_teleport_relay_fallback", {
    reason: e,
    ...(r !== void 0 && { cause: r }),
  });
}
/**
 * 活动锚点快照仍成立时为真；被改动时记录 context_reduced 回退。auto 名 clearFastModeCooldown 错配，与 fast mode 无关。
 */
//@ chunk-fft78xw8.js:3744-3857 placement
function verifyPreAnchorIntact(e) {
  let r = describeAnchorSnapshotMismatch(e);
  if (r === void 0) return getTeleportCacheState().status === "active";
  return (revertTeleportCache("context_reduced", "main", r), !1);
}
/**
 * 旧版名 runtimeState 为错配。
 */
//@ chunk-fft78xw8.js:3857-3918 placement = runtimeState (1)
function isPreAnchorIntact(e) {
  return getTeleportCacheState().status === "active" && describeAnchorSnapshotMismatch(e) === void 0;
}
/**
 * 比较实时视图的锚点前行 uuid 与快照，返回不一致说明。
 */
//@ chunk-fft78xw8.js:3918-4211 placement
function describeAnchorSnapshotMismatch(e) {
  let r = getTeleportCacheState();
  if (r.status !== "active") return;
  let preAnchorLineUuids = r.preAnchorLineUuids;
  if (e.length < preAnchorLineUuids.length)
    return `live view has ${e.length} lines before its tail; the arm snapshot guarded ${preAnchorLineUuids.length}`;
  for (let a = 0; a < preAnchorLineUuids.length; a++)
    if (e[a] !== preAnchorLineUuids[a]) return `pre-anchor line ${a} changed since arm`;
  return;
}
/**
 * teleport 中继（提示缓存中继）的进程内状态：激活/回退、gzip 与 thinking 处理、启动判定。
 */
//@ chunk-fft78xw8.js:4211-4723 placement
function verifyToolsBaselineIntact(e, r) {
  let o = n();
  if (o.state.status !== "active") return !1;
  let toolsBaseline = o.toolsBaseline;
  if (!toolsBaseline.captured) return ((o.toolsBaseline = { captured: !0, model: e, fingerprint: r }), !0);
  if (e !== toolsBaseline.model) return !1;
  if (toolsBaseline.fingerprint === r) return !0;
  return (
    revertTeleportCache(
      "tools_changed",
      "main",
      toolsBaseline.fingerprint === null
        ? "session gained a toolset after a toolless first relay-attempted dispatch"
        : r === null
          ? "session lost its toolset after a tooled first relay-attempted dispatch"
          : "outgoing toolset diverged from the first relay-attempted dispatch baseline",
    ),
    !1
  );
}
//@ chunk-fft78xw8.js:4723-4937 placement
function toolsBaselineVerdict(e, r) {
  let o = n();
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
