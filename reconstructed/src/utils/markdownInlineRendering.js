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
import { Yn } from "./stripAnsi.js";
import { sequential } from "./sequential.js";
import { dps, hf } from "./permissions/autoModeRulesPrompt.js";
import { W8e } from "../ink/wrapAnsi.js";
import { INVISIBLE_CHAR_CLASS } from "./pathSanitize.js";
import {
  isDecisionSurfaceControl,
  isCanonicalArtifactViewerUrl,
} from "../tools/ArtifactTool/artifactUrls.js";
import { Ze, escapePipesInCode, tableHasExtraCells } from "./markdown.js";
import { Ah, fSe } from "../../vendor/marked/lib/marked.esm.js";
import { ge } from "./identity.js";
import { Dc } from "../../vendor/lru-cache/dist/esm/index.min.js";
import { HostScoped } from "./hostScoped.js";
import { F, Ie } from "../ink/render-border.js";
import { ee, regExp, ke } from "./doctorContextWarnings.js";

//@ chunk-wj577vf9.js:7634-7772 placement
var MAX_PREVIEW_LINES = 6,
  MAX_PREVIEW_ROWS = 16,
  NEWLINE_STR = `
`,
  makeRows = (e) => ({ rows: e, isDone: !1 }),
  ensureTrailingNewline = (e) => (e === "" || e.endsWith(NEWLINE_STR) ? e : e + NEWLINE_STR),
  rowsOf = (e) => (e === "" ? [] : [makeRows(e)]),
  isNonBlankLine = (e) => Yn(e).trim() !== "";
