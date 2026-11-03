/**
 * ink/components/AnsiText.tsx
 *
 * 2.1.316 新增：Ansi 文本组件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x6v6jz2y.js (1)
 * attribution: placement 1
 */
import { Rh } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseText, Link } from "./Text.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { parseToSpans, hasAnyTextProps } from "../Ansi.js";
import { StyledText } from "./ClockContext.js";

/**
 * <Ansi>：把带 ANSI 转义的字符串解析成样式片段，渲染为嵌套 <Text>（OSC 8 片段包 <Link>）；支持 dimColor/italic 统一叠加、monochrome 去色。
 */
//@ chunk-x6v6jz2y.js:14043-15379 placement = Ansi (0.713)
var Ansi = Rh(function (t0) {
  let k = w(21),
    { children: children, dimColor: dimColor, italic: italic, monochrome: monochrome, wrap: wrap } = t0;
  if (typeof children !== "string") {
    const b = !!dimColor;
    const C = !!italic;
    const h = String(children);
    let x;
    if (k[0] !== b || k[1] !== C || k[2] !== h || k[3] !== wrap)
      ((x = e(BaseText, { dim: b, italic: C, wrap: wrap, children: h })),
        (k[0] = b),
        (k[1] = C),
        (k[2] = h),
        (k[3] = wrap),
        (k[4] = x));
    else x = k[4];
    return x;
  }
  if (children === "") {
    return null;
  }
  let b, C;
  if (k[5] !== children || k[6] !== dimColor || k[7] !== italic || k[8] !== monochrome || k[9] !== wrap) {
    C = EARLY_RETURN_SENTINEL;
    A: {
      let spans = parseToSpans(children);
      if (spans.length === 0) {
        C = null;
        break A;
      }
      if (spans.length === 1 && !hasAnyTextProps(spans[0].props) && spans[0].props.hyperlink === void 0) {
        C = e(BaseText, { dim: !!dimColor, italic: !!italic, wrap: wrap, children: spans[0].text });
        break A;
      }
      let h;
      if (k[12] !== dimColor || k[13] !== italic || k[14] !== monochrome)
        ((h = (span, M) => {
          let hyperlink = span.props.hyperlink;
          if (dimColor) span.props.dim = !0;
          if (italic) span.props.italic = !0;
          if (monochrome) span.props.color = void 0;
          let O = hasAnyTextProps(span.props)
            ? e(
                StyledText,
                {
                  color: span.props.color,
                  backgroundColor: span.props.backgroundColor,
                  dim: span.props.dim,
                  bold: span.props.bold,
                  italic: span.props.italic,
                  underline: span.props.underline,
                  strikethrough: span.props.strikethrough,
                  inverse: span.props.inverse,
                  children: span.text,
                },
                M,
              )
            : span.text;
          return hyperlink ? e(Link, { url: hyperlink, children: O }, M) : O;
        }),
          (k[12] = dimColor),
          (k[13] = italic),
          (k[14] = monochrome),
          (k[15] = h));
      else h = k[15];
      b = spans.map(h);
    }
    ((k[5] = children),
      (k[6] = dimColor),
      (k[7] = italic),
      (k[8] = monochrome),
      (k[9] = wrap),
      (k[10] = b),
      (k[11] = C));
  } else ((b = k[10]), (C = k[11]));
  if (C !== EARLY_RETURN_SENTINEL) return C;
  let content = b;
  const h = !!dimColor,
    x = !!italic;
  let B;
  if (k[16] !== content || k[17] !== h || k[18] !== x || k[19] !== wrap)
    ((B = e(BaseText, { dim: h, italic: x, wrap: wrap, children: content })),
      (k[16] = content),
      (k[17] = h),
      (k[18] = x),
      (k[19] = wrap),
      (k[20] = B));
  else B = k[20];
  return B;
});

export { Ansi };
