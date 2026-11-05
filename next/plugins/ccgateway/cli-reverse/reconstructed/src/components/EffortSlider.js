/**
 * components/EffortSlider.tsx
 *
 * 2.1.316 新增：/effort 交互滑块（low…max、Ultracode 开关、仅本会话）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n2cdp9nk.js (40)
 * attribution: placement 39, sole-consumer 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useRef,
  useState,
  useEffect,
  fragmentTypeExport,
} from "../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import {
  applyEffortCommand,
  ApplyEffortAndClose,
  isUltracodeToggleAvailable,
  shouldSaveEffortDefault,
  ULTRACODE_DESCRIPTION,
} from "../commands/effort/effort.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useQueuedMessageText } from "../context/QueuedMessageContext.js";
import { useAppState, useSetAppState } from "../state/AppState.js";
import { useMainLoopModel } from "../hooks/useMainLoopModel.js";
import {
  parseEffortArg,
  effortValueToString,
  effortCostRatio,
  getDefaultEffortLevel,
  modelSupportsMaxEffort,
  getOrgDefaultEffort,
  getEffortCap,
  EFFORT_LEVELS,
  hasEffortLevelsAboveCap,
  getOrgOverriddenEffort,
  getEffortEnvOverride,
  getAppliedEffortLevel,
  isSpecialEffortKeywordDisabled,
  isEffortUnset,
  isUltracodeAvailable,
  getEffortLevelDescription,
} from "../utils/effort.js";
import { shouldShowEffortNotice } from "./PromptInput/promptInputState.js";
import { isMainThreadSource } from "../utils/querySource.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { ModelEffortSwitchConfirm } from "./ModelEffortSwitchConfirm.js";
import { isEffortCostShown } from "../utils/modelCost.js";
import { MAX_EFFORT_DESCRIPTION } from "../utils/settings/permissionRuleCarveOut.js";
import { formatCostMultiplier } from "./EffortMediumNudgeDialog.js";
import { usePrefersReducedMotion, SPINNER_FLAG_PRIORITY } from "./Spinner/spinnerFlags.js";
import { useAnimationFrame } from "../ink/components/Input.js";
import { getRainbowColor } from "../utils/thinking.js";
import { ULTRACODE_HIGHLIGHT_COLOR } from "./EffortIndicator.js";
import { getRemoteCaps } from "../remote/remoteMode.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useShortcutDisplay } from "../keybindings/useKeybindingDisplay.js";
import { stableEmptyObject } from "../utils/stableEmptyObject.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { formatShortcutHint, KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { useGlobalExitKeybindings } from "../keybindings/useKeybinding.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../keybindings/useShortcutDisplay.js";
import { repeatString } from "../utils/stringUtils.js";
import { isMaxEffortReminderEnabled } from "../utils/permissions/permissionSetup.js";
import { Title } from "./design-system/Title.js";
import { WARNING_GLYPH } from "../constants/figures.js";
import { Byline } from "./design-system/Byline.js";
import { Pane } from "./design-system/Pane.js";
import { Select } from "./CustomSelect/selectTypeahead.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-n2cdp9nk.js:15373-15377 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-n2cdp9nk.js:15373", () => {
  init_react_production();
});
//@ chunk-n2cdp9nk.js:15377-15381 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-n2cdp9nk.js:15377", () => {
  init_react_production();
});
//@ chunk-n2cdp9nk.js:15381-15412 placement
function arrayLength(list) {
  return list.length;
}
//@ chunk-n2cdp9nk.js:15412-15500 placement
function renderSelectedBar(bar, key) {
  return bar.startsWith("\u2587")
    ? jsxProd_default(
        Text,
        {
          color: "permission",
          children: bar,
        },
        key,
      )
    : bar;
}
//@ chunk-n2cdp9nk.js:15500-15534 placement
function selectUltracode(state) {
  return state.ultracode;
}
//@ chunk-n2cdp9nk.js:15534-15568 placement
function selectUltracode_2(state) {
  return state.ultracode;
}
//@ chunk-n2cdp9nk.js:15568-15621 placement
function selectCacheMissAck(state) {
  return state.cacheMissAckedAtOutputTokens;
}
//@ chunk-n2cdp9nk.js:15621-15672 placement
function selectMode(state) {
  return state.toolPermissionContext.mode;
}
//@ chunk-n2cdp9nk.js:15672-15727 placement
function selectCacheMissAck_2(state) {
  return state.cacheMissAckedAtOutputTokens;
}
//@ chunk-n2cdp9nk.js:15727-15780 placement
function selectMode_2(state) {
  return state.toolPermissionContext.mode;
}
//@ chunk-n2cdp9nk.js:15780-15816 placement
function selectUltracode_3(state) {
  return state.ultracode;
}
//@ chunk-n2cdp9nk.js:15816-15839 placement
function returnFalse() {
  return false;
}
//@ chunk-n2cdp9nk.js:15839-15865 placement
function not(value) {
  return !value;
}
//@ chunk-n2cdp9nk.js:15865-15920 placement
function selectCacheMissAck_3(state) {
  return state.cacheMissAckedAtOutputTokens;
}
//@ chunk-n2cdp9nk.js:15920-15973 placement
function selectMode_3(state) {
  return state.toolPermissionContext.mode;
}
//@ chunk-n2cdp9nk.js:15973-16009 placement
function selectUltracode_4(state) {
  return state.ultracode;
}
//@ chunk-n2cdp9nk.js:16009-16032 placement
function returnFalse_2() {
  return false;
}
//@ chunk-n2cdp9nk.js:16032-16055 placement
function returnFalse_3() {
  return false;
}
//@ chunk-n2cdp9nk.js:16148-16228 sole-consumer
async function applyEffortAndReport(value, context, setAppState, onDone, storageV5, closeDialog = true) {
  let result = await applyEffortCommand(value, context, setAppState, closeDialog, storageV5);
  onDone(result.message, ApplyEffortAndClose(result));
}
//@ chunk-n2cdp9nk.js:16228-16286 placement
function levelChangedOnly(change) {
  return change.levelChanged || !change.ultracodeChanged;
}
//@ chunk-n2cdp9nk.js:16286-16704 placement
async function applyEffortSelection(selection, context, setAppState, onDone, storageV5, showMessages = true) {
  let { level, ultracode, ultracodeChanged } = selection;
  let messages = [];
  let closeAfterApply = false;
  let ultracodeApplied = false;
  if (levelChangedOnly(selection)) {
    let levelResult = await applyEffortCommand(
      level,
      {
        ...context,
        ultracodeConfirmed: ultracode,
      },
      setAppState,
      showMessages,
      storageV5,
    );
    messages.push(levelResult.message);
    closeAfterApply = ApplyEffortAndClose(levelResult);
    ultracodeApplied = isUltracodeToggleAvailable() && levelResult.effortUpdate !== undefined;
    if (ultracodeApplied && ultracodeChanged && ultracode) messages.push("Ultracode on");
  }
  if (ultracodeChanged && !ultracodeApplied) {
    let ultracodeResult = await applyEffortCommand(
      ultracode ? "ultracode on" : "ultracode off",
      context,
      setAppState,
      showMessages,
      storageV5,
    );
    messages.push(
      messages.length === 0 || !ultracodeResult.effortUpdate
        ? ultracodeResult.message
        : `Ultracode ${ultracode ? "on" : "off"}`,
    );
  }
  onDone(messages.join(" \xB7 "), closeAfterApply);
}
//@ chunk-n2cdp9nk.js:16704-17981 placement
function EffortCommandView(props) {
  let $ = useMemoCache(29);
  let { args, route, ultracodeConfirmed, getMessages, onDone, storageV5 } = props;
  let route_2 = route === undefined ? "typed" : route;
  let queuedMessageText = useQueuedMessageText();
  let ultracode = useAppState(selectUltracode_2);
  let ackedAtOutputTokens = useAppState(selectCacheMissAck);
  let permissionMode = useAppState(selectMode);
  let model = useMainLoopModel();
  let setAppState = useSetAppState();
  let parsedArgCached;
  if ($[0] !== args) {
    parsedArgCached = parseEffortArg(args);
    $[0] = args;
    $[1] = parsedArgCached;
  } else parsedArgCached = $[1];
  let parsedArg = parsedArgCached;
  let initialSelectionCached;
  if ($[2] !== queuedMessageText || $[3] !== route_2 || $[4] !== ultracodeConfirmed || $[5] !== ultracode) {
    initialSelectionCached = {
      effort: queuedMessageText,
      ultracode,
      ultracodeConfirmed,
      route: route_2,
    };
    $[2] = queuedMessageText;
    $[3] = route_2;
    $[4] = ultracodeConfirmed;
    $[5] = ultracode;
    $[6] = initialSelectionCached;
  } else initialSelectionCached = $[6];
  let selectionRef = useRef(initialSelectionCached);
  let needsNoticeCached;
  if (
    $[7] !== ackedAtOutputTokens ||
    $[8] !== queuedMessageText ||
    $[9] !== getMessages ||
    $[10] !== model ||
    $[11] !== permissionMode ||
    $[12] !== parsedArg
  ) {
    needsNoticeCached = () =>
      parsedArg !== null &&
      shouldShowEffortNotice({
        target: parsedArg.value,
        current: queuedMessageText,
        model,
        permissionMode,
        messages: getMessages(),
        ackedAtOutputTokens,
        promptCacheMayBeWarm: isMainThreadSource(getMessages()),
      });
    $[7] = ackedAtOutputTokens;
    $[8] = queuedMessageText;
    $[9] = getMessages;
    $[10] = model;
    $[11] = permissionMode;
    $[12] = parsedArg;
    $[13] = needsNoticeCached;
  } else needsNoticeCached = $[13];
  let [needsNotice, setNeedsNotice] = useState(needsNoticeCached);
  let applyOnMountEffect;
  let applyOnMountDeps;
  if (
    $[14] !== args ||
    $[15] !== onDone ||
    $[16] !== needsNotice ||
    $[17] !== setAppState ||
    $[18] !== storageV5 ||
    $[19] !== parsedArg
  ) {
    applyOnMountEffect = () => {
      if (needsNotice && parsedArg !== null) {
        return;
      }
      applyEffortAndReport(args, selectionRef.current, setAppState, onDone, storageV5);
    };
    applyOnMountDeps = [needsNotice, parsedArg, args, setAppState, onDone, storageV5];
    $[14] = args;
    $[15] = onDone;
    $[16] = needsNotice;
    $[17] = setAppState;
    $[18] = storageV5;
    $[19] = parsedArg;
    $[20] = applyOnMountEffect;
    $[21] = applyOnMountDeps;
  } else {
    applyOnMountEffect = $[20];
    applyOnMountDeps = $[21];
  }
  useEffect(applyOnMountEffect, applyOnMountDeps);
  if (needsNotice && parsedArg !== null) {
    let onConfirm;
    if ($[22] === MEMO_CACHE_SENTINEL) {
      onConfirm = () => setNeedsNotice(false);
      $[22] = onConfirm;
    } else onConfirm = $[22];
    let onCancel;
    if ($[23] !== queuedMessageText || $[24] !== onDone) {
      onCancel = () =>
        onDone(
          `Kept effort level as ${queuedMessageText !== undefined ? effortValueToString(queuedMessageText) : "auto"}`,
        );
      $[23] = queuedMessageText;
      $[24] = onDone;
      $[25] = onCancel;
    } else onCancel = $[25];
    let confirmElement;
    if ($[26] !== onCancel || $[27] !== parsedArg.value) {
      confirmElement = jsxProd_default(ModelEffortSwitchConfirm, {
        kind: "effort",
        model: null,
        effort: parsedArg.value,
        onConfirm,
        onCancel,
      });
      $[26] = onCancel;
      $[27] = parsedArg.value;
      $[28] = confirmElement;
    } else confirmElement = $[28];
    return confirmElement;
  }
  return null;
}
//@ chunk-n2cdp9nk.js:17981-18367 placement
var EFFORT_TITLE = "Effort";
var SLIDER_MAX_WIDTH = 42;
var SLIDER_TICK_WIDTH = 14;
var SLIDER_TICK_STEPS = [1, 10, 20, 30, 40];
var SLIDER_SEGMENT_CELLS = [5, 5, 5, 6];
var EFFORT_LEVEL_OPTIONS = [
  {
    value: "low",
    label: "low",
    color: "warning",
  },
  {
    value: "medium",
    label: "medium",
    color: "success",
  },
  {
    value: "high",
    label: "high",
    color: "permission",
  },
  {
    value: "xhigh",
    label: "xhigh",
    color: "autoAccept-shimmer",
  },
  {
    value: "max",
    label: "max",
    color: "rainbow-animated",
  },
];
var SLIDER_MIN_WIDTH = 3;
var EFFORT_CAPPED_TEXT = "Higher effort levels are capped by your settings or organization.";
//@ chunk-n2cdp9nk.js:18367-18656 placement
function computeEffortSliderLayout(count) {
  let min = Math.min(Math.max(count, 1), EFFORT_LEVEL_OPTIONS.length);
  let levels = EFFORT_LEVEL_OPTIONS.slice(0, min);
  let spacers = SLIDER_SEGMENT_CELLS.slice(0, min - 1);
  let trianglePositions = SLIDER_TICK_STEPS.slice(0, min);
  if (min === EFFORT_LEVEL_OPTIONS.length)
    return {
      levels,
      width: SLIDER_MAX_WIDTH,
      trianglePositions,
      spacers,
    };
  let offsets = labelOffsets(levels, spacers);
  let width = Math.max(offsets[min - 1] + levels[min - 1].label.length, SLIDER_TICK_WIDTH);
  return {
    levels,
    width,
    trianglePositions,
    spacers,
  };
}
//@ chunk-n2cdp9nk.js:18656-18748 placement
function labelOffsets(levels, spacers) {
  return levels.map((level, index) =>
    levels.slice(0, index).reduce((acc, level, index) => acc + level.label.length + spacers[index], 0),
  );
}
//@ chunk-n2cdp9nk.js:18748-18810 placement
function hasEffortOverride(level) {
  return (
    level !== undefined &&
    isEffortCostShown() &&
    effortCostRatio(level, getDefaultEffortLevel(level)) !== null
  );
}
//@ chunk-n2cdp9nk.js:18810-19135 placement
function describeEffortLevel(model, level) {
  let defaultEffortLevel = getDefaultEffortLevel(model);
  if (level === "max" && modelSupportsMaxEffort(model)) {
    let price = effortCostRatio(model, "max");
    return price === null
      ? MAX_EFFORT_DESCRIPTION
      : `${MAX_EFFORT_DESCRIPTION} (${formatCostMultiplier(price)})`;
  }
  if (level === defaultEffortLevel)
    return getOrgDefaultEffort(model) === null
      ? "The default effort for this model"
      : "The default effort for this model, set by your organization";
  let price = effortCostRatio(model, level);
  return price === null
    ? ""
    : `${formatCostMultiplier(price)} the estimated cost of ${defaultEffortLevel} (the default)`;
}
//@ chunk-n2cdp9nk.js:19135-19656 placement
/**
 * 计算当前模型可选的 effort 档位、组织默认值与上限说明，供 effort 滑块使用。
 */
