/**
 * components/NativeAutoUpdater.tsx
 *
 * 原生安装的自动更新器：下载、签名/校验和验证、错误分类与 /restart 提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/NativeAutoUpdater.tsx
 * pieces: chunk-tzghj6zv.js (8)
 * attribution: placement 1, fingerprint 2, layout 5
 */
import {
  init_react_production,
  useState,
  useEffectEvent,
  useEffect,
} from "../../vendor/react/cjs/react.production.js";
import {
  ManifestSignatureError,
  StallTimeoutError,
  ReleaseManifestError,
} from "../utils/nativeInstaller/download.js";
import { StagedBinaryChecksumError, installLatest } from "../utils/nativeInstaller/installer.js";
import { getErrnoCode, sanitizeErrnoForTelemetry } from "../utils/errors.js";
import { isRunningFromVersionsDir_2 } from "../utils/deepLink/registerProtocol.js";
import { getReplBridgeHandle } from "../bridge/replBridgeHandle.js";
import { restartVersionTarget, resetInstalledVersionCache } from "../commands/restart/versionTargets.js";
import { canRestartCommandRun } from "../commands/restart/index.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { renderWithForceUpdate } from "../hooks/useForceRender.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { useAppState, useSetAppState } from "../state/AppState.js";
import { useChangedVersion } from "./AutoUpdater.js";
import { autoUpdatesChannel } from "../utils/updateChannel.js";
import { isAutoUpdaterDisabled } from "../utils/config.js";
import {
  getMaxVersion,
  getMaxVersionMessage,
  isAutoUpdateCheckThrottled,
  updateApplyErrorKey,
} from "../utils/autoUpdater.js";
import { semverGte } from "../utils/semver.js";
import { logEvent } from "../services/analytics/index.js";
import { recordUpdateResult } from "../utils/nativeInstaller/updateResult.js";
import { logForDebugging } from "../utils/debug.js";
import { lit } from "../services/analytics/safeMetadata.js";
import { useInterval } from "../ink/components/Input.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { StatusIcon } from "./design-system/StatusIcon.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-tzghj6zv.js:31073-31077 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tzghj6zv.js:31073", () => {
  init_react_production();
});
//@ chunk-tzghj6zv.js:31077-32357 fingerprint (2.1.88 match: getErrorType, 0.508)
/**
 * 把更新错误分类（signature_verification、checksum_mismatch、超时、网络等）。
 */
