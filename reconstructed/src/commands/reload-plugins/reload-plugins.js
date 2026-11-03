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
import { array, unknown, u, E } from "../../../vendor/zod/v4/classic/schemas.js";
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
var ee = Object.freeze(["ENOENT", "ENOTDIR"]);
//@ chunk-8vqp1nqq.js:12250-12283 sole-consumer
var isIgnorableFsError = (error) => ee.includes(getErrnoCode(error) ?? "");
//@ chunk-8vqp1nqq.js:12283-12368 sole-consumer
function maxFreshMtime(e, o) {
  let filtered = e.filter((n) => n <= o + WATCH_CLOCK_SLACK_MS);
  return Math.max(0, ...(filtered.length > 0 ? filtered : [o]));
}
//@ chunk-8vqp1nqq.js:12368-12519 sole-consumer
var statWrittenAt = (e, o) =>
  lstat(e).then(
    (r) => ({
      path: e,
      writtenAt: maxFreshMtime([r.mtimeMs, r.ctimeMs], o),
      isFolder: r.isDirectory(),
    }),
    (error) => ({
      path: e,
      writtenAt: isIgnorableFsError(error) ? 0 : o,
      isFolder: false,
    }),
  );
//@ chunk-8vqp1nqq.js:12519-12530 sole-consumer
var PLUGIN_SCAN_CAP_MS = 1e4;
//@ chunk-8vqp1nqq.js:12530-12542 sole-consumer
var PLUGIN_SCAN_DEADLINE_MARGIN_MS = 2000;
//@ chunk-8vqp1nqq.js:12542-12582 sole-consumer
var pluginScanBudget = (e, cap = PLUGIN_SCAN_CAP_MS) => ({
  cap,
  deadline: e + PLUGIN_SCAN_DEADLINE_MARGIN_MS,
});
//@ chunk-8vqp1nqq.js:12582-12591 sole-consumer
var SCAN_BATCH_SIZE = 64;
//@ chunk-8vqp1nqq.js:12591-12745 sole-consumer
async function mapInBatchesUntil(e, o, deadline) {
  let n = [];
  for (let i = 0; i < e.length; i += SCAN_BATCH_SIZE) {
    if (Date.now() > deadline) return;
    let sliced = e.slice(i, i + SCAN_BATCH_SIZE);
    n.push(...(await Promise.all(sliced.map(o))));
  }
  return n;
}
//@ chunk-8vqp1nqq.js:12846-12894 sole-consumer
var ae = Object.freeze([".lsp.json", ".mcp.json"]);
//@ chunk-8vqp1nqq.js:12894-12954 sole-consumer
var shouldWatchPath = (e, o) =>
  (!isIgnoredWatchPath(o, getDebugLogPath()) || ae.includes(basename(o))) && !isInsideTypesDir(e, o);
//@ chunk-8vqp1nqq.js:12954-13046 sole-consumer
var listWatchedChildren = (dir, o) =>
  readdir(o).then(
    (r) => r.map((n) => join(o, n)).filter((n) => shouldWatchPath(dir, n)),
    (error) => (isIgnorableFsError(error) ? [] : undefined),
  );
//@ chunk-8vqp1nqq.js:13082-13154 sole-consumer
var latestMtimeOfPath = (dir, o) =>
  stat(dir).then(
    (r) => maxFreshMtime([r.mtimeMs, r.ctimeMs], o),
    (error) => (isIgnorableFsError(error) ? 0 : o),
  );
//@ chunk-8vqp1nqq.js:13154-13533 sole-consumer
/**
 * 判断插件目录自上次读取后是否有改动：先看目录本身，再按层（数量上限、截止时间内）遍历子项 mtime/ctime；超时或无法读取时视为已改动。
 */
