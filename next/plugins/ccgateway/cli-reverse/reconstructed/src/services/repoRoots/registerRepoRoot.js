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
function screenedReason(reason) {
  return `screened_${reason}`;
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
function checkRepoRootScope(candidatePath, originalCwd, cliArgRoots, registeredPaths) {
  let pathOptions = {
    caseFold: false,
    skipPrivateAlias: true,
    uncShapeParity: true,
  };
  let insideCwd = isAbsolute(originalCwd) && pathInWorkingPath(candidatePath, originalCwd, pathOptions);
  if (insideCwd && pathInWorkingPath(originalCwd, candidatePath, pathOptions))
    return {
      allowed: false,
      code: "is_cwd",
      reason:
        "is the session's working directory, which is already registered; pass the cloned repo's own directory instead",
    };
  if (registeredPaths.includes(candidatePath))
    return {
      allowed: false,
      code: "already_registered",
      reason: "is already a registered working directory",
    };
  let any = cliArgRoots.some(
    (cliArgRoot) => candidatePath !== cliArgRoot && pathInWorkingPath(candidatePath, cliArgRoot, pathOptions),
  );
  if (!insideCwd && !any)
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
    [...additionalWorkingDirectories.values()].map(async (workingDirEntry) => {
      if (await entryReachesForeignNetwork(workingDirEntry.path, getPermissionScreenAnchor()))
        return {
          source: workingDirEntry.source,
          resolved: workingDirEntry.path,
        };
      let realPath = await realpath(workingDirEntry.path).catch(() => workingDirEntry.path);
      return {
        source: workingDirEntry.source,
        resolved: isDifferentNetworkLocation(workingDirEntry.path, realPath, getPermissionScreenAnchor())
          ? workingDirEntry.path
          : realPath,
      };
    }),
  );
}
//@ chunk-2tyecnjj.js:2042-2170 placement
async function checkIsDirectory(targetPath) {
  return (await stat(targetPath)).isDirectory()
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
async function resolveRepoRootCandidate(targetPath, getPermissionContext, originalCwd) {
  let expandedPath;
  let resolvedPath;
  try {
    expandedPath = expandPath(targetPath, originalCwd);
  } catch {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "register_repo_root: target path could not be resolved",
      "register_repo_root: path expansion failed",
      "expansion_failed",
    );
  }
  let spellingCheck = vetPathSpellingsOrChain(
    targetPath,
    expandedPath,
    getPermissionContext().trustedNetworkDirectories,
    {
      allowLinkTextClimbs: true,
    },
  );
  if (!spellingCheck.ok)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "register_repo_root: target is a network path, an obfuscated spelling, or a path whose directories and symbolic links could not all be examined, which cannot be registered",
      SCREENED_PATH_MESSAGES[spellingCheck.reason],
      screenedReason(spellingCheck.reason),
    );
  try {
    resolvedPath = await realpath(expandedPath);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "register_repo_root: target path could not be resolved",
      "register_repo_root: path resolution failed",
      isSadFsErrno(error) || isEnvFsErrno(error) ? "resolve_failed" : undefined,
    );
  }
  let vettingReason = pathVettingReason(resolvedPath, getPermissionContext().trustedNetworkDirectories);
  if (vettingReason !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "register_repo_root: target is a network path, an obfuscated spelling, or a path whose directories and symbolic links could not all be examined, which cannot be registered",
      "register_repo_root: resolved path rejected by the spelling screen",
      screenedReason(vettingReason),
    );
  let directoryCheck;
  try {
    directoryCheck = await checkIsDirectory(resolvedPath);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "register_repo_root: target path could not be resolved",
      "register_repo_root: target stat failed",
      isSadFsErrno(error) || isEnvFsErrno(error) ? "stat_failed" : undefined,
    );
  }
  if (!directoryCheck.allowed)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `register_repo_root: ${sanitizeTelemetryString(targetPath)} ${directoryCheck.reason}`,
      "register_repo_root: target is not a directory",
      directoryCheck.code,
    );
  return resolvedPath;
}
//@ chunk-2tyecnjj.js:4026-4372 placement
/**
 * 注册额外工作目录（RegisterRepoRoot 工具的核心）。
 */
async function registerRepoRoot(targetPath, getPermissionContext, originalCwd) {
  let candidatePath = await resolveRepoRootCandidate(targetPath, getPermissionContext, originalCwd);
  let repoRootPaths = await resolveRepoRootPaths(getPermissionContext().additionalWorkingDirectories);
  let scopeCheck = checkRepoRootScope(
    candidatePath,
    getOriginalCwd(),
    repoRootPaths
      .filter((repoRootPath) => repoRootPath.source === "cliArg")
      .map((repoRootPath) => repoRootPath.resolved),
    repoRootPaths.map((repoRootPath) => repoRootPath.resolved),
  );
  if (!scopeCheck.allowed)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `register_repo_root: ${sanitizeTelemetryString(targetPath)} ${scopeCheck.reason}`,
      "register_repo_root: directory is outside the allowed registration scope",
      scopeCheck.code,
    );
  return candidatePath;
}
export {
  registerRepoRoot,
  registerRepoRootErrorClass,
  checkRepoRootScope,
  REGISTER_REPO_ROOT_ERROR_TONES,
  resolveRepoRootCandidate,
};
