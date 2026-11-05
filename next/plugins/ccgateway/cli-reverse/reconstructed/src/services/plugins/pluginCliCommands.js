/**
 * services/plugins/pluginCliCommands.ts
 *
 * 并入已有模块：`claude plugin` 子命令的配置参数解析、结果输出与错误类。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/plugins/pluginCliCommands.ts
 * pieces: chunk-h30gsc89.js (38), chunk-mbyxant6.js (7)
 * attribution: placement 22, layout 17, fingerprint 5, callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { basename, join } from "path";
import { createHash, randomUUID } from "crypto";
import { stat, readFile } from "fs/promises";
import {
  isMcpbSource,
  isLocalMcpbSource,
  loadMcpbFile,
  validateUserConfig,
  saveMcpServerUserConfig,
  loadMcpServerUserConfig,
} from "../../utils/plugins/mcpbHandler.js";
import { pathEscapeError } from "../../utils/plugins/pluginPathContainment.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  withTelemetryMessage,
  toError,
} from "../../utils/errors.js";
import { pluginErrorText } from "../../types/plugin.js";
import { printableName, quotedPrintable, printableOrEmpty } from "../../utils/printableName.js";
import { plural } from "../../utils/stringUtils.js";
import { getOwn } from "../../utils/objectSafety.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import {
  scopeToSettingSource,
  parsePluginIdentifier,
  parseNpmPluginId,
} from "../../utils/plugins/pluginIdentifier.js";
import {
  getSettingsFilePathForSource,
  getSettingsParseErrorsForSource,
} from "../../utils/settings/settings.js";
import { USER_SETTINGS_FILE_NAMES } from "../../utils/settings/settingsFileParsing.js";
import { isWorkspaceRestrictedSource, isSuspectLink } from "./pluginUninstallSettings.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { describeArchiveFetchCommand } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { ownPropertyOrUndefined } from "../../utils/plugins/marketplaceSources.js";
import {
  loadKnownMarketplacesSafe,
  seedDirFor,
  getPluginById,
} from "../../utils/plugins/marketplaceManager.js";
import { runGitWithCeilingDirs } from "../../utils/gitSafeExec.js";
import { execFileNoThrowWithCwd } from "../../utils/execFileNoThrow.js";
import { gitExe } from "../../utils/git.js";
import { GCS_SHA_MARKER_FILE, refreshPluginCaches } from "../../utils/plugins/cacheUtils.js";
import { stripBom } from "../../utils/json.js";
import { writeStdoutAndDrain, exitAfterAnalyticsFlush } from "../../cli/exit.js";
import { escapeControlChars } from "../../utils/resultError.js";
import { identity } from "../../utils/identity.js";
import { env } from "../../utils/env.js";
import {
  CommandSourceError,
  LINK_MODE_UNSUPPORTED_ON_WINDOWS_MESSAGE,
  describeCommandOutputMode,
  isPluginsDirOnLocalDisk,
  describeCommandSourceMode,
  commandSourceSpecOf,
} from "../../utils/plugins/commandSource.js";
import { COMMAND_SOURCE_NETWORK_ERRORS } from "../../utils/plugins/commandSourceErrors.js";
import { classifyCommandSourceError } from "../../utils/plugins/headersHelper.js";
import { ClaudeAiMarketplaceError } from "../../utils/plugins/claudeAiMarketplaces.js";
import {
  classifyPluginCommandError as classifyPluginCommandError_2,
  pluginIdForTelemetry,
  buildPluginVersionShaField,
} from "../../utils/telemetry/pluginTelemetry.js";
import { waitForOAuthRefreshUntilDeadlineAtExit } from "../../utils/auth/oauthRefreshExitWait.js";
import {
  stripInvisibleKeepNewlines,
  stripInvisibleKeepEmoji,
} from "../../utils/settings/marketplaceSettingsAliases.js";
import { logFeatureBadAsync, logFeatureSadAsync, logFeatureOkAsync } from "../analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { pluginTelemetryFields } from "../../utils/telemetry/pluginTelemetryName.js";
import { policyEnabledPluginNameSet } from "../../utils/plugins/pluginPolicy.js";
import { logEventAsync, logEvent } from "../analytics/index.js";
import { fromEnum, fromEnumOpt, lit } from "../analytics/safeMetadata.js";
import { truthyOrFalsyEnv } from "../../utils/plugins/pluginConfigEnv.js";
import { filterEntriesToNullProto } from "../../utils/hooks/functionHookMatchers.js";
import { loadAllPlugins, loadAllPluginsCacheOnly } from "../../utils/plugins/pluginLoader.js";
import {
  findMarketplace,
  savePluginOptions,
  marketplaceSource,
  getUnconfiguredOptions,
} from "../../utils/plugins/pluginOptionsStorage.js";
import {
  areCommandPluginSourcesDisabledByPolicy,
  commandPluginSourcesDisabledMessage,
  isSourceDisallowedOrUnverifiable,
} from "../../utils/plugins/marketplacePolicy.js";
import { writeToStdout } from "../../utils/process.js";
import { getPlatform } from "../../utils/platform.js";
import { isSpawnedByClaudeCodeSession } from "../../utils/claudeSubprocessEnv.js";
import { confirmPrompt, MIN_CONFIRM_ANSWER_DELAY_MS } from "../../utils/confirmPrompt.js";
import {
  findPluginInMarketplaces,
  hasOnlyMissingDependencyIssues,
  archiveFetchWarning,
  archiveHelperDisclosure,
  refreshBeforeScopedInstall,
  installPluginOp,
  getProjectPathForScope,
  isPluginInSettings,
  uninstallPluginOp,
  disablePluginOp,
  listRequiredPlugins,
  updatePluginOp,
  isSadFailureCode,
} from "./pluginOperations.js";
import {
  loadInstalledPlugins,
  loadInstalledPluginsSync,
  getInstalledGitCommitSha,
} from "../../utils/plugins/installedPluginsManager.js";
import {
  isPluginEnabledAndCachedAtScope,
  pruneOrphanedAutoDeps,
} from "../../utils/plugins/pluginDependencies.js";
import { runCommandHint } from "../../utils/worktreeResumeHint.js";
import { sshCloneFallback } from "../../utils/plugins/gitSshConfig.js";
import { directoryInstallFields } from "../../utils/plugins/pluginDirectoryTelemetry.js";
import {
  findOrphanedAutoDependencies,
  formatOrphanedDependenciesNotice,
  installationAtTarget,
} from "../../utils/plugins/dependencyResolver.js";
import { installSelectedPlugins } from "../../utils/plugins/pluginStartupCheck.js";
import {
  isOfficialPluginDirectoryId,
  bindingsWithReadFailure,
  isUnreadableBindings,
  findBindingKeysFor,
} from "../../utils/plugins/pluginDirectoryBindings.js";
import { marketplaceDisplayName } from "../../utils/plugins/officialMarketplaceNames.js";
import { sanitizeVersion } from "../analytics/metadata.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-mbyxant6.js:669-873 placement
function mcpbSourcesOf(marketplace) {
  let mcpServers = marketplace.manifest.mcpServers;
  let filtered = (
    typeof mcpServers === "string" ? [mcpServers] : Array.isArray(mcpServers) ? mcpServers : []
  ).filter((source) => typeof source === "string" && isMcpbSource(source));
  let filtered_2 = filtered.filter((localSource) => isLocalMcpbSource(localSource));
  return {
    local: filtered_2,
    remoteCount: filtered.length - filtered_2.length,
  };
}
//@ chunk-mbyxant6.js:873-1432 placement
/**
 * 安装插件后读取其捆绑的 MCPB 服务器：并行加载每个本地包，收集需要配置的服务器（名称、配置 schema、已有配置），读不出的包单独列出。
 */
