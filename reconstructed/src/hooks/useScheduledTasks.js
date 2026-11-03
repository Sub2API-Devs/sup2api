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
import { init_react_production, Oo, R, P } from "../../vendor/react/cjs/react.production.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../tools/ScheduleWakeupTool/prompt.js";
import { isToolResultMessage, createUserMessage, createScheduledTaskFireMessage } from "../utils/messages.js";
import { plural } from "../utils/stringUtils.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { useCommandQueueOrDefault } from "../context/QueuedMessageContext.js";
import { useSession } from "../context/session.js";
import { useAppStoreDirect, useSetAppState } from "../state/AppState.js";
import { useSetVoiceState } from "../context/voice.js";
import { isKairosCronEnabled } from "../tools/ScheduleCronTool/prompt.js";
import { getRemoteCaps } from "../remote/remoteMode.js";
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
import { wakeupSourceForKind } from "../utils/promptSource.js";
import { getCronJitterConfig } from "../utils/cronJitterConfig.js";
import { getSessionProject } from "../bootstrap/sessionSlices.js";
import { SerialWriteQueue } from "../utils/errorLogSink.js";
import { loopKeepaliveSetting, hasLoopTask, scheduleKeepaliveWakeup } from "../utils/loop/loopWakeups.js";
import { effectiveSessionTimeZone } from "../utils/sessionTimeZone.js";

//@ chunk-4m1yk02k.js:12639-12643 sole-consumer
init_react_production();
//@ chunk-4m1yk02k.js:12679-12774 sole-consumer
function isLoopCronFire(o) {
  return o.type === "system" && o.subtype === "scheduled_task_fire" && o.cronKind === "loop";
}
//@ chunk-4m1yk02k.js:12774-12905 sole-consumer
function isBlockingSystemMessage(o) {
  if (o.type !== "system") return false;
  if (o.subtype === "scheduled_task_fire" || o.subtype === "compact_boundary") return true;
  return false;
}
//@ chunk-4m1yk02k.js:12905-14200 sole-consumer
/**
 * 判断最近一次 /loop 唤醒是否可以折叠为 no-op：唤醒后只有 schedule_wakeup(noop) 且无用户输入、拒绝、排队命令、拆开的工具对等，否则给出否决原因。
 */
function analyzeLoopNoOpFold(messages) {
  let fireIndex = messages.findLastIndex(isLoopCronFire);
  let fireMessage = messages[fireIndex];
  if (fireMessage === undefined || !isLoopCronFire(fireMessage))
    return {
      kind: "none",
    };
  for (let i = fireIndex - 1; i >= 0; i--) {
    let e = messages[i];
    if (isLoopCronFire(e)) break;
    if (isBlockingSystemMessage(e))
      return {
        kind: "veto",
        fireIdx: fireIndex,
        reason: "blocking_system_before_anchor",
      };
  }
  let reportedNoop;
  let toolUseIds = new Set();
  for (let idx = fireIndex + 1; idx < messages.length; idx++) {
    let e = messages[idx];
    if (isBlockingSystemMessage(e))
      return {
        kind: "veto",
        fireIdx: fireIndex,
        reason: "blocking_system_in_span",
      };
    if (e.type === "assistant")
      for (let i of e.message.content) {
        if (i.type !== "tool_use") continue;
        toolUseIds.add(i.id);
        if (i.name === SCHEDULE_WAKEUP_TOOL_NAME) reportedNoop = i.input?.noop === true;
      }
    else if (e.type === "user") {
      if (e.toolDenialKind !== undefined)
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
            return {
              kind: "veto",
              fireIdx: fireIndex,
              reason: "split_tool_pair",
            };
      }
      if (
        !isToolResultMessage(e) &&
        (e.verifiedSlackHumanTurn === true ||
          e.origin !== undefined ||
          (e.queuePriority !== "later" && e.isMeta !== true))
      )
        return {
          kind: "veto",
          fireIdx: fireIndex,
          reason: "foreign_user_input",
        };
    } else if (e.type === "attachment" && e.attachment.type === "queued_command")
      return {
        kind: "veto",
        fireIdx: fireIndex,
        reason: "queued_command",
      };
  }
  if (reportedNoop !== true)
    return {
      kind: "veto",
      fireIdx: fireIndex,
      reason: "model_reported_work",
    };
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
      isMeta: true,
    }),
    turnCompanion: true,
  };
}
//@ chunk-4m1yk02k.js:14347-14919 sole-consumer
/**
 * 追加 /loop 唤醒消息：可折叠时合并为 "N no-op ticks since …" 并记录折叠的 uuid 与连续计数，否则追加普通唤醒消息。
 */
