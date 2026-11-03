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
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import {
  maybeRecordPluginHint,
  resolvePluginHint,
  markHintPluginShown,
  disableHintRecommendations,
} from "../utils/plugins/hintRecommendation.js";
import { logForDebugging } from "../utils/debug.js";
import { PLUGIN_HINT_DIALOG } from "../screens/replDialogState.js";
import { logEvent } from "../services/analytics/index.js";
import { parsePluginIdentifier } from "../utils/plugins/pluginIdentifier.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { installPluginAndNotify } from "./usePluginRecommendationBase.js";
import { installPluginFromMarketplace } from "../utils/plugins/pluginInstallationHelpers.js";

//@ chunk-18hwfzwa.js:1806264-1807723 fingerprint = useClaudeCodeHintRecommendation (0.695)
function useClaudeCodeHintRecommendation(requestDialog, recommendationGate) {
  let $ = w(11);
  let { pendingHint } = useSession();
  let hint = yt(pendingHint.subscribe, pendingHint.getSnapshot);
  let { addNotification } = useNotifications();
  let { storageV5 } = useTheme_2();
  let Be;
  let He;
  if ($[0] !== pendingHint) {
    Be = () => {
      let ze = () => {
        for (const We of pendingHint.takeSubmitted()) maybeRecordPluginHint(We, pendingHint);
      };
      ze();
      return pendingHint.subscribeSubmitted(ze);
    };
    He = [pendingHint];
    $[0] = pendingHint;
    $[1] = Be;
    $[2] = He;
  } else {
    Be = $[1];
    He = $[2];
  }
  P(Be, He);
  let Xe;
  let rt;
  if (
    $[3] !== addNotification ||
    $[4] !== recommendationGate ||
    $[5] !== pendingHint ||
    $[6] !== hint ||
    $[7] !== requestDialog ||
    $[8] !== storageV5
  ) {
    Xe = () => {
      if (!hint) {
        return;
      }
      recommendationGate("hint", async () => {
        if (pendingHint.shownThisSession) {
          pendingHint.dismiss();
          return;
        }
        let pluginHint = await resolvePluginHint(hint, storageV5);
        if (pluginHint)
          logForDebugging(
            `[useClaudeCodeHintRecommendation] surfacing ${pluginHint.pluginId} from ${pluginHint.sourceCommand}`,
          );
        if (pendingHint.pending === hint) pendingHint.dismiss();
        if (!pluginHint) {
          return;
        }
        let At = await requestDialog(
          PLUGIN_HINT_DIALOG,
          {
            pluginName: pluginHint.pluginName,
            pluginDescription: pluginHint.pluginDescription,
            marketplaceName: pluginHint.marketplaceName,
            sourceCommand: pluginHint.sourceCommand,
          },
          {
            place: "under",
          },
        );
        if (At === "cancelled") {
          return;
        }
        oo: switch (
          (pendingHint.markShown(),
          markHintPluginShown(pluginHint.pluginId, storageV5),
          logEvent("tengu_plugin_hint_response", {
            _PROTO_plugin_name: parsePluginIdentifier(pluginHint.pluginId).name,
            _PROTO_marketplace_name: pluginHint.marketplaceName,
            response: fromEnum(At),
          }),
          At)
        ) {
          case "yes": {
            let { pluginId, pluginName, marketplaceName } = pluginHint;
            installPluginAndNotify(
              pluginId,
              pluginName,
              "hint-plugin",
              addNotification,
              async (pluginData) => {
                let result = await installPluginFromMarketplace({
                  pluginId,
                  entry: pluginData.entry,
                  marketplaceName,
                  scope: "user",
                  trigger: "hint",
                  storageV5,
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
    };
    rt = [hint, pendingHint, recommendationGate, requestDialog, addNotification, storageV5];
    $[3] = addNotification;
    $[4] = recommendationGate;
    $[5] = pendingHint;
    $[6] = hint;
    $[7] = requestDialog;
    $[8] = storageV5;
    $[9] = Xe;
    $[10] = rt;
  } else {
    Xe = $[9];
    rt = $[10];
  }
  P(Xe, rt);
}
export { useClaudeCodeHintRecommendation };
