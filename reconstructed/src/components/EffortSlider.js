/**
 * components/EffortSlider.tsx
 *
 * 2.1.316 新增：/effort 交互滑块（low…max、Ultracode 开关、仅本会话）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3rwvzn82.js (40)
 * attribution: placement 39, sole-consumer 1
 */
import { init_react_production, R, y, P, Kc } from "../../vendor/react/cjs/react.production.js";
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
import { w } from "../../vendor/react/compiler-runtime.js";
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
import {
  isSpecialEffortKeywordDisabled,
  isMaxEffortReminderEnabled,
} from "../utils/permissions/permissionSetup.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useShortcutDisplay } from "../keybindings/useKeybindingDisplay.js";
import { stableEmptyObject } from "../utils/stableEmptyObject.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { formatShortcutHint, KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { useGlobalExitKeybindings } from "../keybindings/useKeybinding.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../keybindings/useShortcutDisplay.js";
import { repeatString } from "../utils/stringUtils.js";
import { Title } from "./design-system/Title.js";
import { WARNING_GLYPH } from "../utils/permissions/autoModeRulesPrompt.js";
import { Byline } from "./design-system/Byline.js";
import { Pane } from "./design-system/Pane.js";
import { Select } from "./CustomSelect/selectTypeahead.js";

