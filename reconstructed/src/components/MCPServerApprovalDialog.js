/**
 * components/MCPServerApprovalDialog.tsx
 *
 * 发现项目 .mcp.json 中新 MCP 服务器时的单个批准对话框（使用/全部使用/不使用）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/MCPServerApprovalDialog.tsx
 * pieces: chunk-20skp6hd.js (1)
 * attribution: fingerprint 1
 */
import { Me } from "./design-system/ThemeProvider.js";
import { R } from "../../vendor/react/cjs/react.production.js";
import { useInputRefusalWindow, useRefusalTracker, settleKey } from "./CustomSelect/selectTypeahead.js";
import { So } from "../hooks/useRecentInputGuard.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { updateSettingsForSourceWithTransform, updateSettingsForSource } from "../utils/settings/settings.js";
import { addSessionApprovedMcpServers } from "../bootstrap/state.js";
import { getWorkspacePersistedTrustKey } from "../utils/config.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Dialog } from "./design-system/Dialog.js";
import { formatMcpServerLabel } from "../utils/plugins/lspPluginIntegration.js";
import { MCPServerDialogCopy } from "./MCPServerDialogCopy.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "./CustomSelect/select.js";

/**
 * 新 MCP 服务器批准：Use this server / Use all future servers / Continue without，结果写入 localSettings 的 enabled/disabled 列表。
 */
//@ chunk-20skp6hd.js:1427-2791 fingerprint = MCPServerApprovalDialog (0.733)
function MCPServerApprovalDialog({
  serverName: serverName,
  isPluginServer: isPluginServer = !1,
  onDone: onDone,
}) {
  let { storageV5: storageV5 } = Me(),
    l = R(!1),
    f = useInputRefusalWindow(So),
    { refusedWithin: refusedWithin, noteRefused: noteRefused, epoch: epoch } = useRefusalTracker(),
    h = settleKey(epoch, So);
  function E() {
    if (f() || refusedWithin(So)) return (noteRefused(), !0);
    return !1;
  }
  async function C(p) {
    if (E()) return;
    if (l.current) return;
    switch (((l.current = !0), logEvent("tengu_mcp_dialog_choice", { choice: fromEnum(p) }), p)) {
      case "yes":
      case "yes_all": {
        let g = !1;
        {
          let { error: error } = await updateSettingsForSourceWithTransform(
            "localSettings",
            (value) => {
              let P = value?.enabledMcpjsonServers || [];
              if (P.includes(serverName)) return null;
              return { enabledMcpjsonServers: [...P, serverName] };
            },
            void 0,
            storageV5,
          );
          g ||= error != null;
        }
        if (p === "yes_all") {
          let { error: error } = await updateSettingsForSource(
            "localSettings",
            { enableAllProjectMcpServers: !0 },
            void 0,
            storageV5,
          );
          g ||= error != null;
        }
        (addSessionApprovedMcpServers(getWorkspacePersistedTrustKey(), [serverName]),
          onDone({ persistFailed: g }));
        break;
      }
      case "no": {
        let { error: error } = await updateSettingsForSourceWithTransform(
          "localSettings",
          (y) => {
            let M = y?.disabledMcpjsonServers || [];
            if (M.includes(serverName)) return null;
            return { disabledMcpjsonServers: [...M, serverName] };
          },
          void 0,
          storageV5,
        );
        onDone({ persistFailed: error != null });
        break;
      }
    }
  }
  return r(Dialog, {
    title: `New MCP server found in this project: ${formatMcpServerLabel(serverName, isPluginServer)}`,
    color: "warning",
    onCancel: () => void C("no"),
    exitOnCtrlCD: !0,
    children: [
      e(MCPServerDialogCopy, {}),
      e(
        ModelSelector,
        {
          options: [
            { label: "Use this MCP server", value: "yes" },
            { label: "Use this and all future MCP servers in this project", value: "yes_all" },
            { label: "Continue without using this MCP server", value: "no" },
          ],
          onChange: (value_0) => void C(value_0),
          onCancel: () => void C("no"),
          hideIndexes: !0,
          refuseInput: E,
          defaultFocusValue: "no",
          selectedValue: NO_COMMITTED_ROW,
        },
        h.remountKey,
      ),
    ],
  });
}

export { MCPServerApprovalDialog };