function getEffortSliderModel(model) {
  let cap = model ? getEffortCap(model) : null;
  let effortSliderLayout = computeEffortSliderLayout(
    cap ? EFFORT_LEVELS.indexOf(cap) + 1 : EFFORT_LEVELS.length,
  );
  let cappedNote = model && hasEffortLevelsAboveCap(model) ? EFFORT_CAPPED_TEXT : undefined;
  let orgOverride = model ? getOrgOverriddenEffort(model) : null;
  let orgDefaultNote =
    orgOverride !== null
      ? `Your organization starts new sessions on this model at ${orgOverride} effort.`
      : model && getOrgDefaultEffort(model) !== null
        ? `Your organization's default effort for this model is ${getDefaultEffortLevel(model)}.`
        : undefined;
  let filtered = [cappedNote, orgDefaultNote].filter((note) => note !== undefined);
  let orgNote = filtered.length > 0 ? filtered.join(" ") : undefined;
  let labelStarts = labelOffsets(effortSliderLayout.levels, effortSliderLayout.spacers);
  return {
    levels: effortSliderLayout.levels,
    width: effortSliderLayout.width,
    trianglePositions: effortSliderLayout.trianglePositions,
    labelStarts,
    spacers: effortSliderLayout.spacers,
    trackChars: "\u2500".repeat(effortSliderLayout.width),
    orgNote,
  };
}
//@ chunk-n2cdp9nk.js:19656-20139 placement
function EffortLevelLabel(props) {
  let $ = useMemoCache(9);
  let { level, selected } = props;
  let label = level.label;
  if (!selected) {
    let plainLabel;
    if ($[0] !== label) {
      plainLabel = jsxProd_default(Text, {
        dimColor: true,
        children: label,
      });
      $[0] = label;
      $[1] = plainLabel;
    } else plainLabel = $[1];
    return plainLabel;
  }
  if (level.color === "rainbow-animated") {
    let rainbowLabel;
    if ($[2] !== label) {
      rainbowLabel = jsxProd_default(ShimmerText, {
        text: label,
      });
      $[2] = label;
      $[3] = rainbowLabel;
    } else rainbowLabel = $[3];
    return rainbowLabel;
  }
  if (level.color === "autoAccept-shimmer") {
    let autoAcceptLabel;
    if ($[4] !== label) {
      autoAcceptLabel = jsxProd_default(ShimmerText_2, {
        text: label,
      });
      $[4] = label;
      $[5] = autoAcceptLabel;
    } else autoAcceptLabel = $[5];
    return autoAcceptLabel;
  }
  let coloredLabel;
  if ($[6] !== level.color || $[7] !== label) {
    coloredLabel = jsxProd_default(Text, {
      bold: true,
      color: level.color,
      children: label,
    });
    $[6] = level.color;
    $[7] = label;
    $[8] = coloredLabel;
  } else coloredLabel = $[8];
  return coloredLabel;
}
//@ chunk-n2cdp9nk.js:20139-20416 placement
function ShimmerText(props) {
  let $ = useMemoCache(5);
  let { text } = props;
  let prefersReducedMotion = usePrefersReducedMotion();
  let [, frame] = useAnimationFrame(prefersReducedMotion ? null : 100);
  let floored = Math.floor(frame / 100);
  let chars;
  if ($[0] !== text) {
    chars = [...text];
    $[0] = text;
    $[1] = chars;
  } else chars = $[1];
  let textNode;
  if ($[2] !== floored || $[3] !== chars) {
    textNode = jsxProd_default(Text, {
      bold: true,
      children: chars.map((children, index) =>
        jsxProd_default(
          Text,
          {
            color: getRainbowColor(index + floored),
            children,
          },
          index,
        ),
      ),
    });
    $[2] = floored;
    $[3] = chars;
    $[4] = textNode;
  } else textNode = $[4];
  return textNode;
}
//@ chunk-n2cdp9nk.js:20416-20821 placement (2.1.88 match: RARITY_COLORS, 0.417)
/**
 * 文字逐字符"闪光"高亮动画组件。
 */
