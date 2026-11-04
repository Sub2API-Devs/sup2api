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
import { __commonJS, __export } from "../../../../runtime/bun-runtime.js";
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
var TIPS_MANIFEST = __commonJS(function (requireFn, moduleObject) {
  moduleObject.exports = {
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
__export(EMPTY_HOOKS_TIPS, {
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
__export(TIPS_HOOK_MODULE, {
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
var toTipRecord = (tip, context) => ({
  id: tip.id,
  cooldownSessions: tip.cooldownSessions,
  ...(tip.maxLifetimeShows !== undefined && {
    maxLifetimeShows: tip.maxLifetimeShows,
  }),
  ...(tip.priority !== undefined && {
    priority: tip.priority,
  }),
  ...(tip.label !== undefined && {
    label: tip.label,
  }),
  ...(tip.advertisedCommand !== undefined && {
    advertisedCommand: tip.advertisedCommand,
  }),
  providerAgnostic: tip.providerAgnostic === true,
  isRelevant: () => tip.isRelevant(context),
  content: () =>
    tip.content({
      session: context.session,
      theme: context.theme,
      storageV5: context.storageV5,
    }),
});
//@ chunk-0j11jfmy.js:4804-5654 placement
/**
 * 在 session.start 注册 Spinner 提示（CLAUDE_CODE_FORCE_TIP_ID 强制显示）。
 */
function registerSpinnerTips(session, hooks) {
  let tipContext = hooks.context();
  let storageV5 = hooks.storageV5();
  let tipById = new Map();
  function remember(tips) {
    for (let tip of tips) tipById.set(tip.id, tip);
    return tips;
  }
  return {
    candidates: async () => {
      let { getBuiltInTips, tipSessionCaches } = loadTipRegistryModule();
      return remember([
        ...getBuiltInTips(),
        ...(await tipSessionCaches.of(session).getMarketplacePluginTips(tipContext.storageV5)),
      ]).map((tip) => toTipRecord(tip, tipContext));
    },
    orgTips: async () => {
      let { tips, trustedCount } = await loadCustomTips(session);
      return {
        tips: remember(tips).map((tip) => toTipRecord(tip, tipContext)),
        trustedCount,
      };
    },
    isDefaultSuppressed: () => excludesDefaultTips(),
    isFirstPartyBackend: () => isFirstPartyApiBackend(),
    isCommandOffered: (command) => loadTipRegistryModule().advertisedCommandIsOffered(command),
    sessionsSinceShown: (tipId) => getSessionsSinceTipShown(tipId),
    lifetimeShown: (tipId) => tipLifetimeShownCount(tipId),
    hasFailed: (tipId) => loadTipRegistryModule().tipSessionCaches.of(session).failedTipIds.has(tipId),
    markFailed: (tipId) => {
      loadTipRegistryModule().tipSessionCaches.of(session).failedTipIds.add(tipId);
    },
    show: (tipId) => {
      hooks.show(tipId);
    },
    record: (tipId) => {
      let tip = tipById.get(tipId);
      if (tip !== undefined) {
        logForDebugging(`tips plugin: showing spinner tip ${tipId}`);
        recordShownTip(tip, "spinner", storageV5);
      }
    },
    report: (error, message) => {
      logError(withTelemetryMessage(toError(error), message));
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
    install: (onSeat) => {
      tipSeatSlots.of(host).install((slot) => {
        onSeat(registerSpinnerTips(host, slot));
      });
    },
  };
}
//@ chunk-0j11jfmy.js:5742-5796 placement
/**
 * 包一层 register
 */
var tipsHooksModule = (host) => ({
  register: (on) => {
    host.registerHooks(on, spinnerTipHost());
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
async function loadTipContent(session, tip) {
  try {
    return await tip.content();
  } catch (error) {
    session.markFailed(tip.id);
    session.report(error, ERR_TIP_CONTENT);
    return "";
  }
}
//@ chunk-0j11jfmy.js:6217-6350 placement
/**
 * 提示是否适用（广告的命令可用且 isRelevant 为真），失败视为不适用。
 */
async function isTipRelevant(host, tip) {
  if (!(await isAdvertisedCommandOffered(host, tip))) return false;
  try {
    return await tip.isRelevant();
  } catch (error) {
    host.markFailed(tip.id);
    host.report(error, ERR_IS_RELEVANT);
    return false;
  }
}
//@ chunk-0j11jfmy.js:6350-6523 placement
/**
 * 提示引用的命令是否可用。
 */
async function isAdvertisedCommandOffered(host, tip) {
  if (tip.advertisedCommand === undefined) return true;
  try {
    return await host.isCommandOffered(tip.advertisedCommand);
  } catch (error) {
    host.markFailed(tip.id);
    host.report(error, ERR_ADVERTISED_COMMAND);
    return false;
  }
}
//@ chunk-0j11jfmy.js:6523-6703 placement
/**
 * 读取提示开关与（内部用户）强制提示 id。
 */
async function readTipSettings(host) {
  let settings = await host.settings();
  let forcedId = (await host.userType()) === cleanMessagesForLogging_2 ? await host.forcedTipId() : undefined;
  return {
    isEnabled: settings.spinnerTipsEnabled !== false,
    forcedId: forcedId === undefined || forcedId === "" ? undefined : forcedId,
  };
}
//@ chunk-0j11jfmy.js:6703-7293 placement
async function pickSpinnerTip(host, forcedId) {
  let candidates = await host.candidates();
  let forced = forcedId === undefined ? undefined : candidates.find((tip) => tip.id === forcedId);
  if (forced !== undefined) return [forced];
  let org = await host.orgTips();
  let filtered = org.tips.filter((tip) => host.sessionsSinceShown(tip.id) >= tip.cooldownSessions);
  if (org.trustedCount > 0 && host.isDefaultSuppressed()) return filtered;
  let filtered_2 = candidates.filter((tip) => !host.hasFailed(tip.id));
  let eligible = host.isFirstPartyBackend() ? filtered_2 : filtered_2.filter((tip) => tip.providerAgnostic);
  let results = await Promise.all(eligible.map((tip) => isTipRelevant(host, tip)));
  return [
    ...eligible
      .filter((tip, index) => results[index] === true)
      .filter((tip) => host.sessionsSinceShown(tip.id) >= tip.cooldownSessions)
      .filter(
        (tip) => tip.maxLifetimeShows === undefined || host.lifetimeShown(tip.id) < tip.maxLifetimeShows,
      ),
    ...filtered,
  ];
}
//@ chunk-0j11jfmy.js:7293-7512 placement
/**
 * 选最久未显示的提示（相同时按优先级）。
 */
function pickLeastRecentTip(host, tips) {
  if (tips.length <= 1) return tips[0];
  return tips
    .map((tip) => ({
      tip,
      sessions: host.sessionsSinceShown(tip.id),
    }))
    .toSorted((a, b) =>
      a.sessions === b.sessions ? (b.tip.priority ?? 0) - (a.tip.priority ?? 0) : b.sessions - a.sessions,
    )[0]?.tip;
}
//@ chunk-0j11jfmy.js:7512-7576 placement
/**
 * 选本回合提示
 */
var pickTurnTip = async (host, tipSettings) =>
  tipSettings.isEnabled
    ? pickLeastRecentTip(host, await pickSpinnerTip(host, tipSettings.forcedId))
    : undefined;
//@ chunk-0j11jfmy.js:7576-7789 placement
/**
 * 选择并显示本回合的旋转提示，记录已显示。
 */
async function showSpinnerTip(spinner, ctx) {
  try {
    let tip = await pickTurnTip(spinner, await readTipSettings(ctx));
    let text = tip === undefined ? "" : await loadTipContent(spinner, tip);
    if (tip === undefined || text === "") {
      spinner.show(undefined);
      return;
    }
    spinner.show({
      text,
      label: tip.label,
    });
    spinner.record(tip.id);
  } catch (error) {
    spinner.show(undefined);
    spinner.report(error, ERR_SPINNER_TIP);
  }
}
//@ chunk-0j11jfmy.js:7789-8033 placement
/**
 * 注册 session.start 钩子：交互式会话安装提示选择器。
 */
function registerTipsHooks(register, plugin) {
  if (plugin === undefined) return;
  register("session.start", (ctx, turn, proceed) => {
    if (turn.isInteractive)
      plugin.install((spinner) => {
        showSpinnerTip(spinner, {
          settings: () => ctx.settings.read(),
          userType: () => ctx.env.get("USER_TYPE"),
          forcedTipId: () => ctx.env.get("CLAUDE_CODE_FORCE_TIP_ID"),
        });
      });
    return proceed(turn);
  });
}
//@ chunk-0j11jfmy.js:8033-8059 placement
/**
 * 注册提示钩子
 */
function registerTipsHooksOnce(register) {
  registerTipsHooks(register, undefined);
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
export {
  TIPS_DESCRIPTION,
  EMPTY_HOOKS_TIPS,
  tipsHooksModule,
  registerSpinnerTips,
  isTipsModOn,
  TIPS_DEFAULT_OFF,
  registerTipsPlugin,
  toTipRecord,
  spinnerTipHost,
};
