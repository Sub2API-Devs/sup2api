/**
 * plugins/functionHooks/devModsWatch.ts
 *
 * 2.1.316 新增：--plugin-dir 开发目录监视：文件变化触发 mod 重新加载
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (59)
 * attribution: placement 59
 */
import {
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
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
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
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
} from "path";
import {
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  realpath as realpath_10,
  realpath as realpath_11,
  realpath as realpath_12,
  realpath as realpath_13,
  realpath as realpath_14,
  realpath as realpath_15,
  realpath as realpath_16,
  realpath as realpath_17,
  realpath as realpath_18,
  realpath as realpath_19,
  realpath as realpath_20,
  realpath as realpath_21,
  realpath as realpath_22,
  realpath as realpath_23,
  realpath as realpath_24,
  realpath as realpath_25,
  realpath as realpath_26,
  realpath as realpath_27,
  realpath as realpath_28,
  realpath as realpath_29,
  realpath as realpath_30,
  realpath as realpath_31,
  realpath as realpath_32,
  realpath as realpath_33,
  realpath as realpath_34,
  realpath as realpath_35,
  realpath as realpath_36,
  realpath as realpath_37,
  realpath as realpath_38,
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  stat as stat_6,
  stat as stat_7,
  stat as stat_8,
  stat as stat_9,
  stat as stat_10,
  stat as stat_11,
  stat as stat_12,
  stat as stat_13,
  stat as stat_14,
  stat as stat_15,
  stat as stat_16,
  stat as stat_17,
  stat as stat_18,
  stat as stat_19,
  stat as stat_20,
  stat as stat_21,
  stat as stat_22,
} from "fs/promises";
import { iF, startPluginDirWatcher } from "./typeRoots.js";
import { logForDebugging, getDebugLogPath } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { Ok } from "../../../vendor/chokidar/index.js";
import { getLastInteractionTime, isDiskless } from "../../bootstrap/state.js";
import { Heo, _3t } from "./moduleLoader.js";
import {
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
} from "./devModsStatus.js";
import { uniq } from "../../utils/collections.js";
import { logError } from "../../utils/log.js";
import { Wj, T7, mergePluginRecord, retargetHooksModule } from "./hooksModuleLoader.js";
import { uiLog, watchedPluginDirs, ipe, QKt, K4o, SYr } from "./hooksWorkerClient.js";
import { IT } from "../hooksModules/loadedModuleFilters.js";
import { isOfficialMarketplacePlugin, bqe } from "./panes.js";
import { BPe } from "../../utils/plugins/managedPlugins.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";
import { TRUSTED_SETTING_SOURCES as TRUSTED_SETTING_SOURCES_2 } from "../../utils/plugins/pluginConfigSources.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { hookPluginLabel } from "./hookDispatch.js";
import { hooksModulesRefusalReason } from "../../services/analytics/growthbookCredentials.js";
import { sT } from "../../utils/pastedContent.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { PLUGIN_MANIFEST_PATH, PLUGIN_JSON } from "../../utils/plugins/commandSource.js";
import { isZipPathCaseInsensitive, createPluginFromPath } from "../../utils/plugins/pluginLoader.js";
import { SKILLS_DIR } from "../../utils/telemetry/pluginTelemetry.js";
import { Ude, Yue, R8n, Bde } from "./pluginLifecycle.js";
import { describePluginDirShape, x3n } from "../../utils/plugins/pluginManifestRead.js";
import { hooksModuleFiles } from "./eventPatterns.js";
import { ge } from "../../utils/identity.js";
import { to } from "../../utils/valueSlot.js";
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { HooksError } from "./hooksErrors.js";
import { pluginErrorText } from "../../types/plugin.js";
import { vbe, vWe, EWe } from "./personHold.js";
import { skillWatchStateByHost } from "../../skills/skillChangeWatch.js";
import { gte } from "./devModsName.js";
import { Xjn } from "./devModsNotices.js";

/**
 * n 是 e 的直接子项时返回子项名，否则 undefined。
 */
//@ chunk-e6aww6q8.js:4127280-4127384 placement
function childNameUnder(e, n) {
  let r = relative_37(e, n);
  return r !== "" && !isAbsolute_51(r) && !r.startsWith("..") && !r.includes(sep_58) ? r : void 0;
}
//@ chunk-e6aww6q8.js:4127445-4127486 placement
var gdt = (e, n) => (r) => join_102(e, relative_38(n, resolve_44(r)));
//@ chunk-e6aww6q8.js:4127486-4127500 placement
var yjn = 60000;
//@ chunk-e6aww6q8.js:4127500-4127512 placement
var _jn = 1e4;
//@ chunk-e6aww6q8.js:4127512-4127526 placement
var Sjn = 30000;
//@ chunk-e6aww6q8.js:4127526-4127558 placement
var xXn = ["node_modules", ".git"];
/**
 * 监视时忽略 node_modules、.git、点开头（.claude-plugin 除外）、.log 文件和调试日志路径。
 */
