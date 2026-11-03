/**
 * query/turnHooks.ts
 *
 * 2.1.316 新增。查询循环中的 turn.step/turn.complete 插件钩子执行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0h4e7gnq.js (65)
 * attribution: placement 65
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
} from "crypto";
import { ge } from "../utils/identity.js";
import { to } from "../utils/valueSlot.js";
import { pu } from "../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import {
  extractTextContent_2,
  createSystemMessage,
  createAssistantMessage,
  isAbandonedOrUnsignedThinkingMessage,
  isForeignModelMessage,
  normalizeContentFromAPI,
} from "../utils/messages.js";
import { logForDebugging } from "../utils/debug.js";
import { toError, isAbortError, withTelemetryMessage, AbortError, errorMessage } from "../utils/errors.js";
import { hookMembersFor } from "../plugins/functionHooks/hookDispatch.js";
import { CW, Vtt } from "../utils/messages/nonUserMessages.js";
import { finalContextTokensFromLastResponse } from "../cli/print.js";
import { getTokenUsage } from "../utils/tokens.js";
import { getTokenCountFromUsage_3 } from "../plugins/functionHooks/api/operations.js";
import { isPlainObject as isPlainObject_2 } from "../utils/isPlainObject.js";
import { logError } from "../utils/log.js";
import { STOP_REASONS } from "../plugins/functionHooks/sites/turnSites.js";
import { resolveModelAliasSpelling } from "../utils/model/model.js";
import { isPermittedByOrgModelPolicy } from "../utils/model/defaultModel.js";
import { emit } from "../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { resolveEffortValue } from "../utils/effort.js";
import { resolveLoopEffort } from "../utils/permissions/permissionSetup.js";
import { isMainConversationContext, isDelegatedObservationContext } from "../utils/agentContext.js";
import { vbe, G1o, W1o, ZNi, release_2 } from "../plugins/functionHooks/personHold.js";
import { hasModuleHookingSite } from "../plugins/hooksModules/loadedModuleFilters.js";
import { G1r, Jue } from "../plugins/functionHooks/eventCatalog.js";
import { safeParseJSON } from "../utils/json.js";
import { uniq } from "../utils/collections.js";
import { convertStreamEvent, deltaEventForKind } from "../remote/sdkMessageAdapter.js";
import { isNonConversationMessage } from "../bootstrap/sessionSlices.js";
import { Bn } from "../utils/model/modelIds.js";
import { isBatchToolsUse } from "../services/tools/batchTools.js";
import { normalizeToolInput_2 } from "../utils/api.js";
import { sleep } from "../utils/sleep.js";
import { sumUsages } from "../tools/AgentTool/agentToolUtils.js";
import { logModsFirstTurn } from "../plugins/functionHooks/modLoadTelemetry.js";
import { holdAgentConversation } from "../plugins/functionHooks/sessionApi.js";

/**
 * 队列命令附件带 source_uuid 时，把消息列表里对应的源消息复制一份并把 uuid 换成附件的 uuid（返回新数组）；找不到时返回 undefined。
 */
//@ chunk-0h4e7gnq.js:6211-6439 placement
function retagQueuedCommandSource(e, n) {
  if (n.type !== "attachment" || n.attachment.type !== "queued_command") return;
  let source_uuid = n.attachment.source_uuid,
    y = source_uuid === void 0 ? -1 : e.findLastIndex((S) => S.uuid === source_uuid),
    r = e[y];
  return r === void 0 ? void 0 : e.with(y, { ...r, uuid: n.uuid });
}
//@ chunk-0h4e7gnq.js:6476-6512 placement
var Ixo = ge(to(), (e) => e.set(void 0));
//@ chunk-0h4e7gnq.js:6512-6652 placement
function sliceTurnMessages(e, n) {
  let s = (r) => (r === void 0 ? -1 : e.findIndex((S) => S.uuid === r)),
    y = n.next ? s(n.next.before) : e.length;
  return e.slice(s(n.before) + 1, y + 1);
}
//@ chunk-0h4e7gnq.js:6652-6802 placement
function turnEndedWithApiError(e, n) {
  let last = sliceTurnMessages(e.getSnapshot(), n).findLast((y) => y.type === "assistant" && !y.isVirtual);
  return last?.type === "assistant" && last.isApiErrorMessage === !0;
}
//@ chunk-0h4e7gnq.js:6802-6912 placement
function createSessionMeasurer() {
  let e = pu();
  return { setSessionMeasurer: e.set, measureSession: (n) => e.get()?.(n) ?? Promise.resolve() };
}
//@ chunk-0h4e7gnq.js:6912-6924 placement
var an = createSessionMeasurer();
//@ chunk-0h4e7gnq.js:6924-6950 placement
var measureSession = an.measureSession;
//@ chunk-0h4e7gnq.js:6950-6980 placement
var setSessionMeasurer = an.setSessionMeasurer;
//@ chunk-0h4e7gnq.js:6980-7254 placement
function lastAssistantMessageForTurnComplete(e, n) {
  try {
    let last = sliceTurnMessages(e.getSnapshot(), n).findLast(
      (r) => r.type === "assistant" && !r.isApiErrorMessage && !r.isVirtual,
    );
    return last?.type === "assistant"
      ? extractTextContent_2(
          last.message.content,
          `
`,
        ).trim()
      : "";
  } catch (error) {
    return (
      logForDebugging("turn.complete: could not read the final message: " + toError(error).message),
      ""
    );
  }
}
//@ chunk-0h4e7gnq.js:7254-7390 placement
function createCounterMap() {
  let e = new Map();
  return {
    next: (n) => {
      let s = e.get(n) ?? 0;
      return (e.set(n, s + 1), s);
    },
    forget: (n) => {
      e.delete(n);
    },
    clear: () => {
      e.clear();
    },
  };
}
//@ chunk-0h4e7gnq.js:7390-7423 placement
var Ho = ge(createCounterMap(), (e) => {
  e.clear();
});
//@ chunk-0h4e7gnq.js:7423-7515 placement
var or = (e) =>
  createSystemMessage(
    `${hookMembersFor("turn.complete")
      .map((n) => CW(n.name))
      .join("+")}: ${Vtt(e)}`,
    "notice",
  );
