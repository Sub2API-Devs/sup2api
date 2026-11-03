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
import { useRetryStatus } from "../../components/Spinner/spinnerStatus.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { Uy, init_react_production, Q, Se } from "../../../vendor/react/cjs/react.production.js";
import { useInterval } from "../../ink/components/Input.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { RetryStatusRow } from "../../components/Spinner/SpinnerAnimationRow.js";
import { useAppStoreDirect, useAppState } from "../../state/AppState.js";
import { alwaysFalseRefresh } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { transcriptMessagesStore } from "./ReplEffects.js";
import { BRIDGE_PLACED_KEYS_CONTEXT } from "../../bridge/inboundMessages.js";
import { useSession } from "../../context/session.js";
import { runningHooksStoreOf } from "../../utils/hooks/hookMessages.js";
import { RemoteBootstrapProgress } from "../../components/RemoteBootstrapProgress.js";
import { SpinnerWithVerb, BriefIdleStatus } from "../../components/Spinner.js";
import { WAITING_MESSAGE_TEXTS } from "../../cli/headlessCloud/syncStatus.js";
import { POLL } from "../../tools/PollTool/prompt.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-18hwfzwa.js:1453978-1454007 placement
function increment(Be) {
  return Be + 1;
}
//@ chunk-18hwfzwa.js:1454007-1454307 placement
/**
 * 子代理实时状态行（每秒刷新）。
 */
function AgentLiveStatus(props) {
  let $ = w(3);
  let { agentId } = props;
  let retryStatus = useRetryStatus(agentId);
  let { columns } = useTerminalSize();
  let [, ee] = Uy(increment, 0);
  useInterval(ee, retryStatus ? 1000 : null);
  if (retryStatus === null) {
    return null;
  }
  let Re;
  if ($[0] !== columns || $[1] !== retryStatus) {
    Re = jsxProd_default(Box, {
      flexDirection: "row",
      marginTop: 1,
      width: "100%",
      children: jsxProd_default(RetryStatusRow, {
        status: retryStatus,
        columns,
      }),
    });
    $[0] = columns;
    $[1] = retryStatus;
    $[2] = Re;
  } else Re = $[2];
  return Re;
}
//@ chunk-18hwfzwa.js:1454307-1454311 placement
init_react_production();
//@ chunk-18hwfzwa.js:1454311-1454708 placement
/**
 * 子代理旋转指示所需的开始时间、响应长度、暂停时间引用。
 */
function useAgentSpinnerRefs(h) {
  let appStoreDirect = useAppStoreDirect();
  return Q(() => {
    let D = () => appStoreDirect.getState().transcripts[h];
    let L = () => appStoreDirect.getState().tasks[h];
    return {
      loadingStartTime: new LazyValue(() => D()?.turnStartTime ?? L()?.startTime ?? 0),
      responseLength: new LazyValue(() => {
        let ee = L();
        return (
          (D()?.progress?.tokenCount ?? (ee && "progress" in ee ? (ee.progress?.tokenCount ?? 0) : 0)) * 4
        );
      }),
      totalPausedMs: new LazyValue(() => D()?.totalPausedMs ?? 0),
      noPauseStart: {
        current: null,
      },
    };
  }, [appStoreDirect, h]);
}
//@ chunk-18hwfzwa.js:1454708-1454784 placement
/**
 * 惰性取值封装：current 每次读取时调用构造时传入的函数，用于加载计时等派生状态。
 */
