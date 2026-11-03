/**
 * cli/print/backgroundWindDown.ts
 *
 * 2.1.316 新增：运行收尾时的后台任务终止、欠发任务通知、预算超限代理停止与附件上报
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (45)
 * attribution: placement 45
 */
import { join } from "path";
import { readdir } from "fs/promises";
import { randomUUID } from "crypto";
import {
  FOLD_END_NO_MORE_ROWS,
  FOLD_END_SOMETHING_FOLLOWS_MODEL_KEPT,
  FOLD_END_SOMETHING_FOLLOWS,
  FOLD_END_STOPPED,
} from "./followUpPreempt.js";
import {
  isCompactBoundaryOrSummary,
  isToolResultMessage,
  isContextAppendMessage,
  isInterruptionOnlyMessage,
} from "../../utils/messages.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { isNonPromptUserRow } from "../../utils/transcript/deserialize.js";
import { logError } from "../../utils/log.js";
import { env } from "../../utils/env.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { hasManagedSettings } from "../../utils/settings/managedRestrictionKeys.js";
import { isPolicyVerdictAbsent } from "../../services/policyLimits/policyVerdicts.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { getAttachmentsRoot } from "../../utils/stageFileRoots.js";
import { openOwnedDirChain, probeNoFollowSupport } from "../../utils/safeMkdir.js";
import {
  setLocalUploadsRoot,
  getSessionId,
  setTeardownUnwindRequested,
  getTeardownUnwindRequested,
} from "../../bootstrap/state.js";
import { hashSessionAddress } from "../../utils/sessionUrl.js";
import { count } from "../../utils/collections.js";
import { createAutocompactStateReporter } from "../../services/compact/autoCompactStatus.js";
import { rememberPdfPageLimits } from "../../tools/FileReadTool/FileReadTool.js";
import { initializeGrowthBook } from "../../services/analytics/growthbook.js";
import { hasReachedBudget, getSessionCostUSD } from "../../cost-tracker.js";
import { waitForTaskCompletion } from "../../tools/TaskOutputTool/TaskOutputTool.js";
import {
  isWaitableAgentOrWorkflow,
  isHeldMcpTask,
  isMonitorShellTask,
  skipsTranscript,
  isBackgroundedShellTask,
} from "../../tasks/taskKinds.js";
import {
  isObserverAgentTask,
  killAsyncAgent,
  markAgentNotified,
  dropQueuedCommandsForAgent,
} from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { isShuttingDown } from "../../utils/gracefulShutdown.js";
import { logForDebugging } from "../../utils/debug.js";
import { stopAllRunningTasks } from "../../tasks/stopTask.js";
import { createTaskFramework } from "../../utils/task/framework.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { AGENT_STALL_GRACE_MS } from "../../tools/AgentTool/agentToolUtils.js";
import { getTaskRunState, emitTaskNotification } from "../../utils/task/taskNotifications.js";
import { isLocalShellTask } from "../../tasks/LocalShellTask/guards.js";
import { killTask } from "../../tasks/LocalShellTask/killShellTasks.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { lookupTaskForStop } from "../../utils/swarm/teammateAddressLookup.js";

//@ chunk-tyg7f3ek.js:95577-96479 placement
/**
 * 回看转录，判断被折叠进上一轮的后续排队消息是否已被模型读到/回复，用于结果遥测。
 */
