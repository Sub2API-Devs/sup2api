/**
 * ink/components/Text.tsx
 *
 * 并入 Text、Link、Box 等基础组件声明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/components/Text.tsx
 * pieces: chunk-bzr73sfg.js (5), chunk-x6v6jz2y.js (9)
 * attribution: placement 13, fingerprint 1
 */
import { ThemedBox } from "../../components/design-system/ThemedBox.js";
import { j, qt, Se, yt } from "../../../vendor/react/cjs/react.production.js";
import { isBuiltinTheme } from "../../utils/theme.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useResolvedTheme } from "../../components/design-system/ThemeProvider.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { getForcedHyperlinkSetting, supportsHyperlinks } from "../supports-hyperlinks.js";
import { onAttacherCapsChange } from "../../bootstrap/state.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { Qg } from "../../../vendor/stack-utils/index.js";
import { buildAccessibility } from "../dom.js";

//@ chunk-x6v6jz2y.js:6240-6249 placement
var Box = ThemedBox;
//@ chunk-x6v6jz2y.js:6249-6253 placement
j();
//@ chunk-x6v6jz2y.js:6253-6257 placement
j();
//@ chunk-x6v6jz2y.js:6257-6272 placement
var Zmt = qt(!1);
//@ chunk-x6v6jz2y.js:6272-6428 placement = resolveColor (1)
function resolveColor_2(color, theme) {
  if (!color) return;
  if (
    color.startsWith("rgb(") ||
    color.startsWith("#") ||
    color.startsWith("ansi256(") ||
    color.startsWith("ansi:")
  )
    return color;
  return isBuiltinTheme(color) ? theme[color] : void 0;
}
/**
 * 主题文本：color/backgroundColor 支持主题键或原始颜色，dimColor 用主题 inactive 色，其余属性透传给 Ink Text。
 */
//@ chunk-x6v6jz2y.js:6428-7543 placement = ThemedText (0.933)
function Text(t0) {
  let $ = w(32),
    l,
    u,
    d,
    p,
    m,
    b,
    C,
    h,
    k,
    x,
    E;
  if ($[0] !== t0)
    (({
      color: d,
      backgroundColor: l,
      dimColor: m,
      bold: b,
      italic: C,
      underline: h,
      strikethrough: k,
      inverse: x,
      wrap: E,
      children: u,
      ...p
    } = t0),
      ($[0] = t0),
      ($[1] = l),
      ($[2] = u),
      ($[3] = d),
      ($[4] = p),
      ($[5] = m),
      ($[6] = b),
      ($[7] = C),
      ($[8] = h),
      ($[9] = k),
      ($[10] = x),
      ($[11] = E));
  else
    ((l = $[1]),
      (u = $[2]),
      (d = $[3]),
      (p = $[4]),
      (m = $[5]),
      (b = $[6]),
      (C = $[7]),
      (h = $[8]),
      (k = $[9]),
      (x = $[10]),
      (E = $[11]));
  let A = m === void 0 ? !1 : m,
    T = b === void 0 ? !1 : b,
    M = C === void 0 ? !1 : C,
    I = h === void 0 ? !1 : h,
    O = k === void 0 ? !1 : k,
    F = x === void 0 ? !1 : x,
    B = E === void 0 ? "wrap" : E,
    _ = useResolvedTheme(),
    theme = Se(Zmt),
    L;
  if ($[12] !== d || $[13] !== A || $[14] !== theme || $[15] !== _)
    ((L = A && !theme ? _.inactive : resolveColor_2(d, _)),
      ($[12] = d),
      ($[13] = A),
      ($[14] = theme),
      ($[15] = _),
      ($[16] = L));
  else L = $[16];
  let D = L,
    U;
  if ($[17] !== l || $[18] !== _) ((U = resolveColor_2(l, _)), ($[17] = l), ($[18] = _), ($[19] = U));
  else U = $[19];
  let z = U;
  const G = A && !theme ? D : void 0;
  let oe;
  if (
    $[20] !== T ||
    $[21] !== u ||
    $[22] !== p ||
    $[23] !== F ||
    $[24] !== M ||
    $[25] !== z ||
    $[26] !== D ||
    $[27] !== O ||
    $[28] !== G ||
    $[29] !== I ||
    $[30] !== B
  )
    ((oe = e(BaseText, {
      color: D,
      backgroundColor: z,
      bold: T,
      faintInk: G,
      italic: M,
      underline: I,
      strikethrough: O,
      inverse: F,
      wrap: B,
      ...p,
      children: u,
    })),
      ($[20] = T),
      ($[21] = u),
      ($[22] = p),
      ($[23] = F),
      ($[24] = M),
      ($[25] = z),
      ($[26] = D),
      ($[27] = O),
      ($[28] = G),
      ($[29] = I),
      ($[30] = B),
      ($[31] = oe));
  else oe = $[31];
  return oe;
}
//@ chunk-x6v6jz2y.js:7543-7547 placement
j();
//@ chunk-x6v6jz2y.js:7547-7551 placement
j();
/**
 * <Link>：终端支持超链接时输出 ink-link（OSC 8），否则显示 fallback 或文字本身；assumeSupport 时以显式设置为准。
 */
