/**
 * ink/wrapAnsi.ts
 *
 * 沿用旧版路径：ANSI 文本换行。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/wrapAnsi.ts
 * pieces: chunk-8n1fbght.js (32)
 * attribution: placement 32
 */
import { C0 } from "./termio/ansi.js";
import { bunStringWidth } from "./stringWidth.js";
import { createTokenizer, tokenizeAll } from "./termio/tokenize.js";
import { stripAnsi } from "../utils/stripAnsi.js";
import { getGraphemeSegmenter } from "../utils/intl.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-8n1fbght.js:3685-4004 placement
/**
 * 判断一段转义序列是否已结束（按 ESC 后的引导字符与终止字符）。
 */
function isCompleteEscapeSequence(text, start, end) {
  let lastChar = text[end];
  let length = end - start;
  if (length === 0) return lastChar === "G";
  if (length === 1) return lastChar === "i" || lastChar === "O" || lastChar === "E";
  let kindChar = text[start + 1];
  if (kindChar === "i") return length > 2 || lastChar === "=";
  let code = text.charCodeAt(end);
  let isTerminator = code === C0.ESC || code === C0.BEL;
  if (kindChar === "O") return length === 2 ? lastChar === "K" : isTerminator;
  let index = text.indexOf(":", start + 3);
  if (index !== -1 && index < end) return true;
  return (lastChar >= "A" && lastChar <= "Z") || (length > 2 && (lastChar === ":" || isTerminator));
}
//@ chunk-8n1fbght.js:4004-4151 placement
/**
 * 换行相关常量与正则：制表宽度、制表/换行、ESC/CSI、C1 控制字符、DCS/OSC 等字符串序列。
 */
var DEFAULT_TAB_WIDTH = 8;
var TAB_OR_NEWLINE_RE = /(\t|\n)/;
var ESC_OR_CSI_RE = /[\x1b\x9b]/g;
var C1_STRING_START_RE = /[\x90\x98\x9d-\x9f]/g;
var CONTROL_INTRODUCER_RE = /[\x1b\x90\x98\x9b\x9d-\x9f]/;
var STRING_SEQUENCE_START_RE = /^\x1b[P\]X^_k]/;
var TERMINATED_STRING_SEQUENCE_RE = /^\x1b[P_].*\x07$|\x9c/s;
//@ chunk-8n1fbght.js:4151-4229 placement
/**
 * 若文本含制表符或可展开控制字符，按列位置展开为空格（跳过转义序列）。
 */
function expandTabsInText(text, tabWidth = DEFAULT_TAB_WIDTH) {
  return text.includes("\t") || hasExpandableControls([text]) ? expandTabs([text], tabWidth).join("") : text;
}
//@ chunk-8n1fbght.js:4229-4632 placement (2.1.88 match: Newline, 0.7)
/**
 * 把每段文本中的制表符按列位置展开为空格（跨段累计列位置，跳过转义序列）。
 */
function expandTabs(texts, tabWidth = DEFAULT_TAB_WIDTH) {
  let column = 0;
  let pendingPlain = "";
  return texts.map((text, index) => {
    if (!hasControlSequences(text) && !text.includes("\t")) {
      let lastNewline =
        text.lastIndexOf(`
`) + 1;
      if (lastNewline > 0) {
        column = 0;
        pendingPlain = "";
      }
      pendingPlain += lastNewline > 0 ? text.slice(lastNewline) : text;
      return text;
    }
    let out = "";
    for (let token of tokenizeForTabs(text, index === texts.length - 1)) {
      let plain = neutralizeStringSequence(token);
      if (plain === undefined) {
        out += token.value;
        pendingPlain += token.value;
        continue;
      }
      for (let part of plain.split(TAB_OR_NEWLINE_RE))
        if (part === "\t") {
          column += bunStringWidth(pendingPlain);
          let spaces = tabWidth - (column % tabWidth);
          out += " ".repeat(spaces);
          column += spaces;
          pendingPlain = "";
        } else if (
          part ===
          `
`
        ) {
          out += part;
          column = 0;
          pendingPlain = "";
        } else {
          out += part;
          pendingPlain += part;
        }
    }
    return out;
  });
}
//@ chunk-8n1fbght.js:4632-4666 placement
/**
 * 判断文本是否含需要中和的 ESC/C1 控制序列。
 */
function hasControlSequences(text) {
  return CONTROL_INTRODUCER_RE.test(text);
}
//@ chunk-8n1fbght.js:4666-4771 placement
/**
 * 文本中是否有需要中和的控制序列。
 */
