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
  UNt,
  resolvePendingPushOffer,
  aEo,
  markPushOfferShown,
  resolveShownPushOffer,
  iEo,
} from "../../commands/remote-setup/pushOffer.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Me } from "../design-system/ThemeProvider.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { ZD } from "../../screens/repl/storeHooks.js";
import { fT, useDigitHotkeys, DIGIT_HOTKEY_HOLD_MS } from "../pluginUi/digitHotkeys.js";
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
function nfo(kt) {
  return isTranscriptShareKey(kt.toLowerCase());
}
/**
 * 记录分享询问的文案常量：问题、数据使用说明链接、y/n/d 按键、按键到结果的映射、选项列表与按键判断函数。
 */
//@ chunk-18hwfzwa.js:994775-995118 placement
var TRANSCRIPT_SHARE_QUESTION =
    "Can Anthropic look at your session transcript to help us improve Claude Code?",
  TRANSCRIPT_SHARE_DOCS_URL = "https://code.claude.com/docs/en/data-usage#session-quality-surveys",
  TRANSCRIPT_SHARE_KEYS = ["y", "n", "d"],
  TRANSCRIPT_SHARE_RESPONSES = { y: "yes", n: "no", d: "dont_ask_again" },
  TRANSCRIPT_SHARE_OPTIONS = [
    { key: "y", label: "Yes", width: 10 },
    { key: "n", label: "No", width: 10 },
    { key: "d", label: "Don't ask again" },
  ],
  isTranscriptShareKey = (h) => TRANSCRIPT_SHARE_KEYS.includes(h);
//@ chunk-18hwfzwa.js:1084597-1084763 fingerprint = inputToResponse (0.505)
var WEB_SETUP_RESPONSES = { 1: "accepted", 2: "dismissed", 3: "dont_ask_again" },
  WEB_SETUP_OPTIONS = [
    { key: "1", label: "Yes, run /web-setup" },
    { key: "2", label: "Not now" },
    { key: "3", label: "Don't ask again" },
  ];
//@ chunk-18hwfzwa.js:1084763-1084811 layout
function l8(h) {
  return h === "1" || h === "2" || h === "3";
}
//@ chunk-18hwfzwa.js:1084811-1084889 layout
function Xrt(h) {
  return h.status === "pending" || h.status === "shown" ? h.status : null;
}
/**
 * 按宿主状态决定是否显示"运行 /web-setup"询问，显示时渲染 _Ce。
 */
//@ chunk-18hwfzwa.js:1084889-1085165 layout
function WebSetupPromptGate(h) {
  let $ = w(6),
    x = useHost(),
    L;
  if ($[0] !== x) ((L = UNt.of(x)), ($[0] = x), ($[1] = L));
  else L = $[1];
  let ee = useStoreSelector(L, Xrt);
  if (ee === null) {
    return null;
  }
  const ke = ee === "shown";
  let Re;
  if ($[2] !== x || $[3] !== h || $[4] !== ke)
    ((Re = e(WebSetupPrompt, { ...h, host: x, shown: ke })),
      ($[2] = x),
      ($[3] = h),
      ($[4] = ke),
      ($[5] = Re));
  else Re = $[5];
  return Re;
}
/**
 * "运行 /web-setup" 询问的状态与计时：输入框为空且非加载时延迟显示，记录展示/忽略/回答，选 1 时调用 onRunWebSetup。
 */
