/**
 * components/ModelPicker.tsx
 *
 * /model 选择器：模型列表（含 1M 上下文、Fast 等变体）、effort 等级调节与默认值、搜索。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ModelPicker.tsx
 * pieces: chunk-18hwfzwa.js (21)
 * attribution: sole-consumer 8, fingerprint 4, layout 3, callgraph-fingerprint 2, placement 3, affinity 1
 */
import {
  init_react_production,
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  useReducer,
} from "../../vendor/react/cjs/react.production.js";
import { useSearchInput } from "../hooks/useSearchInput.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { getCachedClientData } from "../utils/config.js";
import { parseUserSpecifiedModel } from "../utils/model/modelDisplay.js";
import { getCanonicalName } from "../utils/model/canonicalModelName.js";
import { FILLED_CIRCLE, WHITE_CIRCLE, WARNING_GLYPH } from "../constants/figures.js";
import { useTheme_2, useTheme } from "./design-system/ThemeProvider.js";
import { useScrollViewportSize } from "./ScrollViewportContext.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useAppState } from "../state/AppState.js";
import {
  isFastModeEnabled,
  isFastModeAvailable,
  isFastModeCooldown,
  defaultOpusLabel,
} from "../utils/fastMode.js";
import {
  getModelOptionsWithTelemetry,
  findMatchingOptionValue,
  noopModelOption,
} from "../utils/model/modelOptions.js";
import { useForceRender } from "../hooks/useForceRender.js";
import { useSettingsState } from "../hooks/useSettings.js";
import { getModelSwitchTarget } from "../utils/model/modelSwitchHooks.js";
import { useLatestState } from "./CustomSelect/option-map.js";
import { useTerminalFocus } from "../ink/hooks/use-terminal-focus.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { stableEmptyObject } from "../utils/stableEmptyObject.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import {
  resolveEffortLevel,
  normalizeEffortLevel,
  getEffortCapabilitiesForOption,
  clampEffortToCap,
  modelSupportsEffort,
  isUltracodeActive,
  getDefaultEffortLevel,
} from "../utils/effort.js";
import { isModelAllowed } from "../utils/model/modelAllowlist.js";
import { modelDisplayString } from "../utils/model/model.js";
import { color } from "./design-system/color.js";
import { supportsStrikethrough } from "../utils/doctorContextWarnings.js";
import { sequential } from "../utils/sequential.js";
import { getInferenceProfileBackingModel } from "../utils/model/bedrock.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { useGlobalExitKeybindings } from "../keybindings/useKeybinding.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { Ratchet } from "./design-system/Ratchet.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { HintText } from "./design-system/HintText.js";
import { capitalizeAlias } from "../../vendor/lodash-es/upperFirst.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { isMaxEffortReminderEnabled } from "../utils/permissions/permissionSetup.js";
import { MAX_EFFORT_DESCRIPTION } from "../utils/settings/permissionRuleCarveOut.js";
import { Byline } from "./design-system/Byline.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { Pane } from "./design-system/Pane.js";
import { getDefaultMainLoopModel } from "../utils/model/modelFallback.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { effortLevelToSymbol } from "./EffortIndicator.js";
import { stripAnsi } from "../utils/stripAnsi.js";
import { usePluginInstallationStatus } from "../hooks/notifs/usePluginInstallationStatus.js";
import { PinnedBridgeNotice } from "./StatusNotices.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:666845-666849 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:666845", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:666849-666853 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:666849", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:666853-667539 sole-consumer
/**
 * 设置类列表的搜索模式钩子：按 / 进入搜索（settings:search 键绑定），Ctrl+N 或空串退格退出；返回 isSearchMode、query、光标与键盘/粘贴处理函数。
 */