async function readBundledServerConfigs(marketplace, local, storageV5) {
  let results = await Promise.all(
    local.map(async (spec) => {
      if (await pathEscapeError(marketplace, spec, "mcp-servers"))
        return {
          spec,
          result: undefined,
        };
      try {
        let result = await loadMcpbFile(
          spec,
          marketplace.path,
          marketplace.repository,
          undefined,
          undefined,
          true,
          storageV5,
        );
        return {
          spec,
          result,
        };
      } catch (error) {
        logForDebugging(`post-install bundle read failed for ${spec}: ${errorMessage(error)}`, {
          level: "warn",
        });
        return {
          spec,
          result: undefined,
        };
      }
    }),
  );
  let bundlesByName = new Map();
  let unreadable = [];
  for (let { spec, result: loaded } of results)
    if (!loaded) unreadable.push(spec);
    else if ("status" in loaded)
      bundlesByName.set(loaded.manifest.name, {
        serverName: loaded.manifest.name,
        schema: loaded.configSchema,
        existingConfig: loaded.existingConfig,
      });
  return {
    bundles: [...bundlesByName.values()],
    unreadable,
  };
}
//@ chunk-mbyxant6.js:1432-1638 layout
async function describeMcpbSourceError(plugin, mcpbPath) {
  let bundleError = isLocalMcpbSource(mcpbPath)
    ? await pathEscapeError(plugin, mcpbPath, "mcp-servers")
    : undefined;
  return (
    bundleError &&
    `${pluginErrorText(bundleError)}. This bundle can't be configured. If its path leads outside the plugin, the plugin's author needs to change it.`
  );
}
//@ chunk-mbyxant6.js:1638-1844 placement
function parseConfigPair(pair) {
  let index = pair.indexOf("=");
  if (index <= 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `--config expects KEY=VALUE, got "${pair}". Use --config key=value (repeatable).`,
      "--config pair has no key",
    );
  return {
    key: pair.slice(0, index),
    raw: pair.slice(index + 1),
  };
}
//@ chunk-mbyxant6.js:1844-3177 placement
function splitPluginConfigArgs(configArgs, userConfig, bundles, bundleInfo) {
  let pluginPairs = [];
  let bundlePairs = new Map();
  for (let configArg of configArgs) {
    let { key, raw } = parseConfigPair(configArg);
    if (userConfig && Object.hasOwn(userConfig, key)) {
      pluginPairs.push(configArg);
      continue;
    }
    let flattened = bundles.flatMap(({ serverName, schema }) => {
      let matches = [];
      let prefix = `${serverName}.`;
      if (key.startsWith(prefix) && Object.hasOwn(schema, key.slice(prefix.length)))
        matches.push({
          serverName,
          field: key.slice(prefix.length),
          bare: false,
        });
      if (Object.hasOwn(schema, key))
        matches.push({
          serverName,
          field: key,
          bare: true,
        });
      return matches;
    });
    let [firstMatch, ...otherMatches] = flattened;
    if (firstMatch && otherMatches.length === 0) {
      if (firstMatch.bare && bundleInfo.unreadable.length + bundleInfo.remoteCount > 0)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `--config key "${key}" must name its server, because a bundled MCP server whose keys are unknown may declare it too; use ${printableName(`${firstMatch.serverName}.${firstMatch.field}`)}.` +
            unconfigurableBundlesNote(bundleInfo),
          "--config bare key with an unread bundled server",
        );
      let values = bundlePairs.get(firstMatch.serverName) ?? [];
      values.push(`${firstMatch.field}=${raw}`);
      bundlePairs.set(firstMatch.serverName, values);
      continue;
    }
    if (firstMatch)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `--config key "${key}" is declared by more than one bundled MCP server; use ${flattened.map((match) => printableName(`${match.serverName}.${match.field}`)).join(" or ")}.`,
        "--config key is ambiguous between bundled servers",
      );
    let knownKeys = [
      ...Object.keys(userConfig ?? {}),
      ...bundles.flatMap(({ serverName, schema }) =>
        Object.keys(schema).map((key) => printableName(`${serverName}.${key}`)),
      ),
    ];
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `--config key "${key}" isn't declared in this plugin's userConfig` +
        (bundles.length > 0 ? " or by its bundled MCP servers." : ".") +
        (knownKeys.length > 0 ? ` Known keys: ${knownKeys.join(", ")}.` : "") +
        unconfigurableBundlesNote(bundleInfo),
      "--config key is not declared",
    );
  }
  return {
    pluginPairs,
    bundlePairs,
  };
}
//@ chunk-mbyxant6.js:3177-3648 placement
/**
 * 生成"部分捆绑服务器无法用 --config 配置"的括注：读不出的本地包，以及启动时从 URL 拉取、只能在 Claude Code 里配置的远程包。
 */
function unconfigurableBundlesNote({ unreadable, remoteCount }) {
  let notes = [];
  if (unreadable.length > 0)
    notes.push(
      `the bundled ${unreadable.map((spec) => quotedPrintable(spec)).join(", ")} could not be read, so its keys are unknown \u2014 re-run with --debug-file <path> to log why`,
    );
  if (remoteCount > 0)
    notes.push(
      `${remoteCount} bundled ${plural(remoteCount, "server is", "servers are")} fetched from a URL at session start and can only be configured in Claude Code (/plugin \u2192 Installed \u2192 Configure)`,
    );
  let joined = notes.join("; ");
  return joined ? ` (${joined[0].toUpperCase()}${joined.slice(1)}.)` : "";
}
//@ chunk-mbyxant6.js:3648-4215 placement
/**
 * 检查捆绑 MCP 服务器的配置是否完整，不完整时返回提示：列出缺少的必填键或校验错误，并说明可用 --config KEY=VALUE 或在 /plugin 中配置。
 */
function missingConfigMessage(bundle, pluginId) {
  let validation = validateUserConfig(bundle.existingConfig, bundle.schema);
  if (validation.valid) return;
  let serverLabel = printableName(bundle.serverName);
  let mapped = Object.entries(bundle.schema)
    .filter(([key, value]) => {
      let existingValue = getOwn(bundle.existingConfig, key);
      return value.required === true && (existingValue === undefined || existingValue === "");
    })
    .map(([key]) => printableName(`${serverLabel}.${key}`));
  let fixHint =
    mapped.length > 0
      ? `set ${mapped.join(", ")} with --config KEY=VALUE`
      : `${validation.errors.map((error) => printableName(error)).join("; ")} \u2014 fix it with --config ${serverLabel}.KEY=VALUE`;
  return `MCP server "${quotedPrintable(bundle.serverName)}" needs configuration before it can start: ${fixHint}, or in Claude Code run /plugin, select "${quotedPrintable(pluginId)}" in the Installed tab, and choose Configure.`;
}
//@ chunk-h30gsc89.js:2038-2113 placement
function withSettingsWarning(message, scope) {
  let warning = settingsFileWarning(scope);
  return warning === null
    ? message
    : `${message}
${figures_default.warning} ${warning}`;
}
//@ chunk-h30gsc89.js:2113-2953 placement
function settingsFileWarning(scope) {
  try {
    if (scope === undefined || scope === "managed") return null;
    let source = scopeToSettingSource(scope);
    let filePath = getSettingsFilePathForSource(source);
    if (
      filePath === undefined ||
      (source === "userSettings" && basename(filePath) === USER_SETTINGS_FILE_NAMES.cowork)
    )
      return null;
    if (isWorkspaceRestrictedSource(source) || (source !== "userSettings" && isSuspectLink(filePath)))
      return null;
    let filtered = getSettingsParseErrorsForSource(source).filter(
      (parseError) => parseError.file === filePath && parseError.severity !== "warning",
    );
    let [firstError] = filtered;
    if (firstError === undefined) return null;
    let otherErrorCount = filtered.length - 1;
    let problem =
      firstError.path !== ""
        ? `its "${quotedPrintable(firstError.path, 80)}" ${otherErrorCount > 0 ? `and ${otherErrorCount} other ${plural(otherErrorCount, "value")} are` : "is"} not valid`
        : firstError.errorClass === "unreadable"
          ? "it could not be read"
          : "it is not a JSON object";
    return `${printableOrEmpty(filePath)} does not load (${problem}), so Claude Code ignores the whole file, including anything this command wrote there. Fix the file, then run this command again if its change is missing. If a newer Claude Code wrote the file, update Claude Code instead.`;
  } catch (error) {
    logForDebugging(`settings file check after a plugin command skipped: ${errorMessage(error)}`, {
      level: "warn",
    });
    return null;
  }
}
//@ chunk-h30gsc89.js:2953-3433 placement
let PluginOperationFailedError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-h30gsc89.js:2953", () => {
  PluginOperationFailedError = class PluginOperationFailedError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    result;
    pluginCommandErrorCategory;
    constructor(message, result = {}) {
      super(message, "plugin operation returned a failure result");
      this.name = "PluginOperationFailedError";
      this.result = result;
      if (
        result.failureCode === "invalid_plugin_id" ||
        result.failureCode === "plugin_folder_held" ||
        result.failureCode === "install_records_unreadable" ||
        result.failureCode === "directory_identity_changed" ||
        result.failureCode === "directory_binding_unreadable" ||
        result.failureCode === "directory_loaded"
      )
        this.pluginCommandErrorCategory = "validation";
    }
  };
});
//@ chunk-h30gsc89.js:3433-3648 placement
function installConfirmationDigest(shown) {
  let digestParts =
    shown.kind === "command_source"
      ? [shown.kind, shown.pluginId, shown.command, shown.mode, shown.catalogRevision]
      : [shown.kind, shown.pluginId, shown.command, shown.archiveUrl, shown.catalogRevision];
  return createHash("sha256").update(jsonStringify(digestParts), "utf8").digest("hex");
}
//@ chunk-h30gsc89.js:3648-3689 placement
/**
 * 给安装确认对象补上 sha256 摘要。
 */
