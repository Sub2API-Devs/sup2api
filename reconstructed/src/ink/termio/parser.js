/**
 * ink/termio/parser.ts
 *
 * ANSI 文本解析器：识别 CSI/OSC/SGR，带样式硬折行
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/termio/parser.ts
 * pieces: chunk-ksvdmrg0.js (3), chunk-x6v6jz2y.js (5)
 * attribution: sole-consumer 3, affinity 1, fingerprint 4
 */
import { getGraphemeSegmenter } from "../../utils/intl.js";
import { bunStringWidth } from "../stringWidth.js";
import { DEC } from "./dec.js";
import { CSI, ERASE_DISPLAY, ERASE_LINE_REGION, CURSOR_STYLES } from "./csi.js";
import { C0 } from "./ansi.js";
import { createTokenizer } from "./tokenize.js";
import { defaultStyle } from "./types.js";
import { applySGR } from "./sgr.js";
import { parseOSC } from "./osc.js";
import { parseEsc } from "./esc.js";
import { bys, applySgrToState } from "../wrapAnsi.js";
import { regExp, RESET } from "../../services/daemon/controlServer.js";

/**
 * 把文本切成 {value, width} 字素序列：纯 ASCII 快速路径，否则用 Intl 字素切分并用 Bun.stringWidth 量宽（至少 1）。
 */
//@ chunk-x6v6jz2y.js:8409-8729 sole-consumer
function* segmentGraphemes(text) {
  let isAscii = !0;
  for (let l = 0; l < text.length; l++)
    if (text.charCodeAt(l) >= 128) {
      isAscii = !1;
      break;
    }
  if (isAscii) {
    for (let l = 0; l < text.length; l++) yield { value: text[l], width: 1 };
    return;
  }
  for (let { segment: segment } of getGraphemeSegmenter().segment(text)) {
    if (segment.length === 1) {
      let code = segment.charCodeAt(0);
      if (code >= 32 && code < 127) {
        yield { value: segment, width: 1 };
        continue;
      }
    }
    yield { value: segment, width: Math.max(1, bunStringWidth(segment)) };
  }
}
/**
 * DEC 私有模式（光标显示、备用屏、括号粘贴、鼠标跟踪、焦点事件）的 SM/RM 转成语义动作。
 */
//@ chunk-x6v6jz2y.js:8729-9402 sole-consumer
function decModeToAction(mode, enabled) {
  switch (mode) {
    case DEC.CURSOR_VISIBLE:
      return { type: "cursor", action: enabled ? { type: "show" } : { type: "hide" } };
    case DEC.ALT_SCREEN_CLEAR:
    case DEC.ALT_SCREEN:
      return { type: "mode", action: { type: "alternateScreen", enabled: enabled } };
    case DEC.BRACKETED_PASTE:
      return { type: "mode", action: { type: "bracketedPaste", enabled: enabled } };
    case DEC.MOUSE_NORMAL:
      return { type: "mode", action: { type: "mouseTracking", mode: enabled ? "normal" : "off" } };
    case DEC.MOUSE_BUTTON:
      return { type: "mode", action: { type: "mouseTracking", mode: enabled ? "button" : "off" } };
    case DEC.MOUSE_ANY:
      return { type: "mode", action: { type: "mouseTracking", mode: enabled ? "any" : "off" } };
    case DEC.FOCUS_EVENTS:
      return { type: "mode", action: { type: "focusEvents", enabled: enabled } };
    default:
      return null;
  }
}
/**
 * 解析一个 CSI 序列为语义动作：SGR 单独返回参数串；光标移动/定位、擦除、插删行列、滚动与滚动区域、保存恢复光标、光标形状（DECSCUSR）、DEC 私有模式开关。
 */
