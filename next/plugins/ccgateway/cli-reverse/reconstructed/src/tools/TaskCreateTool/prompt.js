/**
 * tools/TaskCreateTool/prompt.ts
 *
 * TaskCreate 描述与提示词
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/TaskCreateTool/prompt.ts
 * pieces: chunk-kxyd0g16.js (2)
 * attribution: fingerprint 2
 */
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";

//@ chunk-kxyd0g16.js:137578-137622 fingerprint (2.1.88 match: DESCRIPTION, 1)
/**
 * TaskCreate 描述。
 */
var DESCRIPTION = "Create a new task in the task list";
//@ chunk-kxyd0g16.js:137622-140086 fingerprint (2.1.88 match: getPrompt, 0.8)
/**
 * TaskCreate 提示词（agent swarms 下补充分配给队友的说明）。
 */
function getPrompt_2() {
  let teammateContext = isAgentSwarmsEnabled() ? " and potentially assigned to teammates" : "";
  let teammateTips = isAgentSwarmsEnabled()
    ? "- Include enough detail in the description for another agent to understand and complete the task\n- New tasks are created with status 'pending' and no owner - use TaskUpdate with the `owner` parameter to assign them\n"
    : "";
  return `Use this tool to create a structured task list for your current coding session. This helps you track progress, organize complex tasks, and demonstrate thoroughness to the user.
It also helps the user understand the progress of the task and overall progress of their requests.

## When to Use This Tool

Use this tool proactively in these scenarios:

- Complex multi-step tasks - When a task requires 3 or more distinct steps or actions
- Non-trivial and complex tasks - Tasks that require careful planning or multiple operations${teammateContext}
- Plan mode - When using plan mode, create a task list to track the work
- User explicitly requests todo list - When the user directly asks you to use the todo list
- User provides multiple tasks - When users provide a list of things to be done (numbered or comma-separated)
- After receiving new instructions - Immediately capture user requirements as tasks
- When you start working on a task - Mark it as in_progress BEFORE beginning work
- After completing a task - Mark it as completed and add any new follow-up tasks discovered during implementation

## When NOT to Use This Tool

Skip using this tool when:
- There is only a single, straightforward task
- The task is trivial and tracking it provides no organizational benefit
- The task can be completed in less than 3 trivial steps
- The task is purely conversational or informational

NOTE that you should not use this tool if there is only one trivial task to do. In this case you are better off just doing the task directly.

## Task Fields

- **subject**: A brief, actionable title in imperative form (e.g., "Fix authentication bug in login flow")
- **description**: What needs to be done
- **activeForm** (optional): Present continuous form shown in the spinner when the task is in_progress (e.g., "Fixing authentication bug"). If omitted, the spinner shows the subject instead.

All tasks are created with status \`pending\`.

## Tips

- Create tasks with clear, specific subjects that describe the outcome
- After creating tasks, use TaskUpdate to set up dependencies (blocks/blockedBy) if needed
${teammateTips}- Check TaskList first to avoid creating duplicate tasks
`;
}
export { DESCRIPTION, getPrompt_2 };
