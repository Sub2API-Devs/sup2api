/**
 * screens/repl/LiveStateRow.tsx
 *
 * 2.1.316 新增。REPL 实时状态行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (22)
 * attribution: placement 22
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { P_o } from "../../components/Spinner/spinnerStatus.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { Uy, j, Q, Se } from "../../../vendor/react/cjs/react.production.js";
import { useInterval } from "../../ink/components/Input.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { RetryStatusRow } from "../../components/Spinner/SpinnerAnimationRow.js";
import { Cr, useAppState } from "../../state/AppState.js";
import { kYe } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { ug } from "./ReplEffects.js";
import { ZXe } from "../../bridge/inboundMessages.js";
import { useSession } from "../../context/session.js";
import { yFo } from "../../utils/hooks/hookMessages.js";
import { RemoteBootstrapProgress } from "../../components/RemoteBootstrapProgress.js";
import { SpinnerWithVerb, BriefIdleStatus } from "../../components/Spinner.js";
import { WAITING_MESSAGE_TEXTS } from "../../cli/headlessCloud/syncStatus.js";
import { POLL } from "../../tools/PollTool/prompt.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-18hwfzwa.js:1453978-1454007 placement
function Sjo(Be) {
  return Be + 1;
}
/**
 * 子代理实时状态行（每秒刷新）。
 */
//@ chunk-18hwfzwa.js:1454007-1454307 placement
function AgentLiveStatus(h) {
  let $ = w(3),
    { agentId: agentId } = h,
    D = P_o(agentId),
    { columns: columns } = useTerminalSize(),
    [, ee] = Uy(Sjo, 0);
  if ((useInterval(ee, D ? 1000 : null), D === null)) {
    return null;
  }
  let Re;
  if ($[0] !== columns || $[1] !== D)
    ((Re = e(Box, {
      flexDirection: "row",
      marginTop: 1,
      width: "100%",
      children: e(RetryStatusRow, { status: D, columns: columns }),
    })),
      ($[0] = columns),
      ($[1] = D),
      ($[2] = Re));
  else Re = $[2];
  return Re;
}
//@ chunk-18hwfzwa.js:1454307-1454311 placement
j();
/**
 * 子代理旋转指示所需的开始时间、响应长度、暂停时间引用。
 */
//@ chunk-18hwfzwa.js:1454311-1454708 placement
function useAgentSpinnerRefs(h) {
  let x = Cr();
  return Q(() => {
    let D = () => x.getState().transcripts[h],
      L = () => x.getState().tasks[h];
    return {
      loadingStartTime: new Oee(() => D()?.turnStartTime ?? L()?.startTime ?? 0),
      responseLength: new Oee(() => {
        let ee = L();
        return (
          (D()?.progress?.tokenCount ?? (ee && "progress" in ee ? (ee.progress?.tokenCount ?? 0) : 0)) * 4
        );
      }),
      totalPausedMs: new Oee(() => D()?.totalPausedMs ?? 0),
      noPauseStart: { current: null },
    };
  }, [x, h]);
}
//@ chunk-18hwfzwa.js:1454708-1454784 placement
class Oee {
  read;
  constructor(h) {
    this.read = h;
  }
  get current() {
    return this.read();
  }
}
//@ chunk-18hwfzwa.js:1454784-1454819 placement
function selectVerbose3(wn) {
  return wn.verbose;
}
//@ chunk-18hwfzwa.js:1454819-1454858 placement
function selectIsBriefOnly3(mr) {
  return mr.isBriefOnly;
}
//@ chunk-18hwfzwa.js:1454858-1454895 placement
function selectIsLoading5(Kn) {
  return Kn.isLoading;
}
//@ chunk-18hwfzwa.js:1454895-1454944 placement
function selectUserInputOnProcessing(Wn) {
  return Wn.userInputOnProcessing;
}
//@ chunk-18hwfzwa.js:1454944-1455003 placement
function Vjo(Fr) {
  return kYe(Fr.toolPermissionContext.mode);
}
//@ chunk-18hwfzwa.js:1455003-1455016 placement
var Nee = null;
/**
 * LiveStateRow：REPL 实时状态行（加载动画、任务、计时）。
 */
