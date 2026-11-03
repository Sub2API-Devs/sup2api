/**
 * utils/hooks/deviceHooks/consent.ts
 *
 * 设备钩子同意状态（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (17)
 * attribution: placement 17
 */
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
} from "path";
import { hostname } from "os";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, T, U, o } from "../../../../vendor/zod/v4/classic/schemas.js";
import { STORAGE_SPACES } from "../../storage/storageSpaces.js";
import { getClaudeConfigDir } from "../../envUtils.js";
import { jsonParse, jsonStringify } from "../../slowOperations.js";
import { getFileReader } from "../../fileStore.js";
import { isENOENT } from "../../errors.js";
import { createSignal } from "../../signal.js";
import { logForDebugging } from "../../debug.js";
import { m_ } from "../../settings/stickyRoots.js";

//@ chunk-s61vbvea.js:336423-336542 placement
var deviceHooksConsentSchema = DoctorLazy(() =>
    u({ version: T(1), choice: U(["accepted", "declined"]), decidedAt: o(), hostname: o() }),
  ),
  DEVICE_HOOKS_CONSENT = "device-hooks-consent";
//@ chunk-s61vbvea.js:336542-336576 placement
function o_() {
  return STORAGE_SPACES.state(DEVICE_HOOKS_CONSENT);
}
//@ chunk-s61vbvea.js:336576-336628 placement
function $Ne() {
  return join_10(getClaudeConfigDir(), "state", `${DEVICE_HOOKS_CONSENT}.json`);
}
//@ chunk-s61vbvea.js:336628-336827 placement
async function readDeviceHooksConsentChoice(e) {
  try {
    let text = await e.readText();
    if (text === void 0) return "unset";
    let safeParse = deviceHooksConsentSchema().safeParse(jsonParse(text));
    return safeParse.success && safeParse.data.hostname === e.hostname() ? safeParse.data.choice : "unset";
  } catch {
    return "unset";
  }
}
//@ chunk-s61vbvea.js:336827-336989 placement
async function writeDeviceHooksConsent(e, n) {
  try {
    return (
      await n.writeText(
        jsonStringify(
          { version: 1, choice: e, decidedAt: n.now().toISOString(), hostname: n.hostname() },
          null,
          2,
        ) +
          `
`,
      ),
      !0
    );
  } catch {
    return !1;
  }
}
//@ chunk-s61vbvea.js:336989-337427 placement
function readDeviceHooksConsent(e) {
  return {
    readText: async () => {
      if (e) {
        let text = await e.readText([o_()]);
        if (!text.ok) throw Error("device-hooks consent read failed");
        let r = text.value.items[0];
        return r.found ? r.value : void 0;
      }
      return getFileReader().read($Ne());
    },
    writeText: async (n) => {
      if (e) {
        if (!(await e.write(o_(), n, { mode: 384 })).ok) throw Error("device-hooks consent write failed");
        return;
      }
      let r = $Ne();
      (await getFileReader().mkdir(dirname_3(r)), await getFileReader().atomicWrite(r, n, 384));
    },
    now: () => new Date(),
    hostname: hostname,
  };
}
//@ chunk-s61vbvea.js:337427-337473 placement
function a_() {
  return { current: null, noticed: !1 };
}
//@ chunk-s61vbvea.js:337473-337543 placement
function zVo(e, n) {
  e.current = { value: Promise.resolve(n), origin: "given" };
}
//@ chunk-s61vbvea.js:337543-337636 placement = isFileReadDenied (1)
function isFileReadDenied(filePath, toolPermissionContext) {
  if (filePath.current === null)
    filePath.current = { value: readDeviceHooksConsentChoice(toolPermissionContext), origin: "read" };
  return filePath.current;
}
//@ chunk-s61vbvea.js:337636-337901 placement
async function resolveStoredConsent(e, n) {
  let r = await readPinnedConsent(e, n);
  if (r.stored !== "accepted" || r.origin !== "read") return r;
  let s = await readDeclinedConsent(n);
  if (e.current?.origin === "given") return readPinnedConsent(e, n);
  if (s === null) return r;
  return ((e.current = { value: Promise.resolve(s), origin: "read" }), { stored: s, origin: "read" });
}
//@ chunk-s61vbvea.js:337901-338135 placement
async function readDeclinedConsent(e) {
  try {
    let text = await e.readText();
    if (text === void 0) return "unset";
    let safeParse = deviceHooksConsentSchema().safeParse(jsonParse(text));
    return safeParse.success &&
      safeParse.data.hostname === e.hostname() &&
      safeParse.data.choice === "declined"
      ? "declined"
      : null;
  } catch (error) {
    return isENOENT(error) ? "unset" : null;
  }
}
//@ chunk-s61vbvea.js:338135-338263 placement
async function readPinnedConsent(e, n) {
  let r = isFileReadDenied(e, n),
    s = await r.value.catch(() => "unset");
  return e.current === r ? { stored: s, origin: r.origin } : readPinnedConsent(e, n);
}
//@ chunk-s61vbvea.js:338263-338289 placement
function l_() {
  return createSignal();
}
//@ chunk-s61vbvea.js:338289-338434 placement
function emitConsentChangedSafe(e, n) {
  try {
    e.emit(n);
  } catch (error) {
    logForDebugging(
      `[deviceHooks] a consent listener failed: ${error instanceof Error ? error.message : String(error)}`,
      { level: "warn" },
    );
  }
}
//@ chunk-s61vbvea.js:338434-338474 placement
function VZs(e, n) {
  return e.subscribe(n);
}
//@ chunk-s61vbvea.js:338474-339022 placement
function resolveDeviceHooksConsent({
  deps: deps,
  pin: pin,
  onNotAsked: onNotAsked,
  isStoreInReach: isStoreInReach,
  onUntrustedStore: onUntrustedStore,
}) {
  let y = !1;
  return async (S, w, R) => {
    let x = S === null && pin.current === null ? await readDeviceHooksConsentChoice(deps) : null,
      { stored: stored, origin: origin } =
        x !== null && pin.current === null
          ? { stored: x, origin: "read" }
          : await resolveStoredConsent(pin, deps);
    if (stored !== "unset" && origin === "read") {
      let G = await Promise.resolve()
        .then(() => isStoreInReach?.(R) ?? !1)
        .catch(() => "unresolvable");
      if (G !== !1) {
        if (S !== null && !y) ((y = !0), onUntrustedStore?.(G));
        if (G === "unresolvable") return "distrusted";
      } else return stored;
    } else if (stored !== "unset") return stored;
    if (S !== null && !w.aborted && !pin.noticed) ((pin.noticed = !0), onNotAsked?.(S));
    return "not_now";
  };
}
//@ chunk-s61vbvea.js:339022-339130 placement
async function mKt(e, n, r) {
  try {
    let s = await r(e);
    return m_([e, s], n) ? "writable" : !1;
  } catch {
    return "unresolvable";
  }
}

export {
  $Ne,
  readDeviceHooksConsent,
  resolveStoredConsent,
  mKt,
  zVo,
  emitConsentChangedSafe,
  writeDeviceHooksConsent,
  readDeviceHooksConsentChoice,
  resolveDeviceHooksConsent,
  VZs,
  a_,
  l_,
};
