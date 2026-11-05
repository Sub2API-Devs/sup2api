/**
 * tools/AgentTool/built-in/exploreAgent.ts
 *
 * Explore 内建代理：只读代码搜索专员及其系统提示词
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/built-in/exploreAgent.ts
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isBashAvailable } from "../../../utils/shell/shellToolUtils.js";
import { BASH_TOOL_NAME } from "../../BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../PowerShellTool/toolName.js";
import { hasEmbeddedSearchTools } from "../../../utils/embeddedTools.js";
import { GLOB_TOOL_NAME } from "../../GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../GrepTool/prompt.js";
import { READ } from "../../FileReadTool/constants.js";
import { AGENT } from "../constants.js";
import { ARTIFACT_FAMILY_TOOL_NAMES } from "../../ArtifactTool/constants.js";
import { EXITPLANMODE } from "../../ExitPlanModeTool/constants.js";
import { EDIT } from "../../FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../NotebookEditTool/constants.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:179633-181998 fingerprint (2.1.88 match: getExploreSystemPrompt, 0.647)
function getExploreSystemPrompt() {
  let embedded = isBashAvailable();
  let shellToolName = embedded ? BASH_TOOL_NAME : POWERSHELL_TOOL_NAME;
  let useEmbeddedSearch = hasEmbeddedSearchTools() && embedded;
  let globGuidance = useEmbeddedSearch
    ? `- Use \`find\` via ${BASH_TOOL_NAME} for broad file pattern matching`
    : `- Use ${GLOB_TOOL_NAME} for broad file pattern matching`;
  let grepGuidance = useEmbeddedSearch
    ? `- Use \`grep\` via ${BASH_TOOL_NAME} for searching file contents with regex`
    : `- Use ${GREP_TOOL_NAME} for searching file contents with regex`;
  return `You are a file search specialist for Claude Code, Anthropic's official CLI for Claude. You excel at thoroughly navigating and exploring codebases.

=== CRITICAL: READ-ONLY MODE - NO FILE MODIFICATIONS ===
This is a READ-ONLY exploration task. You are STRICTLY PROHIBITED from:
- Creating new files (no Write, touch, or file creation of any kind)
- Modifying existing files (no Edit operations)
- Deleting files (no rm or deletion)
- Moving or copying files (no mv or cp)
- Creating temporary files anywhere, including /tmp
- Using redirect operators (>, >>, |) or heredocs to write to files
- Running ANY commands that change system state

Your role is EXCLUSIVELY to search and analyze existing code. You do NOT have access to file editing tools - attempting to edit files will fail.

Your strengths:
- Rapidly finding files using glob patterns
- Searching code and text with powerful regex patterns
- Reading and analyzing file contents

Guidelines:
${globGuidance}
${grepGuidance}
- Use ${READ} when you know the specific file path you need to read
- Use ${shellToolName} ONLY for read-only operations (${embedded ? `ls, git status, git log, git diff, find${useEmbeddedSearch ? ", grep" : ""}, cat, head, tail` : "Get-ChildItem, git status, git log, git diff, Get-Content, Select-Object -First/-Last"})
- NEVER use ${shellToolName} for: ${embedded ? "mkdir, touch, rm, cp, mv, git add, git commit, npm install, pip install" : "New-Item, Remove-Item, Copy-Item, Move-Item, git add, git commit, npm install, pip install"}, or any file creation/modification
- Adapt your search approach based on the thoroughness level specified by the caller
- Communicate your final report directly as a regular message - do NOT attempt to create files

NOTE: You are meant to be a fast agent that returns output as quickly as possible. In order to achieve this you must:
- Make efficient use of the tools that you have at your disposal: be smart about how you search for files and implementations
- Wherever possible you should try to spawn multiple parallel tool calls for grepping and reading files

Complete the user's search request efficiently and report your findings clearly.`;
}
//@ chunk-5xgkngpb.js:181998-183226 fingerprint (2.1.88 match: EXPLORE_AGENT, 0.716)
/**
 * Explore 内建代理及其 whenToUse 文本；EXPLORE_AGENT_MIN_QUERIES=3 用于主提示词"超过 3 次查询改用 Explore"。
 */
var EXPLORE_AGENT_MIN_QUERIES; // deferred: uses AGENT (../constants.js) of its import cycle while loading; runs once the cycle is complete
var EXPLORE_WHEN_TO_USE;
var EXPLORE_WHEN_TO_USE_LEAN;
var EXPLORE_AGENT;
deferInit("chunk-5xgkngpb.js:181998", () => {
  EXPLORE_AGENT_MIN_QUERIES = 3;
  EXPLORE_WHEN_TO_USE =
    'Fast read-only search agent for locating code. Use it to find files by pattern (eg. "src/components/**/*.tsx"), grep for symbols or keywords (eg. "API endpoints"), or answer "where is X defined / which files reference Y." Do NOT use it for code review, design-doc auditing, cross-file consistency checks, or open-ended analysis \u2014 it reads excerpts rather than whole files and will miss content past its read window. When calling, specify search breadth: "quick" for a single targeted lookup, "medium" for moderate exploration, or "very thorough" to search across multiple locations and naming conventions.';
  EXPLORE_WHEN_TO_USE_LEAN = `Read-only search agent for broad fan-out searches \u2014 when answering means sweeping many files, directories, or naming conventions and you only need the conclusion, not the file dumps. It reads excerpts rather than whole files, so it locates code; it doesn't review or audit it. Specify search breadth: "medium" for moderate exploration, "very thorough" for multiple locations and naming conventions.`;
  EXPLORE_AGENT = {
    agentType: "Explore",
    whenToUse: EXPLORE_WHEN_TO_USE,
    whenToUseLean: EXPLORE_WHEN_TO_USE_LEAN,
    disallowedTools: [
      AGENT,
      ...ARTIFACT_FAMILY_TOOL_NAMES,
      EXITPLANMODE,
      EDIT,
      FILE_WRITE_TOOL_NAME,
      NOTEBOOK_EDIT_TOOL_NAME,
    ],
    source: "built-in",
    baseDir: "built-in",
    model: "inherit",
    omitClaudeMd: true,
    getSystemPrompt: () => getExploreSystemPrompt(),
  };
});
export { EXPLORE_AGENT_MIN_QUERIES, EXPLORE_AGENT };
