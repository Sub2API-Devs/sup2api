/**
 * components/mcp/MCPAgentServerMenu.tsx
 *
 * 子代理专属 MCP 服务器的菜单（http/anthropic-hosted/oauth）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/mcp/MCPAgentServerMenu.tsx
 * pieces: chunk-h6004nzv.js (2)
 * attribution: affinity 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useCallback, useState, useRef, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { isUnattendedBgSession } from "../../utils/concurrentSessions.js";
import { CANNOT_AUTH_WITHOUT_TERMINAL } from "./MCPRemoteServerMenu.js";
import { classifyMcpAuthTarget } from "../../services/mcp/auth.js";
import { normalizeServerNameShort, sanitizeErrorDetail } from "../../services/api/deferredToolsState.js";
import { redactMcpErrorDetail } from "../../services/mcp/mcpServerOrigin.js";
import { capitalize } from "../../utils/stringUtils.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import { Spinner } from "../Spinner.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { Dialog } from "../design-system/Dialog.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { FlexDirectionRow } from "../design-system/Table.js";
import { color } from "../design-system/color.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { ErrorText } from "../ErrorText.js";
import { ModelSelector } from "../agents/ModelSelector.js";

//@ chunk-h6004nzv.js:19182-19250 affinity
function getMcpAuthModule() {
  return require("../../services/mcp/emitTripwireEvent.lazy.js").mcpAuthModule();
}
//@ chunk-h6004nzv.js:19250-22250 fingerprint (2.1.88 match: MCPAgentServerMenu, 0.595)
function MCPAgentServerMenu({ agentServer, onCancel, onComplete }) {
  let complete = useCallback(
    (message, ...rest) =>
      onComplete(typeof message === "string" ? sanitizeTelemetryString(message) : message, ...rest),
    [onComplete],
  );
  let [theme] = useTheme();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let [isAuthenticating, setIsAuthenticating] = useState(false);
  let [error, setError] = useState(null);
  let [authorizationUrl, setAuthorizationUrl] = useState(null);
  let authAbortControllerRef = useRef(null);
  useEffect(() => () => authAbortControllerRef.current?.abort(), []);
  let handleEscCancel = useCallback(() => {
    if (isAuthenticating) {
      authAbortControllerRef.current?.abort();
      authAbortControllerRef.current = null;
      setIsAuthenticating(false);
      setAuthorizationUrl(null);
    }
  }, [isAuthenticating]);
  useKeybinding("confirm:no", handleEscCancel, {
    context: "Confirmation",
    isActive: isAuthenticating,
  });
  let handleAuthenticate = useCallback(async () => {
    if (isUnattendedBgSession()) {
      setError(CANNOT_AUTH_WITHOUT_TERMINAL);
      return;
    }
    if (
      !agentServer.needsAuth ||
      !agentServer.url ||
      (agentServer.transport !== "http" && agentServer.transport !== "sse")
    )
      return;
    let target = classifyMcpAuthTarget(agentServer.name, {
      type: agentServer.transport,
      url: agentServer.url,
    });
    if (target.kind === "anthropic-hosted") {
      setError(target.message);
      return;
    }
    if (target.kind !== "oauth") return;
    setIsAuthenticating(true);
    setError(null);
    let controller = new AbortController();
    authAbortControllerRef.current = controller;
    try {
      await getMcpAuthModule().performMCPOAuthFlow(
        agentServer.name,
        target.config,
        setAuthorizationUrl,
        controller.signal,
      );
      complete(
        `Authentication successful for ${normalizeServerNameShort(agentServer.name)}. The server will connect when the agent runs.`,
      );
    } catch (err) {
      if (err instanceof Error && !(err instanceof getMcpAuthModule().AuthenticationCancelledError))
        setError(sanitizeErrorDetail(redactMcpErrorDetail(agentServer.name, target.config, err.message)));
    } finally {
      setIsAuthenticating(false);
      authAbortControllerRef.current = null;
    }
  }, [agentServer, complete]);
  let capitalizedServerName = capitalize(String(agentServer.name));
  if (isAuthenticating)
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      padding: 1,
      children: [
        jsxProd_default_2(Text, {
          color: "claude",
          children: ["Authenticating with ", agentServer.name, "\u2026"],
        }),
        jsxProd_default_2(Box, {
          children: [
            jsxProd_default(Spinner, {}),
            jsxProd_default(Text, {
              children: " A browser window will open for authentication",
            }),
          ],
        }),
        authorizationUrl &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default(Text, {
                dimColor: true,
                children: "If your browser doesn't open automatically, copy this URL manually:",
              }),
              jsxProd_default(Link, {
                url: authorizationUrl,
                assumeSupport: true,
              }),
            ],
          }),
        jsxProd_default(Box, {
          marginLeft: 3,
          children: jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "Return here after authenticating in your browser.",
              " ",
              jsxProd_default(ConfigurableShortcutHint, {
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
  if (agentServer.needsAuth)
    menuOptions.push({
      label: "Authenticate",
      value: "auth",
    });
  menuOptions.push({
    label: "Back",
    value: "back",
  });
  return jsxProd_default_2(Dialog, {
    title: `${capitalizedServerName} MCP Server`,
    subtitle: "agent-only",
    onCancel,
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
            action: "confirm",
          }),
        jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "go back",
        }),
      ],
    }),
    children: [
      jsxProd_default_2(FlexDirectionRow, {
        columns: [
          {
            bold: true,
            width: 8,
          },
          {},
        ],
        children: [
          jsxProd_default_2(FlexDirectionRow.Row, {
            children: [
              jsxProd_default(Fragment, {
                children: "Type:",
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: agentServer.transport,
              }),
            ],
          }),
          agentServer.url &&
            jsxProd_default_2(FlexDirectionRow.Row, {
              children: [
                jsxProd_default(Fragment, {
                  children: "URL:",
                }),
                jsxProd_default(Text, {
                  dimColor: true,
                  children: agentServer.url,
                }),
              ],
            }),
          agentServer.command &&
            jsxProd_default_2(FlexDirectionRow.Row, {
              children: [
                jsxProd_default(Fragment, {
                  children: "Command:",
                }),
                jsxProd_default(Text, {
                  dimColor: true,
                  children: agentServer.command,
                }),
              ],
            }),
          jsxProd_default_2(FlexDirectionRow.Row, {
            children: [
              jsxProd_default(Fragment, {
                children: "Used by:",
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: agentServer.sourceAgents.join(", "),
              }),
            ],
          }),
        ],
      }),
      jsxProd_default(Box, {
        children: jsxProd_default_2(FlexDirectionRow, {
          columns: [
            {
              bold: true,
              width: 8,
            },
            {},
          ],
          children: [
            jsxProd_default_2(FlexDirectionRow.Row, {
              children: [
                jsxProd_default(Fragment, {
                  children: "Status:",
                }),
                jsxProd_default_2(Text, {
                  children: [
                    color("inactive", theme)(figures_default.radioOff),
                    " not connected (agent-only)",
                  ],
                }),
              ],
            }),
            agentServer.needsAuth &&
              jsxProd_default_2(FlexDirectionRow.Row, {
                children: [
                  jsxProd_default(Fragment, {
                    children: "Auth:",
                  }),
                  jsxProd_default_2(Text, {
                    children: [
                      jsxProd_default(StatusIcon, {
                        status: "warning",
                        withSpace: true,
                      }),
                      "may need authentication",
                    ],
                  }),
                ],
              }),
          ],
        }),
      }),
      jsxProd_default(Box, {
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "This server connects only when running the agent.",
        }),
      }),
      error &&
        jsxProd_default(Box, {
          children: jsxProd_default(ErrorText, {
            error,
          }),
        }),
      jsxProd_default(Box, {
        children: jsxProd_default(ModelSelector, {
          options: menuOptions,
          onChange: async (value) => {
            switch (value) {
              case "auth":
                await handleAuthenticate();
                break;
              case "back":
                onCancel();
                break;
            }
          },
          onCancel,
        }),
      }),
    ],
  });
}
export { MCPAgentServerMenu };
