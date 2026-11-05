/**
 * utils/hooks/worktreeHooks.ts
 *
 * WorktreeCreate 钩子检测（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (3)
 * attribution: placement 3
 */
import { filterHooksByManagedHold } from "./managedHooksOnly.js";
import { getHooksForEvent } from "../hooks.js";

//@ chunk-7jxyna5q.js:350392-350444 placement
function hasWorktreeCreateHook() {
  return hooksForEventFiltered("WorktreeCreate").length > 0;
}
//@ chunk-7jxyna5q.js:350444-350496 placement
function hasWorktreeRemoveHook() {
  return hooksForEventFiltered("WorktreeRemove").length > 0;
}
//@ chunk-7jxyna5q.js:350496-350536 placement
function hooksForEventFiltered(event) {
  return filterHooksByManagedHold([...getHooksForEvent(event)], event);
}
export { hasWorktreeRemoveHook, hasWorktreeCreateHook };
