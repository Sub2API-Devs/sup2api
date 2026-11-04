/**
 * components/AutoUpdater.tsx
 *
 * npm/JS 安装方式的自动更新器：定期检查最新版本、无权限/文件被锁时跳过、安装并提示重启。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/AutoUpdater.tsx
 * pieces: chunk-tzghj6zv.js (8)
 * attribution: placement 6, layout 1, fingerprint 1
 */
import { basename, dirname } from "path";
import {
  init_react_production,
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
  useEffectEvent,
} from "../../vendor/react/cjs/react.production.js";
import { __toESM } from "../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../vendor/semver/index.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { useAppState, useSetAppState } from "../state/AppState.js";
import { localInstallationExists, installOrUpdateClaudePackage } from "../utils/localInstaller.js";
import { logForDebugging } from "../utils/debug.js";
import { isAutoUpdaterDisabled, getGlobalConfig } from "../utils/config.js";
import {
  isAutoUpdateCheckThrottled,
  getLatestVersion,
  resolveMaxVersionConfig,
  isForceDowngradeActive,
  shouldSkipVersion,
  installGlobalPackage,
  getUpdateRestoreFailure,
  updateApplyErrorKey,
} from "../utils/autoUpdater.js";
import { autoUpdatesChannel } from "../utils/updateChannel.js";
import { semverGte } from "../utils/semver.js";
import { logEvent } from "../services/analytics/index.js";
import { sanitizeVersion } from "../services/analytics/metadata.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import { removeInstalledSymlink } from "../utils/nativeInstaller/installer.js";
import { getCurrentInstallationTypeProbed } from "../utils/doctorDiagnostic.js";
import { recordUpdateResult } from "../utils/nativeInstaller/updateResult.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logError } from "../utils/log.js";
import { useInterval } from "../ink/components/Input.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { StatusIcon } from "./design-system/StatusIcon.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-tzghj6zv.js:21690-21694 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tzghj6zv.js:21690", () => {
  init_react_production();
});
//@ chunk-tzghj6zv.js:21694-21698 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tzghj6zv.js:21694", () => {
  init_react_production();
});
//@ chunk-tzghj6zv.js:21745-21749 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tzghj6zv.js:21745", () => {
  init_react_production();
});
//@ chunk-tzghj6zv.js:21749-21767 placement
var installedVersionSemver_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tzghj6zv.js:21749", () => {
  installedVersionSemver_2 = __toESM(require_semver_3(), 1);
});
//@ chunk-tzghj6zv.js:21767-21868 placement
/**
 * 宽松解析版本，只保留 major.minor.patch。
 */
function toMajorMinorPatch(version) {
  return `${installedVersionSemver_2.major(version, {
    loose: true,
  })}.${installedVersionSemver_2.minor(version, {
    loose: true,
  })}.${installedVersionSemver_2.patch(version, {
    loose: true,
  })}`;
}
//@ chunk-tzghj6zv.js:21868-22448 placement
/**
 * 给定版本与当前版本（只比 major.minor.patch）不同时返回规范化版本，否则 null。
 */
