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
import { join, join as join_2, join as join_3, dirname, basename } from "path";
import {
  writeFile,
  writeFile as writeFile_2,
  stat,
  stat as stat_2,
  access,
  access as access_2,
  readdir,
  unlink,
  copyFile,
  rm,
  rename,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  open as open_8,
  open as open_9,
  open as open_10,
  open as open_11,
  open as open_12,
  open as open_13,
  open as open_14,
  open as open_15,
  open as open_16,
  open as open_17,
  open as open_18,
  open as open_19,
  open as open_20,
  open as open_21,
  open as open_22,
  open as open_23,
  open as open_24,
  open as open_25,
  open as open_26,
  open as open_27,
} from "fs/promises";
import { homedir, homedir as homedir_2 } from "os";
import {
  constants,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
  constants as constants_9,
  constants as constants_10,
  constants as constants_12,
  constants as constants_13,
  constants as constants_14,
  constants as constants_15,
  constants as constants_16,
  constants as constants_17,
  constants as constants_18,
  constants as constants_19,
  constants as constants_20,
  constants as constants_21,
  constants as constants_22,
  constants as constants_23,
  constants as constants_24,
  constants as constants_25,
  constants as constants_26,
  constants as constants_27,
} from "fs";
import { randomBytes } from "crypto";
import { Re } from "../../runtime/bun-runtime.js";
import { Vy } from "../../vendor/semver/index.js";
import { crt, Eee } from "./plugins/hooksModulesRollout.js";
import {
  getLastInteractionTime,
  getIsNonInteractiveSession,
  getSessionId,
  getRootSession,
} from "../bootstrap/state.js";
import { hqe } from "./plugins/hooksModulesLoadGate.js";
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
import { lt_2, gte, lte, gt as gt_2 } from "./semver.js";
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
import { sanitizeVersion, X4 } from "../services/analytics/metadata.js";
import { escapeControlChars } from "./resultError.js";
import { getInitialSettings_2, getSettingsForSource } from "./settings/settings.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { getFsImplementation } from "./fsOperations.js";
import { env } from "./env.js";
import { execFileNoThrowWithCwd, execFileNoThrow } from "./execFileNoThrow.js";
import { getPlatform } from "./platform.js";
import { Wun, jun } from "./nativeInstaller/nativeBinaryMissing.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { isEssentialTrafficOnly } from "./privacyLevel.js";
import { t3 } from "./nativeInstaller/downloadsClient.js";
import { externalHttp } from "../services/http/externalHttp.js";
import { gatherAllCandidates } from "./listSessionsImpl.js";
import { retryFsOp, DISK_FULL_CODES } from "./atomicPublishWrite.js";
import { AI } from "./plugins/safeCopy.js";
import { lit, fromEnum, fromSanitizer_SANITIZER_OUTPUT_ONLY } from "../services/analytics/safeMetadata.js";
import { saveGlobalConfig } from "./config.js";
import {
  getShellConfigPaths,
  readFileLinesOrNull,
  filterClaudeAliases,
  writeFileLines,
} from "./shellConfig.js";
import { ws } from "./fsFlags.js";
import { regExp_11, parsePrUrl_2, linkPrToSession } from "../tools/shared/gitOperationTracking.js";

//@ chunk-6zvphrsz.js:1282-1299 placement
var C = Re(Vy(), 1);
//@ chunk-6zvphrsz.js:1579-1641 placement
function ze(e) {
  return crt(e) ? e.over.promise : Promise.resolve();
}
//@ chunk-6zvphrsz.js:1641-1653 placement
var de = 2000;
//@ chunk-6zvphrsz.js:1653-1696 placement
var L = () => Math.max(de - (Date.now() - getLastInteractionTime()), 0);
//@ chunk-6zvphrsz.js:1696-1720 placement
var pe = () => L() > 0 || hqe();
//@ chunk-6zvphrsz.js:1720-1732 placement
var fe = 1000;
//@ chunk-6zvphrsz.js:1732-1770 placement
var me = () => (hqe() ? Math.max(L(), fe) : L());
//@ chunk-6zvphrsz.js:1770-1815 placement
async function ge() {
  while (pe()) await sleep(me());
}
//@ chunk-6zvphrsz.js:1815-1982 placement
async function shutDownAfterRefusal(e) {
  if ((await ge(), isTerminalShutdown())) return;
  (e.say(),
    await e
      .shutDown()
      .catch((n) =>
        logForDebugging(`refusal after the flag fetch hold failed (${errorMessage(n)})`, { level: "error" }),
      ),
    e.hard());
}
//@ chunk-6zvphrsz.js:1982-2040 placement
function nt(e, r, n) {
  return e.hasHeld && !getIsNonInteractiveSession() ? void shutDownAfterRefusal(n) : r();
}
//@ chunk-6zvphrsz.js:2040-2054 placement
var ot = (e) => e;
//@ chunk-6zvphrsz.js:2054-2063 placement
var ve = 1;
/**
 * 带超时与指数退避抖动的重试。
 */
//@ chunk-6zvphrsz.js:2063-2292 placement
async function retryWithTimeout(e, r) {
  let n;
  for (let o = 1; o <= r.attempts; o++)
    try {
      return await e(AbortSignal.timeout(r.timeoutMs));
    } catch (error) {
      if (((n = error), o >= r.attempts)) break;
      r.onRetry?.(o, error);
      let u = 500 * 3 ** (o - 1);
      await sleep(u * (0.75 + Math.random() * 0.5));
    }
  throw n;
}
//@ chunk-6zvphrsz.js:6186-6244 placement
var yt = "https://downloads.claude.ai/claude-code-releases";
//@ chunk-6zvphrsz.js:6244-6266 placement
class Le extends ClaudeError {}
/**
 * 更新应用失败原因到错误键。
 */
