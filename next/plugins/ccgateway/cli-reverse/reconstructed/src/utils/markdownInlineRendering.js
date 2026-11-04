/**
 * utils/markdownInlineRendering.ts
 *
 * 2.1.316 新增：Markdown 行内渲染（控制字符、OSC 8 超链接）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wj577vf9.js (20)
 * attribution: placement 20
 */
import { stripAnsi } from "./stripAnsi.js";
import { sequential } from "./sequential.js";
import { VERTICAL_LEFT_BAR_GLYPH, BOXED_DIAMOND_GLYPH } from "../constants/figures.js";
import { sgrPatternSource } from "../ink/wrapAnsi.js";
import { INVISIBLE_CHAR_CLASS } from "./pathSanitize.js";
import {
  isDecisionSurfaceControl,
  isCanonicalArtifactViewerUrl,
} from "../tools/ArtifactTool/artifactUrls.js";
import { HTTP_URL_RE, escapePipesInCode, tableHasExtraCells } from "./markdown.js";
import { marked, _Tokenizer } from "../../vendor/marked/lib/marked.esm.js";
import { identity } from "./identity.js";
import { LRUCache } from "../../vendor/lru-cache/dist/esm/index.min.js";
import { HostScoped } from "./hostScoped.js";
import { nestingGuard, normalizeBlockText } from "../ink/render-border.js";
import { markdownHeldGuard, regExp, MARKDOWN_LIMITS_2 } from "./doctorContextWarnings.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-wj577vf9.js:7634-7772 placement
var MAX_PREVIEW_LINES = 6;
var MAX_PREVIEW_ROWS = 16;
var NEWLINE_STR = `
`;
var makeRows = (rows) => ({
  rows,
  isDone: false,
});
var ensureTrailingNewline = (text) => (text === "" || text.endsWith(NEWLINE_STR) ? text : text + NEWLINE_STR);
var rowsOf = (rows) => (rows === "" ? [] : [makeRows(rows)]);
var isNonBlankLine = (line) => stripAnsi(line).trim() !== "";
//@ chunk-wj577vf9.js:7772-7876 placement (2.1.88 match: styleBorderLine, 0.66)
function styleQuotedPreview(text) {
  let bar = sequential.dim(VERTICAL_LEFT_BAR_GLYPH);
  return makeRows(
    text
      .split(NEWLINE_STR)
      .map((line) => (isNonBlankLine(line) ? `${bar} ${sequential.italic(line)}` : line))
      .join(NEWLINE_STR),
  );
}
//@ chunk-wj577vf9.js:7876-7972 placement
function gutterPrefix(depth) {
  let bars = `${VERTICAL_LEFT_BAR_GLYPH} `.repeat(Math.max(0, depth)).trimEnd();
  return bars === "" ? "" : `${sequential.dim(bars)} `;
}
//@ chunk-wj577vf9.js:7972-8158 placement
function quotedPreviewRows(text, linesUsed, options) {
  let availableLines = Math.min(linesUsed + 1, MAX_PREVIEW_ROWS) - options.around;
  let isShallow = options.around === 0;
  let firstGutter = gutterPrefix(isShallow ? 1 : availableLines);
  let restGutter = gutterPrefix(isShallow ? availableLines - 1 : 0);
  let styleLine = isShallow ? sequential.italic : (line) => line;
  return {
    rows: ensureTrailingNewline(text)
      .split(NEWLINE_STR)
      .map((line) => (isNonBlankLine(line) ? firstGutter + styleLine(restGutter + line) : line))
      .join(NEWLINE_STR),
    isDone: true,
  };
}
//@ chunk-wj577vf9.js:8158-8279 placement
function mergePreviewRows(rows) {
  let merged = [];
  let pendingText = "";
  for (let rowEntry of rows)
    if (rowEntry.isDone) {
      merged.push(...rowsOf(ensureTrailingNewline(pendingText)), rowEntry);
      pendingText = "";
    } else pendingText += rowEntry.rows;
  return [...merged, ...rowsOf(pendingText)];
}
//@ chunk-wj577vf9.js:8279-8450 placement
function renderBlockquoteRows(tokens, depth, context) {
  let styleRows =
    depth < MAX_PREVIEW_LINES ? styleQuotedPreview : (text) => quotedPreviewRows(text, depth, context);
  return mergePreviewRows(
    tokens.flatMap((token) =>
      token.type === "blockquote"
        ? renderBlockquoteRows(token.tokens ?? [], depth + 1, context)
        : [makeRows(context.draw(token, depth + 1))],
    ),
  ).map((rowEntry) => (rowEntry.isDone ? rowEntry : styleRows(rowEntry.rows)));
}
//@ chunk-wj577vf9.js:8450-8518 placement
var drawAround = (tokens, depth, draw) =>
  renderBlockquoteRows(tokens, depth, {
    around: depth,
    draw,
  })
    .map((rowEntry) => rowEntry.rows)
    .join("");
