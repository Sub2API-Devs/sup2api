/**
 * cli/_new/restoreProactivityOptIn.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (11)
 * attribution: sole-consumer-new 11
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
} from "crypto";
import { createUserMessage } from "../../utils/messages.js";
import { COMMAND_NAME, LOCAL_COMMAND_STDOUT, LOCAL_COMMAND_STDERR } from "../../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { setMemoryToggledOff, getSessionId } from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";
import { logForDebugging } from "../../utils/debug.js";
import { withDeadline } from "../../utils/sleep.js";
import {
  initializeGrowthBook,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { fa } from "../print/lazyModules.js";
import {
  setProactivityLevel,
  proactivityMetadata,
  applyProactivityOptIn,
  notifyProactivityOptIn,
} from "../print/proactivityControl.js";
import { proactivityExclusionReason, BARE_ATTACHMENTS_REASON } from "../../Tool.js";
import { rPe } from "../../bridge/inboundMessageOrigin.js";
import { RemoteIO } from "../remoteIO.js";

//@ chunk-tyg7f3ek.js:624353-624415 sole-consumer-new
function Tz(e, n) {
  return parseInt(n ?? "1", 10) > 1 && e === "archived";
}
//@ chunk-tyg7f3ek.js:624415-624480 sole-consumer-new
function Yx(e) {
  return Tz(e, process.env.CLAUDE_CODE_WORKER_EPOCH);
}
//@ chunk-tyg7f3ek.js:624480-624510 sole-consumer-new
function Am(e) {
  return (e ?? 1) > 1;
}
/**
 * 把 /ultrareview 的启动结果转成 transcript 消息：命令行本身 + stdout（已启动）或 stderr（未启动，附 actionUrl）。needs-confirm 时不写。
 */
//@ chunk-tyg7f3ek.js:624510-624966 sole-consumer-new
function buildUltrareviewMessages(args, result) {
  if (result.status === "needs-confirm") return [];
  let r = createUserMessage({
    content: `<${COMMAND_NAME}>/ultrareview${args ? " " + escapeXml(args) : ""}</${COMMAND_NAME}>`,
    isMeta: !0,
  });
  if (result.status === "launched")
    return [
      r,
      createUserMessage({
        content: `<${LOCAL_COMMAND_STDOUT}>${escapeXml(result.message)}</${LOCAL_COMMAND_STDOUT}>`,
        isMeta: !0,
        localCommandOutput: "stdout",
      }),
    ];
  let s =
    result.status === "blocked" && result.actionUrl
      ? `${result.message}
More: ${result.actionUrl}`
      : result.message;
  return [
    r,
    createUserMessage({
      content: `<${LOCAL_COMMAND_STDERR}>Ultrareview did not launch: ${escapeXml(s)}</${LOCAL_COMMAND_STDERR}>`,
      isMeta: !0,
      localCommandOutput: "stderr",
    }),
  ];
}
/**
 * 恢复上一个 worker 世代中关闭记忆的设置。
 */
//@ chunk-tyg7f3ek.js:624966-625143 sole-consumer-new
function restoreMemoryToggle(restoredState) {
  if (restoredState?.internal?.memory_toggled_off !== !0) return;
  (setMemoryToggledOff(!0),
    logEvent("tengu_memory_toggle_restored", {}),
    logForDebugging("[print.ts] restored /pause-memory toggle from prior worker epoch"));
}
//@ chunk-tyg7f3ek.js:625143-625230 sole-consumer-new
function Pz(e, n) {
  e.notifyInternalMetadataChanged({ exclude_dynamic_sections: n ? !0 : null });
}
/**
 * 上一工作进程开启过 exclude_dynamic_sections 且本次未显式指定时恢复该选项；有 kill switch 时跳过。
 */
