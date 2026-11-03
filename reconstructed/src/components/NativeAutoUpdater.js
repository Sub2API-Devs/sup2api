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
import { j, y, Oo, P } from "../../vendor/react/cjs/react.production.js";
import { ManifestSignatureError, StallTimeoutError, ZNo } from "../utils/nativeInstaller/download.js";
import { StagedBinaryChecksumError, installLatest } from "../utils/nativeInstaller/installer.js";
import { getErrnoCode, sanitizeErrnoForTelemetry } from "../utils/errors.js";
import { isRunningFromVersionsDir } from "../utils/deepLink/registerProtocol.js";
import { getReplBridgeHandle } from "../bridge/replBridgeHandle.js";
import { restartVersionTarget, pjo } from "../commands/restart/versionTargets.js";
import { Y3s } from "../commands/restart/index.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { renderWithForceUpdate } from "../hooks/useForceRender.js";
import { Me } from "./design-system/ThemeProvider.js";
import { useAppState, useSetAppState } from "../state/AppState.js";
import { useChangedVersion } from "./AutoUpdater.js";
import { y9 } from "../utils/updateChannel.js";
import { isAutoUpdaterDisabled } from "../utils/config.js";
import {
  getMaxVersion,
  getMaxVersionMessage,
  isAutoUpdateCheckThrottled,
  updateApplyErrorKey,
} from "../utils/autoUpdater.js";
import { gt as gt_2 } from "../utils/semver.js";
import { logEvent } from "../services/analytics/index.js";
import { recordUpdateResult } from "../utils/nativeInstaller/updateResult.js";
import { logForDebugging } from "../utils/debug.js";
import { lit } from "../services/analytics/safeMetadata.js";
import { useInterval } from "../ink/components/Input.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { StatusIcon } from "./design-system/StatusIcon.js";

//@ chunk-tzghj6zv.js:31073-31077 placement
j();
/**
 * 把更新错误分类（signature_verification、checksum_mismatch、超时、网络等）。
 */
//@ chunk-tzghj6zv.js:31077-32357 fingerprint = getErrorType (0.508)
function getErrorType(errorMessage) {
  if (errorMessage instanceof ManifestSignatureError) return "signature_verification";
  if (errorMessage instanceof StagedBinaryChecksumError) return "checksum_mismatch";
  let h = errorMessage instanceof Error ? errorMessage.message : String(errorMessage),
    x = getErrnoCode(errorMessage);
  if (
    errorMessage instanceof StallTimeoutError ||
    x === "ETIMEDOUT" ||
    x === "ECONNABORTED" ||
    h.includes("Download timed out") ||
    h.includes("timeout")
  )
    return "timeout";
  if (h.includes("Checksum mismatch")) return "checksum_mismatch";
  if (h.includes("ENOENT") || h.includes("not found")) return "not_found";
  if (h.includes("EACCES") || h.includes("permission")) return "permission_denied";
  if (h.includes("ENOSPC")) return "disk_full";
  if (h.includes("npm")) return "npm_error";
  if (h.includes("network") || h.includes("ECONNREFUSED") || h.includes("ENOTFOUND")) return "network_error";
  let lower = h.toLowerCase();
  if (
    h.includes("ENOEXEC") ||
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
    h.includes("EXDEV") ||
    h.includes("EEXIST") ||
    h.includes("EBUSY") ||
    lower.includes("rename") ||
    lower.includes("move failed") ||
    lower.includes("cross-device")
  )
    return "swap_failure";
  return "unknown";
}
//@ chunk-tzghj6zv.js:32357-32566 layout
function getAutoUpdaterResultEvent(d) {
  if (d.wasUpdated) return "tengu_native_auto_updater_success";
  if (d.skippedUnverifiedRelease) return "tengu_native_auto_updater_skipped_unverified_release";
  return "tengu_native_auto_updater_up_to_date";
}
//@ chunk-tzghj6zv.js:32566-32643 layout
function Ti() {
  return (
    isRunningFromVersionsDir() &&
    !getReplBridgeHandle()?.bridgeSessionId &&
    "version" in restartVersionTarget() &&
    Y3s()
  );
}
//@ chunk-tzghj6zv.js:32643-32756 layout
function getRestartToApplyText() {
  let offer = getFeatureValue_CACHED_MAY_BE_STALE("tengu_fancy_wand_copy", {}).offer;
  return typeof offer === "string" && offer !== "" ? offer : "/restart to apply";
}
//@ chunk-tzghj6zv.js:32756-32807 layout
function In() {
  return Ti() ? getRestartToApplyText() : "Restart to update";
}
//@ chunk-tzghj6zv.js:32807-32835 layout
function Vn() {
  return renderWithForceUpdate(In);
}
/**
 * 原生安装的自动更新：下载新版本、验证签名与校验和、失败按类型（超时/校验失败/网络）记录，成功提示 /restart。
 */