//@ chunk-x6v6jz2y.js:9402-11679 fingerprint = parseCSI (0.733)
function parseCSI(rawSequence) {
  let inner = rawSequence.slice(2);
  if (inner.length === 0) return null;
  let finalByte = inner.charCodeAt(inner.length - 1),
    beforeFinal = inner.slice(0, -1),
    privateMode = "",
    paramStr = beforeFinal,
    intermediate = "";
  if (beforeFinal.length > 0 && "?>=<".includes(beforeFinal[0]))
    ((privateMode = beforeFinal[0]), (paramStr = beforeFinal.slice(1)));
  let code = paramStr.charCodeAt(paramStr.length - 1);
  if (paramStr.length > 0 && !(code >= 48 && code <= 59)) {
    let intermediateMatch = paramStr.match(/([^0-9;:]+)$/);
    if (intermediateMatch)
      ((intermediate = intermediateMatch[1]), (paramStr = paramStr.slice(0, -intermediate.length)));
  }
  if (finalByte === CSI.SGR && privateMode === "") return { type: "sgr", params: paramStr };
  let C = paramStr === "" ? [] : paramStr.split(/[;:]/).map((x) => (x === "" ? 0 : parseInt(x, 10))),
    h = C[0] ?? 1,
    k = C[1] ?? 1;
  if (finalByte === CSI.CUU) return { type: "cursor", action: { type: "move", direction: "up", count: h } };
  if (finalByte === CSI.CUD || finalByte === CSI.VPR)
    return { type: "cursor", action: { type: "move", direction: "down", count: h } };
  if (finalByte === CSI.CUF || finalByte === CSI.HPR)
    return { type: "cursor", action: { type: "move", direction: "forward", count: h } };
  if (finalByte === CSI.CUB) return { type: "cursor", action: { type: "move", direction: "back", count: h } };
  if (finalByte === CSI.CNL) return { type: "cursor", action: { type: "nextLine", count: h } };
  if (finalByte === CSI.CPL) return { type: "cursor", action: { type: "prevLine", count: h } };
  if (finalByte === CSI.CHA || finalByte === CSI.HPA)
    return { type: "cursor", action: { type: "column", col: h } };
  if (finalByte === CSI.CUP || finalByte === CSI.HVP)
    return { type: "cursor", action: { type: "position", row: h, col: k } };
  if (finalByte === CSI.VPA) return { type: "cursor", action: { type: "row", row: h } };
  if (finalByte === CSI.ED)
    return { type: "erase", action: { type: "display", region: ERASE_DISPLAY[C[0] ?? 0] ?? "toEnd" } };
  if (finalByte === CSI.EL)
    return { type: "erase", action: { type: "line", region: ERASE_LINE_REGION[C[0] ?? 0] ?? "toEnd" } };
  if (finalByte === CSI.ECH) return { type: "erase", action: { type: "chars", count: h } };
  if (finalByte === CSI.IL) return { type: "edit", action: { type: "insertLines", count: h } };
  if (finalByte === CSI.DL) return { type: "edit", action: { type: "deleteLines", count: h } };
  if (finalByte === CSI.ICH) return { type: "edit", action: { type: "insertChars", count: h } };
  if (finalByte === CSI.DCH) return { type: "edit", action: { type: "deleteChars", count: h } };
  if (finalByte === CSI.SU) return { type: "scroll", action: { type: "up", count: h } };
  if (finalByte === CSI.SD) return { type: "scroll", action: { type: "down", count: h } };
  if (finalByte === CSI.DECSTBM)
    return { type: "scroll", action: { type: "setRegion", top: h, bottom: C[1] ?? 0 } };
  if (finalByte === CSI.SCOSC) return { type: "cursor", action: { type: "save" } };
  if (finalByte === CSI.SCORC) return { type: "cursor", action: { type: "restore" } };
  if (finalByte === CSI.DECSCUSR && intermediate === " ")
    return { type: "cursor", action: { type: "style", ...(CURSOR_STYLES[h] ?? CURSOR_STYLES[0]) } };
  if (privateMode === "?" && (finalByte === CSI.SM || finalByte === CSI.RM)) {
    let enabled = finalByte === CSI.SM,
      E = [];
    for (let A of C) {
      let T = decModeToAction(A, enabled);
      if (T) E.push(T);
    }
    return E.length ? E : { type: "unknown", sequence: rawSequence };
  }
  return { type: "unknown", sequence: rawSequence };
}
/**
 * 按第二个字节判断转义序列种类：csi / osc / esc。
 */
//@ chunk-x6v6jz2y.js:11679-11846 fingerprint = identifySequence (0.866)
function identifySequence(seq) {
  if (seq.length < 2) return "unknown";
  if (seq.charCodeAt(0) !== C0.ESC) return "unknown";
  let second = seq.charCodeAt(1);
  if (second === 91) return "csi";
  if (second === 93) return "osc";
  return "esc";
}
/**
 * 终端输出语义解析器（Ansi 组件、测试与录屏用）：分词后把文本切成带当前样式的字素段、BEL 单独成动作；SGR 更新内部样式；OSC 8 维护当前链接；forOutput 模式下保留可能被后续字节续上的尾部字素（ZWJ、区域旗帜、代理对）。
 */
