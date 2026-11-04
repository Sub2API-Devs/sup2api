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
var MAX_GIT_REF_CHARS = 255;
var MAX_GIT_REF_BYTES = 255;
var INVALID_GIT_REF_CHARS_RE = /[\x00-\x20\x7f~^:?*[\\]/;
var CONTROL_OR_FORMAT_CHARS_RE = /[\p{Cc}\p{Cf}\uFFFD]/u;
var MAX_GIT_REF_COMPONENT_BYTES = 250;
//@ chunk-6xf89m6d.js:305-365 placement
/**
 * 校验 git 引用名：UTF-8 字节长度 ≤255，且逐项规则通过（非 @/HEAD、不以 - 开头、无控制符、各段 ≤250 字节）。
 */
function isValidGitRefName(worktreeBranch) {
  return (
    Buffer.byteLength(worktreeBranch, "utf8") <= MAX_GIT_REF_BYTES && isValidGitRefNameChars(worktreeBranch)
  );
}
//@ chunk-6xf89m6d.js:365-523 placement
function isValidGitRefNameChars(taskListId) {
  return (
    taskListId.length <= MAX_GIT_REF_CHARS &&
    taskListId !== "@" &&
    taskListId !== "HEAD" &&
    isWellFormedString(taskListId) &&
    getTaskListLockPath(taskListId) &&
    !CONTROL_OR_FORMAT_CHARS_RE.test(taskListId) &&
    !taskListId.startsWith("-") &&
    taskListId
      .split("/")
      .every((component) => Buffer.byteLength(component, "utf8") <= MAX_GIT_REF_COMPONENT_BYTES)
  );
}
//@ chunk-6xf89m6d.js:523-685 placement (2.1.88 match: getTaskListLockPath, 1)
/**
 * git ref 名合法性检查（切分误归）。
 */
function getTaskListLockPath(taskListId) {
  return (
    !INVALID_GIT_REF_CHARS_RE.test(taskListId) &&
    !taskListId.endsWith(".") &&
    !taskListId.includes("..") &&
    !taskListId.includes("@{") &&
    taskListId
      .split("/")
      .every((component) => component !== "" && !component.startsWith(".") && !component.endsWith(".lock"))
  );
}
export { isValidGitRefName, MAX_GIT_REF_CHARS };
