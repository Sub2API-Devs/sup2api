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
import { _enum, u, string, array } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-e6aww6q8.js:1779327-1779529 fingerprint = TodoItemSchema (0.674)
/**
 * TodoWrite 数据：TodoItem{content, status: pending|in_progress|completed, activeForm} 与列表 schema。
 */
var TodoStatusSchema = DoctorLazy(() => _enum(["pending", "in_progress", "completed"]));
var TodoItemSchema = DoctorLazy(() =>
  u({
    content: string().min(1, "Content cannot be empty"),
    status: TodoStatusSchema(),
    activeForm: string().min(1, "Active form cannot be empty"),
  }),
);
var TodoListSchema = DoctorLazy(() => array(TodoItemSchema()));
export { TodoListSchema };
