/**
 * utils/contextAttachments/memory.ts
 *
 * 2.1.316 新增：记忆上下文附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, union, _enum, literal, M, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { MEMORY_TYPE_VALUES } from "../memory/types.js";
import { SESSION_CONTEXT_REASONS } from "./sessionContext.js";

//@ chunk-e6aww6q8.js:111569-111879 placement
/**
 * 记忆附件 schema：每个文件的路径、类型（AutoMemPinned 归为 AutoMem，未知为 User）、内容、是否未验证；附件含文件列表、移除的路径、是否增量与原因。
 */
var memoryFileSchema = DoctorLazy(() =>
  u({
    path: string(),
    type: union([_enum(MEMORY_TYPE_VALUES), literal("AutoMemPinned").transform(() => "AutoMem")]).catch(
      "User",
    ),
    content: string(),
    unverified: M().optional().catch(true),
    startOnly: M().optional().catch(undefined),
  }),
);
var memoryAttachmentSchema = DoctorLazy(() =>
  u({
    files: array(memoryFileSchema()),
    removed: array(string()).optional(),
    changed: M().optional(),
    reason: _enum(SESSION_CONTEXT_REASONS).optional().catch(undefined),
  }),
);
//@ chunk-e6aww6q8.js:111879-112007 placement
/**
 * 把记忆文件转换成附件条目（去掉首尾空白，未验证时附标记）。
 */
function toMemoryFileEntries(e) {
  return e.map(({ path, type: r, content, unverified }) => ({
    path,
    type: r,
    content: content.trim(),
    ...(unverified && {
      unverified,
    }),
  }));
}
export { memoryAttachmentSchema, toMemoryFileEntries };
