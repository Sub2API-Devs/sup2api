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
import { j, R, y, P, Kc } from "../../vendor/react/cjs/react.production.js";
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import {
  applyEffortCommand,
  ApplyEffortAndClose,
  $Co,
  shouldSaveEffortDefault,
  lFt,
} from "../commands/effort/effort.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { dg } from "../context/QueuedMessageContext.js";
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
  hcr,
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
import { usePrefersReducedMotion, VDe } from "./Spinner/spinnerFlags.js";
import { useAnimationFrame } from "../ink/components/Input.js";
import { getRainbowColor } from "../utils/thinking.js";
import { dkr } from "./EffortIndicator.js";
import { Jn } from "../remote/remoteMode.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { icr, isMaxEffortReminderEnabled } from "../utils/permissions/permissionSetup.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useShortcutDisplay } from "../keybindings/useKeybindingDisplay.js";
import { nd } from "../utils/stableEmptyObject.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { formatShortcutHint, KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { useGlobalExitKeybindings } from "../keybindings/useKeybinding.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../keybindings/useShortcutDisplay.js";
import { repeatString } from "../utils/stringUtils.js";
import { Title } from "./design-system/Title.js";
import { Gg } from "../utils/permissions/autoModeRulesPrompt.js";
import { Byline } from "./design-system/Byline.js";
import { Pane } from "./design-system/Pane.js";
import { Select } from "./CustomSelect/selectTypeahead.js";

//@ chunk-3rwvzn82.js:14223-14227 placement
j();
//@ chunk-3rwvzn82.js:14227-14231 placement
j();
//@ chunk-3rwvzn82.js:14231-14262 placement
function ml(U) {
  return U.length;
}
//@ chunk-3rwvzn82.js:14262-14350 placement
function pl(i, v) {
  return i.startsWith("\u2587") ? e(Text, { color: "permission", children: i }, v) : i;
}
//@ chunk-3rwvzn82.js:14350-14384 placement
function Wr(m) {
  return m.ultracode;
}
//@ chunk-3rwvzn82.js:14384-14418 placement
function Yr(F) {
  return F.ultracode;
}
//@ chunk-3rwvzn82.js:14418-14471 placement
function zr(O) {
  return O.cacheMissAckedAtOutputTokens;
}
//@ chunk-3rwvzn82.js:14471-14522 placement
function Gr(E) {
  return E.toolPermissionContext.mode;
}
//@ chunk-3rwvzn82.js:14522-14577 placement
function Kr(il) {
  return il.cacheMissAckedAtOutputTokens;
}
//@ chunk-3rwvzn82.js:14577-14630 placement
function Jr(cl) {
  return cl.toolPermissionContext.mode;
}
//@ chunk-3rwvzn82.js:14630-14666 placement
function qr(dl) {
  return dl.ultracode;
}
//@ chunk-3rwvzn82.js:14666-14689 placement
function Qr() {
  return !1;
}
//@ chunk-3rwvzn82.js:14689-14715 placement
function Zr(ul) {
  return !ul;
}
//@ chunk-3rwvzn82.js:14715-14770 placement
function Xr(io) {
  return io.cacheMissAckedAtOutputTokens;
}
//@ chunk-3rwvzn82.js:14770-14823 placement
function el(ln) {
  return ln.toolPermissionContext.mode;
}
//@ chunk-3rwvzn82.js:14823-14859 placement
function tl(ce) {
  return ce.ultracode;
}
//@ chunk-3rwvzn82.js:14859-14882 placement
function ol() {
  return !1;
}
//@ chunk-3rwvzn82.js:14882-14905 placement
function as() {
  return !1;
}
//@ chunk-3rwvzn82.js:14998-15078 sole-consumer
async function applyEffortAndReport(u, l, o, a, c, f = !0) {
  let m = await applyEffortCommand(u, l, o, f, c);
  a(m.message, ApplyEffortAndClose(m));
}
//@ chunk-3rwvzn82.js:15078-15136 placement
function Xt(u) {
  return u.levelChanged || !u.ultracodeChanged;
}
//@ chunk-3rwvzn82.js:15136-15554 placement
async function applyEffortSelection(u, l, o, a, c, f = !0) {
  let { level: level, ultracode: ultracode, ultracodeChanged: ultracodeChanged } = u,
    p = [],
    t = !1,
    U = !1;
  if (Xt(u)) {
    let i = await applyEffortCommand(level, { ...l, ultracodeConfirmed: ultracode }, o, f, c);
    if (
      (p.push(i.message),
      (t = ApplyEffortAndClose(i)),
      (U = $Co() && i.effortUpdate !== void 0),
      U && ultracodeChanged && ultracode)
    )
      p.push("Ultracode on");
  }
  if (ultracodeChanged && !U) {
    let i = await applyEffortCommand(ultracode ? "ultracode on" : "ultracode off", l, o, f, c);
    p.push(p.length === 0 || !i.effortUpdate ? i.message : `Ultracode ${ultracode ? "on" : "off"}`);
  }
  a(p.join(" \xB7 "), t);
}
//@ chunk-3rwvzn82.js:15554-16836 placement
function EffortCommandView(u) {
  let I = w(29),
    {
      args: args,
      route: route,
      ultracodeConfirmed: ultracodeConfirmed,
      getMessages: getMessages,
      onDone: onDone,
      storageV5: storageV5,
    } = u,
    g = route === void 0 ? "typed" : route,
    d = dg(),
    p = useAppState(Yr),
    t = useAppState(zr),
    U = useAppState(Gr),
    i = useMainLoopModel(),
    v = useSetAppState(),
    Y;
  if (I[0] !== args) ((Y = parseEffortArg(args)), (I[0] = args), (I[1] = Y));
  else Y = I[1];
  let C = Y,
    re;
  if (I[2] !== d || I[3] !== g || I[4] !== ultracodeConfirmed || I[5] !== p)
    ((re = { effort: d, ultracode: p, ultracodeConfirmed: ultracodeConfirmed, route: g }),
      (I[2] = d),
      (I[3] = g),
      (I[4] = ultracodeConfirmed),
      (I[5] = p),
      (I[6] = re));
  else re = I[6];
  let b = R(re),
    X;
  if (I[7] !== t || I[8] !== d || I[9] !== getMessages || I[10] !== i || I[11] !== U || I[12] !== C)
    ((X = () =>
      C !== null &&
      shouldShowEffortNotice({
        target: C.value,
        current: d,
        model: i,
        permissionMode: U,
        messages: getMessages(),
        ackedAtOutputTokens: t,
        promptCacheMayBeWarm: isMainThreadSource(getMessages()),
      })),
      (I[7] = t),
      (I[8] = d),
      (I[9] = getMessages),
      (I[10] = i),
      (I[11] = U),
      (I[12] = C),
      (I[13] = X));
  else X = I[13];
  let [ee, T] = y(X),
    le,
    D;
  if (I[14] !== args || I[15] !== onDone || I[16] !== ee || I[17] !== v || I[18] !== storageV5 || I[19] !== C)
    ((le = () => {
      if (ee && C !== null) {
        return;
      }
      applyEffortAndReport(args, b.current, v, onDone, storageV5);
    }),
      (D = [ee, C, args, v, onDone, storageV5]),
      (I[14] = args),
      (I[15] = onDone),
      (I[16] = ee),
      (I[17] = v),
      (I[18] = storageV5),
      (I[19] = C),
      (I[20] = le),
      (I[21] = D));
  else ((le = I[20]), (D = I[21]));
  if ((P(le, D), ee && C !== null)) {
    let N;
    if (I[22] === MEMO_CACHE_SENTINEL) ((N = () => T(!1)), (I[22] = N));
    else N = I[22];
    let x;
    if (I[23] !== d || I[24] !== onDone)
      ((x = () => onDone(`Kept effort level as ${d !== void 0 ? effortValueToString(d) : "auto"}`)),
        (I[23] = d),
        (I[24] = onDone),
        (I[25] = x));
    else x = I[25];
    let A;
    if (I[26] !== x || I[27] !== C.value)
      ((A = e(ModelEffortSwitchConfirm, {
        kind: "effort",
        model: null,
        effort: C.value,
        onConfirm: N,
        onCancel: x,
      })),
        (I[26] = x),
        (I[27] = C.value),
        (I[28] = A));
    else A = I[28];
    return A;
  }
  return null;
}
//@ chunk-3rwvzn82.js:16836-17222 placement
var EFFORT_TITLE = "Effort",
  Hn = 42,
  Wn = 14,
  Yn = [1, 10, 20, 30, 40],
  zn = [5, 5, 5, 6],
  Ut = [
    { value: "low", label: "low", color: "warning" },
    { value: "medium", label: "medium", color: "success" },
    { value: "high", label: "high", color: "permission" },
    { value: "xhigh", label: "xhigh", color: "autoAccept-shimmer" },
    { value: "max", label: "max", color: "rainbow-animated" },
  ],
  Gn = 3,
  Kn = "Higher effort levels are capped by your settings or organization.";