//@ chunk-0h4e7gnq.js:7515-7611 placement
var Nn = (e, n, s) =>
  e ? { reason: "aborted" } : n ? { reason: "refusal", refusal: n } : { reason: s ? "error" : "answer" };
//@ chunk-0h4e7gnq.js:7611-7981 placement
function refusalSystemMessage(e) {
  if (e.type === "system")
    return e.subtype === "model_refusal_no_fallback"
      ? { category: e.apiRefusalCategory ?? null, explanation: e.apiRefusalExplanation ?? null }
      : void 0;
  return e.type === "assistant" && e.isApiErrorMessage === !0 && e.message.stop_reason === "refusal"
    ? {
        category: e.message.stop_details?.category ?? null,
        explanation: e.message.stop_details?.explanation ?? null,
      }
    : void 0;
}
//@ chunk-0h4e7gnq.js:7981-8161 placement
function getTurnRefusal(e, n) {
  try {
    return sliceTurnMessages(e.getSnapshot(), n)
      .flatMap((s) => {
        let y = refusalSystemMessage(s);
        return y ? [y] : [];
      })
      .at(-1);
  } catch (error) {
    logForDebugging("turn.complete: could not read the refusal: " + toError(error).message);
    return;
  }
}
//@ chunk-0h4e7gnq.js:8501-8717 placement
function getAssistantTokenUsage(e) {
  if (e.type !== "assistant") return;
  let n = e.isUnmetered === !0,
    s = n ? finalContextTokensFromLastResponse(e.message.usage) : getTokenUsage(e);
  if (s === void 0) return;
  let y = getTokenCountFromUsage_3(s);
  return n && Object.values(y).every((S) => S === 0) ? void 0 : { ...y, model: e.message.model };
}
//@ chunk-0h4e7gnq.js:8717-8853 placement
function isAssistantContentMessage(e) {
  if (!isPlainObject_2(e) || e.type !== "assistant") return !1;
  let { message: message } = e;
  return isPlainObject_2(message) && Array.isArray(message.content) && e.isApiErrorMessage !== !0;
}
//@ chunk-0h4e7gnq.js:8853-9138 placement
function streamingFallbackRetraction(e, n) {
  try {
    if (!isPlainObject_2(n)) return e;
    if (n.type === "streaming_fallback_began") return [];
    let { discardedMessages: discardedMessages } = n;
    if (!(n.type === "server_fallback" && Array.isArray(discardedMessages))) return e;
    let r = new Set(discardedMessages.map((S) => isPlainObject_2(S) && S.uuid));
    return e.filter((S) => !r.has(S.uuid));
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return e;
  }
}
//@ chunk-0h4e7gnq.js:9138-9342 placement
function snapshotAssistantReply(e) {
  let { uuid: uuid, timestamp: timestamp } = e,
    { content: content } = e.message;
  try {
    return { uuid: uuid, timestamp: timestamp, content: structuredClone(content), reply: e };
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return { uuid: uuid, timestamp: timestamp, content: [...content], reply: e };
  }
}
//@ chunk-0h4e7gnq.js:9342-9381 placement
var $n = (e) => STOP_REASONS.find((n) => n === e) ?? null;
//@ chunk-0h4e7gnq.js:9381-9434 placement
function jn(e) {
  return (e === void 0 ? void 0 : getAssistantTokenUsage(e)) ?? null;
}
/**
 * 维护服务端工具调用表：遇到 server_tool_use/mcp_tool_use 时记下开始时间，遇到对应结果块时补上结束时间；出错时返回原表。
 */
//@ chunk-0h4e7gnq.js:9434-9810 placement
function trackServerToolUse(e, n, s) {
  try {
    let y = Date.parse(s) || Date.now();
    if (n.type === "server_tool_use" || n.type === "mcp_tool_use") {
      let { id: id, name: k, input: input } = n;
      return e.has(id) ? e : new Map([...e, [id, { id: id, name: k, input: input, startedAt: y }]]);
    }
    let r = "tool_use_id" in n ? e.get(n.tool_use_id) : void 0;
    return r !== void 0 && r.endedAt === void 0 ? new Map([...e, [r.id, { ...r, endedAt: y }]]) : e;
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return e;
  }
}
/**
 * 收集一次 turn.step 请求的助手回复：note 记录每条回复（流式回退时撤回），result 汇总出回答文本、工具调用、服务端工具调用、停止原因与用量。
 */
