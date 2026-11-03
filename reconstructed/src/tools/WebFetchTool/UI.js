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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { formatFileSize } from "../../utils/format.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { MessageResponse } from "../../components/MessageResponse.js";

//@ chunk-14ezrfvp.js:465-795 placement
function renderToolUseProgressMessage(props) {
  let $ = w(7);
  let { bytes, status } = props;
  let children;
  if ($[0] !== bytes) {
    children = formatFileSize(bytes);
    $[0] = bytes;
    $[1] = children;
  } else children = $[1];
  let t;
  if ($[2] !== children) {
    t = jsxProd_default(Text, {
      bold: true,
      children,
    });
    $[2] = children;
    $[3] = t;
  } else t = $[3];
  const o = status !== undefined && ` (${status})`;
  let c;
  if ($[4] !== t || $[5] !== o) {
    c = jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default_2(Text, {
        children: ["Received ", t, o],
      }),
    });
    $[4] = t;
    $[5] = o;
    $[6] = c;
  } else c = $[6];
  return c;
}
//@ chunk-14ezrfvp.js:795-1023 fingerprint = renderToolResultMessage (0.787)
/**
 * WebFetch 结果渲染：显示字节数与状态码；verbose 时附结果文本。
 */
function renderToolResultMessage(
  { bytes, code, codeText, result: u },
  _progressMessagesForMessage,
  { verbose },
) {
  let o = jsxProd_default(renderToolUseProgressMessage, {
    bytes,
    status: `${code} ${codeText}`,
  });
  if (verbose)
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        o,
        jsxProd_default(Box, {
          flexDirection: "column",
          children: jsxProd_default(Text, {
            children: u,
          }),
        }),
      ],
    });
  return o;
}
export { renderToolUseProgressMessage, renderToolResultMessage };
