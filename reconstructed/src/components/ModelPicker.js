/**
 * components/ModelPicker.tsx
 *
 * /model 选择器：模型列表（含 1M 上下文、Fast 等变体）、effort 等级调节与默认值、搜索。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ModelPicker.tsx
 * pieces: chunk-18hwfzwa.js (19)
 * attribution: sole-consumer 8, fingerprint 4, layout 3, callgraph-fingerprint 2, placement 1, affinity 1
 */
import { j, y, R, ce, Q, P, Uy } from "../../vendor/react/cjs/react.production.js";
import { useSearchInput } from "../hooks/useSearchInput.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { getCachedClientData } from "../utils/config.js";
import { parseUserSpecifiedModel } from "../utils/model/modelDisplay.js";
import { getCanonicalName } from "../utils/model/canonicalModelName.js";
import { FILLED_CIRCLE, WHITE_CIRCLE, Gg } from "../utils/permissions/autoModeRulesPrompt.js";
import { Me, useTheme } from "./design-system/ThemeProvider.js";
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
import { qd } from "../hooks/useSettings.js";
import { getModelSwitchTarget } from "../utils/model/modelSwitchHooks.js";
import { useLatestState } from "./CustomSelect/option-map.js";
import { useTerminalFocus } from "../ink/hooks/use-terminal-focus.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { nd } from "../utils/stableEmptyObject.js";
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
import { filterModelOptions } from "./_new/filterModelOptions.js";
import { getInferenceProfileBackingModel } from "../utils/model/bedrock.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { useGlobalExitKeybindings } from "../keybindings/useKeybinding.js";
import { r, e, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
import { usePluginInstallationStatus } from "../hooks/notifs/usePluginInstallationStatus.js";
import { D2e } from "./StatusNotices.js";

//@ chunk-18hwfzwa.js:666845-666849 sole-consumer
j();
//@ chunk-18hwfzwa.js:666849-666853 sole-consumer
j();
/**
 * 设置类列表的搜索模式钩子：按 / 进入搜索（settings:search 键绑定），Ctrl+N 或空串退格退出；返回 isSearchMode、query、光标与键盘/粘贴处理函数。
 */
//@ chunk-18hwfzwa.js:666853-667539 sole-consumer
function useSettingsSearchMode({ canEnter: canEnter, startInSearchMode: startInSearchMode = !1 }) {
  let D = canEnter && startInSearchMode,
    [L, ee] = y(D),
    searchModeRef = R(D),
    Re = () => {
      ((searchModeRef.current = !1), ee(!1));
    },
    {
      query: query,
      cursorOffset: cursorOffset,
      handleKeyDown: handleKeyDown,
      handlePaste: handlePaste,
    } = useSearchInput({ isActive: !0, backspaceExitsOnEmpty: !D, onExit: Re }),
    enterSearchMode = ce(() => {
      ((searchModeRef.current = !0), ee(!0));
    }, []);
  return (
    MessageActionsKeybindings(
      {
        "settings:search": () => {
          if (searchModeRef.current) return !1;
          enterSearchMode();
        },
      },
      { context: "Settings", isActive: canEnter && !L },
    ),
    {
      isSearchMode: L,
      query: query,
      cursorOffset: cursorOffset,
      handleKeyDown: (At) => {
        if (At.defaultPrevented) return;
        if (searchModeRef.current) {
          if (At.ctrl && !At.meta && At.key === "n") {
            (At.preventDefault(), Re());
            return;
          }
          handleKeyDown(At);
          return;
        }
        if (!canEnter) return;
        if (At.key === "/" && !At.ctrl && !At.meta) (At.preventDefault(), enterSearchMode());
      },
      handlePaste: (At) => {
        if (searchModeRef.current) handlePaste(At);
      },
      enterSearchMode: enterSearchMode,
    }
  );
}
//@ chunk-18hwfzwa.js:667539-667752 sole-consumer
function getModelNotices() {
  let h = getCachedClientData()?.model_notices;
  if (typeof h !== "object" || h === null || Array.isArray(h)) return {};
  let x = {};
  for (let [D, L] of Object.entries(h))
    if (D.trim().length > 0 && typeof L === "string" && L.length > 0) x[D] = L;
  return x;
}
/**
 * 在服务端下发的 model_notices 里查找与给定模型匹配的提示（按原名、解析后名、规范名或包含关系，忽略大小写）。
 */
//@ chunk-18hwfzwa.js:667752-668017 sole-consumer
function findModelNotice(h) {
  let x = getModelNotices();
  if (Object.keys(x).length === 0) return;
  let lower = h.toLowerCase(),
    lower_2 = parseUserSpecifiedModel(h).toLowerCase(),
    lower_3 = getCanonicalName(lower_2, { identity: !0 }).toLowerCase();
  for (let [ke, Re] of Object.entries(x)) {
    let lower_4 = ke.toLowerCase();
    if (lower_4 === lower || lower_4 === lower_2 || lower_4 === lower_3 || lower_2.includes(lower_4))
      return Re;
  }
  return;
}
//@ chunk-18hwfzwa.js:668017-668043 sole-consumer
function qor() {
  return FILLED_CIRCLE;
}
//@ chunk-18hwfzwa.js:668043-668074 sole-consumer
function $or() {
  return ` ${WHITE_CIRCLE}`;
}
//@ chunk-18hwfzwa.js:668074-668101 fingerprint = NO_PREFERENCE (1)
var NO_PREFERENCE = "__NO_PREFERENCE__";
//@ chunk-18hwfzwa.js:668101-668112 layout
var uQe = 14;
/**
 * /model 选择器：列出可用模型选项（默认/Opus/Sonnet/Haiku 及 1M、Fast 变体），左右键调节 effort（low/medium/high/xhigh/max），显示当前模型与基础模型，支持搜索。
 */
//@ chunk-18hwfzwa.js:668112-674941 fingerprint = ModelPicker (0.441)
function ModelPicker({
  initial: initial,
  sessionModel: sessionModel,
  onSelect: onSelect,
  onSetDefault: onSetDefault,
  onCancel: onCancel,
  isStandaloneCommand: isStandaloneCommand,
  showFastModeNotice: showFastModeNotice,
  headerText: headerText,
  options: options,
}) {
  let { storageV5: storageV5, credentials: credentials } = Me(),
    { rows: rows } = useScrollViewportSize(useTerminalSize()),
    rt = useAppState((is) => (isFastModeEnabled() ? is.fastMode : !1)),
    [kt] = y(rt ?? !1),
    At = Q(() => options ?? getModelOptionsWithTelemetry(kt), [options, kt]),
    It = useForceRender(),
    Ot = qd(),
    Et = Q(() => getModelSwitchTarget(sessionModel, initial), [sessionModel, initial, It, Ot]),
    Dt = Et ?? initial,
    Lt = Dt === null ? NO_PREFERENCE : (findMatchingOptionValue(At, Dt) ?? Dt),
    [oo, Xt, io] = useLatestState(Lt),
    [so] = y({ current: Dt, value: Lt, sessionOverride: Et }),
    [po] = useTheme(),
    setAppState = useTerminalFocus(),
    exitState = useIsScreenReaderEnabled(),
    bo = !1,
    Ao = exitState ? !0 : !1,
    Bo = !1,
    Ro = !1,
    isFastMode = nd(!1),
    {
      isSearchMode: isSearchMode,
      query: query,
      cursorOffset: cursorOffset,
      handleKeyDown: handleKeyDown,
      handlePaste: handlePaste,
      enterSearchMode: enterSearchMode,
    } = useSettingsSearchMode({ canEnter: !1, startInSearchMode: !0 }),
    effortValue = R(!1);
  P(() => {
    if (query !== "" && !effortValue.current)
      ((effortValue.current = !0), logFeatureOk("model_picker_search"));
  }, [query]);
  let kn = 0,
    Fn = isFastModeEnabled() && (showFastModeNotice || (isFastModeAvailable() && !isFastModeCooldown())),
    bn = Fn ? 3 : 0,
    Go = Et !== null ? 3 : 0,
    max = Math.max(2, Math.min(10, Math.floor((rows - uQe - kn - bn - Go) / 2))),
    [, Mn, Xo] = useLatestState(!1),
    Sn = useAppState((is) => resolveEffortLevel(is, void 0, { withHold: !1 })),
    sessionEffort = useAppState((is) => is.sessionEffort),
    settingsEffortTable = useAppState((is) => is.settingsEffortTable),
    ultracode = useAppState((is) => is.ultracode),
    [cn, Dn, wn] = useLatestState(Sn !== void 0 ? normalizeEffortLevel(Sn) : void 0),
    mr = Q(() => {
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
          is.push({ value: Ci, label: modelDisplayString(Ci), description: Oi });
      if (is.length === 0) return At;
      let index = At.findIndex((Ci) => Ci.disabled === !0);
      if (index === -1) return [...At, ...is];
      return [...At.slice(0, index), ...is, ...At.slice(index)];
    }, [At, so, initial]),
    Kn = Q(
      () =>
        mr.map((is) => {
          let ws = is.value === null ? NO_PREFERENCE : is.value,
            Ci = Ow(ws),
            oi = Ci ? findModelNotice(Ci) : void 0,
            replaced = ((oi ? (is.description ? `${is.description} \xB7 ${oi}` : oi) : is.description) ?? "")
              .replaceAll("Opus 5.5", color("claude", po)("Opus 5.5"))
              .replace(/\$[\d.]+\/\$[\d.]+ per Mtok/, (opt) =>
                is.promoListPrice && supportsStrikethrough() && sequential.level > 0
                  ? `${sequential.dim.strikethrough(is.promoListPrice)} ${opt}`
                  : opt,
              );
          return { ...is, value: ws, description: replaced };
        }),
      [mr, po],
    ),
    Wn = Q(() => filterModelOptions(Kn, query), [Kn, query]),
    Fr = Q(
      () => (Wn.some((is) => is.value === so.value) ? so.value : (Wn[0]?.value ?? void 0)),
      [Wn, so.value],
    ),
    visibleCount = Math.min(max, Wn.length),
    Un = Wn.some((is) => is.value === oo) ? oo : Fr,
    found = Kn.find((opt_1) => opt_1.value === Un),
    or = found?.label,
    pr = found?.disabled === !0,
    focusedModel = Ow(Un);
  P(() => {
    import("./chunk-1qx2v2vg.js").then((is) => is.fetchBootstrapData(storageV5, credentials));
  }, [storageV5, credentials]);
  let [, ur] = Uy((is) => is + 1, 0);
  P(() => {
    if (!focusedModel?.includes("application-inference-profile")) return;
    let is = !1;
    return (
      getInferenceProfileBackingModel(focusedModel).then(() => {
        if (!is) ur();
      }),
      () => {
        is = !0;
      }
    );
  }, [focusedModel]);
  let {
      supportsEffort: supportsEffort,
      supportsMax: supportsMax,
      supportsXHigh: supportsXHigh,
      defaultEffort: defaultEffort,
      capLevels: capLevels,
    } = getEffortCapabilitiesForOption(Un),
    Zr = (cn === "max" && !supportsMax) || (cn === "xhigh" && !supportsXHigh) ? "high" : cn,
    wr = focusedModel && Zr !== void 0 ? clampEffortToCap(Zr, focusedModel) : Zr,
    zr = ce(
      (is) => {
        if ((Xt(is), Xo())) return;
        let ws = resolveEffortLevel(
          { sessionEffort: sessionEffort, settingsEffortTable: settingsEffortTable },
          Ow(is),
          { withHold: !1 },
        );
        Dn(noopModelOption(is)?.effort ?? (ws !== void 0 ? normalizeEffortLevel(ws) : Hme(is)));
      },
      [Xo, sessionEffort, settingsEffortTable, Xt, Dn],
    ),
    _r = ce(
      (is) => {
        let ws = io(),
          found = Wn.find((value) => value.value === ws);
        if (found === void 0 || found.disabled === !0) return;
        let oi = getEffortCapabilitiesForOption(ws);
        if (!oi.supportsEffort) return;
        (Dn((direction) =>
          cycleEffortLevel(direction ?? oi.defaultEffort, is, oi.capLevels, oi.supportsMax, oi.supportsXHigh),
        ),
          Mn(!0));
      },
      [Wn, io, Mn, Dn],
    );
  MessageActionsKeybindings(
    {
      "modelPicker:decreaseEffort": () => {
        if (isSearchMode && query !== "") return !1;
        _r("left");
      },
      "modelPicker:increaseEffort": () => {
        if (isSearchMode && query !== "") return !1;
        _r("right");
      },
      "modelPicker:thisSessionOnly": () => {
        if (isSearchMode) return !1;
        if (!onSetDefault) return;
        let is = io(),
          found = Wn.find((prev) => prev.value === is);
        if (found === void 0) return;
        if (found.disabled === !0) return;
        fr(found.value);
      },
    },
    { context: "ModelPicker" },
  );
  function fr(value_0) {
    let persistable = Ow(value_0),
      Ci = wn(),
      oi = Xo(),
      Oi = persistable && Ci !== void 0 ? clampEffortToCap(Ci, persistable) : Ci;
    logEvent("tengu_model_command_menu_effort", { effort: fromEnumOpt(Oi), toggled: oi });
    let Hi = oi && persistable && modelSupportsEffort(persistable) ? Oi : void 0;
    if (value_0 === NO_PREFERENCE) {
      onSelect(null, Hi);
      return;
    }
    onSelect(value_0, Hi);
  }
  let $r = useGlobalExitKeybindings(onCancel, void 0, isStandaloneCommand === !0);
  function Yr(prev_0) {
    if (onSetDefault) onSetDefault(prev_0 === NO_PREFERENCE ? null : prev_0);
    fr(prev_0);
  }
  function Er(is) {
    if (
      !is.defaultPrevented &&
      isSearchMode &&
      (is.name === "return" || is.name === "down" || (is.ctrl && !is.meta && is.key === "n")) &&
      Wn.length === 0
    ) {
      is.preventDefault();
      return;
    }
    if (!is.defaultPrevented && isSearchMode && query === "") {
      if (is.name === "return") {
        is.preventDefault();
        let found = Wn.find((Ci) => Ci.value === io());
        if (found !== void 0 && !found.disabled) Yr(found.value);
        return;
      }
      if (is.name === "escape") {
        (is.preventDefault(), onCancel?.());
        return;
      }
    }
    handleKeyDown(is);
  }
  let Vr = focusedModel && isUltracodeActive(ultracode, focusedModel) ? " \xB7 Ultracode on (/effort)" : "",
    ms = wr,
    Xs = !1,
    Ls = r(Box, {
      flexDirection: "column",
      tabIndex: 0,
      autoFocus: !0,
      onKeyDown: Er,
      onPaste: handlePaste,
      children: [
        r(Box, {
          flexDirection: "column",
          children: [
            r(Box, {
              marginBottom: 1,
              flexDirection: "column",
              children: [
                e(Text, { color: "remember", bold: !0, children: "Select model" }),
                (headerText !== void 0 || !0) &&
                  e(Text, {
                    dimColor: !0,
                    children:
                      headerText ??
                      "Switch between Claude models. Your pick becomes the default for new sessions. For other/previous model names, specify with --model.",
                  }),
                Et !== null &&
                  r(Text, {
                    dimColor: !0,
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
            r(Box, {
              flexDirection: "column",
              marginBottom: 1,
              children: [
                !1,
                r(Ratchet, {
                  restartKey: max,
                  children: [
                    e(ModelSelector, {
                      defaultValue: Lt,
                      selectedValue: Lt,
                      defaultFocusValue: Fr,
                      options: Wn,
                      columnSizingOptions: Kn,
                      onChange: Yr,
                      onFocus: zr,
                      onUpFromFirstItem: void 0,
                      onCancel: () => onCancel?.(),
                      visibleOptionCount: visibleCount,
                      hiddenBelowUnit: "model",
                      isDisabled: isSearchMode,
                    }),
                    query !== "" &&
                      Wn.length === 0 &&
                      e(HintText, { children: `No models match "${query}"` }),
                  ],
                }),
              ],
            }),
            e(Ratchet, {
              children:
                Un !== void 0 &&
                !pr &&
                e(Box, {
                  marginBottom: 1,
                  flexDirection: "column",
                  children: supportsEffort
                    ? r(Fragment, {
                        children: [
                          r(Text, {
                            dimColor: !0,
                            children: [
                              e(EffortLevelIndicator, { effort: wr }),
                              " ",
                              wr === "xhigh" ? "xHigh" : wr ? qyn(wr) : "",
                              " ",
                              "effort",
                              wr === defaultEffort ? " (default)" : "",
                              (!isSearchMode || query === "") &&
                                r(Text, {
                                  color: "subtle",
                                  children: [
                                    " ",
                                    e(KeyboardShortcutHint, { chord: ["left", "right"], action: "adjust" }),
                                  ],
                                }),
                              Vr,
                            ],
                          }),
                          ms === "max"
                            ? isMaxEffortReminderEnabled()
                              ? r(Text, { color: "warning", children: [Gg, " ", MAX_EFFORT_DESCRIPTION] })
                              : e(Text, { color: "subtle", dimColor: !1, children: MAX_EFFORT_DESCRIPTION })
                            : null,
                        ],
                      })
                    : e(Box, {
                        minHeight: void 0,
                        children: r(Text, {
                          color: "subtle",
                          dimColor: !1,
                          children: [
                            e(EffortLevelIndicator, { effort: void 0 }),
                            " ",
                            "Effort not supported",
                            or ? ` for ${or}` : "",
                          ],
                        }),
                      }),
                }),
            }),
            Fn
              ? showFastModeNotice
                ? e(Box, {
                    marginBottom: 1,
                    children: r(Text, {
                      dimColor: !0,
                      children: [
                        "Fast mode is ",
                        e(Text, { bold: !0, children: "ON" }),
                        " and available with",
                        " ",
                        defaultOpusLabel(),
                        " (/fast). Switching to other models turns off fast mode.",
                      ],
                    }),
                  })
                : e(Box, {
                    marginBottom: 1,
                    children: r(Text, {
                      dimColor: !0,
                      children: [
                        "Use ",
                        e(Text, { bold: !0, children: "/fast" }),
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
          e(Ratchet, {
            children: e(Text, {
              dimColor: !0,
              italic: !1,
              children: $r.pending
                ? `Press ${$r.keyName} again to ${onCancel ? "cancel" : "exit"}`
                : isSearchMode && query === ""
                  ? r(Byline, {
                      children: [
                        e(Text, { children: "Type to search" }),
                        Xs,
                        Un !== void 0 &&
                          !pr &&
                          e(KeyboardShortcutHint, {
                            chord: "enter",
                            action: onSetDefault ? "set as default" : "confirm",
                            ...isFastMode,
                          }),
                        e(KeyboardShortcutHint, { chord: "down", action: "list", ...isFastMode }),
                        e(KeyboardShortcutHint, { chord: "escape", action: "cancel", ...isFastMode }),
                      ],
                    })
                  : isSearchMode
                    ? r(Byline, {
                        children: [
                          e(Text, { children: "Type to filter" }),
                          Wn.length > 0 &&
                            e(KeyboardShortcutHint, {
                              chord: ["enter", "down"],
                              action: "list",
                              ...isFastMode,
                            }),
                          e(KeyboardShortcutHint, { chord: "escape", action: "clear", ...isFastMode }),
                        ],
                      })
                    : r(Byline, {
                        children: [
                          Xs,
                          Un !== void 0 &&
                            !pr &&
                            e(KeyboardShortcutHint, {
                              chord: "enter",
                              action: onSetDefault ? "set as default" : "confirm",
                              ...isFastMode,
                            }),
                          Un !== void 0 &&
                            !pr &&
                            onSetDefault &&
                            e(KeyboardShortcutHint, {
                              chord: "s",
                              action: "use this session only",
                              ...isFastMode,
                            }),
                          !1,
                          e(ConfigurableShortcutHint, {
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
  return e(Pane, { color: "permission", children: Ls });
}
//@ chunk-18hwfzwa.js:674941-675008 layout
function Ow(h) {
  if (!h) return;
  return h === NO_PREFERENCE
    ? getDefaultMainLoopModel()
    : parseUserSpecifiedModel(noopModelOption(h)?.lead ?? h);
}
//@ chunk-18hwfzwa.js:675008-675259 fingerprint = EffortLevelIndicator (1)
function EffortLevelIndicator(t0) {
  let $ = w(5),
    { effort: effort } = t0;
  const t1 = effort ? "claude" : "subtle",
    t2 = effort ?? "low";
  let ke;
  if ($[0] !== t2) ((ke = effortLevelToSymbol(t2)), ($[0] = t2), ($[1] = ke));
  else ke = $[1];
  let Re;
  if ($[2] !== t1 || $[3] !== ke)
    ((Re = e(Text, { color: t1, children: ke })), ($[2] = t1), ($[3] = ke), ($[4] = Re));
  else Re = $[4];
  return Re;
}
//@ chunk-18hwfzwa.js:675259-675334 layout
function b5t(h, x, D) {
  return h.filter((L) => (L !== "max" || x) && (L !== "xhigh" || D));
}
//@ chunk-18hwfzwa.js:675334-675552 callgraph-fingerprint = cycleEffortLevel (0.647)
function cycleEffortLevel(h, x, D, L, ee) {
  let ke = b5t(D, L, ee),
    Re = (h === "max" && !L) || (h === "xhigh" && !ee) ? "high" : h,
    idx = ke.indexOf(Re),
    He = idx !== -1 ? idx : ke.length - 1;
  if (x === "right") return ke[Math.min(He + 1, ke.length - 1)];
  else return ke[Math.max(He - 1, 0)];
}
//@ chunk-18hwfzwa.js:675552-675600 placement
function Hme(h) {
  let x = Ow(h) ?? getDefaultMainLoopModel();
  return getDefaultEffortLevel(x);
}
//@ chunk-18hwfzwa.js:773225-773250 sole-consumer
function g8t(x) {
  return !1;
}
//@ chunk-18hwfzwa.js:773250-773287 affinity
var LIVE_PREVIEW = "live-preview",
  E2e = { wrap: !0 };
//@ chunk-18hwfzwa.js:773287-773347 fingerprint = getDefaultEffortLevelForOption (1)
function getDefaultEffortLevelForOption() {
  let defaultValue = useAppState(g8t);
  usePluginInstallationStatus(LIVE_PREVIEW, "high", defaultValue ? !0 : null, D2e, E2e);
}
//@ chunk-18hwfzwa.js:929532-929578 callgraph-fingerprint = _temp (1)
function vuo(s) {
  return isFastModeEnabled() ? s.fastMode : !1;
}

export { Ow, Hme, vuo, ModelPicker, getDefaultEffortLevelForOption };
