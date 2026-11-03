/**
 * utils/autoUpdater.ts
 *
 * 并入已有模块：自动更新
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/autoUpdater.ts
 * pieces: chunk-6zvphrsz.js (61), chunk-e6aww6q8.js (1), chunk-s61vbvea.js (1)
 * attribution: placement 30, fingerprint 12, layout 18, callgraph-witnessed 1, affinity 1, sole-consumer 1
 */
import { join, dirname, basename } from "path";
import { writeFile, stat, access, readdir, unlink, copyFile, rm, rename, open } from "fs/promises";
import { homedir } from "os";
import { constants } from "fs";
import { randomBytes } from "crypto";
import { Re } from "../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../vendor/semver/index.js";
import { pendingWithoutStart, currentFetchHold } from "./plugins/hooksModulesRollout.js";
import {
  getLastInteractionTime,
  getIsNonInteractiveSession,
  getSessionId,
  getRootSession,
} from "../bootstrap/state.js";
import { isForegroundBusy } from "./plugins/hooksModulesLoadGate.js";
import { sleep } from "./sleep.js";
import { isTerminalShutdown, latchTerminalShutdown } from "./terminalShutdown.js";
import { logForDebugging } from "./debug.js";
import {
  errorMessage,
  ClaudeError,
  isENOENT,
  getErrnoCode,
  sanitizedErrCodeForTelemetry,
  withTelemetryMessage,
  sanitizeErrnoForTelemetry,
} from "./errors.js";
import { getDynamicConfig_BLOCKS_ON_INIT } from "../services/analytics/growthbook.js";
import { lt_2, semverGt, semverLt, semverGte } from "./semver.js";
import { emitExitMessage, gracefulShutdown, gracefulShutdownSync } from "./gracefulShutdown.js";
import { cliError } from "../cli/exit.js";
import { logError } from "./log.js";
import {
  isStartupFailureResultRequested,
  isStreamJsonLaunch,
  buildStartupFailureResult,
} from "../cli/startupFailureResult.js";
import { writeToStdout } from "./process.js";
import { jsonStringify, isStandaloneExecutable, jsonParse } from "./slowOperations.js";
import { HostScoped } from "./hostScoped.js";
import { logEvent } from "../services/analytics/index.js";
import { sanitizeVersion, platformOrOther } from "../services/analytics/metadata.js";
import { escapeControlChars } from "./resultError.js";
import { getInitialSettings_2, getSettingsForSource } from "./settings/settings.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { getFsImplementation } from "./fsOperations.js";
import { env } from "./env.js";
import { execFileNoThrowWithCwd, execFileNoThrow } from "./execFileNoThrow.js";
import { getPlatform } from "./platform.js";
import { NATIVE_BINARY_MISSING_TEXT, MAX_BINARY_PROBE_BYTES } from "./nativeInstaller/nativeBinaryMissing.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { isEssentialTrafficOnly } from "./privacyLevel.js";
import { publicCdnGuardedClient } from "./nativeInstaller/downloadsClient.js";
import { externalHttp } from "../services/http/externalHttp.js";
import { gatherAllCandidates } from "./listSessionsImpl.js";
import { retryFsOp, DISK_FULL_CODES } from "./atomicPublishWrite.js";
import { ATOMIC_WRITE_ERRNOS } from "./plugins/safeCopy.js";
import { lit, fromEnum, fromSanitizer_SANITIZER_OUTPUT_ONLY } from "../services/analytics/safeMetadata.js";
import { saveGlobalConfig } from "./config.js";
import {
  getShellConfigPaths,
  readFileLinesOrNull,
  filterClaudeAliases,
  writeFileLines,
} from "./shellConfig.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "./fsFlags.js";
import { regExp_11, parsePrUrl_2, linkPrToSession } from "../tools/shared/gitOperationTracking.js";

//@ chunk-6zvphrsz.js:1282-1299 placement
/**
 * semver 模块的包装导入（用于版本比较）。
 */
var semverModule = Re(require_semver_3(), 1);
//@ chunk-6zvphrsz.js:1579-1641 placement
/**
 * 若正在安装则等待其完成，否则直接返回。
 */
function awaitInstallOver(e) {
  return pendingWithoutStart(e) ? e.over.promise : Promise.resolve();
}
//@ chunk-6zvphrsz.js:1641-1653 placement
/**
 * 安装前要求用户闲置的时长（2 秒）。
 */
var INSTALL_QUIET_WINDOW_MS = 2000;
//@ chunk-6zvphrsz.js:1653-1696 placement
/**
 * 距上次用户交互还需静默的毫秒数。
 */
var remainingQuietWindowMs = () =>
  Math.max(INSTALL_QUIET_WINDOW_MS - (Date.now() - getLastInteractionTime()), 0);
//@ chunk-6zvphrsz.js:1696-1720 placement
/**
 * 是否还需等待静默窗口。
 */
var shouldWaitForQuiet = () => remainingQuietWindowMs() > 0 || isForegroundBusy();
//@ chunk-6zvphrsz.js:1720-1732 placement
/**
 * 等待静默时的最小轮询间隔（1 秒）。
 */
var QUIET_POLL_MS = 1000;
//@ chunk-6zvphrsz.js:1732-1770 placement
/**
 * 静默等待的轮询延迟。
 */
var quietPollDelayMs = () =>
  isForegroundBusy() ? Math.max(remainingQuietWindowMs(), QUIET_POLL_MS) : remainingQuietWindowMs();
//@ chunk-6zvphrsz.js:1770-1815 placement
/**
 * 等到静默窗口结束再继续。
 */
async function waitForQuietWindow() {
  while (shouldWaitForQuiet()) await sleep(quietPollDelayMs());
}
//@ chunk-6zvphrsz.js:1815-1982 placement
async function shutDownAfterRefusal(e) {
  await waitForQuietWindow();
  if (isTerminalShutdown()) return;
  e.say();
  await e.shutDown().catch((error) =>
    logForDebugging(`refusal after the flag fetch hold failed (${errorMessage(error)})`, {
      level: "error",
    }),
  );
  e.hard();
}
//@ chunk-6zvphrsz.js:1982-2040 placement
/**
 * 会话持有安装权时执行回调，否则走关停流程。
 */
function refuserOrRun(e, r, n) {
  return e.hasHeld && !getIsNonInteractiveSession() ? void shutDownAfterRefusal(n) : r();
}
//@ chunk-6zvphrsz.js:2040-2054 placement
/**
 * 原样返回输入（占位辅助）。
 */
var identityFn = (e) => e;
//@ chunk-6zvphrsz.js:2054-2063 placement
/**
 * 安装锁编号（1）。
 */
var INSTALL_LOCK_KEY = 1;
//@ chunk-6zvphrsz.js:2063-2292 placement
/**
 * 带超时与指数退避抖动的重试。
 */
