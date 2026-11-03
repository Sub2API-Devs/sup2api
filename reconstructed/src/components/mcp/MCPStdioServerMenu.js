/**
 * components/mcp/MCPStdioServerMenu.tsx
 *
 * stdio MCP 服务器菜单：重连、启用/禁用、查看工具。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/mcp/MCPStdioServerMenu.tsx
 * pieces: chunk-vrb44rx7.js (3)
 * attribution: sole-consumer 2, fingerprint 1
 */
import { j, ce, y } from "../../../vendor/react/cjs/react.production.js";
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { color } from "../design-system/color.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { useAppStateSession, useAppState } from "../../state/AppState.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useMcpReconnect, useMcpToggleEnabled } from "../../services/mcp/MCPConnectionManager.js";
import {
  formatMcpOperationFailure,
  handleReconnectResult,
  handleReconnectError,
} from "./utils/reconnectHelpers.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { capitalize, plural } from "../../utils/stringUtils.js";
import { filterMcpPromptsByServer, describeMcpConfigFilePath } from "../../services/mcp/utils.js";
import { Dialog } from "../design-system/Dialog.js";
import { Spinner } from "../Spinner.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { FlexDirectionRow } from "../design-system/Table.js";
import { mcpTransportType } from "../../services/mcp/mcpServerEndpoint.js";
import { HPe } from "../../services/mcp/mcpCallConstants.js";
import { getMcpConfigByName } from "../../services/mcp/config.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { CapabilitiesSection } from "./CapabilitiesSection.js";
import { ModelSelector } from "../agents/ModelSelector.js";

//@ chunk-vrb44rx7.js:26810-26814 sole-consumer
j();
/**
 * stdio 服务器状态文字：disabled / connected（工具获取失败、无工具）/ connecting / failed。
 */
