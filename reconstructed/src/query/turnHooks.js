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
import { subscribe } from "../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-0h4e7gnq.js:6211-6439 placement
/**
 * 队列命令附件带 source_uuid 时，把消息列表里对应的源消息复制一份并把 uuid 换成附件的 uuid（返回新数组）；找不到时返回 undefined。
 */
function retagQueuedCommandSource(messages, message) {
  if (message.type !== "attachment" || message.attachment.type !== "queued_command") return;
  let sourceUuid = message.attachment.source_uuid;
  let sourceIndex = sourceUuid === undefined ? -1 : messages.findLastIndex((row) => row.uuid === sourceUuid);
  let sourceRow = messages[sourceIndex];
  return sourceRow === undefined
    ? undefined
    : messages.with(sourceIndex, {
        ...sourceRow,
        uuid: message.uuid,
      });
}
//@ chunk-0h4e7gnq.js:6476-6512 placement
/**
 * 回合步骤槽
 */
var turnStepSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0h4e7gnq.js:6476", () => {
  turnStepSlot = identity(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-0h4e7gnq.js:6512-6652 placement
function sliceTurnMessages(snapshot, span) {
  let indexOf = (before) => (before === undefined ? -1 : snapshot.findIndex((row) => row.uuid === before));
  let endIndex = span.next ? indexOf(span.next.before) : snapshot.length;
  return snapshot.slice(indexOf(span.before) + 1, endIndex + 1);
}
//@ chunk-0h4e7gnq.js:6652-6802 placement
function turnEndedWithApiError(transcript, span) {
  let last = sliceTurnMessages(transcript.getSnapshot(), span).findLast(
    (row) => row.type === "assistant" && !row.isVirtual,
  );
  return last?.type === "assistant" && last.isApiErrorMessage === true;
}
//@ chunk-0h4e7gnq.js:6802-6912 placement
function createSessionMeasurer() {
  let measurerSlot = subscribe();
  return {
    setSessionMeasurer: measurerSlot.set,
    measureSession: (context) => measurerSlot.get()?.(context) ?? Promise.resolve(),
  };
}
//@ chunk-0h4e7gnq.js:6912-6924 placement
/**
 * 会话度量器
 */
var sessionMeasurer; // deferred: uses createSessionMeasurer of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0h4e7gnq.js:6912", () => {
  sessionMeasurer = createSessionMeasurer();
});
//@ chunk-0h4e7gnq.js:6924-6950 placement
var measureSession; // deferred: uses sessionMeasurer of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0h4e7gnq.js:6924", () => {
  measureSession = sessionMeasurer.measureSession;
});
//@ chunk-0h4e7gnq.js:6950-6980 placement
var setSessionMeasurer; // deferred: uses sessionMeasurer of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0h4e7gnq.js:6950", () => {
  setSessionMeasurer = sessionMeasurer.setSessionMeasurer;
});
//@ chunk-0h4e7gnq.js:6980-7254 placement
function lastAssistantMessageForTurnComplete(transcript, span) {
  try {
    let last = sliceTurnMessages(transcript.getSnapshot(), span).findLast(
      (row) => row.type === "assistant" && !row.isApiErrorMessage && !row.isVirtual,
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
  let counts = new Map();
  return {
    next: (key) => {
      let current = counts.get(key) ?? 0;
      counts.set(key, current + 1);
      return current;
    },
    forget: (key) => {
      counts.delete(key);
    },
    clear: () => {
      counts.clear();
    },
  };
}
//@ chunk-0h4e7gnq.js:7390-7423 placement
/**
 * 回合步骤计数
 */
var turnStepCounters; // deferred: uses createCounterMap of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0h4e7gnq.js:7390", () => {
  turnStepCounters = identity(createCounterMap(), (counters) => {
    counters.clear();
  });
});
//@ chunk-0h4e7gnq.js:7423-7515 placement
/**
 * 回合结束通知
 */
var turnCompleteNotice = (text) =>
  createSystemMessage(
    `${hookMembersFor("turn.complete")
      .map((member) => sourceLabel(member.name))
      .join("+")}: ${singleLineFieldText(text)}`,
    "notice",
  );
//@ chunk-0h4e7gnq.js:7515-7611 placement
/**
 * 回合结束原因
 */
var turnOutcomeReason = (isAborted, refusal, hasError) =>
  isAborted
    ? {
        reason: "aborted",
      }
    : refusal
      ? {
          reason: "refusal",
          refusal,
        }
      : {
          reason: hasError ? "error" : "answer",
        };
