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
import { MAX_MARKDOWN_BLOCKS, SMALL_MARKDOWN_THRESHOLD, GFM_RULES } from "../utils/doctorContextWarnings.js";
import { applyMarkdown } from "../tools/ArtifactTool/markdownPage.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useSettingsState } from "../hooks/useSettings.js";
import { getCliHighlightModule } from "../utils/cliHighlight.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PreviewBoxBody } from "./permissions/AskUserQuestionPermissionRequest/PreviewBox.js";

//@ chunk-wj577vf9.js:5806-5917 placement
function findLastContentTokenIndex(e) {
  let lastIndex = e.findLastIndex((r) => r.raw.trim() !== "");
  return hasActualOperatorNodes(e[lastIndex]) ? lastIndex : Math.max(e.findLastIndex(isNotSpaceToken), 0);
}
//@ chunk-wj577vf9.js:5917-5941 placement
/**
 * 导出值：endsWith（字符串以某后缀结尾）；位于「Markdown 渲染：marked lexer（带缓存）→ 令牌格式化为 ANSI 文本；表格交给 MarkdownTable；流式 Markdown 只重渲染末尾块」模块。
 */
var endsWith = (tokens, t) => joinRawSegments(tokens) === t;
//@ chunk-wj577vf9.js:5941-6069 placement
function hasMarkdownSyntax(tokens, t, n) {
  let r = joinRawSegments(tokens.slice(0, t));
  let o = joinRawSegments(tokens.slice(t));
  let s = n.endsWith(o);
  return n.startsWith(r) ? r.length : s ? n.length - o.length : 0;
}
//@ chunk-wj577vf9.js:6069-6230 placement
/**
 * 以第 t 个 token 为界把 marked token 列表拆成前后两段，求分界点在原始 Markdown 文本中的字符偏移（前缀匹配优先，否则按后缀对齐，都不符合时为 0）；用于流式渲染只重算末尾块。
 */
function findTokenSplitOffset(e, t, n) {
  let r = joinRawSegments(e.slice(0, t));
  let o = joinRawSegments(e.slice(t));
  let s = r.length + o.length === n.length || n.startsWith(r);
  let l = n.endsWith(o);
  return s ? r.length : l ? n.length - o.length : 0;
}
//@ chunk-wj577vf9.js:6230-6353 placement
function advancePastLines(e, t, n) {
  let r = t;
  for (let k = 0; k < n && r < e.length && r - t < n * MAX_MARKDOWN_BLOCKS; k++) {
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
  let t = 0;
  let n = false;
  while (!n && t < e.length) {
    let index = e.indexOf(
      `
`,
      t,
    );
    let o = index === -1 ? e.length : index;
    n = o - t > SMALL_MARKDOWN_THRESHOLD;
    t = o + 1;
  }
  return n;
}
//@ chunk-wj577vf9.js:6469-6556 placement
function consumeFirstBlock({ rest, lines }) {
  return rest.slice(0, advancePastLines(rest, GFM_RULES.fences.exec(rest)?.[0].length ?? 0, lines));
}
//@ chunk-wj577vf9.js:6556-6605 placement
function restAfterBlock(e) {
  return e.rest.slice(consumeFirstBlock(e).length);
}
//@ chunk-wj577vf9.js:6605-6673 placement
/**
 * 函数 firstLine（取第一行文本）；位于「Markdown 渲染：marked lexer（带缓存）→ 令牌格式化为 ANSI 文本；表格交给 MarkdownTable；流式 Markdown 只重渲染末尾块」模块。
 */
function firstLine(raw) {
  return raw.slice(
    0,
    raw.indexOf(
      `
`,
      raw.indexOf(`
`) + 1,
    ) + 1,
  );
}
//@ chunk-wj577vf9.js:7224-7263 fingerprint = MarkdownBody (0.598)
function MarkdownBody(t0) {
  return t0?.type === "table";
}
//@ chunk-8wvtd8sr.js:14093-14236 affinity
function isOnlyHtmlComments(raw) {
  let trimmed = raw.trim();
  while (trimmed.startsWith("<!--")) {
    let index = trimmed.indexOf("-->", 4);
    if (index === -1) return false;
    trimmed = trimmed.slice(index + 3).trimStart();
  }
  return trimmed === "";
}
//@ chunk-8wvtd8sr.js:14236-14561 fingerprint = StreamingMarkdown (0.419)
/**
 * 流式 Markdown：只对最后一个未闭合块重新 lex，前面已稳定的块复用。
 */
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
    return {
      token: h,
      offset: r,
      links: s.links ?? {},
    };
  }
  return null;
}
//@ chunk-18hwfzwa.js:1271476-1271755 fingerprint = Markdown (0.848)
/**
 * Markdown 组件：用缓存的 marked lexer 切成令牌，表格令牌交给 MarkdownTable，其余经 formatToken 转 ANSI 文本后用 Ansi 渲染。
 */
function Markdown(props) {
  let $ = w(5);
  let settings = useSettingsState();
  let L;
  if ($[0] !== settings.syntaxHighlightingDisabled) {
    L = settings.syntaxHighlightingDisabled ? null : getCliHighlightModule();
    $[0] = settings.syntaxHighlightingDisabled;
    $[1] = L;
  } else L = $[1];
  let highlight = L;
  let t0;
  if ($[2] !== highlight || $[3] !== props) {
    t0 = jsxProd_default(PreviewBoxBody, {
      ...props,
      highlight,
    });
    $[2] = highlight;
    $[3] = props;
    $[4] = t0;
  } else t0 = $[4];
  return t0;
}
export {
  findLastContentTokenIndex,
  findTokenSplitOffset,
  Markdown,
  consumeFirstBlock,
  hasOverlongLine,
  StreamingMarkdown,
  endsWith,
  hasMarkdownSyntax,
  firstLine,
  MarkdownBody,
  advancePastLines,
  restAfterBlock,
};