function hasExpandableControls(texts) {
  return texts.some(
    (text, index) =>
      hasControlSequences(text) &&
      tokenizeForTabs(text, index === texts.length - 1).some(
        (token) => (neutralizeStringSequence(token) ?? token.value) !== token.value,
      ),
  );
}
//@ chunk-8n1fbght.js:4771-5046 placement
/**
 * 用 termio 分词器切分文本；末段未完结的序列按是否最后一段决定当序列还是文本。
 */
function tokenizeForTabs(text, isLast) {
  if (!hasControlSequences(text))
    return [
      {
        type: "text",
        value: text,
      },
    ];
  let tokenizer = createTokenizer();
  let tokens = tokenizer.feed(text);
  for (let [index, token] of tokens.entries())
    if (token.type === "sequence" && token.value === "\x1B")
      tokens[index] = {
        type: "text",
        value: token.value,
      };
  let buffered = tokenizer.buffer();
  if (buffered !== "")
    tokens.push({
      type: isLast && !STRING_SEQUENCE_START_RE.test(buffered) ? "sequence" : "text",
      value: buffered,
    });
  return tokens;
}
//@ chunk-8n1fbght.js:5046-5258 placement
/**
 * 文本或含换行/不完整的字符串序列中，把 ESC/CSI 换成 CAN 使其失效；普通序列返回 undefined。
 */
function neutralizeStringSequence(token) {
  if (
    token.type === "text" ||
    token.value.includes(`
`) ||
    TERMINATED_STRING_SEQUENCE_RE.test(token.value)
  )
    return neutralizeC1Starts(token.value.replace(ESC_OR_CSI_RE, "\x18"));
  if (token.value.startsWith("\x1Bk"))
    return neutralizeC1Starts(`\x18${token.value.slice(2).replace(/\x9b/g, "\x18")}`);
  return;
}
//@ chunk-8n1fbght.js:5258-5303 placement
/**
 * 把 C1 字符串起始符替换为替换字符
 */
function neutralizeC1Starts(text) {
  return text.replace(C1_STRING_START_RE, "\uFFFD");
}
//@ chunk-8n1fbght.js:5303-5338 placement
/**
 * 按给定的附加参数字符生成 `\x1b[...m` 的 SGR 正则片段。
 */
var sgrPatternSource = (extraChars) => `\\x1b\\[[0-9${extraChars}]*m`;
//@ chunk-8n1fbght.js:5338-5494 placement
/**
 * 换行功能的特性读取器与锁存登记（返回旧值）。
 */
class WrapFeatureRegistry {
  reader = null;
  latches = null;
  registerReader(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
  registerLatches(latches) {
    let latches_2 = this.latches;
    this.latches = latches;
    return latches_2;
  }
}
//@ chunk-8n1fbght.js:5494-5507 placement
/**
 * 换行特性读取器与锁存登记表
 */
var wrapFeatureRegistry; // deferred: uses WrapFeatureRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-8n1fbght.js:5494", () => {
  wrapFeatureRegistry = new WrapFeatureRegistry();
});
//@ chunk-8n1fbght.js:5507-5550 placement
/**
 * 登记换行用的特性读取器（供 wrapAnsi 判断是否可换行）。
 */
function registerWrapFeatureReader(reader) {
  return wrapFeatureRegistry.registerReader(reader);
}
//@ chunk-8n1fbght.js:5550-5594 placement
/**
 * 登记换行用的锁存读取（一次性取值后缓存）。
 */
function registerWrapFeatureLatches(getSessionFeatureValues) {
  return wrapFeatureRegistry.registerLatches(getSessionFeatureValues);
}
//@ chunk-8n1fbght.js:5594-5857 placement
/**
 * 读 tengu_frolicking_nest 决定是否启用硬换行适配（锁存一次，读取失败默认开启）。
 */
function isWrapFitEnabled() {
  let latched;
  let flag;
  try {
    let { reader, latches } = wrapFeatureRegistry;
    if (!reader || !latches) return true;
    latched = latches();
    if (latched.wrapFitEnabled !== undefined) return latched.wrapFitEnabled;
    flag = reader("tengu_frolicking_nest", true);
  } catch {
    return true;
  }
  if (flag.source !== "payload" || !flag.defaultHost) return true;
  return (latched.wrapFitEnabled = flag.value !== false);
}
//@ chunk-8n1fbght.js:5857-6201 placement
/**
 * 换行实现用的一批正则与常量：SGR、超链接 OSC、复位码、颜色码、前景/背景槽位，以及 SGR 编号到槽位的映射。
 */
