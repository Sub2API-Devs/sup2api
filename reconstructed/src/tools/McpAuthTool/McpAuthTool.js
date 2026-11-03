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
  Gri,
  uo,
  AUTHENTICATE,
  normalizeMcpServerName,
  sanitizeErrorDetail,
  COMPLETE_AUTHENTICATION,
} from "../../services/api/deferredToolsState.js";
import {
  H,
  emptyAuthInputSchema,
  ce,
  b,
  le,
  deleteNeedsAuthCache,
  T,
  redirectUriOf,
  ae,
  B,
  completeAuthInputSchema,
} from "../../services/mcp/needsAuthCache.js";
import { buildMcpToolName } from "../../services/mcp/mcpStringUtils.js";
import { mcpServerSource } from "../../services/mcp/fileReference/fileReferencePolicy.js";
import { gH } from "../../services/mcp/claudeai.js";
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

/**
 * 为需要 OAuth 但未认证的 MCP 服务器生成占位工具 mcp__<服务器>__authenticate：调用时检查托管策略/禁用/项目审批/claude.ai 连接器/不支持的传输，启动（或复用 10 分钟内的）OAuth 流程并返回授权 URL；授权完成后在身份未变、服务器仍启用时重连并让连接接管真实工具。权限直接 allow。
 */
