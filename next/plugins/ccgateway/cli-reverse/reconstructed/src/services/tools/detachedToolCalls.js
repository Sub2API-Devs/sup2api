/**
 * services/tools/detachedToolCalls.ts
 *
 * 2.1.316 新增：转入后台继续运行的工具调用（结果稍后送回）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (23)
 * attribution: placement 23
 */
import { isPrintInputClosed, mainAgentId } from "../../bootstrap/state.js";
import { isDetachedToolCallsEnabled } from "../../components/PromptInput/promptFlags.js";
import { TASK_NOTIFICATION, TOOL_USE_ID, TASK_TYPE } from "../../constants/xml.js";
import { createStore } from "../../state/store.js";
import { logForDebugging, createAttachmentMessage_2 } from "../../utils/debug.js";
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { logError } from "../../utils/log.js";
import { MAX_MERGED_PROMPTS } from "../../constants/outputLimits.js";
import { getToolBackgrounding, runAfterResultCommitted } from "../../Tool.js";
import { isBackgroundTasksOff } from "../../tools/AgentTool/backgroundGates.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { hasToolHookMatching, hasSettingsHookForEvent } from "../../utils/hooks.js";
import { registerAgent } from "../../utils/telemetry/perfettoTracing.js";
import { dispatchClassicEvent } from "../../plugins/functionHooks/modAdmission.js";
import { hasModuleHookingSite } from "../../plugins/hooksModules/loadedModuleFilters.js";
import { toolCategoryForTelemetry } from "../api/toolDefinitionShape.js";
import { createAbortController, attachDetachableAbortRelay } from "../../utils/abortController.js";
import { UrlProvenanceState } from "../../tools/WebFetchTool/urlProvenance.js";
import { logEvent } from "../analytics/index.js";
import { sanitizeToolNameForAnalytics } from "../analytics/metadata.js";
import { AbortError as AbortError_2 } from "../../utils/errors.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { formatToolErrorMessage } from "../../utils/toolErrors.js";
import {
  persistLargeToolResult,
  toolResultsDirFor_2,
  persistToolResult,
  isPersistError,
} from "../../utils/toolResultStorage.js";
import { escapeXml_2 as escapeXml, escapeXmlTruncated } from "../../utils/confusables.js";
import { plural } from "../../utils/stringUtils.js";
import { enqueuePendingNotification } from "../../utils/messageQueueManager.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { expandPathOrNull } from "../../utils/path.js";
import { logFileStateResync } from "../../utils/readFileInRange.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:586537-586577 placement
/**
 * 判断工具调用是否可以脱离当前轮次执行。
 */
function canDetachCalls(isNonInteractiveSession) {
  return isNonInteractiveSession && !isPrintInputClosed() && isDetachedToolCallsEnabled();
}
//@ chunk-5xgkngpb.js:2195541-2195561 placement
var TOOL_CALL = "tool_call";
//@ chunk-5xgkngpb.js:2195561-2196178 placement
/**
 * 工具调用被转入后台时返回给模型的说明：调用仍在进行，结果稍后以 task-notification 送达，不要重复、等待或声称已取消。
 */
function buildStillRunningNotice(toolName, { isOnScreen }) {
  return `[Still running. The user sent a message while this call loads, and that message follows so you can answer it now. This ${toolName} call was not interrupted. Its result will be delivered to you on its own, in a later <${TASK_NOTIFICATION}> carrying this tool_use_id. Do not repeat the call, and do not wait, sleep or poll for it. You cannot stop it either, so never say you cancelled or dropped it.${isOnScreen ? " On the user's screen this call simply still shows as in progress: nothing there says it was moved, backgrounded or detached, so do not describe it that way." : ""} If they ask, it is still loading.]`;
}
//@ chunk-5xgkngpb.js:2196178-2196208 placement
/**
 * 结果里标记「该调用已转入后台」的对象。
 */
var DETACHED_TOOL_CALL_FLAG = {
  detachedToolCall: true,
};
//@ chunk-5xgkngpb.js:2196208-2196341 placement
/**
 * 工具调用是否以分离方式转入后台（backgrounding=detach 且结果标记 detachedToolCall）。
 */