function classifyFoldedFollowUps(messages, n, r) {
  let s = new Map();
  try {
    let index = messages.findIndex((R) => queuedCommandSourceUuid(R) !== undefined);
    let y = FOLD_END_NO_MORE_ROWS;
    let S = FOLD_END_NO_MORE_ROWS;
    for (let j = messages.length - 1; index !== -1 && j >= index; j--) {
      let w = messages[j];
      if (n.has(w)) continue;
      if ("isSidechain" in w && w.isSidechain === true) continue;
      if (isCompactBoundaryOrSummary(w)) {
        y = S = FOLD_END_SOMETHING_FOLLOWS_MODEL_KEPT;
        continue;
      }
      if (w.type === "attachment") {
        let P = queuedCommandSourceUuid(w);
        if (P !== undefined && !s.has(P)) s.set(P, foldedFollowUpState(y, r));
      } else if (w.type === "assistant") {
        if (w.isApiErrorMessage || w.message.model === SYNTHETIC_MODEL) continue;
        let content = Array.isArray(w.message.content) ? w.message.content : [];
        let any = content.some((x) => x.type === "tool_use");
        let any_2 = content.some((x) => x.type === "text" && x.text.trim() !== "");
        if (!any && !any_2) {
          y = withModelEndedTurnDefault(y);
          S = withModelEndedTurnDefault(S);
          continue;
        }
        S = FOLD_END_SOMETHING_FOLLOWS;
        if (!y.modelWrote)
          y = {
            ...y,
            modelWrote: true,
            modelEndedTheTurn: y.modelEndedTheTurn ?? (any_2 && !any && w.message.stop_reason === "end_turn"),
          };
      } else if (w.type !== "user") continue;
      else if (isToolResultMessage(w)) y = S = withModelEndedTurnDefault(y);
      else if (isContextAppendMessage(w)) y = S;
      else if (isInterruptionOnlyMessage(w) && w.interruptedByShutdown !== true) y = S = FOLD_END_STOPPED;
      else if (!isNonPromptUserRow(w)) y = S = FOLD_END_SOMETHING_FOLLOWS;
      else {
        y = withModelEndedTurnDefault(y);
        S = withModelEndedTurnDefault(S);
      }
    }
  } catch (error) {
    logError(error);
  }
  return s;
}
//@ chunk-tyg7f3ek.js:96479-96628 placement
function queuedCommandSourceUuid(e) {
  return e.type === "attachment" &&
    e.attachment.type === "queued_command" &&
    e.attachment.commandMode !== undefined
    ? e.attachment.source_uuid
    : undefined;
}
//@ chunk-tyg7f3ek.js:96628-96709 placement
function withModelEndedTurnDefault(e) {
  return e.modelEndedTheTurn === undefined
    ? {
        ...e,
        modelEndedTheTurn: false,
      }
    : e;
}
//@ chunk-tyg7f3ek.js:96709-97015 placement
function foldedFollowUpState(e, n) {
  if (e.end === "stopped")
    return {
      state: "stopped",
    };
  if (e.end === "no_more_rows" && n)
    return {
      state: "open",
      replySeen: e.modelWrote,
    };
  if (!e.modelWrote)
    return {
      state: "unread",
    };
  if (e.modelEndedTheTurn === true)
    return {
      state: "finished",
    };
  return e.end === "something_follows"
    ? {
        state: "left",
      }
    : {
        state: "open",
        replySeen: true,
      };
}
//@ chunk-tyg7f3ek.js:97015-97259 placement
function foldedFollowUpTelemetry(e, { cardCanBeHeld, openerKnown }) {
  if (e === undefined) return {};
  if (e.state !== "open")
    return {
      folded_follow_up: e.state,
    };
  return {
    folded_follow_up: "open",
    folded_turn_reply_seen: e.replySeen,
    folded_turn_opener_known: openerKnown,
    folded_turn_has_owner: cardCanBeHeld && openerKnown,
  };
}
//@ chunk-tyg7f3ek.js:97327-97339 placement
var MAX_USER_DATA_ATTACHMENT_FILES = 1000;
//@ chunk-tyg7f3ek.js:97339-98319 placement
async function reportUserDataAttachments(sdkUrl) {
  let CLAUDE_CODE_REMOTE_SESSION_ID = env.CLAUDE_CODE_REMOTE_SESSION_ID;
  if (
    !env.CLAUDE_CODE_ATTACHMENTS_IN_USER_DATA ||
    !sdkUrl ||
    !CLAUDE_CODE_REMOTE_SESSION_ID ||
    !isRemoteManagedEnvironment() ||
    !hasManagedSettings()
  )
    return;
  let r = await import("./chunk-xdz4h5jb.js")
    .then((w) => {
      let P = isPolicyVerdictAbsent();
      return w.isRetentionExemptionDisabled() ? "retention_governed" : P ? "retention_unknown" : null;
    })
    .catch(() => "retention_unknown");
  if (r !== null) {
    logForDiagnosticsNoPII("warn", "attachments_in_user_data", {
      state: "not_used",
      reason: r,
    });
    logFeatureSad("bridge_attachment_user_data_root", r);
    return;
  }
  let attachmentsRoot = getAttachmentsRoot();
  let h = await openOwnedDirChain(attachmentsRoot, 1).catch(() => "unknown");
  if (typeof h === "string") {
    logForDiagnosticsNoPII("warn", "attachments_in_user_data", {
      state: "not_used",
      reason: h,
    });
    logFeatureSad("bridge_attachment_user_data_root", h);
    return;
  }
  let y = await probeNoFollowSupport(h);
  await h.release();
  if (y !== true) {
    logForDiagnosticsNoPII("warn", "attachments_in_user_data", {
      state: "not_used",
      reason: y,
    });
    logFeatureSad("bridge_attachment_user_data_root", y);
    return;
  }
  setLocalUploadsRoot(attachmentsRoot);
  let S = await countUserDataFiles(join(attachmentsRoot, hashSessionAddress(CLAUDE_CODE_REMOTE_SESSION_ID)));
  let R = {
    session_folder_existed: S !== null,
    files_found: S ?? 0,
  };
  logFeatureOk("bridge_attachment_user_data_root", R);
  if (R.files_found > 0) logFeatureOk("bridge_attachment_user_data_files_found");
}
//@ chunk-tyg7f3ek.js:98319-98422 placement
async function countUserDataFiles(e) {
  try {
    return Math.min(
      count(await readdir(e), (n) => !n.startsWith(".")),
      MAX_USER_DATA_ATTACHMENT_FILES,
    );
  } catch {
    return null;
  }
}
//@ chunk-tyg7f3ek.js:98459-98992 placement
/**
 * 安装 autocompact 状态监听：变化时把 enabled/阈值等推送给 SDK 宿主并更新会话状态。
 */
