/**
 * utils/git/refNames.ts
 *
 * 2.1.316 新增。git 引用名。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6xf89m6d.js (4)
 * attribution: placement 4
 */
import { isWellFormedString } from "../stringUtils.js";

//@ chunk-6xf89m6d.js:227-305 placement
var MAX_GIT_REF_CHARS = 255,
  MAX_GIT_REF_BYTES = 255,
  INVALID_GIT_REF_CHARS_RE = /[\x00-\x20\x7f~^:?*[\\]/,
  CONTROL_OR_FORMAT_CHARS_RE = /[\p{Cc}\p{Cf}\uFFFD]/u,
  MAX_GIT_REF_COMPONENT_BYTES = 250;
/**
 * 校验 git 引用名：UTF-8 字节长度 ≤255，且逐项规则通过（非 @/HEAD、不以 - 开头、无控制符、各段 ≤250 字节）。
 */
//@ chunk-6xf89m6d.js:305-365 placement
function isValidGitRefName(n) {
  return Buffer.byteLength(n, "utf8") <= MAX_GIT_REF_BYTES && isValidGitRefNameChars(n);
}
//@ chunk-6xf89m6d.js:365-523 placement
function isValidGitRefNameChars(n) {
  return (
    n.length <= MAX_GIT_REF_CHARS &&
    n !== "@" &&
    n !== "HEAD" &&
    isWellFormedString(n) &&
    getTaskListLockPath(n) &&
    !CONTROL_OR_FORMAT_CHARS_RE.test(n) &&
    !n.startsWith("-") &&
    n.split("/").every((r) => Buffer.byteLength(r, "utf8") <= MAX_GIT_REF_COMPONENT_BYTES)
  );
}
/**
 * git ref 名合法性检查（切分误归）。
 */
//@ chunk-6xf89m6d.js:523-685 placement = getTaskListLockPath (1)
function getTaskListLockPath(taskListId) {
  return (
    !INVALID_GIT_REF_CHARS_RE.test(taskListId) &&
    !taskListId.endsWith(".") &&
    !taskListId.includes("..") &&
    !taskListId.includes("@{") &&
    taskListId.split("/").every((r) => r !== "" && !r.startsWith(".") && !r.endsWith(".lock"))
  );
}

export { isValidGitRefName, MAX_GIT_REF_CHARS };
