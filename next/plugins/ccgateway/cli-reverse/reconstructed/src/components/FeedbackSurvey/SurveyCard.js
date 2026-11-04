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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { normalizeDigitKey, DIGIT_HOTKEY_HOLD_MS, useDigitHotkeys } from "../pluginUi/digitHotkeys.js";
import { useKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { getActionChords } from "../../keybindings/resolver.js";
import { hasSingleItem } from "./FeedbackSurvey.js";
import { chordToString } from "../../keybindings/parser.js";
import { useAppStateSlice } from "../../state/AppState.js";
import { selectHasModalOverlay } from "../../context/overlayContext.js";
import { useEffect } from "../../../vendor/react/cjs/react.production.js";
import { isUnattendedInteractiveSession } from "../../utils/concurrentSessions.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { BLACK_CIRCLE } from "../../constants/figures.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { USER_MESSAGE_BACKGROUND } from "../CustomSelect/selectTypeahead.js";
import { Button } from "../../ink/components/ErrorBoundary.js";

//@ chunk-18hwfzwa.js:1004373-1004412 placement
function isRatingKey(key) {
  return key === "0" || key === "1";
}
//@ chunk-18hwfzwa.js:1004412-1007788 placement
/**
 * SurveyCard：调查卡片外框与评分选项。
 */
function SurveyCard(props) {
  let $ = useMemoCache(48);
  let {
    state,
    survey,
    starting,
    inputValue,
    setInputValue,
    inputRowReplaced,
    onShown,
    onStart,
    onDismiss,
    onIgnore,
  } = props;
  let normalizedInputCached;
  if ($[0] !== inputValue) {
    normalizedInputCached = inputValue.length === 1 ? normalizeDigitKey(inputValue) : inputValue;
    $[0] = inputValue;
    $[1] = normalizedInputCached;
  } else normalizedInputCached = $[1];
  let normalizedInput = normalizedInputCached;
  let hasUnrecognizedInputCached;
  if ($[2] !== normalizedInput || $[3] !== state) {
    hasUnrecognizedInputCached = state === "open" && normalizedInput !== "" && !isRatingKey(normalizedInput);
    $[2] = normalizedInput;
    $[3] = state;
    $[4] = hasUnrecognizedInputCached;
  } else hasUnrecognizedInputCached = $[4];
  let hasUnrecognizedInput = hasUnrecognizedInputCached;
  let isCardOpen = state === "open" && survey !== null && !hasUnrecognizedInput;
  let keybindingContext = useKeybindingContext();
  let enterChord;
  Lt: {
    if (keybindingContext === null) {
      enterChord = "enter";
      break Lt;
    }
    let submitChord;
    if ($[5] !== keybindingContext.bindings) {
      let last = getActionChords("chat:submit", "Chat", keybindingContext.bindings)
        .filter(hasSingleItem)
        .at(-1);
      submitChord = last === undefined ? "" : chordToString(last);
      $[5] = keybindingContext.bindings;
      $[6] = submitChord;
    } else submitChord = $[6];
    enterChord = submitChord;
  }
  let enterKeyHint = enterChord;
  let hasModalOverlay = useAppStateSlice(selectHasModalOverlay) === true;
  let ignoreEffect;
  let ignoreEffectDeps;
  if ($[7] !== onIgnore || $[8] !== hasUnrecognizedInput) {
    ignoreEffect = () => {
      if (hasUnrecognizedInput) onIgnore();
    };
    ignoreEffectDeps = [hasUnrecognizedInput, onIgnore];
    $[7] = onIgnore;
    $[8] = hasUnrecognizedInput;
    $[9] = ignoreEffect;
    $[10] = ignoreEffectDeps;
  } else {
    ignoreEffect = $[9];
    ignoreEffectDeps = $[10];
  }
  useEffect(ignoreEffect, ignoreEffectDeps);
  let shownEffect;
  let shownEffectDeps;
  if ($[11] !== isCardOpen || $[12] !== onShown) {
    shownEffect = () => {
      if (isCardOpen) onShown();
    };
    shownEffectDeps = [isCardOpen, onShown];
    $[11] = isCardOpen;
    $[12] = onShown;
    $[13] = shownEffect;
    $[14] = shownEffectDeps;
  } else {
    shownEffect = $[13];
    shownEffectDeps = $[14];
  }
  useEffect(shownEffect, shownEffectDeps);
  let handleDigitCached;
  if (
    $[15] !== onDismiss ||
    $[16] !== onIgnore ||
    $[17] !== onStart ||
    $[18] !== setInputValue ||
    $[19] !== starting
  ) {
    handleDigitCached = function handleDigit(digit) {
      setInputValue("");
      if (starting) {
        return;
      }
      if (isUnattendedInteractiveSession()) {
        onIgnore();
        return;
      }
      if (digit === "1") onStart();
      else onDismiss();
    };
    $[15] = onDismiss;
    $[16] = onIgnore;
    $[17] = onStart;
    $[18] = setInputValue;
    $[19] = starting;
    $[20] = handleDigitCached;
  } else handleDigitCached = $[20];
  let answerDigit = handleDigitCached;
  const enterConfirms = !inputRowReplaced && !hasModalOverlay;
  let digitHotkeyOptions;
  if ($[21] !== isCardOpen || $[22] !== inputValue || $[23] !== answerDigit || $[24] !== enterConfirms) {
    digitHotkeyOptions = {
      inputValue,
      isValidDigit: isRatingKey,
      onDigit: answerDigit,
      enabled: isCardOpen,
      enterConfirms,
      acceptAfterPause: false,
      mountDelayMs: DIGIT_HOTKEY_HOLD_MS,
    };
    $[21] = isCardOpen;
    $[22] = inputValue;
    $[23] = answerDigit;
    $[24] = enterConfirms;
    $[25] = digitHotkeyOptions;
  } else digitHotkeyOptions = $[25];
  useDigitHotkeys(digitHotkeyOptions);
  if (state === "thanks" && survey !== null) {
    let thanksText;
    if ($[26] === MEMO_CACHE_SENTINEL) {
      thanksText = jsxProd_default(Text, {
        color: "success",
        children: "Thanks for your feedback",
      });
      $[26] = thanksText;
    } else thanksText = $[26];
    let thanksElement;
    if ($[27] !== survey.orgName) {
      thanksElement = jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          thanksText,
          jsxProd_default_2(Text, {
            dimColor: true,
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
      });
      $[27] = survey.orgName;
      $[28] = thanksElement;
    } else thanksElement = $[28];
    return thanksElement;
  }
  if (state === "gone" && survey !== null) {
    let goneElement;
    if ($[29] === MEMO_CACHE_SENTINEL) {
      goneElement = jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default_2(Text, {
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
      });
      $[29] = goneElement;
    } else goneElement = $[29];
    return goneElement;
  }
  if (!isCardOpen) {
    return null;
  }
  let bulletElement;
  if ($[30] === MEMO_CACHE_SENTINEL) {
    bulletElement = jsxProd_default(Box, {
      minWidth: 2,
      children: jsxProd_default(Text, {
        color: "ansi:cyan",
        children: BLACK_CIRCLE,
      }),
    });
    $[30] = bulletElement;
  } else bulletElement = $[30];
  let headlineRow;
  if ($[31] !== survey.headline) {
    headlineRow = jsxProd_default_2(Box, {
      children: [
        bulletElement,
        jsxProd_default(Text, {
          bold: true,
          wrap: "wrap",
          children: survey.headline,
        }),
      ],
    });
    $[31] = survey.headline;
    $[32] = headlineRow;
  } else headlineRow = $[32];
  let messageRow;
  if ($[33] !== survey.message) {
    messageRow = jsxProd_default(Box, {
      marginLeft: 2,
      children: jsxProd_default(Text, {
        wrap: "wrap",
        children: survey.message,
      }),
    });
    $[33] = survey.message;
    $[34] = messageRow;
  } else messageRow = $[34];
  let orgRow;
  if ($[35] !== survey.orgName) {
    orgRow = jsxProd_default(Box, {
      marginLeft: 2,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        wrap: "wrap",
        children: ["Survey from ", survey.orgName],
      }),
    });
    $[35] = survey.orgName;
    $[36] = orgRow;
  } else orgRow = $[36];
  let actionsRow;
  if ($[37] !== answerDigit) {
    actionsRow = jsxProd_default_2(Box, {
      marginLeft: 2,
      flexWrap: "wrap",
      children: [
        jsxProd_default(SurveyDigitButton, {
          digit: "1",
          label: "Start survey",
          onAction: answerDigit,
        }),
        jsxProd_default(SurveyDigitButton, {
          digit: "0",
          label: "Not now",
          onAction: answerDigit,
        }),
      ],
    });
    $[37] = answerDigit;
    $[38] = actionsRow;
  } else actionsRow = $[38];
  let hintRow;
  if ($[39] !== starting || $[40] !== enterKeyHint) {
    hintRow =
      (starting || enterKeyHint !== "") &&
      jsxProd_default(Box, {
        marginLeft: 2,
        children: jsxProd_default(Text, {
          dimColor: true,
          wrap: "wrap",
          children: starting
            ? "Opening the survey\u2026"
            : jsxProd_default_2(Fragment, {
                children: [
                  "Type 1 or 0, then",
                  " ",
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: enterKeyHint,
                    action: "answer",
                  }),
                ],
              }),
        }),
      });
    $[39] = starting;
    $[40] = enterKeyHint;
    $[41] = hintRow;
  } else hintRow = $[41];
  let cardElement;
  if (
    $[42] !== headlineRow ||
    $[43] !== messageRow ||
    $[44] !== orgRow ||
    $[45] !== actionsRow ||
    $[46] !== hintRow
  ) {
    cardElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [headlineRow, messageRow, orgRow, actionsRow, hintRow],
    });
    $[42] = headlineRow;
    $[43] = messageRow;
    $[44] = orgRow;
    $[45] = actionsRow;
    $[46] = hintRow;
    $[47] = cardElement;
  } else cardElement = $[47];
  return cardElement;
}
//@ chunk-18hwfzwa.js:1007788-1008312 placement
/**
 * 调查卡片里的一个数字按钮：显示"数字: 标签"，悬停高亮，点击回调 onAction(digit)。
 */
