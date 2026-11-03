/**
 * utils/secureStorage/deviceKeyStore.ts
 *
 * 2.1.316 新增：设备密钥存储后端
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x58vpmpd.js (10)
 * attribution: placement 10
 */
import { dirname, join } from "path";
import { randomBytes } from "crypto";
import { chmod } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { looseObject, string, record, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-x58vpmpd.js:1198-1294 placement
var devicePrivateKeySchema = DoctorLazy(() =>
  looseObject({
    privateKeyPkcs8B64: string(),
    rowPk: string().optional(),
  }),
);
var deviceKeyRecordSchema = DoctorLazy(() =>
  looseObject({
    keys: record(string(), unknown()),
  }),
);
//@ chunk-x58vpmpd.js:1294-1402 placement
function deviceKeyEntry(e, r) {
  let n = e?.keys[r];
  if (n === undefined) return;
  let i = devicePrivateKeySchema().safeParse(n);
  return i.success ? i.data : undefined;
}
//@ chunk-x58vpmpd.js:1402-1445 placement
var NO_KEYCHAIN = Symbol("deviceKeyStore.NO_KEYCHAIN");
//@ chunk-x58vpmpd.js:1445-1480 placement
function isStorageUnavailable(e) {
  return e === READ_FAILED || e === NO_KEYCHAIN;
}
//@ chunk-x58vpmpd.js:1480-1552 placement
var DEVICE_KEY_SERVICE = "Claude Code-device-keys";
var DEVICE_KEY_SERVICE_NAME = 2000;
var DEVICE_KEY_CACHE_TTL_MS = 4032;
var MAX_DEVICE_KEY_CHUNK_BYTES = 44;
var DEVICE_KEY_CHUNK_OVERHEAD = new Set([37, 50]);
//@ chunk-x58vpmpd.js:1552-1642 placement
function parseDeviceKeyFile(e) {
  try {
    let r = deviceKeyRecordSchema().safeParse(jsonParse(e));
    return r.success ? r.data : undefined;
  } catch {
    return;
  }
}
//@ chunk-x58vpmpd.js:1642-1666 placement
var resolved = Promise.resolve();
//@ chunk-x58vpmpd.js:1666-2074 placement
async function withDeviceKeyLock(e, r) {
  let n = resolved;
  let deferred = Promise.withResolvers();
  resolved = deferred.promise;
  try {
    await n;
    let s = dirname(e());
    await getFsImplementation().mkdir(s);
    let a = await lock(join(s, ".device-keys"), {
      realpath: false,
      retries: {
        retries: 10,
        minTimeout: 100,
        maxTimeout: 1000,
      },
      stale: 15000,
      onCompromised: (c) =>
        logForDebugging(`[deviceKeyStore] write lock compromised: ${errorMessage(c)}`, {
          level: "warn",
        }),
    });
    try {
      return await r();
    } finally {
      await releaseLockQuietly(a, "[deviceKeyStore] write lock");
    }
  } finally {
    deferred.resolve();
  }
}
//@ chunk-x58vpmpd.js:2074-3004 placement
/**
 * 设备密钥的文件后端：读取、写入（带锁）与删除。
 */
function fileDeviceKeyBackend(getDeviceKeysFilePath) {
  return {
    name: "file",
    async read() {
      let r = getDeviceKeysFilePath();
      let n;
      try {
        n = await getFsImplementation().readFile(r, {
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
      if (!n.trim()) return null;
      let deviceKeyFile = parseDeviceKeyFile(n);
      if (deviceKeyFile) return deviceKeyFile;
      let s = `${r}.corrupt-${Date.now()}-${process.pid}-${randomBytes(3).toString("hex")}`;
      try {
        await retryFsOp(r, s);
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
        `[deviceKeyStore] device-key file was not a device-key document; set aside as ${s} and starting fresh`,
        {
          level: "warn",
        },
      );
      logFeatureSad("device_key_store", "corrupt_quarantined");
      return null;
    },
    async write(r) {
      let n = getDeviceKeysFilePath();
      try {
        await getFsImplementation().mkdir(dirname(n));
        await writeFileAtomic(n, jsonStringify(r), 384);
        await chmod(n, 384);
        return true;
      } catch (error) {
        logForDebugging(`[deviceKeyStore] file write failed: ${getErrnoCode(error) ?? "unknown"}`, {
          level: "warn",
        });
        return false;
      }
    },
    withWriteLock(r) {
      return withDeviceKeyLock(getDeviceKeysFilePath, r);
    },
  };
}
//@ chunk-x58vpmpd.js:3004-4016 placement = macOsKeychainStorage (0.647)
/**
 * 设备密钥的 macOS 钥匙串后端：read 用 security 读出并解析设备密钥文档（无登录钥匙串、读失败、格式不对分别处理），write 以十六进制写入（短命令走 security -i），带写锁。属于 deviceKeyStore，不是 macOsKeychainStorage。
 */
function createDeviceKeyKeychainStore(getDeviceKeysFilePath) {
  return {
    name: "keychain",
    async read() {
      let { stdout, code } = await execFileNoThrow(
        "security",
        ["find-generic-password", "-a", getUsername(), "-w", "-s", DEVICE_KEY_SERVICE],
        {
          useCwd: false,
          preserveOutputOnError: false,
          timeout: DEVICE_KEY_SERVICE_NAME,
        },
      );
      if (code === MAX_DEVICE_KEY_CHUNK_BYTES) return null;
      if (DEVICE_KEY_CHUNK_OVERHEAD.has(code)) {
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
      let trimmed = stdout.trim();
      if (!trimmed) return null;
      let deviceKeyFile = parseDeviceKeyFile(trimmed);
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
          (command.length <= DEVICE_KEY_CACHE_TTL_MS
            ? await safeExecFile("security", ["-i"], {
                input: command,
                stdio: ["pipe", "pipe", "pipe"],
                reject: false,
                timeout: DEVICE_KEY_SERVICE_NAME,
              })
            : await safeExecFile(
                "security",
                ["add-generic-password", "-U", "-a", username, "-s", DEVICE_KEY_SERVICE, "-X", str],
                {
                  stdio: ["ignore", "pipe", "pipe"],
                  reject: false,
                  timeout: DEVICE_KEY_SERVICE_NAME,
                },
              )
          ).exitCode === 0
        );
      } catch {
        return false;
      }
    },
    withWriteLock(r) {
      return withDeviceKeyLock(getDeviceKeysFilePath, r);
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
