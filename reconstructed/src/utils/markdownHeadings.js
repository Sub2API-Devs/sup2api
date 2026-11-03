/**
 * utils/markdownHeadings.ts
 *
 * 2.1.316 新增：Markdown 标题解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wj577vf9.js (31)
 * attribution: placement 25, affinity 2, layout 4
 */
import {
  MarkdownBody,
  re,
  hasOverlongLine,
  findTokenSplitOffset,
  jCr,
  advancePastLines,
  kt,
} from "../components/Markdown.js";
import { ye, MARKDOWN_LIMITS, de, et, regExp, gfm, tt, nt, be, rt } from "./doctorContextWarnings.js";
import { f2 } from "../../vendor/marked/lib/marked.esm.js";
import { findLastStringToken } from "./bash/shellCompletion.js";
import { joinRawSegments } from "../ink/render-border.js";

/**
 * 提取表格/列表 token（doctor 的上下文警告用，切分可疑）。
 */
//@ chunk-wj577vf9.js:2258-2391 placement = checkAgentDescriptions (0.305)
function checkAgentDescriptions(agentInfo) {
  let t = "tokens" in agentInfo;
  return hasActualOperatorNodes(agentInfo)
    ? agentInfo.items
    : MarkdownBody(agentInfo)
      ? [...agentInfo.header, ...agentInfo.rows.flat()].flatMap((n) => n.tokens)
      : t
        ? (agentInfo.tokens ?? [])
        : [];
}
//@ chunk-wj577vf9.js:2391-2607 placement
function splitHeadingLines(e, t) {
  let n = [],
    r = lexResult(
      [],
      t.replace(
        ye,
        `
`,
      ),
      MARKDOWN_LIMITS,
    );
  while (r.rest !== "") {
    r = { declining: r.declining, ...lexDecliningBlock(e, r) };
    for (let o of r.taken) {
      let at = n.at(-1);
      at?.type === "space" && o.type === "space" ? (at.raw += o.raw) : n.push(o);
    }
  }
  return n;
}
//@ chunk-wj577vf9.js:2607-2785 placement
function lexDecliningBlock(e, t) {
  let n = re(t),
    { header: header = "", fromRow: fromRow = t.rest } = t.declining ?? {},
    s = n.length + fromRow.length <= t.rest.length && n.startsWith(header);
  return hasMatchingTextDeep(e, n)
    ? lexAsSingleParagraph(t.rest)
    : s
      ? te(e, t.rest)
      : lexTrimmedBlock(e, t, n);
}
//@ chunk-wj577vf9.js:2785-2931 placement
function hasMatchingTextDeep(e, t) {
  let r = hasOverlongLine(t) ? new f2(e.defaults).blockTokens(t) : [],
    o = !1;
  while (!o && r.length > 0)
    ((o = r.some((s) => getTokenTexts(s).some(hasOverlongLine))), (r = r.flatMap(checkAgentDescriptions)));
  return o;
}
//@ chunk-wj577vf9.js:2931-3069 placement
function getTokenTexts(e) {
  let t =
    (isParagraphToken(e) || e.type === "heading" || e.type === "text") &&
    "text" in e &&
    typeof e.text === "string";
  return MarkdownBody(e) ? [e.raw] : t ? [e.text] : [];
}
//@ chunk-wj577vf9.js:3069-3216 placement
function lexTrimmedBlock(e, t, n) {
  let lexer = e.lexer(n),
    s = n.length === t.rest.length ? lexer.length : findLastStringToken(lexer, n),
    l = findTokenSplitOffset(lexer, s, n);
  return l > 0
    ? lexResult(lexer.slice(0, s), t.rest.slice(l), MARKDOWN_LIMITS)
    : parseHeadingBlock(e, t, lexer);
}
//@ chunk-wj577vf9.js:3216-3472 placement
function parseHeadingBlock(e, t, n) {
  let [r] = n,
    o = n.length === 1,
    s = o && isParagraphToken(r) && !Le(t.rest),
    l = o && MarkdownBody(r),
    a = jCr(r?.raw ?? ""),
    c = t.declining?.fromRow ?? t.rest,
    p =
      l &&
      a.length + c.length <= t.rest.length &&
      !applyMarkdown(e, a + c.slice(0, advancePastLines(c, 0, 1)));
  return s
    ? lexParagraphToken(e, t.rest)
    : p
      ? te(e, t.rest)
      : l
        ? parseSetextHeading(e, r, t.rest)
        : resolveLeadingTokens(t, n);
}
//@ chunk-wj577vf9.js:3472-3687 placement
function resolveLeadingTokens(e, t) {
  let [n] = t,
    r = t.findLastIndex(isNotSpaceToken) <= 0,
    o = r && t.some(isBlankToken_2),
    s = e.lines < de && !(o && isParagraphToken(n)),
    l = r && hasActualOperatorNodes(n),
    a = r && (n?.type === "code" || (o && n?.type !== "html"));
  return s
    ? lexResult([], e.rest, de)
    : l
      ? lexListWithoutLastItem(e, n)
      : a
        ? lexResult(t, kt(e), e.lines)
        : lexAsSingleParagraph(e.rest);
}
//@ chunk-wj577vf9.js:3687-3829 placement
function lexListWithoutLastItem(e, t) {
  let sliced = t.items.slice(0, -1),
    r = joinRawSegments(sliced);
  return r !== "" && e.rest.startsWith(r)
    ? lexResult([wt(t, r, sliced)], e.rest.slice(r.length), e.lines)
    : lexAsSingleParagraph(e.rest);
}
//@ chunk-wj577vf9.js:3829-4008 placement
function lexParagraphToken(e, t) {
  let n = collectParagraphLines(t),
    r = advancePastLines(n.text, 0, et) === n.text.length && !hasOverlongLine(n.text);
  return lexResult(
    [{ ...n, tokens: r ? new f2(e.defaults).inlineTokens(n.text) : [makeTextToken(n.text)] }],
    t.slice(n.raw.length),
    MARKDOWN_LIMITS,
  );
}
//@ chunk-wj577vf9.js:4008-4041 placement
var te = (e, t) => (Le(t) ? lexAsSingleParagraph(t) : lexParagraphToken(e, t));
//@ chunk-wj577vf9.js:4041-4093 placement
function Le(e) {
  return regExp.test(e) && gfm.lheading.test(e);
}
//@ chunk-wj577vf9.js:4093-4285 placement
function collectParagraphLines(e) {
  let t = cachedLexer(),
    n = readParagraphLines(e, "");
  while (n.nextLines !== "")
    ((t.text +=
      t.raw === ""
        ? n.nextLines
        : `
${n.nextLines}`),
      (t.raw += n.nextLines + n.lineBreak),
      (n = readParagraphLines(n.isOpen ? e.slice(t.raw.length) : "", tt)));
  return t;
}
//@ chunk-wj577vf9.js:4285-4532 placement
function readParagraphLines(e, t) {
  let n = advancePastLines(e, 0, MARKDOWN_LIMITS),
    r =
      e[n - 1] ===
      `
`
        ? n - 1
        : n,
    sliced = (gfm.paragraph.exec(t + e.slice(0, advancePastLines(e, n, 1)))?.[0] ?? t).slice(t.length),
    sliced_2 = sliced.slice(0, r),
    l = sliced.length > r,
    a =
      l ||
      gfm.newline.exec(e.slice(sliced_2.length))?.[0] ===
        `
`;
  return {
    nextLines: sliced_2,
    lineBreak: a
      ? `
`
      : "",
    isOpen: l,
  };
}
//@ chunk-wj577vf9.js:4532-4850 placement
function parseSetextHeading(e, t, n) {
  let r = jCr(t.raw),
    o = measureTableLength(r, n),
    s = xe(n.slice(r.length, o), MARKDOWN_LIMITS),
    l = [],
    a = !1;
  while (!a && l.length < s.length) {
    let p = applyMarkdown(e, r + (s[l.length] ?? ""));
    ((a = p === void 0), p && l.push(p));
  }
  let c = n.slice(0, o) + (nt.exec(n.slice(o))?.[0] ?? "");
  return a
    ? headingConsumesRest(e, r, s.slice(0, l.length + 1), n)
    : lexResult(
        [
          xt(
            t,
            c,
            l.flatMap((p) => p.rows),
          ),
        ],
        n.slice(c.length),
        MARKDOWN_LIMITS,
      );
}
//@ chunk-wj577vf9.js:4850-5152 placement
function headingConsumesRest(e, t, n, r) {
  let o = te(e, r),
    s = t.length + n.join("").length,
    l = r.length - o.rest.length < s,
    a = l ? xe(n.at(-1) ?? "", 1) : [],
    floored = Math.floor(be / t.length),
    index = a.slice(0, floored).findIndex((S) => !applyMarkdown(e, t + S)),
    d = index >= 0 ? index : floored < a.length ? floored : 0,
    sliced = r.slice(s - a.slice(d).join("").length);
  return { ...o, declining: l ? { header: t, fromRow: sliced } : void 0 };
}
//@ chunk-wj577vf9.js:5152-5283 placement
function measureTableLength(e, t) {
  let n = e.length,
    r = n < t.length;
  while (r) {
    let sliced = t.slice(n, advancePastLines(t, n, MARKDOWN_LIMITS)),
      s = measureTableRow(e, sliced);
    ((n += s), (r = s === sliced.length && n < t.length));
  }
  return n;
}
//@ chunk-wj577vf9.js:5283-5422 placement
function measureTableRow(e, t) {
  let sliced = (gfm.table.exec(e + t)?.[0] ?? e).slice(e.length),
    replaced = sliced.replace(rt, "");
  return replaced !== "" && sliced.length > replaced.length ? replaced.length + 1 : replaced.length;
}
//@ chunk-wj577vf9.js:5422-5511 placement = applyMarkdown (0.759)
function applyMarkdown(e, t) {
  let [n] = hasOverlongLine(t) ? [] : e.lexer(t);
  return MarkdownBody(n) && n.raw.length === t.length ? n : void 0;
}
//@ chunk-wj577vf9.js:5511-5608 placement
function xe(e, t) {
  let n = [];
  for (let r = 0; r < e.length; r = advancePastLines(e, r, t)) n.push(e.slice(r, advancePastLines(e, r, t)));
  return n;
}
//@ chunk-wj577vf9.js:6673-6722 affinity
function lexResult(e, t, n) {
  return { taken: e, rest: t, lines: n };
}
//@ chunk-wj577vf9.js:6722-6759 affinity
function lexAsSingleParagraph(e) {
  return lexResult([makeParagraphToken(e)], "", MARKDOWN_LIMITS);
}
//@ chunk-wj577vf9.js:6759-6823 placement = cachedLexer (0.795)
function cachedLexer() {
  return { type: "paragraph", raw: "", text: "", tokens: [] };
}
//@ chunk-wj577vf9.js:6823-6891 layout = cachedLexer (0.795)
function makeParagraphToken(content) {
  return { type: "paragraph", raw: content, text: content, tokens: [makeTextToken(content)] };
}
//@ chunk-wj577vf9.js:6891-6950 layout
function makeTextToken(e) {
  return { type: "text", raw: e, text: e, escaped: !1 };
}
//@ chunk-wj577vf9.js:6950-6995 layout
function xt(e, t, n) {
  return { ...e, raw: t, rows: n };
}
//@ chunk-wj577vf9.js:6995-7041 layout
function wt(e, t, n) {
  return { ...e, raw: t, items: n };
}
//@ chunk-wj577vf9.js:7041-7080 placement = parseChord (1)
function isNotSpaceToken(input) {
  return input.type !== "space";
}
//@ chunk-wj577vf9.js:7080-7141 placement = parseChord (0.829)
function isBlankToken_2(input) {
  return (
    input.type === "space" ||
    input.raw.endsWith(`

`)
  );
}
//@ chunk-wj577vf9.js:7141-7185 placement
function isParagraphToken(e) {
  return e?.type === "paragraph";
}
//@ chunk-wj577vf9.js:7185-7224 placement = hasActualOperatorNodes (1)
function hasActualOperatorNodes(rootNode) {
  return rootNode?.type === "list";
}

export {
  isBlankToken_2,
  hasActualOperatorNodes,
  isNotSpaceToken,
  lexResult,
  splitHeadingLines,
  checkAgentDescriptions,
};