async function retryWithTimeout(e, r) {
  let n;
  for (let idx = 1; idx <= r.attempts; idx++)
    try {
      return await e(AbortSignal.timeout(r.timeoutMs));
    } catch (error) {
      n = error;
      if (idx >= r.attempts) break;
      r.onRetry?.(idx, error);
      let u = 500 * 3 ** (idx - 1);
      await sleep(u * (0.75 + Math.random() * 0.5));
    }
  throw n;
}
//@ chunk-6zvphrsz.js:6186-6244 placement
/**
 * 官方发布包的下载地址。
 */
var RELEASES_BASE_URL = "https://downloads.claude.ai/claude-code-releases";
//@ chunk-6zvphrsz.js:6244-6266 placement
/**
 * 应用更新失败的错误类型（ClaudeError 子类）。
 */
class UpdateApplyError extends ClaudeError {}
//@ chunk-6zvphrsz.js:6266-6513 placement
/**
 * 更新应用失败原因到错误键。
 */
function updateApplyErrorKey(failureHint) {
  switch (failureHint) {
    case "windows_running_exe_lock":
      return "update_apply_exe_locked";
    case "native_binary_missing":
      return "update_apply_native_binary_missing";
    case "registry_session_refused":
      return "update_session_refused";
    case undefined:
      return null;
  }
}
//@ chunk-6zvphrsz.js:6513-7753 placement
/**
 * 启动时按 tengu_version_config 检查最低版本，过低时提示并退出。
 */
async function enforceMinimumVersion() {
  try {
    let e = currentFetchHold();
    await awaitInstallOver(e);
    let dynamicConfig_BLOCKS_ON_INIT = await getDynamicConfig_BLOCKS_ON_INIT("tengu_version_config", {
      minVersion: "0.0.0",
    });
    if (
      dynamicConfig_BLOCKS_ON_INIT.minVersion &&
      lt_2(
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
        dynamicConfig_BLOCKS_ON_INIT.minVersion,
      )
    ) {
      let n = assertMinVersion(
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
        dynamicConfig_BLOCKS_ON_INIT.minVersion,
      );
      refuserOrRun(
        e,
        () => exitBelowMinVersion(dynamicConfig_BLOCKS_ON_INIT.minVersion),
        identityFn({
          say: () => {
            latchTerminalShutdown();
            emitExitMessage(n);
          },
          shutDown: () => gracefulShutdown(INSTALL_LOCK_KEY),
          hard: cliError,
        }),
      );
    }
  } catch (error) {
    logError(error);
  }
}
//@ chunk-6zvphrsz.js:7753-8499 placement
/**
 * 版本低于最低要求时打印说明并退出。
 */
