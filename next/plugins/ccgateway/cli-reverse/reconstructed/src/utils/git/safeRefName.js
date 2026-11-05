/**
 * utils/git/safeRefName.ts
 *
 * 2.1.316 新增：安全的 git ref 名称判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ndkzc8d3.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-ndkzc8d3.js:586-772 placement
function isSafeRefName(name) {
  if (!name || name.startsWith("-") || name.startsWith("/")) return false;
  if (name.includes("..")) return false;
  if (name.split("/").some((segment) => segment === "." || segment === "")) return false;
  return /^[a-zA-Z0-9/._+@-]+$/.test(name);
}
export { isSafeRefName };