function SurveyDigitButton(props) {
  let $ = useMemoCache(9);
  let { digit, label, onAction } = props;
  let onAction_2;
  if ($[0] !== digit || $[1] !== onAction) {
    onAction_2 = () => onAction(digit);
    $[0] = digit;
    $[1] = onAction;
    $[2] = onAction_2;
  } else onAction_2 = $[2];
  let children;
  if ($[3] !== digit || $[4] !== label) {
    children = (props) => {
      let { hovered } = props;
      return jsxProd_default_2(Text, {
        backgroundColor: hovered ? USER_MESSAGE_BACKGROUND : undefined,
        children: [
          jsxProd_default(Text, {
            color: "ansi:cyan",
            children: digit,
          }),
          ": ",
          label,
        ],
      });
    };
    $[3] = digit;
    $[4] = label;
    $[5] = children;
  } else children = $[5];
  let button;
  if ($[6] !== onAction_2 || $[7] !== children) {
    button = jsxProd_default(Box, {
      marginRight: 3,
      flexShrink: 0,
      children: jsxProd_default(Button, {
        tabIndex: -1,
        mountSettleMs: DIGIT_HOTKEY_HOLD_MS,
        onAction: onAction_2,
        children,
      }),
    });
    $[6] = onAction_2;
    $[7] = children;
    $[8] = button;
  } else button = $[8];
  return button;
}
export { SurveyCard };
