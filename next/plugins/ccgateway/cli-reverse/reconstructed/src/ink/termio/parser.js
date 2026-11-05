/**
 * ink/termio/parser.ts
 *
 * ANSI 文本解析器：识别 CSI/OSC/SGR，带样式硬折行
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/termio/parser.ts
 * pieces: chunk-emhzq435.js (5)
 * attribution: fingerprint 4, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-emhzq435.js:8347-8667 fingerprint (2.1.88 match: segmentGraphemes, 0.708)
/**
 * 把文本切成 {value, width} 字素序列：纯 ASCII 快速路径，否则用 Intl 字素切分并用 Bun.stringWidth 量宽（至少 1）。
 */
function* segmentGraphemes(text) {
  let isAscii = true;
  for (let k = 0; k < text.length; k++)
    if (text.charCodeAt(k) >= 128) {
      isAscii = false;
      break;
    }
  if (isAscii) {
    for (let k = 0; k < text.length; k++)
      yield {
        value: text[k],
        width: 1,
      };
    return;
  }
  for (let { segment } of getGraphemeSegmenter().segment(text)) {
    if (segment.length === 1) {
      let code = segment.charCodeAt(0);
      if (code >= 32 && code < 127) {
        yield {
          value: segment,
          width: 1,
        };
        continue;
      }
    }
    yield {
      value: segment,
      width: Math.max(1, bunStringWidth(segment)),
    };
  }
}
//@ chunk-emhzq435.js:8667-9340 layout
/**
 * DEC 私有模式（光标显示、备用屏、括号粘贴、鼠标跟踪、焦点事件）的 SM/RM 转成语义动作。
 */
function decModeToAction(mode, enabled) {
  switch (mode) {
    case DEC.CURSOR_VISIBLE:
      return {
        type: "cursor",
        action: enabled
          ? {
              type: "show",
            }
          : {
              type: "hide",
            },
      };
    case DEC.ALT_SCREEN_CLEAR:
    case DEC.ALT_SCREEN:
      return {
        type: "mode",
        action: {
          type: "alternateScreen",
          enabled,
        },
      };
    case DEC.BRACKETED_PASTE:
      return {
        type: "mode",
        action: {
          type: "bracketedPaste",
          enabled,
        },
      };
    case DEC.MOUSE_NORMAL:
      return {
        type: "mode",
        action: {
          type: "mouseTracking",
          mode: enabled ? "normal" : "off",
        },
      };
    case DEC.MOUSE_BUTTON:
      return {
        type: "mode",
        action: {
          type: "mouseTracking",
          mode: enabled ? "button" : "off",
        },
      };
    case DEC.MOUSE_ANY:
      return {
        type: "mode",
        action: {
          type: "mouseTracking",
          mode: enabled ? "any" : "off",
        },
      };
    case DEC.FOCUS_EVENTS:
      return {
        type: "mode",
        action: {
          type: "focusEvents",
          enabled,
        },
      };
    default:
      return null;
  }
}
//@ chunk-emhzq435.js:9340-11617 fingerprint (2.1.88 match: parseCSI, 0.731)
/**
 * 解析一个 CSI 序列为语义动作：SGR 单独返回参数串；光标移动/定位、擦除、插删行列、滚动与滚动区域、保存恢复光标、光标形状（DECSCUSR）、DEC 私有模式开关。
 */
