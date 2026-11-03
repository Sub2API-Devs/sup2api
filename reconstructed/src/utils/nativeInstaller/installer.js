/**
 * utils/nativeInstaller/installer.ts
 *
 * 已有模块；g2 补充放置声明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/nativeInstaller/installer.ts
 * pieces: chunk-ch0vxh4c.js (1), chunk-e6aww6q8.js (1), chunk-s61vbvea.js (6), chunk-zw17mz74.js (48)
 * attribution: fingerprint 21, placement 5, sole-consumer 1, affinity 2, facade-exports 9, layout 18
 */
import {
  join,
  join as join_2,
  join as join_3,
  dirname,
  basename,
  basename as basename_2,
  resolve,
  delimiter,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
} from "path";
import {
  stat,
  mkdir,
  writeFile,
  utimes,
  copyFile,
  chmod,
  chmod as chmod_2,
  rename,
  unlink,
  readdir,
  readdir as readdir_2,
  rm,
  rm as rm_2,
  realpath,
  rmdir,
  symlink,
  access,
  readlink,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
} from "fs/promises";
import { constants } from "fs";
import { randomBytes } from "crypto";
import { homedir } from "os";
import { Re } from "../../../runtime/bun-runtime.js";
import { Vy } from "../../../vendor/semver/index.js";
import { env } from "../env.js";
import { logForDebugging } from "../debug.js";
import { envDynamicProbe } from "../envDynamic.js";
import { getNativeVersionsDir, getXDGCacheHome, getXDGStateHome, getUserBinDir } from "../xdg.js";
import {
  getErrnoCode,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isSyscallError,
  toError,
  sanitizedErrCodeForTelemetry,
  isENOENT,
} from "../errors.js";
import {
  me,
  sha256File,
  reverifyRetainedVersion,
  ManifestSignatureError,
  isRetryableNetworkError,
  fileMatchesChecksum,
  downloadVersion,
  getLatestVersion,
} from "./download.js";
import {
  withProcessLock,
  isLockActive,
  readLockContent,
  acquireProcessLifetimeLock,
  cleanupStaleLocks,
} from "./pidLock.js";
import { logEvent } from "../../services/analytics/index.js";
import { sleep } from "../sleep.js";
import { lock, checkLockfile } from "../lockfile.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../log.js";
import { HostScoped } from "../hostScoped.js";
import { isEnvTruthy } from "../envUtils.js";
import { getRootSession, getSessionBypassPermissionsMode } from "../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { resolveMaxVersionConfig, isForceDowngradeActive, shouldSkipVersion } from "../autoUpdater.js";
import { hto } from "../model/modelCatalog/catalogCapabilities.js";
import { gt as gt_2, gte } from "../semver.js";
import { sanitizeVersion } from "../../services/analytics/metadata.js";
import { getCurrentInstallationTypeProbed } from "../doctorDiagnostic.js";
import { getGlobalConfig, saveGlobalConfig } from "../config.js";
import { getShellType } from "../localInstaller.js";
import {
  getShellConfigPaths,
  readFileLinesOrNull,
  filterClaudeAliases,
  writeFileLines,
} from "../shellConfig.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { isEssentialTrafficOnly } from "../privacyLevel.js";
import { getCachedOrFetchPassesEligibility } from "../../services/api/referral.js";
import { getPlatform as getPlatform_2 } from "../platform.js";

//@ chunk-zw17mz74.js:1332-1350 sole-consumer
var semver = Re(Vy(), 1);
//@ chunk-zw17mz74.js:2073-2083 affinity
var FORCE_ARM64 = !1;
/**
 * 原生安装器的平台标识（linux-x64、darwin-arm64、win32-x64…，含 musl/Android 判断）；316 linux 构建架构固定 x64。
 */
//@ chunk-zw17mz74.js:2083-2410 fingerprint = getPlatform (0.712)
function getPlatform() {
  let os = env.platform,
    n = "x64";
  if (!n) {
    let r = Error("Unsupported architecture: x64");
    throw (logForDebugging("Native installer does not support architecture: x64", { level: "error" }), r);
  }
  if (FORCE_ARM64) n = "arm64";
  if (os === "linux") {
    if (envDynamicProbe.isAndroidEnvironment()) return `linux-${n}-android`;
    if (envDynamicProbe.isMuslEnvironment()) return `linux-${n}-musl`;
  }
  return `${os}-${n}`;
}
//@ chunk-zw17mz74.js:20027-20049 affinity
var VERSION_RETENTION_COUNT = 2,
  VERSION_RETENTION_MS = 604800000;
/**
 * 原生二进制文件名：Windows 为 claude.exe，否则 claude。
 */
//@ chunk-zw17mz74.js:20049-20116 facade-exports = getBinaryName (1)
function getBinaryName(platform) {
  return platform.startsWith("win32") ? "claude.exe" : "claude";
}
/**
 * 原生安装目录：versions、staging、locks 与启动器可执行文件路径（~/.local/bin/claude）。
 */