function withConfirmationDigest(shown) {
  return {
    ...shown,
    sha256: installConfirmationDigest(shown),
  };
}
//@ chunk-h30gsc89.js:3689-3760 placement
/**
 * 补上 “确认命令是否匹配” 的标记。
 */
function withAcceptMatch(shown, acceptCommand) {
  return acceptCommand === undefined
    ? shown
    : {
        ...shown,
        acceptCommandMatched: matchesAcceptCommand(acceptCommand, shown),
      };
}
//@ chunk-h30gsc89.js:3760-3900 placement
async function entryHelperTarget(helper, pluginId, storageV5) {
  return {
    kind: "entry_helper",
    pluginId,
    command: helper.command,
    archiveUrl: describeArchiveFetchCommand(helper).destination,
    catalogRevision: await marketplaceRevision(pluginId, storageV5),
  };
}
//@ chunk-h30gsc89.js:3900-4626 placement
/**
 * 计算插件所在市场的版本标识，用于确认后的安装比对：git 检出取 HEAD 提交，GCS 种子取记录的摘要，settings 来源结合清单与来源内容的哈希，其余为清单哈希；无法确定时返回随机 unreadable 值。
 */
async function marketplaceRevision(pluginId, storageV5) {
  let unreadable = `unreadable:${randomUUID()}`;
  if (isStorageV5Enabled() && storageV5 !== undefined) return unreadable;
  let { marketplace } = parsePluginIdentifier(pluginId);
  let entry =
    marketplace === undefined
      ? undefined
      : ownPropertyOrUndefined(await loadKnownMarketplacesSafe(storageV5), marketplace);
  if (entry === undefined) return unreadable;
  if (entry.source.source === "claudeai") return unreadable;
  let installLocation = entry.installLocation;
  try {
    if (entry.source.source === "github" || entry.source.source === "git") {
      if (
        await stat(join(installLocation, ".git")).then(
          () => true,
          () => false,
        )
      ) {
        let gitSetup = runGitWithCeilingDirs(installLocation, {});
        let revParse = await execFileNoThrowWithCwd(
          gitExe(),
          [...gitSetup.inCheckoutArgs, "rev-parse", "HEAD"],
          {
            cwd: installLocation,
            env: gitSetup.env,
            stdin: "ignore",
          },
        );
        return revParse.code === 0 ? `git:${revParse.stdout.trim()}` : unreadable;
      }
      if (seedDirFor(installLocation) === undefined) {
        let trimmed = (await readFile(join(installLocation, GCS_SHA_MARKER_FILE), "utf8")).trim();
        return /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(trimmed) ? `gcs:${trimmed}` : unreadable;
      }
    }
    return entry.source.source === "settings"
      ? `settings:${hashUserId([await marketplaceManifestHash(installLocation), canonicalForm(entry.source)])}`
      : `sha256:${await marketplaceManifestHash(installLocation)}`;
  } catch {
    return unreadable;
  }
}
//@ chunk-h30gsc89.js:4626-5002 placement
/**
 * 计算插件市场清单的规范化哈希：读取 .claude-plugin/marketplace.json（或文件本身）与 package.json，键排序后取 sha256。
 */
async function marketplaceManifestHash(installLocation) {
  let isMissingErrno = (error) => ["ENOENT", "ENOTDIR"].includes(getErrnoCode(error) ?? "");
  let manifestText;
  let isDirectoryInstall = true;
  try {
    manifestText = await readFile(join(installLocation, ".claude-plugin", "marketplace.json"), "utf8");
  } catch (error) {
    if (!isMissingErrno(error)) throw error;
    manifestText = await readFile(installLocation, "utf8");
    isDirectoryInstall = false;
  }
  let packageText = isDirectoryInstall
    ? await readFile(join(installLocation, "package.json"), "utf8").catch((error) => {
        if (isMissingErrno(error)) return null;
        throw error;
      })
    : null;
  return createHash("sha256")
    .update(
      jsonStringify([
        canonicalForm(jsonParse(stripBom(manifestText))),
        packageText === null ? null : canonicalForm(jsonParse(stripBom(packageText))),
      ]),
      "utf8",
    )
    .digest("hex");
}
//@ chunk-h30gsc89.js:5002-5070 layout
function hashUserId(userId) {
  return createHash("sha256").update(jsonStringify(userId), "utf8").digest("hex");
}
//@ chunk-h30gsc89.js:5070-5229 placement
function canonicalForm(value) {
  if (Array.isArray(value)) return ["[", ...value.map(canonicalForm)];
  if (value !== null && typeof value === "object")
    return [
      "{",
      ...Object.keys(value)
        .sort()
        .map((key) => [key, canonicalForm(value[key])]),
    ];
  return value;
}
//@ chunk-h30gsc89.js:5229-5294 placement
/**
 * 判断确认命令是否与摘要匹配。
 */
function matchesAcceptCommand(acceptCommand, shown) {
  return (
    acceptCommand !== undefined && acceptCommand.trim().toLowerCase() === installConfirmationDigest(shown)
  );
}
//@ chunk-h30gsc89.js:5294-5439 placement
async function writePluginResult(result) {
  let output =
    result.failureCode !== undefined && UNCONFIRMED_INSTALL_CODES.has(result.failureCode)
      ? result
      : {
          ...result,
          shownCommand: undefined,
        };
  await writeStdoutAndDrain(
    escapeControlChars(
      jsonStringify({
        ...output,
        nonce: resultNonce.value,
      }),
    ) +
      `
`,
  );
}
//@ chunk-h30gsc89.js:5439-5486 placement
/**
 * 保存结果 nonce 的槽位。
 */
var resultNonce; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-h30gsc89.js:5439", () => {
  resultNonce = identity(
    {
      value: undefined,
    },
    (slot) => {
      slot.value = undefined;
    },
  );
});
//@ chunk-h30gsc89.js:5486-5516 placement
/**
 * 读取结果 nonce。
 */
function readResultNonce() {
  return resultNonce.value;
}
//@ chunk-h30gsc89.js:5516-5610 placement
function readResultNonce_2() {
  resultNonce.value = env.CLAUDE_CODE_RESULT_NONCE || undefined;
  env.unset("CLAUDE_CODE_RESULT_NONCE");
}
//@ chunk-h30gsc89.js:5610-5730 placement
var UNCONFIRMED_INSTALL_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-h30gsc89.js:5610", () => {
  UNCONFIRMED_INSTALL_CODES = new Set([
    "command_source_refused",
    "command_source_declined",
    "entry_helper_unconfirmed",
    "entry_helper_declined",
  ]);
});
//@ chunk-h30gsc89.js:5730-5928 layout
function getPluginCommandFailureCode(error, command) {
  if (error instanceof PluginOperationFailedError) return error.result.failureCode ?? "op_failed";
  if (error instanceof CommandSourceError && command === "update") {
    let telemetryMessage = error.telemetryMessage;
    if (telemetryMessage.startsWith(COMMAND_SOURCE_NETWORK_ERRORS))
      return telemetryMessage.slice(COMMAND_SOURCE_NETWORK_ERRORS.length);
  }
  return classifyPluginCommandError(error);
}
//@ chunk-h30gsc89.js:5928-6055 layout
/**
 * 把插件命令错误归类为遥测 failureCode（插件操作错误码、claudeai_*、error_*）。
 */