function getErrorType(errorMessage) {
  if (errorMessage instanceof ManifestSignatureError) return "signature_verification";
  if (errorMessage instanceof StagedBinaryChecksumError) return "checksum_mismatch";
  let message = errorMessage instanceof Error ? errorMessage.message : String(errorMessage);
  let errnoCode = getErrnoCode(errorMessage);
  if (
    errorMessage instanceof StallTimeoutError ||
    errnoCode === "ETIMEDOUT" ||
    errnoCode === "ECONNABORTED" ||
    message.includes("Download timed out") ||
    message.includes("timeout")
  )
    return "timeout";
  if (message.includes("Checksum mismatch")) return "checksum_mismatch";
  if (message.includes("ENOENT") || message.includes("not found")) return "not_found";
  if (message.includes("EACCES") || message.includes("permission")) return "permission_denied";
  if (message.includes("ENOSPC")) return "disk_full";
  if (message.includes("npm")) return "npm_error";
  if (message.includes("network") || message.includes("ECONNREFUSED") || message.includes("ENOTFOUND"))
    return "network_error";
  let lower = message.toLowerCase();
  if (
    message.includes("ENOEXEC") ||
    lower.includes("exec format error") ||
    lower.includes("bad cpu type") ||
    lower.includes("cannot execute binary") ||
    lower.includes("code signature") ||
    lower.includes("gatekeeper") ||
    lower.includes("killed: 9")
  )
    return "exec_format";
  if (
    lower.includes("virus") ||
    lower.includes("quarantine") ||
    lower.includes("defender") ||
    lower.includes("operation did not complete successfully because the file contains")
  )
    return "av_quarantine";
  if (
    message.includes("EXDEV") ||
    message.includes("EEXIST") ||
    message.includes("EBUSY") ||
    lower.includes("rename") ||
    lower.includes("move failed") ||
    lower.includes("cross-device")
  )
    return "swap_failure";
  return "unknown";
}
//@ chunk-tzghj6zv.js:32357-32566 layout
function getAutoUpdaterResultEvent(result) {
  if (result.wasUpdated) return "tengu_native_auto_updater_success";
  if (result.skippedUnverifiedRelease) return "tengu_native_auto_updater_skipped_unverified_release";
  return "tengu_native_auto_updater_up_to_date";
}
//@ chunk-tzghj6zv.js:32566-32643 layout
function shouldOfferNativeUpdate() {
  return (
    isRunningFromVersionsDir_2() &&
    !getReplBridgeHandle()?.bridgeSessionId &&
    "version" in restartVersionTarget() &&
    canRestartCommandRun()
  );
}
//@ chunk-tzghj6zv.js:32643-32756 layout
function getRestartToApplyText() {
  let offer = getFeatureValue_CACHED_MAY_BE_STALE("tengu_fancy_wand_copy", {}).offer;
  return typeof offer === "string" && offer !== "" ? offer : "/restart to apply";
}
//@ chunk-tzghj6zv.js:32756-32807 layout
function updateButtonLabel() {
  return shouldOfferNativeUpdate() ? getRestartToApplyText() : "Restart to update";
}
//@ chunk-tzghj6zv.js:32807-32835 layout
function measureUpdateLabel() {
  return renderWithForceUpdate(updateButtonLabel);
}
//@ chunk-tzghj6zv.js:32835-37733 fingerprint (2.1.88 match: NativeAutoUpdater, 0.553)
/**
 * 原生安装的自动更新：下载新版本、验证签名与校验和、失败按类型（超时/校验失败/网络）记录，成功提示 /restart。
 */
