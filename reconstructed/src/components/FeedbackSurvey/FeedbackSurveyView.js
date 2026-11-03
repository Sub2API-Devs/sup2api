/**
 * components/FeedbackSurvey/FeedbackSurveyView.tsx
 *
 * 调查问题与数字选项的视图。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FeedbackSurvey/FeedbackSurveyView.tsx
 * pieces: chunk-18hwfzwa.js (14)
 * attribution: fingerprint 3, layout 1, placement 10
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { DIGIT_HOTKEY_HOLD_MS, useDigitHotkeys } from "../pluginUi/digitHotkeys.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { Button } from "../../ink/components/ErrorBoundary.js";
import { USER_MESSAGE_BACKGROUND } from "../CustomSelect/selectTypeahead.js";
import { BLACK_CIRCLE } from "../../utils/permissions/autoModeRulesPrompt.js";
import {
  TRANSCRIPT_SHARE_QUESTION,
  TRANSCRIPT_SHARE_DOCS_URL,
  TRANSCRIPT_SHARE_OPTIONS,
  TRANSCRIPT_SHARE_RESPONSES,
} from "./TranscriptSharePrompt.js";
import { LearnMoreLink } from "../LearnMoreLink.js";
import { j, y } from "../../../vendor/react/cjs/react.production.js";
import { isFeedbackAllowed } from "../../commands/feedback/feedbackPolicy.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { useShortcutDisplay } from "../../keybindings/useKeybindingDisplay.js";
import { formatKeyChords } from "../../keybindings/shortcutFormat.js";
import { parseChord } from "../../keybindings/parser.js";
import { getShortcutDisplayPlatform } from "../../utils/keyboardShortcuts.js";

//@ chunk-18hwfzwa.js:988815-989026 fingerprint = inputToResponse (0.631)
var RESPONSE_BY_KEY = { 0: "dismissed", 1: "bad", 2: "fine", 3: "good", 4: "not_sure" },
  RATING_OPTIONS = [
    { key: "1", label: "Bad" },
    { key: "2", label: "Fine" },
    { key: "3", label: "Good" },
  ],
  UNSURE_OPTION = { key: "4", label: "Unsure" },
  DISMISS_OPTION = { key: "0", label: "Dismiss" },
  ltt = 10;
//@ chunk-18hwfzwa.js:989026-989108 layout
function e4(h, x = !1) {
  if (h === "4") return x;
  return h === "0" || h === "1" || h === "2" || h === "3";
}
//@ chunk-18hwfzwa.js:989108-989162 fingerprint = DEFAULT_MESSAGE (1)
var DEFAULT_MESSAGE = "How is Claude doing this session? (optional)";
//@ chunk-18hwfzwa.js:989162-990745 fingerprint = FeedbackSurveyView (0.496)
function FeedbackSurveyView(t0) {
  let $ = w(25),
    {
      onSelect: onSelect,
      inputValue: inputValue,
      setInputValue: setInputValue,
      message: t1,
      messageBold: messageBold,
      mountDelayMs: mountDelayMs,
      showNotSure: showNotSure,
    } = t0,
    He = t1 === void 0 ? DEFAULT_MESSAGE : t1,
    We = messageBold === void 0 ? !0 : messageBold,
    ze = mountDelayMs === void 0 ? DIGIT_HOTKEY_HOLD_MS : mountDelayMs,
    Xe = showNotSure === void 0 ? !1 : showNotSure,
    kt;
  if ($[0] !== Xe)
    ((kt = Xe ? [...RATING_OPTIONS, UNSURE_OPTION, DISMISS_OPTION] : [...RATING_OPTIONS, DISMISS_OPTION]),
      ($[0] = Xe),
      ($[1] = kt));
  else kt = $[1];
  let At = kt,
    It;
  if ($[2] !== onSelect || $[3] !== setInputValue)
    ((It = function Dt(Ot, Et) {
      (setInputValue(""), onSelect(RESPONSE_BY_KEY[Ot], Et));
    }),
      ($[2] = onSelect),
      ($[3] = setInputValue),
      ($[4] = It));
  else It = $[4];
  let Dt = It,
    Lt;
  if ($[5] !== Xe) ((Lt = (oo) => e4(oo, Xe)), ($[5] = Xe), ($[6] = Lt));
  else Lt = $[6];
  let Xt;
  if ($[7] !== Dt) ((Xt = (io) => Dt(io, "digit")), ($[7] = Dt), ($[8] = Xt));
  else Xt = $[8];
  let so;
  if ($[9] !== inputValue || $[10] !== ze || $[11] !== Lt || $[12] !== Xt)
    ((so = { inputValue: inputValue, isValidDigit: Lt, onDigit: Xt, mountDelayMs: ze }),
      ($[9] = inputValue),
      ($[10] = ze),
      ($[11] = Lt),
      ($[12] = Xt),
      ($[13] = so));
  else so = $[13];
  useDigitHotkeys(so);
  let po;
  if ($[14] === MEMO_CACHE_SENTINEL)
    ((po = e(Box, { minWidth: 2, children: e(Text, { color: "ansi:cyan", children: "\u25CF" }) })),
      ($[14] = po));
  else po = $[14];
  let ao;
  if ($[15] !== He || $[16] !== We)
    ((ao = r(Box, { children: [po, e(Text, { bold: We, wrap: "wrap", children: He })] })),
      ($[15] = He),
      ($[16] = We),
      ($[17] = ao));
  else ao = $[17];
  let co;
  if ($[18] !== ze || $[19] !== At || $[20] !== Dt)
    ((co = e(Box, {
      marginLeft: 2,
      children: At.map((bo) => {
        let { key: key, label: label } = bo;
        return e(
          Box,
          {
            width: ltt,
            children: e(Button, {
              tabIndex: -1,
              mountSettleMs: ze,
              onAction: () => Dt(key, "click"),
              children: (Ro) => {
                let { hovered: hovered } = Ro;
                return r(Text, {
                  backgroundColor: hovered ? USER_MESSAGE_BACKGROUND : void 0,
                  children: [e(Text, { color: "ansi:cyan", children: key }), ": ", label],
                });
              },
            }),
          },
          key,
        );
      }),
    })),
      ($[18] = ze),
      ($[19] = At),
      ($[20] = Dt),
      ($[21] = co));
  else co = $[21];
  let bo;
  if ($[22] !== ao || $[23] !== co)
    ((bo = r(Box, { flexDirection: "column", marginTop: 1, children: [ao, co] })),
      ($[22] = ao),
      ($[23] = co),
      ($[24] = bo));
  else bo = $[24];
  return bo;
}
//@ chunk-18hwfzwa.js:995644-996368 placement
function SurveyOption(h) {
  let $ = w(6),
    { onSelect: onSelect } = h,
    L;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((L = r(Box, {
      children: [
        r(Text, { color: "ansi:cyan", children: [BLACK_CIRCLE, " "] }),
        e(Text, { bold: !0, children: TRANSCRIPT_SHARE_QUESTION }),
      ],
    })),
      ($[0] = L));
  else L = $[0];
  let ee;
  if ($[1] === MEMO_CACHE_SENTINEL)
    ((ee = e(Box, { marginLeft: 2, children: e(LearnMoreLink, { url: TRANSCRIPT_SHARE_DOCS_URL }) })),
      ($[1] = ee));
  else ee = $[1];
  let ke;
  if ($[2] !== onSelect)
    ((ke = TRANSCRIPT_SHARE_OPTIONS.map((Re) => {
      let { key: key, label: label, width: width } = Re;
      return e(
        Box,
        {
          width: width,
          children: e(Button, {
            tabIndex: -1,
            mountSettleMs: DIGIT_HOTKEY_HOLD_MS,
            onAction: () => onSelect(TRANSCRIPT_SHARE_RESPONSES[key]),
            children: (ze) => {
              let { hovered: hovered } = ze;
              return r(Text, {
                backgroundColor: hovered ? USER_MESSAGE_BACKGROUND : void 0,
                children: [e(Text, { color: "ansi:cyan", children: key }), ": ", label],
              });
            },
          }),
        },
        key,
      );
    })),
      ($[2] = onSelect),
      ($[3] = ke));
  else ke = $[3];
  let Re;
  if ($[4] !== ke)
    ((Re = r(Box, { flexDirection: "column", children: [L, ee, e(Box, { marginLeft: 2, children: ke })] })),
      ($[4] = ke),
      ($[5] = Re));
  else Re = $[5];
  return Re;
}
//@ chunk-18hwfzwa.js:996368-996372 placement
j();
//@ chunk-18hwfzwa.js:996372-996399 placement
function sfo() {
  return isFeedbackAllowed();
}
//@ chunk-18hwfzwa.js:996399-996433 placement
var S$ = "Thanks for the feedback!";
//@ chunk-18hwfzwa.js:996433-997685 placement
function TranscriptShareStatus(h) {
  let $ = w(9),
    [x] = y(sfo);
  switch (h.state) {
    case "submitting": {
      let L;
      if ($[0] === MEMO_CACHE_SENTINEL)
        ((L = r(Text, { dimColor: !0, children: ["Sharing transcript", "\u2026"] })), ($[0] = L));
      else L = $[0];
      return L;
    }
    case "submitted": {
      let L;
      if ($[1] !== h.transcriptBundlePath)
        ((L = h.transcriptBundlePath
          ? r(Box, {
              flexDirection: "column",
              children: [
                r(Text, {
                  color: "success",
                  children: [e(StatusIcon, { status: "success", withSpace: !0 }), "Transcript bundle saved"],
                }),
                e(Text, { dimColor: !0, wrap: "wrap", children: h.transcriptBundlePath }),
                e(Text, {
                  wrap: "wrap",
                  children:
                    "Send this file to your Anthropic account representative or attach it to your support request.",
                }),
              ],
            })
          : r(Text, {
              color: "success",
              children: [
                e(StatusIcon, { status: "success", withSpace: !0 }),
                "Thanks for sharing your transcript!",
              ],
            })),
          ($[1] = h.transcriptBundlePath),
          ($[2] = L));
      else L = $[2];
      return L;
    }
    case "share_failed": {
      let L;
      if ($[3] === MEMO_CACHE_SENTINEL)
        ((L = r(Text, {
          color: "error",
          children: [e(StatusIcon, { status: "error", withSpace: !0 }), "Couldn't share the transcript."],
        })),
          ($[3] = L));
      else L = $[3];
      let ee;
      if ($[4] !== x)
        ((ee = x
          ? e(Text, { dimColor: !0, children: "You can share details with /feedback instead." })
          : null),
          ($[4] = x),
          ($[5] = ee));
      else ee = $[5];
      let ke;
      if ($[6] !== ee)
        ((ke = r(Box, { flexDirection: "column", children: [L, ee] })), ($[6] = ee), ($[7] = ke));
      else ke = $[7];
      return ke;
    }
    case "thanks": {
      let L;
      if ($[8] === MEMO_CACHE_SENTINEL) ((L = e(Text, { color: "success", children: S$ })), ($[8] = L));
      else L = $[8];
      return L;
    }
  }
}
//@ chunk-18hwfzwa.js:997685-997732 placement
function ufo(h) {
  let { chord: chord } = h;
  return chord !== "";
}
//@ chunk-18hwfzwa.js:997732-997789 placement
function mfo(h) {
  let { chord: chord } = h;
  return Ptt.exec(chord)?.[1];
}
//@ chunk-18hwfzwa.js:997789-997811 placement
var Ptt = /^(\S+) \S+$/;
//@ chunk-18hwfzwa.js:997811-999512 placement
function FeedbackRatingRow(h) {
  let $ = w(16),
    { onSelect: onSelect } = h,
    L;
  if ($[0] !== onSelect)
    ((L = {
      "feedbackSurvey:bad": () => onSelect("bad", "chord"),
      "feedbackSurvey:fine": () => onSelect("fine", "chord"),
      "feedbackSurvey:good": () => onSelect("good", "chord"),
    }),
      ($[0] = onSelect),
      ($[1] = L));
  else L = $[1];
  let ee;
  if ($[2] === MEMO_CACHE_SENTINEL) ((ee = { context: "FeedbackSurvey" }), ($[2] = ee));
  else ee = $[2];
  MessageActionsKeybindings(L, ee);
  let filtered = [
      {
        response: "bad",
        label: "Bad",
        chord: useShortcutDisplay("feedbackSurvey:bad", "FeedbackSurvey", "ctrl+x 1"),
      },
      {
        response: "fine",
        label: "Fine",
        chord: useShortcutDisplay("feedbackSurvey:fine", "FeedbackSurvey", "ctrl+x 2"),
      },
      {
        response: "good",
        label: "Good",
        chord: useShortcutDisplay("feedbackSurvey:good", "FeedbackSurvey", "ctrl+x 3"),
      },
    ].filter(ufo),
    mapped = filtered.map(mfo),
    He = mapped.every((Be) => Be === mapped[0]) ? mapped[0] : void 0;
  const We = Box,
    ze = "column",
    Xe = 1;
  let rt;
  if ($[3] === MEMO_CACHE_SENTINEL)
    ((rt = r(Box, {
      children: [
        e(Box, { minWidth: 2, children: e(Text, { dimColor: !0, children: "\u25CF" }) }),
        e(Text, { dimColor: !0, wrap: "wrap", children: DEFAULT_MESSAGE }),
      ],
    })),
      ($[3] = rt));
  else rt = $[3];
  const kt = Box,
    At = 2,
    It = "wrap",
    Ot = 1,
    Et =
      filtered.length > 0 &&
      e(Text, {
        dimColor: !0,
        children: He === void 0 ? "to rate, press " : `to rate, press ${checkChordReserved(He)} and then `,
      });
  let Dt;
  if ($[4] !== filtered || $[5] !== onSelect || $[6] !== He)
    ((Dt = filtered.map((Lt) => {
      let { response: response, label: label, chord: chord } = Lt;
      return e(
        Box,
        {
          marginRight: 2,
          children: e(Button, {
            tabIndex: -1,
            mountSettleMs: DIGIT_HOTKEY_HOLD_MS,
            onAction: () => onSelect(response, "click"),
            children: (so) => {
              let { hovered: hovered } = so;
              return r(Text, {
                dimColor: !0,
                backgroundColor: hovered ? USER_MESSAGE_BACKGROUND : void 0,
                children: [
                  checkChordReserved(He === void 0 ? chord : chord.slice(He.length + 1)),
                  ": ",
                  label,
                ],
              });
            },
          }),
        },
        response,
      );
    })),
      ($[4] = filtered),
      ($[5] = onSelect),
      ($[6] = He),
      ($[7] = Dt));
  else Dt = $[7];
  let Lt;
  if ($[8] !== kt || $[9] !== Dt || $[10] !== Et)
    ((Lt = r(kt, { marginLeft: At, flexWrap: It, minHeight: Ot, children: [Et, Dt] })),
      ($[8] = kt),
      ($[9] = Dt),
      ($[10] = Et),
      ($[11] = Lt));
  else Lt = $[11];
  let so;
  if ($[12] !== We || $[13] !== Lt || $[14] !== rt)
    ((so = r(We, { flexDirection: ze, marginTop: Xe, children: [rt, Lt] })),
      ($[12] = We),
      ($[13] = Lt),
      ($[14] = rt),
      ($[15] = so));
  else so = $[15];
  return so;
}
//@ chunk-18hwfzwa.js:999512-999590 placement = getReservedShortcuts (0.784)
function checkChordReserved(h) {
  return formatKeyChords([parseChord(h)], {
    platform: getShortcutDisplayPlatform() === "macos" ? "macos" : "other",
  });
}

export { FeedbackSurveyView, SurveyOption, TranscriptShareStatus, e4, FeedbackRatingRow, S$ };
