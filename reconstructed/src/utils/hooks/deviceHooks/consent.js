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
import { join, dirname } from "path";
import { hostname } from "os";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, literal, _enum, string } from "../../../../vendor/zod/v4/classic/schemas.js";
import { STORAGE_SPACES } from "../../storage/storageSpaces.js";
import { getClaudeConfigDir } from "../../envUtils.js";
import { jsonParse, jsonStringify } from "../../slowOperations.js";
import { getFileReader } from "../../fileStore.js";
import { isENOENT } from "../../errors.js";
import { createSignal } from "../../signal.js";
import { logForDebugging } from "../../debug.js";
import { anyPairMatches } from "../../settings/stickyRoots.js";

//@ chunk-s61vbvea.js:336423-336542 placement
var deviceHooksConsentSchema = DoctorLazy(() =>
  u({
    version: literal(1),
    choice: _enum(["accepted", "declined"]),
    decidedAt: string(),
    hostname: string(),
  }),
);
var DEVICE_HOOKS_CONSENT = "device-hooks-consent";
//@ chunk-s61vbvea.js:336542-336576 placement
function deviceHooksConsentSpace() {
  return STORAGE_SPACES.state(DEVICE_HOOKS_CONSENT);
}
//@ chunk-s61vbvea.js:336576-336628 placement
/**
 * 设备钩子同意状态的磁盘路径（<config>/state/<name>.json）。
 */
function deviceHooksConsentPath() {
  return join(getClaudeConfigDir(), "state", `${DEVICE_HOOKS_CONSENT}.json`);
}
//@ chunk-s61vbvea.js:336628-336827 placement
async function readDeviceHooksConsentChoice(e) {
  try {
    let text = await e.readText();
    if (text === undefined) return "unset";
    let r = deviceHooksConsentSchema().safeParse(jsonParse(text));
    return r.success && r.data.hostname === e.hostname() ? r.data.choice : "unset";
  } catch {
    return "unset";
  }
}
//@ chunk-s61vbvea.js:336827-336989 placement
async function writeDeviceHooksConsent(choice, deviceHooksConsent) {
  try {
    await deviceHooksConsent.writeText(
      jsonStringify(
        {
          version: 1,
          choice,
          decidedAt: deviceHooksConsent.now().toISOString(),
          hostname: deviceHooksConsent.hostname(),
        },
        null,
        2,
      ) +
        `
`,
    );
    return true;
  } catch {
    return false;
  }
}
//@ chunk-s61vbvea.js:336989-337427 placement
function readDeviceHooksConsent(storageV5) {
  return {
    readText: async () => {
      if (storageV5) {
        let text = await storageV5.readText([deviceHooksConsentSpace()]);
        if (!text.ok) throw Error("device-hooks consent read failed");
        let r = text.value.items[0];
        return r.found ? r.value : undefined;
      }
      return getFileReader().read(deviceHooksConsentPath());
    },
    writeText: async (n) => {
      if (storageV5) {
        if (
          !(
            await storageV5.write(deviceHooksConsentSpace(), n, {
              mode: 384,
            })
          ).ok
        )
          throw Error("device-hooks consent write failed");
        return;
      }
      let r = deviceHooksConsentPath();
      await getFileReader().mkdir(dirname(r));
      await getFileReader().atomicWrite(r, n, 384);
    },
    now: () => new Date(),
    hostname,
  };
}
//@ chunk-s61vbvea.js:337427-337473 placement
/**
 * 空的同意状态（无当前值、未提示过）。
 */
function emptyConsentState() {
  return {
    current: null,
    noticed: false,
  };
}
//@ chunk-s61vbvea.js:337473-337543 placement
/**
 * 把同意值设为"已给定"（包装为 Promise）。
 */
