/**
 * components/Markdown.tsx
 *
 * Markdown 渲染：marked lexer（带缓存）→ 令牌格式化为 ANSI 文本；表格交给 MarkdownTable；流式 Markdown 只重渲染末尾块。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Markdown.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-8wvtd8sr.js (2), chunk-wj577vf9.js (10)
 * attribution: fingerprint 3, affinity 1, placement 9
 */
import { hasActualOperatorNodes, isNotSpaceToken } from "../utils/markdownHeadings.js";
import { joinRawSegments } from "../ink/render-border.js";
import { Te, be, gfm } from "../utils/doctorContextWarnings.js";
import { applyMarkdown } from "../tools/ArtifactTool/markdownPage.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { qd } from "../hooks/useSettings.js";
import { Sz } from "../utils/cliHighlight.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PreviewBoxBody } from "./permissions/AskUserQuestionPermissionRequest/PreviewBox.js";

//@ chunk-wj577vf9.js:5806-5917 placement
function findLastContentTokenIndex(e) {
  let lastIndex = e.findLastIndex((r) => r.raw.trim() !== "");
  return hasActualOperatorNodes(e[lastIndex]) ? lastIndex : Math.max(e.findLastIndex(isNotSpaceToken), 0);
}
//@ chunk-wj577vf9.js:5917-5941 placement
var UPs = (e, t) => joinRawSegments(e) === t;
//@ chunk-wj577vf9.js:5941-6069 placement
function hasMarkdownSyntax(e, t, n) {
  let r = joinRawSegments(e.slice(0, t)),
    o = joinRawSegments(e.slice(t)),
    endsWith = n.endsWith(o);
  return n.startsWith(r) ? r.length : endsWith ? n.length - o.length : 0;
}
/**
 * 以第 t 个 token 为界把 marked token 列表拆成前后两段，求分界点在原始 Markdown 文本中的字符偏移（前缀匹配优先，否则按后缀对齐，都不符合时为 0）；用于流式渲染只重算末尾块。
 */
//@ chunk-wj577vf9.js:6069-6230 placement
function findTokenSplitOffset(e, t, n) {
  let r = joinRawSegments(e.slice(0, t)),
    o = joinRawSegments(e.slice(t)),
    s = r.length + o.length === n.length || n.startsWith(r),
    endsWith = n.endsWith(o);
  return s ? r.length : endsWith ? n.length - o.length : 0;
}
//@ chunk-wj577vf9.js:6230-6353 placement
function advancePastLines(e, t, n) {
  let r = t;
  for (let o = 0; o < n && r < e.length && r - t < n * Te; o++) {
    let index = e.indexOf(
      `
`,
      r,
    );
    r = index === -1 ? e.length : index + 1;
  }
  return r;
}
//@ chunk-wj577vf9.js:6353-6469 placement
function hasOverlongLine(e) {
  let t = 0,
    n = !1;
  while (!n && t < e.length) {
    let index = e.indexOf(
        `
`,
        t,
      ),
      o = index === -1 ? e.length : index;
    ((n = o - t > be), (t = o + 1));
  }
  return n;
}
//@ chunk-wj577vf9.js:6469-6556 placement
function re({ rest: rest, lines: lines }) {
  return rest.slice(0, advancePastLines(rest, gfm.fences.exec(rest)?.[0].length ?? 0, lines));
}
//@ chunk-wj577vf9.js:6556-6605 placement
function kt(e) {
  return e.rest.slice(re(e).length);
}
//@ chunk-wj577vf9.js:6605-6673 placement
function jCr(e) {
  return e.slice(
    0,
    e.indexOf(
      `
`,
      e.indexOf(`
`) + 1,
    ) + 1,
  );
}
//@ chunk-wj577vf9.js:7224-7263 fingerprint = MarkdownBody (0.598)
function MarkdownBody(t0) {
  return t0?.type === "table";
}
//@ chunk-8wvtd8sr.js:14093-14236 affinity
function isOnlyHtmlComments(e) {
  let trimmed = e.trim();
  while (trimmed.startsWith("<!--")) {
    let index = trimmed.indexOf("-->", 4);
    if (index === -1) return !1;
    trimmed = trimmed.slice(index + 3).trimStart();
  }
  return trimmed === "";
}
/**
 * 流式 Markdown：只对最后一个未闭合块重新 lex，前面已稳定的块复用。
 */
//@ chunk-8wvtd8sr.js:14236-14561 fingerprint = StreamingMarkdown (0.419)
function StreamingMarkdown(e, n) {
  let s;
  try {
    s = applyMarkdown(e);
  } catch {
    return null;
  }
  let r = 0;
  for (let h of s) {
    if (!e.startsWith(h.raw, r)) return null;
    let lastContentIdx = r + h.raw.length;
    if (lastContentIdx <= n || (r < n && e.slice(n, lastContentIdx).trim() === "")) {
      r = lastContentIdx;
      continue;
    }
    if (r < n) return null;
    if (h.type === "space" || (h.type === "html" && isOnlyHtmlComments(h.raw))) {
      r = lastContentIdx;
      continue;
    }
    return { token: h, offset: r, links: s.links ?? {} };
  }
  return null;
}
/**
 * Markdown 组件：用缓存的 marked lexer 切成令牌，表格令牌交给 MarkdownTable，其余经 formatToken 转 ANSI 文本后用 Ansi 渲染。
 */
//@ chunk-18hwfzwa.js:1271476-1271755 fingerprint = Markdown (0.848)
function Markdown(props) {
  let $ = w(5),
    settings = qd(),
    L;
  if ($[0] !== settings.syntaxHighlightingDisabled)
    ((L = settings.syntaxHighlightingDisabled ? null : Sz()),
      ($[0] = settings.syntaxHighlightingDisabled),
      ($[1] = L));
  else L = $[1];
  let ee = L,
    ke;
  if ($[2] !== ee || $[3] !== props)
    ((ke = e(PreviewBoxBody, { ...props, highlight: ee })), ($[2] = ee), ($[3] = props), ($[4] = ke));
  else ke = $[4];
  return ke;
}

export {
  findLastContentTokenIndex,
  findTokenSplitOffset,
  Markdown,
  re,
  hasOverlongLine,
  StreamingMarkdown,
  UPs,
  hasMarkdownSyntax,
  jCr,
  MarkdownBody,
  advancePastLines,
  kt,
};