async function folderChangedSince(dir, readAt, budget) {
  let now = Date.now();
  let i = readAt - WATCH_CLOCK_SLACK_MS;
  let m = (await latestMtimeOfPath(dir, now)) > i;
  let a = m ? [] : [dir];
  let cap = budget.cap;
  while (a.length > 0) {
    let d = await mapInBatchesUntil(a, (s) => listWatchedChildren(dir, s), budget.deadline);
    let flattened = (d ?? []).flatMap((s) => s ?? []);
    let t =
      d === undefined || d.includes(undefined) || flattened.length > cap
        ? undefined
        : await mapInBatchesUntil(flattened, (s) => statWrittenAt(s, now), budget.deadline);
    if (t?.some((s) => s.writtenAt > i) ?? true) return true;
    cap -= flattened.length;
    a = (t ?? []).filter((s) => s.isFolder).map((s) => s.path);
  }
  return m;
}
//@ chunk-8vqp1nqq.js:13533-13645 sole-consumer
async function folderChangedWithin(dir, readAt, budget = pluginScanBudget(Date.now())) {
  let n = budget.deadline - Date.now();
  return (n > 0 ? await withDeadline(folderChangedSince(dir, readAt, budget), n) : undefined) ?? true;
}
//@ chunk-8vqp1nqq.js:13645-13820 sole-consumer
var pluginsChangedOnDisk = (e, o, r) =>
  o.reduce(async (acc, i) => {
    let m = await acc;
    let a = e.get(i.source);
    return i.readFromFolderAt !== undefined && a !== undefined && (await folderChangedWithin(i.path, a, r))
      ? m.concat(i)
      : m;
  }, Promise.resolve([]));
//@ chunk-8vqp1nqq.js:13820-13853 sole-consumer
var pluginSourceLabel = (e) => `\`${printableName(e.source)}\``;
//@ chunk-8vqp1nqq.js:13853-13922 sole-consumer
var rereadPluginLine = (e) =>
  `${pluginSourceLabel(e)} re-read from its folder: \`${printableOrEmpty(getDisplayPath(e.path))}\``;
//@ chunk-8vqp1nqq.js:13922-13930 sole-consumer
var MAX_LISTED_EXTRA_PLUGINS = 5;
//@ chunk-8vqp1nqq.js:13930-14036 sole-consumer
var alsoRereadFromFoldersLine = (e) =>
  `Also re-read from ${plural(e.length, "its folder", "their folders")}: ` +
  e.map((o) => pluginSourceLabel(o)).join(", ");
//@ chunk-8vqp1nqq.js:14036-14172 sole-consumer
async function describeRereadPlugins(e, enabled) {
  let r = await pluginsChangedOnDisk(e, enabled, pluginScanBudget(Date.now()));
  let sliced = r.slice(MAX_LISTED_EXTRA_PLUGINS);
  return r
    .slice(0, MAX_LISTED_EXTRA_PLUGINS)
    .map((i) => rereadPluginLine(i))
    .concat(sliced.length > 0 ? [alsoRereadFromFoldersLine(sliced)] : []);
}
//@ chunk-8vqp1nqq.js:14172-14293 sole-consumer
function recordFolderReadAt(enabled) {
  let { folderReadAt } = getPluginRegistry();
  for (let r of enabled) if (r.readFromFolderAt !== undefined) folderReadAt.set(r.source, r.readFromFolderAt);
}
//@ chunk-8vqp1nqq.js:14293-16985 fingerprint = call (0.457)
/**
 * /reload-plugins：we 为远程 reload_plugins 结果 schema；call 在远程会话转发控制请求，本地则计算 MCP/LSP 变更是否会使缓存失效（未 --force 时先警告），再刷新插件、补装缺失依赖并汇报。
 */
