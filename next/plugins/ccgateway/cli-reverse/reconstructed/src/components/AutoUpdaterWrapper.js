/**
 * components/AutoUpdaterWrapper.tsx
 *
 * 根据安装类型（native/package-manager/npm）选择对应的自动更新组件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/AutoUpdaterWrapper.tsx
 * pieces: chunk-18rrbwq1.js (3)
 * attribution: sole-consumer 2, fingerprint 1
 */
import { homedir } from "os";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useAppState, useSetAppState } from "../state/AppState.js";
import {
  selectAutoUpdaterResult,
  packageManagerAutoUpdaterSlot,
  clearFailedAutoUpdaterResult,
  getPackageManagerUpgradeCommand,
  PackageManagerAutoUpdater_2,
} from "./PackageManagerAutoUpdater.js";
import { useHost } from "../context/session.js";
import { useState, useEffectEvent, useEffect } from "../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  getPackageManager,
  getHomebrewCaskName,
  wasInstallTypeProbed,
  getCurrentInstallationTypeProbed,
} from "../utils/doctorDiagnostic.js";
import { isAutoUpdaterDisabled } from "../utils/config.js";
import {
  isAutoUpdateCheckThrottled,
  latestVersionFromSources,
  fetchGcsVersion,
  getMaxVersion,
  shouldSkipVersion,
  remainingStartupGraceMs,
} from "../utils/autoUpdater.js";
import { autoUpdatesChannel } from "../utils/updateChannel.js";
import { semverGte, semverGt } from "../utils/semver.js";
import { logForDebugging } from "../utils/debug.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import { logEvent } from "../services/analytics/index.js";
import { execFileNoThrowWithCwd } from "../utils/execFileNoThrow.js";
import { logError } from "../utils/log.js";
import { useInterval } from "../ink/components/Input.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { useTimeout } from "../ink/hooks/useTerminalHooks.js";
import { NativeAutoUpdater } from "./NativeAutoUpdater.js";
import { AutoUpdater } from "./AutoUpdater.js";

//@ chunk-18rrbwq1.js:38948-38963 sole-consumer
var PKG_MANAGER_UPDATE_RETRY_MS = 1800000;
//@ chunk-18rrbwq1.js:38963-46617 sole-consumer
/**
 * 包管理器（homebrew/winget 等）安装的自动更新组件：检查最新版本（受 maxVersion 上限与跳过版本限制），CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE 开启时执行包管理器升级命令并记录 tengu_pkg_manager_auto_updater_* 事件，否则只提示可用更新。
 */
