/**
 * utils/secureStorage/deviceKeyStore.ts
 *
 * 2.1.316 新增：设备密钥存储后端
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-dk1d903v.js (10)
 * attribution: placement 10
 */
import { dirname, join } from "path";
import { randomBytes } from "crypto";
import { chmod } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { looseObject, stringSchema, record, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { READ_FAILED } from "./storageWriteLock.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { getFsImplementation } from "../fsOperations.js";
import { lock, releaseLockQuietly } from "../lockfile.js";
import { logForDebugging } from "../debug.js";
import { errorMessage, getErrnoCode } from "../errors.js";
import { retryFsOp, writeFileAtomic } from "../atomicPublishWrite.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { execFileNoThrow } from "../execFileNoThrow.js";
import { getUsername } from "./macOsKeychainHelpers.js";
import { safeExecFile } from "../safeSpawn.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dk1d903v.js:1197-1293 placement
var devicePrivateKeySchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var deviceKeyRecordSchema;
deferInit("chunk-dk1d903v.js:1197", () => {
  devicePrivateKeySchema = DoctorLazy(() =>
    looseObject({
      privateKeyPkcs8B64: stringSchema(),
      rowPk: stringSchema().optional(),
    }),
  );
  deviceKeyRecordSchema = DoctorLazy(() =>
    looseObject({
      keys: record(stringSchema(), unknown()),
    }),
  );
});
//@ chunk-dk1d903v.js:1293-1401 placement
function deviceKeyEntry(record, keyId) {
  let value = record?.keys[keyId];
  if (value === undefined) return;
  let parsed = devicePrivateKeySchema().safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
//@ chunk-dk1d903v.js:1401-1444 placement
var NO_KEYCHAIN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dk1d903v.js:1401", () => {
  NO_KEYCHAIN = Symbol("deviceKeyStore.NO_KEYCHAIN");
});
//@ chunk-dk1d903v.js:1444-1479 placement
function isStorageUnavailable(value) {
  return value === READ_FAILED || value === NO_KEYCHAIN;
}
//@ chunk-dk1d903v.js:1479-1552 placement
/**
 * 设备密钥存储的常量组：b 是钥匙串服务名 "Claude Code-device-keys"；T 是 security 命令超时 2000 ms；U 是改用 -i 传参数的命令行长度上限 4032；ee 是“项不存在”的退出码 44；re 是无钥匙串的退出码集合 {37,50}。
 */
var DEVICE_KEY_SERVICE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var KEYCHAIN_TIMEOUT_MS;
var KEYCHAIN_PASSWORD_ARG_LIMIT;
var KEYCHAIN_ITEM_NOT_FOUND_EXIT;
var KEYCHAIN_NO_CERT_EXIT_CODES;
deferInit("chunk-dk1d903v.js:1479", () => {
  DEVICE_KEY_SERVICE = "Claude Code-device-keys";
  KEYCHAIN_TIMEOUT_MS = 2000;
  KEYCHAIN_PASSWORD_ARG_LIMIT = 4032;
  KEYCHAIN_ITEM_NOT_FOUND_EXIT = 44;
  KEYCHAIN_NO_CERT_EXIT_CODES = new Set([37, 50]);
});
//@ chunk-dk1d903v.js:1552-1642 placement
function parseDeviceKeyFile(text) {
  try {
    let parsed = deviceKeyRecordSchema().safeParse(jsonParse(text));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return;
  }
}
//@ chunk-dk1d903v.js:1642-1666 placement
var resolved; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dk1d903v.js:1642", () => {
  resolved = Promise.resolve();
});
//@ chunk-dk1d903v.js:1666-2074 placement
async function withDeviceKeyLock(getPath, fn) {
  let previous = resolved;
  let deferred = Promise.withResolvers();
  resolved = deferred.promise;
  try {
    await previous;
    let dir = dirname(getPath());
    await getFsImplementation().mkdir(dir);
    let releaseLock = await lock(join(dir, ".device-keys"), {
      realpath: false,
      retries: {
        retries: 10,
        minTimeout: 100,
        maxTimeout: 1000,
      },
      stale: 15000,
      onCompromised: (error) =>
        logForDebugging(`[deviceKeyStore] write lock compromised: ${errorMessage(error)}`, {
          level: "warn",
        }),
    });
    try {
      return await fn();
    } finally {
      await releaseLockQuietly(releaseLock, "[deviceKeyStore] write lock");
    }
  } finally {
    deferred.resolve();
  }
}
//@ chunk-dk1d903v.js:2074-3004 placement
/**
 * 设备密钥的文件后端：读取、写入（带锁）与删除。
 */
