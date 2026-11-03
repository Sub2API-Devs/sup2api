/**
 * components/DeviceMcpReconsentDialog.tsx
 *
 * 2.1.316 新增：设备 MCP 重新同意对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e7qhpt47.js (4)
 * attribution: placement 4
 */
import { j, P } from "../../vendor/react/cjs/react.production.js";
import { useSelfOpenedDialog } from "../hooks/useSelfOpenedDialog.js";
import { logEvent } from "../services/analytics/index.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import {
  createSnapshotStore,
  readDeviceMcpSnapshot,
  writeDeviceMcpSnapshot,
  applyConsentChoice,
  VTs,
} from "../services/deviceBridge/deviceMcpSnapshot.js";
import { logError } from "../utils/log.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { Dialog } from "./design-system/Dialog.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { t9 } from "../services/deviceBridge/deviceMcpConsent.js";
import { ModelSelector } from "./agents/ModelSelector.js";

//@ chunk-e7qhpt47.js:14358-14362 placement
j();
//@ chunk-e7qhpt47.js:14362-14374 placement
var g = 6,
  _ = 3;
//@ chunk-e7qhpt47.js:14374-16766 placement
function DeviceMcpReconsentDialog({ withheld: withheld, storageV5: storageV5, onDone: onDone }) {
  let o = useSelfOpenedDialog(onDone, {
    selfOpened: !0,
    onCancelled: (i) =>
      logEvent("tengu_device_mcp_reconsent_prompt", {
        choice: i ? lit("cancelled_saving") : lit("cancelled"),
      }),
  });
  useKeybinding("confirm:no", () => u("not_now"), { context: "Confirmation", isActive: !o.decided });
  let keys = Object.keys(withheld);
  P(() => {
    logEvent("tengu_device_mcp_reconsent_prompt_shown", { server_count: keys.length });
  }, [keys.length]);
  function u(i) {
    if (!o.take()) return;
    if ((logEvent("tengu_device_mcp_reconsent_prompt", { choice: fromEnum(i) }), i === "not_now")) {
      o.handBack(i);
      return;
    }
    let v = createSnapshotStore(storageV5);
    readDeviceMcpSnapshot(v)
      .then((h) => (h === "unreadable" ? void 0 : writeDeviceMcpSnapshot(applyConsentChoice(h, keys, i), v)))
      .then(
        () => {
          if (!o.settled()) o.handBack(i);
        },
        (h) => {
          (logError(h), o.handBack("not_now"));
        },
      );
  }
  if (o.decided)
    return o.exitHintShowing
      ? r(Text, { dimColor: !0, italic: !0, children: ["Press ", o.exit.keyName, " again to exit"] })
      : null;
  let sliced = keys.slice(0, g),
    p = keys.length === 1;
  return r(Dialog, {
    title: p
      ? "An MCP server on this machine changed its tools"
      : "MCP servers on this machine changed their tools",
    onCancel: () => u("not_now"),
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
          r(Text, {
            children: [
              p ? "This server has" : "These servers have",
              " changed the tools",
              " ",
              p ? "it lists" : "they list",
              " \u2014 new tools, or new descriptions \u2014 since you approved offering this machine's MCP servers to cloud sessions. ",
              p ? "It is" : "They are",
              " not offered until you say so. Tool descriptions reach the model as text; approve only servers you trust.",
            ],
          }),
          r(Box, {
            flexDirection: "column",
            children: [
              sliced.map((i) =>
                r(
                  Text,
                  {
                    children: [
                      "\xB7 ",
                      t9(i),
                      " ",
                      e(Text, { dimColor: !0, children: summarizeMcpChanges(withheld[i]) }),
                    ],
                  },
                  i,
                ),
              ),
              keys.length > g
                ? r(Text, { dimColor: !0, children: ["\u2026 and ", keys.length - g, " more"] })
                : null,
            ],
          }),
          r(Text, {
            dimColor: !0,
            children: [
              "Other servers you approved are still offered. Yes and No are saved for this machine; to undo a No later, ",
              VTs(),
              ".",
            ],
          }),
        ],
      }),
      e(ModelSelector, {
        options: [
          {
            label: p ? "Yes, keep offering this server" : "Yes, keep offering these servers",
            value: "accepted",
          },
          {
            label: p
              ? "No, stop offering this server to cloud sessions"
              : "No, stop offering these servers to cloud sessions",
            value: "declined",
          },
          { label: "Not now", value: "not_now" },
        ],
        defaultFocusValue: "not_now",
        hideIndexes: !0,
        disablePrintableKeybindings: !0,
        isDisabled: o.choicesDisabled,
        refuseInput: o.refuseInput,
        onChange: u,
      }),
    ],
  });
}
/**
 * 概括新增/变更的设备 MCP 服务器：“(N new, M changed: 名字…)”，超过上限加省略号。
 */
//@ chunk-e7qhpt47.js:16766-17049 placement
function summarizeMcpChanges(t) {
  let m = [];
  if (t.added.length > 0) m.push(`${t.added.length} new`);
  if (t.changed.length > 0) m.push(`${t.changed.length} changed`);
  let joined = [...t.added, ...t.changed].slice(0, _).map(t9).join(", "),
    o = t.added.length + t.changed.length > _ ? ", \u2026" : "";
  return `(${m.join(", ")}: ${joined}${o})`;
}
