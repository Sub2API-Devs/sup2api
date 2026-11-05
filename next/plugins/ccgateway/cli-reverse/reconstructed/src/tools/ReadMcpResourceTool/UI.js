/**
 * tools/ReadMcpResourceTool/UI.tsx
 *
 * ReadMcpResource 结果渲染
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ReadMcpResourceTool/UI.tsx
 * pieces: chunk-wjygkcr4.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OutputLine } from "../../components/shell/OutputLine.js";
import { Box, Text } from "../../ink/components/Text.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-wjygkcr4.js:33690-34022 fingerprint (2.1.88 match: renderToolResultMessage, 0.897)
/**
 * ReadMcpResource 结果渲染：error 显示错误，无内容显示 (No content)，否则格式化 JSON。
 */
function renderToolResultMessage_5(output, _progressMessagesForMessage, { verbose }) {
  if (output?.error)
    return jsxProd_default(OutputLine, {
      content: output.error,
      verbose,
    });
  if (!output || !output.contents || output.contents.length === 0)
    return jsxProd_default(Box, {
      justifyContent: "space-between",
      overflowX: "hidden",
      width: "100%",
      children: jsxProd_default(MessageResponse, {
        height: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "(No content)",
        }),
      }),
    });
  let formattedOutput = jsonStringify(output, null, 2);
  return jsxProd_default(OutputLine, {
    content: formattedOutput,
    verbose,
  });
}
export { renderToolResultMessage_5 };
