/**
 * tools/EnterWorktreeTool/UI.tsx
 *
 * 误归代码：按进度消息同步已保存的 worktree 会话元数据
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/EnterWorktreeTool/UI.tsx
 * pieces: chunk-ah34pb7m.js (1)
 * attribution: placement 1
 */
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Box, Text } from "../../ink/components/Text.js";

/**
 * “Switched to worktree（on branch …）” 结果消息。
 */
//@ chunk-ah34pb7m.js:30616-30882 placement
function WorktreeSwitchedMessage(m, d, c) {
  return e(MessageResponse, {
    children: r(Box, {
      flexDirection: "column",
      children: [
        r(Text, {
          children: [
            "Switched to worktree",
            m.worktreeBranch
              ? r(Text, { children: [" ", "on branch ", e(Text, { bold: !0, children: m.worktreeBranch })] })
              : null,
          ],
        }),
        e(Text, { dimColor: !0, children: m.worktreePath }),
      ],
    }),
  });
}

export { WorktreeSwitchedMessage };
