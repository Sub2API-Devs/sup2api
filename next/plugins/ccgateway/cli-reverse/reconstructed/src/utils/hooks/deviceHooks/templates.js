/**
 * utils/hooks/deviceHooks/templates.ts
 *
 * 设备钩子模板（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getRegisteredHooks, clearRegisteredHooks, registerHookCallbacks } from "../../../bootstrap/state.js";
import { isMatcherEvent } from "../hookEventSets.js";

//@ chunk-7jxyna5q.js:250976-251081 placement
function isDeviceOwnedHook(hook) {
  return (
    typeof hook === "object" && hook !== null && "deviceOwner" in hook && typeof hook.deviceOwner === "string"
  );
}
//@ chunk-7jxyna5q.js:251081-251210 placement
function isDeviceHookOfKind(hook, owner, kind) {
  if (!isDeviceOwnedHook(hook) || hook.deviceOwner !== owner) return false;
  let isTemplate = hook.deviceTemplate !== undefined;
  return kind === "both" || (kind === "templates") === isTemplate;
}
//@ chunk-7jxyna5q.js:251210-251448 placement
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
//@ chunk-7jxyna5q.js:251448-251805 placement
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
//@ chunk-7jxyna5q.js:251805-251846 placement
/**
 * 注销设备钩子回调（按类型移除注册）。
 */
function unregisterDeviceHookCallbacks(owner, kind) {
  replaceRegisteredHooks((hook) => !isDeviceHookOfKind(hook, owner, kind), {});
}
export { isDeviceOwnedHook, registerDeviceHookCallbacks, unregisterDeviceHookCallbacks };
