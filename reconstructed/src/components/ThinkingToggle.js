/**
 * components/ThinkingToggle.tsx
 *
 * /thinking 开关对话框：启用/禁用本会话的扩展思考。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ThinkingToggle.tsx
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { y } from "../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { nd } from "../utils/stableEmptyObject.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { AgentNavigationFooter } from "./agents/AgentNavigationFooter.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { Pane } from "./design-system/Pane.js";

//@ chunk-18hwfzwa.js:676084-676166 affinity
var hQe = "Toggle thinking mode",
  yQe = "Enable or disable thinking for this session.";
//@ chunk-18hwfzwa.js:676166-678371 fingerprint = ThinkingToggle (0.819)
function ThinkingToggle(t0) {
  let $ = w(24),
    {
      currentValue: currentValue,
      onSelect: onSelect,
      onCancel: onCancel,
      isMidConversation: isMidConversation,
    } = t0,
    [ke, Re] = y(null),
    He;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((He = [
      { value: "true", label: "Enabled", description: "Claude will think before responding" },
      { value: "false", label: "Disabled", description: "Claude will respond without extended thinking" },
    ]),
      ($[0] = He));
  else He = $[0];
  let We = He,
    ze;
  if ($[1] !== ke || $[2] !== onCancel)
    ((ze = () => {
      if (ke !== null) Re(null);
      else onCancel();
    }),
      ($[1] = ke),
      ($[2] = onCancel),
      ($[3] = ze));
  else ze = $[3];
  let Xe;
  if ($[4] === MEMO_CACHE_SENTINEL) ((Xe = { context: "Confirmation" }), ($[4] = Xe));
  else Xe = $[4];
  useKeybinding("confirm:no", ze, Xe);
  let rt;
  if ($[5] !== ke || $[6] !== onSelect)
    ((rt = () => {
      if (ke !== null) onSelect(ke);
    }),
      ($[5] = ke),
      ($[6] = onSelect),
      ($[7] = rt));
  else rt = $[7];
  const kt = ke !== null;
  let At;
  if ($[8] !== kt) ((At = { context: "Confirmation", isActive: kt }), ($[8] = kt), ($[9] = At));
  else At = $[9];
  useKeybinding("confirm:yes", rt, At);
  let It;
  if ($[10] !== currentValue || $[11] !== isMidConversation || $[12] !== onSelect)
    ((It = function Dt(value) {
      let Et = value === "true";
      if (isMidConversation && Et !== currentValue) Re(Et);
      else onSelect(Et);
    }),
      ($[10] = currentValue),
      ($[11] = isMidConversation),
      ($[12] = onSelect),
      ($[13] = It));
  else It = $[13];
  let Dt = It,
    Lt;
  if ($[14] === MEMO_CACHE_SENTINEL) ((Lt = nd(!1)), ($[14] = Lt));
  else Lt = $[14];
  let oo = Lt,
    Xt;
  if ($[15] !== ke || $[16] !== currentValue || $[17] !== Dt || $[18] !== onCancel)
    ((Xt =
      ke !== null
        ? r(Box, {
            flexDirection: "column",
            marginBottom: 1,
            gap: 1,
            children: [
              e(Text, {
                color: "warning",
                children:
                  "Changing thinking mode mid-conversation will increase latency and may reduce quality. For best results, set this at the start of a session.",
              }),
              e(Text, { color: "warning", children: "Do you want to proceed?" }),
            ],
          })
        : e(Box, {
            flexDirection: "column",
            marginBottom: 1,
            children: e(ModelSelector, {
              defaultValue: currentValue ? "true" : "false",
              defaultFocusValue: currentValue ? "true" : "false",
              options: We,
              onChange: Dt,
              onCancel: onCancel,
              visibleOptionCount: 2,
            }),
          })),
      ($[15] = ke),
      ($[16] = currentValue),
      ($[17] = Dt),
      ($[18] = onCancel),
      ($[19] = Xt));
  else Xt = $[19];
  let io = Xt,
    so;
  if ($[20] === MEMO_CACHE_SENTINEL)
    ((so = e(AgentNavigationFooter, {
      italic: !1,
      children: r(Byline, {
        children: [
          e(KeyboardShortcutHint, { chord: "enter", action: "confirm", ...oo }),
          e(ConfigurableShortcutHint, {
            action: "confirm:no",
            context: "Confirmation",
            fallback: "Esc",
            description: "cancel",
            ...oo,
          }),
        ],
      }),
    })),
      ($[20] = so));
  else so = $[20];
  let po = so,
    ao;
  if ($[21] === MEMO_CACHE_SENTINEL)
    ((ao = r(Box, {
      marginBottom: 1,
      flexDirection: "column",
      children: [
        e(Text, { color: "remember", bold: !0, children: hQe }),
        e(Text, { dimColor: !0, children: yQe }),
      ],
    })),
      ($[21] = ao));
  else ao = $[21];
  let co;
  if ($[22] !== io)
    ((co = r(Pane, {
      color: "permission",
      children: [r(Box, { flexDirection: "column", children: [ao, io] }), po],
    })),
      ($[22] = io),
      ($[23] = co));
  else co = $[23];
  return co;
}

export { ThinkingToggle };
