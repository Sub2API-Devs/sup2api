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
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { R, ce } from "../../vendor/react/cjs/react.production.js";
import { useInputRefusalWindow, useRefusalTracker } from "./CustomSelect/selectTypeahead.js";
import { RECENT_INPUT_GUARD_MS } from "../hooks/useRecentInputGuard.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { SS } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { logEvent } from "../services/analytics/index.js";
import { updateSettingsForSourceWithTransform } from "../utils/settings/settings.js";
import { uniq } from "../utils/collections.js";
import { addSessionApprovedMcpServers } from "../bootstrap/state.js";
import { getWorkspacePersistedTrustKey } from "../utils/config.js";
import {
  jsxProd_default_2,
  Fragment,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Dialog } from "./design-system/Dialog.js";
import { MCPServerDialogCopy } from "./MCPServerDialogCopy.js";
import { SelectMultiAccessible } from "./CustomSelect/SelectMulti.js";
import { formatMcpServerLabel } from "../utils/plugins/lspPluginIntegration.js";
import { Box, Text } from "../ink/components/Text.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";

//@ chunk-20skp6hd.js:2795-4353 fingerprint = MCPServerMultiselectDialog (0.684)
/**
 * 多个新 MCP 服务器的多选启用，结果写入 localSettings。
 */
function MCPServerMultiselectDialog({ serverNames, pluginServerNames, onDone }) {
  let { storageV5 } = useTheme_2();
  let l = R(false);
  let inputRefusalWindow = useInputRefusalWindow(RECENT_INPUT_GUARD_MS);
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let h = ce(() => {
    if (inputRefusalWindow() || refusedWithin(RECENT_INPUT_GUARD_MS)) {
      noteRefused();
      return true;
    }
    return false;
  }, [inputRefusalWindow, refusedWithin, noteRefused]);
  async function E(p) {
    if (h()) return;
    if (l.current) return;
    l.current = true;
    let [g, y] = SS(serverNames, (P) => p.includes(P));
    logEvent("tengu_mcp_multidialog_choice", {
      approved: g.length,
      rejected: y.length,
    });
    let M = false;
    if (g.length > 0) {
      let { error } = await updateSettingsForSourceWithTransform(
        "localSettings",
        (A) => ({
          enabledMcpjsonServers: uniq([...(A?.enabledMcpjsonServers || []), ...g]),
        }),
        undefined,
        storageV5,
      );
      M ||= error != null;
    }
    addSessionApprovedMcpServers(getWorkspacePersistedTrustKey(), g);
    if (y.length > 0) {
      let { error } = await updateSettingsForSourceWithTransform(
        "localSettings",
        (A) => ({
          disabledMcpjsonServers: uniq([...(A?.disabledMcpjsonServers || []), ...y]),
        }),
        undefined,
        storageV5,
      );
      M ||= error != null;
    }
    onDone({
      persistFailed: M,
    });
  }
  let onCancel = ce(async () => {
    if (h()) return;
    if (l.current) return;
    l.current = true;
    let { error } = await updateSettingsForSourceWithTransform(
      "localSettings",
      (selectedServers) => ({
        disabledMcpjsonServers: uniq([...(selectedServers?.disabledMcpjsonServers || []), ...serverNames]),
      }),
      undefined,
      storageV5,
    );
    onDone({
      persistFailed: error != null,
    });
  }, [h, serverNames, onDone, storageV5]);
  return jsxProd_default_2(Fragment, {
    children: [
      jsxProd_default_2(Dialog, {
        title: `${serverNames.length} new MCP servers found in this project`,
        subtitle: "Select any you wish to enable.",
        color: "warning",
        onCancel,
        exitOnCtrlCD: true,
        hideInputGuide: true,
        children: [
          jsxProd_default(MCPServerDialogCopy, {}),
          jsxProd_default(SelectMultiAccessible, {
            options: serverNames.map((server) => ({
              label: formatMcpServerLabel(server, pluginServerNames?.has(server) ?? false),
              value: server,
            })),
            defaultValue: isScreenReaderEnabled ? [] : serverNames,
            submitButtonText: "Enable selected",
            onSubmit: E,
            onCancel,
            hideIndexes: true,
            refuseInput: h,
            refuseSubmitFocus: h,
          }),
        ],
      }),
      jsxProd_default(Box, {
        paddingX: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          italic: true,
          children: jsxProd_default_2(Byline, {
            children: [
              jsxProd_default(KeyboardShortcutHint, {
                chord: "space",
                action: "select",
              }),
              jsxProd_default(ConfigurableShortcutHint, {
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
