/**
 * cli/handlers/plugins.ts
 *
 * 并入旧版已有路径：plugin 子命令（init/validate/tag、从 marketplace 安装）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/handlers/plugins.ts
 * pieces: chunk-6g88e2yt.js (2), chunk-jdfzheem.js (65), chunk-zde45n7x.js (2)
 * attribution: placement 20, facade-exports 20, layout 19, fingerprint 2, affinity 1, file-local 1, sole-consumer 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, relative, resolve } from "path";
import { shardedSnowflakeOff } from "../../utils/plugins/pluginGates.js";
import { areHooksModulesActive } from "../../services/analytics/growthbookCredentials.js";
import {
  init_react_production,
  use,
  suspenseTypeExport,
} from "../../../vendor/react/cjs/react.production.js";
import { resolvePluginSourceLocation } from "../../utils/plugins/pluginSourceResolution.js";
import {
  writeStdoutAndDrain,
  flushAnalyticsBeforeExit,
  cliError,
  exitAfterAnalyticsFlush,
  cliErrorAfterAnalyticsFlush,
  printCliError,
} from "../exit.js";
import { escapeControlChars } from "../../utils/resultError.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import {
  readResultNonce,
  classifyPluginCommandError,
  settingsFileWarning,
  writePluginResult,
  withConfirmationDigest,
  handlePluginCommandError,
  PluginOperationFailedError,
  checkCommandSourceSwitch,
  resolveInstallTarget,
  installPlugin,
  uninstallPlugin,
  prunePluginsCli,
  resolvePluginArgument,
  withSettingsWarning,
  disableAllPlugins,
  disablePlugin,
  updatePluginCli,
} from "../../services/plugins/pluginCliCommands.js";
import {
  MarketplaceError,
  getMarketplaceFailureCode,
  formatRefreshFailedMessage,
  marketplaceUpdateIcon,
  withMarketplaceFailureCode,
} from "../../utils/plugins/marketplaceErrors.js";
import {
  reservedMarketplaceNameMessage,
  isMarketplaceLoadError,
  RELOAD_PLUGINS_HINT,
  marketplaceNotFoundMessage,
  directoryBlockedMessage,
} from "../../utils/plugins/marketplaceNames.js";
import { CommandSourceError } from "../../utils/plugins/commandSource.js";
import {
  logFeatureSadAsync,
  logFeatureBadAsync,
  logFeatureOkAsync,
  logFeatureSad,
} from "../../services/analytics/featureTelemetry.js";
import {
  marketplacesRefusedByPolicyClause,
  areLocalPluginDirsAllowedByPolicy,
  localPluginDirsBlockedMessage,
  pluginDirectoryPolicyBlock,
  pluginDirectoryPolicyBlockHint,
  isSourceAllowedByPolicy,
  isListingRepositoryBlockedByHostPolicy,
} from "../../utils/plugins/marketplacePolicy.js";
import {
  displayMarketplaceName,
  groupBySource,
  markFromPluginDirectory,
  allowlistedInstalledPlugins,
  pluginInstallPath,
  userConfigFieldParser,
  pluginUserConfigValues,
} from "../../utils/plugins/pluginDisplayMetadata.js";
import { plural, nfcLower } from "../../utils/stringUtils.js";
import {
  OFFICIAL_MARKETPLACE_DISPLAY,
  isOfficialMarketplaceName_2,
  reservedNameMessage,
  OFFICIAL_MARKETPLACE_NAME,
  isPluginDirectorySource,
  isOfficialMarketplaceSpelling,
  removedMarketplaceMessage,
  blockedPluginsNotice,
  formatPluginDirectoryBlockedMessage,
} from "../../utils/plugins/officialMarketplaceNames.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  stripInvisibleKeepNewlines,
  stripInvisibleKeepEmoji,
} from "../../utils/settings/marketplaceSettingsAliases.js";
import {
  errorMessage,
  isFsInaccessible,
  withTelemetryMessage,
  toError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import {
  printableName,
  printableOrEmpty,
  printableLabel,
  quotedPrintable,
  printableMessage,
} from "../../utils/printableName.js";
import { setUseCoworkPlugins } from "../../bootstrap/state.js";
import {
  resolveValidateTarget,
  sanitizeForDisplay,
  summarizeValidationResults,
  validateManifestForDisplay,
  PLUGIN_ID_PART_RULE_TEXT,
} from "../../utils/plugins/validatePlugin.js";
import { logError } from "../../utils/log.js";
import { readmeAdviceFor, formatAdviceLines } from "../../services/plugins/pluginReadmeAdvice.js";
import { renderAndRun_2 } from "../../interactiveHelpers.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import {
  tagPluginRelease,
  formatTagName,
  createPluginGitTag,
  matchesPluginSource,
  sameSourceAndName,
  sameSourceAndNameAlt,
} from "../../services/plugins/pluginTag.js";
import { RenderOnceAndExit } from "../../utils/staticRender.js";
import {
  pluginNameProblem,
  PLUGIN_COMPONENT_KINDS,
  pluginManifestTemplate,
  scaffoldPlugin,
} from "./pluginScaffold.js";
import { tildify } from "../../utils/path.js";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
import { gitUserName, getGitEmail } from "../../services/analytics/growthbook.js";
import {
  SKILLS_DIR,
  BUILTIN,
  INLINE_PLUGIN_MARKETPLACE,
  SYNCED,
  marketplaceForTelemetry,
  logPluginLoadErrors,
} from "../../utils/telemetry/pluginTelemetry.js";
import { getSettings_DEPRECATED } from "../../utils/settings/settings.js";
import { policyEnabledPluginNameSet } from "../../utils/plugins/pluginPolicy.js";
import {
  loadKnownMarketplacesSafe,
  loadKnownMarketplacesWithDeclared,
  getPluginDirectoryState,
  setPluginDirectoryEnabled,
  persistPluginDirectoryChoice,
  addMarketplaceSource,
  saveMarketplaceToSettings,
  findMarketplaceBySourceLoose,
  getMarketplaceCacheOnly,
  isImpersonatingOfficialMarketplace,
  removeMarketplaceWithReservedSiblings,
  refreshMarketplaceDeduped,
  refreshAllMarketplaces,
  loadPluginDirectoryMarketplace,
  PLUGIN_DIRECTORY_CATALOG_MISSING,
  PluginDirectoryCatalogMissingError,
} from "../../utils/plugins/marketplaceManager.js";
import {
  parsePluginIdentifier,
  isOfficialMarketplace,
  scopeToSettingSource,
  isOfficialMarketplaceName_3,
  parsePluginId,
  joinPluginId,
  pluginNamesEqual,
  marketplaceSuffix,
  marketplaceOf,
  isRequiredPlugin,
} from "../../utils/plugins/pluginIdentifier.js";
import { claudeCommand, isSafeCliArg } from "../../utils/worktreeResumeHint.js";
import { isPluginCommandContext } from "../../utils/plugins/pluginPolicyColdStart.js";
import { logEvent, logEventAsync } from "../../services/analytics/index.js";
import {
  getInstalledPluginsAsync,
  isPluginInstalled,
  getInstalledListRefusal,
  readInstalledPluginsFile,
  listSetAsideFiles,
  listUnreadableKeptFiles,
  isInstallationRelevantToCurrentProject,
} from "../../utils/plugins/installedPluginsManager.js";
import { ensureSyncedPluginDirsRegistered } from "../../utils/claudeAiSync/pluginsSync.js";
import { loadAllPlugins, displaySkillsDirPath } from "../../utils/plugins/pluginLoader.js";
import { isSyncWanted } from "../../services/plugins/accountSync/syncedPluginHooks.js";
import { pluginErrorText } from "../../types/plugin.js";
import { pluginWarningText } from "../../utils/plugins/pluginComponentConflicts.js";
import {
  isPluginEnabledAtProjectScope,
  VALID_INSTALLABLE_SCOPES,
  logInstallRefreshFirst,
  replaceNeedsFullIdMessage,
  enablePluginOp,
  VALID_UPDATE_SCOPES,
} from "../../services/plugins/pluginOperations.js";
import { getPluginDataDirSize } from "../../utils/plugins/pluginDirectories.js";
import {
  loadPluginMcpServersFromSources,
  hasPluginUserConfig,
} from "../../utils/plugins/mcpPluginIntegration.js";
import { getUniqueInstallCounts } from "../../utils/plugins/installCounts.js";
import {
  loadMarketplacesWithErrors,
  formatPluginId,
  describeMarketplaceSourceReplaced,
  redactUrlForDisplay,
} from "../../utils/plugins/marketplaceHelpers.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  logMarketplaceAddFailed,
  logDirectoryBlockedOnce,
  logDirectoryToggle,
} from "../../utils/plugins/pluginDirectoryTelemetry.js";
import { refreshPluginCaches } from "../../utils/plugins/cacheUtils.js";
import { parseDeepLinkMarketplace } from "../../utils/deepLink/parseDeepLink.js";
import { parseMarketplaceInput } from "../../utils/plugins/parseMarketplaceInput.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";
import { fromEnum, lit, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { shortHash } from "../../utils/shortHash.js";
import { resolveMissingDependencies } from "../../utils/plugins/dependencyInstall.js";
import { formatDependencyCountSuffix } from "../../utils/plugins/dependencyResolver.js";
import { settingsSourceName } from "../../utils/settings/settingsSourceTrust.js";
import {
  listClaudeAiMarketplaces,
  ClaudeAiMarketplaceError,
  findAccountMarketplaceByName,
  addClaudeAiMarketplace,
  describeMarketplaceFreshness,
  accountMarketplaceLabel,
  formatMarketplaceScopeLabel,
  filterUnaddedClaudeAiMarketplaces,
  readClaudeAiMarketplaceRegistry,
  isClaudeAiMarketplaceSource,
  ensureClaudeAiMarketplace,
  formatClaudeAiMarketplaceLabel,
  formatGitSourceSpec,
  noCliNameLabel,
} from "../../utils/plugins/claudeAiMarketplaces.js";
import { REDACTED_URL } from "../../utils/redaction/urlRedaction.js";
import { commandSourceSession } from "../../utils/plugins/commandSourceErrors.js";
import {
  isAsciiImpersonatingOfficialName,
  isValidPluginIdSegment,
  isReservedMarketplaceName,
} from "../../utils/plugins/schemas.js";
import { listReservedNameRefusals } from "../../utils/plugins/marketplaceSources.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { SuccessLine } from "../../buddy/CompanionSprite.js";
import { pluginTelemetryFields } from "../../utils/telemetry/pluginTelemetryName.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { getPluginDisplayName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { iterateStreamUntilClose } from "../../utils/process.js";
import {
  marketplaceSource,
  loadPluginOptions,
  savePluginOptions,
  findMarketplace,
  getUnconfiguredOptions,
} from "../../utils/plugins/pluginOptionsStorage.js";
import { getOwn } from "../../utils/objectSafety.js";
import { truthyOrFalsyEnv, parseBoundedNumber, getFormatHint } from "../../utils/plugins/pluginConfigEnv.js";
import { buildFinalValues } from "../../commands/plugin/PluginOptionsDialog.js";
import { validateUserConfig } from "../../utils/plugins/mcpbHandler.js";
import { trustedPluginSetting } from "../../utils/plugins/pluginConfigSources.js";
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { validateMarketplaceInstallArgs } from "../../commands/plugin/parseArgs.js";
import { classifyCommandSourceError } from "../../utils/plugins/headersHelper.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6g88e2yt.js:265-3494 placement
/**
 * plugin 子命令表（init/validate/tag 等）。
 */
var PLUGIN_SUBCOMMANDS = {
  init: {
    usage: "plugin init <name>",
    aliases: ["new"],
    description:
      "Scaffold a new plugin at ~/.claude/skills/<name>/ (auto-loads next session as <name>@skills-dir)",
  },
  validate: {
    usage: "plugin validate <path>",
    description:
      "Validate a plugin or marketplace manifest, or the skills, agents, and commands in a directory",
  },
  tag: {
    usage: "plugin tag [path]",
    description:
      "Create a {name}--v{version} git tag for a plugin release, validating that plugin.json and any enclosing marketplace entry agree",
  },
  list: {
    usage: "plugin list",
    description: "List installed plugins",
  },
  eval: {
    usage: "plugin eval [target]",
    description:
      "Run eval cases (<eval dir>/**/case.yaml or prompt.md + graders/*.md; the eval dir is evals/ unless --eval-dir or the manifest says otherwise) against a plugin and report scored results. " +
      "Target is a path, a plugin name, or a `plugin@marketplace` id \u2014 installed and skills-dir plugins both resolve (and add a no-plugin baseline arm). " +
      "It loads the plugin and runs its eval suite (prompts, graders; scaffold scripts and real MCP servers only when you opt in) on your machine, as you: only evaluate plugins you trust \u2014 the run's sandboxing limits what a malicious plugin can reach but is not a guarantee, and a bundled suite passing is not a security vetting. The first run in an untrusted plugin directory asks you to confirm (--trust-plugin answers for CI)",
    earlyAccess: "pluginEval",
  },
  evalInit: {
    usage: "plugin eval init [name]",
    description:
      "Author an eval suite under the eval dir (evals/ unless --eval-dir or the manifest says otherwise) via an interview that sources inputs and designs graders. Use --bare <name> for a blank single-case template.",
    earlyAccess: "pluginEval",
  },
  test: {
    usage: "plugin test [dir]",
    description: "Run a mod's tests",
    earlyAccess: "hooksModules",
  },
  details: {
    usage: "plugin details <name>",
    description: "Show a plugin's component inventory and projected token cost",
  },
  marketplaceAdd: {
    usage: "plugin marketplace add <source>",
    description: "Add a marketplace from a URL, path, or GitHub repo",
  },
  marketplaceList: {
    usage: "plugin marketplace list",
    description: "List all configured marketplaces",
  },
  marketplaceRemove: {
    usage: "plugin marketplace remove <name>",
    aliases: ["rm"],
    description: "Remove a configured marketplace",
  },
  marketplaceUpdate: {
    usage: "plugin marketplace update [name]",
    description: "Update marketplace(s) from their source - updates all if no name specified",
  },
  install: {
    usage: "plugin install <plugin>",
    aliases: ["i"],
    description:
      "Install a plugin from available marketplaces (use plugin@marketplace for specific marketplace)",
  },
  uninstall: {
    usage: "plugin uninstall <plugin>",
    aliases: ["remove", "rm"],
    description: "Uninstall an installed plugin",
  },
  prune: {
    usage: "plugin prune",
    aliases: ["autoremove"],
    description: "Remove auto-installed dependencies that are no longer needed",
  },
  enable: {
    usage: "plugin enable <plugin>",
    description: "Enable a disabled plugin",
  },
  disable: {
    usage: "plugin disable [plugin]",
    description: "Disable an enabled plugin",
  },
  update: {
    usage: "plugin update <plugin>",
    description: "Update a plugin to the latest version (restart required to apply)",
  },
  configure: {
    usage: "plugin configure <plugin>",
    description: "Show a plugin's options and which are unset, or save values from stdin with --values-stdin",
  },
};
//@ chunk-6g88e2yt.js:3494-3632 placement
/**
 * 列出当前可用的 plugin 子命令（按抢先体验开关过滤）。
 */
function listAvailablePluginSubcommands() {
  let flags = {
    pluginEval: shardedSnowflakeOff(),
    hooksModules: areHooksModulesActive(),
  };
  return Object.values(PLUGIN_SUBCOMMANDS).filter(
    (subcommand) => subcommand.earlyAccess === undefined || flags[subcommand.earlyAccess],
  );
}
//@ chunk-jdfzheem.js:2535-2539 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-jdfzheem.js:2535", () => {
  init_react_production();
});
//@ chunk-jdfzheem.js:2597-2649 placement
var installedVersionOf = (version, installed) =>
  version === undefined ? undefined : installed?.manifest.version;
