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
  consumeFirstBlock,
  hasOverlongLine,
  findTokenSplitOffset,
  firstLine,
  advancePastLines,
  restAfterBlock,
} from "../components/Markdown.js";
import {
  CRLF_RE,
  MARKDOWN_LIMITS,
  MAX_MARKDOWN_BLOCK_CHARS,
  MAX_WINDOW_CHARS,
  regExp,
  GFM_RULES,
  PROBE_LINE,
  LEADING_NEWLINES_RE,
  SMALL_MARKDOWN_THRESHOLD,
  TRAILING_NEWLINES_RE,
} from "./doctorContextWarnings.js";
import { _Lexer } from "../../vendor/marked/lib/marked.esm.js";
import { findLastStringToken } from "./bash/shellCompletion.js";
import { joinRawSegments } from "../ink/render-border.js";

//@ chunk-wj577vf9.js:2258-2391 placement = checkAgentDescriptions (0.305)
/**
 * 提取表格/列表 token（doctor 的上下文警告用，切分可疑）。
 */
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
  let n = [];
  let r = lexResult(
    [],
    t.replace(
      CRLF_RE,
      `
`,
    ),
    MARKDOWN_LIMITS,
  );
  while (r.rest !== "") {
    r = {
      declining: r.declining,
      ...lexDecliningBlock(e, r),
    };
    for (let o of r.taken) {
      let last = n.at(-1);
      if (last?.type === "space" && o.type === "space") last.raw += o.raw;
      else n.push(o);
    }
  }
  return n;
}
//@ chunk-wj577vf9.js:2607-2785 placement
function lexDecliningBlock(e, t) {
  let n = consumeFirstBlock(t);
  let { header = "", fromRow = t.rest } = t.declining ?? {};
  let s = n.length + fromRow.length <= t.rest.length && n.startsWith(header);
  return hasMatchingTextDeep(e, n)
    ? lexAsSingleParagraph(t.rest)
    : s
      ? headingTokenToBlock(e, t.rest)
      : lexTrimmedBlock(e, t, n);
}
//@ chunk-wj577vf9.js:2785-2931 placement
function hasMatchingTextDeep(e, t) {
  let r = hasOverlongLine(t) ? new _Lexer(e.defaults).blockTokens(t) : [];
  let o = false;
  while (!o && r.length > 0) {
    o = r.some((s) => getTokenTexts(s).some(hasOverlongLine));
    r = r.flatMap(checkAgentDescriptions);
  }
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
  let r = e.lexer(n);
  let s = n.length === t.rest.length ? r.length : findLastStringToken(r, n);
  let tokenSplitOffset = findTokenSplitOffset(r, s, n);
  return tokenSplitOffset > 0
    ? lexResult(r.slice(0, s), t.rest.slice(tokenSplitOffset), MARKDOWN_LIMITS)
    : parseHeadingBlock(e, t, r);
}
//@ chunk-wj577vf9.js:3216-3472 placement
function parseHeadingBlock(e, t, n) {
  let [r] = n;
  let o = n.length === 1;
  let s = o && isParagraphToken(r) && !isLheadingStart(t.rest);
  let l = o && MarkdownBody(r);
  let a = firstLine(r?.raw ?? "");
  let c = t.declining?.fromRow ?? t.rest;
  let p =
    l && a.length + c.length <= t.rest.length && !applyMarkdown(e, a + c.slice(0, advancePastLines(c, 0, 1)));
  return s
    ? lexParagraphToken(e, t.rest)
    : p
      ? headingTokenToBlock(e, t.rest)
      : l
        ? parseSetextHeading(e, r, t.rest)
        : resolveLeadingTokens(t, n);
}
//@ chunk-wj577vf9.js:3472-3687 placement
function resolveLeadingTokens(e, t) {
  let [rootNode] = t;
  let r = t.findLastIndex(isNotSpaceToken) <= 0;
  let o = r && t.some(isBlankToken_2);
  let s = e.lines < MAX_MARKDOWN_BLOCK_CHARS && !(o && isParagraphToken(rootNode));
  let l = r && hasActualOperatorNodes(rootNode);
  let a = r && (rootNode?.type === "code" || (o && rootNode?.type !== "html"));
  return s
    ? lexResult([], e.rest, MAX_MARKDOWN_BLOCK_CHARS)
    : l
      ? lexListWithoutLastItem(e, rootNode)
      : a
        ? lexResult(t, restAfterBlock(e), e.lines)
        : lexAsSingleParagraph(e.rest);
}
//@ chunk-wj577vf9.js:3687-3829 placement
function lexListWithoutLastItem(e, t) {
  let sliced = t.items.slice(0, -1);
  let raw = joinRawSegments(sliced);
  return raw !== "" && e.rest.startsWith(raw)
    ? lexResult([withRawItems(t, raw, sliced)], e.rest.slice(raw.length), e.lines)
    : lexAsSingleParagraph(e.rest);
}
//@ chunk-wj577vf9.js:3829-4008 placement
function lexParagraphToken(e, t) {
  let paragraphLines = collectParagraphLines(t);
  let r =
    advancePastLines(paragraphLines.text, 0, MAX_WINDOW_CHARS) === paragraphLines.text.length &&
    !hasOverlongLine(paragraphLines.text);
  return lexResult(
    [
      {
        ...paragraphLines,
        tokens: r
          ? new _Lexer(e.defaults).inlineTokens(paragraphLines.text)
          : [makeTextToken(paragraphLines.text)],
      },
    ],
    t.slice(paragraphLines.raw.length),
    MARKDOWN_LIMITS,
  );
}
//@ chunk-wj577vf9.js:4008-4041 placement
var headingTokenToBlock = (e, t) => (isLheadingStart(t) ? lexAsSingleParagraph(t) : lexParagraphToken(e, t));
//@ chunk-wj577vf9.js:4041-4093 placement
function isLheadingStart(e) {
  return regExp.test(e) && GFM_RULES.lheading.test(e);
}
//@ chunk-wj577vf9.js:4093-4285 placement
function collectParagraphLines(e) {
  let t = cachedLexer();
  let paragraphLines = readParagraphLines(e, "");
  while (paragraphLines.nextLines !== "") {
    t.text +=
      t.raw === ""
        ? paragraphLines.nextLines
        : `
${paragraphLines.nextLines}`;
    t.raw += paragraphLines.nextLines + paragraphLines.lineBreak;
    paragraphLines = readParagraphLines(paragraphLines.isOpen ? e.slice(t.raw.length) : "", PROBE_LINE);
  }
  return t;
}
//@ chunk-wj577vf9.js:4285-4532 placement
function readParagraphLines(e, t) {
  let n = advancePastLines(e, 0, MARKDOWN_LIMITS);
  let r =
    e[n - 1] ===
    `
`
      ? n - 1
      : n;
  let sliced = (GFM_RULES.paragraph.exec(t + e.slice(0, advancePastLines(e, n, 1)))?.[0] ?? t).slice(
    t.length,
  );
  let sliced_2 = sliced.slice(0, r);
  let l = sliced.length > r;
  let a =
    l ||
    GFM_RULES.newline.exec(e.slice(sliced_2.length))?.[0] ===
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
  let r = firstLine(t.raw);
  let o = measureTableLength(r, n);
  let s = splitBlockRanges(n.slice(r.length, o), MARKDOWN_LIMITS);
  let l = [];
  let a = false;
  while (!a && l.length < s.length) {
    let p = applyMarkdown(e, r + (s[l.length] ?? ""));
    a = p === undefined;
    if (p) l.push(p);
  }
  let raw = n.slice(0, o) + (LEADING_NEWLINES_RE.exec(n.slice(o))?.[0] ?? "");
  return a
    ? headingConsumesRest(e, r, s.slice(0, l.length + 1), n)
    : lexResult(
        [
          withRawRows(
            t,
            raw,
            l.flatMap((p) => p.rows),
          ),
        ],
        n.slice(raw.length),
        MARKDOWN_LIMITS,
      );
}
//@ chunk-wj577vf9.js:4850-5152 placement
function headingConsumesRest(e, t, n, r) {
  let o = headingTokenToBlock(e, r);
  let s = t.length + n.join("").length;
  let l = r.length - o.rest.length < s;
  let a = l ? splitBlockRanges(n.at(-1) ?? "", 1) : [];
  let floored = Math.floor(SMALL_MARKDOWN_THRESHOLD / t.length);
  let index = a.slice(0, floored).findIndex((S) => !applyMarkdown(e, t + S));
  let d = index >= 0 ? index : floored < a.length ? floored : 0;
  let fromRow = r.slice(s - a.slice(d).join("").length);
  return {
    ...o,
    declining: l
      ? {
          header: t,
          fromRow,
        }
      : undefined,
  };
}
//@ chunk-wj577vf9.js:5152-5283 placement
function measureTableLength(e, t) {
  let n = e.length;
  let r = n < t.length;
  while (r) {
    let sliced = t.slice(n, advancePastLines(t, n, MARKDOWN_LIMITS));
    let s = measureTableRow(e, sliced);
    n += s;
    r = s === sliced.length && n < t.length;
  }
  return n;
}
//@ chunk-wj577vf9.js:5283-5422 placement
function measureTableRow(e, t) {
  let sliced = (GFM_RULES.table.exec(e + t)?.[0] ?? e).slice(e.length);
  let replaced = sliced.replace(TRAILING_NEWLINES_RE, "");
  return replaced !== "" && sliced.length > replaced.length ? replaced.length + 1 : replaced.length;
}
//@ chunk-wj577vf9.js:5422-5511 placement = applyMarkdown (0.759)
function applyMarkdown(e, t) {
  let [n] = hasOverlongLine(t) ? [] : e.lexer(t);
  return MarkdownBody(n) && n.raw.length === t.length ? n : undefined;
}
//@ chunk-wj577vf9.js:5511-5608 placement
function splitBlockRanges(e, t) {
  let n = [];
  for (let r = 0; r < e.length; r = advancePastLines(e, r, t)) n.push(e.slice(r, advancePastLines(e, r, t)));
  return n;
}
//@ chunk-wj577vf9.js:6673-6722 affinity
function lexResult(taken, rest, lines) {
  return {
    taken,
    rest,
    lines,
  };
}
//@ chunk-wj577vf9.js:6722-6759 affinity
function lexAsSingleParagraph(content) {
  return lexResult([makeParagraphToken(content)], "", MARKDOWN_LIMITS);
}
//@ chunk-wj577vf9.js:6759-6823 placement = cachedLexer (0.795)
function cachedLexer() {
  return {
    type: "paragraph",
    raw: "",
    text: "",
    tokens: [],
  };
}
//@ chunk-wj577vf9.js:6823-6891 layout = cachedLexer (0.795)
function makeParagraphToken(content) {
  return {
    type: "paragraph",
    raw: content,
    text: content,
    tokens: [makeTextToken(content)],
  };
}
//@ chunk-wj577vf9.js:6891-6950 layout
function makeTextToken(e) {
  return {
    type: "text",
    raw: e,
    text: e,
    escaped: false,
  };
}
//@ chunk-wj577vf9.js:6950-6995 layout
function withRawRows(e, raw, rows) {
  return {
    ...e,
    raw,
    rows,
  };
}
//@ chunk-wj577vf9.js:6995-7041 layout
function withRawItems(e, raw, items) {
  return {
    ...e,
    raw,
    items,
  };
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
