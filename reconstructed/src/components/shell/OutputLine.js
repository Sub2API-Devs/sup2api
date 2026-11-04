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
import {
  init_react_production,
  createContext,
  useContext,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { expandContextSignal } from "../messages/expandContext.js";
import { ValidationErrorsList_2 } from "../ValidationErrorsList.js";
import { wrapText_2 } from "../../utils/terminal.js";
import { Ansi } from "../../ink/components/AnsiText.js";
import { MessageResponse } from "../MessageResponse.js";
import { Text } from "../../ink/components/Text.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s3fw2t2g.js:634-638 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s3fw2t2g.js:634", () => {
  init_react_production();
});
//@ chunk-s3fw2t2g.js:638-642 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s3fw2t2g.js:638", () => {
  init_react_production();
});
//@ chunk-s3fw2t2g.js:642-646 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s3fw2t2g.js:642", () => {
  init_react_production();
});
//@ chunk-s3fw2t2g.js:646-659 placement
var outputLineSignal; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s3fw2t2g.js:646", () => {
  outputLineSignal = createContext(false);
});
//@ chunk-s3fw2t2g.js:659-788 placement
/**
 * 为子树标记处于工具结果中。
 */
function InsideToolResultProvider(props) {
  let $ = useMemoCache(2);
  let { children } = props;
  let boxElement;
  if ($[0] !== children) {
    boxElement = jsxProd_default(outputLineSignal.Provider, {
      value: true,
      children,
    });
    $[0] = children;
    $[1] = boxElement;
  } else boxElement = $[1];
  return boxElement;
}
//@ chunk-s3fw2t2g.js:788-814 placement
function useOutputLineSignal() {
  return useContext(outputLineSignal);
}
//@ chunk-s3fw2t2g.js:814-972 placement
function linkifyUrlsInText(line) {
  try {
    let parsed = jsonParse(line);
    let stringified = jsonStringify(parsed);
    let normalizedOriginal = line.replaceAll("\\/", "/").replace(/\s+/g, "");
    let normalizedStringified = stringified.replace(/\s+/g, "");
    if (normalizedOriginal !== normalizedStringified) return line;
    return jsonStringify(parsed, null, 2);
  } catch {
    return line;
  }
}
//@ chunk-s3fw2t2g.js:972-982 placement
var MAX_OUTPUT_LINE = 1e4;
//@ chunk-s3fw2t2g.js:982-1056 placement
function tryJsonFormatContent(content) {
  if (content.length > MAX_OUTPUT_LINE) return content;
  return content
    .split(
      `
`,
    )
    .map(linkifyUrlsInText).join(`
`);
}
//@ chunk-s3fw2t2g.js:1296-1893 fingerprint = OutputLine (0.829)
function OutputLine(props) {
  let $ = useMemoCache(14);
  let { content, verbose, isError, isWarning } = props;
  let { columns } = useTerminalSize();
  let [themeName] = useTheme();
  let expandShellOutput = useOutputLineSignal();
  let suppressExpandHint = useContext(expandContextSignal);
  let shouldShowFull = verbose || expandShellOutput;
  let validationErrors;
  if ($[0] !== content || $[1] !== themeName) {
    validationErrors = ValidationErrorsList_2(tryJsonFormatContent(content), themeName);
    $[0] = content;
    $[1] = themeName;
    $[2] = validationErrors;
  } else validationErrors = $[2];
  let content_2 = validationErrors;
  let formatted;
  ur: {
    if (shouldShowFull) {
      let jsonResult;
      if ($[3] !== content_2) {
        jsonResult = tryFormatJson(content_2);
        $[3] = content_2;
        $[4] = jsonResult;
      } else jsonResult = $[4];
      formatted = jsonResult;
      break ur;
    }
    let body;
    if ($[5] !== columns || $[6] !== content_2 || $[7] !== suppressExpandHint) {
      body = tryFormatJson(wrapText_2(content_2, columns, suppressExpandHint));
      $[5] = columns;
      $[6] = content_2;
      $[7] = suppressExpandHint;
      $[8] = body;
    } else body = $[8];
    formatted = body;
  }
  let formattedContent = formatted;
  let color = isError ? "error" : isWarning ? "warning" : undefined;
  let children;
  if ($[9] !== formattedContent) {
    children = jsxProd_default(Ansi, {
      children: formattedContent,
    });
    $[9] = formattedContent;
    $[10] = children;
  } else children = $[10];
  let t3;
  if ($[11] !== color || $[12] !== children) {
    t3 = jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        color,
        children,
      }),
    });
    $[11] = color;
    $[12] = children;
    $[13] = t3;
  } else t3 = $[13];
  return t3;
}
//@ chunk-s3fw2t2g.js:1893-2004 file-local
function tryFormatJson(content) {
  return content.replace(/\u001b\[([0-9]+;)*4(;[0-9]+)*m|\u001b\[4(;[0-9]+)*m|\u001b\[([0-9]+;)*4m/g, "");
}
export { OutputLine, InsideToolResultProvider };