//@ chunk-rbwn7je9.js:9435-13531 fingerprint = createMcpAuthTool (0.485)
function createMcpAuthTool(e, r, n) {
  let transport = r.type ?? "stdio",
    location = n && n !== transport ? `${transport} at ${Gri(n, 256)}` : transport,
    description =
      `The "${uo(e)}" MCP server (${location}) is installed but requires authentication. ` +
      "Call this tool to start the OAuth flow \u2014 you'll receive an authorization URL to share with the user. " +
      `Once the user completes authorization in their browser, the server's real tools will become ${H()}.`;
  return {
    name: buildMcpToolName(e, AUTHENTICATE),
    isMcp: !0,
    mcpInfo: {
      serverName: e,
      toolName: AUTHENTICATE,
      serverType: transport,
      source: mcpServerSource(e, r),
      ...(r.pluginSource !== void 0 && { pluginSource: r.pluginSource }),
      isAuthStub: !0,
      serverId: gH(r),
      serverIdStamp: dynamicServerConnectorId(e, r),
    },
    isEnabled: () => !0,
    isConcurrencySafe: () => !1,
    isReadOnly: () => !1,
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
    async checkPermissions(s) {
      return { behavior: "allow", updatedInput: s };
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
            message: `MCP server ${uo(e)} is disabled. Ask the user to enable it in /mcp before authenticating.`,
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
            message: `This is a claude.ai MCP connector. Ask the user to run /mcp and select "${uo(e)}" to authenticate.`,
          },
        };
      if (f.kind === "unsupported-transport")
        return {
          data: {
            status: "unsupported",
            message: `Server "${uo(e)}" uses ${transport} transport which does not support OAuth from this tool. Ask the user to run /mcp and authenticate manually.`,
          },
        };
      if (f.kind === "anthropic-hosted")
        return { data: { status: "unsupported", message: normalizeMcpServerName(f.message, 1024, "none") } };
      let of = ce.of(l.session.host),
        y = of.get(e);
      if (
        y !== void 0 &&
        y.flow === b().getActiveOAuthPromise(e) &&
        y.receivesPastedCallbacks() &&
        En(y.config, f.config) &&
        y.accountToken !== void 0 &&
        y.accountToken === isMcpIdentityIncomplete() &&
        y.identityEpoch === identityEpoch() &&
        Date.now() - y.startedAt < le
      )
        return formatAuthUrlResult({
          serverName: e,
          config: r,
          authUrlPromise: y.authUrl,
          oauthPromise: y.flow,
          reused: !0,
          tools: l.options.tools,
        });
      let M,
        authUrlPromise = new Promise((resolve) => {
          M = resolve;
        }),
        P,
        performMCPOAuthFlow = b().performMCPOAuthFlow(e, f.config, (S) => M?.(S), void 0, {
          skipBrowserOpen: !0,
          onWaitingForCallback: (prev) => {
            P = prev;
          },
        });
      b().setActiveOAuthPromise(e, performMCPOAuthFlow);
      let I = {
        flow: performMCPOAuthFlow,
        authUrl: authUrlPromise,
        receivesPastedCallbacks: () => P !== void 0 && b().getOAuthCallbackSubmitter(e) === P,
        config: f.config,
        accountToken: isMcpIdentityIncomplete(),
        identityEpoch: identityEpoch(),
        startedAt: Date.now(),
      };
      (of.set(e, I),
        performMCPOAuthFlow
          .catch(() => {})
          .finally(() => {
            if (of.get(e) === I) of.delete(e);
          }));
      let identityEpoch_2 = I.identityEpoch;
      return (
        performMCPOAuthFlow
          .then(async () => {
            if (identityEpoch() !== identityEpoch_2) {
              logMCPDebug(e, "OAuth completed after an identity change; discarding without reconnecting");
              return;
            }
            if (
              (deleteNeedsAuthCache(l.storageV5), isMcpServerDisabled(e) || isMcpDialBlockedByPolicy(e, r))
            ) {
              logMCPDebug(
                e,
                "OAuth completed but the server is now disabled or policy-blocked; not reconnecting",
              );
              return;
            }
            let reconnectMcpServerImpl = await T().reconnectMcpServerImpl(e, r, l.storageV5, l.credentials);
            if (identityEpoch() !== identityEpoch_2) {
              logMCPDebug(e, "OAuth completed after an identity change; discarding the stale reconnect");
              return;
            }
            let any = l.getMcp().clients.some((client) => client.name === e),
              connections = l.session.mcpSessionWiring.connections();
            if (!any || connections === void 0 || isMcpServerDisabled(e) || isMcpDialBlockedByPolicy(e, r)) {
              (logMCPDebug(
                e,
                "OAuth completed after the server was removed, disabled, or policy-blocked; discarding the fresh connection",
              ),
                T()
                  .clearServerCache(e, r)
                  .catch((w) =>
                    logMCPDebug(e, `Orphan-connection cleanup failed: ${describeConnectError(w, r)}`),
                  ),
                connections?.markReconnectDiscarded(e, r));
              return;
            }
            let adoptServer = connections.adoptServer(e, reconnectMcpServerImpl);
            if (adoptServer !== "adopted") {
              (logMCPDebug(
                e,
                `Sign-in finished, but its connection was not adopted (${adoptServer}); discarding it`,
              ),
                T()
                  .clearServerCache(e, r)
                  .catch((w) =>
                    logMCPDebug(e, `Orphan-connection cleanup failed: ${describeConnectError(w, r)}`),
                  ));
              return;
            }
            logMCPDebug(e, `OAuth complete, reconnected with ${reconnectMcpServerImpl.tools.length} tool(s)`);
          })
          .catch((err) => {
            logMCPError(
              e,
              `OAuth flow failed after tool-triggered start: ${sanitizeErrorDetail(redactMcpErrorDetail(e, r, errorMessage(err)))}`,
            );
          }),
        formatAuthUrlResult({
          serverName: e,
          config: r,
          authUrlPromise: authUrlPromise,
          oauthPromise: performMCPOAuthFlow,
          reused: !1,
          tools: l.options.tools,
        })
      );
    },
    mapToolResultToToolResultBlockParam(s, l) {
      return { tool_use_id: l, type: "tool_result", content: s.message };
    },
  };
}
/**
 * 生成 MCP OAuth 授权链接结果（已有进行中的登录、远程会话回调说明）。
 */