class LazyValue {
  read;
  constructor(read) {
    this.read = read;
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
function selectPermissionMode(Fr) {
  return alwaysFalseRefresh(Fr.toolPermissionContext.mode);
}
//@ chunk-18hwfzwa.js:1455003-1455016 placement
var REPLY_CHANNEL_STATUS_PANEL = null;
//@ chunk-18hwfzwa.js:1455016-1458175 placement
/**
 * LiveStateRow：REPL 实时状态行（加载动画、任务、计时）。
 */
function LiveStateRow(props) {
  let $ = w(59);
  let { turn, focused, showSpinner, liveStateRowMounted, replacements, isRemoteSession } = props;
  let { remoteBootstrapLive, replyChannelStatusLive } = replacements;
  let verbose = useAppState(selectVerbose3);
  let appState = useAppState(selectIsBriefOnly3);
  let rt;
  if ($[0] !== isRemoteSession) {
    rt = (kt) => (isRemoteSession ? (kt.cloudMessageHeld?.row ?? null) : null);
    $[0] = isRemoteSession;
    $[1] = rt;
  } else rt = $[1];
  let appState_2 = useAppState(rt);
  let storeSelector = useStoreSelector(turn, selectIsLoading5);
  let storeSelector_2 = useStoreSelector(turn.stream, selectUserInputOnProcessing);
  let Et;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    Et = mainAgentId();
    $[2] = Et;
  } else Et = $[2];
  let { messages } = transcriptMessagesStore(Et);
  let Lt;
  if ($[3] !== focused.task?.id) {
    Lt = focused.task?.id ?? mainAgentId();
    $[3] = focused.task?.id;
    $[4] = Lt;
  } else Lt = $[4];
  let oo = Lt;
  let Xt;
  if ($[5] !== oo) {
    Xt = (io) => (io.transcripts[oo]?.inProgressToolUseIDs.size ?? 0) > 0;
    $[5] = oo;
    $[6] = Xt;
  } else Xt = $[6];
  let hasActiveTools = useAppState(Xt);
  let po;
  if ($[7] !== oo) {
    po = (ao) => ao.transcripts[oo]?.toolWindowStartTime ?? null;
    $[7] = oo;
    $[8] = po;
  } else po = $[8];
  let toolWindowStartedAt = useAppState(po);
  let agentSpinnerRefs = useAgentSpinnerRefs(oo);
  let Ao = Se(BRIDGE_PLACED_KEYS_CONTEXT);
  let appState_3 = useAppState(selectPermissionMode);
  let isMain = Ao !== null && appState_3 && focused.isMain;
  const session = useSession();
  let Io;
  if ($[9] !== session.host) {
    Io = runningHooksStoreOf(session.host);
    $[9] = session.host;
    $[10] = Io;
  } else Io = $[10];
  let storeSelector_3 = useStoreSelector(Io, isMain ? latestNonPollHookProgressText : latestHookProgressText);
  let mn;
  if ($[11] !== isRemoteSession) {
    mn = (Cn) => (isRemoteSession ? Cn.rowAtRemoteModelRequest : undefined);
    $[11] = isRemoteSession;
    $[12] = mn;
  } else mn = $[12];
  let appState_4 = useAppState(mn);
  let vo;
  if ($[13] !== isRemoteSession || $[14] !== messages || $[15] !== appState_3 || $[16] !== appState_4) {
    let Yo = isRemoteSession ? remoteStatusSource(messages, appState_4, appState_3) : null;
    vo =
      Yo === null
        ? null
        : {
            suffix: nullText(Yo),
            running: alwaysFalseLiveRow(Yo),
          };
    $[13] = isRemoteSession;
    $[14] = messages;
    $[15] = appState_3;
    $[16] = appState_4;
    $[17] = vo;
  } else vo = $[17];
  let kn = vo;
  let Fn = useStoreSelector(Ao, nullText) ?? null;
  let bn = useStoreSelector(Ao, alwaysFalseLiveRow) ?? false;
  let Go = kn === null ? Fn : kn.suffix;
  let hn = kn === null ? bn : kn.running;
  let Mn = !focused.isMain ? storeSelector_3 : hn ? Go : (storeSelector_3 ?? Go);
  let Xo;
  if ($[18] !== focused.isLoading || $[19] !== focused.task?.id || $[20] !== showSpinner) {
    Xo =
      focused.isLoading &&
      !showSpinner &&
      jsxProd_default(AgentLiveStatus, {
        agentId: focused.task?.id ?? mainAgentId(),
      });
    $[18] = focused.isLoading;
    $[19] = focused.task?.id;
    $[20] = showSpinner;
    $[21] = Xo;
  } else Xo = $[21];
  let Sn;
  if ($[22] !== remoteBootstrapLive) {
    Sn = remoteBootstrapLive && jsxProd_default(RemoteBootstrapProgress, {});
    $[22] = remoteBootstrapLive;
    $[23] = Sn;
  } else Sn = $[23];
  let $n;
  if ($[24] !== messages || $[25] !== replyChannelStatusLive) {
    $n =
      REPLY_CHANNEL_STATUS_PANEL !== null &&
      replyChannelStatusLive &&
      jsxProd_default(REPLY_CHANNEL_STATUS_PANEL.ReplyChannelStatusPanel, {
        messages,
      });
    $[24] = messages;
    $[25] = replyChannelStatusLive;
    $[26] = $n;
  } else $n = $[26];
  let on;
  if (
    $[27] !== focused.isMain ||
    $[28] !== focused.task?.id ||
    $[29] !== hasActiveTools ||
    $[30] !== storeSelector ||
    $[31] !== liveStateRowMounted ||
    $[32] !== remoteBootstrapLive ||
    $[33] !== replyChannelStatusLive ||
    $[34] !== showSpinner ||
    $[35] !== Mn ||
    $[36] !== agentSpinnerRefs ||
    $[37] !== toolWindowStartedAt ||
    $[38] !== turn.pauseStartTimeRef ||
    $[39] !== verbose
  ) {
    on =
      showSpinner &&
      !liveStateRowMounted &&
      !remoteBootstrapLive &&
      !replyChannelStatusLive &&
      jsxProd_default(SpinnerWithVerb, {
        responseLengthRef: agentSpinnerRefs.responseLength,
        spinnerSuffix: storeSelector ? Mn : null,
        verbose,
        loadingStartTimeRef: agentSpinnerRefs.loadingStartTime,
        totalPausedMsRef: agentSpinnerRefs.totalPausedMs,
        pauseStartTimeRef: focused.isMain ? turn.pauseStartTimeRef : agentSpinnerRefs.noPauseStart,
        hasActiveTools,
        toolWindowStartedAt,
        agentId: focused.task?.id ?? mainAgentId(),
      });
    $[27] = focused.isMain;
    $[28] = focused.task?.id;
    $[29] = hasActiveTools;
    $[30] = storeSelector;
    $[31] = liveStateRowMounted;
    $[32] = remoteBootstrapLive;
    $[33] = replyChannelStatusLive;
    $[34] = showSpinner;
    $[35] = Mn;
    $[36] = agentSpinnerRefs;
    $[37] = toolWindowStartedAt;
    $[38] = turn.pauseStartTimeRef;
    $[39] = verbose;
    $[40] = on;
  } else on = $[40];
  let _o;
  if ($[41] !== focused.isMain || $[42] !== appState_2 || $[43] !== storeSelector || $[44] !== showSpinner) {
    _o =
      !showSpinner &&
      !storeSelector &&
      focused.isMain &&
      appState_2 !== null &&
      jsxProd_default(Box, {
        marginTop: 1,
        paddingLeft: 2,
        children: jsxProd_default(Text, {
          dimColor: true,
          wrap: "truncate-end",
          children: WAITING_MESSAGE_TEXTS[appState_2],
        }),
      });
    $[41] = focused.isMain;
    $[42] = appState_2;
    $[43] = storeSelector;
    $[44] = showSpinner;
    $[45] = _o;
  } else _o = $[45];
  let cn;
  if (
    $[46] !== focused.isMain ||
    $[47] !== appState ||
    $[48] !== storeSelector ||
    $[49] !== showSpinner ||
    $[50] !== storeSelector_2
  ) {
    cn =
      !showSpinner &&
      !storeSelector &&
      !storeSelector_2 &&
      appState &&
      focused.isMain &&
      jsxProd_default(BriefIdleStatus, {});
    $[46] = focused.isMain;
    $[47] = appState;
    $[48] = storeSelector;
    $[49] = showSpinner;
    $[50] = storeSelector_2;
    $[51] = cn;
  } else cn = $[51];
  let Dn;
  if ($[52] !== Xo || $[53] !== Sn || $[54] !== $n || $[55] !== on || $[56] !== _o || $[57] !== cn) {
    Dn = jsxProd_default_2(Fragment, {
      children: [Xo, Sn, $n, on, _o, cn],
    });
    $[52] = Xo;
    $[53] = Sn;
    $[54] = $n;
    $[55] = on;
    $[56] = _o;
    $[57] = cn;
    $[58] = Dn;
  } else Dn = $[58];
  return Dn;
}
//@ chunk-18hwfzwa.js:1458175-1458203 placement
function nullText(h) {
  return null;
}
//@ chunk-18hwfzwa.js:1458203-1458235 placement
function remoteStatusSource(messages, appState, appState_2) {
  return null;
}
//@ chunk-18hwfzwa.js:1458235-1458260 placement
function alwaysFalseLiveRow(h) {
  return false;
}
//@ chunk-18hwfzwa.js:1458260-1458324 placement
function latestHookProgressText(h) {
  return hookProgressText(h.findLast((x) => x.agentId === undefined));
}
//@ chunk-18hwfzwa.js:1458324-1458405 placement
function latestNonPollHookProgressText(h) {
  return hookProgressText(h.findLast((x) => x.agentId === undefined && x.toolName !== POLL));
}
//@ chunk-18hwfzwa.js:1458405-1458687 placement
/**
 * 钩子运行进度文本（状态消息或 “running X hooks”）。
 */
function hookProgressText(last) {
  if (!last) return null;
  let x = last.hooks.length;
  let D = x > 1 ? `\u2026 ${last.settled.size}/${x}` : "";
  let found = last.hooks.find((hook, Be) => !last.settled.has(Be));
  if (found?.statusMessage) return `${found.statusMessage}${D || "\u2026"}`;
  let ee = "";
  let ke = ee ? "hook" : plural(x, "hook");
  return `running ${last.hookEvent} ${ke}${ee}${D}`;
}
//@ chunk-18hwfzwa.js:1458687-1458691 placement
init_react_production();
//@ chunk-18hwfzwa.js:1458691-1458704 placement
var REMOTE_STARTUP_STATUS = null;
//@ chunk-18hwfzwa.js:1458704-1459124 placement
/**
 * 远程启动步骤与回复通道状态是否在显示。
 */
function useLiveStatusFlags({ focused, isRemoteSession }) {
  let D = useAppState((He) => He.verbose);
  let { messages } = transcriptMessagesStore(mainAgentId());
  let remoteBootstrapLive = useAppState(
    (He) =>
      isRemoteSession &&
      He.remoteBootstrap !== null &&
      He.remoteBootstrap.hasStructuredSteps &&
      !He.remoteBootstrap.terminal &&
      !He.remoteBootstrap.dismissed,
  );
  let ke = useAppState((He) => He.hasRemoteReplyChannel);
  let replyChannelStatusLive =
    Q(
      () =>
        REMOTE_STARTUP_STATUS !== null && ke && REMOTE_STARTUP_STATUS.visibleAgentStatus(messages) !== null,
      [messages, ke],
    ) &&
    focused.isMain &&
    focused.isLoading &&
    !D;
  return {
    remoteBootstrapLive,
    replyChannelStatusLive,
  };
}
//@ chunk-18hwfzwa.js:1459124-1459225 placement
/**
 * 处理中的用户输入存在且不是斜杠命令。
 */
function hasNonCommandInput(Qn) {
  return Qn.userInputOnProcessing !== undefined && !Qn.userInputOnProcessing.startsWith("/");
}
export { hasNonCommandInput, useLiveStatusFlags, LiveStateRow };
