/**
 * utils/hooks/deviceHooks/templates.ts
 *
 * 设备钩子模板（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (5)
 * attribution: placement 5
 */
import { getRegisteredHooks, clearRegisteredHooks, registerHookCallbacks } from "../../../bootstrap/state.js";
import { isMatcherEvent } from "../hookEventSets.js";

//@ chunk-s61vbvea.js:326399-326504 placement
function isDeviceOwnedHook(e) {
  return typeof e === "object" && e !== null && "deviceOwner" in e && typeof e.deviceOwner === "string";
}
//@ chunk-s61vbvea.js:326504-326633 placement
function isDeviceHookOfKind(e, n, r) {
  if (!isDeviceOwnedHook(e) || e.deviceOwner !== n) return false;
  let s = e.deviceTemplate !== undefined;
  return r === "both" || (r === "templates") === s;
}
//@ chunk-s61vbvea.js:326633-326871 placement
function replaceRegisteredHooks(e, n) {
  let r = getRegisteredHooks() ?? {};
  let s = {};
  for (let [key, value] of Object.entries(r)) {
    let filtered = (value ?? []).filter(e);
    if (filtered.length > 0) s[key] = filtered;
  }
  for (let [key, value] of Object.entries(n))
    if (value !== undefined && value.length > 0) s[key] = [...(s[key] ?? []), ...value];
  clearRegisteredHooks();
  if (Object.keys(s).length > 0) registerHookCallbacks(s);
}
//@ chunk-s61vbvea.js:326871-327228 placement
/**
 * 把来自设备的钩子回调注册为本进程的回调钩子（标记 deviceOwner，模板钩子附 deviceTemplate），先移除该设备同类的旧注册。
 */
function registerDeviceHookCallbacks(e, n, r, s) {
  let h = {};
  for (let [key, value] of Object.entries(n)) {
    if (!isMatcherEvent(key)) continue;
    h[key] = (value ?? []).map((w) => ({
      ...{
        ...(w.matcher !== undefined && {
          matcher: w.matcher,
        }),
        hooks: w.hooks.map(({ callback, timeout }) => ({
          type: "callback",
          callback,
          ...(timeout !== undefined && {
            timeout,
          }),
        })),
      },
      deviceOwner: e,
      ...(r === "templates" && {
        deviceTemplate: s?.(key, w) ?? "template",
      }),
    }));
  }
  replaceRegisteredHooks((y) => !isDeviceHookOfKind(y, e, r), h);
}
//@ chunk-s61vbvea.js:327228-327269 placement
/**
 * 注销设备钩子回调（按类型移除注册）。
 */
function unregisterDeviceHookCallbacks(e, n) {
  replaceRegisteredHooks((r) => !isDeviceHookOfKind(r, e, n), {});
}
export { isDeviceOwnedHook, registerDeviceHookCallbacks, unregisterDeviceHookCallbacks };
