/**
 * utils/hooks/deviceHooks/consent.ts
 *
 * 设备钩子同意状态（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (17)
 * attribution: placement 17
 */
import { join, dirname } from "path";
import { hostname } from "os";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { objectSchema, literal, _enum, stringSchema } from "../../../../vendor/zod/v4/classic/schemas.js";
import { STORAGE_SPACES } from "../../storage/storageSpaces.js";
import { getClaudeConfigDir } from "../../markdownConfigLoader.js";
import { jsonParse, jsonStringify } from "../../slowOperations.js";
import { getFileReader } from "../../fileStore.js";
import { isENOENT } from "../../errors.js";
import { createSignal } from "../../signal.js";
import { logForDebugging } from "../../debug.js";
import { anyPairMatches } from "../../settings/stickyRoots.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:261063-261182 placement
var deviceHooksConsentSchema; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var DEVICE_HOOKS_CONSENT;
deferInit("chunk-7jxyna5q.js:261063", () => {
  deviceHooksConsentSchema = DoctorLazy(() =>
    objectSchema({
      version: literal(1),
      choice: _enum(["accepted", "declined"]),
      decidedAt: stringSchema(),
      hostname: stringSchema(),
    }),
  );
  DEVICE_HOOKS_CONSENT = "device-hooks-consent";
});
//@ chunk-7jxyna5q.js:261182-261216 placement
function deviceHooksConsentSpace() {
  return STORAGE_SPACES.state(DEVICE_HOOKS_CONSENT);
}
//@ chunk-7jxyna5q.js:261216-261268 placement
/**
 * 设备钩子同意状态的磁盘路径（<config>/state/<name>.json）。
 */
function deviceHooksConsentPath() {
  return join(getClaudeConfigDir(), "state", `${DEVICE_HOOKS_CONSENT}.json`);
}
//@ chunk-7jxyna5q.js:261268-261467 placement
async function readDeviceHooksConsentChoice(deps) {
  try {
    let text = await deps.readText();
    if (text === undefined) return "unset";
    let parsed = deviceHooksConsentSchema().safeParse(jsonParse(text));
    return parsed.success && parsed.data.hostname === deps.hostname() ? parsed.data.choice : "unset";
  } catch {
    return "unset";
  }
}
//@ chunk-7jxyna5q.js:261467-261629 placement
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
//@ chunk-7jxyna5q.js:261629-262067 placement
function readDeviceHooksConsent(storageV5) {
  return {
    readText: async () => {
      if (storageV5) {
        let text = await storageV5.readText([deviceHooksConsentSpace()]);
        if (!text.ok) throw Error("device-hooks consent read failed");
        let item = text.value.items[0];
        return item.found ? item.value : undefined;
      }
      return getFileReader().read(deviceHooksConsentPath());
    },
    writeText: async (text) => {
      if (storageV5) {
        if (
          !(
            await storageV5.write(deviceHooksConsentSpace(), text, {
              mode: 384,
            })
          ).ok
        )
          throw Error("device-hooks consent write failed");
        return;
      }
      let path = deviceHooksConsentPath();
      await getFileReader().mkdir(dirname(path));
      await getFileReader().atomicWrite(path, text, 384);
    },
    now: () => new Date(),
    hostname,
  };
}
//@ chunk-7jxyna5q.js:262067-262113 placement
/**
 * 空的同意状态（无当前值、未提示过）。
 */
function emptyConsentState() {
  return {
    current: null,
    noticed: false,
  };
}
//@ chunk-7jxyna5q.js:262113-262183 placement
/**
 * 把同意值设为"已给定"（包装为 Promise）。
 */
