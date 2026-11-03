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
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { formatToolConnectionState, CapabilitiesSection } from "./CapabilitiesSection.js";
import { color } from "../design-system/color.js";
import { ce, y, R, P, Qr } from "../../../vendor/react/cjs/react.production.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { useAppStateSession, useAppState, useSetAppState } from "../../state/AppState.js";
import { Me, useTheme } from "../design-system/ThemeProvider.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { getConnectorsSettingsUrl, claudeAiConnectorAuthUrl } from "../../services/mcp/claudeai.js";
import { useCopyUrl, CopiedUrlHint, CopyUrlFallbackHint } from "../CopyUrlHint.js";
import { useMcpReconnect, useMcpToggleEnabled } from "../../services/mcp/MCPConnectionManager.js";
import { logEvent } from "../../services/analytics/index.js";
import { uo, normalizeMcpServerName, sanitizeErrorDetail } from "../../services/api/deferredToolsState.js";
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
  $jt,
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
import { fi } from "../../utils/browser.js";
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
import { IM } from "../../services/mcp/mcpAccountKey.js";
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
import { HPe } from "../../services/mcp/mcpCallConstants.js";
import { ModelSelector } from "../agents/ModelSelector.js";

//@ chunk-vrb44rx7.js:6898-6921 placement
function ag() {
  return !1;
}
//@ chunk-vrb44rx7.js:6921-6944 placement
function lg() {
  return !1;
}
//@ chunk-vrb44rx7.js:6944-7071 placement
var CANNOT_AUTH_WITHOUT_TERMINAL =
  "Can't authenticate MCP servers while no terminal is attached to this background session. Attach to it and try again.";
//@ chunk-vrb44rx7.js:7071-7123 placement
function Uc() {
  return require("./chunk-asne9cp8.js");
}
//@ chunk-vrb44rx7.js:7123-7165 placement
function mr() {
  return Uc().mcpAuthModule();
}
//@ chunk-vrb44rx7.js:7165-7209 placement
function gr() {
  return Uc().mcpClientModule();
}
/**
 * 渲染 MCP 服务器状态行（disabled、connected 及工具获取失败、needs-auth、配置问题等）。
 */