var regExp; // deferred: uses sgrPatternSource of its import cycle while loading; runs once the cycle is complete
var HYPERLINK_OSC_RE;
var regExp_2;
var SGR_RESET_CODES;
var SGR_COLOR_RE;
var FG_COLOR_SLOT;
var BG_COLOR_SLOT;
var SGR_SLOT_MAP;
deferInit("chunk-8n1fbght.js:5857", () => {
  regExp = new RegExp(sgrPatternSource(";:"), "g");
  HYPERLINK_OSC_RE = /\x1b\]8;[^\x07\x1b]*(?:\x07|\x1b\\)/y;
  regExp_2 = new RegExp(`\\r((?:${sgrPatternSource(";:")})+)\\n`, "g");
  SGR_RESET_CODES = [22, 22, 23, 23, 24, 25, 27, 28, 29, 39, 49, 54, 55, 75];
  SGR_COLOR_RE = /^\x1b\[[34]8;(?:5;\d+|2;\d+;\d+;\d+)m$/;
  FG_COLOR_SLOT = 9;
  BG_COLOR_SLOT = 10;
  SGR_SLOT_MAP = new Map([
    [1, 0],
    [2, 1],
    [3, 2],
    [20, 3],
    [4, 4],
    [21, 4],
    [5, 5],
    [6, 5],
    [7, 6],
    [8, 7],
    [9, 8],
    [51, 11],
    [52, 11],
    [53, 12],
    [73, 13],
    [74, 13],
  ]);
});
//@ chunk-8n1fbght.js:6201-8090 placement
function wrapAnsi(text, width, wrapOptions) {
  if (!(width > 0)) return text;
  if (!text.includes("\x1B[")) return wrapAnsiLine(text, width, wrapOptions);
  let text_2 = text.replace(regExp, "");
  if (text_2.length < text.length && text_2.includes("\x1B") && stripAnsi(text_2) !== stripAnsi(text))
    return wrapAnsiLine(
      text.replace(
        regExp_2,
        `$1\r
`,
      ),
      width,
      wrapOptions,
    );
  let wrappedPlain = wrapAnsiLine(text_2, width, wrapOptions);
  if (
    wrappedPlain === text_2 &&
    !wrappedPlain.includes(`
`)
  )
    return text;
  let match = text.match(regExp);
  if (match === null) return wrappedPlain;
  let parts = text.split(regExp);
  let sequenceEnds = [];
  for (let idx = 0, cumulative = 0; idx < match.length; idx++)
    sequenceEnds.push((cumulative += parts[idx].length));
  let sgrState = emptySgrState();
  let outParts = [];
  let nextSequenceIndex = 0;
  let appliedSequenceIndex = 0;
  let restorePrefix = "";
  let activePrefix = "";
  let needsRestore = true;
  let atLineStart = false;
  let isAligned = true;
  let sourceCursor = 0;
  let emittedUntil = 0;
  let wrappedCursor = 0;
  let nextNewlineAt = -1;
  let nextWrappedEscapeAt = -1;
  let nextSourceEscapeAt = -1;
  let wrappedPositions = [];
  let wrappedCodes = [];
  let wrappedMatches = [];
  let sourcePositions = [];
  let sourceCodes = [];
  let sourceToWrapped = [];
  let wrappedToSource = [];
  for (;;) {
    let sourceSequenceCount = scanLeadingControls(text_2, sourceCursor, sourcePositions, sourceCodes);
    let wrappedSequenceCount = scanLeadingControls(
      wrappedPlain,
      wrappedCursor,
      wrappedPositions,
      wrappedCodes,
    );
    let sourceCodeAt = sourcePositions[sourceSequenceCount];
    let wrappedCodeAt = wrappedPositions[wrappedSequenceCount];
    for (let idx = 0; idx < sourceSequenceCount; idx++) sourceToWrapped[idx] = -1;
    let remainingSourceSeq = sourceSequenceCount - 1;
    let matchCount = 0;
    for (let idx = wrappedSequenceCount - 1; idx >= -1 && isAligned; idx--) {
      let wrappedCode = idx < 0 ? -1 : wrappedCodes[idx];
      if (wrappedCode === 10 || typeof wrappedCode === "string") {
        wrappedMatches[matchCount++] = idx;
        continue;
      }
      let candidateSourceSeq = remainingSourceSeq;
      while (candidateSourceSeq >= 0 && sourceCodes[candidateSourceSeq] !== wrappedCode) candidateSourceSeq--;
      isAligned = idx < 0 || candidateSourceSeq >= 0;
      for (let nextSearch = 0; remainingSourceSeq > candidateSourceSeq; remainingSourceSeq--) {
        let sourceCode = sourceCodes[remainingSourceSeq];
        let searchPos = sourceCode === 10 || typeof sourceCode === "string" ? nextSearch : matchCount;
        while (searchPos < matchCount && wrappedCodes[wrappedMatches[searchPos]] !== sourceCode) searchPos++;
        if (searchPos < matchCount) {
          sourceToWrapped[remainingSourceSeq] = wrappedMatches[searchPos];
          nextSearch = searchPos + 1;
        }
      }
      if (candidateSourceSeq >= 0) {
        sourceToWrapped[candidateSourceSeq] = idx;
        remainingSourceSeq = candidateSourceSeq - 1;
      }
      matchCount = 0;
    }
    if (!isAligned) break;
    let firstSeqInLine = nextSequenceIndex;
    let lastSeqInLine = nextSequenceIndex - 1;
    for (let scanSeq = 0; sequenceEnds[lastSeqInLine + 1] <= sourceCodeAt;) {
      let seqEnd = sequenceEnds[++lastSeqInLine];
      while (
        scanSeq < sourceSequenceCount &&
        (sourcePositions[scanSeq] < seqEnd || sourceToWrapped[scanSeq] < 0)
      )
        scanSeq++;
      wrappedToSource[lastSeqInLine - firstSeqInLine] =
        seqEnd <= sourceCursor
          ? 0
          : scanSeq < sourceSequenceCount
            ? sourceToWrapped[scanSeq]
            : wrappedSequenceCount;
    }
    for (let idx = 0; idx <= wrappedSequenceCount; idx++) {
      let wrappedSeqOffset = wrappedPositions[idx];
      let hasNewline =
        nextSequenceIndex <= lastSeqInLine && wrappedToSource[nextSequenceIndex - firstSeqInLine] <= idx;
      let isNewlineCode = idx < wrappedSequenceCount && wrappedCodes[idx] === 10;
      if (atLineStart && (hasNewline || (idx < wrappedSequenceCount && !isNewlineCode))) {
        atLineStart = false;
        if (activePrefix !== "") {
          outParts.push(wrappedPlain.slice(emittedUntil, wrappedSeqOffset), activePrefix);
          emittedUntil = wrappedSeqOffset;
          needsRestore = true;
        }
      }
      if (hasNewline) {
        outParts.push(wrappedPlain.slice(emittedUntil, wrappedSeqOffset));
        emittedUntil = wrappedSeqOffset;
        while (
          nextSequenceIndex <= lastSeqInLine &&
          wrappedToSource[nextSequenceIndex - firstSeqInLine] <= idx
        )
          outParts.push(match[nextSequenceIndex++]);
        needsRestore = true;
      }
      if (isNewlineCode) {
        if (appliedSequenceIndex < nextSequenceIndex) {
          while (appliedSequenceIndex < nextSequenceIndex)
            applySgrToState(match[appliedSequenceIndex++], sgrState);
          restorePrefix = "";
          activePrefix = "";
          let resetOrder = 0;
          for (let idx = 0; idx < sgrState.length; idx++) {
            if (sgrState[idx] === "") continue;
            activePrefix += `\x1B[${sgrState[idx]}m`;
            if (SGR_RESET_CODES[idx] !== resetOrder) {
              resetOrder = SGR_RESET_CODES[idx];
              restorePrefix = `\x1B[${resetOrder}m${restorePrefix}`;
            }
          }
        }
        if (needsRestore && restorePrefix !== "") {
          outParts.push(wrappedPlain.slice(emittedUntil, wrappedSeqOffset), restorePrefix);
          emittedUntil = wrappedSeqOffset;
        }
        needsRestore = false;
        atLineStart = true;
      }
    }
    sourceCursor = sourceCodeAt;
    wrappedCursor = wrappedCodeAt;
    if (wrappedCursor >= wrappedPlain.length) {
      isAligned = sourceCursor >= text_2.length;
      break;
    }
    if (atLineStart) {
      atLineStart = false;
      if (activePrefix !== "") {
        outParts.push(wrappedPlain.slice(emittedUntil, wrappedCursor), activePrefix);
        emittedUntil = wrappedCursor;
        needsRestore = true;
      }
    }
    if (nextNewlineAt < wrappedCursor) {
      nextNewlineAt = wrappedPlain.indexOf(
        `
`,
        wrappedCursor,
      );
      nextNewlineAt = nextNewlineAt === -1 ? wrappedPlain.length : nextNewlineAt;
    }
    if (nextWrappedEscapeAt < wrappedCursor) {
      nextWrappedEscapeAt = wrappedPlain.indexOf("\x1B", wrappedCursor);
      nextWrappedEscapeAt = nextWrappedEscapeAt === -1 ? wrappedPlain.length : nextWrappedEscapeAt;
    }
    if (nextSourceEscapeAt < sourceCursor) {
      nextSourceEscapeAt = text_2.indexOf("\x1B", sourceCursor);
      nextSourceEscapeAt = nextSourceEscapeAt === -1 ? text_2.length : nextSourceEscapeAt;
    }
    let min = Math.min(
      nextNewlineAt - wrappedCursor,
      nextWrappedEscapeAt - wrappedCursor,
      nextSourceEscapeAt - sourceCursor,
      nextSequenceIndex < sequenceEnds.length
        ? sequenceEnds[nextSequenceIndex] - sourceCursor
        : wrappedPlain.length,
    );
    while (min > 0 && isWrapSpaceCode(wrappedPlain.charCodeAt(wrappedCursor + min - 1))) min--;
    if (min < 1 || !text_2.startsWith(wrappedPlain.slice(wrappedCursor, wrappedCursor + min), sourceCursor)) {
      min = 1;
      if (wrappedPlain.charCodeAt(wrappedCursor) !== text_2.charCodeAt(sourceCursor)) {
        isAligned = false;
        break;
      }
    }
    sourceCursor += min;
    wrappedCursor += min;
  }
  if (!isAligned) return wrapAnsiLine(text, width, wrapOptions);
  outParts.push(wrappedPlain.slice(emittedUntil));
  return outParts.join("");
}
//@ chunk-8n1fbght.js:8090-8339 placement
/**
 * 从位置 n 开始扫描连续的转义序列/控制字符，记录各自位置与代码。
 */
