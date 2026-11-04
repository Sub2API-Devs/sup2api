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
import { swarmHostState } from "../swarm/hostState.js";
import { refreshAndReevaluateHeld, inboundRefuseCause } from "./inboundGate.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { logForDebugging } from "../debug.js";
import { sleep } from "../sleep.js";
import { isSettingSourceEnabled } from "../settings/constants.js";
import { getSettingsForSource } from "../settings/settings.js";
import { hasKeybindingWarning } from "../../components/KeybindingWarnings.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-q40vccff.js:714-772 placement
/**
 * 读取 tengu_harbor_kite_mode_emit 开关。
 */
function isModeEmitFlagOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor_kite_mode_emit", true);
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
    case undefined:
      return "explicit-setting";
  }
}
//@ chunk-q40vccff.js:1013-1066 placement
/**
 * 入站策略的严格程度排序（accept < hold < refuse）。
 */
var POLICY_RANK; // deferred: uses EXTERNAL_PERMISSION_MODES (../../types/permissions.js) of its import cycle while loading; runs once the cycle is complete
var MAX_POLICY_SETTING_CHARS;
var PERMISSION_MODE_SET;
deferInit("chunk-q40vccff.js:1013", () => {
  POLICY_RANK = {
    accept: 0,
    hold: 1,
    refuse: 2,
  };
  MAX_POLICY_SETTING_CHARS = 100;
  PERMISSION_MODE_SET = new Set(PERMISSION_MODES);
});
//@ chunk-q40vccff.js:1066-1347 placement
/**
 * 设置跨会话入站模式的读取函数：设置时清除关闭状态并通知模式变化；清除时先记住当前模式。
 */
function setInboundModeGetter(readMode) {
  if (readMode !== null) {
    swarmHostState().inbound.shuttingDown = false;
    registerShutdownSettle();
    swarmHostState().inbound.modeAtUnwire = undefined;
  } else {
    let getCurrentMode = swarmHostState().inbound.getCurrentMode;
    if (getCurrentMode !== null)
      try {
        swarmHostState().inbound.modeAtUnwire = getCurrentMode();
      } catch {
        swarmHostState().inbound.modeAtUnwire = undefined;
      }
  }
  swarmHostState().inbound.getCurrentMode = readMode;
  if (readMode !== null) refreshAndReevaluateHeld("mode-changed");
}
//@ chunk-q40vccff.js:1347-1389 placement
/**
 * 注册“对等消息被暂扣”的回调。
 */
function setOnPeerHeld(onPeerHeld) {
  swarmHostState().inbound.onPeerHeld = onPeerHeld;
}
//@ chunk-q40vccff.js:1389-1436 placement
/**
 * 注册发送对等回执的函数。
 */
function setSendPeerReceipt(sendPeerReceipt) {
  swarmHostState().inbound.sendPeerReceipt = sendPeerReceipt;
}
//@ chunk-q40vccff.js:1436-1535 placement
/**
 * 发送 prompt 模式的对等回执。
 */
function sendPromptReceipt(origin, requestId) {
  swarmHostState().inbound.sendPeerReceipt?.(
    {
      mode: "prompt",
      agentId: mainAgentId(),
      value: "",
      origin,
    },
    requestId,
  );
}
//@ chunk-q40vccff.js:1535-1721 placement
/**
 * 设置入站可用性发布函数，开启时立即发布并在特性开关刷新时重新发布。
 */
function setInboundAvailabilityPublisher(reportBridgeCrossSessionInbound) {
  let inbound = swarmHostState().inbound;
  inbound.publishAvailability = reportBridgeCrossSessionInbound;
  inbound.unsubscribeAvailabilityRefresh?.();
  inbound.unsubscribeAvailabilityRefresh = null;
  if (reportBridgeCrossSessionInbound) {
    publishInboundAvailability();
    inbound.unsubscribeAvailabilityRefresh = onGrowthBookRefresh(publishInboundAvailability);
  }
}
//@ chunk-q40vccff.js:1721-1787 placement
/**
 * 发布入站可用性（当前是否未被拒）。
 */
function publishInboundAvailability() {
  swarmHostState().inbound.publishAvailability?.(inboundRefuseCause() === undefined);
}
//@ chunk-q40vccff.js:1787-1838 placement
/**
 * 注册记录通信方的回调。
 */
function setRecordCorrespondent(recordCorrespondent) {
  swarmHostState().inbound.recordCorrespondent = recordCorrespondent;
}
//@ chunk-q40vccff.js:1838-1848 placement
/**
 * 关闭时等待暂扣消息结算的时长（750 毫秒）。
 */