function installAutocompactStateReporter({ session, sessionState, enqueue, readInputs, reportContextUsage }) {
  let autocompactStateReporter = createAutocompactStateReporter((last) => {
    if (session !== undefined) rememberPdfPageLimits(session, last);
    enqueue({
      type: "autocompact_state",
      value: {
        enabled: last.enabled,
        effective_window: last.effectiveWindow,
        threshold: last.threshold,
        enforced: last.enforced,
        source: last.source,
      },
      uuid: randomUUID(),
      session_id: getSessionId(),
    });
  });
  let S = () => {
    try {
      let { model, autoCompactWindow } = readInputs();
      autocompactStateReporter.notify(model, autoCompactWindow);
    } catch (error) {
      logError(error);
    }
  };
  let R = false;
  initializeGrowthBook()
    .catch(() => {})
    .then(() => {
      R = true;
      sessionState.onAutocompactInputsChanged = () => {
        S();
        reportContextUsage();
      };
      sessionState.onConversationReset = () => {
        autocompactStateReporter.reset();
        S();
      };
      S();
      reportContextUsage();
    });
  return () => {
    if (R) S();
  };
}
//@ chunk-tyg7f3ek.js:98992-99014 placement
function requestTeardownUnwind() {
  setTeardownUnwindRequested(true);
}
//@ chunk-tyg7f3ek.js:99014-99041 placement
function isTeardownUnwindRequested() {
  return getTeardownUnwindRequested();
}
//@ chunk-tyg7f3ek.js:99041-99063 placement
function clearTeardownUnwind() {
  setTeardownUnwindRequested(false);
}
//@ chunk-tyg7f3ek.js:99063-99180 placement
function hasBudgetBoundBackgroundAgents(maxBudgetUsd, n) {
  if (!hasReachedBudget(maxBudgetUsd)) return false;
  return n.some(
    (r) =>
      r.status === "running" &&
      waitForTaskCompletion(r) &&
      isWaitableAgentOrWorkflow(r) &&
      !isObserverAgentTask(r) &&
      !r.stoppedByUser,
  );
}
//@ chunk-tyg7f3ek.js:99180-99672 placement
/**
 * --max-budget-usd 达到时停止仍在运行的后台 agent，返回是否停止了任何任务。
 */