function scanLeadingControls(text, start, positions, codes) {
  let count = 0;
  let index = start;
  for (; ; count++) {
    let code = text.charCodeAt(index);
    HYPERLINK_OSC_RE.lastIndex = index;
    let hyperMatch = code === 27 ? HYPERLINK_OSC_RE.exec(text) : null;
    if (hyperMatch === null && !isWrapSpaceCode(code)) break;
    positions[count] = index;
    codes[count] = hyperMatch !== null ? hyperMatch[0] : code === 13 ? 10 : code;
    index +=
      hyperMatch !== null ? hyperMatch[0].length : code === 13 && text.charCodeAt(index + 1) === 10 ? 2 : 1;
  }
  positions[count] = index;
  return count;
}
//@ chunk-8n1fbght.js:8339-8381 placement
/**
 * 空格或 9–13
 */
function isWrapSpaceCode(code) {
  return code === 32 || (code >= 9 && code <= 13);
}
//@ chunk-8n1fbght.js:8381-8417 placement
/**
 * 生成一张空的 SGR 状态槽位数组（前景/背景/下划线等）。
 */
function emptySgrState() {
  return SGR_RESET_CODES.map(() => "");
}
//@ chunk-8n1fbght.js:8417-9063 placement
/**
 * 把一个 SGR 序列应用到样式状态数组（前景/背景色、256/真彩色、下划线样式、复位）。
 */
