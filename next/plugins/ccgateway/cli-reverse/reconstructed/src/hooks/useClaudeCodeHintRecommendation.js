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
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useSession } from "../context/session.js";
import { useSyncExternalStore, useEffect } from "../../vendor/react/cjs/react.production.js";
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

//@ chunk-18hwfzwa.js:1806264-1807723 fingerprint (2.1.88 match: useClaudeCodeHintRecommendation, 0.695)
function useClaudeCodeHintRecommendation(requestDialog, recommendationGate) {
  let $ = useMemoCache(11);
  let { pendingHint } = useSession();
  let hint = useSyncExternalStore(pendingHint.subscribe, pendingHint.getSnapshot);
  let { addNotification } = useNotifications();
  let { storageV5 } = useTheme_2();
  let subscribeEffect;
  let subscribeDeps;
  if ($[0] !== pendingHint) {
    subscribeEffect = () => {
      let onSubmitted = () => {
        for (const text of pendingHint.takeSubmitted()) maybeRecordPluginHint(text, pendingHint);
      };
      onSubmitted();
      return pendingHint.subscribeSubmitted(onSubmitted);
    };
    subscribeDeps = [pendingHint];
    $[0] = pendingHint;
    $[1] = subscribeEffect;
    $[2] = subscribeDeps;
  } else {
    subscribeEffect = $[1];
    subscribeDeps = $[2];
  }
  useEffect(subscribeEffect, subscribeDeps);
  let hintEffect;
  let hintDeps;
  if (
    $[3] !== addNotification ||
    $[4] !== recommendationGate ||
    $[5] !== pendingHint ||
    $[6] !== hint ||
    $[7] !== requestDialog ||
    $[8] !== storageV5
  ) {
    hintEffect = () => {
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
        let response = await requestDialog(
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
        if (response === "cancelled") {
          return;
        }
        oo: switch (
          (pendingHint.markShown(),
          markHintPluginShown(pluginHint.pluginId, storageV5),
          logEvent("tengu_plugin_hint_response", {
            _PROTO_plugin_name: parsePluginIdentifier(pluginHint.pluginId).name,
            _PROTO_marketplace_name: pluginHint.marketplaceName,
            response: fromEnum(response),
          }),
          response)
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
    hintDeps = [hint, pendingHint, recommendationGate, requestDialog, addNotification, storageV5];
    $[3] = addNotification;
    $[4] = recommendationGate;
    $[5] = pendingHint;
    $[6] = hint;
    $[7] = requestDialog;
    $[8] = storageV5;
    $[9] = hintEffect;
    $[10] = hintDeps;
  } else {
    hintEffect = $[9];
    hintDeps = $[10];
  }
  useEffect(hintEffect, hintDeps);
}
export { useClaudeCodeHintRecommendation };
