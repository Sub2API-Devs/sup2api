/**
 * components/shell/OutputLine.tsx
 *
 * Shell 输出行：尝试把 JSON 格式化，按 error/warning 着色，截断显示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/shell/OutputLine.tsx
 * pieces: chunk-s3fw2t2g.js (11)
 * attribution: placement 9, fingerprint 1, file-local 1
 */
import { j, qt, Se } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { d5 } from "../messages/expandContext.js";
import { ValidationErrorsList_2 } from "../ValidationErrorsList.js";
import { wrapText_2 } from "../../utils/terminal.js";
import { Ansi } from "../../ink/components/AnsiText.js";
import { MessageResponse } from "../MessageResponse.js";
import { Text } from "../../ink/components/Text.js";

//@ chunk-s3fw2t2g.js:634-638 placement
j();
//@ chunk-s3fw2t2g.js:638-642 placement
j();
//@ chunk-s3fw2t2g.js:642-646 placement
j();
//@ chunk-s3fw2t2g.js:646-659 placement
var c = qt(!1);
/**
 * 为子树标记处于工具结果中。
 */
//@ chunk-s3fw2t2g.js:659-788 placement
function InsideToolResultProvider(r) {
  let s = w(2),
    { children: children } = r,
    o;
  if (s[0] !== children)
    ((o = e(c.Provider, { value: !0, children: children })), (s[0] = children), (s[1] = o));
  else o = s[1];
  return o;
}
//@ chunk-s3fw2t2g.js:788-814 placement
function u() {
  return Se(c);
}
//@ chunk-s3fw2t2g.js:814-972 placement
function linkifyUrlsInText(content) {
  try {
    let t = jsonParse(content),
      s = jsonStringify(t),
      replaced = content.replaceAll("\\/", "/").replace(/\s+/g, ""),
      replaced_2 = s.replace(/\s+/g, "");
    if (replaced !== replaced_2) return content;
    return jsonStringify(t, null, 2);
  } catch {
    return content;
  }
}
//@ chunk-s3fw2t2g.js:972-982 placement
var P = 1e4;
//@ chunk-s3fw2t2g.js:982-1056 placement
function tryJsonFormatContent(content) {
  if (content.length > P) return content;
  return content
    .split(
      `
`,
    )
    .map(linkifyUrlsInText).join(`
`);
}
//@ chunk-s3fw2t2g.js:1296-1893 fingerprint = OutputLine (0.829)
function OutputLine(t0) {
  let $ = w(14),
    { content: content, verbose: verbose, isError: isError, isWarning: isWarning } = t0,
    { columns: columns } = useTerminalSize(),
    [g] = useTheme(),
    expandShellOutput = u(),
    h = Se(d5),
    shouldShowFull = verbose || expandShellOutput,
    O;
  if ($[0] !== content || $[1] !== g)
    ((O = ValidationErrorsList_2(tryJsonFormatContent(content), g)),
      ($[0] = content),
      ($[1] = g),
      ($[2] = O));
  else O = $[2];
  let a = O,
    N;
  ur: {
    if (shouldShowFull) {
      let i;
      if ($[3] !== a) ((i = tryFormatJson(a)), ($[3] = a), ($[4] = i));
      else i = $[4];
      N = i;
      break ur;
    }
    let i;
    if ($[5] !== columns || $[6] !== a || $[7] !== h)
      ((i = tryFormatJson(wrapText_2(a, columns, h))), ($[5] = columns), ($[6] = a), ($[7] = h), ($[8] = i));
    else i = $[8];
    N = i;
  }
  let R = N,
    color = isError ? "error" : isWarning ? "warning" : void 0,
    i;
  if ($[9] !== R) ((i = e(Ansi, { children: R })), ($[9] = R), ($[10] = i));
  else i = $[10];
  let v;
  if ($[11] !== color || $[12] !== i)
    ((v = e(MessageResponse, { children: e(Text, { color: color, children: i }) })),
      ($[11] = color),
      ($[12] = i),
      ($[13] = v));
  else v = $[13];
  return v;
}
//@ chunk-s3fw2t2g.js:1893-2004 file-local
function tryFormatJson(line) {
  return line.replace(/\u001b\[([0-9]+;)*4(;[0-9]+)*m|\u001b\[4(;[0-9]+)*m|\u001b\[([0-9]+;)*4m/g, "");
}

export { OutputLine, InsideToolResultProvider };
