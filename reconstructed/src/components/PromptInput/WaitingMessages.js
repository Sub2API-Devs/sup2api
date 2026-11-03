/**
 * components/PromptInput/WaitingMessages.tsx
 *
 * 2.1.316 新增。等待中的消息（排队提示）显示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (21)
 * attribution: placement 21
 */
import { $f, Up } from "../../utils/messageQueueManager.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { $Et } from "../../commands/chrome/chrome.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { ideSelectionLabel, MP } from "../IdeStatusIndicator.js";
import { Box, Text } from "../../ink/components/Text.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { hasSendNowBinding, SEND_NOW_HINT_KEY } from "../../screens/repl/sendNow.js";
import { useActionHandler } from "../../keybindings/useActionHandlers.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { yt, Rh, y, P, j } from "../../../vendor/react/cjs/react.production.js";
import { UVe, FVe, isMouseTrackingEnabled } from "../../utils/fullscreen.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { formatShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { ScrollArrowButton } from "../CustomSelect/select.js";
import {
  QueuedCommandsList,
  selectAbortController2,
  selectToolPermissionContextMode2,
  JEt,
  s0e,
  ese,
  humanQueuedCommands,
  PromptInputQueuedCommandsImpl,
} from "./PromptInputQueuedCommands.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useCommandQueue } from "../Messages.js";
import { UV } from "../../context/overlayContext.js";
import { useDialogOfKind } from "../../state/dialogQueue.js";
import { LOCAL_JSX_DIALOG } from "../../commands/rate-limit-options/index.js";
import {
  IDLE_FRAME_TOTAL_RECEIVE_BOUND,
  capRawFrameTextForDisplay,
  stripFrameControlChars,
  capFrameBodyForDisplay,
  FRAME_SANITIZED_FOR_DISPLAY_MARKER,
  capStrippedFrameField,
  PLAN_CONTENT_DISPLAY_BOUND,
} from "../../utils/teammateMailbox.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { getDeliveryId } from "../../cli/queuedCommands.js";
import { agentProgressSelector } from "../../tools/AgentTool/UI.js";
import { EMPTY_LOOKUPS } from "../../utils/messages.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import { Mr } from "../../utils/agentId.js";