//@ chunk-6zvphrsz.js:6266-6513 placement
function updateApplyErrorKey(e) {
  switch (e) {
    case "windows_running_exe_lock":
      return "update_apply_exe_locked";
    case "native_binary_missing":
      return "update_apply_native_binary_missing";
    case "registry_session_refused":
      return "update_session_refused";
    case void 0:
      return null;
  }
}
/**
 * 启动时按 tengu_version_config 检查最低版本，过低时提示并退出。
 */
//@ chunk-6zvphrsz.js:6513-7753 placement
async function enforceMinimumVersion() {
  try {
    let e = Eee();
    await ze(e);
    let r = await getDynamicConfig_BLOCKS_ON_INIT("tengu_version_config", { minVersion: "0.0.0" });
    if (
      r.minVersion &&
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
        r.minVersion,
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
        r.minVersion,
      );
      nt(
        e,
        () => exitBelowMinVersion(r.minVersion),
        ot({
          say: () => {
            (latchTerminalShutdown(), emitExitMessage(n));
          },
          shutDown: () => gracefulShutdown(ve),
          hard: cliError,
        }),
      );
    }
  } catch (error) {
    logError(error);
  }
}
/**
 * 版本低于最低要求时打印说明并退出。
 */
//@ chunk-6zvphrsz.js:7753-8499 placement
function exitBelowMinVersion(e) {
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
    e,
  );
  if (
    (console.error(`
${r}
`),
    isStartupFailureResultRequested() && isStreamJsonLaunch())
  )
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
  gracefulShutdownSync(ve);
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
/**
 * 距启动 10 秒宽限期还剩多少毫秒。
 */
//@ chunk-6zvphrsz.js:8941-9000 layout
function remainingStartupGraceMs() {
  return Math.max(0, STARTUP_GRACE_MS - process.uptime() * 1000);
}
/**
 * 自动更新检查节流：5 分钟内已检查过则跳过。
 */
//@ chunk-6zvphrsz.js:9000-9216 layout
function isAutoUpdateCheckThrottled() {
  let e = getAutoUpdaterState(),
    now = Date.now();
  if (now - e.lastAutoUpdateCheckAt < AUTO_UPDATE_CHECK_THROTTLE_MS)
    return (
      logForDebugging(
        `auto-update check throttled (last check ${Math.round((now - e.lastAutoUpdateCheckAt) / 1000)}s ago)`,
      ),
      !0
    );
  return ((e.lastAutoUpdateCheckAt = now), !1);
}
/**
 * getMaxVersion：GrowthBook 下发的版本上限（外部用户 external 字段）。
 */
//@ chunk-6zvphrsz.js:9216-9268 layout
async function getMaxVersion() {
  return (await resolveMaxVersionConfig()).maxVersion;
}
/**
 * 读取 GrowthBook tengu_max_version_config：版本上限与强制降级开关。
 */
//@ chunk-6zvphrsz.js:9268-9600 layout
async function resolveMaxVersionConfig() {
  let e = await getMaxVersionConfig(),
    r = !1,
    n = e.external || void 0,
    o = n ? (C.parse(n)?.version ?? void 0) : void 0;
  if (n && !o)
    (logForDebugging(`tengu_max_version_config has invalid version '${n}' \u2014 ignoring`, {
      level: "error",
    }),
      logEvent("tengu_max_version_config_invalid", { raw_value: sanitizeVersion(n) }));
  return { maxVersion: o, forceDowngradeEnabled: e.external_force_downgrade === !0 };
}
/**
 * 强制降级是否生效：当前版本高于上限时才降。
 */
//@ chunk-6zvphrsz.js:9600-9904 layout
function isForceDowngradeActive(e, r, n) {
  let o = n === "native_update" ? "Native installer" : "AutoUpdater",
    parse = C.parse(e);
  if (parse && parse.compare(r) > 0)
    return (logForDebugging(`${o}: force-downgrade active \u2014 moving from ${e} to ${r}`), !0);
  return (
    logForDebugging(
      `${o}: force-downgrade flag set but current ${e} is not above ${r} \u2014 taking normal upgrade path`,
    ),
    !1
  );
}
/**
 * 版本上限的提示文案（external_message）。
 */
//@ chunk-6zvphrsz.js:9904-9969 fingerprint = getMaxVersionMessage (0.469)
async function getMaxVersionMessage() {
  return (await getMaxVersionConfig()).external_message || void 0;
}
//@ chunk-6zvphrsz.js:9969-10065 fingerprint = getMaxVersionConfig (1)
async function getMaxVersionConfig() {
  try {
    return await getDynamicConfig_BLOCKS_ON_INIT("tengu_max_version_config", {});
  } catch (error) {
    return (logError(error), {});
  }
}
/**
 * 返回跳过某目标版本的原因（低于 minimumVersion、高于上限等），无则 null。
 */