function setConsentFromGiven(consentPin, n) {
  consentPin.current = {
    value: Promise.resolve(n),
    origin: "given",
  };
}
//@ chunk-s61vbvea.js:337543-337636 placement = isFileReadDenied (1)
function isFileReadDenied(filePath, toolPermissionContext) {
  if (filePath.current === null)
    filePath.current = {
      value: readDeviceHooksConsentChoice(toolPermissionContext),
      origin: "read",
    };
  return filePath.current;
}
//@ chunk-s61vbvea.js:337636-337901 placement
async function resolveStoredConsent(e, n) {
  let pinnedConsent = await readPinnedConsent(e, n);
  if (pinnedConsent.stored !== "accepted" || pinnedConsent.origin !== "read") return pinnedConsent;
  let declinedConsent = await readDeclinedConsent(n);
  if (e.current?.origin === "given") return readPinnedConsent(e, n);
  if (declinedConsent === null) return pinnedConsent;
  e.current = {
    value: Promise.resolve(declinedConsent),
    origin: "read",
  };
  return {
    stored: declinedConsent,
    origin: "read",
  };
}
//@ chunk-s61vbvea.js:337901-338135 placement
async function readDeclinedConsent(e) {
  try {
    let text = await e.readText();
    if (text === undefined) return "unset";
    let r = deviceHooksConsentSchema().safeParse(jsonParse(text));
    return r.success && r.data.hostname === e.hostname() && r.data.choice === "declined" ? "declined" : null;
  } catch (error) {
    return isENOENT(error) ? "unset" : null;
  }
}
//@ chunk-s61vbvea.js:338135-338263 placement
async function readPinnedConsent(filePath, toolPermissionContext) {
  let r = isFileReadDenied(filePath, toolPermissionContext);
  let stored = await r.value.catch(() => "unset");
  return filePath.current === r
    ? {
        stored,
        origin: r.origin,
      }
    : readPinnedConsent(filePath, toolPermissionContext);
}
//@ chunk-s61vbvea.js:338263-338289 placement
/**
 * 创建一个同意变更信号。
 */
function createConsentSignal() {
  return createSignal();
}
//@ chunk-s61vbvea.js:338289-338434 placement
function emitConsentChangedSafe(consentAnnounced, n) {
  try {
    consentAnnounced.emit(n);
  } catch (error) {
    logForDebugging(
      `[deviceHooks] a consent listener failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "warn",
      },
    );
  }
}
//@ chunk-s61vbvea.js:338434-338474 placement
/**
 * 订阅同意变更。
 */
function subscribeConsent(consentAnnounced, n) {
  return consentAnnounced.subscribe(n);
}
//@ chunk-s61vbvea.js:338474-339022 placement
function resolveDeviceHooksConsent({ deps, pin, onNotAsked, isStoreInReach, onUntrustedStore }) {
  let y = false;
  return async (S, w, R) => {
    let x = S === null && pin.current === null ? await readDeviceHooksConsentChoice(deps) : null;
    let { stored, origin } =
      x !== null && pin.current === null
        ? {
            stored: x,
            origin: "read",
          }
        : await resolveStoredConsent(pin, deps);
    if (stored !== "unset" && origin === "read") {
      let G = await Promise.resolve()
        .then(() => isStoreInReach?.(R) ?? false)
        .catch(() => "unresolvable");
      if (G !== false) {
        if (S !== null && !y) {
          y = true;
          onUntrustedStore?.(G);
        }
        if (G === "unresolvable") return "distrusted";
      } else return stored;
    } else if (stored !== "unset") return stored;
    if (S !== null && !w.aborted && !pin.noticed) {
      pin.noticed = true;
      onNotAsked?.(S);
    }
    return "not_now";
  };
}
//@ chunk-s61vbvea.js:339022-339130 placement
/**
 * 探测某路径对云会话是否可写（可写 / false / unresolvable）。
 */
async function probeWritability(e, n, realpath) {
  try {
    let s = await realpath(e);
    return anyPairMatches([e, s], n) ? "writable" : false;
  } catch {
    return "unresolvable";
  }
}
export {
  deviceHooksConsentPath,
  readDeviceHooksConsent,
  resolveStoredConsent,
  probeWritability,
  setConsentFromGiven,
  emitConsentChangedSafe,
  writeDeviceHooksConsent,
  readDeviceHooksConsentChoice,
  resolveDeviceHooksConsent,
  subscribeConsent,
  emptyConsentState,
  createConsentSignal,
};
