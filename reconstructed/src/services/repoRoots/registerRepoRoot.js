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
import { NF, cH } from "../../utils/permissions/pathVetting.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";

/**
 * register_repo_root 各错误码的语气分类。
 */
//@ chunk-2tyecnjj.js:542-969 placement
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
function c(e) {
  return `screened_${e}`;
}
//@ chunk-2tyecnjj.js:1005-1047 placement
function u(e) {
  return Object.hasOwn(REGISTER_REPO_ROOT_ERROR_TONES, e);
}
/**
 * 从错误中取 register_repo_root 错误码。
 */
//@ chunk-2tyecnjj.js:1047-1217 placement
function registerRepoRootErrorClass(e) {
  try {
    return e instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
      e.telemetryMessage.startsWith("register_repo_root:") &&
      e.errorClass !== void 0 &&
      u(e.errorClass)
      ? e.errorClass
      : void 0;
  } catch {
    return;
  }
}
/**
 * 检查目录是否可注册（非当前目录、未重复、在范围内）。
 */
//@ chunk-2tyecnjj.js:1217-1802 placement
function checkRepoRootScope(e, o, i, a) {
  let t = { caseFold: !1, skipPrivateAlias: !0, uncShapeParity: !0 },
    r = isAbsolute(o) && pathInWorkingPath(e, o, t);
  if (r && pathInWorkingPath(o, e, t))
    return {
      allowed: !1,
      code: "is_cwd",
      reason:
        "is the session's working directory, which is already registered; pass the cloned repo's own directory instead",
    };
  if (a.includes(e))
    return { allowed: !1, code: "already_registered", reason: "is already a registered working directory" };
  let any = i.some((n) => e !== n && pathInWorkingPath(e, n, t));
  if (!r && !any)
    return {
      allowed: !1,
      code: "outside_scope",
      reason: "is not a subdirectory of the session's working directory or of a launch-time --add-dir root",
    };
  return { allowed: !0 };
}
//@ chunk-2tyecnjj.js:1802-2042 placement
async function resolveRepoRootPaths(e) {
  return Promise.all(
    [...e.values()].map(async (o) => {
      if (await entryReachesForeignNetwork(o.path, getPermissionScreenAnchor()))
        return { source: o.source, resolved: o.path };
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
    ? { allowed: !0 }
    : { allowed: !1, code: "not_directory", reason: "is not a directory" };
}
/**
 * 被拒路径（NT 命名空间、UNC、自动挂载等）的遥测消息。
 */
//@ chunk-2tyecnjj.js:2170-2750 placement
var SCREENED_PATH_MESSAGES = {
  nt_namespace: "register_repo_root: NT-namespace path rejected before filesystem access",
  untrusted_unc: "register_repo_root: UNC path rejected before filesystem access",
  untrusted_automount: "register_repo_root: automount path rejected before filesystem access",
  suspicious_windows_spelling: "register_repo_root: suspicious Windows path spelling rejected",
  unvettable_chain: "register_repo_root: unvettable path ancestry rejected before filesystem access",
  link_text_climbs:
    'register_repo_root: path through a symlink whose target has ".." past its leading "../" segments rejected',
};
/**
 * 解析并安全检查要注册的目录（网络路径、可疑拼写、目录类型）。
 */
//@ chunk-2tyecnjj.js:2750-4026 placement
async function resolveRepoRootCandidate(e, o, i) {
  let a, t;
  try {
    a = expandPath(e, i);
  } catch {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "register_repo_root: target path could not be resolved",
      "register_repo_root: path expansion failed",
      "expansion_failed",
    );
  }
  let r = NF(e, a, o().trustedNetworkDirectories, { allowLinkTextClimbs: !0 });
  if (!r.ok)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "register_repo_root: target is a network path, an obfuscated spelling, or a path whose directories and symbolic links could not all be examined, which cannot be registered",
      SCREENED_PATH_MESSAGES[r.reason],
      c(r.reason),
    );
  try {
    t = await realpath(a);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "register_repo_root: target path could not be resolved",
      "register_repo_root: path resolution failed",
      isSadFsErrno(error) || isEnvFsErrno(error) ? "resolve_failed" : void 0,
    );
  }
  let s = cH(t, o().trustedNetworkDirectories);
  if (s !== void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "register_repo_root: target is a network path, an obfuscated spelling, or a path whose directories and symbolic links could not all be examined, which cannot be registered",
      "register_repo_root: resolved path rejected by the spelling screen",
      c(s),
    );
  let n;
  try {
    n = await checkIsDirectory(t);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "register_repo_root: target path could not be resolved",
      "register_repo_root: target stat failed",
      isSadFsErrno(error) || isEnvFsErrno(error) ? "stat_failed" : void 0,
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
/**
 * 注册额外工作目录（RegisterRepoRoot 工具的核心）。
 */
//@ chunk-2tyecnjj.js:4026-4372 placement
async function registerRepoRoot(e, o, i) {
  let a = await resolveRepoRootCandidate(e, o, i),
    t = await resolveRepoRootPaths(o().additionalWorkingDirectories),
    r = checkRepoRootScope(
      a,
      getOriginalCwd(),
      t.filter((s) => s.source === "cliArg").map((s) => s.resolved),
      t.map((s) => s.resolved),
    );
  if (!r.allowed)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `register_repo_root: ${sanitizeTelemetryString(e)} ${r.reason}`,
      "register_repo_root: directory is outside the allowed registration scope",
      r.code,
    );
  return a;
}

export {
  registerRepoRoot,
  registerRepoRootErrorClass,
  checkRepoRootScope,
  REGISTER_REPO_ROOT_ERROR_TONES,
  resolveRepoRootCandidate,
};