//@ chunk-18hwfzwa.js:1085165-1086769 layout
function WebSetupPrompt(h) {
  let $ = w(34),
    {
      isLoading: isLoading,
      bandHeld: bandHeld,
      transcript: transcript,
      setInputValue: setInputValue,
      onRunWebSetup: onRunWebSetup,
      host: host,
      shown: shown,
    } = h,
    { storageV5: storageV5 } = Me(),
    We = useClock(),
    ze = ZD(),
    rt;
  if ($[0] !== ze) ((rt = ze.length === 1 && l8(fT(ze))), ($[0] = ze), ($[1] = rt));
  else rt = $[1];
  let kt = rt,
    At = ze === "",
    It = At || kt,
    Ot = loadSubagentTranscripts_2({ isLoading: isLoading, transcript: transcript }) && !bandHeld && It,
    [Et, Dt] = y(shown),
    Lt,
    oo;
  if ($[2] !== Ot || $[3] !== We || $[4] !== host || $[5] !== At || $[6] !== Et || $[7] !== storageV5)
    ((Lt = () => {
      if (!Ot) {
        Dt(!1);
        return;
      }
      if (Et || !At) {
        return;
      }
      return We.setTimeout(() => {
        if (!resolvePendingPushOffer(host, storageV5)) Dt(!0);
      }, aEo);
    }),
      (oo = [Ot, Et, At, We, host, storageV5]),
      ($[2] = Ot),
      ($[3] = We),
      ($[4] = host),
      ($[5] = At),
      ($[6] = Et),
      ($[7] = storageV5),
      ($[8] = Lt),
      ($[9] = oo));
  else ((Lt = $[8]), (oo = $[9]));
  P(Lt, oo);
  let Xt = Ot && Et,
    io,
    so;
  if ($[10] !== host || $[11] !== shown || $[12] !== storageV5 || $[13] !== Xt)
    ((io = () => {
      if (Xt && !shown) markPushOfferShown(host, storageV5);
    }),
      (so = [Xt, shown, host, storageV5]),
      ($[10] = host),
      ($[11] = shown),
      ($[12] = storageV5),
      ($[13] = Xt),
      ($[14] = io),
      ($[15] = so));
  else ((io = $[14]), (so = $[15]));
  P(io, so);
  let po = isLoading || !It,
    ao,
    co;
  if ($[16] !== host || $[17] !== po || $[18] !== shown || $[19] !== storageV5)
    ((ao = () => {
      if (shown && po) resolveShownPushOffer(host, "ignored", storageV5);
    }),
      (co = [shown, po, host, storageV5]),
      ($[16] = host),
      ($[17] = po),
      ($[18] = shown),
      ($[19] = storageV5),
      ($[20] = ao),
      ($[21] = co));
  else ((ao = $[20]), (co = $[21]));
  P(ao, co);
  let bo;
  if ($[22] !== host || $[23] !== onRunWebSetup || $[24] !== setInputValue || $[25] !== storageV5)
    ((bo = function Bo(Ao) {
      if ((setInputValue(""), isUnattendedInteractiveSession())) {
        resolveShownPushOffer(host, "ignored", storageV5);
        return;
      }
      if ((resolveShownPushOffer(host, WEB_SETUP_RESPONSES[Ao], storageV5), Ao === "1")) onRunWebSetup();
    }),
      ($[22] = host),
      ($[23] = onRunWebSetup),
      ($[24] = setInputValue),
      ($[25] = storageV5),
      ($[26] = bo));
  else bo = $[26];
  let Bo = bo;
  if (!Xt) {
    return null;
  }
  let Ro;
  if ($[27] !== host || $[28] !== storageV5)
    ((Ro = () => resolveShownPushOffer(host, "dismissed", storageV5)),
      ($[27] = host),
      ($[28] = storageV5),
      ($[29] = Ro));
  else Ro = $[29];
  let Ho;
  if ($[30] !== Bo || $[31] !== ze || $[32] !== Ro)
    ((Ho = e(TranscriptSharePrompt, { inputValue: ze, onAnswer: Bo, onDismiss: Ro })),
      ($[30] = Bo),
      ($[31] = ze),
      ($[32] = Ro),
      ($[33] = Ho));
  else Ho = $[33];
  return Ho;
}
//@ chunk-18hwfzwa.js:1086769-1087735 callgraph-fingerprint = TranscriptSharePrompt (0.411)
function TranscriptSharePrompt(t0) {
  let $ = w(10),
    { inputValue: inputValue, onAnswer: onAnswer, onDismiss: onDismiss } = t0,
    ke;
  if ($[0] !== inputValue || $[1] !== onAnswer)
    ((ke = { inputValue: inputValue, isValidDigit: l8, onDigit: onAnswer, once: !0 }),
      ($[0] = inputValue),
      ($[1] = onAnswer),
      ($[2] = ke));
  else ke = $[2];
  useDigitHotkeys(ke);
  const Re = inputValue === "";
  let Be;
  if ($[3] !== Re) ((Be = { context: "Chat", isActive: Re }), ($[3] = Re), ($[4] = Be));
  else Be = $[4];
  useKeybinding("chat:cancel", onDismiss, Be);
  let He;
  if ($[5] === MEMO_CACHE_SENTINEL)
    ((He = r(Box, {
      children: [
        e(Box, { minWidth: 2, children: e(Text, { color: "ansi:cyan", children: BLACK_CIRCLE }) }),
        e(Text, { bold: !0, wrap: "wrap", children: iEo }),
      ],
    })),
      ($[5] = He));
  else He = $[5];
  let We;
  if ($[6] !== onAnswer)
    ((We = WEB_SETUP_OPTIONS.map((ze) => {
      let { key: key, label: label } = ze;
      return e(
        Box,
        {
          marginRight: 3,
          children: e(Button, {
            tabIndex: -1,
            mountSettleMs: DIGIT_HOTKEY_HOLD_MS,
            onAction: () => onAnswer(key),
            children: (kt) => {
              let { hovered: hovered } = kt;
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
      ($[6] = onAnswer),
      ($[7] = We));
  else We = $[7];
  let ze;
  if ($[8] !== We)
    ((ze = r(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [He, e(Box, { marginLeft: 2, children: We })],
    })),
      ($[8] = We),
      ($[9] = ze));
  else ze = $[9];
  return ze;
}

export {
  WebSetupPromptGate,
  TRANSCRIPT_SHARE_QUESTION,
  TRANSCRIPT_SHARE_DOCS_URL,
  TRANSCRIPT_SHARE_OPTIONS,
  TRANSCRIPT_SHARE_RESPONSES,
  isTranscriptShareKey,
  nfo,
};
