/**
 * utils/textHighlighting.ts
 *
 * 按高亮区间切分文本并保留 ANSI 样式的分段器。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/textHighlighting.ts
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: callgraph-witnessed 1, file-last-pair 1, fingerprint 1
 */
import { tokenize } from "../../vendor/@alcalzone/ansi-tokenize/build/tokenize.js";
import { activeAnsiCodes } from "../components/PromptInput/inputDecorations.js";
import { ansiCodesToString } from "../../vendor/@alcalzone/ansi-tokenize/build/ansiCodes.js";
import { undoAnsiCodes } from "../../vendor/@alcalzone/ansi-tokenize/build/undo.js";

//@ chunk-e6aww6q8.js:64385-64477 callgraph-witnessed (2.1.88 match: segmentTextByHighlights, 0.706)
function segmentTextByHighlights(text, highlights) {
  if (highlights.length === 0)
    return [
      {
        text,
        start: 0,
      },
    ];
  return new HighlightSegmenter(text).segment(reduceCodes(highlights));
}
//@ chunk-e6aww6q8.js:64477-64702 file-last-pair
function reduceCodes(codes) {
  let sortedHighlights = [...codes].sort((left, right) => {
    if (left.start !== right.start) return left.start - right.start;
    return right.priority - left.priority;
  });
  let kept = [];
  let merged = -1 / 0;
  for (let sortedHighlight of sortedHighlights) {
    if (sortedHighlight.start === sortedHighlight.end) continue;
    if (sortedHighlight.start >= merged) {
      kept.push(sortedHighlight);
      merged = Math.max(merged, sortedHighlight.end);
    }
  }
  return kept;
}
//@ chunk-e6aww6q8.js:64702-65856 fingerprint (2.1.88 match: HighlightSegmenter, 1)
class HighlightSegmenter {
  text;
  tokens;
  visiblePos = 0;
  stringPos = 0;
  tokenIdx = 0;
  charIdx = 0;
  codes = [];
  constructor(text) {
    this.text = text;
    this.tokens = tokenize(text);
  }
  segment(highlights) {
    let segments = [];
    for (let highlight of highlights) {
      let before = this.segmentTo(highlight.start);
      if (before) segments.push(before);
      let highlighted = this.segmentTo(highlight.end);
      if (highlighted) {
        highlighted.highlight = highlight;
        segments.push(highlighted);
      }
    }
    let after = this.segmentTo(1 / 0);
    if (after) segments.push(after);
    return segments;
  }
  segmentTo(targetVisiblePos) {
    if (this.tokenIdx >= this.tokens.length || targetVisiblePos <= this.visiblePos) return null;
    let visibleStart = this.visiblePos;
    while (this.tokenIdx < this.tokens.length) {
      let token = this.tokens[this.tokenIdx];
      if (token.type !== "ansi") break;
      this.codes.push(token);
      this.stringPos += token.code.length;
      this.tokenIdx++;
    }
    let stringStart = this.stringPos;
    let codesStart = [...this.codes];
    while (this.visiblePos < targetVisiblePos && this.tokenIdx < this.tokens.length) {
      let token = this.tokens[this.tokenIdx];
      if (token.type === "ansi") {
        this.codes.push(token);
        this.stringPos += token.code.length;
        this.tokenIdx++;
      } else {
        let charsNeeded = targetVisiblePos - this.visiblePos;
        let charsAvailable = token.value.length - this.charIdx;
        let charsToTake = Math.min(charsNeeded, charsAvailable);
        this.stringPos += charsToTake;
        this.visiblePos += charsToTake;
        this.charIdx += charsToTake;
        if (this.charIdx >= token.value.length) {
          this.tokenIdx++;
          this.charIdx = 0;
        }
      }
    }
    if (this.stringPos === stringStart) return null;
    let prefixCodes = activeAnsiCodes(codesStart);
    let suffixCodes = activeAnsiCodes(this.codes);
    this.codes = suffixCodes;
    let prefix = ansiCodesToString(prefixCodes);
    let suffix = ansiCodesToString(undoAnsiCodes(suffixCodes));
    return {
      text: prefix + this.text.substring(stringStart, this.stringPos) + suffix,
      start: visibleStart,
    };
  }
}
export { segmentTextByHighlights, reduceCodes };