//@ chunk-18hwfzwa.js:125411-125565 placement
function hasAbortedSignal(h, x, D) {
  if (x === null || x.signal.aborted) return !1;
  let filtered = h.filter((ee) => $f(ee) && Up(ee));
  return filtered.length > 0 && !filtered.some((ee) => ee.screeningPending === !0);
}
//@ chunk-18hwfzwa.js:125565-126391 placement
function QueuedCommandRow(h) {
  let $ = w(21),
    { command: command } = h,
    D = useAppState($Et),
    ee,
    ke,
    Re,
    Be,
    He,
    We,
    ze,
    Xe;
  if ($[0] !== command.ideSelection || $[1] !== D) {
    Xe = EARLY_RETURN_SENTINEL;
    kt: {
      let rt = ideSelectionLabel(D, command.ideSelection);
      if (rt === null) {
        Xe = null;
        break kt;
      }
      ke = Box;
      ze = 2;
      ee = Text;
      Re = !0;
      Be = "truncate-end";
      if ($[10] === MEMO_CACHE_SENTINEL) ((He = e(Text, { "aria-hidden": !0, children: MP })), ($[10] = He));
      else He = $[10];
      We = rt.slice(MP.length);
    }
    (($[0] = command.ideSelection),
      ($[1] = D),
      ($[2] = ee),
      ($[3] = ke),
      ($[4] = Re),
      ($[5] = Be),
      ($[6] = He),
      ($[7] = We),
      ($[8] = ze),
      ($[9] = Xe));
  } else
    ((ee = $[2]), (ke = $[3]), (Re = $[4]), (Be = $[5]), (He = $[6]), (We = $[7]), (ze = $[8]), (Xe = $[9]));
  if (Xe !== EARLY_RETURN_SENTINEL) return Xe;
  let At;
  if ($[11] !== ee || $[12] !== Re || $[13] !== Be || $[14] !== He || $[15] !== We)
    ((At = r(ee, { dimColor: Re, wrap: Be, children: [He, We] })),
      ($[11] = ee),
      ($[12] = Re),
      ($[13] = Be),
      ($[14] = He),
      ($[15] = We),
      ($[16] = At));
  else At = $[16];
  let It;
  if ($[17] !== ke || $[18] !== ze || $[19] !== At)
    ((It = e(ke, { paddingLeft: ze, children: At })), ($[17] = ke), ($[18] = ze), ($[19] = At), ($[20] = It));
  else It = $[20];
  return It;
}
//@ chunk-18hwfzwa.js:126391-127104 placement
function SendNowButton(h) {
  let $ = w(10),
    { marginTop: marginTop } = h,
    D = hasSendNowBinding(),
    L = useActionHandler(SEND_NOW_HINT_KEY),
    ee = useIsFullscreen(),
    ke = yt(UVe, FVe),
    Re = ee && isMouseTrackingEnabled() === "full" && ke;
  if (D === null || (D === "" && (L === null || !Re))) {
    return null;
  }
  let He;
  if ($[0] !== L)
    ((He =
      L === null || isMouseTrackingEnabled() !== "full"
        ? void 0
        : () => {
            if (L()) logFeatureOk("input_send_now_click");
            else logFeatureBad("input_send_now_click", "no_handler_took_it");
          }),
      ($[0] = L),
      ($[1] = He));
  else He = $[1];
  let We;
  if ($[2] !== D)
    ((We =
      D === ""
        ? "click to send now"
        : formatShortcutHint({ chord: D, action: "send now", format: { keyCase: "lower" } })),
      ($[2] = D),
      ($[3] = We));
  else We = $[3];
  let ze;
  if ($[4] !== He || $[5] !== We)
    ((ze = e(ScrollArrowButton, { onPress: He, children: We })), ($[4] = He), ($[5] = We), ($[6] = ze));
  else ze = $[6];
  let Xe;
  if ($[7] !== marginTop || $[8] !== ze)
    ((Xe = e(Box, { paddingLeft: 2, marginTop: marginTop, children: ze })),
      ($[7] = marginTop),
      ($[8] = ze),
      ($[9] = Xe));
  else Xe = $[9];
  return Xe;
}
//@ chunk-18hwfzwa.js:127104-127120 placement
var rse = Rh(QueuedCommandsList);
//@ chunk-18hwfzwa.js:127120-127663 placement
function WaitingLines(h) {
  let $ = w(12),
    { sendsNow: sendsNow, turn: turn, promptMounted: promptMounted, waitingLines: waitingLines } = h,
    ke = useStoreSelector(sendsNow),
    Re = (useStoreSelector(waitingLines)?.length ?? 0) > 0,
    Be = useCommandQueue(),
    He = useStoreSelector(turn, selectAbortController2),
    We = useAppState(selectToolPermissionContextMode2),
    ze = useAppState(JEt),
    Xe = UV(),
    rt = useDialogOfKind(LOCAL_JSX_DIALOG.kind),
    At;
  if ($[0] !== We || $[1] !== Be || $[2] !== He)
    ((At = hasAbortedSignal(Be, He, We)), ($[0] = We), ($[1] = Be), ($[2] = He), ($[3] = At));
  else At = $[3];
  let It = At,
    Ot;
  if (
    $[4] !== ke ||
    $[5] !== Re ||
    $[6] !== Xe ||
    $[7] !== rt ||
    $[8] !== promptMounted ||
    $[9] !== It ||
    $[10] !== ze
  )
    ((Ot =
      promptMounted && ke && !ze && !Xe && !rt && !It ? e(SendNowButton, { marginTop: Re ? 0 : 1 }) : null),
      ($[4] = ke),
      ($[5] = Re),
      ($[6] = Xe),
      ($[7] = rt),
      ($[8] = promptMounted),
      ($[9] = It),
      ($[10] = ze),
      ($[11] = Ot));
  else Ot = $[11];
  return Ot;
}
//@ chunk-18hwfzwa.js:127663-127742 placement
function ose(h) {
  return h && (h.kind === "peer" || h.kind === "observer") ? h.from : void 0;
}
//@ chunk-18hwfzwa.js:127742-127891 placement
function isNonHumanQueuedOrigin(h) {
  if (h.verifiedSlackHumanTurn === !0) return !0;
  switch (h.origin?.kind) {
    case void 0:
    case "human":
    case "slack-ping":
      return !1;
    default:
      return !0;
  }
}
//@ chunk-18hwfzwa.js:127891-128002 placement
function framePreviewText(h, x, D = IDLE_FRAME_TOTAL_RECEIVE_BOUND, L = !1) {
  let ee = capRawFrameTextForDisplay(h, x),
    ke = L || ee !== h || stripFrameControlChars(ee) !== ee,
    Re = capFrameBodyForDisplay(ee, D);
  return ke
    ? `${Re}
${FRAME_SANITIZED_FOR_DISPLAY_MARKER}`
    : Re;
}
/**
 * 把内容块截取为不超过 maxChars 的文本预览。
 */