function PackageManagerAutoUpdater(props) {
  let $ = useMemoCache(54);
  let { isUpdating, onChangeIsUpdating, showSuccessMessage, verbose, withSeparator } = props;
  let appState = useAppState(selectAutoUpdaterResult);
  let setAppState = useSetAppState();
  let updaterSlot = packageManagerAutoUpdaterSlot.of(useHost());
  let [packageManagerLatestVersion, setPackageManagerLatestVersion] = useState(
    updaterSlot.packageManagerLatestVersion,
  );
  let [packageManager, setPackageManager] = useState("unknown");
  let [homebrewCask, setHomebrewCask] = useState(null);
  let isUpdatingGetter;
  if ($[0] !== isUpdating) {
    isUpdatingGetter = () => isUpdating;
    $[0] = isUpdating;
    $[1] = isUpdatingGetter;
  } else isUpdatingGetter = $[1];
  let isUpdatingRef = useEffectEvent(isUpdatingGetter);
  let detectPackageManagerEffect;
  let detectPackageManagerDeps;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    detectPackageManagerEffect = () => {
      getPackageManager().then((packageManager) => {
        setPackageManager(packageManager);
        if (packageManager === "homebrew") setHomebrewCask(getHomebrewCaskName());
      });
    };
    detectPackageManagerDeps = [];
    $[2] = detectPackageManagerEffect;
    $[3] = detectPackageManagerDeps;
  } else {
    detectPackageManagerEffect = $[2];
    detectPackageManagerDeps = $[3];
  }
  useEffect(detectPackageManagerEffect, detectPackageManagerDeps);
  let checkForUpdatesCached;
  if (
    $[4] !== appState?.status ||
    $[5] !== isUpdating ||
    $[6] !== onChangeIsUpdating ||
    $[7] !== isUpdatingRef ||
    $[8] !== setAppState ||
    $[9] !== updaterSlot
  ) {
    checkForUpdatesCached = async () => {
      if (isUpdating) {
        return;
      }
      if (appState?.status === "success") {
        return;
      }
      if (isAutoUpdaterDisabled()) {
        return;
      }
      if (isAutoUpdateCheckThrottled()) {
        return;
      }
      if (appState?.status === "install_failed") {
        if (Date.now() - updaterSlot.packageManagerUpdateLastFailedAt < PKG_MANAGER_UPDATE_RETRY_MS) {
          return;
        }
        setAppState(clearFailedAutoUpdaterResult);
      }
      let [channel, packageManager] = await Promise.all([autoUpdatesChannel(), getPackageManager()]);
      let versionChannel = channel;
      let caskName = null;
      if (packageManager === "homebrew") {
        caskName = getHomebrewCaskName();
        versionChannel = caskName === "claude-code@latest" ? "latest" : "stable";
      }
      let targetVersion =
        packageManager === "homebrew"
          ? await latestVersionFromSources(caskName ?? "claude-code", versionChannel)
          : await fetchGcsVersion(versionChannel);
      let maxVersion = await getMaxVersion();
      let isForcedDowngrade = false;
      if (maxVersion && targetVersion && semverGte(targetVersion, maxVersion)) {
        logForDebugging(
          `PackageManagerAutoUpdater: maxVersion ${maxVersion} is set, capping update from ${targetVersion} to ${maxVersion}`,
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
            `PackageManagerAutoUpdater: current version ${
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.318",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-11-03T18:52:53Z",
                GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION
            } is already at or above maxVersion ${maxVersion}, skipping update`,
          );
          updaterSlot.recordPackageManagerLatestVersion(null);
          setPackageManagerLatestVersion(null);
          return;
        }
        targetVersion = maxVersion;
        isForcedDowngrade = true;
      }
      let hasNewerVersion =
        targetVersion &&
        !semverGt(
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
          targetVersion,
        ) &&
        !shouldSkipVersion(targetVersion);
      let latestVersionToShow = hasNewerVersion ? targetVersion : null;
      updaterSlot.recordPackageManagerLatestVersion(latestVersionToShow);
      setPackageManagerLatestVersion(latestVersionToShow);
      if (!hasNewerVersion) {
        return;
      }
      logForDebugging(
        `PackageManagerAutoUpdater: Update available ${
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
        } -> ${targetVersion}`,
      );
      let autoUpdateEnabled = isEnvTruthy(process.env.CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE);
      let packageManagerUpgradeCommand = getPackageManagerUpgradeCommand(packageManager, caskName);
      if (!autoUpdateEnabled || !packageManagerUpgradeCommand || isForcedDowngrade) {
        return;
      }
      if (isUpdatingRef()) {
        return;
      }
      onChangeIsUpdating(true);
      let now = Date.now();
      let startTelemetryFields = {
        pm_homebrew: packageManager === "homebrew",
        pm_winget: packageManager === "winget",
      };
      logEvent("tengu_pkg_manager_auto_updater_start", startTelemetryFields);
      let [command, ...commandArgs] = packageManagerUpgradeCommand;
      let execResult = await execFileNoThrowWithCwd(command, commandArgs, {
        cwd: homedir(),
        timeout: 300000,
        env:
          packageManager === "homebrew"
            ? {
                ...process.env,
                HOMEBREW_NO_AUTO_UPDATE: "",
              }
            : undefined,
      });
      let latencyMs = Date.now() - now;
      onChangeIsUpdating(false);
      if (execResult.code === 0) {
        logEvent("tengu_pkg_manager_auto_updater_success", {
          ...startTelemetryFields,
          latency_ms: latencyMs,
        });
        setAppState((state) => {
          let autoUpdaterResult = state.autoUpdaterResult;
          if (autoUpdaterResult?.version === targetVersion && autoUpdaterResult?.status === "success") {
            return state;
          }
          return {
            ...state,
            autoUpdaterResult: {
              version: targetVersion,
              status: "success",
            },
          };
        });
      } else {
        logForDebugging(
          `PackageManagerAutoUpdater: ${command} exited ${execResult.code}: ${execResult.stderr || execResult.error || execResult.stdout}`,
        );
        logEvent("tengu_pkg_manager_auto_updater_fail", {
          ...startTelemetryFields,
          latency_ms: latencyMs,
          exit_code: execResult.code,
        });
        updaterSlot.recordPackageManagerUpdateFailure(Date.now());
        setAppState((state) => {
          if (state.autoUpdaterResult?.status === "install_failed") {
            return state;
          }
          return {
            ...state,
            autoUpdaterResult: {
              version: targetVersion,
              status: "install_failed",
            },
          };
        });
      }
    };
    $[4] = appState?.status;
    $[5] = isUpdating;
    $[6] = onChangeIsUpdating;
    $[7] = isUpdatingRef;
    $[8] = setAppState;
    $[9] = updaterSlot;
    $[10] = checkForUpdatesCached;
  } else checkForUpdatesCached = $[10];
  let checkForUpdates = useEffectEvent(checkForUpdatesCached);
  let reportErrorCached;
  if ($[11] !== onChangeIsUpdating) {
    reportErrorCached = (error) => {
      onChangeIsUpdating(false);
      logError(error);
    };
    $[11] = onChangeIsUpdating;
    $[12] = reportErrorCached;
  } else reportErrorCached = $[12];
  let reportError = useEffectEvent(reportErrorCached);
  let initialCheck;
  if ($[13] !== checkForUpdates || $[14] !== reportError) {
    initialCheck = () => {
      checkForUpdates().catch(reportError);
    };
    $[13] = checkForUpdates;
    $[14] = reportError;
    $[15] = initialCheck;
  } else initialCheck = $[15];
  let initialCheckDeps;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    initialCheckDeps = [];
    $[16] = initialCheckDeps;
  } else initialCheckDeps = $[16];
  useEffect(initialCheck, initialCheckDeps);
  let pollCheck;
  if ($[17] !== checkForUpdates || $[18] !== reportError) {
    pollCheck = () => void checkForUpdates().catch(reportError);
    $[17] = checkForUpdates;
    $[18] = reportError;
    $[19] = pollCheck;
  } else pollCheck = $[19];
  useInterval(pollCheck, PKG_MANAGER_UPDATE_RETRY_MS);
  let separatorCached;
  if ($[20] !== withSeparator) {
    separatorCached =
      withSeparator === undefined
        ? null
        : jsxProd_default(Text, {
            dimColor: true,
            children: withSeparator ? " \xB7" : "",
          });
    $[20] = withSeparator;
    $[21] = separatorCached;
  } else separatorCached = $[21];
  let separatorElement = separatorCached;
  if (appState?.status === "success") {
    if (!showSuccessMessage) {
      return null;
    }
    let installedVersionElement;
    if ($[22] !== appState || $[23] !== verbose) {
      installedVersionElement =
        verbose &&
        jsxProd_default_2(Text, {
          dimColor: true,
          wrap: "truncate",
          children: [
            "current: ",
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
            " \xB7 latest:",
            " ",
            appState.version,
          ],
        });
      $[22] = appState;
      $[23] = verbose;
      $[24] = installedVersionElement;
    } else installedVersionElement = $[24];
    const viaSuffix = packageManager !== "unknown" && ` via ${packageManager}`;
    let successText;
    if ($[25] !== viaSuffix) {
      successText = jsxProd_default_2(Text, {
        color: "success",
        wrap: "truncate",
        children: ["\u2713 Update installed", viaSuffix, " \xB7 Restart to apply"],
      });
      $[25] = viaSuffix;
      $[26] = successText;
    } else successText = $[26];
    let successRow;
    if ($[27] !== separatorElement || $[28] !== installedVersionElement || $[29] !== successText) {
      successRow = jsxProd_default_2(Box, {
        flexDirection: "row",
        gap: 1,
        children: [separatorElement, installedVersionElement, successText],
      });
      $[27] = separatorElement;
      $[28] = installedVersionElement;
      $[29] = successText;
      $[30] = successRow;
    } else successRow = $[30];
    return successRow;
  }
  if (isUpdating) {
    const children = packageManager === "unknown" ? "Updating\u2026" : `Updating via ${packageManager}\u2026`;
    let updatingText;
    if ($[31] !== children) {
      updatingText = jsxProd_default(Text, {
        dimColor: true,
        wrap: "truncate",
        children,
      });
      $[31] = children;
      $[32] = updatingText;
    } else updatingText = $[32];
    let updatingRow;
    if ($[33] !== separatorElement || $[34] !== updatingText) {
      updatingRow = jsxProd_default_2(Box, {
        flexDirection: "row",
        gap: 1,
        children: [separatorElement, updatingText],
      });
      $[33] = separatorElement;
      $[34] = updatingText;
      $[35] = updatingRow;
    } else updatingRow = $[35];
    return updatingRow;
  }
  let didInstallFail = appState?.status === "install_failed";
  if ((!packageManagerLatestVersion && !didInstallFail) || packageManager === "unknown") {
    return null;
  }
  let currentVersionElement;
  if ($[36] !== verbose) {
    currentVersionElement =
      verbose &&
      jsxProd_default_2(Text, {
        dimColor: true,
        wrap: "truncate",
        children: [
          "currentVersion: ",
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
        ],
      });
    $[36] = verbose;
    $[37] = currentVersionElement;
  } else currentVersionElement = $[37];
  let children;
  if ($[38] !== homebrewCask || $[39] !== packageManager) {
    children = PackageManagerAutoUpdater_2(packageManager, homebrewCask);
    $[38] = homebrewCask;
    $[39] = packageManager;
    $[40] = children;
  } else children = $[40];
  let commandHint;
  if ($[41] !== children) {
    commandHint = jsxProd_default(Text, {
      bold: true,
      children,
    });
    $[41] = children;
    $[42] = commandHint;
  } else commandHint = $[42];
  let failedSuffix;
  if ($[43] !== didInstallFail) {
    failedSuffix =
      didInstallFail &&
      jsxProd_default(Text, {
        dimColor: true,
        children: " (auto-update failed)",
      });
    $[43] = didInstallFail;
    $[44] = failedSuffix;
  } else failedSuffix = $[44];
  let updateAvailableText;
  if ($[45] !== commandHint || $[46] !== failedSuffix) {
    updateAvailableText = jsxProd_default_2(Text, {
      color: "warning",
      wrap: "truncate",
      children: ["Update available! Run:", " ", commandHint, failedSuffix],
    });
    $[45] = commandHint;
    $[46] = failedSuffix;
    $[47] = updateAvailableText;
  } else updateAvailableText = $[47];
  let detailColumn;
  if ($[48] !== currentVersionElement || $[49] !== updateAvailableText) {
    detailColumn = jsxProd_default_2(Box, {
      flexDirection: "column",
      alignItems: "flex-end",
      children: [currentVersionElement, updateAvailableText],
    });
    $[48] = currentVersionElement;
    $[49] = updateAvailableText;
    $[50] = detailColumn;
  } else detailColumn = $[50];
  let rowElement;
  if ($[51] !== separatorElement || $[52] !== detailColumn) {
    rowElement = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 1,
      alignItems: "flex-end",
      children: [separatorElement, detailColumn],
    });
    $[51] = separatorElement;
    $[52] = detailColumn;
    $[53] = rowElement;
  } else rowElement = $[53];
  return rowElement;
}
//@ chunk-18rrbwq1.js:46617-47750 fingerprint (2.1.88 match: AutoUpdaterWrapper, 0.58)
/**
 * 检测安装类型后渲染 NativeAutoUpdater / PackageManagerAutoUpdater / AutoUpdater。
 */
