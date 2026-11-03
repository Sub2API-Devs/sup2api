/**
 * plugins/functionHooks/devModsStatus.ts
 *
 * 2.1.316 新增：plugin-dir 监视下 mod 状态变化的汇总与报告
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (38)
 * attribution: placement 38
 */
import { basename, sep, relative, join } from "path";
import { identity as identity_2 } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { stripPluginPrefix, ReloadFailedError } from "./hooksModuleLoader.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-e6aww6q8.js:4119561-4119615 placement
/**
 * 带清理的 HostScoped 槽
 */
var createHostStateSlot = () =>
  identity_2(createValueSlot(), (e) => {
    e.get()?.();
    e.set(undefined);
  });
//@ chunk-e6aww6q8.js:4119615-4119629 placement
/**
 * 开发 mod 的宿主状态
 */
var devModHostState = createHostStateSlot();
//@ chunk-e6aww6q8.js:4119629-4119663 placement
/**
 * "options changed — "
 */
var OPTIONS_CHANGED_PREFIX = "options changed \u2014 ";
//@ chunk-e6aww6q8.js:4119663-4119778 placement
/**
 * 比较两个文件戳（大小与哈希）：same、other 或 unknown。
 */
function compareStamp(stamp, n) {
  if (stamp === undefined || n === undefined) return "unknown";
  return stamp.size === n.size && stamp.hash === n.hash ? "same" : "other";
}
//@ chunk-e6aww6q8.js:4119778-4120026 placement
/**
 * 判断开发插件文件变化的来源（本进程写入、外部修改或无变化）。
 */
function classifyChangeSource(e, n, r) {
  let s = compareStamp(e.stamp, n.read);
  let y = e.ctimeMs === n.taken?.ctimeMs ? compareStamp(e.stamp, n.taken?.stamp) : "other";
  let S = s === "other" && y !== "same";
  let isServed = s === "same" && n.isServed;
  let L = y !== "other";
  let G = e.ctimeMs <= r;
  return S ? undefined : isServed ? "served" : L ? "retold" : G ? "clock" : undefined;
}
//@ chunk-e6aww6q8.js:4120026-4120145 placement
function diffPresentPlugins(e, n) {
  let r = new Set(n);
  return {
    appeared: n.filter((s) => !e.has(s)),
    gone: [...e.keys()].filter((key) => !r.has(key)),
  };
}
//@ chunk-e6aww6q8.js:4120190-4120523 placement
/**
 * 描述开发插件目录中插件的出现或消失（已加载/卸载、新出现或已移走）。
 */
function describePresenceChange(e, n, r) {
  let s = `${basename(r.root)}${sep}`;
  let h = e === "new" ? `new in ${s}` : `gone from ${s}`;
  switch (n) {
    case "reloaded":
      return `${e === "new" ? "loaded" : "unloaded"} (${h})`;
    case "not-loaded":
      return `${h}, not loaded; /plugin shows why`;
    case "held":
      return `${h}, on hold: /reload-plugins applies it`;
    case "unbound":
      return `${h}; restart to apply`;
  }
}
//@ chunk-e6aww6q8.js:4120557-4120604 placement
/**
 * 相对路径或 none
 */
var relativeOrNone = (e, n) => (e === undefined ? "none" : relative(n.root, e));
//@ chunk-e6aww6q8.js:4120604-4120711 placement
function describeHookCount(events) {
  let n = events.length;
  let r = n === 1 ? "hook" : "hooks";
  let s = n === 0 ? "" : `: ${events.join(", ")}`;
  return `${n} ${r}${s}`;
}
//@ chunk-e6aww6q8.js:4120745-4120985 placement
/**
 * manifest 变化后的状态行："<文件> changed — reloaded (modules: a → b; N hooks)" 或拒绝原因。
 */
function describeManifestReload(e, n, r) {
  let s = `${basename(e.manifest)} changed \u2014 `;
  if (r.refused !== undefined) return s + r.refused;
  let h = relativeOrNone(n.before, e);
  let y = relativeOrNone(n.now, e);
  let S = h === y ? `${y} unchanged` : `${h} \u2192 ${y}`;
  return `${s}reloaded (modules: ${S}; ${describeHookCount(r.events)})`;
}
//@ chunk-e6aww6q8.js:4121019-4121070 placement
/**
 * 清单变化需重启
 */
