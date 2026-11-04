/**
 * utils/crossSessionInbound/inboundGate.ts
 *
 * 2.1.316 新增：跨会话入站消息门槛
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q40vccff.js (34)
 * attribution: placement 34
 */
import {
  getInboundDecidedBy,
  currentInboundSetting,
  PERMISSION_MODE_SET,
  isModeEmitFlagOn,
  publishInboundAvailability,
  MAX_POLICY_SETTING_CHARS,
  registerShutdownSettle,
} from "./inboundMode.js";
import { isCrossSessionMessagingEnabled } from "../crossSessionMessagingGate.js";
import { logForDebugging } from "../debug.js";
import { isPlanBypass } from "../permissions/browserToolNames.js";
import { swarmHostState } from "../swarm/hostState.js";
import { errorMessage } from "../errors.js";
import { enqueueReportingAdmission } from "../messageQueueManager.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { RELAY_SOURCE_KINDS_2, SLACK_BOT } from "../../services/projectsRelay/relayConfig.js";
import { fragmentForLog } from "../udsMessaging/peerGuard.js";

//@ chunk-q40vccff.js:3208-3376 placement
function settingToInboundPolicy(setting) {
  switch (setting) {
    case "accept":
      return {
        policy: "accept",
      };
    case "hold":
      return {
        policy: "hold",
        holdCause: getInboundDecidedBy(),
      };
    case "refuse":
      return {
        policy: "refuse",
        refuseCause: "opt-out",
      };
  }
}
//@ chunk-q40vccff.js:3376-3461 placement
/**
 * 跨会话收信总开关关闭时返回“拒绝（kill-switch）”。
 */
function killSwitchInboundPolicy() {
  return isCrossSessionMessagingEnabled("receive")
    ? undefined
    : {
        policy: "refuse",
        refuseCause: "kill-switch",
      };
}
//@ chunk-q40vccff.js:3461-3840 placement
/**
 * 计算当前跨会话入站策略：总开关优先，其次显式设置；否则读取当前权限模式（读不到或未知模式时暂扣），绕过默认时暂扣，其余接受。
 */
function getCurrentInboundPolicy() {
  let killSwitch = killSwitchInboundPolicy();
  if (killSwitch) return killSwitch;
  let setting = currentInboundSetting();
  if (setting !== undefined) return settingToInboundPolicy(setting);
  let permissions = readCurrentPermissionMode();
  if (permissions === null)
    return {
      policy: "hold",
      holdCause: "mode-unknown",
    };
  if (!PERMISSION_MODE_SET.has(permissions.mode)) {
    logForDebugging(
      `[cross-session-inbound] unrecognized permission mode '${permissions.mode}' (fail-closed \u2192 hold)`,
    );
    return {
      policy: "hold",
      holdCause: "mode-unknown",
    };
  }
  return isBypassMode(permissions)
    ? {
        policy: "hold",
        holdCause: "bypass-default",
      }
    : {
        policy: "accept",
      };
}
//@ chunk-q40vccff.js:3840-3893 placement
/**
 * 计算当前入站策略：总开关优先，否则按来源的显式设置。
 */
function currentInboundPolicy(originInfo) {
  let killSwitch = killSwitchInboundPolicy();
  if (killSwitch) return killSwitch;
  return getPeerMessagePolicy(originInfo, false);
}
//@ chunk-q40vccff.js:3893-3922 placement
/**
 * 计算某对等来源的入站策略（显式设置、自己发的、未知模式、对方声明模式）。
 */
function peerInboundPolicy(originInfo) {
  return getPeerMessagePolicy(originInfo, true);
}
//@ chunk-q40vccff.js:3922-4422 placement
/**
 * 计算某条对等消息的入站策略：显式设置优先；自己发的接受；未知模式暂扣；对方声明的模式须与本端一致，未声明时本端为绕过模式则暂扣。
 */
