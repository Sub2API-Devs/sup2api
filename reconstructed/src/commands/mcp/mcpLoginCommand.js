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
import { checkConsent } from "../../services/mcp/firstPartyDesignConsent.js";
import { createHyperlink } from "../../utils/hyperlink.js";
import { logEventAsync } from "../../services/analytics/index.js";
import { claudeAiConnectorAuthUrl, getConnectorsSettingsUrl } from "../../services/mcp/claudeai.js";
import { openValidatedUrlSucceeded } from "../../utils/browser.js";
import { stopCapturingEarlyInput } from "../../utils/earlyInput.js";
import { adviseMcpRegistration, registrationAdviceText } from "../../services/mcp/mcpRegistrationAdvice.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { sanitizeErrorDetail } from "../../services/api/deferredToolsState.js";
import { redactMcpErrorDetail } from "../../services/mcp/mcpServerOrigin.js";
import { errorMessage } from "../../utils/errors.js";
import { signOutFailureMessage } from "../logout/logout.js";
import { runCommandHint, claudeCommand } from "../../utils/worktreeResumeHint.js";

//@ chunk-8vfr3s4c.js:12638-12689 placement
function mcpModulesChunk_4() {
  return require("./chunk-asne9cp8.js");
}
//@ chunk-8vfr3s4c.js:12689-12729 placement
function mcpAuthModule_2() {
  return mcpModulesChunk_4().mcpAuthModule();
}
//@ chunk-8vfr3s4c.js:12729-12771 placement
function mcpClientModule_8() {
  return mcpModulesChunk_4().mcpClientModule();
}
//@ chunk-8vfr3s4c.js:12771-13549 placement
async function describeServerNotLoginable(t, e, storageV5, credentials) {
  await awaitMcpPolicyColdStart({
    hasDynamicMcpConfig: false,
  });
  let { servers, pendingProjectServers, rejectedProjectServers } = await getAllMcpConfigs({
    includePendingProjectServers: true,
    includeRejectedProjectServers: true,
    storageV5,
    credentials,
  });
  let s = servers[t];
  if (!s) {
    await logFeatureBadAsync(e, "not_found");
    let filtered = Object.keys(servers).filter(
      (key) => !pendingProjectServers.has(key) && !rejectedProjectServers.has(key),
    );
    return cliErrorAfterAnalyticsFlush(
      formatMcpServerNotFoundMessage(t, filtered, pendingProjectServers.size > 0),
    );
  }
  if (rejectedProjectServers.has(t)) {
    await logFeatureBadAsync(e, "rejected");
    return cliErrorAfterAnalyticsFlush(
      `"${t}" is from .mcp.json and was rejected. Run \`claude mcp reset-project-choices\` to review it again.`,
    );
  }
  if (pendingProjectServers.has(t)) {
    await logFeatureBadAsync(e, "pending_approval");
    return cliErrorAfterAnalyticsFlush(
      `"${t}" is from .mcp.json and awaiting approval. Run \`claude\` in this directory to review it first.`,
    );
  }
  if (s.configError) {
    await logFeatureBadAsync(e, "config_error");
    return cliErrorAfterAnalyticsFlush(`"${t}" has a configuration problem: ${s.configError}`);
  }
  return s;
}
//@ chunk-8vfr3s4c.js:13549-13807 placement
async function AUTH_KINDS(config, e) {
  if (configHasAuthorizationHeader(config)) return "static_auth_header";
  if (isFirstPartyMcpUrl(config.url) && isFirstPartyProvider()) {
    let o;
    if (isStorageV5Enabled() && e !== undefined) o = (await getClaudeAIOAuthTokensAsync(e))?.accessToken;
    else o = getClaudeAIOAuthTokens()?.accessToken;
    if (o) return "first_party_auth";
    if (isDesignMcpUrl(config.url) && (await checkConsent(e))) return "first_party_design_auth";
  }
  return null;
}
//@ chunk-8vfr3s4c.js:13807-13943 placement
function formatAuthorizeUrlPrompt(browser, e) {
  return `${browser ? "If the browser didn't open, visit:" : "Visit this URL to authorize:"}
  ${createHyperlink(e, undefined, {
    assumeSupport: true,
  })}

`;
}
//@ chunk-8vfr3s4c.js:13943-14050 placement
var CONNECTOR_AUTHORIZED_NOTE =
  "Once authorized on claude.ai, the connector will be available the next time you start Claude Code.";
//@ chunk-8vfr3s4c.js:14050-17940 placement
/**
 * claude mcp login：打开浏览器授权（claude.ai 连接器经 claudeai-proxy），不支持的传输报错（约 3.9 KB）。
 */
