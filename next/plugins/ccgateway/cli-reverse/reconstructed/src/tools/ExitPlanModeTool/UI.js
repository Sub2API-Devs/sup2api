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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { themeColorOf } from "../../utils/spellcheck.js";
import { BLACK_CIRCLE } from "../../constants/figures.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { MarkdownText_2 } from "../../components/pluginUi/render/MarkdownBlock.js";
import { getPlan } from "../../utils/plans.js";
import { RejectedPlanMessage } from "../../components/messages/UserToolResultMessage/RejectedPlanMessage.js";

//@ chunk-ah34pb7m.js:15144-16142 fingerprint (2.1.88 match: renderToolResultMessage, 0.445)
/**
 * ExitPlanMode 结果渲染：已退出、已提交 team lead 审批、或"User approved Claude's plan"并显示计划与保存路径。
 */
function renderToolResultMessage_10(output, _progressMessagesForMessage, { theme: _theme }) {
  let { plan, filePath } = output;
  let isEmpty = !plan || plan.trim() === "";
  let displayPath = filePath ? getDisplayPath(filePath) : "";
  let awaitingLeaderApproval = output.awaitingLeaderApproval;
  if (isEmpty)
    return jsxProd_default(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: jsxProd_default_2(Box, {
        flexDirection: "row",
        children: [
          jsxProd_default(Text, {
            color: themeColorOf("plan"),
            children: BLACK_CIRCLE,
          }),
          jsxProd_default(Text, {
            children: " Exited plan mode",
          }),
        ],
      }),
    });
  if (awaitingLeaderApproval)
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [
        jsxProd_default_2(Box, {
          flexDirection: "row",
          children: [
            jsxProd_default(Text, {
              color: themeColorOf("plan"),
              children: BLACK_CIRCLE,
            }),
            jsxProd_default(Text, {
              children: " Plan submitted for team lead approval",
            }),
          ],
        }),
        jsxProd_default(MessageResponse, {
          children: jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              filePath &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: ["Plan file: ", displayPath],
                }),
              jsxProd_default(Text, {
                dimColor: true,
                children: "Waiting for team lead to review and approve...",
              }),
            ],
          }),
        }),
      ],
    });
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    marginTop: 1,
    children: [
      jsxProd_default_2(Box, {
        flexDirection: "row",
        children: [
          jsxProd_default(Text, {
            color: themeColorOf("plan"),
            children: BLACK_CIRCLE,
          }),
          jsxProd_default(Text, {
            children: " User approved Claude's plan",
          }),
        ],
      }),
      jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            filePath &&
              jsxProd_default_2(Text, {
                dimColor: true,
                children: ["Plan saved to: ", displayPath, " \xB7 /plan to edit"],
              }),
            jsxProd_default(MarkdownText_2, {
              children: plan,
            }),
          ],
        }),
      }),
    ],
  });
}
//@ chunk-ah34pb7m.js:16142-16266 fingerprint (2.1.88 match: renderToolUseRejectedMessage, 1)
/**
 * ExitPlanMode 被拒时渲染被拒绝的计划内容（无 plan 时读计划文件）。
 */
function renderToolUseRejectedMessage_2({ plan }, { theme: _theme }) {
  let planContent = plan ?? getPlan() ?? "No plan found";
  return jsxProd_default(Box, {
    flexDirection: "column",
    children: jsxProd_default(RejectedPlanMessage, {
      plan: planContent,
    }),
  });
}
export { renderToolResultMessage_10, renderToolUseRejectedMessage_2 };
