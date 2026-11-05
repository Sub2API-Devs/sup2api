/**
 * hooks/useScheduledTasks.ts
 *
 * 定时任务/循环（/loop、schedule_wakeup）触发：到点把提示入队，格式化 cron 触发时间。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useScheduledTasks.ts
 * pieces: chunk-1wakzgxk.js (1), chunk-zdhbhsv3.js (9)
 * attribution: fingerprint 2, sole-consumer 7, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { effectiveSessionTimeZone } from "../utils/sessionTimeZone.js";
import {
  init_react_production,
  useEffectEvent,
  useRef,
  useEffect,
} from "../../vendor/react/cjs/react.production.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../tools/ScheduleWakeupTool/prompt.js";
import { isToolResultMessage, createUserMessage, createScheduledTaskFireMessage } from "../utils/messages.js";
import { plural } from "../utils/stringUtils.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { useCommandQueueOrDefault } from "../context/QueuedMessageContext.js";
import { useSession } from "../context/session.js";
import { useAppStoreDirect } from "../state/AppState.js";
import { useTaskFramework } from "../context/voice.js";
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

//@ chunk-1wakzgxk.js:228-481 fingerprint (2.1.88 match: formatCronFireTime, 0.874)
function formatCronFireTime(date, options) {
  return date
    .toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      ...(options?.includeYear && {
        year: "numeric",
      }),
      hour: "numeric",
      minute: "2-digit",
      timeZone: effectiveSessionTimeZone(),
    })
    .replace(/,? at |, (?=\d{1,2}:)/, " ")
    .replace(/[ \u202f]([AP]M)/i, (ampm, ampm_2) => ampm_2.toLowerCase());
}
//@ chunk-zdhbhsv3.js:13784-13788 sole-consumer
init_react_production();
//@ chunk-zdhbhsv3.js:13824-13919 sole-consumer
function isLoopCronFire(message) {
  return (
    message.type === "system" && message.subtype === "scheduled_task_fire" && message.cronKind === "loop"
  );
}
//@ chunk-zdhbhsv3.js:13919-14050 sole-consumer
function isBlockingSystemMessage(message) {
  if (message.type !== "system") return false;
  if (message.subtype === "scheduled_task_fire" || message.subtype === "compact_boundary") return true;
  return false;
}
//@ chunk-zdhbhsv3.js:14050-15345 sole-consumer
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
    let message = messages[i];
    if (isLoopCronFire(message)) break;
    if (isBlockingSystemMessage(message))
      return {
        kind: "veto",
        fireIdx: fireIndex,
        reason: "blocking_system_before_anchor",
      };
  }
  let reportedNoop;
  let toolUseIds = new Set();
  for (let idx = fireIndex + 1; idx < messages.length; idx++) {
    let message = messages[idx];
    if (isBlockingSystemMessage(message))
      return {
        kind: "veto",
        fireIdx: fireIndex,
        reason: "blocking_system_in_span",
      };
    if (message.type === "assistant")
      for (let block of message.message.content) {
        if (block.type !== "tool_use") continue;
        toolUseIds.add(block.id);
        if (block.name === SCHEDULE_WAKEUP_TOOL_NAME) reportedNoop = block.input?.noop === true;
      }
    else if (message.type === "user") {
      if (message.toolDenialKind !== undefined)
        return {
          kind: "veto",
          fireIdx: fireIndex,
          reason:
            message.toolDenialKind === "interrupted" || message.toolDenialKind === "cancelled"
              ? "tool_abort"
              : "tool_denial",
        };
      let content = message.message.content;
      if (typeof content !== "string") {
        for (let block of content)
          if (block.type === "tool_result" && !toolUseIds.has(block.tool_use_id))
            return {
              kind: "veto",
              fireIdx: fireIndex,
              reason: "split_tool_pair",
            };
      }
      if (
        !isToolResultMessage(message) &&
        (message.verifiedSlackHumanTurn === true ||
          message.origin !== undefined ||
          (message.queuePriority !== "later" && message.isMeta !== true))
      )
        return {
          kind: "veto",
          fireIdx: fireIndex,
          reason: "foreign_user_input",
        };
    } else if (message.type === "attachment" && message.attachment.type === "queued_command")
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
//@ chunk-zdhbhsv3.js:15345-15492 sole-consumer
function createLoopHealthyNote(wakeupCount) {
  return {
    ...createUserMessage({
      content: `[${wakeupCount} prior /loop ${plural(wakeupCount, "wakeup")} found nothing actionable; loop is healthy.]`,
      isMeta: true,
    }),
    turnCompanion: true,
  };
}
//@ chunk-zdhbhsv3.js:15492-16064 sole-consumer
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
  let streak = fold.priorStreak + 1;
  let sinceText = formatCronFireTime(new Date(fold.since));
  let mapped = messages.slice(fold.fireIdx).map((message) => message.uuid);
  logFeatureOk("loop_noop_fold", {
    streak,
    span_len: mapped.length,
    tool_uses: fold.toolUseCount,
    span_duration_s: getSpanDurationSeconds(messages, fold.fireIdx),
  });
  return [
    ...messages,
    createScheduledTaskFireMessage(
      `${content} \xB7 ${streak} no-op ${plural(streak, "tick")} since ${sinceText}`,
      {
        task,
        uuid,
        cronKind: "loop",
        noOpStreak: streak,
        streakStartedAt: fold.since,
        foldedUuids: mapped,
      },
    ),
    createLoopHealthyNote(streak),
  ];
}
//@ chunk-zdhbhsv3.js:16064-16197 sole-consumer
function getSpanDurationSeconds(messages, fireIdx) {
  let timestamp = messages[fireIdx]?.timestamp;
  let timestamp_2 = messages.at(-1)?.timestamp;
  if (!timestamp || !timestamp_2) return 0;
  return Math.round((Date.parse(timestamp_2) - Date.parse(timestamp)) / 1000);
}
//@ chunk-zdhbhsv3.js:16197-16241 affinity
var scheduledTasksModule = require("../utils/loop/LOOP_FILE_DYNAMIC_SENTINEL.lazy.js");
var SCHEDULED_TASKS_PLACEHOLDER = null;
//@ chunk-zdhbhsv3.js:16241-18277 fingerprint (2.1.88 match: useScheduledTasks, 0.512)
function useScheduledTasks({ isLoading, assistantMode, transcript, storageV5, disabled = false }) {
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let isLoadingRef = useEffectEvent(() => isLoading);
  let schedulerRef = useRef(null);
  let store = useSession();
  let setAppState = useAppStoreDirect();
  let taskRegistry = useTaskFramework();
  useEffect(() => {
    if (disabled || !isKairosCronEnabled() || getRemoteCaps() !== null) return;
    let buildScheduledPrompt = (prompt, wakeupSource, fireMeta) => ({
      value: prompt,
      mode: "prompt",
      agentId: mainAgentId(),
      priority: "later",
      isMeta: true,
      skipSlashCommands: true,
      modelScheduledOrigin: true,
      skipAttachments: true,
      wakeupSource,
      scheduledTaskId: fireMeta?.taskId,
      scheduledFireId: fireMeta?.fireId,
      ...(fireMeta?.plugin !== undefined && {
        scheduledByPlugin: fireMeta.plugin,
      }),
      workload: WORKLOAD_CRON,
    });
    let resolved = Promise.resolve();
    let enqueueScheduledWake = (taskPrompt, wakeupSource, taskMeta, onEnqueued) => {
      if (isStorageV5Enabled() && storageV5 !== undefined) {
        resolved = resolved.then(async () => {
          try {
            commandQueueOrDefault.enqueuePendingNotification(
              buildScheduledPrompt(
                await scheduledTasksModule.resolveLoopDefaultFireAsync(
                  store.autonomousLoopPreamble,
                  taskPrompt,
                  storageV5,
                ),
                wakeupSource,
                taskMeta,
              ),
            );
            onEnqueued?.();
          } catch (error) {
            logForDebugging(`[ScheduledTasks] fire enqueue (v5 arm) failed; fire skipped: ${error}`);
          }
        });
        return;
      }
      commandQueueOrDefault.enqueuePendingNotification(
        buildScheduledPrompt(
          scheduledTasksModule.resolveLoopDefaultFire(store.autonomousLoopPreamble, taskPrompt),
          wakeupSource,
          taskMeta,
        ),
      );
      onEnqueued?.();
    };
    let enqueueForLead = (prompt) => {
      if (scheduledTasksModule.isLoopDefaultSentinel(prompt.prompt))
        return {
          ...prompt,
          prompt: scheduledTasksModule.isLoopFileSentinel(prompt.prompt) ? "/loop (loop.md)" : "/loop",
        };
      return prompt;
    };
    let routineTasksModule = undefined;
    let scheduler = createCronScheduler({
      onFire: (task) => enqueueScheduledWake(task, "schedule_wakeup"),
      onMissed: wrapScheduledTaskBatchRunner((missed, plugin, onMissedDone) =>
        enqueueScheduledWake(
          buildMissedTaskNotification(missed),
          "schedule_wakeup",
          {
            plugin,
          },
          onMissedDone,
        ),
      ),
      onFireTask: wrapScheduledTaskRunner((scheduledTask, onFireDone) => {
        if (scheduledTask.agentId) {
          let teammate = findTeammateTaskByAgentId(scheduledTask.agentId, setAppState.getState().tasks);
          if (teammate && !isTerminalTaskStatus(teammate.status)) {
            injectUserMessageToTeammate(teammate.id, scheduledTask.prompt, taskRegistry, {
              kind: "task-notification",
            });
            onFireDone();
            return;
          }
          logForDebugging(
            `[ScheduledTasks] teammate ${scheduledTask.agentId} gone, removing orphaned cron ${scheduledTask.id}`,
          );
          removeCronTasks([scheduledTask.id]);
          return;
        }
        let uuid = randomUUID();
        if (scheduledTask.kind === "loop") {
          let isLoop = !isLoadingRef();
          transcript.replace((prev) => appendLoopWakeup(prev, isLoop, enqueueForLead(scheduledTask), uuid));
          setLoopTickInFlightPrompt(scheduledTask.prompt, scheduledTask.plugin);
          recordLoopWakeFire();
        } else {
          let scheduledTaskFireMessage = createScheduledTaskFireMessage(
            `Running scheduled task (${formatCronFireTime(new Date())})`,
            {
              task: enqueueForLead(scheduledTask),
              uuid,
            },
          );
          transcript.apply({
            type: "append",
            messages: [scheduledTaskFireMessage],
          });
        }
        enqueueScheduledWake(
          scheduledTask.prompt,
          wakeupSourceForKind(scheduledTask),
          {
            taskId: scheduledTask.id,
            fireId: uuid,
            plugin: scheduledTask.plugin,
          },
          onFireDone,
        );
      }),
      isLoading: () => isLoadingRef(),
      assistantMode,
      getJitterConfig: getCronJitterConfig,
      isKilled: () => !isKairosCronEnabled(),
      getExtraTasks:
        SCHEDULED_TASKS_PLACEHOLDER && routineTasksModule && getProjectConfigRoot() === null
          ? () =>
              SCHEDULED_TASKS_PLACEHOLDER.getRoutineCronTasks(
                getSessionProject(store).projectRoot,
                routineTasksModule,
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
  useEffect(() => {
    let writeQueue = new SerialWriteQueue();
    return () => writeQueue.dispose();
  }, []);
  useEffect(() => {
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
export { formatCronFireTime, useScheduledTasks };