function getPeerMessagePolicy(originInfo, fromMode) {
  let setting = currentInboundSetting();
  if (setting !== undefined) return settingToInboundPolicy(setting);
  if (originInfo?.selfSent)
    return {
      policy: "accept",
    };
  let currentMode = readCurrentPermissionMode();
  if (currentMode === null || !PERMISSION_MODE_SET.has(currentMode.mode)) {
    if (currentMode !== null)
      logForDebugging(
        `[cross-session-inbound] unrecognized permission mode '${currentMode.mode}' (fail-closed \u2192 hold)`,
      );
    return {
      policy: "hold",
      holdCause: "mode-unknown",
    };
  }
  let modeClass = modeClass_2(currentMode);
  let assertedMode = fromMode || isModeEmitFlagOn() ? originInfo?.fromMode : undefined;
  if (assertedMode !== undefined)
    return assertedMode === modeClass
      ? {
          policy: "accept",
        }
      : {
          policy: "hold",
          holdCause: "mode-mismatch",
        };
  return modeClass === "bypass"
    ? {
        policy: "hold",
        holdCause: "no-mode-asserted",
      }
    : {
        policy: "accept",
      };
}
//@ chunk-q40vccff.js:4422-4519 placement
/**
 * 判断权限模式是否为绕过（含计划模式绕过）。
 */
function isBypassMode(permissions) {
  return (
    permissions.mode === "bypassPermissions" ||
    isPlanBypass(permissions.mode, permissions.isBypassPermissionsModeAvailable)
  );
}
//@ chunk-q40vccff.js:4519-4568 placement
/**
 * 把权限模式归为 bypass 或 prompting。
 */
function modeClass_2(mode) {
  return isBypassMode(mode) ? "bypass" : "prompting";
}
//@ chunk-q40vccff.js:4568-4601 placement
/**
 * 返回当前入站策略的取值（accept/hold/refuse）。
 */
function currentPolicyValue() {
  return getCurrentInboundPolicy().policy;
}
//@ chunk-q40vccff.js:4601-4636 placement
/**
 * 返回某来源的入站策略取值。
 */
function inboundPolicyFor(gate) {
  return currentInboundPolicy(gate).policy;
}
//@ chunk-q40vccff.js:4636-4914 placement
function readCurrentPermissionMode() {
  let getCurrentMode = swarmHostState().inbound.getCurrentMode;
  if (getCurrentMode === null) {
    logForDebugging("[cross-session-inbound] permission-mode getter not wired (fail-closed \u2192 hold)");
    return null;
  }
  try {
    return getCurrentMode();
  } catch (error) {
    logForDebugging(
      `[cross-session-inbound] mode getter threw (${errorMessage(error)}; fail-closed \u2192 hold)`,
    );
    return null;
  }
}
//@ chunk-q40vccff.js:4914-5015 placement
/**
 * 是否处于绕过默认保留的状态（未显式设置，且当前模式在允许集合中并满足条件）。
 */
function isBypassDefaultHold() {
  if (currentInboundSetting() !== undefined) return false;
  let permissions = readCurrentPermissionMode();
  if (permissions === null || !PERMISSION_MODE_SET.has(permissions.mode)) return false;
  return isBypassMode(permissions);
}
//@ chunk-q40vccff.js:5015-5051 placement
/**
 * 返回按来源把关后的入站策略。
 */
function gatedPolicyFor(message) {
  return applyInboundPolicy(message, currentInboundPolicy(getPeerOriginInfo(message)));
}
//@ chunk-q40vccff.js:5051-5158 placement
function getPeerOriginInfo(message) {
  let origin = message.origin;
  if (!origin || origin.kind !== "peer") return;
  return {
    fromMode: origin.fromMode,
    selfSent: origin.selfSent,
  };
}
//@ chunk-q40vccff.js:5158-5443 placement
/**
 * 让对等消息经过入口守卫：未准入时发送 dropped 回执并返回 false，准入则记录通信方。
 */
function admitPeerMessage(message) {
  let admission;
  if (message.priority === "later") {
    let { priority, ...rest } = message;
    admission = enqueueReportingAdmission(rest, {
      receipt: "caller",
    });
  } else
    admission = enqueueReportingAdmission(message, {
      receipt: "caller",
    });
  if (!admission.admitted) {
    swarmHostState().inbound.sendPeerReceipt?.(message, "dropped", {
      dropReason: admission.reason,
      droppedMsgIds: [],
    });
    return false;
  }
  swarmHostState().inbound.recordCorrespondent?.(message);
  return true;
}
//@ chunk-q40vccff.js:5443-6442 placement
/**
 * 按策略处理入站对等消息：接受；拒绝（记日志并发 refused 回执）；暂扣（关闭中按过期处理，缓冲满时淘汰最早的，入队并通知、发 held 回执）。
 */
