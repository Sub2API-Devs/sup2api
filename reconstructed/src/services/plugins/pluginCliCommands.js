/**
 * services/plugins/pluginCliCommands.ts
 *
 * 并入已有模块：`claude plugin` 子命令的配置参数解析、结果输出与错误类。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/plugins/pluginCliCommands.ts
 * pieces: chunk-12wyw8h8.js (43)
 * attribution: placement 22, layout 15, fingerprint 5, callgraph-fingerprint 1
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
import { logForDebugging } from "../../utils/debug.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  withTelemetryMessage,
  toError,
} from "../../utils/errors.js";
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
import { getUserBucket } from "../analytics/datadog.js";
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

//@ chunk-12wyw8h8.js:1926-2128 placement
function mcpbSourcesOf(marketplace) {
  let mcpServers = marketplace.manifest.mcpServers;
  let filtered = (
    typeof mcpServers === "string" ? [mcpServers] : Array.isArray(mcpServers) ? mcpServers : []
  ).filter((f) => typeof f === "string" && isMcpbSource(f));
  let filtered_2 = filtered.filter((f) => isLocalMcpbSource(f));
  return {
    local: filtered_2,
    remoteCount: filtered.length - filtered_2.length,
  };
}
//@ chunk-12wyw8h8.js:2128-2624 placement
/**
 * 安装插件后读取其捆绑的 MCPB 服务器：并行加载每个本地包，收集需要配置的服务器（名称、配置 schema、已有配置），读不出的包单独列出。
 */
async function readBundledServerConfigs(marketplace, local, r) {
  let results = await Promise.all(
    local.map(async (m) => {
      try {
        let result = await loadMcpbFile(
          m,
          marketplace.path,
          marketplace.repository,
          undefined,
          undefined,
          true,
          r,
        );
        return {
          spec: m,
          result,
        };
      } catch (error) {
        logForDebugging(`post-install bundle read failed for ${m}: ${errorMessage(error)}`, {
          level: "warn",
        });
        return {
          spec: m,
          result: undefined,
        };
      }
    }),
  );
  let f = new Map();
  let o = [];
  for (let { spec, result: u } of results)
    if (!u) o.push(spec);
    else if ("status" in u)
      f.set(u.manifest.name, {
        serverName: u.manifest.name,
        schema: u.configSchema,
        existingConfig: u.existingConfig,
      });
  return {
    bundles: [...f.values()],
    unreadable: o,
  };
}
//@ chunk-12wyw8h8.js:2624-2828 placement
function parseConfigPair(e) {
  let index = e.indexOf("=");
  if (index <= 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `--config expects KEY=VALUE, got "${e}". Use --config key=value (repeatable).`,
      "--config pair has no key",
    );
  return {
    key: e.slice(0, index),
    raw: e.slice(index + 1),
  };
}
//@ chunk-12wyw8h8.js:2828-4153 placement
function splitPluginConfigArgs(e, n, bundles, p) {
  let f = [];
  let o = new Map();
  for (let m of e) {
    let { key, raw } = parseConfigPair(m);
    if (n && Object.hasOwn(n, key)) {
      f.push(m);
      continue;
    }
    let flattened = bundles.flatMap(({ serverName, schema }) => {
      let S = [];
      let P = `${serverName}.`;
      if (key.startsWith(P) && Object.hasOwn(schema, key.slice(P.length)))
        S.push({
          serverName,
          field: key.slice(P.length),
          bare: false,
        });
      if (Object.hasOwn(schema, key))
        S.push({
          serverName,
          field: key,
          bare: true,
        });
      return S;
    });
    let [h, ...v] = flattened;
    if (h && v.length === 0) {
      if (h.bare && p.unreadable.length + p.remoteCount > 0)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `--config key "${key}" must name its server, because a bundled MCP server whose keys are unknown may declare it too; use ${printableName(`${h.serverName}.${h.field}`)}.` +
            unconfigurableBundlesNote(p),
          "--config bare key with an unread bundled server",
        );
      let y = o.get(h.serverName) ?? [];
      y.push(`${h.field}=${raw}`);
      o.set(h.serverName, y);
      continue;
    }
    if (h)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `--config key "${key}" is declared by more than one bundled MCP server; use ${flattened.map((y) => printableName(`${y.serverName}.${y.field}`)).join(" or ")}.`,
        "--config key is ambiguous between bundled servers",
      );
    let w = [
      ...Object.keys(n ?? {}),
      ...bundles.flatMap(({ serverName, schema }) =>
        Object.keys(schema).map((key) => printableName(`${serverName}.${key}`)),
      ),
    ];
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `--config key "${key}" isn't declared in this plugin's userConfig` +
        (bundles.length > 0 ? " or by its bundled MCP servers." : ".") +
        (w.length > 0 ? ` Known keys: ${w.join(", ")}.` : "") +
        unconfigurableBundlesNote(p),
      "--config key is not declared",
    );
  }
  return {
    pluginPairs: f,
    bundlePairs: o,
  };
}
//@ chunk-12wyw8h8.js:4153-4622 placement
/**
 * 生成"部分捆绑服务器无法用 --config 配置"的括注：读不出的本地包，以及启动时从 URL 拉取、只能在 Claude Code 里配置的远程包。
 */
function unconfigurableBundlesNote({ unreadable, remoteCount }) {
  let r = [];
  if (unreadable.length > 0)
    r.push(
      `the bundled ${unreadable.map((f) => quotedPrintable(f)).join(", ")} could not be read, so its keys are unknown \u2014 re-run with --debug-file <path> to log why`,
    );
  if (remoteCount > 0)
    r.push(
      `${remoteCount} bundled ${plural(remoteCount, "server is", "servers are")} fetched from a URL at session start and can only be configured in Claude Code (/plugin \u2192 Installed \u2192 Configure)`,
    );
  let joined = r.join("; ");
  return joined ? ` (${joined[0].toUpperCase()}${joined.slice(1)}.)` : "";
}
//@ chunk-12wyw8h8.js:4622-5188 placement
/**
 * 检查捆绑 MCP 服务器的配置是否完整，不完整时返回提示：列出缺少的必填键或校验错误，并说明可用 --config KEY=VALUE 或在 /plugin 中配置。
 */
