/**
 * cli/print/backgroundWait.ts
 *
 * 2.1.316 新增：等待后台任务与队列空闲（等待器、心跳、排队提示计数）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (14)
 * attribution: placement 14
 */
import { isDiskless } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { sendSessionActivitySignal_2, hasActiveWork } from "../../utils/sessionActivity.js";
import { logError } from "../../utils/log.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import {
  WIND_DOWN_LOG_INTERVAL_MS,
  WIND_DOWN_GRACE_MS,
  stopAgentsOverBudget,
  collectOwedTaskNotifications,
  hasShellBeforeDeadline,
  decideBackgroundWait,
  killBackgroundTasksForWindDown,
  shouldStayRunningForInput,
  isAwaitedBackgroundTask,
} from "./backgroundWindDown.js";
import { fromEnumArr } from "../../services/analytics/safeMetadata.js";
import { systemClock, sleep } from "../../utils/sleep.js";
import { taskKindLabel, isParkedMcpTask, isHoldCappedMcpTask, isHeldMcpTask } from "../../tasks/taskKinds.js";
import { clippedMessage } from "../../utils/stringUtils.js";
import { getRunningTasks, createTaskFramework } from "../../utils/task/framework.js";
import { waitForTaskCompletion } from "../../tools/TaskOutputTool/TaskOutputTool.js";
import { isActiveMainAgentCommand } from "../../utils/messageQueueManager.js";
import { hasReachedBudget } from "../../cost-tracker.js";
import {
  printBackgroundWaitCeilingMs,
  isTidySlothGateOn,
} from "../../tasks/LocalShellTask/backgroundNotices.js";
import {
  hasActiveInProcessTeammates,
  hasNonLeadTeammate,
  hasWorkingInProcessTeammates,
} from "../../utils/teammate.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { formatDuration } from "../../utils/format.js";
import { maybeStartCcrRecap } from "../../services/awaySummary.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logForDebugging } from "../../utils/debug.js";
import { isProjectsRelay, isHumanOrAutoContinuation } from "../../utils/messageProvenance.js";
import { chatOriginField } from "./transcriptLeaves.js";
import { isHumanOrigin } from "../../utils/turnOrigin.js";

//@ chunk-tyg7f3ek.js:104475-104732 placement
var BACKGROUND_WAIT_PRIORITY_KINDS = [
  "queued_command",
  "task_notification",
  "owed_detached_result",
  "eval_tool",
  "schedule_wakeup",
];
var BACKGROUND_TASK_KIND_MAP = {
  local_bash: "shell",
  monitor_mcp: "monitor",
  monitor_ws: "monitor",
  local_agent: "agent",
  local_workflow: "agent",
  remote_agent: "remote_agent",
  mcp_task: "mcp_task",
};
//@ chunk-tyg7f3ek.js:104732-104835 placement
function readProcessCpuMs() {
  try {
    if (isDiskless()) return;
    let { user, system } = process.cpuUsage();
    return (user + system) / 1000;
  } catch {
    return;
  }
}
//@ chunk-tyg7f3ek.js:104835-107324 placement
/**
 * print 模式结束后等待后台任务时的心跳/CPU/空闲统计与 keepalive 帧节流。
 */
