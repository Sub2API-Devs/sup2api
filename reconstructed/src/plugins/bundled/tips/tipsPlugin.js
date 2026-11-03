/**
 * plugins/bundled/tips/tipsPlugin.ts
 *
 * 2.1.316 新增：把 Spinner 提示（tips）做成内置函数钩子插件（tengu_tips_mod）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0j11jfmy.js (27)
 * attribution: placement 27
 */
import { x, Ar } from "../../../../runtime/bun-runtime.js";
import { CC_PLUGIN_TIPS, loadTipRegistryModule, tipSeatSlots } from "../../../services/tips/orgTips.js";
import { cleanMessagesForLogging_2 } from "../../../utils/sessionStorage.js";
import { loadCustomTips, excludesDefaultTips } from "../../../services/tips/spinnerTipsOverride.js";
import { isFirstPartyApiBackend } from "../../../utils/model/providers.js";
import { getSessionsSinceTipShown } from "../../../services/tips/tipHistory.js";
import { tipLifetimeShownCount } from "../../../services/tips/tipIds.js";
import { logForDebugging } from "../../../utils/debug.js";
import { recordShownTip } from "../../../services/tips/tipScheduler.js";
import { logError } from "../../../utils/log.js";
import { withTelemetryMessage, toError } from "../../../utils/errors.js";
import { getRootSession } from "../../../bootstrap/state.js";
import { getFeatureValue_SESSION_PINNED } from "../../../services/analytics/growthbook.js";
import { registerBuiltinPlugin, builtinHooksModuleRef } from "../../builtinPlugins.js";

//@ chunk-0j11jfmy.js:3637-3811 placement
/**
 * tips 插件扫描清单。
 */
var TIPS_MANIFEST = x(function (Lo, b) {
  b.exports = {
    scan: {
      hooks: ["session.start"],
      calls: ["env.get", "settings.read"],
      env: {
        reads: ["CLAUDE_CODE_FORCE_TIP_ID", "USER_TYPE"],
        writes: [],
      },
    },
    files: {},
  };
});
//@ chunk-0j11jfmy.js:3811-3820 placement
/**
 * 空对象
 */
var EMPTY_HOOKS_TIPS = {};
//@ chunk-0j11jfmy.js:3820-4021 placement
Ar(EMPTY_HOOKS_TIPS, {
  PLUGIN_DESCRIPTION: () => TIPS_DESCRIPTION,
  PLUGIN_NAME: () => CC_PLUGIN_TIPS,
  default: () => EMPTY_HOOKS_TIPS,
  hostModuleOf: () => tipsHooksModule,
  hostSourcesOf: () => registerSpinnerTips,
  isAvailable: () => isTipsModOn,
  isOnByDefault: () => TIPS_DEFAULT_OFF,
  registerPlugin: () => registerTipsPlugin,
  sourcedTipOf: () => toTipRecord,
  tipHostOf: () => spinnerTipHost,
});
//@ chunk-0j11jfmy.js:4021-4030 placement
/**
 * 钩子模块占位
 */
var TIPS_HOOK_MODULE = {};
//@ chunk-0j11jfmy.js:4030-4366 placement
Ar(TIPS_HOOK_MODULE, {
  COMMAND_CHECK_THREW_MESSAGE: () => ERR_ADVERTISED_COMMAND,
  CONTENT_THREW_MESSAGE: () => ERR_TIP_CONTENT,
  INTERNAL_USER_TYPE: () => cleanMessagesForLogging_2,
  PICK_FAILED_MESSAGE: () => ERR_SPINNER_TIP,
  RELEVANCE_THREW_MESSAGE: () => ERR_IS_RELEVANT,
  contentSafe: () => loadTipContent,
  default: () => TIPS_HOOK_MODULE,
  isRelevantSafe: () => isTipRelevant,
  pickGatesOf: () => readTipSettings,
  pickOf: () => pickTurnTip,
  register: () => registerTipsHooksOnce,
  registerHooks: () => registerTipsHooks,
  relevantTipsOf: () => pickSpinnerTip,
  selectLongestUnshown: () => pickLeastRecentTip,
  showNextTip: () => showSpinnerTip,
});
//@ chunk-0j11jfmy.js:4366-4804 placement
var toTipRecord = (e, o) => ({
  id: e.id,
  cooldownSessions: e.cooldownSessions,
  ...(e.maxLifetimeShows !== undefined && {
    maxLifetimeShows: e.maxLifetimeShows,
  }),
  ...(e.priority !== undefined && {
    priority: e.priority,
  }),
  ...(e.label !== undefined && {
    label: e.label,
  }),
  ...(e.advertisedCommand !== undefined && {
    advertisedCommand: e.advertisedCommand,
  }),
  providerAgnostic: e.providerAgnostic === true,
  isRelevant: () => e.isRelevant(o),
  content: () =>
    e.content({
      session: o.session,
      theme: o.theme,
      storageV5: o.storageV5,
    }),
});
//@ chunk-0j11jfmy.js:4804-5654 placement
/**
 * 在 session.start 注册 Spinner 提示（CLAUDE_CODE_FORCE_TIP_ID 强制显示）。
 */