//@ chunk-jdfzheem.js:2649-2797 placement
async function resolveLocalPluginFolder(pluginId, installed, options) {
  if (installed !== undefined) return installed.readFromFolderAt === undefined ? undefined : installed.path;
  let pluginSourceLocation = await resolvePluginSourceLocation(pluginId, options);
  return pluginSourceLocation.kind === "folder" ? pluginSourceLocation.path : undefined;
}
//@ chunk-jdfzheem.js:2797-2915 placement
async function resolvePluginVersions(paths, versionsByPath, options) {
  let results = await Promise.all(
    paths.map((path) => resolveLocalPluginFolder(path, versionsByPath.get(path), options)),
  );
  return new Map(paths.map((path, index) => [path, results[index]]));
}
//@ chunk-jdfzheem.js:2915-2989 placement
function displayVersion(version, installed, isFromPlugin) {
  return (isFromPlugin === undefined ? version : (installed?.manifest.version ?? version)) || "unknown";
}
//@ chunk-jdfzheem.js:2989-3050 placement
async function writeJsonLine(payload) {
  await writeStdoutAndDrain(
    escapeControlChars(
      jsonStringify({
        ...payload,
        nonce: readResultNonce(),
      }),
    ) +
      `
`,
  );
}
//@ chunk-jdfzheem.js:3050-3129 placement
function pluginErrorKind(error) {
  if (error instanceof MarketplaceError) return error.reason.kind;
  return getMarketplaceFailureCode(error) ?? classifyPluginCommandError(error);
}
//@ chunk-jdfzheem.js:3129-3238 placement
function declaredErrorLines(name, declaredInSettings) {
  return reservedMarketplaceNameMessage(name, {
    declaredInSettings,
  }).map((line, index) => `${index === 0 ? "    Error: " : "           "}${line}`);
}
//@ chunk-jdfzheem.js:3238-3349 placement
async function logPluginCommandFailure(eventName, error, code) {
  if (error instanceof CommandSourceError) await logFeatureSadAsync(eventName, "command_source_refused");
  else await logFeatureBadAsync(eventName, code);
  await flushAnalyticsBeforeExit();
}
//@ chunk-jdfzheem.js:3349-3781 placement
function marketplaceUpdateSummary(attempted, policyRefused, failed, skipped = 0, builtInSkipped = []) {
  let updatedCount = attempted - policyRefused.length - failed.length;
  let messages = [];
  if (policyRefused.length > 0)
    messages.push(
      marketplacesRefusedByPolicyClause(
        policyRefused.length,
        policyRefused.map((name) => displayMarketplaceName(name)),
      ),
    );
  if (failed.length > 0)
    messages.push(
      formatRefreshFailedMessage(
        failed.length,
        failed.map((name) => displayMarketplaceName(name)),
      ),
    );
  if (skipped > 0)
    messages.push(
      `${skipped} ${plural(skipped, "marketplace")} skipped (nothing to refresh: declared in settings, managed, or not allowed)`,
    );
  if (builtInSkipped.length > 0)
    messages.push(
      `${OFFICIAL_MARKETPLACE_DISPLAY} (built in) could not be refreshed and was skipped (see --debug)`,
    );
  return {
    messages,
    summary: pluginUpdateSummary(updatedCount, policyRefused.length, failed.length),
  };
}
//@ chunk-jdfzheem.js:3781-4107 placement
function pluginUpdateSummary(updatedCount, policyRefusedCount, failedCount) {
  let icon = marketplaceUpdateIcon({
    failedCount,
    updatedCount,
    policyRefusedCount,
  });
  let text =
    failedCount > 0
      ? updatedCount > 0
        ? `Updated ${updatedCount} ${plural(updatedCount, "marketplace")}, but not all`
        : "No marketplaces were updated"
      : updatedCount > 0
        ? `Successfully updated ${updatedCount} ${plural(updatedCount, "marketplace")}`
        : policyRefusedCount > 0
          ? "No marketplaces were updated"
          : "No marketplaces needed updating";
  return icon === null ? text : `${icon} ${text}`;
}
//@ chunk-jdfzheem.js:4107-4292 facade-exports (2.1.88 match: handleMarketplaceError, 0.767)
/**
 * 插件/市场命令出错的统一处理：策略拒绝打印 refused，其他错误记日志并以错误退出。
 */
function handleMarketplaceError(error, action) {
  if (error instanceof CommandSourceError) {
    logForDebugging(`${action} refused: ${error.message}`);
    return cliError(stripInvisibleKeepNewlines(error.message));
  }
  logForDebugging(`Failed to ${action}: ${errorMessage(error)}`, {
    level: "error",
  });
  cliError(
    stripInvisibleKeepNewlines(`${figures_default.cross} Failed to ${action}: ${errorMessage(error)}`),
  );
}
//@ chunk-jdfzheem.js:4292-4421 layout
async function reportOperationFailure(error, commandLine, jsonPayload, error_2 = error) {
  if (jsonPayload !== undefined)
    await writeJsonLine({
      ...jsonPayload,
      outcome: "failed",
      message: stripInvisibleKeepNewlines(errorMessage(error)),
      failureCode: pluginErrorKind(error_2),
    });
  return handleMarketplaceError(error, commandLine);
}
//@ chunk-jdfzheem.js:4421-4478 layout
function asMarketplaceError(error, maxChars = 300) {
  return error instanceof CommandSourceError ? error : printableName(errorMessage(error), maxChars);
}
//@ chunk-jdfzheem.js:4478-4985 fingerprint (2.1.88 match: printValidationResult, 0.867)
function printValidationResult(result) {
  let lines = [];
  if (result.errors.length > 0) {
    lines.push(
      `${figures_default.cross} Found ${result.errors.length} ${plural(result.errors.length, "error")}:`,
      "",
    );
    result.errors.forEach((error) => {
      lines.push(`  ${figures_default.pointer} ${error.path}: ${error.message}`);
    });
    lines.push("");
  }
  if (result.warnings.length > 0) {
    lines.push(
      `${figures_default.warning} Found ${result.warnings.length} ${plural(result.warnings.length, "warning")}:`,
      "",
    );
    result.warnings.forEach((warning) => {
      lines.push(`  ${figures_default.pointer} ${warning.path}: ${warning.message}`);
    });
    lines.push("");
  }
  if (result.notes !== undefined) {
    result.notes.forEach((note) => {
      lines.push(`  ${figures_default.pointer} ${note}`);
    });
    lines.push("");
  }
  return lines;
}
//@ chunk-jdfzheem.js:4985-5208 layout
var VALID_PLUGIN_DIR_SHAPES =
  "one with .claude-plugin/plugin.json, or one with no plugin.json and a skills/<name>/SKILL.md; a symbolic link in place of the folder, of skills, of <name> or of SKILL.md does not count, and SKILL.md must be a file";
//@ chunk-jdfzheem.js:5208-9030 facade-exports (2.1.88 match: pluginValidateHandler, 0.276)
/**
 * claude plugin validate：校验插件/市场目录结构与清单。
 */
