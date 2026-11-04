/**
 * bridge/remoteBridgeSettle.ts
 *
 * 2.1.316 新增：创建发往 Remote Control 的消息过滤器：按账户记忆工具位置与内容类型隐去敏感内容并做缓存；在预算时间内轮询直到消息投递落定（live/connect 阶段、会话变更、桥接失败），返回结算结果等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4cm44bmp.js (27)
 * attribution: placement 27
 */
import { sleep } from "../utils/sleep.js";
import { errorMessage } from "../utils/errors.js";
import {
  REMOTE_RESULT_FIELDS,
  CLASSIFIER_CONTEXT_FIELDS,
} from "../services/remoteTools/classifierContext.js";
import { buildMcpToolName } from "../services/mcp/mcpStringUtils.js";
import { isTrustedMemoryTool } from "../services/mcp/memoryServerVerification.js";
import { isPostCompactHookContent } from "../services/compact/prompt.js";
import { redactAccountMemoryInput } from "../utils/messages/accountMemory.js";
import { pickByHelper } from "../utils/git/gitSafeEnv.js";
import { LOCAL_COMMAND_STDOUT } from "../constants/xml.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, _enum, numberSchema, booleanSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { BRIEF_TOOL_NAME } from "../tools/BriefTool/prompt.js";
import { PUSHNOTIFICATION } from "../tools/PushNotificationTool/constants.js";
import { isEphemeralStreamMessage } from "../cli/transports/ccrClient.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-4cm44bmp.js:2705-3202 placement
/**
 * 发送并处理服务端要求的 epoch 跟进：被拒时用新 epoch 重发，返回结局（not_refused/followed_up）。
 */
async function sendWithEpochFollowUps({ heldEpoch, send, maySendAgain }) {
  let epoch = heldEpoch;
  let sessionEpoch;
  for (let i = 0; ; i++) {
    let followUps = [];
    let answer = await send(epoch, (followUpEpoch) => {
      followUps.push(followUpEpoch);
    });
    if (followUps.length === 0)
      return {
        ending: i === 0 ? "not_refused" : "followed_up",
        answer,
        followUps: i,
        sessionEpoch,
      };
    let last = followUps.at(-1);
    sessionEpoch = last ?? sessionEpoch;
    if (!maySendAgain())
      return {
        ending: "withheld",
        answer: null,
        followUps: i,
        sessionEpoch,
      };
    if (last === undefined || i === 2)
      return {
        ending: "unfenced_fallback",
        answer: await send(undefined, () => {}),
        followUps: i,
        sessionEpoch,
        fallbackReason: last === undefined ? "no_session_epoch" : "follow_up_cap",
      };
    epoch = last;
  }
}
//@ chunk-4cm44bmp.js:3202-3212 placement
var DEFAULT_SETTLE_POLL_MS = 50;
//@ chunk-4cm44bmp.js:3212-6584 placement
/**
 * 在预算时间内轮询直到消息投递落定（live/connect 阶段、会话变更、桥接失败），返回结算结果。
 */