var SHUTDOWN_SETTLE_MS = 750;
//@ chunk-q40vccff.js:1848-1947 placement
/**
 * 注册关闭时的暂扣结算清理（只注册一次）。
 */
function registerShutdownSettle() {
  if (swarmHostState().inbound.shutdownSettleHandle === null)
    swarmHostState().inbound.shutdownSettleHandle = registerCleanup(settleHeldInboundOnShutdown);
}
//@ chunk-q40vccff.js:1947-2390 placement
/**
 * 关闭时把仍暂扣的跨会话消息按过期处理：发送回执并通知丢弃，最多等待一段时间。
 */
async function settleHeldInboundOnShutdown() {
  let inbound = swarmHostState().inbound;
  inbound.shutdownSettleHandle?.();
  inbound.shutdownSettleHandle = null;
  inbound.shuttingDown = true;
  if (inbound.held.length === 0) return;
  let held = inbound.held.splice(0, inbound.held.length);
  logForDebugging(
    `[cross-session-inbound] shutdown: settling ${held.length} still-held peer message(s) as expired`,
  );
  let admitted = [];
  for (let message of held) {
    admitted.push(inbound.sendPeerReceipt?.(message, "expired"));
    inbound.onPeerHoldDropped?.(message, "expired");
  }
  await Promise.race([
    Promise.allSettled(admitted),
    sleep(SHUTDOWN_SETTLE_MS, undefined, {
      unref: true,
    }),
  ]);
}
//@ chunk-q40vccff.js:2390-2478 placement
/**
 * 返回暂扣消息已公告的内容。
 */
function announcedHeldMessage(message) {
  let { inbound } = swarmHostState();
  return inbound.held.includes(message) ? inbound.announced.get(message) : undefined;
}
//@ chunk-q40vccff.js:2478-2527 placement
/**
 * 注册“对等暂扣被丢弃”的回调。
 */
function setOnPeerHoldDropped(onPeerHoldDropped) {
  swarmHostState().inbound.onPeerHoldDropped = onPeerHoldDropped;
}
//@ chunk-q40vccff.js:2527-2577 placement
/**
 * 注册“对等暂扣被释放”的回调。
 */
function setOnPeerHoldReleased(onPeerHoldReleased) {
  swarmHostState().inbound.onPeerHoldReleased = onPeerHoldReleased;
}
//@ chunk-q40vccff.js:2577-2609 placement
/**
 * 解析 crossSessionInbound 设置值（项目层可取更严格值）。
 */
function currentInboundSetting() {
  return resolveInboundSetting().value;
}
//@ chunk-q40vccff.js:2609-3113 placement
/**
 * 解析 crossSessionInbound 设置：先取策略/flag/用户设置，再让项目层取更严格的值（记为仓库设置）；设置无效时强制为 hold。
 */
function resolveInboundSetting() {
  let value;
  let decidedBy;
  for (let source of ["policySettings", "flagSettings", "userSettings"]) {
    if (!isSettingSourceEnabled(source)) continue;
    let crossSessionInbound = getSettingsForSource(source)?.crossSessionInbound;
    if (crossSessionInbound !== undefined) {
      value = crossSessionInbound;
      decidedBy = source;
      break;
    }
  }
  for (let source of ["localSettings", "projectSettings"]) {
    if (!isSettingSourceEnabled(source)) continue;
    let crossSessionInbound = getSettingsForSource(source)?.crossSessionInbound;
    if (crossSessionInbound === undefined) continue;
    if (POLICY_RANK[crossSessionInbound] > POLICY_RANK[value ?? "accept"]) {
      value = crossSessionInbound;
      decidedBy = "repoSettings";
    } else if (
      crossSessionInbound !== "accept" &&
      value !== undefined &&
      POLICY_RANK[crossSessionInbound] === POLICY_RANK[value] &&
      decidedBy !== "policySettings"
    )
      decidedBy = "repoSettings";
  }
  if (POLICY_RANK[value ?? "accept"] < POLICY_RANK.hold && hasKeybindingWarning()) {
    value = "hold";
    decidedBy = "invalidSetting";
  }
  return {
    value,
    decidedBy,
  };
}
export {
  sendPromptReceipt,
  settleHeldInboundOnShutdown,
  setSendPeerReceipt,
  setRecordCorrespondent,
  isModeEmitFlagOn,
  setOnPeerHeld,
  setOnPeerHoldDropped,
  setOnPeerHoldReleased,
  setInboundModeGetter,
  setInboundAvailabilityPublisher,
  currentInboundSetting,
  publishInboundAvailability,
  getInboundDecidedBy,
  PERMISSION_MODE_SET,
  MAX_POLICY_SETTING_CHARS,
  registerShutdownSettle,
  announcedHeldMessage,
};
