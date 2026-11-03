/**
 * ink/parse-keypress.ts
 *
 * 并入已有模块：解析 kitty 键盘协议的 CSI _ 序列；按键序列解析用正则（meta、CSI、kitty、modifyOtherKeys、DECRPM）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/parse-keypress.ts
 * pieces: chunk-bzr73sfg.js (39)
 * attribution: placement 16, fingerprint 11, file-local 1, layout 10, callgraph-fingerprint 1
 */
import { Buffer as Nc } from "buffer";
import { csi, PASTE_START, PASTE_END, FOCUS_OUT, FOCUS_IN } from "./termio/csi.js";
import { isBackspaceCtrlBackspace } from "./clearTerminal.js";
import { getAttacherCaps } from "../bootstrap/state.js";
import { detectMinimalTerminal } from "./terminal.js";
import { env } from "../utils/env.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "../utils/envUtils.js";
import { createTokenizer } from "./termio/tokenize.js";

/**
 * 键盘协议解析用的正则与按键码常量。
 */
//@ chunk-bzr73sfg.js:129780-130164 placement
var WIN32_INPUT_MODE_RE = /^\x1b\[(\d*(?:;\d*){0,5})_$/,
  RIGHT_ALT_PRESSED = 1,
  LEFT_ALT_PRESSED = 2,
  RIGHT_CTRL_PRESSED = 4,
  LEFT_CTRL_PRESSED = 8,
  SHIFT_PRESSED = 16,
  VK_BACK = 8,
  VK_TAB = 9,
  VK_RETURN = 13,
  VK_MENU = 18,
  VK_ESCAPE = 27,
  VK_SPACE = 32,
  VK_F1 = 112,
  VK_F4 = 115,
  VK_F5 = 116,
  VK_F12 = 123,
  MAX_WIN32_REPEAT = 8,
  WIN32_NAV_KEY_CSI = {
    33: { code: 5, final: "~" },
    34: { code: 6, final: "~" },
    35: { code: 1, final: "F" },
    36: { code: 1, final: "H" },
    37: { code: 1, final: "D" },
    38: { code: 1, final: "A" },
    39: { code: 1, final: "C" },
    40: { code: 1, final: "B" },
    45: { code: 2, final: "~" },
    46: { code: 3, final: "~" },
  },
  WIN32_F5_F12_CODES = [15, 17, 18, 19, 20, 21, 23, 24];
/**
 * 解析 kitty 键盘协议的 CSI _ 序列。
 */
//@ chunk-bzr73sfg.js:130164-131427 placement
function decodeWin32InputSequence(sequence, pendingHighSurrogate) {
  let match = WIN32_INPUT_MODE_RE.exec(sequence);
  if (!match) return null;
  let parts = match[1].split(";"),
    virtualKey = parseIntParam(parts, 0, 0),
    unicodeChar = parseIntParam(parts, 2, 0),
    isKeyDown = parseIntParam(parts, 3, 0) !== 0,
    controlState = parseIntParam(parts, 4, 0),
    repeatCount = Math.min(Math.max(parseIntParam(parts, 5, 1), 1), MAX_WIN32_REPEAT);
  if (!isKeyDown) {
    if (virtualKey === VK_MENU && unicodeChar !== 0)
      return { sequences: [String.fromCharCode(unicodeChar)], highSurrogate: "" };
    return { sequences: [], highSurrogate: pendingHighSurrogate };
  }
  let hasAlt = (controlState & (LEFT_ALT_PRESSED | RIGHT_ALT_PRESSED)) !== 0,
    hasCtrl = (controlState & (LEFT_CTRL_PRESSED | RIGHT_CTRL_PRESSED)) !== 0,
    hasShift = (controlState & SHIFT_PRESSED) !== 0,
    isAltGr = hasAlt && hasCtrl && unicodeChar > 32 && unicodeChar !== 127,
    ctrl = hasCtrl && !isAltGr,
    alt = hasAlt && !isAltGr,
    modifierParam = 1 + (hasShift ? 1 : 0) + (alt ? 2 : 0) + (ctrl ? 4 : 0),
    navKey = WIN32_NAV_KEY_CSI[virtualKey];
  if (navKey) {
    if (navKey.final === "~")
      return repeatSequences(
        repeatCount,
        modifierParam === 1 ? csi(navKey.code, "~") : csi(navKey.code, modifierParam, "~"),
      );
    return repeatSequences(
      repeatCount,
      modifierParam === 1 ? csi(navKey.final) : csi(1, modifierParam, navKey.final),
    );
  }
  if (virtualKey >= VK_F1 && virtualKey <= VK_F4) {
    let fromCharCode = String.fromCharCode(80 + (virtualKey - VK_F1));
    return repeatSequences(
      repeatCount,
      modifierParam === 1 ? `\x1BO${fromCharCode}` : csi(1, modifierParam, fromCharCode),
    );
  }
  if (virtualKey >= VK_F5 && virtualKey <= VK_F12) {
    let Y = WIN32_F5_F12_CODES[virtualKey - VK_F5];
    return repeatSequences(repeatCount, modifierParam === 1 ? csi(Y, "~") : csi(Y, modifierParam, "~"));
  }
  let altPrefix = alt ? "\x1B" : "";
  switch (virtualKey) {
    case VK_BACK:
      return repeatSequences(repeatCount, altPrefix + (ctrl ? "\b" : "\x7F"));
    case VK_TAB:
      return repeatSequences(repeatCount, altPrefix + (hasShift ? csi("Z") : "\t"));
    case VK_RETURN:
      return repeatSequences(
        repeatCount,
        altPrefix +
          (ctrl
            ? `
`
            : "\r"),
      );
    case VK_ESCAPE:
      return repeatSequences(repeatCount, altPrefix + "\x1B");
    default:
      break;
  }
  let charCode = unicodeChar;
  if (ctrl && virtualKey === VK_SPACE) charCode = 0;
  else if (charCode === 0) {
    let Y = virtualKey >= 65 && virtualKey <= 90,
      J = virtualKey >= 48 && virtualKey <= 57;
    if (!(ctrl || alt) || !(Y || J)) return { sequences: [], highSurrogate: pendingHighSurrogate };
    if (((charCode = Y && !hasShift ? virtualKey + 32 : virtualKey), ctrl))
      charCode = toControlCharCode(charCode);
  } else if (ctrl) charCode = toControlCharCode(charCode);
  if (charCode >= 55296 && charCode <= 56319)
    return { sequences: [], highSurrogate: String.fromCharCode(charCode) };
  let fromCharCode = String.fromCharCode(charCode);
  if (charCode >= 56320 && charCode <= 57343) {
    if (!pendingHighSurrogate) return { sequences: [], highSurrogate: "" };
    fromCharCode = pendingHighSurrogate + fromCharCode;
  }
  return repeatSequences(repeatCount, altPrefix + fromCharCode);
}
/**
 * 取 params[index] 转整数，缺失或空串返回 fallback。
 */
//@ chunk-bzr73sfg.js:131427-131500 placement
function parseIntParam(params, index, fallback) {
  let m = params[index];
  return m === void 0 || m === "" ? fallback : parseInt(m, 10);
}
//@ chunk-bzr73sfg.js:131500-131569 placement
function repeatSequences(count, sequence) {
  return { sequences: Array(count).fill(sequence), highSurrogate: "" };
}
/**
 * 按 xterm 规则把字符码转成 Ctrl 组合产生的控制码（@–_ 与 a–z 取低 5 位，2/空格→NUL，3–7→ESC..US，8/?→DEL，/→US）。
 */
//@ chunk-bzr73sfg.js:131569-131797 placement
function toControlCharCode(charCode) {
  if (charCode < 32) return charCode;
  if ((charCode >= 64 && charCode <= 95) || (charCode >= 97 && charCode <= 122)) return charCode & 31;
  switch (charCode) {
    case 32:
    case 50:
      return 0;
    case 51:
    case 52:
    case 53:
    case 54:
    case 55:
      return charCode - 51 + 27;
    case 56:
    case 63:
      return 127;
    case 47:
      return 31;
    default:
      return charCode;
  }
}
/**
 * 按键序列解析用正则（meta、CSI、kitty、modifyOtherKeys、DECRPM）。
 */
//@ chunk-bzr73sfg.js:131797-132430 placement
var META_KEY_CODE_RE = /^(?:\x1b)([a-zA-Z0-9])$/,
  FN_KEY_RE = /^(?:\x1b+)(O|N|\[|\[\[)(?:(\d+)(?:;(\d+))?([~^$])|(?:1;)?(\d+)?([a-zA-Z]))/,
  CSI_U_RE = /^\x1b\[(\d+)(?::(\d*)(?::(\d+))?)?(?:;(\d+))?u/,
  MODIFY_OTHER_KEYS_RE = /^\x1b\[27;(\d+);(\d+)~/,
  DECRPM_RE = /^\x1b\[\?(\d+);(\d+)\$y$/,
  DA1_RE = /^\x1b\[\?([\d;]*)c$/,
  DA2_RE = /^\x1b\[>([\d;]*)c$/,
  KITTY_FLAGS_RE = /^\x1b\[\?(\d+)u$/,
  CURSOR_POSITION_RE = /^\x1b\[\?(\d+);(\d+)R$/,
  CELL_SIZE_RE = /^\x1b\[6;(\d+);(\d+)t$/,
  THEME_NOTIFY_RE = /^\x1b\[\?997;([12])n$/,
  OSC_RESPONSE_RE = /^\x1b\](\d+);(.*?)(?:\x07|\x1b\\)$/s,
  XTVERSION_RE = /^\x1bP>\|(.*?)(?:\x07|\x1b\\)$/s,
  KITTY_GRAPHICS_RESPONSE_RE = /^\x1b_G(?:[^;]*,)?i=(\d+)[^;]*;(.*?)\x1b\\$/s,
  SGR_MOUSE_RE = /^\x1b\[<(\d+);(-?\d+);(-?\d+)([Mm])$/,
  SGR_MOUSE_PREFIX_RE = /^\x1b\[<[\d;-]*$/,
  SGR_MOUSE_LEADING_RE = /^\x1b\[<[\d;-]*[Mm]/,
  SGR_MOUSE_COMPLETE_RE = /^\x1b\[<\d+;-?\d+;-?\d+[Mm]/,
  MAX_MOUSE_PREFIX_LEN = 32;
/**
 * 文本是否是被拆开的 SGR 鼠标序列前缀（ESC[< 数字;…，长度不超过 32）。
 */
//@ chunk-bzr73sfg.js:132430-132477 placement
function isPartialSgrMousePrefix(text) {
  return text.length <= MAX_MOUSE_PREFIX_LEN && SGR_MOUSE_PREFIX_RE.test(text);
}
//@ chunk-bzr73sfg.js:132477-132589 placement
var PARTIAL_CSI_RE = /^\x1b\[(?:[0-9:;]+|[<=>?][0-9:;]*[ -/]*)$/,
  PARTIAL_STRING_SEQ_RE = /^\x1b(?:\][0-9]|P[0-9>|$+=!]|_G)[^\x07]*$/s,
  MAX_PARTIAL_STRING_SEQ_LEN = 256,
  MAX_PARTIAL_CSI_LEN = 64;
/**
 * 输入在 flush 时剩下的半截转义序列是否还可能被后续字节补全（鼠标前缀、OSC/DCS/APC 串不超过 256 字节、CSI 参数串不超过 64 字节）；是则保留等待，否则当普通按键冲刷出去。
 */
//@ chunk-bzr73sfg.js:132589-132697 placement
function isPlausibleIncompleteSequence(buffer) {
  if (SGR_MOUSE_PREFIX_RE.test(buffer)) return isPartialSgrMousePrefix(buffer);
  if (PARTIAL_STRING_SEQ_RE.test(buffer)) return buffer.length <= MAX_PARTIAL_STRING_SEQ_LEN;
  return buffer.length <= MAX_PARTIAL_CSI_LEN && PARTIAL_CSI_RE.test(buffer);
}
/**
 * 清空分词器里的半截输入，把它记成 droppedMousePrefix（后续文本若是被截断的鼠标序列尾巴会被吞掉）。
 */
//@ chunk-bzr73sfg.js:132697-132816 placement
function discardIncompleteInput(state) {
  let buffered = state._tokenizer?.buffer() ?? "";
  return (state._tokenizer?.reset(), { ...state, incomplete: "", droppedMousePrefix: buffered });
}
/**
 * 把终端对查询的应答解析成结构：DECRPM、DA1/DA2、kitty 键盘标志、光标位置、主题变化通知（997）、单元格像素尺寸、OSC、XTVERSION、kitty 图形应答；都不是返回 null。
 */
//@ chunk-bzr73sfg.js:132816-133676 fingerprint = parseTerminalResponse (0.821)
function parseTerminalResponse(s) {
  if (s.startsWith("\x1B[")) {
    let u;
    if ((u = DECRPM_RE.exec(s)))
      return { type: "decrpm", mode: parseInt(u[1], 10), status: parseInt(u[2], 10) };
    if ((u = DA1_RE.exec(s))) return { type: "da1", params: splitNumericParams(u[1]) };
    if ((u = DA2_RE.exec(s))) return { type: "da2", params: splitNumericParams(u[1]) };
    if ((u = KITTY_FLAGS_RE.exec(s))) return { type: "kittyKeyboard", flags: parseInt(u[1], 10) };
    if ((u = CURSOR_POSITION_RE.exec(s)))
      return { type: "cursorPosition", row: parseInt(u[1], 10), col: parseInt(u[2], 10) };
    if ((u = THEME_NOTIFY_RE.exec(s))) return { type: "themeNotify", dark: u[1] === "1" };
    if ((u = CELL_SIZE_RE.exec(s)))
      return { type: "cellSize", height: parseInt(u[1], 10), width: parseInt(u[2], 10) };
    return null;
  }
  if (s.startsWith("\x1B]")) {
    let match = OSC_RESPONSE_RE.exec(s);
    if (match) return { type: "osc", code: parseInt(match[1], 10), data: match[2] };
  }
  if (s.startsWith("\x1BP")) {
    let match = XTVERSION_RE.exec(s);
    if (match) return { type: "xtversion", name: match[1] };
  }
  if (s.startsWith("\x1B_")) {
    let match = KITTY_GRAPHICS_RESPONSE_RE.exec(s);
    if (match) return { type: "kittyGraphics", id: parseInt(match[1], 10), message: match[2] };
  }
  return null;
}
/**
 * 把 CSI 参数串按分号拆成整数数组。
 */
//@ chunk-bzr73sfg.js:133676-133751 file-local
function splitNumericParams(params) {
  if (!params) return [];
  return params.split(";").map((u) => parseInt(u, 10));
}
/**
 * 按键解析器初始状态：NORMAL 模式，空的半截输入、粘贴缓冲、待拼 UTF-8 字节、被丢弃的鼠标前缀、flush 时冲出的 ESC 前缀、win32 高位代理。
 */
//@ chunk-bzr73sfg.js:133751-133891 fingerprint = INITIAL_STATE (0.629)
var INITIAL_STATE = {
  mode: "NORMAL",
  incomplete: "",
  pasteBuffer: "",
  pendingByteEvents: [],
  droppedMousePrefix: "",
  flushedEscapePrefix: "",
  win32HighSurrogate: "",
};
/**
 * 用当前进程环境调用 isBackspaceCtrlBackspace；linux 构建里平台常量是 "linux"。
 */
//@ chunk-bzr73sfg.js:134050-134096 placement = chordToDisplayString (1)
function isBackspaceCtrlBackspaceHere() {
  return isBackspaceCtrlBackspace("linux", process.env);
}
/**
 * 终端键序列方言：优先用会话状态里记下的 keyDialect（终端探测结果），否则按 TERM 推断（如 st、rxvt）。
 */
//@ chunk-bzr73sfg.js:134096-134165 placement
function getKeyDialect() {
  let n = getAttacherCaps()?.keyDialect;
  return n !== void 0 ? n : detectMinimalTerminal(env.TERM);
}
//@ chunk-bzr73sfg.js:134165-134198 placement
function isStKeyDialect() {
  return getKeyDialect() === "st";
}
//@ chunk-bzr73sfg.js:134198-134233 placement
function isRxvtKeyDialect() {
  return getKeyDialect() === "rxvt";
}
/**
 * AltGr 当文字的模式：CLAUDE_CODE_ALTGR_AS_TEXT 显式真→force、假→off；否则在 Windows Terminal（WT_SESSION）里 auto，其余 off。
 */
//@ chunk-bzr73sfg.js:134233-134366 placement
function resolveAltGrMode(env, wtSession) {
  let CLAUDE_CODE_ALTGR_AS_TEXT = env.CLAUDE_CODE_ALTGR_AS_TEXT;
  if (isEnvTruthy(CLAUDE_CODE_ALTGR_AS_TEXT)) return "force";
  if (isEnvDefinedFalsy(CLAUDE_CODE_ALTGR_AS_TEXT)) return "off";
  return (wtSession ?? !!env.WT_SESSION) ? "auto" : "off";
}
//@ chunk-bzr73sfg.js:134366-134419 placement
function getAltGrMode() {
  return resolveAltGrMode(process.env, getAttacherCaps()?.wtSession);
}
//@ chunk-bzr73sfg.js:134419-134470 layout
function isPrintableCodePoint(codePoint) {
  return (codePoint > 32 && codePoint < 127) || (codePoint >= 160 && codePoint < 55296);
}
//@ chunk-bzr73sfg.js:134470-134534 layout
function isAsciiAlphanumeric(codePoint) {
  return (
    (codePoint >= 48 && codePoint <= 57) ||
    (codePoint >= 65 && codePoint <= 90) ||
    (codePoint >= 97 && codePoint <= 122)
  );
}
/**
 * 把 AltGr（Ctrl+Alt）组合产生的可打印字符当成普通文字键：name 为该字符，不带 ctrl/meta。
 */
//@ chunk-bzr73sfg.js:134534-134701 layout = createPasteKey (0.864)
function createAltGrTextKey(sequence, codePoint, shift) {
  return {
    kind: "key",
    name: String.fromCodePoint(codePoint),
    fn: !1,
    ctrl: !1,
    meta: !1,
    shift: shift,
    option: !1,
    super: !1,
    sequence: sequence,
    raw: sequence,
    code: void 0,
    col: void 0,
    row: void 0,
  };
}
/**
 * Ctrl+Alt（无 Super）加可打印字符是否按 AltGr 文字处理：mode=off 否，force 是，auto 时字母数字仍当快捷键。
 */
//@ chunk-bzr73sfg.js:134701-134836 layout
function isAltGrText(modifiers, codePoint) {
  if (!(modifiers.ctrl && modifiers.meta) || modifiers.super) return !1;
  if (!isPrintableCodePoint(codePoint)) return !1;
  let mode = getAltGrMode();
  if (mode === "off") return !1;
  return mode === "force" || !isAsciiAlphanumeric(codePoint);
}
/**
 * 把 stdin 数据转成字符串；单字节且高位为 1 的 Buffer 按 Meta 前缀（ESC + 低 7 位）解释。
 */
//@ chunk-bzr73sfg.js:134836-135043 fingerprint = inputToString (1)
function inputToString(input) {
  if (Nc.isBuffer(input))
    if (input[0] > 127 && input[1] === void 0) return ((input[0] -= 128), "\x1B" + String(input));
    else return String(input);
  else if (input !== void 0 && typeof input !== "string") return String(input);
  else if (!input) return "";
  else return input;
}
/**
 * 输入解析主入口：用 termio 分词器把一段 stdin 文本切成序列/文本，产出 ParsedInput 数组和新状态。处理：括号粘贴（ESC[200~/201~ 之间收集到 pasteBuffer，产出 {kind:'paste'}）、终端应答（{kind:'response'}）、SGR/X10 鼠标、焦点进出（{kind:'focus'}）、win32-input-mode、CSI u 里编码的单个 UTF-8 字节（凑齐多字节字符再出）、被截断的鼠标序列尾巴（droppedMousePrefix）、flush 时冲出的 ESC 前缀。input 为 null 表示超时 flush。
 */
//@ chunk-bzr73sfg.js:135043-137460 fingerprint = parseMultipleKeypresses (0.664)
function parseMultipleKeypresses(prevState, input = "") {
  let isFlush = input === null,
    text = isFlush ? "" : inputToString(input),
    tokenizer =
      prevState._tokenizer ?? createTokenizer({ x10Mouse: !0, escPrefixedKeyIsAlt: isRxvtKeyDialect }),
    droppedMousePrefix = prevState.droppedMousePrefix,
    flushedPrefixOut = isFlush ? prevState.flushedEscapePrefix : "",
    flushedEscapePrefix = prevState.flushedEscapePrefix,
    tokens;
  if (isFlush && prevState.mode !== "IN_PASTE") {
    let buffer = tokenizer.buffer();
    if (isPlausibleIncompleteSequence(buffer)) tokens = [];
    else if (SGR_MOUSE_PREFIX_RE.test(buffer))
      (tokenizer.reset(), (droppedMousePrefix = buffer), (tokens = []));
    else {
      if (buffer === "\x1B" || buffer === "\x1B[") flushedPrefixOut = buffer;
      tokens = tokenizer.flush();
    }
  } else tokens = isFlush ? tokenizer.flush() : tokenizer.feed(text);
  let keys = [],
    inPaste = prevState.mode === "IN_PASTE",
    {
      pasteBuffer: pasteBuffer,
      pendingByteEvents: pendingByteEvents,
      win32HighSurrogate: win32HighSurrogate,
    } = prevState;
  function emitByteEvent(K) {
    if (inPaste) pasteBuffer += String.fromCharCode(K.byte);
    else keys.push(parseKeypress(K.seq));
  }
  function flushPendingBytes() {
    for (let K of pendingByteEvents) emitByteEvent(K);
    pendingByteEvents = [];
  }
  function pushByteEvent(K, q) {
    if (pendingByteEvents.length === 0) {
      if (q >= 194 && q <= 244) {
        pendingByteEvents = [{ seq: K, byte: q }];
        return;
      }
      emitByteEvent({ seq: K, byte: q });
      return;
    }
    if (q >= 128 && q <= 191) {
      pendingByteEvents = [...pendingByteEvents, { seq: K, byte: q }];
      let byte = pendingByteEvents[0].byte,
        J = byte <= 223 ? 2 : byte <= 239 ? 3 : 4;
      if (pendingByteEvents.length < J) return;
      let V = pendingByteEvents;
      pendingByteEvents = [];
      let str = Nc.from(V.map((ne) => ne.byte)).toString("utf8");
      if ([...str].length !== 1 || Nc.byteLength(str, "utf8") !== V.length)
        for (let ne of V) emitByteEvent(ne);
      else if (inPaste) pasteBuffer += str;
      else keys.push(parseKeypress(str));
      return;
    }
    (flushPendingBytes(), pushByteEvent(K, q));
  }
  for (let token of tokens)
    if (token.type === "sequence")
      if (((droppedMousePrefix = ""), (flushedEscapePrefix = ""), token.value === PASTE_START))
        (flushPendingBytes(), (inPaste = !0), (pasteBuffer = ""));
      else if (token.value === PASTE_END)
        (flushPendingBytes(),
          keys.push({ kind: "paste", text: pasteBuffer }),
          (inPaste = !1),
          (pasteBuffer = ""));
      else if (inPaste) {
        if (isMouseOrFocusSequence(token.value)) continue;
        let response = getEncodedByte(token.value);
        if (response !== void 0) {
          pushByteEvent(token.value, response);
          continue;
        }
        if (!parseTerminalResponse(token.value) && !X10_MOUSE_RE.test(token.value)) flushPendingBytes();
        pasteBuffer += csiKeyToPasteText(token.value);
      } else {
        let q = decodeWin32InputSequence(token.value, win32HighSurrogate);
        if (q) {
          (flushPendingBytes(), (win32HighSurrogate = q.highSurrogate));
          for (let sequence of q.sequences) keys.push(parseKeypress(sequence));
          continue;
        }
        let mouse = getEncodedByte(token.value);
        if (mouse !== void 0) {
          pushByteEvent(token.value, mouse);
          continue;
        }
        let J = parseTerminalResponse(token.value);
        if (J) {
          keys.push({ kind: "response", sequence: token.value, response: J });
          continue;
        }
        let V = parseMouseEvent(token.value);
        if (V) {
          keys.push(V);
          continue;
        }
        if (
          token.value === FOCUS_OUT ||
          (!isMouseOrFocusSequence(token.value) && !X10_MOUSE_RE.test(token.value))
        )
          flushPendingBytes();
        if (token.value === FOCUS_IN || token.value === FOCUS_OUT) {
          keys.push({ kind: "focus", focused: token.value === FOCUS_IN });
          continue;
        }
        keys.push(parseKeypress(token.value));
      }
    else if (token.type === "text") {
      flushPendingBytes();
      let q = token.value;
      if (!inPaste && flushedEscapePrefix) {
        let Y = flushedEscapePrefix + q,
          match = SGR_MOUSE_COMPLETE_RE.exec(Y);
        if (((flushedEscapePrefix = ""), match)) {
          let mouse = parseMouseEvent(match[0]);
          if ((keys.push(mouse ?? parseKeypress(match[0])), (q = Y.slice(match[0].length)), !q)) continue;
        }
      }
      if (!inPaste && droppedMousePrefix) {
        let Y = droppedMousePrefix + q,
          match = SGR_MOUSE_LEADING_RE.exec(Y);
        if (match) {
          if (((droppedMousePrefix = ""), (q = Y.slice(match[0].length)), !q)) continue;
        } else if (isPartialSgrMousePrefix(Y)) {
          droppedMousePrefix = Y;
          continue;
        } else droppedMousePrefix = "";
      } else if (!inPaste && isPartialSgrMousePrefix(q)) {
        droppedMousePrefix = q;
        continue;
      }
      if (inPaste) pasteBuffer += q;
      else if (/^\[<\d+;-?\d+;-?\d+[Mm]$/.test(q) || /^\[M[\x60-\x7f][\x20-\uffff]{2}$/.test(q)) {
        let Y = "\x1B" + q,
          J = parseMouseEvent(Y);
        keys.push(J ?? parseKeypress(Y));
      } else keys.push(parseKeypress(q));
    }
  if (isFlush) flushPendingBytes();
  if (isFlush && inPaste) {
    if (pasteBuffer) keys.push({ kind: "paste", text: pasteBuffer });
    ((inPaste = !1), (pasteBuffer = ""));
  }
  let nextState = {
    mode: inPaste ? "IN_PASTE" : "NORMAL",
    incomplete: tokenizer.buffer(),
    pasteBuffer: pasteBuffer,
    pendingByteEvents: pendingByteEvents,
    droppedMousePrefix: droppedMousePrefix,
    flushedEscapePrefix: flushedPrefixOut,
    win32HighSurrogate: win32HighSurrogate,
    _tokenizer: tokenizer,
  };
  return [keys, nextState];
}
/**
 * 功能键序列（去掉 ESC 后的代码）→ 键名表；isShiftKey/isCtrlKey 判断 rxvt 风格的 Shift/Ctrl 变体（[a、Oa、[2$、[2^ 等）。
 */
//@ chunk-bzr73sfg.js:137460-138621 fingerprint = keyName (0.991)
var keyName = {
    OP: "f1",
    OQ: "f2",
    OR: "f3",
    OS: "f4",
    "[P": "f1",
    "[Q": "f2",
    "[S": "f4",
    Op: "0",
    Oq: "1",
    Or: "2",
    Os: "3",
    Ot: "4",
    Ou: "5",
    Ov: "6",
    Ow: "7",
    Ox: "8",
    Oy: "9",
    Oj: "*",
    Ok: "+",
    Ol: ",",
    Om: "-",
    On: ".",
    Oo: "/",
    OM: "return",
    "[11~": "f1",
    "[12~": "f2",
    "[13~": "f3",
    "[14~": "f4",
    "[[A": "f1",
    "[[B": "f2",
    "[[C": "f3",
    "[[D": "f4",
    "[[E": "f5",
    "[15~": "f5",
    "[17~": "f6",
    "[18~": "f7",
    "[19~": "f8",
    "[20~": "f9",
    "[21~": "f10",
    "[23~": "f11",
    "[24~": "f12",
    "[A": "up",
    "[B": "down",
    "[C": "right",
    "[D": "left",
    "[E": "clear",
    "[F": "end",
    "[H": "home",
    OA: "up",
    OB: "down",
    OC: "right",
    OD: "left",
    OE: "clear",
    OF: "end",
    OH: "home",
    "[1~": "home",
    "[2~": "insert",
    "[3~": "delete",
    "[4~": "end",
    "[5~": "pageup",
    "[6~": "pagedown",
    "[[5~": "pageup",
    "[[6~": "pagedown",
    "[7~": "home",
    "[8~": "end",
    "[a": "up",
    "[b": "down",
    "[c": "right",
    "[d": "left",
    "[e": "clear",
    "[2$": "insert",
    "[3$": "delete",
    "[5$": "pageup",
    "[6$": "pagedown",
    "[7$": "home",
    "[8$": "end",
    Oa: "up",
    Ob: "down",
    Oc: "right",
    Od: "left",
    Oe: "clear",
    "[2^": "insert",
    "[3^": "delete",
    "[5^": "pageup",
    "[6^": "pagedown",
    "[7^": "home",
    "[8^": "end",
    "[Z": "tab",
  },
  isShiftKey = (n) =>
    ["[a", "[b", "[c", "[d", "[e", "[2$", "[3$", "[5$", "[6$", "[7$", "[8$", "[Z"].includes(n),
  isCtrlKey = (n) => ["Oa", "Ob", "Oc", "Od", "Oe", "[2^", "[3^", "[5^", "[6^", "[7^", "[8^"].includes(n);
/**
 * xterm 修饰参数（1 + 位掩码）解码成 {shift, meta, ctrl, super}。
 */
//@ chunk-bzr73sfg.js:138621-138708 fingerprint = decodeModifier (1)
function decodeModifier(modifier) {
  let u = modifier - 1;
  return { shift: !!(u & 1), meta: !!(u & 2), ctrl: !!(u & 4), super: !!(u & 8) };
}
/**
 * CSI u / modifyOtherKeys 里的码点 → 键名：控制键（backspace/tab/return/escape/space）、kitty 小键盘私有码 57399–57426（数字、运算符、方向、翻页、Home/End/Insert/Delete），其余可打印字符转小写字符本身。
 */
//@ chunk-bzr73sfg.js:138708-139630 layout
function codePointToKeyName(codePoint) {
  switch (codePoint) {
    case 8:
      return "backspace";
    case 9:
      return "tab";
    case 13:
      return "return";
    case 27:
      return "escape";
    case 32:
      return "space";
    case 127:
      return "backspace";
    case 57399:
      return "0";
    case 57400:
      return "1";
    case 57401:
      return "2";
    case 57402:
      return "3";
    case 57403:
      return "4";
    case 57404:
      return "5";
    case 57405:
      return "6";
    case 57406:
      return "7";
    case 57407:
      return "8";
    case 57408:
      return "9";
    case 57409:
      return ".";
    case 57410:
      return "/";
    case 57411:
      return "*";
    case 57412:
      return "-";
    case 57413:
      return "+";
    case 57414:
      return "return";
    case 57415:
      return "=";
    case 57416:
      return ",";
    case 57417:
      return "left";
    case 57418:
      return "right";
    case 57419:
      return "up";
    case 57420:
      return "down";
    case 57421:
      return "pageup";
    case 57422:
      return "pagedown";
    case 57423:
      return "home";
    case 57424:
      return "end";
    case 57425:
      return "insert";
    case 57426:
      return "delete";
    default:
      if (codePoint >= 32 && codePoint <= 126) return String.fromCharCode(codePoint).toLowerCase();
      if (codePoint >= 160 && codePoint < 55296) return String.fromCodePoint(codePoint);
      return;
  }
}
/**
 * 只有 Ctrl（无 Shift/Meta/Super）时把 Ctrl+[、Ctrl+M、Ctrl+I、Ctrl+H 还原成 escape/return/tab/backspace（kitty 协议会把这些编码成 Ctrl+字母）。
 */
//@ chunk-bzr73sfg.js:139630-139836 fingerprint = keycodeToName (0.688)
function keycodeToName(modifiers, codePoint) {
  if (!modifiers.ctrl || modifiers.shift || modifiers.meta || modifiers.super) return;
  switch (codePoint) {
    case 91:
      return "escape";
    case 109:
    case 77:
      return "return";
    case 105:
    case 73:
      return "tab";
    case 104:
    case 72:
      return "backspace";
    default:
      return;
  }
}
/**
 * CSI u 或 modifyOtherKeys 序列若编码的是 128–255 之间的单个字节（无修饰），返回该字节；用于在原始字节模式下拼 UTF-8。
 */
//@ chunk-bzr73sfg.js:139836-140071 layout
function getEncodedByte(sequence) {
  let codePoint,
    modifier,
    match = CSI_U_RE.exec(sequence);
  if (match)
    ((codePoint = parseInt(match[1], 10)),
      (modifier = match[4] === void 0 ? void 0 : parseInt(match[4], 10)));
  else if ((match = MODIFY_OTHER_KEYS_RE.exec(sequence)))
    ((modifier = parseInt(match[1], 10)), (codePoint = parseInt(match[2], 10)));
  if (codePoint === void 0 || codePoint < 128 || codePoint > 255) return;
  if (modifier !== void 0 && modifier !== 1) return;
  return codePoint;
}
//@ chunk-bzr73sfg.js:140071-140169 layout
function getCsiUPrintableChar(sequence) {
  let u = parseInt(CSI_U_RE.exec(sequence)?.[2] ?? "", 10);
  return isPrintableCodePoint(u) ? String.fromCodePoint(u) : void 0;
}
/**
 * 粘贴期间收到 CSI u / modifyOtherKeys 编码的按键时还原成字符（Ctrl+I→\t、Ctrl+J→\n、Ctrl+M→\r），其它序列原样返回。
 */
//@ chunk-bzr73sfg.js:140169-140516 layout
function csiKeyToPasteText(sequence) {
  let match = CSI_U_RE.exec(sequence),
    codePoint = match ? parseInt(match[1], 10) : void 0,
    modifier = match ? (match[4] ? parseInt(match[4], 10) : 1) : 1;
  if (codePoint === void 0 && (match = MODIFY_OTHER_KEYS_RE.exec(sequence)))
    ((modifier = parseInt(match[1], 10)), (codePoint = parseInt(match[2], 10)));
  if (codePoint !== void 0 && codePoint <= 1114111) {
    if (modifier < 1) modifier = 1;
    if (decodeModifier(modifier).ctrl)
      switch (codePoint) {
        case 105:
        case 73:
          return "\t";
        case 106:
        case 74:
          return `
`;
        case 109:
        case 77:
          return "\r";
      }
    return String.fromCodePoint(codePoint);
  }
  return sequence;
}
//@ chunk-bzr73sfg.js:140516-140604 layout
var X10_MOUSE_MOTION_RE = /^\x1b\[M[\x60-\x7f][\x20-\uffff]{2}$/,
  X10_MOUSE_RE = /^\x1b\[M[\x20-\x7f][\x20-\uffff]{2}$/;
//@ chunk-bzr73sfg.js:140604-140667 layout
function isMouseOrFocusSequence(sequence) {
  return (
    sequence === FOCUS_IN ||
    sequence === FOCUS_OUT ||
    SGR_MOUSE_RE.test(sequence) ||
    X10_MOUSE_MOTION_RE.test(sequence)
  );
}
/**
 * 解析 SGR 鼠标序列（ESC[<b;x;y M/m）成 {kind:'mouse', button, action, col, row}；滚轮（button 位 64）不在这里，留给 parseKeypress 变成 wheelup/wheeldown 键。
 */
//@ chunk-bzr73sfg.js:140667-140888 fingerprint = parseMouseEvent (1)
function parseMouseEvent(s) {
  let match = SGR_MOUSE_RE.exec(s);
  if (!match) return null;
  let button = parseInt(match[1], 10);
  if ((button & 64) !== 0) return null;
  return {
    kind: "mouse",
    button: button,
    action: match[4] === "M" ? "press" : "release",
    col: parseInt(match[2], 10),
    row: parseInt(match[3], 10),
    sequence: s,
  };
}
/**
 * 把一个序列解析成 ParsedKey：依次尝试 CSI u（kitty，含 AltGr 文字、Ctrl 码点修正）、modifyOtherKeys、SGR/X10 滚轮、单字节控制键（\r/\n/\t/\b/DEL/ESC/空格/Ctrl+字母）、Meta+字母、功能键表；最后对几个常见序列（Home/End/PageUp/PageDown/Ctrl+方向）做固定映射。
 */
//@ chunk-bzr73sfg.js:140888-143647 fingerprint = parseKeypress (0.933)
function parseKeypress(s = "") {
  let metaMatch,
    key = {
      kind: "key",
      name: "",
      fn: !1,
      ctrl: !1,
      meta: !1,
      shift: !1,
      option: !1,
      super: !1,
      sequence: s,
      raw: s,
      code: void 0,
      col: void 0,
      row: void 0,
    };
  key.sequence = key.sequence || s || key.name;
  let match;
  if ((match = CSI_U_RE.exec(s))) {
    let codepoint = parseInt(match[1], 10),
      g = match[4] ? parseInt(match[4], 10) : 1,
      mods = decodeModifier(g);
    if (isAltGrText(mods, codepoint)) return createAltGrTextKey(s, codepoint, mods.shift);
    let T = match[3] ? parseInt(match[3], 10) : void 0,
      A = mods.ctrl && codepoint > 127 && T !== void 0 ? T : codepoint,
      D = keycodeToName(mods, A);
    return {
      kind: "key",
      name: D ?? codePointToKeyName(A),
      fn: !1,
      ctrl: D === void 0 && mods.ctrl,
      meta: mods.meta,
      shift: mods.shift,
      option: !1,
      super: mods.super,
      sequence: s,
      raw: s,
      code: void 0,
      col: void 0,
      row: void 0,
    };
  }
  if ((match = MODIFY_OTHER_KEYS_RE.exec(s))) {
    let name = decodeModifier(parseInt(match[1], 10)),
      g = parseInt(match[2], 10);
    if (isAltGrText(name, g)) return createAltGrTextKey(s, g, name.shift);
    let E = keycodeToName(name, g);
    return {
      kind: "key",
      name: E ?? codePointToKeyName(g),
      fn: !1,
      ctrl: E === void 0 && name.ctrl,
      meta: name.meta,
      shift: name.shift,
      option: !1,
      super: name.super,
      sequence: s,
      raw: s,
      code: void 0,
      col: void 0,
      row: void 0,
    };
  }
  if ((match = SGR_MOUSE_RE.exec(s))) {
    let p = parseInt(match[1], 10),
      g = parseInt(match[2], 10),
      button = parseInt(match[3], 10);
    return createWheelKey(s, p, g, button) ?? createNavKey(s, "mouse", !1);
  }
  if (s.length === 6 && s.startsWith("\x1B[M")) {
    let p = s.charCodeAt(3) - 32,
      g = s.charCodeAt(4) - 32,
      E = s.charCodeAt(5) - 32;
    return createWheelKey(s, p, g, E) ?? createNavKey(s, "mouse", !1);
  }
  if (s === "\r" || s === "\x1B\r") ((key.raw = void 0), (key.name = "return"), (key.meta = s.length === 2));
  else if (
    s ===
      `
` ||
    s ===
      `\x1B
`
  )
    ((key.name = "enter"), (key.meta = s.length === 2));
  else if (s === "\t" || s === "\x1B\t") ((key.name = "tab"), (key.meta = s.length === 2));
  else if (s === "\b" || s === "\x1B\b") {
    if (((key.name = "backspace"), (key.meta = s.charAt(0) === "\x1B"), isBackspaceCtrlBackspaceHere()))
      key.ctrl = !0;
  } else if (s === "\x7F" || s === "\x1B\x7F")
    ((key.name = "backspace"), (key.meta = s.charAt(0) === "\x1B"));
  else if (s === "\x1B" || s === "\x1B\x1B") ((key.name = "escape"), (key.meta = s.length === 2));
  else if (s === " " || s === "\x1B ") ((key.name = "space"), (key.meta = s.length === 2));
  else if (s === "\x1C") ((key.name = "\\"), (key.ctrl = !0));
  else if (s === "\x1D") ((key.name = "]"), (key.ctrl = !0));
  else if (s === "\x1E") ((key.name = "^"), (key.ctrl = !0));
  else if (s === "\x1F") ((key.name = "_"), (key.ctrl = !0));
  else if (s <= "\x1A" && s.length === 1)
    ((key.name = String.fromCharCode(s.charCodeAt(0) + 97 - 1)), (key.ctrl = !0));
  else if (s.length === 1 && s >= "0" && s <= "9") key.name = "number";
  else if (s.length === 1 && s >= "a" && s <= "z") key.name = s;
  else if (s.length === 1 && s >= "A" && s <= "Z") ((key.name = s.toLowerCase()), (key.shift = !0));
  else if ((metaMatch = META_KEY_CODE_RE.exec(s)))
    ((key.meta = !0), (key.shift = /^[A-Z]$/.test(metaMatch[1])), (key.name = metaMatch[1].toLowerCase()));
  else if ((metaMatch = FN_KEY_RE.exec(s))) {
    let segs = [...s];
    if (segs[0] === "\x1B" && segs[1] === "\x1B") key.option = !0;
    let code = [metaMatch[1], metaMatch[2], metaMatch[4], metaMatch[6]].filter(Boolean).join(""),
      E = (metaMatch[3] || metaMatch[5] || 1) - 1;
    ((key.ctrl = !!(E & 4)),
      (key.meta = !!(E & 2)),
      (key.super = !!(E & 8)),
      (key.shift = !!(E & 1)),
      (key.code = code),
      (key.name = code === "[P" && E === 0 && isStKeyDialect() ? "delete" : keyName[code]),
      (key.shift = isShiftKey(code) || key.shift),
      (key.ctrl = isCtrlKey(code) || key.ctrl));
  }
  if (key.raw === "\x1Bb") ((key.meta = !0), (key.name = "left"));
  else if (key.raw === "\x1Bf") ((key.meta = !0), (key.name = "right"));
  switch (s) {
    case "\x1B[1~":
      return createNavKey(s, "home", !1);
    case "\x1B[4~":
      return createNavKey(s, "end", !1);
    case "\x1B[5~":
      return createNavKey(s, "pageup", !1);
    case "\x1B[6~":
      return createNavKey(s, "pagedown", !1);
    case "\x1B[1;5D":
      return createNavKey(s, "left", !0);
    case "\x1B[1;5C":
      return createNavKey(s, "right", !0);
  }
  return key;
}
/**
 * 鼠标按钮码是滚轮（64/65）时生成 wheelup/wheeldown 键并带上 ctrl/meta/shift 与坐标；否则返回 null。
 */
//@ chunk-bzr73sfg.js:143647-143875 callgraph-fingerprint = createNavKey (0.744)
function createWheelKey(sequence, buttonCode, col, row) {
  let p = buttonCode & 67;
  if (p !== 64 && p !== 65) return null;
  return {
    kind: "key",
    name: p === 64 ? "wheelup" : "wheeldown",
    fn: !1,
    ctrl: (buttonCode & 16) !== 0,
    meta: (buttonCode & 8) !== 0,
    shift: (buttonCode & 4) !== 0,
    option: !1,
    super: !1,
    sequence: sequence,
    raw: sequence,
    code: void 0,
    col: col,
    row: row,
  };
}
/**
 * 按给定键名和 ctrl 标志构造 ParsedKey（导航键、无法识别的鼠标序列等用）。
 */
//@ chunk-bzr73sfg.js:143875-144020 fingerprint = createPasteKey (0.909)
function createNavKey(sequence, name, ctrl) {
  return {
    kind: "key",
    name: name,
    fn: !1,
    ctrl: ctrl,
    meta: !1,
    shift: !1,
    option: !1,
    super: !1,
    sequence: sequence,
    raw: sequence,
    code: void 0,
    col: void 0,
    row: void 0,
  };
}
/**
 * 是粘贴或真正的按键（不是滚轮/鼠标伪键）。
 */
//@ chunk-bzr73sfg.js:243839-243954 fingerprint = nonAlphanumericKeys (0.645)
function isKeyOrPaste(item) {
  return (
    item.kind === "paste" ||
    (item.kind === "key" && item.name !== "wheelup" && item.name !== "wheeldown" && item.name !== "mouse")
  );
}

export {
  INITIAL_STATE,
  parseMultipleKeypresses,
  isPlausibleIncompleteSequence,
  discardIncompleteInput,
  isKeyOrPaste,
  getCsiUPrintableChar,
  isBackspaceCtrlBackspaceHere,
};
