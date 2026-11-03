/**
 * components/mcp/MCPAgentServerMenu.tsx
 *
 * 子代理专属 MCP 服务器的菜单（http/anthropic-hosted/oauth）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/mcp/MCPAgentServerMenu.tsx
 * pieces: chunk-cpqpnzp4.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { ce, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { isUnattendedBgSession } from "../../utils/concurrentSessions.js";
import { CANNOT_AUTH_WITHOUT_TERMINAL } from "./MCPRemoteServerMenu.js";
import { classifyMcpAuthTarget } from "../../services/mcp/auth.js";
import { uo, sanitizeErrorDetail } from "../../services/api/deferredToolsState.js";
import { redactMcpErrorDetail } from "../../services/mcp/mcpServerOrigin.js";
import { capitalize } from "../../utils/stringUtils.js";
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import { Spinner } from "../Spinner.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { Dialog } from "../design-system/Dialog.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { FlexDirectionRow } from "../design-system/Table.js";
import { color } from "../design-system/color.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { ErrorText } from "../ErrorText.js";
import { ModelSelector } from "../agents/ModelSelector.js";

//@ chunk-cpqpnzp4.js:17999-18067 affinity
function kt() {
  return require("./chunk-asne9cp8.js").mcpAuthModule();
}
//@ chunk-cpqpnzp4.js:18067-21061 fingerprint = MCPAgentServerMenu (0.595)
function MCPAgentServerMenu({ agentServer: agentServer, onCancel: onCancel, onComplete: onComplete }) {
  let c = ce(
      (T, ...X) => onComplete(typeof T === "string" ? sanitizeTelemetryString(T) : T, ...X),
      [onComplete],
    ),
    [v] = useTheme(),
    m = useIsScreenReaderEnabled(),
    [k, f] = y(!1),
    [b, N] = y(null),
    [_, h] = y(null),
    authAbortControllerRef = R(null);
  P(() => () => authAbortControllerRef.current?.abort(), []);
  let handleEscCancel = ce(() => {
    if (k) (authAbortControllerRef.current?.abort(), (authAbortControllerRef.current = null), f(!1), h(null));
  }, [k]);
  useKeybinding("confirm:no", handleEscCancel, { context: "Confirmation", isActive: k });
  let handleAuthenticate = ce(async () => {
      if (isUnattendedBgSession()) {
        N(CANNOT_AUTH_WITHOUT_TERMINAL);
        return;
      }
      if (
        !agentServer.needsAuth ||
        !agentServer.url ||
        (agentServer.transport !== "http" && agentServer.transport !== "sse")
      )
        return;
      let T = classifyMcpAuthTarget(agentServer.name, { type: agentServer.transport, url: agentServer.url });
      if (T.kind === "anthropic-hosted") {
        N(T.message);
        return;
      }
      if (T.kind !== "oauth") return;
      (f(!0), N(null));
      let controller = new AbortController();
      authAbortControllerRef.current = controller;
      try {
        (await kt().performMCPOAuthFlow(agentServer.name, T.config, h, controller.signal),
          c(
            `Authentication successful for ${uo(agentServer.name)}. The server will connect when the agent runs.`,
          ));
      } catch (err) {
        if (err instanceof Error && !(err instanceof kt().AuthenticationCancelledError))
          N(sanitizeErrorDetail(redactMcpErrorDetail(agentServer.name, T.config, err.message)));
      } finally {
        (f(!1), (authAbortControllerRef.current = null));
      }
    }, [agentServer, c]),
    capitalizedServerName = capitalize(String(agentServer.name));
  if (k)
    return r(Box, {
      flexDirection: "column",
      gap: 1,
      padding: 1,
      children: [
        r(Text, { color: "claude", children: ["Authenticating with ", agentServer.name, "\u2026"] }),
        r(Box, {
          children: [e(Spinner, {}), e(Text, { children: " A browser window will open for authentication" })],
        }),
        _ &&
          r(Box, {
            flexDirection: "column",
            children: [
              e(Text, {
                dimColor: !0,
                children: "If your browser doesn't open automatically, copy this URL manually:",
              }),
              e(Link, { url: _, assumeSupport: !0 }),
            ],
          }),
        e(Box, {
          marginLeft: 3,
          children: r(Text, {
            dimColor: !0,
            children: [
              "Return here after authenticating in your browser.",
              " ",
              e(ConfigurableShortcutHint, {
                action: "confirm:no",
                context: "Confirmation",
                fallback: "Esc",
                description: "go back",
              }),
            ],
          }),
        }),
      ],
    });
  let menuOptions = [];
  if (agentServer.needsAuth) menuOptions.push({ label: "Authenticate", value: "auth" });
  return (
    menuOptions.push({ label: "Back", value: "back" }),
    r(Dialog, {
      title: `${capitalizedServerName} MCP Server`,
      subtitle: "agent-only",
      onCancel: onCancel,
      inputGuide: r(Byline, {
        children: [
          !m && e(KeyboardShortcutHint, { chord: ["up", "down"], action: "navigate" }),
          !m && e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
          e(ConfigurableShortcutHint, {
            action: "confirm:no",
            context: "Confirmation",
            fallback: "Esc",
            description: "go back",
          }),
        ],
      }),
      children: [
        r(FlexDirectionRow, {
          columns: [{ bold: !0, width: 8 }, {}],
          children: [
            r(FlexDirectionRow.Row, {
              children: [
                e(Fragment, { children: "Type:" }),
                e(Text, { dimColor: !0, children: agentServer.transport }),
              ],
            }),
            agentServer.url &&
              r(FlexDirectionRow.Row, {
                children: [
                  e(Fragment, { children: "URL:" }),
                  e(Text, { dimColor: !0, children: agentServer.url }),
                ],
              }),
            agentServer.command &&
              r(FlexDirectionRow.Row, {
                children: [
                  e(Fragment, { children: "Command:" }),
                  e(Text, { dimColor: !0, children: agentServer.command }),
                ],
              }),
            r(FlexDirectionRow.Row, {
              children: [
                e(Fragment, { children: "Used by:" }),
                e(Text, { dimColor: !0, children: agentServer.sourceAgents.join(", ") }),
              ],
            }),
          ],
        }),
        e(Box, {
          children: r(FlexDirectionRow, {
            columns: [{ bold: !0, width: 8 }, {}],
            children: [
              r(FlexDirectionRow.Row, {
                children: [
                  e(Fragment, { children: "Status:" }),
                  r(Text, { children: [color("inactive", v)(re.radioOff), " not connected (agent-only)"] }),
                ],
              }),
              agentServer.needsAuth &&
                r(FlexDirectionRow.Row, {
                  children: [
                    e(Fragment, { children: "Auth:" }),
                    r(Text, {
                      children: [
                        e(StatusIcon, { status: "warning", withSpace: !0 }),
                        "may need authentication",
                      ],
                    }),
                  ],
                }),
            ],
          }),
        }),
        e(Box, {
          children: e(Text, { dimColor: !0, children: "This server connects only when running the agent." }),
        }),
        b && e(Box, { children: e(ErrorText, { error: b }) }),
        e(Box, {
          children: e(ModelSelector, {
            options: menuOptions,
            onChange: async (exitState) => {
              switch (exitState) {
                case "auth":
                  await handleAuthenticate();
                  break;
                case "back":
                  onCancel();
                  break;
              }
            },
            onCancel: onCancel,
          }),
        }),
      ],
    })
  );
}

export { MCPAgentServerMenu };