function stopAgentsOverBudget({
  maxBudgetUsd,
  abortedForShutdown,
  turnAborted,
  getAppState,
  setAppState,
  storageV5,
}) {
  if (isShuttingDown() || abortedForShutdown || (isTeardownUnwindRequested() && turnAborted)) return false;
  let values = Object.values(getAppState().tasks ?? {});
  if (!hasBudgetBoundBackgroundAgents(maxBudgetUsd, values)) return false;
  logForDebugging(
    `print budget halt: this run's spend ${getSessionCostUSD()} reached --max-budget-usd ${maxBudgetUsd}; stopping background agents`,
  );
  process.stderr
    .write(`Budget limit reached ($${getSessionCostUSD().toFixed(2)} of $${maxBudgetUsd}); stopping background agents.
`);
  logFeatureOk("print_budget_halt");
  stopAllRunningTasks({
    taskRegistry: createTaskFramework(getAppState, setAppState),
    setAppState,
    storageV5,
  });
  return true;
}
//@ chunk-tyg7f3ek.js:99672-99806 placement
function isUnnotifiedTerminalTask(e) {
  if (!isWaitableAgentOrWorkflow(e)) return false;
  if ("isBackgrounded" in e && e.isBackgrounded === false) return false;
  if (!isTerminalTaskStatus(e.status)) return false;
  return !e.notified;
}
//@ chunk-tyg7f3ek.js:99806-100304 placement
/**
 * 找出已结束但完成通知尚未入队的后台任务，带超时标记，避免无限等待。
 */
function collectOwedTaskNotifications({ tasks, waits, now }) {
  let s = false;
  let h = new Set();
  for (let task of tasks) {
    if (!isUnnotifiedTerminalTask(task)) continue;
    h.add(task.id);
    let S = waits.get(task.id);
    if (!S) {
      S = {
        firstSeen: now,
        expired: false,
      };
      waits.set(task.id, S);
    }
    if (S.expired) continue;
    if (now - S.firstSeen >= AGENT_STALL_GRACE_MS) {
      S.expired = true;
      logForDebugging(
        `[print] task ${task.id} is terminal but its completion notification did not enqueue within ${AGENT_STALL_GRACE_MS}ms \u2014 exiting without it (enqueue dropped, or post-completion work still in flight)`,
        {
          level: "warn",
        },
      );
      continue;
    }
    s = true;
  }
  for (let key of waits.keys()) if (!h.has(key)) waits.delete(key);
  return s;
}
//@ chunk-tyg7f3ek.js:100304-100368 placement
function reportsRunningBackgroundTasks() {
  return env.CLAUDE_CODE_BG_TASKS_REPORT_RUNNING !== false;
}
//@ chunk-tyg7f3ek.js:100368-100432 placement
function reportsRunningBackgroundTasksExplicit() {
  return env.CLAUDE_CODE_BG_TASKS_REPORT_RUNNING === true;
}
//@ chunk-tyg7f3ek.js:100432-100588 placement
function isAwaitedBackgroundTask(e) {
  return (
    isWaitableBackgroundTask(e) &&
    !isHeldMcpTask(e) &&
    !(e.type === "remote_agent" && e.isLongRunning) &&
    !((e.type === "monitor_ws" || e.type === "monitor_mcp") && e.timeoutId === undefined)
  );
}
//@ chunk-tyg7f3ek.js:100588-100711 placement = hasWorkingInProcessTeammates (0.79)
/**
 * 同进程 teammate 是否仍算"工作中"：运行中且非空闲，或还欠 leader 一条空闲通知。
 */
