/**
 * tools/AgentTool/agentMemorySnapshot.ts
 *
 * 旧版记忆快照同步在 316 已移除，只剩无引用的元数据 schema；其余为误归的通用文件读写函数
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/agentMemorySnapshot.ts
 * pieces: chunk-0fzr619q.js (1), chunk-5xgkngpb.js (1)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { writeFileSyncAndFlush_DEPRECATED } from "../../utils/file.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0fzr619q.js:9372-9424 fingerprint (2.1.88 match: readJsonFile, 1)
function readJsonFile(
  filePath,
  data,
  options = {
    encoding: "utf-8",
  },
) {
  writeFileSyncAndFlush_DEPRECATED(filePath, data, options, false);
}
//@ chunk-5xgkngpb.js:2379264-2379343 fingerprint (2.1.88 match: saveSyncedMeta, 0.656)
/**
 * 代理记忆快照的元数据 schema（updatedAt / syncedFrom）；316 中无引用，快照同步功能已不存在。
 */
var SnapshotMetaSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SyncedMetaSchema;
deferInit("chunk-5xgkngpb.js:2379264", () => {
  SnapshotMetaSchema = DoctorLazy(() =>
    objectSchema({
      updatedAt: stringSchema().min(1),
    }),
  );
  SyncedMetaSchema = DoctorLazy(() =>
    objectSchema({
      syncedFrom: stringSchema().min(1),
    }),
  );
});
export { readJsonFile };
