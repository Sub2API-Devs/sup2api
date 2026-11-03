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
import { VERTICAL_LEFT_BAR_GLYPH, BOXED_DIAMOND_GLYPH } from "./permissions/autoModeRulesPrompt.js";
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

//@ chunk-wj577vf9.js:7634-7772 placement
var MAX_PREVIEW_LINES = 6;
var MAX_PREVIEW_ROWS = 16;
var NEWLINE_STR = `
`;
var makeRows = (rows) => ({
  rows,
  isDone: false,
});
var ensureTrailingNewline = (e) => (e === "" || e.endsWith(NEWLINE_STR) ? e : e + NEWLINE_STR);
var rowsOf = (rows) => (rows === "" ? [] : [makeRows(rows)]);
var isNonBlankLine = (e) => stripAnsi(e).trim() !== "";
//@ chunk-wj577vf9.js:7772-7876 placement = styleBorderLine (0.66)
function styleQuotedPreview(e) {
  let t = sequential.dim(VERTICAL_LEFT_BAR_GLYPH);
  return makeRows(
    e
      .split(NEWLINE_STR)
      .map((n) => (isNonBlankLine(n) ? `${t} ${sequential.italic(n)}` : n))
      .join(NEWLINE_STR),
  );
}
//@ chunk-wj577vf9.js:7876-7972 placement
function gutterPrefix(e) {
  let t = `${VERTICAL_LEFT_BAR_GLYPH} `.repeat(Math.max(0, e)).trimEnd();
  return t === "" ? "" : `${sequential.dim(t)} `;
}
//@ chunk-wj577vf9.js:7972-8158 placement
function quotedPreviewRows(e, t, n) {
  let r = Math.min(t + 1, MAX_PREVIEW_ROWS) - n.around;
  let o = n.around === 0;
  let s = gutterPrefix(o ? 1 : r);
  let l = gutterPrefix(o ? r - 1 : 0);
  let a = o ? sequential.italic : (c) => c;
  return {
    rows: ensureTrailingNewline(e)
      .split(NEWLINE_STR)
      .map((c) => (isNonBlankLine(c) ? s + a(l + c) : c))
      .join(NEWLINE_STR),
    isDone: true,
  };
}
//@ chunk-wj577vf9.js:8158-8279 placement
function mergePreviewRows(e) {
  let t = [];
  let n = "";
  for (let r of e)
    if (r.isDone) {
      t.push(...rowsOf(ensureTrailingNewline(n)), r);
      n = "";
    } else n += r.rows;
  return [...t, ...rowsOf(n)];
}
//@ chunk-wj577vf9.js:8279-8450 placement
function renderBlockquoteRows(e, t, n) {
  let o = t < MAX_PREVIEW_LINES ? styleQuotedPreview : (s) => quotedPreviewRows(s, t, n);
  return mergePreviewRows(
    e.flatMap((s) =>
      s.type === "blockquote" ? renderBlockquoteRows(s.tokens ?? [], t + 1, n) : [makeRows(n.draw(s, t + 1))],
    ),
  ).map((s) => (s.isDone ? s : o(s.rows)));
}
//@ chunk-wj577vf9.js:8450-8518 placement
var drawAround = (e, quotesAround, draw) =>
  renderBlockquoteRows(e, quotesAround, {
    around: quotesAround,
    draw,
  })
    .map((r) => r.rows)
    .join("");
//@ chunk-wj577vf9.js:8518-8655 placement
/**
 * 去除内联文本中的控制字符（保留行分隔符等）。
 */
var CONTROL_CHAR_PATTERN = /[\x00-\x08\x0b-\x1f\x7f-\x9f]/;
var regExp_2 = new RegExp(`(?!${sgrPatternSource(";:")})${CONTROL_CHAR_PATTERN.source}`, "g");
var stripControlCharsForInline = (e) =>
  e
    .replace(
      /\r\n?/g,
      `
`,
    )
    .replace(regExp_2, "");