//@ chunk-3rwvzn82.js:17222-17511 placement
function computeEffortSliderLayout(u) {
  let min = Math.min(Math.max(u, 1), Ut.length),
    sliced = Ut.slice(0, min),
    sliced_2 = zn.slice(0, min - 1),
    sliced_3 = Yn.slice(0, min);
  if (min === Ut.length) return { levels: sliced, width: Hn, trianglePositions: sliced_3, spacers: sliced_2 };
  let f = nn(sliced, sliced_2),
    max = Math.max(f[min - 1] + sliced[min - 1].label.length, Wn);
  return { levels: sliced, width: max, trianglePositions: sliced_3, spacers: sliced_2 };
}
//@ chunk-3rwvzn82.js:17511-17603 placement
function nn(u, l) {
  return u.map((o, a) => u.slice(0, a).reduce((c, f, m) => c + f.label.length + l[m], 0));
}
//@ chunk-3rwvzn82.js:17603-17665 placement
function eo(u) {
  return u !== void 0 && isEffortCostShown() && effortCostRatio(u, getDefaultEffortLevel(u)) !== null;
}
//@ chunk-3rwvzn82.js:17665-17990 placement
function describeEffortLevel(u, l) {
  let o = getDefaultEffortLevel(u);
  if (l === "max" && modelSupportsMaxEffort(u)) {
    let c = effortCostRatio(u, "max");
    return c === null ? MAX_EFFORT_DESCRIPTION : `${MAX_EFFORT_DESCRIPTION} (${formatCostMultiplier(c)})`;
  }
  if (l === o)
    return getOrgDefaultEffort(u) === null
      ? "The default effort for this model"
      : "The default effort for this model, set by your organization";
  let a = effortCostRatio(u, l);
  return a === null ? "" : `${formatCostMultiplier(a)} the estimated cost of ${o} (the default)`;
}
/**
 * 计算当前模型可选的 effort 档位、组织默认值与上限说明，供 effort 滑块使用。
 */
