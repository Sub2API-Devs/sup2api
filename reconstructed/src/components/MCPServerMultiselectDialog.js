/**
 * components/MCPServerMultiselectDialog.tsx
 *
 * 发现多个新 MCP 服务器时的多选启用对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/MCPServerMultiselectDialog.tsx
 * pieces: chunk-20skp6hd.js (1)
 * attribution: fingerprint 1
 */
import { Me } from "./design-system/ThemeProvider.js";
import { R, ce } from "../../vendor/react/cjs/react.production.js";
import { useInputRefusalWindow, useRefusalTracker } from "./CustomSelect/selectTypeahead.js";
import { So } from "../hooks/useRecentInputGuard.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { SS } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { logEvent } from "../services/analytics/index.js";
import { updateSettingsForSourceWithTransform } from "../utils/settings/settings.js";
import { uniq } from "../utils/collections.js";
import { addSessionApprovedMcpServers } from "../bootstrap/state.js";
import { getWorkspacePersistedTrustKey } from "../utils/config.js";
import { r, Fragment, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Dialog } from "./design-system/Dialog.js";
import { MCPServerDialogCopy } from "./MCPServerDialogCopy.js";
import { SelectMultiAccessible } from "./CustomSelect/SelectMulti.js";
import { formatMcpServerLabel } from "../utils/plugins/lspPluginIntegration.js";
import { Box, Text } from "../ink/components/Text.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";

/**
 * 多个新 MCP 服务器的多选启用，结果写入 localSettings。
 */
//@ chunk-20skp6hd.js:2795-4353 fingerprint = MCPServerMultiselectDialog (0.684)
function MCPServerMultiselectDialog({
  serverNames: serverNames,
  pluginServerNames: pluginServerNames,
  onDone: onDone,
}) {
  let { storageV5: storageV5 } = Me(),
    l = R(!1),
    f = useInputRefusalWindow(So),
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker(),
    v = useIsScreenReaderEnabled(),
    h = ce(() => {
      if (f() || refusedWithin(So)) return (noteRefused(), !0);
      return !1;
    }, [f, refusedWithin, noteRefused]);
  async function E(p) {
    if (h()) return;
    if (l.current) return;
    l.current = !0;
    let [g, y] = SS(serverNames, (P) => p.includes(P));
    logEvent("tengu_mcp_multidialog_choice", { approved: g.length, rejected: y.length });
    let M = !1;
    if (g.length > 0) {
      let { error: error } = await updateSettingsForSourceWithTransform(
        "localSettings",
        (A) => ({ enabledMcpjsonServers: uniq([...(A?.enabledMcpjsonServers || []), ...g]) }),
        void 0,
        storageV5,
      );
      M ||= error != null;
    }
    if ((addSessionApprovedMcpServers(getWorkspacePersistedTrustKey(), g), y.length > 0)) {
      let { error: error } = await updateSettingsForSourceWithTransform(
        "localSettings",
        (A) => ({ disabledMcpjsonServers: uniq([...(A?.disabledMcpjsonServers || []), ...y]) }),
        void 0,
        storageV5,
      );
      M ||= error != null;
    }
    onDone({ persistFailed: M });
  }
  let C = ce(async () => {
    if (h()) return;
    if (l.current) return;
    l.current = !0;
    let { error: error } = await updateSettingsForSourceWithTransform(
      "localSettings",
      (selectedServers) => ({
        disabledMcpjsonServers: uniq([...(selectedServers?.disabledMcpjsonServers || []), ...serverNames]),
      }),
      void 0,
      storageV5,
    );
    onDone({ persistFailed: error != null });
  }, [h, serverNames, onDone, storageV5]);
  return r(Fragment, {
    children: [
      r(Dialog, {
        title: `${serverNames.length} new MCP servers found in this project`,
        subtitle: "Select any you wish to enable.",
        color: "warning",
        onCancel: C,
        exitOnCtrlCD: !0,
        hideInputGuide: !0,
        children: [
          e(MCPServerDialogCopy, {}),
          e(SelectMultiAccessible, {
            options: serverNames.map((server) => ({
              label: formatMcpServerLabel(server, pluginServerNames?.has(server) ?? !1),
              value: server,
            })),
            defaultValue: v ? [] : serverNames,
            submitButtonText: "Enable selected",
            onSubmit: E,
            onCancel: C,
            hideIndexes: !0,
            refuseInput: h,
            refuseSubmitFocus: h,
          }),
        ],
      }),
      e(Box, {
        paddingX: 1,
        children: e(Text, {
          dimColor: !0,
          italic: !0,
          children: r(Byline, {
            children: [
              e(KeyboardShortcutHint, { chord: "space", action: "select" }),
              e(ConfigurableShortcutHint, {
                action: "confirm:no",
                context: "Confirmation",
                fallback: "Esc",
                description: "reject all",
              }),
            ],
          }),
        }),
      }),
    ],
  });
}

export { MCPServerMultiselectDialog };
