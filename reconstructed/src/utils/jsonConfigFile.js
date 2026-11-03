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
import { union, array, u, string } from "../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { xr } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { WORKER_KINDS } from "../daemon/runDaemonWorker.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { daemonJsonPath } from "../services/daemon/paths.js";
import { getErrnoCode, errorMessage } from "./errors.js";
import { MAX_DAEMON_CONFIG_BYTES, readDaemonConfigFromStorage } from "../daemon/scheduledWorker.js";
import { getFileReader } from "./fileStore.js";
import { safeParseJSON } from "./json.js";

//@ chunk-g3mpnrhd.js:766-864 placement
function schemaList(r) {
  return union([r, array(r)])
    .optional()
    .transform((n) => (n === undefined ? [] : Array.isArray(n) ? n : [n]));
}
//@ chunk-g3mpnrhd.js:864-952 placement
var workerKindsConfigSchema = DoctorLazy(() => {
  let r = xr(WORKER_KINDS, (n) => schemaList(n.schema()));
  return u({
    $schema: string().optional(),
    ...r,
  });
});
//@ chunk-g3mpnrhd.js:952-988 placement
/**
 * 解析空的 JSON 配置，得到带默认值的对象。
 */
function defaultWorkerKindsConfig() {
  return workerKindsConfigSchema().parse({});
}
//@ chunk-g3mpnrhd.js:988-1753 placement
/**
 * 读取 JSON 配置文件（大小上限、非常规文件拒绝、schema 校验）。
 */
async function readJsonConfigFile(jsonPath, storageV5) {
  let i;
  if (isStorageV5Enabled() && storageV5 !== undefined && jsonPath === daemonJsonPath()) {
    let configFromStorage = await readConfigFromStorage(storageV5, jsonPath);
    if (!configFromStorage.ok) return configFromStorage.result;
    i = configFromStorage.raw;
  } else
    try {
      let e = await stat(jsonPath).catch((error) =>
        getErrnoCode(error) === "ENOENT" ? null : Promise.reject(error),
      );
      if (e && (!e.isFile() || e.size > MAX_DAEMON_CONFIG_BYTES))
        return {
          ok: false,
          error: `${jsonPath} is not a regular file (or exceeds 1MiB)`,
        };
      i = await getFileReader().read(jsonPath);
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT")
        return {
          ok: true,
          config: defaultWorkerKindsConfig(),
          unknownKeys: [],
        };
      return {
        ok: false,
        error: `failed to read ${jsonPath}: ${errorMessage(error)}`,
      };
    }
  let s = safeParseJSON(i, false);
  if (s === null)
    return {
      ok: false,
      error: `failed to parse ${jsonPath} as JSON`,
    };
  let f = workerKindsConfigSchema().safeParse(s);
  if (!f.success)
    return {
      ok: false,
      error: `config validation failed: ${f.error.message}`,
    };
  let a = new Set(Object.keys(workerKindsConfigSchema().shape));
  let unknownKeys = typeof s === "object" && s !== null ? Object.keys(s).filter((key) => !a.has(key)) : [];
  return {
    ok: true,
    config: f.data,
    unknownKeys,
  };
}
//@ chunk-g3mpnrhd.js:1753-2183 placement
/**
 * 从存储后端读取配置文本。
 */
async function readConfigFromStorage(r, n) {
  let daemonConfigFromStorage = await readDaemonConfigFromStorage(r);
  switch (daemonConfigFromStorage.kind) {
    case "text":
      return {
        ok: true,
        raw: daemonConfigFromStorage.text,
      };
    case "absent":
      return {
        ok: false,
        result: {
          ok: true,
          config: defaultWorkerKindsConfig(),
          unknownKeys: [],
        },
      };
    case "refused":
      return {
        ok: false,
        result: {
          ok: false,
          error: `${n} is not a regular file (or exceeds 1MiB)`,
        },
      };
    case "failed":
      return {
        ok: false,
        result: {
          ok: false,
          error: `failed to read ${n}: ${daemonConfigFromStorage.error.code}`,
        },
      };
    case "threw":
      return {
        ok: false,
        result: {
          ok: false,
          error: `failed to read ${n}: ${errorMessage(daemonConfigFromStorage.error)}`,
        },
      };
  }
}
export { readJsonConfigFile, defaultWorkerKindsConfig };