var manifestChangedRestart = (e) => `${basename(e)} changed; restart to apply`;
//@ chunk-e6aww6q8.js:4121104-4121254 placement
/**
 * manifest 不再指定 hooks 模块时的状态行。
 */
function describeModuleUnnamed(e, before) {
  let r = before === undefined ? "nothing to unload" : `${relativeOrNone(before, e)} unloaded`;
  return `${basename(e.manifest)} changed \u2014 names no hooks module now; ` + r;
}
//@ chunk-e6aww6q8.js:4121254-4121388 placement
/**
 * 重载失败的说明：保留旧版本时注明 "the previous version stays loaded"。
 */
function describeReloadFailure(e, n) {
  let r = stripPluginPrefix(e, n);
  return n instanceof ReloadFailedError
    ? `reload failed, the previous version stays loaded: ${r}`
    : `reload failed: ${r}`;
}
//@ chunk-e6aww6q8.js:4121422-4121521 placement
/**
 * 重载被 ConfigChange 钩子拦下
 */
var reloadVetoedText = (e) =>
  `${basename(e)} changed; a ConfigChange hook blocked the reload, the loaded version stays`;
//@ chunk-e6aww6q8.js:4121521-4121603 placement
/**
 * 已重载（钩子数）
 */
function reloadedText(result) {
  return result.refused === undefined ? `reloaded (${describeHookCount(result.events)})` : result.refused;
}
//@ chunk-e6aww6q8.js:4121603-4121776 placement
var describeReloadStorm = (e) =>
  `reloading unusually often (${e.limit} reloads back to back); pausing, the latest save loads once the directory is quiet, or run /reload-plugins to reload now`;
//@ chunk-e6aww6q8.js:4121776-4122171 placement
/**
 * 比较开发目录前后的插件集合，生成新增与消失的说明列表。
 */
function diffDirPlugins(e, n = describePresenceChange) {
  let { before, after, present, outcome } = e;
  let { appeared, gone } = diffPresentPlugins(before, present);
  let L = (Z, outcome) => ({
    plugin: after.get(Z) ?? Z,
    text: n("new", outcome, e),
  });
  let G = (Z) => ({
    plugin: before.get(Z) ?? Z,
    text: n("gone", outcome, e),
  });
  if (outcome !== "reloaded") return [...appeared.map((Z) => L(Z, outcome)), ...gone.map(G)];
  let q = diffPresentPlugins(before, [...after.keys()]);
  return [
    ...q.appeared.map((Z) => L(Z, outcome)),
    ...q.gone.map(G),
    ...appeared.filter((Z) => !after.has(Z)).map((Z) => L(Z, "not-loaded")),
  ];
}
//@ chunk-e6aww6q8.js:4122171-4122407 placement
function filterUnservedPlugins(e) {
  let n = (r) => e.before.has(r) || !e.unserved.has(r);
  return {
    ...e,
    before: new Map([...e.before].filter(([r]) => e.after.has(r) || !e.present.includes(r))),
    after: new Map([...e.after].filter(([r]) => n(r))),
    present: e.present.filter(n),
  };
}
//@ chunk-e6aww6q8.js:4122441-4122451 placement
/**
 * 3
 */
var DEBOUNCE_FACTOR = 3;
//@ chunk-e6aww6q8.js:4122451-4122501 placement
/**
 * 去抖上限
 */
var debounceCap = (e, n) => Math.max(e.capMs, n.intervalMs * DEBOUNCE_FACTOR);
//@ chunk-e6aww6q8.js:4122501-4122513 placement
/**
 * 1.5
 */
var DEBOUNCE_JITTER = 1.5;
//@ chunk-e6aww6q8.js:4122513-4122788 placement
/**
 * 计算下一次重载的去抖延迟：连续变化时拉长到突发间隔，总等待不超过上限。
 */