function missingConfigMessage(bundle, pluginId) {
  let validation = validateUserConfig(bundle.existingConfig, bundle.schema);
  if (validation.valid) return;
  let serverLabel = printableName(bundle.serverName);
  let mapped = Object.entries(bundle.schema)
    .filter(([key, value]) => {
      let g = getOwn(bundle.existingConfig, key);
      return value.required === true && (g === undefined || g === "");
    })
    .map(([key]) => printableName(`${serverLabel}.${key}`));
  let fixHint =
    mapped.length > 0
      ? `set ${mapped.join(", ")} with --config KEY=VALUE`
      : `${validation.errors.map((error) => printableName(error)).join("; ")} \u2014 fix it with --config ${serverLabel}.KEY=VALUE`;
  return `MCP server "${quotedPrintable(bundle.serverName)}" needs configuration before it can start: ${fixHint}, or in Claude Code run /plugin, select "${quotedPrintable(pluginId)}" in the Installed tab, and choose Configure.`;
}
//@ chunk-12wyw8h8.js:5221-5296 placement
function withSettingsWarning(message, n) {
  let r = settingsFileWarning(n);
  return r === null
    ? message
    : `${message}
${figures_default.warning} ${r}`;
}
//@ chunk-12wyw8h8.js:5296-6136 placement
function settingsFileWarning(e) {
  try {
    if (e === undefined || e === "managed") return null;
    let n = scopeToSettingSource(e);
    let settingsFilePathForSource = getSettingsFilePathForSource(n);
    if (
      settingsFilePathForSource === undefined ||
      (n === "userSettings" && basename(settingsFilePathForSource) === USER_SETTINGS_FILE_NAMES.cowork)
    )
      return null;
    if (isWorkspaceRestrictedSource(n) || (n !== "userSettings" && isSuspectLink(settingsFilePathForSource)))
      return null;
    let filtered = getSettingsParseErrorsForSource(n).filter(
      (u) => u.file === settingsFilePathForSource && u.severity !== "warning",
    );
    let [f] = filtered;
    if (f === undefined) return null;
    let o = filtered.length - 1;
    let m =
      f.path !== ""
        ? `its "${quotedPrintable(f.path, 80)}" ${o > 0 ? `and ${o} other ${plural(o, "value")} are` : "is"} not valid`
        : f.errorClass === "unreadable"
          ? "it could not be read"
          : "it is not a JSON object";
    return `${printableOrEmpty(settingsFilePathForSource)} does not load (${m}), so Claude Code ignores the whole file, including anything this command wrote there. Fix the file, then run this command again if its change is missing. If a newer Claude Code wrote the file, update Claude Code instead.`;
  } catch (error) {
    logForDebugging(`settings file check after a plugin command skipped: ${errorMessage(error)}`, {
      level: "warn",
    });
    return null;
  }
}
//@ chunk-12wyw8h8.js:6136-6616 placement
class PluginOperationFailedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  result;
  pluginCommandErrorCategory;
  constructor(message, n = {}) {
    super(message, "plugin operation returned a failure result");
    this.name = "PluginOperationFailedError";
    this.result = n;
    if (
      n.failureCode === "invalid_plugin_id" ||
      n.failureCode === "plugin_folder_held" ||
      n.failureCode === "install_records_unreadable" ||
      n.failureCode === "directory_identity_changed" ||
      n.failureCode === "directory_binding_unreadable" ||
      n.failureCode === "directory_loaded"
    )
      this.pluginCommandErrorCategory = "validation";
  }
}
//@ chunk-12wyw8h8.js:6616-6832 placement
function installConfirmationDigest(e) {
  let n =
    e.kind === "command_source"
      ? [e.kind, e.pluginId, e.command, e.mode, e.catalogRevision]
      : [e.kind, e.pluginId, e.command, e.archiveUrl, e.catalogRevision];
  return createHash("sha256").update(jsonStringify(n), "utf8").digest("hex");
}
//@ chunk-12wyw8h8.js:6832-6874 placement
/**
 * 给安装确认对象补上 sha256 摘要。
 */
function withConfirmationDigest(e) {
  return {
    ...e,
    sha256: installConfirmationDigest(e),
  };
}
//@ chunk-12wyw8h8.js:6874-6945 placement
/**
 * 补上 “确认命令是否匹配” 的标记。
 */
function withAcceptMatch(e, n) {
  return n === undefined
    ? e
    : {
        ...e,
        acceptCommandMatched: matchesAcceptCommand(n, e),
      };
}
//@ chunk-12wyw8h8.js:6945-7087 placement
async function entryHelperTarget(e, pluginId, storageV5) {
  return {
    kind: "entry_helper",
    pluginId,
    command: e.command,
    archiveUrl: describeArchiveFetchCommand(e).destination,
    catalogRevision: await marketplaceRevision(pluginId, storageV5),
  };
}
//@ chunk-12wyw8h8.js:7087-7816 placement
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
        let u = runGitWithCeilingDirs(installLocation, {});
        let g = await execFileNoThrowWithCwd(gitExe(), [...u.inCheckoutArgs, "rev-parse", "HEAD"], {
          cwd: installLocation,
          env: u.env,
          stdin: "ignore",
        });
        return g.code === 0 ? `git:${g.stdout.trim()}` : unreadable;
      }
      if (seedDirFor(installLocation) === undefined) {
        let trimmed = (await readFile(join(installLocation, GCS_SHA_MARKER_FILE), "utf8")).trim();
        return /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(trimmed) ? `gcs:${trimmed}` : unreadable;
      }
    }
    return entry.source.source === "settings"
      ? `settings:${getUserBucket([await marketplaceManifestHash(installLocation), canonicalForm(entry.source)])}`
      : `sha256:${await marketplaceManifestHash(installLocation)}`;
  } catch {
    return unreadable;
  }
}
//@ chunk-12wyw8h8.js:7816-8193 placement
/**
 * 计算插件市场清单的规范化哈希：读取 .claude-plugin/marketplace.json（或文件本身）与 package.json，键排序后取 sha256。
 */
