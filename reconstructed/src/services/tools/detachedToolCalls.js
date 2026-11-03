/**
 * services/tools/detachedToolCalls.ts
 *
 * 2.1.316 新增：转入后台继续运行的工具调用（结果稍后送回）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (23)
 * attribution: placement 23
 */
import { TASK_NOTIFICATION, TOOL_USE_ID, TASK_TYPE } from "../../constants/xml.js";
import { createStore } from "../../state/store.js";
import { logForDebugging, createAttachmentMessage_2 } from "../../utils/debug.js";
import { string } from "../../../vendor/zod/v4/classic/schemas.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { isPrintInputClosed, mainAgentId } from "../../bootstrap/state.js";
import { isDetachedToolCallsEnabled } from "../../components/PromptInput/promptFlags.js";
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
  processToolResultBlock,
  toolResultsDirFor_2,
  persistToolResult,
  isPersistError,
} from "../../utils/toolResultStorage.js";
import { escapeXml_2 as escapeXml, escapeXmlTruncated } from "../../utils/confusables.js";
import { plural } from "../../utils/stringUtils.js";
import { enqueuePendingNotification } from "../../utils/messageQueueManager.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { expandPathOrNull } from "../../utils/path.js";
import { logFileStateResync } from "../../utils/readFileInRange.js";

//@ chunk-e6aww6q8.js:2142159-2142179 placement
var TOOL_CALL = "tool_call";
//@ chunk-e6aww6q8.js:2142179-2142796 placement
/**
 * 工具调用被转入后台时返回给模型的说明：调用仍在进行，结果稍后以 task-notification 送达，不要重复、等待或声称已取消。
 */
function buildStillRunningNotice(toolName, { isOnScreen }) {
  return `[Still running. The user sent a message while this call loads, and that message follows so you can answer it now. This ${toolName} call was not interrupted. Its result will be delivered to you on its own, in a later <${TASK_NOTIFICATION}> carrying this tool_use_id. Do not repeat the call, and do not wait, sleep or poll for it. You cannot stop it either, so never say you cancelled or dropped it.${isOnScreen ? " On the user's screen this call simply still shows as in progress: nothing there says it was moved, backgrounded or detached, so do not describe it that way." : ""} If they ask, it is still loading.]`;
}
//@ chunk-e6aww6q8.js:2142796-2142826 placement
/**
 * 结果里标记「该调用已转入后台」的对象。
 */
var DETACHED_TOOL_CALL_FLAG = {
  detachedToolCall: true,
};
//@ chunk-e6aww6q8.js:2142826-2142959 placement
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
//@ chunk-e6aww6q8.js:2142959-2143180 placement
/**
 * 从 task-notification 文本开头解析 tool_use_id（类型须为工具调用），否则返回 null。
 */
function parseTaskNotificationToolUseId(e) {
  let n = `<${TASK_NOTIFICATION}>
<${TOOL_USE_ID}>`;
  if (!e.startsWith(n)) return null;
  let index = e.indexOf(
    `</${TOOL_USE_ID}>
`,
    n.length,
  );
  if (
    index === -1 ||
    !e.startsWith(
      `<${TASK_TYPE}>${TOOL_CALL}</${TASK_TYPE}>
`,
      index +
        `</${TOOL_USE_ID}>
`.length,
    )
  )
    return null;
  return e.slice(n.length, index);
}
//@ chunk-e6aww6q8.js:2143180-2143217 placement
/**
 * 判断调用 id 是否是任务通知形式的（可对应后台调用）。
 */
function hasTaskNotificationToolUseId(e) {
  return parseTaskNotificationToolUseId(e) !== null;
}
//@ chunk-e6aww6q8.js:2143217-2143266 placement
/**
 * 后台调用跟踪的常量：记录存活时长、通知延迟与两张表。
 */
var DETACHED_CALL_TTL_MS = 300000;
var DETACHED_NOTIFICATION_DELAY_MS = 30000;
var detachedCallsById = new Map();
var queuedDetachedNotifications = new Set();
//@ chunk-e6aww6q8.js:2143266-2145458 placement
/**
 * 转入后台继续运行的工具调用对象：跟踪运行、完成、用户取消、对话清空等状态。
 */
