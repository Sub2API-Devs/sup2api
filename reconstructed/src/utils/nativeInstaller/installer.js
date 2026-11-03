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
import { join, dirname, basename, resolve, delimiter, sep } from "path";
import {
  stat,
  mkdir,
  writeFile,
  utimes,
  copyFile,
  chmod,
  rename,
  unlink,
  readdir,
  rm,
  realpath,
  rmdir,
  symlink,
  access,
  readlink,
  lstat,
} from "fs/promises";
import { constants } from "fs";
import { randomBytes } from "crypto";
import { homedir } from "os";
import { Re } from "../../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../../vendor/semver/index.js";
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
  isAutoUpdateEnabled,
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
import { isSemverVersion } from "../model/modelCatalog/catalogCapabilities.js";
import { semverGte, semverGt } from "../semver.js";
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
var semver = Re(require_semver_3(), 1);
//@ chunk-zw17mz74.js:2073-2083 affinity
var FORCE_ARM64 = false;
//@ chunk-zw17mz74.js:2083-2410 fingerprint = getPlatform (0.712)
/**
 * 原生安装器的平台标识（linux-x64、darwin-arm64、win32-x64…，含 musl/Android 判断）；316 linux 构建架构固定 x64。
 */
function getPlatform() {
  let os = env.platform;
  let arch = "x64";
  if (!arch) {
    let error = Error("Unsupported architecture: x64");
    logForDebugging("Native installer does not support architecture: x64", {
      level: "error",
    });
    throw error;
  }
  if (FORCE_ARM64) arch = "arm64";
  if (os === "linux") {
    if (envDynamicProbe.isAndroidEnvironment()) return `linux-${arch}-android`;
    if (envDynamicProbe.isMuslEnvironment()) return `linux-${arch}-musl`;
  }
  return `${os}-${arch}`;
}
//@ chunk-zw17mz74.js:20027-20049 affinity
var VERSION_RETENTION_COUNT = 2;
var VERSION_RETENTION_MS = 604800000;
//@ chunk-zw17mz74.js:20049-20116 facade-exports = getBinaryName (1)
/**
 * 原生二进制文件名：Windows 为 claude.exe，否则 claude。
 */
function getBinaryName(platform) {
  return platform.startsWith("win32") ? "claude.exe" : "claude";
}
//@ chunk-zw17mz74.js:20116-20260 fingerprint = getBaseDirectories (0.9)
/**
 * 原生安装目录：versions、staging、locks 与启动器可执行文件路径（~/.local/bin/claude）。
 */
