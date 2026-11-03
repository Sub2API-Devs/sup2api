/**
 * ink/termio/tokenize.ts
 *
 * 输入流分词器：把 stdin 字节切成按键/转义序列/鼠标/粘贴等 token，处理跨块的不完整序列
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/termio/tokenize.ts
 * pieces: chunk-tw8fk0yz.js (4), chunk-wz6vk74d.js (1)
 * attribution: affinity 1, fingerprint 2, layout 1, placement 1
 */
import { C0, ESC_TYPE } from "./ansi.js";
import { isCompleteEscapeSequence } from "../wrapAnsi.js";
import { isCSIIntermediate, isCSIFinal, isCSIParam } from "./csi.js";

//@ chunk-tw8fk0yz.js:441-605 affinity
var X10_MOUSE_PREFIX_RE = /^\[M[\x60-\x7f][\x20-\uffff]?$/;
var OSC8_PREFIX_RE = /^\x1b\]8(?:;|\r?$)/;
var OSC8_CLOSE = "\x1B]8;;\x1B\\";
var ESC_PREFIXED_KEY_RE = /^(?:\[(?:\d{1,2}(?:;\d{1,2})?[~^$@]|(?:1;\d{1,2})?[A-DFHa-d])|O[A-DFHa-d])/;
//@ chunk-tw8fk0yz.js:605-986 fingerprint = createTokenizer (0.8)
/**
 * 创建流式转义序列分词器：feed() 返回文本/序列 token，未结束的序列留在内部缓冲；flush() 把缓冲按当前状态吐出；选项：x10Mouse（输入时识别 ESC[M 三字节鼠标）、escPrefixedKeyIsAlt（rxvt 风格 ESC+键）、stringsEndAtLineFeed（输出解析时 OSC 遇换行结束）、intermediatesRunToFinal。
 */
function createTokenizer(options) {
  let currentState = "ground";
  let currentBuffer = "";
  let x10Mouse = options?.x10Mouse ?? false;
  let escPrefixedKeyIsAlt = options?.escPrefixedKeyIsAlt;
  let stringsEndAtLineFeed = options?.stringsEndAtLineFeed ?? false;
  let intermediatesRunToFinal = options?.intermediatesRunToFinal ?? false;
  return {
    feed(input) {
      let result = tokenize(
        input,
        currentState,
        currentBuffer,
        false,
        x10Mouse,
        escPrefixedKeyIsAlt?.() ?? false,
        stringsEndAtLineFeed,
        intermediatesRunToFinal,
      );
      currentState = result.state.state;
      currentBuffer = result.state.buffer;
      return result.tokens;
    },
    flush() {
      let result = tokenize(
        "",
        currentState,
        currentBuffer,
        true,
        x10Mouse,
        escPrefixedKeyIsAlt?.() ?? false,
        stringsEndAtLineFeed,
        intermediatesRunToFinal,
      );
      currentState = result.state.state;
      currentBuffer = result.state.buffer;
      return result.tokens;
    },
    reset() {
      currentState = "ground";
      currentBuffer = "";
    },
    buffer() {
      return currentBuffer;
    },
  };
}
//@ chunk-tw8fk0yz.js:986-1056 layout
function tokenizeAll(text) {
  let tokenizer = createTokenizer();
  let s = tokenizer.feed(text);
  s.push(...tokenizer.flush());
  return s;
}
//@ chunk-tw8fk0yz.js:1056-3673 fingerprint = tokenize (0.834)
/**
 * 分词状态机（ground / escape / escapeIntermediate / csi / ss3 / osc / dcs / apc / pm / sos）：识别 CSI、OSC/DCS/APC（BEL 或 ST 结束，CAN/SUB 中止）、SS3、单字符 ESC 序列；输入模式下还处理 X10 鼠标、ESC+空白/回车当 Alt、单独的 DEL 与控制字符成为独立文本 token。返回 tokens 与新状态。
 */
function tokenize(
  input,
  initialState,
  initialBuffer,
  flush,
  t,
  u,
  stringsEndAtLineFeed,
  intermediatesRunToFinal,
) {
  let tokens = [];
  let result = {
    state: initialState,
    buffer: "",
  };
  let data = initialBuffer + input;
  let i = 0;
  let textStart = 0;
  let seqStart = 0;
  let flushText = () => {
    if (i > textStart) {
      let text = data.slice(textStart, i);
      if (text)
        tokens.push({
          type: "text",
          value: text,
        });
    }
    textStart = i;
  };
  let emitSequence = (seq) => {
    if (seq)
      tokens.push({
        type: "sequence",
        value: seq,
      });
    result.state = "ground";
    textStart = i;
  };
  while (i < data.length) {
    let code = data.charCodeAt(i);
    switch (result.state) {
      case "ground":
        if (code === C0.ESC) {
          flushText();
          seqStart = i;
          result.state = "escape";
          i++;
        } else if (code === C0.DEL) {
          if (X10_MOUSE_PREFIX_RE.test(data.slice(textStart, i))) i++;
          else {
            flushText();
            i++;
            tokens.push({
              type: "text",
              value: "\x7F",
            });
            textStart = i;
          }
        } else if (t && code < 32 && (data.length < 64 || code === C0.BS)) {
          flushText();
          i++;
          if (code === 13 && data.charCodeAt(i) === 10) i++;
          tokens.push({
            type: "text",
            value: String.fromCharCode(code),
          });
          textStart = i;
        } else i++;
        break;
      case "escape":
        if (code === ESC_TYPE.CSI) {
          result.state = "csi";
          i++;
        } else if (code === ESC_TYPE.OSC) {
          result.state = "osc";
          i++;
        } else if (code === ESC_TYPE.DCS) {
          result.state = "dcs";
          i++;
        } else if (
          code === ESC_TYPE.APC &&
          (!t || i + 1 >= data.length || isCompleteEscapeSequence(data, i + 1, i + 1))
        ) {
          result.state = "apc";
          i++;
        } else if (!t && code === ESC_TYPE.PM) {
          result.state = "pm";
          i++;
        } else if (!t && (code === ESC_TYPE.SOS || code === 107)) {
          result.state = "sos";
          i++;
        } else if (t && code === 79) {
          result.state = "ss3";
          i++;
        } else if (t && (code === 32 || code === 13 || code === 10 || code === 9)) {
          i++;
          tokens.push({
            type: "text",
            value: data.slice(seqStart, i),
          });
          result.state = "ground";
          textStart = i;
        } else if (t && isCSIIntermediate(code)) {
          tokens.push({
            type: "text",
            value: data.slice(seqStart, i),
          });
          result.state = "ground";
          textStart = i;
        } else if (isCSIIntermediate(code)) {
          result.state = "escapeIntermediate";
          i++;
        } else if (code === C0.DEL) {
          i++;
          tokens.push({
            type: "text",
            value: data.slice(seqStart, i),
          });
          result.state = "ground";
          textStart = i;
        } else if (isPrintableAscii(code)) {
          i++;
          emitSequence(data.slice(seqStart, i));
        } else if (
          code === C0.ESC &&
          u &&
          i === seqStart + 1 &&
          ESC_PREFIXED_KEY_RE.test(data.slice(i + 1, i + 1 + 8))
        )
          i++;
        else if (code === C0.ESC) {
          emitSequence(data.slice(seqStart, i));
          seqStart = i;
          result.state = "escape";
          i++;
        } else if (code < 32) {
          i++;
          tokens.push({
            type: "text",
            value: data.slice(seqStart, i),
          });
          result.state = "ground";
          textStart = i;
        } else {
          result.state = "ground";
          textStart = seqStart;
        }
        break;
      case "escapeIntermediate":
        if (intermediatesRunToFinal && isCSIIntermediate(code)) i++;
        else if (isCSIIntermediate(code) || isPrintableAscii(code)) {
          i++;
          emitSequence(data.slice(seqStart, i));
        } else {
          result.state = "ground";
          textStart = seqStart;
        }
        break;
      case "csi":
        if (
          t &&
          code === 77 &&
          i - seqStart === 2 &&
          (i + 1 >= data.length || data.charCodeAt(i + 1) >= 32) &&
          (i + 2 >= data.length || data.charCodeAt(i + 2) >= 32) &&
          (i + 3 >= data.length || data.charCodeAt(i + 3) >= 32)
        ) {
          if (i + 4 <= data.length) {
            i += 4;
            emitSequence(data.slice(seqStart, i));
          } else i = data.length;
          break;
        }
        if (isCSIFinal(code)) {
          i++;
          emitSequence(data.slice(seqStart, i));
        } else if (isCSIParam(code) || isCSIIntermediate(code)) i++;
        else {
          result.state = "ground";
          textStart = seqStart;
        }
        break;
      case "ss3":
        if (code >= 64 && code <= 126) {
          i++;
          emitSequence(data.slice(seqStart, i));
        } else {
          result.state = "ground";
          textStart = seqStart;
        }
        break;
      case "osc":
      case "dcs":
      case "apc":
      case "pm":
      case "sos":
        if (
          t &&
          result.state === "apc" &&
          i >= seqStart + 2 &&
          !isCompleteEscapeSequence(data, seqStart + 2, i)
        ) {
          emitSequence(data.slice(seqStart, seqStart + 2));
          textStart = seqStart + 2;
        } else if (code === C0.BEL && result.state !== "pm" && result.state !== "sos") {
          i++;
          emitSequence(data.slice(seqStart, i));
        } else if (code === C0.ESC && i + 1 < data.length) {
          if (data.charCodeAt(i + 1) === ESC_TYPE.ST) {
            i += 2;
            emitSequence(data.slice(seqStart, i));
          } else {
            emitSequence(data.slice(seqStart, i));
            seqStart = i;
            result.state = "escape";
            i++;
          }
        } else if (code === C0.CAN || code === C0.SUB) {
          i++;
          emitSequence(data.slice(seqStart, i));
        } else if (stringsEndAtLineFeed && code === C0.LF)
          emitSequence(
            OSC8_PREFIX_RE.test(data.slice(seqStart, Math.min(i, seqStart + 5))) ? OSC8_CLOSE : "",
          );
        else i++;
        break;
    }
  }
  if (result.state === "ground") flushText();
  else if (flush) {
    let remaining = data.slice(seqStart);
    if (remaining)
      tokens.push({
        type: "sequence",
        value: remaining,
      });
    result.state = "ground";
  } else result.buffer = data.slice(seqStart);
  return {
    tokens,
    state: result,
  };
}
//@ chunk-wz6vk74d.js:507-544 placement
/**
 * 判断码点是否在可打印 ASCII 区间（48–126）。
 */
function isPrintableAscii(code) {
  return code >= 48 && code <= 126;
}
export { createTokenizer, tokenizeAll };
