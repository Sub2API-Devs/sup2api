/**
 * components/FeedbackSurvey/SurveyCard.tsx
 *
 * 2.1.316 新增。调查卡片外框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 3
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { fT, DIGIT_HOTKEY_HOLD_MS, useDigitHotkeys } from "../pluginUi/digitHotkeys.js";
import { useKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { getActionChords } from "../../keybindings/resolver.js";
import { Lfo } from "./FeedbackSurvey.js";
import { chordToString } from "../../keybindings/parser.js";
import { rs } from "../../state/AppState.js";
import { selectHasModalOverlay } from "../../context/overlayContext.js";
import { P } from "../../../vendor/react/cjs/react.production.js";
import { isUnattendedInteractiveSession } from "../../utils/concurrentSessions.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { BLACK_CIRCLE } from "../../utils/permissions/autoModeRulesPrompt.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { USER_MESSAGE_BACKGROUND } from "../CustomSelect/selectTypeahead.js";
import { Button } from "../../ink/components/ErrorBoundary.js";

//@ chunk-18hwfzwa.js:1004373-1004412 placement
function d4(h) {
  return h === "0" || h === "1";
}
/**
 * SurveyCard：调查卡片外框与评分选项。
 */
//@ chunk-18hwfzwa.js:1004412-1007788 placement
function SurveyCard(h) {
  let $ = w(48),
    {
      state: state,
      survey: survey,
      starting: starting,
      inputValue: inputValue,
      setInputValue: setInputValue,
      inputRowReplaced: inputRowReplaced,
      onShown: onShown,
      onStart: onStart,
      onDismiss: onDismiss,
      onIgnore: onIgnore,
    } = h,
    rt;
  if ($[0] !== inputValue)
    ((rt = inputValue.length === 1 ? fT(inputValue) : inputValue), ($[0] = inputValue), ($[1] = rt));
  else rt = $[1];
  let kt = rt,
    At;
  if ($[2] !== kt || $[3] !== state)
    ((At = state === "open" && kt !== "" && !d4(kt)), ($[2] = kt), ($[3] = state), ($[4] = At));
  else At = $[4];
  let It = At,
    Ot = state === "open" && survey !== null && !It,
    Et = useKeybindingContext(),
    Dt;
  Lt: {
    if (Et === null) {
      Dt = "enter";
      break Lt;
    }
    let oo;
    if ($[5] !== Et.bindings) {
      let at = getActionChords("chat:submit", "Chat", Et.bindings).filter(Lfo).at(-1);
      oo = at === void 0 ? "" : chordToString(at);
      (($[5] = Et.bindings), ($[6] = oo));
    } else oo = $[6];
    Dt = oo;
  }
  let io = Dt,
    so = rs(selectHasModalOverlay) === !0,
    oo,
    po;
  if ($[7] !== onIgnore || $[8] !== It)
    ((oo = () => {
      if (It) onIgnore();
    }),
      (po = [It, onIgnore]),
      ($[7] = onIgnore),
      ($[8] = It),
      ($[9] = oo),
      ($[10] = po));
  else ((oo = $[9]), (po = $[10]));
  P(oo, po);
  let ao, co;
  if ($[11] !== Ot || $[12] !== onShown)
    ((ao = () => {
      if (Ot) onShown();
    }),
      (co = [Ot, onShown]),
      ($[11] = Ot),
      ($[12] = onShown),
      ($[13] = ao),
      ($[14] = co));
  else ((ao = $[13]), (co = $[14]));
  P(ao, co);
  let bo;
  if (
    $[15] !== onDismiss ||
    $[16] !== onIgnore ||
    $[17] !== onStart ||
    $[18] !== setInputValue ||
    $[19] !== starting
  )
    ((bo = function Bo(Ao) {
      if ((setInputValue(""), starting)) {
        return;
      }
      if (isUnattendedInteractiveSession()) {
        onIgnore();
        return;
      }
      if (Ao === "1") onStart();
      else onDismiss();
    }),
      ($[15] = onDismiss),
      ($[16] = onIgnore),
      ($[17] = onStart),
      ($[18] = setInputValue),
      ($[19] = starting),
      ($[20] = bo));
  else bo = $[20];
  let Bo = bo;
  const Ro = !inputRowReplaced && !so;
  let Ho;
  if ($[21] !== Ot || $[22] !== inputValue || $[23] !== Bo || $[24] !== Ro)
    ((Ho = {
      inputValue: inputValue,
      isValidDigit: d4,
      onDigit: Bo,
      enabled: Ot,
      enterConfirms: Ro,
      acceptAfterPause: !1,
      mountDelayMs: DIGIT_HOTKEY_HOLD_MS,
    }),
      ($[21] = Ot),
      ($[22] = inputValue),
      ($[23] = Bo),
      ($[24] = Ro),
      ($[25] = Ho));
  else Ho = $[25];
  if ((useDigitHotkeys(Ho), state === "thanks" && survey !== null)) {
    let Io;
    if ($[26] === MEMO_CACHE_SENTINEL)
      ((Io = e(Text, { color: "success", children: "Thanks for your feedback" })), ($[26] = Io));
    else Io = $[26];
    let Wo;
    if ($[27] !== survey.orgName)
      ((Wo = r(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          Io,
          r(Text, {
            dimColor: !0,
            wrap: "wrap",
            children: [
              "This survey is from ",
              survey.orgName,
              ". Answers won",
              "\u2019",
              "t be used to improve Anthropic",
              "\u2019",
              "s services.",
            ],
          }),
        ],
      })),
        ($[27] = survey.orgName),
        ($[28] = Wo));
    else Wo = $[28];
    return Wo;
  }
  if (state === "gone" && survey !== null) {
    let Io;
    if ($[29] === MEMO_CACHE_SENTINEL)
      ((Io = e(Box, {
        marginTop: 1,
        children: r(Text, {
          color: "warning",
          wrap: "wrap",
          children: [
            "This survey isn",
            "\u2019",
            "t available anymore, so your answers weren",
            "\u2019",
            "t sent.",
          ],
        }),
      })),
        ($[29] = Io));
    else Io = $[29];
    return Io;
  }
  if (!Ot) {
    return null;
  }
  let Io;
  if ($[30] === MEMO_CACHE_SENTINEL)
    ((Io = e(Box, { minWidth: 2, children: e(Text, { color: "ansi:cyan", children: BLACK_CIRCLE }) })),
      ($[30] = Io));
  else Io = $[30];
  let Wo;
  if ($[31] !== survey.headline)
    ((Wo = r(Box, { children: [Io, e(Text, { bold: !0, wrap: "wrap", children: survey.headline })] })),
      ($[31] = survey.headline),
      ($[32] = Wo));
  else Wo = $[32];
  let mn;
  if ($[33] !== survey.message)
    ((mn = e(Box, { marginLeft: 2, children: e(Text, { wrap: "wrap", children: survey.message }) })),
      ($[33] = survey.message),
      ($[34] = mn));
  else mn = $[34];
  let Cn;
  if ($[35] !== survey.orgName)
    ((Cn = e(Box, {
      marginLeft: 2,
      children: r(Text, { dimColor: !0, wrap: "wrap", children: ["Survey from ", survey.orgName] }),
    })),
      ($[35] = survey.orgName),
      ($[36] = Cn));
  else Cn = $[36];
  let No;
  if ($[37] !== Bo)
    ((No = r(Box, {
      marginLeft: 2,
      flexWrap: "wrap",
      children: [
        e(SurveyDigitButton, { digit: "1", label: "Start survey", onAction: Bo }),
        e(SurveyDigitButton, { digit: "0", label: "Not now", onAction: Bo }),
      ],
    })),
      ($[37] = Bo),
      ($[38] = No));
  else No = $[38];
  let vo;
  if ($[39] !== starting || $[40] !== io)
    ((vo =
      (starting || io !== "") &&
      e(Box, {
        marginLeft: 2,
        children: e(Text, {
          dimColor: !0,
          wrap: "wrap",
          children: starting
            ? "Opening the survey\u2026"
            : r(Fragment, {
                children: [
                  "Type 1 or 0, then",
                  " ",
                  e(KeyboardShortcutHint, { chord: io, action: "answer" }),
                ],
              }),
        }),
      })),
      ($[39] = starting),
      ($[40] = io),
      ($[41] = vo));
  else vo = $[41];
  let Yo;
  if ($[42] !== Wo || $[43] !== mn || $[44] !== Cn || $[45] !== No || $[46] !== vo)
    ((Yo = r(Box, { flexDirection: "column", marginTop: 1, children: [Wo, mn, Cn, No, vo] })),
      ($[42] = Wo),
      ($[43] = mn),
      ($[44] = Cn),
      ($[45] = No),
      ($[46] = vo),
      ($[47] = Yo));
  else Yo = $[47];
  return Yo;
}
/**
 * 调查卡片里的一个数字按钮：显示"数字: 标签"，悬停高亮，点击回调 onAction(digit)。
 */
