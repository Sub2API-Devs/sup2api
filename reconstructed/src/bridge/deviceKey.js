/**
 * bridge/deviceKey.ts
 *
 * 2.1.316 新增：cowork 远程设备密钥在安全存储中的加载、生成、迁移与清除
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x58vpmpd.js (18)
 * attribution: placement 18
 */
import { generateKeyPairSync, createPrivateKey, createPublicKey, sign } from "crypto";
import {
  fileDeviceKeyBackend,
  createDeviceKeyKeychainStore,
  isStorageUnavailable,
  deviceKeyEntry,
  NO_KEYCHAIN,
} from "../utils/secureStorage/deviceKeyStore.js";
import { getDeviceKeysFilePath } from "../utils/auth.js";
import { READ_FAILED } from "../utils/secureStorage/storageWriteLock.js";
import { isDiskless } from "../bootstrap/state.js";
import { identity } from "../utils/identity.js";
import { getPlatform as getPlatform_2 } from "../utils/platform.js";
import { isWindowsCredManBackendEnabled, getSecureStorage } from "../utils/secureStorage/index.js";
import { logForDebugging } from "../utils/debug.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../utils/errors.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";

//@ chunk-x58vpmpd.js:4016-4216 placement
var fileDeviceKeyStore = fileDeviceKeyBackend(getDeviceKeysFilePath);
var keychainDeviceKeyStore = createDeviceKeyKeychainStore(getDeviceKeysFilePath);
var DISKLESS_DEVICE_KEY_STORE = {
  name: "diskless",
  read: async () => READ_FAILED,
  write: async () => false,
  withWriteLock: async () => {
    throw Error("This hosted session (claude-code-server) keeps no device key on its machine");
  },
};
var deviceKeyStoreOverride;
//@ chunk-x58vpmpd.js:4216-4270 placement
function deviceKeyStoreForHost() {
  if (deviceKeyStoreOverride) return deviceKeyStoreOverride;
  if (isDiskless()) return DISKLESS_DEVICE_KEY_STORE;
  return fileDeviceKeyStore;
}
//@ chunk-x58vpmpd.js:4270-4293 placement
function deviceKeyStore() {
  return DEVICE_KEY_STORE;
}
//@ chunk-x58vpmpd.js:4293-4326 placement
var legacyKeyMigrationSeen = identity(new Set(), (e) => e.clear());
//@ chunk-x58vpmpd.js:4326-4388 placement
function isInMemoryDeviceKeyStore(e) {
  return e?.inMemory === true || (getPlatform_2() === "windows" && isWindowsCredManBackendEnabled());
}
//@ chunk-x58vpmpd.js:4388-5470 placement
/**
 * 设备密钥存储：在安全存储（钥匙串）中加载、生成、迁移 cowork 远程设备密钥。
 */