function NativeAutoUpdater({
  isUpdating,
  onChangeIsUpdating,
  showSuccessMessage,
  verbose,
  withSeparator,
  atPrompt,
}) {
  let { storageV5 } = useTheme_2();
  let autoUpdaterResult = useAppState((state) => state.autoUpdaterResult);
  let setAppState = useSetAppState();
  let [versions, setVersions] = useState({
    current: {
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
  });
  let [maxVersionIssue, setMaxVersionIssue] = useState(null);
  let isUpdatingRef = useChangedVersion(autoUpdaterResult?.version);
  let channelOrVersion = autoUpdatesChannel();
  async function upgrade() {
    if (isUpdating) return;
    if (autoUpdaterResult?.status === "success") return;
    if (isAutoUpdaterDisabled()) return;
    let maxVersion = await getMaxVersion();
    if (
      maxVersion &&
      semverGte(
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
      let msg = await getMaxVersionMessage();
      setMaxVersionIssue(msg ?? "affects your version");
    }
    if (isAutoUpdateCheckThrottled()) return;
    onChangeIsUpdating(true);
    let now = Date.now();
    logEvent("tengu_native_auto_updater_start", {});
    try {
      let installResult = await installLatest(channelOrVersion, false, storageV5);
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
      let latencyMs = Date.now() - now;
      if (installResult.lockFailed) {
        logEvent("tengu_native_auto_updater_lock_contention", {
          latency_ms: latencyMs,
        });
        return;
      }
      setVersions({
        current: currentVersion,
        latest: installResult.latestVersion,
      });
      logEvent(getAutoUpdaterResultEvent(installResult), {
        latency_ms: latencyMs,
      });
      if (installResult.wasUpdated) {
        resetInstalledVersionCache();
        recordUpdateResult(
          {
            timestamp: new Date().toISOString(),
            path: "native",
            outcome: "success",
            status: "success",
            version_from: currentVersion,
            version_to: installResult.latestVersion ?? null,
            error_code: null,
          },
          storageV5,
        );
        setAppState((state) => {
          let autoUpdaterResult = state.autoUpdaterResult;
          if (
            autoUpdaterResult?.version === installResult.latestVersion &&
            autoUpdaterResult?.status === "success"
          )
            return state;
          return {
            ...state,
            autoUpdaterResult: {
              version: installResult.latestVersion,
              status: "success",
            },
          };
        });
      }
    } catch (error) {
      let latencyMs = Date.now() - now;
      let errorText = error instanceof Error ? error.message : String(error);
      logForDebugging(`Native auto-updater failed: ${errorText}`, {
        level: "error",
      });
      let failureHint = error instanceof ReleaseManifestError ? "registry_session_refused" : undefined;
      recordUpdateResult(
        {
          timestamp: new Date().toISOString(),
          path: "native",
          outcome: "failed",
          status: failureHint === undefined ? "install_failed" : "session_refused",
          version_from: {
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
          version_to: null,
          error_code: updateApplyErrorKey(failureHint),
        },
        storageV5,
      );
      let errorType = getErrorType(error);
      let errorCode = sanitizeErrnoForTelemetry(error) ?? lit("none");
      logEvent("tengu_native_auto_updater_fail", {
        latency_ms: latencyMs,
        error_code: errorCode,
        error_timeout: errorType === "timeout",
        error_checksum: errorType === "checksum_mismatch",
        error_signature: errorType === "signature_verification",
        error_not_found: errorType === "not_found",
        error_permission: errorType === "permission_denied",
        error_disk_full: errorType === "disk_full",
        error_npm: errorType === "npm_error",
        error_network: errorType === "network_error",
        error_swap_failure: errorType === "swap_failure",
        error_exec_format: errorType === "exec_format",
        error_av_quarantine: errorType === "av_quarantine",
      });
      setAppState((state) => {
        let autoUpdaterResult = state.autoUpdaterResult;
        if (
          autoUpdaterResult?.version === null &&
          autoUpdaterResult?.status === "install_failed" &&
          autoUpdaterResult.failureHint === failureHint
        )
          return state;
        return {
          ...state,
          autoUpdaterResult: {
            version: null,
            status: "install_failed",
            failureHint,
          },
        };
      });
    } finally {
      onChangeIsUpdating(false);
    }
  }
  let runUpgrade = useEffectEvent(upgrade);
  useEffect(() => {
    runUpgrade();
  }, [channelOrVersion]);
  useInterval(() => void upgrade(), 1800000);
  let hasUpdateResult = !!autoUpdaterResult?.status;
  let hasVersionInfo = !!versions.current && !!versions.latest;
  if (!(
    (!!maxVersionIssue || hasUpdateResult || (isUpdating && hasVersionInfo)) &&
    (verbose ||
      isUpdating ||
      (autoUpdaterResult?.status === "success" && showSuccessMessage && !!isUpdatingRef) ||
      autoUpdaterResult?.status === "install_failed" ||
      false)
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
          children: ["current: ", versions.current, " \xB7 ", channelOrVersion, ": ", versions.latest],
        }),
      isUpdating
        ? jsxProd_default(Box, {
            children: jsxProd_default(Text, {
              dimColor: true,
              wrap: "truncate",
              children: "Checking for updates",
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
              "Update installed \xB7",
              " ",
              atPrompt ? jsxProd_default(measureUpdateLabel, {}) : "Restart to update",
            ],
          }),
      autoUpdaterResult?.status === "install_failed" &&
        jsxProd_default_2(Text, {
          color: "error",
          wrap: "truncate",
          children: [
            jsxProd_default(StatusIcon, {
              status: "error",
              withSpace: true,
            }),
            "Auto-update failed \xB7 Run ",
            jsxProd_default(Text, {
              bold: true,
              children: "claude doctor",
            }),
          ],
        }),
      maxVersionIssue && false,
    ],
  });
}
export { NativeAutoUpdater };
