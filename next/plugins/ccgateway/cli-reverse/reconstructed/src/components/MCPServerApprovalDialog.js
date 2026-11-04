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
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { useRef } from "../../vendor/react/cjs/react.production.js";
import { useInputRefusalWindow, useRefusalTracker, settleKey } from "./CustomSelect/selectTypeahead.js";
import { RECENT_INPUT_GUARD_MS } from "../hooks/useRecentInputGuard.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { updateSettingsForSourceWithTransform, updateSettingsForSource } from "../utils/settings/settings.js";
import { addSessionApprovedMcpServers } from "../bootstrap/state.js";
import { getWorkspacePersistedTrustKey } from "../utils/config.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Dialog } from "./design-system/Dialog.js";
import { formatMcpServerLabel } from "../utils/plugins/lspPluginIntegration.js";
import { MCPServerDialogCopy } from "./MCPServerDialogCopy.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "./CustomSelect/select.js";

//@ chunk-20skp6hd.js:1427-2791 fingerprint = MCPServerApprovalDialog (0.733)
/**
 * 新 MCP 服务器批准：Use this server / Use all future servers / Continue without，结果写入 localSettings 的 enabled/disabled 列表。
 */
function MCPServerApprovalDialog({ serverName, isPluginServer = false, onDone }) {
  let { storageV5 } = useTheme_2();
  let submitGuardRef = useRef(false);
  let inputRefusalWindow = useInputRefusalWindow(RECENT_INPUT_GUARD_MS);
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let remountKey = settleKey(epoch, RECENT_INPUT_GUARD_MS);
  function shouldRefuseInput() {
    if (inputRefusalWindow() || refusedWithin(RECENT_INPUT_GUARD_MS)) {
      noteRefused();
      return true;
    }
    return false;
  }
  async function onChange(value) {
    if (shouldRefuseInput()) return;
    if (submitGuardRef.current) return;
    switch (
      ((submitGuardRef.current = true),
      logEvent("tengu_mcp_dialog_choice", {
        choice: fromEnum(value),
      }),
      value)
    ) {
      case "yes":
      case "yes_all": {
        let persistFailed = false;
        {
          let { error } = await updateSettingsForSourceWithTransform(
            "localSettings",
            (value) => {
              let enabledServers = value?.enabledMcpjsonServers || [];
              if (enabledServers.includes(serverName)) return null;
              return {
                enabledMcpjsonServers: [...enabledServers, serverName],
              };
            },
            undefined,
            storageV5,
          );
          persistFailed ||= error != null;
        }
        if (value === "yes_all") {
          let { error } = await updateSettingsForSource(
            "localSettings",
            {
              enableAllProjectMcpServers: true,
            },
            undefined,
            storageV5,
          );
          persistFailed ||= error != null;
        }
        addSessionApprovedMcpServers(getWorkspacePersistedTrustKey(), [serverName]);
        onDone({
          persistFailed,
        });
        break;
      }
      case "no": {
        let { error } = await updateSettingsForSourceWithTransform(
          "localSettings",
          (currentSettings) => {
            let disabledServers = currentSettings?.disabledMcpjsonServers || [];
            if (disabledServers.includes(serverName)) return null;
            return {
              disabledMcpjsonServers: [...disabledServers, serverName],
            };
          },
          undefined,
          storageV5,
        );
        onDone({
          persistFailed: error != null,
        });
        break;
      }
    }
  }
  return jsxProd_default_2(Dialog, {
    title: `New MCP server found in this project: ${formatMcpServerLabel(serverName, isPluginServer)}`,
    color: "warning",
    onCancel: () => void onChange("no"),
    exitOnCtrlCD: true,
    children: [
      jsxProd_default(MCPServerDialogCopy, {}),
      jsxProd_default(
        ModelSelector,
        {
          options: [
            {
              label: "Use this MCP server",
              value: "yes",
            },
            {
              label: "Use this and all future MCP servers in this project",
              value: "yes_all",
            },
            {
              label: "Continue without using this MCP server",
              value: "no",
            },
          ],
          onChange: (value_0) => void onChange(value_0),
          onCancel: () => void onChange("no"),
          hideIndexes: true,
          refuseInput: shouldRefuseInput,
          defaultFocusValue: "no",
          selectedValue: NO_COMMITTED_ROW,
        },
        remountKey.remountKey,
      ),
    ],
  });
}
export { MCPServerApprovalDialog };