//@ chunk-tzghj6zv.js:32835-37733 fingerprint = NativeAutoUpdater (0.553)
function NativeAutoUpdater({
  isUpdating: isUpdating,
  onChangeIsUpdating: onChangeIsUpdating,
  showSuccessMessage: showSuccessMessage,
  verbose: verbose,
  withSeparator: withSeparator,
  atPrompt: atPrompt,
}) {
  let { storageV5: storageV5 } = Me(),
    autoUpdaterResult = useAppState((te) => te.autoUpdaterResult),
    V = useSetAppState(),
    [Y, N] = y({
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
    }),
    [B, pe] = y(null),
    isUpdatingRef = useChangedVersion(autoUpdaterResult?.version),
    ne = y9();
  async function z() {
    if (isUpdating) return;
    if (autoUpdaterResult?.status === "success") return;
    if (isAutoUpdaterDisabled()) return;
    let maxVersion = await getMaxVersion();
    if (
      maxVersion &&
      gt_2(
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
      pe(msg ?? "affects your version");
    }
    if (isAutoUpdateCheckThrottled()) return;
    onChangeIsUpdating(!0);
    let now = Date.now();
    logEvent("tengu_native_auto_updater_start", {});
    try {
      let X = await installLatest(ne, !1, storageV5),
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
        re = Date.now() - now;
      if (X.lockFailed) {
        logEvent("tengu_native_auto_updater_lock_contention", { latency_ms: re });
        return;
      }
      if (
        (N({ current: currentVersion, latest: X.latestVersion }),
        logEvent(getAutoUpdaterResultEvent(X), { latency_ms: re }),
        X.wasUpdated)
      )
        (pjo(),
          recordUpdateResult(
            {
              timestamp: new Date().toISOString(),
              path: "native",
              outcome: "success",
              status: "success",
              version_from: currentVersion,
              version_to: X.latestVersion ?? null,
              error_code: null,
            },
            storageV5,
          ),
          V((H) => {
            let autoUpdaterResult = H.autoUpdaterResult;
            if (autoUpdaterResult?.version === X.latestVersion && autoUpdaterResult?.status === "success")
              return H;
            return { ...H, autoUpdaterResult: { version: X.latestVersion, status: "success" } };
          }));
    } catch (error) {
      let F = Date.now() - now,
        re = error instanceof Error ? error.message : String(error);
      logForDebugging(`Native auto-updater failed: ${re}`, { level: "error" });
      let H = error instanceof ZNo ? "registry_session_refused" : void 0;
      recordUpdateResult(
        {
          timestamp: new Date().toISOString(),
          path: "native",
          outcome: "failed",
          status: H === void 0 ? "install_failed" : "session_refused",
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
          error_code: updateApplyErrorKey(H),
        },
        storageV5,
      );
      let errorType = getErrorType(error),
        J = sanitizeErrnoForTelemetry(error) ?? lit("none");
      (logEvent("tengu_native_auto_updater_fail", {
        latency_ms: F,
        error_code: J,
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
      }),
        V((K) => {
          let autoUpdaterResult = K.autoUpdaterResult;
          if (
            autoUpdaterResult?.version === null &&
            autoUpdaterResult?.status === "install_failed" &&
            autoUpdaterResult.failureHint === H
          )
            return K;
          return { ...K, autoUpdaterResult: { version: null, status: "install_failed", failureHint: H } };
        }));
    } finally {
      onChangeIsUpdating(!1);
    }
  }
  let we = Oo(z);
  (P(() => {
    we();
  }, [ne]),
    useInterval(() => void z(), 1800000));
  let hasUpdateResult = !!autoUpdaterResult?.status,
    L = !!Y.current && !!Y.latest;
  if (!(
    (!!B || hasUpdateResult || (isUpdating && L)) &&
    (verbose ||
      isUpdating ||
      (autoUpdaterResult?.status === "success" && showSuccessMessage && !!isUpdatingRef) ||
      autoUpdaterResult?.status === "install_failed" ||
      !1)
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
          children: ["current: ", Y.current, " \xB7 ", ne, ": ", Y.latest],
        }),
      isUpdating
        ? e(Box, { children: e(Text, { dimColor: !0, wrap: "truncate", children: "Checking for updates" }) })
        : autoUpdaterResult?.status === "success" &&
          showSuccessMessage &&
          isUpdatingRef &&
          r(Text, {
            color: "success",
            wrap: "truncate",
            children: [
              e(StatusIcon, { status: "success", withSpace: !0 }),
              "Update installed \xB7",
              " ",
              atPrompt ? e(Vn, {}) : "Restart to update",
            ],
          }),
      autoUpdaterResult?.status === "install_failed" &&
        r(Text, {
          color: "error",
          wrap: "truncate",
          children: [
            e(StatusIcon, { status: "error", withSpace: !0 }),
            "Auto-update failed \xB7 Run ",
            e(Text, { bold: !0, children: "claude doctor" }),
          ],
        }),
      B && !1,
    ],
  });
}

export { NativeAutoUpdater };
