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
import { init_react_production, qt, Se, yt } from "../../../vendor/react/cjs/react.production.js";
import { isBuiltinTheme } from "../../utils/theme.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useResolvedTheme } from "../../components/design-system/ThemeProvider.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { getForcedHyperlinkSetting, supportsHyperlinks } from "../supports-hyperlinks.js";
import { onAttacherCapsChange } from "../../bootstrap/state.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { require_stack_utils } from "../../../vendor/stack-utils/index.js";
import { buildAccessibility } from "../dom.js";

//@ chunk-x6v6jz2y.js:6240-6249 placement
var Box = ThemedBox;
//@ chunk-x6v6jz2y.js:6249-6253 placement
init_react_production();
//@ chunk-x6v6jz2y.js:6253-6257 placement
init_react_production();
//@ chunk-x6v6jz2y.js:6257-6272 placement
/**
 * 导出值：textSignal（文本标记）；位于「并入 Text、Link、Box 等基础组件声明」模块。
 */
var textSignal = qt(false);
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
  return isBuiltinTheme(color) ? theme[color] : undefined;
}
//@ chunk-x6v6jz2y.js:6428-7543 placement = ThemedText (0.933)
/**
 * 主题文本：color/backgroundColor 支持主题键或原始颜色，dimColor 用主题 inactive 色，其余属性透传给 Ink Text。
 */
function Text(t0) {
  let $ = w(32);
  let color;
  let children;
  let color_2;
  let p;
  let m;
  let b;
  let C;
  let h;
  let k;
  let x;
  let E;
  if ($[0] !== t0) {
    ({
      color: color_2,
      backgroundColor: color,
      dimColor: m,
      bold: b,
      italic: C,
      underline: h,
      strikethrough: k,
      inverse: x,
      wrap: E,
      children,
      ...p
    } = t0);
    $[0] = t0;
    $[1] = color;
    $[2] = children;
    $[3] = color_2;
    $[4] = p;
    $[5] = m;
    $[6] = b;
    $[7] = C;
    $[8] = h;
    $[9] = k;
    $[10] = x;
    $[11] = E;
  } else {
    color = $[1];
    children = $[2];
    color_2 = $[3];
    p = $[4];
    m = $[5];
    b = $[6];
    C = $[7];
    h = $[8];
    k = $[9];
    x = $[10];
    E = $[11];
  }
  let A = m === undefined ? false : m;
  let bold = b === undefined ? false : b;
  let italic = C === undefined ? false : C;
  let underline = h === undefined ? false : h;
  let strikethrough = k === undefined ? false : k;
  let inverse = x === undefined ? false : x;
  let wrap = E === undefined ? "wrap" : E;
  let theme = useResolvedTheme();
  let theme_2 = Se(textSignal);
  let L;
  if ($[12] !== color_2 || $[13] !== A || $[14] !== theme_2 || $[15] !== theme) {
    L = A && !theme_2 ? theme.inactive : resolveColor_2(color_2, theme);
    $[12] = color_2;
    $[13] = A;
    $[14] = theme_2;
    $[15] = theme;
    $[16] = L;
  } else L = $[16];
  let D = L;
  let U;
  if ($[17] !== color || $[18] !== theme) {
    U = resolveColor_2(color, theme);
    $[17] = color;
    $[18] = theme;
    $[19] = U;
  } else U = $[19];
  let backgroundColor = U;
  const faintInk = A && !theme_2 ? D : undefined;
  let t8;
  if (
    $[20] !== bold ||
    $[21] !== children ||
    $[22] !== p ||
    $[23] !== inverse ||
    $[24] !== italic ||
    $[25] !== backgroundColor ||
    $[26] !== D ||
    $[27] !== strikethrough ||
    $[28] !== faintInk ||
    $[29] !== underline ||
    $[30] !== wrap
  ) {
    t8 = jsxProd_default(BaseText, {
      color: D,
      backgroundColor,
      bold,
      faintInk,
      italic,
      underline,
      strikethrough,
      inverse,
      wrap,
      ...p,
      children,
    });
    $[20] = bold;
    $[21] = children;
    $[22] = p;
    $[23] = inverse;
    $[24] = italic;
    $[25] = backgroundColor;
    $[26] = D;
    $[27] = strikethrough;
    $[28] = faintInk;
    $[29] = underline;
    $[30] = wrap;
    $[31] = t8;
  } else t8 = $[31];
  return t8;
}
//@ chunk-x6v6jz2y.js:7543-7547 placement
init_react_production();
//@ chunk-x6v6jz2y.js:7547-7551 placement
init_react_production();
//@ chunk-x6v6jz2y.js:7551-7918 placement = Link (0.487)
/**
 * <Link>：终端支持超链接时输出 ink-link（OSC 8），否则显示 fallback 或文字本身；assumeSupport 时以显式设置为准。
 */