function isDetachedToolResult(tool, toolUseResult) {
  return (
    tool?.backgrounding === "detach" &&
    typeof toolUseResult === "object" &&
    toolUseResult !== null &&
    "detachedToolCall" in toolUseResult &&
    toolUseResult.detachedToolCall === true
  );
}
//@ chunk-5xgkngpb.js:2196341-2196562 placement (2.1.88 match: enqueueUltraplanFailureNotification, 0.531)
/**
 * 从 task-notification 文本开头解析 tool_use_id（类型须为工具调用），否则返回 null。
 */
function parseTaskNotificationToolUseId(text) {
  let header = `<${TASK_NOTIFICATION}>
<${TOOL_USE_ID}>`;
  if (!text.startsWith(header)) return null;
  let index = text.indexOf(
    `</${TOOL_USE_ID}>
`,
    header.length,
  );
  if (
    index === -1 ||
    !text.startsWith(
      `<${TASK_TYPE}>${TOOL_CALL}</${TASK_TYPE}>
`,
      index +
        `</${TOOL_USE_ID}>
`.length,
    )
  )
    return null;
  return text.slice(header.length, index);
}
//@ chunk-5xgkngpb.js:2196562-2196599 placement
/**
 * 判断调用 id 是否是任务通知形式的（可对应后台调用）。
 */
function hasTaskNotificationToolUseId(text) {
  return parseTaskNotificationToolUseId(text) !== null;
}
//@ chunk-5xgkngpb.js:2196599-2196648 placement
/**
 * 后台调用跟踪的常量：记录存活时长、通知延迟与两张表。
 */
var DETACHED_CALL_TTL_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DETACHED_NOTIFICATION_DELAY_MS;
var detachedCallsById;
var queuedDetachedNotifications;
deferInit("chunk-5xgkngpb.js:2196599", () => {
  DETACHED_CALL_TTL_MS = 300000;
  DETACHED_NOTIFICATION_DELAY_MS = 30000;
  detachedCallsById = new Map();
  queuedDetachedNotifications = new Set();
});
//@ chunk-5xgkngpb.js:2196648-2198840 placement
/**
 * 转入后台继续运行的工具调用对象：跟踪运行、完成、用户取消、对话清空等状态。
 */
