/**
 * components/FeedbackSurvey/TranscriptSharePrompt.tsx
 *
 * 调查后询问是否分享会话记录的提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FeedbackSurvey/TranscriptSharePrompt.tsx
 * pieces: chunk-18hwfzwa.js (8)
 * attribution: placement 2, fingerprint 1, layout 4, callgraph-fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { y, P } from "../../../vendor/react/cjs/react.production.js";
import { isUnattendedInteractiveSession } from "../../utils/concurrentSessions.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Box, Text } from "../../ink/components/Text.js";
import { BLACK_CIRCLE } from "../../utils/permissions/autoModeRulesPrompt.js";
import { Button } from "../../ink/components/ErrorBoundary.js";
import { USER_MESSAGE_BACKGROUND } from "../CustomSelect/selectTypeahead.js";

//@ chunk-18hwfzwa.js:994730-994775 placement
function isShareAnswerKey(kt) {
  return isTranscriptShareKey(kt.toLowerCase());
}
//@ chunk-18hwfzwa.js:994775-995118 placement
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
//@ chunk-18hwfzwa.js:1084597-1084763 fingerprint = inputToResponse (0.505)
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
//@ chunk-18hwfzwa.js:1084763-1084811 layout
function isAnswerDigit(h) {
  return h === "1" || h === "2" || h === "3";
}
//@ chunk-18hwfzwa.js:1084811-1084889 layout
function webSetupPromptStatus(h) {
  return h.status === "pending" || h.status === "shown" ? h.status : null;
}
//@ chunk-18hwfzwa.js:1084889-1085165 layout
/**
 * 按宿主状态决定是否显示"运行 /web-setup"询问，显示时渲染 _Ce。
 */
function WebSetupPromptGate(h) {
  let $ = w(6);
  let host = useHost();
  let L;
  if ($[0] !== host) {
    L = WEB_SETUP_PUSH_OFFER_SLOT.of(host);
    $[0] = host;
    $[1] = L;
  } else L = $[1];
  let storeSelector = useStoreSelector(L, webSetupPromptStatus);
  if (storeSelector === null) {
    return null;
  }
  const shown = storeSelector === "shown";
  let Re;
  if ($[2] !== host || $[3] !== h || $[4] !== shown) {
    Re = jsxProd_default(WebSetupPrompt, {
      ...h,
      host,
      shown,
    });
    $[2] = host;
    $[3] = h;
    $[4] = shown;
    $[5] = Re;
  } else Re = $[5];
  return Re;
}
//@ chunk-18hwfzwa.js:1085165-1086769 layout
/**
 * "运行 /web-setup" 询问的状态与计时：输入框为空且非加载时延迟显示，记录展示/忽略/回答，选 1 时调用 onRunWebSetup。
 */
