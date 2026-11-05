/**
 * utils/skills/skillChangeDetector.ts
 *
 * 并入旧版已有路径：skill 变更检测。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/skills/skillChangeDetector.ts
 * pieces: chunk-3n0n2sf6.js (5), chunk-f3md3zsc.js (1), chunk-s24mfyjz.js (1), chunk-wtefc7a6.js (1)
 * attribution: placement 4, fingerprint 2, sole-consumer 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import * as pathModule from "path";
import { complianceTaintState } from "../../services/policyLimits/complianceTaints.js";
import { WORKER_KINDS } from "../../daemon/runDaemonWorker.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  SKILL_WATCH_DEBOUNCE_MS,
  SKILL_WATCH_MIN_MS,
  SKILL_WATCH_SETTLE_MS,
  SKILL_WATCH_POLL_MS,
  SKILL_WATCH_IDLE_MS,
  collectPromptCommandHashes,
  SKILL_WATCH_ENABLED,
  SKILL_WATCH_MAX_IDLE_MS,
  SKILL_WATCH_RETRY_MS,
  SKILL_WATCH_TIMEOUT_MS,
  SKILL_WATCHER_IDLE_WAKE_TAG,
  SKILL_WATCH_BACKOFF_MS,
  SKILL_WATCH_MAX_WAIT_MS,
} from "../../history.js";
import {
  getLastInteractionTime,
  onInteraction,
  isDiskless,
  getOriginalCwd,
  getProjectConfigRoot,
  getAdditionalDirectoriesForClaudeMd,
} from "../../bootstrap/state.js";
import { createSignal } from "../signal.js";
import { skillsChangedSignal } from "../plugins/pluginsChangedSignal.js";
import {
  onDynamicSkillsLoaded,
  getSkillsPath,
  clearSkillCaches,
  resetProjectSkillDirectories,
} from "../../skills/loadSkillsDir.js";
import { clearCommandMemoizationCaches, clearCommandsCache } from "../../commands.js";
import { logForDebugging } from "../debug.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { isSlowSkillsWatchOn } from "./ccrSlowSkillsWatch.js";
import { chokidar_default } from "../../../vendor/chokidar/index.js";
import { SYNCED_SUBDIR, SYNCED_DIR } from "../plugins/syncedItems.js";
import { errorMessage, withTelemetryMessage, toError } from "../errors.js";
import { logError } from "../log.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { sleep } from "../sleep.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { clearAgentDefinitionsCache } from "../../tools/AgentTool/loadAgentsDir.js";
import { getFsImplementation } from "../fsOperations.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { findGitRoot, findCanonicalGitRoot } from "../git.js";
import { PathSpace } from "../resultError.js";
import { refreshSkillsSyncVeto } from "../claudeAiSync/skillsSync.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-f3md3zsc.js:1589-1626 fingerprint (2.1.88 match: skillChangeDetector, 0.599)
/**
 * 测试用：重置 skill 变更检测器。
 */
function skillChangeDetector() {
  complianceTaintState().resetForTesting();
}
//@ chunk-s24mfyjz.js:2662-3077 placement
/**
 * 比较技能变化需要停止/启动/重启的服务。
 */
function diffSkillServers(currentConfig, config) {
  let changes = {
    stop: [],
    start: [],
    restart: [],
  };
  for (let key of Object.keys(WORKER_KINDS)) {
    let currentEntries = currentConfig[key] ?? [];
    let nextEntries = config[key] ?? [];
    let max = Math.max(currentEntries.length, nextEntries.length);
    for (let j = 0; j < max; j++) {
      let id = `${key}:${j}`;
      let currentEntry = currentEntries[j];
      let nextEntry = nextEntries[j];
      if (currentEntry !== undefined && nextEntry === undefined)
        changes.stop.push({
          id,
          kind: key,
          previousConfig: currentEntry,
        });
      else if (currentEntry === undefined && nextEntry !== undefined)
        changes.start.push({
          id,
          kind: key,
          config: nextEntry,
        });
      else if (!import_sortedIndex_2(currentEntry, nextEntry))
        changes.restart.push({
          id,
          kind: key,
          config: nextEntry,
          previousConfig: currentEntry,
        });
    }
  }
  return changes;
}
//@ chunk-3n0n2sf6.js:1149-5552 placement
/**
 * skill 变更检测器：chokidar 监听上述目录（depth 2，只看 .md，忽略 .git），按交互活跃度切换轮询间隔，变化去抖后先跑 ConfigChange 钩子（可阻断），再清 skill 缓存并通知重载。
 */