async function marketplaceManifestHash(installLocation) {
  let n = (error) => ["ENOENT", "ENOTDIR"].includes(getErrnoCode(error) ?? "");
  let r;
  let p = true;
  try {
    r = await readFile(join(installLocation, ".claude-plugin", "marketplace.json"), "utf8");
  } catch (error) {
    if (!n(error)) throw error;
    r = await readFile(installLocation, "utf8");
    p = false;
  }
  let f = p
    ? await readFile(join(installLocation, "package.json"), "utf8").catch((error) => {
        if (n(error)) return null;
        throw error;
      })
    : null;
  return createHash("sha256")
    .update(
      jsonStringify([
        canonicalForm(jsonParse(stripBom(r))),
        f === null ? null : canonicalForm(jsonParse(stripBom(f))),
      ]),
      "utf8",
    )
    .digest("hex");
}
//@ chunk-12wyw8h8.js:8261-8420 placement
function canonicalForm(e) {
  if (Array.isArray(e)) return ["[", ...e.map(canonicalForm)];
  if (e !== null && typeof e === "object")
    return [
      "{",
      ...Object.keys(e)
        .sort()
        .map((key) => [key, canonicalForm(e[key])]),
    ];
  return e;
}
//@ chunk-12wyw8h8.js:8420-8486 placement
/**
 * 判断确认命令是否与摘要匹配。
 */
function matchesAcceptCommand(acceptCommand, shown) {
  return (
    acceptCommand !== undefined && acceptCommand.trim().toLowerCase() === installConfirmationDigest(shown)
  );
}
//@ chunk-12wyw8h8.js:8486-8631 placement
async function writePluginResult(e) {
  let n =
    e.failureCode !== undefined && UNCONFIRMED_INSTALL_CODES.has(e.failureCode)
      ? e
      : {
          ...e,
          shownCommand: undefined,
        };
  await writeStdoutAndDrain(
    escapeControlChars(
      jsonStringify({
        ...n,
        nonce: resultNonce.value,
      }),
    ) +
      `
`,
  );
}
//@ chunk-12wyw8h8.js:8631-8678 placement
/**
 * 保存结果 nonce 的槽位。
 */
var resultNonce = identity(
  {
    value: undefined,
  },
  (e) => {
    e.value = undefined;
  },
);
//@ chunk-12wyw8h8.js:8678-8708 placement
/**
 * 读取结果 nonce。
 */
function readResultNonce() {
  return resultNonce.value;
}
//@ chunk-12wyw8h8.js:8708-8802 placement
function readResultNonce_2() {
  resultNonce.value = env.CLAUDE_CODE_RESULT_NONCE || undefined;
  env.unset("CLAUDE_CODE_RESULT_NONCE");
}
//@ chunk-12wyw8h8.js:8802-8922 placement
var UNCONFIRMED_INSTALL_CODES = new Set([
  "command_source_refused",
  "command_source_declined",
  "entry_helper_unconfirmed",
  "entry_helper_declined",
]);
//@ chunk-12wyw8h8.js:8922-9121 layout
function getPluginCommandFailureCode(e, n) {
  if (e instanceof PluginOperationFailedError) return e.result.failureCode ?? "op_failed";
  if (e instanceof CommandSourceError && n === "update") {
    let telemetryMessage = e.telemetryMessage;
    if (telemetryMessage.startsWith(COMMAND_SOURCE_NETWORK_ERRORS))
      return telemetryMessage.slice(COMMAND_SOURCE_NETWORK_ERRORS.length);
  }
  return classifyPluginCommandError(e);
}
//@ chunk-12wyw8h8.js:9121-9248 layout
/**
 * 把插件命令错误归类为遥测 failureCode（插件操作错误码、claudeai_*、error_*）。
 */
function classifyPluginCommandError(e) {
  if (e instanceof CommandSourceError) return classifyCommandSourceError(e).code;
  if (e instanceof ClaudeAiMarketplaceError) return `claudeai_${e.code}`;
  return `error_${snakeCaseDashes(classifyPluginCommandError_2(e))}`;
}
//@ chunk-12wyw8h8.js:9248-9292 layout
function snakeCaseDashes(e) {
  return e.replaceAll("-", "_");
}
//@ chunk-12wyw8h8.js:9292-10539 layout
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
//@ chunk-12wyw8h8.js:10539-10606 layout
function appendLines(e, n) {
  return n.length === 0
    ? e
    : [e.trimEnd(), ...n].join(`
`);
}
//@ chunk-12wyw8h8.js:10606-12383 fingerprint = handlePluginCommandError (0.387)
/**
 * CLI 插件子命令的统一错误处理：打 tengu_plugin_command_failed 遥测（命令、作用域、failureCode 分类），JSON 模式输出结构化结果，否则打印错误并以非零退出。
 */
