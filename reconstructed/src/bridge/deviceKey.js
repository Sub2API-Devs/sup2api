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
import { ge } from "../utils/identity.js";
import { getPlatform as getPlatform_2 } from "../utils/platform.js";
import { isWindowsCredManBackendEnabled, getSecureStorage } from "../utils/secureStorage/index.js";
import { logForDebugging } from "../utils/debug.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../utils/errors.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";

//@ chunk-x58vpmpd.js:4016-4216 placement
var fileDeviceKeyStore = fileDeviceKeyBackend(getDeviceKeysFilePath),
  keychainDeviceKeyStore = createDeviceKeyKeychainStore(getDeviceKeysFilePath),
  DISKLESS_DEVICE_KEY_STORE = {
    name: "diskless",
    read: async () => READ_FAILED,
    write: async () => !1,
    withWriteLock: async () => {
      throw Error("This hosted session (claude-code-server) keeps no device key on its machine");
    },
  },
  deviceKeyStoreOverride;
//@ chunk-x58vpmpd.js:4216-4270 placement
function K() {
  if (deviceKeyStoreOverride) return deviceKeyStoreOverride;
  if (isDiskless()) return DISKLESS_DEVICE_KEY_STORE;
  return fileDeviceKeyStore;
}
//@ chunk-x58vpmpd.js:4270-4293 placement
function deviceKeyStore() {
  return DEVICE_KEY_STORE;
}
//@ chunk-x58vpmpd.js:4293-4326 placement
var H = ge(new Set(), (e) => e.clear());
//@ chunk-x58vpmpd.js:4326-4388 placement
function z(e) {
  return e?.inMemory === !0 || (getPlatform_2() === "windows" && isWindowsCredManBackendEnabled());
}
/**
 * 设备密钥存储：在安全存储（钥匙串）中加载、生成、迁移 cowork 远程设备密钥。
 */
