/**
 * hooks/useScheduledTasks.ts
 *
 * 定时任务/循环（/loop、schedule_wakeup）触发：到点把提示入队，格式化 cron 触发时间。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useScheduledTasks.ts
 * pieces: chunk-4m1yk02k.js (9), chunk-k8enqm3s.js (1)
 * attribution: sole-consumer 7, affinity 1, fingerprint 2
 */
import { randomUUID } from "crypto";
import { j, Oo, R, P } from "../../vendor/react/cjs/react.production.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../tools/ScheduleWakeupTool/prompt.js";
import { isToolResultMessage, createUserMessage, createScheduledTaskFireMessage } from "../utils/messages.js";
import { plural } from "../utils/stringUtils.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { Nu } from "../context/QueuedMessageContext.js";
import { useSession } from "../context/session.js";
import { Cr, useSetAppState } from "../state/AppState.js";
import { useSetVoiceState } from "../context/voice.js";
import { isKairosCronEnabled } from "../tools/ScheduleCronTool/prompt.js";
import { Jn } from "../remote/remoteMode.js";
import {
  mainAgentId,
  setLoopTickInFlightPrompt,
  recordLoopWakeFire,
  getProjectConfigRoot,
  getLoopTickInFlightPrompt,
  getLoopTickInFlightPlugin,
  resetLoopWakeFires,
} from "../bootstrap/state.js";
import { WORKLOAD_CRON } from "../utils/workloadContext.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { logForDebugging } from "../utils/debug.js";
import { createCronScheduler, buildMissedTaskNotification } from "../utils/cronScheduler.js";
import {
  wrapScheduledTaskBatchRunner,
  wrapScheduledTaskRunner,
} from "../utils/plugins/functionHooks/pluginTimers.js";
import {
  findTeammateTaskByAgentId,
  injectUserMessageToTeammate,
} from "../tasks/InProcessTeammateTask/InProcessTeammateTask.js";
import { isTerminalTaskStatus } from "../tasks/taskStatus.js";
import { removeCronTasks } from "../utils/cronTasks.js";
import { a9n } from "../utils/promptSource.js";
import { getCronJitterConfig } from "../utils/cronJitterConfig.js";
import { xo } from "../bootstrap/sessionSlices.js";
import { SerialWriteQueue } from "../utils/errorLogSink.js";
import { loopKeepaliveSetting, hasLoopTask, scheduleKeepaliveWakeup } from "../utils/loop/loopWakeups.js";
import { llr } from "../utils/sessionTimeZone.js";

//@ chunk-4m1yk02k.js:12639-12643 sole-consumer
j();
//@ chunk-4m1yk02k.js:12679-12774 sole-consumer
function I(o) {
  return o.type === "system" && o.subtype === "scheduled_task_fire" && o.cronKind === "loop";
}
//@ chunk-4m1yk02k.js:12774-12905 sole-consumer
function isBlockingSystemMessage(o) {
  if (o.type !== "system") return !1;
  if (o.subtype === "scheduled_task_fire" || o.subtype === "compact_boundary") return !0;
  return !1;
}
/**
 * 判断最近一次 /loop 唤醒是否可以折叠为 no-op：唤醒后只有 schedule_wakeup(noop) 且无用户输入、拒绝、排队命令、拆开的工具对等，否则给出否决原因。
 */
