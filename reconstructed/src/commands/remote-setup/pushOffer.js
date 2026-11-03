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
import { wt } from "../../remote/remoteMode.js";
import { ZV } from "./api.js";
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
var TENGU_REFLECTIVE_BEE = "tengu_reflective_bee",
  S = ["off", "survey"],
  d = 3,
  _ = 86400000,
  TENGU_WEB_SETUP_PUSH_OFFER = "tengu_web_setup_push_offer",
  iEo =
    "Pushed to GitHub. Connect GitHub to claude.ai so you can work on this repo even when this machine is offline?",
  aEo = 1000,
  UNt = new HostScoped(() => createStore({ status: "none" }));
/**
 * 满足条件（第一方订阅、web-setup 开启、未屏蔽、GitHub 未连接）时根据 tengu_reflective_bee 变体把推送提议置为 pending。
 */
//@ chunk-p8zkbd8d.js:821-1237 placement
function maybeArmWebSetupPushOffer({ trigger: trigger, host: host, storageV5: storageV5 }) {
  let of = UNt.of(host);
  if (of.getState().status !== "none") return;
  if (isUnattendedInteractiveSession()) return;
  if (getAPIProvider() !== "firstParty" || !isClaudeAISubscriber() || !isWebSetupEnabled()) return;
  if (wt()) return;
  if (isPushOfferSuppressed()) return;
  if (ZV.of(host).peek(void 0, storageV5) !== "not_connected") return;
  logEvent(TENGU_WEB_SETUP_PUSH_OFFER, { event: lit("eligible"), trigger: fromEnum(trigger) });
  let n = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_REFLECTIVE_BEE, "off"),
    found = S.find((i) => i === n);
  of.setState(() =>
    found === void 0 || found === "off"
      ? { status: "resolved" }
      : { status: "pending", variant: found, trigger: trigger },
  );
}
//@ chunk-p8zkbd8d.js:1237-1443 placement
function isPushOfferSuppressed() {
  let webSetupPushOffer = getGlobalConfig().webSetupPushOffer;
  if (webSetupPushOffer?.dismissedForever) return !0;
  if (getCurrentProjectConfig().webSetupPushOfferShown) return !0;
  if (webSetupPushOffer?.lastShownAt !== void 0 && Date.now() - webSetupPushOffer.lastShownAt < _) return !0;
  return (webSetupPushOffer?.shownCount ?? 0) >= d;
}
/**
 * 把会话中待处理的远程推送提议标记为已解决；未处于 pending 或仍未连接时返回 false。
 */
//@ chunk-p8zkbd8d.js:1443-1629 placement
function resolvePendingPushOffer(t, o) {
  let of = UNt.of(t);
  if (of.getState().status !== "pending") return !1;
  if (!isPushOfferSuppressed() && ZV.of(t).peek(void 0, o) === "not_connected") return !1;
  return (of.setState(() => ({ status: "resolved" })), !0);
}
/**
 * 把 pending 提议标为 shown，上报事件，并记录全局 lastShownAt/shownCount 与项目已展示标记。
 */
//@ chunk-p8zkbd8d.js:1629-2096 placement
function markPushOfferShown(t, o) {
  let of = UNt.of(t),
    state = of.getState();
  if (state.status !== "pending") return;
  (of.setState(() => ({ ...state, status: "shown" })),
    logEvent(TENGU_WEB_SETUP_PUSH_OFFER, {
      event: lit("shown"),
      variant: fromEnum(state.variant),
      trigger: fromEnum(state.trigger),
    }),
    logFeatureOk("remote_setup_push_offer"));
  let now = Date.now();
  (saveGlobalConfig(
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
    o,
  ),
    saveCurrentProjectConfig(
      (e) => (e.webSetupPushOfferShown ? e : { ...e, webSetupPushOfferShown: !0 }),
      o,
    ));
}
/**
 * 用户对已展示的提议作答后置为 resolved 并上报；选 dont_ask_again 时永久关闭。
 */
//@ chunk-p8zkbd8d.js:2096-2419 placement
function resolveShownPushOffer(t, o, s) {
  let of = UNt.of(t),
    state = of.getState();
  if (state.status !== "shown") return;
  if (
    (of.setState(() => ({ status: "resolved" })),
    logEvent(TENGU_WEB_SETUP_PUSH_OFFER, {
      event: fromEnum(o),
      variant: fromEnum(state.variant),
      trigger: fromEnum(state.trigger),
    }),
    o === "dont_ask_again")
  )
    saveGlobalConfig(
      (e) =>
        e.webSetupPushOffer?.dismissedForever
          ? e
          : { ...e, webSetupPushOffer: { ...e.webSetupPushOffer, dismissedForever: !0 } },
      s,
    );
}

export {
  UNt,
  resolvePendingPushOffer,
  aEo,
  markPushOfferShown,
  resolveShownPushOffer,
  iEo,
  maybeArmWebSetupPushOffer,
};