function getBaseDirectories() {
  let platform = getPlatform();
  let executableName = getBinaryName(platform);
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
    () => false,
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
function parseBackupOrStagedName(file, n) {
  if (!file.toLowerCase().startsWith(`${n.toLowerCase()}.`)) return;
  let match = /^(?:old\.(\d+)(?:\.(\d+))?|new\.\d+\.(\d+)\.[0-9a-f]+)$/i.exec(file.slice(n.length + 1));
  return match === null
    ? undefined
    : match[1] !== undefined
      ? {
          kind: "backup",
          stampedMs: Number(match[1]),
          ownerPid: match[2] === undefined ? undefined : Number(match[2]),
        }
      : {
          kind: "staged",
          stampedMs: Number(match[3]),
        };
}
//@ chunk-zw17mz74.js:20810-20934 layout
async function isExecutableFile(filePath) {
  try {
    let stats = await stat(filePath);
    if (!stats.isFile() || stats.size === 0) return false;
    return (stats.mode & constants.S_IXUSR) !== 0;
  } catch {
    return false;
  }
}
//@ chunk-zw17mz74.js:20934-21462 fingerprint = getVersionPaths (0.681)
async function getVersionPaths(version) {
  let dirs = getBaseDirectories();
  let dirsToCreate = [dirs.versions, dirs.staging, dirs.locks];
  await Promise.all(
    dirsToCreate.map((dir) =>
      mkdir(dir, {
        recursive: true,
      }),
    ),
  );
  let executableParentDir = dirname(dirs.executable);
  await mkdir(executableParentDir, {
    recursive: true,
  });
  if (!/^[a-zA-Z0-9._+-]+$/.test(version) || version.includes("..") || version === ".")
    throw Error(`Invalid version string "${version}": contains path-unsafe characters`);
  let installPath = join(dirs.versions, version);
  try {
    await writeFile(installPath, "", {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") throw error;
    try {
      if ((await stat(installPath)).size === 0) {
        let date = new Date();
        await utimes(installPath, date, date);
      }
    } catch {}
  }
  return {
    stagingPath: join(dirs.staging, version),
    installPath,
  };
}
//@ chunk-zw17mz74.js:21462-22584 fingerprint = tryWithVersionLock (0.885)
async function tryWithVersionLock(versionFilePath, callback, retries = 0) {
  let dirs = getBaseDirectories();
  let lockfilePath = getLockFilePathFromVersionPath(dirs, versionFilePath);
  await mkdir(dirs.locks, {
    recursive: true,
  });
  if (isAutoUpdateEnabled()) {
    let attempts = 0;
    let maxAttempts = retries + 1;
    let minTimeout = retries > 0 ? 1000 : 100;
    let maxTimeout = retries > 0 ? 5000 : 500;
    while (attempts < maxAttempts) {
      if (
        await withProcessLock(versionFilePath, lockfilePath, async () => {
          try {
            await callback();
          } catch (error) {
            logForDebugging(`Native installer version-lock callback failed: ${error}`, {
              level: "error",
            });
            throw error;
          }
        })
      ) {
        logEvent("tengu_version_lock_acquired", {
          is_pid_based: true,
          is_lifetime_lock: false,
          attempts: attempts + 1,
        });
        return true;
      }
      attempts++;
      if (attempts < maxAttempts) {
        let timeout = Math.min(minTimeout * Math.pow(2, attempts - 1), maxTimeout);
        await sleep(timeout);
      }
    }
    logEvent("tengu_version_lock_failed", {
      is_pid_based: true,
      is_lifetime_lock: false,
      attempts: maxAttempts,
    });
    logLockAcquisitionError(versionFilePath, Error("Lock held by another process"));
    return false;
  }
  let release = null;
  try {
    try {
      release = await lock(versionFilePath, {
        stale: VERSION_RETENTION_MS,
        retries: {
          retries,
          minTimeout: retries > 0 ? 1000 : 100,
          maxTimeout: retries > 0 ? 5000 : 500,
        },
        lockfilePath,
        onCompromised: (err) => {
          logForDebugging(`NON-FATAL: Version lock was compromised during operation: ${err.message}`, {
            level: "info",
          });
        },
      });
    } catch (lockError) {
      logEvent("tengu_version_lock_failed", {
        is_pid_based: false,
        is_lifetime_lock: false,
      });
      logLockAcquisitionError(versionFilePath, lockError);
      return false;
    }
    try {
      await callback();
      logEvent("tengu_version_lock_acquired", {
        is_pid_based: false,
        is_lifetime_lock: false,
      });
      return true;
    } catch (error) {
      logForDebugging(`tryWithVersionLock: callback failed under version lock: ${errorMessage(error)}`, {
        level: "error",
      });
      throw error;
    }
  } finally {
    if (release) await release();
  }
}
//@ chunk-zw17mz74.js:22584-22606 layout
var ATOMIC_MOVE_RETRY_DELAYS_MS = [100, 500, 2000];
//@ chunk-zw17mz74.js:22606-22770 facade-exports
/**
 * staging 中的二进制与校验和不再一致时拒绝安装。
 */
class StagedBinaryChecksumError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor() {
    super(
      "Staged binary no longer matches the verified checksum; refusing to install",
      "Staged binary checksum mismatch at install",
    );
  }
}
//@ chunk-zw17mz74.js:22770-23309 layout
async function atomicMoveToInstallPath(stagedBinaryPath, installPath, r) {
  await mkdir(dirname(installPath), {
    recursive: true,
  });
  let s;
  for (let j = 1; j <= ATOMIC_MOVE_RETRY_DELAYS_MS.length + 1; j++) {
    let w = `${installPath}.tmp.${process.pid}.${Date.now()}.${j}`;
    try {
      await copyFile(stagedBinaryPath, w);
      await chmod(w, 493);
      if (r !== undefined && (await sha256File(w)) !== r) throw new StagedBinaryChecksumError();
      await rename(w, installPath);
      logForDebugging(`Atomically installed binary to ${installPath}` + (j > 1 ? ` (attempt ${j})` : ""));
      return {
        attempts: j,
      };
    } catch (error) {
      s = error;
      try {
        await unlink(w);
      } catch {}
      let errnoCode = getErrnoCode(error);
      let S = errnoCode === "EBUSY" || (errnoCode === "EPERM" && false);
      let R = ATOMIC_MOVE_RETRY_DELAYS_MS[j - 1];
      if (!S || R === undefined) throw error;
      logForDebugging(`atomicMoveToInstallPath attempt ${j} failed with ${errnoCode}; retrying in ${R}ms`);
      await sleep(R);
    }
  }
  throw s;
}
//@ chunk-zw17mz74.js:23309-24418 fingerprint = installVersionFromPackage (0.811)
async function installVersionFromPackage(stagingPath, installPath, r) {
  try {
    let nodeModulesDir = join(stagingPath, "node_modules", "@anthropic-ai");
    let nativePackage = (await readdir(nodeModulesDir)).find((entry) =>
      entry.startsWith("claude-cli-native-"),
    );
    if (!nativePackage) {
      logEvent("tengu_native_install_package_failure", {
        stage_find_package: true,
        error_package_not_found: true,
      });
      throw Error("Could not find platform-specific native package");
    }
    let stagedBinaryPath = join(nodeModulesDir, nativePackage, "cli");
    try {
      await stat(stagedBinaryPath);
    } catch {
      logEvent("tengu_native_install_package_failure", {
        stage_binary_exists: true,
        error_binary_not_found: true,
      });
      throw Error("Native binary not found in staged package");
    }
    let { attempts } = await atomicMoveToInstallPath(stagedBinaryPath, installPath, r);
    await rm(stagingPath, {
      recursive: true,
      force: true,
    });
    logEvent("tengu_native_install_package_success", {
      install_attempts: attempts,
    });
    return {
      moveRetried: attempts > 1,
    };
  } catch (error) {
    let msg = errorMessage(error);
    if (!(msg.includes("Could not find platform-specific") || msg.includes("Native binary not found"))) {
      logEvent("tengu_native_install_package_failure", {
        stage_atomic_move: true,
        error_move_failed: true,
      });
      logFeatureBad("update_apply", "update_apply_native_move_failed");
      if (isSyscallError(error))
        logForDebugging(`installVersionFromPackage: atomic move failed: ${msg}`, {
          level: "error",
        });
      else logError(toError(error));
    } else {
      logFeatureBad("update_apply", "update_apply_native_staging_missing");
      logForDebugging(`installVersionFromPackage: ${msg}`, {
        level: "error",
      });
    }
    throw error;
  }
}
//@ chunk-zw17mz74.js:24418-25351 fingerprint = installVersionFromBinary (0.618)
async function installVersionFromBinary(stagingPath, installPath, r) {
  try {
    let platform = getPlatform();
    let binaryName = getBinaryName(platform);
    let stagedBinaryPath = join(stagingPath, binaryName);
    try {
      await stat(stagedBinaryPath);
    } catch (error) {
      logEvent("tengu_native_install_binary_failure", {
        stage_binary_exists: true,
        error_binary_not_found: true,
        error_code: sanitizedErrCodeForTelemetry(error),
      });
      throw Error("Staged binary not found");
    }
    let { attempts } = await atomicMoveToInstallPath(stagedBinaryPath, installPath, r);
    await rm(stagingPath, {
      recursive: true,
      force: true,
    });
    logEvent("tengu_native_install_binary_success", {
      install_attempts: attempts,
    });
    return {
      moveRetried: attempts > 1,
    };
  } catch (error) {
    if (error instanceof StagedBinaryChecksumError) {
      logEvent("tengu_native_install_binary_failure", {
        stage_atomic_move: true,
        error_checksum_mismatch: true,
      });
      logFeatureBad("update_apply", "update_apply_staged_checksum_mismatch");
    } else if (!errorMessage(error).includes("Staged binary not found")) {
      logEvent("tengu_native_install_binary_failure", {
        stage_atomic_move: true,
        error_move_failed: true,
        error_code: sanitizedErrCodeForTelemetry(error),
      });
      logFeatureBad("update_apply", "update_apply_native_move_failed");
    } else logFeatureBad("update_apply", "update_apply_native_staging_missing");
    if (isSyscallError(error))
      logForDebugging(`installVersionFromBinary: atomic move failed: ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(toError(error));
    throw error;
  }
}
//@ chunk-zw17mz74.js:25351-25425 fingerprint = installVersion (1)
async function installVersion(stagingPath, installPath, downloadType, checksum) {
  if (downloadType === "npm") return installVersionFromPackage(stagingPath, installPath, checksum);
  return installVersionFromBinary(stagingPath, installPath, checksum);
}
//@ chunk-zw17mz74.js:25425-25451 layout
var versionLockSlots = new HostScoped(() => new Map());
//@ chunk-zw17mz74.js:25451-27799 fingerprint = performVersionUpdate (0.385)
/**
 * performVersionUpdate：下载到 staging、校验、原子移动到安装路径（可复用保留的已下载版本）。
 */
async function performVersionUpdate(
  version,
  { forceReinstall, explicitVersionRequested, requireEnforcingRelease },
) {
  let { stagingPath: baseStagingPath, installPath } = await getVersionPaths(version);
  let { executable: executablePath } = getBaseDirectories();
  let y = isEnvTruthy("true");
  let stagingPath = y
    ? `${baseStagingPath}.${process.pid}.${Date.now()}.${randomBytes(4).toString("hex")}`
    : baseStagingPath;
  let R = versionLockSlots.of(getRootSession().host);
  let F = R.get(version);
  let I = !(F && (F.enforcingRelease || !requireEnforcingRelease));
  let O = {
    wasNewInstall: false,
    moveRetried: false,
    activationFailed: false,
    activationRefused: false,
    skippedUnverifiedRelease: true,
  };
  let checksum = I ? undefined : F?.checksum;
  let needsInstall = forceReinstall || !(await versionIsAvailable(version));
  if (!needsInstall && I)
    try {
      let x = await reverifyRetainedVersion(version, installPath, {
        explicitVersionRequested,
        requireEnforcingRelease,
      });
      checksum = x.expectedChecksum;
      if (!x.binaryMatches) needsInstall = true;
      else if (x.signatureVerified)
        R.set(version, {
          enforcingRelease: requireEnforcingRelease,
          checksum,
        });
    } catch (error) {
      if (error instanceof ManifestSignatureError) {
        if (requireEnforcingRelease && error.reason === "release_predates_enforcement") return O;
        throw error;
      }
      if (!explicitVersionRequested || requireEnforcingRelease || !isRetryableNetworkError(error))
        throw error;
      logForDebugging(
        `Could not re-verify retained ${version} (${toError(error).name}); offline, activating as requested`,
        {
          level: "warn",
        },
      );
    }
  else if (!needsInstall && F?.checksum !== undefined) {
    if (!(await fileMatchesChecksum(installPath, F.checksum))) {
      logForDebugging(
        `Retained ${version} no longer matches the checksum verified earlier in this process; re-downloading`,
        {
          level: "warn",
        },
      );
      R.delete(version);
      needsInstall = true;
    }
  }
  let moveRetried = false;
  if (needsInstall) {
    logForDebugging(
      forceReinstall
        ? `Force reinstalling native installer version ${version}`
        : `Downloading native installer version ${version}`,
    );
    await cleanupOldStagingDirs(dirname(stagingPath));
    let downloadType;
    let M;
    try {
      ({
        downloadType,
        signatureVerified: M,
        expectedChecksum: checksum,
      } = await downloadVersion(version, stagingPath, {
        explicitVersionRequested,
        requireEnforcingRelease,
      }));
      ({ moveRetried } = await installVersion(stagingPath, installPath, downloadType, checksum));
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
        await rm(stagingPath, {
          recursive: true,
          force: true,
        }).catch((error) =>
          logForDebugging(
            `Could not remove the update staging directory (a later update removes it after one hour): ${errorMessage(error)}`,
            {
              level: "warn",
            },
          ),
        );
    }
    if (M)
      R.set(version, {
        enforcingRelease: requireEnforcingRelease,
        checksum,
      });
  } else logForDebugging(`Version ${version} already installed, updating symlink`);
  await removeDirectoryIfEmpty(executablePath);
  let P = await updateSymlink(executablePath, installPath, {
    expectedChecksum: checksum,
  });
  if (P !== "updated" && !(await isExecutableFile(executablePath))) {
    let x = false;
    try {
      await stat(installPath);
      x = true;
    } catch {}
    logFeatureBad("update_apply", "update_apply_native_symlink_failed");
    throw Error(
      `Failed to create executable at ${executablePath}. Source file exists: ${x}. Either ${executablePath} is not writable, or the existing file there was not created by the native installer and is not a working launcher \u2014 the updater will not overwrite a launcher it does not own. Remove it and re-run the update.`,
    );
  }
  return {
    wasNewInstall: needsInstall,
    moveRetried,
    activationFailed: P === "failed",
    activationRefused: P === "refused",
    skippedUnverifiedRelease: false,
  };
}
//@ chunk-zw17mz74.js:27799-27864 fingerprint = versionIsAvailable (1)
async function versionIsAvailable(version) {
  let { installPath } = await getVersionPaths(version);
  return isExecutableFile(installPath);
}
//@ chunk-zw17mz74.js:27864-27977 layout
async function isNativeInstallPresent() {
  if (await isRunningFromVersionsDir()) return true;
  let { executable } = getBaseDirectories();
  return (await isExecutableFile(executable)) && !(await isNpmSymlink(executable).catch(() => false));
}
//@ chunk-zw17mz74.js:27977-28262 layout
async function isRunningFromVersionsDir() {
  let { versions, executable } = getBaseDirectories();
  let r = false;
  let s = [
    {
      versions,
      executable,
    },
  ];
  let [h, w] = await Promise.all([
    realpath(versions).catch(() => versions),
    realpath(dirname(executable)).catch(() => dirname(executable)),
  ]);
  let b = join(w, basename(executable));
  if (h !== versions || b !== executable)
    s.push({
      versions: h,
      executable: b,
    });
  return s.some((y) =>
    isUnderVersionsOrExecutable(process.execPath, {
      ...y,
      isWindows: false,
    }),
  );
}
//@ chunk-zw17mz74.js:28262-28437 layout
function isUnderVersionsOrExecutable(execPath, { versions, executable, isWindows }) {
  let h = (y) => (isWindows ? y.replaceAll("\\", "/").toLowerCase() : y);
  let w = h(execPath);
  let b = h(versions).replace(/\/+$/, "") + "/";
  return w.startsWith(b) || w === h(executable);
}
//@ chunk-zw17mz74.js:28437-28632 layout
function getCanaryVersion() {
  try {
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_canary", {});
    return (
      (typeof featureValue_CACHED_MAY_BE_STALE.external === "string" &&
        semver.valid(featureValue_CACHED_MAY_BE_STALE.external)) ||
      null
    );
  } catch (error) {
    logForDebugging(`getCanaryVersion: GB read failed, falling through: ${errorMessage(error)}`);
    return null;
  }
}
//@ chunk-zw17mz74.js:28632-34601 fingerprint = updateLatest (0.53)
/**
 * updateLatest：取最新版本（受上限/金丝雀/跳过规则约束）、下载并校验签名、原子安装到 versions 目录、更新启动器链接；持版本锁防并发。
 */
async function updateLatest(channelOrVersion, forceReinstall = false) {
  let startTime = Date.now();
  let { executable: executablePath } = getBaseDirectories();
  let h = !/^v?\d+\.\d+\.\d+(-\S+)?$/.test(channelOrVersion);
  let { maxVersion, forceDowngradeEnabled } = await resolveMaxVersionConfig();
  let y =
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
    );
  let version = y ? maxVersion : await getLatestVersion(channelOrVersion);
  let R = version.length;
  if (!isSemverVersion(version))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid version string from ${h ? "version pointer" : "argument"}: not a well-formed version (${R} characters)`,
      "Invalid version string: not a well-formed version",
    );
  logForDebugging(`Checking for native installer update to version ${version}`);
  let requireEnforcingRelease = h && (await isNativeInstallPresent());
  if (channelOrVersion === "latest" && !y) {
    let canaryVersion = getCanaryVersion();
    let M = canaryVersion && maxVersion && semverGte(canaryVersion, maxVersion);
    if (canaryVersion && semverGte(canaryVersion, version) && !M) {
      logForDebugging(`Native installer: canary ${canaryVersion} active, overriding ${version}`);
      version = canaryVersion;
    } else if (M)
      logForDebugging(
        `Native installer: canary ${canaryVersion} exceeds maxVersion ${maxVersion}, not applying`,
      );
  }
  if (!y && !forceReinstall && maxVersion && semverGte(version, maxVersion)) {
    logForDebugging(
      `Native installer: maxVersion ${maxVersion} is set, capping update from ${version} to ${maxVersion}`,
    );
    if (
      semverGt(
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
      )
    ) {
      logForDebugging(
        `Native installer: current version ${
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
          }.VERSION
        } is already at or above maxVersion ${maxVersion}, skipping update`,
      );
      logEvent("tengu_native_update_skipped_max_version", {
        latency_ms: Date.now() - startTime,
        max_version: sanitizeVersion(maxVersion),
        available_version: sanitizeVersion(version),
      });
      return {
        success: true,
        wasSkipped: true,
        latestVersion: version,
      };
    }
    version = maxVersion;
  }
  if (
    !forceReinstall &&
    version ===
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
    (await versionIsAvailable(version)) &&
    (await isExecutableFile(executablePath))
  ) {
    logForDebugging(`Found ${version} at ${executablePath}, skipping install`);
    logEvent("tengu_native_update_complete", {
      latency_ms: Date.now() - startTime,
      was_new_install: false,
      was_force_reinstall: false,
      was_already_running: true,
    });
    return {
      success: true,
      wasSkipped: true,
      latestVersion: version,
    };
  }
  if (!forceReinstall && shouldSkipVersion(version)) {
    logEvent("tengu_native_update_skipped_minimum_version", {
      latency_ms: Date.now() - startTime,
      target_version: sanitizeVersion(version),
    });
    return {
      success: true,
      wasSkipped: true,
      latestVersion: version,
    };
  }
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
      to_version: sanitizeVersion(version),
    });
  let I = false;
  let O = false;
  let L = false;
  let D = false;
  let A = false;
  let latencyMs;
  if (isEnvTruthy("true")) {
    ({
      wasNewInstall: I,
      moveRetried: O,
      activationFailed: L,
      activationRefused: D,
      skippedUnverifiedRelease: A,
    } = await performVersionUpdate(version, {
      forceReinstall,
      explicitVersionRequested: !h,
      requireEnforcingRelease,
    }));
    latencyMs = Date.now() - startTime;
  } else {
    let { installPath } = await getVersionPaths(version);
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
        } = await performVersionUpdate(version, {
          forceReinstall,
          explicitVersionRequested: !h,
          requireEnforcingRelease,
        }));
      },
      3,
    );
    latencyMs = Date.now() - startTime;
    if (!lockAcquired) {
      let dirs = getBaseDirectories();
      let lockHolderPid;
      if (isAutoUpdateEnabled()) {
        let lockfilePath = getLockFilePathFromVersionPath(dirs, installPath);
        if (isLockActive(lockfilePath)) lockHolderPid = readLockContent(lockfilePath)?.pid;
      }
      logFeatureSad("update_apply", "update_apply_native_lock_failed");
      logEvent("tengu_native_update_lock_failed", {
        latency_ms: latencyMs,
        lock_holder_pid: lockHolderPid,
      });
      return {
        success: false,
        latestVersion: version,
        lockFailed: true,
        lockHolderPid,
      };
    }
  }
  if (A) {
    logEvent("tengu_native_update_skipped_unverified_release", {
      latency_ms: latencyMs,
      target_version: sanitizeVersion(version),
    });
    logForDebugging(
      `Native installer: resolved ${version} predates manifest signature enforcement; staying on ${
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
        }.VERSION
      }`,
      {
        level: "warn",
      },
    );
    return {
      success: true,
      wasSkipped: true,
      skippedUnverifiedRelease: true,
      latestVersion: version,
    };
  }
  if (L) logFeatureSad("update_apply", "update_apply_native_activation_failed_old_binary_kept");
  else if (D) logFeatureSad("update_apply", "update_apply_native_activation_refused_external_launcher");
  else if (O) logFeatureSad("update_apply", "update_apply_native_move_retry");
  else logFeatureOk("update_apply");
  logEvent("tengu_native_update_complete", {
    latency_ms: latencyMs,
    was_new_install: I,
    was_force_reinstall: forceReinstall,
  });
  logForDebugging(`Successfully updated to version ${version}`);
  return {
    success: true,
    latestVersion: version,
  };
}
//@ chunk-zw17mz74.js:34601-34790 fingerprint = removeDirectoryIfEmpty (1)
async function removeDirectoryIfEmpty(path) {
  try {
    await rmdir(path);
    logForDebugging(`Removed empty directory at ${path}`);
  } catch (error) {
    let code = getErrnoCode(error);
    if (code !== "ENOTDIR" && code !== "ENOENT" && code !== "ENOTEMPTY")
      logForDebugging(`Could not remove directory at ${path}: ${error}`);
  }
}
//@ chunk-zw17mz74.js:34790-36884 fingerprint = updateSymlink (0.619)
async function updateSymlink(executablePath, installPath, { expectedChecksum } = {}) {
  if (getPlatform().startsWith("win32"))
    try {
      let parentDir = dirname(executablePath);
      await mkdir(parentDir, {
        recursive: true,
      });
      let existingStats;
      try {
        existingStats = await stat(executablePath);
      } catch {}
      if (existingStats)
        try {
          let targetStats = await stat(installPath);
          if (
            existingStats.size === targetStats.size &&
            (expectedChecksum === undefined || (await fileMatchesChecksum(executablePath, expectedChecksum)))
          )
            return "noop";
        } catch {}
      let oldFileName = `${executablePath}.new.${process.pid}.${Date.now()}.${randomBytes(4).toString("hex")}`;
      try {
        await copyFile(installPath, oldFileName);
      } catch (copyError) {
        if (isENOENT(copyError)) throw Error(`Source file does not exist: ${installPath}`);
        throw copyError;
      }
      let F;
      try {
        F = expectedChecksum === undefined || (await sha256File(oldFileName)) === expectedChecksum;
      } catch (restoreError) {
        await unlink(oldFileName).catch(() => {});
        throw restoreError;
      }
      if (!F) {
        await unlink(oldFileName).catch(() => {});
        logForDebugging(
          `Refusing to install a launcher copy of ${installPath} that does not match its signed checksum`,
          {
            level: "error",
          },
        );
        return "failed";
      }
      try {
        let I = existingStats !== undefined;
        if (!I)
          try {
            await rename(oldFileName, executablePath);
          } catch (error) {
            let errnoCode = getErrnoCode(error);
            if (errnoCode !== "EEXIST" && errnoCode !== "EPERM" && errnoCode !== "EBUSY") throw error;
            I = true;
          }
        if (I) {
          let O = backupPathFor(executablePath);
          await rename(executablePath, O);
          try {
            await rename(oldFileName, executablePath);
          } catch (copyError) {
            try {
              await rename(O, executablePath);
            } catch (restoreError) {
              let errorWithCause = Error(`Failed to restore old executable: ${restoreError}`, {
                cause: copyError,
              });
              logError(errorWithCause);
              throw errorWithCause;
            }
            throw copyError;
          }
        }
      } catch (error) {
        await unlink(oldFileName).catch(() => {});
        throw error;
      }
      return "updated";
    } catch (error) {
      logForDebugging(`Failed to copy executable from ${installPath} to ${executablePath}: ${error}`, {
        level: "error",
      });
      return "failed";
    }
  let parentDir = dirname(executablePath);
  try {
    await mkdir(parentDir, {
      recursive: true,
    });
    logForDebugging(`Created directory ${parentDir} for symlink`);
  } catch (mkdirError) {
    logForDebugging(`Failed to create directory ${parentDir}: ${mkdirError}`, {
      level: "error",
    });
    return "failed";
  }
  try {
    await symlink(installPath, executablePath);
    logForDebugging(`Created symlink ${executablePath} -> ${installPath}`);
    return "updated";
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") {
      logForDebugging(`Failed to create symlink from ${executablePath} to ${installPath}: ${error}`, {
        level: "error",
      });
      return "failed";
    }
  }
  if (
    !(await isInstallLinkOrMissing(executablePath)) &&
    !(await isNpmSymlink(executablePath).catch(() => false))
  ) {
    logForDebugging(
      `Not replacing ${executablePath}: it was not created by the native installer (not a symlink into a claude/versions/ directory) and is not an npm shim, so this update will not overwrite it. New versions still install under the versions/ directory; remove ${executablePath} and re-run the update to let the installer manage the launcher again.`,
      {
        level: "warn",
      },
    );
    return "refused";
  }
  let tempSymlink = `${executablePath}.tmp.${process.pid}.${Date.now()}`;
  try {
    await symlink(installPath, tempSymlink);
    await rename(tempSymlink, executablePath);
    logForDebugging(`Atomically updated symlink ${executablePath} -> ${installPath}`);
    return "updated";
  } catch (error) {
    try {
      await unlink(tempSymlink);
    } catch {}
    logForDebugging(`Failed to create symlink from ${executablePath} to ${installPath}: ${error}`, {
      level: "error",
    });
    return "failed";
  }
}
//@ chunk-zw17mz74.js:36884-38900 facade-exports = checkInstall (0.623)
/**
 * checkInstall：原生安装的健康检查（启动器存在、PATH、多重安装等），返回问题列表供 doctor/提示。
 */
