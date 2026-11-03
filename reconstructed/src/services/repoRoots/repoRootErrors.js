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

/**
 * repo root 错误码对应的遥测语气（路径/权限类为 sad，工作区移动与意外错误为 bad），以及"list denied: "前缀。
 */
//@ chunk-6g64aje3.js:227-470 placement
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
  },
  t = "list denied: ";
/**
 * 构造带错误码的 repo root 错误。
 */
//@ chunk-6g64aje3.js:470-517 placement
function repoRootError(e, n) {
  return new WireSafeControlError(`${t}${e}`, n, e);
}
/**
 * 取 repo root 错误码。
 */
//@ chunk-6g64aje3.js:517-638 placement
function repoRootErrorClass(e) {
  if (!(e instanceof WireSafeControlError)) return;
  let errorClass = e.errorClass;
  return errorClass !== void 0 && o(errorClass) && e.message === `${t}${errorClass}` ? errorClass : void 0;
}
//@ chunk-6g64aje3.js:638-680 placement
function o(e) {
  return Object.hasOwn(REPO_ROOT_ERROR_TONES, e);
}

export { repoRootError, repoRootErrorClass, REPO_ROOT_ERROR_TONES };
