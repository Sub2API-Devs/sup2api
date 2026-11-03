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
import { init_react_production, y, R, ce, Q, P, Uy } from "../../vendor/react/cjs/react.production.js";
import { useSearchInput } from "../hooks/useSearchInput.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { getCachedClientData } from "../utils/config.js";
import { parseUserSpecifiedModel } from "../utils/model/modelDisplay.js";
import { getCanonicalName } from "../utils/model/canonicalModelName.js";
import { FILLED_CIRCLE, WHITE_CIRCLE, WARNING_GLYPH } from "../utils/permissions/autoModeRulesPrompt.js";
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
import { qyn } from "../../vendor/lodash-es/upperFirst.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { isMaxEffortReminderEnabled } from "../utils/permissions/permissionSetup.js";
import { MAX_EFFORT_DESCRIPTION } from "../utils/settings/permissionRuleCarveOut.js";
import { Byline } from "./design-system/Byline.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { Pane } from "./design-system/Pane.js";
import { getDefaultMainLoopModel } from "../utils/model/modelFallback.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { effortLevelToSymbol } from "./EffortIndicator.js";
import { stripAnsi } from "../utils/stripAnsi.js";
import { usePluginInstallationStatus } from "../hooks/notifs/usePluginInstallationStatus.js";
import { PinnedBridgeNotice } from "./StatusNotices.js";

//@ chunk-18hwfzwa.js:666845-666849 sole-consumer
init_react_production();
//@ chunk-18hwfzwa.js:666849-666853 sole-consumer
init_react_production();
//@ chunk-18hwfzwa.js:666853-667539 sole-consumer
/**
 * 设置类列表的搜索模式钩子：按 / 进入搜索（settings:search 键绑定），Ctrl+N 或空串退格退出；返回 isSearchMode、query、光标与键盘/粘贴处理函数。
 */