async function settleRemoteBridgeDelivery(bridge, options) {
  let now = options.now ?? Date.now;
  let sleepFn = options.sleep ?? ((ms, signal) => sleep(ms, signal));
  let pollMs = options.pollMs ?? DEFAULT_SETTLE_POLL_MS;
  let budgetMs = Number.isFinite(options.budgetMs) ? options.budgetMs : 0;
  let startedAt = 0;
  let deadline = 0;
  let elapsedMs = () => {
    try {
      return now() - startedAt;
    } catch {
      return 0;
    }
  };
  let awaited = [];
  let sessionKind = "live";
  let stage = "connect";
  let log = (message) => {
    try {
      options.log?.(message);
    } catch {}
  };
  let checkStop = () => {
    if (options.signal?.aborted) return "aborted";
    if (bridge.isSessionOver()) return "session_changed";
    if (bridge.hasFailedForGood()) return "bridge_failed";
    return now() >= deadline ? "budget_passed" : undefined;
  };
  let noteStage = (nextStage) => {
    stage = nextStage;
    awaited.push(nextStage);
  };
  let waitUntil = async (predicate) => {
    for (;;) {
      let stop = checkStop();
      if (stop === "aborted" || stop === "session_changed" || stop === "bridge_failed") return stop;
      if (predicate()) return;
      if (stop !== undefined) return stop;
      await sleepFn(Math.min(pollMs, deadline - now()), options.signal);
    }
  };
  let awaitSettled = async (promise) => {
    let status = "pending";
    let error;
    let settled = promise.then(
      () => {
        status = "settled";
      },
      (error_2) => {
        status = "threw";
        error = error_2;
      },
    );
    await Promise.race([settled, Promise.resolve()]);
    for (;;) {
      let current = (() => status)();
      if (current === "threw") throw error;
      if (current === "settled") return;
      let stop = checkStop();
      if (stop !== undefined) return stop;
      await Promise.race([settled, sleepFn(Math.min(pollMs, deadline - now()), options.signal)]);
    }
  };
  let report = (outcome) => {
    let summary = outcome.ok
      ? "uploads handed over, queues empty"
      : `${outcome.reason} on ${outcome.waitingOn}`;
    log(
      `[handoff-wait] end: ${summary} after ${outcome.elapsedMs} ms; session kind ${outcome.sessionKind}; awaited ${awaited.join(", ") || "nothing"}`,
    );
    return outcome;
  };
  let finish = (reason, waitingOn) => {
    if (reason === "budget_passed")
      try {
        options.onBudgetPassed?.(waitingOn);
      } catch {}
    return report({
      ok: false,
      reason,
      sessionKind,
      waitingOn,
      elapsedMs: elapsedMs(),
    });
  };
  let sleepPoll = () => sleepFn(Math.max(0, Math.min(pollMs, deadline - now())), options.signal);
  let releaseDeferred = async () => {
    sessionKind = bridge.sessionKind();
    if (sessionKind !== "deferred") return;
    let stop = checkStop();
    if (stop !== undefined) return stop;
    noteStage("release");
    return awaitSettled(bridge.release());
  };
  try {
    startedAt = now();
    deadline = startedAt + budgetMs;
    sessionKind = bridge.sessionKind();
    log(`[handoff-wait] start: session kind ${sessionKind}, budget ${budgetMs} ms`);
    let initialTransport = bridge.transport();
    let initialDropped = bridge.droppedBatches(initialTransport);
    let stop = await releaseDeferred();
    if (stop !== undefined) return finish(stop, "release");
    let transcriptCopy = bridge.transcriptCopy;
    for (;;) {
      stop = checkStop();
      if (stop !== undefined) return finish(stop, "connect");
      let transport = bridge.transport();
      let baseDropped = transport === initialTransport ? initialDropped : 0;
      let didDropRows = () => {
        let dropped = bridge.droppedBatches(transport) - baseDropped;
        if (dropped > 0) log(`[handoff-wait] batches dropped during the wait: ${dropped}`);
        return dropped > 0;
      };
      noteStage("connect");
      stop = await waitUntil(bridge.isConnected);
      if (stop !== undefined) return finish(stop, "connect");
      stop = await releaseDeferred();
      if (stop !== undefined) return finish(stop, "release");
      if (transcriptCopy !== undefined) {
        noteStage("transcript_copy_install");
        stop = await waitUntil(transcriptCopy.isInstalledOnCurrentTransport);
        if (stop !== undefined) return finish(stop, "transcript_copy_install");
        noteStage("transcript_copy_catch_up");
        let catchUp = transcriptCopy.catchUp();
        transcriptCopy.wakeCatchUp();
        stop = await awaitSettled(catchUp);
        if (stop !== undefined) return finish(stop, "transcript_copy_catch_up");
        if (transcriptCopy.catchUp() !== catchUp) {
          if (didDropRows()) return finish("rows_dropped", "transcript_copy_catch_up");
          await sleepPoll();
          continue;
        }
      }
      stage = "first_history_flush";
      let firstFlush = bridge.firstHistoryFlush();
      if (firstFlush !== undefined) {
        awaited.push("first_history_flush");
        stop = await awaitSettled(firstFlush);
        if (stop !== undefined) return finish(stop, "first_history_flush");
      }
      stage = "held_writes";
      if (bridge.holdsWrites()) {
        awaited.push("held_writes");
        stop = await waitUntil(() => !bridge.holdsWrites());
        if (stop !== undefined) return finish(stop, "held_writes");
      }
      noteStage("upload_lanes");
      let isLaneStuck = false;
      stop = await awaitSettled(
        bridge.drainLanes(Math.max(0, deadline - now())).then((laneResult) => {
          isLaneStuck = laneResult === false;
        }),
      );
      if (stop !== undefined || isLaneStuck) return finish(stop ?? "budget_passed", "upload_lanes");
      if (didDropRows()) return finish("rows_dropped", "upload_lanes");
      if (bridge.transport() !== transport || !bridge.isConnected() || bridge.holdsWrites()) {
        await sleepPoll();
        continue;
      }
      break;
    }
    if (options.signal?.aborted) return finish("aborted", "upload_lanes");
    if (bridge.isSessionOver()) return finish("session_changed", "upload_lanes");
    if (bridge.hasFailedForGood()) return finish("bridge_failed", "upload_lanes");
    return report({
      ok: true,
      reason: "handed_over",
      sessionKind,
      elapsedMs: elapsedMs(),
    });
  } catch (error) {
    log(`[handoff-wait] ${stage} threw: ${errorMessage(error)}`);
    try {
      options.onFault?.(stage);
    } catch {}
    return finish("fault", stage);
  }
}
//@ chunk-4cm44bmp.js:6584-6612 placement
/**
 * 空的 async 函数，作为远程桥接 settle 流程的占位钩子。
 */
async function noopAsync() {
  return;
}
//@ chunk-4cm44bmp.js:6612-6629 placement
/**
 * 空函数占位（远程桥接 settle 流程的回调默认值）。
 */
function noop(unused) {}
//@ chunk-4cm44bmp.js:6629-6648 placement
/**
 * 接收两个参数的空函数，作为远程桥接 settle 流程的占位回调。
 */
function noopTwoArgs(unused, unusedOther) {}
//@ chunk-4cm44bmp.js:6648-8797 placement
/**
 * 向 Remote Control 隐去内容时使用的占位文本（账户记忆、工具结果、消息内容）。
 */
var WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WITHHELD_TOOL_RESULT_TEXT;
var WITHHELD_MESSAGE_TEXT;
var WITHHELD_COMMAND_OUTPUT_TEXT;
var WITHHELD_SUMMARY_NOTICE;
var MAX_REDACTED_STRING_CHARS;
var REDACTABLE_EVENT_TYPES;
var ACCOUNT_MEMORY_ATTACHMENT_TYPES;
var ANTHROPIC_MEMORY;
var ACCOUNT_MEMORY_SAVED;
var ACCOUNT_MEMORY;
var MESSAGE_ENVELOPE_KEYS;
var MESSAGE_ROLE_KEYS;
var HOOK_PAYLOAD_KEYS_BY_TYPE;
var CONTENT_BEARING_KEYS;
var WIRE_INPUT_KEYS;
var TOOL_USE_BLOCK_TYPES;
var TOOL_RESULT_BLOCK_TYPES;
var CONTENT_RICH_HOOK_EVENTS;
var HOOK_EVENTS_WITH_CONTENT;
var POSTCOMPACT;
var REDACTABLE_TEXT_BLOCK_TYPES;
deferInit("chunk-4cm44bmp.js:6648", () => {
  WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER =
    "[account memory withheld from Remote Control; shown in the terminal session]";
  WITHHELD_TOOL_RESULT_TEXT = "[tool result withheld from Remote Control; shown in the terminal session]";
  WITHHELD_MESSAGE_TEXT = "[message content withheld from Remote Control; shown in the terminal session]";
  WITHHELD_COMMAND_OUTPUT_TEXT =
    "[command output withheld from Remote Control: it may repeat the conversation summary, which can include account memory; shown in the terminal session]";
  WITHHELD_SUMMARY_NOTICE =
    "This session is being continued from a previous conversation that ran out of context. The summary of that conversation is not included here: it was withheld from Remote Control because it may include account memory, and can be read only in the terminal session where it was written. If you need details from the earlier conversation, ask the user.";
  MAX_REDACTED_STRING_CHARS = 32768;
  REDACTABLE_EVENT_TYPES = new Set([
    "assistant",
    "user",
    "stream_event",
    "attachment",
    "system",
    "control_request",
  ]);
  ACCOUNT_MEMORY_ATTACHMENT_TYPES = new Set(["cowork_memory_context", "account_memory_recall"]);
  ANTHROPIC_MEMORY = "anthropic/memory.";
  ACCOUNT_MEMORY_SAVED = "account_memory_saved";
  ACCOUNT_MEMORY = "account_memory";
  MESSAGE_ENVELOPE_KEYS = [
    "type",
    "subtype",
    "uuid",
    "parentUuid",
    "logicalParentUuid",
    "timestamp",
    "sessionId",
    "cwd",
    "version",
    "gitBranch",
    "isSidechain",
    "agentId",
    "userType",
    "entrypoint",
    "teamName",
    "agentName",
    "promptId",
    "requestId",
    "isMeta",
    "isVirtual",
    "isCompactSummary",
    "repeatsCompactSummary",
    "isVisibleInTranscriptOnly",
    "sourceToolAssistantUUID",
  ];
  MESSAGE_ROLE_KEYS = ["role", "id", "type", "model", "stop_reason", "usage"];
  HOOK_PAYLOAD_KEYS_BY_TYPE = {
    string: [
      "type",
      "toolUseID",
      "processId",
      "hookName",
      "hookEvent",
      "toolName",
      "permissionMode",
      "host",
      "decision",
      "disposition",
      "traceparent",
    ],
    number: ["exitCode", "durationMs", "timeoutMs"],
    boolean: ["timedOut", "unverified", "heldForServedCall", "accountMemoryBatch"],
  };
  CONTENT_BEARING_KEYS = ["content", "message", "stdout", "stderr", "lines"];
  WIRE_INPUT_KEYS = ["wireToolInputs", "wire_tool_inputs", "wireIngestContext", "wire_ingest_context"];
  TOOL_USE_BLOCK_TYPES = new Set(["tool_use", "server_tool_use", "mcp_tool_use"]);
  TOOL_RESULT_BLOCK_TYPES = new Set(["tool_result", "mcp_tool_result"]);
  CONTENT_RICH_HOOK_EVENTS = new Set(["PostToolBatch", "Elicitation", "ElicitationResult"]);
  HOOK_EVENTS_WITH_CONTENT = new Set([
    "PreToolUse",
    "PostToolUse",
    "PostToolUseFailure",
    "PostToolBatch",
    "PermissionRequest",
    "PermissionDenied",
    "Elicitation",
    "ElicitationResult",
  ]);
  POSTCOMPACT = "PostCompact";
  REDACTABLE_TEXT_BLOCK_TYPES = new Set(["text", "thinking", "redacted_thinking"]);
});
//@ chunk-4cm44bmp.js:8797-8849 placement
function isObject(value) {
  return typeof value === "object" && value !== null;
}
//@ chunk-4cm44bmp.js:8849-9114 placement
class BoundedIdSet {
  max;
  ids = new Set();
  constructor(max) {
    this.max = max;
  }
  has(id) {
    return this.ids.has(id);
  }
  add(id) {
    if (this.ids.has(id)) return;
    this.ids.add(id);
    if (this.ids.size > this.max) {
      let oldest = this.ids.values().next().value;
      if (oldest !== undefined) this.ids.delete(oldest);
    }
  }
  delete(id) {
    return this.ids.delete(id);
  }
}
//@ chunk-4cm44bmp.js:9114-9269 placement
function hasAnthropicMemoryMeta(result) {
  for (let field of REMOTE_RESULT_FIELDS) {
    let value = result[field];
    if (!isObject(value)) continue;
    let meta = isObject(value._meta) ? value._meta : value;
    if (Object.keys(meta).some((key) => key.startsWith(ANTHROPIC_MEMORY))) return true;
  }
  return false;
}
//@ chunk-4cm44bmp.js:9269-9431 placement
function getToolUseQualifiedName(block) {
  if (typeof block.name !== "string") return;
  if (block.type !== "mcp_tool_use") return block.name;
  return typeof block.server_name === "string" ? buildMcpToolName(block.server_name, block.name) : undefined;
}
//@ chunk-4cm44bmp.js:9431-9655 placement
function isAccountMemoryControlRequest(request, placeAccountMemoryTool) {
  if (request.subtype === "can_use_tool")
    return (
      typeof request.tool_name !== "string" ||
      isTrustedMemoryTool(request.tool_name, placeAccountMemoryTool, "live")
    );
  if (request.subtype === "request_user_dialog")
    return typeof request.dialog_kind !== "string" || request.dialog_kind.includes(ACCOUNT_MEMORY);
  return false;
}
//@ chunk-4cm44bmp.js:9655-9728 placement
function isCompactSummaryMessage(message) {
  return message.isCompactSummary === true || message.is_compact_summary === true;
}
//@ chunk-4cm44bmp.js:9728-9835 placement
function isCompactSummaryMessage_2(message) {
  return (
    message.repeatsCompactSummary === true ||
    (message.type === "user" &&
      isObject(message.message) &&
      isPostCompactHookContent(message.message.content))
  );
}
//@ chunk-4cm44bmp.js:9835-9910 placement
function messageContentBlocks(message) {
  let content = message.content;
  return Array.isArray(content) ? content.filter(isObject) : undefined;
}
//@ chunk-4cm44bmp.js:9910-9967 placement
function messageBlocksOf(message) {
  return isObject(message.message) ? messageContentBlocks(message.message) : undefined;
}
//@ chunk-4cm44bmp.js:9967-10018 placement
function hasAnyKey(object, keys) {
  return keys.some((key) => object[key] !== undefined);
}
//@ chunk-4cm44bmp.js:10018-10095 placement
function pickKeys(source, keys) {
  let picked = {};
  for (let key of keys) if (source[key] !== undefined) picked[key] = source[key];
  return picked;
}
//@ chunk-4cm44bmp.js:10095-17662 placement
/**
 * 创建发往 Remote Control 的消息过滤器：按账户记忆工具位置与内容类型隐去敏感内容并做缓存。
 */