function classifyPluginCommandError(error) {
  if (error instanceof CommandSourceError) return classifyCommandSourceError(error).code;
  if (error instanceof ClaudeAiMarketplaceError) return `claudeai_${error.code}`;
  return `error_${snakeCaseDashes(classifyPluginCommandError_2(error))}`;
}
//@ chunk-h30gsc89.js:6055-6099 layout
function snakeCaseDashes(text) {
  return text.replaceAll("-", "_");
}
//@ chunk-h30gsc89.js:6099-7346 layout
var FAILURE_CODE_CATEGORY = {
  invalid_plugin_id: "validation",
  plugin_folder_held: "validation",
  marketplace_policy_blocked: "policy",
  plugin_policy_blocked: "policy",
  dependency_policy_blocked: "policy",
  directory_unavailable: "network",
  directory_off: "validation",
  directory_not_in_session: "validation",
  installed_from_other_marketplace: "validation",
  dependency_pinned_version_unsatisfied: "validation",
  directory_listing_not_installable: "validation",
  directory_identity_changed: "validation",
  directory_binding_unreadable: "validation",
  replace_unavailable: "validation",
  replace_needs_full_id: "validation",
  replace_needs_fresh_listing: "network",
  install_records_unreadable: "validation",
  not_installed: "validation",
  not_installed_at_scope: "validation",
  already_in_goal_state: "validation",
  settings_still_on: "validation",
};
var UNCLASSIFIED_COMMAND_FAILURE = {
  install: "claude plugin install failed with an unclassified error",
  uninstall: "claude plugin uninstall failed with an unclassified error",
  enable: "claude plugin enable failed with an unclassified error",
  disable: "claude plugin disable failed with an unclassified error",
  "disable-all": "claude plugin disable --all failed with an unclassified error",
  update: "claude plugin update failed with an unclassified error",
  prune: "claude plugin prune failed with an unclassified error",
};
//@ chunk-h30gsc89.js:7346-7413 layout
function appendLines(message, extraLines) {
  return extraLines.length === 0
    ? message
    : [message.trimEnd(), ...extraLines].join(`
`);
}
//@ chunk-h30gsc89.js:7413-9247 fingerprint (2.1.88 match: handlePluginCommandError, 0.383)
/**
 * CLI 插件子命令的统一错误处理：打 tengu_plugin_command_failed 遥测（命令、作用域、failureCode 分类），JSON 模式输出结构化结果，否则打印错误并以非零退出。
 */
async function handlePluginCommandError(
  error,
  command,
  pluginArg,
  storageV5,
  shownContext,
  aliasedId,
  extraLines = [],
) {
  if (command === "install" && shownContext === undefined && process.stdout.isTTY)
    waitForOAuthRefreshUntilDeadlineAtExit(false);
  let failureCode = error instanceof PluginOperationFailedError ? error.result.failureCode : undefined;
  let errorKind = classifyPluginCommandError_2(error);
  let category =
    errorKind === "unknown" && failureCode !== undefined
      ? (FAILURE_CODE_CATEGORY[failureCode] ?? errorKind)
      : errorKind;
  let resultCommand = command === "disable-all" ? "disable" : command === "prune" ? undefined : command;
  if (shownContext && resultCommand) {
    let failureResult = error instanceof PluginOperationFailedError ? error.result : {};
    await writePluginResult({
      command: resultCommand,
      outcome: "failed",
      ...(command === "disable-all"
        ? {
            all: true,
          }
        : {
            plugin: pluginArg,
          }),
      pluginId: failureResult.pluginId ?? shownContext.pluginId ?? aliasedId,
      scope: shownContext.scope,
      message: stripInvisibleKeepNewlines(appendLines(errorMessage(error), extraLines)),
      failureCode: getPluginCommandFailureCode(error, command),
      alreadyInGoalState: failureResult.alreadyInGoalState,
      installedScope: failureResult.installedScope,
      reverseDependents: failureResult.reverseDependents,
      dependencies: failureResult.dependencies,
      disableFirst: failureResult.disableFirst,
      governingScope: failureResult.governingScope,
      shownCommand: shownContext.shownCommand && withConfirmationDigest(shownContext.shownCommand),
    });
  }
  if (error instanceof CommandSourceError && (command === "install" || command === "update")) {
    console.error(stripInvisibleKeepNewlines(appendLines(errorMessage(error), extraLines)));
    if (command === "install") {
      let { code, kind } = classifyCommandSourceError(error);
      if (kind === "bad") await logFeatureBadAsync("cli_plugin_install", code);
      else await logFeatureSadAsync("cli_plugin_install", code);
    } else if (command === "update")
      await logFeatureSadAsync("cli_plugin_update", getPluginCommandFailureCode(error, "update"));
    return exitAfterAnalyticsFlush(1);
  }
  let claudeAiCode = error instanceof ClaudeAiMarketplaceError ? `claudeai_${error.code}` : undefined;
  if (category === "unknown" && !(error instanceof PluginOperationFailedError) && claudeAiCode === undefined)
    logError(withTelemetryMessage(toError(error), UNCLASSIFIED_COMMAND_FAILURE[command]));
  else
    logForDebugging(`Plugin command "${command}" failed: ${errorMessage(error)}`, {
      level: "error",
    });
  let actionLabel = pluginArg
    ? `${command} plugin "${pluginArg}"`
    : command === "disable-all"
      ? "disable all plugins"
      : `${command} plugins`;
  console.error(
    stripInvisibleKeepNewlines(
      appendLines(`${figures_default.cross} Failed to ${actionLabel}: ${errorMessage(error)}`, extraLines),
    ),
  );
  let resultCode =
    claudeAiCode ??
    (failureCode !== undefined && (errorKind === "unknown" || failureCode === "not_installed")
      ? failureCode
      : snakeCaseDashes(category));
  switch (command) {
    case "install":
      await logFeatureBadAsync("cli_plugin_install", resultCode);
      break;
    case "uninstall":
      await logFeatureBadAsync("cli_plugin_uninstall", resultCode);
      break;
    case "update":
      await logFeatureBadAsync("cli_plugin_update", resultCode);
      break;
    case "enable":
      await logFeatureBadAsync("cli_plugin_enable", "cli_plugin_enable_failed");
      break;
    default:
      break;
  }
  let telemetryFields = pluginArg
    ? await pluginTelemetryFields(aliasedId ?? pluginArg, policyEnabledPluginNameSet(), storageV5)
    : {};
  await logEventAsync("tengu_plugin_command_failed", {
    command: fromEnum(command),
    error_category: fromEnum(category),
    ...{
      failure_code: fromEnumOpt(failureCode),
    },
    ...telemetryFields,
    ...(aliasedId !== undefined
      ? {
          aliased_id: true,
        }
      : {}),
  });
  return exitAfterAnalyticsFlush(1);
}
//@ chunk-h30gsc89.js:9247-10116 layout
function applyConfigFlags(pairs, configFields, prefix = "") {
  let values = {};
  for (let pair of pairs) {
    let { key, raw } = parseConfigPair(pair);
    let keyName = printableName(`${prefix}${key}`);
    let trimmed = (raw.split(/\r\n|\r|\n/, 1)[0] ?? "").trim();
    let field = Object.hasOwn(configFields, key) ? configFields[key] : undefined;
    if (!field) {
      let mapped = Object.keys(configFields).map((key) => printableName(`${prefix}${key}`));
      throw Error(
        `--config key "${keyName}" isn't declared in this plugin's userConfig.` +
          (mapped.length > 0 ? ` Known keys: ${mapped.join(", ")}.` : ""),
      );
    }
    if (trimmed === "")
      throw Error(`--config ${keyName}: value is empty. Omit the flag to leave "${keyName}" unset.`);
    if (field.type === "number") {
      let parsedNumber = Number(trimmed);
      if (Number.isNaN(parsedNumber)) throw Error(`--config ${keyName}: "${trimmed}" is not a number`);
      values[key] = parsedNumber;
    } else if (field.type === "boolean") {
      let parsedBool = truthyOrFalsyEnv(trimmed);
      if (parsedBool === undefined)
        throw Error(
          `--config ${keyName}: "${trimmed}" is not a boolean (use true/false, 1/0, yes/no, on/off)`,
        );
      values[key] = parsedBool;
    } else values[key] = trimmed;
  }
  let declaredSubset = filterEntriesToNullProto(configFields, (fieldDef, fieldKey) =>
    Object.hasOwn(values, fieldKey),
  );
  let validation = validateUserConfig(values, declaredSubset);
  if (!validation.valid)
    throw Error(
      `--config validation failed: ${validation.errors.map((error) => printableName(error)).join("; ")}`,
    );
  return values;
}
//@ chunk-h30gsc89.js:10116-11587 layout
/**
 * claude plugin install --config key=value：安装后重新加载插件，按 manifest.userConfig 校验并保存这些选项。
 */