//@ chunk-wj577vf9.js:8655-9130 placement
function controlCharTokens(tokens) {
  let n = tokens.some((s) => CONTROL_CHAR_PATTERN.test(s.raw)) ? [tokens] : [];
  for (let s of n)
    for (let [key, value] of Object.entries(s)) {
      let c = typeof value === "string" && key !== "href";
      if (typeof value === "object" && value !== null) n.push(value);
      else if (c) Reflect.set(s, key, stripControlCharsForInline(value));
    }
  let any = n.some((s) =>
    Object.entries(s).some(
      ([key, value]) => key !== "href" && typeof value === "string" && value.includes("\x1B"),
    ),
  );
  let filtered = n.filter(
    (s) => "type" in s && (s.type === "link" || s.type === "image" || s.type === "codespan"),
  );
  for (let s of any ? filtered : [])
    Object.assign(s, {
      afterStyle: true,
    });
  return tokens;
}
//@ chunk-wj577vf9.js:9130-9221 placement
var WORD_BOUNDARY_PATTERNS = `
`;
var regExp_3 = new RegExp(`^[${INVISIBLE_CHAR_CLASS}]+`, "u");
var regExp_4 = new RegExp(`(?:^|[^${INVISIBLE_CHAR_CLASS}])([${INVISIBLE_CHAR_CLASS}]*)$`, "u");
//@ chunk-wj577vf9.js:9221-9306 placement
function stripTrailingLinkHint(e) {
  let t = regExp_4.exec(e)?.[1]?.length ?? 0;
  return t === 0 ? e : e.slice(0, e.length - t);
}
//@ chunk-wj577vf9.js:9306-9671 placement
/**
 * OSC 8 超链接与游离 ESC/C1 序列正则，以及去掉决策面控制字符的函数。
 */
