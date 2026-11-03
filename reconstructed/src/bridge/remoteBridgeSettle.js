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
import { Do } from "../utils/git/gitSafeEnv.js";
import { LOCAL_COMMAND_STDOUT } from "../constants/xml.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, U, E, M } from "../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { BRIEF_TOOL_NAME } from "../tools/BriefTool/prompt.js";
import { PUSHNOTIFICATION } from "../tools/PushNotificationTool/constants.js";
import { isEphemeralStreamMessage } from "../cli/transports/ccrClient.js";

/**
 * 发送并处理服务端要求的 epoch 跟进：被拒时用新 epoch 重发，返回结局（not_refused/followed_up）。
 */
//@ chunk-4cm44bmp.js:2705-3202 placement
async function sendWithEpochFollowUps({ heldEpoch: heldEpoch, send: send, maySendAgain: maySendAgain }) {
  let C = heldEpoch,
    N;
  for (let x = 0; ; x++) {
    let Q = [],
      q = await send(C, (Z) => {
        Q.push(Z);
      });
    if (Q.length === 0)
      return { ending: x === 0 ? "not_refused" : "followed_up", answer: q, followUps: x, sessionEpoch: N };
    let at = Q.at(-1);
    if (((N = at ?? N), !maySendAgain()))
      return { ending: "withheld", answer: null, followUps: x, sessionEpoch: N };
    if (at === void 0 || x === 2)
      return {
        ending: "unfenced_fallback",
        answer: await send(void 0, () => {}),
        followUps: x,
        sessionEpoch: N,
        fallbackReason: at === void 0 ? "no_session_epoch" : "follow_up_cap",
      };
    C = at;
  }
}
//@ chunk-4cm44bmp.js:3202-3212 placement
var od = 50;
/**
 * 在预算时间内轮询直到消息投递落定（live/connect 阶段、会话变更、桥接失败），返回结算结果。
 */
