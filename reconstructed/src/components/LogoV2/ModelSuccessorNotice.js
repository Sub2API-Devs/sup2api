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
import { hasNoticeImpression, useNoticeImpression } from "./CondensedLogo.js";
import { announcementState } from "../../services/announcements/announcementState.js";
import {
  isGrowthBookEnabled,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { isFirstPartyApiBackend } from "../../utils/model/providers.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { getSettingsForSource, getSettings_DEPRECATED } from "../../utils/settings/settings.js";
import { getRootSession, getInitialModelSettingLayer } from "../../bootstrap/state.js";
import {
  strip1mSuffix,
  parseModelId,
  isBaseModelKey,
  compareVersion,
  MODEL_KEY_NAMES,
} from "../../utils/model/modelIds.js";
import { is1mContextDisabled } from "../../utils/model/contextWindow1m.js";
import { isSessionRestored } from "../../utils/sessionRestore.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { getCatalogEntry, catalogIdForProviderModelId } from "../../utils/model/modelCatalog.js";
import { parseUserSpecifiedModel, renderModelName } from "../../utils/model/modelDisplay.js";
import { isModelKnownServedToOrg, isModelAllowed } from "../../utils/model/modelAllowlist.js";
import { getModelUnavailabilityReason } from "../../utils/model/classifierModel.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  M,
  partialRecord,
  _enum,
  E,
  string,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { init_react_production, yt, y } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { useAppStateSlice } from "../../state/AppState.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useShortcutDisplay } from "../../keybindings/useShortcutDisplay.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";

//@ chunk-ag5x7vhf.js:76067-76120 placement
function isMainLoopBusy() {
  return uiSignals.mainLoopBusy.getState().busy;
}
//@ chunk-ag5x7vhf.js:76120-76256 placement
var SUCCESSOR_FAMILIES = {
  sonnet: true,
  opus: true,
  haiku: false,
  fable: false,
};
var SAVED_MODEL_SUCCESSOR = "saved-model-successor";
var MAX_SUCCESSOR_NOTICE_VIEWS = 2;
var SUCCESSOR_MIN_DAYS = 7;
var ONE_DAY_MS_SUCCESSOR = 86400000;
var successorKey = ({ to }) => to;
var EMPTY_SUCCESSOR_SHOWN = {
  views: 0,
  lastShownAt: 0,
};
//@ chunk-ag5x7vhf.js:76256-76327 placement
function successorNoticeViews(m) {
  return getGlobalConfig().savedModelSuccessorShown?.[successorKey(m)]?.views ?? 0;
}
//@ chunk-ag5x7vhf.js:76327-76498 placement
/**
 * 判断某个保存的旧模型的"有新版本"提示是否还能显示：用户没回答过、展示次数未达上限、距上次展示已过最小间隔天数。
 */
function shouldShowModelSuccessorNotice(
  m,
  maxViews = MAX_SUCCESSOR_NOTICE_VIEWS,
  minDaysApart = SUCCESSOR_MIN_DAYS,
) {
  let globalConfig = getGlobalConfig();
  let k = successorKey(m);
  let { views, lastShownAt } = globalConfig.savedModelSuccessorShown?.[k] ?? EMPTY_SUCCESSOR_SHOWN;
  return (
    !globalConfig.savedModelSuccessorAnswered?.[k] &&
    views < maxViews &&
    Date.now() - lastShownAt >= minDaysApart * ONE_DAY_MS_SUCCESSOR
  );
}
//@ chunk-ag5x7vhf.js:76498-76731 placement
function recordModelSuccessorShown(m, storageV5) {
  let x = successorKey(m);
  saveGlobalConfig((T) => {
    let k = T.savedModelSuccessorShown?.[x] ?? EMPTY_SUCCESSOR_SHOWN;
    return Date.now() - k.lastShownAt < SUCCESSOR_MIN_DAYS * ONE_DAY_MS_SUCCESSOR
      ? T
      : {
          ...T,
          savedModelSuccessorShown: {
            ...T.savedModelSuccessorShown,
            [x]: {
              views: k.views + 1,
              lastShownAt: Date.now(),
            },
          },
        };
  }, storageV5);
}
//@ chunk-ag5x7vhf.js:76731-76843 placement
/**
 * 在全局配置里记下用户已回应过某模型的"有新版本"提示，以后不再显示。
 */
function markModelSuccessorAnswered(m, storageV5) {
  saveGlobalConfig(
    (x) => ({
      ...x,
      savedModelSuccessorAnswered: {
        ...x.savedModelSuccessorAnswered,
        [successorKey(m)]: true,
      },
    }),
    storageV5,
  );
}
//@ chunk-ag5x7vhf.js:76843-76905 placement
/**
 * 函数 isModelSuccessorNoticeActive（已有印象且公告槽未释放）。
 */
function isModelSuccessorNoticeActive() {
  return hasNoticeImpression(SAVED_MODEL_SUCCESSOR) && !announcementState().announcementSlotReleased;
}
//@ chunk-ag5x7vhf.js:76905-77450 placement
/**
 * 用户设置里保存的旧模型若有更新的同族模型（saved-model-successor），返回 {from, to, family}。
 */
function savedModelSuccessor() {
  if (!isGrowthBookEnabled() || !isFirstPartyApiBackend() || isRemoteSessionAvailable()) return;
  let model = getSettingsForSource("userSettings")?.model;
  let settings_DEPRECATED = getSettings_DEPRECATED();
  let rootSession = getRootSession();
  if (
    !model ||
    isMainLoopBusy() ||
    rootSession.requestJournal.mainThreadRequestedInProcess() ||
    settings_DEPRECATED?.availableModels ||
    settings_DEPRECATED?.fastMode === true ||
    settings_DEPRECATED?.alwaysThinkingEnabled === false ||
    (model !== strip1mSuffix(model) && is1mContextDisabled()) ||
    getInitialModelSettingLayer() !== "user_settings" ||
    isSessionRestored(rootSession.host) ||
    strip1mSuffix(getMainLoopModel()) !== strip1mSuffix(model)
  )
    return;
  let T = strip1mSuffix(model);
  let modelId = parseModelId(T);
  if (!modelId || !isBaseModelKey(modelId.family) || !(getCatalogEntry(T) ?? catalogIdForProviderModelId(T)))
    return;
  let _ = strip1mSuffix(parseUserSpecifiedModel(modelId.family));
  let modelId_2 = parseModelId(_);
  if (
    modelId_2?.family !== modelId.family ||
    compareVersion(modelId_2, modelId) <= 0 ||
    !isModelKnownServedToOrg(_) ||
    !isModelAllowed(_) ||
    getModelUnavailabilityReason(_) !== null
  )
    return;
  return {
    from: T,
    to: _,
    family: modelId.family,
    alias: `${modelId.family}${model.slice(T.length)}`,
  };
}
//@ chunk-ag5x7vhf.js:77450-77658 placement
var SuccessorNoticeConfigSchema = DoctorLazy(() =>
  zodStrictObject({
    off: M().optional(),
    families: partialRecord(_enum(MODEL_KEY_NAMES), M()).optional(),
    maxViews: E().optional(),
    minDaysApart: E().optional(),
    lead: string().optional(),
    text: string().optional(),
    action: string().optional(),
    done: string().optional(),
  }),
);
//@ chunk-ag5x7vhf.js:77658-77742 placement
function successorNoticeConfig() {
  return (
    SuccessorNoticeConfigSchema().safeParse(
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_fern_plover", {
        off: true,
      }),
    ).data ?? {
      off: true,
    }
  );
}
//@ chunk-ag5x7vhf.js:77742-77871 placement
/**
 * 判断是否不显示"模型有新版本"提示：没有保存的旧模型、配置关闭、该模型族未启用，或展示频率已达上限。
 */