class DetachedToolCall {
  #e = createStore(detachedCallsById);
  #t = new Map();
  #n = new Set();
  subscribe = this.#e.subscribe;
  getSnapshot = this.#e.getSnapshot;
  letGo(toolUseId) {
    this.#n.add(toolUseId);
  }
  ended(toolUseId) {
    this.#n.delete(toolUseId);
  }
  wasLetGo(toolUseId) {
    return this.#n.has(toolUseId);
  }
  started(toolUseId, patch, stopCallback) {
    this.#t.set(toolUseId, stopCallback);
    this.#r(toolUseId, {
      status: "running",
      stopRequested: false,
      ...patch,
    });
  }
  settled(toolUseId, outcome) {
    this.#t.delete(toolUseId);
    let previous = this.#e.getSnapshot().get(toolUseId);
    if (previous === undefined) return false;
    let kept = {
      paintedInPlace: false,
      detachedAt: previous.detachedAt,
      tool: previous.tool,
      input: previous.input,
    };
    this.#r(
      toolUseId,
      outcome.status === "completed"
        ? {
            ...outcome,
            ...kept,
            resultQueued: false,
          }
        : {
            ...outcome,
            ...kept,
          },
    );
    return true;
  }
  resultQueued(toolUseId) {
    let entry = this.#e.getSnapshot().get(toolUseId);
    if (entry?.status === "completed" && !entry.resultQueued)
      this.#r(toolUseId, {
        ...entry,
        resultQueued: true,
      });
  }
  awaitingResult() {
    let ids = [];
    for (let [toolUseId, entry] of this.#e.getSnapshot())
      if (entry.status === "running" || (entry.status === "completed" && !entry.resultQueued))
        ids.push(toolUseId);
    return ids;
  }
  owesResult(nowMs) {
    for (let entry of this.#e.getSnapshot().values())
      if (
        entry.status === "running"
          ? nowMs - entry.detachedAt < DETACHED_CALL_TTL_MS + DETACHED_NOTIFICATION_DELAY_MS
          : entry.status === "completed" &&
            !entry.resultQueued &&
            nowMs - entry.settledAt < DETACHED_NOTIFICATION_DELAY_MS
      )
        return true;
    return false;
  }
  paintedInPlace(toolUseId) {
    let entry = this.#e.getSnapshot().get(toolUseId);
    if (entry === undefined || entry.status === "running" || entry.paintedInPlace) return;
    this.#r(toolUseId, {
      ...entry,
      paintedInPlace: true,
    });
  }
  stopRunning(onlyIds) {
    let filtered = [...this.#t].filter(([toolUseId]) => onlyIds === undefined || onlyIds.has(toolUseId));
    if (filtered.length === 0) return 0;
    for (let [toolUseId] of filtered) this.#t.delete(toolUseId);
    this.#e.setState((state) => {
      let next = new Map(state);
      for (let [toolUseId] of filtered) {
        let entry = next.get(toolUseId);
        if (entry?.status === "running")
          next.set(toolUseId, {
            ...entry,
            stopRequested: true,
          });
      }
      return next;
    });
    for (let [, stop] of filtered) stop("user-cancel");
    return filtered.length;
  }
  discardAllExcept(keepIds) {
    for (let [toolUseId, stop] of [...this.#t])
      if (!keepIds.has(toolUseId)) {
        this.#t.delete(toolUseId);
        stop("conversation-cleared");
      }
    let discarded = new Set();
    this.#e.setState((state) => {
      let next = new Map();
      for (let [toolUseId, entry] of state)
        if (keepIds.has(toolUseId)) next.set(toolUseId, entry);
        else discarded.add(toolUseId);
      return discarded.size === 0 ? state : next;
    });
    return discarded;
  }
  discardAll() {
    this.discardAllExcept(queuedDetachedNotifications);
  }
  discardAllOutside(messages) {
    return this.#e.getSnapshot().size === 0
      ? queuedDetachedNotifications
      : this.discardAllExcept(this.#o(messages));
  }
  outside(messages) {
    let snapshot = this.#e.getSnapshot();
    if (snapshot.size === 0) return queuedDetachedNotifications;
    let inside = this.#o(messages);
    return new Set([...snapshot.keys()].filter((key) => !inside.has(key)));
  }
  #o(messages) {
    let snapshot = this.#e.getSnapshot();
    let inside = new Set();
    for (let message of messages) {
      if (message.type !== "assistant") continue;
      for (let block of message.message.content)
        if (block.type === "tool_use" && snapshot.has(block.id)) inside.add(block.id);
    }
    return inside;
  }
  #r(toolUseId, entry) {
    this.#e.setState((state) => new Map(state).set(toolUseId, entry));
  }
}
//@ chunk-5xgkngpb.js:2198840-2198867 placement
/**
 * 按会话保存的后台调用跟踪器。
 */
var detachedCallSlots; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2198840", () => {
  detachedCallSlots = new SessionRootSlot(() => new DetachedToolCall());
});
//@ chunk-5xgkngpb.js:2198867-2198937 placement
/**
 * 丢弃指定范围外的后台调用并移除其排队通知。
 */
function discardQueuedOutside(store, messageQueue, messages) {
  let discarded = store.discardAllOutside(messages);
  if (discarded.size > 0) removeQueuedToolNotifications(messageQueue, discarded);
}
//@ chunk-5xgkngpb.js:2198937-2199032 placement
/**
 * 停止指定范围外的后台调用并移除其排队通知。
 */
