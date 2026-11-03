/**
 * utils/git/safeRefName.ts
 *
 * 2.1.316 新增：安全的 git ref 名称判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0777tkjc.js (1)
 * attribution: placement 1
 */

//@ chunk-0777tkjc.js:585-771 placement
function isSafeRefName(e) {
  if (!e || e.startsWith("-") || e.startsWith("/")) return !1;
  if (e.includes("..")) return !1;
  if (e.split("/").some((n) => n === "." || n === "")) return !1;
  return /^[a-zA-Z0-9/._+@-]+$/.test(e);
}

export { isSafeRefName };