//@ chunk-4cm44bmp.js:3212-6584 placement
async function settleRemoteBridgeDelivery(n, h) {
  let w = h.now ?? Date.now,
    C = h.sleep ?? ((se, ge) => sleep(se, ge)),
    N = h.pollMs ?? od,
    x = Number.isFinite(h.budgetMs) ? h.budgetMs : 0,
    Q = 0,
    q = 0,
    A = () => {
      try {
        return w() - Q;
      } catch {
        return 0;
      }
    },
    Z = [],
    Y = "live",
    ie = "connect",
    Ge = (se) => {
      try {
        h.log?.(se);
      } catch {}
    },
    Te = () => {
      if (h.signal?.aborted) return "aborted";
      if (n.isSessionOver()) return "session_changed";
      if (n.hasFailedForGood()) return "bridge_failed";
      return w() >= q ? "budget_passed" : void 0;
    },
    nt = (se) => {
      ((ie = se), Z.push(se));
    },
    Re = async (se) => {
      for (;;) {
        let ge = Te();
        if (ge === "aborted" || ge === "session_changed" || ge === "bridge_failed") return ge;
        if (se()) return;
        if (ge !== void 0) return ge;
        await C(Math.min(N, q - w()), h.signal);
      }
    },
    oe = async (se) => {
      let ge = "pending",
        X,
        je = se.then(
          () => {
            ge = "settled";
          },
          (Le) => {
            ((ge = "threw"), (X = Le));
          },
        );
      await Promise.race([je, Promise.resolve()]);
      for (;;) {
        let Le = (() => ge)();
        if (Le === "threw") throw X;
        if (Le === "settled") return;
        let at = Te();
        if (at !== void 0) return at;
        await Promise.race([je, C(Math.min(N, q - w()), h.signal)]);
      }
    },
    ot = (se) => {
      let ge = se.ok ? "uploads handed over, queues empty" : `${se.reason} on ${se.waitingOn}`;
      return (
        Ge(
          `[handoff-wait] end: ${ge} after ${se.elapsedMs} ms; session kind ${se.sessionKind}; awaited ${Z.join(", ") || "nothing"}`,
        ),
        se
      );
    },
    he = (se, ge) => {
      if (se === "budget_passed")
        try {
          h.onBudgetPassed?.(ge);
        } catch {}
      return ot({ ok: !1, reason: se, sessionKind: Y, waitingOn: ge, elapsedMs: A() });
    },
    st = () => C(Math.max(0, Math.min(N, q - w())), h.signal),
    Ke = async () => {
      if (((Y = n.sessionKind()), Y !== "deferred")) return;
      let se = Te();
      if (se !== void 0) return se;
      return (nt("release"), oe(n.release()));
    };
  try {
    ((Q = w()),
      (q = Q + x),
      (Y = n.sessionKind()),
      Ge(`[handoff-wait] start: session kind ${Y}, budget ${x} ms`));
    let transport = n.transport(),
      droppedBatches = n.droppedBatches(transport),
      X = await Ke();
    if (X !== void 0) return he(X, "release");
    let transcriptCopy = n.transcriptCopy;
    for (;;) {
      if (((X = Te()), X !== void 0)) return he(X, "connect");
      let transport_2 = n.transport(),
        at = transport_2 === transport ? droppedBatches : 0,
        dt = () => {
          let Qe = n.droppedBatches(transport_2) - at;
          if (Qe > 0) Ge(`[handoff-wait] batches dropped during the wait: ${Qe}`);
          return Qe > 0;
        };
      if ((nt("connect"), (X = await Re(n.isConnected)), X !== void 0)) return he(X, "connect");
      if (((X = await Ke()), X !== void 0)) return he(X, "release");
      if (transcriptCopy !== void 0) {
        if (
          (nt("transcript_copy_install"),
          (X = await Re(transcriptCopy.isInstalledOnCurrentTransport)),
          X !== void 0)
        )
          return he(X, "transcript_copy_install");
        nt("transcript_copy_catch_up");
        let catchUp = transcriptCopy.catchUp();
        if ((transcriptCopy.wakeCatchUp(), (X = await oe(catchUp)), X !== void 0))
          return he(X, "transcript_copy_catch_up");
        if (transcriptCopy.catchUp() !== catchUp) {
          if (dt()) return he("rows_dropped", "transcript_copy_catch_up");
          await st();
          continue;
        }
      }
      ie = "first_history_flush";
      let firstHistoryFlush = n.firstHistoryFlush();
      if (firstHistoryFlush !== void 0) {
        if ((Z.push("first_history_flush"), (X = await oe(firstHistoryFlush)), X !== void 0))
          return he(X, "first_history_flush");
      }
      if (((ie = "held_writes"), n.holdsWrites())) {
        if ((Z.push("held_writes"), (X = await Re(() => !n.holdsWrites())), X !== void 0))
          return he(X, "held_writes");
      }
      nt("upload_lanes");
      let jt = !1;
      if (
        ((X = await oe(
          n.drainLanes(Math.max(0, q - w())).then((Qe) => {
            jt = Qe === !1;
          }),
        )),
        X !== void 0 || jt)
      )
        return he(X ?? "budget_passed", "upload_lanes");
      if (dt()) return he("rows_dropped", "upload_lanes");
      if (n.transport() !== transport_2 || !n.isConnected() || n.holdsWrites()) {
        await st();
        continue;
      }
      break;
    }
    if (h.signal?.aborted) return he("aborted", "upload_lanes");
    if (n.isSessionOver()) return he("session_changed", "upload_lanes");
    if (n.hasFailedForGood()) return he("bridge_failed", "upload_lanes");
    return ot({ ok: !0, reason: "handed_over", sessionKind: Y, elapsedMs: A() });
  } catch (error) {
    Ge(`[handoff-wait] ${ie} threw: ${errorMessage(error)}`);
    try {
      h.onFault?.(ie);
    } catch {}
    return he("fault", ie);
  }
}
//@ chunk-4cm44bmp.js:6584-6612 placement
async function hKs() {
  return;
}
//@ chunk-4cm44bmp.js:6612-6629 placement
function y6n(n) {}
//@ chunk-4cm44bmp.js:6629-6648 placement
function _6n(n, h) {}
/**
 * 向 Remote Control 隐去内容时使用的占位文本（账户记忆、工具结果、消息内容）。
 */