//@ chunk-3rwvzn82.js:17990-18511 placement
function getEffortSliderModel(u) {
  let l = u ? getEffortCap(u) : null,
    o = computeEffortSliderLayout(l ? EFFORT_LEVELS.indexOf(l) + 1 : EFFORT_LEVELS.length),
    a = u && hasEffortLevelsAboveCap(u) ? Kn : void 0,
    c = u ? getOrgOverriddenEffort(u) : null,
    f =
      c !== null
        ? `Your organization starts new sessions on this model at ${c} effort.`
        : u && getOrgDefaultEffort(u) !== null
          ? `Your organization's default effort for this model is ${getDefaultEffortLevel(u)}.`
          : void 0,
    filtered = [a, f].filter((p) => p !== void 0),
    g = filtered.length > 0 ? filtered.join(" ") : void 0,
    d = nn(o.levels, o.spacers);
  return {
    levels: o.levels,
    width: o.width,
    trianglePositions: o.trianglePositions,
    labelStarts: d,
    spacers: o.spacers,
    trackChars: "\u2500".repeat(o.width),
    orgNote: g,
  };
}
//@ chunk-3rwvzn82.js:18511-18994 placement
function EffortLevelLabel(u) {
  let c = w(9),
    { level: level, selected: selected } = u,
    label = level.label;
  if (!selected) {
    let f;
    if (c[0] !== label) ((f = e(Text, { dimColor: !0, children: label })), (c[0] = label), (c[1] = f));
    else f = c[1];
    return f;
  }
  if (level.color === "rainbow-animated") {
    let f;
    if (c[2] !== label) ((f = e(ShimmerText, { text: label })), (c[2] = label), (c[3] = f));
    else f = c[3];
    return f;
  }
  if (level.color === "autoAccept-shimmer") {
    let f;
    if (c[4] !== label) ((f = e(ShimmerText_2, { text: label })), (c[4] = label), (c[5] = f));
    else f = c[5];
    return f;
  }
  let f;
  if (c[6] !== level.color || c[7] !== label)
    ((f = e(Text, { bold: !0, color: level.color, children: label })),
      (c[6] = level.color),
      (c[7] = label),
      (c[8] = f));
  else f = c[8];
  return f;
}
//@ chunk-3rwvzn82.js:18994-19271 placement
function ShimmerText(u) {
  let f = w(5),
    { text: text } = u,
    o = usePrefersReducedMotion(),
    [, a] = useAnimationFrame(o ? null : 100),
    floored = Math.floor(a / 100),
    m;
  if (f[0] !== text) ((m = [...text]), (f[0] = text), (f[1] = m));
  else m = f[1];
  let g;
  if (f[2] !== floored || f[3] !== m)
    ((g = e(Text, {
      bold: !0,
      children: m.map((d, p) => e(Text, { color: getRainbowColor(p + floored), children: d }, p)),
    })),
      (f[2] = floored),
      (f[3] = m),
      (f[4] = g));
  else g = f[4];
  return g;
}
/**
 * 文字逐字符"闪光"高亮动画组件。
 */
//@ chunk-3rwvzn82.js:19271-19676 placement = RARITY_COLORS (0.418)
function ShimmerText_2(u) {
  let d = w(6),
    { text: text, color: color } = u,
    a = color === void 0 ? "autoAccept" : color,
    c = usePrefersReducedMotion(),
    [, f] = useAnimationFrame(c ? null : 100),
    m = text.length + 4,
    g = c ? VDe : Math.floor(f / 100) % m,
    p;
  if (d[0] !== text) ((p = [...text]), (d[0] = text), (d[1] = p));
  else p = d[1];
  let t;
  if (d[2] !== a || d[3] !== g || d[4] !== p)
    ((t = e(Text, {
      bold: !0,
      children: p.map((U, i) => {
        let v = i === g;
        let I = i === g - 1 || i === g + 1;
        return e(Text, { color: v ? dkr : a, bold: v || I, children: U }, i);
      }),
    })),
      (d[2] = a),
      (d[3] = g),
      (d[4] = p),
      (d[5] = t));
  else t = d[5];
  return t;
}
/**
 * 计算 effort 滑块的初始位置：先看环境变量覆盖或当前设定值，再取已应用/默认 effort 等级，找不到时用默认下标。
 */
//@ chunk-3rwvzn82.js:19676-19899 placement
function resolveInitialEffortIndex(u, l, o) {
  let a = Jn() ? void 0 : getEffortEnvOverride(),
    c = a === null ? void 0 : (a ?? l);
  if (c !== void 0) {
    let index = o.levels.findIndex((level) => level.value === c);
    if (index !== -1) return index;
  }
  let f = getAppliedEffortLevel(u, c) ?? getDefaultEffortLevel(u),
    index = o.levels.findIndex((level) => level.value === f);
  return index === -1 ? Gn : index;
}
//@ chunk-3rwvzn82.js:19899-19908 placement
var L = -1;
//@ chunk-3rwvzn82.js:19908-20079 placement
function EffortSliderOrPicker(u) {
  let o = w(4);
  if (useIsScreenReaderEnabled()) {
    let a;
    if (o[0] !== u) ((a = e(EffortPicker, { ...u })), (o[0] = u), (o[1] = a));
    else a = o[1];
    return a;
  }
  let a;
  if (o[2] !== u) ((a = e(EffortSlider, { ...u })), (o[2] = u), (o[3] = a));
  else a = o[3];
  return a;
}
/**
 * /effort 交互滑块：在 low…max 间切换，支持 Ultracode 开关和"仅本会话"。
 */