//@ chunk-vrb44rx7.js:7209-8350 placement
function renderServerStatusLine(i, h, k) {
  if (i.type === "disabled")
    return r(Text, { children: [e(StatusIcon, { status: "off", withSpace: !0 }), "disabled"] });
  if (i.type === "connected") {
    if (i.discoveryBearerRejected)
      return r(Text, {
        children: [
          e(StatusIcon, { status: "warning", withSpace: !0 }),
          "connected \xB7 session token rejected",
        ],
      });
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
  if (i.type === "cached") {
    let C = formatToolConnectionState(i.cacheSavedAt, h);
    return r(Text, { children: [color(C.tone, k)(C.glyph), " ", C.statusText] });
  }
  if (i.type === "pending")
    return r(Text, { children: [e(StatusIcon, { status: "pending", withSpace: !0 }), "connecting\u2026"] });
  if (i.type === "needs-auth")
    return r(Text, {
      children: [e(StatusIcon, { status: "warning", withSpace: !0 }), "needs authentication"],
    });
  if (i.errorCode === "UNCONFIGURED")
    return r(Text, { children: [e(StatusIcon, { status: "pending", withSpace: !0 }), "not configured"] });
  return r(Text, {
    children: [
      e(StatusIcon, { status: "error", withSpace: !0 }),
      i.errorCode === "INVALID_CONFIG" ? "config issue" : "failed",
    ],
  });
}
/**
 * 远程 MCP 服务器菜单：显示状态与能力，执行 OAuth 认证（tengu_claudeai_mcp_auth_completed）、重连、清除认证、启用/禁用、查看工具。
 */
//@ chunk-vrb44rx7.js:9935-26449 fingerprint = MCPRemoteServerMenu (0.498)
function MCPRemoteServerMenu({
  server: server,
  serverToolsCount: serverToolsCount,
  onViewTools: onViewTools,
  onCancel: onCancel,
  onComplete: onComplete,
  borderless: borderless = !1,
  hasClaudeAiToken: hasClaudeAiToken,
  designCredential: designCredential,
  storedOAuthTokens: storedOAuthTokens,
}) {
  let A = ce(
      (de, ...Ge) => onComplete(typeof de === "string" ? sanitizeTelemetryString(de) : de, ...Ge),
      [onComplete],
    ),
    exitState = useAppStateSession(),
    V = Me(),
    [B] = useTheme(),
    _ = useIsScreenReaderEnabled(),
    { columns: terminalColumns } = useTerminalSize(),
    [pe, fe] = y(!1),
    [me, ne] = y(null),
    mcp = useAppState((de) => de.mcp),
    setAppState = useSetAppState(),
    [Oe, rt] = y(null),
    [et, je] = y(!1),
    [ae, Se] = y(!1),
    authAbortControllerRef = R(!1),
    copyTimeoutRef = R(null),
    [Ke, Et] = y(!1),
    [He, ct] = y(null),
    [Ct, oe] = y(void 0),
    ft = Ct?.kind === "connect" ? Ct.url : null,
    [at, Ot] = y(0),
    [an, Yt] = y(!1),
    [_e, qe] = y(!1),
    [vt, Lt] = y(!1),
    nn = Oe || He || (vt ? getConnectorsSettingsUrl() : null),
    { copiedVia: copiedVia, copy: copy } = useCopyUrl(nn),
    [yt, Ut] = y(""),
    [on, rn] = y(0),
    [mn, xn] = y(null),
    [Ln, Mn] = y(null);
  P(
    () => () => {
      copyTimeoutRef.current?.abort();
    },
    [],
  );
  let fn = server.isAuthenticated ?? (storedOAuthTokens !== null && Qr(storedOAuthTokens)),
    reconnectMcpServer = useMcpReconnect(),
    jt = ce(async () => {
      (Et(!1), ct(null), je(!0));
      try {
        let de = await reconnectMcpServer(server.name, { discardDiscovery: !1 }),
          Ge = de.client.type === "connected";
        if ((logEvent("tengu_claudeai_mcp_auth_completed", { success: Ge }), Ge))
          A(`Authentication successful. Connected to ${uo(server.name)}.`);
        else if (de.client.type === "needs-auth")
          A(
            `Tried reconnecting, but ${uo(server.name)} is still unauthorized. Make sure the browser sign-in completed, then try again from /mcp.`,
          );
        else {
          let Ne = de.client.type === "failed" ? describeMcpServerError(de.client) : "";
          if (isBridgeOrTransport(exitState)) {
            if (Ne)
              logForDebugging(`mcp reconnect failed for ${sanitizeTelemetryString(server.name)}: ${Ne}`, {
                level: "error",
              });
            A(
              `Tried reconnecting to ${uo(server.name)}, but the connection failed${Ne ? " (detail withheld on this connection)" : ""}. Restart Claude Code to retry.`,
            );
          } else {
            let mt = Ne ? normalizeMcpServerName(Ne) : "";
            A(
              mt
                ? `Tried reconnecting to ${uo(server.name)}, but the connection failed: ${mt}`
                : `Tried reconnecting to ${uo(server.name)}, but the connection failed. Restart Claude Code to retry.`,
            );
          }
        }
      } catch (err) {
        (logEvent("tengu_claudeai_mcp_auth_completed", { success: !1 }),
          A(
            handleReconnectError(err, server.name, {
              config: server.config,
              persistsOffBox: isBridgeOrTransport(exitState),
            }),
          ));
      } finally {
        je(!1);
      }
    }, [reconnectMcpServer, server.name, server.config, A, exitState]),
    le = ce(async () => {
      (await gr().clearServerCache(server.name, { ...server.config, scope: server.scope }),
        setAppState((prev) => {
          let newClients = prev.mcp.clients.map((client) =>
              client.name === server.name && client.type !== "disabled"
                ? { ...client, type: "needs-auth" }
                : client,
            ),
            newTools = filterCommandsByServer(prev.mcp.tools, server.name),
            newCommands = excludeCommandsByServer(prev.mcp.commands, server.name),
            newResources = $jt(prev.mcp.resources, server.name);
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
        }),
        logEvent("tengu_claudeai_mcp_clear_auth_completed", {}),
        A(`Disconnected from ${uo(server.name)}.`),
        qe(!1),
        Lt(!1));
    }, [server.name, server.config, server.scope, setAppState, A]);
  function Te() {
    (copyTimeoutRef.current?.abort(), (copyTimeoutRef.current = null), fe(!1), rt(null));
  }
  function Ue() {
    if ((Et(!1), ct(null), Ct)) ne(registrationAdviceText(Ct));
  }
  function dt() {
    (qe(!1), Lt(!1));
  }
  (useKeybinding("confirm:no", Te, { context: "Confirmation", isActive: pe }),
    useKeybinding("confirm:no", Ue, { context: "Confirmation", isActive: Ke }),
    useKeybinding("confirm:no", dt, { context: "Confirmation", isActive: _e }));
  let Dt = useGlobalExitKeybindings(pe ? Te : Ke ? Ue : _e ? dt : void 0);
  function wt(raw) {
    if (raw.key === "return" && Ke)
      (raw.preventDefault(), server.config.type === "claudeai-proxy" ? jt() : qt());
    if (raw.key === "return" && _e) {
      if ((raw.preventDefault(), isUnattendedBgSession())) {
        (qe(!1), Lt(!1), ne(CANNOT_AUTH_WITHOUT_TERMINAL));
        return;
      }
      if (vt) le();
      else (Lt(!0), fi(getConnectorsSettingsUrl()));
    }
    if (raw.key === "c" && !raw.ctrl && !raw.meta && nn) (raw.preventDefault(), copy(nn));
  }
  let capitalizedServerName = capitalize(String(server.name)),
    serverCommandsCount = filterMcpPromptsByServer(mcp.commands, server.name).length,
    toggleMcpServer = useMcpToggleEnabled(),
    ke = ce(() => {
      let de = mcpDialBlockCause(server.name, server.client.config);
      if (de === "managed-policy") return (ne(mcpRefusalText(server.name, de, server.client.config)), !0);
      let productSurface = isMcpServerDisabled(server.name);
      if (server.client.type === "disabled" || productSurface)
        return (
          ne(
            server.client.type === "disabled"
              ? disabledEnableInMcpText(server.name)
              : disabledElsewhereText(server.name),
          ),
          !0
        );
      if (de) return (ne(mcpRefusalText(server.name, de, server.client.config)), !0);
      return (ne(null), !1);
    }, [server.client.type, server.name, server.client.config]),
    ht = ce(async () => {
      if (ke()) return;
      let de =
        (server.config.type === "claudeai-proxy" ? claudeAiConnectorAuthUrl(server.config) : null) ??
        getConnectorsSettingsUrl();
      (ct(de), Et(!0), logEvent("tengu_claudeai_mcp_auth_started", {}), await fi(de));
    }, [server.config, ke]),
    Jt = ce(async () => {
      if (ft === null || ke()) return;
      (ct(ft),
        Et(!0),
        Ot(Date.now()),
        logEvent("tengu_mcp_claudeai_handoff_opened", { site: lit("mcp_menu"), opened_browser: !0 }),
        await fi(ft));
    }, [ft, ke]),
    qt = ce(async () => {
      switch ((Et(!1), ct(null), Yt(!0), await findMatchingConnector(server.client.config, at, V))) {
        case "connected":
          A(
            `${uo(server.name)} is connected on claude.ai. Its tools load as a claude.ai connector the next time you start Claude Code.`,
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
      Yt(!1);
    }, [server.client.config, server.name, at, V, A]),
    xt = ce(() => {
      (qe(!0), logEvent("tengu_claudeai_mcp_clear_auth_started", {}));
    }, []),
    _t = ce(async () => {
      let de = server.client.type !== "disabled";
      try {
        if ((await toggleMcpServer(server.name), server.config.type === "claudeai-proxy"))
          logEvent("tengu_claudeai_mcp_toggle", { new_state: lit(de ? "disabled" : "enabled") });
        onCancel();
      } catch (err_0) {
        A(
          formatMcpOperationFailure(err_0, server.name, de ? "disable" : "enable", {
            config: server.config,
            persistsOffBox: isBridgeOrTransport(exitState),
          }),
        );
      }
    }, [server.client.type, server.config, server.name, toggleMcpServer, onCancel, A, exitState]),
    Mt = ce(async () => {
      if (ke()) return;
      let de = classifyMcpAuthTarget(server.name, { ...server.config, scope: server.scope });
      if (de.kind === "anthropic-hosted") {
        ne(de.message);
        return;
      }
      if (de.kind !== "oauth") return;
      (fe(!0), ne(null));
      let controller = new AbortController();
      copyTimeoutRef.current = controller;
      try {
        let snapshotServerTokens = await mr().snapshotServerTokens(server.name, de.config);
        (await mr().performMCPOAuthFlow(server.name, de.config, rt, controller.signal, {
          onWaitingForCallback: (submit) => {
            xn(() => submit);
          },
        }),
          logEvent("tengu_mcp_auth_config_authenticate", { wasAuthenticated: fn }));
        let mt = await reconnectMcpServer(server.name, { discardDiscovery: !1 });
        if (mt.client.type === "connected") {
          if (snapshotServerTokens)
            await mr().revokeReplacedServerTokens(server.name, de.config, snapshotServerTokens);
          let en =
            fn || isConnectedOrCached(server.client)
              ? `Authentication successful. Reconnected to ${uo(server.name)}.`
              : `Authentication successful. Connected to ${uo(server.name)}.`;
          A(en);
        } else if (mt.client.type === "needs-auth")
          A(
            `Got new credentials, but ${uo(server.name)} rejected them on reconnect. Try re-authenticating, or restart Claude Code if it persists.`,
          );
        else {
          logMCPDebug(server.name, "Reconnection failed after authentication");
          let en = mt.client.type === "failed" ? describeMcpServerError(mt.client) : "";
          if (isBridgeOrTransport(exitState)) {
            if (en)
              logForDebugging(
                `mcp post-auth reconnect failed for ${sanitizeTelemetryString(server.name)}: ${en}`,
                { level: "error" },
              );
            A(
              `Got new credentials, but reconnecting to ${uo(server.name)} failed${en ? " (detail withheld on this connection)" : ""}. Restart Claude Code to retry.`,
            );
          } else {
            let Pt = en ? normalizeMcpServerName(en) : "";
            A(
              Pt
                ? `Got new credentials, but reconnecting to ${uo(server.name)} failed: ${Pt}`
                : `Got new credentials, but reconnecting to ${uo(server.name)} failed. Restart Claude Code to retry.`,
            );
          }
        }
      } catch (err_1) {
        if (err_1 instanceof Error && !(err_1 instanceof mr().AuthenticationCancelledError)) {
          let mt = await adviseMcpRegistration(err_1, server.name, server.client.config, "mcp_menu");
          if (mt?.kind === "connect" || mt?.kind === "connected")
            for (let connectorName of mt.connectorNames)
              await gr().removeMcpAuthCacheEntry(connectorName, V.storageV5);
          (oe(mt),
            ne(
              mt
                ? registrationAdviceText(mt)
                : sanitizeErrorDetail(redactMcpErrorDetail(server.name, server.config, err_1.message)),
            ));
        }
      } finally {
        (fe(!1), (copyTimeoutRef.current = null), xn(null), Ut(""), Mn(null), rt(null));
      }
    }, [
      fn,
      server.config,
      server.client,
      server.name,
      server.scope,
      V,
      A,
      reconnectMcpServer,
      ke,
      exitState,
    ]),
    handleClearAuth = async () => {
      if (server.config.type === "claudeai-proxy" || authAbortControllerRef.current) return;
      ((authAbortControllerRef.current = !0), Se(!0));
      try {
        let de = MCP_SETTINGS_SCOPE_SET.has(server.scope) ? getMcpConfigByName(server.name) : null;
        if (
          !(
            await revokeStoredMcpTokens(server.name, [
              { ...server.config, scope: server.scope },
              server.client.config,
              ...(de ? [de] : []),
            ])
          ).cleared
        ) {
          A(
            `Authentication for ${uo(server.name)} was not cleared: sign-in data is still stored, or the credential store could not be read. Try Clear authentication again.`,
          );
          return;
        }
        logEvent("tengu_mcp_auth_config_clear", {});
        let Ge = `Authentication cleared for ${uo(server.name)}.`,
          Ne = { ...server.config, scope: server.scope },
          mt = identityEpoch();
        if (IM())
          await flushDiscoveryCache(
            gr()
              .dropDiscoveryEntry(server.name, Ne)
              .catch(() => {}),
          );
        if (!(isRemoteMcpTransport(Ne) && identityEpoch() !== mt))
          await gr().clearServerCache(server.name, Ne);
        if (
          (setAppState((prev_0) => {
            let newClients_0 = prev_0.mcp.clients.map((c_0) =>
                c_0.name === server.name && c_0.type !== "disabled" ? { ...c_0, type: "failed" } : c_0,
              ),
              newTools_0 = filterCommandsByServer(prev_0.mcp.tools, server.name),
              newCommands_0 = excludeCommandsByServer(prev_0.mcp.commands, server.name),
              newResources_0 = $jt(prev_0.mcp.resources, server.name);
            return {
              ...prev_0,
              mcp: {
                ...prev_0.mcp,
                clients: newClients_0,
                tools: newTools_0,
                commands: newCommands_0,
                resources: newResources_0,
              },
            };
          }),
          !(isRemoteMcpTransport(Ne) && identityEpoch() !== mt) &&
            server.client.type !== "failed" &&
            server.client.type !== "disabled" &&
            !isMcpServerDisabled(server.name) &&
            mcpDialBlockCause(server.name, server.client.config) === null)
        ) {
          try {
            let Pt = await reconnectMcpServer(server.name, { discardDiscovery: !1, revokeTokens: !0 }),
              { message: message } = handleReconnectResult(
                Pt,
                server.name,
                { persistsOffBox: isBridgeOrTransport(exitState) },
                { hasHeadersHelper: Un },
              );
            A(`${Ge} ${message}`);
          } catch (error) {
            A(
              `${Ge} ${handleReconnectError(error, server.name, { config: server.config, persistsOffBox: isBridgeOrTransport(exitState) })}`,
            );
          }
          return;
        }
        A(Ge);
      } finally {
        ((authAbortControllerRef.current = !1), Se(!1));
      }
    };
  if (pe) {
    let de =
      server.config.type !== "claudeai-proxy" && server.config.oauth?.xaa
        ? " Authenticating via your identity provider"
        : " A browser window will open for authentication";
    return r(Box, {
      flexDirection: "column",
      gap: 1,
      padding: 1,
      tabIndex: 0,
      autoFocus: !0,
      onKeyDown: wt,
      children: [
        r(Text, { color: "claude", children: ["Authenticating with ", server.name, "\u2026"] }),
        r(Box, { children: [e(Spinner, {}), e(Text, { children: de })] }),
        Oe &&
          r(Box, {
            flexDirection: "column",
            children: [
              r(Box, {
                children: [
                  r(Text, {
                    dimColor: !0,
                    children: ["If your browser doesn't open automatically, copy this URL manually", " "],
                  }),
                  e(CopiedUrlHint, { via: copiedVia }),
                ],
              }),
              e(CopyUrlFallbackHint, { via: copiedVia }),
              e(Link, { url: Oe, assumeSupport: !0 }),
            ],
          }),
        pe &&
          Oe &&
          mn &&
          r(Box, {
            flexDirection: "column",
            marginTop: 1,
            children: [
              e(Text, {
                dimColor: !0,
                children:
                  "If the redirect page shows a connection error, paste the URL from your browser's address bar:",
              }),
              r(Box, {
                children: [
                  r(Text, { dimColor: !0, children: ["URL ", ">", " "] }),
                  e(TextInput, {
                    value: yt,
                    onChange: Ut,
                    onSubmit: (value) => {
                      let trimmed = value.trim();
                      (Mn(
                        !trimmed || mn(trimmed)
                          ? null
                          : "That isn't this sign-in's redirect URL \u2014 paste the address from the browser page this sign-in opened.",
                      ),
                        Ut(""));
                    },
                    cursorOffset: on,
                    onChangeCursorOffset: rn,
                    columns: terminalColumns - 8,
                  }),
                ],
              }),
              e(ErrorText, { error: Ln }),
            ],
          }),
        e(Box, {
          marginLeft: 3,
          children: e(Text, {
            dimColor: !0,
            children: Dt.pending
              ? `Press ${Dt.keyName} again to go back`
              : r(Fragment, {
                  children: [
                    "Return here after authenticating in your browser. Press",
                    " ",
                    e(KeyboardShortcutHint, { chord: "escape", action: "go back" }),
                    ".",
                  ],
                }),
          }),
        }),
      ],
    });
  }
  if (Ke)
    return r(Box, {
      flexDirection: "column",
      gap: 1,
      padding: 1,
      tabIndex: 0,
      autoFocus: !0,
      onKeyDown: wt,
      children: [
        r(Text, { color: "claude", children: ["Authenticating with ", server.name, "\u2026"] }),
        r(Box, {
          children: [e(Spinner, {}), e(Text, { children: " A browser window will open for authentication" })],
        }),
        He &&
          r(Box, {
            flexDirection: "column",
            children: [
              r(Box, {
                children: [
                  r(Text, {
                    dimColor: !0,
                    children: ["If your browser doesn't open automatically, copy this URL manually", " "],
                  }),
                  e(CopiedUrlHint, { via: copiedVia }),
                ],
              }),
              e(CopyUrlFallbackHint, { via: copiedVia }),
              e(Link, { url: He, assumeSupport: !0 }),
            ],
          }),
        r(Box, {
          marginLeft: 3,
          flexDirection: "column",
          children: [
            r(Text, {
              color: "permission",
              children: [
                "Press ",
                e(Text, { bold: !0, children: "Enter" }),
                " after authenticating in your browser.",
              ],
            }),
            e(BackHint, { exitState: Dt }),
          ],
        }),
      ],
    });
  if (_e)
    return r(Box, {
      flexDirection: "column",
      gap: 1,
      padding: 1,
      tabIndex: 0,
      autoFocus: !0,
      onKeyDown: wt,
      children: [
        r(Text, { color: "claude", children: ["Clear authentication for ", server.name] }),
        vt
          ? r(Fragment, {
              children: [
                e(Text, { children: 'Find the MCP server in the browser and click "Disconnect".' }),
                r(Box, {
                  flexDirection: "column",
                  children: [
                    r(Box, {
                      children: [
                        r(Text, {
                          dimColor: !0,
                          children: [
                            "If your browser didn't open automatically, copy this URL manually",
                            " ",
                          ],
                        }),
                        e(CopiedUrlHint, { via: copiedVia }),
                      ],
                    }),
                    e(CopyUrlFallbackHint, { via: copiedVia }),
                    e(Link, { url: getConnectorsSettingsUrl() }),
                  ],
                }),
                r(Box, {
                  marginLeft: 3,
                  flexDirection: "column",
                  children: [
                    r(Text, {
                      color: "permission",
                      children: ["Press ", e(Text, { bold: !0, children: "Enter" }), " when done."],
                    }),
                    e(BackHint, { exitState: Dt }),
                  ],
                }),
              ],
            })
          : r(Fragment, {
              children: [
                e(Text, {
                  children:
                    'This will open claude.ai in the browser. Find the MCP server in the list and click "Disconnect".',
                }),
                r(Box, {
                  marginLeft: 3,
                  flexDirection: "column",
                  children: [
                    r(Text, {
                      color: "permission",
                      children: [
                        "Press",
                        " ",
                        e(KeyboardShortcutHint, { chord: "enter", action: "open the browser", bold: !0 }),
                        ".",
                      ],
                    }),
                    e(BackHint, { exitState: Dt }),
                  ],
                }),
              ],
            }),
      ],
    });
  if (an)
    return r(Box, {
      padding: 1,
      children: [e(Spinner, {}), e(Text, { children: " Checking with claude.ai\u2026" })],
    });
  if (ae)
    return r(Box, {
      padding: 1,
      children: [
        e(Spinner, {}),
        r(Text, { children: [" Clearing authentication for ", server.name, "\u2026"] }),
      ],
    });
  if (et)
    return r(Box, {
      flexDirection: "column",
      gap: 1,
      padding: 1,
      children: [
        r(Text, {
          color: "text",
          children: ["Connecting to ", e(Text, { bold: !0, children: server.name }), "\u2026"],
        }),
        r(Box, {
          children: [e(Spinner, {}), e(Text, { children: " Establishing connection to MCP server" })],
        }),
        e(Text, { dimColor: !0, children: "This may take a few moments." }),
      ],
    });
  let menuOptions = [];
  if (server.client.type === "disabled") menuOptions.push({ label: "Enable", value: "toggle-enabled" });
  if (isConnectedOrCached(server.client) && serverToolsCount > 0)
    menuOptions.push({ label: "View tools", value: "tools" });
  let Fn =
      (server.config.type === "sse" || server.config.type === "http") &&
      configHasAuthorizationHeader(server.config),
    sn =
      (server.config.type === "sse" || server.config.type === "http") &&
      hasExternalAuthForConfig(
        server.config,
        hasClaudeAiToken || (designCredential !== null && Qr(designCredential)),
      ),
    Rn = server.client.type === "failed" && server.client.errorCode === "HEADERS_HELPER_AUTH_REJECTED",
    Un = server.config.type !== "claudeai-proxy" && !!server.config.headersHelper,
    An = isConnectedOrCached(server.client) && serverToolsCount > 0,
    Bn =
      fn ||
      (An &&
        server.config.type !== "claudeai-proxy" &&
        (usesNonOAuthAuth(server.config) ||
          sn ||
          (isCcrInjectedMcpUrl(server.name, { ...server.config, scope: server.scope }) &&
            getSessionIngressAuthToken() !== null))),
    Tn =
      server.client.type === "disabled" ||
      isMcpServerDisabled(server.name) ||
      isMcpDialBlockedByPolicy(server.name, server.client.config);
  if (server.config.type === "claudeai-proxy") {
    if (server.client.type === "connected")
      menuOptions.push({ label: "Clear authentication", value: "claudeai-clear-auth" });
    else if (!Tn) menuOptions.push({ label: "Authenticate", value: "claudeai-auth" });
  } else {
    let de = !Tn && !sn && !Rn && URL.canParse(server.config.url);
    if (ft !== null && !Tn) menuOptions.push({ label: "Connect on claude.ai", value: "claudeai-handoff" });
    if (fn) {
      if (de) menuOptions.push({ label: "Re-authenticate", value: "reauth" });
      menuOptions.push({ label: "Clear authentication", value: "clear-auth" });
    } else if (de) menuOptions.push({ label: "Authenticate", value: "auth" });
  }
  if (server.client.type !== "disabled") {
    if (server.client.type !== "needs-auth" || Un || Fn)
      menuOptions.push({ label: "Reconnect", value: "reconnectMcpServer" });
    menuOptions.push({ label: "Disable", value: "toggle-enabled" });
  }
  if (menuOptions.length === 0) menuOptions.push({ label: "Back", value: "back" });
  let ze = ["reauth", "clear-auth", "claudeai-clear-auth"],
    At = menuOptions.some((value_0) => value_0.value === "claudeai-handoff")
      ? "claudeai-handoff"
      : menuOptions[0] && ze.includes(menuOptions[0].value)
        ? menuOptions.find((de) => !ze.includes(de.value))?.value
        : void 0;
  return e(Box, {
    flexDirection: "column",
    paddingX: borderless ? 1 : 0,
    children: r(Dialog, {
      title: `${capitalizedServerName} MCP Server`,
      onCancel: onCancel,
      hideBorder: borderless,
      inputGuide: r(Byline, {
        children: [
          !_ && e(KeyboardShortcutHint, { chord: ["up", "down"], action: "navigate" }),
          !_ && e(KeyboardShortcutHint, { chord: "enter", action: "select" }),
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
                    renderServerStatusLine(server.client, serverToolsCount, B),
                  ],
                }),
                (server.client.type === "failed" || server.client.type === "needs-auth") &&
                  server.client.error &&
                  r(FlexDirectionRow.Row, {
                    children: [
                      e(Fragment, { children: "Issue:" }),
                      e(Text, {
                        dimColor: !0,
                        children: sanitizeErrorDetail(
                          server.client.type === "failed" && server.client.displayDetail
                            ? `${server.client.error} ${server.client.displayDetail}`
                            : server.client.error,
                        ),
                      }),
                    ],
                  }),
                server.transport !== "claudeai-proxy" &&
                  r(FlexDirectionRow.Row, {
                    children: [
                      e(Fragment, { children: "Auth:" }),
                      Bn
                        ? r(Text, {
                            children: [e(StatusIcon, { status: "success", withSpace: !0 }), "authenticated"],
                          })
                        : An
                          ? e(Text, { dimColor: !0, children: "not signed in" })
                          : r(Text, {
                              children: [
                                e(StatusIcon, { status: "error", withSpace: !0 }),
                                "not authenticated",
                              ],
                            }),
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
                server.transport === "claudeai-proxy" &&
                  server.scope === "claudeai" &&
                  server.config.enterpriseManaged &&
                  r(FlexDirectionRow.Row, {
                    children: [
                      e(Fragment, { children: "Managed:" }),
                      e(Text, { dimColor: !0, children: "by your organization" }),
                    ],
                  }),
                r(FlexDirectionRow.Row, {
                  children: [
                    e(Fragment, { children: "URL:" }),
                    e(Text, {
                      dimColor: !0,
                      children: redactManagedMcpServerConfig({ url: server.displayEndpoint }, server.scope)
                        .url,
                    }),
                  ],
                }),
                r(FlexDirectionRow.Row, {
                  children: [
                    e(Fragment, { children: "Config location:" }),
                    e(Text, { dimColor: !0, children: describeMcpConfigFilePath(server.scope) }),
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
              server.client.discoveryBearerRejected &&
              r(Box, {
                flexDirection: "column",
                children: [
                  e(Text, { bold: !0, children: "Issue: " }),
                  e(Text, {
                    dimColor: !0,
                    children: "claude.ai rejected the session token. Run /login, then reconnect.",
                  }),
                ],
              }),
            server.client.type === "connected" &&
              !server.client.discoveryBearerRejected &&
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
        me && e(Box, { children: e(ErrorText, { error: me }) }),
        menuOptions.length > 0 &&
          e(Box, {
            children: e(ModelSelector, {
              options: menuOptions,
              defaultFocusValue: At,
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
                    await Mt();
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
                    xt();
                    break;
                  case "reconnectMcpServer":
                    je(!0);
                    try {
                      let result_1 = await reconnectMcpServer(server.name);
                      if (server.config.type === "claudeai-proxy")
                        logEvent("tengu_claudeai_mcp_reconnect", {
                          success: result_1.client.type === "connected",
                        });
                      let { message: message } = handleReconnectResult(
                        result_1,
                        server.name,
                        { persistsOffBox: isBridgeOrTransport(exitState) },
                        { hasHeadersHelper: Un },
                      );
                      A(message);
                    } catch (err_2) {
                      if (server.config.type === "claudeai-proxy")
                        logEvent("tengu_claudeai_mcp_reconnect", { success: !1 });
                      A(
                        handleReconnectError(err_2, server.name, {
                          config: server.config,
                          persistsOffBox: isBridgeOrTransport(exitState),
                        }),
                      );
                    } finally {
                      je(!1);
                    }
                    break;
                  case "toggle-enabled":
                    await _t();
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
    }),
  });
}

export { CANNOT_AUTH_WITHOUT_TERMINAL, ag, lg, MCPRemoteServerMenu };