function Link(props) {
  let $ = w(7);
  let { children, url, fallback, assumeSupport } = props;
  let content = children ?? url;
  let b;
  if ($[0] !== assumeSupport) {
    b = () => (assumeSupport ? (getForcedHyperlinkSetting() ?? true) : supportsHyperlinks());
    $[0] = assumeSupport;
    $[1] = b;
  } else b = $[1];
  if (yt(onAttacherCapsChange, b)) {
    let t1;
    if ($[2] !== content || $[3] !== url) {
      t1 = jsxProd_default(BaseText, {
        children: jsxProd_default("ink-link", {
          href: url,
          children: content,
        }),
      });
      $[2] = content;
      $[3] = url;
      $[4] = t1;
    } else t1 = $[4];
    return t1;
  }
  const children_2 = fallback ?? content;
  let t2;
  if ($[5] !== children_2) {
    t2 = jsxProd_default(BaseText, {
      children: children_2,
    });
    $[5] = children_2;
    $[6] = t2;
  } else t2 = $[6];
  return t2;
}
//@ chunk-bzr73sfg.js:224554-224558 placement
init_react_production();
//@ chunk-bzr73sfg.js:224558-224576 placement
var textColorizer = Re(require_stack_utils(), 1);
//@ chunk-bzr73sfg.js:224611-224689 placement
function textWrapStyle(textWrap) {
  return {
    flexGrow: 0,
    flexShrink: 1,
    flexDirection: "row",
    textWrap,
  };
}
//@ chunk-bzr73sfg.js:224689-224944 fingerprint = memoizedStylesForWrap (0.853)
/**
 * 各 textWrap 取值对应的 ink-text 样式对象（预先建好，避免每次渲染新建）。
 */
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
//@ chunk-bzr73sfg.js:224944-227142 placement = Text (0.457)
/**
 * <Text> 组件：把颜色/背景/faintInk/粗体/暗淡/斜体/下划线/删除线/反显组合成 textStyles，wrap 选择折行样式（默认 wrap），dir 设文字方向；支持悬停回调与 aria-* 无障碍属性；渲染为 ink-text 元素。
 */