//@ chunk-wj577vf9.js:8518-8655 placement
/**
 * 去除内联文本中的控制字符（保留行分隔符等）。
 */
var CONTROL_CHAR_PATTERN; // deferred: uses sgrPatternSource (../ink/wrapAnsi.js) of its import cycle while loading; runs once the cycle is complete
var regExp_2;
var stripControlCharsForInline;
deferInit("chunk-wj577vf9.js:8518", () => {
  CONTROL_CHAR_PATTERN = /[\x00-\x08\x0b-\x1f\x7f-\x9f]/;
  regExp_2 = new RegExp(`(?!${sgrPatternSource(";:")})${CONTROL_CHAR_PATTERN.source}`, "g");
  stripControlCharsForInline = (text) =>
    text
      .replace(
        /\r\n?/g,
        `
`,
      )
      .replace(regExp_2, "");
});
//@ chunk-wj577vf9.js:8655-9130 placement
function controlCharTokens(tokens) {
  let pending = tokens.some((token) => CONTROL_CHAR_PATTERN.test(token.raw)) ? [tokens] : [];
  for (let node of pending)
    for (let [key, value] of Object.entries(node)) {
      let isStrippable = typeof value === "string" && key !== "href";
      if (typeof value === "object" && value !== null) pending.push(value);
      else if (isStrippable) Reflect.set(node, key, stripControlCharsForInline(value));
    }
  let any = pending.some((node) =>
    Object.entries(node).some(
      ([key, value]) => key !== "href" && typeof value === "string" && value.includes("\x1B"),
    ),
  );
  let filtered = pending.filter(
    (node) => "type" in node && (node.type === "link" || node.type === "image" || node.type === "codespan"),
  );
  for (let node of any ? filtered : [])
    Object.assign(node, {
      afterStyle: true,
    });
  return tokens;
}
//@ chunk-wj577vf9.js:9130-9221 placement
var WORD_BOUNDARY_PATTERNS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp_3;
var regExp_4;
deferInit("chunk-wj577vf9.js:9130", () => {
  WORD_BOUNDARY_PATTERNS = `
`;
  regExp_3 = new RegExp(`^[${INVISIBLE_CHAR_CLASS}]+`, "u");
  regExp_4 = new RegExp(`(?:^|[^${INVISIBLE_CHAR_CLASS}])([${INVISIBLE_CHAR_CLASS}]*)$`, "u");
});
//@ chunk-wj577vf9.js:9221-9306 placement
function stripTrailingLinkHint(label) {
  let hintLength = regExp_4.exec(label)?.[1]?.length ?? 0;
  return hintLength === 0 ? label : label.slice(0, label.length - hintLength);
}
//@ chunk-wj577vf9.js:9306-9671 placement
/**
 * OSC 8 超链接与游离 ESC/C1 序列正则，以及去掉决策面控制字符的函数。
 */
