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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { MessageResponse } from "../../components/MessageResponse.js";

//@ chunk-14ezrfvp.js:465-795 placement
function renderToolUseProgressMessage(g) {
  let $ = w(7),
    { bytes: bytes, status: status } = g,
    m;
  if ($[0] !== bytes) ((m = formatFileSize(bytes)), ($[0] = bytes), ($[1] = m));
  else m = $[1];
  let t;
  if ($[2] !== m) ((t = e(Text, { bold: !0, children: m })), ($[2] = m), ($[3] = t));
  else t = $[3];
  const o = status !== void 0 && ` (${status})`;
  let c;
  if ($[4] !== t || $[5] !== o)
    ((c = e(MessageResponse, { height: 1, children: r(Text, { children: ["Received ", t, o] }) })),
      ($[4] = t),
      ($[5] = o),
      ($[6] = c));
  else c = $[6];
  return c;
}
/**
 * WebFetch 结果渲染：显示字节数与状态码；verbose 时附结果文本。
 */
//@ chunk-14ezrfvp.js:795-1023 fingerprint = renderToolResultMessage (0.787)
function renderToolResultMessage(
  { bytes: bytes, code: code, codeText: codeText, result: u },
  _progressMessagesForMessage,
  { verbose: verbose },
) {
  let o = e(renderToolUseProgressMessage, { bytes: bytes, status: `${code} ${codeText}` });
  if (verbose)
    return r(Box, {
      flexDirection: "column",
      children: [o, e(Box, { flexDirection: "column", children: e(Text, { children: u }) })],
    });
  return o;
}

export { renderToolUseProgressMessage, renderToolResultMessage };