function isTeammateStillWorking(task) {
  return (
    task.type === "in_process_teammate" &&
    task.status === "running" &&
    (!task.isIdle || task.idleNotificationOwedToLead === true)
  );
}
//@ chunk-tyg7f3ek.js:100711-100747 placement
function isAmbientBackgroundTask(e) {
  return isWaitableBackgroundTask(e) && !isAwaitedBackgroundTask(e);
}
//@ chunk-tyg7f3ek.js:100747-100799 placement
function hasAwaitedRunningTaskIn(tasks) {
  return Object.values(tasks ?? {}).some(isAwaitedRunningTask);
}
//@ chunk-tyg7f3ek.js:100799-100856 placement = requestTeammateShutdown (1)
/**
 * 运行中且属于需要等待完成的任务。
 */
function isAwaitedRunningTask(e) {
  return e.status === "running" && waitForTaskCompletion(e) && isWaitableAgentOrWorkflow(e);
}
//@ chunk-tyg7f3ek.js:100856-100938 placement = requestTeammateShutdown (1)
/**
 * 任务表里是否有运行中且需要等待完成的任务。
 */
function hasAwaitedRunningTasks(tasks) {
  return Object.values(tasks ?? {}).some((task) => task.status === "running" && waitForTaskCompletion(task));
}
//@ chunk-tyg7f3ek.js:100938-101031 placement
function isUnownedRunningShell(e) {
  return (
    e.status === "running" && waitForTaskCompletion(e) && e.type === "local_bash" && e.agentId === undefined
  );
}
//@ chunk-tyg7f3ek.js:101031-101111 placement
function hasInputClosedWithRunningTasks({ inputClosed, runningTasks }) {
  return (
    inputClosed &&
    runningTasks.some(
      (runningTask) => isWaitableAgentOrWorkflow(runningTask) && waitForTaskCompletion(runningTask),
    )
  );
}
//@ chunk-tyg7f3ek.js:101111-101236 placement
function shouldReleaseHeldResults({
  aborted,
  shuttingDown,
  abortedForShutdown,
  teardownRequested,
  heldResultCount,
}) {
  return aborted && !shuttingDown && !abortedForShutdown && !teardownRequested && heldResultCount > 0;
}
//@ chunk-tyg7f3ek.js:101236-101398 placement
function shouldStayRunningForInput({
  inputClosed,
  currentState,
  hasActiveTeammates,
  hasRunningBgTasks,
  hasPendingNotification,
}) {
  if ((hasActiveTeammates || hasRunningBgTasks || hasPendingNotification) && reportsRunningBackgroundTasks())
    return false;
  return !inputClosed && currentState === "running";
}
//@ chunk-tyg7f3ek.js:101398-101695 placement
function summarizeTasksForTelemetry(e) {
  return e.map((n) => ({
    type: n.type,
    status: n.status,
    isBackgrounded: "isBackgrounded" in n ? n.isBackgrounded : undefined,
    isObserver: "isObserver" in n ? n.isObserver : undefined,
    ambient: "ambient" in n ? n.ambient : undefined,
    parked: "parked" in n ? n.parked : undefined,
    holdCapped: "holdCapped" in n ? n.holdCapped : undefined,
  }));
}
//@ chunk-tyg7f3ek.js:101695-101801 placement
function mayEndWithBackgroundWork({ hasActiveTeammates, hasRunningBgTasks, hasPendingNotification }) {
  return !(
    (hasActiveTeammates || hasRunningBgTasks || hasPendingNotification) &&
    reportsRunningBackgroundTasks()
  );
}
//@ chunk-tyg7f3ek.js:101801-102007 placement
function isWaitableBackgroundTask(e) {
  return (
    waitForTaskCompletion(e) &&
    e.type !== "in_process_teammate" &&
    e.type !== "local_bash" &&
    e.type !== "dream" &&
    e.type !== "post_turn_memory" &&
    !(e.type === "monitor_mcp" && e.streamed) &&
    !(e.type === "monitor_ws" && e.ambient)
  );
}
//@ chunk-tyg7f3ek.js:102007-102242 placement
function isShellHeldByPlugin(command) {
  for (let [n, r] of getTaskRunState().heldShellReleases)
    try {
      if (n(command)) return true;
    } catch (error) {
      if (!r.threw) {
        r.threw = true;
        logError(
          Error(
            "A built-in plugin threw while checking a background shell; claude -p keeps waiting for that shell",
            {
              cause: error,
            },
          ),
        );
      }
    }
  return false;
}
//@ chunk-tyg7f3ek.js:102242-102254 placement
var WIND_DOWN_GRACE_MS = 5000;
//@ chunk-tyg7f3ek.js:102254-102745 placement
/**
 * 综合输入是否关闭、主线程排队、teammate、通知、monitor/shell 持有、等待上限等，决定 print 模式是继续等后台任务还是收尾。
 */
