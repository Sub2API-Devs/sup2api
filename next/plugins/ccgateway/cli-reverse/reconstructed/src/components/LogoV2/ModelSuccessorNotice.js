/**
 * components/LogoV2/ModelSuccessorNotice.tsx
 *
 * 2.1.316 新增：保存的旧模型有同族新版本时的提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hnxhr3bs.js (19)
 * attribution: placement 19
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useSyncExternalStore,
  useState,
} from "../../../vendor/react/cjs/react.production.js";
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
import {
  getRootSession,
  getInitialModelSettingLayer,
  getTeleportedSessionInfo,
} from "../../bootstrap/state.js";
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
  literal,
  partialRecord,
  _enum,
  numberSchema,
  stringSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { useAppStateSlice } from "../../state/AppState.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useShortcutDisplay } from "../../keybindings/useShortcutDisplay.js";
import { useShortDraftValue } from "../../screens/repl/storeHooks.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { Ratchet } from "../design-system/Ratchet.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hnxhr3bs.js:75410-75414 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:75410", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:75541-75594 placement
function isMainLoopBusy() {
  return uiSignals.mainLoopBusy.getState().busy;
}
//@ chunk-hnxhr3bs.js:75594-75730 placement
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
//@ chunk-hnxhr3bs.js:75730-75801 placement
function successorNoticeViews(successor) {
  return getGlobalConfig().savedModelSuccessorShown?.[successorKey(successor)]?.views ?? 0;
}
//@ chunk-hnxhr3bs.js:75801-75972 placement
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
//@ chunk-hnxhr3bs.js:75972-76205 placement
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
//@ chunk-hnxhr3bs.js:76205-76317 placement
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
//@ chunk-hnxhr3bs.js:76317-76379 placement
/**
 * 函数 isModelSuccessorNoticeActive（已有印象且公告槽未释放）。
 */
function isModelSuccessorNoticeActive() {
  return hasNoticeImpression(SAVED_MODEL_SUCCESSOR) && !announcementState().announcementSlotReleased;
}
//@ chunk-hnxhr3bs.js:76379-76939 placement
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
    getTeleportedSessionInfo() !== null ||
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
//@ chunk-hnxhr3bs.js:76939-77178 placement
var SuccessorNoticeConfigSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hnxhr3bs.js:76939", () => {
  SuccessorNoticeConfigSchema = DoctorLazy(() =>
    zodStrictObject({
      off: booleanSchema().optional(),
      needsCtrlYFix: literal(true).optional(),
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
//@ chunk-hnxhr3bs.js:77178-77262 placement
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
//@ chunk-hnxhr3bs.js:77262-77391 placement
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
//@ chunk-hnxhr3bs.js:77391-77395 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:77391", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:94635-94668 placement
function mainLoopBusyWithNotice() {
  return isModelSuccessorNoticeActive() && isMainLoopBusy();
}
//@ chunk-hnxhr3bs.js:94668-94747 placement (2.1.88 match: useMainLoopModel, 1)
function useMainLoopModel(state) {
  return isModelSuccessorNoticeActive() && `${state.mainLoopModel} ${state.mainLoopModelForSession}`;
}
//@ chunk-hnxhr3bs.js:94747-94848 placement
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
//@ chunk-hnxhr3bs.js:94848-94933 placement
var SUCCESSOR_NOTICE_TEMPLATE = "{from} is your default model.";
var SUCCESSOR_KEY_HINT_TEMPLATE = "Press `{key}` to make {to} your default.";
//@ chunk-hnxhr3bs.js:94933-94987 placement
function useModelSuccessorSubscriptions() {
  useSyncExternalStore(uiSignals.mainLoopBusy.subscribe, mainLoopBusyWithNotice);
  useAppStateSlice(useMainLoopModel);
}
//@ chunk-hnxhr3bs.js:94987-96198 placement
function ModelSuccessorNotice() {
  let $ = useMemoCache(22);
  let { storageV5 } = useTheme_2();
  let [successor] = useState(savedModelSuccessor);
  let [config] = useState(successorNoticeConfig);
  let shortcutDisplay = useShortcutDisplay("chat:defaultToNewerModel", "Chat", "ctrl+y");
  let isDraftEmpty = useShortDraftValue() === "";
  let isScreenReaderOrEmpty = useIsScreenReaderEnabled() || isDraftEmpty;
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
  let impressionCallback = onShown;
  let impressionOptions;
  if ($[3] !== isScreenReaderOrEmpty) {
    impressionOptions = {
      enabled: isScreenReaderOrEmpty,
    };
    $[3] = isScreenReaderOrEmpty;
    $[4] = impressionOptions;
  } else impressionOptions = $[4];
  useNoticeImpression(SAVED_MODEL_SUCCESSOR, impressionCallback, impressionOptions);
  if (!successor) {
    return null;
  }
  let fillTemplate;
  if ($[5] !== shortcutDisplay || $[6] !== successor.from || $[7] !== successor.to) {
    fillTemplate = (template) =>
      template
        .replaceAll("{from}", renderModelName(successor.from))
        .replaceAll("{key}", shortcutDisplay)
        .replaceAll("{to}", `\`${renderModelName(successor.to)}\``);
    $[5] = shortcutDisplay;
    $[6] = successor.from;
    $[7] = successor.to;
    $[8] = fillTemplate;
  } else fillTemplate = $[8];
  let fillTemplate_2 = fillTemplate;
  const lead = config.lead ?? SUCCESSOR_NOTICE_TEMPLATE;
  let children;
  if ($[9] !== fillTemplate_2 || $[10] !== lead) {
    children = fillTemplate_2(lead).replaceAll("`", "");
    $[9] = fillTemplate_2;
    $[10] = lead;
    $[11] = children;
  } else children = $[11];
  let leadText;
  if ($[12] !== children) {
    leadText = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[12] = children;
    $[13] = leadText;
  } else leadText = $[13];
  const text = config.text ?? SUCCESSOR_KEY_HINT_TEMPLATE;
  let hintParts;
  if ($[14] !== fillTemplate_2 || $[15] !== text) {
    hintParts = fillTemplate_2(text)
      .split(/(`[^`]+`)/)
      .map(renderInlineCode);
    $[14] = fillTemplate_2;
    $[15] = text;
    $[16] = hintParts;
  } else hintParts = $[16];
  let line;
  if ($[17] !== leadText || $[18] !== hintParts) {
    line = jsxProd_default_2(Text, {
      children: [leadText, " ", hintParts],
    });
    $[17] = leadText;
    $[18] = hintParts;
    $[19] = line;
  } else line = $[19];
  const children_2 = isScreenReaderOrEmpty && line;
  let keyHintRow;
  if ($[20] !== children_2) {
    keyHintRow = jsxProd_default(Ratchet, {
      children: children_2,
    });
    $[20] = children_2;
    $[21] = keyHintRow;
  } else keyHintRow = $[21];
  return keyHintRow;
}
export {
  SAVED_MODEL_SUCCESSOR,
  savedModelSuccessor,
  isModelSuccessorNoticeHidden,
  shouldShowModelSuccessorNotice,
  ModelSuccessorNotice,
  isModelSuccessorNoticeActive,
  markModelSuccessorAnswered,
  isMainLoopBusy,
  useModelSuccessorSubscriptions,
};
