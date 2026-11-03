/**
 * components/AutoUpdaterWrapper.tsx
 *
 * 根据安装类型（native/package-manager/npm）选择对应的自动更新组件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/AutoUpdaterWrapper.tsx
 * pieces: chunk-tzghj6zv.js (3)
 * attribution: sole-consumer 2, fingerprint 1
 */
import { homedir } from "os";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useAppState, useSetAppState } from "../state/AppState.js";
import {
  selectAutoUpdaterResult,
  packageManagerAutoUpdaterSlot,
  clearFailedAutoUpdaterResult,
  getPackageManagerUpgradeCommand,
  PackageManagerAutoUpdater_2,
} from "./PackageManagerAutoUpdater.js";
import { useHost } from "../context/session.js";
import { y, Oo, P } from "../../vendor/react/cjs/react.production.js";
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

//@ chunk-tzghj6zv.js:38943-38958 sole-consumer
var PKG_MANAGER_UPDATE_RETRY_MS = 1800000;
//@ chunk-tzghj6zv.js:38958-46626 sole-consumer
/**
 * 包管理器（homebrew/winget 等）安装的自动更新组件：检查最新版本（受 maxVersion 上限与跳过版本限制），CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE 开启时执行包管理器升级命令并记录 tengu_pkg_manager_auto_updater_* 事件，否则只提示可用更新。
 */
