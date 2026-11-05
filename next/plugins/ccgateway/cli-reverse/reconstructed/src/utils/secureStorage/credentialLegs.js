/**
 * utils/secureStorage/credentialLegs.ts
 *
 * 2.1.316 新增：对凭据对象应用删除函数（需同步返回对象）；严格读取所有凭据存储腿等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (10)
 * attribution: placement 10
 */
import { isDeepStrictEqual } from "util";
import { plural } from "../stringUtils.js";
import { storageMarker, withStorageWriteLock, READ_FAILED, stripSlackBinding } from "./storageWriteLock.js";
import { logForDebugging } from "../debug.js";
import { errorMessage, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { isPlainObject } from "../objectUtils.js";
import { clone, jsonParse, jsonStringify } from "../slowOperations.js";
import { primarySecureStoreKind } from "./index.js";

//@ chunk-exfmq47h.js:501430-501470 placement
var ENV_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;
//@ chunk-exfmq47h.js:501470-501640 placement
/**
 * 格式化名称列表：只列出合法名称，其余计为"及 N 个"；全都不合法时只显示数量。
 */
function formatNameList(names) {
  let filtered = names.filter((name) => ENV_NAME_RE.test(name));
  let skipped = names.length - filtered.length;
  if (skipped === 0) return filtered.join(", ");
  return filtered.length === 0
    ? `${skipped} ${plural(skipped, "name")}`
    : `${filtered.join(", ")} and ${skipped} more`;
}
//@ chunk-exfmq47h.js:501682-501716 placement
function storageMarkersOrName(name) {
  return storageMarker(name) ?? [name];
}
//@ chunk-exfmq47h.js:501716-502061 placement
/**
 * 在所有凭据存储腿上执行修改。
 */
async function mutateEveryCredentialLeg(name, remove, options) {
  let markers = storageMarkersOrName(name);
  return withStorageWriteLock(async () => {
    let results = [];
    for (let [index, leg] of [...markers.entries()].reverse()) {
      let changed = false;
      try {
        let { success, transient } = await leg.mutate(
          (data) => {
            let next = removeFromEveryLeg(remove, data);
            changed = next !== data;
            return next;
          },
          markerOrValue(name, index, options),
        );
        results[index] = {
          name: leg.name,
          result:
            transient === undefined
              ? {
                  success,
                }
              : {
                  success,
                  transient,
                },
          changed,
        };
      } catch (error) {
        results[index] = {
          name: leg.name,
          error,
        };
      }
    }
    return results;
  });
}
//@ chunk-exfmq47h.js:502061-502519 placement
/**
 * 严格读取所有凭据存储腿。
 */
async function readEveryCredentialLeg(name, mapValue, credentials) {
  let results = [];
  for (let [index, leg] of storageMarkersOrName(name).entries()) {
    let marker = markerOrValue(name, index, credentials);
    let value;
    try {
      leg.invalidateCache?.();
      value = await (leg.readAsyncStrict?.(marker, {
        inaccessibleAs: "failure",
        unreadableFileAs: "failure",
        unparsableEntryAs: "failure",
      }) ?? leg.readAsync(marker));
    } catch (error) {
      logForDebugging(`[secureStorage] strict read of ${leg.name} rejected: ${errorMessage(error)}`, {
        level: "warn",
      });
      value = READ_FAILED;
    }
    if (value !== READ_FAILED && value != null && !isPlainObject(value)) value = READ_FAILED;
    results.push({
      name: leg.name,
      value:
        value === READ_FAILED
          ? READ_FAILED
          : mapValue(clone((leg.osGuarded === true ? value : stripSlackBinding(value ?? null)) ?? {})),
    });
  }
  return results;
}
//@ chunk-exfmq47h.js:502519-502973 placement
/**
 * 确认凭据已从所有存储移除。
 */
async function confirmCredentialRemoval(name, remove, mapValue) {
  if (
    primarySecureStoreKind() === "keychain" &&
    !mapValue((await name.readAsync()) ?? {}) &&
    (await name.readAsyncStrict?.(undefined, {
      inaccessibleAs: "failure",
    })) === READ_FAILED
  )
    return {
      confirmed: false,
      reason: "keychain_unreadable",
    };
  let confirmed;
  try {
    confirmed = (await mutateEveryCredentialLeg(name, remove)).every(
      (result) => !("error" in result) && result.result.success,
    );
  } catch (error) {
    logForDebugging(`[secureStorage] removal refused: ${errorMessage(error)}`, {
      level: "warn",
    });
    confirmed = (await readEveryCredentialLeg(name, mapValue)).every((result) => result.value === false);
  }
  return confirmed
    ? {
        confirmed: true,
      }
    : {
        confirmed: false,
        reason: "credential_store_failed",
      };
}
//@ chunk-exfmq47h.js:502973-503876 placement
/**
 * 对凭据对象应用删除函数（需同步返回对象）。
 */
function removeFromEveryLeg(remove, data) {
  if (!isPlainObject(data) || Object.keys(data).length === 0) return data;
  let next = remove(clone(data));
  if (!isPlainObject(next))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "removeFromEveryLeg: the remove function did not return a plain object (an async function returns a Promise). Nothing was written to this store.",
      "secure storage: a remove function did not return a plain object (caller bug, nothing written)",
    );
  let before = deepCloneJson(data);
  let after = deepCloneJson(next);
  let found = Object.keys(after).find((key) => !Object.hasOwn(before, key));
  if (found !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `removeFromEveryLeg: the remove function added the key "${found}". It may only delete keys. Nothing was written to this store.`,
      "secure storage: a remove function added a key (caller bug, nothing written)",
    );
  if (!isSubsetDeepEqual(before, after))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "removeFromEveryLeg: the remove function added or changed a value. It may only delete keys. Nothing was written to this store.",
      "secure storage: a remove function added or changed a value (caller bug, nothing written)",
    );
  return isDeepStrictEqual(after, before) ? data : after;
}
//@ chunk-exfmq47h.js:503876-503994 placement
function isSubsetDeepEqual(sub, full) {
  if (!isPlainObject(sub) || !isPlainObject(full)) return isDeepStrictEqual(sub, full);
  return Object.keys(full).every((key) => Object.hasOwn(sub, key) && isSubsetDeepEqual(sub[key], full[key]));
}
//@ chunk-exfmq47h.js:503994-504025 placement
function deepCloneJson(value) {
  return jsonParse(jsonStringify(value));
}
//@ chunk-exfmq47h.js:504025-504081 placement
function markerOrValue(name, index, credentials) {
  return storageMarker(name) === undefined || index > 0 ? credentials : undefined;
}
export { readEveryCredentialLeg, confirmCredentialRemoval, mutateEveryCredentialLeg, formatNameList };
