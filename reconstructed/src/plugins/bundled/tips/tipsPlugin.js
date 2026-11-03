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
import { CC_PLUGIN_TIPS, j$t, B$t } from "../../../services/tips/orgTips.js";
import { cleanMessagesForLogging_2 } from "../../../utils/sessionStorage.js";
import { loadCustomTips, excludesDefaultTips } from "../../../services/tips/spinnerTipsOverride.js";
import { isFirstPartyApiBackend } from "../../../utils/model/providers.js";
import { getSessionsSinceTipShown } from "../../../services/tips/tipHistory.js";
import { Soe } from "../../../services/tips/tipIds.js";
import { logForDebugging } from "../../../utils/debug.js";
import { recordShownTip } from "../../../services/tips/tipScheduler.js";
import { logError } from "../../../utils/log.js";
import { withTelemetryMessage, toError } from "../../../utils/errors.js";
import { getRootSession } from "../../../bootstrap/state.js";
import { getFeatureValue_SESSION_PINNED } from "../../../services/analytics/growthbook.js";
import { registerBuiltinPlugin, builtinHooksModuleRef } from "../../builtinPlugins.js";

/**
 * tips 插件扫描清单。
 */
//@ chunk-0j11jfmy.js:3637-3811 placement
var TIPS_MANIFEST = x(function (Lo, b) {
  b.exports = {
    scan: {
      hooks: ["session.start"],
      calls: ["env.get", "settings.read"],
      env: { reads: ["CLAUDE_CODE_FORCE_TIP_ID", "USER_TYPE"], writes: [] },
    },
    files: {},
  };
});
//@ chunk-0j11jfmy.js:3811-3820 placement
var v = {};
//@ chunk-0j11jfmy.js:3820-4021 placement
Ar(v, {
  PLUGIN_DESCRIPTION: () => TIPS_DESCRIPTION,
  PLUGIN_NAME: () => CC_PLUGIN_TIPS,
  default: () => v,
  hostModuleOf: () => P,
  hostSourcesOf: () => registerSpinnerTips,
  isAvailable: () => g,
  isOnByDefault: () => y,
  registerPlugin: () => se,
  sourcedTipOf: () => toTipRecord,
  tipHostOf: () => T,
});
//@ chunk-0j11jfmy.js:4021-4030 placement
var c = {};
//@ chunk-0j11jfmy.js:4030-4366 placement
Ar(c, {
  COMMAND_CHECK_THREW_MESSAGE: () => R,
  CONTENT_THREW_MESSAGE: () => A,
  INTERNAL_USER_TYPE: () => cleanMessagesForLogging_2,
  PICK_FAILED_MESSAGE: () => L,
  RELEVANCE_THREW_MESSAGE: () => D,
  contentSafe: () => loadTipContent,
  default: () => c,
  isRelevantSafe: () => isTipRelevant,
  pickGatesOf: () => readTipSettings,
  pickOf: () => C,
  register: () => z,
  registerHooks: () => registerTipsHooks,
  relevantTipsOf: () => pickSpinnerTip,
  selectLongestUnshown: () => pickLeastRecentTip,
  showNextTip: () => showSpinnerTip,
});
//@ chunk-0j11jfmy.js:4366-4804 placement
var toTipRecord = (e, o) => ({
  id: e.id,
  cooldownSessions: e.cooldownSessions,
  ...(e.maxLifetimeShows !== void 0 && { maxLifetimeShows: e.maxLifetimeShows }),
  ...(e.priority !== void 0 && { priority: e.priority }),
  ...(e.label !== void 0 && { label: e.label }),
  ...(e.advertisedCommand !== void 0 && { advertisedCommand: e.advertisedCommand }),
  providerAgnostic: e.providerAgnostic === !0,
  isRelevant: () => e.isRelevant(o),
  content: () => e.content({ session: o.session, theme: o.theme, storageV5: o.storageV5 }),
});
/**
 * 在 session.start 注册 Spinner 提示（CLAUDE_CODE_FORCE_TIP_ID 强制显示）。
 */
