/**
 * tools/TaskStopTool/prompt.ts
 *
 * TaskStop 名字、别名与提示词
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/TaskStopTool/prompt.ts
 * pieces: chunk-f5f3fs7w.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-f5f3fs7w.js:560-978 fingerprint (2.1.88 match: TASK_STOP_TOOL_NAME, 0.364)
/**
 * TaskStop 名字 "TaskStop"、别名 ["KillShell","KillBash"] 与提示词。
 */
var TASKSTOP = "TaskStop";
var TASK_STOP_ALIASES = ["KillShell", "KillBash"];
var TASK_STOP_PROMPT = `
- Stops a running background task by its ID
- Takes a task_id parameter identifying the task to stop
- To stop an agent-team teammate, pass its agent ID or bare teammate name as task_id
- To stop a background agent spawned with a name, pass that name as task_id
- Returns a success or failure status
- Use this tool when you need to terminate a long-running task
`;
export { TASKSTOP, TASK_STOP_ALIASES, TASK_STOP_PROMPT };
