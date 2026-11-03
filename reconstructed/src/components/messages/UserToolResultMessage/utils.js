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
import { init_react_production } from "../../../../vendor/react/cjs/react.production.js";
import { BRIEF_TOOL_NAME } from "../../../tools/BriefTool/prompt.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useHost } from "../../../context/session.js";
import { displayOnlyMcpTool } from "../../../tools/MCPTool/displayOnlyTool.js";
import { findToolByName, getAllBaseToolsFromRegistry } from "../../../Tool.js";

//@ chunk-ah34pb7m.js:220401-220405 sole-consumer
init_react_production();
//@ chunk-ah34pb7m.js:220405-220426 sole-consumer
var BRIEF_TOOL_NAME_SET = new Set([BRIEF_TOOL_NAME]);
//@ chunk-ah34pb7m.js:220426-220929 fingerprint = useGetToolFromMessages (1)
function useGetToolFromMessages(toolUseID, tools, lookups) {
  let $ = w(8);
  let g = lookups.toolUseByToolUseID.get(toolUseID)?.name;
  let host = useHost();
  let h = g === undefined ? undefined : displayOnlyMcpTool(g, host);
  let t0;
  if ($[0] !== h || $[1] !== lookups.toolUseByToolUseID || $[2] !== toolUseID || $[3] !== tools) {
    k: {
      let toolUse = lookups.toolUseByToolUseID.get(toolUseID);
      if (!toolUse) {
        t0 = null;
        break k;
      }
      let b = findToolByName(tools, toolUse.name) ?? h;
      if (b) {
        t0 = {
          tool: b,
          toolUse,
        };
        break k;
      }
      const tool =
        (BRIEF_TOOL_NAME_SET.has(toolUse.name)
          ? findToolByName(getAllBaseToolsFromRegistry() ?? [], toolUse.name)
          : undefined) ?? undefined;
      let B;
      if ($[5] !== tool || $[6] !== toolUse) {
        B = {
          tool,
          toolUse,
        };
        $[5] = tool;
        $[6] = toolUse;
        $[7] = B;
      } else B = $[7];
      t0 = B;
    }
    $[0] = h;
    $[1] = lookups.toolUseByToolUseID;
    $[2] = toolUseID;
    $[3] = tools;
    $[4] = t0;
  } else t0 = $[4];
  return t0;
}
export { useGetToolFromMessages };
