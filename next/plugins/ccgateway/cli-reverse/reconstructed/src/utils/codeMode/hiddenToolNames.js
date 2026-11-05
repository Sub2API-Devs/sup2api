/**
 * utils/codeMode/hiddenToolNames.ts
 *
 * 判断工具名是否仍会被列出（隐藏工具集是否放行），供 REPL 模式下读工具表用（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7pvjwb7z.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getStickyBetas } from "../../bootstrap/state.js";

//@ chunk-7pvjwb7z.js:3699-3725 placement
function isEnabled(ignored = true) {
  return false;
}
//@ chunk-7pvjwb7z.js:3725-3748 placement
/**
 * 是否仍会列出隐藏工具名（本版本恒 false）。
 */
function shouldUse(context) {
  return false;
}
//@ chunk-7pvjwb7z.js:3748-3822 placement
function resolveStickyBetas(options) {
  return options.agentId && !options.stickyBetas ? undefined : (options.stickyBetas ?? getStickyBetas());
}
//@ chunk-7pvjwb7z.js:3822-3929 placement
function hasRefusedNameOnly(state) {
  return (
    state !== undefined &&
    !state.nameOnlyEntries.refused &&
    /^[1-9]/.test(state.nameOnlyEntries.reported ?? "")
  );
}
export { shouldUse };