function applyInboundPolicy(message, policy) {
  let inbound = swarmHostState().inbound;
  switch ((publishInboundAvailability(), policy.policy)) {
    case "accept":
      reevaluateHeldMessages("policy-accepts");
      logFeatureOk("peer_inbound_gate");
      return "accept";
    case "refuse":
      logInboundRefused(
        policy.refuseCause === "kill-switch"
          ? describePeerMessage(message)
          : `crossSessionInbound=refuse: ${describePeerMessage(message)}`,
        policy.refuseCause,
      );
      inbound.sendPeerReceipt?.(message, "refused");
      return "refused";
    case "hold": {
      let { holdCause } = policy;
      if (inbound.shuttingDown) {
        logForDebugging(
          `[cross-session-inbound] shutdown: not parking a late peer message \u2014 settled as expired: ${describePeerMessage(message)}`,
        );
        inbound.sendPeerReceipt?.(message, "expired");
        logFeatureSad("peer_inbound_gate", "shutdown_expired");
        return "refused";
      }
      if (inbound.held.length >= MAX_POLICY_SETTING_CHARS) {
        let evicted = inbound.held.shift();
        if (evicted) {
          logForDebugging(
            `[cross-session-inbound] hold buffer full \u2014 evicted oldest as expired: ${describePeerMessage(evicted)}`,
          );
          inbound.sendPeerReceipt?.(evicted, "expired");
          inbound.onPeerHoldDropped?.(evicted, "expired");
        }
      }
      inbound.held.push(message);
      registerShutdownSettle();
      logForDebugging(
        `[cross-session-inbound] held inbound peer message (${inbound.held.length} held, cause=${holdCause}): ${describePeerMessage(message)}`,
      );
      logFeatureSad("peer_inbound_gate", "held");
      if (inbound.onPeerHeld) {
        inbound.onPeerHeld(message, inbound.held.length, holdCause);
        inbound.announced.set(message, holdCause);
      }
      inbound.sendPeerReceipt?.(message, "held");
      return "held";
    }
  }
}
//@ chunk-q40vccff.js:6442-6684 placement
/**
 * 把入站消息来源分类为 peer、host-injected、coordinator 或 ungated。
 */
function classifyInboundOrigin(origin) {
  if (!origin) return "ungated";
  if (origin.kind === "peer")
    return "hostInjected" in origin && origin.hostInjected === true ? "host-injected" : "peer";
  if (origin.kind === "task-notification" && "subkind" in origin && origin.subkind === "peer-send-message")
    return "coordinator";
  return "ungated";
}
//@ chunk-q40vccff.js:6684-6795 placement
/**
 * 入站消息是否需要把关：信封标记为 peer、来源需把关且非例外，或来自中继。
 */
function isGatedInbound({ ingressOrigin, inboundOrigin, envelopePeer = false }) {
  return (
    envelopePeer ||
    (classifyInboundOrigin(ingressOrigin) !== "ungated" && !isSlackBotPeer(ingressOrigin)) ||
    inboundOrigin === RELAY_SOURCE_KINDS_2
  );
}
//@ chunk-q40vccff.js:6795-6928 placement
function isSlackBotPeer(ingressOrigin) {
  return (
    !!ingressOrigin &&
    ingressOrigin.kind === "peer" &&
    !("hostInjected" in ingressOrigin && ingressOrigin.hostInjected === true) &&
    "inbound_origin" in ingressOrigin &&
    ingressOrigin.inbound_origin === SLACK_BOT
  );
}
//@ chunk-q40vccff.js:6928-7080 placement
/**
 * 按入站来源选择把关策略，ungated 直接接受。
 */
function gateInboundByOrigin(origin, message) {
  switch (classifyInboundOrigin(origin)) {
    case "peer":
      return gatedPolicyFor(message);
    case "host-injected":
      return gatedPeerPolicy(message);
    case "coordinator":
      return gatedSettingPolicy(message);
    case "ungated":
      return "accept";
  }
}
//@ chunk-q40vccff.js:7080-7236 placement
/**
 * 按入站来源给出拒收原因（peer 取当前原因，coordinator/host-injected 在拒收设置下为 opt-out）。
 */
