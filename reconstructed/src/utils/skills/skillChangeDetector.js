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
import { Jz } from "../plugins/pluginsChangedSignal.js";
import {
  onDynamicSkillsLoaded,
  getSkillsPath,
  clearSkillCaches,
  resetProjectSkillDirectories,
} from "../../skills/loadSkillsDir.js";
import { clearCommandMemoizationCaches, clearCommandsCache } from "../../commands.js";
import { logForDebugging } from "../debug.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { Ok } from "../../../vendor/chokidar/index.js";
import { g5t, SYNCED_DIR } from "../plugins/syncedItems.js";
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
import { eN } from "../claudeAiSync/skillsSync.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { WORKER_KINDS } from "../../daemon/runDaemonWorker.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";

/**
 * skill 变更检测器：chokidar 监听上述目录（depth 2，只看 .md，忽略 .git），按交互活跃度切换轮询间隔，变化去抖后先跑 ConfigChange 钩子（可阻断），再清 skill 缓存并通知重载。
 */
//@ chunk-2njac0sx.js:1112-5402 placement
function createSkillChangeDetector(changedPath) {
  let u = changedPath?.stabilityThreshold ?? SKILL_WATCH_DEBOUNCE_MS,
    i = changedPath?.pollInterval ?? SKILL_WATCH_MIN_MS,
    C = changedPath?.reloadDebounce ?? SKILL_WATCH_SETTLE_MS,
    p = changedPath?.chokidarInterval ?? SKILL_WATCH_POLL_MS,
    k,
    D = changedPath?.getFingerprint ?? (() => collectPromptCommandHashes(k)),
    w = changedPath?.now ?? Date.now,
    E = changedPath?.lastInteractionTime ?? getLastInteractionTime,
    R = changedPath?.onInteraction ?? onInteraction,
    y = createSignal(),
    NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  function S() {
    ((NEGATIVE_INFINITY = w()), y.emit());
  }
  let subscribe = Jz.subscribe(S),
    g = null,
    oe = 0,
    B = !1,
    I = null,
    _ = null,
    A = null,
    K = null,
    L = !1,
    re = new Set(),
    v = [],
    F = 0,
    W = new Set(),
    M = null,
    q = !1,
    P = !1,
    j = null,
    O = null,
    Q;
  async function pe(e, r) {
    if (q || P || isDiskless()) return;
    if (((q = !0), (Q = e), (k = r), !j))
      j = onDynamicSkillsLoaded(() => {
        (clearCommandMemoizationCaches(), y.emit());
      });
    let s = ++F,
      f = await getWatchablePaths(r);
    if (P || s !== F) return;
    if (((v = f), v.length === 0)) return;
    if (((M = await D().catch(() => null)), P || s !== F)) return;
    (logForDebugging(`Watching for changes in skill/command directories: ${v.join(", ")}...`), (g = Z(p)));
    let m = g;
    if ((await new Promise((c) => m.once("ready", () => c())), SKILL_WATCH_ENABLED)) se();
    O = registerCleanup(z);
  }
  function Z(e) {
    ((oe = w()), (B = !1));
    let r = getSkillsPath("userSettings", "skills"),
      watch = Ok.watch(v, {
        persistent: !0,
        ignoreInitial: !0,
        depth: 2,
        awaitWriteFinish: { stabilityThreshold: u, pollInterval: i },
        ignored: (m, c) => {
          if (c && !c.isFile() && !c.isDirectory() && !c.isSymbolicLink()) return !0;
          if (m.split(/[/\\]/).some((T) => T === ".git")) return !0;
          if (pathModule.relative(r, m).split(pathModule.sep)[0] === g5t) return !0;
          if (c?.isFile()) return !m.endsWith(".md");
          return !1;
        },
        ignorePermissionErrors: !0,
        usePolling: SKILL_WATCH_ENABLED,
        interval: e,
        binaryInterval: e,
        atomic: !0,
      });
    (watch.on("add", te), watch.on("change", te), watch.on("unlink", te));
    let f = !1;
    return (
      watch.on("unlinkDir", (m) => {
        ((f ||= v.some((c) => pathModule.resolve(c) === pathModule.resolve(m))), (B &&= !f));
      }),
      watch.once("ready", () => {
        let watched = watch.getWatched();
        B = !f && v.every((c) => pathModule.resolve(c) in watched);
      }),
      watch.on("error", (m) =>
        logForDebugging(`[skills] watcher error: ${errorMessage(m)}`, { level: "warn" }),
      ),
      watch
    );
  }
  function se() {
    ((K ??= R(() => {
      if (L)
        A ??= setTimeout(() => {
          ((A = null), ae());
        }, 0);
    })),
      ee());
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
    let e = SKILL_WATCH_MAX_IDLE_MS - (w() - E()) + 1,
      r =
        e < SKILL_WATCH_RETRY_MS
          ? SKILL_WATCH_RETRY_MS
          : e <= SKILL_WATCH_MAX_IDLE_MS
            ? e
            : SKILL_WATCH_MAX_IDLE_MS + 1;
    ((_ = setTimeout(() => {
      ((_ = null), ae());
    }, r)),
      _.unref?.());
  }
  function ce() {
    if (P || !g) return;
    let e = w() - E() > SKILL_WATCH_MAX_IDLE_MS;
    if (e === L) return;
    L = e;
    let r = e ? SKILL_WATCH_IDLE_MS : p;
    logForDebugging(`[skills] ${e ? "idle" : "active"} \u2014 switching poll interval to ${r}ms`);
    let s = !1;
    if (B && (e || w() - oe <= SKILL_WATCH_TIMEOUT_MS))
      try {
        (g.setPollInterval(r), (s = !0));
      } catch (error) {
        logError(
          withTelemetryMessage(
            toError(error),
            "skillChangeDetector: could not change the poll interval in place; built a new watcher instead",
          ),
        );
      }
    if (!s) (logForDebugging("[skills] building a new watcher for the switch"), g.close(), (g = Z(r)));
    if (!e) (ue(SKILL_WATCHER_IDLE_WAKE_TAG), ee());
  }
  async function ke() {
    if (!q || P) return;
    let e = await getWatchablePaths(k);
    if (P) return;
    let r = uniq([...v, ...e]);
    if (r.length === v.length) return;
    let s = ++F;
    if (
      ((v = r),
      logForDebugging(`[skills] session moved \u2014 watching skill/command directories: ${v.join(", ")}`),
      g)
    )
      g.close();
    g = Z(L ? SKILL_WATCH_IDLE_MS : p);
    let f = g,
      promise = new Promise((c) => f.once("ready", () => c()));
    if ((await Promise.race([promise, sleep(SKILL_WATCH_BACKOFF_MS, void 0, { unref: !0 })]), P || s !== F))
      return;
    if (SKILL_WATCH_ENABLED) se();
    O ??= registerCleanup(z);
  }
  function z() {
    if (((P = !0), O)) (O(), (O = null));
    if (j) (j(), (j = null));
    if (_) (clearTimeout(_), (_ = null));
    if (A) (clearTimeout(A), (A = null));
    (K?.(), (K = null));
    let resolved = Promise.resolve();
    if (g) ((resolved = g.close()), (g = null));
    if (I) (clearTimeout(I), (I = null));
    return (W.clear(), subscribe(), y.clear(), resolved);
  }
  function te(e) {
    (logForDebugging(`Detected skill change: ${e}`),
      logEvent("tengu_skill_file_changed", { source: lit("chokidar") }),
      we(e),
      ue(e));
  }
  function we(e) {
    let any = e.split(/[/\\]/).some((m, c, T) => m === SYNCED_DIR && T[c - 1] === "skills"),
      s = w() - NEGATIVE_INFINITY <= SKILL_WATCH_MAX_WAIT_MS,
      f = `${any}:${s}`;
    if (re.has(f)) return;
    (re.add(f),
      logForDiagnosticsNoPII("info", "skill_watch_saw_change", {
        in_synced_skills_folder: any,
        within_40s_of_announced_reload: s,
      }));
  }
  function ue(e) {
    if ((W.add(e), I)) clearTimeout(I);
    I = setTimeout(async () => {
      I = null;
      let paths = [...W];
      W.clear();
      let s = paths.length === 1 && paths[0] === SKILL_WATCHER_IDLE_WAKE_TAG;
      if (!s) {
        let c = paths.find((T) => T !== SKILL_WATCHER_IDLE_WAKE_TAG) ?? paths[0];
        if (await Se(c)) {
          logForDebugging(`ConfigChange hook blocked skill reload (${paths.length} paths)`);
          return;
        }
      }
      clearSkillCaches();
      let f = await D().catch(() => null);
      if (f === null) {
        (clearCommandsCache(), clearAgentDefinitionsCache(), de());
        return;
      }
      if (M !== null && f.size === M.size && [...M].every(([c, T]) => f.get(c) === T) && s) {
        clearAgentDefinitionsCache();
        return;
      }
      (clearCommandsCache(),
        clearAgentDefinitionsCache(),
        await resetProjectSkillDirectories().catch((c) =>
          logForDebugging(`[skills] re-reading the moved directory's skills failed: ${errorMessage(c)}`, {
            level: "warn",
          }),
        ),
        (M = f),
        de());
    }, C);
  }
  function Se(e) {
    if (!Q)
      return (logError(Error("skillChangeDetector: ConfigChange hook gate not wired")), Promise.resolve(!0));
    return Q("skills", e);
  }
  function de() {
    try {
      y.emit();
    } catch (error) {
      for (let r of error instanceof AggregateError ? error.errors : [error])
        logError(withTelemetryMessage(toError(r), "skillChangeDetector: subscriber threw during reload"));
    }
  }
  function Pe() {
    if (P) return;
    (subscribe(), (subscribe = Jz.subscribe(S)));
  }
  return {
    initialize: pe,
    dispose: z,
    rehome: ke,
    [Symbol.asyncDispose]: z,
    subscribe: y.subscribe,
    rebridgeSkillsChanged: Pe,
    _checkIdleTransitionForTest: ce,
  };
}
//@ chunk-2njac0sx.js:5402-5415 placement
var fue = createSkillChangeDetector();
/**
 * 列出 skill 热加载要监听的目录：用户 skills（含 synced）、用户/项目 commands、项目 skills（git worktree 时回退主仓库）、用户/项目 agents、--add-dir 的 .claude/skills；只返回存在的。
 */