//@ chunk-x6v6jz2y.js:7551-7918 placement = Link (0.487)
function Link(t0) {
  let m = w(7),
    { children: children, url: url, fallback: fallback, assumeSupport: assumeSupport } = t0,
    p = children ?? url,
    b;
  if (m[0] !== assumeSupport)
    ((b = () => (assumeSupport ? (getForcedHyperlinkSetting() ?? !0) : supportsHyperlinks())),
      (m[0] = assumeSupport),
      (m[1] = b));
  else b = m[1];
  if (yt(onAttacherCapsChange, b)) {
    let h;
    if (m[2] !== p || m[3] !== url)
      ((h = e(BaseText, { children: e("ink-link", { href: url, children: p }) })),
        (m[2] = p),
        (m[3] = url),
        (m[4] = h));
    else h = m[4];
    return h;
  }
  const h = fallback ?? p;
  let k;
  if (m[5] !== h) ((k = e(BaseText, { children: h })), (m[5] = h), (m[6] = k));
  else k = m[6];
  return k;
}
//@ chunk-bzr73sfg.js:224554-224558 placement
j();
//@ chunk-bzr73sfg.js:224558-224576 placement
var wl = Re(Qg(), 1);
//@ chunk-bzr73sfg.js:224611-224689 placement
function textWrapStyle(textWrap) {
  return { flexGrow: 0, flexShrink: 1, flexDirection: "row", textWrap: textWrap };
}
/**
 * 各 textWrap 取值对应的 ink-text 样式对象（预先建好，避免每次渲染新建）。
 */
//@ chunk-bzr73sfg.js:224689-224944 fingerprint = memoizedStylesForWrap (0.853)
var memoizedStylesForWrap = {
  wrap: textWrapStyle("wrap"),
  "wrap-trim": textWrapStyle("wrap-trim"),
  "wrap-stream": textWrapStyle("wrap-stream"),
  end: textWrapStyle("end"),
  middle: textWrapStyle("middle"),
  "truncate-end": textWrapStyle("truncate-end"),
  truncate: textWrapStyle("truncate"),
  "truncate-middle": textWrapStyle("truncate-middle"),
  "truncate-start": textWrapStyle("truncate-start"),
};
/**
 * <Text> 组件：把颜色/背景/faintInk/粗体/暗淡/斜体/下划线/删除线/反显组合成 textStyles，wrap 选择折行样式（默认 wrap），dir 设文字方向；支持悬停回调与 aria-* 无障碍属性；渲染为 ink-text 元素。
 */
