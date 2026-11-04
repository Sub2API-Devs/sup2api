/**
 * services/repoRoots/repoRootErrors.ts
 *
 * 2.1.316 新增：取 repo root 错误码；构造带错误码的 repo root 错误。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6g64aje3.js (4)
 * attribution: placement 4
 */
import { WireSafeControlError } from "../../utils/errors.js";

//@ chunk-6g64aje3.js:227-470 placement
/**
 * repo root 错误码对应的遥测语气（路径/权限类为 sad，工作区移动与意外错误为 bad），以及"list denied: "前缀。
 */
var REPO_ROOT_ERROR_TONES = {
  invalid_path: "sad",
  unsupported_name: "sad",
  symlink_in_path: "sad",
  path_not_canonical: "sad",
  read_rule: "sad",
  not_found: "sad",
  not_a_directory: "sad",
  os_permission_denied: "sad",
  workspace_moved: "bad",
  unexpected_error: "bad",
};
var LIST_DENIED_PREFIX = "list denied: ";
//@ chunk-6g64aje3.js:470-517 placement
/**
 * 构造带错误码的 repo root 错误。
 */
function repoRootError(errorCode, cause) {
  return new WireSafeControlError(`${LIST_DENIED_PREFIX}${errorCode}`, cause, errorCode);
}
//@ chunk-6g64aje3.js:517-638 placement
/**
 * 取 repo root 错误码。
 */
function repoRootErrorClass(error) {
  if (!(error instanceof WireSafeControlError)) return;
  let errorClass = error.errorClass;
  return errorClass !== undefined &&
    isRepoRootErrorCode(errorClass) &&
    error.message === `${LIST_DENIED_PREFIX}${errorClass}`
    ? errorClass
    : undefined;
}
//@ chunk-6g64aje3.js:638-680 placement
function isRepoRootErrorCode(errorClass) {
  return Object.hasOwn(REPO_ROOT_ERROR_TONES, errorClass);
}
export { repoRootError, repoRootErrorClass, REPO_ROOT_ERROR_TONES };
