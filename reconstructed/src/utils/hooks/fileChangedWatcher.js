/**
 * utils/hooks/fileChangedWatcher.ts
 *
 * CwdChanged/FileChanged 钩子的文件监听器（chokidar），以及主题目录监听。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks/fileChangedWatcher.ts
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: callgraph-witnessed 1, placement 1
 */
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
} from "path";
import {
  isDiskless,
  getMainThreadAgentHooks,
  getSessionId,
  getOriginalCwd,
  getProjectRoot,
} from "../../bootstrap/state.js";
import { getHooksConfigFromSnapshot, shouldAllowManagedHooksOnly } from "./hooksConfigSnapshot.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { uniq } from "../collections.js";
import { isWindowsDevicePath } from "../windowsUncPaths.js";
import { logForDebugging } from "../debug.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { Ok } from "../../../vendor/chokidar/index.js";
import { errorMessage } from "../errors.js";
import { executeFileChangedHooks, executeCwdChangedHooks } from "../hooks.js";
import { clearCwdEnvFiles } from "../sessionEnvironment.js";

/**
 * CwdChanged/FileChanged 钩子的监听器：按 FileChanged 的 matcher（| 分隔文件名）和钩子返回的 watchPaths 用 chokidar 监听，变化时执行 FileChanged 钩子；cwd 变化时清 env 文件并执行 CwdChanged 钩子；HTTP MCP serve 模式不监听。
 */
