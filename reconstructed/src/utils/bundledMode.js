/**
 * utils/bundledMode.ts
 *
 * 是否以打包模式（Bun 单文件）运行的判定，及若干混入的设置值类型转换辅助。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bundledMode.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-s61vbvea.js (1)
 * attribution: fingerprint 2
 */
import { findStaleReads } from "../services/accountMemory/memoryUpdates.js";

//@ chunk-18hwfzwa.js:1041736-1041965 fingerprint = isInBundledMode (0.828)
function isInBundledMode(h) {
  if (Array.isArray(h)) return `[${h.map(isInBundledMode).join(",")}]`;
  if (typeof h === "object" && h !== null)
    return `{${Object.keys(h)
      .sort()
      .map((x) => `${JSON.stringify(x)}:${isInBundledMode(h[x])}`)
      .join(",")}}`;
  return JSON.stringify(h) ?? "undefined";
}
//@ chunk-s61vbvea.js:79753-79892 fingerprint = isRunningWithBun (0.611)
function isRunningWithBun(e, n, r) {
  if (!e?.versions || e.content === null || n?.version === e.version) return !1;
  try {
    return findStaleReads(e.versions, r).length > 0;
  } catch {
    return !1;
  }
}

export { isInBundledMode, isRunningWithBun };
