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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { T8 } from "../../utils/permissions/autoModeRulesPrompt.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { Ansi } from "../../ink/components/AnsiText.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { Decorative } from "../../ink/components/ErrorBoundary.js";

//@ chunk-paas88x7.js:412-1609 callgraph-witnessed = Divider (0.56)
function Divider(t0) {
  let $ = w(27),
    { width: width, color: color, char: t1, padding: t2, title: title, titleAlign: titleAlign } = t0,
    o = t1 === void 0 ? T8 : t1,
    G = t2 === void 0 ? 0 : t2,
    H = titleAlign === void 0 ? "center" : titleAlign,
    { columns: terminalWidth } = useTerminalSize(),
    effectiveWidth = Math.max(0, (width ?? terminalWidth) - G),
    D;
  if ($[0] !== color || $[1] !== title)
    ((D = title ? e(Text, { color: color, dimColor: !color, children: e(Ansi, { children: title }) }) : null),
      ($[0] = color),
      ($[1] = title),
      ($[2] = D));
  else D = $[2];
  let v = D;
  if (title) {
    let J = bunStringWidth(title) + 2;
    let sideWidth = Math.max(0, effectiveWidth - J);
    let s = H === "start" ? Math.min(4, sideWidth) : Math.floor(sideWidth / 2);
    let k = sideWidth - s;
    const t3 = !color;
    let l;
    if ($[3] !== o || $[4] !== s) ((l = o.repeat(s)), ($[3] = o), ($[4] = s), ($[5] = l));
    else l = $[5];
    let h;
    if ($[6] !== title)
      ((h = e(Text, { dimColor: !0, children: e(Ansi, { children: title }) })), ($[6] = title), ($[7] = h));
    else h = $[7];
    let p;
    if ($[8] !== o || $[9] !== k) ((p = o.repeat(k)), ($[8] = o), ($[9] = k), ($[10] = p));
    else p = $[10];
    let W;
    if ($[11] !== color || $[12] !== t3 || $[13] !== l || $[14] !== h || $[15] !== p)
      ((W = r(Text, { color: color, dimColor: t3, children: [l, " ", h, " ", p] })),
        ($[11] = color),
        ($[12] = t3),
        ($[13] = l),
        ($[14] = h),
        ($[15] = p),
        ($[16] = W));
    else W = $[16];
    let R;
    if ($[17] !== v || $[18] !== W)
      ((R = e(Decorative, { fallback: v, children: W })), ($[17] = v), ($[18] = W), ($[19] = R));
    else R = $[19];
    return R;
  }
  const t3 = !color;
  let l;
  if ($[20] !== o || $[21] !== effectiveWidth)
    ((l = o.repeat(effectiveWidth)), ($[20] = o), ($[21] = effectiveWidth), ($[22] = l));
  else l = $[22];
  let h;
  if ($[23] !== color || $[24] !== t3 || $[25] !== l)
    ((h = e(Decorative, { children: e(Text, { color: color, dimColor: t3, children: l }) })),
      ($[23] = color),
      ($[24] = t3),
      ($[25] = l),
      ($[26] = h));
  else h = $[26];
  return h;
}

export { Divider };
