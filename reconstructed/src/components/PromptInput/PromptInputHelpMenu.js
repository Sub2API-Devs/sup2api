/**
 * components/PromptInput/PromptInputHelpMenu.tsx
 *
 * "?" 帮助菜单：列出输入模式前缀（! @ / # 等）与快捷键（按当前 keybinding 显示）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/PromptInputHelpMenu.tsx
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: fingerprint 2, layout 1, placement 2
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../../keybindings/useShortcutDisplay.js";
import { useShortcutDisplay } from "../../keybindings/useKeybindingDisplay.js";
import { GA } from "./PromptInputFooterLeftSide.js";
import { rs } from "../../state/AppState.js";
import { Wv } from "../ProactivityMenu.js";
import { shouldShowEffortHint } from "../../utils/effort.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getNewlineInstructions } from "./utils.js";
import { isSuspendAllowed } from "../../ink/terminalProbe.js";
import { isFastModeEnabled, isFastModeAvailable } from "../../utils/fastMode.js";
import { isKeybindingCustomizationEnabled } from "../../keybindings/loadUserBindings.js";
import { j } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:846384-846430 fingerprint = formatShortcut (1)
function formatShortcut(shortcut) {
  return shortcut.replaceAll("+", " + ");
}
//@ chunk-18hwfzwa.js:846430-846468 layout
var Hm = { keyCase: "lower", modSep: " + " };
/**
 * "?" 帮助菜单：三列列出 ! bash 模式、/ 命令、@ 文件、& 后台、双击 esc 回退、shift+tab 模式切换、ctrl+o transcript、ctrl+t 任务、ctrl+_ 撤销等，按当前 keybinding 显示。
 */