//@ chunk-x58vpmpd.js:4388-5470 placement
var DEVICE_KEY_STORE = {
  async load(e, r) {
    let n = await readDeviceKeyRecord(e, r, "load"),
      i = n && parseDeviceKeyPrivateKey(n.stored);
    return n && i ? deviceKeyInfo(e, n, i, r) : void 0;
  },
  async loadOrCreate(e, r) {
    let n = await readDeviceKeyRecord(e, r, "create");
    if (n) {
      let l = parseDeviceKeyPrivateKey(n.stored);
      if (l) return deviceKeyInfo(e, n, l, r);
      if (
        (logForDebugging("[deviceKey] stored device key is unreadable; minting a new one"),
        n.location === "legacy")
      )
        await Y(e, n, r).catch((D) => {
          logForDebugging(`[deviceKey] could not retire the unreadable device key: ${errorMessage(D)}`);
        });
    }
    let i = await loadDeviceKey(e, r),
      s = i && parseDeviceKeyPrivateKey(i.stored);
    if (i && s)
      return (
        logForDebugging(
          `[deviceKey] adopting the device key already held in the ${i.location === "item" ? "device-key item" : "credentials store"}`,
        ),
        deviceKeyInfo(e, i, s, r)
      );
    let a = {
        privateKeyPkcs8B64: generateKeyPairSync("ec", { namedCurve: "P-256" })
          .privateKey.export({ type: "pkcs8", format: "der" })
          .toString("base64"),
      },
      c;
    try {
      c = z(r) ? await saveDeviceKeyRecord(e, a, r) : await loadOrCreateDeviceKey(e, a);
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
  let n = K();
  return n.withWriteLock(async () => {
    let read = await n.read();
    if (isStorageUnavailable(read)) return assertKeychainAvailable(read);
    let s = deviceKeyEntry(read, e);
    if (s && parseDeviceKeyPrivateKey(s)) return { location: "item", stored: s };
    if (!(await n.write({ ...read, keys: { ...read?.keys, [e]: r } }))) {
      logFeatureSad("device_key_store", "item_write_failed");
      return;
    }
    let read_2 = await n.read(),
      y = isStorageUnavailable(read_2) ? void 0 : deviceKeyEntry(read_2, e);
    if (!y) logFeatureSad("device_key_store", "readback_mismatch");
    return y && { location: "item", stored: y };
  });
}
//@ chunk-x58vpmpd.js:5857-6108 placement
async function saveDeviceKeyRecord(e, r, n) {
  await getSecureStorage().mutate((s) => {
    if (s.coworkRemoteDevice?.[e]) return s;
    return { ...s, coworkRemoteDevice: { ...s.coworkRemoteDevice, [e]: r } };
  }, n);
  let i = (await getSecureStorage().readAsync(n))?.coworkRemoteDevice?.[e];
  return i && { location: "legacy", stored: i };
}
//@ chunk-x58vpmpd.js:6108-6798 placement
async function readDeviceKeyRecord(e, r, n) {
  let i = (await getSecureStorage().readAsync(r))?.coworkRemoteDevice?.[e];
  if (z(r)) {
    if (i || r?.inMemory === !0) return i && { location: "legacy", stored: i };
    let read = await K().read(),
      y = isStorageUnavailable(read) ? void 0 : deviceKeyEntry(read, e);
    return y && { location: "item", stored: y };
  }
  let read = await K().read();
  if (isStorageUnavailable(read)) {
    if (i && parseDeviceKeyPrivateKey(i)) {
      if (read === READ_FAILED) logFeatureSad("device_key_store", "item_unreadable_using_legacy");
      return { location: "legacy", stored: i };
    }
    if (read === NO_KEYCHAIN && n === "load") return;
    return assertKeychainAvailable(read);
  }
  let a = deviceKeyEntry(read, e);
  if (a) {
    if (i?.privateKeyPkcs8B64 === a.privateKeyPkcs8B64 && (n === "create" || !H.has(e)))
      await clearDevicePrivateKey(e, a.privateKeyPkcs8B64, r);
    return { location: "item", stored: a };
  }
  if (!i) return;
  if (n === "load" && H.has(e)) return { location: "legacy", stored: i };
  return { location: await createDeviceKey(e, i, r), stored: i };
}
//@ chunk-x58vpmpd.js:6798-7174 placement
function assertKeychainAvailable(e) {
  if (e === NO_KEYCHAIN)
    throw (
      logFeatureSad("device_key_store", "no_keychain"),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "deviceRegistry: this account has no login keychain to hold a device key",
        "deviceRegistry: no login keychain",
        "no_keychain",
      )
    );
  throw (
    logFeatureSad("device_key_store", "item_read_failed"),
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "deviceRegistry: the device-key store could not be read",
      "deviceRegistry: device-key store unreadable",
      "key_store_unreadable",
    )
  );
}
//@ chunk-x58vpmpd.js:7174-7729 placement
async function loadDeviceKey(e, r) {
  if (r?.inMemory !== !0) {
    let read = await K().read();
    if (isStorageUnavailable(read)) return assertKeychainAvailable(read);
    let s = deviceKeyEntry(read, e);
    if (s && parseDeviceKeyPrivateKey(s)) return { location: "item", stored: s };
  }
  let n = getSecureStorage();
  for (let i of [{ inaccessibleAs: "failure" }, void 0]) {
    let s = await (n.readAsyncStrict?.(r, i) ?? n.readAsync(r));
    if (s === READ_FAILED)
      throw (
        logFeatureSad("device_key_store", "legacy_read_failed"),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "deviceRegistry: the credentials store could not be read for a device key",
          "deviceRegistry: credentials store unreadable",
          "key_store_unreadable",
        )
      );
    let a = s?.coworkRemoteDevice?.[e];
    if (a && parseDeviceKeyPrivateKey(a)) return { location: "legacy", stored: a };
  }
  return;
}
//@ chunk-x58vpmpd.js:7729-8371 placement
async function createDeviceKey(e, r, n) {
  let i,
    s = K();
  try {
    i = await s.withWriteLock(async () => {
      let read = await s.read();
      if (isStorageUnavailable(read))
        return keepDeviceKeyInLegacyStore(e, read === NO_KEYCHAIN ? "no_keychain" : "item_read_failed");
      if (deviceKeyEntry(read, e) === void 0) {
        if (!(await s.write({ ...read, keys: { ...read?.keys, [e]: r } })))
          return keepDeviceKeyInLegacyStore(e, "item_write_failed");
      }
      let read_2 = await s.read(),
        y = isStorageUnavailable(read_2) ? void 0 : deviceKeyEntry(read_2, e);
      if (y === void 0) return keepDeviceKeyInLegacyStore(e, "readback_mismatch");
      if (y.privateKeyPkcs8B64 !== r.privateKeyPkcs8B64 || y.rowPk !== r.rowPk)
        return keepDeviceKeyInLegacyStore(e, "readback_foreign_key");
      return "item";
    });
  } catch (error) {
    return (
      logForDebugging(
        `[deviceKey] could not take the device-key lock to move the device key: ${errorMessage(error)}`,
      ),
      keepDeviceKeyInLegacyStore(e, "lock_unavailable")
    );
  }
  if (i === "item") await clearDevicePrivateKey(e, r.privateKeyPkcs8B64, n);
  return i;
}
//@ chunk-x58vpmpd.js:8371-8510 placement
function keepDeviceKeyInLegacyStore(e, r) {
  return (
    H.add(e),
    logForDebugging(`[deviceKey] device key stays in the credentials store for now (${r})`),
    logFeatureSad("device_key_store", r),
    "legacy"
  );
}
//@ chunk-x58vpmpd.js:8510-8948 placement
async function clearDevicePrivateKey(e, r, n) {
  let i = !1;
  try {
    if (
      (
        await getSecureStorage().mutate((a) => {
          if (a.coworkRemoteDevice?.[e]?.privateKeyPkcs8B64 !== r) return a;
          i = !0;
          let { [e]: c, ...y } = a.coworkRemoteDevice;
          return { ...a, coworkRemoteDevice: y };
        }, n)
      ).success
    ) {
      if (i)
        (logForDebugging("[deviceKey] moved the device key out of the credentials store into its own item"),
          logFeatureOk("device_key_store"));
      return;
    }
  } catch (error) {
    logForDebugging(`[deviceKey] could not clear the legacy device key: ${errorMessage(error)}`);
  }
  keepDeviceKeyInLegacyStore(e, "legacy_delete_failed");
}
//@ chunk-x58vpmpd.js:8948-9159 placement
function parseDeviceKeyPrivateKey(e) {
  try {
    let r = createPrivateKey({
      key: Buffer.from(e.privateKeyPkcs8B64, "base64"),
      format: "der",
      type: "pkcs8",
    });
    return r.asymmetricKeyType === "ec" && r.asymmetricKeyDetails?.namedCurve === "prime256v1" ? r : void 0;
  } catch {
    return;
  }
}
//@ chunk-x58vpmpd.js:9159-9538 placement
function deviceKeyInfo(e, { location: location, stored: stored }, i, s) {
  return {
    rowPk: stored.rowPk,
    publicKeySpkiB64: createPublicKey(i).export({ type: "spki", format: "der" }).toString("base64"),
    sign: async (a) => sign("sha256", a, { key: i, dsaEncoding: "ieee-p1363" }),
    setRowPk: (a) =>
      migrateLegacyDeviceKey(
        e,
        { location: location, stored: stored },
        (c) => {
          if (c.rowPk === a) return c;
          if (a === void 0) {
            let { rowPk: rowPk, ...l } = c;
            return l;
          }
          return { ...c, rowPk: a };
        },
        s,
      ),
    drop: () => Y(e, { location: location, stored: stored }, s),
  };
}
//@ chunk-x58vpmpd.js:9538-10366 placement
async function migrateLegacyDeviceKey(e, { location: location, stored: stored }, i, s) {
  if (location === "legacy") {
    await getSecureStorage().mutate((c) => {
      let y = c.coworkRemoteDevice?.[e];
      if (y?.privateKeyPkcs8B64 !== stored.privateKeyPkcs8B64) return c;
      let l = i(y);
      if (l === y) return c;
      let { [e]: D, ...P } = c.coworkRemoteDevice ?? {};
      return { ...c, coworkRemoteDevice: l === void 0 ? P : { ...P, [e]: l } };
    }, s);
    return;
  }
  let a = K();
  await a.withWriteLock(async () => {
    let read = await a.read();
    if (isStorageUnavailable(read))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `deviceRegistry: the ${a.name} device-key store could not be read`,
        "deviceRegistry: device-key store unreadable",
      );
    let y = deviceKeyEntry(read, e);
    if (read === null || y?.privateKeyPkcs8B64 !== stored.privateKeyPkcs8B64) return;
    let l = i(y);
    if (l === y) return;
    let { [e]: D, ...P } = read.keys;
    if (!(await a.write({ ...read, keys: l === void 0 ? P : { ...P, [e]: l } })))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `deviceRegistry: the ${a.name} device-key store refused the write`,
        "deviceRegistry: device-key store write refused",
      );
  });
}
//@ chunk-x58vpmpd.js:10366-10413 placement
function Y(e, r, n) {
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