async function checkInstall(force = false) {
  if (isEnvTruthy(process.env.DISABLE_INSTALLATION_CHECKS)) return [];
  let installationType = await getCurrentInstallationTypeProbed();
  if (installationType === "development") return [];
  let config = getGlobalConfig();
  if (!(force || installationType === "native" || config.installMethod === "native")) return [];
  let dirs = getBaseDirectories();
  let messages = [];
  let b = [];
  let localBinDir = dirname(dirs.executable);
  let resolvedLocalBinPath = resolve(localBinDir);
  let isWindows = getPlatform().startsWith("win32");
  try {
    await access(localBinDir);
  } catch {
    messages.push({
      message: `claude command at ${dirs.executable} missing or broken (${localBinDir} does not exist)`,
      userActionRequired: true,
      type: "error",
    });
    b.push("bin_dir_missing");
  }
  if (isWindows) {
    if (!(await isExecutableFile(dirs.executable))) {
      messages.push({
        message: `claude command at ${dirs.executable} missing or broken`,
        userActionRequired: true,
        type: "error",
      });
      b.push("executable_missing");
    }
  } else
    try {
      let target = await readlink(dirs.executable);
      let absoluteTarget = resolve(dirname(dirs.executable), target);
      if (!(await isExecutableFile(absoluteTarget))) {
        messages.push({
          message: `claude command at ${dirs.executable} missing or broken (symlink points to ${target})`,
          userActionRequired: true,
          type: "error",
        });
        b.push("executable_invalid");
      }
    } catch (e) {
      if (isENOENT(e)) {
        messages.push({
          message: `claude command at ${dirs.executable} missing or broken`,
          userActionRequired: true,
          type: "error",
        });
        b.push("executable_missing");
      } else if (!(await isExecutableFile(dirs.executable))) {
        messages.push({
          message: `claude command at ${dirs.executable} missing or broken (not a valid Claude binary)`,
          userActionRequired: true,
          type: "error",
        });
        b.push("executable_invalid");
      }
    }
  if (
    !(env.PATH || "").split(delimiter).some((entry) => {
      try {
        let resolvedEntry = resolve(entry);
        if (isWindows) return resolvedEntry.toLowerCase() === resolvedLocalBinPath.toLowerCase();
        return resolvedEntry === resolvedLocalBinPath;
      } catch {
        return false;
      }
    })
  ) {
    b.push("not_in_path");
    if (isWindows) {
      let windowsBinPath = localBinDir.replaceAll("/", "\\");
      messages.push({
        message: `Native installation exists but ${windowsBinPath} is not in your PATH. Add it by opening: System Properties \u2192 Environment Variables \u2192 Edit User PATH \u2192 New \u2192 Add the path above. Then restart your terminal.`,
        userActionRequired: true,
        type: "path",
      });
    } else {
      let shellType = getShellType();
      let configFile = getShellConfigPaths()[shellType];
      let displayPath = configFile ? configFile.replace(homedir(), "~") : "your shell config file";
      messages.push({
        message: `Native installation exists but ~/.local/bin is not in your PATH. Run:

echo 'export PATH="$HOME/.local/bin:$PATH"' >> ${displayPath} && source ${displayPath}`,
        userActionRequired: true,
        type: "path",
      });
    }
  }
  if (b.length === 0) logFeatureOk("native_check_install");
  else logFeatureSad("native_check_install", b[0]);
  return messages;
}
//@ chunk-zw17mz74.js:38900-38976 layout
class InFlightInstall {
  inFlight = null;
  begin(inFlight) {
    this.inFlight = inFlight;
  }
  reset() {
    this.inFlight = null;
  }
}
//@ chunk-zw17mz74.js:38976-39001 layout
var installLatestInFlight = new HostScoped(() => new InFlightInstall());
//@ chunk-zw17mz74.js:39001-39213 facade-exports = installLatest (0.696)
/**
 * installLatest：合并同进程内并发调用（in-flight）后调用 installLatestImpl。
 */
