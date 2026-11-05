/**
 * commands/mcp/mcpLoginCommand.ts
 *
 * 2.1.316 新增：claude mcp login / logout：为 HTTP MCP 服务器或 claude.ai 连接器做 OAuth 登录与登出
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sk4c360w.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-sk4c360w.js:13784-13835 placement
function mcpModulesChunk_4() {
  return require("../../services/mcp/emitTripwireEvent.lazy.js");
}
//@ chunk-sk4c360w.js:13835-13875 placement
function mcpAuthModule_2() {
  return mcpModulesChunk_4().mcpAuthModule();
}
//@ chunk-sk4c360w.js:13875-13917 placement
function mcpClientModule_8() {
  return mcpModulesChunk_4().mcpClientModule();
}
//@ chunk-sk4c360w.js:13917-14695 placement
async function describeServerNotLoginable(serverName, origin, storageV5, credentials) {
  await awaitMcpPolicyColdStart({
    hasDynamicMcpConfig: false,
  });
  let { servers, pendingProjectServers, rejectedProjectServers } = await getAllMcpConfigs({
    includePendingProjectServers: true,
    includeRejectedProjectServers: true,
    storageV5,
    credentials,
  });
  let server = servers[serverName];
  if (!server) {
    await logFeatureBadAsync(origin, "not_found");
    let knownNames = Object.keys(servers).filter(
      (key) => !pendingProjectServers.has(key) && !rejectedProjectServers.has(key),
    );
    return cliErrorAfterAnalyticsFlush(
      formatMcpServerNotFoundMessage(serverName, knownNames, pendingProjectServers.size > 0),
    );
  }
  if (rejectedProjectServers.has(serverName)) {
    await logFeatureBadAsync(origin, "rejected");
    return cliErrorAfterAnalyticsFlush(
      `"${serverName}" is from .mcp.json and was rejected. Run \`claude mcp reset-project-choices\` to review it again.`,
    );
  }
  if (pendingProjectServers.has(serverName)) {
    await logFeatureBadAsync(origin, "pending_approval");
    return cliErrorAfterAnalyticsFlush(
      `"${serverName}" is from .mcp.json and awaiting approval. Run \`claude\` in this directory to review it first.`,
    );
  }
  if (server.configError) {
    await logFeatureBadAsync(origin, "config_error");
    return cliErrorAfterAnalyticsFlush(`"${serverName}" has a configuration problem: ${server.configError}`);
  }
  return server;
}
//@ chunk-sk4c360w.js:14695-14953 placement
async function AUTH_KINDS(config, credentials) {
  if (configHasAuthorizationHeader(config)) return "static_auth_header";
  if (isFirstPartyMcpUrl(config.url) && isFirstPartyProvider()) {
    let reason;
    if (isStorageV5Enabled() && credentials !== undefined)
      reason = (await getClaudeAIOAuthTokensAsync(credentials))?.accessToken;
    else reason = getClaudeAIOAuthTokens()?.accessToken;
    if (reason) return "first_party_auth";
    if (isDesignMcpUrl(config.url) && (await checkConsent(credentials))) return "first_party_design_auth";
  }
  return null;
}
//@ chunk-sk4c360w.js:14953-15089 placement
function formatAuthorizeUrlPrompt(browser, url) {
  return `${browser ? "If the browser didn't open, visit:" : "Visit this URL to authorize:"}
  ${createHyperlink(url, undefined, {
    assumeSupport: true,
  })}

`;
}
//@ chunk-sk4c360w.js:15089-15196 placement
var CONNECTOR_AUTHORIZED_NOTE =
  "Once authorized on claude.ai, the connector will be available the next time you start Claude Code.";
//@ chunk-sk4c360w.js:15196-19085 placement
/**
 * claude mcp login：打开浏览器授权（claude.ai 连接器经 claudeai-proxy），不支持的传输报错（约 3.9 KB）。
 */