var remoteReloadResultSchema = DoctorLazy(() => {
  let e = array(unknown()).optional().catch(undefined);
  return u({
    plugins: e,
    commands: e,
    agents: e,
    mcpServers: e,
    error_count: E().catch(0),
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
    .some((t) => t === "--force" || t === "force");
  let isNonInteractiveSession = context.options.isNonInteractiveSession;
  invalidateCommandNames();
  let plugins = context.getAppState().plugins;
  let catalogForOfficialDeps = await ensureCatalogForOfficialDeps(
    [...plugins.enabled, ...plugins.disabled, ...plugins.errors].map((t) => t.source),
    context.storageV5,
  );
  let pluginReloadImpact = await computePluginReloadImpact({
    model: context.options.mainLoopModel,
    mcpClients: context.getAppState().mcp.clients,
    dynamicMcpConfig: context.options.dynamicMcpConfig,
    storageV5: context.storageV5,
    credentials: context.credentials,
  });
  let f = any ? null : cacheInvalidationWarning(pluginReloadImpact, isNonInteractiveSession);
  if (f !== null) {
    logReloadPluginsImpact(pluginReloadImpact, {
      warned: true,
      forced: false,
    });
    return {
      type: "text",
      value: f,
    };
  }
  let d = null;
  let c = pluginReloadImpact;
  let g = PluginsStateStore.over({
    getState: context.getAppState,
    setState: context.setAppState,
  });
  try {
    retryUnloadedModules();
    let t = await refreshActivePlugins(g, context.storageV5, context.credentials);
    let y = "";
    let missingDependencies = await resolveMissingDependencies(t.errors, context.storageV5);
    if (missingDependencies.installed.length > 0) {
      let x = any
        ? null
        : await computePluginReloadImpact({
            model: context.options.mainLoopModel,
            mcpClients: context.getAppState().mcp.clients,
            dynamicMcpConfig: context.options.dynamicMcpConfig,
            storageV5: context.storageV5,
            credentials: context.credentials,
          });
      d = x === null ? null : cacheInvalidationWarning(x, isNonInteractiveSession);
      if (x !== null && d !== null) {
        c = x;
        y = `${formatDependencyCountSuffix(missingDependencies.installed)} installed but not applied`;
        g.markNeedsRefresh();
      } else {
        y = `${formatDependencyCountSuffix(missingDependencies.installed)} resolved`;
        t = await refreshActivePlugins(g, context.storageV5, context.credentials);
      }
    }
    let h = `Reloaded: ${[countWithNoun(t.enabled_count, "plugin"), countWithNoun(t.command_count + t.skill_count, "skill"), countWithNoun(t.agent_count, "agent"), countWithNoun(t.hook_count, "hook"), ...(isNonInteractiveSession ? [] : [countWithNoun(t.mcp_count, "plugin MCP server")]), countWithNoun(t.lsp_count, "plugin LSP server")].join(" \xB7 ")}${y}`;
    for (let x of await describeRereadPlugins(new Map(getPluginRegistry().folderReadAt), g.get().enabled))
      h += `
${x}`;
    recordFolderReadAt(g.get().enabled);
    if (
      isNonInteractiveSession &&
      pluginReloadImpact.mcpServersAdded.length + pluginReloadImpact.mcpServersRemoved.length > 0
    )
      h += `
${PLUGIN_MCP_NEXT_SESSION_NOTE}`;
    if (d !== null)
      h += `
${d}`;
    if (catalogForOfficialDeps === "unreachable")
      h += `
The ${OFFICIAL_MARKETPLACE_DISPLAY} could not be reached, so its plugins were not loaded. Try /reload-plugins again in a few minutes.`;
    if (t.error_count > 0)
      h += `
${countWithNoun(t.error_count, "error")} during load. Run /plugin for details.`;
    return {
      type: "text",
      value: h,
    };
  } finally {
    logReloadPluginsImpact(c, {
      warned: d !== null,
      forced: any,
    });
  }
};
//@ chunk-8vqp1nqq.js:16985-17049 sole-consumer
function canReloadPlugins(context) {
  return !context.options.isNonInteractiveSession || isLocalStdinSubmission(context);
}
//@ chunk-8vqp1nqq.js:17049-17304 sole-consumer
function cacheInvalidationWarning(e, isNonInteractiveSession) {
  if (!e.wouldInvalidateCache) return null;
  if (!isNonInteractiveSession)
    return describeCacheInvalidation({
      added: e.mcpServersAdded,
      removed: e.mcpServersRemoved,
      lspToolChange: e.lspToolChange,
    });
  if (e.lspToolChange === null) return null;
  return describeCacheInvalidation({
    added: [],
    removed: [],
    lspToolChange: e.lspToolChange,
  });
}
//@ chunk-8vqp1nqq.js:17304-17343 sole-consumer
function countWithNoun(e, o) {
  return `${e} ${plural(e, o)}`;
}
//@ chunk-8vqp1nqq.js:17343-17886 sole-consumer
/**
 * 生成"本次重载会使提示缓存失效"的说明：列出变化的 MCP 服务器和 LSP 工具变化，提示下一条消息将重读整个对话，可用 --force 强制应用。
 */
function describeCacheInvalidation(change) {
  let changedServers = [...change.added, ...change.removed];
  let [onlyServer] = changedServers;
  let n =
    changedServers.length === 1 && onlyServer !== undefined
      ? stripInvisibleKeepEmoji(onlyServer.split(":").slice(2).join(":") || onlyServer)
      : `${changedServers.length} MCP servers`;
  let effects = [];
  if (changedServers.length > 0) effects.push(`changes MCP tools (${n})`);
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
