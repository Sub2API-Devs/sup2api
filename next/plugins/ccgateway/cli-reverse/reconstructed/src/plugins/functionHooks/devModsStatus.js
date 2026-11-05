/**
 * plugins/functionHooks/devModsStatus.ts
 *
 * 2.1.316 新增：plugin-dir 监视下 mod 状态变化的汇总与报告
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (38)
 * attribution: placement 38
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { basename, sep, relative, join } from "path";
import { identity as identity_2 } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { stripPluginPrefix, ReloadFailedError } from "./hooksModuleLoader.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4225514-4225568 placement
/**
 * 带清理的 HostScoped 槽
 */
var createHostStateSlot = () =>
  identity_2(createValueSlot(), (slot) => {
    slot.get()?.();
    slot.set(undefined);
  });
//@ chunk-5xgkngpb.js:4225568-4225582 placement
/**
 * 开发 mod 的宿主状态
 */
var devModHostState; // deferred: uses createHostStateSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4225568", () => {
  devModHostState = createHostStateSlot();
});
//@ chunk-5xgkngpb.js:4225582-4225616 placement
/**
 * "options changed — "
 */
var OPTIONS_CHANGED_PREFIX = "options changed \u2014 ";
//@ chunk-5xgkngpb.js:4225616-4225731 placement
/**
 * 比较两个文件戳（大小与哈希）：same、other 或 unknown。
 */
function compareStamp(stamp, other) {
  if (stamp === undefined || other === undefined) return "unknown";
  return stamp.size === other.size && stamp.hash === other.hash ? "same" : "other";
}
//@ chunk-5xgkngpb.js:4225731-4225979 placement
/**
 * 判断开发插件文件变化的来源（本进程写入、外部修改或无变化）。
 */
function classifyChangeSource(current, snapshot, maxClockMs) {
  let readStamp = compareStamp(current.stamp, snapshot.read);
  let takenStamp =
    current.ctimeMs === snapshot.taken?.ctimeMs
      ? compareStamp(current.stamp, snapshot.taken?.stamp)
      : "other";
  let isMismatched = readStamp === "other" && takenStamp !== "same";
  let isServed = readStamp === "same" && snapshot.isServed;
  let hasTaken = takenStamp !== "other";
  let isBeforeMax = current.ctimeMs <= maxClockMs;
  return isMismatched
    ? undefined
    : isServed
      ? "served"
      : hasTaken
        ? "retold"
        : isBeforeMax
          ? "clock"
          : undefined;
}
//@ chunk-5xgkngpb.js:4225979-4226098 placement
function diffPresentPlugins(before, present) {
  let presentSet = new Set(present);
  return {
    appeared: present.filter((name) => !before.has(name)),
    gone: [...before.keys()].filter((key) => !presentSet.has(key)),
  };
}
//@ chunk-5xgkngpb.js:4226143-4226476 placement
/**
 * 描述开发插件目录中插件的出现或消失（已加载/卸载、新出现或已移走）。
 */
function describePresenceChange(presence, outcome, diff) {
  let folder = `${basename(diff.root)}${sep}`;
  let where = presence === "new" ? `new in ${folder}` : `gone from ${folder}`;
  switch (outcome) {
    case "reloaded":
      return `${presence === "new" ? "loaded" : "unloaded"} (${where})`;
    case "not-loaded":
      return `${where}, not loaded; /plugin shows why`;
    case "held":
      return `${where}, on hold: /reload-plugins applies it`;
    case "unbound":
      return `${where}; restart to apply`;
  }
}
//@ chunk-5xgkngpb.js:4226510-4226557 placement
/**
 * 相对路径或 none
 */
var relativeOrNone = (path, diff) => (path === undefined ? "none" : relative(diff.root, path));
//@ chunk-5xgkngpb.js:4226557-4226664 placement
function describeHookCount(events) {
  let count = events.length;
  let noun = count === 1 ? "hook" : "hooks";
  let list = count === 0 ? "" : `: ${events.join(", ")}`;
  return `${count} ${noun}${list}`;
}
//@ chunk-5xgkngpb.js:4226698-4226938 placement
/**
 * manifest 变化后的状态行："<文件> changed — reloaded (modules: a → b; N hooks)" 或拒绝原因。
 */