async function pluginValidateHandler(getRoot, targetPath, options) {
  if (options.cowork) setUseCoworkPlugins(true);
  let target;
  try {
    target = await resolveValidateTarget(targetPath);
  } catch (error) {
    if (isFsInaccessible(error))
      logForDebugging(`Plugin validation failed for ${targetPath}: ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    console.error(
      `${figures_default.cross} Unexpected error during validation: ${sanitizeForDisplay(errorMessage(error), 200)}`,
    );
    await logFeatureBadAsync("cli_plugin_validate", "cli_plugin_validate_exception");
    return exitAfterAnalyticsFlush(2);
  }
  let { manifest, contents } = target;
  let { noErrors, hasWarnings, ...summary } = summarizeValidationResults(
    manifest ? [manifest, ...contents] : contents,
    options,
  );
  let advice = await readmeAdviceFor(targetPath, manifest, contents);
  let directoryChecks = await import("../../utils/plugins/validate/DIRECTORY_CHECKS_COULD_NOT_RUN.lazy.js");
  let directoryReport = null;
  let contentResults = [];
  let didChecksThrow = false;
  let checksRoot = directoryChecks.directoryChecksRoot(target);
  if (checksRoot !== null)
    try {
      directoryReport = await directoryChecks.lintPluginForDirectory(checksRoot);
      if (directoryReport !== null)
        contentResults = directoryChecks.formatDirectoryReport(
          checksRoot,
          directoryReport,
          options.profile === "directory" ? null : "this command with --profile directory",
        );
    } catch (error) {
      logError(error);
      didChecksThrow = true;
      directoryReport = null;
      contentResults = directoryChecks.formatDirectoryChecksFailure(checksRoot);
    }
  let directoryFailure;
  if (options.profile === "directory")
    if (didChecksThrow)
      directoryFailure = {
        reason: "--profile directory: the plugin directory checks could not run",
      };
    else if (directoryReport === null)
      directoryFailure = {
        reason:
          target.pluginRoot !== null
            ? "--profile directory could not read the plugin's manifest"
            : "--profile directory needs a plugin folder",
        note:
          target.pluginRoot !== null
            ? "--profile directory could not read this plugin's .claude-plugin/plugin.json as a regular file holding a JSON object (a symlink is not followed), so none of the plugin directory's rules were checked."
            : target.manifest?.fileType === "marketplace"
              ? `--profile directory needs a plugin folder (${VALID_PLUGIN_DIR_SHAPES}), and this target was validated as a marketplace. To check a plugin in it, pass that plugin's folder or its .claude-plugin/plugin.json. None of the plugin directory's rules were checked.`
              : directoryChecks.isProjectClaudeFolder(target.resolvedPath)
                ? "--profile directory needs a plugin folder, and this is a project's .claude folder, which nobody submits to the plugin directory. None of its rules were checked."
                : `--profile directory needs a plugin folder (${VALID_PLUGIN_DIR_SHAPES}). None of the plugin directory's rules were checked.`,
      };
    else {
      let strict = options.strict === true;
      let undecidedRules = directoryChecks.undecidedRulesThatFail(directoryReport.undecided, {
        strict,
      });
      let profileRefusal = directoryChecks.directoryProfileFails(directoryReport.findings, {
        strict,
      })
        ? directoryReport.findings.some((finding) => finding.blocking)
          ? "--profile directory: the plugin directory would refuse a submission of this plugin"
          : "--profile directory with --strict treats the plugin directory's warnings as errors"
        : undefined;
      let undecidedReason =
        undecidedRules.length === 0
          ? undefined
          : `${undecidedRules.length === 1 ? "a plugin directory rule" : "plugin directory rules"} could not be decided, because MCP or hooks files were not checked or could not be used: ${undecidedRules.join(", ")}`;
      if (profileRefusal !== undefined || undecidedReason !== undefined)
        directoryFailure = {
          reason:
            profileRefusal === undefined
              ? `--profile directory: ${undecidedReason}`
              : undecidedReason === undefined
                ? profileRefusal
                : `${profileRefusal}; also, ${undecidedReason}`,
          ...(undecidedReason !== undefined && {
            note: '--profile directory fails this run because one or more rules could not be decided. The notes under "About these checks" (directory.notes in --json) name the files and say what to do.',
          }),
        };
    }
  let directory =
    directoryReport !== null || directoryFailure !== undefined || didChecksThrow
      ? {
          profile: options.profile === "directory" ? "directory" : null,
          findings: directoryReport?.findings ?? [],
          undecided: directoryReport?.undecided ?? [],
          incomplete: directoryReport?.incomplete ?? true,
          failure: directoryFailure?.reason ?? null,
          notes: [
            ...(directoryReport?.notes ?? []),
            ...(didChecksThrow ? [directoryChecks.DIRECTORY_CHECKS_COULD_NOT_RUN] : []),
            ...(directoryFailure?.note === undefined ? [] : [directoryFailure.note]),
          ],
        }
      : null;
  let isSuccess = summary.allSuccess && directoryFailure === undefined;
  let logOutcome = () =>
    isSuccess
      ? logFeatureOkAsync("cli_plugin_validate")
      : logFeatureSadAsync("cli_plugin_validate", "cli_plugin_validate_failed");
  if (options.json) {
    await writeStdoutAndDrain(
      printJson(
        buildValidateJsonOutput(
          target,
          {
            success: isSuccess,
            strict: options.strict === true,
          },
          advice,
          directory,
        ),
      ) +
        `
`,
    );
    await logOutcome();
    return exitAfterAnalyticsFlush(isSuccess ? 0 : 1);
  }
  let lines = manifest
    ? [
        `Validating ${manifest.fileType} manifest: ${manifest.filePath}`,
        "",
        ...printValidationResult(manifest),
      ]
    : [`Validating components in: ${target.resolvedPath}`, ""];
  for (let content of contents) {
    lines.push(`Validating ${content.fileType}: ${content.filePath}`, "");
    lines.push(...printValidationResult(content));
  }
  for (let contentResult of contentResults) lines.push(contentResult);
  if (directoryFailure?.note !== undefined) lines.push(directoryFailure.note, "");
  lines.push(...formatAdviceLines(advice));
  if (isSuccess)
    lines.push(
      hasWarnings
        ? `${figures_default.tick} Validation passed with warnings`
        : `${figures_default.tick} Validation passed`,
    );
  else if (summary.allSuccess && directoryFailure !== undefined)
    lines.push(`${figures_default.cross} Validation failed (${directoryFailure.reason})`);
  else if (noErrors && hasWarnings)
    lines.push(`${figures_default.cross} Validation failed (--strict treats warnings as errors)`);
  else lines.push(`${figures_default.cross} Validation failed`);
  await renderAndRun_2(
    await getRoot(),
    jsxProd_default(Text, {
      children: formatMessageLines(lines),
    }),
  );
  await logOutcome();
  return exitAfterAnalyticsFlush(isSuccess ? 0 : 1);
}
//@ chunk-jdfzheem.js:9030-10306 facade-exports
async function pluginTagHandler(getRoot, targetDir, options) {
  let prepared = await tagPluginRelease(targetDir ?? ".", {
    force: options.force,
  });
  let lines = [];
  for (let warning of prepared.warnings) lines.push(`${figures_default.warning} ${warning}`);
  if (!prepared.ok) {
    await logFeatureBadAsync("cli_plugin_tag", "cli_plugin_tag_prepare_failed");
    lines.push(`${figures_default.cross} ${prepared.error}`);
    renderAndRun(getRoot, lines, 1);
    return;
  }
  let { plan } = prepared;
  lines.push(`Plugin:  ${plan.pluginName}`, `Version: ${plan.version} (from ${plan.versionFrom})`);
  if (plan.marketplace)
    lines.push(
      `Marketplace entry: plugins[${plan.marketplace.entryIndex}] in ${plan.marketplace.path}` +
        (plan.marketplace.entryVersion ? ` (version: ${plan.marketplace.entryVersion})` : ""),
    );
  lines.push(`Tag:     ${plan.tag}`, "");
  let remote = options.remote ?? "origin";
  let force = options.force ?? false;
  let message = formatTagName(plan, options.message);
  let pushCommand = `git -C ${plan.gitRoot} push ${force ? "--force " : ""}${remote} refs/tags/${plan.tag}`;
  if (options.dryRun) {
    await logFeatureOkAsync("cli_plugin_tag");
    lines.push(
      `${figures_default.tick} Dry run \u2014 would create tag ${plan.tag} at HEAD in ${plan.gitRoot}`,
      `  git -C ${plan.gitRoot} tag ${force ? "-f " : ""}-a ${plan.tag} -m ${jsonStringify(message)}`,
      `  ${pushCommand}`,
    );
    renderAndRun(getRoot, lines, 0);
    return;
  }
  let pluginGitTag = await createPluginGitTag(plan, {
    push: options.push ?? false,
    force,
    message: options.message,
    remote,
    allowGitTerminalPrompt: true,
  });
  if (!pluginGitTag.ok) {
    await logFeatureBadAsync("cli_plugin_tag", "cli_plugin_tag_create_failed");
    lines.push(`${figures_default.cross} ${pluginGitTag.error}`);
    renderAndRun(getRoot, lines, 1);
    return;
  }
  await logFeatureOkAsync("cli_plugin_tag");
  lines.push(`${figures_default.tick} Created tag ${plan.tag}`);
  if (pluginGitTag.pushed) lines.push(`${figures_default.tick} Pushed to ${remote}`);
  else lines.push(`  Push with: ${pushCommand}`);
  renderAndRun(getRoot, lines, 0);
}
//@ chunk-jdfzheem.js:10306-10408 layout (2.1.88 match: renderAndRun, 1)
function renderAndRun(root, message, exitCode) {
  root.render(
    jsxProd_default(RenderOnceAndExit, {
      children: jsxProd_default(Text, {
        children: formatMessageLines(message),
      }),
    }),
  );
  root.waitUntilExit().then(() => exitAfterAnalyticsFlush(exitCode));
}
//@ chunk-jdfzheem.js:10408-13116 facade-exports
async function pluginInitHandler(getRoot, name, options, storage) {
  let lines = [];
  let nameProblem = pluginNameProblem(name);
  if (nameProblem) {
    await logFeatureBadAsync("cli_plugin_init", "invalid_name");
    lines.push(`${figures_default.cross} Invalid plugin name "${name}": ${nameProblem}`);
    renderAndRun(getRoot, lines, 1);
    return;
  }
  let components = [];
  for (let component of options.with ?? [])
    if (PLUGIN_COMPONENT_KINDS.includes(component)) components.push(component);
    else {
      await logFeatureBadAsync("cli_plugin_init", "invalid_component");
      lines.push(
        `${figures_default.cross} Unknown --with component "${component}". Valid: ${PLUGIN_COMPONENT_KINDS.join(", ")}`,
      );
      renderAndRun(getRoot, lines, 1);
      return;
    }
  if (!areLocalPluginDirsAllowedByPolicy()) {
    await logFeatureBadAsync("cli_plugin_init", "policy_blocked");
    lines.push(
      `${figures_default.cross} ${localPluginDirsBlockedMessage(tildify(join(getClaudeConfigDir(), "skills")))}`,
    );
    renderAndRun(getRoot, lines, 1);
    return;
  }
  let skillsDir = join(getClaudeConfigDir(), "skills");
  let pluginDir = join(skillsDir, name);
  if (relative(skillsDir, resolve(pluginDir)).startsWith("..")) {
    await logFeatureBadAsync("cli_plugin_init", "invalid_name");
    lines.push(`${figures_default.cross} Plugin name "${name}" would write outside ${tildify(skillsDir)}`);
    renderAndRun(getRoot, lines, 1);
    return;
  }
  let authorName = options.author ?? (await gitUserName());
  let authorEmail = options.authorEmail ?? (await getGitEmail());
  if (!authorName && options.authorEmail)
    lines.push(
      `${figures_default.warning} --author-email was ignored because no author name was found. Pass --author or set git config user.name.`,
    );
  let author = authorName
    ? authorEmail
      ? {
          name: authorName,
          email: authorEmail,
        }
      : {
          name: authorName,
        }
    : undefined;
  let manifest = pluginManifestTemplate({
    name,
    description: options.description,
    author,
    with: components,
  });
  let skippedFiles;
  try {
    let scaffold = await scaffoldPlugin(pluginDir, manifest, {
      force: options.force,
    });
    if (!scaffold.ok) {
      await logFeatureBadAsync("cli_plugin_init", "target_exists");
      lines.push(`${figures_default.cross} ${scaffold.error}`);
      renderAndRun(getRoot, lines, 1);
      return;
    }
    skippedFiles = scaffold.skipped;
  } catch (error) {
    await logFeatureBadAsync("cli_plugin_init", "write_failed");
    logError(error);
    lines.push(`${figures_default.cross} Failed to write scaffold: ${errorMessage(error)}`);
    renderAndRun(getRoot, lines, 1);
    return;
  }
  for (let file of skippedFiles) lines.push(`  kept existing ${file} (use --force to overwrite)`);
  let result = await validateManifestForDisplay(pluginDir, {
    unrecordableNames: "warn",
  });
  if (!result.success || result.warnings.length > 0) lines.push(...printValidationResult(result));
  if (!result.success) {
    await logFeatureBadAsync("cli_plugin_init", "self_validate_failed");
    renderAndRun(getRoot, lines, 1);
    return;
  }
  await logFeatureOkAsync("cli_plugin_init");
  let fullName = `${name}@${SKILLS_DIR}`;
  lines.push(`${figures_default.tick} Created plugin "${name}" at ${tildify(pluginDir)}`);
  let enabledPlugins = getSettings_DEPRECATED().enabledPlugins ?? {};
  let isPolicyLocked = policyEnabledPluginNameSet()?.has(name) ?? false;
  let knownMarketplaces = await loadKnownMarketplacesSafe(storage);
  let found = Object.keys(enabledPlugins).find((key) => {
    let pluginIdentifier = parsePluginIdentifier(key);
    return (
      pluginIdentifier.name === name &&
      pluginIdentifier.marketplace !== undefined &&
      pluginIdentifier.marketplace !== BUILTIN &&
      !isOfficialMarketplace(pluginIdentifier.marketplace) &&
      knownMarketplaces[pluginIdentifier.marketplace] !== undefined
    );
  });
  let isExplicitlyDisabled = enabledPlugins[fullName] === false;
  if (isPolicyLocked)
    lines.push(
      `  ${figures_default.warning} A plugin named "${name}" is locked by managed settings, which takes precedence \u2014 ${fullName} won't load. To load this copy, give it a different "name" in .claude-plugin/plugin.json.`,
    );
  else if (found)
    lines.push(
      `  ${figures_default.warning} The name "${name}" is already taken by ${found} \u2014 when that plugin loads, ${fullName} won't. To load this copy, give it a different "name" in .claude-plugin/plugin.json or uninstall the conflicting plugin.`,
    );
  else if (isExplicitlyDisabled) {
    let enableCommand = claudeCommand("plugin enable", fullName);
    lines.push(
      `  ${figures_default.warning} A disabled setting for ${fullName} exists, so it won't load until you re-enable it${enableCommand ? `: ${enableCommand}` : " in /plugin"}`,
    );
  } else lines.push(`  It will auto-load next session as ${fullName}. Run /reload-plugins to load it now.`);
  let disableCommand = claudeCommand("plugin disable", fullName);
  lines.push(
    `  ${disableCommand ? `Disable: ${disableCommand}. ` : "Disable: in /plugin. "}Remove: delete the directory.`,
  );
  renderAndRun(getRoot, lines, 0);
}
//@ chunk-jdfzheem.js:13116-17771 facade-exports
async function pluginListHandler(getRoot, options, storageV5, storage) {
  if (options.cowork) setUseCoworkPlugins(true);
  isPluginCommandContext();
  logEvent("tengu_plugin_list_command", {});
  let installedPlugins = await getInstalledPluginsAsync(storageV5);
  if (
    options.json &&
    typeof options.dataSize === "string" &&
    !(
      Object.hasOwn(installedPlugins.plugins, options.dataSize) &&
      (installedPlugins.plugins[options.dataSize]?.length ?? 0) > 0
    )
  )
    return cliErrorAfterAnalyticsFlush(
      `${figures_default.cross} --data-size names a plugin that is not installed`,
    );
  let { getPluginEditableScopes, editableScopeOf } =
    await import("../../utils/plugins/pluginStartupCheck.js");
  let pluginEditableScopes = getPluginEditableScopes();
  let keys = Object.keys(installedPlugins.plugins);
  await ensureSyncedPluginDirsRegistered();
  let { enabled, disabled, errors, warnings } = await loadAllPlugins(storageV5, storage);
  let allPlugins = [...enabled, ...disabled];
  let bySource = new Map(allPlugins.map((plugin) => [plugin.source, plugin]));
  let inventory = {
    plugins: allPlugins,
    errors,
    warnings,
  };
  let sections = [
    {
      header: "Session-only plugins (--plugin-dir / --plugin-url):",
      scopeOf: () => "session",
      standaloneErrorScope: "session",
      standaloneWarningScope: "session",
      pathOf: (plugin) => plugin.path,
      showScope: false,
      ...filterInventoryBySource(INLINE_PLUGIN_MARKETPLACE, inventory),
    },
    {
      header: `Synced from claude.ai${isSyncWanted() ? "" : " \u2014 sync is off in this shell; these load only in a synced session"}:`,
      scopeOf: () => "synced",
      standaloneErrorScope: "synced",
      standaloneWarningScope: "synced",
      pathOf: (plugin) => plugin.path,
      showScope: false,
      ...filterInventoryBySource(SYNCED, inventory),
    },
    {
      header: "Skills-directory plugins (.claude/skills/*):",
      scopeOf: (plugin) => plugin.scope ?? "user",
      standaloneErrorScope: "user",
      standaloneWarningScope: "project",
      pathOf: displaySkillsDirPath,
      showScope: true,
      ...filterInventoryBySource(SKILLS_DIR, inventory),
    },
  ];
  let pluginVersions = await resolvePluginVersions(keys, bySource, storageV5);
  if (options.json) {
    let entries = [];
    for (let id of keys.sort()) {
      let installRows = installedPlugins.plugins[id];
      if (!installRows || installRows.length === 0) continue;
      let plugin = bySource.get(id);
      let bareName = plugin?.name ?? parsePluginIdentifier(id).name;
      let filtered = errors.filter((error) => matchesPluginSource(error, id, bareName));
      let filtered_2 = warnings.filter((warning) => matchesPluginSource(warning, id, bareName));
      let mapped = filtered.map(pluginErrorText);
      let mapped_2 = filtered_2.map(pluginWarningText);
      let mapped_3 = filtered.map(pluginIssueDetail);
      let mapped_4 = filtered_2.map(pluginIssueDetail);
      let projectEnabled = isPluginEnabledAtProjectScope(id);
      let dataDirSize;
      let dataDirUnreadable;
      if (options.dataSize === true || options.dataSize === id)
        try {
          dataDirSize =
            (await getPluginDataDirSize(id, {
              throwIfUnreadable: true,
            })) ?? undefined;
        } catch {
          dataDirUnreadable = true;
        }
      for (let row of installRows) {
        let mcpServers;
        if (plugin) {
          let mcpConfigs =
            plugin.mcpServers ||
            (await loadPluginMcpServersFromSources(plugin, undefined, storageV5, undefined, {
              readOnlyListing: true,
            }));
          if (mcpConfigs && Object.keys(mcpConfigs).length > 0) mcpServers = configuredMcpServers(mcpConfigs);
        }
        entries.push({
          id,
          version: row.version || "unknown",
          scope: row.scope,
          enabled: editableScopeOf(pluginEditableScopes, id) !== undefined,
          installPath: row.installPath,
          readFromFolder: pluginVersions.get(id),
          folderVersion: installedVersionOf(pluginVersions.get(id), plugin),
          installedAt: row.installedAt,
          lastUpdated: row.lastUpdated,
          projectPath: row.projectPath,
          mcpServers,
          errors: mapped.length > 0 ? mapped : undefined,
          notes: mapped_2.length > 0 ? mapped_2 : undefined,
          errorDetails: mapped_3.length > 0 ? mapped_3 : undefined,
          noteDetails: mapped_4.length > 0 ? mapped_4 : undefined,
          projectEnabled,
          dataDirSize,
          dataDirUnreadable,
          hasUserConfig: hasPluginUserConfig(plugin),
        });
      }
    }
    for (let section of sections) entries.push(...(await buildPluginListJson(section, storageV5)));
    let jsonText;
    if (options.available) {
      let availableEntries = [];
      try {
        let [knownMarketplacesWithDeclared, uniqueInstallCounts] = await Promise.all([
          loadKnownMarketplacesWithDeclared(storageV5),
          getUniqueInstallCounts(storageV5),
        ]);
        let { marketplaces } = await loadMarketplacesWithErrors(knownMarketplacesWithDeclared, storageV5);
        let allowedIds =
          (await getPluginDirectoryState()) !== "unavailable"
            ? new Set(
                groupBySource(
                  markFromPluginDirectory(
                    marketplaces.flatMap(({ name, data }) =>
                      (data?.plugins ?? []).map((entry) => {
                        let pluginId = formatPluginId(entry.name, name);
                        return {
                          entry,
                          marketplaceName: name,
                          pluginId,
                          isInstalled: isPluginInstalled(pluginId),
                        };
                      }),
                    ),
                    knownMarketplacesWithDeclared,
                  ),
                  knownMarketplacesWithDeclared,
                  await allowlistedInstalledPlugins(knownMarketplacesWithDeclared, storageV5),
                ).map((marked) => marked.pluginId),
              )
            : null;
        for (let { name, data } of marketplaces)
          if (data) {
            let filtered = data.plugins.filter((plugin) => {
              let pluginId = formatPluginId(plugin.name, name);
              return !isPluginInstalled(pluginId) && (allowedIds === null || allowedIds.has(pluginId));
            });
            for (let entry of await pluginInstallPath(
              name,
              filtered,
              knownMarketplacesWithDeclared,
              storageV5,
            )) {
              let pluginId = formatPluginId(entry.name, name);
              availableEntries.push({
                pluginId,
                name: entry.name,
                description: entry.description,
                marketplaceName: name,
                version: entry.version,
                source: entry.source,
                installCount: uniqueInstallCounts?.get(pluginId),
              });
            }
          }
      } catch {}
      jsonText = printJson({
        installed: entries,
        available: availableEntries,
      });
    } else jsonText = printJson(entries);
    await writeStdoutAndDrain(
      jsonText +
        `
`,
    );
    await logFeatureOkAsync("cli_plugin_list");
    return;
  }
  let lines = [];
  let installedListRefusal = await getInstalledListRefusal(storageV5);
  if (installedListRefusal !== undefined)
    lines.push(`Note: ${readInstalledPluginsFile(installedListRefusal)}`, "");
  else if (keys.length === 0 && !sections.some(hasInventoryRows))
    lines.push("No plugins installed. Use `claude plugin install` to install a plugin.");
  let setAsideFiles = await listSetAsideFiles();
  if (setAsideFiles.length > 0) {
    if (lines.length > 0 && lines.at(-1) !== "") lines.push("");
    lines.push(
      `Note: install records under names that no version of Claude Code can use were removed from installed_plugins.json. Their copy is kept for a while in ${setAsideFiles.join(", ")}. Nothing needs doing about these copies.`,
      "",
    );
  }
  let unreadableFiles = await listUnreadableKeptFiles();
  if (unreadableFiles.length > 0) {
    if (lines.length > 0 && lines.at(-1) !== "") lines.push("");
    lines.push(
      `Note: installed_plugins.json could not be read and was rebuilt. What it held is kept for a while in ${unreadableFiles.join(", ")}. Plugins it listed may need installing again; look there for what was recorded.`,
      "",
    );
  }
  if (keys.length > 0) lines.push("Installed plugins:", "");
  for (let id of keys.sort()) {
    let installRows = installedPlugins.plugins[id];
    if (!installRows || installRows.length === 0) continue;
    let bareName = bySource.get(id)?.name ?? parsePluginIdentifier(id).name;
    let filtered = errors.filter((error) => matchesPluginSource(error, id, bareName));
    let filtered_2 = warnings.filter((warning) => matchesPluginSource(warning, id, bareName));
    for (let row of installRows) {
      let isEnabled = editableScopeOf(pluginEditableScopes, id) !== undefined;
      let statusText =
        filtered.length > 0
          ? `${figures_default.cross} failed to load`
          : isEnabled
            ? `${figures_default.tick} enabled`
            : `${figures_default.cross} disabled`;
      let folder = pluginVersions.get(id);
      let version = displayVersion(row.version, bySource.get(id), folder);
      let scope = row.scope;
      lines.push(`  ${figures_default.pointer} ${id}`);
      lines.push(`    Version: ${version}`);
      if (folder !== undefined) lines.push(`    Read from: ${printableOrEmpty(folder)}`);
      lines.push(`    Scope: ${scope}`);
      lines.push(`    Status: ${statusText}`);
      for (let error of filtered) {
        if (error.type === "marketplace-load-failed" && error.nameRefused) {
          lines.push(...declaredErrorLines(error.marketplace, error.nameRefusedDeclaredInSettings === true));
          continue;
        }
        lines.push(
          `    Error: ${pluginErrorText(error)}${isMarketplaceLoadError(error) ? ` ${RELOAD_PLUGINS_HINT}` : ""}${marketplaceNotFoundMessage(error) !== undefined ? `. ${marketplaceNotFoundMessage(error)}` : ""}`,
        );
      }
      for (let warning of filtered_2) lines.push(`    Note: ${pluginWarningText(warning)}`);
      lines.push("");
    }
  }
  for (let section of sections) lines.push(...pluginListHandler_2(section));
  let root = await getRoot();
  await renderAndRun_2(
    root,
    jsxProd_default(Text, {
      children: formatMessageLines(lines),
    }),
  );
  await logFeatureOkAsync("cli_plugin_list");
}
//@ chunk-jdfzheem.js:17771-17957 layout
function MarketplaceResultLines(props) {
  let $ = useMemoCache(4);
  let { promise } = props;
  let lines = use(promise);
  let children;
  if ($[0] !== lines) {
    children = formatMessageLines(lines);
    $[0] = lines;
    $[1] = children;
  } else children = $[1];
  let element;
  if ($[2] !== children) {
    element = jsxProd_default(RenderOnceAndExit, {
      children: jsxProd_default(Text, {
        children,
      }),
    });
    $[2] = children;
    $[3] = element;
  } else element = $[3];
  return element;
}
//@ chunk-jdfzheem.js:17957-18042 facade-exports
/**
 * 市场来源格式错误提示文本。
 */
var INVALID_MARKETPLACE_SOURCE_MESSAGE =
  "Invalid marketplace source format. Try: owner/repo, https://..., or ./path";
//@ chunk-jdfzheem.js:18042-22713 facade-exports (2.1.88 match: marketplaceAddHandler, 0.454)
/**
 * claude plugin marketplace add：添加市场（owner/repo、URL 或路径），支持 --claudeai、--from-link、--resolve-only。
 */
async function marketplaceAddHandler(root, source, options, settings, credentials) {
  if (options.cowork) setUseCoworkPlugins(true);
  if (options.resolveOnly === true && options.fromLink !== true)
    return cliError(`${figures_default.cross} --resolve-only needs --from-link`);
  if (options.claudeai) {
    if (options.sparse !== undefined || options.scope !== undefined)
      return cliError(
        `${figures_default.cross} --claudeai takes only the marketplace name (no --sparse or --scope: a claude.ai marketplace is hosted for your account, not declared in settings)`,
      );
    if (options.fromLink === true)
      return cliError(`${figures_default.cross} --claudeai can't be combined with --from-link`);
    await addClaudeAiMarketplaceCommand(root, source, settings, credentials);
    return;
  }
  if (options.resolveOnly === true) {
    if (options.sparse !== undefined || options.scope !== undefined)
      return cliError(`${figures_default.cross} --resolve-only can't be combined with --sparse or --scope`);
    await lookupMarketplaceLink(source, settings);
    return;
  }
  if (options.fromLink !== true && isOfficialMarketplaceName_2(source)) {
    {
      let pluginDirectoryState = await getPluginDirectoryState();
      if (pluginDirectoryState === "blocked") {
        logMarketplaceAddFailed({
          reason: "policy_blocked",
          sourceKind: undefined,
          surface: "cli",
        });
        let blockInfo = pluginDirectoryPolicyBlock();
        if (blockInfo !== null) logDirectoryBlockedOnce(blockInfo);
        await logFeatureBadAsync("cli_marketplace_add", "cli_marketplace_add_blocked_by_policy");
        return cliErrorAfterAnalyticsFlush(
          `${figures_default.cross} ${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${pluginDirectoryPolicyBlockHint()} It can't be turned on here.`,
        );
      }
      if (pluginDirectoryState !== "unavailable") {
        if (options.sparse !== undefined || options.scope !== undefined)
          return cliError(
            `${figures_default.cross} ${OFFICIAL_MARKETPLACE_DISPLAY} is built in and not declared in any settings scope. Omit --sparse and --scope to turn it on.`,
          );
        if (pluginDirectoryState === "off") {
          try {
            await setPluginDirectoryEnabled(true);
          } catch (error) {
            logDirectoryToggle({
              enabled: true,
              surface: "cli",
              failure: "settings_write_failed",
            });
            await logFeatureBadAsync("cli_marketplace_add", "cli_marketplace_add_failed");
            await flushAnalyticsBeforeExit();
            return handleMarketplaceError(asMarketplaceError(error), "add marketplace");
          }
          logDirectoryToggle({
            enabled: true,
            surface: "cli",
          });
          refreshPluginCaches(settings, credentials);
        } else await persistPluginDirectoryChoice(true);
        await logFeatureOkAsync("cli_marketplace_add");
        await renderAndRun_2(
          root,
          jsxProd_default_2(Text, {
            children: [
              figures_default.tick,
              " ",
              pluginDirectoryState === "off"
                ? `${OFFICIAL_MARKETPLACE_DISPLAY} is on. Its plugins are back in /plugin \u2192 Discover.`
                : `${OFFICIAL_MARKETPLACE_DISPLAY} is already on`,
            ],
          }),
        );
        await exitAfterAnalyticsFlush(0);
        return;
      }
      logMarketplaceAddFailed({
        reason: "reserved_name",
        sourceKind: undefined,
        surface: "cli",
      });
      await logFeatureBadAsync("cli_marketplace_add", "cli_marketplace_add_directory_unavailable");
      return cliErrorAfterAnalyticsFlush(
        `${figures_default.cross} The ${OFFICIAL_MARKETPLACE_DISPLAY} isn't available in this session.`,
      );
    }
    await logFeatureBadAsync("cli_marketplace_add", "cli_marketplace_add_reserved_name");
    return cliErrorAfterAnalyticsFlush(`${figures_default.cross} ${reservedNameMessage(source)}`);
  }
  let input;
  let settingSource;
  let scope;
  let isFromLink = options.fromLink === true;
  let jsonContext = options.json
    ? {
        command: "marketplace-add",
      }
    : undefined;
  let fail = async (message, isUnreadable = false) => {
    if (jsonContext !== undefined)
      await writeJsonLine({
        ...jsonContext,
        outcome: "failed",
        message: stripInvisibleKeepNewlines(message),
        ...(!isUnreadable && {
          failureCode: "invalid_source",
        }),
      });
    return cliErrorAfterAnalyticsFlush(`${figures_default.cross} ${message}`);
  };
  try {
    if (isFromLink)
      try {
        parseDeepLinkMarketplace(source);
      } catch (error) {
        throw withMarketplaceFailureCode(error, "invalid_source");
      }
    let parsed = await parseMarketplaceInput(source);
    if (!parsed) {
      await logFeatureBadAsync("cli_marketplace_add", "cli_marketplace_add_invalid_source");
      return fail(INVALID_MARKETPLACE_SOURCE_MESSAGE);
    }
    if ("error" in parsed) {
      await logFeatureBadAsync("cli_marketplace_add", "cli_marketplace_add_parse_failed");
      return fail(stripControlChars(parsed.error), parsed.unreadable === true);
    }
    scope = options.scope ?? "user";
    if (scope !== "user" && scope !== "project" && scope !== "local")
      return cliErrorAfterAnalyticsFlush(
        stripControlChars(`${figures_default.cross} Invalid scope '${scope}'. Use: user, project, or local`),
      );
    settingSource = scopeToSettingSource(scope);
    input = parsed;
    if (options.sparse && options.sparse.length > 0)
      if (input.source === "github" || input.source === "git")
        input = {
          ...input,
          sparsePaths: options.sparse,
        };
      else
        return cliErrorAfterAnalyticsFlush(
          `${figures_default.cross} --sparse is only supported for github and git marketplace sources (got: ${input.source})`,
        );
  } catch (error) {
    await logPluginCommandFailure("cli_marketplace_add", error, "cli_marketplace_add_failed");
    return reportOperationFailure(error, "add marketplace", jsonContext);
  }
  let addedResult;
  let summaryText = "";
  let addPromise = (async () => {
    try {
      let lines = [];
      if (isFromLink) {
        let existingName = await linkMarketplaceInUse(input, settings);
        if (existingName !== undefined) {
          addedResult = {
            name: existingName,
            added: false,
          };
          summaryText = `Marketplace '${existingName}' is already added; nothing changed`;
          await logFeatureOkAsync("cli_marketplace_add");
          return [];
        }
      }
      let { name, alreadyMaterialized, resolvedSource, replacedSource } = await addMarketplaceSource(
        input,
        (message) => {
          lines.push(message);
        },
        settings,
        undefined,
        {
          refuseNameCollision: isFromLink,
        },
      );
      let { error } = await saveMarketplaceToSettings(
        name,
        {
          source: resolvedSource,
        },
        settingSource,
        settings,
      );
      if (error) throw error;
      refreshPluginCaches(settings, credentials);
      await logEventAsync("tengu_marketplace_added", {
        _PROTO_marketplace_name: name,
        source_type: fromEnum(input.source),
        repo_hash: input.source === "github" ? shortHash(input.repo) : undefined,
        is_official_marketplace: isOfficialMarketplaceName_3(name),
      });
      await logFeatureOkAsync("cli_marketplace_add");
      let installedDeps = [];
      if (!isFromLink)
        try {
          installedDeps = (
            await resolveMissingDependencies((await loadAllPlugins(settings, credentials)).errors, settings)
          ).installed;
        } catch (error) {
          logForDebugging(`marketplace add: dep auto-resolve skipped: ${errorMessage(error)}`, {
            level: "warn",
          });
        }
      addedResult = {
        name,
        added: true,
      };
      let depSuffix = formatDependencyCountSuffix(installedDeps);
      let addedMessage = alreadyMaterialized
        ? `Marketplace '${name}' already on disk \u2014 declared in ${scope} settings${depSuffix}`
        : `Successfully added marketplace: ${name} (declared in ${scope} settings)${depSuffix}`;
      let settingSource_2 = describeMarketplaceSourceReplaced({
        name,
        replacedSource,
        resolvedSource,
        settingSource,
      });
      summaryText = [...lines, addedMessage, ...settingSource_2].join(`
`);
      lines.push(
        `${figures_default.tick} ${addedMessage}`,
        ...settingSource_2.map((message) => `  ${message}`),
      );
      let settingsWarning = settingsFileWarning(settingsSourceName(settingSource));
      if (settingsWarning !== null) lines.push(`${figures_default.warning} ${settingsWarning}`);
      return lines;
    } catch (error) {
      if (isFromLink && error instanceof MarketplaceError)
        await writeStdoutAndDrain(`${escapeControlChars(
          jsonStringify({
            refused: error.reason,
          }),
        )}
`);
      await logPluginCommandFailure("cli_marketplace_add", error, "cli_marketplace_add_failed");
      return reportOperationFailure(error, "add marketplace", jsonContext);
    }
  })();
  addPromise.catch(() => {});
  if (isFromLink) {
    await addPromise;
    if (addedResult === undefined)
      return cliError(
        `${figures_default.cross} Failed to add marketplace: the add finished without naming the marketplace it used`,
      );
    await writeStdoutAndDrain(`${escapeControlChars(jsonStringify(addedResult))}
`);
  } else if (jsonContext !== undefined) await addPromise;
  if (isFromLink || jsonContext !== undefined) {
    if (jsonContext !== undefined)
      await writeJsonLine({
        ...jsonContext,
        outcome: "ok",
        marketplace: addedResult?.name,
        message: stripInvisibleKeepNewlines(summaryText),
      });
    await exitAfterAnalyticsFlush(0);
    return;
  }
  root.render(
    jsxProd_default(suspenseTypeExport, {
      fallback: jsxProd_default(Text, {
        children: "Adding marketplace\u2026",
      }),
      children: jsxProd_default(MarketplaceResultLines, {
        promise: addPromise,
      }),
    }),
  );
  await root.waitUntilExit();
  await exitAfterAnalyticsFlush(0);
}
//@ chunk-jdfzheem.js:22713-23371 layout
async function lookupMarketplaceLink(link, settings) {
  let parsed;
  try {
    parseDeepLinkMarketplace(link);
    parsed = await parseMarketplaceInput(link);
  } catch (error) {
    await logFeatureBadAsync("cli_marketplace_link_lookup", "cli_marketplace_link_lookup_refused_source");
    await flushAnalyticsBeforeExit();
    return handleMarketplaceError(error, "look up the marketplace");
  }
  if (!parsed || "error" in parsed) {
    await logFeatureBadAsync(
      "cli_marketplace_link_lookup",
      parsed ? "cli_marketplace_link_lookup_parse_failed" : "cli_marketplace_link_lookup_invalid_source",
    );
    return cliErrorAfterAnalyticsFlush(
      `${figures_default.cross} ${parsed?.error ?? INVALID_MARKETPLACE_SOURCE_MESSAGE}`,
    );
  }
  let existingName;
  try {
    existingName = await linkMarketplaceInUse(parsed, settings);
  } catch (error) {
    await logFeatureBadAsync("cli_marketplace_link_lookup", "cli_marketplace_link_lookup_read_failed");
    await flushAnalyticsBeforeExit();
    return handleMarketplaceError(error, "read the added marketplaces");
  }
  await logFeatureOkAsync("cli_marketplace_link_lookup");
  await writeStdoutAndDrain(`${escapeControlChars(
    jsonStringify({
      existing: existingName ?? null,
    }),
  )}
`);
  await exitAfterAnalyticsFlush(0);
}
//@ chunk-jdfzheem.js:23371-23438 facade-exports
async function linkMarketplaceInUse(source, settings) {
  if (!isSourceAllowedByPolicy(source)) return;
  return findMarketplaceBySourceLoose(await loadKnownMarketplacesWithDeclared(settings), source);
}
//@ chunk-jdfzheem.js:23438-25190 layout
/**
 * claude plugin marketplace add 的 claude.ai 分支：列出账号可用的 claude.ai 托管 marketplace，按名字找唯一一个（重名、被策略拦、不存在分别报错），添加后打印成功信息与安装提示；渲染为一次性 Ink 输出后退出。
 */
async function addClaudeAiMarketplaceCommand(ink, name, settings, credentials) {
  let addPromise = (async () => {
    try {
      let configured = await loadKnownMarketplacesWithDeclared(settings);
      let marketplaces = await listClaudeAiMarketplaces(credentials).catch(() => null);
      if (marketplaces === null)
        throw new ClaudeAiMarketplaceError(
          "claude.ai marketplaces are not available here \u2014 sign in to claude.ai (claude /login) with plugin sync on, then run: claude plugin marketplace list",
          "tier_unavailable",
        );
      let accountMarketplaceByName = findAccountMarketplaceByName(marketplaces.hosted, name);
      if (accountMarketplaceByName.kind === "ambiguous")
        throw new ClaudeAiMarketplaceError(
          `claude.ai hosts more than one marketplace called "${name}" for this account \u2014 add it by its unique name instead: ${accountMarketplaceByName.localNames.join(", ")} (claude plugin marketplace list)`,
          "ambiguous_name",
        );
      if (accountMarketplaceByName.kind === "none") {
        if (findAccountMarketplaceByName(marketplaces.policyBlocked, name).kind !== "none")
          throw new ClaudeAiMarketplaceError(
            `"${name}" is hosted on claude.ai for this account but not allowed by your organization's marketplace policy (personal claude.ai uploads and blocked hosts are not admitted)`,
            "policy_blocked",
          );
        throw new ClaudeAiMarketplaceError(
          `claude.ai hosts no marketplace named "${name}" for this account \u2014 run: claude plugin marketplace list`,
          "not_listed",
        );
      }
      let row = accountMarketplaceByName.row;
      let {
        name: addedName,
        marketplace,
        status,
      } = await addClaudeAiMarketplace(row, {
        configured,
        credentials,
      });
      refreshPluginCaches(settings, credentials);
      await logEventAsync("tengu_marketplace_added", {
        source_type: lit("claudeai"),
      });
      await logFeatureOkAsync("cli_marketplace_add");
      let freshness = describeMarketplaceFreshness(status);
      let pluginCount = marketplace.plugins.length;
      return [
        `${figures_default.tick} Successfully added marketplace: ${accountMarketplaceLabel(row)} \u2014 hosted on claude.ai, ${formatMarketplaceScopeLabel(row.scope)} \u2014 ${pluginCount} ${plural(pluginCount, "plugin")}${freshness ? ` (${freshness})` : ""}`,
        `  Install its plugins with: claude plugin install <plugin>@${addedName}`,
      ];
    } catch (error) {
      if (error instanceof ClaudeAiMarketplaceError) {
        await logFeatureBadAsync("cli_marketplace_add", `cli_marketplace_add_claudeai_${error.code}`);
        await flushAnalyticsBeforeExit();
      } else await logPluginCommandFailure("cli_marketplace_add", error, "cli_marketplace_add_failed");
      return handleMarketplaceError(error, "add marketplace");
    }
  })();
  addPromise.catch(() => {});
  ink.render(
    jsxProd_default(suspenseTypeExport, {
      fallback: jsxProd_default(Text, {
        children: "Adding marketplace\u2026",
      }),
      children: jsxProd_default(MarketplaceResultLines, {
        promise: addPromise,
      }),
    }),
  );
  await ink.waitUntilExit();
  await exitAfterAnalyticsFlush(0);
}
//@ chunk-jdfzheem.js:25190-25302 layout (2.1.88 match: readHeadAndTail, 0.802)
function readHeadAndTail(text) {
  return /^[A-Za-z0-9._/\\:~-]{1,200}$/.test(text)
    ? text
    : printableLabel(printableName(text, 4096), {
        head: 120,
        tail: 80,
      }) || "\u201C\u201D";
}
//@ chunk-jdfzheem.js:25302-25387 layout
function displaySafeUrl(url) {
  return url === REDACTED_URL || /^[A-Za-z0-9._/\\:~@%+=&?,*-]{1,200}$/.test(url)
    ? url
    : readHeadAndTail(url);
}
//@ chunk-jdfzheem.js:25387-29000 facade-exports (2.1.88 match: marketplaceListHandler, 0.405)
/**
 * claude plugin marketplace list。
 */
async function marketplaceListHandler(root, options, settings) {
  if (options.cowork) setUseCoworkPlugins(true);
  let known;
  try {
    known = await loadKnownMarketplacesWithDeclared(settings);
  } catch (error) {
    await logFeatureBadAsync("cli_marketplace_list", "cli_marketplace_list_load_failed");
    await flushAnalyticsBeforeExit();
    return handleMarketplaceError(error, "list marketplaces");
  }
  let keys = Object.keys(known);
  let claudeAi = await listClaudeAiMarketplaces().catch(() => null);
  let { available, hosted } = filterUnaddedClaudeAiMarketplaces(claudeAi, known);
  let browseOnly = claudeAi?.browseOnly ?? [];
  let config = await readClaudeAiMarketplaceRegistry();
  let rowsByName = new Map();
  for (let name of keys) {
    let source = known[name]?.source;
    if (isClaudeAiMarketplaceSource(source))
      rowsByName.set(
        name,
        (
          await ensureClaudeAiMarketplace(name, source, {
            mode: "cache-only",
            credentials: undefined,
          })
        ).status,
      );
  }
  let pluginDirectoryState = await getPluginDirectoryState();
  let isOfficialOff = pluginDirectoryState === "off" && !keys.includes(OFFICIAL_MARKETPLACE_NAME);
  if (options.json) {
    let sorted = keys
      .filter((name) => {
        let source = known[name]?.source;
        return !(source && isPluginDirectorySource(source));
      })
      .map((name) => {
        let entry = known[name];
        let source = entry?.source;
        let ref = source?.source === "github" || source?.source === "git" ? source.ref : undefined;
        return {
          name,
          source: source?.source,
          ...(source?.source === "github" && {
            repo: source.repo,
          }),
          ...(source?.source === "git" && {
            url: source.url,
          }),
          ...(source?.source === "url" && {
            url: source.url,
          }),
          ...(source?.source === "directory" && {
            path: source.path,
          }),
          ...(source?.source === "file" && {
            path: source.path,
          }),
          ...(ref && {
            ref,
          }),
          ...(source?.source === "claudeai"
            ? {
                marketplaceId: source.marketplaceId,
                organizationUuid: source.organizationUuid,
                ...(config[name]?.scope !== undefined && {
                  scope: config[name]?.scope,
                }),
                status: rowsByName.get(name)?.kind,
              }
            : {
                installLocation: entry?.installLocation,
              }),
        };
      })
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    await writeStdoutAndDrain(
      printJson(sorted) +
        `
`,
    );
    await logFeatureOkAsync("cli_marketplace_list");
    return;
  }
  let isOfficialCatalogHidden = false;
  let officialEntry = known[OFFICIAL_MARKETPLACE_NAME];
  if (
    pluginDirectoryState === "on" &&
    officialEntry !== undefined &&
    isPluginDirectorySource(officialEntry.source) &&
    isListingRepositoryBlockedByHostPolicy(undefined)
  ) {
    let marketplaceCacheOnly = await getMarketplaceCacheOnly(OFFICIAL_MARKETPLACE_NAME, settings, {
      registryEntry: officialEntry,
    });
    isOfficialCatalogHidden =
      marketplaceCacheOnly !== null &&
      (commandSourceSession().catalogEntryNames?.size ?? 0) > marketplaceCacheOnly.plugins.length;
  }
  printPluginWarnings(known);
  let view;
  if (
    keys.length === 0 &&
    !isOfficialOff &&
    available.length === 0 &&
    hosted.length === 0 &&
    browseOnly.length === 0
  )
    view = jsxProd_default(Text, {
      children: "No marketplaces configured",
    });
  else {
    let lines =
      keys.length > 0 || isOfficialOff
        ? ["Configured marketplaces:", ""]
        : ["No marketplaces configured", ""];
    if (isOfficialOff)
      lines.push(
        `  ${figures_default.pointer} ${OFFICIAL_MARKETPLACE_NAME}`,
        `    Source: Built in (${OFFICIAL_MARKETPLACE_DISPLAY}) \u2014 off`,
        `    Turn it back on: claude plugin marketplace add ${OFFICIAL_MARKETPLACE_NAME}`,
        "",
      );
    (officialEntry !== undefined && isPluginDirectorySource(officialEntry.source)
      ? [OFFICIAL_MARKETPLACE_NAME, ...keys.filter((name) => name !== OFFICIAL_MARKETPLACE_NAME)]
      : keys
    ).forEach((name) => {
      let entry = known[name];
      let displayName = displayMarketplaceName(name);
      lines.push(`  ${figures_default.pointer} ${displayName}`);
      if (displayName !== name) {
        let isSafeArg = isSafeCliArg(name);
        if (isSafeArg || isAsciiImpersonatingOfficialName(name))
          lines.push(
            `    Shown in quotes: the name looks like one of Anthropic's own, and is not.${isSafeArg ? ` In a command, type: ${name}` : ""}`,
          );
      }
      if (entry?.source) {
        let src = entry.source;
        if (src.source === "github") {
          let refSuffix = src.ref ? `@${readHeadAndTail(src.ref)}` : "";
          lines.push(`    Source: GitHub (${readHeadAndTail(src.repo)}${refSuffix})`);
        } else if (src.source === "git") {
          let refSuffix = src.ref ? `@${readHeadAndTail(src.ref)}` : "";
          lines.push(`    Source: Git (${displaySafeUrl(redactUrlForDisplay(src.url))}${refSuffix})`);
        } else if (src.source === "url")
          lines.push(`    Source: URL (${displaySafeUrl(redactUrlForDisplay(src.url))})`);
        else if (src.source === "directory")
          lines.push(
            `    Source: ${pluginDirectoryState !== "unavailable" ? "Folder" : "Directory"} (${readHeadAndTail(src.path)})`,
          );
        else if (src.source === "file") lines.push(`    Source: File (${readHeadAndTail(src.path)})`);
        else if (src.source === "pluginDirectory")
          lines.push(
            `    Source: Built in (${OFFICIAL_MARKETPLACE_DISPLAY})${pluginDirectoryState === "blocked" ? " \u2014 blocked by your organization" : isOfficialCatalogHidden ? " \u2014 some plugins hidden by your organization's policy" : ""}`,
          );
        else if (src.source === "claudeai") {
          let freshness = rowsByName.get(name);
          let freshnessText = freshness === undefined ? undefined : describeMarketplaceFreshness(freshness);
          lines.push(
            `    Source: ${formatClaudeAiMarketplaceLabel(config[name])}${freshnessText === undefined ? "" : ` \u2014 ${freshnessText}`}`,
          );
        }
      }
      if (
        entry !== undefined &&
        isImpersonatingOfficialMarketplace(name, entry) &&
        isAsciiImpersonatingOfficialName(name)
      )
        lines.push(
          ...reservedMarketplaceNameMessage(name, {
            declaredInSettings: entry.source.source === "settings",
          }).map((line) => `    ${line}`),
        );
      lines.push("");
    });
    if (available.length > 0 || hosted.length > 0 || browseOnly.length > 0) lines.push("From claude.ai:", "");
    for (let entry of available) {
      lines.push(
        `  ${figures_default.pointer} ${entry.name} (available from claude.ai${entry.scope ? `, ${entry.scope}` : ""} \u2014 not added)`,
      );
      lines.push(
        `    Source: ${entry.source.source === "github" ? "GitHub" : "Git"} (${formatGitSourceSpec(entry.source)})`,
      );
      lines.push("");
    }
    for (let entry of hosted) {
      lines.push(
        `  ${figures_default.pointer} ${accountMarketplaceLabel(entry)} \u2014 hosted on claude.ai, ${formatMarketplaceScopeLabel(entry.scope)} \xB7 not added`,
      );
      lines.push(
        `    Add: claude plugin marketplace add --claudeai ${isSafeCliArg(entry.name) ? entry.name : "<name>"}`,
      );
      lines.push("");
    }
    for (let entry of browseOnly) {
      lines.push(`  ${figures_default.pointer} ${noCliNameLabel(entry)} (browse on claude.ai)`);
      lines.push("");
    }
    view = jsxProd_default(Text, {
      children: formatMessageLines(lines),
    });
  }
  let renderRoot = await root();
  await renderAndRun_2(renderRoot, view);
  await logFeatureOkAsync("cli_marketplace_list");
}
//@ chunk-jdfzheem.js:29000-30969 facade-exports (2.1.88 match: marketplaceRemoveHandler, 0.274)
/**
 * claude plugin marketplace remove。
 */
async function marketplaceRemoveHandler(root, name, options, storage) {
  if (options.cowork) setUseCoworkPlugins(true);
  let settingSource;
  if (options.scope !== undefined) {
    let scope = options.scope;
    if (scope !== "user" && scope !== "project" && scope !== "local")
      return cliError(`${figures_default.cross} Invalid scope '${scope}'. Use: user, project, or local`);
    settingSource = scopeToSettingSource(scope);
  }
  let officialState = isOfficialMarketplaceSpelling(name) ? await getPluginDirectoryState() : undefined;
  let outcome;
  try {
    if (
      officialState === "blocked" &&
      isOfficialMarketplaceName_2(name) &&
      !listReservedNameRefusals(await loadKnownMarketplacesWithDeclared(storage)).some(({ name }) =>
        isOfficialMarketplaceName_2(name),
      )
    ) {
      await renderAndRun_2(root, jsxProd_default(ManagedMarketplaceNotice, {}));
      await logFeatureOkAsync("cli_marketplace_remove");
      return;
    }
    outcome = await removeMarketplaceWithReservedSiblings(name, settingSource, storage);
    refreshPluginCaches(storage);
    if (outcome.kind !== "plugin-directory-built-in")
      logEvent("tengu_marketplace_removed", {
        marketplace_name: marketplaceForTelemetry(name),
        _PROTO_marketplace_name: name,
        is_official_marketplace: isOfficialMarketplaceName_3(name),
      });
  } catch (error) {
    await logFeatureBadAsync("cli_marketplace_remove", "cli_marketplace_remove_failed");
    await flushAnalyticsBeforeExit();
    return reportOperationFailure(
      asMarketplaceError(error, 2000),
      "remove marketplace",
      options.json
        ? {
            command: "marketplace-remove",
            marketplace: name,
          }
        : undefined,
      error,
    );
  }
  await logFeatureOkAsync("cli_marketplace_remove");
  if (outcome.kind === "ignored-plugin-directory-name-entry-removed") {
    let mapped = outcome.removedNames.map(
      (removedName) =>
        `${figures_default.tick} ${removedMarketplaceMessage(removedName, officialState !== undefined && officialState !== "unavailable")}`,
    );
    let blockedNotice = blockedPluginsNotice(outcome.disabledPluginIds, outcome.disabledReason);
    if (blockedNotice !== null) mapped.push(blockedNotice);
    await renderAndRun_2(
      root,
      jsxProd_default(Text, {
        children: formatMessageLines(mapped),
      }),
    );
    return;
  }
  if (outcome.kind === "plugin-directory-built-in") {
    let pluginDirectoryState = await getPluginDirectoryState();
    if (pluginDirectoryState === "blocked") {
      await renderAndRun_2(root, jsxProd_default(ManagedMarketplaceNotice, {}));
      return;
    }
    if (officialState === "on" && pluginDirectoryState === "off")
      logDirectoryToggle({
        enabled: false,
        surface: "cli",
      });
    await renderAndRun_2(
      root,
      jsxProd_default_2(Text, {
        children: [
          figures_default.tick,
          " ",
          OFFICIAL_MARKETPLACE_DISPLAY,
          " is off. Plugins you installed from it stay installed and keep updating. Turn it back on: claude plugin marketplace add",
          " ",
          OFFICIAL_MARKETPLACE_NAME,
        ],
      }),
    );
    return;
  }
  let removedPluginIds = outcome.kind === "removed" ? outcome.removedPluginIds : [];
  let summaryLine = `Successfully removed marketplace: ${stripInvisibleKeepEmoji(name)}${options.scope ? ` (from ${options.scope} settings)` : ""}`;
  let uninstalledLines =
    removedPluginIds.length > 0
      ? [
          `Also uninstalled ${removedPluginIds.length} ${plural(removedPluginIds.length, "plugin")} from this marketplace:`,
          ...removedPluginIds.map((removedPluginId) => `  ${removedPluginId}`),
          "The removal also deletes their saved options, secrets and data where it can.",
          "To use a plugin again, add the marketplace back and reinstall the plugin.",
        ]
      : [];
  if (options.json) {
    await writeJsonLine({
      command: "marketplace-remove",
      outcome: "ok",
      marketplace: name,
      message: stripInvisibleKeepNewlines(
        [summaryLine, ...uninstalledLines].join(`
`),
      ),
    });
    return;
  }
  let lines = [`${figures_default.tick} ${summaryLine}`, ...uninstalledLines];
  await renderAndRun_2(
    root,
    jsxProd_default(Text, {
      children: formatMessageLines(lines),
    }),
  );
}
//@ chunk-jdfzheem.js:30969-31064 layout
function ManagedMarketplaceNotice() {
  let $ = useMemoCache(1);
  let element;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    element = jsxProd_default(Text, {
      children: formatPluginDirectoryBlockedMessage(pluginDirectoryPolicyBlockHint()),
    });
    $[0] = element;
  } else element = $[0];
  return element;
}
//@ chunk-jdfzheem.js:31064-31429 layout
function ResultMessages(props) {
  let $ = useMemoCache(11);
  let { promise } = props;
  let { messages, summary } = use(promise);
  let TextComponent;
  let RenderOnceAndExitComponent;
  let children;
  if ($[0] !== messages || $[1] !== summary) {
    let lines = [...messages, summary];
    RenderOnceAndExitComponent = RenderOnceAndExit;
    TextComponent = Text;
    children = formatMessageLines(lines);
    $[0] = messages;
    $[1] = summary;
    $[2] = TextComponent;
    $[3] = RenderOnceAndExitComponent;
    $[4] = children;
  } else {
    TextComponent = $[2];
    RenderOnceAndExitComponent = $[3];
    children = $[4];
  }
  let children_2;
  if ($[5] !== TextComponent || $[6] !== children) {
    children_2 = jsxProd_default(TextComponent, {
      children,
    });
    $[5] = TextComponent;
    $[6] = children;
    $[7] = children_2;
  } else children_2 = $[7];
  let element;
  if ($[8] !== RenderOnceAndExitComponent || $[9] !== children_2) {
    element = jsxProd_default(RenderOnceAndExitComponent, {
      children: children_2,
    });
    $[8] = RenderOnceAndExitComponent;
    $[9] = children_2;
    $[10] = element;
  } else element = $[10];
  return element;
}
//@ chunk-jdfzheem.js:31429-33421 facade-exports (2.1.88 match: marketplaceUpdateHandler, 0.464)
/**
 * claude plugin marketplace update。
 */