class BackgroundWaitPulse {
  pulse;
  readCpuMs;
  waitStartedAt = null;
  lastPassAt = 0;
  cpuMsAtStart;
  cpuMsAtLastPass;
  lastFrameAt = 0;
  passes = 0;
  longSleeps = 0;
  framesSent = 0;
  framesDueBackgroundOnly = 0;
  idleMs = 0;
  idleStretchMs = 0;
  longestIdleMs = 0;
  forWorkOnly = false;
  holds = new Set();
  exitCleanup;
  broken = false;
  constructor(pulse, lastFrameAt = Date.now(), readCpuMs = readProcessCpuMs) {
    this.pulse = pulse;
    this.readCpuMs = readCpuMs;
    this.lastFrameAt = lastFrameAt;
  }
  pass({ backgroundTasks, otherWork, ownedWorkPending, now }) {
    let h = ownedWorkPending.schedule_wakeup || ownedWorkPending.eval_tool;
    let any = BACKGROUND_WAIT_PRIORITY_KINDS.some((P) => otherWork[P]);
    let S = backgroundTasks.length > 0 || any;
    if (this.broken || !env.CLAUDE_CODE_REMOTE) return S && this.pulse();
    let R = S && !any && !h;
    let w = false;
    try {
      this.cpuMsAtLastPass = this.readCpuMs();
      if (this.waitStartedAt === null) {
        this.waitStartedAt = now;
        this.lastPassAt = now;
        this.cpuMsAtStart = this.cpuMsAtLastPass;
        this.exitCleanup = registerCleanup(async () => this.end());
      }
      let P = now - this.lastPassAt;
      this.lastPassAt = now;
      this.passes++;
      for (let backgroundTask of backgroundTasks)
        this.holds.add(
          backgroundTask.type === "local_bash" && backgroundTask.kind === "monitor"
            ? "monitor"
            : (BACKGROUND_TASK_KIND_MAP[backgroundTask.type] ?? "other_task"),
        );
      for (let L of BACKGROUND_WAIT_PRIORITY_KINDS) if (otherWork[L]) this.holds.add(L);
      if (S && ownedWorkPending.schedule_wakeup) this.holds.add("schedule_wakeup");
      if (S && ownedWorkPending.eval_tool) this.holds.add("eval_tool");
      if (S) this.forWorkOnly = sendSessionActivitySignal_2();
      w = R && !hasActiveWork();
      if (w) {
        this.idleMs += P;
        this.idleStretchMs += P;
        this.longestIdleMs = Math.max(this.longestIdleMs, this.idleStretchMs);
      } else this.idleStretchMs = 0;
    } catch (error) {
      this.broken = true;
      logError(error);
      logFeatureSad("ccr_keepalive_post_turn_wait", "pass_throw");
    }
    if (!S) return false;
    if (R && this.forWorkOnly && !this.broken) {
      if (now - this.lastFrameAt >= WIND_DOWN_LOG_INTERVAL_MS) {
        this.framesDueBackgroundOnly++;
        this.lastFrameAt = now;
      }
      return false;
    }
    if (!this.pulse()) return false;
    this.framesSent++;
    this.lastFrameAt = now;
    if (R) this.framesDueBackgroundOnly++;
    return true;
  }
  countLongSleep() {
    if (this.waitStartedAt !== null && !this.broken) this.longSleeps++;
  }
  end() {
    if (this.waitStartedAt === null) return;
    try {
      this.exitCleanup?.();
      if (this.holds.size > 0)
        logFeatureOk("ccr_keepalive_post_turn_wait", {
          keepalive_for_work_only: this.forWorkOnly,
          frames_sent: this.framesSent,
          frames_due_background_only: this.framesDueBackgroundOnly,
          wait_ms: this.lastPassAt - this.waitStartedAt,
          ...(this.cpuMsAtStart !== undefined &&
            this.cpuMsAtLastPass !== undefined && {
              cli_cpu_ms: Math.round(this.cpuMsAtLastPass - this.cpuMsAtStart),
            }),
          passes: this.passes,
          long_sleeps: this.longSleeps,
          idle_background_only_ms: this.idleMs,
          longest_idle_background_only_ms: this.longestIdleMs,
          held_by: fromEnumArr([...this.holds]),
        });
    } catch (error) {
      logError(error);
      logFeatureSad("ccr_keepalive_post_turn_wait", "end_throw");
    }
    this.waitStartedAt = null;
    this.exitCleanup = undefined;
    this.broken = false;
    this.passes = 0;
    this.longSleeps = 0;
    this.framesSent = 0;
    this.framesDueBackgroundOnly = 0;
    this.idleMs = 0;
    this.idleStretchMs = 0;
    this.longestIdleMs = 0;
    this.holds.clear();
  }
}
//@ chunk-tyg7f3ek.js:107324-107343 placement
var BACKGROUND_POLL_MS = 100;
var BACKGROUND_WAIT_HEARTBEAT_MS = 1000;
//@ chunk-tyg7f3ek.js:107343-107846 placement
function waitForQueueOrIdle({
  messageQueue,
  store,
  sessionState,
  spendRecorded,
  turnSignal,
  sessionSignal,
  clock = systemClock,
}) {
  return new Promise((resolve) => {
    let w = clock.monotonicNow();
    let P;
    let L = () => {
      x();
      P?.();
      for (let Z of G) Z();
      turnSignal?.removeEventListener("abort", L);
      sessionSignal.removeEventListener("abort", L);
      resolve();
    };
    let q = () => {
      P ??= clock.setTimeout(L, BACKGROUND_POLL_MS - ((clock.monotonicNow() - w) % BACKGROUND_POLL_MS));
    };
    let x = clock.setTimeout(L, BACKGROUND_WAIT_HEARTBEAT_MS);
    let G = [
      messageQueue.subscribe(q),
      store.subscribe(q),
      sessionState.stateChanged.subscribe(q),
      spendRecorded.subscribe(q),
    ];
    turnSignal?.addEventListener("abort", L, {
      once: true,
    });
    sessionSignal.addEventListener("abort", L, {
      once: true,
    });
  });
}
//@ chunk-tyg7f3ek.js:107846-107856 placement
var backgroundWaitClock = WIND_DOWN_GRACE_MS;
//@ chunk-tyg7f3ek.js:107856-107972 placement
function shouldShowBackgroundWaitStatus({ outputFormat, stderrIsTerminal, stdoutIsTerminal }) {
  return (
    stderrIsTerminal && !((outputFormat === "json" || outputFormat === "stream-json") && stdoutIsTerminal)
  );
}
//@ chunk-tyg7f3ek.js:107972-108137 placement
function describeRunningBackgroundTasks(e) {
  return e
    .map((n) => {
      let r = n.type === "local_bash" && n.kind === "monitor" ? "monitor" : taskKindLabel(n.type);
      let s = clippedMessage(n.description, 60);
      return s ? `${r} "${s}"` : r;
    })
    .join(", ");
}
//@ chunk-tyg7f3ek.js:108137-114105 placement
/**
 * print 模式最后一轮后等待后台任务（shell、monitor、agent、MCP 任务等）完成；支持等待上限 CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS、预算与 keepalive。
 */
