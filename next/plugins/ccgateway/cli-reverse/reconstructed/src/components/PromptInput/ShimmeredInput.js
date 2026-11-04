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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { segmentTextByHighlights } from "../../utils/textHighlighting.js";
import { usePrefersReducedMotion, SPINNER_FLAG_PRIORITY } from "../Spinner/spinnerFlags.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { Ansi } from "../../ink/components/AnsiText.js";

//@ chunk-81qqq1aq.js:2338-2572 placement (2.1.88 match: ShimmerChar, 1)
function ShimmerChar(props) {
  let $ = useMemoCache(3);
  let { char, index, glimmerIndex, messageColor, shimmerColor } = props;
  let isHighlighted = index === glimmerIndex;
  let isNearHighlight = Math.abs(index - glimmerIndex) === 1;
  const color = isHighlighted || isNearHighlight ? shimmerColor : messageColor;
  let t2;
  if ($[0] !== char || $[1] !== color) {
    t2 = jsxProd_default(Text, {
      color,
      children: char,
    });
    $[0] = char;
    $[1] = color;
    $[2] = t2;
  } else t2 = $[2];
  return t2;
}
//@ chunk-81qqq1aq.js:2572-2609 fingerprint (2.1.88 match: _temp, 1)
function selectShimmerColor(h) {
  return h.shimmerColor;
}
//@ chunk-81qqq1aq.js:2609-4298 fingerprint (2.1.88 match: HighlightedInput, 0.819)
function HighlightedInput(props) {
  let $ = useMemoCache(21);
  let { text, highlights } = props;
  let lines;
  if ($[0] !== highlights || $[1] !== text) {
    let segments = segmentTextByHighlights(text, highlights);
    lines = [[]];
    let pos = 0;
    for (const segment of segments) {
      let parts = segment.text.split(`
`);
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) {
          lines.push([]);
          pos = pos + 1;
        }
        let part = parts[i];
        if (part.length > 0)
          lines.at(-1).push({
            text: part,
            highlight: segment.highlight,
            start: pos,
          });
        pos = pos + part.length;
      }
    }
    $[0] = highlights;
    $[1] = text;
    $[2] = lines;
  } else lines = $[2];
  let t1;
  if ($[3] !== highlights) {
    t1 = highlights.some(selectShimmerColor);
    $[3] = highlights;
    $[4] = t1;
  } else t1 = $[4];
  let hasShimmer = t1;
  let sweepStart = 0;
  let cycleLength = 1;
  if (hasShimmer) {
    let lo = Infinity;
    let hi = -Infinity;
    if ($[5] !== highlights) {
      for (const h_0 of highlights) {
        if (h_0.shimmerColor) {
          lo = Math.min(lo, h_0.start);
          hi = Math.max(hi, h_0.end);
        }
      }
      $[5] = highlights;
      $[6] = lo;
      $[7] = hi;
    } else {
      lo = $[6];
      hi = $[7];
    }
    sweepStart = lo - 10;
    cycleLength = hi - lo + 20;
  }
  let t2;
  if ($[8] !== cycleLength || $[9] !== hasShimmer || $[10] !== lines || $[11] !== sweepStart) {
    t2 = {
      lines,
      hasShimmer,
      sweepStart,
      cycleLength,
    };
    $[8] = cycleLength;
    $[9] = hasShimmer;
    $[10] = lines;
    $[11] = sweepStart;
    $[12] = t2;
  } else t2 = $[12];
  let { lines: lines_2, hasShimmer: hasShimmer_0, sweepStart: sweepStart_2, cycleLength: cycleLength_2 } = t2;
  let prefersReducedMotion = usePrefersReducedMotion();
  let shouldShimmer = hasShimmer_0 && !prefersReducedMotion;
  let [ref, time] = useAnimationFrame(shouldShimmer ? 50 : null);
  let glimmerIndex = shouldShimmer
    ? sweepStart_2 + (Math.floor(time / 50) % cycleLength_2)
    : SPINNER_FLAG_PRIORITY;
  let children;
  if ($[13] !== glimmerIndex || $[14] !== lines_2) {
    let t4;
    if ($[16] !== glimmerIndex) {
      t4 = (lineParts, lineIndex) =>
        jsxProd_default(
          Box,
          {
            children:
              lineParts.length === 0
                ? jsxProd_default(Text, {
                    children: " ",
                  })
                : lineParts.map((part, partIndex) => {
                    if (part.highlight?.shimmerColor && part.highlight.color) {
                      return jsxProd_default(
                        Text,
                        {
                          children: part.text.split("").map((char, charIndex) =>
                            jsxProd_default(
                              ShimmerChar,
                              {
                                char,
                                index: part.start + charIndex,
                                glimmerIndex,
                                messageColor: part.highlight.color,
                                shimmerColor: part.highlight.shimmerColor,
                              },
                              charIndex,
                            ),
                          ),
                        },
                        partIndex,
                      );
                    }
                    return jsxProd_default(
                      Text,
                      {
                        color: part.highlight?.color,
                        backgroundColor: part.highlight?.backgroundColor,
                        dimColor: part.highlight?.dimColor,
                        bold: part.highlight?.bold,
                        italic: part.highlight?.italic,
                        underline: part.highlight?.underline,
                        strikethrough: part.highlight?.strikethrough,
                        children: jsxProd_default(Ansi, {
                          children: part.text,
                        }),
                      },
                      partIndex,
                    );
                  }),
          },
          lineIndex,
        );
      $[16] = glimmerIndex;
      $[17] = t4;
    } else t4 = $[17];
    children = lines_2.map(t4);
    $[13] = glimmerIndex;
    $[14] = lines_2;
    $[15] = children;
  } else children = $[15];
  let t4;
  if ($[18] !== ref || $[19] !== children) {
    t4 = jsxProd_default(Box, {
      ref,
      flexDirection: "column",
      children,
    });
    $[18] = ref;
    $[19] = children;
    $[20] = t4;
  } else t4 = $[20];
  return t4;
}
export { HighlightedInput, ShimmerChar };