function installLatest(channelOrVersion, forceReinstall = false, storageV5) {
  if (forceReinstall) return installLatestImpl(channelOrVersion, forceReinstall, storageV5);
  let s = installLatestInFlight.of(getRootSession().host);
  if (s.inFlight) {
    logForDebugging("installLatest: joining in-flight call");
    return s.inFlight;
  }
  let promise = installLatestImpl(channelOrVersion, forceReinstall, storageV5);
  s.begin(promise);
  let clear = () => {
    s.reset();
  };
  promise.then(clear, clear);
  return promise;
}
//@ chunk-zw17mz74.js:39213-39858 fingerprint = installLatestImpl (0.91)
/**
 * installLatestImpl：updateLatest 成功后把 installMethod 设为 native 并关闭旧的自动更新方式。
 */
async function installLatestImpl(channelOrVersion, forceReinstall = false, r) {
  let updateResult = await updateLatest(channelOrVersion, forceReinstall);
  if (!updateResult.success)
    return {
      latestVersion: null,
      wasUpdated: false,
      lockFailed: updateResult.lockFailed,
      lockHolderPid: updateResult.lockHolderPid,
    };
  if (updateResult.skippedUnverifiedRelease)
    return {
      latestVersion: updateResult.latestVersion,
      wasUpdated: false,
      wasSkipped: true,
      skippedUnverifiedRelease: true,
      lockFailed: false,
    };
  if (getGlobalConfig().installMethod !== "native") {
    await saveGlobalConfig(
      (current) => ({
        ...current,
        installMethod: "native",
        autoUpdates: false,
        autoUpdatesProtectedForNative: true,
      }),
      r,
    );
    logForDebugging(
      'Native installer: Set installMethod to "native" and disabled legacy auto-updater for protection',
    );
  }
  cleanupOldVersions();
  return {
    latestVersion: updateResult.latestVersion,
    wasUpdated: updateResult.success && !updateResult.wasSkipped,
    wasSkipped: updateResult.wasSkipped,
    lockFailed: false,
  };
}
//@ chunk-zw17mz74.js:39858-39958 layout
async function getVersionFromSymlink(executable) {
  try {
    let n = await readlink(executable);
    let r = resolve(dirname(executable), n);
    if (await isExecutableFile(r)) return r;
  } catch {}
  return null;
}
//@ chunk-zw17mz74.js:39958-40017 fingerprint = getLockFilePathFromVersionPath (1)
function getLockFilePathFromVersionPath(dirs, versionPath) {
  let versionName = basename(versionPath);
  return join(dirs.locks, `${versionName}.lock`);
}
//@ chunk-zw17mz74.js:40017-41163 facade-exports = lockCurrentVersion (0.985)
/**
 * 为正在运行的版本加 PID 锁，防止被清理。
 */
