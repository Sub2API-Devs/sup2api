/**
 * utils/attachments/sandboxInstructions.ts
 *
 * 2.1.316 新增：沙箱说明附件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 */
import { isCustomersReplPool } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { SHELL_TOOL_NAMES as SHELL_TOOL_NAMES_2 } from "../shell/shellToolUtils.js";
import { matchesToolName } from "../../Tool.js";
import { isHostOnlyNativeTool } from "../../services/api/deferredToolsState.js";
import { getSimpleSandboxSection } from "../../tools/BashTool/prompt.js";
import { messagesSinceCompactBoundary } from "../../services/projects/threadRows.js";

//@ chunk-5xgkngpb.js:3416918-3417473 placement
/**
 * 根据可用的 shell 工具生成沙箱说明附件；与历史中最近一次 sandbox_instructions 内容相同则不重复发送。
 */
function getSandboxInstructionsAttachments(unusedArg, messages) {
  let toolNames = isCustomersReplPool(unusedArg);
  let toolNames_2 = toolNames
    ? [BASH_TOOL_NAME]
    : SHELL_TOOL_NAMES_2.filter((toolName) =>
        unusedArg.some((tool) => matchesToolName(tool, toolName) && !isHostOnlyNativeTool(tool)),
      );
  if (toolNames_2.length === 0) return [];
  let simpleSandboxSection = getSimpleSandboxSection(toolNames_2);
  let instructions =
    toolNames && simpleSandboxSection !== ""
      ? `${simpleSandboxSection}

In a REPL script, \`$\` and \`${BASH_TOOL_NAME}\` both run ${BASH_TOOL_NAME} tool commands. Where the text above allows \`dangerouslyDisableSandbox: true\`, pass it as \`${BASH_TOOL_NAME}({command, dangerouslyDisableSandbox: true})\`: \`$\` has no option for it.`
      : simpleSandboxSection;
  let content =
    messagesSinceCompactBoundary(messages ?? []).findLast(
      (message) => message.type === "attachment" && message.attachment.type === "sandbox_instructions",
    )?.attachment.content ?? "";
  if (instructions === content) return [];
  return [
    {
      type: "sandbox_instructions",
      content: instructions,
    },
  ];
}
export { getSandboxInstructionsAttachments };