async function marketplaceUpdateHandler(root, name, options, storage) {
  if (options.json && !name)
    return cliError(
      `${figures_default.cross} --json needs a marketplace name, for example: claude plugin marketplace update <name> --json`,
    );
  if (options.cowork) setUseCoworkPlugins(true);
  let marketplaceName =
    name !== undefined && isOfficialMarketplaceName_2(name) ? OFFICIAL_MARKETPLACE_NAME : name;
  let fallbackText;
  let exitCode = 0;
  let updatePromise;
  if (marketplaceName) {
    fallbackText = `Updating marketplace: ${marketplaceName}...`;
    let messages = [];
    let summaryLine = `Successfully updated marketplace: ${marketplaceName}`;
    updatePromise = refreshMarketplaceDeduped(marketplaceName, storage, (message) => {
      messages.push(message);
    })
      .then(async () => {
        refreshPluginCaches(storage);
        await logEventAsync("tengu_marketplace_updated", {
          marketplace_name: marketplaceForTelemetry(marketplaceName),
          _PROTO_marketplace_name: marketplaceName,
          is_official_marketplace: isOfficialMarketplaceName_3(marketplaceName),
        });
        await logFeatureOkAsync("cli_marketplace_update");
        return {
          messages,
          summary: `${figures_default.tick} ${summaryLine}`,
        };
      })
      .catch(async (error) => {
        await logPluginCommandFailure("cli_marketplace_update", error, "cli_marketplace_update_failed");
        return reportOperationFailure(
          error,
          "update marketplace(s)",
          options.json
            ? {
                command: "marketplace-update",
                marketplace: name,
              }
            : undefined,
        );
      });
    if (options.json) {
      await updatePromise;
      await writeJsonLine({
        command: "marketplace-update",
        outcome: "ok",
        marketplace: name,
        message: stripInvisibleKeepNewlines(
          [...messages, summaryLine].join(`
`),
        ),
      });
      await exitAfterAnalyticsFlush(0);
      return;
    }
  } else {
    let known;
    try {
      known = await loadKnownMarketplacesWithDeclared(storage);
    } catch (error) {
      await logPluginCommandFailure("cli_marketplace_update", error, "cli_marketplace_update_load_failed");
      return handleMarketplaceError(error, "update marketplace(s)");
    }
    let marketplaceNames = Object.keys(known);
    if (marketplaceNames.length === 0) {
      await renderAndRun_2(
        root,
        jsxProd_default(Text, {
          children: "No marketplaces configured",
        }),
      );
      await logFeatureOkAsync("cli_marketplace_update");
      return exitAfterAnalyticsFlush(0);
    }
    fallbackText = "Updating marketplaces...";
    updatePromise = refreshAllMarketplaces(storage)
      .then(async ({ policyRefused, failed, attempted, builtInSkipped }) => {
        exitCode = failed.length > 0 ? 1 : 0;
        refreshPluginCaches(storage);
        await logEventAsync("tengu_marketplace_updated_all", {
          count: marketplaceNames.length,
          attempted,
          refreshed: attempted - policyRefused.length - failed.length,
          policy_refused: policyRefused.length,
          failed: failed.length,
          built_in_skipped: builtInSkipped.length,
        });
        if (failed.length > 0)
          await logFeatureSadAsync("cli_marketplace_update", "marketplace_refresh_failed");
        else if (policyRefused.length > 0)
          await logFeatureSadAsync("cli_marketplace_update", "command_source_refused");
        else
          await (builtInSkipped.length > 0
            ? logFeatureSadAsync("cli_marketplace_update", "built_in_directory_skipped")
            : logFeatureOkAsync("cli_marketplace_update"));
        return marketplaceUpdateSummary(
          attempted,
          policyRefused,
          failed,
          marketplaceNames.length - attempted - builtInSkipped.length,
          builtInSkipped,
        );
      })
      .catch(async (error) => {
        await logPluginCommandFailure("cli_marketplace_update", error, "cli_marketplace_update_failed");
        return handleMarketplaceError(error, "update marketplace(s)");
      });
  }
  root.render(
    jsxProd_default(suspenseTypeExport, {
      fallback: jsxProd_default(Text, {
        children: fallbackText,
      }),
      children: jsxProd_default(ResultMessages, {
        promise: updatePromise,
      }),
    }),
  );
  await root.waitUntilExit();
  await exitAfterAnalyticsFlush(exitCode);
}
//@ chunk-jdfzheem.js:33621-33664 affinity
function isValidInstallScope(scope) {
  return VALID_INSTALLABLE_SCOPES.some((scopeName) => scopeName === scope);
}
//@ chunk-jdfzheem.js:33664-33855 facade-exports (2.1.88 match: pluginInstallHandler, 0.744)
/**
 * 校验 --scope（默认 user；--cowork 只能 user），非法时退出。
 */
