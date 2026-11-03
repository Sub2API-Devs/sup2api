/**
 * utils/attachments/nestedMemory.ts
 *
 * 2.1.316 新增：嵌套记忆附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, literal, string } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-e6aww6q8.js:3252265-3252343 placement
/**
 * 嵌套记忆附件的 schema，collectNestedMemoryContents 用它解析消息里的附件。
 */
var nestedMemoryAttachmentSchema = DoctorLazy(() =>
  u({
    type: literal("nested_memory"),
    path: string(),
    content: u({
      content: string(),
    }),
  }),
);
//@ chunk-e6aww6q8.js:3252343-3252567 placement
/**
 * 从消息中收集嵌套记忆附件，按路径返回其内容。
 */
function collectNestedMemoryContents(e) {
  let n = new Map();
  for (let r of e) {
    if (r.type !== "attachment" || r.attachment.type !== "nested_memory") continue;
    let s = nestedMemoryAttachmentSchema().safeParse(r.attachment);
    if (s.success) n.set(s.data.path, s.data.content.content.trim());
  }
  return n;
}
export { collectNestedMemoryContents };
