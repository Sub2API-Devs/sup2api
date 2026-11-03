/**
 * components/PromptInput/ShimmeredInput.tsx
 *
 * 带高亮段的输入文本渲染（关键词/占位高亮、微光）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/ShimmeredInput.tsx
 * pieces: chunk-81qqq1aq.js (3)
 * attribution: placement 1, fingerprint 2
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { segmentTextByHighlights } from "../../utils/textHighlighting.js";
import { usePrefersReducedMotion, VDe } from "../Spinner/spinnerFlags.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { Ansi } from "../../ink/components/AnsiText.js";

//@ chunk-81qqq1aq.js:2338-2572 placement = ShimmerChar (1)
function ShimmerChar(t0) {
  let $ = w(3),
    {
      char: char,
      index: index,
      glimmerIndex: glimmerIndex,
      messageColor: messageColor,
      shimmerColor: shimmerColor,
    } = t0,
    c = index === glimmerIndex,
    o = Math.abs(index - glimmerIndex) === 1;
  const t1 = c || o ? shimmerColor : messageColor;
  let t2;
  if ($[0] !== char || $[1] !== t1)
    ((t2 = e(Text, { color: t1, children: char })), ($[0] = char), ($[1] = t1), ($[2] = t2));
  else t2 = $[2];
  return t2;
}
//@ chunk-81qqq1aq.js:2572-2609 fingerprint = _temp (1)
function Nt(h) {
  return h.shimmerColor;
}
//@ chunk-81qqq1aq.js:2609-4298 fingerprint = HighlightedInput (0.819)
function HighlightedInput(t0) {
  let $ = w(21),
    { text: text, highlights: highlights } = t0,
    d;
  if ($[0] !== highlights || $[1] !== text) {
    let segments = segmentTextByHighlights(text, highlights);
    d = [[]];
    let c = 0;
    for (const segment of segments) {
      let parts = segment.text.split(`
`);
      for (let u = 0; u < parts.length; u++) {
        if (u > 0) (d.push([]), (c = c + 1));
        let part = parts[u];
        if (part.length > 0) d.at(-1).push({ text: part, highlight: segment.highlight, start: c });
        c = c + part.length;
      }
    }
    (($[0] = highlights), ($[1] = text), ($[2] = d));
  } else d = $[2];
  let N;
  if ($[3] !== highlights) ((N = highlights.some(Nt)), ($[3] = highlights), ($[4] = N));
  else N = $[4];
  let E = N,
    H = 0,
    cycleLength = 1;
  if (E) {
    let M = Infinity;
    let hi = -Infinity;
    if ($[5] !== highlights) {
      for (const h_0 of highlights) {
        if (h_0.shimmerColor) ((M = Math.min(M, h_0.start)), (hi = Math.max(hi, h_0.end)));
      }
      (($[5] = highlights), ($[6] = M), ($[7] = hi));
    } else ((M = $[6]), (hi = $[7]));
    ((H = M - 10), (cycleLength = hi - M + 20));
  }
  let q;
  if ($[8] !== cycleLength || $[9] !== E || $[10] !== d || $[11] !== H)
    ((q = { lines: d, hasShimmer: E, sweepStart: H, cycleLength: cycleLength }),
      ($[8] = cycleLength),
      ($[9] = E),
      ($[10] = d),
      ($[11] = H),
      ($[12] = q));
  else q = $[12];
  let { lines: lines_0, hasShimmer: hasShimmer_0, sweepStart: sweepStart_0, cycleLength: cycleLength_0 } = q,
    Re = usePrefersReducedMotion(),
    V = hasShimmer_0 && !Re,
    [B, ne] = useAnimationFrame(V ? 50 : null),
    glimmerIndex = V ? sweepStart_0 + (Math.floor(ne / 50) % cycleLength_0) : VDe,
    W;
  if ($[13] !== glimmerIndex || $[14] !== lines_0) {
    let O;
    if ($[16] !== glimmerIndex)
      ((O = (lineParts, lineIndex) =>
        e(
          Box,
          {
            children:
              lineParts.length === 0
                ? e(Text, { children: " " })
                : lineParts.map((part_0, partIndex) => {
                    if (part_0.highlight?.shimmerColor && part_0.highlight.color) {
                      return e(
                        Text,
                        {
                          children: part_0.text
                            .split("")
                            .map((char, charIndex) =>
                              e(
                                ShimmerChar,
                                {
                                  char: char,
                                  index: part_0.start + charIndex,
                                  glimmerIndex: glimmerIndex,
                                  messageColor: part_0.highlight.color,
                                  shimmerColor: part_0.highlight.shimmerColor,
                                },
                                charIndex,
                              ),
                            ),
                        },
                        partIndex,
                      );
                    }
                    return e(
                      Text,
                      {
                        color: part_0.highlight?.color,
                        backgroundColor: part_0.highlight?.backgroundColor,
                        dimColor: part_0.highlight?.dimColor,
                        bold: part_0.highlight?.bold,
                        italic: part_0.highlight?.italic,
                        underline: part_0.highlight?.underline,
                        strikethrough: part_0.highlight?.strikethrough,
                        children: e(Ansi, { children: part_0.text }),
                      },
                      partIndex,
                    );
                  }),
          },
          lineIndex,
        )),
        ($[16] = glimmerIndex),
        ($[17] = O));
    else O = $[17];
    W = lines_0.map(O);
    (($[13] = glimmerIndex), ($[14] = lines_0), ($[15] = W));
  } else W = $[15];
  let O;
  if ($[18] !== B || $[19] !== W)
    ((O = e(Box, { ref: B, flexDirection: "column", children: W })), ($[18] = B), ($[19] = W), ($[20] = O));
  else O = $[20];
  return O;
}

export { HighlightedInput, ShimmerChar };