function PackageManagerAutoUpdater(props) {
  let $ = w(54);
  let { isUpdating, onChangeIsUpdating, showSuccessMessage, verbose, withSeparator } = props;
  let appState = useAppState(selectAutoUpdaterResult);
  let setAppState = useSetAppState();
  let V = packageManagerAutoUpdaterSlot.of(useHost());
  let [packageManagerLatestVersion, setPackageManagerLatestVersion] = y(V.packageManagerLatestVersion);
  let [B, pe] = y("unknown");
  let [oe, ne] = y(null);
  let we;
  if ($[0] !== isUpdating) {
    we = () => isUpdating;
    $[0] = isUpdating;
    $[1] = we;
  } else we = $[1];
  let Te = Oo(we);
  let L;
  let ee;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    L = () => {
      getPackageManager().then((packageManager) => {
        pe(packageManager);
        if (packageManager === "homebrew") ne(getHomebrewCaskName());
      });
    };
    ee = [];
    $[2] = L;
    $[3] = ee;
  } else {
    L = $[2];
    ee = $[3];
  }
  P(L, ee);
  let Se;
  if (
    $[4] !== appState?.status ||
    $[5] !== isUpdating ||
    $[6] !== onChangeIsUpdating ||
    $[7] !== Te ||
    $[8] !== setAppState ||
    $[9] !== V
  ) {
    Se = async () => {
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
        if (Date.now() - V.packageManagerUpdateLastFailedAt < PKG_MANAGER_UPDATE_RETRY_MS) {
          return;
        }
        setAppState(clearFailedAutoUpdaterResult);
      }
      let [te, packageManager] = await Promise.all([autoUpdatesChannel(), getPackageManager()]);
      let X = te;
      let F = null;
      if (packageManager === "homebrew") {
        F = getHomebrewCaskName();
        X = F === "claude-code@latest" ? "latest" : "stable";
      }
      let targetVersion =
        packageManager === "homebrew"
          ? await latestVersionFromSources(F ?? "claude-code", X)
          : await fetchGcsVersion(X);
      let maxVersion = await getMaxVersion();
      let D = false;
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
            `PackageManagerAutoUpdater: current version ${
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.316",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-10-30T23:28:13Z",
                GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION
            } is already at or above maxVersion ${maxVersion}, skipping update`,
          );
          V.recordPackageManagerLatestVersion(null);
          setPackageManagerLatestVersion(null);
          return;
        }
        targetVersion = maxVersion;
        D = true;
      }
      let J =
        targetVersion &&
        !semverGt(
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
          targetVersion,
        ) &&
        !shouldSkipVersion(targetVersion);
      let K = J ? targetVersion : null;
      V.recordPackageManagerLatestVersion(K);
      setPackageManagerLatestVersion(K);
      if (!J) {
        return;
      }
      logForDebugging(
        `PackageManagerAutoUpdater: Update available ${
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
        } -> ${targetVersion}`,
      );
      let me = isEnvTruthy(process.env.CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE);
      let packageManagerUpgradeCommand = getPackageManagerUpgradeCommand(packageManager, F);
      if (!me || !packageManagerUpgradeCommand || D) {
        return;
      }
      if (Te()) {
        return;
      }
      onChangeIsUpdating(true);
      let now = Date.now();
      let Ce = {
        pm_homebrew: packageManager === "homebrew",
        pm_winget: packageManager === "winget",
      };
      logEvent("tengu_pkg_manager_auto_updater_start", Ce);
      let [de, ..._e] = packageManagerUpgradeCommand;
      let Pe = await execFileNoThrowWithCwd(de, _e, {
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
      if (Pe.code === 0) {
        logEvent("tengu_pkg_manager_auto_updater_success", {
          ...Ce,
          latency_ms: latencyMs,
        });
        setAppState((_) => {
          let autoUpdaterResult = _.autoUpdaterResult;
          if (autoUpdaterResult?.version === targetVersion && autoUpdaterResult?.status === "success") {
            return _;
          }
          return {
            ..._,
            autoUpdaterResult: {
              version: targetVersion,
              status: "success",
            },
          };
        });
      } else {
        logForDebugging(
          `PackageManagerAutoUpdater: ${de} exited ${Pe.code}: ${Pe.stderr || Pe.error || Pe.stdout}`,
        );
        logEvent("tengu_pkg_manager_auto_updater_fail", {
          ...Ce,
          latency_ms: latencyMs,
          exit_code: Pe.code,
        });
        V.recordPackageManagerUpdateFailure(Date.now());
        setAppState((ke) => {
          if (ke.autoUpdaterResult?.status === "install_failed") {
            return ke;
          }
          return {
            ...ke,
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
    $[7] = Te;
    $[8] = setAppState;
    $[9] = V;
    $[10] = Se;
  } else Se = $[10];
  let q = Oo(Se);
  let U;
  if ($[11] !== onChangeIsUpdating) {
    U = (xe) => {
      onChangeIsUpdating(false);
      logError(xe);
    };
    $[11] = onChangeIsUpdating;
    $[12] = U;
  } else U = $[12];
  let Ee = Oo(U);
  let qe;
  if ($[13] !== q || $[14] !== Ee) {
    qe = () => {
      q().catch(Ee);
    };
    $[13] = q;
    $[14] = Ee;
    $[15] = qe;
  } else qe = $[15];
  let ut;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    ut = [];
    $[16] = ut;
  } else ut = $[16];
  P(qe, ut);
  let He;
  if ($[17] !== q || $[18] !== Ee) {
    He = () => void q().catch(Ee);
    $[17] = q;
    $[18] = Ee;
    $[19] = He;
  } else He = $[19];
  useInterval(He, PKG_MANAGER_UPDATE_RETRY_MS);
  let Xe;
  if ($[20] !== withSeparator) {
    Xe =
      withSeparator === undefined
        ? null
        : jsxProd_default(Text, {
            dimColor: true,
            children: withSeparator ? " \xB7" : "",
          });
    $[20] = withSeparator;
    $[21] = Xe;
  } else Xe = $[21];
  let Ne = Xe;
  if (appState?.status === "success") {
    if (!showSuccessMessage) {
      return null;
    }
    let De;
    if ($[22] !== appState || $[23] !== verbose) {
      De =
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
              VERSION: "2.1.316",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-10-30T23:28:13Z",
              GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
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
      $[24] = De;
    } else De = $[24];
    const Ue = B !== "unknown" && ` via ${B}`;
    let Fe;
    if ($[25] !== Ue) {
      Fe = jsxProd_default_2(Text, {
        color: "success",
        wrap: "truncate",
        children: ["\u2713 Update installed", Ue, " \xB7 Restart to apply"],
      });
      $[25] = Ue;
      $[26] = Fe;
    } else Fe = $[26];
    let Ve;
    if ($[27] !== Ne || $[28] !== De || $[29] !== Fe) {
      Ve = jsxProd_default_2(Box, {
        flexDirection: "row",
        gap: 1,
        children: [Ne, De, Fe],
      });
      $[27] = Ne;
      $[28] = De;
      $[29] = Fe;
      $[30] = Ve;
    } else Ve = $[30];
    return Ve;
  }
  if (isUpdating) {
    const children = B === "unknown" ? "Updating\u2026" : `Updating via ${B}\u2026`;
    let Ue;
    if ($[31] !== children) {
      Ue = jsxProd_default(Text, {
        dimColor: true,
        wrap: "truncate",
        children,
      });
      $[31] = children;
      $[32] = Ue;
    } else Ue = $[32];
    let Fe;
    if ($[33] !== Ne || $[34] !== Ue) {
      Fe = jsxProd_default_2(Box, {
        flexDirection: "row",
        gap: 1,
        children: [Ne, Ue],
      });
      $[33] = Ne;
      $[34] = Ue;
      $[35] = Fe;
    } else Fe = $[35];
    return Fe;
  }
  let et = appState?.status === "install_failed";
  if ((!packageManagerLatestVersion && !et) || B === "unknown") {
    return null;
  }
  let De;
  if ($[36] !== verbose) {
    De =
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
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION,
        ],
      });
    $[36] = verbose;
    $[37] = De;
  } else De = $[37];
  let children;
  if ($[38] !== oe || $[39] !== B) {
    children = PackageManagerAutoUpdater_2(B, oe);
    $[38] = oe;
    $[39] = B;
    $[40] = children;
  } else children = $[40];
  let Fe;
  if ($[41] !== children) {
    Fe = jsxProd_default(Text, {
      bold: true,
      children,
    });
    $[41] = children;
    $[42] = Fe;
  } else Fe = $[42];
  let Ve;
  if ($[43] !== et) {
    Ve =
      et &&
      jsxProd_default(Text, {
        dimColor: true,
        children: " (auto-update failed)",
      });
    $[43] = et;
    $[44] = Ve;
  } else Ve = $[44];
  let xt;
  if ($[45] !== Fe || $[46] !== Ve) {
    xt = jsxProd_default_2(Text, {
      color: "warning",
      wrap: "truncate",
      children: ["Update available! Run:", " ", Fe, Ve],
    });
    $[45] = Fe;
    $[46] = Ve;
    $[47] = xt;
  } else xt = $[47];
  let mt;
  if ($[48] !== De || $[49] !== xt) {
    mt = jsxProd_default_2(Box, {
      flexDirection: "column",
      alignItems: "flex-end",
      children: [De, xt],
    });
    $[48] = De;
    $[49] = xt;
    $[50] = mt;
  } else mt = $[50];
  let zr;
  if ($[51] !== Ne || $[52] !== mt) {
    zr = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 1,
      alignItems: "flex-end",
      children: [Ne, mt],
    });
    $[51] = Ne;
    $[52] = mt;
    $[53] = zr;
  } else zr = $[53];
  return zr;
}
//@ chunk-tzghj6zv.js:46626-47769 fingerprint = AutoUpdaterWrapper (0.58)
/**
 * 检测安装类型后渲染 NativeAutoUpdater / PackageManagerAutoUpdater / AutoUpdater。
 */
