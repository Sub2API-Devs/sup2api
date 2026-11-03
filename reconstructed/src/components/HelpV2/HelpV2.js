/**
 * components/HelpV2/HelpV2.tsx
 *
 * /help 对话框：General/Commands/自定义命令等标签页，help:dismiss 关闭。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/HelpV2/HelpV2.tsx
 * pieces: chunk-yxcx2jtr.js (3)
 * attribution: sole-consumer 1, affinity 1, fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useScrollViewportSize } from "../ScrollViewportContext.js";
import { isFeedbackAllowed } from "../../commands/feedback/feedbackPolicy.js";
import { AHt } from "../PromptInput/footerGates.js";
import { y } from "../../../vendor/react/cjs/react.production.js";
import { useKeybinding, useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import { useShortcutDisplay } from "../../keybindings/useShortcutDisplay.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Tab, Tabs } from "../design-system/Tabs.js";
import { General } from "./General.js";
import { CommandsTab } from "./_new/CommandList.js";
import { Text, Link, Box } from "../../ink/components/Text.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { nd } from "../../utils/stableEmptyObject.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { Pane } from "../design-system/Pane.js";

//@ chunk-yxcx2jtr.js:16345-16429 sole-consumer
function Qe(G) {
  return G.type !== "prompt" || G.source === "builtin" || G.source === "bundled";
}
//@ chunk-yxcx2jtr.js:16429-16445 affinity
var ae = 44,
  me = 21;
/**
 * /help 对话框：标签页切换（General、Commands、自定义命令），help:dismiss 或 Esc 关闭并发系统消息 "Help dialog dismissed"。
 */
