/**
 * utils/contextAttachments/memory.ts
 *
 * 2.1.316 新增：记忆上下文附件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  union,
  _enum,
  literal,
  booleanSchema,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { MEMORY_TYPE_VALUES } from "../memory/types.js";
import { SESSION_CONTEXT_REASONS } from "./sessionContext.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:114654-114964 placement
/**
 * 记忆附件 schema：每个文件的路径、类型（AutoMemPinned 归为 AutoMem，未知为 User）、内容、是否未验证；附件含文件列表、移除的路径、是否增量与原因。
 */
var memoryFileSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var memoryAttachmentSchema;
deferInit("chunk-5xgkngpb.js:114654", () => {
  memoryFileSchema = DoctorLazy(() =>
    objectSchema({
      path: stringSchema(),
      type: union([_enum(MEMORY_TYPE_VALUES), literal("AutoMemPinned").transform(() => "AutoMem")]).catch(
        "User",
      ),
      content: stringSchema(),
      unverified: booleanSchema().optional().catch(true),
      startOnly: booleanSchema().optional().catch(undefined),
    }),
  );
  memoryAttachmentSchema = DoctorLazy(() =>
    objectSchema({
      files: array(memoryFileSchema()),
      removed: array(stringSchema()).optional(),
      changed: booleanSchema().optional(),
      reason: _enum(SESSION_CONTEXT_REASONS).optional().catch(undefined),
    }),
  );
});
//@ chunk-5xgkngpb.js:114964-115092 placement
/**
 * 把记忆文件转换成附件条目（去掉首尾空白，未验证时附标记）。
 */
function toMemoryFileEntries(memoryFiles) {
  return memoryFiles.map(({ path, type, content, unverified }) => ({
    path,
    type,
    content: content.trim(),
    ...(unverified && {
      unverified,
    }),
  }));
}
export { memoryAttachmentSchema, toMemoryFileEntries };
