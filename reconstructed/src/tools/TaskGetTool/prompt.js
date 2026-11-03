/**
 * tools/TaskGetTool/prompt.ts
 *
 * TaskGet 描述与提示词
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/TaskGetTool/prompt.ts
 * pieces: chunk-kxyd0g16.js (1)
 * attribution: fingerprint 1
 */

/**
 * TaskGet 描述与提示词。
 */
//@ chunk-kxyd0g16.js:141693-142476 fingerprint = DESCRIPTION (1)
var TASK_GET_DESCRIPTION = "Get a task by ID from the task list",
  TASK_GET_PROMPT = `Use this tool to retrieve a task by its ID from the task list.

## When to Use This Tool

- When you need the full description and context before starting work on a task
- To understand task dependencies (what it blocks, what blocks it)
- After being assigned a task, to get complete requirements

## Output

Returns full task details:
- **subject**: Task title
- **description**: Detailed requirements and context
- **status**: 'pending', 'in_progress', or 'completed'
- **blocks**: Tasks waiting on this one to complete
- **blockedBy**: Tasks that must complete before this one can start

## Tips

- After fetching a task, verify its blockedBy list is empty before beginning work.
- Use TaskList to see all tasks in summary form.
`;

export { TASK_GET_DESCRIPTION, TASK_GET_PROMPT };
