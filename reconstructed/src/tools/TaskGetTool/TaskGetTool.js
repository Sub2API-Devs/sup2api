/**
 * tools/TaskGetTool/TaskGetTool.ts
 *
 * TaskGet 工具：按 id 读取任务详情
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/TaskGetTool/TaskGetTool.ts
 * pieces: chunk-kxyd0g16.js (1)
 * attribution: fingerprint 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, string, u, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { TaskStatusSchema } from "../TaskListTool/TaskListTool.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { TASK_GET_TOOL_NAME } from "./constants.js";
import { TASK_GET_DESCRIPTION, TASK_GET_PROMPT } from "./prompt.js";
import { areTaskToolsEnabled, getTaskListId, getTask } from "../../utils/tasks.js";

//@ chunk-kxyd0g16.js:142476-143782 fingerprint = TaskGetTool (0.911)
/**
 * TaskGet 工具（只读、并发安全、shouldDefer）：按 taskId 返回 subject/description/status/blocks/blockedBy。
 */
var taskGetInputSchema = DoctorLazy(() =>
  zodStrictObject({
    taskId: string().describe("The ID of the task to retrieve"),
  }),
);
var taskGetOutputSchema = DoctorLazy(() =>
  u({
    task: u({
      id: string(),
      subject: string(),
      description: string(),
      status: TaskStatusSchema(),
      blocks: array(string()),
      blockedBy: array(string()),
    }).nullable(),
  }),
);
var TaskGetTool = buildTool({
  name: TASK_GET_TOOL_NAME,
  searchHint: "retrieve a task by ID",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  async description() {
    return TASK_GET_DESCRIPTION;
  },
  async prompt() {
    return TASK_GET_PROMPT;
  },
  get inputSchema() {
    return taskGetInputSchema();
  },
  get outputSchema() {
    return taskGetOutputSchema();
  },
  userFacingName() {
    return "TaskGet";
  },
  shouldDefer: true,
  isEnabled() {
    return areTaskToolsEnabled();
  },
  isConcurrencySafe() {
    return true;
  },
  isReadOnly() {
    return true;
  },
  toAutoClassifierInput(input) {
    return input.taskId;
  },
  renderToolUseMessage() {
    return null;
  },
  create({ storageV5 }) {
    return {
      async call({ taskId }) {
        let taskListId = getTaskListId();
        let task = await getTask(taskListId, taskId, storageV5);
        if (!task)
          return {
            data: {
              task: null,
            },
          };
        return {
          data: {
            task: {
              id: task.id,
              subject: task.subject,
              description: task.description,
              status: task.status,
              blocks: task.blocks,
              blockedBy: task.blockedBy,
            },
          },
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    let { task } = content;
    if (!task)
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content: "Task not found",
      };
    let lines = [
      `Task #${task.id}: ${task.subject}`,
      `Status: ${task.status}`,
      `Description: ${task.description}`,
    ];
    if (task.blockedBy.length > 0)
      lines.push(`Blocked by: ${task.blockedBy.map((id) => `#${id}`).join(", ")}`);
    if (task.blocks.length > 0) lines.push(`Blocks: ${task.blocks.map((id) => `#${id}`).join(", ")}`);
    return {
      tool_use_id: toolUseID,
      type: "tool_result",
      content: lines.join(`
`),
    };
  },
});
export { TaskGetTool };
