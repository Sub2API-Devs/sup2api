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
import { u, _enum, E, M } from "../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { BRIEF_TOOL_NAME } from "../tools/BriefTool/prompt.js";
import { PUSHNOTIFICATION } from "../tools/PushNotificationTool/constants.js";
import { isEphemeralStreamMessage } from "../cli/transports/ccrClient.js";

//@ chunk-4cm44bmp.js:2705-3202 placement
/**
 * 发送并处理服务端要求的 epoch 跟进：被拒时用新 epoch 重发，返回结局（not_refused/followed_up）。
 */
async function sendWithEpochFollowUps({ heldEpoch, send, maySendAgain }) {
  let C = heldEpoch;
  let N;
  for (let i = 0; ; i++) {
    let Q = [];
    let answer = await send(C, (Z) => {
      Q.push(Z);
    });
    if (Q.length === 0)
      return {
        ending: i === 0 ? "not_refused" : "followed_up",
        answer,
        followUps: i,
        sessionEpoch: N,
      };
    let last = Q.at(-1);
    N = last ?? N;
    if (!maySendAgain())
      return {
        ending: "withheld",
        answer: null,
        followUps: i,
        sessionEpoch: N,
      };
    if (last === undefined || i === 2)
      return {
        ending: "unfenced_fallback",
        answer: await send(undefined, () => {}),
        followUps: i,
        sessionEpoch: N,
        fallbackReason: last === undefined ? "no_session_epoch" : "follow_up_cap",
      };
    C = last;
  }
}
//@ chunk-4cm44bmp.js:3202-3212 placement
var DEFAULT_SETTLE_POLL_MS = 50;
//@ chunk-4cm44bmp.js:3212-6584 placement
/**
 * 在预算时间内轮询直到消息投递落定（live/connect 阶段、会话变更、桥接失败），返回结算结果。
 */
