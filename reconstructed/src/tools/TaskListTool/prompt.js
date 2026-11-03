/**
 * tools/TaskListTool/prompt.ts
 *
 * TaskList 描述与提示词（含队友工作流）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/TaskListTool/prompt.ts
 * pieces: chunk-kxyd0g16.js (2)
 * attribution: fingerprint 2
 */
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";

/**
 * TaskList 描述。
 */
//@ chunk-kxyd0g16.js:150001-150042 fingerprint = DESCRIPTION (1)
var DESCRIPTION_2 = "List all tasks in the task list";
/**
 * TaskList 提示词（agent swarms 下补充队友工作流）。
 */
//@ chunk-kxyd0g16.js:150042-151742 fingerprint = getPrompt (1)
function getPrompt() {
  let e = isAgentSwarmsEnabled()
      ? `- Before assigning tasks to teammates, to see what's available
`
      : "",
    r = isAgentSwarmsEnabled()
      ? "- **id**: Task identifier (use with TaskGet, TaskUpdate)"
      : "- **id**: Task identifier (use with TaskGet, TaskUpdate)",
    n = isAgentSwarmsEnabled()
      ? `
## Teammate Workflow

When working as a teammate:
1. After completing your current task, call TaskList to find available work
2. Look for tasks with status 'pending', no owner, and empty blockedBy
3. **Prefer tasks in ID order** (lowest ID first) when multiple tasks are available, as earlier tasks often set up context for later ones
4. Claim an available task using TaskUpdate (set \`owner\` to your name), or wait for leader assignment
5. If blocked, focus on unblocking tasks or notify the team lead
`
      : "";
  return `Use this tool to list all tasks in the task list.

## When to Use This Tool

- To see what tasks are available to work on (status: 'pending', no owner, not blocked)
- To check overall progress on the project
- To find tasks that are blocked and need dependencies resolved
${e}- After completing a task, to check for newly unblocked work or claim the next available task
- **Prefer working on tasks in ID order** (lowest ID first) when multiple tasks are available, as earlier tasks often set up context for later ones

## Output

Returns a summary of each task:
${r}
- **subject**: Brief description of the task
- **status**: 'pending', 'in_progress', or 'completed'
- **owner**: Agent ID if assigned, empty if available
- **blockedBy**: List of open task IDs that must be resolved first (tasks with blockedBy cannot be claimed until dependencies resolve)

Use TaskGet with a specific task ID to view full details including description and comments.
${n}`;
}

export { DESCRIPTION_2, getPrompt };