//@ chunk-rbwn7je9.js:13531-14913 placement
async function formatAuthUrlResult({
  serverName: serverName,
  config: config,
  authUrlPromise: authUrlPromise,
  oauthPromise: oauthPromise,
  reused: reused,
  tools: tools,
}) {
  let s = reused
    ? `A sign-in for ${uo(serverName)} that started earlier is still in progress, so the link below is that sign-in's link, not a new one. If the user says the sign-in page showed an error before they could approve access, ask them to run /mcp and sign in there instead.

`
    : "";
  try {
    let winner = await Promise.race([authUrlPromise, oauthPromise.then(() => null)]);
    if (winner) {
      let m = buildMcpToolName(serverName, COMPLETE_AUTHENTICATION),
        f = redirectUriOf(winner),
        g = ae()
          ? `

This session is remote, so after authorizing the browser will try to load \`${f}?code=...\` and show a connection error \u2014 that's expected. Ask the user to copy the full URL from the browser's address bar and paste it into chat, then call \`${m}\` with that URL as \`callback_url\`.`
          : `

If the browser shows a connection error on the redirect page, ask the user to paste the full URL from the address bar and call \`${m}\` with it.`;
      return {
        data: {
          status: "auth_url",
          authUrl: winner,
          message: `${s}Ask the user to open this URL in their browser to authorize the ${uo(serverName)} MCP server:

${winner}

Once they complete the flow, the server's tools will become ${H(tools)}.${g}`,
        },
      };
    }
    return {
      data: {
        status: "auth_url",
        message: `Authentication completed silently for ${uo(serverName)}. ${B(tools)}`,
      },
    };
  } catch (error) {
    let m = normalizeMcpServerName(redactMcpErrorDetail(serverName, config, errorMessage(error)));
    return {
      data: {
        status: "error",
        message: `Failed to start OAuth flow for ${uo(serverName)}: ${m}. Ask the user to run /mcp and authenticate manually.`,
      },
    };
  }
}
/**
 * 提交回调 URL 完成进行中的 MCP OAuth 流程的工具定义。
 */
//@ chunk-rbwn7je9.js:14913-17416 placement
function COMPLETE_AUTH_TOOL(e, r) {
  let n = buildMcpToolName(e, AUTHENTICATE),
    a =
      `Complete an in-progress OAuth flow for the "${uo(e)}" MCP server by submitting the callback URL. Call \`${n}\` first to start the flow and get the authorization URL. ` +
      "After the user authorizes in their browser, the browser is redirected to a `http://localhost:<port>/callback?code=...&state=...` URL \u2014 " +
      "on remote sessions that page fails to load, but the URL in the address bar is still valid. Pass that full URL here as `callback_url`.";
  return {
    name: buildMcpToolName(e, COMPLETE_AUTHENTICATION),
    isMcp: !0,
    mcpInfo: {
      serverName: e,
      toolName: COMPLETE_AUTHENTICATION,
      serverType: r.type ?? "stdio",
      source: mcpServerSource(e, r),
      ...(r.pluginSource !== void 0 && { pluginSource: r.pluginSource }),
      isAuthStub: !0,
      serverId: gH(r),
      serverIdStamp: dynamicServerConnectorId(e, r),
    },
    isEnabled: () => !0,
    isConcurrencySafe: () => !1,
    isReadOnly: () => !1,
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
    async checkPermissions(h) {
      return { behavior: "allow", updatedInput: h };
    },
    async call(h, c) {
      let { callback_url: callback_url } = h,
        oAuthCallbackSubmitter = b().getOAuthCallbackSubmitter(e);
      if (!oAuthCallbackSubmitter)
        return {
          data: {
            status: "error",
            message: `No OAuth flow is in progress for ${uo(e)}. Call \`${n}\` first, then retry with the callback URL.`,
          },
        };
      let m = !1;
      try {
        let g = new URL(callback_url);
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
      let activeOAuthPromise = b().getActiveOAuthPromise(e);
      if (!oAuthCallbackSubmitter(callback_url))
        return {
          data: {
            status: "error",
            message: `That callback URL belongs to a different sign-in attempt for ${uo(e)} (its state does not match the flow in progress), or carries no authorization code. The current flow is still waiting: ask the user for the URL from the page this sign-in opened, then retry.`,
          },
        };
      try {
        return (
          await activeOAuthPromise,
          {
            data: {
              status: "success",
              message: `Authentication complete for ${uo(e)}. ${B(c.options.tools)}`,
            },
          }
        );
      } catch (error) {
        if (error instanceof b().AuthenticationCancelledError)
          return {
            data: {
              status: "error",
              message: `The OAuth flow for ${uo(e)} was cancelled (a newer attempt may have superseded it). Call \`${n}\` again to restart.`,
            },
          };
        return {
          data: {
            status: "error",
            message: `Authentication failed for ${uo(e)}: ${normalizeMcpServerName(redactMcpErrorDetail(e, r, errorMessage(error)))}`,
          },
        };
      }
    },
    mapToolResultToToolResultBlockParam(h, c) {
      return { tool_use_id: c, type: "tool_result", content: h.message };
    },
  };
}

export { createMcpAuthTool, COMPLETE_AUTH_TOOL };
