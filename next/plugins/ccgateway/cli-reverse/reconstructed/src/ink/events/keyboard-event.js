/**
 * ink/events/keyboard-event.ts
 *
 * 键盘事件对象（从解析后的按键构造 key/ctrl/meta/shift/super 等字段）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/events/keyboard-event.ts
 * pieces: chunk-2avr6cej.js (2)
 * attribution: fingerprint 2
 */
import { TerminalEvent } from "./terminal-event.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { isEscPrefixedChunk } from "../stdinReader.js";
import { getCsiUPrintableChar } from "../parse-keypress.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-2avr6cej.js:251366-251885 fingerprint (2.1.88 match: KeyboardEvent, 0.775)
/**
 * 键盘事件（keydown，冒泡、可取消）：key（按键产生的字符或键名）、name、sequence、ctrl/shift/meta/superKey/fn、soloKeypress（本批只有这一个用户输入）、readLate（事件循环阻塞后读到）；readAsEscapeThenKey() 让处理器要求把 ESC+X 拆成两次按键重放。
 */
let KeyboardEvent; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2avr6cej.js:251366", () => {
  KeyboardEvent = class KeyboardEvent extends TerminalEvent {
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
    #e = false;
    constructor(parsedKey, init) {
      super("keydown", {
        bubbles: true,
        cancelable: true,
      });
      this.key = keyFromParsed(parsedKey);
      this.name = parsedKey.name ?? "";
      this.sequence = parsedKey.sequence ?? "";
      this.ctrl = parsedKey.ctrl;
      this.shift = parsedKey.shift;
      this.meta = parsedKey.meta || parsedKey.option;
      this.superKey = parsedKey.super;
      this.fn = parsedKey.fn;
      this.soloKeypress = init?.soloKeypress;
      this.readLate = parsedKey.readLate === true;
    }
    readAsEscapeThenKey() {
      this.#e = this.soloKeypress !== undefined && isEscPrefixedChunk(this.sequence);
      return this.#e;
    }
    get isReadAsEscapeThenKey() {
      return this.#e;
    }
  };
});
//@ chunk-2avr6cej.js:251885-252261 fingerprint (2.1.88 match: keyFromParsed, 0.615)
/**
 * 由 ParsedKey 推出 event.key：空格、Ctrl 组合给键名，可打印单字符给字符本身，Shift+字母给大写（CSI u 里带的 shifted 码点优先），其它给键名；裸转义与鼠标序列给空串。
 */
function keyFromParsed(parsed) {
  let seq = parsed.sequence ?? "";
  let name = parsed.name ?? "";
  if (name === "space") return " ";
  if (parsed.ctrl) return name;
  if (seq.length === 1) {
    let code = seq.charCodeAt(0);
    if (code >= 32 && code !== 127) return seq;
  }
  if (name) {
    if (parsed.shift && name.length === 1) {
      let csiUPrintableChar = getCsiUPrintableChar(seq);
      if (csiUPrintableChar !== undefined) return csiUPrintableChar;
      let upper = name.toUpperCase();
      if (upper !== name && upper.length === 1) return upper;
    }
    return name;
  }
  if (seq.charCodeAt(0) === 27) return "";
  if (/^(\[<\d[\d;-]*[Mm]?)+$/.test(seq)) return "";
  return seq;
}
export { KeyboardEvent };
