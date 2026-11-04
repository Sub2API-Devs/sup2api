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
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { useHost } from "../../../context/session.js";
import { displayOnlyMcpTool } from "../../../tools/MCPTool/displayOnlyTool.js";
import { findToolByName, getAllBaseToolsFromRegistry } from "../../../Tool.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-ah34pb7m.js:220401-220405 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:220401", () => {
  init_react_production();
});
//@ chunk-ah34pb7m.js:220405-220426 sole-consumer
var BRIEF_TOOL_NAME_SET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:220405", () => {
  BRIEF_TOOL_NAME_SET = new Set([BRIEF_TOOL_NAME]);
});
//@ chunk-ah34pb7m.js:220426-220929 fingerprint = useGetToolFromMessages (1)
function useGetToolFromMessages(toolUseID, tools, lookups) {
  let $ = useMemoCache(8);
  let toolName = lookups.toolUseByToolUseID.get(toolUseID)?.name;
  let host = useHost();
  let displayName = toolName === undefined ? undefined : displayOnlyMcpTool(toolName, host);
  let t0;
  if ($[0] !== displayName || $[1] !== lookups.toolUseByToolUseID || $[2] !== toolUseID || $[3] !== tools) {
    k: {
      let toolUse = lookups.toolUseByToolUseID.get(toolUseID);
      if (!toolUse) {
        t0 = null;
        break k;
      }
      let label = findToolByName(tools, toolUse.name) ?? displayName;
      if (label) {
        t0 = {
          tool: label,
          toolUse,
        };
        break k;
      }
      const tool =
        (BRIEF_TOOL_NAME_SET.has(toolUse.name)
          ? findToolByName(getAllBaseToolsFromRegistry() ?? [], toolUse.name)
          : undefined) ?? undefined;
      let cache;
      if ($[5] !== tool || $[6] !== toolUse) {
        cache = {
          tool,
          toolUse,
        };
        $[5] = tool;
        $[6] = toolUse;
        $[7] = cache;
      } else cache = $[7];
      t0 = cache;
    }
    $[0] = displayName;
    $[1] = lookups.toolUseByToolUseID;
    $[2] = toolUseID;
    $[3] = tools;
    $[4] = t0;
  } else t0 = $[4];
  return t0;
}
export { useGetToolFromMessages };
