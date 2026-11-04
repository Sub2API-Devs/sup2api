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
import { open, writeFile, stat, access, readdir, unlink, copyFile, rm, rename } from "fs/promises";
import { constants } from "fs";
import { join, dirname, basename } from "path";
import { homedir } from "os";
import { randomBytes } from "crypto";
import { isEssentialTrafficOnly } from "./privacyLevel.js";
import { regExp_11, parsePrUrl_2, linkPrToSession } from "../tools/shared/gitOperationTracking.js";
import { execFileNoThrow, execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { jsonParse, jsonStringify, isStandaloneExecutable } from "./slowOperations.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "./fsFlags.js";
import { __toESM } from "../../runtime/bun-runtime.js";
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
import { getPlatform } from "./platform.js";
import { NATIVE_BINARY_MISSING_TEXT, MAX_BINARY_PROBE_BYTES } from "./nativeInstaller/nativeBinaryMissing.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:583010-583413 fingerprint (2.1.88 match: getNpmDistTags, 0.347)
async function getNpmDistTags(sessionId, prArg, prRepository) {
  if (isEssentialTrafficOnly()) return false;
  if (prRepository !== undefined && !regExp_11.test(prRepository)) return false;
  let prNumber =
    prArg && !prArg.startsWith("-") && !/^[a-z][a-z0-9+.-]*:\/\//i.test(prArg) ? prArg : undefined;
  let args = [
    "pr",
    "view",
    ...(prNumber ? [prNumber] : []),
    ...(prRepository ? ["--repo", prRepository] : []),
    "--json",
    "url",
  ];
  let { code, stdout } = await execFileNoThrow("gh", args, {
    timeout: 5000,
    preserveOutputOnError: false,
    useCwd: true,
  });
  if (code !== 0) return false;
  let url = jsonParse(stdout)?.url;
  if (!url) return false;
  let parsed = parsePrUrl_2(url);
  if (!parsed) return false;
  await linkPrToSession(parsed, sessionId);
  return true;
}
//@ chunk-e6aww6q8.js:4149527-4149656 fingerprint (2.1.88 match: releaseLock, 0.566)
async function releaseLock_2(path) {
  let handle = await open(path, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
  try {
    return await handle.readFile({
      encoding: "utf8",
    });
  } finally {
    await handle.close();
  }
}
//@ chunk-6zvphrsz.js:1282-1299 placement
/**
 * semver 模块的包装导入（用于版本比较）。
 */
var semverModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6zvphrsz.js:1282", () => {
  semverModule = __toESM(require_semver_3(), 1);
});
//@ chunk-6zvphrsz.js:1579-1641 placement
/**
 * 若正在安装则等待其完成，否则直接返回。
 */
