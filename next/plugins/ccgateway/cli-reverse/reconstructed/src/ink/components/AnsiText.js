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
import { memo } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseText, Link } from "./Text.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { parseToSpans, hasAnyTextProps } from "../Ansi.js";
import { StyledText } from "./ClockContext.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-x6v6jz2y.js:14043-15379 placement (2.1.88 match: Ansi, 0.713)
/**
 * <Ansi>：把带 ANSI 转义的字符串解析成样式片段，渲染为嵌套 <Text>（OSC 8 片段包 <Link>）；支持 dimColor/italic 统一叠加、monochrome 去色。
 */
var Ansi; // deferred: uses BaseText (./Text.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-x6v6jz2y.js:14043", () => {
  Ansi = memo(function (props) {
    let $ = useMemoCache(21);
    let { children, dimColor, italic, monochrome, wrap } = props;
    if (typeof children !== "string") {
      const dim = !!dimColor;
      const italic_2 = !!italic;
      const children_2 = String(children);
      let plainElement;
      if ($[0] !== dim || $[1] !== italic_2 || $[2] !== children_2 || $[3] !== wrap) {
        plainElement = jsxProd_default(BaseText, {
          dim,
          italic: italic_2,
          wrap,
          children: children_2,
        });
        $[0] = dim;
        $[1] = italic_2;
        $[2] = children_2;
        $[3] = wrap;
        $[4] = plainElement;
      } else plainElement = $[4];
      return plainElement;
    }
    if (children === "") {
      return null;
    }
    let t1;
    let t2;
    if ($[5] !== children || $[6] !== dimColor || $[7] !== italic || $[8] !== monochrome || $[9] !== wrap) {
      t2 = EARLY_RETURN_SENTINEL;
      A: {
        let spans = parseToSpans(children);
        if (spans.length === 0) {
          t2 = null;
          break A;
        }
        if (
          spans.length === 1 &&
          !hasAnyTextProps(spans[0].props) &&
          spans[0].props.hyperlink === undefined
        ) {
          t2 = jsxProd_default(BaseText, {
            dim: !!dimColor,
            italic: !!italic,
            wrap,
            children: spans[0].text,
          });
          break A;
        }
        let t3;
        if ($[12] !== dimColor || $[13] !== italic || $[14] !== monochrome) {
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
          $[12] = dimColor;
          $[13] = italic;
          $[14] = monochrome;
          $[15] = t3;
        } else t3 = $[15];
        t1 = spans.map(t3);
      }
      $[5] = children;
      $[6] = dimColor;
      $[7] = italic;
      $[8] = monochrome;
      $[9] = wrap;
      $[10] = t1;
      $[11] = t2;
    } else {
      t1 = $[10];
      t2 = $[11];
    }
    if (t2 !== EARLY_RETURN_SENTINEL) return t2;
    let content = t1;
    const dim = !!dimColor;
    const italic_2 = !!italic;
    let ansiElement;
    if ($[16] !== content || $[17] !== dim || $[18] !== italic_2 || $[19] !== wrap) {
      ansiElement = jsxProd_default(BaseText, {
        dim,
        italic: italic_2,
        wrap,
        children: content,
      });
      $[16] = content;
      $[17] = dim;
      $[18] = italic_2;
      $[19] = wrap;
      $[20] = ansiElement;
    } else ansiElement = $[20];
    return ansiElement;
  });
});
export { Ansi };
