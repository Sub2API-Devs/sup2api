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
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isMcpIdentityIncomplete, identityEpoch } from "../../services/mcp/identityChange.js";
import { logMCPDebug, logMCPError } from "../../utils/log.js";
import { redactMcpErrorDetail } from "../../services/mcp/mcpServerOrigin.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-rbwn7je9.js:9435-13531 fingerprint = createMcpAuthTool (0.485)
/**
 * 为需要 OAuth 但未认证的 MCP 服务器生成占位工具 mcp__<服务器>__authenticate：调用时检查托管策略/禁用/项目审批/claude.ai 连接器/不支持的传输，启动（或复用 10 分钟内的）OAuth 流程并返回授权 URL；授权完成后在身份未变、服务器仍启用时重连并让连接接管真实工具。权限直接 allow。
 */
function createMcpAuthTool(e, r, n) {
  let transport = r.type ?? "stdio";
  let location = n && n !== transport ? `${transport} at ${normalizeServerNameLong(n, 256)}` : transport;
  let description =
    `The "${normalizeServerNameShort(e)}" MCP server (${location}) is installed but requires authentication. ` +
    "Call this tool to start the OAuth flow \u2014 you'll receive an authorization URL to share with the user. " +
    `Once the user completes authorization in their browser, the server's real tools will become ${toolsAvailableAutomaticallyText()}.`;
  return {
    name: buildMcpToolName(e, AUTHENTICATE),
    isMcp: true,
    mcpInfo: {
      serverName: e,
      toolName: AUTHENTICATE,
      serverType: transport,
      source: mcpServerSource(e, r),
      ...(r.pluginSource !== undefined && {
        pluginSource: r.pluginSource,
      }),
      isAuthStub: true,
      serverId: connectorServerId(r),
      serverIdStamp: dynamicServerConnectorId(e, r),
    },
    isEnabled: () => true,
    isConcurrencySafe: () => false,
    isReadOnly: () => false,
    toAutoClassifierInput: () => e,
    userFacingName: () => `${e} - authenticate (MCP)`,
    maxResultSizeChars: 1e4,
    renderToolUseMessage: () => `Authenticate ${e} MCP server`,
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
    async call(s, l) {
      let m = mcpDialBlockCause(e, r);
      if (m === "managed-policy")
        return {
          data: {
            status: "error",
            message: mcpRefusalText(
              e,
              m,
              r,
              `${blockedByPolicyText(e)}. Only an organization admin can change this; do not retry or ask the user to enable it.`,
            ),
          },
        };
      if (isMcpServerDisabled(e))
        return {
          data: {
            status: "error",
            message: `MCP server ${normalizeServerNameShort(e)} is disabled. Ask the user to enable it in /mcp before authenticating.`,
          },
        };
      if (m === "project-approval")
        return {
          data: {
            status: "error",
            message: `${projectScopeNotApprovedText(e)}. Ask the user to approve it; do not retry until they have.`,
          },
        };
      let f = classifyMcpAuthTarget(e, r);
      if (f.kind === "claudeai-proxy")
        return {
          data: {
            status: "unsupported",
            message: `This is a claude.ai MCP connector. Ask the user to run /mcp and select "${normalizeServerNameShort(e)}" to authenticate.`,
          },
        };
      if (f.kind === "unsupported-transport")
        return {
          data: {
            status: "unsupported",
            message: `Server "${normalizeServerNameShort(e)}" uses ${transport} transport which does not support OAuth from this tool. Ask the user to run /mcp and authenticate manually.`,
          },
        };
      if (f.kind === "anthropic-hosted")
        return {
          data: {
            status: "unsupported",
            message: normalizeMcpServerName(f.message, 1024, "none"),
          },
        };
      let g = redirectUrisByHost.of(l.session.host);
      let y = g.get(e);
      if (
        y !== undefined &&
        y.flow === mcpAuthModule().getActiveOAuthPromise(e) &&
        y.receivesPastedCallbacks() &&
        En(y.config, f.config) &&
        y.accountToken !== undefined &&
        y.accountToken === isMcpIdentityIncomplete() &&
        y.identityEpoch === identityEpoch() &&
        Date.now() - y.startedAt < REDIRECT_URI_TTL_MS
      )
        return formatAuthUrlResult({
          serverName: e,
          config: r,
          authUrlPromise: y.authUrl,
          oauthPromise: y.flow,
          reused: true,
          tools: l.options.tools,
        });
      let M;
      let authUrlPromise = new Promise((resolve) => {
        M = resolve;
      });
      let P;
      let A = mcpAuthModule().performMCPOAuthFlow(e, f.config, (S) => M?.(S), undefined, {
        skipBrowserOpen: true,
        onWaitingForCallback: (prev) => {
          P = prev;
        },
      });
      mcpAuthModule().setActiveOAuthPromise(e, A);
      let I = {
        flow: A,
        authUrl: authUrlPromise,
        receivesPastedCallbacks: () => P !== undefined && mcpAuthModule().getOAuthCallbackSubmitter(e) === P,
        config: f.config,
        accountToken: isMcpIdentityIncomplete(),
        identityEpoch: identityEpoch(),
        startedAt: Date.now(),
      };
      g.set(e, I);
      A.catch(() => {}).finally(() => {
        if (g.get(e) === I) g.delete(e);
      });
      let identityEpoch_2 = I.identityEpoch;
      A.then(async () => {
        if (identityEpoch() !== identityEpoch_2) {
          logMCPDebug(e, "OAuth completed after an identity change; discarding without reconnecting");
          return;
        }
        deleteNeedsAuthCache(l.storageV5);
        if (isMcpServerDisabled(e) || isMcpDialBlockedByPolicy(e, r)) {
          logMCPDebug(
            e,
            "OAuth completed but the server is now disabled or policy-blocked; not reconnecting",
          );
          return;
        }
        let S = await mcpClientModule().reconnectMcpServerImpl(e, r, l.storageV5, l.credentials);
        if (identityEpoch() !== identityEpoch_2) {
          logMCPDebug(e, "OAuth completed after an identity change; discarding the stale reconnect");
          return;
        }
        let any = l.getMcp().clients.some((client) => client.name === e);
        let _ = l.session.mcpSessionWiring.connections();
        if (!any || _ === undefined || isMcpServerDisabled(e) || isMcpDialBlockedByPolicy(e, r)) {
          logMCPDebug(
            e,
            "OAuth completed after the server was removed, disabled, or policy-blocked; discarding the fresh connection",
          );
          mcpClientModule()
            .clearServerCache(e, r)
            .catch((error) =>
              logMCPDebug(e, `Orphan-connection cleanup failed: ${describeConnectError(error, r)}`),
            );
          _?.markReconnectDiscarded(e, r);
          return;
        }
        let L = _.adoptServer(e, S);
        if (L !== "adopted") {
          logMCPDebug(e, `Sign-in finished, but its connection was not adopted (${L}); discarding it`);
          mcpClientModule()
            .clearServerCache(e, r)
            .catch((error) =>
              logMCPDebug(e, `Orphan-connection cleanup failed: ${describeConnectError(error, r)}`),
            );
          return;
        }
        logMCPDebug(e, `OAuth complete, reconnected with ${S.tools.length} tool(s)`);
      }).catch((err) => {
        logMCPError(
          e,
          `OAuth flow failed after tool-triggered start: ${sanitizeErrorDetail(redactMcpErrorDetail(e, r, errorMessage(err)))}`,
        );
      });
      return formatAuthUrlResult({
        serverName: e,
        config: r,
        authUrlPromise,
        oauthPromise: A,
        reused: false,
        tools: l.options.tools,
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
  let s = reused
    ? `A sign-in for ${normalizeServerNameShort(serverName)} that started earlier is still in progress, so the link below is that sign-in's link, not a new one. If the user says the sign-in page showed an error before they could approve access, ask them to run /mcp and sign in there instead.

`
    : "";
  try {
    let winner = await Promise.race([authUrlPromise, oauthPromise.then(() => null)]);
    if (winner) {
      let mcpToolName = buildMcpToolName(serverName, COMPLETE_AUTHENTICATION);
      let f = redirectUriOf(winner);
      let g = isRemoteEnvironment()
        ? `

This session is remote, so after authorizing the browser will try to load \`${f}?code=...\` and show a connection error \u2014 that's expected. Ask the user to copy the full URL from the browser's address bar and paste it into chat, then call \`${mcpToolName}\` with that URL as \`callback_url\`.`
        : `

If the browser shows a connection error on the redirect page, ask the user to paste the full URL from the address bar and call \`${mcpToolName}\` with it.`;
      return {
        data: {
          status: "auth_url",
          authUrl: winner,
          message: `${s}Ask the user to open this URL in their browser to authorize the ${normalizeServerNameShort(serverName)} MCP server:

${winner}

Once they complete the flow, the server's tools will become ${toolsAvailableAutomaticallyText(tools)}.${g}`,
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
    let m = normalizeMcpServerName(redactMcpErrorDetail(serverName, config, errorMessage(error)));
    return {
      data: {
        status: "error",
        message: `Failed to start OAuth flow for ${normalizeServerNameShort(serverName)}: ${m}. Ask the user to run /mcp and authenticate manually.`,
      },
    };
  }
}
//@ chunk-rbwn7je9.js:14913-17416 placement
/**
 * 提交回调 URL 完成进行中的 MCP OAuth 流程的工具定义。
 */
function COMPLETE_AUTH_TOOL(e, r) {
  let mcpToolName = buildMcpToolName(e, AUTHENTICATE);
  let a =
    `Complete an in-progress OAuth flow for the "${normalizeServerNameShort(e)}" MCP server by submitting the callback URL. Call \`${mcpToolName}\` first to start the flow and get the authorization URL. ` +
    "After the user authorizes in their browser, the browser is redirected to a `http://localhost:<port>/callback?code=...&state=...` URL \u2014 " +
    "on remote sessions that page fails to load, but the URL in the address bar is still valid. Pass that full URL here as `callback_url`.";
  return {
    name: buildMcpToolName(e, COMPLETE_AUTHENTICATION),
    isMcp: true,
    mcpInfo: {
      serverName: e,
      toolName: COMPLETE_AUTHENTICATION,
      serverType: r.type ?? "stdio",
      source: mcpServerSource(e, r),
      ...(r.pluginSource !== undefined && {
        pluginSource: r.pluginSource,
      }),
      isAuthStub: true,
      serverId: connectorServerId(r),
      serverIdStamp: dynamicServerConnectorId(e, r),
    },
    isEnabled: () => true,
    isConcurrencySafe: () => false,
    isReadOnly: () => false,
    toAutoClassifierInput: () => e,
    userFacingName: () => `${e} - complete authentication (MCP)`,
    maxResultSizeChars: 1e4,
    renderToolUseMessage: () => `Complete authentication for ${e} MCP server`,
    async description() {
      return a;
    },
    async prompt() {
      return a;
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
    async call(h, c) {
      let { callback_url: callbackUrl } = h;
      let oAuthCallbackSubmitter = mcpAuthModule().getOAuthCallbackSubmitter(e);
      if (!oAuthCallbackSubmitter)
        return {
          data: {
            status: "error",
            message: `No OAuth flow is in progress for ${normalizeServerNameShort(e)}. Call \`${mcpToolName}\` first, then retry with the callback URL.`,
          },
        };
      let m = false;
      try {
        let g = new URL(callbackUrl);
        m = g.searchParams.has("code") || g.searchParams.has("error");
      } catch {}
      if (!m)
        return {
          data: {
            status: "error",
            message:
              "Invalid callback URL: missing authorization code. Ask the user to paste the full redirect URL from their browser's address bar, including the `?code=...&state=...` query string.",
          },
        };
      let activeOAuthPromise = mcpAuthModule().getActiveOAuthPromise(e);
      if (!oAuthCallbackSubmitter(callbackUrl))
        return {
          data: {
            status: "error",
            message: `That callback URL belongs to a different sign-in attempt for ${normalizeServerNameShort(e)} (its state does not match the flow in progress), or carries no authorization code. The current flow is still waiting: ask the user for the URL from the page this sign-in opened, then retry.`,
          },
        };
      try {
        await activeOAuthPromise;
        return {
          data: {
            status: "success",
            message: `Authentication complete for ${normalizeServerNameShort(e)}. ${toolsAvailableNowText(c.options.tools)}`,
          },
        };
      } catch (error) {
        if (error instanceof mcpAuthModule().AuthenticationCancelledError)
          return {
            data: {
              status: "error",
              message: `The OAuth flow for ${normalizeServerNameShort(e)} was cancelled (a newer attempt may have superseded it). Call \`${mcpToolName}\` again to restart.`,
            },
          };
        return {
          data: {
            status: "error",
            message: `Authentication failed for ${normalizeServerNameShort(e)}: ${normalizeMcpServerName(redactMcpErrorDetail(e, r, errorMessage(error)))}`,
          },
        };
      }
    },
    mapToolResultToToolResultBlockParam(h, toolUseId) {
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: h.message,
      };
    },
  };
}
export { createMcpAuthTool, COMPLETE_AUTH_TOOL };
