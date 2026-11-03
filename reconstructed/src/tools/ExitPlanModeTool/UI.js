/**
 * tools/ExitPlanModeTool/UI.tsx
 *
 * ExitPlanMode 结果与被拒渲染
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ExitPlanModeTool/UI.tsx
 * pieces: chunk-ah34pb7m.js (2)
 * attribution: fingerprint 2
 */
import { getDisplayPath } from "../../utils/file.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { themeColorOf } from "../../utils/spellcheck.js";
import { BLACK_CIRCLE } from "../../utils/permissions/autoModeRulesPrompt.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { MarkdownText_2 } from "../../components/pluginUi/render/MarkdownBlock.js";
import { getPlan } from "../../utils/plans.js";
import { RejectedPlanMessage } from "../../components/messages/UserToolResultMessage/RejectedPlanMessage.js";

/**
 * ExitPlanMode 结果渲染：已退出、已提交 team lead 审批、或"User approved Claude's plan"并显示计划与保存路径。
 */
//@ chunk-ah34pb7m.js:15144-16142 fingerprint = renderToolResultMessage (0.445)
function renderToolResultMessage_10(output, _progressMessagesForMessage, { theme: theme }) {
  let { plan: plan, filePath: filePath } = output,
    isEmpty = !plan || plan.trim() === "",
    displayPath = filePath ? getDisplayPath(filePath) : "",
    awaitingLeaderApproval = output.awaitingLeaderApproval;
  if (isEmpty)
    return e(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: r(Box, {
        flexDirection: "row",
        children: [
          e(Text, { color: themeColorOf("plan"), children: BLACK_CIRCLE }),
          e(Text, { children: " Exited plan mode" }),
        ],
      }),
    });
  if (awaitingLeaderApproval)
    return r(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [
        r(Box, {
          flexDirection: "row",
          children: [
            e(Text, { color: themeColorOf("plan"), children: BLACK_CIRCLE }),
            e(Text, { children: " Plan submitted for team lead approval" }),
          ],
        }),
        e(MessageResponse, {
          children: r(Box, {
            flexDirection: "column",
            children: [
              filePath && r(Text, { dimColor: !0, children: ["Plan file: ", displayPath] }),
              e(Text, { dimColor: !0, children: "Waiting for team lead to review and approve..." }),
            ],
          }),
        }),
      ],
    });
  return r(Box, {
    flexDirection: "column",
    marginTop: 1,
    children: [
      r(Box, {
        flexDirection: "row",
        children: [
          e(Text, { color: themeColorOf("plan"), children: BLACK_CIRCLE }),
          e(Text, { children: " User approved Claude's plan" }),
        ],
      }),
      e(MessageResponse, {
        children: r(Box, {
          flexDirection: "column",
          children: [
            filePath &&
              r(Text, { dimColor: !0, children: ["Plan saved to: ", displayPath, " \xB7 /plan to edit"] }),
            e(MarkdownText_2, { children: plan }),
          ],
        }),
      }),
    ],
  });
}
/**
 * ExitPlanMode 被拒时渲染被拒绝的计划内容（无 plan 时读计划文件）。
 */
//@ chunk-ah34pb7m.js:16142-16266 fingerprint = renderToolUseRejectedMessage (1)
function renderToolUseRejectedMessage_2({ plan: plan }, { theme: theme }) {
  let planContent = plan ?? getPlan() ?? "No plan found";
  return e(Box, { flexDirection: "column", children: e(RejectedPlanMessage, { plan: planContent }) });
}

export { renderToolResultMessage_10, renderToolUseRejectedMessage_2 };
