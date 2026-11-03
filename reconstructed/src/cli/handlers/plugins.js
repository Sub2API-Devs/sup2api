/**
 * cli/handlers/plugins.ts
 *
 * 并入旧版已有路径：plugin 子命令（init/validate/tag、从 marketplace 安装）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/handlers/plugins.ts
 * pieces: chunk-d4eg9at2.js (59), chunk-y5m1jrzk.js (2), chunk-z2kk8ttr.js (2)
 * attribution: placement 15, facade-exports 20, layout 16, fingerprint 2, sole-consumer 8, file-local 1, affinity 1
 */
import { join, relative, resolve } from "path";
import { j, Qr, fo } from "../../../vendor/react/cjs/react.production.js";
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
  Hks,
  classifyPluginCommandError,
  settingsFileWarning,
  writePluginResult,
  rfo,
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
  bfe,
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
import { Bd } from "../../utils/plugins/commandSource.js";
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
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
import { Eki, getGitEmail } from "../../services/analytics/growthbook.js";
import {
  SKILLS_DIR,
  BUILTIN,
  INLINE_PLUGIN_MARKETPLACE,
  SYNCED,
  r$e,
  logPluginLoadErrors,
} from "../../utils/telemetry/pluginTelemetry.js";
import { getSettings_DEPRECATED } from "../../utils/settings/settings.js";
import { af } from "../../utils/plugins/pluginPolicy.js";
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
  Dse,
  removeMarketplaceWithReservedSiblings,
  refreshMarketplaceDeduped,
  refreshAllMarketplaces,
  ugn,
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
import { Qbn } from "../../services/plugins/accountSync/syncedPluginHooks.js";
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
import { w as w_2 } from "../../../vendor/react/compiler-runtime.js";
import {
  logMarketplaceAddFailed,
  logDirectoryBlockedOnce,
  logDirectoryToggle,
} from "../../utils/plugins/pluginDirectoryTelemetry.js";
import { ic } from "../../utils/plugins/cacheUtils.js";
import { parseDeepLinkMarketplace } from "../../utils/deepLink/parseDeepLink.js";
import { parseMarketplaceInput } from "../../utils/plugins/parseMarketplaceInput.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";
import { fromEnum, lit, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { gn } from "../../utils/shortHash.js";
import { resolveMissingDependencies } from "../../utils/plugins/dependencyInstall.js";
import { formatDependencyCountSuffix } from "../../utils/plugins/dependencyResolver.js";
import { settingsSourceName } from "../../utils/settings/settingsSourceTrust.js";
import {
  listClaudeAiMarketplaces,
  ClaudeAiMarketplaceError,
  findAccountMarketplaceByName,
  addClaudeAiMarketplace,
  describeMarketplaceFreshness,
  ljt,
  formatMarketplaceScopeLabel,
  filterUnaddedClaudeAiMarketplaces,
  readClaudeAiMarketplaceRegistry,
  X5,
  ensureClaudeAiMarketplace,
  formatClaudeAiMarketplaceLabel,
  formatGitSourceSpec,
  Qbt,
} from "../../utils/plugins/claudeAiMarketplaces.js";
import { REDACTED_URL } from "../../utils/redaction/urlRedaction.js";
import { kk } from "../../utils/plugins/commandSourceErrors.js";
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
import { oe, ge, parseStringRecord } from "./_new/parseStringRecord.js";
import {
  marketplaceSource,
  loadPluginOptions,
  savePluginOptions,
  findMarketplace,
  getUnconfiguredOptions,
} from "../../utils/plugins/pluginOptionsStorage.js";
import { Pn, getOptions_2 } from "../../ink/root.js";
import { getOwn } from "../../utils/objectSafety.js";
import { h7e, parseBoundedNumber, getFormatHint } from "../../utils/plugins/pluginConfigEnv.js";
import { buildFinalValues } from "../../commands/plugin/PluginOptionsDialog.js";
import { validateUserConfig } from "../../utils/plugins/mcpbHandler.js";
import { trustedPluginSetting } from "../../utils/plugins/pluginConfigSources.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { J_n } from "../../utils/plugins/pluginGates.js";
import { areHooksModulesActive } from "../../services/analytics/growthbookCredentials.js";
import { validateMarketplaceInstallArgs } from "../../commands/plugin/parseArgs.js";
import { classifyCommandSourceError } from "../../utils/plugins/headersHelper.js";

//@ chunk-d4eg9at2.js:2435-2439 placement
j();
//@ chunk-d4eg9at2.js:2497-2549 placement
var installedVersionOf = (s, o) => (s === void 0 ? void 0 : o?.manifest.version);
//@ chunk-d4eg9at2.js:2549-2697 placement
async function resolveLocalPluginFolder(pluginId, installed, options) {
  if (installed !== void 0) return installed.readFromFolderAt === void 0 ? void 0 : installed.path;
  let u = await resolvePluginSourceLocation(pluginId, options);
  return u.kind === "folder" ? u.path : void 0;
}
//@ chunk-d4eg9at2.js:2697-2815 placement
async function resolvePluginVersions(s, o, i) {
  let results = await Promise.all(s.map((p) => resolveLocalPluginFolder(p, o.get(p), i)));
  return new Map(s.map((p, g) => [p, results[g]]));
}
//@ chunk-d4eg9at2.js:2815-2889 placement
function displayVersion(s, o, i) {
  return (i === void 0 ? s : (o?.manifest.version ?? s)) || "unknown";
}
//@ chunk-d4eg9at2.js:2889-2950 placement
async function writeJsonLine(s) {
  await writeStdoutAndDrain(
    escapeControlChars(jsonStringify({ ...s, nonce: Hks() })) +
      `
`,
  );
}
//@ chunk-d4eg9at2.js:2950-3029 placement
function pluginErrorKind(s) {
  if (s instanceof bfe) return s.reason.kind;
  return getMarketplaceFailureCode(s) ?? classifyPluginCommandError(s);
}
//@ chunk-d4eg9at2.js:3029-3138 placement
function declaredErrorLines(s, o) {
  return reservedMarketplaceNameMessage(s, { declaredInSettings: o }).map(
    (i, u) => `${u === 0 ? "    Error: " : "           "}${i}`,
  );
}
//@ chunk-d4eg9at2.js:3138-3249 placement
async function logPluginCommandFailure(s, o, i) {
  if (o instanceof Bd) await logFeatureSadAsync(s, "command_source_refused");
  else await logFeatureBadAsync(s, i);
  await flushAnalyticsBeforeExit();
}
//@ chunk-d4eg9at2.js:3249-3681 placement
function marketplaceUpdateSummary(s, o, i, u = 0, p = []) {
  let g = s - o.length - i.length,
    P = [];
  if (o.length > 0)
    P.push(
      marketplacesRefusedByPolicyClause(
        o.length,
        o.map((y) => displayMarketplaceName(y)),
      ),
    );
  if (i.length > 0)
    P.push(
      formatRefreshFailedMessage(
        i.length,
        i.map((y) => displayMarketplaceName(y)),
      ),
    );
  if (u > 0)
    P.push(
      `${u} ${plural(u, "marketplace")} skipped (nothing to refresh: declared in settings, managed, or not allowed)`,
    );
  if (p.length > 0)
    P.push(`${OFFICIAL_MARKETPLACE_DISPLAY} (built in) could not be refreshed and was skipped (see --debug)`);
  return { messages: P, summary: pluginUpdateSummary(g, o.length, i.length) };
}
//@ chunk-d4eg9at2.js:3681-4007 placement
function pluginUpdateSummary(s, o, i) {
  let u = marketplaceUpdateIcon({ failedCount: i, updatedCount: s, policyRefusedCount: o }),
    p =
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
/**
 * 插件/市场命令出错的统一处理：策略拒绝打印 refused，其他错误记日志并以错误退出。
 */
//@ chunk-d4eg9at2.js:4007-4192 facade-exports = handleMarketplaceError (0.768)
function handleMarketplaceError(error, action) {
  if (error instanceof Bd)
    return (
      logForDebugging(`${action} refused: ${error.message}`),
      cliError(stripInvisibleKeepNewlines(error.message))
    );
  (logForDebugging(`Failed to ${action}: ${errorMessage(error)}`, { level: "error" }),
    cliError(stripInvisibleKeepNewlines(`${re.cross} Failed to ${action}: ${errorMessage(error)}`)));
}
//@ chunk-d4eg9at2.js:4192-4321 layout
async function reportOperationFailure(s, o, i, u = s) {
  if (i !== void 0)
    await writeJsonLine({
      ...i,
      outcome: "failed",
      message: stripInvisibleKeepNewlines(errorMessage(s)),
      failureCode: pluginErrorKind(u),
    });
  return handleMarketplaceError(s, o);
}
//@ chunk-d4eg9at2.js:4321-4378 layout
function asMarketplaceError(s, o = 300) {
  return s instanceof Bd ? s : printableName(errorMessage(s), o);
}
//@ chunk-d4eg9at2.js:4378-4885 fingerprint = printValidationResult (0.867)
function printValidationResult(result) {
  let o = [];
  if (result.errors.length > 0)
    (o.push(`${re.cross} Found ${result.errors.length} ${plural(result.errors.length, "error")}:`, ""),
      result.errors.forEach((error) => {
        o.push(`  ${re.pointer} ${error.path}: ${error.message}`);
      }),
      o.push(""));
  if (result.warnings.length > 0)
    (o.push(
      `${re.warning} Found ${result.warnings.length} ${plural(result.warnings.length, "warning")}:`,
      "",
    ),
      result.warnings.forEach((warning) => {
        o.push(`  ${re.pointer} ${warning.path}: ${warning.message}`);
      }),
      o.push(""));
  if (result.notes !== void 0)
    (result.notes.forEach((note) => {
      o.push(`  ${re.pointer} ${note}`);
    }),
      o.push(""));
  return o;
}
//@ chunk-d4eg9at2.js:4885-5108 layout
var VALID_PLUGIN_DIR_SHAPES =
  "one with .claude-plugin/plugin.json, or one with no plugin.json and a skills/<name>/SKILL.md; a symbolic link in place of the folder, of skills, of <name> or of SKILL.md does not count, and SKILL.md must be a file";
/**
 * claude plugin validate：校验插件/市场目录结构与清单。
 */
//@ chunk-d4eg9at2.js:5108-8930 facade-exports = pluginValidateHandler (0.276)
async function pluginValidateHandler(s, o, i) {
  if (i.cowork) setUseCoworkPlugins(!0);
  let u;
  try {
    u = await resolveValidateTarget(o);
  } catch (error) {
    if (isFsInaccessible(error))
      logForDebugging(`Plugin validation failed for ${o}: ${errorMessage(error)}`, { level: "error" });
    else logError(error);
    return (
      console.error(
        `${re.cross} Unexpected error during validation: ${sanitizeForDisplay(errorMessage(error), 200)}`,
      ),
      await logFeatureBadAsync("cli_plugin_validate", "cli_plugin_validate_exception"),
      exitAfterAnalyticsFlush(2)
    );
  }
  let { manifest: manifest, contents: contents } = u,
    {
      noErrors: noErrors,
      hasWarnings: hasWarnings,
      ...I
    } = summarizeValidationResults(manifest ? [manifest, ...contents] : contents, i),
    v = await readmeAdviceFor(o, manifest, contents),
    m = await import("./chunk-5aas12zq.js"),
    k = null,
    contentResults = [],
    B = !1,
    directoryChecksRoot = m.directoryChecksRoot(u);
  if (directoryChecksRoot !== null)
    try {
      if (((k = await m.lintPluginForDirectory(directoryChecksRoot)), k !== null))
        contentResults = m.formatDirectoryReport(
          directoryChecksRoot,
          k,
          i.profile === "directory" ? null : "this command with --profile directory",
        );
    } catch (error) {
      (logError(error),
        (B = !0),
        (k = null),
        (contentResults = m.formatDirectoryChecksFailure(directoryChecksRoot)));
    }
  let A;
  if (i.profile === "directory")
    if (B) A = { reason: "--profile directory: the plugin directory checks could not run" };
    else if (k === null)
      A = {
        reason:
          u.pluginRoot !== null
            ? "--profile directory could not read the plugin's manifest"
            : "--profile directory needs a plugin folder",
        note:
          u.pluginRoot !== null
            ? "--profile directory could not read this plugin's .claude-plugin/plugin.json as a regular file holding a JSON object (a symlink is not followed), so none of the plugin directory's rules were checked."
            : u.manifest?.fileType === "marketplace"
              ? `--profile directory needs a plugin folder (${VALID_PLUGIN_DIR_SHAPES}), and this target was validated as a marketplace. To check a plugin in it, pass that plugin's folder or its .claude-plugin/plugin.json. None of the plugin directory's rules were checked.`
              : m.isProjectClaudeFolder(u.resolvedPath)
                ? "--profile directory needs a plugin folder, and this is a project's .claude folder, which nobody submits to the plugin directory. None of its rules were checked."
                : `--profile directory needs a plugin folder (${VALID_PLUGIN_DIR_SHAPES}). None of the plugin directory's rules were checked.`,
      };
    else {
      let E = i.strict === !0,
        undecidedRulesThatFail = m.undecidedRulesThatFail(k.undecided, { strict: E }),
        D = m.directoryProfileFails(k.findings, { strict: E })
          ? k.findings.some((finding) => finding.blocking)
            ? "--profile directory: the plugin directory would refuse a submission of this plugin"
            : "--profile directory with --strict treats the plugin directory's warnings as errors"
          : void 0,
        M =
          undecidedRulesThatFail.length === 0
            ? void 0
            : `${undecidedRulesThatFail.length === 1 ? "a plugin directory rule" : "plugin directory rules"} could not be decided, because MCP or hooks files were not checked or could not be used: ${undecidedRulesThatFail.join(", ")}`;
      if (D !== void 0 || M !== void 0)
        A = {
          reason: D === void 0 ? `--profile directory: ${M}` : M === void 0 ? D : `${D}; also, ${M}`,
          ...(M !== void 0 && {
            note: '--profile directory fails this run because one or more rules could not be decided. The notes under "About these checks" (directory.notes in --json) name the files and say what to do.',
          }),
        };
    }
  let z =
      k !== null || A !== void 0 || B
        ? {
            profile: i.profile === "directory" ? "directory" : null,
            findings: k?.findings ?? [],
            undecided: k?.undecided ?? [],
            incomplete: k?.incomplete ?? !0,
            failure: A?.reason ?? null,
            notes: [
              ...(k?.notes ?? []),
              ...(B ? [m.DIRECTORY_CHECKS_COULD_NOT_RUN] : []),
              ...(A?.note === void 0 ? [] : [A.note]),
            ],
          }
        : null,
    L = I.allSuccess && A === void 0,
    T = () =>
      L
        ? logFeatureOkAsync("cli_plugin_validate")
        : logFeatureSadAsync("cli_plugin_validate", "cli_plugin_validate_failed");
  if (i.json)
    return (
      await writeStdoutAndDrain(
        printJson(buildValidateJsonOutput(u, { success: L, strict: i.strict === !0 }, v, z)) +
          `
`,
      ),
      await T(),
      exitAfterAnalyticsFlush(L ? 0 : 1)
    );
  let R = manifest
    ? [
        `Validating ${manifest.fileType} manifest: ${manifest.filePath}`,
        "",
        ...printValidationResult(manifest),
      ]
    : [`Validating components in: ${u.resolvedPath}`, ""];
  for (let E of contents)
    (R.push(`Validating ${E.fileType}: ${E.filePath}`, ""), R.push(...printValidationResult(E)));
  for (let E of contentResults) R.push(E);
  if (A?.note !== void 0) R.push(A.note, "");
  if ((R.push(...formatAdviceLines(v)), L))
    R.push(hasWarnings ? `${re.tick} Validation passed with warnings` : `${re.tick} Validation passed`);
  else if (I.allSuccess && A !== void 0) R.push(`${re.cross} Validation failed (${A.reason})`);
  else if (noErrors && hasWarnings)
    R.push(`${re.cross} Validation failed (--strict treats warnings as errors)`);
  else R.push(`${re.cross} Validation failed`);
  return (
    await renderAndRun(await s(), e(Text, { children: formatMessageLines(R) })),
    await T(),
    exitAfterAnalyticsFlush(L ? 0 : 1)
  );
}
//@ chunk-d4eg9at2.js:8930-10206 facade-exports
async function pluginTagHandler(s, o, i) {
  let u = await tagPluginRelease(o ?? ".", { force: i.force }),
    p = [];
  for (let warning of u.warnings) p.push(`${re.warning} ${warning}`);
  if (!u.ok) {
    (await logFeatureBadAsync("cli_plugin_tag", "cli_plugin_tag_prepare_failed"),
      p.push(`${re.cross} ${u.error}`),
      renderAndRun_2(s, p, 1));
    return;
  }
  let { plan: plan } = u;
  if (
    (p.push(`Plugin:  ${plan.pluginName}`, `Version: ${plan.version} (from ${plan.versionFrom})`),
    plan.marketplace)
  )
    p.push(
      `Marketplace entry: plugins[${plan.marketplace.entryIndex}] in ${plan.marketplace.path}` +
        (plan.marketplace.entryVersion ? ` (version: ${plan.marketplace.entryVersion})` : ""),
    );
  p.push(`Tag:     ${plan.tag}`, "");
  let P = i.remote ?? "origin",
    y = i.force ?? !1,
    I = formatTagName(plan, i.message),
    v = `git -C ${plan.gitRoot} push ${y ? "--force " : ""}${P} refs/tags/${plan.tag}`;
  if (i.dryRun) {
    (await logFeatureOkAsync("cli_plugin_tag"),
      p.push(
        `${re.tick} Dry run \u2014 would create tag ${plan.tag} at HEAD in ${plan.gitRoot}`,
        `  git -C ${plan.gitRoot} tag ${y ? "-f " : ""}-a ${plan.tag} -m ${jsonStringify(I)}`,
        `  ${v}`,
      ),
      renderAndRun_2(s, p, 0));
    return;
  }
  let m = await createPluginGitTag(plan, {
    push: i.push ?? !1,
    force: y,
    message: i.message,
    remote: P,
    allowGitTerminalPrompt: !0,
  });
  if (!m.ok) {
    (await logFeatureBadAsync("cli_plugin_tag", "cli_plugin_tag_create_failed"),
      p.push(`${re.cross} ${m.error}`),
      renderAndRun_2(s, p, 1));
    return;
  }
  if ((await logFeatureOkAsync("cli_plugin_tag"), p.push(`${re.tick} Created tag ${plan.tag}`), m.pushed))
    p.push(`${re.tick} Pushed to ${P}`);
  else p.push(`  Push with: ${v}`);
  renderAndRun_2(s, p, 0);
}
//@ chunk-d4eg9at2.js:10308-13016 facade-exports
async function pluginInitHandler(s, o, i, u) {
  let p = [],
    g = pluginNameProblem(o);
  if (g) {
    (await logFeatureBadAsync("cli_plugin_init", "invalid_name"),
      p.push(`${re.cross} Invalid plugin name "${o}": ${g}`),
      renderAndRun_2(s, p, 1));
    return;
  }
  let P = [];
  for (let D of i.with ?? [])
    if (PLUGIN_COMPONENT_KINDS.includes(D)) P.push(D);
    else {
      (await logFeatureBadAsync("cli_plugin_init", "invalid_component"),
        p.push(`${re.cross} Unknown --with component "${D}". Valid: ${PLUGIN_COMPONENT_KINDS.join(", ")}`),
        renderAndRun_2(s, p, 1));
      return;
    }
  if (!areLocalPluginDirsAllowedByPolicy()) {
    (await logFeatureBadAsync("cli_plugin_init", "policy_blocked"),
      p.push(`${re.cross} ${localPluginDirsBlockedMessage(tildify(join(getClaudeConfigDir(), "skills")))}`),
      renderAndRun_2(s, p, 1));
    return;
  }
  let y = join(getClaudeConfigDir(), "skills"),
    I = join(y, o);
  if (relative(y, resolve(I)).startsWith("..")) {
    (await logFeatureBadAsync("cli_plugin_init", "invalid_name"),
      p.push(`${re.cross} Plugin name "${o}" would write outside ${tildify(y)}`),
      renderAndRun_2(s, p, 1));
    return;
  }
  let v = i.author ?? (await Eki()),
    m = i.authorEmail ?? (await getGitEmail());
  if (!v && i.authorEmail)
    p.push(
      `${re.warning} --author-email was ignored because no author name was found. Pass --author or set git config user.name.`,
    );
  let k = v ? (m ? { name: v, email: m } : { name: v }) : void 0,
    F = pluginManifestTemplate({ name: o, description: i.description, author: k, with: P }),
    B;
  try {
    let D = await scaffoldPlugin(I, F, { force: i.force });
    if (!D.ok) {
      (await logFeatureBadAsync("cli_plugin_init", "target_exists"),
        p.push(`${re.cross} ${D.error}`),
        renderAndRun_2(s, p, 1));
      return;
    }
    B = D.skipped;
  } catch (error) {
    (await logFeatureBadAsync("cli_plugin_init", "write_failed"),
      logError(error),
      p.push(`${re.cross} Failed to write scaffold: ${errorMessage(error)}`),
      renderAndRun_2(s, p, 1));
    return;
  }
  for (let D of B) p.push(`  kept existing ${D} (use --force to overwrite)`);
  let h = await validateManifestForDisplay(I, { unrecordableNames: "warn" });
  if (!h.success || h.warnings.length > 0) p.push(...printValidationResult(h));
  if (!h.success) {
    (await logFeatureBadAsync("cli_plugin_init", "self_validate_failed"), renderAndRun_2(s, p, 1));
    return;
  }
  await logFeatureOkAsync("cli_plugin_init");
  let A = `${o}@${SKILLS_DIR}`;
  p.push(`${re.tick} Created plugin "${o}" at ${tildify(I)}`);
  let z = getSettings_DEPRECATED().enabledPlugins ?? {},
    L = af()?.has(o) ?? !1,
    T = await loadKnownMarketplacesSafe(u),
    found = Object.keys(z).find((D) => {
      let M = parsePluginIdentifier(D);
      return (
        M.name === o &&
        M.marketplace !== void 0 &&
        M.marketplace !== BUILTIN &&
        !isOfficialMarketplace(M.marketplace) &&
        T[M.marketplace] !== void 0
      );
    }),
    E = z[A] === !1;
  if (L)
    p.push(
      `  ${re.warning} A plugin named "${o}" is locked by managed settings, which takes precedence \u2014 ${A} won't load. To load this copy, give it a different "name" in .claude-plugin/plugin.json.`,
    );
  else if (found)
    p.push(
      `  ${re.warning} The name "${o}" is already taken by ${found} \u2014 when that plugin loads, ${A} won't. To load this copy, give it a different "name" in .claude-plugin/plugin.json or uninstall the conflicting plugin.`,
    );
  else if (E) {
    let D = claudeCommand("plugin enable", A);
    p.push(
      `  ${re.warning} A disabled setting for ${A} exists, so it won't load until you re-enable it${D ? `: ${D}` : " in /plugin"}`,
    );
  } else p.push(`  It will auto-load next session as ${A}. Run /reload-plugins to load it now.`);
  let x = claudeCommand("plugin disable", A);
  (p.push(`  ${x ? `Disable: ${x}. ` : "Disable: in /plugin. "}Remove: delete the directory.`),
    renderAndRun_2(s, p, 0));
}
//@ chunk-d4eg9at2.js:13016-17670 facade-exports
async function pluginListHandler(s, o, i, u) {
  if (o.cowork) setUseCoworkPlugins(!0);
  (isPluginCommandContext(), logEvent("tengu_plugin_list_command", {}));
  let p = await getInstalledPluginsAsync(i);
  if (
    o.json &&
    typeof o.dataSize === "string" &&
    !(Object.hasOwn(p.plugins, o.dataSize) && (p.plugins[o.dataSize]?.length ?? 0) > 0)
  )
    return cliErrorAfterAnalyticsFlush(`${re.cross} --data-size names a plugin that is not installed`);
  let { getPluginEditableScopes: getPluginEditableScopes, editableScopeOf: editableScopeOf } =
      await import("./chunk-4dq72jvx.js"),
    y = getPluginEditableScopes(),
    keys = Object.keys(p.plugins);
  await ensureSyncedPluginDirsRegistered();
  let {
      enabled: enabled,
      disabled: disabled,
      errors: errors,
      warnings: warnings,
    } = await loadAllPlugins(i, u),
    B = [...enabled, ...disabled],
    h = new Map(B.map((M) => [M.source, M])),
    A = { plugins: B, errors: errors, warnings: warnings },
    z = [
      {
        header: "Session-only plugins (--plugin-dir / --plugin-url):",
        scopeOf: () => "session",
        standaloneErrorScope: "session",
        standaloneWarningScope: "session",
        pathOf: (M) => M.path,
        showScope: !1,
        ...filterInventoryBySource(INLINE_PLUGIN_MARKETPLACE, A),
      },
      {
        header: `Synced from claude.ai${Qbn() ? "" : " \u2014 sync is off in this shell; these load only in a synced session"}:`,
        scopeOf: () => "synced",
        standaloneErrorScope: "synced",
        standaloneWarningScope: "synced",
        pathOf: (M) => M.path,
        showScope: !1,
        ...filterInventoryBySource(SYNCED, A),
      },
      {
        header: "Skills-directory plugins (.claude/skills/*):",
        scopeOf: (M) => M.scope ?? "user",
        standaloneErrorScope: "user",
        standaloneWarningScope: "project",
        pathOf: displaySkillsDirPath,
        showScope: !0,
        ...filterInventoryBySource(SKILLS_DIR, A),
      },
    ],
    L = await resolvePluginVersions(keys, h, i);
  if (o.json) {
    let M = [];
    for (let J of keys.sort()) {
      let q = p.plugins[J];
      if (!q || q.length === 0) continue;
      let ee = h.get(J),
        Q = ee?.name ?? parsePluginIdentifier(J).name,
        filtered = errors.filter((ae) => matchesPluginSource(ae, J, Q)),
        filtered_2 = warnings.filter((ae) => matchesPluginSource(ae, J, Q)),
        mapped = filtered.map(pluginErrorText),
        mapped_2 = filtered_2.map(pluginWarningText),
        mapped_3 = filtered.map(pluginIssueDetail),
        mapped_4 = filtered_2.map(pluginIssueDetail),
        he = isPluginEnabledAtProjectScope(J),
        ke,
        fe;
      if (o.dataSize === !0 || o.dataSize === J)
        try {
          ke = (await getPluginDataDirSize(J, { throwIfUnreadable: !0 })) ?? void 0;
        } catch {
          fe = !0;
        }
      for (let ae of q) {
        let Ce;
        if (ee) {
          let _e =
            ee.mcpServers ||
            (await loadPluginMcpServersFromSources(ee, void 0, i, void 0, { readOnlyListing: !0 }));
          if (_e && Object.keys(_e).length > 0) Ce = Ve(_e);
        }
        M.push({
          id: J,
          version: ae.version || "unknown",
          scope: ae.scope,
          enabled: editableScopeOf(y, J) !== void 0,
          installPath: ae.installPath,
          readFromFolder: L.get(J),
          folderVersion: installedVersionOf(L.get(J), ee),
          installedAt: ae.installedAt,
          lastUpdated: ae.lastUpdated,
          projectPath: ae.projectPath,
          mcpServers: Ce,
          errors: mapped.length > 0 ? mapped : void 0,
          notes: mapped_2.length > 0 ? mapped_2 : void 0,
          errorDetails: mapped_3.length > 0 ? mapped_3 : void 0,
          noteDetails: mapped_4.length > 0 ? mapped_4 : void 0,
          projectEnabled: he,
          dataDirSize: ke,
          dataDirUnreadable: fe,
          hasUserConfig: hasPluginUserConfig(ee),
        });
      }
    }
    for (let J of z) M.push(...(await buildPluginListJson(J, i)));
    let G;
    if (o.available) {
      let J = [];
      try {
        let [q, ee] = await Promise.all([loadKnownMarketplacesWithDeclared(i), getUniqueInstallCounts(i)]),
          { marketplaces: marketplaces } = await loadMarketplacesWithErrors(q, i),
          U =
            (await getPluginDirectoryState()) !== "unavailable"
              ? new Set(
                  groupBySource(
                    markFromPluginDirectory(
                      marketplaces.flatMap(({ name: name, data: data }) =>
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
                      q,
                    ),
                    q,
                    await allowlistedInstalledPlugins(q, i),
                  ).map((H) => H.pluginId),
                )
              : null;
        for (let { name: name, data: data } of marketplaces)
          if (data) {
            let filtered = data.plugins.filter((plugin) => {
              let K = formatPluginId(plugin.name, name);
              return !isPluginInstalled(K) && (U === null || U.has(K));
            });
            for (let Z of await pluginInstallPath(name, filtered, q, i)) {
              let K = formatPluginId(Z.name, name);
              J.push({
                pluginId: K,
                name: Z.name,
                description: Z.description,
                marketplaceName: name,
                version: Z.version,
                source: Z.source,
                installCount: ee?.get(K),
              });
            }
          }
      } catch {}
      G = printJson({ installed: M, available: J });
    } else G = printJson(M);
    (await writeStdoutAndDrain(
      G +
        `
`,
    ),
      await logFeatureOkAsync("cli_plugin_list"));
    return;
  }
  let T = [],
    R = await getInstalledListRefusal(i);
  if (R !== void 0) T.push(`Note: ${readInstalledPluginsFile(R)}`, "");
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
    let G = p.plugins[M];
    if (!G || G.length === 0) continue;
    let J = h.get(M)?.name ?? parsePluginIdentifier(M).name,
      filtered = errors.filter((Q) => matchesPluginSource(Q, M, J)),
      filtered_2 = warnings.filter((Q) => matchesPluginSource(Q, M, J));
    for (let Q of G) {
      let U = editableScopeOf(y, M) !== void 0,
        H =
          filtered.length > 0
            ? `${re.cross} failed to load`
            : U
              ? `${re.tick} enabled`
              : `${re.cross} disabled`,
        W = L.get(M),
        X = displayVersion(Q.version, h.get(M), W),
        scope = Q.scope;
      if ((T.push(`  ${re.pointer} ${M}`), T.push(`    Version: ${X}`), W !== void 0))
        T.push(`    Read from: ${printableOrEmpty(W)}`);
      (T.push(`    Scope: ${scope}`), T.push(`    Status: ${H}`));
      for (let K of filtered) {
        if (K.type === "marketplace-load-failed" && K.nameRefused) {
          T.push(...declaredErrorLines(K.marketplace, K.nameRefusedDeclaredInSettings === !0));
          continue;
        }
        T.push(
          `    Error: ${pluginErrorText(K)}${isMarketplaceLoadError(K) ? ` ${RELOAD_PLUGINS_HINT}` : ""}${marketplaceNotFoundMessage(K) !== void 0 ? `. ${marketplaceNotFoundMessage(K)}` : ""}`,
        );
      }
      for (let K of filtered_2) T.push(`    Note: ${pluginWarningText(K)}`);
      T.push("");
    }
  }
  for (let M of z) T.push(...pluginListHandler_2(M));
  let D = await s();
  (await renderAndRun(D, e(Text, { children: formatMessageLines(T) })),
    await logFeatureOkAsync("cli_plugin_list"));
}
//@ chunk-d4eg9at2.js:17670-17856 layout
function MarketplaceResultLines(props) {
  let u = w_2(4),
    { promise: promise } = props,
    i = Qr(promise),
    p;
  if (u[0] !== i) ((p = formatMessageLines(i)), (u[0] = i), (u[1] = p));
  else p = u[1];
  let g;
  if (u[2] !== p)
    ((g = e(RenderOnceAndExit, { children: e(Text, { children: p }) })), (u[2] = p), (u[3] = g));
  else g = u[3];
  return g;
}
/**
 * 市场来源格式错误提示文本。
 */
//@ chunk-d4eg9at2.js:17856-17941 facade-exports
var INVALID_MARKETPLACE_SOURCE_MESSAGE =
  "Invalid marketplace source format. Try: owner/repo, https://..., or ./path";
/**
 * claude plugin marketplace add：添加市场（owner/repo、URL 或路径），支持 --claudeai、--from-link、--resolve-only。
 */
//@ chunk-d4eg9at2.js:17941-22612 facade-exports = marketplaceAddHandler (0.454)
async function marketplaceAddHandler(s, o, i, u, p) {
  if (i.cowork) setUseCoworkPlugins(!0);
  if (i.resolveOnly === !0 && i.fromLink !== !0)
    return cliError(`${re.cross} --resolve-only needs --from-link`);
  if (i.claudeai) {
    if (i.sparse !== void 0 || i.scope !== void 0)
      return cliError(
        `${re.cross} --claudeai takes only the marketplace name (no --sparse or --scope: a claude.ai marketplace is hosted for your account, not declared in settings)`,
      );
    if (i.fromLink === !0) return cliError(`${re.cross} --claudeai can't be combined with --from-link`);
    await addClaudeAiMarketplaceCommand(s, o, u, p);
    return;
  }
  if (i.resolveOnly === !0) {
    if (i.sparse !== void 0 || i.scope !== void 0)
      return cliError(`${re.cross} --resolve-only can't be combined with --sparse or --scope`);
    await lookupMarketplaceLink(o, u);
    return;
  }
  if (i.fromLink !== !0 && isOfficialMarketplaceName_2(o)) {
    {
      let h = await getPluginDirectoryState();
      if (h === "blocked") {
        logMarketplaceAddFailed({ reason: "policy_blocked", sourceKind: void 0, surface: "cli" });
        let A = pluginDirectoryPolicyBlock();
        if (A !== null) logDirectoryBlockedOnce(A);
        return (
          await logFeatureBadAsync("cli_marketplace_add", "cli_marketplace_add_blocked_by_policy"),
          cliErrorAfterAnalyticsFlush(
            `${re.cross} ${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization. ${pluginDirectoryPolicyBlockHint()} It can't be turned on here.`,
          )
        );
      }
      if (h !== "unavailable") {
        if (i.sparse !== void 0 || i.scope !== void 0)
          return cliError(
            `${re.cross} ${OFFICIAL_MARKETPLACE_DISPLAY} is built in and not declared in any settings scope. Omit --sparse and --scope to turn it on.`,
          );
        if (h === "off") {
          try {
            await setPluginDirectoryEnabled(!0);
          } catch (error) {
            return (
              logDirectoryToggle({ enabled: !0, surface: "cli", failure: "settings_write_failed" }),
              await logFeatureBadAsync("cli_marketplace_add", "cli_marketplace_add_failed"),
              await flushAnalyticsBeforeExit(),
              handleMarketplaceError(asMarketplaceError(error), "add marketplace")
            );
          }
          (logDirectoryToggle({ enabled: !0, surface: "cli" }), ic(u, p));
        } else await persistPluginDirectoryChoice(!0);
        (await logFeatureOkAsync("cli_marketplace_add"),
          await renderAndRun(
            s,
            r(Text, {
              children: [
                re.tick,
                " ",
                h === "off"
                  ? `${OFFICIAL_MARKETPLACE_DISPLAY} is on. Its plugins are back in /plugin \u2192 Discover.`
                  : `${OFFICIAL_MARKETPLACE_DISPLAY} is already on`,
              ],
            }),
          ),
          await exitAfterAnalyticsFlush(0));
        return;
      }
      return (
        logMarketplaceAddFailed({ reason: "reserved_name", sourceKind: void 0, surface: "cli" }),
        await logFeatureBadAsync("cli_marketplace_add", "cli_marketplace_add_directory_unavailable"),
        cliErrorAfterAnalyticsFlush(
          `${re.cross} The ${OFFICIAL_MARKETPLACE_DISPLAY} isn't available in this session.`,
        )
      );
    }
    return (
      await logFeatureBadAsync("cli_marketplace_add", "cli_marketplace_add_reserved_name"),
      cliErrorAfterAnalyticsFlush(`${re.cross} ${reservedNameMessage(o)}`)
    );
  }
  let g,
    P,
    y,
    I = i.fromLink === !0,
    v = i.json ? { command: "marketplace-add" } : void 0,
    m = async (h, A = !1) => {
      if (v !== void 0)
        await writeJsonLine({
          ...v,
          outcome: "failed",
          message: stripInvisibleKeepNewlines(h),
          ...(!A && { failureCode: "invalid_source" }),
        });
      return cliErrorAfterAnalyticsFlush(`${re.cross} ${h}`);
    };
  try {
    if (I)
      try {
        parseDeepLinkMarketplace(o);
      } catch (error) {
        throw withMarketplaceFailureCode(error, "invalid_source");
      }
    let parsed = await parseMarketplaceInput(o);
    if (!parsed)
      return (
        await logFeatureBadAsync("cli_marketplace_add", "cli_marketplace_add_invalid_source"),
        m(INVALID_MARKETPLACE_SOURCE_MESSAGE)
      );
    if ("error" in parsed)
      return (
        await logFeatureBadAsync("cli_marketplace_add", "cli_marketplace_add_parse_failed"),
        m(stripControlChars(parsed.error), parsed.unreadable === !0)
      );
    if (((y = i.scope ?? "user"), y !== "user" && y !== "project" && y !== "local"))
      return cliErrorAfterAnalyticsFlush(
        stripControlChars(`${re.cross} Invalid scope '${y}'. Use: user, project, or local`),
      );
    if (((P = scopeToSettingSource(y)), (g = parsed), i.sparse && i.sparse.length > 0))
      if (g.source === "github" || g.source === "git") g = { ...g, sparsePaths: i.sparse };
      else
        return cliErrorAfterAnalyticsFlush(
          `${re.cross} --sparse is only supported for github and git marketplace sources (got: ${g.source})`,
        );
  } catch (error) {
    return (
      await logPluginCommandFailure("cli_marketplace_add", error, "cli_marketplace_add_failed"),
      reportOperationFailure(error, "add marketplace", v)
    );
  }
  let k,
    F = "",
    B = (async () => {
      try {
        let h = [];
        if (I) {
          let J = await linkMarketplaceInUse(g, u);
          if (J !== void 0)
            return (
              (k = { name: J, added: !1 }),
              (F = `Marketplace '${J}' is already added; nothing changed`),
              await logFeatureOkAsync("cli_marketplace_add"),
              []
            );
        }
        let {
            name: name,
            alreadyMaterialized: alreadyMaterialized,
            resolvedSource: resolvedSource,
            replacedSource: replacedSource,
          } = await addMarketplaceSource(
            g,
            (J) => {
              h.push(J);
            },
            u,
            void 0,
            { refuseNameCollision: I },
          ),
          { error: error } = await saveMarketplaceToSettings(name, { source: resolvedSource }, P, u);
        if (error) throw error;
        (ic(u, p),
          await logEventAsync("tengu_marketplace_added", {
            _PROTO_marketplace_name: name,
            source_type: fromEnum(g.source),
            repo_hash: g.source === "github" ? gn(g.repo) : void 0,
            is_official_marketplace: isOfficialMarketplaceName_3(name),
          }),
          await logFeatureOkAsync("cli_marketplace_add"));
        let E = [];
        if (!I)
          try {
            E = (await resolveMissingDependencies((await loadAllPlugins(u, p)).errors, u)).installed;
          } catch (error) {
            logForDebugging(`marketplace add: dep auto-resolve skipped: ${errorMessage(error)}`, {
              level: "warn",
            });
          }
        k = { name: name, added: !0 };
        let x = formatDependencyCountSuffix(E),
          D = alreadyMaterialized
            ? `Marketplace '${name}' already on disk \u2014 declared in ${y} settings${x}`
            : `Successfully added marketplace: ${name} (declared in ${y} settings)${x}`,
          settingSource = describeMarketplaceSourceReplaced({
            name: name,
            replacedSource: replacedSource,
            resolvedSource: resolvedSource,
            settingSource: P,
          });
        ((F = [...h, D, ...settingSource].join(`
`)),
          h.push(`${re.tick} ${D}`, ...settingSource.map((message) => `  ${message}`)));
        let G = settingsFileWarning(settingsSourceName(P));
        if (G !== null) h.push(`${re.warning} ${G}`);
        return h;
      } catch (error) {
        if (I && error instanceof bfe)
          await writeStdoutAndDrain(`${escapeControlChars(jsonStringify({ refused: error.reason }))}
`);
        return (
          await logPluginCommandFailure("cli_marketplace_add", error, "cli_marketplace_add_failed"),
          reportOperationFailure(error, "add marketplace", v)
        );
      }
    })();
  if ((B.catch(() => {}), I)) {
    if ((await B, k === void 0))
      return cliError(
        `${re.cross} Failed to add marketplace: the add finished without naming the marketplace it used`,
      );
    await writeStdoutAndDrain(`${escapeControlChars(jsonStringify(k))}
`);
  } else if (v !== void 0) await B;
  if (I || v !== void 0) {
    if (v !== void 0)
      await writeJsonLine({
        ...v,
        outcome: "ok",
        marketplace: k?.name,
        message: stripInvisibleKeepNewlines(F),
      });
    await exitAfterAnalyticsFlush(0);
    return;
  }
  (s.render(
    e(fo, {
      fallback: e(Text, { children: "Adding marketplace\u2026" }),
      children: e(MarketplaceResultLines, { promise: B }),
    }),
  ),
    await s.waitUntilExit(),
    await exitAfterAnalyticsFlush(0));
}
//@ chunk-d4eg9at2.js:22612-23270 layout
async function lookupMarketplaceLink(s, o) {
  let i;
  try {
    (parseDeepLinkMarketplace(s), (i = await parseMarketplaceInput(s)));
  } catch (error) {
    return (
      await logFeatureBadAsync("cli_marketplace_link_lookup", "cli_marketplace_link_lookup_refused_source"),
      await flushAnalyticsBeforeExit(),
      handleMarketplaceError(error, "look up the marketplace")
    );
  }
  if (!i || "error" in i)
    return (
      await logFeatureBadAsync(
        "cli_marketplace_link_lookup",
        i ? "cli_marketplace_link_lookup_parse_failed" : "cli_marketplace_link_lookup_invalid_source",
      ),
      cliErrorAfterAnalyticsFlush(`${re.cross} ${i?.error ?? INVALID_MARKETPLACE_SOURCE_MESSAGE}`)
    );
  let u;
  try {
    u = await linkMarketplaceInUse(i, o);
  } catch (error) {
    return (
      await logFeatureBadAsync("cli_marketplace_link_lookup", "cli_marketplace_link_lookup_read_failed"),
      await flushAnalyticsBeforeExit(),
      handleMarketplaceError(error, "read the added marketplaces")
    );
  }
  (await logFeatureOkAsync("cli_marketplace_link_lookup"),
    await writeStdoutAndDrain(`${escapeControlChars(jsonStringify({ existing: u ?? null }))}
`),
    await exitAfterAnalyticsFlush(0));
}
//@ chunk-d4eg9at2.js:23270-23337 facade-exports
async function linkMarketplaceInUse(s, o) {
  if (!isSourceAllowedByPolicy(s)) return;
  return findMarketplaceBySourceLoose(await loadKnownMarketplacesWithDeclared(o), s);
}
/**
 * claude plugin marketplace add 的 claude.ai 分支：列出账号可用的 claude.ai 托管 marketplace，按名字找唯一一个（重名、被策略拦、不存在分别报错），添加后打印成功信息与安装提示；渲染为一次性 Ink 输出后退出。
 */
//@ chunk-d4eg9at2.js:23337-25089 layout
async function addClaudeAiMarketplaceCommand(ink, name, settings, credentials) {
  let p = (async () => {
    try {
      let g = await loadKnownMarketplacesWithDeclared(settings),
        P = await listClaudeAiMarketplaces(credentials).catch(() => null);
      if (P === null)
        throw new ClaudeAiMarketplaceError(
          "claude.ai marketplaces are not available here \u2014 sign in to claude.ai (claude /login) with plugin sync on, then run: claude plugin marketplace list",
          "tier_unavailable",
        );
      let y = findAccountMarketplaceByName(P.hosted, name);
      if (y.kind === "ambiguous")
        throw new ClaudeAiMarketplaceError(
          `claude.ai hosts more than one marketplace called "${name}" for this account \u2014 add it by its unique name instead: ${y.localNames.join(", ")} (claude plugin marketplace list)`,
          "ambiguous_name",
        );
      if (y.kind === "none") {
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
      let row = y.row,
        {
          name: v,
          marketplace: marketplace,
          status: status,
        } = await addClaudeAiMarketplace(row, { configured: g, credentials: credentials });
      (ic(settings, credentials),
        await logEventAsync("tengu_marketplace_added", { source_type: lit("claudeai") }),
        await logFeatureOkAsync("cli_marketplace_add"));
      let F = describeMarketplaceFreshness(status),
        B = marketplace.plugins.length;
      return [
        `${re.tick} Successfully added marketplace: ${ljt(row)} \u2014 hosted on claude.ai, ${formatMarketplaceScopeLabel(row.scope)} \u2014 ${B} ${plural(B, "plugin")}${F ? ` (${F})` : ""}`,
        `  Install its plugins with: claude plugin install <plugin>@${v}`,
      ];
    } catch (error) {
      if (error instanceof ClaudeAiMarketplaceError)
        (await logFeatureBadAsync("cli_marketplace_add", `cli_marketplace_add_claudeai_${error.code}`),
          await flushAnalyticsBeforeExit());
      else await logPluginCommandFailure("cli_marketplace_add", error, "cli_marketplace_add_failed");
      return handleMarketplaceError(error, "add marketplace");
    }
  })();
  (p.catch(() => {}),
    ink.render(
      e(fo, {
        fallback: e(Text, { children: "Adding marketplace\u2026" }),
        children: e(MarketplaceResultLines, { promise: p }),
      }),
    ),
    await ink.waitUntilExit(),
    await exitAfterAnalyticsFlush(0));
}
//@ chunk-d4eg9at2.js:25089-25201 layout = readHeadAndTail (0.802)
function readHeadAndTail(s) {
  return /^[A-Za-z0-9._/\\:~-]{1,200}$/.test(s)
    ? s
    : printableLabel(printableName(s, 4096), { head: 120, tail: 80 }) || "\u201C\u201D";
}
//@ chunk-d4eg9at2.js:25201-25286 layout
function je(s) {
  return s === REDACTED_URL || /^[A-Za-z0-9._/\\:~@%+=&?,*-]{1,200}$/.test(s) ? s : readHeadAndTail(s);
}
/**
 * claude plugin marketplace list。
 */
//@ chunk-d4eg9at2.js:25286-28897 facade-exports = marketplaceListHandler (0.405)
async function marketplaceListHandler(s, o, i) {
  if (o.cowork) setUseCoworkPlugins(!0);
  let u;
  try {
    u = await loadKnownMarketplacesWithDeclared(i);
  } catch (error) {
    return (
      await logFeatureBadAsync("cli_marketplace_list", "cli_marketplace_list_load_failed"),
      await flushAnalyticsBeforeExit(),
      handleMarketplaceError(error, "list marketplaces")
    );
  }
  let keys = Object.keys(u),
    g = await listClaudeAiMarketplaces().catch(() => null),
    { available: available, hosted: hosted } = filterUnaddedClaudeAiMarketplaces(g, u),
    I = g?.browseOnly ?? [],
    config = await readClaudeAiMarketplaceRegistry(),
    m = new Map();
  for (let L of keys) {
    let T = u[L]?.source;
    if (X5(T))
      m.set(L, (await ensureClaudeAiMarketplace(L, T, { mode: "cache-only", credentials: void 0 })).status);
  }
  let k = await getPluginDirectoryState(),
    F = k === "off" && !keys.includes(OFFICIAL_MARKETPLACE_NAME);
  if (o.json) {
    let sorted = keys
      .filter((E) => {
        let x = u[E]?.source;
        return !(x && isPluginDirectorySource(x));
      })
      .map((name) => {
        let x = u[name],
          source = x?.source,
          M = source?.source === "github" || source?.source === "git" ? source.ref : void 0;
        return {
          name: name,
          source: source?.source,
          ...(source?.source === "github" && { repo: source.repo }),
          ...(source?.source === "git" && { url: source.url }),
          ...(source?.source === "url" && { url: source.url }),
          ...(source?.source === "directory" && { path: source.path }),
          ...(source?.source === "file" && { path: source.path }),
          ...(M && { ref: M }),
          ...(source?.source === "claudeai"
            ? {
                marketplaceId: source.marketplaceId,
                organizationUuid: source.organizationUuid,
                ...(config[name]?.scope !== void 0 && { scope: config[name]?.scope }),
                status: m.get(name)?.kind,
              }
            : { installLocation: x?.installLocation }),
        };
      })
      .sort((E, x) => (E.name < x.name ? -1 : E.name > x.name ? 1 : 0));
    (await writeStdoutAndDrain(
      printJson(sorted) +
        `
`,
    ),
      await logFeatureOkAsync("cli_marketplace_list"));
    return;
  }
  let B = !1,
    h = u[OFFICIAL_MARKETPLACE_NAME];
  if (
    k === "on" &&
    h !== void 0 &&
    isPluginDirectorySource(h.source) &&
    isListingRepositoryBlockedByHostPolicy(void 0)
  ) {
    let L = await getMarketplaceCacheOnly(OFFICIAL_MARKETPLACE_NAME, i, { registryEntry: h });
    B = L !== null && (kk().catalogEntryNames?.size ?? 0) > L.plugins.length;
  }
  printPluginWarnings(u);
  let A;
  if (keys.length === 0 && !F && available.length === 0 && hosted.length === 0 && I.length === 0)
    A = e(Text, { children: "No marketplaces configured" });
  else {
    let L = keys.length > 0 || F ? ["Configured marketplaces:", ""] : ["No marketplaces configured", ""];
    if (F)
      L.push(
        `  ${re.pointer} ${OFFICIAL_MARKETPLACE_NAME}`,
        `    Source: Built in (${OFFICIAL_MARKETPLACE_DISPLAY}) \u2014 off`,
        `    Turn it back on: claude plugin marketplace add ${OFFICIAL_MARKETPLACE_NAME}`,
        "",
      );
    if (
      ((h !== void 0 && isPluginDirectorySource(h.source)
        ? [OFFICIAL_MARKETPLACE_NAME, ...keys.filter((name) => name !== OFFICIAL_MARKETPLACE_NAME)]
        : keys
      ).forEach((R) => {
        let E = u[R],
          x = displayMarketplaceName(R);
        if ((L.push(`  ${re.pointer} ${x}`), x !== R)) {
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
            L.push(`    Source: Git (${je(redactUrlForDisplay(src.url))}${M})`);
          } else if (src.source === "url") L.push(`    Source: URL (${je(redactUrlForDisplay(src.url))})`);
          else if (src.source === "directory")
            L.push(
              `    Source: ${k !== "unavailable" ? "Folder" : "Directory"} (${readHeadAndTail(src.path)})`,
            );
          else if (src.source === "file") L.push(`    Source: File (${readHeadAndTail(src.path)})`);
          else if (src.source === "pluginDirectory")
            L.push(
              `    Source: Built in (${OFFICIAL_MARKETPLACE_DISPLAY})${k === "blocked" ? " \u2014 blocked by your organization" : B ? " \u2014 some plugins hidden by your organization's policy" : ""}`,
            );
          else if (src.source === "claudeai") {
            let M = m.get(R),
              G = M === void 0 ? void 0 : describeMarketplaceFreshness(M);
            L.push(
              `    Source: ${formatClaudeAiMarketplaceLabel(config[R])}${G === void 0 ? "" : ` \u2014 ${G}`}`,
            );
          }
        }
        if (E !== void 0 && Dse(R, E) && isAsciiImpersonatingOfficialName(R))
          L.push(
            ...reservedMarketplaceNameMessage(R, { declaredInSettings: E.source.source === "settings" }).map(
              (D) => `    ${D}`,
            ),
          );
        L.push("");
      }),
      available.length > 0 || hosted.length > 0 || I.length > 0)
    )
      L.push("From claude.ai:", "");
    for (let R of available)
      (L.push(
        `  ${re.pointer} ${R.name} (available from claude.ai${R.scope ? `, ${R.scope}` : ""} \u2014 not added)`,
      ),
        L.push(
          `    Source: ${R.source.source === "github" ? "GitHub" : "Git"} (${formatGitSourceSpec(R.source)})`,
        ),
        L.push(""));
    for (let R of hosted)
      (L.push(
        `  ${re.pointer} ${ljt(R)} \u2014 hosted on claude.ai, ${formatMarketplaceScopeLabel(R.scope)} \xB7 not added`,
      ),
        L.push(
          `    Add: claude plugin marketplace add --claudeai ${isSafeCliArg(R.name) ? R.name : "<name>"}`,
        ),
        L.push(""));
    for (let R of I) (L.push(`  ${re.pointer} ${Qbt(R)} (browse on claude.ai)`), L.push(""));
    A = e(Text, { children: formatMessageLines(L) });
  }
  let z = await s();
  (await renderAndRun(z, A), await logFeatureOkAsync("cli_marketplace_list"));
}
/**
 * claude plugin marketplace remove。
 */
//@ chunk-d4eg9at2.js:28897-30866 facade-exports = marketplaceRemoveHandler (0.274)
async function marketplaceRemoveHandler(s, o, i, u) {
  if (i.cowork) setUseCoworkPlugins(!0);
  let p;
  if (i.scope !== void 0) {
    let scope = i.scope;
    if (scope !== "user" && scope !== "project" && scope !== "local")
      return cliError(`${re.cross} Invalid scope '${scope}'. Use: user, project, or local`);
    p = scopeToSettingSource(scope);
  }
  let g = isOfficialMarketplaceSpelling(o) ? await getPluginDirectoryState() : void 0,
    P;
  try {
    if (
      g === "blocked" &&
      isOfficialMarketplaceName_2(o) &&
      !listReservedNameRefusals(await loadKnownMarketplacesWithDeclared(u)).some(({ name: name }) =>
        isOfficialMarketplaceName_2(name),
      )
    ) {
      (await renderAndRun(s, e(ManagedMarketplaceNotice, {})),
        await logFeatureOkAsync("cli_marketplace_remove"));
      return;
    }
    if (
      ((P = await removeMarketplaceWithReservedSiblings(o, p, u)),
      ic(u),
      P.kind !== "plugin-directory-built-in")
    )
      logEvent("tengu_marketplace_removed", {
        marketplace_name: r$e(o),
        _PROTO_marketplace_name: o,
        is_official_marketplace: isOfficialMarketplaceName_3(o),
      });
  } catch (error) {
    return (
      await logFeatureBadAsync("cli_marketplace_remove", "cli_marketplace_remove_failed"),
      await flushAnalyticsBeforeExit(),
      reportOperationFailure(
        asMarketplaceError(error, 2000),
        "remove marketplace",
        i.json ? { command: "marketplace-remove", marketplace: o } : void 0,
        error,
      )
    );
  }
  if (
    (await logFeatureOkAsync("cli_marketplace_remove"),
    P.kind === "ignored-plugin-directory-name-entry-removed")
  ) {
    let mapped = P.removedNames.map(
        (removedName) =>
          `${re.tick} ${removedMarketplaceMessage(removedName, g !== void 0 && g !== "unavailable")}`,
      ),
      F = blockedPluginsNotice(P.disabledPluginIds, P.disabledReason);
    if (F !== null) mapped.push(F);
    await renderAndRun(s, e(Text, { children: formatMessageLines(mapped) }));
    return;
  }
  if (P.kind === "plugin-directory-built-in") {
    let k = await getPluginDirectoryState();
    if (k === "blocked") {
      await renderAndRun(s, e(ManagedMarketplaceNotice, {}));
      return;
    }
    if (g === "on" && k === "off") logDirectoryToggle({ enabled: !1, surface: "cli" });
    await renderAndRun(
      s,
      r(Text, {
        children: [
          re.tick,
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
  let y = P.kind === "removed" ? P.removedPluginIds : [],
    I = `Successfully removed marketplace: ${stripInvisibleKeepEmoji(o)}${i.scope ? ` (from ${i.scope} settings)` : ""}`,
    v =
      y.length > 0
        ? [
            `Also uninstalled ${y.length} ${plural(y.length, "plugin")} from this marketplace:`,
            ...y.map((k) => `  ${k}`),
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
  let m = [`${re.tick} ${I}`, ...v];
  await renderAndRun(s, e(Text, { children: formatMessageLines(m) }));
}
//@ chunk-d4eg9at2.js:30866-30961 sole-consumer
function ManagedMarketplaceNotice() {
  let s = w_2(1),
    o;
  if (s[0] === MEMO_CACHE_SENTINEL)
    ((o = e(Text, { children: formatPluginDirectoryBlockedMessage(pluginDirectoryPolicyBlockHint()) })),
      (s[0] = o));
  else o = s[0];
  return o;
}
/**
 * claude plugin marketplace update。
 */
//@ chunk-d4eg9at2.js:31326-33318 facade-exports = marketplaceUpdateHandler (0.472)
async function marketplaceUpdateHandler(s, o, i, u) {
  if (i.json && !o)
    return cliError(
      `${re.cross} --json needs a marketplace name, for example: claude plugin marketplace update <name> --json`,
    );
  if (i.cowork) setUseCoworkPlugins(!0);
  let p = o !== void 0 && isOfficialMarketplaceName_2(o) ? OFFICIAL_MARKETPLACE_NAME : o,
    g,
    P = 0,
    y;
  if (p) {
    g = `Updating marketplace: ${p}...`;
    let I = [],
      v = `Successfully updated marketplace: ${p}`;
    if (
      ((y = refreshMarketplaceDeduped(p, u, (message) => {
        I.push(message);
      })
        .then(
          async () => (
            ic(u),
            await logEventAsync("tengu_marketplace_updated", {
              marketplace_name: r$e(p),
              _PROTO_marketplace_name: p,
              is_official_marketplace: isOfficialMarketplaceName_3(p),
            }),
            await logFeatureOkAsync("cli_marketplace_update"),
            { messages: I, summary: `${re.tick} ${v}` }
          ),
        )
        .catch(
          async (m) => (
            await logPluginCommandFailure("cli_marketplace_update", m, "cli_marketplace_update_failed"),
            reportOperationFailure(
              m,
              "update marketplace(s)",
              i.json ? { command: "marketplace-update", marketplace: o } : void 0,
            )
          ),
        )),
      i.json)
    ) {
      (await y,
        await writeJsonLine({
          command: "marketplace-update",
          outcome: "ok",
          marketplace: o,
          message: stripInvisibleKeepNewlines(
            [...I, v].join(`
`),
          ),
        }),
        await exitAfterAnalyticsFlush(0));
      return;
    }
  } else {
    let I;
    try {
      I = await loadKnownMarketplacesWithDeclared(u);
    } catch (error) {
      return (
        await logPluginCommandFailure("cli_marketplace_update", error, "cli_marketplace_update_load_failed"),
        handleMarketplaceError(error, "update marketplace(s)")
      );
    }
    let marketplaceNames = Object.keys(I);
    if (marketplaceNames.length === 0)
      return (
        await renderAndRun(s, e(Text, { children: "No marketplaces configured" })),
        await logFeatureOkAsync("cli_marketplace_update"),
        exitAfterAnalyticsFlush(0)
      );
    ((g = "Updating marketplaces..."),
      (y = refreshAllMarketplaces(u)
        .then(
          async ({
            policyRefused: policyRefused,
            failed: failed,
            attempted: attempted,
            builtInSkipped: builtInSkipped,
          }) => {
            if (
              ((P = failed.length > 0 ? 1 : 0),
              ic(u),
              await logEventAsync("tengu_marketplace_updated_all", {
                count: marketplaceNames.length,
                attempted: attempted,
                refreshed: attempted - policyRefused.length - failed.length,
                policy_refused: policyRefused.length,
                failed: failed.length,
                built_in_skipped: builtInSkipped.length,
              }),
              failed.length > 0)
            )
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
          },
        )
        .catch(
          async (m) => (
            await logPluginCommandFailure("cli_marketplace_update", m, "cli_marketplace_update_failed"),
            handleMarketplaceError(m, "update marketplace(s)")
          ),
        )));
  }
  (s.render(e(fo, { fallback: e(Text, { children: g }), children: e(ResultMessages, { promise: y }) })),
    await s.waitUntilExit(),
    await exitAfterAnalyticsFlush(P));
}
//@ chunk-d4eg9at2.js:33318-33518 layout
function SuccessLine(s) {
  let u = w_2(4),
    { promise: promise } = s,
    i = Qr(promise),
    p;
  if (u[0] !== i) ((p = stripInvisibleKeepNewlines(i)), (u[0] = i), (u[1] = p));
  else p = u[1];
  let g;
  if (u[2] !== p)
    ((g = e(RenderOnceAndExit, { children: r(Text, { children: [re.tick, " ", p] }) })),
      (u[2] = p),
      (u[3] = g));
  else g = u[3];
  return g;
}
//@ chunk-d4eg9at2.js:33518-33561 layout
function isValidInstallScope(s) {
  return VALID_INSTALLABLE_SCOPES.some((o) => o === s);
}
/**
 * 校验 --scope（默认 user；--cowork 只能 user），非法时退出。
 */
//@ chunk-d4eg9at2.js:33561-33752 facade-exports = pluginInstallHandler (0.744)
function requireInstallableScope(s) {
  let scope = s.scope || "user";
  if (s.cowork && scope !== "user") cliError("--cowork can only be used with user scope");
  if (!isValidInstallScope(scope))
    cliError(`Invalid scope: ${scope}. Must be one of: ${VALID_INSTALLABLE_SCOPES.join(", ")}.`);
  return scope;
}
//@ chunk-d4eg9at2.js:33752-34003 file-local
function pluginEnableHandler_2(s) {
  let scope;
  if (s.scope) {
    if (!isValidInstallScope(s.scope))
      cliError(`Invalid scope "${s.scope}". Valid scopes: ${VALID_INSTALLABLE_SCOPES.join(", ")}`);
    scope = s.scope;
  }
  if (s.cowork && scope !== void 0 && scope !== "user") cliError("--cowork can only be used with user scope");
  if (s.cowork && scope === void 0) scope = "user";
  return scope;
}
//@ chunk-d4eg9at2.js:34142-36170 facade-exports
async function pluginInstallHandler(s, o, i, u) {
  if (i.cowork) setUseCoworkPlugins(!0);
  let p = requireInstallableScope(i);
  if ((logPluginLoadErrors("tengu_plugin_install_command", o, fromEnum(p)), !i.json))
    printPluginWarnings(await loadKnownMarketplacesSafe(u));
  let g,
    P = (x) => {
      g = x;
    },
    y = async (x, D) => {
      if (i.json)
        await writePluginResult({
          command: "install",
          outcome: "failed",
          plugin: o,
          scope: p,
          message: D,
          failureCode: x,
          shownCommand: g && rfo(g),
        });
    },
    I,
    v,
    m = (x) => {
      if (I) logInstallRefreshFirst(I.outcome);
      return handlePluginCommandError(x, "install", o, u, i.json ? { scope: p, shownCommand: g } : void 0);
    };
  if (i.replace && !parsePluginIdentifier(o).marketplace)
    return m(
      new PluginOperationFailedError(replaceNeedsFullIdMessage(), { failureCode: "replace_needs_full_id" }),
    );
  let k = (await getInstalledListRefusal(u).catch(m)) !== void 0,
    F = k
      ? void 0
      : await checkCommandSourceSwitch(
          o,
          {
            yes: i.yes,
            acceptCommand: i.acceptCommand,
            onShown: P,
            scope: p,
            onMarketplaceRefreshResult: (x) => {
              I = x;
            },
            onResolvedMarketplace: (x) => {
              v = x;
            },
          },
          u,
        ).catch(m);
  if (F?.kind === "accepted") g = void 0;
  if (F?.kind === "declined") {
    if (I) logInstallRefreshFirst(I.outcome);
    if ((logFeatureSad("cli_plugin_install", "command_source_declined"), i.json))
      await y("command_source_declined", "Aborted.");
    else await renderAndRun(await s(), e(Text, { children: "Aborted." }));
    await gracefulShutdown(1);
    return;
  }
  let B = F?.grantKey,
    h = k
      ? null
      : await resolveInstallTarget(
          o,
          { yes: i.yes, acceptCommand: i.acceptCommand, onShown: P, scope: p, resolvedMarketplace: v },
          u,
        ).catch(m);
  if (h !== null && h !== "declined" && h !== "unconfirmed") g = void 0;
  if (h === "declined" || h === "unconfirmed") {
    if (
      (logFeatureSad(
        "cli_plugin_install",
        h === "declined" ? "entry_helper_declined" : "entry_helper_unconfirmed",
      ),
      I)
    )
      logInstallRefreshFirst(I.outcome);
    if (i.json)
      await y(
        h === "declined" ? "entry_helper_declined" : "entry_helper_unconfirmed",
        "Aborted \u2014 the command was not run.",
      );
    else await renderAndRun(await s(), e(Text, { children: "Aborted \u2014 the command was not run." }));
    await gracefulShutdown(1);
    return;
  }
  let { name: name, marketplace: marketplace } = parsePluginIdentifier(o),
    L = F?.kind === "accepted" || h !== null,
    T =
      i.acceptCommand !== void 0 && L && marketplace === void 0 && name && v !== void 0
        ? `${name}@${v}`
        : void 0,
    R = installPlugin(o, p, i.config, B, k ? void 0 : h, u, I, {
      json: i.json,
      shownCommand: g,
      resolvedPlugin: T,
      replaceInstalledCopy: i.replace,
      npmRegistry: i.registry,
    }).then(async (x) => (await logFeatureOkAsync("cli_plugin_install"), x));
  if (i.json) {
    (await R, await gracefulShutdown(0));
    return;
  }
  let E = await s();
  (E.render(
    e(fo, {
      fallback: e(Text, { children: stripInvisibleKeepEmoji(`Installing plugin "${o}"...`) }),
      children: e(SuccessLine, { promise: R }),
    }),
  ),
    await E.waitUntilExit(),
    await gracefulShutdown(0));
}
/**
 * claude plugin uninstall：卸载插件（--keep-data、--prune、--json）。
 */
//@ chunk-d4eg9at2.js:36170-36520 facade-exports = pluginUninstallHandler (0.343)
async function pluginUninstallHandler(s, o, i, u) {
  if (i.json && i.prune) cliError("--json cannot be used with --prune");
  if (i.cowork) setUseCoworkPlugins(!0);
  let p = requireInstallableScope(i);
  logPluginLoadErrors("tengu_plugin_uninstall_command", o, fromEnum(p));
  let g = await uninstallPlugin(o, p, i.keepData, i.prune, i.yes, u, { json: i.json });
  if (!i.json)
    await renderAndRun(
      await s(),
      e(Text, { children: stripInvisibleKeepNewlines(i.prune ? g : `${re.tick} ${g}`) }),
    );
  (await logFeatureOkAsync("cli_plugin_uninstall"), await exitAfterAnalyticsFlush(0));
}
//@ chunk-d4eg9at2.js:36520-36768 facade-exports
async function pluginPruneHandler(s, o, i) {
  if (o.cowork) setUseCoworkPlugins(!0);
  let u = requireInstallableScope(o);
  logEvent("tengu_plugin_prune_command", { scope: fromEnum(u), dry_run: o.dryRun ?? !1 });
  let p = await prunePluginsCli(u, { dryRun: o.dryRun, yes: o.yes }, i);
  (await renderAndRun(s, e(Text, { children: stripInvisibleKeepNewlines(p) })),
    await logFeatureOkAsync("cli_plugin_prune"),
    await exitAfterAnalyticsFlush(0));
}
//@ chunk-d4eg9at2.js:36768-37499 facade-exports = enablePlugin (0.424)
async function pluginEnableHandler(s, o, i, u) {
  if (i.cowork) setUseCoworkPlugins(!0);
  let p = pluginEnableHandler_2(i);
  logPluginLoadErrors("tengu_plugin_enable_command", o, fromEnum(p ?? "auto"));
  let g,
    P = !1,
    y = o;
  try {
    (await ensureSyncedPluginDirsRegistered(), isPluginCommandContext());
    let v = await resolvePluginArgument(o, i.json, u, { unlessNamedInSettings: !0 });
    if (((P = v.aliased), (y = v.plugin), (g = await enablePluginOp(v.plugin, p, u)), !g.success))
      throw new PluginOperationFailedError(g.message, g);
  } catch (error) {
    return await handlePluginCommandError(
      error,
      "enable",
      o,
      u,
      i.json ? { scope: p } : void 0,
      P ? y : void 0,
    );
  }
  let I = withSettingsWarning(g.message, g.scope ?? p);
  if (i.json)
    await writePluginResult({
      command: "enable",
      outcome: "ok",
      plugin: o,
      pluginId: g.pluginId,
      scope: g.scope ?? p,
      message: stripInvisibleKeepNewlines(I),
    });
  else await renderAndRun(await s(), r(Text, { children: [re.tick, " ", stripInvisibleKeepNewlines(I)] }));
  (await logEventAsync("tengu_plugin_enabled_cli", {
    ...(await pluginTelemetryFields(g.pluginId || y, af(), u)),
    scope: fromEnumOpt(g.scope),
    ...(P ? { aliased_id: !0 } : {}),
  }),
    await logFeatureOkAsync("cli_plugin_enable"),
    await exitAfterAnalyticsFlush(0));
}
/**
 * claude plugin disable：禁用单个或 --all 全部插件。
 */
//@ chunk-d4eg9at2.js:37499-38038 facade-exports = pluginDisableHandler (0.651)
async function pluginDisableHandler(s, o, i, u) {
  if (i.all && o) cliError("Cannot use --all with a specific plugin");
  if (!i.all && !o) cliError("Please specify a plugin name or use --all to disable all plugins");
  if (i.cowork) setUseCoworkPlugins(!0);
  let scope;
  if (i.all) {
    if (i.scope) cliError("Cannot use --scope with --all");
    (logEvent("tengu_plugin_disable_command", {}),
      isPluginCommandContext(),
      (scope = await disableAllPlugins(u, { json: i.json })));
  } else {
    let g = pluginEnableHandler_2(i);
    (logPluginLoadErrors("tengu_plugin_disable_command", o, fromEnum(g ?? "auto")),
      await ensureSyncedPluginDirsRegistered(),
      isPluginCommandContext(),
      (scope = await disablePlugin(o, g, u, { json: i.json })));
  }
  if (!i.json) await renderAndRun(await s(), e(Text, { children: stripInvisibleKeepNewlines(scope) }));
  (await logFeatureOkAsync("cli_plugin_disable"), await exitAfterAnalyticsFlush(0));
}
/**
 * claude plugin update：按作用域更新插件。
 */
//@ chunk-d4eg9at2.js:38038-38432 facade-exports = pluginUpdateHandler (0.778)
async function pluginUpdateHandler(s, o, i) {
  if (o.cowork) setUseCoworkPlugins(!0);
  let u = o.cowork ? "user" : void 0;
  if (o.scope) {
    if (!VALID_UPDATE_SCOPES.includes(o.scope))
      cliError(`Invalid scope "${o.scope}". Valid scopes: ${VALID_UPDATE_SCOPES.join(", ")}`);
    u = o.scope;
  }
  if (o.cowork && u !== "user") cliError("--cowork can only be used with user scope");
  if ((logPluginLoadErrors("tengu_plugin_update_command", s), !o.json))
    printPluginWarnings(await loadKnownMarketplacesSafe(i));
  await updatePluginCli(s, u, { yes: o.yes, json: o.json, acceptCommand: o.acceptCommand }, i);
}
/**
 * claude plugin details <name>：插件清单、组件与 token 开销估算。
 */
//@ chunk-d4eg9at2.js:38432-42348 facade-exports
async function pluginDetailsHandler(s, o, i, u, p) {
  if (i.cowork) setUseCoworkPlugins(!0);
  (isPluginCommandContext(), logEvent("tengu_plugin_details_command", {}));
  let {
      getPluginInventory: getPluginInventory,
      computePluginTokenCost: computePluginTokenCost,
      scaleCharsToTokens: scaleCharsToTokens,
    } = await import("./chunk-a3f28dq3.js"),
    { formatTokenEstimate: formatTokenEstimate } = await import("./chunk-r70xbw6c.js");
  await ensureSyncedPluginDirsRegistered();
  let { enabled: enabled, disabled: disabled } = await loadAllPlugins(isStorageV5Enabled() ? u : void 0, p),
    k = parsePluginId((await resolvePluginArgument(o, i.json, u)).plugin),
    F = k.marketplace ? joinPluginId(k.name, k.marketplace) : k.name,
    B = isOfficialMarketplace(k.marketplace)
      ? (U) => nfcLower(U) === nfcLower(F)
      : (U) => pluginNamesEqual(U, F),
    found = [...enabled, ...disabled].find((U) => B(k.marketplace ? U.source : U.name));
  if (!found) {
    let U =
        (await getPluginDirectoryState()) !== "unavailable"
          ? Object.entries((await getInstalledPluginsAsync(u)).plugins).find(([he, ke]) => {
              let fe = parsePluginIdentifier(he);
              return (
                fe.marketplace === OFFICIAL_MARKETPLACE_NAME &&
                pluginNamesEqual(k.marketplace ? he : fe.name, F) &&
                ke.some(isInstallationRelevantToCurrentProject)
              );
            })?.[0]
          : void 0,
      H = pluginDirectoryPolicyBlock(),
      W = U !== void 0 && H !== null ? parsePluginIdentifier(U).name : void 0,
      X =
        U !== void 0 && H === null && (await ugn(parsePluginIdentifier(U).name, u)) === null
          ? parsePluginIdentifier(U).name
          : void 0,
      Z = W !== void 0 ? "policy_blocked" : X !== void 0 ? "directory_catalog_missing" : "not_found",
      K =
        W !== void 0 && H !== null
          ? `${re.cross} ${directoryBlockedMessage(W, H)}`
          : X !== void 0
            ? `${re.cross} Details for "${quotedPrintable(X)}" are not available: ${PLUGIN_DIRECTORY_CATALOG_MISSING}. ${RELOAD_PLUGINS_HINT}`
            : `Plugin "${quotedPrintable(o)}" not found. ${k.marketplace === BUILTIN ? "Built-in plugins don't appear in `claude plugin list`. To see the ones available in a session, run /plugin in Claude Code and open the Installed tab." : "Run `claude plugin list` to see installed plugins, or pass --plugin-dir <path> to load one from disk."}`;
    return finishPluginDetails(s, i.json, K, Z);
  }
  let A = marketplaceSuffix(found.source) ?? INLINE_PLUGIN_MARKETPLACE,
    z = i.models?.length ? i.models : [getMainLoopModel()],
    L;
  try {
    let U = await getPluginInventory(found, A);
    L = await computePluginTokenCost(U, z, found.name);
  } catch (error) {
    let H = error instanceof PluginDirectoryCatalogMissingError;
    if (!H) logError(withTelemetryMessage(toError(error), "plugin details: inventory/token-cost failed"));
    let W = H ? "directory_catalog_missing" : "inventory_failed",
      X = H
        ? `${re.cross} Details for "${quotedPrintable(found.name)}" are not available: ${PLUGIN_DIRECTORY_CATALOG_MISSING}. ${RELOAD_PLUGINS_HINT}`
        : `${re.cross} Could not load details for "${quotedPrintable(found.name)}": ${printableMessage(error)}`;
    return finishPluginDetails(s, i.json, X, W);
  }
  let { tokens: tokens, inventory: inventory } = L;
  if (i.json) {
    let U = ({ path: path, ...W }) => W;
    (await writeStdoutAndDrain(
      printJson({
        plugin: found.name,
        version: found.manifest.version,
        source: found.source,
        sha: found.sha ?? null,
        tokens: tokens,
        components: {
          ...inventory,
          commands: inventory.commands.map(U),
          agents: inventory.agents.map(U),
          skills: inventory.skills.map(U),
        },
      }) +
        `
`,
    ),
      await logFeatureOkAsync("cli_plugin_details"));
    return;
  }
  let E = [],
    x = getPluginDisplayName(found),
    D = x === found.name ? found.name : `${x} (${found.name})`;
  if ((E.push(`${D} ${found.manifest.version ?? ""}`.trimEnd()), found.manifest.description)) {
    let [U, ...H] = found.manifest.description.split(`
`);
    E.push(`  Description: ${U}`);
    for (let W of H) E.push(`      ${W}`);
  }
  (E.push(`  Source: ${found.source}`), E.push(""), E.push("Component inventory"));
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
    ),
    J = {
      always_on: filtered.reduce((U, H) => U + H.chars.always_on, 0),
      on_invoke: filtered.reduce((U, H) => U + H.chars.on_invoke, 0),
    },
    q = tokens[z[0]],
    ee = q?.always_on ?? scaleCharsToTokens(J.always_on, J.always_on, void 0);
  if (
    (E.push("Projected token cost"),
    E.push(`  Always-on:   ~${ee.toLocaleString()} tok   added to every session`),
    filtered.length > 0)
  ) {
    (E.push(""), E.push("Per-component (rounded)"));
    let max = Math.max(...filtered.map((H) => H.name.length), 9);
    E.push(`  ${"component".padEnd(max)}  ${"always-on".padStart(9)}  ${"on-invoke".padStart(9)}`);
    for (let H of filtered) {
      let W = scaleCharsToTokens(H.chars.always_on, J.always_on, q?.always_on),
        X = scaleCharsToTokens(H.chars.on_invoke, J.on_invoke, q?.on_invoke);
      E.push(
        `  ${H.name.padEnd(max)}  ${formatTokenEstimate(W).padStart(9)}  ${formatTokenEstimate(X).padStart(9)}`,
      );
    }
    (E.push(""),
      E.push("  On-invoke cost is paid each time a skill or agent fires."),
      E.push("  Token counts are estimates and may differ from actual usage."));
  }
  let Q = await s();
  if ((await renderAndRun(Q, e(Text, { children: formatMessageLines(E) })), q))
    await logFeatureOkAsync("cli_plugin_details");
  else await logFeatureSadAsync("cli_plugin_details", "count_tokens_unreachable");
}
//@ chunk-d4eg9at2.js:42348-42494 layout
async function finishPluginDetails(s, o, i, u) {
  let p = stripInvisibleKeepNewlines(i);
  if (o) printCliError(p);
  else await renderAndRun(await s(), e(Text, { children: p }));
  return (
    await logFeatureBadAsync("cli_plugin_details", u),
    o ? cliErrorAfterAnalyticsFlush() : exitAfterAnalyticsFlush(1)
  );
}
//@ chunk-d4eg9at2.js:42494-42536 layout
function formatMessageLines(s) {
  return s.map(stripInvisibleKeepEmoji).join(`
`);
}
//@ chunk-d4eg9at2.js:42536-42615 layout
function printPluginWarnings(s) {
  for (let { message: message } of listReservedNameRefusals(s)) console.error(`${re.warning} ${message}`);
}
//@ chunk-d4eg9at2.js:42615-42653 layout
function printJson(s) {
  return escapeControlChars(jsonStringify(s, null, 2));
}
//@ chunk-d4eg9at2.js:42653-42920 layout
function filterInventoryBySource(s, o) {
  let i = (P) => marketplaceOf(P.source) === s,
    filtered = o.plugins.filter(i),
    filtered_2 = o.errors.filter(i),
    filtered_3 = o.warnings.filter(i);
  return {
    plugins: filtered,
    errors: filtered_2,
    warnings: filtered_3,
    standaloneErrorRows: filtered_2.filter((P) => !filtered.some((y) => sameSourceAndName(P, y))),
    standaloneWarningRows: filtered_3.filter((P) => !filtered.some((y) => sameSourceAndNameAlt(P, y))),
  };
}
//@ chunk-d4eg9at2.js:42920-43027 layout
function hasInventoryRows(s) {
  return s.plugins.length > 0 || s.standaloneErrorRows.length > 0 || s.standaloneWarningRows.length > 0;
}
//@ chunk-d4eg9at2.js:43027-43872 fingerprint = pluginListHandler (0.486)
function pluginListHandler_2(options) {
  if (!hasInventoryRows(options)) return [];
  let { standaloneErrorRows: standaloneErrorRows, standaloneWarningRows: standaloneWarningRows } = options,
    allLoadedPlugins = [options.header, ""];
  for (let p of standaloneWarningRows) allLoadedPlugins.push(`  ${re.warning} ${pluginWarningText(p)}`, "");
  for (let plugin of options.plugins) {
    let inlinePlugins = options.errors.filter((error) => sameSourceAndName(error, plugin)),
      inlineLoadErrors = options.warnings.filter((warning) => sameSourceAndNameAlt(warning, plugin)),
      y =
        plugin.enabled !== !1 && isRequiredPlugin(plugin.source, plugin.installationPreference)
          ? " \xB7 required by your org"
          : "",
      I =
        (plugin.enabled === !1
          ? `${re.cross} disabled`
          : inlinePlugins.length > 0
            ? `${re.cross} loaded with errors`
            : `${re.tick} loaded`) + y;
    if (
      (allLoadedPlugins.push(`  ${re.pointer} ${plugin.source}`),
      allLoadedPlugins.push(`    Version: ${plugin.manifest.version ?? "unknown"}`),
      options.showScope)
    )
      allLoadedPlugins.push(`    Scope: ${options.scopeOf(plugin)}`);
    (allLoadedPlugins.push(`    Path: ${options.pathOf(plugin)}`), allLoadedPlugins.push(`    Status: ${I}`));
    for (let error of inlinePlugins) allLoadedPlugins.push(`    Error: ${pluginErrorText(error)}`);
    for (let v of inlineLoadErrors) allLoadedPlugins.push(`    Note: ${pluginWarningText(v)}`);
    allLoadedPlugins.push("");
  }
  for (let p of standaloneErrorRows)
    allLoadedPlugins.push(`  ${re.pointer} ${p.source}: ${re.cross} ${pluginErrorText(p)}`, "");
  return allLoadedPlugins;
}
//@ chunk-d4eg9at2.js:43872-43939 sole-consumer
function Me({ path: path, message: message }) {
  return { path: path, message: message, code: null };
}
//@ chunk-d4eg9at2.js:43939-44176 sole-consumer
function toValidationFileJson(result) {
  return {
    file: result.filePath,
    type: result.fileType,
    errors: result.errors.map(Me),
    warnings: result.warnings.map(Me),
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
    advice: advice,
    directory: directory,
  };
}
/**
 * 把插件错误/警告对象压成 JSON 列表里的 detail：type 加上 plugin、marketplace、依赖、服务器名、组件、路径、URL、related（遮蔽者/改名/阻塞者）等能识别的字段。
 */
//@ chunk-d4eg9at2.js:44350-45266 sole-consumer
function pluginIssueDetail(issue) {
  let o = issue,
    i = (A) => {
      let z = o[A];
      return typeof z === "string" ? z : void 0;
    },
    u = { type: issue.type },
    p = i("plugin") ?? i("pluginId");
  if (p !== void 0) u.plugin = p;
  let g = i("marketplace");
  if (g !== void 0) u.marketplace = g;
  let P = i("dependency");
  if (P !== void 0) u.dependency = P;
  let y = i("serverName");
  if (y !== void 0) u.serverName = y;
  let I = i("component");
  if (I !== void 0) u.component = I;
  let v =
    i("manifestPath") ??
    i("path") ??
    i("folderPath") ??
    i("hookPath") ??
    i("mcpbPath") ??
    i("installPath") ??
    i("filePath") ??
    i("heldAt");
  if (v !== void 0) u.path = v;
  let m = i("url") ?? i("gitUrl");
  if (m !== void 0) u.url = m;
  if (issue.type === "marketplace-not-found" && issue.registrationHidden !== void 0)
    u.registrationHidden = issue.registrationHidden;
  let k = i("duplicateOf") ?? i("activeServer"),
    F = k?.startsWith("plugin:") ? k.split(":")[1] : void 0,
    blockedBy = o.blockedBy,
    h =
      i("shadowedBy") ??
      i("renamedTo") ??
      F ??
      (Array.isArray(blockedBy) && blockedBy.every((A) => typeof A === "string")
        ? blockedBy.join(", ")
        : void 0);
  if (h !== void 0) u.related = h;
  return u;
}
/**
 * 生成 claude plugin list --json 的条目：每个已装插件的 id、版本、作用域、启用状态、安装路径、MCP 服务器、错误与提示（文字与 detail）；另加独立的错误行与警告行。
 */
//@ chunk-d4eg9at2.js:45266-46214 sole-consumer
async function buildPluginListJson(listing, credentials) {
  let i = [];
  for (let plugin of listing.plugins) {
    let p =
        plugin.mcpServers ||
        (await loadPluginMcpServersFromSources(plugin, void 0, credentials, void 0, { readOnlyListing: !0 })),
      filtered = listing.errors.filter((error) => sameSourceAndName(error, plugin)),
      filtered_2 = listing.warnings.filter((warning) => sameSourceAndNameAlt(warning, plugin)),
      mapped = filtered.map(pluginErrorText),
      mapped_2 = filtered_2.map(pluginWarningText);
    i.push({
      id: plugin.source,
      version: plugin.manifest.version ?? "unknown",
      scope: listing.scopeOf(plugin),
      enabled: plugin.enabled !== !1,
      installPath: plugin.path,
      mcpServers: p && Object.keys(p).length > 0 ? Ve(p) : void 0,
      errors: mapped.length > 0 ? mapped : void 0,
      notes: mapped_2.length > 0 ? mapped_2 : void 0,
      errorDetails: filtered.length > 0 ? filtered.map(pluginIssueDetail) : void 0,
      noteDetails: filtered_2.length > 0 ? filtered_2.map(pluginIssueDetail) : void 0,
      hasUserConfig: hasPluginUserConfig(plugin),
    });
  }
  for (let standaloneErrorRow of listing.standaloneErrorRows)
    i.push({
      id: standaloneErrorRow.source,
      version: "unknown",
      scope: listing.standaloneErrorScope,
      enabled: !1,
      installPath: ("path" in standaloneErrorRow ? standaloneErrorRow.path : void 0) ?? "",
      errors: [pluginErrorText(standaloneErrorRow)],
      errorDetails: [pluginIssueDetail(standaloneErrorRow)],
    });
  for (let standaloneWarningRow of listing.standaloneWarningRows)
    i.push({
      id: standaloneWarningRow.source,
      version: "unknown",
      scope: listing.standaloneWarningScope,
      enabled: standaloneWarningRow.type === "synced-plugin-shadowed",
      installPath: "",
      notes: [pluginWarningText(standaloneWarningRow)],
      noteDetails: [pluginIssueDetail(standaloneWarningRow)],
    });
  return i;
}
/**
 * claude plugin configure：校验每个选项已在 userConfig 声明、单行且不超过 64 KB、必填不为空、布尔/数字格式正确，再按 schema 校验后保存，返回改动的键。
 */
//@ chunk-d4eg9at2.js:46781-48268 sole-consumer
async function configurePluginOptions(plugin, values, scope, credentials) {
  let p = plugin.manifest.userConfig ?? {},
    filtered = Object.keys(values).filter((m) => !Object.hasOwn(p, m));
  if (filtered.length > 0) {
    let mapped = Object.keys(p).map(stripInvisibleKeepEmoji);
    throw new oe(
      `This plugin has no ${plural(filtered.length, "option")} ${filtered.map((k) => `"${stripInvisibleKeepEmoji(k)}"`).join(", ")}.` +
        (mapped.length > 0 ? ` Known options: ${mapped.join(", ")}.` : ""),
      "plugin configure: option not declared in userConfig",
    );
  }
  let P = marketplaceSource(plugin),
    y = await loadPluginOptions(P, credentials);
  for (let [m, k] of Object.entries(values)) {
    if (Buffer.byteLength(k, "utf8") > Pn)
      throw new oe(
        `${ge(m, p[m])} is too long (over 64 KB).`,
        "plugin configure: option value over the size cap",
        m,
      );
    if (/[\r\n]/.test(k))
      throw new oe(
        `${ge(m, p[m])} must be a single line.`,
        "plugin configure: option value contains a line break",
        m,
      );
    let F = p[m],
      trimmed = k.trim(),
      h = getOwn(y, m);
    if (trimmed === "" && F?.required === !0 && !(F.sensitive === !0 && h !== void 0 && h !== ""))
      throw new oe(`${ge(m, F)} is required but not provided`, "plugin configure: required option blank", m);
    if (F?.type === "boolean" && trimmed !== "" && h7e(trimmed) === void 0)
      throw new oe(
        `${ge(m, F)} must be true or false (or 1/0, yes/no, on/off).`,
        "plugin configure: option value is not a boolean",
        m,
      );
    if (F?.type === "number" && trimmed !== "" && parseBoundedNumber(trimmed, F) === void 0)
      throw new oe(
        `${ge(m, F)}: ${getFormatHint(F)}`,
        "plugin configure: option value is not a number the field takes",
        m,
      );
  }
  let I = buildFinalValues(Object.keys(values), values, p, y),
    keys = Object.keys(I);
  if (keys.length === 0) return [];
  for (let m of keys) {
    let k = validateUserConfig({ [m]: I[m] }, { [m]: p[m] });
    if (!k.valid)
      throw new oe(
        stripInvisibleKeepEmoji(k.errors.join("; ")),
        "plugin configure: value rejected by the userConfig schema",
        m,
      );
  }
  return (await savePluginOptions(P, I, p, scope, credentials), keys);
}
//@ chunk-d4eg9at2.js:48268-48337 affinity
function be(s, o) {
  return s.reduce((i, u) => i.split(u).join("\u2026"), o);
}
//@ chunk-d4eg9at2.js:48337-51461 facade-exports
async function pluginConfigureHandler(s, o, i, u) {
  if (o.cowork) setUseCoworkPlugins(!0);
  (isPluginCommandContext(),
    logEvent("tengu_plugin_configure_command", {}),
    await ensureSyncedPluginDirsRegistered());
  let { enabled: enabled, disabled: disabled } = await loadAllPlugins(i, u),
    P = findMarketplace([...enabled, ...disabled], s);
  if (!P)
    return (
      await logFeatureBadAsync("cli_plugin_configure", "not_found"),
      cliErrorAfterAnalyticsFlush(
        stripInvisibleKeepNewlines(
          `No installed plugin has the id "${stripInvisibleKeepEmoji(s)}". Use its full id (name@marketplace), as \`claude plugin list${o.cowork ? " --cowork" : ""}\` shows it.`,
        ),
      )
    );
  let y = marketplaceSource(P),
    I = P.manifest.userConfig ?? {},
    v = getPluginDisplayName(P),
    m = "Example: claude plugin configure <plugin> --values-stdin < values.json";
  if (o.valuesStdin) {
    if (process.stdin.isTTY)
      return (
        await logFeatureBadAsync("cli_plugin_configure", "invalid_stdin"),
        cliErrorAfterAnalyticsFlush(stripInvisibleKeepNewlines(`No option values were piped in. ${m}`))
      );
    let T,
      R = !1;
    try {
      let G = await getOptions_2();
      ((R = G === void 0), (T = G === void 0 ? void 0 : jsonParse(G)));
    } catch {
      T = void 0;
    }
    let E = parseStringRecord(T);
    if (E === void 0)
      return (
        await logFeatureBadAsync("cli_plugin_configure", "invalid_stdin"),
        cliErrorAfterAnalyticsFlush(
          stripInvisibleKeepNewlines(
            R
              ? "The input on stdin is over the 256 KB limit."
              : `The input on stdin isn't a JSON object of strings. ${m}`,
          ),
        )
      );
    let sorted = Object.entries(E)
        .filter(([G]) => Object.hasOwn(I, G) && I[G]?.sensitive)
        .flatMap(([, G]) => [G, G.trim()])
        .filter((G) => G !== "")
        .sort((G, J) => J.length - G.length),
      D;
    try {
      D = await configurePluginOptions(P, E, i, u);
    } catch (error) {
      if (error instanceof oe) await logFeatureSadAsync("cli_plugin_configure", "value_refused");
      else await logFeatureBadAsync("cli_plugin_configure", "save_failed");
      if (o.json && error instanceof oe) {
        let J = {
          pluginId: y,
          displayName: v,
          refused: { option: error.option, message: be(sorted, error.message) },
        };
        await writeStdoutAndDrain(
          printJson(J) +
            `
`,
        );
      }
      return cliErrorAfterAnalyticsFlush(
        stripInvisibleKeepNewlines(be(sorted, `Failed to save configuration: ${errorMessage(error)}`)),
      );
    }
    let M;
    try {
      M = Object.keys(await getUnconfiguredOptions(P, u));
    } catch (error) {
      logForDebugging(
        be(
          sorted,
          `plugin configure: saved, but the re-read of unset options failed: ${errorMessage(error)}`,
        ),
        { level: "error" },
      );
    }
    if ((await logFeatureOkAsync("cli_plugin_configure"), o.json)) {
      let G = { pluginId: y, displayName: v, saved: D, ...(M === void 0 ? {} : { unconfigured: M }) };
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
  let k, F;
  try {
    ((k = await loadPluginOptions(y, u)), (F = Object.keys(await getUnconfiguredOptions(P, u))));
  } catch (error) {
    return (
      await logFeatureBadAsync("cli_plugin_configure", "saved_options_read_failed"),
      cliErrorAfterAnalyticsFlush(
        stripInvisibleKeepNewlines(`Could not read the saved options for "${y}": ${errorMessage(error)}`),
      )
    );
  }
  let B = trustedPluginSetting(y).options ?? {},
    h = [],
    create = Object.create(null);
  for (let [T, R] of Object.entries(I)) {
    let E = getOwn(k, T);
    if (E === void 0 || E === "") continue;
    if ((h.push(T), R.type === "boolean")) {
      create[T] = E;
      continue;
    }
    let x = Object.hasOwn(B, T) ? B[T] : void 0;
    if (R.sensitive !== !0 && x !== void 0 && x !== "") create[T] = x;
  }
  let z = {};
  for (let [T, R] of Object.entries(I)) {
    let E = userConfigFieldParser(R);
    if (E !== void 0) z[T] = E;
  }
  if ((await logFeatureOkAsync("cli_plugin_configure"), o.json)) {
    let T = {
      pluginId: y,
      displayName: v,
      schema: I,
      inputs: pluginUserConfigValues(I, create),
      choices: z,
      configured: h,
      unconfigured: F,
    };
    (await writeStdoutAndDrain(
      printJson(T) +
        `
`,
    ),
      await exitAfterAnalyticsFlush(0));
    return;
  }
  let L = [];
  if (Object.keys(I).length === 0) L.push(`${v} (${y}) has no options to set.`);
  else {
    L.push(`Options for ${v} (${y}):`);
    for (let [T, R] of Object.entries(I)) {
      let filtered = [
          R.required ? "required" : "optional",
          R.sensitive ? "sensitive" : void 0,
          h.includes(T) ? "set" : "not set",
        ].filter(Boolean),
        x = R.title && R.title !== T ? ` \u2014 ${R.title}` : "";
      L.push(`  ${re.pointer} ${T}${x} (${filtered.join(", ")})`);
    }
    L.push(
      "",
      "Set values with /plugin configure <plugin> in Claude Code, or pipe a JSON object to `claude plugin configure <plugin> --values-stdin`.",
    );
  }
  (await writeStdoutAndDrain(
    formatMessageLines(L) +
      `
`,
  ),
    await exitAfterAnalyticsFlush(0));
}
//@ chunk-d4eg9at2.js:51461-51520 sole-consumer
function Ve(s) {
  return xr(s, (o) => Uo(o, "configuredCommand"));
}
/**
 * plugin 子命令表（init/validate/tag 等）。
 */
//@ chunk-y5m1jrzk.js:265-3494 placement
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
  list: { usage: "plugin list", description: "List installed plugins" },
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
  test: { usage: "plugin test [dir]", description: "Run a mod's tests", earlyAccess: "hooksModules" },
  details: {
    usage: "plugin details <name>",
    description: "Show a plugin's component inventory and projected token cost",
  },
  marketplaceAdd: {
    usage: "plugin marketplace add <source>",
    description: "Add a marketplace from a URL, path, or GitHub repo",
  },
  marketplaceList: { usage: "plugin marketplace list", description: "List all configured marketplaces" },
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
  enable: { usage: "plugin enable <plugin>", description: "Enable a disabled plugin" },
  disable: { usage: "plugin disable [plugin]", description: "Disable an enabled plugin" },
  update: {
    usage: "plugin update <plugin>",
    description: "Update a plugin to the latest version (restart required to apply)",
  },
  configure: {
    usage: "plugin configure <plugin>",
    description: "Show a plugin's options and which are unset, or save values from stdin with --values-stdin",
  },
};
/**
 * 列出当前可用的 plugin 子命令（按抢先体验开关过滤）。
 */
//@ chunk-y5m1jrzk.js:3494-3632 placement
function listAvailablePluginSubcommands() {
  let a = { pluginEval: J_n(), hooksModules: areHooksModulesActive() };
  return Object.values(PLUGIN_SUBCOMMANDS).filter((e) => e.earlyAccess === void 0 || a[e.earlyAccess]);
}
//@ chunk-z2kk8ttr.js:15018-15898 placement
var PLUGIN_INSTALL_MARKETPLACE_USAGE = "claude plugin install <plugin> --marketplace <source>",
  h = "add marketplace",
  f = "install from marketplace",
  w = `${INVALID_MARKETPLACE_SOURCE_MESSAGE} (a marketplace already added is named after the plugin instead: <plugin>@<marketplace>)`,
  D = `--marketplace needs the plugin's bare name. ${PLUGIN_ID_PART_RULE} Usage: ${PLUGIN_INSTALL_MARKETPLACE_USAGE}`,
  P = " The marketplace itself was added, and is declared in user settings.",
  T = (e) => !isValidPluginIdSegment(e) || isReservedMarketplaceName(e.toLowerCase()),
  O = (e, t) =>
    Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Marketplace ${jsonStringify(e)} can't be named after a plugin as <plugin>@<marketplace>, so nothing was installed from it.` +
          (t ? P : ""),
        "install --marketplace: the marketplace name is no plugin id half",
      ),
      { pluginCommandErrorCategory: "validation" },
    ),
  g = (e) => `${e.map(stripInvisibleKeepEmoji).join(`
`)}
`,
  R = (e, t) =>
    logEventAsync("tengu_marketplace_added", {
      _PROTO_marketplace_name: e,
      source_type: fromEnum(t.source),
      repo_hash: t.source === "github" ? gn(t.repo) : void 0,
      is_official_marketplace: isOfficialMarketplaceName_3(e),
    }),
  S = (e) => e.replace(/^error_/, "");
//@ chunk-z2kk8ttr.js:15898-17176 placement
async function pluginInstallFromMarketplace(
  e,
  { plugins: plugins, marketplaceSource: marketplaceSource, options: options },
  { storageV5: storageV5, credentials: credentials },
) {
  let n = validateMarketplaceInstallArgs({
    plugins: plugins,
    marketplaceSource: marketplaceSource,
    commandLine: PLUGIN_INSTALL_MARKETPLACE_USAGE,
  });
  if ("usageError" in n) return cliError(`${re.cross} ${n.usageError}`);
  if (!isValidPluginIdSegment(n.plugin)) return cliError(`${re.cross} ${D}`);
  let y = requireInstallableScope(options),
    l = [],
    s,
    p = h;
  try {
    let r = await parseMarketplaceInput(n.marketplaceSource);
    if (!r || "error" in r)
      throw withMarketplaceFailureCode(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          r?.error ?? w,
          "install --marketplace: the value is not a marketplace source",
        ),
        r?.unreadable === !0 ? void 0 : "invalid_source",
      );
    let a = await linkMarketplaceInUse(r, storageV5);
    if (a === void 0) {
      if (!options.json)
        await writeStdoutAndDrain(`Adding marketplace\u2026
`);
      let { name: m, resolvedSource: resolvedSource } = await addMarketplaceSource(
          r,
          (M) => {
            l.push(M);
          },
          storageV5,
          void 0,
          { refuseNameCollision: !0 },
        ),
        { error: error } = await saveMarketplaceToSettings(
          m,
          { source: resolvedSource },
          "userSettings",
          storageV5,
        );
      if (error) throw error;
      (ic(storageV5, credentials),
        await R(m, r),
        (s = m),
        l.push(`${re.tick} Successfully added marketplace: ${m} (declared in user settings)`));
    } else ((s = a), l.push(`Marketplace '${a}' is already added`));
    if (T(s)) throw ((p = f), O(s, a === void 0));
  } catch (error) {
    let a = pluginErrorKind(error);
    if (!options.json && p === f) await writeStdoutAndDrain(g(l));
    if (options.json)
      await writePluginResult({
        command: "install",
        outcome: "failed",
        plugin: n.plugin,
        scope: y,
        message: stripInvisibleKeepNewlines(errorMessage(error)),
        failureCode: a,
      });
    return (
      await (error instanceof Bd && classifyCommandSourceError(error).kind === "sad"
        ? logFeatureSadAsync("cli_plugin_install", S(a))
        : logFeatureBadAsync("cli_plugin_install", S(a))),
      await flushAnalyticsBeforeExit(),
      handleMarketplaceError(error, p)
    );
  }
  if (!options.json) await writeStdoutAndDrain(g(l));
  await pluginInstallHandler(e, `${n.plugin}@${s}`, options, storageV5);
}

export { formatMessageLines, PLUGIN_SUBCOMMANDS, listAvailablePluginSubcommands };
