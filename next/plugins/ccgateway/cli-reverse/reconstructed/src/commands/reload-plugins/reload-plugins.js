/**
 * commands/reload-plugins/reload-plugins.ts
 *
 * /reload-plugins 实现：在当前会话激活待生效的插件变更（远程会话转发）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/reload-plugins/reload-plugins.ts
 * pieces: chunk-8vqp1nqq.js (27)
 * attribution: sole-consumer 26, fingerprint 1
 */
import { lstat, readdir, stat } from "fs/promises";
import { basename, join } from "path";
import { getErrnoCode } from "../../utils/errors.js";
import {
  WATCH_CLOCK_SLACK_MS,
  isIgnoredWatchPath,
  isInsideTypesDir,
} from "../../plugins/functionHooks/devModsWatch.js";
import { getDebugLogPath } from "../../utils/debug.js";
import { withDeadline } from "../../utils/sleep.js";
import { printableName, printableOrEmpty } from "../../utils/printableName.js";
import { getDisplayPath } from "../../utils/file.js";
import { plural } from "../../utils/stringUtils.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { array, unknown, objectSchema, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { isRemoteControlChannelAvailable, getRemoteCaps } from "../../remote/remoteMode.js";
import { parseThinClientReply } from "../../cli/thinClient.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import {
  ensureCatalogForOfficialDeps,
  resolveMissingDependencies,
} from "../../utils/plugins/dependencyInstall.js";
import { computePluginReloadImpact, logReloadPluginsImpact } from "../../utils/plugins/reloadImpact.js";
import { PluginsStateStore } from "../../utils/plugins/pluginLoadStatus.js";
import { retryUnloadedModules } from "../../plugins/functionHooks/hooksModuleLoader.js";
import { refreshActivePlugins } from "../../utils/plugins/refresh.js";
import { formatDependencyCountSuffix } from "../../utils/plugins/dependencyResolver.js";
import { OFFICIAL_MARKETPLACE_DISPLAY } from "../../utils/plugins/officialMarketplaceNames.js";
import { isLocalStdinSubmission } from "../../utils/promptSubmissionOrigin.js";
import { stripInvisibleKeepEmoji } from "../../utils/settings/marketplaceSettingsAliases.js";

//@ chunk-8vqp1nqq.js:12207-12250 sole-consumer
var IGNORABLE_FS_ERROR_CODES = Object.freeze(["ENOENT", "ENOTDIR"]);
//@ chunk-8vqp1nqq.js:12250-12283 sole-consumer
var isIgnorableFsError = (error) => IGNORABLE_FS_ERROR_CODES.includes(getErrnoCode(error) ?? "");
//@ chunk-8vqp1nqq.js:12283-12368 sole-consumer
function maxFreshMtime(mtimeCandidates, fallback) {
  let filtered = mtimeCandidates.filter((mtime) => mtime <= fallback + WATCH_CLOCK_SLACK_MS);
  return Math.max(0, ...(filtered.length > 0 ? filtered : [fallback]));
}
//@ chunk-8vqp1nqq.js:12368-12519 sole-consumer
var statWrittenAt = (path, fallback) =>
  lstat(path).then(
    (stats) => ({
      path,
      writtenAt: maxFreshMtime([stats.mtimeMs, stats.ctimeMs], fallback),
      isFolder: stats.isDirectory(),
    }),
    (error) => ({
      path,
      writtenAt: isIgnorableFsError(error) ? 0 : fallback,
      isFolder: false,
    }),
  );
//@ chunk-8vqp1nqq.js:12519-12530 sole-consumer
var PLUGIN_SCAN_CAP_MS = 1e4;
//@ chunk-8vqp1nqq.js:12530-12542 sole-consumer
var PLUGIN_SCAN_DEADLINE_MARGIN_MS = 2000;
//@ chunk-8vqp1nqq.js:12542-12582 sole-consumer
var pluginScanBudget = (startedAt, cap = PLUGIN_SCAN_CAP_MS) => ({
  cap,
  deadline: startedAt + PLUGIN_SCAN_DEADLINE_MARGIN_MS,
});
//@ chunk-8vqp1nqq.js:12582-12591 sole-consumer
var SCAN_BATCH_SIZE = 64;
//@ chunk-8vqp1nqq.js:12591-12745 sole-consumer
async function mapInBatchesUntil(items, mapper, deadline) {
  let results = [];
  for (let offset = 0; offset < items.length; offset += SCAN_BATCH_SIZE) {
    if (Date.now() > deadline) return;
    let sliced = items.slice(offset, offset + SCAN_BATCH_SIZE);
    results.push(...(await Promise.all(sliced.map(mapper))));
  }
  return results;
}
//@ chunk-8vqp1nqq.js:12846-12894 sole-consumer
var PLUGIN_CONFIG_FILE_NAMES = Object.freeze([".lsp.json", ".mcp.json"]);
//@ chunk-8vqp1nqq.js:12894-12954 sole-consumer
var shouldWatchPath = (rootDir, watchedPath) =>
  (!isIgnoredWatchPath(watchedPath, getDebugLogPath()) ||
    PLUGIN_CONFIG_FILE_NAMES.includes(basename(watchedPath))) &&
  !isInsideTypesDir(rootDir, watchedPath);