function applySgrToState(sequence, state) {
  if (!sequence.endsWith("m")) return;
  if (SGR_COLOR_RE.test(sequence)) {
    state[sequence.charCodeAt(2) === 51 ? FG_COLOR_SLOT : BG_COLOR_SLOT] = sequence.slice(2, -1);
    return;
  }
  let high = sequence.length === 5 ? sequence.charCodeAt(2) - 48 : 0;
  let low = sequence.charCodeAt(sequence.length - 2) - 48;
  if ((sequence.length === 4 || sequence.length === 5) && high >= 0 && high <= 9 && low >= 0 && low <= 9) {
    applySgrCode(high * 10 + low, state);
    return;
  }
  let parts = sequence.slice(2, -1).split(";");
  for (let i = 0; i < parts.length; i++) {
    let part = parts[i];
    let sgrCode = part === "" ? 0 : parseInt(part, 10);
    if (sgrCode === 38 || sgrCode === 48 || sgrCode === 58) {
      let colorKind = parseInt(parts[i + 1] ?? "", 10);
      let paramSpan = part.includes(":") ? 1 : colorKind === 5 ? 3 : colorKind === 2 ? 5 : 1;
      if (sgrCode !== 58 && (paramSpan > 1 || part.includes(":"))) {
        if (i + paramSpan <= parts.length)
          state[sgrCode === 38 ? FG_COLOR_SLOT : BG_COLOR_SLOT] = parts.slice(i, i + paramSpan).join(";");
      }
      i += paramSpan - 1;
    } else if (sgrCode === 4 && part.includes(":"))
      state[SGR_SLOT_MAP.get(4)] = part === "4:0" ? "" : /^4:[1-5]$/.test(part) ? part : "4";
    else applySgrCode(sgrCode, state);
  }
}
//@ chunk-8n1fbght.js:9063-9264 placement
/**
 * 应用单个 SGR 参数：颜色、属性开关或全部复位。
 */