var OSC8_LINK_PATTERN = /\x1b\]8;[^;\x07\x1b]*;([^\x07\x1b]*)(?:\x07|\x1b\\)/g;
var ESC_NON_CSI_RE = /\x9d|\x1b(?!\[)/;
var C1_OSC_RE = /\x9d/g;
var ESC_NON_CSI_GLOBAL_RE = /\x1b(?!\[)/g;
var stripDecisionSurfaceChars = (text) =>
  Array.from(text)
    .filter((char) => {
      let codePoint = char.codePointAt(0) ?? 0;
      return codePoint !== 10697 && !isDecisionSurfaceControl(codePoint);
    })
    .join("");
var SGR_RESET_SEQUENCE = "\x1B[28m\x1B[39m\x1B[49m";
var afterStyleReset = (token) =>
  "afterStyle" in token && token.afterStyle === true ? SGR_RESET_SEQUENCE : "";
var labelWithReset = (label, reset) => `${reset}${stripDecisionSurfaceChars(label)}`;
var labelWithHint = (href, reset, hint = "") => `${reset} (${stripDecisionSurfaceChars(href)}${hint})`;
var labelForLink = (href) => labelWithHint(href, SGR_RESET_SEQUENCE);
//@ chunk-wj577vf9.js:9671-10714 placement
/**
 * 去掉嵌套或无效的 OSC 8 超链接序列，保留文本。
 */
function stripNestedHyperlinks(text) {
  if (!text.includes("\x1B]8;")) return text;
  let links = [];
  let openLink = null;
  for (let match of text.matchAll(OSC8_LINK_PATTERN)) {
    let matchEnd = match.index + match[0].length;
    if (openLink !== null) {
      links.push({
        href: openLink.href,
        openEnd: openLink.openEnd,
        closeStart: match.index,
        closeEnd: matchEnd,
      });
      openLink = null;
    }
    let href = match[1] ?? "";
    if (href !== "")
      openLink = {
        href,
        openEnd: matchEnd,
      };
  }
  if (openLink !== null)
    links.push({
      href: openLink.href,
      openEnd: openLink.openEnd,
      closeStart: text.length,
      closeEnd: text.length,
    });
  let output = "";
  let copiedUntil = 0;
  let previousCloseEnd = 0;
  let previousWasArtifact = false;
  for (let link of links) {
    let index = text.lastIndexOf("\x1B]8;", link.openEnd - 1);
    let precedingText = stripTrailingLinkHint(stripAnsi(text.slice(0, index)));
    let segmentStart = previousCloseEnd;
    previousCloseEnd = link.closeStart;
    let isArtifactLink = isCanonicalArtifactViewerUrl(link.href);
    let previousFlag = previousWasArtifact;
    previousWasArtifact = isArtifactLink;
    if (!isArtifactLink) {
      let betweenText = stripAnsi(text.slice(segmentStart, index));
      let included = betweenText.includes(BOXED_DIAMOND_GLYPH);
      let isHintOnly = previousFlag && stripTrailingLinkHint(betweenText) === "";
      if (!included && !precedingText.endsWith(BOXED_DIAMOND_GLYPH) && !isHintOnly) continue;
    } else if (!precedingText.endsWith(BOXED_DIAMOND_GLYPH)) continue;
    if (isArtifactLink) {
      let sliced = text.slice(link.openEnd, link.closeStart);
      let diamondIndex = stripAnsi(sliced).startsWith(`${BOXED_DIAMOND_GLYPH} `)
        ? sliced.indexOf(`${BOXED_DIAMOND_GLYPH} `)
        : -1;
      if (diamondIndex !== -1) {
        output += text.slice(copiedUntil, link.openEnd);
        output += sliced.slice(0, diamondIndex);
        output += sliced.slice(diamondIndex + BOXED_DIAMOND_GLYPH.length + 1);
        copiedUntil = link.closeStart;
      } else {
        let sliced = text.slice(copiedUntil, index);
        let diamondPrefix = `${BOXED_DIAMOND_GLYPH} `;
        if (sliced.endsWith(diamondPrefix)) {
          let sliced_2 = sliced.slice(0, -diamondPrefix.length);
          if (stripTrailingLinkHint(stripAnsi(output + sliced_2)).endsWith(BOXED_DIAMOND_GLYPH)) {
            output += sliced_2;
            copiedUntil = index;
          }
        }
      }
      continue;
    }
    let linkLabel = labelForLink(link.href);
    let closeEnd = link.closeEnd;
    if (text.startsWith(linkLabel, closeEnd)) continue;
    output += text.slice(copiedUntil, closeEnd) + linkLabel;
    copiedUntil = closeEnd;
  }
  return output + text.slice(copiedUntil);
}
//@ chunk-wj577vf9.js:10714-10991 placement
function renderWithSafeLinks(tokens, render) {
  let rendered = render();
  if (!rendered.includes("\x1B]8;")) return rendered;
  let stripped = stripNestedHyperlinks(rendered);
  if (!rendered.includes(BOXED_DIAMOND_GLYPH) && stripped === rendered) return rendered;
  let suspiciousCodespans = findSuspiciousCodespans(tokens ?? []);
  if (suspiciousCodespans.length === 0) return stripped;
  try {
    for (let suspiciousCodespan of suspiciousCodespans)
      Object.assign(suspiciousCodespan, {
        defanged: true,
      });
    return stripNestedHyperlinks(render());
  } finally {
    for (let suspiciousCodespan of suspiciousCodespans)
      Reflect.deleteProperty(suspiciousCodespan, "defanged");
  }
}
//@ chunk-wj577vf9.js:10991-11181 placement
function findSuspiciousCodespans(tokens) {
  return tokens.flatMap((token) => {
    if (token.type === "codespan")
      return !("defanged" in token && token.defanged === true) && HTTP_URL_RE.test(token.text) ? [token] : [];
    return "tokens" in token && Array.isArray(token.tokens) ? findSuspiciousCodespans(token.tokens) : [];
  });
}
//@ chunk-wj577vf9.js:11181-11297 placement
class MarkedConfigState {
  #e = false;
  get configured() {
    return this.#e;
  }
  set() {
    this.#e = true;
  }
  reset() {
    this.#e = false;
    marked.setOptions(marked.getDefaults());
  }
}
//@ chunk-wj577vf9.js:11297-11330 placement
/**
 * 宿主隔离的 marked 配置状态缓存（含重置）。
 */
var markedConfigStateMemo; // deferred: uses MarkedConfigState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-wj577vf9.js:11297", () => {
  markedConfigStateMemo = identity(new MarkedConfigState(), (state) => state.reset());
});
//@ chunk-wj577vf9.js:11330-11429 placement
class MarkedConfigCache {
  #e = new LRUCache({
    max: 200,
    ttl: 30000,
  });
  get(key) {
    return this.#e.get(key);
  }
  record(key, value) {
    this.#e.set(key, value);
  }
}
//@ chunk-wj577vf9.js:11429-13024 placement
/**
 * marked 渲染器池、扩展原型方法与渲染配置（后台词、表格、列表、加粗、代码管道转义等）。
 */