//@ chunk-bzr73sfg.js:224944-227142 placement = Text (0.457)
function BaseText(t0) {
  let de = w(51),
    {
      color: color,
      backgroundColor: backgroundColor,
      faintInk: faintInk,
      bold: bold,
      dim: dim,
      italic: t1,
      underline: t2,
      strikethrough: t3,
      inverse: t4,
      wrap: t5,
      dir: dir,
      onMouseEnter: onMouseEnter,
      onMouseLeave: onMouseLeave,
      hoverFollowsPaint: hoverFollowsPaint,
      children: children,
      "aria-hidden": G,
      "aria-label": X,
      "aria-role": K,
      "aria-state": q,
      "aria-preserve-whitespace": Y,
    } = t0,
    J = t1 === void 0 ? !1 : t1,
    V = t2 === void 0 ? !1 : t2,
    ee = t3 === void 0 ? !1 : t3,
    ae = t4 === void 0 ? !1 : t4,
    ne = t5 === void 0 ? "wrap" : t5;
  if (children === void 0 || children === null) {
    return null;
  }
  let se;
  if (de[0] !== color) ((se = color && { color: color }), (de[0] = color), (de[1] = se));
  else se = de[1];
  let ye;
  if (de[2] !== backgroundColor)
    ((ye = backgroundColor && { backgroundColor: backgroundColor }), (de[2] = backgroundColor), (de[3] = ye));
  else ye = de[3];
  let ue;
  if (de[4] !== faintInk) ((ue = faintInk && { faintInk: faintInk }), (de[4] = faintInk), (de[5] = ue));
  else ue = de[5];
  let ce;
  if (de[6] !== dim) ((ce = dim && { dim: dim }), (de[6] = dim), (de[7] = ce));
  else ce = de[7];
  let pe;
  if (de[8] !== bold) ((pe = bold && { bold: bold }), (de[8] = bold), (de[9] = pe));
  else pe = de[9];
  let Se;
  if (de[10] !== J) ((Se = J && { italic: J }), (de[10] = J), (de[11] = Se));
  else Se = de[11];
  let xe;
  if (de[12] !== V) ((xe = V && { underline: V }), (de[12] = V), (de[13] = xe));
  else xe = de[13];
  let fe;
  if (de[14] !== ee) ((fe = ee && { strikethrough: ee }), (de[14] = ee), (de[15] = fe));
  else fe = de[15];
  let ge;
  if (de[16] !== ae) ((ge = ae && { inverse: ae }), (de[16] = ae), (de[17] = ge));
  else ge = de[17];
  let we;
  if (
    de[18] !== pe ||
    de[19] !== Se ||
    de[20] !== xe ||
    de[21] !== fe ||
    de[22] !== ge ||
    de[23] !== se ||
    de[24] !== ye ||
    de[25] !== ue ||
    de[26] !== ce
  )
    ((we = { ...se, ...ye, ...ue, ...ce, ...pe, ...Se, ...xe, ...fe, ...ge }),
      (de[18] = pe),
      (de[19] = Se),
      (de[20] = xe),
      (de[21] = fe),
      (de[22] = ge),
      (de[23] = se),
      (de[24] = ye),
      (de[25] = ue),
      (de[26] = ce),
      (de[27] = we));
  else we = de[27];
  let textStyles = we,
    Ne;
  if (de[28] !== dir || de[29] !== ne)
    ((Ne = dir === void 0 ? memoizedStylesForWrap[ne] : { ...memoizedStylesForWrap[ne], textDirection: dir }),
      (de[28] = dir),
      (de[29] = ne),
      (de[30] = Ne));
  else Ne = de[30];
  let Ce;
  if (de[31] !== onMouseEnter)
    ((Ce = onMouseEnter && { onMouseEnter: onMouseEnter }), (de[31] = onMouseEnter), (de[32] = Ce));
  else Ce = de[32];
  let Te;
  if (de[33] !== onMouseLeave)
    ((Te = onMouseLeave && { onMouseLeave: onMouseLeave }), (de[33] = onMouseLeave), (de[34] = Te));
  else Te = de[34];
  let Ae;
  if (de[35] !== hoverFollowsPaint)
    ((Ae = hoverFollowsPaint && { hoverFollowsPaint: hoverFollowsPaint }),
      (de[35] = hoverFollowsPaint),
      (de[36] = Ae));
  else Ae = de[36];
  let Pe;
  if (de[37] !== G || de[38] !== X || de[39] !== Y || de[40] !== K || de[41] !== q)
    ((Pe = buildAccessibility(G, X, K, q, Y)),
      (de[37] = G),
      (de[38] = X),
      (de[39] = Y),
      (de[40] = K),
      (de[41] = q),
      (de[42] = Pe));
  else Pe = de[42];
  let Ze;
  if (
    de[43] !== children ||
    de[44] !== Ne ||
    de[45] !== Ce ||
    de[46] !== Te ||
    de[47] !== Ae ||
    de[48] !== Pe ||
    de[49] !== textStyles
  )
    ((Ze = e("ink-text", {
      style: Ne,
      textStyles: textStyles,
      ...Ce,
      ...Te,
      ...Ae,
      accessibility: Pe,
      children: children,
    })),
      (de[43] = children),
      (de[44] = Ne),
      (de[45] = Ce),
      (de[46] = Te),
      (de[47] = Ae),
      (de[48] = Pe),
      (de[49] = textStyles),
      (de[50] = Ze));
  else Ze = de[50];
  return Ze;
}

export { Text, Box, Link, Zmt, textWrapStyle, BaseText, wl };