//@ chunk-wj577vf9.js:7772-7876 placement = styleBorderLine (0.66)
function styleQuotedPreview(e) {
  let dim = sequential.dim(dps);
  return makeRows(
    e
      .split(NEWLINE_STR)
      .map((n) => (isNonBlankLine(n) ? `${dim} ${sequential.italic(n)}` : n))
      .join(NEWLINE_STR),
  );
}
//@ chunk-wj577vf9.js:7876-7972 placement
function Ae(e) {
  let trimEnd = `${dps} `.repeat(Math.max(0, e)).trimEnd();
  return trimEnd === "" ? "" : `${sequential.dim(trimEnd)} `;
}
//@ chunk-wj577vf9.js:7972-8158 placement
function quotedPreviewRows(e, t, n) {
  let r = Math.min(t + 1, MAX_PREVIEW_ROWS) - n.around,
    o = n.around === 0,
    s = Ae(o ? 1 : r),
    l = Ae(o ? r - 1 : 0),
    a = o ? sequential.italic : (c) => c;
  return {
    rows: ensureTrailingNewline(e)
      .split(NEWLINE_STR)
      .map((c) => (isNonBlankLine(c) ? s + a(l + c) : c))
      .join(NEWLINE_STR),
    isDone: !0,
  };
}
//@ chunk-wj577vf9.js:8158-8279 placement
function mergePreviewRows(e) {
  let t = [],
    n = "";
  for (let r of e)
    if (r.isDone) (t.push(...rowsOf(ensureTrailingNewline(n)), r), (n = ""));
    else n += r.rows;
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
var drawAround = (e, t, n) =>
  renderBlockquoteRows(e, t, { around: t, draw: n })
    .map((r) => r.rows)
    .join("");
//@ chunk-wj577vf9.js:8518-8655 placement
var CONTROL_CHAR_PATTERN = /[\x00-\x08\x0b-\x1f\x7f-\x9f]/,
  regExp_2 = new RegExp(`(?!${W8e(";:")})${CONTROL_CHAR_PATTERN.source}`, "g"),
  WCr = (e) =>
    e
      .replace(
        /\r\n?/g,
        `
`,
      )
      .replace(regExp_2, "");
//@ chunk-wj577vf9.js:8655-9130 placement
function controlCharTokens(e) {
  let n = e.some((s) => CONTROL_CHAR_PATTERN.test(s.raw)) ? [e] : [];
  for (let s of n)
    for (let [l, a] of Object.entries(s)) {
      let c = typeof a === "string" && l !== "href";
      if (typeof a === "object" && a !== null) n.push(a);
      else if (c) Reflect.set(s, l, WCr(a));
    }
  let any = n.some((s) =>
      Object.entries(s).some(([l, a]) => l !== "href" && typeof a === "string" && a.includes("\x1B")),
    ),
    filtered = n.filter(
      (s) => "type" in s && (s.type === "link" || s.type === "image" || s.type === "codespan"),
    );
  for (let s of any ? filtered : []) Object.assign(s, { afterStyle: !0 });
  return e;
}
//@ chunk-wj577vf9.js:9130-9221 placement
var WORD_BOUNDARY_PATTERNS = `
`,
  regExp_3 = new RegExp(`^[${INVISIBLE_CHAR_CLASS}]+`, "u"),
  regExp_4 = new RegExp(`(?:^|[^${INVISIBLE_CHAR_CLASS}])([${INVISIBLE_CHAR_CLASS}]*)$`, "u");
//@ chunk-wj577vf9.js:9221-9306 placement
function ce(e) {
  let t = regExp_4.exec(e)?.[1]?.length ?? 0;
  return t === 0 ? e : e.slice(0, e.length - t);
}
//@ chunk-wj577vf9.js:9306-9671 placement
var OSC8_LINK_PATTERN = /\x1b\]8;[^;\x07\x1b]*;([^\x07\x1b]*)(?:\x07|\x1b\\)/g,
  Wt = /\x9d|\x1b(?!\[)/,
  Bt = /\x9d/g,
  Ht = /\x1b(?!\[)/g,
  v = (e) =>
    Array.from(e)
      .filter((t) => {
        let n = t.codePointAt(0) ?? 0;
        return n !== 10697 && !isDecisionSurfaceControl(n);
      })
      .join(""),
  Ge = "\x1B[28m\x1B[39m\x1B[49m",
  z = (e) => ("afterStyle" in e && e.afterStyle === !0 ? Ge : ""),
  De = (e, t) => `${t}${v(e)}`,
  pe = (e, t, n = "") => `${t} (${v(e)}${n})`,
  fe = (e) => pe(e, Ge);
/**
 * 去掉嵌套或无效的 OSC 8 超链接序列，保留文本。
 */
//@ chunk-wj577vf9.js:9671-10714 placement
function stripNestedHyperlinks(e) {
  if (!e.includes("\x1B]8;")) return e;
  let t = [],
    n = null;
  for (let a of e.matchAll(OSC8_LINK_PATTERN)) {
    let c = a.index + a[0].length;
    if (n !== null)
      (t.push({ href: n.href, openEnd: n.openEnd, closeStart: a.index, closeEnd: c }), (n = null));
    let p = a[1] ?? "";
    if (p !== "") n = { href: p, openEnd: c };
  }
  if (n !== null) t.push({ href: n.href, openEnd: n.openEnd, closeStart: e.length, closeEnd: e.length });
  let r = "",
    o = 0,
    s = 0,
    l = !1;
  for (let a of t) {
    let index = e.lastIndexOf("\x1B]8;", a.openEnd - 1),
      p = ce(Yn(e.slice(0, index))),
      d = s;
    s = a.closeStart;
    let b = isCanonicalArtifactViewerUrl(a.href),
      S = l;
    if (((l = b), !b)) {
      let f = Yn(e.slice(d, index)),
        included = f.includes(hf),
        T = S && ce(f) === "";
      if (!included && !p.endsWith(hf) && !T) continue;
    } else if (!p.endsWith(hf)) continue;
    if (b) {
      let sliced = e.slice(a.openEnd, a.closeStart),
        h = Yn(sliced).startsWith(`${hf} `) ? sliced.indexOf(`${hf} `) : -1;
      if (h !== -1)
        ((r += e.slice(o, a.openEnd)),
          (r += sliced.slice(0, h)),
          (r += sliced.slice(h + hf.length + 1)),
          (o = a.closeStart));
      else {
        let sliced = e.slice(o, index),
          k = `${hf} `;
        if (sliced.endsWith(k)) {
          let sliced_2 = sliced.slice(0, -k.length);
          if (ce(Yn(r + sliced_2)).endsWith(hf)) ((r += sliced_2), (o = index));
        }
      }
      continue;
    }
    let y = fe(a.href),
      closeEnd = a.closeEnd;
    if (e.startsWith(y, closeEnd)) continue;
    ((r += e.slice(o, closeEnd) + y), (o = closeEnd));
  }
  return r + e.slice(o);
}
//@ chunk-wj577vf9.js:10714-10991 placement
function renderWithSafeLinks(e, t) {
  let n = t();
  if (!n.includes("\x1B]8;")) return n;
  let r = stripNestedHyperlinks(n);
  if (!n.includes(hf) && r === n) return n;
  let o = findSuspiciousCodespans(e ?? []);
  if (o.length === 0) return r;
  try {
    for (let s of o) Object.assign(s, { defanged: !0 });
    return stripNestedHyperlinks(t());
  } finally {
    for (let s of o) Reflect.deleteProperty(s, "defanged");
  }
}
//@ chunk-wj577vf9.js:10991-11181 placement
function findSuspiciousCodespans(e) {
  return e.flatMap((t) => {
    if (t.type === "codespan") return !("defanged" in t && t.defanged === !0) && Ze.test(t.text) ? [t] : [];
    return "tokens" in t && Array.isArray(t.tokens) ? findSuspiciousCodespans(t.tokens) : [];
  });
}
//@ chunk-wj577vf9.js:11181-11297 placement
class MarkedConfigState {
  #e = !1;
  get configured() {
    return this.#e;
  }
  set() {
    this.#e = !0;
  }
  reset() {
    ((this.#e = !1), Ah.setOptions(Ah.getDefaults()));
  }
}
//@ chunk-wj577vf9.js:11297-11330 placement
var $e = ge(new MarkedConfigState(), (e) => e.reset());
//@ chunk-wj577vf9.js:11330-11429 placement
class qe {
  #e = new Dc({ max: 200, ttl: 30000 });
  get(e) {
    return this.#e.get(e);
  }
  record(e, t) {
    this.#e.set(e, t);
  }
}
//@ chunk-wj577vf9.js:11429-13024 placement
var markdownRendererPool = new HostScoped(() => new qe()),
  table = fSe.prototype.table,
  blockquote = fSe.prototype.blockquote,
  list = fSe.prototype.list,
  emStrong = fSe.prototype.emStrong,
  Xe = {
    tokenizer: {
      del(e) {
        let match = /^~~(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))~~(?=[^~]|$)/.exec(e),
          n = match?.[1];
        if (!match || n === void 0) return;
        return { type: "del", raw: match[0], text: n, tokens: this.lexer.inlineTokens(n) };
      },
      blockquote(e) {
        return this.rules.other.blockquoteStart.test(e)
          ? F.lexLevel(this.lexer, () => blockquote.call(this, e))
          : void 0;
      },
      list(e) {
        return this.rules.block.list.test(e) ? F.lexLevel(this.lexer, () => list.call(this, e)) : void 0;
      },
      emStrong(e, t, n) {
        return this.rules.inline.emStrongLDelim.test(e)
          ? F.lexLevel(this.lexer, () => emStrong.call(this, e, t, n))
          : void 0;
      },
      paragraph(e) {
        let t = flattenDeepList(this, e);
        return t ? { type: "paragraph", ...t } : !1;
      },
      text(e) {
        let t = flattenDeepList(this, e);
        return t ? { type: "text", ...t } : !1;
      },
      def() {
        return;
      },
      lheading(e) {
        return (ee.isHeld() ? regExp.test(e) : ke.test(e)) ? !1 : void 0;
      },
      table(e) {
        let match = this.rules.block.table.exec(e);
        if (!match) return;
        let n = match[0],
          mapped = n
            .split(
              `
`,
            )
            .map(escapePipesInCode),
          joined = mapped.join(`
`),
          s = joined === n ? table.call(this, e) : table.call(this, joined + e.slice(n.length));
        if (s) {
          if (tableHasExtraCells(mapped, s.header.length)) return;
          if (joined !== n) s.raw = n;
        }
        return s;
      },
    },
  },
  Ft = { '"': '"', "'": "'", ")": "(", "]": "[", "}": "{", ">": "<" },
  Gt = /^\\.[\p{L}\p{N}\\*_`~]/u,
  Kt = /[\p{L}\p{N}].$/u,
  Qt = {
    extensions: [
      {
        name: "wrappedBackslash",
        level: "inline",
        tokenizer(e, t) {
          let n = e[1];
          if (e[0] !== "\\" || n === void 0 || this.lexer.state.inLink) return;
          let r = Ft[n],
            at = t.at(-1);
          if (r === void 0 || at?.type !== "text" || !at.raw.endsWith(r) || Kt.test(at.raw) || Gt.test(e))
            return;
          let at_2 = t.at(-2);
          if (
            at.raw === r &&
            at_2 !== void 0 &&
            at_2.type !== "br" &&
            !(at_2.type === "escape" && at_2.text === at_2.raw)
          )
            return;
          let l = `\\${n}`;
          return { type: "escape", raw: l, text: l };
        },
      },
    ],
  };
//@ chunk-wj577vf9.js:13024-13206 placement
function flattenDeepList(e, t) {
  if (!F.isAtMaxNesting(e.lexer) || !(e.rules.block.list.test(t) || e.rules.other.blockquoteStart.test(t)))
    return;
  let n = Ie(t);
  return { raw: t, text: n, tokens: e.lexer.inline(n) };
}

export {
  renderWithSafeLinks,
  controlCharTokens,
  WCr,
  $e,
  Xe,
  Qt,
  Wt,
  OSC8_LINK_PATTERN,
  Bt,
  Ht,
  drawAround,
  WORD_BOUNDARY_PATTERNS,
  De,
  z,
  pe,
  v,
  regExp_3,
  fe,
};
