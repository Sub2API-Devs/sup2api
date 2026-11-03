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
import { kt, o, pe, oe } from "../../../vendor/zod/v4/classic/schemas.js";
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
var J = DoctorLazy(() => kt({ privateKeyPkcs8B64: o(), rowPk: o().optional() })),
  Z = DoctorLazy(() => kt({ keys: pe(o(), oe()) }));
//@ chunk-x58vpmpd.js:1294-1402 placement
function deviceKeyEntry(e, r) {
  let n = e?.keys[r];
  if (n === void 0) return;
  let safeParse = J().safeParse(n);
  return safeParse.success ? safeParse.data : void 0;
}
//@ chunk-x58vpmpd.js:1402-1445 placement
var NO_KEYCHAIN = Symbol("deviceKeyStore.NO_KEYCHAIN");
//@ chunk-x58vpmpd.js:1445-1480 placement
function isStorageUnavailable(e) {
  return e === READ_FAILED || e === NO_KEYCHAIN;
}
//@ chunk-x58vpmpd.js:1480-1552 placement
var DEVICE_KEY_SERVICE = "Claude Code-device-keys",
  T = 2000,
  U = 4032,
  ee = 44,
  re = new Set([37, 50]);
//@ chunk-x58vpmpd.js:1552-1642 placement
function parseDeviceKeyFile(e) {
  try {
    let safeParse = Z().safeParse(jsonParse(e));
    return safeParse.success ? safeParse.data : void 0;
  } catch {
    return;
  }
}
//@ chunk-x58vpmpd.js:1642-1666 placement
var resolved = Promise.resolve();
//@ chunk-x58vpmpd.js:1666-2074 placement
async function withDeviceKeyLock(e, r) {
  let n = resolved,
    withResolvers = Promise.withResolvers();
  resolved = withResolvers.promise;
  try {
    await n;
    let s = dirname(e());
    await getFsImplementation().mkdir(s);
    let a = await lock(join(s, ".device-keys"), {
      realpath: !1,
      retries: { retries: 10, minTimeout: 100, maxTimeout: 1000 },
      stale: 15000,
      onCompromised: (c) =>
        logForDebugging(`[deviceKeyStore] write lock compromised: ${errorMessage(c)}`, { level: "warn" }),
    });
    try {
      return await r();
    } finally {
      await releaseLockQuietly(a, "[deviceKeyStore] write lock");
    }
  } finally {
    withResolvers.resolve();
  }
}
/**
 * 设备密钥的文件后端：读取、写入（带锁）与删除。
 */
//@ chunk-x58vpmpd.js:2074-3004 placement
function fileDeviceKeyBackend(e) {
  return {
    name: "file",
    async read() {
      let r = e(),
        n;
      try {
        n = await getFsImplementation().readFile(r, { encoding: "utf8" });
      } catch (error) {
        let c = getErrnoCode(error);
        if (c === "ENOENT") return null;
        return (
          logForDebugging(`[deviceKeyStore] file read failed: ${c ?? "unknown"}`, { level: "warn" }),
          READ_FAILED
        );
      }
      if (!n.trim()) return null;
      let i = parseDeviceKeyFile(n);
      if (i) return i;
      let s = `${r}.corrupt-${Date.now()}-${process.pid}-${randomBytes(3).toString("hex")}`;
      try {
        await retryFsOp(r, s);
      } catch (error) {
        return (
          logForDebugging(
            `[deviceKeyStore] device-key file is not a device-key document and could not be set aside: ${getErrnoCode(error) ?? "unknown"}`,
            { level: "warn" },
          ),
          READ_FAILED
        );
      }
      return (
        logForDebugging(
          `[deviceKeyStore] device-key file was not a device-key document; set aside as ${s} and starting fresh`,
          { level: "warn" },
        ),
        logFeatureSad("device_key_store", "corrupt_quarantined"),
        null
      );
    },
    async write(r) {
      let n = e();
      try {
        return (
          await getFsImplementation().mkdir(dirname(n)),
          await writeFileAtomic(n, jsonStringify(r), 384),
          await chmod(n, 384),
          !0
        );
      } catch (error) {
        return (
          logForDebugging(`[deviceKeyStore] file write failed: ${getErrnoCode(error) ?? "unknown"}`, {
            level: "warn",
          }),
          !1
        );
      }
    },
    withWriteLock(r) {
      return withDeviceKeyLock(e, r);
    },
  };
}
/**
 * 设备密钥的 macOS 钥匙串后端：read 用 security 读出并解析设备密钥文档（无登录钥匙串、读失败、格式不对分别处理），write 以十六进制写入（短命令走 security -i），带写锁。属于 deviceKeyStore，不是 macOsKeychainStorage。
 */
//@ chunk-x58vpmpd.js:3004-4016 placement = macOsKeychainStorage (0.647)
function createDeviceKeyKeychainStore(e) {
  return {
    name: "keychain",
    async read() {
      let { stdout: stdout, code: code } = await execFileNoThrow(
        "security",
        ["find-generic-password", "-a", getUsername(), "-w", "-s", DEVICE_KEY_SERVICE],
        { useCwd: !1, preserveOutputOnError: !1, timeout: T },
      );
      if (code === ee) return null;
      if (re.has(code))
        return (
          logForDebugging(
            `[deviceKeyStore] this account has no login keychain (security exited ${code}); it holds no device key`,
          ),
          NO_KEYCHAIN
        );
      if (code !== 0)
        return (
          logForDebugging(`[deviceKeyStore] keychain read failed: security exited ${code}`, {
            level: "warn",
          }),
          READ_FAILED
        );
      let trimmed = stdout.trim();
      if (!trimmed) return null;
      let s = parseDeviceKeyFile(trimmed);
      if (!s)
        return (
          logForDebugging("[deviceKeyStore] keychain item is not a device-key document", { level: "warn" }),
          READ_FAILED
        );
      return s;
    },
    async write(r) {
      let n = getUsername(),
        str = Buffer.from(jsonStringify(r), "utf8").toString("hex"),
        s = `add-generic-password -U -a "${n}" -s "${DEVICE_KEY_SERVICE}" -X "${str}"
`;
      try {
        return (
          (s.length <= U
            ? await safeExecFile("security", ["-i"], {
                input: s,
                stdio: ["pipe", "pipe", "pipe"],
                reject: !1,
                timeout: T,
              })
            : await safeExecFile(
                "security",
                ["add-generic-password", "-U", "-a", n, "-s", DEVICE_KEY_SERVICE, "-X", str],
                { stdio: ["ignore", "pipe", "pipe"], reject: !1, timeout: T },
              )
          ).exitCode === 0
        );
      } catch {
        return !1;
      }
    },
    withWriteLock(r) {
      return withDeviceKeyLock(e, r);
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
