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
import { isAbsolute, join } from "path";
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
import { chokidar_default } from "../../../vendor/chokidar/index.js";
import { errorMessage } from "../errors.js";
import { executeFileChangedHooks, executeCwdChangedHooks } from "../hooks.js";
import { clearCwdEnvFiles } from "../sessionEnvironment.js";

//@ chunk-e6aww6q8.js:2072396-2075384 callgraph-witnessed = onCwdChangedForHooks (0.263)
/**
 * CwdChanged/FileChanged 钩子的监听器：按 FileChanged 的 matcher（| 分隔文件名）和钩子返回的 watchPaths 用 chokidar 监听，变化时执行 FileChanged 钩子；cwd 变化时清 env 文件并执行 CwdChanged 钩子；HTTP MCP serve 模式不监听。
 */
function onCwdChangedForHooks() {
  let e = null;
  let n;
  let r = [];
  let s = [];
  let h = false;
  let y;
  let S;
  let w = false;
  let L = null;
  let G = null;
  function q(ze) {
    L = ze;
  }
  function Z(ze, lt, Je) {
    if (h || isDiskless()) return;
    h = true;
    n = ze;
    y = lt;
    S = Je;
    let config = getHooksConfigFromSnapshot();
    w = (config?.CwdChanged?.length ?? 0) > 0 || (config?.FileChanged?.length ?? 0) > 0;
    if (w) G = registerCleanup(We);
    let paths = Se(config);
    if (paths.length === 0) return;
    ke(paths);
  }
  function Se(config) {
    let currentHasEnvHooks = (config ?? getHooksConfigFromSnapshot())?.FileChanged ?? [];
    let Je = shouldAllowManagedHooksOnly() ? [] : (getMainThreadAgentHooks()?.FileChanged ?? []);
    let nt = [...currentHasEnvHooks, ...Je];
    let staticPaths = [];
    for (let m of nt) {
      if (!m.matcher) continue;
      for (let name of m.matcher.split("|").map((It) => It.trim())) {
        if (!name) continue;
        staticPaths.push(isAbsolute(name) ? name : join(n, name));
      }
    }
    let Et = uniq([...staticPaths, ...r]);
    let filtered = Et.filter((gt) => !isWindowsDevicePath(gt));
    if (filtered.length !== Et.length)
      logForDebugging("FileChanged: dropped remote UNC watch path(s)", {
        level: "warn",
      });
    return filtered;
  }
  function ke(paths) {
    if (isHttpMcpServeInvocation()) {
      logForDebugging(
        `FileChanged hooks never run under claude mcp serve --transport http: not watching ${paths.length} paths`,
        {
          level: "warn",
        },
      );
      logFeatureSad("file_watcher_start", "tool_server_daemon");
      return;
    }
    logForDebugging(`FileChanged: watching ${paths.length} paths`);
    e = chokidar_default.watch(paths, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 200,
      },
      ignorePermissionErrors: true,
    });
    e.on("change", (path) => we(path, "change"));
    e.on("add", (path) => we(path, "add"));
    e.on("unlink", (path) => we(path, "unlink"));
    let lt = false;
    e.on("error", (Je) => {
      if (!lt) {
        lt = true;
        logFeatureBad("file_watcher_start", "fs_error");
      }
      logForDebugging(`FileChanged: watcher error: ${errorMessage(Je)}`, {
        level: "warn",
      });
    });
    e.on("ready", () => {
      if (!lt) {
        lt = true;
        logFeatureOk("file_watcher_start");
      }
    });
  }
  function we(path, event) {
    logForDebugging(`FileChanged: ${event} ${path}`);
    executeFileChangedHooks(
      {
        id: getSessionId(),
        project: {
          originalCwd: getOriginalCwd(),
          projectRoot: getProjectRoot(),
        },
      },
      path,
      event,
      {
        storageV5: y,
        credentials: S,
      },
    )
      .then(({ results, watchPaths, systemMessages }) => {
        logFeatureOk("file_watcher_change_detected");
        if (watchPaths.length > 0) Ee(watchPaths);
        for (let msg of systemMessages) L?.(msg, false);
        for (let result of results) if (!result.succeeded && result.output) L?.(result.output, true);
      })
      .catch((e) => {
        logFeatureBad("file_watcher_change_detected", "hook_exec_failed");
        let msg = errorMessage(e);
        logForDebugging(`FileChanged hook failed: ${msg}`, {
          level: "error",
        });
        L?.(msg, true);
      });
  }
  function Ee(paths) {
    if (!h) return;
    let sorted = paths.slice().sort();
    if (sorted.length === s.length && sorted.every((Je, i) => Je === s[i])) return;
    r = paths;
    s = sorted;
    Ie();
  }
  function Ae(ze) {
    Ee([...r, ...uniq(ze).filter((lt) => !r.includes(lt))]);
  }
  function Ie() {
    if (e) {
      e.close();
      e = null;
    }
    let paths = Se();
    if (paths.length > 0) ke(paths);
  }
  async function Me(oldCwd, newCwd) {
    if (oldCwd === newCwd) return;
    let config = getHooksConfigFromSnapshot();
    let currentHasEnvHooks = shouldAllowManagedHooksOnly() ? undefined : getMainThreadAgentHooks();
    if (!(
      (config?.CwdChanged?.length ?? 0) > 0 ||
      (config?.FileChanged?.length ?? 0) > 0 ||
      (currentHasEnvHooks?.CwdChanged?.length ?? 0) > 0 ||
      (currentHasEnvHooks?.FileChanged?.length ?? 0) > 0
    ))
      return;
    n = newCwd;
    await clearCwdEnvFiles(y);
    let hookResult = await executeCwdChangedHooks(
      {
        id: getSessionId(),
        project: {
          originalCwd: getOriginalCwd(),
          projectRoot: getProjectRoot(),
        },
      },
      oldCwd,
      newCwd,
      {
        storageV5: y,
        credentials: S,
      },
    ).catch((e) => {
      let msg = errorMessage(e);
      logForDebugging(`CwdChanged hook failed: ${msg}`, {
        level: "error",
      });
      L?.(msg, true);
      return {
        results: [],
        watchPaths: [],
        systemMessages: [],
      };
    });
    r = hookResult.watchPaths;
    s = hookResult.watchPaths.slice().sort();
    for (let msg of hookResult.systemMessages) L?.(msg, false);
    for (let yt of hookResult.results) if (!yt.succeeded && yt.output) L?.(yt.output, true);
    if (h) Ie();
  }
  function We() {
    if (G) {
      G();
      G = null;
    }
    if (e) {
      e.close();
      e = null;
    }
    r = [];
    s = [];
    h = false;
    y = undefined;
    S = undefined;
    w = false;
    L = null;
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
var fileChangedWatcherApi = onCwdChangedForHooks();
var { initialize, setEnvHookNotifier, updateWatchPaths, addWatchPaths, onCwdChanged } = fileChangedWatcherApi;
export { setEnvHookNotifier, onCwdChanged, addWatchPaths, updateWatchPaths, initialize };
