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
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { isPrintInputClosed, mainAgentId } from "../../bootstrap/state.js";
import { FFo } from "../../components/PromptInput/promptFlags.js";
import { logError } from "../../utils/log.js";
import { Z9t } from "../../constants/outputLimits.js";
import { getToolBackgrounding, runAfterResultCommitted } from "../../Tool.js";
import { uf } from "../../tools/AgentTool/backgroundGates.js";
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
  toolResultsDirFor,
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
/**
 * 工具调用被转入后台时返回给模型的说明：调用仍在进行，结果稍后以 task-notification 送达，不要重复、等待或声称已取消。
 */
//@ chunk-e6aww6q8.js:2142179-2142796 placement
function buildStillRunningNotice(toolName, { isOnScreen: isOnScreen }) {
  return `[Still running. The user sent a message while this call loads, and that message follows so you can answer it now. This ${toolName} call was not interrupted. Its result will be delivered to you on its own, in a later <${TASK_NOTIFICATION}> carrying this tool_use_id. Do not repeat the call, and do not wait, sleep or poll for it. You cannot stop it either, so never say you cancelled or dropped it.${isOnScreen ? " On the user's screen this call simply still shows as in progress: nothing there says it was moved, backgrounded or detached, so do not describe it that way." : ""} If they ask, it is still loading.]`;
}
//@ chunk-e6aww6q8.js:2142796-2142826 placement
var zsn = { detachedToolCall: !0 };
/**
 * 工具调用是否以分离方式转入后台（backgrounding=detach 且结果标记 detachedToolCall）。
 */
//@ chunk-e6aww6q8.js:2142826-2142959 placement
function isDetachedToolResult(e, n) {
  return (
    e?.backgrounding === "detach" &&
    typeof n === "object" &&
    n !== null &&
    "detachedToolCall" in n &&
    n.detachedToolCall === !0
  );
}
/**
 * 从 task-notification 文本开头解析 tool_use_id（类型须为工具调用），否则返回 null。
 */
//@ chunk-e6aww6q8.js:2142959-2143180 placement
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
function _Wr(e) {
  return parseTaskNotificationToolUseId(e) !== null;
}
//@ chunk-e6aww6q8.js:2143217-2143266 placement
var GTe = 300000,
  qsn = 30000,
  cir = new Map(),
  x8e = new Set();
/**
 * 转入后台继续运行的工具调用对象：跟踪运行、完成、用户取消、对话清空等状态。
 */
