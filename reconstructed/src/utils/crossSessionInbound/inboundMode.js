/**
 * utils/crossSessionInbound/inboundMode.ts
 *
 * 2.1.316 新增：跨会话入站模式
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q40vccff.js (18)
 * attribution: placement 18
 */
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  onGrowthBookRefresh,
} from "../../services/analytics/growthbook.js";
import { PERMISSION_MODES } from "../../types/permissions.js";
import { ci } from "../swarm/hostState.js";
import { _Le, a$t } from "./inboundGate.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { logForDebugging } from "../debug.js";
import { sleep } from "../sleep.js";
import { isSettingSourceEnabled } from "../settings/constants.js";
import { getSettingsForSource } from "../settings/settings.js";
import { N } from "../../components/KeybindingWarnings.js";

//@ chunk-q40vccff.js:714-772 placement
function r$t() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor_kite_mode_emit", !0);
}
//@ chunk-q40vccff.js:772-1013 placement
function getInboundDecidedBy() {
  switch (resolveInboundSetting().decidedBy) {
    case "policySettings":
      return "managed-setting";
    case "repoSettings":
      return "repo-setting";
    case "invalidSetting":
      return "invalid-setting";
    case "flagSettings":
    case "userSettings":
    case void 0:
      return "explicit-setting";
  }
}
//@ chunk-q40vccff.js:1013-1066 placement
var p = { accept: 0, hold: 1, refuse: 2 },
  Q = 100,
  P = new Set(PERMISSION_MODES);
/**
 * 设置跨会话入站模式的读取函数：设置时清除关闭状态并通知模式变化；清除时先记住当前模式。
 */
//@ chunk-q40vccff.js:1066-1347 placement
function setInboundModeGetter(e) {
  if (e !== null) ((ci().inbound.shuttingDown = !1), I(), (ci().inbound.modeAtUnwire = void 0));
  else {
    let getCurrentMode = ci().inbound.getCurrentMode;
    if (getCurrentMode !== null)
      try {
        ci().inbound.modeAtUnwire = getCurrentMode();
      } catch {
        ci().inbound.modeAtUnwire = void 0;
      }
  }
  if (((ci().inbound.getCurrentMode = e), e !== null)) _Le("mode-changed");
}
//@ chunk-q40vccff.js:1347-1389 placement
function xon(e) {
  ci().inbound.onPeerHeld = e;
}
//@ chunk-q40vccff.js:1389-1436 placement
function wvo(e) {
  ci().inbound.sendPeerReceipt = e;
}
//@ chunk-q40vccff.js:1436-1535 placement
function SHs(e, n) {
  ci().inbound.sendPeerReceipt?.({ mode: "prompt", agentId: mainAgentId(), value: "", origin: e }, n);
}
/**
 * 设置入站可用性发布函数，开启时立即发布并在特性开关刷新时重新发布。
 */
//@ chunk-q40vccff.js:1535-1721 placement
function setInboundAvailabilityPublisher(e) {
  let inbound = ci().inbound;
  if (
    ((inbound.publishAvailability = e),
    inbound.unsubscribeAvailabilityRefresh?.(),
    (inbound.unsubscribeAvailabilityRefresh = null),
    e)
  )
    (o$t(), (inbound.unsubscribeAvailabilityRefresh = onGrowthBookRefresh(o$t)));
}
//@ chunk-q40vccff.js:1721-1787 placement
function o$t() {
  ci().inbound.publishAvailability?.(a$t() === void 0);
}
//@ chunk-q40vccff.js:1787-1838 placement
function Evo(e) {
  ci().inbound.recordCorrespondent = e;
}
//@ chunk-q40vccff.js:1838-1848 placement
var F = 750;
//@ chunk-q40vccff.js:1848-1947 placement
function I() {
  if (ci().inbound.shutdownSettleHandle === null)
    ci().inbound.shutdownSettleHandle = registerCleanup(settleHeldInboundOnShutdown);
}
/**
 * 关闭时把仍暂扣的跨会话消息按过期处理：发送回执并通知丢弃，最多等待一段时间。
 */
//@ chunk-q40vccff.js:1947-2390 placement
async function settleHeldInboundOnShutdown() {
  let inbound = ci().inbound;
  if (
    (inbound.shutdownSettleHandle?.(),
    (inbound.shutdownSettleHandle = null),
    (inbound.shuttingDown = !0),
    inbound.held.length === 0)
  )
    return;
  let splice = inbound.held.splice(0, inbound.held.length);
  logForDebugging(
    `[cross-session-inbound] shutdown: settling ${splice.length} still-held peer message(s) as expired`,
  );
  let o = [];
  for (let s of splice)
    (o.push(inbound.sendPeerReceipt?.(s, "expired")), inbound.onPeerHoldDropped?.(s, "expired"));
  await Promise.race([Promise.allSettled(o), sleep(F, void 0, { unref: !0 })]);
}
//@ chunk-q40vccff.js:2390-2478 placement
function vvo(e) {
  let { inbound: inbound } = ci();
  return inbound.held.includes(e) ? inbound.announced.get(e) : void 0;
}
//@ chunk-q40vccff.js:2478-2527 placement
function Ion(e) {
  ci().inbound.onPeerHoldDropped = e;
}
//@ chunk-q40vccff.js:2527-2577 placement
function Oon(e) {
  ci().inbound.onPeerHoldReleased = e;
}
//@ chunk-q40vccff.js:2577-2609 placement
function hLe() {
  return resolveInboundSetting().value;
}
/**
 * 解析 crossSessionInbound 设置：先取策略/flag/用户设置，再让项目层取更严格的值（记为仓库设置）；设置无效时强制为 hold。
 */
//@ chunk-q40vccff.js:2609-3113 placement
function resolveInboundSetting() {
  let value, decidedBy;
  for (let o of ["policySettings", "flagSettings", "userSettings"]) {
    if (!isSettingSourceEnabled(o)) continue;
    let s = getSettingsForSource(o)?.crossSessionInbound;
    if (s !== void 0) {
      ((value = s), (decidedBy = o));
      break;
    }
  }
  for (let o of ["localSettings", "projectSettings"]) {
    if (!isSettingSourceEnabled(o)) continue;
    let s = getSettingsForSource(o)?.crossSessionInbound;
    if (s === void 0) continue;
    if (p[s] > p[value ?? "accept"]) ((value = s), (decidedBy = "repoSettings"));
    else if (s !== "accept" && value !== void 0 && p[s] === p[value] && decidedBy !== "policySettings")
      decidedBy = "repoSettings";
  }
  if (p[value ?? "accept"] < p.hold && N()) ((value = "hold"), (decidedBy = "invalidSetting"));
  return { value: value, decidedBy: decidedBy };
}

export {
  SHs,
  settleHeldInboundOnShutdown,
  wvo,
  Evo,
  r$t,
  xon,
  Ion,
  Oon,
  setInboundModeGetter,
  setInboundAvailabilityPublisher,
  hLe,
  o$t,
  getInboundDecidedBy,
  P,
  Q,
  I,
  vvo,
};
