/**
 * tools/PollEventsTool/PollEventsTool.ts
 *
 * 2.1.316 新增。PollEvents 工具：等待 harness 事件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-34x4ecrv.js (9)
 * attribution: placement 8, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  union,
  objectSchema,
  literal,
  _enum,
  stringSchema,
  numberSchema,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  NO_PENDING_EVENTS_TEXT,
  POLL,
  buildPollDescription,
  replWaitIntro,
  POLL_IDLE_DESCRIPTION,
  pollSuffix,
  chunkSuffix,
  POLL_IDLE_DESCRIPTION_FULL,
  getNoPendingEventsText,
} from "../PollTool/prompt.js";
import {
  PEER_AUTHORITIES,
  isPollEventIngressActive,
  prependAttachmentsToText,
  shouldArmSelfPoll,
  getPollEventEnvelope,
  collectDeclaredPollEvents,
  settleDeliveredEvents,
  buildPollEventDelivery,
  REPL_STATUS_EVENT_KIND,
  emptyPollExtras,
  EVAL_SETTLE_EVENT_KIND,
  escapedEventText,
} from "../../utils/pollEvents.js";
import {
  pollEventSchema,
  declaredKindsPrompt,
  eventDeclarations,
  declaredKindsNotePlaceholder,
} from "../../utils/pollEvents/declarations.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { alwaysFalsePlaceholder } from "../../utils/background/remote/remoteSession.js";
import {
  isCodeModeExperimentEnabled,
  REPL_MAIN_THREAD_KEY,
  POLL_CACHE_TTL_MARGIN_MS,
} from "../RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { isMainSpawnedSubagent } from "../../utils/agentContext.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { REPL_TOOL_NAME, isEvalToolName } from "../REPLTool/constants.js";
import {
  getIsInteractive,
  getPollEventIngress,
  getLastMainThreadCacheTtlMs,
  isPrintInputClosed,
} from "../../bootstrap/state.js";
import { isDisplayableTranscriptTask } from "../../components/tasks/BackgroundTaskStatus.js";
import { CACHE_TTL_5M_MS } from "../../services/api/promptCacheBreakDetection.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { checkTurnIdsConsistent } from "../../services/mcp/ccrTurnId.js";
import { unreadableToolsFromEntries } from "../../utils/agentListing.js";
import { emptyToolResults } from "../../query.js";
import { plural } from "../../utils/stringUtils.js";
import {
  filterMidTurnDrainCommands,
  isDrainableMainThreadCommand,
  isPassiveMainThreadCommand,
} from "../../utils/messageQueueManager.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-34x4ecrv.js:13332-13586 placement (2.1.88 match: IMAGE_MIME_TYPES, 0.669)
var emptyObjectSchema = DoctorLazy(() => zodStrictObject({}));
var mediaBlockSchema = DoctorLazy(() =>
  union([
    objectSchema({
      type: literal("image"),
      source: objectSchema({
        type: literal("base64"),
        media_type: _enum(["image/jpeg", "image/png", "image/gif", "image/webp"]),
        data: stringSchema(),
      }),
    }),
    objectSchema({
      type: literal("document"),
      source: objectSchema({
        type: literal("base64"),
        media_type: literal("application/pdf"),
        data: stringSchema(),
      }),
    }),
  ]),
);
//@ chunk-34x4ecrv.js:13586-17193 placement
/**
 * PollEvents 的输出 schema（渲染后的信封、事件数、剩余唤醒数、媒体）。
 */