function createRemoteBridgeRedactor(options) {
  let placeAccountMemoryTool = options.placeAccountMemoryTool;
  let liveMemoryToolIds = new BoundedIdSet(MAX_REDACTED_STRING_CHARS);
  let historyMemoryToolIds = new BoundedIdSet(MAX_REDACTED_STRING_CHARS);
  let knownToolUseIds = new BoundedIdSet(MAX_REDACTED_STRING_CHARS);
  let summaryUuids = new BoundedIdSet(MAX_REDACTED_STRING_CHARS);
  let legacySummaryUuids = new BoundedIdSet(MAX_REDACTED_STRING_CHARS);
  let memoryInPlay = false;
  let streamBlockState = new Map();
  let dropMarker = Symbol("drop");
  function versionCheck(block, mirror) {
    let toolUseQualifiedName = getToolUseQualifiedName(block);
    let liveTrusted =
      toolUseQualifiedName === undefined ||
      isTrustedMemoryTool(toolUseQualifiedName, placeAccountMemoryTool, "live");
    let historyTrusted =
      !liveTrusted &&
      toolUseQualifiedName !== undefined &&
      isTrustedMemoryTool(toolUseQualifiedName, placeAccountMemoryTool, "history");
    if (typeof block.id === "string") {
      if (liveTrusted) liveMemoryToolIds.add(block.id);
      else if (historyTrusted) historyMemoryToolIds.add(block.id);
    }
    return liveTrusted || (mirror === "history" && historyTrusted);
  }
  function isMemoryToolUse(toolUseId, mirror) {
    return liveMemoryToolIds.has(toolUseId) || (mirror === "history" && historyMemoryToolIds.has(toolUseId));
  }
  function noteMessage(message, mirror) {
    if (!isObject(message)) return;
    if (message.type === "progress") {
      if (isObject(message.data)) noteMessage(message.data.message, mirror);
      return;
    }
    noteSummaryUuid(message);
    noteAttachmentMemory(message);
    for (let block of messageBlocksOf(message) ?? []) {
      if (!TOOL_USE_BLOCK_TYPES.has(block.type) || typeof block.id !== "string") continue;
      knownToolUseIds.add(block.id);
      if (versionCheck(block, mirror)) memoryInPlay = true;
    }
  }
  function noteAttachmentMemory(message) {
    if (
      (message.type === "attachment" &&
        isObject(message.attachment) &&
        ACCOUNT_MEMORY_ATTACHMENT_TYPES.has(message.attachment.type) &&
        message.attachment.content !== null) ||
      hasAnthropicMemoryMeta(message)
    )
      memoryInPlay = true;
  }
  function noteSummaryUuid(message) {
    if (typeof message.uuid !== "string") return;
    if (isCompactSummaryMessage(message)) summaryUuids.add(message.uuid);
    else if (isCompactSummaryMessage_2(message)) legacySummaryUuids.add(message.uuid);
  }
  function reportDrop(reason, event) {
    let eventType;
    try {
      eventType = event.type;
    } catch {
      eventType = undefined;
    }
    try {
      options.onDropped?.(
        reason,
        typeof eventType === "string" && REDACTABLE_EVENT_TYPES.has(eventType) ? eventType : "other",
      );
    } catch {}
  }
  function dropEvent(reason, event) {
    reportDrop(reason, event);
    return dropMarker;
  }
  function currentMode() {
    try {
      return options.mode() === "drop" ? "drop" : "redact";
    } catch {
      return "redact";
    }
  }
  function withheld(value) {
    return typeof value === "string" ? value : WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER;
  }
  function withheldToolUse(block, dropInput) {
    return {
      type: block.type,
      id: withheld(block.id),
      name: withheld(block.name),
      ...(block.server_name !== undefined && {
        server_name: withheld(block.server_name),
      }),
      input: dropInput
        ? {}
        : redactAccountMemoryInput(block.input, 0, WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER, true),
    };
  }
  function withheldToolResult(block, content) {
    return {
      type: block.type,
      tool_use_id: withheld(block.tool_use_id),
      content,
      ...(block.is_error === true && {
        is_error: true,
      }),
    };
  }
  function redactMessage(entry, mirror, scope) {
    let hasMemoryMeta = hasAnthropicMemoryMeta(entry);
    let message = isObject(entry.message) ? entry.message : undefined;
    let blocks = message === undefined ? undefined : messageContentBlocks(message);
    if (message === undefined || blocks === undefined) {
      if (hasMemoryMeta) {
        memoryInPlay = true;
        return mirror === "transcript" ? withholdTransparently(entry, []) : dropEvent("memory_row", entry);
      }
      let wireKeys = [...WIRE_INPUT_KEYS, ...REMOTE_RESULT_FIELDS];
      if (!hasAnyKey(entry, wireKeys)) return entry;
      let stripped = {
        ...entry,
      };
      for (let key of wireKeys) delete stripped[key];
      return stripped;
    }
    let changedToolUse = false;
    let changedToolResult = false;
    let keptUntrackedResult = false;
    let keptMemoryRow = false;
    let visibleToolUseIds = new Set();
    let content = blocks.map((block) => {
      if (TOOL_USE_BLOCK_TYPES.has(block.type)) {
        if (typeof block.id === "string") knownToolUseIds.add(block.id);
        if (!versionCheck(block, scope)) {
          if (typeof block.id === "string") visibleToolUseIds.add(block.id);
          return block;
        }
        memoryInPlay = true;
        changedToolUse = true;
        return withheldToolUse(block, false);
      }
      if (TOOL_RESULT_BLOCK_TYPES.has(block.type)) {
        let toolUseId = block.tool_use_id;
        let content = WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER;
        if (typeof toolUseId === "string" && isMemoryToolUse(toolUseId, scope));
        else if (typeof toolUseId === "string" && knownToolUseIds.has(toolUseId)) {
          keptUntrackedResult = true;
          return block;
        } else if (typeof toolUseId === "string" && hasMemoryMeta);
        else content = WITHHELD_TOOL_RESULT_TEXT;
        if (content === WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER) memoryInPlay = true;
        changedToolResult = true;
        return withheldToolResult(block, content);
      }
      return block;
    });
    if (hasMemoryMeta && !changedToolResult) {
      if (!keptUntrackedResult) {
        memoryInPlay = true;
        return mirror === "transcript"
          ? withholdTransparently(entry, blocks)
          : dropEvent("memory_row", entry);
      }
      keptMemoryRow = true;
    }
    if (!changedToolUse && !changedToolResult && !keptMemoryRow) return entry;
    if (currentMode() === "drop")
      return mirror === "transcript" ? withholdTransparently(entry, blocks) : dropEvent("kill_switch", entry);
    let next = {
      ...entry,
      message: {
        ...message,
        content,
      },
    };
    for (let field of CLASSIFIER_CONTEXT_FIELDS) delete next[field];
    if (changedToolResult || keptMemoryRow) for (let field of REMOTE_RESULT_FIELDS) delete next[field];
    if (changedToolUse)
      for (let key of WIRE_INPUT_KEYS) {
        let value = next[key];
        if (!isObject(value)) continue;
        let kept = pickByHelper(value, (value, key) => visibleToolUseIds.has(key));
        if (Object.keys(kept).length > 0) next[key] = kept;
        else delete next[key];
      }
    return next;
  }
  function redactMessageSafely(entry, mirror, scope) {
    let isSummary =
      isCompactSummaryMessage(entry) || (typeof entry.uuid === "string" && summaryUuids.has(entry.uuid));
    noteSummaryUuid(entry);
    if (!isMemoryInPlay()) return redactMessage(entry, mirror, scope);
    let message = isObject(entry.message) ? entry.message : undefined;
    if (currentMode() === "drop")
      return mirror === "transcript"
        ? withholdTransparently(entry, message === undefined ? [] : (messageContentBlocks(message) ?? []))
        : dropEvent("kill_switch", entry);
    let replacement = isSummary
      ? WITHHELD_SUMMARY_NOTICE
      : `<${LOCAL_COMMAND_STDOUT}>${WITHHELD_COMMAND_OUTPUT_TEXT}</${LOCAL_COMMAND_STDOUT}>`;
    let next = {
      ...entry,
      message: {
        ...(message === undefined
          ? {
              role: "user",
            }
          : pickKeys(message, MESSAGE_ROLE_KEYS)),
        content:
          message !== undefined && typeof message.content === "string"
            ? replacement
            : [
                {
                  type: "text",
                  text: replacement,
                },
              ],
      },
    };
    delete next.modelOnlyText;
    for (let field of [...REMOTE_RESULT_FIELDS, ...CLASSIFIER_CONTEXT_FIELDS])
      if (field !== "summarizeMetadata") delete next[field];
    return next;
  }
  function isMemoryInPlay() {
    if (memoryInPlay) return true;
    try {
      return options.accountMemoryInPlay?.() !== false;
    } catch {
      return true;
    }
  }
  function withholdTransparently(entry, blocks) {
    let out = pickKeys(entry, MESSAGE_ENVELOPE_KEYS);
    if (entry.type === "system") return out;
    if (isObject(entry.attachment)) {
      out.attachment = {
        type: entry.attachment.type,
        version: null,
        content: null,
      };
      return out;
    }
    let mapped = blocks.map((block) =>
      TOOL_USE_BLOCK_TYPES.has(block.type)
        ? withheldToolUse(block, true)
        : TOOL_RESULT_BLOCK_TYPES.has(block.type)
          ? withheldToolResult(
              block,
              typeof block.tool_use_id === "string" && isMemoryToolUse(block.tool_use_id, "history")
                ? WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER
                : WITHHELD_TOOL_RESULT_TEXT,
            )
          : {
              type: "text",
              text: WITHHELD_MESSAGE_TEXT,
            },
    );
    out.message = {
      role: entry.type === "assistant" ? "assistant" : "user",
      ...pickKeys(isObject(entry.message) ? entry.message : {}, MESSAGE_ROLE_KEYS),
      content:
        mapped.length > 0
          ? mapped
          : [
              {
                type: "text",
                text: WITHHELD_MESSAGE_TEXT,
              },
            ],
    };
    return out;
  }
  function attachmentCarriesMemory(attachment, mirror) {
    if (attachment.type === "async_hook_response") {
      if (typeof attachment.toolName === "string")
        return isTrustedMemoryTool(attachment.toolName, placeAccountMemoryTool, mirror);
      if (typeof attachment.hookEvent !== "string") return true;
      return attachment.hookEvent === POSTCOMPACT
        ? isMemoryInPlay()
        : HOOK_EVENTS_WITH_CONTENT.has(attachment.hookEvent);
    }
    return (
      (CONTENT_RICH_HOOK_EVENTS.has(attachment.hookEvent) && attachment.accountMemoryBatch !== false) ||
      (typeof attachment.toolUseID === "string" && isMemoryToolUse(attachment.toolUseID, mirror))
    );
  }
  function attachmentNamesMemoryTool(attachment, mirror) {
    return (
      (typeof attachment.toolName === "string" &&
        isTrustedMemoryTool(attachment.toolName, placeAccountMemoryTool, mirror)) ||
      (typeof attachment.toolUseID === "string" && isMemoryToolUse(attachment.toolUseID, mirror))
    );
  }
  function withholdHookAttachment(entry, attachment) {
    let out = pickKeys(entry, MESSAGE_ENVELOPE_KEYS);
    let withheldAttachmentFields = {};
    for (let [key, value] of Object.entries(HOOK_PAYLOAD_KEYS_BY_TYPE))
      for (let payloadKey of value)
        if (typeof attachment[payloadKey] === key)
          withheldAttachmentFields[payloadKey] = attachment[payloadKey];
    for (let key of CONTENT_BEARING_KEYS)
      if (attachment[key] !== undefined)
        withheldAttachmentFields[key] = Array.isArray(attachment[key]) ? [] : "";
    if (attachment.type === "hook_system_message") withheldAttachmentFields.content = WITHHELD_MESSAGE_TEXT;
    if (attachment.blockingError !== undefined)
      withheldAttachmentFields.blockingError = {
        blockingError: "",
        command: "",
      };
    if (attachment.response !== undefined) withheldAttachmentFields.response = {};
    if (attachment.toolInput !== undefined) withheldAttachmentFields.toolInput = {};
    out.attachment = withheldAttachmentFields;
    return out;
  }
  function streamStateFor(parentToolUseId) {
    let state = streamBlockState.get(parentToolUseId);
    if (state === undefined) {
      state = new Map();
      streamBlockState.set(parentToolUseId, state);
    }
    return state;
  }
  function withholdStreamToolResult(entry, event, block, parentToolUseId, index, mirror) {
    let toolUseId = block.tool_use_id;
    let content = WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER;
    if (typeof toolUseId === "string" && isMemoryToolUse(toolUseId, mirror));
    else if (hasAnthropicMemoryMeta(entry));
    else if (typeof toolUseId === "string" && knownToolUseIds.has(toolUseId)) {
      if (index !== undefined) streamStateFor(parentToolUseId).delete(index);
      return entry;
    } else content = WITHHELD_TOOL_RESULT_TEXT;
    if (index !== undefined) streamStateFor(parentToolUseId).set(index, true);
    if (content === WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER) memoryInPlay = true;
    if (currentMode() === "drop") return dropEvent("kill_switch", entry);
    let next = {
      ...entry,
      event: {
        ...event,
        content_block: withheldToolResult(block, content),
      },
    };
    for (let field of [...REMOTE_RESULT_FIELDS, ...CLASSIFIER_CONTEXT_FIELDS]) delete next[field];
    return next;
  }
  function redactStreamEvent(frame, mirror) {
    let event = frame.event;
    if (!isObject(event)) return frame;
    let parentToolUseId = typeof frame.parent_tool_use_id === "string" ? frame.parent_tool_use_id : "";
    if (event.type === "message_start" || event.type === "message_stop") {
      streamBlockState.delete(parentToolUseId);
      return frame;
    }
    let index = typeof event.index === "number" ? event.index : undefined;
    if (event.type === "content_block_start") {
      let contentBlock = isObject(event.content_block) ? event.content_block : {};
      if (TOOL_RESULT_BLOCK_TYPES.has(contentBlock.type))
        return withholdStreamToolResult(frame, event, contentBlock, parentToolUseId, index, mirror);
      let isToolUse = TOOL_USE_BLOCK_TYPES.has(contentBlock.type);
      let mustWithhold = isToolUse && versionCheck(contentBlock, mirror);
      if (isToolUse && typeof contentBlock.id === "string") knownToolUseIds.add(contentBlock.id);
      if (mustWithhold) memoryInPlay = true;
      if (index !== undefined)
        if (isToolUse || REDACTABLE_TEXT_BLOCK_TYPES.has(contentBlock.type))
          streamStateFor(parentToolUseId).set(index, mustWithhold);
        else streamStateFor(parentToolUseId).delete(index);
      if (!mustWithhold) return frame;
      if (currentMode() === "drop") return dropEvent("kill_switch", frame);
      return {
        ...frame,
        event: {
          ...event,
          content_block: withheldToolUse(contentBlock, false),
        },
      };
    }
    if (event.type === "content_block_stop" && index !== undefined) {
      streamBlockState.get(parentToolUseId)?.delete(index);
      return frame;
    }
    if (event.type === "content_block_delta") {
      let tracked = index === undefined ? undefined : streamBlockState.get(parentToolUseId)?.get(index);
      if (tracked === true) return dropEvent("memory_row", frame);
      if (tracked === undefined) return dropEvent("untracked_delta", frame);
    }
    return frame;
  }
  function redactOne(event, mirror, scope) {
    if (!isObject(event)) return;
    switch (event.type) {
      case "stream_event":
        return redactStreamEvent(event, scope);
      case "attachment":
        if (!isObject(event.attachment)) return event;
        if (ACCOUNT_MEMORY_ATTACHMENT_TYPES.has(event.attachment.type)) {
          if (event.attachment.content === null) return event;
          memoryInPlay = true;
          return mirror === "transcript" ? withholdTransparently(event, []) : dropEvent("memory_row", event);
        }
        if (attachmentCarriesMemory(event.attachment, scope)) {
          if (attachmentNamesMemoryTool(event.attachment, scope)) memoryInPlay = true;
          return mirror === "transcript"
            ? withholdHookAttachment(event, event.attachment)
            : dropEvent("memory_row", event);
        }
        return event;
      case "system":
        if (
          event.subtype !== ACCOUNT_MEMORY_SAVED &&
          event.persist !== false &&
          ![event.tool_use_id, event.toolUseID].some(
            (id) => typeof id === "string" && isMemoryToolUse(id, scope),
          )
        )
          return event;
        if (event.subtype === ACCOUNT_MEMORY_SAVED || event.persist !== false) memoryInPlay = true;
        return mirror === "transcript" ? withholdTransparently(event, []) : dropEvent("memory_row", event);
      case "control_request":
        if (isObject(event.request) && isAccountMemoryControlRequest(event.request, placeAccountMemoryTool)) {
          if (typeof event.request.tool_name === "string" || typeof event.request.dialog_kind === "string")
            memoryInPlay = true;
          return dropEvent("memory_row", event);
        }
        return event;
      default:
        return isCompactSummaryMessage(event) ||
          isCompactSummaryMessage_2(event) ||
          (typeof event.uuid === "string" &&
            (summaryUuids.has(event.uuid) || legacySummaryUuids.has(event.uuid)))
          ? redactMessageSafely(event, mirror, scope)
          : redactMessage(event, mirror, scope);
    }
  }
  function withholdUnreadable(entry, mirror) {
    if (mirror === "transcript")
      try {
        let out = pickKeys(entry, MESSAGE_ENVELOPE_KEYS);
        out.message = {
          role: out.type === "assistant" ? "assistant" : "user",
          content: [
            {
              type: "text",
              text: WITHHELD_MESSAGE_TEXT,
            },
          ],
        };
        reportDrop("unreadable", entry);
        return out;
      } catch {}
    return dropEvent("unreadable", entry);
  }
  function redactSafely(event, mirror, scope) {
    try {
      return redactOne(event, mirror, scope) ?? event;
    } catch {
      return isObject(event) ? withholdUnreadable(event, mirror) : dropMarker;
    }
  }
  function redact(events, mirror = "events", scope = "history") {
    return events.flatMap((event) => {
      let redacted = redactSafely(event, mirror, scope);
      return redacted === dropMarker ? [] : [redacted];
    });
  }
  function note(messages, mirror = "history") {
    for (let message of messages)
      try {
        noteMessage(message, mirror);
      } catch {}
  }
  return {
    note,
    redact,
    withoutMemoryCallAttachments(messages, mirror = "history") {
      note(messages, mirror);
      return messages.filter((message) => {
        if (!isObject(message)) return true;
        try {
          if (
            message.type !== "attachment" ||
            !isObject(message.attachment) ||
            !attachmentCarriesMemory(message.attachment, mirror)
          )
            return true;
          if (attachmentNamesMemoryTool(message.attachment, mirror)) memoryInPlay = true;
          reportDrop("memory_row", message);
          return false;
        } catch {
          reportDrop("unreadable", message);
          return false;
        }
      });
    },
    wrapInternalEventWriter(writer, mirror = "history") {
      return (session, message, options) => {
        let [redacted] = redact([message], "transcript", mirror);
        return redacted === undefined ? Promise.resolve() : writer(session, redacted, options);
      };
    },
  };
}
//@ chunk-4cm44bmp.js:17662-17728 placement
var BACKFILL_ORIGIN_SCOPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-4cm44bmp.js:17662", () => {
  BACKFILL_ORIGIN_SCOPES = new Set(["auto_default", "auto_settings", "explicit", "sdk"]);
});
//@ chunk-4cm44bmp.js:17728-17781 placement
function isBackfillOriginScope(transcriptUploadDeferred) {
  return typeof transcriptUploadDeferred === "string" && BACKFILL_ORIGIN_SCOPES.has(transcriptUploadDeferred);
}
//@ chunk-4cm44bmp.js:17781-18054 placement
/**
 * tengu_noble_snowflake 的 schema：scope、backfill_messages（夹在 50–500，默认 200）、eager_result。
 */
