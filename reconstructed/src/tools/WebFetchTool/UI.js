/**
 * tools/WebFetchTool/UI.tsx
 *
 * WebFetch 结果渲染
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/WebFetchTool/UI.tsx
 * pieces: chunk-14ezrfvp.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { formatFileSize } from "../../utils/format.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { MessageResponse } from "../../components/MessageResponse.js";

//@ chunk-14ezrfvp.js:465-795 placement
function renderToolUseProgressMessage(props) {
  let $ = useMemoCache(7);
  let { bytes, status } = props;
  let children;
  if ($[0] !== bytes) {
    children = formatFileSize(bytes);
    $[0] = bytes;
    $[1] = children;
  } else children = $[1];
  let sizeElement;
  if ($[2] !== children) {
    sizeElement = jsxProd_default(Text, {
      bold: true,
      children,
    });
    $[2] = children;
    $[3] = sizeElement;
  } else sizeElement = $[3];
  const statusSuffix = status !== undefined && ` (${status})`;
  let element;
  if ($[4] !== sizeElement || $[5] !== statusSuffix) {
    element = jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default_2(Text, {
        children: ["Received ", sizeElement, statusSuffix],
      }),
    });
    $[4] = sizeElement;
    $[5] = statusSuffix;
    $[6] = element;
  } else element = $[6];
  return element;
}
//@ chunk-14ezrfvp.js:795-1023 fingerprint = renderToolResultMessage (0.787)
/**
 * WebFetch 结果渲染：显示字节数与状态码；verbose 时附结果文本。
 */
function renderToolResultMessage(
  { bytes, code, codeText, result: resultText },
  _progressMessagesForMessage,
  { verbose },
) {
  let progressElement = jsxProd_default(renderToolUseProgressMessage, {
    bytes,
    status: `${code} ${codeText}`,
  });
  if (verbose)
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        progressElement,
        jsxProd_default(Box, {
          flexDirection: "column",
          children: jsxProd_default(Text, {
            children: resultText,
          }),
        }),
      ],
    });
  return progressElement;
}
export { renderToolUseProgressMessage, renderToolResultMessage };
