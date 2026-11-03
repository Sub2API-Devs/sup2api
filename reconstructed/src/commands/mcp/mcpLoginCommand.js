/**
 * commands/mcp/mcpLoginCommand.ts
 *
 * 2.1.316 新增：claude mcp login / logout：为 HTTP MCP 服务器或 claude.ai 连接器做 OAuth 登录与登出
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8vfr3s4c.js (9)
 * attribution: placement 9
 */
import { createInterface } from "readline";
import { awaitMcpPolicyColdStart } from "../../services/mcp/mcpPolicyColdStart.js";
import { getAllMcpConfigs, isMcpServerDisabled } from "../../services/mcp/config.js";
import {
  logFeatureBadAsync,
  logFeatureOkAsync,
  logFeatureSadAsync,
} from "../../services/analytics/featureTelemetry.js";
import {
  cliErrorAfterAnalyticsFlush,
  cliOkAfterAnalyticsFlush,
  exitAfterAnalyticsFlush,
  printCliError,
} from "../../cli/exit.js";
import { formatMcpServerNotFoundMessage } from "../../cli/handlers/mcpHints.js";
import {
  configHasAuthorizationHeader,
  isFirstPartyMcpUrl,
  isDesignMcpUrl,
  classifyMcpAuthTarget,
} from "../../services/mcp/auth.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { getClaudeAIOAuthTokensAsync, getClaudeAIOAuthTokens } from "../../utils/auth.js";
import { Foe } from "../../services/mcp/firstPartyDesignConsent.js";
import { createHyperlink } from "../../utils/hyperlink.js";
import { logEventAsync } from "../../services/analytics/index.js";
import { claudeAiConnectorAuthUrl, getConnectorsSettingsUrl } from "../../services/mcp/claudeai.js";
import { fi } from "../../utils/browser.js";
import { stopCapturingEarlyInput } from "../../utils/earlyInput.js";
import { adviseMcpRegistration, registrationAdviceText } from "../../services/mcp/mcpRegistrationAdvice.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { sanitizeErrorDetail } from "../../services/api/deferredToolsState.js";
import { redactMcpErrorDetail } from "../../services/mcp/mcpServerOrigin.js";
import { errorMessage } from "../../utils/errors.js";
import { signOutFailureMessage } from "../logout/logout.js";
import { runCommandHint, claudeCommand } from "../../utils/worktreeResumeHint.js";