class DetachedToolCall {
  #e = createStore(detachedCallsById);
  #t = new Map();
  #n = new Set();
  subscribe = this.#e.subscribe;
  getSnapshot = this.#e.getSnapshot;
  letGo(e) {
    this.#n.add(e);
  }
  ended(e) {
    this.#n.delete(e);
  }
  wasLetGo(e) {
    return this.#n.has(e);
  }
  started(e, n, r) {
    this.#t.set(e, r);
    this.#r(e, {
      status: "running",
      stopRequested: false,
      ...n,
    });
  }
  settled(e, n) {
    this.#t.delete(e);
    let r = this.#e.getSnapshot().get(e);
    if (r === undefined) return false;
    let s = {
      paintedInPlace: false,
      detachedAt: r.detachedAt,
      tool: r.tool,
      input: r.input,
    };
    this.#r(
      e,
      n.status === "completed"
        ? {
            ...n,
            ...s,
            resultQueued: false,
          }
        : {
            ...n,
            ...s,
          },
    );
    return true;
  }
  resultQueued(e) {
    let n = this.#e.getSnapshot().get(e);
    if (n?.status === "completed" && !n.resultQueued)
      this.#r(e, {
        ...n,
        resultQueued: true,
      });
  }
  awaitingResult() {
    let e = [];
    for (let [n, r] of this.#e.getSnapshot())
      if (r.status === "running" || (r.status === "completed" && !r.resultQueued)) e.push(n);
    return e;
  }
  owesResult(e) {
    for (let n of this.#e.getSnapshot().values())
      if (
        n.status === "running"
          ? e - n.detachedAt < DETACHED_CALL_TTL_MS + DETACHED_NOTIFICATION_DELAY_MS
          : n.status === "completed" && !n.resultQueued && e - n.settledAt < DETACHED_NOTIFICATION_DELAY_MS
      )
        return true;
    return false;
  }
  paintedInPlace(e) {
    let n = this.#e.getSnapshot().get(e);
    if (n === undefined || n.status === "running" || n.paintedInPlace) return;
    this.#r(e, {
      ...n,
      paintedInPlace: true,
    });
  }
  stopRunning(e) {
    let filtered = [...this.#t].filter(([r]) => e === undefined || e.has(r));
    if (filtered.length === 0) return 0;
    for (let [r] of filtered) this.#t.delete(r);
    this.#e.setState((r) => {
      let s = new Map(r);
      for (let [h] of filtered) {
        let y = s.get(h);
        if (y?.status === "running")
          s.set(h, {
            ...y,
            stopRequested: true,
          });
      }
      return s;
    });
    for (let [, r] of filtered) r("user-cancel");
    return filtered.length;
  }
  discardAllExcept(e) {
    for (let [r, s] of [...this.#t])
      if (!e.has(r)) {
        this.#t.delete(r);
        s("conversation-cleared");
      }
    let n = new Set();
    this.#e.setState((r) => {
      let s = new Map();
      for (let [h, y] of r)
        if (e.has(h)) s.set(h, y);
        else n.add(h);
      return n.size === 0 ? r : s;
    });
    return n;
  }
  discardAll() {
    this.discardAllExcept(queuedDetachedNotifications);
  }
  discardAllOutside(e) {
    return this.#e.getSnapshot().size === 0 ? queuedDetachedNotifications : this.discardAllExcept(this.#o(e));
  }
  outside(e) {
    let snapshot = this.#e.getSnapshot();
    if (snapshot.size === 0) return queuedDetachedNotifications;
    let r = this.#o(e);
    return new Set([...snapshot.keys()].filter((key) => !r.has(key)));
  }
  #o(e) {
    let snapshot = this.#e.getSnapshot();
    let r = new Set();
    for (let s of e) {
      if (s.type !== "assistant") continue;
      for (let h of s.message.content) if (h.type === "tool_use" && snapshot.has(h.id)) r.add(h.id);
    }
    return r;
  }
  #r(e, n) {
    this.#e.setState((r) => new Map(r).set(e, n));
  }
}
//@ chunk-e6aww6q8.js:2145458-2145485 placement
/**
 * 按会话保存的后台调用跟踪器。
 */
