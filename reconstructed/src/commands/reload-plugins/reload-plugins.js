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
import { gGr, isIgnoredWatchPath, ZWt } from "../../plugins/functionHooks/devModsWatch.js";
import { getDebugLogPath } from "../../utils/debug.js";
import { withDeadline } from "../../utils/sleep.js";
import { printableName, printableOrEmpty } from "../../utils/printableName.js";
import { getDisplayPath } from "../../utils/file.js";
import { plural } from "../../utils/stringUtils.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { A, oe, u, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { ml, Jn } from "../../remote/remoteMode.js";
import { parseThinClientReply } from "../../cli/thinClient.js";
import { or } from "../../utils/settings/commandSyncNames.js";
import { DFs, resolveMissingDependencies } from "../../utils/plugins/dependencyInstall.js";
import { computePluginReloadImpact, logReloadPluginsImpact } from "../../utils/plugins/reloadImpact.js";
import { PluginsStateStore } from "../../utils/plugins/pluginLoadStatus.js";
import { retryUnloadedModules } from "../../plugins/functionHooks/hooksModuleLoader.js";
import { refreshActivePlugins } from "../../utils/plugins/refresh.js";
import { formatDependencyCountSuffix } from "../../utils/plugins/dependencyResolver.js";
import { OFFICIAL_MARKETPLACE_DISPLAY } from "../../utils/plugins/officialMarketplaceNames.js";
import { Ant } from "../../utils/promptSubmissionOrigin.js";
import { stripInvisibleKeepEmoji } from "../../utils/settings/marketplaceSettingsAliases.js";

//@ chunk-8vqp1nqq.js:12207-12250 sole-consumer
var freeze = Object.freeze(["ENOENT", "ENOTDIR"]);
//@ chunk-8vqp1nqq.js:12250-12283 sole-consumer
var C = (e) => freeze.includes(getErrnoCode(e) ?? "");
//@ chunk-8vqp1nqq.js:12283-12368 sole-consumer
function w(e, o) {
  let filtered = e.filter((n) => n <= o + gGr);
  return Math.max(0, ...(filtered.length > 0 ? filtered : [o]));
}
//@ chunk-8vqp1nqq.js:12368-12519 sole-consumer
var statWrittenAt = (e, o) =>
  lstat(e).then(
    (r) => ({ path: e, writtenAt: w([r.mtimeMs, r.ctimeMs], o), isFolder: r.isDirectory() }),
    (r) => ({ path: e, writtenAt: C(r) ? 0 : o, isFolder: !1 }),
  );
//@ chunk-8vqp1nqq.js:12519-12530 sole-consumer
var ie = 1e4;
//@ chunk-8vqp1nqq.js:12530-12542 sole-consumer
var se = 2000;
//@ chunk-8vqp1nqq.js:12542-12582 sole-consumer
var b = (e, o = ie) => ({ cap: o, deadline: e + se });
//@ chunk-8vqp1nqq.js:12582-12591 sole-consumer
var I = 64;
//@ chunk-8vqp1nqq.js:12591-12745 sole-consumer
async function mapInBatchesUntil(e, o, r) {
  let n = [];
  for (let i = 0; i < e.length; i += I) {
    if (Date.now() > r) return;
    let sliced = e.slice(i, i + I);
    n.push(...(await Promise.all(sliced.map(o))));
  }
  return n;
}
//@ chunk-8vqp1nqq.js:12846-12894 sole-consumer
var freeze_2 = Object.freeze([".lsp.json", ".mcp.json"]);
//@ chunk-8vqp1nqq.js:12894-12954 sole-consumer
var me = (e, o) =>
  (!isIgnoredWatchPath(o, getDebugLogPath()) || freeze_2.includes(basename(o))) && !ZWt(e, o);
//@ chunk-8vqp1nqq.js:12954-13046 sole-consumer
var fe = (e, o) =>
  readdir(o).then(
    (r) => r.map((n) => join(o, n)).filter((n) => me(e, n)),
    (r) => (C(r) ? [] : void 0),
  );
//@ chunk-8vqp1nqq.js:13082-13154 sole-consumer
var ce = (e, o) =>
  stat(e).then(
    (r) => w([r.mtimeMs, r.ctimeMs], o),
    (r) => (C(r) ? 0 : o),
  );
/**
 * 判断插件目录自上次读取后是否有改动：先看目录本身，再按层（数量上限、截止时间内）遍历子项 mtime/ctime；超时或无法读取时视为已改动。
 */