function stopAndDropOutside(store, messageQueue, messages) {
  let outsideIds = store.outside(messages);
  if (outsideIds.size === 0) return [];
  store.stopRunning(outsideIds);
  return removeQueuedToolNotifications(messageQueue, outsideIds);
}
//@ chunk-5xgkngpb.js:2199032-2199195 placement
function removeQueuedToolNotifications(messageQueue, toolUseIds) {
  return messageQueue.removeByFilter((queued) => {
    if (queued.mode !== "task-notification" || typeof queued.value !== "string") return false;
    let taskNotificationToolUseId = parseTaskNotificationToolUseId(queued.value);
    return taskNotificationToolUseId !== null && toolUseIds.has(taskNotificationToolUseId);
  });
}
//@ chunk-5xgkngpb.js:3976621-3976722 placement
class ForegroundCallRegistry {
  #e = new Set();
  add(call) {
    this.#e.add(call);
    return () => {
      this.#e.delete(call);
    };
  }
  list() {
    return [...this.#e];
  }
}
//@ chunk-5xgkngpb.js:3976722-3976750 placement
/**
 * 按会话保存的前台调用登记表（用于整体转入后台）。
 */
var foregroundCallRegistrySlots; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3976722", () => {
  foregroundCallRegistrySlots = new SessionRootSlot(() => new ForegroundCallRegistry());
});
//@ chunk-5xgkngpb.js:3976750-3976952 placement
/**
 * 把当前前台的可转后台调用全部转入后台，返回成功数；单个出错时保留在前台并记日志。
 */
function backgroundForegroundCalls(calls) {
  let detachedCount = 0;
  for (let call of calls)
    try {
      if (call.backgroundNow()) detachedCount++;
    } catch (error) {
      logForDebugging(
        `[foreground-tool-calls] moving ${call.toolUseId ?? "a call"} threw; it stays in the foreground`,
        {
          level: "error",
        },
      );
      logError(error);
    }
  return detachedCount;
}
//@ chunk-5xgkngpb.js:3976952-3976969 placement
var FOREGROUND_DETACH_DEADLINE_MARGIN_MS = MAX_MERGED_PROMPTS - 2000;
//@ chunk-5xgkngpb.js:3976969-3977638 placement
/**
 * 把正在运行的工具调用转入后台继续，并触发相应钩子。
 */
function detachToolCall(tool, toolInput, toolUseContext) {
  try {
    if (
      getToolBackgrounding(tool) !== "detach" ||
      toolUseContext.agentId !== undefined ||
      toolUseContext.innerCall === true ||
      toolUseContext.remoteCall !== undefined ||
      (toolUseContext.options.isNonInteractiveSession && !canDetachCalls(true)) ||
      isBackgroundTasksOff() ||
      !getFeatureValue_CACHED_MAY_BE_STALE("tengu_tool_detach", true)
    )
      return false;
    for (let hookEvent of ["PostToolUse", "PostToolUseFailure"])
      if (
        hasToolHookMatching({
          hookEvent,
          toolName: tool.name,
          toolInput,
          tools: toolUseContext.options.tools,
          toolAliases: toolUseContext.options.toolAliases,
          sessionHooks: toolUseContext.sessionHooksRegistry,
          sessionId: registerAgent(toolUseContext, hookEvent, toolUseContext.session.id),
        })
      )
        return false;
    return !(
      hasSettingsHookForEvent(
        "PostToolBatch",
        toolUseContext.sessionHooksRegistry,
        registerAgent(toolUseContext, "PostToolBatch", toolUseContext.session.id),
      ) ||
      dispatchClassicEvent("PostToolBatch") ||
      hasModuleHookingSite("tool.call", {
        tool: tool.name,
      })
    );
  } catch (error) {
    logForDebugging(`[detach] ${toolCategoryForTelemetry(tool)}: the gate threw, so the call runs inline`, {
      level: "error",
    });
    logError(error);
    return false;
  }
}
//@ chunk-5xgkngpb.js:3977638-3979718 placement
/**
 * 以可分离方式运行工具调用：注册"立即转后台"回调；用户发消息时若可分离则立即返回仍在运行的说明，调用在后台继续（有时限），完成或失败后经通知送回结果并记录事件。
 */
