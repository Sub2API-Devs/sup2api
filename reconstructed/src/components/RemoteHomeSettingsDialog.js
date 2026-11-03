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
import { j, P } from "../../vendor/react/cjs/react.production.js";
import { useSelfOpenedDialog } from "../hooks/useSelfOpenedDialog.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { saveHomeSettingsMode } from "../utils/teleport/homeSettingsMode.js";
import { logError } from "../utils/log.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { Dialog } from "./design-system/Dialog.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { hr } from "../utils/invisibleChars.js";
import { ModelSelector } from "./agents/ModelSelector.js";

//@ chunk-jz14stsh.js:771-775 placement
j();
//@ chunk-jz14stsh.js:775-3534 placement
function RemoteHomeSettingsDialog({
  configHome: configHome,
  storageV5: storageV5,
  origin: origin,
  onDone: onDone,
}) {
  let i = origin === "first_run",
    o = useSelfOpenedDialog(onDone, {
      selfOpened: i,
      onCancelled: (t) => logFeatureSad("ccr_home_seed_mode_prompt", t ? "cancelled_saving" : "cancelled"),
    });
  (useKeybinding("confirm:no", () => p("not_now"), { context: "Confirmation", isActive: i && !o.decided }),
    P(() => {
      logEvent("tengu_home_settings_mode_prompt_shown", { origin: fromEnum(origin) });
    }, [origin]));
  function p(t) {
    if (!o.take()) return;
    if (
      (logEvent("tengu_home_settings_mode_prompt", { choice: fromEnum(t), origin: fromEnum(origin) }),
      t === "not_now")
    ) {
      (logFeatureSad("ccr_home_seed_mode_prompt", "dismissed"), o.handBack(t));
      return;
    }
    saveHomeSettingsMode(t, storageV5).then(
      (u) => {
        if (o.settled()) return;
        switch (u) {
          case "refused":
            (logFeatureBad("ccr_home_seed_mode_prompt", "not_written"), o.handBack("not_saved"));
            return;
          case "not_stored":
            (logFeatureBad("ccr_home_seed_mode_prompt", "not_stored"), o.handBack("not_stored"));
            return;
          case "unconfirmed":
            logFeatureSad("ccr_home_seed_mode_prompt", "unconfirmed");
            break;
          case "written":
            if (t === "forward") logFeatureOk("ccr_home_seed_mode_prompt");
            else logFeatureSad("ccr_home_seed_mode_prompt", "declined");
            break;
        }
        o.handBack(t);
      },
      (u) => {
        if ((logError(u), o.settled())) return;
        (logFeatureBad("ccr_home_seed_mode_prompt", "write_failed"), o.handBack("not_saved"));
      },
    );
  }
  if (o.decided)
    return o.exitHintShowing
      ? r(Text, { dimColor: !0, italic: !0, children: ["Press ", o.exit.keyName, " again to exit"] })
      : null;
  return r(Dialog, {
    title: "Use this machine's settings in cloud sessions?",
    onCancel: () => p("not_now"),
    isCancelActive: !i,
    inputGuide: o.exit.pending
      ? r(Text, { children: ["Press ", o.exit.keyName, " again to exit"] })
      : r(Byline, {
          children: [
            e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
            e(ConfigurableShortcutHint, {
              action: "confirm:no",
              context: "Confirmation",
              fallback: "Esc",
              description: "skip for now",
            }),
          ],
        }),
    children: [
      r(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          e(Text, { bold: !0, children: hr(configHome) }),
          e(Text, {
            children:
              "Send the CLAUDE.md, rules, output styles, and preferences in this folder, plus your portable permission rules, into each claude --cloud session. It skips credential files and files your Read rules or sandbox settings deny (your preferences and permission rules are still sent), never sends hooks, environment variables, MCP servers, or plugins, and copies no file from outside this folder, even through a link or an @import. Deny and ask rules can go with their paths; file rules need a ~/ or relative path. What is sent is encrypted at rest, and each launch shows whether it was sent.",
          }),
          e(Text, {
            dimColor: !0,
            children:
              "Without this, cloud sessions keep their own default settings, as they do today. Yes and No are saved for this machine; /config changes it later, from a session started without --cloud.",
          }),
        ],
      }),
      e(ModelSelector, {
        options: [
          { label: "Yes, send my settings", value: "forward" },
          { label: "No, keep them on this machine", value: "keep_local" },
          { label: "Not now", value: "not_now" },
        ],
        defaultFocusValue: "not_now",
        hideIndexes: i,
        disablePrintableKeybindings: i,
        isDisabled: o.choicesDisabled,
        refuseInput: o.refuseInput,
        onChange: p,
        onCancel: () => p("not_now"),
      }),
    ],
  });
}

export { RemoteHomeSettingsDialog };
