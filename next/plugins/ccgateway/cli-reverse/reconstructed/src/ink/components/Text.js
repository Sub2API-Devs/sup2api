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
import {
  init_react_production,
  createContext,
  useContext,
  useSyncExternalStore,
} from "../../../vendor/react/cjs/react.production.js";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_stack_utils } from "../../../vendor/stack-utils/index.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { buildAccessibility } from "../dom.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ThemedBox } from "../../components/design-system/ThemedBox.js";
import { isBuiltinTheme } from "../../utils/theme.js";
import { useResolvedTheme } from "../../components/design-system/ThemeProvider.js";
import { getForcedHyperlinkSetting, supportsHyperlinks } from "../supports-hyperlinks.js";
import { onAttacherCapsChange } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-bzr73sfg.js:224554-224558 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bzr73sfg.js:224554", () => {
  init_react_production();
});
//@ chunk-bzr73sfg.js:224558-224576 placement
var textColorizer; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bzr73sfg.js:224558", () => {
  textColorizer = __toESM(require_stack_utils(), 1);
});
//@ chunk-bzr73sfg.js:224611-224689 placement
function textWrapStyle(textWrap) {
  return {
    flexGrow: 0,
    flexShrink: 1,
    flexDirection: "row",
    textWrap,
  };
}
//@ chunk-bzr73sfg.js:224689-224944 fingerprint (2.1.88 match: memoizedStylesForWrap, 0.853)
/**
 * 各 textWrap 取值对应的 ink-text 样式对象（预先建好，避免每次渲染新建）。
 */
var memoizedStylesForWrap; // deferred: uses textWrapStyle of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bzr73sfg.js:224689", () => {
  memoizedStylesForWrap = {
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
});
//@ chunk-bzr73sfg.js:224944-227142 placement (2.1.88 match: Text, 0.457)
/**
 * <Text> 组件：把颜色/背景/faintInk/粗体/暗淡/斜体/下划线/删除线/反显组合成 textStyles，wrap 选择折行样式（默认 wrap），dir 设文字方向；支持悬停回调与 aria-* 无障碍属性；渲染为 ink-text 元素。
 */