//@ chunk-e6aww6q8.js:4127668-4127824 placement
function isIgnoredWatchPath(e, n) {
  let r = basename_60(e),
    s = r.startsWith(".") && r !== ".claude-plugin",
    h = e === n || e === join_103(dirname_60(n), "latest");
  return xXn.includes(r) || s || r.endsWith(".log") || h;
}
//@ chunk-e6aww6q8.js:4127944-4128028 placement
function Ax(e, n) {
  let r = relative_40(e, n);
  return !(isAbsolute_52(r) || r === ".." || r.startsWith(`..${sep_60}`));
}
//@ chunk-e6aww6q8.js:4128028-4128144 placement
function ancestorPathsWithin(e, n) {
  let r = relative_39(e, n),
    s = r === "" ? [] : r.split(sep_59);
  return Ax(e, n) ? s.map((h, y) => join_104(e, ...s.slice(0, y + 1))) : [n];
}
//@ chunk-e6aww6q8.js:4128402-4128433 placement
var ZWt = (e, n) => Ax(join_105(e, iF), n);
/**
 * 生成 chokidar ignored 函数：路径链上有忽略目录、在插件缓存里或命中忽略规则（且非 manifest）时忽略。
 */
//@ chunk-e6aww6q8.js:4128433-4128570 placement
var createWatchIgnorer = (e, n, r) => (s) => {
  let h = resolve_45(s),
    y = ancestorPathsWithin(e, h),
    any = y.some((L) => xXn.includes(basename_59(L))),
    any_2 = y.some((L) => isIgnoredWatchPath(L, n));
  return any || ZWt(e, h) || (any_2 && !r(h));
};
//@ chunk-e6aww6q8.js:4128570-4128606 placement
var Ads = (e, n) => n.some((r) => Ax(e, r));
//@ chunk-e6aww6q8.js:4128606-4128618 placement
var yre = 100;
/**
 * 按用户最近交互切换监视轮询频率（活动/空闲），切换时回调以补扫。
 */
//@ chunk-e6aww6q8.js:4128618-4128977 placement
function createIdlePacer(e, n, r) {
  let s = !1,
    activeMs = n.activeMs,
    now = n.now(),
    S = setInterval(() => {
      let now_2 = n.now(),
        L = now_2 - n.lastInteractionTime() > n.idleAfterMs;
      if (L === s) return;
      let G = Math.max(now, now_2 - activeMs) - yre;
      ((s = L),
        (activeMs = s ? n.idleMs : n.activeMs),
        (now = now_2),
        logForDebugging(`plugin-dir watch on ${e}: ${s ? "idle" : "active"}, polling every ${activeMs}ms`),
        r(G));
    }, n.checkEveryMs);
  return (
    S.unref(),
    {
      interval: () => activeMs,
      stop: () => {
        clearInterval(S);
      },
    }
  );
}
//@ chunk-e6aww6q8.js:4128977-4129155 placement
var watchOptionsFor = (e) => ({
  persistent: !0,
  followSymlinks: !1,
  ignorePermissionErrors: !0,
  usePolling: !0,
  interval: e,
  binaryInterval: e,
  awaitWriteFinish: { stabilityThreshold: yre, pollInterval: yre / 2 },
});
//@ chunk-e6aww6q8.js:4129196-4129229 placement
var _dt = (e) => realpath_31(e).catch(() => e);
/**
 * 在一个插件目录上建立文件监视（chokidar 风格的 add/change/unlink 事件），失败时降级为轮询。
 */
//@ chunk-e6aww6q8.js:4129229-4130260 placement
function openPluginDirWatcher({ root: root, ignored: ignored, onChange: onChange, pace: pace }) {
  let h = createIdlePacer(root, pace, (q) => {
      L(q);
    }),
    y,
    S = G(void 0).then((q) => q.watcher),
    w = (q) =>
      logForDebugging(`plugin-dir watch on ${root}: close failed: ${errorMessage(q)}`, { level: "warn" });
  function L(q) {
    let Z = S.then(async (Se) => (await Se.close().then(void 0, w), y?.scanned.resolve(), G(q)));
    return ((S = Z.then((Se) => Se.watcher)), Z.then((Se) => Se.scanned.promise));
  }
  async function G(q) {
    let Z = await _dt(root),
      Se = gdt(root, Z),
      ke = typeof ignored === "function",
      we = q !== void 0,
      withResolvers = Promise.withResolvers(),
      watch = Ok.watch(Z, {
        ...watchOptionsFor(h.interval()),
        ignoreInitial: q === void 0,
        alwaysStat: q !== void 0,
        ignored: ke ? (Ie, Me) => ignored(Se(Ie), Me) : ignored,
      });
    return (
      watch.on("add", (Ie, Me) => {
        if (!we || (Me !== void 0 && Me.ctimeMs > (q ?? 0))) onChange(Se(Ie), Me?.ctimeMs);
      }),
      watch.on("ready", () => {
        ((we = !1), withResolvers.resolve());
      }),
      watch.on("change", (Ie, Me) => onChange(Se(Ie), Me?.ctimeMs)),
      watch.on("unlink", (Ie) => {
        onChange(Se(Ie));
      }),
      watch.on("error", (Ie) =>
        logForDebugging(`plugin-dir watch on ${root}: ${errorMessage(Ie)}`, { level: "warn" }),
      ),
      (y = { watcher: watch, scanned: withResolvers }),
      y
    );
  }
  return {
    close: async () => {
      (h.stop(), await (await S).close(), y?.scanned.resolve());
    },
    retarget: () => {},
    interval: h.interval,
    rescan: L,
  };
}
//@ chunk-e6aww6q8.js:4130297-4130448 placement
var statFiles = async (e) =>
  (
    await Promise.all(
      e.map((n) =>
        stat_21(n).then(
          (r) => (r.isFile() ? { path: n, ctimeMs: r.ctimeMs } : void 0),
          () => {
            return;
          },
        ),
      ),
    )
  ).filter((n) => n !== void 0);
