/**
 * tools/McpAuthTool/McpAuthTool.ts
 *
 * 为需要 OAuth 的 MCP 服务器生成 mcp__<服务器>__authenticate 占位工具，启动授权并在完成后重连
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/McpAuthTool/McpAuthTool.ts
 * pieces: chunk-rbwn7je9.js (3)
 * attribution: fingerprint 1, placement 2
 */
import {
  normalizeServerNameLong,
  normalizeServerNameShort,
  AUTHENTICATE,
  normalizeMcpServerName,
  sanitizeErrorDetail,
  COMPLETE_AUTHENTICATION,
} from "../../services/api/deferredToolsState.js";
import {
  toolsAvailableAutomaticallyText,
  emptyAuthInputSchema,
  redirectUrisByHost,
  mcpAuthModule,
  REDIRECT_URI_TTL_MS,
  deleteNeedsAuthCache,
  mcpClientModule,
  redirectUriOf,
  isRemoteEnvironment,
  toolsAvailableNowText,
  completeAuthInputSchema,
} from "../../services/mcp/needsAuthCache.js";
import { buildMcpToolName } from "../../services/mcp/mcpStringUtils.js";
import { mcpServerSource } from "../../services/mcp/fileReference/fileReferencePolicy.js";
import { connectorServerId } from "../../services/mcp/claudeai.js";
import { dynamicServerConnectorId } from "../../services/mcp/mcpToolDecoration.js";
import {
  mcpDialBlockCause,
  isMcpServerDisabled,
  isMcpDialBlockedByPolicy,
} from "../../services/mcp/config.js";
import {
  mcpRefusalText,
  blockedByPolicyText,
  projectScopeNotApprovedText,
} from "../../services/mcp/mcpToggleMessages.js";
import { classifyMcpAuthTarget, describeConnectError } from "../../services/mcp/auth.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isMcpIdentityIncomplete, identityEpoch } from "../../services/mcp/identityChange.js";
import { logMCPDebug, logMCPError } from "../../utils/log.js";
import { redactMcpErrorDetail } from "../../services/mcp/mcpServerOrigin.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-rbwn7je9.js:9435-13531 fingerprint (2.1.88 match: createMcpAuthTool, 0.485)
/**
 * 为需要 OAuth 但未认证的 MCP 服务器生成占位工具 mcp__<服务器>__authenticate：调用时检查托管策略/禁用/项目审批/claude.ai 连接器/不支持的传输，启动（或复用 10 分钟内的）OAuth 流程并返回授权 URL；授权完成后在身份未变、服务器仍启用时重连并让连接接管真实工具。权限直接 allow。
 */
