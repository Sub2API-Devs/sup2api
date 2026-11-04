/**
 * tools/PollEventsTool/PollEventsTool.ts
 *
 * 2.1.316 新增。PollEvents 工具：等待 harness 事件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b5fpmtr5.js (8)
 * attribution: placement 8
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
  POLL_IDLE_DESCRIPTION_FULL,
  buildPollDescription,
  POLL_IDLE_DESCRIPTION,
  getNoPendingEventsText,
} from "../PollTool/prompt.js";
import {
  PEER_AUTHORITIES,
  isPollEventIngressActive,
  prependAttachmentsToText,
  getPollEventEnvelope,
  collectDeclaredPollEvents,
  settleDeliveredEvents,
  buildPollEventDelivery,
} from "../../utils/pollEvents.js";
import {
  pollEventSchema,
  declaredKindsPrompt,
  eventDeclarations,
} from "../../utils/pollEvents/declarations.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { MAIN, PRINT_POLL_GRACE_MS } from "../RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import {
  getPollEventIngress,
  getLastMainThreadCacheTtlMs,
  getConversationToolsUsed,
} from "../../bootstrap/state.js";
import { CACHE_TTL_5M_MS } from "../../services/api/promptCacheBreakDetection.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { checkTurnIdsConsistent } from "../../services/mcp/ccrTurnId.js";
import { listUnreadableToolsUsed } from "../../utils/agentListing.js";
import {
  filterQueuedCommandsForThread,
  isActiveMainAgentCommand,
  isPassiveMainAgentCommand,
} from "../../utils/messageQueueManager.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-b5fpmtr5.js:12039-12293 placement (2.1.88 match: IMAGE_MIME_TYPES, 0.667)
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
//@ chunk-b5fpmtr5.js:12293-14275 placement
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
    return kindsText === undefined
      ? POLL_IDLE_DESCRIPTION_FULL
      : buildPollDescription(POLL_IDLE_DESCRIPTION, undefined, kindsText);
  },
  isTransparentWrapper() {
    return false;
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
        let unused = undefined;
        if (agentId !== undefined)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            "Poll is available on the main thread only",
            "Poll refused for this agent",
          );
        let mainAgent = MAIN;
        let queue = messageQueue;
        if (!queue.tryBeginPollCall(undefined)) {
          logPollCallEnd("duplicate_call", 0, 0);
          return {
            data: {
              content: NO_PENDING_EVENTS_TEXT,
              eventCount: 0,
              remainingWakeCount: 0,
            },
          };
        }
        let unusedFlagOne = false;
        let unusedFlagTwo = false;
        let waitResult;
        try {
          let now = Date.now();
          let pollResult = await waitForPollEvents(queue, signal, undefined, {
            messages: toolContext.messages,
            ...pollWaitOptions({
              ingress: getPollEventIngress(),
              permissionMode: unlayeredPermissions().mode,
              cacheTtlMs: getLastMainThreadCacheTtlMs(),
              ...{},
            }),
            ...false,
            liveTasks: () => [],
            ...false,
          });
          let { endReason, ...delivery } = pollResult;
          logPollCallEnd(
            endReason,
            Date.now() - now,
            endReason === "delivered" ? delivery.data.eventCount : 0,
          );
          return delivery;
        } finally {
          queue.endPollCall(undefined);
        }
      },
    };
  },
});
//@ chunk-b5fpmtr5.js:14275-14319 placement
/**
 * 一次 poll 的最长等待时间：缓存 TTL 减去余量。
 */
function maxPollWaitMs(cacheTtlMs) {
  return Math.min(cacheTtlMs ?? CACHE_TTL_5M_MS, CACHE_TTL_5M_MS) - PRINT_POLL_GRACE_MS;
}
//@ chunk-b5fpmtr5.js:14319-14468 placement
/**
 * PollEvents 的等待参数（evals 只等自身工作、等待时长取缓存 TTL）。
 */
function pollWaitOptions(options) {
  let { ingress, permissionMode, cacheTtlMs } = options;
  return {
    ownWorkOnly: ingress === "evals" || false,
    inputClosed: false,
    waitMs: (cacheTtlMs ?? CACHE_TTL_5M_MS) - PRINT_POLL_GRACE_MS,
    idleWaitMs: undefined,
  };
}
//@ chunk-b5fpmtr5.js:14468-15884 placement
async function waitForPollEvents(queue, signal, unusedPlacement, options) {
  let { ownWorkOnly, inputClosed, liveTasks, waitMs, idleWaitMs, agentId } = options;
  let waitAgentId = agentId ?? MAIN;
  let now = Date.now();
  let hasNothingToWaitFor = () =>
    (ownWorkOnly || (inputClosed && queue.pollEventAdmissionsPending() === 0)) &&
    true &&
    liveTasks().length === 0;
  let min = Math.min(waitMs, maxPollWaitMs(null));
  function alwaysFalse() {
    return false;
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
      let unreadableTools = listUnreadableToolsUsed(
        getConversationToolsUsed().names(),
        options.messages?.() ?? [],
      );
      return {
        data: {
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
        },
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
    let pendingCommands = [];
    let runningTasks = pendingCommands.length > 0 ? [] : liveTasks();
    if (elapsedMs >= waitMs);
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
      let noopUnsubscribe = () => {};
      signal.addEventListener("abort", wake);
      if (signal.aborted || hasPendingPollWork(queue, alwaysFalse(), agentId) || hasNothingToWaitFor())
        wake();
    });
  }
}
//@ chunk-b5fpmtr5.js:15884-16327 placement
/**
 * 队列中是否有需要唤醒 PollEvents 的命令。
 */
function hasPendingPollWork(queue, allowLater, agentId) {
  if (agentId !== undefined)
    return (
      !queue.isMidTurnFoldSuspended() &&
      filterQueuedCommandsForThread(queue.getCommandsByMaxPriority("next"), {
        isMainThread: false,
        currentAgentId: agentId,
      }).length > 0
    );
  let foldSuspended = queue.isMidTurnFoldSuspended();
  let canDrainLater = allowLater && !foldSuspended;
  return (
    queue.peek(
      (command) =>
        isActiveMainAgentCommand(command) &&
        !(canDrainLater && command.priority === "later" && command.mode !== "poll-event"),
    ) !== undefined ||
    (foldSuspended
      ? !isTerminalShutdown() && queue.peek(isPassiveMainAgentCommand) !== undefined
      : filterQueuedCommandsForThread(queue.getCommandsByMaxPriority("next"), {
          isMainThread: true,
          currentAgentId: undefined,
        }).some((command) => command.drainOnly !== true && command.screeningPending !== true))
  );
}
//@ chunk-b5fpmtr5.js:16327-16414 placement
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
//@ chunk-b5fpmtr5.js:16414-16504 placement
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
