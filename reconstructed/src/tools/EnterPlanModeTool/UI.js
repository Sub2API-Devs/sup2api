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
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { themeColorOf } from "../../utils/spellcheck.js";
import { BLACK_CIRCLE } from "../../constants/figures.js";

//@ chunk-ah34pb7m.js:30138-30454 placement
/**
 * 进入计划模式的结果显示。
 */
function EnterPlanModeResult(props, unused, unusedOther) {
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
            children: " Entered plan mode",
          }),
        ],
      }),
      jsxProd_default(Box, {
        paddingLeft: 2,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "Claude is now exploring and designing an implementation approach.",
        }),
      }),
    ],
  });
}
//@ chunk-ah34pb7m.js:30454-30616 placement
/**
 * “User declined to enter plan mode” 消息。
 */
function PlanModeDeclinedMessage() {
  return jsxProd_default_2(Box, {
    flexDirection: "row",
    marginTop: 1,
    children: [
      jsxProd_default(Text, {
        color: themeColorOf("default"),
        children: BLACK_CIRCLE,
      }),
      jsxProd_default(Text, {
        children: " User declined to enter plan mode",
      }),
    ],
  });
}
export { EnterPlanModeResult, PlanModeDeclinedMessage };