//@ chunk-18hwfzwa.js:1455016-1458175 placement
function LiveStateRow(h) {
  let $ = w(59),
    {
      turn: turn,
      focused: focused,
      showSpinner: showSpinner,
      liveStateRowMounted: liveStateRowMounted,
      replacements: replacements,
      isRemoteSession: isRemoteSession,
    } = h,
    { remoteBootstrapLive: remoteBootstrapLive, replyChannelStatusLive: replyChannelStatusLive } =
      replacements,
    We = useAppState(selectVerbose3),
    ze = useAppState(selectIsBriefOnly3),
    rt;
  if ($[0] !== isRemoteSession)
    ((rt = (kt) => (isRemoteSession ? (kt.cloudMessageHeld?.row ?? null) : null)),
      ($[0] = isRemoteSession),
      ($[1] = rt));
  else rt = $[1];
  let At = useAppState(rt),
    It = useStoreSelector(turn, selectIsLoading5),
    Ot = useStoreSelector(turn.stream, selectUserInputOnProcessing),
    Et;
  if ($[2] === MEMO_CACHE_SENTINEL) ((Et = mainAgentId()), ($[2] = Et));
  else Et = $[2];
  let { messages: messages } = ug(Et),
    Lt;
  if ($[3] !== focused.task?.id)
    ((Lt = focused.task?.id ?? mainAgentId()), ($[3] = focused.task?.id), ($[4] = Lt));
  else Lt = $[4];
  let oo = Lt,
    Xt;
  if ($[5] !== oo)
    ((Xt = (io) => (io.transcripts[oo]?.inProgressToolUseIDs.size ?? 0) > 0), ($[5] = oo), ($[6] = Xt));
  else Xt = $[6];
  let so = useAppState(Xt),
    po;
  if ($[7] !== oo) ((po = (ao) => ao.transcripts[oo]?.toolWindowStartTime ?? null), ($[7] = oo), ($[8] = po));
  else po = $[8];
  let co = useAppState(po),
    bo = useAgentSpinnerRefs(oo),
    Ao = Se(ZXe),
    Bo = useAppState(Vjo),
    Ro = Ao !== null && Bo && focused.isMain;
  const Ho = useSession();
  let Io;
  if ($[9] !== Ho.host) ((Io = yFo(Ho.host)), ($[9] = Ho.host), ($[10] = Io));
  else Io = $[10];
  let Wo = useStoreSelector(Io, Ro ? Vwt : $wt),
    mn;
  if ($[11] !== isRemoteSession)
    ((mn = (Cn) => (isRemoteSession ? Cn.rowAtRemoteModelRequest : void 0)),
      ($[11] = isRemoteSession),
      ($[12] = mn));
  else mn = $[12];
  let No = useAppState(mn),
    vo;
  if ($[13] !== isRemoteSession || $[14] !== messages || $[15] !== Bo || $[16] !== No) {
    let Yo = isRemoteSession ? qwt(messages, No, Bo) : null;
    vo = Yo === null ? null : { suffix: jee(Yo), running: qee(Yo) };
    (($[13] = isRemoteSession), ($[14] = messages), ($[15] = Bo), ($[16] = No), ($[17] = vo));
  } else vo = $[17];
  let kn = vo,
    Fn = useStoreSelector(Ao, jee) ?? null,
    bn = useStoreSelector(Ao, qee) ?? !1,
    Go = kn === null ? Fn : kn.suffix,
    hn = kn === null ? bn : kn.running,
    Mn = !focused.isMain ? Wo : hn ? Go : (Wo ?? Go),
    Xo;
  if ($[18] !== focused.isLoading || $[19] !== focused.task?.id || $[20] !== showSpinner)
    ((Xo =
      focused.isLoading &&
      !showSpinner &&
      e(AgentLiveStatus, { agentId: focused.task?.id ?? mainAgentId() })),
      ($[18] = focused.isLoading),
      ($[19] = focused.task?.id),
      ($[20] = showSpinner),
      ($[21] = Xo));
  else Xo = $[21];
  let Sn;
  if ($[22] !== remoteBootstrapLive)
    ((Sn = remoteBootstrapLive && e(RemoteBootstrapProgress, {})),
      ($[22] = remoteBootstrapLive),
      ($[23] = Sn));
  else Sn = $[23];
  let $n;
  if ($[24] !== messages || $[25] !== replyChannelStatusLive)
    (($n = Nee !== null && replyChannelStatusLive && e(Nee.ReplyChannelStatusPanel, { messages: messages })),
      ($[24] = messages),
      ($[25] = replyChannelStatusLive),
      ($[26] = $n));
  else $n = $[26];
  let on;
  if (
    $[27] !== focused.isMain ||
    $[28] !== focused.task?.id ||
    $[29] !== so ||
    $[30] !== It ||
    $[31] !== liveStateRowMounted ||
    $[32] !== remoteBootstrapLive ||
    $[33] !== replyChannelStatusLive ||
    $[34] !== showSpinner ||
    $[35] !== Mn ||
    $[36] !== bo ||
    $[37] !== co ||
    $[38] !== turn.pauseStartTimeRef ||
    $[39] !== We
  )
    ((on =
      showSpinner &&
      !liveStateRowMounted &&
      !remoteBootstrapLive &&
      !replyChannelStatusLive &&
      e(SpinnerWithVerb, {
        responseLengthRef: bo.responseLength,
        spinnerSuffix: It ? Mn : null,
        verbose: We,
        loadingStartTimeRef: bo.loadingStartTime,
        totalPausedMsRef: bo.totalPausedMs,
        pauseStartTimeRef: focused.isMain ? turn.pauseStartTimeRef : bo.noPauseStart,
        hasActiveTools: so,
        toolWindowStartedAt: co,
        agentId: focused.task?.id ?? mainAgentId(),
      })),
      ($[27] = focused.isMain),
      ($[28] = focused.task?.id),
      ($[29] = so),
      ($[30] = It),
      ($[31] = liveStateRowMounted),
      ($[32] = remoteBootstrapLive),
      ($[33] = replyChannelStatusLive),
      ($[34] = showSpinner),
      ($[35] = Mn),
      ($[36] = bo),
      ($[37] = co),
      ($[38] = turn.pauseStartTimeRef),
      ($[39] = We),
      ($[40] = on));
  else on = $[40];
  let _o;
  if ($[41] !== focused.isMain || $[42] !== At || $[43] !== It || $[44] !== showSpinner)
    ((_o =
      !showSpinner &&
      !It &&
      focused.isMain &&
      At !== null &&
      e(Box, {
        marginTop: 1,
        paddingLeft: 2,
        children: e(Text, { dimColor: !0, wrap: "truncate-end", children: WAITING_MESSAGE_TEXTS[At] }),
      })),
      ($[41] = focused.isMain),
      ($[42] = At),
      ($[43] = It),
      ($[44] = showSpinner),
      ($[45] = _o));
  else _o = $[45];
  let cn;
  if ($[46] !== focused.isMain || $[47] !== ze || $[48] !== It || $[49] !== showSpinner || $[50] !== Ot)
    ((cn = !showSpinner && !It && !Ot && ze && focused.isMain && e(BriefIdleStatus, {})),
      ($[46] = focused.isMain),
      ($[47] = ze),
      ($[48] = It),
      ($[49] = showSpinner),
      ($[50] = Ot),
      ($[51] = cn));
  else cn = $[51];
  let Dn;
  if ($[52] !== Xo || $[53] !== Sn || $[54] !== $n || $[55] !== on || $[56] !== _o || $[57] !== cn)
    ((Dn = r(Fragment, { children: [Xo, Sn, $n, on, _o, cn] })),
      ($[52] = Xo),
      ($[53] = Sn),
      ($[54] = $n),
      ($[55] = on),
      ($[56] = _o),
      ($[57] = cn),
      ($[58] = Dn));
  else Dn = $[58];
  return Dn;
}
//@ chunk-18hwfzwa.js:1458175-1458203 placement
function jee(h) {
  return null;
}
//@ chunk-18hwfzwa.js:1458203-1458235 placement
function qwt(h, x, D) {
  return null;
}
//@ chunk-18hwfzwa.js:1458235-1458260 placement
function qee(h) {
  return !1;
}
//@ chunk-18hwfzwa.js:1458260-1458324 placement
function $wt(h) {
  return hookProgressText(h.findLast((x) => x.agentId === void 0));
}
//@ chunk-18hwfzwa.js:1458324-1458405 placement
function Vwt(h) {
  return hookProgressText(h.findLast((x) => x.agentId === void 0 && x.toolName !== POLL));
}
/**
 * 钩子运行进度文本（状态消息或 “running X hooks”）。
 */
