/**
 * utils/nativeInstaller/installer.ts
 *
 * 已有模块；g2 补充放置声明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/nativeInstaller/installer.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-7jxyna5q.js (6), chunk-e5z7dpjd.js (53), chunk-wfxhhysk.js (1)
 * attribution: fingerprint 21, placement 5, sole-consumer 1, affinity 2, facade-exports 9, layout 23
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  stat,
  access,
  lstat,
  readlink,
  realpath,
  mkdir,
  writeFile,
  utimes,
  copyFile,
  chmod,
  rename,
  unlink,
  readdir,
  rm,
  rmdir,
  symlink,
} from "fs/promises";
import { constants } from "fs";
import { sep, join, resolve, dirname, basename, delimiter } from "path";
import { randomBytes } from "crypto";
import { homedir } from "os";
import { isEssentialTrafficOnly } from "../privacyLevel.js";
import { getCachedOrFetchPassesEligibility } from "../../services/api/referral.js";
import { env } from "../env.js";
import { getSessionBypassPermissionsMode, getRootSession } from "../../bootstrap/state.js";
import { getPlatform as getPlatform_2 } from "../platform.js";
import {
  isENOENT,
  getErrnoCode,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isSyscallError,
  toError,
  sanitizedErrCodeForTelemetry,
} from "../errors.js";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../../vendor/semver/index.js";
import { logForDebugging } from "../debug.js";
import { envDynamicProbe } from "../envDynamic.js";
import { getNativeVersionsDir, getXDGCacheHome, getUserBinDir } from "../xdg.js";
import { getLocksDir } from "./lockDir.js";
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
  isProcessRunning,
  getAllLockInfo,
  acquireProcessLifetimeLock,
  cleanupStaleLocks,
  readLockContent,
} from "./pidLock.js";
import { logEvent } from "../../services/analytics/index.js";
import { sleep } from "../sleep.js";
import { lock, checkLockfile } from "../lockfile.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../log.js";
import { HostScoped } from "../hostScoped.js";
import { isEnvTruthy } from "../envUtils.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { resolveMaxVersionConfig, isForceDowngradeActive, shouldSkipVersion } from "../autoUpdater.js";
import { isSemverVersion } from "../model/modelCatalog/catalogCapabilities.js";
import { semverGte, semverGt } from "../semver.js";
import { sanitizeVersion } from "../../services/analytics/metadata.js";
import { readFileSafe } from "../file.js";
import { getCurrentInstallationTypeProbed } from "../doctorDiagnostic.js";
import { getGlobalConfig, saveGlobalConfig } from "../config.js";
import { getShellType } from "../localInstaller.js";
import {
  getShellConfigPaths,
  readFileLinesOrNull,
  filterClaudeAliases,
  writeFileLines,
} from "../shellConfig.js";
import { versionOrDefault, bundleVersionOfPath, BUNDLES_DIR } from "./bundlePaths.js";
import { getTaskListLockPath, readActiveLockVersions } from "./lockFiles.js";
import { tryAcquireComputerUseLock } from "../computerUse/computerUseLock.js";
import { useCostSummary } from "../../costHook.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { cleanUpBundles } from "./cleanup.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wfxhhysk.js:1552-1657 fingerprint (2.1.88 match: isPossibleClaudeBinary, 1)
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
//@ chunk-7jxyna5q.js:421342-421390 placement
/**
 * 若需要则预取资格判定（非必要流量时跳过）。
 */
async function prefetchEligibilityIfNeeded(request, options) {
  if (isEssentialTrafficOnly()) return;
  getCachedOrFetchPassesEligibility(request, options);
}
//@ chunk-7jxyna5q.js:421529-421608 placement
/**
 * 判断是否为 bridge 子进程并带机器设置。
 */
function isBridgeChildMachineSettings() {
  return env.CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS === true && !getSessionBypassPermissionsMode();
}
//@ chunk-7jxyna5q.js:421742-421779 placement
var VERSIONS_DIR_SEGMENT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:421742", () => {
  VERSIONS_DIR_SEGMENT = sep + join("claude", "versions") + sep;
});
//@ chunk-7jxyna5q.js:421779-421886 placement
/**
 * 判断安装链接是否存在且指向安装目录（Windows 或不存在时视为是）。
 */
async function isInstallLinkOrMissing(linkPath) {
  if (getPlatform_2() === "windows") return true;
  try {
    return await isSymlinkIntoInstallDir(linkPath, await lstat(linkPath));
  } catch (error) {
    return isENOENT(error);
  }
}
//@ chunk-7jxyna5q.js:421886-421991 placement
/**
 * 判断路径是否为指向安装目录的符号链接。
 */
async function isSymlinkIntoInstallDir(linkPath, stats) {
  if (!stats.isSymbolicLink()) return false;
  let target = await readlink(linkPath);
  return resolve(dirname(linkPath), target).includes(VERSIONS_DIR_SEGMENT);
}
//@ chunk-7jxyna5q.js:421991-422084 fingerprint (2.1.88 match: isNpmSymlink, 0.911)
/**
 * 启动器是否是 npm 生成的符号链接（指向 .js 或 node_modules）。
 */