function ShimmerText_2(props) {
  let $ = useMemoCache(6);
  let { text, color } = props;
  let shimmerColor = color === undefined ? "autoAccept" : color;
  let prefersReducedMotion = usePrefersReducedMotion();
  let [, frame] = useAnimationFrame(prefersReducedMotion ? null : 100);
  let cycleLength = text.length + 4;
  let highlightIndex = prefersReducedMotion ? SPINNER_FLAG_PRIORITY : Math.floor(frame / 100) % cycleLength;
  let chars;
  if ($[0] !== text) {
    chars = [...text];
    $[0] = text;
    $[1] = chars;
  } else chars = $[1];
  let textNode;
  if ($[2] !== shimmerColor || $[3] !== highlightIndex || $[4] !== chars) {
    textNode = jsxProd_default(Text, {
      bold: true,
      children: chars.map((children, index) => {
        let isHighlighted = index === highlightIndex;
        let isNeighbor = index === highlightIndex - 1 || index === highlightIndex + 1;
        return jsxProd_default(
          Text,
          {
            color: isHighlighted ? ULTRACODE_HIGHLIGHT_COLOR : shimmerColor,
            bold: isHighlighted || isNeighbor,
            children,
          },
          index,
        );
      }),
    });
    $[2] = shimmerColor;
    $[3] = highlightIndex;
    $[4] = chars;
    $[5] = textNode;
  } else textNode = $[5];
  return textNode;
}
//@ chunk-n2cdp9nk.js:20821-21044 placement
/**
 * 计算 effort 滑块的初始位置：先看环境变量覆盖或当前设定值，再取已应用/默认 effort 等级，找不到时用默认下标。
 */
function resolveInitialEffortIndex(mainLoopModel, queuedMessageText, slider) {
  let envOverride = getRemoteCaps() ? undefined : getEffortEnvOverride();
  let candidate = envOverride === null ? undefined : (envOverride ?? queuedMessageText);
  if (candidate !== undefined) {
    let index = slider.levels.findIndex((level) => level.value === candidate);
    if (index !== -1) return index;
  }
  let appliedLevel = getAppliedEffortLevel(mainLoopModel, candidate) ?? getDefaultEffortLevel(mainLoopModel);
  let index = slider.levels.findIndex((level) => level.value === appliedLevel);
  return index === -1 ? SLIDER_MIN_WIDTH : index;
}
//@ chunk-n2cdp9nk.js:21044-21053 placement
var NO_SELECTION = -1;
//@ chunk-n2cdp9nk.js:21053-21224 placement
function EffortSliderOrPicker(props) {
  let $ = useMemoCache(4);
  if (useIsScreenReaderEnabled()) {
    let picker;
    if ($[0] !== props) {
      picker = jsxProd_default(EffortPicker, {
        ...props,
      });
      $[0] = props;
      $[1] = picker;
    } else picker = $[1];
    return picker;
  }
  let slider;
  if ($[2] !== props) {
    slider = jsxProd_default(EffortSlider, {
      ...props,
    });
    $[2] = props;
    $[3] = slider;
  } else slider = $[3];
  return slider;
}
//@ chunk-n2cdp9nk.js:21224-29919 placement
/**
 * /effort 交互滑块：在 low…max 间切换，支持 Ultracode 开关和"仅本会话"。
 */