//@ chunk-8vqp1nqq.js:13154-13533 sole-consumer
async function folderChangedSince(dir, readAt, budget) {
  let now = Date.now(),
    i = readAt - gGr,
    m = (await ce(dir, now)) > i,
    a = m ? [] : [dir],
    cap = budget.cap;
  while (a.length > 0) {
    let d = await mapInBatchesUntil(a, (s) => fe(dir, s), budget.deadline),
      flattened = (d ?? []).flatMap((s) => s ?? []),
      t =
        d === void 0 || d.includes(void 0) || flattened.length > cap
          ? void 0
          : await mapInBatchesUntil(flattened, (s) => statWrittenAt(s, now), budget.deadline);
    if (t?.some((s) => s.writtenAt > i) ?? !0) return !0;
    ((cap -= flattened.length), (a = (t ?? []).filter((s) => s.isFolder).map((s) => s.path)));
  }
  return m;
}
//@ chunk-8vqp1nqq.js:13533-13645 sole-consumer
async function folderChangedWithin(e, o, r = b(Date.now())) {
  let n = r.deadline - Date.now();
  return (n > 0 ? await withDeadline(folderChangedSince(e, o, r), n) : void 0) ?? !0;
}
//@ chunk-8vqp1nqq.js:13645-13820 sole-consumer
var pluginsChangedOnDisk = (e, o, r) =>
  o.reduce(async (n, i) => {
    let m = await n,
      a = e.get(i.source);
    return i.readFromFolderAt !== void 0 && a !== void 0 && (await folderChangedWithin(i.path, a, r))
      ? m.concat(i)
      : m;
  }, Promise.resolve([]));
//@ chunk-8vqp1nqq.js:13820-13853 sole-consumer
var V = (e) => `\`${printableName(e.source)}\``;
//@ chunk-8vqp1nqq.js:13853-13922 sole-consumer
var Le = (e) => `${V(e)} re-read from its folder: \`${printableOrEmpty(getDisplayPath(e.path))}\``;
//@ chunk-8vqp1nqq.js:13922-13930 sole-consumer
var B = 5;
//@ chunk-8vqp1nqq.js:13930-14036 sole-consumer
var alsoRereadFromFoldersLine = (e) =>
  `Also re-read from ${plural(e.length, "its folder", "their folders")}: ` + e.map((o) => V(o)).join(", ");
//@ chunk-8vqp1nqq.js:14036-14172 sole-consumer
async function describeRereadPlugins(e, o) {
  let r = await pluginsChangedOnDisk(e, o, b(Date.now())),
    sliced = r.slice(B);
  return r
    .slice(0, B)
    .map((i) => Le(i))
    .concat(sliced.length > 0 ? [alsoRereadFromFoldersLine(sliced)] : []);
}
//@ chunk-8vqp1nqq.js:14172-14293 sole-consumer
function recordFolderReadAt(e) {
  let { folderReadAt: folderReadAt } = getPluginRegistry();
  for (let r of e) if (r.readFromFolderAt !== void 0) folderReadAt.set(r.source, r.readFromFolderAt);
}
/**
 * /reload-plugins：we 为远程 reload_plugins 结果 schema；call 在远程会话转发控制请求，本地则计算 MCP/LSP 变更是否会使缓存失效（未 --force 时先警告），再刷新插件、补装缺失依赖并汇报。
 */
