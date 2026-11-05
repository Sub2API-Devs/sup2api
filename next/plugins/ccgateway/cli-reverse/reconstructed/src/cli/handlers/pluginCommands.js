/**
 * cli/handlers/pluginCommands.ts
 *
 * 2.1.316 新增：注册 claude plugin 命令组（init/install/list/validate/marketplace 等子命令与 --cowork 选项）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-k66m6195.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { Option, Help } from "../../../vendor/commander/esm.mjs";
import { createHelpConfig } from "../helpFormat.js";
import { waitForOAuthRefreshUntilDeadlineAtExit } from "../../utils/auth/oauthRefreshExitWait.js";
import { readResultNonce_2 } from "../../services/plugins/pluginCliCommands.js";
import {
  isPluginMutationCommand,
  awaitPluginPolicyColdStart,
} from "../../utils/plugins/pluginPolicyColdStart.js";
import { isTerminalShutdown, heldUntilExit } from "../../utils/terminalShutdown.js";
import {
  unansweredSecuritySettingsDialog,
  APPROVAL_NOT_ASKED_EXIT_MESSAGE,
  REJECTED_EXIT_MESSAGE,
} from "../../services/remoteManagedSettings/securityCheck.js";
import { cliErrorAfterAnalyticsFlush, cliOkAfterAnalyticsFlush, cliError, cliOk } from "../exit.js";
import { armHelperGateExit } from "../../utils/settings/policyHelperGate.js";
import { PLUGIN_SUBCOMMANDS } from "./plugins.js";
import { PLUGIN_COMPONENT_KINDS } from "./pluginScaffold.js";
import { withTimeout } from "../../utils/sleep.js";
import { shardedSnowflakeOff } from "../../utils/plugins/pluginGates.js";
import { parseIntLoose } from "../../utils/envUtils.js";
import { areHooksModulesActiveGbc } from "../../services/analytics/growthbookCredentials.js";
import { joined } from "./modCommands.js";
import { setUseCoworkPlugins } from "../../bootstrap/state.js";
import { VALID_INSTALLABLE_SCOPES, VALID_UPDATE_SCOPES } from "../../services/plugins/pluginOperations.js";

//@ chunk-k66m6195.js:19375-38164 placement
/**
 * 注册 claude plugin 命令组（init/install/list/validate/marketplace 等子命令与 --cowork 选项）。
 */
