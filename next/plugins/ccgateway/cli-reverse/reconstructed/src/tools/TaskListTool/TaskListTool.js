/**
 * tools/TaskListTool/TaskListTool.ts
 *
 * TaskList 工具：列出任务摘要；同块含任务存储 schema 与常量
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/TaskListTool/TaskListTool.ts
 * pieces: chunk-3xs5443t.js (1), chunk-fmnbrxwy.js (1)
 * attribution: callgraph-fingerprint 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  _enum,
  objectSchema,
  stringSchema,
  array,
  record,
  unknown,
  zodStrictObject,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { TASK_LIST_TOOL_NAME } from "./constants.js";
import { DESCRIPTION_2, getPrompt } from "./prompt.js";
import { areTaskToolsEnabled, getTaskListId, listTasks } from "../../utils/tasks.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-3xs5443t.js:6413-6709 callgraph-fingerprint (2.1.88 match: outputSchema, 0.229)
/**
 * 任务存储 schema 与常量：TaskStatus、Task 记录（id/subject/description/activeForm/owner/status/blocks/blockedBy/metadata）、.highwatermark、最多 16 次 id 认领重试。
 */
var TaskStatusSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var TaskSchema;
var HIGH_WATER_MARK_FILE;
var MAX_CREATE_ID_ATTEMPTS;
var ID_CONFLICT_ERRNO_CODES;
deferInit("chunk-3xs5443t.js:6413", () => {
  TaskStatusSchema = DoctorLazy(() => _enum(["pending", "in_progress", "completed"]));
  TaskSchema = DoctorLazy(() =>
    objectSchema({
      id: stringSchema(),
      subject: stringSchema(),
      description: stringSchema(),
      activeForm: stringSchema().optional(),
      owner: stringSchema().optional(),
      status: TaskStatusSchema(),
      blocks: array(stringSchema()),
      blockedBy: array(stringSchema()),
      metadata: record(stringSchema(), unknown()).optional(),
    }),
  );
  HIGH_WATER_MARK_FILE = ".highwatermark";
  MAX_CREATE_ID_ATTEMPTS = 16;
  ID_CONFLICT_ERRNO_CODES = new Set(["ELOOP", "EISDIR", "ENXIO"]);
});
//@ chunk-fmnbrxwy.js:166739-167940 fingerprint (2.1.88 match: TaskListTool, 0.957)
/**
 * TaskList 工具（只读、并发安全、shouldDefer）：列出非 _internal 任务，blockedBy 过滤掉已完成的任务；输出 "#id [status] subject (owner) [blocked by …]"。
 */
var taskListInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var taskListOutputSchema;
var TaskListTool;
deferInit("chunk-fmnbrxwy.js:166739", () => {
  taskListInputSchema = DoctorLazy(() => zodStrictObject({}));
  taskListOutputSchema = DoctorLazy(() =>
    objectSchema({
      tasks: array(
        objectSchema({
          id: stringSchema(),
          subject: stringSchema(),
          status: TaskStatusSchema(),
          owner: stringSchema().optional(),
          blockedBy: array(stringSchema()),
        }),
      ),
    }),
  );
  TaskListTool = buildTool({
    name: TASK_LIST_TOOL_NAME,
    searchHint: "list all tasks",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    async description() {
      return DESCRIPTION_2;
    },
    async prompt() {
      return getPrompt();
    },
    get inputSchema() {
      return taskListInputSchema();
    },
    get outputSchema() {
      return taskListOutputSchema();
    },
    userFacingName() {
      return "TaskList";
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
    renderToolUseMessage() {
      return null;
    },
    create({ storageV5 }) {
      return {
        async call(input) {
          let taskListId = getTaskListId();
          let allTasks = (await listTasks(taskListId, storageV5)).filter((t) => !t.metadata?._internal);
          let resolvedTaskIds = new Set(allTasks.filter((t) => t.status === "completed").map((t) => t.id));
          return {
            data: {
              tasks: allTasks.map((task) => ({
                id: task.id,
                subject: task.subject,
                status: task.status,
                owner: task.owner,
                blockedBy: task.blockedBy.filter((id) => !resolvedTaskIds.has(id)),
              })),
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(content, toolUseID) {
      let { tasks } = content;
      if (tasks.length === 0)
        return {
          tool_use_id: toolUseID,
          type: "tool_result",
          content: "No tasks found",
        };
      let lines = tasks.map((task) => {
        let owner = task.owner ? ` (${task.owner})` : "";
        let blocked =
          task.blockedBy.length > 0 ? ` [blocked by ${task.blockedBy.map((id) => `#${id}`).join(", ")}]` : "";
        return `#${task.id} [${task.status}] ${task.subject}${owner}${blocked}`;
      });
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content: lines.join(`
`),
      };
    },
  });
});
export {
  TaskStatusSchema,
  ID_CONFLICT_ERRNO_CODES,
  HIGH_WATER_MARK_FILE,
  MAX_CREATE_ID_ATTEMPTS,
  TaskSchema,
  TaskListTool,
};