function applySgrCode(code, state) {
  let slot =
    (code >= 30 && code <= 37) || (code >= 90 && code <= 97)
      ? FG_COLOR_SLOT
      : (code >= 40 && code <= 47) || (code >= 100 && code <= 107)
        ? BG_COLOR_SLOT
        : SGR_SLOT_MAP.get(code);
  if (slot !== undefined) state[slot] = String(code);
  else if (code === 0) state.fill("");
  else for (let i = 0; i < state.length; i++) if (SGR_RESET_CODES[i] === code) state[i] = "";
}
//@ chunk-8n1fbght.js:9264-9701 placement
/**
 * 换行时的宽字符处理：两个私有区占位符、匹配占位符的正则、完整转义序列判定，以及“窄字符”判定的字符类。
 */
var WIDE_PLACEHOLDER_1; // deferred: uses sgrPatternSource of its import cycle while loading; runs once the cycle is complete
var WIDE_PLACEHOLDER_2;
var WIDE_CHAR_PLACEHOLDERS_RE;
var COMPLETE_ESCAPE_SEQUENCE_RE;
var regExp_3;
var NON_WIDE_SAFE_CHARS_RE;
deferInit("chunk-8n1fbght.js:9264", () => {
  WIDE_PLACEHOLDER_1 = "\uDB80\uDC00";
  WIDE_PLACEHOLDER_2 = "\uD87E\uDE1D";
  WIDE_CHAR_PLACEHOLDERS_RE = /[\u{F0000}\u{2FA1D}]/gu;
  COMPLETE_ESCAPE_SEQUENCE_RE = /^\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x00-\x1f\x7f-\x9f]*(?:\x07|\x1b\\))$/;
  regExp_3 = new RegExp(`^(?:${sgrPatternSource(";:")}$|\\x1b\\]8;)`);
  NON_WIDE_SAFE_CHARS_RE =
    /[^\x00-\u02FF\u0370-\u0482\u048A-\u052F\u2000-\u200B\u2010-\u205F\u2070-\u20CF\u2100-\u2BFF\u2E80-\u3029\u3030-\u3098\u309B-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFF01-\uFF9D\uFFE0-\uFFEE\u{1f000}-\u{1f1e5}\u{1f200}-\u{1f3fa}\u{1f400}-\u{1faff}]/gu;
});
//@ chunk-8n1fbght.js:9701-11439 placement
function wrapAnsiLine(text, width, wrapOptions, foldSequences = true) {
  if (text.search(NON_WIDE_SAFE_CHARS_RE) === -1) return Bun.wrapAnsi(text, width, wrapOptions);
  let plainText = "";
  let sequences = [];
  let sequenceOffsets = [];
  for (let token of tokenizeAll(text))
    if (token.type === "sequence") {
      sequences.push(token.value);
      sequenceOffsets.push(plainText.length);
    } else plainText += token.value;
  let swaps = {
    starts: [],
    ends: [],
    handedAs: [],
    restoredAs: [],
  };
  let graphemeSegmenter = getGraphemeSegmenter();
  let seqIndex = 0;
  let addedSequences = false;
  let match;
  NON_WIDE_SAFE_CHARS_RE.lastIndex = 0;
  while ((match = NON_WIDE_SAFE_CHARS_RE.exec(plainText)) !== null) {
    let index = match.index;
    while (index > 0 && !isLineBreakCode(plainText.charCodeAt(index - 1))) index--;
    let index_2 = match.index;
    while (index_2 < plainText.length && !isLineBreakCode(plainText.charCodeAt(index_2))) index_2++;
    NON_WIDE_SAFE_CHARS_RE.lastIndex = index_2;
    let sliced = plainText.slice(index, index_2);
    while (seqIndex < sequenceOffsets.length && sequenceOffsets[seqIndex] < index) seqIndex++;
    let scanSeqIndex = seqIndex;
    let isPlain = !hasControlSequences(sliced);
    while (scanSeqIndex < sequenceOffsets.length && sequenceOffsets[scanSeqIndex] <= index_2) {
      isPlain = COMPLETE_ESCAPE_SEQUENCE_RE.test(sequences[scanSeqIndex]) && isPlain;
      scanSeqIndex++;
    }
    if (!isPlain && scanSeqIndex > seqIndex) {
      let runStart = index;
      for (; seqIndex < sequenceOffsets.length && sequenceOffsets[seqIndex] < index_2; seqIndex++)
        if (sequenceOffsets[seqIndex] > runStart) {
          markWidthMismatchGraphemes(plainText, runStart, sequenceOffsets[seqIndex], swaps);
          runStart = sequenceOffsets[seqIndex];
        }
      markWidthMismatchGraphemes(plainText, runStart, index_2, swaps);
      continue;
    }
    for (let { segment, index: index_2 } of graphemeSegmenter.segment(sliced)) {
      if (segment.length === 1) continue;
      let graphemeStart = index + index_2;
      let graphemeEnd = graphemeStart + segment.length;
      let placeholder = placeholderForGrapheme(segment);
      while (seqIndex < sequenceOffsets.length && sequenceOffsets[seqIndex] <= graphemeStart) seqIndex++;
      let endSeqIndex = seqIndex;
      while (endSeqIndex < sequenceOffsets.length && sequenceOffsets[endSeqIndex] < graphemeEnd)
        endSeqIndex++;
      if (endSeqIndex === seqIndex) {
        if (placeholder !== "") recordGraphemeSwap(swaps, graphemeStart, graphemeEnd, placeholder, segment);
        continue;
      }
      if (
        placeholder === "" ||
        bunStringWidth(plainText.slice(graphemeStart, sequenceOffsets[seqIndex])) === 0
      ) {
        for (let index = seqIndex; index <= endSeqIndex; index++) {
          let from = index === seqIndex ? graphemeStart : sequenceOffsets[index - 1];
          let to = index === endSeqIndex ? graphemeEnd : sequenceOffsets[index];
          markWidthMismatchGraphemes(plainText, from, to, swaps);
        }
        continue;
      }
      let replacement = placeholder;
      let tails = "";
      let cursor = graphemeStart;
      for (let seqIdx = seqIndex; seqIdx < endSeqIndex; seqIdx++) {
        let sequence = sequences[seqIdx];
        tails += plainText.slice(cursor, sequenceOffsets[seqIdx]);
        cursor = sequenceOffsets[seqIdx];
        if (foldSequences && regExp_3.test(sequence)) {
          replacement += sequence;
          addedSequences = true;
        } else tails += sequence;
      }
      recordGraphemeSwap(
        swaps,
        graphemeStart,
        graphemeEnd,
        replacement,
        tails + plainText.slice(cursor, graphemeEnd),
      );
    }
  }
  let { starts, ends, handedAs, restoredAs } = swaps;
  if (starts.length === 0)
    return hardWrapPreservingSequences(Bun.wrapAnsi(text, width, wrapOptions), text, width, wrapOptions);
  let outParts = [];
  let swapStarts = [];
  let hasWidePlaceholders = text.search(WIDE_CHAR_PLACEHOLDERS_RE) !== -1;
  let swapIndex = 0;
  let scanOffset = 0;
  for (let idx = 0; idx <= starts.length; idx++) {
    let nextStart = idx < starts.length ? starts[idx] : plainText.length;
    for (; scanOffset < sequences.length && sequenceOffsets[scanOffset] <= nextStart; scanOffset++) {
      let text = plainText.slice(swapIndex, sequenceOffsets[scanOffset]);
      pushSegment(swapStarts, outParts, text, hasWidePlaceholders);
      swapStarts.push(sequences[scanOffset]);
      swapIndex = sequenceOffsets[scanOffset];
    }
    let text = plainText.slice(swapIndex, nextStart);
    pushSegment(swapStarts, outParts, text, hasWidePlaceholders);
    if (idx === starts.length) break;
    swapStarts.push(handedAs[idx]);
    outParts.push(restoredAs[idx]);
    swapIndex = ends[idx];
    while (scanOffset < sequences.length && sequenceOffsets[scanOffset] < swapIndex) scanOffset++;
  }
  let joined = swapStarts.join("");
  if (addedSequences && joined.split(LINE_BREAK_RE).every((line) => bunStringWidth(line) <= width))
    return wrapAnsiLine(text, width, wrapOptions, false);
  let wrapped = Bun.wrapAnsi(joined, width, wrapOptions);
  if (wrapped === joined) return hardWrapPreservingSequences(text, text, width, wrapOptions);
  let placeholderIndex = 0;
  let restored = "";
  for (let token of tokenizeAll(wrapped))
    restored +=
      token.type === "sequence"
        ? token.value
        : token.value.replace(
            WIDE_CHAR_PLACEHOLDERS_RE,
            (placeholder) => outParts[placeholderIndex++] ?? placeholder,
          );
  return hardWrapPreservingSequences(restored, text, width, wrapOptions);
}
//@ chunk-8n1fbght.js:11439-11863 placement
/**
 * 硬换行时若有行超宽，按段检查控制序列是否安全，再逐行强制折断。
 */