function parseCSI(rawSequence) {
  let inner = rawSequence.slice(2);
  if (inner.length === 0) return null;
  let finalByte = inner.charCodeAt(inner.length - 1);
  let beforeFinal = inner.slice(0, -1);
  let privateMode = "";
  let paramStr = beforeFinal;
  let intermediate = "";
  if (beforeFinal.length > 0 && "?>=<".includes(beforeFinal[0])) {
    privateMode = beforeFinal[0];
    paramStr = beforeFinal.slice(1);
  }
  let code = paramStr.charCodeAt(paramStr.length - 1);
  if (paramStr.length > 0 && !(code >= 48 && code <= 59)) {
    let intermediateMatch = paramStr.match(/([^0-9;:]+)$/);
    if (intermediateMatch) {
      intermediate = intermediateMatch[1];
      paramStr = paramStr.slice(0, -intermediate.length);
    }
  }
  if (finalByte === CSI.SGR && privateMode === "")
    return {
      type: "sgr",
      params: paramStr,
    };
  let params =
    paramStr === ""
      ? []
      : paramStr.split(/[;:]/).map((paramPart) => (paramPart === "" ? 0 : parseInt(paramPart, 10)));
  let firstParam = params[0] ?? 1;
  let col = params[1] ?? 1;
  if (finalByte === CSI.CUU)
    return {
      type: "cursor",
      action: {
        type: "move",
        direction: "up",
        count: firstParam,
      },
    };
  if (finalByte === CSI.CUD || finalByte === CSI.VPR)
    return {
      type: "cursor",
      action: {
        type: "move",
        direction: "down",
        count: firstParam,
      },
    };
  if (finalByte === CSI.CUF || finalByte === CSI.HPR)
    return {
      type: "cursor",
      action: {
        type: "move",
        direction: "forward",
        count: firstParam,
      },
    };
  if (finalByte === CSI.CUB)
    return {
      type: "cursor",
      action: {
        type: "move",
        direction: "back",
        count: firstParam,
      },
    };
  if (finalByte === CSI.CNL)
    return {
      type: "cursor",
      action: {
        type: "nextLine",
        count: firstParam,
      },
    };
  if (finalByte === CSI.CPL)
    return {
      type: "cursor",
      action: {
        type: "prevLine",
        count: firstParam,
      },
    };
  if (finalByte === CSI.CHA || finalByte === CSI.HPA)
    return {
      type: "cursor",
      action: {
        type: "column",
        col: firstParam,
      },
    };
  if (finalByte === CSI.CUP || finalByte === CSI.HVP)
    return {
      type: "cursor",
      action: {
        type: "position",
        row: firstParam,
        col,
      },
    };
  if (finalByte === CSI.VPA)
    return {
      type: "cursor",
      action: {
        type: "row",
        row: firstParam,
      },
    };
  if (finalByte === CSI.ED)
    return {
      type: "erase",
      action: {
        type: "display",
        region: ERASE_DISPLAY[params[0] ?? 0] ?? "toEnd",
      },
    };
  if (finalByte === CSI.EL)
    return {
      type: "erase",
      action: {
        type: "line",
        region: ERASE_LINE_REGION[params[0] ?? 0] ?? "toEnd",
      },
    };
  if (finalByte === CSI.ECH)
    return {
      type: "erase",
      action: {
        type: "chars",
        count: firstParam,
      },
    };
  if (finalByte === CSI.IL)
    return {
      type: "edit",
      action: {
        type: "insertLines",
        count: firstParam,
      },
    };
  if (finalByte === CSI.DL)
    return {
      type: "edit",
      action: {
        type: "deleteLines",
        count: firstParam,
      },
    };
  if (finalByte === CSI.ICH)
    return {
      type: "edit",
      action: {
        type: "insertChars",
        count: firstParam,
      },
    };
  if (finalByte === CSI.DCH)
    return {
      type: "edit",
      action: {
        type: "deleteChars",
        count: firstParam,
      },
    };
  if (finalByte === CSI.SU)
    return {
      type: "scroll",
      action: {
        type: "up",
        count: firstParam,
      },
    };
  if (finalByte === CSI.SD)
    return {
      type: "scroll",
      action: {
        type: "down",
        count: firstParam,
      },
    };
  if (finalByte === CSI.DECSTBM)
    return {
      type: "scroll",
      action: {
        type: "setRegion",
        top: firstParam,
        bottom: params[1] ?? 0,
      },
    };
  if (finalByte === CSI.SCOSC)
    return {
      type: "cursor",
      action: {
        type: "save",
      },
    };
  if (finalByte === CSI.SCORC)
    return {
      type: "cursor",
      action: {
        type: "restore",
      },
    };
  if (finalByte === CSI.DECSCUSR && intermediate === " ")
    return {
      type: "cursor",
      action: {
        type: "style",
        ...(CURSOR_STYLES[firstParam] ?? CURSOR_STYLES[0]),
      },
    };
  if (privateMode === "?" && (finalByte === CSI.SM || finalByte === CSI.RM)) {
    let enabled = finalByte === CSI.SM;
    let actions = [];
    for (let param of params) {
      let decModeAction = decModeToAction(param, enabled);
      if (decModeAction) actions.push(decModeAction);
    }
    return actions.length
      ? actions
      : {
          type: "unknown",
          sequence: rawSequence,
        };
  }
  return {
    type: "unknown",
    sequence: rawSequence,
  };
}
//@ chunk-emhzq435.js:11617-11785 fingerprint (2.1.88 match: identifySequence, 0.866)
/**
 * 按第二个字节判断转义序列种类：csi / osc / esc。
 */