function setConsentFromGiven(consentPin, choice) {
  consentPin.current = {
    value: Promise.resolve(choice),
    origin: "given",
  };
}
//@ chunk-7jxyna5q.js:262183-262276 placement (2.1.88 match: isFileReadDenied, 1)
function isFileReadDenied(filePath, toolPermissionContext) {
  if (filePath.current === null)
    filePath.current = {
      value: readDeviceHooksConsentChoice(toolPermissionContext),
      origin: "read",
    };
  return filePath.current;
}
//@ chunk-7jxyna5q.js:262276-262541 placement
async function resolveStoredConsent(pin, deps) {
  let pinnedConsent = await readPinnedConsent(pin, deps);
  if (pinnedConsent.stored !== "accepted" || pinnedConsent.origin !== "read") return pinnedConsent;
  let declinedConsent = await readDeclinedConsent(deps);
  if (pin.current?.origin === "given") return readPinnedConsent(pin, deps);
  if (declinedConsent === null) return pinnedConsent;
  pin.current = {
    value: Promise.resolve(declinedConsent),
    origin: "read",
  };
  return {
    stored: declinedConsent,
    origin: "read",
  };
}
//@ chunk-7jxyna5q.js:262541-262775 placement
async function readDeclinedConsent(deps) {
  try {
    let text = await deps.readText();
    if (text === undefined) return "unset";
    let parsed = deviceHooksConsentSchema().safeParse(jsonParse(text));
    return parsed.success && parsed.data.hostname === deps.hostname() && parsed.data.choice === "declined"
      ? "declined"
      : null;
  } catch (error) {
    return isENOENT(error) ? "unset" : null;
  }
}
//@ chunk-7jxyna5q.js:262775-262903 placement
async function readPinnedConsent(filePath, toolPermissionContext) {
  let pinned = isFileReadDenied(filePath, toolPermissionContext);
  let stored = await pinned.value.catch(() => "unset");
  return filePath.current === pinned
    ? {
        stored,
        origin: pinned.origin,
      }
    : readPinnedConsent(filePath, toolPermissionContext);
}
//@ chunk-7jxyna5q.js:262903-262929 placement
/**
 * 创建一个同意变更信号。
 */
function createConsentSignal() {
  return createSignal();
}
//@ chunk-7jxyna5q.js:262929-263074 placement
function emitConsentChangedSafe(consentAnnounced, choice) {
  try {
    consentAnnounced.emit(choice);
  } catch (error) {
    logForDebugging(
      `[deviceHooks] a consent listener failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "warn",
      },
    );
  }
}
//@ chunk-7jxyna5q.js:263074-263114 placement
/**
 * 订阅同意变更。
 */
function subscribeConsent(consentAnnounced, listener) {
  return consentAnnounced.subscribe(listener);
}
//@ chunk-7jxyna5q.js:263114-263662 placement
function resolveDeviceHooksConsent({ deps, pin, onNotAsked, isStoreInReach, onUntrustedStore }) {
  let untrustedNoted = false;
  return async (offered, signal, roots) => {
    let orderChoice =
      offered === null && pin.current === null ? await readDeviceHooksConsentChoice(deps) : null;
    let { stored, origin } =
      orderChoice !== null && pin.current === null
        ? {
            stored: orderChoice,
            origin: "read",
          }
        : await resolveStoredConsent(pin, deps);
    if (stored !== "unset" && origin === "read") {
      let reach = await Promise.resolve()
        .then(() => isStoreInReach?.(roots) ?? false)
        .catch(() => "unresolvable");
      if (reach !== false) {
        if (offered !== null && !untrustedNoted) {
          untrustedNoted = true;
          onUntrustedStore?.(reach);
        }
        if (reach === "unresolvable") return "distrusted";
      } else return stored;
    } else if (stored !== "unset") return stored;
    if (offered !== null && !signal.aborted && !pin.noticed) {
      pin.noticed = true;
      onNotAsked?.(offered);
    }
    return "not_now";
  };
}
//@ chunk-7jxyna5q.js:263662-263770 placement
/**
 * 探测某路径对云会话是否可写（可写 / false / unresolvable）。
 */
async function probeWritability(path, roots, realpath) {
  try {
    let realPath = await realpath(path);
    return anyPairMatches([path, realPath], roots) ? "writable" : false;
  } catch {
    return "unresolvable";
  }
}
export {
  probeWritability,
  resolveDeviceHooksConsent,
  readDeviceHooksConsent,
  deviceHooksConsentPath,
  subscribeConsent,
  resolveStoredConsent,
  setConsentFromGiven,
  emitConsentChangedSafe,
  writeDeviceHooksConsent,
  emptyConsentState,
  createConsentSignal,
  readDeviceHooksConsentChoice,
};
