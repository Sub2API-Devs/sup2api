/**
 * components/FallbackToolUseErrorMessage.tsx
 *
 * 工具错误的兜底渲染："Tool execution failed"/InputValidationError 等，截断长错误。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FallbackToolUseErrorMessage.tsx
 * pieces: chunk-em44trrz.js (3)
 * attribution: placement 1, layout 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isTextBlock, MAX_LINES_THRESHOLD } from "../utils/messages/textLineCount.js";
import { stripAnsiPerLine } from "../utils/stripAnsi.js";
import { unwrapToolUseErrorText } from "../utils/toolUseErrorText.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { extractTag } from "../utils/messages.js";
import { countCharInString } from "../utils/stringUtils.js";
import { MessageResponse } from "./MessageResponse.js";
import { Box, Text } from "../ink/components/Text.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OverflowHint } from "./CtrlOToExpand.js";

//@ chunk-em44trrz.js:525-616 placement
/**
 * 函数 stripSandboxViolations（去掉 <sandbox_violations> 段）；位于「工具错误的兜底渲染："Tool execution failed"/InputValidationError 等，截断长错误」模块。
 */
function stripSandboxViolations(stderr) {
  return stderr.replace(/<sandbox_violations>[\s\S]*?<\/sandbox_violations>/g, "");
}
//@ chunk-em44trrz.js:616-749 layout
function getToolErrorText(result) {
  let joined = result.flatMap((block) => {
    if (!isTextBlock(block)) return [];
    let text = stripAnsiPerLine(block.text);
    return [unwrapToolUseErrorText(text) ?? text];
  }).join(`
`);
  return joined.trim() === "" ? undefined : joined;
}
//@ chunk-em44trrz.js:749-1997 fingerprint (2.1.88 match: FallbackToolUseErrorMessage, 0.742)
/**
 * 工具错误兜底：字符串错误去掉 <tool_use_error> 标签，InputValidationError 显示 "Invalid tool parameters"，非 verbose 截断到若干行并提示 ctrl+o 展开。
 */
function FallbackToolUseErrorMessage(props) {
  let $ = useMemoCache(28);
  let { result, verbose, verbatim } = props;
  let isVerbatim = verbatim === undefined ? false : verbatim;
  let TextComponent;
  let BoxComponent;
  let ResponseComponent;
  let count;
  let color;
  let children;
  let flexDirection;
  if ($[0] !== result || $[1] !== isVerbatim || $[2] !== verbose) {
    let error;
    let isArrayResult = Array.isArray(result);
    let errorText;
    if ($[10] !== isArrayResult || $[11] !== result) {
      errorText = typeof result === "string" ? result : isArrayResult ? getToolErrorText(result) : undefined;
      $[10] = isArrayResult;
      $[11] = result;
      $[12] = errorText;
    } else errorText = $[12];
    let rawError = errorText;
    let extractedError = isVerbatim || isArrayResult;
    if (rawError === undefined) error = "Tool execution failed";
    else {
      let trimmed = (
        extractedError
          ? stripAnsiPerLine(rawError)
          : stripSandboxViolations(
              stripAnsiPerLine(extractTag(rawError, "tool_use_error") ?? rawError),
            ).replace(/<\/?error>/g, "")
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
    ResponseComponent = MessageResponse;
    BoxComponent = Box;
    flexDirection = "column";
    TextComponent = Text;
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
    $[1] = isVerbatim;
    $[2] = verbose;
    $[3] = TextComponent;
    $[4] = BoxComponent;
    $[5] = ResponseComponent;
    $[6] = count;
    $[7] = color;
    $[8] = children;
    $[9] = flexDirection;
  } else {
    TextComponent = $[3];
    BoxComponent = $[4];
    ResponseComponent = $[5];
    count = $[6];
    color = $[7];
    children = $[8];
    flexDirection = $[9];
  }
  let t4;
  if ($[13] !== TextComponent || $[14] !== color || $[15] !== children) {
    t4 = jsxProd_default(TextComponent, {
      color,
      children,
    });
    $[13] = TextComponent;
    $[14] = color;
    $[15] = children;
    $[16] = t4;
  } else t4 = $[16];
  let overflowElement;
  if ($[17] !== count || $[18] !== verbose) {
    overflowElement =
      !verbose &&
      jsxProd_default(OverflowHint, {
        count,
        expandable: true,
      });
    $[17] = count;
    $[18] = verbose;
    $[19] = overflowElement;
  } else overflowElement = $[19];
  let children_2;
  if ($[20] !== BoxComponent || $[21] !== flexDirection || $[22] !== t4 || $[23] !== overflowElement) {
    children_2 = jsxProd_default_2(BoxComponent, {
      flexDirection,
      children: [t4, overflowElement],
    });
    $[20] = BoxComponent;
    $[21] = flexDirection;
    $[22] = t4;
    $[23] = overflowElement;
    $[24] = children_2;
  } else children_2 = $[24];
  let t7;
  if ($[25] !== ResponseComponent || $[26] !== children_2) {
    t7 = jsxProd_default(ResponseComponent, {
      children: children_2,
    });
    $[25] = ResponseComponent;
    $[26] = children_2;
    $[27] = t7;
  } else t7 = $[27];
  return t7;
}
export { FallbackToolUseErrorMessage, stripSandboxViolations };
