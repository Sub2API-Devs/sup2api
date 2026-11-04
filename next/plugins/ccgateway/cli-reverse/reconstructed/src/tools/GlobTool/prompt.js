/**
 * tools/GlobTool/prompt.ts
 *
 * Glob 工具名常量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/GlobTool/prompt.ts
 * pieces: chunk-aepeg2w5.js (1), chunk-g54kbxqw.js (2)
 * attribution: fingerprint 1, placement 2
 */
import { leanPromptOf } from "../../utils/model/promptBundles.js";
import { getSubagentSteer } from "../../utils/model/subagentSteer.js";
import { AGENT } from "../AgentTool/constants.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:817674-817688 fingerprint (2.1.88 match: GLOB_TOOL_NAME, 1)
/**
 * Glob 工具名 "Glob"。
 */
var GLOB_TOOL_NAME = "Glob";
//@ chunk-g54kbxqw.js:136718-136945 placement
/**
 * Glob 工具描述：精简提示时用一句话版本，否则按子代理引导设置选是否提示改用 Agent 工具。
 */
function getGlobToolDescription(model, leanPrompt) {
  if (
    leanPromptOf({
      model,
      leanPrompt,
    })
  )
    return 'Fast file pattern matching. Supports glob patterns like "**/*.js" or "src/**/*.ts". Returns matching file paths sorted by modification time.';
  return getSubagentSteer() === "default" ? GLOB_DESCRIPTION_WITH_AGENT : GLOB_DESCRIPTION;
}
//@ chunk-g54kbxqw.js:136945-137352 placement
/**
 * Glob 工具的详细描述，以及附带"开放式搜索改用 Agent 工具"提示的版本。
 */
var GLOB_DESCRIPTION; // deferred: uses AGENT (../AgentTool/constants.js) of its import cycle while loading; runs once the cycle is complete
var GLOB_DESCRIPTION_WITH_AGENT;
deferInit("chunk-g54kbxqw.js:136945", () => {
  GLOB_DESCRIPTION = `- Fast file pattern matching tool that works with any codebase size
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files by name patterns`;
  GLOB_DESCRIPTION_WITH_AGENT = `${GLOB_DESCRIPTION}
- When you are doing an open ended search that may require multiple rounds of globbing and grepping, use the ${AGENT} tool instead (if available)`;
});
export { GLOB_TOOL_NAME, getGlobToolDescription };
