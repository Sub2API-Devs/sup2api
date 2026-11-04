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
  let hasTokens = "tokens" in agentInfo;
  return hasActualOperatorNodes(agentInfo)
    ? agentInfo.items
    : MarkdownBody(agentInfo)
      ? [...agentInfo.header, ...agentInfo.rows.flat()].flatMap((cell) => cell.tokens)
      : hasTokens
        ? (agentInfo.tokens ?? [])
        : [];
}
//@ chunk-wj577vf9.js:2391-2607 placement
function splitHeadingLines(highlight, text) {
  let tokens = [];
  let lexState = lexResult(
    [],
    text.replace(
      CRLF_RE,
      `
`,
    ),
    MARKDOWN_LIMITS,
  );
  while (lexState.rest !== "") {
    lexState = {
      declining: lexState.declining,
      ...lexDecliningBlock(highlight, lexState),
    };
    for (let token of lexState.taken) {
      let last = tokens.at(-1);
      if (last?.type === "space" && token.type === "space") last.raw += token.raw;
      else tokens.push(token);
    }
  }
  return tokens;
}
//@ chunk-wj577vf9.js:2607-2785 placement
function lexDecliningBlock(highlight, state) {
  let firstBlock = consumeFirstBlock(state);
  let { header = "", fromRow = state.rest } = state.declining ?? {};
  let isSingleBlock =
    firstBlock.length + fromRow.length <= state.rest.length && firstBlock.startsWith(header);
  return hasMatchingTextDeep(highlight, firstBlock)
    ? lexAsSingleParagraph(state.rest)
    : isSingleBlock
      ? headingTokenToBlock(highlight, state.rest)
      : lexTrimmedBlock(highlight, state, firstBlock);
}
//@ chunk-wj577vf9.js:2785-2931 placement
function hasMatchingTextDeep(highlight, text) {
  let tokens = hasOverlongLine(text) ? new _Lexer(highlight.defaults).blockTokens(text) : [];
  let found = false;
  while (!found && tokens.length > 0) {
    found = tokens.some((token) => getTokenTexts(token).some(hasOverlongLine));
    tokens = tokens.flatMap(checkAgentDescriptions);
  }
  return found;
}
//@ chunk-wj577vf9.js:2931-3069 placement
function getTokenTexts(token) {
  let hasPlainText =
    (isParagraphToken(token) || token.type === "heading" || token.type === "text") &&
    "text" in token &&
    typeof token.text === "string";
  return MarkdownBody(token) ? [token.raw] : hasPlainText ? [token.text] : [];
}
//@ chunk-wj577vf9.js:3069-3216 placement
function lexTrimmedBlock(highlight, state, text) {
  let tokens = highlight.lexer(text);
  let prefixTokenCount =
    text.length === state.rest.length ? tokens.length : findLastStringToken(tokens, text);
  let tokenSplitOffset = findTokenSplitOffset(tokens, prefixTokenCount, text);
  return tokenSplitOffset > 0
    ? lexResult(tokens.slice(0, prefixTokenCount), state.rest.slice(tokenSplitOffset), MARKDOWN_LIMITS)
    : parseHeadingBlock(highlight, state, tokens);
}
//@ chunk-wj577vf9.js:3216-3472 placement
function parseHeadingBlock(highlight, state, tokens) {
  let [firstToken] = tokens;
  let isSingleToken = tokens.length === 1;
  let isPlainParagraph = isSingleToken && isParagraphToken(firstToken) && !isLheadingStart(state.rest);
  let isTable = isSingleToken && MarkdownBody(firstToken);
  let firstLineText = firstLine(firstToken?.raw ?? "");
  let restFromRow = state.declining?.fromRow ?? state.rest;
  let isSetextHeading =
    isTable &&
    firstLineText.length + restFromRow.length <= state.rest.length &&
    !applyMarkdown(highlight, firstLineText + restFromRow.slice(0, advancePastLines(restFromRow, 0, 1)));
  return isPlainParagraph
    ? lexParagraphToken(highlight, state.rest)
    : isSetextHeading
      ? headingTokenToBlock(highlight, state.rest)
      : isTable
        ? parseSetextHeading(highlight, firstToken, state.rest)
        : resolveLeadingTokens(state, tokens);
}
//@ chunk-wj577vf9.js:3472-3687 placement
function resolveLeadingTokens(state, tokens) {
  let [firstToken] = tokens;
  let endsWithContent = tokens.findLastIndex(isNotSpaceToken) <= 0;
  let hasBlankTail = endsWithContent && tokens.some(isBlankToken_2);
  let exceedsLimit =
    state.lines < MAX_MARKDOWN_BLOCK_CHARS && !(hasBlankTail && isParagraphToken(firstToken));
  let isList = endsWithContent && hasActualOperatorNodes(firstToken);
  let isCodeOrHtml =
    endsWithContent && (firstToken?.type === "code" || (hasBlankTail && firstToken?.type !== "html"));
  return exceedsLimit
    ? lexResult([], state.rest, MAX_MARKDOWN_BLOCK_CHARS)
    : isList
      ? lexListWithoutLastItem(state, firstToken)
      : isCodeOrHtml
        ? lexResult(tokens, restAfterBlock(state), state.lines)
        : lexAsSingleParagraph(state.rest);
}
//@ chunk-wj577vf9.js:3687-3829 placement
function lexListWithoutLastItem(state, listToken) {
  let sliced = listToken.items.slice(0, -1);
  let raw = joinRawSegments(sliced);
  return raw !== "" && state.rest.startsWith(raw)
    ? lexResult([withRawItems(listToken, raw, sliced)], state.rest.slice(raw.length), state.lines)
    : lexAsSingleParagraph(state.rest);
}
//@ chunk-wj577vf9.js:3829-4008 placement
function lexParagraphToken(highlight, text) {
  let paragraphLines = collectParagraphLines(text);
  let fitsWindow =
    advancePastLines(paragraphLines.text, 0, MAX_WINDOW_CHARS) === paragraphLines.text.length &&
    !hasOverlongLine(paragraphLines.text);
  return lexResult(
    [
      {
        ...paragraphLines,
        tokens: fitsWindow
          ? new _Lexer(highlight.defaults).inlineTokens(paragraphLines.text)
          : [makeTextToken(paragraphLines.text)],
      },
    ],
    text.slice(paragraphLines.raw.length),
    MARKDOWN_LIMITS,
  );
}
//@ chunk-wj577vf9.js:4008-4041 placement
var headingTokenToBlock = (highlight, text) =>
  isLheadingStart(text) ? lexAsSingleParagraph(text) : lexParagraphToken(highlight, text);
