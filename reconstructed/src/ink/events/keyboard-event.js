/**
 * ink/events/keyboard-event.ts
 *
 * 键盘事件对象（从解析后的按键构造 key/ctrl/meta/shift/super 等字段）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/events/keyboard-event.ts
 * pieces: chunk-bzr73sfg.js (2)
 * attribution: fingerprint 2
 */
import { TerminalEvent } from "./terminal-event.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { isEscPrefixedChunk } from "../line-width-cache.js";
import { getCsiUPrintableChar } from "../parse-keypress.js";

/**
 * 键盘事件（keydown，冒泡、可取消）：key（按键产生的字符或键名）、name、sequence、ctrl/shift/meta/superKey/fn、soloKeypress（本批只有这一个用户输入）、readLate（事件循环阻塞后读到）；readAsEscapeThenKey() 让处理器要求把 ESC+X 拆成两次按键重放。
 */
//@ chunk-bzr73sfg.js:251690-252209 fingerprint = KeyboardEvent (0.775)
class KeyboardEvent extends TerminalEvent {
  key;
  name;
  sequence;
  ctrl;
  shift;
  meta;
  superKey;
  fn;
  soloKeypress;
  readLate;
  #e = !1;
  constructor(n, u) {
    super("keydown", { bubbles: !0, cancelable: !0 });
    ((this.key = keyFromParsed(n)),
      (this.name = n.name ?? ""),
      (this.sequence = n.sequence ?? ""),
      (this.ctrl = n.ctrl),
      (this.shift = n.shift),
      (this.meta = n.meta || n.option),
      (this.superKey = n.super),
      (this.fn = n.fn),
      (this.soloKeypress = u?.soloKeypress),
      (this.readLate = n.readLate === !0));
  }
  readAsEscapeThenKey() {
    return ((this.#e = this.soloKeypress !== void 0 && isEscPrefixedChunk(this.sequence)), this.#e);
  }
  get isReadAsEscapeThenKey() {
    return this.#e;
  }
}
/**
 * 由 ParsedKey 推出 event.key：空格、Ctrl 组合给键名，可打印单字符给字符本身，Shift+字母给大写（CSI u 里带的 shifted 码点优先），其它给键名；裸转义与鼠标序列给空串。
 */
//@ chunk-bzr73sfg.js:252209-252585 fingerprint = keyFromParsed (0.615)
function keyFromParsed(parsed) {
  let u = parsed.sequence ?? "",
    f = parsed.name ?? "";
  if (f === "space") return " ";
  if (parsed.ctrl) return f;
  if (u.length === 1) {
    let code = u.charCodeAt(0);
    if (code >= 32 && code !== 127) return u;
  }
  if (f) {
    if (parsed.shift && f.length === 1) {
      let m = getCsiUPrintableChar(u);
      if (m !== void 0) return m;
      let upper = f.toUpperCase();
      if (upper !== f && upper.length === 1) return upper;
    }
    return f;
  }
  if (u.charCodeAt(0) === 27) return "";
  if (/^(\[<\d[\d;-]*[Mm]?)+$/.test(u)) return "";
  return u;
}

export { KeyboardEvent };