//@ chunk-0h4e7gnq.js:7611-7981 placement
function refusalSystemMessage(row) {
  if (row.type === "system")
    return row.subtype === "model_refusal_no_fallback"
      ? {
          category: row.apiRefusalCategory ?? null,
          explanation: row.apiRefusalExplanation ?? null,
        }
      : undefined;
  return row.type === "assistant" && row.isApiErrorMessage === true && row.message.stop_reason === "refusal"
    ? {
        category: row.message.stop_details?.category ?? null,
        explanation: row.message.stop_details?.explanation ?? null,
      }
    : undefined;
}
//@ chunk-0h4e7gnq.js:7981-8161 placement
function getTurnRefusal(transcript, span) {
  try {
    return sliceTurnMessages(transcript.getSnapshot(), span)
      .flatMap((row) => {
        let refusal = refusalSystemMessage(row);
        return refusal ? [refusal] : [];
      })
      .at(-1);
  } catch (error) {
    logForDebugging("turn.complete: could not read the refusal: " + toError(error).message);
    return;
  }
}
//@ chunk-0h4e7gnq.js:8501-8717 placement
function getAssistantTokenUsage(message) {
  if (message.type !== "assistant") return;
  let isUnmetered = message.isUnmetered === true;
  let usage = isUnmetered
    ? finalContextTokensFromLastResponse(message.message.usage)
    : getTokenUsage(message);
  if (usage === undefined) return;
  let tokenCountFromUsage = getTokenCountFromUsage_3(usage);
  return isUnmetered && Object.values(tokenCountFromUsage).every((value) => value === 0)
    ? undefined
    : {
        ...tokenCountFromUsage,
        model: message.message.model,
      };
}
//@ chunk-0h4e7gnq.js:8717-8853 placement
function isAssistantContentMessage(value) {
  if (!isPlainObject_2(value) || value.type !== "assistant") return false;
  let { message } = value;
  return isPlainObject_2(message) && Array.isArray(message.content) && value.isApiErrorMessage !== true;
}
//@ chunk-0h4e7gnq.js:8853-9138 placement
function streamingFallbackRetraction(snapshots, event) {
  try {
    if (!isPlainObject_2(event)) return snapshots;
    if (event.type === "streaming_fallback_began") return [];
    let { discardedMessages } = event;
    if (!(event.type === "server_fallback" && Array.isArray(discardedMessages))) return snapshots;
    let discardedUuids = new Set(
      discardedMessages.map((discardedMessage) => isPlainObject_2(discardedMessage) && discardedMessage.uuid),
    );
    return snapshots.filter((snapshot) => !discardedUuids.has(snapshot.uuid));
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return snapshots;
  }
}
//@ chunk-0h4e7gnq.js:9138-9342 placement
function snapshotAssistantReply(message) {
  let { uuid, timestamp } = message;
  let { content } = message.message;
  try {
    return {
      uuid,
      timestamp,
      content: structuredClone(content),
      reply: message,
    };
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return {
      uuid,
      timestamp,
      content: [...content],
      reply: message,
    };
  }
}
//@ chunk-0h4e7gnq.js:9342-9381 placement
/**
 * 合法 stop_reason
 */
var validStopReason = (stopReason) => STOP_REASONS.find((candidate) => candidate === stopReason) ?? null;
//@ chunk-0h4e7gnq.js:9381-9434 placement
/**
 * 取助手消息用量
 */
function usageOfMessage(message) {
  return (message === undefined ? undefined : getAssistantTokenUsage(message)) ?? null;
}
//@ chunk-0h4e7gnq.js:9434-9810 placement
/**
 * 维护服务端工具调用表：遇到 server_tool_use/mcp_tool_use 时记下开始时间，遇到对应结果块时补上结束时间；出错时返回原表。
 */
function trackServerToolUse(tools, block, timestamp) {
  try {
    let nowMs = Date.parse(timestamp) || Date.now();
    if (block.type === "server_tool_use" || block.type === "mcp_tool_use") {
      let { id, name, input } = block;
      return tools.has(id)
        ? tools
        : new Map([
            ...tools,
            [
              id,
              {
                id,
                name,
                input,
                startedAt: nowMs,
              },
            ],
          ]);
    }
    let started = "tool_use_id" in block ? tools.get(block.tool_use_id) : undefined;
    return started !== undefined && started.endedAt === undefined
      ? new Map([
          ...tools,
          [
            started.id,
            {
              ...started,
              endedAt: nowMs,
            },
          ],
        ])
      : tools;
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return tools;
  }
}
//@ chunk-0h4e7gnq.js:9810-10289 placement
/**
 * 收集一次 turn.step 请求的助手回复：note 记录每条回复（流式回退时撤回），result 汇总出回答文本、工具调用、服务端工具调用、停止原因与用量。
 */
