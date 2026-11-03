/**
 * services/repoRoots/registerRepoRoot.ts
 *
 * 2.1.316 新增：解析并安全检查要注册的目录（网络路径、可疑拼写、目录类型）；检查目录是否可注册（非当前目录、未重复、在范围内）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2tyecnjj.js (10)
 * attribution: placement 10
 */
import { isAbsolute } from "path";
import { realpath, stat } from "fs/promises";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isSadFsErrno,
  isEnvFsErrno,
} from "../../utils/errors.js";
import { pathInWorkingPath } from "../../utils/permissions/filesystem.js";
import { entryReachesForeignNetwork } from "../../utils/fsOperations.js";
import { getPermissionScreenAnchor, getOriginalCwd } from "../../bootstrap/state.js";
import { isDifferentNetworkLocation } from "../../utils/networkPaths.js";
import { expandPath } from "../../utils/path.js";
import { vetPathSpellingsOrChain, pathVettingReason } from "../../utils/permissions/pathVetting.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";

//@ chunk-2tyecnjj.js:542-969 placement
/**
 * register_repo_root 各错误码的语气分类。
 */
var REGISTER_REPO_ROOT_ERROR_TONES = {
  is_cwd: "sad",
  already_registered: "sad",
  outside_scope: "bad_reported",
  not_directory: "bad",
  too_many: "bad",
  expansion_failed: "bad",
  resolve_failed: "bad",
  stat_failed: "bad",
  screened_nt_namespace: "bad_reported",
  screened_untrusted_unc: "bad_reported",
  screened_untrusted_automount: "bad_reported",
  screened_suspicious_windows_spelling: "bad_reported",
  screened_unvettable_chain: "bad_reported",
  screened_link_text_climbs: "bad_reported",
};
//@ chunk-2tyecnjj.js:969-1005 placement
function screenedReason(e) {
  return `screened_${e}`;
}
//@ chunk-2tyecnjj.js:1005-1047 placement
function isKnownRepoRootErrorCode(errorClass) {
  return Object.hasOwn(REGISTER_REPO_ROOT_ERROR_TONES, errorClass);
}
//@ chunk-2tyecnjj.js:1047-1217 placement
/**
 * 从错误中取 register_repo_root 错误码。
 */
