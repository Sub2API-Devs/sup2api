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
import { int, u, literal, M, _enum } from "../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { safeParseJSON } from "../utils/json.js";

//@ chunk-bmjfm2g6.js:341-635 placement
/**
 * home 就绪记录的版本号与 schema（含文件数、写入时间等）。
 */
var HOME_READY_VERSION = 1;
var HOME_READY_MAX_BYTES = 65536;
var COUNT_SCHEMA = DoctorLazy(() => int().min(0).default(0));
var HOME_READY_VERSION_SCHEMA = DoctorLazy(() =>
  u({
    version: int(),
  }),
);
var HOME_READY_ROW_SCHEMA = DoctorLazy(() =>
  u({
    version: literal(HOME_READY_VERSION),
    generation: int().min(1),
    appliedBeforeFirstAsk: M(),
    outcome: _enum(["applied", "partial"]),
    filesApplied: COUNT_SCHEMA(),
    filesRefused: COUNT_SCHEMA(),
    settingsWritten: M().default(false),
    replacedForeign: COUNT_SCHEMA(),
    writtenAtMs: int().min(0),
  }),
);
//@ chunk-bmjfm2g6.js:635-777 placement
/**
 * 校验并序列化 home 就绪记录，不合 schema 时抛错。
 */
function encodeHomeReadyRow(o) {
  let e = HOME_READY_ROW_SCHEMA().safeParse({
    ...o,
    version: HOME_READY_VERSION,
  });
  if (!e.success) throw Error("home ready row is off-schema");
  return Buffer.from(jsonStringify(e.data));
}
//@ chunk-bmjfm2g6.js:777-1085 placement
/**
 * 解析 home 就绪记录：超长、版本不支持、格式错误分别返回原因。
 */
function parseHomeReadyRow(o) {
  if (o.length > HOME_READY_MAX_BYTES)
    return {
      ok: false,
      reason: "oversize",
    };
  let e = safeParseJSON(o.toString("utf8"), false);
  let s = HOME_READY_VERSION_SCHEMA().safeParse(e);
  if (s.success && s.data.version !== HOME_READY_VERSION)
    return {
      ok: false,
      reason: "unsupported_version",
    };
  let a = HOME_READY_ROW_SCHEMA().safeParse(e);
  if (!a.success)
    return {
      ok: false,
      reason: "malformed",
    };
  let { version, ...i } = a.data;
  return {
    ok: true,
    ready: i,
  };
}
export { parseHomeReadyRow, encodeHomeReadyRow };