function describeManifestReload(diff, before, outcome) {
  let prefix = `${basename(diff.manifest)} changed \u2014 `;
  if (outcome.refused !== undefined) return prefix + outcome.refused;
  let wasPath = relativeOrNone(before.before, diff);
  let nowPath = relativeOrNone(before.now, diff);
  let modulesText = wasPath === nowPath ? `${nowPath} unchanged` : `${wasPath} \u2192 ${nowPath}`;
  return `${prefix}reloaded (modules: ${modulesText}; ${describeHookCount(outcome.events)})`;
}
//@ chunk-5xgkngpb.js:4226972-4227023 placement
/**
 * 清单变化需重启
 */
var manifestChangedRestart = (path) => `${basename(path)} changed; restart to apply`;
//@ chunk-5xgkngpb.js:4227057-4227207 placement
/**
 * manifest 不再指定 hooks 模块时的状态行。
 */
function describeModuleUnnamed(diff, path) {
  let tail = path === undefined ? "nothing to unload" : `${relativeOrNone(path, diff)} unloaded`;
  return `${basename(diff.manifest)} changed \u2014 names no hooks module now; ` + tail;
}
//@ chunk-5xgkngpb.js:4227207-4227341 placement
/**
 * 重载失败的说明：保留旧版本时注明 "the previous version stays loaded"。
 */
function describeReloadFailure(request, error) {
  let message = stripPluginPrefix(request, error);
  return error instanceof ReloadFailedError
    ? `reload failed, the previous version stays loaded: ${message}`
    : `reload failed: ${message}`;
}
//@ chunk-5xgkngpb.js:4227375-4227474 placement
/**
 * 重载被 ConfigChange 钩子拦下
 */
var reloadVetoedText = (request) =>
  `${basename(request)} changed; a ConfigChange hook blocked the reload, the loaded version stays`;
//@ chunk-5xgkngpb.js:4227474-4227556 placement
/**
 * 已重载（钩子数）
 */
function reloadedText(reloadResult) {
  return reloadResult.refused === undefined
    ? `reloaded (${describeHookCount(reloadResult.events)})`
    : reloadResult.refused;
}
//@ chunk-5xgkngpb.js:4227556-4227729 placement
var describeReloadStorm = (storm) =>
  `reloading unusually often (${storm.limit} reloads back to back); pausing, the latest save loads once the directory is quiet, or run /reload-plugins to reload now`;
//@ chunk-5xgkngpb.js:4227729-4228138 placement
/**
 * 比较开发目录前后的插件集合，生成新增与消失的说明列表。
 */
function diffDirPlugins(diff, describe = describePresenceChange) {
  let { before, after, present, outcome } = diff;
  let { appeared, gone } = diffPresentPlugins(before, present);
  let itemForAppeared = (name, outcome) => ({
    plugin: after.get(name) ?? name,
    text: describe("new", outcome, diff),
  });
  let itemForGone = (name) => ({
    plugin: before.get(name) ?? name,
    text: describe("gone", outcome, diff),
  });
  if (outcome !== "reloaded")
    return [...appeared.map((name) => itemForAppeared(name, outcome)), ...gone.map(itemForGone)];
  let afterDiff = diffPresentPlugins(before, [...after.keys()]);
  return [
    ...afterDiff.appeared.map((name) => itemForAppeared(name, outcome)),
    ...afterDiff.gone.map(itemForGone),
    ...appeared.filter((name) => !after.has(name)).map((name) => itemForAppeared(name, "not-loaded")),
  ];
}
//@ chunk-5xgkngpb.js:4228138-4228374 placement
function filterUnservedPlugins(diff) {
  let isToday = (name) => diff.before.has(name) || !diff.unserved.has(name);
  return {
    ...diff,
    before: new Map(
      [...diff.before].filter(([name]) => diff.after.has(name) || !diff.present.includes(name)),
    ),
    after: new Map([...diff.after].filter(([name]) => isToday(name))),
    present: diff.present.filter(isToday),
  };
}
//@ chunk-5xgkngpb.js:4228408-4228418 placement
/**
 * 3
 */