async function handlePluginCommandError(error, n, r, p, f, o, m = []) {
  let failureCode = error instanceof PluginOperationFailedError ? error.result.failureCode : undefined;
  let g = classifyPluginCommandError_2(error);
  let s = g === "unknown" && failureCode !== undefined ? (FAILURE_CODE_CATEGORY[failureCode] ?? g) : g;
  let h = n === "disable-all" ? "disable" : n === "prune" ? undefined : n;
  if (f && h) {
    let S = error instanceof PluginOperationFailedError ? error.result : {};
    await writePluginResult({
      command: h,
      outcome: "failed",
      ...(n === "disable-all"
        ? {
            all: true,
          }
        : {
            plugin: r,
          }),
      pluginId: S.pluginId ?? f.pluginId ?? o,
      scope: f.scope,
      message: stripInvisibleKeepNewlines(appendLines(errorMessage(error), m)),
      failureCode: getPluginCommandFailureCode(error, n),
      alreadyInGoalState: S.alreadyInGoalState,
      installedScope: S.installedScope,
      reverseDependents: S.reverseDependents,
      dependencies: S.dependencies,
      disableFirst: S.disableFirst,
      governingScope: S.governingScope,
      shownCommand: f.shownCommand && withConfirmationDigest(f.shownCommand),
    });
  }
  if (error instanceof CommandSourceError && (n === "install" || n === "update")) {
    console.error(stripInvisibleKeepNewlines(appendLines(errorMessage(error), m)));
    if (n === "install") {
      let { code, kind } = classifyCommandSourceError(error);
      if (kind === "bad") await logFeatureBadAsync("cli_plugin_install", code);
      else await logFeatureSadAsync("cli_plugin_install", code);
    } else if (n === "update")
      await logFeatureSadAsync("cli_plugin_update", getPluginCommandFailureCode(error, "update"));
    return exitAfterAnalyticsFlush(1);
  }
  let v = error instanceof ClaudeAiMarketplaceError ? `claudeai_${error.code}` : undefined;
  if (s === "unknown" && !(error instanceof PluginOperationFailedError) && v === undefined)
    logError(withTelemetryMessage(toError(error), UNCLASSIFIED_COMMAND_FAILURE[n]));
  else
    logForDebugging(`Plugin command "${n}" failed: ${errorMessage(error)}`, {
      level: "error",
    });
  let w = r ? `${n} plugin "${r}"` : n === "disable-all" ? "disable all plugins" : `${n} plugins`;
  console.error(
    stripInvisibleKeepNewlines(
      appendLines(`${figures_default.cross} Failed to ${w}: ${errorMessage(error)}`, m),
    ),
  );
  let y =
    v ??
    (failureCode !== undefined && (g === "unknown" || failureCode === "not_installed")
      ? failureCode
      : snakeCaseDashes(s));
  switch (n) {
    case "install":
      await logFeatureBadAsync("cli_plugin_install", y);
      break;
    case "uninstall":
      await logFeatureBadAsync("cli_plugin_uninstall", y);
      break;
    case "update":
      await logFeatureBadAsync("cli_plugin_update", y);
      break;
    case "enable":
      await logFeatureBadAsync("cli_plugin_enable", "cli_plugin_enable_failed");
      break;
    default:
      break;
  }
  let R = r ? await pluginTelemetryFields(o ?? r, policyEnabledPluginNameSet(), p) : {};
  await logEventAsync("tengu_plugin_command_failed", {
    command: fromEnum(n),
    error_category: fromEnum(s),
    ...{
      failure_code: fromEnumOpt(failureCode),
    },
    ...R,
    ...(o !== undefined
      ? {
          aliased_id: true,
        }
      : {}),
  });
  return exitAfterAnalyticsFlush(1);
}
//@ chunk-12wyw8h8.js:12383-13252 layout
function applyConfigFlags(e, n, r = "") {
  let p = {};
  for (let m of e) {
    let { key, raw } = parseConfigPair(m);
    let s = printableName(`${r}${key}`);
    let trimmed = (raw.split(/\r\n|\r|\n/, 1)[0] ?? "").trim();
    let v = Object.hasOwn(n, key) ? n[key] : undefined;
    if (!v) {
      let mapped = Object.keys(n).map((key) => printableName(`${r}${key}`));
      throw Error(
        `--config key "${s}" isn't declared in this plugin's userConfig.` +
          (mapped.length > 0 ? ` Known keys: ${mapped.join(", ")}.` : ""),
      );
    }
    if (trimmed === "") throw Error(`--config ${s}: value is empty. Omit the flag to leave "${s}" unset.`);
    if (v.type === "number") {
      let w = Number(trimmed);
      if (Number.isNaN(w)) throw Error(`--config ${s}: "${trimmed}" is not a number`);
      p[key] = w;
    } else if (v.type === "boolean") {
      let w = truthyOrFalsyEnv(trimmed);
      if (w === undefined)
        throw Error(`--config ${s}: "${trimmed}" is not a boolean (use true/false, 1/0, yes/no, on/off)`);
      p[key] = w;
    } else p[key] = trimmed;
  }
  let f = filterEntriesToNullProto(n, (m, u) => Object.hasOwn(p, u));
  let o = validateUserConfig(p, f);
  if (!o.valid)
    throw Error(`--config validation failed: ${o.errors.map((error) => printableName(error)).join("; ")}`);
  return p;
}
//@ chunk-12wyw8h8.js:13252-14713 layout
/**
 * claude plugin install --config key=value：安装后重新加载插件，按 manifest.userConfig 校验并保存这些选项。
 */
async function configurePluginFromFlags(e, n, r) {
  refreshPluginCaches(r);
  let { enabled, disabled } = await loadAllPlugins(r);
  let marketplace = findMarketplace([...enabled, ...disabled], e);
  let m = n ?? [];
  let u = m.length > 0;
  if (!marketplace) {
    if (u)
      throw Error(
        `--config was given but plugin "${e}" failed to load after install \u2014 run \`claude plugin list\` to see why.`,
      );
    return "";
  }
  let userConfig = marketplace.manifest.userConfig;
  let s = userConfig && Object.keys(userConfig).length > 0 ? userConfig : undefined;
  let any = m.map(parseConfigPair).some(({ key }) => !(s && Object.hasOwn(s, key)));
  let { local, remoteCount } = mcpbSourcesOf(marketplace);
  let { bundles, unreadable } =
    local.length > 0 && (marketplace.enabled || any)
      ? await readBundledServerConfigs(marketplace, local, r)
      : {
          bundles: [],
          unreadable: [],
        };
  let S = {
    unreadable,
    remoteCount,
  };
  if (u) {
    if (!s && bundles.length === 0)
      throw Error(
        `--config was given but plugin "${e}" declares no userConfig options` +
          (local.length > unreadable.length ? " and its bundled MCP servers declare no user_config." : ".") +
          unconfigurableBundlesNote(S),
      );
    let { pluginPairs, bundlePairs } = splitPluginConfigArgs(m, s, bundles, S);
    let U = s && pluginPairs.length > 0 ? applyConfigFlags(pluginPairs, s) : undefined;
    let flattened = bundles.flatMap((bundle) => {
      let L = bundlePairs.get(bundle.serverName);
      return L
        ? [
            {
              bundle,
              values: applyConfigFlags(L, bundle.schema, `${bundle.serverName}.`),
            },
          ]
        : [];
    });
    if (s && U) await savePluginOptions(marketplaceSource(marketplace), U, s, r);
    for (let { bundle, values } of flattened) {
      await saveMcpServerUserConfig(marketplace.repository, bundle.serverName, values, bundle.schema, r);
      bundle.existingConfig =
        (await loadMcpServerUserConfig(marketplace.repository, bundle.serverName)) ?? {};
    }
  }
  let P = [];
  if (s) {
    let keys = Object.keys(await getUnconfiguredOptions(marketplace));
    if (keys.length > 0) {
      let filtered = keys.filter((U) => s[U]?.required === true);
      P.push(
        `${keys.length} userConfig ${plural(keys.length, "option")} not yet set` +
          (filtered.length > 0 ? ` (${filtered.length} required)` : "") +
          ` \u2014 run /plugin configure ${e} in Claude Code, or pass --config KEY=VALUE.`,
      );
    }
  }
  if (marketplace.enabled)
    for (let bundle of bundles) {
      let A = missingConfigMessage(bundle, marketplace.name);
      if (A) P.push(A);
    }
  return P.join(`
`);
}
//@ chunk-12wyw8h8.js:14713-15879 layout
/**
 * 安装 command 来源插件前展示将运行的命令并征得同意（-y/--yes 或 --accept-command）；策略禁用 command 来源时直接拒绝。
 */
