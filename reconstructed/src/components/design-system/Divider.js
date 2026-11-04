/**
 * components/design-system/Divider.tsx
 *
 * 水平分隔线（可带居中/起始标题）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/Divider.tsx
 * pieces: chunk-paas88x7.js (1)
 * attribution: callgraph-witnessed 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { HORIZONTAL_LINE_GLYPH } from "../../constants/figures.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { Ansi } from "../../ink/components/AnsiText.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { Decorative } from "../../ink/components/ErrorBoundary.js";

//@ chunk-paas88x7.js:412-1609 callgraph-witnessed = Divider (0.56)
function Divider(props) {
  let $ = useMemoCache(27);
  let { width, color, char, padding, title, titleAlign } = props;
  let char_2 = char === undefined ? HORIZONTAL_LINE_GLYPH : char;
  let padding_2 = padding === undefined ? 0 : padding;
  let resolvedAlign = titleAlign === undefined ? "center" : titleAlign;
  let { columns: terminalWidth } = useTerminalSize();
  let effectiveWidth = Math.max(0, (width ?? terminalWidth) - padding_2);
  let titleFallbackCached;
  if ($[0] !== color || $[1] !== title) {
    titleFallbackCached = title
      ? jsxProd_default(Text, {
          color,
          dimColor: !color,
          children: jsxProd_default(Ansi, {
            children: title,
          }),
        })
      : null;
    $[0] = color;
    $[1] = title;
    $[2] = titleFallbackCached;
  } else titleFallbackCached = $[2];
  let fallback = titleFallbackCached;
  if (title) {
    let titleWidth = bunStringWidth(title) + 2;
    let sideWidth = Math.max(0, effectiveWidth - titleWidth);
    let leftWidth = resolvedAlign === "start" ? Math.min(4, sideWidth) : Math.floor(sideWidth / 2);
    let rightWidth = sideWidth - leftWidth;
    const dimColor = !color;
    let t4;
    if ($[3] !== char_2 || $[4] !== leftWidth) {
      t4 = char_2.repeat(leftWidth);
      $[3] = char_2;
      $[4] = leftWidth;
      $[5] = t4;
    } else t4 = $[5];
    let t5;
    if ($[6] !== title) {
      t5 = jsxProd_default(Text, {
        dimColor: true,
        children: jsxProd_default(Ansi, {
          children: title,
        }),
      });
      $[6] = title;
      $[7] = t5;
    } else t5 = $[7];
    let t6;
    if ($[8] !== char_2 || $[9] !== rightWidth) {
      t6 = char_2.repeat(rightWidth);
      $[8] = char_2;
      $[9] = rightWidth;
      $[10] = t6;
    } else t6 = $[10];
    let children;
    if ($[11] !== color || $[12] !== dimColor || $[13] !== t4 || $[14] !== t5 || $[15] !== t6) {
      children = jsxProd_default_2(Text, {
        color,
        dimColor,
        children: [t4, " ", t5, " ", t6],
      });
      $[11] = color;
      $[12] = dimColor;
      $[13] = t4;
      $[14] = t5;
      $[15] = t6;
      $[16] = children;
    } else children = $[16];
    let titledElement;
    if ($[17] !== fallback || $[18] !== children) {
      titledElement = jsxProd_default(Decorative, {
        fallback,
        children,
      });
      $[17] = fallback;
      $[18] = children;
      $[19] = titledElement;
    } else titledElement = $[19];
    return titledElement;
  }
  const dimColor = !color;
  let children;
  if ($[20] !== char_2 || $[21] !== effectiveWidth) {
    children = char_2.repeat(effectiveWidth);
    $[20] = char_2;
    $[21] = effectiveWidth;
    $[22] = children;
  } else children = $[22];
  let t5;
  if ($[23] !== color || $[24] !== dimColor || $[25] !== children) {
    t5 = jsxProd_default(Decorative, {
      children: jsxProd_default(Text, {
        color,
        dimColor,
        children,
      }),
    });
    $[23] = color;
    $[24] = dimColor;
    $[25] = children;
    $[26] = t5;
  } else t5 = $[26];
  return t5;
}
export { Divider };
