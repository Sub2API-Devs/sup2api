/**
 * services/homeSeed/homeSeedRecord.ts
 *
 * 2.1.316 新增：home seed 发送记录的读写
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fznepy1n.js (8)
 * attribution: placement 8
 */
import { createHash } from "crypto";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, E, string, array, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { getGlobalConfig, saveGlobalConfigDurably } from "../../utils/config.js";
import { logEvent } from "../analytics/index.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-fznepy1n.js:450-564 placement
var MAX_SEED_RECORDS = 64;
var seedRecordSchema = DoctorLazy(() =>
  u({
    generation: E().int().min(1),
    etag: string().optional(),
    allow: array(string()),
    at: E(),
    tried: literal(true).optional(),
  }),
);
//@ chunk-fznepy1n.js:564-642 placement
function shortSha256(n) {
  return createHash("sha256").update(n, "utf8").digest("hex").slice(0, 32);
}
//@ chunk-fznepy1n.js:642-669 placement
/**
 * 取会话 id 主体作为记录键。
 */
function homeSeedRecordKey(n) {
  return sessionIdBody(n);
}
//@ chunk-fznepy1n.js:669-802 placement
function readHomeSeedRecord(sessionId) {
  let e = getGlobalConfig().remoteHomeSettingsSent?.[homeSeedRecordKey(sessionId)];
  if (e === undefined) return;
  let r = seedRecordSchema().safeParse(e);
  return r.success ? r.data : undefined;
}
//@ chunk-fznepy1n.js:802-863 placement
function hasUntriedHomeSeed(sessionId) {
  let homeSeedRecord = readHomeSeedRecord(sessionId);
  return homeSeedRecord !== undefined && homeSeedRecord.tried !== true;
}
//@ chunk-fznepy1n.js:863-1150 placement
async function writeHomeSeedRecord(sessionId, e, storageV5) {
  let i = homeSeedRecordKey(sessionId);
  if (
    !(await saveGlobalConfigDurably(
      (d) => ({
        ...d,
        remoteHomeSettingsSent: pruneSeedRecords({
          ...d.remoteHomeSettingsSent,
          [i]: mergeSeedRecord(d.remoteHomeSettingsSent?.[i], e),
        }),
      }),
      storageV5,
    ))
  ) {
    logEvent("tengu_home_seed_record_unwritten", {});
    logForDebugging("home settings: the record of what was sent could not be written", {
      level: "warn",
    });
  }
}
//@ chunk-fznepy1n.js:1150-1382 placement
function mergeSeedRecord(n, e) {
  let r = seedRecordSchema().safeParse(n).data;
  let { tried, ...s } = e;
  let d = !e.etag && (r ? r.tried : e.tried);
  return {
    ...s,
    ...(d && {
      tried: true,
    }),
    generation: Math.max(e.generation, r?.generation ?? 0),
    allow: e.allow.filter((g) => e.etag || !r || r.allow.includes(g)),
  };
}
//@ chunk-fznepy1n.js:1382-1597 placement
function pruneSeedRecords(n) {
  let flattened = Object.entries(n).flatMap(([key, value]) => {
    let s = seedRecordSchema().safeParse(value);
    return s.success && Number.isFinite(s.data.at) ? [[key, s.data]] : [];
  });
  return Object.fromEntries(flattened.toSorted(([, r], [, i]) => i.at - r.at).slice(0, MAX_SEED_RECORDS));
}
export { hasUntriedHomeSeed, readHomeSeedRecord, writeHomeSeedRecord, shortSha256 };
