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
function isDeviceOwnedHook(hook) {
  return (
    typeof hook === "object" && hook !== null && "deviceOwner" in hook && typeof hook.deviceOwner === "string"
  );
}
//@ chunk-s61vbvea.js:326504-326633 placement
function isDeviceHookOfKind(hook, owner, kind) {
  if (!isDeviceOwnedHook(hook) || hook.deviceOwner !== owner) return false;
  let isTemplate = hook.deviceTemplate !== undefined;
  return kind === "both" || (kind === "templates") === isTemplate;
}
//@ chunk-s61vbvea.js:326633-326871 placement
function replaceRegisteredHooks(reject, next) {
  let current = getRegisteredHooks() ?? {};
  let merged = {};
  for (let [key, value] of Object.entries(current)) {
    let filtered = (value ?? []).filter(reject);
    if (filtered.length > 0) merged[key] = filtered;
  }
  for (let [key, value] of Object.entries(next))
    if (value !== undefined && value.length > 0) merged[key] = [...(merged[key] ?? []), ...value];
  clearRegisteredHooks();
  if (Object.keys(merged).length > 0) registerHookCallbacks(merged);
}
//@ chunk-s61vbvea.js:326871-327228 placement
/**
 * 把来自设备的钩子回调注册为本进程的回调钩子（标记 deviceOwner，模板钩子附 deviceTemplate），先移除该设备同类的旧注册。
 */
function registerDeviceHookCallbacks(owner, hooks, kind, templateIdFor) {
  let next = {};
  for (let [key, value] of Object.entries(hooks)) {
    if (!isMatcherEvent(key)) continue;
    next[key] = (value ?? []).map((group) => ({
      ...{
        ...(group.matcher !== undefined && {
          matcher: group.matcher,
        }),
        hooks: group.hooks.map(({ callback, timeout }) => ({
          type: "callback",
          callback,
          ...(timeout !== undefined && {
            timeout,
          }),
        })),
      },
      deviceOwner: owner,
      ...(kind === "templates" && {
        deviceTemplate: templateIdFor?.(key, group) ?? "template",
      }),
    }));
  }
  replaceRegisteredHooks((hook) => !isDeviceHookOfKind(hook, owner, kind), next);
}
//@ chunk-s61vbvea.js:327228-327269 placement
/**
 * 注销设备钩子回调（按类型移除注册）。
 */
function unregisterDeviceHookCallbacks(owner, kind) {
  replaceRegisteredHooks((hook) => !isDeviceHookOfKind(hook, owner, kind), {});
}
export { isDeviceOwnedHook, registerDeviceHookCallbacks, unregisterDeviceHookCallbacks };
