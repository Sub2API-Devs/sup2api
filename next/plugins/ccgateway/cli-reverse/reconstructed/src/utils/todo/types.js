/**
 * utils/todo/types.ts
 *
 * TodoWrite 的 TodoItem/TodoList zod schema
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/todo/types.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { _enum, objectSchema, stringSchema, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1779327-1779529 fingerprint = TodoItemSchema (0.674)
/**
 * TodoWrite 数据：TodoItem{content, status: pending|in_progress|completed, activeForm} 与列表 schema。
 */
var TodoStatusSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var TodoItemSchema;
var TodoListSchema;
deferInit("chunk-e6aww6q8.js:1779327", () => {
  TodoStatusSchema = DoctorLazy(() => _enum(["pending", "in_progress", "completed"]));
  TodoItemSchema = DoctorLazy(() =>
    objectSchema({
      content: stringSchema().min(1, "Content cannot be empty"),
      status: TodoStatusSchema(),
      activeForm: stringSchema().min(1, "Active form cannot be empty"),
    }),
  );
  TodoListSchema = DoctorLazy(() => array(TodoItemSchema()));
});
export { TodoListSchema };