function requireInstallableScope(options) {
  let scope = options.scope || "user";
  if (options.cowork && scope !== "user") cliError("--cowork can only be used with user scope");
  if (!isValidInstallScope(scope))
    cliError(`Invalid scope: ${scope}. Must be one of: ${VALID_INSTALLABLE_SCOPES.join(", ")}.`);
  return scope;
}
//@ chunk-jdfzheem.js:33855-34106 file-local
function pluginEnableHandler_2(options) {
  let scope;
  if (options.scope) {
    if (!isValidInstallScope(options.scope))
      cliError(`Invalid scope "${options.scope}". Valid scopes: ${VALID_INSTALLABLE_SCOPES.join(", ")}`);
    scope = options.scope;
  }
  if (options.cowork && scope !== undefined && scope !== "user")
    cliError("--cowork can only be used with user scope");
  if (options.cowork && scope === undefined) scope = "user";
  return scope;
}
//@ chunk-jdfzheem.js:34245-36274 facade-exports
async function pluginInstallHandler(root, spec, options, storageV5) {
  if (options.cowork) setUseCoworkPlugins(true);
  let scope = requireInstallableScope(options);
  logPluginLoadErrors("tengu_plugin_install_command", spec, fromEnum(scope));
  if (!options.json) printPluginWarnings(await loadKnownMarketplacesSafe(storageV5));
  let shownCommand;
  let onShown = (command) => {
    shownCommand = command;
  };
  let failWith = async (failureCode, message) => {
    if (options.json)
      await writePluginResult({
        command: "install",
        outcome: "failed",
        plugin: spec,
        scope,
        message,
        failureCode,
        shownCommand: shownCommand && withConfirmationDigest(shownCommand),
      });
  };
  let announceRefreshResult;
  let resolvedMarketplace;
  let handleFailure = (error) => {
    if (announceRefreshResult) logInstallRefreshFirst(announceRefreshResult.outcome);
    return handlePluginCommandError(
      error,
      "install",
      spec,
      storageV5,
      options.json
        ? {
            scope,
            shownCommand,
          }
        : undefined,
    );
  };
  if (options.replace && !parsePluginIdentifier(spec).marketplace)
    return handleFailure(
      new PluginOperationFailedError(replaceNeedsFullIdMessage(), {
        failureCode: "replace_needs_full_id",
      }),
    );
  let isListUnreadable = (await getInstalledListRefusal(storageV5).catch(handleFailure)) !== undefined;
  let switchCheck = isListUnreadable
    ? undefined
    : await checkCommandSourceSwitch(
        spec,
        {
          yes: options.yes,
          acceptCommand: options.acceptCommand,
          onShown,
          scope,
          onMarketplaceRefreshResult: (result) => {
            announceRefreshResult = result;
          },
          onResolvedMarketplace: (marketplace) => {
            resolvedMarketplace = marketplace;
          },
        },
        storageV5,
      ).catch(handleFailure);
  if (switchCheck?.kind === "accepted") shownCommand = undefined;
  if (switchCheck?.kind === "declined") {
    if (announceRefreshResult) logInstallRefreshFirst(announceRefreshResult.outcome);
    logFeatureSad("cli_plugin_install", "command_source_declined");
    if (options.json) await failWith("command_source_declined", "Aborted.");
    else
      await renderAndRun_2(
        await root(),
        jsxProd_default(Text, {
          children: "Aborted.",
        }),
      );
    await gracefulShutdown(1);
    return;
  }
  let grantKey = switchCheck?.grantKey;
  let resolvedTarget = isListUnreadable
    ? null
    : await resolveInstallTarget(
        spec,
        {
          yes: options.yes,
          acceptCommand: options.acceptCommand,
          onShown,
          scope,
          resolvedMarketplace,
        },
        storageV5,
      ).catch(handleFailure);
  if (resolvedTarget !== null && resolvedTarget !== "declined" && resolvedTarget !== "unconfirmed")
    shownCommand = undefined;
  if (resolvedTarget === "declined" || resolvedTarget === "unconfirmed") {
    logFeatureSad(
      "cli_plugin_install",
      resolvedTarget === "declined" ? "entry_helper_declined" : "entry_helper_unconfirmed",
    );
    if (announceRefreshResult) logInstallRefreshFirst(announceRefreshResult.outcome);
    if (options.json)
      await failWith(
        resolvedTarget === "declined" ? "entry_helper_declined" : "entry_helper_unconfirmed",
        "Aborted \u2014 the command was not run.",
      );
    else
      await renderAndRun_2(
        await root(),
        jsxProd_default(Text, {
          children: "Aborted \u2014 the command was not run.",
        }),
      );
    await gracefulShutdown(1);
    return;
  }
  let { name, marketplace } = parsePluginIdentifier(spec);
  let wasAccepted = switchCheck?.kind === "accepted" || resolvedTarget !== null;
  let resolvedPlugin =
    options.acceptCommand !== undefined &&
    wasAccepted &&
    marketplace === undefined &&
    name &&
    resolvedMarketplace !== undefined
      ? `${name}@${resolvedMarketplace}`
      : undefined;
  let resultPromise = installPlugin(
    spec,
    scope,
    options.config,
    grantKey,
    isListUnreadable ? undefined : resolvedTarget,
    storageV5,
    announceRefreshResult,
    {
      json: options.json,
      shownCommand,
      resolvedPlugin,
      replaceInstalledCopy: options.replace,
      npmRegistry: options.registry,
    },
  ).then(async (result) => {
    await logFeatureOkAsync("cli_plugin_install");
    return result;
  });
  if (options.json) {
    await resultPromise;
    await gracefulShutdown(0);
    return;
  }
  let renderRoot = await root();
  renderRoot.render(
    jsxProd_default(suspenseTypeExport, {
      fallback: jsxProd_default(Text, {
        children: stripInvisibleKeepEmoji(`Installing plugin "${spec}"...`),
      }),
      children: jsxProd_default(SuccessLine, {
        promise: resultPromise,
      }),
    }),
  );
  await renderRoot.waitUntilExit();
  await gracefulShutdown(0);
}
//@ chunk-jdfzheem.js:36274-36624 facade-exports (2.1.88 match: pluginUninstallHandler, 0.343)
/**
 * claude plugin uninstall：卸载插件（--keep-data、--prune、--json）。
 */