async function configurePluginFromFlags(pluginArg, configArgs, storageV5) {
  refreshPluginCaches(storageV5);
  let { enabled, disabled } = await loadAllPlugins(storageV5);
  let marketplace = findMarketplace([...enabled, ...disabled], pluginArg);
  let flagConfigArgs = configArgs ?? [];
  let hasConfig = flagConfigArgs.length > 0;
  if (!marketplace) {
    if (hasConfig)
      throw Error(
        `--config was given but plugin "${pluginArg}" failed to load after install \u2014 run \`claude plugin list\` to see why.`,
      );
    return "";
  }
  let userConfig = marketplace.manifest.userConfig;
  let declaredConfig = userConfig && Object.keys(userConfig).length > 0 ? userConfig : undefined;
  let any = flagConfigArgs
    .map(parseConfigPair)
    .some(({ key }) => !(declaredConfig && Object.hasOwn(declaredConfig, key)));
  let { local, remoteCount } = mcpbSourcesOf(marketplace);
  let { bundles, unreadable } =
    local.length > 0 && (marketplace.enabled || any)
      ? await readBundledServerConfigs(marketplace, local, storageV5)
      : {
          bundles: [],
          unreadable: [],
        };
  let bundleInfo = {
    unreadable,
    remoteCount,
  };
  if (hasConfig) {
    if (!declaredConfig && bundles.length === 0)
      throw Error(
        `--config was given but plugin "${pluginArg}" declares no userConfig options` +
          (local.length > unreadable.length ? " and its bundled MCP servers declare no user_config." : ".") +
          unconfigurableBundlesNote(bundleInfo),
      );
    let { pluginPairs, bundlePairs } = splitPluginConfigArgs(
      flagConfigArgs,
      declaredConfig,
      bundles,
      bundleInfo,
    );
    let pluginValues =
      declaredConfig && pluginPairs.length > 0 ? applyConfigFlags(pluginPairs, declaredConfig) : undefined;
    let flattened = bundles.flatMap((bundle) => {
      let bundlePairsForServer = bundlePairs.get(bundle.serverName);
      return bundlePairsForServer
        ? [
            {
              bundle,
              values: applyConfigFlags(bundlePairsForServer, bundle.schema, `${bundle.serverName}.`),
            },
          ]
        : [];
    });
    if (declaredConfig && pluginValues)
      await savePluginOptions(marketplaceSource(marketplace), pluginValues, declaredConfig, storageV5);
    for (let { bundle, values } of flattened) {
      await saveMcpServerUserConfig(
        marketplace.repository,
        bundle.serverName,
        values,
        bundle.schema,
        storageV5,
      );
      bundle.existingConfig =
        (await loadMcpServerUserConfig(marketplace.repository, bundle.serverName)) ?? {};
    }
  }
  let notes = [];
  if (declaredConfig) {
    let keys = Object.keys(await getUnconfiguredOptions(marketplace));
    if (keys.length > 0) {
      let filtered = keys.filter((key) => declaredConfig[key]?.required === true);
      notes.push(
        `${keys.length} userConfig ${plural(keys.length, "option")} not yet set` +
          (filtered.length > 0 ? ` (${filtered.length} required)` : "") +
          ` \u2014 run /plugin configure ${pluginArg} in Claude Code, or pass --config KEY=VALUE.`,
      );
    }
  }
  if (marketplace.enabled)
    for (let bundle of bundles) {
      let message = missingConfigMessage(bundle, marketplace.name);
      if (message) notes.push(message);
    }
  return notes.join(`
`);
}
//@ chunk-h30gsc89.js:11587-12752 layout
/**
 * 安装 command 来源插件前展示将运行的命令并征得同意（-y/--yes 或 --accept-command）；策略禁用 command 来源时直接拒绝。
 */
async function confirmCommandSourceInstall(
  pluginId,
  pluginEntry,
  { yes = false, acceptedCommand, acceptCommand, onShown, storageV5 } = {},
) {
  if (typeof pluginEntry.source !== "object" || pluginEntry.source.source !== "command") return;
  if (areCommandPluginSourcesDisabledByPolicy()) {
    writeToStdout(`${commandPluginSourcesDisabledMessage()}
`);
    return;
  }
  if (pluginEntry.source.mode === "link" && getPlatform() === "windows") {
    writeToStdout(`${LINK_MODE_UNSUPPORTED_ON_WINDOWS_MESSAGE}
`);
    return;
  }
  let command = pluginEntry.source.command;
  let grantKey = describeCommandOutputMode(pluginEntry.source);
  if (acceptedCommand === grantKey && !isPluginsDirOnLocalDisk()) return;
  let shown = {
    kind: "command_source",
    pluginId,
    command,
    mode: pluginEntry.source.mode === "link" ? "link" : "copy",
    catalogRevision: await marketplaceRevision(pluginId, storageV5),
  };
  onShown?.({
    ...withAcceptMatch(shown, acceptCommand),
    ...(acceptedCommand !== undefined && {
      previousAcceptance: acceptedCommand !== grantKey ? "changed" : "unreliable",
    }),
  });
  let { name: pluginName, marketplace } = parsePluginIdentifier(pluginId);
  let printablePluginName = printableName(pluginName ?? "", 200);
  let printableMarketplace = printableName(marketplace ?? "", 200);
  let disclosure =
    `"${printablePluginName}" is installed by running a command from marketplace "${printableMarketplace}" on this machine` +
    (acceptedCommand === undefined
      ? ""
      : acceptedCommand !== grantKey
        ? " \u2014 and that command (or how its output is used) CHANGED since you accepted it"
        : " \u2014 your earlier acceptance is recorded where it cannot be relied on (a plugins root inside a workspace, on a network location, or one that could not be resolved), so please confirm it again") +
    `:
  ${command}
  (${describeCommandSourceMode(pluginEntry.source)})
`;
  writeToStdout(disclosure);
  let answer = await promptAcceptCommand({
    yes,
    acceptCommand,
    shown,
    disclosure,
  });
  return answer === "accepted"
    ? {
        kind: "accepted",
        grantKey,
      }
    : answer === "declined"
      ? {
          kind: "declined",
        }
      : undefined;
}
//@ chunk-h30gsc89.js:12752-13838 layout
async function promptAcceptCommand({ yes = false, acceptCommand, shown, disclosure = "" }) {
  let isTTY = process.stdout.isTTY && process.stdin.isTTY;
  if (yes || (shown !== undefined && matchesAcceptCommand(acceptCommand, shown))) {
    if (!isSpawnedByClaudeCodeSession()) return "accepted";
    if (!isTTY) {
      writeToStdout(`${yes ? "-y/--yes" : "--accept-command"} is ignored inside a Claude Code session: run this in your own terminal to accept the command shown above.
`);
      return "unconfirmed";
    }
  }
  if (
    !isTTY &&
    acceptCommand !== undefined &&
    shown !== undefined &&
    !matchesAcceptCommand(acceptCommand, shown)
  ) {
    writeToStdout(`--accept-command does not name the command shown above (it may have changed since it was shown), so it was not run. Show it to the person again before accepting it.
`);
    return "unconfirmed";
  }
  if (!isTTY) {
    writeToStdout(
      isSpawnedByClaudeCodeSession()
        ? `Not an interactive terminal, so the command was only displayed, not accepted. Run this in your own terminal (outside the Claude Code session) to confirm the command shown above.
`
        : `Not an interactive terminal, so the command was only displayed, not accepted. Re-run in a terminal to confirm it, or pass -y/--yes to accept the command shown above.
`,
    );
    return "unconfirmed";
  }
  return (await confirmPrompt("Run this command now?", process.stdin, {
    ignoreAnswersWithinMs: MIN_CONFIRM_ANSWER_DELAY_MS,
    reaskPreamble: disclosure,
  }))
    ? "accepted"
    : "declined";
}
//@ chunk-h30gsc89.js:13838-14385 layout
/**
 * 解析 install 目标：补全市场名并取 marketplace 条目，供展示 command/headersHelper 披露。
 */
