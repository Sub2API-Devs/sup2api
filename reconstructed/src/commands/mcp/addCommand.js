/**
 * commands/mcp/addCommand.ts
 *
 * `claude mcp add` CLI 子命令定义
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/mcp/addCommand.ts
 * pieces: chunk-4vq0yytw.js (1)
 * attribution: fingerprint 1
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

//@ chunk-4vq0yytw.js:12058-16442 fingerprint = registerMcpAddCommand (0.821)
function registerMcpAddCommand(v, p) {
  v.command("add <name> <commandOrUrl> [args...]")
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
    .action(
      p(async (s, e, t, o, r) => {
        let n = t,
          u = o;
        if (!e)
          cliError(`Error: Server name is required.
Usage: claude mcp add <name> <command> [args...]`);
        else if (!n)
          cliError(`Error: Command is required when server name is provided.
Usage: claude mcp add <name> <command> [args...]`);
        try {
          let scope = ensureConfigScope(r.scope),
            transport = ensureTransport(r.transport);
          if (r.xaa && !isXaaEnabled())
            cliError("Error: --xaa requires CLAUDE_CODE_ENABLE_XAA=1 in your environment");
          let xaa = Boolean(r.xaa);
          if (xaa) {
            let missing = [];
            if (!r.clientId) missing.push("--client-id");
            if (!r.clientSecret) missing.push("--client-secret");
            if (!getXaaIdpSettings()) missing.push("'claude mcp xaa setup' (settings.xaaIdp not configured)");
            if (missing.length) cliError(`Error: --xaa requires: ${missing.join(", ")}`);
          }
          let transportExplicit = r.transport !== void 0,
            looksLikeUrl =
              n.startsWith("http://") ||
              n.startsWith("https://") ||
              n.startsWith("localhost") ||
              n.endsWith("/sse") ||
              n.endsWith("/mcp");
          if (
            (await logEventAsync("tengu_mcp_add", {
              type: fromEnum(transport),
              scope: fromEnum(scope),
              source: lit("command"),
              transport: fromEnum(transport),
              transportExplicit: transportExplicit,
              looksLikeUrl: looksLikeUrl,
            }),
            transport === "sse" || transport === "http")
          ) {
            let m = transport === "sse" ? "SSE" : "HTTP";
            if (!n) return cliErrorAfterAnalyticsFlush(`Error: URL is required for ${m} transport.`);
            let w = r.header ? parseHeaders(r.header) : void 0,
              h = r.callbackPort ? parseIntLoose(r.callbackPort) : void 0;
            if (h !== void 0 && (!Number.isInteger(h) || h <= 0 || h > 65535))
              return cliErrorAfterAnalyticsFlush("Error: --callback-port must be an integer in [1, 65535]");
            let P =
                r.clientId || h || xaa
                  ? {
                      ...(r.clientId && { clientId: r.clientId }),
                      ...(h && { callbackPort: h }),
                      ...(xaa && { xaa: !0 }),
                    }
                  : void 0,
              { readClientSecret: readClientSecret, saveMcpClientSecret: saveMcpClientSecret } =
                require("./chunk-asne9cp8.js").mcpAuthModule(),
              k = r.clientSecret && r.clientId ? await readClientSecret() : void 0,
              A =
                transport === "sse"
                  ? { type: "sse", url: n, headers: w, oauth: P }
                  : { type: "http", url: n, headers: w, oauth: P };
            if ((await addMcpConfig(e, A, scope, s), k)) {
              let y = await saveMcpClientSecret(e, A, k);
              if (!y.success)
                process.stderr
                  .write(`Server added, but the client secret could not be stored${y.warning ? ` (${y.warning})` : ""}. Re-run with --client-secret once secure storage is available.
`);
            }
            if (
              (process.stdout
                .write(`Added ${m} MCP server ${e} with URL: ${redactUrlsInText(n)} to ${scope} config
`),
              w)
            )
              process.stdout.write(`Headers: ${jsonStringify(redactSecrets_3(w), null, 2)}
`);
          } else {
            if (r.clientId || r.clientSecret || r.callbackPort || r.xaa)
              process.stderr
                .write(`Warning: --client-id, --client-secret, --callback-port, and --xaa are only supported for HTTP/SSE transports and will be ignored for stdio.
`);
            let m = looksLikeUrl ? redactUrlsInText(n) : n;
            if (!transportExplicit && looksLikeUrl) {
              process.stderr.write(`
Warning: The command "${m}" looks like a URL, but is being interpreted as a stdio server as --transport was not specified.
`);
              let h = claudeCommand("mcp add --transport http", e),
                P = claudeCommand("mcp add --transport sse", e);
              if (h && P)
                (process.stderr.write(`If this is an HTTP server, use: ${h} ${m}
`),
                  process.stderr.write(`If this is an SSE server, use: ${P} ${m}
`));
              else
                process.stderr.write(`If this is a remote server, re-run with --transport http (or sse).
`);
            }
            let env = parseEnvVars(r.env);
            (await addMcpConfig(e, { type: "stdio", command: n, args: u, env: env }, scope, s),
              process.stdout
                .write(`Added stdio MCP server ${e} with command: ${m} ${u.join(" ")} to ${scope} config
`));
          }
          return cliOkAfterAnalyticsFlush(`File modified: ${describeMcpConfigFilePath(scope)}`);
        } catch (error) {
          return cliErrorAfterAnalyticsFlush(errorMessage(error));
        }
      }),
    );
}

export { registerMcpAddCommand };