function AutoUpdaterWrapper(props) {
  let $ = w(18);
  let { isUpdating, onChangeIsUpdating, showSuccessMessage, verbose, withSeparator, atPrompt } = props;
  let [useNativeInstaller, setUseNativeInstaller] = y(null);
  let [isPackageManager, setIsPackageManager] = y(null);
  let pe;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    pe = async function we() {
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
    $[0] = pe;
  } else pe = $[0];
  let we = pe;
  let [Te] = y(remainingStartupGraceMs);
  let L;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    L = () => void we();
    $[1] = L;
  } else L = $[1];
  useTimeout(L, Te);
  if (useNativeInstaller === null || isPackageManager === null) {
    return null;
  }
  if (isPackageManager) {
    let ee;
    if (
      $[2] !== isUpdating ||
      $[3] !== onChangeIsUpdating ||
      $[4] !== showSuccessMessage ||
      $[5] !== verbose ||
      $[6] !== withSeparator
    ) {
      ee = jsxProd_default(PackageManagerAutoUpdater, {
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
      $[7] = ee;
    } else ee = $[7];
    return ee;
  }
  let ee;
  if (
    $[8] !== isUpdating ||
    $[9] !== onChangeIsUpdating ||
    $[10] !== showSuccessMessage ||
    $[11] !== verbose ||
    $[12] !== withSeparator
  ) {
    ee = {
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
    $[13] = ee;
  } else ee = $[13];
  let ye = ee;
  let Se;
  if ($[14] !== atPrompt || $[15] !== ye || $[16] !== useNativeInstaller) {
    Se = useNativeInstaller
      ? jsxProd_default(NativeAutoUpdater, {
          ...ye,
          atPrompt,
        })
      : jsxProd_default(AutoUpdater, {
          ...ye,
        });
    $[14] = atPrompt;
    $[15] = ye;
    $[16] = useNativeInstaller;
    $[17] = Se;
  } else Se = $[17];
  return Se;
}
export { AutoUpdaterWrapper };