//@ chunk-0h4e7gnq.js:9810-10289 placement
function createStepResultCollector() {
  let e = [];
  return {
    note: (n) => {
      e = isAssistantContentMessage(n)
        ? [...e, snapshotAssistantReply(n)]
        : streamingFallbackRetraction(e, n);
    },
    result: (n, s) => {
      let y = e.at(-1)?.reply,
        flattened = e.flatMap((h) => h.content),
        reduced = e.reduce(
          (h, k) => k.content.reduce((w, x) => trackServerToolUse(w, x, k.timestamp), h),
          new Map(),
        );
      return {
        turnId: n,
        index: s,
        answer: flattened
          .flatMap((h) => (h.type === "text" ? [h.text] : []))
          .join(
            `
`,
          )
          .trim(),
        toolUses: flattened.flatMap((h) => (h.type === "tool_use" ? [{ name: h.name, input: h.input }] : [])),
        ...(reduced.size > 0 && { serverToolUses: [...reduced.values()] }),
        stopReason: $n(y?.message.stop_reason),
        usage: jn(y),
      };
    },
  };
}
//@ chunk-0h4e7gnq.js:10289-10597 placement
function warnTurnStepModelNotAllowed(e, n) {
  if (e === n) return n;
  let s = resolveModelAliasSpelling(e);
  if (isPermittedByOrgModelPolicy(e) && isPermittedByOrgModelPolicy(s)) return s;
  let r = `turn.step: model ${e} is not allowed by policy; the request keeps ${n}`;
  return (
    logForDebugging(r, { level: "warn" }),
    emit({
      plugin: "turn.step hooks",
      event: "turn.step",
      reason: r,
      effect: "the engine sent the request to its own model",
      hasOverrun: !1,
    }),
    n
  );
}
//@ chunk-0h4e7gnq.js:10597-10708 placement
function toStepBlockKind(e) {
  switch (e) {
    case "text":
    case "thinking":
      return e;
    case "tool_use":
      return "tool";
    default:
      return "other";
  }
}
//@ chunk-0h4e7gnq.js:10708-10820 placement
function getOrCreateBlockState(e, n, s) {
  let y = e.blocks.get(n) ?? { kind: s, tool: void 0, text: "", record: void 0 };
  return (e.blocks.set(n, y), y);
}
//@ chunk-0h4e7gnq.js:10820-11900 placement
function collectTurnStepBlocks() {
  let e = new Map(),
    n = new Map(),
    s = new Map(),
    y;
  function r() {
    return (
      (y = { ordinal: (y?.ordinal ?? 0) + 1, isStreamed: !1, blocks: new Map(), stop: void 0, isClosed: !1 }),
      y
    );
  }
  let S = () => y ?? r();
  function h(k) {
    if (isAssistantContentMessage(k)) {
      let apiBlockIndex = k.apiBlockIndex;
      if (apiBlockIndex !== void 0) getOrCreateBlockState(S(), apiBlockIndex, "other").record = k;
      return;
    }
    if (k.type === "streaming_fallback_began") {
      ((S().isClosed = !0), r());
      return;
    }
    if (k.type !== "stream_event") return;
    let { event: event } = k;
    if (event.type === "message_start") r().isStreamed = !0;
    if (event.type === "message_stop") S().isClosed = !0;
    if (event.type === "content_block_start") {
      let content_block = event.content_block,
        L = getOrCreateBlockState(S(), event.index, toStepBlockKind(content_block.type));
      if (content_block.type === "tool_use") L.tool = { id: content_block.id, name: content_block.name };
    }
  }
  return {
    hold: (k) => {
      let w = e.size + 1;
      return (e.set(w, k), h(k), s.set(w, S()), w);
    },
    read: (k) => (k === void 0 ? void 0 : e.get(k)),
    filed: (k, w) => {
      n.set(k, w);
      let x = s.get(k) ?? S();
      switch (w.kind) {
        case "text":
        case "thinking":
          getOrCreateBlockState(x, w.index, w.kind).text += w.text;
          return;
        case "input":
          getOrCreateBlockState(x, w.index, "tool").text += w.json;
          return;
        case "stop":
          ((x.stop = { ...w, usage: w.usage && { ...w.usage } }), n.set(k, x.stop));
          return;
        default:
      }
    },
    sent: (k) => (k === void 0 ? void 0 : n.get(k)),
    responseOf: (k) => (k === void 0 ? void 0 : s.get(k)),
    latest: () => y,
  };
}
/**
 * 恢复被截断的思考时请求必须保持原模型：写警告日志并向插件诊断上报"模型改写从下一次请求才生效"。
 */
//@ chunk-0h4e7gnq.js:11900-12192 placement
function warnResumeKeepsModel(e) {
  let n = `turn.step: a request resuming a truncated thought keeps its model ${e}; a model rewrite applies from the next request`;
  (logForDebugging(n, { level: "warn" }),
    emit({
      plugin: "turn.step hooks",
      event: "turn.step",
      reason: n,
      effect: "the engine sent the request as the thought began",
      hasOverrun: !1,
    }));
}
/**
 * 包装消息流：在第一次真正发出请求前缓存助手消息，确认有请求后再按序放出；结束时若一次请求都没发，标记助手消息 answeredWithoutRequest。
 */
//@ chunk-0h4e7gnq.js:12192-12539 placement
async function* bufferUntilFirstRequest(e, n, s) {
  let y = [];
  try {
    for await (let S of e)
      for (let h of n.itemsOf(S))
        if (s.requests === 0 && (y.length > 0 || h.type === "assistant")) y.push(h);
        else (yield* y.splice(0), yield h);
  } catch (error) {
    if (s.requests > 0) yield* y.splice(0);
    throw error;
  }
  let r = s.requests === 0;
  for (let S of [...y, ...n.end()]) {
    if (r && S.type === "assistant") S.answeredWithoutRequest = !0;
    yield S;
  }
}
/**
 * 构造 turn.step 事件：turnId、步序号、模型、按回合/循环设置解析出的 effort、消息条数、agentId。
 */
//@ chunk-0h4e7gnq.js:12539-12879 placement
function buildTurnStepEvent(e, n, s) {
  let { model: model, effortValue: effortValue, turnEffort: turnEffort, agentId: agentId } = s.options,
    k = resolveEffortValue(model, effortValue, {
      turnEffort: turnEffort,
      carriedEffort: resolveLoopEffort(
        {
          loopEffort: s.options.refusalFallbackEffort,
          continuesMainConversation: isMainConversationContext(s.options.agentContext),
        },
        model,
      ),
    });
  return {
    turnId: e,
    index: n,
    model: model,
    ...(k !== void 0 && { effort: k }),
    messageCount: s.messages.length,
    ...(agentId !== void 0 && { agentId: agentId }),
  };
}
//@ chunk-0h4e7gnq.js:12879-13065 placement
function prepareTurnStep(e) {
  try {
    let { agentId: agentId } = e.options,
      s = agentId === void 0 ? vbe() : G1o(agentId);
    return s !== void 0 && hasModuleHookingSite(G1r.event)
      ? { turn: s, e: buildTurnStepEvent(s.turnId, Ho.next(s.turnId), e) }
      : void 0;
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return;
  }
}
//@ chunk-0h4e7gnq.js:13065-13157 placement
var _r = (e, n) => ({
  kind: e,
  isStarted: !1,
  isEnded: !1,
  text: "",
  tool: void 0,
  wire: n,
  isRecordSeen: !1,
});
//@ chunk-0h4e7gnq.js:13157-13189 placement
var Tr = (e) => (e === "" ? {} : (safeParseJSON(e) ?? {}));
/**
 * 判断一个流式事件是否只是重复回显了已记录的内容增量（同一块下标，文本、思考或工具输入 JSON 完全相同）。
 */
