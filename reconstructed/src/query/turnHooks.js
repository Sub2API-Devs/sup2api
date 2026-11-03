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
import { randomUUID } from "crypto";
import { identity } from "../utils/identity.js";
import { createValueSlot } from "../utils/valueSlot.js";
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
import { sourceLabel, singleLineFieldText } from "../utils/messages/nonUserMessages.js";
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
import {
  currentTurn,
  currentTurnBinding,
  releaseTurnIfCurrent,
  bindTurn,
  release_2,
} from "../plugins/functionHooks/personHold.js";
import { hasModuleHookingSite } from "../plugins/hooksModules/loadedModuleFilters.js";
import { TURN_STEP_RULES, eventCallersWrapper2 } from "../plugins/functionHooks/eventCatalog.js";
import { safeParseJSON } from "../utils/json.js";
import { uniq } from "../utils/collections.js";
import { convertStreamEvent, deltaEventForKind } from "../remote/sdkMessageAdapter.js";
import { isNonConversationMessage } from "../bootstrap/sessionSlices.js";
import { stripAnyVersatileSuffix } from "../utils/model/modelIds.js";
import { isBatchToolsUse } from "../services/tools/batchTools.js";
import { normalizeToolInput_2 } from "../utils/api.js";
import { sleep } from "../utils/sleep.js";
import { sumUsages } from "../tools/AgentTool/agentToolUtils.js";
import { logModsFirstTurn } from "../plugins/functionHooks/modLoadTelemetry.js";
import { holdAgentConversation } from "../plugins/functionHooks/sessionApi.js";

//@ chunk-0h4e7gnq.js:6211-6439 placement
/**
 * 队列命令附件带 source_uuid 时，把消息列表里对应的源消息复制一份并把 uuid 换成附件的 uuid（返回新数组）；找不到时返回 undefined。
 */
function retagQueuedCommandSource(messages, message) {
  if (message.type !== "attachment" || message.attachment.type !== "queued_command") return;
  let sourceUuid = message.attachment.source_uuid;
  let y = sourceUuid === undefined ? -1 : messages.findLastIndex((S) => S.uuid === sourceUuid);
  let r = messages[y];
  return r === undefined
    ? undefined
    : messages.with(y, {
        ...r,
        uuid: message.uuid,
      });
}
//@ chunk-0h4e7gnq.js:6476-6512 placement
/**
 * 回合步骤槽
 */
var turnStepSlot = identity(createValueSlot(), (e) => e.set(undefined));
//@ chunk-0h4e7gnq.js:6512-6652 placement
function sliceTurnMessages(snapshot, n) {
  let s = (before) => (before === undefined ? -1 : snapshot.findIndex((S) => S.uuid === before));
  let y = n.next ? s(n.next.before) : snapshot.length;
  return snapshot.slice(s(n.before) + 1, y + 1);
}
//@ chunk-0h4e7gnq.js:6652-6802 placement
function turnEndedWithApiError(transcript, span) {
  let last = sliceTurnMessages(transcript.getSnapshot(), span).findLast(
    (y) => y.type === "assistant" && !y.isVirtual,
  );
  return last?.type === "assistant" && last.isApiErrorMessage === true;
}
//@ chunk-0h4e7gnq.js:6802-6912 placement
function createSessionMeasurer() {
  let e = pu();
  return {
    setSessionMeasurer: e.set,
    measureSession: (n) => e.get()?.(n) ?? Promise.resolve(),
  };
}
//@ chunk-0h4e7gnq.js:6912-6924 placement
/**
 * 会话度量器
 */