//@ chunk-18hwfzwa.js:1007788-1008312 placement
function SurveyDigitButton(h) {
  let $ = w(9),
    { digit: digit, label: label, onAction: onAction } = h,
    ke;
  if ($[0] !== digit || $[1] !== onAction)
    ((ke = () => onAction(digit)), ($[0] = digit), ($[1] = onAction), ($[2] = ke));
  else ke = $[2];
  let Re;
  if ($[3] !== digit || $[4] !== label)
    ((Re = (Be) => {
      let { hovered: hovered } = Be;
      return r(Text, {
        backgroundColor: hovered ? USER_MESSAGE_BACKGROUND : void 0,
        children: [e(Text, { color: "ansi:cyan", children: digit }), ": ", label],
      });
    }),
      ($[3] = digit),
      ($[4] = label),
      ($[5] = Re));
  else Re = $[5];
  let Be;
  if ($[6] !== ke || $[7] !== Re)
    ((Be = e(Box, {
      marginRight: 3,
      flexShrink: 0,
      children: e(Button, { tabIndex: -1, mountSettleMs: DIGIT_HOTKEY_HOLD_MS, onAction: ke, children: Re }),
    })),
      ($[6] = ke),
      ($[7] = Re),
      ($[8] = Be));
  else Be = $[8];
  return Be;
}

export { SurveyCard };