//@ chunk-0h4e7gnq.js:13189-13514 placement
function isEchoedDelta(e, n) {
  if (n.type !== "content_block_delta" || n.index !== e.index) return !1;
  let { delta: delta } = n;
  switch (e.kind) {
    case "text":
      return delta.type === "text_delta" && delta.text === e.text;
    case "thinking":
      return delta.type === "thinking_delta" && delta.thinking === e.text;
    case "input":
      return delta.type === "input_json_delta" && delta.partial_json === e.json;
    default:
      return !1;
  }
}
//@ chunk-0h4e7gnq.js:13514-13691 placement
function sameStopAndUsage(e, n) {
  let { usage: usage } = e,
    { usage: usage_2 } = n,
    r = e.stopReason === n.stopReason;
  return r && usage !== null && usage_2 !== null
    ? uniq([...Object.keys(usage), ...Object.keys(usage_2)]).every((h) => usage[h] === usage_2[h])
    : r && usage === usage_2;
}
//@ chunk-0h4e7gnq.js:13691-13745 placement
var kr = { kind: "stop", stopReason: "end_turn", usage: null };
/**
 * 把钩子流里的一个文本/工具块拼成助手消息：沿用信封的 id/model/usage、清空 stop_reason，记 apiBlockIndex 与批量工具调用；钩子虚构的内容标 isUnmetered。
 */
//@ chunk-0h4e7gnq.js:13745-14260 placement
function buildHookAssistantMessage({
  index: index,
  state: state,
  envelope: envelope,
  isMadeUp: isMadeUp,
  model: model,
  toolRecord: toolRecord,
}) {
  let { tool: tool, text: text } = state,
    hasText = state.kind === "text" && text !== "",
    hasTool = state.kind === "tool" && tool !== void 0,
    record = hasText
      ? { content: [{ type: "text", text: text, citations: null }] }
      : hasTool
        ? toolRecord(tool, text)
        : void 0;
  if (record === void 0) return;
  let message = createAssistantMessage({ content: record.content });
  if (
    ((message.message.id = envelope?.id ?? message.message.id),
    (message.message.model = envelope?.model ?? model),
    (message.message.usage = { ...(envelope?.usage ?? message.message.usage) }),
    (message.message.stop_reason = null),
    (message.message.stop_sequence = null),
    (message.apiBlockIndex = index),
    (message.batchToolUses = record.batchToolUses),
    isMadeUp)
  )
    message.isUnmetered = !0;
  return message;
}
/**
 * 把真实响应的 usage、stop_reason/sequence/details、context_management（以及 research 字段）拷到钩子拼出的助手消息上，并去掉 isUnmetered。
 */
//@ chunk-0h4e7gnq.js:14260-14624 placement
function copyFinalResponseMeta(e, n) {
  if (
    ((e.message.usage = n.message.usage),
    delete e.isUnmetered,
    (e.message.stop_reason = n.message.stop_reason),
    (e.message.stop_sequence = n.message.stop_sequence),
    (e.message.stop_details = n.message.stop_details),
    n.message.context_management !== void 0)
  )
    e.message.context_management = n.message.context_management;
  if ("research" in n) Object.assign(e, { research: n.research });
}
//@ chunk-0h4e7gnq.js:15132-15248 placement
function copyContextManagement(e, n) {
  if (n.message.context_management !== void 0) e.message.context_management = n.message.context_management;
}
//@ chunk-0h4e7gnq.js:15248-15528 placement
function makeBlockStartEvent(e, n) {
  let { tool: tool } = n,
    y = n.kind === "tool" && tool !== void 0,
    r = n.kind === "thinking",
    S = y
      ? { type: "tool_use", id: tool.id, name: tool.name, input: {} }
      : r
        ? { type: "thinking", thinking: "", signature: "" }
        : { type: "text", text: "", citations: null };
  return convertStreamEvent({ type: "content_block_start", index: e, content_block: S });
}
/**
 * 生成钩子用的 message_start 流事件（id 为 msg_hook_<uuid>）。
 */
//@ chunk-0h4e7gnq.js:15565-15719 placement
var makeHookMessageStart = (e) =>
  convertStreamEvent({
    type: "message_start",
    message: {
      ...createAssistantMessage({ content: [] }).message,
      id: `msg_hook_${randomUUID_2()}`,
      model: e,
      content: [],
      stop_reason: null,
      stop_sequence: null,
    },
  });
//@ chunk-0h4e7gnq.js:15719-15839 placement
var makeToolBlockStartEvent = (e) =>
  convertStreamEvent({
    type: "content_block_start",
    index: e.index,
    content_block: { type: "tool_use", id: e.id, name: e.name, input: {} },
  });
/**
 * 把钩子给出的停止原因与 token 用量写进助手消息，并去掉 isUnmetered。
 */
//@ chunk-0h4e7gnq.js:15839-16149 placement
function applyStepStopAndUsage(e, n) {
  let { usage: usage } = n;
  if (((e.message.stop_reason = n.stopReason), usage === null)) return;
  ((e.message.usage = {
    ...e.message.usage,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_creation_input_tokens: usage.cache_creation_input_tokens,
    cache_read_input_tokens: usage.cache_read_input_tokens,
  }),
    delete e.isUnmetered);
}
//@ chunk-0h4e7gnq.js:16149-16201 placement
var cl = (e) => convertStreamEvent({ type: "content_block_stop", index: e });
/**
 * 生成钩子用的 message_delta 流事件：停止原因与各项 token 用量（缺失补 0/null）。
 */
