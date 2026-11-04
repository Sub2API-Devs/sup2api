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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useRetryStatus } from "../../components/Spinner/spinnerStatus.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import {
  useReducer,
  init_react_production,
  useMemo,
  useContext,
} from "../../../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1453978-1454007 placement
function increment(count) {
  return count + 1;
}
//@ chunk-18hwfzwa.js:1454007-1454307 placement
/**
 * 子代理实时状态行（每秒刷新）。
 */
function AgentLiveStatus(props) {
  let $ = useMemoCache(3);
  let { agentId } = props;
  let retryStatus = useRetryStatus(agentId);
  let { columns } = useTerminalSize();
  let [, tick] = useReducer(increment, 0);
  useInterval(tick, retryStatus ? 1000 : null);
  if (retryStatus === null) {
    return null;
  }
  let retryRow;
  if ($[0] !== columns || $[1] !== retryStatus) {
    retryRow = jsxProd_default(Box, {
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
    $[2] = retryRow;
  } else retryRow = $[2];
  return retryRow;
}
//@ chunk-18hwfzwa.js:1454307-1454311 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1454307", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1454311-1454708 placement
/**
 * 子代理旋转指示所需的开始时间、响应长度、暂停时间引用。
 */
function useAgentSpinnerRefs(agentId) {
  let appStoreDirect = useAppStoreDirect();
  return useMemo(() => {
    let transcript = () => appStoreDirect.getState().transcripts[agentId];
    let task = () => appStoreDirect.getState().tasks[agentId];
    return {
      loadingStartTime: new LazyValue(() => transcript()?.turnStartTime ?? task()?.startTime ?? 0),
      responseLength: new LazyValue(() => {
        let taskState = task();
        return (
          (transcript()?.progress?.tokenCount ??
            (taskState && "progress" in taskState ? (taskState.progress?.tokenCount ?? 0) : 0)) * 4
        );
      }),
      totalPausedMs: new LazyValue(() => transcript()?.totalPausedMs ?? 0),
      noPauseStart: {
        current: null,
      },
    };
  }, [appStoreDirect, agentId]);
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
function selectVerbose3(state) {
  return state.verbose;
}
//@ chunk-18hwfzwa.js:1454819-1454858 placement
function selectIsBriefOnly3(state) {
  return state.isBriefOnly;
}
//@ chunk-18hwfzwa.js:1454858-1454895 placement
function selectIsLoading5(state) {
  return state.isLoading;
}
//@ chunk-18hwfzwa.js:1454895-1454944 placement
function selectUserInputOnProcessing(state) {
  return state.userInputOnProcessing;
}
//@ chunk-18hwfzwa.js:1454944-1455003 placement
function selectPermissionMode(state) {
  return alwaysFalseRefresh(state.toolPermissionContext.mode);
}
//@ chunk-18hwfzwa.js:1455003-1455016 placement
var REPLY_CHANNEL_STATUS_PANEL = null;
//@ chunk-18hwfzwa.js:1455016-1458175 placement
/**
 * LiveStateRow：REPL 实时状态行（加载动画、任务、计时）。
 */
function LiveStateRow(props) {
  let $ = useMemoCache(59);
  let { turn, focused, showSpinner, liveStateRowMounted, replacements, isRemoteSession } = props;
  let { remoteBootstrapLive, replyChannelStatusLive } = replacements;
  let verbose = useAppState(selectVerbose3);
  let appState = useAppState(selectIsBriefOnly3);
  let heldRowSelector;
  if ($[0] !== isRemoteSession) {
    heldRowSelector = (appState) => (isRemoteSession ? (appState.cloudMessageHeld?.row ?? null) : null);
    $[0] = isRemoteSession;
    $[1] = heldRowSelector;
  } else heldRowSelector = $[1];
  let appState_2 = useAppState(heldRowSelector);
  let storeSelector = useStoreSelector(turn, selectIsLoading5);
  let storeSelector_2 = useStoreSelector(turn.stream, selectUserInputOnProcessing);
  let mainAgent;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    mainAgent = mainAgentId();
    $[2] = mainAgent;
  } else mainAgent = $[2];
  let { messages } = transcriptMessagesStore(mainAgent);
  let agentId;
  if ($[3] !== focused.task?.id) {
    agentId = focused.task?.id ?? mainAgentId();
    $[3] = focused.task?.id;
    $[4] = agentId;
  } else agentId = $[4];
  let rowAgentId = agentId;
  let activeToolsSelector;
  if ($[5] !== rowAgentId) {
    activeToolsSelector = (appState) =>
      (appState.transcripts[rowAgentId]?.inProgressToolUseIDs.size ?? 0) > 0;
    $[5] = rowAgentId;
    $[6] = activeToolsSelector;
  } else activeToolsSelector = $[6];
  let hasActiveTools = useAppState(activeToolsSelector);
  let toolWindowSelector;
  if ($[7] !== rowAgentId) {
    toolWindowSelector = (appState) => appState.transcripts[rowAgentId]?.toolWindowStartTime ?? null;
    $[7] = rowAgentId;
    $[8] = toolWindowSelector;
  } else toolWindowSelector = $[8];
  let toolWindowStartedAt = useAppState(toolWindowSelector);
  let agentSpinnerRefs = useAgentSpinnerRefs(rowAgentId);
  let bridgePlacedKeys = useContext(BRIDGE_PLACED_KEYS_CONTEXT);
  let appState_3 = useAppState(selectPermissionMode);
  let isMain = bridgePlacedKeys !== null && appState_3 && focused.isMain;
  const session = useSession();
  let hookStore;
  if ($[9] !== session.host) {
    hookStore = runningHooksStoreOf(session.host);
    $[9] = session.host;
    $[10] = hookStore;
  } else hookStore = $[10];
  let storeSelector_3 = useStoreSelector(
    hookStore,
    isMain ? latestNonPollHookProgressText : latestHookProgressText,
  );
  let remoteModelRowSelector;
  if ($[11] !== isRemoteSession) {
    remoteModelRowSelector = (appState) => (isRemoteSession ? appState.rowAtRemoteModelRequest : undefined);
    $[11] = isRemoteSession;
    $[12] = remoteModelRowSelector;
  } else remoteModelRowSelector = $[12];
  let appState_4 = useAppState(remoteModelRowSelector);
  let remoteLive;
  if ($[13] !== isRemoteSession || $[14] !== messages || $[15] !== appState_3 || $[16] !== appState_4) {
    let remoteSource = isRemoteSession ? remoteStatusSource(messages, appState_4, appState_3) : null;
    remoteLive =
      remoteSource === null
        ? null
        : {
            suffix: nullText(remoteSource),
            running: alwaysFalseLiveRow(remoteSource),
          };
    $[13] = isRemoteSession;
    $[14] = messages;
    $[15] = appState_3;
    $[16] = appState_4;
    $[17] = remoteLive;
  } else remoteLive = $[17];
  let liveInfo = remoteLive;
  let hookSuffix = useStoreSelector(bridgePlacedKeys, nullText) ?? null;
  let hookRunning = useStoreSelector(bridgePlacedKeys, alwaysFalseLiveRow) ?? false;
  let suffixText = liveInfo === null ? hookSuffix : liveInfo.suffix;
  let runningFlag = liveInfo === null ? hookRunning : liveInfo.running;
  let spinnerSuffix = !focused.isMain
    ? storeSelector_3
    : runningFlag
      ? suffixText
      : (storeSelector_3 ?? suffixText);
  let agentLiveStatus;
  if ($[18] !== focused.isLoading || $[19] !== focused.task?.id || $[20] !== showSpinner) {
    agentLiveStatus =
      focused.isLoading &&
      !showSpinner &&
      jsxProd_default(AgentLiveStatus, {
        agentId: focused.task?.id ?? mainAgentId(),
      });
    $[18] = focused.isLoading;
    $[19] = focused.task?.id;
    $[20] = showSpinner;
    $[21] = agentLiveStatus;
  } else agentLiveStatus = $[21];
  let bootstrapProgress;
  if ($[22] !== remoteBootstrapLive) {
    bootstrapProgress = remoteBootstrapLive && jsxProd_default(RemoteBootstrapProgress, {});
    $[22] = remoteBootstrapLive;
    $[23] = bootstrapProgress;
  } else bootstrapProgress = $[23];
  let replyChannelPanel;
  if ($[24] !== messages || $[25] !== replyChannelStatusLive) {
    replyChannelPanel =
      REPLY_CHANNEL_STATUS_PANEL !== null &&
      replyChannelStatusLive &&
      jsxProd_default(REPLY_CHANNEL_STATUS_PANEL.ReplyChannelStatusPanel, {
        messages,
      });
    $[24] = messages;
    $[25] = replyChannelStatusLive;
    $[26] = replyChannelPanel;
  } else replyChannelPanel = $[26];
  let spinnerRow;
  if (
    $[27] !== focused.isMain ||
    $[28] !== focused.task?.id ||
    $[29] !== hasActiveTools ||
    $[30] !== storeSelector ||
    $[31] !== liveStateRowMounted ||
    $[32] !== remoteBootstrapLive ||
    $[33] !== replyChannelStatusLive ||
    $[34] !== showSpinner ||
    $[35] !== spinnerSuffix ||
    $[36] !== agentSpinnerRefs ||
    $[37] !== toolWindowStartedAt ||
    $[38] !== turn.pauseStartTimeRef ||
    $[39] !== verbose
  ) {
    spinnerRow =
      showSpinner &&
      !liveStateRowMounted &&
      !remoteBootstrapLive &&
      !replyChannelStatusLive &&
      jsxProd_default(SpinnerWithVerb, {
        responseLengthRef: agentSpinnerRefs.responseLength,
        spinnerSuffix: storeSelector ? spinnerSuffix : null,
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
    $[35] = spinnerSuffix;
    $[36] = agentSpinnerRefs;
    $[37] = toolWindowStartedAt;
    $[38] = turn.pauseStartTimeRef;
    $[39] = verbose;
    $[40] = spinnerRow;
  } else spinnerRow = $[40];
  let waitingRow;
  if ($[41] !== focused.isMain || $[42] !== appState_2 || $[43] !== storeSelector || $[44] !== showSpinner) {
    waitingRow =
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
    $[45] = waitingRow;
  } else waitingRow = $[45];
  let briefIdleRow;
  if (
    $[46] !== focused.isMain ||
    $[47] !== appState ||
    $[48] !== storeSelector ||
    $[49] !== showSpinner ||
    $[50] !== storeSelector_2
  ) {
    briefIdleRow =
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
    $[51] = briefIdleRow;
  } else briefIdleRow = $[51];
  let rowGroup;
  if (
    $[52] !== agentLiveStatus ||
    $[53] !== bootstrapProgress ||
    $[54] !== replyChannelPanel ||
    $[55] !== spinnerRow ||
    $[56] !== waitingRow ||
    $[57] !== briefIdleRow
  ) {
    rowGroup = jsxProd_default_2(Fragment, {
      children: [agentLiveStatus, bootstrapProgress, replyChannelPanel, spinnerRow, waitingRow, briefIdleRow],
    });
    $[52] = agentLiveStatus;
    $[53] = bootstrapProgress;
    $[54] = replyChannelPanel;
    $[55] = spinnerRow;
    $[56] = waitingRow;
    $[57] = briefIdleRow;
    $[58] = rowGroup;
  } else rowGroup = $[58];
  return rowGroup;
}
//@ chunk-18hwfzwa.js:1458175-1458203 placement
function nullText(state) {
  return null;
}
//@ chunk-18hwfzwa.js:1458203-1458235 placement
function remoteStatusSource(messages, appState, appState_2) {
  return null;
}
//@ chunk-18hwfzwa.js:1458235-1458260 placement
function alwaysFalseLiveRow(state) {
  return false;
}
//@ chunk-18hwfzwa.js:1458260-1458324 placement
function latestHookProgressText(progress) {
  return hookProgressText(progress.findLast((entry) => entry.agentId === undefined));
}
//@ chunk-18hwfzwa.js:1458324-1458405 placement
function latestNonPollHookProgressText(progressList) {
  return hookProgressText(
    progressList.findLast((entry) => entry.agentId === undefined && entry.toolName !== POLL),
  );
}
//@ chunk-18hwfzwa.js:1458405-1458687 placement
/**
 * 钩子运行进度文本（状态消息或 “running X hooks”）。
 */
function hookProgressText(last) {
  if (!last) return null;
  let hookCount = last.hooks.length;
  let settledSuffix = hookCount > 1 ? `\u2026 ${last.settled.size}/${hookCount}` : "";
  let found = last.hooks.find((hook, index) => !last.settled.has(index));
  if (found?.statusMessage) return `${found.statusMessage}${settledSuffix || "\u2026"}`;
  let pendingPrefix = "";
  let hookNoun = pendingPrefix ? "hook" : plural(hookCount, "hook");
  return `running ${last.hookEvent} ${hookNoun}${pendingPrefix}${settledSuffix}`;
}
//@ chunk-18hwfzwa.js:1458687-1458691 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1458687", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1458691-1458704 placement
var REMOTE_STARTUP_STATUS = null;
//@ chunk-18hwfzwa.js:1458704-1459124 placement
/**
 * 远程启动步骤与回复通道状态是否在显示。
 */
function useLiveStatusFlags({ focused, isRemoteSession }) {
  let isVerbose = useAppState((appState) => appState.verbose);
  let { messages } = transcriptMessagesStore(mainAgentId());
  let remoteBootstrapLive = useAppState(
    (appState) =>
      isRemoteSession &&
      appState.remoteBootstrap !== null &&
      appState.remoteBootstrap.hasStructuredSteps &&
      !appState.remoteBootstrap.terminal &&
      !appState.remoteBootstrap.dismissed,
  );
  let hasRemoteReplyChannel = useAppState((appState) => appState.hasRemoteReplyChannel);
  let replyChannelStatusLive =
    useMemo(
      () =>
        REMOTE_STARTUP_STATUS !== null &&
        hasRemoteReplyChannel &&
        REMOTE_STARTUP_STATUS.visibleAgentStatus(messages) !== null,
      [messages, hasRemoteReplyChannel],
    ) &&
    focused.isMain &&
    focused.isLoading &&
    !isVerbose;
  return {
    remoteBootstrapLive,
    replyChannelStatusLive,
  };
}
//@ chunk-18hwfzwa.js:1459124-1459225 placement
/**
 * 处理中的用户输入存在且不是斜杠命令。
 */
function hasNonCommandInput(value) {
  return value.userInputOnProcessing !== undefined && !value.userInputOnProcessing.startsWith("/");
}
export { hasNonCommandInput, useLiveStatusFlags, LiveStateRow };