var detachedCallSlots = new SessionRootSlot(() => new DetachedToolCall());
//@ chunk-e6aww6q8.js:2145485-2145555 placement
/**
 * 丢弃指定范围外的后台调用并移除其排队通知。
 */
function discardQueuedOutside(e, messageQueue, r) {
  let s = e.discardAllOutside(r);
  if (s.size > 0) removeQueuedToolNotifications(messageQueue, s);
}
//@ chunk-e6aww6q8.js:2145555-2145650 placement
/**
 * 停止指定范围外的后台调用并移除其排队通知。
 */
function stopAndDropOutside(e, messageQueue, r) {
  let s = e.outside(r);
  if (s.size === 0) return [];
  e.stopRunning(s);
  return removeQueuedToolNotifications(messageQueue, s);
}
//@ chunk-e6aww6q8.js:2145650-2145813 placement
function removeQueuedToolNotifications(e, n) {
  return e.removeByFilter((r) => {
    if (r.mode !== "task-notification" || typeof r.value !== "string") return false;
    let taskNotificationToolUseId = parseTaskNotificationToolUseId(r.value);
    return taskNotificationToolUseId !== null && n.has(taskNotificationToolUseId);
  });
}
//@ chunk-e6aww6q8.js:3878016-3878056 placement
/**
 * 判断工具调用是否可以脱离当前轮次执行。
 */