/**
 * 处理插件目录的文件变化事件，安排对应 mod 的重新加载。
 */
//@ chunk-e6aww6q8.js:4130448-4131608 placement
function handlePluginDirWatchEvent({ root: root, files: files, onChange: onChange, pace: pace }) {
  let h = createIdlePacer(root, pace, (Se) => {
      w = w.then((ke) => q(ke, Se));
    }),
    y = new Set(),
    S = new Set(),
    w = q(void 0, void 0),
    L = G();
  function G() {
    let Se = setTimeout(() => {
      ((w = w.then(Z)), (L = G()));
    }, h.interval());
    return (Se.unref(), Se);
  }
  async function q(Se, ke) {
    await Se?.close();
    let we = files(),
      Ee = await statFiles(we);
    y.clear();
    for (let Ie of Ee) if ((y.add(Ie.path), ke !== void 0 && Ie.ctimeMs > ke)) onChange(Ie.path, Ie.ctimeMs);
    S = new Set(we.filter((Ie) => !y.has(Ie)));
    let watch = Ok.watch([...y], { ...watchOptionsFor(h.interval()), ignoreInitial: !0 });
    return (
      watch.on("change", (Ie, Me) => onChange(Ie, Me?.ctimeMs)),
      watch.on("unlink", (Ie) => {
        (y.delete(Ie), S.add(Ie), onChange(Ie));
      }),
      watch.on("error", (Ie) =>
        logForDebugging(`plugin-dir watch on ${root}: ${errorMessage(Ie)}`, { level: "warn" }),
      ),
      watch
    );
  }
  async function Z(Se) {
    let ke = files(),
      we = new Map((await statFiles(ke)).map((Ee) => [Ee.path, Ee.ctimeMs]));
    for (let [Ee, Ae] of we)
      if (!y.has(Ee)) {
        if ((Se.add(Ee), y.add(Ee), S.has(Ee))) onChange(Ee, Ae);
      }
    for (let Ee of [...y]) if (!ke.includes(Ee)) (Se.unwatch(Ee), y.delete(Ee));
    return ((S = new Set(ke.filter((Ee) => !we.has(Ee) && !y.has(Ee)))), Se);
  }
  return {
    close: async () => {
      (h.stop(), clearTimeout(L), await (await w).close());
    },
    retarget: () => {
      w = w.then(Z);
    },
    interval: h.interval,
    rescan(Se) {
      return ((w = w.then((ke) => q(ke, Se))), w.then(() => {}));
    },
  };
}
//@ chunk-e6aww6q8.js:4131608-4131620 placement
var rmn = 400;
//@ chunk-e6aww6q8.js:4131620-4131723 placement
var WATCH_PACE = {
  activeMs: rmn,
  idleMs: Sjn,
  idleAfterMs: yjn,
  checkEveryMs: _jn,
  lastInteractionTime: getLastInteractionTime,
  now: Date.now,
};
/**
 * 按插件范围启动监视：folder 用目录监视，files 只监视指定文件。
 */
//@ chunk-e6aww6q8.js:4131723-4131888 placement
function startPluginWatch(e, n, r) {
  return e.scope === "folder"
    ? openPluginDirWatcher({
        root: e.root,
        ignored: createWatchIgnorer(e.root, getDebugLogPath(), r),
        onChange: n,
        pace: WATCH_PACE,
      })
    : handlePluginDirWatchEvent({ root: e.root, files: e.files, onChange: n, pace: WATCH_PACE });
}
//@ chunk-e6aww6q8.js:4131888-4131899 placement
var gGr = 10;
//@ chunk-e6aww6q8.js:4131899-4131965 placement
var Ejn = (e, n, r) => n.includes(e) || (r === void 0 ? Heo(e) : r.includes(e));
//@ chunk-e6aww6q8.js:4131965-4132024 placement
var Rjn = (e, n, r) => ({ read: n ?? r, isServed: n !== void 0, taken: e });
//@ chunk-e6aww6q8.js:4132024-4132116 placement
function v6(e, n, r) {
  return n !== void 0 && e.manifests.includes(n) && !e.manifests.includes(r) ? n : r;
}
/**
 * 某插件文件变化时：非 manifest 文件直接重载；manifest 变化则重读 manifest，按"需重启/不再有入口/重载"给出状态。
 */
//@ chunk-e6aww6q8.js:4132116-4132514 placement
async function reloadOnChange(e, n, r) {
  let { name: s, root: root, scope: scope } = n;
  if (!n.manifests.includes(r)) {
    let reload = await e.reload(s);
    return mjn(udt(reload), reload);
  }
  let rereadManifest = await e.rereadManifest({
    name: s,
    root: root,
    scope: scope,
    manifests: n.manifests,
    entry: n.entry,
  });
  if (!rereadManifest) return Lls(r);
  ((n.manifests = rereadManifest.manifests), (n.entry = rereadManifest.now));
  let w = { manifest: r, root: root };
  if (rereadManifest.now === void 0) return Nls(describeModuleUnnamed(w, rereadManifest.before));
  let reload = await e.reload(s);
  return mjn(describeManifestReload(w, rereadManifest, reload), reload);
}
/**
 * plugin-dir 监视主循环：合并变化、节流频繁重载、调用 ConfigChange 钩子把关，然后重载 mod。
 */
