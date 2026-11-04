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

//@ chunk-s61vbvea.js:79753-79892 fingerprint = isRunningWithBun (0.611)
function isRunningWithBun(held, lastMemoryContextAttachment, root) {
  if (!held?.versions || held.content === null || lastMemoryContextAttachment?.version === held.version)
    return false;
  try {
    return findStaleReads(held.versions, root).length > 0;
  } catch {
    return false;
  }
}
//@ chunk-18hwfzwa.js:1041736-1041965 fingerprint = isInBundledMode (0.828)
function isInBundledMode(value) {
  if (Array.isArray(value)) return `[${value.map(isInBundledMode).join(",")}]`;
  if (typeof value === "object" && value !== null)
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${isInBundledMode(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}
export { isInBundledMode, isRunningWithBun };
