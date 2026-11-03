/**
 * tools/REPLTool/replCallNotes.ts
 *
 * 2.1.316 新增：REPL 工具调用说明。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jmgtqjwe.js (3)
 * attribution: placement 3
 */
import { getTerminalMcpTools } from "../../utils/transcript/deserialize.js";

/**
 * 从助手消息中收集 REPL 调用说明：REPL 类工具直接取 input.text，其他工具调用取之前记录的、按 replCallId 关联的说明。
 */
//@ chunk-jmgtqjwe.js:228-552 placement
function replCallNotesText(s, r = []) {
  let content = s.message.content;
  if (!Array.isArray(content)) return "";
  let o = getTerminalMcpTools();
  if (o.size === 0) return "";
  return content
    .flatMap((e) => {
      if (e.type !== "tool_use") return [];
      if (!o.has(e.name)) return r.filter((n) => n.replCallId === e.id).map((n) => n.text);
      let i = e.input?.text;
      return typeof i === "string" ? [i] : [];
    })
    .filter(Boolean).join(`
`);
}
//@ chunk-jmgtqjwe.js:552-560 placement
var p = 8;
/**
 * 缓存最近的 REPL 调用说明（按 replCallId，数量有上限），可一次取走或清空。
 */
//@ chunk-jmgtqjwe.js:560-763 placement
class ReplCallNoteBuffer {
  #t = [];
  note(s, r) {
    let text = r.text;
    if (typeof text !== "string" || !text) return;
    if ((this.#t.push({ replCallId: s, text: text }), this.#t.length > p)) this.#t.shift();
  }
  take() {
    return this.#t.splice(0);
  }
  clear() {
    this.#t.length = 0;
  }
}

export { ReplCallNoteBuffer, replCallNotesText };
