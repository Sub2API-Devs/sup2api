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
import { j, Q, y, P, R, ce, Oo } from "../../vendor/react/cjs/react.production.js";
import { Re } from "../../runtime/bun-runtime.js";
import { Vy } from "../../vendor/semver/index.js";
import { Me } from "./design-system/ThemeProvider.js";
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
  aet,
  updateApplyErrorKey,
} from "../utils/autoUpdater.js";
import { y9 } from "../utils/updateChannel.js";
import { gt as gt_2 } from "../utils/semver.js";
import { logEvent } from "../services/analytics/index.js";
import { sanitizeVersion } from "../services/analytics/metadata.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import { removeInstalledSymlink } from "../utils/nativeInstaller/installer.js";
import { getCurrentInstallationTypeProbed } from "../utils/doctorDiagnostic.js";
import { recordUpdateResult } from "../utils/nativeInstaller/updateResult.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logError } from "../utils/log.js";
import { useInterval } from "../ink/components/Input.js";
import { r, e, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { StatusIcon } from "./design-system/StatusIcon.js";

//@ chunk-tzghj6zv.js:21690-21694 placement
j();
//@ chunk-tzghj6zv.js:21694-21698 placement
j();
//@ chunk-tzghj6zv.js:21745-21749 placement
j();
//@ chunk-tzghj6zv.js:21749-21767 placement
var bt = Re(Vy(), 1);
/**
 * 宽松解析版本，只保留 major.minor.patch。
 */
//@ chunk-tzghj6zv.js:21767-21868 placement
function toMajorMinorPatch(d) {
  return `${bt.major(d, { loose: !0 })}.${bt.minor(d, { loose: !0 })}.${bt.patch(d, { loose: !0 })}`;
}
/**
 * 给定版本与当前版本（只比 major.minor.patch）不同时返回规范化版本，否则 null。
 */
//@ chunk-tzghj6zv.js:21868-22448 placement
function useChangedVersion(
  d,
  h = {
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
  return Q(() => {
    if (!d) return null;
    let x = toMajorMinorPatch(d);
    return x === toMajorMinorPatch(h) ? null : x;
  }, [d, h]);
}
//@ chunk-tzghj6zv.js:22448-22457 layout
var On = 2;
/**
 * JS 安装的自动更新：间隔检查最新版本，跳过无权限或 claude.exe 被锁的情况，执行全局安装并显示结果。
 */
//@ chunk-tzghj6zv.js:22457-31073 fingerprint = AutoUpdater (0.576)
function AutoUpdater({
  isUpdating: isUpdating,
  onChangeIsUpdating: onChangeIsUpdating,
  showSuccessMessage: showSuccessMessage,
  verbose: verbose,
  withSeparator: withSeparator,
}) {
  let { storageV5: storageV5 } = Me(),
    autoUpdaterResult = useAppState((te) => te.autoUpdaterResult),
    I = useSetAppState(),
    [V, Y] = y({}),
    [N, B] = y(!1),
    isUpdatingRef = useChangedVersion(autoUpdaterResult?.version);
  P(() => {
    localInstallationExists().then(B);
  }, []);
  let oe = R(isUpdating),
    ne = R(autoUpdaterResult?.status),
    z = R(autoUpdaterResult?.consecutiveExeLockFailures ?? 0);
  P(() => {
    ((oe.current = isUpdating),
      (ne.current = autoUpdaterResult?.status),
      (z.current = autoUpdaterResult?.consecutiveExeLockFailures ?? 0));
  });
  let we = ce(async () => {
      if (oe.current) return;
      if (ne.current === "no_permissions") {
        logForDebugging("AutoUpdater: Skipping update check (no_permissions persists this session)");
        return;
      }
      if (z.current >= On) {
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
        }.VERSION,
        ae = y9(),
        latestVersion = await getLatestVersion(ae),
        { maxVersion: maxVersion, forceDowngradeEnabled: forceDowngradeEnabled } =
          await resolveMaxVersionConfig(),
        H = null,
        D = !1;
      if (forceDowngradeEnabled && maxVersion) {
        if (((D = isForceDowngradeActive(currentVersion, maxVersion, "auto_updater")), D)) H = maxVersion;
      }
      if (!H && latestVersion) {
        if (maxVersion && gt_2(latestVersion, maxVersion))
          if (
            (logForDebugging(
              `AutoUpdater: maxVersion ${maxVersion} is set, capping update from ${latestVersion} to ${maxVersion}`,
            ),
            gt_2(maxVersion, currentVersion))
          )
            H = maxVersion;
          else
            logForDebugging(
              `AutoUpdater: current version ${currentVersion} is already at or above maxVersion ${maxVersion}, skipping update`,
            );
        else if (gt_2(latestVersion, currentVersion)) H = latestVersion;
      }
      if ((Y({ global: currentVersion, latest: H ?? latestVersion }), !H || shouldSkipVersion(H))) return;
      if (D)
        logEvent("tengu_auto_updater_forced_downgrade", {
          from_version: sanitizeVersion(currentVersion),
          to_version: sanitizeVersion(H),
        });
      let startTime = Date.now();
      onChangeIsUpdating(!0);
      let config = getGlobalConfig();
      if (config.installMethod !== "native" && !isEnvTruthy(process.env.DISABLE_INSTALLATION_CHECKS))
        await removeInstalledSymlink();
      let installationType = await getCurrentInstallationTypeProbed();
      if (
        (logForDebugging(`AutoUpdater: Detected installation type: ${installationType}`),
        installationType === "development")
      ) {
        (logForDebugging("AutoUpdater: Cannot auto-update development build"), onChangeIsUpdating(!1));
        return;
      }
      let se, le, Ce;
      if (installationType === "npm-local")
        (logForDebugging("AutoUpdater: Using local update method"),
          (le = "local"),
          (se = await installOrUpdateClaudePackage(ae, H, storageV5)));
      else if (installationType === "npm-global")
        (logForDebugging("AutoUpdater: Using global update method"),
          (le = "global"),
          (Ce = await installGlobalPackage(H, storageV5)),
          (se = Ce.status));
      else if (installationType === "native") {
        (logForDebugging("AutoUpdater: Unexpected native installation in non-native updater"),
          onChangeIsUpdating(!1));
        return;
      } else {
        logForDebugging("AutoUpdater: Unknown installation type, falling back to config");
        let isMigrated = config.installMethod === "local";
        if (((le = isMigrated ? "local" : "global"), isMigrated))
          se = await installOrUpdateClaudePackage(ae, H, storageV5);
        else ((Ce = await installGlobalPackage(H, storageV5)), (se = Ce.status));
      }
      onChangeIsUpdating(!1);
      let de = Ce?.failureHint;
      if (se !== "in_progress")
        recordUpdateResult(
          {
            timestamp: new Date().toISOString(),
            path: le === "local" ? "npm-local" : "npm-global",
            outcome: se === "success" ? "success" : "failed",
            status: se,
            version_from: currentVersion,
            version_to: H,
            error_code:
              se === "install_failed" && aet() ? "update_apply_restore_failed" : updateApplyErrorKey(de),
          },
          storageV5,
        );
      if (se === "success") {
        let _e = Ce?.probeDurationMs ?? 0;
        logEvent("tengu_auto_updater_success", {
          fromVersion: sanitizeVersion(currentVersion),
          toVersion: sanitizeVersion(H),
          durationMs: Date.now() - startTime - _e,
          probeDurationMs: _e,
          wasMigrated: le === "local",
          installationType: fromEnum(installationType),
        });
      } else if (se !== "in_progress") {
        let _e = se;
        logEvent("tengu_auto_updater_fail", {
          fromVersion: sanitizeVersion(currentVersion),
          attemptedVersion: sanitizeVersion(H),
          status: fromEnum(_e),
          durationMs: Date.now() - startTime,
          wasMigrated: le === "local",
          installationType: fromEnum(installationType),
        });
      }
      I((_e) => {
        let autoUpdaterResult = _e.autoUpdaterResult,
          Ge = autoUpdaterResult?.consecutiveExeLockFailures ?? 0,
          _ = se === "in_progress" ? Ge : de === "windows_running_exe_lock" ? Ge + 1 : 0;
        if (
          autoUpdaterResult?.version === H &&
          autoUpdaterResult?.status === se &&
          autoUpdaterResult?.failureHint === de &&
          (autoUpdaterResult?.consecutiveExeLockFailures ?? 0) === _
        )
          return _e;
        return {
          ..._e,
          autoUpdaterResult: { version: H, status: se, failureHint: de, consecutiveExeLockFailures: _ },
        };
      });
    }, [I, storageV5]),
    Te = Oo((te) => {
      (onChangeIsUpdating(!1), logError(te));
    });
  if (
    (P(() => {
      we().catch(Te);
    }, [we]),
    useInterval(() => void we().catch(Te), 1800000),
    !autoUpdaterResult?.version && (!V.global || !V.latest))
  )
    return null;
  if (!autoUpdaterResult?.version && !isUpdating) return null;
  let L = autoUpdaterResult?.status === "install_failed" ? aet() : null,
    ee = null;
  switch (autoUpdaterResult?.failureHint) {
    case "windows_running_exe_lock":
      ee = "claude.exe in use (close other Claude Code sessions, including VS Code)";
      break;
    case "native_binary_missing":
      ee = "native binary for this platform was not downloaded (will retry)";
      break;
    case "registry_session_refused":
    case void 0:
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
  return r(Box, {
    flexDirection: "row",
    gap: 1,
    children: [
      withSeparator === void 0 ? null : e(Text, { dimColor: !0, children: withSeparator ? " \xB7" : "" }),
      verbose &&
        r(Text, {
          dimColor: !0,
          wrap: "truncate",
          children: ["globalVersion: ", V.global, " \xB7 latestVersion:", " ", V.latest],
        }),
      isUpdating
        ? e(Fragment, {
            children: e(Box, {
              children: e(Text, {
                color: "text",
                dimColor: !0,
                wrap: "truncate",
                children: "Auto-updating\u2026",
              }),
            }),
          })
        : autoUpdaterResult?.status === "success" &&
          showSuccessMessage &&
          isUpdatingRef &&
          r(Text, {
            color: "success",
            wrap: "truncate",
            children: [
              e(StatusIcon, { status: "success", withSpace: !0 }),
              "Update installed \xB7 Restart to apply",
            ],
          }),
      autoUpdaterResult?.status === "no_permissions" &&
        r(Text, {
          color: "error",
          wrap: "truncate",
          children: [
            e(StatusIcon, { status: "error", withSpace: !0 }),
            "Auto-update failed: no write permission to npm prefix \xB7 Run",
            " ",
            e(Text, { bold: !0, children: "claude doctor" }),
          ],
        }),
      autoUpdaterResult?.status === "install_failed" &&
        (L
          ? L.preservedPath
            ? r(Box, {
                flexDirection: "column",
                children: [
                  r(Text, {
                    color: "error",
                    wrap: "truncate",
                    children: [
                      e(StatusIcon, { status: "error", withSpace: !0 }),
                      "Update failed and ",
                      basename(L.originalPath),
                      " could not be restored \u2014 it was preserved at:",
                    ],
                  }),
                  dirname(L.preservedPath) === dirname(L.originalPath)
                    ? r(Text, {
                        color: "error",
                        wrap: "truncate",
                        children: [
                          L.preservedPath,
                          " \xB7 rename it back to",
                          " ",
                          basename(L.originalPath),
                          " or run",
                          " ",
                          r(Text, {
                            bold: !0,
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
                    : r(Text, {
                        color: "error",
                        wrap: "truncate",
                        children: [
                          L.preservedPath,
                          " \xB7 reinstall with",
                          " ",
                          r(Text, {
                            bold: !0,
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
            : r(Text, {
                color: "error",
                wrap: "truncate",
                children: [
                  e(StatusIcon, { status: "error", withSpace: !0 }),
                  "Update failed and ",
                  basename(L.originalPath),
                  " could not be restored (no preserved copy found) \xB7 reinstall with",
                  " ",
                  r(Text, {
                    bold: !0,
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
          : ee
            ? r(Text, {
                color: "error",
                wrap: "truncate",
                children: [
                  e(StatusIcon, { status: "error", withSpace: !0 }),
                  "Auto-update failed: ",
                  ee,
                  " \xB7 Run",
                  " ",
                  e(Text, { bold: !0, children: "claude doctor" }),
                ],
              })
            : r(Text, {
                color: "error",
                wrap: "truncate",
                children: [
                  e(StatusIcon, { status: "error", withSpace: !0 }),
                  "Auto-update failed \xB7 Try ",
                  e(Text, { bold: !0, children: "claude doctor" }),
                  " or",
                  " ",
                  e(Text, {
                    bold: !0,
                    children: N
                      ? `cd ~/.claude/local && npm update ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.PACKAGE_URL}`
                      : `npm i -g ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.PACKAGE_URL}`,
                  }),
                ],
              })),
    ],
  });
}

export { useChangedVersion, AutoUpdater };
