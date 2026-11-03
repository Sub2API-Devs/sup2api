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
import { isTextBlock, MAX_LINES_THRESHOLD } from "../utils/messages/textLineCount.js";
import { stripAnsiPerLine } from "../utils/stripAnsi.js";
import { unwrapToolUseErrorText } from "../utils/toolUseErrorText.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { extractTag } from "../utils/messages.js";
import { countCharInString } from "../utils/stringUtils.js";
import { MessageResponse } from "./MessageResponse.js";
import { Box, Text } from "../ink/components/Text.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OverflowHint } from "./CtrlOToExpand.js";

//@ chunk-t1sz4atx.js:525-616 placement
/**
 * 函数 stripSandboxViolations（去掉 <sandbox_violations> 段）；位于「工具错误的兜底渲染："Tool execution failed"/InputValidationError 等，截断长错误」模块。
 */
function stripSandboxViolations(stderr) {
  return stderr.replace(/<sandbox_violations>[\s\S]*?<\/sandbox_violations>/g, "");
}
//@ chunk-t1sz4atx.js:616-749 layout
function getToolErrorText(result) {
  let joined = result.flatMap((t) => {
    if (!isTextBlock(t)) return [];
    let u = stripAnsiPerLine(t.text);
    return [unwrapToolUseErrorText(u) ?? u];
  }).join(`
`);
  return joined.trim() === "" ? undefined : joined;
}
//@ chunk-t1sz4atx.js:749-1997 fingerprint = FallbackToolUseErrorMessage (0.731)
/**
 * 工具错误兜底：字符串错误去掉 <tool_use_error> 标签，InputValidationError 显示 "Invalid tool parameters"，非 verbose 截断到若干行并提示 ctrl+o 展开。
 */
function FallbackToolUseErrorMessage(props) {
  let $ = w(28);
  let { result, verbose, verbatim } = props;
  let V = verbatim === undefined ? false : verbatim;
  let b;
  let v;
  let g;
  let count;
  let color;
  let children;
  let flexDirection;
  if ($[0] !== result || $[1] !== V || $[2] !== verbose) {
    let error;
    let I = Array.isArray(result);
    let m;
    if ($[10] !== I || $[11] !== result) {
      m = typeof result === "string" ? result : I ? getToolErrorText(result) : undefined;
      $[10] = I;
      $[11] = result;
      $[12] = m;
    } else m = $[12];
    let P = m;
    let extractedError = V || I;
    if (P === undefined) error = "Tool execution failed";
    else {
      let trimmed = (
        extractedError
          ? stripAnsiPerLine(P)
          : stripSandboxViolations(stripAnsiPerLine(extractTag(P, "tool_use_error") ?? P)).replace(
              /<\/?error>/g,
              "",
            )
      ).trim();
      if (!verbose && !extractedError && trimmed.startsWith("InputValidationError: "))
        error = "Invalid tool parameters";
      else if (trimmed.startsWith("Error: ") || trimmed.startsWith("Cancelled: ")) error = trimmed;
      else error = `Error: ${trimmed}`;
    }
    count =
      countCharInString(
        error,
        `
`,
      ) +
      1 -
      MAX_LINES_THRESHOLD;
    g = MessageResponse;
    v = Box;
    flexDirection = "column";
    b = Text;
    color = "error";
    children = verbose
      ? error
      : error
          .split(
            `
`,
          )
          .slice(0, MAX_LINES_THRESHOLD).join(`
`);
    $[0] = result;
    $[1] = V;
    $[2] = verbose;
    $[3] = b;
    $[4] = v;
    $[5] = g;
    $[6] = count;
    $[7] = color;
    $[8] = children;
    $[9] = flexDirection;
  } else {
    b = $[3];
    v = $[4];
    g = $[5];
    count = $[6];
    color = $[7];
    children = $[8];
    flexDirection = $[9];
  }
  let t4;
  if ($[13] !== b || $[14] !== color || $[15] !== children) {
    t4 = jsxProd_default(b, {
      color,
      children,
    });
    $[13] = b;
    $[14] = color;
    $[15] = children;
    $[16] = t4;
  } else t4 = $[16];
  let B;
  if ($[17] !== count || $[18] !== verbose) {
    B =
      !verbose &&
      jsxProd_default(OverflowHint, {
        count,
        expandable: true,
      });
    $[17] = count;
    $[18] = verbose;
    $[19] = B;
  } else B = $[19];
  let children_2;
  if ($[20] !== v || $[21] !== flexDirection || $[22] !== t4 || $[23] !== B) {
    children_2 = jsxProd_default_2(v, {
      flexDirection,
      children: [t4, B],
    });
    $[20] = v;
    $[21] = flexDirection;
    $[22] = t4;
    $[23] = B;
    $[24] = children_2;
  } else children_2 = $[24];
  let t7;
  if ($[25] !== g || $[26] !== children_2) {
    t7 = jsxProd_default(g, {
      children: children_2,
    });
    $[25] = g;
    $[26] = children_2;
    $[27] = t7;
  } else t7 = $[27];
  return t7;
}
export { FallbackToolUseErrorMessage, stripSandboxViolations };
