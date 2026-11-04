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

//@ chunk-bzr73sfg.js:129780-130164 placement
/**
 * 键盘协议解析用的正则与按键码常量。
 */
var WIN32_INPUT_MODE_RE = /^\x1b\[(\d*(?:;\d*){0,5})_$/;
var RIGHT_ALT_PRESSED = 1;
var LEFT_ALT_PRESSED = 2;
var RIGHT_CTRL_PRESSED = 4;
var LEFT_CTRL_PRESSED = 8;
var SHIFT_PRESSED = 16;
var VK_BACK = 8;
var VK_TAB = 9;
var VK_RETURN = 13;
var VK_MENU = 18;
var VK_ESCAPE = 27;
var VK_SPACE = 32;
var VK_F1 = 112;
var VK_F4 = 115;
var VK_F5 = 116;
var VK_F12 = 123;
var MAX_WIN32_REPEAT = 8;
var WIN32_NAV_KEY_CSI = {
  33: {
    code: 5,
    final: "~",
  },
  34: {
    code: 6,
    final: "~",
  },
  35: {
    code: 1,
    final: "F",
  },
  36: {
    code: 1,
    final: "H",
  },
  37: {
    code: 1,
    final: "D",
  },
  38: {
    code: 1,
    final: "A",
  },
  39: {
    code: 1,
    final: "C",
  },
  40: {
    code: 1,
    final: "B",
  },
  45: {
    code: 2,
    final: "~",
  },
  46: {
    code: 3,
    final: "~",
  },
};
var WIN32_F5_F12_CODES = [15, 17, 18, 19, 20, 21, 23, 24];
//@ chunk-bzr73sfg.js:130164-131427 placement
/**
 * 解析 kitty 键盘协议的 CSI _ 序列。
 */
function decodeWin32InputSequence(sequence, pendingHighSurrogate) {
  let match = WIN32_INPUT_MODE_RE.exec(sequence);
  if (!match) return null;
  let parts = match[1].split(";");
  let virtualKey = parseIntParam(parts, 0, 0);
  let unicodeChar = parseIntParam(parts, 2, 0);
  let isKeyDown = parseIntParam(parts, 3, 0) !== 0;
  let controlState = parseIntParam(parts, 4, 0);
  let repeatCount = Math.min(Math.max(parseIntParam(parts, 5, 1), 1), MAX_WIN32_REPEAT);
  if (!isKeyDown) {
    if (virtualKey === VK_MENU && unicodeChar !== 0)
      return {
        sequences: [String.fromCharCode(unicodeChar)],
        highSurrogate: "",
      };
    return {
      sequences: [],
      highSurrogate: pendingHighSurrogate,
    };
  }
  let hasAlt = (controlState & (LEFT_ALT_PRESSED | RIGHT_ALT_PRESSED)) !== 0;
  let hasCtrl = (controlState & (LEFT_CTRL_PRESSED | RIGHT_CTRL_PRESSED)) !== 0;
  let hasShift = (controlState & SHIFT_PRESSED) !== 0;
  let isAltGr = hasAlt && hasCtrl && unicodeChar > 32 && unicodeChar !== 127;
  let ctrl = hasCtrl && !isAltGr;
  let alt = hasAlt && !isAltGr;
  let modifierParam = 1 + (hasShift ? 1 : 0) + (alt ? 2 : 0) + (ctrl ? 4 : 0);
  let navKey = WIN32_NAV_KEY_CSI[virtualKey];
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
    let letter = String.fromCharCode(80 + (virtualKey - VK_F1));
    return repeatSequences(
      repeatCount,
      modifierParam === 1 ? `\x1BO${letter}` : csi(1, modifierParam, letter),
    );
  }
  if (virtualKey >= VK_F5 && virtualKey <= VK_F12) {
    let fKeyCode = WIN32_F5_F12_CODES[virtualKey - VK_F5];
    return repeatSequences(
      repeatCount,
      modifierParam === 1 ? csi(fKeyCode, "~") : csi(fKeyCode, modifierParam, "~"),
    );
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
    let isLetter = virtualKey >= 65 && virtualKey <= 90;
    let isDigit = virtualKey >= 48 && virtualKey <= 57;
    if (!(ctrl || alt) || !(isLetter || isDigit))
      return {
        sequences: [],
        highSurrogate: pendingHighSurrogate,
      };
    charCode = isLetter && !hasShift ? virtualKey + 32 : virtualKey;
    if (ctrl) charCode = toControlCharCode(charCode);
  } else if (ctrl) charCode = toControlCharCode(charCode);
  if (charCode >= 55296 && charCode <= 56319)
    return {
      sequences: [],
      highSurrogate: String.fromCharCode(charCode),
    };
  let text = String.fromCharCode(charCode);
  if (charCode >= 56320 && charCode <= 57343) {
    if (!pendingHighSurrogate)
      return {
        sequences: [],
        highSurrogate: "",
      };
    text = pendingHighSurrogate + text;
  }
  return repeatSequences(repeatCount, altPrefix + text);
}
//@ chunk-bzr73sfg.js:131427-131500 placement
/**
 * 取 params[index] 转整数，缺失或空串返回 fallback。
 */