async function pluginUninstallHandler(getRoot, plugin, options, storage) {
  if (options.json && options.prune) cliError("--json cannot be used with --prune");
  if (options.cowork) setUseCoworkPlugins(true);
  let scope = requireInstallableScope(options);
  logPluginLoadErrors("tengu_plugin_uninstall_command", plugin, fromEnum(scope));
  let result = await uninstallPlugin(plugin, scope, options.keepData, options.prune, options.yes, storage, {
    json: options.json,
  });
  if (!options.json)
    await renderAndRun_2(
      await getRoot(),
      jsxProd_default(Text, {
        children: stripInvisibleKeepNewlines(options.prune ? result : `${figures_default.tick} ${result}`),
      }),
    );
  await logFeatureOkAsync("cli_plugin_uninstall");
  await exitAfterAnalyticsFlush(0);
}
//@ chunk-jdfzheem.js:36624-36872 facade-exports
async function pluginPruneHandler(getRoot, options, storage) {
  if (options.cowork) setUseCoworkPlugins(true);
  let scope = requireInstallableScope(options);
  logEvent("tengu_plugin_prune_command", {
    scope: fromEnum(scope),
    dry_run: options.dryRun ?? false,
  });
  let result = await prunePluginsCli(
    scope,
    {
      dryRun: options.dryRun,
      yes: options.yes,
    },
    storage,
  );
  await renderAndRun_2(
    getRoot,
    jsxProd_default(Text, {
      children: stripInvisibleKeepNewlines(result),
    }),
  );
  await logFeatureOkAsync("cli_plugin_prune");
  await exitAfterAnalyticsFlush(0);
}
//@ chunk-jdfzheem.js:36872-37603 facade-exports (2.1.88 match: enablePlugin, 0.424)
async function pluginEnableHandler(getRoot, plugin, options, storage) {
  if (options.cowork) setUseCoworkPlugins(true);
  let scope = pluginEnableHandler_2(options);
  logPluginLoadErrors("tengu_plugin_enable_command", plugin, fromEnum(scope ?? "auto"));
  let enabled;
  let isAliased = false;
  let target = plugin;
  try {
    await ensureSyncedPluginDirsRegistered();
    isPluginCommandContext();
    let pluginArgument = await resolvePluginArgument(plugin, options.json, storage, {
      unlessNamedInSettings: true,
    });
    isAliased = pluginArgument.aliased;
    target = pluginArgument.plugin;
    enabled = await enablePluginOp(pluginArgument.plugin, scope, storage);
    if (!enabled.success) throw new PluginOperationFailedError(enabled.message, enabled);
  } catch (error) {
    return await handlePluginCommandError(
      error,
      "enable",
      plugin,
      storage,
      options.json
        ? {
            scope,
          }
        : undefined,
      isAliased ? target : undefined,
    );
  }
  let note = withSettingsWarning(enabled.message, enabled.scope ?? scope);
  if (options.json)
    await writePluginResult({
      command: "enable",
      outcome: "ok",
      plugin,
      pluginId: enabled.pluginId,
      scope: enabled.scope ?? scope,
      message: stripInvisibleKeepNewlines(note),
    });
  else
    await renderAndRun_2(
      await getRoot(),
      jsxProd_default_2(Text, {
        children: [figures_default.tick, " ", stripInvisibleKeepNewlines(note)],
      }),
    );
  await logEventAsync("tengu_plugin_enabled_cli", {
    ...(await pluginTelemetryFields(enabled.pluginId || target, policyEnabledPluginNameSet(), storage)),
    scope: fromEnumOpt(enabled.scope),
    ...(isAliased
      ? {
          aliased_id: true,
        }
      : {}),
  });
  await logFeatureOkAsync("cli_plugin_enable");
  await exitAfterAnalyticsFlush(0);
}
//@ chunk-jdfzheem.js:37603-38142 facade-exports (2.1.88 match: pluginDisableHandler, 0.65)
/**
 * claude plugin disable：禁用单个或 --all 全部插件。
 */
async function pluginDisableHandler(getRoot, plugin, options, storage) {
  if (options.all && plugin) cliError("Cannot use --all with a specific plugin");
  if (!options.all && !plugin) cliError("Please specify a plugin name or use --all to disable all plugins");
  if (options.cowork) setUseCoworkPlugins(true);
  let scope;
  if (options.all) {
    if (options.scope) cliError("Cannot use --scope with --all");
    logEvent("tengu_plugin_disable_command", {});
    isPluginCommandContext();
    scope = await disableAllPlugins(storage, {
      json: options.json,
    });
  } else {
    let disableScope = pluginEnableHandler_2(options);
    logPluginLoadErrors("tengu_plugin_disable_command", plugin, fromEnum(disableScope ?? "auto"));
    await ensureSyncedPluginDirsRegistered();
    isPluginCommandContext();
    scope = await disablePlugin(plugin, disableScope, storage, {
      json: options.json,
    });
  }
  if (!options.json)
    await renderAndRun_2(
      await getRoot(),
      jsxProd_default(Text, {
        children: stripInvisibleKeepNewlines(scope),
      }),
    );
  await logFeatureOkAsync("cli_plugin_disable");
  await exitAfterAnalyticsFlush(0);
}
//@ chunk-jdfzheem.js:38142-38536 facade-exports (2.1.88 match: pluginUpdateHandler, 0.778)
/**
 * claude plugin update：按作用域更新插件。
 */
async function pluginUpdateHandler(root, options, storage) {
  if (options.cowork) setUseCoworkPlugins(true);
  let scope = options.cowork ? "user" : undefined;
  if (options.scope) {
    if (!VALID_UPDATE_SCOPES.includes(options.scope))
      cliError(`Invalid scope "${options.scope}". Valid scopes: ${VALID_UPDATE_SCOPES.join(", ")}`);
    scope = options.scope;
  }
  if (options.cowork && scope !== "user") cliError("--cowork can only be used with user scope");
  logPluginLoadErrors("tengu_plugin_update_command", root);
  if (!options.json) printPluginWarnings(await loadKnownMarketplacesSafe(storage));
  await updatePluginCli(
    root,
    scope,
    {
      yes: options.yes,
      json: options.json,
      acceptCommand: options.acceptCommand,
    },
    storage,
  );
}
//@ chunk-jdfzheem.js:38536-42452 facade-exports
/**
 * claude plugin details <name>：插件清单、组件与 token 开销估算。
 */