var DEFAULT_BACKFILL_MESSAGES; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MIN_BACKFILL_MESSAGES;
var MAX_BACKFILL_MESSAGES;
var DEFAULT_HISTORY_BACKFILL_CONFIG;
var historyBackfillConfigSchema;
deferInit("chunk-4cm44bmp.js:17781", () => {
  DEFAULT_BACKFILL_MESSAGES = 200;
  MIN_BACKFILL_MESSAGES = 50;
  MAX_BACKFILL_MESSAGES = 500;
  DEFAULT_HISTORY_BACKFILL_CONFIG = {
    scope: "off",
    backfillMessages: DEFAULT_BACKFILL_MESSAGES,
    eagerResult: false,
  };
  historyBackfillConfigSchema = DoctorLazy(() =>
    objectSchema({
      scope: _enum(["off", "auto_default", "auto", "auto_and_sdk", "all"]).catch("off"),
      backfill_messages: numberSchema()
        .int()
        .transform((count) => Math.min(MAX_BACKFILL_MESSAGES, Math.max(MIN_BACKFILL_MESSAGES, count)))
        .catch(DEFAULT_BACKFILL_MESSAGES),
      eager_result: booleanSchema().catch(false),
    }),
  );
});
//@ chunk-4cm44bmp.js:18054-18218 placement
function parseHistoryBackfillConfig(featureValue_CACHED_MAY_BE_STALE) {
  let parsed = historyBackfillConfigSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  if (!parsed.success) return DEFAULT_HISTORY_BACKFILL_CONFIG;
  return {
    scope: parsed.data.scope,
    backfillMessages: parsed.data.backfill_messages,
    eagerResult: parsed.data.eager_result,
  };
}
//@ chunk-4cm44bmp.js:18218-18275 placement
function historyBackfillConfig() {
  return parseHistoryBackfillConfig(getFeatureValue_CACHED_MAY_BE_STALE("tengu_noble_snowflake", null));
}
//@ chunk-4cm44bmp.js:18275-18544 placement
/**
 * 判断历史回填 scope（off/auto_default/auto/auto_and_sdk/all）是否覆盖本次 Remote Control 的来源（auto_default、auto_settings、sdk 等）；来源未知时不回填。
 */