function exitBelowMinVersion(minVersion) {
  let r = assertMinVersion(
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
    minVersion,
  );
  console.error(`
${r}
`);
  if (isStartupFailureResultRequested() && isStreamJsonLaunch())
    try {
      writeToStdout(
        jsonStringify(
          buildStartupFailureResult({
            sessionId: getSessionId(),
            message: r,
            reason: "cli_version_too_old",
            resultIndex: null,
          }),
        ) +
          `
`,
      );
    } catch (error) {
      logForDebugging(`[assertMinVersion] startup failure result not written: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  gracefulShutdownSync(INSTALL_LOCK_KEY);
}
//@ chunk-6zvphrsz.js:8499-8765 fingerprint = assertMinVersion (0.615)
function assertMinVersion(e, r) {
  return `It looks like your version of Claude Code (${e}) needs an update.
A newer version (${r} or higher) is required to continue.

To update, please run:
    claude update

This will ensure you have access to the latest features and improvements.`;
}
//@ chunk-6zvphrsz.js:8765-8779 layout
var AUTO_UPDATE_CHECK_THROTTLE_MS = 300000;
//@ chunk-6zvphrsz.js:8779-8868 layout
class AutoUpdaterState {
  lastAutoUpdateCheckAt = 0;
  updateRestoreFailure = null;
  mintedPreservedInodes = new Set();
}
//@ chunk-6zvphrsz.js:8868-8893 layout
var autoUpdaterSlot = new HostScoped(() => new AutoUpdaterState());
//@ chunk-6zvphrsz.js:8893-8930 layout
function getAutoUpdaterState() {
  return autoUpdaterSlot.of(getRootSession().host);
}
//@ chunk-6zvphrsz.js:8930-8941 layout
var STARTUP_GRACE_MS = 1e4;
//@ chunk-6zvphrsz.js:8941-9000 layout
/**
 * 距启动 10 秒宽限期还剩多少毫秒。
 */
function remainingStartupGraceMs() {
  return Math.max(0, STARTUP_GRACE_MS - process.uptime() * 1000);
}
//@ chunk-6zvphrsz.js:9000-9216 layout
/**
 * 自动更新检查节流：5 分钟内已检查过则跳过。
 */
function isAutoUpdateCheckThrottled() {
  let autoUpdaterState = getAutoUpdaterState();
  let now = Date.now();
  if (now - autoUpdaterState.lastAutoUpdateCheckAt < AUTO_UPDATE_CHECK_THROTTLE_MS) {
    logForDebugging(
      `auto-update check throttled (last check ${Math.round((now - autoUpdaterState.lastAutoUpdateCheckAt) / 1000)}s ago)`,
    );
    return true;
  }
  autoUpdaterState.lastAutoUpdateCheckAt = now;
  return false;
}
//@ chunk-6zvphrsz.js:9216-9268 layout
/**
 * getMaxVersion：GrowthBook 下发的版本上限（外部用户 external 字段）。
 */
async function getMaxVersion() {
  return (await resolveMaxVersionConfig()).maxVersion;
}
//@ chunk-6zvphrsz.js:9268-9600 layout
/**
 * 读取 GrowthBook tengu_max_version_config：版本上限与强制降级开关。
 */
async function resolveMaxVersionConfig() {
  let maxVersionConfig = await getMaxVersionConfig();
  let r = false;
  let external = maxVersionConfig.external || undefined;
  let o = external ? (semverModule.parse(external)?.version ?? undefined) : undefined;
  if (external && !o) {
    logForDebugging(`tengu_max_version_config has invalid version '${external}' \u2014 ignoring`, {
      level: "error",
    });
    logEvent("tengu_max_version_config_invalid", {
      raw_value: sanitizeVersion(external),
    });
  }
  return {
    maxVersion: o,
    forceDowngradeEnabled: maxVersionConfig.external_force_downgrade === true,
  };
}
//@ chunk-6zvphrsz.js:9600-9904 layout
/**
 * 强制降级是否生效：当前版本高于上限时才降。
 */
function isForceDowngradeActive(e, maxVersion, n) {
  let o = n === "native_update" ? "Native installer" : "AutoUpdater";
  let s = semverModule.parse(e);
  if (s && s.compare(maxVersion) > 0) {
    logForDebugging(`${o}: force-downgrade active \u2014 moving from ${e} to ${maxVersion}`);
    return true;
  }
  logForDebugging(
    `${o}: force-downgrade flag set but current ${e} is not above ${maxVersion} \u2014 taking normal upgrade path`,
  );
  return false;
}
//@ chunk-6zvphrsz.js:9904-9969 fingerprint = getMaxVersionMessage (0.469)
/**
 * 版本上限的提示文案（external_message）。
 */
async function getMaxVersionMessage() {
  return (await getMaxVersionConfig()).external_message || undefined;
}
//@ chunk-6zvphrsz.js:9969-10065 fingerprint = getMaxVersionConfig (1)
async function getMaxVersionConfig() {
  try {
    return await getDynamicConfig_BLOCKS_ON_INIT("tengu_max_version_config", {});
  } catch (error) {
    logError(error);
    return {};
  }
}
//@ chunk-6zvphrsz.js:10065-10942 layout
/**
 * 返回跳过某目标版本的原因（低于 minimumVersion、高于上限等），无则 null。
 */
function getVersionSkipReason(e) {
  if (!semverModule.parse(e)) {
    logForDebugging("update target is not a valid semver version \u2014 skip checks constrain nothing", {
      level: "error",
    });
    logForDebugging(
      `update target (first 300 chars, JSON-encoded): ${escapeControlChars(JSON.stringify(e.slice(0, 300)))}`,
    );
    return null;
  }
  let minimumVersion = getInitialSettings_2()?.minimumVersion;
  if (minimumVersion) {
    let version = semverModule.parse(minimumVersion)?.version;
    if (!version)
      logForDebugging(
        `minimumVersion is not a valid semver version \u2014 ignoring. Value (first 300 chars, JSON-encoded): ${escapeControlChars(JSON.stringify(minimumVersion.slice(0, 300)))}`,
        {
          level: "error",
        },
      );
    else if (!semverGt(e, version)) return `below your minimumVersion setting (${minimumVersion})`;
  }
  let requiredMaximumVersion = getSettingsForSource("policySettings")?.requiredMaximumVersion;
  if (requiredMaximumVersion) {
    let version = semverModule.parse(requiredMaximumVersion)?.version;
    if (!version)
      logForDebugging(
        `requiredMaximumVersion is not a valid semver version \u2014 ignoring. Value (first 300 chars, JSON-encoded): ${escapeControlChars(JSON.stringify(requiredMaximumVersion.slice(0, 300)))}`,
        {
          level: "error",
        },
      );
    else if (!semverLt(e, version))
      return `above your organization's requiredMaximumVersion (${requiredMaximumVersion})`;
  }
  return null;
}
//@ chunk-6zvphrsz.js:10942-11027 fingerprint = shouldSkipVersion (0.806)
/**
 * shouldSkipVersion：目标版本应跳过时记日志并返回 true。
 */
function shouldSkipVersion(targetVersion) {
  let versionSkipReason = getVersionSkipReason(targetVersion);
  if (versionSkipReason) logForDebugging(`Skipping update to ${targetVersion}: ${versionSkipReason}`);
  return versionSkipReason !== null;
}
//@ chunk-6zvphrsz.js:11027-11040 layout
var LOCK_TIMEOUT_MS = 300000;
//@ chunk-6zvphrsz.js:11040-11084 fingerprint = getLockFilePath (1)
function getLockFilePath() {
  return join(getClaudeConfigDir(), ".update.lock");
}
//@ chunk-6zvphrsz.js:11084-11129 layout
function getUpdateLockStateKey() {
  return STORAGE_SPACES.state("update-lock");
}
//@ chunk-6zvphrsz.js:11129-11940 layout
async function acquireStorageUpdateLock(e) {
  let updateLockStateKey = getUpdateLockStateKey();
  let n = await e.statMeta(updateLockStateKey);
  if (n.ok) {
    if (Date.now() - n.value.mtimeMs < LOCK_TIMEOUT_MS) return false;
    let u = await e.statMeta(updateLockStateKey);
    if (u.ok) {
      if (Date.now() - u.value.mtimeMs < LOCK_TIMEOUT_MS) return false;
      let R = await e.delete(updateLockStateKey);
      if (!R.ok) {
        logForDebugging(`AutoUpdater: failed to remove stale update lock: ${R.error.code}`, {
          level: "error",
        });
        return false;
      }
    } else if (u.error.code !== "NotFound") {
      logForDebugging(`AutoUpdater: failed to re-stat stale update lock: ${u.error.code}`, {
        level: "error",
      });
      return false;
    }
  } else if (n.error.code !== "NotFound") {
    logForDebugging(`AutoUpdater: failed to stat update lock: ${n.error.code}`, {
      level: "error",
    });
    return false;
  }
  let o = await e.write(updateLockStateKey, `${process.pid}`, {
    precondition: {
      type: "ifAbsent",
    },
    mode: 438 & ~process.umask(),
  });
  if (o.ok) return true;
  if (o.error.code === "AlreadyExists") return false;
  logForDebugging(`AutoUpdater: failed to create update lock: ${o.error.code}`, {
    level: "error",
  });
  return false;
}
//@ chunk-6zvphrsz.js:11940-12644 fingerprint = acquireLock (0.726)
/**
 * acquireLock：~/.claude/.update.lock（或 v5 存储），5 分钟内的锁视为有效。
 */
async function acquireLock(e) {
  if (isStorageV5Enabled() && e) return acquireStorageUpdateLock(e);
  let fs = getFsImplementation();
  let lockPath = getLockFilePath();
  try {
    let stats = await fs.stat(lockPath);
    if (Date.now() - stats.mtimeMs < LOCK_TIMEOUT_MS) return false;
    try {
      let recheck = await fs.stat(lockPath);
      if (Date.now() - recheck.mtimeMs < LOCK_TIMEOUT_MS) return false;
      await fs.unlink(lockPath);
    } catch (err) {
      if (!isENOENT(err)) {
        logError(err);
        return false;
      }
    }
  } catch (err) {
    if (!isENOENT(err)) {
      logError(err);
      return false;
    }
  }
  try {
    await writeFile(lockPath, `${process.pid}`, {
      encoding: "utf8",
      flag: "wx",
    });
    return true;
  } catch (err) {
    let code = getErrnoCode(err);
    if (code === "EEXIST") return false;
    if (code === "ENOENT")
      try {
        await fs.mkdir(getClaudeConfigDir());
        await writeFile(lockPath, `${process.pid}`, {
          encoding: "utf8",
          flag: "wx",
        });
        return true;
      } catch (mkdirErr) {
        if (getErrnoCode(mkdirErr) === "EEXIST") return false;
        logForDebugging(`Failed to create config dir or update lock file: ${mkdirErr}`, {
          level: "error",
        });
        return false;
      }
    logForDebugging(`AutoUpdater: failed to create update lock file ${lockPath}: ${err}`, {
      level: "error",
    });
    return false;
  }
}
//@ chunk-6zvphrsz.js:12644-13233 layout
async function releaseLock(e) {
  if (isStorageV5Enabled() && e) {
    let o = await e.read([getUpdateLockStateKey()]);
    if (!o.ok) {
      logForDebugging(`AutoUpdater: failed to release update lock: ${o.error.code}`, {
        level: "error",
      });
      return;
    }
    let s = o.value.items[0];
    if (!s.found) return;
    if (Buffer.from(s.value).toString("utf8") === `${process.pid}`) {
      let u = await e.delete(getUpdateLockStateKey());
      if (!u.ok)
        logForDebugging(`AutoUpdater: failed to release update lock: ${u.error.code}`, {
          level: "error",
        });
    }
    return;
  }
  let fsImplementation = getFsImplementation();
  let lockFilePath = getLockFilePath();
  try {
    if (
      (await fsImplementation.readFile(lockFilePath, {
        encoding: "utf8",
      })) === `${process.pid}`
    )
      await fsImplementation.unlink(lockFilePath);
  } catch (error) {
    if (isENOENT(error)) return;
    logForDebugging(`AutoUpdater: failed to release update lock file ${lockFilePath}: ${error}`, {
      level: "error",
    });
  }
}
//@ chunk-6zvphrsz.js:13233-13486 layout
function getGlobalPackageManager() {
  let replaced = process.execPath.replace(/\\/g, "/");
  let replaced_2 = (env.BUN_INSTALL ?? "").replace(/\\/g, "/").replace(/\/+$/, "");
  if (
    replaced.includes("/.bun/install/global/") ||
    (replaced_2 && replaced.startsWith(replaced_2 + "/install/global/"))
  )
    return "bun";
  return env.isRunningWithBun() && !isStandaloneExecutable() ? "bun" : "npm";
}
//@ chunk-6zvphrsz.js:13486-13851 fingerprint = getInstallationPrefix (0.788)
async function getInstallationPrefix() {
  let isBun = getGlobalPackageManager() === "bun";
  let prefixResult = null;
  if (isBun)
    prefixResult = await execFileNoThrowWithCwd("bun", ["pm", "bin", "-g"], {
      cwd: homedir(),
      useToolMemoryCgroup: false,
    });
  else
    prefixResult = await execFileNoThrowWithCwd("npm", ["-g", "config", "get", "prefix"], {
      cwd: homedir(),
      useToolMemoryCgroup: false,
    });
  if (prefixResult.code !== 0) {
    logForDebugging(
      `Failed to check ${isBun ? "bun" : "npm"} permissions (exit ${prefixResult.code}): ${prefixResult.stderr.trim()}`,
      {
        level: "error",
      },
    );
    return null;
  }
  return prefixResult.stdout.trim() || null;
}
//@ chunk-6zvphrsz.js:13851-14652 layout
async function getGlobalInstallPaths() {
  let installationPrefix = await getInstallationPrefix();
  if (!installationPrefix) return null;
  if (getGlobalPackageManager() === "bun") {
    let n = join(installationPrefix, "claude");
    return {
      execPaths: [n],
      imagePath: n,
    };
  }
  if (getPlatform() === "windows")
    return {
      execPaths: [join(installationPrefix, "claude.cmd"), join(installationPrefix, "claude.exe")],
      imagePath: join(
        installationPrefix,
        "node_modules",
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
        "bin",
        "claude.exe",
      ),
    };
  let r = join(installationPrefix, "bin", "claude");
  return {
    execPaths: [r],
    imagePath: r,
  };
}
//@ chunk-6zvphrsz.js:14652-15738 layout
async function verifyInstalledVersion(e) {
  let now = Date.now();
  let globalInstallPaths = await getGlobalInstallPaths();
  let version = e ? semverModule.parse(e)?.version : undefined;
  let s = false;
  let u = false;
  for (let p of globalInstallPaths?.execPaths ?? []) {
    let w = await execFileNoThrowWithCwd(p, ["--version"], {
      abortSignal: AbortSignal.timeout(45000),
      cwd: homedir(),
      useToolMemoryCgroup: false,
    });
    let version_2 = semverModule.parse(w.stdout.trim().split(/\s+/)[0])?.version;
    if (
      w.code === 0 &&
      version_2 != null &&
      (version != null
        ? version_2 === version
        : semverGte(
            version_2,
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
          ))
    )
      return {
        outcome: "landed",
        version: version_2,
        durationMs: Date.now() - now,
      };
    if (w.code !== 0) {
      s = true;
      u ||= `${w.stdout}
${w.stderr}`.includes(NATIVE_BINARY_MISSING_TEXT);
    }
  }
  return {
    outcome:
      u ||
      (s &&
        globalInstallPaths !== null &&
        (await stat(globalInstallPaths.imagePath).then(
          (p) => p.isFile() && p.size < MAX_BINARY_PROBE_BYTES,
          () => false,
        )))
        ? "placeholder_stub"
        : "inconclusive",
    durationMs: Date.now() - now,
  };
}
//@ chunk-6zvphrsz.js:15738-16063 fingerprint = checkGlobalInstallPermissions (1)
/**
 * 检查 npm 全局前缀是否可写。
 */
async function checkGlobalInstallPermissions() {
  try {
    let prefix = await getInstallationPrefix();
    if (!prefix)
      return {
        hasPermissions: false,
        npmPrefix: null,
      };
    try {
      await access(prefix, constants.W_OK);
      return {
        hasPermissions: true,
        npmPrefix: prefix,
      };
    } catch {
      logForDebugging("Insufficient permissions for global npm install.", {
        level: "error",
      });
      return {
        hasPermissions: false,
        npmPrefix: prefix,
      };
    }
  } catch (error) {
    logError(error);
    return {
      hasPermissions: false,
      npmPrefix: null,
    };
  }
}
//@ chunk-6zvphrsz.js:16063-17635 fingerprint = getLatestVersion (0.498)
/**
 * getLatestVersion：npm view @anthropic-ai/claude-code@stable|latest version。
 */
async function getLatestVersion(channel) {
  let npmTag = channel === "stable" ? "stable" : "latest";
  let result = await execFileNoThrowWithCwd(
    "npm",
    [
      "view",
      `${
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
        }.PACKAGE_URL
      }@${npmTag}`,
      "version",
      "--prefer-online",
    ],
    {
      abortSignal: AbortSignal.timeout(5000),
      cwd: homedir(),
      useToolMemoryCgroup: false,
    },
  );
  if (result.code !== 0) {
    let trimmed = result.stdout.trim();
    if (trimmed && semverModule.parse(trimmed)) {
      logFeatureSad("update_check", "update_check_npm_view_stderr_warning");
      logForDebugging(
        `npm view exited ${result.code} but printed a valid version (${trimmed}) \u2014 treating stderr as a warning`,
      );
      if (result.stderr) logForDebugging(`npm stderr: ${result.stderr.trim()}`);
      return trimmed;
    }
    logFeatureBad("update_check", "update_check_npm_view_failed");
    logForDebugging(`npm view failed with code ${result.code}`);
    if (result.stderr) logForDebugging(`npm stderr: ${result.stderr.trim()}`);
    else logForDebugging("npm stderr: (empty)");
    if (result.stdout)
      logForDebugging(
        `npm stdout (first 300 chars, JSON-encoded): ${escapeControlChars(JSON.stringify(result.stdout.trim().slice(0, 300)))}`,
      );
    return null;
  }
  let trimmed = result.stdout.trim();
  if (trimmed && !semverModule.parse(trimmed)) {
    logFeatureBad("update_check", "update_check_npm_view_invalid_stdout");
    logForDebugging(
      "npm view exited 0 but stdout is not a valid semver version \u2014 treating as no result",
    );
    logForDebugging(
      `npm stdout (first 300 chars, JSON-encoded): ${escapeControlChars(JSON.stringify(trimmed.slice(0, 300)))}`,
    );
    return null;
  }
  logFeatureOk("update_check");
  return trimmed || null;
}
//@ chunk-6zvphrsz.js:17635-17652 placement
/**
 * 从 GCS 拉版本时的超时（5 秒）。
 */
var GCS_FETCH_TIMEOUT_MS = 5000;
var GCS_FETCH_ATTEMPTS = 3;
//@ chunk-6zvphrsz.js:17652-18404 placement
/**
 * 从 GCS 获取指定通道的版本号（重试、校验 semver）。
 */
async function fetchGcsVersion(e) {
  if (isEssentialTrafficOnly()) return null;
  let r = 0;
  try {
    let trimmed = (
      await retryWithTimeout(
        (signal) => {
          r++;
          return publicCdnGuardedClient.get(`${RELEASES_BASE_URL}/${e}`, {
            timeout: GCS_FETCH_TIMEOUT_MS,
            responseType: "text",
            signal,
          });
        },
        {
          attempts: GCS_FETCH_ATTEMPTS,
          timeoutMs: GCS_FETCH_TIMEOUT_MS,
          onRetry: (s, u) => {
            logForDebugging(
              `Failed to fetch ${e} from GCS on attempt ${s}/${GCS_FETCH_ATTEMPTS}, retrying: ${u}`,
            );
          },
        },
      )
    ).data.trim();
    if (!semverModule.parse(trimmed)) {
      logFeatureBad("update_check", "update_check_gcs_invalid_response");
      logForDebugging(`GCS ${e} version response is not a valid semver version \u2014 treating as no result`);
      logForDebugging(
        `GCS response body (first 300 chars, JSON-encoded): ${escapeControlChars(JSON.stringify(trimmed.slice(0, 300)))}`,
      );
      return null;
    }
    if (r > 1) logFeatureSad("update_check", "update_check_gcs_retry");
    else logFeatureOk("update_check");
    return trimmed;
  } catch (error) {
    logFeatureBad("update_check", "update_check_gcs_failed");
    logForDebugging(`Failed to fetch ${e} from GCS after ${r} attempt(s): ${error}`);
    return null;
  }
}
//@ chunk-6zvphrsz.js:18404-19086 placement
async function getLatestVersionFromGcs(channel) {
  if (isEssentialTrafficOnly()) return null;
  try {
    let response = await externalHttp.get(`https://formulae.brew.sh/api/cask/${channel}.json`, {
      timeout: 5000,
      responseType: "json",
    });
    let version = response.data?.version;
    let o = typeof version === "string" ? version.trim() : null;
    if (!o || !semverModule.parse(o)) {
      logFeatureBad("update_check", "update_check_homebrew_invalid_version");
      logForDebugging(
        `formulae.brew.sh ${channel} version is not a valid semver version \u2014 treating as no result`,
      );
      let s = typeof response.data === "string" ? response.data : String(jsonStringify(response.data));
      logForDebugging(
        `brew response (first 300 chars, JSON-encoded): ${escapeControlChars(JSON.stringify(s.slice(0, 300)))}`,
      );
      return null;
    }
    logFeatureOk("update_check");
    return o;
  } catch (error) {
    logFeatureBad("update_check", "update_check_homebrew_failed");
    logForDebugging(`Failed to fetch ${channel} from formulae.brew.sh: ${error}`);
    return null;
  }
}
//@ chunk-6zvphrsz.js:19086-19165 placement
/**
 * 依次从 GCS 与回退源取最新版本。
 */
async function latestVersionFromSources(channel, r) {
  let [latestVersionFromGcs, gcsVersion] = await Promise.all([
    getLatestVersionFromGcs(channel),
    fetchGcsVersion(r),
  ]);
  return latestVersionFromGcs ?? gcsVersion;
}
//@ chunk-6zvphrsz.js:19165-19213 placement
/**
 * 读取“更新恢复失败”的记录。
 */
function getUpdateRestoreFailure() {
  return getAutoUpdaterState().updateRestoreFailure;
}
//@ chunk-6zvphrsz.js:19213-19537 placement
/**
 * 更新恢复失败记录：原路径已恢复则清除，否则重新定位保留副本。
 */
async function refreshRestoreFailure(autoUpdaterState) {
  if (!autoUpdaterState.updateRestoreFailure) return;
  if (await pathExists(autoUpdaterState.updateRestoreFailure.originalPath)) {
    autoUpdaterState.updateRestoreFailure = null;
    return;
  }
  if (autoUpdaterState.updateRestoreFailure.preservedPath !== null)
    autoUpdaterState.updateRestoreFailure = {
      originalPath: autoUpdaterState.updateRestoreFailure.originalPath,
      preservedPath: await locatePreservedCopy(
        autoUpdaterState,
        autoUpdaterState.updateRestoreFailure.preservedPath,
      ),
    };
}
//@ chunk-6zvphrsz.js:19537-19593 placement
/**
 * 判断路径是否存在。
 */
function pathExists(e) {
  return access(e, constants.F_OK).then(
    () => true,
    () => false,
  );
}
//@ chunk-6zvphrsz.js:19593-19666 placement
/**
 * 返回 npm 全局安装目录的候选路径。
 */
function npmGlobalPrefixes() {
  let e = join(dirname(process.execPath), "..", "..");
  return [join(e, ".."), e];
}
//@ chunk-6zvphrsz.js:19861-19983 placement
async function isMintedPreservedFile(e, r) {
  let n = await stat(r, {
    bigint: true,
  }).then(
    (o) => o.ino,
    () => 0n,
  );
  return n !== 0n && e.mintedPreservedInodes.has(n);
}
//@ chunk-6zvphrsz.js:19983-20147 placement
async function locatePreservedCopy(e, r) {
  if (await isMintedPreservedFile(e, r)) return r;
  let n = basename(r);
  let flattened = (await gatherAllCandidates()).flatMap((s) => [join(s, n), join(s, "bin", n)]);
  for (let s of flattened) if (await isMintedPreservedFile(e, s)) return s;
  return null;
}
//@ chunk-6zvphrsz.js:20147-20623 placement
/**
 * 通过临时文件原子恢复可执行文件（失败回退复制）。
 */
async function restoreBinaryAtomically(e, r) {
  await getFsImplementation().mkdir(dirname(r));
  try {
    let o = dirname(r);
    let s = `${basename(r)}.restoring.`;
    for (let u of await readdir(o)) if (u.startsWith(s)) await unlink(join(o, u)).catch(() => {});
  } catch {}
  let n = `${r}.restoring.${randomBytes(4).toString("hex")}`;
  try {
    await copyFile(e, n);
    try {
      await retryFsOp(n, r);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === undefined || !ATOMIC_WRITE_ERRNOS.has(errnoCode)) throw error;
      if (!(await pathExists(r))) throw error;
      try {
        await copyFile(n, r);
      } catch (error) {
        if (DISK_FULL_CODES.has(getErrnoCode(error) ?? "")) await unlink(r).catch(() => {});
        throw error;
      }
      await unlink(n).catch(() => {});
    }
  } catch (error) {
    await unlink(n).catch(() => {});
    throw error;
  }
}
//@ chunk-6zvphrsz.js:20623-21559 placement
/**
 * 找到本次保存的最新 .old.<时间戳> 可执行文件。
 */