var markdownRendererPool; // deferred: uses MarkedConfigCache of its import cycle while loading; runs once the cycle is complete
var table;
var blockquote;
var list;
var emStrong;
var MARKED_CONFIG_CACHE_SIZE;
var CLOSING_TO_OPENING;
var BACKSLASH_ESCAPE_RE;
var WORD_END_RE;
var markedExtensions;
deferInit("chunk-wj577vf9.js:11429", () => {
  markdownRendererPool = new HostScoped(() => new MarkedConfigCache());
  table = _Tokenizer.prototype.table;
  blockquote = _Tokenizer.prototype.blockquote;
  list = _Tokenizer.prototype.list;
  emStrong = _Tokenizer.prototype.emStrong;
  MARKED_CONFIG_CACHE_SIZE = {
    tokenizer: {
      del(src) {
        let match = /^~~(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))~~(?=[^~]|$)/.exec(src);
        let innerText = match?.[1];
        if (!match || innerText === undefined) return;
        return {
          type: "del",
          raw: match[0],
          text: innerText,
          tokens: this.lexer.inlineTokens(innerText),
        };
      },
      blockquote(src) {
        return this.rules.other.blockquoteStart.test(src)
          ? nestingGuard.lexLevel(this.lexer, () => blockquote.call(this, src))
          : undefined;
      },
      list(src) {
        return this.rules.block.list.test(src)
          ? nestingGuard.lexLevel(this.lexer, () => list.call(this, src))
          : undefined;
      },
      emStrong(src, prevChar, nextChar) {
        return this.rules.inline.emStrongLDelim.test(src)
          ? nestingGuard.lexLevel(this.lexer, () => emStrong.call(this, src, prevChar, nextChar))
          : undefined;
      },
      paragraph(src) {
        let flattened = flattenDeepList(this, src);
        return flattened
          ? {
              type: "paragraph",
              ...flattened,
            }
          : false;
      },
      text(src) {
        let flattened = flattenDeepList(this, src);
        return flattened
          ? {
              type: "text",
              ...flattened,
            }
          : false;
      },
      def() {
        return;
      },
      lheading(src) {
        return (markdownHeldGuard.isHeld() ? regExp.test(src) : MARKDOWN_LIMITS_2.test(src))
          ? false
          : undefined;
      },
      table(src) {
        let match = this.rules.block.table.exec(src);
        if (!match) return;
        let rawTable = match[0];
        let lines = rawTable
          .split(
            `
`,
          )
          .map(escapePipesInCode);
        let joined = lines.join(`
`);
        let tableToken =
          joined === rawTable ? table.call(this, src) : table.call(this, joined + src.slice(rawTable.length));
        if (tableToken) {
          if (tableHasExtraCells(lines, tableToken.header.length)) return;
          if (joined !== rawTable) tableToken.raw = rawTable;
        }
        return tableToken;
      },
    },
  };
  CLOSING_TO_OPENING = {
    '"': '"',
    "'": "'",
    ")": "(",
    "]": "[",
    "}": "{",
    ">": "<",
  };
  BACKSLASH_ESCAPE_RE = /^\\.[\p{L}\p{N}\\*_`~]/u;
  WORD_END_RE = /[\p{L}\p{N}].$/u;
  markedExtensions = {
    extensions: [
      {
        name: "wrappedBackslash",
        level: "inline",
        tokenizer(tokenizerMatch, siblingTokens) {
          let escapedChar = tokenizerMatch[1];
          if (tokenizerMatch[0] !== "\\" || escapedChar === undefined || this.lexer.state.inLink) return;
          let closingChar = CLOSING_TO_OPENING[escapedChar];
          let last = siblingTokens.at(-1);
          if (
            closingChar === undefined ||
            last?.type !== "text" ||
            !last.raw.endsWith(closingChar) ||
            WORD_END_RE.test(last.raw) ||
            BACKSLASH_ESCAPE_RE.test(tokenizerMatch)
          )
            return;
          let previousToken = siblingTokens.at(-2);
          if (
            last.raw === closingChar &&
            previousToken !== undefined &&
            previousToken.type !== "br" &&
            !(previousToken.type === "escape" && previousToken.text === previousToken.raw)
          )
            return;
          let escapedText = `\\${escapedChar}`;
          return {
            type: "escape",
            raw: escapedText,
            text: escapedText,
          };
        },
      },
    ],
  };
});
//@ chunk-wj577vf9.js:13024-13206 placement
function flattenDeepList(tokenizer, source) {
  if (
    !nestingGuard.isAtMaxNesting(tokenizer.lexer) ||
    !(tokenizer.rules.block.list.test(source) || tokenizer.rules.other.blockquoteStart.test(source))
  )
    return;
  let text = normalizeBlockText(source);
  return {
    raw: source,
    text,
    tokens: tokenizer.lexer.inline(text),
  };
}
export {
  renderWithSafeLinks,
  controlCharTokens,
  stripControlCharsForInline,
  markedConfigStateMemo,
  MARKED_CONFIG_CACHE_SIZE,
  markedExtensions,
  ESC_NON_CSI_RE,
  OSC8_LINK_PATTERN,
  C1_OSC_RE,
  ESC_NON_CSI_GLOBAL_RE,
  drawAround,
  WORD_BOUNDARY_PATTERNS,
  labelWithReset,
  afterStyleReset,
  labelWithHint,
  stripDecisionSurfaceChars,
  regExp_3,
  labelForLink,
};