function createMcpAuthTool(serverName, config, locationHint) {
  let transport = config.type ?? "stdio";
  let location =
    locationHint && locationHint !== transport
      ? `${transport} at ${normalizeServerNameLong(locationHint, 256)}`
      : transport;
  let description =
    `The "${normalizeServerNameShort(serverName)}" MCP server (${location}) is installed but requires authentication. ` +
    "Call this tool to start the OAuth flow \u2014 you'll receive an authorization URL to share with the user. " +
    `Once the user completes authorization in their browser, the server's real tools will become ${toolsAvailableAutomaticallyText()}.`;
  return {
    name: buildMcpToolName(serverName, AUTHENTICATE),
    isMcp: true,
    mcpInfo: {
      serverName,
      toolName: AUTHENTICATE,
      serverType: transport,
      source: mcpServerSource(serverName, config),
      ...(config.pluginSource !== undefined && {
        pluginSource: config.pluginSource,
      }),
      isAuthStub: true,
      serverId: connectorServerId(config),
      serverIdStamp: dynamicServerConnectorId(serverName, config),
    },
    isEnabled: () => true,
    isConcurrencySafe: () => false,
    isReadOnly: () => false,
    toAutoClassifierInput: () => serverName,
    userFacingName: () => `${serverName} - authenticate (MCP)`,
    maxResultSizeChars: 1e4,
    renderToolUseMessage: () => `Authenticate ${serverName} MCP server`,
    async description() {
      return description;
    },
    async prompt() {
      return description;
    },
    get inputSchema() {
      return emptyAuthInputSchema();
    },
    async checkPermissions(input) {
      return {
        behavior: "allow",
        updatedInput: input,
      };
    },
    async call(input, callOptions) {
      let blockCause = mcpDialBlockCause(serverName, config);
      if (blockCause === "managed-policy")
        return {
          data: {
            status: "error",
            message: mcpRefusalText(
              serverName,
              blockCause,
              config,
              `${blockedByPolicyText(serverName)}. Only an organization admin can change this; do not retry or ask the user to enable it.`,
            ),
          },
        };
      if (isMcpServerDisabled(serverName))
        return {
          data: {
            status: "error",
            message: `MCP server ${normalizeServerNameShort(serverName)} is disabled. Ask the user to enable it in /mcp before authenticating.`,
          },
        };
      if (blockCause === "project-approval")
        return {
          data: {
            status: "error",
            message: `${projectScopeNotApprovedText(serverName)}. Ask the user to approve it; do not retry until they have.`,
          },
        };
      let target = classifyMcpAuthTarget(serverName, config);
      if (target.kind === "claudeai-proxy")
        return {
          data: {
            status: "unsupported",
            message: `This is a claude.ai MCP connector. Ask the user to run /mcp and select "${normalizeServerNameShort(serverName)}" to authenticate.`,
          },
        };
      if (target.kind === "unsupported-transport")
        return {
          data: {
            status: "unsupported",
            message: `Server "${normalizeServerNameShort(serverName)}" uses ${transport} transport which does not support OAuth from this tool. Ask the user to run /mcp and authenticate manually.`,
          },
        };
      if (target.kind === "anthropic-hosted")
        return {
          data: {
            status: "unsupported",
            message: normalizeMcpServerName(target.message, 1024, "none"),
          },
        };
      let redirectUris = redirectUrisByHost.of(callOptions.session.host);
      let reusableEntry = redirectUris.get(serverName);
      if (
        reusableEntry !== undefined &&
        reusableEntry.flow === mcpAuthModule().getActiveOAuthPromise(serverName) &&
        reusableEntry.receivesPastedCallbacks() &&
        import_sortedIndex_2(reusableEntry.config, target.config) &&
        reusableEntry.accountToken !== undefined &&
        reusableEntry.accountToken === isMcpIdentityIncomplete() &&
        reusableEntry.identityEpoch === identityEpoch() &&
        Date.now() - reusableEntry.startedAt < REDIRECT_URI_TTL_MS
      )
        return formatAuthUrlResult({
          serverName,
          config,
          authUrlPromise: reusableEntry.authUrl,
          oauthPromise: reusableEntry.flow,
          reused: true,
          tools: callOptions.options.tools,
        });
      let resolveAuthUrl;
      let authUrlPromise = new Promise((resolve) => {
        resolveAuthUrl = resolve;
      });
      let callbackSubmitter;
      let oauthFlow = mcpAuthModule().performMCPOAuthFlow(
        serverName,
        target.config,
        (authUrl) => resolveAuthUrl?.(authUrl),
        undefined,
        {
          skipBrowserOpen: true,
          onWaitingForCallback: (prev) => {
            callbackSubmitter = prev;
          },
        },
      );
      mcpAuthModule().setActiveOAuthPromise(serverName, oauthFlow);
      let flowEntry = {
        flow: oauthFlow,
        authUrl: authUrlPromise,
        receivesPastedCallbacks: () =>
          callbackSubmitter !== undefined &&
          mcpAuthModule().getOAuthCallbackSubmitter(serverName) === callbackSubmitter,
        config: target.config,
        accountToken: isMcpIdentityIncomplete(),
        identityEpoch: identityEpoch(),
        startedAt: Date.now(),
      };
      redirectUris.set(serverName, flowEntry);
      oauthFlow
        .catch(() => {})
        .finally(() => {
          if (redirectUris.get(serverName) === flowEntry) redirectUris.delete(serverName);
        });
      let identityEpoch_2 = flowEntry.identityEpoch;
      oauthFlow
        .then(async () => {
          if (identityEpoch() !== identityEpoch_2) {
            logMCPDebug(
              serverName,
              "OAuth completed after an identity change; discarding without reconnecting",
            );
            return;
          }
          deleteNeedsAuthCache(callOptions.storageV5);
          if (isMcpServerDisabled(serverName) || isMcpDialBlockedByPolicy(serverName, config)) {
            logMCPDebug(
              serverName,
              "OAuth completed but the server is now disabled or policy-blocked; not reconnecting",
            );
            return;
          }
          let reconnected = await mcpClientModule().reconnectMcpServerImpl(
            serverName,
            config,
            callOptions.storageV5,
            callOptions.credentials,
          );
          if (identityEpoch() !== identityEpoch_2) {
            logMCPDebug(
              serverName,
              "OAuth completed after an identity change; discarding the stale reconnect",
            );
            return;
          }
          let any = callOptions.getMcp().clients.some((client) => client.name === serverName);
          let sessionWiring = callOptions.session.mcpSessionWiring.connections();
          if (
            !any ||
            sessionWiring === undefined ||
            isMcpServerDisabled(serverName) ||
            isMcpDialBlockedByPolicy(serverName, config)
          ) {
            logMCPDebug(
              serverName,
              "OAuth completed after the server was removed, disabled, or policy-blocked; discarding the fresh connection",
            );
            mcpClientModule()
              .clearServerCache(serverName, config)
              .catch((error) =>
                logMCPDebug(
                  serverName,
                  `Orphan-connection cleanup failed: ${describeConnectError(error, config)}`,
                ),
              );
            sessionWiring?.markReconnectDiscarded(serverName, config);
            return;
          }
          let adoptResult = sessionWiring.adoptServer(serverName, reconnected);
          if (adoptResult !== "adopted") {
            logMCPDebug(
              serverName,
              `Sign-in finished, but its connection was not adopted (${adoptResult}); discarding it`,
            );
            mcpClientModule()
              .clearServerCache(serverName, config)
              .catch((error) =>
                logMCPDebug(
                  serverName,
                  `Orphan-connection cleanup failed: ${describeConnectError(error, config)}`,
                ),
              );
            return;
          }
          logMCPDebug(serverName, `OAuth complete, reconnected with ${reconnected.tools.length} tool(s)`);
        })
        .catch((err) => {
          logMCPError(
            serverName,
            `OAuth flow failed after tool-triggered start: ${sanitizeErrorDetail(redactMcpErrorDetail(serverName, config, errorMessage(err)))}`,
          );
        });
      return formatAuthUrlResult({
        serverName,
        config,
        authUrlPromise,
        oauthPromise: oauthFlow,
        reused: false,
        tools: callOptions.options.tools,
      });
    },
    mapToolResultToToolResultBlockParam(data, toolUseID) {
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content: data.message,
      };
    },
  };
}
//@ chunk-rbwn7je9.js:13531-14913 placement
/**
 * 生成 MCP OAuth 授权链接结果（已有进行中的登录、远程会话回调说明）。
 */