//@ chunk-4cm44bmp.js:6648-8797 placement
var WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER =
    "[account memory withheld from Remote Control; shown in the terminal session]",
  Bo = "[tool result withheld from Remote Control; shown in the terminal session]",
  Pn = "[message content withheld from Remote Control; shown in the terminal session]",
  id =
    "[command output withheld from Remote Control: it may repeat the conversation summary, which can include account memory; shown in the terminal session]",
  sd =
    "This session is being continued from a previous conversation that ran out of context. The summary of that conversation is not included here: it was withheld from Remote Control because it may include account memory, and can be read only in the terminal session where it was written. If you need details from the earlier conversation, ask the user.",
  Nr = 32768,
  ad = new Set(["assistant", "user", "stream_event", "attachment", "system", "control_request"]),
  hs = new Set(["cowork_memory_context", "account_memory_recall"]),
  ANTHROPIC_MEMORY = "anthropic/memory.",
  ACCOUNT_MEMORY_SAVED = "account_memory_saved",
  ACCOUNT_MEMORY = "account_memory",
  jo = [
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
  ],
  ms = ["role", "id", "type", "model", "stop_reason", "usage"],
  ud = {
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
  },
  cd = ["content", "message", "stdout", "stderr", "lines"],
  vs = ["wireToolInputs", "wire_tool_inputs", "wireIngestContext", "wire_ingest_context"],
  On = new Set(["tool_use", "server_tool_use", "mcp_tool_use"]),
  No = new Set(["tool_result", "mcp_tool_result"]),
  fd = new Set(["PostToolBatch", "Elicitation", "ElicitationResult"]),
  _d = new Set([
    "PreToolUse",
    "PostToolUse",
    "PostToolUseFailure",
    "PostToolBatch",
    "PermissionRequest",
    "PermissionDenied",
    "Elicitation",
    "ElicitationResult",
  ]),
  POSTCOMPACT = "PostCompact",
  hd = new Set(["text", "thinking", "redacted_thinking"]);