//@ chunk-e6aww6q8.js:4132514-4139257 placement
function runPluginDirWatch({
  watchDir: watchDir,
  filesOf: filesOf,
  stampOf: stampOf,
  loadedStampOf: loadedStampOf,
  rereadManifest: rereadManifest,
  admit: admit,
  reload: reload,
  tell: tell,
  debounceMs: debounceMs,
  burst: burst,
  storm: storm,
  clock: clock,
  turn: turn,
  watchRoot: watchRoot,
  listChildren: listChildren,
  reloadPlugins: reloadPlugins,
  plainLine: plainLine,
  plainWording: plainWording,
}) {
  let Me = new Map(),
    We = reportPluginDirWatchChanges(
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
      fo,
      (co) => [...Me.values()].some((So) => childNameUnder(co, So.root) !== void 0 && Xn(So)),
    ),
    onBegin = turn.onBegin(hn),
    onEnd = turn.onEnd(hn);
  function Je(co, So) {
    let ko = Me.get(co) ?? So;
    return uniq([...ko.manifests, ...(filesOf(co) ?? []), ...(ko.entry === void 0 ? [] : [ko.entry])]);
  }
  function nt(co, So, ko) {
    let un = Me.get(co),
      ao = un?.failed === void 0 ? filesOf(co) : void 0;
    if (un === void 0 || !Ejn(So, un.manifests, ao)) return;
    pt(un, So, ko);
  }
  function pt(co, So, ko) {
    co.telling = co.telling.then(() => gt(co, So, ko)).catch(logError);
  }
  let Et = (co, So) => (co.manifests.includes(So) ? co.manifestReadAt : co.readAt);
  function yt(co, So) {
    let ko = co.takenStamps.get(So),
      un = co.reloading ? void 0 : loadedStampOf(co.name, So);
    return Rjn(ko, co.isBehind ? void 0 : un, (co.tried.has(So) ? ko?.stamp : void 0) ?? un);
  }
  async function gt(co, So, ko) {
    if (ko === void 0) return At(co, So, void 0);
    let ao = yt(co, So).read === void 0 && ko <= Et(co, So) ? void 0 : await stampOf(So, co.root);
    return At(co, So, { ctimeMs: ko, stamp: ao });
  }
  function At(co, So, ko) {
    if (Me.get(co.name) !== co) return;
    let un = ko && classifyChangeSource(ko, yt(co, So), Et(co, So));
    if (un === "served") It(co, So);
    if (un !== void 0) return;
    let ao = ko === void 0 || ko.ctimeMs > co.newest;
    if (
      ((co.cause = v6(co, co.cause, So)),
      (co.newest = Math.max(co.newest, ko?.ctimeMs ?? Number.POSITIVE_INFINITY)),
      ko !== void 0)
    )
      co.pendingStamps.set(So, {
        ctimeMs: Math.max(ko.ctimeMs, co.pendingStamps.get(So)?.ctimeMs ?? ko.ctimeMs),
        stamp: ko.stamp,
      });
    if (!ao) return;
    let now = clock.now();
    (co.breaker.sawChange(now),
      Zt(
        co,
        nextReloadDelay({ debounceMs: debounceMs, burst: burst, storm: storm }, co, {
          now: now,
          intervalMs: co.watcher.interval(),
        }),
      ));
  }
  function It(co, So) {
    let ko = co.pendingStamps.delete(So),
      un = co.newest === Number.POSITIVE_INFINITY,
      ao = [...co.pendingStamps.keys()];
    if (ko && ao.length === 0 && !un) qt(co);
    if (co.cause === So && ao.length > 0) co.cause = ao.reduce(($o, yo) => v6(co, $o, yo), void 0);
  }
  function Yt(co) {
    for (let [So, ko] of [...co.pendingStamps]) {
      let un = yt(co, So);
      if (un.isServed && compareStamp(ko.stamp, un.read) === "same") It(co, So);
    }
  }
  function qt(co) {
    (co.cancelTimer?.(),
      (co.cancelTimer = void 0),
      (co.cause = void 0),
      (co.newest = Number.NEGATIVE_INFINITY),
      co.pendingStamps.clear(),
      (co.pendingSince = void 0),
      (co.isHeld = !1));
  }
  function Zt(co, So) {
    if (co.isRescanning) return;
    if (co.breaker.isDeferring()) {
      if (co.cancelTimer === void 0) rn(co.name, storm.quietMs, pn);
      return;
    }
    if (turn.isRunning()) {
      (co.cancelTimer?.(), (co.cancelTimer = void 0), (co.isHeld = !0));
      return;
    }
    rn(co.name, So, bo);
  }
  function rn(co, So, ko) {
    let un = Me.get(co);
    if (un === void 0) return;
    (un.cancelTimer?.(), (un.cancelTimer = clock.setTimeout(() => ko(co), So)));
  }
  function pn(co) {
    (Me.get(co)?.breaker.catchesUp(), bo(co));
  }
  function no(co, So) {
    ((co.isBehind = co.isBehind && (So.isFaulted || So.readAt < co.readAt)),
      (co.readAt = Math.max(co.readAt, Math.min(So.readAt, clock.now()))),
      (co.failed = void 0));
    let ko = co.cause !== void 0 && co.manifests.includes(co.cause),
      filtered = [...co.pendingStamps].filter(
        ([$o, yo]) => classifyChangeSource(yo, yt(co, $o), So.readAt) === void 0,
      );
    if (filtered.length === 0 && co.newest !== Number.POSITIVE_INFINITY && !ko) qt(co);
    for (let [$o, yo] of filtered) pt(co, $o, yo.ctimeMs);
  }
  function hn() {
    for (let co of Me.values()) co.boundary = co.boundary.then(() => ho(co));
  }
  function ho(co) {
    if (Me.get(co.name) !== co || co.breaker.isDeferring()) return Promise.resolve();
    (co.cancelTimer?.(), (co.cancelTimer = void 0), (co.isRescanning = !0));
    function ko() {
      ((co.isRescanning = !1), (co.isHeld = !1), bo(co.name));
    }
    let un = Math.min(co.readAt, co.manifestReadAt) - gGr;
    return co.watcher
      .rescan(un)
      .then(() => co.telling)
      .then(ko, ko);
  }
  let yn = (co) =>
      co.telling.then(() => {
        if (!co.breaker.isDeferring()) ((co.isHeld = !1), bo(co.name));
      }),
    Kn = (co) =>
      co.settling.then(() => {
        if (co.cause !== void 0 && !co.reloading && !co.breaker.isDeferring())
          ((co.isHeld = !1), bo(co.name));
        return co.settling;
      }),
    Xn = (co) => Je(co.name, co).some((So) => loadedStampOf(co.name, So) !== void 0);
  function fo(co) {
    let found = [...Me.values()].find((ko) => relative_36(ko.root, co) === "");
    return found !== void 0 && !Xn(found);
  }
  let To = (co, So) =>
    tellWatchLine({ tell: tell, plainLine: plainLine }, { plugin: co.name, folder: dirname_59(co.root) }, So);
  function bo(co) {
    let So = Me.get(co);
    if (So?.cause === void 0) return;
    if ((So.cancelTimer?.(), (So.cancelTimer = void 0), (So.isHeld = !1), So.reloading)) {
      ((So.again = v6(So, So.again, So.cause)), (So.cause = void 0));
      return;
    }
    if (!So.breaker.admits(clock.now())) {
      if (So.breaker.isDeferring()) rn(co, storm.quietMs, pn);
      return;
    }
    let ko = v6(So, So.failed, So.cause),
      now = clock.now(),
      interval = So.watcher.interval();
    settleReloadPending(burst, So, { now: now, intervalMs: interval });
    let $o = now - gGr;
    if (((So.readAt = Math.max(So.readAt, $o)), So.manifests.includes(ko)))
      So.manifestReadAt = Math.max(So.manifestReadAt, $o);
    for (let [yo, Ho] of So.pendingStamps) So.takenStamps.set(yo, Ho);
    ((So.tried = new Set(So.pendingStamps.keys())),
      So.pendingStamps.clear(),
      (So.isBehind = !0),
      (So.cause = void 0),
      (So.newest = Number.NEGATIVE_INFINITY),
      (So.reloading = !0),
      (So.settling = admit(So.scope, ko)
        .then((yo) => {
          if (!yo) {
            To(So, Fls(ko, Xn(So)));
            return;
          }
          return reloadOnChange({ reload: reload, rereadManifest: rereadManifest }, So, ko).then(
            (Ho) => {
              ((So.failed = void 0), (So.isBehind = !1), To(So, Ho));
            },
            (Ho) => {
              ((So.failed = ko), To(So, Ols(co, Ho, Ho instanceof Wj)));
            },
          );
        })
        .finally(() => {
          ((So.reloading = !1), (So.settledAt = clock.now()), So.watcher.retarget());
          let again = So.again;
          if (((So.again = void 0), again !== void 0)) So.cause = v6(So, So.cause, again);
          if ((Yt(So), again !== void 0 && So.cause !== void 0))
            ((So.pendingSince ??= So.settledAt), Zt(So, debounceMs));
        })));
  }
  function vn(co, So) {
    return (So.cancelTimer?.(), Me.delete(co), Promise.all([So.watcher.close(), So.telling]).then(() => {}));
  }
  return {
    watchPlugins(co, So) {
      let ko = new Map(co.map((un) => [un.name, un]));
      for (let [un, ao] of Me) {
        let $o = ko.get(un);
        if ($o?.root !== ao.root) {
          vn(un, ao);
          continue;
        }
        if (((ao.manifests = $o.manifests), (ao.entry = $o.entry), So)) no(ao, So);
        ao.watcher.retarget();
      }
      for (let [un, ao] of ko) {
        let { root: root, scope: scope, manifests: manifests } = ao;
        if (!Me.has(un))
          Me.set(un, {
            name: un,
            root: root,
            scope: scope,
            watcher: watchDir(
              { root: root, scope: scope, files: () => Je(un, ao) },
              (rr, br) => nt(un, rr, br),
              (rr) => Ads(rr, Je(un, ao)),
            ),
            breaker: createReloadThrottle(storm, () =>
              tellWatchLine(
                { tell: tell, plainLine: plainLine },
                { plugin: un, folder: dirname_59(root) },
                pjn(storm, "paused"),
              ),
            ),
            manifests: manifests,
            entry: ao.entry,
            cancelTimer: void 0,
            cause: void 0,
            reloading: !1,
            failed: void 0,
            again: void 0,
            readAt: Math.min(So?.readAt ?? clock.now(), clock.now()),
            manifestReadAt: Math.min(So?.readAt ?? clock.now(), clock.now()),
            newest: Number.NEGATIVE_INFINITY,
            pendingStamps: new Map(),
            takenStamps: new Map(),
            tried: new Set(),
            pendingSince: void 0,
            changedAt: Number.NEGATIVE_INFINITY,
            settledAt: Number.NEGATIVE_INFINITY,
            isForced: !1,
            isBehind: !1,
            isHeld: !1,
            isRescanning: !1,
            boundary: Promise.resolve(),
            telling: Promise.resolve(),
            settling: Promise.resolve(),
          });
      }
    },
    watchCollections: We.watchCollections,
    watched: () => [...Me.keys()],
    watchedCollections: We.watchedCollections,
    isUnloaded: fo,
    release(co) {
      let So = Me.get(co);
      if (So === void 0) return Promise.resolve();
      let ko = So.watcher.interval() <= Tls;
      return ((So.boundary = So.boundary.then(() => (ko ? yn(So) : ho(So)))), So.boundary.then(() => Kn(So)));
    },
    async dispose() {
      (onBegin(), onEnd(), await Promise.all([...[...Me].map(([co, So]) => vn(co, So)), We.dispose()]));
    },
  };
}
/**
 * 记录插件选项重载结果（重载、拒绝或失败）。
 */