//@ chunk-18hwfzwa.js:846468-851347 fingerprint = PromptInputHelpMenu (0.665)
function PromptInputHelpMenu(props) {
  let $ = w(93),
    { dimColor: dimColor, fixedWidth: fixedWidth, gap: gap, paddingX: paddingX } = props;
  const t0 = useShortcutDisplay_2("app:toggleTranscript", "Global", "ctrl+o");
  let Be;
  if ($[0] !== t0) ((Be = formatShortcut(t0)), ($[0] = t0), ($[1] = Be));
  else Be = $[1];
  let He = Be,
    t2 = useShortcutDisplay("app:toggleTodos", "Global", "ctrl+t"),
    t4 = useShortcutDisplay("chat:undo", "Chat", "ctrl+_"),
    t6 = useShortcutDisplay("chat:stash", "Chat", "ctrl+s"),
    rt = useShortcutDisplay(GA(), "Chat", "shift+tab"),
    kt = useShortcutDisplay("chat:modelPicker", "Chat", "alt+p"),
    At = useShortcutDisplay("chat:fastMode", "Chat", "alt+o"),
    It = useShortcutDisplay("chat:externalEditor", "Chat", "ctrl+g");
  formatShortcut(useShortcutDisplay_2("app:toggleTerminal", "Global", "meta+j"));
  let Ot = useShortcutDisplay("chat:imagePaste", "Chat", "ctrl+v");
  rs(Wv) ?? !1;
  let Et;
  if ($[2] !== dimColor)
    ((Et = shouldShowEffortHint(getMainLoopModel()) ? e(EffortKeysHelp, { dimColor: dimColor }) : null),
      ($[2] = dimColor),
      ($[3] = Et));
  else Et = $[3];
  let Dt = Et;
  const Lt = fixedWidth ? 24 : void 0;
  let oo;
  if ($[4] !== dimColor)
    ((oo = e(Box, { children: e(Text, { dimColor: dimColor, children: "! for shell mode" }) })),
      ($[4] = dimColor),
      ($[5] = oo));
  else oo = $[5];
  let Xt;
  if ($[6] !== dimColor)
    ((Xt = e(Box, { children: e(Text, { dimColor: dimColor, children: "/ for commands" }) })),
      ($[6] = dimColor),
      ($[7] = Xt));
  else Xt = $[7];
  let io;
  if ($[8] !== dimColor)
    ((io = e(Box, { children: e(Text, { dimColor: dimColor, children: "@ for file paths" }) })),
      ($[8] = dimColor),
      ($[9] = io));
  else io = $[9];
  let so;
  if ($[10] !== dimColor)
    ((so = e(Box, { children: e(Text, { dimColor: dimColor, children: "/btw for side question" }) })),
      ($[10] = dimColor),
      ($[11] = so));
  else so = $[11];
  let po;
  if ($[12] !== Lt || $[13] !== oo || $[14] !== Xt || $[15] !== io || $[16] !== so)
    ((po = r(Box, { flexDirection: "column", width: Lt, children: [oo, Xt, io, so] })),
      ($[12] = Lt),
      ($[13] = oo),
      ($[14] = Xt),
      ($[15] = io),
      ($[16] = so),
      ($[17] = po));
  else po = $[17];
  const ao = fixedWidth ? 35 : void 0;
  let co;
  if ($[18] !== dimColor)
    ((co = e(Box, { children: e(Text, { dimColor: dimColor, children: "double tap esc to clear input" }) })),
      ($[18] = dimColor),
      ($[19] = co));
  else co = $[19];
  let bo;
  if ($[20] !== rt)
    ((bo = e(KeyboardShortcutHint, { chord: rt, action: "auto-accept edits", format: Hm })),
      ($[20] = rt),
      ($[21] = bo));
  else bo = $[21];
  let Ao;
  if ($[22] !== dimColor || $[23] !== bo)
    ((Ao = e(Box, { children: e(Text, { dimColor: dimColor, children: bo }) })),
      ($[22] = dimColor),
      ($[23] = bo),
      ($[24] = Ao));
  else Ao = $[24];
  let Bo;
  if ($[25] !== dimColor || $[26] !== He)
    ((Bo = e(Box, { children: r(Text, { dimColor: dimColor, children: [He, " for verbose output"] }) })),
      ($[25] = dimColor),
      ($[26] = He),
      ($[27] = Bo));
  else Bo = $[27];
  let Ro;
  if ($[28] !== t2)
    ((Ro = e(KeyboardShortcutHint, { chord: t2, action: "toggle tasks", format: Hm })),
      ($[28] = t2),
      ($[29] = Ro));
  else Ro = $[29];
  let Ho;
  if ($[30] !== dimColor || $[31] !== Ro)
    ((Ho = e(Box, { children: e(Text, { dimColor: dimColor, children: Ro }) })),
      ($[30] = dimColor),
      ($[31] = Ro),
      ($[32] = Ho));
  else Ho = $[32];
  let Io;
  if ($[33] === MEMO_CACHE_SENTINEL) ((Io = getNewlineInstructions()), ($[33] = Io));
  else Io = $[33];
  let Wo;
  if ($[34] !== dimColor)
    ((Wo = e(Box, { children: e(Text, { dimColor: dimColor, children: Io }) })),
      ($[34] = dimColor),
      ($[35] = Wo));
  else Wo = $[35];
  let mn;
  if (
    $[36] !== Dt ||
    $[37] !== co ||
    $[38] !== Ao ||
    $[39] !== Bo ||
    $[40] !== Ho ||
    $[41] !== Wo ||
    $[42] !== ao
  )
    ((mn = r(Box, { flexDirection: "column", width: ao, children: [co, Ao, Dt, Bo, Ho, null, null, Wo] })),
      ($[36] = Dt),
      ($[37] = co),
      ($[38] = Ao),
      ($[39] = Bo),
      ($[40] = Ho),
      ($[41] = Wo),
      ($[42] = ao),
      ($[43] = mn));
  else mn = $[43];
  let Cn;
  if ($[44] !== t4)
    ((Cn = e(KeyboardShortcutHint, { chord: t4, action: "undo", format: Hm })), ($[44] = t4), ($[45] = Cn));
  else Cn = $[45];
  let No;
  if ($[46] !== dimColor || $[47] !== Cn)
    ((No = e(Box, { children: e(Text, { dimColor: dimColor, children: Cn }) })),
      ($[46] = dimColor),
      ($[47] = Cn),
      ($[48] = No));
  else No = $[48];
  let vo;
  if ($[49] !== dimColor)
    ((vo =
      isSuspendAllowed() &&
      e(Box, {
        children: e(Text, {
          dimColor: dimColor,
          children: e(KeyboardShortcutHint, { chord: "ctrl+z", action: "suspend", format: Hm }),
        }),
      })),
      ($[49] = dimColor),
      ($[50] = vo));
  else vo = $[50];
  let Yo;
  if ($[51] !== Ot)
    ((Yo = e(KeyboardShortcutHint, { chord: Ot, action: "paste images", format: Hm })),
      ($[51] = Ot),
      ($[52] = Yo));
  else Yo = $[52];
  let kn;
  if ($[53] !== dimColor || $[54] !== Yo)
    ((kn = e(Box, { children: e(Text, { dimColor: dimColor, children: Yo }) })),
      ($[53] = dimColor),
      ($[54] = Yo),
      ($[55] = kn));
  else kn = $[55];
  let Fn;
  if ($[56] !== kt)
    ((Fn = e(KeyboardShortcutHint, { chord: kt, action: "switch model", format: Hm })),
      ($[56] = kt),
      ($[57] = Fn));
  else Fn = $[57];
  let bn;
  if ($[58] !== dimColor || $[59] !== Fn)
    ((bn = e(Box, { children: e(Text, { dimColor: dimColor, children: Fn }) })),
      ($[58] = dimColor),
      ($[59] = Fn),
      ($[60] = bn));
  else bn = $[60];
  let Go;
  if ($[61] !== dimColor || $[62] !== At)
    ((Go =
      isFastModeEnabled() &&
      isFastModeAvailable() &&
      e(Box, {
        children: e(Text, {
          dimColor: dimColor,
          children: e(KeyboardShortcutHint, { chord: At, action: "toggle fast mode", format: Hm }),
        }),
      })),
      ($[61] = dimColor),
      ($[62] = At),
      ($[63] = Go));
  else Go = $[63];
  let hn;
  if ($[64] !== t6)
    ((hn = e(KeyboardShortcutHint, { chord: t6, action: "stash prompt", format: Hm })),
      ($[64] = t6),
      ($[65] = hn));
  else hn = $[65];
  let Mn;
  if ($[66] !== dimColor || $[67] !== hn)
    ((Mn = e(Box, { children: e(Text, { dimColor: dimColor, children: hn }) })),
      ($[66] = dimColor),
      ($[67] = hn),
      ($[68] = Mn));
  else Mn = $[68];
  let Xo;
  if ($[69] !== It)
    ((Xo = e(KeyboardShortcutHint, { chord: It, action: "edit in $EDITOR", format: Hm })),
      ($[69] = It),
      ($[70] = Xo));
  else Xo = $[70];
  let Sn;
  if ($[71] !== dimColor || $[72] !== Xo)
    ((Sn = e(Box, { flexShrink: 0, children: e(Text, { dimColor: dimColor, children: Xo }) })),
      ($[71] = dimColor),
      ($[72] = Xo),
      ($[73] = Sn));
  else Sn = $[73];
  let $n;
  if ($[74] !== dimColor)
    (($n =
      isKeybindingCustomizationEnabled() &&
      e(Box, { children: e(Text, { dimColor: dimColor, children: "/keybindings to customize" }) })),
      ($[74] = dimColor),
      ($[75] = $n));
  else $n = $[75];
  let on;
  if (
    $[76] !== No ||
    $[77] !== vo ||
    $[78] !== kn ||
    $[79] !== bn ||
    $[80] !== Go ||
    $[81] !== Mn ||
    $[82] !== Sn ||
    $[83] !== $n
  )
    ((on = r(Box, { flexDirection: "column", children: [No, vo, kn, bn, Go, Mn, Sn, $n] })),
      ($[76] = No),
      ($[77] = vo),
      ($[78] = kn),
      ($[79] = bn),
      ($[80] = Go),
      ($[81] = Mn),
      ($[82] = Sn),
      ($[83] = $n),
      ($[84] = on));
  else on = $[84];
  let _o;
  if ($[85] !== gap || $[86] !== mn || $[87] !== on || $[88] !== po)
    ((_o = r(Box, { flexDirection: "row", gap: gap, children: [po, mn, on] })),
      ($[85] = gap),
      ($[86] = mn),
      ($[87] = on),
      ($[88] = po),
      ($[89] = _o));
  else _o = $[89];
  let cn;
  if ($[90] !== paddingX || $[91] !== _o)
    ((cn = r(Box, { paddingX: paddingX, flexDirection: "column", children: [_o, null] })),
      ($[90] = paddingX),
      ($[91] = _o),
      ($[92] = cn));
  else cn = $[92];
  return cn;
}
//@ chunk-18hwfzwa.js:851347-851811 placement
function EffortKeysHelp(h) {
  let $ = w(8),
    { dimColor: dimColor } = h;
  const D = useShortcutDisplay("chat:increaseEffort", "Chat", "shift+up"),
    L = useShortcutDisplay("chat:decreaseEffort", "Chat", "shift+down");
  let ke;
  if ($[0] !== D || $[1] !== L) ((ke = [D, L]), ($[0] = D), ($[1] = L), ($[2] = ke));
  else ke = $[2];
  let Re = ke,
    Be;
  if ($[3] !== Re)
    ((Be = e(KeyboardShortcutHint, { chord: Re, action: "change effort", format: Hm })),
      ($[3] = Re),
      ($[4] = Be));
  else Be = $[4];
  let He;
  if ($[5] !== dimColor || $[6] !== Be)
    ((He = e(Box, { children: e(Text, { dimColor: dimColor, children: Be }) })),
      ($[5] = dimColor),
      ($[6] = Be),
      ($[7] = He));
  else He = $[7];
  return He;
}
//@ chunk-18hwfzwa.js:851811-851815 placement
j();

export { PromptInputHelpMenu };
