/**
 * components/tasks/renderToolActivity.tsx
 *
 * 渲染 agent 最近的工具活动摘要。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/tasks/renderToolActivity.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { findToolByName, safeParseToolInput } from "../../Tool.js";
import { describeUnparsedInput } from "../../utils/json.js";
import { renderToolUseMessageFor } from "../messages/toolUseRenderers.js";
import { jsxProd_default_2 } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";

//@ chunk-18hwfzwa.js:686691-687040 fingerprint = renderToolActivity (0.567)
function renderToolActivity(activity, tools, theme, activeAgents) {
  let tool = findToolByName(tools, activity.toolName);
  if (!tool) return activity.toolName;
  try {
    let ke = describeUnparsedInput(activity.input);
    let Re = safeParseToolInput(tool, activity.input);
    let parsedInput = Re.success ? Re.data : {};
    let userFacingName = tool.userFacingName(parsedInput, {
      activeAgents,
      webFetchByAgentType: true,
    });
    if (!userFacingName) return activity.toolName;
    let toolArgs =
      ke ??
      renderToolUseMessageFor(tool, parsedInput, {
        theme,
        verbose: false,
      });
    if (toolArgs)
      return jsxProd_default_2(Text, {
        children: [userFacingName, "(", toolArgs, ")"],
      });
    return userFacingName;
  } catch {
    return activity.toolName;
  }
}
export { renderToolActivity };