//@ chunk-e6aww6q8.js:4139257-4139467 placement
function logOptionsReloads(e) {
  for (let n of e)
    switch (n.kind) {
      case "reloaded":
      case "refused":
        uiLog(n.name, ire + udt(n.result), BOe(n.result));
        break;
      case "failed":
        uiLog(n.name, ire + describeReloadFailure(n.name, n.error));
        break;
      case "failing":
      case "held":
        break;
    }
}
//@ chunk-e6aww6q8.js:4139467-4139692 placement
function reportOptionsReloads(e) {
  let n = [];
  for (let r of e) {
    let s = IT(r.name)?.pluginStorageId ?? "",
      h = T7.get(s);
    r.kind === "reloaded" &&
    !r.recovers &&
    h !== void 0 &&
    h.before === h.now &&
    (isOfficialMarketplacePlugin(s) || BPe(s))
      ? logForDebugging(`${r.name}: ${ire}` + udt(r.result))
      : n.push(r);
  }
  logOptionsReloads(n);
}
/**
 * 订阅受信设置来源的变化，变化时重载插件选项并报告结果（只订阅一次）。
 */
//@ chunk-e6aww6q8.js:4139692-4139912 placement
function watchPluginOptionChanges(e) {
  if (odt.get() !== void 0) return;
  let subscribe = settingsChangeDetector.subscribe((r) => {
    if (!TRUSTED_SETTING_SOURCES_2.includes(r)) return;
    e()
      .then(reportOptionsReloads)
      .catch((s) => {
        logForDebugging(`options watch: reload after a ${r} change failed: ` + errorMessage(s), {
          level: "error",
        });
      });
  });
  (odt.set(subscribe), registerCleanup(subscribe));
}
/**
 * hooks 模块整体被禁止时记录原因与被排除的插件，返回空列表。
 */