async function runDetachableToolCall({ tool, input, toolUseID, toolUseContext, onProgress, run }) {
  let detachedController = createAbortController();
  let releaseRelay = attachDetachableAbortRelay(toolUseContext.abortController, detachedController);
  let attached = true;
  detachedController.signal.addEventListener(
    "abort",
    () => {
      if (attached && !toolUseContext.abortController.signal.aborted)
        toolUseContext.abortController.abort(detachedController.signal.reason);
    },
    {
      once: true,
    },
  );
  let forwardProgress = onProgress
    ? (progress) => {
        if (attached) onProgress(progress);
      }
    : undefined;
  let runPromise = run(
    {
      ...toolUseContext,
      abortController: detachedController,
    },
    forwardProgress,
  );
  let detachedStore = detachedCallSlots.of(toolUseContext.session);
  let settledPromise = runPromise
    .finally(() => detachedStore.ended(toolUseID))
    .then(
      () => "settled",
      () => "settled",
    );
  let detachEarly = () => {};
  let promise = new Promise((resolve) => {
    detachEarly = () => resolve("early");
  });
  let unregister = foregroundCallRegistrySlots.of(toolUseContext.session).add({
    toolUseId: toolUseID,
    backgroundNow: () => {
      if (
        !attached ||
        toolUseContext.abortController.signal.aborted ||
        toolUseContext.toolState.get(UrlProvenanceState).count > 0 ||
        !detachToolCall(tool, input, toolUseContext)
      )
        return false;
      attached = false;
      detachedStore.letGo(toolUseID);
      detachEarly();
      return true;
    },
  });
  let raceResult;
  try {
    raceResult = await Promise.race([settledPromise, promise]);
  } finally {
    attached = false;
    unregister();
  }
  releaseRelay();
  if (raceResult === "settled" || toolUseContext.abortController.signal.aborted) return await runPromise;
  logEvent("tengu_tool_call_detached", {
    toolName: sanitizeToolNameForAnalytics(tool.name),
  });
  logForDebugging(
    `[detach] ${toolCategoryForTelemetry(tool)} ${toolUseID} moved to the background to deliver a message`,
  );
  let isOnScreen = !toolUseContext.options.isNonInteractiveSession;
  detachedStore.started(
    toolUseID,
    {
      detachedAt: Date.now(),
      tool,
      input,
    },
    (reason) => detachedController.abort(reason),
  );
  let hitCeiling = false;
  let ceilingTimer = setTimeout(() => {
    hitCeiling = true;
    detachedController.abort("detached-ceiling");
  }, DETACHED_CALL_TTL_MS);
  ceilingTimer.unref();
  runPromise
    .finally(() => clearTimeout(ceilingTimer))
    .then((value) => {
      if (detachedController.signal.aborted) throw new AbortError_2();
      return value;
    })
    .then(
      (result) => {
        if (
          !detachedStore.settled(toolUseID, {
            status: "completed",
            settledAt: Date.now(),
            data: result.data,
          })
        ) {
          logFeatureSad("query_tool_detach", "conversation_cleared");
          return;
        }
        return finishDetachedToolCall({
          tool,
          toolUseID,
          toolUseContext,
          result,
          isOnScreen,
          stillHeard: () => detachedStore.getSnapshot().has(toolUseID),
        }).finally(() => detachedStore.resultQueued(toolUseID));
      },
      (error) => {
        let wasUserStopped = !hitCeiling && detachedController.signal.reason === "user-cancel";
        let text = hitCeiling
          ? `The call did not finish within ${DETACHED_CALL_TTL_MS / 60000} minutes and was stopped.`
          : wasUserStopped
            ? "The user stopped this call before it finished."
            : formatToolErrorMessage(error);
        if (
          !detachedStore.settled(toolUseID, {
            status: wasUserStopped ? "stopped" : "failed",
            settledAt: Date.now(),
            text,
          })
        ) {
          logFeatureSad("query_tool_detach", "conversation_cleared");
          return;
        }
        if (
          buildDetachedResultMessage({
            toolName: tool.name,
            toolUseID,
            status: "failed",
            text,
            passive: wasUserStopped,
            isOnScreen,
          }) === "dropped"
        )
          logFeatureBad("query_tool_detach", "notify_failed");
        else
          logFeatureSad(
            "query_tool_detach",
            hitCeiling ? "ceiling" : detachedController.signal.aborted ? "aborted" : "tool_error",
          );
      },
    )
    .catch(logError);
  return {
    data: undefined,
    detached: {
      text: buildStillRunningNotice(tool.name, {
        isOnScreen,
      }),
    },
  };
}
//@ chunk-5xgkngpb.js:3979718-3981195 placement
/**
 * 完成一个后台工具调用：保存结果，过大时落盘或截断，并记录遥测。
 */