function hardWrapPreservingSequences(wrapped, original, width, options) {
  if (!options?.hard || width < 1) return wrapped;
  let lines = wrapped.split(`
`);
  if (lines.every((line) => bunStringWidth(line) <= width) || !isWrapFitEnabled()) return wrapped;
  let parts = original.split(LINE_BREAK_RE);
  let safeParts = [];
  for (let part of parts) {
    let isSafe = true;
    for (let token of tokenizeAll(part))
      if (
        token.type === "sequence"
          ? !COMPLETE_ESCAPE_SEQUENCE_RE.test(token.value)
          : hasControlSequences(token.value)
      ) {
        isSafe = false;
        break;
      }
    safeParts.push(isSafe);
  }
  if (!safeParts.includes(true)) return wrapped;
  if (safeParts.includes(false))
    return parts.map((part) => wrapAnsiLine(part, width, options)).join(`
`);
  let out = [];
  for (let line of lines) {
    if (bunStringWidth(line) <= width) {
      out.push(line);
      continue;
    }
    breakLineByGraphemes(line, width, false, out);
  }
  return out.join(`
`);
}
//@ chunk-8n1fbght.js:11863-12264 placement
/**
 * 按字素宽度把一行强制折成不超过 n 列的多行（转义序列不计宽，超宽字素拆开）。
 */