function getInboundRefuseCause(origin) {
  switch (classifyInboundOrigin(origin)) {
    case "peer":
      return inboundRefuseCause();
    case "coordinator":
    case "host-injected":
      return currentInboundSetting() === "refuse" ? "opt-out" : undefined;
    case "ungated":
      return;
  }
}
//@ chunk-q40vccff.js:7236-7312 placement
/**
 * 当前入站被拒时返回原因，否则 undefined。
 */
function inboundRefuseCause() {
  let currentInboundPolicy = getCurrentInboundPolicy();
  if (currentInboundPolicy.policy !== "refuse") return;
  return currentInboundPolicy.refuseCause;
}
//@ chunk-q40vccff.js:7312-7378 placement
/**
 * 把设置值转成策略，未设置时用 accept。
 */
function settingOrAcceptPolicy() {
  let setting = currentInboundSetting();
  return setting !== undefined
    ? settingToInboundPolicy(setting)
    : {
        policy: "accept",
      };
}
//@ chunk-q40vccff.js:7378-7450 placement
/**
 * 把设置值转成策略并按来源把关。
 */
function gatedSettingPolicy(message) {
  let setting = currentInboundSetting();
  if (setting === undefined) return "accept";
  return applyInboundPolicy(message, settingToInboundPolicy(setting));
}
//@ chunk-q40vccff.js:7450-7486 placement
/**
 * 返回按对等来源把关后的入站策略。
 */
function gatedPeerPolicy(message) {
  return applyInboundPolicy(message, peerInboundPolicy(getPeerOriginInfo(message)));
}
//@ chunk-q40vccff.js:7486-7793 placement
/**
 * 记录入站 peer 消息被拒（区分 kill switch），并上报把关失败。
 */
function logInboundRefused(description, cause) {
  publishInboundAvailability();
  if (cause === "kill-switch") {
    logForDebugging(
      `[cross-session-inbound] refused inbound peer message \u2014 cross-session messaging disabled (kill switch) (${description})`,
    );
    logFeatureSad("peer_inbound_gate", "kill_switch");
    return;
  }
  logForDebugging(`[cross-session-inbound] refused inbound peer message (${description})`);
  logFeatureSad("peer_inbound_gate", "refused");
}
//@ chunk-q40vccff.js:7793-7827 placement
/**
 * 刷新入站可用性并重新评估暂扣消息。
 */
function refreshAndReevaluateHeld(origin) {
  publishInboundAvailability();
  return reevaluateHeldMessages(origin);
}
//@ chunk-q40vccff.js:7827-7968 placement
function getHeldMessagePolicy(message) {
  switch (classifyInboundOrigin(message.origin)) {
    case "coordinator":
      return settingOrAcceptPolicy();
    case "host-injected":
      return peerInboundPolicy(getPeerOriginInfo(message));
    case "peer":
    case "ungated":
      return currentInboundPolicy(getPeerOriginInfo(message));
  }
}
//@ chunk-q40vccff.js:7968-9034 placement
/**
 * 策略变化后重新评估暂扣的对等消息：拒绝的发回执并丢弃，仍暂扣的在原因变化时重新通知，可接受的经入口守卫放行并发 delivered 回执。返回放行数。
 */
function reevaluateHeldMessages(origin) {
  let inbound = swarmHostState().inbound;
  let held = inbound.held;
  if (held.length === 0) return 0;
  let stillHeld = [];
  let releasable = [];
  let reannounce = [];
  let refusedCount = 0;
  let killSwitchCount = 0;
  for (let message of held) {
    let heldMessagePolicy = getHeldMessagePolicy(message);
    if (heldMessagePolicy.policy === "accept") releasable.push(message);
    else if (heldMessagePolicy.policy === "refuse") {
      refusedCount += 1;
      if (heldMessagePolicy.refuseCause === "kill-switch") killSwitchCount += 1;
      inbound.sendPeerReceipt?.(message, "refused");
      inbound.onPeerHoldDropped?.(message, "refused");
    } else {
      stillHeld.push(message);
      if (inbound.announced.get(message) !== heldMessagePolicy.holdCause)
        reannounce.push([message, heldMessagePolicy.holdCause]);
    }
  }
  held.length = 0;
  held.push(...stillHeld);
  for (let [message, holdCause] of reannounce) {
    inbound.announced.set(message, holdCause);
    inbound.onPeerHeld?.(message, held.length, holdCause);
  }
  if (refusedCount > 0)
    logForDebugging(
      killSwitchCount === refusedCount
        ? `[cross-session-inbound] gate off \u2014 dropped ${refusedCount} parked peer message(s) (cross-session messaging disabled)`
        : `[cross-session-inbound] dropped ${refusedCount} held peer message(s) \u2014 policy is now refuse`,
    );
  if (releasable.length === 0) return 0;
  let admitted = [];
  for (let message of releasable)
    if (admitPeerMessage(message)) {
      admitted.push(message);
      logFeatureOk("peer_inbound_gate");
    } else inbound.onPeerHoldDropped?.(message, "dropped");
  logForDebugging(
    `[cross-session-inbound] released ${releasable.length} held peer message(s) (${origin}) \u2014 ${admitted.length} admitted by the ingress guard; ${held.length} still held`,
  );
  if (admitted.length > 0) inbound.onPeerHoldReleased?.(admitted, origin);
  for (let message of admitted) inbound.sendPeerReceipt?.(message, "delivered");
  return releasable.length;
}
//@ chunk-q40vccff.js:9034-10030 placement
/**
 * 处理用户对暂扣消息的决定：批准时再检查策略与入口守卫后放行；拒绝或过期时发送相应回执并丢弃。
 */