var sessionMeasurer = createSessionMeasurer();
//@ chunk-0h4e7gnq.js:6924-6950 placement
var measureSession = sessionMeasurer.measureSession;
//@ chunk-0h4e7gnq.js:6950-6980 placement
var setSessionMeasurer = sessionMeasurer.setSessionMeasurer;
//@ chunk-0h4e7gnq.js:6980-7254 placement
function lastAssistantMessageForTurnComplete(transcript, span) {
  try {
    let last = sliceTurnMessages(transcript.getSnapshot(), span).findLast(
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
    logForDebugging("turn.complete: could not read the final message: " + toError(error).message);
    return "";
  }
}
//@ chunk-0h4e7gnq.js:7254-7390 placement
function createCounterMap() {
  let e = new Map();
  return {
    next: (n) => {
      let s = e.get(n) ?? 0;
      e.set(n, s + 1);
      return s;
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
/**
 * 回合步骤计数
 */
var turnStepCounters = identity(createCounterMap(), (e) => {
  e.clear();
});
//@ chunk-0h4e7gnq.js:7423-7515 placement
/**
 * 回合结束通知
 */
var turnCompleteNotice = (text) =>
  createSystemMessage(
    `${hookMembersFor("turn.complete")
      .map((n) => sourceLabel(n.name))
      .join("+")}: ${singleLineFieldText(text)}`,
    "notice",
  );
//@ chunk-0h4e7gnq.js:7515-7611 placement
/**
 * 回合结束原因
 */
var turnOutcomeReason = (isAborted, n, s) =>
  isAborted
    ? {
        reason: "aborted",
      }
    : n
      ? {
          reason: "refusal",
          refusal: n,
        }
      : {
          reason: s ? "error" : "answer",
        };
//@ chunk-0h4e7gnq.js:7611-7981 placement
function refusalSystemMessage(e) {
  if (e.type === "system")
    return e.subtype === "model_refusal_no_fallback"
      ? {
          category: e.apiRefusalCategory ?? null,
          explanation: e.apiRefusalExplanation ?? null,
        }
      : undefined;
  return e.type === "assistant" && e.isApiErrorMessage === true && e.message.stop_reason === "refusal"
    ? {
        category: e.message.stop_details?.category ?? null,
        explanation: e.message.stop_details?.explanation ?? null,
      }
    : undefined;
}
//@ chunk-0h4e7gnq.js:7981-8161 placement
function getTurnRefusal(transcript, span) {
  try {
    return sliceTurnMessages(transcript.getSnapshot(), span)
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
  let n = e.isUnmetered === true;
  let usage = n ? finalContextTokensFromLastResponse(e.message.usage) : getTokenUsage(e);
  if (usage === undefined) return;
  let tokenCountFromUsage = getTokenCountFromUsage_3(usage);
  return n && Object.values(tokenCountFromUsage).every((S) => S === 0)
    ? undefined
    : {
        ...tokenCountFromUsage,
        model: e.message.model,
      };
}
//@ chunk-0h4e7gnq.js:8717-8853 placement
function isAssistantContentMessage(e) {
  if (!isPlainObject_2(e) || e.type !== "assistant") return false;
  let { message } = e;
  return isPlainObject_2(message) && Array.isArray(message.content) && e.isApiErrorMessage !== true;
}
//@ chunk-0h4e7gnq.js:8853-9138 placement
function streamingFallbackRetraction(e, n) {
  try {
    if (!isPlainObject_2(n)) return e;
    if (n.type === "streaming_fallback_began") return [];
    let { discardedMessages } = n;
    if (!(n.type === "server_fallback" && Array.isArray(discardedMessages))) return e;
    let r = new Set(
      discardedMessages.map((discardedMessage) => isPlainObject_2(discardedMessage) && discardedMessage.uuid),
    );
    return e.filter((S) => !r.has(S.uuid));
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return e;
  }
}
//@ chunk-0h4e7gnq.js:9138-9342 placement
function snapshotAssistantReply(e) {
  let { uuid, timestamp } = e;
  let { content } = e.message;
  try {
    return {
      uuid,
      timestamp,
      content: structuredClone(content),
      reply: e,
    };
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return {
      uuid,
      timestamp,
      content: [...content],
      reply: e,
    };
  }
}
//@ chunk-0h4e7gnq.js:9342-9381 placement
/**
 * 合法 stop_reason
 */
var validStopReason = (stopReason) => STOP_REASONS.find((n) => n === stopReason) ?? null;
//@ chunk-0h4e7gnq.js:9381-9434 placement
/**
 * 取助手消息用量
 */
function usageOfMessage(e) {
  return (e === undefined ? undefined : getAssistantTokenUsage(e)) ?? null;
}
//@ chunk-0h4e7gnq.js:9434-9810 placement
/**
 * 维护服务端工具调用表：遇到 server_tool_use/mcp_tool_use 时记下开始时间，遇到对应结果块时补上结束时间；出错时返回原表。
 */
function trackServerToolUse(e, n, timestamp) {
  try {
    let y = Date.parse(timestamp) || Date.now();
    if (n.type === "server_tool_use" || n.type === "mcp_tool_use") {
      let { id, name: k, input } = n;
      return e.has(id)
        ? e
        : new Map([
            ...e,
            [
              id,
              {
                id,
                name: k,
                input,
                startedAt: y,
              },
            ],
          ]);
    }
    let r = "tool_use_id" in n ? e.get(n.tool_use_id) : undefined;
    return r !== undefined && r.endedAt === undefined
      ? new Map([
          ...e,
          [
            r.id,
            {
              ...r,
              endedAt: y,
            },
          ],
        ])
      : e;
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return e;
  }
}
//@ chunk-0h4e7gnq.js:9810-10289 placement
/**
 * 收集一次 turn.step 请求的助手回复：note 记录每条回复（流式回退时撤回），result 汇总出回答文本、工具调用、服务端工具调用、停止原因与用量。
 */
function createStepResultCollector() {
  let e = [];
  return {
    note: (n) => {
      e = isAssistantContentMessage(n)
        ? [...e, snapshotAssistantReply(n)]
        : streamingFallbackRetraction(e, n);
    },
    result: (turnId, index) => {
      let reply = e.at(-1)?.reply;
      let flattened = e.flatMap((h) => h.content);
      let reduced = e.reduce(
        (acc, k) => k.content.reduce((acc, x) => trackServerToolUse(acc, x, k.timestamp), acc),
        new Map(),
      );
      return {
        turnId,
        index,
        answer: flattened
          .flatMap((h) => (h.type === "text" ? [h.text] : []))
          .join(
            `
`,
          )
          .trim(),
        toolUses: flattened.flatMap((h) =>
          h.type === "tool_use"
            ? [
                {
                  name: h.name,
                  input: h.input,
                },
              ]
            : [],
        ),
        ...(reduced.size > 0 && {
          serverToolUses: [...reduced.values()],
        }),
        stopReason: validStopReason(reply?.message.stop_reason),
        usage: usageOfMessage(reply),
      };
    },
  };
}
//@ chunk-0h4e7gnq.js:10289-10597 placement
function warnTurnStepModelNotAllowed(model, model_2) {
  if (model === model_2) return model_2;
  let modelAliasSpelling = resolveModelAliasSpelling(model);
  if (isPermittedByOrgModelPolicy(model) && isPermittedByOrgModelPolicy(modelAliasSpelling))
    return modelAliasSpelling;
  let r = `turn.step: model ${model} is not allowed by policy; the request keeps ${model_2}`;
  logForDebugging(r, {
    level: "warn",
  });
  emit({
    plugin: "turn.step hooks",
    event: "turn.step",
    reason: r,
    effect: "the engine sent the request to its own model",
    hasOverrun: false,
  });
  return model_2;
}
//@ chunk-0h4e7gnq.js:10597-10708 placement
function toStepBlockKind(type) {
  switch (type) {
    case "text":
    case "thinking":
      return type;
    case "tool_use":
      return "tool";
    default:
      return "other";
  }
}
//@ chunk-0h4e7gnq.js:10708-10820 placement
function getOrCreateBlockState(e, index, kind) {
  let y = e.blocks.get(index) ?? {
    kind,
    tool: undefined,
    text: "",
    record: undefined,
  };
  e.blocks.set(index, y);
  return y;
}
//@ chunk-0h4e7gnq.js:10820-11900 placement
function collectTurnStepBlocks() {
  let e = new Map();
  let n = new Map();
  let s = new Map();
  let y;
  function r() {
    y = {
      ordinal: (y?.ordinal ?? 0) + 1,
      isStreamed: false,
      blocks: new Map(),
      stop: undefined,
      isClosed: false,
    };
    return y;
  }
  let S = () => y ?? r();
  function h(k) {
    if (isAssistantContentMessage(k)) {
      let apiBlockIndex = k.apiBlockIndex;
      if (apiBlockIndex !== undefined) getOrCreateBlockState(S(), apiBlockIndex, "other").record = k;
      return;
    }
    if (k.type === "streaming_fallback_began") {
      S().isClosed = true;
      r();
      return;
    }
    if (k.type !== "stream_event") return;
    let { event } = k;
    if (event.type === "message_start") r().isStreamed = true;
    if (event.type === "message_stop") S().isClosed = true;
    if (event.type === "content_block_start") {
      let contentBlock = event.content_block;
      let L = getOrCreateBlockState(S(), event.index, toStepBlockKind(contentBlock.type));
      if (contentBlock.type === "tool_use")
        L.tool = {
          id: contentBlock.id,
          name: contentBlock.name,
        };
    }
  }
  return {
    hold: (k) => {
      let w = e.size + 1;
      e.set(w, k);
      h(k);
      s.set(w, S());
      return w;
    },
    read: (k) => (k === undefined ? undefined : e.get(k)),
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
          x.stop = {
            ...w,
            usage: w.usage && {
              ...w.usage,
            },
          };
          n.set(k, x.stop);
          return;
        default:
      }
    },
    sent: (k) => (k === undefined ? undefined : n.get(k)),
    responseOf: (k) => (k === undefined ? undefined : s.get(k)),
    latest: () => y,
  };
}
//@ chunk-0h4e7gnq.js:11900-12192 placement
/**
 * 恢复被截断的思考时请求必须保持原模型：写警告日志并向插件诊断上报"模型改写从下一次请求才生效"。
 */
function warnResumeKeepsModel(model) {
  let n = `turn.step: a request resuming a truncated thought keeps its model ${model}; a model rewrite applies from the next request`;
  logForDebugging(n, {
    level: "warn",
  });
  emit({
    plugin: "turn.step hooks",
    event: "turn.step",
    reason: n,
    effect: "the engine sent the request as the thought began",
    hasOverrun: false,
  });
}
//@ chunk-0h4e7gnq.js:12192-12539 placement
/**
 * 包装消息流：在第一次真正发出请求前缓存助手消息，确认有请求后再按序放出；结束时若一次请求都没发，标记助手消息 answeredWithoutRequest。
 */
async function* bufferUntilFirstRequest(e, n, s) {
  let y = [];
  try {
    for await (let S of e)
      for (let h of n.itemsOf(S))
        if (s.requests === 0 && (y.length > 0 || h.type === "assistant")) y.push(h);
        else {
          yield* y.splice(0);
          yield h;
        }
  } catch (error) {
    if (s.requests > 0) yield* y.splice(0);
    throw error;
  }
  let r = s.requests === 0;
  for (let S of [...y, ...n.end()]) {
    if (r && S.type === "assistant") S.answeredWithoutRequest = true;
    yield S;
  }
}
//@ chunk-0h4e7gnq.js:12539-12879 placement
/**
 * 构造 turn.step 事件：turnId、步序号、模型、按回合/循环设置解析出的 effort、消息条数、agentId。
 */
function buildTurnStepEvent(turnId, index, s) {
  let { model, effortValue, turnEffort, agentId } = s.options;
  let effortValue_2 = resolveEffortValue(model, effortValue, {
    turnEffort,
    carriedEffort: resolveLoopEffort(
      {
        loopEffort: s.options.refusalFallbackEffort,
        continuesMainConversation: isMainConversationContext(s.options.agentContext),
      },
      model,
    ),
  });
  return {
    turnId,
    index,
    model,
    ...(effortValue_2 !== undefined && {
      effort: effortValue_2,
    }),
    messageCount: s.messages.length,
    ...(agentId !== undefined && {
      agentId,
    }),
  };
}
//@ chunk-0h4e7gnq.js:12879-13065 placement
function prepareTurnStep(e) {
  try {
    let { agentId } = e.options;
    let s = agentId === undefined ? currentTurn() : currentTurnBinding(agentId);
    return s !== undefined && hasModuleHookingSite(TURN_STEP_RULES.event)
      ? {
          turn: s,
          e: buildTurnStepEvent(s.turnId, turnStepCounters.next(s.turnId), e),
        }
      : undefined;
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return;
  }
}
//@ chunk-0h4e7gnq.js:13065-13157 placement
/**
 * 空块状态
 */
var emptyBlockState = (kind, wire) => ({
  kind,
  isStarted: false,
  isEnded: false,
  text: "",
  tool: undefined,
  wire,
  isRecordSeen: false,
});
//@ chunk-0h4e7gnq.js:13157-13189 placement
/**
 * 空串给 {} 否则解析
 */
var parseJsonOrEmpty = (e) => (e === "" ? {} : (safeParseJSON(e) ?? {}));
//@ chunk-0h4e7gnq.js:13189-13514 placement
/**
 * 判断一个流式事件是否只是重复回显了已记录的内容增量（同一块下标，文本、思考或工具输入 JSON 完全相同）。
 */
function isEchoedDelta(e, n) {
  if (n.type !== "content_block_delta" || n.index !== e.index) return false;
  let { delta } = n;
  switch (e.kind) {
    case "text":
      return delta.type === "text_delta" && delta.text === e.text;
    case "thinking":
      return delta.type === "thinking_delta" && delta.thinking === e.text;
    case "input":
      return delta.type === "input_json_delta" && delta.partial_json === e.json;
    default:
      return false;
  }
}
//@ chunk-0h4e7gnq.js:13514-13691 placement
function sameStopAndUsage(e, n) {
  let { usage } = e;
  let { usage: usage_2 } = n;
  let r = e.stopReason === n.stopReason;
  return r && usage !== null && usage_2 !== null
    ? uniq([...Object.keys(usage), ...Object.keys(usage_2)]).every((h) => usage[h] === usage_2[h])
    : r && usage === usage_2;
}
//@ chunk-0h4e7gnq.js:13691-13745 placement
/**
 * 默认停止块
 */
var DEFAULT_STOP_BLOCK = {
  kind: "stop",
  stopReason: "end_turn",
  usage: null,
};
//@ chunk-0h4e7gnq.js:13745-14260 placement
/**
 * 把钩子流里的一个文本/工具块拼成助手消息：沿用信封的 id/model/usage、清空 stop_reason，记 apiBlockIndex 与批量工具调用；钩子虚构的内容标 isUnmetered。
 */
function buildHookAssistantMessage({ index, state, envelope, isMadeUp, model, toolRecord }) {
  let { tool, text } = state;
  let hasText = state.kind === "text" && text !== "";
  let hasTool = state.kind === "tool" && tool !== undefined;
  let record = hasText
    ? {
        content: [
          {
            type: "text",
            text,
            citations: null,
          },
        ],
      }
    : hasTool
      ? toolRecord(tool, text)
      : undefined;
  if (record === undefined) return;
  let message = createAssistantMessage({
    content: record.content,
  });
  message.message.id = envelope?.id ?? message.message.id;
  message.message.model = envelope?.model ?? model;
  message.message.usage = {
    ...(envelope?.usage ?? message.message.usage),
  };
  message.message.stop_reason = null;
  message.message.stop_sequence = null;
  message.apiBlockIndex = index;
  message.batchToolUses = record.batchToolUses;
  if (isMadeUp) message.isUnmetered = true;
  return message;
}
//@ chunk-0h4e7gnq.js:14260-14624 placement
/**
 * 把真实响应的 usage、stop_reason/sequence/details、context_management（以及 research 字段）拷到钩子拼出的助手消息上，并去掉 isUnmetered。
 */
function copyFinalResponseMeta(e, n) {
  e.message.usage = n.message.usage;
  delete e.isUnmetered;
  e.message.stop_reason = n.message.stop_reason;
  e.message.stop_sequence = n.message.stop_sequence;
  e.message.stop_details = n.message.stop_details;
  if (n.message.context_management !== undefined) e.message.context_management = n.message.context_management;
  if ("research" in n)
    Object.assign(e, {
      research: n.research,
    });
}
//@ chunk-0h4e7gnq.js:15132-15248 placement
function copyContextManagement(e, record) {
  if (record.message.context_management !== undefined)
    e.message.context_management = record.message.context_management;
}
//@ chunk-0h4e7gnq.js:15248-15528 placement
function makeBlockStartEvent(index, n) {
  let { tool } = n;
  let y = n.kind === "tool" && tool !== undefined;
  let r = n.kind === "thinking";
  let contentBlock = y
    ? {
        type: "tool_use",
        id: tool.id,
        name: tool.name,
        input: {},
      }
    : r
      ? {
          type: "thinking",
          thinking: "",
          signature: "",
        }
      : {
          type: "text",
          text: "",
          citations: null,
        };
  return convertStreamEvent({
    type: "content_block_start",
    index,
    content_block: contentBlock,
  });
}
//@ chunk-0h4e7gnq.js:15565-15719 placement
/**
 * 生成钩子用的 message_start 流事件（id 为 msg_hook_<uuid>）。
 */
var makeHookMessageStart = (model) =>
  convertStreamEvent({
    type: "message_start",
    message: {
      ...createAssistantMessage({
        content: [],
      }).message,
      id: `msg_hook_${randomUUID()}`,
      model,
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
    content_block: {
      type: "tool_use",
      id: e.id,
      name: e.name,
      input: {},
    },
  });
//@ chunk-0h4e7gnq.js:15839-16149 placement
/**
 * 把钩子给出的停止原因与 token 用量写进助手消息，并去掉 isUnmetered。
 */
function applyStepStopAndUsage(e, stop) {
  let { usage } = stop;
  e.message.stop_reason = stop.stopReason;
  if (usage === null) return;
  e.message.usage = {
    ...e.message.usage,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_creation_input_tokens: usage.cache_creation_input_tokens,
    cache_read_input_tokens: usage.cache_read_input_tokens,
  };
  delete e.isUnmetered;
}
//@ chunk-0h4e7gnq.js:16149-16201 placement
/**
 * 块结束事件
 */
var contentBlockStopEvent = (index) =>
  convertStreamEvent({
    type: "content_block_stop",
    index,
  });
//@ chunk-0h4e7gnq.js:16201-16657 placement
/**
 * 生成钩子用的 message_delta 流事件：停止原因与各项 token 用量（缺失补 0/null）。
 */
var makeHookMessageDelta = (e) =>
  convertStreamEvent({
    type: "message_delta",
    delta: {
      stop_reason: e.stopReason,
      stop_sequence: null,
      stop_details: null,
      container: null,
    },
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
/**
 * 消息结束事件
 */
var messageStopEvent = () =>
  convertStreamEvent({
    type: "message_stop",
  });
//@ chunk-0h4e7gnq.js:16694-17127 placement
/**
 * 用钩子改写后的内容替换助手消息正文，丢弃服务端分类器与线上输入相关字段；原消息带服务端分类器请求时标记输入已被 turn_step 改写。
 */
function rewriteAssistantContent(e, n) {
  let {
    serverClassifierRequest,
    serverClassifierResults,
    wireToolInputs,
    wireIngestContext,
    batchToolUses,
    ...k
  } = e;
  let w = k;
  let x = e.serverClassifierRequest !== undefined;
  w.message = {
    ...e.message,
    content: n.content,
  };
  w.batchToolUses = n.batchToolUses;
  if (x) {
    w.serverClassifierInputRewritten = true;
    w.serverClassifierOwnInputRewritten = true;
    w.serverClassifierInputRewrite = {
      cause: "turn_step",
      source: "mod",
      byLocalCode: false,
      keptVerdict: false,
    };
  }
  return w;
}
//@ chunk-0h4e7gnq.js:17127-21826 placement
/**
 * 函数钩子 turn.step 的执行器：把一次模型请求的流事件（message_start/content_block/message_delta…）交给插件链，允许插件改写模型、注入工具调用或伪造回复（isMadeUp），并合并回查询循环。
 */
function runTurnStepHooks(
  turnStepBlocks,
  model,
  toolRecordBuilder = (y, r) => ({
    content: [
      {
        type: "tool_use",
        ...y,
        input: parseJsonOrEmpty(r),
      },
    ],
  }),
) {
  let y;
  function r() {
    y ??= {
      wire: undefined,
      envelope: undefined,
      isMadeUp: false,
      blocks: new Map(),
      originals: new Map(),
      messages: [],
      isStopped: false,
      stop: undefined,
    };
    return y;
  }
  function* S() {
    let O = r();
    if (O.envelope === undefined) {
      let hookMessageStart = makeHookMessageStart(model);
      let { event } = hookMessageStart;
      O.envelope = event.type === "message_start" ? event.message : undefined;
      O.isMadeUp = true;
      yield hookMessageStart;
    }
  }
  function* h(O) {
    let { wire } = O;
    let W = wire !== undefined && wire.stop === undefined && wire.isClosed && !L(O);
    if (O.isStopped) return;
    if (W) {
      yield* le(O);
      j(O);
      return;
    }
    yield* he(wire?.stop ?? DEFAULT_STOP_BLOCK, "closing");
  }
  function* k() {
    let O = y;
    if (O === undefined) return;
    yield* h(O);
    y = undefined;
    yield messageStopEvent();
  }
  function* w(ref) {
    let q = turnStepBlocks.responseOf(ref);
    let W = y;
    if (q === undefined ? W?.isStopped === true : W?.wire !== undefined && W.wire !== q) yield* k();
    if (q !== undefined) r().wire ??= q;
  }
  function x(index, kind, ref) {
    let ue = r();
    let pe = ue.blocks.get(index);
    let wire = turnStepBlocks.responseOf(ref)?.blocks.get(index);
    if (pe !== undefined) {
      pe.wire ??= wire;
      return pe;
    }
    let Pe = emptyBlockState(kind, wire);
    ue.blocks.set(index, Pe);
    return Pe;
  }
  function L(O) {
    return [...O.blocks.values()].some((block) => block.wire === undefined);
  }
  function* I(index, q) {
    yield* S();
    if (!q.isStarted) {
      q.isStarted = true;
      yield makeBlockStartEvent(index, q);
    }
  }
  function G(ref, q) {
    let W = turnStepBlocks.read(ref);
    return W !== undefined && W.type === "stream_event" && q(W.event) ? W : undefined;
  }
  function ee(O, q, W) {
    let ue = rewriteAssistantContent(q, W);
    O.originals.set(ue, q);
    return ue;
  }
  function te(O, q, W) {
    if (W.kind !== "text" || W.text === W.wire?.text) return q;
    return W.text === ""
      ? undefined
      : ee(O, q, {
          content: [
            {
              type: "text",
              text: W.text,
              citations: null,
            },
          ],
        });
  }
  function R(O, q, W) {
    let { tool, wire } = W;
    if (
      tool !== undefined &&
      tool.id === wire?.tool?.id &&
      tool.name === wire.tool.name &&
      W.text === wire.text
    )
      return q;
    if (tool === undefined) return;
    return ee(O, q, toolRecordBuilder(tool, W.text));
  }
  function z(O, q) {
    let W = q.apiBlockIndex ?? -1;
    let ue = O.wire?.blocks.get(W);
    let pe = O.blocks.get(W);
    if (pe !== undefined) {
      pe.isEnded = q.isAbortedMidStream !== true;
      pe.isRecordSeen = true;
    }
    if (!(ue?.kind === "text" || ue?.kind === "tool")) return q;
    if (pe === undefined) return;
    return ue?.kind === "text" ? te(O, q, pe) : R(O, q, pe);
  }
  function Z(O, q, W) {
    let { wire } = q;
    let pe = W === "closing" && wire?.kind === "text" && O.wire?.isClosed === false;
    return wire?.record !== undefined ? !q.isRecordSeen : wire === undefined || pe;
  }
  function* V(O, q, W) {
    let ue = O.blocks.get(q);
    if (ue === undefined || ue.isEnded) return;
    ue.isEnded = true;
    if (!Z(O, ue, W)) return;
    let { envelope } = O;
    let hookAssistantMessage = buildHookAssistantMessage({
      index: q,
      state: ue,
      envelope,
      isMadeUp:
        ue.wire === undefined &&
        (O.isMadeUp || finalContextTokensFromLastResponse(envelope?.usage) === undefined),
      model,
      toolRecord: toolRecordBuilder,
    });
    if (hookAssistantMessage !== undefined) {
      O.originals.set(hookAssistantMessage, ue.wire?.record);
      O.messages = [...O.messages, hookAssistantMessage];
      yield hookAssistantMessage;
    }
  }
  function* le(O) {
    for (let [index, W] of O.blocks) {
      if (W.isEnded) continue;
      yield* V(O, index, "closing");
      if (W.isStarted) yield contentBlockStopEvent(index);
    }
  }
  function j(O) {
    for (let [q, W] of O.originals) if (W !== undefined) copyFinalResponseMeta(q, W);
  }
  function ie(O, q) {
    let { stop } = O;
    j(O);
    let record = [...(O.wire?.blocks.values() ?? [])].find(
      (pe) => pe.record?.message.context_management != null,
    )?.record;
    for (let [pe, Q] of O.originals) {
      if (Q === undefined && stop !== undefined) applyStepStopAndUsage(pe, stop);
      if (Q === undefined && record !== undefined) copyContextManagement(pe, record);
    }
    if (q && stop !== undefined) for (let message of O.messages) applyStepStopAndUsage(message, stop);
  }
  function* he(O, q) {
    yield* w(O.ref);
    yield* S();
    let W = r();
    let ue = turnStepBlocks.sent(O.ref);
    let pe = ue?.kind === "stop" && sameStopAndUsage(O, ue);
    W.stop = O;
    yield* le(W);
    ie(W, q === "hook" && !pe);
    W.isStopped = true;
    yield (pe ? G(O.ref, (Q) => Q.type === "message_delta") : undefined) ?? makeHookMessageDelta(O);
  }
  function* B(O, ref) {
    let { event } = O;
    if (event.type === "message_start") {
      yield* k();
      let pe = r();
      pe.envelope = event.message;
      pe.wire = turnStepBlocks.responseOf(ref);
      yield O;
      return;
    }
    if (
      event.type === "content_block_start" ||
      event.type === "content_block_stop" ||
      event.type === "message_stop"
    )
      yield* w(ref);
    switch (event.type) {
      case "content_block_start": {
        let pe = event.content_block.type;
        let Q = pe === "text" || pe === "thinking";
        yield* S();
        x(event.index, Q ? pe : "other", ref).isStarted = true;
        yield O;
        return;
      }
      case "content_block_stop":
        yield* V(r(), event.index, "engine");
        yield O;
        return;
      case "message_stop":
        if (y !== undefined) yield* h(y);
        y = undefined;
        yield O;
        return;
      default:
        yield O;
    }
  }
  function* ce(O) {
    let q = turnStepBlocks.read(O.ref);
    if (q === undefined) {
      logForDebugging(
        `turn.step: an engine chunk names no item of this step (ref ${String(O.ref)}); dropped`,
      );
      return;
    }
    if (isAssistantContentMessage(q) && turnStepBlocks.responseOf(O.ref)?.isStreamed === false) {
      yield* k();
      yield q;
      return;
    }
    if (isAssistantContentMessage(q)) {
      yield* w(O.ref);
      yield* S();
      let ue = r();
      let pe = z(ue, q);
      if (pe !== undefined) {
        ue.messages = [...ue.messages, pe];
        yield pe;
      }
      return;
    }
    if (q.type === "stream_event") {
      yield* B(q, O.ref);
      return;
    }
    yield q;
  }
  function* Ae(O) {
    yield* w(O.ref);
    let q = x(O.index, O.kind === "input" ? "tool" : O.kind, O.ref);
    yield* I(O.index, q);
    q.text += O.kind === "input" ? O.json : O.text;
    yield G(O.ref, (W) => isEchoedDelta(O, W)) ?? deltaEventForKind(O);
  }
  function* Te(O) {
    yield* w(O.ref);
    let q = x(O.index, "tool", O.ref);
    q.tool = {
      id: O.id,
      name: O.name,
    };
    yield* S();
    q.isStarted = true;
    yield G(
      O.ref,
      (W) =>
        W.type === "content_block_start" &&
        W.index === O.index &&
        W.content_block.type === "tool_use" &&
        W.content_block.id === O.id &&
        W.content_block.name === O.name,
    ) ?? makeToolBlockStartEvent(O);
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
function toDeltaChunk(index, delta, ref) {
  switch (delta.type) {
    case "text_delta":
      return {
        kind: "text",
        index,
        text: delta.text,
        ref,
      };
    case "thinking_delta":
      return {
        kind: "thinking",
        index,
        text: delta.thinking,
        ref,
      };
    case "input_json_delta":
      return {
        kind: "input",
        index,
        json: delta.partial_json,
        ref,
      };
    default:
      return;
  }
}
//@ chunk-0h4e7gnq.js:22092-22158 placement
/**
 * 工具块引用
 */
var toolUseBlockRef = (index, contentBlock, ref) => ({
  kind: "tool",
  index,
  id: contentBlock.id,
  name: contentBlock.name,
  ref,
});
//@ chunk-0h4e7gnq.js:22158-22824 placement
/**
 * 把引擎流逐条转成 turn.step 的块描述：tool_use 开始块、text/thinking/input 增量（非工具块的 input 增量忽略）、带停止原因的 message_delta，其余为 engine 块；同时登记引用。
 */
function createStreamChunker(refs) {
  let n;
  function s(event, ref) {
    switch (event.type) {
      case "content_block_start": {
        let contentBlock = event.content_block;
        return contentBlock.type === "tool_use" ? toolUseBlockRef(event.index, contentBlock, ref) : undefined;
      }
      case "content_block_delta":
        return event.delta.type === "input_json_delta" &&
          refs.latest()?.blocks.get(event.index)?.kind !== "tool"
          ? undefined
          : toDeltaChunk(event.index, event.delta, ref);
      case "message_delta":
        return typeof event.delta.stop_reason === "string"
          ? {
              kind: "stop",
              stopReason: validStopReason(event.delta.stop_reason),
              usage: usageOfMessage(n),
              ref,
            }
          : undefined;
      default:
        return;
    }
  }
  return {
    chunkOf(y) {
      let ref = refs.hold(y);
      let S = isAssistantContentMessage(y);
      if (S || (y.type === "stream_event" && y.event.type === "message_start")) n = S ? y : undefined;
      let w = (y.type === "stream_event" ? s(y.event, ref) : undefined) ?? {
        kind: "engine",
        ref,
      };
      refs.filed(ref, w);
      return w;
    },
  };
}
//@ chunk-0h4e7gnq.js:22824-22962 placement
/**
 * 判断最后一条有效消息是否是同一模型族的助手消息（可以在该模型上继续未完成的思考）；出错返回 false。
 */
function canResumeThinkingOnModel(e, n) {
  try {
    let s =
      e[e.findLastIndex((y) => !isNonConversationMessage(y) && !isAbandonedOrUnsignedThinkingMessage(y))];
    return s?.type === "assistant" && !isForeignModelMessage(s, stripAnyVersatileSuffix(n));
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-0h4e7gnq.js:22962-23285 placement
/**
 * 按 turn.step 钩子的结果算出本次请求的 options：恢复截断思考且模型不可换时保持原模型（并提示一次），否则采用钩子模型（受允许列表限制）；effort 被改时附 hookEffortValue。
 */
function resolveStepModelOptions(e, n) {
  let { options } = e.args;
  let y = n.effort !== e.sent.effort && n.effort !== undefined;
  let r =
    options.resumeIncompleteThinking === true &&
    n.model !== options.model &&
    !canResumeThinkingOnModel(e.args.messages, n.model);
  if (r && !e.state.isResumeKeptTold) {
    e.state.isResumeKeptTold = true;
    warnResumeKeepsModel(options.model);
  }
  return {
    ...options,
    model: r ? options.model : warnTurnStepModelNotAllowed(n.model, options.model),
    ...(y && {
      hookEffortValue: n.effort,
    }),
  };
}
//@ chunk-0h4e7gnq.js:23285-23647 placement
/**
 * 创建 turn.step 链里的核心执行器：真正调用模型、统计请求次数、把流转成块并在结束时返回 step 结果；异常记在 state.thrown 后重抛。
 */
var makeCoreStepRunner = ({ callModel, args, sent, refs, state }) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  run: (S) =>
    (async function* () {
      state.requests += 1;
      state.thrown = undefined;
      let stepResultCollector = createStepResultCollector();
      let streamChunker = createStreamChunker(refs);
      let w = callModel({
        ...args,
        options: resolveStepModelOptions(
          {
            callModel,
            args,
            sent,
            refs,
            state,
          },
          S,
        ),
      });
      try {
        for await (let x of w) {
          stepResultCollector.note(x);
          yield streamChunker.chunkOf(x);
        }
      } catch (error) {
        state.thrown = {
          error,
        };
        throw error;
      }
      return stepResultCollector.result(S.turnId, S.index);
    })(),
});
//@ chunk-0h4e7gnq.js:23647-23896 placement
/**
 * 生成把工具名+输入规范化成助手内容（含批量工具拆分）的函数，供钩子构造工具调用块。
 */
var makeToolRecordBuilder = (e) => (n, input) => {
  let { agentId, storageV5 } = e.options;
  let { content, batchToolUses } = isBatchToolsUse(
    normalizeContentFromAPI(
      [
        {
          type: "tool_use",
          id: n.id,
          name: n.name,
          input,
        },
      ],
      e.tools,
      agentId,
      undefined,
      storageV5,
    ),
    e.tools,
    (k, w) => normalizeToolInput_2(k, w, agentId, storageV5),
  );
  return batchToolUses.length > 0
    ? {
        content,
        batchToolUses,
      }
    : {
        content,
      };
};
//@ chunk-0h4e7gnq.js:23896-23908 placement
/**
 * 3000
 */
var TURN_HOOKS_SETTLE_MS = 3000;
//@ chunk-0h4e7gnq.js:23908-24052 placement
async function waitForTurnStart(e, signal, s = TURN_HOOKS_SETTLE_MS) {
  let abortController = new AbortController();
  try {
    await Promise.race([e.started, sleep(s, AbortSignal.any([signal, abortController.signal]))]);
  } finally {
    abortController.abort();
  }
}
//@ chunk-0h4e7gnq.js:24052-24879 placement
async function* raiseTurnStep(callModel, n, origin) {
  let turnStep = prepareTurnStep(n);
  if (!turnStep) return yield* callModel(n);
  await waitForTurnStart(turnStep.turn, n.signal);
  let r = {
    requests: 0,
    thrown: undefined,
    isResumeKeptTold: false,
  };
  try {
    let turnStepBlocks = collectTurnStepBlocks();
    yield* bufferUntilFirstRequest(
      eventCallersWrapper2({
        signal: n.signal,
        origin,
        streamCore: {
          "turn.step": makeCoreStepRunner({
            callModel,
            args: n,
            sent: turnStep.e,
            refs: turnStepBlocks,
            state: r,
          }),
        },
      }).turn.step(turnStep.e),
      runTurnStepHooks(turnStepBlocks, turnStep.e.model, makeToolRecordBuilder(n)),
      r,
    );
  } catch (error) {
    let error_2 = r.thrown?.error;
    let { signal } = n;
    if (error_2 !== undefined && (!signal.aborted || isAbortError(error_2))) throw error_2;
    if (signal.aborted && !isAbortError(error))
      throw isAbortError(signal.reason)
        ? signal.reason
        : withTelemetryMessage(
            new AbortError(errorMessage(signal.reason)),
            "function hooks turn.step request aborted (reason not reported: it may contain plugin details)",
          );
    if (!(r.requests === 0 && !isAbortError(error))) throw error;
    logForDebugging(
      `turn.step: the chain failed before the request; it goes without the hooks: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return yield* callModel(n);
  }
  if (r.requests === 0)
    logForDebugging("turn.step: a hook answered without the request; the loop read what it streamed");
}
//@ chunk-0h4e7gnq.js:24879-25012 placement
/**
 * 给查询依赖包装 turn.step 钩子：委托观察上下文或关闭设置钩子时原样返回，否则把 callModel 换成经过 raiseTurnStep 的版本。
 */
function withTurnStepHooks(e, toolUseContext) {
  return isDelegatedObservationContext(toolUseContext.agentContext) ||
    toolUseContext.options?.settingsHooksOff === true
    ? e
    : {
        ...e,
        callModel: (y) => raiseTurnStep(e.callModel, y, toolUseContext.hookOrigin),
      };
}
//@ chunk-0h4e7gnq.js:25012-25243 placement
function sumTurnUsage(transcript, span) {
  try {
    let s = new Map();
    for (let y of sliceTurnMessages(transcript.getSnapshot(), span)) {
      let assistantTokenUsage = getAssistantTokenUsage(y);
      if (assistantTokenUsage && y.type === "assistant") s.set(y.message.id, assistantTokenUsage);
    }
    return sumUsages(s.values());
  } catch (error) {
    logForDebugging("turn.complete: could not read the usage: " + toError(error).message);
    return;
  }
}
//@ chunk-0h4e7gnq.js:25243-25663 placement
function raiseTurnComplete(e) {
  let { turnId, transcript, span, durationMs, isAborted } = e;
  releaseTurnIfCurrent(turnId, isAborted);
  turnStepCounters.forget(turnId);
  let h = lastAssistantMessageForTurnComplete(transcript, span);
  let k = turnOutcomeReason(
    isAborted,
    getTurnRefusal(transcript, span),
    turnEndedWithApiError(transcript, span),
  );
  let w = sumTurnUsage(transcript, span);
  let x = eventCallersWrapper2();
  e.turnEvents.enqueue("turn.complete", () =>
    x.turn
      .complete({
        answer: h,
        durationMs,
        isAborted,
        turnId,
        ...k,
        ...(w && {
          usage: w,
        }),
      })
      .then((L) => (L.text !== h && L.text.trim() !== "" ? [turnCompleteNotice(L.text)] : [])),
  );
  e.turnEvents.enqueue("session.measure", () =>
    measureSession("turn")
      .finally(logModsFirstTurn)
      .then(() => []),
  );
}
//@ chunk-0h4e7gnq.js:25663-25759 placement
/**
 * 是否有 turn.* 钩子
 */
function hasTurnHookSites() {
  try {
    return (
      hasModuleHookingSite("turn.start") ||
      hasModuleHookingSite("turn.step") ||
      hasModuleHookingSite("turn.complete")
    );
  } catch {
    return false;
  }
}
//@ chunk-0h4e7gnq.js:25759-26085 placement
/**
 * 回合开始后异步触发插件的 turn.complete（回答、耗时、是否中止、拒绝/错误信息、用量），失败只记调试日志，最后释放该代理的回合登记。
 */
function fireTurnComplete(e) {
  let { agentId, turnId, answer, refusal, usage, durationMs, isAborted } = e;
  let w = turnOutcomeReason(isAborted, refusal, e.hasEndedInError);
  let x = holdAgentConversation(agentId);
  e.started
    .then(() =>
      eventCallersWrapper2().turn.complete({
        answer,
        durationMs,
        isAborted,
        turnId,
        agentId,
        ...w,
        ...(usage && {
          usage,
        }),
      }),
    )
    .catch((error) =>
      logForDebugging(`turn.complete (agent ${agentId}): ${errorMessage(error)}`, {
        level: "warn",
      }),
    )
    .finally(x);
}
//@ chunk-0h4e7gnq.js:26085-26157 placement
var jr = Object.freeze({
  saw: () => {},
  ended: () => {},
  [Symbol.dispose]: () => {},
});
//@ chunk-0h4e7gnq.js:26157-27320 placement
function raiseTurnLifecycleForAgent(text, agentId, signal, y, origin) {
  let S = y === undefined ? undefined : turnStepSlot.get();
  if (!hasTurnHookSites() && S === undefined) return jr;
  let k = randomUUID();
  let now = Date.now();
  let x = new Map();
  let L;
  let I = "";
  let G = false;
  let ee;
  let te = false;
  let R = false;
  let abortController = new AbortController();
  let signal_2 = AbortSignal.any([signal, abortController.signal]);
  async function V() {
    try {
      await eventCallersWrapper2({
        signal: signal_2,
        origin,
      }).turn.start({
        text,
        turnId: k,
        agentId,
      });
    } catch (error) {
      logForDebugging(`turn.start (agent ${agentId}): ${errorMessage(error)}`, {
        level: "warn",
      });
    }
  }
  let le = {
    turnId: k,
    started: V(),
  };
  bindTurn(agentId, k, le.started);
  async function j() {
    await waitForTurnStart(le, abortController.signal);
    abortController.abort();
  }
  function ie(B) {
    let ce = B && getAssistantTokenUsage(B);
    if (B && ce) x.set(B.message.id, ce);
    if (B !== undefined && !isAbandonedOrUnsignedThinkingMessage(B)) {
      R = true;
      S?.();
    }
  }
  function he(B) {
    let { isAborted, hasFailed, report } = B;
    if (te) return;
    te = true;
    release_2(agentId, k);
    turnStepCounters.forget(k);
    ie(L);
    if (!R) S?.();
    try {
      fireTurnComplete({
        agentId,
        turnId: k,
        answer: report ?? I,
        refusal: ee,
        hasEndedInError: hasFailed || G,
        usage: sumUsages(x.values()),
        durationMs: Date.now() - now,
        isAborted,
        started: j(),
      });
    } catch (error) {
      logForDebugging(`turn.complete (agent ${agentId}): not raised: ` + errorMessage(error), {
        level: "error",
      });
    }
  }
  return {
    saw: (B) => {
      ee = refusalSystemMessage(B) ?? ee;
      if (!(B.type === "assistant" && !B.isVirtual)) return;
      if (L?.message.id !== B.message.id) ie(L);
      L = B;
      G = B.isApiErrorMessage === true;
      I = G
        ? I
        : extractTextContent_2(
            B.message.content,
            `
`,
          ).trim();
    },
    ended: he,
    [Symbol.dispose]: () => {
      he({
        isAborted: signal.aborted,
        hasFailed: !signal.aborted,
      });
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
  turnStepSlot,
};
