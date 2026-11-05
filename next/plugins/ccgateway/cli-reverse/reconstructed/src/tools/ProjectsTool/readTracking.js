/**
 * tools/ProjectsTool/readTracking.ts
 *
 * 2.1.316 新增：Projects 工具读取记录跟踪
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, array, stringSchema, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:143720-143869 placement
var TRACKED_READS_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:143720", () => {
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
//@ chunk-5xgkngpb.js:143869-143959 placement
function trackedProjectReads(attachment) {
  if (!isTrackedReadsPayload(attachment)) return;
  let { reads } = attachment;
  return reads.filter((read) => normalizeUuidOrNull(read.docId) !== null);
}
//@ chunk-5xgkngpb.js:143959-144009 placement
/**
 * 判断输入是否符合已跟踪读取的 schema。
 */
function isTrackedReadsPayload(payload) {
  return TRACKED_READS_SCHEMA().safeParse(payload).success;
}
export { trackedProjectReads };
