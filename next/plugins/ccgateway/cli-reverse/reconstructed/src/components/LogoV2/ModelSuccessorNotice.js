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
  booleanSchema,
  partialRecord,
  _enum,
  numberSchema,
  stringSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  init_react_production,
  useSyncExternalStore,
  useState,
} from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { useAppStateSlice } from "../../state/AppState.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useShortcutDisplay } from "../../keybindings/useShortcutDisplay.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { deferInit } from "../../../runtime/deferred-init.js";

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
function successorNoticeViews(successor) {
  return getGlobalConfig().savedModelSuccessorShown?.[successorKey(successor)]?.views ?? 0;
}
//@ chunk-ag5x7vhf.js:76327-76498 placement
/**
 * 判断某个保存的旧模型的"有新版本"提示是否还能显示：用户没回答过、展示次数未达上限、距上次展示已过最小间隔天数。
 */
function shouldShowModelSuccessorNotice(
  successor,
  maxViews = MAX_SUCCESSOR_NOTICE_VIEWS,
  minDaysApart = SUCCESSOR_MIN_DAYS,
) {
  let globalConfig = getGlobalConfig();
  let key = successorKey(successor);
  let { views, lastShownAt } = globalConfig.savedModelSuccessorShown?.[key] ?? EMPTY_SUCCESSOR_SHOWN;
  return (
    !globalConfig.savedModelSuccessorAnswered?.[key] &&
    views < maxViews &&
    Date.now() - lastShownAt >= minDaysApart * ONE_DAY_MS_SUCCESSOR
  );
}
//@ chunk-ag5x7vhf.js:76498-76731 placement
function recordModelSuccessorShown(successor, storageV5) {
  let key = successorKey(successor);
  saveGlobalConfig((config) => {
    let entry = config.savedModelSuccessorShown?.[key] ?? EMPTY_SUCCESSOR_SHOWN;
    return Date.now() - entry.lastShownAt < SUCCESSOR_MIN_DAYS * ONE_DAY_MS_SUCCESSOR
      ? config
      : {
          ...config,
          savedModelSuccessorShown: {
            ...config.savedModelSuccessorShown,
            [key]: {
              views: entry.views + 1,
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
function markModelSuccessorAnswered(successor, storageV5) {
  saveGlobalConfig(
    (config) => ({
      ...config,
      savedModelSuccessorAnswered: {
        ...config.savedModelSuccessorAnswered,
        [successorKey(successor)]: true,
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
  let currentModel = strip1mSuffix(model);
  let modelId = parseModelId(currentModel);
  if (
    !modelId ||
    !isBaseModelKey(modelId.family) ||
    !(getCatalogEntry(currentModel) ?? catalogIdForProviderModelId(currentModel))
  )
    return;
  let familyModel = strip1mSuffix(parseUserSpecifiedModel(modelId.family));
  let modelId_2 = parseModelId(familyModel);
  if (
    modelId_2?.family !== modelId.family ||
    compareVersion(modelId_2, modelId) <= 0 ||
    !isModelKnownServedToOrg(familyModel) ||
    !isModelAllowed(familyModel) ||
    getModelUnavailabilityReason(familyModel) !== null
  )
    return;
  return {
    from: currentModel,
    to: familyModel,
    family: modelId.family,
    alias: `${modelId.family}${model.slice(currentModel.length)}`,
  };
}
//@ chunk-ag5x7vhf.js:77450-77658 placement
var SuccessorNoticeConfigSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ag5x7vhf.js:77450", () => {
  SuccessorNoticeConfigSchema = DoctorLazy(() =>
    zodStrictObject({
      off: booleanSchema().optional(),
      families: partialRecord(_enum(MODEL_KEY_NAMES), booleanSchema()).optional(),
      maxViews: numberSchema().optional(),
      minDaysApart: numberSchema().optional(),
      lead: stringSchema().optional(),
      text: stringSchema().optional(),
      action: stringSchema().optional(),
      done: stringSchema().optional(),
    }),
  );
});
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
  let successor = savedModelSuccessor();
  let config = successorNoticeConfig();
  return (
    !successor ||
    config.off === true ||
    !(config.families?.[successor.family] ?? SUCCESSOR_FAMILIES[successor.family]) ||
    !shouldShowModelSuccessorNotice(successor, config.maxViews, config.minDaysApart)
  );
}
//@ chunk-ag5x7vhf.js:77871-77875 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:77871", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:78698-78702 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:78698", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:91256-91289 placement
function mainLoopBusyWithNotice() {
  return isModelSuccessorNoticeActive() && isMainLoopBusy();
}
//@ chunk-ag5x7vhf.js:91289-91368 placement (2.1.88 match: useMainLoopModel, 1)
function useMainLoopModel(state) {
  return isModelSuccessorNoticeActive() && `${state.mainLoopModel} ${state.mainLoopModelForSession}`;
}
//@ chunk-ag5x7vhf.js:91368-91465 placement
function renderInlineCode(text, key) {
  return text.startsWith("`")
    ? jsxProd_default(
        Text,
        {
          color: "permission",
          children: text.slice(1, -1),
        },
        key,
      )
    : text;
}
//@ chunk-ag5x7vhf.js:91465-91550 placement
var SUCCESSOR_NOTICE_TEMPLATE = "{from} is your default model.";
var SUCCESSOR_KEY_HINT_TEMPLATE = "Press `{key}` to make {to} your default.";
//@ chunk-ag5x7vhf.js:91550-91604 placement
function useModelSuccessorSubscriptions() {
  useSyncExternalStore(uiSignals.mainLoopBusy.subscribe, mainLoopBusyWithNotice);
  useAppStateSlice(useMainLoopModel);
}
//@ chunk-ag5x7vhf.js:91604-92617 placement
function ModelSuccessorNotice() {
  let $ = useMemoCache(18);
  let { storageV5 } = useTheme_2();
  let [successor] = useState(savedModelSuccessor);
  let [config] = useState(successorNoticeConfig);
  let shortcutDisplay = useShortcutDisplay("chat:defaultToNewerModel", "Chat", "ctrl+y");
  let onShown;
  if ($[0] !== successor || $[1] !== storageV5) {
    onShown = () => {
      if (!successor) {
        return;
      }
      announcementState().savedModelSuccessorDrawnAt = Date.now();
      logFeatureOk("model_saved_successor_notice");
      logEvent("tengu_saved_model_successor_shown", {
        from_model: telemetrySafeModelName(successor.from),
        to_model: telemetrySafeModelName(successor.to),
        view: successorNoticeViews(successor) + 1,
      });
      recordModelSuccessorShown(successor, storageV5);
    };
    $[0] = successor;
    $[1] = storageV5;
    $[2] = onShown;
  } else onShown = $[2];
  useNoticeImpression(SAVED_MODEL_SUCCESSOR, onShown);
  if (!successor) {
    return null;
  }
  let fillTemplate;
  if ($[3] !== shortcutDisplay || $[4] !== successor.from || $[5] !== successor.to) {
    fillTemplate = (template) =>
      template
        .replaceAll("{from}", renderModelName(successor.from))
        .replaceAll("{key}", shortcutDisplay)
        .replaceAll("{to}", `\`${renderModelName(successor.to)}\``);
    $[3] = shortcutDisplay;
    $[4] = successor.from;
    $[5] = successor.to;
    $[6] = fillTemplate;
  } else fillTemplate = $[6];
  let fillTemplate_2 = fillTemplate;
  const lead = config.lead ?? SUCCESSOR_NOTICE_TEMPLATE;
  let children;
  if ($[7] !== fillTemplate_2 || $[8] !== lead) {
    children = fillTemplate_2(lead).replaceAll("`", "");
    $[7] = fillTemplate_2;
    $[8] = lead;
    $[9] = children;
  } else children = $[9];
  let leadText;
  if ($[10] !== children) {
    leadText = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[10] = children;
    $[11] = leadText;
  } else leadText = $[11];
  const text = config.text ?? SUCCESSOR_KEY_HINT_TEMPLATE;
  let hintParts;
  if ($[12] !== fillTemplate_2 || $[13] !== text) {
    hintParts = fillTemplate_2(text)
      .split(/(`[^`]+`)/)
      .map(renderInlineCode);
    $[12] = fillTemplate_2;
    $[13] = text;
    $[14] = hintParts;
  } else hintParts = $[14];
  let line;
  if ($[15] !== leadText || $[16] !== hintParts) {
    line = jsxProd_default_2(Text, {
      children: [leadText, " ", hintParts],
    });
    $[15] = leadText;
    $[16] = hintParts;
    $[17] = line;
  } else line = $[17];
  return line;
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
