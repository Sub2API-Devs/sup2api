/**
 * commands/remote-setup/pushOffer.ts
 *
 * 2.1.316 新增。remote-setup 中推送未推送提交的提议。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p8zkbd8d.js (6)
 * attribution: placement 6
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { createStore } from "../../state/store.js";
import { isUnattendedInteractiveSession } from "../../utils/concurrentSessions.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { isWebSetupEnabled } from "../../services/cloudSessions/webSetup.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { GITHUB_CONNECTION_STATUS_CACHE } from "./api.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  getGlobalConfig,
  getCurrentProjectConfig,
  saveGlobalConfig,
  saveCurrentProjectConfig,
} from "../../utils/config.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";

//@ chunk-p8zkbd8d.js:567-821 placement
/**
 * Web setup 推送优惠相关常量：模式 off/survey、最多展示 3 次、间隔 1 天，以及按宿主的 offer 状态槽与推送槽。
 */
var TENGU_REFLECTIVE_BEE = "tengu_reflective_bee";
var WEB_SETUP_OFFER_MODES = ["off", "survey"];
var MAX_WEB_SETUP_OFFER_SHOWS = 3;
var _ = 86400000;
var TENGU_WEB_SETUP_PUSH_OFFER = "tengu_web_setup_push_offer";
var WEB_SETUP_PUSH_OFFER_QUESTION =
  "Pushed to GitHub. Connect GitHub to claude.ai so you can work on this repo even when this machine is offline?";
var WEB_SETUP_PUSH_OFFER_DELAY_MS = 1000;
var WEB_SETUP_PUSH_OFFER_SLOT = new HostScoped(() =>
  createStore({
    status: "none",
  }),
);
//@ chunk-p8zkbd8d.js:821-1237 placement
/**
 * 满足条件（第一方订阅、web-setup 开启、未屏蔽、GitHub 未连接）时根据 tengu_reflective_bee 变体把推送提议置为 pending。
 */
function maybeArmWebSetupPushOffer({ trigger, host, storageV5 }) {
  let r = WEB_SETUP_PUSH_OFFER_SLOT.of(host);
  if (r.getState().status !== "none") return;
  if (isUnattendedInteractiveSession()) return;
  if (getAPIProvider() !== "firstParty" || !isClaudeAISubscriber() || !isWebSetupEnabled()) return;
  if (isRemoteSessionAvailable()) return;
  if (isPushOfferSuppressed()) return;
  if (GITHUB_CONNECTION_STATUS_CACHE.of(host).peek(undefined, storageV5) !== "not_connected") return;
  logEvent(TENGU_WEB_SETUP_PUSH_OFFER, {
    event: lit("eligible"),
    trigger: fromEnum(trigger),
  });
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_REFLECTIVE_BEE, "off");
  let found = WEB_SETUP_OFFER_MODES.find((i) => i === featureValue_CACHED_MAY_BE_STALE);
  r.setState(() =>
    found === undefined || found === "off"
      ? {
          status: "resolved",
        }
      : {
          status: "pending",
          variant: found,
          trigger,
        },
  );
}
//@ chunk-p8zkbd8d.js:1237-1443 placement
function isPushOfferSuppressed() {
  let webSetupPushOffer = getGlobalConfig().webSetupPushOffer;
  if (webSetupPushOffer?.dismissedForever) return true;
  if (getCurrentProjectConfig().webSetupPushOfferShown) return true;
  if (webSetupPushOffer?.lastShownAt !== undefined && Date.now() - webSetupPushOffer.lastShownAt < _)
    return true;
  return (webSetupPushOffer?.shownCount ?? 0) >= MAX_WEB_SETUP_OFFER_SHOWS;
}
//@ chunk-p8zkbd8d.js:1443-1629 placement
/**
 * 把会话中待处理的远程推送提议标记为已解决；未处于 pending 或仍未连接时返回 false。
 */
function resolvePendingPushOffer(host, storageV5) {
  let s = WEB_SETUP_PUSH_OFFER_SLOT.of(host);
  if (s.getState().status !== "pending") return false;
  if (
    !isPushOfferSuppressed() &&
    GITHUB_CONNECTION_STATUS_CACHE.of(host).peek(undefined, storageV5) === "not_connected"
  )
    return false;
  s.setState(() => ({
    status: "resolved",
  }));
  return true;
}
//@ chunk-p8zkbd8d.js:1629-2096 placement
/**
 * 把 pending 提议标为 shown，上报事件，并记录全局 lastShownAt/shownCount 与项目已展示标记。
 */
function markPushOfferShown(host, storageV5) {
  let s = WEB_SETUP_PUSH_OFFER_SLOT.of(host);
  let state = s.getState();
  if (state.status !== "pending") return;
  s.setState(() => ({
    ...state,
    status: "shown",
  }));
  logEvent(TENGU_WEB_SETUP_PUSH_OFFER, {
    event: lit("shown"),
    variant: fromEnum(state.variant),
    trigger: fromEnum(state.trigger),
  });
  logFeatureOk("remote_setup_push_offer");
  let now = Date.now();
  saveGlobalConfig(
    (e) =>
      e.webSetupPushOffer?.lastShownAt === now
        ? e
        : {
            ...e,
            webSetupPushOffer: {
              ...e.webSetupPushOffer,
              lastShownAt: now,
              shownCount: (e.webSetupPushOffer?.shownCount ?? 0) + 1,
            },
          },
    storageV5,
  );
  saveCurrentProjectConfig(
    (e) =>
      e.webSetupPushOfferShown
        ? e
        : {
            ...e,
            webSetupPushOfferShown: true,
          },
    storageV5,
  );
}
//@ chunk-p8zkbd8d.js:2096-2419 placement
/**
 * 用户对已展示的提议作答后置为 resolved 并上报；选 dont_ask_again 时永久关闭。
 */
function resolveShownPushOffer(host, o, storageV5) {
  let r = WEB_SETUP_PUSH_OFFER_SLOT.of(host);
  let state = r.getState();
  if (state.status !== "shown") return;
  r.setState(() => ({
    status: "resolved",
  }));
  logEvent(TENGU_WEB_SETUP_PUSH_OFFER, {
    event: fromEnum(o),
    variant: fromEnum(state.variant),
    trigger: fromEnum(state.trigger),
  });
  if (o === "dont_ask_again")
    saveGlobalConfig(
      (e) =>
        e.webSetupPushOffer?.dismissedForever
          ? e
          : {
              ...e,
              webSetupPushOffer: {
                ...e.webSetupPushOffer,
                dismissedForever: true,
              },
            },
      storageV5,
    );
}
export {
  WEB_SETUP_PUSH_OFFER_SLOT,
  resolvePendingPushOffer,
  WEB_SETUP_PUSH_OFFER_DELAY_MS,
  markPushOfferShown,
  resolveShownPushOffer,
  WEB_SETUP_PUSH_OFFER_QUESTION,
  maybeArmWebSetupPushOffer,
};
