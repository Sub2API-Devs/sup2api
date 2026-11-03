/**
 * ink/Ansi.tsx
 *
 * <Ansi> 组件：把含 ANSI 转义的字符串解析成样式段并渲染为 <Text>（粗体/暗/斜体/颜色/超链接）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/Ansi.tsx
 * pieces: chunk-x6v6jz2y.js (6)
 * attribution: fingerprint 6
 */
import { Parser } from "./termio/parser.js";

//@ chunk-x6v6jz2y.js:15379-15751 fingerprint = parseToSpans (0.926)
/**
 * 用 termio Parser 把 ANSI 字符串转成 {text, props} 片段（相邻同样式合并，携带超链接）。
 */
function parseToSpans(input) {
  let actions = new Parser({
    stringsEndAtLineFeed: true,
  }).feed(input);
  let spans = [];
  let currentHyperlink;
  for (let action of actions) {
    if (action.type === "link") {
      if (action.action.type === "start") currentHyperlink = action.action.url;
      else currentHyperlink = undefined;
      continue;
    }
    if (action.type === "text") {
      let text = action.graphemes.map((grapheme) => grapheme.value).join("");
      if (!text) continue;
      let props = textStyleToSpanProps(action.style);
      if (currentHyperlink) props.hyperlink = currentHyperlink;
      let lastSpan = spans.at(-1);
      if (lastSpan && propsEqual(lastSpan.props, props)) lastSpan.text += text;
      else
        spans.push({
          text,
          props,
        });
    }
  }
  return spans;
}
//@ chunk-x6v6jz2y.js:15751-16008 fingerprint = textStyleToSpanProps (0.943)
/**
 * 把解析出的 ANSI 文本样式转成 <Text> 的属性（颜色、粗体、暗、斜体、下划线、删除线、反显）。
 */
function textStyleToSpanProps(style) {
  return {
    color: colorToString(style.fg),
    backgroundColor: colorToString(style.bg),
    dim: style.dim ? true : undefined,
    bold: style.bold ? true : undefined,
    italic: style.italic ? true : undefined,
    underline: style.underline !== "none" ? true : undefined,
    strikethrough: style.strikethrough ? true : undefined,
    inverse: style.inverse ? true : undefined,
    hyperlink: undefined,
  };
}
//@ chunk-x6v6jz2y.js:16008-16413 fingerprint = NAMED_COLOR_MAP (1)
var NAMED_COLOR_MAP = {
  black: "ansi:black",
  red: "ansi:red",
  green: "ansi:green",
  yellow: "ansi:yellow",
  blue: "ansi:blue",
  magenta: "ansi:magenta",
  cyan: "ansi:cyan",
  white: "ansi:white",
  brightBlack: "ansi:blackBright",
  brightRed: "ansi:redBright",
  brightGreen: "ansi:greenBright",
  brightYellow: "ansi:yellowBright",
  brightBlue: "ansi:blueBright",
  brightMagenta: "ansi:magentaBright",
  brightCyan: "ansi:cyanBright",
  brightWhite: "ansi:whiteBright",
};
//@ chunk-x6v6jz2y.js:16413-16581 fingerprint = colorToString (1)
function colorToString(color) {
  switch (color.type) {
    case "named":
      return NAMED_COLOR_MAP[color.name];
    case "indexed":
      return `ansi256(${color.index})`;
    case "rgb":
      return `rgb(${color.r},${color.g},${color.b})`;
    case "default":
      return;
  }
}
//@ chunk-x6v6jz2y.js:16581-16827 fingerprint = propsEqual (1)
function propsEqual(a, b) {
  return (
    a.color === b.color &&
    a.backgroundColor === b.backgroundColor &&
    a.bold === b.bold &&
    a.dim === b.dim &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.strikethrough === b.strikethrough &&
    a.inverse === b.inverse &&
    a.hyperlink === b.hyperlink
  );
}
//@ chunk-x6v6jz2y.js:16827-16990 fingerprint = hasAnyTextProps (1)
function hasAnyTextProps(props) {
  return (
    props.color !== undefined ||
    props.backgroundColor !== undefined ||
    props.dim === true ||
    props.bold === true ||
    props.italic === true ||
    props.underline === true ||
    props.strikethrough === true ||
    props.inverse === true
  );
}
export { parseToSpans, hasAnyTextProps };
