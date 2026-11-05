/**
 * tools/ExitWorktreeTool/UI.tsx
 *
 * ExitWorktree 结果渲染
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ExitWorktreeTool/UI.tsx
 * pieces: chunk-wjygkcr4.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Box, Text } from "../../ink/components/Text.js";

//@ chunk-wjygkcr4.js:31846-32169 fingerprint (2.1.88 match: renderToolResultMessage, 0.78)
/**
 * ExitWorktree 结果渲染：Kept/Removed worktree（分支名）与返回的目录。
 */
function renderToolResultMessage_7(output, _progressMessagesForMessage, _options) {
  let actionLabel = output.action === "keep" ? "Kept worktree" : "Removed worktree";
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default_2(Text, {
          children: [
            actionLabel,
            output.worktreeBranch
              ? jsxProd_default_2(Fragment, {
                  children: [
                    " ",
                    "(branch ",
                    jsxProd_default(Text, {
                      bold: true,
                      children: output.worktreeBranch,
                    }),
                    ")",
                  ],
                })
              : null,
          ],
        }),
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Returned to ", output.originalCwd],
        }),
      ],
    }),
  });
}
export { renderToolResultMessage_7 };