//@ chunk-3rwvzn82.js:14223-14227 placement
init_react_production();
//@ chunk-3rwvzn82.js:14227-14231 placement
init_react_production();
//@ chunk-3rwvzn82.js:14231-14262 placement
function arrayLength(U) {
  return U.length;
}
//@ chunk-3rwvzn82.js:14262-14350 placement
function renderSelectedBar(i, v) {
  return i.startsWith("\u2587")
    ? jsxProd_default(
        Text,
        {
          color: "permission",
          children: i,
        },
        v,
      )
    : i;
}
//@ chunk-3rwvzn82.js:14350-14384 placement
function selectUltracode(m) {
  return m.ultracode;
}
//@ chunk-3rwvzn82.js:14384-14418 placement
function selectUltracode_2(F) {
  return F.ultracode;
}
//@ chunk-3rwvzn82.js:14418-14471 placement
function selectCacheMissAck(O) {
  return O.cacheMissAckedAtOutputTokens;
}
//@ chunk-3rwvzn82.js:14471-14522 placement
function selectMode(E) {
  return E.toolPermissionContext.mode;
}
//@ chunk-3rwvzn82.js:14522-14577 placement
function selectCacheMissAck_2(il) {
  return il.cacheMissAckedAtOutputTokens;
}
//@ chunk-3rwvzn82.js:14577-14630 placement
function selectMode_2(cl) {
  return cl.toolPermissionContext.mode;
}
//@ chunk-3rwvzn82.js:14630-14666 placement
function selectUltracode_3(dl) {
  return dl.ultracode;
}
//@ chunk-3rwvzn82.js:14666-14689 placement
function returnFalse() {
  return false;
}
//@ chunk-3rwvzn82.js:14689-14715 placement
function not(ul) {
  return !ul;
}
//@ chunk-3rwvzn82.js:14715-14770 placement
function selectCacheMissAck_3(io) {
  return io.cacheMissAckedAtOutputTokens;
}
//@ chunk-3rwvzn82.js:14770-14823 placement
function selectMode_3(ln) {
  return ln.toolPermissionContext.mode;
}
//@ chunk-3rwvzn82.js:14823-14859 placement
function selectUltracode_4(ce) {
  return ce.ultracode;
}
//@ chunk-3rwvzn82.js:14859-14882 placement
function returnFalse_2() {
  return false;
}
//@ chunk-3rwvzn82.js:14882-14905 placement
function returnFalse_3() {
  return false;
}
//@ chunk-3rwvzn82.js:14998-15078 sole-consumer
async function applyEffortAndReport(u, l, setAppState, onDone, storageV5, f = true) {
  let m = await applyEffortCommand(u, l, setAppState, f, storageV5);
  onDone(m.message, ApplyEffortAndClose(m));
}
//@ chunk-3rwvzn82.js:15078-15136 placement
function levelChangedOnly(u) {
  return u.levelChanged || !u.ultracodeChanged;
}
//@ chunk-3rwvzn82.js:15136-15554 placement
async function applyEffortSelection(u, l, setAppState, onDone, storageV5, f = true) {
  let { level, ultracode, ultracodeChanged } = u;
  let p = [];
  let t = false;
  let U = false;
  if (levelChangedOnly(u)) {
    let i = await applyEffortCommand(
      level,
      {
        ...l,
        ultracodeConfirmed: ultracode,
      },
      setAppState,
      f,
      storageV5,
    );
    p.push(i.message);
    t = ApplyEffortAndClose(i);
    U = isUltracodeToggleAvailable() && i.effortUpdate !== undefined;
    if (U && ultracodeChanged && ultracode) p.push("Ultracode on");
  }
  if (ultracodeChanged && !U) {
    let i = await applyEffortCommand(
      ultracode ? "ultracode on" : "ultracode off",
      l,
      setAppState,
      f,
      storageV5,
    );
    p.push(p.length === 0 || !i.effortUpdate ? i.message : `Ultracode ${ultracode ? "on" : "off"}`);
  }
  onDone(p.join(" \xB7 "), t);
}
//@ chunk-3rwvzn82.js:15554-16836 placement
function EffortCommandView(props) {
  let I = w(29);
  let { args, route, ultracodeConfirmed, getMessages, onDone, storageV5 } = props;
  let route_2 = route === undefined ? "typed" : route;
  let queuedMessageText = useQueuedMessageText();
  let ultracode = useAppState(selectUltracode_2);
  let ackedAtOutputTokens = useAppState(selectCacheMissAck);
  let permissionMode = useAppState(selectMode);
  let model = useMainLoopModel();
  let setAppState = useSetAppState();
  let Y;
  if (I[0] !== args) {
    Y = parseEffortArg(args);
    I[0] = args;
    I[1] = Y;
  } else Y = I[1];
  let C = Y;
  let re;
  if (I[2] !== queuedMessageText || I[3] !== route_2 || I[4] !== ultracodeConfirmed || I[5] !== ultracode) {
    re = {
      effort: queuedMessageText,
      ultracode,
      ultracodeConfirmed,
      route: route_2,
    };
    I[2] = queuedMessageText;
    I[3] = route_2;
    I[4] = ultracodeConfirmed;
    I[5] = ultracode;
    I[6] = re;
  } else re = I[6];
  let b = R(re);
  let X;
  if (
    I[7] !== ackedAtOutputTokens ||
    I[8] !== queuedMessageText ||
    I[9] !== getMessages ||
    I[10] !== model ||
    I[11] !== permissionMode ||
    I[12] !== C
  ) {
    X = () =>
      C !== null &&
      shouldShowEffortNotice({
        target: C.value,
        current: queuedMessageText,
        model,
        permissionMode,
        messages: getMessages(),
        ackedAtOutputTokens,
        promptCacheMayBeWarm: isMainThreadSource(getMessages()),
      });
    I[7] = ackedAtOutputTokens;
    I[8] = queuedMessageText;
    I[9] = getMessages;
    I[10] = model;
    I[11] = permissionMode;
    I[12] = C;
    I[13] = X;
  } else X = I[13];
  let [ee, T] = y(X);
  let le;
  let D;
  if (
    I[14] !== args ||
    I[15] !== onDone ||
    I[16] !== ee ||
    I[17] !== setAppState ||
    I[18] !== storageV5 ||
    I[19] !== C
  ) {
    le = () => {
      if (ee && C !== null) {
        return;
      }
      applyEffortAndReport(args, b.current, setAppState, onDone, storageV5);
    };
    D = [ee, C, args, setAppState, onDone, storageV5];
    I[14] = args;
    I[15] = onDone;
    I[16] = ee;
    I[17] = setAppState;
    I[18] = storageV5;
    I[19] = C;
    I[20] = le;
    I[21] = D;
  } else {
    le = I[20];
    D = I[21];
  }
  P(le, D);
  if (ee && C !== null) {
    let onConfirm;
    if (I[22] === MEMO_CACHE_SENTINEL) {
      onConfirm = () => T(false);
      I[22] = onConfirm;
    } else onConfirm = I[22];
    let onCancel;
    if (I[23] !== queuedMessageText || I[24] !== onDone) {
      onCancel = () =>
        onDone(
          `Kept effort level as ${queuedMessageText !== undefined ? effortValueToString(queuedMessageText) : "auto"}`,
        );
      I[23] = queuedMessageText;
      I[24] = onDone;
      I[25] = onCancel;
    } else onCancel = I[25];
    let A;
    if (I[26] !== onCancel || I[27] !== C.value) {
      A = jsxProd_default(ModelEffortSwitchConfirm, {
        kind: "effort",
        model: null,
        effort: C.value,
        onConfirm,
        onCancel,
      });
      I[26] = onCancel;
      I[27] = C.value;
      I[28] = A;
    } else A = I[28];
    return A;
  }
  return null;
}
//@ chunk-3rwvzn82.js:16836-17222 placement
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
//@ chunk-3rwvzn82.js:17222-17511 placement
function computeEffortSliderLayout(u) {
  let min = Math.min(Math.max(u, 1), EFFORT_LEVEL_OPTIONS.length);
  let sliced = EFFORT_LEVEL_OPTIONS.slice(0, min);
  let sliced_2 = SLIDER_SEGMENT_CELLS.slice(0, min - 1);
  let trianglePositions = SLIDER_TICK_STEPS.slice(0, min);
  if (min === EFFORT_LEVEL_OPTIONS.length)
    return {
      levels: sliced,
      width: SLIDER_MAX_WIDTH,
      trianglePositions,
      spacers: sliced_2,
    };
  let f = labelOffsets(sliced, sliced_2);
  let width = Math.max(f[min - 1] + sliced[min - 1].label.length, SLIDER_TICK_WIDTH);
  return {
    levels: sliced,
    width,
    trianglePositions,
    spacers: sliced_2,
  };
}
//@ chunk-3rwvzn82.js:17511-17603 placement
function labelOffsets(u, l) {
  return u.map((o, a) => u.slice(0, a).reduce((acc, f, m) => acc + f.label.length + l[m], 0));
}
//@ chunk-3rwvzn82.js:17603-17665 placement
function hasEffortOverride(u) {
  return u !== undefined && isEffortCostShown() && effortCostRatio(u, getDefaultEffortLevel(u)) !== null;
}
//@ chunk-3rwvzn82.js:17665-17990 placement
function describeEffortLevel(u, l) {
  let defaultEffortLevel = getDefaultEffortLevel(u);
  if (l === "max" && modelSupportsMaxEffort(u)) {
    let price = effortCostRatio(u, "max");
    return price === null
      ? MAX_EFFORT_DESCRIPTION
      : `${MAX_EFFORT_DESCRIPTION} (${formatCostMultiplier(price)})`;
  }
  if (l === defaultEffortLevel)
    return getOrgDefaultEffort(u) === null
      ? "The default effort for this model"
      : "The default effort for this model, set by your organization";
  let price = effortCostRatio(u, l);
  return price === null
    ? ""
    : `${formatCostMultiplier(price)} the estimated cost of ${defaultEffortLevel} (the default)`;
}
//@ chunk-3rwvzn82.js:17990-18511 placement
/**
 * 计算当前模型可选的 effort 档位、组织默认值与上限说明，供 effort 滑块使用。
 */