function useSettingsSearchMode({ canEnter, startInSearchMode = false }) {
  let initialSearchMode = canEnter && startInSearchMode;
  let [isSearchMode, setSearchMode] = useState(initialSearchMode);
  let searchModeRef = useRef(initialSearchMode);
  let exitSearchMode = () => {
    searchModeRef.current = false;
    setSearchMode(false);
  };
  let { query, cursorOffset, handleKeyDown, handlePaste } = useSearchInput({
    isActive: true,
    backspaceExitsOnEmpty: !initialSearchMode,
    onExit: exitSearchMode,
  });
  let enterSearchMode = useCallback(() => {
    searchModeRef.current = true;
    setSearchMode(true);
  }, []);
  MessageActionsKeybindings(
    {
      "settings:search": () => {
        if (searchModeRef.current) return false;
        enterSearchMode();
      },
    },
    {
      context: "Settings",
      isActive: canEnter && !isSearchMode,
    },
  );
  return {
    isSearchMode,
    query,
    cursorOffset,
    handleKeyDown: (event) => {
      if (event.defaultPrevented) return;
      if (searchModeRef.current) {
        if (event.ctrl && !event.meta && event.key === "n") {
          event.preventDefault();
          exitSearchMode();
          return;
        }
        handleKeyDown(event);
        return;
      }
      if (!canEnter) return;
      if (event.key === "/" && !event.ctrl && !event.meta) {
        event.preventDefault();
        enterSearchMode();
      }
    },
    handlePaste: (pastedText) => {
      if (searchModeRef.current) handlePaste(pastedText);
    },
    enterSearchMode,
  };
}
//@ chunk-18hwfzwa.js:667539-667752 sole-consumer
function getModelNotices() {
  let modelNotices = getCachedClientData()?.model_notices;
  if (typeof modelNotices !== "object" || modelNotices === null || Array.isArray(modelNotices)) return {};
  let sanitizedNotices = {};
  for (let [key, value] of Object.entries(modelNotices))
    if (key.trim().length > 0 && typeof value === "string" && value.length > 0) sanitizedNotices[key] = value;
  return sanitizedNotices;
}
//@ chunk-18hwfzwa.js:667752-668017 sole-consumer
/**
 * 在服务端下发的 model_notices 里查找与给定模型匹配的提示（按原名、解析后名、规范名或包含关系，忽略大小写）。
 */
function findModelNotice(modelOptionValue) {
  let modelNotices = getModelNotices();
  if (Object.keys(modelNotices).length === 0) return;
  let lower = modelOptionValue.toLowerCase();
  let lower_2 = parseUserSpecifiedModel(modelOptionValue).toLowerCase();
  let lower_3 = getCanonicalName(lower_2, {
    identity: true,
  }).toLowerCase();
  for (let [key, value] of Object.entries(modelNotices)) {
    let lower_4 = key.toLowerCase();
    if (lower_4 === lower || lower_4 === lower_2 || lower_4 === lower_3 || lower_2.includes(lower_4))
      return value;
  }
  return;
}
//@ chunk-18hwfzwa.js:668017-668043 sole-consumer
function getFilledCircleGlyph() {
  return FILLED_CIRCLE;
}
//@ chunk-18hwfzwa.js:668043-668074 sole-consumer
function getLeadingWhiteCircleGlyph() {
  return ` ${WHITE_CIRCLE}`;
}
//@ chunk-18hwfzwa.js:668074-668101 fingerprint (2.1.88 match: NO_PREFERENCE, 1)
var NO_PREFERENCE = "__NO_PREFERENCE__";
//@ chunk-18hwfzwa.js:668101-668112 layout
var MODEL_PICKER_CHROME_ROWS = 14;
//@ chunk-18hwfzwa.js:668112-674941 fingerprint (2.1.88 match: ModelPicker, 0.441)
/**
 * /model 选择器：列出可用模型选项（默认/Opus/Sonnet/Haiku 及 1M、Fast 变体），左右键调节 effort（low/medium/high/xhigh/max），显示当前模型与基础模型，支持搜索。
 */
