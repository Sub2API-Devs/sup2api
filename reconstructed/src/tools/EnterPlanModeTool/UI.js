/**
 * tools/EnterPlanModeTool/UI.tsx
 *
 * 误归代码：表格数据列类型摘要生成器与一行圆点文本渲染，与 EnterPlanMode 无关
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/EnterPlanModeTool/UI.tsx
 * pieces: chunk-ah34pb7m.js (2)
 * attribution: placement 2
 */
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { themeColorOf } from "../../utils/spellcheck.js";
import { BLACK_CIRCLE } from "../../utils/permissions/autoModeRulesPrompt.js";

/**
 * 进入计划模式的结果显示。
 */
//@ chunk-ah34pb7m.js:30138-30454 placement
function EnterPlanModeResult(m, d, c) {
  return r(Box, {
    flexDirection: "column",
    marginTop: 1,
    children: [
      r(Box, {
        flexDirection: "row",
        children: [
          e(Text, { color: themeColorOf("plan"), children: BLACK_CIRCLE }),
          e(Text, { children: " Entered plan mode" }),
        ],
      }),
      e(Box, {
        paddingLeft: 2,
        children: e(Text, {
          dimColor: !0,
          children: "Claude is now exploring and designing an implementation approach.",
        }),
      }),
    ],
  });
}
/**
 * “User declined to enter plan mode” 消息。
 */
//@ chunk-ah34pb7m.js:30454-30616 placement
function PlanModeDeclinedMessage() {
  return r(Box, {
    flexDirection: "row",
    marginTop: 1,
    children: [
      e(Text, { color: themeColorOf("default"), children: BLACK_CIRCLE }),
      e(Text, { children: " User declined to enter plan mode" }),
    ],
  });
}

export { EnterPlanModeResult, PlanModeDeclinedMessage };
