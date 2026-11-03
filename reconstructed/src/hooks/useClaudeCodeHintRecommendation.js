/**
 * hooks/useClaudeCodeHintRecommendation.tsx
 *
 * 命令输出中的 Claude Code hint 触发插件推荐对话框（tengu_plugin_hint_response）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useClaudeCodeHintRecommendation.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { useSession } from "../context/session.js";
import { yt, P } from "../../vendor/react/cjs/react.production.js";
import { useNotifications } from "../context/notifications.js";
import { Me } from "../components/design-system/ThemeProvider.js";
import {
  maybeRecordPluginHint,
  resolvePluginHint,
  markHintPluginShown,
  disableHintRecommendations,
} from "../utils/plugins/hintRecommendation.js";
import { logForDebugging } from "../utils/debug.js";
import { HXe } from "../screens/replDialogState.js";
import { logEvent } from "../services/analytics/index.js";
import { parsePluginIdentifier } from "../utils/plugins/pluginIdentifier.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { installPluginAndNotify } from "./usePluginRecommendationBase.js";
import { installPluginFromMarketplace } from "../utils/plugins/pluginInstallationHelpers.js";

//@ chunk-18hwfzwa.js:1806264-1807723 fingerprint = useClaudeCodeHintRecommendation (0.695)
function useClaudeCodeHintRecommendation(h, x) {
  let $ = w(11),
    { pendingHint: pendingHint } = useSession(),
    L = yt(pendingHint.subscribe, pendingHint.getSnapshot),
    { addNotification: addNotification } = useNotifications(),
    { storageV5: storageV5 } = Me(),
    Be,
    He;
  if ($[0] !== pendingHint)
    ((Be = () => {
      let ze = () => {
        for (const We of pendingHint.takeSubmitted()) maybeRecordPluginHint(We, pendingHint);
      };
      return (ze(), pendingHint.subscribeSubmitted(ze));
    }),
      (He = [pendingHint]),
      ($[0] = pendingHint),
      ($[1] = Be),
      ($[2] = He));
  else ((Be = $[1]), (He = $[2]));
  P(Be, He);
  let Xe, rt;
  if (
    $[3] !== addNotification ||
    $[4] !== x ||
    $[5] !== pendingHint ||
    $[6] !== L ||
    $[7] !== h ||
    $[8] !== storageV5
  )
    ((Xe = () => {
      if (!L) {
        return;
      }
      x("hint", async () => {
        if (pendingHint.shownThisSession) {
          pendingHint.dismiss();
          return;
        }
        let kt = await resolvePluginHint(L, storageV5);
        if (kt)
          logForDebugging(
            `[useClaudeCodeHintRecommendation] surfacing ${kt.pluginId} from ${kt.sourceCommand}`,
          );
        if (pendingHint.pending === L) pendingHint.dismiss();
        if (!kt) {
          return;
        }
        let At = await h(
          HXe,
          {
            pluginName: kt.pluginName,
            pluginDescription: kt.pluginDescription,
            marketplaceName: kt.marketplaceName,
            sourceCommand: kt.sourceCommand,
          },
          { place: "under" },
        );
        if (At === "cancelled") {
          return;
        }
        oo: switch (
          (pendingHint.markShown(),
          markHintPluginShown(kt.pluginId, storageV5),
          logEvent("tengu_plugin_hint_response", {
            _PROTO_plugin_name: parsePluginIdentifier(kt.pluginId).name,
            _PROTO_marketplace_name: kt.marketplaceName,
            response: fromEnum(At),
          }),
          At)
        ) {
          case "yes": {
            let { pluginId: pluginId, pluginName: pluginName, marketplaceName: marketplaceName } = kt;
            installPluginAndNotify(
              pluginId,
              pluginName,
              "hint-plugin",
              addNotification,
              async (pluginData) => {
                let result = await installPluginFromMarketplace({
                  pluginId: pluginId,
                  entry: pluginData.entry,
                  marketplaceName: marketplaceName,
                  scope: "user",
                  trigger: "hint",
                  storageV5: storageV5,
                });
                if (!result.success) {
                  throw result.refusal ?? Error(result.error);
                }
              },
              storageV5,
            );
            break oo;
          }
          case "disable": {
            disableHintRecommendations(storageV5);
            break oo;
          }
          case "no":
        }
      });
    }),
      (rt = [L, pendingHint, x, h, addNotification, storageV5]),
      ($[3] = addNotification),
      ($[4] = x),
      ($[5] = pendingHint),
      ($[6] = L),
      ($[7] = h),
      ($[8] = storageV5),
      ($[9] = Xe),
      ($[10] = rt));
  else ((Xe = $[9]), (rt = $[10]));
  P(Xe, rt);
}

export { useClaudeCodeHintRecommendation };