async function resolveInstallTarget(pluginArg, options = {}, storageV5) {
  if (parseNpmPluginId(pluginArg) !== null) return null;
  let { name: pluginName, marketplace } = parsePluginIdentifier(pluginArg);
  if (!pluginName) return null;
  let resolvedMarketplace = marketplace ?? options.resolvedMarketplace;
  if (!resolvedMarketplace)
    try {
      resolvedMarketplace = (await findPluginInMarketplaces(pluginName, storageV5))?.marketplace;
    } catch (error) {
      if (error instanceof CommandSourceError) return null;
      throw error;
    }
  if (!resolvedMarketplace) return null;
  let pluginId = `${pluginName}@${resolvedMarketplace}`;
  if (await hasOnlyMissingDependencyIssues(pluginId, options.scope ?? "user", storageV5)) return null;
  let helperSpec = await archiveFetchWarning(pluginId, undefined, storageV5);
  if (helperSpec === null) return null;
  let disclosure = `${archiveHelperDisclosure(helperSpec)}
`;
  writeToStdout(disclosure);
  let shown = await entryHelperTarget(helperSpec, pluginId, storageV5);
  options.onShown?.(withAcceptMatch(shown, options.acceptCommand));
  let answer = await promptAcceptCommand({
    yes: options.yes,
    acceptCommand: options.acceptCommand,
    shown,
    disclosure,
  });
  return answer === "accepted" ? helperSpec : answer;
}
//@ chunk-h30gsc89.js:14385-15766 layout
/**
 * 已安装插件的市场条目改成 command 来源时，检查并提示需要显式同意后再更新。
 */
async function checkCommandSourceSwitch(pluginArg, options = {}, storageV5) {
  if (parseNpmPluginId(pluginArg) !== null) return;
  let { name: pluginName, marketplace } = parsePluginIdentifier(pluginArg);
  if (!pluginName) return;
  let knownMarketplaces = await loadKnownMarketplacesSafe(storageV5);
  let resolvedMarketplace = marketplace;
  let foundEntry;
  if (!resolvedMarketplace) {
    let found;
    try {
      found = await findPluginInMarketplaces(pluginName, storageV5);
    } catch (error) {
      if (error instanceof CommandSourceError) return;
      throw error;
    }
    if (!found) return;
    resolvedMarketplace = found.marketplace;
    foundEntry = found.entry;
    options.onResolvedMarketplace?.(resolvedMarketplace);
  }
  let marketplaceConfig = ownPropertyOrUndefined(knownMarketplaces, resolvedMarketplace);
  if (isSourceDisallowedOrUnverifiable(marketplaceConfig?.source)) return;
  let pluginId = `${pluginName}@${resolvedMarketplace}`;
  let plugin =
    foundEntry && options.acceptCommand === undefined
      ? {
          entry: foundEntry,
        }
      : undefined;
  if (!plugin) {
    let refreshResult = await refreshBeforeScopedInstall(resolvedMarketplace, marketplaceConfig, storageV5);
    options.onMarketplaceRefreshResult?.(refreshResult);
    try {
      plugin = await getPluginById(pluginId, storageV5);
    } catch (error) {
      if (error instanceof CommandSourceError) return;
      throw error;
    }
  }
  let sourceSpec = plugin ? commandSourceSpecOf(plugin.entry.source) : undefined;
  if (!plugin || !sourceSpec) return;
  let installations =
    (isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync()
    ).plugins[pluginId] ?? [];
  let outputMode = describeCommandOutputMode(sourceSpec);
  let onNetworkRoot = !isPluginsDirOnLocalDisk();
  let alreadyAccepted =
    onNetworkRoot && installations.some((installation) => installation.sourceCommand === outputMode);
  if (await isPluginEnabledAndCachedAtScope(pluginId, options.scope ?? "user", storageV5)) {
    if (!alreadyAccepted) {
      let all = installations.every((installation) => installation.sourceCommand === undefined);
      writeToStdout(
        `"${printableName(parsePluginIdentifier(pluginId).name ?? "", 200)}" is already installed, and its marketplace ` +
          (all
            ? "entry now installs it by running a command on this machine that has not been reviewed yet."
            : "has since changed the command that installs it (or how its output is used).") +
          ` Review and accept it: ${runCommandHint("plugin update", pluginId, {
            extra: (options.scope ?? "user") === "user" ? undefined : `--scope ${options.scope}`,
            fallback: "an explicit plugin update reviews it",
          })}.
`,
      );
    }
    return;
  }
  if (alreadyAccepted)
    return {
      kind: "accepted",
      grantKey: outputMode,
    };
  return confirmCommandSourceInstall(pluginId, plugin.entry, {
    yes: options.yes,
    acceptedCommand: onNetworkRoot
      ? installations.find((installation) => installation.sourceCommand !== undefined)?.sourceCommand
      : undefined,
    acceptCommand: options.acceptCommand,
    onShown: options.onShown,
    storageV5,
  });
}
//@ chunk-h30gsc89.js:15766-17243 callgraph-fingerprint (2.1.88 match: installPlugin, 0.273)
/**
 * claude plugin install：调用 installPluginOp，打印结果与依赖/警告，记 tengu_plugin_installed_cli。
 */
async function installPlugin(
  pluginArg,
  scope = "user",
  configArgs,
  shownSourceCommand,
  shownEntryHelper,
  storageV5,
  announceRefreshResult,
  options = {},
) {
  let gitFallbackNotes = [];
  try {
    let result = await installPluginOp(
      options.resolvedPlugin ?? pluginArg,
      scope,
      {
        shownSourceCommand,
        shownEntryHelper,
        announceRefreshResult,
        replaceInstalledCopy: options.replaceInstalledCopy,
        npmRegistry: options.npmRegistry,
        gitHubHttpsFallback: sshCloneFallback((note) => {
          gitFallbackNotes.push(note);
        }),
      },
      storageV5,
    );
    if (!result.success) throw new PluginOperationFailedError(result.message, result);
    let pluginId = result.pluginId || pluginArg;
    let scope_2 = result.scope || scope;
    logEvent("tengu_plugin_installed_cli", {
      ...(await pluginTelemetryFields(pluginId, policyEnabledPluginNameSet(), storageV5)),
      plugin_id: pluginIdForTelemetry(pluginId),
      scope: fromEnum(scope_2),
      install_source: lit("cli-explicit"),
      ...buildPluginVersionShaField(
        pluginId,
        getInstalledGitCommitSha(pluginId, {
          scope: scope_2,
        }),
      ),
      ...directoryInstallFields({
        pluginId,
        surface: "cli",
        replaced: result.switched !== undefined,
      }),
      ...(result.aliasedId
        ? {
            aliased_id: true,
            ...(result.reenabled && {
              reenabled: true,
            }),
          }
        : {}),
    });
    let configNote = "";
    let configApplied = configArgs && configArgs.length > 0 ? true : undefined;
    try {
      if (result.nothingWritten) {
        if (configApplied) {
          configNote = `${figures_default.warning} --config values were not saved, because this command changed nothing. To set them, run /plugin configure ${result.pluginId || pluginArg} in Claude Code.`;
          configApplied = false;
        }
      } else configNote = await configurePluginFromFlags(result.pluginId || pluginArg, configArgs, storageV5);
    } catch (error) {
      let errorText = errorMessage(error);
      logForDebugging(`post-install userConfig step failed: ${errorText}`, {
        level: "warn",
      });
      if (configArgs && configArgs.length > 0) {
        configNote = `${figures_default.warning} Installed, but --config not applied: ${errorText}`;
        configApplied = false;
      }
    }
    let message = withSettingsWarning(
      [result.message, ...gitFallbackNotes, ...(configNote ? [configNote] : [])].join(`
`),
      result.scope ?? scope,
    );
    if (options.json)
      await writePluginResult({
        command: "install",
        outcome: "ok",
        plugin: pluginArg,
        pluginId: result.pluginId,
        scope: result.scope || scope,
        message: stripInvisibleKeepNewlines(message),
        configApplied,
        installedVersion: result.installedVersion,
        availableVersion: result.availableVersion,
      });
    return message;
  } catch (error) {
    return handlePluginCommandError(
      error,
      "install",
      pluginArg,
      storageV5,
      options.json
        ? {
            scope,
            shownCommand: options.shownCommand,
          }
        : undefined,
      error instanceof PluginOperationFailedError && error.result.aliasedId
        ? error.result.pluginId
        : undefined,
      gitFallbackNotes,
    );
  }
}
//@ chunk-h30gsc89.js:17243-17396 layout
async function findOrphanedAutoInstalls(scope, storageV5) {
  let projectPathForScope = getProjectPathForScope(scope);
  let { enabled, disabled } = await loadAllPluginsCacheOnly(isStorageV5Enabled() ? storageV5 : undefined);
  return findOrphanedAutoDependencies(
    (isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync()
    ).plugins,
    [...enabled, ...disabled],
    scope,
    projectPathForScope,
  );
}
//@ chunk-h30gsc89.js:17396-17847 layout
/**
 * 把 CLI 参数里的插件名解析成实际插件 ID（别名、已安装副本），返回 {plugin, aliased}。
 */