var POLL_EVENTS_OUTPUT_SCHEMA = DoctorLazy(() =>
  objectSchema({
    content: stringSchema().describe(`Rendered event envelopes, or "${NO_PENDING_EVENTS_TEXT}"`),
    eventCount: numberSchema().int().describe("Number of events delivered in this result"),
    remainingWakeCount: numberSchema()
      .int()
      .describe("Wake events still queued after this chunk; they follow in the next delivery"),
    media: array(array(mediaBlockSchema()))
      .optional()
      .describe("Each delivered event's images and documents, 1:1 with the events. Absent when none has any"),
    toolsUsed: array(stringSchema()).optional(),
    ...{},
    provenance: array(
      objectSchema({
        authority: _enum(PEER_AUTHORITIES),
        senderId: stringSchema().optional(),
        senderText: stringSchema().optional(),
      }).nullable(),
    ).optional(),
    declared: array(pollEventSchema().nullable()).optional(),
  }),
);
var PollTool = buildTool({
  name: POLL,
  searchHint: "wait for and receive queued harness events",
  backgrounding: "never",
  maxResultSizeChars: 200000,
  persistenceThresholdCeiling: 200000,
  skipAggregateToolResultBudget: true,
  get inputSchema() {
    return emptyObjectSchema();
  },
  get outputSchema() {
    return POLL_EVENTS_OUTPUT_SCHEMA();
  },
  isEnabled() {
    return isPollEventIngressActive();
  },
  isConcurrencySafe() {
    return true;
  },
  isReadOnly() {
    return true;
  },
  async description() {
    return "Wait for pending harness events";
  },
  async prompt() {
    let kindsText = declaredKindsPrompt(eventDeclarations());
    if (codeModeAccepted()) {
      let { isReplSpliceWaitEnabled } = require("../../utils/codeMode/waitForNews.js");
      let chunkNote = alwaysFalsePlaceholder() ? declaredKindsNotePlaceholder() : undefined;
      let chunkNote_2 =
        kindsText === undefined || chunkNote === undefined
          ? (kindsText ?? chunkNote)
          : `${kindsText}

${chunkNote}`;
      return buildPollDescription(
        isReplSpliceWaitEnabled() ? replWaitIntro() : POLL_IDLE_DESCRIPTION,
        pollSuffix(),
        chunkNote_2,
        chunkNote === undefined ? undefined : chunkSuffix(),
      );
    }
    return kindsText === undefined
      ? POLL_IDLE_DESCRIPTION_FULL
      : buildPollDescription(POLL_IDLE_DESCRIPTION, undefined, kindsText);
  },
  isTransparentWrapper() {
    return codeModeAccepted() && isCodeModeExperimentEnabled();
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: prependAttachmentsToText(result.content, result.media),
    };
  },
  stripForStorage(result) {
    return result;
  },
  renderToolUseMessage() {
    return "";
  },
  extractSearchText() {
    return "";
  },
  create(toolContext) {
    let { agentId, messageQueue, toolState, taskRegistry, unlayeredPermissions } = toolContext;
    return {
      async call(input, callOptions) {
        let { signal, parentMessage, onProgress } = callOptions;
        let unused =
          codeModeAccepted() &&
          isCodeModeExperimentEnabled() &&
          agentId !== undefined &&
          isMainSpawnedSubagent({
            agentId,
            agentContext: toolContext.agentContext,
            teammateContext: toolContext.teammateContext,
          })
            ? agentId
            : undefined;
        if (agentId !== undefined && unused === undefined)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            codeModeAccepted() && isCodeModeExperimentEnabled()
              ? `${POLL} isn't available here and isn't needed: each ${REPL_TOOL_NAME} call you make here waits for its script to finish and returns the result.`
              : "Poll is available on the main thread only",
            "Poll refused for this agent",
          );
        let mainAgent = unused ?? REPL_MAIN_THREAD_KEY;
        let queue = messageQueue;
        if (!queue.tryBeginPollCall(unused)) {
          logPollCallEnd("duplicate_call", 0, 0);
          if (codeModeAccepted() && isCodeModeExperimentEnabled())
            return {
              data: {
                content: NO_PENDING_EVENTS_TEXT,
                eventCount: 0,
                remainingWakeCount: 0,
              },
              hideRow: true,
            };
          return {
            data: {
              content: NO_PENDING_EVENTS_TEXT,
              eventCount: 0,
              remainingWakeCount: 0,
            },
          };
        }
        let unusedFlagOne = codeModeAccepted() && isCodeModeExperimentEnabled();
        let unusedFlagTwo =
          codeModeAccepted() && require("../../utils/codeMode/waitForNews.js").isReplSpliceWaitEnabled();
        let waitResult;
        try {
          let unusedPlacement = codeModeAccepted()
            ? require("../../state/replSessions.js").getReplSessions({
                toolState,
              })
            : undefined;
          if (
            codeModeAccepted() &&
            unusedFlagOne &&
            getIsInteractive() &&
            unusedPlacement !== undefined &&
            onProgress !== undefined &&
            !unusedFlagTwo
          ) {
            let onTick = ({ startedAt, tick }) =>
              onProgress({
                type: "progress",
                toolUseID: tick.toolUseId,
                data: {
                  ...tick,
                  scriptStartedAt: startedAt,
                },
              });
            for (let tick of unusedPlacement.ticks(mainAgent)) onTick(tick);
            waitResult = unusedPlacement.onTick(mainAgent, onTick);
          }
          let now = Date.now();
          let pollResult = await waitForPollEvents(queue, signal, unusedPlacement, {
            messages: toolContext.messages,
            ...pollWaitOptions({
              ingress: getPollEventIngress(),
              permissionMode: unlayeredPermissions().mode,
              cacheTtlMs: unused === undefined ? getLastMainThreadCacheTtlMs() : null,
              ...(codeModeAccepted()
                ? {
                    codeModeExperiment: unusedFlagOne,
                    besideReplCall: [
                      parentMessage,
                      ...(callOptions.sameTurnToolUses ?? []).filter(
                        (message) => message.message.id === parentMessage?.message.id,
                      ),
                    ].some(
                      (message) =>
                        Array.isArray(message?.message.content) &&
                        message.message.content.some(
                          (block) => block.type === "tool_use" && isEvalToolName(block.name),
                        ),
                    ),
                    printInputClosed: isPrintInputClosed(),
                    selfArmed: shouldArmSelfPoll(),
                  }
                : {}),
            }),
            ...(unused !== undefined && {
              ownWorkOnly: true,
              inputClosed: false,
              idleWaitMs: undefined,
              agentId: unused,
            }),
            liveTasks:
              codeModeAccepted() && unusedFlagOne
                ? () =>
                    Object.values(taskRegistry.all())
                      .filter(
                        (task) =>
                          isDisplayableTranscriptTask(task) &&
                          (unused === undefined || isTaskOwnedBy(task, unused)),
                      )
                      .map((task) => task.description)
                : () => [],
            ...(codeModeAccepted() && {
              deliveryTurn: toolContext.deliveryTurn,
            }),
          });
          let { endReason, ...result } = pollResult;
          logPollCallEnd(endReason, Date.now() - now, endReason === "delivered" ? result.data.eventCount : 0);
          if (codeModeAccepted() && unusedFlagTwo && unusedPlacement !== undefined) {
            if (result.data.eventCount > 0) unusedPlacement.takeUnwaited(mainAgent);
            else if (endReason === "queued_input_for_turn_end") {
              let event = new Set(unusedPlacement.pending(mainAgent).map((event) => event.id));
              if (event.size > 0) {
                unusedPlacement.takeUnwaited(mainAgent, event);
                unusedPlacement.noteStatusLine(mainAgent);
              }
            }
          }
          return codeModeAccepted() && unusedFlagOne && result.data.eventCount === 0
            ? {
                ...result,
                hideRow: true,
              }
            : result;
        } finally {
          if (codeModeAccepted()) waitResult?.();
          queue.endPollCall(unused);
        }
      },
    };
  },
});
//@ chunk-34x4ecrv.js:17292-17419 affinity
function isTaskOwnedBy(task, unused) {
  return (
    (task.type === "local_agent" || task.type === "local_workflow"
      ? task.ownerAgentId
      : "agentId" in task
        ? task.agentId
        : undefined) === unused
  );
}
//@ chunk-34x4ecrv.js:17419-17463 placement
/**
 * 一次 poll 的最长等待时间：缓存 TTL 减去余量。
 */
