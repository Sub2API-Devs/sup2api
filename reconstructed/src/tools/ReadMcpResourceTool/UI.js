/**
 * tools/ReadMcpResourceTool/UI.tsx
 *
 * ReadMcpResource 结果渲染
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ReadMcpResourceTool/UI.tsx
 * pieces: chunk-ah34pb7m.js (1)
 * attribution: fingerprint 1
 */
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OutputLine } from "../../components/shell/OutputLine.js";
import { Box, Text } from "../../ink/components/Text.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { jsonStringify } from "../../utils/slowOperations.js";

/**
 * ReadMcpResource 结果渲染：error 显示错误，无内容显示 (No content)，否则格式化 JSON。
 */
//@ chunk-ah34pb7m.js:32725-33057 fingerprint = renderToolResultMessage (0.897)
function renderToolResultMessage_5(output, _progressMessagesForMessage, { verbose: verbose }) {
  if (output?.error) return e(OutputLine, { content: output.error, verbose: verbose });
  if (!output || !output.contents || output.contents.length === 0)
    return e(Box, {
      justifyContent: "space-between",
      overflowX: "hidden",
      width: "100%",
      children: e(MessageResponse, {
        height: 1,
        children: e(Text, { dimColor: !0, children: "(No content)" }),
      }),
    });
  let formattedOutput = jsonStringify(output, null, 2);
  return e(OutputLine, { content: formattedOutput, verbose: verbose });
}

export { renderToolResultMessage_5 };