//@ chunk-zw17mz74.js:20116-20260 fingerprint = getBaseDirectories (0.9)
function getBaseDirectories() {
  let platform = getPlatform(),
    executableName = getBinaryName(platform);
  return {
    versions: getNativeVersionsDir(),
    staging: join(getXDGCacheHome(), "claude", "staging"),
    locks: join(getXDGStateHome(), "claude", "locks"),
    executable: join(getUserBinDir(), executableName),
  };
}
//@ chunk-zw17mz74.js:20260-20332 layout
async function isNonEmptyFile(e) {
  return stat(e).then(
    (n) => n.isFile() && n.size > 0,
    () => !1,
  );
}
//@ chunk-zw17mz74.js:20332-20404 layout
async function findFirstExistingFile(e, n) {
  for (let r of e) if (await isNonEmptyFile(n(r))) return r;
  return;
}
//@ chunk-zw17mz74.js:20404-20465 layout
function backupPathFor(e) {
  return `${e}.old.${Date.now()}.${process.pid}`;
}
//@ chunk-zw17mz74.js:20465-20483 layout
var BACKUP_RETENTION_MS = 2592000000;
//@ chunk-zw17mz74.js:20483-20810 layout
function parseBackupOrStagedName(e, n) {
  if (!e.toLowerCase().startsWith(`${n.toLowerCase()}.`)) return;
  let match = /^(?:old\.(\d+)(?:\.(\d+))?|new\.\d+\.(\d+)\.[0-9a-f]+)$/i.exec(e.slice(n.length + 1));
  return match === null
    ? void 0
    : match[1] !== void 0
      ? {
          kind: "backup",
          stampedMs: Number(match[1]),
          ownerPid: match[2] === void 0 ? void 0 : Number(match[2]),
        }
      : { kind: "staged", stampedMs: Number(match[3]) };
}
//@ chunk-zw17mz74.js:20810-20934 layout
async function isExecutableFile(e) {
  try {
    let n = await stat(e);
    if (!n.isFile() || n.size === 0) return !1;
    return (n.mode & constants.S_IXUSR) !== 0;
  } catch {
    return !1;
  }
}
//@ chunk-zw17mz74.js:20934-21462 fingerprint = getVersionPaths (0.681)
async function getVersionPaths(version) {
  let dirs = getBaseDirectories(),
    dirsToCreate = [dirs.versions, dirs.staging, dirs.locks];
  await Promise.all(dirsToCreate.map((dir) => mkdir(dir, { recursive: !0 })));
  let executableParentDir = dirname(dirs.executable);
  if (
    (await mkdir(executableParentDir, { recursive: !0 }),
    !/^[a-zA-Z0-9._+-]+$/.test(version) || version.includes("..") || version === ".")
  )
    throw Error(`Invalid version string "${version}": contains path-unsafe characters`);
  let installPath = join(dirs.versions, version);
  try {
    await writeFile(installPath, "", { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") throw error;
    try {
      if ((await stat(installPath)).size === 0) {
        let date = new Date();
        await utimes(installPath, date, date);
      }
    } catch {}
  }
  return { stagingPath: join(dirs.staging, version), installPath: installPath };
}
//@ chunk-zw17mz74.js:21462-22584 fingerprint = tryWithVersionLock (0.885)
async function tryWithVersionLock(versionFilePath, callback, retries = 0) {
  let dirs = getBaseDirectories(),
    lockfilePath = getLockFilePathFromVersionPath(dirs, versionFilePath);
  if ((await mkdir(dirs.locks, { recursive: !0 }), me())) {
    let attempts = 0,
      maxAttempts = retries + 1,
      S = retries > 0 ? 1000 : 100,
      R = retries > 0 ? 5000 : 500;
    while (attempts < maxAttempts) {
      if (
        await withProcessLock(versionFilePath, lockfilePath, async () => {
          try {
            await callback();
          } catch (error) {
            throw (
              logForDebugging(`Native installer version-lock callback failed: ${error}`, { level: "error" }),
              error
            );
          }
        })
      )
        return (
          logEvent("tengu_version_lock_acquired", {
            is_pid_based: !0,
            is_lifetime_lock: !1,
            attempts: attempts + 1,
          }),
          !0
        );
      if ((attempts++, attempts < maxAttempts)) {
        let timeout = Math.min(S * Math.pow(2, attempts - 1), R);
        await sleep(timeout);
      }
    }
    return (
      logEvent("tengu_version_lock_failed", {
        is_pid_based: !0,
        is_lifetime_lock: !1,
        attempts: maxAttempts,
      }),
      logLockAcquisitionError(versionFilePath, Error("Lock held by another process")),
      !1
    );
  }
  let release = null;
  try {
    try {
      release = await lock(versionFilePath, {
        stale: VERSION_RETENTION_MS,
        retries: {
          retries: retries,
          minTimeout: retries > 0 ? 1000 : 100,
          maxTimeout: retries > 0 ? 5000 : 500,
        },
        lockfilePath: lockfilePath,
        onCompromised: (err) => {
          logForDebugging(`NON-FATAL: Version lock was compromised during operation: ${err.message}`, {
            level: "info",
          });
        },
      });
    } catch (lockError) {
      return (
        logEvent("tengu_version_lock_failed", { is_pid_based: !1, is_lifetime_lock: !1 }),
        logLockAcquisitionError(versionFilePath, lockError),
        !1
      );
    }
    try {
      return (
        await callback(),
        logEvent("tengu_version_lock_acquired", { is_pid_based: !1, is_lifetime_lock: !1 }),
        !0
      );
    } catch (error) {
      throw (
        logForDebugging(`tryWithVersionLock: callback failed under version lock: ${errorMessage(error)}`, {
          level: "error",
        }),
        error
      );
    }
  } finally {
    if (release) await release();
  }
}
//@ chunk-zw17mz74.js:22584-22606 layout
var ATOMIC_MOVE_RETRY_DELAYS_MS = [100, 500, 2000];
/**
 * staging 中的二进制与校验和不再一致时拒绝安装。
 */
//@ chunk-zw17mz74.js:22606-22770 facade-exports
class StagedBinaryChecksumError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor() {
    super(
      "Staged binary no longer matches the verified checksum; refusing to install",
      "Staged binary checksum mismatch at install",
    );
  }
}
//@ chunk-zw17mz74.js:22770-23309 layout
async function atomicMoveToInstallPath(e, n, r) {
  await mkdir(dirname(n), { recursive: !0 });
  let s;
  for (let h = 1; h <= ATOMIC_MOVE_RETRY_DELAYS_MS.length + 1; h++) {
    let w = `${n}.tmp.${process.pid}.${Date.now()}.${h}`;
    try {
      if ((await copyFile(e, w), await chmod(w, 493), r !== void 0 && (await sha256File(w)) !== r))
        throw new StagedBinaryChecksumError();
      return (
        await rename(w, n),
        logForDebugging(`Atomically installed binary to ${n}` + (h > 1 ? ` (attempt ${h})` : "")),
        { attempts: h }
      );
    } catch (error) {
      s = error;
      try {
        await unlink(w);
      } catch {}
      let y = getErrnoCode(error),
        S = y === "EBUSY" || (y === "EPERM" && !1),
        R = ATOMIC_MOVE_RETRY_DELAYS_MS[h - 1];
      if (!S || R === void 0) throw error;
      (logForDebugging(`atomicMoveToInstallPath attempt ${h} failed with ${y}; retrying in ${R}ms`),
        await sleep(R));
    }
  }
  throw s;
}
//@ chunk-zw17mz74.js:23309-24418 fingerprint = installVersionFromPackage (0.811)
async function installVersionFromPackage(e, n, r) {
  try {
    let nodeModulesDir = join(e, "node_modules", "@anthropic-ai"),
      nativePackage = (await readdir(nodeModulesDir)).find((entry) => entry.startsWith("claude-cli-native-"));
    if (!nativePackage)
      throw (
        logEvent("tengu_native_install_package_failure", {
          stage_find_package: !0,
          error_package_not_found: !0,
        }),
        Error("Could not find platform-specific native package")
      );
    let stagedBinaryPath = join(nodeModulesDir, nativePackage, "cli");
    try {
      await stat(stagedBinaryPath);
    } catch {
      throw (
        logEvent("tengu_native_install_package_failure", {
          stage_binary_exists: !0,
          error_binary_not_found: !0,
        }),
        Error("Native binary not found in staged package")
      );
    }
    let { attempts: attempts } = await atomicMoveToInstallPath(stagedBinaryPath, n, r);
    return (
      await rm(e, { recursive: !0, force: !0 }),
      logEvent("tengu_native_install_package_success", { install_attempts: attempts }),
      { moveRetried: attempts > 1 }
    );
  } catch (error) {
    let msg = errorMessage(error);
    if (!(msg.includes("Could not find platform-specific") || msg.includes("Native binary not found")))
      if (
        (logEvent("tengu_native_install_package_failure", { stage_atomic_move: !0, error_move_failed: !0 }),
        logFeatureBad("update_apply", "update_apply_native_move_failed"),
        isSyscallError(error))
      )
        logForDebugging(`installVersionFromPackage: atomic move failed: ${msg}`, { level: "error" });
      else logError(toError(error));
    else
      (logFeatureBad("update_apply", "update_apply_native_staging_missing"),
        logForDebugging(`installVersionFromPackage: ${msg}`, { level: "error" }));
    throw error;
  }
}
//@ chunk-zw17mz74.js:24418-25351 fingerprint = installVersionFromBinary (0.618)
async function installVersionFromBinary(e, n, r) {
  try {
    let platform = getPlatform(),
      binaryName = getBinaryName(platform),
      stagedBinaryPath = join(e, binaryName);
    try {
      await stat(stagedBinaryPath);
    } catch (error) {
      throw (
        logEvent("tengu_native_install_binary_failure", {
          stage_binary_exists: !0,
          error_binary_not_found: !0,
          error_code: sanitizedErrCodeForTelemetry(error),
        }),
        Error("Staged binary not found")
      );
    }
    let { attempts: attempts } = await atomicMoveToInstallPath(stagedBinaryPath, n, r);
    return (
      await rm(e, { recursive: !0, force: !0 }),
      logEvent("tengu_native_install_binary_success", { install_attempts: attempts }),
      { moveRetried: attempts > 1 }
    );
  } catch (error) {
    if (error instanceof StagedBinaryChecksumError)
      (logEvent("tengu_native_install_binary_failure", {
        stage_atomic_move: !0,
        error_checksum_mismatch: !0,
      }),
        logFeatureBad("update_apply", "update_apply_staged_checksum_mismatch"));
    else if (!errorMessage(error).includes("Staged binary not found"))
      (logEvent("tengu_native_install_binary_failure", {
        stage_atomic_move: !0,
        error_move_failed: !0,
        error_code: sanitizedErrCodeForTelemetry(error),
      }),
        logFeatureBad("update_apply", "update_apply_native_move_failed"));
    else logFeatureBad("update_apply", "update_apply_native_staging_missing");
    if (isSyscallError(error))
      logForDebugging(`installVersionFromBinary: atomic move failed: ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(toError(error));
    throw error;
  }
}
//@ chunk-zw17mz74.js:25351-25425 fingerprint = installVersion (1)
async function installVersion(e, n, r, s) {
  if (r === "npm") return installVersionFromPackage(e, n, s);
  return installVersionFromBinary(e, n, s);
}
//@ chunk-zw17mz74.js:25425-25451 layout
var versionLockSlots = new HostScoped(() => new Map());
/**
 * performVersionUpdate：下载到 staging、校验、原子移动到安装路径（可复用保留的已下载版本）。
 */
//@ chunk-zw17mz74.js:25451-27799 fingerprint = performVersionUpdate (0.385)
async function performVersionUpdate(
  version,
  {
    forceReinstall: forceReinstall,
    explicitVersionRequested: explicitVersionRequested,
    requireEnforcingRelease: requireEnforcingRelease,
  },
) {
  let { stagingPath: baseStagingPath, installPath: installPath } = await getVersionPaths(version),
    { executable: executablePath } = getBaseDirectories(),
    y = isEnvTruthy("true"),
    S = y
      ? `${baseStagingPath}.${process.pid}.${Date.now()}.${randomBytes(4).toString("hex")}`
      : baseStagingPath,
    of = versionLockSlots.of(getRootSession().host),
    F = of.get(version),
    I = !(F && (F.enforcingRelease || !requireEnforcingRelease)),
    O = {
      wasNewInstall: !1,
      moveRetried: !1,
      activationFailed: !1,
      activationRefused: !1,
      skippedUnverifiedRelease: !0,
    },
    L = I ? void 0 : F?.checksum,
    needsInstall = forceReinstall || !(await versionIsAvailable(version));
  if (!needsInstall && I)
    try {
      let x = await reverifyRetainedVersion(version, installPath, {
        explicitVersionRequested: explicitVersionRequested,
        requireEnforcingRelease: requireEnforcingRelease,
      });
      if (((L = x.expectedChecksum), !x.binaryMatches)) needsInstall = !0;
      else if (x.signatureVerified)
        of.set(version, { enforcingRelease: requireEnforcingRelease, checksum: L });
    } catch (error) {
      if (error instanceof ManifestSignatureError) {
        if (requireEnforcingRelease && error.reason === "release_predates_enforcement") return O;
        throw error;
      }
      if (!explicitVersionRequested || requireEnforcingRelease || !isRetryableNetworkError(error))
        throw error;
      logForDebugging(
        `Could not re-verify retained ${version} (${toError(error).name}); offline, activating as requested`,
        { level: "warn" },
      );
    }
  else if (!needsInstall && F?.checksum !== void 0) {
    if (!(await fileMatchesChecksum(installPath, F.checksum)))
      (logForDebugging(
        `Retained ${version} no longer matches the checksum verified earlier in this process; re-downloading`,
        { level: "warn" },
      ),
        of.delete(version),
        (needsInstall = !0));
  }
  let A = !1;
  if (needsInstall) {
    (logForDebugging(
      forceReinstall
        ? `Force reinstalling native installer version ${version}`
        : `Downloading native installer version ${version}`,
    ),
      await cleanupOldStagingDirs(dirname(S)));
    let x, M;
    try {
      (({
        downloadType: x,
        signatureVerified: M,
        expectedChecksum: L,
      } = await downloadVersion(version, S, {
        explicitVersionRequested: explicitVersionRequested,
        requireEnforcingRelease: requireEnforcingRelease,
      })),
        ({ moveRetried: A } = await installVersion(S, installPath, x, L)));
    } catch (error) {
      if (
        requireEnforcingRelease &&
        error instanceof ManifestSignatureError &&
        error.reason === "release_predates_enforcement"
      )
        return O;
      throw error;
    } finally {
      if (y)
        await rm(S, { recursive: !0, force: !0 }).catch((U) =>
          logForDebugging(
            `Could not remove the update staging directory (a later update removes it after one hour): ${errorMessage(U)}`,
            { level: "warn" },
          ),
        );
    }
    if (M) of.set(version, { enforcingRelease: requireEnforcingRelease, checksum: L });
  } else logForDebugging(`Version ${version} already installed, updating symlink`);
  await removeDirectoryIfEmpty(executablePath);
  let P = await updateSymlink(executablePath, installPath, { expectedChecksum: L });
  if (P !== "updated" && !(await isExecutableFile(executablePath))) {
    let x = !1;
    try {
      (await stat(installPath), (x = !0));
    } catch {}
    throw (
      logFeatureBad("update_apply", "update_apply_native_symlink_failed"),
      Error(
        `Failed to create executable at ${executablePath}. Source file exists: ${x}. Either ${executablePath} is not writable, or the existing file there was not created by the native installer and is not a working launcher \u2014 the updater will not overwrite a launcher it does not own. Remove it and re-run the update.`,
      )
    );
  }
  return {
    wasNewInstall: needsInstall,
    moveRetried: A,
    activationFailed: P === "failed",
    activationRefused: P === "refused",
    skippedUnverifiedRelease: !1,
  };
}
//@ chunk-zw17mz74.js:27799-27864 fingerprint = versionIsAvailable (1)
async function versionIsAvailable(version) {
  let { installPath: installPath } = await getVersionPaths(version);
  return isExecutableFile(installPath);
}
//@ chunk-zw17mz74.js:27864-27977 layout
async function isNativeInstallPresent() {
  if (await isRunningFromVersionsDir()) return !0;
  let { executable: executable } = getBaseDirectories();
  return (await isExecutableFile(executable)) && !(await isNpmSymlink(executable).catch(() => !1));
}
//@ chunk-zw17mz74.js:27977-28262 layout
async function isRunningFromVersionsDir() {
  let { versions: versions, executable: executable } = getBaseDirectories(),
    r = !1,
    s = [{ versions: versions, executable: executable }],
    [h, w] = await Promise.all([
      realpath(versions).catch(() => versions),
      realpath(dirname(executable)).catch(() => dirname(executable)),
    ]),
    b = join(w, basename(executable));
  if (h !== versions || b !== executable) s.push({ versions: h, executable: b });
  return s.some((y) => isUnderVersionsOrExecutable(process.execPath, { ...y, isWindows: !1 }));
}
//@ chunk-zw17mz74.js:28262-28437 layout
function isUnderVersionsOrExecutable(
  e,
  { versions: versions, executable: executable, isWindows: isWindows },
) {
  let h = (y) => (isWindows ? y.replaceAll("\\", "/").toLowerCase() : y),
    w = h(e),
    b = h(versions).replace(/\/+$/, "") + "/";
  return w.startsWith(b) || w === h(executable);
}
//@ chunk-zw17mz74.js:28437-28632 layout
function getCanaryVersion() {
  try {
    let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_canary", {});
    return (typeof e.external === "string" && semver.valid(e.external)) || null;
  } catch (error) {
    return (
      logForDebugging(`getCanaryVersion: GB read failed, falling through: ${errorMessage(error)}`),
      null
    );
  }
}
/**
 * updateLatest：取最新版本（受上限/金丝雀/跳过规则约束）、下载并校验签名、原子安装到 versions 目录、更新启动器链接；持版本锁防并发。
 */
//@ chunk-zw17mz74.js:28632-34601 fingerprint = updateLatest (0.53)
async function updateLatest(channelOrVersion, forceReinstall = !1) {
  let startTime = Date.now(),
    { executable: executablePath } = getBaseDirectories(),
    h = !/^v?\d+\.\d+\.\d+(-\S+)?$/.test(channelOrVersion),
    { maxVersion: maxVersion, forceDowngradeEnabled: forceDowngradeEnabled } =
      await resolveMaxVersionConfig(),
    y =
      forceDowngradeEnabled &&
      !forceReinstall &&
      h &&
      !!maxVersion &&
      isForceDowngradeActive(
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
        maxVersion,
        "native_update",
      ),
    S = y ? maxVersion : await getLatestVersion(channelOrVersion),
    R = S.length;
  if (!hto(S))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid version string from ${h ? "version pointer" : "argument"}: not a well-formed version (${R} characters)`,
      "Invalid version string: not a well-formed version",
    );
  logForDebugging(`Checking for native installer update to version ${S}`);
  let F = h && (await isNativeInstallPresent());
  if (channelOrVersion === "latest" && !y) {
    let x = getCanaryVersion(),
      M = x && maxVersion && gt_2(x, maxVersion);
    if (x && gt_2(x, S) && !M)
      (logForDebugging(`Native installer: canary ${x} active, overriding ${S}`), (S = x));
    else if (M)
      logForDebugging(`Native installer: canary ${x} exceeds maxVersion ${maxVersion}, not applying`);
  }
  if (!y && !forceReinstall && maxVersion && gt_2(S, maxVersion)) {
    if (
      (logForDebugging(
        `Native installer: maxVersion ${maxVersion} is set, capping update from ${S} to ${maxVersion}`,
      ),
      gte(
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
        maxVersion,
      ))
    )
      return (
        logForDebugging(
          `Native installer: current version ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} is already at or above maxVersion ${maxVersion}, skipping update`,
        ),
        logEvent("tengu_native_update_skipped_max_version", {
          latency_ms: Date.now() - startTime,
          max_version: sanitizeVersion(maxVersion),
          available_version: sanitizeVersion(S),
        }),
        { success: !0, wasSkipped: !0, latestVersion: S }
      );
    S = maxVersion;
  }
  if (
    !forceReinstall &&
    S ===
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION &&
    (await versionIsAvailable(S)) &&
    (await isExecutableFile(executablePath))
  )
    return (
      logForDebugging(`Found ${S} at ${executablePath}, skipping install`),
      logEvent("tengu_native_update_complete", {
        latency_ms: Date.now() - startTime,
        was_new_install: !1,
        was_force_reinstall: !1,
        was_already_running: !0,
      }),
      { success: !0, wasSkipped: !0, latestVersion: S }
    );
  if (!forceReinstall && shouldSkipVersion(S))
    return (
      logEvent("tengu_native_update_skipped_minimum_version", {
        latency_ms: Date.now() - startTime,
        target_version: sanitizeVersion(S),
      }),
      { success: !0, wasSkipped: !0, latestVersion: S }
    );
  if (y)
    logEvent("tengu_native_update_forced_downgrade", {
      from_version: sanitizeVersion(
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
      ),
      to_version: sanitizeVersion(S),
    });
  let I = !1,
    O = !1,
    L = !1,
    D = !1,
    A = !1,
    P;
  if (isEnvTruthy("true"))
    (({
      wasNewInstall: I,
      moveRetried: O,
      activationFailed: L,
      activationRefused: D,
      skippedUnverifiedRelease: A,
    } = await performVersionUpdate(S, {
      forceReinstall: forceReinstall,
      explicitVersionRequested: !h,
      requireEnforcingRelease: F,
    })),
      (P = Date.now() - startTime));
  else {
    let { installPath: installPath } = await getVersionPaths(S);
    if (forceReinstall) await forceRemoveLock(installPath);
    let lockAcquired = await tryWithVersionLock(
      installPath,
      async () => {
        ({
          wasNewInstall: I,
          moveRetried: O,
          activationFailed: L,
          activationRefused: D,
          skippedUnverifiedRelease: A,
        } = await performVersionUpdate(S, {
          forceReinstall: forceReinstall,
          explicitVersionRequested: !h,
          requireEnforcingRelease: F,
        }));
      },
      3,
    );
    if (((P = Date.now() - startTime), !lockAcquired)) {
      let dirs = getBaseDirectories(),
        V;
      if (me()) {
        let lockfilePath = getLockFilePathFromVersionPath(dirs, installPath);
        if (isLockActive(lockfilePath)) V = readLockContent(lockfilePath)?.pid;
      }
      return (
        logFeatureSad("update_apply", "update_apply_native_lock_failed"),
        logEvent("tengu_native_update_lock_failed", { latency_ms: P, lock_holder_pid: V }),
        { success: !1, latestVersion: S, lockFailed: !0, lockHolderPid: V }
      );
    }
  }
  if (A)
    return (
      logEvent("tengu_native_update_skipped_unverified_release", {
        latency_ms: P,
        target_version: sanitizeVersion(S),
      }),
      logForDebugging(
        `Native installer: resolved ${S} predates manifest signature enforcement; staying on ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}`,
        { level: "warn" },
      ),
      { success: !0, wasSkipped: !0, skippedUnverifiedRelease: !0, latestVersion: S }
    );
  if (L) logFeatureSad("update_apply", "update_apply_native_activation_failed_old_binary_kept");
  else if (D) logFeatureSad("update_apply", "update_apply_native_activation_refused_external_launcher");
  else if (O) logFeatureSad("update_apply", "update_apply_native_move_retry");
  else logFeatureOk("update_apply");
  return (
    logEvent("tengu_native_update_complete", {
      latency_ms: P,
      was_new_install: I,
      was_force_reinstall: forceReinstall,
    }),
    logForDebugging(`Successfully updated to version ${S}`),
    { success: !0, latestVersion: S }
  );
}
//@ chunk-zw17mz74.js:34601-34790 fingerprint = removeDirectoryIfEmpty (1)
async function removeDirectoryIfEmpty(path) {
  try {
    (await rmdir(path), logForDebugging(`Removed empty directory at ${path}`));
  } catch (error) {
    let code = getErrnoCode(error);
    if (code !== "ENOTDIR" && code !== "ENOENT" && code !== "ENOTEMPTY")
      logForDebugging(`Could not remove directory at ${path}: ${error}`);
  }
}
//@ chunk-zw17mz74.js:34790-36884 fingerprint = updateSymlink (0.619)
async function updateSymlink(e, n, { expectedChecksum: expectedChecksum } = {}) {
  if (getPlatform().startsWith("win32"))
    try {
      let parentDir = dirname(e);
      await mkdir(parentDir, { recursive: !0 });
      let S;
      try {
        S = await stat(e);
      } catch {}
      if (S)
        try {
          let targetStats = await stat(n);
          if (
            S.size === targetStats.size &&
            (expectedChecksum === void 0 || (await fileMatchesChecksum(e, expectedChecksum)))
          )
            return "noop";
        } catch {}
      let oldFileName = `${e}.new.${process.pid}.${Date.now()}.${randomBytes(4).toString("hex")}`;
      try {
        await copyFile(n, oldFileName);
      } catch (copyError) {
        if (isENOENT(copyError)) throw Error(`Source file does not exist: ${n}`);
        throw copyError;
      }
      let F;
      try {
        F = expectedChecksum === void 0 || (await sha256File(oldFileName)) === expectedChecksum;
      } catch (restoreError) {
        throw (await unlink(oldFileName).catch(() => {}), restoreError);
      }
      if (!F)
        return (
          await unlink(oldFileName).catch(() => {}),
          logForDebugging(
            `Refusing to install a launcher copy of ${n} that does not match its signed checksum`,
            { level: "error" },
          ),
          "failed"
        );
      try {
        let I = S !== void 0;
        if (!I)
          try {
            await rename(oldFileName, e);
          } catch (error) {
            let L = getErrnoCode(error);
            if (L !== "EEXIST" && L !== "EPERM" && L !== "EBUSY") throw error;
            I = !0;
          }
        if (I) {
          let O = backupPathFor(e);
          await rename(e, O);
          try {
            await rename(oldFileName, e);
          } catch (error) {
            try {
              await rename(O, e);
            } catch (mkdirError) {
              let resolvedCurrentTarget = Error(`Failed to restore old executable: ${mkdirError}`, {
                cause: error,
              });
              throw (logError(resolvedCurrentTarget), resolvedCurrentTarget);
            }
            throw error;
          }
        }
      } catch (error) {
        throw (await unlink(oldFileName).catch(() => {}), error);
      }
      return "updated";
    } catch (error) {
      return (
        logForDebugging(`Failed to copy executable from ${n} to ${e}: ${error}`, { level: "error" }),
        "failed"
      );
    }
  let resolvedTargetPath = dirname(e);
  try {
    (await mkdir(resolvedTargetPath, { recursive: !0 }),
      logForDebugging(`Created directory ${resolvedTargetPath} for symlink`));
  } catch (error) {
    return (
      logForDebugging(`Failed to create directory ${resolvedTargetPath}: ${error}`, { level: "error" }),
      "failed"
    );
  }
  try {
    return (await symlink(n, e), logForDebugging(`Created symlink ${e} -> ${n}`), "updated");
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST")
      return (
        logForDebugging(`Failed to create symlink from ${e} to ${n}: ${error}`, { level: "error" }),
        "failed"
      );
  }
  if (!(await isInstallLinkOrMissing(e)) && !(await isNpmSymlink(e).catch(() => !1)))
    return (
      logForDebugging(
        `Not replacing ${e}: it was not created by the native installer (not a symlink into a claude/versions/ directory) and is not an npm shim, so this update will not overwrite it. New versions still install under the versions/ directory; remove ${e} and re-run the update to let the installer manage the launcher again.`,
        { level: "warn" },
      ),
      "refused"
    );
  let tempSymlink = `${e}.tmp.${process.pid}.${Date.now()}`;
  try {
    return (
      await symlink(n, tempSymlink),
      await rename(tempSymlink, e),
      logForDebugging(`Atomically updated symlink ${e} -> ${n}`),
      "updated"
    );
  } catch (error) {
    try {
      await unlink(tempSymlink);
    } catch {}
    return (
      logForDebugging(`Failed to create symlink from ${e} to ${n}: ${error}`, { level: "error" }),
      "failed"
    );
  }
}
/**
 * checkInstall：原生安装的健康检查（启动器存在、PATH、多重安装等），返回问题列表供 doctor/提示。
 */
//@ chunk-zw17mz74.js:36884-38900 facade-exports = checkInstall (0.623)
async function checkInstall(force = !1) {
  if (isEnvTruthy(process.env.DISABLE_INSTALLATION_CHECKS)) return [];
  let installationType = await getCurrentInstallationTypeProbed();
  if (installationType === "development") return [];
  let config = getGlobalConfig();
  if (!(force || installationType === "native" || config.installMethod === "native")) return [];
  let dirs = getBaseDirectories(),
    w = [],
    b = [],
    localBinDir = dirname(dirs.executable),
    resolvedLocalBinPath = resolve(localBinDir),
    isWindows = getPlatform().startsWith("win32");
  try {
    await access(localBinDir);
  } catch {
    (w.push({
      message: `claude command at ${dirs.executable} missing or broken (${localBinDir} does not exist)`,
      userActionRequired: !0,
      type: "error",
    }),
      b.push("bin_dir_missing"));
  }
  if (isWindows) {
    if (!(await isExecutableFile(dirs.executable)))
      (w.push({
        message: `claude command at ${dirs.executable} missing or broken`,
        userActionRequired: !0,
        type: "error",
      }),
        b.push("executable_missing"));
  } else
    try {
      let target = await readlink(dirs.executable),
        absoluteTarget = resolve(dirname(dirs.executable), target);
      if (!(await isExecutableFile(absoluteTarget)))
        (w.push({
          message: `claude command at ${dirs.executable} missing or broken (symlink points to ${target})`,
          userActionRequired: !0,
          type: "error",
        }),
          b.push("executable_invalid"));
    } catch (error) {
      if (isENOENT(error))
        (w.push({
          message: `claude command at ${dirs.executable} missing or broken`,
          userActionRequired: !0,
          type: "error",
        }),
          b.push("executable_missing"));
      else if (!(await isExecutableFile(dirs.executable)))
        (w.push({
          message: `claude command at ${dirs.executable} missing or broken (not a valid Claude binary)`,
          userActionRequired: !0,
          type: "error",
        }),
          b.push("executable_invalid"));
    }
  if (
    !(env.PATH || "").split(delimiter).some((entry) => {
      try {
        let resolvedEntry = resolve(entry);
        if (isWindows) return resolvedEntry.toLowerCase() === resolvedLocalBinPath.toLowerCase();
        return resolvedEntry === resolvedLocalBinPath;
      } catch {
        return !1;
      }
    })
  )
    if ((b.push("not_in_path"), isWindows)) {
      let replaced = localBinDir.replaceAll("/", "\\");
      w.push({
        message: `Native installation exists but ${replaced} is not in your PATH. Add it by opening: System Properties \u2192 Environment Variables \u2192 Edit User PATH \u2192 New \u2192 Add the path above. Then restart your terminal.`,
        userActionRequired: !0,
        type: "path",
      });
    } else {
      let shellType = getShellType(),
        configFile = getShellConfigPaths()[shellType],
        displayPath = configFile ? configFile.replace(homedir(), "~") : "your shell config file";
      w.push({
        message: `Native installation exists but ~/.local/bin is not in your PATH. Run:

echo 'export PATH="$HOME/.local/bin:$PATH"' >> ${displayPath} && source ${displayPath}`,
        userActionRequired: !0,
        type: "path",
      });
    }
  if (b.length === 0) logFeatureOk("native_check_install");
  else logFeatureSad("native_check_install", b[0]);
  return w;
}
//@ chunk-zw17mz74.js:38900-38976 layout
class InFlightInstall {
  inFlight = null;
  begin(e) {
    this.inFlight = e;
  }
  reset() {
    this.inFlight = null;
  }
}
//@ chunk-zw17mz74.js:38976-39001 layout
var installLatestInFlight = new HostScoped(() => new InFlightInstall());
/**
 * installLatest：合并同进程内并发调用（in-flight）后调用 installLatestImpl。
 */
//@ chunk-zw17mz74.js:39001-39213 facade-exports = installLatest (0.696)
function installLatest(e, n = !1, r) {
  if (n) return installLatestImpl(e, n, r);
  let of = installLatestInFlight.of(getRootSession().host);
  if (of.inFlight) return (logForDebugging("installLatest: joining in-flight call"), of.inFlight);
  let h = installLatestImpl(e, n, r);
  of.begin(h);
  let clear = () => {
    of.reset();
  };
  return (h.then(clear, clear), h);
}
/**
 * installLatestImpl：updateLatest 成功后把 installMethod 设为 native 并关闭旧的自动更新方式。
 */
//@ chunk-zw17mz74.js:39213-39858 fingerprint = installLatestImpl (0.91)
async function installLatestImpl(e, n = !1, r) {
  let updateResult = await updateLatest(e, n);
  if (!updateResult.success)
    return {
      latestVersion: null,
      wasUpdated: !1,
      lockFailed: updateResult.lockFailed,
      lockHolderPid: updateResult.lockHolderPid,
    };
  if (updateResult.skippedUnverifiedRelease)
    return {
      latestVersion: updateResult.latestVersion,
      wasUpdated: !1,
      wasSkipped: !0,
      skippedUnverifiedRelease: !0,
      lockFailed: !1,
    };
  if (getGlobalConfig().installMethod !== "native")
    (await saveGlobalConfig(
      (current) => ({
        ...current,
        installMethod: "native",
        autoUpdates: !1,
        autoUpdatesProtectedForNative: !0,
      }),
      r,
    ),
      logForDebugging(
        'Native installer: Set installMethod to "native" and disabled legacy auto-updater for protection',
      ));
  return (
    cleanupOldVersions(),
    {
      latestVersion: updateResult.latestVersion,
      wasUpdated: updateResult.success && !updateResult.wasSkipped,
      wasSkipped: updateResult.wasSkipped,
      lockFailed: !1,
    }
  );
}
//@ chunk-zw17mz74.js:39858-39958 layout
async function getVersionFromSymlink(e) {
  try {
    let n = await readlink(e),
      r = resolve(dirname(e), n);
    if (await isExecutableFile(r)) return r;
  } catch {}
  return null;
}
//@ chunk-zw17mz74.js:39958-40017 fingerprint = getLockFilePathFromVersionPath (1)
function getLockFilePathFromVersionPath(dirs, versionPath) {
  let versionName = basename(versionPath);
  return join(dirs.locks, `${versionName}.lock`);
}
/**
 * 为正在运行的版本加 PID 锁，防止被清理。
 */
//@ chunk-zw17mz74.js:40017-41163 facade-exports = lockCurrentVersion (0.985)
async function lockCurrentVersion() {
  let dirs = getBaseDirectories();
  if (!process.execPath.includes(dirs.versions)) return;
  let versionPath = resolve(process.execPath);
  try {
    let lockfilePath = getLockFilePathFromVersionPath(dirs, versionPath);
    if ((await mkdir(dirs.locks, { recursive: !0 }), me())) {
      if (!(await acquireProcessLifetimeLock(versionPath, lockfilePath))) {
        (logEvent("tengu_version_lock_failed", { is_pid_based: !0, is_lifetime_lock: !0 }),
          logLockAcquisitionError(versionPath, Error("Lock already held by another process")));
        return;
      }
      (logEvent("tengu_version_lock_acquired", { is_pid_based: !0, is_lifetime_lock: !0 }),
        logForDebugging(`Acquired PID lock on running version: ${versionPath}`));
    } else {
      let release;
      try {
        ((release = await lock(versionPath, {
          stale: VERSION_RETENTION_MS,
          retries: 0,
          lockfilePath: lockfilePath,
          onCompromised: (err) => {
            logForDebugging(`NON-FATAL: Lock on running version was compromised: ${err.message}`, {
              level: "info",
            });
          },
        })),
          logEvent("tengu_version_lock_acquired", { is_pid_based: !1, is_lifetime_lock: !0 }),
          logForDebugging(`Acquired mtime-based lock on running version: ${versionPath}`),
          registerCleanup(async () => {
            try {
              await release?.();
            } catch {}
          }));
      } catch (lockError) {
        if (isENOENT(lockError)) {
          logForDebugging(`Cannot lock current version - file does not exist: ${versionPath}`, {
            level: "info",
          });
          return;
        }
        (logEvent("tengu_version_lock_failed", { is_pid_based: !1, is_lifetime_lock: !0 }),
          logLockAcquisitionError(versionPath, lockError));
        return;
      }
    }
  } catch (error) {
    if (isENOENT(error)) {
      logForDebugging(`Cannot lock current version - file does not exist: ${versionPath}`, { level: "info" });
      return;
    }
    logForDebugging(`NON-FATAL: Failed to lock current version during execution ${errorMessage(error)}`, {
      level: "info",
    });
  }
}
//@ chunk-zw17mz74.js:41163-41292 fingerprint = logLockAcquisitionError (0.667)
function logLockAcquisitionError(versionPath, lockError) {
  logForDebugging(
    `NON-FATAL: Lock acquisition failed for ${versionPath} (expected in multi-process scenarios): ${errorMessage(lockError)}`,
    { level: "error" },
  );
}
//@ chunk-zw17mz74.js:41292-41443 fingerprint = forceRemoveLock (1)
async function forceRemoveLock(versionFilePath) {
  let dirs = getBaseDirectories(),
    lockfilePath = getLockFilePathFromVersionPath(dirs, versionFilePath);
  try {
    (await unlink(lockfilePath), logForDebugging(`Force-removed lock file at ${lockfilePath}`));
  } catch (error) {
    logForDebugging(`Failed to force-remove lock file: ${errorMessage(error)}`);
  }
}
//@ chunk-zw17mz74.js:41443-41458 layout
var STALE_STAGING_MS = 3600000;
//@ chunk-zw17mz74.js:41458-41862 layout
async function cleanupOldStagingDirs(e) {
  let n = Date.now() - STALE_STAGING_MS;
  try {
    let r = await readdir(e),
      s = 0;
    for (let h of r) {
      let w = join(e, h);
      try {
        if ((await stat(w)).mtime.getTime() < n)
          (await rm(w, { recursive: !0, force: !0 }),
            s++,
            logForDebugging(`Cleaned up old staging directory: ${h}`));
      } catch {}
    }
    if (s > 0)
      (logForDebugging(`Cleaned up ${s} orphaned staging directories`),
        logEvent("tengu_native_staging_cleanup", { cleaned_count: s }));
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`Failed to clean up staging directories: ${error}`);
  }
}
/**
 * 清理旧版本：保留最近版本、删除过期 staging/备份与陈旧锁（Windows 处理 .old 可执行文件）。
 */
//@ chunk-zw17mz74.js:41862-45559 facade-exports = cleanupOldVersions (0.763)
async function cleanupOldVersions() {
  await Promise.resolve();
  let dirs = getBaseDirectories(),
    n = Date.now() - 3600000,
    r = Date.now() - 1209600000,
    s = Date.now() - BACKUP_RETENTION_MS;
  if (getPlatform().startsWith("win32")) {
    let executableDir = dirname(dirs.executable),
      S = basename(dirs.executable);
    try {
      let files = await readdir(executableDir),
        flattened = files.flatMap((P) => {
          let x = parseBackupOrStagedName(P, S);
          return x === void 0 ? [] : [{ file: P, ...x }];
        }),
        sorted = flattened.filter((P) => P.kind === "backup").sort((P, x) => x.stampedMs - P.stampedMs),
        found = files.find((P) => P.toLowerCase() === S.toLowerCase()),
        L = sorted.length > 0 && !(found !== void 0 && (await isNonEmptyFile(join(executableDir, found)))),
        D = L ? await findFirstExistingFile(sorted, (P) => join(executableDir, P.file)) : void 0,
        A = 0;
      for (let file of flattened) {
        if (file.kind === "backup" && L && ((file === D && file.stampedMs >= s) || file.stampedMs >= r))
          continue;
        try {
          let x = join(executableDir, file.file);
          if (file.stampedMs >= n || (await stat(x)).mtime.getTime() >= n) continue;
          (await unlink(x), A++);
        } catch {}
      }
      if (A > 0) logForDebugging(`Cleaned up ${A} old Windows executables on startup`);
    } catch (error) {
      if (!isENOENT(error)) logForDebugging(`Failed to clean up old Windows executables: ${error}`);
    }
  }
  if ((await cleanupOldStagingDirs(dirs.staging), me())) {
    let stagingEntries = await cleanupStaleLocks(dirs.locks);
    if (stagingEntries > 0)
      (logForDebugging(`Cleaned up ${stagingEntries} stale version locks`),
        logEvent("tengu_native_stale_locks_cleanup", { cleaned_count: stagingEntries }));
  }
  let versionEntries;
  try {
    versionEntries = await readdir(dirs.versions);
  } catch (error) {
    if (!isENOENT(error))
      (logForDebugging(`Failed to readdir versions directory: ${error}`),
        logFeatureSad("native_cleanup_versions", "readdir_failed"));
    else logFeatureOk("native_cleanup_versions");
    return;
  }
  let versionFiles = [],
    b = 0;
  for (let entry of versionEntries) {
    let entryPath = join(dirs.versions, entry);
    if (/\.tmp\.\d+\.\d+(\.\d+)?$/.test(entry)) {
      try {
        if ((await stat(entryPath)).mtime.getTime() < n)
          (await unlink(entryPath), b++, logForDebugging(`Cleaned up orphaned temp install file: ${entry}`));
      } catch {}
      continue;
    }
    try {
      let stats = await stat(entryPath);
      if (!stats.isFile()) continue;
      if (stats.size > 0 && (stats.mode & 73) === 0) continue;
      versionFiles.push({
        name: entry,
        path: entryPath,
        resolvedPath: resolve(entryPath),
        mtime: stats.mtime,
        size: stats.size,
      });
    } catch {}
  }
  if (b > 0)
    (logForDebugging(`Cleaned up ${b} orphaned temp install files`),
      logEvent("tengu_native_temp_files_cleanup", { cleaned_count: b }));
  if (versionFiles.length === 0) {
    logFeatureOk("native_cleanup_versions");
    return;
  }
  if (
    !(await isInstallLinkOrMissing(dirs.executable)) &&
    !(await isNpmSymlink(dirs.executable).catch(() => !1))
  ) {
    (logForDebugging(
      `Skipping native version cleanup: the launcher at ${dirs.executable} is externally managed, so the version(s) it needs cannot be determined`,
    ),
      logFeatureSad("native_cleanup_versions", "skipped_external_launcher"));
    return;
  }
  try {
    let currentBinaryPath = process.execPath,
      protectedVersions = new Set();
    if (currentBinaryPath && currentBinaryPath.includes(dirs.versions))
      protectedVersions.add(resolve(currentBinaryPath));
    let currentSymlinkVersion = await getVersionFromSymlink(dirs.executable);
    if (currentSymlinkVersion) protectedVersions.add(currentSymlinkVersion);
    else if (getPlatform().startsWith("win32"))
      try {
        let A = await stat(dirs.executable);
        for (let P of versionFiles) if (P.size === A.size) protectedVersions.add(P.resolvedPath);
      } catch {}
    for (let A of versionFiles) {
      if (protectedVersions.has(A.resolvedPath)) continue;
      let lockFilePath = getLockFilePathFromVersionPath(dirs, A.resolvedPath),
        x = !1;
      if (me()) x = isLockActive(lockFilePath);
      else
        try {
          x = await checkLockfile(A.resolvedPath, {
            stale: VERSION_RETENTION_MS,
            lockfilePath: lockFilePath,
          });
        } catch {
          x = !1;
        }
      if (x)
        (protectedVersions.add(A.resolvedPath),
          logForDebugging(`Protecting locked version from cleanup: ${A.name}`));
      await new Promise((M) => setImmediate(M));
    }
    let eligibleVersions = versionFiles
        .filter((A) => !protectedVersions.has(A.resolvedPath))
        .sort((A, P) => P.mtime.getTime() - A.mtime.getTime()),
      I = [
        ...eligibleVersions.filter((A) => A.size > 0).slice(VERSION_RETENTION_COUNT),
        ...eligibleVersions.filter((A) => A.size === 0 && A.mtime.getTime() < n),
      ];
    if (I.length === 0) {
      (logEvent("tengu_native_version_cleanup", {
        total_count: versionFiles.length,
        deleted_count: 0,
        protected_count: protectedVersions.size,
        retained_count: VERSION_RETENTION_COUNT,
        lock_failed_count: 0,
        error_count: 0,
      }),
        logFeatureOk("native_cleanup_versions"));
      return;
    }
    let O = 0,
      L = 0,
      D = 0;
    if (
      (await Promise.all(
        I.map(async (version) => {
          try {
            let P = !0,
              deleted = await tryWithVersionLock(version.path, async () => {
                if (version.size === 0) {
                  let M = await stat(version.path);
                  if (M.size > 0 || M.mtime.getTime() >= n) {
                    P = !1;
                    return;
                  }
                }
                await unlink(version.path);
              });
            if (deleted && P) O++;
            else if (!deleted)
              (L++, logForDebugging(`Skipping deletion of ${version.name} - locked by another process`));
          } catch (error) {
            (D++, logForDebugging(`Failed to delete version ${version.name}: ${error}`, { level: "error" }));
          }
        }),
      ),
      logEvent("tengu_native_version_cleanup", {
        total_count: versionFiles.length,
        deleted_count: O,
        protected_count: protectedVersions.size,
        retained_count: VERSION_RETENTION_COUNT,
        lock_failed_count: L,
        error_count: D,
      }),
      D > 0)
    )
      logFeatureSad("native_cleanup_versions", "delete_errors");
    else if (L > 0) logFeatureSad("native_cleanup_versions", "lock_failed");
    else logFeatureOk("native_cleanup_versions");
  } catch (error) {
    if (!isENOENT(error))
      (logError(Error(`Version cleanup failed: ${error}`)),
        logFeatureSad("native_cleanup_versions", "unexpected_error"));
    else logFeatureOk("native_cleanup_versions");
  }
}
/**
 * 删除原生安装器创建的 claude 启动器（npm 管理的不动）。
 */
//@ chunk-zw17mz74.js:45559-46158 facade-exports = removeInstalledSymlink (0.746)
async function removeInstalledSymlink() {
  let dirs = getBaseDirectories();
  try {
    if (
      await isNpmSymlink(dirs.executable).catch((n) => {
        if (isENOENT(n)) return !1;
        throw n;
      })
    ) {
      (logForDebugging(`Skipping removal of ${dirs.executable} - appears to be npm-managed`),
        logFeatureOk("native_remove_symlink"));
      return;
    }
    if (!(await isInstallLinkOrMissing(dirs.executable))) {
      (logForDebugging(`Skipping removal of ${dirs.executable} - not created by the native installer`),
        logFeatureOk("native_remove_symlink"));
      return;
    }
    (await unlink(dirs.executable),
      logForDebugging(`Removed claude symlink at ${dirs.executable}`),
      logFeatureOk("native_remove_symlink"));
  } catch (error) {
    if (isENOENT(error)) {
      logFeatureOk("native_remove_symlink");
      return;
    }
    (logForDebugging(`Failed to remove claude symlink: ${error}`, { level: "error" }),
      logFeatureBad("native_remove_symlink", "unlink_failed"));
  }
}
/**
 * 从 shell 配置文件删除旧的 claude alias。
 */
//@ chunk-zw17mz74.js:46158-46744 facade-exports = cleanupShellAliases (0.822)
async function cleanupShellAliases() {
  let messages = [],
    configMap = getShellConfigPaths(),
    r = !1;
  for (let [s, h] of Object.entries(configMap))
    try {
      let lines = await readFileLinesOrNull(h);
      if (!lines) continue;
      let { filtered: filtered, hadAlias: hadAlias } = filterClaudeAliases(lines);
      if (hadAlias)
        (await writeFileLines(h, filtered),
          messages.push({
            message: `Removed claude alias from ${h}. Run: unalias claude`,
            userActionRequired: !0,
            type: "alias",
          }),
          logForDebugging(`Cleaned up claude alias from ${s} config`));
    } catch (error) {
      ((r = !0),
        logForDebugging(`Failed to clean up claude alias from ${h}: ${error}`, { level: "error" }),
        messages.push({
          message: `Failed to clean up ${h}: ${error}`,
          userActionRequired: !1,
          type: "error",
        }));
    }
  if (r) logFeatureSad("native_cleanup_aliases", "config_write_failed");
  else logFeatureOk("native_cleanup_aliases");
  return messages;
}
//@ chunk-zw17mz74.js:46744-47726 fingerprint = manualRemoveNpmPackage (0.99)
async function manualRemoveNpmPackage(packageName) {
  try {
    let n = await execFileNoThrowWithCwd("npm", ["config", "get", "prefix"], { useToolMemoryCgroup: !1 });
    if (n.code !== 0 || !n.stdout) return { success: !1, error: "Failed to get npm global prefix" };
    let globalPrefix = n.stdout.trim(),
      s = !1;
    async function tryRemove(filePath, description) {
      try {
        return (await unlink(filePath), logForDebugging(`Manually removed ${description}: ${filePath}`), !0);
      } catch {
        return !1;
      }
    }
    if (getPlatform().startsWith("win32")) {
      let binCmd = join(globalPrefix, "claude.cmd"),
        binPs1 = join(globalPrefix, "claude.ps1"),
        binExe = join(globalPrefix, "claude");
      if (await tryRemove(binCmd, "bin script")) s = !0;
      if (await tryRemove(binPs1, "PowerShell script")) s = !0;
      if (await tryRemove(binExe, "bin executable")) s = !0;
    } else {
      let binSymlink = join(globalPrefix, "bin", "claude");
      if (await tryRemove(binSymlink, "bin symlink")) s = !0;
    }
    if (s) {
      logForDebugging(`Successfully removed ${packageName} manually`);
      let nodeModulesPath = getPlatform().startsWith("win32")
        ? join(globalPrefix, "node_modules", packageName)
        : join(globalPrefix, "lib", "node_modules", packageName);
      return {
        success: !0,
        warning: `${packageName} executables removed, but node_modules directory was left intact for safety. You may manually delete it later at: ${nodeModulesPath}`,
      };
    } else return { success: !1 };
  } catch (manualError) {
    return (
      logForDebugging(`Manual removal failed: ${manualError}`, { level: "error" }),
      { success: !1, error: `Manual removal failed: ${manualError}` }
    );
  }
}
//@ chunk-zw17mz74.js:47726-48515 fingerprint = attemptNpmUninstall (0.979)
async function attemptNpmUninstall(packageName) {
  let { code: code, stderr: stderr } = await execFileNoThrowWithCwd("npm", ["uninstall", "-g", packageName], {
    cwd: process.cwd(),
    useToolMemoryCgroup: !1,
  });
  if (code === 0)
    return (logForDebugging(`Removed global npm installation of ${packageName}`), { success: !0 });
  else if (stderr && !stderr.includes("npm ERR! code E404")) {
    if (stderr.includes("npm error code ENOTEMPTY")) {
      (logForDebugging(`Failed to uninstall global npm package ${packageName}: ${stderr}`, {
        level: "error",
      }),
        logForDebugging("Attempting manual removal due to ENOTEMPTY error"));
      let manualResult = await manualRemoveNpmPackage(packageName);
      if (manualResult.success) return { success: !0, warning: manualResult.warning };
      else if (manualResult.error)
        return {
          success: !1,
          error: `Failed to remove global npm installation of ${packageName}: ${stderr}. Manual removal also failed: ${manualResult.error}`,
        };
    }
    return (
      logForDebugging(`Failed to uninstall global npm package ${packageName}: ${stderr}`, { level: "error" }),
      { success: !1, error: `Failed to remove global npm installation of ${packageName}: ${stderr}` }
    );
  }
  return { success: !1 };
}
/**
 * 迁移到原生安装后卸载全局 npm 包（@anthropic-ai/claude-code 等）。
 */
//@ chunk-zw17mz74.js:48515-50843 facade-exports = cleanupNpmInstallations (0.538)
async function cleanupNpmInstallations() {
  let e = [],
    n = [],
    removed = 0,
    s = !1,
    h = !1,
    codePackageResult = await attemptNpmUninstall("@anthropic-ai/claude-code");
  if (codePackageResult.success) {
    if ((removed++, codePackageResult.warning)) n.push(codePackageResult.warning);
  } else if (codePackageResult.error) (e.push(codePackageResult.error), (s = !0));
  if (
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.PACKAGE_URL &&
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.PACKAGE_URL !== "@anthropic-ai/claude-code"
  ) {
    let macroPackageResult = await attemptNpmUninstall(
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.PACKAGE_URL,
    );
    if (macroPackageResult.success) {
      if ((removed++, macroPackageResult.warning)) n.push(macroPackageResult.warning);
    } else if (macroPackageResult.error) (e.push(macroPackageResult.error), (s = !0));
  }
  let localInstallDir = join(homedir(), ".claude", "local");
  try {
    (await rm(localInstallDir, { recursive: !0 }),
      removed++,
      logForDebugging(`Removed local installation at ${localInstallDir}`));
  } catch (error) {
    if (!isENOENT(error))
      (e.push(`Failed to remove ${localInstallDir}: ${error}`),
        logForDebugging(`Failed to remove local installation: ${error}`, { level: "error" }),
        (h = !0));
  }
  if (e.length === 0) logFeatureOk("native_cleanup_npm");
  else if (removed > 0) logFeatureSad("native_cleanup_npm", "partial_errors");
  else if (s && !h) logFeatureBad("native_cleanup_npm", "npm_uninstall_failed");
  else if (h && !s) logFeatureBad("native_cleanup_npm", "local_install_remove_failed");
  else logFeatureBad("native_cleanup_npm", "npm_uninstall_failed");
  return { removed: removed, errors: e, warnings: n };
}
//@ chunk-s61vbvea.js:504239-504287 placement
async function qti(e, n) {
  if (isEssentialTrafficOnly()) return;
  getCachedOrFetchPassesEligibility(e, n);
}
//@ chunk-s61vbvea.js:504426-504505 placement
function Jqr() {
  return env.CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS === !0 && !getSessionBypassPermissionsMode();
}
//@ chunk-s61vbvea.js:504639-504676 placement
var CH = sep_8 + join_17("claude", "versions") + sep_8;
/**
 * 判断安装链接是否存在且指向安装目录（Windows 或不存在时视为是）。
 */
//@ chunk-s61vbvea.js:504676-504783 placement
async function isInstallLinkOrMissing(e) {
  if (getPlatform_2() === "windows") return !0;
  try {
    return await isSymlinkIntoInstallDir(e, await lstat_7(e));
  } catch (error) {
    return isENOENT(error);
  }
}
/**
 * 判断路径是否为指向安装目录的符号链接。
 */
//@ chunk-s61vbvea.js:504783-504888 placement
async function isSymlinkIntoInstallDir(e, n) {
  if (!n.isSymbolicLink()) return !1;
  let r = await readlink(e);
  return resolve_9(dirname_6(e), r).includes(CH);
}
/**
 * 启动器是否是 npm 生成的符号链接（指向 .js 或 node_modules）。
 */
//@ chunk-s61vbvea.js:504888-504981 fingerprint = isNpmSymlink (0.912)
async function isNpmSymlink(executablePath) {
  let stats = await realpath_5(executablePath);
  return stats.endsWith(".js") || stats.includes("node_modules");
}
/**
 * 路径是否是可执行的普通文件。
 */
//@ chunk-ch0vxh4c.js:1552-1657 fingerprint = isPossibleClaudeBinary (1)
async function isPossibleClaudeBinary(filePath) {
  try {
    if (!(await stat(filePath)).isFile()) return !1;
    return (await access(filePath, constants.X_OK), !0);
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:617698-617740 fingerprint = atomicMoveToInstallPath (0.508)
function atomicMoveToInstallPath_2(e) {
  return e.includes(".tmp.");
}

export {
  checkInstall,
  lockCurrentVersion,
  cleanupOldVersions,
  Jqr,
  qti,
  isPossibleClaudeBinary,
  atomicMoveToInstallPath_2,
  isInstallLinkOrMissing,
  isNpmSymlink,
  installLatest,
  cleanupNpmInstallations,
  cleanupShellAliases,
  removeInstalledSymlink,
  isSymlinkIntoInstallDir,
  StagedBinaryChecksumError,
  getBinaryName,
  getPlatform,
};
