/**
 * tools/GlobTool/_new/GLOB_DESCRIPTION.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g54kbxqw.js (2)
 * attribution: sole-consumer-new 2
 */
import { gD } from "../../../utils/model/promptBundles.js";
import { getSubagentSteer } from "../../../utils/model/subagentSteer.js";
import { AGENT } from "../../AgentTool/constants.js";

/**
 * Glob 工具描述：精简提示时用一句话版本，否则按子代理引导设置选是否提示改用 Agent 工具。
 */
//@ chunk-g54kbxqw.js:136718-136945 sole-consumer-new
function getGlobToolDescription(e, n) {
  if (gD({ model: e, leanPrompt: n }))
    return 'Fast file pattern matching. Supports glob patterns like "**/*.js" or "src/**/*.ts". Returns matching file paths sorted by modification time.';
  return getSubagentSteer() === "default" ? GLOB_DESCRIPTION_WITH_AGENT : GLOB_DESCRIPTION;
}
/**
 * Glob 工具的详细描述，以及附带"开放式搜索改用 Agent 工具"提示的版本。
 */
//@ chunk-g54kbxqw.js:136945-137352 sole-consumer-new
var GLOB_DESCRIPTION = `- Fast file pattern matching tool that works with any codebase size
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files by name patterns`,
  GLOB_DESCRIPTION_WITH_AGENT = `${GLOB_DESCRIPTION}
- When you are doing an open ended search that may require multiple rounds of globbing and grepping, use the ${AGENT} tool instead (if available)`;

export { getGlobToolDescription };