function ModelPicker({
  initial,
  sessionModel,
  onSelect,
  onSetDefault,
  onCancel,
  isStandaloneCommand,
  showFastModeNotice,
  headerText,
  options,
}) {
  let { storageV5, credentials } = useTheme_2();
  let { rows } = useScrollViewportSize(useTerminalSize());
  let fastModeAppValue = useAppState((appState) => (isFastModeEnabled() ? appState.fastMode : false));
  let [fastModeEnabled] = useState(fastModeAppValue ?? false);
  let modelOptions = useMemo(
    () => options ?? getModelOptionsWithTelemetry(fastModeEnabled),
    [options, fastModeEnabled],
  );
  let forceRender = useForceRender();
  let settingsState = useSettingsState();
  let sessionOverride = useMemo(
    () => getModelSwitchTarget(sessionModel, initial),
    [sessionModel, initial, forceRender, settingsState],
  );
  let effectiveInitial = sessionOverride ?? initial;
  let selectedValue =
    effectiveInitial === null
      ? NO_PREFERENCE
      : (findMatchingOptionValue(modelOptions, effectiveInitial) ?? effectiveInitial);
  let [focusValue, setFocusValue, getFocusValue] = useLatestState(selectedValue);
  let [baseline] = useState({
    current: effectiveInitial,
    value: selectedValue,
    sessionOverride,
  });
  let [theme] = useTheme();
  let setAppState = useTerminalFocus();
  let exitState = useIsScreenReaderEnabled();
  let neverFalse = false;
  let isScreenReader = exitState ? true : false;
  let neverFalse2 = false;
  let neverFalse3 = false;
  let isFastMode = stableEmptyObject(false);
  let { isSearchMode, query, cursorOffset, handleKeyDown, handlePaste, enterSearchMode } =
    useSettingsSearchMode({
      canEnter: false,
      startInSearchMode: true,
    });
  let effortValue = useRef(false);
  useEffect(() => {
    if (query !== "" && !effortValue.current) {
      effortValue.current = true;
      logFeatureOk("model_picker_search");
    }
  }, [query]);
  let reservedRows = 0;
  let showFastNotice =
    isFastModeEnabled() && (showFastModeNotice || (isFastModeAvailable() && !isFastModeCooldown()));
  let fastRows = showFastNotice ? 3 : 0;
  let overrideRows = sessionOverride !== null ? 3 : 0;
  let max = Math.max(
    2,
    Math.min(10, Math.floor((rows - MODEL_PICKER_CHROME_ROWS - reservedRows - fastRows - overrideRows) / 2)),
  );
  let [, setEffortTouched, getEffortTouched] = useLatestState(false);
  let currentEffort = useAppState((state) =>
    resolveEffortLevel(state, undefined, {
      withHold: false,
    }),
  );
  let sessionEffort = useAppState((state) => state.sessionEffort);
  let settingsEffortTable = useAppState((state) => state.settingsEffortTable);
  let ultracode = useAppState((state) => state.ultracode);
  let [effortLevel, setEffortLevel, getEffortLevel] = useLatestState(
    currentEffort !== undefined ? normalizeEffortLevel(currentEffort) : undefined,
  );
  let allOptions = useMemo(() => {
    let extraOptions = [];
    for (let [value, optionValue, label] of [
      [baseline.current, baseline.value, "Current model"],
      [
        baseline.sessionOverride === null ? null : initial,
        initial === null ? NO_PREFERENCE : (findMatchingOptionValue(modelOptions, initial) ?? initial),
        "Base model",
      ],
    ])
      if (
        value !== null &&
        !modelOptions.some((option) => option.value === optionValue) &&
        !extraOptions.some((option) => option.value === value) &&
        isModelAllowed(value)
      )
        extraOptions.push({
          value,
          label: modelDisplayString(value),
          description: label,
        });
    if (extraOptions.length === 0) return modelOptions;
    let index = modelOptions.findIndex((option) => option.disabled === true);
    if (index === -1) return [...modelOptions, ...extraOptions];
    return [...modelOptions.slice(0, index), ...extraOptions, ...modelOptions.slice(index)];
  }, [modelOptions, baseline, initial]);
  let decoratedOptions = useMemo(
    () =>
      allOptions.map((option) => {
        let value = option.value === null ? NO_PREFERENCE : option.value;
        let modelOptionValue = resolveModelOptionValue(value);
        let notice = modelOptionValue ? findModelNotice(modelOptionValue) : undefined;
        let description = (
          (notice
            ? option.description
              ? `${option.description} \xB7 ${notice}`
              : notice
            : option.description) ?? ""
        )
          .replaceAll("Opus 5.5", color("claude", theme)("Opus 5.5"))
          .replace(/\$[\d.]+\/\$[\d.]+ per Mtok/, (opt) =>
            option.promoListPrice && supportsStrikethrough() && sequential.level > 0
              ? `${sequential.dim.strikethrough(option.promoListPrice)} ${opt}`
              : opt,
          );
        return {
          ...option,
          value,
          description,
        };
      }),
    [allOptions, theme],
  );
  let filteredOptions = useMemo(() => filterModelOptions(decoratedOptions, query), [decoratedOptions, query]);
  let defaultFocusValue = useMemo(
    () =>
      filteredOptions.some((option) => option.value === baseline.value)
        ? baseline.value
        : (filteredOptions[0]?.value ?? undefined),
    [filteredOptions, baseline.value],
  );
  let visibleCount = Math.min(max, filteredOptions.length);
  let focusedValue = filteredOptions.some((option) => option.value === focusValue)
    ? focusValue
    : defaultFocusValue;
  let found = decoratedOptions.find((opt_1) => opt_1.value === focusedValue);
  let label = found?.label;
  let isFocusedDisabled = found?.disabled === true;
  let focusedModel = resolveModelOptionValue(focusedValue);
  useEffect(() => {
    import("../services/api/bootstrap.js").then((bootstrapModule) =>
      bootstrapModule.fetchBootstrapData(storageV5, credentials),
    );
  }, [storageV5, credentials]);
  let [, setVersion] = useReducer((count) => count + 1, 0);
  useEffect(() => {
    if (!focusedModel?.includes("application-inference-profile")) return;
    let cancelled = false;
    getInferenceProfileBackingModel(focusedModel).then(() => {
      if (!cancelled) setVersion();
    });
    return () => {
      cancelled = true;
    };
  }, [focusedModel]);
  let { supportsEffort, supportsMax, supportsXHigh, defaultEffort, capLevels } =
    getEffortCapabilitiesForOption(focusedValue);
  let cappedEffort =
    (effortLevel === "max" && !supportsMax) || (effortLevel === "xhigh" && !supportsXHigh)
      ? "high"
      : effortLevel;
  let effectiveEffort =
    focusedModel && cappedEffort !== undefined ? clampEffortToCap(cappedEffort, focusedModel) : cappedEffort;
  let onFocus = useCallback(
    (value) => {
      setFocusValue(value);
      if (getEffortTouched()) return;
      let effortLevel = resolveEffortLevel(
        {
          sessionEffort,
          settingsEffortTable,
        },
        resolveModelOptionValue(value),
        {
          withHold: false,
        },
      );
      setEffortLevel(
        noopModelOption(value)?.effort ??
          (effortLevel !== undefined ? normalizeEffortLevel(effortLevel) : defaultEffortForModel(value)),
      );
    },
    [getEffortTouched, sessionEffort, settingsEffortTable, setFocusValue, setEffortLevel],
  );
  let cycleEffort = useCallback(
    (direction) => {
      let value = getFocusValue();
      let found = filteredOptions.find((value_2) => value_2.value === value);
      if (found === undefined || found.disabled === true) return;
      let effortCapabilitiesForOption = getEffortCapabilitiesForOption(value);
      if (!effortCapabilitiesForOption.supportsEffort) return;
      setEffortLevel((direction_2) =>
        cycleEffortLevel(
          direction_2 ?? effortCapabilitiesForOption.defaultEffort,
          direction,
          effortCapabilitiesForOption.capLevels,
          effortCapabilitiesForOption.supportsMax,
          effortCapabilitiesForOption.supportsXHigh,
        ),
      );
      setEffortTouched(true);
    },
    [filteredOptions, getFocusValue, setEffortTouched, setEffortLevel],
  );
  MessageActionsKeybindings(
    {
      "modelPicker:decreaseEffort": () => {
        if (isSearchMode && query !== "") return false;
        cycleEffort("left");
      },
      "modelPicker:increaseEffort": () => {
        if (isSearchMode && query !== "") return false;
        cycleEffort("right");
      },
      "modelPicker:thisSessionOnly": () => {
        if (isSearchMode) return false;
        if (!onSetDefault) return;
        let value = getFocusValue();
        let found = filteredOptions.find((prev) => prev.value === value);
        if (found === undefined) return;
        if (found.disabled === true) return;
        selectModel(found.value);
      },
    },
    {
      context: "ModelPicker",
    },
  );
  function selectModel(value_0) {
    let persistable = resolveModelOptionValue(value_0);
    let effort = getEffortLevel();
    let toggled = getEffortTouched();
    let cappedEffort = persistable && effort !== undefined ? clampEffortToCap(effort, persistable) : effort;
    logEvent("tengu_model_command_menu_effort", {
      effort: fromEnumOpt(cappedEffort),
      toggled,
    });
    let selectedEffort =
      toggled && persistable && modelSupportsEffort(persistable) ? cappedEffort : undefined;
    if (value_0 === NO_PREFERENCE) {
      onSelect(null, selectedEffort);
      return;
    }
    onSelect(value_0, selectedEffort);
  }
  let globalExitKeybindings = useGlobalExitKeybindings(onCancel, undefined, isStandaloneCommand === true);
  function onPick(prev_0) {
    if (onSetDefault) onSetDefault(prev_0 === NO_PREFERENCE ? null : prev_0);
    selectModel(prev_0);
  }
  function onKeyDown(event) {
    if (
      !event.defaultPrevented &&
      isSearchMode &&
      (event.name === "return" ||
        event.name === "down" ||
        (event.ctrl && !event.meta && event.key === "n")) &&
      filteredOptions.length === 0
    ) {
      event.preventDefault();
      return;
    }
    if (!event.defaultPrevented && isSearchMode && query === "") {
      if (event.name === "return") {
        event.preventDefault();
        let found = filteredOptions.find((option) => option.value === getFocusValue());
        if (found !== undefined && !found.disabled) onPick(found.value);
        return;
      }
      if (event.name === "escape") {
        event.preventDefault();
        onCancel?.();
        return;
      }
    }
    handleKeyDown(event);
  }
  let ultracodeSuffix =
    focusedModel && isUltracodeActive(ultracode, focusedModel) ? " \xB7 Ultracode on (/effort)" : "";
  let shownEffort = effectiveEffort;
  let neverFlag = false;
  let content = jsxProd_default_2(Box, {
    flexDirection: "column",
    tabIndex: 0,
    autoFocus: true,
    onKeyDown,
    onPaste: handlePaste,
    children: [
      jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default_2(Box, {
            marginBottom: 1,
            flexDirection: "column",
            children: [
              jsxProd_default(Text, {
                color: "remember",
                bold: true,
                children: "Select model",
              }),
              (headerText !== undefined || true) &&
                jsxProd_default(Text, {
                  dimColor: true,
                  children:
                    headerText ??
                    "Switch between Claude models. Your pick becomes the default for new sessions. For other/previous model names, specify with --model.",
                }),
              sessionOverride !== null &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [
                    "Currently using ",
                    modelDisplayString(sessionOverride),
                    " for this session only (base model: ",
                    modelDisplayString(initial),
                    "). Selecting a model here replaces both.",
                  ],
                }),
            ],
          }),
          jsxProd_default_2(Box, {
            flexDirection: "column",
            marginBottom: 1,
            children: [
              false,
              jsxProd_default_2(Ratchet, {
                restartKey: max,
                children: [
                  jsxProd_default(ModelSelector, {
                    defaultValue: selectedValue,
                    selectedValue,
                    defaultFocusValue,
                    options: filteredOptions,
                    columnSizingOptions: decoratedOptions,
                    onChange: onPick,
                    onFocus,
                    onUpFromFirstItem: undefined,
                    onCancel: () => onCancel?.(),
                    visibleOptionCount: visibleCount,
                    hiddenBelowUnit: "model",
                    isDisabled: isSearchMode,
                  }),
                  query !== "" &&
                    filteredOptions.length === 0 &&
                    jsxProd_default(HintText, {
                      children: `No models match "${query}"`,
                    }),
                ],
              }),
            ],
          }),
          jsxProd_default(Ratchet, {
            children:
              focusedValue !== undefined &&
              !isFocusedDisabled &&
              jsxProd_default(Box, {
                marginBottom: 1,
                flexDirection: "column",
                children: supportsEffort
                  ? jsxProd_default_2(Fragment, {
                      children: [
                        jsxProd_default_2(Text, {
                          dimColor: true,
                          children: [
                            jsxProd_default(EffortLevelIndicator, {
                              effort: effectiveEffort,
                            }),
                            " ",
                            effectiveEffort === "xhigh"
                              ? "xHigh"
                              : effectiveEffort
                                ? capitalizeAlias(effectiveEffort)
                                : "",
                            " ",
                            "effort",
                            effectiveEffort === defaultEffort ? " (default)" : "",
                            (!isSearchMode || query === "") &&
                              jsxProd_default_2(Text, {
                                color: "subtle",
                                children: [
                                  " ",
                                  jsxProd_default(KeyboardShortcutHint, {
                                    chord: ["left", "right"],
                                    action: "adjust",
                                  }),
                                ],
                              }),
                            ultracodeSuffix,
                          ],
                        }),
                        shownEffort === "max"
                          ? isMaxEffortReminderEnabled()
                            ? jsxProd_default_2(Text, {
                                color: "warning",
                                children: [WARNING_GLYPH, " ", MAX_EFFORT_DESCRIPTION],
                              })
                            : jsxProd_default(Text, {
                                color: "subtle",
                                dimColor: false,
                                children: MAX_EFFORT_DESCRIPTION,
                              })
                          : null,
                      ],
                    })
                  : jsxProd_default(Box, {
                      minHeight: undefined,
                      children: jsxProd_default_2(Text, {
                        color: "subtle",
                        dimColor: false,
                        children: [
                          jsxProd_default(EffortLevelIndicator, {
                            effort: undefined,
                          }),
                          " ",
                          "Effort not supported",
                          label ? ` for ${label}` : "",
                        ],
                      }),
                    }),
              }),
          }),
          showFastNotice
            ? showFastModeNotice
              ? jsxProd_default(Box, {
                  marginBottom: 1,
                  children: jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [
                      "Fast mode is ",
                      jsxProd_default(Text, {
                        bold: true,
                        children: "ON",
                      }),
                      " and available with",
                      " ",
                      defaultOpusLabel(),
                      " (/fast). Switching to other models turns off fast mode.",
                    ],
                  }),
                })
              : jsxProd_default(Box, {
                  marginBottom: 1,
                  children: jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [
                      "Use ",
                      jsxProd_default(Text, {
                        bold: true,
                        children: "/fast",
                      }),
                      " to turn on Fast mode (",
                      defaultOpusLabel(),
                      ").",
                    ],
                  }),
                })
            : null,
        ],
      }),
      isStandaloneCommand &&
        jsxProd_default(Ratchet, {
          children: jsxProd_default(Text, {
            dimColor: true,
            italic: false,
            children: globalExitKeybindings.pending
              ? `Press ${globalExitKeybindings.keyName} again to ${onCancel ? "cancel" : "exit"}`
              : isSearchMode && query === ""
                ? jsxProd_default_2(Byline, {
                    children: [
                      jsxProd_default(Text, {
                        children: "Type to search",
                      }),
                      neverFlag,
                      focusedValue !== undefined &&
                        !isFocusedDisabled &&
                        jsxProd_default(KeyboardShortcutHint, {
                          chord: "enter",
                          action: onSetDefault ? "set as default" : "confirm",
                          ...isFastMode,
                        }),
                      jsxProd_default(KeyboardShortcutHint, {
                        chord: "down",
                        action: "list",
                        ...isFastMode,
                      }),
                      jsxProd_default(KeyboardShortcutHint, {
                        chord: "escape",
                        action: "cancel",
                        ...isFastMode,
                      }),
                    ],
                  })
                : isSearchMode
                  ? jsxProd_default_2(Byline, {
                      children: [
                        jsxProd_default(Text, {
                          children: "Type to filter",
                        }),
                        filteredOptions.length > 0 &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: ["enter", "down"],
                            action: "list",
                            ...isFastMode,
                          }),
                        jsxProd_default(KeyboardShortcutHint, {
                          chord: "escape",
                          action: "clear",
                          ...isFastMode,
                        }),
                      ],
                    })
                  : jsxProd_default_2(Byline, {
                      children: [
                        neverFlag,
                        focusedValue !== undefined &&
                          !isFocusedDisabled &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "enter",
                            action: onSetDefault ? "set as default" : "confirm",
                            ...isFastMode,
                          }),
                        focusedValue !== undefined &&
                          !isFocusedDisabled &&
                          onSetDefault &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "s",
                            action: "use this session only",
                            ...isFastMode,
                          }),
                        false,
                        jsxProd_default(ConfigurableShortcutHint, {
                          action: "select:cancel",
                          context: "Select",
                          fallback: "Esc",
                          description: "cancel",
                          ...isFastMode,
                        }),
                      ],
                    }),
          }),
        }),
    ],
  });
  if (!isStandaloneCommand) return content;
  return jsxProd_default(Pane, {
    color: "permission",
    children: content,
  });
}
//@ chunk-18hwfzwa.js:674941-675008 layout
function resolveModelOptionValue(value) {
  if (!value) return;
  return value === NO_PREFERENCE
    ? getDefaultMainLoopModel()
    : parseUserSpecifiedModel(noopModelOption(value)?.lead ?? value);
}
//@ chunk-18hwfzwa.js:675008-675259 fingerprint (2.1.88 match: EffortLevelIndicator, 1)
function EffortLevelIndicator(props) {
  let $ = useMemoCache(5);
  let { effort } = props;
  const color = effort ? "claude" : "subtle";
  const t2 = effort ?? "low";
  let children;
  if ($[0] !== t2) {
    children = effortLevelToSymbol(t2);
    $[0] = t2;
    $[1] = children;
  } else children = $[1];
  let t4;
  if ($[2] !== color || $[3] !== children) {
    t4 = jsxProd_default(Text, {
      color,
      children,
    });
    $[2] = color;
    $[3] = children;
    $[4] = t4;
  } else t4 = $[4];
  return t4;
}
//@ chunk-18hwfzwa.js:675259-675334 layout
function filterSupportedEffortLevels(includeMax, supportsMax, supportsXHigh) {
  return includeMax.filter(
    (level) => (level !== "max" || supportsMax) && (level !== "xhigh" || supportsXHigh),
  );
}
//@ chunk-18hwfzwa.js:675334-675552 callgraph-fingerprint (2.1.88 match: cycleEffortLevel, 0.647)
function cycleEffortLevel(currentLevel, direction, includeMax, supportsMax, supportsXHigh) {
  let levels = filterSupportedEffortLevels(includeMax, supportsMax, supportsXHigh);
  let effectiveLevel =
    (currentLevel === "max" && !supportsMax) || (currentLevel === "xhigh" && !supportsXHigh)
      ? "high"
      : currentLevel;
  let idx = levels.indexOf(effectiveLevel);
  let currentIndex = idx !== -1 ? idx : levels.length - 1;
  if (direction === "right") return levels[Math.min(currentIndex + 1, levels.length - 1)];
  else return levels[Math.max(currentIndex - 1, 0)];
}
//@ chunk-18hwfzwa.js:675552-675600 placement
function defaultEffortForModel(model) {
  let modelValue = resolveModelOptionValue(model) ?? getDefaultMainLoopModel();
  return getDefaultEffortLevel(modelValue);
}
//@ chunk-18hwfzwa.js:675889-676080 placement
function filterModelOptions(options, query) {
  if (!query) return options;
  let lower = query.toLowerCase();
  return options.filter(
    (option) =>
      (typeof option.label === "string" ? option.label : "").toLowerCase().includes(lower) ||
      stripAnsi(option.description ?? "")
        .toLowerCase()
        .includes(lower),
  );
}
//@ chunk-18hwfzwa.js:676080-676084 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:676080", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:773225-773250 sole-consumer
function selectFalseAppState(state) {
  return false;
}
//@ chunk-18hwfzwa.js:773250-773287 affinity
var LIVE_PREVIEW = "live-preview";
var LIVE_PREVIEW_WRAP_OPTIONS = {
  wrap: true,
};
//@ chunk-18hwfzwa.js:773287-773347 fingerprint (2.1.88 match: getDefaultEffortLevelForOption, 1)
function getDefaultEffortLevelForOption() {
  let defaultValue = useAppState(selectFalseAppState);
  usePluginInstallationStatus(
    LIVE_PREVIEW,
    "high",
    defaultValue ? true : null,
    PinnedBridgeNotice,
    LIVE_PREVIEW_WRAP_OPTIONS,
  );
}
//@ chunk-18hwfzwa.js:929532-929578 callgraph-fingerprint (2.1.88 match: _temp, 1)
function selectIsFastModeOn(s) {
  return isFastModeEnabled() ? s.fastMode : false;
}
export {
  selectIsFastModeOn,
  ModelPicker,
  resolveModelOptionValue,
  defaultEffortForModel,
  getDefaultEffortLevelForOption,
};
