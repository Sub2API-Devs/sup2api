/**
 * tools/AgentTool/agentMemorySnapshot.ts
 *
 * 旧版记忆快照同步在 316 已移除，只剩无引用的元数据 schema；其余为误归的通用文件读写函数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/agentMemorySnapshot.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-e6aww6q8.js:2323863-2323942 fingerprint = saveSyncedMeta (0.656)
/**
 * 代理记忆快照的元数据 schema（updatedAt / syncedFrom）；316 中无引用，快照同步功能已不存在。
 */
var SnapshotMetaSchema = DoctorLazy(() =>
  objectSchema({
    updatedAt: stringSchema().min(1),
  }),
);
var SyncedMetaSchema = DoctorLazy(() =>
  objectSchema({
    syncedFrom: stringSchema().min(1),
  }),
);