async function pluginDetailsHandler(getRoot, target, options, storage, credentials) {
  if (options.cowork) setUseCoworkPlugins(true);
  isPluginCommandContext();
  logEvent("tengu_plugin_details_command", {});
  let { getPluginInventory, computePluginTokenCost, scaleCharsToTokens } =
    await import("../../utils/plugins/pluginInventory.js");
  let { formatTokenEstimate } = await import("../../utils/format.js");
  await ensureSyncedPluginDirsRegistered();
  let { enabled, disabled } = await loadAllPlugins(isStorageV5Enabled() ? storage : undefined, credentials);
  let pluginId = parsePluginId((await resolvePluginArgument(target, options.json, storage)).plugin);
  let fullId = pluginId.marketplace ? joinPluginId(pluginId.name, pluginId.marketplace) : pluginId.name;
  let matchesPlugin = isOfficialMarketplace(pluginId.marketplace)
    ? (key) => nfcLower(key) === nfcLower(fullId)
    : (key) => pluginNamesEqual(key, fullId);
  let found = [...enabled, ...disabled].find((plugin) =>
    matchesPlugin(pluginId.marketplace ? plugin.source : plugin.name),
  );
  if (!found) {
    let catalogKey =
      (await getPluginDirectoryState()) !== "unavailable"
        ? Object.entries((await getInstalledPluginsAsync(storage)).plugins).find(([key, value]) => {
            let pluginIdentifier = parsePluginIdentifier(key);
            return (
              pluginIdentifier.marketplace === OFFICIAL_MARKETPLACE_NAME &&
              pluginNamesEqual(pluginId.marketplace ? key : pluginIdentifier.name, fullId) &&
              value.some(isInstallationRelevantToCurrentProject)
            );
          })?.[0]
        : undefined;
    let blockInfo = pluginDirectoryPolicyBlock();
    let blockedName =
      catalogKey !== undefined && blockInfo !== null ? parsePluginIdentifier(catalogKey).name : undefined;
    let missingCatalogName =
      catalogKey !== undefined &&
      blockInfo === null &&
      (await loadPluginDirectoryMarketplace(parsePluginIdentifier(catalogKey).name, storage)) === null
        ? parsePluginIdentifier(catalogKey).name
        : undefined;
    let reason =
      blockedName !== undefined
        ? "policy_blocked"
        : missingCatalogName !== undefined
          ? "directory_catalog_missing"
          : "not_found";
    let message =
      blockedName !== undefined && blockInfo !== null
        ? `${figures_default.cross} ${directoryBlockedMessage(blockedName, blockInfo)}`
        : missingCatalogName !== undefined
          ? `${figures_default.cross} Details for "${quotedPrintable(missingCatalogName)}" are not available: ${PLUGIN_DIRECTORY_CATALOG_MISSING}. ${RELOAD_PLUGINS_HINT}`
          : `Plugin "${quotedPrintable(target)}" not found. ${pluginId.marketplace === BUILTIN ? "Built-in plugins don't appear in `claude plugin list`. To see the ones available in a session, run /plugin in Claude Code and open the Installed tab." : "Run `claude plugin list` to see installed plugins, or pass --plugin-dir <path> to load one from disk."}`;
    return finishPluginDetails(getRoot, options.json, message, reason);
  }
  let marketplace = marketplaceSuffix(found.source) ?? INLINE_PLUGIN_MARKETPLACE;
  let models = options.models?.length ? options.models : [getMainLoopModel()];
  let tokenCost;
  try {
    let pluginInventory = await getPluginInventory(found, marketplace);
    tokenCost = await computePluginTokenCost(pluginInventory, models, found.name);
  } catch (error) {
    let isCatalogMissing = error instanceof PluginDirectoryCatalogMissingError;
    if (!isCatalogMissing)
      logError(withTelemetryMessage(toError(error), "plugin details: inventory/token-cost failed"));
    let reason = isCatalogMissing ? "directory_catalog_missing" : "inventory_failed";
    let message = isCatalogMissing
      ? `${figures_default.cross} Details for "${quotedPrintable(found.name)}" are not available: ${PLUGIN_DIRECTORY_CATALOG_MISSING}. ${RELOAD_PLUGINS_HINT}`
      : `${figures_default.cross} Could not load details for "${quotedPrintable(found.name)}": ${printableMessage(error)}`;
    return finishPluginDetails(getRoot, options.json, message, reason);
  }
  let { tokens, inventory } = tokenCost;
  if (options.json) {
    let stripPath = ({ path, ...entry }) => entry;
    await writeStdoutAndDrain(
      printJson({
        plugin: found.name,
        version: found.manifest.version,
        source: found.source,
        sha: found.sha ?? null,
        tokens,
        components: {
          ...inventory,
          commands: inventory.commands.map(stripPath),
          agents: inventory.agents.map(stripPath),
          skills: inventory.skills.map(stripPath),
        },
      }) +
        `
`,
    );
    await logFeatureOkAsync("cli_plugin_details");
    return;
  }
  let lines = [];
  let pluginDisplayName = getPluginDisplayName(found);
  let title = pluginDisplayName === found.name ? found.name : `${pluginDisplayName} (${found.name})`;
  lines.push(`${title} ${found.manifest.version ?? ""}`.trimEnd());
  if (found.manifest.description) {
    let [firstLine, ...restLines] = found.manifest.description.split(`
`);
    lines.push(`  Description: ${firstLine}`);
    for (let line of restLines) lines.push(`      ${line}`);
  }
  lines.push(`  Source: ${found.source}`);
  lines.push("");
  lines.push("Component inventory");
  let sections = [
    ["Skills", [...inventory.skills, ...inventory.commands].map((entry) => entry.name).sort(), ""],
    ["Agents", inventory.agents.map((agent) => agent.name), ""],
    ["Hooks", inventory.hooks, "  (harness-only \u2014 no model context cost)"],
    ["MCP servers", inventory.mcpServers, "  (tool schemas resolved at runtime; not counted)"],
    ["LSP servers", inventory.lspServers, "  (out-of-process tooling; no model context cost)"],
  ];
  for (let [label, names, note] of sections)
    lines.push(
      `  ${label} (${names.length})${names.length > 0 ? `  ${names.join(", ")}` : ""}${names.length > 0 ? note : ""}`,
    );
  lines.push("");
  let filtered = [...inventory.skills, ...inventory.agents, ...inventory.commands].filter(
    (component) => component.chars != null,
  );
  let charTotals = {
    always_on: filtered.reduce((acc, component) => acc + component.chars.always_on, 0),
    on_invoke: filtered.reduce((acc, component) => acc + component.chars.on_invoke, 0),
  };
  let tokenEstimate = tokens[models[0]];
  let alwaysOnTokens =
    tokenEstimate?.always_on ?? scaleCharsToTokens(charTotals.always_on, charTotals.always_on, undefined);
  lines.push("Projected token cost");
  lines.push(`  Always-on:   ~${alwaysOnTokens.toLocaleString()} tok   added to every session`);
  if (filtered.length > 0) {
    lines.push("");
    lines.push("Per-component (rounded)");
    let max = Math.max(...filtered.map((component) => component.name.length), 9);
    lines.push(`  ${"component".padEnd(max)}  ${"always-on".padStart(9)}  ${"on-invoke".padStart(9)}`);
    for (let component of filtered) {
      let alwaysOn = scaleCharsToTokens(
        component.chars.always_on,
        charTotals.always_on,
        tokenEstimate?.always_on,
      );
      let onInvoke = scaleCharsToTokens(
        component.chars.on_invoke,
        charTotals.on_invoke,
        tokenEstimate?.on_invoke,
      );
      lines.push(
        `  ${component.name.padEnd(max)}  ${formatTokenEstimate(alwaysOn).padStart(9)}  ${formatTokenEstimate(onInvoke).padStart(9)}`,
      );
    }
    lines.push("");
    lines.push("  On-invoke cost is paid each time a skill or agent fires.");
    lines.push("  Token counts are estimates and may differ from actual usage.");
  }
  let root = await getRoot();
  await renderAndRun_2(
    root,
    jsxProd_default(Text, {
      children: formatMessageLines(lines),
    }),
  );
  if (tokenEstimate) await logFeatureOkAsync("cli_plugin_details");
  else await logFeatureSadAsync("cli_plugin_details", "count_tokens_unreachable");
}
//@ chunk-jdfzheem.js:42452-42598 layout
async function finishPluginDetails(getRoot, json, message, reason) {
  let clean = stripInvisibleKeepNewlines(message);
  if (json) printCliError(clean);
  else
    await renderAndRun_2(
      await getRoot(),
      jsxProd_default(Text, {
        children: clean,
      }),
    );
  await logFeatureBadAsync("cli_plugin_details", reason);
  return json ? cliErrorAfterAnalyticsFlush() : exitAfterAnalyticsFlush(1);
}
//@ chunk-jdfzheem.js:42598-42640 layout
function formatMessageLines(lines) {
  return lines.map(stripInvisibleKeepEmoji).join(`
`);
}
//@ chunk-jdfzheem.js:42640-42719 layout
function printPluginWarnings(marketplaceConfig) {
  for (let { message } of listReservedNameRefusals(marketplaceConfig))
    console.error(`${figures_default.warning} ${message}`);
}
//@ chunk-jdfzheem.js:42719-42757 layout
function printJson(value) {
  return escapeControlChars(jsonStringify(value, null, 2));
}
//@ chunk-jdfzheem.js:42757-43024 layout
function filterInventoryBySource(marketplace, inventory) {
  let isFromMarketplace = (plugin) => marketplaceOf(plugin.source) === marketplace;
  let filtered = inventory.plugins.filter(isFromMarketplace);
  let filtered_2 = inventory.errors.filter(isFromMarketplace);
  let filtered_3 = inventory.warnings.filter(isFromMarketplace);
  return {
    plugins: filtered,
    errors: filtered_2,
    warnings: filtered_3,
    standaloneErrorRows: filtered_2.filter(
      (error) => !filtered.some((plugin) => sameSourceAndName(error, plugin)),
    ),
    standaloneWarningRows: filtered_3.filter(
      (warning) => !filtered.some((plugin) => sameSourceAndNameAlt(warning, plugin)),
    ),
  };
}
//@ chunk-jdfzheem.js:43024-43131 layout
function hasInventoryRows(options) {
  return (
    options.plugins.length > 0 ||
    options.standaloneErrorRows.length > 0 ||
    options.standaloneWarningRows.length > 0
  );
}
//@ chunk-jdfzheem.js:43131-43976 fingerprint (2.1.88 match: pluginListHandler, 0.486)
function pluginListHandler_2(options) {
  if (!hasInventoryRows(options)) return [];
  let { standaloneErrorRows, standaloneWarningRows } = options;
  let allLoadedPlugins = [options.header, ""];
  for (let warning of standaloneWarningRows)
    allLoadedPlugins.push(`  ${figures_default.warning} ${pluginWarningText(warning)}`, "");
  for (let plugin of options.plugins) {
    let inlinePlugins = options.errors.filter((error) => sameSourceAndName(error, plugin));
    let inlineLoadErrors = options.warnings.filter((warning) => sameSourceAndNameAlt(warning, plugin));
    let requiredSuffix =
      plugin.enabled !== false && isRequiredPlugin(plugin.source, plugin.installationPreference)
        ? " \xB7 required by your org"
        : "";
    let status =
      (plugin.enabled === false
        ? `${figures_default.cross} disabled`
        : inlinePlugins.length > 0
          ? `${figures_default.cross} loaded with errors`
          : `${figures_default.tick} loaded`) + requiredSuffix;
    allLoadedPlugins.push(`  ${figures_default.pointer} ${plugin.source}`);
    allLoadedPlugins.push(`    Version: ${plugin.manifest.version ?? "unknown"}`);
    if (options.showScope) allLoadedPlugins.push(`    Scope: ${options.scopeOf(plugin)}`);
    allLoadedPlugins.push(`    Path: ${options.pathOf(plugin)}`);
    allLoadedPlugins.push(`    Status: ${status}`);
    for (let error of inlinePlugins) allLoadedPlugins.push(`    Error: ${pluginErrorText(error)}`);
    for (let inlineLoadError of inlineLoadErrors)
      allLoadedPlugins.push(`    Note: ${pluginWarningText(inlineLoadError)}`);
    allLoadedPlugins.push("");
  }
  for (let error of standaloneErrorRows)
    allLoadedPlugins.push(
      `  ${figures_default.pointer} ${error.source}: ${figures_default.cross} ${pluginErrorText(error)}`,
      "",
    );
  return allLoadedPlugins;
}
//@ chunk-jdfzheem.js:43976-44043 sole-consumer
function toValidationIssue({ path, message }) {
  return {
    path,
    message,
    code: null,
  };
}
//@ chunk-jdfzheem.js:44043-44280 sole-consumer
function toValidationFileJson(result) {
  return {
    file: result.filePath,
    type: result.fileType,
    errors: result.errors.map(toValidationIssue),
    warnings: result.warnings.map(toValidationIssue),
    notes: result.notes ?? [],
    gatingHooks: (result.gatingHooks ?? []).map((hook) => ({
      module: hook.module,
      pattern: hook.pattern,
      hook: hook.hook,
      hasCatch: hook.hasCatch,
    })),
  };
}
//@ chunk-jdfzheem.js:44280-44454 sole-consumer
function buildValidateJsonOutput(target, summary, advice, directory) {
  return {
    success: summary.success,
    strict: summary.strict,
    target: target.resolvedPath,
    manifest: target.manifest ? toValidationFileJson(target.manifest) : null,
    contents: target.contents.map(toValidationFileJson),
    advice,
    directory,
  };
}
//@ chunk-jdfzheem.js:44454-45370 sole-consumer
/**
 * 把插件错误/警告对象压成 JSON 列表里的 detail：type 加上 plugin、marketplace、依赖、服务器名、组件、路径、URL、related（遮蔽者/改名/阻塞者）等能识别的字段。
 */
function pluginIssueDetail(issue) {
  let issueInput = issue;
  let readString = (field) => {
    let value = issueInput[field];
    return typeof value === "string" ? value : undefined;
  };
  let detail = {
    type: issue.type,
  };
  let pluginName = readString("plugin") ?? readString("pluginId");
  if (pluginName !== undefined) detail.plugin = pluginName;
  let marketplace = readString("marketplace");
  if (marketplace !== undefined) detail.marketplace = marketplace;
  let dependency = readString("dependency");
  if (dependency !== undefined) detail.dependency = dependency;
  let serverName = readString("serverName");
  if (serverName !== undefined) detail.serverName = serverName;
  let component = readString("component");
  if (component !== undefined) detail.component = component;
  let path =
    readString("manifestPath") ??
    readString("path") ??
    readString("folderPath") ??
    readString("hookPath") ??
    readString("mcpbPath") ??
    readString("installPath") ??
    readString("filePath") ??
    readString("heldAt");
  if (path !== undefined) detail.path = path;
  let url = readString("url") ?? readString("gitUrl");
  if (url !== undefined) detail.url = url;
  if (issue.type === "marketplace-not-found" && issue.registrationHidden !== undefined)
    detail.registrationHidden = issue.registrationHidden;
  let relatedRaw = readString("duplicateOf") ?? readString("activeServer");
  let pluginFromRef = relatedRaw?.startsWith("plugin:") ? relatedRaw.split(":")[1] : undefined;
  let blockedBy = issueInput.blockedBy;
  let related =
    readString("shadowedBy") ??
    readString("renamedTo") ??
    pluginFromRef ??
    (Array.isArray(blockedBy) && blockedBy.every((blocker) => typeof blocker === "string")
      ? blockedBy.join(", ")
      : undefined);
  if (related !== undefined) detail.related = related;
  return detail;
}
//@ chunk-jdfzheem.js:45370-46318 sole-consumer
/**
 * 生成 claude plugin list --json 的条目：每个已装插件的 id、版本、作用域、启用状态、安装路径、MCP 服务器、错误与提示（文字与 detail）；另加独立的错误行与警告行。
 */
async function buildPluginListJson(listing, credentials) {
  let rows = [];
  for (let plugin of listing.plugins) {
    let mcpConfigs =
      plugin.mcpServers ||
      (await loadPluginMcpServersFromSources(plugin, undefined, credentials, undefined, {
        readOnlyListing: true,
      }));
    let filtered = listing.errors.filter((error) => sameSourceAndName(error, plugin));
    let filtered_2 = listing.warnings.filter((warning) => sameSourceAndNameAlt(warning, plugin));
    let mapped = filtered.map(pluginErrorText);
    let mapped_2 = filtered_2.map(pluginWarningText);
    rows.push({
      id: plugin.source,
      version: plugin.manifest.version ?? "unknown",
      scope: listing.scopeOf(plugin),
      enabled: plugin.enabled !== false,
      installPath: plugin.path,
      mcpServers:
        mcpConfigs && Object.keys(mcpConfigs).length > 0 ? configuredMcpServers(mcpConfigs) : undefined,
      errors: mapped.length > 0 ? mapped : undefined,
      notes: mapped_2.length > 0 ? mapped_2 : undefined,
      errorDetails: filtered.length > 0 ? filtered.map(pluginIssueDetail) : undefined,
      noteDetails: filtered_2.length > 0 ? filtered_2.map(pluginIssueDetail) : undefined,
      hasUserConfig: hasPluginUserConfig(plugin),
    });
  }
  for (let error of listing.standaloneErrorRows)
    rows.push({
      id: error.source,
      version: "unknown",
      scope: listing.standaloneErrorScope,
      enabled: false,
      installPath: ("path" in error ? error.path : undefined) ?? "",
      errors: [pluginErrorText(error)],
      errorDetails: [pluginIssueDetail(error)],
    });
  for (let warning of listing.standaloneWarningRows)
    rows.push({
      id: warning.source,
      version: "unknown",
      scope: listing.standaloneWarningScope,
      enabled: warning.type === "synced-plugin-shadowed",
      installPath: "",
      notes: [pluginWarningText(warning)],
      noteDetails: [pluginIssueDetail(warning)],
    });
  return rows;
}
//@ chunk-jdfzheem.js:46406-46446 placement
function cleanOptionTitle(fallbackTitle, command) {
  return stripInvisibleKeepEmoji(command?.title || fallbackTitle);
}
//@ chunk-jdfzheem.js:46446-46517 placement
let OptionParseError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-jdfzheem.js:46446", () => {
  OptionParseError = class OptionParseError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    option;
    constructor(message, telemetryMessage, option) {
      super(message, telemetryMessage);
      this.option = option;
    }
  };
});
//@ chunk-jdfzheem.js:46517-46696 placement
/**
 * 把输入校验为"值全是字符串的普通对象"并复制到无原型对象；不是对象或有非字符串值时返回 undefined。
 */
function parseStringRecord(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return;
  let record = Object.create(null);
  for (let [key, value_2] of Object.entries(value)) {
    if (typeof value_2 !== "string") return;
    record[key] = value_2;
  }
  return record;
}
//@ chunk-jdfzheem.js:46696-46719 placement
/**
 * plugin configure --values-stdin 读取上限 256 KB
 */
var MAX_VALUES_STDIN_BYTES = 262144;
var MAX_OPTION_VALUE_BYTES = 65536;
//@ chunk-jdfzheem.js:46719-46885 placement (2.1.88 match: getOptions, 0.607)
async function getOptions() {
  process.stdin.setEncoding("utf8");
  let text = "";
  let bytes = 0;
  for await (let chunk of iterateStreamUntilClose(process.stdin)) {
    bytes += Buffer.byteLength(chunk, "utf8");
    if (bytes > MAX_VALUES_STDIN_BYTES) return;
    text += chunk;
  }
  return text;
}
//@ chunk-jdfzheem.js:46885-48371 layout
/**
 * claude plugin configure：校验每个选项已在 userConfig 声明、单行且不超过 64 KB、必填不为空、布尔/数字格式正确，再按 schema 校验后保存，返回改动的键。
 */
