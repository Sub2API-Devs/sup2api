/**
 * components/RemoteHomeSettingsDialog.tsx
 *
 * 2.1.316 新增：远程 home 设置对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jz14stsh.js (2)
 * attribution: placement 2
 */
import { init_react_production, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useSelfOpenedDialog } from "../hooks/useSelfOpenedDialog.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { saveHomeSettingsMode } from "../utils/teleport/homeSettingsMode.js";
import { logError } from "../utils/log.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { Dialog } from "./design-system/Dialog.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { stripInvisibleChars } from "../utils/invisibleChars.js";
import { ModelSelector } from "./agents/ModelSelector.js";

//@ chunk-jz14stsh.js:771-775 placement
init_react_production();
//@ chunk-jz14stsh.js:775-3534 placement
function RemoteHomeSettingsDialog({ configHome, storageV5, origin, onDone }) {
  let isFirstRun = origin === "first_run";
  let selfOpenedDialog = useSelfOpenedDialog(onDone, {
    selfOpened: isFirstRun,
    onCancelled: (result) =>
      logFeatureSad("ccr_home_seed_mode_prompt", result ? "cancelled_saving" : "cancelled"),
  });
  useKeybinding("confirm:no", () => answer("not_now"), {
    context: "Confirmation",
    isActive: isFirstRun && !selfOpenedDialog.decided,
  });
  useEffect(() => {
    logEvent("tengu_home_settings_mode_prompt_shown", {
      origin: fromEnum(origin),
    });
  }, [origin]);
  function answer(mode) {
    if (!selfOpenedDialog.take()) return;
    logEvent("tengu_home_settings_mode_prompt", {
      choice: fromEnum(mode),
      origin: fromEnum(origin),
    });
    if (mode === "not_now") {
      logFeatureSad("ccr_home_seed_mode_prompt", "dismissed");
      selfOpenedDialog.handBack(mode);
      return;
    }
    saveHomeSettingsMode(mode, storageV5).then(
      (choice) => {
        if (selfOpenedDialog.settled()) return;
        switch (choice) {
          case "refused":
            logFeatureBad("ccr_home_seed_mode_prompt", "not_written");
            selfOpenedDialog.handBack("not_saved");
            return;
          case "not_stored":
            logFeatureBad("ccr_home_seed_mode_prompt", "not_stored");
            selfOpenedDialog.handBack("not_stored");
            return;
          case "unconfirmed":
            logFeatureSad("ccr_home_seed_mode_prompt", "unconfirmed");
            break;
          case "written":
            if (mode === "forward") logFeatureOk("ccr_home_seed_mode_prompt");
            else logFeatureSad("ccr_home_seed_mode_prompt", "declined");
            break;
        }
        selfOpenedDialog.handBack(mode);
      },
      (error) => {
        logError(error);
        if (selfOpenedDialog.settled()) return;
        logFeatureBad("ccr_home_seed_mode_prompt", "write_failed");
        selfOpenedDialog.handBack("not_saved");
      },
    );
  }
  if (selfOpenedDialog.decided)
    return selfOpenedDialog.exitHintShowing
      ? jsxProd_default_2(Text, {
          dimColor: true,
          italic: true,
          children: ["Press ", selfOpenedDialog.exit.keyName, " again to exit"],
        })
      : null;
  return jsxProd_default_2(Dialog, {
    title: "Use this machine's settings in cloud sessions?",
    onCancel: () => answer("not_now"),
    isCancelActive: !isFirstRun,
    inputGuide: selfOpenedDialog.exit.pending
      ? jsxProd_default_2(Text, {
          children: ["Press ", selfOpenedDialog.exit.keyName, " again to exit"],
        })
      : jsxProd_default_2(Byline, {
          children: [
            jsxProd_default(KeyboardShortcutHint, {
              chord: "enter",
              action: "confirm",
            }),
            jsxProd_default(ConfigurableShortcutHint, {
              action: "confirm:no",
              context: "Confirmation",
              fallback: "Esc",
              description: "skip for now",
            }),
          ],
        }),
    children: [
      jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          jsxProd_default(Text, {
            bold: true,
            children: stripInvisibleChars(configHome),
          }),
          jsxProd_default(Text, {
            children:
              "Send the CLAUDE.md, rules, output styles, and preferences in this folder, plus your portable permission rules, into each claude --cloud session. It skips credential files and files your Read rules or sandbox settings deny (your preferences and permission rules are still sent), never sends hooks, environment variables, MCP servers, or plugins, and copies no file from outside this folder, even through a link or an @import. Deny and ask rules can go with their paths; file rules need a ~/ or relative path. What is sent is encrypted at rest, and each launch shows whether it was sent.",
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children:
              "Without this, cloud sessions keep their own default settings, as they do today. Yes and No are saved for this machine; /config changes it later, from a session started without --cloud.",
          }),
        ],
      }),
      jsxProd_default(ModelSelector, {
        options: [
          {
            label: "Yes, send my settings",
            value: "forward",
          },
          {
            label: "No, keep them on this machine",
            value: "keep_local",
          },
          {
            label: "Not now",
            value: "not_now",
          },
        ],
        defaultFocusValue: "not_now",
        hideIndexes: isFirstRun,
        disablePrintableKeybindings: isFirstRun,
        isDisabled: selfOpenedDialog.choicesDisabled,
        refuseInput: selfOpenedDialog.refuseInput,
        onChange: answer,
        onCancel: () => answer("not_now"),
      }),
    ],
  });
}
export { RemoteHomeSettingsDialog };