function decideBackgroundWait({
  runningBackgroundTasks,
  inputClosed,
  hasMainThreadQueued,
  hasActiveTeammates,
  hasPendingNotification,
  holdForArmedMonitors,
  holdForBackgroundShells,
  ceilingExceeded,
  deadline,
  swept,
  now,
}) {
  if (!(
    inputClosed &&
    !hasMainThreadQueued &&
    !hasActiveTeammates &&
    runningBackgroundTasks.length > 0 &&
    (ceilingExceeded ||
      (!hasPendingNotification &&
        !runningBackgroundTasks.some(
          (runningBackgroundTask) =>
            isWaitableAgentOrWorkflow(runningBackgroundTask) ||
            (holdForArmedMonitors && isMonitorShellTask(runningBackgroundTask)) ||
            (holdForBackgroundShells && isKillableBackgroundTask(runningBackgroundTask)),
        )))
  ))
    return {
      deadline: null,
      swept: false,
      shouldSweep: false,
    };
  if (deadline === null)
    return {
      deadline: ceilingExceeded ? now : now + WIND_DOWN_GRACE_MS,
      swept: ceilingExceeded,
      shouldSweep: ceilingExceeded,
    };
  if (now < deadline)
    return {
      deadline,
      swept,
      shouldSweep: false,
    };
  return {
    deadline,
    swept: true,
    shouldSweep: !swept,
  };
}
//@ chunk-tyg7f3ek.js:102745-102755 placement
var SHELL_DEADLINE_GRACE_MS = WIND_DOWN_GRACE_MS;
//@ chunk-tyg7f3ek.js:102755-102847 placement
function hasShellBeforeDeadline(e, n) {
  return e.some(
    (r) =>
      isKillableBackgroundTask(r) &&
      isLocalShellTask(r) &&
      r.deadlineAt !== undefined &&
      r.deadlineAt + SHELL_DEADLINE_GRACE_MS > n,
  );
}
//@ chunk-tyg7f3ek.js:102847-102861 placement
var LOOP_WAKEUP_HOLD_MS = 120000;
//@ chunk-tyg7f3ek.js:102861-103006 placement
function hasPendingLoopWakeup(sessionCronTasks, { now, parkedSince }) {
  let s = parkedSince ?? now;
  return sessionCronTasks.some(
    (h) =>
      h.kind === "loop" &&
      (h.scheduledFor === undefined || now <= Math.max(h.scheduledFor, s) + LOOP_WAKEUP_HOLD_MS),
  );
}
//@ chunk-tyg7f3ek.js:103006-103681 placement
/**
 * print 收尾：在宽限期后杀掉后台 shell、观察者 agent 等仍在运行的任务。
 */
