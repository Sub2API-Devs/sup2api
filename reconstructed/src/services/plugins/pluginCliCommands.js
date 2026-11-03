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
import { basename, join, join as join_2 } from "path";
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
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
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
import { $wt, zGr } from "./pluginUninstallSettings.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { describeArchiveFetchCommand } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { Zb } from "../../utils/plugins/marketplaceSources.js";
import {
  loadKnownMarketplacesSafe,
  seedDirFor,
  getPluginById,
} from "../../utils/plugins/marketplaceManager.js";
import { SMe } from "../../utils/gitSafeExec.js";
import { execFileNoThrowWithCwd } from "../../utils/execFileNoThrow.js";
import { gitExe } from "../../utils/git.js";
import { ICt, ic } from "../../utils/plugins/cacheUtils.js";
import { getUserBucket } from "../analytics/datadog.js";
import { Wo } from "../../utils/json.js";
import { writeStdoutAndDrain, exitAfterAnalyticsFlush } from "../../cli/exit.js";
import { escapeControlChars } from "../../utils/resultError.js";
import { ge } from "../../utils/identity.js";
import { env } from "../../utils/env.js";
import {
  Bd,
  LINK_MODE_UNSUPPORTED_ON_WINDOWS_MESSAGE,
  o1,
  isPluginsDirOnLocalDisk,
  describeCommandSourceMode,
  wpe,
} from "../../utils/plugins/commandSource.js";
import { Z_n } from "../../utils/plugins/commandSourceErrors.js";
import { classifyCommandSourceError } from "../../utils/plugins/headersHelper.js";
import { ClaudeAiMarketplaceError } from "../../utils/plugins/claudeAiMarketplaces.js";
import {
  classifyPluginCommandError as classifyPluginCommandError_2,
  dpe,
  buildPluginVersionShaField,
} from "../../utils/telemetry/pluginTelemetry.js";
import {
  stripInvisibleKeepNewlines,
  stripInvisibleKeepEmoji,
} from "../../utils/settings/marketplaceSettingsAliases.js";
import { logFeatureBadAsync, logFeatureSadAsync, logFeatureOkAsync } from "../analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { pluginTelemetryFields } from "../../utils/telemetry/pluginTelemetryName.js";
import { af } from "../../utils/plugins/pluginPolicy.js";
import { logEventAsync, logEvent } from "../analytics/index.js";
import { fromEnum, fromEnumOpt, lit } from "../analytics/safeMetadata.js";
import { h7e } from "../../utils/plugins/pluginConfigEnv.js";
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
import { confirmPrompt, Agt } from "../../utils/confirmPrompt.js";
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
import { Eqs } from "../../utils/plugins/gitSshConfig.js";
import { directoryInstallFields } from "../../utils/plugins/pluginDirectoryTelemetry.js";
import {
  findOrphanedAutoDependencies,
  formatOrphanedDependenciesNotice,
  qP,
} from "../../utils/plugins/dependencyResolver.js";
import { installSelectedPlugins } from "../../utils/plugins/pluginStartupCheck.js";
import { VS, lpe, xSe, findBindingKeysFor } from "../../utils/plugins/pluginDirectoryBindings.js";
import { marketplaceDisplayName } from "../../utils/plugins/officialMarketplaceNames.js";
import { sanitizeVersion } from "../analytics/metadata.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";

//@ chunk-12wyw8h8.js:1926-2128 placement
function mcpbSourcesOf(e) {
  let mcpServers = e.manifest.mcpServers,
    filtered = (
      typeof mcpServers === "string" ? [mcpServers] : Array.isArray(mcpServers) ? mcpServers : []
    ).filter((f) => typeof f === "string" && isMcpbSource(f)),
    filtered_2 = filtered.filter((f) => isLocalMcpbSource(f));
  return { local: filtered_2, remoteCount: filtered.length - filtered_2.length };
}
/**
 * 安装插件后读取其捆绑的 MCPB 服务器：并行加载每个本地包，收集需要配置的服务器（名称、配置 schema、已有配置），读不出的包单独列出。
 */
