/**
 * utils/skills/skillChangeDetector.ts
 *
 * 并入旧版已有路径：skill 变更检测。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/skills/skillChangeDetector.ts
 * pieces: chunk-1rckdhfn.js (1), chunk-2njac0sx.js (5), chunk-5634v5r7.js (1), chunk-g3mpnrhd.js (1)
 * attribution: fingerprint 2, placement 4, sole-consumer 2
 */
import * as pathModule from "path";
import {
  SKILL_WATCH_DEBOUNCE_MS,
  SKILL_WATCH_MIN_MS,
  SKILL_WATCH_SETTLE_MS,
  SKILL_WATCH_POLL_MS,
  collectPromptCommandHashes,
  SKILL_WATCH_ENABLED,
  SKILL_WATCH_MAX_IDLE_MS,
  SKILL_WATCH_RETRY_MS,
  SKILL_WATCH_IDLE_MS,
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
import { chokidar_default } from "../../../vendor/chokidar/index.js";
import { SYNCED_SUBDIR, SYNCED_DIR } from "../plugins/syncedItems.js";
import { errorMessage, withTelemetryMessage, toError } from "../errors.js";
import { logError } from "../log.js";
import { uniq } from "../collections.js";
import { sleep } from "../sleep.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { clearAgentDefinitionsCache } from "../../tools/AgentTool/loadAgentsDir.js";
import { getFsImplementation } from "../fsOperations.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { findGitRoot, findCanonicalGitRoot } from "../git.js";
import { PathSpace } from "../resultError.js";
import { complianceTaintState } from "../../services/policyLimits/complianceTaints.js";
import { refreshSkillsSyncVeto } from "../claudeAiSync/skillsSync.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { WORKER_KINDS } from "../../daemon/runDaemonWorker.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-2njac0sx.js:1112-5402 placement
/**
 * skill 变更检测器：chokidar 监听上述目录（depth 2，只看 .md，忽略 .git），按交互活跃度切换轮询间隔，变化去抖后先跑 ConfigChange 钩子（可阻断），再清 skill 缓存并通知重载。
 */
function createSkillChangeDetector(changedPath) {
  let stabilityThreshold = changedPath?.stabilityThreshold ?? SKILL_WATCH_DEBOUNCE_MS;
  let pollInterval = changedPath?.pollInterval ?? SKILL_WATCH_MIN_MS;
  let reloadDebounce = changedPath?.reloadDebounce ?? SKILL_WATCH_SETTLE_MS;
  let chokidarInterval = changedPath?.chokidarInterval ?? SKILL_WATCH_POLL_MS;
  let command;
  let D = changedPath?.getFingerprint ?? (() => collectPromptCommandHashes(command));
  let now = changedPath?.now ?? Date.now;
  let lastInteractionTime = changedPath?.lastInteractionTime ?? getLastInteractionTime;
  let onInteraction_2 = changedPath?.onInteraction ?? onInteraction;
  let signal = createSignal();
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  function S() {
    NEGATIVE_INFINITY = now();
    signal.emit();
  }
  let x = skillsChangedSignal.subscribe(S);
  let g = null;
  let oe = 0;
  let B = false;
  let I = null;
  let _ = null;
  let A = null;
  let K = null;
  let L = false;
  let re = new Set();
  let v = [];
  let F = 0;
  let W = new Set();
  let M = null;
  let q = false;
  let P = false;
  let j = null;
  let O = null;
  let Q;
  async function pe(e, r) {
    if (q || P || isDiskless()) return;
    q = true;
    Q = e;
    command = r;
    if (!j)
      j = onDynamicSkillsLoaded(() => {
        clearCommandMemoizationCaches();
        signal.emit();
      });
    let s = ++F;
    let watchablePaths = await getWatchablePaths(r);
    if (P || s !== F) return;
    v = watchablePaths;
    if (v.length === 0) return;
    M = await D().catch(() => null);
    if (P || s !== F) return;
    logForDebugging(`Watching for changes in skill/command directories: ${v.join(", ")}...`);
    g = Z(chokidarInterval);
    let m = g;
    await new Promise((resolve) => m.once("ready", () => resolve()));
    if (SKILL_WATCH_ENABLED) se();
    O = registerCleanup(z);
  }
  function Z(e) {
    oe = now();
    B = false;
    let skillsPath = getSkillsPath("userSettings", "skills");
    let s = chokidar_default.watch(v, {
      persistent: true,
      ignoreInitial: true,
      depth: 2,
      awaitWriteFinish: {
        stabilityThreshold,
        pollInterval,
      },
      ignored: (m, c) => {
        if (c && !c.isFile() && !c.isDirectory() && !c.isSymbolicLink()) return true;
        if (m.split(/[/\\]/).some((T) => T === ".git")) return true;
        if (pathModule.relative(skillsPath, m).split(pathModule.sep)[0] === SYNCED_SUBDIR) return true;
        if (c?.isFile()) return !m.endsWith(".md");
        return false;
      },
      ignorePermissionErrors: true,
      usePolling: SKILL_WATCH_ENABLED,
      interval: e,
      binaryInterval: e,
      atomic: true,
    });
    s.on("add", te);
    s.on("change", te);
    s.on("unlink", te);
    let f = false;
    s.on("unlinkDir", (m) => {
      f ||= v.some((c) => pathModule.resolve(c) === pathModule.resolve(m));
      B &&= !f;
    });
    s.once("ready", () => {
      let watched = s.getWatched();
      B = !f && v.every((c) => pathModule.resolve(c) in watched);
    });
    s.on("error", (m) =>
      logForDebugging(`[skills] watcher error: ${errorMessage(m)}`, {
        level: "warn",
      }),
    );
    return s;
  }
  function se() {
    K ??= onInteraction_2(() => {
      if (L)
        A ??= setTimeout(() => {
          A = null;
          ae();
        }, 0);
    });
    ee();
  }
  function ae() {
    try {
      ce();
    } catch (error) {
      logError(
        withTelemetryMessage(
          toError(error),
          "skillChangeDetector: idle check failed; will check again later",
        ),
      );
    }
    ee();
  }
  function ee() {
    if (P || L || _ !== null) return;
    let e = SKILL_WATCH_MAX_IDLE_MS - (now() - lastInteractionTime()) + 1;
    let r =
      e < SKILL_WATCH_RETRY_MS
        ? SKILL_WATCH_RETRY_MS
        : e <= SKILL_WATCH_MAX_IDLE_MS
          ? e
          : SKILL_WATCH_MAX_IDLE_MS + 1;
    _ = setTimeout(() => {
      _ = null;
      ae();
    }, r);
    _.unref?.();
  }
  function ce() {
    if (P || !g) return;
    let e = now() - lastInteractionTime() > SKILL_WATCH_MAX_IDLE_MS;
    if (e === L) return;
    L = e;
    let r = e ? SKILL_WATCH_IDLE_MS : chokidarInterval;
    logForDebugging(`[skills] ${e ? "idle" : "active"} \u2014 switching poll interval to ${r}ms`);
    let s = false;
    if (B && (e || now() - oe <= SKILL_WATCH_TIMEOUT_MS))
      try {
        g.setPollInterval(r);
        s = true;
      } catch (error) {
        logError(
          withTelemetryMessage(
            toError(error),
            "skillChangeDetector: could not change the poll interval in place; built a new watcher instead",
          ),
        );
      }
    if (!s) {
      logForDebugging("[skills] building a new watcher for the switch");
      g.close();
      g = Z(r);
    }
    if (!e) {
      ue(SKILL_WATCHER_IDLE_WAKE_TAG);
      ee();
    }
  }
  async function ke() {
    if (!q || P) return;
    let watchablePaths = await getWatchablePaths(command);
    if (P) return;
    let r = uniq([...v, ...watchablePaths]);
    if (r.length === v.length) return;
    let s = ++F;
    v = r;
    logForDebugging(`[skills] session moved \u2014 watching skill/command directories: ${v.join(", ")}`);
    if (g) g.close();
    g = Z(L ? SKILL_WATCH_IDLE_MS : chokidarInterval);
    let f = g;
    let promise = new Promise((resolve) => f.once("ready", () => resolve()));
    await Promise.race([
      promise,
      sleep(SKILL_WATCH_BACKOFF_MS, undefined, {
        unref: true,
      }),
    ]);
    if (P || s !== F) return;
    if (SKILL_WATCH_ENABLED) se();
    O ??= registerCleanup(z);
  }
  function z() {
    P = true;
    if (O) {
      O();
      O = null;
    }
    if (j) {
      j();
      j = null;
    }
    if (_) {
      clearTimeout(_);
      _ = null;
    }
    if (A) {
      clearTimeout(A);
      A = null;
    }
    K?.();
    K = null;
    let resolved = Promise.resolve();
    if (g) {
      resolved = g.close();
      g = null;
    }
    if (I) {
      clearTimeout(I);
      I = null;
    }
    W.clear();
    x();
    signal.clear();
    return resolved;
  }
  function te(path) {
    logForDebugging(`Detected skill change: ${path}`);
    logEvent("tengu_skill_file_changed", {
      source: lit("chokidar"),
    });
    we(path);
    ue(path);
  }
  function we(path) {
    let any = path.split(/[/\\]/).some((m, c, T) => m === SYNCED_DIR && T[c - 1] === "skills");
    let s = now() - NEGATIVE_INFINITY <= SKILL_WATCH_MAX_WAIT_MS;
    let f = `${any}:${s}`;
    if (re.has(f)) return;
    re.add(f);
    logForDiagnosticsNoPII("info", "skill_watch_saw_change", {
      in_synced_skills_folder: any,
      within_40s_of_announced_reload: s,
    });
  }
  function ue(e) {
    W.add(e);
    if (I) clearTimeout(I);
    I = setTimeout(async () => {
      I = null;
      let paths = [...W];
      W.clear();
      let s = paths.length === 1 && paths[0] === SKILL_WATCHER_IDLE_WAKE_TAG;
      if (!s) {
        let c = paths.find((path) => path !== SKILL_WATCHER_IDLE_WAKE_TAG) ?? paths[0];
        if (await Se(c)) {
          logForDebugging(`ConfigChange hook blocked skill reload (${paths.length} paths)`);
          return;
        }
      }
      clearSkillCaches();
      let f = await D().catch(() => null);
      if (f === null) {
        clearCommandsCache();
        clearAgentDefinitionsCache();
        de();
        return;
      }
      if (M !== null && f.size === M.size && [...M].every(([c, T]) => f.get(c) === T) && s) {
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
      M = f;
      de();
    }, reloadDebounce);
  }
  function Se(e) {
    if (!Q) {
      logError(Error("skillChangeDetector: ConfigChange hook gate not wired"));
      return Promise.resolve(true);
    }
    return Q("skills", e);
  }
  function de() {
    try {
      signal.emit();
    } catch (error) {
      for (let r of error instanceof AggregateError ? error.errors : [error])
        logError(withTelemetryMessage(toError(r), "skillChangeDetector: subscriber threw during reload"));
    }
  }
  function Pe() {
    if (P) return;
    x();
    x = skillsChangedSignal.subscribe(S);
  }
  return {
    initialize: pe,
    dispose: z,
    rehome: ke,
    [Symbol.asyncDispose]: z,
    subscribe: signal.subscribe,
    rebridgeSkillsChanged: Pe,
    _checkIdleTransitionForTest: ce,
  };
}
//@ chunk-2njac0sx.js:5402-5415 placement
/**
 * 全局共享的 skill 变更检测器，支持 rehome。
 */
var sharedSkillChangeDetector = createSkillChangeDetector();
//@ chunk-2njac0sx.js:5415-6543 fingerprint = getWatchablePaths (0.908)
/**
 * 列出 skill 热加载要监听的目录：用户 skills（含 synced）、用户/项目 commands、项目 skills（git worktree 时回退主仓库）、用户/项目 agents、--add-dir 的 .claude/skills；只返回存在的。
 */
async function getWatchablePaths(n) {
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
      if (isStorageV5Enabled() && n !== undefined) {
        if (await hostPathExists(n, absolutePath)) paths.push(absolutePath);
      } else {
        await fs.stat(absolutePath);
        paths.push(absolutePath);
      }
    } catch {}
  let gitRoot = findGitRoot(getOriginalCwd());
  let canonicalGitRoot = findCanonicalGitRoot(getOriginalCwd());
  if (getProjectConfigRoot() === null && gitRoot && canonicalGitRoot && gitRoot !== canonicalGitRoot) {
    let joined = pathModule.join(gitRoot, ".claude", "skills");
    let joined_2 = pathModule.join(canonicalGitRoot, ".claude", "skills");
    if (!paths.includes(joined) && !(await pathExists(fs, n, joined)) && (await pathExists(fs, n, joined_2)))
      paths.push(joined_2);
  }
  let projectCommandsPath = getSkillsPath("projectSettings", "commands");
  if (projectCommandsPath)
    try {
      let absolutePath = pathModule.resolve(projectCommandsPath);
      if (isStorageV5Enabled() && n !== undefined) {
        if (await hostPathExists(n, absolutePath)) paths.push(absolutePath);
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
      if (isStorageV5Enabled() && n !== undefined) {
        if (await hostPathExists(n, resolved)) paths.push(resolved);
      } else {
        await fs.stat(resolved);
        paths.push(resolved);
      }
    } catch {}
  for (let dir of getAdditionalDirectoriesForClaudeMd()) {
    let additionalSkillsPath = pathModule.join(dir, ".claude", "skills");
    try {
      if (isStorageV5Enabled() && n !== undefined) {
        if (await hostPathExists(n, pathModule.resolve(additionalSkillsPath)))
          paths.push(additionalSkillsPath);
      } else {
        await fs.stat(additionalSkillsPath);
        paths.push(additionalSkillsPath);
      }
    } catch {}
  }
  return paths;
}
//@ chunk-2njac0sx.js:6543-6648 sole-consumer
async function hostPathExists(n, u) {
  let stats = await n.hostFiles.stat(PathSpace.workspace(u));
  return stats.ok && stats.value.kind !== "absent";
}
//@ chunk-2njac0sx.js:6648-6758 sole-consumer
async function pathExists(n, u, i) {
  try {
    if (isStorageV5Enabled() && u !== undefined) return await hostPathExists(u, i);
    await n.stat(i);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-1rckdhfn.js:1589-1626 fingerprint = skillChangeDetector (0.599)
/**
 * 测试用：重置 skill 变更检测器。
 */
function skillChangeDetector() {
  complianceTaintState().resetForTesting();
}
//@ chunk-5634v5r7.js:346-618 placement
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
//@ chunk-g3mpnrhd.js:2629-3044 placement
/**
 * 比较技能变化需要停止/启动/重启的服务。
 */
function diffSkillServers(r, config) {
  let i = {
    stop: [],
    start: [],
    restart: [],
  };
  for (let key of Object.keys(WORKER_KINDS)) {
    let f = r[key] ?? [];
    let a = config[key] ?? [];
    let max = Math.max(f.length, a.length);
    for (let j = 0; j < max; j++) {
      let id = `${key}:${j}`;
      let m = f[j];
      let g = a[j];
      if (m !== undefined && g === undefined)
        i.stop.push({
          id,
          kind: key,
          previousConfig: m,
        });
      else if (m === undefined && g !== undefined)
        i.start.push({
          id,
          kind: key,
          config: g,
        });
      else if (!En(m, g))
        i.restart.push({
          id,
          kind: key,
          config: g,
          previousConfig: m,
        });
    }
  }
  return i;
}
export { reloadSkillsAfterDirectoryChange, sharedSkillChangeDetector, skillChangeDetector, diffSkillServers };
