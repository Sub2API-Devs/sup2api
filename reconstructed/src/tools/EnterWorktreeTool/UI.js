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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Box, Text } from "../../ink/components/Text.js";

//@ chunk-ah34pb7m.js:30616-30882 placement
/**
 * “Switched to worktree（on branch …）” 结果消息。
 */
function WorktreeSwitchedMessage(m, d, c) {
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default_2(Text, {
          children: [
            "Switched to worktree",
            m.worktreeBranch
              ? jsxProd_default_2(Text, {
                  children: [
                    " ",
                    "on branch ",
                    jsxProd_default(Text, {
                      bold: true,
                      children: m.worktreeBranch,
                    }),
                  ],
                })
              : null,
          ],
        }),
        jsxProd_default(Text, {
          dimColor: true,
          children: m.worktreePath,
        }),
      ],
    }),
  });
}
export { WorktreeSwitchedMessage };