function awaitInstallOver(hold) {
  return pendingWithoutStart(hold) ? hold.over.promise : Promise.resolve();
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
async function shutDownAfterRefusal(refuser) {
  await waitForQuietWindow();
  if (isTerminalShutdown()) return;
  refuser.say();
  await refuser.shutDown().catch((error) =>
    logForDebugging(`refusal after the flag fetch hold failed (${errorMessage(error)})`, {
      level: "error",
    }),
  );
  refuser.hard();
}
//@ chunk-6zvphrsz.js:1982-2040 placement
/**
 * 会话持有安装权时执行回调，否则走关停流程。
 */
function refuserOrRun(hold, run, refuser) {
  return hold.hasHeld && !getIsNonInteractiveSession() ? void shutDownAfterRefusal(refuser) : run();
}
//@ chunk-6zvphrsz.js:2040-2054 placement
/**
 * 原样返回输入（占位辅助）。
 */
var identityFn = (value) => value;
//@ chunk-6zvphrsz.js:2054-2063 placement
/**
 * 安装锁编号（1）。
 */
var FAILED_VERSION_EXIT_CODE = 1;
//@ chunk-6zvphrsz.js:2063-2292 placement
/**
 * 带超时与指数退避抖动的重试。
 */
async function retryWithTimeout(attemptFn, options) {
  let lastError;
  for (let idx = 1; idx <= options.attempts; idx++)
    try {
      return await attemptFn(AbortSignal.timeout(options.timeoutMs));
    } catch (error) {
      lastError = error;
      if (idx >= options.attempts) break;
      options.onRetry?.(idx, error);
      let backoffMs = 500 * 3 ** (idx - 1);
      await sleep(backoffMs * (0.75 + Math.random() * 0.5));
    }
  throw lastError;
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
let UpdateApplyError; // deferred: uses ClaudeError (./errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-6zvphrsz.js:6244", () => {
  UpdateApplyError = class UpdateApplyError extends ClaudeError {};
});
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
    let hold = currentFetchHold();
    await awaitInstallOver(hold);
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
      let message = assertMinVersion(
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
        hold,
        () => exitBelowMinVersion(dynamicConfig_BLOCKS_ON_INIT.minVersion),
        identityFn({
          say: () => {
            latchTerminalShutdown();
            emitExitMessage(message);
          },
          shutDown: () => gracefulShutdown(FAILED_VERSION_EXIT_CODE),
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
  let message = assertMinVersion(
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
${message}
`);
  if (isStartupFailureResultRequested() && isStreamJsonLaunch())
    try {
      writeToStdout(
        jsonStringify(
          buildStartupFailureResult({
            sessionId: getSessionId(),
            message,
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
  gracefulShutdownSync(FAILED_VERSION_EXIT_CODE);
}
//@ chunk-6zvphrsz.js:8499-8765 fingerprint (2.1.88 match: assertMinVersion, 0.615)
function assertMinVersion(currentVersion, minVersion) {
  return `It looks like your version of Claude Code (${currentVersion}) needs an update.
A newer version (${minVersion} or higher) is required to continue.

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
var autoUpdaterSlot; // deferred: uses AutoUpdaterState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-6zvphrsz.js:8868", () => {
  autoUpdaterSlot = new HostScoped(() => new AutoUpdaterState());
});
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
  let hasInvalidVersion = false;
  let external = maxVersionConfig.external || undefined;
  let maxVersion = external ? (semverModule.parse(external)?.version ?? undefined) : undefined;
  if (external && !maxVersion) {
    logForDebugging(`tengu_max_version_config has invalid version '${external}' \u2014 ignoring`, {
      level: "error",
    });
    logEvent("tengu_max_version_config_invalid", {
      raw_value: sanitizeVersion(external),
    });
  }
  return {
    maxVersion,
    forceDowngradeEnabled: maxVersionConfig.external_force_downgrade === true,
  };
}
//@ chunk-6zvphrsz.js:9600-9904 layout
/**
 * 强制降级是否生效：当前版本高于上限时才降。
 */
function isForceDowngradeActive(currentVersion, maxVersion, updaterKind) {
  let updaterLabel = updaterKind === "native_update" ? "Native installer" : "AutoUpdater";
  let current = semverModule.parse(currentVersion);
  if (current && current.compare(maxVersion) > 0) {
    logForDebugging(
      `${updaterLabel}: force-downgrade active \u2014 moving from ${currentVersion} to ${maxVersion}`,
    );
    return true;
  }
  logForDebugging(
    `${updaterLabel}: force-downgrade flag set but current ${currentVersion} is not above ${maxVersion} \u2014 taking normal upgrade path`,
  );
  return false;
}
//@ chunk-6zvphrsz.js:9904-9969 fingerprint (2.1.88 match: getMaxVersionMessage, 0.469)
/**
 * 版本上限的提示文案（external_message）。
 */
async function getMaxVersionMessage() {
  return (await getMaxVersionConfig()).external_message || undefined;
}
//@ chunk-6zvphrsz.js:9969-10065 fingerprint (2.1.88 match: getMaxVersionConfig, 1)
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
function getVersionSkipReason(targetVersion) {
  if (!semverModule.parse(targetVersion)) {
    logForDebugging("update target is not a valid semver version \u2014 skip checks constrain nothing", {
      level: "error",
    });
    logForDebugging(
      `update target (first 300 chars, JSON-encoded): ${escapeControlChars(JSON.stringify(targetVersion.slice(0, 300)))}`,
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
    else if (!semverGt(targetVersion, version))
      return `below your minimumVersion setting (${minimumVersion})`;
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
    else if (!semverLt(targetVersion, version))
      return `above your organization's requiredMaximumVersion (${requiredMaximumVersion})`;
  }
  return null;
}
//@ chunk-6zvphrsz.js:10942-11027 fingerprint (2.1.88 match: shouldSkipVersion, 0.806)
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
//@ chunk-6zvphrsz.js:11040-11084 fingerprint (2.1.88 match: getLockFilePath, 1)
function getLockFilePath() {
  return join(getClaudeConfigDir(), ".update.lock");
}
//@ chunk-6zvphrsz.js:11084-11129 layout
function getUpdateLockStateKey() {
  return STORAGE_SPACES.state("update-lock");
}
//@ chunk-6zvphrsz.js:11129-11940 layout
async function acquireStorageUpdateLock(storage) {
  let updateLockStateKey = getUpdateLockStateKey();
  let statResult = await storage.statMeta(updateLockStateKey);
  if (statResult.ok) {
    if (Date.now() - statResult.value.mtimeMs < LOCK_TIMEOUT_MS) return false;
    let recheck = await storage.statMeta(updateLockStateKey);
    if (recheck.ok) {
      if (Date.now() - recheck.value.mtimeMs < LOCK_TIMEOUT_MS) return false;
      let deleteResult = await storage.delete(updateLockStateKey);
      if (!deleteResult.ok) {
        logForDebugging(`AutoUpdater: failed to remove stale update lock: ${deleteResult.error.code}`, {
          level: "error",
        });
        return false;
      }
    } else if (recheck.error.code !== "NotFound") {
      logForDebugging(`AutoUpdater: failed to re-stat stale update lock: ${recheck.error.code}`, {
        level: "error",
      });
      return false;
    }
  } else if (statResult.error.code !== "NotFound") {
    logForDebugging(`AutoUpdater: failed to stat update lock: ${statResult.error.code}`, {
      level: "error",
    });
    return false;
  }
  let writeResult = await storage.write(updateLockStateKey, `${process.pid}`, {
    precondition: {
      type: "ifAbsent",
    },
    mode: 438 & ~process.umask(),
  });
  if (writeResult.ok) return true;
  if (writeResult.error.code === "AlreadyExists") return false;
  logForDebugging(`AutoUpdater: failed to create update lock: ${writeResult.error.code}`, {
    level: "error",
  });
  return false;
}
//@ chunk-6zvphrsz.js:11940-12644 fingerprint (2.1.88 match: acquireLock, 0.726)
/**
 * acquireLock：~/.claude/.update.lock（或 v5 存储），5 分钟内的锁视为有效。
 */
async function acquireLock(storage) {
  if (isStorageV5Enabled() && storage) return acquireStorageUpdateLock(storage);
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
async function releaseLock(storage) {
  if (isStorageV5Enabled() && storage) {
    let readResult = await storage.read([getUpdateLockStateKey()]);
    if (!readResult.ok) {
      logForDebugging(`AutoUpdater: failed to release update lock: ${readResult.error.code}`, {
        level: "error",
      });
      return;
    }
    let item = readResult.value.items[0];
    if (!item.found) return;
    if (Buffer.from(item.value).toString("utf8") === `${process.pid}`) {
      let deleteResult = await storage.delete(getUpdateLockStateKey());
      if (!deleteResult.ok)
        logForDebugging(`AutoUpdater: failed to release update lock: ${deleteResult.error.code}`, {
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
//@ chunk-6zvphrsz.js:13486-13851 fingerprint (2.1.88 match: getInstallationPrefix, 0.788)
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
    let bunBinaryPath = join(installationPrefix, "claude");
    return {
      execPaths: [bunBinaryPath],
      imagePath: bunBinaryPath,
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
  let binPath = join(installationPrefix, "bin", "claude");
  return {
    execPaths: [binPath],
    imagePath: binPath,
  };
}
//@ chunk-6zvphrsz.js:14652-15738 layout
async function verifyInstalledVersion(expectedVersion) {
  let now = Date.now();
  let globalInstallPaths = await getGlobalInstallPaths();
  let version = expectedVersion ? semverModule.parse(expectedVersion)?.version : undefined;
  let sawFailure = false;
  let sawMissingBinary = false;
  for (let execPath of globalInstallPaths?.execPaths ?? []) {
    let runResult = await execFileNoThrowWithCwd(execPath, ["--version"], {
      abortSignal: AbortSignal.timeout(45000),
      cwd: homedir(),
      useToolMemoryCgroup: false,
    });
    let version_2 = semverModule.parse(runResult.stdout.trim().split(/\s+/)[0])?.version;
    if (
      runResult.code === 0 &&
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
    if (runResult.code !== 0) {
      sawFailure = true;
      sawMissingBinary ||= `${runResult.stdout}
${runResult.stderr}`.includes(NATIVE_BINARY_MISSING_TEXT);
    }
  }
  return {
    outcome:
      sawMissingBinary ||
      (sawFailure &&
        globalInstallPaths !== null &&
        (await stat(globalInstallPaths.imagePath).then(
          (stats) => stats.isFile() && stats.size < MAX_BINARY_PROBE_BYTES,
          () => false,
        )))
        ? "placeholder_stub"
        : "inconclusive",
    durationMs: Date.now() - now,
  };
}
//@ chunk-6zvphrsz.js:15738-16063 fingerprint (2.1.88 match: checkGlobalInstallPermissions, 1)
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
//@ chunk-6zvphrsz.js:16063-17635 fingerprint (2.1.88 match: getLatestVersion, 0.498)
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
async function fetchGcsVersion(channel) {
  if (isEssentialTrafficOnly()) return null;
  let attempts = 0;
  try {
    let trimmed = (
      await retryWithTimeout(
        (signal) => {
          attempts++;
          return publicCdnGuardedClient.get(`${RELEASES_BASE_URL}/${channel}`, {
            timeout: GCS_FETCH_TIMEOUT_MS,
            responseType: "text",
            signal,
          });
        },
        {
          attempts: GCS_FETCH_ATTEMPTS,
          timeoutMs: GCS_FETCH_TIMEOUT_MS,
          onRetry: (attempt, error) => {
            logForDebugging(
              `Failed to fetch ${channel} from GCS on attempt ${attempt}/${GCS_FETCH_ATTEMPTS}, retrying: ${error}`,
            );
          },
        },
      )
    ).data.trim();
    if (!semverModule.parse(trimmed)) {
      logFeatureBad("update_check", "update_check_gcs_invalid_response");
      logForDebugging(
        `GCS ${channel} version response is not a valid semver version \u2014 treating as no result`,
      );
      logForDebugging(
        `GCS response body (first 300 chars, JSON-encoded): ${escapeControlChars(JSON.stringify(trimmed.slice(0, 300)))}`,
      );
      return null;
    }
    if (attempts > 1) logFeatureSad("update_check", "update_check_gcs_retry");
    else logFeatureOk("update_check");
    return trimmed;
  } catch (error) {
    logFeatureBad("update_check", "update_check_gcs_failed");
    logForDebugging(`Failed to fetch ${channel} from GCS after ${attempts} attempt(s): ${error}`);
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
    let version_2 = typeof version === "string" ? version.trim() : null;
    if (!version_2 || !semverModule.parse(version_2)) {
      logFeatureBad("update_check", "update_check_homebrew_invalid_version");
      logForDebugging(
        `formulae.brew.sh ${channel} version is not a valid semver version \u2014 treating as no result`,
      );
      let bodyText = typeof response.data === "string" ? response.data : String(jsonStringify(response.data));
      logForDebugging(
        `brew response (first 300 chars, JSON-encoded): ${escapeControlChars(JSON.stringify(bodyText.slice(0, 300)))}`,
      );
      return null;
    }
    logFeatureOk("update_check");
    return version_2;
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
async function latestVersionFromSources(channel, channel_2) {
  let [latestVersionFromGcs, gcsVersion] = await Promise.all([
    getLatestVersionFromGcs(channel),
    fetchGcsVersion(channel_2),
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
async function refreshRestoreFailure(state) {
  if (!state.updateRestoreFailure) return;
  if (await pathExists(state.updateRestoreFailure.originalPath)) {
    state.updateRestoreFailure = null;
    return;
  }
  if (state.updateRestoreFailure.preservedPath !== null)
    state.updateRestoreFailure = {
      originalPath: state.updateRestoreFailure.originalPath,
      preservedPath: await locatePreservedCopy(state, state.updateRestoreFailure.preservedPath),
    };
}
//@ chunk-6zvphrsz.js:19537-19593 placement
/**
 * 判断路径是否存在。
 */
function pathExists(path) {
  return access(path, constants.F_OK).then(
    () => true,
    () => false,
  );
}
//@ chunk-6zvphrsz.js:19593-19666 placement
/**
 * 返回 npm 全局安装目录的候选路径。
 */
function npmGlobalPrefixes() {
  let prefixRoot = join(dirname(process.execPath), "..", "..");
  return [join(prefixRoot, ".."), prefixRoot];
}
//@ chunk-6zvphrsz.js:19861-19983 placement
async function isMintedPreservedFile(state, path) {
  let inode = await stat(path, {
    bigint: true,
  }).then(
    (stats) => stats.ino,
    () => 0n,
  );
  return inode !== 0n && state.mintedPreservedInodes.has(inode);
}
//@ chunk-6zvphrsz.js:19983-20147 placement
async function locatePreservedCopy(state, path) {
  if (await isMintedPreservedFile(state, path)) return path;
  let fileName = basename(path);
  let flattened = (await gatherAllCandidates()).flatMap((dir) => [
    join(dir, fileName),
    join(dir, "bin", fileName),
  ]);
  for (let candidate of flattened) if (await isMintedPreservedFile(state, candidate)) return candidate;
  return null;
}
//@ chunk-6zvphrsz.js:20147-20623 placement
/**
 * 通过临时文件原子恢复可执行文件（失败回退复制）。
 */
async function restoreBinaryAtomically(sourcePath, targetPath) {
  await getFsImplementation().mkdir(dirname(targetPath));
  try {
    let dir = dirname(targetPath);
    let restorePrefix = `${basename(targetPath)}.restoring.`;
    for (let entry of await readdir(dir))
      if (entry.startsWith(restorePrefix)) await unlink(join(dir, entry)).catch(() => {});
  } catch {}
  let tempPath = `${targetPath}.restoring.${randomBytes(4).toString("hex")}`;
  try {
    await copyFile(sourcePath, tempPath);
    try {
      await retryFsOp(tempPath, targetPath);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === undefined || !ATOMIC_WRITE_ERRNOS.has(errnoCode)) throw error;
      if (!(await pathExists(targetPath))) throw error;
      try {
        await copyFile(tempPath, targetPath);
      } catch (error) {
        if (DISK_FULL_CODES.has(getErrnoCode(error) ?? "")) await unlink(targetPath).catch(() => {});
        throw error;
      }
      await unlink(tempPath).catch(() => {});
    }
  } catch (error) {
    await unlink(tempPath).catch(() => {});
    throw error;
  }
}
//@ chunk-6zvphrsz.js:20623-21559 placement
/**
 * 找到本次保存的最新 .old.<时间戳> 可执行文件。
 */
async function newestPreservedOldBinary(state, retiredDirs) {
  let escapedExecName = basename(process.execPath).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let oldBinaryRe = new RegExp(`^${escapedExecName}\\.old\\.(\\d+)$`);
  let candidates = (
    await Promise.all(
      retiredDirs.flatMap((dir) =>
        [dir, join(dir, "bin")].map(async (candidateDir) =>
          (await readdir(candidateDir).catch(() => []))
            .map((entry) => oldBinaryRe.exec(entry))
            .filter((match) => match !== null)
            .map((parts) => ({
              path: join(candidateDir, parts[0]),
              ts: Number(parts[1]),
            })),
        ),
      ),
    )
  ).flat();
  let newest = (
    await Promise.all(
      candidates.map(async (candidate) =>
        (await isMintedPreservedFile(state, candidate.path)) ? [candidate] : [],
      ),
    )
  )
    .flat()
    .reduce((acc, candidate) => (acc === null || candidate.ts > acc.ts ? candidate : acc), null);
  if (!newest) {
    logForDebugging(
      `No preserved ${basename(process.execPath)}.old.<ts> found in ${retiredDirs.length} retired dir(s) \u2014 sweep restore skipped`,
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
    let errCode = sanitizedErrCodeForTelemetry(error);
    logFeatureBad("update_apply_heal", "sweep_restore_failed", {
      ...(errCode && {
        err_code: errCode,
      }),
      heal_kind: lit("sweep"),
    });
    logForDebugging(
      `Failed to restore missing ${process.execPath} from preserved copy ${newest.path}: ${error}`,
    );
  }
}
//@ chunk-6zvphrsz.js:21559-30009 callgraph-witnessed (2.1.88 match: installGlobalPackage, 0.255)
/**
 * installGlobalPackage：持锁后用 npm（或 bun）全局安装指定版本，校验安装结果，失败分类上报。
 */
async function installGlobalPackage(targetVersion, storage) {
  let state = getAutoUpdaterState();
  if (!(await acquireLock(storage))) {
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
  let updateRestoreFailure = state.updateRestoreFailure;
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
    let packageSpec = targetVersion
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
        }@${targetVersion}`
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
    let isWindowsStandalone =
      getPlatform() === "windows" &&
      isStandaloneExecutable() &&
      process.execPath.replace(/\\/g, "/").includes("/node_modules/@anthropic-ai/");
    let preservedPairs = [];
    if (isWindowsStandalone) {
      let [, npmPrefix] = npmGlobalPrefixes();
      let retiredDirs = (
        await Promise.all(
          (await gatherAllCandidates()).map(async (dir) =>
            (await Promise.all([
              readdir(dir).catch(() => []),
              readdir(join(dir, "bin")).catch(() => []),
            ]).then(([topEntries, binEntries]) =>
              [...topEntries, ...binEntries].some((entry) => /\.exe\.old\.\d+$/.test(entry)),
            ))
              ? [dir]
              : [],
          ),
        )
      ).flat();
      if (retiredDirs.length > 0)
        if (await pathExists(process.execPath))
          await Promise.all(
            retiredDirs.map((dir) =>
              rm(dir, {
                recursive: true,
                force: true,
              }).catch((error) => logForDebugging(`retired-dir cleanup failed: ${error}`)),
            ),
          );
        else await newestPreservedOldBinary(state, retiredDirs);
      let now = Date.now();
      let selfInode = await stat(process.execPath, {
        bigint: true,
      })
        .then((stats) => stats.ino)
        .catch(() => 0n);
      let targets = [process.execPath];
      for (let entry of await readdir(npmPrefix).catch(() => []))
        for (let exeName of ["claude.exe", "cli.exe"]) {
          let candidatePath = join(npmPrefix, entry, exeName);
          if (candidatePath === process.execPath) continue;
          let inode = await stat(candidatePath, {
            bigint: true,
          })
            .then((stats) => stats.ino)
            .catch(() => -1n);
          if (selfInode && inode === selfInode) targets.push(candidatePath);
        }
      for (let targetPath of targets) {
        let preservedPath = `${targetPath}.old.${now}`;
        try {
          await rename(targetPath, preservedPath);
        } catch {
          continue;
        }
        preservedPairs.push([targetPath, preservedPath]);
        let preservedInode = await stat(preservedPath, {
          bigint: true,
        }).then(
          (stats) => stats.ino,
          () => 0n,
        );
        if (preservedInode !== 0n) state.mintedPreservedInodes.add(preservedInode);
      }
    }
    let installResult = await execFileNoThrowWithCwd(globalPackageManager, ["install", "-g", packageSpec], {
      cwd: homedir(),
      useToolMemoryCgroup: false,
    });
    let restoreFailureCount = 0;
    let relocatedCount = 0;
    let restoreFailures = [];
    if (preservedPairs.length && installResult.code !== 0) {
      for (let [originalPath, preservedPath] of preservedPairs)
        try {
          await rename(preservedPath, originalPath);
        } catch (error) {
          try {
            await restoreBinaryAtomically(preservedPath, originalPath);
            logForDebugging(`Restored ${originalPath} by copy after rename failed: ${error}`);
            await unlink(preservedPath).catch((error) =>
              logForDebugging(`Failed to remove ${preservedPath} after copy-restore: ${error}`),
            );
          } catch (error_2) {
            let locatedPath = await locatePreservedCopy(state, preservedPath);
            let relocateError;
            if (locatedPath !== null && locatedPath !== preservedPath)
              try {
                await restoreBinaryAtomically(locatedPath, originalPath);
                relocatedCount++;
                logForDebugging(
                  `Restored ${originalPath} from retired-dir copy ${locatedPath} after rename (${error}) and copy (${error_2}) both failed`,
                );
                continue;
              } catch (error) {
                relocateError = error;
                logForDebugging(
                  `Failed to restore ${originalPath} from retired-dir copy ${locatedPath}: ${error}`,
                );
              }
            let preservedState =
              locatedPath === null
                ? lit("gone")
                : locatedPath === preservedPath
                  ? lit("original_dir")
                  : lit("retired_dir");
            restoreFailureCount++;
            if (restoreFailures.length === 0) {
              let renameCode = sanitizedErrCodeForTelemetry(error);
              let copyCode = sanitizedErrCodeForTelemetry(error_2);
              let relocateCode =
                relocateError === undefined ? undefined : sanitizedErrCodeForTelemetry(relocateError);
              logFeatureBad("update_apply", "update_apply_restore_failed", {
                ...(renameCode && {
                  rename_err_code: renameCode,
                }),
                ...(copyCode && {
                  copy_err_code: copyCode,
                }),
                ...(relocateCode && {
                  relocate_err_code: relocateCode,
                }),
                preserved_state: preservedState,
              });
            }
            restoreFailures.push({
              originalPath,
              preservedPath: locatedPath,
            });
            logError(
              withTelemetryMessage(
                new UpdateApplyError(
                  `Failed to restore ${originalPath} after install failure: rename: ${error}; copy: ${error_2}; preserved copy: ${locatedPath ?? "not found"}`,
                ),
                `Failed to restore executable after install failure: rename=${sanitizeErrnoForTelemetry(error) ?? "unknown"} copy=${sanitizeErrnoForTelemetry(error_2) ?? "unknown"} relocate=${relocateError === undefined ? (locatedPath === null ? "not_found" : "skipped") : (sanitizeErrnoForTelemetry(relocateError) ?? "unknown")}`,
              ),
            );
          }
        }
      if (relocatedCount > 0 && restoreFailureCount === 0)
        logFeatureOk("update_apply_heal", {
          heal_kind: lit("relocate"),
        });
      let error = new Set(preservedPairs.map(([originalPath]) => originalPath));
      state.updateRestoreFailure =
        restoreFailures[0] ??
        (state.updateRestoreFailure && !error.has(state.updateRestoreFailure.originalPath)
          ? state.updateRestoreFailure
          : null);
    }
    if (installResult.code !== 0) {
      let output = `${installResult.stdout} ${installResult.stderr}`;
      let errorKind = classifyNpmInstallError(output);
      let restoreState =
        preservedPairs.length === 0 ? "not_attempted" : restoreFailureCount === 0 ? "restored" : "partial";
      if (errorKind === "warning_only") {
        let probe = await verifyInstalledVersion(targetVersion);
        if (probe.outcome === "landed") {
          await saveGlobalConfig(
            (current) => ({
              ...current,
              installMethod: "global",
            }),
            storage,
          );
          state.updateRestoreFailure = null;
          logFeatureSad("update_apply", "update_apply_npm_install_stderr_warning");
          logForDebugging(
            `npm/bun exited ${installResult.code} with only warnings on stderr but the install-prefix re-probe confirms the install landed (now ${probe.version}): ${output}`,
          );
          return {
            status: "success",
            probeDurationMs: probe.durationMs,
          };
        }
      }
      logEvent("tengu_auto_updater_npm_failure", {
        npm_exit_code: installResult.code,
        package_manager: fromEnum(globalPackageManager),
        is_bundled_mode: isStandaloneExecutable(),
        platform: platformOrOther(getPlatform()),
        windows_self_rename: fromEnum(restoreState),
        stderr_signature: fromEnum(errorKind),
        npm_error_code: extractNpmErrorCode(output) ?? lit("none"),
      });
      if (
        getPlatform() === "windows" &&
        /\b(?:claude|cli)\.exe\b/i.test(output) &&
        (/\bEBUSY\b|resource busy or locked/i.test(output) ||
          (/\bEPERM\b|operation not permitted/i.test(output) &&
            (preservedPairs.length > 0 ||
              /\b(?:rename|copyfile|unlink)\b[^\r\n]*\b(?:claude|cli)\.exe\b/i.test(output))))
      ) {
        logFeatureBad("update_apply", "update_apply_exe_locked");
        logForDebugging(`Failed to install new version of claude (running executable is locked): ${output}`, {
          level: "error",
        });
        return {
          status: "install_failed",
          failureHint: "windows_running_exe_lock",
        };
      }
      if (/\b(EACCES|EPERM|permission denied)\b/i.test(output)) {
        logFeatureBad("update_apply", "update_apply_no_permissions");
        logForDebugging("Insufficient permissions for global npm install.", {
          level: "error",
        });
        return {
          status: "no_permissions",
        };
      }
      if (errorKind === "native_package_missing") {
        logFeatureBad("update_apply", "update_apply_native_binary_missing");
        logForDebugging(
          `Failed to install new version of claude (platform-native package missing; npm should have restored the previous version): ${output}`,
          {
            level: "error",
          },
        );
        return {
          status: "install_failed",
          failureHint: "native_binary_missing",
        };
      }
      if (errorKind === "warning_only") {
        logFeatureBad("update_apply", "update_apply_npm_install_stderr_warning");
        logForDebugging(
          `npm/bun exited ${installResult.code} with only warnings on stderr but the re-probe did not confirm an advance: ${output}`,
          {
            level: "error",
          },
        );
        return {
          status: "install_failed",
        };
      }
      logFeatureBad("update_apply", "update_apply_npm_install_failed");
      logForDebugging(`Failed to install new version of claude: ${output}`, {
        level: "error",
      });
      return {
        status: "install_failed",
      };
    }
    let probe = await verifyInstalledVersion(targetVersion);
    switch (probe.outcome) {
      case "placeholder_stub": {
        let ignoreScriptsResult =
          globalPackageManager === "npm"
            ? await execFileNoThrowWithCwd("npm", ["config", "get", "ignore-scripts"], {
                abortSignal: AbortSignal.timeout(1e4),
                cwd: homedir(),
                useToolMemoryCgroup: false,
              })
            : null;
        if (ignoreScriptsResult?.code === 0 && ignoreScriptsResult.stdout.trim() === "true") {
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
      (current) => ({
        ...current,
        installMethod: "global",
      }),
      storage,
    );
    state.updateRestoreFailure = null;
    logFeatureOk("update_apply");
    return {
      status: "success",
      probeDurationMs: probe.durationMs,
    };
  } finally {
    if (state.updateRestoreFailure !== null && state.updateRestoreFailure === updateRestoreFailure)
      await refreshRestoreFailure(state);
    await releaseLock(storage);
  }
}
//@ chunk-6zvphrsz.js:30009-30271 fingerprint (2.1.88 match: removeClaudeAliasesFromShellConfigs, 1)
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
function classifyNpmInstallError(output) {
  if (/\b(EACCES|EPERM|permission denied)\b/i.test(output)) return "eacces_eperm";
  if (/postinstall\] Native package "[^"]*" not found/.test(output)) return "native_package_missing";
  if (/\bENOTEMPTY\b/i.test(output)) return "enotempty";
  if (/\bETARGET\b/i.test(output)) return "etarget";
  if (/\bE403\b/i.test(output) || /\b403 forbidden\b/i.test(output)) return "e403_forbidden";
  if (/\bENOENT\b/i.test(output)) return "enoent";
  if (
    /\bE5\d\d\b/i.test(output) ||
    /\b5\d\d\s+(internal server error|bad gateway|service unavailable|gateway time-?out)\b/i.test(output)
  )
    return "registry_5xx";
  if (
    /\b(ETIMEDOUT|ESOCKETTIMEDOUT)\b/i.test(output) ||
    /\btimed[\s-]?out\b/i.test(output) ||
    /\btimeout\b/i.test(output)
  )
    return "network_timeout";
  if (/\bENOSPC\b/i.test(output)) return "disk_full";
  if (/\bEBUSY\b/i.test(output) || /\bresource busy or locked\b/i.test(output)) return "ebusy";
  let hasWarnings =
    /npm warn/i.test(output) || /unknown user config/i.test(output) || /npm notice/i.test(output);
  let hasErrors =
    /npm err/i.test(output) || /\b(EACCES|EPERM|ETARGET)\b/i.test(output) || /code E/i.test(output);
  if (hasWarnings && !hasErrors) return "warning_only";
  return "unknown";
}
//@ chunk-6zvphrsz.js:31249-31383 sole-consumer
function extractNpmErrorCode(output) {
  let code = /\bnpm (?:ERR!|error) code\s+([A-Z][A-Z0-9_]{1,29})(?![A-Za-z0-9_])/.exec(output)?.[1];
  return code === undefined ? undefined : fromSanitizer_SANITIZER_OUTPUT_ONLY(code);
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