//@ chunk-yxcx2jtr.js:16445-19220 fingerprint = HelpV2 (0.573)
function HelpV2(t0) {
  let $ = w(44),
    { onClose: onClose, commands: commands } = t0,
    insideModal = useTerminalSize(),
    { rows: rows } = useScrollViewportSize(insideModal),
    m = rows,
    l;
  if ($[0] !== insideModal.rows)
    ((l = insideModal.rows >= ae && isFeedbackAllowed()), ($[0] = insideModal.rows), ($[1] = l));
  else l = $[1];
  let u = l,
    c = AHt() && rows < me ? 0 : 1,
    h;
  if ($[2] !== onClose)
    ((h = () => onClose("Help dialog dismissed", { display: "system" })), ($[2] = onClose), ($[3] = h));
  else h = $[3];
  let R = h,
    [x, M] = y(!1);
  const W = !x;
  let ye;
  if ($[4] !== W) ((ye = { context: "Help", isActive: W }), ($[4] = W), ($[5] = ye));
  else ye = $[5];
  useKeybinding("help:dismiss", R, ye);
  let exitState = useGlobalExitKeybindings(R),
    dismissShortcut = useShortcutDisplay("help:dismiss", "Help", "esc"),
    xe = !1 ? "permission" : "professionalBlue",
    Se = Qe,
    be;
  if ($[6] !== commands) {
    let k;
    if ($[8] === MEMO_CACHE_SENTINEL) ((k = (Ee) => Se(Ee) && !Ee.isHidden), ($[8] = k));
    else k = $[8];
    be = commands.filter(k);
    (($[6] = commands), ($[7] = be));
  } else be = $[7];
  let D = be,
    k;
  if ($[9] !== commands) {
    let T;
    if ($[11] === MEMO_CACHE_SENTINEL) ((T = (cmd_2) => !Se(cmd_2) && !cmd_2.isHidden), ($[11] = T));
    else T = $[11];
    k = commands.filter(T);
    (($[9] = commands), ($[10] = k));
  } else k = $[10];
  let F = k,
    T;
  if ($[12] === MEMO_CACHE_SENTINEL)
    ((T = e(Tab, { id: "general", title: "General", children: e(General, {}) }, "general")), ($[12] = T));
  else T = $[12];
  let E;
  if ($[13] !== D || $[14] !== F || $[15] !== m) {
    E = [T];
    let O;
    if ($[17] !== D || $[18] !== m)
      ((O = e(
        Tab,
        {
          id: "commands",
          title: "Commands",
          children: e(CommandsTab, {
            commands: D,
            maxHeight: m,
            title: "Browse default commands",
            onOwnsEscChange: M,
          }),
        },
        "commands",
      )),
        ($[17] = D),
        ($[18] = m),
        ($[19] = O));
    else O = $[19];
    E.push(O);
    let f;
    if ($[20] !== F || $[21] !== m)
      ((f = e(
        Tab,
        {
          id: "custom",
          title: "Custom commands",
          children: e(CommandsTab, {
            commands: F,
            maxHeight: m,
            title: "Browse custom commands",
            emptyMessage: "No custom commands found",
            onOwnsEscChange: M,
          }),
        },
        "custom",
      )),
        ($[20] = F),
        ($[21] = m),
        ($[22] = f));
    else f = $[22];
    E.push(f);
    (($[13] = D), ($[14] = F), ($[15] = m), ($[16] = E));
  } else E = $[16];
  const O = !x;
  let f;
  if ($[23] !== O || $[24] !== E)
    ((f = e(Tabs, { title: "Help", color: xe, defaultTab: "general", navFromContent: O, children: E })),
      ($[23] = O),
      ($[24] = E),
      ($[25] = f));
  else f = $[25];
  let He;
  if ($[26] === MEMO_CACHE_SENTINEL)
    ((He = r(Text, {
      dimColor: !1,
      children: ["For more help:", " ", e(Link, { url: "https://code.claude.com/docs/en/overview" })],
    })),
      ($[26] = He));
  else He = $[26];
  let v;
  if ($[27] !== c) ((v = e(Box, { marginTop: c, flexShrink: 0, children: He })), ($[27] = c), ($[28] = v));
  else v = $[28];
  let P;
  if ($[29] !== u)
    ((P =
      u &&
      e(Box, {
        marginTop: 1,
        flexShrink: 0,
        children: e(Text, {
          dimColor: !0,
          children: "Something else? Use /feedback to report bugs or request features.",
        }),
      })),
      ($[29] = u),
      ($[30] = P));
  else P = $[30];
  let _;
  if ($[31] !== dismissShortcut || $[32] !== exitState.keyName || $[33] !== exitState.pending || $[34] !== x)
    ((_ = e(Text, {
      dimColor: !0,
      children: exitState.pending
        ? r(Fragment, { children: ["Press ", exitState.keyName, " again to exit"] })
        : !1
          ? e(Text, {
              italic: !0,
              children: x
                ? e(KeyboardShortcutHint, { chord: "escape", action: "clear", ...nd(!1) })
                : e(ConfigurableShortcutHint, {
                    action: "help:dismiss",
                    context: "Help",
                    fallback: "Esc",
                    description: "cancel",
                    ...nd(!1),
                  }),
            })
          : r(Text, { italic: !0, children: [dismissShortcut, " to cancel"] }),
    })),
      ($[31] = dismissShortcut),
      ($[32] = exitState.keyName),
      ($[33] = exitState.pending),
      ($[34] = x),
      ($[35] = _));
  else _ = $[35];
  let L;
  if ($[36] !== c || $[37] !== _)
    ((L = e(Box, { marginTop: c, flexShrink: 0, children: _ })), ($[36] = c), ($[37] = _), ($[38] = L));
  else L = $[38];
  let Re;
  if ($[39] !== v || $[40] !== P || $[41] !== L || $[42] !== f)
    ((Re = e(Box, { flexDirection: "column", children: r(Pane, { color: xe, children: [f, v, P, L] }) })),
      ($[39] = v),
      ($[40] = P),
      ($[41] = L),
      ($[42] = f),
      ($[43] = Re));
  else Re = $[43];
  return Re;
}

export { HelpV2 };