//@ chunk-18hwfzwa.js:1458405-1458687 placement
function hookProgressText(h) {
  if (!h) return null;
  let x = h.hooks.length,
    D = x > 1 ? `\u2026 ${h.settled.size}/${x}` : "",
    found = h.hooks.find((hook, Be) => !h.settled.has(Be));
  if (found?.statusMessage) return `${found.statusMessage}${D || "\u2026"}`;
  let ee = "",
    ke = ee ? "hook" : plural(x, "hook");
  return `running ${h.hookEvent} ${ke}${ee}${D}`;
}
//@ chunk-18hwfzwa.js:1458687-1458691 placement
j();
//@ chunk-18hwfzwa.js:1458691-1458704 placement
var zwt = null;
/**
 * 远程启动步骤与回复通道状态是否在显示。
 */
//@ chunk-18hwfzwa.js:1458704-1459124 placement
function useLiveStatusFlags({ focused: focused, isRemoteSession: isRemoteSession }) {
  let D = useAppState((He) => He.verbose),
    { messages: messages } = ug(mainAgentId()),
    ee = useAppState(
      (He) =>
        isRemoteSession &&
        He.remoteBootstrap !== null &&
        He.remoteBootstrap.hasStructuredSteps &&
        !He.remoteBootstrap.terminal &&
        !He.remoteBootstrap.dismissed,
    ),
    ke = useAppState((He) => He.hasRemoteReplyChannel),
    Be =
      Q(() => zwt !== null && ke && zwt.visibleAgentStatus(messages) !== null, [messages, ke]) &&
      focused.isMain &&
      focused.isLoading &&
      !D;
  return { remoteBootstrapLive: ee, replyChannelStatusLive: Be };
}
/**
 * 处理中的用户输入存在且不是斜杠命令。
 */
//@ chunk-18hwfzwa.js:1459124-1459225 placement
function hasNonCommandInput(Qn) {
  return Qn.userInputOnProcessing !== void 0 && !Qn.userInputOnProcessing.startsWith("/");
}

export { hasNonCommandInput, useLiveStatusFlags, LiveStateRow };
