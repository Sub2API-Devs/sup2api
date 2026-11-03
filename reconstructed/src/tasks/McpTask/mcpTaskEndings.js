/**
 * tasks/McpTask/mcpTaskEndings.ts
 *
 * 2.1.316 新增：MCP 任务结束处理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-r7bynxfq.js (10)
 * attribution: placement 10
 */
import { logForDebugging } from "../../utils/debug.js";
import { getSessionId, getRootSession } from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { regExp } from "../../utils/xmlTags.js";
import { kN } from "../../utils/safeIdentifier.js";

/**
 * 保存 MCP 后台任务"结束"记录直到对应对话被持久化：hold 登记、look 扫描消息找到任务通知与后续工具调用位置、保存成功后删除已落盘的结束文件；回退（rewind）删除发起调用时撤销记录；保存不完整时把结束留给下次恢复。
 */
//@ chunk-r7bynxfq.js:377-2517 placement
class McpTaskEndingsStore {
  #e = new Map();
  #n;
  #t = new Map();
  #s = 0;
  #i = !1;
  #o = !1;
  savesWith(e) {
    this.#n = e;
  }
  hold(e, n, s) {
    if (this.#n?.isOn())
      (this.#t.delete(e), this.#e.set(e, { ending: n, deleteFile: s, lostAtHold: this.#n.lostSoFar() }));
  }
  forget(e) {
    (this.#e.delete(e), this.#t.delete(e));
  }
  withdraw(e) {
    let n = [];
    for (let [s, { ending: i, deleteFile: d }] of this.#e)
      if (i.toolUseId !== void 0 && e(i.toolUseId)) {
        let r = this.#t.has(s);
        (this.forget(s),
          d(r),
          n.push(s),
          logForDebugging(
            `MCP task endings: a rewind removes the call that started task ${s}, so its saved ending is being deleted`,
          ));
      }
    return n;
  }
  get isConversationSaved() {
    return this.#n?.isOn() ?? !1;
  }
  isHeld(e) {
    return this.#e.has(e);
  }
  look(e, n) {
    if (this.#e.size === 0) return;
    let s = getSessionId(),
      i = new Map();
    for (let d = 0; d < n; d++) {
      let r = e[d],
        o = qLo(r);
      if (o !== void 0) {
        let a = this.#e.get(o);
        if (a?.ending.sessionId === s && a.ending.runId === getTaskNotificationRunId(r)) i.set(o, r.uuid);
      } else if (i.size === 0) continue;
      else if (r.type === "system" && r.subtype === "compact_boundary") i.clear();
      else if (countToolCallsSince(r)) {
        for (let [a, u] of i) this.#t.set(a, [u, r.uuid]);
        i.clear();
      }
    }
    return (
      this.#s++,
      (d) => {
        if ((this.#s--, d)) this.#a();
        else this.#d([...this.#e.keys()]);
      }
    );
  }
  #r() {
    if (this.#s > 0) return [];
    let e = [];
    for (let [n, s] of this.#t) {
      let i = this.#e.get(n);
      if (i !== void 0) e.push([n, i, s]);
    }
    return e;
  }
  #d(e) {
    for (let n of e)
      (this.#e.delete(n),
        this.#t.delete(n),
        logForDebugging(
          `MCP task endings: part of the conversation may not have been saved, so the saved ending of task ${n} is left for the next resume`,
          { level: "warn" },
        ));
  }
  async #a() {
    let e = this.#n;
    if (e === void 0) return;
    if (this.#i) {
      this.#o = !0;
      return;
    }
    this.#i = !0;
    try {
      for (let n = this.#r(); n.length > 0; n = this.#r()) {
        this.#o = !1;
        let s = await e.save(n.flatMap(([, , o]) => o)).catch(() => !1),
          lostSoFar = e.lostSoFar(),
          filtered = n.filter(([o, a]) => this.#e.get(o) === a),
          filtered_2 = filtered.filter(([, o]) => o.lostAtHold === lostSoFar);
        if ((this.#d(filtered.filter(([, o]) => o.lostAtHold !== lostSoFar).map(([o]) => o)), !s)) {
          if (this.#o) continue;
          if (filtered_2.length > 0)
            logForDebugging(
              `MCP task endings: the conversation is not confirmed saved, so ${filtered_2.length} saved ending(s) are kept and checked again at the next save or resume`,
            );
          return;
        }
        for (let [o, a] of filtered_2)
          (this.#e.delete(o),
            this.#t.delete(o),
            a.deleteFile(!0),
            logForDebugging(
              `MCP task endings: the model has read the notification of task ${o}, so its saved ending is being deleted`,
            ));
      }
    } catch (error) {
      logError(error);
    } finally {
      this.#i = !1;
    }
  }
}
//@ chunk-r7bynxfq.js:2517-2706 placement = countToolCallsSince (1)
function countToolCallsSince(e) {
  if (e.type !== "assistant" || e.message.model === SYNTHETIC_MODEL) return !1;
  let { content: content } = e.message;
  return (
    Array.isArray(content) &&
    content.some((block) => block.type === "tool_use" || (block.type === "text" && block.text.trim() !== ""))
  );
}
//@ chunk-r7bynxfq.js:2706-2732 placement
var Yze = new SessionRootSlot(() => new McpTaskEndingsStore());
//@ chunk-r7bynxfq.js:2732-2793 placement
function Xzs() {
  return Yze.peek(getRootSession())?.isConversationSaved ?? !1;
}
//@ chunk-r7bynxfq.js:2793-2859 placement
function UYn(e, n, s) {
  try {
    Yze.peek(getRootSession())?.hold(e, n, s);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-r7bynxfq.js:2859-2900 placement
function Jzs(e) {
  Yze.peek(getRootSession())?.forget(e);
}
//@ chunk-r7bynxfq.js:2900-3023 placement
function lookMcpTaskEndings(e, n, s) {
  try {
    let i = Yze.peek(s ?? getRootSession())?.look(e, n);
    return (
      i &&
      ((d) => {
        try {
          i(d);
        } catch (error) {
          logError(error);
        }
      })
    );
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-r7bynxfq.js:3023-3070 placement
function qLo(e) {
  return regExp.exec(getStickyPromptText(e) ?? "")?.[1];
}
//@ chunk-r7bynxfq.js:3070-3463 placement = computeStickyPromptText (0.757)
function getTaskNotificationRunId(msg) {
  if (msg.type === "user")
    return msg.origin?.kind === "task-notification" && msg.origin.subkind === void 0
      ? kN(msg.origin.runId)
      : void 0;
  return msg.type === "attachment" &&
    msg.attachment?.type === "queued_command" &&
    msg.attachment.commandMode === "task-notification" &&
    (msg.attachment.origin == null ||
      (msg.attachment.origin.kind === "task-notification" && msg.attachment.origin.subkind === void 0))
    ? kN(msg.attachment.runId)
    : void 0;
}
//@ chunk-r7bynxfq.js:3463-3833 placement = buildTranscriptEntries (0.777)
function getStickyPromptText(message) {
  if (getTaskNotificationRunId(message) === void 0) return;
  if (message.type === "attachment")
    return message.attachment.type === "queued_command" && typeof message.attachment.prompt === "string"
      ? message.attachment.prompt
      : void 0;
  let n = message.type === "user" ? message.message?.content : void 0,
    s = Array.isArray(n) ? n[0] : n;
  if (typeof s === "string") return s;
  return typeof s === "object" && s !== null && "text" in s && typeof s.text === "string" ? s.text : void 0;
}

export { Jzs, UYn, qLo, getTaskNotificationRunId, Yze, lookMcpTaskEndings, Xzs };
