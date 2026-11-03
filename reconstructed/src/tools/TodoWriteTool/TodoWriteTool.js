/**
 * tools/TodoWriteTool/TodoWriteTool.ts
 *
 * TodoWrite 工具：会话内存中的待办清单（任务工具未启用时才可用）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/TodoWriteTool/TodoWriteTool.ts
 * pieces: chunk-kxyd0g16.js (1)
 * attribution: fingerprint 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { TodoListSchema } from "../../utils/todo/types.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { TODO_WRITE_TOOL_NAME } from "./constants.js";
import { TODO_WRITE_DESCRIPTION, Ro } from "./prompt.js";
import { isTaskToolsEnabled } from "../../utils/tasks.js";
import { todoToolsEnabled } from "../../utils/sessionKind.js";
import { getSessionId } from "../../bootstrap/state.js";

/**
 * TodoWrite 工具（strict、shouldDefer）：isEnabled = 任务工具未启用 且 todo 类工具可用；把整份 todos 存入按 agentId/会话的内存表，全部完成时清空。
 */
//@ chunk-kxyd0g16.js:61420-62488 fingerprint = TodoWriteTool (0.74)
var todoWriteInputSchema = DoctorLazy(() =>
    zodStrictObject({ todos: TodoListSchema().describe("The updated todo list") }),
  ),
  todoWriteOutputSchema = DoctorLazy(() =>
    u({
      oldTodos: TodoListSchema().describe("The todo list before the update"),
      newTodos: TodoListSchema().describe("The todo list after the update"),
    }),
  ),
  TodoWriteTool = buildTool({
    name: TODO_WRITE_TOOL_NAME,
    searchHint: "manage the session task checklist",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    strict: !0,
    async description() {
      return TODO_WRITE_DESCRIPTION;
    },
    async prompt({ model: e, leanPrompt: r }) {
      return Ro(e, r);
    },
    get inputSchema() {
      return todoWriteInputSchema();
    },
    get outputSchema() {
      return todoWriteOutputSchema();
    },
    userFacingName() {
      return "";
    },
    shouldDefer: !0,
    isEnabled() {
      return !isTaskToolsEnabled() && todoToolsEnabled();
    },
    toAutoClassifierInput(e) {
      return `${e.todos.length} items`;
    },
    renderToolUseMessage() {
      return null;
    },
    create(e) {
      return {
        async call({ todos: r }) {
          let n = e.agentId ?? getSessionId(),
            s = e.todos.get(n) ?? [],
            all = r.every((h) => h.status === "completed");
          return (e.todos.set(n, all ? [] : r), { data: { oldTodos: s, newTodos: r } });
        },
      };
    },
    mapToolResultToToolResultBlockParam(e, r) {
      return {
        tool_use_id: r,
        type: "tool_result",
        content:
          "Todos have been modified successfully. Ensure that you continue to use the todo list to track your progress. Please proceed with the current tasks if applicable",
      };
    },
  });

export { TodoWriteTool };
