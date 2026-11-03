/**
 * daemon/homeReady.ts
 *
 * 2.1.316 新增。守护进程 home 目录就绪检查。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bmjfm2g6.js (3)
 * attribution: placement 3
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { tc, u, T, M, U } from "../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { safeParseJSON } from "../utils/json.js";

/**
 * home 就绪记录的版本号与 schema（含文件数、写入时间等）。
 */
//@ chunk-bmjfm2g6.js:341-635 placement
var HOME_READY_VERSION = 1,
  HOME_READY_MAX_BYTES = 65536,
  COUNT_SCHEMA = DoctorLazy(() => tc().min(0).default(0)),
  HOME_READY_VERSION_SCHEMA = DoctorLazy(() => u({ version: tc() })),
  HOME_READY_ROW_SCHEMA = DoctorLazy(() =>
    u({
      version: T(HOME_READY_VERSION),
      generation: tc().min(1),
      appliedBeforeFirstAsk: M(),
      outcome: U(["applied", "partial"]),
      filesApplied: COUNT_SCHEMA(),
      filesRefused: COUNT_SCHEMA(),
      settingsWritten: M().default(!1),
      replacedForeign: COUNT_SCHEMA(),
      writtenAtMs: tc().min(0),
    }),
  );
/**
 * 校验并序列化 home 就绪记录，不合 schema 时抛错。
 */
//@ chunk-bmjfm2g6.js:635-777 placement
function encodeHomeReadyRow(o) {
  let safeParse = HOME_READY_ROW_SCHEMA().safeParse({ ...o, version: HOME_READY_VERSION });
  if (!safeParse.success) throw Error("home ready row is off-schema");
  return Buffer.from(jsonStringify(safeParse.data));
}
/**
 * 解析 home 就绪记录：超长、版本不支持、格式错误分别返回原因。
 */
//@ chunk-bmjfm2g6.js:777-1085 placement
function parseHomeReadyRow(o) {
  if (o.length > HOME_READY_MAX_BYTES) return { ok: !1, reason: "oversize" };
  let e = safeParseJSON(o.toString("utf8"), !1),
    safeParse = HOME_READY_VERSION_SCHEMA().safeParse(e);
  if (safeParse.success && safeParse.data.version !== HOME_READY_VERSION)
    return { ok: !1, reason: "unsupported_version" };
  let safeParse_2 = HOME_READY_ROW_SCHEMA().safeParse(e);
  if (!safeParse_2.success) return { ok: !1, reason: "malformed" };
  let { version: version, ...i } = safeParse_2.data;
  return { ok: !0, ready: i };
}

export { parseHomeReadyRow, encodeHomeReadyRow };
