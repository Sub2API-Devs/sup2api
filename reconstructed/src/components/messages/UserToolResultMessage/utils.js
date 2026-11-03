/**
 * components/messages/UserToolResultMessage/utils.tsx
 *
 * 从消息中按 tool_use_id 找到对应工具与 tool_use 的 hook。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserToolResultMessage/utils.tsx
 * pieces: chunk-ah34pb7m.js (3)
 * attribution: sole-consumer 2, fingerprint 1
 */
import { j } from "../../../../vendor/react/cjs/react.production.js";
import { BRIEF_TOOL_NAME } from "../../../tools/BriefTool/prompt.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useHost } from "../../../context/session.js";
import { displayOnlyMcpTool } from "../../../tools/MCPTool/displayOnlyTool.js";
import { findToolByName, getAllBaseToolsFromRegistry } from "../../../Tool.js";

//@ chunk-ah34pb7m.js:220401-220405 sole-consumer
j();
//@ chunk-ah34pb7m.js:220405-220426 sole-consumer
var l_ = new Set([BRIEF_TOOL_NAME]);
//@ chunk-ah34pb7m.js:220426-220929 fingerprint = useGetToolFromMessages (1)
function useGetToolFromMessages(toolUseID, tools, lookups) {
  let $ = w(8),
    g = lookups.toolUseByToolUseID.get(toolUseID)?.name,
    f = useHost(),
    h = g === void 0 ? void 0 : displayOnlyMcpTool(g, f),
    M;
  if ($[0] !== h || $[1] !== lookups.toolUseByToolUseID || $[2] !== toolUseID || $[3] !== tools) {
    k: {
      let toolUse = lookups.toolUseByToolUseID.get(toolUseID);
      if (!toolUse) {
        M = null;
        break k;
      }
      let b = findToolByName(tools, toolUse.name) ?? h;
      if (b) {
        M = { tool: b, toolUse: toolUse };
        break k;
      }
      const E =
        (l_.has(toolUse.name) ? findToolByName(getAllBaseToolsFromRegistry() ?? [], toolUse.name) : void 0) ??
        void 0;
      let B;
      if ($[5] !== E || $[6] !== toolUse)
        ((B = { tool: E, toolUse: toolUse }), ($[5] = E), ($[6] = toolUse), ($[7] = B));
      else B = $[7];
      M = B;
    }
    (($[0] = h), ($[1] = lookups.toolUseByToolUseID), ($[2] = toolUseID), ($[3] = tools), ($[4] = M));
  } else M = $[4];
  return M;
}

export { useGetToolFromMessages };