//@ chunk-18hwfzwa.js:128002-128353 placement = extractErrorTypeFromData (1)
function previewContentBlocks(h, x, D) {
  let L = [],
    ee = x,
    min = Math.min(h.length, s0e);
  for (let Re = 0; Re < min && ee > 0; Re++) {
    let Be = h[Re];
    if (
      typeof Be === "object" &&
      Be !== null &&
      "type" in Be &&
      Be.type === "text" &&
      "text" in Be &&
      typeof Be.text === "string"
    ) {
      let He = truncateToLength(Be.text, ee);
      (L.push(He), (ee -= [...He].length));
    } else if (D) {
      let He = renderContentBlockPreview(Be, ee, !1);
      if (He) (L.push(He), (ee -= [...He].length));
    }
  }
  return L.join(`
`);
}
/**
 * 把任意内容（字符串、数组、对象）递归截取成不超过 maxChars 的纯文本预览，深度受限，每层最多取若干项。
 */
//@ chunk-18hwfzwa.js:128353-128668 placement
function previewContentText(h, x, D) {
  if (x <= 0 || D <= 0) return "";
  if (typeof h === "string") return truncateToLength(h, x);
  if (h === null || typeof h !== "object") return "";
  let L = Array.isArray(h) ? h : Object.values(h),
    min = Math.min(L.length, s0e),
    ke = [],
    Re = x;
  for (let Be = 0; Be < min && Re > 0; Be++) {
    let He = previewContentText(L[Be], Re, D - 1);
    if (He) (ke.push(He), (Re -= [...He].length));
  }
  return ke.join(`
`);
}
//@ chunk-18hwfzwa.js:128668-130111 placement
function renderContentBlockPreview(h, x, D) {
  if (typeof h !== "object" || h === null || !("type" in h)) return null;
  let L = h.type;
  if (L === "tool_result") {
    let ee = "content" in h ? h.content : void 0;
    if (typeof ee === "string") return truncateToLength(ee, x);
    return Array.isArray(ee) ? previewContentBlocks(ee, x, D) : null;
  }
  if (L === "document") {
    let ee = "title" in h && typeof h.title === "string" ? truncateToLength(h.title, x) : "",
      ke = "context" in h && typeof h.context === "string" ? truncateToLength(h.context, x) : "",
      Re = "source" in h ? h.source : void 0,
      Be = "";
    if (typeof Re === "object" && Re !== null && "type" in Re)
      if (Re.type === "text" && "data" in Re && typeof Re.data === "string")
        Be = truncateToLength(Re.data, x);
      else if (Re.type === "content" && "content" in Re) {
        let content = Re.content;
        Be =
          typeof content === "string"
            ? truncateToLength(content, x)
            : Array.isArray(content)
              ? previewContentBlocks(content, x, D)
              : "";
      } else {
        let We =
          "media_type" in Re && typeof Re.media_type === "string"
            ? Re.media_type
            : typeof Re.type === "string"
              ? Re.type
              : "unknown";
        Be = `[${capStrippedFrameField(We, ese)} source not shown]`;
      }
    return (
      truncateToLength(
        [ee, ke, Be].filter(Boolean).join(`
`),
        x,
      ) || null
    );
  }
  if (L === "search_result") {
    let ee = "source" in h && typeof h.source === "string" ? capStrippedFrameField(h.source, ese) : "",
      ke = "title" in h && typeof h.title === "string" ? truncateToLength(h.title, x) : "",
      Re = "content" in h && Array.isArray(h.content) ? previewContentBlocks(h.content, x, D) : "";
    return (
      truncateToLength(
        [ee, ke, Re].filter(Boolean).join(`
`),
        x,
      ) || null
    );
  }
  if (L === "thinking")
    return "thinking" in h && typeof h.thinking === "string" ? truncateToLength(h.thinking, x) : null;
  if (L === "tool_use") {
    let ee = "name" in h && typeof h.name === "string" ? truncateToLength(h.name, x) : "",
      ke = "input" in h ? h.input : void 0,
      Re = previewContentText(ke, x, 3);
    return (
      truncateToLength(
        [ee, Re].filter(Boolean).join(`
`),
        x,
      ) || null
    );
  }
  return null;
}
//@ chunk-18hwfzwa.js:130111-130145 placement
function aDt() {
  return new WeakMap();
}
//@ chunk-18hwfzwa.js:130145-130179 placement
function lDt() {
  return new WeakMap();
}
//@ chunk-18hwfzwa.js:130179-130223 placement
function dDt(vo) {
  return vo.shownAs === void 0;
}
//@ chunk-18hwfzwa.js:130223-130270 placement
function cDt(Yo) {
  return Yo.deliveryId !== void 0;
}
//@ chunk-18hwfzwa.js:130270-130306 placement
function uDt(kn) {
  return getDeliveryId(kn) ?? [];
}
/**
 * 静态（转录模式）渲染单条子代理消息。
 */