//@ chunk-8vqp1nqq.js:12954-13046 sole-consumer
var listWatchedChildren = (rootDir, parentDir) =>
  readdir(parentDir).then(
    (entries) =>
      entries
        .map((entryName) => join(parentDir, entryName))
        .filter((childPath) => shouldWatchPath(rootDir, childPath)),
    (error) => (isIgnorableFsError(error) ? [] : undefined),
  );
//@ chunk-8vqp1nqq.js:13082-13154 sole-consumer
var latestMtimeOfPath = (dir, fallback) =>
  stat(dir).then(
    (stats) => maxFreshMtime([stats.mtimeMs, stats.ctimeMs], fallback),
    (error) => (isIgnorableFsError(error) ? 0 : fallback),
  );
//@ chunk-8vqp1nqq.js:13154-13533 sole-consumer
/**
 * 判断插件目录自上次读取后是否有改动：先看目录本身，再按层（数量上限、截止时间内）遍历子项 mtime/ctime；超时或无法读取时视为已改动。
 */
async function folderChangedSince(dir, readAt, budget) {
  let now = Date.now();
  let changedAfter = readAt - WATCH_CLOCK_SLACK_MS;
  let dirChanged = (await latestMtimeOfPath(dir, now)) > changedAfter;
  let pendingDirs = dirChanged ? [] : [dir];
  let cap = budget.cap;
  while (pendingDirs.length > 0) {
    let childLists = await mapInBatchesUntil(
      pendingDirs,
      (pendingDir) => listWatchedChildren(dir, pendingDir),
      budget.deadline,
    );
    let flattened = (childLists ?? []).flatMap((childList) => childList ?? []);
    let writtenStats =
      childLists === undefined || childLists.includes(undefined) || flattened.length > cap
        ? undefined
        : await mapInBatchesUntil(flattened, (filePath) => statWrittenAt(filePath, now), budget.deadline);
    if (writtenStats?.some((fileStat) => fileStat.writtenAt > changedAfter) ?? true) return true;
    cap -= flattened.length;
    pendingDirs = (writtenStats ?? [])
      .filter((folderStat) => folderStat.isFolder)
      .map((folderStat) => folderStat.path);
  }
  return dirChanged;
}
//@ chunk-8vqp1nqq.js:13533-13645 sole-consumer
async function folderChangedWithin(dir, readAt, budget = pluginScanBudget(Date.now())) {
  let remainingMs = budget.deadline - Date.now();
  return (
    (remainingMs > 0
      ? await withDeadline(folderChangedSince(dir, readAt, budget), remainingMs)
      : undefined) ?? true
  );
}
//@ chunk-8vqp1nqq.js:13645-13820 sole-consumer
var pluginsChangedOnDisk = (folderReadAt, plugins, budget) =>
  plugins.reduce(async (acc, plugin) => {
    let loadedPlugins = await acc;
    let readAt = folderReadAt.get(plugin.source);
    return plugin.readFromFolderAt !== undefined &&
      readAt !== undefined &&
      (await folderChangedWithin(plugin.path, readAt, budget))
      ? loadedPlugins.concat(plugin)
      : loadedPlugins;
  }, Promise.resolve([]));
//@ chunk-8vqp1nqq.js:13820-13853 sole-consumer
var pluginSourceLabel = (plugin) => `\`${printableName(plugin.source)}\``;
//@ chunk-8vqp1nqq.js:13853-13922 sole-consumer
var rereadPluginLine = (plugin) =>
  `${pluginSourceLabel(plugin)} re-read from its folder: \`${printableOrEmpty(getDisplayPath(plugin.path))}\``;
//@ chunk-8vqp1nqq.js:13922-13930 sole-consumer
var MAX_LISTED_EXTRA_PLUGINS = 5;
//@ chunk-8vqp1nqq.js:13930-14036 sole-consumer
var alsoRereadFromFoldersLine = (plugins) =>
  `Also re-read from ${plural(plugins.length, "its folder", "their folders")}: ` +
  plugins.map((plugin) => pluginSourceLabel(plugin)).join(", ");
