/**
 * tools/ExitWorktreeTool/UI.tsx
 *
 * ExitWorktree 结果渲染
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ExitWorktreeTool/UI.tsx
 * pieces: chunk-ah34pb7m.js (1)
 * attribution: fingerprint 1
 */
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Box, Text } from "../../ink/components/Text.js";

/**
 * ExitWorktree 结果渲染：Kept/Removed worktree（分支名）与返回的目录。
 */
//@ chunk-ah34pb7m.js:30882-31204 fingerprint = renderToolResultMessage (0.78)
function renderToolResultMessage_7(output, _progressMessagesForMessage, _options) {
  let actionLabel = output.action === "keep" ? "Kept worktree" : "Removed worktree";
  return e(MessageResponse, {
    children: r(Box, {
      flexDirection: "column",
      children: [
        r(Text, {
          children: [
            actionLabel,
            output.worktreeBranch
              ? r(Fragment, {
                  children: [" ", "(branch ", e(Text, { bold: !0, children: output.worktreeBranch }), ")"],
                })
              : null,
          ],
        }),
        r(Text, { dimColor: !0, children: ["Returned to ", output.originalCwd] }),
      ],
    }),
  });
}

export { renderToolResultMessage_7 };