//@ chunk-6zvphrsz.js:10065-10942 layout
function getVersionSkipReason(e) {
  if (!C.parse(e))
    return (
      logForDebugging("update target is not a valid semver version \u2014 skip checks constrain nothing", {
        level: "error",
      }),
      logForDebugging(
        `update target (first 300 chars, JSON-encoded): ${escapeControlChars(JSON.stringify(e.slice(0, 300)))}`,
      ),
      null
    );
  let r = getInitialSettings_2()?.minimumVersion;
  if (r) {
    let o = C.parse(r)?.version;
    if (!o)
      logForDebugging(
        `minimumVersion is not a valid semver version \u2014 ignoring. Value (first 300 chars, JSON-encoded): ${escapeControlChars(JSON.stringify(r.slice(0, 300)))}`,
        { level: "error" },
      );
    else if (!gte(e, o)) return `below your minimumVersion setting (${r})`;
  }
  let n = getSettingsForSource("policySettings")?.requiredMaximumVersion;
  if (n) {
    let o = C.parse(n)?.version;
    if (!o)
      logForDebugging(
        `requiredMaximumVersion is not a valid semver version \u2014 ignoring. Value (first 300 chars, JSON-encoded): ${escapeControlChars(JSON.stringify(n.slice(0, 300)))}`,
        { level: "error" },
      );
    else if (!lte(e, o)) return `above your organization's requiredMaximumVersion (${n})`;
  }
  return null;
}
/**
 * shouldSkipVersion：目标版本应跳过时记日志并返回 true。
 */
//@ chunk-6zvphrsz.js:10942-11027 fingerprint = shouldSkipVersion (0.806)
function shouldSkipVersion(targetVersion) {
  let r = getVersionSkipReason(targetVersion);
  if (r) logForDebugging(`Skipping update to ${targetVersion}: ${r}`);
  return r !== null;
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
  let r = getUpdateLockStateKey(),
    statMeta = await e.statMeta(r);
  if (statMeta.ok) {
    if (Date.now() - statMeta.value.mtimeMs < LOCK_TIMEOUT_MS) return !1;
    let statMeta_2 = await e.statMeta(r);
    if (statMeta_2.ok) {
      if (Date.now() - statMeta_2.value.mtimeMs < LOCK_TIMEOUT_MS) return !1;
      let R = await e.delete(r);
      if (!R.ok)
        return (
          logForDebugging(`AutoUpdater: failed to remove stale update lock: ${R.error.code}`, {
            level: "error",
          }),
          !1
        );
    } else if (statMeta_2.error.code !== "NotFound")
      return (
        logForDebugging(`AutoUpdater: failed to re-stat stale update lock: ${statMeta_2.error.code}`, {
          level: "error",
        }),
        !1
      );
  } else if (statMeta.error.code !== "NotFound")
    return (
      logForDebugging(`AutoUpdater: failed to stat update lock: ${statMeta.error.code}`, { level: "error" }),
      !1
    );
  let write = await e.write(r, `${process.pid}`, {
    precondition: { type: "ifAbsent" },
    mode: 438 & ~process.umask(),
  });
  if (write.ok) return !0;
  if (write.error.code === "AlreadyExists") return !1;
  return (
    logForDebugging(`AutoUpdater: failed to create update lock: ${write.error.code}`, { level: "error" }),
    !1
  );
}
/**
 * acquireLock：~/.claude/.update.lock（或 v5 存储），5 分钟内的锁视为有效。
 */