async function newestPreservedOldBinary(autoUpdaterState, r) {
  let escapedExecName = basename(process.execPath).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let oldBinaryRe = new RegExp(`^${escapedExecName}\\.old\\.(\\d+)$`);
  let candidates = (
    await Promise.all(
      r.flatMap((p) =>
        [p, join(p, "bin")].map(async (w) =>
          (await readdir(w).catch(() => []))
            .map((E) => oldBinaryRe.exec(E))
            .filter((E) => E !== null)
            .map((E) => ({
              path: join(w, E[0]),
              ts: Number(E[1]),
            })),
        ),
      ),
    )
  ).flat();
  let newest = (
    await Promise.all(
      candidates.map(async (candidate) =>
        (await isMintedPreservedFile(autoUpdaterState, candidate.path)) ? [candidate] : [],
      ),
    )
  )
    .flat()
    .reduce((acc, w) => (acc === null || w.ts > acc.ts ? w : acc), null);
  if (!newest) {
    logForDebugging(
      `No preserved ${basename(process.execPath)}.old.<ts> found in ${r.length} retired dir(s) \u2014 sweep restore skipped`,
    );
    return;
  }
  try {
    await restoreBinaryAtomically(newest.path, process.execPath);
    logFeatureOk("update_apply_heal", {
      heal_kind: lit("sweep"),
    });
    logForDebugging(
      `Restored missing ${process.execPath} from preserved copy ${newest.path} before update attempt`,
    );
  } catch (error) {
    let w = sanitizedErrCodeForTelemetry(error);
    logFeatureBad("update_apply_heal", "sweep_restore_failed", {
      ...(w && {
        err_code: w,
      }),
      heal_kind: lit("sweep"),
    });
    logForDebugging(
      `Failed to restore missing ${process.execPath} from preserved copy ${newest.path}: ${error}`,
    );
  }
}
//@ chunk-6zvphrsz.js:21559-30009 callgraph-witnessed = installGlobalPackage (0.255)
/**
 * installGlobalPackage：持锁后用 npm（或 bun）全局安装指定版本，校验安装结果，失败分类上报。
 */
