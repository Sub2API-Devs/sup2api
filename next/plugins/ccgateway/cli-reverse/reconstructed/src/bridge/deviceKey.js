/**
 * bridge/deviceKey.ts
 *
 * 2.1.316 新增：cowork 远程设备密钥在安全存储中的加载、生成、迁移与清除
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-dk1d903v.js (18)
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-dk1d903v.js:4017-4217 placement
var fileDeviceKeyStore; // deferred: uses fileDeviceKeyBackend (../utils/secureStorage/deviceKeyStore.js) of its import cycle while loading; runs once the cycle is complete
var keychainDeviceKeyStore;
var DISKLESS_DEVICE_KEY_STORE;
var deviceKeyStoreOverride;
deferInit("chunk-dk1d903v.js:4017", () => {
  fileDeviceKeyStore = fileDeviceKeyBackend(getDeviceKeysFilePath);
  keychainDeviceKeyStore = createDeviceKeyKeychainStore(getDeviceKeysFilePath);
  DISKLESS_DEVICE_KEY_STORE = {
    name: "diskless",
    read: async () => READ_FAILED,
    write: async () => false,
    withWriteLock: async () => {
      throw Error("This hosted session (claude-code-server) keeps no device key on its machine");
    },
  };
});
//@ chunk-dk1d903v.js:4217-4271 placement
function deviceKeyStoreForHost() {
  if (deviceKeyStoreOverride) return deviceKeyStoreOverride;
  if (isDiskless()) return DISKLESS_DEVICE_KEY_STORE;
  return fileDeviceKeyStore;
}
//@ chunk-dk1d903v.js:4271-4294 placement
function deviceKeyStore() {
  return DEVICE_KEY_STORE;
}
//@ chunk-dk1d903v.js:4294-4327 placement
var legacyKeyMigrationSeen; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dk1d903v.js:4294", () => {
  legacyKeyMigrationSeen = identity(new Set(), (seen) => seen.clear());
});
//@ chunk-dk1d903v.js:4327-4389 placement
function isInMemoryDeviceKeyStore(options) {
  return options?.inMemory === true || (getPlatform_2() === "windows" && isWindowsCredManBackendEnabled());
}
//@ chunk-dk1d903v.js:4389-5471 placement
/**
 * 设备密钥存储：在安全存储（钥匙串）中加载、生成、迁移 cowork 远程设备密钥。
 */