//@ chunk-0h4e7gnq.js:16201-16657 placement
var makeHookMessageDelta = (e) =>
  convertStreamEvent({
    type: "message_delta",
    delta: { stop_reason: e.stopReason, stop_sequence: null, stop_details: null, container: null },
    usage: {
      output_tokens: e.usage?.output_tokens ?? 0,
      input_tokens: e.usage?.input_tokens ?? null,
      cache_creation_input_tokens: e.usage?.cache_creation_input_tokens ?? null,
      cache_read_input_tokens: e.usage?.cache_read_input_tokens ?? null,
      server_tool_use: null,
      iterations: null,
      output_tokens_details: null,
      fallback_credit: null,
    },
    context_management: null,
  });
//@ chunk-0h4e7gnq.js:16657-16694 placement
var ml = () => convertStreamEvent({ type: "message_stop" });
/**
 * 用钩子改写后的内容替换助手消息正文，丢弃服务端分类器与线上输入相关字段；原消息带服务端分类器请求时标记输入已被 turn_step 改写。
 */
//@ chunk-0h4e7gnq.js:16694-17127 placement
function rewriteAssistantContent(e, n) {
  let {
      serverClassifierRequest: serverClassifierRequest,
      serverClassifierResults: serverClassifierResults,
      wireToolInputs: wireToolInputs,
      wireIngestContext: wireIngestContext,
      batchToolUses: batchToolUses,
      ...k
    } = e,
    w = k,
    x = e.serverClassifierRequest !== void 0;
  if (((w.message = { ...e.message, content: n.content }), (w.batchToolUses = n.batchToolUses), x))
    ((w.serverClassifierInputRewritten = !0),
      (w.serverClassifierOwnInputRewritten = !0),
      (w.serverClassifierInputRewrite = {
        cause: "turn_step",
        source: "mod",
        byLocalCode: !1,
        keptVerdict: !1,
      }));
  return w;
}
/**
 * 函数钩子 turn.step 的执行器：把一次模型请求的流事件（message_start/content_block/message_delta…）交给插件链，允许插件改写模型、注入工具调用或伪造回复（isMadeUp），并合并回查询循环。
 */