async function installGlobalPackage(e, storageV5) {
  let autoUpdaterState = getAutoUpdaterState();
  if (!(await acquireLock(storageV5))) {
    logFeatureSad("update_apply", "update_apply_lock_contention");
    logForDebugging("Another process is currently installing an update", {
      level: "error",
    });
    logEvent("tengu_auto_updater_lock_contention", {
      pid: process.pid,
      currentVersion: sanitizeVersion(
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
    });
    return {
      status: "in_progress",
    };
  }
  let updateRestoreFailure = autoUpdaterState.updateRestoreFailure;
  try {
    await removeClaudeAliasesFromShellConfigs();
    let globalPackageManager = getGlobalPackageManager();
    if (globalPackageManager === "npm" && env.isNpmFromWindowsPath()) {
      logFeatureBad("update_apply", "update_apply_wsl_windows_npm");
      logForDebugging("Windows NPM detected in WSL environment", {
        level: "error",
      });
      logEvent("tengu_auto_updater_windows_npm_in_wsl", {
        currentVersion: sanitizeVersion(
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
      });
      console.error(`
Error: Windows NPM detected in WSL

You're running Claude Code in WSL but using the Windows NPM installation from /mnt/c/.
This configuration is not supported for updates.

To fix this issue:
  1. Install Node.js within your Linux distribution: e.g. sudo apt install nodejs npm
  2. Make sure Linux NPM is in your PATH before the Windows version
  3. Try updating again with 'claude update'
`);
      return {
        status: "install_failed",
      };
    }
    let u = e
      ? `${
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
          }.PACKAGE_URL
        }@${e}`
      : {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.PACKAGE_URL;
    let R =
      getPlatform() === "windows" &&
      isStandaloneExecutable() &&
      process.execPath.replace(/\\/g, "/").includes("/node_modules/@anthropic-ai/");
    let p = [];
    if (R) {
      let [, y] = npmGlobalPrefixes();
      let v = (
        await Promise.all(
          (await gatherAllCandidates()).map(async (h) =>
            (await Promise.all([readdir(h).catch(() => []), readdir(join(h, "bin")).catch(() => [])]).then(
              ([M, A]) => [...M, ...A].some((O) => /\.exe\.old\.\d+$/.test(O)),
            ))
              ? [h]
              : [],
          ),
        )
      ).flat();
      if (v.length > 0)
        if (await pathExists(process.execPath))
          await Promise.all(
            v.map((h) =>
              rm(h, {
                recursive: true,
                force: true,
              }).catch((error) => logForDebugging(`retired-dir cleanup failed: ${error}`)),
            ),
          );
        else await newestPreservedOldBinary(autoUpdaterState, v);
      let now = Date.now();
      let T = await stat(process.execPath, {
        bigint: true,
      })
        .then((h) => h.ino)
        .catch(() => 0n);
      let S = [process.execPath];
      for (let h of await readdir(y).catch(() => []))
        for (let P of ["claude.exe", "cli.exe"]) {
          let M = join(y, h, P);
          if (M === process.execPath) continue;
          let A = await stat(M, {
            bigint: true,
          })
            .then((O) => O.ino)
            .catch(() => -1n);
          if (T && A === T) S.push(M);
        }
      for (let h of S) {
        let P = `${h}.old.${now}`;
        try {
          await rename(h, P);
        } catch {
          continue;
        }
        p.push([h, P]);
        let M = await stat(P, {
          bigint: true,
        }).then(
          (A) => A.ino,
          () => 0n,
        );
        if (M !== 0n) autoUpdaterState.mintedPreservedInodes.add(M);
      }
    }
    let w = await execFileNoThrowWithCwd(globalPackageManager, ["install", "-g", u], {
      cwd: homedir(),
      useToolMemoryCgroup: false,
    });
    let E = 0;
    let ae = 0;
    let Q = [];
    if (p.length && w.code !== 0) {
      for (let [v, F] of p)
        try {
          await rename(F, v);
        } catch (error) {
          try {
            await restoreBinaryAtomically(F, v);
            logForDebugging(`Restored ${v} by copy after rename failed: ${error}`);
            await unlink(F).catch((error) =>
              logForDebugging(`Failed to remove ${F} after copy-restore: ${error}`),
            );
          } catch (error_2) {
            let h = await locatePreservedCopy(autoUpdaterState, F);
            let P;
            if (h !== null && h !== F)
              try {
                await restoreBinaryAtomically(h, v);
                ae++;
                logForDebugging(
                  `Restored ${v} from retired-dir copy ${h} after rename (${error}) and copy (${error_2}) both failed`,
                );
                continue;
              } catch (error) {
                P = error;
                logForDebugging(`Failed to restore ${v} from retired-dir copy ${h}: ${error}`);
              }
            let preservedState =
              h === null ? lit("gone") : h === F ? lit("original_dir") : lit("retired_dir");
            E++;
            if (Q.length === 0) {
              let A = sanitizedErrCodeForTelemetry(error);
              let O = sanitizedErrCodeForTelemetry(error_2);
              let ce = P === undefined ? undefined : sanitizedErrCodeForTelemetry(P);
              logFeatureBad("update_apply", "update_apply_restore_failed", {
                ...(A && {
                  rename_err_code: A,
                }),
                ...(O && {
                  copy_err_code: O,
                }),
                ...(ce && {
                  relocate_err_code: ce,
                }),
                preserved_state: preservedState,
              });
            }
            Q.push({
              originalPath: v,
              preservedPath: h,
            });
            logError(
              withTelemetryMessage(
                new UpdateApplyError(
                  `Failed to restore ${v} after install failure: rename: ${error}; copy: ${error_2}; preserved copy: ${h ?? "not found"}`,
                ),
                `Failed to restore executable after install failure: rename=${sanitizeErrnoForTelemetry(error) ?? "unknown"} copy=${sanitizeErrnoForTelemetry(error_2) ?? "unknown"} relocate=${P === undefined ? (h === null ? "not_found" : "skipped") : (sanitizeErrnoForTelemetry(P) ?? "unknown")}`,
              ),
            );
          }
        }
      if (ae > 0 && E === 0)
        logFeatureOk("update_apply_heal", {
          heal_kind: lit("relocate"),
        });
      let error = new Set(p.map(([v]) => v));
      autoUpdaterState.updateRestoreFailure =
        Q[0] ??
        (autoUpdaterState.updateRestoreFailure &&
        !error.has(autoUpdaterState.updateRestoreFailure.originalPath)
          ? autoUpdaterState.updateRestoreFailure
          : null);
    }
    if (w.code !== 0) {
      let y = `${w.stdout} ${w.stderr}`;
      let v = classifyNpmInstallError(y);
      let F = p.length === 0 ? "not_attempted" : E === 0 ? "restored" : "partial";
      if (v === "warning_only") {
        let S = await verifyInstalledVersion(e);
        if (S.outcome === "landed") {
          await saveGlobalConfig(
            (current) => ({
              ...current,
              installMethod: "global",
            }),
            storageV5,
          );
          autoUpdaterState.updateRestoreFailure = null;
          logFeatureSad("update_apply", "update_apply_npm_install_stderr_warning");
          logForDebugging(
            `npm/bun exited ${w.code} with only warnings on stderr but the install-prefix re-probe confirms the install landed (now ${S.version}): ${y}`,
          );
          return {
            status: "success",
            probeDurationMs: S.durationMs,
          };
        }
      }
      logEvent("tengu_auto_updater_npm_failure", {
        npm_exit_code: w.code,
        package_manager: fromEnum(globalPackageManager),
        is_bundled_mode: isStandaloneExecutable(),
        platform: platformOrOther(getPlatform()),
        windows_self_rename: fromEnum(F),
        stderr_signature: fromEnum(v),
        npm_error_code: extractNpmErrorCode(y) ?? lit("none"),
      });
      if (
        getPlatform() === "windows" &&
        /\b(?:claude|cli)\.exe\b/i.test(y) &&
        (/\bEBUSY\b|resource busy or locked/i.test(y) ||
          (/\bEPERM\b|operation not permitted/i.test(y) &&
            (p.length > 0 || /\b(?:rename|copyfile|unlink)\b[^\r\n]*\b(?:claude|cli)\.exe\b/i.test(y))))
      ) {
        logFeatureBad("update_apply", "update_apply_exe_locked");
        logForDebugging(`Failed to install new version of claude (running executable is locked): ${y}`, {
          level: "error",
        });
        return {
          status: "install_failed",
          failureHint: "windows_running_exe_lock",
        };
      }
      if (/\b(EACCES|EPERM|permission denied)\b/i.test(y)) {
        logFeatureBad("update_apply", "update_apply_no_permissions");
        logForDebugging("Insufficient permissions for global npm install.", {
          level: "error",
        });
        return {
          status: "no_permissions",
        };
      }
      if (v === "native_package_missing") {
        logFeatureBad("update_apply", "update_apply_native_binary_missing");
        logForDebugging(
          `Failed to install new version of claude (platform-native package missing; npm should have restored the previous version): ${y}`,
          {
            level: "error",
          },
        );
        return {
          status: "install_failed",
          failureHint: "native_binary_missing",
        };
      }
      if (v === "warning_only") {
        logFeatureBad("update_apply", "update_apply_npm_install_stderr_warning");
        logForDebugging(
          `npm/bun exited ${w.code} with only warnings on stderr but the re-probe did not confirm an advance: ${y}`,
          {
            level: "error",
          },
        );
        return {
          status: "install_failed",
        };
      }
      logFeatureBad("update_apply", "update_apply_npm_install_failed");
      logForDebugging(`Failed to install new version of claude: ${y}`, {
        level: "error",
      });
      return {
        status: "install_failed",
      };
    }
    let se = await verifyInstalledVersion(e);
    switch (se.outcome) {
      case "placeholder_stub": {
        let y =
          globalPackageManager === "npm"
            ? await execFileNoThrowWithCwd("npm", ["config", "get", "ignore-scripts"], {
                abortSignal: AbortSignal.timeout(1e4),
                cwd: homedir(),
                useToolMemoryCgroup: false,
              })
            : null;
        if (y?.code === 0 && y.stdout.trim() === "true") {
          logForDebugging(
            `${globalPackageManager} exited 0 and the installed claude is the placeholder stub, but npm install scripts are disabled on purpose; trusting the exit code`,
          );
          break;
        }
        logFeatureBad("update_apply", "update_apply_native_binary_missing");
        logForDebugging(
          `${globalPackageManager} exited 0 but the installed claude is still the placeholder stub: the platform-native package was not installed`,
          {
            level: "error",
          },
        );
        return {
          status: "install_failed",
          failureHint: "native_binary_missing",
        };
      }
      case "inconclusive":
        logForDebugging(
          `${globalPackageManager} exited 0; the install-prefix --version probe was inconclusive, trusting the exit code`,
        );
        break;
      case "landed":
        break;
    }
    await saveGlobalConfig(
      (y) => ({
        ...y,
        installMethod: "global",
      }),
      storageV5,
    );
    autoUpdaterState.updateRestoreFailure = null;
    logFeatureOk("update_apply");
    return {
      status: "success",
      probeDurationMs: se.durationMs,
    };
  } finally {
    if (
      autoUpdaterState.updateRestoreFailure !== null &&
      autoUpdaterState.updateRestoreFailure === updateRestoreFailure
    )
      await refreshRestoreFailure(autoUpdaterState);
    await releaseLock(storageV5);
  }
}
//@ chunk-6zvphrsz.js:30009-30271 fingerprint = removeClaudeAliasesFromShellConfigs (1)
async function removeClaudeAliasesFromShellConfigs() {
  let configMap = getShellConfigPaths();
  for (let [, configFile] of Object.entries(configMap))
    try {
      let lines = await readFileLinesOrNull(configFile);
      if (!lines) continue;
      let { filtered, hadAlias } = filterClaudeAliases(lines);
      if (hadAlias) {
        await writeFileLines(configFile, filtered);
        logForDebugging(`Removed claude alias from ${configFile}`);
      }
    } catch (error) {
      logForDebugging(`Failed to remove alias from ${configFile}: ${error}`, {
        level: "error",
      });
    }
}
//@ chunk-6zvphrsz.js:30271-31249 affinity
function classifyNpmInstallError(e) {
  if (/\b(EACCES|EPERM|permission denied)\b/i.test(e)) return "eacces_eperm";
  if (/postinstall\] Native package "[^"]*" not found/.test(e)) return "native_package_missing";
  if (/\bENOTEMPTY\b/i.test(e)) return "enotempty";
  if (/\bETARGET\b/i.test(e)) return "etarget";
  if (/\bE403\b/i.test(e) || /\b403 forbidden\b/i.test(e)) return "e403_forbidden";
  if (/\bENOENT\b/i.test(e)) return "enoent";
  if (
    /\bE5\d\d\b/i.test(e) ||
    /\b5\d\d\s+(internal server error|bad gateway|service unavailable|gateway time-?out)\b/i.test(e)
  )
    return "registry_5xx";
  if (/\b(ETIMEDOUT|ESOCKETTIMEDOUT)\b/i.test(e) || /\btimed[\s-]?out\b/i.test(e) || /\btimeout\b/i.test(e))
    return "network_timeout";
  if (/\bENOSPC\b/i.test(e)) return "disk_full";
  if (/\bEBUSY\b/i.test(e) || /\bresource busy or locked\b/i.test(e)) return "ebusy";
  let r = /npm warn/i.test(e) || /unknown user config/i.test(e) || /npm notice/i.test(e);
  let n = /npm err/i.test(e) || /\b(EACCES|EPERM|ETARGET)\b/i.test(e) || /code E/i.test(e);
  if (r && !n) return "warning_only";
  return "unknown";
}
//@ chunk-6zvphrsz.js:31249-31383 sole-consumer
function extractNpmErrorCode(e) {
  let r = /\bnpm (?:ERR!|error) code\s+([A-Z][A-Z0-9_]{1,29})(?![A-Za-z0-9_])/.exec(e)?.[1];
  return r === undefined ? undefined : fromSanitizer_SANITIZER_OUTPUT_ONLY(r);
}
//@ chunk-e6aww6q8.js:4149527-4149656 fingerprint = releaseLock (0.566)
async function releaseLock_2(e) {
  let n = await open(e, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
  try {
    return await n.readFile({
      encoding: "utf8",
    });
  } finally {
    await n.close();
  }
}
//@ chunk-s61vbvea.js:583010-583413 fingerprint = getNpmDistTags (0.347)
async function getNpmDistTags(e, n, prRepository) {
  if (isEssentialTrafficOnly()) return false;
  if (prRepository !== undefined && !regExp_11.test(prRepository)) return false;
  let s = n && !n.startsWith("-") && !/^[a-z][a-z0-9+.-]*:\/\//i.test(n) ? n : undefined;
  let h = [
    "pr",
    "view",
    ...(s ? [s] : []),
    ...(prRepository ? ["--repo", prRepository] : []),
    "--json",
    "url",
  ];
  let { code, stdout } = await execFileNoThrow("gh", h, {
    timeout: 5000,
    preserveOutputOnError: false,
    useCwd: true,
  });
  if (code !== 0) return false;
  let url = jsonParse(stdout)?.url;
  if (!url) return false;
  let parsed = parsePrUrl_2(url);
  if (!parsed) return false;
  await linkPrToSession(parsed, e);
  return true;
}
export {
  npmGlobalPrefixes,
  enforceMinimumVersion,
  resolveMaxVersionConfig,
  isForceDowngradeActive,
  shouldSkipVersion,
  releaseLock_2,
  checkGlobalInstallPermissions,
  latestVersionFromSources,
  getLatestVersion,
  getVersionSkipReason,
  installGlobalPackage,
  getUpdateRestoreFailure,
  updateApplyErrorKey,
  getNpmDistTags,
  isAutoUpdateCheckThrottled,
  getMaxVersion,
  getMaxVersionMessage,
  fetchGcsVersion,
  remainingStartupGraceMs,
  retryWithTimeout,
};
