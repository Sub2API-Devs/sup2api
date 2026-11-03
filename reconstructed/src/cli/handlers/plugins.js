/**
 * cli/handlers/plugins.ts
 *
 * 并入旧版已有路径：plugin 子命令（init/validate/tag、从 marketplace 安装）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/handlers/plugins.ts
 * pieces: chunk-d4eg9at2.js (62), chunk-y5m1jrzk.js (2), chunk-z2kk8ttr.js (2)
 * attribution: placement 18, facade-exports 20, layout 16, fingerprint 2, sole-consumer 8, file-local 1, affinity 1
 */
import { join, relative, resolve } from "path";
import { init_react_production, Qr, fo } from "../../../vendor/react/cjs/react.production.js";
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
  PLUGIN_ID_PART_RULE,
} from "../../utils/plugins/validatePlugin.js";
import { logError } from "../../utils/log.js";
import { readmeAdviceFor, formatAdviceLines } from "../../services/plugins/pluginReadmeAdvice.js";
import { renderAndRun, RenderOnceAndExit } from "../../utils/staticRender.js";
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
import { renderAndRun_2 } from "../../interactiveHelpers.js";
import {
  pluginNameProblem,
  PLUGIN_COMPONENT_KINDS,
  pluginManifestTemplate,
  scaffoldPlugin,
} from "./pluginScaffold.js";
import { tildify } from "../../utils/path.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
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
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { ResultMessages } from "../../utils/withResolvers.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { pluginTelemetryFields } from "../../utils/telemetry/pluginTelemetryName.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { getPluginDisplayName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import {
  marketplaceSource,
  loadPluginOptions,
  savePluginOptions,
  findMarketplace,
  getUnconfiguredOptions,
} from "../../utils/plugins/pluginOptionsStorage.js";
import { MAX_OPTION_VALUE_BYTES, getOptions_2 } from "../../ink/root.js";
import { getOwn } from "../../utils/objectSafety.js";
import { truthyOrFalsyEnv, parseBoundedNumber, getFormatHint } from "../../utils/plugins/pluginConfigEnv.js";
import { buildFinalValues } from "../../commands/plugin/PluginOptionsDialog.js";
import { validateUserConfig } from "../../utils/plugins/mcpbHandler.js";
import { trustedPluginSetting } from "../../utils/plugins/pluginConfigSources.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { shardedSnowflakeOff } from "../../utils/plugins/pluginGates.js";
import { areHooksModulesActive } from "../../services/analytics/growthbookCredentials.js";
import { validateMarketplaceInstallArgs } from "../../commands/plugin/parseArgs.js";
import { classifyCommandSourceError } from "../../utils/plugins/headersHelper.js";

//@ chunk-d4eg9at2.js:2435-2439 placement
init_react_production();
//@ chunk-d4eg9at2.js:2497-2549 placement
var installedVersionOf = (s, o) => (s === undefined ? undefined : o?.manifest.version);
//@ chunk-d4eg9at2.js:2549-2697 placement
async function resolveLocalPluginFolder(pluginId, installed, options) {
  if (installed !== undefined) return installed.readFromFolderAt === undefined ? undefined : installed.path;
  let pluginSourceLocation = await resolvePluginSourceLocation(pluginId, options);
  return pluginSourceLocation.kind === "folder" ? pluginSourceLocation.path : undefined;
}
//@ chunk-d4eg9at2.js:2697-2815 placement
async function resolvePluginVersions(s, o, options) {
  let results = await Promise.all(s.map((p) => resolveLocalPluginFolder(p, o.get(p), options)));
  return new Map(s.map((p, g) => [p, results[g]]));
}
//@ chunk-d4eg9at2.js:2815-2889 placement
function displayVersion(version, o, i) {
  return (i === undefined ? version : (o?.manifest.version ?? version)) || "unknown";
}
//@ chunk-d4eg9at2.js:2889-2950 placement
async function writeJsonLine(s) {
  await writeStdoutAndDrain(
    escapeControlChars(
      jsonStringify({
        ...s,
        nonce: readResultNonce(),
      }),
    ) +
      `
`,
  );
}
//@ chunk-d4eg9at2.js:2950-3029 placement
function pluginErrorKind(s) {
  if (s instanceof MarketplaceError) return s.reason.kind;
  return getMarketplaceFailureCode(s) ?? classifyPluginCommandError(s);
}
//@ chunk-d4eg9at2.js:3029-3138 placement
function declaredErrorLines(marketplace, declaredInSettings) {
  return reservedMarketplaceNameMessage(marketplace, {
    declaredInSettings,
  }).map((i, u) => `${u === 0 ? "    Error: " : "           "}${i}`);
}
//@ chunk-d4eg9at2.js:3138-3249 placement
async function logPluginCommandFailure(s, error, i) {
  if (error instanceof CommandSourceError) await logFeatureSadAsync(s, "command_source_refused");
  else await logFeatureBadAsync(s, i);
  await flushAnalyticsBeforeExit();
}
//@ chunk-d4eg9at2.js:3249-3681 placement
function marketplaceUpdateSummary(attempted, policyRefused, failed, u = 0, builtInSkipped = []) {
  let g = attempted - policyRefused.length - failed.length;
  let P = [];
  if (policyRefused.length > 0)
    P.push(
      marketplacesRefusedByPolicyClause(
        policyRefused.length,
        policyRefused.map((y) => displayMarketplaceName(y)),
      ),
    );
  if (failed.length > 0)
    P.push(
      formatRefreshFailedMessage(
        failed.length,
        failed.map((y) => displayMarketplaceName(y)),
      ),
    );
  if (u > 0)
    P.push(
      `${u} ${plural(u, "marketplace")} skipped (nothing to refresh: declared in settings, managed, or not allowed)`,
    );
  if (builtInSkipped.length > 0)
    P.push(`${OFFICIAL_MARKETPLACE_DISPLAY} (built in) could not be refreshed and was skipped (see --debug)`);
  return {
    messages: P,
    summary: pluginUpdateSummary(g, policyRefused.length, failed.length),
  };
}
//@ chunk-d4eg9at2.js:3681-4007 placement
function pluginUpdateSummary(s, o, i) {
  let u = marketplaceUpdateIcon({
    failedCount: i,
    updatedCount: s,
    policyRefusedCount: o,
  });
  let p =
    i > 0
      ? s > 0
        ? `Updated ${s} ${plural(s, "marketplace")}, but not all`
        : "No marketplaces were updated"
      : s > 0
        ? `Successfully updated ${s} ${plural(s, "marketplace")}`
        : o > 0
          ? "No marketplaces were updated"
          : "No marketplaces needed updating";
  return u === null ? p : `${u} ${p}`;
}
//@ chunk-d4eg9at2.js:4007-4192 facade-exports = handleMarketplaceError (0.768)
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
//@ chunk-d4eg9at2.js:4192-4321 layout
async function reportOperationFailure(error, o, i, error_2 = error) {
  if (i !== undefined)
    await writeJsonLine({
      ...i,
      outcome: "failed",
      message: stripInvisibleKeepNewlines(errorMessage(error)),
      failureCode: pluginErrorKind(error_2),
    });
  return handleMarketplaceError(error, o);
}
//@ chunk-d4eg9at2.js:4321-4378 layout
function asMarketplaceError(error, o = 300) {
  return error instanceof CommandSourceError ? error : printableName(errorMessage(error), o);
}
//@ chunk-d4eg9at2.js:4378-4885 fingerprint = printValidationResult (0.867)
function printValidationResult(result) {
  let o = [];
  if (result.errors.length > 0) {
    o.push(
      `${figures_default.cross} Found ${result.errors.length} ${plural(result.errors.length, "error")}:`,
      "",
    );
    result.errors.forEach((error) => {
      o.push(`  ${figures_default.pointer} ${error.path}: ${error.message}`);
    });
    o.push("");
  }
  if (result.warnings.length > 0) {
    o.push(
      `${figures_default.warning} Found ${result.warnings.length} ${plural(result.warnings.length, "warning")}:`,
      "",
    );
    result.warnings.forEach((warning) => {
      o.push(`  ${figures_default.pointer} ${warning.path}: ${warning.message}`);
    });
    o.push("");
  }
  if (result.notes !== undefined) {
    result.notes.forEach((note) => {
      o.push(`  ${figures_default.pointer} ${note}`);
    });
    o.push("");
  }
  return o;
}
//@ chunk-d4eg9at2.js:4885-5108 layout
var VALID_PLUGIN_DIR_SHAPES =
  "one with .claude-plugin/plugin.json, or one with no plugin.json and a skills/<name>/SKILL.md; a symbolic link in place of the folder, of skills, of <name> or of SKILL.md does not count, and SKILL.md must be a file";
//@ chunk-d4eg9at2.js:5108-8930 facade-exports = pluginValidateHandler (0.276)
/**
 * claude plugin validate：校验插件/市场目录结构与清单。
 */
async function pluginValidateHandler(s, o, i) {
  if (i.cowork) setUseCoworkPlugins(true);
  let target;
  try {
    target = await resolveValidateTarget(o);
  } catch (error) {
    if (isFsInaccessible(error))
      logForDebugging(`Plugin validation failed for ${o}: ${errorMessage(error)}`, {
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
  let { noErrors, hasWarnings, ...I } = summarizeValidationResults(
    manifest ? [manifest, ...contents] : contents,
    i,
  );
  let advice = await readmeAdviceFor(o, manifest, contents);
  let m = await import("./chunk-5aas12zq.js");
  let k = null;
  let contentResults = [];
  let B = false;
  let h = m.directoryChecksRoot(target);
  if (h !== null)
    try {
      k = await m.lintPluginForDirectory(h);
      if (k !== null)
        contentResults = m.formatDirectoryReport(
          h,
          k,
          i.profile === "directory" ? null : "this command with --profile directory",
        );
    } catch (error) {
      logError(error);
      B = true;
      k = null;
      contentResults = m.formatDirectoryChecksFailure(h);
    }
  let A;
  if (i.profile === "directory")
    if (B)
      A = {
        reason: "--profile directory: the plugin directory checks could not run",
      };
    else if (k === null)
      A = {
        reason:
          target.pluginRoot !== null
            ? "--profile directory could not read the plugin's manifest"
            : "--profile directory needs a plugin folder",
        note:
          target.pluginRoot !== null
            ? "--profile directory could not read this plugin's .claude-plugin/plugin.json as a regular file holding a JSON object (a symlink is not followed), so none of the plugin directory's rules were checked."
            : target.manifest?.fileType === "marketplace"
              ? `--profile directory needs a plugin folder (${VALID_PLUGIN_DIR_SHAPES}), and this target was validated as a marketplace. To check a plugin in it, pass that plugin's folder or its .claude-plugin/plugin.json. None of the plugin directory's rules were checked.`
              : m.isProjectClaudeFolder(target.resolvedPath)
                ? "--profile directory needs a plugin folder, and this is a project's .claude folder, which nobody submits to the plugin directory. None of its rules were checked."
                : `--profile directory needs a plugin folder (${VALID_PLUGIN_DIR_SHAPES}). None of the plugin directory's rules were checked.`,
      };
    else {
      let strict = i.strict === true;
      let x = m.undecidedRulesThatFail(k.undecided, {
        strict,
      });
      let D = m.directoryProfileFails(k.findings, {
        strict,
      })
        ? k.findings.some((finding) => finding.blocking)
          ? "--profile directory: the plugin directory would refuse a submission of this plugin"
          : "--profile directory with --strict treats the plugin directory's warnings as errors"
        : undefined;
      let M =
        x.length === 0
          ? undefined
          : `${x.length === 1 ? "a plugin directory rule" : "plugin directory rules"} could not be decided, because MCP or hooks files were not checked or could not be used: ${x.join(", ")}`;
      if (D !== undefined || M !== undefined)
        A = {
          reason: D === undefined ? `--profile directory: ${M}` : M === undefined ? D : `${D}; also, ${M}`,
          ...(M !== undefined && {
            note: '--profile directory fails this run because one or more rules could not be decided. The notes under "About these checks" (directory.notes in --json) name the files and say what to do.',
          }),
        };
    }
  let directory =
    k !== null || A !== undefined || B
      ? {
          profile: i.profile === "directory" ? "directory" : null,
          findings: k?.findings ?? [],
          undecided: k?.undecided ?? [],
          incomplete: k?.incomplete ?? true,
          failure: A?.reason ?? null,
          notes: [
            ...(k?.notes ?? []),
            ...(B ? [m.DIRECTORY_CHECKS_COULD_NOT_RUN] : []),
            ...(A?.note === undefined ? [] : [A.note]),
          ],
        }
      : null;
  let L = I.allSuccess && A === undefined;
  let T = () =>
    L
      ? logFeatureOkAsync("cli_plugin_validate")
      : logFeatureSadAsync("cli_plugin_validate", "cli_plugin_validate_failed");
  if (i.json) {
    await writeStdoutAndDrain(
      printJson(
        buildValidateJsonOutput(
          target,
          {
            success: L,
            strict: i.strict === true,
          },
          advice,
          directory,
        ),
      ) +
        `
`,
    );
    await T();
    return exitAfterAnalyticsFlush(L ? 0 : 1);
  }
  let R = manifest
    ? [
        `Validating ${manifest.fileType} manifest: ${manifest.filePath}`,
        "",
        ...printValidationResult(manifest),
      ]
    : [`Validating components in: ${target.resolvedPath}`, ""];
  for (let content of contents) {
    R.push(`Validating ${content.fileType}: ${content.filePath}`, "");
    R.push(...printValidationResult(content));
  }
  for (let contentResult of contentResults) R.push(contentResult);
  if (A?.note !== undefined) R.push(A.note, "");
  R.push(...formatAdviceLines(advice));
  if (L)
    R.push(
      hasWarnings
        ? `${figures_default.tick} Validation passed with warnings`
        : `${figures_default.tick} Validation passed`,
    );
  else if (I.allSuccess && A !== undefined)
    R.push(`${figures_default.cross} Validation failed (${A.reason})`);
  else if (noErrors && hasWarnings)
    R.push(`${figures_default.cross} Validation failed (--strict treats warnings as errors)`);
  else R.push(`${figures_default.cross} Validation failed`);
  await renderAndRun(
    await s(),
    jsxProd_default(Text, {
      children: formatMessageLines(R),
    }),
  );
  await T();
  return exitAfterAnalyticsFlush(L ? 0 : 1);
}
//@ chunk-d4eg9at2.js:8930-10206 facade-exports
async function pluginTagHandler(s, o, i) {
  let u = await tagPluginRelease(o ?? ".", {
    force: i.force,
  });
  let p = [];
  for (let warning of u.warnings) p.push(`${figures_default.warning} ${warning}`);
  if (!u.ok) {
    await logFeatureBadAsync("cli_plugin_tag", "cli_plugin_tag_prepare_failed");
    p.push(`${figures_default.cross} ${u.error}`);
    renderAndRun_2(s, p, 1);
    return;
  }
  let { plan } = u;
  p.push(`Plugin:  ${plan.pluginName}`, `Version: ${plan.version} (from ${plan.versionFrom})`);
  if (plan.marketplace)
    p.push(
      `Marketplace entry: plugins[${plan.marketplace.entryIndex}] in ${plan.marketplace.path}` +
        (plan.marketplace.entryVersion ? ` (version: ${plan.marketplace.entryVersion})` : ""),
    );
  p.push(`Tag:     ${plan.tag}`, "");
  let remote = i.remote ?? "origin";
  let force = i.force ?? false;
  let I = formatTagName(plan, i.message);
  let v = `git -C ${plan.gitRoot} push ${force ? "--force " : ""}${remote} refs/tags/${plan.tag}`;
  if (i.dryRun) {
    await logFeatureOkAsync("cli_plugin_tag");
    p.push(
      `${figures_default.tick} Dry run \u2014 would create tag ${plan.tag} at HEAD in ${plan.gitRoot}`,
      `  git -C ${plan.gitRoot} tag ${force ? "-f " : ""}-a ${plan.tag} -m ${jsonStringify(I)}`,
      `  ${v}`,
    );
    renderAndRun_2(s, p, 0);
    return;
  }
  let pluginGitTag = await createPluginGitTag(plan, {
    push: i.push ?? false,
    force,
    message: i.message,
    remote,
    allowGitTerminalPrompt: true,
  });
  if (!pluginGitTag.ok) {
    await logFeatureBadAsync("cli_plugin_tag", "cli_plugin_tag_create_failed");
    p.push(`${figures_default.cross} ${pluginGitTag.error}`);
    renderAndRun_2(s, p, 1);
    return;
  }
  await logFeatureOkAsync("cli_plugin_tag");
  p.push(`${figures_default.tick} Created tag ${plan.tag}`);
  if (pluginGitTag.pushed) p.push(`${figures_default.tick} Pushed to ${remote}`);
  else p.push(`  Push with: ${v}`);
  renderAndRun_2(s, p, 0);
}
//@ chunk-d4eg9at2.js:10308-13016 facade-exports
async function pluginInitHandler(s, o, i, u) {
  let p = [];
  let g = pluginNameProblem(o);
  if (g) {
    await logFeatureBadAsync("cli_plugin_init", "invalid_name");
    p.push(`${figures_default.cross} Invalid plugin name "${o}": ${g}`);
    renderAndRun_2(s, p, 1);
    return;
  }
  let P = [];
  for (let D of i.with ?? [])
    if (PLUGIN_COMPONENT_KINDS.includes(D)) P.push(D);
    else {
      await logFeatureBadAsync("cli_plugin_init", "invalid_component");
      p.push(
        `${figures_default.cross} Unknown --with component "${D}". Valid: ${PLUGIN_COMPONENT_KINDS.join(", ")}`,
      );
      renderAndRun_2(s, p, 1);
      return;
    }
  if (!areLocalPluginDirsAllowedByPolicy()) {
    await logFeatureBadAsync("cli_plugin_init", "policy_blocked");
    p.push(
      `${figures_default.cross} ${localPluginDirsBlockedMessage(tildify(join(getClaudeConfigDir(), "skills")))}`,
    );
    renderAndRun_2(s, p, 1);
    return;
  }
  let y = join(getClaudeConfigDir(), "skills");
  let I = join(y, o);
  if (relative(y, resolve(I)).startsWith("..")) {
    await logFeatureBadAsync("cli_plugin_init", "invalid_name");
    p.push(`${figures_default.cross} Plugin name "${o}" would write outside ${tildify(y)}`);
    renderAndRun_2(s, p, 1);
    return;
  }
  let v = i.author ?? (await gitUserName());
  let m = i.authorEmail ?? (await getGitEmail());
  if (!v && i.authorEmail)
    p.push(
      `${figures_default.warning} --author-email was ignored because no author name was found. Pass --author or set git config user.name.`,
    );
  let author = v
    ? m
      ? {
          name: v,
          email: m,
        }
      : {
          name: v,
        }
    : undefined;
  let F = pluginManifestTemplate({
    name: o,
    description: i.description,
    author,
    with: P,
  });
  let B;
  try {
    let D = await scaffoldPlugin(I, F, {
      force: i.force,
    });
    if (!D.ok) {
      await logFeatureBadAsync("cli_plugin_init", "target_exists");
      p.push(`${figures_default.cross} ${D.error}`);
      renderAndRun_2(s, p, 1);
      return;
    }
    B = D.skipped;
  } catch (error) {
    await logFeatureBadAsync("cli_plugin_init", "write_failed");
    logError(error);
    p.push(`${figures_default.cross} Failed to write scaffold: ${errorMessage(error)}`);
    renderAndRun_2(s, p, 1);
    return;
  }
  for (let D of B) p.push(`  kept existing ${D} (use --force to overwrite)`);
  let result = await validateManifestForDisplay(I, {
    unrecordableNames: "warn",
  });
  if (!result.success || result.warnings.length > 0) p.push(...printValidationResult(result));
  if (!result.success) {
    await logFeatureBadAsync("cli_plugin_init", "self_validate_failed");
    renderAndRun_2(s, p, 1);
    return;
  }
  await logFeatureOkAsync("cli_plugin_init");
  let A = `${o}@${SKILLS_DIR}`;
  p.push(`${figures_default.tick} Created plugin "${o}" at ${tildify(I)}`);
  let enabledPlugins = getSettings_DEPRECATED().enabledPlugins ?? {};
  let L = policyEnabledPluginNameSet()?.has(o) ?? false;
  let knownMarketplaces = await loadKnownMarketplacesSafe(u);
  let found = Object.keys(enabledPlugins).find((key) => {
    let pluginIdentifier = parsePluginIdentifier(key);
    return (
      pluginIdentifier.name === o &&
      pluginIdentifier.marketplace !== undefined &&
      pluginIdentifier.marketplace !== BUILTIN &&
      !isOfficialMarketplace(pluginIdentifier.marketplace) &&
      knownMarketplaces[pluginIdentifier.marketplace] !== undefined
    );
  });
  let E = enabledPlugins[A] === false;
  if (L)
    p.push(
      `  ${figures_default.warning} A plugin named "${o}" is locked by managed settings, which takes precedence \u2014 ${A} won't load. To load this copy, give it a different "name" in .claude-plugin/plugin.json.`,
    );
  else if (found)
    p.push(
      `  ${figures_default.warning} The name "${o}" is already taken by ${found} \u2014 when that plugin loads, ${A} won't. To load this copy, give it a different "name" in .claude-plugin/plugin.json or uninstall the conflicting plugin.`,
    );
  else if (E) {
    let D = claudeCommand("plugin enable", A);
    p.push(
      `  ${figures_default.warning} A disabled setting for ${A} exists, so it won't load until you re-enable it${D ? `: ${D}` : " in /plugin"}`,
    );
  } else p.push(`  It will auto-load next session as ${A}. Run /reload-plugins to load it now.`);
  let x = claudeCommand("plugin disable", A);
  p.push(`  ${x ? `Disable: ${x}. ` : "Disable: in /plugin. "}Remove: delete the directory.`);
  renderAndRun_2(s, p, 0);
}
//@ chunk-d4eg9at2.js:13016-17670 facade-exports
async function pluginListHandler(s, o, credentials, u) {
  if (o.cowork) setUseCoworkPlugins(true);
  isPluginCommandContext();
  logEvent("tengu_plugin_list_command", {});
  let installedPlugins = await getInstalledPluginsAsync(credentials);
  if (
    o.json &&
    typeof o.dataSize === "string" &&
    !(
      Object.hasOwn(installedPlugins.plugins, o.dataSize) &&
      (installedPlugins.plugins[o.dataSize]?.length ?? 0) > 0
    )
  )
    return cliErrorAfterAnalyticsFlush(
      `${figures_default.cross} --data-size names a plugin that is not installed`,
    );
  let { getPluginEditableScopes, editableScopeOf } = await import("./chunk-4dq72jvx.js");
  let pluginEditableScopes = getPluginEditableScopes();
  let keys = Object.keys(installedPlugins.plugins);
  await ensureSyncedPluginDirsRegistered();
  let { enabled, disabled, errors, warnings } = await loadAllPlugins(credentials, u);
  let B = [...enabled, ...disabled];
  let h = new Map(B.map((M) => [M.source, M]));
  let A = {
    plugins: B,
    errors,
    warnings,
  };
  let z = [
    {
      header: "Session-only plugins (--plugin-dir / --plugin-url):",
      scopeOf: () => "session",
      standaloneErrorScope: "session",
      standaloneWarningScope: "session",
      pathOf: (M) => M.path,
      showScope: false,
      ...filterInventoryBySource(INLINE_PLUGIN_MARKETPLACE, A),
    },
    {
      header: `Synced from claude.ai${isSyncWanted() ? "" : " \u2014 sync is off in this shell; these load only in a synced session"}:`,
      scopeOf: () => "synced",
      standaloneErrorScope: "synced",
      standaloneWarningScope: "synced",
      pathOf: (M) => M.path,
      showScope: false,
      ...filterInventoryBySource(SYNCED, A),
    },
    {
      header: "Skills-directory plugins (.claude/skills/*):",
      scopeOf: (M) => M.scope ?? "user",
      standaloneErrorScope: "user",
      standaloneWarningScope: "project",
      pathOf: displaySkillsDirPath,
      showScope: true,
      ...filterInventoryBySource(SKILLS_DIR, A),
    },
  ];
  let pluginVersions = await resolvePluginVersions(keys, h, credentials);
  if (o.json) {
    let M = [];
    for (let J of keys.sort()) {
      let q = installedPlugins.plugins[J];
      if (!q || q.length === 0) continue;
      let ee = h.get(J);
      let Q = ee?.name ?? parsePluginIdentifier(J).name;
      let filtered = errors.filter((error) => matchesPluginSource(error, J, Q));
      let filtered_2 = warnings.filter((warning) => matchesPluginSource(warning, J, Q));
      let mapped = filtered.map(pluginErrorText);
      let mapped_2 = filtered_2.map(pluginWarningText);
      let mapped_3 = filtered.map(pluginIssueDetail);
      let mapped_4 = filtered_2.map(pluginIssueDetail);
      let projectEnabled = isPluginEnabledAtProjectScope(J);
      let dataDirSize;
      let dataDirUnreadable;
      if (o.dataSize === true || o.dataSize === J)
        try {
          dataDirSize =
            (await getPluginDataDirSize(J, {
              throwIfUnreadable: true,
            })) ?? undefined;
        } catch {
          dataDirUnreadable = true;
        }
      for (let ae of q) {
        let mcpServers;
        if (ee) {
          let _e =
            ee.mcpServers ||
            (await loadPluginMcpServersFromSources(ee, undefined, credentials, undefined, {
              readOnlyListing: true,
            }));
          if (_e && Object.keys(_e).length > 0) mcpServers = configuredMcpServers(_e);
        }
        M.push({
          id: J,
          version: ae.version || "unknown",
          scope: ae.scope,
          enabled: editableScopeOf(pluginEditableScopes, J) !== undefined,
          installPath: ae.installPath,
          readFromFolder: pluginVersions.get(J),
          folderVersion: installedVersionOf(pluginVersions.get(J), ee),
          installedAt: ae.installedAt,
          lastUpdated: ae.lastUpdated,
          projectPath: ae.projectPath,
          mcpServers,
          errors: mapped.length > 0 ? mapped : undefined,
          notes: mapped_2.length > 0 ? mapped_2 : undefined,
          errorDetails: mapped_3.length > 0 ? mapped_3 : undefined,
          noteDetails: mapped_4.length > 0 ? mapped_4 : undefined,
          projectEnabled,
          dataDirSize,
          dataDirUnreadable,
          hasUserConfig: hasPluginUserConfig(ee),
        });
      }
    }
    for (let J of z) M.push(...(await buildPluginListJson(J, credentials)));
    let G;
    if (o.available) {
      let J = [];
      try {
        let [knownMarketplacesWithDeclared, uniqueInstallCounts] = await Promise.all([
          loadKnownMarketplacesWithDeclared(credentials),
          getUniqueInstallCounts(credentials),
        ]);
        let { marketplaces } = await loadMarketplacesWithErrors(knownMarketplacesWithDeclared, credentials);
        let U =
          (await getPluginDirectoryState()) !== "unavailable"
            ? new Set(
                groupBySource(
                  markFromPluginDirectory(
                    marketplaces.flatMap(({ name, data }) =>
                      (data?.plugins ?? []).map((X) => {
                        let Z = formatPluginId(X.name, name);
                        return {
                          entry: X,
                          marketplaceName: name,
                          pluginId: Z,
                          isInstalled: isPluginInstalled(Z),
                        };
                      }),
                    ),
                    knownMarketplacesWithDeclared,
                  ),
                  knownMarketplacesWithDeclared,
                  await allowlistedInstalledPlugins(knownMarketplacesWithDeclared, credentials),
                ).map((H) => H.pluginId),
              )
            : null;
        for (let { name, data } of marketplaces)
          if (data) {
            let filtered = data.plugins.filter((plugin) => {
              let K = formatPluginId(plugin.name, name);
              return !isPluginInstalled(K) && (U === null || U.has(K));
            });
            for (let Z of await pluginInstallPath(
              name,
              filtered,
              knownMarketplacesWithDeclared,
              credentials,
            )) {
              let K = formatPluginId(Z.name, name);
              J.push({
                pluginId: K,
                name: Z.name,
                description: Z.description,
                marketplaceName: name,
                version: Z.version,
                source: Z.source,
                installCount: uniqueInstallCounts?.get(K),
              });
            }
          }
      } catch {}
      G = printJson({
        installed: M,
        available: J,
      });
    } else G = printJson(M);
    await writeStdoutAndDrain(
      G +
        `
`,
    );
    await logFeatureOkAsync("cli_plugin_list");
    return;
  }
  let T = [];
  let installedListRefusal = await getInstalledListRefusal(credentials);
  if (installedListRefusal !== undefined)
    T.push(`Note: ${readInstalledPluginsFile(installedListRefusal)}`, "");
  else if (keys.length === 0 && !z.some(hasInventoryRows))
    T.push("No plugins installed. Use `claude plugin install` to install a plugin.");
  let E = await listSetAsideFiles();
  if (E.length > 0) {
    if (T.length > 0 && T.at(-1) !== "") T.push("");
    T.push(
      `Note: install records under names that no version of Claude Code can use were removed from installed_plugins.json. Their copy is kept for a while in ${E.join(", ")}. Nothing needs doing about these copies.`,
      "",
    );
  }
  let x = await listUnreadableKeptFiles();
  if (x.length > 0) {
    if (T.length > 0 && T.at(-1) !== "") T.push("");
    T.push(
      `Note: installed_plugins.json could not be read and was rebuilt. What it held is kept for a while in ${x.join(", ")}. Plugins it listed may need installing again; look there for what was recorded.`,
      "",
    );
  }
  if (keys.length > 0) T.push("Installed plugins:", "");
  for (let M of keys.sort()) {
    let G = installedPlugins.plugins[M];
    if (!G || G.length === 0) continue;
    let J = h.get(M)?.name ?? parsePluginIdentifier(M).name;
    let filtered = errors.filter((error) => matchesPluginSource(error, M, J));
    let filtered_2 = warnings.filter((warning) => matchesPluginSource(warning, M, J));
    for (let Q of G) {
      let U = editableScopeOf(pluginEditableScopes, M) !== undefined;
      let H =
        filtered.length > 0
          ? `${figures_default.cross} failed to load`
          : U
            ? `${figures_default.tick} enabled`
            : `${figures_default.cross} disabled`;
      let W = pluginVersions.get(M);
      let X = displayVersion(Q.version, h.get(M), W);
      let scope = Q.scope;
      T.push(`  ${figures_default.pointer} ${M}`);
      T.push(`    Version: ${X}`);
      if (W !== undefined) T.push(`    Read from: ${printableOrEmpty(W)}`);
      T.push(`    Scope: ${scope}`);
      T.push(`    Status: ${H}`);
      for (let K of filtered) {
        if (K.type === "marketplace-load-failed" && K.nameRefused) {
          T.push(...declaredErrorLines(K.marketplace, K.nameRefusedDeclaredInSettings === true));
          continue;
        }
        T.push(
          `    Error: ${pluginErrorText(K)}${isMarketplaceLoadError(K) ? ` ${RELOAD_PLUGINS_HINT}` : ""}${marketplaceNotFoundMessage(K) !== undefined ? `. ${marketplaceNotFoundMessage(K)}` : ""}`,
        );
      }
      for (let K of filtered_2) T.push(`    Note: ${pluginWarningText(K)}`);
      T.push("");
    }
  }
  for (let M of z) T.push(...pluginListHandler_2(M));
  let D = await s();
  await renderAndRun(
    D,
    jsxProd_default(Text, {
      children: formatMessageLines(T),
    }),
  );
  await logFeatureOkAsync("cli_plugin_list");
}
//@ chunk-d4eg9at2.js:17670-17856 layout
function MarketplaceResultLines(props) {
  let u = w(4);
  let { promise } = props;
  let i = Qr(promise);
  let children;
  if (u[0] !== i) {
    children = formatMessageLines(i);
    u[0] = i;
    u[1] = children;
  } else children = u[1];
  let g;
  if (u[2] !== children) {
    g = jsxProd_default(RenderOnceAndExit, {
      children: jsxProd_default(Text, {
        children,
      }),
    });
    u[2] = children;
    u[3] = g;
  } else g = u[3];
  return g;
}
//@ chunk-d4eg9at2.js:17856-17941 facade-exports
/**
 * 市场来源格式错误提示文本。
 */
var INVALID_MARKETPLACE_SOURCE_MESSAGE =
  "Invalid marketplace source format. Try: owner/repo, https://..., or ./path";
//@ chunk-d4eg9at2.js:17941-22612 facade-exports = marketplaceAddHandler (0.454)
/**
 * claude plugin marketplace add：添加市场（owner/repo、URL 或路径），支持 --claudeai、--from-link、--resolve-only。
 */
async function marketplaceAddHandler(s, name, i, settings, credentials) {
  if (i.cowork) setUseCoworkPlugins(true);
  if (i.resolveOnly === true && i.fromLink !== true)
    return cliError(`${figures_default.cross} --resolve-only needs --from-link`);
  if (i.claudeai) {
    if (i.sparse !== undefined || i.scope !== undefined)
      return cliError(
        `${figures_default.cross} --claudeai takes only the marketplace name (no --sparse or --scope: a claude.ai marketplace is hosted for your account, not declared in settings)`,
      );
    if (i.fromLink === true)
      return cliError(`${figures_default.cross} --claudeai can't be combined with --from-link`);
    await addClaudeAiMarketplaceCommand(s, name, settings, credentials);
    return;
  }
  if (i.resolveOnly === true) {
    if (i.sparse !== undefined || i.scope !== undefined)
      return cliError(`${figures_default.cross} --resolve-only can't be combined with --sparse or --scope`);
    await lookupMarketplaceLink(name, settings);
    return;
  }
  if (i.fromLink !== true && isOfficialMarketplaceName_2(name)) {
    {
      let pluginDirectoryState = await getPluginDirectoryState();
      if (pluginDirectoryState === "blocked") {
        logMarketplaceAddFailed({
          reason: "policy_blocked",
          sourceKind: undefined,
          surface: "cli",
        });
        let A = pluginDirectoryPolicyBlock();
        if (A !== null) logDirectoryBlockedOnce(A);
        await logFeatureBadAsync("cli_marketplace_add", "cli_marketplace_add_blocked_by_policy");
        return cliErrorAfterAnalyticsFlush(
          `${figures_default.cross} ${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${pluginDirectoryPolicyBlockHint()} It can't be turned on here.`,
        );
      }
      if (pluginDirectoryState !== "unavailable") {
        if (i.sparse !== undefined || i.scope !== undefined)
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
        await renderAndRun(
          s,
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
    return cliErrorAfterAnalyticsFlush(`${figures_default.cross} ${reservedNameMessage(name)}`);
  }
  let g;
  let P;
  let y;
  let I = i.fromLink === true;
  let v = i.json
    ? {
        command: "marketplace-add",
      }
    : undefined;
  let m = async (h, A = false) => {
    if (v !== undefined)
      await writeJsonLine({
        ...v,
        outcome: "failed",
        message: stripInvisibleKeepNewlines(h),
        ...(!A && {
          failureCode: "invalid_source",
        }),
      });
    return cliErrorAfterAnalyticsFlush(`${figures_default.cross} ${h}`);
  };
  try {
    if (I)
      try {
        parseDeepLinkMarketplace(name);
      } catch (error) {
        throw withMarketplaceFailureCode(error, "invalid_source");
      }
    let parsed = await parseMarketplaceInput(name);
    if (!parsed) {
      await logFeatureBadAsync("cli_marketplace_add", "cli_marketplace_add_invalid_source");
      return m(INVALID_MARKETPLACE_SOURCE_MESSAGE);
    }
    if ("error" in parsed) {
      await logFeatureBadAsync("cli_marketplace_add", "cli_marketplace_add_parse_failed");
      return m(stripControlChars(parsed.error), parsed.unreadable === true);
    }
    y = i.scope ?? "user";
    if (y !== "user" && y !== "project" && y !== "local")
      return cliErrorAfterAnalyticsFlush(
        stripControlChars(`${figures_default.cross} Invalid scope '${y}'. Use: user, project, or local`),
      );
    P = scopeToSettingSource(y);
    g = parsed;
    if (i.sparse && i.sparse.length > 0)
      if (g.source === "github" || g.source === "git")
        g = {
          ...g,
          sparsePaths: i.sparse,
        };
      else
        return cliErrorAfterAnalyticsFlush(
          `${figures_default.cross} --sparse is only supported for github and git marketplace sources (got: ${g.source})`,
        );
  } catch (error) {
    await logPluginCommandFailure("cli_marketplace_add", error, "cli_marketplace_add_failed");
    return reportOperationFailure(error, "add marketplace", v);
  }
  let k;
  let F = "";
  let B = (async () => {
    try {
      let h = [];
      if (I) {
        let J = await linkMarketplaceInUse(g, settings);
        if (J !== undefined) {
          k = {
            name: J,
            added: false,
          };
          F = `Marketplace '${J}' is already added; nothing changed`;
          await logFeatureOkAsync("cli_marketplace_add");
          return [];
        }
      }
      let { name, alreadyMaterialized, resolvedSource, replacedSource } = await addMarketplaceSource(
        g,
        (J) => {
          h.push(J);
        },
        settings,
        undefined,
        {
          refuseNameCollision: I,
        },
      );
      let { error } = await saveMarketplaceToSettings(
        name,
        {
          source: resolvedSource,
        },
        P,
        settings,
      );
      if (error) throw error;
      refreshPluginCaches(settings, credentials);
      await logEventAsync("tengu_marketplace_added", {
        _PROTO_marketplace_name: name,
        source_type: fromEnum(g.source),
        repo_hash: g.source === "github" ? shortHash(g.repo) : undefined,
        is_official_marketplace: isOfficialMarketplaceName_3(name),
      });
      await logFeatureOkAsync("cli_marketplace_add");
      let E = [];
      if (!I)
        try {
          E = (
            await resolveMissingDependencies((await loadAllPlugins(settings, credentials)).errors, settings)
          ).installed;
        } catch (error) {
          logForDebugging(`marketplace add: dep auto-resolve skipped: ${errorMessage(error)}`, {
            level: "warn",
          });
        }
      k = {
        name,
        added: true,
      };
      let x = formatDependencyCountSuffix(E);
      let D = alreadyMaterialized
        ? `Marketplace '${name}' already on disk \u2014 declared in ${y} settings${x}`
        : `Successfully added marketplace: ${name} (declared in ${y} settings)${x}`;
      let settingSource = describeMarketplaceSourceReplaced({
        name,
        replacedSource,
        resolvedSource,
        settingSource: P,
      });
      F = [...h, D, ...settingSource].join(`
`);
      h.push(`${figures_default.tick} ${D}`, ...settingSource.map((message) => `  ${message}`));
      let G = settingsFileWarning(settingsSourceName(P));
      if (G !== null) h.push(`${figures_default.warning} ${G}`);
      return h;
    } catch (error) {
      if (I && error instanceof MarketplaceError)
        await writeStdoutAndDrain(`${escapeControlChars(
          jsonStringify({
            refused: error.reason,
          }),
        )}
`);
      await logPluginCommandFailure("cli_marketplace_add", error, "cli_marketplace_add_failed");
      return reportOperationFailure(error, "add marketplace", v);
    }
  })();
  B.catch(() => {});
  if (I) {
    await B;
    if (k === undefined)
      return cliError(
        `${figures_default.cross} Failed to add marketplace: the add finished without naming the marketplace it used`,
      );
    await writeStdoutAndDrain(`${escapeControlChars(jsonStringify(k))}
`);
  } else if (v !== undefined) await B;
  if (I || v !== undefined) {
    if (v !== undefined)
      await writeJsonLine({
        ...v,
        outcome: "ok",
        marketplace: k?.name,
        message: stripInvisibleKeepNewlines(F),
      });
    await exitAfterAnalyticsFlush(0);
    return;
  }
  s.render(
    jsxProd_default(fo, {
      fallback: jsxProd_default(Text, {
        children: "Adding marketplace\u2026",
      }),
      children: jsxProd_default(MarketplaceResultLines, {
        promise: B,
      }),
    }),
  );
  await s.waitUntilExit();
  await exitAfterAnalyticsFlush(0);
}
//@ chunk-d4eg9at2.js:22612-23270 layout
async function lookupMarketplaceLink(s, o) {
  let i;
  try {
    parseDeepLinkMarketplace(s);
    i = await parseMarketplaceInput(s);
  } catch (error) {
    await logFeatureBadAsync("cli_marketplace_link_lookup", "cli_marketplace_link_lookup_refused_source");
    await flushAnalyticsBeforeExit();
    return handleMarketplaceError(error, "look up the marketplace");
  }
  if (!i || "error" in i) {
    await logFeatureBadAsync(
      "cli_marketplace_link_lookup",
      i ? "cli_marketplace_link_lookup_parse_failed" : "cli_marketplace_link_lookup_invalid_source",
    );
    return cliErrorAfterAnalyticsFlush(
      `${figures_default.cross} ${i?.error ?? INVALID_MARKETPLACE_SOURCE_MESSAGE}`,
    );
  }
  let u;
  try {
    u = await linkMarketplaceInUse(i, o);
  } catch (error) {
    await logFeatureBadAsync("cli_marketplace_link_lookup", "cli_marketplace_link_lookup_read_failed");
    await flushAnalyticsBeforeExit();
    return handleMarketplaceError(error, "read the added marketplaces");
  }
  await logFeatureOkAsync("cli_marketplace_link_lookup");
  await writeStdoutAndDrain(`${escapeControlChars(
    jsonStringify({
      existing: u ?? null,
    }),
  )}
`);
  await exitAfterAnalyticsFlush(0);
}
//@ chunk-d4eg9at2.js:23270-23337 facade-exports
async function linkMarketplaceInUse(s, o) {
  if (!isSourceAllowedByPolicy(s)) return;
  return findMarketplaceBySourceLoose(await loadKnownMarketplacesWithDeclared(o), s);
}
//@ chunk-d4eg9at2.js:23337-25089 layout
/**
 * claude plugin marketplace add 的 claude.ai 分支：列出账号可用的 claude.ai 托管 marketplace，按名字找唯一一个（重名、被策略拦、不存在分别报错），添加后打印成功信息与安装提示；渲染为一次性 Ink 输出后退出。
 */
async function addClaudeAiMarketplaceCommand(ink, name, settings, credentials) {
  let p = (async () => {
    try {
      let configured = await loadKnownMarketplacesWithDeclared(settings);
      let P = await listClaudeAiMarketplaces(credentials).catch(() => null);
      if (P === null)
        throw new ClaudeAiMarketplaceError(
          "claude.ai marketplaces are not available here \u2014 sign in to claude.ai (claude /login) with plugin sync on, then run: claude plugin marketplace list",
          "tier_unavailable",
        );
      let accountMarketplaceByName = findAccountMarketplaceByName(P.hosted, name);
      if (accountMarketplaceByName.kind === "ambiguous")
        throw new ClaudeAiMarketplaceError(
          `claude.ai hosts more than one marketplace called "${name}" for this account \u2014 add it by its unique name instead: ${accountMarketplaceByName.localNames.join(", ")} (claude plugin marketplace list)`,
          "ambiguous_name",
        );
      if (accountMarketplaceByName.kind === "none") {
        if (findAccountMarketplaceByName(P.policyBlocked, name).kind !== "none")
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
        name: v,
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
      let F = describeMarketplaceFreshness(status);
      let B = marketplace.plugins.length;
      return [
        `${figures_default.tick} Successfully added marketplace: ${accountMarketplaceLabel(row)} \u2014 hosted on claude.ai, ${formatMarketplaceScopeLabel(row.scope)} \u2014 ${B} ${plural(B, "plugin")}${F ? ` (${F})` : ""}`,
        `  Install its plugins with: claude plugin install <plugin>@${v}`,
      ];
    } catch (error) {
      if (error instanceof ClaudeAiMarketplaceError) {
        await logFeatureBadAsync("cli_marketplace_add", `cli_marketplace_add_claudeai_${error.code}`);
        await flushAnalyticsBeforeExit();
      } else await logPluginCommandFailure("cli_marketplace_add", error, "cli_marketplace_add_failed");
      return handleMarketplaceError(error, "add marketplace");
    }
  })();
  p.catch(() => {});
  ink.render(
    jsxProd_default(fo, {
      fallback: jsxProd_default(Text, {
        children: "Adding marketplace\u2026",
      }),
      children: jsxProd_default(MarketplaceResultLines, {
        promise: p,
      }),
    }),
  );
  await ink.waitUntilExit();
  await exitAfterAnalyticsFlush(0);
}
//@ chunk-d4eg9at2.js:25089-25201 layout = readHeadAndTail (0.802)
function readHeadAndTail(s) {
  return /^[A-Za-z0-9._/\\:~-]{1,200}$/.test(s)
    ? s
    : printableLabel(printableName(s, 4096), {
        head: 120,
        tail: 80,
      }) || "\u201C\u201D";
}
//@ chunk-d4eg9at2.js:25201-25286 layout
function displaySafeUrl(s) {
  return s === REDACTED_URL || /^[A-Za-z0-9._/\\:~@%+=&?,*-]{1,200}$/.test(s) ? s : readHeadAndTail(s);
}
//@ chunk-d4eg9at2.js:25286-28897 facade-exports = marketplaceListHandler (0.405)
/**
 * claude plugin marketplace list。
 */
async function marketplaceListHandler(s, o, i) {
  if (o.cowork) setUseCoworkPlugins(true);
  let u;
  try {
    u = await loadKnownMarketplacesWithDeclared(i);
  } catch (error) {
    await logFeatureBadAsync("cli_marketplace_list", "cli_marketplace_list_load_failed");
    await flushAnalyticsBeforeExit();
    return handleMarketplaceError(error, "list marketplaces");
  }
  let keys = Object.keys(u);
  let g = await listClaudeAiMarketplaces().catch(() => null);
  let { available, hosted } = filterUnaddedClaudeAiMarketplaces(g, u);
  let browseOnly = g?.browseOnly ?? [];
  let config = await readClaudeAiMarketplaceRegistry();
  let m = new Map();
  for (let L of keys) {
    let source = u[L]?.source;
    if (isClaudeAiMarketplaceSource(source))
      m.set(
        L,
        (
          await ensureClaudeAiMarketplace(L, source, {
            mode: "cache-only",
            credentials: undefined,
          })
        ).status,
      );
  }
  let pluginDirectoryState = await getPluginDirectoryState();
  let F = pluginDirectoryState === "off" && !keys.includes(OFFICIAL_MARKETPLACE_NAME);
  if (o.json) {
    let sorted = keys
      .filter((E) => {
        let source = u[E]?.source;
        return !(source && isPluginDirectorySource(source));
      })
      .map((name) => {
        let x = u[name];
        let source = x?.source;
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
                status: m.get(name)?.kind,
              }
            : {
                installLocation: x?.installLocation,
              }),
        };
      })
      .sort((E, x) => (E.name < x.name ? -1 : E.name > x.name ? 1 : 0));
    await writeStdoutAndDrain(
      printJson(sorted) +
        `
`,
    );
    await logFeatureOkAsync("cli_marketplace_list");
    return;
  }
  let B = false;
  let h = u[OFFICIAL_MARKETPLACE_NAME];
  if (
    pluginDirectoryState === "on" &&
    h !== undefined &&
    isPluginDirectorySource(h.source) &&
    isListingRepositoryBlockedByHostPolicy(undefined)
  ) {
    let marketplaceCacheOnly = await getMarketplaceCacheOnly(OFFICIAL_MARKETPLACE_NAME, i, {
      registryEntry: h,
    });
    B =
      marketplaceCacheOnly !== null &&
      (commandSourceSession().catalogEntryNames?.size ?? 0) > marketplaceCacheOnly.plugins.length;
  }
  printPluginWarnings(u);
  let A;
  if (keys.length === 0 && !F && available.length === 0 && hosted.length === 0 && browseOnly.length === 0)
    A = jsxProd_default(Text, {
      children: "No marketplaces configured",
    });
  else {
    let L = keys.length > 0 || F ? ["Configured marketplaces:", ""] : ["No marketplaces configured", ""];
    if (F)
      L.push(
        `  ${figures_default.pointer} ${OFFICIAL_MARKETPLACE_NAME}`,
        `    Source: Built in (${OFFICIAL_MARKETPLACE_DISPLAY}) \u2014 off`,
        `    Turn it back on: claude plugin marketplace add ${OFFICIAL_MARKETPLACE_NAME}`,
        "",
      );
    (h !== undefined && isPluginDirectorySource(h.source)
      ? [OFFICIAL_MARKETPLACE_NAME, ...keys.filter((name) => name !== OFFICIAL_MARKETPLACE_NAME)]
      : keys
    ).forEach((R) => {
      let E = u[R];
      let x = displayMarketplaceName(R);
      L.push(`  ${figures_default.pointer} ${x}`);
      if (x !== R) {
        let D = isSafeCliArg(R);
        if (D || isAsciiImpersonatingOfficialName(R))
          L.push(
            `    Shown in quotes: the name looks like one of Anthropic's own, and is not.${D ? ` In a command, type: ${R}` : ""}`,
          );
      }
      if (E?.source) {
        let src = E.source;
        if (src.source === "github") {
          let M = src.ref ? `@${readHeadAndTail(src.ref)}` : "";
          L.push(`    Source: GitHub (${readHeadAndTail(src.repo)}${M})`);
        } else if (src.source === "git") {
          let M = src.ref ? `@${readHeadAndTail(src.ref)}` : "";
          L.push(`    Source: Git (${displaySafeUrl(redactUrlForDisplay(src.url))}${M})`);
        } else if (src.source === "url")
          L.push(`    Source: URL (${displaySafeUrl(redactUrlForDisplay(src.url))})`);
        else if (src.source === "directory")
          L.push(
            `    Source: ${pluginDirectoryState !== "unavailable" ? "Folder" : "Directory"} (${readHeadAndTail(src.path)})`,
          );
        else if (src.source === "file") L.push(`    Source: File (${readHeadAndTail(src.path)})`);
        else if (src.source === "pluginDirectory")
          L.push(
            `    Source: Built in (${OFFICIAL_MARKETPLACE_DISPLAY})${pluginDirectoryState === "blocked" ? " \u2014 blocked by your organization" : B ? " \u2014 some plugins hidden by your organization's policy" : ""}`,
          );
        else if (src.source === "claudeai") {
          let M = m.get(R);
          let G = M === undefined ? undefined : describeMarketplaceFreshness(M);
          L.push(
            `    Source: ${formatClaudeAiMarketplaceLabel(config[R])}${G === undefined ? "" : ` \u2014 ${G}`}`,
          );
        }
      }
      if (E !== undefined && isImpersonatingOfficialMarketplace(R, E) && isAsciiImpersonatingOfficialName(R))
        L.push(
          ...reservedMarketplaceNameMessage(R, {
            declaredInSettings: E.source.source === "settings",
          }).map((D) => `    ${D}`),
        );
      L.push("");
    });
    if (available.length > 0 || hosted.length > 0 || browseOnly.length > 0) L.push("From claude.ai:", "");
    for (let R of available) {
      L.push(
        `  ${figures_default.pointer} ${R.name} (available from claude.ai${R.scope ? `, ${R.scope}` : ""} \u2014 not added)`,
      );
      L.push(
        `    Source: ${R.source.source === "github" ? "GitHub" : "Git"} (${formatGitSourceSpec(R.source)})`,
      );
      L.push("");
    }
    for (let R of hosted) {
      L.push(
        `  ${figures_default.pointer} ${accountMarketplaceLabel(R)} \u2014 hosted on claude.ai, ${formatMarketplaceScopeLabel(R.scope)} \xB7 not added`,
      );
      L.push(`    Add: claude plugin marketplace add --claudeai ${isSafeCliArg(R.name) ? R.name : "<name>"}`);
      L.push("");
    }
    for (let R of browseOnly) {
      L.push(`  ${figures_default.pointer} ${noCliNameLabel(R)} (browse on claude.ai)`);
      L.push("");
    }
    A = jsxProd_default(Text, {
      children: formatMessageLines(L),
    });
  }
  let z = await s();
  await renderAndRun(z, A);
  await logFeatureOkAsync("cli_marketplace_list");
}
//@ chunk-d4eg9at2.js:28897-30866 facade-exports = marketplaceRemoveHandler (0.274)
/**
 * claude plugin marketplace remove。
 */
async function marketplaceRemoveHandler(s, o, i, u) {
  if (i.cowork) setUseCoworkPlugins(true);
  let p;
  if (i.scope !== undefined) {
    let scope = i.scope;
    if (scope !== "user" && scope !== "project" && scope !== "local")
      return cliError(`${figures_default.cross} Invalid scope '${scope}'. Use: user, project, or local`);
    p = scopeToSettingSource(scope);
  }
  let g = isOfficialMarketplaceSpelling(o) ? await getPluginDirectoryState() : undefined;
  let P;
  try {
    if (
      g === "blocked" &&
      isOfficialMarketplaceName_2(o) &&
      !listReservedNameRefusals(await loadKnownMarketplacesWithDeclared(u)).some(({ name }) =>
        isOfficialMarketplaceName_2(name),
      )
    ) {
      await renderAndRun(s, jsxProd_default(ManagedMarketplaceNotice, {}));
      await logFeatureOkAsync("cli_marketplace_remove");
      return;
    }
    P = await removeMarketplaceWithReservedSiblings(o, p, u);
    refreshPluginCaches(u);
    if (P.kind !== "plugin-directory-built-in")
      logEvent("tengu_marketplace_removed", {
        marketplace_name: marketplaceForTelemetry(o),
        _PROTO_marketplace_name: o,
        is_official_marketplace: isOfficialMarketplaceName_3(o),
      });
  } catch (error) {
    await logFeatureBadAsync("cli_marketplace_remove", "cli_marketplace_remove_failed");
    await flushAnalyticsBeforeExit();
    return reportOperationFailure(
      asMarketplaceError(error, 2000),
      "remove marketplace",
      i.json
        ? {
            command: "marketplace-remove",
            marketplace: o,
          }
        : undefined,
      error,
    );
  }
  await logFeatureOkAsync("cli_marketplace_remove");
  if (P.kind === "ignored-plugin-directory-name-entry-removed") {
    let mapped = P.removedNames.map(
      (removedName) =>
        `${figures_default.tick} ${removedMarketplaceMessage(removedName, g !== undefined && g !== "unavailable")}`,
    );
    let F = blockedPluginsNotice(P.disabledPluginIds, P.disabledReason);
    if (F !== null) mapped.push(F);
    await renderAndRun(
      s,
      jsxProd_default(Text, {
        children: formatMessageLines(mapped),
      }),
    );
    return;
  }
  if (P.kind === "plugin-directory-built-in") {
    let pluginDirectoryState = await getPluginDirectoryState();
    if (pluginDirectoryState === "blocked") {
      await renderAndRun(s, jsxProd_default(ManagedMarketplaceNotice, {}));
      return;
    }
    if (g === "on" && pluginDirectoryState === "off")
      logDirectoryToggle({
        enabled: false,
        surface: "cli",
      });
    await renderAndRun(
      s,
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
  let removedPluginIds = P.kind === "removed" ? P.removedPluginIds : [];
  let I = `Successfully removed marketplace: ${stripInvisibleKeepEmoji(o)}${i.scope ? ` (from ${i.scope} settings)` : ""}`;
  let v =
    removedPluginIds.length > 0
      ? [
          `Also uninstalled ${removedPluginIds.length} ${plural(removedPluginIds.length, "plugin")} from this marketplace:`,
          ...removedPluginIds.map((removedPluginId) => `  ${removedPluginId}`),
          "The removal also deletes their saved options, secrets and data where it can.",
          "To use a plugin again, add the marketplace back and reinstall the plugin.",
        ]
      : [];
  if (i.json) {
    await writeJsonLine({
      command: "marketplace-remove",
      outcome: "ok",
      marketplace: o,
      message: stripInvisibleKeepNewlines(
        [I, ...v].join(`
`),
      ),
    });
    return;
  }
  let m = [`${figures_default.tick} ${I}`, ...v];
  await renderAndRun(
    s,
    jsxProd_default(Text, {
      children: formatMessageLines(m),
    }),
  );
}
//@ chunk-d4eg9at2.js:30866-30961 sole-consumer
function ManagedMarketplaceNotice() {
  let s = w(1);
  let o;
  if (s[0] === MEMO_CACHE_SENTINEL) {
    o = jsxProd_default(Text, {
      children: formatPluginDirectoryBlockedMessage(pluginDirectoryPolicyBlockHint()),
    });
    s[0] = o;
  } else o = s[0];
  return o;
}
//@ chunk-d4eg9at2.js:31326-33318 facade-exports = marketplaceUpdateHandler (0.472)
/**
 * claude plugin marketplace update。
 */
async function marketplaceUpdateHandler(s, o, i, u) {
  if (i.json && !o)
    return cliError(
      `${figures_default.cross} --json needs a marketplace name, for example: claude plugin marketplace update <name> --json`,
    );
  if (i.cowork) setUseCoworkPlugins(true);
  let p = o !== undefined && isOfficialMarketplaceName_2(o) ? OFFICIAL_MARKETPLACE_NAME : o;
  let g;
  let P = 0;
  let y;
  if (p) {
    g = `Updating marketplace: ${p}...`;
    let I = [];
    let v = `Successfully updated marketplace: ${p}`;
    y = refreshMarketplaceDeduped(p, u, (message) => {
      I.push(message);
    })
      .then(async () => {
        refreshPluginCaches(u);
        await logEventAsync("tengu_marketplace_updated", {
          marketplace_name: marketplaceForTelemetry(p),
          _PROTO_marketplace_name: p,
          is_official_marketplace: isOfficialMarketplaceName_3(p),
        });
        await logFeatureOkAsync("cli_marketplace_update");
        return {
          messages: I,
          summary: `${figures_default.tick} ${v}`,
        };
      })
      .catch(async (error) => {
        await logPluginCommandFailure("cli_marketplace_update", error, "cli_marketplace_update_failed");
        return reportOperationFailure(
          error,
          "update marketplace(s)",
          i.json
            ? {
                command: "marketplace-update",
                marketplace: o,
              }
            : undefined,
        );
      });
    if (i.json) {
      await y;
      await writeJsonLine({
        command: "marketplace-update",
        outcome: "ok",
        marketplace: o,
        message: stripInvisibleKeepNewlines(
          [...I, v].join(`
`),
        ),
      });
      await exitAfterAnalyticsFlush(0);
      return;
    }
  } else {
    let I;
    try {
      I = await loadKnownMarketplacesWithDeclared(u);
    } catch (error) {
      await logPluginCommandFailure("cli_marketplace_update", error, "cli_marketplace_update_load_failed");
      return handleMarketplaceError(error, "update marketplace(s)");
    }
    let marketplaceNames = Object.keys(I);
    if (marketplaceNames.length === 0) {
      await renderAndRun(
        s,
        jsxProd_default(Text, {
          children: "No marketplaces configured",
        }),
      );
      await logFeatureOkAsync("cli_marketplace_update");
      return exitAfterAnalyticsFlush(0);
    }
    g = "Updating marketplaces...";
    y = refreshAllMarketplaces(u)
      .then(async ({ policyRefused, failed, attempted, builtInSkipped }) => {
        P = failed.length > 0 ? 1 : 0;
        refreshPluginCaches(u);
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
  s.render(
    jsxProd_default(fo, {
      fallback: jsxProd_default(Text, {
        children: g,
      }),
      children: jsxProd_default(ResultMessages, {
        promise: y,
      }),
    }),
  );
  await s.waitUntilExit();
  await exitAfterAnalyticsFlush(P);
}
//@ chunk-d4eg9at2.js:33318-33518 layout
function SuccessLine(props) {
  let u = w(4);
  let { promise } = props;
  let i = Qr(promise);
  let p;
  if (u[0] !== i) {
    p = stripInvisibleKeepNewlines(i);
    u[0] = i;
    u[1] = p;
  } else p = u[1];
  let g;
  if (u[2] !== p) {
    g = jsxProd_default(RenderOnceAndExit, {
      children: jsxProd_default_2(Text, {
        children: [figures_default.tick, " ", p],
      }),
    });
    u[2] = p;
    u[3] = g;
  } else g = u[3];
  return g;
}
//@ chunk-d4eg9at2.js:33518-33561 layout
function isValidInstallScope(scope) {
  return VALID_INSTALLABLE_SCOPES.some((o) => o === scope);
}
//@ chunk-d4eg9at2.js:33561-33752 facade-exports = pluginInstallHandler (0.744)
/**
 * 校验 --scope（默认 user；--cowork 只能 user），非法时退出。
 */
function requireInstallableScope(s) {
  let scope = s.scope || "user";
  if (s.cowork && scope !== "user") cliError("--cowork can only be used with user scope");
  if (!isValidInstallScope(scope))
    cliError(`Invalid scope: ${scope}. Must be one of: ${VALID_INSTALLABLE_SCOPES.join(", ")}.`);
  return scope;
}
//@ chunk-d4eg9at2.js:33752-34003 file-local
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
//@ chunk-d4eg9at2.js:34142-36170 facade-exports
async function pluginInstallHandler(s, o, options, storageV5) {
  if (options.cowork) setUseCoworkPlugins(true);
  let p = requireInstallableScope(options);
  logPluginLoadErrors("tengu_plugin_install_command", o, fromEnum(p));
  if (!options.json) printPluginWarnings(await loadKnownMarketplacesSafe(storageV5));
  let g;
  let onShown = (x) => {
    g = x;
  };
  let y = async (failureCode, message) => {
    if (options.json)
      await writePluginResult({
        command: "install",
        outcome: "failed",
        plugin: o,
        scope: p,
        message,
        failureCode,
        shownCommand: g && withConfirmationDigest(g),
      });
  };
  let announceRefreshResult;
  let v;
  let m = (x) => {
    if (announceRefreshResult) logInstallRefreshFirst(announceRefreshResult.outcome);
    return handlePluginCommandError(
      x,
      "install",
      o,
      storageV5,
      options.json
        ? {
            scope: p,
            shownCommand: g,
          }
        : undefined,
    );
  };
  if (options.replace && !parsePluginIdentifier(o).marketplace)
    return m(
      new PluginOperationFailedError(replaceNeedsFullIdMessage(), {
        failureCode: "replace_needs_full_id",
      }),
    );
  let k = (await getInstalledListRefusal(storageV5).catch(m)) !== undefined;
  let F = k
    ? undefined
    : await checkCommandSourceSwitch(
        o,
        {
          yes: options.yes,
          acceptCommand: options.acceptCommand,
          onShown,
          scope: p,
          onMarketplaceRefreshResult: (x) => {
            announceRefreshResult = x;
          },
          onResolvedMarketplace: (x) => {
            v = x;
          },
        },
        storageV5,
      ).catch(m);
  if (F?.kind === "accepted") g = undefined;
  if (F?.kind === "declined") {
    if (announceRefreshResult) logInstallRefreshFirst(announceRefreshResult.outcome);
    logFeatureSad("cli_plugin_install", "command_source_declined");
    if (options.json) await y("command_source_declined", "Aborted.");
    else
      await renderAndRun(
        await s(),
        jsxProd_default(Text, {
          children: "Aborted.",
        }),
      );
    await gracefulShutdown(1);
    return;
  }
  let grantKey = F?.grantKey;
  let h = k
    ? null
    : await resolveInstallTarget(
        o,
        {
          yes: options.yes,
          acceptCommand: options.acceptCommand,
          onShown,
          scope: p,
          resolvedMarketplace: v,
        },
        storageV5,
      ).catch(m);
  if (h !== null && h !== "declined" && h !== "unconfirmed") g = undefined;
  if (h === "declined" || h === "unconfirmed") {
    logFeatureSad(
      "cli_plugin_install",
      h === "declined" ? "entry_helper_declined" : "entry_helper_unconfirmed",
    );
    if (announceRefreshResult) logInstallRefreshFirst(announceRefreshResult.outcome);
    if (options.json)
      await y(
        h === "declined" ? "entry_helper_declined" : "entry_helper_unconfirmed",
        "Aborted \u2014 the command was not run.",
      );
    else
      await renderAndRun(
        await s(),
        jsxProd_default(Text, {
          children: "Aborted \u2014 the command was not run.",
        }),
      );
    await gracefulShutdown(1);
    return;
  }
  let { name, marketplace } = parsePluginIdentifier(o);
  let L = F?.kind === "accepted" || h !== null;
  let resolvedPlugin =
    options.acceptCommand !== undefined && L && marketplace === undefined && name && v !== undefined
      ? `${name}@${v}`
      : undefined;
  let R = installPlugin(o, p, options.config, grantKey, k ? undefined : h, storageV5, announceRefreshResult, {
    json: options.json,
    shownCommand: g,
    resolvedPlugin,
    replaceInstalledCopy: options.replace,
    npmRegistry: options.registry,
  }).then(async (x) => {
    await logFeatureOkAsync("cli_plugin_install");
    return x;
  });
  if (options.json) {
    await R;
    await gracefulShutdown(0);
    return;
  }
  let E = await s();
  E.render(
    jsxProd_default(fo, {
      fallback: jsxProd_default(Text, {
        children: stripInvisibleKeepEmoji(`Installing plugin "${o}"...`),
      }),
      children: jsxProd_default(SuccessLine, {
        promise: R,
      }),
    }),
  );
  await E.waitUntilExit();
  await gracefulShutdown(0);
}
//@ chunk-d4eg9at2.js:36170-36520 facade-exports = pluginUninstallHandler (0.343)
/**
 * claude plugin uninstall：卸载插件（--keep-data、--prune、--json）。
 */
async function pluginUninstallHandler(s, o, i, u) {
  if (i.json && i.prune) cliError("--json cannot be used with --prune");
  if (i.cowork) setUseCoworkPlugins(true);
  let p = requireInstallableScope(i);
  logPluginLoadErrors("tengu_plugin_uninstall_command", o, fromEnum(p));
  let g = await uninstallPlugin(o, p, i.keepData, i.prune, i.yes, u, {
    json: i.json,
  });
  if (!i.json)
    await renderAndRun(
      await s(),
      jsxProd_default(Text, {
        children: stripInvisibleKeepNewlines(i.prune ? g : `${figures_default.tick} ${g}`),
      }),
    );
  await logFeatureOkAsync("cli_plugin_uninstall");
  await exitAfterAnalyticsFlush(0);
}
//@ chunk-d4eg9at2.js:36520-36768 facade-exports
async function pluginPruneHandler(s, o, i) {
  if (o.cowork) setUseCoworkPlugins(true);
  let u = requireInstallableScope(o);
  logEvent("tengu_plugin_prune_command", {
    scope: fromEnum(u),
    dry_run: o.dryRun ?? false,
  });
  let p = await prunePluginsCli(
    u,
    {
      dryRun: o.dryRun,
      yes: o.yes,
    },
    i,
  );
  await renderAndRun(
    s,
    jsxProd_default(Text, {
      children: stripInvisibleKeepNewlines(p),
    }),
  );
  await logFeatureOkAsync("cli_plugin_prune");
  await exitAfterAnalyticsFlush(0);
}
//@ chunk-d4eg9at2.js:36768-37499 facade-exports = enablePlugin (0.424)
async function pluginEnableHandler(s, o, options, u) {
  if (options.cowork) setUseCoworkPlugins(true);
  let p = pluginEnableHandler_2(options);
  logPluginLoadErrors("tengu_plugin_enable_command", o, fromEnum(p ?? "auto"));
  let g;
  let P = false;
  let y = o;
  try {
    await ensureSyncedPluginDirsRegistered();
    isPluginCommandContext();
    let pluginArgument = await resolvePluginArgument(o, options.json, u, {
      unlessNamedInSettings: true,
    });
    P = pluginArgument.aliased;
    y = pluginArgument.plugin;
    g = await enablePluginOp(pluginArgument.plugin, p, u);
    if (!g.success) throw new PluginOperationFailedError(g.message, g);
  } catch (error) {
    return await handlePluginCommandError(
      error,
      "enable",
      o,
      u,
      options.json
        ? {
            scope: p,
          }
        : undefined,
      P ? y : undefined,
    );
  }
  let I = withSettingsWarning(g.message, g.scope ?? p);
  if (options.json)
    await writePluginResult({
      command: "enable",
      outcome: "ok",
      plugin: o,
      pluginId: g.pluginId,
      scope: g.scope ?? p,
      message: stripInvisibleKeepNewlines(I),
    });
  else
    await renderAndRun(
      await s(),
      jsxProd_default_2(Text, {
        children: [figures_default.tick, " ", stripInvisibleKeepNewlines(I)],
      }),
    );
  await logEventAsync("tengu_plugin_enabled_cli", {
    ...(await pluginTelemetryFields(g.pluginId || y, policyEnabledPluginNameSet(), u)),
    scope: fromEnumOpt(g.scope),
    ...(P
      ? {
          aliased_id: true,
        }
      : {}),
  });
  await logFeatureOkAsync("cli_plugin_enable");
  await exitAfterAnalyticsFlush(0);
}
//@ chunk-d4eg9at2.js:37499-38038 facade-exports = pluginDisableHandler (0.651)
/**
 * claude plugin disable：禁用单个或 --all 全部插件。
 */
async function pluginDisableHandler(s, o, options, u) {
  if (options.all && o) cliError("Cannot use --all with a specific plugin");
  if (!options.all && !o) cliError("Please specify a plugin name or use --all to disable all plugins");
  if (options.cowork) setUseCoworkPlugins(true);
  let scope;
  if (options.all) {
    if (options.scope) cliError("Cannot use --scope with --all");
    logEvent("tengu_plugin_disable_command", {});
    isPluginCommandContext();
    scope = await disableAllPlugins(u, {
      json: options.json,
    });
  } else {
    let g = pluginEnableHandler_2(options);
    logPluginLoadErrors("tengu_plugin_disable_command", o, fromEnum(g ?? "auto"));
    await ensureSyncedPluginDirsRegistered();
    isPluginCommandContext();
    scope = await disablePlugin(o, g, u, {
      json: options.json,
    });
  }
  if (!options.json)
    await renderAndRun(
      await s(),
      jsxProd_default(Text, {
        children: stripInvisibleKeepNewlines(scope),
      }),
    );
  await logFeatureOkAsync("cli_plugin_disable");
  await exitAfterAnalyticsFlush(0);
}
//@ chunk-d4eg9at2.js:38038-38432 facade-exports = pluginUpdateHandler (0.778)
/**
 * claude plugin update：按作用域更新插件。
 */
async function pluginUpdateHandler(s, options, i) {
  if (options.cowork) setUseCoworkPlugins(true);
  let u = options.cowork ? "user" : undefined;
  if (options.scope) {
    if (!VALID_UPDATE_SCOPES.includes(options.scope))
      cliError(`Invalid scope "${options.scope}". Valid scopes: ${VALID_UPDATE_SCOPES.join(", ")}`);
    u = options.scope;
  }
  if (options.cowork && u !== "user") cliError("--cowork can only be used with user scope");
  logPluginLoadErrors("tengu_plugin_update_command", s);
  if (!options.json) printPluginWarnings(await loadKnownMarketplacesSafe(i));
  await updatePluginCli(
    s,
    u,
    {
      yes: options.yes,
      json: options.json,
      acceptCommand: options.acceptCommand,
    },
    i,
  );
}
//@ chunk-d4eg9at2.js:38432-42348 facade-exports
/**
 * claude plugin details <name>：插件清单、组件与 token 开销估算。
 */
async function pluginDetailsHandler(s, o, i, u, p) {
  if (i.cowork) setUseCoworkPlugins(true);
  isPluginCommandContext();
  logEvent("tengu_plugin_details_command", {});
  let { getPluginInventory, computePluginTokenCost, scaleCharsToTokens } =
    await import("./chunk-a3f28dq3.js");
  let { formatTokenEstimate } = await import("./chunk-r70xbw6c.js");
  await ensureSyncedPluginDirsRegistered();
  let { enabled, disabled } = await loadAllPlugins(isStorageV5Enabled() ? u : undefined, p);
  let pluginId = parsePluginId((await resolvePluginArgument(o, i.json, u)).plugin);
  let F = pluginId.marketplace ? joinPluginId(pluginId.name, pluginId.marketplace) : pluginId.name;
  let B = isOfficialMarketplace(pluginId.marketplace)
    ? (U) => nfcLower(U) === nfcLower(F)
    : (U) => pluginNamesEqual(U, F);
  let found = [...enabled, ...disabled].find((U) => B(pluginId.marketplace ? U.source : U.name));
  if (!found) {
    let U =
      (await getPluginDirectoryState()) !== "unavailable"
        ? Object.entries((await getInstalledPluginsAsync(u)).plugins).find(([key, value]) => {
            let pluginIdentifier = parsePluginIdentifier(key);
            return (
              pluginIdentifier.marketplace === OFFICIAL_MARKETPLACE_NAME &&
              pluginNamesEqual(pluginId.marketplace ? key : pluginIdentifier.name, F) &&
              value.some(isInstallationRelevantToCurrentProject)
            );
          })?.[0]
        : undefined;
    let H = pluginDirectoryPolicyBlock();
    let W = U !== undefined && H !== null ? parsePluginIdentifier(U).name : undefined;
    let X =
      U !== undefined &&
      H === null &&
      (await loadPluginDirectoryMarketplace(parsePluginIdentifier(U).name, u)) === null
        ? parsePluginIdentifier(U).name
        : undefined;
    let Z = W !== undefined ? "policy_blocked" : X !== undefined ? "directory_catalog_missing" : "not_found";
    let K =
      W !== undefined && H !== null
        ? `${figures_default.cross} ${directoryBlockedMessage(W, H)}`
        : X !== undefined
          ? `${figures_default.cross} Details for "${quotedPrintable(X)}" are not available: ${PLUGIN_DIRECTORY_CATALOG_MISSING}. ${RELOAD_PLUGINS_HINT}`
          : `Plugin "${quotedPrintable(o)}" not found. ${pluginId.marketplace === BUILTIN ? "Built-in plugins don't appear in `claude plugin list`. To see the ones available in a session, run /plugin in Claude Code and open the Installed tab." : "Run `claude plugin list` to see installed plugins, or pass --plugin-dir <path> to load one from disk."}`;
    return finishPluginDetails(s, i.json, K, Z);
  }
  let A = marketplaceSuffix(found.source) ?? INLINE_PLUGIN_MARKETPLACE;
  let z = i.models?.length ? i.models : [getMainLoopModel()];
  let L;
  try {
    let pluginInventory = await getPluginInventory(found, A);
    L = await computePluginTokenCost(pluginInventory, z, found.name);
  } catch (error) {
    let H = error instanceof PluginDirectoryCatalogMissingError;
    if (!H) logError(withTelemetryMessage(toError(error), "plugin details: inventory/token-cost failed"));
    let W = H ? "directory_catalog_missing" : "inventory_failed";
    let X = H
      ? `${figures_default.cross} Details for "${quotedPrintable(found.name)}" are not available: ${PLUGIN_DIRECTORY_CATALOG_MISSING}. ${RELOAD_PLUGINS_HINT}`
      : `${figures_default.cross} Could not load details for "${quotedPrintable(found.name)}": ${printableMessage(error)}`;
    return finishPluginDetails(s, i.json, X, W);
  }
  let { tokens, inventory } = L;
  if (i.json) {
    let U = ({ path, ...W }) => W;
    await writeStdoutAndDrain(
      printJson({
        plugin: found.name,
        version: found.manifest.version,
        source: found.source,
        sha: found.sha ?? null,
        tokens,
        components: {
          ...inventory,
          commands: inventory.commands.map(U),
          agents: inventory.agents.map(U),
          skills: inventory.skills.map(U),
        },
      }) +
        `
`,
    );
    await logFeatureOkAsync("cli_plugin_details");
    return;
  }
  let E = [];
  let pluginDisplayName = getPluginDisplayName(found);
  let D = pluginDisplayName === found.name ? found.name : `${pluginDisplayName} (${found.name})`;
  E.push(`${D} ${found.manifest.version ?? ""}`.trimEnd());
  if (found.manifest.description) {
    let [U, ...H] = found.manifest.description.split(`
`);
    E.push(`  Description: ${U}`);
    for (let W of H) E.push(`      ${W}`);
  }
  E.push(`  Source: ${found.source}`);
  E.push("");
  E.push("Component inventory");
  let M = [
    ["Skills", [...inventory.skills, ...inventory.commands].map((U) => U.name).sort(), ""],
    ["Agents", inventory.agents.map((agent) => agent.name), ""],
    ["Hooks", inventory.hooks, "  (harness-only \u2014 no model context cost)"],
    ["MCP servers", inventory.mcpServers, "  (tool schemas resolved at runtime; not counted)"],
    ["LSP servers", inventory.lspServers, "  (out-of-process tooling; no model context cost)"],
  ];
  for (let [U, H, W] of M)
    E.push(`  ${U} (${H.length})${H.length > 0 ? `  ${H.join(", ")}` : ""}${H.length > 0 ? W : ""}`);
  E.push("");
  let filtered = [...inventory.skills, ...inventory.agents, ...inventory.commands].filter(
    (U) => U.chars != null,
  );
  let J = {
    always_on: filtered.reduce((acc, H) => acc + H.chars.always_on, 0),
    on_invoke: filtered.reduce((acc, H) => acc + H.chars.on_invoke, 0),
  };
  let q = tokens[z[0]];
  let ee = q?.always_on ?? scaleCharsToTokens(J.always_on, J.always_on, undefined);
  E.push("Projected token cost");
  E.push(`  Always-on:   ~${ee.toLocaleString()} tok   added to every session`);
  if (filtered.length > 0) {
    E.push("");
    E.push("Per-component (rounded)");
    let max = Math.max(...filtered.map((H) => H.name.length), 9);
    E.push(`  ${"component".padEnd(max)}  ${"always-on".padStart(9)}  ${"on-invoke".padStart(9)}`);
    for (let H of filtered) {
      let W = scaleCharsToTokens(H.chars.always_on, J.always_on, q?.always_on);
      let X = scaleCharsToTokens(H.chars.on_invoke, J.on_invoke, q?.on_invoke);
      E.push(
        `  ${H.name.padEnd(max)}  ${formatTokenEstimate(W).padStart(9)}  ${formatTokenEstimate(X).padStart(9)}`,
      );
    }
    E.push("");
    E.push("  On-invoke cost is paid each time a skill or agent fires.");
    E.push("  Token counts are estimates and may differ from actual usage.");
  }
  let Q = await s();
  await renderAndRun(
    Q,
    jsxProd_default(Text, {
      children: formatMessageLines(E),
    }),
  );
  if (q) await logFeatureOkAsync("cli_plugin_details");
  else await logFeatureSadAsync("cli_plugin_details", "count_tokens_unreachable");
}
//@ chunk-d4eg9at2.js:42348-42494 layout
async function finishPluginDetails(s, json, i, u) {
  let p = stripInvisibleKeepNewlines(i);
  if (json) printCliError(p);
  else
    await renderAndRun(
      await s(),
      jsxProd_default(Text, {
        children: p,
      }),
    );
  await logFeatureBadAsync("cli_plugin_details", u);
  return json ? cliErrorAfterAnalyticsFlush() : exitAfterAnalyticsFlush(1);
}
//@ chunk-d4eg9at2.js:42494-42536 layout
function formatMessageLines(s) {
  return s.map(stripInvisibleKeepEmoji).join(`
`);
}
//@ chunk-d4eg9at2.js:42536-42615 layout
function printPluginWarnings(knownMarketplaces) {
  for (let { message } of listReservedNameRefusals(knownMarketplaces))
    console.error(`${figures_default.warning} ${message}`);
}
//@ chunk-d4eg9at2.js:42615-42653 layout
function printJson(s) {
  return escapeControlChars(jsonStringify(s, null, 2));
}
//@ chunk-d4eg9at2.js:42653-42920 layout
function filterInventoryBySource(s, o) {
  let i = (P) => marketplaceOf(P.source) === s;
  let filtered = o.plugins.filter(i);
  let filtered_2 = o.errors.filter(i);
  let filtered_3 = o.warnings.filter(i);
  return {
    plugins: filtered,
    errors: filtered_2,
    warnings: filtered_3,
    standaloneErrorRows: filtered_2.filter((P) => !filtered.some((y) => sameSourceAndName(P, y))),
    standaloneWarningRows: filtered_3.filter((P) => !filtered.some((y) => sameSourceAndNameAlt(P, y))),
  };
}
//@ chunk-d4eg9at2.js:42920-43027 layout
function hasInventoryRows(options) {
  return (
    options.plugins.length > 0 ||
    options.standaloneErrorRows.length > 0 ||
    options.standaloneWarningRows.length > 0
  );
}
//@ chunk-d4eg9at2.js:43027-43872 fingerprint = pluginListHandler (0.486)
function pluginListHandler_2(options) {
  if (!hasInventoryRows(options)) return [];
  let { standaloneErrorRows, standaloneWarningRows } = options;
  let allLoadedPlugins = [options.header, ""];
  for (let p of standaloneWarningRows)
    allLoadedPlugins.push(`  ${figures_default.warning} ${pluginWarningText(p)}`, "");
  for (let plugin of options.plugins) {
    let inlinePlugins = options.errors.filter((error) => sameSourceAndName(error, plugin));
    let inlineLoadErrors = options.warnings.filter((warning) => sameSourceAndNameAlt(warning, plugin));
    let y =
      plugin.enabled !== false && isRequiredPlugin(plugin.source, plugin.installationPreference)
        ? " \xB7 required by your org"
        : "";
    let I =
      (plugin.enabled === false
        ? `${figures_default.cross} disabled`
        : inlinePlugins.length > 0
          ? `${figures_default.cross} loaded with errors`
          : `${figures_default.tick} loaded`) + y;
    allLoadedPlugins.push(`  ${figures_default.pointer} ${plugin.source}`);
    allLoadedPlugins.push(`    Version: ${plugin.manifest.version ?? "unknown"}`);
    if (options.showScope) allLoadedPlugins.push(`    Scope: ${options.scopeOf(plugin)}`);
    allLoadedPlugins.push(`    Path: ${options.pathOf(plugin)}`);
    allLoadedPlugins.push(`    Status: ${I}`);
    for (let error of inlinePlugins) allLoadedPlugins.push(`    Error: ${pluginErrorText(error)}`);
    for (let inlineLoadError of inlineLoadErrors)
      allLoadedPlugins.push(`    Note: ${pluginWarningText(inlineLoadError)}`);
    allLoadedPlugins.push("");
  }
  for (let p of standaloneErrorRows)
    allLoadedPlugins.push(
      `  ${figures_default.pointer} ${p.source}: ${figures_default.cross} ${pluginErrorText(p)}`,
      "",
    );
  return allLoadedPlugins;
}
//@ chunk-d4eg9at2.js:43872-43939 sole-consumer
function toValidationIssue({ path, message }) {
  return {
    path,
    message,
    code: null,
  };
}
//@ chunk-d4eg9at2.js:43939-44176 sole-consumer
function toValidationFileJson(result) {
  return {
    file: result.filePath,
    type: result.fileType,
    errors: result.errors.map(toValidationIssue),
    warnings: result.warnings.map(toValidationIssue),
    notes: result.notes ?? [],
    gatingHooks: (result.gatingHooks ?? []).map((o) => ({
      module: o.module,
      pattern: o.pattern,
      hook: o.hook,
      hasCatch: o.hasCatch,
    })),
  };
}
//@ chunk-d4eg9at2.js:44176-44350 sole-consumer
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
//@ chunk-d4eg9at2.js:44350-45266 sole-consumer
/**
 * 把插件错误/警告对象压成 JSON 列表里的 detail：type 加上 plugin、marketplace、依赖、服务器名、组件、路径、URL、related（遮蔽者/改名/阻塞者）等能识别的字段。
 */
function pluginIssueDetail(issue) {
  let o = issue;
  let i = (A) => {
    let z = o[A];
    return typeof z === "string" ? z : undefined;
  };
  let u = {
    type: issue.type,
  };
  let p = i("plugin") ?? i("pluginId");
  if (p !== undefined) u.plugin = p;
  let g = i("marketplace");
  if (g !== undefined) u.marketplace = g;
  let P = i("dependency");
  if (P !== undefined) u.dependency = P;
  let y = i("serverName");
  if (y !== undefined) u.serverName = y;
  let I = i("component");
  if (I !== undefined) u.component = I;
  let v =
    i("manifestPath") ??
    i("path") ??
    i("folderPath") ??
    i("hookPath") ??
    i("mcpbPath") ??
    i("installPath") ??
    i("filePath") ??
    i("heldAt");
  if (v !== undefined) u.path = v;
  let m = i("url") ?? i("gitUrl");
  if (m !== undefined) u.url = m;
  if (issue.type === "marketplace-not-found" && issue.registrationHidden !== undefined)
    u.registrationHidden = issue.registrationHidden;
  let k = i("duplicateOf") ?? i("activeServer");
  let F = k?.startsWith("plugin:") ? k.split(":")[1] : undefined;
  let blockedBy = o.blockedBy;
  let h =
    i("shadowedBy") ??
    i("renamedTo") ??
    F ??
    (Array.isArray(blockedBy) && blockedBy.every((A) => typeof A === "string")
      ? blockedBy.join(", ")
      : undefined);
  if (h !== undefined) u.related = h;
  return u;
}
//@ chunk-d4eg9at2.js:45266-46214 sole-consumer
/**
 * 生成 claude plugin list --json 的条目：每个已装插件的 id、版本、作用域、启用状态、安装路径、MCP 服务器、错误与提示（文字与 detail）；另加独立的错误行与警告行。
 */
async function buildPluginListJson(listing, credentials) {
  let i = [];
  for (let plugin of listing.plugins) {
    let p =
      plugin.mcpServers ||
      (await loadPluginMcpServersFromSources(plugin, undefined, credentials, undefined, {
        readOnlyListing: true,
      }));
    let filtered = listing.errors.filter((error) => sameSourceAndName(error, plugin));
    let filtered_2 = listing.warnings.filter((warning) => sameSourceAndNameAlt(warning, plugin));
    let mapped = filtered.map(pluginErrorText);
    let mapped_2 = filtered_2.map(pluginWarningText);
    i.push({
      id: plugin.source,
      version: plugin.manifest.version ?? "unknown",
      scope: listing.scopeOf(plugin),
      enabled: plugin.enabled !== false,
      installPath: plugin.path,
      mcpServers: p && Object.keys(p).length > 0 ? configuredMcpServers(p) : undefined,
      errors: mapped.length > 0 ? mapped : undefined,
      notes: mapped_2.length > 0 ? mapped_2 : undefined,
      errorDetails: filtered.length > 0 ? filtered.map(pluginIssueDetail) : undefined,
      noteDetails: filtered_2.length > 0 ? filtered_2.map(pluginIssueDetail) : undefined,
      hasUserConfig: hasPluginUserConfig(plugin),
    });
  }
  for (let u of listing.standaloneErrorRows)
    i.push({
      id: u.source,
      version: "unknown",
      scope: listing.standaloneErrorScope,
      enabled: false,
      installPath: ("path" in u ? u.path : undefined) ?? "",
      errors: [pluginErrorText(u)],
      errorDetails: [pluginIssueDetail(u)],
    });
  for (let u of listing.standaloneWarningRows)
    i.push({
      id: u.source,
      version: "unknown",
      scope: listing.standaloneWarningScope,
      enabled: u.type === "synced-plugin-shadowed",
      installPath: "",
      notes: [pluginWarningText(u)],
      noteDetails: [pluginIssueDetail(u)],
    });
  return i;
}
//@ chunk-d4eg9at2.js:46302-46342 placement
function cleanOptionTitle(s, o) {
  return stripInvisibleKeepEmoji(o?.title || s);
}
//@ chunk-d4eg9at2.js:46342-46413 placement
class OptionParseError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  option;
  constructor(s, o, option) {
    super(s, o);
    this.option = option;
  }
}
//@ chunk-d4eg9at2.js:46413-46592 placement
/**
 * 把输入校验为"值全是字符串的普通对象"并复制到无原型对象；不是对象或有非字符串值时返回 undefined。
 */
function parseStringRecord(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return;
  let o = Object.create(null);
  for (let [key, value_2] of Object.entries(value)) {
    if (typeof value_2 !== "string") return;
    o[key] = value_2;
  }
  return o;
}
//@ chunk-d4eg9at2.js:46781-48268 sole-consumer
/**
 * claude plugin configure：校验每个选项已在 userConfig 声明、单行且不超过 64 KB、必填不为空、布尔/数字格式正确，再按 schema 校验后保存，返回改动的键。
 */
async function configurePluginOptions(plugin, values, scope, credentials) {
  let userConfig = plugin.manifest.userConfig ?? {};
  let filtered = Object.keys(values).filter((key) => !Object.hasOwn(userConfig, key));
  if (filtered.length > 0) {
    let mapped = Object.keys(userConfig).map(stripInvisibleKeepEmoji);
    throw new OptionParseError(
      `This plugin has no ${plural(filtered.length, "option")} ${filtered.map((k) => `"${stripInvisibleKeepEmoji(k)}"`).join(", ")}.` +
        (mapped.length > 0 ? ` Known options: ${mapped.join(", ")}.` : ""),
      "plugin configure: option not declared in userConfig",
    );
  }
  let P = marketplaceSource(plugin);
  let initialValues = await loadPluginOptions(P, credentials);
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
    let schema = userConfig[key];
    let trimmed = value.trim();
    let h = getOwn(initialValues, key);
    if (
      trimmed === "" &&
      schema?.required === true &&
      !(schema.sensitive === true && h !== undefined && h !== "")
    )
      throw new OptionParseError(
        `${cleanOptionTitle(key, schema)} is required but not provided`,
        "plugin configure: required option blank",
        key,
      );
    if (schema?.type === "boolean" && trimmed !== "" && truthyOrFalsyEnv(trimmed) === undefined)
      throw new OptionParseError(
        `${cleanOptionTitle(key, schema)} must be true or false (or 1/0, yes/no, on/off).`,
        "plugin configure: option value is not a boolean",
        key,
      );
    if (schema?.type === "number" && trimmed !== "" && parseBoundedNumber(trimmed, schema) === undefined)
      throw new OptionParseError(
        `${cleanOptionTitle(key, schema)}: ${getFormatHint(schema)}`,
        "plugin configure: option value is not a number the field takes",
        key,
      );
  }
  let finalValues = buildFinalValues(Object.keys(values), values, userConfig, initialValues);
  let keys = Object.keys(finalValues);
  if (keys.length === 0) return [];
  for (let m of keys) {
    let k = validateUserConfig(
      {
        [m]: finalValues[m],
      },
      {
        [m]: userConfig[m],
      },
    );
    if (!k.valid)
      throw new OptionParseError(
        stripInvisibleKeepEmoji(k.errors.join("; ")),
        "plugin configure: value rejected by the userConfig schema",
        m,
      );
  }
  await savePluginOptions(P, finalValues, userConfig, scope, credentials);
  return keys;
}
//@ chunk-d4eg9at2.js:48268-48337 affinity
function redactSubstrings(s, o) {
  return s.reduce((acc, u) => acc.split(u).join("\u2026"), o);
}
//@ chunk-d4eg9at2.js:48337-51461 facade-exports
async function pluginConfigureHandler(s, o, scope, credentials) {
  if (o.cowork) setUseCoworkPlugins(true);
  isPluginCommandContext();
  logEvent("tengu_plugin_configure_command", {});
  await ensureSyncedPluginDirsRegistered();
  let { enabled, disabled } = await loadAllPlugins(scope, credentials);
  let plugin = findMarketplace([...enabled, ...disabled], s);
  if (!plugin) {
    await logFeatureBadAsync("cli_plugin_configure", "not_found");
    return cliErrorAfterAnalyticsFlush(
      stripInvisibleKeepNewlines(
        `No installed plugin has the id "${stripInvisibleKeepEmoji(s)}". Use its full id (name@marketplace), as \`claude plugin list${o.cowork ? " --cowork" : ""}\` shows it.`,
      ),
    );
  }
  let y = marketplaceSource(plugin);
  let userConfig = plugin.manifest.userConfig ?? {};
  let pluginDisplayName = getPluginDisplayName(plugin);
  let m = "Example: claude plugin configure <plugin> --values-stdin < values.json";
  if (o.valuesStdin) {
    if (process.stdin.isTTY) {
      await logFeatureBadAsync("cli_plugin_configure", "invalid_stdin");
      return cliErrorAfterAnalyticsFlush(stripInvisibleKeepNewlines(`No option values were piped in. ${m}`));
    }
    let T;
    let R = false;
    try {
      let options = await getOptions_2();
      R = options === undefined;
      T = options === undefined ? undefined : jsonParse(options);
    } catch {
      T = undefined;
    }
    let stringRecord = parseStringRecord(T);
    if (stringRecord === undefined) {
      await logFeatureBadAsync("cli_plugin_configure", "invalid_stdin");
      return cliErrorAfterAnalyticsFlush(
        stripInvisibleKeepNewlines(
          R
            ? "The input on stdin is over the 256 KB limit."
            : `The input on stdin isn't a JSON object of strings. ${m}`,
        ),
      );
    }
    let sorted = Object.entries(stringRecord)
      .filter(([key]) => Object.hasOwn(userConfig, key) && userConfig[key]?.sensitive)
      .flatMap(([, value]) => [value, value.trim()])
      .filter((G) => G !== "")
      .sort((G, J) => J.length - G.length);
    let D;
    try {
      D = await configurePluginOptions(plugin, stringRecord, scope, credentials);
    } catch (error) {
      if (error instanceof OptionParseError)
        await logFeatureSadAsync("cli_plugin_configure", "value_refused");
      else await logFeatureBadAsync("cli_plugin_configure", "save_failed");
      if (o.json && error instanceof OptionParseError) {
        let J = {
          pluginId: y,
          displayName: pluginDisplayName,
          refused: {
            option: error.option,
            message: redactSubstrings(sorted, error.message),
          },
        };
        await writeStdoutAndDrain(
          printJson(J) +
            `
`,
        );
      }
      return cliErrorAfterAnalyticsFlush(
        stripInvisibleKeepNewlines(
          redactSubstrings(sorted, `Failed to save configuration: ${errorMessage(error)}`),
        ),
      );
    }
    let M;
    try {
      M = Object.keys(await getUnconfiguredOptions(plugin, credentials));
    } catch (error) {
      logForDebugging(
        redactSubstrings(
          sorted,
          `plugin configure: saved, but the re-read of unset options failed: ${errorMessage(error)}`,
        ),
        {
          level: "error",
        },
      );
    }
    await logFeatureOkAsync("cli_plugin_configure");
    if (o.json) {
      let G = {
        pluginId: y,
        displayName: pluginDisplayName,
        saved: D,
        ...(M === undefined
          ? {}
          : {
              unconfigured: M,
            }),
      };
      await writeStdoutAndDrain(
        printJson(G) +
          `
`,
      );
    } else
      await writeStdoutAndDrain(
        (D.length > 0
          ? "Configuration saved. Restart Claude Code to apply it."
          : "No configuration changes.") +
          `
`,
      );
    await exitAfterAnalyticsFlush(0);
    return;
  }
  let k;
  let unconfigured;
  try {
    k = await loadPluginOptions(y, credentials);
    unconfigured = Object.keys(await getUnconfiguredOptions(plugin, credentials));
  } catch (error) {
    await logFeatureBadAsync("cli_plugin_configure", "saved_options_read_failed");
    return cliErrorAfterAnalyticsFlush(
      stripInvisibleKeepNewlines(`Could not read the saved options for "${y}": ${errorMessage(error)}`),
    );
  }
  let options = trustedPluginSetting(y).options ?? {};
  let h = [];
  let A = Object.create(null);
  for (let [key, value] of Object.entries(userConfig)) {
    let E = getOwn(k, key);
    if (E === undefined || E === "") continue;
    h.push(key);
    if (value.type === "boolean") {
      A[key] = E;
      continue;
    }
    let x = Object.hasOwn(options, key) ? options[key] : undefined;
    if (value.sensitive !== true && x !== undefined && x !== "") A[key] = x;
  }
  let z = {};
  for (let [key, value] of Object.entries(userConfig)) {
    let E = userConfigFieldParser(value);
    if (E !== undefined) z[key] = E;
  }
  await logFeatureOkAsync("cli_plugin_configure");
  if (o.json) {
    let T = {
      pluginId: y,
      displayName: pluginDisplayName,
      schema: userConfig,
      inputs: pluginUserConfigValues(userConfig, A),
      choices: z,
      configured: h,
      unconfigured,
    };
    await writeStdoutAndDrain(
      printJson(T) +
        `
`,
    );
    await exitAfterAnalyticsFlush(0);
    return;
  }
  let L = [];
  if (Object.keys(userConfig).length === 0) L.push(`${pluginDisplayName} (${y}) has no options to set.`);
  else {
    L.push(`Options for ${pluginDisplayName} (${y}):`);
    for (let [key, value] of Object.entries(userConfig)) {
      let filtered = [
        value.required ? "required" : "optional",
        value.sensitive ? "sensitive" : undefined,
        h.includes(key) ? "set" : "not set",
      ].filter(Boolean);
      let x = value.title && value.title !== key ? ` \u2014 ${value.title}` : "";
      L.push(`  ${figures_default.pointer} ${key}${x} (${filtered.join(", ")})`);
    }
    L.push(
      "",
      "Set values with /plugin configure <plugin> in Claude Code, or pipe a JSON object to `claude plugin configure <plugin> --values-stdin`.",
    );
  }
  await writeStdoutAndDrain(
    formatMessageLines(L) +
      `
`,
  );
  await exitAfterAnalyticsFlush(0);
}
//@ chunk-d4eg9at2.js:51461-51520 sole-consumer
function configuredMcpServers(s) {
  return xr(s, (o) => Uo(o, "configuredCommand"));
}
//@ chunk-y5m1jrzk.js:265-3494 placement
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
//@ chunk-y5m1jrzk.js:3494-3632 placement
/**
 * 列出当前可用的 plugin 子命令（按抢先体验开关过滤）。
 */
function listAvailablePluginSubcommands() {
  let a = {
    pluginEval: shardedSnowflakeOff(),
    hooksModules: areHooksModulesActive(),
  };
  return Object.values(PLUGIN_SUBCOMMANDS).filter((e) => e.earlyAccess === undefined || a[e.earlyAccess]);
}
//@ chunk-z2kk8ttr.js:15018-15898 placement
/**
 * plugin install --marketplace 相关的帮助文本与辅助：添加市场/从市场安装的提示、市场源非法与需要裸插件名的说明、"市场已添加"注记、保留名判定与错误构造、日志与 error_ 前缀剥离。
 */
var PLUGIN_INSTALL_MARKETPLACE_USAGE = "claude plugin install <plugin> --marketplace <source>";
var PLUGIN_ADD_MARKETPLACE_HELP = "add marketplace";
var PLUGIN_INSTALL_FROM_MARKETPLACE_HELP = "install from marketplace";
var INVALID_MARKETPLACE_SOURCE_HINT = `${INVALID_MARKETPLACE_SOURCE_MESSAGE} (a marketplace already added is named after the plugin instead: <plugin>@<marketplace>)`;
var MARKETPLACE_NEEDS_BARE_NAME_HINT = `--marketplace needs the plugin's bare name. ${PLUGIN_ID_PART_RULE} Usage: ${PLUGIN_INSTALL_MARKETPLACE_USAGE}`;
var MARKETPLACE_ADDED_NOTE = " The marketplace itself was added, and is declared in user settings.";
var isReservedMarketplaceNameForPlugin = (e) =>
  !isValidPluginIdSegment(e) || isReservedMarketplaceName(e.toLowerCase());
var reservedMarketplaceNameError = (e, t) =>
  Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Marketplace ${jsonStringify(e)} can't be named after a plugin as <plugin>@<marketplace>, so nothing was installed from it.` +
        (t ? MARKETPLACE_ADDED_NOTE : ""),
      "install --marketplace: the marketplace name is no plugin id half",
    ),
    {
      pluginCommandErrorCategory: "validation",
    },
  );
var formatLines = (e) => `${e.map(stripInvisibleKeepEmoji).join(`
`)}
`;
var logMarketplaceAdded = (e, marketplaceInput) =>
  logEventAsync("tengu_marketplace_added", {
    _PROTO_marketplace_name: e,
    source_type: fromEnum(marketplaceInput.source),
    repo_hash: marketplaceInput.source === "github" ? shortHash(marketplaceInput.repo) : undefined,
    is_official_marketplace: isOfficialMarketplaceName_3(e),
  });
var stripErrorPrefix = (e) => e.replace(/^error_/, "");
//@ chunk-z2kk8ttr.js:15898-17176 placement
async function pluginInstallFromMarketplace(
  e,
  { plugins, marketplaceSource, options },
  { storageV5, credentials },
) {
  let n = validateMarketplaceInstallArgs({
    plugins,
    marketplaceSource,
    commandLine: PLUGIN_INSTALL_MARKETPLACE_USAGE,
  });
  if ("usageError" in n) return cliError(`${figures_default.cross} ${n.usageError}`);
  if (!isValidPluginIdSegment(n.plugin))
    return cliError(`${figures_default.cross} ${MARKETPLACE_NEEDS_BARE_NAME_HINT}`);
  let scope = requireInstallableScope(options);
  let l = [];
  let s;
  let p = PLUGIN_ADD_MARKETPLACE_HELP;
  try {
    let marketplaceInput = await parseMarketplaceInput(n.marketplaceSource);
    if (!marketplaceInput || "error" in marketplaceInput)
      throw withMarketplaceFailureCode(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          marketplaceInput?.error ?? INVALID_MARKETPLACE_SOURCE_HINT,
          "install --marketplace: the value is not a marketplace source",
        ),
        marketplaceInput?.unreadable === true ? undefined : "invalid_source",
      );
    let a = await linkMarketplaceInUse(marketplaceInput, storageV5);
    if (a === undefined) {
      if (!options.json)
        await writeStdoutAndDrain(`Adding marketplace\u2026
`);
      let { name: m, resolvedSource } = await addMarketplaceSource(
        marketplaceInput,
        (M) => {
          l.push(M);
        },
        storageV5,
        undefined,
        {
          refuseNameCollision: true,
        },
      );
      let { error } = await saveMarketplaceToSettings(
        m,
        {
          source: resolvedSource,
        },
        "userSettings",
        storageV5,
      );
      if (error) throw error;
      refreshPluginCaches(storageV5, credentials);
      await logMarketplaceAdded(m, marketplaceInput);
      s = m;
      l.push(`${figures_default.tick} Successfully added marketplace: ${m} (declared in user settings)`);
    } else {
      s = a;
      l.push(`Marketplace '${a}' is already added`);
    }
    if (isReservedMarketplaceNameForPlugin(s)) {
      p = PLUGIN_INSTALL_FROM_MARKETPLACE_HELP;
      throw reservedMarketplaceNameError(s, a === undefined);
    }
  } catch (error) {
    let a = pluginErrorKind(error);
    if (!options.json && p === PLUGIN_INSTALL_FROM_MARKETPLACE_HELP)
      await writeStdoutAndDrain(formatLines(l));
    if (options.json)
      await writePluginResult({
        command: "install",
        outcome: "failed",
        plugin: n.plugin,
        scope,
        message: stripInvisibleKeepNewlines(errorMessage(error)),
        failureCode: a,
      });
    await (error instanceof CommandSourceError && classifyCommandSourceError(error).kind === "sad"
      ? logFeatureSadAsync("cli_plugin_install", stripErrorPrefix(a))
      : logFeatureBadAsync("cli_plugin_install", stripErrorPrefix(a)));
    await flushAnalyticsBeforeExit();
    return handleMarketplaceError(error, p);
  }
  if (!options.json) await writeStdoutAndDrain(formatLines(l));
  await pluginInstallHandler(e, `${n.plugin}@${s}`, options, storageV5);
}
export { formatMessageLines, PLUGIN_SUBCOMMANDS, listAvailablePluginSubcommands };