function createSkillChangeDetector(changedPath) {
  let stabilityThreshold = changedPath?.stabilityThreshold ?? SKILL_WATCH_DEBOUNCE_MS;
  let pollInterval = changedPath?.pollInterval ?? SKILL_WATCH_MIN_MS;
  let reloadDebounce = changedPath?.reloadDebounce ?? SKILL_WATCH_SETTLE_MS;
  let chokidarInterval = changedPath?.chokidarInterval ?? SKILL_WATCH_POLL_MS;
  let idleChokidarInterval = changedPath?.idleChokidarInterval ?? SKILL_WATCH_IDLE_MS;
  let skillRoot;
  let getFingerprint = changedPath?.getFingerprint ?? (() => collectPromptCommandHashes(skillRoot));
  let now = changedPath?.now ?? Date.now;
  let lastInteractionTime = changedPath?.lastInteractionTime ?? getLastInteractionTime;
  let onInteraction_2 = changedPath?.onInteraction ?? onInteraction;
  let signal = createSignal();
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  function markReloaded() {
    NEGATIVE_INFINITY = now();
    signal.emit();
  }
  let unsubscribe = skillsChangedSignal.subscribe(markReloaded);
  let watcher = null;
  let mergerEpoch = 0;
  let watcherReady = false;
  let pendingBatchTimer = null;
  let idleTimer = null;
  let deferredReloadTimer = null;
  let unsubscribeInteraction = null;
  let isIdle = false;
  let loggedChangeKeys = new Set();
  let watchedPaths = [];
  let startGeneration = 0;
  let pendingChangedPaths = new Set();
  let lastFingerprint = null;
  let started = false;
  let disposed = false;
  let unsubscribeDynamicSkills = null;
  let unregisterCleanup = null;
  let startCommand;
  async function startWatching(initialCommand, initialPath) {
    if (started || disposed || isDiskless()) return;
    started = true;
    startCommand = initialCommand;
    skillRoot = initialPath;
    if (!unsubscribeDynamicSkills)
      unsubscribeDynamicSkills = onDynamicSkillsLoaded(() => {
        clearCommandMemoizationCaches();
        signal.emit();
      });
    let generation = ++startGeneration;
    let watchablePaths = await getWatchablePaths(initialPath);
    if (disposed || generation !== startGeneration) return;
    watchedPaths = watchablePaths;
    if (watchedPaths.length === 0) return;
    lastFingerprint = await getFingerprint().catch(() => null);
    if (disposed || generation !== startGeneration) return;
    logForDebugging(`Watching for changes in skill/command directories: ${watchedPaths.join(", ")}...`);
    watcher = createWatcher(currentInterval());
    let readyWatcher = watcher;
    await new Promise((resolve) => readyWatcher.once("ready", () => resolve()));
    if (SKILL_WATCH_ENABLED) startInteractionWatch();
    unregisterCleanup = registerCleanup(dispose);
  }
  function currentInterval() {
    return isSlowSkillsWatchOn() ? idleChokidarInterval : chokidarInterval;
  }
  function createWatcher(interval) {
    mergerEpoch = now();
    watcherReady = false;
    let skillsPath = getSkillsPath("userSettings", "skills");
    let chokidarWatcher = chokidar_default.watch(watchedPaths, {
      persistent: true,
      ignoreInitial: true,
      depth: 2,
      awaitWriteFinish: {
        stabilityThreshold,
        pollInterval,
      },
      ignored: (path, stats) => {
        if (stats && !stats.isFile() && !stats.isDirectory() && !stats.isSymbolicLink()) return true;
        if (path.split(/[/\\]/).some((segment) => segment === ".git")) return true;
        if (pathModule.relative(skillsPath, path).split(pathModule.sep)[0] === SYNCED_SUBDIR) return true;
        if (stats?.isFile()) return !path.endsWith(".md");
        return false;
      },
      ignorePermissionErrors: true,
      usePolling: SKILL_WATCH_ENABLED,
      interval,
      binaryInterval: interval,
      atomic: true,
    });
    chokidarWatcher.on("add", handleChange);
    chokidarWatcher.on("change", handleChange);
    chokidarWatcher.on("unlink", handleChange);
    let watchedDirRemoved = false;
    chokidarWatcher.on("unlinkDir", (dirPath) => {
      watchedDirRemoved ||= watchedPaths.some(
        (watchedPath) => pathModule.resolve(watchedPath) === pathModule.resolve(dirPath),
      );
      watcherReady &&= !watchedDirRemoved;
    });
    chokidarWatcher.once("ready", () => {
      let watched = chokidarWatcher.getWatched();
      watcherReady =
        !watchedDirRemoved && watchedPaths.every((watchedPath) => pathModule.resolve(watchedPath) in watched);
    });
    chokidarWatcher.on("error", (error) =>
      logForDebugging(`[skills] watcher error: ${errorMessage(error)}`, {
        level: "warn",
      }),
    );
    return chokidarWatcher;
  }
  function startInteractionWatch() {
    unsubscribeInteraction ??= onInteraction_2(() => {
      if (isIdle)
        deferredReloadTimer ??= setTimeout(() => {
          deferredReloadTimer = null;
          reloadNow();
        }, 0);
    });
    scheduleIdleCheck();
  }
  function reloadNow() {
    try {
      updateIdleState();
    } catch (error) {
      logError(
        withTelemetryMessage(
          toError(error),
          "skillChangeDetector: idle check failed; will check again later",
        ),
      );
    }
    scheduleIdleCheck();
  }
  function scheduleIdleCheck() {
    if (disposed || isIdle || idleTimer !== null) return;
    let untilIdleMs = SKILL_WATCH_MAX_IDLE_MS - (now() - lastInteractionTime()) + 1;
    let delayMs =
      untilIdleMs < SKILL_WATCH_RETRY_MS
        ? SKILL_WATCH_RETRY_MS
        : untilIdleMs <= SKILL_WATCH_MAX_IDLE_MS
          ? untilIdleMs
          : SKILL_WATCH_MAX_IDLE_MS + 1;
    idleTimer = setTimeout(() => {
      idleTimer = null;
      reloadNow();
    }, delayMs);
    idleTimer.unref?.();
  }
  function updateIdleState() {
    if (disposed || !watcher) return;
    let idleNow = now() - lastInteractionTime() > SKILL_WATCH_MAX_IDLE_MS;
    if (idleNow === isIdle) return;
    isIdle = idleNow;
    let nextInterval = idleNow ? idleChokidarInterval : currentInterval();
    logForDebugging(
      `[skills] ${idleNow ? "idle" : "active"} \u2014 switching poll interval to ${nextInterval}ms`,
    );
    let pollIntervalChanged = false;
    if (watcherReady && (idleNow || now() - mergerEpoch <= SKILL_WATCH_TIMEOUT_MS))
      try {
        watcher.setPollInterval(nextInterval);
        pollIntervalChanged = true;
      } catch (error) {
        logError(
          withTelemetryMessage(
            toError(error),
            "skillChangeDetector: could not change the poll interval in place; built a new watcher instead",
          ),
        );
      }
    if (!pollIntervalChanged) {
      logForDebugging("[skills] building a new watcher for the switch");
      watcher.close();
      watcher = createWatcher(nextInterval);
    }
    if (!idleNow) {
      queueReload(SKILL_WATCHER_IDLE_WAKE_TAG);
      scheduleIdleCheck();
    }
  }
  async function refreshWatchedPaths() {
    if (!started || disposed) return;
    let watchablePaths = await getWatchablePaths(skillRoot);
    if (disposed) return;
    let nextPaths = normalizeCaseForComparison_2([...watchedPaths, ...watchablePaths]);
    if (nextPaths.length === watchedPaths.length) return;
    let generation = ++startGeneration;
    watchedPaths = nextPaths;
    logForDebugging(
      `[skills] session moved \u2014 watching skill/command directories: ${watchedPaths.join(", ")}`,
    );
    if (watcher) watcher.close();
    watcher = createWatcher(isIdle ? idleChokidarInterval : currentInterval());
    let newWatcher = watcher;
    let promise = new Promise((resolve) => newWatcher.once("ready", () => resolve()));
    await Promise.race([
      promise,
      sleep(SKILL_WATCH_BACKOFF_MS, undefined, {
        unref: true,
      }),
    ]);
    if (disposed || generation !== startGeneration) return;
    if (SKILL_WATCH_ENABLED) startInteractionWatch();
    unregisterCleanup ??= registerCleanup(dispose);
  }
  function dispose() {
    disposed = true;
    if (unregisterCleanup) {
      unregisterCleanup();
      unregisterCleanup = null;
    }
    if (unsubscribeDynamicSkills) {
      unsubscribeDynamicSkills();
      unsubscribeDynamicSkills = null;
    }
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    if (deferredReloadTimer) {
      clearTimeout(deferredReloadTimer);
      deferredReloadTimer = null;
    }
    unsubscribeInteraction?.();
    unsubscribeInteraction = null;
    let resolved = Promise.resolve();
    if (watcher) {
      resolved = watcher.close();
      watcher = null;
    }
    if (pendingBatchTimer) {
      clearTimeout(pendingBatchTimer);
      pendingBatchTimer = null;
    }
    pendingChangedPaths.clear();
    unsubscribe();
    signal.clear();
    return resolved;
  }
  function handleChange(path) {
    logForDebugging(`Detected skill change: ${path}`);
    logEvent("tengu_skill_file_changed", {
      source: lit("chokidar"),
    });
    logChangeOnce(path);
    queueReload(path);
  }
  function logChangeOnce(path) {
    let any = path
      .split(/[/\\]/)
      .some((segment, index, segments) => segment === SYNCED_DIR && segments[index - 1] === "skills");
    let recentlyAnnounced = now() - NEGATIVE_INFINITY <= SKILL_WATCH_MAX_WAIT_MS;
    let changeKey = `${any}:${recentlyAnnounced}`;
    if (loggedChangeKeys.has(changeKey)) return;
    loggedChangeKeys.add(changeKey);
    logForDiagnosticsNoPII("info", "skill_watch_saw_change", {
      in_synced_skills_folder: any,
      within_40s_of_announced_reload: recentlyAnnounced,
      ...(isSlowSkillsWatchOn() && {
        kept_at_idle_poll_interval: true,
      }),
    });
  }
  function queueReload(path) {
    pendingChangedPaths.add(path);
    if (pendingBatchTimer) clearTimeout(pendingBatchTimer);
    pendingBatchTimer = setTimeout(async () => {
      pendingBatchTimer = null;
      let paths = [...pendingChangedPaths];
      pendingChangedPaths.clear();
      let idleWakeOnly = paths.length === 1 && paths[0] === SKILL_WATCHER_IDLE_WAKE_TAG;
      if (!idleWakeOnly) {
        let firstPath = paths.find((path) => path !== SKILL_WATCHER_IDLE_WAKE_TAG) ?? paths[0];
        if (await configChangeBlocked(firstPath)) {
          logForDebugging(`ConfigChange hook blocked skill reload (${paths.length} paths)`);
          return;
        }
      }
      clearSkillCaches();
      let fingerprint = await getFingerprint().catch(() => null);
      if (fingerprint === null) {
        clearCommandsCache();
        clearAgentDefinitionsCache();
        emitReload();
        return;
      }
      if (
        lastFingerprint !== null &&
        fingerprint.size === lastFingerprint.size &&
        [...lastFingerprint].every(([path, hash]) => fingerprint.get(path) === hash) &&
        idleWakeOnly
      ) {
        clearAgentDefinitionsCache();
        return;
      }
      clearCommandsCache();
      clearAgentDefinitionsCache();
      await resetProjectSkillDirectories().catch((error) =>
        logForDebugging(`[skills] re-reading the moved directory's skills failed: ${errorMessage(error)}`, {
          level: "warn",
        }),
      );
      lastFingerprint = fingerprint;
      emitReload();
    }, reloadDebounce);
  }
  function configChangeBlocked(path) {
    if (!startCommand) {
      logError(Error("skillChangeDetector: ConfigChange hook gate not wired"));
      return Promise.resolve(true);
    }
    return startCommand("skills", path);
  }
  function emitReload() {
    try {
      signal.emit();
    } catch (error) {
      for (let caughtError of error instanceof AggregateError ? error.errors : [error])
        logError(
          withTelemetryMessage(toError(caughtError), "skillChangeDetector: subscriber threw during reload"),
        );
    }
  }
  function rebridgeSkillsChanged() {
    if (disposed) return;
    unsubscribe();
    unsubscribe = skillsChangedSignal.subscribe(markReloaded);
  }
  return {
    initialize: startWatching,
    dispose,
    rehome: refreshWatchedPaths,
    [Symbol.asyncDispose]: dispose,
    subscribe: signal.subscribe,
    rebridgeSkillsChanged,
    _checkIdleTransitionForTest: updateIdleState,
  };
}
//@ chunk-3n0n2sf6.js:5552-5565 placement
/**
 * 全局共享的 skill 变更检测器，支持 rehome。
 */