function maxPollWaitMs(cacheTtlMs) {
  return Math.min(cacheTtlMs ?? CACHE_TTL_5M_MS, CACHE_TTL_5M_MS) - POLL_CACHE_TTL_MARGIN_MS;
}
//@ chunk-34x4ecrv.js:17463-17786 placement
/**
 * PollEvents 的等待参数（evals 只等自身工作、等待时长取缓存 TTL）。
 */
function pollWaitOptions(options) {
  let { ingress, permissionMode, cacheTtlMs } = options;
  return {
    ownWorkOnly:
      ingress === "evals" ||
      (codeModeAccepted() &&
        options.codeModeExperiment &&
        (ingress === "terminal" ||
          (ingress === "host" && permissionMode !== "auto") ||
          options.besideReplCall)),
    inputClosed: codeModeAccepted() && options.codeModeExperiment && options.printInputClosed,
    waitMs: (cacheTtlMs ?? CACHE_TTL_5M_MS) - POLL_CACHE_TTL_MARGIN_MS,
    idleWaitMs:
      codeModeAccepted() && options.codeModeExperiment && options.selfArmed
        ? maxPollWaitMs(cacheTtlMs)
        : undefined,
  };
}
//@ chunk-34x4ecrv.js:17786-20276 placement
async function waitForPollEvents(queue, signal, unusedPlacement, options) {
  let { ownWorkOnly, inputClosed, liveTasks, waitMs, idleWaitMs, agentId } = options;
  let waitAgentId = agentId ?? REPL_MAIN_THREAD_KEY;
  if (codeModeAccepted()) unusedPlacement?.takeStatusLineGiven(waitAgentId);
  let now = Date.now();
  let hasNothingToWaitFor = () =>
    (ownWorkOnly || (inputClosed && queue.pollEventAdmissionsPending() === 0)) &&
    (codeModeAccepted() && unusedPlacement !== undefined
      ? unusedPlacement.outstanding(waitAgentId) === 0
      : true) &&
    liveTasks().length === 0;
  let min = Math.min(waitMs, maxPollWaitMs(null));
  function alwaysFalse() {
    return (
      codeModeAccepted() &&
      unusedPlacement !== undefined &&
      unusedPlacement.ledger(REPL_MAIN_THREAD_KEY).length > 0 &&
      Date.now() - now < min
    );
  }
  for (;;) {
    if (signal.aborted) return emptyPollResult("aborted");
    let { commands, remainingWakeCount } = queue.drainPollEventChunk(agentId);
    if (commands.length > 0) {
      let mapped = commands.map(getPollEventEnvelope);
      let declaredPollEvents = collectDeclaredPollEvents(commands);
      logFeatureOk("poll_event_delivery");
      checkTurnIdsConsistent(commands);
      settleDeliveredEvents(commands);
      let unreadableTools = unreadableToolsFromEntries(commands, options.messages?.() ?? []);
      let data = {
        content: buildPollEventDelivery(mapped, remainingWakeCount, unreadableTools),
        eventCount: commands.length,
        remainingWakeCount,
        ...(unreadableTools.length > 0 && {
          toolsUsed: unreadableTools,
        }),
        ...(commands.some((command) => command.pollEvent?.media !== undefined) && {
          media: commands.map((command) => command.pollEvent?.media ?? []),
        }),
        provenance: commands.map((command) => command.pollEvent?.provenance ?? null),
        ...(declaredPollEvents !== undefined && {
          declared: declaredPollEvents,
        }),
      };
      if (codeModeAccepted()) {
        let declaredSum = emptyToolResults(commands);
        let {
          clearPollEventFollowing,
          pollEventFollowingOf,
        } = require("../../utils/pollEvents/clearPollEventFollowing.lazy.js");
        let { messages, contextLayers } = pollEventFollowingOf(commands, options.deliveryTurn?.());
        clearPollEventFollowing(commands);
        let events = [...declaredSum, ...messages];
        return {
          data,
          endReason: commands.every((command) => command.pollEvent?.kind === REPL_STATUS_EVENT_KIND)
            ? "status_work_running"
            : "delivered",
          ...emptyPollExtras(commands),
          ...(events.length > 0 && {
            newMessages: events,
          }),
          ...(contextLayers.length > 0 && {
            contextLayers,
          }),
          ...(require("../../utils/codeMode/vscodeExtensionStream.js").clientsDrawScriptCalls() &&
            commands.every(
              (command) =>
                (command.pollEvent?.kind === EVAL_SETTLE_EVENT_KIND ||
                  command.pollEvent?.kind === REPL_STATUS_EVENT_KIND) &&
                command.pollEvent?.keepsRow !== true,
            ) && {
              hideRow: true,
            }),
        };
      }
      return {
        data,
        endReason: "delivered",
      };
    }
    if (hasPendingPollWork(queue, alwaysFalse(), agentId))
      return emptyPollResult(
        hasPendingPollWork(queue, true, agentId) ? "queued_input" : "queued_input_for_turn_end",
      );
    if (hasNothingToWaitFor())
      return inputClosed && !ownWorkOnly
        ? {
            data: {
              content: getNoPendingEventsText(),
              eventCount: 0,
              remainingWakeCount: 0,
            },
            endReason: "nothing_to_wait_for_input_closed",
          }
        : emptyPollResult("nothing_to_wait_for");
    let elapsedMs = Date.now() - now;
    let pendingCommands =
      codeModeAccepted() && unusedPlacement !== undefined ? unusedPlacement.ledger(waitAgentId) : [];
    let runningTasks = pendingCommands.length > 0 ? [] : liveTasks();
    if (elapsedMs >= waitMs) {
      if (codeModeAccepted() && pendingCommands.length > 0) {
        require("../../utils/codeMode/enqueueReplStatus.lazy.js").enqueueReplStatus(
          queue,
          pendingCommands,
          agentId,
        );
        unusedPlacement?.noteStatusLine(waitAgentId);
        continue;
      }
      if (codeModeAccepted() && runningTasks.length > 0)
        return {
          data: {
            content: `No events yet \u2014 ${runningTasks.length} background ${plural(runningTasks.length, "task")} still running: ${runningTasks.map((runningTask) => escapedEventText(runningTask)).join("; ")}. Poll again to keep waiting.`,
            eventCount: 0,
            remainingWakeCount: 0,
          },
          endReason: "status_work_running",
        };
    }
    let nothingRunning = pendingCommands.length === 0 && runningTasks.length === 0;
    if (nothingRunning && idleWaitMs !== undefined && elapsedMs >= idleWaitMs)
      return emptyPollResult("wait_limit_nothing_running");
    await new Promise((resolve) => {
      let sleepMs = nothingRunning ? idleWaitMs : hasPendingPollWork(queue, false, agentId) ? min : waitMs;
      let timer = sleepMs !== undefined ? setTimeout(wake, Math.max(0, sleepMs - elapsedMs)) : undefined;
      function wake() {
        if (timer !== undefined) clearTimeout(timer);
        unsubscribe();
        noopUnsubscribe();
        signal.removeEventListener("abort", wake);
        resolve();
      }
      let unsubscribe = queue.subscribe(wake);
      let noopUnsubscribe =
        codeModeAccepted() && unusedPlacement !== undefined
          ? unusedPlacement.onOutstandingChange(wake)
          : () => {};
      signal.addEventListener("abort", wake);
      if (signal.aborted || hasPendingPollWork(queue, alwaysFalse(), agentId) || hasNothingToWaitFor())
        wake();
    });
  }
}
//@ chunk-34x4ecrv.js:20276-20719 placement
/**
 * 队列中是否有需要唤醒 PollEvents 的命令。
 */
