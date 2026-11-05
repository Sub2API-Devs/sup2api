/**
 * services/repoRoots/repoRootErrors.ts
 *
 * 2.1.316 新增：取 repo root 错误码；构造带错误码的 repo root 错误。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-aejveeja.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { WireSafeControlError } from "../../utils/errors.js";

//@ chunk-aejveeja.js:4232-4476 placement
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
//@ chunk-aejveeja.js:4476-4524 placement
/**
 * 构造带错误码的 repo root 错误。
 */
function repoRootError(errorCode, cause) {
  return new WireSafeControlError(`${LIST_DENIED_PREFIX}${errorCode}`, cause, errorCode);
}
//@ chunk-aejveeja.js:4524-4647 placement
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
//@ chunk-aejveeja.js:4647-4690 placement
function isRepoRootErrorCode(errorClass) {
  return Object.hasOwn(REPO_ROOT_ERROR_TONES, errorClass);
}
export { repoRootError, repoRootErrorClass, REPO_ROOT_ERROR_TONES };