function useChangedVersion(
  version,
  currentVersion = {
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
) {
  return useMemo(() => {
    if (!version) return null;
    let majorMinorPatch = toMajorMinorPatch(version);
    return majorMinorPatch === toMajorMinorPatch(currentVersion) ? null : majorMinorPatch;
  }, [version, currentVersion]);
}
//@ chunk-tzghj6zv.js:22448-22457 layout
var MAX_UPDATE_RESTARTS = 2;
//@ chunk-tzghj6zv.js:22457-31073 fingerprint = AutoUpdater (0.576)
/**
 * JS 安装的自动更新：间隔检查最新版本，跳过无权限或 claude.exe 被锁的情况，执行全局安装并显示结果。
 */
function AutoUpdater({ isUpdating, onChangeIsUpdating, showSuccessMessage, verbose, withSeparator }) {
  let { storageV5 } = useTheme_2();
  let autoUpdaterResult = useAppState((appState) => appState.autoUpdaterResult);
  let setAppState = useSetAppState();
  let [versions, setVersions] = useState({});
  let [hasLocalInstall, setHasLocalInstall] = useState(false);
  let isUpdatingRef = useChangedVersion(autoUpdaterResult?.version);
  useEffect(() => {
    localInstallationExists().then(setHasLocalInstall);
  }, []);
  let isUpdatingRef_2 = useRef(isUpdating);
  let statusRef = useRef(autoUpdaterResult?.status);
  let consecutiveExeLockFailuresRef = useRef(autoUpdaterResult?.consecutiveExeLockFailures ?? 0);
  useEffect(() => {
    isUpdatingRef_2.current = isUpdating;
    statusRef.current = autoUpdaterResult?.status;
    consecutiveExeLockFailuresRef.current = autoUpdaterResult?.consecutiveExeLockFailures ?? 0;
  });
  let checkForUpdates = useCallback(async () => {
    if (isUpdatingRef_2.current) return;
    if (statusRef.current === "no_permissions") {
      logForDebugging("AutoUpdater: Skipping update check (no_permissions persists this session)");
      return;
    }
    if (consecutiveExeLockFailuresRef.current >= MAX_UPDATE_RESTARTS) {
      logForDebugging(
        "AutoUpdater: Skipping update check (claude.exe locked by another process; damped for this session)",
      );
      return;
    }
    if (isAutoUpdaterDisabled()) return;
    if (isAutoUpdateCheckThrottled()) return;
    let currentVersion = {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION;
    let channel = autoUpdatesChannel();
    let latestVersion = await getLatestVersion(channel);
    let { maxVersion, forceDowngradeEnabled } = await resolveMaxVersionConfig();
    let targetVersion = null;
    let isForcedDowngrade = false;
    if (forceDowngradeEnabled && maxVersion) {
      isForcedDowngrade = isForceDowngradeActive(currentVersion, maxVersion, "auto_updater");
      if (isForcedDowngrade) targetVersion = maxVersion;
    }
    if (!targetVersion && latestVersion) {
      if (maxVersion && semverGte(latestVersion, maxVersion)) {
        logForDebugging(
          `AutoUpdater: maxVersion ${maxVersion} is set, capping update from ${latestVersion} to ${maxVersion}`,
        );
        if (semverGte(maxVersion, currentVersion)) targetVersion = maxVersion;
        else
          logForDebugging(
            `AutoUpdater: current version ${currentVersion} is already at or above maxVersion ${maxVersion}, skipping update`,
          );
      } else if (semverGte(latestVersion, currentVersion)) targetVersion = latestVersion;
    }
    setVersions({
      global: currentVersion,
      latest: targetVersion ?? latestVersion,
    });
    if (!targetVersion || shouldSkipVersion(targetVersion)) return;
    if (isForcedDowngrade)
      logEvent("tengu_auto_updater_forced_downgrade", {
        from_version: sanitizeVersion(currentVersion),
        to_version: sanitizeVersion(targetVersion),
      });
    let startTime = Date.now();
    onChangeIsUpdating(true);
    let config = getGlobalConfig();
    if (config.installMethod !== "native" && !isEnvTruthy(process.env.DISABLE_INSTALLATION_CHECKS))
      await removeInstalledSymlink();
    let installationType = await getCurrentInstallationTypeProbed();
    logForDebugging(`AutoUpdater: Detected installation type: ${installationType}`);
    if (installationType === "development") {
      logForDebugging("AutoUpdater: Cannot auto-update development build");
      onChangeIsUpdating(false);
      return;
    }
    let updateStatus;
    let installScope;
    let globalInstallResult;
    if (installationType === "npm-local") {
      logForDebugging("AutoUpdater: Using local update method");
      installScope = "local";
      updateStatus = await installOrUpdateClaudePackage(channel, targetVersion, storageV5);
    } else if (installationType === "npm-global") {
      logForDebugging("AutoUpdater: Using global update method");
      installScope = "global";
      globalInstallResult = await installGlobalPackage(targetVersion, storageV5);
      updateStatus = globalInstallResult.status;
    } else if (installationType === "native") {
      logForDebugging("AutoUpdater: Unexpected native installation in non-native updater");
      onChangeIsUpdating(false);
      return;
    } else {
      logForDebugging("AutoUpdater: Unknown installation type, falling back to config");
      let isMigrated = config.installMethod === "local";
      installScope = isMigrated ? "local" : "global";
      if (isMigrated) updateStatus = await installOrUpdateClaudePackage(channel, targetVersion, storageV5);
      else {
        globalInstallResult = await installGlobalPackage(targetVersion, storageV5);
        updateStatus = globalInstallResult.status;
      }
    }
    onChangeIsUpdating(false);
    let failureHint = globalInstallResult?.failureHint;
    if (updateStatus !== "in_progress")
      recordUpdateResult(
        {
          timestamp: new Date().toISOString(),
          path: installScope === "local" ? "npm-local" : "npm-global",
          outcome: updateStatus === "success" ? "success" : "failed",
          status: updateStatus,
          version_from: currentVersion,
          version_to: targetVersion,
          error_code:
            updateStatus === "install_failed" && getUpdateRestoreFailure()
              ? "update_apply_restore_failed"
              : updateApplyErrorKey(failureHint),
        },
        storageV5,
      );
    if (updateStatus === "success") {
      let probeDurationMs = globalInstallResult?.probeDurationMs ?? 0;
      logEvent("tengu_auto_updater_success", {
        fromVersion: sanitizeVersion(currentVersion),
        toVersion: sanitizeVersion(targetVersion),
        durationMs: Date.now() - startTime - probeDurationMs,
        probeDurationMs,
        wasMigrated: installScope === "local",
        installationType: fromEnum(installationType),
      });
    } else if (updateStatus !== "in_progress") {
      let failureStatus = updateStatus;
      logEvent("tengu_auto_updater_fail", {
        fromVersion: sanitizeVersion(currentVersion),
        attemptedVersion: sanitizeVersion(targetVersion),
        status: fromEnum(failureStatus),
        durationMs: Date.now() - startTime,
        wasMigrated: installScope === "local",
        installationType: fromEnum(installationType),
      });
    }
    setAppState((state) => {
      let autoUpdaterResult = state.autoUpdaterResult;
      let consecutiveExeLockFailures = autoUpdaterResult?.consecutiveExeLockFailures ?? 0;
      let nextExeLockFailures =
        updateStatus === "in_progress"
          ? consecutiveExeLockFailures
          : failureHint === "windows_running_exe_lock"
            ? consecutiveExeLockFailures + 1
            : 0;
      if (
        autoUpdaterResult?.version === targetVersion &&
        autoUpdaterResult?.status === updateStatus &&
        autoUpdaterResult?.failureHint === failureHint &&
        (autoUpdaterResult?.consecutiveExeLockFailures ?? 0) === nextExeLockFailures
      )
        return state;
      return {
        ...state,
        autoUpdaterResult: {
          version: targetVersion,
          status: updateStatus,
          failureHint,
          consecutiveExeLockFailures: nextExeLockFailures,
        },
      };
    });
  }, [setAppState, storageV5]);
  let reportUpdateError = useEffectEvent((error) => {
    onChangeIsUpdating(false);
    logError(error);
  });
  useEffect(() => {
    checkForUpdates().catch(reportUpdateError);
  }, [checkForUpdates]);
  useInterval(() => void checkForUpdates().catch(reportUpdateError), 1800000);
  if (!autoUpdaterResult?.version && (!versions.global || !versions.latest)) return null;
  if (!autoUpdaterResult?.version && !isUpdating) return null;
  let restoreFailure = autoUpdaterResult?.status === "install_failed" ? getUpdateRestoreFailure() : null;
  let failureHintText = null;
  switch (autoUpdaterResult?.failureHint) {
    case "windows_running_exe_lock":
      failureHintText = "claude.exe in use (close other Claude Code sessions, including VS Code)";
      break;
    case "native_binary_missing":
      failureHintText = "native binary for this platform was not downloaded (will retry)";
      break;
    case "registry_session_refused":
    case undefined:
      break;
  }
  if (!(
    verbose ||
    isUpdating ||
    (autoUpdaterResult?.status === "success" && showSuccessMessage && !!isUpdatingRef) ||
    autoUpdaterResult?.status === "no_permissions" ||
    autoUpdaterResult?.status === "install_failed"
  ))
    return null;
  return jsxProd_default_2(Box, {
    flexDirection: "row",
    gap: 1,
    children: [
      withSeparator === undefined
        ? null
        : jsxProd_default(Text, {
            dimColor: true,
            children: withSeparator ? " \xB7" : "",
          }),
      verbose &&
        jsxProd_default_2(Text, {
          dimColor: true,
          wrap: "truncate",
          children: ["globalVersion: ", versions.global, " \xB7 latestVersion:", " ", versions.latest],
        }),
      isUpdating
        ? jsxProd_default(Fragment, {
            children: jsxProd_default(Box, {
              children: jsxProd_default(Text, {
                color: "text",
                dimColor: true,
                wrap: "truncate",
                children: "Auto-updating\u2026",
              }),
            }),
          })
        : autoUpdaterResult?.status === "success" &&
          showSuccessMessage &&
          isUpdatingRef &&
          jsxProd_default_2(Text, {
            color: "success",
            wrap: "truncate",
            children: [
              jsxProd_default(StatusIcon, {
                status: "success",
                withSpace: true,
              }),
              "Update installed \xB7 Restart to apply",
            ],
          }),
      autoUpdaterResult?.status === "no_permissions" &&
        jsxProd_default_2(Text, {
          color: "error",
          wrap: "truncate",
          children: [
            jsxProd_default(StatusIcon, {
              status: "error",
              withSpace: true,
            }),
            "Auto-update failed: no write permission to npm prefix \xB7 Run",
            " ",
            jsxProd_default(Text, {
              bold: true,
              children: "claude doctor",
            }),
          ],
        }),
      autoUpdaterResult?.status === "install_failed" &&
        (restoreFailure
          ? restoreFailure.preservedPath
            ? jsxProd_default_2(Box, {
                flexDirection: "column",
                children: [
                  jsxProd_default_2(Text, {
                    color: "error",
                    wrap: "truncate",
                    children: [
                      jsxProd_default(StatusIcon, {
                        status: "error",
                        withSpace: true,
                      }),
                      "Update failed and ",
                      basename(restoreFailure.originalPath),
                      " could not be restored \u2014 it was preserved at:",
                    ],
                  }),
                  dirname(restoreFailure.preservedPath) === dirname(restoreFailure.originalPath)
                    ? jsxProd_default_2(Text, {
                        color: "error",
                        wrap: "truncate",
                        children: [
                          restoreFailure.preservedPath,
                          " \xB7 rename it back to",
                          " ",
                          basename(restoreFailure.originalPath),
                          " or run",
                          " ",
                          jsxProd_default_2(Text, {
                            bold: true,
                            children: [
                              "npm i -g ",
                              {
                                ISSUES_EXPLAINER:
                                  "report the issue at https://github.com/anthropics/claude-code/issues",
                                PACKAGE_URL: "@anthropic-ai/claude-code",
                                README_URL: "https://code.claude.com/docs/en/overview",
                                VERSION: "2.1.316",
                                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                                BUILD_TIME: "2026-10-30T23:28:13Z",
                                GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                                HOOKS_WORKER_URL:
                                  import.meta.dir +
                                  "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                                DD_SOURCEMAP_GROUP: "default",
                              }.PACKAGE_URL,
                            ],
                          }),
                        ],
                      })
                    : jsxProd_default_2(Text, {
                        color: "error",
                        wrap: "truncate",
                        children: [
                          restoreFailure.preservedPath,
                          " \xB7 reinstall with",
                          " ",
                          jsxProd_default_2(Text, {
                            bold: true,
                            children: [
                              "npm i -g ",
                              {
                                ISSUES_EXPLAINER:
                                  "report the issue at https://github.com/anthropics/claude-code/issues",
                                PACKAGE_URL: "@anthropic-ai/claude-code",
                                README_URL: "https://code.claude.com/docs/en/overview",
                                VERSION: "2.1.316",
                                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                                BUILD_TIME: "2026-10-30T23:28:13Z",
                                GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                                HOOKS_WORKER_URL:
                                  import.meta.dir +
                                  "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                                DD_SOURCEMAP_GROUP: "default",
                              }.PACKAGE_URL,
                            ],
                          }),
                        ],
                      }),
                ],
              })
            : jsxProd_default_2(Text, {
                color: "error",
                wrap: "truncate",
                children: [
                  jsxProd_default(StatusIcon, {
                    status: "error",
                    withSpace: true,
                  }),
                  "Update failed and ",
                  basename(restoreFailure.originalPath),
                  " could not be restored (no preserved copy found) \xB7 reinstall with",
                  " ",
                  jsxProd_default_2(Text, {
                    bold: true,
                    children: [
                      "npm i -g ",
                      {
                        ISSUES_EXPLAINER:
                          "report the issue at https://github.com/anthropics/claude-code/issues",
                        PACKAGE_URL: "@anthropic-ai/claude-code",
                        README_URL: "https://code.claude.com/docs/en/overview",
                        VERSION: "2.1.316",
                        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                        BUILD_TIME: "2026-10-30T23:28:13Z",
                        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                        HOOKS_WORKER_URL:
                          import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                        DD_SOURCEMAP_GROUP: "default",
                      }.PACKAGE_URL,
                    ],
                  }),
                ],
              })
          : failureHintText
            ? jsxProd_default_2(Text, {
                color: "error",
                wrap: "truncate",
                children: [
                  jsxProd_default(StatusIcon, {
                    status: "error",
                    withSpace: true,
                  }),
                  "Auto-update failed: ",
                  failureHintText,
                  " \xB7 Run",
                  " ",
                  jsxProd_default(Text, {
                    bold: true,
                    children: "claude doctor",
                  }),
                ],
              })
            : jsxProd_default_2(Text, {
                color: "error",
                wrap: "truncate",
                children: [
                  jsxProd_default(StatusIcon, {
                    status: "error",
                    withSpace: true,
                  }),
                  "Auto-update failed \xB7 Try ",
                  jsxProd_default(Text, {
                    bold: true,
                    children: "claude doctor",
                  }),
                  " or",
                  " ",
                  jsxProd_default(Text, {
                    bold: true,
                    children: hasLocalInstall
                      ? `cd ~/.claude/local && npm update ${
                          {
                            ISSUES_EXPLAINER:
                              "report the issue at https://github.com/anthropics/claude-code/issues",
                            PACKAGE_URL: "@anthropic-ai/claude-code",
                            README_URL: "https://code.claude.com/docs/en/overview",
                            VERSION: "2.1.316",
                            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                            BUILD_TIME: "2026-10-30T23:28:13Z",
                            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                            HOOKS_WORKER_URL:
                              import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                            DD_SOURCEMAP_GROUP: "default",
                          }.PACKAGE_URL
                        }`
                      : `npm i -g ${
                          {
                            ISSUES_EXPLAINER:
                              "report the issue at https://github.com/anthropics/claude-code/issues",
                            PACKAGE_URL: "@anthropic-ai/claude-code",
                            README_URL: "https://code.claude.com/docs/en/overview",
                            VERSION: "2.1.316",
                            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                            BUILD_TIME: "2026-10-30T23:28:13Z",
                            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                            HOOKS_WORKER_URL:
                              import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                            DD_SOURCEMAP_GROUP: "default",
                          }.PACKAGE_URL
                        }`,
                  }),
                ],
              })),
    ],
  });
}
export { useChangedVersion, AutoUpdater };
