/**
 * components/DeviceMcpConsentDialog.tsx
 *
 * 2.1.316 新增：云端会话使用本机 MCP 服务器的同意对话框
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-e6b8wm2j.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useSelfOpenedDialog } from "../hooks/useSelfOpenedDialog.js";
import { logEvent } from "../services/analytics/index.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import {
  deviceMcpConsentStore,
  deviceMcpNotNowStore,
  deviceMcpConsentAnswer,
  writeDeviceMcpNotNow,
  writeDeviceMcpConsent,
  clearDeviceMcpNotNow,
  shortServerLabel,
  deleteConsentHint,
  deleteNotNowHint,
} from "../services/deviceBridge/deviceMcpConsent.js";
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
import { ModelSelector } from "./agents/ModelSelector.js";

//@ chunk-e6b8wm2j.js:15513-15517 placement
init_react_production();
//@ chunk-e6b8wm2j.js:15517-15525 placement
var MAX_LISTED_CONSENT_SERVERS = 8;
//@ chunk-e6b8wm2j.js:15525-15722 placement
function describeMcpScopeOwner(scope) {
  switch (scope) {
    case "user":
    case "local":
      return "yours";
    case "project":
      return "this project";
    case "dynamic":
      return "plugin or command line";
    case "claudeai":
      return "claude.ai";
    default:
      return "other";
  }
}
//@ chunk-e6b8wm2j.js:15722-18303 placement
/**
 * 询问是否让云端会话使用本机 MCP 服务器的同意对话框。
 */
function DeviceMcpConsentDialog({ servers, storageV5, onDone }) {
  let selfOpenedDialog = useSelfOpenedDialog(onDone, {
    selfOpened: true,
    onCancelled: (wasSaving) =>
      logEvent("tengu_device_mcp_consent_prompt", {
        choice: wasSaving ? lit("cancelled_saving") : lit("cancelled"),
      }),
  });
  useKeybinding("confirm:no", () => answerChoice("not_now"), {
    context: "Confirmation",
    isActive: !selfOpenedDialog.decided,
  });
  useEffect(() => {
    logEvent("tengu_device_mcp_consent_prompt_shown", {
      server_count: servers.length,
    });
  }, [servers.length]);
  function answerChoice(choice) {
    if (!selfOpenedDialog.take()) return;
    logEvent("tengu_device_mcp_consent_prompt", {
      choice: fromEnum(choice),
    });
    let consentStore = deviceMcpConsentStore(storageV5);
    let notNowStore = deviceMcpNotNowStore(storageV5);
    if (choice === "not_now") {
      deviceMcpConsentAnswer(consentStore)
        .then((currentAnswer) =>
          currentAnswer === "unset"
            ? writeDeviceMcpNotNow(
                servers.map((server) => server.name),
                notNowStore,
              )
            : undefined,
        )
        .then(undefined, (error) => logError(error));
      selfOpenedDialog.handBack(choice);
      return;
    }
    writeDeviceMcpConsent(choice, consentStore).then(
      (written) => {
        if (written) clearDeviceMcpNotNow(notNowStore);
        if (selfOpenedDialog.settled()) return;
        if (!written)
          logEvent("tengu_device_mcp_consent_prompt", {
            choice: lit("write_failed"),
          });
        selfOpenedDialog.handBack(written ? choice : "not_now");
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
  let sliced = servers.slice(0, MAX_LISTED_CONSENT_SERVERS);
  return jsxProd_default_2(Dialog, {
    title: "Let cloud sessions use this machine's MCP servers?",
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
          jsxProd_default(Text, {
            children:
              "Cloud sessions you start with claude --cloud from this machine can call the MCP servers configured here, and any you add later. They keep running on this machine with the logins saved here. This machine's own allow, deny and ask rules for these tools decide, exactly as in a local session; without an allow rule you're asked in the session first. Servers deployed by an administrator are never offered.",
          }),
          jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              sliced.map((server) =>
                jsxProd_default_2(
                  Text,
                  {
                    children: [
                      "\xB7 ",
                      shortServerLabel(server.name),
                      " ",
                      jsxProd_default_2(Text, {
                        dimColor: true,
                        children: ["(", describeMcpScopeOwner(server.scope), ")"],
                      }),
                    ],
                  },
                  server.name,
                ),
              ),
              servers.length > MAX_LISTED_CONSENT_SERVERS
                ? jsxProd_default_2(Text, {
                    dimColor: true,
                    children: ["\u2026 and ", servers.length - MAX_LISTED_CONSENT_SERVERS, " more"],
                  })
                : null,
            ],
          }),
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "Without this, cloud sessions see none of this machine's MCP servers. Servers a project defines are not offered yet. Yes and No are saved for this machine; to change the answer later,",
              " ",
              deleteConsentHint(),
              ". Not now waits until you add an MCP server; to be asked sooner, ",
              deleteNotNowHint(),
              ".",
            ],
          }),
        ],
      }),
      jsxProd_default(ModelSelector, {
        options: [
          {
            label: "Yes, offer this machine's MCP servers",
            value: "accepted",
          },
          {
            label: "No, keep them to this machine",
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
export { DeviceMcpConsentDialog };