//@ chunk-12wyw8h8.js:2128-2624 placement
async function readBundledServerConfigs(e, n, r) {
  let results = await Promise.all(
      n.map(async (m) => {
        try {
          let u = await loadMcpbFile(m, e.path, e.repository, void 0, void 0, !0, r);
          return { spec: m, result: u };
        } catch (error) {
          return (
            logForDebugging(`post-install bundle read failed for ${m}: ${errorMessage(error)}`, {
              level: "warn",
            }),
            { spec: m, result: void 0 }
          );
        }
      }),
    ),
    f = new Map(),
    o = [];
  for (let { spec: spec, result: u } of results)
    if (!u) o.push(spec);
    else if ("status" in u)
      f.set(u.manifest.name, {
        serverName: u.manifest.name,
        schema: u.configSchema,
        existingConfig: u.existingConfig,
      });
  return { bundles: [...f.values()], unreadable: o };
}
//@ chunk-12wyw8h8.js:2624-2828 placement
function parseConfigPair(e) {
  let index = e.indexOf("=");
  if (index <= 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `--config expects KEY=VALUE, got "${e}". Use --config key=value (repeatable).`,
      "--config pair has no key",
    );
  return { key: e.slice(0, index), raw: e.slice(index + 1) };
}
//@ chunk-12wyw8h8.js:2828-4153 placement
function splitPluginConfigArgs(e, n, r, p) {
  let f = [],
    o = new Map();
  for (let m of e) {
    let { key: key, raw: raw } = parseConfigPair(m);
    if (n && Object.hasOwn(n, key)) {
      f.push(m);
      continue;
    }
    let flattened = r.flatMap(({ serverName: serverName, schema: schema }) => {
        let S = [],
          P = `${serverName}.`;
        if (key.startsWith(P) && Object.hasOwn(schema, key.slice(P.length)))
          S.push({ serverName: serverName, field: key.slice(P.length), bare: !1 });
        if (Object.hasOwn(schema, key)) S.push({ serverName: serverName, field: key, bare: !0 });
        return S;
      }),
      [h, ...v] = flattened;
    if (h && v.length === 0) {
      if (h.bare && p.unreadable.length + p.remoteCount > 0)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `--config key "${key}" must name its server, because a bundled MCP server whose keys are unknown may declare it too; use ${printableName(`${h.serverName}.${h.field}`)}.` +
            unconfigurableBundlesNote(p),
          "--config bare key with an unread bundled server",
        );
      let y = o.get(h.serverName) ?? [];
      (y.push(`${h.field}=${raw}`), o.set(h.serverName, y));
      continue;
    }
    if (h)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `--config key "${key}" is declared by more than one bundled MCP server; use ${flattened.map((y) => printableName(`${y.serverName}.${y.field}`)).join(" or ")}.`,
        "--config key is ambiguous between bundled servers",
      );
    let w = [
      ...Object.keys(n ?? {}),
      ...r.flatMap(({ serverName: serverName, schema: schema }) =>
        Object.keys(schema).map((S) => printableName(`${serverName}.${S}`)),
      ),
    ];
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `--config key "${key}" isn't declared in this plugin's userConfig` +
        (r.length > 0 ? " or by its bundled MCP servers." : ".") +
        (w.length > 0 ? ` Known keys: ${w.join(", ")}.` : "") +
        unconfigurableBundlesNote(p),
      "--config key is not declared",
    );
  }
  return { pluginPairs: f, bundlePairs: o };
}
/**
 * 生成"部分捆绑服务器无法用 --config 配置"的括注：读不出的本地包，以及启动时从 URL 拉取、只能在 Claude Code 里配置的远程包。
 */