var OSC8_LINK_PATTERN = /\x1b\]8;[^;\x07\x1b]*;([^\x07\x1b]*)(?:\x07|\x1b\\)/g;
var ESC_NON_CSI_RE = /\x9d|\x1b(?!\[)/;
var C1_OSC_RE = /\x9d/g;
var ESC_NON_CSI_GLOBAL_RE = /\x1b(?!\[)/g;
var stripDecisionSurfaceChars = (e) =>
  Array.from(e)
    .filter((t) => {
      let n = t.codePointAt(0) ?? 0;
      return n !== 10697 && !isDecisionSurfaceControl(n);
    })
    .join("");
var SGR_RESET_SEQUENCE = "\x1B[28m\x1B[39m\x1B[49m";
var afterStyleReset = (e) => ("afterStyle" in e && e.afterStyle === true ? SGR_RESET_SEQUENCE : "");
var labelWithReset = (e, t) => `${t}${stripDecisionSurfaceChars(e)}`;
var labelWithHint = (e, t, n = "") => `${t} (${stripDecisionSurfaceChars(e)}${n})`;
var labelForLink = (e) => labelWithHint(e, SGR_RESET_SEQUENCE);
//@ chunk-wj577vf9.js:9671-10714 placement
/**
 * 去掉嵌套或无效的 OSC 8 超链接序列，保留文本。
 */
function stripNestedHyperlinks(e) {
  if (!e.includes("\x1B]8;")) return e;
  let t = [];
  let n = null;
  for (let a of e.matchAll(OSC8_LINK_PATTERN)) {
    let c = a.index + a[0].length;
    if (n !== null) {
      t.push({
        href: n.href,
        openEnd: n.openEnd,
        closeStart: a.index,
        closeEnd: c,
      });
      n = null;
    }
    let p = a[1] ?? "";
    if (p !== "")
      n = {
        href: p,
        openEnd: c,
      };
  }
  if (n !== null)
    t.push({
      href: n.href,
      openEnd: n.openEnd,
      closeStart: e.length,
      closeEnd: e.length,
    });
  let r = "";
  let o = 0;
  let s = 0;
  let l = false;
  for (let a of t) {
    let index = e.lastIndexOf("\x1B]8;", a.openEnd - 1);
    let p = stripTrailingLinkHint(stripAnsi(e.slice(0, index)));
    let d = s;
    s = a.closeStart;
    let b = isCanonicalArtifactViewerUrl(a.href);
    let S = l;
    l = b;
    if (!b) {
      let f = stripAnsi(e.slice(d, index));
      let included = f.includes(BOXED_DIAMOND_GLYPH);
      let T = S && stripTrailingLinkHint(f) === "";
      if (!included && !p.endsWith(BOXED_DIAMOND_GLYPH) && !T) continue;
    } else if (!p.endsWith(BOXED_DIAMOND_GLYPH)) continue;
    if (b) {
      let sliced = e.slice(a.openEnd, a.closeStart);
      let h = stripAnsi(sliced).startsWith(`${BOXED_DIAMOND_GLYPH} `)
        ? sliced.indexOf(`${BOXED_DIAMOND_GLYPH} `)
        : -1;
      if (h !== -1) {
        r += e.slice(o, a.openEnd);
        r += sliced.slice(0, h);
        r += sliced.slice(h + BOXED_DIAMOND_GLYPH.length + 1);
        o = a.closeStart;
      } else {
        let sliced = e.slice(o, index);
        let k = `${BOXED_DIAMOND_GLYPH} `;
        if (sliced.endsWith(k)) {
          let sliced_2 = sliced.slice(0, -k.length);
          if (stripTrailingLinkHint(stripAnsi(r + sliced_2)).endsWith(BOXED_DIAMOND_GLYPH)) {
            r += sliced_2;
            o = index;
          }
        }
      }
      continue;
    }
    let y = labelForLink(a.href);
    let closeEnd = a.closeEnd;
    if (e.startsWith(y, closeEnd)) continue;
    r += e.slice(o, closeEnd) + y;
    o = closeEnd;
  }
  return r + e.slice(o);
}
//@ chunk-wj577vf9.js:10714-10991 placement
function renderWithSafeLinks(tokens, t) {
  let n = t();
  if (!n.includes("\x1B]8;")) return n;
  let r = stripNestedHyperlinks(n);
  if (!n.includes(BOXED_DIAMOND_GLYPH) && r === n) return n;
  let suspiciousCodespans = findSuspiciousCodespans(tokens ?? []);
  if (suspiciousCodespans.length === 0) return r;
  try {
    for (let suspiciousCodespan of suspiciousCodespans)
      Object.assign(suspiciousCodespan, {
        defanged: true,
      });
    return stripNestedHyperlinks(t());
  } finally {
    for (let suspiciousCodespan of suspiciousCodespans)
      Reflect.deleteProperty(suspiciousCodespan, "defanged");
  }
}
//@ chunk-wj577vf9.js:10991-11181 placement
function findSuspiciousCodespans(tokens) {
  return tokens.flatMap((t) => {
    if (t.type === "codespan")
      return !("defanged" in t && t.defanged === true) && HTTP_URL_RE.test(t.text) ? [t] : [];
    return "tokens" in t && Array.isArray(t.tokens) ? findSuspiciousCodespans(t.tokens) : [];
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
var markedConfigStateMemo = identity(new MarkedConfigState(), (e) => e.reset());
//@ chunk-wj577vf9.js:11330-11429 placement
class MarkedConfigCache {
  #e = new LRUCache({
    max: 200,
    ttl: 30000,
  });
  get(e) {
    return this.#e.get(e);
  }
  record(e, t) {
    this.#e.set(e, t);
  }
}
//@ chunk-wj577vf9.js:11429-13024 placement
/**
 * marked 渲染器池、扩展原型方法与渲染配置（后台词、表格、列表、加粗、代码管道转义等）。
 */
var markdownRendererPool = new HostScoped(() => new MarkedConfigCache());
var table = _Tokenizer.prototype.table;
var blockquote = _Tokenizer.prototype.blockquote;
var list = _Tokenizer.prototype.list;
var emStrong = _Tokenizer.prototype.emStrong;
var MARKED_CONFIG_CACHE_SIZE = {
  tokenizer: {
    del(e) {
      let match = /^~~(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))~~(?=[^~]|$)/.exec(e);
      let n = match?.[1];
      if (!match || n === undefined) return;
      return {
        type: "del",
        raw: match[0],
        text: n,
        tokens: this.lexer.inlineTokens(n),
      };
    },
    blockquote(e) {
      return this.rules.other.blockquoteStart.test(e)
        ? nestingGuard.lexLevel(this.lexer, () => blockquote.call(this, e))
        : undefined;
    },
    list(e) {
      return this.rules.block.list.test(e)
        ? nestingGuard.lexLevel(this.lexer, () => list.call(this, e))
        : undefined;
    },
    emStrong(e, t, n) {
      return this.rules.inline.emStrongLDelim.test(e)
        ? nestingGuard.lexLevel(this.lexer, () => emStrong.call(this, e, t, n))
        : undefined;
    },
    paragraph(e) {
      let t = flattenDeepList(this, e);
      return t
        ? {
            type: "paragraph",
            ...t,
          }
        : false;
    },
    text(e) {
      let t = flattenDeepList(this, e);
      return t
        ? {
            type: "text",
            ...t,
          }
        : false;
    },
    def() {
      return;
    },
    lheading(e) {
      return (markdownHeldGuard.isHeld() ? regExp.test(e) : MARKDOWN_LIMITS_2.test(e)) ? false : undefined;
    },
    table(e) {
      let match = this.rules.block.table.exec(e);
      if (!match) return;
      let n = match[0];
      let mapped = n
        .split(
          `
`,
        )
        .map(escapePipesInCode);
      let joined = mapped.join(`
`);
      let s = joined === n ? table.call(this, e) : table.call(this, joined + e.slice(n.length));
      if (s) {
        if (tableHasExtraCells(mapped, s.header.length)) return;
        if (joined !== n) s.raw = n;
      }
      return s;
    },
  },
};
var CLOSING_TO_OPENING = {
  '"': '"',
  "'": "'",
  ")": "(",
  "]": "[",
  "}": "{",
  ">": "<",
};
var BACKSLASH_ESCAPE_RE = /^\\.[\p{L}\p{N}\\*_`~]/u;
var WORD_END_RE = /[\p{L}\p{N}].$/u;
var markedExtensions = {
  extensions: [
    {
      name: "wrappedBackslash",
      level: "inline",
      tokenizer(e, t) {
        let n = e[1];
        if (e[0] !== "\\" || n === undefined || this.lexer.state.inLink) return;
        let r = CLOSING_TO_OPENING[n];
        let last = t.at(-1);
        if (
          r === undefined ||
          last?.type !== "text" ||
          !last.raw.endsWith(r) ||
          WORD_END_RE.test(last.raw) ||
          BACKSLASH_ESCAPE_RE.test(e)
        )
          return;
        let s = t.at(-2);
        if (
          last.raw === r &&
          s !== undefined &&
          s.type !== "br" &&
          !(s.type === "escape" && s.text === s.raw)
        )
          return;
        let l = `\\${n}`;
        return {
          type: "escape",
          raw: l,
          text: l,
        };
      },
    },
  ],
};
//@ chunk-wj577vf9.js:13024-13206 placement
function flattenDeepList(e, t) {
  if (
    !nestingGuard.isAtMaxNesting(e.lexer) ||
    !(e.rules.block.list.test(t) || e.rules.other.blockquoteStart.test(t))
  )
    return;
  let n = normalizeBlockText(t);
  return {
    raw: t,
    text: n,
    tokens: e.lexer.inline(n),
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