function parseIntParam(params, index, fallback) {
  let raw = params[index];
  return raw === undefined || raw === "" ? fallback : parseInt(raw, 10);
}
//@ chunk-bzr73sfg.js:131500-131569 placement
function repeatSequences(count, sequence) {
  return {
    sequences: Array(count).fill(sequence),
    highSurrogate: "",
  };
}
//@ chunk-bzr73sfg.js:131569-131797 placement
/**
 * 按 xterm 规则把字符码转成 Ctrl 组合产生的控制码（@–_ 与 a–z 取低 5 位，2/空格→NUL，3–7→ESC..US，8/?→DEL，/→US）。
 */
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
//@ chunk-bzr73sfg.js:131797-132430 placement
/**
 * 按键序列解析用正则（meta、CSI、kitty、modifyOtherKeys、DECRPM）。
 */
var META_KEY_CODE_RE = /^(?:\x1b)([a-zA-Z0-9])$/;
var FN_KEY_RE = /^(?:\x1b+)(O|N|\[|\[\[)(?:(\d+)(?:;(\d+))?([~^$])|(?:1;)?(\d+)?([a-zA-Z]))/;
var CSI_U_RE = /^\x1b\[(\d+)(?::(\d*)(?::(\d+))?)?(?:;(\d+))?u/;
var MODIFY_OTHER_KEYS_RE = /^\x1b\[27;(\d+);(\d+)~/;
var DECRPM_RE = /^\x1b\[\?(\d+);(\d+)\$y$/;
var DA1_RE = /^\x1b\[\?([\d;]*)c$/;
var DA2_RE = /^\x1b\[>([\d;]*)c$/;
var KITTY_FLAGS_RE = /^\x1b\[\?(\d+)u$/;
var CURSOR_POSITION_RE = /^\x1b\[\?(\d+);(\d+)R$/;
var CELL_SIZE_RE = /^\x1b\[6;(\d+);(\d+)t$/;
var THEME_NOTIFY_RE = /^\x1b\[\?997;([12])n$/;
var OSC_RESPONSE_RE = /^\x1b\](\d+);(.*?)(?:\x07|\x1b\\)$/s;
var XTVERSION_RE = /^\x1bP>\|(.*?)(?:\x07|\x1b\\)$/s;
var KITTY_GRAPHICS_RESPONSE_RE = /^\x1b_G(?:[^;]*,)?i=(\d+)[^;]*;(.*?)\x1b\\$/s;
var SGR_MOUSE_RE = /^\x1b\[<(\d+);(-?\d+);(-?\d+)([Mm])$/;
var SGR_MOUSE_PREFIX_RE = /^\x1b\[<[\d;-]*$/;
var SGR_MOUSE_LEADING_RE = /^\x1b\[<[\d;-]*[Mm]/;
var SGR_MOUSE_COMPLETE_RE = /^\x1b\[<\d+;-?\d+;-?\d+[Mm]/;
var MAX_MOUSE_PREFIX_LEN = 32;
//@ chunk-bzr73sfg.js:132430-132477 placement
/**
 * 文本是否是被拆开的 SGR 鼠标序列前缀（ESC[< 数字;…，长度不超过 32）。
 */
function isPartialSgrMousePrefix(text) {
  return text.length <= MAX_MOUSE_PREFIX_LEN && SGR_MOUSE_PREFIX_RE.test(text);
}
//@ chunk-bzr73sfg.js:132477-132589 placement
var PARTIAL_CSI_RE = /^\x1b\[(?:[0-9:;]+|[<=>?][0-9:;]*[ -/]*)$/;
var PARTIAL_STRING_SEQ_RE = /^\x1b(?:\][0-9]|P[0-9>|$+=!]|_G)[^\x07]*$/s;
var MAX_PARTIAL_STRING_SEQ_LEN = 256;
var MAX_PARTIAL_CSI_LEN = 64;
//@ chunk-bzr73sfg.js:132589-132697 placement
/**
 * 输入在 flush 时剩下的半截转义序列是否还可能被后续字节补全（鼠标前缀、OSC/DCS/APC 串不超过 256 字节、CSI 参数串不超过 64 字节）；是则保留等待，否则当普通按键冲刷出去。
 */
function isPlausibleIncompleteSequence(buffer) {
  if (SGR_MOUSE_PREFIX_RE.test(buffer)) return isPartialSgrMousePrefix(buffer);
  if (PARTIAL_STRING_SEQ_RE.test(buffer)) return buffer.length <= MAX_PARTIAL_STRING_SEQ_LEN;
  return buffer.length <= MAX_PARTIAL_CSI_LEN && PARTIAL_CSI_RE.test(buffer);
}
//@ chunk-bzr73sfg.js:132697-132816 placement
/**
 * 清空分词器里的半截输入，把它记成 droppedMousePrefix（后续文本若是被截断的鼠标序列尾巴会被吞掉）。
 */
function discardIncompleteInput(state) {
  let buffered = state._tokenizer?.buffer() ?? "";
  state._tokenizer?.reset();
  return {
    ...state,
    incomplete: "",
    droppedMousePrefix: buffered,
  };
}
//@ chunk-bzr73sfg.js:132816-133676 fingerprint (2.1.88 match: parseTerminalResponse, 0.821)
/**
 * 把终端对查询的应答解析成结构：DECRPM、DA1/DA2、kitty 键盘标志、光标位置、主题变化通知（997）、单元格像素尺寸、OSC、XTVERSION、kitty 图形应答；都不是返回 null。
 */
function parseTerminalResponse(s) {
  if (s.startsWith("\x1B[")) {
    let m;
    if ((m = DECRPM_RE.exec(s)))
      return {
        type: "decrpm",
        mode: parseInt(m[1], 10),
        status: parseInt(m[2], 10),
      };
    if ((m = DA1_RE.exec(s)))
      return {
        type: "da1",
        params: splitNumericParams(m[1]),
      };
    if ((m = DA2_RE.exec(s)))
      return {
        type: "da2",
        params: splitNumericParams(m[1]),
      };
    if ((m = KITTY_FLAGS_RE.exec(s)))
      return {
        type: "kittyKeyboard",
        flags: parseInt(m[1], 10),
      };
    if ((m = CURSOR_POSITION_RE.exec(s)))
      return {
        type: "cursorPosition",
        row: parseInt(m[1], 10),
        col: parseInt(m[2], 10),
      };
    if ((m = THEME_NOTIFY_RE.exec(s)))
      return {
        type: "themeNotify",
        dark: m[1] === "1",
      };
    if ((m = CELL_SIZE_RE.exec(s)))
      return {
        type: "cellSize",
        height: parseInt(m[1], 10),
        width: parseInt(m[2], 10),
      };
    return null;
  }
  if (s.startsWith("\x1B]")) {
    let m = OSC_RESPONSE_RE.exec(s);
    if (m)
      return {
        type: "osc",
        code: parseInt(m[1], 10),
        data: m[2],
      };
  }
  if (s.startsWith("\x1BP")) {
    let m = XTVERSION_RE.exec(s);
    if (m)
      return {
        type: "xtversion",
        name: m[1],
      };
  }
  if (s.startsWith("\x1B_")) {
    let match = KITTY_GRAPHICS_RESPONSE_RE.exec(s);
    if (match)
      return {
        type: "kittyGraphics",
        id: parseInt(match[1], 10),
        message: match[2],
      };
  }
  return null;
}
//@ chunk-bzr73sfg.js:133676-133751 file-local
/**
 * 把 CSI 参数串按分号拆成整数数组。
 */
function splitNumericParams(params) {
  if (!params) return [];
  return params.split(";").map((part) => parseInt(part, 10));
}
//@ chunk-bzr73sfg.js:133751-133891 fingerprint (2.1.88 match: INITIAL_STATE, 0.629)
/**
 * 按键解析器初始状态：NORMAL 模式，空的半截输入、粘贴缓冲、待拼 UTF-8 字节、被丢弃的鼠标前缀、flush 时冲出的 ESC 前缀、win32 高位代理。
 */
var INITIAL_STATE = {
  mode: "NORMAL",
  incomplete: "",
  pasteBuffer: "",
  pendingByteEvents: [],
  droppedMousePrefix: "",
  flushedEscapePrefix: "",
  win32HighSurrogate: "",
};
//@ chunk-bzr73sfg.js:134050-134096 placement (2.1.88 match: chordToDisplayString, 1)
/**
 * 用当前进程环境调用 isBackspaceCtrlBackspace；linux 构建里平台常量是 "linux"。
 */
function isBackspaceCtrlBackspaceHere() {
  return isBackspaceCtrlBackspace("linux", process.env);
}
//@ chunk-bzr73sfg.js:134096-134165 placement
/**
 * 终端键序列方言：优先用会话状态里记下的 keyDialect（终端探测结果），否则按 TERM 推断（如 st、rxvt）。
 */
function getKeyDialect() {
  let keyDialect = getAttacherCaps()?.keyDialect;
  return keyDialect !== undefined ? keyDialect : detectMinimalTerminal(env.TERM);
}
//@ chunk-bzr73sfg.js:134165-134198 placement
function isStKeyDialect() {
  return getKeyDialect() === "st";
}
//@ chunk-bzr73sfg.js:134198-134233 placement
function isRxvtKeyDialect() {
  return getKeyDialect() === "rxvt";
}
//@ chunk-bzr73sfg.js:134233-134366 placement
/**
 * AltGr 当文字的模式：CLAUDE_CODE_ALTGR_AS_TEXT 显式真→force、假→off；否则在 Windows Terminal（WT_SESSION）里 auto，其余 off。
 */
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
//@ chunk-bzr73sfg.js:134534-134701 layout (2.1.88 match: createPasteKey, 0.864)
/**
 * 把 AltGr（Ctrl+Alt）组合产生的可打印字符当成普通文字键：name 为该字符，不带 ctrl/meta。
 */
function createAltGrTextKey(sequence, codePoint, shift) {
  return {
    kind: "key",
    name: String.fromCodePoint(codePoint),
    fn: false,
    ctrl: false,
    meta: false,
    shift,
    option: false,
    super: false,
    sequence,
    raw: sequence,
    code: undefined,
    col: undefined,
    row: undefined,
  };
}
//@ chunk-bzr73sfg.js:134701-134836 layout
/**
 * Ctrl+Alt（无 Super）加可打印字符是否按 AltGr 文字处理：mode=off 否，force 是，auto 时字母数字仍当快捷键。
 */
function isAltGrText(modifiers, codePoint) {
  if (!(modifiers.ctrl && modifiers.meta) || modifiers.super) return false;
  if (!isPrintableCodePoint(codePoint)) return false;
  let mode = getAltGrMode();
  if (mode === "off") return false;
  return mode === "force" || !isAsciiAlphanumeric(codePoint);
}
//@ chunk-bzr73sfg.js:134836-135043 fingerprint (2.1.88 match: inputToString, 1)
/**
 * 把 stdin 数据转成字符串；单字节且高位为 1 的 Buffer 按 Meta 前缀（ESC + 低 7 位）解释。
 */
function inputToString(input) {
  if (Nc.isBuffer(input)) {
    if (input[0] > 127 && input[1] === undefined) {
      input[0] -= 128;
      return "\x1B" + String(input);
    } else return String(input);
  } else if (input !== undefined && typeof input !== "string") return String(input);
  else if (!input) return "";
  else return input;
}
//@ chunk-bzr73sfg.js:135043-137460 fingerprint (2.1.88 match: parseMultipleKeypresses, 0.664)
/**
 * 输入解析主入口：用 termio 分词器把一段 stdin 文本切成序列/文本，产出 ParsedInput 数组和新状态。处理：括号粘贴（ESC[200~/201~ 之间收集到 pasteBuffer，产出 {kind:'paste'}）、终端应答（{kind:'response'}）、SGR/X10 鼠标、焦点进出（{kind:'focus'}）、win32-input-mode、CSI u 里编码的单个 UTF-8 字节（凑齐多字节字符再出）、被截断的鼠标序列尾巴（droppedMousePrefix）、flush 时冲出的 ESC 前缀。input 为 null 表示超时 flush。
 */
function parseMultipleKeypresses(prevState, input = "") {
  let isFlush = input === null;
  let text = isFlush ? "" : inputToString(input);
  let tokenizer =
    prevState._tokenizer ??
    createTokenizer({
      x10Mouse: true,
      escPrefixedKeyIsAlt: isRxvtKeyDialect,
    });
  let droppedMousePrefix = prevState.droppedMousePrefix;
  let flushedPrefixOut = isFlush ? prevState.flushedEscapePrefix : "";
  let flushedEscapePrefix = prevState.flushedEscapePrefix;
  let tokens;
  if (isFlush && prevState.mode !== "IN_PASTE") {
    let buffered = tokenizer.buffer();
    if (isPlausibleIncompleteSequence(buffered)) tokens = [];
    else if (SGR_MOUSE_PREFIX_RE.test(buffered)) {
      tokenizer.reset();
      droppedMousePrefix = buffered;
      tokens = [];
    } else {
      if (buffered === "\x1B" || buffered === "\x1B[") flushedPrefixOut = buffered;
      tokens = tokenizer.flush();
    }
  } else tokens = isFlush ? tokenizer.flush() : tokenizer.feed(text);
  let keys = [];
  let inPaste = prevState.mode === "IN_PASTE";
  let { pasteBuffer, pendingByteEvents, win32HighSurrogate } = prevState;
  function emitByteEvent(event) {
    if (inPaste) pasteBuffer += String.fromCharCode(event.byte);
    else keys.push(parseKeypress(event.seq));
  }
  function flushPendingBytes() {
    for (let pendingByteEvent of pendingByteEvents) emitByteEvent(pendingByteEvent);
    pendingByteEvents = [];
  }
  function pushByteEvent(seq, byte) {
    if (pendingByteEvents.length === 0) {
      if (byte >= 194 && byte <= 244) {
        pendingByteEvents = [
          {
            seq,
            byte,
          },
        ];
        return;
      }
      emitByteEvent({
        seq,
        byte,
      });
      return;
    }
    if (byte >= 128 && byte <= 191) {
      pendingByteEvents = [
        ...pendingByteEvents,
        {
          seq,
          byte,
        },
      ];
      let byte_2 = pendingByteEvents[0].byte;
      let expectedBytes = byte_2 <= 223 ? 2 : byte_2 <= 239 ? 3 : 4;
      if (pendingByteEvents.length < expectedBytes) return;
      let group = pendingByteEvents;
      pendingByteEvents = [];
      let str = Nc.from(group.map((pending) => pending.byte)).toString("utf8");
      if ([...str].length !== 1 || Nc.byteLength(str, "utf8") !== group.length)
        for (let pending of group) emitByteEvent(pending);
      else if (inPaste) pasteBuffer += str;
      else keys.push(parseKeypress(str));
      return;
    }
    flushPendingBytes();
    pushByteEvent(seq, byte);
  }
  for (let token of tokens)
    if (token.type === "sequence") {
      droppedMousePrefix = "";
      flushedEscapePrefix = "";
      if (token.value === PASTE_START) {
        flushPendingBytes();
        inPaste = true;
        pasteBuffer = "";
      } else if (token.value === PASTE_END) {
        flushPendingBytes();
        keys.push({
          kind: "paste",
          text: pasteBuffer,
        });
        inPaste = false;
        pasteBuffer = "";
      } else if (inPaste) {
        if (isMouseOrFocusSequence(token.value)) continue;
        let response = getEncodedByte(token.value);
        if (response !== undefined) {
          pushByteEvent(token.value, response);
          continue;
        }
        if (!parseTerminalResponse(token.value) && !X10_MOUSE_RE.test(token.value)) flushPendingBytes();
        pasteBuffer += csiKeyToPasteText(token.value);
      } else {
        let win32Result = decodeWin32InputSequence(token.value, win32HighSurrogate);
        if (win32Result) {
          flushPendingBytes();
          win32HighSurrogate = win32Result.highSurrogate;
          for (let sequence of win32Result.sequences) keys.push(parseKeypress(sequence));
          continue;
        }
        let mouse = getEncodedByte(token.value);
        if (mouse !== undefined) {
          pushByteEvent(token.value, mouse);
          continue;
        }
        let terminalResponse = parseTerminalResponse(token.value);
        if (terminalResponse) {
          keys.push({
            kind: "response",
            sequence: token.value,
            response: terminalResponse,
          });
          continue;
        }
        let mouseEvent = parseMouseEvent(token.value);
        if (mouseEvent) {
          keys.push(mouseEvent);
          continue;
        }
        if (
          token.value === FOCUS_OUT ||
          (!isMouseOrFocusSequence(token.value) && !X10_MOUSE_RE.test(token.value))
        )
          flushPendingBytes();
        if (token.value === FOCUS_IN || token.value === FOCUS_OUT) {
          keys.push({
            kind: "focus",
            focused: token.value === FOCUS_IN,
          });
          continue;
        }
        keys.push(parseKeypress(token.value));
      }
    } else if (token.type === "text") {
      flushPendingBytes();
      let text = token.value;
      if (!inPaste && flushedEscapePrefix) {
        let combined = flushedEscapePrefix + text;
        let match = SGR_MOUSE_COMPLETE_RE.exec(combined);
        flushedEscapePrefix = "";
        if (match) {
          let mouse = parseMouseEvent(match[0]);
          keys.push(mouse ?? parseKeypress(match[0]));
          text = combined.slice(match[0].length);
          if (!text) continue;
        }
      }
      if (!inPaste && droppedMousePrefix) {
        let text_2 = droppedMousePrefix + text;
        let match = SGR_MOUSE_LEADING_RE.exec(text_2);
        if (match) {
          droppedMousePrefix = "";
          text = text_2.slice(match[0].length);
          if (!text) continue;
        } else if (isPartialSgrMousePrefix(text_2)) {
          droppedMousePrefix = text_2;
          continue;
        } else droppedMousePrefix = "";
      } else if (!inPaste && isPartialSgrMousePrefix(text)) {
        droppedMousePrefix = text;
        continue;
      }
      if (inPaste) pasteBuffer += text;
      else if (/^\[<\d+;-?\d+;-?\d+[Mm]$/.test(text) || /^\[M[\x60-\x7f][\x20-\uffff]{2}$/.test(text)) {
        let sequence = "\x1B" + text;
        let mouseEvent = parseMouseEvent(sequence);
        keys.push(mouseEvent ?? parseKeypress(sequence));
      } else keys.push(parseKeypress(text));
    }
  if (isFlush) flushPendingBytes();
  if (isFlush && inPaste) {
    if (pasteBuffer)
      keys.push({
        kind: "paste",
        text: pasteBuffer,
      });
    inPaste = false;
    pasteBuffer = "";
  }
  let nextState = {
    mode: inPaste ? "IN_PASTE" : "NORMAL",
    incomplete: tokenizer.buffer(),
    pasteBuffer,
    pendingByteEvents,
    droppedMousePrefix,
    flushedEscapePrefix: flushedPrefixOut,
    win32HighSurrogate,
    _tokenizer: tokenizer,
  };
  return [keys, nextState];
}
//@ chunk-bzr73sfg.js:137460-138621 fingerprint (2.1.88 match: keyName, 0.991)
/**
 * 功能键序列（去掉 ESC 后的代码）→ 键名表；isShiftKey/isCtrlKey 判断 rxvt 风格的 Shift/Ctrl 变体（[a、Oa、[2$、[2^ 等）。
 */
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
};
var isShiftKey = (code) =>
  ["[a", "[b", "[c", "[d", "[e", "[2$", "[3$", "[5$", "[6$", "[7$", "[8$", "[Z"].includes(code);
var isCtrlKey = (code) =>
  ["Oa", "Ob", "Oc", "Od", "Oe", "[2^", "[3^", "[5^", "[6^", "[7^", "[8^"].includes(code);
//@ chunk-bzr73sfg.js:138621-138708 fingerprint (2.1.88 match: decodeModifier, 1)
/**
 * xterm 修饰参数（1 + 位掩码）解码成 {shift, meta, ctrl, super}。
 */
function decodeModifier(modifier) {
  let m = modifier - 1;
  return {
    shift: !!(m & 1),
    meta: !!(m & 2),
    ctrl: !!(m & 4),
    super: !!(m & 8),
  };
}
//@ chunk-bzr73sfg.js:138708-139630 layout
/**
 * CSI u / modifyOtherKeys 里的码点 → 键名：控制键（backspace/tab/return/escape/space）、kitty 小键盘私有码 57399–57426（数字、运算符、方向、翻页、Home/End/Insert/Delete），其余可打印字符转小写字符本身。
 */
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
//@ chunk-bzr73sfg.js:139630-139836 fingerprint (2.1.88 match: keycodeToName, 0.688)
/**
 * 只有 Ctrl（无 Shift/Meta/Super）时把 Ctrl+[、Ctrl+M、Ctrl+I、Ctrl+H 还原成 escape/return/tab/backspace（kitty 协议会把这些编码成 Ctrl+字母）。
 */
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
//@ chunk-bzr73sfg.js:139836-140071 layout
/**
 * CSI u 或 modifyOtherKeys 序列若编码的是 128–255 之间的单个字节（无修饰），返回该字节；用于在原始字节模式下拼 UTF-8。
 */
function getEncodedByte(sequence) {
  let codePoint;
  let modifier;
  let match = CSI_U_RE.exec(sequence);
  if (match) {
    codePoint = parseInt(match[1], 10);
    modifier = match[4] === undefined ? undefined : parseInt(match[4], 10);
  } else if ((match = MODIFY_OTHER_KEYS_RE.exec(sequence))) {
    modifier = parseInt(match[1], 10);
    codePoint = parseInt(match[2], 10);
  }
  if (codePoint === undefined || codePoint < 128 || codePoint > 255) return;
  if (modifier !== undefined && modifier !== 1) return;
  return codePoint;
}
//@ chunk-bzr73sfg.js:140071-140169 layout
function getCsiUPrintableChar(sequence) {
  let codePoint = parseInt(CSI_U_RE.exec(sequence)?.[2] ?? "", 10);
  return isPrintableCodePoint(codePoint) ? String.fromCodePoint(codePoint) : undefined;
}
//@ chunk-bzr73sfg.js:140169-140516 layout
/**
 * 粘贴期间收到 CSI u / modifyOtherKeys 编码的按键时还原成字符（Ctrl+I→\t、Ctrl+J→\n、Ctrl+M→\r），其它序列原样返回。
 */
function csiKeyToPasteText(sequence) {
  let match = CSI_U_RE.exec(sequence);
  let codePoint = match ? parseInt(match[1], 10) : undefined;
  let modifier = match ? (match[4] ? parseInt(match[4], 10) : 1) : 1;
  if (codePoint === undefined && (match = MODIFY_OTHER_KEYS_RE.exec(sequence))) {
    modifier = parseInt(match[1], 10);
    codePoint = parseInt(match[2], 10);
  }
  if (codePoint !== undefined && codePoint <= 1114111) {
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
var X10_MOUSE_MOTION_RE = /^\x1b\[M[\x60-\x7f][\x20-\uffff]{2}$/;
var X10_MOUSE_RE = /^\x1b\[M[\x20-\x7f][\x20-\uffff]{2}$/;
//@ chunk-bzr73sfg.js:140604-140667 layout
function isMouseOrFocusSequence(sequence) {
  return (
    sequence === FOCUS_IN ||
    sequence === FOCUS_OUT ||
    SGR_MOUSE_RE.test(sequence) ||
    X10_MOUSE_MOTION_RE.test(sequence)
  );
}
//@ chunk-bzr73sfg.js:140667-140888 fingerprint (2.1.88 match: parseMouseEvent, 1)
/**
 * 解析 SGR 鼠标序列（ESC[<b;x;y M/m）成 {kind:'mouse', button, action, col, row}；滚轮（button 位 64）不在这里，留给 parseKeypress 变成 wheelup/wheeldown 键。
 */
function parseMouseEvent(s) {
  let match = SGR_MOUSE_RE.exec(s);
  if (!match) return null;
  let button = parseInt(match[1], 10);
  if ((button & 64) !== 0) return null;
  return {
    kind: "mouse",
    button,
    action: match[4] === "M" ? "press" : "release",
    col: parseInt(match[2], 10),
    row: parseInt(match[3], 10),
    sequence: s,
  };
}
//@ chunk-bzr73sfg.js:140888-143647 fingerprint (2.1.88 match: parseKeypress, 0.933)
/**
 * 把一个序列解析成 ParsedKey：依次尝试 CSI u（kitty，含 AltGr 文字、Ctrl 码点修正）、modifyOtherKeys、SGR/X10 滚轮、单字节控制键（\r/\n/\t/\b/DEL/ESC/空格/Ctrl+字母）、Meta+字母、功能键表；最后对几个常见序列（Home/End/PageUp/PageDown/Ctrl+方向）做固定映射。
 */
function parseKeypress(s = "") {
  let metaMatch;
  let key = {
    kind: "key",
    name: "",
    fn: false,
    ctrl: false,
    meta: false,
    shift: false,
    option: false,
    super: false,
    sequence: s,
    raw: s,
    code: undefined,
    col: undefined,
    row: undefined,
  };
  key.sequence = key.sequence || s || key.name;
  let match;
  if ((match = CSI_U_RE.exec(s))) {
    let codepoint = parseInt(match[1], 10);
    let modifier = match[4] ? parseInt(match[4], 10) : 1;
    let mods = decodeModifier(modifier);
    if (isAltGrText(mods, codepoint)) return createAltGrTextKey(s, codepoint, mods.shift);
    let alternateKey = match[3] ? parseInt(match[3], 10) : undefined;
    let codePoint = mods.ctrl && codepoint > 127 && alternateKey !== undefined ? alternateKey : codepoint;
    let namedKey = keycodeToName(mods, codePoint);
    return {
      kind: "key",
      name: namedKey ?? codePointToKeyName(codePoint),
      fn: false,
      ctrl: namedKey === undefined && mods.ctrl,
      meta: mods.meta,
      shift: mods.shift,
      option: false,
      super: mods.super,
      sequence: s,
      raw: s,
      code: undefined,
      col: undefined,
      row: undefined,
    };
  }
  if ((match = MODIFY_OTHER_KEYS_RE.exec(s))) {
    let name = decodeModifier(parseInt(match[1], 10));
    let codePoint = parseInt(match[2], 10);
    if (isAltGrText(name, codePoint)) return createAltGrTextKey(s, codePoint, name.shift);
    let otherNamedKey = keycodeToName(name, codePoint);
    return {
      kind: "key",
      name: otherNamedKey ?? codePointToKeyName(codePoint),
      fn: false,
      ctrl: otherNamedKey === undefined && name.ctrl,
      meta: name.meta,
      shift: name.shift,
      option: false,
      super: name.super,
      sequence: s,
      raw: s,
      code: undefined,
      col: undefined,
      row: undefined,
    };
  }
  if ((match = SGR_MOUSE_RE.exec(s))) {
    let buttonCode = parseInt(match[1], 10);
    let col = parseInt(match[2], 10);
    let button = parseInt(match[3], 10);
    return createWheelKey(s, buttonCode, col, button) ?? createNavKey(s, "mouse", false);
  }
  if (s.length === 6 && s.startsWith("\x1B[M")) {
    let buttonCode = s.charCodeAt(3) - 32;
    let col = s.charCodeAt(4) - 32;
    let row = s.charCodeAt(5) - 32;
    return createWheelKey(s, buttonCode, col, row) ?? createNavKey(s, "mouse", false);
  }
  if (s === "\r" || s === "\x1B\r") {
    key.raw = undefined;
    key.name = "return";
    key.meta = s.length === 2;
  } else if (
    s ===
      `
` ||
    s ===
      `\x1B
`
  ) {
    key.name = "enter";
    key.meta = s.length === 2;
  } else if (s === "\t" || s === "\x1B\t") {
    key.name = "tab";
    key.meta = s.length === 2;
  } else if (s === "\b" || s === "\x1B\b") {
    key.name = "backspace";
    key.meta = s.charAt(0) === "\x1B";
    if (isBackspaceCtrlBackspaceHere()) key.ctrl = true;
  } else if (s === "\x7F" || s === "\x1B\x7F") {
    key.name = "backspace";
    key.meta = s.charAt(0) === "\x1B";
  } else if (s === "\x1B" || s === "\x1B\x1B") {
    key.name = "escape";
    key.meta = s.length === 2;
  } else if (s === " " || s === "\x1B ") {
    key.name = "space";
    key.meta = s.length === 2;
  } else if (s === "\x1C") {
    key.name = "\\";
    key.ctrl = true;
  } else if (s === "\x1D") {
    key.name = "]";
    key.ctrl = true;
  } else if (s === "\x1E") {
    key.name = "^";
    key.ctrl = true;
  } else if (s === "\x1F") {
    key.name = "_";
    key.ctrl = true;
  } else if (s <= "\x1A" && s.length === 1) {
    key.name = String.fromCharCode(s.charCodeAt(0) + 97 - 1);
    key.ctrl = true;
  } else if (s.length === 1 && s >= "0" && s <= "9") key.name = "number";
  else if (s.length === 1 && s >= "a" && s <= "z") key.name = s;
  else if (s.length === 1 && s >= "A" && s <= "Z") {
    key.name = s.toLowerCase();
    key.shift = true;
  } else if ((metaMatch = META_KEY_CODE_RE.exec(s))) {
    key.meta = true;
    key.shift = /^[A-Z]$/.test(metaMatch[1]);
    key.name = metaMatch[1].toLowerCase();
  } else if ((metaMatch = FN_KEY_RE.exec(s))) {
    let segs = [...s];
    if (segs[0] === "\x1B" && segs[1] === "\x1B") key.option = true;
    let code = [metaMatch[1], metaMatch[2], metaMatch[4], metaMatch[6]].filter(Boolean).join("");
    let modifier = (metaMatch[3] || metaMatch[5] || 1) - 1;
    key.ctrl = !!(modifier & 4);
    key.meta = !!(modifier & 2);
    key.super = !!(modifier & 8);
    key.shift = !!(modifier & 1);
    key.code = code;
    key.name = code === "[P" && modifier === 0 && isStKeyDialect() ? "delete" : keyName[code];
    key.shift = isShiftKey(code) || key.shift;
    key.ctrl = isCtrlKey(code) || key.ctrl;
  }
  if (key.raw === "\x1Bb") {
    key.meta = true;
    key.name = "left";
  } else if (key.raw === "\x1Bf") {
    key.meta = true;
    key.name = "right";
  }
  switch (s) {
    case "\x1B[1~":
      return createNavKey(s, "home", false);
    case "\x1B[4~":
      return createNavKey(s, "end", false);
    case "\x1B[5~":
      return createNavKey(s, "pageup", false);
    case "\x1B[6~":
      return createNavKey(s, "pagedown", false);
    case "\x1B[1;5D":
      return createNavKey(s, "left", true);
    case "\x1B[1;5C":
      return createNavKey(s, "right", true);
  }
  return key;
}
//@ chunk-bzr73sfg.js:143647-143875 callgraph-fingerprint (2.1.88 match: createNavKey, 0.744)
/**
 * 鼠标按钮码是滚轮（64/65）时生成 wheelup/wheeldown 键并带上 ctrl/meta/shift 与坐标；否则返回 null。
 */
function createWheelKey(sequence, buttonCode, col, row) {
  let wheelBits = buttonCode & 67;
  if (wheelBits !== 64 && wheelBits !== 65) return null;
  return {
    kind: "key",
    name: wheelBits === 64 ? "wheelup" : "wheeldown",
    fn: false,
    ctrl: (buttonCode & 16) !== 0,
    meta: (buttonCode & 8) !== 0,
    shift: (buttonCode & 4) !== 0,
    option: false,
    super: false,
    sequence,
    raw: sequence,
    code: undefined,
    col,
    row,
  };
}
//@ chunk-bzr73sfg.js:143875-144020 fingerprint (2.1.88 match: createPasteKey, 0.909)
/**
 * 按给定键名和 ctrl 标志构造 ParsedKey（导航键、无法识别的鼠标序列等用）。
 */
function createNavKey(sequence, name, ctrl) {
  return {
    kind: "key",
    name,
    fn: false,
    ctrl,
    meta: false,
    shift: false,
    option: false,
    super: false,
    sequence,
    raw: sequence,
    code: undefined,
    col: undefined,
    row: undefined,
  };
}
//@ chunk-bzr73sfg.js:243839-243954 fingerprint (2.1.88 match: nonAlphanumericKeys, 0.645)
/**
 * 是粘贴或真正的按键（不是滚轮/鼠标伪键）。
 */
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