function breakLineByGraphemes(text, width, hardOnly, lines) {
  let current = "";
  let currentWidth = 0;
  let flushLine = () => {
    if (!hardOnly && bunStringWidth(current) > width) breakLineByGraphemes(current, width, true, lines);
    else lines.push(current);
    current = "";
    currentWidth = 0;
  };
  let appendSegment = (segment, segmentWidth) => {
    if (currentWidth > 0 && segmentWidth > 0 && currentWidth + segmentWidth > width) flushLine();
    current += segment;
    currentWidth += segmentWidth;
  };
  for (let token of tokenizeAll(text)) {
    if (token.type === "sequence") {
      current += token.value;
      continue;
    }
    for (let { segment } of getGraphemeSegmenter().segment(token.value)) {
      let graphemeWidth = bunStringWidth(segment);
      if (graphemeWidth > width && graphemeWidth > 2)
        for (let char of segment) {
          let charWidth = bunStringWidth(char);
          appendSegment(char, hardOnly ? Math.max(charWidth, 1) : charWidth);
        }
      else if (hardOnly) {
        let widthSum = 0;
        for (let char of segment) widthSum += Math.max(bunStringWidth(char), 1);
        appendSegment(segment, widthSum);
      } else appendSegment(segment, graphemeWidth);
    }
  }
  flushLine();
}
//@ chunk-8n1fbght.js:12264-12301 placement
/**
 * 10 或 13
 */
function isLineBreakCode(code) {
  return code === 10 || code === 13;
}
//@ chunk-8n1fbght.js:12301-12319 placement
/**
 * \r\n?|\n
 */
var LINE_BREAK_RE = /\r\n?|\n/;
//@ chunk-8n1fbght.js:12319-12414 placement
/**
 * 登记一次字素替换
 */
function recordGraphemeSwap(swaps, start, end, placeholder, segment) {
  swaps.starts.push(start);
  swaps.ends.push(end);
  swaps.handedAs.push(placeholder);
  swaps.restoredAs.push(segment);
}
//@ chunk-8n1fbght.js:12414-12576 placement
/**
 * 找出宽度与码元数不一致的字素并登记替换。
 */
function markWidthMismatchGraphemes(text, start, end, swaps) {
  let sliced = text.slice(start, end);
  if (sliced.search(NON_WIDE_SAFE_CHARS_RE) === -1) return;
  for (let { segment, index } of getGraphemeSegmenter().segment(sliced)) {
    let placeholder = placeholderForGrapheme(segment);
    if (placeholder !== "")
      recordGraphemeSwap(swaps, start + index, start + index + segment.length, placeholder, segment);
  }
}
//@ chunk-8n1fbght.js:12576-12688 placement
/**
 * 多码点字素按显示宽度选 1 或 2 宽的占位字符。
 */
function placeholderForGrapheme(segment) {
  let leadSize = segment.codePointAt(0) > 65535 ? 2 : 1;
  if (segment.length <= leadSize) return "";
  let width = bunStringWidth(segment);
  return width === 1 ? WIDE_PLACEHOLDER_1 : width === 2 ? WIDE_PLACEHOLDER_2 : "";
}
//@ chunk-8n1fbght.js:12688-12780 placement
/**
 * 收集一段文本并登记其中的宽字符
 */
function pushSegment(out, placeholders, text, collectPlaceholders) {
  if (text === "") return;
  if (collectPlaceholders)
    for (let placeholder of text.match(WIDE_CHAR_PLACEHOLDERS_RE) ?? []) placeholders.push(placeholder);
  out.push(text);
}
export {
  wrapAnsi,
  DEFAULT_TAB_WIDTH,
  hasExpandableControls,
  expandTabs,
  hasControlSequences,
  isCompleteEscapeSequence,
  expandTabsInText,
  registerWrapFeatureReader,
  registerWrapFeatureLatches,
  sgrPatternSource,
  emptySgrState,
  applySgrToState,
};