var DEVICE_KEY_STORE = {
  async load(accountUuid, options) {
    let deviceKeyRecord = await readDeviceKeyRecord(accountUuid, options, "load");
    let privateKey = deviceKeyRecord && parseDeviceKeyPrivateKey(deviceKeyRecord.stored);
    return deviceKeyRecord && privateKey
      ? deviceKeyInfo(accountUuid, deviceKeyRecord, privateKey, options)
      : undefined;
  },
  async loadOrCreate(accountUuid, options) {
    let held = await readDeviceKeyRecord(accountUuid, options, "create");
    if (held) {
      let deviceKeyPrivateKey = parseDeviceKeyPrivateKey(held.stored);
      if (deviceKeyPrivateKey) return deviceKeyInfo(accountUuid, held, deviceKeyPrivateKey, options);
      logForDebugging("[deviceKey] stored device key is unreadable; minting a new one");
      if (held.location === "legacy")
        await migrateLegacyDeviceKeyNoop(accountUuid, held, options).catch((error) => {
          logForDebugging(`[deviceKey] could not retire the unreadable device key: ${errorMessage(error)}`);
        });
    }
    let deviceKey = await loadDeviceKey(accountUuid, options);
    let privateKey = deviceKey && parseDeviceKeyPrivateKey(deviceKey.stored);
    if (deviceKey && privateKey) {
      logForDebugging(
        `[deviceKey] adopting the device key already held in the ${deviceKey.location === "item" ? "device-key item" : "credentials store"}`,
      );
      return deviceKeyInfo(accountUuid, deviceKey, privateKey, options);
    }
    let newKey = {
      privateKeyPkcs8B64: generateKeyPairSync("ec", {
        namedCurve: "P-256",
      })
        .privateKey.export({
          type: "pkcs8",
          format: "der",
        })
        .toString("base64"),
    };
    let saved;
    try {
      saved = isInMemoryDeviceKeyStore(options)
        ? await saveDeviceKeyRecord(accountUuid, newKey, options)
        : await loadOrCreateDeviceKey(accountUuid, newKey);
    } catch (error) {
      throw error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
        ? error
        : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `deviceRegistry: device key could not be persisted (${errorMessage(error)})`,
            "deviceRegistry: device key not persisted",
            "key_not_persisted",
          );
    }
    let savedKey = saved && parseDeviceKeyPrivateKey(saved.stored);
    if (!saved || !savedKey)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "deviceRegistry: device key could not be persisted",
        "deviceRegistry: device key not persisted",
        "key_not_persisted",
      );
    return deviceKeyInfo(accountUuid, saved, savedKey, options);
  },
};
//@ chunk-dk1d903v.js:5471-5858 placement
function loadOrCreateDeviceKey(accountUuid, record) {
  let store = deviceKeyStoreForHost();
  return store.withWriteLock(async () => {
    let snapshot = await store.read();
    if (isStorageUnavailable(snapshot)) return assertKeychainAvailable(snapshot);
    let existing = deviceKeyEntry(snapshot, accountUuid);
    if (existing && parseDeviceKeyPrivateKey(existing))
      return {
        location: "item",
        stored: existing,
      };
    if (
      !(await store.write({
        ...snapshot,
        keys: {
          ...snapshot?.keys,
          [accountUuid]: record,
        },
      }))
    ) {
      logFeatureSad("device_key_store", "item_write_failed");
      return;
    }
    let readBack = await store.read();
    let written = isStorageUnavailable(readBack) ? undefined : deviceKeyEntry(readBack, accountUuid);
    if (!written) logFeatureSad("device_key_store", "readback_mismatch");
    return (
      written && {
        location: "item",
        stored: written,
      }
    );
  });
}
//@ chunk-dk1d903v.js:5858-6109 placement
async function saveDeviceKeyRecord(accountUuid, record, options) {
  await getSecureStorage().mutate((storage) => {
    if (storage.coworkRemoteDevice?.[accountUuid]) return storage;
    return {
      ...storage,
      coworkRemoteDevice: {
        ...storage.coworkRemoteDevice,
        [accountUuid]: record,
      },
    };
  }, options);
  let stored = (await getSecureStorage().readAsync(options))?.coworkRemoteDevice?.[accountUuid];
  return (
    stored && {
      location: "legacy",
      stored,
    }
  );
}
//@ chunk-dk1d903v.js:6109-6799 placement
async function readDeviceKeyRecord(accountUuid, options, mode) {
  let legacyStored = (await getSecureStorage().readAsync(options))?.coworkRemoteDevice?.[accountUuid];
  if (isInMemoryDeviceKeyStore(options)) {
    if (legacyStored || options?.inMemory === true)
      return (
        legacyStored && {
          location: "legacy",
          stored: legacyStored,
        }
      );
    let snapshot = await deviceKeyStoreForHost().read();
    let entry = isStorageUnavailable(snapshot) ? undefined : deviceKeyEntry(snapshot, accountUuid);
    return (
      entry && {
        location: "item",
        stored: entry,
      }
    );
  }
  let snapshot = await deviceKeyStoreForHost().read();
  if (isStorageUnavailable(snapshot)) {
    if (legacyStored && parseDeviceKeyPrivateKey(legacyStored)) {
      if (snapshot === READ_FAILED) logFeatureSad("device_key_store", "item_unreadable_using_legacy");
      return {
        location: "legacy",
        stored: legacyStored,
      };
    }
    if (snapshot === NO_KEYCHAIN && mode === "load") return;
    return assertKeychainAvailable(snapshot);
  }
  let entry = deviceKeyEntry(snapshot, accountUuid);
  if (entry) {
    if (
      legacyStored?.privateKeyPkcs8B64 === entry.privateKeyPkcs8B64 &&
      (mode === "create" || !legacyKeyMigrationSeen.has(accountUuid))
    )
      await clearDevicePrivateKey(accountUuid, entry.privateKeyPkcs8B64, options);
    return {
      location: "item",
      stored: entry,
    };
  }
  if (!legacyStored) return;
  if (mode === "load" && legacyKeyMigrationSeen.has(accountUuid))
    return {
      location: "legacy",
      stored: legacyStored,
    };
  return {
    location: await createDeviceKey(accountUuid, legacyStored, options),
    stored: legacyStored,
  };
}
//@ chunk-dk1d903v.js:6799-7175 placement
function assertKeychainAvailable(readState) {
  if (readState === NO_KEYCHAIN) {
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
//@ chunk-dk1d903v.js:7175-7730 placement
async function loadDeviceKey(accountUuid, options) {
  if (options?.inMemory !== true) {
    let snapshot = await deviceKeyStoreForHost().read();
    if (isStorageUnavailable(snapshot)) return assertKeychainAvailable(snapshot);
    let entry = deviceKeyEntry(snapshot, accountUuid);
    if (entry && parseDeviceKeyPrivateKey(entry))
      return {
        location: "item",
        stored: entry,
      };
  }
  let secureStorage = getSecureStorage();
  for (let strictOptions of [
    {
      inaccessibleAs: "failure",
    },
    undefined,
  ]) {
    let storage = await (secureStorage.readAsyncStrict?.(options, strictOptions) ??
      secureStorage.readAsync(options));
    if (storage === READ_FAILED) {
      logFeatureSad("device_key_store", "legacy_read_failed");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "deviceRegistry: the credentials store could not be read for a device key",
        "deviceRegistry: credentials store unreadable",
        "key_store_unreadable",
      );
    }
    let stored = storage?.coworkRemoteDevice?.[accountUuid];
    if (stored && parseDeviceKeyPrivateKey(stored))
      return {
        location: "legacy",
        stored,
      };
  }
  return;
}
//@ chunk-dk1d903v.js:7730-8372 placement
async function createDeviceKey(accountUuid, record, options) {
  let outcome;
  let store = deviceKeyStoreForHost();
  try {
    outcome = await store.withWriteLock(async () => {
      let snapshot = await store.read();
      if (isStorageUnavailable(snapshot))
        return keepDeviceKeyInLegacyStore(
          accountUuid,
          snapshot === NO_KEYCHAIN ? "no_keychain" : "item_read_failed",
        );
      if (deviceKeyEntry(snapshot, accountUuid) === undefined) {
        if (
          !(await store.write({
            ...snapshot,
            keys: {
              ...snapshot?.keys,
              [accountUuid]: record,
            },
          }))
        )
          return keepDeviceKeyInLegacyStore(accountUuid, "item_write_failed");
      }
      let readBack = await store.read();
      let written = isStorageUnavailable(readBack) ? undefined : deviceKeyEntry(readBack, accountUuid);
      if (written === undefined) return keepDeviceKeyInLegacyStore(accountUuid, "readback_mismatch");
      if (written.privateKeyPkcs8B64 !== record.privateKeyPkcs8B64 || written.rowPk !== record.rowPk)
        return keepDeviceKeyInLegacyStore(accountUuid, "readback_foreign_key");
      return "item";
    });
  } catch (error) {
    logForDebugging(
      `[deviceKey] could not take the device-key lock to move the device key: ${errorMessage(error)}`,
    );
    return keepDeviceKeyInLegacyStore(accountUuid, "lock_unavailable");
  }
  if (outcome === "item") await clearDevicePrivateKey(accountUuid, record.privateKeyPkcs8B64, options);
  return outcome;
}
//@ chunk-dk1d903v.js:8372-8511 placement
function keepDeviceKeyInLegacyStore(accountUuid, reason) {
  legacyKeyMigrationSeen.add(accountUuid);
  logForDebugging(`[deviceKey] device key stays in the credentials store for now (${reason})`);
  logFeatureSad("device_key_store", reason);
  return "legacy";
}
//@ chunk-dk1d903v.js:8511-8949 placement
async function clearDevicePrivateKey(accountUuid, privateKeyPkcs8B64, options) {
  let removed = false;
  try {
    if (
      (
        await getSecureStorage().mutate((storage) => {
          if (storage.coworkRemoteDevice?.[accountUuid]?.privateKeyPkcs8B64 !== privateKeyPkcs8B64)
            return storage;
          removed = true;
          let { [accountUuid]: dropped, ...rest } = storage.coworkRemoteDevice;
          return {
            ...storage,
            coworkRemoteDevice: rest,
          };
        }, options)
      ).success
    ) {
      if (removed) {
        logForDebugging("[deviceKey] moved the device key out of the credentials store into its own item");
        logFeatureOk("device_key_store");
      }
      return;
    }
  } catch (error) {
    logForDebugging(`[deviceKey] could not clear the legacy device key: ${errorMessage(error)}`);
  }
  keepDeviceKeyInLegacyStore(accountUuid, "legacy_delete_failed");
}
//@ chunk-dk1d903v.js:8949-9160 placement
function parseDeviceKeyPrivateKey(deviceKey) {
  try {
    let privateKey = createPrivateKey({
      key: Buffer.from(deviceKey.privateKeyPkcs8B64, "base64"),
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
//@ chunk-dk1d903v.js:9160-9539 placement
function deviceKeyInfo(accountUuid, { location, stored }, privateKey, options) {
  return {
    rowPk: stored.rowPk,
    publicKeySpkiB64: createPublicKey(privateKey)
      .export({
        type: "spki",
        format: "der",
      })
      .toString("base64"),
    sign: async (data) =>
      sign("sha256", data, {
        key: privateKey,
        dsaEncoding: "ieee-p1363",
      }),
    setRowPk: (rowPk) =>
      migrateLegacyDeviceKey(
        accountUuid,
        {
          location,
          stored,
        },
        (stored) => {
          if (stored.rowPk === rowPk) return stored;
          if (rowPk === undefined) {
            let { rowPk, ...withoutRowPk } = stored;
            return withoutRowPk;
          }
          return {
            ...stored,
            rowPk,
          };
        },
        options,
      ),
    drop: () =>
      migrateLegacyDeviceKeyNoop(
        accountUuid,
        {
          location,
          stored,
        },
        options,
      ),
  };
}
//@ chunk-dk1d903v.js:9539-10367 placement
async function migrateLegacyDeviceKey(accountUuid, { location, stored }, transform, options) {
  if (location === "legacy") {
    await getSecureStorage().mutate((storage) => {
      let current = storage.coworkRemoteDevice?.[accountUuid];
      if (current?.privateKeyPkcs8B64 !== stored.privateKeyPkcs8B64) return storage;
      let next = transform(current);
      if (next === current) return storage;
      let { [accountUuid]: dropped, ...rest } = storage.coworkRemoteDevice ?? {};
      return {
        ...storage,
        coworkRemoteDevice:
          next === undefined
            ? rest
            : {
                ...rest,
                [accountUuid]: next,
              },
      };
    }, options);
    return;
  }
  let store = deviceKeyStoreForHost();
  await store.withWriteLock(async () => {
    let snapshot = await store.read();
    if (isStorageUnavailable(snapshot))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `deviceRegistry: the ${store.name} device-key store could not be read`,
        "deviceRegistry: device-key store unreadable",
      );
    let entry = deviceKeyEntry(snapshot, accountUuid);
    if (snapshot === null || entry?.privateKeyPkcs8B64 !== stored.privateKeyPkcs8B64) return;
    let next = transform(entry);
    if (next === entry) return;
    let { [accountUuid]: dropped, ...rest } = snapshot.keys;
    if (
      !(await store.write({
        ...snapshot,
        keys:
          next === undefined
            ? rest
            : {
                ...rest,
                [accountUuid]: next,
              },
      }))
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `deviceRegistry: the ${store.name} device-key store refused the write`,
        "deviceRegistry: device-key store write refused",
      );
  });
}
//@ chunk-dk1d903v.js:10367-10414 placement
function migrateLegacyDeviceKeyNoop(accountUuid, held, options) {
  return migrateLegacyDeviceKey(
    accountUuid,
    held,
    () => {
      return;
    },
    options,
  );
}
export { deviceKeyStore };