function WebSetupPrompt(props) {
  let $ = w(34);
  let { isLoading, bandHeld, transcript, setInputValue, onRunWebSetup, host, shown } = props;
  let { storageV5 } = useTheme_2();
  let clock = useClock();
  let storeValue = useStoreValue();
  let rt;
  if ($[0] !== storeValue) {
    rt = storeValue.length === 1 && isAnswerDigit(normalizeDigitKey(storeValue));
    $[0] = storeValue;
    $[1] = rt;
  } else rt = $[1];
  let kt = rt;
  let At = storeValue === "";
  let It = At || kt;
  let Ot =
    loadSubagentTranscripts_2({
      isLoading,
      transcript,
    }) &&
    !bandHeld &&
    It;
  let [Et, Dt] = y(shown);
  let Lt;
  let oo;
  if ($[2] !== Ot || $[3] !== clock || $[4] !== host || $[5] !== At || $[6] !== Et || $[7] !== storageV5) {
    Lt = () => {
      if (!Ot) {
        Dt(false);
        return;
      }
      if (Et || !At) {
        return;
      }
      return clock.setTimeout(() => {
        if (!resolvePendingPushOffer(host, storageV5)) Dt(true);
      }, WEB_SETUP_PUSH_OFFER_DELAY_MS);
    };
    oo = [Ot, Et, At, clock, host, storageV5];
    $[2] = Ot;
    $[3] = clock;
    $[4] = host;
    $[5] = At;
    $[6] = Et;
    $[7] = storageV5;
    $[8] = Lt;
    $[9] = oo;
  } else {
    Lt = $[8];
    oo = $[9];
  }
  P(Lt, oo);
  let Xt = Ot && Et;
  let io;
  let so;
  if ($[10] !== host || $[11] !== shown || $[12] !== storageV5 || $[13] !== Xt) {
    io = () => {
      if (Xt && !shown) markPushOfferShown(host, storageV5);
    };
    so = [Xt, shown, host, storageV5];
    $[10] = host;
    $[11] = shown;
    $[12] = storageV5;
    $[13] = Xt;
    $[14] = io;
    $[15] = so;
  } else {
    io = $[14];
    so = $[15];
  }
  P(io, so);
  let po = isLoading || !It;
  let ao;
  let co;
  if ($[16] !== host || $[17] !== po || $[18] !== shown || $[19] !== storageV5) {
    ao = () => {
      if (shown && po) resolveShownPushOffer(host, "ignored", storageV5);
    };
    co = [shown, po, host, storageV5];
    $[16] = host;
    $[17] = po;
    $[18] = shown;
    $[19] = storageV5;
    $[20] = ao;
    $[21] = co;
  } else {
    ao = $[20];
    co = $[21];
  }
  P(ao, co);
  let bo;
  if ($[22] !== host || $[23] !== onRunWebSetup || $[24] !== setInputValue || $[25] !== storageV5) {
    bo = function Bo(Ao) {
      setInputValue("");
      if (isUnattendedInteractiveSession()) {
        resolveShownPushOffer(host, "ignored", storageV5);
        return;
      }
      resolveShownPushOffer(host, WEB_SETUP_RESPONSES[Ao], storageV5);
      if (Ao === "1") onRunWebSetup();
    };
    $[22] = host;
    $[23] = onRunWebSetup;
    $[24] = setInputValue;
    $[25] = storageV5;
    $[26] = bo;
  } else bo = $[26];
  let onAnswer = bo;
  if (!Xt) {
    return null;
  }
  let onDismiss;
  if ($[27] !== host || $[28] !== storageV5) {
    onDismiss = () => resolveShownPushOffer(host, "dismissed", storageV5);
    $[27] = host;
    $[28] = storageV5;
    $[29] = onDismiss;
  } else onDismiss = $[29];
  let Ho;
  if ($[30] !== onAnswer || $[31] !== storeValue || $[32] !== onDismiss) {
    Ho = jsxProd_default(TranscriptSharePrompt, {
      inputValue: storeValue,
      onAnswer,
      onDismiss,
    });
    $[30] = onAnswer;
    $[31] = storeValue;
    $[32] = onDismiss;
    $[33] = Ho;
  } else Ho = $[33];
  return Ho;
}
//@ chunk-18hwfzwa.js:1086769-1087735 callgraph-fingerprint = TranscriptSharePrompt (0.411)
function TranscriptSharePrompt(props) {
  let $ = w(10);
  let { inputValue, onAnswer, onDismiss } = props;
  let ke;
  if ($[0] !== inputValue || $[1] !== onAnswer) {
    ke = {
      inputValue,
      isValidDigit: isAnswerDigit,
      onDigit: onAnswer,
      once: true,
    };
    $[0] = inputValue;
    $[1] = onAnswer;
    $[2] = ke;
  } else ke = $[2];
  useDigitHotkeys(ke);
  const isActive = inputValue === "";
  let Be;
  if ($[3] !== isActive) {
    Be = {
      context: "Chat",
      isActive,
    };
    $[3] = isActive;
    $[4] = Be;
  } else Be = $[4];
  useKeybinding("chat:cancel", onDismiss, Be);
  let He;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    He = jsxProd_default_2(Box, {
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
    $[5] = He;
  } else He = $[5];
  let children;
  if ($[6] !== onAnswer) {
    children = WEB_SETUP_OPTIONS.map((ze) => {
      let { key, label } = ze;
      return jsxProd_default(
        Box,
        {
          marginRight: 3,
          children: jsxProd_default(Button, {
            tabIndex: -1,
            mountSettleMs: DIGIT_HOTKEY_HOLD_MS,
            onAction: () => onAnswer(key),
            children: (kt) => {
              let { hovered } = kt;
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
  let ze;
  if ($[8] !== children) {
    ze = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [
        He,
        jsxProd_default(Box, {
          marginLeft: 2,
          children,
        }),
      ],
    });
    $[8] = children;
    $[9] = ze;
  } else ze = $[9];
  return ze;
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
