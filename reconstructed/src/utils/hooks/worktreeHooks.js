/**
 * utils/hooks/worktreeHooks.ts
 *
 * WorktreeCreate 钩子检测（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (3)
 * attribution: placement 3
 */
import { filterHooksByManagedHold } from "./managedHooksOnly.js";
import { getHooksForEvent } from "../hooks.js";

//@ chunk-s61vbvea.js:429611-429663 placement
function hasWorktreeCreateHook() {
  return ib("WorktreeCreate").length > 0;
}
//@ chunk-s61vbvea.js:429663-429715 placement
function hasWorktreeRemoveHook() {
  return ib("WorktreeRemove").length > 0;
}
//@ chunk-s61vbvea.js:429715-429755 placement
function ib(e) {
  return filterHooksByManagedHold([...getHooksForEvent(e)], e);
}

export { hasWorktreeRemoveHook, hasWorktreeCreateHook };
