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
import {
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
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
import { ge } from "../../utils/identity.js";
import { to } from "../../utils/valueSlot.js";
import { nF, Wj } from "./hooksModuleLoader.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-e6aww6q8.js:4119561-4119615 placement
var h2r = () =>
  ge(to(), (e) => {
    (e.get()?.(), e.set(void 0));
  });
//@ chunk-e6aww6q8.js:4119615-4119629 placement
var odt = h2r();
//@ chunk-e6aww6q8.js:4119629-4119663 placement
var ire = "options changed \u2014 ";
/**
 * 比较两个文件戳（大小与哈希）：same、other 或 unknown。
 */
//@ chunk-e6aww6q8.js:4119663-4119778 placement
function compareStamp(e, n) {
  if (e === void 0 || n === void 0) return "unknown";
  return e.size === n.size && e.hash === n.hash ? "same" : "other";
}
/**
 * 判断开发插件文件变化的来源（本进程写入、外部修改或无变化）。
 */
//@ chunk-e6aww6q8.js:4119778-4120026 placement
function classifyChangeSource(e, n, r) {
  let s = compareStamp(e.stamp, n.read),
    y = e.ctimeMs === n.taken?.ctimeMs ? compareStamp(e.stamp, n.taken?.stamp) : "other",
    S = s === "other" && y !== "same",
    w = s === "same" && n.isServed,
    L = y !== "other",
    G = e.ctimeMs <= r;
  return S ? void 0 : w ? "served" : L ? "retold" : G ? "clock" : void 0;
}
//@ chunk-e6aww6q8.js:4120026-4120145 placement
function diffPresentPlugins(e, n) {
  let r = new Set(n);
  return { appeared: n.filter((s) => !e.has(s)), gone: [...e.keys()].filter((s) => !r.has(s)) };
}
/**
 * 描述开发插件目录中插件的出现或消失（已加载/卸载、新出现或已移走）。
 */
//@ chunk-e6aww6q8.js:4120190-4120523 placement
function describePresenceChange(e, n, r) {
  let s = `${basename_53(r.root)}${sep_57}`,
    h = e === "new" ? `new in ${s}` : `gone from ${s}`;
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
var fre = (e, n) => (e === void 0 ? "none" : relative_35(n.root, e));
//@ chunk-e6aww6q8.js:4120604-4120711 placement
function describeHookCount(e) {
  let n = e.length,
    r = n === 1 ? "hook" : "hooks",
    s = n === 0 ? "" : `: ${e.join(", ")}`;
  return `${n} ${r}${s}`;
}
/**
 * manifest 变化后的状态行："<文件> changed — reloaded (modules: a → b; N hooks)" 或拒绝原因。
 */
//@ chunk-e6aww6q8.js:4120745-4120985 placement
function describeManifestReload(e, n, r) {
  let s = `${basename_54(e.manifest)} changed \u2014 `;
  if (r.refused !== void 0) return s + r.refused;
  let h = fre(n.before, e),
    y = fre(n.now, e),
    S = h === y ? `${y} unchanged` : `${h} \u2192 ${y}`;
  return `${s}reloaded (modules: ${S}; ${describeHookCount(r.events)})`;
}
//@ chunk-e6aww6q8.js:4121019-4121070 placement
var dls = (e) => `${basename_55(e)} changed; restart to apply`;
/**
 * manifest 不再指定 hooks 模块时的状态行。
 */
//@ chunk-e6aww6q8.js:4121104-4121254 placement
function describeModuleUnnamed(e, n) {
  let r = n === void 0 ? "nothing to unload" : `${fre(n, e)} unloaded`;
  return `${basename_56(e.manifest)} changed \u2014 names no hooks module now; ` + r;
}
/**
 * 重载失败的说明：保留旧版本时注明 "the previous version stays loaded"。
 */
//@ chunk-e6aww6q8.js:4121254-4121388 placement
function describeReloadFailure(e, n) {
  let r = nF(e, n);
  return n instanceof Wj ? `reload failed, the previous version stays loaded: ${r}` : `reload failed: ${r}`;
}
//@ chunk-e6aww6q8.js:4121422-4121521 placement
var pls = (e) =>
  `${basename_57(e)} changed; a ConfigChange hook blocked the reload, the loaded version stays`;
//@ chunk-e6aww6q8.js:4121521-4121603 placement
function udt(e) {
  return e.refused === void 0 ? `reloaded (${describeHookCount(e.events)})` : e.refused;
}
//@ chunk-e6aww6q8.js:4121603-4121776 placement
var describeReloadStorm = (e) =>
  `reloading unusually often (${e.limit} reloads back to back); pausing, the latest save loads once the directory is quiet, or run /reload-plugins to reload now`;
/**
 * 比较开发目录前后的插件集合，生成新增与消失的说明列表。
 */
//@ chunk-e6aww6q8.js:4121776-4122171 placement
function diffDirPlugins(e, n = describePresenceChange) {
  let { before: before, after: after, present: present, outcome: outcome } = e,
    { appeared: appeared, gone: gone } = diffPresentPlugins(before, present),
    L = (Z, Se) => ({ plugin: after.get(Z) ?? Z, text: n("new", Se, e) }),
    G = (Z) => ({ plugin: before.get(Z) ?? Z, text: n("gone", outcome, e) });
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
var ajn = 3;
//@ chunk-e6aww6q8.js:4122451-4122501 placement
var HOe = (e, n) => Math.max(e.capMs, n.intervalMs * ajn);
//@ chunk-e6aww6q8.js:4122501-4122513 placement
var ljn = 1.5;
/**
 * 计算下一次重载的去抖延迟：连续变化时拉长到突发间隔，总等待不超过上限。
 */
//@ chunk-e6aww6q8.js:4122513-4122788 placement
function nextReloadDelay({ debounceMs: debounceMs, burst: burst, storm: storm }, s, h) {
  let { now: now, intervalMs: intervalMs } = h,
    changedAt = s.changedAt;
  ((s.pendingSince ??= now), (s.changedAt = now));
  let max = Math.max(burst.gapMs, intervalMs * ljn),
    G = now - changedAt,
    Z = G >= debounceMs && G < max && (s.isForced || now - s.settledAt >= storm.gapMs) ? max : debounceMs,
    Se = s.pendingSince + HOe(burst, h);
  return Math.max(0, Math.min(Z, Se - now));
}
/**
 * 结束一次待重载：等待超过上限则标记强制。
 */
//@ chunk-e6aww6q8.js:4122788-4122897 placement
function settleReloadPending(e, n, r) {
  ((n.isForced = n.pendingSince !== void 0 && r.now - n.pendingSince >= HOe(e, r)),
    (n.pendingSince = void 0));
}
//@ chunk-e6aww6q8.js:4122897-4122910 placement
var Tls = 1000;
/**
 * 生成开发目录变化说明，包括未被服务的新插件。
 */
//@ chunk-e6aww6q8.js:4122940-4123117 placement
var describeDirChanges = (e, n, r) => [
  ...diffDirPlugins(filterUnservedPlugins(e), n),
  ...[...e.after]
    .filter(([s]) => !e.before.has(s) && e.unserved.has(s) && !r(join_101(e.root, s)))
    .map(([, s]) => ({ plugin: s, text: n("new", "not-loaded", e) })),
];
//@ chunk-e6aww6q8.js:4123117-4123324 placement
function describeDirChangesSafely(e, n, r) {
  try {
    let s = e(n.root);
    if (s === void 0) return;
    return describeDirChanges(n, s, r);
  } catch (error) {
    logForDebugging(
      `plugin-dir watch: the plain words for ${n.root} threw, so its own lines are told: ${errorMessage(error)}`,
      { level: "error" },
    );
    return;
  }
}
//@ chunk-e6aww6q8.js:4123324-4123488 placement
function plainLineSafely(e, n, r) {
  try {
    return e(n, r);
  } catch (error) {
    logForDebugging(
      `plugin-dir watch: the plain row for ${n.plugin} threw, so its own line is told: ${errorMessage(error)}`,
      { level: "error" },
    );
    return;
  }
}
/**
 * 输出一条 plugin-dir 监视状态：有面向用户的简明行则显示它（调试日志记原文），否则显示原文。
 */
//@ chunk-e6aww6q8.js:4123488-4123668 placement
function tellWatchLine({ tell: tell, plainLine: plainLine }, r, s) {
  let h = plainLineSafely(plainLine, r, s);
  if (h === void 0) {
    tell(r.plugin, s.text, s.repeat);
    return;
  }
  (logForDebugging(`plugin-dir watch: ${r.plugin}: ${s.text}`), tell(h.plugin, h.text, s.repeat));
}
//@ chunk-e6aww6q8.js:4123668-4123767 placement
var Ols = (e, n, r) => ({
  text: describeReloadFailure(e, n),
  repeat: "again",
  event: { kind: "failed", reason: nF(e, n), isServing: r },
});
//@ chunk-e6aww6q8.js:4123767-4123873 placement
var folderReloadFailedLine = (e, n, r) => ({
  text: describeReloadFailure(e, n),
  repeat: "again",
  event: { kind: "folder-failed", reason: nF(e, n), hadLoaded: r },
});
//@ chunk-e6aww6q8.js:4123873-4123934 placement
var pjn = (e, n) => ({ text: describeReloadStorm(e), repeat: "again", event: { kind: n } });
//@ chunk-e6aww6q8.js:4123934-4123981 placement
var BOe = (e) => (e.refused === void 0 ? "once" : "again");
//@ chunk-e6aww6q8.js:4123981-4124054 placement
var mjn = (e, n) => ({ text: e, repeat: BOe(n), event: { kind: "reloaded", result: n } });
//@ chunk-e6aww6q8.js:4124054-4124121 placement
var Lls = (e) => ({ text: dls(e), repeat: "again", event: { kind: "restart" } });
//@ chunk-e6aww6q8.js:4124121-4124183 placement
var Nls = (e) => ({ text: e, repeat: "again", event: { kind: "unnamed" } });
//@ chunk-e6aww6q8.js:4124183-4124263 placement
var Fls = (e, n) => ({ text: pls(e), repeat: "again", event: { kind: "vetoed", isServing: n } });
/**
 * 重载节流器：短间隔内超过次数上限即暂停（并回调），安静一段时间后恢复；catchesUp 进入探测状态。
 */
//@ chunk-e6aww6q8.js:4124263-4124717 placement
function createReloadThrottle({ limit: limit, gapMs: gapMs, quietMs: quietMs }, s) {
  let h = "open",
    y = 0,
    S = !1,
    { NEGATIVE_INFINITY: NEGATIVE_INFINITY, NEGATIVE_INFINITY: NEGATIVE_INFINITY_2 } = Number;
  return {
    sawChange(G) {
      let q = G - Math.max(NEGATIVE_INFINITY_2, NEGATIVE_INFINITY);
      if (((NEGATIVE_INFINITY_2 = G), h !== "open" && q >= quietMs)) ((h = "open"), (y = 0));
    },
    admits(G) {
      if (h === "paused" || h === "converged") return !1;
      let q = G - NEGATIVE_INFINITY < gapMs;
      if (((NEGATIVE_INFINITY = G), (y = q ? y + 1 : 1), h === "probing" && !q && !S)) h = "open";
      if (((S = !1), y <= limit)) return !0;
      if (h === "probing") h = "converged";
      else ((h = "paused"), s());
      return !1;
    },
    isDeferring: () => h === "paused",
    catchesUp() {
      ((h = "probing"), (y = 0), (S = !0));
    },
  };
}
/**
 * 汇总 plugin-dir 监视发现的 mod 变化，输出每个 mod 新增、重载、失败或暂停的状态行。
 */
//@ chunk-e6aww6q8.js:4124717-4127168 placement
function reportPluginDirWatchChanges(
  {
    watchRoot: watchRoot,
    listChildren: listChildren,
    reloadPlugins: reloadPlugins,
    tell: tell,
    debounceMs: debounceMs,
    burst: burst,
    storm: storm,
    clock: clock,
    turn: turn,
    plainLine: plainLine,
    plainWording: plainWording,
  },
  Z,
  Se,
) {
  let ke = new Map(),
    resolved = Promise.resolve(),
    onBegin = turn.onBegin(Je),
    onEnd = turn.onEnd(Je);
  function Ie(pt) {
    let Et = ke.get(pt);
    if (Et === void 0) return;
    let now = clock.now();
    Et.breaker.sawChange(now);
    let gt = nextReloadDelay({ debounceMs: debounceMs, burst: burst, storm: storm }, Et, {
      now: now,
      intervalMs: 0,
    });
    if (Et.breaker.isDeferring()) {
      if (Et.cancelTimer === void 0) Me(Et, storm.quietMs, We);
      return;
    }
    if (turn.isRunning()) {
      (Et.cancelTimer?.(), (Et.cancelTimer = void 0), (Et.isHeld = !0));
      return;
    }
    Me(Et, gt, ze);
  }
  function Me(pt, Et, yt) {
    (pt.cancelTimer?.(), (pt.cancelTimer = clock.setTimeout(() => yt(pt.root), Et)));
  }
  function We(pt) {
    (ke.get(pt)?.breaker.catchesUp(), ze(pt));
  }
  function ze(pt) {
    let Et = ke.get(pt);
    if (Et === void 0) return;
    if (
      (Et.cancelTimer?.(),
      (Et.cancelTimer = void 0),
      (Et.isHeld = !1),
      settleReloadPending(burst, Et, { now: clock.now(), intervalMs: 0 }),
      Et.isQueued)
    )
      return;
    ((Et.isQueued = !0), (resolved = resolved.then(() => lt(Et))));
  }
  async function lt(pt) {
    let { root: root } = pt,
      yt = !1;
    pt.isQueued = !1;
    try {
      yt = Se(root);
      let gt = await listChildren(root);
      if (gt === void 0 || ke.get(root) !== pt) return;
      let loaded = pt.loaded,
        { appeared: appeared, gone: gone } = diffPresentPlugins(loaded, gt);
      if (appeared.length === 0 && gone.length === 0) return;
      if (!pt.breaker.admits(clock.now())) {
        if (pt.breaker.isDeferring()) Me(pt, storm.quietMs, We);
        return;
      }
      let qt = await reloadPlugins(),
        { loaded: loaded_2, unserved: unserved } = ke.get(root) ?? pt,
        pn = { root: root, before: loaded, after: loaded_2, present: gt, unserved: unserved, outcome: qt },
        no = diffDirPlugins(pn),
        hn = describeDirChangesSafely(plainWording, pn, Z);
      if (hn !== void 0) for (let ho of no) logForDebugging(`plugin-dir watch: ${ho.plugin}: ${ho.text}`);
      for (let ho of hn ?? no) tell(ho.plugin, ho.text);
    } catch (error) {
      tellWatchLine(
        { tell: tell, plainLine: plainLine },
        { plugin: basename_58(root), folder: root },
        folderReloadFailedLine(basename_58(root), error, yt && Se(root)),
      );
    } finally {
      pt.settledAt = clock.now();
    }
  }
  function Je() {
    for (let pt of ke.values())
      if ((pt.isHeld || pt.cancelTimer !== void 0) && !pt.breaker.isDeferring()) ze(pt.root);
  }
  function nt(pt) {
    return (pt.cancelTimer?.(), ke.delete(pt.root), pt.watcher.close());
  }
  return {
    watchCollections(pt) {
      let Et = new Map(pt.map((yt) => [yt.root, yt]));
      for (let yt of ke.values()) if (!Et.has(yt.root)) nt(yt);
      for (let [yt, { loaded: gt, unserved: At }] of Et) {
        let It = ke.get(yt);
        if (It !== void 0) {
          ((It.loaded = gt), (It.unserved = At));
          continue;
        }
        ke.set(yt, {
          root: yt,
          watcher: watchRoot(yt, () => Ie(yt)),
          breaker: createReloadThrottle(storm, () =>
            tellWatchLine(
              { tell: tell, plainLine: plainLine },
              { plugin: basename_58(yt), folder: yt },
              pjn(storm, "folder-paused"),
            ),
          ),
          loaded: gt,
          unserved: At,
          cancelTimer: void 0,
          isQueued: !1,
          isHeld: !1,
          pendingSince: void 0,
          changedAt: Number.NEGATIVE_INFINITY,
          settledAt: Number.NEGATIVE_INFINITY,
          isForced: !1,
        });
      }
    },
    watchedCollections: () => [...ke.keys()],
    async dispose() {
      (onBegin(), onEnd(), await Promise.all([...ke.values()].map(nt)));
    },
  };
}

export {
  h2r,
  mjn,
  udt,
  Lls,
  Nls,
  describeModuleUnnamed,
  describeManifestReload,
  reportPluginDirWatchChanges,
  classifyChangeSource,
  nextReloadDelay,
  compareStamp,
  tellWatchLine,
  settleReloadPending,
  Fls,
  Ols,
  createReloadThrottle,
  pjn,
  Tls,
  ire,
  BOe,
  describeReloadFailure,
  odt,
  describeDirChanges,
};
