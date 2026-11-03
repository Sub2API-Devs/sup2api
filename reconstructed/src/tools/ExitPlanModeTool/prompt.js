/**
 * tools/ExitPlanModeTool/prompt.ts
 *
 * ExitPlanMode 两版 prompt（读计划文件 / diskless 传参），并混入 AskUserQuestion 名称与 header 上限常量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ExitPlanModeTool/prompt.ts
 * pieces: chunk-fnhsh6ng.js (1)
 * attribution: fingerprint 1
 */
import { ASKUSERQUESTION } from "../AskUserQuestionTool/prompt.js";

//@ chunk-fnhsh6ng.js:3021-5426 fingerprint = EXIT_PLAN_MODE_V2_TOOL_PROMPT (1)
/**
 * ExitPlanMode 的两版 prompt：读计划文件版与 diskless 直接传 plan 版。
 */
var EXIT_PLAN_MODE_PROMPT = `Use this tool when you are in plan mode and have finished writing your plan to the plan file and are ready for user approval.

## How This Tool Works
- You should have already written your plan to the plan file specified in the plan mode system message
- This tool does NOT take the plan content as a parameter - it will read the plan from the file you wrote
- This tool simply signals that you're done planning and ready for the user to review and approve
- The user will see the contents of your plan file when they review it

## When to Use This Tool
IMPORTANT: Only use this tool when the task requires planning the implementation steps of a task that requires writing code. For research tasks where you're gathering information, searching files, reading files or in general trying to understand the codebase - do NOT use this tool.

## Before Using This Tool
Ensure your plan is complete and unambiguous:
- If you have unresolved questions about requirements or approach, use ${ASKUSERQUESTION} first (in earlier phases)
- Once your plan is finalized, use THIS tool to request approval

**Important:** Do NOT use ${ASKUSERQUESTION} to ask "Is this plan okay?" or "Should I proceed?" - that's exactly what THIS tool does. ExitPlanMode inherently requests user approval of your plan.

## Examples

1. Initial task: "Search for and understand the implementation of vim mode in the codebase" - Do not use the exit plan mode tool because you are not planning the implementation steps of a task.
2. Initial task: "Help me implement yank mode for vim" - Use the exit plan mode tool after you have finished planning the implementation steps of the task.
3. Initial task: "Add a new feature to handle user authentication" - If unsure about auth method (OAuth, JWT, etc.), use ${ASKUSERQUESTION} first, then use exit plan mode tool after clarifying the approach.
`;
var EXIT_PLAN_MODE_DISKLESS_PROMPT = `Use this tool when you are in plan mode and your plan is ready for the user to approve.

- Pass the whole plan as \`plan\`, in Markdown. This session has no plan file, so do not write the plan to a file.
- The user sees the plan on an approval card and approves or declines it. Do NOT ask "Is this plan okay?" or "Should I proceed?" in any other way: that is what this tool does.
- If they approve, plan mode ends and you carry out the plan as approved.
- If they decline, you stay in plan mode: find out what they want changed, revise the plan, and call this tool again.
`;
export { EXIT_PLAN_MODE_DISKLESS_PROMPT, EXIT_PLAN_MODE_PROMPT };
