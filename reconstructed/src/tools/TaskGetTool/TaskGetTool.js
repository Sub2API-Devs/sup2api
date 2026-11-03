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
import { zodStrictObject, o, u, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { TaskStatusSchema } from "../TaskListTool/TaskListTool.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { TASK_GET_TOOL_NAME } from "./constants.js";
import { TASK_GET_DESCRIPTION, TASK_GET_PROMPT } from "./prompt.js";
import { Wue, getTaskListId, getTask } from "../../utils/tasks.js";

/**
 * TaskGet 工具（只读、并发安全、shouldDefer）：按 taskId 返回 subject/description/status/blocks/blockedBy。
 */
//@ chunk-kxyd0g16.js:142476-143782 fingerprint = TaskGetTool (0.911)
var taskGetInputSchema = DoctorLazy(() =>
    zodStrictObject({ taskId: o().describe("The ID of the task to retrieve") }),
  ),
  taskGetOutputSchema = DoctorLazy(() =>
    u({
      task: u({
        id: o(),
        subject: o(),
        description: o(),
        status: TaskStatusSchema(),
        blocks: A(o()),
        blockedBy: A(o()),
      }).nullable(),
    }),
  ),
  TaskGetTool = buildTool({
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
    shouldDefer: !0,
    isEnabled() {
      return Wue();
    },
    isConcurrencySafe() {
      return !0;
    },
    isReadOnly() {
      return !0;
    },
    toAutoClassifierInput(e) {
      return e.taskId;
    },
    renderToolUseMessage() {
      return null;
    },
    create({ storageV5: e }) {
      return {
        async call({ taskId: r }) {
          let n = getTaskListId(),
            s = await getTask(n, r, e);
          if (!s) return { data: { task: null } };
          return {
            data: {
              task: {
                id: s.id,
                subject: s.subject,
                description: s.description,
                status: s.status,
                blocks: s.blocks,
                blockedBy: s.blockedBy,
              },
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(e, r) {
      let { task: task } = e;
      if (!task) return { tool_use_id: r, type: "tool_result", content: "Task not found" };
      let s = [
        `Task #${task.id}: ${task.subject}`,
        `Status: ${task.status}`,
        `Description: ${task.description}`,
      ];
      if (task.blockedBy.length > 0) s.push(`Blocked by: ${task.blockedBy.map((f) => `#${f}`).join(", ")}`);
      if (task.blocks.length > 0) s.push(`Blocks: ${task.blocks.map((block) => `#${block}`).join(", ")}`);
      return {
        tool_use_id: r,
        type: "tool_result",
        content: s.join(`
`),
      };
    },
  });

export { TaskGetTool };