function createStepResultCollector() {
  let snapshots = [];
  return {
    note: (event) => {
      snapshots = isAssistantContentMessage(event)
        ? [...snapshots, snapshotAssistantReply(event)]
        : streamingFallbackRetraction(snapshots, event);
    },
    result: (turnId, index) => {
      let reply = snapshots.at(-1)?.reply;
      let flattened = snapshots.flatMap((snapshot) => snapshot.content);
      let reduced = snapshots.reduce(
        (acc, snapshot) =>
          snapshot.content.reduce((acc, block) => trackServerToolUse(acc, block, snapshot.timestamp), acc),
        new Map(),
      );
      return {
        turnId,
        index,
        answer: flattened
          .flatMap((block) => (block.type === "text" ? [block.text] : []))
          .join(
            `
`,
          )
          .trim(),
        toolUses: flattened.flatMap((block) =>
          block.type === "tool_use"
            ? [
                {
                  name: block.name,
                  input: block.input,
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
  let reasonText = `turn.step: model ${model} is not allowed by policy; the request keeps ${model_2}`;
  logForDebugging(reasonText, {
    level: "warn",
  });
  emit({
    plugin: "turn.step hooks",
    event: "turn.step",
    reason: reasonText,
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
function getOrCreateBlockState(state, index, kind) {
  let block = state.blocks.get(index) ?? {
    kind,
    tool: undefined,
    text: "",
    record: undefined,
  };
  state.blocks.set(index, block);
  return block;
}
//@ chunk-0h4e7gnq.js:10820-11900 placement
function collectTurnStepBlocks() {
  let heldItems = new Map();
  let filedItems = new Map();
  let responseByItem = new Map();
  let currentResponse;
  function openResponse() {
    currentResponse = {
      ordinal: (currentResponse?.ordinal ?? 0) + 1,
      isStreamed: false,
      blocks: new Map(),
      stop: undefined,
      isClosed: false,
    };
    return currentResponse;
  }
  let currentOrOpen = () => currentResponse ?? openResponse();
  function noteChunk(item) {
    if (isAssistantContentMessage(item)) {
      let apiBlockIndex = item.apiBlockIndex;
      if (apiBlockIndex !== undefined)
        getOrCreateBlockState(currentOrOpen(), apiBlockIndex, "other").record = item;
      return;
    }
    if (item.type === "streaming_fallback_began") {
      currentOrOpen().isClosed = true;
      openResponse();
      return;
    }
    if (item.type !== "stream_event") return;
    let { event } = item;
    if (event.type === "message_start") openResponse().isStreamed = true;
    if (event.type === "message_stop") currentOrOpen().isClosed = true;
    if (event.type === "content_block_start") {
      let contentBlock = event.content_block;
      let blockState = getOrCreateBlockState(
        currentOrOpen(),
        event.index,
        toStepBlockKind(contentBlock.type),
      );
      if (contentBlock.type === "tool_use")
        blockState.tool = {
          id: contentBlock.id,
          name: contentBlock.name,
        };
    }
  }
  return {
    hold: (item) => {
      let ref = heldItems.size + 1;
      heldItems.set(ref, item);
      noteChunk(item);
      responseByItem.set(ref, currentOrOpen());
      return ref;
    },
    read: (ref) => (ref === undefined ? undefined : heldItems.get(ref)),
    filed: (ref, chunk) => {
      filedItems.set(ref, chunk);
      let response = responseByItem.get(ref) ?? currentOrOpen();
      switch (chunk.kind) {
        case "text":
        case "thinking":
          getOrCreateBlockState(response, chunk.index, chunk.kind).text += chunk.text;
          return;
        case "input":
          getOrCreateBlockState(response, chunk.index, "tool").text += chunk.json;
          return;
        case "stop":
          response.stop = {
            ...chunk,
            usage: chunk.usage && {
              ...chunk.usage,
            },
          };
          filedItems.set(ref, response.stop);
          return;
        default:
      }
    },
    sent: (ref) => (ref === undefined ? undefined : filedItems.get(ref)),
    responseOf: (ref) => (ref === undefined ? undefined : responseByItem.get(ref)),
    latest: () => currentResponse,
  };
}
//@ chunk-0h4e7gnq.js:11900-12192 placement
/**
 * 恢复被截断的思考时请求必须保持原模型：写警告日志并向插件诊断上报"模型改写从下一次请求才生效"。
 */
function warnResumeKeepsModel(model) {
  let reasonText = `turn.step: a request resuming a truncated thought keeps its model ${model}; a model rewrite applies from the next request`;
  logForDebugging(reasonText, {
    level: "warn",
  });
  emit({
    plugin: "turn.step hooks",
    event: "turn.step",
    reason: reasonText,
    effect: "the engine sent the request as the thought began",
    hasOverrun: false,
  });
}
//@ chunk-0h4e7gnq.js:12192-12539 placement
/**
 * 包装消息流：在第一次真正发出请求前缓存助手消息，确认有请求后再按序放出；结束时若一次请求都没发，标记助手消息 answeredWithoutRequest。
 */
async function* bufferUntilFirstRequest(source, chain, state) {
  let buffered = [];
  try {
    for await (let item of source)
      for (let out of chain.itemsOf(item))
        if (state.requests === 0 && (buffered.length > 0 || out.type === "assistant")) buffered.push(out);
        else {
          yield* buffered.splice(0);
          yield out;
        }
  } catch (error) {
    if (state.requests > 0) yield* buffered.splice(0);
    throw error;
  }
  let neverRequested = state.requests === 0;
  for (let out of [...buffered, ...chain.end()]) {
    if (neverRequested && out.type === "assistant") out.answeredWithoutRequest = true;
    yield out;
  }
}
//@ chunk-0h4e7gnq.js:12539-12879 placement
/**
 * 构造 turn.step 事件：turnId、步序号、模型、按回合/循环设置解析出的 effort、消息条数、agentId。
 */
function buildTurnStepEvent(turnId, index, args) {
  let { model, effortValue, turnEffort, agentId } = args.options;
  let effortValue_2 = resolveEffortValue(model, effortValue, {
    turnEffort,
    carriedEffort: resolveLoopEffort(
      {
        loopEffort: args.options.refusalFallbackEffort,
        continuesMainConversation: isMainConversationContext(args.options.agentContext),
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
    messageCount: args.messages.length,
    ...(agentId !== undefined && {
      agentId,
    }),
  };
}
//@ chunk-0h4e7gnq.js:12879-13065 placement
function prepareTurnStep(args) {
  try {
    let { agentId } = args.options;
    let turn = agentId === undefined ? currentTurn() : currentTurnBinding(agentId);
    return turn !== undefined && hasModuleHookingSite(TURN_STEP_RULES.event)
      ? {
          turn,
          e: buildTurnStepEvent(turn.turnId, turnStepCounters.next(turn.turnId), args),
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
var parseJsonOrEmpty = (json) => (json === "" ? {} : (safeParseJSON(json) ?? {}));
//@ chunk-0h4e7gnq.js:13189-13514 placement
/**
 * 判断一个流式事件是否只是重复回显了已记录的内容增量（同一块下标，文本、思考或工具输入 JSON 完全相同）。
 */
function isEchoedDelta(chunk, event) {
  if (event.type !== "content_block_delta" || event.index !== chunk.index) return false;
  let { delta } = event;
  switch (chunk.kind) {
    case "text":
      return delta.type === "text_delta" && delta.text === chunk.text;
    case "thinking":
      return delta.type === "thinking_delta" && delta.thinking === chunk.text;
    case "input":
      return delta.type === "input_json_delta" && delta.partial_json === chunk.json;
    default:
      return false;
  }
}
//@ chunk-0h4e7gnq.js:13514-13691 placement
function sameStopAndUsage(left, right) {
  let { usage } = left;
  let { usage: usage_2 } = right;
  let sameStopReason = left.stopReason === right.stopReason;
  return sameStopReason && usage !== null && usage_2 !== null
    ? uniq([...Object.keys(usage), ...Object.keys(usage_2)]).every(
        (tokenKind) => usage[tokenKind] === usage_2[tokenKind],
      )
    : sameStopReason && usage === usage_2;
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
function copyFinalResponseMeta(target, source) {
  target.message.usage = source.message.usage;
  delete target.isUnmetered;
  target.message.stop_reason = source.message.stop_reason;
  target.message.stop_sequence = source.message.stop_sequence;
  target.message.stop_details = source.message.stop_details;
  if (source.message.context_management !== undefined)
    target.message.context_management = source.message.context_management;
  if ("research" in source)
    Object.assign(target, {
      research: source.research,
    });
}
//@ chunk-0h4e7gnq.js:15132-15248 placement
function copyContextManagement(message, record) {
  if (record.message.context_management !== undefined)
    message.message.context_management = record.message.context_management;
}
//@ chunk-0h4e7gnq.js:15248-15528 placement
function makeBlockStartEvent(index, block) {
  let { tool } = block;
  let isTool = block.kind === "tool" && tool !== undefined;
  let isThinking = block.kind === "thinking";
  let contentBlock = isTool
    ? {
        type: "tool_use",
        id: tool.id,
        name: tool.name,
        input: {},
      }
    : isThinking
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
var makeToolBlockStartEvent = (tool) =>
  convertStreamEvent({
    type: "content_block_start",
    index: tool.index,
    content_block: {
      type: "tool_use",
      id: tool.id,
      name: tool.name,
      input: {},
    },
  });
//@ chunk-0h4e7gnq.js:15839-16149 placement
/**
 * 把钩子给出的停止原因与 token 用量写进助手消息，并去掉 isUnmetered。
 */
function applyStepStopAndUsage(message, stop) {
  let { usage } = stop;
  message.message.stop_reason = stop.stopReason;
  if (usage === null) return;
  message.message.usage = {
    ...message.message.usage,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_creation_input_tokens: usage.cache_creation_input_tokens,
    cache_read_input_tokens: usage.cache_read_input_tokens,
  };
  delete message.isUnmetered;
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
var makeHookMessageDelta = (stop) =>
  convertStreamEvent({
    type: "message_delta",
    delta: {
      stop_reason: stop.stopReason,
      stop_sequence: null,
      stop_details: null,
      container: null,
    },
    usage: {
      output_tokens: stop.usage?.output_tokens ?? 0,
      input_tokens: stop.usage?.input_tokens ?? null,
      cache_creation_input_tokens: stop.usage?.cache_creation_input_tokens ?? null,
      cache_read_input_tokens: stop.usage?.cache_read_input_tokens ?? null,
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
function rewriteAssistantContent(original, replacement) {
  let {
    serverClassifierRequest,
    serverClassifierResults,
    wireToolInputs,
    wireIngestContext,
    batchToolUses,
    ...rest
  } = original;
  let rewritten = rest;
  let hasClassifierRequest = original.serverClassifierRequest !== undefined;
  rewritten.message = {
    ...original.message,
    content: replacement.content,
  };
  rewritten.batchToolUses = replacement.batchToolUses;
  if (hasClassifierRequest) {
    rewritten.serverClassifierInputRewritten = true;
    rewritten.serverClassifierOwnInputRewritten = true;
    rewritten.serverClassifierInputRewrite = {
      cause: "turn_step",
      source: "mod",
      byLocalCode: false,
      keptVerdict: false,
    };
  }
  return rewritten;
}
//@ chunk-0h4e7gnq.js:17127-21826 placement
/**
 * 函数钩子 turn.step 的执行器：把一次模型请求的流事件（message_start/content_block/message_delta…）交给插件链，允许插件改写模型、注入工具调用或伪造回复（isMadeUp），并合并回查询循环。
 */
function runTurnStepHooks(
  turnStepBlocks,
  model,
  toolRecordBuilder = (tool, jsonText) => ({
    content: [
      {
        type: "tool_use",
        ...tool,
        input: parseJsonOrEmpty(jsonText),
      },
    ],
  }),
) {
  let state;
  function ensureState() {
    state ??= {
      wire: undefined,
      envelope: undefined,
      isMadeUp: false,
      blocks: new Map(),
      originals: new Map(),
      messages: [],
      isStopped: false,
      stop: undefined,
    };
    return state;
  }
  function* ensureStarted() {
    let current = ensureState();
    if (current.envelope === undefined) {
      let hookMessageStart = makeHookMessageStart(model);
      let { event } = hookMessageStart;
      current.envelope = event.type === "message_start" ? event.message : undefined;
      current.isMadeUp = true;
      yield hookMessageStart;
    }
  }
  function* finishState(state) {
    let { wire } = state;
    let allBlocksSettled =
      wire !== undefined && wire.stop === undefined && wire.isClosed && !hasUnwiredBlock(state);
    if (state.isStopped) return;
    if (allBlocksSettled) {
      yield* endAllBlocks(state);
      copyFinalMeta(state);
      return;
    }
    yield* emitStop(wire?.stop ?? DEFAULT_STOP_BLOCK, "closing");
  }
  function* closeResponse() {
    let current = state;
    if (current === undefined) return;
    yield* finishState(current);
    state = undefined;
    yield messageStopEvent();
  }
  function* alignByRef(ref) {
    let response = turnStepBlocks.responseOf(ref);
    let current = state;
    if (
      response === undefined
        ? current?.isStopped === true
        : current?.wire !== undefined && current.wire !== response
    )
      yield* closeResponse();
    if (response !== undefined) ensureState().wire ??= response;
  }
  function blockAt(index, kind, ref) {
    let current = ensureState();
    let existing = current.blocks.get(index);
    let wire = turnStepBlocks.responseOf(ref)?.blocks.get(index);
    if (existing !== undefined) {
      existing.wire ??= wire;
      return existing;
    }
    let blockState = emptyBlockState(kind, wire);
    current.blocks.set(index, blockState);
    return blockState;
  }
  function hasUnwiredBlock(current) {
    return [...current.blocks.values()].some((block) => block.wire === undefined);
  }
  function* startBlock(index, block) {
    yield* ensureStarted();
    if (!block.isStarted) {
      block.isStarted = true;
      yield makeBlockStartEvent(index, block);
    }
  }
  function echoedEvent(ref, matches) {
    let item = turnStepBlocks.read(ref);
    return item !== undefined && item.type === "stream_event" && matches(item.event) ? item : undefined;
  }
  function recordRewrite(current, original, replacement) {
    let rewritten = rewriteAssistantContent(original, replacement);
    current.originals.set(rewritten, original);
    return rewritten;
  }
  function rewriteTextBlock(current, original, block) {
    if (block.kind !== "text" || block.text === block.wire?.text) return original;
    return block.text === ""
      ? undefined
      : recordRewrite(current, original, {
          content: [
            {
              type: "text",
              text: block.text,
              citations: null,
            },
          ],
        });
  }
  function rewriteToolBlock(current, original, block) {
    let { tool, wire } = block;
    if (
      tool !== undefined &&
      tool.id === wire?.tool?.id &&
      tool.name === wire.tool.name &&
      block.text === wire.text
    )
      return original;
    if (tool === undefined) return;
    return recordRewrite(current, original, toolRecordBuilder(tool, block.text));
  }
  function applyRecordToItem(current, record) {
    let blockIndex = record.apiBlockIndex ?? -1;
    let wireBlock = current.wire?.blocks.get(blockIndex);
    let blockState = current.blocks.get(blockIndex);
    if (blockState !== undefined) {
      blockState.isEnded = record.isAbortedMidStream !== true;
      blockState.isRecordSeen = true;
    }
    if (!(wireBlock?.kind === "text" || wireBlock?.kind === "tool")) return record;
    if (blockState === undefined) return;
    return wireBlock?.kind === "text"
      ? rewriteTextBlock(current, record, blockState)
      : rewriteToolBlock(current, record, blockState);
  }
  function shouldEmitEnd(current, blockState, mode) {
    let { wire } = blockState;
    let textBlockClosing = mode === "closing" && wire?.kind === "text" && current.wire?.isClosed === false;
    return wire?.record !== undefined ? !blockState.isRecordSeen : wire === undefined || textBlockClosing;
  }
  function* endBlock(current, index, mode) {
    let blockState = current.blocks.get(index);
    if (blockState === undefined || blockState.isEnded) return;
    blockState.isEnded = true;
    if (!shouldEmitEnd(current, blockState, mode)) return;
    let { envelope } = current;
    let hookAssistantMessage = buildHookAssistantMessage({
      index,
      state: blockState,
      envelope,
      isMadeUp:
        blockState.wire === undefined &&
        (current.isMadeUp || finalContextTokensFromLastResponse(envelope?.usage) === undefined),
      model,
      toolRecord: toolRecordBuilder,
    });
    if (hookAssistantMessage !== undefined) {
      current.originals.set(hookAssistantMessage, blockState.wire?.record);
      current.messages = [...current.messages, hookAssistantMessage];
      yield hookAssistantMessage;
    }
  }
  function* endAllBlocks(current) {
    for (let [index, blockState] of current.blocks) {
      if (blockState.isEnded) continue;
      yield* endBlock(current, index, "closing");
      if (blockState.isStarted) yield contentBlockStopEvent(index);
    }
  }
  function copyFinalMeta(current) {
    for (let [message, original] of current.originals)
      if (original !== undefined) copyFinalResponseMeta(message, original);
  }
  function finalizeMeta(current, fromHook) {
    let { stop } = current;
    copyFinalMeta(current);
    let record = [...(current.wire?.blocks.values() ?? [])].find(
      (wireBlock) => wireBlock.record?.message.context_management != null,
    )?.record;
    for (let [message, original] of current.originals) {
      if (original === undefined && stop !== undefined) applyStepStopAndUsage(message, stop);
      if (original === undefined && record !== undefined) copyContextManagement(message, record);
    }
    if (fromHook && stop !== undefined)
      for (let message of current.messages) applyStepStopAndUsage(message, stop);
  }
  function* emitStop(stop, mode) {
    yield* alignByRef(stop.ref);
    yield* ensureStarted();
    let current = ensureState();
    let sentStop = turnStepBlocks.sent(stop.ref);
    let alreadySent = sentStop?.kind === "stop" && sameStopAndUsage(stop, sentStop);
    current.stop = stop;
    yield* endAllBlocks(current);
    finalizeMeta(current, mode === "hook" && !alreadySent);
    current.isStopped = true;
    yield (alreadySent ? echoedEvent(stop.ref, (event) => event.type === "message_delta") : undefined) ??
      makeHookMessageDelta(stop);
  }
  function* relayEngineEvent(item, ref) {
    let { event } = item;
    if (event.type === "message_start") {
      yield* closeResponse();
      let current = ensureState();
      current.envelope = event.message;
      current.wire = turnStepBlocks.responseOf(ref);
      yield item;
      return;
    }
    if (
      event.type === "content_block_start" ||
      event.type === "content_block_stop" ||
      event.type === "message_stop"
    )
      yield* alignByRef(ref);
    switch (event.type) {
      case "content_block_start": {
        let blockType = event.content_block.type;
        let keepKind = blockType === "text" || blockType === "thinking";
        yield* ensureStarted();
        blockAt(event.index, keepKind ? blockType : "other", ref).isStarted = true;
        yield item;
        return;
      }
      case "content_block_stop":
        yield* endBlock(ensureState(), event.index, "engine");
        yield item;
        return;
      case "message_stop":
        if (state !== undefined) yield* finishState(state);
        state = undefined;
        yield item;
        return;
      default:
        yield item;
    }
  }
  function* relayEngineChunk(chunk) {
    let item = turnStepBlocks.read(chunk.ref);
    if (item === undefined) {
      logForDebugging(
        `turn.step: an engine chunk names no item of this step (ref ${String(chunk.ref)}); dropped`,
      );
      return;
    }
    if (isAssistantContentMessage(item) && turnStepBlocks.responseOf(chunk.ref)?.isStreamed === false) {
      yield* closeResponse();
      yield item;
      return;
    }
    if (isAssistantContentMessage(item)) {
      yield* alignByRef(chunk.ref);
      yield* ensureStarted();
      let current = ensureState();
      let rewritten = applyRecordToItem(current, item);
      if (rewritten !== undefined) {
        current.messages = [...current.messages, rewritten];
        yield rewritten;
      }
      return;
    }
    if (item.type === "stream_event") {
      yield* relayEngineEvent(item, chunk.ref);
      return;
    }
    yield item;
  }
  function* relayDeltaChunk(chunk) {
    yield* alignByRef(chunk.ref);
    let blockState = blockAt(chunk.index, chunk.kind === "input" ? "tool" : chunk.kind, chunk.ref);
    yield* startBlock(chunk.index, blockState);
    blockState.text += chunk.kind === "input" ? chunk.json : chunk.text;
    yield echoedEvent(chunk.ref, (event) => isEchoedDelta(chunk, event)) ?? deltaEventForKind(chunk);
  }
  function* relayToolChunk(chunk) {
    yield* alignByRef(chunk.ref);
    let blockState = blockAt(chunk.index, "tool", chunk.ref);
    blockState.tool = {
      id: chunk.id,
      name: chunk.name,
    };
    yield* ensureStarted();
    blockState.isStarted = true;
    yield echoedEvent(
      chunk.ref,
      (event) =>
        event.type === "content_block_start" &&
        event.index === chunk.index &&
        event.content_block.type === "tool_use" &&
        event.content_block.id === chunk.id &&
        event.content_block.name === chunk.name,
    ) ?? makeToolBlockStartEvent(chunk);
  }
  return {
    *itemsOf(chunk) {
      switch (chunk.kind) {
        case "engine":
          return yield* relayEngineChunk(chunk);
        case "text":
        case "thinking":
        case "input":
          return yield* relayDeltaChunk(chunk);
        case "tool":
          return yield* relayToolChunk(chunk);
        case "stop":
          return yield* emitStop(chunk, "hook");
        default:
          logForDebugging("turn.step: a chunk of no known kind came out of the chain; dropped");
      }
    },
    end: closeResponse,
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
  let lastReply;
  function chunkOfEvent(event, ref) {
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
              usage: usageOfMessage(lastReply),
              ref,
            }
          : undefined;
      default:
        return;
    }
  }
  return {
    chunkOf(event) {
      let ref = refs.hold(event);
      let isReply = isAssistantContentMessage(event);
      if (isReply || (event.type === "stream_event" && event.event.type === "message_start"))
        lastReply = isReply ? event : undefined;
      let chunk = (event.type === "stream_event" ? chunkOfEvent(event.event, ref) : undefined) ?? {
        kind: "engine",
        ref,
      };
      refs.filed(ref, chunk);
      return chunk;
    },
  };
}
//@ chunk-0h4e7gnq.js:22824-22962 placement
/**
 * 判断最后一条有效消息是否是同一模型族的助手消息（可以在该模型上继续未完成的思考）；出错返回 false。
 */
function canResumeThinkingOnModel(messages, model) {
  try {
    let lastRow =
      messages[
        messages.findLastIndex(
          (row) => !isNonConversationMessage(row) && !isAbandonedOrUnsignedThinkingMessage(row),
        )
      ];
    return lastRow?.type === "assistant" && !isForeignModelMessage(lastRow, stripAnyVersatileSuffix(model));
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-0h4e7gnq.js:22962-23285 placement
/**
 * 按 turn.step 钩子的结果算出本次请求的 options：恢复截断思考且模型不可换时保持原模型（并提示一次），否则采用钩子模型（受允许列表限制）；effort 被改时附 hookEffortValue。
 */
function resolveStepModelOptions(call, sent) {
  let { options } = call.args;
  let effortChanged = sent.effort !== call.sent.effort && sent.effort !== undefined;
  let keepsModel =
    options.resumeIncompleteThinking === true &&
    sent.model !== options.model &&
    !canResumeThinkingOnModel(call.args.messages, sent.model);
  if (keepsModel && !call.state.isResumeKeptTold) {
    call.state.isResumeKeptTold = true;
    warnResumeKeepsModel(options.model);
  }
  return {
    ...options,
    model: keepsModel ? options.model : warnTurnStepModelNotAllowed(sent.model, options.model),
    ...(effortChanged && {
      hookEffortValue: sent.effort,
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
  run: (stepSent) =>
    (async function* () {
      state.requests += 1;
      state.thrown = undefined;
      let stepResultCollector = createStepResultCollector();
      let streamChunker = createStreamChunker(refs);
      let stream = callModel({
        ...args,
        options: resolveStepModelOptions(
          {
            callModel,
            args,
            sent,
            refs,
            state,
          },
          stepSent,
        ),
      });
      try {
        for await (let event of stream) {
          stepResultCollector.note(event);
          yield streamChunker.chunkOf(event);
        }
      } catch (error) {
        state.thrown = {
          error,
        };
        throw error;
      }
      return stepResultCollector.result(stepSent.turnId, stepSent.index);
    })(),
});
//@ chunk-0h4e7gnq.js:23647-23896 placement
/**
 * 生成把工具名+输入规范化成助手内容（含批量工具拆分）的函数，供钩子构造工具调用块。
 */
var makeToolRecordBuilder = (args) => (tool, input) => {
  let { agentId, storageV5 } = args.options;
  let { content, batchToolUses } = isBatchToolsUse(
    normalizeContentFromAPI(
      [
        {
          type: "tool_use",
          id: tool.id,
          name: tool.name,
          input,
        },
      ],
      args.tools,
      agentId,
      undefined,
      storageV5,
    ),
    args.tools,
    (name, input) => normalizeToolInput_2(name, input, agentId, storageV5),
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
async function waitForTurnStart(turn, signal, timeoutMs = TURN_HOOKS_SETTLE_MS) {
  let abortController = new AbortController();
  try {
    await Promise.race([turn.started, sleep(timeoutMs, AbortSignal.any([signal, abortController.signal]))]);
  } finally {
    abortController.abort();
  }
}
//@ chunk-0h4e7gnq.js:24052-24879 placement
async function* raiseTurnStep(callModel, args, origin) {
  let turnStep = prepareTurnStep(args);
  if (!turnStep) return yield* callModel(args);
  await waitForTurnStart(turnStep.turn, args.signal);
  let state = {
    requests: 0,
    thrown: undefined,
    isResumeKeptTold: false,
  };
  try {
    let turnStepBlocks = collectTurnStepBlocks();
    yield* bufferUntilFirstRequest(
      eventCallersWrapper2({
        signal: args.signal,
        origin,
        streamCore: {
          "turn.step": makeCoreStepRunner({
            callModel,
            args,
            sent: turnStep.e,
            refs: turnStepBlocks,
            state,
          }),
        },
      }).turn.step(turnStep.e),
      runTurnStepHooks(turnStepBlocks, turnStep.e.model, makeToolRecordBuilder(args)),
      state,
    );
  } catch (error) {
    let error_2 = state.thrown?.error;
    let { signal } = args;
    if (error_2 !== undefined && (!signal.aborted || isAbortError(error_2))) throw error_2;
    if (signal.aborted && !isAbortError(error))
      throw isAbortError(signal.reason)
        ? signal.reason
        : withTelemetryMessage(
            new AbortError(errorMessage(signal.reason)),
            "function hooks turn.step request aborted (reason not reported: it may contain plugin details)",
          );
    if (!(state.requests === 0 && !isAbortError(error))) throw error;
    logForDebugging(
      `turn.step: the chain failed before the request; it goes without the hooks: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return yield* callModel(args);
  }
  if (state.requests === 0)
    logForDebugging("turn.step: a hook answered without the request; the loop read what it streamed");
}
//@ chunk-0h4e7gnq.js:24879-25012 placement
/**
 * 给查询依赖包装 turn.step 钩子：委托观察上下文或关闭设置钩子时原样返回，否则把 callModel 换成经过 raiseTurnStep 的版本。
 */
function withTurnStepHooks(deps, toolUseContext) {
  return isDelegatedObservationContext(toolUseContext.agentContext) ||
    toolUseContext.options?.settingsHooksOff === true
    ? deps
    : {
        ...deps,
        callModel: (args) => raiseTurnStep(deps.callModel, args, toolUseContext.hookOrigin),
      };
}
//@ chunk-0h4e7gnq.js:25012-25243 placement
function sumTurnUsage(transcript, span) {
  try {
    let usageById = new Map();
    for (let row of sliceTurnMessages(transcript.getSnapshot(), span)) {
      let assistantTokenUsage = getAssistantTokenUsage(row);
      if (assistantTokenUsage && row.type === "assistant") usageById.set(row.message.id, assistantTokenUsage);
    }
    return sumUsages(usageById.values());
  } catch (error) {
    logForDebugging("turn.complete: could not read the usage: " + toError(error).message);
    return;
  }
}
//@ chunk-0h4e7gnq.js:25243-25663 placement
function raiseTurnComplete(turnEnd) {
  let { turnId, transcript, span, durationMs, isAborted } = turnEnd;
  releaseTurnIfCurrent(turnId, isAborted);
  turnStepCounters.forget(turnId);
  let answer = lastAssistantMessageForTurnComplete(transcript, span);
  let outcome = turnOutcomeReason(
    isAborted,
    getTurnRefusal(transcript, span),
    turnEndedWithApiError(transcript, span),
  );
  let usage = sumTurnUsage(transcript, span);
  let callers = eventCallersWrapper2();
  turnEnd.turnEvents.enqueue("turn.complete", () =>
    callers.turn
      .complete({
        answer,
        durationMs,
        isAborted,
        turnId,
        ...outcome,
        ...(usage && {
          usage,
        }),
      })
      .then((result) =>
        result.text !== answer && result.text.trim() !== "" ? [turnCompleteNotice(result.text)] : [],
      ),
  );
  turnEnd.turnEvents.enqueue("session.measure", () =>
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
function fireTurnComplete(turnEnd) {
  let { agentId, turnId, answer, refusal, usage, durationMs, isAborted } = turnEnd;
  let outcome = turnOutcomeReason(isAborted, refusal, turnEnd.hasEndedInError);
  let releaseHold = holdAgentConversation(agentId);
  turnEnd.started
    .then(() =>
      eventCallersWrapper2().turn.complete({
        answer,
        durationMs,
        isAborted,
        turnId,
        agentId,
        ...outcome,
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
    .finally(releaseHold);
}
//@ chunk-0h4e7gnq.js:26085-26157 placement
var NO_TURN_HOOKS_HANDLE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0h4e7gnq.js:26085", () => {
  NO_TURN_HOOKS_HANDLE = Object.freeze({
    saw: () => {},
    ended: () => {},
    [Symbol.dispose]: () => {},
  });
});
//@ chunk-0h4e7gnq.js:26157-27320 placement
function raiseTurnLifecycleForAgent(text, agentId, signal, tick, origin) {
  let onSaw = tick === undefined ? undefined : turnStepSlot.get();
  if (!hasTurnHookSites() && onSaw === undefined) return NO_TURN_HOOKS_HANDLE;
  let turnId = randomUUID();
  let now = Date.now();
  let usageById = new Map();
  let lastAssistant;
  let answerText = "";
  let endedInError = false;
  let refusal;
  let endedAlready = false;
  let sawRealAssistant = false;
  let abortController = new AbortController();
  let signal_2 = AbortSignal.any([signal, abortController.signal]);
  async function raiseStart() {
    try {
      await eventCallersWrapper2({
        signal: signal_2,
        origin,
      }).turn.start({
        text,
        turnId,
        agentId,
      });
    } catch (error) {
      logForDebugging(`turn.start (agent ${agentId}): ${errorMessage(error)}`, {
        level: "warn",
      });
    }
  }
  let turn = {
    turnId,
    started: raiseStart(),
  };
  bindTurn(agentId, turnId, turn.started);
  async function waitStarted() {
    await waitForTurnStart(turn, abortController.signal);
    abortController.abort();
  }
  function noteMessage(message) {
    let usage = message && getAssistantTokenUsage(message);
    if (message && usage) usageById.set(message.message.id, usage);
    if (message !== undefined && !isAbandonedOrUnsignedThinkingMessage(message)) {
      sawRealAssistant = true;
      onSaw?.();
    }
  }
  function end(endInfo) {
    let { isAborted, hasFailed, report } = endInfo;
    if (endedAlready) return;
    endedAlready = true;
    release_2(agentId, turnId);
    turnStepCounters.forget(turnId);
    noteMessage(lastAssistant);
    if (!sawRealAssistant) onSaw?.();
    try {
      fireTurnComplete({
        agentId,
        turnId,
        answer: report ?? answerText,
        refusal,
        hasEndedInError: hasFailed || endedInError,
        usage: sumUsages(usageById.values()),
        durationMs: Date.now() - now,
        isAborted,
        started: waitStarted(),
      });
    } catch (error) {
      logForDebugging(`turn.complete (agent ${agentId}): not raised: ` + errorMessage(error), {
        level: "error",
      });
    }
  }
  return {
    saw: (message) => {
      refusal = refusalSystemMessage(message) ?? refusal;
      if (!(message.type === "assistant" && !message.isVirtual)) return;
      if (lastAssistant?.message.id !== message.message.id) noteMessage(lastAssistant);
      lastAssistant = message;
      endedInError = message.isApiErrorMessage === true;
      answerText = endedInError
        ? answerText
        : extractTextContent_2(
            message.message.content,
            `
`,
          ).trim();
    },
    ended: end,
    [Symbol.dispose]: () => {
      end({
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