async function resolvePluginArgument(
  pluginArg,
  json,
  storageV5,
  { unlessNamedInSettings = false, unlessDirectoryNameHeld = false } = {},
) {
  {
    let installed = await installSelectedPlugins(pluginArg, storageV5);
    if (installed && !(unlessNamedInSettings && isPluginInSettings(pluginArg))) {
      if (unlessDirectoryNameHeld && isOfficialPluginDirectoryId(pluginArg)) {
        let bindings = await bindingsWithReadFailure().catch(() => {
          return;
        });
        if (
          bindings === undefined ||
          isUnreadableBindings(bindings) ||
          findBindingKeysFor(bindings.keys(), pluginArg).length > 0
        )
          return {
            plugin: pluginArg,
            aliased: false,
          };
      }
      let pluginId = installed.installed.pluginId;
      if (!json)
        writeToStdout(`${stripInvisibleKeepEmoji(`"${quotedPrintable(pluginArg, 120)}" is installed as ${pluginId} (the same plugin from ${marketplaceDisplayName(parsePluginIdentifier(pluginId).marketplace ?? "")}).`)}
`);
      return {
        plugin: pluginId,
        aliased: true,
      };
    }
  }
  return {
    plugin: pluginArg,
    aliased: false,
  };
}
//@ chunk-h30gsc89.js:17847-18946 fingerprint (2.1.88 match: uninstallPlugin, 0.306)
/**
 * claude plugin uninstall：解析插件名，调用 uninstallPluginOp，记 tengu_plugin_uninstalled_cli。
 */
async function uninstallPlugin(
  pluginArg,
  scope = "user",
  keepData = false,
  prune = false,
  yes = false,
  storageV5,
  options = {},
) {
  let argument = {
    plugin: pluginArg,
    aliased: false,
  };
  try {
    argument = await resolvePluginArgument(pluginArg, options.json, storageV5, {
      unlessDirectoryNameHeld: true,
    });
    let result = await uninstallPluginOp(argument.plugin, scope, !keepData, storageV5);
    if (!result.success) throw new PluginOperationFailedError(result.message, result);
    await logEventAsync("tengu_plugin_uninstalled_cli", {
      ...(await pluginTelemetryFields(
        result.pluginId || argument.plugin,
        policyEnabledPluginNameSet(),
        storageV5,
      )),
      scope: fromEnum(result.scope || scope),
      ...(argument.aliased
        ? {
            aliased_id: true,
          }
        : {}),
      ...(result.savedKept !== undefined && {
        saved_kept: true,
      }),
    });
    let pruned = false;
    let writeResult = async (message) => {
      if (options.json)
        await writePluginResult({
          command: "uninstall",
          outcome: "ok",
          plugin: pluginArg,
          pluginId: result.pluginId,
          scope: result.scope || scope,
          keptData: result.dataDirKept ?? keepData,
          ...(result.savedKept !== undefined && {
            savedKept: result.savedKept.reason,
          }),
          message: stripInvisibleKeepNewlines(message),
        });
      return message;
    };
    try {
      let orphanedAutoInstalls = await findOrphanedAutoInstalls(scope, storageV5);
      if (prune) {
        writeToStdout(`${figures_default.tick} ${stripInvisibleKeepEmoji(result.message)}
`);
        pruned = true;
        return await pruneOrphanedPlugins(
          orphanedAutoInstalls,
          scope,
          {
            dryRun: false,
            yes,
            deleteDataDir: !keepData,
          },
          storageV5,
        );
      }
      return writeResult(
        result.message + formatOrphanedDependenciesNotice(orphanedAutoInstalls.orphans, scope),
      );
    } catch (error) {
      logError(
        withTelemetryMessage(
          toError(error),
          "claude plugin uninstall: post-uninstall orphan scan or prune failed",
        ),
      );
      let pruneNote = `(${prune ? "prune" : "orphan scan"} failed: ${errorMessage(error)})`;
      if (pruned) return pruneNote;
      let message = prune ? `${figures_default.tick} ${result.message}` : result.message;
      return writeResult(`${message}
${pruneNote}`);
    }
  } catch (error) {
    return handlePluginCommandError(
      error,
      "uninstall",
      pluginArg,
      storageV5,
      options.json
        ? {
            scope,
          }
        : undefined,
      argument.aliased ? argument.plugin : undefined,
    );
  }
}
//@ chunk-h30gsc89.js:18946-19116 layout
/**
 * claude plugin prune：找出作用域内不再被任何插件依赖的自动安装（auto）插件并卸载（可 --dry-run）。
 */
async function prunePluginsCli(scope = "user", { dryRun = false, yes = false } = {}, storageV5) {
  try {
    let orphanedAutoInstalls = await findOrphanedAutoInstalls(scope, storageV5);
    return await pruneOrphanedPlugins(
      orphanedAutoInstalls,
      scope,
      {
        dryRun,
        yes,
        deleteDataDir: true,
      },
      storageV5,
    );
  } catch (error) {
    return handlePluginCommandError(error, "prune");
  }
}
//@ chunk-h30gsc89.js:19116-20352 layout
async function pruneOrphanedPlugins(orphanedAutoInstalls, scope, options, storageV5) {
  if (orphanedAutoInstalls.unloadable.length > 0)
    return `Skipped \u2014 cannot determine orphans: ${orphanedAutoInstalls.unloadable.map(stripInvisibleKeepEmoji).join(", ")} failed to load. Fix or uninstall, then retry.`;
  if (orphanedAutoInstalls.orphans.size === 0)
    return orphanedAutoInstalls.autoCount === 0
      ? `Nothing to prune (no auto-installed plugins at ${scope} scope).`
      : `Nothing to prune (${orphanedAutoInstalls.autoCount} auto-installed ${plural(orphanedAutoInstalls.autoCount, "plugin", "plugins")} at ${scope} scope, all still needed).`;
  let plugins = (
    isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync()
  ).plugins;
  let projectPathForScope = getProjectPathForScope(scope);
  let mapped = [...orphanedAutoInstalls.orphans].map((orphan) => {
    let installation = installationAtTarget(plugins[orphan], scope, projectPathForScope);
    return `  ${stripInvisibleKeepEmoji(orphan)}${installation?.version ? ` (${stripInvisibleKeepEmoji(installation.version)})` : ""}`;
  });
  let summary = `${orphanedAutoInstalls.orphans.size} auto-installed ${plural(orphanedAutoInstalls.orphans.size, "plugin", "plugins")} no longer needed at ${scope} scope:
${mapped.join(`
`)}`;
  if (options.dryRun)
    return `${summary}
(dry run \u2014 nothing removed)`;
  if (!options.yes) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      let scopeFlag = scope === "user" ? "" : ` --scope ${scope}`;
      return `${summary}
Not a TTY \u2014 run \`claude plugin prune${scopeFlag} -y\` to remove.`;
    }
    writeToStdout(`${summary}
`);
    if (!(await confirmPrompt("Remove?"))) return "Aborted.";
  }
  let removed = await pruneOrphanedAutoDeps(
    orphanedAutoInstalls.orphans,
    scope,
    projectPathForScope,
    {
      deleteDataDir: options.deleteDataDir,
    },
    storageV5,
  );
  await logEventAsync("tengu_plugin_prune_cli", {
    scope: fromEnum(scope),
    removed_count: removed.length,
  });
  return `Removed ${removed.length} auto-installed ${plural(removed.length, "plugin", "plugins")}: ${removed.map((pluginId) => stripInvisibleKeepEmoji(parsePluginIdentifier(pluginId).name)).join(", ")}`;
}
//@ chunk-h30gsc89.js:20352-20927 fingerprint (2.1.88 match: disablePlugin, 0.565)
/**
 * claude plugin disable：调用 disablePluginOp 并输出结果。
 */
