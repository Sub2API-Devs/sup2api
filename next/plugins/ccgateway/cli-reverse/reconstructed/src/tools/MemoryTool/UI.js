/**
 * tools/MemoryTool/UI.tsx
 *
 * 2.1.316 新增：Memory 工具结果的渲染（按 memory_read/write 等分支，行式输出与错误回退）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5zfjp4bd.js (8)
 * attribution: placement 8
 */
import { truncateToLength } from "../../utils/stringUtils.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-5zfjp4bd.js:6852-6886 placement
/**
 * 把空串替换成空格，避免渲染时塌陷。
 */
function blankIfEmpty(text) {
  return text === "" ? " " : text;
}
//@ chunk-5zfjp4bd.js:6886-6944 placement
/**
 * 记忆结果预览最多显示的行数（10）。
 */
var MEMORY_PREVIEW_MAX_LINES = 10;
var MEMORY_PREVIEW_MAX_LINE_CHARS = 200;
var TOOL_USE_ERROR_OPEN_TAG = "<tool_use_error>";
var TOOL_USE_ERROR_CLOSE_TAG = "</tool_use_error>";
//@ chunk-5zfjp4bd.js:6944-7026 placement
/**
 * 去掉结果文本外层的 <tool_use_error> 标签。
 */
function unwrapToolUseError(result) {
  return result.startsWith(TOOL_USE_ERROR_OPEN_TAG) && result.endsWith(TOOL_USE_ERROR_CLOSE_TAG)
    ? result.slice(TOOL_USE_ERROR_OPEN_TAG.length, -TOOL_USE_ERROR_CLOSE_TAG.length)
    : result;
}
//@ chunk-5zfjp4bd.js:7026-7078 placement
function _(line) {
  return line.length > MEMORY_PREVIEW_MAX_LINE_CHARS
    ? `${truncateToLength(line, MEMORY_PREVIEW_MAX_LINE_CHARS)}\u2026`
    : line;
}
//@ chunk-5zfjp4bd.js:7078-7622 placement
/**
 * 渲染多行文本（非 verbose 时截到 maxLines 并处理每行），超出部分显示"… +N more lines"；实际用于 Memory 工具读取结果。
 */
function QuotedLines(props) {
  let $ = useMemoCache(12);
  let { lines, verbose, maxLines, color } = props;
  let shownLines;
  if ($[0] !== lines || $[1] !== maxLines || $[2] !== verbose) {
    shownLines = verbose ? lines : lines.slice(0, maxLines).map(_);
    $[0] = lines;
    $[1] = maxLines;
    $[2] = verbose;
    $[3] = shownLines;
  } else shownLines = $[3];
  let visibleLines = shownLines;
  let hiddenCount = lines.length - visibleLines.length;
  let body;
  if ($[4] !== color || $[5] !== visibleLines) {
    body =
      visibleLines.length > 0
        ? jsxProd_default(Text, {
            color,
            dimColor: color === undefined,
            children: visibleLines.map(blankIfEmpty).join(`
`),
          })
        : null;
    $[4] = color;
    $[5] = visibleLines;
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
  let content;
  if ($[9] !== body || $[10] !== moreLine) {
    content = jsxProd_default_2(Fragment, {
      children: [body, moreLine],
    });
    $[9] = body;
    $[10] = moreLine;
    $[11] = content;
  } else content = $[11];
  return content;
}
//@ chunk-5zfjp4bd.js:7622-7759 placement
function isLongMemoryRead(result) {
  if (result?.outcome !== "ok" || typeof result.content !== "string") return false;
  let lines = quoteLines(result.content);
  return (
    lines.length > MEMORY_PREVIEW_MAX_LINES ||
    lines.some((line) => line.length > MEMORY_PREVIEW_MAX_LINE_CHARS)
  );
}
//@ chunk-5zfjp4bd.js:7759-7960 placement
function renderMemoryReadResult(result, progressMessages, { verbose }) {
  if (result.outcome !== "ok") return null;
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(Text, {
          children: formatWriteResult(result),
        }),
        jsxProd_default(QuotedLines, {
          lines: quoteLines(result.content ?? ""),
          verbose,
          maxLines: MEMORY_PREVIEW_MAX_LINES,
        }),
      ],
    }),
  });
}
//@ chunk-5zfjp4bd.js:7960-8280 placement (2.1.88 match: renderToolUseErrorMessage, 0.343)
function renderToolUseErrorMessage(result, { verbose }) {
  if (typeof result !== "string")
    return jsxProd_default(FallbackToolUseErrorMessage, {
      result,
      verbose,
    });
  let unwrapped = unwrapToolUseError(result);
  let index = unwrapped.indexOf(`
`);
  let children = replaceControlChars(index === -1 ? unwrapped : unwrapped.slice(0, index));
  let lines = index === -1 ? [] : quoteLines(unwrapped.slice(index + 1));
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
export { isLongMemoryRead, renderMemoryReadResult, renderToolUseErrorMessage };