//@ chunk-6zvphrsz.js:11940-12644 fingerprint = acquireLock (0.726)
async function acquireLock(e) {
  if (isStorageV5Enabled() && e) return acquireStorageUpdateLock(e);
  let fs = getFsImplementation(),
    lockPath = getLockFilePath();
  try {
    let stats = await fs.stat(lockPath);
    if (Date.now() - stats.mtimeMs < LOCK_TIMEOUT_MS) return !1;
    try {
      let recheck = await fs.stat(lockPath);
      if (Date.now() - recheck.mtimeMs < LOCK_TIMEOUT_MS) return !1;
      await fs.unlink(lockPath);
    } catch (err) {
      if (!isENOENT(err)) return (logError(err), !1);
    }
  } catch (err) {
    if (!isENOENT(err)) return (logError(err), !1);
  }
  try {
    return (await writeFile(lockPath, `${process.pid}`, { encoding: "utf8", flag: "wx" }), !0);
  } catch (err) {
    let code = getErrnoCode(err);
    if (code === "EEXIST") return !1;
    if (code === "ENOENT")
      try {
        return (
          await fs.mkdir(getClaudeConfigDir()),
          await writeFile(lockPath, `${process.pid}`, { encoding: "utf8", flag: "wx" }),
          !0
        );
      } catch (mkdirErr) {
        if (getErrnoCode(mkdirErr) === "EEXIST") return !1;
        return (
          logForDebugging(`Failed to create config dir or update lock file: ${mkdirErr}`, { level: "error" }),
          !1
        );
      }
    return (
      logForDebugging(`AutoUpdater: failed to create update lock file ${lockPath}: ${err}`, {
        level: "error",
      }),
      !1
    );
  }
}
//@ chunk-6zvphrsz.js:12644-13233 layout
async function releaseLock(e) {
  if (isStorageV5Enabled() && e) {
    let read = await e.read([getUpdateLockStateKey()]);
    if (!read.ok) {
      logForDebugging(`AutoUpdater: failed to release update lock: ${read.error.code}`, { level: "error" });
      return;
    }
    let s = read.value.items[0];
    if (!s.found) return;
    if (Buffer.from(s.value).toString("utf8") === `${process.pid}`) {
      let u = await e.delete(getUpdateLockStateKey());
      if (!u.ok)
        logForDebugging(`AutoUpdater: failed to release update lock: ${u.error.code}`, { level: "error" });
    }
    return;
  }
  let r = getFsImplementation(),
    n = getLockFilePath();
  try {
    if ((await r.readFile(n, { encoding: "utf8" })) === `${process.pid}`) await r.unlink(n);
  } catch (error) {
    if (isENOENT(error)) return;
    logForDebugging(`AutoUpdater: failed to release update lock file ${n}: ${error}`, { level: "error" });
  }
}
//@ chunk-6zvphrsz.js:13233-13486 layout
function getGlobalPackageManager() {
  let replaced = process.execPath.replace(/\\/g, "/"),
    replaced_2 = (env.BUN_INSTALL ?? "").replace(/\\/g, "/").replace(/\/+$/, "");
  if (
    replaced.includes("/.bun/install/global/") ||
    (replaced_2 && replaced.startsWith(replaced_2 + "/install/global/"))
  )
    return "bun";
  return env.isRunningWithBun() && !isStandaloneExecutable() ? "bun" : "npm";
}
//@ chunk-6zvphrsz.js:13486-13851 fingerprint = getInstallationPrefix (0.788)
async function getInstallationPrefix() {
  let e = getGlobalPackageManager() === "bun",
    prefixResult = null;
  if (e)
    prefixResult = await execFileNoThrowWithCwd("bun", ["pm", "bin", "-g"], {
      cwd: homedir(),
      useToolMemoryCgroup: !1,
    });
  else
    prefixResult = await execFileNoThrowWithCwd("npm", ["-g", "config", "get", "prefix"], {
      cwd: homedir(),
      useToolMemoryCgroup: !1,
    });
  if (prefixResult.code !== 0)
    return (
      logForDebugging(
        `Failed to check ${e ? "bun" : "npm"} permissions (exit ${prefixResult.code}): ${prefixResult.stderr.trim()}`,
        { level: "error" },
      ),
      null
    );
  return prefixResult.stdout.trim() || null;
}
//@ chunk-6zvphrsz.js:13851-14652 layout
async function getGlobalInstallPaths() {
  let e = await getInstallationPrefix();
  if (!e) return null;
  if (getGlobalPackageManager() === "bun") {
    let n = join(e, "claude");
    return { execPaths: [n], imagePath: n };
  }
  if (getPlatform() === "windows")
    return {
      execPaths: [join(e, "claude.cmd"), join(e, "claude.exe")],
      imagePath: join(
        e,
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
  let r = join(e, "bin", "claude");
  return { execPaths: [r], imagePath: r };
}
//@ chunk-6zvphrsz.js:14652-15738 layout
async function verifyInstalledVersion(e) {
  let now = Date.now(),
    n = await getGlobalInstallPaths(),
    o = e ? C.parse(e)?.version : void 0,
    s = !1,
    u = !1;
  for (let p of n?.execPaths ?? []) {
    let w = await execFileNoThrowWithCwd(p, ["--version"], {
        abortSignal: AbortSignal.timeout(45000),
        cwd: homedir(),
        useToolMemoryCgroup: !1,
      }),
      E = C.parse(w.stdout.trim().split(/\s+/)[0])?.version;
    if (
      w.code === 0 &&
      E != null &&
      (o != null
        ? E === o
        : gt_2(
            E,
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
      return { outcome: "landed", version: E, durationMs: Date.now() - now };
    if (w.code !== 0)
      ((s = !0),
        (u ||= `${w.stdout}
${w.stderr}`.includes(Wun)));
  }
  return {
    outcome:
      u ||
      (s &&
        n !== null &&
        (await stat(n.imagePath).then(
          (p) => p.isFile() && p.size < jun,
          () => !1,
        )))
        ? "placeholder_stub"
        : "inconclusive",
    durationMs: Date.now() - now,
  };
}
/**
 * 检查 npm 全局前缀是否可写。
 */
//@ chunk-6zvphrsz.js:15738-16063 fingerprint = checkGlobalInstallPermissions (1)
async function checkGlobalInstallPermissions() {
  try {
    let prefix = await getInstallationPrefix();
    if (!prefix) return { hasPermissions: !1, npmPrefix: null };
    try {
      return (await access(prefix, constants.W_OK), { hasPermissions: !0, npmPrefix: prefix });
    } catch {
      return (
        logForDebugging("Insufficient permissions for global npm install.", { level: "error" }),
        { hasPermissions: !1, npmPrefix: prefix }
      );
    }
  } catch (error) {
    return (logError(error), { hasPermissions: !1, npmPrefix: null });
  }
}
/**
 * getLatestVersion：npm view @anthropic-ai/claude-code@stable|latest version。
 */
//@ chunk-6zvphrsz.js:16063-17635 fingerprint = getLatestVersion (0.498)
async function getLatestVersion(channel) {
  let npmTag = channel === "stable" ? "stable" : "latest",
    result = await execFileNoThrowWithCwd(
      "npm",
      [
        "view",
        `${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.PACKAGE_URL}@${npmTag}`,
        "version",
        "--prefer-online",
      ],
      { abortSignal: AbortSignal.timeout(5000), cwd: homedir(), useToolMemoryCgroup: !1 },
    );
  if (result.code !== 0) {
    let trimmed = result.stdout.trim();
    if (trimmed && C.parse(trimmed)) {
      if (
        (logFeatureSad("update_check", "update_check_npm_view_stderr_warning"),
        logForDebugging(
          `npm view exited ${result.code} but printed a valid version (${trimmed}) \u2014 treating stderr as a warning`,
        ),
        result.stderr)
      )
        logForDebugging(`npm stderr: ${result.stderr.trim()}`);
      return trimmed;
    }
    if (
      (logFeatureBad("update_check", "update_check_npm_view_failed"),
      logForDebugging(`npm view failed with code ${result.code}`),
      result.stderr)
    )
      logForDebugging(`npm stderr: ${result.stderr.trim()}`);
    else logForDebugging("npm stderr: (empty)");
    if (result.stdout)
      logForDebugging(
        `npm stdout (first 300 chars, JSON-encoded): ${escapeControlChars(JSON.stringify(result.stdout.trim().slice(0, 300)))}`,
      );
    return null;
  }
  let trimmed = result.stdout.trim();
  if (trimmed && !C.parse(trimmed))
    return (
      logFeatureBad("update_check", "update_check_npm_view_invalid_stdout"),
      logForDebugging(
        "npm view exited 0 but stdout is not a valid semver version \u2014 treating as no result",
      ),
      logForDebugging(
        `npm stdout (first 300 chars, JSON-encoded): ${escapeControlChars(JSON.stringify(trimmed.slice(0, 300)))}`,
      ),
      null
    );
  return (logFeatureOk("update_check"), trimmed || null);
}
//@ chunk-6zvphrsz.js:17635-17652 placement
var Oe = 5000,
  Ie = 3;
/**
 * 从 GCS 获取指定通道的版本号（重试、校验 semver）。
 */
//@ chunk-6zvphrsz.js:17652-18404 placement
async function fetchGcsVersion(e) {
  if (isEssentialTrafficOnly()) return null;
  let r = 0;
  try {
    let trimmed = (
      await retryWithTimeout(
        (s) => (r++, t3.get(`${yt}/${e}`, { timeout: Oe, responseType: "text", signal: s })),
        {
          attempts: Ie,
          timeoutMs: Oe,
          onRetry: (s, u) => {
            logForDebugging(`Failed to fetch ${e} from GCS on attempt ${s}/${Ie}, retrying: ${u}`);
          },
        },
      )
    ).data.trim();
    if (!C.parse(trimmed))
      return (
        logFeatureBad("update_check", "update_check_gcs_invalid_response"),
        logForDebugging(
          `GCS ${e} version response is not a valid semver version \u2014 treating as no result`,
        ),
        logForDebugging(
          `GCS response body (first 300 chars, JSON-encoded): ${escapeControlChars(JSON.stringify(trimmed.slice(0, 300)))}`,
        ),
        null
      );
    if (r > 1) logFeatureSad("update_check", "update_check_gcs_retry");
    else logFeatureOk("update_check");
    return trimmed;
  } catch (error) {
    return (
      logFeatureBad("update_check", "update_check_gcs_failed"),
      logForDebugging(`Failed to fetch ${e} from GCS after ${r} attempt(s): ${error}`),
      null
    );
  }
}
//@ chunk-6zvphrsz.js:18404-19086 placement
async function getLatestVersionFromGcs(channel) {
  if (isEssentialTrafficOnly()) return null;
  try {
    let response = await externalHttp.get(`https://formulae.brew.sh/api/cask/${channel}.json`, {
        timeout: 5000,
        responseType: "json",
      }),
      n = response.data?.version,
      o = typeof n === "string" ? n.trim() : null;
    if (!o || !C.parse(o)) {
      (logFeatureBad("update_check", "update_check_homebrew_invalid_version"),
        logForDebugging(
          `formulae.brew.sh ${channel} version is not a valid semver version \u2014 treating as no result`,
        ));
      let s = typeof response.data === "string" ? response.data : String(jsonStringify(response.data));
      return (
        logForDebugging(
          `brew response (first 300 chars, JSON-encoded): ${escapeControlChars(JSON.stringify(s.slice(0, 300)))}`,
        ),
        null
      );
    }
    return (logFeatureOk("update_check"), o);
  } catch (error) {
    return (
      logFeatureBad("update_check", "update_check_homebrew_failed"),
      logForDebugging(`Failed to fetch ${channel} from formulae.brew.sh: ${error}`),
      null
    );
  }
}
//@ chunk-6zvphrsz.js:19086-19165 placement
async function Uun(e, r) {
  let [n, o] = await Promise.all([getLatestVersionFromGcs(e), fetchGcsVersion(r)]);
  return n ?? o;
}
//@ chunk-6zvphrsz.js:19165-19213 placement
function aet() {
  return getAutoUpdaterState().updateRestoreFailure;
}
/**
 * 更新恢复失败记录：原路径已恢复则清除，否则重新定位保留副本。
 */
//@ chunk-6zvphrsz.js:19213-19537 placement
async function refreshRestoreFailure(e) {
  if (!e.updateRestoreFailure) return;
  if (await ie(e.updateRestoreFailure.originalPath)) {
    e.updateRestoreFailure = null;
    return;
  }
  if (e.updateRestoreFailure.preservedPath !== null)
    e.updateRestoreFailure = {
      originalPath: e.updateRestoreFailure.originalPath,
      preservedPath: await locatePreservedCopy(e, e.updateRestoreFailure.preservedPath),
    };
}
//@ chunk-6zvphrsz.js:19537-19593 placement
function ie(e) {
  return access(e, constants.F_OK).then(
    () => !0,
    () => !1,
  );
}
//@ chunk-6zvphrsz.js:19593-19666 placement
function Ke() {
  let e = join(dirname(process.execPath), "..", "..");
  return [join(e, ".."), e];
}
//@ chunk-6zvphrsz.js:19861-19983 placement
async function isMintedPreservedFile(e, r) {
  let n = await stat(r, { bigint: !0 }).then(
    (o) => o.ino,
    () => 0n,
  );
  return n !== 0n && e.mintedPreservedInodes.has(n);
}
//@ chunk-6zvphrsz.js:19983-20147 placement
async function locatePreservedCopy(e, r) {
  if (await isMintedPreservedFile(e, r)) return r;
  let n = basename(r),
    flattened = (await gatherAllCandidates()).flatMap((s) => [join(s, n), join(s, "bin", n)]);
  for (let s of flattened) if (await isMintedPreservedFile(e, s)) return s;
  return null;
}
/**
 * 通过临时文件原子恢复可执行文件（失败回退复制）。
 */
//@ chunk-6zvphrsz.js:20147-20623 placement
async function restoreBinaryAtomically(e, r) {
  await getFsImplementation().mkdir(dirname(r));
  try {
    let o = dirname(r),
      s = `${basename(r)}.restoring.`;
    for (let u of await readdir(o)) if (u.startsWith(s)) await unlink(join(o, u)).catch(() => {});
  } catch {}
  let n = `${r}.restoring.${randomBytes(4).toString("hex")}`;
  try {
    await copyFile(e, n);
    try {
      await retryFsOp(n, r);
    } catch (error) {
      let s = getErrnoCode(error);
      if (s === void 0 || !AI.has(s)) throw error;
      if (!(await ie(r))) throw error;
      try {
        await copyFile(n, r);
      } catch (error) {
        if (DISK_FULL_CODES.has(getErrnoCode(error) ?? "")) await unlink(r).catch(() => {});
        throw error;
      }
      await unlink(n).catch(() => {});
    }
  } catch (error) {
    throw (await unlink(n).catch(() => {}), error);
  }
}
/**
 * 找到本次保存的最新 .old.<时间戳> 可执行文件。
 */
//@ chunk-6zvphrsz.js:20623-21559 placement
async function newestPreservedOldBinary(e, r) {
  let escapedExecName = basename(process.execPath).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    oldBinaryRe = new RegExp(`^${escapedExecName}\\.old\\.(\\d+)$`),
    candidates = (
      await Promise.all(
        r.flatMap((p) =>
          [p, join(p, "bin")].map(async (w) =>
            (await readdir(w).catch(() => []))
              .map((E) => oldBinaryRe.exec(E))
              .filter((E) => E !== null)
              .map((E) => ({ path: join(w, E[0]), ts: Number(E[1]) })),
          ),
        ),
      )
    ).flat(),
    newest = (
      await Promise.all(candidates.map(async (p) => ((await isMintedPreservedFile(e, p.path)) ? [p] : [])))
    )
      .flat()
      .reduce((p, w) => (p === null || w.ts > p.ts ? w : p), null);
  if (!newest) {
    logForDebugging(
      `No preserved ${basename(process.execPath)}.old.<ts> found in ${r.length} retired dir(s) \u2014 sweep restore skipped`,
    );
    return;
  }
  try {
    (await restoreBinaryAtomically(newest.path, process.execPath),
      logFeatureOk("update_apply_heal", { heal_kind: lit("sweep") }),
      logForDebugging(
        `Restored missing ${process.execPath} from preserved copy ${newest.path} before update attempt`,
      ));
  } catch (error) {
    let w = sanitizedErrCodeForTelemetry(error);
    (logFeatureBad("update_apply_heal", "sweep_restore_failed", {
      ...(w && { err_code: w }),
      heal_kind: lit("sweep"),
    }),
      logForDebugging(
        `Failed to restore missing ${process.execPath} from preserved copy ${newest.path}: ${error}`,
      ));
  }
}
/**
 * installGlobalPackage：持锁后用 npm（或 bun）全局安装指定版本，校验安装结果，失败分类上报。
 */
//@ chunk-6zvphrsz.js:21559-30009 callgraph-witnessed = installGlobalPackage (0.255)
async function installGlobalPackage(e, r) {
  let n = getAutoUpdaterState();
  if (!(await acquireLock(r)))
    return (
      logFeatureSad("update_apply", "update_apply_lock_contention"),
      logForDebugging("Another process is currently installing an update", { level: "error" }),
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
      }),
      { status: "in_progress" }
    );
  let updateRestoreFailure = n.updateRestoreFailure;
  try {
    await removeClaudeAliasesFromShellConfigs();
    let s = getGlobalPackageManager();
    if (s === "npm" && env.isNpmFromWindowsPath())
      return (
        logFeatureBad("update_apply", "update_apply_wsl_windows_npm"),
        logForDebugging("Windows NPM detected in WSL environment", { level: "error" }),
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
        }),
        console.error(`
Error: Windows NPM detected in WSL

You're running Claude Code in WSL but using the Windows NPM installation from /mnt/c/.
This configuration is not supported for updates.

To fix this issue:
  1. Install Node.js within your Linux distribution: e.g. sudo apt install nodejs npm
  2. Make sure Linux NPM is in your PATH before the Windows version
  3. Try updating again with 'claude update'
`),
        { status: "install_failed" }
      );
    let u = e
        ? `${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.PACKAGE_URL}@${e}`
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
          }.PACKAGE_URL,
      R =
        getPlatform() === "windows" &&
        isStandaloneExecutable() &&
        process.execPath.replace(/\\/g, "/").includes("/node_modules/@anthropic-ai/"),
      p = [];
    if (R) {
      let [, y] = Ke(),
        flat = (
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
      if (flat.length > 0)
        if (await ie(process.execPath))
          await Promise.all(
            flat.map((h) =>
              rm(h, { recursive: !0, force: !0 }).catch((P) =>
                logForDebugging(`retired-dir cleanup failed: ${P}`),
              ),
            ),
          );
        else await newestPreservedOldBinary(n, flat);
      let now = Date.now(),
        T = await stat(process.execPath, { bigint: !0 })
          .then((h) => h.ino)
          .catch(() => 0n),
        S = [process.execPath];
      for (let h of await readdir(y).catch(() => []))
        for (let P of ["claude.exe", "cli.exe"]) {
          let M = join(y, h, P);
          if (M === process.execPath) continue;
          let A = await stat(M, { bigint: !0 })
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
        let M = await stat(P, { bigint: !0 }).then(
          (A) => A.ino,
          () => 0n,
        );
        if (M !== 0n) n.mintedPreservedInodes.add(M);
      }
    }
    let w = await execFileNoThrowWithCwd(s, ["install", "-g", u], {
        cwd: homedir(),
        useToolMemoryCgroup: !1,
      }),
      E = 0,
      ae = 0,
      Q = [];
    if (p.length && w.code !== 0) {
      for (let [v, F] of p)
        try {
          await rename(F, v);
        } catch (error) {
          try {
            (await restoreBinaryAtomically(F, v),
              logForDebugging(`Restored ${v} by copy after rename failed: ${error}`),
              await unlink(F).catch((S) =>
                logForDebugging(`Failed to remove ${F} after copy-restore: ${S}`),
              ));
          } catch (error_2) {
            let h = await locatePreservedCopy(n, F),
              P;
            if (h !== null && h !== F)
              try {
                (await restoreBinaryAtomically(h, v),
                  ae++,
                  logForDebugging(
                    `Restored ${v} from retired-dir copy ${h} after rename (${error}) and copy (${error_2}) both failed`,
                  ));
                continue;
              } catch (error) {
                ((P = error), logForDebugging(`Failed to restore ${v} from retired-dir copy ${h}: ${error}`));
              }
            let M = h === null ? lit("gone") : h === F ? lit("original_dir") : lit("retired_dir");
            if ((E++, Q.length === 0)) {
              let A = sanitizedErrCodeForTelemetry(error),
                O = sanitizedErrCodeForTelemetry(error_2),
                ce = P === void 0 ? void 0 : sanitizedErrCodeForTelemetry(P);
              logFeatureBad("update_apply", "update_apply_restore_failed", {
                ...(A && { rename_err_code: A }),
                ...(O && { copy_err_code: O }),
                ...(ce && { relocate_err_code: ce }),
                preserved_state: M,
              });
            }
            (Q.push({ originalPath: v, preservedPath: h }),
              logError(
                withTelemetryMessage(
                  new Le(
                    `Failed to restore ${v} after install failure: rename: ${error}; copy: ${error_2}; preserved copy: ${h ?? "not found"}`,
                  ),
                  `Failed to restore executable after install failure: rename=${sanitizeErrnoForTelemetry(error) ?? "unknown"} copy=${sanitizeErrnoForTelemetry(error_2) ?? "unknown"} relocate=${P === void 0 ? (h === null ? "not_found" : "skipped") : (sanitizeErrnoForTelemetry(P) ?? "unknown")}`,
                ),
              ));
          }
        }
      if (ae > 0 && E === 0) logFeatureOk("update_apply_heal", { heal_kind: lit("relocate") });
      let error = new Set(p.map(([v]) => v));
      n.updateRestoreFailure =
        Q[0] ??
        (n.updateRestoreFailure && !error.has(n.updateRestoreFailure.originalPath)
          ? n.updateRestoreFailure
          : null);
    }
    if (w.code !== 0) {
      let y = `${w.stdout} ${w.stderr}`,
        v = classifyNpmInstallError(y),
        F = p.length === 0 ? "not_attempted" : E === 0 ? "restored" : "partial";
      if (v === "warning_only") {
        let S = await verifyInstalledVersion(e);
        if (S.outcome === "landed")
          return (
            await saveGlobalConfig((current) => ({ ...current, installMethod: "global" }), r),
            (n.updateRestoreFailure = null),
            logFeatureSad("update_apply", "update_apply_npm_install_stderr_warning"),
            logForDebugging(
              `npm/bun exited ${w.code} with only warnings on stderr but the install-prefix re-probe confirms the install landed (now ${S.version}): ${y}`,
            ),
            { status: "success", probeDurationMs: S.durationMs }
          );
      }
      if (
        (logEvent("tengu_auto_updater_npm_failure", {
          npm_exit_code: w.code,
          package_manager: fromEnum(s),
          is_bundled_mode: isStandaloneExecutable(),
          platform: X4(getPlatform()),
          windows_self_rename: fromEnum(F),
          stderr_signature: fromEnum(v),
          npm_error_code: extractNpmErrorCode(y) ?? lit("none"),
        }),
        getPlatform() === "windows" &&
          /\b(?:claude|cli)\.exe\b/i.test(y) &&
          (/\bEBUSY\b|resource busy or locked/i.test(y) ||
            (/\bEPERM\b|operation not permitted/i.test(y) &&
              (p.length > 0 || /\b(?:rename|copyfile|unlink)\b[^\r\n]*\b(?:claude|cli)\.exe\b/i.test(y)))))
      )
        return (
          logFeatureBad("update_apply", "update_apply_exe_locked"),
          logForDebugging(`Failed to install new version of claude (running executable is locked): ${y}`, {
            level: "error",
          }),
          { status: "install_failed", failureHint: "windows_running_exe_lock" }
        );
      if (/\b(EACCES|EPERM|permission denied)\b/i.test(y))
        return (
          logFeatureBad("update_apply", "update_apply_no_permissions"),
          logForDebugging("Insufficient permissions for global npm install.", { level: "error" }),
          { status: "no_permissions" }
        );
      if (v === "native_package_missing")
        return (
          logFeatureBad("update_apply", "update_apply_native_binary_missing"),
          logForDebugging(
            `Failed to install new version of claude (platform-native package missing; npm should have restored the previous version): ${y}`,
            { level: "error" },
          ),
          { status: "install_failed", failureHint: "native_binary_missing" }
        );
      if (v === "warning_only")
        return (
          logFeatureBad("update_apply", "update_apply_npm_install_stderr_warning"),
          logForDebugging(
            `npm/bun exited ${w.code} with only warnings on stderr but the re-probe did not confirm an advance: ${y}`,
            { level: "error" },
          ),
          { status: "install_failed" }
        );
      return (
        logFeatureBad("update_apply", "update_apply_npm_install_failed"),
        logForDebugging(`Failed to install new version of claude: ${y}`, { level: "error" }),
        { status: "install_failed" }
      );
    }
    let se = await verifyInstalledVersion(e);
    switch (se.outcome) {
      case "placeholder_stub": {
        let y =
          s === "npm"
            ? await execFileNoThrowWithCwd("npm", ["config", "get", "ignore-scripts"], {
                abortSignal: AbortSignal.timeout(1e4),
                cwd: homedir(),
                useToolMemoryCgroup: !1,
              })
            : null;
        if (y?.code === 0 && y.stdout.trim() === "true") {
          logForDebugging(
            `${s} exited 0 and the installed claude is the placeholder stub, but npm install scripts are disabled on purpose; trusting the exit code`,
          );
          break;
        }
        return (
          logFeatureBad("update_apply", "update_apply_native_binary_missing"),
          logForDebugging(
            `${s} exited 0 but the installed claude is still the placeholder stub: the platform-native package was not installed`,
            { level: "error" },
          ),
          { status: "install_failed", failureHint: "native_binary_missing" }
        );
      }
      case "inconclusive":
        logForDebugging(
          `${s} exited 0; the install-prefix --version probe was inconclusive, trusting the exit code`,
        );
        break;
      case "landed":
        break;
    }
    return (
      await saveGlobalConfig((y) => ({ ...y, installMethod: "global" }), r),
      (n.updateRestoreFailure = null),
      logFeatureOk("update_apply"),
      { status: "success", probeDurationMs: se.durationMs }
    );
  } finally {
    if (n.updateRestoreFailure !== null && n.updateRestoreFailure === updateRestoreFailure)
      await refreshRestoreFailure(n);
    await releaseLock(r);
  }
}
//@ chunk-6zvphrsz.js:30009-30271 fingerprint = removeClaudeAliasesFromShellConfigs (1)
async function removeClaudeAliasesFromShellConfigs() {
  let configMap = getShellConfigPaths();
  for (let [, r] of Object.entries(configMap))
    try {
      let lines = await readFileLinesOrNull(r);
      if (!lines) continue;
      let { filtered: filtered, hadAlias: hadAlias } = filterClaudeAliases(lines);
      if (hadAlias) (await writeFileLines(r, filtered), logForDebugging(`Removed claude alias from ${r}`));
    } catch (error) {
      logForDebugging(`Failed to remove alias from ${r}: ${error}`, { level: "error" });
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
  let r = /npm warn/i.test(e) || /unknown user config/i.test(e) || /npm notice/i.test(e),
    n = /npm err/i.test(e) || /\b(EACCES|EPERM|ETARGET)\b/i.test(e) || /code E/i.test(e);
  if (r && !n) return "warning_only";
  return "unknown";
}
//@ chunk-6zvphrsz.js:31249-31383 sole-consumer
function extractNpmErrorCode(e) {
  let r = /\bnpm (?:ERR!|error) code\s+([A-Z][A-Z0-9_]{1,29})(?![A-Za-z0-9_])/.exec(e)?.[1];
  return r === void 0 ? void 0 : fromSanitizer_SANITIZER_OUTPUT_ONLY(r);
}
//@ chunk-e6aww6q8.js:4149527-4149656 fingerprint = releaseLock (0.566)
async function releaseLock_2(e) {
  let n = await open_20(e, constants_21.O_RDONLY | ws);
  try {
    return await n.readFile({ encoding: "utf8" });
  } finally {
    await n.close();
  }
}
//@ chunk-s61vbvea.js:583010-583413 fingerprint = getNpmDistTags (0.347)
async function getNpmDistTags(e, n, r) {
  if (isEssentialTrafficOnly()) return !1;
  if (r !== void 0 && !regExp_11.test(r)) return !1;
  let s = n && !n.startsWith("-") && !/^[a-z][a-z0-9+.-]*:\/\//i.test(n) ? n : void 0,
    h = ["pr", "view", ...(s ? [s] : []), ...(r ? ["--repo", r] : []), "--json", "url"],
    { code: code, stdout: stdout } = await execFileNoThrow("gh", h, {
      timeout: 5000,
      preserveOutputOnError: !1,
      useCwd: !0,
    });
  if (code !== 0) return !1;
  let w = jsonParse(stdout)?.url;
  if (!w) return !1;
  let parsed = parsePrUrl_2(w);
  if (!parsed) return !1;
  return (await linkPrToSession(parsed, e), !0);
}

export {
  Ke,
  enforceMinimumVersion,
  resolveMaxVersionConfig,
  isForceDowngradeActive,
  shouldSkipVersion,
  releaseLock_2,
  checkGlobalInstallPermissions,
  Uun,
  getLatestVersion,
  getVersionSkipReason,
  installGlobalPackage,
  aet,
  updateApplyErrorKey,
  getNpmDistTags,
  isAutoUpdateCheckThrottled,
  getMaxVersion,
  getMaxVersionMessage,
  fetchGcsVersion,
  remainingStartupGraceMs,
  retryWithTimeout,
};
