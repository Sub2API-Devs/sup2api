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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
import { init_react_production, y } from "../../../vendor/react/cjs/react.production.js";
import { isFeedbackAllowed } from "../../commands/feedback/feedbackPolicy.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { useShortcutDisplay } from "../../keybindings/useKeybindingDisplay.js";
import { formatKeyChords } from "../../keybindings/shortcutFormat.js";
import { parseChord } from "../../keybindings/parser.js";
import { getShortcutDisplayPlatform } from "../../utils/keyboardShortcuts.js";

//@ chunk-18hwfzwa.js:988815-989026 fingerprint = inputToResponse (0.631)
var RESPONSE_BY_KEY = {
  0: "dismissed",
  1: "bad",
  2: "fine",
  3: "good",
  4: "not_sure",
};
var RATING_OPTIONS = [
  {
    key: "1",
    label: "Bad",
  },
  {
    key: "2",
    label: "Fine",
  },
  {
    key: "3",
    label: "Good",
  },
];
var UNSURE_OPTION = {
  key: "4",
  label: "Unsure",
};
var DISMISS_OPTION = {
  key: "0",
  label: "Dismiss",
};
var RATING_BUTTON_WIDTH = 10;
//@ chunk-18hwfzwa.js:989026-989108 layout
function isSelectableResponseKey(h, x = false) {
  if (h === "4") return x;
  return h === "0" || h === "1" || h === "2" || h === "3";
}
//@ chunk-18hwfzwa.js:989108-989162 fingerprint = DEFAULT_MESSAGE (1)
var DEFAULT_MESSAGE = "How is Claude doing this session? (optional)";
//@ chunk-18hwfzwa.js:989162-990745 fingerprint = FeedbackSurveyView (0.496)
function FeedbackSurveyView(props) {
  let $ = w(25);
  let { onSelect, inputValue, setInputValue, message, messageBold, mountDelayMs, showNotSure } = props;
  let children = message === undefined ? DEFAULT_MESSAGE : message;
  let bold = messageBold === undefined ? true : messageBold;
  let ze = mountDelayMs === undefined ? DIGIT_HOTKEY_HOLD_MS : mountDelayMs;
  let Xe = showNotSure === undefined ? false : showNotSure;
  let kt;
  if ($[0] !== Xe) {
    kt = Xe ? [...RATING_OPTIONS, UNSURE_OPTION, DISMISS_OPTION] : [...RATING_OPTIONS, DISMISS_OPTION];
    $[0] = Xe;
    $[1] = kt;
  } else kt = $[1];
  let At = kt;
  let It;
  if ($[2] !== onSelect || $[3] !== setInputValue) {
    It = function Dt(Ot, Et) {
      setInputValue("");
      onSelect(RESPONSE_BY_KEY[Ot], Et);
    };
    $[2] = onSelect;
    $[3] = setInputValue;
    $[4] = It;
  } else It = $[4];
  let Dt = It;
  let isValidDigit;
  if ($[5] !== Xe) {
    isValidDigit = (oo) => isSelectableResponseKey(oo, Xe);
    $[5] = Xe;
    $[6] = isValidDigit;
  } else isValidDigit = $[6];
  let onDigit;
  if ($[7] !== Dt) {
    onDigit = (io) => Dt(io, "digit");
    $[7] = Dt;
    $[8] = onDigit;
  } else onDigit = $[8];
  let so;
  if ($[9] !== inputValue || $[10] !== ze || $[11] !== isValidDigit || $[12] !== onDigit) {
    so = {
      inputValue,
      isValidDigit,
      onDigit,
      mountDelayMs: ze,
    };
    $[9] = inputValue;
    $[10] = ze;
    $[11] = isValidDigit;
    $[12] = onDigit;
    $[13] = so;
  } else so = $[13];
  useDigitHotkeys(so);
  let po;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    po = jsxProd_default(Box, {
      minWidth: 2,
      children: jsxProd_default(Text, {
        color: "ansi:cyan",
        children: "\u25CF",
      }),
    });
    $[14] = po;
  } else po = $[14];
  let ao;
  if ($[15] !== children || $[16] !== bold) {
    ao = jsxProd_default_2(Box, {
      children: [
        po,
        jsxProd_default(Text, {
          bold,
          wrap: "wrap",
          children,
        }),
      ],
    });
    $[15] = children;
    $[16] = bold;
    $[17] = ao;
  } else ao = $[17];
  let co;
  if ($[18] !== ze || $[19] !== At || $[20] !== Dt) {
    co = jsxProd_default(Box, {
      marginLeft: 2,
      children: At.map((bo) => {
        let { key, label } = bo;
        return jsxProd_default(
          Box,
          {
            width: RATING_BUTTON_WIDTH,
            children: jsxProd_default(Button, {
              tabIndex: -1,
              mountSettleMs: ze,
              onAction: () => Dt(key, "click"),
              children: (Ro) => {
                let { hovered } = Ro;
                return jsxProd_default_2(Text, {
                  backgroundColor: hovered ? USER_MESSAGE_BACKGROUND : undefined,
                  children: [
                    jsxProd_default(Text, {
                      color: "ansi:cyan",
                      children: key,
                    }),
                    ": ",
                    label,
                  ],
                });
              },
            }),
          },
          key,
        );
      }),
    });
    $[18] = ze;
    $[19] = At;
    $[20] = Dt;
    $[21] = co;
  } else co = $[21];
  let bo;
  if ($[22] !== ao || $[23] !== co) {
    bo = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [ao, co],
    });
    $[22] = ao;
    $[23] = co;
    $[24] = bo;
  } else bo = $[24];
  return bo;
}
//@ chunk-18hwfzwa.js:995644-996368 placement
function SurveyOption(props) {
  let $ = w(6);
  let { onSelect } = props;
  let L;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    L = jsxProd_default_2(Box, {
      children: [
        jsxProd_default_2(Text, {
          color: "ansi:cyan",
          children: [BLACK_CIRCLE, " "],
        }),
        jsxProd_default(Text, {
          bold: true,
          children: TRANSCRIPT_SHARE_QUESTION,
        }),
      ],
    });
    $[0] = L;
  } else L = $[0];
  let ee;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    ee = jsxProd_default(Box, {
      marginLeft: 2,
      children: jsxProd_default(LearnMoreLink, {
        url: TRANSCRIPT_SHARE_DOCS_URL,
      }),
    });
    $[1] = ee;
  } else ee = $[1];
  let children;
  if ($[2] !== onSelect) {
    children = TRANSCRIPT_SHARE_OPTIONS.map((Re) => {
      let { key, label, width } = Re;
      return jsxProd_default(
        Box,
        {
          width,
          children: jsxProd_default(Button, {
            tabIndex: -1,
            mountSettleMs: DIGIT_HOTKEY_HOLD_MS,
            onAction: () => onSelect(TRANSCRIPT_SHARE_RESPONSES[key]),
            children: (ze) => {
              let { hovered } = ze;
              return jsxProd_default_2(Text, {
                backgroundColor: hovered ? USER_MESSAGE_BACKGROUND : undefined,
                children: [
                  jsxProd_default(Text, {
                    color: "ansi:cyan",
                    children: key,
                  }),
                  ": ",
                  label,
                ],
              });
            },
          }),
        },
        key,
      );
    });
    $[2] = onSelect;
    $[3] = children;
  } else children = $[3];
  let Re;
  if ($[4] !== children) {
    Re = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        L,
        ee,
        jsxProd_default(Box, {
          marginLeft: 2,
          children,
        }),
      ],
    });
    $[4] = children;
    $[5] = Re;
  } else Re = $[5];
  return Re;
}
//@ chunk-18hwfzwa.js:996368-996372 placement
init_react_production();
//@ chunk-18hwfzwa.js:996372-996399 placement
function getIsFeedbackAllowed() {
  return isFeedbackAllowed();
}
//@ chunk-18hwfzwa.js:996399-996433 placement
var THANKS_FOR_FEEDBACK_TEXT = "Thanks for the feedback!";
//@ chunk-18hwfzwa.js:996433-997685 placement
function TranscriptShareStatus(h) {
  let $ = w(9);
  let [x] = y(getIsFeedbackAllowed);
  switch (h.state) {
    case "submitting": {
      let L;
      if ($[0] === MEMO_CACHE_SENTINEL) {
        L = jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Sharing transcript", "\u2026"],
        });
        $[0] = L;
      } else L = $[0];
      return L;
    }
    case "submitted": {
      let L;
      if ($[1] !== h.transcriptBundlePath) {
        L = h.transcriptBundlePath
          ? jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [
                jsxProd_default_2(Text, {
                  color: "success",
                  children: [
                    jsxProd_default(StatusIcon, {
                      status: "success",
                      withSpace: true,
                    }),
                    "Transcript bundle saved",
                  ],
                }),
                jsxProd_default(Text, {
                  dimColor: true,
                  wrap: "wrap",
                  children: h.transcriptBundlePath,
                }),
                jsxProd_default(Text, {
                  wrap: "wrap",
                  children:
                    "Send this file to your Anthropic account representative or attach it to your support request.",
                }),
              ],
            })
          : jsxProd_default_2(Text, {
              color: "success",
              children: [
                jsxProd_default(StatusIcon, {
                  status: "success",
                  withSpace: true,
                }),
                "Thanks for sharing your transcript!",
              ],
            });
        $[1] = h.transcriptBundlePath;
        $[2] = L;
      } else L = $[2];
      return L;
    }
    case "share_failed": {
      let L;
      if ($[3] === MEMO_CACHE_SENTINEL) {
        L = jsxProd_default_2(Text, {
          color: "error",
          children: [
            jsxProd_default(StatusIcon, {
              status: "error",
              withSpace: true,
            }),
            "Couldn't share the transcript.",
          ],
        });
        $[3] = L;
      } else L = $[3];
      let ee;
      if ($[4] !== x) {
        ee = x
          ? jsxProd_default(Text, {
              dimColor: true,
              children: "You can share details with /feedback instead.",
            })
          : null;
        $[4] = x;
        $[5] = ee;
      } else ee = $[5];
      let ke;
      if ($[6] !== ee) {
        ke = jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [L, ee],
        });
        $[6] = ee;
        $[7] = ke;
      } else ke = $[7];
      return ke;
    }
    case "thanks": {
      let L;
      if ($[8] === MEMO_CACHE_SENTINEL) {
        L = jsxProd_default(Text, {
          color: "success",
          children: THANKS_FOR_FEEDBACK_TEXT,
        });
        $[8] = L;
      } else L = $[8];
      return L;
    }
  }
}
//@ chunk-18hwfzwa.js:997685-997732 placement
function hasShortcutChord(h) {
  let { chord } = h;
  return chord !== "";
}
//@ chunk-18hwfzwa.js:997732-997789 placement
function shortcutChordKey(h) {
  let { chord } = h;
  return SHORTCUT_CHORD_KEY_RE.exec(chord)?.[1];
}
//@ chunk-18hwfzwa.js:997789-997811 placement
var SHORTCUT_CHORD_KEY_RE = /^(\S+) \S+$/;
//@ chunk-18hwfzwa.js:997811-999512 placement
function FeedbackRatingRow(props) {
  let $ = w(16);
  let { onSelect } = props;
  let L;
  if ($[0] !== onSelect) {
    L = {
      "feedbackSurvey:bad": () => onSelect("bad", "chord"),
      "feedbackSurvey:fine": () => onSelect("fine", "chord"),
      "feedbackSurvey:good": () => onSelect("good", "chord"),
    };
    $[0] = onSelect;
    $[1] = L;
  } else L = $[1];
  let ee;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    ee = {
      context: "FeedbackSurvey",
    };
    $[2] = ee;
  } else ee = $[2];
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
  ].filter(hasShortcutChord);
  let mapped = filtered.map(shortcutChordKey);
  let He = mapped.every((Be) => Be === mapped[0]) ? mapped[0] : undefined;
  const We = Box;
  const flexDirection = "column";
  const marginTop = 1;
  let rt;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    rt = jsxProd_default_2(Box, {
      children: [
        jsxProd_default(Box, {
          minWidth: 2,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: "\u25CF",
          }),
        }),
        jsxProd_default(Text, {
          dimColor: true,
          wrap: "wrap",
          children: DEFAULT_MESSAGE,
        }),
      ],
    });
    $[3] = rt;
  } else rt = $[3];
  const kt = Box;
  const marginLeft = 2;
  const flexWrap = "wrap";
  const minHeight = 1;
  const Et =
    filtered.length > 0 &&
    jsxProd_default(Text, {
      dimColor: true,
      children: He === undefined ? "to rate, press " : `to rate, press ${checkChordReserved(He)} and then `,
    });
  let Dt;
  if ($[4] !== filtered || $[5] !== onSelect || $[6] !== He) {
    Dt = filtered.map((Lt) => {
      let { response, label, chord } = Lt;
      return jsxProd_default(
        Box,
        {
          marginRight: 2,
          children: jsxProd_default(Button, {
            tabIndex: -1,
            mountSettleMs: DIGIT_HOTKEY_HOLD_MS,
            onAction: () => onSelect(response, "click"),
            children: (so) => {
              let { hovered } = so;
              return jsxProd_default_2(Text, {
                dimColor: true,
                backgroundColor: hovered ? USER_MESSAGE_BACKGROUND : undefined,
                children: [
                  checkChordReserved(He === undefined ? chord : chord.slice(He.length + 1)),
                  ": ",
                  label,
                ],
              });
            },
          }),
        },
        response,
      );
    });
    $[4] = filtered;
    $[5] = onSelect;
    $[6] = He;
    $[7] = Dt;
  } else Dt = $[7];
  let Lt;
  if ($[8] !== kt || $[9] !== Dt || $[10] !== Et) {
    Lt = jsxProd_default_2(kt, {
      marginLeft,
      flexWrap,
      minHeight,
      children: [Et, Dt],
    });
    $[8] = kt;
    $[9] = Dt;
    $[10] = Et;
    $[11] = Lt;
  } else Lt = $[11];
  let so;
  if ($[12] !== We || $[13] !== Lt || $[14] !== rt) {
    so = jsxProd_default_2(We, {
      flexDirection,
      marginTop,
      children: [rt, Lt],
    });
    $[12] = We;
    $[13] = Lt;
    $[14] = rt;
    $[15] = so;
  } else so = $[15];
  return so;
}
//@ chunk-18hwfzwa.js:999512-999590 placement = getReservedShortcuts (0.784)
function checkChordReserved(h) {
  return formatKeyChords([parseChord(h)], {
    platform: getShortcutDisplayPlatform() === "macos" ? "macos" : "other",
  });
}
export {
  FeedbackSurveyView,
  SurveyOption,
  TranscriptShareStatus,
  isSelectableResponseKey,
  FeedbackRatingRow,
  THANKS_FOR_FEEDBACK_TEXT,
};
