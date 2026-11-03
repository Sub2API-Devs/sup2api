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
import { hee } from "../hookEventSets.js";

//@ chunk-s61vbvea.js:326399-326504 placement
function isDeviceOwnedHook(e) {
  return typeof e === "object" && e !== null && "deviceOwner" in e && typeof e.deviceOwner === "string";
}
//@ chunk-s61vbvea.js:326504-326633 placement
function isDeviceHookOfKind(e, n, r) {
  if (!isDeviceOwnedHook(e) || e.deviceOwner !== n) return !1;
  let s = e.deviceTemplate !== void 0;
  return r === "both" || (r === "templates") === s;
}
//@ chunk-s61vbvea.js:326633-326871 placement
function replaceRegisteredHooks(e, n) {
  let r = getRegisteredHooks() ?? {},
    s = {};
  for (let [h, y] of Object.entries(r)) {
    let filtered = (y ?? []).filter(e);
    if (filtered.length > 0) s[h] = filtered;
  }
  for (let [h, y] of Object.entries(n)) if (y !== void 0 && y.length > 0) s[h] = [...(s[h] ?? []), ...y];
  if ((clearRegisteredHooks(), Object.keys(s).length > 0)) registerHookCallbacks(s);
}
/**
 * 把来自设备的钩子回调注册为本进程的回调钩子（标记 deviceOwner，模板钩子附 deviceTemplate），先移除该设备同类的旧注册。
 */
//@ chunk-s61vbvea.js:326871-327228 placement
function registerDeviceHookCallbacks(e, n, r, s) {
  let h = {};
  for (let [y, S] of Object.entries(n)) {
    if (!hee(y)) continue;
    h[y] = (S ?? []).map((w) => ({
      ...{
        ...(w.matcher !== void 0 && { matcher: w.matcher }),
        hooks: w.hooks.map(({ callback: callback, timeout: timeout }) => ({
          type: "callback",
          callback: callback,
          ...(timeout !== void 0 && { timeout: timeout }),
        })),
      },
      deviceOwner: e,
      ...(r === "templates" && { deviceTemplate: s?.(y, w) ?? "template" }),
    }));
  }
  replaceRegisteredHooks((y) => !isDeviceHookOfKind(y, e, r), h);
}
//@ chunk-s61vbvea.js:327228-327269 placement
function der(e, n) {
  replaceRegisteredHooks((r) => !isDeviceHookOfKind(r, e, n), {});
}

export { isDeviceOwnedHook, registerDeviceHookCallbacks, der };
