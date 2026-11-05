/**
 * components/FeedbackSurvey/TranscriptSharePrompt.tsx
 *
 * 调查后询问是否分享会话记录的提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FeedbackSurvey/TranscriptSharePrompt.tsx
 * pieces: chunk-czq1j3j2.js (8)
 * attribution: placement 2, fingerprint 1, layout 4, callgraph-fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useHost } from "../../context/session.js";
import {
  WEB_SETUP_PUSH_OFFER_SLOT,
  resolvePendingPushOffer,
  WEB_SETUP_PUSH_OFFER_DELAY_MS,
  markPushOfferShown,
  resolveShownPushOffer,
  WEB_SETUP_PUSH_OFFER_QUESTION,
} from "../../commands/remote-setup/pushOffer.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useStoreValue } from "../../screens/repl/storeHooks.js";
import { normalizeDigitKey, useDigitHotkeys, DIGIT_HOTKEY_HOLD_MS } from "../pluginUi/digitHotkeys.js";
import { loadSubagentTranscripts_2 } from "../../utils/sessionStorage.js";
import { useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { isUnattendedInteractiveSession } from "../../utils/concurrentSessions.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Box, Text } from "../../ink/components/Text.js";
import { BLACK_CIRCLE } from "../../constants/figures.js";
import { Button } from "../../ink/components/ErrorBoundary.js";
import { USER_MESSAGE_BACKGROUND } from "../CustomSelect/selectTypeahead.js";

//@ chunk-czq1j3j2.js:1028765-1028810 placement
function isShareAnswerKey(key) {
  return isTranscriptShareKey(key.toLowerCase());
}
//@ chunk-czq1j3j2.js:1028810-1029153 placement
/**
 * 记录分享询问的文案常量：问题、数据使用说明链接、y/n/d 按键、按键到结果的映射、选项列表与按键判断函数。
 */
var TRANSCRIPT_SHARE_QUESTION =
  "Can Anthropic look at your session transcript to help us improve Claude Code?";
var TRANSCRIPT_SHARE_DOCS_URL = "https://code.claude.com/docs/en/data-usage#session-quality-surveys";
var TRANSCRIPT_SHARE_KEYS = ["y", "n", "d"];
var TRANSCRIPT_SHARE_RESPONSES = {
  y: "yes",
  n: "no",
  d: "dont_ask_again",
};
var TRANSCRIPT_SHARE_OPTIONS = [
  {
    key: "y",
    label: "Yes",
    width: 10,
  },
  {
    key: "n",
    label: "No",
    width: 10,
  },
  {
    key: "d",
    label: "Don't ask again",
  },
];
var isTranscriptShareKey = (lowerCase) => TRANSCRIPT_SHARE_KEYS.includes(lowerCase);
//@ chunk-czq1j3j2.js:1118628-1118794 fingerprint (2.1.88 match: inputToResponse, 0.505)
var WEB_SETUP_RESPONSES = {
  1: "accepted",
  2: "dismissed",
  3: "dont_ask_again",
};
var WEB_SETUP_OPTIONS = [
  {
    key: "1",
    label: "Yes, run /web-setup",
  },
  {
    key: "2",
    label: "Not now",
  },
  {
    key: "3",
    label: "Don't ask again",
  },
];
//@ chunk-czq1j3j2.js:1118794-1118842 layout
function isAnswerDigit(key) {
  return key === "1" || key === "2" || key === "3";
}
//@ chunk-czq1j3j2.js:1118842-1118920 layout
function webSetupPromptStatus(state) {
  return state.status === "pending" || state.status === "shown" ? state.status : null;
}
//@ chunk-czq1j3j2.js:1118920-1119196 layout
/**
 * 按宿主状态决定是否显示"运行 /web-setup"询问，显示时渲染 _Ce。
 */
