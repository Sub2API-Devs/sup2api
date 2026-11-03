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
import { u, E, o, A, T } from "../../../vendor/zod/v4/classic/schemas.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { getGlobalConfig, saveGlobalConfigDurably } from "../../utils/config.js";
import { logEvent } from "../analytics/index.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-fznepy1n.js:450-564 placement
var MAX_SEED_RECORDS = 64,
  seedRecordSchema = DoctorLazy(() =>
    u({
      generation: E().int().min(1),
      etag: o().optional(),
      allow: A(o()),
      at: E(),
      tried: T(!0).optional(),
    }),
  );
//@ chunk-fznepy1n.js:564-642 placement
function shortSha256(n) {
  return createHash("sha256").update(n, "utf8").digest("hex").slice(0, 32);
}
//@ chunk-fznepy1n.js:642-669 placement
function m(n) {
  return sessionIdBody(n);
}
//@ chunk-fznepy1n.js:669-802 placement
function readHomeSeedRecord(n) {
  let e = getGlobalConfig().remoteHomeSettingsSent?.[m(n)];
  if (e === void 0) return;
  let safeParse = seedRecordSchema().safeParse(e);
  return safeParse.success ? safeParse.data : void 0;
}
//@ chunk-fznepy1n.js:802-863 placement
function hasUntriedHomeSeed(n) {
  let e = readHomeSeedRecord(n);
  return e !== void 0 && e.tried !== !0;
}
//@ chunk-fznepy1n.js:863-1150 placement
async function writeHomeSeedRecord(n, e, r) {
  let i = m(n);
  if (
    !(await saveGlobalConfigDurably(
      (d) => ({
        ...d,
        remoteHomeSettingsSent: pruneSeedRecords({
          ...d.remoteHomeSettingsSent,
          [i]: mergeSeedRecord(d.remoteHomeSettingsSent?.[i], e),
        }),
      }),
      r,
    ))
  )
    (logEvent("tengu_home_seed_record_unwritten", {}),
      logForDebugging("home settings: the record of what was sent could not be written", { level: "warn" }));
}
//@ chunk-fznepy1n.js:1150-1382 placement
function mergeSeedRecord(n, e) {
  let r = seedRecordSchema().safeParse(n).data,
    { tried: tried, ...s } = e,
    d = !e.etag && (r ? r.tried : e.tried);
  return {
    ...s,
    ...(d && { tried: !0 }),
    generation: Math.max(e.generation, r?.generation ?? 0),
    allow: e.allow.filter((g) => e.etag || !r || r.allow.includes(g)),
  };
}
//@ chunk-fznepy1n.js:1382-1597 placement
function pruneSeedRecords(n) {
  let flattened = Object.entries(n).flatMap(([r, i]) => {
    let safeParse = seedRecordSchema().safeParse(i);
    return safeParse.success && Number.isFinite(safeParse.data.at) ? [[r, safeParse.data]] : [];
  });
  return Object.fromEntries(flattened.toSorted(([, r], [, i]) => i.at - r.at).slice(0, MAX_SEED_RECORDS));
}

export { hasUntriedHomeSeed, readHomeSeedRecord, writeHomeSeedRecord, shortSha256 };
