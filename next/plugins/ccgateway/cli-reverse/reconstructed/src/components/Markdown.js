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
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useSettingsState } from "../hooks/useSettings.js";
import { getCliHighlightModule } from "../utils/cliHighlight.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PreviewBoxBody } from "./permissions/AskUserQuestionPermissionRequest/PreviewBox.js";

//@ chunk-wj577vf9.js:5806-5917 placement
function findLastContentTokenIndex(tokens) {
  let lastIndex = tokens.findLastIndex((token) => token.raw.trim() !== "");
  return hasActualOperatorNodes(tokens[lastIndex])
    ? lastIndex
    : Math.max(tokens.findLastIndex(isNotSpaceToken), 0);
}
//@ chunk-wj577vf9.js:5917-5941 placement
/**
 * 导出值：endsWith（字符串以某后缀结尾）；位于「Markdown 渲染：marked lexer（带缓存）→ 令牌格式化为 ANSI 文本；表格交给 MarkdownTable；流式 Markdown 只重渲染末尾块」模块。
 */
var endsWith = (tokens, raw) => joinRawSegments(tokens) === raw;
//@ chunk-wj577vf9.js:5941-6069 placement
function hasMarkdownSyntax(tokens, index, text) {
  let before = joinRawSegments(tokens.slice(0, index));
  let after = joinRawSegments(tokens.slice(index));
  let endsWithAfter = text.endsWith(after);
  return text.startsWith(before) ? before.length : endsWithAfter ? text.length - after.length : 0;
}
//@ chunk-wj577vf9.js:6069-6230 placement
/**
 * 以第 t 个 token 为界把 marked token 列表拆成前后两段，求分界点在原始 Markdown 文本中的字符偏移（前缀匹配优先，否则按后缀对齐，都不符合时为 0）；用于流式渲染只重算末尾块。
 */
function findTokenSplitOffset(tokens, index, text) {
  let before = joinRawSegments(tokens.slice(0, index));
  let after = joinRawSegments(tokens.slice(index));
  let startsWithBefore = before.length + after.length === text.length || text.startsWith(before);
  let endsWithAfter = text.endsWith(after);
  return startsWithBefore ? before.length : endsWithAfter ? text.length - after.length : 0;
}
//@ chunk-wj577vf9.js:6230-6353 placement
function advancePastLines(text, startOffset, lineCount) {
  let offset = startOffset;
  for (
    let k = 0;
    k < lineCount && offset < text.length && offset - startOffset < lineCount * MAX_MARKDOWN_BLOCKS;
    k++
  ) {
    let index = text.indexOf(
      `
`,
      offset,
    );
    offset = index === -1 ? text.length : index + 1;
  }
  return offset;
}
//@ chunk-wj577vf9.js:6353-6469 placement
function hasOverlongLine(text) {
  let lineStart = 0;
  let found = false;
  while (!found && lineStart < text.length) {
    let index = text.indexOf(
      `
`,
      lineStart,
    );
    let lineEnd = index === -1 ? text.length : index;
    found = lineEnd - lineStart > SMALL_MARKDOWN_THRESHOLD;
    lineStart = lineEnd + 1;
  }
  return found;
}
//@ chunk-wj577vf9.js:6469-6556 placement
function consumeFirstBlock({ rest, lines }) {
  return rest.slice(0, advancePastLines(rest, GFM_RULES.fences.exec(rest)?.[0].length ?? 0, lines));
}
//@ chunk-wj577vf9.js:6556-6605 placement
function restAfterBlock(block) {
  return block.rest.slice(consumeFirstBlock(block).length);
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
//@ chunk-wj577vf9.js:7224-7263 fingerprint (2.1.88 match: MarkdownBody, 0.598)
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
//@ chunk-8wvtd8sr.js:14236-14561 fingerprint (2.1.88 match: StreamingMarkdown, 0.419)
/**
 * 流式 Markdown：只对最后一个未闭合块重新 lex，前面已稳定的块复用。
 */
function StreamingMarkdown(text, offset) {
  let tokens;
  try {
    tokens = applyMarkdown(text);
  } catch {
    return null;
  }
  let pos = 0;
  for (let token of tokens) {
    if (!text.startsWith(token.raw, pos)) return null;
    let lastContentIdx = pos + token.raw.length;
    if (lastContentIdx <= offset || (pos < offset && text.slice(offset, lastContentIdx).trim() === "")) {
      pos = lastContentIdx;
      continue;
    }
    if (pos < offset) return null;
    if (token.type === "space" || (token.type === "html" && isOnlyHtmlComments(token.raw))) {
      pos = lastContentIdx;
      continue;
    }
    return {
      token,
      offset: pos,
      links: tokens.links ?? {},
    };
  }
  return null;
}
//@ chunk-18hwfzwa.js:1271476-1271755 fingerprint (2.1.88 match: Markdown, 0.848)
/**
 * Markdown 组件：用缓存的 marked lexer 切成令牌，表格令牌交给 MarkdownTable，其余经 formatToken 转 ANSI 文本后用 Ansi 渲染。
 */
function Markdown(props) {
  let $ = useMemoCache(5);
  let settings = useSettingsState();
  let highlight;
  if ($[0] !== settings.syntaxHighlightingDisabled) {
    highlight = settings.syntaxHighlightingDisabled ? null : getCliHighlightModule();
    $[0] = settings.syntaxHighlightingDisabled;
    $[1] = highlight;
  } else highlight = $[1];
  let highlight_2 = highlight;
  let t0;
  if ($[2] !== highlight_2 || $[3] !== props) {
    t0 = jsxProd_default(PreviewBoxBody, {
      ...props,
      highlight: highlight_2,
    });
    $[2] = highlight_2;
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
