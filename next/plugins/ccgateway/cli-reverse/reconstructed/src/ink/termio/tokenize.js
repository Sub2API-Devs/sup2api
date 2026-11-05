/**
 * ink/termio/tokenize.ts
 *
 * 输入流分词器：把 stdin 字节切成按键/转义序列/鼠标/粘贴等 token，处理跨块的不完整序列
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/termio/tokenize.ts
 * pieces: chunk-3zb8bxyj.js (1), chunk-8n1fbght.js (4)
 * attribution: placement 1, affinity 1, fingerprint 2, layout 1
 */
import { C0, ESC_TYPE } from "./ansi.js";
import { isCompleteEscapeSequence } from "../wrapAnsi.js";
import { isCSIIntermediate, isCSIFinal, isCSIParam } from "./csi.js";

//@ chunk-3zb8bxyj.js:508-545 placement
/**
 * 判断码点是否在可打印 ASCII 区间（48–126）。
 */
function isPrintableAscii(code) {
  return code >= 48 && code <= 126;
}
//@ chunk-8n1fbght.js:442-606 affinity
var X10_MOUSE_PREFIX_RE = /^\[M[\x60-\x7f][\x20-\uffff]?$/;
var OSC8_PREFIX_RE = /^\x1b\]8(?:;|\r?$)/;
var OSC8_CLOSE = "\x1B]8;;\x1B\\";
var ESC_PREFIXED_KEY_RE = /^(?:\[(?:\d{1,2}(?:;\d{1,2})?[~^$@]|(?:1;\d{1,2})?[A-DFHa-d])|O[A-DFHa-d])/;
//@ chunk-8n1fbght.js:606-987 fingerprint (2.1.88 match: createTokenizer, 0.8)
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
//@ chunk-8n1fbght.js:987-1057 layout
function tokenizeAll(text) {
  let tokenizer = createTokenizer();
  let tokens = tokenizer.feed(text);
  tokens.push(...tokenizer.flush());
  return tokens;
}
//@ chunk-8n1fbght.js:1057-3685 fingerprint (2.1.88 match: tokenize, 0.834)
/**
 * 分词状态机（ground / escape / escapeIntermediate / csi / ss3 / osc / dcs / apc / pm / sos）：识别 CSI、OSC/DCS/APC（BEL 或 ST 结束，CAN/SUB 中止）、SS3、单字符 ESC 序列；输入模式下还处理 X10 鼠标、ESC+空白/回车当 Alt、单独的 DEL 与控制字符成为独立文本 token。返回 tokens 与新状态。
 */
function tokenize(
  input,
  initialState,
  initialBuffer,
  flush,
  forOutput,
  allowC0Controls,
  stringsEndAtLineFeed,
  intermediatesRunToFinal,
) {
  let tokens = [];
  let result = {
    state: initialState,
    buffer: "",
  };
  let data = initialBuffer + input;
  let index = 0;
  let textStart = 0;
  let seqStart = 0;
  let flushText = () => {
    if (index > textStart) {
      let text = data.slice(textStart, index);
      if (text)
        tokens.push({
          type: "text",
          value: text,
        });
    }
    textStart = index;
  };
  let emitSequence = (seq) => {
    if (seq)
      tokens.push({
        type: "sequence",
        value: seq,
      });
    result.state = "ground";
    textStart = index;
  };
  while (index < data.length) {
    let code = data.charCodeAt(index);
    switch (result.state) {
      case "ground":
        if (code === C0.ESC) {
          flushText();
          seqStart = index;
          result.state = "escape";
          index++;
        } else if (code === C0.DEL) {
          if (X10_MOUSE_PREFIX_RE.test(data.slice(textStart, index))) index++;
          else {
            flushText();
            index++;
            tokens.push({
              type: "text",
              value: "\x7F",
            });
            textStart = index;
          }
        } else if (forOutput && code < 32 && (data.length < 64 || code === C0.BS)) {
          flushText();
          index++;
          if (code === 13 && data.charCodeAt(index) === 10) index++;
          tokens.push({
            type: "text",
            value: String.fromCharCode(code),
          });
          textStart = index;
        } else index++;
        break;
      case "escape":
        if (code === ESC_TYPE.CSI) {
          result.state = "csi";
          index++;
        } else if (code === ESC_TYPE.OSC) {
          result.state = "osc";
          index++;
        } else if (code === ESC_TYPE.DCS) {
          result.state = "dcs";
          index++;
        } else if (
          code === ESC_TYPE.APC &&
          (!forOutput || index + 1 >= data.length || isCompleteEscapeSequence(data, index + 1, index + 1))
        ) {
          result.state = "apc";
          index++;
        } else if (!forOutput && code === ESC_TYPE.PM) {
          result.state = "pm";
          index++;
        } else if (!forOutput && (code === ESC_TYPE.SOS || code === 107)) {
          result.state = "sos";
          index++;
        } else if (forOutput && code === 79) {
          result.state = "ss3";
          index++;
        } else if (forOutput && (code === 32 || code === 13 || code === 10 || code === 9)) {
          index++;
          tokens.push({
            type: "text",
            value: data.slice(seqStart, index),
          });
          result.state = "ground";
          textStart = index;
        } else if (forOutput && isCSIIntermediate(code)) {
          tokens.push({
            type: "text",
            value: data.slice(seqStart, index),
          });
          result.state = "ground";
          textStart = index;
        } else if (isCSIIntermediate(code)) {
          result.state = "escapeIntermediate";
          index++;
        } else if (code === C0.DEL) {
          index++;
          tokens.push({
            type: "text",
            value: data.slice(seqStart, index),
          });
          result.state = "ground";
          textStart = index;
        } else if (isPrintableAscii(code)) {
          index++;
          emitSequence(data.slice(seqStart, index));
        } else if (
          code === C0.ESC &&
          allowC0Controls &&
          index === seqStart + 1 &&
          ESC_PREFIXED_KEY_RE.test(data.slice(index + 1, index + 1 + 8))
        )
          index++;
        else if (code === C0.ESC) {
          emitSequence(data.slice(seqStart, index));
          seqStart = index;
          result.state = "escape";
          index++;
        } else if (code < 32) {
          index++;
          tokens.push({
            type: "text",
            value: data.slice(seqStart, index),
          });
          result.state = "ground";
          textStart = index;
        } else {
          result.state = "ground";
          textStart = seqStart;
        }
        break;
      case "escapeIntermediate":
        if (intermediatesRunToFinal && isCSIIntermediate(code)) index++;
        else if (isCSIIntermediate(code) || isPrintableAscii(code)) {
          index++;
          emitSequence(data.slice(seqStart, index));
        } else {
          result.state = "ground";
          textStart = seqStart;
        }
        break;
      case "csi":
        if (
          forOutput &&
          code === 77 &&
          index - seqStart === 2 &&
          (index + 1 >= data.length || data.charCodeAt(index + 1) >= 32) &&
          (index + 2 >= data.length || data.charCodeAt(index + 2) >= 32) &&
          (index + 3 >= data.length || data.charCodeAt(index + 3) >= 32)
        ) {
          if (index + 4 <= data.length) {
            index += 4;
            emitSequence(data.slice(seqStart, index));
          } else index = data.length;
          break;
        }
        if (isCSIFinal(code)) {
          index++;
          emitSequence(data.slice(seqStart, index));
        } else if (isCSIParam(code) || isCSIIntermediate(code)) index++;
        else {
          result.state = "ground";
          textStart = seqStart;
        }
        break;
      case "ss3":
        if (code >= 64 && code <= 126) {
          index++;
          emitSequence(data.slice(seqStart, index));
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
          forOutput &&
          result.state === "apc" &&
          index >= seqStart + 2 &&
          !isCompleteEscapeSequence(data, seqStart + 2, index)
        ) {
          emitSequence(data.slice(seqStart, seqStart + 2));
          textStart = seqStart + 2;
        } else if (code === C0.BEL && result.state !== "pm" && result.state !== "sos") {
          index++;
          emitSequence(data.slice(seqStart, index));
        } else if (code === C0.ESC && index + 1 < data.length) {
          if (data.charCodeAt(index + 1) === ESC_TYPE.ST) {
            index += 2;
            emitSequence(data.slice(seqStart, index));
          } else {
            emitSequence(data.slice(seqStart, index));
            seqStart = index;
            result.state = "escape";
            index++;
          }
        } else if (code === C0.CAN || code === C0.SUB) {
          index++;
          emitSequence(data.slice(seqStart, index));
        } else if (stringsEndAtLineFeed && code === C0.LF)
          emitSequence(
            OSC8_PREFIX_RE.test(data.slice(seqStart, Math.min(index, seqStart + 5))) ? OSC8_CLOSE : "",
          );
        else index++;
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
export { createTokenizer, tokenizeAll };