async function mcpLoginCommand(t, e, storageV5, credentials) {
  await logEventAsync("tengu_mcp_login", {});
  let n = await describeServerNotLoginable(t, "cli_mcp_login", storageV5, credentials);
  let r = classifyMcpAuthTarget(t, n);
  switch (r.kind) {
    case "claudeai-proxy": {
      let i = claudeAiConnectorAuthUrl(r.config);
      if (!i) {
        await logFeatureBadAsync("cli_mcp_login", "claudeai_no_auth_url");
        return cliErrorAfterAnalyticsFlush(
          `Couldn't build the claude.ai authorization link for "${t}". Make sure you're signed in (\`claude login\`).`,
        );
      }
      await logEventAsync("tengu_claudeai_mcp_auth_started", {});
      if (e.browser) {
        process.stdout.write(`Opening browser to authorize "${t}"\u2026
`);
        await openValidatedUrlSucceeded(i);
      }
      process.stdout.write(`${formatAuthorizeUrlPrompt(e.browser, i)}${CONNECTOR_AUTHORIZED_NOTE}
`);
      await mcpClientModule_8().removeMcpAuthCacheEntry(t, storageV5);
      await logFeatureOkAsync("cli_mcp_login");
      return cliOkAfterAnalyticsFlush();
    }
    case "unsupported-transport":
      await logFeatureBadAsync("cli_mcp_login", "unsupported_transport");
      return cliErrorAfterAnalyticsFlush(
        `"${t}" doesn't support OAuth login \u2014 it's only available for HTTP and SSE servers.`,
      );
    case "anthropic-hosted":
      await logFeatureBadAsync("cli_mcp_login", "anthropic_hosted_blocked");
      return cliErrorAfterAnalyticsFlush(r.message);
    case "oauth": {
      let i = await AUTH_KINDS(r.config, credentials);
      if (i === "static_auth_header") {
        await logFeatureBadAsync("cli_mcp_login", "static_auth_header");
        return cliErrorAfterAnalyticsFlush(
          `"${t}" authenticates with the \`Authorization\` header in its configuration, so there's no separate login. Update that header to change its credentials.`,
        );
      }
      if (i === "first_party_auth") {
        await logFeatureBadAsync("cli_mcp_login", "first_party_auth");
        return cliErrorAfterAnalyticsFlush(
          `"${t}" authenticates automatically with your Claude login. Run \`claude login\` if you're not signed in.`,
        );
      }
      if (i === "first_party_design_auth") {
        await logFeatureBadAsync("cli_mcp_login", "first_party_design_auth");
        return cliErrorAfterAnalyticsFlush(
          `"${t}" authenticates automatically with your stored /design-login credential. Run /design-login from an interactive session to re-authorize it.`,
        );
      }
      process.stdout.write(`Starting authentication for "${t}"\u2026
`);
      let prompt = "Or paste the redirect URL here: ";
      let abortController = new AbortController();
      let a;
      let m = false;
      let interval = setInterval(() => {}, 60000);
      let promise = new Promise((resolve, reject) => {
        abortController.signal.addEventListener(
          "abort",
          () => reject(new (mcpAuthModule_2().AuthenticationCancelledError)()),
          {
            once: true,
          },
        );
      });
      promise.catch(() => {});
      try {
        await mcpAuthModule_2().revokeServerTokens(t, r.config, {
          preserveStepUpState: true,
        });
        await Promise.race([
          promise,
          mcpAuthModule_2().performMCPOAuthFlow(
            t,
            r.config,
            (l) => {
              process.stdout.write(
                formatAuthorizeUrlPrompt(e.browser, l) +
                  `Waiting for authorization\u2026 (^C to cancel)
`,
              );
              if (a) a.prompt();
            },
            abortController.signal,
            {
              skipBrowserOpen: !e.browser,
              onWaitingForCallback: (l) => {
                if (!process.stdin.isTTY) {
                  m = true;
                  abortController.abort();
                  return;
                }
                if (!process.stdout.isTTY) return;
                stopCapturingEarlyInput();
                a = createInterface({
                  input: process.stdin,
                  output: process.stdout,
                  prompt,
                });
                a.on("SIGINT", () => abortController.abort());
                a.on("close", () => abortController.abort());
                a.on("line", (c) => {
                  let trimmed = c.trim();
                  if (trimmed && l(trimmed)) return;
                  if (trimmed)
                    process.stdout
                      .write(`That doesn't look like a redirect URL for this sign-in \u2014 paste the full address from the browser page this sign-in opened.
`);
                  a?.prompt();
                });
              },
            },
          ),
        ]);
      } catch (error) {
        if (error instanceof mcpAuthModule_2().AuthenticationCancelledError) {
          if (m) {
            await logFeatureBadAsync("cli_mcp_login", "no_tty_stdin");
            return cliErrorAfterAnalyticsFlush(
              `Couldn't complete authentication for "${t}": stdin isn't a terminal, so authentication can't be completed here. ` +
                "Re-run in an interactive terminal \u2014 e.g. `ssh -t` \u2014 and paste the redirect URL when prompted.",
            );
          }
          await logFeatureSadAsync("cli_mcp_login", "cancelled");
          return exitAfterAnalyticsFlush(130);
        }
        await logFeatureBadAsync("cli_mcp_login", "oauth_flow_threw");
        let c = await adviseMcpRegistration(error, t, n, "mcp_login");
        if (c) {
          printCliError(`Couldn't complete authentication for "${t}": ${registrationAdviceText(c)}`);
          if (c.kind === "connect") {
            await logEventAsync("tengu_mcp_claudeai_handoff_opened", {
              site: lit("mcp_login"),
              opened_browser: e.browser,
            });
            if (e.browser) await openValidatedUrlSucceeded(c.url);
            process.stdout.write(`${formatAuthorizeUrlPrompt(e.browser, c.url)}${CONNECTOR_AUTHORIZED_NOTE}
`);
          }
          if (c.kind === "connect" || c.kind === "connected")
            for (let connectorName of c.connectorNames)
              await mcpClientModule_8().removeMcpAuthCacheEntry(connectorName, storageV5);
          return cliErrorAfterAnalyticsFlush();
        }
        return cliErrorAfterAnalyticsFlush(
          `Couldn't complete authentication for "${t}": ${sanitizeErrorDetail(redactMcpErrorDetail(t, r.config, errorMessage(error)))}`,
        );
      } finally {
        clearInterval(interval);
        if (a) {
          a.close();
          process.stdout.write(`
`);
        }
      }
      await mcpClientModule_8().removeMcpAuthCacheEntry(t, storageV5);
      await logFeatureOkAsync("cli_mcp_login");
      return cliOkAfterAnalyticsFlush(
        isMcpServerDisabled(t)
          ? `Authenticated with "${t}", but it's currently disabled. Enable it in /mcp for its tools to load.`
          : `Authenticated with "${t}". Its tools are now available in Claude Code.`,
      );
    }
    default: {
      let i = r;
    }
  }
}
//@ chunk-8vfr3s4c.js:17940-19216 placement
async function mcpLogoutCommand(t, storageV5, credentials) {
  await logEventAsync("tengu_mcp_logout", {});
  let p = await describeServerNotLoginable(t, "cli_mcp_logout", storageV5, credentials);
  let n = classifyMcpAuthTarget(t, p);
  switch (n.kind) {
    case "claudeai-proxy":
      await logFeatureSadAsync("cli_mcp_logout", "claudeai_proxy");
      return cliOkAfterAnalyticsFlush(
        `"${t}" is a claude.ai connector \u2014 its credentials live on claude.ai, not this machine. ` +
          `Disconnect it at ${createHyperlink(getConnectorsSettingsUrl())}`,
      );
    case "unsupported-transport":
      await logFeatureBadAsync("cli_mcp_logout", "unsupported_transport");
      return cliErrorAfterAnalyticsFlush(
        `"${t}" doesn't use OAuth \u2014 there are no stored credentials to clear.`,
      );
    case "anthropic-hosted": {
      let r = await mcpAuthModule_2().revokeServerTokens(t, n.config);
      if (!r.cleared) {
        await logFeatureBadAsync("cli_mcp_logout", r.reason);
        return cliErrorAfterAnalyticsFlush(
          `${signOutFailureMessage(
            t,
            r.reason,
            runCommandHint("mcp logout", t, {
              tail: "again",
              fallback: "try again",
            }),
          )} ${n.message}`,
        );
      }
      await mcpClientModule_8().removeMcpAuthCacheEntry(t, storageV5);
      await logFeatureSadAsync("cli_mcp_logout", "anthropic_hosted");
      return cliOkAfterAnalyticsFlush(`Cleared local credentials for "${t}". ${n.message}`);
    }
    case "oauth": {
      let r = await mcpAuthModule_2().revokeServerTokens(t, n.config);
      if (!r.cleared) {
        await logFeatureBadAsync("cli_mcp_logout", r.reason);
        return cliErrorAfterAnalyticsFlush(
          signOutFailureMessage(
            t,
            r.reason,
            runCommandHint("mcp logout", t, {
              tail: "again",
              fallback: "try again",
            }),
          ),
        );
      }
      await mcpClientModule_8().removeMcpAuthCacheEntry(t, storageV5);
      await logFeatureOkAsync("cli_mcp_logout");
      let i = (await AUTH_KINDS(n.config, credentials)) === null ? claudeCommand("mcp login", t) : null;
      let s = i ? ` Run \`${i}\` to authenticate again.` : "";
      return cliOkAfterAnalyticsFlush(`Signed out of "${t}".${s}`);
    }
    default: {
      let r = n;
    }
  }
}