var sharedSkillChangeDetector; // deferred: uses createSkillChangeDetector of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-3n0n2sf6.js:5552", () => {
  sharedSkillChangeDetector = createSkillChangeDetector();
});
//@ chunk-3n0n2sf6.js:5565-6693 fingerprint (2.1.88 match: getWatchablePaths, 0.908)
/**
 * 列出 skill 热加载要监听的目录：用户 skills（含 synced）、用户/项目 commands、项目 skills（git worktree 时回退主仓库）、用户/项目 agents、--add-dir 的 .claude/skills；只返回存在的。
 */
async function getWatchablePaths(hostFiles) {
  let fs = getFsImplementation();
  let paths = [];
  let userSkillsPath = getSkillsPath("userSettings", "skills");
  if (userSkillsPath)
    try {
      await fs.stat(userSkillsPath);
      paths.push(userSkillsPath);
    } catch {}
  if (userSkillsPath) {
    let joined = pathModule.join(userSkillsPath, SYNCED_DIR);
    try {
      await fs.stat(joined);
      paths.push(joined);
    } catch {}
  }
  let userCommandsPath = getSkillsPath("userSettings", "commands");
  if (userCommandsPath)
    try {
      await fs.stat(userCommandsPath);
      paths.push(userCommandsPath);
    } catch {}
  let projectSkillsPath = getSkillsPath("projectSettings", "skills");
  if (projectSkillsPath)
    try {
      let absolutePath = pathModule.resolve(projectSkillsPath);
      if (isStorageV5Enabled() && hostFiles !== undefined) {
        if (await hostPathExists(hostFiles, absolutePath)) paths.push(absolutePath);
      } else {
        await fs.stat(absolutePath);
        paths.push(absolutePath);
      }
    } catch {}
  let gitRoot = findGitRoot(getOriginalCwd());
  let canonicalGitRoot = findCanonicalGitRoot(getOriginalCwd());
  if (getProjectConfigRoot() === null && gitRoot && canonicalGitRoot && gitRoot !== canonicalGitRoot) {
    let path = pathModule.join(gitRoot, ".claude", "skills");
    let path_2 = pathModule.join(canonicalGitRoot, ".claude", "skills");
    if (
      !paths.includes(path) &&
      !(await pathExists(fs, hostFiles, path)) &&
      (await pathExists(fs, hostFiles, path_2))
    )
      paths.push(path_2);
  }
  let projectCommandsPath = getSkillsPath("projectSettings", "commands");
  if (projectCommandsPath)
    try {
      let absolutePath = pathModule.resolve(projectCommandsPath);
      if (isStorageV5Enabled() && hostFiles !== undefined) {
        if (await hostPathExists(hostFiles, absolutePath)) paths.push(absolutePath);
      } else {
        await fs.stat(absolutePath);
        paths.push(absolutePath);
      }
    } catch {}
  let skillsPath = getSkillsPath("userSettings", "agents");
  if (skillsPath)
    try {
      await fs.stat(skillsPath);
      paths.push(skillsPath);
    } catch {}
  let skillsPath_2 = getSkillsPath("projectSettings", "agents");
  if (skillsPath_2)
    try {
      let resolved = pathModule.resolve(skillsPath_2);
      if (isStorageV5Enabled() && hostFiles !== undefined) {
        if (await hostPathExists(hostFiles, resolved)) paths.push(resolved);
      } else {
        await fs.stat(resolved);
        paths.push(resolved);
      }
    } catch {}
  for (let dir of getAdditionalDirectoriesForClaudeMd()) {
    let additionalSkillsPath = pathModule.join(dir, ".claude", "skills");
    try {
      if (isStorageV5Enabled() && hostFiles !== undefined) {
        if (await hostPathExists(hostFiles, pathModule.resolve(additionalSkillsPath)))
          paths.push(additionalSkillsPath);
      } else {
        await fs.stat(additionalSkillsPath);
        paths.push(additionalSkillsPath);
      }
    } catch {}
  }
  return paths;
}
//@ chunk-3n0n2sf6.js:6693-6798 sole-consumer
async function hostPathExists(fs, hostPath) {
  let stats = await fs.hostFiles.stat(PathSpace.workspace(hostPath));
  return stats.ok && stats.value.kind !== "absent";
}
//@ chunk-3n0n2sf6.js:6798-6908 sole-consumer
async function pathExists(fs, hostFiles, path) {
  try {
    if (isStorageV5Enabled() && hostFiles !== undefined) return await hostPathExists(hostFiles, path);
    await fs.stat(path);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-wtefc7a6.js:346-618 placement
/**
 * 工作目录变化后重新加载技能：清缓存、通知变化并让技能监视器重新定位。
 */
async function reloadSkillsAfterDirectoryChange() {
  refreshSkillsSyncVeto();
  clearCommandsCache();
  clearAgentDefinitionsCache();
  skillsChangedSignal.emit();
  try {
    await sharedSkillChangeDetector.rehome();
    logFeatureOk("skill_directory_reload");
  } catch (error) {
    logForDebugging(
      `directory change: re-targeting the skill watcher failed (continuing with the previous watch): ${error}`,
      {
        level: "error",
      },
    );
    logFeatureSad("skill_directory_reload", "rehome_failed");
  }
}
export { sharedSkillChangeDetector, reloadSkillsAfterDirectoryChange, diffSkillServers, skillChangeDetector };