//@ chunk-e6aww6q8.js:4139912-4140125 placement
function logHooksModulesDisabled(e) {
  let joined = e
      .filter((s) => s.modulePath !== void 0)
      .map(hookPluginLabel)
      .join(", "),
    r = joined !== "";
  return (
    logForDebugging(
      `hooks modules not loaded: ${hooksModulesRefusalReason()}; no switch lifts it and no built-in plugin loads; kept out: ${r ? joined : "(none)"}`,
    ),
    []
  );
}
//@ chunk-e6aww6q8.js:4140125-4140179 placement
var VOe = (e) => ({ size: Buffer.byteLength(e), hash: sT(e) });
/**
 * 读取插件清单文件的戳（受门控的 fd 读取），不可读时为 undefined。
 */
//@ chunk-e6aww6q8.js:4140253-4140430 placement
async function readManifestStamp(e, n) {
  let s = (await Promise.all([realpath_32(n), realpath_32(dirname_62(e))]).then(
    ([h, y]) => Ax(h, y),
    () => !1,
  ))
    ? await getFsImplementation().readFileFdGated(e, _3t)
    : null;
  return s === null ? void 0 : VOe(s.content);
}
/**
 * 只保留被监视的插件目录。
 */
//@ chunk-e6aww6q8.js:4140463-4140593 placement
function filterWatchedPluginDirs(e) {
  let n = new Set(
    [...watchedPluginDirs(e), ...(ipe.get() ?? []), ...(QKt.get() ?? [])].map((r) => resolve_46(r)),
  );
  return e.filter((r) => n.has(resolve_46(r)));
}
/**
 * 插件的 manifest 相关路径：plugin.json、.claude-plugin 清单、hooks/hooks.json 以及 manifest.hooks 指定的文件。
 */
//@ chunk-e6aww6q8.js:4140638-4140809 placement
function pluginManifestPaths(e, n) {
  let mapped = [e.manifest.hooks ?? []]
    .flat()
    .filter((s) => typeof s === "string")
    .map((s) => resolve_47(n, s));
  return uniq([
    join_107(n, PLUGIN_MANIFEST_PATH),
    join_107(n, PLUGIN_JSON),
    join_107(n, "hooks", "hooks.json"),
    ...mapped,
  ]);
}
/**
 * 为 --plugin-dir 集合目录建立监视项：目录下各子插件名映射，以及未被正确服务的子项。
 */