async function lockCurrentVersion() {
  let dirs = getBaseDirectories();
  if (!process.execPath.includes(dirs.versions)) return;
  let versionPath = resolve(process.execPath);
  try {
    let lockfilePath = getLockFilePathFromVersionPath(dirs, versionPath);
    await mkdir(dirs.locks, {
      recursive: true,
    });
    if (isAutoUpdateEnabled()) {
      if (!(await acquireProcessLifetimeLock(versionPath, lockfilePath))) {
        logEvent("tengu_version_lock_failed", {
          is_pid_based: true,
          is_lifetime_lock: true,
        });
        logLockAcquisitionError(versionPath, Error("Lock already held by another process"));
        return;
      }
      logEvent("tengu_version_lock_acquired", {
        is_pid_based: true,
        is_lifetime_lock: true,
      });
      logForDebugging(`Acquired PID lock on running version: ${versionPath}`);
    } else {
      let release;
      try {
        release = await lock(versionPath, {
          stale: VERSION_RETENTION_MS,
          retries: 0,
          lockfilePath,
          onCompromised: (err) => {
            logForDebugging(`NON-FATAL: Lock on running version was compromised: ${err.message}`, {
              level: "info",
            });
          },
        });
        logEvent("tengu_version_lock_acquired", {
          is_pid_based: false,
          is_lifetime_lock: true,
        });
        logForDebugging(`Acquired mtime-based lock on running version: ${versionPath}`);
        registerCleanup(async () => {
          try {
            await release?.();
          } catch {}
        });
      } catch (lockError) {
        if (isENOENT(lockError)) {
          logForDebugging(`Cannot lock current version - file does not exist: ${versionPath}`, {
            level: "info",
          });
          return;
        }
        logEvent("tengu_version_lock_failed", {
          is_pid_based: false,
          is_lifetime_lock: true,
        });
        logLockAcquisitionError(versionPath, lockError);
        return;
      }
    }
  } catch (error) {
    if (isENOENT(error)) {
      logForDebugging(`Cannot lock current version - file does not exist: ${versionPath}`, {
        level: "info",
      });
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
    {
      level: "error",
    },
  );
}
//@ chunk-zw17mz74.js:41292-41443 fingerprint = forceRemoveLock (1)
async function forceRemoveLock(versionFilePath) {
  let dirs = getBaseDirectories();
  let lockfilePath = getLockFilePathFromVersionPath(dirs, versionFilePath);
  try {
    await unlink(lockfilePath);
    logForDebugging(`Force-removed lock file at ${lockfilePath}`);
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
    let r = await readdir(e);
    let s = 0;
    for (let h of r) {
      let w = join(e, h);
      try {
        if ((await stat(w)).mtime.getTime() < n) {
          await rm(w, {
            recursive: true,
            force: true,
          });
          s++;
          logForDebugging(`Cleaned up old staging directory: ${h}`);
        }
      } catch {}
    }
    if (s > 0) {
      logForDebugging(`Cleaned up ${s} orphaned staging directories`);
      logEvent("tengu_native_staging_cleanup", {
        cleaned_count: s,
      });
    }
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`Failed to clean up staging directories: ${error}`);
  }
}
//@ chunk-zw17mz74.js:41862-45559 facade-exports = cleanupOldVersions (0.763)
/**
 * 清理旧版本：保留最近版本、删除过期 staging/备份与陈旧锁（Windows 处理 .old 可执行文件）。
 */
