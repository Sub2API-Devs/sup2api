/**
 * utils/attachments/nestedMemory.ts
 *
 * 2.1.316 新增：嵌套记忆附件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, literal, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3336895-3336973 placement
/**
 * 嵌套记忆附件的 schema，collectNestedMemoryContents 用它解析消息里的附件。
 */
var nestedMemoryAttachmentSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3336895", () => {
  nestedMemoryAttachmentSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("nested_memory"),
      path: stringSchema(),
      content: objectSchema({
        content: stringSchema(),
      }),
    }),
  );
});
//@ chunk-5xgkngpb.js:3336973-3337197 placement
/**
 * 从消息中收集嵌套记忆附件，按路径返回其内容。
 */
function collectNestedMemoryContents(messages) {
  let contents = new Map();
  for (let message of messages) {
    if (message.type !== "attachment" || message.attachment.type !== "nested_memory") continue;
    let parseResult = nestedMemoryAttachmentSchema().safeParse(message.attachment);
    if (parseResult.success) contents.set(parseResult.data.path, parseResult.data.content.content.trim());
  }
  return contents;
}
export { collectNestedMemoryContents };
