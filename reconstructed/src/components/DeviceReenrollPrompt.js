/**
 * components/DeviceReenrollPrompt.tsx
 *
 * 2.1.316 新增：设备被移除后的重新注册提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a401dt71.js (2)
 * attribution: placement 2
 */
import { j, P, R } from "../../vendor/react/cjs/react.production.js";
import { useSelfOpenedDialog } from "../hooks/useSelfOpenedDialog.js";
import { logEvent } from "../services/analytics/index.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { Dialog } from "./design-system/Dialog.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { ModelSelector } from "./agents/ModelSelector.js";

//@ chunk-a401dt71.js:13676-13680 placement
j();
/**
 * 设备重新注册提示（选择、取消与上报）。
 */
//@ chunk-a401dt71.js:13680-15364 placement
function DeviceReenrollPrompt({ onDone: onDone, onCancel: onCancel }) {
  let o = useSelfOpenedDialog(onDone, {
    selfOpened: !0,
    onCancelled: () => {
      if ((logEvent("tengu_device_reenroll_prompt", { choice: lit("cancelled") }), onCancel))
        return (onCancel(), "not_now");
    },
  });
  (useKeybinding("confirm:no", () => i("not_now"), { context: "Confirmation", isActive: !o.decided }),
    P(() => {
      logEvent("tengu_device_reenroll_prompt_shown", {});
    }, []));
  let t = R(!1);
  P(
    () => (
      (t.current = !0),
      () => {
        ((t.current = !1),
          queueMicrotask(() => {
            if (!t.current && !o.settled())
              (logEvent("tengu_device_reenroll_prompt", { choice: lit("unmounted") }), o.handBack("not_now"));
          }));
      }
    ),
    [],
  );
  function i(u) {
    if (!o.take()) return;
    (logEvent("tengu_device_reenroll_prompt", { choice: fromEnum(u) }), o.handBack(u));
  }
  if (o.decided)
    return o.exitHintShowing
      ? r(Text, { dimColor: !0, italic: !0, children: ["Press ", o.exit.keyName, " again to exit"] })
      : null;
  return r(Dialog, {
    title: "This computer was removed from your devices",
    onCancel: () => i("not_now"),
    isCancelActive: !1,
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
          e(Text, {
            children:
              "It was removed on claude.ai, so cloud sessions started here can no longer use this computer.",
          }),
          e(Text, {
            dimColor: !0,
            children:
              "Register it again to let this and later cloud sessions use this computer. Choosing Not now starts this session in the cloud only, and the next claude --cloud start here asks again.",
          }),
        ],
      }),
      e(ModelSelector, {
        options: [
          { label: "Yes, register this computer again", value: "register" },
          { label: "Not now", value: "not_now" },
        ],
        defaultFocusValue: "not_now",
        hideIndexes: !0,
        disablePrintableKeybindings: !0,
        isDisabled: o.choicesDisabled,
        refuseInput: o.refuseInput,
        onChange: i,
      }),
    ],
  });
}
