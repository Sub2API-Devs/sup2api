/**
 * tools/REPLTool/replCallNotes.ts
 *
 * 2.1.316 新增：REPL 工具调用说明。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-w58jdysw.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getTerminalMcpTools } from "../../utils/transcript/deserialize.js";

//@ chunk-w58jdysw.js:228-552 placement
/**
 * 从助手消息中收集 REPL 调用说明：REPL 类工具直接取 input.text，其他工具调用取之前记录的、按 replCallId 关联的说明。
 */
function replCallNotesText(message, replCallNotes = []) {
  let content = message.message.content;
  if (!Array.isArray(content)) return "";
  let terminalMcpTools = getTerminalMcpTools();
  if (terminalMcpTools.size === 0) return "";
  return content
    .flatMap((block) => {
      if (block.type !== "tool_use") return [];
      if (!terminalMcpTools.has(block.name))
        return replCallNotes
          .filter((replCall) => replCall.replCallId === block.id)
          .map((replCall) => replCall.text);
      let text = block.input?.text;
      return typeof text === "string" ? [text] : [];
    })
    .filter(Boolean).join(`
`);
}
//@ chunk-w58jdysw.js:552-560 placement
/**
 * 最近 REPL 调用说明的缓冲上限（8 条）。
 */
var MAX_REPL_CALL_NOTES = 8;
//@ chunk-w58jdysw.js:560-763 placement
/**
 * 缓存最近的 REPL 调用说明（按 replCallId，数量有上限），可一次取走或清空。
 */
class ReplCallNoteBuffer {
  #t = [];
  note(replCallId, value) {
    let text = value.text;
    if (typeof text !== "string" || !text) return;
    this.#t.push({
      replCallId,
      text,
    });
    if (this.#t.length > MAX_REPL_CALL_NOTES) this.#t.shift();
  }
  take() {
    return this.#t.splice(0);
  }
  clear() {
    this.#t.length = 0;
  }
}
export { ReplCallNoteBuffer, replCallNotesText };
