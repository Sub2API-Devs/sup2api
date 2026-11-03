/**
 * tools/TaskListTool/TaskListTool.ts
 *
 * TaskList 工具：列出任务摘要；同块含任务存储 schema 与常量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/TaskListTool/TaskListTool.ts
 * pieces: chunk-kxyd0g16.js (1), chunk-nw7jbebs.js (1)
 * attribution: fingerprint 1, callgraph-fingerprint 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, u, A, o, U, pe, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { TASK_LIST_TOOL_NAME } from "./constants.js";
import { DESCRIPTION_2, getPrompt } from "./prompt.js";
import { Wue, getTaskListId, listTasks } from "../../utils/tasks.js";

/**
 * TaskList 工具（只读、并发安全、shouldDefer）：列出非 _internal 任务，blockedBy 过滤掉已完成的任务；输出 "#id [status] subject (owner) [blocked by …]"。
 */
//@ chunk-kxyd0g16.js:151742-152943 fingerprint = TaskListTool (0.957)
var taskListInputSchema = DoctorLazy(() => zodStrictObject({})),
  taskListOutputSchema = DoctorLazy(() =>
    u({
      tasks: A(
        u({ id: o(), subject: o(), status: TaskStatusSchema(), owner: o().optional(), blockedBy: A(o()) }),
      ),
    }),
  ),
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
    renderToolUseMessage() {
      return null;
    },
    create({ storageV5: e }) {
      return {
        async call(r) {
          let n = getTaskListId(),
            filtered = (await listTasks(n, e)).filter((y) => !y.metadata?._internal),
            f = new Set(filtered.filter((y) => y.status === "completed").map((y) => y.id));
          return {
            data: {
              tasks: filtered.map((y) => ({
                id: y.id,
                subject: y.subject,
                status: y.status,
                owner: y.owner,
                blockedBy: y.blockedBy.filter((k) => !f.has(k)),
              })),
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(e, r) {
      let { tasks: tasks } = e;
      if (tasks.length === 0) return { tool_use_id: r, type: "tool_result", content: "No tasks found" };
      let mapped = tasks.map((f) => {
        let h = f.owner ? ` (${f.owner})` : "",
          y = f.blockedBy.length > 0 ? ` [blocked by ${f.blockedBy.map((k) => `#${k}`).join(", ")}]` : "";
        return `#${f.id} [${f.status}] ${f.subject}${h}${y}`;
      });
      return {
        tool_use_id: r,
        type: "tool_result",
        content: mapped.join(`
`),
      };
    },
  });
/**
 * 任务存储 schema 与常量：TaskStatus、Task 记录（id/subject/description/activeForm/owner/status/blocks/blockedBy/metadata）、.highwatermark、最多 16 次 id 认领重试。
 */
//@ chunk-nw7jbebs.js:5360-5656 callgraph-fingerprint = outputSchema (0.229)
var TaskStatusSchema = DoctorLazy(() => U(["pending", "in_progress", "completed"])),
  TaskSchema = DoctorLazy(() =>
    u({
      id: o(),
      subject: o(),
      description: o(),
      activeForm: o().optional(),
      owner: o().optional(),
      status: TaskStatusSchema(),
      blocks: A(o()),
      blockedBy: A(o()),
      metadata: pe(o(), oe()).optional(),
    }),
  ),
  HIGH_WATER_MARK_FILE = ".highwatermark",
  MAX_CREATE_ID_ATTEMPTS = 16,
  ID_CONFLICT_ERRNO_CODES = new Set(["ELOOP", "EISDIR", "ENXIO"]);

export {
  ID_CONFLICT_ERRNO_CODES,
  HIGH_WATER_MARK_FILE,
  MAX_CREATE_ID_ATTEMPTS,
  TaskSchema,
  TaskListTool,
  TaskStatusSchema,
};