function useSettingsSearchMode({ canEnter, startInSearchMode = false }) {
  let D = canEnter && startInSearchMode;
  let [L, ee] = y(D);
  let searchModeRef = R(D);
  let Re = () => {
    searchModeRef.current = false;
    ee(false);
  };
  let { query, cursorOffset, handleKeyDown, handlePaste } = useSearchInput({
    isActive: true,
    backspaceExitsOnEmpty: !D,
    onExit: Re,
  });
  let enterSearchMode = ce(() => {
    searchModeRef.current = true;
    ee(true);
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
      isActive: canEnter && !L,
    },
  );
  return {
    isSearchMode: L,
    query,
    cursorOffset,
    handleKeyDown: (event) => {
      if (event.defaultPrevented) return;
      if (searchModeRef.current) {
        if (event.ctrl && !event.meta && event.key === "n") {
          event.preventDefault();
          Re();
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
    handlePaste: (At) => {
      if (searchModeRef.current) handlePaste(At);
    },
    enterSearchMode,
  };
}
//@ chunk-18hwfzwa.js:667539-667752 sole-consumer
function getModelNotices() {
  let modelNotices = getCachedClientData()?.model_notices;
  if (typeof modelNotices !== "object" || modelNotices === null || Array.isArray(modelNotices)) return {};
  let x = {};
  for (let [key, value] of Object.entries(modelNotices))
    if (key.trim().length > 0 && typeof value === "string" && value.length > 0) x[key] = value;
  return x;
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
//@ chunk-18hwfzwa.js:668074-668101 fingerprint = NO_PREFERENCE (1)
var NO_PREFERENCE = "__NO_PREFERENCE__";
//@ chunk-18hwfzwa.js:668101-668112 layout
var MODEL_PICKER_CHROME_ROWS = 14;
//@ chunk-18hwfzwa.js:668112-674941 fingerprint = ModelPicker (0.441)
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
  let rt = useAppState((is) => (isFastModeEnabled() ? is.fastMode : false));
  let [kt] = y(rt ?? false);
  let At = Q(() => options ?? getModelOptionsWithTelemetry(kt), [options, kt]);
  let forceRender = useForceRender();
  let settingsState = useSettingsState();
  let Et = Q(
    () => getModelSwitchTarget(sessionModel, initial),
    [sessionModel, initial, forceRender, settingsState],
  );
  let Dt = Et ?? initial;
  let Lt = Dt === null ? NO_PREFERENCE : (findMatchingOptionValue(At, Dt) ?? Dt);
  let [oo, Xt, io] = useLatestState(Lt);
  let [so] = y({
    current: Dt,
    value: Lt,
    sessionOverride: Et,
  });
  let [po] = useTheme();
  let setAppState = useTerminalFocus();
  let exitState = useIsScreenReaderEnabled();
  let bo = false;
  let Ao = exitState ? true : false;
  let Bo = false;
  let Ro = false;
  let isFastMode = stableEmptyObject(false);
  let { isSearchMode, query, cursorOffset, handleKeyDown, handlePaste, enterSearchMode } =
    useSettingsSearchMode({
      canEnter: false,
      startInSearchMode: true,
    });
  let effortValue = R(false);
  P(() => {
    if (query !== "" && !effortValue.current) {
      effortValue.current = true;
      logFeatureOk("model_picker_search");
    }
  }, [query]);
  let kn = 0;
  let Fn = isFastModeEnabled() && (showFastModeNotice || (isFastModeAvailable() && !isFastModeCooldown()));
  let bn = Fn ? 3 : 0;
  let Go = Et !== null ? 3 : 0;
  let max = Math.max(2, Math.min(10, Math.floor((rows - MODEL_PICKER_CHROME_ROWS - kn - bn - Go) / 2)));
  let [, Mn, Xo] = useLatestState(false);
  let Sn = useAppState((is) =>
    resolveEffortLevel(is, undefined, {
      withHold: false,
    }),
  );
  let sessionEffort = useAppState((is) => is.sessionEffort);
  let settingsEffortTable = useAppState((is) => is.settingsEffortTable);
  let ultracode = useAppState((is) => is.ultracode);
  let [cn, Dn, wn] = useLatestState(Sn !== undefined ? normalizeEffortLevel(Sn) : undefined);
  let mr = Q(() => {
    let is = [];
    for (let [Ci, oi, Oi] of [
      [so.current, so.value, "Current model"],
      [
        so.sessionOverride === null ? null : initial,
        initial === null ? NO_PREFERENCE : (findMatchingOptionValue(At, initial) ?? initial),
        "Base model",
      ],
    ])
      if (
        Ci !== null &&
        !At.some((Hi) => Hi.value === oi) &&
        !is.some((Hi) => Hi.value === Ci) &&
        isModelAllowed(Ci)
      )
        is.push({
          value: Ci,
          label: modelDisplayString(Ci),
          description: Oi,
        });
    if (is.length === 0) return At;
    let index = At.findIndex((Ci) => Ci.disabled === true);
    if (index === -1) return [...At, ...is];
    return [...At.slice(0, index), ...is, ...At.slice(index)];
  }, [At, so, initial]);
  let Kn = Q(
    () =>
      mr.map((is) => {
        let ws = is.value === null ? NO_PREFERENCE : is.value;
        let modelOptionValue = resolveModelOptionValue(ws);
        let oi = modelOptionValue ? findModelNotice(modelOptionValue) : undefined;
        let description = (
          (oi ? (is.description ? `${is.description} \xB7 ${oi}` : oi) : is.description) ?? ""
        )
          .replaceAll("Opus 5.5", color("claude", po)("Opus 5.5"))
          .replace(/\$[\d.]+\/\$[\d.]+ per Mtok/, (opt) =>
            is.promoListPrice && supportsStrikethrough() && sequential.level > 0
              ? `${sequential.dim.strikethrough(is.promoListPrice)} ${opt}`
              : opt,
          );
        return {
          ...is,
          value: ws,
          description,
        };
      }),
    [mr, po],
  );
  let Wn = Q(() => filterModelOptions(Kn, query), [Kn, query]);
  let Fr = Q(
    () => (Wn.some((is) => is.value === so.value) ? so.value : (Wn[0]?.value ?? undefined)),
    [Wn, so.value],
  );
  let visibleCount = Math.min(max, Wn.length);
  let Un = Wn.some((is) => is.value === oo) ? oo : Fr;
  let found = Kn.find((opt_1) => opt_1.value === Un);
  let label = found?.label;
  let pr = found?.disabled === true;
  let focusedModel = resolveModelOptionValue(Un);
  P(() => {
    import("./chunk-1qx2v2vg.js").then((is) => is.fetchBootstrapData(storageV5, credentials));
  }, [storageV5, credentials]);
  let [, ur] = Uy((is) => is + 1, 0);
  P(() => {
    if (!focusedModel?.includes("application-inference-profile")) return;
    let is = false;
    getInferenceProfileBackingModel(focusedModel).then(() => {
      if (!is) ur();
    });
    return () => {
      is = true;
    };
  }, [focusedModel]);
  let { supportsEffort, supportsMax, supportsXHigh, defaultEffort, capLevels } =
    getEffortCapabilitiesForOption(Un);
  let Zr = (cn === "max" && !supportsMax) || (cn === "xhigh" && !supportsXHigh) ? "high" : cn;
  let wr = focusedModel && Zr !== undefined ? clampEffortToCap(Zr, focusedModel) : Zr;
  let onFocus = ce(
    (is) => {
      Xt(is);
      if (Xo()) return;
      let effortLevel = resolveEffortLevel(
        {
          sessionEffort,
          settingsEffortTable,
        },
        resolveModelOptionValue(is),
        {
          withHold: false,
        },
      );
      Dn(
        noopModelOption(is)?.effort ??
          (effortLevel !== undefined ? normalizeEffortLevel(effortLevel) : defaultEffortForModel(is)),
      );
    },
    [Xo, sessionEffort, settingsEffortTable, Xt, Dn],
  );
  let _r = ce(
    (direction) => {
      let ws = io();
      let found = Wn.find((value) => value.value === ws);
      if (found === undefined || found.disabled === true) return;
      let effortCapabilitiesForOption = getEffortCapabilitiesForOption(ws);
      if (!effortCapabilitiesForOption.supportsEffort) return;
      Dn((direction_2) =>
        cycleEffortLevel(
          direction_2 ?? effortCapabilitiesForOption.defaultEffort,
          direction,
          effortCapabilitiesForOption.capLevels,
          effortCapabilitiesForOption.supportsMax,
          effortCapabilitiesForOption.supportsXHigh,
        ),
      );
      Mn(true);
    },
    [Wn, io, Mn, Dn],
  );
  MessageActionsKeybindings(
    {
      "modelPicker:decreaseEffort": () => {
        if (isSearchMode && query !== "") return false;
        _r("left");
      },
      "modelPicker:increaseEffort": () => {
        if (isSearchMode && query !== "") return false;
        _r("right");
      },
      "modelPicker:thisSessionOnly": () => {
        if (isSearchMode) return false;
        if (!onSetDefault) return;
        let is = io();
        let found = Wn.find((prev) => prev.value === is);
        if (found === undefined) return;
        if (found.disabled === true) return;
        fr(found.value);
      },
    },
    {
      context: "ModelPicker",
    },
  );
  function fr(value_0) {
    let persistable = resolveModelOptionValue(value_0);
    let Ci = wn();
    let oi = Xo();
    let Oi = persistable && Ci !== undefined ? clampEffortToCap(Ci, persistable) : Ci;
    logEvent("tengu_model_command_menu_effort", {
      effort: fromEnumOpt(Oi),
      toggled: oi,
    });
    let selectedEffort = oi && persistable && modelSupportsEffort(persistable) ? Oi : undefined;
    if (value_0 === NO_PREFERENCE) {
      onSelect(null, selectedEffort);
      return;
    }
    onSelect(value_0, selectedEffort);
  }
  let globalExitKeybindings = useGlobalExitKeybindings(onCancel, undefined, isStandaloneCommand === true);
  function Yr(prev_0) {
    if (onSetDefault) onSetDefault(prev_0 === NO_PREFERENCE ? null : prev_0);
    fr(prev_0);
  }
  function Er(event) {
    if (
      !event.defaultPrevented &&
      isSearchMode &&
      (event.name === "return" ||
        event.name === "down" ||
        (event.ctrl && !event.meta && event.key === "n")) &&
      Wn.length === 0
    ) {
      event.preventDefault();
      return;
    }
    if (!event.defaultPrevented && isSearchMode && query === "") {
      if (event.name === "return") {
        event.preventDefault();
        let found = Wn.find((Ci) => Ci.value === io());
        if (found !== undefined && !found.disabled) Yr(found.value);
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
  let Vr = focusedModel && isUltracodeActive(ultracode, focusedModel) ? " \xB7 Ultracode on (/effort)" : "";
  let ms = wr;
  let Xs = false;
  let Ls = jsxProd_default_2(Box, {
    flexDirection: "column",
    tabIndex: 0,
    autoFocus: true,
    onKeyDown: Er,
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
              Et !== null &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [
                    "Currently using ",
                    modelDisplayString(Et),
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
                    defaultValue: Lt,
                    selectedValue: Lt,
                    defaultFocusValue: Fr,
                    options: Wn,
                    columnSizingOptions: Kn,
                    onChange: Yr,
                    onFocus,
                    onUpFromFirstItem: undefined,
                    onCancel: () => onCancel?.(),
                    visibleOptionCount: visibleCount,
                    hiddenBelowUnit: "model",
                    isDisabled: isSearchMode,
                  }),
                  query !== "" &&
                    Wn.length === 0 &&
                    jsxProd_default(HintText, {
                      children: `No models match "${query}"`,
                    }),
                ],
              }),
            ],
          }),
          jsxProd_default(Ratchet, {
            children:
              Un !== undefined &&
              !pr &&
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
                              effort: wr,
                            }),
                            " ",
                            wr === "xhigh" ? "xHigh" : wr ? qyn(wr) : "",
                            " ",
                            "effort",
                            wr === defaultEffort ? " (default)" : "",
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
                            Vr,
                          ],
                        }),
                        ms === "max"
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
          Fn
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
                      Xs,
                      Un !== undefined &&
                        !pr &&
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
                        Wn.length > 0 &&
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
                        Xs,
                        Un !== undefined &&
                          !pr &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "enter",
                            action: onSetDefault ? "set as default" : "confirm",
                            ...isFastMode,
                          }),
                        Un !== undefined &&
                          !pr &&
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
  if (!isStandaloneCommand) return Ls;
  return jsxProd_default(Pane, {
    color: "permission",
    children: Ls,
  });
}
//@ chunk-18hwfzwa.js:674941-675008 layout
function resolveModelOptionValue(value) {
  if (!value) return;
  return value === NO_PREFERENCE
    ? getDefaultMainLoopModel()
    : parseUserSpecifiedModel(noopModelOption(value)?.lead ?? value);
}
//@ chunk-18hwfzwa.js:675008-675259 fingerprint = EffortLevelIndicator (1)
function EffortLevelIndicator(props) {
  let $ = w(5);
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
function filterSupportedEffortLevels(includeMax, x, D) {
  return includeMax.filter((L) => (L !== "max" || x) && (L !== "xhigh" || D));
}
//@ chunk-18hwfzwa.js:675334-675552 callgraph-fingerprint = cycleEffortLevel (0.647)
function cycleEffortLevel(h, direction, includeMax, supportsMax, supportsXHigh) {
  let levels = filterSupportedEffortLevels(includeMax, supportsMax, supportsXHigh);
  let Re = (h === "max" && !supportsMax) || (h === "xhigh" && !supportsXHigh) ? "high" : h;
  let idx = levels.indexOf(Re);
  let currentIndex = idx !== -1 ? idx : levels.length - 1;
  if (direction === "right") return levels[Math.min(currentIndex + 1, levels.length - 1)];
  else return levels[Math.max(currentIndex - 1, 0)];
}
//@ chunk-18hwfzwa.js:675552-675600 placement
function defaultEffortForModel(h) {
  let x = resolveModelOptionValue(h) ?? getDefaultMainLoopModel();
  return getDefaultEffortLevel(x);
}
//@ chunk-18hwfzwa.js:675889-676080 placement
function filterModelOptions(h, query) {
  if (!query) return h;
  let lower = query.toLowerCase();
  return h.filter(
    (L) =>
      (typeof L.label === "string" ? L.label : "").toLowerCase().includes(lower) ||
      stripAnsi(L.description ?? "")
        .toLowerCase()
        .includes(lower),
  );
}
//@ chunk-18hwfzwa.js:676080-676084 placement
init_react_production();
//@ chunk-18hwfzwa.js:773225-773250 sole-consumer
function selectFalseAppState(x) {
  return false;
}
//@ chunk-18hwfzwa.js:773250-773287 affinity
var LIVE_PREVIEW = "live-preview";
var LIVE_PREVIEW_WRAP_OPTIONS = {
  wrap: true,
};
//@ chunk-18hwfzwa.js:773287-773347 fingerprint = getDefaultEffortLevelForOption (1)
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
//@ chunk-18hwfzwa.js:929532-929578 callgraph-fingerprint = _temp (1)
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
