/**
 * commands/mcp/xaaIdpCommand.ts
 *
 * `claude mcp xaa` CLI 子命令：管理 XAA（SEP-990）IdP 连接
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/mcp/xaaIdpCommand.ts
 * pieces: chunk-4vq0yytw.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { cliError, cliOk } from "../../cli/exit.js";
import { parseIntLoose } from "../../utils/envUtils.js";
import { env } from "../../utils/env.js";
import { getXaaIdpSettings } from "../../services/mcp/xaaIdpLogin.js";
import { updateSettingsForSource } from "../../utils/settings/settings.js";
import { errorMessage } from "../../utils/errors.js";
import { createHyperlink } from "../../utils/hyperlink.js";

//@ chunk-4vq0yytw.js:16442-16516 affinity
function mcpXaaIdpModule() {
  return require("../../services/mcp/emitTripwireEvent.lazy.js").mcpXaaIdpLoginModule();
}
//@ chunk-4vq0yytw.js:16516-20902 fingerprint = registerMcpXaaIdpCommand (0.928)
function registerMcpXaaIdpCommand(mcp, command) {
  let xaaIdp = mcp.command("xaa").description("Manage the XAA (SEP-990) IdP connection");
  xaaIdp
    .command("setup")
    .description("Configure the IdP connection (one-time setup for all XAA-enabled servers)")
    .requiredOption("--issuer <url>", "IdP issuer URL (OIDC discovery)")
    .requiredOption("--client-id <id>", "Claude Code's client_id at the IdP")
    .option("--client-secret", "Read IdP client secret from MCP_XAA_IDP_CLIENT_SECRET env var")
    .option(
      "--callback-port <port>",
      "Fixed loopback callback port (only if IdP does not honor RFC 8252 port-any matching)",
    )
    .action(
      command(async (args, options) => {
        let issuerUrl;
        try {
          issuerUrl = new URL(options.issuer);
        } catch {
          return cliError(`Error: --issuer must be a valid URL (got "${options.issuer}")`);
        }
        if (
          issuerUrl.protocol !== "https:" &&
          !(
            issuerUrl.protocol === "http:" &&
            (issuerUrl.hostname === "localhost" ||
              issuerUrl.hostname === "127.0.0.1" ||
              issuerUrl.hostname === "[::1]")
          )
        )
          return cliError(
            `Error: --issuer must use https:// (got "${issuerUrl.protocol}//${issuerUrl.host}")`,
          );
        let callbackPort = options.callbackPort ? parseIntLoose(options.callbackPort) : undefined;
        if (
          callbackPort !== undefined &&
          (!Number.isInteger(callbackPort) || callbackPort <= 0 || callbackPort > 65535)
        )
          return cliError("Error: --callback-port must be an integer in [1, 65535]");
        let secret = options.clientSecret ? env.MCP_XAA_IDP_CLIENT_SECRET : undefined;
        if (options.clientSecret && !secret)
          return cliError("Error: --client-secret requires MCP_XAA_IDP_CLIENT_SECRET env var");
        let old = getXaaIdpSettings();
        let oldIssuer = old?.issuer;
        let oldClientId = old?.clientId;
        let { error } = await updateSettingsForSource(
          "userSettings",
          {
            xaaIdp: {
              issuer: options.issuer,
              clientId: options.clientId,
              callbackPort,
            },
          },
          undefined,
          args,
        );
        if (error) return cliError(`Error writing settings: ${error.message}`);
        if (oldIssuer) {
          if (mcpXaaIdpModule().issuerKey(oldIssuer) !== mcpXaaIdpModule().issuerKey(options.issuer)) {
            await mcpXaaIdpModule().clearIdpIdToken(oldIssuer);
            await mcpXaaIdpModule().clearIdpClientSecret(oldIssuer);
          } else if (oldClientId !== options.clientId) {
            await mcpXaaIdpModule().clearIdpIdToken(oldIssuer);
            await mcpXaaIdpModule().clearIdpClientSecret(oldIssuer);
          }
        }
        if (secret) {
          let { success, warning } = await mcpXaaIdpModule().saveIdpClientSecret(options.issuer, secret);
          if (!success)
            return cliError(
              `Error: settings written but keychain save failed${warning ? ` \u2014 ${warning}` : ""}. Re-run with --client-secret once keychain is available.`,
            );
        }
        cliOk(`XAA IdP connection configured for ${options.issuer}`);
      }),
    );
  xaaIdp
    .command("login")
    .description(
      "Cache an IdP id_token so XAA-enabled MCP servers authenticate silently. Default: run the OIDC browser login. With --id-token: write a pre-obtained JWT directly (used by conformance/e2e tests where the mock IdP does not serve /authorize).",
    )
    .option("--force", "Ignore any cached id_token and re-login (useful after IdP-side revocation)")
    .option(
      "--id-token <jwt>",
      "Write this pre-obtained id_token directly to cache, skipping the OIDC browser login",
    )
    .action(async (options) => {
      let idp = getXaaIdpSettings();
      if (!idp) return cliError("Error: no XAA IdP connection. Run 'claude mcp xaa setup' first.");
      if (options.idToken)
        try {
          let expiresAt = await mcpXaaIdpModule().saveIdpIdTokenFromJwt(idp.issuer, options.idToken);
          return cliOk(`id_token cached for ${idp.issuer} (expires ${new Date(expiresAt).toISOString()})`);
        } catch (error) {
          return cliError(`id_token cache write failed: ${errorMessage(error)}`);
        }
      if (options.force) await mcpXaaIdpModule().clearIdpIdToken(idp.issuer);
      if ((await mcpXaaIdpModule().getCachedIdpIdToken(idp.issuer)) !== undefined)
        return cliOk(
          `Already logged in to ${idp.issuer} (cached id_token still valid). Use --force to re-login.`,
        );
      process.stdout.write(`Opening browser for IdP login at ${idp.issuer}\u2026
`);
      try {
        await mcpXaaIdpModule().acquireIdpIdToken({
          idpIssuer: idp.issuer,
          idpClientId: idp.clientId,
          idpClientSecret: await mcpXaaIdpModule().getIdpClientSecret(idp.issuer),
          callbackPort: idp.callbackPort,
          onAuthorizationUrl: (url) => {
            process.stdout.write(`If the browser did not open, visit:
  ${createHyperlink(url, undefined, {
    assumeSupport: true,
  })}
`);
          },
        });
        cliOk("Logged in. MCP servers with --xaa will now authenticate silently.");
      } catch (e) {
        cliError(`IdP login failed: ${errorMessage(e)}`);
      }
    });
  xaaIdp
    .command("show")
    .description("Show the current IdP connection config")
    .action(async () => {
      let idp = getXaaIdpSettings();
      if (!idp) return cliOk("No XAA IdP connection configured.");
      let hasSecret = (await mcpXaaIdpModule().getIdpClientSecret(idp.issuer)) !== undefined;
      let hasIdToken = (await mcpXaaIdpModule().getCachedIdpIdToken(idp.issuer)) !== undefined;
      process.stdout.write(`Issuer:        ${idp.issuer}
`);
      process.stdout.write(`Client ID:     ${idp.clientId}
`);
      if (idp.callbackPort !== undefined)
        process.stdout.write(`Callback port: ${idp.callbackPort}
`);
      process.stdout
        .write(`Client secret: ${hasSecret ? "(stored in keychain)" : "(not set \u2014 PKCE-only)"}
`);
      process.stdout
        .write(`Logged in:     ${hasIdToken ? "yes (id_token cached)" : "no \u2014 run 'claude mcp xaa login'"}
`);
      cliOk();
    });
  xaaIdp
    .command("clear")
    .description("Clear the IdP connection config and cached id_token")
    .action(
      command(async (args) => {
        let idp = getXaaIdpSettings();
        let { error } = await updateSettingsForSource(
          "userSettings",
          {
            xaaIdp: undefined,
          },
          undefined,
          args,
        );
        if (error) return cliError(`Error writing settings: ${error.message}`);
        if (idp) {
          await mcpXaaIdpModule().clearIdpIdToken(idp.issuer);
          await mcpXaaIdpModule().clearIdpClientSecret(idp.issuer);
        }
        cliOk("XAA IdP connection cleared");
      }),
    );
}
export { registerMcpXaaIdpCommand };