async function cleanupOldVersions() {
  await Promise.resolve();
  let dirs = getBaseDirectories();
  let oneHourAgo = Date.now() - 3600000;
  let r = Date.now() - 1209600000;
  let s = Date.now() - BACKUP_RETENTION_MS;
  if (getPlatform().startsWith("win32")) {
    let executableDir = dirname(dirs.executable);
    let S = basename(dirs.executable);
    try {
      let files = await readdir(executableDir);
      let flattened = files.flatMap((file) => {
        let backupOrStagedName = parseBackupOrStagedName(file, S);
        return backupOrStagedName === undefined
          ? []
          : [
              {
                file,
                ...backupOrStagedName,
              },
            ];
      });
      let sorted = flattened.filter((P) => P.kind === "backup").sort((P, x) => x.stampedMs - P.stampedMs);
      let found = files.find((file) => file.toLowerCase() === S.toLowerCase());
      let L =
        sorted.length > 0 && !(found !== undefined && (await isNonEmptyFile(join(executableDir, found))));
      let D = L ? await findFirstExistingFile(sorted, (P) => join(executableDir, P.file)) : undefined;
      let stagingCleanedCount = 0;
      for (let file of flattened) {
        if (file.kind === "backup" && L && ((file === D && file.stampedMs >= s) || file.stampedMs >= r))
          continue;
        try {
          let stagingPath = join(executableDir, file.file);
          if (file.stampedMs >= oneHourAgo || (await stat(stagingPath)).mtime.getTime() >= oneHourAgo)
            continue;
          await unlink(stagingPath);
          stagingCleanedCount++;
        } catch {}
      }
      if (stagingCleanedCount > 0)
        logForDebugging(`Cleaned up ${stagingCleanedCount} old Windows executables on startup`);
    } catch (error) {
      if (!isENOENT(error)) logForDebugging(`Failed to clean up old Windows executables: ${error}`);
    }
  }
  await cleanupOldStagingDirs(dirs.staging);
  if (isAutoUpdateEnabled()) {
    let staleLocksCleaned = await cleanupStaleLocks(dirs.locks);
    if (staleLocksCleaned > 0) {
      logForDebugging(`Cleaned up ${staleLocksCleaned} stale version locks`);
      logEvent("tengu_native_stale_locks_cleanup", {
        cleaned_count: staleLocksCleaned,
      });
    }
  }
  let versionEntries;
  try {
    versionEntries = await readdir(dirs.versions);
  } catch (error) {
    if (!isENOENT(error)) {
      logForDebugging(`Failed to readdir versions directory: ${error}`);
      logFeatureSad("native_cleanup_versions", "readdir_failed");
    } else logFeatureOk("native_cleanup_versions");
    return;
  }
  let versionFiles = [];
  let tempFilesCleanedCount = 0;
  for (let entry of versionEntries) {
    let entryPath = join(dirs.versions, entry);
    if (/\.tmp\.\d+\.\d+(\.\d+)?$/.test(entry)) {
      try {
        if ((await stat(entryPath)).mtime.getTime() < oneHourAgo) {
          await unlink(entryPath);
          tempFilesCleanedCount++;
          logForDebugging(`Cleaned up orphaned temp install file: ${entry}`);
        }
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
  if (tempFilesCleanedCount > 0) {
    logForDebugging(`Cleaned up ${tempFilesCleanedCount} orphaned temp install files`);
    logEvent("tengu_native_temp_files_cleanup", {
      cleaned_count: tempFilesCleanedCount,
    });
  }
  if (versionFiles.length === 0) {
    logFeatureOk("native_cleanup_versions");
    return;
  }
  if (
    !(await isInstallLinkOrMissing(dirs.executable)) &&
    !(await isNpmSymlink(dirs.executable).catch(() => false))
  ) {
    logForDebugging(
      `Skipping native version cleanup: the launcher at ${dirs.executable} is externally managed, so the version(s) it needs cannot be determined`,
    );
    logFeatureSad("native_cleanup_versions", "skipped_external_launcher");
    return;
  }
  try {
    let currentBinaryPath = process.execPath;
    let protectedVersions = new Set();
    if (currentBinaryPath && currentBinaryPath.includes(dirs.versions))
      protectedVersions.add(resolve(currentBinaryPath));
    let currentSymlinkVersion = await getVersionFromSymlink(dirs.executable);
    if (currentSymlinkVersion) protectedVersions.add(currentSymlinkVersion);
    else if (getPlatform().startsWith("win32"))
      try {
        let A = await stat(dirs.executable);
        for (let versionFile of versionFiles)
          if (versionFile.size === A.size) protectedVersions.add(versionFile.resolvedPath);
      } catch {}
    for (let v of versionFiles) {
      if (protectedVersions.has(v.resolvedPath)) continue;
      let lockFilePath = getLockFilePathFromVersionPath(dirs, v.resolvedPath);
      let hasActiveLock = false;
      if (isAutoUpdateEnabled()) hasActiveLock = isLockActive(lockFilePath);
      else
        try {
          hasActiveLock = await checkLockfile(v.resolvedPath, {
            stale: VERSION_RETENTION_MS,
            lockfilePath: lockFilePath,
          });
        } catch {
          hasActiveLock = false;
        }
      if (hasActiveLock) {
        protectedVersions.add(v.resolvedPath);
        logForDebugging(`Protecting locked version from cleanup: ${v.name}`);
      }
      await new Promise((resolve) => setImmediate(resolve));
    }
    let eligibleVersions = versionFiles
      .filter((v) => !protectedVersions.has(v.resolvedPath))
      .sort((A, P) => P.mtime.getTime() - A.mtime.getTime());
    let versionsToDelete = [
      ...eligibleVersions
        .filter((eligibleVersion) => eligibleVersion.size > 0)
        .slice(VERSION_RETENTION_COUNT),
      ...eligibleVersions.filter(
        (eligibleVersion) => eligibleVersion.size === 0 && eligibleVersion.mtime.getTime() < oneHourAgo,
      ),
    ];
    if (versionsToDelete.length === 0) {
      logEvent("tengu_native_version_cleanup", {
        total_count: versionFiles.length,
        deleted_count: 0,
        protected_count: protectedVersions.size,
        retained_count: VERSION_RETENTION_COUNT,
        lock_failed_count: 0,
        error_count: 0,
      });
      logFeatureOk("native_cleanup_versions");
      return;
    }
    let deletedCount = 0;
    let lockFailedCount = 0;
    let errorCount = 0;
    await Promise.all(
      versionsToDelete.map(async (version) => {
        try {
          let P = true;
          let deleted = await tryWithVersionLock(version.path, async () => {
            if (version.size === 0) {
              let M = await stat(version.path);
              if (M.size > 0 || M.mtime.getTime() >= oneHourAgo) {
                P = false;
                return;
              }
            }
            await unlink(version.path);
          });
          if (deleted && P) deletedCount++;
          else if (!deleted) {
            lockFailedCount++;
            logForDebugging(`Skipping deletion of ${version.name} - locked by another process`);
          }
        } catch (error) {
          errorCount++;
          logForDebugging(`Failed to delete version ${version.name}: ${error}`, {
            level: "error",
          });
        }
      }),
    );
    logEvent("tengu_native_version_cleanup", {
      total_count: versionFiles.length,
      deleted_count: deletedCount,
      protected_count: protectedVersions.size,
      retained_count: VERSION_RETENTION_COUNT,
      lock_failed_count: lockFailedCount,
      error_count: errorCount,
    });
    if (errorCount > 0) logFeatureSad("native_cleanup_versions", "delete_errors");
    else if (lockFailedCount > 0) logFeatureSad("native_cleanup_versions", "lock_failed");
    else logFeatureOk("native_cleanup_versions");
  } catch (error) {
    if (!isENOENT(error)) {
      logError(Error(`Version cleanup failed: ${error}`));
      logFeatureSad("native_cleanup_versions", "unexpected_error");
    } else logFeatureOk("native_cleanup_versions");
  }
}
//@ chunk-zw17mz74.js:45559-46158 facade-exports = removeInstalledSymlink (0.746)
/**
 * 删除原生安装器创建的 claude 启动器（npm 管理的不动）。
 */
async function removeInstalledSymlink() {
  let dirs = getBaseDirectories();
  try {
    if (
      await isNpmSymlink(dirs.executable).catch((error) => {
        if (isENOENT(error)) return false;
        throw error;
      })
    ) {
      logForDebugging(`Skipping removal of ${dirs.executable} - appears to be npm-managed`);
      logFeatureOk("native_remove_symlink");
      return;
    }
    if (!(await isInstallLinkOrMissing(dirs.executable))) {
      logForDebugging(`Skipping removal of ${dirs.executable} - not created by the native installer`);
      logFeatureOk("native_remove_symlink");
      return;
    }
    await unlink(dirs.executable);
    logForDebugging(`Removed claude symlink at ${dirs.executable}`);
    logFeatureOk("native_remove_symlink");
  } catch (error) {
    if (isENOENT(error)) {
      logFeatureOk("native_remove_symlink");
      return;
    }
    logForDebugging(`Failed to remove claude symlink: ${error}`, {
      level: "error",
    });
    logFeatureBad("native_remove_symlink", "unlink_failed");
  }
}
//@ chunk-zw17mz74.js:46158-46744 facade-exports = cleanupShellAliases (0.822)
/**
 * 从 shell 配置文件删除旧的 claude alias。
 */
async function cleanupShellAliases() {
  let messages = [];
  let configMap = getShellConfigPaths();
  let r = false;
  for (let [shellType, configFile] of Object.entries(configMap))
    try {
      let lines = await readFileLinesOrNull(configFile);
      if (!lines) continue;
      let { filtered, hadAlias } = filterClaudeAliases(lines);
      if (hadAlias) {
        await writeFileLines(configFile, filtered);
        messages.push({
          message: `Removed claude alias from ${configFile}. Run: unalias claude`,
          userActionRequired: true,
          type: "alias",
        });
        logForDebugging(`Cleaned up claude alias from ${shellType} config`);
      }
    } catch (error) {
      r = true;
      logForDebugging(`Failed to clean up claude alias from ${configFile}: ${error}`, {
        level: "error",
      });
      messages.push({
        message: `Failed to clean up ${configFile}: ${error}`,
        userActionRequired: false,
        type: "error",
      });
    }
  if (r) logFeatureSad("native_cleanup_aliases", "config_write_failed");
  else logFeatureOk("native_cleanup_aliases");
  return messages;
}
//@ chunk-zw17mz74.js:46744-47726 fingerprint = manualRemoveNpmPackage (0.99)
async function manualRemoveNpmPackage(packageName) {
  try {
    let prefixResult = await execFileNoThrowWithCwd("npm", ["config", "get", "prefix"], {
      useToolMemoryCgroup: false,
    });
    if (prefixResult.code !== 0 || !prefixResult.stdout)
      return {
        success: false,
        error: "Failed to get npm global prefix",
      };
    let globalPrefix = prefixResult.stdout.trim();
    let manuallyRemoved = false;
    async function tryRemove(filePath, description) {
      try {
        await unlink(filePath);
        logForDebugging(`Manually removed ${description}: ${filePath}`);
        return true;
      } catch {
        return false;
      }
    }
    if (getPlatform().startsWith("win32")) {
      let binCmd = join(globalPrefix, "claude.cmd");
      let binPs1 = join(globalPrefix, "claude.ps1");
      let binExe = join(globalPrefix, "claude");
      if (await tryRemove(binCmd, "bin script")) manuallyRemoved = true;
      if (await tryRemove(binPs1, "PowerShell script")) manuallyRemoved = true;
      if (await tryRemove(binExe, "bin executable")) manuallyRemoved = true;
    } else {
      let binSymlink = join(globalPrefix, "bin", "claude");
      if (await tryRemove(binSymlink, "bin symlink")) manuallyRemoved = true;
    }
    if (manuallyRemoved) {
      logForDebugging(`Successfully removed ${packageName} manually`);
      let nodeModulesPath = getPlatform().startsWith("win32")
        ? join(globalPrefix, "node_modules", packageName)
        : join(globalPrefix, "lib", "node_modules", packageName);
      return {
        success: true,
        warning: `${packageName} executables removed, but node_modules directory was left intact for safety. You may manually delete it later at: ${nodeModulesPath}`,
      };
    } else
      return {
        success: false,
      };
  } catch (manualError) {
    logForDebugging(`Manual removal failed: ${manualError}`, {
      level: "error",
    });
    return {
      success: false,
      error: `Manual removal failed: ${manualError}`,
    };
  }
}
//@ chunk-zw17mz74.js:47726-48515 fingerprint = attemptNpmUninstall (0.979)
async function attemptNpmUninstall(packageName) {
  let { code, stderr } = await execFileNoThrowWithCwd("npm", ["uninstall", "-g", packageName], {
    cwd: process.cwd(),
    useToolMemoryCgroup: false,
  });
  if (code === 0) {
    logForDebugging(`Removed global npm installation of ${packageName}`);
    return {
      success: true,
    };
  } else if (stderr && !stderr.includes("npm ERR! code E404")) {
    if (stderr.includes("npm error code ENOTEMPTY")) {
      logForDebugging(`Failed to uninstall global npm package ${packageName}: ${stderr}`, {
        level: "error",
      });
      logForDebugging("Attempting manual removal due to ENOTEMPTY error");
      let manualResult = await manualRemoveNpmPackage(packageName);
      if (manualResult.success)
        return {
          success: true,
          warning: manualResult.warning,
        };
      else if (manualResult.error)
        return {
          success: false,
          error: `Failed to remove global npm installation of ${packageName}: ${stderr}. Manual removal also failed: ${manualResult.error}`,
        };
    }
    logForDebugging(`Failed to uninstall global npm package ${packageName}: ${stderr}`, {
      level: "error",
    });
    return {
      success: false,
      error: `Failed to remove global npm installation of ${packageName}: ${stderr}`,
    };
  }
  return {
    success: false,
  };
}
//@ chunk-zw17mz74.js:48515-50843 facade-exports = cleanupNpmInstallations (0.538)
/**
 * 迁移到原生安装后卸载全局 npm 包（@anthropic-ai/claude-code 等）。
 */
async function cleanupNpmInstallations() {
  let errors = [];
  let warnings = [];
  let removed = 0;
  let s = false;
  let h = false;
  let codePackageResult = await attemptNpmUninstall("@anthropic-ai/claude-code");
  if (codePackageResult.success) {
    removed++;
    if (codePackageResult.warning) warnings.push(codePackageResult.warning);
  } else if (codePackageResult.error) {
    errors.push(codePackageResult.error);
    s = true;
  }
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
      removed++;
      if (macroPackageResult.warning) warnings.push(macroPackageResult.warning);
    } else if (macroPackageResult.error) {
      errors.push(macroPackageResult.error);
      s = true;
    }
  }
  let localInstallDir = join(homedir(), ".claude", "local");
  try {
    await rm(localInstallDir, {
      recursive: true,
    });
    removed++;
    logForDebugging(`Removed local installation at ${localInstallDir}`);
  } catch (error) {
    if (!isENOENT(error)) {
      errors.push(`Failed to remove ${localInstallDir}: ${error}`);
      logForDebugging(`Failed to remove local installation: ${error}`, {
        level: "error",
      });
      h = true;
    }
  }
  if (errors.length === 0) logFeatureOk("native_cleanup_npm");
  else if (removed > 0) logFeatureSad("native_cleanup_npm", "partial_errors");
  else if (s && !h) logFeatureBad("native_cleanup_npm", "npm_uninstall_failed");
  else if (h && !s) logFeatureBad("native_cleanup_npm", "local_install_remove_failed");
  else logFeatureBad("native_cleanup_npm", "npm_uninstall_failed");
  return {
    removed,
    errors,
    warnings,
  };
}
//@ chunk-s61vbvea.js:504239-504287 placement
/**
 * 若需要则预取资格判定（非必要流量时跳过）。
 */
async function prefetchEligibilityIfNeeded(e, n) {
  if (isEssentialTrafficOnly()) return;
  getCachedOrFetchPassesEligibility(e, n);
}
//@ chunk-s61vbvea.js:504426-504505 placement
/**
 * 判断是否为 bridge 子进程并带机器设置。
 */
function isBridgeChildMachineSettings() {
  return env.CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS === true && !getSessionBypassPermissionsMode();
}
//@ chunk-s61vbvea.js:504639-504676 placement
var VERSIONS_DIR_SEGMENT = sep + join("claude", "versions") + sep;
//@ chunk-s61vbvea.js:504676-504783 placement
/**
 * 判断安装链接是否存在且指向安装目录（Windows 或不存在时视为是）。
 */
async function isInstallLinkOrMissing(executable) {
  if (getPlatform_2() === "windows") return true;
  try {
    return await isSymlinkIntoInstallDir(executable, await lstat(executable));
  } catch (error) {
    return isENOENT(error);
  }
}
//@ chunk-s61vbvea.js:504783-504888 placement
/**
 * 判断路径是否为指向安装目录的符号链接。
 */
async function isSymlinkIntoInstallDir(e, n) {
  if (!n.isSymbolicLink()) return false;
  let r = await readlink(e);
  return resolve(dirname(e), r).includes(VERSIONS_DIR_SEGMENT);
}
//@ chunk-s61vbvea.js:504888-504981 fingerprint = isNpmSymlink (0.912)
/**
 * 启动器是否是 npm 生成的符号链接（指向 .js 或 node_modules）。
 */
async function isNpmSymlink(executablePath) {
  let targetPath = await realpath(executablePath);
  return targetPath.endsWith(".js") || targetPath.includes("node_modules");
}
//@ chunk-ch0vxh4c.js:1552-1657 fingerprint = isPossibleClaudeBinary (1)
/**
 * 路径是否是可执行的普通文件。
 */
async function isPossibleClaudeBinary(filePath) {
  try {
    if (!(await stat(filePath)).isFile()) return false;
    await access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
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
  isBridgeChildMachineSettings,
  prefetchEligibilityIfNeeded,
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
