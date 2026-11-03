/**
 * tools/MemoryTool/UI.tsx
 *
 * 2.1.316 新增：Memory 工具结果的渲染（按 memory_read/write 等分支，行式输出与错误回退）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x5e9ztk0.js (8)
 * attribution: placement 8
 */
import { truncateToLength } from "../../utils/stringUtils.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { quoteLines, formatWriteResult } from "./memoryWrite.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { FallbackToolUseErrorMessage } from "../../components/FallbackToolUseErrorMessage.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { MAX_LINES_THRESHOLD } from "../../utils/messages/textLineCount.js";

//@ chunk-x5e9ztk0.js:6572-6606 placement
/**
 * 把空串替换成空格，避免渲染时塌陷。
 */
function blankIfEmpty(C) {
  return C === "" ? " " : C;
}
//@ chunk-x5e9ztk0.js:6606-6664 placement
/**
 * 记忆结果预览最多显示的行数（10）。
 */
var MEMORY_PREVIEW_MAX_LINES = 10;
var MEMORY_PREVIEW_MAX_LINE_CHARS = 200;
var TOOL_USE_ERROR_OPEN_TAG = "<tool_use_error>";
var TOOL_USE_ERROR_CLOSE_TAG = "</tool_use_error>";
//@ chunk-x5e9ztk0.js:6664-6746 placement
/**
 * 去掉结果文本外层的 <tool_use_error> 标签。
 */
function unwrapToolUseError(result) {
  return result.startsWith(TOOL_USE_ERROR_OPEN_TAG) && result.endsWith(TOOL_USE_ERROR_CLOSE_TAG)
    ? result.slice(TOOL_USE_ERROR_OPEN_TAG.length, -TOOL_USE_ERROR_CLOSE_TAG.length)
    : result;
}
//@ chunk-x5e9ztk0.js:6746-6799 placement
function _(o) {
  return o.length > MEMORY_PREVIEW_MAX_LINE_CHARS
    ? `${truncateToLength(o, MEMORY_PREVIEW_MAX_LINE_CHARS)}\u2026`
    : o;
}
//@ chunk-x5e9ztk0.js:6799-7342 placement
/**
 * 渲染多行文本（非 verbose 时截到 maxLines 并处理每行），超出部分显示"… +N more lines"；实际用于 Memory 工具读取结果。
 */
function QuotedLines(props) {
  let $ = w(12);
  let { lines, verbose, maxLines, color } = props;
  let shownLines;
  if ($[0] !== lines || $[1] !== maxLines || $[2] !== verbose) {
    shownLines = verbose ? lines : lines.slice(0, maxLines).map(_);
    $[0] = lines;
    $[1] = maxLines;
    $[2] = verbose;
    $[3] = shownLines;
  } else shownLines = $[3];
  let m = shownLines;
  let hiddenCount = lines.length - m.length;
  let body;
  if ($[4] !== color || $[5] !== m) {
    body =
      m.length > 0
        ? jsxProd_default(Text, {
            color,
            dimColor: color === undefined,
            children: m.map(blankIfEmpty).join(`
`),
          })
        : null;
    $[4] = color;
    $[5] = m;
    $[6] = body;
  } else body = $[6];
  let moreLine;
  if ($[7] !== hiddenCount) {
    moreLine =
      hiddenCount > 0
        ? jsxProd_default_2(Text, {
            dimColor: true,
            children: ["\u2026 +", hiddenCount, " more lines"],
          })
        : null;
    $[7] = hiddenCount;
    $[8] = moreLine;
  } else moreLine = $[8];
  let v;
  if ($[9] !== body || $[10] !== moreLine) {
    v = jsxProd_default_2(Fragment, {
      children: [body, moreLine],
    });
    $[9] = body;
    $[10] = moreLine;
    $[11] = v;
  } else v = $[11];
  return v;
}
//@ chunk-x5e9ztk0.js:7342-7479 placement
function isLongMemoryRead(o) {
  if (o?.outcome !== "ok" || typeof o.content !== "string") return false;
  let t = quoteLines(o.content);
  return t.length > MEMORY_PREVIEW_MAX_LINES || t.some((i) => i.length > MEMORY_PREVIEW_MAX_LINE_CHARS);
}
//@ chunk-x5e9ztk0.js:7479-7680 placement
function renderMemoryReadResult(o, t, { verbose }) {
  if (o.outcome !== "ok") return null;
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(Text, {
          children: formatWriteResult(o),
        }),
        jsxProd_default(QuotedLines, {
          lines: quoteLines(o.content ?? ""),
          verbose,
          maxLines: MEMORY_PREVIEW_MAX_LINES,
        }),
      ],
    }),
  });
}
//@ chunk-x5e9ztk0.js:7680-8000 placement = renderToolUseErrorMessage (0.343)
function renderToolUseErrorMessage(result, { verbose }) {
  if (typeof result !== "string")
    return jsxProd_default(FallbackToolUseErrorMessage, {
      result,
      verbose,
    });
  let i = unwrapToolUseError(result);
  let index = i.indexOf(`
`);
  let children = replaceControlChars(index === -1 ? i : i.slice(0, index));
  let lines = index === -1 ? [] : quoteLines(i.slice(index + 1));
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(Text, {
          color: "error",
          children,
        }),
        jsxProd_default(QuotedLines, {
          lines,
          verbose,
          maxLines: MAX_LINES_THRESHOLD - 1,
          color: "error",
        }),
      ],
    }),
  });
}