async function configurePluginOptions(plugin, values, scope, credentials) {
  let userConfig = plugin.manifest.userConfig ?? {};
  let filtered = Object.keys(values).filter((key) => !Object.hasOwn(userConfig, key));
  if (filtered.length > 0) {
    let mapped = Object.keys(userConfig).map(stripInvisibleKeepEmoji);
    throw new OptionParseError(
      `This plugin has no ${plural(filtered.length, "option")} ${filtered.map((key) => `"${stripInvisibleKeepEmoji(key)}"`).join(", ")}.` +
        (mapped.length > 0 ? ` Known options: ${mapped.join(", ")}.` : ""),
      "plugin configure: option not declared in userConfig",
    );
  }
  let pluginId = marketplaceSource(plugin);
  let initialValues = await loadPluginOptions(pluginId, credentials);
  for (let [key, value] of Object.entries(values)) {
    if (Buffer.byteLength(value, "utf8") > MAX_OPTION_VALUE_BYTES)
      throw new OptionParseError(
        `${cleanOptionTitle(key, userConfig[key])} is too long (over 64 KB).`,
        "plugin configure: option value over the size cap",
        key,
      );
    if (/[\r\n]/.test(value))
      throw new OptionParseError(
        `${cleanOptionTitle(key, userConfig[key])} must be a single line.`,
        "plugin configure: option value contains a line break",
        key,
      );
    let optionSchema = userConfig[key];
    let trimmed = value.trim();
    let currentValue = getOwn(initialValues, key);
    if (
      trimmed === "" &&
      optionSchema?.required === true &&
      !(optionSchema.sensitive === true && currentValue !== undefined && currentValue !== "")
    )
      throw new OptionParseError(
        `${cleanOptionTitle(key, optionSchema)} is required but not provided`,
        "plugin configure: required option blank",
        key,
      );
    if (optionSchema?.type === "boolean" && trimmed !== "" && truthyOrFalsyEnv(trimmed) === undefined)
      throw new OptionParseError(
        `${cleanOptionTitle(key, optionSchema)} must be true or false (or 1/0, yes/no, on/off).`,
        "plugin configure: option value is not a boolean",
        key,
      );
    if (
      optionSchema?.type === "number" &&
      trimmed !== "" &&
      parseBoundedNumber(trimmed, optionSchema) === undefined
    )
      throw new OptionParseError(
        `${cleanOptionTitle(key, optionSchema)}: ${getFormatHint(optionSchema)}`,
        "plugin configure: option value is not a number the field takes",
        key,
      );
  }
  let finalValues = buildFinalValues(Object.keys(values), values, userConfig, initialValues);
  let keys = Object.keys(finalValues);
  if (keys.length === 0) return [];
  for (let key of keys) {
    let validation = validateUserConfig(
      {
        [key]: finalValues[key],
      },
      {
        [key]: userConfig[key],
      },
    );
    if (!validation.valid)
      throw new OptionParseError(
        stripInvisibleKeepEmoji(validation.errors.join("; ")),
        "plugin configure: value rejected by the userConfig schema",
        key,
      );
  }
  await savePluginOptions(pluginId, finalValues, userConfig, scope, credentials);
  return keys;
}
//@ chunk-jdfzheem.js:48371-48440 layout
function redactSubstrings(secrets, text) {
  return secrets.reduce((acc, secret) => acc.split(secret).join("\u2026"), text);
}
//@ chunk-jdfzheem.js:48440-51564 facade-exports
async function pluginConfigureHandler(target, options, scope, credentials) {
  if (options.cowork) setUseCoworkPlugins(true);
  isPluginCommandContext();
  logEvent("tengu_plugin_configure_command", {});
  await ensureSyncedPluginDirsRegistered();
  let { enabled, disabled } = await loadAllPlugins(scope, credentials);
  let plugin = findMarketplace([...enabled, ...disabled], target);
  if (!plugin) {
    await logFeatureBadAsync("cli_plugin_configure", "not_found");
    return cliErrorAfterAnalyticsFlush(
      stripInvisibleKeepNewlines(
        `No installed plugin has the id "${stripInvisibleKeepEmoji(target)}". Use its full id (name@marketplace), as \`claude plugin list${options.cowork ? " --cowork" : ""}\` shows it.`,
      ),
    );
  }
  let pluginId = marketplaceSource(plugin);
  let userConfig = plugin.manifest.userConfig ?? {};
  let pluginDisplayName = getPluginDisplayName(plugin);
  let exampleHint = "Example: claude plugin configure <plugin> --values-stdin < values.json";
  if (options.valuesStdin) {
    if (process.stdin.isTTY) {
      await logFeatureBadAsync("cli_plugin_configure", "invalid_stdin");
      return cliErrorAfterAnalyticsFlush(
        stripInvisibleKeepNewlines(`No option values were piped in. ${exampleHint}`),
      );
    }
    let parsedInput;
    let isTooLarge = false;
    try {
      let options = await getOptions();
      isTooLarge = options === undefined;
      parsedInput = options === undefined ? undefined : jsonParse(options);
    } catch {
      parsedInput = undefined;
    }
    let stringRecord = parseStringRecord(parsedInput);
    if (stringRecord === undefined) {
      await logFeatureBadAsync("cli_plugin_configure", "invalid_stdin");
      return cliErrorAfterAnalyticsFlush(
        stripInvisibleKeepNewlines(
          isTooLarge
            ? "The input on stdin is over the 256 KB limit."
            : `The input on stdin isn't a JSON object of strings. ${exampleHint}`,
        ),
      );
    }
    let secrets = Object.entries(stringRecord)
      .filter(([key]) => Object.hasOwn(userConfig, key) && userConfig[key]?.sensitive)
      .flatMap(([, value]) => [value, value.trim()])
      .filter((value) => value !== "")
      .sort((a, b) => b.length - a.length);
    let savedKeys;
    try {
      savedKeys = await configurePluginOptions(plugin, stringRecord, scope, credentials);
    } catch (error) {
      if (error instanceof OptionParseError)
        await logFeatureSadAsync("cli_plugin_configure", "value_refused");
      else await logFeatureBadAsync("cli_plugin_configure", "save_failed");
      if (options.json && error instanceof OptionParseError) {
        let failureJson = {
          pluginId,
          displayName: pluginDisplayName,
          refused: {
            option: error.option,
            message: redactSubstrings(secrets, error.message),
          },
        };
        await writeStdoutAndDrain(
          printJson(failureJson) +
            `
`,
        );
      }
      return cliErrorAfterAnalyticsFlush(
        stripInvisibleKeepNewlines(
          redactSubstrings(secrets, `Failed to save configuration: ${errorMessage(error)}`),
        ),
      );
    }
    let unconfiguredKeys;
    try {
      unconfiguredKeys = Object.keys(await getUnconfiguredOptions(plugin, credentials));
    } catch (error) {
      logForDebugging(
        redactSubstrings(
          secrets,
          `plugin configure: saved, but the re-read of unset options failed: ${errorMessage(error)}`,
        ),
        {
          level: "error",
        },
      );
    }
    await logFeatureOkAsync("cli_plugin_configure");
    if (options.json) {
      let resultJson = {
        pluginId,
        displayName: pluginDisplayName,
        saved: savedKeys,
        ...(unconfiguredKeys === undefined
          ? {}
          : {
              unconfigured: unconfiguredKeys,
            }),
      };
      await writeStdoutAndDrain(
        printJson(resultJson) +
          `
`,
      );
    } else
      await writeStdoutAndDrain(
        (savedKeys.length > 0
          ? "Configuration saved. Restart Claude Code to apply it."
          : "No configuration changes.") +
          `
`,
      );
    await exitAfterAnalyticsFlush(0);
    return;
  }
  let saved;
  let unconfigured;
  try {
    saved = await loadPluginOptions(pluginId, credentials);
    unconfigured = Object.keys(await getUnconfiguredOptions(plugin, credentials));
  } catch (error) {
    await logFeatureBadAsync("cli_plugin_configure", "saved_options_read_failed");
    return cliErrorAfterAnalyticsFlush(
      stripInvisibleKeepNewlines(
        `Could not read the saved options for "${pluginId}": ${errorMessage(error)}`,
      ),
    );
  }
  let options_2 = trustedPluginSetting(pluginId).options ?? {};
  let configuredKeys = [];
  let safeValues = Object.create(null);
  for (let [key, value] of Object.entries(userConfig)) {
    let savedValue = getOwn(saved, key);
    if (savedValue === undefined || savedValue === "") continue;
    configuredKeys.push(key);
    if (value.type === "boolean") {
      safeValues[key] = savedValue;
      continue;
    }
    let stored = Object.hasOwn(options_2, key) ? options_2[key] : undefined;
    if (value.sensitive !== true && stored !== undefined && stored !== "") safeValues[key] = stored;
  }
  let choices = {};
  for (let [key, value] of Object.entries(userConfig)) {
    let parser = userConfigFieldParser(value);
    if (parser !== undefined) choices[key] = parser;
  }
  await logFeatureOkAsync("cli_plugin_configure");
  if (options.json) {
    let reportJson = {
      pluginId,
      displayName: pluginDisplayName,
      schema: userConfig,
      inputs: pluginUserConfigValues(userConfig, safeValues),
      choices,
      configured: configuredKeys,
      unconfigured,
    };
    await writeStdoutAndDrain(
      printJson(reportJson) +
        `
`,
    );
    await exitAfterAnalyticsFlush(0);
    return;
  }
  let lines = [];
  if (Object.keys(userConfig).length === 0)
    lines.push(`${pluginDisplayName} (${pluginId}) has no options to set.`);
  else {
    lines.push(`Options for ${pluginDisplayName} (${pluginId}):`);
    for (let [key, value] of Object.entries(userConfig)) {
      let filtered = [
        value.required ? "required" : "optional",
        value.sensitive ? "sensitive" : undefined,
        configuredKeys.includes(key) ? "set" : "not set",
      ].filter(Boolean);
      let titleSuffix = value.title && value.title !== key ? ` \u2014 ${value.title}` : "";
      lines.push(`  ${figures_default.pointer} ${key}${titleSuffix} (${filtered.join(", ")})`);
    }
    lines.push(
      "",
      "Set values with /plugin configure <plugin> in Claude Code, or pipe a JSON object to `claude plugin configure <plugin> --values-stdin`.",
    );
  }
  await writeStdoutAndDrain(
    formatMessageLines(lines) +
      `
`,
  );
  await exitAfterAnalyticsFlush(0);
}
//@ chunk-jdfzheem.js:51564-51623 sole-consumer
function configuredMcpServers(servers) {
  return import_mapValues(servers, (server) => omitAlias(server, "configuredCommand"));
}
//@ chunk-zde45n7x.js:16222-17102 placement
/**
 * plugin install --marketplace 相关的帮助文本与辅助：添加市场/从市场安装的提示、市场源非法与需要裸插件名的说明、"市场已添加"注记、保留名判定与错误构造、日志与 error_ 前缀剥离。
 */
var PLUGIN_INSTALL_MARKETPLACE_USAGE; // deferred: uses RECORDABLE_NAME_RE (../../utils/plugins/validatePlugin.js) of its import cycle while loading; runs once the cycle is complete
var PLUGIN_ADD_MARKETPLACE_HELP;
var PLUGIN_INSTALL_FROM_MARKETPLACE_HELP;
var INVALID_MARKETPLACE_SOURCE_HINT;
var MARKETPLACE_NEEDS_BARE_NAME_HINT;
var MARKETPLACE_ADDED_NOTE;
var isReservedMarketplaceNameForPlugin;
var reservedMarketplaceNameError;
var formatLines;
var logMarketplaceAdded;
var stripErrorPrefix;
deferInit("chunk-zde45n7x.js:16222", () => {
  PLUGIN_INSTALL_MARKETPLACE_USAGE = "claude plugin install <plugin> --marketplace <source>";
  PLUGIN_ADD_MARKETPLACE_HELP = "add marketplace";
  PLUGIN_INSTALL_FROM_MARKETPLACE_HELP = "install from marketplace";
  INVALID_MARKETPLACE_SOURCE_HINT = `${INVALID_MARKETPLACE_SOURCE_MESSAGE} (a marketplace already added is named after the plugin instead: <plugin>@<marketplace>)`;
  MARKETPLACE_NEEDS_BARE_NAME_HINT = `--marketplace needs the plugin's bare name. ${PLUGIN_ID_PART_RULE_TEXT} Usage: ${PLUGIN_INSTALL_MARKETPLACE_USAGE}`;
  MARKETPLACE_ADDED_NOTE = " The marketplace itself was added, and is declared in user settings.";
  isReservedMarketplaceNameForPlugin = (name) =>
    !isValidPluginIdSegment(name) || isReservedMarketplaceName(name.toLowerCase());
  reservedMarketplaceNameError = (name, wasAdded) =>
    Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Marketplace ${jsonStringify(name)} can't be named after a plugin as <plugin>@<marketplace>, so nothing was installed from it.` +
          (wasAdded ? MARKETPLACE_ADDED_NOTE : ""),
        "install --marketplace: the marketplace name is no plugin id half",
      ),
      {
        pluginCommandErrorCategory: "validation",
      },
    );
  formatLines = (lines) => `${lines.map(stripInvisibleKeepEmoji).join(`
`)}
`;
  logMarketplaceAdded = (name, marketplace) =>
    logEventAsync("tengu_marketplace_added", {
      _PROTO_marketplace_name: name,
      source_type: fromEnum(marketplace.source),
      repo_hash: marketplace.source === "github" ? shortHash(marketplace.repo) : undefined,
      is_official_marketplace: isOfficialMarketplaceName_3(name),
    });
  stripErrorPrefix = (text) => text.replace(/^error_/, "");
});
//@ chunk-zde45n7x.js:17102-18380 placement
async function pluginInstallFromMarketplace(
  marketplaceName,
  { plugins, marketplaceSource, options },
  { storageV5, credentials },
) {
  let validated = validateMarketplaceInstallArgs({
    plugins,
    marketplaceSource,
    commandLine: PLUGIN_INSTALL_MARKETPLACE_USAGE,
  });
  if ("usageError" in validated) return cliError(`${figures_default.cross} ${validated.usageError}`);
  if (!isValidPluginIdSegment(validated.plugin))
    return cliError(`${figures_default.cross} ${MARKETPLACE_NEEDS_BARE_NAME_HINT}`);
  let scope = requireInstallableScope(options);
  let lines = [];
  let resolvedMarketplace;
  let failureHelp = PLUGIN_ADD_MARKETPLACE_HELP;
  try {
    let marketplaceInput = await parseMarketplaceInput(validated.marketplaceSource);
    if (!marketplaceInput || "error" in marketplaceInput)
      throw withMarketplaceFailureCode(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          marketplaceInput?.error ?? INVALID_MARKETPLACE_SOURCE_HINT,
          "install --marketplace: the value is not a marketplace source",
        ),
        marketplaceInput?.unreadable === true ? undefined : "invalid_source",
      );
    let existingName = await linkMarketplaceInUse(marketplaceInput, storageV5);
    if (existingName === undefined) {
      if (!options.json)
        await writeStdoutAndDrain(`Adding marketplace\u2026
`);
      let { name: addedName, resolvedSource } = await addMarketplaceSource(
        marketplaceInput,
        (message) => {
          lines.push(message);
        },
        storageV5,
        undefined,
        {
          refuseNameCollision: true,
        },
      );
      let { error } = await saveMarketplaceToSettings(
        addedName,
        {
          source: resolvedSource,
        },
        "userSettings",
        storageV5,
      );
      if (error) throw error;
      refreshPluginCaches(storageV5, credentials);
      await logMarketplaceAdded(addedName, marketplaceInput);
      resolvedMarketplace = addedName;
      lines.push(
        `${figures_default.tick} Successfully added marketplace: ${addedName} (declared in user settings)`,
      );
    } else {
      resolvedMarketplace = existingName;
      lines.push(`Marketplace '${existingName}' is already added`);
    }
    if (isReservedMarketplaceNameForPlugin(resolvedMarketplace)) {
      failureHelp = PLUGIN_INSTALL_FROM_MARKETPLACE_HELP;
      throw reservedMarketplaceNameError(resolvedMarketplace, existingName === undefined);
    }
  } catch (error) {
    let kind = pluginErrorKind(error);
    if (!options.json && failureHelp === PLUGIN_INSTALL_FROM_MARKETPLACE_HELP)
      await writeStdoutAndDrain(formatLines(lines));
    if (options.json)
      await writePluginResult({
        command: "install",
        outcome: "failed",
        plugin: validated.plugin,
        scope,
        message: stripInvisibleKeepNewlines(errorMessage(error)),
        failureCode: kind,
      });
    await (error instanceof CommandSourceError && classifyCommandSourceError(error).kind === "sad"
      ? logFeatureSadAsync("cli_plugin_install", stripErrorPrefix(kind))
      : logFeatureBadAsync("cli_plugin_install", stripErrorPrefix(kind)));
    await flushAnalyticsBeforeExit();
    return handleMarketplaceError(error, failureHelp);
  }
  if (!options.json) await writeStdoutAndDrain(formatLines(lines));
  await pluginInstallHandler(
    marketplaceName,
    `${validated.plugin}@${resolvedMarketplace}`,
    options,
    storageV5,
  );
}
export {
  listAvailablePluginSubcommands,
  PLUGIN_SUBCOMMANDS,
  INVALID_MARKETPLACE_SOURCE_MESSAGE,
  handleMarketplaceError,
  linkMarketplaceInUse,
  marketplaceAddHandler,
  marketplaceListHandler,
  marketplaceRemoveHandler,
  marketplaceUpdateHandler,
  pluginConfigureHandler,
  pluginDetailsHandler,
  pluginDisableHandler,
  pluginEnableHandler,
  pluginInitHandler,
  pluginInstallHandler,
  pluginListHandler,
  pluginPruneHandler,
  pluginTagHandler,
  pluginUninstallHandler,
  pluginUpdateHandler,
  pluginValidateHandler,
  requireInstallableScope,
  pluginInstallFromMarketplace,
};