async function mcpLoginCommand(serverName, source, storageV5, credentials) {
  await logEventAsync("tengu_mcp_login", {});
  let notLoginable = await describeServerNotLoginable(serverName, "cli_mcp_login", storageV5, credentials);
  let target = classifyMcpAuthTarget(serverName, notLoginable);
  switch (target.kind) {
    case "claudeai-proxy": {
      let authUrl = claudeAiConnectorAuthUrl(target.config);
      if (!authUrl) {
        await logFeatureBadAsync("cli_mcp_login", "claudeai_no_auth_url");
        return cliErrorAfterAnalyticsFlush(
          `Couldn't build the claude.ai authorization link for "${serverName}". Make sure you're signed in (\`claude login\`).`,
        );
      }
      await logEventAsync("tengu_claudeai_mcp_auth_started", {});
      if (source.browser) {
        process.stdout.write(`Opening browser to authorize "${serverName}"\u2026
`);
        await openValidatedUrlSucceeded(authUrl);
      }
      process.stdout.write(`${formatAuthorizeUrlPrompt(source.browser, authUrl)}${CONNECTOR_AUTHORIZED_NOTE}
`);
      await mcpClientModule_8().removeMcpAuthCacheEntry(serverName, storageV5);
      await logFeatureOkAsync("cli_mcp_login");
      return cliOkAfterAnalyticsFlush();
    }
    case "unsupported-transport":
      await logFeatureBadAsync("cli_mcp_login", "unsupported_transport");
      return cliErrorAfterAnalyticsFlush(
        `"${serverName}" doesn't support OAuth login \u2014 it's only available for HTTP and SSE servers.`,
      );
    case "anthropic-hosted":
      await logFeatureBadAsync("cli_mcp_login", "anthropic_hosted_blocked");
      return cliErrorAfterAnalyticsFlush(target.message);
    case "oauth": {
      let authKind = await AUTH_KINDS(target.config, credentials);
      if (authKind === "static_auth_header") {
        await logFeatureBadAsync("cli_mcp_login", "static_auth_header");
        return cliErrorAfterAnalyticsFlush(
          `"${serverName}" authenticates with the \`Authorization\` header in its configuration, so there's no separate login. Update that header to change its credentials.`,
        );
      }
      if (authKind === "first_party_auth") {
        await logFeatureBadAsync("cli_mcp_login", "first_party_auth");
        return cliErrorAfterAnalyticsFlush(
          `"${serverName}" authenticates automatically with your Claude login. Run \`claude login\` if you're not signed in.`,
        );
      }
      if (authKind === "first_party_design_auth") {
        await logFeatureBadAsync("cli_mcp_login", "first_party_design_auth");
        return cliErrorAfterAnalyticsFlush(
          `"${serverName}" authenticates automatically with your stored /design-login credential. Run /design-login from an interactive session to re-authorize it.`,
        );
      }
      process.stdout.write(`Starting authentication for "${serverName}"\u2026
`);
      let prompt = "Or paste the redirect URL here: ";
      let abortController = new AbortController();
      let readline;
      let done = false;
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
        await mcpAuthModule_2().revokeServerTokens(serverName, target.config, {
          preserveStepUpState: true,
        });
        await Promise.race([
          promise,
          mcpAuthModule_2().performMCPOAuthFlow(
            serverName,
            target.config,
            (onLine) => {
              process.stdout.write(
                formatAuthorizeUrlPrompt(source.browser, onLine) +
                  `Waiting for authorization\u2026 (^C to cancel)
`,
              );
              if (readline) readline.prompt();
            },
            abortController.signal,
            {
              skipBrowserOpen: !source.browser,
              onWaitingForCallback: (callbackInfo) => {
                if (!process.stdin.isTTY) {
                  done = true;
                  abortController.abort();
                  return;
                }
                if (!process.stdout.isTTY) return;
                stopCapturingEarlyInput();
                readline = createInterface({
                  input: process.stdin,
                  output: process.stdout,
                  prompt,
                });
                readline.on("SIGINT", () => abortController.abort());
                readline.on("close", () => abortController.abort());
                readline.on("line", (line) => {
                  let trimmed = line.trim();
                  if (trimmed && callbackInfo(trimmed)) return;
                  if (trimmed)
                    process.stdout
                      .write(`That doesn't look like a redirect URL for this sign-in \u2014 paste the full address from the browser page this sign-in opened.
`);
                  readline?.prompt();
                });
              },
            },
          ),
        ]);
      } catch (error) {
        if (error instanceof mcpAuthModule_2().AuthenticationCancelledError) {
          if (done) {
            await logFeatureBadAsync("cli_mcp_login", "no_tty_stdin");
            return cliErrorAfterAnalyticsFlush(
              `Couldn't complete authentication for "${serverName}": stdin isn't a terminal, so authentication can't be completed here. ` +
                "Re-run in an interactive terminal \u2014 e.g. `ssh -t` \u2014 and paste the redirect URL when prompted.",
            );
          }
          await logFeatureSadAsync("cli_mcp_login", "cancelled");
          return exitAfterAnalyticsFlush(130);
        }
        await logFeatureBadAsync("cli_mcp_login", "oauth_flow_threw");
        let advisory = await adviseMcpRegistration(error, serverName, notLoginable, "mcp_login");
        if (advisory) {
          printCliError(
            `Couldn't complete authentication for "${serverName}": ${registrationAdviceText(advisory)}`,
          );
          if (advisory.kind === "connect") {
            await logEventAsync("tengu_mcp_claudeai_handoff_opened", {
              site: lit("mcp_login"),
              opened_browser: source.browser,
            });
            if (source.browser) await openValidatedUrlSucceeded(advisory.url);
            process.stdout
              .write(`${formatAuthorizeUrlPrompt(source.browser, advisory.url)}${CONNECTOR_AUTHORIZED_NOTE}
`);
          }
          if (advisory.kind === "connect" || advisory.kind === "connected")
            for (let connectorName of advisory.connectorNames)
              await mcpClientModule_8().removeMcpAuthCacheEntry(connectorName, storageV5);
          return cliErrorAfterAnalyticsFlush();
        }
        return cliErrorAfterAnalyticsFlush(
          `Couldn't complete authentication for "${serverName}": ${sanitizeErrorDetail(redactMcpErrorDetail(serverName, target.config, errorMessage(error)))}`,
        );
      } finally {
        clearInterval(interval);
        if (readline) {
          readline.close();
          process.stdout.write(`
`);
        }
      }
      await mcpClientModule_8().removeMcpAuthCacheEntry(serverName, storageV5);
      await logFeatureOkAsync("cli_mcp_login");
      return cliOkAfterAnalyticsFlush(
        isMcpServerDisabled(serverName)
          ? `Authenticated with "${serverName}", but it's currently disabled. Enable it in /mcp for its tools to load.`
          : `Authenticated with "${serverName}". Its tools are now available in Claude Code.`,
      );
    }
    default: {
      let authTarget = target;
    }
  }
}
//@ chunk-sk4c360w.js:19085-20360 placement
async function mcpLogoutCommand(serverName, storageV5, credentials) {
  await logEventAsync("tengu_mcp_logout", {});
  let authTarget = await describeServerNotLoginable(serverName, "cli_mcp_logout", storageV5, credentials);
  let target = classifyMcpAuthTarget(serverName, authTarget);
  switch (target.kind) {
    case "claudeai-proxy":
      await logFeatureSadAsync("cli_mcp_logout", "claudeai_proxy");
      return cliOkAfterAnalyticsFlush(
        `"${serverName}" is a claude.ai connector \u2014 its credentials live on claude.ai, not this machine. ` +
          `Disconnect it at ${createHyperlink(getConnectorsSettingsUrl())}`,
      );
    case "unsupported-transport":
      await logFeatureBadAsync("cli_mcp_logout", "unsupported_transport");
      return cliErrorAfterAnalyticsFlush(
        `"${serverName}" doesn't use OAuth \u2014 there are no stored credentials to clear.`,
      );
    case "anthropic-hosted": {
      let revoked = await mcpAuthModule_2().revokeServerTokens(serverName, target.config);
      if (!revoked.cleared) {
        await logFeatureBadAsync("cli_mcp_logout", revoked.reason);
        return cliErrorAfterAnalyticsFlush(
          `${signOutFailureMessage(
            serverName,
            revoked.reason,
            runCommandHint("mcp logout", serverName, {
              tail: "again",
              fallback: "try again",
            }),
          )} ${target.message}`,
        );
      }
      await mcpClientModule_8().removeMcpAuthCacheEntry(serverName, storageV5);
      await logFeatureSadAsync("cli_mcp_logout", "anthropic_hosted");
      return cliOkAfterAnalyticsFlush(`Cleared local credentials for "${serverName}". ${target.message}`);
    }
    case "oauth": {
      let secondRevoke = await mcpAuthModule_2().revokeServerTokens(serverName, target.config);
      if (!secondRevoke.cleared) {
        await logFeatureBadAsync("cli_mcp_logout", secondRevoke.reason);
        return cliErrorAfterAnalyticsFlush(
          signOutFailureMessage(
            serverName,
            secondRevoke.reason,
            runCommandHint("mcp logout", serverName, {
              tail: "again",
              fallback: "try again",
            }),
          ),
        );
      }
      await mcpClientModule_8().removeMcpAuthCacheEntry(serverName, storageV5);
      await logFeatureOkAsync("cli_mcp_logout");
      let reauthHint =
        (await AUTH_KINDS(target.config, credentials)) === null
          ? claudeCommand("mcp login", serverName)
          : null;
      let hintSuffix = reauthHint ? ` Run \`${reauthHint}\` to authenticate again.` : "";
      return cliOkAfterAnalyticsFlush(`Signed out of "${serverName}".${hintSuffix}`);
    }
    default: {
      let targetEcho = target;
    }
  }
}
export { mcpLoginCommand, mcpLogoutCommand };
