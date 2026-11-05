/**
 * tools/TaskGetTool/TaskGetTool.ts
 *
 * TaskGet 工具：按 id 读取任务详情
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/TaskGetTool/TaskGetTool.ts
 * pieces: chunk-fmnbrxwy.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  objectSchema,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { TaskStatusSchema } from "../TaskListTool/TaskListTool.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { TASK_GET_TOOL_NAME } from "./constants.js";
import { TASK_GET_DESCRIPTION, TASK_GET_PROMPT } from "./prompt.js";
import { areTaskToolsEnabled, getTaskListId, getTask } from "../../utils/tasks.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fmnbrxwy.js:157473-158779 fingerprint (2.1.88 match: TaskGetTool, 0.911)
/**
 * TaskGet 工具（只读、并发安全、shouldDefer）：按 taskId 返回 subject/description/status/blocks/blockedBy。
 */
var taskGetInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var taskGetOutputSchema;
var TaskGetTool;
deferInit("chunk-fmnbrxwy.js:157473", () => {
  taskGetInputSchema = DoctorLazy(() =>
    zodStrictObject({
      taskId: stringSchema().describe("The ID of the task to retrieve"),
    }),
  );
  taskGetOutputSchema = DoctorLazy(() =>
    objectSchema({
      task: objectSchema({
        id: stringSchema(),
        subject: stringSchema(),
        description: stringSchema(),
        status: TaskStatusSchema(),
        blocks: array(stringSchema()),
        blockedBy: array(stringSchema()),
      }).nullable(),
    }),
  );
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
});
export { TaskGetTool };