//@ chunk-4cm44bmp.js:8797-8849 placement
function Ae(n) {
  return typeof n === "object" && n !== null;
}
//@ chunk-4cm44bmp.js:8849-9114 placement
class BoundedIdSet {
  max;
  ids = new Set();
  constructor(n) {
    this.max = n;
  }
  has(n) {
    return this.ids.has(n);
  }
  add(n) {
    if (this.ids.has(n)) return;
    if ((this.ids.add(n), this.ids.size > this.max)) {
      let h = this.ids.values().next().value;
      if (h !== void 0) this.ids.delete(h);
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
    if (!Ae(w)) continue;
    let C = Ae(w._meta) ? w._meta : w;
    if (Object.keys(C).some((N) => N.startsWith(ANTHROPIC_MEMORY))) return !0;
  }
  return !1;
}
//@ chunk-4cm44bmp.js:9269-9431 placement
function getToolUseQualifiedName(n) {
  if (typeof n.name !== "string") return;
  if (n.type !== "mcp_tool_use") return n.name;
  return typeof n.server_name === "string" ? buildMcpToolName(n.server_name, n.name) : void 0;
}
//@ chunk-4cm44bmp.js:9431-9655 placement
function isAccountMemoryControlRequest(n, h) {
  if (n.subtype === "can_use_tool")
    return typeof n.tool_name !== "string" || isTrustedMemoryTool(n.tool_name, h, "live");
  if (n.subtype === "request_user_dialog")
    return typeof n.dialog_kind !== "string" || n.dialog_kind.includes(ACCOUNT_MEMORY);
  return !1;
}
//@ chunk-4cm44bmp.js:9655-9728 placement
function Fo(n) {
  return n.isCompactSummary === !0 || n.is_compact_summary === !0;
}
//@ chunk-4cm44bmp.js:9728-9835 placement
function isCompactSummaryMessage(n) {
  return (
    n.repeatsCompactSummary === !0 ||
    (n.type === "user" && Ae(n.message) && isPostCompactHookContent(n.message.content))
  );
}
//@ chunk-4cm44bmp.js:9835-9910 placement
function Ho(n) {
  let content = n.content;
  return Array.isArray(content) ? content.filter(Ae) : void 0;
}
//@ chunk-4cm44bmp.js:9910-9967 placement
function md(n) {
  return Ae(n.message) ? Ho(n.message) : void 0;
}
//@ chunk-4cm44bmp.js:9967-10018 placement
function vd(n, h) {
  return h.some((w) => n[w] !== void 0);
}
//@ chunk-4cm44bmp.js:10018-10095 placement
function Ur(n, h) {
  let w = {};
  for (let C of h) if (n[C] !== void 0) w[C] = n[C];
  return w;
}
/**
 * 创建发往 Remote Control 的消息过滤器：按账户记忆工具位置与内容类型隐去敏感内容并做缓存。
 */
//@ chunk-4cm44bmp.js:10095-17662 placement
function createRemoteBridgeRedactor(n) {
  let placeAccountMemoryTool = n.placeAccountMemoryTool,
    w = new BoundedIdSet(Nr),
    C = new BoundedIdSet(Nr),
    N = new BoundedIdSet(Nr),
    x = new BoundedIdSet(Nr),
    Q = new BoundedIdSet(Nr),
    q = !1,
    A = new Map(),
    Z = Symbol("drop");
  function Y(s, B) {
    let P = getToolUseQualifiedName(s),
      te = P === void 0 || isTrustedMemoryTool(P, placeAccountMemoryTool, "live"),
      K = !te && P !== void 0 && isTrustedMemoryTool(P, placeAccountMemoryTool, "history");
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
    if (!Ae(s)) return;
    if (s.type === "progress") {
      if (Ae(s.data)) Ge(s.data.message, B);
      return;
    }
    (nt(s), Te(s));
    for (let P of md(s) ?? []) {
      if (!On.has(P.type) || typeof P.id !== "string") continue;
      if ((N.add(P.id), Y(P, B))) q = !0;
    }
  }
  function Te(s) {
    if (
      (s.type === "attachment" &&
        Ae(s.attachment) &&
        hs.has(s.attachment.type) &&
        s.attachment.content !== null) ||
      hasAnthropicMemoryMeta(s)
    )
      q = !0;
  }
  function nt(s) {
    if (typeof s.uuid !== "string") return;
    if (Fo(s)) x.add(s.uuid);
    else if (isCompactSummaryMessage(s)) Q.add(s.uuid);
  }
  function Re(s, B) {
    let P;
    try {
      P = B.type;
    } catch {
      P = void 0;
    }
    try {
      n.onDropped?.(s, typeof P === "string" && ad.has(P) ? P : "other");
    } catch {}
  }
  function oe(s, B) {
    return (Re(s, B), Z);
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
      ...(s.server_name !== void 0 && { server_name: he(s.server_name) }),
      input: B ? {} : redactAccountMemoryInput(s.input, 0, WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER, !0),
    };
  }
  function Ke(s, B) {
    return {
      type: s.type,
      tool_use_id: he(s.tool_use_id),
      content: B,
      ...(s.is_error === !0 && { is_error: !0 }),
    };
  }
  function se(s, B, P) {
    let te = hasAnthropicMemoryMeta(s),
      K = Ae(s.message) ? s.message : void 0,
      fe = K === void 0 ? void 0 : Ho(K);
    if (K === void 0 || fe === void 0) {
      if (te) return ((q = !0), B === "transcript" ? je(s, []) : oe("memory_row", s));
      let pe = [...vs, ...REMOTE_RESULT_FIELDS];
      if (!vd(s, pe)) return s;
      let Ve = { ...s };
      for (let it of pe) delete Ve[it];
      return Ve;
    }
    let we = !1,
      Ne = !1,
      Nt = !1,
      Ut = !1,
      Kr = new Set(),
      mapped = fe.map((pe) => {
        if (On.has(pe.type)) {
          if (typeof pe.id === "string") N.add(pe.id);
          if (!Y(pe, P)) {
            if (typeof pe.id === "string") Kr.add(pe.id);
            return pe;
          }
          return ((q = !0), (we = !0), st(pe, !1));
        }
        if (No.has(pe.type)) {
          let tool_use_id = pe.tool_use_id,
            it = WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER;
          if (typeof tool_use_id === "string" && ie(tool_use_id, P));
          else if (typeof tool_use_id === "string" && N.has(tool_use_id)) return ((Nt = !0), pe);
          else if (typeof tool_use_id === "string" && te);
          else it = Bo;
          if (it === WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER) q = !0;
          return ((Ne = !0), Ke(pe, it));
        }
        return pe;
      });
    if (te && !Ne) {
      if (!Nt) return ((q = !0), B === "transcript" ? je(s, fe) : oe("memory_row", s));
      Ut = !0;
    }
    if (!we && !Ne && !Ut) return s;
    if (ot() === "drop") return B === "transcript" ? je(s, fe) : oe("kill_switch", s);
    let vt = { ...s, message: { ...K, content: mapped } };
    for (let pe of CLASSIFIER_CONTEXT_FIELDS) delete vt[pe];
    if (Ne || Ut) for (let pe of REMOTE_RESULT_FIELDS) delete vt[pe];
    if (we)
      for (let pe of vs) {
        let Ve = vt[pe];
        if (!Ae(Ve)) continue;
        let it = Do(Ve, (Xo, $n) => Kr.has($n));
        if (Object.keys(it).length > 0) vt[pe] = it;
        else delete vt[pe];
      }
    return vt;
  }
  function ge(s, B, P) {
    let te = Fo(s) || (typeof s.uuid === "string" && x.has(s.uuid));
    if ((nt(s), !X())) return se(s, B, P);
    let K = Ae(s.message) ? s.message : void 0;
    if (ot() === "drop")
      return B === "transcript" ? je(s, K === void 0 ? [] : (Ho(K) ?? [])) : oe("kill_switch", s);
    let fe = te ? sd : `<${LOCAL_COMMAND_STDOUT}>${id}</${LOCAL_COMMAND_STDOUT}>`,
      we = {
        ...s,
        message: {
          ...(K === void 0 ? { role: "user" } : Ur(K, ms)),
          content: K !== void 0 && typeof K.content === "string" ? fe : [{ type: "text", text: fe }],
        },
      };
    delete we.modelOnlyText;
    for (let Ne of [...REMOTE_RESULT_FIELDS, ...CLASSIFIER_CONTEXT_FIELDS])
      if (Ne !== "summarizeMetadata") delete we[Ne];
    return we;
  }
  function X() {
    if (q) return !0;
    try {
      return n.accountMemoryInPlay?.() !== !1;
    } catch {
      return !0;
    }
  }
  function je(s, B) {
    let P = Ur(s, jo);
    if (s.type === "system") return P;
    if (Ae(s.attachment))
      return ((P.attachment = { type: s.attachment.type, version: null, content: null }), P);
    let mapped = B.map((K) =>
      On.has(K.type)
        ? st(K, !0)
        : No.has(K.type)
          ? Ke(
              K,
              typeof K.tool_use_id === "string" && ie(K.tool_use_id, "history")
                ? WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER
                : Bo,
            )
          : { type: "text", text: Pn },
    );
    return (
      (P.message = {
        role: s.type === "assistant" ? "assistant" : "user",
        ...Ur(Ae(s.message) ? s.message : {}, ms),
        content: mapped.length > 0 ? mapped : [{ type: "text", text: Pn }],
      }),
      P
    );
  }
  function Le(s, B) {
    if (s.type === "async_hook_response") {
      if (typeof s.toolName === "string") return isTrustedMemoryTool(s.toolName, placeAccountMemoryTool, B);
      if (typeof s.hookEvent !== "string") return !0;
      return s.hookEvent === POSTCOMPACT ? X() : _d.has(s.hookEvent);
    }
    return (
      (fd.has(s.hookEvent) && s.accountMemoryBatch !== !1) ||
      (typeof s.toolUseID === "string" && ie(s.toolUseID, B))
    );
  }
  function at(s, B) {
    return (
      (typeof s.toolName === "string" && isTrustedMemoryTool(s.toolName, placeAccountMemoryTool, B)) ||
      (typeof s.toolUseID === "string" && ie(s.toolUseID, B))
    );
  }
  function dt(s, B) {
    let P = Ur(s, jo),
      te = {};
    for (let [K, fe] of Object.entries(ud)) for (let we of fe) if (typeof B[we] === K) te[we] = B[we];
    for (let K of cd) if (B[K] !== void 0) te[K] = Array.isArray(B[K]) ? [] : "";
    if (B.type === "hook_system_message") te.content = Pn;
    if (B.blockingError !== void 0) te.blockingError = { blockingError: "", command: "" };
    if (B.response !== void 0) te.response = {};
    if (B.toolInput !== void 0) te.toolInput = {};
    return ((P.attachment = te), P);
  }
  function lt(s) {
    let B = A.get(s);
    if (B === void 0) ((B = new Map()), A.set(s, B));
    return B;
  }
  function jt(s, B, P, te, K, fe) {
    let tool_use_id = P.tool_use_id,
      Ne = WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER;
    if (typeof tool_use_id === "string" && ie(tool_use_id, fe));
    else if (hasAnthropicMemoryMeta(s));
    else if (typeof tool_use_id === "string" && N.has(tool_use_id)) {
      if (K !== void 0) lt(te).delete(K);
      return s;
    } else Ne = Bo;
    if (K !== void 0) lt(te).set(K, !0);
    if (Ne === WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER) q = !0;
    if (ot() === "drop") return oe("kill_switch", s);
    let Nt = { ...s, event: { ...B, content_block: Ke(P, Ne) } };
    for (let Ut of [...REMOTE_RESULT_FIELDS, ...CLASSIFIER_CONTEXT_FIELDS]) delete Nt[Ut];
    return Nt;
  }
  function Qe(s, B) {
    let event = s.event;
    if (!Ae(event)) return s;
    let te = typeof s.parent_tool_use_id === "string" ? s.parent_tool_use_id : "";
    if (event.type === "message_start" || event.type === "message_stop") return (A.delete(te), s);
    let K = typeof event.index === "number" ? event.index : void 0;
    if (event.type === "content_block_start") {
      let fe = Ae(event.content_block) ? event.content_block : {};
      if (No.has(fe.type)) return jt(s, event, fe, te, K, B);
      let we = On.has(fe.type),
        Ne = we && Y(fe, B);
      if (we && typeof fe.id === "string") N.add(fe.id);
      if (Ne) q = !0;
      if (K !== void 0)
        if (we || hd.has(fe.type)) lt(te).set(K, Ne);
        else lt(te).delete(K);
      if (!Ne) return s;
      if (ot() === "drop") return oe("kill_switch", s);
      return { ...s, event: { ...event, content_block: st(fe, !1) } };
    }
    if (event.type === "content_block_stop" && K !== void 0) return (A.get(te)?.delete(K), s);
    if (event.type === "content_block_delta") {
      let fe = K === void 0 ? void 0 : A.get(te)?.get(K);
      if (fe === !0) return oe("memory_row", s);
      if (fe === void 0) return oe("untracked_delta", s);
    }
    return s;
  }
  function $r(s, B, P) {
    if (!Ae(s)) return;
    switch (s.type) {
      case "stream_event":
        return Qe(s, P);
      case "attachment":
        if (!Ae(s.attachment)) return s;
        if (hs.has(s.attachment.type)) {
          if (s.attachment.content === null) return s;
          return ((q = !0), B === "transcript" ? je(s, []) : oe("memory_row", s));
        }
        if (Le(s.attachment, P)) {
          if (at(s.attachment, P)) q = !0;
          return B === "transcript" ? dt(s, s.attachment) : oe("memory_row", s);
        }
        return s;
      case "system":
        if (
          s.subtype !== ACCOUNT_MEMORY_SAVED &&
          s.persist !== !1 &&
          ![s.tool_use_id, s.toolUseID].some((te) => typeof te === "string" && ie(te, P))
        )
          return s;
        if (s.subtype === ACCOUNT_MEMORY_SAVED || s.persist !== !1) q = !0;
        return B === "transcript" ? je(s, []) : oe("memory_row", s);
      case "control_request":
        if (Ae(s.request) && isAccountMemoryControlRequest(s.request, placeAccountMemoryTool)) {
          if (typeof s.request.tool_name === "string" || typeof s.request.dialog_kind === "string") q = !0;
          return oe("memory_row", s);
        }
        return s;
      default:
        return Fo(s) ||
          isCompactSummaryMessage(s) ||
          (typeof s.uuid === "string" && (x.has(s.uuid) || Q.has(s.uuid)))
          ? ge(s, B, P)
          : se(s, B, P);
    }
  }
  function Wr(s, B) {
    if (B === "transcript")
      try {
        let P = Ur(s, jo);
        return (
          (P.message = {
            role: P.type === "assistant" ? "assistant" : "user",
            content: [{ type: "text", text: Pn }],
          }),
          Re("unreadable", s),
          P
        );
      } catch {}
    return oe("unreadable", s);
  }
  function xn(s, B, P) {
    try {
      return $r(s, B, P) ?? s;
    } catch {
      return Ae(s) ? Wr(s, B) : Z;
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
      return (
        Gr(s, B),
        s.filter((P) => {
          if (!Ae(P)) return !0;
          try {
            if (P.type !== "attachment" || !Ae(P.attachment) || !Le(P.attachment, B)) return !0;
            if (at(P.attachment, B)) q = !0;
            return (Re("memory_row", P), !1);
          } catch {
            return (Re("unreadable", P), !1);
          }
        })
      );
    },
    wrapInternalEventWriter(s, B = "history") {
      return (P, te, K) => {
        let [fe] = qr([te], "transcript", B);
        return fe === void 0 ? Promise.resolve() : s(P, fe, K);
      };
    },
  };
}
//@ chunk-4cm44bmp.js:17662-17728 placement
var bd = new Set(["auto_default", "auto_settings", "explicit", "sdk"]);
//@ chunk-4cm44bmp.js:17728-17781 placement
function Lo(n) {
  return typeof n === "string" && bd.has(n);
}
/**
 * tengu_noble_snowflake 的 schema：scope、backfill_messages（夹在 50–500，默认 200）、eager_result。
 */