//@ chunk-8vqp1nqq.js:14036-14172 sole-consumer
async function describeRereadPlugins(folderReadAt, plugins) {
  let changedPlugins = await pluginsChangedOnDisk(folderReadAt, plugins, pluginScanBudget(Date.now()));
  let plugins_2 = changedPlugins.slice(MAX_LISTED_EXTRA_PLUGINS);
  return changedPlugins
    .slice(0, MAX_LISTED_EXTRA_PLUGINS)
    .map((plugin) => rereadPluginLine(plugin))
    .concat(plugins_2.length > 0 ? [alsoRereadFromFoldersLine(plugins_2)] : []);
}
//@ chunk-8vqp1nqq.js:14172-14293 sole-consumer
function recordFolderReadAt(enabled) {
  let { folderReadAt } = getPluginRegistry();
  for (let plugin of enabled)
    if (plugin.readFromFolderAt !== undefined) folderReadAt.set(plugin.source, plugin.readFromFolderAt);
}
//@ chunk-8vqp1nqq.js:14293-16985 fingerprint (2.1.88 match: call, 0.457)
/**
 * /reload-plugins：we 为远程 reload_plugins 结果 schema；call 在远程会话转发控制请求，本地则计算 MCP/LSP 变更是否会使缓存失效（未 --force 时先警告），再刷新插件、补装缺失依赖并汇报。
 */