//@ chunk-e6aww6q8.js:4140858-4141215 placement
function collectPluginDirRoots(e, n) {
  return uniq(n.filter((r) => !isZipPathCaseInsensitive(r)).map((r) => resolve_48(r)))
    .filter((r) => !e.some((s) => relative_41(r, s.path) === ""))
    .map((r) => {
      let s = new Map(),
        h = new Set();
      for (let y of e) {
        let S = childNameUnder(r, y.path);
        if (S === void 0) continue;
        s.set(S, y.name);
        let w = IT(y.name)?.pluginRoot;
        if (y.modulePath !== void 0 && (w === void 0 || relative_41(w, y.path) !== "")) h.add(S);
      }
      return { root: r, loaded: s, unserved: h };
    });
}
/**
 * 为 --plugin-dir 下有 hooks 模块的插件生成 folder 范围的监视目标（根目录、manifest 列表、入口）。
 */
//@ chunk-e6aww6q8.js:4141264-4141616 placement
function folderWatchTargets(e, n) {
  let mapped = n.map((s) => resolve_49(s));
  return e
    .filter((s) => s.modulePath !== void 0)
    .flatMap((s) => {
      let found = mapped.find((q) => relative_42(q, s.path) === ""),
        any = mapped.some((q) => childNameUnder(q, s.path) !== void 0),
        S = found ?? (any ? resolve_49(s.path) : void 0);
      if (S === void 0) return [];
      let w = pluginManifestPaths(s, S),
        { modulePath: modulePath } = s,
        G = modulePath === void 0 ? void 0 : resolve_49(modulePath);
      return [{ name: s.name, root: S, scope: "folder", manifests: w, entry: G }];
    });
}
//@ chunk-e6aww6q8.js:4141649-4141873 placement
var skillsWatchTargets = (e) =>
  e
    .filter((n) => n.modulePath !== void 0 && n.source.endsWith(`@${SKILLS_DIR}`))
    .map((n) => {
      let r = resolve_50(n.path),
        s = pluginManifestPaths(n, r),
        { modulePath: modulePath } = n,
        y = modulePath === void 0 ? void 0 : resolve_50(modulePath);
      return { name: n.name, root: r, scope: "files", manifests: s, entry: y };
    });
/**
 * 监视用时钟：now 与可取消的 unref 定时器。
 */
//@ chunk-e6aww6q8.js:4141873-4141978 placement
var WATCH_CLOCK = {
  now: () => Date.now(),
  setTimeout(e, n) {
    let r = setTimeout(e, n);
    return (r.unref(), () => clearTimeout(r));
  },
};
/**
 * files 范围的重载先经 ConfigChange 钩子把关；钩子未接好或抛错时不重载。
 */
//@ chunk-e6aww6q8.js:4141978-4142280 placement
async function passesConfigChangeGate(e, n) {
  if (e !== "files") return !0;
  let r = Ude.get();
  if (r === void 0) return (logError(Error("plugin-dir watch: ConfigChange hook gate not wired")), !1);
  try {
    return !(await r("skills", n));
  } catch (error) {
    return (
      logForDebugging(
        `plugin-dir watch: the ConfigChange hooks for ${n} threw, so no reload: ${errorMessage(error)}`,
        { level: "error" },
      ),
      !1
    );
  }
}
/**
 * 列出目录子项；目录不存在时为空列表，其他错误返回 undefined。
 */
//@ chunk-e6aww6q8.js:4142280-4142446 placement
async function listDirChildren(e) {
  let n = await describePluginDirShape(e);
  if (n.kind === "collection") return n.children;
  return n.kind === "unreadable" && (n.errno === "ENOENT" || n.errno === "ENOTDIR") ? [] : void 0;
}
/**
 * 取内置插件某文件源码的戳。
 */
//@ chunk-e6aww6q8.js:4142446-4142550 placement
function bundledFileStamp(e, n) {
  let r = IT(e),
    s = r && hooksModuleFiles(r).find((h) => h.file === n)?.source;
  return s === void 0 ? void 0 : VOe(s);
}
//@ chunk-e6aww6q8.js:4142550-4142628 placement
function sgn() {
  let e = Yue.get();
  return e ? e.reload() : Promise.resolve("unbound");
}
//@ chunk-e6aww6q8.js:4142628-4142639 placement
var jjn = !1;
//@ chunk-e6aww6q8.js:4142673-4142709 placement
var kre = ge(to(), (e) => e.set(void 0));
//@ chunk-e6aww6q8.js:4142709-4142723 placement
var Wjn = bqe();
//@ chunk-e6aww6q8.js:4142723-4142821 placement
var _9s = io(async () => {
  let { createDeviceTreeHost: createDeviceTreeHost } = await import("./chunk-78kn47sp.js");
  return createDeviceTreeHost();
});
//@ chunk-e6aww6q8.js:4142821-4142922 placement
function replacePluginRecord(e) {
  let n = kre.get();
  if (n === void 0) return;
  kre.set(n.map((r) => (r.path === e.path ? mergePluginRecord(r, e) : r)));
}
//@ chunk-e6aww6q8.js:4142922-4143126 placement
var findHookLoadError = (e) =>
  e.find(
    (n) =>
      n.type === "hook-load-failed" ||
      n.type === "manifest-parse-error" ||
      n.type === "manifest-validation-error" ||
      ((n.type === "path-not-found" || n.type === "path-traversal") && n.component === "hooks"),
  );
/**
 * 重新读取插件（manifest 与 hooks 模块），有加载错误则抛出，成功后更新 manifest 列表与插件记录。
 */