async function isNpmSymlink(executablePath) {
  let targetPath = await realpath(executablePath);
  return targetPath.endsWith(".js") || targetPath.includes("node_modules");
}
//@ chunk-5xgkngpb.js:627791-627833 fingerprint (2.1.88 match: atomicMoveToInstallPath, 0.508)
function atomicMoveToInstallPath_2(path) {
  return path.includes(".tmp.");
}
//@ chunk-e5z7dpjd.js:1429-1447 sole-consumer
var semver; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e5z7dpjd.js:1429", () => {
  semver = __toESM(require_semver_3(), 1);
});
//@ chunk-e5z7dpjd.js:2182-2192 affinity
var FORCE_ARM64 = false;
//@ chunk-e5z7dpjd.js:2192-2519 fingerprint (2.1.88 match: getPlatform, 0.712)
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
//@ chunk-e5z7dpjd.js:24246-24268 affinity
var VERSION_RETENTION_COUNT = 2;
var VERSION_RETENTION_MS = 604800000;
//@ chunk-e5z7dpjd.js:24268-24335 facade-exports (2.1.88 match: getBinaryName, 1)
/**
 * 原生二进制文件名：Windows 为 claude.exe，否则 claude。
 */
function getBinaryName(platform) {
  return platform.startsWith("win32") ? "claude.exe" : "claude";
}
//@ chunk-e5z7dpjd.js:24335-24459 fingerprint (2.1.88 match: getBaseDirectories, 0.758)
/**
 * 原生安装目录：versions、staging、locks 与启动器可执行文件路径（~/.local/bin/claude）。
 */
function getBaseDirectories() {
  let platform = getPlatform();
  let executableName = getBinaryName(platform);
  return {
    versions: getNativeVersionsDir(),
    staging: join(getXDGCacheHome(), "claude", "staging"),
    locks: getLocksDir(),
    executable: join(getUserBinDir(), executableName),
  };
}
//@ chunk-e5z7dpjd.js:24459-24531 layout
async function isNonEmptyFile(filePath) {
  return stat(filePath).then(
    (stats) => stats.isFile() && stats.size > 0,
    () => false,
  );
}
//@ chunk-e5z7dpjd.js:24531-24603 layout
async function findFirstExistingFile(candidates, toPath) {
  for (let candidate of candidates) if (await isNonEmptyFile(toPath(candidate))) return candidate;
  return;
}
//@ chunk-e5z7dpjd.js:24603-24664 layout
function backupPathFor(installPath) {
  return `${installPath}.old.${Date.now()}.${process.pid}`;
}
//@ chunk-e5z7dpjd.js:24664-24682 layout
var BACKUP_RETENTION_MS = 2592000000;
//@ chunk-e5z7dpjd.js:24682-25009 layout
function parseBackupOrStagedName(file, prefix) {
  if (!file.toLowerCase().startsWith(`${prefix.toLowerCase()}.`)) return;
  let match = /^(?:old\.(\d+)(?:\.(\d+))?|new\.\d+\.(\d+)\.[0-9a-f]+)$/i.exec(file.slice(prefix.length + 1));
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
//@ chunk-e5z7dpjd.js:25009-25133 layout
async function isExecutableFile(filePath) {
  try {
    let stats = await stat(filePath);
    if (!stats.isFile() || stats.size === 0) return false;
    return (stats.mode & constants.S_IXUSR) !== 0;
  } catch {
    return false;
  }
}
//@ chunk-e5z7dpjd.js:25133-25661 fingerprint (2.1.88 match: getVersionPaths, 0.681)
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
//@ chunk-e5z7dpjd.js:25661-26784 fingerprint (2.1.88 match: tryWithVersionLock, 0.885)
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
//@ chunk-e5z7dpjd.js:26784-26806 layout
var ATOMIC_MOVE_RETRY_DELAYS_MS = [100, 500, 2000];
//@ chunk-e5z7dpjd.js:26806-26970 facade-exports
/**
 * staging 中的二进制与校验和不再一致时拒绝安装。
 */
let StagedBinaryChecksumError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e5z7dpjd.js:26806", () => {
  StagedBinaryChecksumError = class StagedBinaryChecksumError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor() {
      super(
        "Staged binary no longer matches the verified checksum; refusing to install",
        "Staged binary checksum mismatch at install",
      );
    }
  };
});
//@ chunk-e5z7dpjd.js:26970-27509 layout
async function atomicMoveToInstallPath(stagedBinaryPath, installPath, expectedChecksum) {
  await mkdir(dirname(installPath), {
    recursive: true,
  });
  let lastError;
  for (let j = 1; j <= ATOMIC_MOVE_RETRY_DELAYS_MS.length + 1; j++) {
    let tempPath = `${installPath}.tmp.${process.pid}.${Date.now()}.${j}`;
    try {
      await copyFile(stagedBinaryPath, tempPath);
      await chmod(tempPath, 493);
      if (expectedChecksum !== undefined && (await sha256File(tempPath)) !== expectedChecksum)
        throw new StagedBinaryChecksumError();
      await rename(tempPath, installPath);
      logForDebugging(`Atomically installed binary to ${installPath}` + (j > 1 ? ` (attempt ${j})` : ""));
      return {
        attempts: j,
      };
    } catch (error) {
      lastError = error;
      try {
        await unlink(tempPath);
      } catch {}
      let errnoCode = getErrnoCode(error);
      let isRetryable = errnoCode === "EBUSY" || (errnoCode === "EPERM" && false);
      let delayMs = ATOMIC_MOVE_RETRY_DELAYS_MS[j - 1];
      if (!isRetryable || delayMs === undefined) throw error;
      logForDebugging(
        `atomicMoveToInstallPath attempt ${j} failed with ${errnoCode}; retrying in ${delayMs}ms`,
      );
      await sleep(delayMs);
    }
  }
  throw lastError;
}
//@ chunk-e5z7dpjd.js:27509-28618 fingerprint (2.1.88 match: installVersionFromPackage, 0.811)
async function installVersionFromPackage(stagingPath, installPath, expectedChecksum) {
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
    let { attempts } = await atomicMoveToInstallPath(stagedBinaryPath, installPath, expectedChecksum);
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
//@ chunk-e5z7dpjd.js:28618-29551 fingerprint (2.1.88 match: installVersionFromBinary, 0.618)
async function installVersionFromBinary(stagingPath, installPath, expectedChecksum) {
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
    let { attempts } = await atomicMoveToInstallPath(stagedBinaryPath, installPath, expectedChecksum);
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
//@ chunk-e5z7dpjd.js:29551-29625 fingerprint (2.1.88 match: installVersion, 1)
async function installVersion(stagingPath, installPath, downloadType, expectedChecksum) {
  if (downloadType === "npm") return installVersionFromPackage(stagingPath, installPath, expectedChecksum);
  return installVersionFromBinary(stagingPath, installPath, expectedChecksum);
}
//@ chunk-e5z7dpjd.js:29625-29651 layout
var versionLockSlots; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e5z7dpjd.js:29625", () => {
  versionLockSlots = new HostScoped(() => new Map());
});
//@ chunk-e5z7dpjd.js:29651-31999 fingerprint (2.1.88 match: performVersionUpdate, 0.385)
/**
 * performVersionUpdate：下载到 staging、校验、原子移动到安装路径（可复用保留的已下载版本）。
 */