async function confirmCommandSourceInstall(
  pluginId,
  n,
  { yes: r = false, acceptedCommand: p, acceptCommand: f, onShown: o, storageV5 } = {},
) {
  if (typeof n.source !== "object" || n.source.source !== "command") return;
  if (areCommandPluginSourcesDisabledByPolicy()) {
    writeToStdout(`${commandPluginSourcesDisabledMessage()}
`);
    return;
  }
  if (n.source.mode === "link" && getPlatform() === "windows") {
    writeToStdout(`${LINK_MODE_UNSUPPORTED_ON_WINDOWS_MESSAGE}
`);
    return;
  }
  let command = n.source.command;
  let g = describeCommandOutputMode(n.source);
  if (p === g && !isPluginsDirOnLocalDisk()) return;
  let s = {
    kind: "command_source",
    pluginId,
    command,
    mode: n.source.mode === "link" ? "link" : "copy",
    catalogRevision: await marketplaceRevision(pluginId, storageV5),
  };
  o?.({
    ...withAcceptMatch(s, f),
    ...(p !== undefined && {
      previousAcceptance: p !== g ? "changed" : "unreliable",
    }),
  });
  let { name: h, marketplace } = parsePluginIdentifier(pluginId);
  let w = printableName(h ?? "", 200);
  let y = printableName(marketplace ?? "", 200);
  let R =
    `"${w}" is installed by running a command from marketplace "${y}" on this machine` +
    (p === undefined
      ? ""
      : p !== g
        ? " \u2014 and that command (or how its output is used) CHANGED since you accepted it"
        : " \u2014 your earlier acceptance is recorded where it cannot be relied on (a plugins root inside a workspace, on a network location, or one that could not be resolved), so please confirm it again") +
    `:
  ${command}
  (${describeCommandSourceMode(n.source)})
`;
  writeToStdout(R);
  let S = await promptAcceptCommand({
    yes: r,
    acceptCommand: f,
    shown: s,
    disclosure: R,
  });
  return S === "accepted"
    ? {
        kind: "accepted",
        grantKey: g,
      }
    : S === "declined"
      ? {
          kind: "declined",
        }
      : undefined;
}
//@ chunk-12wyw8h8.js:15879-16965 layout
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
//@ chunk-12wyw8h8.js:16965-17513 layout
/**
 * 解析 install 目标：补全市场名并取 marketplace 条目，供展示 command/headersHelper 披露。
 */
async function resolveInstallTarget(e, n = {}, r) {
  if (parseNpmPluginId(e) !== null) return null;
  let { name: p, marketplace } = parsePluginIdentifier(e);
  if (!p) return null;
  let o = marketplace ?? n.resolvedMarketplace;
  if (!o)
    try {
      o = (await findPluginInMarketplaces(p, r))?.marketplace;
    } catch (error) {
      if (error instanceof CommandSourceError) return null;
      throw error;
    }
  if (!o) return null;
  let m = `${p}@${o}`;
  if (await hasOnlyMissingDependencyIssues(m, n.scope ?? "user", r)) return null;
  let u = await archiveFetchWarning(m, undefined, r);
  if (u === null) return null;
  let g = `${archiveHelperDisclosure(u)}
`;
  writeToStdout(g);
  let s = await entryHelperTarget(u, m, r);
  n.onShown?.(withAcceptMatch(s, n.acceptCommand));
  let h = await promptAcceptCommand({
    yes: n.yes,
    acceptCommand: n.acceptCommand,
    shown: s,
    disclosure: g,
  });
  return h === "accepted" ? u : h;
}
//@ chunk-12wyw8h8.js:17513-18894 layout
/**
 * 已安装插件的市场条目改成 command 来源时，检查并提示需要显式同意后再更新。
 */
async function checkCommandSourceSwitch(e, n = {}, r) {
  if (parseNpmPluginId(e) !== null) return;
  let { name: p, marketplace } = parsePluginIdentifier(e);
  if (!p) return;
  let knownMarketplaces = await loadKnownMarketplacesSafe(r);
  let m = marketplace;
  let u;
  if (!m) {
    let P;
    try {
      P = await findPluginInMarketplaces(p, r);
    } catch (error) {
      if (error instanceof CommandSourceError) return;
      throw error;
    }
    if (!P) return;
    m = P.marketplace;
    u = P.entry;
    n.onResolvedMarketplace?.(m);
  }
  let g = ownPropertyOrUndefined(knownMarketplaces, m);
  if (isSourceDisallowedOrUnverifiable(g?.source)) return;
  let s = `${p}@${m}`;
  let h =
    u && n.acceptCommand === undefined
      ? {
          entry: u,
        }
      : undefined;
  if (!h) {
    let P = await refreshBeforeScopedInstall(m, g, r);
    n.onMarketplaceRefreshResult?.(P);
    try {
      h = await getPluginById(s, r);
    } catch (error) {
      if (error instanceof CommandSourceError) return;
      throw error;
    }
  }
  let v = h ? commandSourceSpecOf(h.entry.source) : undefined;
  if (!h || !v) return;
  let w =
    (isStorageV5Enabled() && r !== undefined ? await loadInstalledPlugins(r) : loadInstalledPluginsSync())
      .plugins[s] ?? [];
  let y = describeCommandOutputMode(v);
  let R = !isPluginsDirOnLocalDisk();
  let S = R && w.some((P) => P.sourceCommand === y);
  if (await isPluginEnabledAndCachedAtScope(s, n.scope ?? "user", r)) {
    if (!S) {
      let all = w.every((E) => E.sourceCommand === undefined);
      writeToStdout(
        `"${printableName(parsePluginIdentifier(s).name ?? "", 200)}" is already installed, and its marketplace ` +
          (all
            ? "entry now installs it by running a command on this machine that has not been reviewed yet."
            : "has since changed the command that installs it (or how its output is used).") +
          ` Review and accept it: ${runCommandHint("plugin update", s, {
            extra: (n.scope ?? "user") === "user" ? undefined : `--scope ${n.scope}`,
            fallback: "an explicit plugin update reviews it",
          })}.
`,
      );
    }
    return;
  }
  if (S)
    return {
      kind: "accepted",
      grantKey: y,
    };
  return confirmCommandSourceInstall(s, h.entry, {
    yes: n.yes,
    acceptedCommand: R ? w.find((P) => P.sourceCommand !== undefined)?.sourceCommand : undefined,
    acceptCommand: n.acceptCommand,
    onShown: n.onShown,
    storageV5: r,
  });
}
//@ chunk-12wyw8h8.js:18894-20371 callgraph-fingerprint = installPlugin (0.272)
/**
 * claude plugin install：调用 installPluginOp，打印结果与依赖/警告，记 tengu_plugin_installed_cli。
 */
