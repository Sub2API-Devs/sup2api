/**
 * commands/mcp/registerMcpCommands.ts
 *
 * 2.1.316 新增：注册 `claude mcp` 子命令。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-yzwxxgws.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createHelpConfig } from "../../cli/helpFormat.js";
import { isRemoteMcpServeHost } from "../../entrypoints/mcpServeArgs.js";
import { Option } from "../../../vendor/commander/esm.mjs";
import { setStrictMcpConfig } from "../../bootstrap/state.js";
import { registerMcpAddCommand } from "./addCommand.js";
import { isXaaEnabled } from "../../services/mcp/xaaIdpLogin.js";
import { registerMcpXaaIdpCommand } from "./xaaIdpCommand.js";
import { cliOkAfterAnalyticsFlush } from "../../cli/exit.js";

//@ chunk-yzwxxgws.js:22648-26925 placement
function registerMcpCommands(program, register) {
  let mcpCommand = program
    .command("mcp")
    .description("Configure and manage MCP servers")
    .configureHelp(createHelpConfig())
    .enablePositionalOptions();
  let serveCommand = mcpCommand
    .command("serve")
    .description("Start the Claude Code MCP server")
    .option("-d, --debug", "Enable debug mode", () => true)
    .option("--verbose", "Override verbose mode setting from config", () => true);
  if (isRemoteMcpServeHost())
    serveCommand
      .addOption(
        new Option("--transport <transport>", "Transport for MCP JSON-RPC")
          .choices(["stdio", "http"])
          .default("stdio"),
      )
      .option(
        "--port <port>",
        "Port to listen on with --transport http (default 0 = kernel-assigned; bound to 127.0.0.1 only)",
      )
      .addOption(
        new Option(
          "--result-format <format>",
          "Tool result content: raw (JSON of the tool output) or rendered (the text the model would see)",
        )
          .choices(["raw", "rendered"])
          .default("raw"),
      )
      .option(
        "--session-tunnel",
        "With --transport http --port 28471: dial the session tunnel that relays tool calls; reads one line of JSON (session id, token, API address) from standard input",
      );
  serveCommand.action(
    register(async (opts, command) => {
      setStrictMcpConfig(program.getOptionValue("strictMcpConfig") === true);
      let { mcpServeHandler } = await import("../../cli/handlers/mcpServe.js");
      await mcpServeHandler(command, opts);
    }),
  );
  registerMcpAddCommand(mcpCommand, register);
  if (isXaaEnabled()) registerMcpXaaIdpCommand(mcpCommand, register);
  mcpCommand
    .command("remove <name>")
    .description("Remove an MCP server")
    .option(
      "-s, --scope <scope>",
      "Configuration scope (local, user, or project) - if not specified, removes from whichever scope it exists in",
    )
    .action(
      register(async (name, opts, command) => {
        let [{ mcpRemoveHandler: removeHandler }, { createSubcommandRoot: createRoot }] = await Promise.all([
          import("../../cli/handlers/mcp.js"),
          import("../../cli/handlers/util.js"),
        ]);
        await removeHandler(await createRoot(), opts, command, name);
        return cliOkAfterAnalyticsFlush();
      }),
    );
  mcpCommand
    .command("list")
    .description(
      "List configured MCP servers. Unapproved .mcp.json servers are shown as \u23F8 Pending approval and not connected to; approved servers are health-checked unless disabled for this project.",
    )
    .action(
      register(async (opts) => {
        let [{ mcpListHandler: listHandler }, { createSubcommandRoot: createRoot }, { credentialsStoreFor }] =
          await Promise.all([
            import("../../cli/handlers/mcp.js"),
            import("../../cli/handlers/util.js"),
            import("../../utils/secureStorage/credentialsFileStore.js"),
          ]);
        await listHandler(await createRoot(), opts, credentialsStoreFor(opts));
      }),
    );
  mcpCommand
    .command("get <name>")
    .description(
      "Get details about an MCP server. Unapproved .mcp.json servers are shown as \u23F8 Pending approval and not connected to; approved servers are health-checked unless disabled for this project.",
    )
    .action(
      register(async (name, opts) => {
        let [{ mcpGetHandler: getHandler }, { createSubcommandRoot: createRoot }, { credentialsStoreFor }] =
          await Promise.all([
            import("../../cli/handlers/mcp.js"),
            import("../../cli/handlers/util.js"),
            import("../../utils/secureStorage/credentialsFileStore.js"),
          ]);
        await getHandler(await createRoot(), opts, name, credentialsStoreFor(name));
      }),
    );
  mcpCommand
    .command("login <name>")
    .description("Authenticate with an MCP server (HTTP, SSE, or claude.ai connector)")
    .option(
      "--no-browser",
      "Print the authorization URL instead of opening a browser (for SSH/headless sessions \u2014 paste the redirect URL back when prompted)",
    )
    .action(
      register(async (name, opts, command) => {
        let [{ mcpLoginHandler: loginHandler }, { credentialsStoreFor }] = await Promise.all([
          import("./mcpLoginHandler.lazy.js"),
          import("../../utils/secureStorage/credentialsFileStore.js"),
        ]);
        await loginHandler(opts, command, name, credentialsStoreFor(name));
      }),
    );
  mcpCommand
    .command("logout <name>")
    .description("Clear stored OAuth credentials for an MCP server")
    .action(
      register(async (name, opts) => {
        let [{ mcpLogoutHandler: logoutHandler }, { credentialsStoreFor }] = await Promise.all([
          import("./mcpLoginHandler.lazy.js"),
          import("../../utils/secureStorage/credentialsFileStore.js"),
        ]);
        await logoutHandler(opts, name, credentialsStoreFor(name));
      }),
    );
  mcpCommand
    .command("add-json <name> <json>")
    .description("Add an MCP server (stdio, SSE, HTTP, or WebSocket) with a JSON string")
    .option("-s, --scope <scope>", "Configuration scope (local, user, or project)", "local")
    .option("--client-secret", "Prompt for OAuth client secret (or set MCP_CLIENT_SECRET env var)")
    .action(
      register(async (name, json, opts, command) => {
        let [{ mcpAddJsonHandler: addJsonHandler }, { createSubcommandRoot: createRoot }] = await Promise.all(
          [import("../../cli/handlers/mcp.js"), import("../../cli/handlers/util.js")],
        );
        await addJsonHandler(await createRoot(), json, opts, command, name);
        return cliOkAfterAnalyticsFlush();
      }),
    );
  mcpCommand
    .command("add-from-claude-desktop")
    .description("Import MCP servers from Claude Desktop (Mac and WSL only)")
    .option("-s, --scope <scope>", "Configuration scope (local, user, or project)", "local")
    .action(
      register(async (opts, command) => {
        let { mcpAddFromDesktopHandler } = await import("../../cli/handlers/mcp.js");
        await mcpAddFromDesktopHandler(command, opts);
      }),
    );
  mcpCommand
    .command("reset-project-choices")
    .description("Reset all approved and rejected project-scoped (.mcp.json) servers within this project")
    .action(
      register(async (opts) => {
        let [{ mcpResetChoicesHandler: resetChoicesHandler }, { createSubcommandRoot: createRoot }] =
          await Promise.all([import("../../cli/handlers/mcp.js"), import("../../cli/handlers/util.js")]);
        await resetChoicesHandler(await createRoot(), opts);
        return cliOkAfterAnalyticsFlush();
      }),
    );
}
export { registerMcpCommands };