function identifySequence(seq) {
  if (seq.length < 2) return "unknown";
  if (seq.charCodeAt(0) !== C0.ESC) return "unknown";
  let second = seq.charCodeAt(1);
  if (second === 91) return "csi";
  if (second === 93) return "osc";
  return "esc";
}
//@ chunk-emhzq435.js:11785-13982 fingerprint (2.1.88 match: Parser, 0.769)
/**
 * 终端输出语义解析器（Ansi 组件、测试与录屏用）：分词后把文本切成带当前样式的字素段、BEL 单独成动作；SGR 更新内部样式；OSC 8 维护当前链接；forOutput 模式下保留可能被后续字节续上的尾部字素（ZWJ、区域旗帜、代理对）。
 */
class Parser {
  tokenizer;
  forOutput;
  tail = "";
  constructor(options) {
    this.forOutput = options?.forOutput ?? false;
    this.tokenizer = createTokenizer({
      stringsEndAtLineFeed: options?.stringsEndAtLineFeed,
      intermediatesRunToFinal: this.forOutput,
    });
  }
  style = defaultStyle();
  inLink = false;
  linkUrl;
  flush() {
    if (!this.tail) return [];
    let pending = this.processText(this.tail, false);
    this.tail = "";
    return pending;
  }
  reset() {
    this.tail = "";
    this.tokenizer.reset();
    this.style = defaultStyle();
    this.inLink = false;
    this.linkUrl = undefined;
  }
  feed(input) {
    let tokens = this.tokenizer.feed(input);
    let out = [];
    for (let k = 0; k < tokens.length; k++) {
      let token = tokens[k];
      if (token.type === "text") {
        let text = this.tail + token.value;
        this.tail = "";
        let isLastToken = this.forOutput && k === tokens.length - 1;
        out.push(...this.processText(text, isLastToken));
      } else {
        if (this.tail) {
          out.push(...this.processText(this.tail, false));
          this.tail = "";
        }
        out.push(...this.processSequence(token.value));
      }
    }
    return out;
  }
  processText(text, isLast) {
    let style = this.style;
    if (text.indexOf("\x07") === -1) {
      let graphemes = [...segmentGraphemes(text)];
      this.holdTail(graphemes, isLast);
      return graphemes.length > 0
        ? [
            {
              type: "text",
              graphemes,
              style,
            },
          ]
        : [];
    }
    let out = [];
    for (let chunk of text.split("\x07")) {
      if (chunk) {
        let graphemes = [...segmentGraphemes(chunk)];
        if (graphemes.length > 0)
          out.push({
            type: "text",
            graphemes,
            style,
          });
      }
      out.push({
        type: "bell",
      });
    }
    out.pop();
    let last = out.at(-1);
    if (last?.type === "text") {
      this.holdTail(last.graphemes, isLast);
      if (last.graphemes.length === 0) out.pop();
    }
    return out;
  }
  holdTail(tokens, hold) {
    if (!hold || tokens.length === 0) return;
    let last = tokens.at(-1);
    let code = last.value.charCodeAt(last.value.length - 1);
    if (code < 32) return;
    this.tail = last.value;
    tokens.pop();
    if (code >= 55296 && code <= 56319 && tokens.length > 0) this.tail = tokens.pop().value + this.tail;
    while (tokens.length > 0 && this.tail.length <= 64) {
      let lastToken = tokens.at(-1).value;
      let code = lastToken.charCodeAt(lastToken.length - 1);
      let codePoint = code >= 56320 && code <= 57343 ? lastToken.codePointAt(lastToken.length - 2) : code;
      if (codePoint === 8205 || (codePoint !== undefined && codePoint >= 127462 && codePoint <= 127487)) {
        this.tail = lastToken + this.tail;
        tokens.pop();
      } else break;
    }
  }
  processSequence(seq) {
    switch (identifySequence(seq)) {
      case "csi": {
        let action = parseCSI(seq);
        if (!action) return [];
        if (Array.isArray(action)) return action;
        if (action.type === "sgr") {
          this.style = applySGR(action.params, this.style);
          return [];
        }
        return [action];
      }
      case "osc": {
        let content = seq.slice(2);
        if (content.endsWith("\x07")) content = content.slice(0, -1);
        else if (content.endsWith("\x1B\\")) content = content.slice(0, -2);
        let action = parseOSC(content);
        if (action) {
          if (action.type === "link")
            if (action.action.type === "start") {
              this.inLink = true;
              this.linkUrl = action.action.url;
            } else {
              this.inLink = false;
              this.linkUrl = undefined;
            }
          return [action];
        }
        return [];
      }
      case "esc": {
        let escContent = seq.slice(1);
        let action = parseEsc(escContent);
        if (action?.type === "reset") {
          this.style = defaultStyle();
          this.inLink = false;
          this.linkUrl = undefined;
        }
        return action ? [action] : [];
      }
      default:
        return [
          {
            type: "unknown",
            sequence: seq,
          },
        ];
    }
  }
}
export { Parser };