function nextReloadDelay({ debounceMs, burst, storm }, s, h) {
  let { now, intervalMs } = h;
  let changedAt = s.changedAt;
  s.pendingSince ??= now;
  s.changedAt = now;
  let max = Math.max(burst.gapMs, intervalMs * DEBOUNCE_JITTER);
  let G = now - changedAt;
  let Z = G >= debounceMs && G < max && (s.isForced || now - s.settledAt >= storm.gapMs) ? max : debounceMs;
  let Se = s.pendingSince + debounceCap(burst, h);
  return Math.max(0, Math.min(Z, Se - now));
}
//@ chunk-e6aww6q8.js:4122788-4122897 placement
/**
 * 结束一次待重载：等待超过上限则标记强制。
 */
function settleReloadPending(burst, n, r) {
  n.isForced = n.pendingSince !== undefined && r.now - n.pendingSince >= debounceCap(burst, r);
  n.pendingSince = undefined;
}
//@ chunk-e6aww6q8.js:4122897-4122910 placement
/**
 * 1000
 */
var RELOAD_MIN_NOTICE_MS = 1000;
//@ chunk-e6aww6q8.js:4122940-4123117 placement
/**
 * 生成开发目录变化说明，包括未被服务的新插件。
 */
var describeDirChanges = (e, n, r) => [
  ...diffDirPlugins(filterUnservedPlugins(e), n),
  ...[...e.after]
    .filter(([s]) => !e.before.has(s) && e.unserved.has(s) && !r(join(e.root, s)))
    .map(([, s]) => ({
      plugin: s,
      text: n("new", "not-loaded", e),
    })),
];
//@ chunk-e6aww6q8.js:4123117-4123324 placement
function describeDirChangesSafely(plainWording, n, r) {
  try {
    let s = plainWording(n.root);
    if (s === undefined) return;
    return describeDirChanges(n, s, r);
  } catch (error) {
    logForDebugging(
      `plugin-dir watch: the plain words for ${n.root} threw, so its own lines are told: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return;
  }
}
//@ chunk-e6aww6q8.js:4123324-4123488 placement
function plainLineSafely(plainLine, n, r) {
  try {
    return plainLine(n, r);
  } catch (error) {
    logForDebugging(
      `plugin-dir watch: the plain row for ${n.plugin} threw, so its own line is told: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return;
  }
}
//@ chunk-e6aww6q8.js:4123488-4123668 placement
/**
 * 输出一条 plugin-dir 监视状态：有面向用户的简明行则显示它（调试日志记原文），否则显示原文。
 */
function tellWatchLine({ tell, plainLine }, r, s) {
  let h = plainLineSafely(plainLine, r, s);
  if (h === undefined) {
    tell(r.plugin, s.text, s.repeat);
    return;
  }
  logForDebugging(`plugin-dir watch: ${r.plugin}: ${s.text}`);
  tell(h.plugin, h.text, s.repeat);
}
//@ chunk-e6aww6q8.js:4123668-4123767 placement
/**
 * 重载失败提示
 */
var reloadFailureNotice = (e, error, isServing) => ({
  text: describeReloadFailure(e, error),
  repeat: "again",
  event: {
    kind: "failed",
    reason: stripPluginPrefix(e, error),
    isServing,
  },
});
//@ chunk-e6aww6q8.js:4123767-4123873 placement
var folderReloadFailedLine = (e, error, hadLoaded) => ({
  text: describeReloadFailure(e, error),
  repeat: "again",
  event: {
    kind: "folder-failed",
    reason: stripPluginPrefix(e, error),
    hadLoaded,
  },
});
//@ chunk-e6aww6q8.js:4123873-4123934 placement
/**
 * 频繁重载提示
 */
var reloadStormNotice = (storm, kind) => ({
  text: describeReloadStorm(storm),
  repeat: "again",
  event: {
    kind,
  },
});
//@ chunk-e6aww6q8.js:4123934-4123981 placement
/**
 * once/again
 */
var repeatWord = (e) => (e.refused === undefined ? "once" : "again");
//@ chunk-e6aww6q8.js:4123981-4124054 placement
/**
 * 重载成功提示
 */
var reloadedNotice = (text, n) => ({
  text,
  repeat: repeatWord(n),
  event: {
    kind: "reloaded",
    result: n,
  },
});
//@ chunk-e6aww6q8.js:4124054-4124121 placement
/**
 * 需重启提示
 */
var restartNeededNotice = (e) => ({
  text: manifestChangedRestart(e),
  repeat: "again",
  event: {
    kind: "restart",
  },
});
//@ chunk-e6aww6q8.js:4124121-4124183 placement
/**
 * 无名字提示
 */
var unnamedNotice = (text) => ({
  text,
  repeat: "again",
  event: {
    kind: "unnamed",
  },
});
//@ chunk-e6aww6q8.js:4124183-4124263 placement
/**
 * 被否决提示
 */
var vetoedNotice = (e, isServing) => ({
  text: reloadVetoedText(e),
  repeat: "again",
  event: {
    kind: "vetoed",
    isServing,
  },
});
//@ chunk-e6aww6q8.js:4124263-4124717 placement
/**
 * 重载节流器：短间隔内超过次数上限即暂停（并回调），安静一段时间后恢复；catchesUp 进入探测状态。
 */
function createReloadThrottle({ limit, gapMs, quietMs }, s) {
  let h = "open";
  let y = 0;
  let S = false;
  let { NEGATIVE_INFINITY, NEGATIVE_INFINITY: NEGATIVE_INFINITY_2 } = Number;
  return {
    sawChange(G) {
      let q = G - Math.max(NEGATIVE_INFINITY_2, NEGATIVE_INFINITY);
      NEGATIVE_INFINITY_2 = G;
      if (h !== "open" && q >= quietMs) {
        h = "open";
        y = 0;
      }
    },
    admits(G) {
      if (h === "paused" || h === "converged") return false;
      let q = G - NEGATIVE_INFINITY < gapMs;
      NEGATIVE_INFINITY = G;
      y = q ? y + 1 : 1;
      if (h === "probing" && !q && !S) h = "open";
      S = false;
      if (y <= limit) return true;
      if (h === "probing") h = "converged";
      else {
        h = "paused";
        s();
      }
      return false;
    },
    isDeferring: () => h === "paused",
    catchesUp() {
      h = "probing";
      y = 0;
      S = true;
    },
  };
}
//@ chunk-e6aww6q8.js:4124717-4127168 placement
/**
 * 汇总 plugin-dir 监视发现的 mod 变化，输出每个 mod 新增、重载、失败或暂停的状态行。
 */
function reportPluginDirWatchChanges(
  {
    watchRoot,
    listChildren,
    reloadPlugins,
    tell,
    debounceMs,
    burst,
    storm,
    clock,
    turn,
    plainLine,
    plainWording,
  },
  Z,
  Se,
) {
  let ke = new Map();
  let resolved = Promise.resolve();
  let Ee = turn.onBegin(Je);
  let Ae = turn.onEnd(Je);
  function Ie(pt) {
    let Et = ke.get(pt);
    if (Et === undefined) return;
    let yt = clock.now();
    Et.breaker.sawChange(yt);
    let gt = nextReloadDelay(
      {
        debounceMs,
        burst,
        storm,
      },
      Et,
      {
        now: yt,
        intervalMs: 0,
      },
    );
    if (Et.breaker.isDeferring()) {
      if (Et.cancelTimer === undefined) Me(Et, storm.quietMs, We);
      return;
    }
    if (turn.isRunning()) {
      Et.cancelTimer?.();
      Et.cancelTimer = undefined;
      Et.isHeld = true;
      return;
    }
    Me(Et, gt, ze);
  }
  function Me(pt, quietMs, yt) {
    pt.cancelTimer?.();
    pt.cancelTimer = clock.setTimeout(() => yt(pt.root), quietMs);
  }
  function We(pt) {
    ke.get(pt)?.breaker.catchesUp();
    ze(pt);
  }
  function ze(pt) {
    let Et = ke.get(pt);
    if (Et === undefined) return;
    Et.cancelTimer?.();
    Et.cancelTimer = undefined;
    Et.isHeld = false;
    settleReloadPending(burst, Et, {
      now: clock.now(),
      intervalMs: 0,
    });
    if (Et.isQueued) return;
    Et.isQueued = true;
    resolved = resolved.then(() => lt(Et));
  }
  async function lt(pt) {
    let { root } = pt;
    let yt = false;
    pt.isQueued = false;
    try {
      yt = Se(root);
      let gt = await listChildren(root);
      if (gt === undefined || ke.get(root) !== pt) return;
      let loaded = pt.loaded;
      let { appeared, gone } = diffPresentPlugins(loaded, gt);
      if (appeared.length === 0 && gone.length === 0) return;
      if (!pt.breaker.admits(clock.now())) {
        if (pt.breaker.isDeferring()) Me(pt, storm.quietMs, We);
        return;
      }
      let outcome = await reloadPlugins();
      let { loaded: loaded_2, unserved } = ke.get(root) ?? pt;
      let pn = {
        root,
        before: loaded,
        after: loaded_2,
        present: gt,
        unserved,
        outcome,
      };
      let no = diffDirPlugins(pn);
      let hn = describeDirChangesSafely(plainWording, pn, Z);
      if (hn !== undefined) for (let ho of no) logForDebugging(`plugin-dir watch: ${ho.plugin}: ${ho.text}`);
      for (let ho of hn ?? no) tell(ho.plugin, ho.text);
    } catch (error) {
      tellWatchLine(
        {
          tell,
          plainLine,
        },
        {
          plugin: basename(root),
          folder: root,
        },
        folderReloadFailedLine(basename(root), error, yt && Se(root)),
      );
    } finally {
      pt.settledAt = clock.now();
    }
  }
  function Je() {
    for (let pt of ke.values())
      if ((pt.isHeld || pt.cancelTimer !== undefined) && !pt.breaker.isDeferring()) ze(pt.root);
  }
  function nt(pt) {
    pt.cancelTimer?.();
    ke.delete(pt.root);
    return pt.watcher.close();
  }
  return {
    watchCollections(pt) {
      let Et = new Map(pt.map((yt) => [yt.root, yt]));
      for (let yt of ke.values()) if (!Et.has(yt.root)) nt(yt);
      for (let [yt, { loaded: gt, unserved: At }] of Et) {
        let It = ke.get(yt);
        if (It !== undefined) {
          It.loaded = gt;
          It.unserved = At;
          continue;
        }
        ke.set(yt, {
          root: yt,
          watcher: watchRoot(yt, () => Ie(yt)),
          breaker: createReloadThrottle(storm, () =>
            tellWatchLine(
              {
                tell,
                plainLine,
              },
              {
                plugin: basename(yt),
                folder: yt,
              },
              reloadStormNotice(storm, "folder-paused"),
            ),
          ),
          loaded: gt,
          unserved: At,
          cancelTimer: undefined,
          isQueued: false,
          isHeld: false,
          pendingSince: undefined,
          changedAt: Number.NEGATIVE_INFINITY,
          settledAt: Number.NEGATIVE_INFINITY,
          isForced: false,
        });
      }
    },
    watchedCollections: () => [...ke.keys()],
    async dispose() {
      Ee();
      Ae();
      await Promise.all([...ke.values()].map(nt));
    },
  };
}
export {
  createHostStateSlot,
  reloadedNotice,
  reloadedText,
  restartNeededNotice,
  unnamedNotice,
  describeModuleUnnamed,
  describeManifestReload,
  reportPluginDirWatchChanges,
  classifyChangeSource,
  nextReloadDelay,
  compareStamp,
  tellWatchLine,
  settleReloadPending,
  vetoedNotice,
  reloadFailureNotice,
  createReloadThrottle,
  reloadStormNotice,
  RELOAD_MIN_NOTICE_MS,
  OPTIONS_CHANGED_PREFIX,
  repeatWord,
  describeReloadFailure,
  devModHostState,
  describeDirChanges,
};
