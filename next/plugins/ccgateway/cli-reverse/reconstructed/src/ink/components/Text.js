/**
 * ink/components/Text.tsx
 *
 * 并入 Text、Link、Box 等基础组件声明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/components/Text.tsx
 * pieces: chunk-2avr6cej.js (5), chunk-emhzq435.js (9)
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

//@ chunk-2avr6cej.js:224149-224153 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2avr6cej.js:224149", () => {
  init_react_production();
});
//@ chunk-2avr6cej.js:224153-224171 placement
var textColorizer; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2avr6cej.js:224153", () => {
  textColorizer = __toESM(require_stack_utils(), 1);
});
//@ chunk-2avr6cej.js:224206-224284 placement
function textWrapStyle(textWrap) {
  return {
    flexGrow: 0,
    flexShrink: 1,
    flexDirection: "row",
    textWrap,
  };
}
//@ chunk-2avr6cej.js:224284-224539 fingerprint (2.1.88 match: memoizedStylesForWrap, 0.853)
/**
 * 各 textWrap 取值对应的 ink-text 样式对象（预先建好，避免每次渲染新建）。
 */
var memoizedStylesForWrap; // deferred: uses textWrapStyle of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-2avr6cej.js:224284", () => {
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
//@ chunk-2avr6cej.js:224539-226737 placement (2.1.88 match: Text, 0.457)
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
//@ chunk-emhzq435.js:6178-6187 placement
/**
 * Text 的导出别名（组件）。
 */
var Box = ThemedBox;
//@ chunk-emhzq435.js:6187-6191 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-emhzq435.js:6187", () => {
  init_react_production();
});
//@ chunk-emhzq435.js:6191-6195 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-emhzq435.js:6191", () => {
  init_react_production();
});
//@ chunk-emhzq435.js:6195-6210 placement
/**
 * 导出值：textSignal（文本标记）；位于「并入 Text、Link、Box 等基础组件声明」模块。
 */
var textSignal; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-emhzq435.js:6195", () => {
  textSignal = createContext(false);
});
//@ chunk-emhzq435.js:6210-6366 placement (2.1.88 match: resolveColor, 1)
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
//@ chunk-emhzq435.js:6366-7481 placement (2.1.88 match: ThemedText, 0.933)
/**
 * 文本组件：把 color/bold/italic/underline 等属性解析后交给底层 Text（含 faint 时的暗色处理）。
 */
function Text(props) {
  let $ = useMemoCache(32);
  let backgroundColorProp;
  let children;
  let colorProp;
  let restProps;
  let dimColorProp;
  let boldProp;
  let italicProp;
  let underlineProp;
  let strikethroughProp;
  let inverseProp;
  let wrapProp;
  if ($[0] !== props) {
    ({
      color: colorProp,
      backgroundColor: backgroundColorProp,
      dimColor: dimColorProp,
      bold: boldProp,
      italic: italicProp,
      underline: underlineProp,
      strikethrough: strikethroughProp,
      inverse: inverseProp,
      wrap: wrapProp,
      children,
      ...restProps
    } = props);
    $[0] = props;
    $[1] = backgroundColorProp;
    $[2] = children;
    $[3] = colorProp;
    $[4] = restProps;
    $[5] = dimColorProp;
    $[6] = boldProp;
    $[7] = italicProp;
    $[8] = underlineProp;
    $[9] = strikethroughProp;
    $[10] = inverseProp;
    $[11] = wrapProp;
  } else {
    backgroundColorProp = $[1];
    children = $[2];
    colorProp = $[3];
    restProps = $[4];
    dimColorProp = $[5];
    boldProp = $[6];
    italicProp = $[7];
    underlineProp = $[8];
    strikethroughProp = $[9];
    inverseProp = $[10];
    wrapProp = $[11];
  }
  let dim = dimColorProp === undefined ? false : dimColorProp;
  let boldOn = boldProp === undefined ? false : boldProp;
  let italicOn = italicProp === undefined ? false : italicProp;
  let underlineOn = underlineProp === undefined ? false : underlineProp;
  let strikethroughOn = strikethroughProp === undefined ? false : strikethroughProp;
  let inverseOn = inverseProp === undefined ? false : inverseProp;
  let wrapMode = wrapProp === undefined ? "wrap" : wrapProp;
  let theme = useResolvedTheme();
  let textContext = useContext(textSignal);
  let colorResolved;
  if ($[12] !== colorProp || $[13] !== dim || $[14] !== textContext || $[15] !== theme) {
    colorResolved = dim && !textContext ? theme.inactive : resolveColor_2(colorProp, theme);
    $[12] = colorProp;
    $[13] = dim;
    $[14] = textContext;
    $[15] = theme;
    $[16] = colorResolved;
  } else colorResolved = $[16];
  let textColor = colorResolved;
  let backgroundColorResolved;
  if ($[17] !== backgroundColorProp || $[18] !== theme) {
    backgroundColorResolved = resolveColor_2(backgroundColorProp, theme);
    $[17] = backgroundColorProp;
    $[18] = theme;
    $[19] = backgroundColorResolved;
  } else backgroundColorResolved = $[19];
  let backgroundColor = backgroundColorResolved;
  const faintInk = dim && !textContext ? textColor : undefined;
  let element;
  if (
    $[20] !== boldOn ||
    $[21] !== children ||
    $[22] !== restProps ||
    $[23] !== inverseOn ||
    $[24] !== italicOn ||
    $[25] !== backgroundColor ||
    $[26] !== textColor ||
    $[27] !== strikethroughOn ||
    $[28] !== faintInk ||
    $[29] !== underlineOn ||
    $[30] !== wrapMode
  ) {
    element = jsxProd_default(BaseText, {
      color: textColor,
      backgroundColor,
      bold: boldOn,
      faintInk,
      italic: italicOn,
      underline: underlineOn,
      strikethrough: strikethroughOn,
      inverse: inverseOn,
      wrap: wrapMode,
      ...restProps,
      children,
    });
    $[20] = boldOn;
    $[21] = children;
    $[22] = restProps;
    $[23] = inverseOn;
    $[24] = italicOn;
    $[25] = backgroundColor;
    $[26] = textColor;
    $[27] = strikethroughOn;
    $[28] = faintInk;
    $[29] = underlineOn;
    $[30] = wrapMode;
    $[31] = element;
  } else element = $[31];
  return element;
}
//@ chunk-emhzq435.js:7481-7485 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-emhzq435.js:7481", () => {
  init_react_production();
});
//@ chunk-emhzq435.js:7485-7489 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-emhzq435.js:7485", () => {
  init_react_production();
});
//@ chunk-emhzq435.js:7489-7856 placement (2.1.88 match: Link, 0.487)
/**
 * 链接组件：支持超链接时输出 ink-link，否则退回 fallback 文本。
 */
function Link(props) {
  let $ = useMemoCache(7);
  let { children, url, fallback, assumeSupport } = props;
  let content = children ?? url;
  let getSupported;
  if ($[0] !== assumeSupport) {
    getSupported = () => (assumeSupport ? (getForcedHyperlinkSetting() ?? true) : supportsHyperlinks());
    $[0] = assumeSupport;
    $[1] = getSupported;
  } else getSupported = $[1];
  if (useSyncExternalStore(onAttacherCapsChange, getSupported)) {
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
  const children2 = fallback ?? content;
  let t2;
  if ($[5] !== children2) {
    t2 = jsxProd_default(BaseText, {
      children: children2,
    });
    $[5] = children2;
    $[6] = t2;
  } else t2 = $[6];
  return t2;
}
export { Box, Text, Link, textWrapStyle, textColorizer, BaseText, textSignal };
