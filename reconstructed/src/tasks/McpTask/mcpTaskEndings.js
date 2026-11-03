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
import { safeIdentifierOrUndefined } from "../../utils/safeIdentifier.js";

//@ chunk-r7bynxfq.js:377-2517 placement
/**
 * 保存 MCP 后台任务"结束"记录直到对应对话被持久化：hold 登记、look 扫描消息找到任务通知与后续工具调用位置、保存成功后删除已落盘的结束文件；回退（rewind）删除发起调用时撤销记录；保存不完整时把结束留给下次恢复。
 */
class McpTaskEndingsStore {
  #e = new Map();
  #n;
  #t = new Map();
  #s = 0;
  #i = false;
  #o = false;
  savesWith(e) {
    this.#n = e;
  }
  hold(e, ending, deleteFile) {
    if (this.#n?.isOn()) {
      this.#t.delete(e);
      this.#e.set(e, {
        ending,
        deleteFile,
        lostAtHold: this.#n.lostSoFar(),
      });
    }
  }
  forget(e) {
    this.#e.delete(e);
    this.#t.delete(e);
  }
  withdraw(e) {
    let n = [];
    for (let [s, { ending: i, deleteFile: d }] of this.#e)
      if (i.toolUseId !== undefined && e(i.toolUseId)) {
        let r = this.#t.has(s);
        this.forget(s);
        d(r);
        n.push(s);
        logForDebugging(
          `MCP task endings: a rewind removes the call that started task ${s}, so its saved ending is being deleted`,
        );
      }
    return n;
  }
  get isConversationSaved() {
    return this.#n?.isOn() ?? false;
  }
  isHeld(e) {
    return this.#e.has(e);
  }
  look(e, n) {
    if (this.#e.size === 0) return;
    let sessionId = getSessionId();
    let i = new Map();
    for (let j = 0; j < n; j++) {
      let msg = e[j];
      let o = stickyPromptRunId(msg);
      if (o !== undefined) {
        let a = this.#e.get(o);
        if (a?.ending.sessionId === sessionId && a.ending.runId === getTaskNotificationRunId(msg))
          i.set(o, msg.uuid);
      } else if (i.size === 0) continue;
      else if (msg.type === "system" && msg.subtype === "compact_boundary") i.clear();
      else if (countToolCallsSince(msg)) {
        for (let [a, u] of i) this.#t.set(a, [u, msg.uuid]);
        i.clear();
      }
    }
    this.#s++;
    return (d) => {
      this.#s--;
      if (d) this.#a();
      else this.#d([...this.#e.keys()]);
    };
  }
  #r() {
    if (this.#s > 0) return [];
    let e = [];
    for (let [n, s] of this.#t) {
      let i = this.#e.get(n);
      if (i !== undefined) e.push([n, i, s]);
    }
    return e;
  }
  #d(e) {
    for (let n of e) {
      this.#e.delete(n);
      this.#t.delete(n);
      logForDebugging(
        `MCP task endings: part of the conversation may not have been saved, so the saved ending of task ${n} is left for the next resume`,
        {
          level: "warn",
        },
      );
    }
  }
  async #a() {
    let e = this.#n;
    if (e === undefined) return;
    if (this.#i) {
      this.#o = true;
      return;
    }
    this.#i = true;
    try {
      for (let n = this.#r(); n.length > 0; n = this.#r()) {
        this.#o = false;
        let s = await e.save(n.flatMap(([, , o]) => o)).catch(() => false);
        let i = e.lostSoFar();
        let filtered = n.filter(([o, a]) => this.#e.get(o) === a);
        let filtered_2 = filtered.filter(([, o]) => o.lostAtHold === i);
        this.#d(filtered.filter(([, o]) => o.lostAtHold !== i).map(([o]) => o));
        if (!s) {
          if (this.#o) continue;
          if (filtered_2.length > 0)
            logForDebugging(
              `MCP task endings: the conversation is not confirmed saved, so ${filtered_2.length} saved ending(s) are kept and checked again at the next save or resume`,
            );
          return;
        }
        for (let [o, a] of filtered_2) {
          this.#e.delete(o);
          this.#t.delete(o);
          a.deleteFile(true);
          logForDebugging(
            `MCP task endings: the model has read the notification of task ${o}, so its saved ending is being deleted`,
          );
        }
      }
    } catch (error) {
      logError(error);
    } finally {
      this.#i = false;
    }
  }
}
//@ chunk-r7bynxfq.js:2517-2706 placement = countToolCallsSince (1)
function countToolCallsSince(e) {
  if (e.type !== "assistant" || e.message.model === SYNTHETIC_MODEL) return false;
  let { content } = e.message;
  return (
    Array.isArray(content) &&
    content.some((block) => block.type === "tool_use" || (block.type === "text" && block.text.trim() !== ""))
  );
}
//@ chunk-r7bynxfq.js:2706-2732 placement
/**
 * 按会话保存的 MCP 任务结束记录。
 */
var mcpTaskEndingsSlots = new SessionRootSlot(() => new McpTaskEndingsStore());
//@ chunk-r7bynxfq.js:2732-2793 placement
/**
 * 会话是否已保存。
 */
function isConversationSaved() {
  return mcpTaskEndingsSlots.peek(getRootSession())?.isConversationSaved ?? false;
}
//@ chunk-r7bynxfq.js:2793-2859 placement
/**
 * 暂存 MCP 任务结束记录（异常吞掉）。
 */
function holdMcpTaskEnding(registryId, n, s) {
  try {
    mcpTaskEndingsSlots.peek(getRootSession())?.hold(registryId, n, s);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-r7bynxfq.js:2859-2900 placement
/**
 * 丢弃某 MCP 任务的结束记录。
 */
function forgetMcpTaskEnding(registryId) {
  mcpTaskEndingsSlots.peek(getRootSession())?.forget(registryId);
}
//@ chunk-r7bynxfq.js:2900-3023 placement
function lookMcpTaskEndings(messages, n, session) {
  try {
    let i = mcpTaskEndingsSlots.peek(session ?? getRootSession())?.look(messages, n);
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
/**
 * 从黏性提示文本里取运行 id。
 */
function stickyPromptRunId(message) {
  return regExp.exec(getStickyPromptText(message) ?? "")?.[1];
}
//@ chunk-r7bynxfq.js:3070-3463 placement = computeStickyPromptText (0.757)
function getTaskNotificationRunId(msg) {
  if (msg.type === "user")
    return msg.origin?.kind === "task-notification" && msg.origin.subkind === undefined
      ? safeIdentifierOrUndefined(msg.origin.runId)
      : undefined;
  return msg.type === "attachment" &&
    msg.attachment?.type === "queued_command" &&
    msg.attachment.commandMode === "task-notification" &&
    (msg.attachment.origin == null ||
      (msg.attachment.origin.kind === "task-notification" && msg.attachment.origin.subkind === undefined))
    ? safeIdentifierOrUndefined(msg.attachment.runId)
    : undefined;
}
//@ chunk-r7bynxfq.js:3463-3833 placement = buildTranscriptEntries (0.777)
function getStickyPromptText(message) {
  if (getTaskNotificationRunId(message) === undefined) return;
  if (message.type === "attachment")
    return message.attachment.type === "queued_command" && typeof message.attachment.prompt === "string"
      ? message.attachment.prompt
      : undefined;
  let content = message.type === "user" ? message.message?.content : undefined;
  let s = Array.isArray(content) ? content[0] : content;
  if (typeof s === "string") return s;
  return typeof s === "object" && s !== null && "text" in s && typeof s.text === "string"
    ? s.text
    : undefined;
}
export {
  forgetMcpTaskEnding,
  holdMcpTaskEnding,
  stickyPromptRunId,
  getTaskNotificationRunId,
  mcpTaskEndingsSlots,
  lookMcpTaskEndings,
  isConversationSaved,
};