async function formatAuthUrlResult({ serverName, config, authUrlPromise, oauthPromise, reused, tools }) {
  let introText = reused
    ? `A sign-in for ${normalizeServerNameShort(serverName)} that started earlier is still in progress, so the link below is that sign-in's link, not a new one. If the user says the sign-in page showed an error before they could approve access, ask them to run /mcp and sign in there instead.

`
    : "";
  try {
    let winner = await Promise.race([authUrlPromise, oauthPromise.then(() => null)]);
    if (winner) {
      let mcpToolName = buildMcpToolName(serverName, COMPLETE_AUTHENTICATION);
      let redirectUri = redirectUriOf(winner);
      let remoteNote = isRemoteEnvironment()
        ? `

This session is remote, so after authorizing the browser will try to load \`${redirectUri}?code=...\` and show a connection error \u2014 that's expected. Ask the user to copy the full URL from the browser's address bar and paste it into chat, then call \`${mcpToolName}\` with that URL as \`callback_url\`.`
        : `

If the browser shows a connection error on the redirect page, ask the user to paste the full URL from the address bar and call \`${mcpToolName}\` with it.`;
      return {
        data: {
          status: "auth_url",
          authUrl: winner,
          message: `${introText}Ask the user to open this URL in their browser to authorize the ${normalizeServerNameShort(serverName)} MCP server:

${winner}

Once they complete the flow, the server's tools will become ${toolsAvailableAutomaticallyText(tools)}.${remoteNote}`,
        },
      };
    }
    return {
      data: {
        status: "auth_url",
        message: `Authentication completed silently for ${normalizeServerNameShort(serverName)}. ${toolsAvailableNowText(tools)}`,
      },
    };
  } catch (error) {
    let sanitizedError = normalizeMcpServerName(
      redactMcpErrorDetail(serverName, config, errorMessage(error)),
    );
    return {
      data: {
        status: "error",
        message: `Failed to start OAuth flow for ${normalizeServerNameShort(serverName)}: ${sanitizedError}. Ask the user to run /mcp and authenticate manually.`,
      },
    };
  }
}
//@ chunk-rbwn7je9.js:14913-17416 placement
/**
 * 提交回调 URL 完成进行中的 MCP OAuth 流程的工具定义。
 */
