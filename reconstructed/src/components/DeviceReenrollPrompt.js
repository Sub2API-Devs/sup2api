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
import { init_react_production, P, R } from "../../vendor/react/cjs/react.production.js";
import { useSelfOpenedDialog } from "../hooks/useSelfOpenedDialog.js";
import { logEvent } from "../services/analytics/index.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { Dialog } from "./design-system/Dialog.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { ModelSelector } from "./agents/ModelSelector.js";

//@ chunk-a401dt71.js:13676-13680 placement
init_react_production();
//@ chunk-a401dt71.js:13680-15364 placement
/**
 * 设备重新注册提示（选择、取消与上报）。
 */
function DeviceReenrollPrompt({ onDone, onCancel }) {
  let selfOpenedDialog = useSelfOpenedDialog(onDone, {
    selfOpened: true,
    onCancelled: () => {
      logEvent("tengu_device_reenroll_prompt", {
        choice: lit("cancelled"),
      });
      if (onCancel) {
        onCancel();
        return "not_now";
      }
    },
  });
  useKeybinding("confirm:no", () => i("not_now"), {
    context: "Confirmation",
    isActive: !selfOpenedDialog.decided,
  });
  P(() => {
    logEvent("tengu_device_reenroll_prompt_shown", {});
  }, []);
  let t = R(false);
  P(() => {
    t.current = true;
    return () => {
      t.current = false;
      queueMicrotask(() => {
        if (!t.current && !selfOpenedDialog.settled()) {
          logEvent("tengu_device_reenroll_prompt", {
            choice: lit("unmounted"),
          });
          selfOpenedDialog.handBack("not_now");
        }
      });
    };
  }, []);
  function i(u) {
    if (!selfOpenedDialog.take()) return;
    logEvent("tengu_device_reenroll_prompt", {
      choice: fromEnum(u),
    });
    selfOpenedDialog.handBack(u);
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
    title: "This computer was removed from your devices",
    onCancel: () => i("not_now"),
    isCancelActive: false,
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
            children:
              "It was removed on claude.ai, so cloud sessions started here can no longer use this computer.",
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children:
              "Register it again to let this and later cloud sessions use this computer. Choosing Not now starts this session in the cloud only, and the next claude --cloud start here asks again.",
          }),
        ],
      }),
      jsxProd_default(ModelSelector, {
        options: [
          {
            label: "Yes, register this computer again",
            value: "register",
          },
          {
            label: "Not now",
            value: "not_now",
          },
        ],
        defaultFocusValue: "not_now",
        hideIndexes: true,
        disablePrintableKeybindings: true,
        isDisabled: selfOpenedDialog.choicesDisabled,
        refuseInput: selfOpenedDialog.refuseInput,
        onChange: i,
      }),
    ],
  });
}
