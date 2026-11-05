/**
 * tasks/McpTask/mcpTaskEndings.ts
 *
 * 2.1.316 新增：MCP 任务结束处理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kjqmj0rw.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logForDebugging } from "../../utils/debug.js";
import { getSessionId, getRootSession } from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import { SYNTHETIC_MODEL } from "../../utils/messages.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { regExp } from "../../utils/xmlTags.js";
import { safeIdentifierOrUndefined } from "../../utils/safeIdentifier.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-kjqmj0rw.js:410-2550 placement
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
  savesWith(saver) {
    this.#n = saver;
  }
  hold(registryId, ending, deleteFile) {
    if (this.#n?.isOn()) {
      this.#t.delete(registryId);
      this.#e.set(registryId, {
        ending,
        deleteFile,
        lostAtHold: this.#n.lostSoFar(),
      });
    }
  }
  forget(registryId) {
    this.#e.delete(registryId);
    this.#t.delete(registryId);
  }
  withdraw(matchesToolUseId) {
    let removed = [];
    for (let [id, { ending, deleteFile }] of this.#e)
      if (ending.toolUseId !== undefined && matchesToolUseId(ending.toolUseId)) {
        let wasSeen = this.#t.has(id);
        this.forget(id);
        deleteFile(wasSeen);
        removed.push(id);
        logForDebugging(
          `MCP task endings: a rewind removes the call that started task ${id}, so its saved ending is being deleted`,
        );
      }
    return removed;
  }
  get isConversationSaved() {
    return this.#n?.isOn() ?? false;
  }
  isHeld(registryId) {
    return this.#e.has(registryId);
  }
  look(messages, count) {
    if (this.#e.size === 0) return;
    let sessionId = getSessionId();
    let firstSeenUuid = new Map();
    for (let j = 0; j < count; j++) {
      let message = messages[j];
      let runId = stickyPromptRunId(message);
      if (runId !== undefined) {
        let entry = this.#e.get(runId);
        if (entry?.ending.sessionId === sessionId && entry.ending.runId === getTaskNotificationRunId(message))
          firstSeenUuid.set(runId, message.uuid);
      } else if (firstSeenUuid.size === 0) continue;
      else if (message.type === "system" && message.subtype === "compact_boundary") firstSeenUuid.clear();
      else if (hasVisibleContent(message)) {
        for (let [id, uuid] of firstSeenUuid) this.#t.set(id, [uuid, message.uuid]);
        firstSeenUuid.clear();
      }
    }
    this.#s++;
    return (onSaved) => {
      this.#s--;
      if (onSaved) this.#a();
      else this.#d([...this.#e.keys()]);
    };
  }
  #r() {
    if (this.#s > 0) return [];
    let ready = [];
    for (let [id, uuiids] of this.#t) {
      let entry = this.#e.get(id);
      if (entry !== undefined) ready.push([id, entry, uuiids]);
    }
    return ready;
  }
  #d(ids) {
    for (let id of ids) {
      this.#e.delete(id);
      this.#t.delete(id);
      logForDebugging(
        `MCP task endings: part of the conversation may not have been saved, so the saved ending of task ${id} is left for the next resume`,
        {
          level: "warn",
        },
      );
    }
  }
  async #a() {
    let saver = this.#n;
    if (saver === undefined) return;
    if (this.#i) {
      this.#o = true;
      return;
    }
    this.#i = true;
    try {
      for (let batch = this.#r(); batch.length > 0; batch = this.#r()) {
        this.#o = false;
        let didSave = await saver.save(batch.flatMap(([, , uuids]) => uuids)).catch(() => false);
        let lostSoFar = saver.lostSoFar();
        let filtered = batch.filter(([id, entry]) => this.#e.get(id) === entry);
        let filtered_2 = filtered.filter(([, entry]) => entry.lostAtHold === lostSoFar);
        this.#d(filtered.filter(([, entry]) => entry.lostAtHold !== lostSoFar).map(([id]) => id));
        if (!didSave) {
          if (this.#o) continue;
          if (filtered_2.length > 0)
            logForDebugging(
              `MCP task endings: the conversation is not confirmed saved, so ${filtered_2.length} saved ending(s) are kept and checked again at the next save or resume`,
            );
          return;
        }
        for (let [id, entry] of filtered_2) {
          this.#e.delete(id);
          this.#t.delete(id);
          entry.deleteFile(true);
          logForDebugging(
            `MCP task endings: the model has read the notification of task ${id}, so its saved ending is being deleted`,
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
//@ chunk-kjqmj0rw.js:2550-2739 placement
function hasVisibleContent(message) {
  if (message.type !== "assistant" || message.message.model === SYNTHETIC_MODEL) return false;
  let { content } = message.message;
  return (
    Array.isArray(content) &&
    content.some((block) => block.type === "tool_use" || (block.type === "text" && block.text.trim() !== ""))
  );
}
//@ chunk-kjqmj0rw.js:2739-2765 placement
/**
 * 按会话保存的 MCP 任务结束记录。
 */