var DEBOUNCE_FACTOR = 3;
//@ chunk-5xgkngpb.js:4228418-4228468 placement
/**
 * 去抖上限
 */
var debounceCap = (burst, clock) => Math.max(burst.capMs, clock.intervalMs * DEBOUNCE_FACTOR);
//@ chunk-5xgkngpb.js:4228468-4228480 placement
/**
 * 1.5
 */
var DEBOUNCE_JITTER = 1.5;
//@ chunk-5xgkngpb.js:4228480-4228757 placement
/**
 * 计算下一次重载的去抖延迟：连续变化时拉长到突发间隔，总等待不超过上限。
 */
function nextReloadDelay({ debounceMs, burst, storm }, entry, clock) {
  let { now, intervalMs } = clock;
  let changedAt = entry.changedAt;
  entry.pendingSince ??= now;
  entry.changedAt = now;
  let max = Math.max(burst.gapMs, intervalMs * DEBOUNCE_JITTER);
  let sinceChanged = now - changedAt;
  let delay =
    sinceChanged >= debounceMs &&
    sinceChanged < max &&
    (entry.isForced || now - entry.settledAt >= storm.gapMs)
      ? max
      : debounceMs;
  let capRemaining = entry.pendingSince + debounceCap(burst, clock);
  return Math.max(0, Math.min(delay, capRemaining - now));
}
//@ chunk-5xgkngpb.js:4228757-4228866 placement
/**
 * 结束一次待重载：等待超过上限则标记强制。
 */
function settleReloadPending(burst, entry, clock) {
  entry.isForced =
    entry.pendingSince !== undefined && clock.now - entry.pendingSince >= debounceCap(burst, clock);
  entry.pendingSince = undefined;
}
//@ chunk-5xgkngpb.js:4228866-4228879 placement
/**
 * 1000
 */
var RELOAD_MIN_NOTICE_MS = 1000;
//@ chunk-5xgkngpb.js:4228909-4229086 placement
/**
 * 生成开发目录变化说明，包括未被服务的新插件。
 */