async function settleRemoteBridgeDelivery(n, h) {
  let now = h.now ?? Date.now;
  let C = h.sleep ?? ((se, ge) => sleep(se, ge));
  let pollMs = h.pollMs ?? DEFAULT_SETTLE_POLL_MS;
  let budgetMs = Number.isFinite(h.budgetMs) ? h.budgetMs : 0;
  let Q = 0;
  let q = 0;
  let A = () => {
    try {
      return now() - Q;
    } catch {
      return 0;
    }
  };
  let Z = [];
  let Y = "live";
  let ie = "connect";
  let Ge = (se) => {
    try {
      h.log?.(se);
    } catch {}
  };
  let Te = () => {
    if (h.signal?.aborted) return "aborted";
    if (n.isSessionOver()) return "session_changed";
    if (n.hasFailedForGood()) return "bridge_failed";
    return now() >= q ? "budget_passed" : undefined;
  };
  let nt = (se) => {
    ie = se;
    Z.push(se);
  };
  let Re = async (se) => {
    for (;;) {
      let ge = Te();
      if (ge === "aborted" || ge === "session_changed" || ge === "bridge_failed") return ge;
      if (se()) return;
      if (ge !== undefined) return ge;
      await C(Math.min(pollMs, q - now()), h.signal);
    }
  };
  let oe = async (se) => {
    let ge = "pending";
    let X;
    let je = se.then(
      () => {
        ge = "settled";
      },
      (error) => {
        ge = "threw";
        X = error;
      },
    );
    await Promise.race([je, Promise.resolve()]);
    for (;;) {
      let Le = (() => ge)();
      if (Le === "threw") throw X;
      if (Le === "settled") return;
      let at = Te();
      if (at !== undefined) return at;
      await Promise.race([je, C(Math.min(pollMs, q - now()), h.signal)]);
    }
  };
  let ot = (se) => {
    let ge = se.ok ? "uploads handed over, queues empty" : `${se.reason} on ${se.waitingOn}`;
    Ge(
      `[handoff-wait] end: ${ge} after ${se.elapsedMs} ms; session kind ${se.sessionKind}; awaited ${Z.join(", ") || "nothing"}`,
    );
    return se;
  };
  let he = (se, ge) => {
    if (se === "budget_passed")
      try {
        h.onBudgetPassed?.(ge);
      } catch {}
    return ot({
      ok: false,
      reason: se,
      sessionKind: Y,
      waitingOn: ge,
      elapsedMs: A(),
    });
  };
  let st = () => C(Math.max(0, Math.min(pollMs, q - now())), h.signal);
  let Ke = async () => {
    Y = n.sessionKind();
    if (Y !== "deferred") return;
    let se = Te();
    if (se !== undefined) return se;
    nt("release");
    return oe(n.release());
  };
  try {
    Q = now();
    q = Q + budgetMs;
    Y = n.sessionKind();
    Ge(`[handoff-wait] start: session kind ${Y}, budget ${budgetMs} ms`);
    let se = n.transport();
    let ge = n.droppedBatches(se);
    let X = await Ke();
    if (X !== undefined) return he(X, "release");
    let transcriptCopy = n.transcriptCopy;
    for (;;) {
      X = Te();
      if (X !== undefined) return he(X, "connect");
      let Le = n.transport();
      let at = Le === se ? ge : 0;
      let dt = () => {
        let Qe = n.droppedBatches(Le) - at;
        if (Qe > 0) Ge(`[handoff-wait] batches dropped during the wait: ${Qe}`);
        return Qe > 0;
      };
      nt("connect");
      X = await Re(n.isConnected);
      if (X !== undefined) return he(X, "connect");
      X = await Ke();
      if (X !== undefined) return he(X, "release");
      if (transcriptCopy !== undefined) {
        nt("transcript_copy_install");
        X = await Re(transcriptCopy.isInstalledOnCurrentTransport);
        if (X !== undefined) return he(X, "transcript_copy_install");
        nt("transcript_copy_catch_up");
        let Qe = transcriptCopy.catchUp();
        transcriptCopy.wakeCatchUp();
        X = await oe(Qe);
        if (X !== undefined) return he(X, "transcript_copy_catch_up");
        if (transcriptCopy.catchUp() !== Qe) {
          if (dt()) return he("rows_dropped", "transcript_copy_catch_up");
          await st();
          continue;
        }
      }
      ie = "first_history_flush";
      let lt = n.firstHistoryFlush();
      if (lt !== undefined) {
        Z.push("first_history_flush");
        X = await oe(lt);
        if (X !== undefined) return he(X, "first_history_flush");
      }
      ie = "held_writes";
      if (n.holdsWrites()) {
        Z.push("held_writes");
        X = await Re(() => !n.holdsWrites());
        if (X !== undefined) return he(X, "held_writes");
      }
      nt("upload_lanes");
      let jt = false;
      X = await oe(
        n.drainLanes(Math.max(0, q - now())).then((Qe) => {
          jt = Qe === false;
        }),
      );
      if (X !== undefined || jt) return he(X ?? "budget_passed", "upload_lanes");
      if (dt()) return he("rows_dropped", "upload_lanes");
      if (n.transport() !== Le || !n.isConnected() || n.holdsWrites()) {
        await st();
        continue;
      }
      break;
    }
    if (h.signal?.aborted) return he("aborted", "upload_lanes");
    if (n.isSessionOver()) return he("session_changed", "upload_lanes");
    if (n.hasFailedForGood()) return he("bridge_failed", "upload_lanes");
    return ot({
      ok: true,
      reason: "handed_over",
      sessionKind: Y,
      elapsedMs: A(),
    });
  } catch (error) {
    Ge(`[handoff-wait] ${ie} threw: ${errorMessage(error)}`);
    try {
      h.onFault?.(ie);
    } catch {}
    return he("fault", ie);
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
function noop(n) {}
//@ chunk-4cm44bmp.js:6629-6648 placement
/**
 * 接收两个参数的空函数，作为远程桥接 settle 流程的占位回调。
 */
function noopTwoArgs(n, h) {}
//@ chunk-4cm44bmp.js:6648-8797 placement
/**
 * 向 Remote Control 隐去内容时使用的占位文本（账户记忆、工具结果、消息内容）。
 */
var WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER =
  "[account memory withheld from Remote Control; shown in the terminal session]";
var WITHHELD_TOOL_RESULT_TEXT = "[tool result withheld from Remote Control; shown in the terminal session]";
var WITHHELD_MESSAGE_TEXT = "[message content withheld from Remote Control; shown in the terminal session]";
var WITHHELD_COMMAND_OUTPUT_TEXT =
  "[command output withheld from Remote Control: it may repeat the conversation summary, which can include account memory; shown in the terminal session]";
var WITHHELD_SUMMARY_NOTICE =
  "This session is being continued from a previous conversation that ran out of context. The summary of that conversation is not included here: it was withheld from Remote Control because it may include account memory, and can be read only in the terminal session where it was written. If you need details from the earlier conversation, ask the user.";
var MAX_REDACTED_STRING_CHARS = 32768;
var REDACTABLE_EVENT_TYPES = new Set([
  "assistant",
  "user",
  "stream_event",
  "attachment",
  "system",
  "control_request",
]);
var ACCOUNT_MEMORY_ATTACHMENT_TYPES = new Set(["cowork_memory_context", "account_memory_recall"]);
var ANTHROPIC_MEMORY = "anthropic/memory.";
var ACCOUNT_MEMORY_SAVED = "account_memory_saved";
var ACCOUNT_MEMORY = "account_memory";
var MESSAGE_ENVELOPE_KEYS = [
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
var MESSAGE_ROLE_KEYS = ["role", "id", "type", "model", "stop_reason", "usage"];
var HOOK_PAYLOAD_KEYS_BY_TYPE = {
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
var CONTENT_BEARING_KEYS = ["content", "message", "stdout", "stderr", "lines"];
var WIRE_INPUT_KEYS = ["wireToolInputs", "wire_tool_inputs", "wireIngestContext", "wire_ingest_context"];
var TOOL_USE_BLOCK_TYPES = new Set(["tool_use", "server_tool_use", "mcp_tool_use"]);
var TOOL_RESULT_BLOCK_TYPES = new Set(["tool_result", "mcp_tool_result"]);
var CONTENT_RICH_HOOK_EVENTS = new Set(["PostToolBatch", "Elicitation", "ElicitationResult"]);
var HOOK_EVENTS_WITH_CONTENT = new Set([
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "PostToolBatch",
  "PermissionRequest",
  "PermissionDenied",
  "Elicitation",
  "ElicitationResult",
]);
var POSTCOMPACT = "PostCompact";
var REDACTABLE_TEXT_BLOCK_TYPES = new Set(["text", "thinking", "redacted_thinking"]);
//@ chunk-4cm44bmp.js:8797-8849 placement
function isObject(n) {
  return typeof n === "object" && n !== null;
}
//@ chunk-4cm44bmp.js:8849-9114 placement
class BoundedIdSet {
  max;
  ids = new Set();
  constructor(max) {
    this.max = max;
  }
  has(n) {
    return this.ids.has(n);
  }
  add(n) {
    if (this.ids.has(n)) return;
    this.ids.add(n);
    if (this.ids.size > this.max) {
      let h = this.ids.values().next().value;
      if (h !== undefined) this.ids.delete(h);
    }
  }
  delete(n) {
    return this.ids.delete(n);
  }
}
//@ chunk-4cm44bmp.js:9114-9269 placement
function hasAnthropicMemoryMeta(n) {
  for (let h of REMOTE_RESULT_FIELDS) {
    let w = n[h];
    if (!isObject(w)) continue;
    let C = isObject(w._meta) ? w._meta : w;
    if (Object.keys(C).some((key) => key.startsWith(ANTHROPIC_MEMORY))) return true;
  }
  return false;
}
//@ chunk-4cm44bmp.js:9269-9431 placement
function getToolUseQualifiedName(n) {
  if (typeof n.name !== "string") return;
  if (n.type !== "mcp_tool_use") return n.name;
  return typeof n.server_name === "string" ? buildMcpToolName(n.server_name, n.name) : undefined;
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
function isCompactSummaryMessage(n) {
  return n.isCompactSummary === true || n.is_compact_summary === true;
}
//@ chunk-4cm44bmp.js:9728-9835 placement
function isCompactSummaryMessage_2(n) {
  return (
    n.repeatsCompactSummary === true ||
    (n.type === "user" && isObject(n.message) && isPostCompactHookContent(n.message.content))
  );
}
//@ chunk-4cm44bmp.js:9835-9910 placement
function messageContentBlocks(message) {
  let content = message.content;
  return Array.isArray(content) ? content.filter(isObject) : undefined;
}
//@ chunk-4cm44bmp.js:9910-9967 placement
function messageBlocksOf(n) {
  return isObject(n.message) ? messageContentBlocks(n.message) : undefined;
}
//@ chunk-4cm44bmp.js:9967-10018 placement
function hasAnyKey(n, h) {
  return h.some((w) => n[w] !== undefined);
}
//@ chunk-4cm44bmp.js:10018-10095 placement
function pickKeys(n, h) {
  let w = {};
  for (let C of h) if (n[C] !== undefined) w[C] = n[C];
  return w;
}
//@ chunk-4cm44bmp.js:10095-17662 placement
/**
 * 创建发往 Remote Control 的消息过滤器：按账户记忆工具位置与内容类型隐去敏感内容并做缓存。
 */
function createRemoteBridgeRedactor(n) {
  let placeAccountMemoryTool = n.placeAccountMemoryTool;
  let w = new BoundedIdSet(MAX_REDACTED_STRING_CHARS);
  let C = new BoundedIdSet(MAX_REDACTED_STRING_CHARS);
  let N = new BoundedIdSet(MAX_REDACTED_STRING_CHARS);
  let x = new BoundedIdSet(MAX_REDACTED_STRING_CHARS);
  let Q = new BoundedIdSet(MAX_REDACTED_STRING_CHARS);
  let q = false;
  let A = new Map();
  let Z = Symbol("drop");
  function Y(s, B) {
    let toolUseQualifiedName = getToolUseQualifiedName(s);
    let te =
      toolUseQualifiedName === undefined ||
      isTrustedMemoryTool(toolUseQualifiedName, placeAccountMemoryTool, "live");
    let K =
      !te &&
      toolUseQualifiedName !== undefined &&
      isTrustedMemoryTool(toolUseQualifiedName, placeAccountMemoryTool, "history");
    if (typeof s.id === "string") {
      if (te) w.add(s.id);
      else if (K) C.add(s.id);
    }
    return te || (B === "history" && K);
  }
  function ie(s, B) {
    return w.has(s) || (B === "history" && C.has(s));
  }
  function Ge(s, B) {
    if (!isObject(s)) return;
    if (s.type === "progress") {
      if (isObject(s.data)) Ge(s.data.message, B);
      return;
    }
    nt(s);
    Te(s);
    for (let P of messageBlocksOf(s) ?? []) {
      if (!TOOL_USE_BLOCK_TYPES.has(P.type) || typeof P.id !== "string") continue;
      N.add(P.id);
      if (Y(P, B)) q = true;
    }
  }
  function Te(s) {
    if (
      (s.type === "attachment" &&
        isObject(s.attachment) &&
        ACCOUNT_MEMORY_ATTACHMENT_TYPES.has(s.attachment.type) &&
        s.attachment.content !== null) ||
      hasAnthropicMemoryMeta(s)
    )
      q = true;
  }
  function nt(s) {
    if (typeof s.uuid !== "string") return;
    if (isCompactSummaryMessage(s)) x.add(s.uuid);
    else if (isCompactSummaryMessage_2(s)) Q.add(s.uuid);
  }
  function Re(s, B) {
    let P;
    try {
      P = B.type;
    } catch {
      P = undefined;
    }
    try {
      n.onDropped?.(s, typeof P === "string" && REDACTABLE_EVENT_TYPES.has(P) ? P : "other");
    } catch {}
  }
  function oe(s, B) {
    Re(s, B);
    return Z;
  }
  function ot() {
    try {
      return n.mode() === "drop" ? "drop" : "redact";
    } catch {
      return "redact";
    }
  }
  function he(s) {
    return typeof s === "string" ? s : WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER;
  }
  function st(s, B) {
    return {
      type: s.type,
      id: he(s.id),
      name: he(s.name),
      ...(s.server_name !== undefined && {
        server_name: he(s.server_name),
      }),
      input: B ? {} : redactAccountMemoryInput(s.input, 0, WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER, true),
    };
  }
  function Ke(s, content) {
    return {
      type: s.type,
      tool_use_id: he(s.tool_use_id),
      content,
      ...(s.is_error === true && {
        is_error: true,
      }),
    };
  }
  function se(s, B, P) {
    let te = hasAnthropicMemoryMeta(s);
    let message = isObject(s.message) ? s.message : undefined;
    let fe = message === undefined ? undefined : messageContentBlocks(message);
    if (message === undefined || fe === undefined) {
      if (te) {
        q = true;
        return B === "transcript" ? je(s, []) : oe("memory_row", s);
      }
      let pe = [...WIRE_INPUT_KEYS, ...REMOTE_RESULT_FIELDS];
      if (!hasAnyKey(s, pe)) return s;
      let Ve = {
        ...s,
      };
      for (let it of pe) delete Ve[it];
      return Ve;
    }
    let we = false;
    let Ne = false;
    let Nt = false;
    let Ut = false;
    let Kr = new Set();
    let content = fe.map((pe) => {
      if (TOOL_USE_BLOCK_TYPES.has(pe.type)) {
        if (typeof pe.id === "string") N.add(pe.id);
        if (!Y(pe, P)) {
          if (typeof pe.id === "string") Kr.add(pe.id);
          return pe;
        }
        q = true;
        we = true;
        return st(pe, false);
      }
      if (TOOL_RESULT_BLOCK_TYPES.has(pe.type)) {
        let toolUseId = pe.tool_use_id;
        let content = WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER;
        if (typeof toolUseId === "string" && ie(toolUseId, P));
        else if (typeof toolUseId === "string" && N.has(toolUseId)) {
          Nt = true;
          return pe;
        } else if (typeof toolUseId === "string" && te);
        else content = WITHHELD_TOOL_RESULT_TEXT;
        if (content === WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER) q = true;
        Ne = true;
        return Ke(pe, content);
      }
      return pe;
    });
    if (te && !Ne) {
      if (!Nt) {
        q = true;
        return B === "transcript" ? je(s, fe) : oe("memory_row", s);
      }
      Ut = true;
    }
    if (!we && !Ne && !Ut) return s;
    if (ot() === "drop") return B === "transcript" ? je(s, fe) : oe("kill_switch", s);
    let vt = {
      ...s,
      message: {
        ...message,
        content,
      },
    };
    for (let pe of CLASSIFIER_CONTEXT_FIELDS) delete vt[pe];
    if (Ne || Ut) for (let pe of REMOTE_RESULT_FIELDS) delete vt[pe];
    if (we)
      for (let pe of WIRE_INPUT_KEYS) {
        let Ve = vt[pe];
        if (!isObject(Ve)) continue;
        let it = pickByHelper(Ve, (Xo, $n) => Kr.has($n));
        if (Object.keys(it).length > 0) vt[pe] = it;
        else delete vt[pe];
      }
    return vt;
  }
  function ge(s, B, P) {
    let te = isCompactSummaryMessage(s) || (typeof s.uuid === "string" && x.has(s.uuid));
    nt(s);
    if (!X()) return se(s, B, P);
    let message = isObject(s.message) ? s.message : undefined;
    if (ot() === "drop")
      return B === "transcript"
        ? je(s, message === undefined ? [] : (messageContentBlocks(message) ?? []))
        : oe("kill_switch", s);
    let fe = te
      ? WITHHELD_SUMMARY_NOTICE
      : `<${LOCAL_COMMAND_STDOUT}>${WITHHELD_COMMAND_OUTPUT_TEXT}</${LOCAL_COMMAND_STDOUT}>`;
    let we = {
      ...s,
      message: {
        ...(message === undefined
          ? {
              role: "user",
            }
          : pickKeys(message, MESSAGE_ROLE_KEYS)),
        content:
          message !== undefined && typeof message.content === "string"
            ? fe
            : [
                {
                  type: "text",
                  text: fe,
                },
              ],
      },
    };
    delete we.modelOnlyText;
    for (let Ne of [...REMOTE_RESULT_FIELDS, ...CLASSIFIER_CONTEXT_FIELDS])
      if (Ne !== "summarizeMetadata") delete we[Ne];
    return we;
  }
  function X() {
    if (q) return true;
    try {
      return n.accountMemoryInPlay?.() !== false;
    } catch {
      return true;
    }
  }
  function je(s, B) {
    let P = pickKeys(s, MESSAGE_ENVELOPE_KEYS);
    if (s.type === "system") return P;
    if (isObject(s.attachment)) {
      P.attachment = {
        type: s.attachment.type,
        version: null,
        content: null,
      };
      return P;
    }
    let mapped = B.map((K) =>
      TOOL_USE_BLOCK_TYPES.has(K.type)
        ? st(K, true)
        : TOOL_RESULT_BLOCK_TYPES.has(K.type)
          ? Ke(
              K,
              typeof K.tool_use_id === "string" && ie(K.tool_use_id, "history")
                ? WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER
                : WITHHELD_TOOL_RESULT_TEXT,
            )
          : {
              type: "text",
              text: WITHHELD_MESSAGE_TEXT,
            },
    );
    P.message = {
      role: s.type === "assistant" ? "assistant" : "user",
      ...pickKeys(isObject(s.message) ? s.message : {}, MESSAGE_ROLE_KEYS),
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
    return P;
  }
  function Le(attachment, B) {
    if (attachment.type === "async_hook_response") {
      if (typeof attachment.toolName === "string")
        return isTrustedMemoryTool(attachment.toolName, placeAccountMemoryTool, B);
      if (typeof attachment.hookEvent !== "string") return true;
      return attachment.hookEvent === POSTCOMPACT ? X() : HOOK_EVENTS_WITH_CONTENT.has(attachment.hookEvent);
    }
    return (
      (CONTENT_RICH_HOOK_EVENTS.has(attachment.hookEvent) && attachment.accountMemoryBatch !== false) ||
      (typeof attachment.toolUseID === "string" && ie(attachment.toolUseID, B))
    );
  }
  function at(attachment, B) {
    return (
      (typeof attachment.toolName === "string" &&
        isTrustedMemoryTool(attachment.toolName, placeAccountMemoryTool, B)) ||
      (typeof attachment.toolUseID === "string" && ie(attachment.toolUseID, B))
    );
  }
  function dt(s, attachment) {
    let P = pickKeys(s, MESSAGE_ENVELOPE_KEYS);
    let te = {};
    for (let [key, value] of Object.entries(HOOK_PAYLOAD_KEYS_BY_TYPE))
      for (let we of value) if (typeof attachment[we] === key) te[we] = attachment[we];
    for (let K of CONTENT_BEARING_KEYS)
      if (attachment[K] !== undefined) te[K] = Array.isArray(attachment[K]) ? [] : "";
    if (attachment.type === "hook_system_message") te.content = WITHHELD_MESSAGE_TEXT;
    if (attachment.blockingError !== undefined)
      te.blockingError = {
        blockingError: "",
        command: "",
      };
    if (attachment.response !== undefined) te.response = {};
    if (attachment.toolInput !== undefined) te.toolInput = {};
    P.attachment = te;
    return P;
  }
  function lt(parentToolUseId) {
    let B = A.get(parentToolUseId);
    if (B === undefined) {
      B = new Map();
      A.set(parentToolUseId, B);
    }
    return B;
  }
  function jt(s, event, contentBlock, parentToolUseId, index, fe) {
    let toolUseId = contentBlock.tool_use_id;
    let content = WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER;
    if (typeof toolUseId === "string" && ie(toolUseId, fe));
    else if (hasAnthropicMemoryMeta(s));
    else if (typeof toolUseId === "string" && N.has(toolUseId)) {
      if (index !== undefined) lt(parentToolUseId).delete(index);
      return s;
    } else content = WITHHELD_TOOL_RESULT_TEXT;
    if (index !== undefined) lt(parentToolUseId).set(index, true);
    if (content === WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER) q = true;
    if (ot() === "drop") return oe("kill_switch", s);
    let Nt = {
      ...s,
      event: {
        ...event,
        content_block: Ke(contentBlock, content),
      },
    };
    for (let Ut of [...REMOTE_RESULT_FIELDS, ...CLASSIFIER_CONTEXT_FIELDS]) delete Nt[Ut];
    return Nt;
  }
  function Qe(s, B) {
    let event = s.event;
    if (!isObject(event)) return s;
    let parentToolUseId = typeof s.parent_tool_use_id === "string" ? s.parent_tool_use_id : "";
    if (event.type === "message_start" || event.type === "message_stop") {
      A.delete(parentToolUseId);
      return s;
    }
    let index = typeof event.index === "number" ? event.index : undefined;
    if (event.type === "content_block_start") {
      let contentBlock = isObject(event.content_block) ? event.content_block : {};
      if (TOOL_RESULT_BLOCK_TYPES.has(contentBlock.type))
        return jt(s, event, contentBlock, parentToolUseId, index, B);
      let we = TOOL_USE_BLOCK_TYPES.has(contentBlock.type);
      let Ne = we && Y(contentBlock, B);
      if (we && typeof contentBlock.id === "string") N.add(contentBlock.id);
      if (Ne) q = true;
      if (index !== undefined)
        if (we || REDACTABLE_TEXT_BLOCK_TYPES.has(contentBlock.type)) lt(parentToolUseId).set(index, Ne);
        else lt(parentToolUseId).delete(index);
      if (!Ne) return s;
      if (ot() === "drop") return oe("kill_switch", s);
      return {
        ...s,
        event: {
          ...event,
          content_block: st(contentBlock, false),
        },
      };
    }
    if (event.type === "content_block_stop" && index !== undefined) {
      A.get(parentToolUseId)?.delete(index);
      return s;
    }
    if (event.type === "content_block_delta") {
      let fe = index === undefined ? undefined : A.get(parentToolUseId)?.get(index);
      if (fe === true) return oe("memory_row", s);
      if (fe === undefined) return oe("untracked_delta", s);
    }
    return s;
  }
  function $r(s, B, P) {
    if (!isObject(s)) return;
    switch (s.type) {
      case "stream_event":
        return Qe(s, P);
      case "attachment":
        if (!isObject(s.attachment)) return s;
        if (ACCOUNT_MEMORY_ATTACHMENT_TYPES.has(s.attachment.type)) {
          if (s.attachment.content === null) return s;
          q = true;
          return B === "transcript" ? je(s, []) : oe("memory_row", s);
        }
        if (Le(s.attachment, P)) {
          if (at(s.attachment, P)) q = true;
          return B === "transcript" ? dt(s, s.attachment) : oe("memory_row", s);
        }
        return s;
      case "system":
        if (
          s.subtype !== ACCOUNT_MEMORY_SAVED &&
          s.persist !== false &&
          ![s.tool_use_id, s.toolUseID].some((te) => typeof te === "string" && ie(te, P))
        )
          return s;
        if (s.subtype === ACCOUNT_MEMORY_SAVED || s.persist !== false) q = true;
        return B === "transcript" ? je(s, []) : oe("memory_row", s);
      case "control_request":
        if (isObject(s.request) && isAccountMemoryControlRequest(s.request, placeAccountMemoryTool)) {
          if (typeof s.request.tool_name === "string" || typeof s.request.dialog_kind === "string") q = true;
          return oe("memory_row", s);
        }
        return s;
      default:
        return isCompactSummaryMessage(s) ||
          isCompactSummaryMessage_2(s) ||
          (typeof s.uuid === "string" && (x.has(s.uuid) || Q.has(s.uuid)))
          ? ge(s, B, P)
          : se(s, B, P);
    }
  }
  function Wr(s, B) {
    if (B === "transcript")
      try {
        let P = pickKeys(s, MESSAGE_ENVELOPE_KEYS);
        P.message = {
          role: P.type === "assistant" ? "assistant" : "user",
          content: [
            {
              type: "text",
              text: WITHHELD_MESSAGE_TEXT,
            },
          ],
        };
        Re("unreadable", s);
        return P;
      } catch {}
    return oe("unreadable", s);
  }
  function xn(s, B, P) {
    try {
      return $r(s, B, P) ?? s;
    } catch {
      return isObject(s) ? Wr(s, B) : Z;
    }
  }
  function qr(s, B = "events", P = "history") {
    return s.flatMap((te) => {
      let K = xn(te, B, P);
      return K === Z ? [] : [K];
    });
  }
  function Gr(s, B = "history") {
    for (let P of s)
      try {
        Ge(P, B);
      } catch {}
  }
  return {
    note: Gr,
    redact: qr,
    withoutMemoryCallAttachments(s, B = "history") {
      Gr(s, B);
      return s.filter((P) => {
        if (!isObject(P)) return true;
        try {
          if (P.type !== "attachment" || !isObject(P.attachment) || !Le(P.attachment, B)) return true;
          if (at(P.attachment, B)) q = true;
          Re("memory_row", P);
          return false;
        } catch {
          Re("unreadable", P);
          return false;
        }
      });
    },
    wrapInternalEventWriter(s, B = "history") {
      return (P, te, K) => {
        let [fe] = qr([te], "transcript", B);
        return fe === undefined ? Promise.resolve() : s(P, fe, K);
      };
    },
  };
}
//@ chunk-4cm44bmp.js:17662-17728 placement
var BACKFILL_ORIGIN_SCOPES = new Set(["auto_default", "auto_settings", "explicit", "sdk"]);
//@ chunk-4cm44bmp.js:17728-17781 placement
function isBackfillOriginScope(transcriptUploadDeferred) {
  return typeof transcriptUploadDeferred === "string" && BACKFILL_ORIGIN_SCOPES.has(transcriptUploadDeferred);
}
//@ chunk-4cm44bmp.js:17781-18054 placement
/**
 * tengu_noble_snowflake 的 schema：scope、backfill_messages（夹在 50–500，默认 200）、eager_result。
 */
var DEFAULT_BACKFILL_MESSAGES = 200;
var MIN_BACKFILL_MESSAGES = 50;
var MAX_BACKFILL_MESSAGES = 500;
var DEFAULT_HISTORY_BACKFILL_CONFIG = {
  scope: "off",
  backfillMessages: DEFAULT_BACKFILL_MESSAGES,
  eagerResult: false,
};
var historyBackfillConfigSchema = DoctorLazy(() =>
  u({
    scope: _enum(["off", "auto_default", "auto", "auto_and_sdk", "all"]).catch("off"),
    backfill_messages: E()
      .int()
      .transform((n) => Math.min(MAX_BACKFILL_MESSAGES, Math.max(MIN_BACKFILL_MESSAGES, n)))
      .catch(DEFAULT_BACKFILL_MESSAGES),
    eager_result: M().catch(false),
  }),
);
//@ chunk-4cm44bmp.js:18054-18218 placement
function parseHistoryBackfillConfig(featureValue_CACHED_MAY_BE_STALE) {
  let h = historyBackfillConfigSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  if (!h.success) return DEFAULT_HISTORY_BACKFILL_CONFIG;
  return {
    scope: h.data.scope,
    backfillMessages: h.data.backfill_messages,
    eagerResult: h.data.eager_result,
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
function isTaskLifecycleMessage(n) {
  return (
    isEphemeralStreamMessage(n) ||
    (n.type === "system" &&
      "subtype" in n &&
      (n.subtype === "post_turn_summary" ||
        n.subtype === "task_started" ||
        n.subtype === "task_updated" ||
        n.subtype === "task_notification"))
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