function hasPendingPollWork(queue, allowLater, agentId) {
  if (agentId !== undefined)
    return (
      !queue.isMidTurnFoldSuspended() &&
      filterMidTurnDrainCommands(queue.getCommandsByMaxPriority("next"), {
        isMainThread: false,
        currentAgentId: agentId,
      }).length > 0
    );
  let foldSuspended = queue.isMidTurnFoldSuspended();
  let canDrainLater = allowLater && !foldSuspended;
  return (
    queue.peek(
      (command) =>
        isDrainableMainThreadCommand(command) &&
        !(canDrainLater && command.priority === "later" && command.mode !== "poll-event"),
    ) !== undefined ||
    (foldSuspended
      ? !isTerminalShutdown() && queue.peek(isPassiveMainThreadCommand) !== undefined
      : filterMidTurnDrainCommands(queue.getCommandsByMaxPriority("next"), {
          isMainThread: true,
          currentAgentId: undefined,
        }).some((command) => command.drainOnly !== true && command.screeningPending !== true))
  );
}
//@ chunk-34x4ecrv.js:20719-20806 placement
/**
 * 构造“没有事件”的 poll 结果，带上结束原因。
 */
function emptyPollResult(endReason) {
  return {
    data: {
      content: NO_PENDING_EVENTS_TEXT,
      eventCount: 0,
      remainingWakeCount: 0,
    },
    endReason,
  };
}
//@ chunk-34x4ecrv.js:20806-20896 placement
/**
 * 上报 poll 结束事件（原因、等待时长、投递事件数）。
 */
function logPollCallEnd(endReason, waitedMs, deliveredEventCount) {
  logEvent("tengu_poll_call_end", {
    reason: fromEnum(endReason),
    waitedMs,
    deliveredEventCount,
  });
}
export { PollTool };