//@ chunk-8vfr3s4c.js:12638-12689 placement
function v() {
  return require("./chunk-asne9cp8.js");
}
//@ chunk-8vfr3s4c.js:12689-12729 placement
function f() {
  return v().mcpAuthModule();
}
//@ chunk-8vfr3s4c.js:12729-12771 placement
function g() {
  return v().mcpClientModule();
}
//@ chunk-8vfr3s4c.js:12771-13549 placement
async function describeServerNotLoginable(t, e, o, p) {
  await awaitMcpPolicyColdStart({ hasDynamicMcpConfig: !1 });
  let {
      servers: servers,
      pendingProjectServers: pendingProjectServers,
      rejectedProjectServers: rejectedProjectServers,
    } = await getAllMcpConfigs({
      includePendingProjectServers: !0,
      includeRejectedProjectServers: !0,
      storageV5: o,
      credentials: p,
    }),
    s = servers[t];
  if (!s) {
    await logFeatureBadAsync(e, "not_found");
    let filtered = Object.keys(servers).filter(
      (a) => !pendingProjectServers.has(a) && !rejectedProjectServers.has(a),
    );
    return cliErrorAfterAnalyticsFlush(
      formatMcpServerNotFoundMessage(t, filtered, pendingProjectServers.size > 0),
    );
  }
  if (rejectedProjectServers.has(t))
    return (
      await logFeatureBadAsync(e, "rejected"),
      cliErrorAfterAnalyticsFlush(
        `"${t}" is from .mcp.json and was rejected. Run \`claude mcp reset-project-choices\` to review it again.`,
      )
    );
  if (pendingProjectServers.has(t))
    return (
      await logFeatureBadAsync(e, "pending_approval"),
      cliErrorAfterAnalyticsFlush(
        `"${t}" is from .mcp.json and awaiting approval. Run \`claude\` in this directory to review it first.`,
      )
    );
  if (s.configError)
    return (
      await logFeatureBadAsync(e, "config_error"),
      cliErrorAfterAnalyticsFlush(`"${t}" has a configuration problem: ${s.configError}`)
    );
  return s;
}
//@ chunk-8vfr3s4c.js:13549-13807 placement
async function AUTH_KINDS(t, e) {
  if (configHasAuthorizationHeader(t)) return "static_auth_header";
  if (isFirstPartyMcpUrl(t.url) && isFirstPartyProvider()) {
    let o;
    if (isStorageV5Enabled() && e !== void 0) o = (await getClaudeAIOAuthTokensAsync(e))?.accessToken;
    else o = getClaudeAIOAuthTokens()?.accessToken;
    if (o) return "first_party_auth";
    if (isDesignMcpUrl(t.url) && (await Foe(e))) return "first_party_design_auth";
  }
  return null;
}
//@ chunk-8vfr3s4c.js:13807-13943 placement
function formatAuthorizeUrlPrompt(t, e) {
  return `${t ? "If the browser didn't open, visit:" : "Visit this URL to authorize:"}
  ${createHyperlink(e, void 0, { assumeSupport: !0 })}

`;
}
//@ chunk-8vfr3s4c.js:13943-14050 placement
var CONNECTOR_AUTHORIZED_NOTE =
  "Once authorized on claude.ai, the connector will be available the next time you start Claude Code.";
/**
 * claude mcp login：打开浏览器授权（claude.ai 连接器经 claudeai-proxy），不支持的传输报错（约 3.9 KB）。
 */