function registerSpinnerTips(session, o) {
  let r = o.context();
  let s = o.storageV5();
  let f = new Map();
  function m(tips) {
    for (let p of tips) f.set(p.id, p);
    return tips;
  }
  return {
    candidates: async () => {
      let { getBuiltInTips, tipSessionCaches } = loadTipRegistryModule();
      return m([
        ...getBuiltInTips(),
        ...(await tipSessionCaches.of(session).getMarketplacePluginTips(r.storageV5)),
      ]).map((a) => toTipRecord(a, r));
    },
    orgTips: async () => {
      let { tips, trustedCount } = await loadCustomTips(session);
      return {
        tips: m(tips).map((a) => toTipRecord(a, r)),
        trustedCount,
      };
    },
    isDefaultSuppressed: () => excludesDefaultTips(),
    isFirstPartyBackend: () => isFirstPartyApiBackend(),
    isCommandOffered: (i) => loadTipRegistryModule().advertisedCommandIsOffered(i),
    sessionsSinceShown: (i) => getSessionsSinceTipShown(i),
    lifetimeShown: (i) => tipLifetimeShownCount(i),
    hasFailed: (i) => loadTipRegistryModule().tipSessionCaches.of(session).failedTipIds.has(i),
    markFailed: (i) => {
      loadTipRegistryModule().tipSessionCaches.of(session).failedTipIds.add(i);
    },
    show: (i) => {
      o.show(i);
    },
    record: (i) => {
      let p = f.get(i);
      if (p !== undefined) {
        logForDebugging(`tips plugin: showing spinner tip ${i}`);
        recordShownTip(p, "spinner", s);
      }
    },
    report: (i, p) => {
      logError(withTelemetryMessage(toError(i), p));
    },
  };
}
//@ chunk-0j11jfmy.js:5654-5742 placement
/**
 * 旋转提示的宿主接口
 */
function spinnerTipHost() {
  let { host } = getRootSession();
  return {
    install: (o) => {
      tipSeatSlots.of(host).install((r) => {
        o(registerSpinnerTips(host, r));
      });
    },
  };
}
//@ chunk-0j11jfmy.js:5742-5796 placement
/**
 * 包一层 register
 */
var tipsHooksModule = (e) => ({
  register: (o) => {
    e.registerHooks(o, spinnerTipHost());
  },
});
//@ chunk-0j11jfmy.js:5796-5805 placement
/**
 * 默认关闭
 */
var TIPS_DEFAULT_OFF = false;
//@ chunk-0j11jfmy.js:5805-5838 placement
/**
 * tengu_tips_mod 开关
 */
var isTipsModOn = () => getFeatureValue_SESSION_PINNED("tengu_tips_mod", TIPS_DEFAULT_OFF);
//@ chunk-0j11jfmy.js:5838-5977 placement
var TIPS_DESCRIPTION =
  "Spinner tips as a plugin: the tip line under the spinner while Claude works, picked once a turn from the tips that fit the session";
//@ chunk-0j11jfmy.js:5977-6019 placement
/**
 * 广告命令检查抛错
 */
var ERR_ADVERTISED_COMMAND = "tip advertisedCommand check threw";
//@ chunk-0j11jfmy.js:6019-6045 placement
/**
 * 提示内容抛错
 */
var ERR_TIP_CONTENT = "tip content threw";
//@ chunk-0j11jfmy.js:6057-6084 placement
/**
 * 旋转提示失败
 */
var ERR_SPINNER_TIP = "spinner tip failed";
//@ chunk-0j11jfmy.js:6084-6113 placement
/**
 * isRelevant 抛错
 */
var ERR_IS_RELEVANT = "tip isRelevant threw";
//@ chunk-0j11jfmy.js:6113-6217 placement
/**
 * 读取提示内容，失败时标记并上报。
 */
async function loadTipContent(e, o) {
  try {
    return await o.content();
  } catch (error) {
    e.markFailed(o.id);
    e.report(error, ERR_TIP_CONTENT);
    return "";
  }
}
//@ chunk-0j11jfmy.js:6217-6350 placement
/**
 * 提示是否适用（广告的命令可用且 isRelevant 为真），失败视为不适用。
 */
async function isTipRelevant(e, o) {
  if (!(await isAdvertisedCommandOffered(e, o))) return false;
  try {
    return await o.isRelevant();
  } catch (error) {
    e.markFailed(o.id);
    e.report(error, ERR_IS_RELEVANT);
    return false;
  }
}
//@ chunk-0j11jfmy.js:6350-6523 placement
/**
 * 提示引用的命令是否可用。
 */
