/**
 * utils/hooks/deviceHookId.ts
 *
 * 2.1.316 新增：解析设备 hook id（实例、事件、序号）；取主机名首段（截断）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3jcjkxmq.js (5)
 * attribution: placement 5
 */
import { hostname } from "os";
import { randomBytes } from "crypto";
import { FCt } from "../../bridge/deviceRegistration.js";

//@ chunk-3jcjkxmq.js:295-494 placement
var DEVICE_INSTANCE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/,
  HOOK_EVENT_RE = /^[A-Za-z]{1,64}$/,
  DEVICE_HOOK_ID_RE = /^([A-Za-z0-9][A-Za-z0-9._-]{0,63})\/([A-Za-z]{1,64})\/(\d{1,4})$/,
  DEVICE_INSTANCE_RANDOM_BYTES = 8,
  MAX_HOSTNAME_CHARS = 64,
  MAX_HOOK_INDEX = 9999,
  defaultDeviceIdDeps = { hostname: hostname, randomHex: (n) => randomBytes(n).toString("hex") };
//@ chunk-3jcjkxmq.js:494-542 placement
function XRs(n = defaultDeviceIdDeps) {
  return `dev-${n.randomHex(DEVICE_INSTANCE_RANDOM_BYTES)}`;
}
/**
 * 取主机名首段（截断）。
 */
//@ chunk-3jcjkxmq.js:542-610 placement
function shortHostname(n = defaultDeviceIdDeps) {
  let [t = ""] = n.hostname().split(".");
  return FCt(t, MAX_HOSTNAME_CHARS);
}
//@ chunk-3jcjkxmq.js:610-773 placement
function formatDeviceHookId(n, t, e) {
  if (
    !DEVICE_INSTANCE_RE.test(n) ||
    !HOOK_EVENT_RE.test(t) ||
    !Number.isInteger(e) ||
    e < 0 ||
    e > MAX_HOOK_INDEX
  )
    throw Error("cannot form a device hook id from these inputs");
  return `${n}/${t}/${e}`;
}
/**
 * 解析设备 hook id（实例、事件、序号）。
 */
//@ chunk-3jcjkxmq.js:773-867 placement
function parseDeviceHookId(n) {
  let match = DEVICE_HOOK_ID_RE.exec(n);
  return match ? { instanceId: match[1], event: match[2], index: Number(match[3]) } : null;
}

export { parseDeviceHookId, shortHostname, formatDeviceHookId, XRs };
