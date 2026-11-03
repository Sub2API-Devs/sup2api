/**
 * utils/attachments/sandboxInstructions.ts
 *
 * 2.1.316 新增：沙箱说明附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { alwaysFalseEvent } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { SHELL_TOOL_NAMES as SHELL_TOOL_NAMES_3 } from "../shell/shellToolUtils.js";
import { toolMatchesName } from "../../Tool.js";
import { isHostOnlyNativeTool } from "../../services/api/deferredToolsState.js";
import { getSimpleSandboxSection } from "../../tools/BashTool/prompt.js";
import { messagesSinceCompactBoundary } from "../../services/projects/threadRows.js";

//@ chunk-e6aww6q8.js:3331158-3331460 placement
/**
 * 根据可用的 shell 工具生成沙箱说明附件；与历史中最近一次 sandbox_instructions 内容相同则不重复发送。
 */
function getSandboxInstructionsAttachments(tools, n) {
  let s = alwaysFalseEvent(tools)
    ? [BASH_TOOL_NAME]
    : SHELL_TOOL_NAMES_3.filter((w) => tools.some((L) => toolMatchesName(L, w) && !isHostOnlyNativeTool(L)));
  if (s.length === 0) return [];
  let simpleSandboxSection = getSimpleSandboxSection(s);
  let content =
    messagesSinceCompactBoundary(n ?? []).findLast(
      (w) => w.type === "attachment" && w.attachment.type === "sandbox_instructions",
    )?.attachment.content ?? "";
  if (simpleSandboxSection === content) return [];
  return [
    {
      type: "sandbox_instructions",
      content: simpleSandboxSection,
    },
  ];
}
export { getSandboxInstructionsAttachments };
