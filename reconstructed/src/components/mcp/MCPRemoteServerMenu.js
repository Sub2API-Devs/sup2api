/**
 * components/mcp/MCPRemoteServerMenu.tsx
 *
 * 远程（http/sse/claude.ai）MCP 服务器菜单：认证（OAuth）、重连、查看工具、启用/禁用、清除认证。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/mcp/MCPRemoteServerMenu.tsx
 * pieces: chunk-vrb44rx7.js (8)
 * attribution: placement 7, fingerprint 1
 */
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { formatToolConnectionState, CapabilitiesSection } from "./CapabilitiesSection.js";
import { color } from "../design-system/color.js";
import { ce, y, R, P, Qr } from "../../../vendor/react/cjs/react.production.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { useAppStateSession, useAppState, useSetAppState } from "../../state/AppState.js";
import { useTheme_2, useTheme } from "../design-system/ThemeProvider.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { getConnectorsSettingsUrl, claudeAiConnectorAuthUrl } from "../../services/mcp/claudeai.js";
import { useCopyUrl, CopiedUrlHint, CopyUrlFallbackHint } from "../CopyUrlHint.js";
import { useMcpReconnect, useMcpToggleEnabled } from "../../services/mcp/MCPConnectionManager.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  normalizeServerNameShort,
  normalizeMcpServerName,
  sanitizeErrorDetail,
} from "../../services/api/deferredToolsState.js";
import {
  describeMcpServerError,
  handleReconnectError,
  formatMcpOperationFailure,
  handleReconnectResult,
} from "./utils/reconnectHelpers.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  filterCommandsByServer,
  excludeCommandsByServer,
  omitKey,
  filterMcpPromptsByServer,
  describeMcpConfigFilePath,
} from "../../services/mcp/utils.js";
import {
  registrationAdviceText,
  findMatchingConnector,
  adviseMcpRegistration,
} from "../../services/mcp/mcpRegistrationAdvice.js";
import { useKeybinding, useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import { isUnattendedBgSession } from "../../utils/concurrentSessions.js";
import { openValidatedUrlSucceeded } from "../../utils/browser.js";
import { capitalize, plural } from "../../utils/stringUtils.js";
import {
  mcpDialBlockCause,
  isMcpServerDisabled,
  MCP_SETTINGS_SCOPE_SET,
  getMcpConfigByName,
  isMcpDialBlockedByPolicy,
  redactManagedMcpServerConfig,
} from "../../services/mcp/config.js";
import {
  mcpRefusalText,
  disabledEnableInMcpText,
  disabledElsewhereText,
} from "../../services/mcp/mcpToggleMessages.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import {
  classifyMcpAuthTarget,
  configHasAuthorizationHeader,
  hasExternalAuthForConfig,
  usesNonOAuthAuth,
} from "../../services/mcp/auth.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { logMCPDebug } from "../../utils/log.js";
import { redactMcpErrorDetail } from "../../services/mcp/mcpServerOrigin.js";
import { revokeStoredMcpTokens } from "../../services/mcp/revokeTokens.js";
import { identityEpoch } from "../../services/mcp/identityChange.js";
import { isDiscoveryCacheUsable } from "../../services/mcp/mcpAccountKey.js";
import { flushDiscoveryCache } from "../../services/mcp/discoveryCache.js";
import { isRemoteMcpTransport } from "../../services/mcp/discoveryIdentity.js";
import { Spinner } from "../Spinner.js";
import { TextInput } from "../TextInput.js";
import { ErrorText } from "../ErrorText.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { BackHint } from "./MCPToolDetailView.js";
import { isCcrInjectedMcpUrl } from "../../services/mcp/ccrMcpUrls.js";
import { getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { Dialog } from "../design-system/Dialog.js";
import { Byline } from "../design-system/Byline.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { FlexDirectionRow } from "../design-system/Table.js";
import { sanitizeCallMark } from "../../services/mcp/mcpCallConstants.js";
import { ModelSelector } from "../agents/ModelSelector.js";

//@ chunk-vrb44rx7.js:6898-6921 placement
function returnFalseRemoteMenu() {
  return false;
}
//@ chunk-vrb44rx7.js:6921-6944 placement
function returnFalseRemoteMenu_2() {
  return false;
}
//@ chunk-vrb44rx7.js:6944-7071 placement
var CANNOT_AUTH_WITHOUT_TERMINAL =
  "Can't authenticate MCP servers while no terminal is attached to this background session. Attach to it and try again.";
//@ chunk-vrb44rx7.js:7071-7123 placement
function mcpModules() {
  return require("./chunk-asne9cp8.js");
}
//@ chunk-vrb44rx7.js:7123-7165 placement
function getMcpAuthModule() {
  return mcpModules().mcpAuthModule();
}
//@ chunk-vrb44rx7.js:7165-7209 placement
function getMcpClientModule() {
  return mcpModules().mcpClientModule();
}
//@ chunk-vrb44rx7.js:7209-8350 placement
/**
 * 渲染 MCP 服务器状态行（disabled、connected 及工具获取失败、needs-auth、配置问题等）。
 */
function renderServerStatusLine(client, serverToolsCount, k) {
  if (client.type === "disabled")
    return jsxProd_default_2(Text, {
      children: [
        jsxProd_default(StatusIcon, {
          status: "off",
          withSpace: true,
        }),
        "disabled",
      ],
    });
  if (client.type === "connected") {
    if (client.discoveryBearerRejected)
      return jsxProd_default_2(Text, {
        children: [
          jsxProd_default(StatusIcon, {
            status: "warning",
            withSpace: true,
          }),
          "connected \xB7 session token rejected",
        ],
      });
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
  if (client.type === "cached") {
    let C = formatToolConnectionState(client.cacheSavedAt, serverToolsCount);
    return jsxProd_default_2(Text, {
      children: [color(C.tone, k)(C.glyph), " ", C.statusText],
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
  if (client.type === "needs-auth")
    return jsxProd_default_2(Text, {
      children: [
        jsxProd_default(StatusIcon, {
          status: "warning",
          withSpace: true,
        }),
        "needs authentication",
      ],
    });
  if (client.errorCode === "UNCONFIGURED")
    return jsxProd_default_2(Text, {
      children: [
        jsxProd_default(StatusIcon, {
          status: "pending",
          withSpace: true,
        }),
        "not configured",
      ],
    });
  return jsxProd_default_2(Text, {
    children: [
      jsxProd_default(StatusIcon, {
        status: "error",
        withSpace: true,
      }),
      client.errorCode === "INVALID_CONFIG" ? "config issue" : "failed",
    ],
  });
}
//@ chunk-vrb44rx7.js:9935-26449 fingerprint = MCPRemoteServerMenu (0.498)
/**
 * 远程 MCP 服务器菜单：显示状态与能力，执行 OAuth 认证（tengu_claudeai_mcp_auth_completed）、重连、清除认证、启用/禁用、查看工具。
 */
function MCPRemoteServerMenu({
  server,
  serverToolsCount,
  onViewTools,
  onCancel,
  onComplete,
  borderless = false,
  hasClaudeAiToken,
  designCredential,
  storedOAuthTokens,
}) {
  let A = ce(
    (de, ...Ge) => onComplete(typeof de === "string" ? sanitizeTelemetryString(de) : de, ...Ge),
    [onComplete],
  );
  let exitState = useAppStateSession();
  let theme = useTheme_2();
  let [B] = useTheme();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let { columns: terminalColumns } = useTerminalSize();
  let [isAuthenticating, setIsAuthenticating] = y(false);
  let [me, ne] = y(null);
  let mcp = useAppState((de) => de.mcp);
  let setAppState = useSetAppState();
  let [authorizationUrl, setAuthorizationUrl] = y(null);
  let [et, je] = y(false);
  let [ae, Se] = y(false);
  let authAbortControllerRef = R(false);
  let authAbortControllerRef_2 = R(null);
  let [isClaudeAIAuthenticating, setIsClaudeAIAuthenticating] = y(false);
  let [claudeAIAuthUrl, setClaudeAIAuthUrl] = y(null);
  let [Ct, oe] = y(undefined);
  let url = Ct?.kind === "connect" ? Ct.url : null;
  let [at, Ot] = y(0);
  let [an, Yt] = y(false);
  let [_e, qe] = y(false);
  let [vt, Lt] = y(false);
  let nn = authorizationUrl || claudeAIAuthUrl || (vt ? getConnectorsSettingsUrl() : null);
  let { copiedVia, copy } = useCopyUrl(nn);
  let [callbackUrlInput, setCallbackUrlInput] = y("");
  let [callbackUrlCursorOffset, setCallbackUrlCursorOffset] = y(0);
  let [mn, xn] = y(null);
  let [Ln, Mn] = y(null);
  P(
    () => () => {
      authAbortControllerRef_2.current?.abort();
    },
    [],
  );
  let fn = server.isAuthenticated ?? (storedOAuthTokens !== null && Qr(storedOAuthTokens));
  let reconnectMcpServer = useMcpReconnect();
  let jt = ce(async () => {
    setIsClaudeAIAuthenticating(false);
    setClaudeAIAuthUrl(null);
    je(true);
    try {
      let result = await reconnectMcpServer(server.name, {
        discardDiscovery: false,
      });
      let success = result.client.type === "connected";
      logEvent("tengu_claudeai_mcp_auth_completed", {
        success,
      });
      if (success) A(`Authentication successful. Connected to ${normalizeServerNameShort(server.name)}.`);
      else if (result.client.type === "needs-auth")
        A(
          `Tried reconnecting, but ${normalizeServerNameShort(server.name)} is still unauthorized. Make sure the browser sign-in completed, then try again from /mcp.`,
        );
      else {
        let Ne = result.client.type === "failed" ? describeMcpServerError(result.client) : "";
        if (isBridgeOrTransport(exitState)) {
          if (Ne)
            logForDebugging(`mcp reconnect failed for ${sanitizeTelemetryString(server.name)}: ${Ne}`, {
              level: "error",
            });
          A(
            `Tried reconnecting to ${normalizeServerNameShort(server.name)}, but the connection failed${Ne ? " (detail withheld on this connection)" : ""}. Restart Claude Code to retry.`,
          );
        } else {
          let mt = Ne ? normalizeMcpServerName(Ne) : "";
          A(
            mt
              ? `Tried reconnecting to ${normalizeServerNameShort(server.name)}, but the connection failed: ${mt}`
              : `Tried reconnecting to ${normalizeServerNameShort(server.name)}, but the connection failed. Restart Claude Code to retry.`,
          );
        }
      }
    } catch (err) {
      logEvent("tengu_claudeai_mcp_auth_completed", {
        success: false,
      });
      A(
        handleReconnectError(err, server.name, {
          config: server.config,
          persistsOffBox: isBridgeOrTransport(exitState),
        }),
      );
    } finally {
      je(false);
    }
  }, [reconnectMcpServer, server.name, server.config, A, exitState]);
  let le = ce(async () => {
    await getMcpClientModule().clearServerCache(server.name, {
      ...server.config,
      scope: server.scope,
    });
    setAppState((prev) => {
      let newClients = prev.mcp.clients.map((client) =>
        client.name === server.name && client.type !== "disabled"
          ? {
              ...client,
              type: "needs-auth",
            }
          : client,
      );
      let newTools = filterCommandsByServer(prev.mcp.tools, server.name);
      let newCommands = excludeCommandsByServer(prev.mcp.commands, server.name);
      let newResources = omitKey(prev.mcp.resources, server.name);
      return {
        ...prev,
        mcp: {
          ...prev.mcp,
          clients: newClients,
          tools: newTools,
          commands: newCommands,
          resources: newResources,
        },
      };
    });
    logEvent("tengu_claudeai_mcp_clear_auth_completed", {});
    A(`Disconnected from ${normalizeServerNameShort(server.name)}.`);
    qe(false);
    Lt(false);
  }, [server.name, server.config, server.scope, setAppState, A]);
  function Te() {
    authAbortControllerRef_2.current?.abort();
    authAbortControllerRef_2.current = null;
    setIsAuthenticating(false);
    setAuthorizationUrl(null);
  }
  function Ue() {
    setIsClaudeAIAuthenticating(false);
    setClaudeAIAuthUrl(null);
    if (Ct) ne(registrationAdviceText(Ct));
  }
  function dt() {
    qe(false);
    Lt(false);
  }
  useKeybinding("confirm:no", Te, {
    context: "Confirmation",
    isActive: isAuthenticating,
  });
  useKeybinding("confirm:no", Ue, {
    context: "Confirmation",
    isActive: isClaudeAIAuthenticating,
  });
  useKeybinding("confirm:no", dt, {
    context: "Confirmation",
    isActive: _e,
  });
  let globalExitKeybindings = useGlobalExitKeybindings(
    isAuthenticating ? Te : isClaudeAIAuthenticating ? Ue : _e ? dt : undefined,
  );
  function wt(raw) {
    if (raw.key === "return" && isClaudeAIAuthenticating) {
      raw.preventDefault();
      if (server.config.type === "claudeai-proxy") jt();
      else qt();
    }
    if (raw.key === "return" && _e) {
      raw.preventDefault();
      if (isUnattendedBgSession()) {
        qe(false);
        Lt(false);
        ne(CANNOT_AUTH_WITHOUT_TERMINAL);
        return;
      }
      if (vt) le();
      else {
        Lt(true);
        openValidatedUrlSucceeded(getConnectorsSettingsUrl());
      }
    }
    if (raw.key === "c" && !raw.ctrl && !raw.meta && nn) {
      raw.preventDefault();
      copy(nn);
    }
  }
  let capitalizedServerName = capitalize(String(server.name));
  let serverCommandsCount = filterMcpPromptsByServer(mcp.commands, server.name).length;
  let toggleMcpServer = useMcpToggleEnabled();
  let ke = ce(() => {
    let de = mcpDialBlockCause(server.name, server.client.config);
    if (de === "managed-policy") {
      ne(mcpRefusalText(server.name, de, server.client.config));
      return true;
    }
    let productSurface = isMcpServerDisabled(server.name);
    if (server.client.type === "disabled" || productSurface) {
      ne(
        server.client.type === "disabled"
          ? disabledEnableInMcpText(server.name)
          : disabledElsewhereText(server.name),
      );
      return true;
    }
    if (de) {
      ne(mcpRefusalText(server.name, de, server.client.config));
      return true;
    }
    ne(null);
    return false;
  }, [server.client.type, server.name, server.client.config]);
  let ht = ce(async () => {
    if (ke()) return;
    let de =
      (server.config.type === "claudeai-proxy" ? claudeAiConnectorAuthUrl(server.config) : null) ??
      getConnectorsSettingsUrl();
    setClaudeAIAuthUrl(de);
    setIsClaudeAIAuthenticating(true);
    logEvent("tengu_claudeai_mcp_auth_started", {});
    await openValidatedUrlSucceeded(de);
  }, [server.config, ke]);
  let Jt = ce(async () => {
    if (url === null || ke()) return;
    setClaudeAIAuthUrl(url);
    setIsClaudeAIAuthenticating(true);
    Ot(Date.now());
    logEvent("tengu_mcp_claudeai_handoff_opened", {
      site: lit("mcp_menu"),
      opened_browser: true,
    });
    await openValidatedUrlSucceeded(url);
  }, [url, ke]);
  let qt = ce(async () => {
    switch (
      (setIsClaudeAIAuthenticating(false),
      setClaudeAIAuthUrl(null),
      Yt(true),
      await findMatchingConnector(server.client.config, at, theme))
    ) {
      case "connected":
        A(
          `${normalizeServerNameShort(server.name)} is connected on claude.ai. Its tools load as a claude.ai connector the next time you start Claude Code.`,
        );
        return;
      case "not_connected":
        ne(
          "Not connected on claude.ai yet for the account Claude Code is signed in to. Choose Connect on claude.ai to try again.",
        );
        break;
      case "state_unknown":
        ne(
          "claude.ai didn't say whether this server is connected there. If you connected it, its tools load as a claude.ai connector the next time you start Claude Code. If not, choose Connect on claude.ai.",
        );
        break;
      case "list_unavailable":
        ne("Couldn't check with claude.ai. Choose Connect on claude.ai to try again.");
        break;
    }
    Yt(false);
  }, [server.client.config, server.name, at, theme, A]);
  let handleClaudeAIClearAuth = ce(() => {
    qe(true);
    logEvent("tengu_claudeai_mcp_clear_auth_started", {});
  }, []);
  let handleToggleEnabled = ce(async () => {
    let wasEnabled = server.client.type !== "disabled";
    try {
      await toggleMcpServer(server.name);
      if (server.config.type === "claudeai-proxy")
        logEvent("tengu_claudeai_mcp_toggle", {
          new_state: lit(wasEnabled ? "disabled" : "enabled"),
        });
      onCancel();
    } catch (err_0) {
      A(
        formatMcpOperationFailure(err_0, server.name, wasEnabled ? "disable" : "enable", {
          config: server.config,
          persistsOffBox: isBridgeOrTransport(exitState),
        }),
      );
    }
  }, [server.client.type, server.config, server.name, toggleMcpServer, onCancel, A, exitState]);
  let handleAuthenticate = ce(async () => {
    if (ke()) return;
    let de = classifyMcpAuthTarget(server.name, {
      ...server.config,
      scope: server.scope,
    });
    if (de.kind === "anthropic-hosted") {
      ne(de.message);
      return;
    }
    if (de.kind !== "oauth") return;
    setIsAuthenticating(true);
    ne(null);
    let controller = new AbortController();
    authAbortControllerRef_2.current = controller;
    try {
      let Ne = await getMcpAuthModule().snapshotServerTokens(server.name, de.config);
      await getMcpAuthModule().performMCPOAuthFlow(
        server.name,
        de.config,
        setAuthorizationUrl,
        controller.signal,
        {
          onWaitingForCallback: (submit) => {
            xn(() => submit);
          },
        },
      );
      logEvent("tengu_mcp_auth_config_authenticate", {
        wasAuthenticated: fn,
      });
      let result = await reconnectMcpServer(server.name, {
        discardDiscovery: false,
      });
      if (result.client.type === "connected") {
        if (Ne) await getMcpAuthModule().revokeReplacedServerTokens(server.name, de.config, Ne);
        let message =
          fn || isConnectedOrCached(server.client)
            ? `Authentication successful. Reconnected to ${normalizeServerNameShort(server.name)}.`
            : `Authentication successful. Connected to ${normalizeServerNameShort(server.name)}.`;
        A(message);
      } else if (result.client.type === "needs-auth")
        A(
          `Got new credentials, but ${normalizeServerNameShort(server.name)} rejected them on reconnect. Try re-authenticating, or restart Claude Code if it persists.`,
        );
      else {
        logMCPDebug(server.name, "Reconnection failed after authentication");
        let en = result.client.type === "failed" ? describeMcpServerError(result.client) : "";
        if (isBridgeOrTransport(exitState)) {
          if (en)
            logForDebugging(
              `mcp post-auth reconnect failed for ${sanitizeTelemetryString(server.name)}: ${en}`,
              {
                level: "error",
              },
            );
          A(
            `Got new credentials, but reconnecting to ${normalizeServerNameShort(server.name)} failed${en ? " (detail withheld on this connection)" : ""}. Restart Claude Code to retry.`,
          );
        } else {
          let Pt = en ? normalizeMcpServerName(en) : "";
          A(
            Pt
              ? `Got new credentials, but reconnecting to ${normalizeServerNameShort(server.name)} failed: ${Pt}`
              : `Got new credentials, but reconnecting to ${normalizeServerNameShort(server.name)} failed. Restart Claude Code to retry.`,
          );
        }
      }
    } catch (err_1) {
      if (err_1 instanceof Error && !(err_1 instanceof getMcpAuthModule().AuthenticationCancelledError)) {
        let mt = await adviseMcpRegistration(err_1, server.name, server.client.config, "mcp_menu");
        if (mt?.kind === "connect" || mt?.kind === "connected")
          for (let connectorName of mt.connectorNames)
            await getMcpClientModule().removeMcpAuthCacheEntry(connectorName, theme.storageV5);
        oe(mt);
        ne(
          mt
            ? registrationAdviceText(mt)
            : sanitizeErrorDetail(redactMcpErrorDetail(server.name, server.config, err_1.message)),
        );
      }
    } finally {
      setIsAuthenticating(false);
      authAbortControllerRef_2.current = null;
      xn(null);
      setCallbackUrlInput("");
      Mn(null);
      setAuthorizationUrl(null);
    }
  }, [
    fn,
    server.config,
    server.client,
    server.name,
    server.scope,
    theme,
    A,
    reconnectMcpServer,
    ke,
    exitState,
  ]);
  let handleClearAuth = async () => {
    if (server.config.type === "claudeai-proxy" || authAbortControllerRef.current) return;
    authAbortControllerRef.current = true;
    Se(true);
    try {
      let de = MCP_SETTINGS_SCOPE_SET.has(server.scope) ? getMcpConfigByName(server.name) : null;
      if (
        !(
          await revokeStoredMcpTokens(server.name, [
            {
              ...server.config,
              scope: server.scope,
            },
            server.client.config,
            ...(de ? [de] : []),
          ])
        ).cleared
      ) {
        A(
          `Authentication for ${normalizeServerNameShort(server.name)} was not cleared: sign-in data is still stored, or the credential store could not be read. Try Clear authentication again.`,
        );
        return;
      }
      logEvent("tengu_mcp_auth_config_clear", {});
      let Ge = `Authentication cleared for ${normalizeServerNameShort(server.name)}.`;
      let Ne = {
        ...server.config,
        scope: server.scope,
      };
      let mt = identityEpoch();
      if (isDiscoveryCacheUsable())
        await flushDiscoveryCache(
          getMcpClientModule()
            .dropDiscoveryEntry(server.name, Ne)
            .catch(() => {}),
        );
      if (!(isRemoteMcpTransport(Ne) && identityEpoch() !== mt))
        await getMcpClientModule().clearServerCache(server.name, Ne);
      setAppState((prev) => {
        let newClients = prev.mcp.clients.map((c_0) =>
          c_0.name === server.name && c_0.type !== "disabled"
            ? {
                ...c_0,
                type: "failed",
              }
            : c_0,
        );
        let newTools = filterCommandsByServer(prev.mcp.tools, server.name);
        let newCommands = excludeCommandsByServer(prev.mcp.commands, server.name);
        let newResources = omitKey(prev.mcp.resources, server.name);
        return {
          ...prev,
          mcp: {
            ...prev.mcp,
            clients: newClients,
            tools: newTools,
            commands: newCommands,
            resources: newResources,
          },
        };
      });
      if (
        !(isRemoteMcpTransport(Ne) && identityEpoch() !== mt) &&
        server.client.type !== "failed" &&
        server.client.type !== "disabled" &&
        !isMcpServerDisabled(server.name) &&
        mcpDialBlockCause(server.name, server.client.config) === null
      ) {
        try {
          let Pt = await reconnectMcpServer(server.name, {
            discardDiscovery: false,
            revokeTokens: true,
          });
          let { message } = handleReconnectResult(
            Pt,
            server.name,
            {
              persistsOffBox: isBridgeOrTransport(exitState),
            },
            {
              hasHeadersHelper: Un,
            },
          );
          A(`${Ge} ${message}`);
        } catch (error) {
          A(
            `${Ge} ${handleReconnectError(error, server.name, {
              config: server.config,
              persistsOffBox: isBridgeOrTransport(exitState),
            })}`,
          );
        }
        return;
      }
      A(Ge);
    } finally {
      authAbortControllerRef.current = false;
      Se(false);
    }
  };
  if (isAuthenticating) {
    let children =
      server.config.type !== "claudeai-proxy" && server.config.oauth?.xaa
        ? " Authenticating via your identity provider"
        : " A browser window will open for authentication";
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      padding: 1,
      tabIndex: 0,
      autoFocus: true,
      onKeyDown: wt,
      children: [
        jsxProd_default_2(Text, {
          color: "claude",
          children: ["Authenticating with ", server.name, "\u2026"],
        }),
        jsxProd_default_2(Box, {
          children: [
            jsxProd_default(Spinner, {}),
            jsxProd_default(Text, {
              children,
            }),
          ],
        }),
        authorizationUrl &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default_2(Box, {
                children: [
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: ["If your browser doesn't open automatically, copy this URL manually", " "],
                  }),
                  jsxProd_default(CopiedUrlHint, {
                    via: copiedVia,
                  }),
                ],
              }),
              jsxProd_default(CopyUrlFallbackHint, {
                via: copiedVia,
              }),
              jsxProd_default(Link, {
                url: authorizationUrl,
                assumeSupport: true,
              }),
            ],
          }),
        isAuthenticating &&
          authorizationUrl &&
          mn &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            marginTop: 1,
            children: [
              jsxProd_default(Text, {
                dimColor: true,
                children:
                  "If the redirect page shows a connection error, paste the URL from your browser's address bar:",
              }),
              jsxProd_default_2(Box, {
                children: [
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: ["URL ", ">", " "],
                  }),
                  jsxProd_default(TextInput, {
                    value: callbackUrlInput,
                    onChange: setCallbackUrlInput,
                    onSubmit: (value) => {
                      let trimmed = value.trim();
                      Mn(
                        !trimmed || mn(trimmed)
                          ? null
                          : "That isn't this sign-in's redirect URL \u2014 paste the address from the browser page this sign-in opened.",
                      );
                      setCallbackUrlInput("");
                    },
                    cursorOffset: callbackUrlCursorOffset,
                    onChangeCursorOffset: setCallbackUrlCursorOffset,
                    columns: terminalColumns - 8,
                  }),
                ],
              }),
              jsxProd_default(ErrorText, {
                error: Ln,
              }),
            ],
          }),
        jsxProd_default(Box, {
          marginLeft: 3,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: globalExitKeybindings.pending
              ? `Press ${globalExitKeybindings.keyName} again to go back`
              : jsxProd_default_2(Fragment, {
                  children: [
                    "Return here after authenticating in your browser. Press",
                    " ",
                    jsxProd_default(KeyboardShortcutHint, {
                      chord: "escape",
                      action: "go back",
                    }),
                    ".",
                  ],
                }),
          }),
        }),
      ],
    });
  }
  if (isClaudeAIAuthenticating)
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      padding: 1,
      tabIndex: 0,
      autoFocus: true,
      onKeyDown: wt,
      children: [
        jsxProd_default_2(Text, {
          color: "claude",
          children: ["Authenticating with ", server.name, "\u2026"],
        }),
        jsxProd_default_2(Box, {
          children: [
            jsxProd_default(Spinner, {}),
            jsxProd_default(Text, {
              children: " A browser window will open for authentication",
            }),
          ],
        }),
        claudeAIAuthUrl &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default_2(Box, {
                children: [
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: ["If your browser doesn't open automatically, copy this URL manually", " "],
                  }),
                  jsxProd_default(CopiedUrlHint, {
                    via: copiedVia,
                  }),
                ],
              }),
              jsxProd_default(CopyUrlFallbackHint, {
                via: copiedVia,
              }),
              jsxProd_default(Link, {
                url: claudeAIAuthUrl,
                assumeSupport: true,
              }),
            ],
          }),
        jsxProd_default_2(Box, {
          marginLeft: 3,
          flexDirection: "column",
          children: [
            jsxProd_default_2(Text, {
              color: "permission",
              children: [
                "Press ",
                jsxProd_default(Text, {
                  bold: true,
                  children: "Enter",
                }),
                " after authenticating in your browser.",
              ],
            }),
            jsxProd_default(BackHint, {
              exitState: globalExitKeybindings,
            }),
          ],
        }),
      ],
    });
  if (_e)
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      padding: 1,
      tabIndex: 0,
      autoFocus: true,
      onKeyDown: wt,
      children: [
        jsxProd_default_2(Text, {
          color: "claude",
          children: ["Clear authentication for ", server.name],
        }),
        vt
          ? jsxProd_default_2(Fragment, {
              children: [
                jsxProd_default(Text, {
                  children: 'Find the MCP server in the browser and click "Disconnect".',
                }),
                jsxProd_default_2(Box, {
                  flexDirection: "column",
                  children: [
                    jsxProd_default_2(Box, {
                      children: [
                        jsxProd_default_2(Text, {
                          dimColor: true,
                          children: [
                            "If your browser didn't open automatically, copy this URL manually",
                            " ",
                          ],
                        }),
                        jsxProd_default(CopiedUrlHint, {
                          via: copiedVia,
                        }),
                      ],
                    }),
                    jsxProd_default(CopyUrlFallbackHint, {
                      via: copiedVia,
                    }),
                    jsxProd_default(Link, {
                      url: getConnectorsSettingsUrl(),
                    }),
                  ],
                }),
                jsxProd_default_2(Box, {
                  marginLeft: 3,
                  flexDirection: "column",
                  children: [
                    jsxProd_default_2(Text, {
                      color: "permission",
                      children: [
                        "Press ",
                        jsxProd_default(Text, {
                          bold: true,
                          children: "Enter",
                        }),
                        " when done.",
                      ],
                    }),
                    jsxProd_default(BackHint, {
                      exitState: globalExitKeybindings,
                    }),
                  ],
                }),
              ],
            })
          : jsxProd_default_2(Fragment, {
              children: [
                jsxProd_default(Text, {
                  children:
                    'This will open claude.ai in the browser. Find the MCP server in the list and click "Disconnect".',
                }),
                jsxProd_default_2(Box, {
                  marginLeft: 3,
                  flexDirection: "column",
                  children: [
                    jsxProd_default_2(Text, {
                      color: "permission",
                      children: [
                        "Press",
                        " ",
                        jsxProd_default(KeyboardShortcutHint, {
                          chord: "enter",
                          action: "open the browser",
                          bold: true,
                        }),
                        ".",
                      ],
                    }),
                    jsxProd_default(BackHint, {
                      exitState: globalExitKeybindings,
                    }),
                  ],
                }),
              ],
            }),
      ],
    });
  if (an)
    return jsxProd_default_2(Box, {
      padding: 1,
      children: [
        jsxProd_default(Spinner, {}),
        jsxProd_default(Text, {
          children: " Checking with claude.ai\u2026",
        }),
      ],
    });
  if (ae)
    return jsxProd_default_2(Box, {
      padding: 1,
      children: [
        jsxProd_default(Spinner, {}),
        jsxProd_default_2(Text, {
          children: [" Clearing authentication for ", server.name, "\u2026"],
        }),
      ],
    });
  if (et)
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      padding: 1,
      children: [
        jsxProd_default_2(Text, {
          color: "text",
          children: [
            "Connecting to ",
            jsxProd_default(Text, {
              bold: true,
              children: server.name,
            }),
            "\u2026",
          ],
        }),
        jsxProd_default_2(Box, {
          children: [
            jsxProd_default(Spinner, {}),
            jsxProd_default(Text, {
              children: " Establishing connection to MCP server",
            }),
          ],
        }),
        jsxProd_default(Text, {
          dimColor: true,
          children: "This may take a few moments.",
        }),
      ],
    });
  let menuOptions = [];
  if (server.client.type === "disabled")
    menuOptions.push({
      label: "Enable",
      value: "toggle-enabled",
    });
  if (isConnectedOrCached(server.client) && serverToolsCount > 0)
    menuOptions.push({
      label: "View tools",
      value: "tools",
    });
  let Fn =
    (server.config.type === "sse" || server.config.type === "http") &&
    configHasAuthorizationHeader(server.config);
  let sn =
    (server.config.type === "sse" || server.config.type === "http") &&
    hasExternalAuthForConfig(
      server.config,
      hasClaudeAiToken || (designCredential !== null && Qr(designCredential)),
    );
  let Rn = server.client.type === "failed" && server.client.errorCode === "HEADERS_HELPER_AUTH_REJECTED";
  let Un = server.config.type !== "claudeai-proxy" && !!server.config.headersHelper;
  let An = isConnectedOrCached(server.client) && serverToolsCount > 0;
  let Bn =
    fn ||
    (An &&
      server.config.type !== "claudeai-proxy" &&
      (usesNonOAuthAuth(server.config) ||
        sn ||
        (isCcrInjectedMcpUrl(server.name, {
          ...server.config,
          scope: server.scope,
        }) &&
          getSessionIngressAuthToken() !== null)));
  let Tn =
    server.client.type === "disabled" ||
    isMcpServerDisabled(server.name) ||
    isMcpDialBlockedByPolicy(server.name, server.client.config);
  if (server.config.type === "claudeai-proxy") {
    if (server.client.type === "connected")
      menuOptions.push({
        label: "Clear authentication",
        value: "claudeai-clear-auth",
      });
    else if (!Tn)
      menuOptions.push({
        label: "Authenticate",
        value: "claudeai-auth",
      });
  } else {
    let de = !Tn && !sn && !Rn && URL.canParse(server.config.url);
    if (url !== null && !Tn)
      menuOptions.push({
        label: "Connect on claude.ai",
        value: "claudeai-handoff",
      });
    if (fn) {
      if (de)
        menuOptions.push({
          label: "Re-authenticate",
          value: "reauth",
        });
      menuOptions.push({
        label: "Clear authentication",
        value: "clear-auth",
      });
    } else if (de)
      menuOptions.push({
        label: "Authenticate",
        value: "auth",
      });
  }
  if (server.client.type !== "disabled") {
    if (server.client.type !== "needs-auth" || Un || Fn)
      menuOptions.push({
        label: "Reconnect",
        value: "reconnectMcpServer",
      });
    menuOptions.push({
      label: "Disable",
      value: "toggle-enabled",
    });
  }
  if (menuOptions.length === 0)
    menuOptions.push({
      label: "Back",
      value: "back",
    });
  let ze = ["reauth", "clear-auth", "claudeai-clear-auth"];
  let defaultFocusValue = menuOptions.some((value_0) => value_0.value === "claudeai-handoff")
    ? "claudeai-handoff"
    : menuOptions[0] && ze.includes(menuOptions[0].value)
      ? menuOptions.find((menuOption) => !ze.includes(menuOption.value))?.value
      : undefined;
  return jsxProd_default(Box, {
    flexDirection: "column",
    paddingX: borderless ? 1 : 0,
    children: jsxProd_default_2(Dialog, {
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
                    renderServerStatusLine(server.client, serverToolsCount, B),
                  ],
                }),
                (server.client.type === "failed" || server.client.type === "needs-auth") &&
                  server.client.error &&
                  jsxProd_default_2(FlexDirectionRow.Row, {
                    children: [
                      jsxProd_default(Fragment, {
                        children: "Issue:",
                      }),
                      jsxProd_default(Text, {
                        dimColor: true,
                        children: sanitizeErrorDetail(
                          server.client.type === "failed" && server.client.displayDetail
                            ? `${server.client.error} ${server.client.displayDetail}`
                            : server.client.error,
                        ),
                      }),
                    ],
                  }),
                server.transport !== "claudeai-proxy" &&
                  jsxProd_default_2(FlexDirectionRow.Row, {
                    children: [
                      jsxProd_default(Fragment, {
                        children: "Auth:",
                      }),
                      Bn
                        ? jsxProd_default_2(Text, {
                            children: [
                              jsxProd_default(StatusIcon, {
                                status: "success",
                                withSpace: true,
                              }),
                              "authenticated",
                            ],
                          })
                        : An
                          ? jsxProd_default(Text, {
                              dimColor: true,
                              children: "not signed in",
                            })
                          : jsxProd_default_2(Text, {
                              children: [
                                jsxProd_default(StatusIcon, {
                                  status: "error",
                                  withSpace: true,
                                }),
                                "not authenticated",
                              ],
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
                server.transport === "claudeai-proxy" &&
                  server.scope === "claudeai" &&
                  server.config.enterpriseManaged &&
                  jsxProd_default_2(FlexDirectionRow.Row, {
                    children: [
                      jsxProd_default(Fragment, {
                        children: "Managed:",
                      }),
                      jsxProd_default(Text, {
                        dimColor: true,
                        children: "by your organization",
                      }),
                    ],
                  }),
                jsxProd_default_2(FlexDirectionRow.Row, {
                  children: [
                    jsxProd_default(Fragment, {
                      children: "URL:",
                    }),
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: redactManagedMcpServerConfig(
                        {
                          url: server.displayEndpoint,
                        },
                        server.scope,
                      ).url,
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
                      children: describeMcpConfigFilePath(server.scope),
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
              server.client.discoveryBearerRejected &&
              jsxProd_default_2(Box, {
                flexDirection: "column",
                children: [
                  jsxProd_default(Text, {
                    bold: true,
                    children: "Issue: ",
                  }),
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: "claude.ai rejected the session token. Run /login, then reconnect.",
                  }),
                ],
              }),
            server.client.type === "connected" &&
              !server.client.discoveryBearerRejected &&
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
        me &&
          jsxProd_default(Box, {
            children: jsxProd_default(ErrorText, {
              error: me,
            }),
          }),
        menuOptions.length > 0 &&
          jsxProd_default(Box, {
            children: jsxProd_default(ModelSelector, {
              options: menuOptions,
              defaultFocusValue,
              onChange: async (de) => {
                if (
                  isUnattendedBgSession() &&
                  (de === "auth" ||
                    de === "reauth" ||
                    de === "clear-auth" ||
                    de === "claudeai-auth" ||
                    de === "claudeai-handoff" ||
                    de === "claudeai-clear-auth")
                ) {
                  ne(CANNOT_AUTH_WITHOUT_TERMINAL);
                  return;
                }
                switch (de) {
                  case "tools":
                    onViewTools();
                    break;
                  case "auth":
                  case "reauth":
                    await handleAuthenticate();
                    break;
                  case "clear-auth":
                    await handleClearAuth();
                    break;
                  case "claudeai-auth":
                    await ht();
                    break;
                  case "claudeai-handoff":
                    await Jt();
                    break;
                  case "claudeai-clear-auth":
                    handleClaudeAIClearAuth();
                    break;
                  case "reconnectMcpServer":
                    je(true);
                    try {
                      let result = await reconnectMcpServer(server.name);
                      if (server.config.type === "claudeai-proxy")
                        logEvent("tengu_claudeai_mcp_reconnect", {
                          success: result.client.type === "connected",
                        });
                      let { message } = handleReconnectResult(
                        result,
                        server.name,
                        {
                          persistsOffBox: isBridgeOrTransport(exitState),
                        },
                        {
                          hasHeadersHelper: Un,
                        },
                      );
                      A(message);
                    } catch (err) {
                      if (server.config.type === "claudeai-proxy")
                        logEvent("tengu_claudeai_mcp_reconnect", {
                          success: false,
                        });
                      A(
                        handleReconnectError(err, server.name, {
                          config: server.config,
                          persistsOffBox: isBridgeOrTransport(exitState),
                        }),
                      );
                    } finally {
                      je(false);
                    }
                    break;
                  case "toggle-enabled":
                    await handleToggleEnabled();
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
    }),
  });
}
export { CANNOT_AUTH_WITHOUT_TERMINAL, returnFalseRemoteMenu, returnFalseRemoteMenu_2, MCPRemoteServerMenu };