function BaseText(props) {
  let de = w(51);
  let {
    color,
    backgroundColor,
    faintInk,
    bold,
    dim,
    italic,
    underline,
    strikethrough,
    inverse,
    wrap,
    dir,
    onMouseEnter,
    onMouseLeave,
    hoverFollowsPaint,
    children,
    "aria-hidden": hidden,
    "aria-label": label,
    "aria-role": role,
    "aria-state": state,
    "aria-preserve-whitespace": preserveWhitespace,
  } = props;
  let J = italic === undefined ? false : italic;
  let V = underline === undefined ? false : underline;
  let ee = strikethrough === undefined ? false : strikethrough;
  let ae = inverse === undefined ? false : inverse;
  let ne = wrap === undefined ? "wrap" : wrap;
  if (children === undefined || children === null) {
    return null;
  }
  let t6;
  if (de[0] !== color) {
    t6 = color && {
      color,
    };
    de[0] = color;
    de[1] = t6;
  } else t6 = de[1];
  let ye;
  if (de[2] !== backgroundColor) {
    ye = backgroundColor && {
      backgroundColor,
    };
    de[2] = backgroundColor;
    de[3] = ye;
  } else ye = de[3];
  let ue;
  if (de[4] !== faintInk) {
    ue = faintInk && {
      faintInk,
    };
    de[4] = faintInk;
    de[5] = ue;
  } else ue = de[5];
  let ce;
  if (de[6] !== dim) {
    ce = dim && {
      dim,
    };
    de[6] = dim;
    de[7] = ce;
  } else ce = de[7];
  let pe;
  if (de[8] !== bold) {
    pe = bold && {
      bold,
    };
    de[8] = bold;
    de[9] = pe;
  } else pe = de[9];
  let Se;
  if (de[10] !== J) {
    Se = J && {
      italic: J,
    };
    de[10] = J;
    de[11] = Se;
  } else Se = de[11];
  let xe;
  if (de[12] !== V) {
    xe = V && {
      underline: V,
    };
    de[12] = V;
    de[13] = xe;
  } else xe = de[13];
  let fe;
  if (de[14] !== ee) {
    fe = ee && {
      strikethrough: ee,
    };
    de[14] = ee;
    de[15] = fe;
  } else fe = de[15];
  let ge;
  if (de[16] !== ae) {
    ge = ae && {
      inverse: ae,
    };
    de[16] = ae;
    de[17] = ge;
  } else ge = de[17];
  let we;
  if (
    de[18] !== pe ||
    de[19] !== Se ||
    de[20] !== xe ||
    de[21] !== fe ||
    de[22] !== ge ||
    de[23] !== t6 ||
    de[24] !== ye ||
    de[25] !== ue ||
    de[26] !== ce
  ) {
    we = {
      ...t6,
      ...ye,
      ...ue,
      ...ce,
      ...pe,
      ...Se,
      ...xe,
      ...fe,
      ...ge,
    };
    de[18] = pe;
    de[19] = Se;
    de[20] = xe;
    de[21] = fe;
    de[22] = ge;
    de[23] = t6;
    de[24] = ye;
    de[25] = ue;
    de[26] = ce;
    de[27] = we;
  } else we = de[27];
  let textStyles = we;
  let style;
  if (de[28] !== dir || de[29] !== ne) {
    style =
      dir === undefined
        ? memoizedStylesForWrap[ne]
        : {
            ...memoizedStylesForWrap[ne],
            textDirection: dir,
          };
    de[28] = dir;
    de[29] = ne;
    de[30] = style;
  } else style = de[30];
  let Ce;
  if (de[31] !== onMouseEnter) {
    Ce = onMouseEnter && {
      onMouseEnter,
    };
    de[31] = onMouseEnter;
    de[32] = Ce;
  } else Ce = de[32];
  let Te;
  if (de[33] !== onMouseLeave) {
    Te = onMouseLeave && {
      onMouseLeave,
    };
    de[33] = onMouseLeave;
    de[34] = Te;
  } else Te = de[34];
  let Ae;
  if (de[35] !== hoverFollowsPaint) {
    Ae = hoverFollowsPaint && {
      hoverFollowsPaint,
    };
    de[35] = hoverFollowsPaint;
    de[36] = Ae;
  } else Ae = de[36];
  let accessibility;
  if (
    de[37] !== hidden ||
    de[38] !== label ||
    de[39] !== preserveWhitespace ||
    de[40] !== role ||
    de[41] !== state
  ) {
    accessibility = buildAccessibility(hidden, label, role, state, preserveWhitespace);
    de[37] = hidden;
    de[38] = label;
    de[39] = preserveWhitespace;
    de[40] = role;
    de[41] = state;
    de[42] = accessibility;
  } else accessibility = de[42];
  let Ze;
  if (
    de[43] !== children ||
    de[44] !== style ||
    de[45] !== Ce ||
    de[46] !== Te ||
    de[47] !== Ae ||
    de[48] !== accessibility ||
    de[49] !== textStyles
  ) {
    Ze = jsxProd_default("ink-text", {
      style,
      textStyles,
      ...Ce,
      ...Te,
      ...Ae,
      accessibility,
      children,
    });
    de[43] = children;
    de[44] = style;
    de[45] = Ce;
    de[46] = Te;
    de[47] = Ae;
    de[48] = accessibility;
    de[49] = textStyles;
    de[50] = Ze;
  } else Ze = de[50];
  return Ze;
}
export { Text, Box, Link, textSignal, textWrapStyle, BaseText, textColorizer };
