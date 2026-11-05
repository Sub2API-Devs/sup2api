/**
 * utils/attachments/pdf.ts
 *
 * message_pdf_reads 附件的 schema、判定与去重：只保留同一模型连续读取后仍需重读的 PDF 附件（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1jwzj2da.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  literal,
  array,
  stringSchema,
  numberSchema,
  tuple,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { SYNTHETIC_MODEL } from "../messages.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1jwzj2da.js:730-958 placement
/**
 * message_pdf_reads 附件的 schema：路径、页码与文本或 PDF document 结果。
 */
var messagePdfReadsSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-1jwzj2da.js:730", () => {
  messagePdfReadsSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("message_pdf_reads"),
      reads: array(
        objectSchema({
          path: stringSchema(),
          pages: numberSchema().int().min(1),
          result: tuple([
            objectSchema({
              type: literal("text"),
              text: stringSchema(),
            }),
            objectSchema({
              type: literal("document"),
              source: objectSchema({
                type: literal("base64"),
                media_type: literal("application/pdf"),
                data: stringSchema(),
              }),
            }),
          ]),
        }),
      ),
    }),
  );
});
//@ chunk-1jwzj2da.js:958-1001 placement
/**
 * 取消息里的 PDF 读取记录；services/tokenEstimation 也用它。
 */
function pdfReadsOf(message) {
  return isMessagePdfReads(message) ? message.reads : undefined;
}
//@ chunk-1jwzj2da.js:1001-1045 placement
/**
 * 判定消息是否带有非空的 PDF 读取记录。
 */
function hasPdfReads(message) {
  return (pdfReadsOf(message)?.length ?? 0) > 0;
}
//@ chunk-1jwzj2da.js:1045-1277 placement (2.1.88 match: isNullRenderingAttachment, 1)
/**
 * 找同一模型下已被后续读取覆盖的 PDF 附件，供压缩时丢弃。
 */
function latestPdfReads(messages) {
  let seen = new Set();
  let current;
  for (let index = messages.length - 1; index >= 0; index--) {
    let message = messages[index];
    if (message.type === "assistant" && message.message.model !== SYNTHETIC_MODEL) current = undefined;
    else if (message.type === "attachment" && pdfReadsOf(message.attachment) !== undefined) {
      if (current !== undefined && current !== message) seen.add(message);
      current = message;
    }
  }
  return seen;
}
//@ chunk-1jwzj2da.js:1277-1396 placement
/**
 * 判定对象是否为合法的 message_pdf_reads 附件。
 */
function isMessagePdfReads(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "message_pdf_reads" &&
    messagePdfReadsSchema().safeParse(value).success
  );
}
export { hasPdfReads, pdfReadsOf, latestPdfReads };