function COMPLETE_AUTH_TOOL(serverName, config) {
  let mcpToolName = buildMcpToolName(serverName, AUTHENTICATE);
  let description =
    `Complete an in-progress OAuth flow for the "${normalizeServerNameShort(serverName)}" MCP server by submitting the callback URL. Call \`${mcpToolName}\` first to start the flow and get the authorization URL. ` +
    "After the user authorizes in their browser, the browser is redirected to a `http://localhost:<port>/callback?code=...&state=...` URL \u2014 " +
    "on remote sessions that page fails to load, but the URL in the address bar is still valid. Pass that full URL here as `callback_url`.";
  return {
    name: buildMcpToolName(serverName, COMPLETE_AUTHENTICATION),
    isMcp: true,
    mcpInfo: {
      serverName,
      toolName: COMPLETE_AUTHENTICATION,
      serverType: config.type ?? "stdio",
      source: mcpServerSource(serverName, config),
      ...(config.pluginSource !== undefined && {
        pluginSource: config.pluginSource,
      }),
      isAuthStub: true,
      serverId: connectorServerId(config),
      serverIdStamp: dynamicServerConnectorId(serverName, config),
    },
    isEnabled: () => true,
    isConcurrencySafe: () => false,
    isReadOnly: () => false,
    toAutoClassifierInput: () => serverName,
    userFacingName: () => `${serverName} - complete authentication (MCP)`,
    maxResultSizeChars: 1e4,
    renderToolUseMessage: () => `Complete authentication for ${serverName} MCP server`,
    async description() {
      return description;
    },
    async prompt() {
      return description;
    },
    get inputSchema() {
      return completeAuthInputSchema();
    },
    async checkPermissions(updatedInput) {
      return {
        behavior: "allow",
        updatedInput,
      };
    },
    async call(input, callOptions) {
      let { callback_url: callbackUrl } = input;
      let oAuthCallbackSubmitter = mcpAuthModule().getOAuthCallbackSubmitter(serverName);
      if (!oAuthCallbackSubmitter)
        return {
          data: {
            status: "error",
            message: `No OAuth flow is in progress for ${normalizeServerNameShort(serverName)}. Call \`${mcpToolName}\` first, then retry with the callback URL.`,
          },
        };
      let hasCodeOrError = false;
      try {
        let parsedUrl = new URL(callbackUrl);
        hasCodeOrError = parsedUrl.searchParams.has("code") || parsedUrl.searchParams.has("error");
      } catch {}
      if (!hasCodeOrError)
        return {
          data: {
            status: "error",
            message:
              "Invalid callback URL: missing authorization code. Ask the user to paste the full redirect URL from their browser's address bar, including the `?code=...&state=...` query string.",
          },
        };
      let activeOAuthPromise = mcpAuthModule().getActiveOAuthPromise(serverName);
      if (!oAuthCallbackSubmitter(callbackUrl))
        return {
          data: {
            status: "error",
            message: `That callback URL belongs to a different sign-in attempt for ${normalizeServerNameShort(serverName)} (its state does not match the flow in progress), or carries no authorization code. The current flow is still waiting: ask the user for the URL from the page this sign-in opened, then retry.`,
          },
        };
      try {
        await activeOAuthPromise;
        return {
          data: {
            status: "success",
            message: `Authentication complete for ${normalizeServerNameShort(serverName)}. ${toolsAvailableNowText(callOptions.options.tools)}`,
          },
        };
      } catch (error) {
        if (error instanceof mcpAuthModule().AuthenticationCancelledError)
          return {
            data: {
              status: "error",
              message: `The OAuth flow for ${normalizeServerNameShort(serverName)} was cancelled (a newer attempt may have superseded it). Call \`${mcpToolName}\` again to restart.`,
            },
          };
        return {
          data: {
            status: "error",
            message: `Authentication failed for ${normalizeServerNameShort(serverName)}: ${normalizeMcpServerName(redactMcpErrorDetail(serverName, config, errorMessage(error)))}`,
          },
        };
      }
    },
    mapToolResultToToolResultBlockParam(activeOAuthPromise, toolUseId) {
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: activeOAuthPromise.message,
      };
    },
  };
}
export { createMcpAuthTool, COMPLETE_AUTH_TOOL };