//@ chunk-e6aww6q8.js:2143266-2145458 placement
class DetachedToolCall {
  #e = createStore(cir);
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
    (this.#t.set(e, r), this.#r(e, { status: "running", stopRequested: !1, ...n }));
  }
  settled(e, n) {
    this.#t.delete(e);
    let r = this.#e.getSnapshot().get(e);
    if (r === void 0) return !1;
    let s = { paintedInPlace: !1, detachedAt: r.detachedAt, tool: r.tool, input: r.input };
    return (this.#r(e, n.status === "completed" ? { ...n, ...s, resultQueued: !1 } : { ...n, ...s }), !0);
  }
  resultQueued(e) {
    let n = this.#e.getSnapshot().get(e);
    if (n?.status === "completed" && !n.resultQueued) this.#r(e, { ...n, resultQueued: !0 });
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
          ? e - n.detachedAt < GTe + qsn
          : n.status === "completed" && !n.resultQueued && e - n.settledAt < qsn
      )
        return !0;
    return !1;
  }
  paintedInPlace(e) {
    let n = this.#e.getSnapshot().get(e);
    if (n === void 0 || n.status === "running" || n.paintedInPlace) return;
    this.#r(e, { ...n, paintedInPlace: !0 });
  }
  stopRunning(e) {
    let filtered = [...this.#t].filter(([r]) => e === void 0 || e.has(r));
    if (filtered.length === 0) return 0;
    for (let [r] of filtered) this.#t.delete(r);
    this.#e.setState((r) => {
      let s = new Map(r);
      for (let [h] of filtered) {
        let y = s.get(h);
        if (y?.status === "running") s.set(h, { ...y, stopRequested: !0 });
      }
      return s;
    });
    for (let [, r] of filtered) r("user-cancel");
    return filtered.length;
  }
  discardAllExcept(e) {
    for (let [r, s] of [...this.#t]) if (!e.has(r)) (this.#t.delete(r), s("conversation-cleared"));
    let n = new Set();
    return (
      this.#e.setState((r) => {
        let s = new Map();
        for (let [h, y] of r)
          if (e.has(h)) s.set(h, y);
          else n.add(h);
        return n.size === 0 ? r : s;
      }),
      n
    );
  }
  discardAll() {
    this.discardAllExcept(x8e);
  }
  discardAllOutside(e) {
    return this.#e.getSnapshot().size === 0 ? x8e : this.discardAllExcept(this.#o(e));
  }
  outside(e) {
    let snapshot = this.#e.getSnapshot();
    if (snapshot.size === 0) return x8e;
    let r = this.#o(e);
    return new Set([...snapshot.keys()].filter((s) => !r.has(s)));
  }
  #o(e) {
    let snapshot = this.#e.getSnapshot(),
      r = new Set();
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
var kT = new SessionRootSlot(() => new DetachedToolCall());
//@ chunk-e6aww6q8.js:2145485-2145555 placement
function B9n(e, n, r) {
  let discardAllOutside = e.discardAllOutside(r);
  if (discardAllOutside.size > 0) removeQueuedToolNotifications(n, discardAllOutside);
}
//@ chunk-e6aww6q8.js:2145555-2145650 placement
function t6s(e, n, r) {
  let outside = e.outside(r);
  if (outside.size === 0) return [];
  return (e.stopRunning(outside), removeQueuedToolNotifications(n, outside));
}
//@ chunk-e6aww6q8.js:2145650-2145813 placement
function removeQueuedToolNotifications(e, n) {
  return e.removeByFilter((r) => {
    if (r.mode !== "task-notification" || typeof r.value !== "string") return !1;
    let s = parseTaskNotificationToolUseId(r.value);
    return s !== null && n.has(s);
  });
}
//@ chunk-e6aww6q8.js:3878016-3878056 placement
function v1r(e) {
  return e && !isPrintInputClosed() && FFo();
}
//@ chunk-e6aww6q8.js:3878056-3878157 placement
class ForegroundCallRegistry {
  #e = new Set();
  add(e) {
    return (
      this.#e.add(e),
      () => {
        this.#e.delete(e);
      }
    );
  }
  list() {
    return [...this.#e];
  }
}
//@ chunk-e6aww6q8.js:3878157-3878185 placement
var Q_e = new SessionRootSlot(() => new ForegroundCallRegistry());
/**
 * 把当前前台的可转后台调用全部转入后台，返回成功数；单个出错时保留在前台并记日志。
 */
//@ chunk-e6aww6q8.js:3878185-3878387 placement
function backgroundForegroundCalls(e) {
  let n = 0;
  for (let r of e)
    try {
      if (r.backgroundNow()) n++;
    } catch (error) {
      (logForDebugging(
        `[foreground-tool-calls] moving ${r.toolUseId ?? "a call"} threw; it stays in the foreground`,
        { level: "error" },
      ),
        logError(error));
    }
  return n;
}
//@ chunk-e6aww6q8.js:3878387-3878404 placement
var k$n = Z9t - 2000;
/**
 * 把正在运行的工具调用转入后台继续，并触发相应钩子。
 */
//@ chunk-e6aww6q8.js:3878404-3879073 placement
function detachToolCall(e, n, r) {
  try {
    if (
      getToolBackgrounding(e) !== "detach" ||
      r.agentId !== void 0 ||
      r.innerCall === !0 ||
      r.remoteCall !== void 0 ||
      (r.options.isNonInteractiveSession && !v1r(!0)) ||
      uf() ||
      !getFeatureValue_CACHED_MAY_BE_STALE("tengu_tool_detach", !0)
    )
      return !1;
    for (let s of ["PostToolUse", "PostToolUseFailure"])
      if (
        hasToolHookMatching({
          hookEvent: s,
          toolName: e.name,
          toolInput: n,
          tools: r.options.tools,
          toolAliases: r.options.toolAliases,
          sessionHooks: r.sessionHooksRegistry,
          sessionId: registerAgent(r, s, r.session.id),
        })
      )
        return !1;
    return !(
      hasSettingsHookForEvent(
        "PostToolBatch",
        r.sessionHooksRegistry,
        registerAgent(r, "PostToolBatch", r.session.id),
      ) ||
      dispatchClassicEvent("PostToolBatch") ||
      hasModuleHookingSite("tool.call", { tool: e.name })
    );
  } catch (error) {
    return (
      logForDebugging(`[detach] ${toolCategoryForTelemetry(e)}: the gate threw, so the call runs inline`, {
        level: "error",
      }),
      logError(error),
      !1
    );
  }
}
/**
 * 以可分离方式运行工具调用：注册"立即转后台"回调；用户发消息时若可分离则立即返回仍在运行的说明，调用在后台继续（有时限），完成或失败后经通知送回结果并记录事件。
 */
//@ chunk-e6aww6q8.js:3879073-3881146 placement
async function runDetachableToolCall({
  tool: tool,
  input: input,
  toolUseID: toolUseID,
  toolUseContext: toolUseContext,
  onProgress: onProgress,
  run: run,
}) {
  let detachedController = createAbortController(),
    releaseRelay = attachDetachableAbortRelay(toolUseContext.abortController, detachedController),
    attached = !0;
  detachedController.signal.addEventListener(
    "abort",
    () => {
      if (attached && !toolUseContext.abortController.signal.aborted)
        toolUseContext.abortController.abort(detachedController.signal.reason);
    },
    { once: !0 },
  );
  let forwardProgress = onProgress
      ? (ze) => {
          if (attached) onProgress(ze);
        }
      : void 0,
    runPromise = run({ ...toolUseContext, abortController: detachedController }, forwardProgress),
    of = kT.of(toolUseContext.session),
    settledPromise = runPromise
      .finally(() => of.ended(toolUseID))
      .then(
        () => "settled",
        () => "settled",
      ),
    detachEarly = () => {},
    promise = new Promise((ze) => {
      detachEarly = () => ze("early");
    }),
    unregister = Q_e.of(toolUseContext.session).add({
      toolUseId: toolUseID,
      backgroundNow: () => {
        if (
          !attached ||
          toolUseContext.abortController.signal.aborted ||
          toolUseContext.toolState.get(UrlProvenanceState).count > 0 ||
          !detachToolCall(tool, input, toolUseContext)
        )
          return !1;
        return ((attached = !1), of.letGo(toolUseID), detachEarly(), !0);
      },
    }),
    raceResult;
  try {
    raceResult = await Promise.race([settledPromise, promise]);
  } finally {
    ((attached = !1), unregister());
  }
  if ((releaseRelay(), raceResult === "settled" || toolUseContext.abortController.signal.aborted))
    return await runPromise;
  (logEvent("tengu_tool_call_detached", { toolName: sanitizeToolNameForAnalytics(tool.name) }),
    logForDebugging(
      `[detach] ${toolCategoryForTelemetry(tool)} ${toolUseID} moved to the background to deliver a message`,
    ));
  let isOnScreen = !toolUseContext.options.isNonInteractiveSession;
  of.started(toolUseID, { detachedAt: Date.now(), tool: tool, input: input }, (ze) =>
    detachedController.abort(ze),
  );
  let hitCeiling = !1,
    ceilingTimer = setTimeout(() => {
      ((hitCeiling = !0), detachedController.abort("detached-ceiling"));
    }, GTe);
  return (
    ceilingTimer.unref(),
    runPromise
      .finally(() => clearTimeout(ceilingTimer))
      .then((ze) => {
        if (detachedController.signal.aborted) throw new AbortError_2();
        return ze;
      })
      .then(
        (ze) => {
          if (!of.settled(toolUseID, { status: "completed", settledAt: Date.now(), data: ze.data })) {
            logFeatureSad("query_tool_detach", "conversation_cleared");
            return;
          }
          return finishDetachedToolCall({
            tool: tool,
            toolUseID: toolUseID,
            toolUseContext: toolUseContext,
            result: ze,
            isOnScreen: isOnScreen,
            stillHeard: () => of.getSnapshot().has(toolUseID),
          }).finally(() => of.resultQueued(toolUseID));
        },
        (ze) => {
          let lt = !hitCeiling && detachedController.signal.reason === "user-cancel",
            Je = hitCeiling
              ? `The call did not finish within ${GTe / 60000} minutes and was stopped.`
              : lt
                ? "The user stopped this call before it finished."
                : formatToolErrorMessage(ze);
          if (
            !of.settled(toolUseID, { status: lt ? "stopped" : "failed", settledAt: Date.now(), text: Je })
          ) {
            logFeatureSad("query_tool_detach", "conversation_cleared");
            return;
          }
          if (
            buildDetachedResultMessage({
              toolName: tool.name,
              toolUseID: toolUseID,
              status: "failed",
              text: Je,
              passive: lt,
              isOnScreen: isOnScreen,
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
      .catch(logError),
    { data: void 0, detached: { text: buildStillRunningNotice(tool.name, { isOnScreen: isOnScreen }) } }
  );
}
/**
 * 完成一个后台工具调用：保存结果，过大时落盘或截断，并记录遥测。
 */
//@ chunk-e6aww6q8.js:3881146-3882623 placement
async function finishDetachedToolCall({
  tool: tool,
  toolUseID: toolUseID,
  toolUseContext: toolUseContext,
  result: s,
  isOnScreen: isOnScreen,
  stillHeard: stillHeard,
}) {
  let S;
  try {
    let L = await processToolResultBlock(
      tool.mapToolResultToToolResultBlockParam(tool.stripForCreation?.(s.data) ?? s.data, toolUseID),
      tool,
      toolResultsDirFor(toolUseContext.session),
      toolUseContext.storageV5,
    );
    if (!stillHeard()) {
      logFeatureSad("query_tool_detach", "conversation_cleared");
      return;
    }
    if (((S = flattenResultText(L.content)), escapeXml(S).length > k$n)) {
      let G = await persistToolResult(
        S,
        toolUseID,
        toolResultsDirFor(toolUseContext.session),
        toolUseContext.storageV5,
      );
      if (!stillHeard()) {
        logFeatureSad("query_tool_detach", "conversation_cleared");
        return;
      }
      if (isPersistError(G)) {
        (buildDetachedResultMessage({
          toolName: tool.name,
          toolUseID: toolUseID,
          status: "failed",
          text: "The call completed, but its result is too large to carry in a notification and could not be saved to a file.",
          passive: !1,
          isOnScreen: isOnScreen,
        }),
          logFeatureBad("query_tool_detach", "oversize_unsaved"));
        return;
      }
      S = `The result is ${G.originalSize} characters, too large to carry in a notification, so none of it is quoted here. ${G.truncatedAtBytes === void 0 ? "All of it" : `Its first ${G.truncatedAtBytes} bytes`} was saved to ${G.filepath}. Read that file to see it.`;
    }
  } catch (error) {
    if ((logError(error), !stillHeard())) {
      logFeatureSad("query_tool_detach", "conversation_cleared");
      return;
    }
    (buildDetachedResultMessage({
      toolName: tool.name,
      toolUseID: toolUseID,
      status: "failed",
      text: "The call completed but its result could not be rendered.",
      passive: !1,
      isOnScreen: isOnScreen,
    }),
      logFeatureBad("query_tool_detach", "render_failed"));
    return;
  }
  switch (
    buildDetachedResultMessage({
      toolName: tool.name,
      toolUseID: toolUseID,
      status: "completed",
      text: S,
      passive: !1,
      isOnScreen: isOnScreen,
    })
  ) {
    case "delivered":
      (runAfterResultCommitted(s, !1, logError), logFeatureOk("query_tool_detach"));
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
function flattenResultText(e) {
  if (e === void 0) return "";
  if (typeof e === "string") return e;
  let n = [],
    r = 0;
  for (let s of e)
    if (s.type === "text" && typeof s.text === "string") n.push(s.text);
    else r++;
  if (r > 0)
    n.push(`[${r} non-text ${plural(r, "block")} of the result could not be carried in a notification]`);
  return n.join(`
`);
}
/**
 * 生成后台工具调用完成后送回模型的消息：说明结果属于哪次调用、照常继续。
 */
//@ chunk-e6aww6q8.js:3882912-3884298 placement
function buildDetachedResultMessage({
  toolName: toolName,
  toolUseID: toolUseID,
  status: status,
  text: text,
  passive: passive,
  isOnScreen: isOnScreen,
}) {
  let S =
    status === "completed"
      ? `The ${toolName} call finished; its result follows. ${isOnScreen ? "On the user's screen it just landed in that call's own row, like any tool result. " : ""}Carry on from it as if the tool had just returned: do not announce a notification or a background task. If the user has since said they no longer need this result, do not answer the old request again: correct anything you got wrong in one or two lines, or say nothing new.`
      : `The ${toolName} call ended without a result; what happened follows. ${isOnScreen ? "On the user's screen that call's own row shows how it ended, like any tool error or interrupted call. " : ""}Carry on as if the tool had just returned it: do not announce a notification or a background task.`;
  try {
    return (
      enqueuePendingNotification(
        {
          value: formatTaskNotification({
            toolUseId: toolUseID,
            taskType: TOOL_CALL,
            status: status,
            summary: escapeXml(S),
            body: `
<result>
${escapeXmlTruncated(text, k$n)}
</result>`,
          }),
          mode: "task-notification",
          skipAttachments: !0,
          priority: "next",
          agentId: mainAgentId(),
          ...(passive && { passive: !0 }),
        },
        { turnAttribution: "inherit" },
      ),
      "delivered"
    );
  } catch (error) {
    logError(error);
    try {
      return (
        enqueuePendingNotification(
          {
            value: formatTaskNotification({
              toolUseId: toolUseID,
              taskType: TOOL_CALL,
              status: status,
              summary: escapeXml(`${S} The result could not be rendered.`),
            }),
            mode: "task-notification",
            skipAttachments: !0,
            priority: "next",
            agentId: mainAgentId(),
          },
          { turnAttribution: "inherit" },
        ),
        "degraded"
      );
    } catch (error) {
      return (
        logForDebugging(`[detach] degraded notification enqueue failed: ${String(error)}`, {
          level: "error",
        }),
        "dropped"
      );
    }
  }
}
/**
 * 编辑/写文件后若 PostToolUse 钩子改动了文件，重新同步读文件状态并附加一条提示，提醒下次编辑前可能需要重读。
 */
//@ chunk-e6aww6q8.js:3884298-3884981 placement
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
    return (
      logForDebugging(
        `PostToolUse hook modified ${filePath} after ${toolName} \u2014 re-synced readFileState`,
        { level: "info" },
      ),
      createAttachmentMessage_2({
        type: "hook_additional_context",
        content: [
          `PostToolUse hook modified ${filePath} after your edit (likely a formatter). Your next Edit will not fail with a stale-file error, but if its old_string targets a region the hook reformatted, Read the file first.`,
        ],
        hookName: `PostToolUse:${toolName}`,
        toolUseID: toolUseId,
        hookEvent: "PostToolUse",
      })
    );
  } catch {
    return null;
  }
}

export {
  Q_e,
  backgroundForegroundCalls,
  B9n,
  kT,
  t6s,
  parseTaskNotificationToolUseId,
  _Wr,
  isDetachedToolResult,
  detachToolCall,
  runDetachableToolCall,
  zsn,
  noteHookModifiedFile,
  v1r,
};