async function isAdvertisedCommandOffered(e, o) {
  if (o.advertisedCommand === undefined) return true;
  try {
    return await e.isCommandOffered(o.advertisedCommand);
  } catch (error) {
    e.markFailed(o.id);
    e.report(error, ERR_ADVERTISED_COMMAND);
    return false;
  }
}
//@ chunk-0j11jfmy.js:6523-6703 placement
/**
 * 读取提示开关与（内部用户）强制提示 id。
 */
async function readTipSettings(e) {
  let o = await e.settings();
  let s = (await e.userType()) === cleanMessagesForLogging_2 ? await e.forcedTipId() : undefined;
  return {
    isEnabled: o.spinnerTipsEnabled !== false,
    forcedId: s === undefined || s === "" ? undefined : s,
  };
}
//@ chunk-0j11jfmy.js:6703-7293 placement
async function pickSpinnerTip(e, forcedId) {
  let r = await e.candidates();
  let s = forcedId === undefined ? undefined : r.find((n) => n.id === forcedId);
  if (s !== undefined) return [s];
  let f = await e.orgTips();
  let filtered = f.tips.filter((tip) => e.sessionsSinceShown(tip.id) >= tip.cooldownSessions);
  if (f.trustedCount > 0 && e.isDefaultSuppressed()) return filtered;
  let filtered_2 = r.filter((n) => !e.hasFailed(n.id));
  let p = e.isFirstPartyBackend() ? filtered_2 : filtered_2.filter((n) => n.providerAgnostic);
  let results = await Promise.all(p.map((n) => isTipRelevant(e, n)));
  return [
    ...p
      .filter((n, U) => results[U] === true)
      .filter((n) => e.sessionsSinceShown(n.id) >= n.cooldownSessions)
      .filter((n) => n.maxLifetimeShows === undefined || e.lifetimeShown(n.id) < n.maxLifetimeShows),
    ...filtered,
  ];
}
//@ chunk-0j11jfmy.js:7293-7512 placement
/**
 * 选最久未显示的提示（相同时按优先级）。
 */
function pickLeastRecentTip(e, o) {
  if (o.length <= 1) return o[0];
  return o
    .map((s) => ({
      tip: s,
      sessions: e.sessionsSinceShown(s.id),
    }))
    .toSorted((s, f) =>
      s.sessions === f.sessions ? (f.tip.priority ?? 0) - (s.tip.priority ?? 0) : f.sessions - s.sessions,
    )[0]?.tip;
}
//@ chunk-0j11jfmy.js:7512-7576 placement
/**
 * 选本回合提示
 */
var pickTurnTip = async (e, tipSettings) =>
  tipSettings.isEnabled ? pickLeastRecentTip(e, await pickSpinnerTip(e, tipSettings.forcedId)) : undefined;
//@ chunk-0j11jfmy.js:7576-7789 placement
/**
 * 选择并显示本回合的旋转提示，记录已显示。
 */
async function showSpinnerTip(e, o) {
  try {
    let r = await pickTurnTip(e, await readTipSettings(o));
    let s = r === undefined ? "" : await loadTipContent(e, r);
    if (r === undefined || s === "") {
      e.show(undefined);
      return;
    }
    e.show({
      text: s,
      label: r.label,
    });
    e.record(r.id);
  } catch (error) {
    e.show(undefined);
    e.report(error, ERR_SPINNER_TIP);
  }
}
//@ chunk-0j11jfmy.js:7789-8033 placement
/**
 * 注册 session.start 钩子：交互式会话安装提示选择器。
 */
function registerTipsHooks(e, o) {
  if (o === undefined) return;
  e("session.start", (r, s, f) => {
    if (s.isInteractive)
      o.install((m) => {
        showSpinnerTip(m, {
          settings: () => r.settings.read(),
          userType: () => r.env.get("USER_TYPE"),
          forcedTipId: () => r.env.get("CLAUDE_CODE_FORCE_TIP_ID"),
        });
      });
    return f(s);
  });
}
//@ chunk-0j11jfmy.js:8033-8059 placement
/**
 * 注册提示钩子
 */
function registerTipsHooksOnce(e) {
  registerTipsHooks(e, undefined);
}
//@ chunk-0j11jfmy.js:8059-8158 placement
/**
 * 注册 tips 内置插件
 */
var registerTipsPlugin = () =>
  registerBuiltinPlugin({
    name: CC_PLUGIN_TIPS,
    description: TIPS_DESCRIPTION,
    isAvailable: isTipsModOn,
    hooksModule: builtinHooksModuleRef(import.meta.dir, tipsHooksModule(TIPS_HOOK_MODULE), () =>
      TIPS_MANIFEST(),
    ),
  });