function fileDeviceKeyBackend(getPath) {
  return {
    name: "file",
    async read() {
      let path = getPath();
      let text;
      try {
        text = await getFsImplementation().readFile(path, {
          encoding: "utf8",
        });
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ENOENT") return null;
        logForDebugging(`[deviceKeyStore] file read failed: ${errnoCode ?? "unknown"}`, {
          level: "warn",
        });
        return READ_FAILED;
      }
      if (!text.trim()) return null;
      let deviceKeyFile = parseDeviceKeyFile(text);
      if (deviceKeyFile) return deviceKeyFile;
      let quarantinePath = `${path}.corrupt-${Date.now()}-${process.pid}-${randomBytes(3).toString("hex")}`;
      try {
        await retryFsOp(path, quarantinePath);
      } catch (error) {
        logForDebugging(
          `[deviceKeyStore] device-key file is not a device-key document and could not be set aside: ${getErrnoCode(error) ?? "unknown"}`,
          {
            level: "warn",
          },
        );
        return READ_FAILED;
      }
      logForDebugging(
        `[deviceKeyStore] device-key file was not a device-key document; set aside as ${quarantinePath} and starting fresh`,
        {
          level: "warn",
        },
      );
      logFeatureSad("device_key_store", "corrupt_quarantined");
      return null;
    },
    async write(data) {
      let path = getPath();
      try {
        await getFsImplementation().mkdir(dirname(path));
        await writeFileAtomic(path, jsonStringify(data), 384);
        await chmod(path, 384);
        return true;
      } catch (error) {
        logForDebugging(`[deviceKeyStore] file write failed: ${getErrnoCode(error) ?? "unknown"}`, {
          level: "warn",
        });
        return false;
      }
    },
    withWriteLock(fn) {
      return withDeviceKeyLock(getPath, fn);
    },
  };
}
//@ chunk-dk1d903v.js:3004-4017 placement (2.1.88 match: macOsKeychainStorage, 0.647)
/**
 * 设备密钥的 macOS 钥匙串后端：read 用 security 读出并解析设备密钥文档（无登录钥匙串、读失败、格式不对分别处理），write 以十六进制写入（短命令走 security -i），带写锁。属于 deviceKeyStore，不是 macOsKeychainStorage。
 */
function createDeviceKeyKeychainStore(getPath) {
  return {
    name: "keychain",
    async read() {
      let { stdout, code } = await execFileNoThrow(
        "security",
        ["find-generic-password", "-a", getUsername(), "-w", "-s", DEVICE_KEY_SERVICE],
        {
          useCwd: false,
          preserveOutputOnError: false,
          timeout: KEYCHAIN_TIMEOUT_MS,
        },
      );
      if (code === KEYCHAIN_ITEM_NOT_FOUND_EXIT) return null;
      if (KEYCHAIN_NO_CERT_EXIT_CODES.has(code)) {
        logForDebugging(
          `[deviceKeyStore] this account has no login keychain (security exited ${code}); it holds no device key`,
        );
        return NO_KEYCHAIN;
      }
      if (code !== 0) {
        logForDebugging(`[deviceKeyStore] keychain read failed: security exited ${code}`, {
          level: "warn",
        });
        return READ_FAILED;
      }
      let text = stdout.trim();
      if (!text) return null;
      let deviceKeyFile = parseDeviceKeyFile(text);
      if (!deviceKeyFile) {
        logForDebugging("[deviceKeyStore] keychain item is not a device-key document", {
          level: "warn",
        });
        return READ_FAILED;
      }
      return deviceKeyFile;
    },
    async write(data) {
      let username = getUsername();
      let str = Buffer.from(jsonStringify(data), "utf8").toString("hex");
      let command = `add-generic-password -U -a "${username}" -s "${DEVICE_KEY_SERVICE}" -X "${str}"
`;
      try {
        return (
          (command.length <= KEYCHAIN_PASSWORD_ARG_LIMIT
            ? await safeExecFile("security", ["-i"], {
                input: command,
                stdio: ["pipe", "pipe", "pipe"],
                reject: false,
                timeout: KEYCHAIN_TIMEOUT_MS,
              })
            : await safeExecFile(
                "security",
                ["add-generic-password", "-U", "-a", username, "-s", DEVICE_KEY_SERVICE, "-X", str],
                {
                  stdio: ["ignore", "pipe", "pipe"],
                  reject: false,
                  timeout: KEYCHAIN_TIMEOUT_MS,
                },
              )
          ).exitCode === 0
        );
      } catch {
        return false;
      }
    },
    withWriteLock(fn) {
      return withDeviceKeyLock(getPath, fn);
    },
  };
}
export {
  fileDeviceKeyBackend,
  createDeviceKeyKeychainStore,
  isStorageUnavailable,
  deviceKeyEntry,
  NO_KEYCHAIN,
};