function getEffortSliderModel(mainLoopModel) {
  let l = mainLoopModel ? getEffortCap(mainLoopModel) : null;
  let effortSliderLayout = computeEffortSliderLayout(l ? EFFORT_LEVELS.indexOf(l) + 1 : EFFORT_LEVELS.length);
  let a = mainLoopModel && hasEffortLevelsAboveCap(mainLoopModel) ? EFFORT_CAPPED_TEXT : undefined;
  let c = mainLoopModel ? getOrgOverriddenEffort(mainLoopModel) : null;
  let f =
    c !== null
      ? `Your organization starts new sessions on this model at ${c} effort.`
      : mainLoopModel && getOrgDefaultEffort(mainLoopModel) !== null
        ? `Your organization's default effort for this model is ${getDefaultEffortLevel(mainLoopModel)}.`
        : undefined;
  let filtered = [a, f].filter((p) => p !== undefined);
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
//@ chunk-3rwvzn82.js:18511-18994 placement
function EffortLevelLabel(props) {
  let c = w(9);
  let { level, selected } = props;
  let label = level.label;
  if (!selected) {
    let f;
    if (c[0] !== label) {
      f = jsxProd_default(Text, {
        dimColor: true,
        children: label,
      });
      c[0] = label;
      c[1] = f;
    } else f = c[1];
    return f;
  }
  if (level.color === "rainbow-animated") {
    let f;
    if (c[2] !== label) {
      f = jsxProd_default(ShimmerText, {
        text: label,
      });
      c[2] = label;
      c[3] = f;
    } else f = c[3];
    return f;
  }
  if (level.color === "autoAccept-shimmer") {
    let f;
    if (c[4] !== label) {
      f = jsxProd_default(ShimmerText_2, {
        text: label,
      });
      c[4] = label;
      c[5] = f;
    } else f = c[5];
    return f;
  }
  let f;
  if (c[6] !== level.color || c[7] !== label) {
    f = jsxProd_default(Text, {
      bold: true,
      color: level.color,
      children: label,
    });
    c[6] = level.color;
    c[7] = label;
    c[8] = f;
  } else f = c[8];
  return f;
}
//@ chunk-3rwvzn82.js:18994-19271 placement
function ShimmerText(props) {
  let f = w(5);
  let { text } = props;
  let prefersReducedMotion = usePrefersReducedMotion();
  let [, a] = useAnimationFrame(prefersReducedMotion ? null : 100);
  let floored = Math.floor(a / 100);
  let m;
  if (f[0] !== text) {
    m = [...text];
    f[0] = text;
    f[1] = m;
  } else m = f[1];
  let g;
  if (f[2] !== floored || f[3] !== m) {
    g = jsxProd_default(Text, {
      bold: true,
      children: m.map((children, p) =>
        jsxProd_default(
          Text,
          {
            color: getRainbowColor(p + floored),
            children,
          },
          p,
        ),
      ),
    });
    f[2] = floored;
    f[3] = m;
    f[4] = g;
  } else g = f[4];
  return g;
}
//@ chunk-3rwvzn82.js:19271-19676 placement = RARITY_COLORS (0.418)
/**
 * 文字逐字符"闪光"高亮动画组件。
 */
function ShimmerText_2(props) {
  let d = w(6);
  let { text, color } = props;
  let a = color === undefined ? "autoAccept" : color;
  let prefersReducedMotion = usePrefersReducedMotion();
  let [, f] = useAnimationFrame(prefersReducedMotion ? null : 100);
  let m = text.length + 4;
  let g = prefersReducedMotion ? SPINNER_FLAG_PRIORITY : Math.floor(f / 100) % m;
  let p;
  if (d[0] !== text) {
    p = [...text];
    d[0] = text;
    d[1] = p;
  } else p = d[1];
  let t;
  if (d[2] !== a || d[3] !== g || d[4] !== p) {
    t = jsxProd_default(Text, {
      bold: true,
      children: p.map((children, i) => {
        let v = i === g;
        let I = i === g - 1 || i === g + 1;
        return jsxProd_default(
          Text,
          {
            color: v ? ULTRACODE_HIGHLIGHT_COLOR : a,
            bold: v || I,
            children,
          },
          i,
        );
      }),
    });
    d[2] = a;
    d[3] = g;
    d[4] = p;
    d[5] = t;
  } else t = d[5];
  return t;
}
//@ chunk-3rwvzn82.js:19676-19899 placement
/**
 * 计算 effort 滑块的初始位置：先看环境变量覆盖或当前设定值，再取已应用/默认 effort 等级，找不到时用默认下标。
 */
function resolveInitialEffortIndex(mainLoopModel, queuedMessageText, o) {
  let a = getRemoteCaps() ? undefined : getEffortEnvOverride();
  let c = a === null ? undefined : (a ?? queuedMessageText);
  if (c !== undefined) {
    let index = o.levels.findIndex((level) => level.value === c);
    if (index !== -1) return index;
  }
  let f = getAppliedEffortLevel(mainLoopModel, c) ?? getDefaultEffortLevel(mainLoopModel);
  let index = o.levels.findIndex((level) => level.value === f);
  return index === -1 ? SLIDER_MIN_WIDTH : index;
}
//@ chunk-3rwvzn82.js:19899-19908 placement
var NO_SELECTION = -1;
//@ chunk-3rwvzn82.js:19908-20079 placement
function EffortSliderOrPicker(u) {
  let o = w(4);
  if (useIsScreenReaderEnabled()) {
    let a;
    if (o[0] !== u) {
      a = jsxProd_default(EffortPicker, {
        ...u,
      });
      o[0] = u;
      o[1] = a;
    } else a = o[1];
    return a;
  }
  let a;
  if (o[2] !== u) {
    a = jsxProd_default(EffortSlider, {
      ...u,
    });
    o[2] = u;
    o[3] = a;
  } else a = o[3];
  return a;
}
//@ chunk-3rwvzn82.js:20079-28776 placement
/**
 * /effort 交互滑块：在 low…max 间切换，支持 Ultracode 开关和"仅本会话"。
 */
function EffortSlider(props) {
  let t = w(170);
  let { getMessages, onDone, storageV5 } = props;
  let queuedMessageText = useQueuedMessageText();
  let ackedAtOutputTokens = useAppState(selectCacheMissAck_2);
  let permissionMode = useAppState(selectMode_2);
  let appState = useAppState(selectUltracode_3);
  let mainLoopModel = useMainLoopModel();
  let setAppState = useSetAppState();
  let U;
  if (t[0] !== mainLoopModel) {
    U = getEffortSliderModel(mainLoopModel);
    t[0] = mainLoopModel;
    t[1] = U;
  } else U = t[1];
  let i = U;
  let [v] = y(isSpecialEffortKeywordDisabled);
  let I;
  if (t[2] !== queuedMessageText || t[3] !== i || t[4] !== v || t[5] !== mainLoopModel) {
    I =
      v && isEffortUnset(queuedMessageText, mainLoopModel)
        ? NO_SELECTION
        : resolveInitialEffortIndex(mainLoopModel, queuedMessageText, i);
    t[2] = queuedMessageText;
    t[3] = i;
    t[4] = v;
    t[5] = mainLoopModel;
    t[6] = I;
  } else I = t[6];
  let Y = I;
  let [C, re] = y(Y);
  let min = Math.min(C, i.levels.length - 1);
  let X = min === NO_SELECTION;
  let ee;
  if (t[7] !== queuedMessageText || t[8] !== i || t[9] !== mainLoopModel) {
    ee = resolveInitialEffortIndex(mainLoopModel, queuedMessageText, i);
    t[7] = queuedMessageText;
    t[8] = i;
    t[9] = mainLoopModel;
    t[10] = ee;
  } else ee = t[10];
  let T = ee;
  let le;
  if (t[11] !== mainLoopModel) {
    le = isUltracodeAvailable(mainLoopModel);
    t[11] = mainLoopModel;
    t[12] = le;
  } else le = t[12];
  let D = le;
  let N = appState === true;
  let [x, A] = y(N);
  let { columns } = useTerminalSize();
  let chord = useShortcutDisplay("effortSlider:toggleUltracode", "EffortSlider", "tab");
  let [E] = y(returnFalse);
  let k;
  let rt;
  if (t[13] !== E || t[14] !== chord) {
    k = stableEmptyObject(E);
    rt = bunStringWidth(
      formatShortcutHint({
        chord,
        action: "toggle",
        ...k,
      }),
    );
    t[13] = E;
    t[14] = chord;
    t[15] = k;
    t[16] = rt;
  } else {
    k = t[15];
    rt = t[16];
  }
  let se = rt;
  let max = Math.max(SLIDER_LABEL_WIDTH, se);
  let _ = columns >= SLIDER_TOTAL_WIDTH + max - SLIDER_LABEL_WIDTH;
  let [M, Re] = y(null);
  let be;
  if (t[17] !== queuedMessageText || t[18] !== appState) {
    be = {
      effort: queuedMessageText,
      ultracode: appState,
      route: "slider",
    };
    t[17] = queuedMessageText;
    t[18] = appState;
    t[19] = be;
  } else be = t[19];
  let te = be;
  let ae = R(false);
  let io;
  if (
    t[20] !== ackedAtOutputTokens ||
    t[21] !== te ||
    t[22] !== queuedMessageText ||
    t[23] !== i.levels ||
    t[24] !== getMessages ||
    t[25] !== Y ||
    t[26] !== N ||
    t[27] !== X ||
    t[28] !== mainLoopModel ||
    t[29] !== onDone ||
    t[30] !== permissionMode ||
    t[31] !== min ||
    t[32] !== setAppState ||
    t[33] !== storageV5 ||
    t[34] !== x
  ) {
    io = function de(asDefault) {
      if (ae.current) {
        return;
      }
      let ce = {
        level: X ? "auto" : i.levels[min].value,
        levelChanged: min !== Y,
        ultracode: x,
        ultracodeChanged: x !== N,
      };
      let sn = shouldSaveEffortDefault({
        asDefault,
        levelChanged: ce.levelChanged,
        chosen: queuedMessageText,
        model: mainLoopModel,
      });
      if (
        levelChangedOnly(ce) &&
        shouldShowEffortNotice({
          target: ce.level === "auto" ? undefined : ce.level,
          current: queuedMessageText,
          model: mainLoopModel,
          permissionMode,
          messages: getMessages(),
          ackedAtOutputTokens,
          promptCacheMayBeWarm: isMainThreadSource(getMessages()),
        })
      ) {
        Re({
          choice: ce,
          persistAsDefault: sn,
        });
        return;
      }
      ae.current = true;
      applyEffortSelection(ce, te, setAppState, onDone, storageV5, sn);
    };
    t[20] = ackedAtOutputTokens;
    t[21] = te;
    t[22] = queuedMessageText;
    t[23] = i.levels;
    t[24] = getMessages;
    t[25] = Y;
    t[26] = N;
    t[27] = X;
    t[28] = mainLoopModel;
    t[29] = onDone;
    t[30] = permissionMode;
    t[31] = min;
    t[32] = setAppState;
    t[33] = storageV5;
    t[34] = x;
    t[35] = io;
  } else io = t[35];
  let de = io;
  let an;
  if (t[36] !== onDone) {
    an = function Te() {
      if (ae.current) {
        return;
      }
      ae.current = true;
      onDone("Cancelled");
    };
    t[36] = onDone;
    t[37] = an;
  } else an = t[37];
  let Te = an;
  let globalExitKeybindings = useGlobalExitKeybindings(Te, undefined, M === null);
  let cn;
  if (t[38] !== Te || t[39] !== de) {
    cn = function st(event) {
      if (event.key === "return") {
        event.preventDefault();
        de(true);
      } else if (event.key === "escape") {
        event.preventDefault();
        Te();
      }
    };
    t[38] = Te;
    t[39] = de;
    t[40] = cn;
  } else cn = t[40];
  let onKeyDown = cn;
  let at;
  if (t[41] !== T) {
    at = () => re((dn) => (dn === NO_SELECTION ? T : Math.max(0, dn - 1)));
    t[41] = T;
    t[42] = at;
  } else at = t[42];
  let it;
  if (t[43] !== i.levels.length || t[44] !== T) {
    it = () => re((fn) => (fn === NO_SELECTION ? T : Math.min(i.levels.length - 1, fn + 1)));
    t[43] = i.levels.length;
    t[44] = T;
    t[45] = it;
  } else it = t[45];
  let ct;
  if (t[46] !== T || t[47] !== v) {
    ct = () => {
      if (!v) {
        return false;
      }
      re((nl) => (nl === NO_SELECTION ? T : NO_SELECTION));
    };
    t[46] = T;
    t[47] = v;
    t[48] = ct;
  } else ct = t[48];
  let dt;
  if (t[49] !== D) {
    dt = () => {
      if (!D) {
        return false;
      }
      A(not);
    };
    t[49] = D;
    t[50] = dt;
  } else dt = t[50];
  let ut;
  if (t[51] !== de) {
    ut = () => de(false);
    t[51] = de;
    t[52] = ut;
  } else ut = t[52];
  let gn;
  if (t[53] !== at || t[54] !== it || t[55] !== ct || t[56] !== dt || t[57] !== ut) {
    gn = {
      "effortSlider:decreaseEffort": at,
      "effortSlider:increaseEffort": it,
      "effortSlider:adaptive": ct,
      "effortSlider:toggleUltracode": dt,
      "effortSlider:thisSessionOnly": ut,
    };
    t[53] = at;
    t[54] = it;
    t[55] = ct;
    t[56] = dt;
    t[57] = ut;
    t[58] = gn;
  } else gn = t[58];
  const isActive = M === null;
  let mn;
  if (t[59] !== isActive) {
    mn = {
      context: "EffortSlider",
      isActive,
    };
    t[59] = isActive;
    t[60] = mn;
  } else mn = t[60];
  MessageActionsKeybindings(gn, mn);
  const shortcutDisplay = useShortcutDisplay("effortSlider:decreaseEffort", "EffortSlider", "left");
  const shortcutDisplay_2 = useShortcutDisplay("effortSlider:increaseEffort", "EffortSlider", "right");
  let pn;
  if (t[61] !== shortcutDisplay || t[62] !== shortcutDisplay_2) {
    pn = [shortcutDisplay, shortcutDisplay_2];
    t[61] = shortcutDisplay;
    t[62] = shortcutDisplay_2;
    t[63] = pn;
  } else pn = t[63];
  let ft = pn;
  let shortcutDisplay_3 = useShortcutDisplay_2("effortSlider:thisSessionOnly", "EffortSlider", "s");
  if (M !== null) {
    const effort = M.choice.level === "auto" ? undefined : M.choice.level;
    let onConfirm;
    if (
      t[64] !== te ||
      t[65] !== onDone ||
      t[66] !== M.choice ||
      t[67] !== M.persistAsDefault ||
      t[68] !== setAppState ||
      t[69] !== storageV5
    ) {
      onConfirm = () => {
        if (ae.current) {
          return;
        }
        ae.current = true;
        applyEffortSelection(M.choice, te, setAppState, onDone, storageV5, M.persistAsDefault);
      };
      t[64] = te;
      t[65] = onDone;
      t[66] = M.choice;
      t[67] = M.persistAsDefault;
      t[68] = setAppState;
      t[69] = storageV5;
      t[70] = onConfirm;
    } else onConfirm = t[70];
    let onCancel;
    if (t[71] === MEMO_CACHE_SENTINEL) {
      onCancel = () => Re(null);
      t[71] = onCancel;
    } else onCancel = t[71];
    let Ne;
    if (t[72] !== effort || t[73] !== onConfirm) {
      Ne = jsxProd_default(ModelEffortSwitchConfirm, {
        kind: "effort",
        model: null,
        effort,
        onConfirm,
        onCancel,
      });
      t[72] = effort;
      t[73] = onConfirm;
      t[74] = Ne;
    } else Ne = t[74];
    return Ne;
  }
  let Le = X ? null : i.trianglePositions[min];
  const ue = i.width - 6 - 7;
  let fe;
  if (t[75] !== ue) {
    fe = repeatString(" ", ue);
    t[75] = ue;
    t[76] = fe;
  } else fe = t[76];
  let children = fe;
  const last = i.labelStarts.at(-1);
  let Ne;
  if (t[77] !== i.levels) {
    Ne = i.levels.at(-1);
    t[77] = i.levels;
    t[78] = Ne;
  } else Ne = t[78];
  let rl = last + Ne.label.length;
  const mo = i.width - rl;
  let hn;
  if (t[79] !== mo) {
    hn = repeatString(" ", mo);
    t[79] = mo;
    t[80] = hn;
  } else hn = t[80];
  let pt = hn;
  let W = X ? undefined : i.levels[min].value;
  let vn;
  if (t[81] !== W || t[82] !== mainLoopModel) {
    vn = !hasEffortOverride(mainLoopModel)
      ? null
      : W === undefined
        ? ""
        : describeEffortLevel(mainLoopModel, W);
    t[81] = W;
    t[82] = mainLoopModel;
    t[83] = vn;
  } else vn = t[83];
  let Ue = vn;
  let xn;
  if (t[84] !== W || t[85] !== mainLoopModel) {
    xn = W === "max" && modelSupportsMaxEffort(mainLoopModel) && isMaxEffortReminderEnabled();
    t[84] = W;
    t[85] = mainLoopModel;
    t[86] = xn;
  } else xn = t[86];
  let ht = xn;
  let yn;
  if (t[87] !== i.spacers) {
    yn = (ll) => " ".repeat(i.spacers[ll]);
    t[87] = i.spacers;
    t[88] = yn;
  } else yn = t[88];
  let Ie = yn;
  let Cn;
  if (t[89] !== k || t[90] !== chord || t[91] !== max || t[92] !== x) {
    Cn = jsxProd_default(UltracodeToggle, {
      on: x,
      chord,
      width: max,
      hint: k,
    });
    t[89] = k;
    t[90] = chord;
    t[91] = max;
    t[92] = x;
    t[93] = Cn;
  } else Cn = t[93];
  let Ve = Cn;
  let vt;
  if (t[94] !== E) {
    vt =
      !E &&
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
    t[94] = E;
    t[95] = vt;
  } else vt = t[95];
  const width = i.width;
  let Dn;
  if (t[96] === MEMO_CACHE_SENTINEL) {
    Dn = jsxProd_default(Text, {
      children: "Faster",
    });
    t[96] = Dn;
  } else Dn = t[96];
  let xt;
  if (t[97] !== children) {
    xt = jsxProd_default(Text, {
      children,
    });
    t[97] = children;
    t[98] = xt;
  } else xt = t[98];
  let An;
  if (t[99] === MEMO_CACHE_SENTINEL) {
    An = jsxProd_default(Text, {
      children: "Smarter",
    });
    t[99] = An;
  } else An = t[99];
  let yt;
  if (t[100] !== xt) {
    yt = jsxProd_default_2(Box, {
      children: [Dn, xt, An],
    });
    t[100] = xt;
    t[101] = yt;
  } else yt = t[101];
  let Ct;
  if (t[102] !== i.trackChars || t[103] !== Le) {
    Ct =
      Le === null
        ? jsxProd_default(Text, {
            dimColor: true,
            children: i.trackChars,
          })
        : jsxProd_default_2(Box, {
            children: [
              jsxProd_default(Text, {
                dimColor: true,
                children: i.trackChars.slice(0, Le),
              }),
              jsxProd_default(Text, {
                bold: true,
                children: "\u25B2",
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: i.trackChars.slice(Le + 1),
              }),
            ],
          });
    t[102] = i.trackChars;
    t[103] = Le;
    t[104] = Ct;
  } else Ct = t[104];
  let Dt;
  if (t[105] !== i.levels || t[106] !== min || t[107] !== Ie) {
    let ge;
    if (t[109] !== min || t[110] !== Ie) {
      ge = (Rn, po) =>
        jsxProd_default_2(
          Kc,
          {
            children: [
              po > 0 &&
                jsxProd_default(Text, {
                  children: Ie(po - 1),
                }),
              jsxProd_default(EffortLevelLabel, {
                level: Rn,
                selected: min === po,
              }),
            ],
          },
          Rn.value,
        );
      t[109] = min;
      t[110] = Ie;
      t[111] = ge;
    } else ge = t[111];
    Dt = i.levels.map(ge);
    t[105] = i.levels;
    t[106] = min;
    t[107] = Ie;
    t[108] = Dt;
  } else Dt = t[108];
  let ge;
  if (t[112] !== pt) {
    ge = pt
      ? jsxProd_default(Text, {
          children: pt,
        })
      : null;
    t[112] = pt;
    t[113] = ge;
  } else ge = t[113];
  let At;
  if (t[114] !== Dt || t[115] !== ge) {
    At = jsxProd_default_2(Box, {
      children: [Dt, ge],
    });
    t[114] = Dt;
    t[115] = ge;
    t[116] = At;
  } else At = t[116];
  let Rt;
  if (t[117] !== i.width || t[118] !== yt || t[119] !== Ct || t[120] !== At) {
    Rt = jsxProd_default_2(Box, {
      flexDirection: "column",
      width,
      children: [yt, Ct, At],
    });
    t[117] = i.width;
    t[118] = yt;
    t[119] = Ct;
    t[120] = At;
    t[121] = Rt;
  } else Rt = t[121];
  let bt;
  if (t[122] !== _ || t[123] !== D || t[124] !== Ve) {
    bt =
      D && _
        ? jsxProd_default(Box, {
            marginLeft: SLIDER_GAP,
            marginTop: 1,
            children: Ve,
          })
        : null;
    t[122] = _;
    t[123] = D;
    t[124] = Ve;
    t[125] = bt;
  } else bt = t[125];
  let Et;
  if (t[126] !== Rt || t[127] !== bt) {
    Et = jsxProd_default_2(Box, {
      flexDirection: "row",
      alignItems: "flex-start",
      children: [Rt, bt],
    });
    t[126] = Rt;
    t[127] = bt;
    t[128] = Et;
  } else Et = t[128];
  let Mt;
  if (t[129] !== i.width || t[130] !== v || t[131] !== _ || t[132] !== max || t[133] !== x || t[134] !== D) {
    Mt =
      D || v
        ? jsxProd_default(Box, {
            height: 1,
            width: i.width + (_ ? SLIDER_GAP + max : 0),
            children: x
              ? jsxProd_default_2(Text, {
                  dimColor: true,
                  wrap: "truncate-end",
                  children: ["Ultracode: ", ULTRACODE_DESCRIPTION],
                })
              : null,
          })
        : null;
    t[129] = i.width;
    t[130] = v;
    t[131] = _;
    t[132] = max;
    t[133] = x;
    t[134] = D;
    t[135] = Mt;
  } else Mt = t[135];
  let Vt;
  if (t[136] !== Et || t[137] !== Mt) {
    Vt = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [Et, Mt],
    });
    t[136] = Et;
    t[137] = Mt;
    t[138] = Vt;
  } else Vt = t[138];
  let St;
  if (t[139] !== Ue || t[140] !== W || t[141] !== ht) {
    St =
      Ue !== null
        ? jsxProd_default(Box, {
            minHeight: 2,
            children: ht
              ? jsxProd_default(Text, {
                  color: "warning",
                  children: Ue,
                })
              : jsxProd_default(Text, {
                  dimColor: true,
                  children: Ue,
                }),
          })
        : W === "max"
          ? jsxProd_default(Box, {
              children: ht
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
    t[139] = Ue;
    t[140] = W;
    t[141] = ht;
    t[142] = St;
  } else St = t[142];
  let Ot;
  if (t[143] !== i.orgNote) {
    Ot = i.orgNote
      ? jsxProd_default(Box, {
          children: jsxProd_default(Text, {
            dimColor: true,
            children: i.orgNote,
          }),
        })
      : null;
    t[143] = i.orgNote;
    t[144] = Ot;
  } else Ot = t[144];
  let wt;
  if (t[145] !== v || t[146] !== _ || t[147] !== D || t[148] !== Ve) {
    wt =
      (v || D) && !_
        ? jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(Box, {
                height: 1,
              }),
              v ? null : null,
              D ? Ve : null,
            ],
          })
        : null;
    t[145] = v;
    t[146] = _;
    t[147] = D;
    t[148] = Ve;
    t[149] = wt;
  } else wt = t[149];
  let kt;
  if (t[150] !== Vt || t[151] !== St || t[152] !== Ot || t[153] !== wt) {
    kt = jsxProd_default_2(Box, {
      flexDirection: "column",
      alignItems: "center",
      width: "100%",
      children: [Vt, St, Ot, wt],
    });
    t[150] = Vt;
    t[151] = St;
    t[152] = Ot;
    t[153] = wt;
    t[154] = kt;
  } else kt = t[154];
  let bn;
  if (t[155] === MEMO_CACHE_SENTINEL) {
    bn = jsxProd_default(Box, {
      height: 1,
    });
    t[155] = bn;
  } else bn = t[155];
  let children_2;
  if (
    t[156] !== ft ||
    t[157] !== globalExitKeybindings.keyName ||
    t[158] !== globalExitKeybindings.pending ||
    t[159] !== k ||
    t[160] !== shortcutDisplay_3
  ) {
    children_2 = globalExitKeybindings.pending
      ? `Press ${globalExitKeybindings.keyName} again to cancel`
      : jsxProd_default_2(Byline, {
          children: [
            ft.some(Boolean)
              ? jsxProd_default(KeyboardShortcutHint, {
                  chord: ft,
                  action: "adjust",
                  ...k,
                })
              : null,
            jsxProd_default(KeyboardShortcutHint, {
              chord: "enter",
              action: "confirm",
              ...k,
            }),
            shortcutDisplay_3
              ? jsxProd_default_2(Text, {
                  children: [shortcutDisplay_3, " for this session only"],
                })
              : null,
            jsxProd_default(KeyboardShortcutHint, {
              chord: "escape",
              action: "cancel",
              ...k,
            }),
          ],
        });
    t[156] = ft;
    t[157] = globalExitKeybindings.keyName;
    t[158] = globalExitKeybindings.pending;
    t[159] = k;
    t[160] = shortcutDisplay_3;
    t[161] = children_2;
  } else children_2 = t[161];
  let Tt;
  if (t[162] !== E || t[163] !== children_2) {
    Tt = jsxProd_default(Text, {
      dimColor: true,
      italic: E,
      children: children_2,
    });
    t[162] = E;
    t[163] = children_2;
    t[164] = Tt;
  } else Tt = t[164];
  let En;
  if (t[165] !== onKeyDown || t[166] !== vt || t[167] !== kt || t[168] !== Tt) {
    let children = jsxProd_default_2(Box, {
      flexDirection: "column",
      tabIndex: 0,
      autoFocus: true,
      onKeyDown,
      children: [vt, kt, bn, Tt],
    });
    En = jsxProd_default(Pane, {
      children,
    });
    t[165] = onKeyDown;
    t[166] = vt;
    t[167] = kt;
    t[168] = Tt;
    t[169] = En;
  } else En = t[169];
  return En;
}
//@ chunk-3rwvzn82.js:28776-28797 placement
var SLIDER_TOTAL_WIDTH = 70;
var SLIDER_GAP = 6;
var SLIDER_LABEL_WIDTH = 14;
//@ chunk-3rwvzn82.js:28797-29349 placement
function UltracodeToggle(props) {
  let f = w(9);
  let { on, chord, width, hint } = props;
  let m;
  if (f[0] !== on) {
    m = jsxProd_default(Box, {
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
    f[0] = on;
    f[1] = m;
  } else m = f[1];
  let g;
  if (f[2] !== chord || f[3] !== hint) {
    g = chord
      ? jsxProd_default(Text, {
          dimColor: true,
          children: jsxProd_default(KeyboardShortcutHint, {
            chord,
            action: "toggle",
            ...hint,
          }),
        })
      : null;
    f[2] = chord;
    f[3] = hint;
    f[4] = g;
  } else g = f[4];
  let d;
  if (f[5] !== m || f[6] !== g || f[7] !== width) {
    d = jsxProd_default_2(Box, {
      flexDirection: "column",
      width,
      children: [m, g],
    });
    f[5] = m;
    f[6] = g;
    f[7] = width;
    f[8] = d;
  } else d = f[8];
  return d;
}
//@ chunk-3rwvzn82.js:29425-29461 placement
var ULTRACODE_TOGGLE = "ultracode-toggle";
var AUTO = "auto";
//@ chunk-3rwvzn82.js:29461-32366 placement
function EffortPicker(props) {
  let t = w(63);
  let { getMessages, onDone, storageV5 } = props;
  let queuedMessageText = useQueuedMessageText();
  let ackedAtOutputTokens = useAppState(selectCacheMissAck_3);
  let permissionMode = useAppState(selectMode_3);
  let appState = useAppState(selectUltracode_4);
  let mainLoopModel = useMainLoopModel();
  let setAppState = useSetAppState();
  let U;
  if (t[0] !== mainLoopModel) {
    U = getEffortSliderModel(mainLoopModel);
    t[0] = mainLoopModel;
    t[1] = U;
  } else U = t[1];
  let i = U;
  let initialEffortIndex = resolveInitialEffortIndex(mainLoopModel, queuedMessageText, i);
  let I;
  if (t[2] !== mainLoopModel) {
    I = isUltracodeAvailable(mainLoopModel);
    t[2] = mainLoopModel;
    t[3] = I;
  } else I = t[3];
  let Y = I;
  let [C, re] = y(null);
  let [b] = y(isSpecialEffortKeywordDisabled);
  let [X, ee] = y(false);
  let [T] = y(returnFalse_2);
  const ultracodeConfirmed = appState === true;
  let D;
  if (t[4] !== queuedMessageText || t[5] !== ultracodeConfirmed || t[6] !== appState) {
    D = {
      effort: queuedMessageText,
      ultracode: appState,
      ultracodeConfirmed,
      route: "slider",
    };
    t[4] = queuedMessageText;
    t[5] = ultracodeConfirmed;
    t[6] = appState;
    t[7] = D;
  } else D = t[7];
  let N = D;
  let x = R(false);
  if (X) {
    const ultracodeConfirmed = appState === true;
    let F;
    if (t[8] !== getMessages || t[9] !== onDone || t[10] !== storageV5 || t[11] !== ultracodeConfirmed) {
      F = jsxProd_default(EffortCommandView, {
        args: "auto",
        route: "slider",
        ultracodeConfirmed,
        getMessages,
        onDone,
        storageV5,
      });
      t[8] = getMessages;
      t[9] = onDone;
      t[10] = storageV5;
      t[11] = ultracodeConfirmed;
      t[12] = F;
    } else F = t[12];
    return F;
  }
  if (C !== null) {
    let onConfirm;
    if (t[13] !== N || t[14] !== onDone || t[15] !== C || t[16] !== setAppState || t[17] !== storageV5) {
      onConfirm = () => {
        if (x.current) {
          return;
        }
        x.current = true;
        applyEffortAndReport(C, N, setAppState, onDone, storageV5);
      };
      t[13] = N;
      t[14] = onDone;
      t[15] = C;
      t[16] = setAppState;
      t[17] = storageV5;
      t[18] = onConfirm;
    } else onConfirm = t[18];
    let onCancel;
    if (t[19] === MEMO_CACHE_SENTINEL) {
      onCancel = () => re(null);
      t[19] = onCancel;
    } else onCancel = t[19];
    let O;
    if (t[20] !== C || t[21] !== onConfirm) {
      O = jsxProd_default(ModelEffortSwitchConfirm, {
        kind: "effort",
        model: null,
        effort: C,
        onConfirm,
        onCancel,
      });
      t[20] = C;
      t[21] = onConfirm;
      t[22] = O;
    } else O = t[22];
    return O;
  }
  let E;
  if (t[23] !== i.levels || t[24] !== mainLoopModel || t[25] !== Y || t[26] !== appState) {
    let A;
    if (t[28] !== mainLoopModel) {
      A = (k) => {
        let effortLevelDescription = getEffortLevelDescription(mainLoopModel, k);
        return {
          label: effortLevelDescription === "" ? k.label : `${k.label} (${effortLevelDescription})`,
          value: k.value,
        };
      };
      t[28] = mainLoopModel;
      t[29] = A;
    } else A = t[29];
    E = i.levels.map(A);
    if (Y)
      E.push({
        label: `Ultracode: ${appState ? "on" : "off"} (select to turn it ${appState ? "off" : "on"}; ${ULTRACODE_DESCRIPTION})`,
        value: ULTRACODE_TOGGLE,
      });
    t[23] = i.levels;
    t[24] = mainLoopModel;
    t[25] = Y;
    t[26] = appState;
    t[27] = E;
  } else E = t[27];
  let A;
  if (
    t[30] !== queuedMessageText ||
    t[31] !== i.levels ||
    t[32] !== initialEffortIndex ||
    t[33] !== b ||
    t[34] !== mainLoopModel
  ) {
    A =
      b && isEffortUnset(queuedMessageText, mainLoopModel)
        ? AUTO
        : i.levels[Math.min(initialEffortIndex, i.levels.length - 1)].value;
    t[30] = queuedMessageText;
    t[31] = i.levels;
    t[32] = initialEffortIndex;
    t[33] = b;
    t[34] = mainLoopModel;
    t[35] = A;
  } else A = t[35];
  let se = A;
  let F;
  if (t[36] !== T) {
    F =
      !T &&
      jsxProd_default(Title, {
        children: EFFORT_TITLE,
      });
    t[36] = T;
    t[37] = F;
  } else F = t[37];
  let O;
  if (t[38] !== i.orgNote) {
    O = i.orgNote
      ? jsxProd_default(Text, {
          children: i.orgNote,
        })
      : null;
    t[38] = i.orgNote;
    t[39] = O;
  } else O = t[39];
  let onChange;
  if (
    t[40] !== ackedAtOutputTokens ||
    t[41] !== N ||
    t[42] !== se ||
    t[43] !== queuedMessageText ||
    t[44] !== getMessages ||
    t[45] !== mainLoopModel ||
    t[46] !== onDone ||
    t[47] !== permissionMode ||
    t[48] !== setAppState ||
    t[49] !== storageV5 ||
    t[50] !== appState
  ) {
    onChange = (_) => {
      if (x.current) {
        return;
      }
      if (_ === ULTRACODE_TOGGLE) {
        x.current = true;
        applyEffortAndReport(appState ? "ultracode off" : "ultracode on", N, setAppState, onDone, storageV5);
        return;
      }
      if (_ === AUTO) {
        x.current = true;
        ee(true);
        return;
      }
      let M = _;
      if (
        shouldShowEffortNotice({
          target: M,
          current: queuedMessageText,
          model: mainLoopModel,
          permissionMode,
          messages: getMessages(),
          ackedAtOutputTokens,
          promptCacheMayBeWarm: isMainThreadSource(getMessages()),
        })
      ) {
        re(M);
        return;
      }
      x.current = true;
      applyEffortAndReport(
        M,
        N,
        setAppState,
        onDone,
        storageV5,
        shouldSaveEffortDefault({
          asDefault: true,
          levelChanged: M !== se,
          chosen: queuedMessageText,
          model: mainLoopModel,
        }),
      );
    };
    t[40] = ackedAtOutputTokens;
    t[41] = N;
    t[42] = se;
    t[43] = queuedMessageText;
    t[44] = getMessages;
    t[45] = mainLoopModel;
    t[46] = onDone;
    t[47] = permissionMode;
    t[48] = setAppState;
    t[49] = storageV5;
    t[50] = appState;
    t[51] = onChange;
  } else onChange = t[51];
  let onCancel;
  if (t[52] !== onDone) {
    onCancel = () => {
      if (x.current) {
        return;
      }
      x.current = true;
      onDone("Cancelled");
    };
    t[52] = onDone;
    t[53] = onCancel;
  } else onCancel = t[53];
  let be;
  if (t[54] !== se || t[55] !== E || t[56] !== onChange || t[57] !== onCancel) {
    be = jsxProd_default(Select, {
      options: E,
      defaultValue: se,
      onChange,
      onCancel,
    });
    t[54] = se;
    t[55] = E;
    t[56] = onChange;
    t[57] = onCancel;
    t[58] = be;
  } else be = t[58];
  let te;
  if (t[59] !== be || t[60] !== F || t[61] !== O) {
    let children = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [F, O, be],
    });
    te = jsxProd_default(Pane, {
      children,
    });
    t[59] = be;
    t[60] = F;
    t[61] = O;
    t[62] = te;
  } else te = t[62];
  return te;
}
//@ chunk-3rwvzn82.js:32366-32635 placement
/**
 * /effort 命令的 JSX 入口：带参数时显示 EffortCommandView，否则显示交互滑块（屏幕阅读器下为选择列表）。
 */
function EffortCommand(props) {
  let f = w(5);
  let { args, onDone, getMessages, storageV5 } = props;
  let m;
  if (f[0] !== args || f[1] !== getMessages || f[2] !== onDone || f[3] !== storageV5) {
    m = args
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
    f[0] = args;
    f[1] = getMessages;
    f[2] = onDone;
    f[3] = storageV5;
    f[4] = m;
  } else m = f[4];
  return m;
}
export { hasEffortOverride, describeEffortLevel, selectUltracode, EffortCommand };