//@ chunk-0h4e7gnq.js:17127-21826 placement
function runTurnStepHooks(e, n, s = (y, r) => ({ content: [{ type: "tool_use", ...y, input: Tr(r) }] })) {
  let y;
  function r() {
    return (
      (y ??= {
        wire: void 0,
        envelope: void 0,
        isMadeUp: !1,
        blocks: new Map(),
        originals: new Map(),
        messages: [],
        isStopped: !1,
        stop: void 0,
      }),
      y
    );
  }
  function* S() {
    let O = r();
    if (O.envelope === void 0) {
      let q = makeHookMessageStart(n),
        { event: event } = q;
      ((O.envelope = event.type === "message_start" ? event.message : void 0), (O.isMadeUp = !0), yield q);
    }
  }
  function* h(O) {
    let { wire: wire } = O,
      W = wire !== void 0 && wire.stop === void 0 && wire.isClosed && !L(O);
    if (O.isStopped) return;
    if (W) {
      (yield* le(O), j(O));
      return;
    }
    yield* he(wire?.stop ?? kr, "closing");
  }
  function* k() {
    let O = y;
    if (O === void 0) return;
    (yield* h(O), (y = void 0), yield ml());
  }
  function* w(O) {
    let responseOf = e.responseOf(O),
      W = y;
    if (responseOf === void 0 ? W?.isStopped === !0 : W?.wire !== void 0 && W.wire !== responseOf) yield* k();
    if (responseOf !== void 0) r().wire ??= responseOf;
  }
  function x(O, q, W) {
    let ue = r(),
      pe = ue.blocks.get(O),
      Q = e.responseOf(W)?.blocks.get(O);
    if (pe !== void 0) return ((pe.wire ??= Q), pe);
    let Pe = _r(q, Q);
    return (ue.blocks.set(O, Pe), Pe);
  }
  function L(O) {
    return [...O.blocks.values()].some((q) => q.wire === void 0);
  }
  function* I(O, q) {
    if ((yield* S(), !q.isStarted)) ((q.isStarted = !0), yield makeBlockStartEvent(O, q));
  }
  function G(O, q) {
    let read = e.read(O);
    return read !== void 0 && read.type === "stream_event" && q(read.event) ? read : void 0;
  }
  function ee(O, q, W) {
    let ue = rewriteAssistantContent(q, W);
    return (O.originals.set(ue, q), ue);
  }
  function te(O, q, W) {
    if (W.kind !== "text" || W.text === W.wire?.text) return q;
    return W.text === "" ? void 0 : ee(O, q, { content: [{ type: "text", text: W.text, citations: null }] });
  }
  function R(O, q, W) {
    let { tool: tool, wire: wire } = W;
    if (tool !== void 0 && tool.id === wire?.tool?.id && tool.name === wire.tool.name && W.text === wire.text)
      return q;
    if (tool === void 0) return;
    return ee(O, q, s(tool, W.text));
  }
  function z(O, q) {
    let W = q.apiBlockIndex ?? -1,
      ue = O.wire?.blocks.get(W),
      pe = O.blocks.get(W);
    if (pe !== void 0) ((pe.isEnded = q.isAbortedMidStream !== !0), (pe.isRecordSeen = !0));
    if (!(ue?.kind === "text" || ue?.kind === "tool")) return q;
    if (pe === void 0) return;
    return ue?.kind === "text" ? te(O, q, pe) : R(O, q, pe);
  }
  function Z(O, q, W) {
    let { wire: wire } = q,
      pe = W === "closing" && wire?.kind === "text" && O.wire?.isClosed === !1;
    return wire?.record !== void 0 ? !q.isRecordSeen : wire === void 0 || pe;
  }
  function* V(O, q, W) {
    let ue = O.blocks.get(q);
    if (ue === void 0 || ue.isEnded) return;
    if (((ue.isEnded = !0), !Z(O, ue, W))) return;
    let { envelope: envelope } = O,
      Q = buildHookAssistantMessage({
        index: q,
        state: ue,
        envelope: envelope,
        isMadeUp:
          ue.wire === void 0 &&
          (O.isMadeUp || finalContextTokensFromLastResponse(envelope?.usage) === void 0),
        model: n,
        toolRecord: s,
      });
    if (Q !== void 0) (O.originals.set(Q, ue.wire?.record), (O.messages = [...O.messages, Q]), yield Q);
  }
  function* le(O) {
    for (let [q, W] of O.blocks) {
      if (W.isEnded) continue;
      if ((yield* V(O, q, "closing"), W.isStarted)) yield cl(q);
    }
  }
  function j(O) {
    for (let [q, W] of O.originals) if (W !== void 0) copyFinalResponseMeta(q, W);
  }
  function ie(O, q) {
    let { stop: stop } = O;
    j(O);
    let ue = [...(O.wire?.blocks.values() ?? [])].find(
      (pe) => pe.record?.message.context_management != null,
    )?.record;
    for (let [pe, Q] of O.originals) {
      if (Q === void 0 && stop !== void 0) applyStepStopAndUsage(pe, stop);
      if (Q === void 0 && ue !== void 0) copyContextManagement(pe, ue);
    }
    if (q && stop !== void 0) for (let message of O.messages) applyStepStopAndUsage(message, stop);
  }
  function* he(O, q) {
    (yield* w(O.ref), yield* S());
    let W = r(),
      sent = e.sent(O.ref),
      pe = sent?.kind === "stop" && sameStopAndUsage(O, sent);
    ((W.stop = O),
      yield* le(W),
      ie(W, q === "hook" && !pe),
      (W.isStopped = !0),
      yield (pe ? G(O.ref, (Q) => Q.type === "message_delta") : void 0) ?? makeHookMessageDelta(O));
  }
  function* B(O, q) {
    let { event: event } = O;
    if (event.type === "message_start") {
      yield* k();
      let pe = r();
      ((pe.envelope = event.message), (pe.wire = e.responseOf(q)), yield O);
      return;
    }
    if (
      event.type === "content_block_start" ||
      event.type === "content_block_stop" ||
      event.type === "message_stop"
    )
      yield* w(q);
    switch (event.type) {
      case "content_block_start": {
        let pe = event.content_block.type,
          Q = pe === "text" || pe === "thinking";
        (yield* S(), (x(event.index, Q ? pe : "other", q).isStarted = !0), yield O);
        return;
      }
      case "content_block_stop":
        (yield* V(r(), event.index, "engine"), yield O);
        return;
      case "message_stop":
        if (y !== void 0) yield* h(y);
        ((y = void 0), yield O);
        return;
      default:
        yield O;
    }
  }
  function* ce(O) {
    let read = e.read(O.ref);
    if (read === void 0) {
      logForDebugging(
        `turn.step: an engine chunk names no item of this step (ref ${String(O.ref)}); dropped`,
      );
      return;
    }
    if (isAssistantContentMessage(read) && e.responseOf(O.ref)?.isStreamed === !1) {
      (yield* k(), yield read);
      return;
    }
    if (isAssistantContentMessage(read)) {
      (yield* w(O.ref), yield* S());
      let ue = r(),
        pe = z(ue, read);
      if (pe !== void 0) ((ue.messages = [...ue.messages, pe]), yield pe);
      return;
    }
    if (read.type === "stream_event") {
      yield* B(read, O.ref);
      return;
    }
    yield read;
  }
  function* Ae(O) {
    yield* w(O.ref);
    let q = x(O.index, O.kind === "input" ? "tool" : O.kind, O.ref);
    (yield* I(O.index, q),
      (q.text += O.kind === "input" ? O.json : O.text),
      yield G(O.ref, (W) => isEchoedDelta(O, W)) ?? deltaEventForKind(O));
  }
  function* Te(O) {
    yield* w(O.ref);
    let q = x(O.index, "tool", O.ref);
    ((q.tool = { id: O.id, name: O.name }),
      yield* S(),
      (q.isStarted = !0),
      yield G(
        O.ref,
        (W) =>
          W.type === "content_block_start" &&
          W.index === O.index &&
          W.content_block.type === "tool_use" &&
          W.content_block.id === O.id &&
          W.content_block.name === O.name,
      ) ?? makeToolBlockStartEvent(O));
  }
  return {
    *itemsOf(O) {
      switch (O.kind) {
        case "engine":
          return yield* ce(O);
        case "text":
        case "thinking":
        case "input":
          return yield* Ae(O);
        case "tool":
          return yield* Te(O);
        case "stop":
          return yield* he(O, "hook");
        default:
          logForDebugging("turn.step: a chunk of no known kind came out of the chain; dropped");
      }
    },
    end: k,
  };
}
//@ chunk-0h4e7gnq.js:21826-22092 placement
function toDeltaChunk(e, n, s) {
  switch (n.type) {
    case "text_delta":
      return { kind: "text", index: e, text: n.text, ref: s };
    case "thinking_delta":
      return { kind: "thinking", index: e, text: n.thinking, ref: s };
    case "input_json_delta":
      return { kind: "input", index: e, json: n.partial_json, ref: s };
    default:
      return;
  }
}
//@ chunk-0h4e7gnq.js:22092-22158 placement
var Or = (e, n, s) => ({ kind: "tool", index: e, id: n.id, name: n.name, ref: s });
/**
 * 把引擎流逐条转成 turn.step 的块描述：tool_use 开始块、text/thinking/input 增量（非工具块的 input 增量忽略）、带停止原因的 message_delta，其余为 engine 块；同时登记引用。
 */
//@ chunk-0h4e7gnq.js:22158-22824 placement
function createStreamChunker(refs) {
  let n;
  function s(event, ref) {
    switch (event.type) {
      case "content_block_start": {
        let content_block = event.content_block;
        return content_block.type === "tool_use" ? Or(event.index, content_block, ref) : void 0;
      }
      case "content_block_delta":
        return event.delta.type === "input_json_delta" &&
          refs.latest()?.blocks.get(event.index)?.kind !== "tool"
          ? void 0
          : toDeltaChunk(event.index, event.delta, ref);
      case "message_delta":
        return typeof event.delta.stop_reason === "string"
          ? { kind: "stop", stopReason: $n(event.delta.stop_reason), usage: jn(n), ref: ref }
          : void 0;
      default:
        return;
    }
  }
  return {
    chunkOf(y) {
      let hold = refs.hold(y),
        S = isAssistantContentMessage(y);
      if (S || (y.type === "stream_event" && y.event.type === "message_start")) n = S ? y : void 0;
      let w = (y.type === "stream_event" ? s(y.event, hold) : void 0) ?? { kind: "engine", ref: hold };
      return (refs.filed(hold, w), w);
    },
  };
}
/**
 * 判断最后一条有效消息是否是同一模型族的助手消息（可以在该模型上继续未完成的思考）；出错返回 false。
 */