var describeDirChanges = (diff, pluginName, rule) => [
  ...diffDirPlugins(filterUnservedPlugins(diff), pluginName),
  ...[...diff.after]
    .filter(([name]) => !diff.before.has(name) && diff.unserved.has(name) && !rule(join(diff.root, name)))
    .map(([, name]) => ({
      plugin: name,
      text: pluginName("new", "not-loaded", diff),
    })),
];
//@ chunk-5xgkngpb.js:4229086-4229293 placement
function describeDirChangesSafely(plainWording, diff, rule) {
  try {
    let lines = plainWording(diff.root);
    if (lines === undefined) return;
    return describeDirChanges(diff, lines, rule);
  } catch (error) {
    logForDebugging(
      `plugin-dir watch: the plain words for ${diff.root} threw, so its own lines are told: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return;
  }
}
//@ chunk-5xgkngpb.js:4229293-4229457 placement
function plainLineSafely(plainLine, req, event) {
  try {
    return plainLine(req, event);
  } catch (error) {
    logForDebugging(
      `plugin-dir watch: the plain row for ${req.plugin} threw, so its own line is told: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return;
  }
}
//@ chunk-5xgkngpb.js:4229457-4229637 placement
/**
 * 输出一条 plugin-dir 监视状态：有面向用户的简明行则显示它（调试日志记原文），否则显示原文。
 */
function tellWatchLine({ tell, plainLine }, req, line) {
  let text = plainLineSafely(plainLine, req, line);
  if (text === undefined) {
    tell(req.plugin, line.text, line.repeat);
    return;
  }
  logForDebugging(`plugin-dir watch: ${req.plugin}: ${line.text}`);
  tell(text.plugin, text.text, line.repeat);
}
//@ chunk-5xgkngpb.js:4229637-4229736 placement
/**
 * 重载失败提示
 */
var reloadFailureNotice = (request, error, isServing) => ({
  text: describeReloadFailure(request, error),
  repeat: "again",
  event: {
    kind: "failed",
    reason: stripPluginPrefix(request, error),
    isServing,
  },
});
//@ chunk-5xgkngpb.js:4229736-4229842 placement
var folderReloadFailedLine = (request, error, hadLoaded) => ({
  text: describeReloadFailure(request, error),
  repeat: "again",
  event: {
    kind: "folder-failed",
    reason: stripPluginPrefix(request, error),
    hadLoaded,
  },
});
//@ chunk-5xgkngpb.js:4229842-4229903 placement
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
//@ chunk-5xgkngpb.js:4229903-4229950 placement
/**
 * once/again
 */
var repeatWord = (result) => (result.refused === undefined ? "once" : "again");
//@ chunk-5xgkngpb.js:4229950-4230023 placement
/**
 * 重载成功提示
 */
var reloadedNotice = (text, result) => ({
  text,
  repeat: repeatWord(result),
  event: {
    kind: "reloaded",
    result,
  },
});
//@ chunk-5xgkngpb.js:4230023-4230090 placement
/**
 * 需重启提示
 */
var restartNeededNotice = (diff) => ({
  text: manifestChangedRestart(diff),
  repeat: "again",
  event: {
    kind: "restart",
  },
});
//@ chunk-5xgkngpb.js:4230090-4230152 placement
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
//@ chunk-5xgkngpb.js:4230152-4230232 placement
/**
 * 被否决提示
 */
var vetoedNotice = (request, isServing) => ({
  text: reloadVetoedText(request),
  repeat: "again",
  event: {
    kind: "vetoed",
    isServing,
  },
});
//@ chunk-5xgkngpb.js:4230232-4230686 placement
/**
 * 重载节流器：短间隔内超过次数上限即暂停（并回调），安静一段时间后恢复；catchesUp 进入探测状态。
 */
function createReloadThrottle({ limit, gapMs, quietMs }, onPause) {
  let state = "open";
  let count = 0;
  let canProbe = false;
  let { NEGATIVE_INFINITY, NEGATIVE_INFINITY: NEGATIVE_INFINITY_2 } = Number;
  return {
    sawChange(now) {
      let gap = now - Math.max(NEGATIVE_INFINITY_2, NEGATIVE_INFINITY);
      NEGATIVE_INFINITY_2 = now;
      if (state !== "open" && gap >= quietMs) {
        state = "open";
        count = 0;
      }
    },
    admits(now) {
      if (state === "paused" || state === "converged") return false;
      let isClose = now - NEGATIVE_INFINITY < gapMs;
      NEGATIVE_INFINITY = now;
      count = isClose ? count + 1 : 1;
      if (state === "probing" && !isClose && !canProbe) state = "open";
      canProbe = false;
      if (count <= limit) return true;
      if (state === "probing") state = "converged";
      else {
        state = "paused";
        onPause();
      }
      return false;
    },
    isDeferring: () => state === "paused",
    catchesUp() {
      state = "probing";
      count = 0;
      canProbe = true;
    },
  };
}
//@ chunk-5xgkngpb.js:4230686-4233139 placement
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
  pluginName,
  isServingRoot,
) {
  let entries = new Map();
  let resolved = Promise.resolve();
  let offBegin = turn.onBegin(runHeld);
  let offEnd = turn.onEnd(runHeld);
  function noteChange(root) {
    let entry = entries.get(root);
    if (entry === undefined) return;
    let now = clock.now();
    entry.breaker.sawChange(now);
    let delay = nextReloadDelay(
      {
        debounceMs,
        burst,
        storm,
      },
      entry,
      {
        now,
        intervalMs: 0,
      },
    );
    if (entry.breaker.isDeferring()) {
      if (entry.cancelTimer === undefined) scheduleReload(entry, storm.quietMs, onQuiet);
      return;
    }
    if (turn.isRunning()) {
      entry.cancelTimer?.();
      entry.cancelTimer = undefined;
      entry.isHeld = true;
      return;
    }
    scheduleReload(entry, delay, queueReload);
  }
  function scheduleReload(entry, quietMs, runReload) {
    entry.cancelTimer?.();
    entry.cancelTimer = clock.setTimeout(() => runReload(entry.root), quietMs);
  }
  function onQuiet(root) {
    entries.get(root)?.breaker.catchesUp();
    queueReload(root);
  }
  function queueReload(root) {
    let entry = entries.get(root);
    if (entry === undefined) return;
    entry.cancelTimer?.();
    entry.cancelTimer = undefined;
    entry.isHeld = false;
    settleReloadPending(burst, entry, {
      now: clock.now(),
      intervalMs: 0,
    });
    if (entry.isQueued) return;
    entry.isQueued = true;
    resolved = resolved.then(() => reloadRoot(entry));
  }
  async function reloadRoot(entry) {
    let { root } = entry;
    let wasServing = false;
    entry.isQueued = false;
    try {
      wasServing = isServingRoot(root);
      let children = await listChildren(root);
      if (children === undefined || entries.get(root) !== entry) return;
      let loaded = entry.loaded;
      let { appeared, gone } = diffPresentPlugins(loaded, children);
      if (appeared.length === 0 && gone.length === 0) return;
      if (!entry.breaker.admits(clock.now())) {
        if (entry.breaker.isDeferring()) scheduleReload(entry, storm.quietMs, onQuiet);
        return;
      }
      let outcome = await reloadPlugins();
      let { loaded: loaded_2, unserved } = entries.get(root) ?? entry;
      let diff = {
        root,
        before: loaded,
        after: loaded_2,
        present: children,
        unserved,
        outcome,
      };
      let items = diffDirPlugins(diff);
      let secondLines = describeDirChangesSafely(plainWording, diff, pluginName);
      if (secondLines !== undefined)
        for (let item of items) logForDebugging(`plugin-dir watch: ${item.plugin}: ${item.text}`);
      for (let item of secondLines ?? items) tell(item.plugin, item.text);
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
        folderReloadFailedLine(basename(root), error, wasServing && isServingRoot(root)),
      );
    } finally {
      entry.settledAt = clock.now();
    }
  }
  function runHeld() {
    for (let entry of entries.values())
      if ((entry.isHeld || entry.cancelTimer !== undefined) && !entry.breaker.isDeferring())
        queueReload(entry.root);
  }
  function closeEntry(entry) {
    entry.cancelTimer?.();
    entries.delete(entry.root);
    return entry.watcher.close();
  }
  return {
    watchCollections(collections) {
      let byRoot = new Map(collections.map((entry) => [entry.root, entry]));
      for (let entry of entries.values()) if (!byRoot.has(entry.root)) closeEntry(entry);
      for (let [root, { loaded, unserved }] of byRoot) {
        let existing = entries.get(root);
        if (existing !== undefined) {
          existing.loaded = loaded;
          existing.unserved = unserved;
          continue;
        }
        entries.set(root, {
          root,
          watcher: watchRoot(root, () => noteChange(root)),
          breaker: createReloadThrottle(storm, () =>
            tellWatchLine(
              {
                tell,
                plainLine,
              },
              {
                plugin: basename(root),
                folder: root,
              },
              reloadStormNotice(storm, "folder-paused"),
            ),
          ),
          loaded,
          unserved,
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
    watchedCollections: () => [...entries.keys()],
    async dispose() {
      offBegin();
      offEnd();
      await Promise.all([...entries.values()].map(closeEntry));
    },
  };
}
export {
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
  createHostStateSlot,
};