function EffortSlider(props) {
  let $ = useMemoCache(170);
  let { getMessages, onDone, storageV5 } = props;
  let queuedMessageText = useQueuedMessageText();
  let ackedAtOutputTokens = useAppState(selectCacheMissAck_2);
  let permissionMode = useAppState(selectMode_2);
  let appState = useAppState(selectUltracode_3);
  let mainLoopModel = useMainLoopModel();
  let setAppState = useSetAppState();
  let sliderModelCached;
  if ($[0] !== mainLoopModel) {
    sliderModelCached = getEffortSliderModel(mainLoopModel);
    $[0] = mainLoopModel;
    $[1] = sliderModelCached;
  } else sliderModelCached = $[1];
  let sliderModel = sliderModelCached;
  let [specialKeywordDisabled] = useState(isSpecialEffortKeywordDisabled);
  let initialIndexCached;
  if (
    $[2] !== queuedMessageText ||
    $[3] !== sliderModel ||
    $[4] !== specialKeywordDisabled ||
    $[5] !== mainLoopModel
  ) {
    initialIndexCached =
      specialKeywordDisabled && isEffortUnset(queuedMessageText, mainLoopModel)
        ? NO_SELECTION
        : resolveInitialEffortIndex(mainLoopModel, queuedMessageText, sliderModel);
    $[2] = queuedMessageText;
    $[3] = sliderModel;
    $[4] = specialKeywordDisabled;
    $[5] = mainLoopModel;
    $[6] = initialIndexCached;
  } else initialIndexCached = $[6];
  let initialIndex = initialIndexCached;
  let [selectedIndex, setSelectedIndex] = useState(initialIndex);
  let min = Math.min(selectedIndex, sliderModel.levels.length - 1);
  let isNoSelection = min === NO_SELECTION;
  let resolvedIndexCached;
  if ($[7] !== queuedMessageText || $[8] !== sliderModel || $[9] !== mainLoopModel) {
    resolvedIndexCached = resolveInitialEffortIndex(mainLoopModel, queuedMessageText, sliderModel);
    $[7] = queuedMessageText;
    $[8] = sliderModel;
    $[9] = mainLoopModel;
    $[10] = resolvedIndexCached;
  } else resolvedIndexCached = $[10];
  let resolvedIndex = resolvedIndexCached;
  let ultracodeAvailableCached;
  if ($[11] !== mainLoopModel) {
    ultracodeAvailableCached = isUltracodeAvailable(mainLoopModel);
    $[11] = mainLoopModel;
    $[12] = ultracodeAvailableCached;
  } else ultracodeAvailableCached = $[12];
  let isUltracodeAvailableNow = ultracodeAvailableCached;
  let isUltracodeOn = appState === true;
  let [ultracodeToggle, setUltracodeToggle] = useState(isUltracodeOn);
  let { columns } = useTerminalSize();
  let chord = useShortcutDisplay("effortSlider:toggleUltracode", "EffortSlider", "tab");
  let [isReadonly] = useState(returnFalse);
  let hintExtras;
  let toggleHintWidth;
  if ($[13] !== isReadonly || $[14] !== chord) {
    hintExtras = stableEmptyObject(isReadonly);
    toggleHintWidth = bunStringWidth(
      formatShortcutHint({
        chord,
        action: "toggle",
        ...hintExtras,
      }),
    );
    $[13] = isReadonly;
    $[14] = chord;
    $[15] = hintExtras;
    $[16] = toggleHintWidth;
  } else {
    hintExtras = $[15];
    toggleHintWidth = $[16];
  }
  let hintWidth = toggleHintWidth;
  let max = Math.max(SLIDER_LABEL_WIDTH, hintWidth);
  let hasSidePane = columns >= SLIDER_TOTAL_WIDTH + max - SLIDER_LABEL_WIDTH;
  let [pendingConfirm, setPendingConfirm] = useState(null);
  let selectionCached;
  if ($[17] !== queuedMessageText || $[18] !== appState) {
    selectionCached = {
      effort: queuedMessageText,
      ultracode: appState,
      route: "slider",
    };
    $[17] = queuedMessageText;
    $[18] = appState;
    $[19] = selectionCached;
  } else selectionCached = $[19];
  let selection = selectionCached;
  let submittedRef = useRef(false);
  let applyCached;
  if (
    $[20] !== ackedAtOutputTokens ||
    $[21] !== selection ||
    $[22] !== queuedMessageText ||
    $[23] !== sliderModel.levels ||
    $[24] !== getMessages ||
    $[25] !== initialIndex ||
    $[26] !== isUltracodeOn ||
    $[27] !== isNoSelection ||
    $[28] !== mainLoopModel ||
    $[29] !== onDone ||
    $[30] !== permissionMode ||
    $[31] !== min ||
    $[32] !== setAppState ||
    $[33] !== storageV5 ||
    $[34] !== ultracodeToggle
  ) {
    applyCached = function handleApply(asDefault) {
      if (submittedRef.current) {
        return;
      }
      let choice = {
        level: isNoSelection ? "auto" : sliderModel.levels[min].value,
        levelChanged: min !== initialIndex,
        ultracode: ultracodeToggle,
        ultracodeChanged: ultracodeToggle !== isUltracodeOn,
      };
      let persistAsDefault = shouldSaveEffortDefault({
        asDefault,
        levelChanged: choice.levelChanged,
        chosen: queuedMessageText,
        model: mainLoopModel,
      });
      if (
        levelChangedOnly(choice) &&
        shouldShowEffortNotice({
          target: choice.level === "auto" ? undefined : choice.level,
          current: queuedMessageText,
          model: mainLoopModel,
          permissionMode,
          messages: getMessages(),
          ackedAtOutputTokens,
          promptCacheMayBeWarm: isMainThreadSource(getMessages()),
        })
      ) {
        setPendingConfirm({
          choice,
          persistAsDefault,
        });
        return;
      }
      submittedRef.current = true;
      applyEffortSelection(choice, selection, setAppState, onDone, storageV5, persistAsDefault);
    };
    $[20] = ackedAtOutputTokens;
    $[21] = selection;
    $[22] = queuedMessageText;
    $[23] = sliderModel.levels;
    $[24] = getMessages;
    $[25] = initialIndex;
    $[26] = isUltracodeOn;
    $[27] = isNoSelection;
    $[28] = mainLoopModel;
    $[29] = onDone;
    $[30] = permissionMode;
    $[31] = min;
    $[32] = setAppState;
    $[33] = storageV5;
    $[34] = ultracodeToggle;
    $[35] = applyCached;
  } else applyCached = $[35];
  let applySelection = applyCached;
  let cancelCached;
  if ($[36] !== onDone) {
    cancelCached = function handleCancel() {
      if (submittedRef.current) {
        return;
      }
      submittedRef.current = true;
      onDone("Cancelled");
    };
    $[36] = onDone;
    $[37] = cancelCached;
  } else cancelCached = $[37];
  let cancel = cancelCached;
  let globalExitKeybindings = useGlobalExitKeybindings(cancel, undefined, pendingConfirm === null);
  let keyDownCached;
  if ($[38] !== cancel || $[39] !== applySelection) {
    keyDownCached = function handleKeyDown(event) {
      if (event.key === "return") {
        event.preventDefault();
        applySelection(true);
      } else if (event.key === "escape") {
        event.preventDefault();
        cancel();
      }
    };
    $[38] = cancel;
    $[39] = applySelection;
    $[40] = keyDownCached;
  } else keyDownCached = $[40];
  let onKeyDown = keyDownCached;
  let decreaseCached;
  if ($[41] !== resolvedIndex) {
    decreaseCached = () =>
      setSelectedIndex((previous) => (previous === NO_SELECTION ? resolvedIndex : Math.max(0, previous - 1)));
    $[41] = resolvedIndex;
    $[42] = decreaseCached;
  } else decreaseCached = $[42];
  let increaseCached;
  if ($[43] !== sliderModel.levels.length || $[44] !== resolvedIndex) {
    increaseCached = () =>
      setSelectedIndex((previous) =>
        previous === NO_SELECTION ? resolvedIndex : Math.min(sliderModel.levels.length - 1, previous + 1),
      );
    $[43] = sliderModel.levels.length;
    $[44] = resolvedIndex;
    $[45] = increaseCached;
  } else increaseCached = $[45];
  let adaptiveCached;
  if ($[46] !== resolvedIndex || $[47] !== specialKeywordDisabled) {
    adaptiveCached = () => {
      if (!specialKeywordDisabled) {
        return false;
      }
      setSelectedIndex((previous) => (previous === NO_SELECTION ? resolvedIndex : NO_SELECTION));
    };
    $[46] = resolvedIndex;
    $[47] = specialKeywordDisabled;
    $[48] = adaptiveCached;
  } else adaptiveCached = $[48];
  let toggleUltracodeCached;
  if ($[49] !== isUltracodeAvailableNow) {
    toggleUltracodeCached = () => {
      if (!isUltracodeAvailableNow) {
        return false;
      }
      setUltracodeToggle(not);
    };
    $[49] = isUltracodeAvailableNow;
    $[50] = toggleUltracodeCached;
  } else toggleUltracodeCached = $[50];
  let thisSessionOnlyCached;
  if ($[51] !== applySelection) {
    thisSessionOnlyCached = () => applySelection(false);
    $[51] = applySelection;
    $[52] = thisSessionOnlyCached;
  } else thisSessionOnlyCached = $[52];
  let bindings;
  if (
    $[53] !== decreaseCached ||
    $[54] !== increaseCached ||
    $[55] !== adaptiveCached ||
    $[56] !== toggleUltracodeCached ||
    $[57] !== thisSessionOnlyCached
  ) {
    bindings = {
      "effortSlider:decreaseEffort": decreaseCached,
      "effortSlider:increaseEffort": increaseCached,
      "effortSlider:adaptive": adaptiveCached,
      "effortSlider:toggleUltracode": toggleUltracodeCached,
      "effortSlider:thisSessionOnly": thisSessionOnlyCached,
    };
    $[53] = decreaseCached;
    $[54] = increaseCached;
    $[55] = adaptiveCached;
    $[56] = toggleUltracodeCached;
    $[57] = thisSessionOnlyCached;
    $[58] = bindings;
  } else bindings = $[58];
  const isActive = pendingConfirm === null;
  let keybindingOptions;
  if ($[59] !== isActive) {
    keybindingOptions = {
      context: "EffortSlider",
      isActive,
    };
    $[59] = isActive;
    $[60] = keybindingOptions;
  } else keybindingOptions = $[60];
  MessageActionsKeybindings(bindings, keybindingOptions);
  const shortcutDisplay = useShortcutDisplay("effortSlider:decreaseEffort", "EffortSlider", "left");
  const shortcutDisplay_2 = useShortcutDisplay("effortSlider:increaseEffort", "EffortSlider", "right");
  let sliderChords;
  if ($[61] !== shortcutDisplay || $[62] !== shortcutDisplay_2) {
    sliderChords = [shortcutDisplay, shortcutDisplay_2];
    $[61] = shortcutDisplay;
    $[62] = shortcutDisplay_2;
    $[63] = sliderChords;
  } else sliderChords = $[63];
  let adjustChords = sliderChords;
  let shortcutDisplay_3 = useShortcutDisplay_2("effortSlider:thisSessionOnly", "EffortSlider", "s");
  if (pendingConfirm !== null) {
    const effort = pendingConfirm.choice.level === "auto" ? undefined : pendingConfirm.choice.level;
    let onConfirm;
    if (
      $[64] !== selection ||
      $[65] !== onDone ||
      $[66] !== pendingConfirm.choice ||
      $[67] !== pendingConfirm.persistAsDefault ||
      $[68] !== setAppState ||
      $[69] !== storageV5
    ) {
      onConfirm = () => {
        if (submittedRef.current) {
          return;
        }
        submittedRef.current = true;
        applyEffortSelection(
          pendingConfirm.choice,
          selection,
          setAppState,
          onDone,
          storageV5,
          pendingConfirm.persistAsDefault,
        );
      };
      $[64] = selection;
      $[65] = onDone;
      $[66] = pendingConfirm.choice;
      $[67] = pendingConfirm.persistAsDefault;
      $[68] = setAppState;
      $[69] = storageV5;
      $[70] = onConfirm;
    } else onConfirm = $[70];
    let onCancel;
    if ($[71] === MEMO_CACHE_SENTINEL) {
      onCancel = () => setPendingConfirm(null);
      $[71] = onCancel;
    } else onCancel = $[71];
    let confirmElement;
    if ($[72] !== effort || $[73] !== onConfirm) {
      confirmElement = jsxProd_default(ModelEffortSwitchConfirm, {
        kind: "effort",
        model: null,
        effort,
        onConfirm,
        onCancel,
      });
      $[72] = effort;
      $[73] = onConfirm;
      $[74] = confirmElement;
    } else confirmElement = $[74];
    return confirmElement;
  }
  let trianglePos = isNoSelection ? null : sliderModel.trianglePositions[min];
  const leftPadWidth = sliderModel.width - 6 - 7;
  let leftPad;
  if ($[75] !== leftPadWidth) {
    leftPad = repeatString(" ", leftPadWidth);
    $[75] = leftPadWidth;
    $[76] = leftPad;
  } else leftPad = $[76];
  let children = leftPad;
  const last = sliderModel.labelStarts.at(-1);
  let lastLevel;
  if ($[77] !== sliderModel.levels) {
    lastLevel = sliderModel.levels.at(-1);
    $[77] = sliderModel.levels;
    $[78] = lastLevel;
  } else lastLevel = $[78];
  let rightPadStart = last + lastLevel.label.length;
  const rightPadWidth = sliderModel.width - rightPadStart;
  let rightPad;
  if ($[79] !== rightPadWidth) {
    rightPad = repeatString(" ", rightPadWidth);
    $[79] = rightPadWidth;
    $[80] = rightPad;
  } else rightPad = $[80];
  let trailingPad = rightPad;
  let currentLevelValue = isNoSelection ? undefined : sliderModel.levels[min].value;
  let levelDescription;
  if ($[81] !== currentLevelValue || $[82] !== mainLoopModel) {
    levelDescription = !hasEffortOverride(mainLoopModel)
      ? null
      : currentLevelValue === undefined
        ? ""
        : describeEffortLevel(mainLoopModel, currentLevelValue);
    $[81] = currentLevelValue;
    $[82] = mainLoopModel;
    $[83] = levelDescription;
  } else levelDescription = $[83];
  let levelDescriptionText = levelDescription;
  let showMaxWarning;
  if ($[84] !== currentLevelValue || $[85] !== mainLoopModel) {
    showMaxWarning =
      currentLevelValue === "max" && modelSupportsMaxEffort(mainLoopModel) && isMaxEffortReminderEnabled();
    $[84] = currentLevelValue;
    $[85] = mainLoopModel;
    $[86] = showMaxWarning;
  } else showMaxWarning = $[86];
  let maxWarning = showMaxWarning;
  let spacerFnCached;
  if ($[87] !== sliderModel.spacers) {
    spacerFnCached = (spacerIndex) => " ".repeat(sliderModel.spacers[spacerIndex]);
    $[87] = sliderModel.spacers;
    $[88] = spacerFnCached;
  } else spacerFnCached = $[88];
  let spacerFor = spacerFnCached;
  let toggleElement;
  if ($[89] !== hintExtras || $[90] !== chord || $[91] !== max || $[92] !== ultracodeToggle) {
    toggleElement = jsxProd_default(UltracodeToggle, {
      on: ultracodeToggle,
      chord,
      width: max,
      hint: hintExtras,
    });
    $[89] = hintExtras;
    $[90] = chord;
    $[91] = max;
    $[92] = ultracodeToggle;
    $[93] = toggleElement;
  } else toggleElement = $[93];
  let ultracodeToggleElement = toggleElement;
  let titleElement;
  if ($[94] !== isReadonly) {
    titleElement =
      !isReadonly &&
      jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default(Title, {
            children: EFFORT_TITLE,
          }),
          jsxProd_default(Box, {
            height: 1,
          }),
        ],
      });
    $[94] = isReadonly;
    $[95] = titleElement;
  } else titleElement = $[95];
  const width = sliderModel.width;
  let fasterText;
  if ($[96] === MEMO_CACHE_SENTINEL) {
    fasterText = jsxProd_default(Text, {
      children: "Faster",
    });
    $[96] = fasterText;
  } else fasterText = $[96];
  let spacerText;
  if ($[97] !== children) {
    spacerText = jsxProd_default(Text, {
      children,
    });
    $[97] = children;
    $[98] = spacerText;
  } else spacerText = $[98];
  let smarterText;
  if ($[99] === MEMO_CACHE_SENTINEL) {
    smarterText = jsxProd_default(Text, {
      children: "Smarter",
    });
    $[99] = smarterText;
  } else smarterText = $[99];
  let directionRow;
  if ($[100] !== spacerText) {
    directionRow = jsxProd_default_2(Box, {
      children: [fasterText, spacerText, smarterText],
    });
    $[100] = spacerText;
    $[101] = directionRow;
  } else directionRow = $[101];
  let trackElement;
  if ($[102] !== sliderModel.trackChars || $[103] !== trianglePos) {
    trackElement =
      trianglePos === null
        ? jsxProd_default(Text, {
            dimColor: true,
            children: sliderModel.trackChars,
          })
        : jsxProd_default_2(Box, {
            children: [
              jsxProd_default(Text, {
                dimColor: true,
                children: sliderModel.trackChars.slice(0, trianglePos),
              }),
              jsxProd_default(Text, {
                bold: true,
                children: "\u25B2",
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: sliderModel.trackChars.slice(trianglePos + 1),
              }),
            ],
          });
    $[102] = sliderModel.trackChars;
    $[103] = trianglePos;
    $[104] = trackElement;
  } else trackElement = $[104];
  let levelLabels;
  if ($[105] !== sliderModel.levels || $[106] !== min || $[107] !== spacerFor) {
    let renderLevel;
    if ($[109] !== min || $[110] !== spacerFor) {
      renderLevel = (level, index) =>
        jsxProd_default_2(
          fragmentTypeExport,
          {
            children: [
              index > 0 &&
                jsxProd_default(Text, {
                  children: spacerFor(index - 1),
                }),
              jsxProd_default(EffortLevelLabel, {
                level,
                selected: min === index,
              }),
            ],
          },
          level.value,
        );
      $[109] = min;
      $[110] = spacerFor;
      $[111] = renderLevel;
    } else renderLevel = $[111];
    levelLabels = sliderModel.levels.map(renderLevel);
    $[105] = sliderModel.levels;
    $[106] = min;
    $[107] = spacerFor;
    $[108] = levelLabels;
  } else levelLabels = $[108];
  let trailingPadElement;
  if ($[112] !== trailingPad) {
    trailingPadElement = trailingPad
      ? jsxProd_default(Text, {
          children: trailingPad,
        })
      : null;
    $[112] = trailingPad;
    $[113] = trailingPadElement;
  } else trailingPadElement = $[113];
  let labelsRow;
  if ($[114] !== levelLabels || $[115] !== trailingPadElement) {
    labelsRow = jsxProd_default_2(Box, {
      children: [levelLabels, trailingPadElement],
    });
    $[114] = levelLabels;
    $[115] = trailingPadElement;
    $[116] = labelsRow;
  } else labelsRow = $[116];
  let sliderColumn;
  if (
    $[117] !== sliderModel.width ||
    $[118] !== directionRow ||
    $[119] !== trackElement ||
    $[120] !== labelsRow
  ) {
    sliderColumn = jsxProd_default_2(Box, {
      flexDirection: "column",
      width,
      children: [directionRow, trackElement, labelsRow],
    });
    $[117] = sliderModel.width;
    $[118] = directionRow;
    $[119] = trackElement;
    $[120] = labelsRow;
    $[121] = sliderColumn;
  } else sliderColumn = $[121];
  let sideToggleElement;
  if ($[122] !== hasSidePane || $[123] !== isUltracodeAvailableNow || $[124] !== ultracodeToggleElement) {
    sideToggleElement =
      isUltracodeAvailableNow && hasSidePane
        ? jsxProd_default(Box, {
            marginLeft: SLIDER_GAP,
            marginTop: 1,
            children: ultracodeToggleElement,
          })
        : null;
    $[122] = hasSidePane;
    $[123] = isUltracodeAvailableNow;
    $[124] = ultracodeToggleElement;
    $[125] = sideToggleElement;
  } else sideToggleElement = $[125];
  let mainRow;
  if ($[126] !== sliderColumn || $[127] !== sideToggleElement) {
    mainRow = jsxProd_default_2(Box, {
      flexDirection: "row",
      alignItems: "flex-start",
      children: [sliderColumn, sideToggleElement],
    });
    $[126] = sliderColumn;
    $[127] = sideToggleElement;
    $[128] = mainRow;
  } else mainRow = $[128];
  let ultracodeDescriptionRow;
  if (
    $[129] !== sliderModel.width ||
    $[130] !== specialKeywordDisabled ||
    $[131] !== hasSidePane ||
    $[132] !== max ||
    $[133] !== ultracodeToggle ||
    $[134] !== isUltracodeAvailableNow
  ) {
    ultracodeDescriptionRow =
      isUltracodeAvailableNow || specialKeywordDisabled
        ? jsxProd_default(Box, {
            height: 1,
            width: sliderModel.width + (hasSidePane ? SLIDER_GAP + max : 0),
            children: ultracodeToggle
              ? jsxProd_default_2(Text, {
                  dimColor: true,
                  wrap: "truncate-end",
                  children: ["Ultracode: ", ULTRACODE_DESCRIPTION],
                })
              : null,
          })
        : null;
    $[129] = sliderModel.width;
    $[130] = specialKeywordDisabled;
    $[131] = hasSidePane;
    $[132] = max;
    $[133] = ultracodeToggle;
    $[134] = isUltracodeAvailableNow;
    $[135] = ultracodeDescriptionRow;
  } else ultracodeDescriptionRow = $[135];
  let mainColumn;
  if ($[136] !== mainRow || $[137] !== ultracodeDescriptionRow) {
    mainColumn = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [mainRow, ultracodeDescriptionRow],
    });
    $[136] = mainRow;
    $[137] = ultracodeDescriptionRow;
    $[138] = mainColumn;
  } else mainColumn = $[138];
  let descriptionRow;
  if ($[139] !== levelDescriptionText || $[140] !== currentLevelValue || $[141] !== maxWarning) {
    descriptionRow =
      levelDescriptionText !== null
        ? jsxProd_default(Box, {
            minHeight: 2,
            children: maxWarning
              ? jsxProd_default(Text, {
                  color: "warning",
                  children: levelDescriptionText,
                })
              : jsxProd_default(Text, {
                  dimColor: true,
                  children: levelDescriptionText,
                }),
          })
        : currentLevelValue === "max"
          ? jsxProd_default(Box, {
              children: maxWarning
                ? jsxProd_default_2(Text, {
                    color: "warning",
                    children: [WARNING_GLYPH, " ", MAX_EFFORT_DESCRIPTION],
                  })
                : jsxProd_default(Text, {
                    dimColor: true,
                    children: MAX_EFFORT_DESCRIPTION,
                  }),
            })
          : null;
    $[139] = levelDescriptionText;
    $[140] = currentLevelValue;
    $[141] = maxWarning;
    $[142] = descriptionRow;
  } else descriptionRow = $[142];
  let orgNoteRow;
  if ($[143] !== sliderModel.orgNote) {
    orgNoteRow = sliderModel.orgNote
      ? jsxProd_default(Box, {
          children: jsxProd_default(Text, {
            dimColor: true,
            children: sliderModel.orgNote,
          }),
        })
      : null;
    $[143] = sliderModel.orgNote;
    $[144] = orgNoteRow;
  } else orgNoteRow = $[144];
  let inlineToggleRow;
  if (
    $[145] !== specialKeywordDisabled ||
    $[146] !== hasSidePane ||
    $[147] !== isUltracodeAvailableNow ||
    $[148] !== ultracodeToggleElement
  ) {
    inlineToggleRow =
      (specialKeywordDisabled || isUltracodeAvailableNow) && !hasSidePane
        ? jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(Box, {
                height: 1,
              }),
              specialKeywordDisabled ? null : null,
              isUltracodeAvailableNow ? ultracodeToggleElement : null,
            ],
          })
        : null;
    $[145] = specialKeywordDisabled;
    $[146] = hasSidePane;
    $[147] = isUltracodeAvailableNow;
    $[148] = ultracodeToggleElement;
    $[149] = inlineToggleRow;
  } else inlineToggleRow = $[149];
  let bodyColumn;
  if (
    $[150] !== mainColumn ||
    $[151] !== descriptionRow ||
    $[152] !== orgNoteRow ||
    $[153] !== inlineToggleRow
  ) {
    bodyColumn = jsxProd_default_2(Box, {
      flexDirection: "column",
      alignItems: "center",
      width: "100%",
      children: [mainColumn, descriptionRow, orgNoteRow, inlineToggleRow],
    });
    $[150] = mainColumn;
    $[151] = descriptionRow;
    $[152] = orgNoteRow;
    $[153] = inlineToggleRow;
    $[154] = bodyColumn;
  } else bodyColumn = $[154];
  let spacerBox;
  if ($[155] === MEMO_CACHE_SENTINEL) {
    spacerBox = jsxProd_default(Box, {
      height: 1,
    });
    $[155] = spacerBox;
  } else spacerBox = $[155];
  let children_2;
  if (
    $[156] !== adjustChords ||
    $[157] !== globalExitKeybindings.keyName ||
    $[158] !== globalExitKeybindings.pending ||
    $[159] !== hintExtras ||
    $[160] !== shortcutDisplay_3
  ) {
    children_2 = globalExitKeybindings.pending
      ? `Press ${globalExitKeybindings.keyName} again to cancel`
      : jsxProd_default_2(Byline, {
          children: [
            adjustChords.some(Boolean)
              ? jsxProd_default(KeyboardShortcutHint, {
                  chord: adjustChords,
                  action: "adjust",
                  ...hintExtras,
                })
              : null,
            jsxProd_default(KeyboardShortcutHint, {
              chord: "enter",
              action: "confirm",
              ...hintExtras,
            }),
            shortcutDisplay_3
              ? jsxProd_default_2(Text, {
                  children: [shortcutDisplay_3, " for this session only"],
                })
              : null,
            jsxProd_default(KeyboardShortcutHint, {
              chord: "escape",
              action: "cancel",
              ...hintExtras,
            }),
          ],
        });
    $[156] = adjustChords;
    $[157] = globalExitKeybindings.keyName;
    $[158] = globalExitKeybindings.pending;
    $[159] = hintExtras;
    $[160] = shortcutDisplay_3;
    $[161] = children_2;
  } else children_2 = $[161];
  let hintRow;
  if ($[162] !== isReadonly || $[163] !== children_2) {
    hintRow = jsxProd_default(Text, {
      dimColor: true,
      italic: isReadonly,
      children: children_2,
    });
    $[162] = isReadonly;
    $[163] = children_2;
    $[164] = hintRow;
  } else hintRow = $[164];
  let sliderElement;
  if ($[165] !== onKeyDown || $[166] !== titleElement || $[167] !== bodyColumn || $[168] !== hintRow) {
    let children = jsxProd_default_2(Box, {
      flexDirection: "column",
      tabIndex: 0,
      autoFocus: true,
      onKeyDown,
      children: [titleElement, bodyColumn, spacerBox, hintRow],
    });
    sliderElement = jsxProd_default(Pane, {
      children,
    });
    $[165] = onKeyDown;
    $[166] = titleElement;
    $[167] = bodyColumn;
    $[168] = hintRow;
    $[169] = sliderElement;
  } else sliderElement = $[169];
  return sliderElement;
}
//@ chunk-n2cdp9nk.js:29919-29940 placement
var SLIDER_TOTAL_WIDTH = 70;
var SLIDER_GAP = 6;
var SLIDER_LABEL_WIDTH = 14;
//@ chunk-n2cdp9nk.js:29940-30493 placement
function UltracodeToggle(props) {
  let $ = useMemoCache(9);
  let { on, chord, width, hint } = props;
  let labelElement;
  if ($[0] !== on) {
    labelElement = jsxProd_default(Box, {
      children: on
        ? jsxProd_default(ShimmerText_2, {
            text: "Ultracode  on",
            color: "effortUltra",
          })
        : jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(Text, {
                bold: true,
                children: "Ultracode",
              }),
              jsxProd_default(Text, {
                children: "  ",
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: "off",
              }),
            ],
          }),
    });
    $[0] = on;
    $[1] = labelElement;
  } else labelElement = $[1];
  let hintElement;
  if ($[2] !== chord || $[3] !== hint) {
    hintElement = chord
      ? jsxProd_default(Text, {
          dimColor: true,
          children: jsxProd_default(KeyboardShortcutHint, {
            chord,
            action: "toggle",
            ...hint,
          }),
        })
      : null;
    $[2] = chord;
    $[3] = hint;
    $[4] = hintElement;
  } else hintElement = $[4];
  let toggleElement;
  if ($[5] !== labelElement || $[6] !== hintElement || $[7] !== width) {
    toggleElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      width,
      children: [labelElement, hintElement],
    });
    $[5] = labelElement;
    $[6] = hintElement;
    $[7] = width;
    $[8] = toggleElement;
  } else toggleElement = $[8];
  return toggleElement;
}
//@ chunk-n2cdp9nk.js:30569-30605 placement
var ULTRACODE_TOGGLE = "ultracode-toggle";
var AUTO = "auto";
//@ chunk-n2cdp9nk.js:30605-33509 placement
function EffortPicker(props) {
  let $ = useMemoCache(63);
  let { getMessages, onDone, storageV5 } = props;
  let queuedMessageText = useQueuedMessageText();
  let ackedAtOutputTokens = useAppState(selectCacheMissAck_3);
  let permissionMode = useAppState(selectMode_3);
  let appState = useAppState(selectUltracode_4);
  let mainLoopModel = useMainLoopModel();
  let setAppState = useSetAppState();
  let pickerModelCached;
  if ($[0] !== mainLoopModel) {
    pickerModelCached = getEffortSliderModel(mainLoopModel);
    $[0] = mainLoopModel;
    $[1] = pickerModelCached;
  } else pickerModelCached = $[1];
  let pickerModel = pickerModelCached;
  let initialEffortIndex = resolveInitialEffortIndex(mainLoopModel, queuedMessageText, pickerModel);
  let ultracodeAvailableCached;
  if ($[2] !== mainLoopModel) {
    ultracodeAvailableCached = isUltracodeAvailable(mainLoopModel);
    $[2] = mainLoopModel;
    $[3] = ultracodeAvailableCached;
  } else ultracodeAvailableCached = $[3];
  let ultracodeAvailable = ultracodeAvailableCached;
  let [pendingTarget, setPendingTarget] = useState(null);
  let [specialKeywordDisabled] = useState(isSpecialEffortKeywordDisabled);
  let [showAutoView, setShowAutoView] = useState(false);
  let [isReadonly] = useState(returnFalse_2);
  const ultracodeConfirmed = appState === true;
  let selectionCached;
  if ($[4] !== queuedMessageText || $[5] !== ultracodeConfirmed || $[6] !== appState) {
    selectionCached = {
      effort: queuedMessageText,
      ultracode: appState,
      ultracodeConfirmed,
      route: "slider",
    };
    $[4] = queuedMessageText;
    $[5] = ultracodeConfirmed;
    $[6] = appState;
    $[7] = selectionCached;
  } else selectionCached = $[7];
  let selection = selectionCached;
  let submittedRef = useRef(false);
  if (showAutoView) {
    const ultracodeConfirmed = appState === true;
    let autoViewElement;
    if ($[8] !== getMessages || $[9] !== onDone || $[10] !== storageV5 || $[11] !== ultracodeConfirmed) {
      autoViewElement = jsxProd_default(EffortCommandView, {
        args: "auto",
        route: "slider",
        ultracodeConfirmed,
        getMessages,
        onDone,
        storageV5,
      });
      $[8] = getMessages;
      $[9] = onDone;
      $[10] = storageV5;
      $[11] = ultracodeConfirmed;
      $[12] = autoViewElement;
    } else autoViewElement = $[12];
    return autoViewElement;
  }
  if (pendingTarget !== null) {
    let onConfirm;
    if (
      $[13] !== selection ||
      $[14] !== onDone ||
      $[15] !== pendingTarget ||
      $[16] !== setAppState ||
      $[17] !== storageV5
    ) {
      onConfirm = () => {
        if (submittedRef.current) {
          return;
        }
        submittedRef.current = true;
        applyEffortAndReport(pendingTarget, selection, setAppState, onDone, storageV5);
      };
      $[13] = selection;
      $[14] = onDone;
      $[15] = pendingTarget;
      $[16] = setAppState;
      $[17] = storageV5;
      $[18] = onConfirm;
    } else onConfirm = $[18];
    let onCancel;
    if ($[19] === MEMO_CACHE_SENTINEL) {
      onCancel = () => setPendingTarget(null);
      $[19] = onCancel;
    } else onCancel = $[19];
    let confirmElement;
    if ($[20] !== pendingTarget || $[21] !== onConfirm) {
      confirmElement = jsxProd_default(ModelEffortSwitchConfirm, {
        kind: "effort",
        model: null,
        effort: pendingTarget,
        onConfirm,
        onCancel,
      });
      $[20] = pendingTarget;
      $[21] = onConfirm;
      $[22] = confirmElement;
    } else confirmElement = $[22];
    return confirmElement;
  }
  let options;
  if (
    $[23] !== pickerModel.levels ||
    $[24] !== mainLoopModel ||
    $[25] !== ultracodeAvailable ||
    $[26] !== appState
  ) {
    let toOption;
    if ($[28] !== mainLoopModel) {
      toOption = (level) => {
        let effortLevelDescription = getEffortLevelDescription(mainLoopModel, level);
        return {
          label: effortLevelDescription === "" ? level.label : `${level.label} (${effortLevelDescription})`,
          value: level.value,
        };
      };
      $[28] = mainLoopModel;
      $[29] = toOption;
    } else toOption = $[29];
    options = pickerModel.levels.map(toOption);
    if (ultracodeAvailable)
      options.push({
        label: `Ultracode: ${appState ? "on" : "off"} (select to turn it ${appState ? "off" : "on"}; ${ULTRACODE_DESCRIPTION})`,
        value: ULTRACODE_TOGGLE,
      });
    $[23] = pickerModel.levels;
    $[24] = mainLoopModel;
    $[25] = ultracodeAvailable;
    $[26] = appState;
    $[27] = options;
  } else options = $[27];
  let currentValue;
  if (
    $[30] !== queuedMessageText ||
    $[31] !== pickerModel.levels ||
    $[32] !== initialEffortIndex ||
    $[33] !== specialKeywordDisabled ||
    $[34] !== mainLoopModel
  ) {
    currentValue =
      specialKeywordDisabled && isEffortUnset(queuedMessageText, mainLoopModel)
        ? AUTO
        : pickerModel.levels[Math.min(initialEffortIndex, pickerModel.levels.length - 1)].value;
    $[30] = queuedMessageText;
    $[31] = pickerModel.levels;
    $[32] = initialEffortIndex;
    $[33] = specialKeywordDisabled;
    $[34] = mainLoopModel;
    $[35] = currentValue;
  } else currentValue = $[35];
  let defaultValue = currentValue;
  let titleElement;
  if ($[36] !== isReadonly) {
    titleElement =
      !isReadonly &&
      jsxProd_default(Title, {
        children: EFFORT_TITLE,
      });
    $[36] = isReadonly;
    $[37] = titleElement;
  } else titleElement = $[37];
  let orgNoteElement;
  if ($[38] !== pickerModel.orgNote) {
    orgNoteElement = pickerModel.orgNote
      ? jsxProd_default(Text, {
          children: pickerModel.orgNote,
        })
      : null;
    $[38] = pickerModel.orgNote;
    $[39] = orgNoteElement;
  } else orgNoteElement = $[39];
  let onChange;
  if (
    $[40] !== ackedAtOutputTokens ||
    $[41] !== selection ||
    $[42] !== defaultValue ||
    $[43] !== queuedMessageText ||
    $[44] !== getMessages ||
    $[45] !== mainLoopModel ||
    $[46] !== onDone ||
    $[47] !== permissionMode ||
    $[48] !== setAppState ||
    $[49] !== storageV5 ||
    $[50] !== appState
  ) {
    onChange = (nextValue) => {
      if (submittedRef.current) {
        return;
      }
      if (nextValue === ULTRACODE_TOGGLE) {
        submittedRef.current = true;
        applyEffortAndReport(
          appState ? "ultracode off" : "ultracode on",
          selection,
          setAppState,
          onDone,
          storageV5,
        );
        return;
      }
      if (nextValue === AUTO) {
        submittedRef.current = true;
        setShowAutoView(true);
        return;
      }
      let targetValue = nextValue;
      if (
        shouldShowEffortNotice({
          target: targetValue,
          current: queuedMessageText,
          model: mainLoopModel,
          permissionMode,
          messages: getMessages(),
          ackedAtOutputTokens,
          promptCacheMayBeWarm: isMainThreadSource(getMessages()),
        })
      ) {
        setPendingTarget(targetValue);
        return;
      }
      submittedRef.current = true;
      applyEffortAndReport(
        targetValue,
        selection,
        setAppState,
        onDone,
        storageV5,
        shouldSaveEffortDefault({
          asDefault: true,
          levelChanged: targetValue !== defaultValue,
          chosen: queuedMessageText,
          model: mainLoopModel,
        }),
      );
    };
    $[40] = ackedAtOutputTokens;
    $[41] = selection;
    $[42] = defaultValue;
    $[43] = queuedMessageText;
    $[44] = getMessages;
    $[45] = mainLoopModel;
    $[46] = onDone;
    $[47] = permissionMode;
    $[48] = setAppState;
    $[49] = storageV5;
    $[50] = appState;
    $[51] = onChange;
  } else onChange = $[51];
  let onCancel;
  if ($[52] !== onDone) {
    onCancel = () => {
      if (submittedRef.current) {
        return;
      }
      submittedRef.current = true;
      onDone("Cancelled");
    };
    $[52] = onDone;
    $[53] = onCancel;
  } else onCancel = $[53];
  let selectElement;
  if ($[54] !== defaultValue || $[55] !== options || $[56] !== onChange || $[57] !== onCancel) {
    selectElement = jsxProd_default(Select, {
      options,
      defaultValue,
      onChange,
      onCancel,
    });
    $[54] = defaultValue;
    $[55] = options;
    $[56] = onChange;
    $[57] = onCancel;
    $[58] = selectElement;
  } else selectElement = $[58];
  let pickerElement;
  if ($[59] !== selectElement || $[60] !== titleElement || $[61] !== orgNoteElement) {
    let children = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [titleElement, orgNoteElement, selectElement],
    });
    pickerElement = jsxProd_default(Pane, {
      children,
    });
    $[59] = selectElement;
    $[60] = titleElement;
    $[61] = orgNoteElement;
    $[62] = pickerElement;
  } else pickerElement = $[62];
  return pickerElement;
}
//@ chunk-n2cdp9nk.js:33509-33778 placement
/**
 * /effort 命令的 JSX 入口：带参数时显示 EffortCommandView，否则显示交互滑块（屏幕阅读器下为选择列表）。
 */
function EffortCommand(props) {
  let $ = useMemoCache(5);
  let { args, onDone, getMessages, storageV5 } = props;
  let contentElement;
  if ($[0] !== args || $[1] !== getMessages || $[2] !== onDone || $[3] !== storageV5) {
    contentElement = args
      ? jsxProd_default(EffortCommandView, {
          args,
          onDone,
          getMessages,
          storageV5,
        })
      : jsxProd_default(EffortSliderOrPicker, {
          onDone,
          getMessages,
          storageV5,
        });
    $[0] = args;
    $[1] = getMessages;
    $[2] = onDone;
    $[3] = storageV5;
    $[4] = contentElement;
  } else contentElement = $[4];
  return contentElement;
}
export { selectUltracode, EffortCommand, hasEffortOverride, describeEffortLevel, getEffortSliderModel };