//@ chunk-wj577vf9.js:4041-4093 placement
function isLheadingStart(text) {
  return regExp.test(text) && GFM_RULES.lheading.test(text);
}
//@ chunk-wj577vf9.js:4093-4285 placement
function collectParagraphLines(text) {
  let result = cachedLexer();
  let paragraphLines = readParagraphLines(text, "");
  while (paragraphLines.nextLines !== "") {
    result.text +=
      result.raw === ""
        ? paragraphLines.nextLines
        : `
${paragraphLines.nextLines}`;
    result.raw += paragraphLines.nextLines + paragraphLines.lineBreak;
    paragraphLines = readParagraphLines(
      paragraphLines.isOpen ? text.slice(result.raw.length) : "",
      PROBE_LINE,
    );
  }
  return result;
}
//@ chunk-wj577vf9.js:4285-4532 placement
function readParagraphLines(text, prefix) {
  let firstLineEnd = advancePastLines(text, 0, MARKDOWN_LIMITS);
  let contentEnd =
    text[firstLineEnd - 1] ===
    `
`
      ? firstLineEnd - 1
      : firstLineEnd;
  let sliced = (
    GFM_RULES.paragraph.exec(prefix + text.slice(0, advancePastLines(text, firstLineEnd, 1)))?.[0] ?? prefix
  ).slice(prefix.length);
  let sliced_2 = sliced.slice(0, contentEnd);
  let isOpen = sliced.length > contentEnd;
  let hasLineBreak =
    isOpen ||
    GFM_RULES.newline.exec(text.slice(sliced_2.length))?.[0] ===
      `
`;
  return {
    nextLines: sliced_2,
    lineBreak: hasLineBreak
      ? `
`
      : "",
    isOpen,
  };
}
//@ chunk-wj577vf9.js:4532-4850 placement
function parseSetextHeading(lexer, paragraphToken, markdown) {
  let firstLineText = firstLine(paragraphToken.raw);
  let tableEnd = measureTableLength(firstLineText, markdown);
  let blockRanges = splitBlockRanges(markdown.slice(firstLineText.length, tableEnd), MARKDOWN_LIMITS);
  let headingTokens = [];
  let consumesRest = false;
  while (!consumesRest && headingTokens.length < blockRanges.length) {
    let headingToken = applyMarkdown(lexer, firstLineText + (blockRanges[headingTokens.length] ?? ""));
    consumesRest = headingToken === undefined;
    if (headingToken) headingTokens.push(headingToken);
  }
  let raw = markdown.slice(0, tableEnd) + (LEADING_NEWLINES_RE.exec(markdown.slice(tableEnd))?.[0] ?? "");
  return consumesRest
    ? headingConsumesRest(lexer, firstLineText, blockRanges.slice(0, headingTokens.length + 1), markdown)
    : lexResult(
        [
          withRawRows(
            paragraphToken,
            raw,
            headingTokens.flatMap((headingToken) => headingToken.rows),
          ),
        ],
        markdown.slice(raw.length),
        MARKDOWN_LIMITS,
      );
}
//@ chunk-wj577vf9.js:4850-5152 placement
function headingConsumesRest(lexer, headerText, blockRanges, markdown) {
  let heading = headingTokenToBlock(lexer, markdown);
  let consumedLength = headerText.length + blockRanges.join("").length;
  let isDeclining = markdown.length - heading.rest.length < consumedLength;
  let lastBlockRanges = isDeclining ? splitBlockRanges(blockRanges.at(-1) ?? "", 1) : [];
  let floored = Math.floor(SMALL_MARKDOWN_THRESHOLD / headerText.length);
  let index = lastBlockRanges
    .slice(0, floored)
    .findIndex((blockRange) => !applyMarkdown(lexer, headerText + blockRange));
  let decliningIndex = index >= 0 ? index : floored < lastBlockRanges.length ? floored : 0;
  let fromRow = markdown.slice(consumedLength - lastBlockRanges.slice(decliningIndex).join("").length);
  return {
    ...heading,
    declining: isDeclining
      ? {
          header: headerText,
          fromRow,
        }
      : undefined,
  };
}
//@ chunk-wj577vf9.js:5152-5283 placement
function measureTableLength(headerLine, text) {
  let length = headerLine.length;
  let isGrowing = length < text.length;
  while (isGrowing) {
    let remaining = text.slice(length, advancePastLines(text, length, MARKDOWN_LIMITS));
    let rowLength = measureTableRow(headerLine, remaining);
    length += rowLength;
    isGrowing = rowLength === remaining.length && length < text.length;
  }
  return length;
}
//@ chunk-wj577vf9.js:5283-5422 placement
function measureTableRow(headerLine, remaining) {
  let sliced = (GFM_RULES.table.exec(headerLine + remaining)?.[0] ?? headerLine).slice(headerLine.length);
  let replaced = sliced.replace(TRAILING_NEWLINES_RE, "");
  return replaced !== "" && sliced.length > replaced.length ? replaced.length + 1 : replaced.length;
}
//@ chunk-wj577vf9.js:5422-5511 placement = applyMarkdown (0.759)
function applyMarkdown(lexer, markdown) {
  let [token] = hasOverlongLine(markdown) ? [] : lexer.lexer(markdown);
  return MarkdownBody(token) && token.raw.length === markdown.length ? token : undefined;
}
//@ chunk-wj577vf9.js:5511-5608 placement
function splitBlockRanges(text, position) {
  let ranges = [];
  for (let start = 0; start < text.length; start = advancePastLines(text, start, position))
    ranges.push(text.slice(start, advancePastLines(text, start, position)));
  return ranges;
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
function makeTextToken(text) {
  return {
    type: "text",
    raw: text,
    text,
    escaped: false,
  };
}
//@ chunk-wj577vf9.js:6950-6995 layout
function withRawRows(token, raw, rows) {
  return {
    ...token,
    raw,
    rows,
  };
}
//@ chunk-wj577vf9.js:6995-7041 layout
function withRawItems(token, raw, items) {
  return {
    ...token,
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
function isParagraphToken(token) {
  return token?.type === "paragraph";
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
