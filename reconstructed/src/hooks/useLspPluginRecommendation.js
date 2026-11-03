/**
 * hooks/useLspPluginRecommendation.tsx
 *
 * 打开特定语言文件时推荐安装对应 LSP 插件并处理用户选择。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useLspPluginRecommendation.tsx
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: fingerprint 2, layout 1
 */
import { extname, extname as extname_2 } from "path";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useAppState } from "../state/AppState.js";
import { useNotifications } from "../context/notifications.js";
import { Me } from "../components/design-system/ThemeProvider.js";
import { useHost } from "../context/session.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { R, P } from "../../vendor/react/cjs/react.production.js";
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
import { E$e } from "../utils/plugins/headersHelper.js";
import { updateSettingsForSourceWithTransform } from "../utils/settings/settings.js";
import { saveGlobalConfig } from "../utils/config.js";

//@ chunk-18hwfzwa.js:1802617-1802669 fingerprint = _temp (1)
function selectFileHistoryTrackedFiles(s) {
  return s.fileHistory.trackedFiles;
}
/**
 * 文件历史里出现新的被跟踪文件时，查找匹配该扩展名的 LSP 插件，弹出推荐对话框；用户取消时把未检查的文件放回，接受/拒绝后本会话不再推荐。
 */
//@ chunk-18hwfzwa.js:1802669-1803844 layout
function useLspRecommendationWatcher(requestDialog, schedule) {
  let $ = w(9),
    trackedFiles = useAppState(selectFileHistoryTrackedFiles),
    { addNotification: addNotification } = useNotifications(),
    { storageV5: storageV5 } = Me(),
    host = useHost(),
    Be;
  if ($[0] === MEMO_CACHE_SENTINEL) ((Be = new Set()), ($[0] = Be));
  else Be = $[0];
  let checkedFilesRef = R(Be),
    We,
    ze;
  if (
    $[1] !== addNotification ||
    $[2] !== schedule ||
    $[3] !== host ||
    $[4] !== requestDialog ||
    $[5] !== storageV5 ||
    $[6] !== trackedFiles
  )
    ((We = () => {
      schedule("lsp", async () => {
        if (hasShownLspRecommendationThisSession()) {
          return;
        }
        let Xe = [];
        for (const rt of trackedFiles) {
          if (!checkedFilesRef.current.has(rt)) (checkedFilesRef.current.add(rt), Xe.push(rt));
        }
        for (const [kt, At] of Xe.entries()) {
          try {
            let Ot = (await getMatchingLspPlugins(host, At, storageV5))[0];
            if (Ot) {
              logForDebugging(`[useLspPluginRecommendation] Found match: ${Ot.pluginName} for ${At}`);
              let Et = {
                pluginId: Ot.pluginId,
                pluginName: Ot.pluginName,
                pluginDescription: Ot.description,
                marketplaceName: Ot.marketplaceName,
                fileExtension: extname(At),
              };
              let Dt = await requestDialog(
                LSP_RECOMMENDATION_DIALOG,
                {
                  pluginName: Et.pluginName,
                  pluginDescription: Et.pluginDescription,
                  marketplaceName: Et.marketplaceName,
                  fileExtension: Et.fileExtension,
                },
                { place: "under" },
              );
              if (Dt === "cancelled") {
                for (const Lt of Xe.slice(kt)) checkedFilesRef.current.delete(Lt);
                return;
              }
              (setLspRecommendationShownThisSession(!0),
                useLspPluginRecommendation(Et, Dt, addNotification, storageV5));
              return;
            }
          } catch (error) {
            let oo = error;
            logForDebugging(`[useLspPluginRecommendation] Failed to check for LSP plugins for ${At}: ${oo}`, {
              level: "error",
            });
          }
        }
      });
    }),
      (ze = [trackedFiles, schedule, requestDialog, addNotification, storageV5, host]),
      ($[1] = addNotification),
      ($[2] = schedule),
      ($[3] = host),
      ($[4] = requestDialog),
      ($[5] = storageV5),
      ($[6] = trackedFiles),
      ($[7] = We),
      ($[8] = ze));
  else ((We = $[7]), (ze = $[8]));
  P(We, ze);
}
//@ chunk-18hwfzwa.js:1803844-1804920 fingerprint = useLspPluginRecommendation (0.614)
function useLspPluginRecommendation({ pluginId: pluginId, pluginName: pluginName }, D, L, ee) {
  switch ((logForDebugging(`[useLspPluginRecommendation] User response: ${D} for ${pluginName}`), D)) {
    case "yes":
      installPluginAndNotify(
        pluginId,
        pluginName,
        "lsp-plugin",
        L,
        async (ke) => {
          logForDebugging(`[useLspPluginRecommendation] Installing plugin: ${pluginId}`);
          let matches = await loadKnownMarketplacesSafe(ee),
            Be;
          if (typeof ke.entry.source === "string") {
            let He = await resolvePluginEntryPath(
                pluginId,
                ke.marketplaceInstallLocation,
                ke.entry.source,
                matches,
                tryUnwrapTextPayload(),
                ee,
              ),
              We = entryPathOrReason(He);
            if (We.entryPath === void 0)
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `Plugin ${printableName(pluginId, 120)}: ${We.reason}`,
                "lsp plugin recommendation marketplace path refused",
              );
            Be = We.entryPath;
          }
          (await installPluginWithRecords(
            pluginId,
            ke.entry,
            "user",
            void 0,
            Be,
            void 0,
            void 0,
            ke.marketplaceInstallLocation,
            E$e(pluginId, matches),
            void 0,
            ee,
            { explicitInstall: !1 },
          ),
            await updateSettingsForSourceWithTransform(
              "userSettings",
              (response) => ({ enabledPlugins: { ...response?.enabledPlugins, [pluginId]: !0 } }),
              void 0,
              ee,
            ),
            logForDebugging(`[useLspPluginRecommendation] Plugin installed: ${pluginId}`));
        },
        ee,
      );
      break;
    case "no":
      break;
    case "timeout":
      (logForDebugging("[useLspPluginRecommendation] Auto-dismissed unanswered, incrementing ignored count"),
        incrementIgnoredCount(ee));
      break;
    case "never":
      addToNeverSuggest(pluginId, ee);
      break;
    case "disable":
      saveGlobalConfig((pluginData) => {
        if (pluginData.lspRecommendationDisabled) return pluginData;
        return { ...pluginData, lspRecommendationDisabled: !0 };
      }, ee);
      break;
  }
}

export { useLspRecommendationWatcher };