async function installPlugin(
  e,
  n = "user",
  config,
  shownSourceCommand,
  shownEntryHelper,
  o,
  announceRefreshResult,
  u = {},
) {
  let g = [];
  try {
    let s = await installPluginOp(
      u.resolvedPlugin ?? e,
      n,
      {
        shownSourceCommand,
        shownEntryHelper,
        announceRefreshResult,
        replaceInstalledCopy: u.replaceInstalledCopy,
        npmRegistry: u.npmRegistry,
        gitHubHttpsFallback: sshCloneFallback((S) => {
          g.push(S);
        }),
      },
      o,
    );
    if (!s.success) throw new PluginOperationFailedError(s.message, s);
    let pluginId = s.pluginId || e;
    let scope = s.scope || n;
    logEvent("tengu_plugin_installed_cli", {
      ...(await pluginTelemetryFields(pluginId, policyEnabledPluginNameSet(), o)),
      plugin_id: pluginIdForTelemetry(pluginId),
      scope: fromEnum(scope),
      install_source: lit("cli-explicit"),
      ...buildPluginVersionShaField(
        pluginId,
        getInstalledGitCommitSha(pluginId, {
          scope,
        }),
      ),
      ...directoryInstallFields({
        pluginId,
        surface: "cli",
        replaced: s.switched !== undefined,
      }),
      ...(s.aliasedId
        ? {
            aliased_id: true,
            ...(s.reenabled && {
              reenabled: true,
            }),
          }
        : {}),
    });
    let w = "";
    let y = config && config.length > 0 ? true : undefined;
    try {
      if (s.nothingWritten) {
        if (y) {
          w = `${figures_default.warning} --config values were not saved, because this command changed nothing. To set them, run /plugin configure ${s.pluginId || e} in Claude Code.`;
          y = false;
        }
      } else w = await configurePluginFromFlags(s.pluginId || e, config, o);
    } catch (error) {
      let P = errorMessage(error);
      logForDebugging(`post-install userConfig step failed: ${P}`, {
        level: "warn",
      });
      if (config && config.length > 0) {
        w = `${figures_default.warning} Installed, but --config not applied: ${P}`;
        y = false;
      }
    }
    let R = withSettingsWarning(
      [s.message, ...g, ...(w ? [w] : [])].join(`
`),
      s.scope ?? n,
    );
    if (u.json)
      await writePluginResult({
        command: "install",
        outcome: "ok",
        plugin: e,
        pluginId: s.pluginId,
        scope: s.scope || n,
        message: stripInvisibleKeepNewlines(R),
        configApplied: y,
        installedVersion: s.installedVersion,
        availableVersion: s.availableVersion,
      });
    return R;
  } catch (error) {
    return handlePluginCommandError(
      error,
      "install",
      e,
      o,
      u.json
        ? {
            scope: n,
            shownCommand: u.shownCommand,
          }
        : undefined,
      error instanceof PluginOperationFailedError && error.result.aliasedId
        ? error.result.pluginId
        : undefined,
      g,
    );
  }
}
//@ chunk-12wyw8h8.js:20371-20524 layout
async function findOrphanedAutoInstalls(e, n) {
  let projectPathForScope = getProjectPathForScope(e);
  let { enabled, disabled } = await loadAllPluginsCacheOnly(isStorageV5Enabled() ? n : undefined);
  return findOrphanedAutoDependencies(
    (isStorageV5Enabled() && n !== undefined ? await loadInstalledPlugins(n) : loadInstalledPluginsSync())
      .plugins,
    [...enabled, ...disabled],
    e,
    projectPathForScope,
  );
}
//@ chunk-12wyw8h8.js:20524-20975 layout
/**
 * 把 CLI 参数里的插件名解析成实际插件 ID（别名、已安装副本），返回 {plugin, aliased}。
 */
async function resolvePluginArgument(
  e,
  json,
  r,
  { unlessNamedInSettings: p = false, unlessDirectoryNameHeld: f = false } = {},
) {
  {
    let o = await installSelectedPlugins(e, r);
    if (o && !(p && isPluginInSettings(e))) {
      if (f && isOfficialPluginDirectoryId(e)) {
        let u = await bindingsWithReadFailure().catch(() => {
          return;
        });
        if (u === undefined || isUnreadableBindings(u) || findBindingKeysFor(u.keys(), e).length > 0)
          return {
            plugin: e,
            aliased: false,
          };
      }
      let pluginId = o.installed.pluginId;
      if (!json)
        writeToStdout(`${stripInvisibleKeepEmoji(`"${quotedPrintable(e, 120)}" is installed as ${pluginId} (the same plugin from ${marketplaceDisplayName(parsePluginIdentifier(pluginId).marketplace ?? "")}).`)}
`);
      return {
        plugin: pluginId,
        aliased: true,
      };
    }
  }
  return {
    plugin: e,
    aliased: false,
  };
}
//@ chunk-12wyw8h8.js:20975-22074 fingerprint = uninstallPlugin (0.306)
/**
 * claude plugin uninstall：解析插件名，调用 uninstallPluginOp，记 tengu_plugin_uninstalled_cli。
 */