var DEVICE_KEY_STORE = {
  async load(e, r) {
    let deviceKeyRecord = await readDeviceKeyRecord(e, r, "load");
    let i = deviceKeyRecord && parseDeviceKeyPrivateKey(deviceKeyRecord.stored);
    return deviceKeyRecord && i ? deviceKeyInfo(e, deviceKeyRecord, i, r) : undefined;
  },
  async loadOrCreate(e, r) {
    let deviceKeyRecord = await readDeviceKeyRecord(e, r, "create");
    if (deviceKeyRecord) {
      let deviceKeyPrivateKey = parseDeviceKeyPrivateKey(deviceKeyRecord.stored);
      if (deviceKeyPrivateKey) return deviceKeyInfo(e, deviceKeyRecord, deviceKeyPrivateKey, r);
      logForDebugging("[deviceKey] stored device key is unreadable; minting a new one");
      if (deviceKeyRecord.location === "legacy")
        await migrateLegacyDeviceKeyNoop(e, deviceKeyRecord, r).catch((error) => {
          logForDebugging(`[deviceKey] could not retire the unreadable device key: ${errorMessage(error)}`);
        });
    }
    let deviceKey = await loadDeviceKey(e, r);
    let s = deviceKey && parseDeviceKeyPrivateKey(deviceKey.stored);
    if (deviceKey && s) {
      logForDebugging(
        `[deviceKey] adopting the device key already held in the ${deviceKey.location === "item" ? "device-key item" : "credentials store"}`,
      );
      return deviceKeyInfo(e, deviceKey, s, r);
    }
    let a = {
      privateKeyPkcs8B64: generateKeyPairSync("ec", {
        namedCurve: "P-256",
      })
        .privateKey.export({
          type: "pkcs8",
          format: "der",
        })
        .toString("base64"),
    };
    let c;
    try {
      c = isInMemoryDeviceKeyStore(r)
        ? await saveDeviceKeyRecord(e, a, r)
        : await loadOrCreateDeviceKey(e, a);
    } catch (error) {
      throw error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
        ? error
        : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `deviceRegistry: device key could not be persisted (${errorMessage(error)})`,
            "deviceRegistry: device key not persisted",
            "key_not_persisted",
          );
    }
    let y = c && parseDeviceKeyPrivateKey(c.stored);
    if (!c || !y)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "deviceRegistry: device key could not be persisted",
        "deviceRegistry: device key not persisted",
        "key_not_persisted",
      );
    return deviceKeyInfo(e, c, y, r);
  },
};
//@ chunk-x58vpmpd.js:5470-5857 placement
function loadOrCreateDeviceKey(e, r) {
  let n = deviceKeyStoreForHost();
  return n.withWriteLock(async () => {
    let i = await n.read();
    if (isStorageUnavailable(i)) return assertKeychainAvailable(i);
    let s = deviceKeyEntry(i, e);
    if (s && parseDeviceKeyPrivateKey(s))
      return {
        location: "item",
        stored: s,
      };
    if (
      !(await n.write({
        ...i,
        keys: {
          ...i?.keys,
          [e]: r,
        },
      }))
    ) {
      logFeatureSad("device_key_store", "item_write_failed");
      return;
    }
    let c = await n.read();
    let y = isStorageUnavailable(c) ? undefined : deviceKeyEntry(c, e);
    if (!y) logFeatureSad("device_key_store", "readback_mismatch");
    return (
      y && {
        location: "item",
        stored: y,
      }
    );
  });
}
//@ chunk-x58vpmpd.js:5857-6108 placement
async function saveDeviceKeyRecord(e, r, n) {
  await getSecureStorage().mutate((s) => {
    if (s.coworkRemoteDevice?.[e]) return s;
    return {
      ...s,
      coworkRemoteDevice: {
        ...s.coworkRemoteDevice,
        [e]: r,
      },
    };
  }, n);
  let i = (await getSecureStorage().readAsync(n))?.coworkRemoteDevice?.[e];
  return (
    i && {
      location: "legacy",
      stored: i,
    }
  );
}
//@ chunk-x58vpmpd.js:6108-6798 placement
async function readDeviceKeyRecord(e, r, n) {
  let i = (await getSecureStorage().readAsync(r))?.coworkRemoteDevice?.[e];
  if (isInMemoryDeviceKeyStore(r)) {
    if (i || r?.inMemory === true)
      return (
        i && {
          location: "legacy",
          stored: i,
        }
      );
    let c = await deviceKeyStoreForHost().read();
    let y = isStorageUnavailable(c) ? undefined : deviceKeyEntry(c, e);
    return (
      y && {
        location: "item",
        stored: y,
      }
    );
  }
  let s = await deviceKeyStoreForHost().read();
  if (isStorageUnavailable(s)) {
    if (i && parseDeviceKeyPrivateKey(i)) {
      if (s === READ_FAILED) logFeatureSad("device_key_store", "item_unreadable_using_legacy");
      return {
        location: "legacy",
        stored: i,
      };
    }
    if (s === NO_KEYCHAIN && n === "load") return;
    return assertKeychainAvailable(s);
  }
  let a = deviceKeyEntry(s, e);
  if (a) {
    if (i?.privateKeyPkcs8B64 === a.privateKeyPkcs8B64 && (n === "create" || !legacyKeyMigrationSeen.has(e)))
      await clearDevicePrivateKey(e, a.privateKeyPkcs8B64, r);
    return {
      location: "item",
      stored: a,
    };
  }
  if (!i) return;
  if (n === "load" && legacyKeyMigrationSeen.has(e))
    return {
      location: "legacy",
      stored: i,
    };
  return {
    location: await createDeviceKey(e, i, r),
    stored: i,
  };
}
//@ chunk-x58vpmpd.js:6798-7174 placement
function assertKeychainAvailable(e) {
  if (e === NO_KEYCHAIN) {
    logFeatureSad("device_key_store", "no_keychain");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "deviceRegistry: this account has no login keychain to hold a device key",
      "deviceRegistry: no login keychain",
      "no_keychain",
    );
  }
  logFeatureSad("device_key_store", "item_read_failed");
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    "deviceRegistry: the device-key store could not be read",
    "deviceRegistry: device-key store unreadable",
    "key_store_unreadable",
  );
}
//@ chunk-x58vpmpd.js:7174-7729 placement
async function loadDeviceKey(e, r) {
  if (r?.inMemory !== true) {
    let i = await deviceKeyStoreForHost().read();
    if (isStorageUnavailable(i)) return assertKeychainAvailable(i);
    let s = deviceKeyEntry(i, e);
    if (s && parseDeviceKeyPrivateKey(s))
      return {
        location: "item",
        stored: s,
      };
  }
  let secureStorage = getSecureStorage();
  for (let i of [
    {
      inaccessibleAs: "failure",
    },
    undefined,
  ]) {
    let s = await (secureStorage.readAsyncStrict?.(r, i) ?? secureStorage.readAsync(r));
    if (s === READ_FAILED) {
      logFeatureSad("device_key_store", "legacy_read_failed");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "deviceRegistry: the credentials store could not be read for a device key",
        "deviceRegistry: credentials store unreadable",
        "key_store_unreadable",
      );
    }
    let a = s?.coworkRemoteDevice?.[e];
    if (a && parseDeviceKeyPrivateKey(a))
      return {
        location: "legacy",
        stored: a,
      };
  }
  return;
}
//@ chunk-x58vpmpd.js:7729-8371 placement
async function createDeviceKey(e, r, n) {
  let i;
  let s = deviceKeyStoreForHost();
  try {
    i = await s.withWriteLock(async () => {
      let a = await s.read();
      if (isStorageUnavailable(a))
        return keepDeviceKeyInLegacyStore(e, a === NO_KEYCHAIN ? "no_keychain" : "item_read_failed");
      if (deviceKeyEntry(a, e) === undefined) {
        if (
          !(await s.write({
            ...a,
            keys: {
              ...a?.keys,
              [e]: r,
            },
          }))
        )
          return keepDeviceKeyInLegacyStore(e, "item_write_failed");
      }
      let c = await s.read();
      let y = isStorageUnavailable(c) ? undefined : deviceKeyEntry(c, e);
      if (y === undefined) return keepDeviceKeyInLegacyStore(e, "readback_mismatch");
      if (y.privateKeyPkcs8B64 !== r.privateKeyPkcs8B64 || y.rowPk !== r.rowPk)
        return keepDeviceKeyInLegacyStore(e, "readback_foreign_key");
      return "item";
    });
  } catch (error) {
    logForDebugging(
      `[deviceKey] could not take the device-key lock to move the device key: ${errorMessage(error)}`,
    );
    return keepDeviceKeyInLegacyStore(e, "lock_unavailable");
  }
  if (i === "item") await clearDevicePrivateKey(e, r.privateKeyPkcs8B64, n);
  return i;
}
//@ chunk-x58vpmpd.js:8371-8510 placement
function keepDeviceKeyInLegacyStore(e, r) {
  legacyKeyMigrationSeen.add(e);
  logForDebugging(`[deviceKey] device key stays in the credentials store for now (${r})`);
  logFeatureSad("device_key_store", r);
  return "legacy";
}
//@ chunk-x58vpmpd.js:8510-8948 placement
async function clearDevicePrivateKey(e, r, n) {
  let i = false;
  try {
    if (
      (
        await getSecureStorage().mutate((a) => {
          if (a.coworkRemoteDevice?.[e]?.privateKeyPkcs8B64 !== r) return a;
          i = true;
          let { [e]: c, ...y } = a.coworkRemoteDevice;
          return {
            ...a,
            coworkRemoteDevice: y,
          };
        }, n)
      ).success
    ) {
      if (i) {
        logForDebugging("[deviceKey] moved the device key out of the credentials store into its own item");
        logFeatureOk("device_key_store");
      }
      return;
    }
  } catch (error) {
    logForDebugging(`[deviceKey] could not clear the legacy device key: ${errorMessage(error)}`);
  }
  keepDeviceKeyInLegacyStore(e, "legacy_delete_failed");
}
//@ chunk-x58vpmpd.js:8948-9159 placement
function parseDeviceKeyPrivateKey(stored) {
  try {
    let privateKey = createPrivateKey({
      key: Buffer.from(stored.privateKeyPkcs8B64, "base64"),
      format: "der",
      type: "pkcs8",
    });
    return privateKey.asymmetricKeyType === "ec" &&
      privateKey.asymmetricKeyDetails?.namedCurve === "prime256v1"
      ? privateKey
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-x58vpmpd.js:9159-9538 placement
function deviceKeyInfo(e, { location, stored }, i, s) {
  return {
    rowPk: stored.rowPk,
    publicKeySpkiB64: createPublicKey(i)
      .export({
        type: "spki",
        format: "der",
      })
      .toString("base64"),
    sign: async (a) =>
      sign("sha256", a, {
        key: i,
        dsaEncoding: "ieee-p1363",
      }),
    setRowPk: (a) =>
      migrateLegacyDeviceKey(
        e,
        {
          location,
          stored,
        },
        (c) => {
          if (c.rowPk === a) return c;
          if (a === undefined) {
            let { rowPk, ...l } = c;
            return l;
          }
          return {
            ...c,
            rowPk: a,
          };
        },
        s,
      ),
    drop: () =>
      migrateLegacyDeviceKeyNoop(
        e,
        {
          location,
          stored,
        },
        s,
      ),
  };
}
//@ chunk-x58vpmpd.js:9538-10366 placement
async function migrateLegacyDeviceKey(e, { location, stored }, i, s) {
  if (location === "legacy") {
    await getSecureStorage().mutate((c) => {
      let y = c.coworkRemoteDevice?.[e];
      if (y?.privateKeyPkcs8B64 !== stored.privateKeyPkcs8B64) return c;
      let l = i(y);
      if (l === y) return c;
      let { [e]: D, ...P } = c.coworkRemoteDevice ?? {};
      return {
        ...c,
        coworkRemoteDevice:
          l === undefined
            ? P
            : {
                ...P,
                [e]: l,
              },
      };
    }, s);
    return;
  }
  let a = deviceKeyStoreForHost();
  await a.withWriteLock(async () => {
    let c = await a.read();
    if (isStorageUnavailable(c))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `deviceRegistry: the ${a.name} device-key store could not be read`,
        "deviceRegistry: device-key store unreadable",
      );
    let y = deviceKeyEntry(c, e);
    if (c === null || y?.privateKeyPkcs8B64 !== stored.privateKeyPkcs8B64) return;
    let l = i(y);
    if (l === y) return;
    let { [e]: D, ...P } = c.keys;
    if (
      !(await a.write({
        ...c,
        keys:
          l === undefined
            ? P
            : {
                ...P,
                [e]: l,
              },
      }))
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `deviceRegistry: the ${a.name} device-key store refused the write`,
        "deviceRegistry: device-key store write refused",
      );
  });
}
//@ chunk-x58vpmpd.js:10366-10413 placement
function migrateLegacyDeviceKeyNoop(e, r, n) {
  return migrateLegacyDeviceKey(
    e,
    r,
    () => {
      return;
    },
    n,
  );
}
export { deviceKeyStore };
