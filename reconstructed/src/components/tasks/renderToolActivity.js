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
import { r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";

//@ chunk-18hwfzwa.js:686691-687040 fingerprint = renderToolActivity (0.567)
function renderToolActivity(h, x, D, L) {
  let tool = findToolByName(x, h.toolName);
  if (!tool) return h.toolName;
  try {
    let ke = describeUnparsedInput(h.input),
      Re = safeParseToolInput(tool, h.input),
      parsedInput = Re.success ? Re.data : {},
      userFacingName = tool.userFacingName(parsedInput, { activeAgents: L, webFetchByAgentType: !0 });
    if (!userFacingName) return h.toolName;
    let We = ke ?? renderToolUseMessageFor(tool, parsedInput, { theme: D, verbose: !1 });
    if (We) return r(Text, { children: [userFacingName, "(", We, ")"] });
    return userFacingName;
  } catch {
    return h.toolName;
  }
}

export { renderToolActivity };