async function uninstallPlugin(e, n = "user", keepData = false, prune = false, yes = false, o, m = {}) {
  let u = {
    plugin: e,
    aliased: false,
  };
  try {
    u = await resolvePluginArgument(e, m.json, o, {
      unlessDirectoryNameHeld: true,
    });
    let g = await uninstallPluginOp(u.plugin, n, !keepData, o);
    if (!g.success) throw new PluginOperationFailedError(g.message, g);
    await logEventAsync("tengu_plugin_uninstalled_cli", {
      ...(await pluginTelemetryFields(g.pluginId || u.plugin, policyEnabledPluginNameSet(), o)),
      scope: fromEnum(g.scope || n),
      ...(u.aliased
        ? {
            aliased_id: true,
          }
        : {}),
      ...(g.savedKept !== undefined && {
        saved_kept: true,
      }),
    });
    let s = false;
    let h = async (v) => {
      if (m.json)
        await writePluginResult({
          command: "uninstall",
          outcome: "ok",
          plugin: e,
          pluginId: g.pluginId,
          scope: g.scope || n,
          keptData: g.dataDirKept ?? keepData,
          ...(g.savedKept !== undefined && {
            savedKept: g.savedKept.reason,
          }),
          message: stripInvisibleKeepNewlines(v),
        });
      return v;
    };
    try {
      let orphanedAutoInstalls = await findOrphanedAutoInstalls(n, o);
      if (prune) {
        writeToStdout(`${figures_default.tick} ${stripInvisibleKeepEmoji(g.message)}
`);
        s = true;
        return await pruneOrphanedPlugins(
          orphanedAutoInstalls,
          n,
          {
            dryRun: false,
            yes,
            deleteDataDir: !keepData,
          },
          o,
        );
      }
      return h(g.message + formatOrphanedDependenciesNotice(orphanedAutoInstalls.orphans, n));
    } catch (error) {
      logError(
        withTelemetryMessage(
          toError(error),
          "claude plugin uninstall: post-uninstall orphan scan or prune failed",
        ),
      );
      let y = `(${prune ? "prune" : "orphan scan"} failed: ${errorMessage(error)})`;
      if (s) return y;
      let R = prune ? `${figures_default.tick} ${g.message}` : g.message;
      return h(`${R}
${y}`);
    }
  } catch (error) {
    return handlePluginCommandError(
      error,
      "uninstall",
      e,
      o,
      m.json
        ? {
            scope: n,
          }
        : undefined,
      u.aliased ? u.plugin : undefined,
    );
  }
}
//@ chunk-12wyw8h8.js:22074-22244 layout
/**
 * claude plugin prune：找出作用域内不再被任何插件依赖的自动安装（auto）插件并卸载（可 --dry-run）。
 */
async function prunePluginsCli(e = "user", { dryRun: n = false, yes: r = false } = {}, p) {
  try {
    let orphanedAutoInstalls = await findOrphanedAutoInstalls(e, p);
    return await pruneOrphanedPlugins(
      orphanedAutoInstalls,
      e,
      {
        dryRun: n,
        yes: r,
        deleteDataDir: true,
      },
      p,
    );
  } catch (error) {
    return handlePluginCommandError(error, "prune");
  }
}
//@ chunk-12wyw8h8.js:22244-23480 layout
async function pruneOrphanedPlugins(orphanedAutoInstalls, n, r, p) {
  if (orphanedAutoInstalls.unloadable.length > 0)
    return `Skipped \u2014 cannot determine orphans: ${orphanedAutoInstalls.unloadable.map(stripInvisibleKeepEmoji).join(", ")} failed to load. Fix or uninstall, then retry.`;
  if (orphanedAutoInstalls.orphans.size === 0)
    return orphanedAutoInstalls.autoCount === 0
      ? `Nothing to prune (no auto-installed plugins at ${n} scope).`
      : `Nothing to prune (${orphanedAutoInstalls.autoCount} auto-installed ${plural(orphanedAutoInstalls.autoCount, "plugin", "plugins")} at ${n} scope, all still needed).`;
  let plugins = (
    isStorageV5Enabled() && p !== undefined ? await loadInstalledPlugins(p) : loadInstalledPluginsSync()
  ).plugins;
  let projectPathForScope = getProjectPathForScope(n);
  let mapped = [...orphanedAutoInstalls.orphans].map((orphan) => {
    let h = installationAtTarget(plugins[orphan], n, projectPathForScope);
    return `  ${stripInvisibleKeepEmoji(orphan)}${h?.version ? ` (${stripInvisibleKeepEmoji(h.version)})` : ""}`;
  });
  let u = `${orphanedAutoInstalls.orphans.size} auto-installed ${plural(orphanedAutoInstalls.orphans.size, "plugin", "plugins")} no longer needed at ${n} scope:
${mapped.join(`
`)}`;
  if (r.dryRun)
    return `${u}
(dry run \u2014 nothing removed)`;
  if (!r.yes) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      let h = n === "user" ? "" : ` --scope ${n}`;
      return `${u}
Not a TTY \u2014 run \`claude plugin prune${h} -y\` to remove.`;
    }
    writeToStdout(`${u}
`);
    if (!(await confirmPrompt("Remove?"))) return "Aborted.";
  }
  let g = await pruneOrphanedAutoDeps(
    orphanedAutoInstalls.orphans,
    n,
    projectPathForScope,
    {
      deleteDataDir: r.deleteDataDir,
    },
    p,
  );
  await logEventAsync("tengu_plugin_prune_cli", {
    scope: fromEnum(n),
    removed_count: g.length,
  });
  return `Removed ${g.length} auto-installed ${plural(g.length, "plugin", "plugins")}: ${g.map((s) => stripInvisibleKeepEmoji(parsePluginIdentifier(s).name)).join(", ")}`;
}
//@ chunk-12wyw8h8.js:23480-24055 fingerprint = disablePlugin (0.565)
/**
 * claude plugin disable：调用 disablePluginOp 并输出结果。
 */