//@ chunk-3rwvzn82.js:20079-28776 placement
function EffortSlider(u) {
  let t = w(170),
    { getMessages: getMessages, onDone: onDone, storageV5: storageV5 } = u,
    c = dg(),
    f = useAppState(Kr),
    m = useAppState(Jr),
    g = useAppState(qr),
    d = useMainLoopModel(),
    p = useSetAppState(),
    U;
  if (t[0] !== d) ((U = getEffortSliderModel(d)), (t[0] = d), (t[1] = U));
  else U = t[1];
  let i = U,
    [v] = y(icr),
    I;
  if (t[2] !== c || t[3] !== i || t[4] !== v || t[5] !== d)
    ((I = v && hcr(c, d) ? L : resolveInitialEffortIndex(d, c, i)),
      (t[2] = c),
      (t[3] = i),
      (t[4] = v),
      (t[5] = d),
      (t[6] = I));
  else I = t[6];
  let Y = I,
    [C, re] = y(Y),
    min = Math.min(C, i.levels.length - 1),
    X = min === L,
    ee;
  if (t[7] !== c || t[8] !== i || t[9] !== d)
    ((ee = resolveInitialEffortIndex(d, c, i)), (t[7] = c), (t[8] = i), (t[9] = d), (t[10] = ee));
  else ee = t[10];
  let T = ee,
    le;
  if (t[11] !== d) ((le = isUltracodeAvailable(d)), (t[11] = d), (t[12] = le));
  else le = t[12];
  let D = le,
    N = g === !0,
    [x, A] = y(N),
    { columns: columns } = useTerminalSize(),
    O = useShortcutDisplay("effortSlider:toggleUltracode", "EffortSlider", "tab"),
    [E] = y(Qr),
    k,
    rt;
  if (t[13] !== E || t[14] !== O)
    ((k = nd(E)),
      (rt = bunStringWidth(formatShortcutHint({ chord: O, action: "toggle", ...k }))),
      (t[13] = E),
      (t[14] = O),
      (t[15] = k),
      (t[16] = rt));
  else ((k = t[15]), (rt = t[16]));
  let se = rt,
    max = Math.max(Ke, se),
    _ = columns >= Yo + max - Ke,
    [M, Re] = y(null),
    be;
  if (t[17] !== c || t[18] !== g)
    ((be = { effort: c, ultracode: g, route: "slider" }), (t[17] = c), (t[18] = g), (t[19] = be));
  else be = t[19];
  let te = be,
    ae = R(!1),
    io;
  if (
    t[20] !== f ||
    t[21] !== te ||
    t[22] !== c ||
    t[23] !== i.levels ||
    t[24] !== getMessages ||
    t[25] !== Y ||
    t[26] !== N ||
    t[27] !== X ||
    t[28] !== d ||
    t[29] !== onDone ||
    t[30] !== m ||
    t[31] !== min ||
    t[32] !== p ||
    t[33] !== storageV5 ||
    t[34] !== x
  )
    ((io = function de(ln) {
      if (ae.current) {
        return;
      }
      let ce = {
        level: X ? "auto" : i.levels[min].value,
        levelChanged: min !== Y,
        ultracode: x,
        ultracodeChanged: x !== N,
      };
      let sn = shouldSaveEffortDefault({ asDefault: ln, levelChanged: ce.levelChanged, chosen: c, model: d });
      if (
        Xt(ce) &&
        shouldShowEffortNotice({
          target: ce.level === "auto" ? void 0 : ce.level,
          current: c,
          model: d,
          permissionMode: m,
          messages: getMessages(),
          ackedAtOutputTokens: f,
          promptCacheMayBeWarm: isMainThreadSource(getMessages()),
        })
      ) {
        Re({ choice: ce, persistAsDefault: sn });
        return;
      }
      ((ae.current = !0), applyEffortSelection(ce, te, p, onDone, storageV5, sn));
    }),
      (t[20] = f),
      (t[21] = te),
      (t[22] = c),
      (t[23] = i.levels),
      (t[24] = getMessages),
      (t[25] = Y),
      (t[26] = N),
      (t[27] = X),
      (t[28] = d),
      (t[29] = onDone),
      (t[30] = m),
      (t[31] = min),
      (t[32] = p),
      (t[33] = storageV5),
      (t[34] = x),
      (t[35] = io));
  else io = t[35];
  let de = io,
    an;
  if (t[36] !== onDone)
    ((an = function Te() {
      if (ae.current) {
        return;
      }
      ((ae.current = !0), onDone("Cancelled"));
    }),
      (t[36] = onDone),
      (t[37] = an));
  else an = t[37];
  let Te = an,
    Me = useGlobalExitKeybindings(Te, void 0, M === null),
    cn;
  if (t[38] !== Te || t[39] !== de)
    ((cn = function st(lt) {
      if (lt.key === "return") (lt.preventDefault(), de(!0));
      else if (lt.key === "escape") (lt.preventDefault(), Te());
    }),
      (t[38] = Te),
      (t[39] = de),
      (t[40] = cn));
  else cn = t[40];
  let st = cn,
    at;
  if (t[41] !== T) ((at = () => re((dn) => (dn === L ? T : Math.max(0, dn - 1)))), (t[41] = T), (t[42] = at));
  else at = t[42];
  let it;
  if (t[43] !== i.levels.length || t[44] !== T)
    ((it = () => re((fn) => (fn === L ? T : Math.min(i.levels.length - 1, fn + 1)))),
      (t[43] = i.levels.length),
      (t[44] = T),
      (t[45] = it));
  else it = t[45];
  let ct;
  if (t[46] !== T || t[47] !== v)
    ((ct = () => {
      if (!v) {
        return !1;
      }
      re((nl) => (nl === L ? T : L));
    }),
      (t[46] = T),
      (t[47] = v),
      (t[48] = ct));
  else ct = t[48];
  let dt;
  if (t[49] !== D)
    ((dt = () => {
      if (!D) {
        return !1;
      }
      A(Zr);
    }),
      (t[49] = D),
      (t[50] = dt));
  else dt = t[50];
  let ut;
  if (t[51] !== de) ((ut = () => de(!1)), (t[51] = de), (t[52] = ut));
  else ut = t[52];
  let gn;
  if (t[53] !== at || t[54] !== it || t[55] !== ct || t[56] !== dt || t[57] !== ut)
    ((gn = {
      "effortSlider:decreaseEffort": at,
      "effortSlider:increaseEffort": it,
      "effortSlider:adaptive": ct,
      "effortSlider:toggleUltracode": dt,
      "effortSlider:thisSessionOnly": ut,
    }),
      (t[53] = at),
      (t[54] = it),
      (t[55] = ct),
      (t[56] = dt),
      (t[57] = ut),
      (t[58] = gn));
  else gn = t[58];
  const co = M === null;
  let mn;
  if (t[59] !== co) ((mn = { context: "EffortSlider", isActive: co }), (t[59] = co), (t[60] = mn));
  else mn = t[60];
  MessageActionsKeybindings(gn, mn);
  const uo = useShortcutDisplay("effortSlider:decreaseEffort", "EffortSlider", "left"),
    fo = useShortcutDisplay("effortSlider:increaseEffort", "EffortSlider", "right");
  let pn;
  if (t[61] !== uo || t[62] !== fo) ((pn = [uo, fo]), (t[61] = uo), (t[62] = fo), (t[63] = pn));
  else pn = t[63];
  let ft = pn,
    gt = useShortcutDisplay_2("effortSlider:thisSessionOnly", "EffortSlider", "s");
  if (M !== null) {
    const ue = M.choice.level === "auto" ? void 0 : M.choice.level;
    let fe;
    if (
      t[64] !== te ||
      t[65] !== onDone ||
      t[66] !== M.choice ||
      t[67] !== M.persistAsDefault ||
      t[68] !== p ||
      t[69] !== storageV5
    )
      ((fe = () => {
        if (ae.current) {
          return;
        }
        ((ae.current = !0), applyEffortSelection(M.choice, te, p, onDone, storageV5, M.persistAsDefault));
      }),
        (t[64] = te),
        (t[65] = onDone),
        (t[66] = M.choice),
        (t[67] = M.persistAsDefault),
        (t[68] = p),
        (t[69] = storageV5),
        (t[70] = fe));
    else fe = t[70];
    let mt;
    if (t[71] === MEMO_CACHE_SENTINEL) ((mt = () => Re(null)), (t[71] = mt));
    else mt = t[71];
    let Ne;
    if (t[72] !== ue || t[73] !== fe)
      ((Ne = e(ModelEffortSwitchConfirm, {
        kind: "effort",
        model: null,
        effort: ue,
        onConfirm: fe,
        onCancel: mt,
      })),
        (t[72] = ue),
        (t[73] = fe),
        (t[74] = Ne));
    else Ne = t[74];
    return Ne;
  }
  let Le = X ? null : i.trianglePositions[min];
  const ue = i.width - 6 - 7;
  let fe;
  if (t[75] !== ue) ((fe = repeatString(" ", ue)), (t[75] = ue), (t[76] = fe));
  else fe = t[76];
  let go = fe;
  const at_2 = i.labelStarts.at(-1);
  let Ne;
  if (t[77] !== i.levels) ((Ne = i.levels.at(-1)), (t[77] = i.levels), (t[78] = Ne));
  else Ne = t[78];
  let rl = at_2 + Ne.label.length;
  const mo = i.width - rl;
  let hn;
  if (t[79] !== mo) ((hn = repeatString(" ", mo)), (t[79] = mo), (t[80] = hn));
  else hn = t[80];
  let pt = hn,
    W = X ? void 0 : i.levels[min].value,
    vn;
  if (t[81] !== W || t[82] !== d)
    ((vn = !eo(d) ? null : W === void 0 ? "" : describeEffortLevel(d, W)),
      (t[81] = W),
      (t[82] = d),
      (t[83] = vn));
  else vn = t[83];
  let Ue = vn,
    xn;
  if (t[84] !== W || t[85] !== d)
    ((xn = W === "max" && modelSupportsMaxEffort(d) && isMaxEffortReminderEnabled()),
      (t[84] = W),
      (t[85] = d),
      (t[86] = xn));
  else xn = t[86];
  let ht = xn,
    yn;
  if (t[87] !== i.spacers) ((yn = (ll) => " ".repeat(i.spacers[ll])), (t[87] = i.spacers), (t[88] = yn));
  else yn = t[88];
  let Ie = yn,
    Cn;
  if (t[89] !== k || t[90] !== O || t[91] !== max || t[92] !== x)
    ((Cn = e(UltracodeToggle, { on: x, chord: O, width: max, hint: k })),
      (t[89] = k),
      (t[90] = O),
      (t[91] = max),
      (t[92] = x),
      (t[93] = Cn));
  else Cn = t[93];
  let Ve = Cn,
    vt;
  if (t[94] !== E)
    ((vt = !E && r(Fragment, { children: [e(Title, { children: EFFORT_TITLE }), e(Box, { height: 1 })] })),
      (t[94] = E),
      (t[95] = vt));
  else vt = t[95];
  const width = i.width;
  let Dn;
  if (t[96] === MEMO_CACHE_SENTINEL) ((Dn = e(Text, { children: "Faster" })), (t[96] = Dn));
  else Dn = t[96];
  let xt;
  if (t[97] !== go) ((xt = e(Text, { children: go })), (t[97] = go), (t[98] = xt));
  else xt = t[98];
  let An;
  if (t[99] === MEMO_CACHE_SENTINEL) ((An = e(Text, { children: "Smarter" })), (t[99] = An));
  else An = t[99];
  let yt;
  if (t[100] !== xt) ((yt = r(Box, { children: [Dn, xt, An] })), (t[100] = xt), (t[101] = yt));
  else yt = t[101];
  let Ct;
  if (t[102] !== i.trackChars || t[103] !== Le)
    ((Ct =
      Le === null
        ? e(Text, { dimColor: !0, children: i.trackChars })
        : r(Box, {
            children: [
              e(Text, { dimColor: !0, children: i.trackChars.slice(0, Le) }),
              e(Text, { bold: !0, children: "\u25B2" }),
              e(Text, { dimColor: !0, children: i.trackChars.slice(Le + 1) }),
            ],
          })),
      (t[102] = i.trackChars),
      (t[103] = Le),
      (t[104] = Ct));
  else Ct = t[104];
  let Dt;
  if (t[105] !== i.levels || t[106] !== min || t[107] !== Ie) {
    let ge;
    if (t[109] !== min || t[110] !== Ie)
      ((ge = (Rn, po) =>
        r(
          Kc,
          {
            children: [
              po > 0 && e(Text, { children: Ie(po - 1) }),
              e(EffortLevelLabel, { level: Rn, selected: min === po }),
            ],
          },
          Rn.value,
        )),
        (t[109] = min),
        (t[110] = Ie),
        (t[111] = ge));
    else ge = t[111];
    Dt = i.levels.map(ge);
    ((t[105] = i.levels), (t[106] = min), (t[107] = Ie), (t[108] = Dt));
  } else Dt = t[108];
  let ge;
  if (t[112] !== pt) ((ge = pt ? e(Text, { children: pt }) : null), (t[112] = pt), (t[113] = ge));
  else ge = t[113];
  let At;
  if (t[114] !== Dt || t[115] !== ge)
    ((At = r(Box, { children: [Dt, ge] })), (t[114] = Dt), (t[115] = ge), (t[116] = At));
  else At = t[116];
  let Rt;
  if (t[117] !== i.width || t[118] !== yt || t[119] !== Ct || t[120] !== At)
    ((Rt = r(Box, { flexDirection: "column", width: width, children: [yt, Ct, At] })),
      (t[117] = i.width),
      (t[118] = yt),
      (t[119] = Ct),
      (t[120] = At),
      (t[121] = Rt));
  else Rt = t[121];
  let bt;
  if (t[122] !== _ || t[123] !== D || t[124] !== Ve)
    ((bt = D && _ ? e(Box, { marginLeft: Ge, marginTop: 1, children: Ve }) : null),
      (t[122] = _),
      (t[123] = D),
      (t[124] = Ve),
      (t[125] = bt));
  else bt = t[125];
  let Et;
  if (t[126] !== Rt || t[127] !== bt)
    ((Et = r(Box, { flexDirection: "row", alignItems: "flex-start", children: [Rt, bt] })),
      (t[126] = Rt),
      (t[127] = bt),
      (t[128] = Et));
  else Et = t[128];
  let Mt;
  if (t[129] !== i.width || t[130] !== v || t[131] !== _ || t[132] !== max || t[133] !== x || t[134] !== D)
    ((Mt =
      D || v
        ? e(Box, {
            height: 1,
            width: i.width + (_ ? Ge + max : 0),
            children: x
              ? r(Text, { dimColor: !0, wrap: "truncate-end", children: ["Ultracode: ", lFt] })
              : null,
          })
        : null),
      (t[129] = i.width),
      (t[130] = v),
      (t[131] = _),
      (t[132] = max),
      (t[133] = x),
      (t[134] = D),
      (t[135] = Mt));
  else Mt = t[135];
  let Vt;
  if (t[136] !== Et || t[137] !== Mt)
    ((Vt = r(Box, { flexDirection: "column", children: [Et, Mt] })),
      (t[136] = Et),
      (t[137] = Mt),
      (t[138] = Vt));
  else Vt = t[138];
  let St;
  if (t[139] !== Ue || t[140] !== W || t[141] !== ht)
    ((St =
      Ue !== null
        ? e(Box, {
            minHeight: 2,
            children: ht
              ? e(Text, { color: "warning", children: Ue })
              : e(Text, { dimColor: !0, children: Ue }),
          })
        : W === "max"
          ? e(Box, {
              children: ht
                ? r(Text, { color: "warning", children: [Gg, " ", MAX_EFFORT_DESCRIPTION] })
                : e(Text, { dimColor: !0, children: MAX_EFFORT_DESCRIPTION }),
            })
          : null),
      (t[139] = Ue),
      (t[140] = W),
      (t[141] = ht),
      (t[142] = St));
  else St = t[142];
  let Ot;
  if (t[143] !== i.orgNote)
    ((Ot = i.orgNote ? e(Box, { children: e(Text, { dimColor: !0, children: i.orgNote }) }) : null),
      (t[143] = i.orgNote),
      (t[144] = Ot));
  else Ot = t[144];
  let wt;
  if (t[145] !== v || t[146] !== _ || t[147] !== D || t[148] !== Ve)
    ((wt =
      (v || D) && !_
        ? r(Fragment, { children: [e(Box, { height: 1 }), v ? null : null, D ? Ve : null] })
        : null),
      (t[145] = v),
      (t[146] = _),
      (t[147] = D),
      (t[148] = Ve),
      (t[149] = wt));
  else wt = t[149];
  let kt;
  if (t[150] !== Vt || t[151] !== St || t[152] !== Ot || t[153] !== wt)
    ((kt = r(Box, {
      flexDirection: "column",
      alignItems: "center",
      width: "100%",
      children: [Vt, St, Ot, wt],
    })),
      (t[150] = Vt),
      (t[151] = St),
      (t[152] = Ot),
      (t[153] = wt),
      (t[154] = kt));
  else kt = t[154];
  let bn;
  if (t[155] === MEMO_CACHE_SENTINEL) ((bn = e(Box, { height: 1 })), (t[155] = bn));
  else bn = t[155];
  let Pt;
  if (t[156] !== ft || t[157] !== Me.keyName || t[158] !== Me.pending || t[159] !== k || t[160] !== gt)
    ((Pt = Me.pending
      ? `Press ${Me.keyName} again to cancel`
      : r(Byline, {
          children: [
            ft.some(Boolean) ? e(KeyboardShortcutHint, { chord: ft, action: "adjust", ...k }) : null,
            e(KeyboardShortcutHint, { chord: "enter", action: "confirm", ...k }),
            gt ? r(Text, { children: [gt, " for this session only"] }) : null,
            e(KeyboardShortcutHint, { chord: "escape", action: "cancel", ...k }),
          ],
        })),
      (t[156] = ft),
      (t[157] = Me.keyName),
      (t[158] = Me.pending),
      (t[159] = k),
      (t[160] = gt),
      (t[161] = Pt));
  else Pt = t[161];
  let Tt;
  if (t[162] !== E || t[163] !== Pt)
    ((Tt = e(Text, { dimColor: !0, italic: E, children: Pt })), (t[162] = E), (t[163] = Pt), (t[164] = Tt));
  else Tt = t[164];
  let En;
  if (t[165] !== st || t[166] !== vt || t[167] !== kt || t[168] !== Tt) {
    let al = r(Box, {
      flexDirection: "column",
      tabIndex: 0,
      autoFocus: !0,
      onKeyDown: st,
      children: [vt, kt, bn, Tt],
    });
    En = e(Pane, { children: al });
    ((t[165] = st), (t[166] = vt), (t[167] = kt), (t[168] = Tt), (t[169] = En));
  } else En = t[169];
  return En;
}
//@ chunk-3rwvzn82.js:28776-28797 placement
var Yo = 70,
  Ge = 6,
  Ke = 14;