async function performVersionUpdate(
  version,
  { forceReinstall, explicitVersionRequested, requireEnforcingRelease },
) {
  let { stagingPath: baseStagingPath, installPath } = await getVersionPaths(version);
  let { executable: executablePath } = getBaseDirectories();
  let isolateStaging = isEnvTruthy("true");
  let stagingPath = isolateStaging
    ? `${baseStagingPath}.${process.pid}.${Date.now()}.${randomBytes(4).toString("hex")}`
    : baseStagingPath;
  let locks = versionLockSlots.of(getRootSession().host);
  let lock = locks.get(version);
  let canReuseVerified = !(lock && (lock.enforcingRelease || !requireEnforcingRelease));
  let result = {
    wasNewInstall: false,
    moveRetried: false,
    activationFailed: false,
    activationRefused: false,
    skippedUnverifiedRelease: true,
  };
  let checksum = canReuseVerified ? undefined : lock?.checksum;
  let needsInstall = forceReinstall || !(await versionIsAvailable(version));
  if (!needsInstall && canReuseVerified)
    try {
      let reverified = await reverifyRetainedVersion(version, installPath, {
        explicitVersionRequested,
        requireEnforcingRelease,
      });
      checksum = reverified.expectedChecksum;
      if (!reverified.binaryMatches) needsInstall = true;
      else if (reverified.signatureVerified)
        locks.set(version, {
          enforcingRelease: requireEnforcingRelease,
          checksum,
        });
    } catch (error) {
      if (error instanceof ManifestSignatureError) {
        if (requireEnforcingRelease && error.reason === "release_predates_enforcement") return result;
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
  else if (!needsInstall && lock?.checksum !== undefined) {
    if (!(await fileMatchesChecksum(installPath, lock.checksum))) {
      logForDebugging(
        `Retained ${version} no longer matches the checksum verified earlier in this process; re-downloading`,
        {
          level: "warn",
        },
      );
      locks.delete(version);
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
    let signatureVerified;
    try {
      ({
        downloadType,
        signatureVerified,
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
        return result;
      throw error;
    } finally {
      if (isolateStaging)
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
    if (signatureVerified)
      locks.set(version, {
        enforcingRelease: requireEnforcingRelease,
        checksum,
      });
  } else logForDebugging(`Version ${version} already installed, updating symlink`);
  await removeDirectoryIfEmpty(executablePath);
  let symlinkResult = await updateSymlink(executablePath, installPath, {
    expectedChecksum: checksum,
  });
  if (symlinkResult !== "updated" && !(await isExecutableFile(executablePath))) {
    let sourceExists = false;
    try {
      await stat(installPath);
      sourceExists = true;
    } catch {}
    logFeatureBad("update_apply", "update_apply_native_symlink_failed");
    throw Error(
      `Failed to create executable at ${executablePath}. Source file exists: ${sourceExists}. Either ${executablePath} is not writable, or the existing file there was not created by the native installer and is not a working launcher \u2014 the updater will not overwrite a launcher it does not own. Remove it and re-run the update.`,
    );
  }
  return {
    wasNewInstall: needsInstall,
    moveRetried,
    activationFailed: symlinkResult === "failed",
    activationRefused: symlinkResult === "refused",
    skippedUnverifiedRelease: false,
  };
}
//@ chunk-e5z7dpjd.js:31999-32064 fingerprint (2.1.88 match: versionIsAvailable, 1)
async function versionIsAvailable(version) {
  let { installPath } = await getVersionPaths(version);
  return isExecutableFile(installPath);
}
//@ chunk-e5z7dpjd.js:32064-32177 layout
async function isNativeInstallPresent() {
  if (await isRunningFromVersionsDir()) return true;
  let { executable } = getBaseDirectories();
  return (await isExecutableFile(executable)) && !(await isNpmSymlink(executable).catch(() => false));
}
//@ chunk-e5z7dpjd.js:32177-32462 layout
async function isRunningFromVersionsDir() {
  let { versions, executable } = getBaseDirectories();
  let found = false;
  let candidates = [
    {
      versions,
      executable,
    },
  ];
  let [realVersions, realExecutableDir] = await Promise.all([
    realpath(versions).catch(() => versions),
    realpath(dirname(executable)).catch(() => dirname(executable)),
  ]);
  let realExecutable = join(realExecutableDir, basename(executable));
  if (realVersions !== versions || realExecutable !== executable)
    candidates.push({
      versions: realVersions,
      executable: realExecutable,
    });
  return candidates.some((candidate) =>
    isUnderVersionsOrExecutable(process.execPath, {
      ...candidate,
      isWindows: false,
    }),
  );
}
//@ chunk-e5z7dpjd.js:32462-32637 layout
function isUnderVersionsOrExecutable(inputPath, { versions, executable, isWindows }) {
  let normalize = (inputPath) => (isWindows ? inputPath.replaceAll("\\", "/").toLowerCase() : inputPath);
  let normalizedExec = normalize(inputPath);
  let normalizedVersionsPrefix = normalize(versions).replace(/\/+$/, "") + "/";
  return normalizedExec.startsWith(normalizedVersionsPrefix) || normalizedExec === normalize(executable);
}
//@ chunk-e5z7dpjd.js:32637-32832 layout
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
//@ chunk-e5z7dpjd.js:32832-38802 fingerprint (2.1.88 match: updateLatest, 0.53)
/**
 * updateLatest：取最新版本（受上限/金丝雀/跳过规则约束）、下载并校验签名、原子安装到 versions 目录、更新启动器链接；持版本锁防并发。
 */
async function updateLatest(channelOrVersion, forceReinstall = false) {
  let startTime = Date.now();
  let { executable: executablePath } = getBaseDirectories();
  let isChannel = !/^v?\d+\.\d+\.\d+(-\S+)?$/.test(channelOrVersion);
  let { maxVersion, forceDowngradeEnabled } = await resolveMaxVersionConfig();
  let isForcedDowngrade =
    forceDowngradeEnabled &&
    !forceReinstall &&
    isChannel &&
    !!maxVersion &&
    isForceDowngradeActive(
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      maxVersion,
      "native_update",
    );
  let version = isForcedDowngrade ? maxVersion : await getLatestVersion(channelOrVersion);
  let versionLength = version.length;
  if (!isSemverVersion(version))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid version string from ${isChannel ? "version pointer" : "argument"}: not a well-formed version (${versionLength} characters)`,
      "Invalid version string: not a well-formed version",
    );
  logForDebugging(`Checking for native installer update to version ${version}`);
  let requireEnforcingRelease = isChannel && (await isNativeInstallPresent());
  if (channelOrVersion === "latest" && !isForcedDowngrade) {
    let canaryVersion = getCanaryVersion();
    let canaryExceedsMax = canaryVersion && maxVersion && semverGte(canaryVersion, maxVersion);
    if (canaryVersion && semverGte(canaryVersion, version) && !canaryExceedsMax) {
      logForDebugging(`Native installer: canary ${canaryVersion} active, overriding ${version}`);
      version = canaryVersion;
    } else if (canaryExceedsMax)
      logForDebugging(
        `Native installer: canary ${canaryVersion} exceeds maxVersion ${maxVersion}, not applying`,
      );
  }
  if (!isForcedDowngrade && !forceReinstall && maxVersion && semverGte(version, maxVersion)) {
    logForDebugging(
      `Native installer: maxVersion ${maxVersion} is set, capping update from ${version} to ${maxVersion}`,
    );
    if (
      semverGt(
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
  if (isForcedDowngrade)
    logEvent("tengu_native_update_forced_downgrade", {
      from_version: sanitizeVersion(
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
      ),
      to_version: sanitizeVersion(version),
    });
  let wasNewInstall = false;
  let moveRetried = false;
  let activationFailed = false;
  let activationRefused = false;
  let skippedUnverifiedRelease = false;
  let latencyMs;
  if (isEnvTruthy("true")) {
    ({ wasNewInstall, moveRetried, activationFailed, activationRefused, skippedUnverifiedRelease } =
      await performVersionUpdate(version, {
        forceReinstall,
        explicitVersionRequested: !isChannel,
        requireEnforcingRelease,
      }));
    latencyMs = Date.now() - startTime;
  } else {
    let { installPath } = await getVersionPaths(version);
    if (forceReinstall) await forceRemoveLock(installPath);
    let lockAcquired = await tryWithVersionLock(
      installPath,
      async () => {
        ({ wasNewInstall, moveRetried, activationFailed, activationRefused, skippedUnverifiedRelease } =
          await performVersionUpdate(version, {
            forceReinstall,
            explicitVersionRequested: !isChannel,
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
        if (isLockActive(lockfilePath)) lockHolderPid = readFileSafe(lockfilePath)?.pid;
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
  if (skippedUnverifiedRelease) {
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
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
  if (activationFailed)
    logFeatureSad("update_apply", "update_apply_native_activation_failed_old_binary_kept");
  else if (activationRefused)
    logFeatureSad("update_apply", "update_apply_native_activation_refused_external_launcher");
  else if (moveRetried) logFeatureSad("update_apply", "update_apply_native_move_retry");
  else logFeatureOk("update_apply");
  logEvent("tengu_native_update_complete", {
    latency_ms: latencyMs,
    was_new_install: wasNewInstall,
    was_force_reinstall: forceReinstall,
  });
  logForDebugging(`Successfully updated to version ${version}`);
  return {
    success: true,
    latestVersion: version,
  };
}
//@ chunk-e5z7dpjd.js:38802-38991 fingerprint (2.1.88 match: removeDirectoryIfEmpty, 1)
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
//@ chunk-e5z7dpjd.js:38991-41085 fingerprint (2.1.88 match: updateSymlink, 0.619)
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
      let checksumMatches;
      try {
        checksumMatches =
          expectedChecksum === undefined || (await sha256File(oldFileName)) === expectedChecksum;
      } catch (restoreError) {
        await unlink(oldFileName).catch(() => {});
        throw restoreError;
      }
      if (!checksumMatches) {
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
        let needsReplace = existingStats !== undefined;
        if (!needsReplace)
          try {
            await rename(oldFileName, executablePath);
          } catch (error) {
            let errnoCode = getErrnoCode(error);
            if (errnoCode !== "EEXIST" && errnoCode !== "EPERM" && errnoCode !== "EBUSY") throw error;
            needsReplace = true;
          }
        if (needsReplace) {
          let backupPath = backupPathFor(executablePath);
          await rename(executablePath, backupPath);
          try {
            await rename(oldFileName, executablePath);
          } catch (copyError) {
            try {
              await rename(backupPath, executablePath);
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
//@ chunk-e5z7dpjd.js:41085-43101 facade-exports (2.1.88 match: checkInstall, 0.623)
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
  let issues = [];
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
    issues.push("bin_dir_missing");
  }
  if (isWindows) {
    if (!(await isExecutableFile(dirs.executable))) {
      messages.push({
        message: `claude command at ${dirs.executable} missing or broken`,
        userActionRequired: true,
        type: "error",
      });
      issues.push("executable_missing");
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
        issues.push("executable_invalid");
      }
    } catch (e) {
      if (isENOENT(e)) {
        messages.push({
          message: `claude command at ${dirs.executable} missing or broken`,
          userActionRequired: true,
          type: "error",
        });
        issues.push("executable_missing");
      } else if (!(await isExecutableFile(dirs.executable))) {
        messages.push({
          message: `claude command at ${dirs.executable} missing or broken (not a valid Claude binary)`,
          userActionRequired: true,
          type: "error",
        });
        issues.push("executable_invalid");
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
    issues.push("not_in_path");
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
  if (issues.length === 0) logFeatureOk("native_check_install");
  else logFeatureSad("native_check_install", issues[0]);
  return messages;
}
//@ chunk-e5z7dpjd.js:43101-43177 layout
class InFlightInstall {
  inFlight = null;
  begin(inFlight) {
    this.inFlight = inFlight;
  }
  reset() {
    this.inFlight = null;
  }
}
//@ chunk-e5z7dpjd.js:43177-43202 layout
var installLatestInFlight; // deferred: uses InFlightInstall of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e5z7dpjd.js:43177", () => {
  installLatestInFlight = new HostScoped(() => new InFlightInstall());
});
//@ chunk-e5z7dpjd.js:43202-43414 facade-exports (2.1.88 match: installLatest, 0.697)
/**
 * installLatest：合并同进程内并发调用（in-flight）后调用 installLatestImpl。
 */
function installLatest(channelOrVersion, forceReinstall = false, storageBackend) {
  if (forceReinstall) return installLatestImpl(channelOrVersion, forceReinstall, storageBackend);
  let storageBackend_2 = installLatestInFlight.of(getRootSession().host);
  if (storageBackend_2.inFlight) {
    logForDebugging("installLatest: joining in-flight call");
    return storageBackend_2.inFlight;
  }
  let promise = installLatestImpl(channelOrVersion, forceReinstall, storageBackend);
  storageBackend_2.begin(promise);
  let clear = () => {
    storageBackend_2.reset();
  };
  promise.then(clear, clear);
  return promise;
}
//@ chunk-e5z7dpjd.js:43414-44059 fingerprint (2.1.88 match: installLatestImpl, 0.91)
/**
 * installLatestImpl：updateLatest 成功后把 installMethod 设为 native 并关闭旧的自动更新方式。
 */
async function installLatestImpl(channelOrVersion, forceReinstall = false, storageBackend) {
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
      storageBackend,
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
//@ chunk-e5z7dpjd.js:44059-44159 layout
async function getVersionFromSymlink(executable) {
  try {
    let linkTarget = await readlink(executable);
    let resolvedTarget = resolve(dirname(executable), linkTarget);
    if (await isExecutableFile(resolvedTarget)) return resolvedTarget;
  } catch {}
  return null;
}
//@ chunk-e5z7dpjd.js:44159-44211 fingerprint (2.1.88 match: getLockFilePathFromVersionPath, 1)
function getLockFilePathFromVersionPath(dirs, versionPath) {
  return join(dirs.locks, `${versionOrDefault(versionPath)}.lock`);
}
//@ chunk-e5z7dpjd.js:44211-44673 layout
async function isBundleLockActive(paths, version) {
  let lockFilePathFromVersionPath = getLockFilePathFromVersionPath(paths, version);
  if (isAutoUpdateEnabled()) {
    if (isLockActive(lockFilePathFromVersionPath)) return true;
    let currentVersion = bundleVersionOfPath(version);
    if (currentVersion === undefined) return false;
    let lockNames;
    try {
      lockNames = await readdir(paths.locks);
    } catch (error) {
      if (isENOENT(error)) return false;
      logForDebugging(
        `Keeping the app bundle of ${currentVersion}: could not list the locks folder ${paths.locks}: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
      return true;
    }
    return lockNames.some(
      (lockName) =>
        lockName.startsWith(`${currentVersion}@`) &&
        /^\d+\.lock$/.test(lockName.slice(currentVersion.length + 1)) &&
        isLockActive(join(paths.locks, lockName)),
    );
  }
  try {
    return await checkLockfile(version, {
      stale: VERSION_RETENTION_MS,
      lockfilePath: lockFilePathFromVersionPath,
    });
  } catch (error) {
    return bundleVersionOfPath(version) !== undefined && !isENOENT(error);
  }
}
//@ chunk-e5z7dpjd.js:44673-44695 layout
var RETENTION_SWEEP_INTERVAL_MS = 300000;
var retentionSweepTimer = null;
//@ chunk-e5z7dpjd.js:44695-44772 layout
function startRetentionSweep() {
  if (retentionSweepTimer) return;
  let interval = setInterval(() => {
    sweepRetainedVersions();
  }, RETENTION_SWEEP_INTERVAL_MS);
  interval.unref?.();
  retentionSweepTimer = interval;
}
//@ chunk-e5z7dpjd.js:44772-45200 layout
async function sweepRetainedVersions() {
  try {
    if (!isAutoUpdateEnabled()) return;
    let baseDirectories = getBaseDirectories();
    if (
      !process.execPath.includes(baseDirectories.versions) &&
      bundleVersionOfPath(process.execPath) === undefined
    )
      return;
    let execPath = resolve(process.execPath);
    await mkdir(baseDirectories.locks, {
      recursive: true,
    });
    let taskListLockPath = getTaskListLockPath(
      baseDirectories.locks,
      versionOrDefault(execPath),
      process.pid,
    );
    if (readFileSafe(taskListLockPath)?.pid !== process.pid)
      tryAcquireComputerUseLock(execPath, baseDirectories.locks);
    let lockFilePathFromVersionPath = getLockFilePathFromVersionPath(baseDirectories, execPath);
    let file = readFileSafe(lockFilePathFromVersionPath);
    if (file?.pid === process.pid) return;
    if (file && isProcessRunning(file.pid)) return;
    await useCostSummary(execPath, lockFilePathFromVersionPath);
  } catch (error) {
    logForDebugging(`NON-FATAL: version lock maintenance failed: ${errorMessage(error)}`);
  }
}
//@ chunk-e5z7dpjd.js:45200-46462 facade-exports (2.1.88 match: lockCurrentVersion, 0.963)
/**
 * 为正在运行的版本加 PID 锁，防止被清理。
 */
async function lockCurrentVersion() {
  let dirs = getBaseDirectories();
  if (!process.execPath.includes(dirs.versions) && bundleVersionOfPath(process.execPath) === undefined)
    return;
  let versionPath = resolve(process.execPath);
  try {
    let lockfilePath = getLockFilePathFromVersionPath(dirs, versionPath);
    await mkdir(dirs.locks, {
      recursive: true,
    });
    if (isAutoUpdateEnabled()) {
      let perPidLockWritten = tryAcquireComputerUseLock(versionPath, dirs.locks);
      startRetentionSweep();
      await getAllLockInfo();
      if (!(await acquireProcessLifetimeLock(versionPath, lockfilePath))) {
        logEvent("tengu_version_lock_failed", {
          is_pid_based: true,
          is_lifetime_lock: true,
          per_pid_lock_written: perPidLockWritten,
        });
        logLockAcquisitionError(versionPath, Error("Lock already held by another process"));
        return;
      }
      logEvent("tengu_version_lock_acquired", {
        is_pid_based: true,
        is_lifetime_lock: true,
        per_pid_lock_written: perPidLockWritten,
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
//@ chunk-e5z7dpjd.js:46462-46591 fingerprint (2.1.88 match: logLockAcquisitionError, 0.667)
function logLockAcquisitionError(versionPath, lockError) {
  logForDebugging(
    `NON-FATAL: Lock acquisition failed for ${versionPath} (expected in multi-process scenarios): ${errorMessage(lockError)}`,
    {
      level: "error",
    },
  );
}
//@ chunk-e5z7dpjd.js:46591-46742 fingerprint (2.1.88 match: forceRemoveLock, 1)
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
//@ chunk-e5z7dpjd.js:46742-46757 layout
var STALE_STAGING_MS = 3600000;
//@ chunk-e5z7dpjd.js:46757-47161 layout
async function cleanupOldStagingDirs(stagingDir) {
  let cutoff = Date.now() - STALE_STAGING_MS;
  try {
    let entries = await readdir(stagingDir);
    let cleanedCount = 0;
    for (let entry of entries) {
      let entryPath = join(stagingDir, entry);
      try {
        if ((await stat(entryPath)).mtime.getTime() < cutoff) {
          await rm(entryPath, {
            recursive: true,
            force: true,
          });
          cleanedCount++;
          logForDebugging(`Cleaned up old staging directory: ${entry}`);
        }
      } catch {}
    }
    if (cleanedCount > 0) {
      logForDebugging(`Cleaned up ${cleanedCount} orphaned staging directories`);
      logEvent("tengu_native_staging_cleanup", {
        cleaned_count: cleanedCount,
      });
    }
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`Failed to clean up staging directories: ${error}`);
  }
}
//@ chunk-e5z7dpjd.js:47161-51416 facade-exports (2.1.88 match: cleanupOldVersions, 0.705)
/**
 * 清理旧版本：保留最近版本、删除过期 staging/备份与陈旧锁（Windows 处理 .old 可执行文件）。
 */
async function cleanupOldVersions() {
  await Promise.resolve();
  let dirs = getBaseDirectories();
  let oneHourAgo = Date.now() - 3600000;
  let twoWeekCutoff = Date.now() - 1209600000;
  let backupCutoff = Date.now() - BACKUP_RETENTION_MS;
  if (getPlatform().startsWith("win32")) {
    let executableDir = dirname(dirs.executable);
    let executableName = basename(dirs.executable);
    try {
      let files = await readdir(executableDir);
      let flattened = files.flatMap((file) => {
        let backupOrStagedName = parseBackupOrStagedName(file, executableName);
        return backupOrStagedName === undefined
          ? []
          : [
              {
                file,
                ...backupOrStagedName,
              },
            ];
      });
      let candidates = flattened
        .filter((candidate) => candidate.kind === "backup")
        .sort((left, right) => right.stampedMs - left.stampedMs);
      let found = files.find((file) => file.toLowerCase() === executableName.toLowerCase());
      let needsBaseCopy =
        candidates.length > 0 && !(found !== undefined && (await isNonEmptyFile(join(executableDir, found))));
      let keptBackup = needsBaseCopy
        ? await findFirstExistingFile(candidates, (candidate) => join(executableDir, candidate.file))
        : undefined;
      let stagingCleanedCount = 0;
      for (let file of flattened) {
        if (
          file.kind === "backup" &&
          needsBaseCopy &&
          ((file === keptBackup && file.stampedMs >= backupCutoff) || file.stampedMs >= twoWeekCutoff)
        )
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
        if ((await lstat(entryPath)).mtime.getTime() < oneHourAgo) {
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
  let included = versionEntries.includes(BUNDLES_DIR);
  if (versionFiles.length === 0 && !included) {
    logFeatureOk("native_cleanup_versions");
    return;
  }
  if (
    !(await isInstallLinkOrMissing(dirs.executable)) &&
    !(await isNpmSymlink(dirs.executable).catch(() => false))
  ) {
    if (included)
      await cleanUpAppBundles(dirs, {
        keepEveryBundle: true,
      });
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
    let currentVersion = bundleVersionOfPath(currentBinaryPath);
    if (currentVersion !== undefined) protectedVersions.add(resolve(dirs.versions, currentVersion));
    let currentSymlinkVersion = await getVersionFromSymlink(dirs.executable);
    if (currentSymlinkVersion) protectedVersions.add(currentSymlinkVersion);
    else if (getPlatform().startsWith("win32"))
      try {
        let executableStats = await stat(dirs.executable);
        for (let versionFile of versionFiles)
          if (versionFile.size === executableStats.size) protectedVersions.add(versionFile.resolvedPath);
      } catch {}
    if (isAutoUpdateEnabled()) {
      let activeLockVersions = await readActiveLockVersions(dirs.locks);
      if (activeLockVersions === null) {
        logForDebugging(
          "Skipping version cleanup: could not read the locks, so lock protection is unavailable",
          {
            level: "error",
          },
        );
        logFeatureSad("native_cleanup_versions", "lock_scan_failed");
        return;
      }
      for (let versionFile of versionFiles) {
        if (protectedVersions.has(versionFile.resolvedPath)) continue;
        if (activeLockVersions.has(versionFile.name)) {
          protectedVersions.add(versionFile.resolvedPath);
          logForDebugging(`Protecting locked version from cleanup: ${versionFile.name}`);
        }
      }
    } else
      for (let versionFile of versionFiles) {
        if (protectedVersions.has(versionFile.resolvedPath)) continue;
        if (await isBundleLockActive(dirs, versionFile.resolvedPath)) {
          protectedVersions.add(versionFile.resolvedPath);
          logForDebugging(`Protecting locked version from cleanup: ${versionFile.name}`);
        }
        await new Promise((resolve) => setImmediate(resolve));
      }
    let eligibleVersions = versionFiles
      .filter((v) => !protectedVersions.has(v.resolvedPath))
      .sort((left, right) => right.mtime.getTime() - left.mtime.getTime());
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
          let stillEligible = true;
          let lockBusy = false;
          let deleted = await tryWithVersionLock(version.path, async () => {
            if (version.size === 0) {
              let rechecked = await stat(version.path);
              if (rechecked.size > 0 || rechecked.mtime.getTime() >= oneHourAgo) {
                stillEligible = false;
                return;
              }
            }
            if (isAutoUpdateEnabled() && readLockContent(dirs.locks, version.name)) {
              lockBusy = true;
              return;
            }
            await unlink(version.path);
          });
          if (deleted && lockBusy) {
            lockFailedCount++;
            logForDebugging(`Skipping deletion of ${version.name} - a live process may be using it`);
          } else if (deleted && stillEligible) deletedCount++;
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
  } finally {
    if (included)
      await cleanUpAppBundles(dirs, {
        keepEveryBundle: false,
      });
  }
}
//@ chunk-e5z7dpjd.js:51416-51666 layout
async function cleanUpAppBundles(paths, { keepEveryBundle }) {
  let cleanedOrStatus = await cleanUpBundles(
    paths.versions,
    keepEveryBundle
      ? undefined
      : {
          launcherPath: paths.executable,
          isVersionLockActive: (versionPath) => isBundleLockActive(paths, versionPath),
        },
  );
  if (typeof cleanedOrStatus === "number")
    logFeatureOk("native_cleanup_app_bundles", {
      cleaned_count: cleanedOrStatus,
    });
  else logFeatureSad("native_cleanup_app_bundles", cleanedOrStatus);
}
//@ chunk-e5z7dpjd.js:51666-52265 facade-exports (2.1.88 match: removeInstalledSymlink, 0.752)
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
//@ chunk-e5z7dpjd.js:52265-52851 facade-exports (2.1.88 match: cleanupShellAliases, 0.822)
/**
 * 从 shell 配置文件删除旧的 claude alias。
 */
async function cleanupShellAliases() {
  let messages = [];
  let configMap = getShellConfigPaths();
  let writeFailed = false;
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
      writeFailed = true;
      logForDebugging(`Failed to clean up claude alias from ${configFile}: ${error}`, {
        level: "error",
      });
      messages.push({
        message: `Failed to clean up ${configFile}: ${error}`,
        userActionRequired: false,
        type: "error",
      });
    }
  if (writeFailed) logFeatureSad("native_cleanup_aliases", "config_write_failed");
  else logFeatureOk("native_cleanup_aliases");
  return messages;
}
//@ chunk-e5z7dpjd.js:52851-53833 fingerprint (2.1.88 match: manualRemoveNpmPackage, 0.99)
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
//@ chunk-e5z7dpjd.js:53833-54622 fingerprint (2.1.88 match: attemptNpmUninstall, 0.979)
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
//@ chunk-e5z7dpjd.js:54622-56950 facade-exports (2.1.88 match: cleanupNpmInstallations, 0.538)
/**
 * 迁移到原生安装后卸载全局 npm 包（@anthropic-ai/claude-code 等）。
 */
async function cleanupNpmInstallations() {
  let errors = [];
  let warnings = [];
  let removed = 0;
  let npmUninstallFailed = false;
  let localInstallRemoveFailed = false;
  let codePackageResult = await attemptNpmUninstall("@anthropic-ai/claude-code");
  if (codePackageResult.success) {
    removed++;
    if (codePackageResult.warning) warnings.push(codePackageResult.warning);
  } else if (codePackageResult.error) {
    errors.push(codePackageResult.error);
    npmUninstallFailed = true;
  }
  if (
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.PACKAGE_URL &&
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.PACKAGE_URL !== "@anthropic-ai/claude-code"
  ) {
    let macroPackageResult = await attemptNpmUninstall(
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.PACKAGE_URL,
    );
    if (macroPackageResult.success) {
      removed++;
      if (macroPackageResult.warning) warnings.push(macroPackageResult.warning);
    } else if (macroPackageResult.error) {
      errors.push(macroPackageResult.error);
      npmUninstallFailed = true;
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
      localInstallRemoveFailed = true;
    }
  }
  if (errors.length === 0) logFeatureOk("native_cleanup_npm");
  else if (removed > 0) logFeatureSad("native_cleanup_npm", "partial_errors");
  else if (npmUninstallFailed && !localInstallRemoveFailed)
    logFeatureBad("native_cleanup_npm", "npm_uninstall_failed");
  else if (localInstallRemoveFailed && !npmUninstallFailed)
    logFeatureBad("native_cleanup_npm", "local_install_remove_failed");
  else logFeatureBad("native_cleanup_npm", "npm_uninstall_failed");
  return {
    removed,
    errors,
    warnings,
  };
}
export {
  lockCurrentVersion,
  removeInstalledSymlink,
  StagedBinaryChecksumError,
  installLatest,
  checkInstall,
  atomicMoveToInstallPath_2,
  isSymlinkIntoInstallDir,
  isNpmSymlink,
  isBridgeChildMachineSettings,
  cleanupOldVersions,
  prefetchEligibilityIfNeeded,
  getBinaryName,
  getPlatform,
  cleanupNpmInstallations,
  cleanupShellAliases,
  isInstallLinkOrMissing,
  isPossibleClaudeBinary,
};