function appendLoopWakeup(messages, isLoop, task, uuid) {
  let content = `Claude resuming /loop wakeup (${formatCronFireTime(new Date())})`;
  let fold = isLoop
    ? analyzeLoopNoOpFold(messages)
    : {
        kind: "none",
      };
  if (fold.kind === "veto") logFeatureSad("loop_noop_fold", fold.reason);
  if (fold.kind !== "fold")
    return [
      ...messages,
      createScheduledTaskFireMessage(content, {
        task,
        uuid,
        ...(isLoop && {
          cronKind: "loop",
        }),
      }),
    ];
  let i = fold.priorStreak + 1;
  let d = formatCronFireTime(new Date(fold.since));
  let mapped = messages.slice(fold.fireIdx).map((message) => message.uuid);
  logFeatureOk("loop_noop_fold", {
    streak: i,
    span_len: mapped.length,
    tool_uses: fold.toolUseCount,
    span_duration_s: getSpanDurationSeconds(messages, fold.fireIdx),
  });
  return [
    ...messages,
    createScheduledTaskFireMessage(`${content} \xB7 ${i} no-op ${plural(i, "tick")} since ${d}`, {
      task,
      uuid,
      cronKind: "loop",
      noOpStreak: i,
      streakStartedAt: fold.since,
      foldedUuids: mapped,
    }),
    createLoopHealthyNote(i),
  ];
}
//@ chunk-4m1yk02k.js:14919-15052 sole-consumer
function getSpanDurationSeconds(messages, fireIdx) {
  let timestamp = messages[fireIdx]?.timestamp;
  let timestamp_2 = messages.at(-1)?.timestamp;
  if (!timestamp || !timestamp_2) return 0;
  return Math.round((Date.parse(timestamp_2) - Date.parse(timestamp)) / 1000);
}
//@ chunk-4m1yk02k.js:15052-15096 affinity
var scheduledTasksModule = require("./chunk-w6rm7nhv.js");
var SCHEDULED_TASKS_PLACEHOLDER = null;
//@ chunk-4m1yk02k.js:15096-17139 fingerprint = useScheduledTasks (0.512)
function useScheduledTasks({ isLoading, assistantMode, transcript, storageV5, disabled = false }) {
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let isLoadingRef = Oo(() => isLoading);
  let schedulerRef = R(null);
  let store = useSession();
  let setAppState = useAppStoreDirect();
  let setAppState_2 = useSetAppState();
  let taskRegistry = useSetVoiceState();
  P(() => {
    if (disabled || !isKairosCronEnabled() || getRemoteCaps() !== null) return;
    let _ = (prompt, wakeupSource, u) => ({
      value: prompt,
      mode: "prompt",
      agentId: mainAgentId(),
      priority: "later",
      isMeta: true,
      skipSlashCommands: true,
      modelScheduledOrigin: true,
      skipAttachments: true,
      wakeupSource,
      scheduledTaskId: u?.taskId,
      scheduledFireId: u?.fireId,
      ...(u?.plugin !== undefined && {
        scheduledByPlugin: u.plugin,
      }),
      workload: WORKLOAD_CRON,
    });
    let resolved = Promise.resolve();
    let b = (n, wakeupSource, u, l) => {
      if (isStorageV5Enabled() && storageV5 !== undefined) {
        resolved = resolved.then(async () => {
          try {
            commandQueueOrDefault.enqueuePendingNotification(
              _(
                await scheduledTasksModule.resolveLoopDefaultFireAsync(
                  store.autonomousLoopPreamble,
                  n,
                  storageV5,
                ),
                wakeupSource,
                u,
              ),
            );
            l?.();
          } catch (error) {
            logForDebugging(`[ScheduledTasks] fire enqueue (v5 arm) failed; fire skipped: ${error}`);
          }
        });
        return;
      }
      commandQueueOrDefault.enqueuePendingNotification(
        _(scheduledTasksModule.resolveLoopDefaultFire(store.autonomousLoopPreamble, n), wakeupSource, u),
      );
      l?.();
    };
    let enqueueForLead = (prompt) => {
      if (scheduledTasksModule.isLoopDefaultSentinel(prompt.prompt))
        return {
          ...prompt,
          prompt: scheduledTasksModule.isLoopFileSentinel(prompt.prompt) ? "/loop (loop.md)" : "/loop",
        };
      return prompt;
    };
    let C = undefined;
    let scheduler = createCronScheduler({
      onFire: (task) => b(task, "schedule_wakeup"),
      onMissed: wrapScheduledTaskBatchRunner((missed, plugin, u) =>
        b(
          buildMissedTaskNotification(missed),
          "schedule_wakeup",
          {
            plugin,
          },
          u,
        ),
      ),
      onFireTask: wrapScheduledTaskRunner((prompt, m) => {
        if (prompt.agentId) {
          let teammate = findTeammateTaskByAgentId(prompt.agentId, setAppState.getState().tasks);
          if (teammate && !isTerminalTaskStatus(teammate.status)) {
            injectUserMessageToTeammate(teammate.id, prompt.prompt, taskRegistry, {
              kind: "task-notification",
            });
            m();
            return;
          }
          logForDebugging(
            `[ScheduledTasks] teammate ${prompt.agentId} gone, removing orphaned cron ${prompt.id}`,
          );
          removeCronTasks([prompt.id]);
          return;
        }
        let uuid = randomUUID();
        if (prompt.kind === "loop") {
          let isLoop = !isLoadingRef();
          transcript.replace((prev) => appendLoopWakeup(prev, isLoop, enqueueForLead(prompt), uuid));
          setLoopTickInFlightPrompt(prompt.prompt, prompt.plugin);
          recordLoopWakeFire();
        } else {
          let scheduledTaskFireMessage = createScheduledTaskFireMessage(
            `Running scheduled task (${formatCronFireTime(new Date())})`,
            {
              task: enqueueForLead(prompt),
              uuid,
            },
          );
          transcript.apply({
            type: "append",
            messages: [scheduledTaskFireMessage],
          });
        }
        b(
          prompt.prompt,
          wakeupSourceForKind(prompt),
          {
            taskId: prompt.id,
            fireId: uuid,
            plugin: prompt.plugin,
          },
          m,
        );
      }),
      isLoading: () => isLoadingRef(),
      assistantMode,
      getJitterConfig: getCronJitterConfig,
      isKilled: () => !isKairosCronEnabled(),
      getExtraTasks:
        SCHEDULED_TASKS_PLACEHOLDER && C && getProjectConfigRoot() === null
          ? () =>
              SCHEDULED_TASKS_PLACEHOLDER.getRoutineCronTasks(
                getSessionProject(store).projectRoot,
                C,
                storageV5,
              )
          : undefined,
    });
    scheduler.start();
    schedulerRef.current = scheduler;
    return () => {
      schedulerRef.current = null;
      scheduler.stop();
    };
  }, [assistantMode, transcript, setAppState.getState, taskRegistry, store, disabled]);
  P(() => {
    let _ = new SerialWriteQueue();
    return () => _.dispose();
  }, []);
  P(() => {
    if (isLoading) return;
    let loopTickInFlightPrompt = getLoopTickInFlightPrompt();
    if (loopTickInFlightPrompt !== null) {
      let rearmedFor = getLoopTickInFlightPlugin();
      setLoopTickInFlightPrompt(null);
      if (loopKeepaliveSetting() && !hasLoopTask())
        scheduleKeepaliveWakeup(loopTickInFlightPrompt, rearmedFor);
      if (!hasLoopTask()) resetLoopWakeFires();
    }
    schedulerRef.current?.checkNow();
  }, [isLoading]);
}
//@ chunk-k8enqm3s.js:228-481 fingerprint = formatCronFireTime (0.874)
function formatCronFireTime(e, r) {
  return e
    .toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      ...(r?.includeYear && {
        year: "numeric",
      }),
      hour: "numeric",
      minute: "2-digit",
      timeZone: effectiveSessionTimeZone(),
    })
    .replace(/,? at |, (?=\d{1,2}:)/, " ")
    .replace(/[ \u202f]([AP]M)/i, (o, ampm) => ampm.toLowerCase());
}
export { formatCronFireTime };