//@ chunk-0h4e7gnq.js:22824-22962 placement
function canResumeThinkingOnModel(e, n) {
  try {
    let s =
      e[e.findLastIndex((y) => !isNonConversationMessage(y) && !isAbandonedOrUnsignedThinkingMessage(y))];
    return s?.type === "assistant" && !isForeignModelMessage(s, Bn(n));
  } catch (error) {
    return (logError(error), !1);
  }
}
/**
 * 按 turn.step 钩子的结果算出本次请求的 options：恢复截断思考且模型不可换时保持原模型（并提示一次），否则采用钩子模型（受允许列表限制）；effort 被改时附 hookEffortValue。
 */
//@ chunk-0h4e7gnq.js:22962-23285 placement
function resolveStepModelOptions(e, n) {
  let { options: options } = e.args,
    y = n.effort !== e.sent.effort && n.effort !== void 0,
    r =
      options.resumeIncompleteThinking === !0 &&
      n.model !== options.model &&
      !canResumeThinkingOnModel(e.args.messages, n.model);
  if (r && !e.state.isResumeKeptTold) ((e.state.isResumeKeptTold = !0), warnResumeKeepsModel(options.model));
  return {
    ...options,
    model: r ? options.model : warnTurnStepModelNotAllowed(n.model, options.model),
    ...(y && { hookEffortValue: n.effort }),
  };
}
/**
 * 创建 turn.step 链里的核心执行器：真正调用模型、统计请求次数、把流转成块并在结束时返回 step 结果；异常记在 state.thrown 后重抛。
 */
//@ chunk-0h4e7gnq.js:23285-23647 placement
var makeCoreStepRunner = ({ callModel: callModel, args: args, sent: sent, refs: refs, state: state }) => ({
  name: "core",
  isCore: !0,
  budgetMs: 0,
  run: (S) =>
    (async function* () {
      ((state.requests += 1), (state.thrown = void 0));
      let h = createStepResultCollector(),
        k = createStreamChunker(refs),
        w = callModel({
          ...args,
          options: resolveStepModelOptions(
            { callModel: callModel, args: args, sent: sent, refs: refs, state: state },
            S,
          ),
        });
      try {
        for await (let x of w) (h.note(x), yield k.chunkOf(x));
      } catch (error) {
        throw ((state.thrown = { error: error }), error);
      }
      return h.result(S.turnId, S.index);
    })(),
});
/**
 * 生成把工具名+输入规范化成助手内容（含批量工具拆分）的函数，供钩子构造工具调用块。
 */
//@ chunk-0h4e7gnq.js:23647-23896 placement
var makeToolRecordBuilder = (e) => (n, s) => {
  let { agentId: agentId, storageV5: storageV5 } = e.options,
    { content: content, batchToolUses: batchToolUses } = isBatchToolsUse(
      normalizeContentFromAPI(
        [{ type: "tool_use", id: n.id, name: n.name, input: s }],
        e.tools,
        agentId,
        void 0,
        storageV5,
      ),
      e.tools,
      (k, w) => normalizeToolInput_2(k, w, agentId, storageV5),
    );
  return batchToolUses.length > 0 ? { content: content, batchToolUses: batchToolUses } : { content: content };
};
//@ chunk-0h4e7gnq.js:23896-23908 placement
var Lr = 3000;
//@ chunk-0h4e7gnq.js:23908-24052 placement
async function waitForTurnStart(e, n, s = Lr) {
  let abortController = new AbortController();
  try {
    await Promise.race([e.started, sleep(s, AbortSignal.any([n, abortController.signal]))]);
  } finally {
    abortController.abort();
  }
}
//@ chunk-0h4e7gnq.js:24052-24879 placement
async function* raiseTurnStep(e, n, s) {
  let y = prepareTurnStep(n);
  if (!y) return yield* e(n);
  await waitForTurnStart(y.turn, n.signal);
  let r = { requests: 0, thrown: void 0, isResumeKeptTold: !1 };
  try {
    let S = collectTurnStepBlocks();
    yield* bufferUntilFirstRequest(
      Jue({
        signal: n.signal,
        origin: s,
        streamCore: {
          "turn.step": makeCoreStepRunner({ callModel: e, args: n, sent: y.e, refs: S, state: r }),
        },
      }).turn.step(y.e),
      runTurnStepHooks(S, y.e.model, makeToolRecordBuilder(n)),
      r,
    );
  } catch (error) {
    let h = r.thrown?.error,
      { signal: signal } = n;
    if (h !== void 0 && (!signal.aborted || isAbortError(h))) throw h;
    if (signal.aborted && !isAbortError(error))
      throw isAbortError(signal.reason)
        ? signal.reason
        : withTelemetryMessage(
            new AbortError(errorMessage(signal.reason)),
            "function hooks turn.step request aborted (reason not reported: it may contain plugin details)",
          );
    if (!(r.requests === 0 && !isAbortError(error))) throw error;
    return (
      logForDebugging(
        `turn.step: the chain failed before the request; it goes without the hooks: ${errorMessage(error)}`,
        { level: "error" },
      ),
      yield* e(n)
    );
  }
  if (r.requests === 0)
    logForDebugging("turn.step: a hook answered without the request; the loop read what it streamed");
}
/**
 * 给查询依赖包装 turn.step 钩子：委托观察上下文或关闭设置钩子时原样返回，否则把 callModel 换成经过 raiseTurnStep 的版本。
 */