//@ chunk-0j11jfmy.js:4804-5654 placement
function registerSpinnerTips(e, o) {
  let context = o.context(),
    storageV5 = o.storageV5(),
    f = new Map();
  function m(i) {
    for (let p of i) f.set(p.id, p);
    return i;
  }
  return {
    candidates: async () => {
      let { getBuiltInTips: getBuiltInTips, tipSessionCaches: tipSessionCaches } = j$t();
      return m([
        ...getBuiltInTips(),
        ...(await tipSessionCaches.of(e).getMarketplacePluginTips(context.storageV5)),
      ]).map((a) => toTipRecord(a, context));
    },
    orgTips: async () => {
      let { tips: tips, trustedCount: trustedCount } = await loadCustomTips(e);
      return { tips: m(tips).map((a) => toTipRecord(a, context)), trustedCount: trustedCount };
    },
    isDefaultSuppressed: () => excludesDefaultTips(),
    isFirstPartyBackend: () => isFirstPartyApiBackend(),
    isCommandOffered: (i) => j$t().advertisedCommandIsOffered(i),
    sessionsSinceShown: (i) => getSessionsSinceTipShown(i),
    lifetimeShown: (i) => Soe(i),
    hasFailed: (i) => j$t().tipSessionCaches.of(e).failedTipIds.has(i),
    markFailed: (i) => {
      j$t().tipSessionCaches.of(e).failedTipIds.add(i);
    },
    show: (i) => {
      o.show(i);
    },
    record: (i) => {
      let p = f.get(i);
      if (p !== void 0)
        (logForDebugging(`tips plugin: showing spinner tip ${i}`), recordShownTip(p, "spinner", storageV5));
    },
    report: (i, p) => {
      logError(withTelemetryMessage(toError(i), p));
    },
  };
}
//@ chunk-0j11jfmy.js:5654-5742 placement
function T() {
  let { host: host } = getRootSession();
  return {
    install: (o) => {
      B$t.of(host).install((r) => {
        o(registerSpinnerTips(host, r));
      });
    },
  };
}
//@ chunk-0j11jfmy.js:5742-5796 placement
var P = (e) => ({
  register: (o) => {
    e.registerHooks(o, T());
  },
});
//@ chunk-0j11jfmy.js:5796-5805 placement
var y = !1;
//@ chunk-0j11jfmy.js:5805-5838 placement
var g = () => getFeatureValue_SESSION_PINNED("tengu_tips_mod", y);
//@ chunk-0j11jfmy.js:5838-5977 placement
var TIPS_DESCRIPTION =
  "Spinner tips as a plugin: the tip line under the spinner while Claude works, picked once a turn from the tips that fit the session";
//@ chunk-0j11jfmy.js:5977-6019 placement
var R = "tip advertisedCommand check threw";
//@ chunk-0j11jfmy.js:6019-6045 placement
var A = "tip content threw";
//@ chunk-0j11jfmy.js:6057-6084 placement
var L = "spinner tip failed";
//@ chunk-0j11jfmy.js:6084-6113 placement
var D = "tip isRelevant threw";
/**
 * 读取提示内容，失败时标记并上报。
 */
//@ chunk-0j11jfmy.js:6113-6217 placement
async function loadTipContent(e, o) {
  try {
    return await o.content();
  } catch (error) {
    return (e.markFailed(o.id), e.report(error, A), "");
  }
}
/**
 * 提示是否适用（广告的命令可用且 isRelevant 为真），失败视为不适用。
 */
//@ chunk-0j11jfmy.js:6217-6350 placement
async function isTipRelevant(e, o) {
  if (!(await isAdvertisedCommandOffered(e, o))) return !1;
  try {
    return await o.isRelevant();
  } catch (error) {
    return (e.markFailed(o.id), e.report(error, D), !1);
  }
}
/**
 * 提示引用的命令是否可用。
 */