function BaseText(props) {
  let $ = useMemoCache(51);
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
  let italicFlag = italic === undefined ? false : italic;
  let underlineFlag = underline === undefined ? false : underline;
  let strikethroughFlag = strikethrough === undefined ? false : strikethrough;
  let inverseFlag = inverse === undefined ? false : inverse;
  let wrapMode = wrap === undefined ? "wrap" : wrap;
  if (children === undefined || children === null) {
    return null;
  }
  let t6;
  if ($[0] !== color) {
    t6 = color && {
      color,
    };
    $[0] = color;
    $[1] = t6;
  } else t6 = $[1];
  let bgProps;
  if ($[2] !== backgroundColor) {
    bgProps = backgroundColor && {
      backgroundColor,
    };
    $[2] = backgroundColor;
    $[3] = bgProps;
  } else bgProps = $[3];
  let faintProps;
  if ($[4] !== faintInk) {
    faintProps = faintInk && {
      faintInk,
    };
    $[4] = faintInk;
    $[5] = faintProps;
  } else faintProps = $[5];
  let dimProps;
  if ($[6] !== dim) {
    dimProps = dim && {
      dim,
    };
    $[6] = dim;
    $[7] = dimProps;
  } else dimProps = $[7];
  let boldProps;
  if ($[8] !== bold) {
    boldProps = bold && {
      bold,
    };
    $[8] = bold;
    $[9] = boldProps;
  } else boldProps = $[9];
  let italicProps;
  if ($[10] !== italicFlag) {
    italicProps = italicFlag && {
      italic: italicFlag,
    };
    $[10] = italicFlag;
    $[11] = italicProps;
  } else italicProps = $[11];
  let underlineProps;
  if ($[12] !== underlineFlag) {
    underlineProps = underlineFlag && {
      underline: underlineFlag,
    };
    $[12] = underlineFlag;
    $[13] = underlineProps;
  } else underlineProps = $[13];
  let strikethroughProps;
  if ($[14] !== strikethroughFlag) {
    strikethroughProps = strikethroughFlag && {
      strikethrough: strikethroughFlag,
    };
    $[14] = strikethroughFlag;
    $[15] = strikethroughProps;
  } else strikethroughProps = $[15];
  let inverseProps;
  if ($[16] !== inverseFlag) {
    inverseProps = inverseFlag && {
      inverse: inverseFlag,
    };
    $[16] = inverseFlag;
    $[17] = inverseProps;
  } else inverseProps = $[17];
  let textStyles;
  if (
    $[18] !== boldProps ||
    $[19] !== italicProps ||
    $[20] !== underlineProps ||
    $[21] !== strikethroughProps ||
    $[22] !== inverseProps ||
    $[23] !== t6 ||
    $[24] !== bgProps ||
    $[25] !== faintProps ||
    $[26] !== dimProps
  ) {
    textStyles = {
      ...t6,
      ...bgProps,
      ...faintProps,
      ...dimProps,
      ...boldProps,
      ...italicProps,
      ...underlineProps,
      ...strikethroughProps,
      ...inverseProps,
    };
    $[18] = boldProps;
    $[19] = italicProps;
    $[20] = underlineProps;
    $[21] = strikethroughProps;
    $[22] = inverseProps;
    $[23] = t6;
    $[24] = bgProps;
    $[25] = faintProps;
    $[26] = dimProps;
    $[27] = textStyles;
  } else textStyles = $[27];
  let textStyles_2 = textStyles;
  let style;
  if ($[28] !== dir || $[29] !== wrapMode) {
    style =
      dir === undefined
        ? memoizedStylesForWrap[wrapMode]
        : {
            ...memoizedStylesForWrap[wrapMode],
            textDirection: dir,
          };
    $[28] = dir;
    $[29] = wrapMode;
    $[30] = style;
  } else style = $[30];
  let enterProps;
  if ($[31] !== onMouseEnter) {
    enterProps = onMouseEnter && {
      onMouseEnter,
    };
    $[31] = onMouseEnter;
    $[32] = enterProps;
  } else enterProps = $[32];
  let leaveProps;
  if ($[33] !== onMouseLeave) {
    leaveProps = onMouseLeave && {
      onMouseLeave,
    };
    $[33] = onMouseLeave;
    $[34] = leaveProps;
  } else leaveProps = $[34];
  let hoverProps;
  if ($[35] !== hoverFollowsPaint) {
    hoverProps = hoverFollowsPaint && {
      hoverFollowsPaint,
    };
    $[35] = hoverFollowsPaint;
    $[36] = hoverProps;
  } else hoverProps = $[36];
  let accessibility;
  if (
    $[37] !== hidden ||
    $[38] !== label ||
    $[39] !== preserveWhitespace ||
    $[40] !== role ||
    $[41] !== state
  ) {
    accessibility = buildAccessibility(hidden, label, role, state, preserveWhitespace);
    $[37] = hidden;
    $[38] = label;
    $[39] = preserveWhitespace;
    $[40] = role;
    $[41] = state;
    $[42] = accessibility;
  } else accessibility = $[42];
  let textElement;
  if (
    $[43] !== children ||
    $[44] !== style ||
    $[45] !== enterProps ||
    $[46] !== leaveProps ||
    $[47] !== hoverProps ||
    $[48] !== accessibility ||
    $[49] !== textStyles_2
  ) {
    textElement = jsxProd_default("ink-text", {
      style,
      textStyles: textStyles_2,
      ...enterProps,
      ...leaveProps,
      ...hoverProps,
      accessibility,
      children,
    });
    $[43] = children;
    $[44] = style;
    $[45] = enterProps;
    $[46] = leaveProps;
    $[47] = hoverProps;
    $[48] = accessibility;
    $[49] = textStyles_2;
    $[50] = textElement;
  } else textElement = $[50];
  return textElement;
}
//@ chunk-x6v6jz2y.js:6240-6249 placement
var Box = ThemedBox;
//@ chunk-x6v6jz2y.js:6249-6253 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:6249", () => {
  init_react_production();
});
//@ chunk-x6v6jz2y.js:6253-6257 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:6253", () => {
  init_react_production();
});
//@ chunk-x6v6jz2y.js:6257-6272 placement
/**
 * 导出值：textSignal（文本标记）；位于「并入 Text、Link、Box 等基础组件声明」模块。
 */
var textSignal; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:6257", () => {
  textSignal = createContext(false);
});
//@ chunk-x6v6jz2y.js:6272-6428 placement (2.1.88 match: resolveColor, 1)
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
//@ chunk-x6v6jz2y.js:6428-7543 placement (2.1.88 match: ThemedText, 0.933)
/**
 * 主题文本：color/backgroundColor 支持主题键或原始颜色，dimColor 用主题 inactive 色，其余属性透传给 Ink Text。
 */
