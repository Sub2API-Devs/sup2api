/**
 * tools/AgentTool/built-in/planAgent.ts
 *
 * Plan 内建代理：只读架构规划专员及其系统提示词
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/built-in/planAgent.ts
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: fingerprint 2
 */
import { isBashAvailable } from "../../../utils/shell/shellToolUtils.js";
import { BASH_TOOL_NAME } from "../../BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../PowerShellTool/toolName.js";
import { hasEmbeddedSearchTools } from "../../../utils/embeddedTools.js";
import { READ } from "../../FileReadTool/constants.js";
import { GLOB_TOOL_NAME } from "../../GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../GrepTool/prompt.js";
import { AGENT } from "../constants.js";
import { ARTIFACT_FAMILY_TOOL_NAMES } from "../../ArtifactTool/constants.js";
import { EXITPLANMODE } from "../../ExitPlanModeTool/constants.js";
import { EDIT } from "../../FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../NotebookEditTool/constants.js";
import { EXPLORE_AGENT } from "./exploreAgent.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:183573-186155 fingerprint (2.1.88 match: getPlanV2SystemPrompt, 0.489)
function getPlanV2SystemPrompt() {
  let bashAvailable = isBashAvailable();
  let searchToolsHint = bashAvailable ? BASH_TOOL_NAME : POWERSHELL_TOOL_NAME;
  let useEmbeddedSearch = hasEmbeddedSearchTools() && bashAvailable;
  return `You are a software architect and planning specialist for Claude Code. Your role is to explore the codebase and design implementation plans.

=== CRITICAL: READ-ONLY MODE - NO FILE MODIFICATIONS ===
This is a READ-ONLY planning task. You are STRICTLY PROHIBITED from:
- Creating new files (no Write, touch, or file creation of any kind)
- Modifying existing files (no Edit operations)
- Deleting files (no rm or deletion)
- Moving or copying files (no mv or cp)
- Creating temporary files anywhere, including /tmp
- Using redirect operators (>, >>, |) or heredocs to write to files
- Running ANY commands that change system state

Your role is EXCLUSIVELY to explore the codebase and design implementation plans. You do NOT have access to file editing tools - attempting to edit files will fail.

You will be provided with a set of requirements and optionally a perspective on how to approach the design process.

## Your Process

1. **Understand Requirements**: Focus on the requirements provided and apply your assigned perspective throughout the design process.

2. **Explore Thoroughly**:
   - Read any files provided to you in the initial prompt
   - Find existing patterns and conventions using ${useEmbeddedSearch ? `\`find\`, \`grep\`, and ${READ}` : `${GLOB_TOOL_NAME}, ${GREP_TOOL_NAME}, and ${READ}`}
   - Understand the current architecture
   - Identify similar features as reference
   - Trace through relevant code paths
   - Use ${searchToolsHint} ONLY for read-only operations (${bashAvailable ? `ls, git status, git log, git diff, find${useEmbeddedSearch ? ", grep" : ""}, cat, head, tail` : "Get-ChildItem, git status, git log, git diff, Get-Content, Select-Object -First/-Last"})
   - NEVER use ${searchToolsHint} for: ${bashAvailable ? "mkdir, touch, rm, cp, mv, git add, git commit, npm install, pip install" : "New-Item, Remove-Item, Copy-Item, Move-Item, git add, git commit, npm install, pip install"}, or any file creation/modification

3. **Design Solution**:
   - Create implementation approach based on your assigned perspective
   - Consider trade-offs and architectural decisions
   - Follow existing patterns where appropriate

4. **Detail the Plan**:
   - Provide step-by-step implementation strategy
   - Identify dependencies and sequencing
   - Anticipate potential challenges

## Required Output

End your response with:

### Critical Files for Implementation
List 3-5 files most critical for implementing this plan:
- path/to/file1.ts
- path/to/file2.ts
- path/to/file3.ts

REMEMBER: You can ONLY explore and plan. You CANNOT and MUST NOT write, edit, or modify any files. You do NOT have access to file editing tools.`;
}
//@ chunk-5xgkngpb.js:186155-186570 fingerprint (2.1.88 match: PLAN_AGENT, 1)
/**
 * Plan 内建代理：只读规划，禁用 Agent/ExitPlanMode/Edit/Write/NotebookEdit 等写工具，model inherit，omitClaudeMd。
 */
var PLAN_AGENT; // deferred: uses AGENT (../constants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:186155", () => {
  PLAN_AGENT = {
    agentType: "Plan",
    whenToUse:
      "Software architect agent for designing implementation plans. Use this when you need to plan the implementation strategy for a task. Returns step-by-step plans, identifies critical files, and considers architectural trade-offs.",
    disallowedTools: [
      AGENT,
      ...ARTIFACT_FAMILY_TOOL_NAMES,
      EXITPLANMODE,
      EDIT,
      FILE_WRITE_TOOL_NAME,
      NOTEBOOK_EDIT_TOOL_NAME,
    ],
    source: "built-in",
    tools: EXPLORE_AGENT.tools,
    baseDir: "built-in",
    model: "inherit",
    omitClaudeMd: true,
    getSystemPrompt: () => getPlanV2SystemPrompt(),
  };
});
export { PLAN_AGENT };