//@ chunk-18hwfzwa.js:130306-130555 placement = VerboseAgentTranscript (0.912)
function VerboseAgentTranscript(h, Fn) {
  let { message: message } = h;
  return e(
    agentProgressSelector,
    {
      message: message,
      lookups: EMPTY_LOOKUPS,
      addMargin: Fn > 0,
      tools: [],
      commands: [],
      verbose: !0,
      inProgressToolUseIDs: EMPTY_TOOL_USE_ID_SET,
      progressMessagesForMessage: [],
      shouldAnimate: !1,
      shouldShowDot: !1,
      isTranscriptMode: !0,
      isStatic: !0,
    },
    message.uuid,
  );
}
/**
 * 渲染用空集合/空数组常量。
 */
//@ chunk-18hwfzwa.js:130555-130577 placement
var EMPTY_TOOL_USE_ID_SET = new Set(),
  c0e = [];
//@ chunk-18hwfzwa.js:130577-132669 placement
function AgentWaitingMessages(h) {
  let $ = w(34),
    { focused: focused } = h,
    D = useCommandQueue(),
    { task: task, messages: messages, isLoading: isLoading } = focused,
    [Re] = y(aDt),
    [Be] = y(lDt),
    He = task !== void 0 && isLocalAgent(task) ? task.pendingMessages : c0e,
    ze;
  if ($[0] !== task)
    ((ze =
      task === void 0
        ? mainAgentId()
        : isInProcessTeammateTask(task)
          ? (task.identity.resumableAgentId ?? task.identity.agentId)
          : task.agentId),
      ($[0] = task),
      ($[1] = ze));
  else ze = $[1];
  let Xe = ze,
    rt;
  if ($[2] !== Be || $[3] !== He || $[4] !== Xe || $[5] !== D) {
    const filtered = He.filter(dDt);
    let At;
    if ($[7] !== Be || $[8] !== Xe)
      ((At = (It) => {
        let Ot = Be.get(It);
        if (Ot !== void 0) {
          return Ot;
        }
        let Et = { value: It.text, mode: "prompt", agentId: Mr(Xe), origin: It.origin, isMeta: It.isMeta };
        return (Be.set(It, Et), Et);
      }),
        ($[7] = Be),
        ($[8] = Xe),
        ($[9] = At));
    else At = $[9];
    let mapped = filtered.map(At);
    const Lt = humanQueuedCommands([...D, ...mapped]);
    let oo;
    if ($[10] !== Xe) ((oo = (Xt) => Xt.agentId === Xe && !Up(Xt)), ($[10] = Xe), ($[11] = oo));
    else oo = $[11];
    rt = Lt.filter(oo);
    (($[2] = Be), ($[3] = He), ($[4] = Xe), ($[5] = D), ($[6] = rt));
  } else rt = $[6];
  let io = rt,
    kt;
  if ($[12] !== io || $[13] !== messages || $[14] !== Re) {
    let so = io.some(cDt) ? new Set(messages.flatMap(uDt)) : EMPTY_TOOL_USE_ID_SET;
    const filtered = io.filter((po) => !(po.deliveryId !== void 0 && so.has(po.deliveryId)));
    let Lt;
    if ($[16] !== Re)
      ((Lt = (ao) => {
        let co = Re.get(ao);
        if (co !== void 0) {
          return co;
        }
        let bo = PromptInputQueuedCommandsImpl([ao], PLAN_CONTENT_DISPLAY_BOUND);
        return (Re.set(ao, bo), bo);
      }),
        ($[16] = Re),
        ($[17] = Lt));
    else Lt = $[17];
    kt = filtered.flatMap(Lt);
    (($[12] = io), ($[13] = messages), ($[14] = Re), ($[15] = kt));
  } else kt = $[15];
  let Ao = kt,
    At;
  if ($[18] !== messages.length || $[19] !== Ao)
    ((At = { rows: Ao, transcriptLength: messages.length }),
      ($[18] = messages.length),
      ($[19] = Ao),
      ($[20] = At));
  else At = $[20];
  let [Bo, Ro] = y(At),
    Lt;
  if ($[21] !== Bo || $[22] !== isLoading || $[23] !== messages.length || $[24] !== Ao)
    ((Lt = mergeWaitingRows(Bo, Ao, messages.length, isLoading)),
      ($[21] = Bo),
      ($[22] = isLoading),
      ($[23] = messages.length),
      ($[24] = Ao),
      ($[25] = Lt));
  else Lt = $[25];
  let Ho = Lt;
  if (Ho !== Bo) Ro(Ho);
  let Io = Ho.rows.length > 0,
    oo,
    Wo;
  if ($[26] !== Io)
    ((oo = () => {
      if (Io) logFeatureOk("transcript_waiting_messages");
    }),
      (Wo = [Io]),
      ($[26] = Io),
      ($[27] = oo),
      ($[28] = Wo));
  else ((oo = $[27]), (Wo = $[28]));
  if ((P(oo, Wo), Ho.rows.length === 0)) {
    return null;
  }
  let mn;
  if ($[29] === MEMO_CACHE_SENTINEL)
    ((mn = e(Text, { dimColor: !0, children: "Waiting to be delivered" })), ($[29] = mn));
  else mn = $[29];
  let Cn;
  if ($[30] !== Ho.rows) ((Cn = Ho.rows.map(VerboseAgentTranscript)), ($[30] = Ho.rows), ($[31] = Cn));
  else Cn = $[31];
  let No;
  if ($[32] !== Cn)
    ((No = r(Box, { flexDirection: "column", marginTop: 1, children: [mn, Cn] })),
      ($[32] = Cn),
      ($[33] = No));
  else No = $[33];
  return No;
}
//@ chunk-18hwfzwa.js:132669-132908 placement
function mergeWaitingRows(h, x, D, L) {
  let ee = new Set(x),
    Re = [...(L && h.transcriptLength === D ? h.rows.filter((row) => !ee.has(row)) : []), ...x];
  return h.transcriptLength === D && Re.length === h.rows.length && Re.every((He, We) => He === h.rows[We])
    ? h
    : { rows: Re, transcriptLength: D };
}
//@ chunk-18hwfzwa.js:132908-132912 placement
j();

export {
  ose,
  isNonHumanQueuedOrigin,
  QueuedCommandRow,
  hasAbortedSignal,
  SendNowButton,
  framePreviewText,
  renderContentBlockPreview,
  AgentWaitingMessages,
  rse,
  WaitingLines,
};