function Text(t0) {
  let $ = useMemoCache(32);
  let color;
  let children;
  let color_2;
  let rest;
  let dimColorProp;
  let boldProp;
  let italicProp;
  let underlineProp;
  let strikethroughProp;
  let inverseProp;
  let wrapProp;
  if ($[0] !== t0) {
    ({
      color: color_2,
      backgroundColor: color,
      dimColor: dimColorProp,
      bold: boldProp,
      italic: italicProp,
      underline: underlineProp,
      strikethrough: strikethroughProp,
      inverse: inverseProp,
      wrap: wrapProp,
      children,
      ...rest
    } = t0);
    $[0] = t0;
    $[1] = color;
    $[2] = children;
    $[3] = color_2;
    $[4] = rest;
    $[5] = dimColorProp;
    $[6] = boldProp;
    $[7] = italicProp;
    $[8] = underlineProp;
    $[9] = strikethroughProp;
    $[10] = inverseProp;
    $[11] = wrapProp;
  } else {
    color = $[1];
    children = $[2];
    color_2 = $[3];
    rest = $[4];
    dimColorProp = $[5];
    boldProp = $[6];
    italicProp = $[7];
    underlineProp = $[8];
    strikethroughProp = $[9];
    inverseProp = $[10];
    wrapProp = $[11];
  }
  let isDim = dimColorProp === undefined ? false : dimColorProp;
  let bold = boldProp === undefined ? false : boldProp;
  let italic = italicProp === undefined ? false : italicProp;
  let underline = underlineProp === undefined ? false : underlineProp;
  let strikethrough = strikethroughProp === undefined ? false : strikethroughProp;
  let inverse = inverseProp === undefined ? false : inverseProp;
  let wrap = wrapProp === undefined ? "wrap" : wrapProp;
  let theme = useResolvedTheme();
  let theme_2 = useContext(textSignal);
  let resolvedColor;
  if ($[12] !== color_2 || $[13] !== isDim || $[14] !== theme_2 || $[15] !== theme) {
    resolvedColor = isDim && !theme_2 ? theme.inactive : resolveColor_2(color_2, theme);
    $[12] = color_2;
    $[13] = isDim;
    $[14] = theme_2;
    $[15] = theme;
    $[16] = resolvedColor;
  } else resolvedColor = $[16];
  let textColor = resolvedColor;
  let resolvedBackground;
  if ($[17] !== color || $[18] !== theme) {
    resolvedBackground = resolveColor_2(color, theme);
    $[17] = color;
    $[18] = theme;
    $[19] = resolvedBackground;
  } else resolvedBackground = $[19];
  let backgroundColor = resolvedBackground;
  const faintInk = isDim && !theme_2 ? textColor : undefined;
  let t8;
  if (
    $[20] !== bold ||
    $[21] !== children ||
    $[22] !== rest ||
    $[23] !== inverse ||
    $[24] !== italic ||
    $[25] !== backgroundColor ||
    $[26] !== textColor ||
    $[27] !== strikethrough ||
    $[28] !== faintInk ||
    $[29] !== underline ||
    $[30] !== wrap
  ) {
    t8 = jsxProd_default(BaseText, {
      color: textColor,
      backgroundColor,
      bold,
      faintInk,
      italic,
      underline,
      strikethrough,
      inverse,
      wrap,
      ...rest,
      children,
    });
    $[20] = bold;
    $[21] = children;
    $[22] = rest;
    $[23] = inverse;
    $[24] = italic;
    $[25] = backgroundColor;
    $[26] = textColor;
    $[27] = strikethrough;
    $[28] = faintInk;
    $[29] = underline;
    $[30] = wrap;
    $[31] = t8;
  } else t8 = $[31];
  return t8;
}
//@ chunk-x6v6jz2y.js:7543-7547 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:7543", () => {
  init_react_production();
});
//@ chunk-x6v6jz2y.js:7547-7551 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:7547", () => {
  init_react_production();
});
//@ chunk-x6v6jz2y.js:7551-7918 placement (2.1.88 match: Link, 0.487)
/**
 * <Link>：终端支持超链接时输出 ink-link（OSC 8），否则显示 fallback 或文字本身；assumeSupport 时以显式设置为准。
 */
function Link(props) {
  let $ = useMemoCache(7);
  let { children, url, fallback, assumeSupport } = props;
  let content = children ?? url;
  let supportsLinks;
  if ($[0] !== assumeSupport) {
    supportsLinks = () => (assumeSupport ? (getForcedHyperlinkSetting() ?? true) : supportsHyperlinks());
    $[0] = assumeSupport;
    $[1] = supportsLinks;
  } else supportsLinks = $[1];
  if (useSyncExternalStore(onAttacherCapsChange, supportsLinks)) {
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
export { Text, Box, Link, textSignal, textWrapStyle, BaseText, textColorizer };