function killBackgroundTasksForWindDown(e, taskFramework, setState, featureValue_CACHED_MAY_BE_STALE) {
  for (let h of e)
    if (isLocalShellTask(h)) {
      logForDebugging(
        `print wind-down: killing background shell ${h.id} ("${h.description}") after ${WIND_DOWN_GRACE_MS}ms grace`,
      );
      killTask(h.id, taskFramework, {
        cause: "session_exit",
      });
    } else if (isObserverAgentTask(h)) {
      logForDebugging(
        `print wind-down: killing mid-delivery observer ${h.id} after ${WIND_DOWN_GRACE_MS}ms grace`,
      );
      killAsyncAgent(h.id, taskFramework);
    } else if (featureValue_CACHED_MAY_BE_STALE && isWaitableAgentOrWorkflow(h) && h.status === "running") {
      logForDebugging(
        `print wind-down: killing background ${h.type} task ${h.id} ("${h.description}") at the wait ceiling`,
      );
      getSelectableBackgroundTasks(h, taskFramework, setState);
    } else {
      logForDebugging(`print wind-down: no longer waiting on background ${h.type} task ${h.id}`);
      if (isLocalAgent(h)) h.spawnedSubagent?.killed("system");
      emitTaskNotification(h.id, "stopped", {
        toolUseId: h.toolUseId,
        summary: h.description,
        ambient: skipsTranscript(h),
      });
    }
  if (e.length > 0) logFeatureOk("print_wind_down");
}
//@ chunk-tyg7f3ek.js:103681-103815 placement = getSelectableBackgroundTasks (0.799)
async function getSelectableBackgroundTasks(e, n, r) {
  try {
    if (e.type === "local_agent") {
      markAgentNotified(e.id, n);
      dropQueuedCommandsForAgent(e.id);
    }
    await lookupTaskForStop(e.type)?.kill(e.id, n, r, "system");
  } catch (error) {
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:103815-103876 placement
function shouldKillOnStreamClose({ shuttingDown, remoteTransport }) {
  return !shuttingDown && !remoteTransport;
}
//@ chunk-tyg7f3ek.js:103876-104220 placement
function killOrphanedShells(taskFramework) {
  for (let n of Object.values(taskFramework.all())) {
    if (!isLocalShellTask(n) || n.status !== "running") continue;
    if (!n.isBackgrounded && n.agentId !== undefined) {
      let r = taskFramework.get(n.agentId);
      if (r === undefined || !isTerminalTaskStatus(r.status)) continue;
    }
    logForDebugging(
      `print teardown: killing shell ${n.id} ("${n.description}") still running at stream close`,
    );
    try {
      killTask(n.id, taskFramework, {
        cause: "session_exit",
      });
    } catch (error) {
      logError(error);
    }
  }
}
//@ chunk-tyg7f3ek.js:104220-104290 placement
function isKillableBackgroundTask(e) {
  return isBackgroundedShellTask(e) && !(e.type === "local_bash" && isShellHeldByPlugin(e.command));
}
//@ chunk-tyg7f3ek.js:104290-104303 placement
var WIND_DOWN_LOG_INTERVAL_MS = 30000;
//@ chunk-tyg7f3ek.js:104303-104419 placement
function makeThrottledLogger(keepAliveSender, n, r = Date.now) {
  let s = r();
  return () => {
    if (!n) return false;
    let h = r();
    if (h - s >= 30000) {
      keepAliveSender();
      s = h;
      return true;
    }
    return false;
  };
}
export {
  reportUserDataAttachments,
  classifyFoldedFollowUps,
  isTeardownUnwindRequested,
  clearTeardownUnwind,
  stopAgentsOverBudget,
  hasAwaitedRunningTaskIn,
  foldedFollowUpTelemetry,
  requestTeardownUnwind,
  installAutocompactStateReporter,
  hasAwaitedRunningTasks,
  collectOwedTaskNotifications,
  isTeammateStillWorking,
  isAwaitedBackgroundTask,
  mayEndWithBackgroundWork,
  reportsRunningBackgroundTasks,
  isAmbientBackgroundTask,
  summarizeTasksForTelemetry,
  makeThrottledLogger,
  shouldKillOnStreamClose,
  killOrphanedShells,
  hasPendingLoopWakeup,
  reportsRunningBackgroundTasksExplicit,
  WIND_DOWN_LOG_INTERVAL_MS,
  WIND_DOWN_GRACE_MS,
  hasShellBeforeDeadline,
  decideBackgroundWait,
  killBackgroundTasksForWindDown,
  shouldStayRunningForInput,
  hasInputClosedWithRunningTasks,
  shouldReleaseHeldResults,
  isUnownedRunningShell,
  isUnnotifiedTerminalTask,
};
