/**
 * hooks/useLspPluginRecommendation.tsx
 *
 * 打开特定语言文件时推荐安装对应 LSP 插件并处理用户选择。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useLspPluginRecommendation.tsx
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: fingerprint 2, layout 1
 */
import { extname } from "path";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useAppState } from "../state/AppState.js";
import { useNotifications } from "../context/notifications.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { useHost } from "../context/session.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useRef, useEffect } from "../../vendor/react/cjs/react.production.js";
import {
  hasShownLspRecommendationThisSession,
  setLspRecommendationShownThisSession,
} from "../bootstrap/state.js";
import {
  getMatchingLspPlugins,
  incrementIgnoredCount,
  addToNeverSuggest,
} from "../utils/plugins/lspRecommendation.js";
import { logForDebugging } from "../utils/debug.js";
import { LSP_RECOMMENDATION_DIALOG } from "../screens/replDialogState.js";
import { installPluginAndNotify } from "./usePluginRecommendationBase.js";
import { loadKnownMarketplacesSafe, tryUnwrapTextPayload } from "../utils/plugins/marketplaceManager.js";
import { resolvePluginEntryPath, entryPathOrReason } from "../utils/plugins/localMarketplacePaths.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../utils/errors.js";
import { printableName } from "../utils/printableName.js";
import { installPluginWithRecords } from "../utils/plugins/crossMarketplaceInstall.js";
import { marketplaceSourceOfEntry } from "../utils/plugins/headersHelper.js";
import { updateSettingsForSourceWithTransform } from "../utils/settings/settings.js";
import { saveGlobalConfig } from "../utils/config.js";

//@ chunk-czq1j3j2.js:1850596-1850648 fingerprint (2.1.88 match: _temp, 1)
function selectFileHistoryTrackedFiles(s) {
  return s.fileHistory.trackedFiles;
}
//@ chunk-czq1j3j2.js:1850648-1851823 layout
/**
 * 文件历史里出现新的被跟踪文件时，查找匹配该扩展名的 LSP 插件，弹出推荐对话框；用户取消时把未检查的文件放回，接受/拒绝后本会话不再推荐。
 */