//@ chunk-8vqp1nqq.js:14293-16985 fingerprint = call (0.457)
var remoteReloadResultSchema = DoctorLazy(() => {
    let e = A(oe())
      .optional()
      .catch(void 0);
    return u({ plugins: e, commands: e, agents: e, mcpServers: e, error_count: E().catch(0) });
  }),
  REMOTE_RELOAD_UNAVAILABLE = "/reload-plugins isn't available over a remote connection in this session.",
  PLUGIN_MCP_NEXT_SESSION_NOTE = "Plugin MCP server changes take effect in your next session.",
  call = async (args, context) => {
    if (!canReloadPlugins(context)) return { type: "text", value: REMOTE_RELOAD_UNAVAILABLE };
    if (ml()) {
      let t = parseThinClientReply(
        "reload_plugins",
        remoteReloadResultSchema(),
        await Jn().sendControlRequest(
          { subtype: "reload_plugins" },
          { signal: context.abortController.signal },
        ),
      );
      if (!t || (t.plugins ?? t.commands ?? t.agents ?? t.mcpServers) === void 0)
        return { type: "text", value: "Reloaded on remote." };
      let s = `Reloaded on remote: ${[l(t.plugins?.length ?? 0, "plugin"), l(t.commands?.length ?? 0, "skill"), l(t.agents?.length ?? 0, "agent"), l(t.mcpServers?.length ?? 0, "plugin MCP server")].join(" \xB7 ")}`;
      if (t.error_count > 0)
        s += `
${l(t.error_count, "error")} during load. Run /plugin on the remote for details.`;
      return { type: "text", value: s };
    }
    let any = args
        .trim()
        .split(/\s+/)
        .some((t) => t === "--force" || t === "force"),
      isNonInteractiveSession = context.options.isNonInteractiveSession;
    or();
    let plugins = context.getAppState().plugins,
      m = await DFs(
        [...plugins.enabled, ...plugins.disabled, ...plugins.errors].map((t) => t.source),
        context.storageV5,
      ),
      a = await computePluginReloadImpact({
        model: context.options.mainLoopModel,
        mcpClients: context.getAppState().mcp.clients,
        dynamicMcpConfig: context.options.dynamicMcpConfig,
        storageV5: context.storageV5,
        credentials: context.credentials,
      }),
      f = any ? null : cacheInvalidationWarning(a, isNonInteractiveSession);
    if (f !== null)
      return (logReloadPluginsImpact(a, { warned: !0, forced: !1 }), { type: "text", value: f });
    let d = null,
      c = a,
      over = PluginsStateStore.over({ getState: context.getAppState, setState: context.setAppState });
    try {
      retryUnloadedModules();
      let t = await refreshActivePlugins(over, context.storageV5, context.credentials),
        y = "",
        s = await resolveMissingDependencies(t.errors, context.storageV5);
      if (s.installed.length > 0) {
        let x = any
          ? null
          : await computePluginReloadImpact({
              model: context.options.mainLoopModel,
              mcpClients: context.getAppState().mcp.clients,
              dynamicMcpConfig: context.options.dynamicMcpConfig,
              storageV5: context.storageV5,
              credentials: context.credentials,
            });
        if (
          ((d = x === null ? null : cacheInvalidationWarning(x, isNonInteractiveSession)),
          x !== null && d !== null)
        )
          ((c = x),
            (y = `${formatDependencyCountSuffix(s.installed)} installed but not applied`),
            over.markNeedsRefresh());
        else
          ((y = `${formatDependencyCountSuffix(s.installed)} resolved`),
            (t = await refreshActivePlugins(over, context.storageV5, context.credentials)));
      }
      let h = `Reloaded: ${[l(t.enabled_count, "plugin"), l(t.command_count + t.skill_count, "skill"), l(t.agent_count, "agent"), l(t.hook_count, "hook"), ...(isNonInteractiveSession ? [] : [l(t.mcp_count, "plugin MCP server")]), l(t.lsp_count, "plugin LSP server")].join(" \xB7 ")}${y}`;
      for (let x of await describeRereadPlugins(
        new Map(getPluginRegistry().folderReadAt),
        over.get().enabled,
      ))
        h += `
${x}`;
      if (
        (recordFolderReadAt(over.get().enabled),
        isNonInteractiveSession && a.mcpServersAdded.length + a.mcpServersRemoved.length > 0)
      )
        h += `
${PLUGIN_MCP_NEXT_SESSION_NOTE}`;
      if (d !== null)
        h += `
${d}`;
      if (m === "unreachable")
        h += `
The ${OFFICIAL_MARKETPLACE_DISPLAY} could not be reached, so its plugins were not loaded. Try /reload-plugins again in a few minutes.`;
      if (t.error_count > 0)
        h += `
${l(t.error_count, "error")} during load. Run /plugin for details.`;
      return { type: "text", value: h };
    } finally {
      logReloadPluginsImpact(c, { warned: d !== null, forced: any });
    }
  };
//@ chunk-8vqp1nqq.js:16985-17049 sole-consumer
function canReloadPlugins(e) {
  return !e.options.isNonInteractiveSession || Ant(e);
}
//@ chunk-8vqp1nqq.js:17049-17304 sole-consumer
function cacheInvalidationWarning(e, o) {
  if (!e.wouldInvalidateCache) return null;
  if (!o)
    return describeCacheInvalidation({
      added: e.mcpServersAdded,
      removed: e.mcpServersRemoved,
      lspToolChange: e.lspToolChange,
    });
  if (e.lspToolChange === null) return null;
  return describeCacheInvalidation({ added: [], removed: [], lspToolChange: e.lspToolChange });
}
//@ chunk-8vqp1nqq.js:17304-17343 sole-consumer
function l(e, o) {
  return `${e} ${plural(e, o)}`;
}
/**
 * 生成"本次重载会使提示缓存失效"的说明：列出变化的 MCP 服务器和 LSP 工具变化，提示下一条消息将重读整个对话，可用 --force 强制应用。
 */
//@ chunk-8vqp1nqq.js:17343-17886 sole-consumer
function describeCacheInvalidation(change) {
  let changedServers = [...change.added, ...change.removed],
    [onlyServer] = changedServers,
    n =
      changedServers.length === 1 && onlyServer !== void 0
        ? stripInvisibleKeepEmoji(onlyServer.split(":").slice(2).join(":") || onlyServer)
        : `${changedServers.length} MCP servers`,
    effects = [];
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
