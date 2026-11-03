/**
 * tools/GrepTool/prompt.ts
 *
 * Grep 工具名与提示词
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/GrepTool/prompt.ts
 * pieces: chunk-aepeg2w5.js (1), chunk-g54kbxqw.js (1)
 * attribution: fingerprint 2
 */
import { gD, nK } from "../../utils/model/promptBundles.js";
import { Zs } from "../../constants/promptSections.js";
import { BASH_TOOL_NAME } from "../BashTool/toolName.js";
import { getSubagentSteer } from "../../utils/model/subagentSteer.js";
import { AGENT } from "../AgentTool/constants.js";

/**
 * Grep 工具名 "Grep"。
 */
//@ chunk-aepeg2w5.js:817688-817702 fingerprint = GREP_TOOL_NAME (1)
var GREP_TOOL_NAME = "Grep";
/**
 * 生成 Grep 提示词：lean 模式短版（可换 leanRewrite 版）；完整版说明基于 ripgrep、优先于 Bash 里的 grep/rg、正则语法、glob/type 过滤、三种输出模式、multiline。
 */
//@ chunk-g54kbxqw.js:137352-138896 fingerprint = getDescription (0.514)
function getDescription(e, n, s) {
  if (gD({ model: e, leanPrompt: n })) {
    if (nK({ model: e, leanRewrite: s })) return Zs;
    return `Content search built on ripgrep. Prefer this over \`grep\`/\`rg\` via ${BASH_TOOL_NAME} \u2014 results integrate with the permission UI and file links.

- Full regex syntax (e.g. "log.*Error", "function\\s+\\w+"). Ripgrep, not grep \u2014 escape literal braces (\`interface\\{\\}\`).
- Filter with \`glob\` (e.g. "**/*.tsx") or \`type\` (e.g. "js", "py", "rust").
- \`output_mode\`: "content" (matching lines), "files_with_matches" (paths only, default), or "count".
- \`multiline: true\` for patterns that span lines.`;
  }
  return `A powerful search tool built on ripgrep

  Usage:
  - ALWAYS use ${GREP_TOOL_NAME} for search tasks. NEVER invoke \`grep\` or \`rg\` as a ${BASH_TOOL_NAME} command. The ${GREP_TOOL_NAME} tool has been optimized for correct permissions and access.
  - Supports full regex syntax (e.g., "log.*Error", "function\\s+\\w+")
  - Filter files with glob parameter (e.g., "*.js", "**/*.tsx") or type parameter (e.g., "js", "py", "rust")
  - Output modes: "content" shows matching lines, "files_with_matches" shows only file paths (default), "count" shows match counts
${
  getSubagentSteer() === "default"
    ? `  - Use ${AGENT} tool (if available) for open-ended searches requiring multiple rounds
`
    : ""
}  - Pattern syntax: Uses ripgrep (not grep) - literal braces need escaping (use \`interface\\{\\}\` to find \`interface{}\` in Go code)
  - Multiline matching: By default patterns match within single lines only. For cross-line patterns like \`struct \\{[\\s\\S]*?field\`, use \`multiline: true\`
`;
}

export { GREP_TOOL_NAME, getDescription };
