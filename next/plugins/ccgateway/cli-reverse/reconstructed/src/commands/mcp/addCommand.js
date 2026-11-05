/**
 * commands/mcp/addCommand.ts
 *
 * `claude mcp add` CLI 子命令定义
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/mcp/addCommand.ts
 * pieces: chunk-yzwxxgws.js (2)
 * attribution: affinity 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { Option } from "../../../vendor/commander/esm.mjs";
import { isXaaEnabled, getXaaIdpSettings } from "../../services/mcp/xaaIdpLogin.js";
import { cliError, cliErrorAfterAnalyticsFlush, cliOkAfterAnalyticsFlush } from "../../cli/exit.js";
import {
  ensureConfigScope,
  ensureTransport,
  parseHeaders,
  describeMcpConfigFilePath,
} from "../../services/mcp/utils.js";
import { logEventAsync } from "../../services/analytics/index.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { parseIntLoose, parseEnvVars } from "../../utils/envUtils.js";
import { addMcpConfig } from "../../services/mcp/config.js";
import { redactUrlsInText } from "../../utils/redaction/urlRedaction.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { redactSecrets_3 } from "../../services/teamMemorySync/secretScanner.js";
import { claudeCommand } from "../../utils/worktreeResumeHint.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-yzwxxgws.js:13211-13418 affinity
var ADD_COMMAND_FLAG_PAIRS = [
  ["scope", "--scope"],
  ["transport", "--transport"],
  ["env", "--env"],
  ["header", "--header"],
  ["clientId", "--client-id"],
  ["clientSecret", "--client-secret"],
  ["callbackPort", "--callback-port"],
  ["xaa", "--xaa"],
];
//@ chunk-yzwxxgws.js:13418-18188 fingerprint (2.1.88 match: registerMcpAddCommand, 0.766)
function registerMcpAddCommand(mcpCommand, register) {
  let addCommand = mcpCommand
    .command("add <name> <commandOrUrl> [args...]")
    .description(
      `Add an MCP server to Claude Code.

Examples:
  # Add HTTP server:
  claude mcp add --transport http sentry https://mcp.sentry.dev/mcp

  # Add HTTP server with headers:
  claude mcp add --transport http corridor https://app.corridor.dev/api/mcp --header "Authorization: Bearer ..."

  # Add stdio server with environment variables:
  claude mcp add my-server -e API_KEY=xxx -- npx my-mcp-server

  # Add stdio server with subprocess flags:
  claude mcp add my-server -- my-command --some-flag arg1`,
    )
    .option("-s, --scope <scope>", "Configuration scope (local, user, or project)", "local")
    .option(
      "-t, --transport <transport>",
      "Transport type (stdio, sse, http). Defaults to stdio if not specified.",
    )
    .option("-e, --env <env...>", "Set environment variables (e.g. -e KEY=value)")
    .option(
      "-H, --header <header...>",
      'Set headers for HTTP/SSE servers (e.g. -H "X-Api-Key: abc123" -H "X-Custom: value")',
    )
    .option("--client-id <clientId>", "OAuth client ID for HTTP/SSE servers")
    .option("--client-secret", "Prompt for OAuth client secret (or set MCP_CLIENT_SECRET env var)")
    .option(
      "--callback-port <port>",
      "Fixed port for OAuth callback (for servers requiring pre-registered redirect URIs)",
    )
    .helpOption("-h, --help", "Display help for command")
    .addOption(
      new Option(
        "--xaa",
        "Enable XAA (SEP-990) for this server. Requires 'claude mcp xaa setup' first. Also requires --client-id and --client-secret (for the MCP server's AS).",
      ).hideHelp(!isXaaEnabled()),
    )
    .addOption(
      new Option("--web", "Add the server as a claude.ai connector instead of to local config").hideHelp(),
    );
  addCommand.action(
    register(async (name, urlOrCommand, command, args, options) => {
      if (options.web) {
        let flattened = ADD_COMMAND_FLAG_PAIRS.flatMap(([given, name]) =>
          addCommand.getOptionValueSource(given) === "cli" ? [name] : [],
        );
        if (args.length > 0) flattened.push("extra arguments");
        let [{ mcpAddWebHandler: webHandler }, { credentialsStoreFor }] = await Promise.all([
          import("./mcpAddWebHandler.lazy.js"),
          import("../../utils/secureStorage/credentialsFileStore.js"),
        ]);
        return webHandler(urlOrCommand, command, flattened, name, credentialsStoreFor(name));
      }
      let actualCommand = command;
      let actualArgs = args;
      if (!urlOrCommand)
        cliError(`Error: Server name is required.
Usage: claude mcp add <name> <command> [args...]`);
      else if (!actualCommand)
        cliError(`Error: Command is required when server name is provided.
Usage: claude mcp add <name> <command> [args...]`);
      try {
        let scope = ensureConfigScope(options.scope);
        let transport = ensureTransport(options.transport);
        if (options.xaa && !isXaaEnabled())
          cliError("Error: --xaa requires CLAUDE_CODE_ENABLE_XAA=1 in your environment");
        let xaa = Boolean(options.xaa);
        if (xaa) {
          let missing = [];
          if (!options.clientId) missing.push("--client-id");
          if (!options.clientSecret) missing.push("--client-secret");
          if (!getXaaIdpSettings()) missing.push("'claude mcp xaa setup' (settings.xaaIdp not configured)");
          if (missing.length) cliError(`Error: --xaa requires: ${missing.join(", ")}`);
        }
        let transportExplicit = options.transport !== undefined;
        let looksLikeUrl =
          actualCommand.startsWith("http://") ||
          actualCommand.startsWith("https://") ||
          actualCommand.startsWith("localhost") ||
          actualCommand.endsWith("/sse") ||
          actualCommand.endsWith("/mcp");
        await logEventAsync("tengu_mcp_add", {
          type: fromEnum(transport),
          scope: fromEnum(scope),
          source: lit("command"),
          transport: fromEnum(transport),
          transportExplicit,
          looksLikeUrl,
        });
        if (transport === "sse" || transport === "http") {
          let transportLabel = transport === "sse" ? "SSE" : "HTTP";
          if (!actualCommand)
            return cliErrorAfterAnalyticsFlush(`Error: URL is required for ${transportLabel} transport.`);
          let headers = options.header ? parseHeaders(options.header) : undefined;
          let callbackPort = options.callbackPort ? parseIntLoose(options.callbackPort) : undefined;
          if (
            callbackPort !== undefined &&
            (!Number.isInteger(callbackPort) || callbackPort <= 0 || callbackPort > 65535)
          )
            return cliErrorAfterAnalyticsFlush("Error: --callback-port must be an integer in [1, 65535]");
          let oauth =
            options.clientId || callbackPort || xaa
              ? {
                  ...(options.clientId && {
                    clientId: options.clientId,
                  }),
                  ...(callbackPort && {
                    callbackPort,
                  }),
                  ...(xaa && {
                    xaa: true,
                  }),
                }
              : undefined;
          let { readClientSecret, saveMcpClientSecret } =
            require("../../services/mcp/emitTripwireEvent.lazy.js").mcpAuthModule();
          let clientSecret = options.clientSecret && options.clientId ? await readClientSecret() : undefined;
          let serverConfig =
            transport === "sse"
              ? {
                  type: "sse",
                  url: actualCommand,
                  headers,
                  oauth,
                }
              : {
                  type: "http",
                  url: actualCommand,
                  headers,
                  oauth,
                };
          await addMcpConfig(urlOrCommand, serverConfig, scope, name);
          if (clientSecret) {
            let secretResult = await saveMcpClientSecret(urlOrCommand, serverConfig, clientSecret);
            if (!secretResult.success)
              process.stderr
                .write(`Server added, but the client secret could not be stored${secretResult.warning ? ` (${secretResult.warning})` : ""}. Re-run with --client-secret once secure storage is available.
`);
          }
          process.stdout
            .write(`Added ${transportLabel} MCP server ${urlOrCommand} with URL: ${redactUrlsInText(actualCommand)} to ${scope} config
`);
          if (headers)
            process.stdout.write(`Headers: ${jsonStringify(redactSecrets_3(headers), null, 2)}
`);
        } else {
          if (options.clientId || options.clientSecret || options.callbackPort || options.xaa)
            process.stderr
              .write(`Warning: --client-id, --client-secret, --callback-port, and --xaa are only supported for HTTP/SSE transports and will be ignored for stdio.
`);
          let redactedCommand = looksLikeUrl ? redactUrlsInText(actualCommand) : actualCommand;
          if (!transportExplicit && looksLikeUrl) {
            process.stderr.write(`
Warning: The command "${redactedCommand}" looks like a URL, but is being interpreted as a stdio server as --transport was not specified.
`);
            let httpCommand = claudeCommand("mcp add --transport http", urlOrCommand);
            let sseCommand = claudeCommand("mcp add --transport sse", urlOrCommand);
            if (httpCommand && sseCommand) {
              process.stderr.write(`If this is an HTTP server, use: ${httpCommand} ${redactedCommand}
`);
              process.stderr.write(`If this is an SSE server, use: ${sseCommand} ${redactedCommand}
`);
            } else
              process.stderr.write(`If this is a remote server, re-run with --transport http (or sse).
`);
          }
          let env = parseEnvVars(options.env);
          await addMcpConfig(
            urlOrCommand,
            {
              type: "stdio",
              command: actualCommand,
              args: actualArgs,
              env,
            },
            scope,
            name,
          );
          process.stdout
            .write(`Added stdio MCP server ${urlOrCommand} with command: ${redactedCommand} ${actualArgs.join(" ")} to ${scope} config
`);
        }
        return cliOkAfterAnalyticsFlush(`File modified: ${describeMcpConfigFilePath(scope)}`);
      } catch (error) {
        return cliErrorAfterAnalyticsFlush(errorMessage(error));
      }
    }),
  );
}
export { registerMcpAddCommand };
