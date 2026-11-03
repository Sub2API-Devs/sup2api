/**
 * components/DeviceMcpConsentDialog.tsx
 *
 * 2.1.316 新增：云端会话使用本机 MCP 服务器的同意对话框
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tmg3f18n.js (4)
 * attribution: placement 4
 */
import { j, P } from "../../vendor/react/cjs/react.production.js";
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
  t9,
  tAs,
  _0n,
} from "../services/deviceBridge/deviceMcpConsent.js";
import { logError } from "../utils/log.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { Dialog } from "./design-system/Dialog.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { ModelSelector } from "./agents/ModelSelector.js";

//@ chunk-tmg3f18n.js:14337-14341 placement
j();
//@ chunk-tmg3f18n.js:14341-14349 placement
var m = 8;
//@ chunk-tmg3f18n.js:14349-14546 placement
function describeMcpScopeOwner(d) {
  switch (d) {
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
/**
 * 询问是否让云端会话使用本机 MCP 服务器的同意对话框。
 */
//@ chunk-tmg3f18n.js:14546-17127 placement
function DeviceMcpConsentDialog({ servers: servers, storageV5: storageV5, onDone: onDone }) {
  let o = useSelfOpenedDialog(onDone, {
    selfOpened: !0,
    onCancelled: (t) =>
      logEvent("tengu_device_mcp_consent_prompt", { choice: t ? lit("cancelled_saving") : lit("cancelled") }),
  });
  (useKeybinding("confirm:no", () => p("not_now"), { context: "Confirmation", isActive: !o.decided }),
    P(() => {
      logEvent("tengu_device_mcp_consent_prompt_shown", { server_count: servers.length });
    }, [servers.length]));
  function p(t) {
    if (!o.take()) return;
    logEvent("tengu_device_mcp_consent_prompt", { choice: fromEnum(t) });
    let f = deviceMcpConsentStore(storageV5),
      h = deviceMcpNotNowStore(storageV5);
    if (t === "not_now") {
      (deviceMcpConsentAnswer(f)
        .then((i) =>
          i === "unset"
            ? writeDeviceMcpNotNow(
                servers.map((g) => g.name),
                h,
              )
            : void 0,
        )
        .then(void 0, (i) => logError(i)),
        o.handBack(t));
      return;
    }
    writeDeviceMcpConsent(t, f).then(
      (i) => {
        if (i) clearDeviceMcpNotNow(h);
        if (o.settled()) return;
        if (!i) logEvent("tengu_device_mcp_consent_prompt", { choice: lit("write_failed") });
        o.handBack(i ? t : "not_now");
      },
      (i) => {
        (logError(i), o.handBack("not_now"));
      },
    );
  }
  if (o.decided)
    return o.exitHintShowing
      ? r(Text, { dimColor: !0, italic: !0, children: ["Press ", o.exit.keyName, " again to exit"] })
      : null;
  let sliced = servers.slice(0, m);
  return r(Dialog, {
    title: "Let cloud sessions use this machine's MCP servers?",
    onCancel: () => p("not_now"),
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
              "Cloud sessions you start with claude --cloud from this machine can call the MCP servers configured here, and any you add later. They keep running on this machine with the logins saved here. This machine's own allow, deny and ask rules for these tools decide, exactly as in a local session; without an allow rule you're asked in the session first. Servers deployed by an administrator are never offered.",
          }),
          r(Box, {
            flexDirection: "column",
            children: [
              sliced.map((t) =>
                r(
                  Text,
                  {
                    children: [
                      "\xB7 ",
                      t9(t.name),
                      " ",
                      r(Text, { dimColor: !0, children: ["(", describeMcpScopeOwner(t.scope), ")"] }),
                    ],
                  },
                  t.name,
                ),
              ),
              servers.length > m
                ? r(Text, { dimColor: !0, children: ["\u2026 and ", servers.length - m, " more"] })
                : null,
            ],
          }),
          r(Text, {
            dimColor: !0,
            children: [
              "Without this, cloud sessions see none of this machine's MCP servers. Servers a project defines are not offered yet. Yes and No are saved for this machine; to change the answer later,",
              " ",
              tAs(),
              ". Not now waits until you add an MCP server; to be asked sooner, ",
              _0n(),
              ".",
            ],
          }),
        ],
      }),
      e(ModelSelector, {
        options: [
          { label: "Yes, offer this machine's MCP servers", value: "accepted" },
          { label: "No, keep them to this machine", value: "declined" },
          { label: "Not now", value: "not_now" },
        ],
        defaultFocusValue: "not_now",
        hideIndexes: !0,
        disablePrintableKeybindings: !0,
        isDisabled: o.choicesDisabled,
        refuseInput: o.refuseInput,
        onChange: p,
      }),
    ],
  });
}