async function finishDetachedToolCall({ tool, toolUseID, toolUseContext, result, isOnScreen, stillHeard }) {
  let resultText;
  try {
    let processed = await persistLargeToolResult(
      tool.mapToolResultToToolResultBlockParam(
        tool.stripForCreation?.(result.data) ?? result.data,
        toolUseID,
      ),
      tool,
      toolResultsDirFor_2(toolUseContext.session),
      toolUseContext.storageV5,
    );
    if (!stillHeard()) {
      logFeatureSad("query_tool_detach", "conversation_cleared");
      return;
    }
    resultText = flattenResultText(processed.content);
    if (escapeXml(resultText).length > FOREGROUND_DETACH_DEADLINE_MARGIN_MS) {
      let persistResult = await persistToolResult(
        resultText,
        toolUseID,
        toolResultsDirFor_2(toolUseContext.session),
        toolUseContext.storageV5,
      );
      if (!stillHeard()) {
        logFeatureSad("query_tool_detach", "conversation_cleared");
        return;
      }
      if (isPersistError(persistResult)) {
        buildDetachedResultMessage({
          toolName: tool.name,
          toolUseID,
          status: "failed",
          text: "The call completed, but its result is too large to carry in a notification and could not be saved to a file.",
          passive: false,
          isOnScreen,
        });
        logFeatureBad("query_tool_detach", "oversize_unsaved");
        return;
      }
      resultText = `The result is ${persistResult.originalSize} characters, too large to carry in a notification, so none of it is quoted here. ${persistResult.truncatedAtBytes === undefined ? "All of it" : `Its first ${persistResult.truncatedAtBytes} bytes`} was saved to ${persistResult.filepath}. Read that file to see it.`;
    }
  } catch (error) {
    logError(error);
    if (!stillHeard()) {
      logFeatureSad("query_tool_detach", "conversation_cleared");
      return;
    }
    buildDetachedResultMessage({
      toolName: tool.name,
      toolUseID,
      status: "failed",
      text: "The call completed but its result could not be rendered.",
      passive: false,
      isOnScreen,
    });
    logFeatureBad("query_tool_detach", "render_failed");
    return;
  }
  switch (
    buildDetachedResultMessage({
      toolName: tool.name,
      toolUseID,
      status: "completed",
      text: resultText,
      passive: false,
      isOnScreen,
    })
  ) {
    case "delivered":
      runAfterResultCommitted(result, false, logError);
      logFeatureOk("query_tool_detach");
      break;
    case "degraded":
      logFeatureSad("query_tool_detach", "degraded_notification");
      break;
    case "dropped":
      logFeatureBad("query_tool_detach", "notify_failed");
      break;
  }
}
//@ chunk-5xgkngpb.js:3981195-3981484 placement
function flattenResultText(content) {
  if (content === undefined) return "";
  if (typeof content === "string") return content;
  let texts = [];
  let nonTextCount = 0;
  for (let block of content)
    if (block.type === "text" && typeof block.text === "string") texts.push(block.text);
    else nonTextCount++;
  if (nonTextCount > 0)
    texts.push(
      `[${nonTextCount} non-text ${plural(nonTextCount, "block")} of the result could not be carried in a notification]`,
    );
  return texts.join(`
`);
}
//@ chunk-5xgkngpb.js:3981484-3982870 placement
/**
 * 生成后台工具调用完成后送回模型的消息：说明结果属于哪次调用、照常继续。
 */