function resolveHeldMessage(heldMessage, decision) {
  let inbound = swarmHostState().inbound;
  let index = inbound.held.indexOf(heldMessage);
  if (index === -1) return "gone";
  let [message] = inbound.held.splice(index, 1);
  if (!message) return "gone";
  if (decision === "approve") {
    let verdict = getHeldMessagePolicy(message);
    if (verdict.policy === "refuse") {
      let isKillSwitch = verdict.refuseCause === "kill-switch";
      logForDebugging(
        `[cross-session-inbound] held peer message approved but policy is now refuse (${isKillSwitch ? "kill switch" : "opt-out"}) \u2014 dropped`,
      );
      inbound.sendPeerReceipt?.(message, "refused");
      inbound.onPeerHoldDropped?.(message, "refused");
      return "dropped";
    }
    if (!admitPeerMessage(message)) {
      logForDebugging(
        "[cross-session-inbound] held peer message approved but DROPPED by the ingress guard on release",
      );
      inbound.onPeerHoldDropped?.(message, "dropped");
      return "dropped-by-guard";
    }
    logForDebugging("[cross-session-inbound] held peer message APPROVED \u2014 released to queue");
    logFeatureOk("peer_inbound_gate");
    inbound.onPeerHoldReleased?.([message], "approved");
    inbound.sendPeerReceipt?.(message, "delivered");
    return "delivered";
  }
  logForDebugging(
    `[cross-session-inbound] held peer message ${decision === "deny" ? "DENIED" : "EXPIRED/CANCELLED"} \u2014 dropped with denial receipt`,
  );
  let receipt = decision === "deny" ? "denied" : "expired";
  inbound.sendPeerReceipt?.(message, receipt);
  return "dropped";
}
//@ chunk-q40vccff.js:10030-10070 placement
/**
 * 返回当前暂扣的入站消息列表。
 */
function heldInboundMessages() {
  return swarmHostState().inbound.held;
}
//@ chunk-q40vccff.js:10070-10117 placement
/**
 * 返回暂扣入站消息的数量。
 */
function heldInboundCount() {
  return swarmHostState().inbound.held.length;
}
//@ chunk-q40vccff.js:10117-10165 placement
/**
 * 判断入站是否正在关闭。
 */
function isInboundShuttingDown() {
  return swarmHostState().inbound.shuttingDown;
}
//@ chunk-q40vccff.js:10165-10349 placement
function describePeerMessage(message) {
  let from =
    message.origin?.kind === "peer" && typeof message.origin.from === "string"
      ? message.origin.from
      : "unknown";
  let text = typeof message.value === "string" ? message.value : "[blocks]";
  return `from=${fragmentForLog(from)} "${fragmentForLog(text, 60)}"`;
}
export {
  inboundRefuseCause,
  logInboundRefused,
  gatedPolicyFor,
  isBypassDefaultHold,
  modeClass_2,
  refreshAndReevaluateHeld,
  resolveHeldMessage,
  getInboundRefuseCause,
  isGatedInbound,
  gateInboundByOrigin,
  classifyInboundOrigin,
  currentPolicyValue,
  isInboundShuttingDown,
  gatedPeerPolicy,
  heldInboundMessages,
  heldInboundCount,
  inboundPolicyFor,
};