//@ chunk-12wyw8h8.js:4153-4622 placement
function unconfigurableBundlesNote({ unreadable: unreadable, remoteCount: remoteCount }) {
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
/**
 * 检查捆绑 MCP 服务器的配置是否完整，不完整时返回提示：列出缺少的必填键或校验错误，并说明可用 --config KEY=VALUE 或在 /plugin 中配置。
 */
//@ chunk-12wyw8h8.js:4622-5188 placement
function missingConfigMessage(bundle, pluginId) {
  let validation = validateUserConfig(bundle.existingConfig, bundle.schema);
  if (validation.valid) return;
  let serverLabel = printableName(bundle.serverName),
    mapped = Object.entries(bundle.schema)
      .filter(([m, u]) => {
        let g = getOwn(bundle.existingConfig, m);
        return u.required === !0 && (g === void 0 || g === "");
      })
      .map(([m]) => printableName(`${serverLabel}.${m}`)),
    fixHint =
      mapped.length > 0
        ? `set ${mapped.join(", ")} with --config KEY=VALUE`
        : `${validation.errors.map((error) => printableName(error)).join("; ")} \u2014 fix it with --config ${serverLabel}.KEY=VALUE`;
  return `MCP server "${quotedPrintable(bundle.serverName)}" needs configuration before it can start: ${fixHint}, or in Claude Code run /plugin, select "${quotedPrintable(pluginId)}" in the Installed tab, and choose Configure.`;
}
//@ chunk-12wyw8h8.js:5221-5296 placement
function withSettingsWarning(e, n) {
  let r = settingsFileWarning(n);
  return r === null
    ? e
    : `${e}
${re.warning} ${r}`;
}
//@ chunk-12wyw8h8.js:5296-6136 placement
function settingsFileWarning(e) {
  try {
    if (e === void 0 || e === "managed") return null;
    let n = scopeToSettingSource(e),
      r = getSettingsFilePathForSource(n);
    if (r === void 0 || (n === "userSettings" && basename(r) === USER_SETTINGS_FILE_NAMES.cowork))
      return null;
    if ($wt(n) || (n !== "userSettings" && zGr(r))) return null;
    let filtered = getSettingsParseErrorsForSource(n).filter((u) => u.file === r && u.severity !== "warning"),
      [f] = filtered;
    if (f === void 0) return null;
    let o = filtered.length - 1,
      m =
        f.path !== ""
          ? `its "${quotedPrintable(f.path, 80)}" ${o > 0 ? `and ${o} other ${plural(o, "value")} are` : "is"} not valid`
          : f.errorClass === "unreadable"
            ? "it could not be read"
            : "it is not a JSON object";
    return `${printableOrEmpty(r)} does not load (${m}), so Claude Code ignores the whole file, including anything this command wrote there. Fix the file, then run this command again if its change is missing. If a newer Claude Code wrote the file, update Claude Code instead.`;
  } catch (error) {
    return (
      logForDebugging(`settings file check after a plugin command skipped: ${errorMessage(error)}`, {
        level: "warn",
      }),
      null
    );
  }
}
//@ chunk-12wyw8h8.js:6136-6616 placement
class PluginOperationFailedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  result;
  pluginCommandErrorCategory;
  constructor(e, n = {}) {
    super(e, "plugin operation returned a failure result");
    if (
      ((this.name = "PluginOperationFailedError"),
      (this.result = n),
      n.failureCode === "invalid_plugin_id" ||
        n.failureCode === "plugin_folder_held" ||
        n.failureCode === "install_records_unreadable" ||
        n.failureCode === "directory_identity_changed" ||
        n.failureCode === "directory_binding_unreadable" ||
        n.failureCode === "directory_loaded")
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
function rfo(e) {
  return { ...e, sha256: installConfirmationDigest(e) };
}
//@ chunk-12wyw8h8.js:6874-6945 placement
function W(e, n) {
  return n === void 0 ? e : { ...e, acceptCommandMatched: K(n, e) };
}
//@ chunk-12wyw8h8.js:6945-7087 placement
async function entryHelperTarget(e, n, r) {
  return {
    kind: "entry_helper",
    pluginId: n,
    command: e.command,
    archiveUrl: describeArchiveFetchCommand(e).destination,
    catalogRevision: await marketplaceRevision(n, r),
  };
}
/**
 * 计算插件所在市场的版本标识，用于确认后的安装比对：git 检出取 HEAD 提交，GCS 种子取记录的摘要，settings 来源结合清单与来源内容的哈希，其余为清单哈希；无法确定时返回随机 unreadable 值。
 */
//@ chunk-12wyw8h8.js:7087-7816 placement
async function marketplaceRevision(pluginId, storageV5) {
  let unreadable = `unreadable:${randomUUID()}`;
  if (isStorageV5Enabled() && storageV5 !== void 0) return unreadable;
  let { marketplace: marketplace } = parsePluginIdentifier(pluginId),
    entry = marketplace === void 0 ? void 0 : Zb(await loadKnownMarketplacesSafe(storageV5), marketplace);
  if (entry === void 0) return unreadable;
  if (entry.source.source === "claudeai") return unreadable;
  let installLocation = entry.installLocation;
  try {
    if (entry.source.source === "github" || entry.source.source === "git") {
      if (
        await stat(join(installLocation, ".git")).then(
          () => !0,
          () => !1,
        )
      ) {
        let u = SMe(installLocation, {}),
          g = await execFileNoThrowWithCwd(gitExe(), [...u.inCheckoutArgs, "rev-parse", "HEAD"], {
            cwd: installLocation,
            env: u.env,
            stdin: "ignore",
          });
        return g.code === 0 ? `git:${g.stdout.trim()}` : unreadable;
      }
      if (seedDirFor(installLocation) === void 0) {
        let trimmed = (await readFile(join(installLocation, ICt), "utf8")).trim();
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
/**
 * 计算插件市场清单的规范化哈希：读取 .claude-plugin/marketplace.json（或文件本身）与 package.json，键排序后取 sha256。
 */
//@ chunk-12wyw8h8.js:7816-8193 placement
async function marketplaceManifestHash(e) {
  let n = (o) => ["ENOENT", "ENOTDIR"].includes(getErrnoCode(o) ?? ""),
    r,
    p = !0;
  try {
    r = await readFile(join(e, ".claude-plugin", "marketplace.json"), "utf8");
  } catch (error) {
    if (!n(error)) throw error;
    ((r = await readFile(e, "utf8")), (p = !1));
  }
  let f = p
    ? await readFile(join(e, "package.json"), "utf8").catch((o) => {
        if (n(o)) return null;
        throw o;
      })
    : null;
  return createHash("sha256")
    .update(
      jsonStringify([canonicalForm(jsonParse(Wo(r))), f === null ? null : canonicalForm(jsonParse(Wo(f)))]),
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
        .map((n) => [n, canonicalForm(e[n])]),
    ];
  return e;
}
//@ chunk-12wyw8h8.js:8420-8486 placement
function K(e, n) {
  return e !== void 0 && e.trim().toLowerCase() === installConfirmationDigest(n);
}
//@ chunk-12wyw8h8.js:8486-8631 placement
async function writePluginResult(e) {
  let n =
    e.failureCode !== void 0 && UNCONFIRMED_INSTALL_CODES.has(e.failureCode)
      ? e
      : { ...e, shownCommand: void 0 };
  await writeStdoutAndDrain(
    escapeControlChars(jsonStringify({ ...n, nonce: J.value })) +
      `
`,
  );
}
//@ chunk-12wyw8h8.js:8631-8678 placement
var J = ge({ value: void 0 }, (e) => {
  e.value = void 0;
});
//@ chunk-12wyw8h8.js:8678-8708 placement
function Hks() {
  return J.value;
}
//@ chunk-12wyw8h8.js:8708-8802 placement
function readResultNonce() {
  ((J.value = env.CLAUDE_CODE_RESULT_NONCE || void 0), env.unset("CLAUDE_CODE_RESULT_NONCE"));
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
  if (e instanceof Bd && n === "update") {
    let telemetryMessage = e.telemetryMessage;
    if (telemetryMessage.startsWith(Z_n)) return telemetryMessage.slice(Z_n.length);
  }
  return classifyPluginCommandError(e);
}
/**
 * 把插件命令错误归类为遥测 failureCode（插件操作错误码、claudeai_*、error_*）。
 */
//@ chunk-12wyw8h8.js:9121-9248 layout
function classifyPluginCommandError(e) {
  if (e instanceof Bd) return classifyCommandSourceError(e).code;
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
  },
  UNCLASSIFIED_COMMAND_FAILURE = {
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
/**
 * CLI 插件子命令的统一错误处理：打 tengu_plugin_command_failed 遥测（命令、作用域、failureCode 分类），JSON 模式输出结构化结果，否则打印错误并以非零退出。
 */
//@ chunk-12wyw8h8.js:10606-12383 fingerprint = handlePluginCommandError (0.387)
async function handlePluginCommandError(e, n, r, p, f, o, m = []) {
  let u = e instanceof PluginOperationFailedError ? e.result.failureCode : void 0,
    g = classifyPluginCommandError_2(e),
    s = g === "unknown" && u !== void 0 ? (FAILURE_CODE_CATEGORY[u] ?? g) : g,
    h = n === "disable-all" ? "disable" : n === "prune" ? void 0 : n;
  if (f && h) {
    let S = e instanceof PluginOperationFailedError ? e.result : {};
    await writePluginResult({
      command: h,
      outcome: "failed",
      ...(n === "disable-all" ? { all: !0 } : { plugin: r }),
      pluginId: S.pluginId ?? f.pluginId ?? o,
      scope: f.scope,
      message: stripInvisibleKeepNewlines(appendLines(errorMessage(e), m)),
      failureCode: getPluginCommandFailureCode(e, n),
      alreadyInGoalState: S.alreadyInGoalState,
      installedScope: S.installedScope,
      reverseDependents: S.reverseDependents,
      dependencies: S.dependencies,
      disableFirst: S.disableFirst,
      governingScope: S.governingScope,
      shownCommand: f.shownCommand && rfo(f.shownCommand),
    });
  }
  if (e instanceof Bd && (n === "install" || n === "update")) {
    if ((console.error(stripInvisibleKeepNewlines(appendLines(errorMessage(e), m))), n === "install")) {
      let { code: code, kind: kind } = classifyCommandSourceError(e);
      if (kind === "bad") await logFeatureBadAsync("cli_plugin_install", code);
      else await logFeatureSadAsync("cli_plugin_install", code);
    } else if (n === "update")
      await logFeatureSadAsync("cli_plugin_update", getPluginCommandFailureCode(e, "update"));
    return exitAfterAnalyticsFlush(1);
  }
  let v = e instanceof ClaudeAiMarketplaceError ? `claudeai_${e.code}` : void 0;
  if (s === "unknown" && !(e instanceof PluginOperationFailedError) && v === void 0)
    logError(withTelemetryMessage(toError(e), UNCLASSIFIED_COMMAND_FAILURE[n]));
  else logForDebugging(`Plugin command "${n}" failed: ${errorMessage(e)}`, { level: "error" });
  let w = r ? `${n} plugin "${r}"` : n === "disable-all" ? "disable all plugins" : `${n} plugins`;
  console.error(stripInvisibleKeepNewlines(appendLines(`${re.cross} Failed to ${w}: ${errorMessage(e)}`, m)));
  let y = v ?? (u !== void 0 && (g === "unknown" || u === "not_installed") ? u : snakeCaseDashes(s));
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
  let R = r ? await pluginTelemetryFields(o ?? r, af(), p) : {};
  return (
    await logEventAsync("tengu_plugin_command_failed", {
      command: fromEnum(n),
      error_category: fromEnum(s),
      ...{ failure_code: fromEnumOpt(u) },
      ...R,
      ...(o !== void 0 ? { aliased_id: !0 } : {}),
    }),
    exitAfterAnalyticsFlush(1)
  );
}
//@ chunk-12wyw8h8.js:12383-13252 layout
function applyConfigFlags(e, n, r = "") {
  let p = {};
  for (let m of e) {
    let { key: key, raw: raw } = parseConfigPair(m),
      s = printableName(`${r}${key}`),
      trimmed = (raw.split(/\r\n|\r|\n/, 1)[0] ?? "").trim(),
      v = Object.hasOwn(n, key) ? n[key] : void 0;
    if (!v) {
      let mapped = Object.keys(n).map((y) => printableName(`${r}${y}`));
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
      let w = h7e(trimmed);
      if (w === void 0)
        throw Error(`--config ${s}: "${trimmed}" is not a boolean (use true/false, 1/0, yes/no, on/off)`);
      p[key] = w;
    } else p[key] = trimmed;
  }
  let f = filterEntriesToNullProto(n, (m, u) => Object.hasOwn(p, u)),
    o = validateUserConfig(p, f);
  if (!o.valid)
    throw Error(`--config validation failed: ${o.errors.map((error) => printableName(error)).join("; ")}`);
  return p;
}
/**
 * claude plugin install --config key=value：安装后重新加载插件，按 manifest.userConfig 校验并保存这些选项。
 */
//@ chunk-12wyw8h8.js:13252-14713 layout
async function configurePluginFromFlags(e, n, r) {
  ic(r);
  let { enabled: enabled, disabled: disabled } = await loadAllPlugins(r),
    o = findMarketplace([...enabled, ...disabled], e),
    m = n ?? [],
    u = m.length > 0;
  if (!o) {
    if (u)
      throw Error(
        `--config was given but plugin "${e}" failed to load after install \u2014 run \`claude plugin list\` to see why.`,
      );
    return "";
  }
  let userConfig = o.manifest.userConfig,
    s = userConfig && Object.keys(userConfig).length > 0 ? userConfig : void 0,
    any = m.map(parseConfigPair).some(({ key: key }) => !(s && Object.hasOwn(s, key))),
    { local: local, remoteCount: remoteCount } = mcpbSourcesOf(o),
    { bundles: bundles, unreadable: unreadable } =
      local.length > 0 && (o.enabled || any)
        ? await readBundledServerConfigs(o, local, r)
        : { bundles: [], unreadable: [] },
    S = { unreadable: unreadable, remoteCount: remoteCount };
  if (u) {
    if (!s && bundles.length === 0)
      throw Error(
        `--config was given but plugin "${e}" declares no userConfig options` +
          (local.length > unreadable.length ? " and its bundled MCP servers declare no user_config." : ".") +
          unconfigurableBundlesNote(S),
      );
    let { pluginPairs: pluginPairs, bundlePairs: bundlePairs } = splitPluginConfigArgs(m, s, bundles, S),
      U = s && pluginPairs.length > 0 ? applyConfigFlags(pluginPairs, s) : void 0,
      flattened = bundles.flatMap((x) => {
        let L = bundlePairs.get(x.serverName);
        return L ? [{ bundle: x, values: applyConfigFlags(L, x.schema, `${x.serverName}.`) }] : [];
      });
    if (s && U) await savePluginOptions(marketplaceSource(o), U, s, r);
    for (let { bundle: bundle, values: values } of flattened)
      (await saveMcpServerUserConfig(o.repository, bundle.serverName, values, bundle.schema, r),
        (bundle.existingConfig = (await loadMcpServerUserConfig(o.repository, bundle.serverName)) ?? {}));
  }
  let P = [];
  if (s) {
    let keys = Object.keys(await getUnconfiguredOptions(o));
    if (keys.length > 0) {
      let filtered = keys.filter((U) => s[U]?.required === !0);
      P.push(
        `${keys.length} userConfig ${plural(keys.length, "option")} not yet set` +
          (filtered.length > 0 ? ` (${filtered.length} required)` : "") +
          ` \u2014 run /plugin configure ${e} in Claude Code, or pass --config KEY=VALUE.`,
      );
    }
  }
  if (o.enabled)
    for (let E of bundles) {
      let A = missingConfigMessage(E, o.name);
      if (A) P.push(A);
    }
  return P.join(`
`);
}
/**
 * 安装 command 来源插件前展示将运行的命令并征得同意（-y/--yes 或 --accept-command）；策略禁用 command 来源时直接拒绝。
 */
//@ chunk-12wyw8h8.js:14713-15879 layout
async function confirmCommandSourceInstall(
  e,
  n,
  { yes: r = !1, acceptedCommand: p, acceptCommand: f, onShown: o, storageV5: m } = {},
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
  let command = n.source.command,
    g = o1(n.source);
  if (p === g && !isPluginsDirOnLocalDisk()) return;
  let s = {
    kind: "command_source",
    pluginId: e,
    command: command,
    mode: n.source.mode === "link" ? "link" : "copy",
    catalogRevision: await marketplaceRevision(e, m),
  };
  o?.({ ...W(s, f), ...(p !== void 0 && { previousAcceptance: p !== g ? "changed" : "unreliable" }) });
  let { name: h, marketplace: marketplace } = parsePluginIdentifier(e),
    w = printableName(h ?? "", 200),
    y = printableName(marketplace ?? "", 200),
    R =
      `"${w}" is installed by running a command from marketplace "${y}" on this machine` +
      (p === void 0
        ? ""
        : p !== g
          ? " \u2014 and that command (or how its output is used) CHANGED since you accepted it"
          : " \u2014 your earlier acceptance is recorded where it cannot be relied on (a plugins root inside a workspace, on a network location, or one that could not be resolved), so please confirm it again") +
      `:
  ${command}
  (${describeCommandSourceMode(n.source)})
`;
  writeToStdout(R);
  let S = await promptAcceptCommand({ yes: r, acceptCommand: f, shown: s, disclosure: R });
  return S === "accepted"
    ? { kind: "accepted", grantKey: g }
    : S === "declined"
      ? { kind: "declined" }
      : void 0;
}
//@ chunk-12wyw8h8.js:15879-16965 layout
async function promptAcceptCommand({
  yes: yes = !1,
  acceptCommand: acceptCommand,
  shown: shown,
  disclosure: disclosure = "",
}) {
  let f = process.stdout.isTTY && process.stdin.isTTY;
  if (yes || (shown !== void 0 && K(acceptCommand, shown))) {
    if (!isSpawnedByClaudeCodeSession()) return "accepted";
    if (!f)
      return (
        writeToStdout(`${yes ? "-y/--yes" : "--accept-command"} is ignored inside a Claude Code session: run this in your own terminal to accept the command shown above.
`),
        "unconfirmed"
      );
  }
  if (!f && acceptCommand !== void 0 && shown !== void 0 && !K(acceptCommand, shown))
    return (
      writeToStdout(`--accept-command does not name the command shown above (it may have changed since it was shown), so it was not run. Show it to the person again before accepting it.
`),
      "unconfirmed"
    );
  if (!f)
    return (
      writeToStdout(
        isSpawnedByClaudeCodeSession()
          ? `Not an interactive terminal, so the command was only displayed, not accepted. Run this in your own terminal (outside the Claude Code session) to confirm the command shown above.
`
          : `Not an interactive terminal, so the command was only displayed, not accepted. Re-run in a terminal to confirm it, or pass -y/--yes to accept the command shown above.
`,
      ),
      "unconfirmed"
    );
  return (await confirmPrompt("Run this command now?", process.stdin, {
    ignoreAnswersWithinMs: Agt,
    reaskPreamble: disclosure,
  }))
    ? "accepted"
    : "declined";
}
/**
 * 解析 install 目标：补全市场名并取 marketplace 条目，供展示 command/headersHelper 披露。
 */
//@ chunk-12wyw8h8.js:16965-17513 layout
async function resolveInstallTarget(e, n = {}, r) {
  if (parseNpmPluginId(e) !== null) return null;
  let { name: p, marketplace: marketplace } = parsePluginIdentifier(e);
  if (!p) return null;
  let o = marketplace ?? n.resolvedMarketplace;
  if (!o)
    try {
      o = (await findPluginInMarketplaces(p, r))?.marketplace;
    } catch (error) {
      if (error instanceof Bd) return null;
      throw error;
    }
  if (!o) return null;
  let m = `${p}@${o}`;
  if (await hasOnlyMissingDependencyIssues(m, n.scope ?? "user", r)) return null;
  let u = await archiveFetchWarning(m, void 0, r);
  if (u === null) return null;
  let g = `${archiveHelperDisclosure(u)}
`;
  writeToStdout(g);
  let s = await entryHelperTarget(u, m, r);
  n.onShown?.(W(s, n.acceptCommand));
  let h = await promptAcceptCommand({ yes: n.yes, acceptCommand: n.acceptCommand, shown: s, disclosure: g });
  return h === "accepted" ? u : h;
}
/**
 * 已安装插件的市场条目改成 command 来源时，检查并提示需要显式同意后再更新。
 */
//@ chunk-12wyw8h8.js:17513-18894 layout
async function checkCommandSourceSwitch(e, n = {}, r) {
  if (parseNpmPluginId(e) !== null) return;
  let { name: p, marketplace: marketplace } = parsePluginIdentifier(e);
  if (!p) return;
  let o = await loadKnownMarketplacesSafe(r),
    m = marketplace,
    u;
  if (!m) {
    let P;
    try {
      P = await findPluginInMarketplaces(p, r);
    } catch (error) {
      if (error instanceof Bd) return;
      throw error;
    }
    if (!P) return;
    ((m = P.marketplace), (u = P.entry), n.onResolvedMarketplace?.(m));
  }
  let g = Zb(o, m);
  if (isSourceDisallowedOrUnverifiable(g?.source)) return;
  let s = `${p}@${m}`,
    h = u && n.acceptCommand === void 0 ? { entry: u } : void 0;
  if (!h) {
    let P = await refreshBeforeScopedInstall(m, g, r);
    n.onMarketplaceRefreshResult?.(P);
    try {
      h = await getPluginById(s, r);
    } catch (error) {
      if (error instanceof Bd) return;
      throw error;
    }
  }
  let v = h ? wpe(h.entry.source) : void 0;
  if (!h || !v) return;
  let w =
      (isStorageV5Enabled() && r !== void 0 ? await loadInstalledPlugins(r) : loadInstalledPluginsSync())
        .plugins[s] ?? [],
    y = o1(v),
    R = !isPluginsDirOnLocalDisk(),
    S = R && w.some((P) => P.sourceCommand === y);
  if (await isPluginEnabledAndCachedAtScope(s, n.scope ?? "user", r)) {
    if (!S) {
      let all = w.every((E) => E.sourceCommand === void 0);
      writeToStdout(
        `"${printableName(parsePluginIdentifier(s).name ?? "", 200)}" is already installed, and its marketplace ` +
          (all
            ? "entry now installs it by running a command on this machine that has not been reviewed yet."
            : "has since changed the command that installs it (or how its output is used).") +
          ` Review and accept it: ${runCommandHint("plugin update", s, { extra: (n.scope ?? "user") === "user" ? void 0 : `--scope ${n.scope}`, fallback: "an explicit plugin update reviews it" })}.
`,
      );
    }
    return;
  }
  if (S) return { kind: "accepted", grantKey: y };
  return confirmCommandSourceInstall(s, h.entry, {
    yes: n.yes,
    acceptedCommand: R ? w.find((P) => P.sourceCommand !== void 0)?.sourceCommand : void 0,
    acceptCommand: n.acceptCommand,
    onShown: n.onShown,
    storageV5: r,
  });
}
/**
 * claude plugin install：调用 installPluginOp，打印结果与依赖/警告，记 tengu_plugin_installed_cli。
 */
//@ chunk-12wyw8h8.js:18894-20371 callgraph-fingerprint = installPlugin (0.272)
async function installPlugin(e, n = "user", r, p, f, o, m, u = {}) {
  let g = [];
  try {
    let s = await installPluginOp(
      u.resolvedPlugin ?? e,
      n,
      {
        shownSourceCommand: p,
        shownEntryHelper: f,
        announceRefreshResult: m,
        replaceInstalledCopy: u.replaceInstalledCopy,
        npmRegistry: u.npmRegistry,
        gitHubHttpsFallback: Eqs((S) => {
          g.push(S);
        }),
      },
      o,
    );
    if (!s.success) throw new PluginOperationFailedError(s.message, s);
    let h = s.pluginId || e,
      v = s.scope || n;
    logEvent("tengu_plugin_installed_cli", {
      ...(await pluginTelemetryFields(h, af(), o)),
      plugin_id: dpe(h),
      scope: fromEnum(v),
      install_source: lit("cli-explicit"),
      ...buildPluginVersionShaField(h, getInstalledGitCommitSha(h, { scope: v })),
      ...directoryInstallFields({ pluginId: h, surface: "cli", replaced: s.switched !== void 0 }),
      ...(s.aliasedId ? { aliased_id: !0, ...(s.reenabled && { reenabled: !0 }) } : {}),
    });
    let w = "",
      y = r && r.length > 0 ? !0 : void 0;
    try {
      if (s.nothingWritten) {
        if (y)
          ((w = `${re.warning} --config values were not saved, because this command changed nothing. To set them, run /plugin configure ${s.pluginId || e} in Claude Code.`),
            (y = !1));
      } else w = await configurePluginFromFlags(s.pluginId || e, r, o);
    } catch (error) {
      let P = errorMessage(error);
      if (
        (logForDebugging(`post-install userConfig step failed: ${P}`, { level: "warn" }), r && r.length > 0)
      )
        ((w = `${re.warning} Installed, but --config not applied: ${P}`), (y = !1));
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
      u.json ? { scope: n, shownCommand: u.shownCommand } : void 0,
      error instanceof PluginOperationFailedError && error.result.aliasedId ? error.result.pluginId : void 0,
      g,
    );
  }
}
//@ chunk-12wyw8h8.js:20371-20524 layout
async function findOrphanedAutoInstalls(e, n) {
  let r = getProjectPathForScope(e),
    { enabled: enabled, disabled: disabled } = await loadAllPluginsCacheOnly(
      isStorageV5Enabled() ? n : void 0,
    );
  return findOrphanedAutoDependencies(
    (isStorageV5Enabled() && n !== void 0 ? await loadInstalledPlugins(n) : loadInstalledPluginsSync())
      .plugins,
    [...enabled, ...disabled],
    e,
    r,
  );
}
/**
 * 把 CLI 参数里的插件名解析成实际插件 ID（别名、已安装副本），返回 {plugin, aliased}。
 */
//@ chunk-12wyw8h8.js:20524-20975 layout
async function resolvePluginArgument(
  e,
  n,
  r,
  { unlessNamedInSettings: p = !1, unlessDirectoryNameHeld: f = !1 } = {},
) {
  {
    let o = await installSelectedPlugins(e, r);
    if (o && !(p && isPluginInSettings(e))) {
      if (f && VS(e)) {
        let u = await lpe().catch(() => {
          return;
        });
        if (u === void 0 || xSe(u) || findBindingKeysFor(u.keys(), e).length > 0)
          return { plugin: e, aliased: !1 };
      }
      let pluginId = o.installed.pluginId;
      if (!n)
        writeToStdout(`${stripInvisibleKeepEmoji(`"${quotedPrintable(e, 120)}" is installed as ${pluginId} (the same plugin from ${marketplaceDisplayName(parsePluginIdentifier(pluginId).marketplace ?? "")}).`)}
`);
      return { plugin: pluginId, aliased: !0 };
    }
  }
  return { plugin: e, aliased: !1 };
}
/**
 * claude plugin uninstall：解析插件名，调用 uninstallPluginOp，记 tengu_plugin_uninstalled_cli。
 */
//@ chunk-12wyw8h8.js:20975-22074 fingerprint = uninstallPlugin (0.306)
async function uninstallPlugin(e, n = "user", r = !1, p = !1, f = !1, o, m = {}) {
  let u = { plugin: e, aliased: !1 };
  try {
    u = await resolvePluginArgument(e, m.json, o, { unlessDirectoryNameHeld: !0 });
    let g = await uninstallPluginOp(u.plugin, n, !r, o);
    if (!g.success) throw new PluginOperationFailedError(g.message, g);
    await logEventAsync("tengu_plugin_uninstalled_cli", {
      ...(await pluginTelemetryFields(g.pluginId || u.plugin, af(), o)),
      scope: fromEnum(g.scope || n),
      ...(u.aliased ? { aliased_id: !0 } : {}),
      ...(g.savedKept !== void 0 && { saved_kept: !0 }),
    });
    let s = !1,
      h = async (v) => {
        if (m.json)
          await writePluginResult({
            command: "uninstall",
            outcome: "ok",
            plugin: e,
            pluginId: g.pluginId,
            scope: g.scope || n,
            keptData: g.dataDirKept ?? r,
            ...(g.savedKept !== void 0 && { savedKept: g.savedKept.reason }),
            message: stripInvisibleKeepNewlines(v),
          });
        return v;
      };
    try {
      let v = await findOrphanedAutoInstalls(n, o);
      if (p)
        return (
          writeToStdout(`${re.tick} ${stripInvisibleKeepEmoji(g.message)}
`),
          (s = !0),
          await pruneOrphanedPlugins(v, n, { dryRun: !1, yes: f, deleteDataDir: !r }, o)
        );
      return h(g.message + formatOrphanedDependenciesNotice(v.orphans, n));
    } catch (error) {
      logError(
        withTelemetryMessage(
          toError(error),
          "claude plugin uninstall: post-uninstall orphan scan or prune failed",
        ),
      );
      let y = `(${p ? "prune" : "orphan scan"} failed: ${errorMessage(error)})`;
      if (s) return y;
      let R = p ? `${re.tick} ${g.message}` : g.message;
      return h(`${R}
${y}`);
    }
  } catch (error) {
    return handlePluginCommandError(
      error,
      "uninstall",
      e,
      o,
      m.json ? { scope: n } : void 0,
      u.aliased ? u.plugin : void 0,
    );
  }
}
/**
 * claude plugin prune：找出作用域内不再被任何插件依赖的自动安装（auto）插件并卸载（可 --dry-run）。
 */
//@ chunk-12wyw8h8.js:22074-22244 layout
async function prunePluginsCli(e = "user", { dryRun: n = !1, yes: r = !1 } = {}, p) {
  try {
    let f = await findOrphanedAutoInstalls(e, p);
    return await pruneOrphanedPlugins(f, e, { dryRun: n, yes: r, deleteDataDir: !0 }, p);
  } catch (error) {
    return handlePluginCommandError(error, "prune");
  }
}
//@ chunk-12wyw8h8.js:22244-23480 layout
async function pruneOrphanedPlugins(e, n, r, p) {
  if (e.unloadable.length > 0)
    return `Skipped \u2014 cannot determine orphans: ${e.unloadable.map(stripInvisibleKeepEmoji).join(", ")} failed to load. Fix or uninstall, then retry.`;
  if (e.orphans.size === 0)
    return e.autoCount === 0
      ? `Nothing to prune (no auto-installed plugins at ${n} scope).`
      : `Nothing to prune (${e.autoCount} auto-installed ${plural(e.autoCount, "plugin", "plugins")} at ${n} scope, all still needed).`;
  let plugins = (
      isStorageV5Enabled() && p !== void 0 ? await loadInstalledPlugins(p) : loadInstalledPluginsSync()
    ).plugins,
    o = getProjectPathForScope(n),
    mapped = [...e.orphans].map((s) => {
      let h = qP(plugins[s], n, o);
      return `  ${stripInvisibleKeepEmoji(s)}${h?.version ? ` (${stripInvisibleKeepEmoji(h.version)})` : ""}`;
    }),
    u = `${e.orphans.size} auto-installed ${plural(e.orphans.size, "plugin", "plugins")} no longer needed at ${n} scope:
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
    if (
      (writeToStdout(`${u}
`),
      !(await confirmPrompt("Remove?")))
    )
      return "Aborted.";
  }
  let g = await pruneOrphanedAutoDeps(e.orphans, n, o, { deleteDataDir: r.deleteDataDir }, p);
  return (
    await logEventAsync("tengu_plugin_prune_cli", { scope: fromEnum(n), removed_count: g.length }),
    `Removed ${g.length} auto-installed ${plural(g.length, "plugin", "plugins")}: ${g.map((s) => stripInvisibleKeepEmoji(parsePluginIdentifier(s).name)).join(", ")}`
  );
}
/**
 * claude plugin disable：调用 disablePluginOp 并输出结果。
 */
//@ chunk-12wyw8h8.js:23480-24055 fingerprint = disablePlugin (0.565)
async function disablePlugin(e, n, r, p = {}) {
  let f = { plugin: e, aliased: !1 };
  try {
    f = await resolvePluginArgument(e, p.json, r, { unlessNamedInSettings: !0 });
    let o = await disablePluginOp(f.plugin, n, r);
    if (!o.success) throw new PluginOperationFailedError(o.message, o);
    await logEventAsync("tengu_plugin_disabled_cli", {
      ...(await pluginTelemetryFields(o.pluginId || f.plugin, af(), r)),
      scope: fromEnumOpt(o.scope),
      ...(f.aliased ? { aliased_id: !0 } : {}),
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
    return `${re.tick} ${m}`;
  } catch (error) {
    return handlePluginCommandError(
      error,
      "disable",
      e,
      r,
      p.json ? { scope: n } : void 0,
      f.aliased ? f.plugin : void 0,
    );
  }
}
/**
 * claude plugin disable --all：禁用全部可禁用插件（组织要求的插件除外）。
 */
//@ chunk-12wyw8h8.js:24055-24375 fingerprint = disableAllPlugins (0.738)
async function disableAllPlugins(e, n = {}) {
  try {
    let r = await listRequiredPlugins(e);
    if (!r.success) throw new PluginOperationFailedError(r.message, r);
    if ((await logEventAsync("tengu_plugin_disabled_all_cli", {}), n.json))
      await writePluginResult({
        command: "disable",
        outcome: "ok",
        all: !0,
        message: stripInvisibleKeepNewlines(r.message),
      });
    return `${re.tick} ${r.message}`;
  } catch (error) {
    return handlePluginCommandError(error, "disable-all", void 0, void 0, n.json ? {} : void 0);
  }
}
/**
 * claude plugin update：检查并更新插件（显式模式，处理 headersHelper/command 来源确认），输出版本变化。
 */
//@ chunk-12wyw8h8.js:24375-26148 fingerprint = updatePluginCli (0.378)
async function updatePluginCli(e, n, { yes: r = !1, json: p = !1, acceptCommand: f } = {}, o) {
  let m,
    u,
    g = { plugin: e, aliased: !1 };
  try {
    if (((g = await resolvePluginArgument(e, p, o)), !p))
      writeToStdout(`${stripInvisibleKeepEmoji(`Checking for updates for plugin "${g.plugin}"${n ? ` at ${n} scope` : ""}\u2026`)}
`);
    let s = await updatePluginOp(
        g.plugin,
        n,
        {
          explicit: !0,
          onEntryHelperDisclosure: async (w, y, R) => {
            writeToStdout(`${w}
`);
            let S = await entryHelperTarget(y, R, o),
              P = await promptAcceptCommand({
                yes: r,
                acceptCommand: f,
                shown: S,
                disclosure: `${w}
`,
              });
            return ((u = P === "accepted" ? void 0 : W(S, f)), P);
          },
          announceCommandSource: async (w, y, R) => {
            let S = await confirmCommandSourceInstall(w, y, {
              yes: r,
              acceptedCommand: R,
              acceptCommand: f,
              onShown: (P) => {
                u = P;
              },
              storageV5: o,
            });
            if (S?.kind === "accepted") u = void 0;
            if (S?.kind === "declined")
              throw new Bd(
                "Aborted \u2014 the command was not run.",
                "plugin command source declined at the prompt",
              );
            return S?.grantKey;
          },
        },
        o,
      ),
      h = stripInvisibleKeepEmoji(s.message);
    m = s.pluginId;
    let { outcome: outcome } = s;
    if (outcome === "failed") {
      if (s.failureCode !== void 0 && isSadFailureCode(s.failureCode))
        throw new Bd(h, `${Z_n}${s.failureCode}`);
      throw new PluginOperationFailedError(h, { failureCode: s.failureCode, pluginId: s.pluginId });
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
      if (s.folderNote !== void 0)
        writeToStdout(`${stripInvisibleKeepEmoji(s.folderNote)}
`);
      writeToStdout(`${re.tick} ${h}
`);
    }
    if (s.outcome === "updated") {
      let w = s.pluginId || g.plugin;
      logEvent("tengu_plugin_updated_cli", {
        ...(await pluginTelemetryFields(w, af(), o)),
        old_version: sanitizeVersion(s.oldVersion),
        new_version: sanitizeVersion(s.newVersion),
        ...buildPluginVersionShaField(w, s.gitCommitSha),
        ...(g.aliased ? { aliased_id: !0 } : {}),
      });
    }
    if (g.aliased) await logFeatureOkAsync("cli_plugin_update", { aliased_id: !0 });
    else await logFeatureOkAsync("cli_plugin_update");
    await gracefulShutdown(0);
  } catch (error) {
    return handlePluginCommandError(
      error,
      "update",
      e,
      o,
      p ? { scope: n, pluginId: m, shownCommand: u } : void 0,
      g.aliased ? g.plugin : void 0,
    );
  }
}

export {
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
  readResultNonce,
};
