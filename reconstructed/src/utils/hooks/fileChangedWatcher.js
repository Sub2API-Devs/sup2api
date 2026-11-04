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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:2072396-2075384 callgraph-witnessed = onCwdChangedForHooks (0.263)
/**
 * CwdChanged/FileChanged 钩子的监听器：按 FileChanged 的 matcher（| 分隔文件名）和钩子返回的 watchPaths 用 chokidar 监听，变化时执行 FileChanged 钩子；cwd 变化时清 env 文件并执行 CwdChanged 钩子；HTTP MCP serve 模式不监听。
 */
function onCwdChangedForHooks() {
  let watcher = null;
  let cwd;
  let watchPaths = [];
  let sortedPaths = [];
  let running = false;
  let storageV5;
  let credentials;
  let hasHookWatchers = false;
  let notify = null;
  let cleanupRegistration = null;
  function setEnvHookNotifier(notifier) {
    notify = notifier;
  }
  function initialize(cwd_2, storageV5_2, credentials_2) {
    if (running || isDiskless()) return;
    running = true;
    cwd = cwd_2;
    storageV5 = storageV5_2;
    credentials = credentials_2;
    let config = getHooksConfigFromSnapshot();
    hasHookWatchers = (config?.CwdChanged?.length ?? 0) > 0 || (config?.FileChanged?.length ?? 0) > 0;
    if (hasHookWatchers) cleanupRegistration = registerCleanup(dispose);
    let paths = config_2(config);
    if (paths.length === 0) return;
    startWatching(paths);
  }
  function config_2(config) {
    let currentHasEnvHooks = (config ?? getHooksConfigFromSnapshot())?.FileChanged ?? [];
    let agentHooks = shouldAllowManagedHooksOnly() ? [] : (getMainThreadAgentHooks()?.FileChanged ?? []);
    let entries = [...currentHasEnvHooks, ...agentHooks];
    let staticPaths = [];
    for (let m of entries) {
      if (!m.matcher) continue;
      for (let name of m.matcher.split("|").map((name) => name.trim())) {
        if (!name) continue;
        staticPaths.push(isAbsolute(name) ? name : join(cwd, name));
      }
    }
    let allPaths = uniq([...staticPaths, ...watchPaths]);
    let filtered = allPaths.filter((path) => !isWindowsDevicePath(path));
    if (filtered.length !== allPaths.length)
      logForDebugging("FileChanged: dropped remote UNC watch path(s)", {
        level: "warn",
      });
    return filtered;
  }
  function startWatching(paths) {
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
    watcher = chokidar_default.watch(paths, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 200,
      },
      ignorePermissionErrors: true,
    });
    watcher.on("change", (path) => onFsEvent(path, "change"));
    watcher.on("add", (path) => onFsEvent(path, "add"));
    watcher.on("unlink", (path) => onFsEvent(path, "unlink"));
    let errorLogged = false;
    watcher.on("error", (error) => {
      if (!errorLogged) {
        errorLogged = true;
        logFeatureBad("file_watcher_start", "fs_error");
      }
      logForDebugging(`FileChanged: watcher error: ${errorMessage(error)}`, {
        level: "warn",
      });
    });
    watcher.on("ready", () => {
      if (!errorLogged) {
        errorLogged = true;
        logFeatureOk("file_watcher_start");
      }
    });
  }
  function onFsEvent(path, event) {
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
        storageV5,
        credentials,
      },
    )
      .then(({ results, watchPaths, systemMessages }) => {
        logFeatureOk("file_watcher_change_detected");
        if (watchPaths.length > 0) updateWatchPaths(watchPaths);
        for (let msg of systemMessages) notify?.(msg, false);
        for (let result of results) if (!result.succeeded && result.output) notify?.(result.output, true);
      })
      .catch((e) => {
        logFeatureBad("file_watcher_change_detected", "hook_exec_failed");
        let msg = errorMessage(e);
        logForDebugging(`FileChanged hook failed: ${msg}`, {
          level: "error",
        });
        notify?.(msg, true);
      });
  }
  function updateWatchPaths(paths) {
    if (!running) return;
    let sorted = paths.slice().sort();
    if (sorted.length === sortedPaths.length && sorted.every((path, i) => path === sortedPaths[i])) return;
    watchPaths = paths;
    sortedPaths = sorted;
    restartWatcher();
  }
  function addWatchPaths(paths) {
    updateWatchPaths([...watchPaths, ...uniq(paths).filter((path) => !watchPaths.includes(path))]);
  }
  function restartWatcher() {
    if (watcher) {
      watcher.close();
      watcher = null;
    }
    let paths = config_2();
    if (paths.length > 0) startWatching(paths);
  }
  async function onCwdChanged(oldCwd, newCwd) {
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
    cwd = newCwd;
    await clearCwdEnvFiles(storageV5);
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
        storageV5,
        credentials,
      },
    ).catch((e) => {
      let msg = errorMessage(e);
      logForDebugging(`CwdChanged hook failed: ${msg}`, {
        level: "error",
      });
      notify?.(msg, true);
      return {
        results: [],
        watchPaths: [],
        systemMessages: [],
      };
    });
    watchPaths = hookResult.watchPaths;
    sortedPaths = hookResult.watchPaths.slice().sort();
    for (let msg of hookResult.systemMessages) notify?.(msg, false);
    for (let result of hookResult.results)
      if (!result.succeeded && result.output) notify?.(result.output, true);
    if (running) restartWatcher();
  }
  function dispose() {
    if (cleanupRegistration) {
      cleanupRegistration();
      cleanupRegistration = null;
    }
    if (watcher) {
      watcher.close();
      watcher = null;
    }
    watchPaths = [];
    sortedPaths = [];
    running = false;
    storageV5 = undefined;
    credentials = undefined;
    hasHookWatchers = false;
    notify = null;
  }
  return {
    initialize,
    setEnvHookNotifier,
    updateWatchPaths,
    addWatchPaths,
    onCwdChanged,
    dispose,
    [Symbol.dispose]: dispose,
  };
}
//@ chunk-e6aww6q8.js:2075384-2075498 placement
var fileChangedWatcherApi; // deferred: uses onCwdChangedForHooks of its import cycle while loading; runs once the cycle is complete
var initialize;
var setEnvHookNotifier;
var updateWatchPaths;
var addWatchPaths;
var onCwdChanged;
deferInit("chunk-e6aww6q8.js:2075384", () => {
  fileChangedWatcherApi = onCwdChangedForHooks();
  ({ initialize, setEnvHookNotifier, updateWatchPaths, addWatchPaths, onCwdChanged } = fileChangedWatcherApi);
});
export { setEnvHookNotifier, onCwdChanged, addWatchPaths, updateWatchPaths, initialize };