//@ chunk-vrb44rx7.js:26814-27437 sole-consumer
function renderStdioServerStatus(i, h, k) {
  if (i.type === "disabled") return r(Text, { children: [color("inactive", k)(re.radioOff), " disabled"] });
  if (i.type === "connected") {
    if (i.toolsListError)
      return r(Text, {
        children: [e(StatusIcon, { status: "warning", withSpace: !0 }), "connected \xB7 tools fetch failed"],
      });
    if (i.capabilities?.tools && h === 0)
      return r(Text, {
        children: [e(StatusIcon, { status: "warning", withSpace: !0 }), "connected \xB7 no tools"],
      });
    return r(Text, { children: [e(StatusIcon, { status: "success", withSpace: !0 }), "connected"] });
  }
  if (i.type === "pending")
    return r(Text, { children: [e(StatusIcon, { status: "pending", withSpace: !0 }), "connecting\u2026"] });
  return r(Text, { children: [e(StatusIcon, { status: "error", withSpace: !0 }), "failed"] });
}
//@ chunk-vrb44rx7.js:27437-30172 fingerprint = MCPStdioServerMenu (0.58)
function MCPStdioServerMenu({
  server: server,
  serverToolsCount: serverToolsCount,
  onViewTools: onViewTools,
  onCancel: onCancel,
  onComplete: onComplete,
  borderless: borderless = !1,
}) {
  let D = ce(
      (he, ...W) => onComplete(typeof he === "string" ? sanitizeTelemetryString(he) : he, ...W),
      [onComplete],
    ),
    exitState = useAppStateSession(),
    [L] = useTheme(),
    A = useIsScreenReaderEnabled(),
    mcp = useAppState((he) => he.mcp),
    reconnectMcpServer = useMcpReconnect(),
    toggleMcpServer = useMcpToggleEnabled(),
    [_, J] = y(!1),
    pe = ce(async () => {
      let wasEnabled = server.client.type !== "disabled";
      try {
        (await toggleMcpServer(server.name), onCancel());
      } catch (err) {
        D(
          formatMcpOperationFailure(err, server.name, wasEnabled ? "disable" : "enable", {
            config: server.config,
            persistsOffBox: isBridgeOrTransport(exitState),
          }),
        );
      }
    }, [server.client.type, server.name, server.config, toggleMcpServer, onCancel, D, exitState]),
    capitalizedServerName = capitalize(String(server.name)),
    serverCommandsCount = filterMcpPromptsByServer(mcp.commands, server.name).length,
    menuOptions = [];
  if (server.client.type !== "disabled" && serverToolsCount > 0)
    menuOptions.push({ label: "View tools", value: "tools" });
  if (server.client.type !== "disabled")
    menuOptions.push({ label: "Reconnect", value: "reconnectMcpServer" });
  if (
    (menuOptions.push({
      label: server.client.type !== "disabled" ? "Disable" : "Enable",
      value: "toggle-enabled",
    }),
    _)
  )
    return r(Dialog, {
      title: `${capitalizedServerName} MCP Server`,
      onCancel: () => {},
      exitOnCtrlCD: !0,
      hideBorder: borderless,
      hideInputGuide: !0,
      children: [
        r(Text, {
          color: "text",
          children: ["Reconnecting to ", e(Text, { bold: !0, children: server.name })],
        }),
        r(Box, { children: [e(Spinner, {}), e(Text, { children: " Restarting MCP server process" })] }),
        e(Text, { dimColor: !0, children: "This may take a few moments." }),
      ],
    });
  return r(Dialog, {
    title: `${capitalizedServerName} MCP Server`,
    onCancel: onCancel,
    hideBorder: borderless,
    inputGuide: r(Byline, {
      children: [
        !A && e(KeyboardShortcutHint, { chord: ["up", "down"], action: "navigate" }),
        !A && e(KeyboardShortcutHint, { chord: "enter", action: "select" }),
        e(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "back",
        }),
      ],
    }),
    children: [
      r(Box, {
        flexDirection: "column",
        gap: 0,
        children: [
          r(FlexDirectionRow, {
            columns: [{ bold: !0 }, {}],
            children: [
              r(FlexDirectionRow.Row, {
                children: [
                  e(Fragment, { children: "Status:" }),
                  renderStdioServerStatus(server.client, serverToolsCount, L),
                ],
              }),
              server.displayEndpoint !== mcpTransportType(server.config) &&
                r(FlexDirectionRow.Row, {
                  children: [
                    e(Fragment, { children: "Command:" }),
                    e(Text, { dimColor: !0, children: server.displayEndpoint }),
                  ],
                }),
              server.client.type === "connected" &&
                server.client.protocolEra === "modern" &&
                server.client.negotiatedProtocolVersion &&
                r(FlexDirectionRow.Row, {
                  children: [
                    e(Fragment, { children: "Protocol:" }),
                    e(Text, { dimColor: !0, children: HPe(server.client.negotiatedProtocolVersion) }),
                  ],
                }),
              r(FlexDirectionRow.Row, {
                children: [
                  e(Fragment, { children: "Config location:" }),
                  e(Text, {
                    dimColor: !0,
                    children: describeMcpConfigFilePath(getMcpConfigByName(server.name)?.scope ?? "dynamic"),
                  }),
                ],
              }),
            ],
          }),
          isConnectedOrCached(server.client) &&
            e(CapabilitiesSection, {
              serverToolsCount: serverToolsCount,
              serverPromptsCount: serverCommandsCount,
              serverResourcesCount: mcp.resources[server.name]?.length || 0,
            }),
          isConnectedOrCached(server.client) &&
            serverToolsCount > 0 &&
            r(Box, {
              children: [
                e(Text, { bold: !0, children: "Tools: " }),
                r(Text, {
                  dimColor: !0,
                  children: [serverToolsCount, " ", plural(serverToolsCount, "tool")],
                }),
              ],
            }),
          server.client.type === "connected" &&
            server.client.toolsListError &&
            r(Box, {
              flexDirection: "column",
              children: [
                e(Text, { bold: !0, children: "Issue: " }),
                e(Text, { dimColor: !0, children: server.client.toolsListError }),
              ],
            }),
        ],
      }),
      e(Box, {
        children: e(ModelSelector, {
          options: menuOptions,
          onChange: async (value) => {
            if (value === "tools") onViewTools();
            else if (value === "reconnectMcpServer") {
              J(!0);
              try {
                let result = await reconnectMcpServer(server.name),
                  { message: message } = handleReconnectResult(result, server.name, {
                    persistsOffBox: isBridgeOrTransport(exitState),
                  });
                D?.(message);
              } catch (err_0) {
                D?.(
                  handleReconnectError(err_0, server.name, {
                    config: server.config,
                    persistsOffBox: isBridgeOrTransport(exitState),
                  }),
                );
              } finally {
                J(!1);
              }
            } else if (value === "toggle-enabled") await pe();
          },
          onCancel: onCancel,
        }),
      }),
    ],
  });
}

export { MCPStdioServerMenu };