async function disablePlugin(pluginArg, scope, storageV5, options = {}) {
  let argument = {
    plugin: pluginArg,
    aliased: false,
  };
  try {
    argument = await resolvePluginArgument(pluginArg, options.json, storageV5, {
      unlessNamedInSettings: true,
    });
    let result = await disablePluginOp(argument.plugin, scope, storageV5);
    if (!result.success) throw new PluginOperationFailedError(result.message, result);
    await logEventAsync("tengu_plugin_disabled_cli", {
      ...(await pluginTelemetryFields(
        result.pluginId || argument.plugin,
        policyEnabledPluginNameSet(),
        storageV5,
      )),
      scope: fromEnumOpt(result.scope),
      ...(argument.aliased
        ? {
            aliased_id: true,
          }
        : {}),
    });
    let message = withSettingsWarning(result.message, result.scope ?? scope);
    if (options.json)
      await writePluginResult({
        command: "disable",
        outcome: "ok",
        plugin: pluginArg,
        pluginId: result.pluginId,
        scope: result.scope ?? scope,
        message: stripInvisibleKeepNewlines(message),
      });
    return `${figures_default.tick} ${message}`;
  } catch (error) {
    return handlePluginCommandError(
      error,
      "disable",
      pluginArg,
      storageV5,
      options.json
        ? {
            scope,
          }
        : undefined,
      argument.aliased ? argument.plugin : undefined,
    );
  }
}
//@ chunk-h30gsc89.js:20927-21247 fingerprint (2.1.88 match: disableAllPlugins, 0.738)
/**
 * claude plugin disable --all：禁用全部可禁用插件（组织要求的插件除外）。
 */
async function disableAllPlugins(storageV5, options = {}) {
  try {
    let result = await listRequiredPlugins(storageV5);
    if (!result.success) throw new PluginOperationFailedError(result.message, result);
    await logEventAsync("tengu_plugin_disabled_all_cli", {});
    if (options.json)
      await writePluginResult({
        command: "disable",
        outcome: "ok",
        all: true,
        message: stripInvisibleKeepNewlines(result.message),
      });
    return `${figures_default.tick} ${result.message}`;
  } catch (error) {
    return handlePluginCommandError(
      error,
      "disable-all",
      undefined,
      undefined,
      options.json ? {} : undefined,
    );
  }
}
//@ chunk-h30gsc89.js:21247-23019 fingerprint (2.1.88 match: updatePluginCli, 0.378)
/**
 * claude plugin update：检查并更新插件（显式模式，处理 headersHelper/command 来源确认），输出版本变化。
 */
async function updatePluginCli(
  pluginArg,
  scope,
  { yes = false, json = false, acceptCommand } = {},
  storageV5,
) {
  let pluginId;
  let pendingShown;
  let argument = {
    plugin: pluginArg,
    aliased: false,
  };
  try {
    argument = await resolvePluginArgument(pluginArg, json, storageV5);
    if (!json)
      writeToStdout(`${stripInvisibleKeepEmoji(`Checking for updates for plugin "${argument.plugin}"${scope ? ` at ${scope} scope` : ""}\u2026`)}
`);
    let result = await updatePluginOp(
      argument.plugin,
      scope,
      {
        explicit: true,
        onEntryHelperDisclosure: async (disclosure, helper, pluginId) => {
          writeToStdout(`${disclosure}
`);
          let shown = await entryHelperTarget(helper, pluginId, storageV5);
          let answer = await promptAcceptCommand({
            yes,
            acceptCommand,
            shown,
            disclosure: `${disclosure}
`,
          });
          pendingShown = answer === "accepted" ? undefined : withAcceptMatch(shown, acceptCommand);
          return answer;
        },
        announceCommandSource: async (pluginId, pluginEntry, acceptedCommand) => {
          let confirmation = await confirmCommandSourceInstall(pluginId, pluginEntry, {
            yes,
            acceptedCommand,
            acceptCommand,
            onShown: (shown) => {
              pendingShown = shown;
            },
            storageV5,
          });
          if (confirmation?.kind === "accepted") pendingShown = undefined;
          if (confirmation?.kind === "declined")
            throw new CommandSourceError(
              "Aborted \u2014 the command was not run.",
              "plugin command source declined at the prompt",
            );
          return confirmation?.grantKey;
        },
      },
      storageV5,
    );
    let message = stripInvisibleKeepEmoji(result.message);
    pluginId = result.pluginId;
    let { outcome } = result;
    if (outcome === "failed") {
      if (result.failureCode !== undefined && isSadFailureCode(result.failureCode))
        throw new CommandSourceError(message, `${COMMAND_SOURCE_NETWORK_ERRORS}${result.failureCode}`);
      throw new PluginOperationFailedError(message, {
        failureCode: result.failureCode,
        pluginId: result.pluginId,
      });
    }
    if (json)
      await writePluginResult({
        command: "update",
        outcome: "ok",
        plugin: pluginArg,
        pluginId: result.pluginId,
        scope: result.scope ?? scope,
        message,
        updateOutcome: outcome,
        oldVersion: result.oldVersion,
        newVersion: result.newVersion,
        skipReason: result.skipReason,
        blockedBy: result.blockedBy,
        refreshFailed: result.refreshFailed,
        refreshRefusedByPolicy: result.refreshRefusedByPolicy,
      });
    else {
      if (result.folderNote !== undefined)
        writeToStdout(`${stripInvisibleKeepEmoji(result.folderNote)}
`);
      writeToStdout(`${figures_default.tick} ${message}
`);
    }
    if (result.outcome === "updated") {
      let resolvedId = result.pluginId || argument.plugin;
      logEvent("tengu_plugin_updated_cli", {
        ...(await pluginTelemetryFields(resolvedId, policyEnabledPluginNameSet(), storageV5)),
        old_version: sanitizeVersion(result.oldVersion),
        new_version: sanitizeVersion(result.newVersion),
        ...buildPluginVersionShaField(resolvedId, result.gitCommitSha),
        ...(argument.aliased
          ? {
              aliased_id: true,
            }
          : {}),
      });
    }
    if (argument.aliased)
      await logFeatureOkAsync("cli_plugin_update", {
        aliased_id: true,
      });
    else await logFeatureOkAsync("cli_plugin_update");
    await gracefulShutdown(0);
  } catch (error) {
    return handlePluginCommandError(
      error,
      "update",
      pluginArg,
      storageV5,
      json
        ? {
            scope,
            pluginId,
            shownCommand: pendingShown,
          }
        : undefined,
      argument.aliased ? argument.plugin : undefined,
    );
  }
}
export {
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
  readResultNonce_2,
  describeMcpbSourceError,
};
