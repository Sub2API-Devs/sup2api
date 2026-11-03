/**
 * components/FallbackToolUseErrorMessage.tsx
 *
 * 工具错误的兜底渲染："Tool execution failed"/InputValidationError 等，截断长错误。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FallbackToolUseErrorMessage.tsx
 * pieces: chunk-t1sz4atx.js (3)
 * attribution: placement 1, layout 1, fingerprint 1
 */
import { isTextBlock, WCt } from "../utils/messages/textLineCount.js";
import { qa } from "../utils/stripAnsi.js";
import { Dhn } from "../utils/toolUseErrorText.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { extractTag } from "../utils/messages.js";
import { countCharInString } from "../utils/stringUtils.js";
import { MessageResponse } from "./MessageResponse.js";
import { Box, Text } from "../ink/components/Text.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OverflowHint } from "./CtrlOToExpand.js";

//@ chunk-t1sz4atx.js:525-616 placement
function wmt(p) {
  return p.replace(/<sandbox_violations>[\s\S]*?<\/sandbox_violations>/g, "");
}
//@ chunk-t1sz4atx.js:616-749 layout
function getToolErrorText(p) {
  let joined = p.flatMap((t) => {
    if (!isTextBlock(t)) return [];
    let u = qa(t.text);
    return [Dhn(u) ?? u];
  }).join(`
`);
  return joined.trim() === "" ? void 0 : joined;
}
/**
 * 工具错误兜底：字符串错误去掉 <tool_use_error> 标签，InputValidationError 显示 "Invalid tool parameters"，非 verbose 截断到若干行并提示 ctrl+o 展开。
 */
//@ chunk-t1sz4atx.js:749-1997 fingerprint = FallbackToolUseErrorMessage (0.731)
function FallbackToolUseErrorMessage(t0) {
  let $ = w(28),
    { result: result, verbose: verbose, verbatim: verbatim } = t0,
    V = verbatim === void 0 ? !1 : verbatim,
    b,
    v,
    g,
    y,
    T,
    h,
    k;
  if ($[0] !== result || $[1] !== V || $[2] !== verbose) {
    let a;
    let isArray = Array.isArray(result);
    let m;
    if ($[10] !== isArray || $[11] !== result)
      ((m = typeof result === "string" ? result : isArray ? getToolErrorText(result) : void 0),
        ($[10] = isArray),
        ($[11] = result),
        ($[12] = m));
    else m = $[12];
    let P = m;
    let extractedError = V || isArray;
    if (P === void 0) a = "Tool execution failed";
    else {
      let trimmed = (
        extractedError ? qa(P) : wmt(qa(extractTag(P, "tool_use_error") ?? P)).replace(/<\/?error>/g, "")
      ).trim();
      if (!verbose && !extractedError && trimmed.startsWith("InputValidationError: "))
        a = "Invalid tool parameters";
      else if (trimmed.startsWith("Error: ") || trimmed.startsWith("Cancelled: ")) a = trimmed;
      else a = `Error: ${trimmed}`;
    }
    y =
      countCharInString(
        a,
        `
`,
      ) +
      1 -
      WCt;
    g = MessageResponse;
    v = Box;
    k = "column";
    b = Text;
    T = "error";
    h = verbose
      ? a
      : a
          .split(
            `
`,
          )
          .slice(0, WCt).join(`
`);
    (($[0] = result),
      ($[1] = V),
      ($[2] = verbose),
      ($[3] = b),
      ($[4] = v),
      ($[5] = g),
      ($[6] = y),
      ($[7] = T),
      ($[8] = h),
      ($[9] = k));
  } else ((b = $[3]), (v = $[4]), (g = $[5]), (y = $[6]), (T = $[7]), (h = $[8]), (k = $[9]));
  let m;
  if ($[13] !== b || $[14] !== T || $[15] !== h)
    ((m = e(b, { color: T, children: h })), ($[13] = b), ($[14] = T), ($[15] = h), ($[16] = m));
  else m = $[16];
  let B;
  if ($[17] !== y || $[18] !== verbose)
    ((B = !verbose && e(OverflowHint, { count: y, expandable: !0 })),
      ($[17] = y),
      ($[18] = verbose),
      ($[19] = B));
  else B = $[19];
  let W;
  if ($[20] !== v || $[21] !== k || $[22] !== m || $[23] !== B)
    ((W = r(v, { flexDirection: k, children: [m, B] })),
      ($[20] = v),
      ($[21] = k),
      ($[22] = m),
      ($[23] = B),
      ($[24] = W));
  else W = $[24];
  let U;
  if ($[25] !== g || $[26] !== W) ((U = e(g, { children: W })), ($[25] = g), ($[26] = W), ($[27] = U));
  else U = $[27];
  return U;
}

export { FallbackToolUseErrorMessage, wmt };
