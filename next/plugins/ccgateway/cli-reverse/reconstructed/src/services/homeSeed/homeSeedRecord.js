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
import {
  objectSchema,
  numberSchema,
  stringSchema,
  array,
  literal,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { getGlobalConfig, saveGlobalConfigDurably } from "../../utils/config.js";
import { logEvent } from "../analytics/index.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-fznepy1n.js:450-564 placement
var MAX_SEED_RECORDS = 64;
var seedRecordSchema = DoctorLazy(() =>
  objectSchema({
    generation: numberSchema().int().min(1),
    etag: stringSchema().optional(),
    allow: array(stringSchema()),
    at: numberSchema(),
    tried: literal(true).optional(),
  }),
);
//@ chunk-fznepy1n.js:564-642 placement
function shortSha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 32);
}
//@ chunk-fznepy1n.js:642-669 placement
/**
 * 取会话 id 主体作为记录键。
 */
function homeSeedRecordKey(sessionId) {
  return sessionIdBody(sessionId);
}
//@ chunk-fznepy1n.js:669-802 placement
function readHomeSeedRecord(sessionId) {
  let record = getGlobalConfig().remoteHomeSettingsSent?.[homeSeedRecordKey(sessionId)];
  if (record === undefined) return;
  let reason = seedRecordSchema().safeParse(record);
  return reason.success ? reason.data : undefined;
}
//@ chunk-fznepy1n.js:802-863 placement
function hasUntriedHomeSeed(sessionId) {
  let homeSeedRecord = readHomeSeedRecord(sessionId);
  return homeSeedRecord !== undefined && homeSeedRecord.tried !== true;
}
//@ chunk-fznepy1n.js:863-1150 placement
async function writeHomeSeedRecord(sessionId, record, storageV5) {
  let key = homeSeedRecordKey(sessionId);
  if (
    !(await saveGlobalConfigDurably(
      (saved) => ({
        ...saved,
        remoteHomeSettingsSent: pruneSeedRecords({
          ...saved.remoteHomeSettingsSent,
          [key]: mergeSeedRecord(saved.remoteHomeSettingsSent?.[key], record),
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
function mergeSeedRecord(prior, next) {
  let existing = seedRecordSchema().safeParse(prior).data;
  let { tried, ...rest } = next;
  let carryTried = !next.etag && (existing ? existing.tried : next.tried);
  return {
    ...rest,
    ...(carryTried && {
      tried: true,
    }),
    generation: Math.max(next.generation, existing?.generation ?? 0),
    allow: next.allow.filter((allow) => next.etag || !existing || existing.allow.includes(allow)),
  };
}
//@ chunk-fznepy1n.js:1382-1597 placement
function pruneSeedRecords(records) {
  let flattened = Object.entries(records).flatMap(([key, value]) => {
    let parsed = seedRecordSchema().safeParse(value);
    return parsed.success && Number.isFinite(parsed.data.at) ? [[key, parsed.data]] : [];
  });
  return Object.fromEntries(
    flattened.toSorted(([, left], [, right]) => right.at - left.at).slice(0, MAX_SEED_RECORDS),
  );
}
export { hasUntriedHomeSeed, readHomeSeedRecord, writeHomeSeedRecord, shortSha256 };
