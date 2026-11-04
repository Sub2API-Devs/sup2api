/**
 * tools/ProjectsTool/readTracking.ts
 *
 * 2.1.316 新增：Projects 工具读取记录跟踪
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g54kbxqw.js (3)
 * attribution: placement 3
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, array, stringSchema, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-g54kbxqw.js:45738-45886 placement
var TRACKED_READS_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g54kbxqw.js:45738", () => {
  TRACKED_READS_SCHEMA = DoctorLazy(() =>
    objectSchema({
      reads: array(
        objectSchema({
          docId: stringSchema(),
          read: objectSchema({
            method: literal("project_read"),
            path: stringSchema(),
            version: stringSchema().optional(),
            content: stringSchema(),
            created_at: stringSchema().nullable(),
          }),
        }),
      ),
    }),
  );
});
//@ chunk-g54kbxqw.js:45886-45975 placement
function trackedProjectReads(attachment) {
  if (!isTrackedReadsPayload(attachment)) return;
  let { reads } = attachment;
  return reads.filter((read) => normalizeUuidOrNull(read.docId) !== null);
}
//@ chunk-g54kbxqw.js:45975-46023 placement
/**
 * 判断输入是否符合已跟踪读取的 schema。
 */
function isTrackedReadsPayload(payload) {
  return TRACKED_READS_SCHEMA().safeParse(payload).success;
}
export { trackedProjectReads };
