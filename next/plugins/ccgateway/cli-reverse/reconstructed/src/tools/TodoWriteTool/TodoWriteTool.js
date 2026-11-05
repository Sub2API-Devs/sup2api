/**
 * tools/TodoWriteTool/TodoWriteTool.ts
 *
 * TodoWrite 工具：会话内存中的待办清单（任务工具未启用时才可用）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/TodoWriteTool/TodoWriteTool.ts
 * pieces: chunk-fmnbrxwy.js (1)
 * attribution: fingerprint 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { TodoListSchema } from "../../utils/todo/types.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { TODO_WRITE_TOOL_NAME } from "./constants.js";
import { TODO_WRITE_DESCRIPTION, todoWritePromptFor } from "./prompt.js";
import { isTaskToolsEnabled } from "../../utils/tasks.js";
import { todoToolsEnabled } from "../../utils/sessionKind.js";
import { getSessionId } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fmnbrxwy.js:76134-77202 fingerprint (2.1.88 match: TodoWriteTool, 0.74)
/**
 * TodoWrite 工具（strict、shouldDefer）：isEnabled = 任务工具未启用 且 todo 类工具可用；把整份 todos 存入按 agentId/会话的内存表，全部完成时清空。
 */
var todoWriteInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var todoWriteOutputSchema;
var TodoWriteTool;
deferInit("chunk-fmnbrxwy.js:76134", () => {
  todoWriteInputSchema = DoctorLazy(() =>
    zodStrictObject({
      todos: TodoListSchema().describe("The updated todo list"),
    }),
  );
  todoWriteOutputSchema = DoctorLazy(() =>
    objectSchema({
      oldTodos: TodoListSchema().describe("The todo list before the update"),
      newTodos: TodoListSchema().describe("The todo list after the update"),
    }),
  );
  TodoWriteTool = buildTool({
    name: TODO_WRITE_TOOL_NAME,
    searchHint: "manage the session task checklist",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    strict: true,
    async description() {
      return TODO_WRITE_DESCRIPTION;
    },
    async prompt({ model, leanPrompt }) {
      return todoWritePromptFor(model, leanPrompt);
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
    shouldDefer: true,
    isEnabled() {
      return !isTaskToolsEnabled() && todoToolsEnabled();
    },
    toAutoClassifierInput(input) {
      return `${input.todos.length} items`;
    },
    renderToolUseMessage() {
      return null;
    },
    create(toolContext) {
      return {
        async call({ todos }) {
          let todoKey = toolContext.agentId ?? getSessionId();
          let oldTodos = toolContext.todos.get(todoKey) ?? [];
          let allDone = todos.every((todo) => todo.status === "completed");
          toolContext.todos.set(todoKey, allDone ? [] : todos);
          return {
            data: {
              oldTodos,
              newTodos: todos,
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(result, toolUseID) {
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content:
          "Todos have been modified successfully. Ensure that you continue to use the todo list to track your progress. Please proceed with the current tasks if applicable",
      };
    },
  });
});
export { TodoWriteTool };
