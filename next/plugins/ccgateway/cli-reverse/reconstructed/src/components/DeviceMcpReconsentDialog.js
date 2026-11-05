/**
 * components/DeviceMcpReconsentDialog.tsx
 *
 * 2.1.316 新增：设备 MCP 重新同意对话框。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-47qxazwg.js (4)
 * attribution: placement 4
 */
import { init_react_production, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useSelfOpenedDialog } from "../hooks/useSelfOpenedDialog.js";
import { logEvent } from "../services/analytics/index.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import {
  createSnapshotStore,
  readDeviceMcpSnapshot,
  writeDeviceMcpSnapshot,
  applyConsentChoice,
  resetSnapshotHint,
} from "../services/deviceBridge/deviceMcpSnapshot.js";
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
import { shortServerLabel } from "../services/deviceBridge/deviceMcpConsent.js";
import { ModelSelector } from "./agents/ModelSelector.js";

//@ chunk-47qxazwg.js:15534-15538 placement
init_react_production();
//@ chunk-47qxazwg.js:15538-15550 placement
var MAX_LISTED_RECONSENT_KEYS = 6;
var _ = 3;
//@ chunk-47qxazwg.js:15550-17942 placement
function DeviceMcpReconsentDialog({ withheld, storageV5, onDone }) {
  let selfOpenedDialog = useSelfOpenedDialog(onDone, {
    selfOpened: true,
    onCancelled: (wasSaving) =>
      logEvent("tengu_device_mcp_reconsent_prompt", {
        choice: wasSaving ? lit("cancelled_saving") : lit("cancelled"),
      }),
  });
  useKeybinding("confirm:no", () => answerChoice("not_now"), {
    context: "Confirmation",
    isActive: !selfOpenedDialog.decided,
  });
  let keys = Object.keys(withheld);
  useEffect(() => {
    logEvent("tengu_device_mcp_reconsent_prompt_shown", {
      server_count: keys.length,
    });
  }, [keys.length]);
  function answerChoice(choice) {
    if (!selfOpenedDialog.take()) return;
    logEvent("tengu_device_mcp_reconsent_prompt", {
      choice: fromEnum(choice),
    });
    if (choice === "not_now") {
      selfOpenedDialog.handBack(choice);
      return;
    }
    let snapshotStore = createSnapshotStore(storageV5);
    readDeviceMcpSnapshot(snapshotStore)
      .then((snapshot) =>
        snapshot === "unreadable"
          ? undefined
          : writeDeviceMcpSnapshot(applyConsentChoice(snapshot, keys, choice), snapshotStore),
      )
      .then(
        () => {
          if (!selfOpenedDialog.settled()) selfOpenedDialog.handBack(choice);
        },
        (error) => {
          logError(error);
          selfOpenedDialog.handBack("not_now");
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
  let sliced = keys.slice(0, MAX_LISTED_RECONSENT_KEYS);
  let isSingleServer = keys.length === 1;
  return jsxProd_default_2(Dialog, {
    title: isSingleServer
      ? "An MCP server on this machine changed its tools"
      : "MCP servers on this machine changed their tools",
    onCancel: () => answerChoice("not_now"),
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
          jsxProd_default_2(Text, {
            children: [
              isSingleServer ? "This server has" : "These servers have",
              " changed the tools",
              " ",
              isSingleServer ? "it lists" : "they list",
              " \u2014 new tools, or new descriptions \u2014 since you approved offering this machine's MCP servers to cloud sessions. ",
              isSingleServer ? "It is" : "They are",
              " not offered until you say so. Tool descriptions reach the model as text; approve only servers you trust.",
            ],
          }),
          jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              sliced.map((serverName) =>
                jsxProd_default_2(
                  Text,
                  {
                    children: [
                      "\xB7 ",
                      shortServerLabel(serverName),
                      " ",
                      jsxProd_default(Text, {
                        dimColor: true,
                        children: summarizeMcpChanges(withheld[serverName]),
                      }),
                    ],
                  },
                  serverName,
                ),
              ),
              keys.length > MAX_LISTED_RECONSENT_KEYS
                ? jsxProd_default_2(Text, {
                    dimColor: true,
                    children: ["\u2026 and ", keys.length - MAX_LISTED_RECONSENT_KEYS, " more"],
                  })
                : null,
            ],
          }),
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "Other servers you approved are still offered. Yes and No are saved for this machine; to undo a No later, ",
              resetSnapshotHint(),
              ".",
            ],
          }),
        ],
      }),
      jsxProd_default(ModelSelector, {
        options: [
          {
            label: isSingleServer ? "Yes, keep offering this server" : "Yes, keep offering these servers",
            value: "accepted",
          },
          {
            label: isSingleServer
              ? "No, stop offering this server to cloud sessions"
              : "No, stop offering these servers to cloud sessions",
            value: "declined",
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
        onChange: answerChoice,
      }),
    ],
  });
}
//@ chunk-47qxazwg.js:17942-18225 placement
/**
 * 概括新增/变更的设备 MCP 服务器：“(N new, M changed: 名字…)”，超过上限加省略号。
 */
function summarizeMcpChanges(changes) {
  let parts = [];
  if (changes.added.length > 0) parts.push(`${changes.added.length} new`);
  if (changes.changed.length > 0) parts.push(`${changes.changed.length} changed`);
  let joined = [...changes.added, ...changes.changed].slice(0, _).map(shortServerLabel).join(", ");
  let ellipsis = changes.added.length + changes.changed.length > _ ? ", \u2026" : "";
  return `(${parts.join(", ")}: ${joined}${ellipsis})`;
}
export { DeviceMcpReconsentDialog };