//@ chunk-3rwvzn82.js:28797-29349 placement
function UltracodeToggle(u) {
  let f = w(9),
    { on: on, chord: chord, width: width, hint: hint } = u,
    m;
  if (f[0] !== on)
    ((m = e(Box, {
      children: on
        ? e(ShimmerText_2, { text: "Ultracode  on", color: "effortUltra" })
        : r(Fragment, {
            children: [
              e(Text, { bold: !0, children: "Ultracode" }),
              e(Text, { children: "  " }),
              e(Text, { dimColor: !0, children: "off" }),
            ],
          }),
    })),
      (f[0] = on),
      (f[1] = m));
  else m = f[1];
  let g;
  if (f[2] !== chord || f[3] !== hint)
    ((g = chord
      ? e(Text, {
          dimColor: !0,
          children: e(KeyboardShortcutHint, { chord: chord, action: "toggle", ...hint }),
        })
      : null),
      (f[2] = chord),
      (f[3] = hint),
      (f[4] = g));
  else g = f[4];
  let d;
  if (f[5] !== m || f[6] !== g || f[7] !== width)
    ((d = r(Box, { flexDirection: "column", width: width, children: [m, g] })),
      (f[5] = m),
      (f[6] = g),
      (f[7] = width),
      (f[8] = d));
  else d = f[8];
  return d;
}
//@ chunk-3rwvzn82.js:29425-29461 placement
var ULTRACODE_TOGGLE = "ultracode-toggle",
  AUTO = "auto";
