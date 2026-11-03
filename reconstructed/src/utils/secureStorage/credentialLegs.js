/**
 * utils/secureStorage/credentialLegs.ts
 *
 * 2.1.316 新增：对凭据对象应用删除函数（需同步返回对象）；严格读取所有凭据存储腿等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (10)
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

//@ chunk-aepeg2w5.js:489436-489476 placement
var ENV_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;
//@ chunk-aepeg2w5.js:489476-489646 placement
/**
 * 格式化名称列表：只列出合法名称，其余计为"及 N 个"；全都不合法时只显示数量。
 */
function formatNameList(e) {
  let filtered = e.filter((s) => ENV_NAME_RE.test(s));
  let r = e.length - filtered.length;
  if (r === 0) return filtered.join(", ");
  return filtered.length === 0 ? `${r} ${plural(r, "name")}` : `${filtered.join(", ")} and ${r} more`;
}
//@ chunk-aepeg2w5.js:489688-489722 placement
function storageMarkersOrName(e) {
  return storageMarker(e) ?? [e];
}
//@ chunk-aepeg2w5.js:489722-490067 placement
/**
 * 在所有凭据存储腿上执行修改。
 */
async function mutateEveryCredentialLeg(e, n, r) {
  let s = storageMarkersOrName(e);
  return withStorageWriteLock(async () => {
    let h = [];
    for (let [y, S] of [...s.entries()].reverse()) {
      let changed = false;
      try {
        let { success, transient } = await S.mutate(
          (P) => {
            let F = removeFromEveryLeg(n, P);
            changed = F !== P;
            return F;
          },
          markerOrValue(e, y, r),
        );
        h[y] = {
          name: S.name,
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
        h[y] = {
          name: S.name,
          error,
        };
      }
    }
    return h;
  });
}
//@ chunk-aepeg2w5.js:490067-490525 placement
/**
 * 严格读取所有凭据存储腿。
 */
async function readEveryCredentialLeg(e, n, credentials) {
  let s = [];
  for (let [h, y] of storageMarkersOrName(e).entries()) {
    let S = markerOrValue(e, h, credentials);
    let w;
    try {
      y.invalidateCache?.();
      w = await (y.readAsyncStrict?.(S, {
        inaccessibleAs: "failure",
        unreadableFileAs: "failure",
        unparsableEntryAs: "failure",
      }) ?? y.readAsync(S));
    } catch (error) {
      logForDebugging(`[secureStorage] strict read of ${y.name} rejected: ${errorMessage(error)}`, {
        level: "warn",
      });
      w = READ_FAILED;
    }
    if (w !== READ_FAILED && w != null && !isPlainObject(w)) w = READ_FAILED;
    s.push({
      name: y.name,
      value:
        w === READ_FAILED
          ? READ_FAILED
          : n(clone((y.osGuarded === true ? w : stripSlackBinding(w ?? null)) ?? {})),
    });
  }
  return s;
}
//@ chunk-aepeg2w5.js:490525-490979 placement
/**
 * 确认凭据已从所有存储移除。
 */
async function confirmCredentialRemoval(secureStorage, n, r) {
  if (
    primarySecureStoreKind() === "keychain" &&
    !r((await secureStorage.readAsync()) ?? {}) &&
    (await secureStorage.readAsyncStrict?.(undefined, {
      inaccessibleAs: "failure",
    })) === READ_FAILED
  )
    return {
      confirmed: false,
      reason: "keychain_unreadable",
    };
  let s;
  try {
    s = (await mutateEveryCredentialLeg(secureStorage, n)).every((y) => !("error" in y) && y.result.success);
  } catch (error) {
    logForDebugging(`[secureStorage] removal refused: ${errorMessage(error)}`, {
      level: "warn",
    });
    s = (await readEveryCredentialLeg(secureStorage, r)).every((S) => S.value === false);
  }
  return s
    ? {
        confirmed: true,
      }
    : {
        confirmed: false,
        reason: "credential_store_failed",
      };
}
//@ chunk-aepeg2w5.js:490979-491882 placement
/**
 * 对凭据对象应用删除函数（需同步返回对象）。
 */
function removeFromEveryLeg(e, n) {
  if (!isPlainObject(n) || Object.keys(n).length === 0) return n;
  let r = e(clone(n));
  if (!isPlainObject(r))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "removeFromEveryLeg: the remove function did not return a plain object (an async function returns a Promise). Nothing was written to this store.",
      "secure storage: a remove function did not return a plain object (caller bug, nothing written)",
    );
  let s = deepCloneJson(n);
  let h = deepCloneJson(r);
  let found = Object.keys(h).find((key) => !Object.hasOwn(s, key));
  if (found !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `removeFromEveryLeg: the remove function added the key "${found}". It may only delete keys. Nothing was written to this store.`,
      "secure storage: a remove function added a key (caller bug, nothing written)",
    );
  if (!isSubsetDeepEqual(s, h))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "removeFromEveryLeg: the remove function added or changed a value. It may only delete keys. Nothing was written to this store.",
      "secure storage: a remove function added or changed a value (caller bug, nothing written)",
    );
  return isDeepStrictEqual(h, s) ? n : h;
}
//@ chunk-aepeg2w5.js:491882-492000 placement
function isSubsetDeepEqual(e, n) {
  if (!isPlainObject(e) || !isPlainObject(n)) return isDeepStrictEqual(e, n);
  return Object.keys(n).every((key) => Object.hasOwn(e, key) && isSubsetDeepEqual(e[key], n[key]));
}
//@ chunk-aepeg2w5.js:492000-492031 placement
function deepCloneJson(e) {
  return jsonParse(jsonStringify(e));
}
//@ chunk-aepeg2w5.js:492031-492087 placement
function markerOrValue(e, n, r) {
  return storageMarker(e) === undefined || n > 0 ? r : undefined;
}
export { confirmCredentialRemoval, formatNameList, mutateEveryCredentialLeg, readEveryCredentialLeg };
