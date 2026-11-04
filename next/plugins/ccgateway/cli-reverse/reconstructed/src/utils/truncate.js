/**
 * utils/truncate.ts
 *
 * 按显示宽度截断/定位文本（混有输入框光标移动的误归声明）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/truncate.ts
 * pieces: chunk-530hfzwb.js (2)
 * attribution: callgraph-fingerprint 2
 */
import { getGraphemeSegmenter } from "./intl.js";
import { charDisplayWidth, isWhitespaceChar, isPunctuationChar } from "./Cursor.js";

//@ chunk-530hfzwb.js:927-1022 callgraph-fingerprint (2.1.88 match: truncateToWidth, 1)
function truncateToWidth(text, offset, offset_2) {
  let width = 0;
  for (let { segment } of getGraphemeSegmenter().segment(text.slice(offset, offset_2)))
    width += charDisplayWidth(segment, width);
  return width;
}
//@ chunk-530hfzwb.js:1555-2385 callgraph-fingerprint (2.1.88 match: truncateToWidthNoEllipsis, 1)
/**
 * 按显示宽度截断文本（不加省略号）。
 */
function truncateToWidthNoEllipsis(text, offset, isInner, maxWidth) {
  let segments = [];
  for (let { segment, index } of getGraphemeSegmenter().segment(text))
    segments.push({
      segment,
      index,
    });
  if (segments.length === 0) return null;
  let anchorIndex = segments.length - 1;
  for (let width = 0; width < segments.length; width++) {
    let entry = segments[width];
    let nextIndex = width + 1 < segments.length ? segments[width + 1].index : text.length;
    if (offset >= entry.index && offset < nextIndex) {
      anchorIndex = width;
      break;
    }
  }
  let segmentAt = (index) => segments[index]?.segment ?? "";
  let offsetAt = (index) => (index < segments.length ? segments[index].index : text.length);
  let isInlineWhitespaceAt = (index) =>
    segmentAt(index) !==
      `
` && isWhitespaceChar(segmentAt(index));
  let segmentWidthAt = (index) => maxWidth(segmentAt(index));
  let isPunctuationAt = (index) => isPunctuationChar(segmentAt(index));
  let startIndex = anchorIndex;
  let endIndex = anchorIndex;
  if (segmentWidthAt(anchorIndex)) {
    while (startIndex > 0 && segmentWidthAt(startIndex - 1)) startIndex--;
    while (endIndex < segments.length && segmentWidthAt(endIndex)) endIndex++;
  } else if (isWhitespaceChar(segmentAt(anchorIndex))) {
    let isWhitespaceAt = (idx) => isWhitespaceChar(segmentAt(idx));
    let offsetAtTextEnd = offset >= text.length;
    let shouldExpand = isInner && !offsetAtTextEnd ? isInlineWhitespaceAt : isWhitespaceAt;
    while (endIndex < segments.length && shouldExpand(endIndex)) endIndex++;
    let atTextEnd = !isInner && endIndex === segments.length;
    let isWhitespace = offsetAtTextEnd || atTextEnd ? isWhitespaceAt : isInlineWhitespaceAt;
    while (startIndex > 0 && isWhitespace(startIndex - 1)) startIndex--;
    return {
      start: offsetAt(startIndex),
      end: offsetAt(endIndex),
    };
  } else if (isPunctuationAt(anchorIndex)) {
    while (startIndex > 0 && isPunctuationAt(startIndex - 1)) startIndex--;
    while (endIndex < segments.length && isPunctuationAt(endIndex)) endIndex++;
  }
  if (!isInner)
    if (endIndex < segments.length && isInlineWhitespaceAt(endIndex))
      while (endIndex < segments.length && isInlineWhitespaceAt(endIndex)) endIndex++;
    else {
      let wordStart = startIndex;
      while (wordStart > 0 && isInlineWhitespaceAt(wordStart - 1)) wordStart--;
      if (
        wordStart > 0 &&
        segmentAt(wordStart - 1) !==
          `
`
      )
        startIndex = wordStart;
    }
  return {
    start: offsetAt(startIndex),
    end: offsetAt(endIndex),
  };
}
export { truncateToWidth, truncateToWidthNoEllipsis };