//@ chunk-x6v6jz2y.js:11846-14043 fingerprint = Parser (0.769)
class Parser {
  tokenizer;
  forOutput;
  tail = "";
  constructor(o) {
    ((this.forOutput = o?.forOutput ?? !1),
      (this.tokenizer = createTokenizer({
        stringsEndAtLineFeed: o?.stringsEndAtLineFeed,
        intermediatesRunToFinal: this.forOutput,
      })));
  }
  style = defaultStyle();
  inLink = !1;
  linkUrl;
  flush() {
    if (!this.tail) return [];
    let processText = this.processText(this.tail, !1);
    return ((this.tail = ""), processText);
  }
  reset() {
    ((this.tail = ""),
      this.tokenizer.reset(),
      (this.style = defaultStyle()),
      (this.inLink = !1),
      (this.linkUrl = void 0));
  }
  feed(o) {
    let feed = this.tokenizer.feed(o),
      l = [];
    for (let u = 0; u < feed.length; u++) {
      let d = feed[u];
      if (d.type === "text") {
        let p = this.tail + d.value;
        this.tail = "";
        let m = this.forOutput && u === feed.length - 1;
        l.push(...this.processText(p, m));
      } else {
        if (this.tail) (l.push(...this.processText(this.tail, !1)), (this.tail = ""));
        l.push(...this.processSequence(d.value));
      }
    }
    return l;
  }
  processText(o, r) {
    let style = this.style;
    if (o.indexOf("\x07") === -1) {
      let p = [...segmentGraphemes(o)];
      return (this.holdTail(p, r), p.length > 0 ? [{ type: "text", graphemes: p, style: style }] : []);
    }
    let u = [];
    for (let p of o.split("\x07")) {
      if (p) {
        let m = [...segmentGraphemes(p)];
        if (m.length > 0) u.push({ type: "text", graphemes: m, style: style });
      }
      u.push({ type: "bell" });
    }
    u.pop();
    let at = u.at(-1);
    if (at?.type === "text") {
      if ((this.holdTail(at.graphemes, r), at.graphemes.length === 0)) u.pop();
    }
    return u;
  }
  holdTail(o, r) {
    if (!r || o.length === 0) return;
    let at = o.at(-1),
      code = at.value.charCodeAt(at.value.length - 1);
    if (code < 32) return;
    if (((this.tail = at.value), o.pop(), code >= 55296 && code <= 56319 && o.length > 0))
      this.tail = o.pop().value + this.tail;
    while (o.length > 0 && this.tail.length <= 64) {
      let d = o.at(-1).value,
        code = d.charCodeAt(d.length - 1),
        m = code >= 56320 && code <= 57343 ? d.codePointAt(d.length - 2) : code;
      if (m === 8205 || (m !== void 0 && m >= 127462 && m <= 127487)) ((this.tail = d + this.tail), o.pop());
      else break;
    }
  }
  processSequence(o) {
    switch (identifySequence(o)) {
      case "csi": {
        let l = parseCSI(o);
        if (!l) return [];
        if (Array.isArray(l)) return l;
        if (l.type === "sgr") return ((this.style = applySGR(l.params, this.style)), []);
        return [l];
      }
      case "osc": {
        let sliced = o.slice(2);
        if (sliced.endsWith("\x07")) sliced = sliced.slice(0, -1);
        else if (sliced.endsWith("\x1B\\")) sliced = sliced.slice(0, -2);
        let u = parseOSC(sliced);
        if (u) {
          if (u.type === "link")
            if (u.action.type === "start") ((this.inLink = !0), (this.linkUrl = u.action.url));
            else ((this.inLink = !1), (this.linkUrl = void 0));
          return [u];
        }
        return [];
      }
      case "esc": {
        let sliced = o.slice(1),
          u = parseEsc(sliced);
        if (u?.type === "reset") ((this.style = defaultStyle()), (this.inLink = !1), (this.linkUrl = void 0));
        return u ? [u] : [];
      }
      default:
        return [{ type: "unknown", sequence: o }];
    }
  }
}
//@ chunk-ksvdmrg0.js:25056-25067 sole-consumer
var MAX_SGR_REOPEN = 128;
//@ chunk-ksvdmrg0.js:25067-25163 affinity
function reopenSgr(activeCodes) {
  let joined = activeCodes.filter((n) => n !== "").join(";");
  return joined === "" || joined.length > MAX_SGR_REOPEN ? "" : `\x1B[${joined}m`;
}
/**
 * 把一行带 ANSI 的文本按显示宽度硬折，换行处关闭活动样式、下一行重新打开。
 */
//@ chunk-ksvdmrg0.js:25163-25498 fingerprint = segmentGraphemes (0.707)
function hardWrapAnsiLine(line, width) {
  if (bunStringWidth(line) <= width) return [line];
  let n = [],
    s = "",
    h = 0,
    w = bys();
  for (let p of line.split(regExp)) {
    if (p === "") continue;
    if (p.charCodeAt(0) === 27) {
      (applySgrToState(p, w), (s += p));
      continue;
    }
    for (let { segment: segment } of getGraphemeSegmenter().segment(p)) {
      let S = segment.length === 1 && segment.charCodeAt(0) < 127 ? 1 : bunStringWidth(segment);
      if (h > 0 && h + S > width)
        (n.push(w.some((R) => R !== "") ? s + RESET : s), (s = reopenSgr(w)), (h = 0));
      ((s += segment), (h += S));
    }
  }
  return (n.push(s), n);
}

export { hardWrapAnsiLine, Parser };