var mcpTaskEndingsSlots; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-kjqmj0rw.js:2739", () => {
  mcpTaskEndingsSlots = new SessionRootSlot(() => new McpTaskEndingsStore());
});
//@ chunk-kjqmj0rw.js:2765-2826 placement
/**
 * 会话是否已保存。
 */
function isConversationSaved() {
  return mcpTaskEndingsSlots.peek(getRootSession())?.isConversationSaved ?? false;
}
//@ chunk-kjqmj0rw.js:2826-2892 placement
/**
 * 暂存 MCP 任务结束记录（异常吞掉）。
 */
function holdMcpTaskEnding(registryId, ending, deleteFile) {
  try {
    mcpTaskEndingsSlots.peek(getRootSession())?.hold(registryId, ending, deleteFile);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-kjqmj0rw.js:2892-2933 placement
/**
 * 丢弃某 MCP 任务的结束记录。
 */
function forgetMcpTaskEnding(registryId) {
  mcpTaskEndingsSlots.peek(getRootSession())?.forget(registryId);
}
//@ chunk-kjqmj0rw.js:2933-3056 placement
function lookMcpTaskEndings(messages, count, session) {
  try {
    let lookup = mcpTaskEndingsSlots.peek(session ?? getRootSession())?.look(messages, count);
    return (
      lookup &&
      ((onSaved) => {
        try {
          lookup(onSaved);
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
//@ chunk-kjqmj0rw.js:3056-3103 placement
/**
 * 从黏性提示文本里取运行 id。
 */
function stickyPromptRunId(message) {
  return regExp.exec(getStickyPromptText(message) ?? "")?.[1];
}
//@ chunk-kjqmj0rw.js:3103-3496 placement (2.1.88 match: computeStickyPromptText, 0.755)
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
//@ chunk-kjqmj0rw.js:3496-3866 placement (2.1.88 match: buildTranscriptEntries, 0.902)
function getStickyPromptText(message) {
  if (getTaskNotificationRunId(message) === undefined) return;
  if (message.type === "attachment")
    return message.attachment.type === "queued_command" && typeof message.attachment.prompt === "string"
      ? message.attachment.prompt
      : undefined;
  let content = message.type === "user" ? message.message?.content : undefined;
  let firstBlock = Array.isArray(content) ? content[0] : content;
  if (typeof firstBlock === "string") return firstBlock;
  return typeof firstBlock === "object" &&
    firstBlock !== null &&
    "text" in firstBlock &&
    typeof firstBlock.text === "string"
    ? firstBlock.text
    : undefined;
}
export {
  mcpTaskEndingsSlots,
  lookMcpTaskEndings,
  holdMcpTaskEnding,
  isConversationSaved,
  forgetMcpTaskEnding,
  stickyPromptRunId,
  getTaskNotificationRunId,
};