function canDetachCalls(isNonInteractiveSession) {
  return isNonInteractiveSession && !isPrintInputClosed() && isDetachedToolCallsEnabled();
}
//@ chunk-e6aww6q8.js:3878056-3878157 placement
class ForegroundCallRegistry {
  #e = new Set();
  add(e) {
    this.#e.add(e);
    return () => {
      this.#e.delete(e);
    };
  }
  list() {
    return [...this.#e];
  }
}
//@ chunk-e6aww6q8.js:3878157-3878185 placement
/**
 * 按会话保存的前台调用登记表（用于整体转入后台）。
 */
var foregroundCallRegistrySlots = new SessionRootSlot(() => new ForegroundCallRegistry());
//@ chunk-e6aww6q8.js:3878185-3878387 placement
/**
 * 把当前前台的可转后台调用全部转入后台，返回成功数；单个出错时保留在前台并记日志。
 */
function backgroundForegroundCalls(e) {
  let n = 0;
  for (let r of e)
    try {
      if (r.backgroundNow()) n++;
    } catch (error) {
      logForDebugging(
        `[foreground-tool-calls] moving ${r.toolUseId ?? "a call"} threw; it stays in the foreground`,
        {
          level: "error",
        },
      );
      logError(error);
    }
  return n;
}
//@ chunk-e6aww6q8.js:3878387-3878404 placement
var FOREGROUND_DETACH_DEADLINE_MARGIN_MS = MAX_MERGED_PROMPTS - 2000;
//@ chunk-e6aww6q8.js:3878404-3879073 placement
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
    for (let s of ["PostToolUse", "PostToolUseFailure"])
      if (
        hasToolHookMatching({
          hookEvent: s,
          toolName: tool.name,
          toolInput,
          tools: toolUseContext.options.tools,
          toolAliases: toolUseContext.options.toolAliases,
          sessionHooks: toolUseContext.sessionHooksRegistry,
          sessionId: registerAgent(toolUseContext, s, toolUseContext.session.id),
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
//@ chunk-e6aww6q8.js:3879073-3881146 placement
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
    ? (ze) => {
        if (attached) onProgress(ze);
      }
    : undefined;
  let runPromise = run(
    {
      ...toolUseContext,
      abortController: detachedController,
    },
    forwardProgress,
  );
  let Z = detachedCallSlots.of(toolUseContext.session);
  let settledPromise = runPromise
    .finally(() => Z.ended(toolUseID))
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
      Z.letGo(toolUseID);
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
  Z.started(
    toolUseID,
    {
      detachedAt: Date.now(),
      tool,
      input,
    },
    (ze) => detachedController.abort(ze),
  );
  let hitCeiling = false;
  let ceilingTimer = setTimeout(() => {
    hitCeiling = true;
    detachedController.abort("detached-ceiling");
  }, DETACHED_CALL_TTL_MS);
  ceilingTimer.unref();
  runPromise
    .finally(() => clearTimeout(ceilingTimer))
    .then((ze) => {
      if (detachedController.signal.aborted) throw new AbortError_2();
      return ze;
    })
    .then(
      (ze) => {
        if (
          !Z.settled(toolUseID, {
            status: "completed",
            settledAt: Date.now(),
            data: ze.data,
          })
        ) {
          logFeatureSad("query_tool_detach", "conversation_cleared");
          return;
        }
        return finishDetachedToolCall({
          tool,
          toolUseID,
          toolUseContext,
          result: ze,
          isOnScreen,
          stillHeard: () => Z.getSnapshot().has(toolUseID),
        }).finally(() => Z.resultQueued(toolUseID));
      },
      (error) => {
        let lt = !hitCeiling && detachedController.signal.reason === "user-cancel";
        let text = hitCeiling
          ? `The call did not finish within ${DETACHED_CALL_TTL_MS / 60000} minutes and was stopped.`
          : lt
            ? "The user stopped this call before it finished."
            : formatToolErrorMessage(error);
        if (
          !Z.settled(toolUseID, {
            status: lt ? "stopped" : "failed",
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
            passive: lt,
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
//@ chunk-e6aww6q8.js:3881146-3882623 placement
/**
 * 完成一个后台工具调用：保存结果，过大时落盘或截断，并记录遥测。
 */
async function finishDetachedToolCall({ tool, toolUseID, toolUseContext, result, isOnScreen, stillHeard }) {
  let S;
  try {
    let L = await processToolResultBlock(
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
    S = flattenResultText(L.content);
    if (escapeXml(S).length > FOREGROUND_DETACH_DEADLINE_MARGIN_MS) {
      let G = await persistToolResult(
        S,
        toolUseID,
        toolResultsDirFor_2(toolUseContext.session),
        toolUseContext.storageV5,
      );
      if (!stillHeard()) {
        logFeatureSad("query_tool_detach", "conversation_cleared");
        return;
      }
      if (isPersistError(G)) {
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
      S = `The result is ${G.originalSize} characters, too large to carry in a notification, so none of it is quoted here. ${G.truncatedAtBytes === undefined ? "All of it" : `Its first ${G.truncatedAtBytes} bytes`} was saved to ${G.filepath}. Read that file to see it.`;
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
      text: S,
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
//@ chunk-e6aww6q8.js:3882623-3882912 placement
function flattenResultText(content) {
  if (content === undefined) return "";
  if (typeof content === "string") return content;
  let n = [];
  let r = 0;
  for (let s of content)
    if (s.type === "text" && typeof s.text === "string") n.push(s.text);
    else r++;
  if (r > 0)
    n.push(`[${r} non-text ${plural(r, "block")} of the result could not be carried in a notification]`);
  return n.join(`
`);
}
//@ chunk-e6aww6q8.js:3882912-3884298 placement
/**
 * 生成后台工具调用完成后送回模型的消息：说明结果属于哪次调用、照常继续。
 */
function buildDetachedResultMessage({ toolName, toolUseID, status, text, passive, isOnScreen }) {
  let S =
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
          summary: escapeXml(S),
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
            summary: escapeXml(`${S} The result could not be rendered.`),
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
//@ chunk-e6aww6q8.js:3884298-3884981 placement
/**
 * 编辑/写文件后若 PostToolUse 钩子改动了文件，重新同步读文件状态并附加一条提示，提醒下次编辑前可能需要重读。
 */
async function noteHookModifiedFile(toolName, toolUseId, toolInput, context) {
  if (toolName !== FILE_EDIT_TOOL_NAME && toolName !== FILE_WRITE_TOOL_NAME) return null;
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
  backgroundForegroundCalls,
  discardQueuedOutside,
  detachedCallSlots,
  stopAndDropOutside,
  parseTaskNotificationToolUseId,
  hasTaskNotificationToolUseId,
  isDetachedToolResult,
  detachToolCall,
  runDetachableToolCall,
  DETACHED_TOOL_CALL_FLAG,
  noteHookModifiedFile,
  canDetachCalls,
};
