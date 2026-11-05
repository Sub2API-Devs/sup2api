/**
 * components/FeedbackSurvey/FeedbackSurveyView.tsx
 *
 * 调查问题与数字选项的视图。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FeedbackSurvey/FeedbackSurveyView.tsx
 * pieces: chunk-czq1j3j2.js (14)
 * attribution: placement 10, fingerprint 3, layout 1
 */
import { init_react_production, useState } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { DIGIT_HOTKEY_HOLD_MS, useDigitHotkeys } from "../pluginUi/digitHotkeys.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { Button } from "../../ink/components/ErrorBoundary.js";
import { USER_MESSAGE_BACKGROUND } from "../CustomSelect/selectTypeahead.js";
import { BLACK_CIRCLE } from "../../constants/figures.js";
import {
  TRANSCRIPT_SHARE_QUESTION,
  TRANSCRIPT_SHARE_DOCS_URL,
  TRANSCRIPT_SHARE_OPTIONS,
  TRANSCRIPT_SHARE_RESPONSES,
} from "./TranscriptSharePrompt.js";
import { LearnMoreLink } from "../LearnMoreLink.js";
import { isFeedbackAllowed } from "../../commands/feedback/feedbackPolicy.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { useShortcutDisplay } from "../../keybindings/useKeybindingDisplay.js";
import { formatKeyChords } from "../../keybindings/shortcutFormat.js";
import { parseChord } from "../../keybindings/parser.js";
import { getShortcutDisplayPlatform } from "../../utils/keyboardShortcuts.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1012677-1012681 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1012677", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1022847-1023058 fingerprint (2.1.88 match: inputToResponse, 0.632)
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
//@ chunk-czq1j3j2.js:1023058-1023140 layout
function isSelectableResponseKey(key, allowFour = false) {
  if (key === "4") return allowFour;
  return key === "0" || key === "1" || key === "2" || key === "3";
}
//@ chunk-czq1j3j2.js:1023140-1023194 fingerprint (2.1.88 match: DEFAULT_MESSAGE, 1)
var DEFAULT_MESSAGE = "How is Claude doing this session? (optional)";
//@ chunk-czq1j3j2.js:1023194-1024777 fingerprint (2.1.88 match: FeedbackSurveyView, 0.496)
function FeedbackSurveyView(props) {
  let $ = useMemoCache(25);
  let { onSelect, inputValue, setInputValue, message, messageBold, mountDelayMs, showNotSure } = props;
  let children = message === undefined ? DEFAULT_MESSAGE : message;
  let bold = messageBold === undefined ? true : messageBold;
  let settleMs = mountDelayMs === undefined ? DIGIT_HOTKEY_HOLD_MS : mountDelayMs;
  let includeNotSure = showNotSure === undefined ? false : showNotSure;
  let optionsCached;
  if ($[0] !== includeNotSure) {
    optionsCached = includeNotSure
      ? [...RATING_OPTIONS, UNSURE_OPTION, DISMISS_OPTION]
      : [...RATING_OPTIONS, DISMISS_OPTION];
    $[0] = includeNotSure;
    $[1] = optionsCached;
  } else optionsCached = $[1];
  let options = optionsCached;
  let selectCached;
  if ($[2] !== onSelect || $[3] !== setInputValue) {
    selectCached = function handleSelect(key, source) {
      setInputValue("");
      onSelect(RESPONSE_BY_KEY[key], source);
    };
    $[2] = onSelect;
    $[3] = setInputValue;
    $[4] = selectCached;
  } else selectCached = $[4];
  let selectByKey = selectCached;
  let isValidDigit;
  if ($[5] !== includeNotSure) {
    isValidDigit = (key) => isSelectableResponseKey(key, includeNotSure);
    $[5] = includeNotSure;
    $[6] = isValidDigit;
  } else isValidDigit = $[6];
  let onDigit;
  if ($[7] !== selectByKey) {
    onDigit = (key) => selectByKey(key, "digit");
    $[7] = selectByKey;
    $[8] = onDigit;
  } else onDigit = $[8];
  let digitHotkeyOptions;
  if ($[9] !== inputValue || $[10] !== settleMs || $[11] !== isValidDigit || $[12] !== onDigit) {
    digitHotkeyOptions = {
      inputValue,
      isValidDigit,
      onDigit,
      mountDelayMs: settleMs,
    };
    $[9] = inputValue;
    $[10] = settleMs;
    $[11] = isValidDigit;
    $[12] = onDigit;
    $[13] = digitHotkeyOptions;
  } else digitHotkeyOptions = $[13];
  useDigitHotkeys(digitHotkeyOptions);
  let bulletElement;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    bulletElement = jsxProd_default(Box, {
      minWidth: 2,
      children: jsxProd_default(Text, {
        color: "ansi:cyan",
        children: "\u25CF",
      }),
    });
    $[14] = bulletElement;
  } else bulletElement = $[14];
  let headerRow;
  if ($[15] !== children || $[16] !== bold) {
    headerRow = jsxProd_default_2(Box, {
      children: [
        bulletElement,
        jsxProd_default(Text, {
          bold,
          wrap: "wrap",
          children,
        }),
      ],
    });
    $[15] = children;
    $[16] = bold;
    $[17] = headerRow;
  } else headerRow = $[17];
  let buttonsRow;
  if ($[18] !== settleMs || $[19] !== options || $[20] !== selectByKey) {
    buttonsRow = jsxProd_default(Box, {
      marginLeft: 2,
      children: options.map((option) => {
        let { key, label } = option;
        return jsxProd_default(
          Box,
          {
            width: RATING_BUTTON_WIDTH,
            children: jsxProd_default(Button, {
              tabIndex: -1,
              mountSettleMs: settleMs,
              onAction: () => selectByKey(key, "click"),
              children: (state) => {
                let { hovered } = state;
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
    $[18] = settleMs;
    $[19] = options;
    $[20] = selectByKey;
    $[21] = buttonsRow;
  } else buttonsRow = $[21];
  let viewElement;
  if ($[22] !== headerRow || $[23] !== buttonsRow) {
    viewElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [headerRow, buttonsRow],
    });
    $[22] = headerRow;
    $[23] = buttonsRow;
    $[24] = viewElement;
  } else viewElement = $[24];
  return viewElement;
}
//@ chunk-czq1j3j2.js:1029679-1030403 placement
function SurveyOption(props) {
  let $ = useMemoCache(6);
  let { onSelect } = props;
  let headerCached;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    headerCached = jsxProd_default_2(Box, {
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
    $[0] = headerCached;
  } else headerCached = $[0];
  let learnMoreCached;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    learnMoreCached = jsxProd_default(Box, {
      marginLeft: 2,
      children: jsxProd_default(LearnMoreLink, {
        url: TRANSCRIPT_SHARE_DOCS_URL,
      }),
    });
    $[1] = learnMoreCached;
  } else learnMoreCached = $[1];
  let children;
  if ($[2] !== onSelect) {
    children = TRANSCRIPT_SHARE_OPTIONS.map((option) => {
      let { key, label, width } = option;
      return jsxProd_default(
        Box,
        {
          width,
          children: jsxProd_default(Button, {
            tabIndex: -1,
            mountSettleMs: DIGIT_HOTKEY_HOLD_MS,
            onAction: () => onSelect(TRANSCRIPT_SHARE_RESPONSES[key]),
            children: (state) => {
              let { hovered } = state;
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
  let element;
  if ($[4] !== children) {
    element = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        headerCached,
        learnMoreCached,
        jsxProd_default(Box, {
          marginLeft: 2,
          children,
        }),
      ],
    });
    $[4] = children;
    $[5] = element;
  } else element = $[5];
  return element;
}
//@ chunk-czq1j3j2.js:1030407-1030434 placement
function getIsFeedbackAllowed() {
  return isFeedbackAllowed();
}
//@ chunk-czq1j3j2.js:1030434-1030468 placement
var THANKS_FOR_FEEDBACK_TEXT = "Thanks for the feedback!";
//@ chunk-czq1j3j2.js:1030468-1031720 placement
function TranscriptShareStatus(status) {
  let $ = useMemoCache(9);
  let [isFeedbackAllowed] = useState(getIsFeedbackAllowed);
  switch (status.state) {
    case "submitting": {
      let submittingText;
      if ($[0] === MEMO_CACHE_SENTINEL) {
        submittingText = jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Sharing transcript", "\u2026"],
        });
        $[0] = submittingText;
      } else submittingText = $[0];
      return submittingText;
    }
    case "submitted": {
      let submittedElement;
      if ($[1] !== status.transcriptBundlePath) {
        submittedElement = status.transcriptBundlePath
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
                  children: status.transcriptBundlePath,
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
        $[1] = status.transcriptBundlePath;
        $[2] = submittedElement;
      } else submittedElement = $[2];
      return submittedElement;
    }
    case "share_failed": {
      let failureText;
      if ($[3] === MEMO_CACHE_SENTINEL) {
        failureText = jsxProd_default_2(Text, {
          color: "error",
          children: [
            jsxProd_default(StatusIcon, {
              status: "error",
              withSpace: true,
            }),
            "Couldn't share the transcript.",
          ],
        });
        $[3] = failureText;
      } else failureText = $[3];
      let fallbackHint;
      if ($[4] !== isFeedbackAllowed) {
        fallbackHint = isFeedbackAllowed
          ? jsxProd_default(Text, {
              dimColor: true,
              children: "You can share details with /feedback instead.",
            })
          : null;
        $[4] = isFeedbackAllowed;
        $[5] = fallbackHint;
      } else fallbackHint = $[5];
      let failureElement;
      if ($[6] !== fallbackHint) {
        failureElement = jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [failureText, fallbackHint],
        });
        $[6] = fallbackHint;
        $[7] = failureElement;
      } else failureElement = $[7];
      return failureElement;
    }
    case "thanks": {
      let thanksText;
      if ($[8] === MEMO_CACHE_SENTINEL) {
        thanksText = jsxProd_default(Text, {
          color: "success",
          children: THANKS_FOR_FEEDBACK_TEXT,
        });
        $[8] = thanksText;
      } else thanksText = $[8];
      return thanksText;
    }
  }
}
//@ chunk-czq1j3j2.js:1031720-1031767 placement
function hasShortcutChord(hint) {
  let { chord } = hint;
  return chord !== "";
}
//@ chunk-czq1j3j2.js:1031767-1031824 placement
function shortcutChordKey(hint) {
  let { chord } = hint;
  return SHORTCUT_CHORD_KEY_RE.exec(chord)?.[1];
}
//@ chunk-czq1j3j2.js:1031824-1031846 placement
var SHORTCUT_CHORD_KEY_RE = /^(\S+) \S+$/;
//@ chunk-czq1j3j2.js:1031846-1033547 placement
function FeedbackRatingRow(props) {
  let $ = useMemoCache(16);
  let { onSelect } = props;
  let keybindings;
  if ($[0] !== onSelect) {
    keybindings = {
      "feedbackSurvey:bad": () => onSelect("bad", "chord"),
      "feedbackSurvey:fine": () => onSelect("fine", "chord"),
      "feedbackSurvey:good": () => onSelect("good", "chord"),
    };
    $[0] = onSelect;
    $[1] = keybindings;
  } else keybindings = $[1];
  let keybindingOptions;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    keybindingOptions = {
      context: "FeedbackSurvey",
    };
    $[2] = keybindingOptions;
  } else keybindingOptions = $[2];
  MessageActionsKeybindings(keybindings, keybindingOptions);
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
  let sharedPrefix = mapped.every((chordKey) => chordKey === mapped[0]) ? mapped[0] : undefined;
  const RowBox = Box;
  const flexDirection = "column";
  const marginTop = 1;
  let promptElement;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    promptElement = jsxProd_default_2(Box, {
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
    $[3] = promptElement;
  } else promptElement = $[3];
  const ButtonsBox = Box;
  const marginLeft = 2;
  const flexWrap = "wrap";
  const minHeight = 1;
  const hintText =
    filtered.length > 0 &&
    jsxProd_default(Text, {
      dimColor: true,
      children:
        sharedPrefix === undefined
          ? "to rate, press "
          : `to rate, press ${checkChordReserved(sharedPrefix)} and then `,
    });
  let buttonsRow;
  if ($[4] !== filtered || $[5] !== onSelect || $[6] !== sharedPrefix) {
    buttonsRow = filtered.map((option) => {
      let { response, label, chord } = option;
      return jsxProd_default(
        Box,
        {
          marginRight: 2,
          children: jsxProd_default(Button, {
            tabIndex: -1,
            mountSettleMs: DIGIT_HOTKEY_HOLD_MS,
            onAction: () => onSelect(response, "click"),
            children: (state) => {
              let { hovered } = state;
              return jsxProd_default_2(Text, {
                dimColor: true,
                backgroundColor: hovered ? USER_MESSAGE_BACKGROUND : undefined,
                children: [
                  checkChordReserved(
                    sharedPrefix === undefined ? chord : chord.slice(sharedPrefix.length + 1),
                  ),
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
    $[6] = sharedPrefix;
    $[7] = buttonsRow;
  } else buttonsRow = $[7];
  let buttonsElement;
  if ($[8] !== ButtonsBox || $[9] !== buttonsRow || $[10] !== hintText) {
    buttonsElement = jsxProd_default_2(ButtonsBox, {
      marginLeft,
      flexWrap,
      minHeight,
      children: [hintText, buttonsRow],
    });
    $[8] = ButtonsBox;
    $[9] = buttonsRow;
    $[10] = hintText;
    $[11] = buttonsElement;
  } else buttonsElement = $[11];
  let ratingElement;
  if ($[12] !== RowBox || $[13] !== buttonsElement || $[14] !== promptElement) {
    ratingElement = jsxProd_default_2(RowBox, {
      flexDirection,
      marginTop,
      children: [promptElement, buttonsElement],
    });
    $[12] = RowBox;
    $[13] = buttonsElement;
    $[14] = promptElement;
    $[15] = ratingElement;
  } else ratingElement = $[15];
  return ratingElement;
}
//@ chunk-czq1j3j2.js:1033547-1033625 placement (2.1.88 match: getReservedShortcuts, 0.784)
function checkChordReserved(chord) {
  return formatKeyChords([parseChord(chord)], {
    platform: getShortcutDisplayPlatform() === "macos" ? "macos" : "other",
  });
}
export {
  TranscriptShareStatus,
  isSelectableResponseKey,
  FeedbackRatingRow,
  FeedbackSurveyView,
  THANKS_FOR_FEEDBACK_TEXT,
  SurveyOption,
};