function registerPluginCommands(program, withStorage, withStorageAndCredentials) {
  let coworkOption = () => new Option("--cowork", "Use cowork_plugins directory").hideHelp();
  let pluginCommand = program
    .command("plugin")
    .alias("plugins")
    .description("Manage Claude Code plugins")
    .configureHelp(createHelpConfig());
  pluginCommand.hook("preAction", async (thisCommand, actionCommand) => {
    waitForOAuthRefreshUntilDeadlineAtExit();
    readResultNonce_2();
    if (isPluginMutationCommand(actionCommand) && !(await awaitPluginPolicyColdStart())) {
      if (!isTerminalShutdown())
        switch (unansweredSecuritySettingsDialog()) {
          case "not_asked":
            return cliErrorAfterAnalyticsFlush(APPROVAL_NOT_ASKED_EXIT_MESSAGE);
          case "closed_unanswered":
          case null:
            return cliErrorAfterAnalyticsFlush(REJECTED_EXIT_MESSAGE);
        }
      armHelperGateExit();
      return heldUntilExit();
    }
  });
  pluginCommand
    .command("init <name>")
    .aliases(PLUGIN_SUBCOMMANDS.init.aliases)
    .description(PLUGIN_SUBCOMMANDS.init.description)
    .option("--description <text>", "Manifest description")
    .option("--author <name>", "Author name (default: git config user.name)")
    .option("--author-email <email>", "Author email (default: git config user.email)")
    .option("--with <components...>", `Also scaffold: ${PLUGIN_COMPONENT_KINDS.join(", ")}`)
    .option("-f, --force", "Overwrite an existing .claude-plugin/ at the target")
    .action(
      withStorage(async (storage, name, options) => {
        let [{ pluginInitHandler }, { createSubcommandRoot }] = await Promise.all([
          import("./plugins.js"),
          import("./util.js"),
        ]);
        await pluginInitHandler(await createSubcommandRoot(), name, options, storage);
      }),
    );
  pluginCommand
    .command("validate <path>")
    .description(PLUGIN_SUBCOMMANDS.validate.description)
    .option(
      "--strict",
      "Treat warnings as errors (exit 1). Use in CI to fail on unrecognized fields, missing metadata, and other issues that the runtime tolerates.",
    )
    .option("--json", "Output the validation report as JSON (same exit codes)")
    .addOption(coworkOption())
    .addOption(
      new Option(
        "--profile <name>",
        "Also exit 1 when the plugin directory (the catalog that plugins are submitted to) would refuse a submission of the plugin on a check this command runs, such as a missing README, or when such a check could not be made: plugin.json lists more than 16 files for MCP servers or for hooks (16 of each are checked), or an MCP or hooks file is one these checks cannot use, such as one that is not valid JSON. With --strict, also fail on its warnings. The directory runs more checks.",
      ).choices(["directory"]),
    )
    .action(async (path, options) => {
      let [{ pluginValidateHandler }, { createSubcommandRoot }] = await Promise.all([
        import("./plugins.js"),
        import("./util.js"),
      ]);
      await pluginValidateHandler(createSubcommandRoot, path, options);
    });
  pluginCommand
    .command("tag [path]")
    .description(PLUGIN_SUBCOMMANDS.tag.description)
    .option("--push", "Push the tag to --remote after creating it")
    .option("--dry-run", "Print what would be tagged without creating it")
    .option("-f, --force", "Skip the dirty-working-tree and tag-already-exists checks")
    .option("-m, --message <msg>", "Tag annotation message (use %s for the version)")
    .option("--remote <name>", "Remote to push to with --push", "origin")
    .action(async (path, options) => {
      let [{ pluginTagHandler }, { createSubcommandRoot }] = await Promise.all([
        import("./plugins.js"),
        import("./util.js"),
      ]);
      await pluginTagHandler(await createSubcommandRoot(), path, options);
    });
  pluginCommand
    .command("list")
    .description(PLUGIN_SUBCOMMANDS.list.description)
    .option("--json", "Output as JSON")
    .option("--available", "Include available plugins from marketplaces (requires --json)")
    .option(
      "--data-size [plugin]",
      "Measure each installed plugin's saved data directory, or only the named plugin's (requires --json)",
    )
    .addOption(coworkOption())
    .action(
      withStorageAndCredentials(async (storage, options, credentials) => {
        let [{ pluginListHandler }, { createSubcommandRoot }] = await Promise.all([
          import("./plugins.js"),
          import("./util.js"),
        ]);
        await pluginListHandler(createSubcommandRoot, credentials, storage, options);
        return cliOkAfterAnalyticsFlush();
      }),
    );
  let ensureModulesGate = async () => {
    {
      let { initializeGrowthBook } = await import("../../services/analytics/ATIS_REQUEST_HEADER.lazy.js");
      await withTimeout(initializeGrowthBook(), 3000, "feature settings fetch timed out").catch(() => {});
    }
    if (!shardedSnowflakeOff()) cliError("`plugin eval` is currently unavailable");
  };
  let evalCommand = pluginCommand
    .command("eval [target]")
    .description(PLUGIN_SUBCOMMANDS.eval.description)
    .option("--case <glob>", "Filter cases by name glob")
    .option("--tag <tag...>", "Filter cases by tag (repeatable)")
    .option("--runs <n>", "Override per-case runs (default: case.runs ?? 3)")
    .option(
      "-j, --concurrency <n>",
      "Run up to <n> agent runs at once (1-8; default 1). Each run is a full claude child on your own credential, so they share one rate limit; results and the report keep case order",
    )
    .option("--model <model>", "Override model for all cases")
    .option("--judge-model <model>", "Override LLM-grader model (default: haiku)")
    .option(
      "--max-cost-usd <usd>",
      "Optional hard cost ceiling; abort and report partial results if hit (exit 2). " +
        "The ceiling is checked before each run launches, so overrun is bounded to the runs in flight (one, or up to --concurrency) \u2014 when a run breaches, paid graders (llm/baseline) are skipped while free graders still score it. " +
        "Runs are already bounded by max_turns and timeout_seconds \u2014 only set this when you need a strict budget",
    )
    .option(
      "--output-dir <dir>",
      "Directory for aggregate-result.json (default: ./<eval dir>/results/<timestamp>/)",
    )
    .option(
      "--eval-dir <dir>",
      "Directory name (below the plugin) that holds the eval cases; results go to <plugin>/<dir>/results/ \u2014 for an installed-plugin target, ./<dir>/results/ with this flag, else ./evals/results/ (default dir: the manifest's experimental.evals value, else evals/)",
    )
    .option(
      "--json [path]",
      "Print the full run result (prompts, graders, per-run scores) as JSON to stdout, or write it to this .json file",
    )
    .option("--threshold <0..1>", "Exit 1 if any case score is below this threshold (default: 1.0)")
    .option(
      "--allow-tools <tools...>",
      "Operator grant for gated tools (Bash, Write, Edit, WebFetch, mcp__*). Supports Tool(pattern:*) syntax",
    )
    .option(
      "--disallow-tools <tools...>",
      "Built-in tools to keep from Claude in every case, even if granted (e.g. Agent TaskStop)",
    )
    .option(
      "--scaffold",
      "Run each case's scaffold_script (runs author-supplied bash as you; off by default \u2014 only use on case files you authored)",
    )
    .option("--no-scaffold", "Explicitly skip scaffold_script")
    .option(
      "--trust-plugin",
      "Assert that you trust this plugin's code and eval suite, and skip the first-run trust prompt (for CI; like --dangerously-skip-permissions, only pass it for plugins you would run yourself). Does not imply --scaffold, --allow-tools or --mocks off",
    )
    .option(
      "--ablation <mode>",
      "Run a no-plugin baseline arm and report the score delta (none | with-without; default: with-without whenever a plugin resolves \u2014 by name, or from the target path \u2014 and none when nothing does; under with-without, graders marked with-only, incl. `tool_used: Skill`, are a plugin-fired indicator rather than part of the score)",
    )
    .option(
      "--mocks <mode>",
      "Mock stand-ins for MCP servers, from <eval dir>/mocks/ (record | off; default: record). record: a plugin server with no mock is NOT started (see --allow-real-servers); off: no stand-ins, every real server starts (as you, outside the OS sandbox), its tools gated by --allow-tools",
    )
    .option(
      "--allow-real-servers",
      "With --mocks record: also start the plugin's REAL MCP server processes for servers that have no mock (they run as you, outside the OS sandbox that confines shell tools; use only on plugins you trust)",
    )
    .option("--keep-temp", "Preserve scaffold dirs for debugging")
    .option("--verbose", "Log per-message trace events to the debug log (use --debug-file to read them)")
    .option(
      "--report <path>",
      "Write the self-contained HTML report (scores, prompts, grader verdicts) to <path> instead of the results dir",
    )
    .option(
      "--publish-report",
      "Also require publishing the report to claude.ai (already the default when your account supports it); explains why if unavailable",
    )
    .option("--no-publish", "Keep the HTML report local only; skip publishing it to claude.ai")
    .action(
      withStorageAndCredentials(async (storage, credentials, dir, options) => {
        await ensureModulesGate();
        if (
          options.ablation !== undefined &&
          options.ablation !== "none" &&
          options.ablation !== "with-without"
        )
          cliError('--ablation must be "none" or "with-without"');
        let { pluginEvalHandler } = await import("../../services/pluginEval/pluginEvalCommand.js");
        await pluginEvalHandler(
          dir,
          {
            ...options,
            runs: options.runs ? parseIntLoose(options.runs) : undefined,
            maxCostUsd: options.maxCostUsd ? parseFloat(options.maxCostUsd) : undefined,
            threshold: options.threshold ? parseFloat(options.threshold) : undefined,
            noScaffold: options.scaffold === undefined ? undefined : !options.scaffold,
            ablation: options.ablation,
          },
          storage,
          credentials,
        );
      }),
    );
  evalCommand
    .command("init [name]")
    .description(PLUGIN_SUBCOMMANDS.evalInit.description)
    .option(
      "--bare",
      "Write a blank template (prompt.md + graders/criteria.md) instead of running the interview",
    )
    .option(
      "-i, --interactive",
      "Run the authoring interview (already the default in a terminal); requires an interactive terminal",
    )
    .addOption(new Option("--interview", "Alias for --interactive").hideHelp())
    .option(
      "--eval-dir <dir>",
      "Directory (below the current directory) to write cases into (default: experimental.evals from the plugin.json in the current directory, else evals/)",
    )
    .action(
      withStorage(async (storage, name, options) => {
        await ensureModulesGate();
        let { pluginEvalInitHandler } = await import("../../services/pluginEval/pluginEvalCommand.js");
        await pluginEvalInitHandler(
          name,
          {
            bare: options.bare,
            forceInteractive: options.interactive || options.interview,
            evalDir: options.evalDir ?? evalCommand.opts().evalDir,
          },
          storage,
        );
        cliOk();
      }),
    );
  let testCommand = pluginCommand
    .command("test [dir]", {
      hidden: true,
    })
    .description(PLUGIN_SUBCOMMANDS.test.description)
    .allowUnknownOption()
    .allowExcessArguments(true)
    .configureHelp({
      formatHelp: () => (areHooksModulesActiveGbc() ? joined : reparseWithTest(pluginCommand.args)),
    })
    .action(() =>
      areHooksModulesActiveGbc()
        ? cliError(
            `claude plugin test: not run from this spelling. Use \`claude ${PLUGIN_SUBCOMMANDS.test.usage}\`, with no options before \`plugin\``,
          )
        : reparseWithTest(["--", ...pluginCommand.args]),
    );
  function reparseWithTest(argv) {
    Object.assign(pluginCommand, {
      commands: pluginCommand.commands.filter((command) => command !== testCommand),
    });
    pluginCommand.parse(argv, {
      from: "user",
    });
    return cliError();
  }
  pluginCommand.configureHelp({
    ...pluginCommand.configureHelp(),
    visibleCommands(cmd) {
      let commands = Help.prototype.visibleCommands.call(this, cmd);
      if (cmd !== pluginCommand || !areHooksModulesActiveGbc()) return commands;
      return [...commands, testCommand].sort((leftCommand, b) => leftCommand.name().localeCompare(b.name()));
    },
  });
  pluginCommand
    .command("details <name>")
    .description(PLUGIN_SUBCOMMANDS.details.description)
    .addOption(coworkOption())
    .action(
      withStorageAndCredentials(async (storage, credentials, target, options) => {
        let [{ pluginDetailsHandler }, { createSubcommandRoot }] = await Promise.all([
          import("./plugins.js"),
          import("./util.js"),
        ]);
        await pluginDetailsHandler(createSubcommandRoot, target, options, storage, credentials);
        return cliOkAfterAnalyticsFlush();
      }),
    );
  let marketplaceCommand = pluginCommand
    .command("marketplace")
    .description("Manage Claude Code marketplaces")
    .configureHelp(createHelpConfig());
  marketplaceCommand
    .command("add <source>")
    .description(PLUGIN_SUBCOMMANDS.marketplaceAdd.description)
    .addOption(coworkOption())
    .option(
      "--sparse <paths...>",
      "Limit checkout to specific directories via git sparse-checkout (for monorepos). Example: --sparse .claude-plugin plugins",
    )
    .option("--scope <scope>", "Where to declare the marketplace: user (default), project, or local")
    .option(
      "--claudeai",
      "Add the marketplace of this name that claude.ai hosts for you, by its listed name or its local name (see: claude plugin marketplace list)",
    )
    .addOption(
      new Option(
        "--from-link",
        'For a program adding a marketplace from an install link: adds it as the install link does, then prints one JSON line, {"name": "<marketplace>", "added": true|false}, or before failing {"refused": {"kind": "<kind>", "name": "<name>", "folder"?: "<path>", "requested"?: "<another spelling of name>"}}',
      ).hideHelp(),
    )
    .addOption(
      new Option(
        "--resolve-only",
        'With --from-link (not with --sparse or --scope): adds nothing and prints one JSON line, {"existing": "<marketplace>"} naming the added marketplace --from-link would reuse for this source, or {"existing": null} when it would reuse none',
      ).hideHelp(),
    )
    .option("--json", "Print one machine-readable result line as the last line on stdout (same exit codes)")
    .action(
      withStorageAndCredentials(async (storage, credentials, source, options) => {
        let [{ marketplaceAddHandler }, { createSubcommandRoot }] = await Promise.all([
          import("./plugins.js"),
          import("./util.js"),
        ]);
        await marketplaceAddHandler(await createSubcommandRoot(), source, options, storage, credentials);
      }),
    );
  marketplaceCommand
    .command("list")
    .description(PLUGIN_SUBCOMMANDS.marketplaceList.description)
    .option("--json", "Output as JSON")
    .addOption(coworkOption())
    .action(
      withStorage(async (storage, options) => {
        let [{ marketplaceListHandler }, { createSubcommandRoot }] = await Promise.all([
          import("./plugins.js"),
          import("./util.js"),
        ]);
        await marketplaceListHandler(createSubcommandRoot, options, storage);
        return cliOkAfterAnalyticsFlush();
      }),
    );
  marketplaceCommand
    .command("remove <name>")
    .aliases(PLUGIN_SUBCOMMANDS.marketplaceRemove.aliases)
    .description(PLUGIN_SUBCOMMANDS.marketplaceRemove.description)
    .option(
      "--scope <scope>",
      "Remove the marketplace declaration from a specific settings scope: user, project, or local. Omit to remove it from every scope.",
    )
    .option("--json", "Print one machine-readable result line as the last line on stdout (same exit codes)")
    .addOption(coworkOption())
    .action(
      withStorage(async (storage, name, options) => {
        let [{ marketplaceRemoveHandler }, { createSubcommandRoot }] = await Promise.all([
          import("./plugins.js"),
          import("./util.js"),
        ]);
        await marketplaceRemoveHandler(await createSubcommandRoot(), name, options, storage);
        return cliOkAfterAnalyticsFlush();
      }),
    );
  marketplaceCommand
    .command("update [name]")
    .description(PLUGIN_SUBCOMMANDS.marketplaceUpdate.description)
    .option(
      "--json",
      "With a marketplace name: print one machine-readable result line as the last line on stdout (same exit codes)",
    )
    .addOption(coworkOption())
    .action(
      withStorage(async (storage, name, options) => {
        let [{ marketplaceUpdateHandler }, { createSubcommandRoot }] = await Promise.all([
          import("./plugins.js"),
          import("./util.js"),
        ]);
        await marketplaceUpdateHandler(await createSubcommandRoot(), name, options, storage);
      }),
    );
  let installCommand = pluginCommand
    .command("install <plugin>")
    .aliases(PLUGIN_SUBCOMMANDS.install.aliases)
    .description(PLUGIN_SUBCOMMANDS.install.description)
    .option("-s, --scope <scope>", "Installation scope: user, project, or local", "user")
    .option(
      "--config <key=value>",
      "Set a userConfig option declared in the plugin's manifest, or a bundled .mcpb server's own user_config field as <server>.<key>=<value> (a bare key works when only one bundled server declares it). Repeatable. Values are validated against the schema and stored via the same path as the interactive /plugin configure flow.",
      (value, previous = []) => [...previous, value],
    )
    .option(
      "-y, --yes",
      "Accept the displayed marketplace-declared command without the confirmation prompt \u2014 a plugin installed by running a command, or one whose archive is fetched through a headersHelper command (required when stdin or stdout is not a TTY)",
    )
    .addOption(
      new Option(
        "--accept-command <sha256>",
        "Accept the marketplace-declared command (a command-source install, or the headersHelper that fetches the archive) whose sha256 a previous --json run reported as shownCommand.sha256; counts as -y for exactly that command, for that plugin and marketplace catalog, and nothing else. If either changed (a refresh that moved the catalog counts), the run refuses and reports the command again, to be shown to a person again",
      ).conflicts("yes"),
    );
  installCommand.addOption(
    new Option(
      "--replace",
      "If this plugin is already installed from another marketplace, switch to this copy: install it, carry your plugin settings over, and uninstall the other. Only between Anthropic Directory and Anthropic's official marketplaces",
    ).hideHelp(true),
  );
  installCommand
    .option(
      "--json",
      "Print one machine-readable result line on stdout instead of the human message (same exit codes; a marketplace-declared command is still shown and must be confirmed \u2014 pass -y when not interactive)",
    )
    .option(
      "--registry <url>",
      "For a <package>@npm install: resolve and download from this npm registry instead of the one your npm configuration selects",
    )
    .option(
      "--marketplace <source>",
      "Install <plugin> (its bare name) from the marketplace at this source: owner/repo, a git or https URL, or a path. A marketplace not added yet is added first, in user settings, under the same checks as 'plugin marketplace add'",
    )
    .addOption(coworkOption())
    .action(
      withStorageAndCredentials(async (storage, credentials, plugin, options, command) => {
        let { marketplace, ...installOptions } = options;
        if (marketplace !== undefined) {
          let [{ pluginInstallFromSourceHandler }, { createSubcommandRoot }] = await Promise.all([
            import("./pluginInstallFromSourceHandler.lazy.js"),
            import("./util.js"),
          ]);
          if (installOptions.cowork) setUseCoworkPlugins(true);
          await pluginInstallFromSourceHandler(
            createSubcommandRoot,
            {
              plugins: command.args,
              marketplaceSource: marketplace,
              options: installOptions,
            },
            {
              storageV5: storage,
              credentials,
            },
          );
          return;
        }
        let [{ pluginInstallHandler }, { createSubcommandRoot }] = await Promise.all([
          import("./plugins.js"),
          import("./util.js"),
        ]);
        await pluginInstallHandler(createSubcommandRoot, plugin, options, storage);
      }),
    );
  pluginCommand
    .command("uninstall <plugin>")
    .aliases(PLUGIN_SUBCOMMANDS.uninstall.aliases)
    .description(PLUGIN_SUBCOMMANDS.uninstall.description)
    .option("-s, --scope <scope>", "Uninstall from scope: user, project, or local", "user")
    .option("--keep-data", "Preserve the plugin's persistent data directory (~/.claude/plugins/data/{id}/)")
    .option(
      "--prune",
      "Also remove auto-installed dependencies that are no longer needed (requires -y in non-interactive contexts)",
    )
    .option("-y, --yes", "Skip the --prune confirmation prompt (required when stdin or stdout is not a TTY)")
    .option(
      "--json",
      "Print one machine-readable result line on stdout instead of the human message (same exit codes; not with --prune)",
    )
    .addOption(coworkOption())
    .action(
      withStorage(async (storage, plugin, options) => {
        let [{ pluginUninstallHandler }, { createSubcommandRoot }] = await Promise.all([
          import("./plugins.js"),
          import("./util.js"),
        ]);
        await pluginUninstallHandler(createSubcommandRoot, plugin, options, storage);
      }),
    );
  pluginCommand
    .command("prune")
    .aliases(PLUGIN_SUBCOMMANDS.prune.aliases)
    .description(PLUGIN_SUBCOMMANDS.prune.description)
    .option("-s, --scope <scope>", "Prune at scope: user, project, or local", "user")
    .option("--dry-run", "List what would be removed without removing")
    .option("-y, --yes", "Skip the confirmation prompt (required when stdin or stdout is not a TTY)")
    .addOption(coworkOption())
    .action(
      withStorage(async (storage, options) => {
        let [{ pluginPruneHandler }, { createSubcommandRoot }] = await Promise.all([
          import("./plugins.js"),
          import("./util.js"),
        ]);
        await pluginPruneHandler(await createSubcommandRoot(), options, storage);
      }),
    );
  pluginCommand
    .command("enable <plugin>")
    .description(PLUGIN_SUBCOMMANDS.enable.description)
    .option(
      "-s, --scope <scope>",
      `Installation scope: ${VALID_INSTALLABLE_SCOPES.join(", ")} (default: auto-detect)`,
    )
    .option(
      "--json",
      "Print one machine-readable result line on stdout instead of the human message (same exit codes)",
    )
    .addOption(coworkOption())
    .action(
      withStorage(async (storage, plugin, options) => {
        let [{ pluginEnableHandler }, { createSubcommandRoot }] = await Promise.all([
          import("./plugins.js"),
          import("./util.js"),
        ]);
        await pluginEnableHandler(createSubcommandRoot, plugin, options, storage);
      }),
    );
  pluginCommand
    .command("disable [plugin]")
    .description(PLUGIN_SUBCOMMANDS.disable.description)
    .option("-a, --all", "Disable all enabled plugins")
    .option(
      "-s, --scope <scope>",
      `Installation scope: ${VALID_INSTALLABLE_SCOPES.join(", ")} (default: auto-detect)`,
    )
    .option(
      "--json",
      "Print one machine-readable result line on stdout instead of the human message (same exit codes)",
    )
    .addOption(coworkOption())
    .action(
      withStorage(async (storage, plugin, options) => {
        let [{ pluginDisableHandler }, { createSubcommandRoot }] = await Promise.all([
          import("./plugins.js"),
          import("./util.js"),
        ]);
        await pluginDisableHandler(createSubcommandRoot, plugin, options, storage);
      }),
    );
  pluginCommand
    .command("update <plugin>")
    .description(PLUGIN_SUBCOMMANDS.update.description)
    .option(
      "-s, --scope <scope>",
      `Installation scope: ${VALID_UPDATE_SCOPES.join(", ")} (default: auto-detect)`,
    )
    .option(
      "-y, --yes",
      "Accept the displayed marketplace-declared command without the confirmation prompt \u2014 a changed install command, or the headersHelper command that fetches its archive (required when stdin or stdout is not a TTY)",
    )
    .addOption(
      new Option(
        "--accept-command <sha256>",
        "Accept the marketplace-declared command (a command-source install, or the headersHelper that fetches the archive) whose sha256 a previous --json run reported as shownCommand.sha256; counts as -y for exactly that command, for that plugin and marketplace catalog, and nothing else. If either changed (a refresh that moved the catalog counts), the run refuses and reports the command again, to be shown to a person again",
      ).conflicts("yes"),
    )
    .option(
      "--json",
      "Print one machine-readable result line on stdout instead of the human message (same exit codes; a marketplace-declared command is still shown and must be confirmed \u2014 pass -y when not interactive)",
    )
    .addOption(coworkOption())
    .action(
      withStorage(async (storage, plugin, options) => {
        let { pluginUpdateHandler } = await import("./plugins.js");
        await pluginUpdateHandler(plugin, options, storage);
      }),
    );
  pluginCommand
    .command("configure <plugin>")
    .description(PLUGIN_SUBCOMMANDS.configure.description)
    .option("--json", "Output as JSON")
    .option(
      "--values-stdin",
      "Read option values from stdin as a JSON object of single-line strings; options left out keep their values",
    )
    .addOption(coworkOption())
    .action(
      withStorageAndCredentials(async (storage, credentials, plugin, options) => {
        let { pluginConfigureHandler } = await import("./plugins.js");
        await pluginConfigureHandler(plugin, options, storage, credentials);
      }),
    );
}
export { registerPluginCommands };
