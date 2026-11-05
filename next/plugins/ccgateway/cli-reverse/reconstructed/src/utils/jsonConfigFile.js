/**
 * utils/jsonConfigFile.ts
 *
 * 2.1.316 新增：读取 JSON 配置文件（大小上限、非常规文件拒绝、schema 校验）；从存储后端读取配置文本。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-s24mfyjz.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { stat } from "fs/promises";
import { union, array, objectSchema, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { import_mapValues } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { WORKER_KINDS } from "../daemon/runDaemonWorker.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { daemonJsonPath } from "../services/daemon/paths.js";
import { getErrnoCode, errorMessage } from "./errors.js";
import { MAX_DAEMON_CONFIG_BYTES, readDaemonConfigFromStorage } from "../daemon/scheduledWorker.js";
import { getFileReader } from "./fileStore.js";
import { safeParseJSON } from "./json.js";

//@ chunk-s24mfyjz.js:799-897 placement
function schemaList(itemSchema) {
  return union([itemSchema, array(itemSchema)])
    .optional()
    .transform((value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]));
}
//@ chunk-s24mfyjz.js:897-985 placement
var workerKindsConfigSchema = DoctorLazy(() => {
  let workerKindSchemas = import_mapValues(WORKER_KINDS, (workerKind) => schemaList(workerKind.schema()));
  return objectSchema({
    $schema: stringSchema().optional(),
    ...workerKindSchemas,
  });
});
//@ chunk-s24mfyjz.js:985-1021 placement
/**
 * 解析空的 JSON 配置，得到带默认值的对象。
 */
function defaultWorkerKindsConfig() {
  return workerKindsConfigSchema().parse({});
}
//@ chunk-s24mfyjz.js:1021-1786 placement
/**
 * 读取 JSON 配置文件（大小上限、非常规文件拒绝、schema 校验）。
 */
async function readJsonConfigFile(jsonPath, storage) {
  let rawText;
  if (isStorageV5Enabled() && storage !== undefined && jsonPath === daemonJsonPath()) {
    let configFromStorage = await readConfigFromStorage(storage, jsonPath);
    if (!configFromStorage.ok) return configFromStorage.result;
    rawText = configFromStorage.raw;
  } else
    try {
      let fileStats = await stat(jsonPath).catch((error) =>
        getErrnoCode(error) === "ENOENT" ? null : Promise.reject(error),
      );
      if (fileStats && (!fileStats.isFile() || fileStats.size > MAX_DAEMON_CONFIG_BYTES))
        return {
          ok: false,
          error: `${jsonPath} is not a regular file (or exceeds 1MiB)`,
        };
      rawText = await getFileReader().read(jsonPath);
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
  let parsed = safeParseJSON(rawText, false);
  if (parsed === null)
    return {
      ok: false,
      error: `failed to parse ${jsonPath} as JSON`,
    };
  let validation = workerKindsConfigSchema().safeParse(parsed);
  if (!validation.success)
    return {
      ok: false,
      error: `config validation failed: ${validation.error.message}`,
    };
  let knownKeys = new Set(Object.keys(workerKindsConfigSchema().shape));
  let unknownKeys =
    typeof parsed === "object" && parsed !== null
      ? Object.keys(parsed).filter((key) => !knownKeys.has(key))
      : [];
  return {
    ok: true,
    config: validation.data,
    unknownKeys,
  };
}
//@ chunk-s24mfyjz.js:1786-2216 placement
/**
 * 从存储后端读取配置文本。
 */
async function readConfigFromStorage(storage, jsonPath) {
  let daemonConfigFromStorage = await readDaemonConfigFromStorage(storage);
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
          error: `${jsonPath} is not a regular file (or exceeds 1MiB)`,
        },
      };
    case "failed":
      return {
        ok: false,
        result: {
          ok: false,
          error: `failed to read ${jsonPath}: ${daemonConfigFromStorage.error.code}`,
        },
      };
    case "threw":
      return {
        ok: false,
        result: {
          ok: false,
          error: `failed to read ${jsonPath}: ${errorMessage(daemonConfigFromStorage.error)}`,
        },
      };
  }
}
export { readJsonConfigFile, defaultWorkerKindsConfig };