//@ chunk-0j11jfmy.js:6350-6523 placement
async function isAdvertisedCommandOffered(e, o) {
  if (o.advertisedCommand === void 0) return !0;
  try {
    return await e.isCommandOffered(o.advertisedCommand);
  } catch (error) {
    return (e.markFailed(o.id), e.report(error, R), !1);
  }
}
/**
 * 读取提示开关与（内部用户）强制提示 id。
 */
//@ chunk-0j11jfmy.js:6523-6703 placement
async function readTipSettings(e) {
  let settings = await e.settings(),
    s = (await e.userType()) === cleanMessagesForLogging_2 ? await e.forcedTipId() : void 0;
  return { isEnabled: settings.spinnerTipsEnabled !== !1, forcedId: s === void 0 || s === "" ? void 0 : s };
}
//@ chunk-0j11jfmy.js:6703-7293 placement
async function pickSpinnerTip(e, o) {
  let candidates = await e.candidates(),
    s = o === void 0 ? void 0 : candidates.find((n) => n.id === o);
  if (s !== void 0) return [s];
  let orgTips = await e.orgTips(),
    filtered = orgTips.tips.filter((tip) => e.sessionsSinceShown(tip.id) >= tip.cooldownSessions);
  if (orgTips.trustedCount > 0 && e.isDefaultSuppressed()) return filtered;
  let filtered_2 = candidates.filter((n) => !e.hasFailed(n.id)),
    p = e.isFirstPartyBackend() ? filtered_2 : filtered_2.filter((n) => n.providerAgnostic),
    results = await Promise.all(p.map((n) => isTipRelevant(e, n)));
  return [
    ...p
      .filter((n, U) => results[U] === !0)
      .filter((n) => e.sessionsSinceShown(n.id) >= n.cooldownSessions)
      .filter((n) => n.maxLifetimeShows === void 0 || e.lifetimeShown(n.id) < n.maxLifetimeShows),
    ...filtered,
  ];
}
/**
 * 选最久未显示的提示（相同时按优先级）。
 */
//@ chunk-0j11jfmy.js:7293-7512 placement
function pickLeastRecentTip(e, o) {
  if (o.length <= 1) return o[0];
  return o
    .map((s) => ({ tip: s, sessions: e.sessionsSinceShown(s.id) }))
    .toSorted((s, f) =>
      s.sessions === f.sessions ? (f.tip.priority ?? 0) - (s.tip.priority ?? 0) : f.sessions - s.sessions,
    )[0]?.tip;
}
//@ chunk-0j11jfmy.js:7512-7576 placement
var C = async (e, o) => (o.isEnabled ? pickLeastRecentTip(e, await pickSpinnerTip(e, o.forcedId)) : void 0);
/**
 * 选择并显示本回合的旋转提示，记录已显示。
 */
//@ chunk-0j11jfmy.js:7576-7789 placement
async function showSpinnerTip(e, o) {
  try {
    let r = await C(e, await readTipSettings(o)),
      s = r === void 0 ? "" : await loadTipContent(e, r);
    if (r === void 0 || s === "") {
      e.show(void 0);
      return;
    }
    (e.show({ text: s, label: r.label }), e.record(r.id));
  } catch (error) {
    (e.show(void 0), e.report(error, L));
  }
}
/**
 * 注册 session.start 钩子：交互式会话安装提示选择器。
 */
//@ chunk-0j11jfmy.js:7789-8033 placement
function registerTipsHooks(e, o) {
  if (o === void 0) return;
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
function z(e) {
  registerTipsHooks(e, void 0);
}
//@ chunk-0j11jfmy.js:8059-8158 placement
var se = () =>
  registerBuiltinPlugin({
    name: CC_PLUGIN_TIPS,
    description: TIPS_DESCRIPTION,
    isAvailable: g,
    hooksModule: builtinHooksModuleRef(import.meta.dir, P(c), () => TIPS_MANIFEST()),
  });
