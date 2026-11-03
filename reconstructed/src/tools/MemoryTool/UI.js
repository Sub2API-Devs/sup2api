/**
 * tools/MemoryTool/UI.tsx
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x5e9ztk0.js (8)
 * attribution: placement 8
 */
import { truncateToLength } from "../../utils/stringUtils.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { quoteLines, dVr } from "./memoryWrite.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { FallbackToolUseErrorMessage } from "../../components/FallbackToolUseErrorMessage.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { WCt } from "../../utils/messages/textLineCount.js";

//@ chunk-x5e9ztk0.js:6572-6606 placement
function B(C) {
  return C === "" ? " " : C;
}
//@ chunk-x5e9ztk0.js:6606-6664 placement
var T = 10,
  d = 200,
  h = "<tool_use_error>",
  x = "</tool_use_error>";
//@ chunk-x5e9ztk0.js:6664-6746 placement
function N(o) {
  return o.startsWith(h) && o.endsWith(x) ? o.slice(h.length, -x.length) : o;
}
//@ chunk-x5e9ztk0.js:6746-6799 placement
function _(o) {
  return o.length > d ? `${truncateToLength(o, d)}\u2026` : o;
}
/**
 * 渲染多行文本（非 verbose 时截到 maxLines 并处理每行），超出部分显示"… +N more lines"；实际用于 Memory 工具读取结果。
 */
//@ chunk-x5e9ztk0.js:6799-7342 placement
function QuotedLines(props) {
  let $ = w(12),
    { lines: lines, verbose: verbose, maxLines: maxLines, color: color } = props,
    shownLines;
  if ($[0] !== lines || $[1] !== maxLines || $[2] !== verbose)
    ((shownLines = verbose ? lines : lines.slice(0, maxLines).map(_)),
      ($[0] = lines),
      ($[1] = maxLines),
      ($[2] = verbose),
      ($[3] = shownLines));
  else shownLines = $[3];
  let m = shownLines,
    hiddenCount = lines.length - m.length,
    body;
  if ($[4] !== color || $[5] !== m)
    ((body =
      m.length > 0
        ? e(Text, {
            color: color,
            dimColor: color === void 0,
            children: m.map(B).join(`
`),
          })
        : null),
      ($[4] = color),
      ($[5] = m),
      ($[6] = body));
  else body = $[6];
  let moreLine;
  if ($[7] !== hiddenCount)
    ((moreLine =
      hiddenCount > 0 ? r(Text, { dimColor: !0, children: ["\u2026 +", hiddenCount, " more lines"] }) : null),
      ($[7] = hiddenCount),
      ($[8] = moreLine));
  else moreLine = $[8];
  let v;
  if ($[9] !== body || $[10] !== moreLine)
    ((v = r(Fragment, { children: [body, moreLine] })), ($[9] = body), ($[10] = moreLine), ($[11] = v));
  else v = $[11];
  return v;
}
//@ chunk-x5e9ztk0.js:7342-7479 placement
function isLongMemoryRead(o) {
  if (o?.outcome !== "ok" || typeof o.content !== "string") return !1;
  let t = quoteLines(o.content);
  return t.length > T || t.some((i) => i.length > d);
}
//@ chunk-x5e9ztk0.js:7479-7680 placement
function renderMemoryReadResult(o, t, { verbose: verbose }) {
  if (o.outcome !== "ok") return null;
  return e(MessageResponse, {
    children: r(Box, {
      flexDirection: "column",
      children: [
        e(Text, { children: dVr(o) }),
        e(QuotedLines, { lines: quoteLines(o.content ?? ""), verbose: verbose, maxLines: T }),
      ],
    }),
  });
}
//@ chunk-x5e9ztk0.js:7680-8000 placement = renderToolUseErrorMessage (0.343)
function renderToolUseErrorMessage(result, { verbose: verbose }) {
  if (typeof result !== "string") return e(FallbackToolUseErrorMessage, { result: result, verbose: verbose });
  let i = N(result),
    index = i.indexOf(`
`),
    c = replaceControlChars(index === -1 ? i : i.slice(0, index)),
    a = index === -1 ? [] : quoteLines(i.slice(index + 1));
  return e(MessageResponse, {
    children: r(Box, {
      flexDirection: "column",
      children: [
        e(Text, { color: "error", children: c }),
        e(QuotedLines, { lines: a, verbose: verbose, maxLines: WCt - 1, color: "error" }),
      ],
    }),
  });
}
