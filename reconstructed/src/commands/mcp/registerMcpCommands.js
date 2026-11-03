/**
 * commands/mcp/registerMcpCommands.ts
 *
 * 2.1.316 新增：注册 `claude mcp` 子命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4vq0yytw.js (1)
 * attribution: placement 1
 */
import { createHelpConfig } from "../../cli/helpFormat.js";
import { isRemoteMcpServeHost } from "../../entrypoints/mcpServeArgs.js";
import { Option } from "../../../vendor/commander/esm.mjs";
import { setStrictMcpConfig } from "../../bootstrap/state.js";
import { registerMcpAddCommand } from "./addCommand.js";
import { isXaaEnabled } from "../../services/mcp/xaaIdpLogin.js";
import { registerMcpXaaIdpCommand } from "./xaaIdpCommand.js";
import { cliOkAfterAnalyticsFlush } from "../../cli/exit.js";

//@ chunk-4vq0yytw.js:20902-25179 placement
function registerMcpCommands(v, p) {
  let enablePositionalOptions = v
      .command("mcp")
      .description("Configure and manage MCP servers")
      .configureHelp(createHelpConfig())
      .enablePositionalOptions(),
    option = enablePositionalOptions
      .command("serve")
      .description("Start the Claude Code MCP server")
      .option("-d, --debug", "Enable debug mode", () => !0)
      .option("--verbose", "Override verbose mode setting from config", () => !0);
  if (isRemoteMcpServeHost())
    option
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
  if (
    (option.action(
      p(async (e, t) => {
        setStrictMcpConfig(v.getOptionValue("strictMcpConfig") === !0);
        let { mcpServeHandler: mcpServeHandler } = await import("./chunk-4x781459.js");
        await mcpServeHandler(t, e);
      }),
    ),
    registerMcpAddCommand(enablePositionalOptions, p),
    isXaaEnabled())
  )
    registerMcpXaaIdpCommand(enablePositionalOptions, p);
  (enablePositionalOptions
    .command("remove <name>")
    .description("Remove an MCP server")
    .option(
      "-s, --scope <scope>",
      "Configuration scope (local, user, or project) - if not specified, removes from whichever scope it exists in",
    )
    .action(
      p(async (e, t, o) => {
        let [{ mcpRemoveHandler: r }, { createSubcommandRoot: n }] = await Promise.all([
          import("./chunk-h2rjy0z4.js"),
          import("./chunk-tt9rxcw9.js"),
        ]);
        return (await r(await n(), t, o, e), cliOkAfterAnalyticsFlush());
      }),
    ),
    enablePositionalOptions
      .command("list")
      .description(
        "List configured MCP servers. Unapproved .mcp.json servers are shown as \u23F8 Pending approval and not connected to; approved servers are health-checked unless disabled for this project.",
      )
      .action(
        p(async (e) => {
          let [{ mcpListHandler: t }, { createSubcommandRoot: o }, { credentialsStoreFor: r }] =
            await Promise.all([
              import("./chunk-h2rjy0z4.js"),
              import("./chunk-tt9rxcw9.js"),
              import("./chunk-y36z1q7c.js"),
            ]);
          await t(await o(), e, r(e));
        }),
      ),
    enablePositionalOptions
      .command("get <name>")
      .description(
        "Get details about an MCP server. Unapproved .mcp.json servers are shown as \u23F8 Pending approval and not connected to; approved servers are health-checked unless disabled for this project.",
      )
      .action(
        p(async (e, t) => {
          let [{ mcpGetHandler: o }, { createSubcommandRoot: r }, { credentialsStoreFor: n }] =
            await Promise.all([
              import("./chunk-h2rjy0z4.js"),
              import("./chunk-tt9rxcw9.js"),
              import("./chunk-y36z1q7c.js"),
            ]);
          await o(await r(), t, e, n(e));
        }),
      ),
    enablePositionalOptions
      .command("login <name>")
      .description("Authenticate with an MCP server (HTTP, SSE, or claude.ai connector)")
      .option(
        "--no-browser",
        "Print the authorization URL instead of opening a browser (for SSH/headless sessions \u2014 paste the redirect URL back when prompted)",
      )
      .action(
        p(async (e, t, o) => {
          let [{ mcpLoginHandler: r }, { credentialsStoreFor: n }] = await Promise.all([
            import("./chunk-8vfr3s4c.js"),
            import("./chunk-y36z1q7c.js"),
          ]);
          await r(t, o, e, n(e));
        }),
      ),
    enablePositionalOptions
      .command("logout <name>")
      .description("Clear stored OAuth credentials for an MCP server")
      .action(
        p(async (e, t) => {
          let [{ mcpLogoutHandler: o }, { credentialsStoreFor: r }] = await Promise.all([
            import("./chunk-8vfr3s4c.js"),
            import("./chunk-y36z1q7c.js"),
          ]);
          await o(t, e, r(e));
        }),
      ),
    enablePositionalOptions
      .command("add-json <name> <json>")
      .description("Add an MCP server (stdio, SSE, HTTP, or WebSocket) with a JSON string")
      .option("-s, --scope <scope>", "Configuration scope (local, user, or project)", "local")
      .option("--client-secret", "Prompt for OAuth client secret (or set MCP_CLIENT_SECRET env var)")
      .action(
        p(async (e, t, o, r) => {
          let [{ mcpAddJsonHandler: n }, { createSubcommandRoot: u }] = await Promise.all([
            import("./chunk-h2rjy0z4.js"),
            import("./chunk-tt9rxcw9.js"),
          ]);
          return (await n(await u(), t, o, r, e), cliOkAfterAnalyticsFlush());
        }),
      ),
    enablePositionalOptions
      .command("add-from-claude-desktop")
      .description("Import MCP servers from Claude Desktop (Mac and WSL only)")
      .option("-s, --scope <scope>", "Configuration scope (local, user, or project)", "local")
      .action(
        p(async (e, t) => {
          let { mcpAddFromDesktopHandler: mcpAddFromDesktopHandler } = await import("./chunk-h2rjy0z4.js");
          await mcpAddFromDesktopHandler(t, e);
        }),
      ),
    enablePositionalOptions
      .command("reset-project-choices")
      .description("Reset all approved and rejected project-scoped (.mcp.json) servers within this project")
      .action(
        p(async (e) => {
          let [{ mcpResetChoicesHandler: t }, { createSubcommandRoot: o }] = await Promise.all([
            import("./chunk-h2rjy0z4.js"),
            import("./chunk-tt9rxcw9.js"),
          ]);
          return (await t(await o(), e), cliOkAfterAnalyticsFlush());
        }),
      ));
}