function isBackfillScopeAllowedForOrigin(scope, remoteControlOrigin) {
  if (remoteControlOrigin === undefined) return false;
  switch (scope) {
    case "off":
      return false;
    case "auto_default":
      return remoteControlOrigin === "auto_default";
    case "auto":
      return remoteControlOrigin === "auto_default" || remoteControlOrigin === "auto_settings";
    case "auto_and_sdk":
      return (
        remoteControlOrigin === "auto_default" ||
        remoteControlOrigin === "auto_settings" ||
        remoteControlOrigin === "sdk"
      );
    case "all":
      return true;
  }
}
//@ chunk-4cm44bmp.js:18544-18699 placement = countToolCallsSince (1)
function hasUserMessagingToolUse(message) {
  return (
    message.type === "assistant" &&
    Array.isArray(message.message.content) &&
    message.message.content.some(
      (block) =>
        block.type === "tool_use" && (block.name === BRIEF_TOOL_NAME || block.name === PUSHNOTIFICATION),
    )
  );
}
//@ chunk-4cm44bmp.js:18699-18886 placement
function isTaskLifecycleMessage(message) {
  return (
    isEphemeralStreamMessage(message) ||
    (message.type === "system" &&
      "subtype" in message &&
      (message.subtype === "post_turn_summary" ||
        message.subtype === "task_started" ||
        message.subtype === "task_updated" ||
        message.subtype === "task_notification"))
  );
}
export {
  noopAsync,
  noop,
  noopTwoArgs,
  createRemoteBridgeRedactor,
  sendWithEpochFollowUps,
  DEFAULT_HISTORY_BACKFILL_CONFIG,
  historyBackfillConfig,
  isBackfillScopeAllowedForOrigin,
  BoundedIdSet,
  hasUserMessagingToolUse,
  isTaskLifecycleMessage,
  isBackfillOriginScope,
  settleRemoteBridgeDelivery,
  isAccountMemoryControlRequest,
};
