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
import { init_react_production, ce, y } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { color } from "../design-system/color.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
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
import { sanitizeCallMark } from "../../services/mcp/mcpCallConstants.js";
import { getMcpConfigByName } from "../../services/mcp/config.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { CapabilitiesSection } from "./CapabilitiesSection.js";
import { ModelSelector } from "../agents/ModelSelector.js";

//@ chunk-vrb44rx7.js:26810-26814 sole-consumer
init_react_production();
//@ chunk-vrb44rx7.js:26814-27437 sole-consumer
/**
 * stdio 服务器状态文字：disabled / connected（工具获取失败、无工具）/ connecting / failed。
 */
function renderStdioServerStatus(client, serverToolsCount, k) {
  if (client.type === "disabled")
    return jsxProd_default_2(Text, {
      children: [color("inactive", k)(figures_default.radioOff), " disabled"],
    });
  if (client.type === "connected") {
    if (client.toolsListError)
      return jsxProd_default_2(Text, {
        children: [
          jsxProd_default(StatusIcon, {
            status: "warning",
            withSpace: true,
          }),
          "connected \xB7 tools fetch failed",
        ],
      });
    if (client.capabilities?.tools && serverToolsCount === 0)
      return jsxProd_default_2(Text, {
        children: [
          jsxProd_default(StatusIcon, {
            status: "warning",
            withSpace: true,
          }),
          "connected \xB7 no tools",
        ],
      });
    return jsxProd_default_2(Text, {
      children: [
        jsxProd_default(StatusIcon, {
          status: "success",
          withSpace: true,
        }),
        "connected",
      ],
    });
  }
  if (client.type === "pending")
    return jsxProd_default_2(Text, {
      children: [
        jsxProd_default(StatusIcon, {
          status: "pending",
          withSpace: true,
        }),
        "connecting\u2026",
      ],
    });
  return jsxProd_default_2(Text, {
    children: [
      jsxProd_default(StatusIcon, {
        status: "error",
        withSpace: true,
      }),
      "failed",
    ],
  });
}
//@ chunk-vrb44rx7.js:27437-30172 fingerprint = MCPStdioServerMenu (0.58)
function MCPStdioServerMenu({
  server,
  serverToolsCount,
  onViewTools,
  onCancel,
  onComplete,
  borderless = false,
}) {
  let D = ce(
    (he, ...W) => onComplete(typeof he === "string" ? sanitizeTelemetryString(he) : he, ...W),
    [onComplete],
  );
  let exitState = useAppStateSession();
  let [L] = useTheme();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let mcp = useAppState((he) => he.mcp);
  let reconnectMcpServer = useMcpReconnect();
  let toggleMcpServer = useMcpToggleEnabled();
  let [isReconnecting, setIsReconnecting] = y(false);
  let handleToggleEnabled = ce(async () => {
    let wasEnabled = server.client.type !== "disabled";
    try {
      await toggleMcpServer(server.name);
      onCancel();
    } catch (err) {
      D(
        formatMcpOperationFailure(err, server.name, wasEnabled ? "disable" : "enable", {
          config: server.config,
          persistsOffBox: isBridgeOrTransport(exitState),
        }),
      );
    }
  }, [server.client.type, server.name, server.config, toggleMcpServer, onCancel, D, exitState]);
  let capitalizedServerName = capitalize(String(server.name));
  let serverCommandsCount = filterMcpPromptsByServer(mcp.commands, server.name).length;
  let menuOptions = [];
  if (server.client.type !== "disabled" && serverToolsCount > 0)
    menuOptions.push({
      label: "View tools",
      value: "tools",
    });
  if (server.client.type !== "disabled")
    menuOptions.push({
      label: "Reconnect",
      value: "reconnectMcpServer",
    });
  menuOptions.push({
    label: server.client.type !== "disabled" ? "Disable" : "Enable",
    value: "toggle-enabled",
  });
  if (isReconnecting)
    return jsxProd_default_2(Dialog, {
      title: `${capitalizedServerName} MCP Server`,
      onCancel: () => {},
      exitOnCtrlCD: true,
      hideBorder: borderless,
      hideInputGuide: true,
      children: [
        jsxProd_default_2(Text, {
          color: "text",
          children: [
            "Reconnecting to ",
            jsxProd_default(Text, {
              bold: true,
              children: server.name,
            }),
          ],
        }),
        jsxProd_default_2(Box, {
          children: [
            jsxProd_default(Spinner, {}),
            jsxProd_default(Text, {
              children: " Restarting MCP server process",
            }),
          ],
        }),
        jsxProd_default(Text, {
          dimColor: true,
          children: "This may take a few moments.",
        }),
      ],
    });
  return jsxProd_default_2(Dialog, {
    title: `${capitalizedServerName} MCP Server`,
    onCancel,
    hideBorder: borderless,
    inputGuide: jsxProd_default_2(Byline, {
      children: [
        !isScreenReaderEnabled &&
          jsxProd_default(KeyboardShortcutHint, {
            chord: ["up", "down"],
            action: "navigate",
          }),
        !isScreenReaderEnabled &&
          jsxProd_default(KeyboardShortcutHint, {
            chord: "enter",
            action: "select",
          }),
        jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "back",
        }),
      ],
    }),
    children: [
      jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 0,
        children: [
          jsxProd_default_2(FlexDirectionRow, {
            columns: [
              {
                bold: true,
              },
              {},
            ],
            children: [
              jsxProd_default_2(FlexDirectionRow.Row, {
                children: [
                  jsxProd_default(Fragment, {
                    children: "Status:",
                  }),
                  renderStdioServerStatus(server.client, serverToolsCount, L),
                ],
              }),
              server.displayEndpoint !== mcpTransportType(server.config) &&
                jsxProd_default_2(FlexDirectionRow.Row, {
                  children: [
                    jsxProd_default(Fragment, {
                      children: "Command:",
                    }),
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: server.displayEndpoint,
                    }),
                  ],
                }),
              server.client.type === "connected" &&
                server.client.protocolEra === "modern" &&
                server.client.negotiatedProtocolVersion &&
                jsxProd_default_2(FlexDirectionRow.Row, {
                  children: [
                    jsxProd_default(Fragment, {
                      children: "Protocol:",
                    }),
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: sanitizeCallMark(server.client.negotiatedProtocolVersion),
                    }),
                  ],
                }),
              jsxProd_default_2(FlexDirectionRow.Row, {
                children: [
                  jsxProd_default(Fragment, {
                    children: "Config location:",
                  }),
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: describeMcpConfigFilePath(getMcpConfigByName(server.name)?.scope ?? "dynamic"),
                  }),
                ],
              }),
            ],
          }),
          isConnectedOrCached(server.client) &&
            jsxProd_default(CapabilitiesSection, {
              serverToolsCount,
              serverPromptsCount: serverCommandsCount,
              serverResourcesCount: mcp.resources[server.name]?.length || 0,
            }),
          isConnectedOrCached(server.client) &&
            serverToolsCount > 0 &&
            jsxProd_default_2(Box, {
              children: [
                jsxProd_default(Text, {
                  bold: true,
                  children: "Tools: ",
                }),
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [serverToolsCount, " ", plural(serverToolsCount, "tool")],
                }),
              ],
            }),
          server.client.type === "connected" &&
            server.client.toolsListError &&
            jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [
                jsxProd_default(Text, {
                  bold: true,
                  children: "Issue: ",
                }),
                jsxProd_default(Text, {
                  dimColor: true,
                  children: server.client.toolsListError,
                }),
              ],
            }),
        ],
      }),
      jsxProd_default(Box, {
        children: jsxProd_default(ModelSelector, {
          options: menuOptions,
          onChange: async (value) => {
            if (value === "tools") onViewTools();
            else if (value === "reconnectMcpServer") {
              setIsReconnecting(true);
              try {
                let result = await reconnectMcpServer(server.name);
                let { message } = handleReconnectResult(result, server.name, {
                  persistsOffBox: isBridgeOrTransport(exitState),
                });
                D?.(message);
              } catch (err) {
                D?.(
                  handleReconnectError(err, server.name, {
                    config: server.config,
                    persistsOffBox: isBridgeOrTransport(exitState),
                  }),
                );
              } finally {
                setIsReconnecting(false);
              }
            } else if (value === "toggle-enabled") await handleToggleEnabled();
          },
          onCancel,
        }),
      }),
    ],
  });
}
export { MCPStdioServerMenu };
