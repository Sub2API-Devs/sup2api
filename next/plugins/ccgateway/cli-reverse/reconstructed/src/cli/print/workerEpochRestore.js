/**
 * cli/print/workerEpochRestore.ts
 *
 * 2.1.316 新增：从上一个 worker 世代恢复开关（/pause-memory、exclude_dynamic_sections、主动性 opt-in），处理 initialize 里的主动性选择，并安装命令生命周期转发器。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (10)
 * attribution: placement 10
 */
import { randomUUID } from "crypto";
import { setMemoryToggledOff, getSessionId } from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";
import { logForDebugging } from "../../utils/debug.js";
import { withDeadline } from "../../utils/sleep.js";
import {
  initializeGrowthBook,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { PRINT_TURN_FLUSH_DELAY_MS } from "./lazyModules.js";
import {
  setProactivityLevel,
  proactivityMetadata,
  applyProactivityOptIn,
  notifyProactivityOptIn,
} from "./proactivityControl.js";
import { proactivityExclusionReason, BARE_ATTACHMENTS_REASON } from "../../Tool.js";
import { wrapCommandLifecycle } from "../../bridge/inboundMessageOrigin.js";
import { RemoteIO } from "../remoteIO.js";

//@ chunk-0yw3taqg.js:666462-666524 placement
function isArchivedAfterRestart(status, epoch) {
  return parseInt(epoch ?? "1", 10) > 1 && status === "archived";
}
//@ chunk-0yw3taqg.js:666524-666589 placement
function isArchivedAfterRestartNow(status) {
  return isArchivedAfterRestart(status, process.env.CLAUDE_CODE_WORKER_EPOCH);
}
//@ chunk-0yw3taqg.js:666589-666619 placement
function isWorkerEpochAfterFirst(epoch) {
  return (epoch ?? 1) > 1;
}
//@ chunk-0yw3taqg.js:667075-667252 placement
/**
 * 恢复上一个 worker 世代中关闭记忆的设置。
 */
function restoreMemoryToggle(restoredState) {
  if (restoredState?.internal?.memory_toggled_off !== true) return;
  setMemoryToggledOff(true);
  logEvent("tengu_memory_toggle_restored", {});
  logForDebugging("[print.ts] restored /pause-memory toggle from prior worker epoch");
}
//@ chunk-0yw3taqg.js:667252-667339 placement
function notifyExcludeDynamicSections(sessionState, excludeDynamicSections) {
  sessionState.notifyInternalMetadataChanged({
    exclude_dynamic_sections: excludeDynamicSections ? true : null,
  });
}
//@ chunk-0yw3taqg.js:667339-667720 placement
/**
 * 上一工作进程开启过 exclude_dynamic_sections 且本次未显式指定时恢复该选项；有 kill switch 时跳过。
 */
async function restoreExcludeDynamicSections(restoredState, options) {
  if (
    restoredState?.internal?.exclude_dynamic_sections !== true ||
    options.excludeDynamicSections !== undefined
  )
    return;
  await withDeadline(
    initializeGrowthBook().catch(() => null),
    PRINT_TURN_FLUSH_DELAY_MS,
  );
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_exclude_dynamic_restore_killswitch", false)) {
    logForDebugging("[print.ts] excludeDynamicSections restore skipped: kill switch set");
    return;
  }
  options.excludeDynamicSections = true;
  logForDebugging("[print.ts] restored excludeDynamicSections from prior worker epoch");
}
//@ chunk-0yw3taqg.js:667720-668287 placement
/**
 * 从上一工作进程恢复主动性（proactivity）开关：未开启则清掉元数据里的 proactivity；开启则设置等级并同步元数据、记录事件。
 */
function restoreProactivityOptIn(restoredState, { getAppState, setAppState, sessionState }) {
  {
    if (restoredState?.internal?.proactivity_opt_in !== true) {
      if (restoredState?.external?.proactivity != null)
        sessionState.notifyMetadataChanged({
          proactivity: null,
        });
      return;
    }
    let levelFromMirror = setProactivityLevel(restoredState.external?.proactivity, setAppState);
    sessionState.notifyMetadataChanged({
      proactivity: proactivityMetadata(getAppState()),
    });
    let reason = proactivityExclusionReason();
    logEvent("tengu_proactivity_opt_in_restored", {
      enabled: reason === undefined,
      level_from_mirror: levelFromMirror,
    });
    let selector =
      reason === undefined
        ? "on"
        : reason === "session_excluded"
          ? `off \u2014 session excluded (${BARE_ATTACHMENTS_REASON()})`
          : "off \u2014 a kill switch is set";
    logForDebugging(`[print.ts] restored proactivity opt-in from prior worker epoch (selector ${selector})`);
  }
}
//@ chunk-0yw3taqg.js:668287-668620 placement
/**
 * 处理 initialize 请求中的主动性开关：应用选择并通知会话状态。
 */
function applyInitializeProactivity(
  optIn,
  {
    reinitialize,
    permissionModeSuppliedOnInvocation,
    restartedWorker,
    planModeRestoredAtBoot,
    getAppState,
    setAppState,
    sessionState,
  },
) {
  if (typeof optIn !== "boolean") return;
  if (reinitialize && !optIn) return;
  applyProactivityOptIn({
    optIn,
    permissionModeSuppliedOnInvocation,
    attaching: restartedWorker || reinitialize,
    planModeRestoredAtBoot,
    getAppState,
    setAppState,
  });
  notifyProactivityOptIn(sessionState, optIn, getAppState());
}
//@ chunk-0yw3taqg.js:668620-668934 placement
/**
 * 安装命令生命周期事件转发器（只装一次），把状态变化发到输出流。
 */
function installCommandLifecycleForwarder(session, output) {
  if (session.commandLifecycleForwarderInstalled) return;
  session.commandLifecycleForwarderInstalled = true;
  wrapCommandLifecycle(session, (commandUuid, state, meta) => {
    output.enqueue({
      type: "command_lifecycle",
      command_uuid: commandUuid,
      state,
      ...(meta !== undefined && {
        wakeup_source: meta.wakeupSource,
      }),
      ...(meta?.scheduledFor !== undefined && {
        scheduled_for: meta.scheduledFor,
      }),
      uuid: randomUUID(),
      session_id: getSessionId(),
    });
  });
}
//@ chunk-0yw3taqg.js:668934-668981 placement
function installLifecycleForwarderUnlessRemote(session, output) {
  if (!(session instanceof RemoteIO)) installCommandLifecycleForwarder(session, output);
}
export {
  restoreMemoryToggle,
  restoreExcludeDynamicSections,
  restoreProactivityOptIn,
  isWorkerEpochAfterFirst,
  installLifecycleForwarderUnlessRemote,
  isArchivedAfterRestartNow,
  applyInitializeProactivity,
  notifyExcludeDynamicSections,
  installCommandLifecycleForwarder,
  isArchivedAfterRestart,
};