//@ chunk-8vfr3s4c.js:14050-17940 placement
async function mcpLoginCommand(t, e, o, p) {
  await logEventAsync("tengu_mcp_login", {});
  let n = await describeServerNotLoginable(t, "cli_mcp_login", o, p),
    r = classifyMcpAuthTarget(t, n);
  switch (r.kind) {
    case "claudeai-proxy": {
      let i = claudeAiConnectorAuthUrl(r.config);
      if (!i)
        return (
          await logFeatureBadAsync("cli_mcp_login", "claudeai_no_auth_url"),
          cliErrorAfterAnalyticsFlush(
            `Couldn't build the claude.ai authorization link for "${t}". Make sure you're signed in (\`claude login\`).`,
          )
        );
      if ((await logEventAsync("tengu_claudeai_mcp_auth_started", {}), e.browser))
        (process.stdout.write(`Opening browser to authorize "${t}"\u2026
`),
          await fi(i));
      return (
        process.stdout.write(`${formatAuthorizeUrlPrompt(e.browser, i)}${CONNECTOR_AUTHORIZED_NOTE}
`),
        await g().removeMcpAuthCacheEntry(t, o),
        await logFeatureOkAsync("cli_mcp_login"),
        cliOkAfterAnalyticsFlush()
      );
    }
    case "unsupported-transport":
      return (
        await logFeatureBadAsync("cli_mcp_login", "unsupported_transport"),
        cliErrorAfterAnalyticsFlush(
          `"${t}" doesn't support OAuth login \u2014 it's only available for HTTP and SSE servers.`,
        )
      );
    case "anthropic-hosted":
      return (
        await logFeatureBadAsync("cli_mcp_login", "anthropic_hosted_blocked"),
        cliErrorAfterAnalyticsFlush(r.message)
      );
    case "oauth": {
      let i = await AUTH_KINDS(r.config, p);
      if (i === "static_auth_header")
        return (
          await logFeatureBadAsync("cli_mcp_login", "static_auth_header"),
          cliErrorAfterAnalyticsFlush(
            `"${t}" authenticates with the \`Authorization\` header in its configuration, so there's no separate login. Update that header to change its credentials.`,
          )
        );
      if (i === "first_party_auth")
        return (
          await logFeatureBadAsync("cli_mcp_login", "first_party_auth"),
          cliErrorAfterAnalyticsFlush(
            `"${t}" authenticates automatically with your Claude login. Run \`claude login\` if you're not signed in.`,
          )
        );
      if (i === "first_party_design_auth")
        return (
          await logFeatureBadAsync("cli_mcp_login", "first_party_design_auth"),
          cliErrorAfterAnalyticsFlush(
            `"${t}" authenticates automatically with your stored /design-login credential. Run /design-login from an interactive session to re-authorize it.`,
          )
        );
      process.stdout.write(`Starting authentication for "${t}"\u2026
`);
      let s = "Or paste the redirect URL here: ",
        abortController = new AbortController(),
        a,
        m = !1,
        k = setInterval(() => {}, 60000),
        promise = new Promise((l, c) => {
          abortController.signal.addEventListener(
            "abort",
            () => c(new (f().AuthenticationCancelledError)()),
            { once: !0 },
          );
        });
      promise.catch(() => {});
      try {
        (await f().revokeServerTokens(t, r.config, { preserveStepUpState: !0 }),
          await Promise.race([
            promise,
            f().performMCPOAuthFlow(
              t,
              r.config,
              (l) => {
                if (
                  (process.stdout.write(
                    formatAuthorizeUrlPrompt(e.browser, l) +
                      `Waiting for authorization\u2026 (^C to cancel)
`,
                  ),
                  a)
                )
                  a.prompt();
              },
              abortController.signal,
              {
                skipBrowserOpen: !e.browser,
                onWaitingForCallback: (l) => {
                  if (!process.stdin.isTTY) {
                    ((m = !0), abortController.abort());
                    return;
                  }
                  if (!process.stdout.isTTY) return;
                  (stopCapturingEarlyInput(),
                    (a = createInterface({ input: process.stdin, output: process.stdout, prompt: s })),
                    a.on("SIGINT", () => abortController.abort()),
                    a.on("close", () => abortController.abort()),
                    a.on("line", (c) => {
                      let trimmed = c.trim();
                      if (trimmed && l(trimmed)) return;
                      if (trimmed)
                        process.stdout
                          .write(`That doesn't look like a redirect URL for this sign-in \u2014 paste the full address from the browser page this sign-in opened.
`);
                      a?.prompt();
                    }));
                },
              },
            ),
          ]));
      } catch (error) {
        if (error instanceof f().AuthenticationCancelledError) {
          if (m)
            return (
              await logFeatureBadAsync("cli_mcp_login", "no_tty_stdin"),
              cliErrorAfterAnalyticsFlush(
                `Couldn't complete authentication for "${t}": stdin isn't a terminal, so authentication can't be completed here. ` +
                  "Re-run in an interactive terminal \u2014 e.g. `ssh -t` \u2014 and paste the redirect URL when prompted.",
              )
            );
          return (await logFeatureSadAsync("cli_mcp_login", "cancelled"), exitAfterAnalyticsFlush(130));
        }
        await logFeatureBadAsync("cli_mcp_login", "oauth_flow_threw");
        let c = await adviseMcpRegistration(error, t, n, "mcp_login");
        if (c) {
          if (
            (printCliError(`Couldn't complete authentication for "${t}": ${registrationAdviceText(c)}`),
            c.kind === "connect")
          ) {
            if (
              (await logEventAsync("tengu_mcp_claudeai_handoff_opened", {
                site: lit("mcp_login"),
                opened_browser: e.browser,
              }),
              e.browser)
            )
              await fi(c.url);
            process.stdout.write(`${formatAuthorizeUrlPrompt(e.browser, c.url)}${CONNECTOR_AUTHORIZED_NOTE}
`);
          }
          if (c.kind === "connect" || c.kind === "connected")
            for (let connectorName of c.connectorNames) await g().removeMcpAuthCacheEntry(connectorName, o);
          return cliErrorAfterAnalyticsFlush();
        }
        return cliErrorAfterAnalyticsFlush(
          `Couldn't complete authentication for "${t}": ${sanitizeErrorDetail(redactMcpErrorDetail(t, r.config, errorMessage(error)))}`,
        );
      } finally {
        if ((clearInterval(k), a))
          (a.close(),
            process.stdout.write(`
`));
      }
      return (
        await g().removeMcpAuthCacheEntry(t, o),
        await logFeatureOkAsync("cli_mcp_login"),
        cliOkAfterAnalyticsFlush(
          isMcpServerDisabled(t)
            ? `Authenticated with "${t}", but it's currently disabled. Enable it in /mcp for its tools to load.`
            : `Authenticated with "${t}". Its tools are now available in Claude Code.`,
        )
      );
    }
    default: {
      let i = r;
    }
  }
}
//@ chunk-8vfr3s4c.js:17940-19216 placement
async function mcpLogoutCommand(t, e, o) {
  await logEventAsync("tengu_mcp_logout", {});
  let p = await describeServerNotLoginable(t, "cli_mcp_logout", e, o),
    n = classifyMcpAuthTarget(t, p);
  switch (n.kind) {
    case "claudeai-proxy":
      return (
        await logFeatureSadAsync("cli_mcp_logout", "claudeai_proxy"),
        cliOkAfterAnalyticsFlush(
          `"${t}" is a claude.ai connector \u2014 its credentials live on claude.ai, not this machine. ` +
            `Disconnect it at ${createHyperlink(getConnectorsSettingsUrl())}`,
        )
      );
    case "unsupported-transport":
      return (
        await logFeatureBadAsync("cli_mcp_logout", "unsupported_transport"),
        cliErrorAfterAnalyticsFlush(
          `"${t}" doesn't use OAuth \u2014 there are no stored credentials to clear.`,
        )
      );
    case "anthropic-hosted": {
      let revokeServerTokens = await f().revokeServerTokens(t, n.config);
      if (!revokeServerTokens.cleared)
        return (
          await logFeatureBadAsync("cli_mcp_logout", revokeServerTokens.reason),
          cliErrorAfterAnalyticsFlush(
            `${signOutFailureMessage(t, revokeServerTokens.reason, runCommandHint("mcp logout", t, { tail: "again", fallback: "try again" }))} ${n.message}`,
          )
        );
      return (
        await g().removeMcpAuthCacheEntry(t, e),
        await logFeatureSadAsync("cli_mcp_logout", "anthropic_hosted"),
        cliOkAfterAnalyticsFlush(`Cleared local credentials for "${t}". ${n.message}`)
      );
    }
    case "oauth": {
      let revokeServerTokens = await f().revokeServerTokens(t, n.config);
      if (!revokeServerTokens.cleared)
        return (
          await logFeatureBadAsync("cli_mcp_logout", revokeServerTokens.reason),
          cliErrorAfterAnalyticsFlush(
            signOutFailureMessage(
              t,
              revokeServerTokens.reason,
              runCommandHint("mcp logout", t, { tail: "again", fallback: "try again" }),
            ),
          )
        );
      (await g().removeMcpAuthCacheEntry(t, e), await logFeatureOkAsync("cli_mcp_logout"));
      let i = (await AUTH_KINDS(n.config, o)) === null ? claudeCommand("mcp login", t) : null,
        s = i ? ` Run \`${i}\` to authenticate again.` : "";
      return cliOkAfterAnalyticsFlush(`Signed out of "${t}".${s}`);
    }
    default: {
      let r = n;
    }
  }
}
