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
import { eQs } from "../../vendor/@alcalzone/ansi-tokenize/build/tokenize.js";
import { activeAnsiCodes } from "../components/PromptInput/inputDecorations.js";
import { VEt } from "../../vendor/@alcalzone/ansi-tokenize/build/ansiCodes.js";
import { U7n } from "../../vendor/@alcalzone/ansi-tokenize/build/undo.js";

//@ chunk-e6aww6q8.js:64385-64477 callgraph-witnessed = segmentTextByHighlights (0.706)
function segmentTextByHighlights(text, highlights) {
  if (highlights.length === 0) return [{ text: text, start: 0 }];
  return new HighlightSegmenter(text).segment(reduceCodes(highlights));
}
//@ chunk-e6aww6q8.js:64477-64702 file-last-pair
function reduceCodes(codes) {
  let sorted = [...codes].sort((h, y) => {
      if (h.start !== y.start) return h.start - y.start;
      return y.priority - h.priority;
    }),
    r = [],
    s = -1 / 0;
  for (let h of sorted) {
    if (h.start === h.end) continue;
    if (h.start >= s) (r.push(h), (s = Math.max(s, h.end)));
  }
  return r;
}
//@ chunk-e6aww6q8.js:64702-65856 fingerprint = HighlightSegmenter (1)
class HighlightSegmenter {
  text;
  tokens;
  visiblePos = 0;
  stringPos = 0;
  tokenIdx = 0;
  charIdx = 0;
  codes = [];
  constructor(e) {
    this.text = e;
    this.tokens = eQs(e);
  }
  segment(e) {
    let n = [];
    for (let s of e) {
      let segmentTo = this.segmentTo(s.start);
      if (segmentTo) n.push(segmentTo);
      let segmentTo_2 = this.segmentTo(s.end);
      if (segmentTo_2) ((segmentTo_2.highlight = s), n.push(segmentTo_2));
    }
    let segmentTo = this.segmentTo(1 / 0);
    if (segmentTo) n.push(segmentTo);
    return n;
  }
  segmentTo(e) {
    if (this.tokenIdx >= this.tokens.length || e <= this.visiblePos) return null;
    let visiblePos = this.visiblePos;
    while (this.tokenIdx < this.tokens.length) {
      let L = this.tokens[this.tokenIdx];
      if (L.type !== "ansi") break;
      (this.codes.push(L), (this.stringPos += L.code.length), this.tokenIdx++);
    }
    let stringPos = this.stringPos,
      s = [...this.codes];
    while (this.visiblePos < e && this.tokenIdx < this.tokens.length) {
      let L = this.tokens[this.tokenIdx];
      if (L.type === "ansi") (this.codes.push(L), (this.stringPos += L.code.length), this.tokenIdx++);
      else {
        let G = e - this.visiblePos,
          q = L.value.length - this.charIdx,
          min = Math.min(G, q);
        if (
          ((this.stringPos += min),
          (this.visiblePos += min),
          (this.charIdx += min),
          this.charIdx >= L.value.length)
        )
          (this.tokenIdx++, (this.charIdx = 0));
      }
    }
    if (this.stringPos === stringPos) return null;
    let h = activeAnsiCodes(s),
      y = activeAnsiCodes(this.codes);
    this.codes = y;
    let S = VEt(h),
      w = VEt(U7n(y));
    return { text: S + this.text.substring(stringPos, this.stringPos) + w, start: visiblePos };
  }
}

export { segmentTextByHighlights, reduceCodes };