//@ chunk-e6aww6q8.js:2072396-2075384 callgraph-witnessed = onCwdChangedForHooks (0.263)
function onCwdChangedForHooks() {
  let e = null,
    n,
    r = [],
    s = [],
    h = !1,
    y,
    S,
    w = !1,
    L = null,
    G = null;
  function q(ze) {
    L = ze;
  }
  function Z(ze, lt, Je) {
    if (h || isDiskless()) return;
    ((h = !0), (n = ze), (y = lt), (S = Je));
    let config = getHooksConfigFromSnapshot();
    if (((w = (config?.CwdChanged?.length ?? 0) > 0 || (config?.FileChanged?.length ?? 0) > 0), w))
      G = registerCleanup(We);
    let pt = Se(config);
    if (pt.length === 0) return;
    ke(pt);
  }
  function Se(ze) {
    let currentHasEnvHooks = (ze ?? getHooksConfigFromSnapshot())?.FileChanged ?? [],
      Je = shouldAllowManagedHooksOnly() ? [] : (getMainThreadAgentHooks()?.FileChanged ?? []),
      nt = [...currentHasEnvHooks, ...Je],
      pt = [];
    for (let gt of nt) {
      if (!gt.matcher) continue;
      for (let At of gt.matcher.split("|").map((It) => It.trim())) {
        if (!At) continue;
        pt.push(isAbsolute_38(At) ? At : join_75(n, At));
      }
    }
    let Et = uniq([...pt, ...r]),
      filtered = Et.filter((gt) => !isWindowsDevicePath(gt));
    if (filtered.length !== Et.length)
      logForDebugging("FileChanged: dropped remote UNC watch path(s)", { level: "warn" });
    return filtered;
  }
  function ke(ze) {
    if (isHttpMcpServeInvocation()) {
      (logForDebugging(
        `FileChanged hooks never run under claude mcp serve --transport http: not watching ${ze.length} paths`,
        { level: "warn" },
      ),
        logFeatureSad("file_watcher_start", "tool_server_daemon"));
      return;
    }
    (logForDebugging(`FileChanged: watching ${ze.length} paths`),
      (e = Ok.watch(ze, {
        persistent: !0,
        ignoreInitial: !0,
        awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 200 },
        ignorePermissionErrors: !0,
      })),
      e.on("change", (Je) => we(Je, "change")),
      e.on("add", (Je) => we(Je, "add")),
      e.on("unlink", (Je) => we(Je, "unlink")));
    let lt = !1;
    (e.on("error", (Je) => {
      if (!lt) ((lt = !0), logFeatureBad("file_watcher_start", "fs_error"));
      logForDebugging(`FileChanged: watcher error: ${errorMessage(Je)}`, { level: "warn" });
    }),
      e.on("ready", () => {
        if (!lt) ((lt = !0), logFeatureOk("file_watcher_start"));
      }));
  }
  function we(ze, lt) {
    (logForDebugging(`FileChanged: ${lt} ${ze}`),
      executeFileChangedHooks(
        { id: getSessionId(), project: { originalCwd: getOriginalCwd(), projectRoot: getProjectRoot() } },
        ze,
        lt,
        { storageV5: y, credentials: S },
      )
        .then(({ results: results, watchPaths: watchPaths, systemMessages: systemMessages }) => {
          if ((logFeatureOk("file_watcher_change_detected"), watchPaths.length > 0)) Ee(watchPaths);
          for (let Et of systemMessages) L?.(Et, !1);
          for (let Et of results) if (!Et.succeeded && Et.output) L?.(Et.output, !0);
        })
        .catch((Je) => {
          logFeatureBad("file_watcher_change_detected", "hook_exec_failed");
          let nt = errorMessage(Je);
          (logForDebugging(`FileChanged hook failed: ${nt}`, { level: "error" }), L?.(nt, !0));
        }));
  }
  function Ee(ze) {
    if (!h) return;
    let sorted = ze.slice().sort();
    if (sorted.length === s.length && sorted.every((Je, nt) => Je === s[nt])) return;
    ((r = ze), (s = sorted), Ie());
  }
  function Ae(ze) {
    Ee([...r, ...uniq(ze).filter((lt) => !r.includes(lt))]);
  }
  function Ie() {
    if (e) (e.close(), (e = null));
    let ze = Se();
    if (ze.length > 0) ke(ze);
  }
  async function Me(ze, lt) {
    if (ze === lt) return;
    let Je = getHooksConfigFromSnapshot(),
      nt = shouldAllowManagedHooksOnly() ? void 0 : getMainThreadAgentHooks();
    if (!(
      (Je?.CwdChanged?.length ?? 0) > 0 ||
      (Je?.FileChanged?.length ?? 0) > 0 ||
      (nt?.CwdChanged?.length ?? 0) > 0 ||
      (nt?.FileChanged?.length ?? 0) > 0
    ))
      return;
    ((n = lt), await clearCwdEnvFiles(y));
    let hookResult = await executeCwdChangedHooks(
      { id: getSessionId(), project: { originalCwd: getOriginalCwd(), projectRoot: getProjectRoot() } },
      ze,
      lt,
      { storageV5: y, credentials: S },
    ).catch((yt) => {
      let msg = errorMessage(yt);
      return (
        logForDebugging(`CwdChanged hook failed: ${msg}`, { level: "error" }),
        L?.(msg, !0),
        { results: [], watchPaths: [], systemMessages: [] }
      );
    });
    ((r = hookResult.watchPaths), (s = hookResult.watchPaths.slice().sort()));
    for (let msg of hookResult.systemMessages) L?.(msg, !1);
    for (let yt of hookResult.results) if (!yt.succeeded && yt.output) L?.(yt.output, !0);
    if (h) Ie();
  }
  function We() {
    if (G) (G(), (G = null));
    if (e) (e.close(), (e = null));
    ((r = []), (s = []), (h = !1), (y = void 0), (S = void 0), (w = !1), (L = null));
  }
  return {
    initialize: Z,
    setEnvHookNotifier: q,
    updateWatchPaths: Ee,
    addWatchPaths: Ae,
    onCwdChanged: Me,
    dispose: We,
    [Symbol.dispose]: We,
  };
}
//@ chunk-e6aww6q8.js:2075384-2075498 placement
var fileChangedWatcherApi = onCwdChangedForHooks(),
  {
    initialize: initialize,
    setEnvHookNotifier: setEnvHookNotifier,
    updateWatchPaths: updateWatchPaths,
    addWatchPaths: addWatchPaths,
    onCwdChanged: onCwdChanged,
  } = fileChangedWatcherApi;

export { setEnvHookNotifier, onCwdChanged, addWatchPaths, updateWatchPaths, initialize };