function isModelSuccessorNoticeHidden() {
  let m = savedModelSuccessor();
  let h = successorNoticeConfig();
  return (
    !m ||
    h.off === true ||
    !(h.families?.[m.family] ?? SUCCESSOR_FAMILIES[m.family]) ||
    !shouldShowModelSuccessorNotice(m, h.maxViews, h.minDaysApart)
  );
}
//@ chunk-ag5x7vhf.js:77871-77875 placement
init_react_production();
//@ chunk-ag5x7vhf.js:78698-78702 placement
init_react_production();
//@ chunk-ag5x7vhf.js:91256-91289 placement
function mainLoopBusyWithNotice() {
  return isModelSuccessorNoticeActive() && isMainLoopBusy();
}
//@ chunk-ag5x7vhf.js:91289-91368 placement = useMainLoopModel (1)
function useMainLoopModel(m) {
  return isModelSuccessorNoticeActive() && `${m.mainLoopModel} ${m.mainLoopModelForSession}`;
}
//@ chunk-ag5x7vhf.js:91368-91465 placement
function renderInlineCode(Y, pe) {
  return Y.startsWith("`")
    ? jsxProd_default(
        Text,
        {
          color: "permission",
          children: Y.slice(1, -1),
        },
        pe,
      )
    : Y;
}
//@ chunk-ag5x7vhf.js:91465-91550 placement
var SUCCESSOR_NOTICE_TEMPLATE = "{from} is your default model.";
var SUCCESSOR_KEY_HINT_TEMPLATE = "Press `{key}` to make {to} your default.";
//@ chunk-ag5x7vhf.js:91550-91604 placement
function useModelSuccessorSubscriptions() {
  yt(uiSignals.mainLoopBusy.subscribe, mainLoopBusyWithNotice);
  useAppStateSlice(useMainLoopModel);
}
//@ chunk-ag5x7vhf.js:91604-92617 placement
function ModelSuccessorNotice() {
  let k = w(18);
  let { storageV5 } = useTheme_2();
  let [h] = y(savedModelSuccessor);
  let [x] = y(successorNoticeConfig);
  let shortcutDisplay = useShortcutDisplay("chat:defaultToNewerModel", "Chat", "ctrl+y");
  let _;
  if (k[0] !== h || k[1] !== storageV5) {
    _ = () => {
      if (!h) {
        return;
      }
      announcementState().savedModelSuccessorDrawnAt = Date.now();
      logFeatureOk("model_saved_successor_notice");
      logEvent("tengu_saved_model_successor_shown", {
        from_model: telemetrySafeModelName(h.from),
        to_model: telemetrySafeModelName(h.to),
        view: successorNoticeViews(h) + 1,
      });
      recordModelSuccessorShown(h, storageV5);
    };
    k[0] = h;
    k[1] = storageV5;
    k[2] = _;
  } else _ = k[2];
  useNoticeImpression(SAVED_MODEL_SUCCESSOR, _);
  if (!h) {
    return null;
  }
  let I;
  if (k[3] !== shortcutDisplay || k[4] !== h.from || k[5] !== h.to) {
    I = (D) =>
      D.replaceAll("{from}", renderModelName(h.from))
        .replaceAll("{key}", shortcutDisplay)
        .replaceAll("{to}", `\`${renderModelName(h.to)}\``);
    k[3] = shortcutDisplay;
    k[4] = h.from;
    k[5] = h.to;
    k[6] = I;
  } else I = k[6];
  let A = I;
  const lead = x.lead ?? SUCCESSOR_NOTICE_TEMPLATE;
  let children;
  if (k[7] !== A || k[8] !== lead) {
    children = A(lead).replaceAll("`", "");
    k[7] = A;
    k[8] = lead;
    k[9] = children;
  } else children = k[9];
  let W;
  if (k[10] !== children) {
    W = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    k[10] = children;
    k[11] = W;
  } else W = k[11];
  const text = x.text ?? SUCCESSOR_KEY_HINT_TEMPLATE;
  let K;
  if (k[12] !== A || k[13] !== text) {
    K = A(text)
      .split(/(`[^`]+`)/)
      .map(renderInlineCode);
    k[12] = A;
    k[13] = text;
    k[14] = K;
  } else K = k[14];
  let q;
  if (k[15] !== W || k[16] !== K) {
    q = jsxProd_default_2(Text, {
      children: [W, " ", K],
    });
    k[15] = W;
    k[16] = K;
    k[17] = q;
  } else q = k[17];
  return q;
}
export {
  SAVED_MODEL_SUCCESSOR,
  savedModelSuccessor,
  isModelSuccessorNoticeHidden,
  shouldShowModelSuccessorNotice,
  ModelSuccessorNotice,
  isModelSuccessorNoticeActive,
  markModelSuccessorAnswered,
  useModelSuccessorSubscriptions,
  isMainLoopBusy,
};