//@ chunk-3rwvzn82.js:29461-32366 placement
function EffortPicker(u) {
  let t = w(63),
    { getMessages: getMessages, onDone: onDone, storageV5: storageV5 } = u,
    c = dg(),
    f = useAppState(Xr),
    m = useAppState(el),
    g = useAppState(tl),
    d = useMainLoopModel(),
    p = useSetAppState(),
    U;
  if (t[0] !== d) ((U = getEffortSliderModel(d)), (t[0] = d), (t[1] = U));
  else U = t[1];
  let i = U,
    v = resolveInitialEffortIndex(d, c, i),
    I;
  if (t[2] !== d) ((I = isUltracodeAvailable(d)), (t[2] = d), (t[3] = I));
  else I = t[3];
  let Y = I,
    [C, re] = y(null),
    [b] = y(icr),
    [X, ee] = y(!1),
    [T] = y(ol);
  const le = g === !0;
  let D;
  if (t[4] !== c || t[5] !== le || t[6] !== g)
    ((D = { effort: c, ultracode: g, ultracodeConfirmed: le, route: "slider" }),
      (t[4] = c),
      (t[5] = le),
      (t[6] = g),
      (t[7] = D));
  else D = t[7];
  let N = D,
    x = R(!1);
  if (X) {
    const A = g === !0;
    let F;
    if (t[8] !== getMessages || t[9] !== onDone || t[10] !== storageV5 || t[11] !== A)
      ((F = e(EffortCommandView, {
        args: "auto",
        route: "slider",
        ultracodeConfirmed: A,
        getMessages: getMessages,
        onDone: onDone,
        storageV5: storageV5,
      })),
        (t[8] = getMessages),
        (t[9] = onDone),
        (t[10] = storageV5),
        (t[11] = A),
        (t[12] = F));
    else F = t[12];
    return F;
  }
  if (C !== null) {
    let A;
    if (t[13] !== N || t[14] !== onDone || t[15] !== C || t[16] !== p || t[17] !== storageV5)
      ((A = () => {
        if (x.current) {
          return;
        }
        ((x.current = !0), applyEffortAndReport(C, N, p, onDone, storageV5));
      }),
        (t[13] = N),
        (t[14] = onDone),
        (t[15] = C),
        (t[16] = p),
        (t[17] = storageV5),
        (t[18] = A));
    else A = t[18];
    let F;
    if (t[19] === MEMO_CACHE_SENTINEL) ((F = () => re(null)), (t[19] = F));
    else F = t[19];
    let O;
    if (t[20] !== C || t[21] !== A)
      ((O = e(ModelEffortSwitchConfirm, {
        kind: "effort",
        model: null,
        effort: C,
        onConfirm: A,
        onCancel: F,
      })),
        (t[20] = C),
        (t[21] = A),
        (t[22] = O));
    else O = t[22];
    return O;
  }
  let E;
  if (t[23] !== i.levels || t[24] !== d || t[25] !== Y || t[26] !== g) {
    let A;
    if (t[28] !== d)
      ((A = (k) => {
        let rt = getEffortLevelDescription(d, k);
        return { label: rt === "" ? k.label : `${k.label} (${rt})`, value: k.value };
      }),
        (t[28] = d),
        (t[29] = A));
    else A = t[29];
    E = i.levels.map(A);
    if (Y)
      E.push({
        label: `Ultracode: ${g ? "on" : "off"} (select to turn it ${g ? "off" : "on"}; ${lFt})`,
        value: ULTRACODE_TOGGLE,
      });
    ((t[23] = i.levels), (t[24] = d), (t[25] = Y), (t[26] = g), (t[27] = E));
  } else E = t[27];
  let A;
  if (t[30] !== c || t[31] !== i.levels || t[32] !== v || t[33] !== b || t[34] !== d)
    ((A = b && hcr(c, d) ? AUTO : i.levels[Math.min(v, i.levels.length - 1)].value),
      (t[30] = c),
      (t[31] = i.levels),
      (t[32] = v),
      (t[33] = b),
      (t[34] = d),
      (t[35] = A));
  else A = t[35];
  let se = A,
    F;
  if (t[36] !== T) ((F = !T && e(Title, { children: EFFORT_TITLE })), (t[36] = T), (t[37] = F));
  else F = t[37];
  let O;
  if (t[38] !== i.orgNote)
    ((O = i.orgNote ? e(Text, { children: i.orgNote }) : null), (t[38] = i.orgNote), (t[39] = O));
  else O = t[39];
  let B;
  if (
    t[40] !== f ||
    t[41] !== N ||
    t[42] !== se ||
    t[43] !== c ||
    t[44] !== getMessages ||
    t[45] !== d ||
    t[46] !== onDone ||
    t[47] !== m ||
    t[48] !== p ||
    t[49] !== storageV5 ||
    t[50] !== g
  )
    ((B = (_) => {
      if (x.current) {
        return;
      }
      if (_ === ULTRACODE_TOGGLE) {
        ((x.current = !0),
          applyEffortAndReport(g ? "ultracode off" : "ultracode on", N, p, onDone, storageV5));
        return;
      }
      if (_ === AUTO) {
        ((x.current = !0), ee(!0));
        return;
      }
      let M = _;
      if (
        shouldShowEffortNotice({
          target: M,
          current: c,
          model: d,
          permissionMode: m,
          messages: getMessages(),
          ackedAtOutputTokens: f,
          promptCacheMayBeWarm: isMainThreadSource(getMessages()),
        })
      ) {
        re(M);
        return;
      }
      ((x.current = !0),
        applyEffortAndReport(
          M,
          N,
          p,
          onDone,
          storageV5,
          shouldSaveEffortDefault({ asDefault: !0, levelChanged: M !== se, chosen: c, model: d }),
        ));
    }),
      (t[40] = f),
      (t[41] = N),
      (t[42] = se),
      (t[43] = c),
      (t[44] = getMessages),
      (t[45] = d),
      (t[46] = onDone),
      (t[47] = m),
      (t[48] = p),
      (t[49] = storageV5),
      (t[50] = g),
      (t[51] = B));
  else B = t[51];
  let Re;
  if (t[52] !== onDone)
    ((Re = () => {
      if (x.current) {
        return;
      }
      ((x.current = !0), onDone("Cancelled"));
    }),
      (t[52] = onDone),
      (t[53] = Re));
  else Re = t[53];
  let be;
  if (t[54] !== se || t[55] !== E || t[56] !== B || t[57] !== Re)
    ((be = e(Select, { options: E, defaultValue: se, onChange: B, onCancel: Re })),
      (t[54] = se),
      (t[55] = E),
      (t[56] = B),
      (t[57] = Re),
      (t[58] = be));
  else be = t[58];
  let te;
  if (t[59] !== be || t[60] !== F || t[61] !== O) {
    let ae = r(Box, { flexDirection: "column", children: [F, O, be] });
    te = e(Pane, { children: ae });
    ((t[59] = be), (t[60] = F), (t[61] = O), (t[62] = te));
  } else te = t[62];
  return te;
}
/**
 * /effort 命令的 JSX 入口：带参数时显示 EffortCommandView，否则显示交互滑块（屏幕阅读器下为选择列表）。
 */
//@ chunk-3rwvzn82.js:32366-32635 placement
function EffortCommand(u) {
  let f = w(5),
    { args: args, onDone: onDone, getMessages: getMessages, storageV5: storageV5 } = u,
    m;
  if (f[0] !== args || f[1] !== getMessages || f[2] !== onDone || f[3] !== storageV5)
    ((m = args
      ? e(EffortCommandView, { args: args, onDone: onDone, getMessages: getMessages, storageV5: storageV5 })
      : e(EffortSliderOrPicker, { onDone: onDone, getMessages: getMessages, storageV5: storageV5 })),
      (f[0] = args),
      (f[1] = getMessages),
      (f[2] = onDone),
      (f[3] = storageV5),
      (f[4] = m));
  else m = f[4];
  return m;
}

export { eo, describeEffortLevel, Wr, EffortCommand };