//@ chunk-0h4e7gnq.js:24879-25012 placement
function withTurnStepHooks(e, n) {
  return isDelegatedObservationContext(n.agentContext) || n.options?.settingsHooksOff === !0
    ? e
    : { ...e, callModel: (y) => raiseTurnStep(e.callModel, y, n.hookOrigin) };
}
//@ chunk-0h4e7gnq.js:25012-25243 placement
function sumTurnUsage(e, n) {
  try {
    let s = new Map();
    for (let y of sliceTurnMessages(e.getSnapshot(), n)) {
      let r = getAssistantTokenUsage(y);
      if (r && y.type === "assistant") s.set(y.message.id, r);
    }
    return sumUsages(s.values());
  } catch (error) {
    logForDebugging("turn.complete: could not read the usage: " + toError(error).message);
    return;
  }
}
//@ chunk-0h4e7gnq.js:25243-25663 placement
function raiseTurnComplete(e) {
  let {
    turnId: turnId,
    transcript: transcript,
    span: span,
    durationMs: durationMs,
    isAborted: isAborted,
  } = e;
  (W1o(turnId, isAborted), Ho.forget(turnId));
  let h = lastAssistantMessageForTurnComplete(transcript, span),
    k = Nn(isAborted, getTurnRefusal(transcript, span), turnEndedWithApiError(transcript, span)),
    w = sumTurnUsage(transcript, span),
    x = Jue();
  (e.turnEvents.enqueue("turn.complete", () =>
    x.turn
      .complete({
        answer: h,
        durationMs: durationMs,
        isAborted: isAborted,
        turnId: turnId,
        ...k,
        ...(w && { usage: w }),
      })
      .then((L) => (L.text !== h && L.text.trim() !== "" ? [or(L.text)] : [])),
  ),
    e.turnEvents.enqueue("session.measure", () =>
      measureSession("turn")
        .finally(logModsFirstTurn)
        .then(() => []),
    ));
}
//@ chunk-0h4e7gnq.js:25663-25759 placement
function Hr() {
  try {
    return (
      hasModuleHookingSite("turn.start") ||
      hasModuleHookingSite("turn.step") ||
      hasModuleHookingSite("turn.complete")
    );
  } catch {
    return !1;
  }
}
/**
 * 回合开始后异步触发插件的 turn.complete（回答、耗时、是否中止、拒绝/错误信息、用量），失败只记调试日志，最后释放该代理的回合登记。
 */
//@ chunk-0h4e7gnq.js:25759-26085 placement
function fireTurnComplete(e) {
  let {
      agentId: agentId,
      turnId: turnId,
      answer: answer,
      refusal: refusal,
      usage: usage,
      durationMs: durationMs,
      isAborted: isAborted,
    } = e,
    w = Nn(isAborted, refusal, e.hasEndedInError),
    x = holdAgentConversation(agentId);
  e.started
    .then(() =>
      Jue().turn.complete({
        answer: answer,
        durationMs: durationMs,
        isAborted: isAborted,
        turnId: turnId,
        agentId: agentId,
        ...w,
        ...(usage && { usage: usage }),
      }),
    )
    .catch((L) => logForDebugging(`turn.complete (agent ${agentId}): ${errorMessage(L)}`, { level: "warn" }))
    .finally(x);
}
//@ chunk-0h4e7gnq.js:26085-26157 placement
var freeze = Object.freeze({ saw: () => {}, ended: () => {}, [Symbol.dispose]: () => {} });
//@ chunk-0h4e7gnq.js:26157-27320 placement
function raiseTurnLifecycleForAgent(e, n, s, y, r) {
  let S = y === void 0 ? void 0 : Ixo.get();
  if (!Hr() && S === void 0) return freeze;
  let k = randomUUID(),
    now = Date.now(),
    x = new Map(),
    L,
    I = "",
    G = !1,
    ee,
    te = !1,
    R = !1,
    abortController = new AbortController(),
    any = AbortSignal.any([s, abortController.signal]);
  async function V() {
    try {
      await Jue({ signal: any, origin: r }).turn.start({ text: e, turnId: k, agentId: n });
    } catch (error) {
      logForDebugging(`turn.start (agent ${n}): ${errorMessage(error)}`, { level: "warn" });
    }
  }
  let le = { turnId: k, started: V() };
  ZNi(n, k, le.started);
  async function j() {
    (await waitForTurnStart(le, abortController.signal), abortController.abort());
  }
  function ie(B) {
    let ce = B && getAssistantTokenUsage(B);
    if (B && ce) x.set(B.message.id, ce);
    if (B !== void 0 && !isAbandonedOrUnsignedThinkingMessage(B)) ((R = !0), S?.());
  }
  function he(B) {
    let { isAborted: isAborted, hasFailed: hasFailed, report: report } = B;
    if (te) return;
    if (((te = !0), release_2(n, k), Ho.forget(k), ie(L), !R)) S?.();
    try {
      fireTurnComplete({
        agentId: n,
        turnId: k,
        answer: report ?? I,
        refusal: ee,
        hasEndedInError: hasFailed || G,
        usage: sumUsages(x.values()),
        durationMs: Date.now() - now,
        isAborted: isAborted,
        started: j(),
      });
    } catch (error) {
      logForDebugging(`turn.complete (agent ${n}): not raised: ` + errorMessage(error), { level: "error" });
    }
  }
  return {
    saw: (B) => {
      if (((ee = refusalSystemMessage(B) ?? ee), !(B.type === "assistant" && !B.isVirtual))) return;
      if (L?.message.id !== B.message.id) ie(L);
      ((L = B),
        (G = B.isApiErrorMessage === !0),
        (I = G
          ? I
          : extractTextContent_2(
              B.message.content,
              `
`,
            ).trim()));
    },
    ended: he,
    [Symbol.dispose]: () => {
      he({ isAborted: s.aborted, hasFailed: !s.aborted });
    },
  };
}

export {
  retagQueuedCommandSource,
  raiseTurnLifecycleForAgent,
  setSessionMeasurer,
  measureSession,
  raiseTurnComplete,
  withTurnStepHooks,
  canResumeThinkingOnModel,
  Ixo,
};