function registerRepoRootErrorClass(error) {
  try {
    return error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
      error.telemetryMessage.startsWith("register_repo_root:") &&
      error.errorClass !== undefined &&
      isKnownRepoRootErrorCode(error.errorClass)
      ? error.errorClass
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-2tyecnjj.js:1217-1802 placement
/**
 * 检查目录是否可注册（非当前目录、未重复、在范围内）。
 */
function checkRepoRootScope(e, originalCwd, i, a) {
  let t = {
    caseFold: false,
    skipPrivateAlias: true,
    uncShapeParity: true,
  };
  let r = isAbsolute(originalCwd) && pathInWorkingPath(e, originalCwd, t);
  if (r && pathInWorkingPath(originalCwd, e, t))
    return {
      allowed: false,
      code: "is_cwd",
      reason:
        "is the session's working directory, which is already registered; pass the cloned repo's own directory instead",
    };
  if (a.includes(e))
    return {
      allowed: false,
      code: "already_registered",
      reason: "is already a registered working directory",
    };
  let any = i.some((n) => e !== n && pathInWorkingPath(e, n, t));
  if (!r && !any)
    return {
      allowed: false,
      code: "outside_scope",
      reason: "is not a subdirectory of the session's working directory or of a launch-time --add-dir root",
    };
  return {
    allowed: true,
  };
}
//@ chunk-2tyecnjj.js:1802-2042 placement
async function resolveRepoRootPaths(additionalWorkingDirectories) {
  return Promise.all(
    [...additionalWorkingDirectories.values()].map(async (o) => {
      if (await entryReachesForeignNetwork(o.path, getPermissionScreenAnchor()))
        return {
          source: o.source,
          resolved: o.path,
        };
      let i = await realpath(o.path).catch(() => o.path);
      return {
        source: o.source,
        resolved: isDifferentNetworkLocation(o.path, i, getPermissionScreenAnchor()) ? o.path : i,
      };
    }),
  );
}
//@ chunk-2tyecnjj.js:2042-2170 placement
async function checkIsDirectory(e) {
  return (await stat(e)).isDirectory()
    ? {
        allowed: true,
      }
    : {
        allowed: false,
        code: "not_directory",
        reason: "is not a directory",
      };
}
//@ chunk-2tyecnjj.js:2170-2750 placement
/**
 * 被拒路径（NT 命名空间、UNC、自动挂载等）的遥测消息。
 */
var SCREENED_PATH_MESSAGES = {
  nt_namespace: "register_repo_root: NT-namespace path rejected before filesystem access",
  untrusted_unc: "register_repo_root: UNC path rejected before filesystem access",
  untrusted_automount: "register_repo_root: automount path rejected before filesystem access",
  suspicious_windows_spelling: "register_repo_root: suspicious Windows path spelling rejected",
  unvettable_chain: "register_repo_root: unvettable path ancestry rejected before filesystem access",
  link_text_climbs:
    'register_repo_root: path through a symlink whose target has ".." past its leading "../" segments rejected',
};
//@ chunk-2tyecnjj.js:2750-4026 placement
/**
 * 解析并安全检查要注册的目录（网络路径、可疑拼写、目录类型）。
 */
async function resolveRepoRootCandidate(e, o, i) {
  let a;
  let t;
  try {
    a = expandPath(e, i);
  } catch {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "register_repo_root: target path could not be resolved",
      "register_repo_root: path expansion failed",
      "expansion_failed",
    );
  }
  let r = vetPathSpellingsOrChain(e, a, o().trustedNetworkDirectories, {
    allowLinkTextClimbs: true,
  });
  if (!r.ok)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "register_repo_root: target is a network path, an obfuscated spelling, or a path whose directories and symbolic links could not all be examined, which cannot be registered",
      SCREENED_PATH_MESSAGES[r.reason],
      screenedReason(r.reason),
    );
  try {
    t = await realpath(a);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "register_repo_root: target path could not be resolved",
      "register_repo_root: path resolution failed",
      isSadFsErrno(error) || isEnvFsErrno(error) ? "resolve_failed" : undefined,
    );
  }
  let s = pathVettingReason(t, o().trustedNetworkDirectories);
  if (s !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "register_repo_root: target is a network path, an obfuscated spelling, or a path whose directories and symbolic links could not all be examined, which cannot be registered",
      "register_repo_root: resolved path rejected by the spelling screen",
      screenedReason(s),
    );
  let n;
  try {
    n = await checkIsDirectory(t);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "register_repo_root: target path could not be resolved",
      "register_repo_root: target stat failed",
      isSadFsErrno(error) || isEnvFsErrno(error) ? "stat_failed" : undefined,
    );
  }
  if (!n.allowed)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `register_repo_root: ${sanitizeTelemetryString(e)} ${n.reason}`,
      "register_repo_root: target is not a directory",
      n.code,
    );
  return t;
}
//@ chunk-2tyecnjj.js:4026-4372 placement
/**
 * 注册额外工作目录（RegisterRepoRoot 工具的核心）。
 */
async function registerRepoRoot(directory, o, originalCwd) {
  let repoRootCandidate = await resolveRepoRootCandidate(directory, o, originalCwd);
  let repoRootPaths = await resolveRepoRootPaths(o().additionalWorkingDirectories);
  let r = checkRepoRootScope(
    repoRootCandidate,
    getOriginalCwd(),
    repoRootPaths
      .filter((repoRootPath) => repoRootPath.source === "cliArg")
      .map((repoRootPath) => repoRootPath.resolved),
    repoRootPaths.map((repoRootPath) => repoRootPath.resolved),
  );
  if (!r.allowed)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `register_repo_root: ${sanitizeTelemetryString(directory)} ${r.reason}`,
      "register_repo_root: directory is outside the allowed registration scope",
      r.code,
    );
  return repoRootCandidate;
}
export {
  registerRepoRoot,
  registerRepoRootErrorClass,
  checkRepoRootScope,
  REGISTER_REPO_ROOT_ERROR_TONES,
  resolveRepoRootCandidate,
};