function useLspRecommendationWatcher(requestDialog, schedule) {
  let $ = useMemoCache(9);
  let trackedFiles = useAppState(selectFileHistoryTrackedFiles);
  let { addNotification } = useNotifications();
  let { storageV5 } = useTheme_2();
  let host = useHost();
  let initialCheckedSet;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    initialCheckedSet = new Set();
    $[0] = initialCheckedSet;
  } else initialCheckedSet = $[0];
  let checkedFilesRef = useRef(initialCheckedSet);
  let watchEffect;
  let watchDeps;
  if (
    $[1] !== addNotification ||
    $[2] !== schedule ||
    $[3] !== host ||
    $[4] !== requestDialog ||
    $[5] !== storageV5 ||
    $[6] !== trackedFiles
  ) {
    watchEffect = () => {
      schedule("lsp", async () => {
        if (hasShownLspRecommendationThisSession()) {
          return;
        }
        let uncheckedFiles = [];
        for (const file of trackedFiles) {
          if (!checkedFilesRef.current.has(file)) {
            checkedFilesRef.current.add(file);
            uncheckedFiles.push(file);
          }
        }
        for (const [fileIndex, file] of uncheckedFiles.entries()) {
          try {
            let match = (await getMatchingLspPlugins(host, file, storageV5))[0];
            if (match) {
              logForDebugging(`[useLspPluginRecommendation] Found match: ${match.pluginName} for ${file}`);
              let recommendation = {
                pluginId: match.pluginId,
                pluginName: match.pluginName,
                pluginDescription: match.description,
                marketplaceName: match.marketplaceName,
                fileExtension: extname(file),
              };
              let response = await requestDialog(
                LSP_RECOMMENDATION_DIALOG,
                {
                  pluginName: recommendation.pluginName,
                  pluginDescription: recommendation.pluginDescription,
                  marketplaceName: recommendation.marketplaceName,
                  fileExtension: recommendation.fileExtension,
                },
                {
                  place: "under",
                },
              );
              if (response === "cancelled") {
                for (const checkedFile of uncheckedFiles.slice(fileIndex))
                  checkedFilesRef.current.delete(checkedFile);
                return;
              }
              setLspRecommendationShownThisSession(true);
              useLspPluginRecommendation(recommendation, response, addNotification, storageV5);
              return;
            }
          } catch (error) {
            let caughtError = error;
            logForDebugging(
              `[useLspPluginRecommendation] Failed to check for LSP plugins for ${file}: ${caughtError}`,
              {
                level: "error",
              },
            );
          }
        }
      });
    };
    watchDeps = [trackedFiles, schedule, requestDialog, addNotification, storageV5, host];
    $[1] = addNotification;
    $[2] = schedule;
    $[3] = host;
    $[4] = requestDialog;
    $[5] = storageV5;
    $[6] = trackedFiles;
    $[7] = watchEffect;
    $[8] = watchDeps;
  } else {
    watchEffect = $[7];
    watchDeps = $[8];
  }
  useEffect(watchEffect, watchDeps);
}
//@ chunk-czq1j3j2.js:1851823-1852899 fingerprint (2.1.88 match: useLspPluginRecommendation, 0.615)
function useLspPluginRecommendation({ pluginId, pluginName }, response, addNotification, storageV5) {
  switch (
    (logForDebugging(`[useLspPluginRecommendation] User response: ${response} for ${pluginName}`), response)
  ) {
    case "yes":
      installPluginAndNotify(
        pluginId,
        pluginName,
        "lsp-plugin",
        addNotification,
        async (pluginData) => {
          logForDebugging(`[useLspPluginRecommendation] Installing plugin: ${pluginId}`);
          let matches = await loadKnownMarketplacesSafe(storageV5);
          let entryPath;
          if (typeof pluginData.entry.source === "string") {
            let pluginEntryPath = await resolvePluginEntryPath(
              pluginId,
              pluginData.marketplaceInstallLocation,
              pluginData.entry.source,
              matches,
              tryUnwrapTextPayload(),
              storageV5,
            );
            let resolvedPath = entryPathOrReason(pluginEntryPath);
            if (resolvedPath.entryPath === undefined)
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `Plugin ${printableName(pluginId, 120)}: ${resolvedPath.reason}`,
                "lsp plugin recommendation marketplace path refused",
              );
            entryPath = resolvedPath.entryPath;
          }
          await installPluginWithRecords(
            pluginId,
            pluginData.entry,
            "user",
            undefined,
            entryPath,
            undefined,
            undefined,
            pluginData.marketplaceInstallLocation,
            marketplaceSourceOfEntry(pluginId, matches),
            undefined,
            storageV5,
            {
              explicitInstall: false,
            },
          );
          await updateSettingsForSourceWithTransform(
            "userSettings",
            (response) => ({
              enabledPlugins: {
                ...response?.enabledPlugins,
                [pluginId]: true,
              },
            }),
            undefined,
            storageV5,
          );
          logForDebugging(`[useLspPluginRecommendation] Plugin installed: ${pluginId}`);
        },
        storageV5,
      );
      break;
    case "no":
      break;
    case "timeout":
      logForDebugging("[useLspPluginRecommendation] Auto-dismissed unanswered, incrementing ignored count");
      incrementIgnoredCount(storageV5);
      break;
    case "never":
      addToNeverSuggest(pluginId, storageV5);
      break;
    case "disable":
      saveGlobalConfig((pluginData) => {
        if (pluginData.lspRecommendationDisabled) return pluginData;
        return {
          ...pluginData,
          lspRecommendationDisabled: true,
        };
      }, storageV5);
      break;
  }
}
export { useLspRecommendationWatcher };