//@ chunk-tyg7f3ek.js:625230-625611 sole-consumer-new
async function restoreExcludeDynamicSections(restoredState, options) {
  if (restoredState?.internal?.exclude_dynamic_sections !== !0 || options.excludeDynamicSections !== void 0)
    return;
  if (
    (await withDeadline(
      initializeGrowthBook().catch(() => null),
      fa,
    ),
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_exclude_dynamic_restore_killswitch", !1))
  ) {
    logForDebugging("[print.ts] excludeDynamicSections restore skipped: kill switch set");
    return;
  }
  ((options.excludeDynamicSections = !0),
    logForDebugging("[print.ts] restored excludeDynamicSections from prior worker epoch"));
}
/**
 * 从上一工作进程恢复主动性（proactivity）开关：未开启则清掉元数据里的 proactivity；开启则设置等级并同步元数据、记录事件。
 */
//@ chunk-tyg7f3ek.js:625611-626178 sole-consumer-new
function restoreProactivityOptIn(
  restoredState,
  { getAppState: getAppState, setAppState: setAppState, sessionState: sessionState },
) {
  {
    if (restoredState?.internal?.proactivity_opt_in !== !0) {
      if (restoredState?.external?.proactivity != null)
        sessionState.notifyMetadataChanged({ proactivity: null });
      return;
    }
    let h = setProactivityLevel(restoredState.external?.proactivity, setAppState);
    sessionState.notifyMetadataChanged({ proactivity: proactivityMetadata(getAppState()) });
    let y = proactivityExclusionReason();
    logEvent("tengu_proactivity_opt_in_restored", { enabled: y === void 0, level_from_mirror: h });
    let S =
      y === void 0
        ? "on"
        : y === "session_excluded"
          ? `off \u2014 session excluded (${BARE_ATTACHMENTS_REASON()})`
          : "off \u2014 a kill switch is set";
    logForDebugging(`[print.ts] restored proactivity opt-in from prior worker epoch (selector ${S})`);
  }
}
/**
 * 处理 initialize 请求中的主动性开关：应用选择并通知会话状态。
 */
//@ chunk-tyg7f3ek.js:626178-626511 sole-consumer-new
function applyInitializeProactivity(
  optIn,
  {
    reinitialize: reinitialize,
    permissionModeSuppliedOnInvocation: permissionModeSuppliedOnInvocation,
    restartedWorker: restartedWorker,
    planModeRestoredAtBoot: planModeRestoredAtBoot,
    getAppState: getAppState,
    setAppState: setAppState,
    sessionState: sessionState,
  },
) {
  if (typeof optIn !== "boolean") return;
  if (reinitialize && !optIn) return;
  (applyProactivityOptIn({
    optIn: optIn,
    permissionModeSuppliedOnInvocation: permissionModeSuppliedOnInvocation,
    attaching: restartedWorker || reinitialize,
    planModeRestoredAtBoot: planModeRestoredAtBoot,
    getAppState: getAppState,
    setAppState: setAppState,
  }),
    notifyProactivityOptIn(sessionState, optIn, getAppState()));
}
/**
 * 安装命令生命周期事件转发器（只装一次），把状态变化发到输出流。
 */
//@ chunk-tyg7f3ek.js:626511-626825 sole-consumer-new
function installCommandLifecycleForwarder(session, output) {
  if (session.commandLifecycleForwarderInstalled) return;
  ((session.commandLifecycleForwarderInstalled = !0),
    rPe(session, (r, s, h) => {
      output.enqueue({
        type: "command_lifecycle",
        command_uuid: r,
        state: s,
        ...(h !== void 0 && { wakeup_source: h.wakeupSource }),
        ...(h?.scheduledFor !== void 0 && { scheduled_for: h.scheduledFor }),
        uuid: randomUUID_19(),
        session_id: getSessionId(),
      });
    }));
}
//@ chunk-tyg7f3ek.js:626825-626872 sole-consumer-new
function Oz(e, n) {
  if (!(e instanceof RemoteIO)) installCommandLifecycleForwarder(e, n);
}

export {
  restoreMemoryToggle,
  restoreExcludeDynamicSections,
  restoreProactivityOptIn,
  Am,
  Oz,
  Yx,
  buildUltrareviewMessages,
  applyInitializeProactivity,
  Pz,
};
