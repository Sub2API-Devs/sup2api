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
import { u, A, o, T } from "../../../vendor/zod/v4/classic/schemas.js";
import { Vt } from "../../utils/agentId.js";

//@ chunk-g54kbxqw.js:45738-45886 placement
var TRACKED_READS_SCHEMA = DoctorLazy(() =>
  u({
    reads: A(
      u({
        docId: o(),
        read: u({
          method: T("project_read"),
          path: o(),
          version: o().optional(),
          content: o(),
          created_at: o().nullable(),
        }),
      }),
    ),
  }),
);
//@ chunk-g54kbxqw.js:45886-45975 placement
function trackedProjectReads(e) {
  if (!ta(e)) return;
  let { reads: reads } = e;
  return reads.filter((s) => Vt(s.docId) !== null);
}
//@ chunk-g54kbxqw.js:45975-46023 placement
function ta(e) {
  return TRACKED_READS_SCHEMA().safeParse(e).success;
}

export { trackedProjectReads };
