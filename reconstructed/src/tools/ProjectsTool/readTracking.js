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
import { u, array, string, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";

//@ chunk-g54kbxqw.js:45738-45886 placement
var TRACKED_READS_SCHEMA = DoctorLazy(() =>
  u({
    reads: array(
      u({
        docId: string(),
        read: u({
          method: literal("project_read"),
          path: string(),
          version: string().optional(),
          content: string(),
          created_at: string().nullable(),
        }),
      }),
    ),
  }),
);
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
function isTrackedReadsPayload(e) {
  return TRACKED_READS_SCHEMA().safeParse(e).success;
}
export { trackedProjectReads };