//@ chunk-4cm44bmp.js:17781-18054 placement
var DEFAULT_BACKFILL_MESSAGES = 200,
  MIN_BACKFILL_MESSAGES = 50,
  MAX_BACKFILL_MESSAGES = 500,
  DEFAULT_HISTORY_BACKFILL_CONFIG = {
    scope: "off",
    backfillMessages: DEFAULT_BACKFILL_MESSAGES,
    eagerResult: !1,
  },
  historyBackfillConfigSchema = DoctorLazy(() =>
    u({
      scope: U(["off", "auto_default", "auto", "auto_and_sdk", "all"]).catch("off"),
      backfill_messages: E()
        .int()
        .transform((n) => Math.min(MAX_BACKFILL_MESSAGES, Math.max(MIN_BACKFILL_MESSAGES, n)))
        .catch(DEFAULT_BACKFILL_MESSAGES),
      eager_result: M().catch(!1),
    }),
  );
//@ chunk-4cm44bmp.js:18054-18218 placement
function parseHistoryBackfillConfig(n) {
  let safeParse = historyBackfillConfigSchema().safeParse(n);
  if (!safeParse.success) return DEFAULT_HISTORY_BACKFILL_CONFIG;
  return {
    scope: safeParse.data.scope,
    backfillMessages: safeParse.data.backfill_messages,
    eagerResult: safeParse.data.eager_result,
  };
}
//@ chunk-4cm44bmp.js:18218-18275 placement
function Es() {
  return parseHistoryBackfillConfig(getFeatureValue_CACHED_MAY_BE_STALE("tengu_noble_snowflake", null));
}
/**
 * 判断历史回填 scope（off/auto_default/auto/auto_and_sdk/all）是否覆盖本次 Remote Control 的来源（auto_default、auto_settings、sdk 等）；来源未知时不回填。
 */
//@ chunk-4cm44bmp.js:18275-18544 placement
function isBackfillScopeAllowedForOrigin(n, h) {
  if (h === void 0) return !1;
  switch (n) {
    case "off":
      return !1;
    case "auto_default":
      return h === "auto_default";
    case "auto":
      return h === "auto_default" || h === "auto_settings";
    case "auto_and_sdk":
      return h === "auto_default" || h === "auto_settings" || h === "sdk";
    case "all":
      return !0;
  }
}
//@ chunk-4cm44bmp.js:18544-18699 placement = countToolCallsSince (1)
function hasUserMessagingToolUse(n) {
  return (
    n.type === "assistant" &&
    Array.isArray(n.message.content) &&
    n.message.content.some(
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
  hKs,
  y6n,
  _6n,
  createRemoteBridgeRedactor,
  sendWithEpochFollowUps,
  DEFAULT_HISTORY_BACKFILL_CONFIG,
  Es,
  isBackfillScopeAllowedForOrigin,
  BoundedIdSet,
  hasUserMessagingToolUse,
  isTaskLifecycleMessage,
  Lo,
  settleRemoteBridgeDelivery,
  isAccountMemoryControlRequest,
};