function AutoUpdaterWrapper(props) {
  let $ = useMemoCache(18);
  let { isUpdating, onChangeIsUpdating, showSuccessMessage, verbose, withSeparator, atPrompt } = props;
  let [useNativeInstaller, setUseNativeInstaller] = useState(null);
  let [isPackageManager, setIsPackageManager] = useState(null);
  let probeInstallTypeCached;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    probeInstallTypeCached = async function probeInstallType() {
      let firstInProcess = !wasInstallTypeProbed();
      let now = Date.now();
      let currentInstallationTypeProbed = await getCurrentInstallationTypeProbed();
      logFeatureOk("update_detection", {
        duration_ms: Date.now() - now,
        first_in_process: firstInProcess,
        installation_type: fromEnum(currentInstallationTypeProbed),
      });
      logForDebugging(`AutoUpdaterWrapper: Installation type: ${currentInstallationTypeProbed}`);
      setUseNativeInstaller(currentInstallationTypeProbed === "native");
      setIsPackageManager(currentInstallationTypeProbed === "package-manager");
    };
    $[0] = probeInstallTypeCached;
  } else probeInstallTypeCached = $[0];
  let probeInstallTypeStable = probeInstallTypeCached;
  let [startupGraceMs] = useState(remainingStartupGraceMs);
  let probeOnGraceTimeout;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    probeOnGraceTimeout = () => void probeInstallTypeStable();
    $[1] = probeOnGraceTimeout;
  } else probeOnGraceTimeout = $[1];
  useTimeout(probeOnGraceTimeout, startupGraceMs);
  if (useNativeInstaller === null || isPackageManager === null) {
    return null;
  }
  if (isPackageManager) {
    let packageManagerUpdater;
    if (
      $[2] !== isUpdating ||
      $[3] !== onChangeIsUpdating ||
      $[4] !== showSuccessMessage ||
      $[5] !== verbose ||
      $[6] !== withSeparator
    ) {
      packageManagerUpdater = jsxProd_default(PackageManagerAutoUpdater, {
        verbose,
        isUpdating,
        onChangeIsUpdating,
        showSuccessMessage,
        withSeparator,
      });
      $[2] = isUpdating;
      $[3] = onChangeIsUpdating;
      $[4] = showSuccessMessage;
      $[5] = verbose;
      $[6] = withSeparator;
      $[7] = packageManagerUpdater;
    } else packageManagerUpdater = $[7];
    return packageManagerUpdater;
  }
  let updaterProps;
  if (
    $[8] !== isUpdating ||
    $[9] !== onChangeIsUpdating ||
    $[10] !== showSuccessMessage ||
    $[11] !== verbose ||
    $[12] !== withSeparator
  ) {
    updaterProps = {
      verbose,
      isUpdating,
      onChangeIsUpdating,
      showSuccessMessage,
      withSeparator,
    };
    $[8] = isUpdating;
    $[9] = onChangeIsUpdating;
    $[10] = showSuccessMessage;
    $[11] = verbose;
    $[12] = withSeparator;
    $[13] = updaterProps;
  } else updaterProps = $[13];
  let commonProps = updaterProps;
  let updaterElement;
  if ($[14] !== atPrompt || $[15] !== commonProps || $[16] !== useNativeInstaller) {
    updaterElement = useNativeInstaller
      ? jsxProd_default(NativeAutoUpdater, {
          ...commonProps,
          atPrompt,
        })
      : jsxProd_default(AutoUpdater, {
          ...commonProps,
        });
    $[14] = atPrompt;
    $[15] = commonProps;
    $[16] = useNativeInstaller;
    $[17] = updaterElement;
  } else updaterElement = $[17];
  return updaterElement;
}
export { AutoUpdaterWrapper };
