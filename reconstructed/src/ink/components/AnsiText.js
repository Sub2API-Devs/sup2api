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
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseText, Link } from "./Text.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { parseToSpans, hasAnyTextProps } from "../Ansi.js";
import { StyledText } from "./ClockContext.js";

//@ chunk-x6v6jz2y.js:14043-15379 placement = Ansi (0.713)
/**
 * <Ansi>：把带 ANSI 转义的字符串解析成样式片段，渲染为嵌套 <Text>（OSC 8 片段包 <Link>）；支持 dimColor/italic 统一叠加、monochrome 去色。
 */
var Ansi = Rh(function (props) {
  let k = w(21);
  let { children, dimColor, italic, monochrome, wrap } = props;
  if (typeof children !== "string") {
    const dim = !!dimColor;
    const italic_2 = !!italic;
    const children_2 = String(children);
    let x;
    if (k[0] !== dim || k[1] !== italic_2 || k[2] !== children_2 || k[3] !== wrap) {
      x = jsxProd_default(BaseText, {
        dim,
        italic: italic_2,
        wrap,
        children: children_2,
      });
      k[0] = dim;
      k[1] = italic_2;
      k[2] = children_2;
      k[3] = wrap;
      k[4] = x;
    } else x = k[4];
    return x;
  }
  if (children === "") {
    return null;
  }
  let t1;
  let t2;
  if (k[5] !== children || k[6] !== dimColor || k[7] !== italic || k[8] !== monochrome || k[9] !== wrap) {
    t2 = EARLY_RETURN_SENTINEL;
    A: {
      let spans = parseToSpans(children);
      if (spans.length === 0) {
        t2 = null;
        break A;
      }
      if (spans.length === 1 && !hasAnyTextProps(spans[0].props) && spans[0].props.hyperlink === undefined) {
        t2 = jsxProd_default(BaseText, {
          dim: !!dimColor,
          italic: !!italic,
          wrap,
          children: spans[0].text,
        });
        break A;
      }
      let t3;
      if (k[12] !== dimColor || k[13] !== italic || k[14] !== monochrome) {
        t3 = (span, i) => {
          let hyperlink = span.props.hyperlink;
          if (dimColor) span.props.dim = true;
          if (italic) span.props.italic = true;
          if (monochrome) span.props.color = undefined;
          let hasTextProps = hasAnyTextProps(span.props)
            ? jsxProd_default(
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
                i,
              )
            : span.text;
          return hyperlink
            ? jsxProd_default(
                Link,
                {
                  url: hyperlink,
                  children: hasTextProps,
                },
                i,
              )
            : hasTextProps;
        };
        k[12] = dimColor;
        k[13] = italic;
        k[14] = monochrome;
        k[15] = t3;
      } else t3 = k[15];
      t1 = spans.map(t3);
    }
    k[5] = children;
    k[6] = dimColor;
    k[7] = italic;
    k[8] = monochrome;
    k[9] = wrap;
    k[10] = t1;
    k[11] = t2;
  } else {
    t1 = k[10];
    t2 = k[11];
  }
  if (t2 !== EARLY_RETURN_SENTINEL) return t2;
  let content = t1;
  const dim = !!dimColor;
  const italic_2 = !!italic;
  let B;
  if (k[16] !== content || k[17] !== dim || k[18] !== italic_2 || k[19] !== wrap) {
    B = jsxProd_default(BaseText, {
      dim,
      italic: italic_2,
      wrap,
      children: content,
    });
    k[16] = content;
    k[17] = dim;
    k[18] = italic_2;
    k[19] = wrap;
    k[20] = B;
  } else B = k[20];
  return B;
});
export { Ansi };