//@ chunk-4m1yk02k.js:12905-14200 sole-consumer
function analyzeLoopNoOpFold(messages) {
  let fireIndex = messages.findLastIndex(I),
    fireMessage = messages[fireIndex];
  if (fireMessage === void 0 || !I(fireMessage)) return { kind: "none" };
  for (let a = fireIndex - 1; a >= 0; a--) {
    let e = messages[a];
    if (I(e)) break;
    if (isBlockingSystemMessage(e))
      return { kind: "veto", fireIdx: fireIndex, reason: "blocking_system_before_anchor" };
  }
  let reportedNoop,
    toolUseIds = new Set();
  for (let a = fireIndex + 1; a < messages.length; a++) {
    let e = messages[a];
    if (isBlockingSystemMessage(e))
      return { kind: "veto", fireIdx: fireIndex, reason: "blocking_system_in_span" };
    if (e.type === "assistant")
      for (let i of e.message.content) {
        if (i.type !== "tool_use") continue;
        if ((toolUseIds.add(i.id), i.name === SCHEDULE_WAKEUP_TOOL_NAME)) reportedNoop = i.input?.noop === !0;
      }
    else if (e.type === "user") {
      if (e.toolDenialKind !== void 0)
        return {
          kind: "veto",
          fireIdx: fireIndex,
          reason:
            e.toolDenialKind === "interrupted" || e.toolDenialKind === "cancelled"
              ? "tool_abort"
              : "tool_denial",
        };
      let content = e.message.content;
      if (typeof content !== "string") {
        for (let d of content)
          if (d.type === "tool_result" && !toolUseIds.has(d.tool_use_id))
            return { kind: "veto", fireIdx: fireIndex, reason: "split_tool_pair" };
      }
      if (
        !isToolResultMessage(e) &&
        (e.verifiedSlackHumanTurn === !0 ||
          e.origin !== void 0 ||
          (e.queuePriority !== "later" && e.isMeta !== !0))
      )
        return { kind: "veto", fireIdx: fireIndex, reason: "foreign_user_input" };
    } else if (e.type === "attachment" && e.attachment.type === "queued_command")
      return { kind: "veto", fireIdx: fireIndex, reason: "queued_command" };
  }
  if (reportedNoop !== !0) return { kind: "veto", fireIdx: fireIndex, reason: "model_reported_work" };
  return {
    kind: "fold",
    fireIdx: fireIndex,
    priorStreak: fireMessage.noOpStreak ?? 0,
    since: fireMessage.streakStartedAt ?? fireMessage.timestamp,
    toolUseCount: toolUseIds.size,
  };
}
//@ chunk-4m1yk02k.js:14200-14347 sole-consumer
function createLoopHealthyNote(o) {
  return {
    ...createUserMessage({
      content: `[${o} prior /loop ${plural(o, "wakeup")} found nothing actionable; loop is healthy.]`,
      isMeta: !0,
    }),
    turnCompanion: !0,
  };
}
/**
 * 追加 /loop 唤醒消息：可折叠时合并为 "N no-op ticks since …" 并记录折叠的 uuid 与连续计数，否则追加普通唤醒消息。
 */
//@ chunk-4m1yk02k.js:14347-14919 sole-consumer
function appendLoopWakeup(messages, isLoop, task, uuid) {
  let a = `Claude resuming /loop wakeup (${formatCronFireTime(new Date())})`,
    fold = isLoop ? analyzeLoopNoOpFold(messages) : { kind: "none" };
  if (fold.kind === "veto") logFeatureSad("loop_noop_fold", fold.reason);
  if (fold.kind !== "fold")
    return [
      ...messages,
      createScheduledTaskFireMessage(a, { task: task, uuid: uuid, ...(isLoop && { cronKind: "loop" }) }),
    ];
  let i = fold.priorStreak + 1,
    d = formatCronFireTime(new Date(fold.since)),
    mapped = messages.slice(fold.fireIdx).map((F) => F.uuid);
  return (
    logFeatureOk("loop_noop_fold", {
      streak: i,
      span_len: mapped.length,
      tool_uses: fold.toolUseCount,
      span_duration_s: getSpanDurationSeconds(messages, fold.fireIdx),
    }),
    [
      ...messages,
      createScheduledTaskFireMessage(`${a} \xB7 ${i} no-op ${plural(i, "tick")} since ${d}`, {
        task: task,
        uuid: uuid,
        cronKind: "loop",
        noOpStreak: i,
        streakStartedAt: fold.since,
        foldedUuids: mapped,
      }),
      createLoopHealthyNote(i),
    ]
  );
}
//@ chunk-4m1yk02k.js:14919-15052 sole-consumer
function getSpanDurationSeconds(o, r) {
  let s = o[r]?.timestamp,
    p = o.at(-1)?.timestamp;
  if (!s || !p) return 0;
  return Math.round((Date.parse(p) - Date.parse(s)) / 1000);
}
//@ chunk-4m1yk02k.js:15052-15096 affinity
var c = require("./chunk-w6rm7nhv.js"),
  U = null;