//@ chunk-2njac0sx.js:5415-6543 fingerprint = getWatchablePaths (0.908)
async function getWatchablePaths(n) {
  let fs = getFsImplementation(),
    paths = [],
    userSkillsPath = getSkillsPath("userSettings", "skills");
  if (userSkillsPath)
    try {
      (await fs.stat(userSkillsPath), paths.push(userSkillsPath));
    } catch {}
  if (userSkillsPath) {
    let joined = pathModule.join(userSkillsPath, SYNCED_DIR);
    try {
      (await fs.stat(joined), paths.push(joined));
    } catch {}
  }
  let userCommandsPath = getSkillsPath("userSettings", "commands");
  if (userCommandsPath)
    try {
      (await fs.stat(userCommandsPath), paths.push(userCommandsPath));
    } catch {}
  let projectSkillsPath = getSkillsPath("projectSettings", "skills");
  if (projectSkillsPath)
    try {
      let absolutePath = pathModule.resolve(projectSkillsPath);
      if (isStorageV5Enabled() && n !== void 0) {
        if (await hostPathExists(n, absolutePath)) paths.push(absolutePath);
      } else (await fs.stat(absolutePath), paths.push(absolutePath));
    } catch {}
  let D = findGitRoot(getOriginalCwd()),
    w = findCanonicalGitRoot(getOriginalCwd());
  if (getProjectConfigRoot() === null && D && w && D !== w) {
    let joined = pathModule.join(D, ".claude", "skills"),
      joined_2 = pathModule.join(w, ".claude", "skills");
    if (!paths.includes(joined) && !(await pathExists(fs, n, joined)) && (await pathExists(fs, n, joined_2)))
      paths.push(joined_2);
  }
  let projectCommandsPath = getSkillsPath("projectSettings", "commands");
  if (projectCommandsPath)
    try {
      let absolutePath = pathModule.resolve(projectCommandsPath);
      if (isStorageV5Enabled() && n !== void 0) {
        if (await hostPathExists(n, absolutePath)) paths.push(absolutePath);
      } else (await fs.stat(absolutePath), paths.push(absolutePath));
    } catch {}
  let R = getSkillsPath("userSettings", "agents");
  if (R)
    try {
      (await fs.stat(R), paths.push(R));
    } catch {}
  let y = getSkillsPath("projectSettings", "agents");
  if (y)
    try {
      let resolved = pathModule.resolve(y);
      if (isStorageV5Enabled() && n !== void 0) {
        if (await hostPathExists(n, resolved)) paths.push(resolved);
      } else (await fs.stat(resolved), paths.push(resolved));
    } catch {}
  for (let dir of getAdditionalDirectoriesForClaudeMd()) {
    let additionalSkillsPath = pathModule.join(dir, ".claude", "skills");
    try {
      if (isStorageV5Enabled() && n !== void 0) {
        if (await hostPathExists(n, pathModule.resolve(additionalSkillsPath)))
          paths.push(additionalSkillsPath);
      } else (await fs.stat(additionalSkillsPath), paths.push(additionalSkillsPath));
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
    if (isStorageV5Enabled() && u !== void 0) return await hostPathExists(u, i);
    return (await n.stat(i), !0);
  } catch {
    return !1;
  }
}
/**
 * 测试用：重置 skill 变更检测器。
 */
//@ chunk-1rckdhfn.js:1589-1626 fingerprint = skillChangeDetector (0.599)
function skillChangeDetector() {
  complianceTaintState().resetForTesting();
}
/**
 * 工作目录变化后重新加载技能：清缓存、通知变化并让技能监视器重新定位。
 */
//@ chunk-5634v5r7.js:346-618 placement
async function reloadSkillsAfterDirectoryChange() {
  (eN(), clearCommandsCache(), clearAgentDefinitionsCache(), Jz.emit());
  try {
    (await fue.rehome(), logFeatureOk("skill_directory_reload"));
  } catch (error) {
    (logForDebugging(
      `directory change: re-targeting the skill watcher failed (continuing with the previous watch): ${error}`,
      { level: "error" },
    ),
      logFeatureSad("skill_directory_reload", "rehome_failed"));
  }
}
/**
 * 比较技能变化需要停止/启动/重启的服务。
 */
//@ chunk-g3mpnrhd.js:2629-3044 placement
function diffSkillServers(r, n) {
  let i = { stop: [], start: [], restart: [] };
  for (let s of Object.keys(WORKER_KINDS)) {
    let f = r[s] ?? [],
      a = n[s] ?? [],
      max = Math.max(f.length, a.length);
    for (let e = 0; e < max; e++) {
      let l = `${s}:${e}`,
        m = f[e],
        g = a[e];
      if (m !== void 0 && g === void 0) i.stop.push({ id: l, kind: s, previousConfig: m });
      else if (m === void 0 && g !== void 0) i.start.push({ id: l, kind: s, config: g });
      else if (!En(m, g)) i.restart.push({ id: l, kind: s, config: g, previousConfig: m });
    }
  }
  return i;
}

export { reloadSkillsAfterDirectoryChange, fue, skillChangeDetector, diffSkillServers };
