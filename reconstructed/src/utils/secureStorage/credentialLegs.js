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
import { isDeepStrictEqual, isDeepStrictEqual as isDeepStrictEqual_2 } from "util";
import { plural } from "../stringUtils.js";
import { storageMarker, withStorageWriteLock, READ_FAILED, stripSlackBinding } from "./storageWriteLock.js";
import { logForDebugging } from "../debug.js";
import { errorMessage, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { isPlainObject } from "../objectUtils.js";
import { clone, jsonParse, jsonStringify } from "../slowOperations.js";
import { primarySecureStoreKind } from "./index.js";

//@ chunk-aepeg2w5.js:489436-489476 placement
var S$ = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;
/**
 * 格式化名称列表：只列出合法名称，其余计为"及 N 个"；全都不合法时只显示数量。
 */
//@ chunk-aepeg2w5.js:489476-489646 placement
function formatNameList(e) {
  let filtered = e.filter((s) => S$.test(s)),
    r = e.length - filtered.length;
  if (r === 0) return filtered.join(", ");
  return filtered.length === 0 ? `${r} ${plural(r, "name")}` : `${filtered.join(", ")} and ${r} more`;
}
//@ chunk-aepeg2w5.js:489688-489722 placement
function bA(e) {
  return storageMarker(e) ?? [e];
}
/**
 * 在所有凭据存储腿上执行修改。
 */
//@ chunk-aepeg2w5.js:489722-490067 placement
async function mutateEveryCredentialLeg(e, n, r) {
  let s = bA(e);
  return withStorageWriteLock(async () => {
    let h = [];
    for (let [y, S] of [...s.entries()].reverse()) {
      let w = !1;
      try {
        let { success: success, transient: transient } = await S.mutate(
          (P) => {
            let F = removeFromEveryLeg(n, P);
            return ((w = F !== P), F);
          },
          vA(e, y, r),
        );
        h[y] = {
          name: S.name,
          result: transient === void 0 ? { success: success } : { success: success, transient: transient },
          changed: w,
        };
      } catch (error) {
        h[y] = { name: S.name, error: error };
      }
    }
    return h;
  });
}
/**
 * 严格读取所有凭据存储腿。
 */
//@ chunk-aepeg2w5.js:490067-490525 placement
async function readEveryCredentialLeg(e, n, r) {
  let s = [];
  for (let [h, y] of bA(e).entries()) {
    let S = vA(e, h, r),
      w;
    try {
      (y.invalidateCache?.(),
        (w = await (y.readAsyncStrict?.(S, {
          inaccessibleAs: "failure",
          unreadableFileAs: "failure",
          unparsableEntryAs: "failure",
        }) ?? y.readAsync(S))));
    } catch (error) {
      (logForDebugging(`[secureStorage] strict read of ${y.name} rejected: ${errorMessage(error)}`, {
        level: "warn",
      }),
        (w = READ_FAILED));
    }
    if (w !== READ_FAILED && w != null && !isPlainObject(w)) w = READ_FAILED;
    s.push({
      name: y.name,
      value:
        w === READ_FAILED
          ? READ_FAILED
          : n(clone((y.osGuarded === !0 ? w : stripSlackBinding(w ?? null)) ?? {})),
    });
  }
  return s;
}
/**
 * 确认凭据已从所有存储移除。
 */
//@ chunk-aepeg2w5.js:490525-490979 placement
async function confirmCredentialRemoval(e, n, r) {
  if (
    primarySecureStoreKind() === "keychain" &&
    !r((await e.readAsync()) ?? {}) &&
    (await e.readAsyncStrict?.(void 0, { inaccessibleAs: "failure" })) === READ_FAILED
  )
    return { confirmed: !1, reason: "keychain_unreadable" };
  let s;
  try {
    s = (await mutateEveryCredentialLeg(e, n)).every((y) => !("error" in y) && y.result.success);
  } catch (error) {
    (logForDebugging(`[secureStorage] removal refused: ${errorMessage(error)}`, { level: "warn" }),
      (s = (await readEveryCredentialLeg(e, r)).every((S) => S.value === !1)));
  }
  return s ? { confirmed: !0 } : { confirmed: !1, reason: "credential_store_failed" };
}
/**
 * 对凭据对象应用删除函数（需同步返回对象）。
 */
//@ chunk-aepeg2w5.js:490979-491882 placement
function removeFromEveryLeg(e, n) {
  if (!isPlainObject(n) || Object.keys(n).length === 0) return n;
  let r = e(clone(n));
  if (!isPlainObject(r))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "removeFromEveryLeg: the remove function did not return a plain object (an async function returns a Promise). Nothing was written to this store.",
      "secure storage: a remove function did not return a plain object (caller bug, nothing written)",
    );
  let s = hA(n),
    h = hA(r),
    found = Object.keys(h).find((S) => !Object.hasOwn(s, S));
  if (found !== void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `removeFromEveryLeg: the remove function added the key "${found}". It may only delete keys. Nothing was written to this store.`,
      "secure storage: a remove function added a key (caller bug, nothing written)",
    );
  if (!isSubsetDeepEqual(s, h))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "removeFromEveryLeg: the remove function added or changed a value. It may only delete keys. Nothing was written to this store.",
      "secure storage: a remove function added or changed a value (caller bug, nothing written)",
    );
  return isDeepStrictEqual_2(h, s) ? n : h;
}
//@ chunk-aepeg2w5.js:491882-492000 placement
function isSubsetDeepEqual(e, n) {
  if (!isPlainObject(e) || !isPlainObject(n)) return isDeepStrictEqual_2(e, n);
  return Object.keys(n).every((r) => Object.hasOwn(e, r) && isSubsetDeepEqual(e[r], n[r]));
}
//@ chunk-aepeg2w5.js:492000-492031 placement
function hA(e) {
  return jsonParse(jsonStringify(e));
}
//@ chunk-aepeg2w5.js:492031-492087 placement
function vA(e, n, r) {
  return storageMarker(e) === void 0 || n > 0 ? r : void 0;
}

export { confirmCredentialRemoval, formatNameList, mutateEveryCredentialLeg, readEveryCredentialLeg };