async function disablePlugin(e, n, r, p = {}) {
  let f = {
    plugin: e,
    aliased: false,
  };
  try {
    f = await resolvePluginArgument(e, p.json, r, {
      unlessNamedInSettings: true,
    });
    let o = await disablePluginOp(f.plugin, n, r);
    if (!o.success) throw new PluginOperationFailedError(o.message, o);
    await logEventAsync("tengu_plugin_disabled_cli", {
      ...(await pluginTelemetryFields(o.pluginId || f.plugin, policyEnabledPluginNameSet(), r)),
      scope: fromEnumOpt(o.scope),
      ...(f.aliased
        ? {
            aliased_id: true,
          }
        : {}),
    });
    let m = withSettingsWarning(o.message, o.scope ?? n);
    if (p.json)
      await writePluginResult({
        command: "disable",
        outcome: "ok",
        plugin: e,
        pluginId: o.pluginId,
        scope: o.scope ?? n,
        message: stripInvisibleKeepNewlines(m),
      });
    return `${figures_default.tick} ${m}`;
  } catch (error) {
    return handlePluginCommandError(
      error,
      "disable",
      e,
      r,
      p.json
        ? {
            scope: n,
          }
        : undefined,
      f.aliased ? f.plugin : undefined,
    );
  }
}
//@ chunk-12wyw8h8.js:24055-24375 fingerprint = disableAllPlugins (0.738)
/**
 * claude plugin disable --all：禁用全部可禁用插件（组织要求的插件除外）。
 */
async function disableAllPlugins(e, n = {}) {
  try {
    let r = await listRequiredPlugins(e);
    if (!r.success) throw new PluginOperationFailedError(r.message, r);
    await logEventAsync("tengu_plugin_disabled_all_cli", {});
    if (n.json)
      await writePluginResult({
        command: "disable",
        outcome: "ok",
        all: true,
        message: stripInvisibleKeepNewlines(r.message),
      });
    return `${figures_default.tick} ${r.message}`;
  } catch (error) {
    return handlePluginCommandError(error, "disable-all", undefined, undefined, n.json ? {} : undefined);
  }
}
//@ chunk-12wyw8h8.js:24375-26148 fingerprint = updatePluginCli (0.378)
/**
 * claude plugin update：检查并更新插件（显式模式，处理 headersHelper/command 来源确认），输出版本变化。
 */
async function updatePluginCli(e, n, { yes: r = false, json: p = false, acceptCommand: f } = {}, o) {
  let pluginId;
  let u;
  let g = {
    plugin: e,
    aliased: false,
  };
  try {
    g = await resolvePluginArgument(e, p, o);
    if (!p)
      writeToStdout(`${stripInvisibleKeepEmoji(`Checking for updates for plugin "${g.plugin}"${n ? ` at ${n} scope` : ""}\u2026`)}
`);
    let s = await updatePluginOp(
      g.plugin,
      n,
      {
        explicit: true,
        onEntryHelperDisclosure: async (w, y, R) => {
          writeToStdout(`${w}
`);
          let S = await entryHelperTarget(y, R, o);
          let P = await promptAcceptCommand({
            yes: r,
            acceptCommand: f,
            shown: S,
            disclosure: `${w}
`,
          });
          u = P === "accepted" ? undefined : withAcceptMatch(S, f);
          return P;
        },
        announceCommandSource: async (w, y, acceptedCommand) => {
          let S = await confirmCommandSourceInstall(w, y, {
            yes: r,
            acceptedCommand,
            acceptCommand: f,
            onShown: (P) => {
              u = P;
            },
            storageV5: o,
          });
          if (S?.kind === "accepted") u = undefined;
          if (S?.kind === "declined")
            throw new CommandSourceError(
              "Aborted \u2014 the command was not run.",
              "plugin command source declined at the prompt",
            );
          return S?.grantKey;
        },
      },
      o,
    );
    let h = stripInvisibleKeepEmoji(s.message);
    pluginId = s.pluginId;
    let { outcome } = s;
    if (outcome === "failed") {
      if (s.failureCode !== undefined && isSadFailureCode(s.failureCode))
        throw new CommandSourceError(h, `${COMMAND_SOURCE_NETWORK_ERRORS}${s.failureCode}`);
      throw new PluginOperationFailedError(h, {
        failureCode: s.failureCode,
        pluginId: s.pluginId,
      });
    }
    if (p)
      await writePluginResult({
        command: "update",
        outcome: "ok",
        plugin: e,
        pluginId: s.pluginId,
        scope: s.scope ?? n,
        message: h,
        updateOutcome: outcome,
        oldVersion: s.oldVersion,
        newVersion: s.newVersion,
        skipReason: s.skipReason,
        blockedBy: s.blockedBy,
        refreshFailed: s.refreshFailed,
        refreshRefusedByPolicy: s.refreshRefusedByPolicy,
      });
    else {
      if (s.folderNote !== undefined)
        writeToStdout(`${stripInvisibleKeepEmoji(s.folderNote)}
`);
      writeToStdout(`${figures_default.tick} ${h}
`);
    }
    if (s.outcome === "updated") {
      let w = s.pluginId || g.plugin;
      logEvent("tengu_plugin_updated_cli", {
        ...(await pluginTelemetryFields(w, policyEnabledPluginNameSet(), o)),
        old_version: sanitizeVersion(s.oldVersion),
        new_version: sanitizeVersion(s.newVersion),
        ...buildPluginVersionShaField(w, s.gitCommitSha),
        ...(g.aliased
          ? {
              aliased_id: true,
            }
          : {}),
      });
    }
    if (g.aliased)
      await logFeatureOkAsync("cli_plugin_update", {
        aliased_id: true,
      });
    else await logFeatureOkAsync("cli_plugin_update");
    await gracefulShutdown(0);
  } catch (error) {
    return handlePluginCommandError(
      error,
      "update",
      e,
      o,
      p
        ? {
            scope: n,
            pluginId,
            shownCommand: u,
          }
        : undefined,
      g.aliased ? g.plugin : undefined,
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
};