//@ chunk-4m1yk02k.js:15096-17139 fingerprint = useScheduledTasks (0.512)
function useScheduledTasks({
  isLoading: isLoading,
  assistantMode: assistantMode,
  transcript: transcript,
  storageV5: storageV5,
  disabled: disabled = !1,
}) {
  let a = Nu(),
    isLoadingRef = Oo(() => isLoading),
    i = R(null),
    store = useSession(),
    setAppState = Cr(),
    F = useSetAppState(),
    L = useSetVoiceState();
  (P(() => {
    if (disabled || !isKairosCronEnabled() || Jn() !== null) return;
    let _ = (n, m, u) => ({
        value: n,
        mode: "prompt",
        agentId: mainAgentId(),
        priority: "later",
        isMeta: !0,
        skipSlashCommands: !0,
        modelScheduledOrigin: !0,
        skipAttachments: !0,
        wakeupSource: m,
        scheduledTaskId: u?.taskId,
        scheduledFireId: u?.fireId,
        ...(u?.plugin !== void 0 && { scheduledByPlugin: u.plugin }),
        workload: WORKLOAD_CRON,
      }),
      resolved = Promise.resolve(),
      b = (n, m, u, l) => {
        if (isStorageV5Enabled() && storageV5 !== void 0) {
          resolved = resolved.then(async () => {
            try {
              (a.enqueuePendingNotification(
                _(await c.resolveLoopDefaultFireAsync(store.autonomousLoopPreamble, n, storageV5), m, u),
              ),
                l?.());
            } catch (error) {
              logForDebugging(`[ScheduledTasks] fire enqueue (v5 arm) failed; fire skipped: ${error}`);
            }
          });
          return;
        }
        (a.enqueuePendingNotification(_(c.resolveLoopDefaultFire(store.autonomousLoopPreamble, n), m, u)),
          l?.());
      },
      enqueueForLead = (prompt) => {
        if (c.isLoopDefaultSentinel(prompt.prompt))
          return { ...prompt, prompt: c.isLoopFileSentinel(prompt.prompt) ? "/loop (loop.md)" : "/loop" };
        return prompt;
      },
      C = void 0,
      scheduler = createCronScheduler({
        onFire: (task) => b(task, "schedule_wakeup"),
        onMissed: wrapScheduledTaskBatchRunner((n, m, u) =>
          b(buildMissedTaskNotification(n), "schedule_wakeup", { plugin: m }, u),
        ),
        onFireTask: wrapScheduledTaskRunner((n, m) => {
          if (n.agentId) {
            let teammate = findTeammateTaskByAgentId(n.agentId, setAppState.getState().tasks);
            if (teammate && !isTerminalTaskStatus(teammate.status)) {
              (injectUserMessageToTeammate(teammate.id, n.prompt, L, { kind: "task-notification" }), m());
              return;
            }
            (logForDebugging(`[ScheduledTasks] teammate ${n.agentId} gone, removing orphaned cron ${n.id}`),
              removeCronTasks([n.id]));
            return;
          }
          let u = randomUUID();
          if (n.kind === "loop") {
            let l = !isLoadingRef();
            (transcript.replace((prev) => appendLoopWakeup(prev, l, enqueueForLead(n), u)),
              setLoopTickInFlightPrompt(n.prompt, n.plugin),
              recordLoopWakeFire());
          } else {
            let l = createScheduledTaskFireMessage(
              `Running scheduled task (${formatCronFireTime(new Date())})`,
              { task: enqueueForLead(n), uuid: u },
            );
            transcript.apply({ type: "append", messages: [l] });
          }
          b(n.prompt, a9n(n), { taskId: n.id, fireId: u, plugin: n.plugin }, m);
        }),
        isLoading: () => isLoadingRef(),
        assistantMode: assistantMode,
        getJitterConfig: getCronJitterConfig,
        isKilled: () => !isKairosCronEnabled(),
        getExtraTasks:
          U && C && getProjectConfigRoot() === null
            ? () => U.getRoutineCronTasks(xo(store).projectRoot, C, storageV5)
            : void 0,
      });
    return (
      scheduler.start(),
      (i.current = scheduler),
      () => {
        ((i.current = null), scheduler.stop());
      }
    );
  }, [assistantMode, transcript, setAppState.getState, L, store, disabled]),
    P(() => {
      let _ = new SerialWriteQueue();
      return () => _.dispose();
    }, []),
    P(() => {
      if (isLoading) return;
      let _ = getLoopTickInFlightPrompt();
      if (_ !== null) {
        let S = getLoopTickInFlightPlugin();
        if ((setLoopTickInFlightPrompt(null), loopKeepaliveSetting() && !hasLoopTask()))
          scheduleKeepaliveWakeup(_, S);
        if (!hasLoopTask()) resetLoopWakeFires();
      }
      i.current?.checkNow();
    }, [isLoading]));
}
//@ chunk-k8enqm3s.js:228-481 fingerprint = formatCronFireTime (0.874)
function formatCronFireTime(e, r) {
  return e
    .toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      ...(r?.includeYear && { year: "numeric" }),
      hour: "numeric",
      minute: "2-digit",
      timeZone: llr(),
    })
    .replace(/,? at |, (?=\d{1,2}:)/, " ")
    .replace(/[ \u202f]([AP]M)/i, (o, ampm) => ampm.toLowerCase());
}

export { formatCronFireTime };