//@ chunk-e6aww6q8.js:4143126-4143460 placement
async function retargetPluginModule(e) {
  let manifests = e.manifests,
    r;
  async function s(y) {
    let { plugin: plugin, errors: errors } = await createPluginFromPath(
        y.path,
        y.source,
        y.enabled ?? !0,
        basename_61(y.path),
        jjn,
      ),
      L = findHookLoadError(errors);
    if (L !== void 0) throw new HooksError(`${y.name}: ${pluginErrorText(L)}`);
    return ((manifests = pluginManifestPaths(plugin, e.root)), (r = plugin), plugin);
  }
  let h = await retargetHooksModule(e.name, s);
  if (r) (Yue.get()?.retarget(r), replacePluginRecord(r));
  return h === void 0 ? void 0 : { ...h, manifests: manifests };
}
/**
 * 回合状态探针：是否有回合运行、是否为人工发起，订阅回合开始/结束。
 */
//@ chunk-e6aww6q8.js:4143460-4143602 placement
var TURN_STATE_PROBE = {
  isRunning: () => vbe() !== void 0,
  isPersonTurn: () => vbe()?.isPersonStarted === !0,
  onBegin: (e) => vWe.subscribe(e),
  onEnd: (e) => EWe.subscribe(e),
};
/**
 * 判断目录是否为当前 mods 文件夹或位于全局 mods 目录下。
 */
//@ chunk-e6aww6q8.js:4143650-4143756 placement
function isInModsFolder(e) {
  let n = skillWatchStateByHost.get()?.folder;
  return (
    (n !== void 0 && resolve_51(n) === resolve_51(e)) ||
    (!isDiskless() && dirname_63(resolve_51(e)) === resolve_51(gte()))
  );
}
//@ chunk-e6aww6q8.js:4145928-4146092 placement
function isWatchedCollectionPath(e, n) {
  let [r, ...s] = relative_43(n, e).split(sep_61);
  if (r === void 0 || r === "") return !0;
  if (r === ".." || !x3n(r)) return !1;
  let joined = s.join(sep_61);
  return joined === "" || joined === dirname_64(PLUGIN_MANIFEST_PATH) || joined === PLUGIN_MANIFEST_PATH;
}
/**
 * 监视 --plugin-dir 集合目录（深度 2，只关心子插件目录与清单），任何增删改都触发回调。
 */
//@ chunk-e6aww6q8.js:4146092-4146542 placement
function watchPluginCollection(e, n) {
  let r = _dt(e).then((s) => {
    let h = gdt(e, s),
      watch = Ok.watch(s, {
        persistent: !0,
        ignoreInitial: !0,
        followSymlinks: !1,
        ignorePermissionErrors: !0,
        depth: Xjn,
        ignored: (w) => !isWatchedCollectionPath(h(w), e),
        usePolling: !0,
        interval: rmn,
        binaryInterval: rmn,
      }),
      S = () => n();
    return (
      watch.on("add", S),
      watch.on("addDir", S),
      watch.on("change", S),
      watch.on("unlink", S),
      watch.on("unlinkDir", S),
      watch.on("error", (w) =>
        logForDebugging(`plugin-dir watch on ${e}: ${errorMessage(w)}`, { level: "warn" }),
      ),
      watch
    );
  });
  return { close: async () => (await r).close() };
}
/**
 * 根据 --plugin-dir、技能目录与已有监视器，启动对开发中插件的文件监视与集合目录监视。
 */
//@ chunk-e6aww6q8.js:4157047-4157494 placement
function startPluginDirWatches(e, n, r) {
  let s = K4o(),
    h = watchedPluginDirs(SYr()),
    y = R8n.get();
  if (!s && h.length === 0 && y === void 0) return;
  let S = Ude.get() !== void 0;
  Bde.set(S ? void 0 : () => startPluginDirWatches(e, n, r));
  let w = s && S,
    L = [...folderWatchTargets(e, h), ...(w ? skillsWatchTargets(e) : [])],
    G = collectPluginDirRoots(n, h);
  if (y === void 0 && L.length === 0 && G.length === 0) return;
  let Z = y ?? startPluginDirWatcher();
  (Z.watchPlugins(L, r),
    Z.watchCollections(G),
    logForDebugging(
      `plugin-dir watch: watching ${Z.watched().join(", ") || "nothing"}; folders of plugins ${Z.watchedCollections().join(", ") || "none"}`,
    ));
}
//@ chunk-e6aww6q8.js:4157532-4157595 placement
function kWn(e) {
  try {
    return decodeURIComponent(e);
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:4157595-4157607 placement
var bWn = 405;
//@ chunk-e6aww6q8.js:4157607-4157619 placement
var wWn = 404;

export {
  childNameUnder,
  gGr,
  isIgnoredWatchPath,
  ZWt,
  xXn,
  sgn,
  logHooksModulesDisabled,
  WATCH_CLOCK,
  startPluginDirWatches,
  watchPluginOptionChanges,
  Ax,
  _9s,
  filterWatchedPluginDirs,
  folderWatchTargets,
  Wjn,
  kre,
  runPluginDirWatch,
  startPluginWatch,
  readManifestStamp,
  bundledFileStamp,
  retargetPluginModule,
  passesConfigChangeGate,
  TURN_STATE_PROBE,
  watchPluginCollection,
  listDirChildren,
  isInModsFolder,
  kWn,
  wWn,
  bWn,
  logOptionsReloads,
  collectPluginDirRoots,
  createWatchIgnorer,
  rmn,
};