var remoteReloadResultSchema = DoctorLazy(() => {
  let listSchema = array(unknown()).optional().catch(undefined);
  return objectSchema({
    plugins: listSchema,
    commands: listSchema,
    agents: listSchema,
    mcpServers: listSchema,
    error_count: numberSchema().catch(0),
  });
});
var REMOTE_RELOAD_UNAVAILABLE = "/reload-plugins isn't available over a remote connection in this session.";
var PLUGIN_MCP_NEXT_SESSION_NOTE = "Plugin MCP server changes take effect in your next session.";
var call = async (args, context) => {
  if (!canReloadPlugins(context))
    return {
      type: "text",
      value: REMOTE_RELOAD_UNAVAILABLE,
    };
  if (isRemoteControlChannelAvailable()) {
    let thinClientReply = parseThinClientReply(
      "reload_plugins",
      remoteReloadResultSchema(),
      await getRemoteCaps().sendControlRequest(
        {
          subtype: "reload_plugins",
        },
        {
          signal: context.abortController.signal,
        },
      ),
    );
    if (
      !thinClientReply ||
      (thinClientReply.plugins ??
        thinClientReply.commands ??
        thinClientReply.agents ??
        thinClientReply.mcpServers) === undefined
    )
      return {
        type: "text",
        value: "Reloaded on remote.",
      };
    let value = `Reloaded on remote: ${[countWithNoun(thinClientReply.plugins?.length ?? 0, "plugin"), countWithNoun(thinClientReply.commands?.length ?? 0, "skill"), countWithNoun(thinClientReply.agents?.length ?? 0, "agent"), countWithNoun(thinClientReply.mcpServers?.length ?? 0, "plugin MCP server")].join(" \xB7 ")}`;
    if (thinClientReply.error_count > 0)
      value += `
${countWithNoun(thinClientReply.error_count, "error")} during load. Run /plugin on the remote for details.`;
    return {
      type: "text",
      value,
    };
  }
  let any = args
    .trim()
    .split(/\s+/)
    .some((token) => token === "--force" || token === "force");
  let isNonInteractiveSession = context.options.isNonInteractiveSession;
  invalidateCommandNames();
  let plugins = context.getAppState().plugins;
  let catalogForOfficialDeps = await ensureCatalogForOfficialDeps(
    [...plugins.enabled, ...plugins.disabled, ...plugins.errors].map((plugin) => plugin.source),
    context.storageV5,
  );
  let impact = await computePluginReloadImpact({
    model: context.options.mainLoopModel,
    mcpClients: context.getAppState().mcp.clients,
    dynamicMcpConfig: context.options.dynamicMcpConfig,
    storageV5: context.storageV5,
    credentials: context.credentials,
  });
  let warning = any ? null : cacheInvalidationWarning(impact, isNonInteractiveSession);
  if (warning !== null) {
    logReloadPluginsImpact(impact, {
      warned: true,
      forced: false,
    });
    return {
      type: "text",
      value: warning,
    };
  }
  let warningLine = null;
  let impact_2 = impact;
  let pluginsStore = PluginsStateStore.over({
    getState: context.getAppState,
    setState: context.setAppState,
  });
  try {
    retryUnloadedModules();
    let refreshed = await refreshActivePlugins(pluginsStore, context.storageV5, context.credentials);
    let resultSuffix = "";
    let missingDependencies = await resolveMissingDependencies(refreshed.errors, context.storageV5);
    if (missingDependencies.installed.length > 0) {
      let nextImpact = any
        ? null
        : await computePluginReloadImpact({
            model: context.options.mainLoopModel,
            mcpClients: context.getAppState().mcp.clients,
            dynamicMcpConfig: context.options.dynamicMcpConfig,
            storageV5: context.storageV5,
            credentials: context.credentials,
          });
      warningLine =
        nextImpact === null ? null : cacheInvalidationWarning(nextImpact, isNonInteractiveSession);
      if (nextImpact !== null && warningLine !== null) {
        impact_2 = nextImpact;
        resultSuffix = `${formatDependencyCountSuffix(missingDependencies.installed)} installed but not applied`;
        pluginsStore.markNeedsRefresh();
      } else {
        resultSuffix = `${formatDependencyCountSuffix(missingDependencies.installed)} resolved`;
        refreshed = await refreshActivePlugins(pluginsStore, context.storageV5, context.credentials);
      }
    }
    let summaryText = `Reloaded: ${[countWithNoun(refreshed.enabled_count, "plugin"), countWithNoun(refreshed.command_count + refreshed.skill_count, "skill"), countWithNoun(refreshed.agent_count, "agent"), countWithNoun(refreshed.hook_count, "hook"), ...(isNonInteractiveSession ? [] : [countWithNoun(refreshed.mcp_count, "plugin MCP server")]), countWithNoun(refreshed.lsp_count, "plugin LSP server")].join(" \xB7 ")}${resultSuffix}`;
    for (let line of await describeRereadPlugins(
      new Map(getPluginRegistry().folderReadAt),
      pluginsStore.get().enabled,
    ))
      summaryText += `
${line}`;
    recordFolderReadAt(pluginsStore.get().enabled);
    if (isNonInteractiveSession && impact.mcpServersAdded.length + impact.mcpServersRemoved.length > 0)
      summaryText += `
${PLUGIN_MCP_NEXT_SESSION_NOTE}`;
    if (warningLine !== null)
      summaryText += `
${warningLine}`;
    if (catalogForOfficialDeps === "unreachable")
      summaryText += `
The ${OFFICIAL_MARKETPLACE_DISPLAY} could not be reached, so its plugins were not loaded. Try /reload-plugins again in a few minutes.`;
    if (refreshed.error_count > 0)
      summaryText += `
${countWithNoun(refreshed.error_count, "error")} during load. Run /plugin for details.`;
    return {
      type: "text",
      value: summaryText,
    };
  } finally {
    logReloadPluginsImpact(impact_2, {
      warned: warningLine !== null,
      forced: any,
    });
  }
};
//@ chunk-8vqp1nqq.js:16985-17049 sole-consumer
function canReloadPlugins(context) {
  return !context.options.isNonInteractiveSession || isLocalStdinSubmission(context);
}
//@ chunk-8vqp1nqq.js:17049-17304 sole-consumer
function cacheInvalidationWarning(impact, isNonInteractiveSession) {
  if (!impact.wouldInvalidateCache) return null;
  if (!isNonInteractiveSession)
    return describeCacheInvalidation({
      added: impact.mcpServersAdded,
      removed: impact.mcpServersRemoved,
      lspToolChange: impact.lspToolChange,
    });
  if (impact.lspToolChange === null) return null;
  return describeCacheInvalidation({
    added: [],
    removed: [],
    lspToolChange: impact.lspToolChange,
  });
}
//@ chunk-8vqp1nqq.js:17304-17343 sole-consumer
function countWithNoun(value, noun) {
  return `${value} ${plural(value, noun)}`;
}
//@ chunk-8vqp1nqq.js:17343-17886 sole-consumer
/**
 * 生成"本次重载会使提示缓存失效"的说明：列出变化的 MCP 服务器和 LSP 工具变化，提示下一条消息将重读整个对话，可用 --force 强制应用。
 */
function describeCacheInvalidation(change) {
  let changedServers = [...change.added, ...change.removed];
  let [onlyServer] = changedServers;
  let serverLabel =
    changedServers.length === 1 && onlyServer !== undefined
      ? stripInvisibleKeepEmoji(onlyServer.split(":").slice(2).join(":") || onlyServer)
      : `${changedServers.length} MCP servers`;
  let effects = [];
  if (changedServers.length > 0) effects.push(`changes MCP tools (${serverLabel})`);
  if (change.lspToolChange !== null)
    effects.push(
      change.lspToolChange === "may-add"
        ? "may add the LSP tool"
        : change.lspToolChange === "may-remove"
          ? "may remove the LSP tool"
          : `${change.lspToolChange} the LSP tool`,
    );
  return (
    `This reload ${effects.join(" and ")} \u2014 your next message will re-read ` +
    "the whole conversation instead of using the cache. Run /reload-plugins --force to apply."
  );
}
export { PLUGIN_MCP_NEXT_SESSION_NOTE, REMOTE_RELOAD_UNAVAILABLE, call, describeCacheInvalidation };
