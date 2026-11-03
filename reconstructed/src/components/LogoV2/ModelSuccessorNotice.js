/**
 * components/LogoV2/ModelSuccessorNotice.tsx
 *
 * 2.1.316 新增：保存的旧模型有同族新版本时的提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (19)
 * attribution: placement 19
 */
import { uiSignals } from "../../state/uiSignals.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { hasNoticeImpression, at } from "./CondensedLogo.js";
import { announcementState } from "../../services/announcements/announcementState.js";
import {
  isGrowthBookEnabled,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { isFirstPartyApiBackend } from "../../utils/model/providers.js";
import { wt } from "../../remote/remoteMode.js";
import { getSettingsForSource, getSettings_DEPRECATED } from "../../utils/settings/settings.js";
import { getRootSession, getInitialModelSettingLayer } from "../../bootstrap/state.js";
import { Lt, parseModelId, I_, K3e, v8 } from "../../utils/model/modelIds.js";
import { is1mContextDisabled } from "../../utils/model/contextWindow1m.js";
import { Xj } from "../../utils/sessionRestore.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { getCatalogEntry, catalogIdForProviderModelId } from "../../utils/model/modelCatalog.js";
import { parseUserSpecifiedModel, renderModelName } from "../../utils/model/modelDisplay.js";
import { isModelKnownServedToOrg, isModelAllowed } from "../../utils/model/modelAllowlist.js";
import { getModelUnavailabilityReason } from "../../utils/model/classifierModel.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, M, Hve, U, E, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { j, yt, y } from "../../../vendor/react/cjs/react.production.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { rs } from "../../state/AppState.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Me } from "../design-system/ThemeProvider.js";
import { useShortcutDisplay } from "../../keybindings/useShortcutDisplay.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";

//@ chunk-ag5x7vhf.js:76067-76120 placement
function isMainLoopBusy() {
  return uiSignals.mainLoopBusy.getState().busy;
}
//@ chunk-ag5x7vhf.js:76120-76256 placement
var SUCCESSOR_FAMILIES = { sonnet: !0, opus: !0, haiku: !1, fable: !1 },
  SAVED_MODEL_SUCCESSOR = "saved-model-successor",
  P_ = 2,
  Db = 7,
  Nb = 86400000,
  dl = ({ to: to }) => to,
  Pb = { views: 0, lastShownAt: 0 };
//@ chunk-ag5x7vhf.js:76256-76327 placement
function successorNoticeViews(m) {
  return getGlobalConfig().savedModelSuccessorShown?.[dl(m)]?.views ?? 0;
}
/**
 * 判断某个保存的旧模型的"有新版本"提示是否还能显示：用户没回答过、展示次数未达上限、距上次展示已过最小间隔天数。
 */
//@ chunk-ag5x7vhf.js:76327-76498 placement
function shouldShowModelSuccessorNotice(m, h = P_, x = Db) {
  let T = getGlobalConfig(),
    k = dl(m),
    { views: views, lastShownAt: lastShownAt } = T.savedModelSuccessorShown?.[k] ?? Pb;
  return !T.savedModelSuccessorAnswered?.[k] && views < h && Date.now() - lastShownAt >= x * Nb;
}
//@ chunk-ag5x7vhf.js:76498-76731 placement
function recordModelSuccessorShown(m, h) {
  let x = dl(m);
  saveGlobalConfig((T) => {
    let k = T.savedModelSuccessorShown?.[x] ?? Pb;
    return Date.now() - k.lastShownAt < Db * Nb
      ? T
      : {
          ...T,
          savedModelSuccessorShown: {
            ...T.savedModelSuccessorShown,
            [x]: { views: k.views + 1, lastShownAt: Date.now() },
          },
        };
  }, h);
}
/**
 * 在全局配置里记下用户已回应过某模型的"有新版本"提示，以后不再显示。
 */
//@ chunk-ag5x7vhf.js:76731-76843 placement
function markModelSuccessorAnswered(m, h) {
  saveGlobalConfig(
    (x) => ({ ...x, savedModelSuccessorAnswered: { ...x.savedModelSuccessorAnswered, [dl(m)]: !0 } }),
    h,
  );
}
//@ chunk-ag5x7vhf.js:76843-76905 placement
function EHt() {
  return hasNoticeImpression(SAVED_MODEL_SUCCESSOR) && !announcementState().announcementSlotReleased;
}
/**
 * 用户设置里保存的旧模型若有更新的同族模型（saved-model-successor），返回 {from, to, family}。
 */
//@ chunk-ag5x7vhf.js:76905-77450 placement
function savedModelSuccessor() {
  if (!isGrowthBookEnabled() || !isFirstPartyApiBackend() || wt()) return;
  let m = getSettingsForSource("userSettings")?.model,
    h = getSettings_DEPRECATED(),
    x = getRootSession();
  if (
    !m ||
    isMainLoopBusy() ||
    x.requestJournal.mainThreadRequestedInProcess() ||
    h?.availableModels ||
    h?.fastMode === !0 ||
    h?.alwaysThinkingEnabled === !1 ||
    (m !== Lt(m) && is1mContextDisabled()) ||
    getInitialModelSettingLayer() !== "user_settings" ||
    Xj(x.host) ||
    Lt(getMainLoopModel()) !== Lt(m)
  )
    return;
  let T = Lt(m),
    k = parseModelId(T);
  if (!k || !I_(k.family) || !(getCatalogEntry(T) ?? catalogIdForProviderModelId(T))) return;
  let _ = Lt(parseUserSpecifiedModel(k.family)),
    I = parseModelId(_);
  if (
    I?.family !== k.family ||
    K3e(I, k) <= 0 ||
    !isModelKnownServedToOrg(_) ||
    !isModelAllowed(_) ||
    getModelUnavailabilityReason(_) !== null
  )
    return;
  return { from: T, to: _, family: k.family, alias: `${k.family}${m.slice(T.length)}` };
}
//@ chunk-ag5x7vhf.js:77450-77658 placement
var SuccessorNoticeConfigSchema = DoctorLazy(() =>
  zodStrictObject({
    off: M().optional(),
    families: Hve(U(v8), M()).optional(),
    maxViews: E().optional(),
    minDaysApart: E().optional(),
    lead: o().optional(),
    text: o().optional(),
    action: o().optional(),
    done: o().optional(),
  }),
);
//@ chunk-ag5x7vhf.js:77658-77742 placement
function successorNoticeConfig() {
  return (
    SuccessorNoticeConfigSchema().safeParse(
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_fern_plover", { off: !0 }),
    ).data ?? { off: !0 }
  );
}
/**
 * 判断是否不显示"模型有新版本"提示：没有保存的旧模型、配置关闭、该模型族未启用，或展示频率已达上限。
 */
//@ chunk-ag5x7vhf.js:77742-77871 placement
function isModelSuccessorNoticeHidden() {
  let m = savedModelSuccessor(),
    h = successorNoticeConfig();
  return (
    !m ||
    h.off === !0 ||
    !(h.families?.[m.family] ?? SUCCESSOR_FAMILIES[m.family]) ||
    !shouldShowModelSuccessorNotice(m, h.maxViews, h.minDaysApart)
  );
}
//@ chunk-ag5x7vhf.js:77871-77875 placement
j();
//@ chunk-ag5x7vhf.js:78698-78702 placement
j();
//@ chunk-ag5x7vhf.js:91256-91289 placement
function E0() {
  return EHt() && isMainLoopBusy();
}
//@ chunk-ag5x7vhf.js:91289-91368 placement = useMainLoopModel (1)
function useMainLoopModel(m) {
  return EHt() && `${m.mainLoopModel} ${m.mainLoopModelForSession}`;
}
//@ chunk-ag5x7vhf.js:91368-91465 placement
function A0(Y, pe) {
  return Y.startsWith("`") ? e(Text, { color: "permission", children: Y.slice(1, -1) }, pe) : Y;
}
//@ chunk-ag5x7vhf.js:91465-91550 placement
var SUCCESSOR_NOTICE_TEMPLATE = "{from} is your default model.",
  SS = "Press `{key}` to make {to} your default.";
//@ chunk-ag5x7vhf.js:91550-91604 placement
function Ml() {
  (yt(uiSignals.mainLoopBusy.subscribe, E0), rs(useMainLoopModel));
}
//@ chunk-ag5x7vhf.js:91604-92617 placement
function ModelSuccessorNotice() {
  let k = w(18),
    { storageV5: storageV5 } = Me(),
    [h] = y(savedModelSuccessor),
    [x] = y(successorNoticeConfig),
    T = useShortcutDisplay("chat:defaultToNewerModel", "Chat", "ctrl+y"),
    _;
  if (k[0] !== h || k[1] !== storageV5)
    ((_ = () => {
      if (!h) {
        return;
      }
      ((announcementState().savedModelSuccessorDrawnAt = Date.now()),
        logFeatureOk("model_saved_successor_notice"),
        logEvent("tengu_saved_model_successor_shown", {
          from_model: telemetrySafeModelName(h.from),
          to_model: telemetrySafeModelName(h.to),
          view: successorNoticeViews(h) + 1,
        }),
        recordModelSuccessorShown(h, storageV5));
    }),
      (k[0] = h),
      (k[1] = storageV5),
      (k[2] = _));
  else _ = k[2];
  if ((at(SAVED_MODEL_SUCCESSOR, _), !h)) {
    return null;
  }
  let I;
  if (k[3] !== T || k[4] !== h.from || k[5] !== h.to)
    ((I = (D) =>
      D.replaceAll("{from}", renderModelName(h.from))
        .replaceAll("{key}", T)
        .replaceAll("{to}", `\`${renderModelName(h.to)}\``)),
      (k[3] = T),
      (k[4] = h.from),
      (k[5] = h.to),
      (k[6] = I));
  else I = k[6];
  let A = I;
  const L = x.lead ?? SUCCESSOR_NOTICE_TEMPLATE;
  let V;
  if (k[7] !== A || k[8] !== L) ((V = A(L).replaceAll("`", "")), (k[7] = A), (k[8] = L), (k[9] = V));
  else V = k[9];
  let W;
  if (k[10] !== V) ((W = e(Text, { dimColor: !0, children: V })), (k[10] = V), (k[11] = W));
  else W = k[11];
  const z = x.text ?? SS;
  let K;
  if (k[12] !== A || k[13] !== z)
    ((K = A(z)
      .split(/(`[^`]+`)/)
      .map(A0)),
      (k[12] = A),
      (k[13] = z),
      (k[14] = K));
  else K = k[14];
  let q;
  if (k[15] !== W || k[16] !== K)
    ((q = r(Text, { children: [W, " ", K] })), (k[15] = W), (k[16] = K), (k[17] = q));
  else q = k[17];
  return q;
}

export {
  SAVED_MODEL_SUCCESSOR,
  savedModelSuccessor,
  isModelSuccessorNoticeHidden,
  shouldShowModelSuccessorNotice,
  ModelSuccessorNotice,
  EHt,
  markModelSuccessorAnswered,
  Ml,
  isMainLoopBusy,
};
