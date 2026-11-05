/**
 * utils/hooks/deviceHookId.ts
 *
 * 2.1.316 新增：解析设备 hook id（实例、事件、序号）；取主机名首段（截断）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9bhqgb7h.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { hostname } from "os";
import { randomBytes } from "crypto";
import { deviceSlugOrFallback } from "../../bridge/deviceRegistration.js";

//@ chunk-9bhqgb7h.js:295-494 placement
var DEVICE_INSTANCE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
var HOOK_EVENT_RE = /^[A-Za-z]{1,64}$/;
var DEVICE_HOOK_ID_RE = /^([A-Za-z0-9][A-Za-z0-9._-]{0,63})\/([A-Za-z]{1,64})\/(\d{1,4})$/;
var DEVICE_INSTANCE_RANDOM_BYTES = 8;
var MAX_HOSTNAME_CHARS = 64;
var MAX_HOOK_INDEX = 9999;
var defaultDeviceIdDeps = {
  hostname,
  randomHex: (randomHex) => randomBytes(randomHex).toString("hex"),
};
//@ chunk-9bhqgb7h.js:494-542 placement
/**
 * 生成新的设备实例 id（dev-<随机十六进制>）。
 */
function newDeviceInstanceId(deps = defaultDeviceIdDeps) {
  return `dev-${deps.randomHex(DEVICE_INSTANCE_RANDOM_BYTES)}`;
}
//@ chunk-9bhqgb7h.js:542-610 placement
/**
 * 取主机名首段（截断）。
 */
function shortHostname(deps = defaultDeviceIdDeps) {
  let [firstLabel = ""] = deps.hostname().split(".");
  return deviceSlugOrFallback(firstLabel, MAX_HOSTNAME_CHARS);
}
//@ chunk-9bhqgb7h.js:610-773 placement
function formatDeviceHookId(instanceId, event, index) {
  if (
    !DEVICE_INSTANCE_RE.test(instanceId) ||
    !HOOK_EVENT_RE.test(event) ||
    !Number.isInteger(index) ||
    index < 0 ||
    index > MAX_HOOK_INDEX
  )
    throw Error("cannot form a device hook id from these inputs");
  return `${instanceId}/${event}/${index}`;
}
//@ chunk-9bhqgb7h.js:773-867 placement
/**
 * 解析设备 hook id（实例、事件、序号）。
 */
function parseDeviceHookId(callbackId) {
  let match = DEVICE_HOOK_ID_RE.exec(callbackId);
  return match
    ? {
        instanceId: match[1],
        event: match[2],
        index: Number(match[3]),
      }
    : null;
}
export { formatDeviceHookId, parseDeviceHookId, newDeviceInstanceId, shortHostname };
