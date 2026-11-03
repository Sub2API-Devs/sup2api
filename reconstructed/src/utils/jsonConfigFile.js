/**
 * utils/jsonConfigFile.ts
 *
 * 2.1.316 新增：读取 JSON 配置文件（大小上限、非常规文件拒绝、schema 校验）；从存储后端读取配置文本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g3mpnrhd.js (5)
 * attribution: placement 5
 */
import { stat } from "fs/promises";
import { Ue, A, u, o } from "../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { xr } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { WORKER_KINDS } from "../daemon/runDaemonWorker.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { jL } from "../services/daemon/paths.js";
import { getErrnoCode, errorMessage } from "./errors.js";
import { jJe, readDaemonConfigFromStorage } from "../daemon/scheduledWorker.js";
import { getFileReader } from "./fileStore.js";
import { safeParseJSON } from "./json.js";

//@ chunk-g3mpnrhd.js:766-864 placement
function D(r) {
  return Ue([r, A(r)])
    .optional()
    .transform((n) => (n === void 0 ? [] : Array.isArray(n) ? n : [n]));
}
//@ chunk-g3mpnrhd.js:864-952 placement
var w = DoctorLazy(() => {
  let r = xr(WORKER_KINDS, (n) => D(n.schema()));
  return u({ $schema: o().optional(), ...r });
});
//@ chunk-g3mpnrhd.js:952-988 placement
function PTr() {
  return w().parse({});
}
/**
 * 读取 JSON 配置文件（大小上限、非常规文件拒绝、schema 校验）。
 */
//@ chunk-g3mpnrhd.js:988-1753 placement
async function readJsonConfigFile(r, n) {
  let i;
  if (isStorageV5Enabled() && n !== void 0 && r === jL()) {
    let e = await readConfigFromStorage(n, r);
    if (!e.ok) return e.result;
    i = e.raw;
  } else
    try {
      let e = await stat(r).catch((l) => (getErrnoCode(l) === "ENOENT" ? null : Promise.reject(l)));
      if (e && (!e.isFile() || e.size > jJe))
        return { ok: !1, error: `${r} is not a regular file (or exceeds 1MiB)` };
      i = await getFileReader().read(r);
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") return { ok: !0, config: PTr(), unknownKeys: [] };
      return { ok: !1, error: `failed to read ${r}: ${errorMessage(error)}` };
    }
  let s = safeParseJSON(i, !1);
  if (s === null) return { ok: !1, error: `failed to parse ${r} as JSON` };
  let safeParse = w().safeParse(s);
  if (!safeParse.success) return { ok: !1, error: `config validation failed: ${safeParse.error.message}` };
  let a = new Set(Object.keys(w().shape)),
    c = typeof s === "object" && s !== null ? Object.keys(s).filter((e) => !a.has(e)) : [];
  return { ok: !0, config: safeParse.data, unknownKeys: c };
}
/**
 * 从存储后端读取配置文本。
 */
//@ chunk-g3mpnrhd.js:1753-2183 placement
async function readConfigFromStorage(r, n) {
  let i = await readDaemonConfigFromStorage(r);
  switch (i.kind) {
    case "text":
      return { ok: !0, raw: i.text };
    case "absent":
      return { ok: !1, result: { ok: !0, config: PTr(), unknownKeys: [] } };
    case "refused":
      return { ok: !1, result: { ok: !1, error: `${n} is not a regular file (or exceeds 1MiB)` } };
    case "failed":
      return { ok: !1, result: { ok: !1, error: `failed to read ${n}: ${i.error.code}` } };
    case "threw":
      return { ok: !1, result: { ok: !1, error: `failed to read ${n}: ${errorMessage(i.error)}` } };
  }
}

export { readJsonConfigFile, PTr };