function WebSetupPromptGate(props) {
  let $ = useMemoCache(6);
  let host = useHost();
  let store;
  if ($[0] !== host) {
    store = WEB_SETUP_PUSH_OFFER_SLOT.of(host);
    $[0] = host;
    $[1] = store;
  } else store = $[1];
  let storeSelector = useStoreSelector(store, webSetupPromptStatus);
  if (storeSelector === null) {
    return null;
  }
  const shown = storeSelector === "shown";
  let prompt;
  if ($[2] !== host || $[3] !== props || $[4] !== shown) {
    prompt = jsxProd_default(WebSetupPrompt, {
      ...props,
      host,
      shown,
    });
    $[2] = host;
    $[3] = props;
    $[4] = shown;
    $[5] = prompt;
  } else prompt = $[5];
  return prompt;
}
//@ chunk-czq1j3j2.js:1119196-1120801 layout
/**
 * "运行 /web-setup" 询问的状态与计时：输入框为空且非加载时延迟显示，记录展示/忽略/回答，选 1 时调用 onRunWebSetup。
 */
function WebSetupPrompt(props) {
  let $ = useMemoCache(34);
  let { isLoading, bandHeld, transcript, setInputValue, onRunWebSetup, host, shown } = props;
  let { storageV5 } = useTheme_2();
  let clock = useClock();
  let storeValue = useStoreValue();
  let isAnswerDigitCached;
  if ($[0] !== storeValue) {
    isAnswerDigitCached = storeValue.length === 1 && isAnswerDigit(normalizeDigitKey(storeValue));
    $[0] = storeValue;
    $[1] = isAnswerDigitCached;
  } else isAnswerDigitCached = $[1];
  let hasAnswerDigit = isAnswerDigitCached;
  let isEmptyInput = storeValue === "";
  let isInputIdle = isEmptyInput || hasAnswerDigit;
  let canOffer =
    loadSubagentTranscripts_2({
      isLoading,
      transcript,
    }) &&
    !bandHeld &&
    isInputIdle;
  let [isShown, setIsShown] = useState(shown);
  let revealEffect;
  let revealDeps;
  if (
    $[2] !== canOffer ||
    $[3] !== clock ||
    $[4] !== host ||
    $[5] !== isEmptyInput ||
    $[6] !== isShown ||
    $[7] !== storageV5
  ) {
    revealEffect = () => {
      if (!canOffer) {
        setIsShown(false);
        return;
      }
      if (isShown || !isEmptyInput) {
        return;
      }
      return clock.setTimeout(() => {
        if (!resolvePendingPushOffer(host, storageV5)) setIsShown(true);
      }, WEB_SETUP_PUSH_OFFER_DELAY_MS);
    };
    revealDeps = [canOffer, isShown, isEmptyInput, clock, host, storageV5];
    $[2] = canOffer;
    $[3] = clock;
    $[4] = host;
    $[5] = isEmptyInput;
    $[6] = isShown;
    $[7] = storageV5;
    $[8] = revealEffect;
    $[9] = revealDeps;
  } else {
    revealEffect = $[8];
    revealDeps = $[9];
  }
  useEffect(revealEffect, revealDeps);
  let shouldShow = canOffer && isShown;
  let markShownEffect;
  let markShownDeps;
  if ($[10] !== host || $[11] !== shown || $[12] !== storageV5 || $[13] !== shouldShow) {
    markShownEffect = () => {
      if (shouldShow && !shown) markPushOfferShown(host, storageV5);
    };
    markShownDeps = [shouldShow, shown, host, storageV5];
    $[10] = host;
    $[11] = shown;
    $[12] = storageV5;
    $[13] = shouldShow;
    $[14] = markShownEffect;
    $[15] = markShownDeps;
  } else {
    markShownEffect = $[14];
    markShownDeps = $[15];
  }
  useEffect(markShownEffect, markShownDeps);
  let shouldIgnore = isLoading || !isInputIdle;
  let ignoreEffect;
  let ignoreDeps;
  if ($[16] !== host || $[17] !== shouldIgnore || $[18] !== shown || $[19] !== storageV5) {
    ignoreEffect = () => {
      if (shown && shouldIgnore) resolveShownPushOffer(host, "ignored", storageV5);
    };
    ignoreDeps = [shown, shouldIgnore, host, storageV5];
    $[16] = host;
    $[17] = shouldIgnore;
    $[18] = shown;
    $[19] = storageV5;
    $[20] = ignoreEffect;
    $[21] = ignoreDeps;
  } else {
    ignoreEffect = $[20];
    ignoreDeps = $[21];
  }
  useEffect(ignoreEffect, ignoreDeps);
  let answerHandlerCached;
  if ($[22] !== host || $[23] !== onRunWebSetup || $[24] !== setInputValue || $[25] !== storageV5) {
    answerHandlerCached = function handleAnswer(digit) {
      setInputValue("");
      if (isUnattendedInteractiveSession()) {
        resolveShownPushOffer(host, "ignored", storageV5);
        return;
      }
      resolveShownPushOffer(host, WEB_SETUP_RESPONSES[digit], storageV5);
      if (digit === "1") onRunWebSetup();
    };
    $[22] = host;
    $[23] = onRunWebSetup;
    $[24] = setInputValue;
    $[25] = storageV5;
    $[26] = answerHandlerCached;
  } else answerHandlerCached = $[26];
  let onAnswer = answerHandlerCached;
  if (!shouldShow) {
    return null;
  }
  let onDismiss;
  if ($[27] !== host || $[28] !== storageV5) {
    onDismiss = () => resolveShownPushOffer(host, "dismissed", storageV5);
    $[27] = host;
    $[28] = storageV5;
    $[29] = onDismiss;
  } else onDismiss = $[29];
  let promptElement;
  if ($[30] !== onAnswer || $[31] !== storeValue || $[32] !== onDismiss) {
    promptElement = jsxProd_default(TranscriptSharePrompt, {
      inputValue: storeValue,
      onAnswer,
      onDismiss,
    });
    $[30] = onAnswer;
    $[31] = storeValue;
    $[32] = onDismiss;
    $[33] = promptElement;
  } else promptElement = $[33];
  return promptElement;
}
//@ chunk-czq1j3j2.js:1120801-1121767 callgraph-fingerprint (2.1.88 match: TranscriptSharePrompt, 0.411)
function TranscriptSharePrompt(props) {
  let $ = useMemoCache(10);
  let { inputValue, onAnswer, onDismiss } = props;
  let digitHotkeyOptions;
  if ($[0] !== inputValue || $[1] !== onAnswer) {
    digitHotkeyOptions = {
      inputValue,
      isValidDigit: isAnswerDigit,
      onDigit: onAnswer,
      once: true,
    };
    $[0] = inputValue;
    $[1] = onAnswer;
    $[2] = digitHotkeyOptions;
  } else digitHotkeyOptions = $[2];
  useDigitHotkeys(digitHotkeyOptions);
  const isActive = inputValue === "";
  let keybindingOptions;
  if ($[3] !== isActive) {
    keybindingOptions = {
      context: "Chat",
      isActive,
    };
    $[3] = isActive;
    $[4] = keybindingOptions;
  } else keybindingOptions = $[4];
  useKeybinding("chat:cancel", onDismiss, keybindingOptions);
  let questionElement;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    questionElement = jsxProd_default_2(Box, {
      children: [
        jsxProd_default(Box, {
          minWidth: 2,
          children: jsxProd_default(Text, {
            color: "ansi:cyan",
            children: BLACK_CIRCLE,
          }),
        }),
        jsxProd_default(Text, {
          bold: true,
          wrap: "wrap",
          children: WEB_SETUP_PUSH_OFFER_QUESTION,
        }),
      ],
    });
    $[5] = questionElement;
  } else questionElement = $[5];
  let children;
  if ($[6] !== onAnswer) {
    children = WEB_SETUP_OPTIONS.map((option) => {
      let { key, label } = option;
      return jsxProd_default(
        Box,
        {
          marginRight: 3,
          children: jsxProd_default(Button, {
            tabIndex: -1,
            mountSettleMs: DIGIT_HOTKEY_HOLD_MS,
            onAction: () => onAnswer(key),
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
    $[6] = onAnswer;
    $[7] = children;
  } else children = $[7];
  let promptElement;
  if ($[8] !== children) {
    promptElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [
        questionElement,
        jsxProd_default(Box, {
          marginLeft: 2,
          children,
        }),
      ],
    });
    $[8] = children;
    $[9] = promptElement;
  } else promptElement = $[9];
  return promptElement;
}
export {
  WebSetupPromptGate,
  TRANSCRIPT_SHARE_QUESTION,
  TRANSCRIPT_SHARE_DOCS_URL,
  TRANSCRIPT_SHARE_OPTIONS,
  TRANSCRIPT_SHARE_RESPONSES,
  isTranscriptShareKey,
  isShareAnswerKey,
};