function buildDetachedResultMessage({ toolName, toolUseID, status, text, passive, isOnScreen }) {
  let summary =
    status === "completed"
      ? `The ${toolName} call finished; its result follows. ${isOnScreen ? "On the user's screen it just landed in that call's own row, like any tool result. " : ""}Carry on from it as if the tool had just returned: do not announce a notification or a background task. If the user has since said they no longer need this result, do not answer the old request again: correct anything you got wrong in one or two lines, or say nothing new.`
      : `The ${toolName} call ended without a result; what happened follows. ${isOnScreen ? "On the user's screen that call's own row shows how it ended, like any tool error or interrupted call. " : ""}Carry on as if the tool had just returned it: do not announce a notification or a background task.`;
  try {
    enqueuePendingNotification(
      {
        value: formatTaskNotification({
          toolUseId: toolUseID,
          taskType: TOOL_CALL,
          status,
          summary: escapeXml(summary),
          body: `
<result>
${escapeXmlTruncated(text, FOREGROUND_DETACH_DEADLINE_MARGIN_MS)}
</result>`,
        }),
        mode: "task-notification",
        skipAttachments: true,
        priority: "next",
        agentId: mainAgentId(),
        ...(passive && {
          passive: true,
        }),
      },
      {
        turnAttribution: "inherit",
      },
    );
    return "delivered";
  } catch (error) {
    logError(error);
    try {
      enqueuePendingNotification(
        {
          value: formatTaskNotification({
            toolUseId: toolUseID,
            taskType: TOOL_CALL,
            status,
            summary: escapeXml(`${summary} The result could not be rendered.`),
          }),
          mode: "task-notification",
          skipAttachments: true,
          priority: "next",
          agentId: mainAgentId(),
        },
        {
          turnAttribution: "inherit",
        },
      );
      return "degraded";
    } catch (error) {
      logForDebugging(`[detach] degraded notification enqueue failed: ${String(error)}`, {
        level: "error",
      });
      return "dropped";
    }
  }
}
//@ chunk-5xgkngpb.js:3982870-3983553 placement
/**
 * 编辑/写文件后若 PostToolUse 钩子改动了文件，重新同步读文件状态并附加一条提示，提醒下次编辑前可能需要重读。
 */
async function noteHookModifiedFile(toolName, toolUseId, toolInput, context) {
  if (toolName !== EDIT && toolName !== FILE_WRITE_TOOL_NAME) return null;
  if (
    typeof toolInput !== "object" ||
    toolInput === null ||
    !("file_path" in toolInput) ||
    typeof toolInput.file_path !== "string"
  )
    return null;
  let filePath = expandPathOrNull(toolInput.file_path);
  if (filePath === null) return null;
  try {
    if ((await logFileStateResync(context, filePath)) !== "changed") return null;
    logForDebugging(
      `PostToolUse hook modified ${filePath} after ${toolName} \u2014 re-synced readFileState`,
      {
        level: "info",
      },
    );
    return createAttachmentMessage_2({
      type: "hook_additional_context",
      content: [
        `PostToolUse hook modified ${filePath} after your edit (likely a formatter). Your next Edit will not fail with a stale-file error, but if its old_string targets a region the hook reformatted, Read the file first.`,
      ],
      hookName: `PostToolUse:${toolName}`,
      toolUseID: toolUseId,
      hookEvent: "PostToolUse",
    });
  } catch {
    return null;
  }
}
export {
  foregroundCallRegistrySlots,
  detachedCallSlots,
  stopAndDropOutside,
  discardQueuedOutside,
  detachToolCall,
  runDetachableToolCall,
  DETACHED_TOOL_CALL_FLAG,
  noteHookModifiedFile,
  backgroundForegroundCalls,
  canDetachCalls,
  parseTaskNotificationToolUseId,
  hasTaskNotificationToolUseId,
  isDetachedToolResult,
};