class BackgroundTaskWaiter {
  drain;
  messageQueue;
  io;
  store;
  toolState;
  detachedToolCalls;
  pendingNotificationWaits;
  ccrRecap;
  maxBudgetUsd;
  storageV5;
  turnAbortedForShutdown;
  stopping;
  sessionSignal;
  spendRecorded;
  keepAlive;
  startStopRetirementDue;
  onIdleReported;
  hasPendingSessionWakeup;
  pendingSessionWakeupIds;
  hasLiveSessionWakeup;
  waitNoticeOnStderr;
  announcedWork = new Set();
  waitNoticeBroken = false;
  windDownDeadline = null;
  windDownSwept = false;
  bgWaitFirstIdle = null;
  bgWaitCeilingWarned = false;
  bgWaitCeilingExceeded = false;
  constructor({
    drain,
    messageQueue,
    io,
    store,
    toolState,
    detachedToolCalls,
    pendingNotificationWaits,
    ccrRecap,
    maxBudgetUsd,
    storageV5,
    turnAbortedForShutdown,
    stopping,
    sessionSignal,
    spendRecorded,
    pulseKeepAlive,
    startStopRetirementDue,
    onIdleReported,
    hasPendingSessionWakeup,
    pendingSessionWakeupIds,
    hasLiveSessionWakeup,
    waitNoticeOnStderr,
  }) {
    this.drain = drain;
    this.messageQueue = messageQueue;
    this.io = io;
    this.store = store;
    this.toolState = toolState;
    this.detachedToolCalls = detachedToolCalls;
    this.pendingNotificationWaits = pendingNotificationWaits;
    this.ccrRecap = ccrRecap;
    this.maxBudgetUsd = maxBudgetUsd;
    this.storageV5 = storageV5;
    this.turnAbortedForShutdown = turnAbortedForShutdown;
    this.stopping = stopping;
    this.sessionSignal = sessionSignal;
    this.spendRecorded = spendRecorded;
    this.keepAlive = new BackgroundWaitPulse(pulseKeepAlive);
    this.startStopRetirementDue = startStopRetirementDue;
    this.onIdleReported = onIdleReported;
    this.hasPendingSessionWakeup = hasPendingSessionWakeup;
    this.pendingSessionWakeupIds = pendingSessionWakeupIds;
    this.hasLiveSessionWakeup = hasLiveSessionWakeup;
    this.waitNoticeOnStderr = waitNoticeOnStderr;
  }
  park({ drainedThisIteration }) {
    if (drainedThisIteration) this.keepAlive.end();
    let n = false;
    let appState = this.store.getState();
    let filtered = getRunningTasks(appState).filter(
      (He) =>
        waitForTaskCompletion(He) &&
        He.type !== "in_process_teammate" &&
        !(He.type === "monitor_ws" && He.ambient) &&
        He.type !== "post_turn_memory",
    );
    stopAgentsOverBudget({
      maxBudgetUsd: this.maxBudgetUsd,
      abortedForShutdown: this.turnAbortedForShutdown(),
      turnAborted: this.drain.abortController?.signal.aborted ?? false,
      getAppState: this.store.getState,
      setAppState: this.store.setState,
      storageV5: this.storageV5,
    });
    let h = this.messageQueue.peek(isActiveMainAgentCommand) !== undefined;
    let y = h && !this.holdsEvalSettles();
    let now = Date.now();
    let owedTaskNotifications = collectOwedTaskNotifications({
      tasks: Object.values(appState.tasks ?? {}),
      waits: this.pendingNotificationWaits,
      now,
    });
    let w = this.detachedToolCalls.owesResult(now) && !hasReachedBudget(this.maxBudgetUsd);
    let hasPendingNotification = owedTaskNotifications || w;
    if (this.drain.inputClosed && !y && !drainedThisIteration) this.bgWaitFirstIdle ??= now;
    else {
      this.bgWaitFirstIdle = null;
      this.bgWaitCeilingWarned = false;
    }
    let L = printBackgroundWaitCeilingMs();
    let q = L > 0 && this.bgWaitFirstIdle !== null && now - this.bgWaitFirstIdle >= L;
    this.bgWaitCeilingExceeded = q;
    let x =
      this.drain.inputClosed &&
      (hasActiveInProcessTeammates(appState) || hasNonLeadTeammate(appState.teamContext));
    let holdForArmedMonitors =
      this.drain.inputClosed &&
      !hasReachedBudget(this.maxBudgetUsd) &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_giggly_dragonfly", true);
    let Z = this.drain.inputClosed && !hasReachedBudget(this.maxBudgetUsd) && isTidySlothGateOn();
    let re = q && !(Z && hasShellBeforeDeadline(filtered, now));
    let Ae = decideBackgroundWait({
      runningBackgroundTasks: filtered,
      inputClosed: this.drain.inputClosed,
      hasMainThreadQueued: h,
      hasActiveTeammates: x,
      hasPendingNotification,
      holdForArmedMonitors,
      holdForBackgroundShells: Z,
      ceilingExceeded: re,
      deadline: this.windDownDeadline,
      swept: this.windDownSwept,
      now,
    });
    this.windDownDeadline = Ae.deadline;
    this.windDownSwept = Ae.swept;
    if (Ae.shouldSweep && !this.drain.abortController?.signal.aborted) {
      if (re && !this.bgWaitCeilingWarned) {
        this.bgWaitCeilingWarned = true;
        process.stderr.write(`Background tasks still running ${formatDuration(L, {
          hideTrailingZeros: true,
        })} after the last turn (${describeRunningBackgroundTasks(filtered)}); stopping them. Set CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 to wait indefinitely.
`);
      }
      killBackgroundTasksForWindDown(
        filtered,
        createTaskFramework(this.store.getState, this.store.setState),
        this.store.setState,
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_print_ceiling_stop_agents", true),
      );
      n = true;
    }
    let Ue = this.drain.inputClosed && !x;
    let ce = !Ae.swept && filtered.some((He) => Ue || !isParkedMcpTask(He));
    let nt = Ae.swept ? [] : filtered.filter((He) => (Ue ? !isHoldCappedMcpTask(He) : !isHeldMcpTask(He)));
    let runningBackgroundTask = nt.length > 0;
    let Se = false;
    let evalTool = false;
    let Me = this.hasPendingSessionWakeup({
      now,
      parkedSince: this.bgWaitFirstIdle,
    });
    let Ee = h || owedTaskNotifications || (w && !re) || Se || Me;
    if (
      (ce || Ee) &&
      !this.drain.abortController?.signal.aborted &&
      !this.drain.endSessionRequested &&
      !this.stopping()
    ) {
      n = true;
      let He = this.io.sessionState.turnEndSummaryOutstanding();
      if (!y) {
        this.drain.runPhase = "waiting_for_agents";
        if (!He) this.startStopRetirementDue();
        if (
          !He &&
          shouldStayRunningForInput({
            inputClosed: this.drain.inputClosed,
            currentState: this.io.sessionState.getState(),
            hasActiveTeammates: hasWorkingInProcessTeammates(appState),
            hasRunningBgTasks: filtered.some(isAwaitedBackgroundTask),
            hasPendingNotification,
          })
        ) {
          this.io.sessionState.notifyStateChanged("idle");
          maybeStartCcrRecap(this.ccrRecap, this.io.sessionState);
          this.onIdleReported();
        }
        this.announceLongWait(now, filtered, Me);
        if (
          this.keepAlive.pass({
            backgroundTasks: nt,
            otherWork: {
              queued_command: h,
              task_notification: owedTaskNotifications,
              owed_detached_result: w && !re,
              eval_tool: Se,
              schedule_wakeup: Me,
            },
            ownedWorkPending: {
              schedule_wakeup: Me || this.hasLiveSessionWakeup(now),
              eval_tool: evalTool,
            },
            now,
          })
        )
          logForDiagnosticsNoPII("debug", "session_keepalive_background_wait", {
            running_background_task: runningBackgroundTask,
            queued_command: h,
            pending_task_notification: owedTaskNotifications,
            owed_detached_result: w,
            outstanding_evals: Se,
            pending_session_wakeup: Me,
          });
        if (!(
          !this.drain.inputClosed &&
          !this.sessionSignal.aborted &&
          !Ee &&
          !He &&
          this.maxBudgetUsd === undefined &&
          filtered.every((We) => {
            switch (We.type) {
              case "local_bash":
              case "local_agent":
              case "local_workflow":
                return true;
              case "remote_agent":
              case "in_process_teammate":
              case "monitor_mcp":
              case "monitor_ws":
              case "mcp_task":
              case "dream":
              case "auto_mode_scan":
              case "local_memory_import":
              case "post_turn_memory":
                return false;
              default:
                return false;
            }
          }) &&
          !hasActiveInProcessTeammates(appState) &&
          this.store.getState() === appState &&
          this.messageQueue.peek(isActiveMainAgentCommand) === undefined &&
          !env.CLAUDE_CODE_DISABLE_QUIET_BACKGROUND_WAIT
        ))
          return sleep(BACKGROUND_POLL_MS);
        this.keepAlive.countLongSleep();
        return waitForQueueOrIdle({
          messageQueue: this.messageQueue,
          store: this.store,
          sessionState: this.io.sessionState,
          spendRecorded: this.spendRecorded,
          turnSignal: this.drain.abortController?.signal,
          sessionSignal: this.sessionSignal,
        });
      }
    }
    this.keepAlive.end();
    return n ? "again" : "done";
  }
  announceLongWait(e, n, r) {
    if (
      this.waitNoticeBroken ||
      this.bgWaitFirstIdle === null ||
      e - this.bgWaitFirstIdle < backgroundWaitClock
    )
      return;
    try {
      let combined = n
        .map((S) => S.id)
        .concat(r ? this.pendingSessionWakeupIds().map((S) => `wakeup:${S}`) : []);
      if (combined.every((S) => this.announcedWork.has(S))) return;
      for (let S of combined) this.announcedWork.add(S);
      let joined = [describeRunningBackgroundTasks(n), r ? "scheduled wakeup" : ""]
        .filter(Boolean)
        .join(", ");
      let y = `Waiting for background work to finish${joined ? ` (${joined})` : ""}. Press Ctrl+C to exit now.`;
      if (this.waitNoticeOnStderr)
        process.stderr.write(`
${y}
`);
      else logForDebugging(y);
      logFeatureOk("print_wait_notice", {
        on_stderr: this.waitNoticeOnStderr,
      });
    } catch (error) {
      this.waitNoticeBroken = true;
      logError(error);
      logFeatureBad("print_wait_notice", "build_failed");
    }
  }
  holdsEvalSettles() {
    return false;
  }
}
//@ chunk-tyg7f3ek.js:114105-114268 placement
function isPeerHandbackPrompt(e) {
  return (
    isActiveMainAgentCommand(e) &&
    e.mode === "prompt" &&
    e.shouldQuery !== false &&
    e.isMeta === true &&
    e.origin?.kind === "peer" &&
    e.origin.senderTaskId !== undefined &&
    e.origin.handback === true
  );
}
//@ chunk-tyg7f3ek.js:114268-114724 placement
function countQueuedPromptKinds(queued) {
  let n = {
    handbacks: 0,
    other_subagent_prompts: 0,
    outside_peers: 0,
    person_prompts: 0,
    projects_relays: 0,
  };
  for (let r of queued) {
    if (isPeerHandbackPrompt(r)) {
      n.handbacks++;
      continue;
    }
    if (!isActiveMainAgentCommand(r) || r.mode !== "prompt" || r.shouldQuery === false) continue;
    if (isProjectsRelay(r.origin)) {
      n.projects_relays++;
      continue;
    }
    if (r.isMeta !== true) {
      if (isHumanOrAutoContinuation(r.origin)) n.person_prompts++;
    } else if (r.origin?.kind !== "peer") continue;
    else if (r.origin.senderTaskId === undefined) n.outside_peers++;
    else n.other_subagent_prompts++;
  }
  return n;
}
//@ chunk-tyg7f3ek.js:114724-115000 placement
function logQueuedInterruptDecision({ queued, turnUnderWay, lateBind, cancelQueued, sendNow }, y) {
  try {
    let S = {
      ...countQueuedPromptKinds(queued),
      turn_under_way: turnUnderWay,
      late_bind_interrupt: lateBind,
      cancel_queued: cancelQueued,
      send_now: sendNow,
      ...chatOriginField(),
    };
    logForDiagnosticsNoPII("info", "cli_queued_at_interrupt", S);
    y?.(S);
  } catch (error) {
    logError(error);
    logForDiagnosticsNoPII("error", "cli_queued_at_interrupt_failed");
  }
}
//@ chunk-tyg7f3ek.js:115000-115061 placement
var RESUME_RESCUE_YIELD_FLAG = "tengu_cosmic_crayon";
var TENGU_COZY_PINWHEEL = "tengu_cozy_pinwheel";
var QUEUED_INTERRUPT_BUDGET_MS = 250;
//@ chunk-tyg7f3ek.js:115061-115396 placement
class FetchingUserFilesCounter {
  count = 0;
  none;
  begin(e) {
    if (
      e.fileCount === 0 ||
      e.peerFrom !== undefined ||
      !isHumanOrigin(e.origin) ||
      e.shouldQuery === false ||
      e.reRun
    )
      return;
    this.count++;
    return {
      [Symbol.dispose]: () => {
        this.count--;
        if (this.count === 0) {
          this.none?.resolve();
          this.none = undefined;
        }
      },
    };
  }
  untilNone() {
    if (this.count === 0) return;
    this.none ??= Promise.withResolvers();
    return this.none.promise;
  }
}
export {
  BackgroundTaskWaiter,
  shouldShowBackgroundWaitStatus,
  logQueuedInterruptDecision,
  QUEUED_INTERRUPT_BUDGET_MS,
  RESUME_RESCUE_YIELD_FLAG,
  TENGU_COZY_PINWHEEL,
  isPeerHandbackPrompt,
  FetchingUserFilesCounter,
};
