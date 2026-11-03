/**
 * components/messages/CollapsedReadSearchContent.tsx
 *
 * 折叠的读取/搜索类工具组："Read N files, searched M patterns"，verbose 下逐个展开。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/CollapsedReadSearchContent.tsx
 * pieces: chunk-ah34pb7m.js (9)
 * attribution: placement 7, fingerprint 2
 */
import { basename } from "path";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { VALIDATE_TREE_NAMESPACE } from "../../plugins/functionHooks/ui/index.js";
import { actionKeysNamespace } from "../pluginUi/render/actionKeys.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useHost } from "../../context/session.js";
import { useAppStateSlice } from "../../state/AppState.js";
import {
  selectActiveAgents_2,
  guardPrimitiveToolResult,
  isNoAgentViewInAutoMode,
  toolResultId,
  isHookToolResult,
  toolUseId,
  toolUseId_2,
  noopRenderHook,
  returnFalseHook,
  renderHookDurationLine,
  commitSha,
  gitBranch,
} from "./toolResultRendering.js";
import { useFrameRegistry, parseRenderModeValue, useIsFullscreen } from "../../ink/renderModeContext.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { findToolByNameWithFallback } from "../../utils/collapseReadSearch.js";
import { displayOnlyMcpTool } from "../../tools/MCPTool/displayOnlyTool.js";
import { safeParseToolInput, filterToolProgressMessages, findToolByName } from "../../Tool.js";
import { remoteMachineRefForDisplay } from "../../utils/toolUseDisplay.js";
import { describeUnparsedInput } from "../../utils/json.js";
import { renderToolUseMessageFor } from "./toolUseRenderers.js";
import { mcpRenderOverrideFor } from "../Message.js";
import { Box, Text } from "../../ink/components/Text.js";
import { ToolUseLoader } from "../ToolUseLoader.js";
import {
  GroupedToolUseRow,
  toolCallOf,
  ThinkingElapsed,
  collectBackgroundToolUseIds,
  lowerFirstUnlessAcronym,
  ElapsedSinceAnchor,
  truncateToLines,
} from "./GroupedToolUseContent.js";
import { Se, y } from "../../../vendor/react/cjs/react.production.js";
import { BRIDGE_PLACED_KEYS_CONTEXT } from "../../bridge/inboundMessages.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { collectToolUseIds } from "../messageActions.js";
import { alwaysFalseMemCtx } from "../../services/accountMemory/memoryContext.js";
import {
  checkHasTeamMemOps,
  isAutoModeBlockedResult,
  useThrottledValue,
  useLingeringValue,
  isModelUnavailableDenial,
  TeamMemCountParts,
  DenialReasonQuote,
} from "./teamMemCollapsed.js";
import { isReplToolName, REPL_TOOL_NAME } from "../../tools/REPLTool/constants.js";
import { POLL } from "../../tools/PollTool/prompt.js";
import {
  isToolDenial,
  REJECT_MESSAGE,
  REJECT_MESSAGE_WITH_REASON_PREFIX,
  extractClassifierDenialReason,
  PERMISSION_DENIED_FOR_PATTERN,
  NON_INTERACTIVE_DENIAL_PREFIXES,
  SAFETY_CHECK_DENIAL_PREFIX,
  DENIAL_STOP_AND_EXPLAIN_GUIDANCE,
  AUTO_MODE_PREFIX,
} from "../../utils/messages.js";
import { USER_REJECTED_KIND, toolRejectionKind } from "../../entrypoints/sdk/coreSchemas.js";
import { MessageResponse } from "../MessageResponse.js";
import { Byline } from "../design-system/Byline.js";
import { CtrlOToExpand } from "../CtrlOToExpand.js";
import {
  UserToolErrorMessage,
  isAutoModeUnavailableKind,
  NotRunLine,
} from "./UserToolResultMessage/UserToolErrorMessage.js";
import { getDisplayPath } from "../../utils/file.js";
import { useFrozenValue } from "../FreezeWhenOffscreen.js";
import { useHasAutoModeDenialFor } from "../Spinner/spinnerStatus.js";
import { cleanTaskDescription } from "../../utils/taskDescription.js";
import { TASK_NOTIFICATION } from "../../constants/xml.js";
import { renderToolUseErrorMessage_5 } from "./UserTaskNotificationMessage.js";
import { AssistantThinkingMessage } from "./AssistantThinkingMessage.js";
import { RejectedToolUseMessage } from "./UserToolResultMessage/RejectedToolUseMessage.js";
import { formatSecondsShort, formatDuration } from "../../utils/format.js";
import { Ansi } from "../../ink/components/AnsiText.js";
import { DiffStatCounts, PrBadge } from "../PrBadge.js";
import { uniq } from "../../utils/collections.js";
import { isValidPrUrl } from "../../tools/shared/gitOperationTracking.js";
import { isGitLabMergeRequestUrl } from "../../utils/detectRepository.js";
import { MEMORY } from "../../services/mcp/firstPartyServerIds.js";
import { CLAUDEAI_SERVER_PREFIX } from "../../services/mcp/normalization.js";
import { inflectStatusText } from "../../utils/verbInflection.js";
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { unwrapToolUseErrorText } from "../../utils/toolUseErrorText.js";
import { PRE_TOOL_HOOK_ERROR_PREFIX_RE } from "../../utils/hooks.js";
import { firstLineOf, getFirstLine, capitalize, plural } from "../../utils/stringUtils.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";

//@ chunk-ah34pb7m.js:157480-157568 placement = countToolUses (0.815)
function countToolUses(msg) {
  return msg.type === "grouped_tool_use" ? msg.results : msg.type === "user" ? [msg] : [];
}
//@ chunk-ah34pb7m.js:157568-157615 placement
function isToolResultBlock(W1) {
  return W1.type === "tool_result";
}
//@ chunk-ah34pb7m.js:157615-157658 placement = _temp2 (1)
function selectViewingAgentTaskId_2(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-ah34pb7m.js:157658-157670 placement
var memorySavesQuietApi = null;
//@ chunk-ah34pb7m.js:157670-157681 placement
var HINT_THROTTLE_MS = 700;
//@ chunk-ah34pb7m.js:157681-157704 placement
var HINT_LINGER_MS = 3000;
var HINT_COLUMN_RESERVE = 5;
var HINT_MAX_LINES = 10;
//@ chunk-ah34pb7m.js:157704-159047 placement
/**
 * 折叠的读取/搜索工具组（进行中、出错状态）。
 */
function CollapsedReadSearchGroup(props) {
  let $ = w(28);
  let { content, inProgressToolUseIDs, lookups } = props;
  let h;
  if ($[0] !== content.id || $[1] !== inProgressToolUseIDs) {
    h = inProgressToolUseIDs.has(content.id);
    $[0] = content.id;
    $[1] = inProgressToolUseIDs;
    $[2] = h;
  } else h = $[2];
  let M = h;
  let T;
  if ($[3] !== content.id || $[4] !== lookups.erroredToolUseIDs) {
    T = lookups.erroredToolUseIDs.has(content.id);
    $[3] = content.id;
    $[4] = lookups.erroredToolUseIDs;
    $[5] = T;
  } else T = $[5];
  let x = T;
  let k;
  let b;
  if ($[6] !== content.id || $[7] !== lookups.toolResultByToolUseID) {
    k = lookups.toolResultByToolUseID.get(content.id);
    b = VALIDATE_TREE_NAMESPACE.isInterruptedCall(k);
    $[6] = content.id;
    $[7] = lookups.toolResultByToolUseID;
    $[8] = k;
    $[9] = b;
  } else {
    k = $[8];
    b = $[9];
  }
  let E = b;
  let toolUseResult = k?.type === "user" ? k.toolUseResult : undefined;
  let L;
  if (
    $[10] !== content.id ||
    $[11] !== content.input ||
    $[12] !== content.name ||
    $[13] !== x ||
    $[14] !== E ||
    $[15] !== toolUseResult ||
    $[16] !== M
  ) {
    L = () => ({
      requestId: content.id,
      props: {
        tool_use_id: content.id,
        tool: content.name,
        input: content.input,
        isRunning: M,
        isErrored: x,
        isInterrupted: E,
        isExpanded: true,
        output: toolUseResult,
      },
    });
    $[10] = content.id;
    $[11] = content.input;
    $[12] = content.name;
    $[13] = x;
    $[14] = E;
    $[15] = toolUseResult;
    $[16] = M;
    $[17] = L;
  } else L = $[17];
  let N;
  if ($[18] !== content || $[19] !== x || $[20] !== E || $[21] !== toolUseResult || $[22] !== M) {
    N = [content, M, x, E, toolUseResult];
    $[18] = content;
    $[19] = x;
    $[20] = E;
    $[21] = toolUseResult;
    $[22] = M;
    $[23] = N;
  } else N = $[23];
  let W = actionKeysNamespace.useRenderInput("ToolUse", L, N);
  let U;
  if ($[24] !== content || $[25] !== toolUseResult || $[26] !== props) {
    U = (K) =>
      jsxProd_default(VerboseToolUse, {
        ...props,
        content:
          K.props.input === content.input
            ? content
            : {
                ...content,
                input: K.props.input,
              },
        toolLabel: K.props.tool === content.name ? undefined : K.props.tool,
        outputOverride:
          K.props.output === toolUseResult
            ? undefined
            : {
                value: K.props.output,
              },
      });
    $[24] = content;
    $[25] = toolUseResult;
    $[26] = props;
    $[27] = U;
  } else U = $[27];
  return actionKeysNamespace.useRenderHook(W, U);
}
//@ chunk-ah34pb7m.js:159047-162030 fingerprint = VerboseToolUse (0.513)
function VerboseToolUse(props) {
  let $ = w(54);
  let {
    content,
    tools,
    lookups,
    inProgressToolUseIDs,
    shouldAnimate,
    theme,
    outputOverride,
    toolLabel,
    quietWords,
  } = props;
  let bg = useHost();
  let activeAgents = useAppStateSlice(selectActiveAgents_2);
  let frameRegistry = useFrameRegistry();
  let N;
  let W;
  let U;
  let K;
  let V;
  let Y;
  let flexDirection;
  let marginTop;
  let ee;
  let le;
  let ge;
  let ae;
  if (
    $[0] !== activeAgents ||
    $[1] !== content.id ||
    $[2] !== content.input ||
    $[3] !== content.name ||
    $[4] !== bg ||
    $[5] !== inProgressToolUseIDs ||
    $[6] !== lookups ||
    $[7] !== outputOverride ||
    $[8] !== quietWords ||
    $[9] !== frameRegistry ||
    $[10] !== shouldAnimate ||
    $[11] !== theme ||
    $[12] !== toolLabel ||
    $[13] !== tools
  ) {
    ge = EARLY_RETURN_SENTINEL;
    pe: {
      ae = findToolByNameWithFallback(tools, content.name) ?? displayOnlyMcpTool(content.name, bg);
      if (!ae) {
        ge = null;
        break pe;
      }
      if (ae.isTransparentWrapper?.()) {
        ge = null;
        break pe;
      }
      let te;
      if ($[26] !== content.id || $[27] !== lookups.resolvedToolUseIDs) {
        te = lookups.resolvedToolUseIDs.has(content.id);
        $[26] = content.id;
        $[27] = lookups.resolvedToolUseIDs;
        $[28] = te;
      } else te = $[28];
      U = te;
      let de;
      if ($[29] !== content.id || $[30] !== lookups.erroredToolUseIDs) {
        de = lookups.erroredToolUseIDs.has(content.id);
        $[29] = content.id;
        $[30] = lookups.erroredToolUseIDs;
        $[31] = de;
      } else de = $[31];
      let ue = de;
      W = ue && quietWords === undefined;
      let J;
      if ($[32] !== content.id || $[33] !== inProgressToolUseIDs) {
        J = inProgressToolUseIDs.has(content.id);
        $[32] = content.id;
        $[33] = inProgressToolUseIDs;
        $[34] = J;
      } else J = $[34];
      let se = J;
      V = lookups.toolResultByToolUseID.get(content.id);
      let ye =
        outputOverride !== undefined
          ? outputOverride.value
          : V?.type === "user"
            ? V.toolUseResult
            : undefined;
      let parsedOutput = parseRenderModeValue(frameRegistry, ae.outputSchema, ye);
      let Me = parsedOutput?.success ? parsedOutput.data : undefined;
      let be = Me;
      let ve = safeParseToolInput(ae, content.input);
      let Ue = ve.success ? ve.data : undefined;
      let we = remoteMachineRefForDisplay(ae, Ue);
      let $e =
        toolLabel ??
        ae.userFacingName(Ue, {
          activeAgents,
        });
      let De;
      if ($[35] !== content.input) {
        De = describeUnparsedInput(content.input);
        $[35] = content.input;
        $[36] = De;
      } else De = $[36];
      let xe = De;
      let Pe =
        xe !== null
          ? xe
          : Ue
            ? renderToolUseMessageFor(ae, Ue, {
                theme,
                verbose: true,
                isTranscriptMode: true,
                activeAgents,
              })
            : null;
      K = lookups.progressMessagesByToolUseID.get(content.id) ?? [];
      let co =
        U && !ue && be !== undefined
          ? mcpRenderOverrideFor(ae, "renderToolResultMessage")?.(be, filterToolProgressMessages(K), {
              verbose: true,
              tools,
              theme,
              isTranscriptMode: true,
              input: content.input,
              activeAgents,
            })
          : undefined;
      let qe = $e !== "";
      if (!qe && co == null && !(U && ue && V !== undefined)) {
        ge = null;
        break pe;
      }
      N = Box;
      Y = content.id;
      flexDirection = "column";
      marginTop = qe ? 1 : 0;
      ee =
        qe &&
        jsxProd_default_2(Box, {
          flexDirection: "row",
          children: [
            jsxProd_default(ToolUseLoader, {
              shouldAnimate: shouldAnimate && se,
              isUnresolved: !U,
              isError: W,
            }),
            jsxProd_default_2(Text, {
              children: [
                jsxProd_default(Text, {
                  bold: true,
                  children: $e,
                }),
                Pe &&
                  jsxProd_default_2(Text, {
                    children: ["(", Pe, ")"],
                  }),
                we !== undefined &&
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [" \xB7 on ", we],
                  }),
              ],
            }),
            Ue &&
              mcpRenderOverrideFor(ae, "renderToolUseTag")?.(Ue, {
                toolUseId: content.id,
                toolUseResult: ye,
                progressMessages: lookups.progressMessagesByToolUseID.get(content.id),
              }),
          ],
        });
      le =
        co != null &&
        jsxProd_default(Box, {
          children: guardPrimitiveToolResult(bg, co, ae),
        });
    }
    $[0] = activeAgents;
    $[1] = content.id;
    $[2] = content.input;
    $[3] = content.name;
    $[4] = bg;
    $[5] = inProgressToolUseIDs;
    $[6] = lookups;
    $[7] = outputOverride;
    $[8] = quietWords;
    $[9] = frameRegistry;
    $[10] = shouldAnimate;
    $[11] = theme;
    $[12] = toolLabel;
    $[13] = tools;
    $[14] = N;
    $[15] = W;
    $[16] = U;
    $[17] = K;
    $[18] = V;
    $[19] = Y;
    $[20] = flexDirection;
    $[21] = marginTop;
    $[22] = ee;
    $[23] = le;
    $[24] = ge;
    $[25] = ae;
  } else {
    N = $[14];
    W = $[15];
    U = $[16];
    K = $[17];
    V = $[18];
    Y = $[19];
    flexDirection = $[20];
    marginTop = $[21];
    ee = $[22];
    le = $[23];
    ge = $[24];
    ae = $[25];
  }
  if (ge !== EARLY_RETURN_SENTINEL) return ge;
  let te;
  if (
    $[37] !== content.id ||
    $[38] !== content.input ||
    $[39] !== W ||
    $[40] !== U ||
    $[41] !== K ||
    $[42] !== V ||
    $[43] !== ae ||
    $[44] !== tools
  ) {
    te =
      U &&
      W &&
      jsxProd_default(GroupedToolUseRow, {
        toolUseID: content.id,
        input: content.input,
        resultMsg: V,
        tool: ae,
        tools,
        progressMessagesForMessage: K,
      });
    $[37] = content.id;
    $[38] = content.input;
    $[39] = W;
    $[40] = U;
    $[41] = K;
    $[42] = V;
    $[43] = ae;
    $[44] = tools;
    $[45] = te;
  } else te = $[45];
  let de;
  if (
    $[46] !== N ||
    $[47] !== Y ||
    $[48] !== flexDirection ||
    $[49] !== marginTop ||
    $[50] !== ee ||
    $[51] !== le ||
    $[52] !== te
  ) {
    de = jsxProd_default_2(
      N,
      {
        flexDirection,
        marginTop,
        children: [ee, le, false, te],
      },
      Y,
    );
    $[46] = N;
    $[47] = Y;
    $[48] = flexDirection;
    $[49] = marginTop;
    $[50] = ee;
    $[51] = le;
    $[52] = te;
    $[53] = de;
  } else de = $[53];
  return de;
}
//@ chunk-ah34pb7m.js:166083-185246 fingerprint = CollapsedReadSearchContent (0.58)
/**
 * 折叠读/搜索组：统计 Read/Grep/Glob 等调用次数显示一行摘要（进行中显示当前目标），verbose 或 transcript 下逐个渲染 VerboseToolUse；含权限规则命中/本地错误等标记。
 */
function CollapsedReadSearchContent(props) {
  let $ = w(201);
  let { message, inProgressToolUseIDs, shouldAnimate, verbose, tools, lookups, isActiveGroup, addMargin } =
    props;
  let k = addMargin === undefined ? true : addMargin;
  let bg = useIsFullscreen();
  useHost();
  let appStateSlice = useAppStateSlice(isNoAgentViewInAutoMode);
  let B = Se(BRIDGE_PLACED_KEYS_CONTEXT) !== null && appStateSlice === true;
  let {
    searchCount: rawSearchCount,
    readCount: rawReadCount,
    listCount: rawListCount,
    memorySearchCount,
    memoryReadCount,
    memoryWriteCount,
    messages: groupMessages,
  } = message;
  let [X] = useTheme();
  let { columns } = useTerminalSize();
  let toolUseIds = collectToolUseIds(message);
  let le = memorySavesQuietApi?.quietMemorySaves(message.memorySaves ?? []);
  let anyError = toolUseIds.some((id) => lookups.erroredToolUseIDs.has(id) && le?.has(id) !== true);
  let pe = message.accountMemoryReadKeys?.length ?? 0;
  let accountMemorySearchCount = message.accountMemorySearchCount ?? 0;
  let de = alwaysFalseMemCtx() || pe > 0 || accountMemorySearchCount > 0 ? "local " : "";
  let ue =
    memorySearchCount > 0 ||
    memoryReadCount > 0 ||
    memoryWriteCount > 0 ||
    pe > 0 ||
    accountMemorySearchCount > 0 ||
    (message.memorySaves?.length ?? 0) > 0;
  let se;
  if ($[0] !== message) {
    se = checkHasTeamMemOps(message);
    $[0] = message;
    $[1] = se;
  } else se = $[1];
  let ye = se;
  let Te;
  if ($[2] !== isActiveGroup || $[3] !== message.memorySaves) {
    Te = memorySavesQuietApi?.memorySavesToldAsCalls(message.memorySaves ?? [], isActiveGroup === true) ?? 0;
    $[2] = isActiveGroup;
    $[3] = message.memorySaves;
    $[4] = Te;
  } else Te = $[4];
  let Me = Te;
  const read = rawReadCount ?? 0;
  const search = rawSearchCount ?? 0;
  const list = rawListCount ?? 0;
  const mcp = message.mcpCallCount ?? 0;
  const bash = message.bashCount ?? 0;
  let De;
  if ($[5] !== read || $[6] !== search || $[7] !== list || $[8] !== mcp || $[9] !== bash) {
    De = {
      read,
      search,
      list,
      mcp,
      bash,
    };
    $[5] = read;
    $[6] = search;
    $[7] = list;
    $[8] = mcp;
    $[9] = bash;
    $[10] = De;
  } else De = $[10];
  let xe = De;
  let [Pe, co] = y(xe);
  const read_2 = Math.max(Pe.read, xe.read);
  const search_2 = Math.max(Pe.search, xe.search);
  const list_2 = Math.max(Pe.list, xe.list);
  const mcp_2 = Math.max(Pe.mcp, xe.mcp);
  const bash_2 = Math.max(Pe.bash, xe.bash);
  let Xe;
  if ($[11] !== read_2 || $[12] !== search_2 || $[13] !== list_2 || $[14] !== mcp_2 || $[15] !== bash_2) {
    Xe = {
      read: read_2,
      search: search_2,
      list: list_2,
      mcp: mcp_2,
      bash: bash_2,
    };
    $[11] = read_2;
    $[12] = search_2;
    $[13] = list_2;
    $[14] = mcp_2;
    $[15] = bash_2;
    $[16] = Xe;
  } else Xe = $[16];
  let Ge = Xe;
  if (
    Ge.read !== Pe.read ||
    Ge.search !== Pe.search ||
    Ge.list !== Pe.list ||
    Ge.mcp !== Pe.mcp ||
    Ge.bash !== Pe.bash
  )
    co(Ge);
  let otherToolCount = message.otherToolCount ?? 0;
  let agentCount = message.agentCount ?? 0;
  let editFileCount = message.editFileCount ?? 0;
  let frameCount = message.frameCount ?? 0;
  let added = message.linesAdded ?? 0;
  let removed = message.linesRemoved ?? 0;
  let scratchpadWriteCount = message.scratchpadWriteCount ?? 0;
  let added_2 = message.scratchpadLinesAdded ?? 0;
  let removed_2 = message.scratchpadLinesRemoved ?? 0;
  let { read: read_3, search: search_3, list: list_3 } = Ge;
  let bt = Ge.mcp + Me;
  let gitOpBashCount = message.gitOpBashCount ?? 0;
  let So = bg ? Math.max(0, Ge.bash - gitOpBashCount) : 0;
  let thoughtForMs = message.thoughtForMs ?? 0;
  let xr = thoughtForMs > 0 || message.latestThinkingSummary !== undefined;
  let Je =
    search_3 > 0 ||
    read_3 > 0 ||
    list_3 > 0 ||
    bt > 0 ||
    So > 0 ||
    gitOpBashCount > 0 ||
    otherToolCount > 0 ||
    agentCount > 0 ||
    editFileCount > 0 ||
    scratchpadWriteCount > 0 ||
    frameCount > 0 ||
    (message.hookTotalMs ?? 0) > 0 ||
    xr;
  let No;
  if (
    $[17] !== isActiveGroup ||
    $[18] !== lookups.toolResultByToolUseID ||
    $[19] !== message ||
    $[20] !== B
  ) {
    No =
      isActiveGroup === true && !B
        ? toolCallOf(message)
            .filter((Rt) => isReplToolName(Rt.name) && !lookups.toolResultByToolUseID.has(Rt.id))
            .map(toolResultId)
        : [];
    $[17] = isActiveGroup;
    $[18] = lookups.toolResultByToolUseID;
    $[19] = message;
    $[20] = B;
    $[21] = No;
  } else No = $[21];
  let Dt = No;
  let Lo;
  if (
    $[22] !== inProgressToolUseIDs ||
    $[23] !== isActiveGroup ||
    $[24] !== message ||
    $[25] !== Dt.length ||
    $[26] !== B
  ) {
    Lo =
      Dt.length > 0 ||
      (isActiveGroup === true &&
        !B &&
        toolCallOf(message).some((Nt) => isReplToolName(Nt.name) && inProgressToolUseIDs.has(Nt.id)));
    $[22] = inProgressToolUseIDs;
    $[23] = isActiveGroup;
    $[24] = message;
    $[25] = Dt.length;
    $[26] = B;
    $[27] = Lo;
  } else Lo = $[27];
  let Ts = Lo;
  let filtered = toolCallOf(message).filter(isHookToolResult);
  let ns = filtered.length > 0 ? findToolByName(tools, REPL_TOOL_NAME) : undefined;
  let Gs = ns && mcpRenderOverrideFor(ns, "renderToolUseErrorMessage");
  let kt;
  if ($[28] === MEMO_CACHE_SENTINEL) {
    kt = [];
    $[28] = kt;
  } else kt = $[28];
  let Ms = kt;
  if (Ms.length > 0) findToolByName(tools, POLL);
  else undefined;
  let Xm;
  if ($[29] === MEMO_CACHE_SENTINEL) {
    Xm = new Set([]);
    $[29] = Xm;
  } else Xm = $[29];
  let as = Xm;
  let Qh = Gs !== undefined && as.size > 0;
  let ni;
  if ($[30] === MEMO_CACHE_SENTINEL) {
    ni = new Set(Ms.map(toolUseId));
    $[30] = ni;
  } else ni = $[30];
  let qs = ni;
  let Xh = new Set(filtered.map(toolUseId_2));
  let Zm = false && !Qh && true;
  let Zh = false ? filtered.filter((cv) => !as.has(cv.id)) : filtered;
  let Jh =
    toolUseIds.some(
      (toolUseId) =>
        !qs.has(toolUseId) &&
        VALIDATE_TREE_NAMESPACE.isInterruptedCall(lookups.toolResultByToolUseID.get(toolUseId)),
    ) || Zm;
  let eT = function eT(id, eu) {
    let Yo = lookups.toolResultByToolUseID.get(id);
    if (
      !Gs ||
      Yo?.type !== "user" ||
      !lookups.erroredToolUseIDs.has(id) ||
      VALIDATE_TREE_NAMESPACE.isInterruptedCall(Yo)
    ) {
      return null;
    }
    let found = Yo.message.content.find((fv) => fv.type === "tool_result" && fv.tool_use_id === id);
    if (
      found?.type !== "tool_result" ||
      (isToolDenial(found.content, Yo, USER_REJECTED_KIND) &&
        typeof found.content === "string" &&
        (found.content.startsWith(REJECT_MESSAGE) ||
          found.content.startsWith(REJECT_MESSAGE_WITH_REASON_PREFIX)))
    ) {
      return null;
    }
    if (Yo.toolDenialKind === "permission-rule" && !eu) {
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Text, {
          dimColor: true,
          wrap: "wrap",
          children: [
            jsxProd_default_2(Byline, {
              children: [
                jsxProd_default(Text, {
                  children: "Not run",
                }),
                jsxProd_default(Text, {
                  children: "permission denied",
                }),
              ],
            }),
            " ",
            jsxProd_default(CtrlOToExpand, {}),
          ],
        }),
      });
    }
    if (
      typeof found.content === "string" &&
      (toolRejectionKind(Yo.toolDenialKind) ||
        Yo.toolDenialKind === "permission-rule" ||
        isAutoModeBlockedResult(found.content, Yo))
    ) {
      return jsxProd_default(UserToolErrorMessage, {
        param: found,
        tool: ns,
        tools,
        input: filtered.find((p1) => p1.id === id)?.input,
        output: Yo.toolUseResult,
        toolDenialKind: Yo.toolDenialKind,
        remoteToolDenialKind: Yo.remoteToolDenialKind,
        toolDenialMonitorBlocked: Yo.toolDenialMonitorBlocked,
        verbose: eu,
        progressMessagesForMessage: [],
        isTranscriptMode: eu,
      });
    }
    return (
      Gs(found.content, {
        progressMessagesForMessage: [],
        tools,
        verbose: eu,
        output: Yo.toolUseResult,
      }) ?? null
    );
  };
  let { readFilePaths, searchArgs, latestDisplayHint } = message;
  if (latestDisplayHint === undefined) {
    let ai;
    if ($[31] !== searchArgs) {
      ai = searchArgs?.at(-1);
      $[31] = searchArgs;
      $[32] = ai;
    } else ai = $[32];
    let hv = ai;
    let sT = hv !== undefined ? `"${hv}"` : undefined;
    let Ks;
    if ($[33] !== sT || $[34] !== readFilePaths) {
      let lastRead = readFilePaths?.at(-1);
      Ks = lastRead !== undefined ? getDisplayPath(lastRead) : sT;
      $[33] = sT;
      $[34] = readFilePaths;
      $[35] = Ks;
    } else Ks = $[35];
    latestDisplayHint = Ks;
  }
  useAppStateSlice(noopRenderHook);
  let [rT, nT] = useFrozenValue(useHasAutoModeDenialFor(toolUseIds));
  useAppStateSlice(returnFalseHook);
  if (isActiveGroup) {
    if (
      $[36] !== inProgressToolUseIDs ||
      $[37] !== latestDisplayHint ||
      $[39] !== lookups.progressMessagesByToolUseID ||
      $[40] !== toolUseIds
    ) {
      $[38] = latestDisplayHint;
      for (const id_0 of toolUseIds) {
        if (!inProgressToolUseIDs.has(id_0)) {
          continue;
        }
        let latest = (lookups.progressMessagesByToolUseID.get(id_0) ?? []).at(-1)?.data;
        if (latest?.type === "mcp_progress") {
          let { progress, total, progressMessage } = latest;
          let tu = cleanTaskDescription(progressMessage);
          if (progress !== undefined && total !== undefined && total > 0) {
            let rounded = Math.round(Math.min(1, Math.max(0, progress / total)) * 100);
            latestDisplayHint = tu ? `${tu} (${rounded}%)` : `${rounded}%`;
          } else if (tu) latestDisplayHint = tu;
          else if (progress !== undefined) latestDisplayHint = `Processing\u2026 ${progress}`;
        }
      }
      $[36] = inProgressToolUseIDs;
      $[37] = $[38];
      $[39] = lookups.progressMessagesByToolUseID;
      $[40] = toolUseIds;
      $[41] = latestDisplayHint;
    } else latestDisplayHint = $[41];
  }
  let throttledValue = useThrottledValue(latestDisplayHint, HINT_THROTTLE_MS);
  let lT;
  let ko = isActiveGroup && message.isLiveBriefTurn === true;
  let displayedHint = useLingeringValue(
    isActiveGroup && !ko ? message.latestThinkingSummary : undefined,
    HINT_LINGER_MS,
  );
  let su = isActiveGroup && displayedHint !== undefined;
  let ii = su ? displayedHint : throttledValue;
  let timestamp = Date.parse(message.timestamp);
  let ai;
  if ($[42] !== timestamp || $[43] !== isActiveGroup) {
    ai = (ru) =>
      isActiveGroup && !ru.viewingAgentTaskId && ru.taskSummary !== null && !(ru.taskSummary.at < timestamp)
        ? ru.taskSummary.text
        : null;
    $[42] = timestamp;
    $[43] = isActiveGroup;
    $[44] = ai;
  } else ai = $[44];
  let appStateSlice_2 = useAppStateSlice(ai);
  if (verbose) {
    let mT = [];
    for (const msg of groupMessages) {
      if (msg.type === "assistant") mT.push(msg);
      else if (msg.type === "grouped_tool_use") mT.push(...msg.messages);
    }
    new Set();
    let Ks;
    if ($[45] !== lookups) {
      Ks = (msg_0) =>
        lookups.erroredToolUseIDs.has(msg_0.id) &&
        lookups.toolResultByToolUseID.get(msg_0.id)?.type === "user";
      $[45] = lookups;
      $[46] = Ks;
    } else Ks = $[46];
    let filtered = Zh.filter(Ks);
    let li;
    if ($[47] !== groupMessages || $[48] !== verbose) {
      let Ne;
      if ($[50] !== verbose) {
        Ne = (Ln) => {
          let uT = Ln.type === "user" ? Ln.message.content[0] : null;
          if (uT?.type !== "text" || !uT.text.includes(`<${TASK_NOTIFICATION}`)) {
            return null;
          }
          return jsxProd_default(
            Box,
            {
              marginTop: 1,
              children: jsxProd_default(renderToolUseErrorMessage_5, {
                addMargin: false,
                param: {
                  type: "text",
                  text: uT.text,
                },
                messageId: Ln.uuid,
                origin: Ln.type === "user" ? Ln.origin : undefined,
                verbose,
              }),
            },
            Ln.uuid,
          );
        };
        $[50] = verbose;
        $[51] = Ne;
      } else Ne = $[51];
      li = groupMessages.map(Ne);
      $[47] = groupMessages;
      $[48] = verbose;
      $[49] = li;
    } else li = $[49];
    const mapped = mT.map((wv) => {
      let wr = wv.message.content[0];
      if (wr?.type === "thinking" && wr.thinking) {
        return jsxProd_default(
          Box,
          {
            marginTop: 1,
            children: jsxProd_default(AssistantThinkingMessage, {
              param: wr,
              addMargin: false,
              isTranscriptMode: true,
              verbose: true,
            }),
          },
          wv.uuid,
        );
      }
      if (wr?.type !== "tool_use") {
        return null;
      }
      return jsxProd_default(
        CollapsedReadSearchGroup,
        {
          content: wr,
          tools,
          lookups,
          inProgressToolUseIDs,
          shouldAnimate,
          theme: X,
          quietWords: le?.get(wr.id),
        },
        wr.id,
      );
    });
    const mapped_2 = filtered.map((di) => {
      let Cv = lookups.toolResultByToolUseID.get(di.id);
      let On;
      if (VALIDATE_TREE_NAMESPACE.isInterruptedCall(Cv)) On = jsxProd_default(RejectedToolUseMessage, {});
      else {
        On = eT(di.id, true);
        if (On === null && ns !== undefined)
          On = jsxProd_default(GroupedToolUseRow, {
            toolUseID: di.id,
            input: di.input,
            resultMsg: Cv,
            tool: ns,
            tools,
            progressMessagesForMessage: [],
          });
      }
      return On === null
        ? null
        : jsxProd_default(
            Box,
            {
              children: On,
            },
            `ended-${di.id}`,
          );
    });
    let ks;
    if ($[52] !== message.hookCount || $[53] !== message.hookInfos || $[54] !== message.hookTotalMs) {
      ks =
        message.hookInfos &&
        message.hookInfos.length > 0 &&
        jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                jsxProd_default(Text, {
                  "aria-hidden": true,
                  children: "  \u23BF  ",
                }),
                "Ran ",
                message.hookCount,
                " ",
                "PreToolUse ",
                message.hookCount === 1 ? "hook" : "hooks",
                " (",
                formatSecondsShort(message.hookTotalMs ?? 0),
                ")",
              ],
            }),
            message.hookInfos.map(renderHookDurationLine),
          ],
        });
      $[52] = message.hookCount;
      $[53] = message.hookInfos;
      $[54] = message.hookTotalMs;
      $[55] = ks;
    } else ks = $[55];
    let Sr;
    if ($[56] !== de || $[57] !== message.relevantMemories) {
      Sr = message.relevantMemories?.map((m, idx) =>
        jsxProd_default_2(
          Box,
          {
            flexDirection: "column",
            marginTop: idx > 0 ? 1 : 0,
            children: [
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [
                  jsxProd_default(Text, {
                    "aria-hidden": true,
                    children: "  \u23BF  ",
                  }),
                  "Recalled ",
                  basename(m.path),
                  de ? " \xB7 local" : "",
                ],
              }),
              jsxProd_default(Box, {
                paddingLeft: 5,
                children: jsxProd_default(Text, {
                  children: jsxProd_default(Ansi, {
                    children: m.content,
                  }),
                }),
              }),
            ],
          },
          m.path,
        ),
      );
      $[56] = de;
      $[57] = message.relevantMemories;
      $[58] = Sr;
    } else Sr = $[58];
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [li, mapped, false, mapped_2, false, false, ks, Sr, false],
    });
  }
  let is = undefined !== undefined && Zh.includes(undefined) ? eT(undefined.id, false) : null;
  let Ks;
  if ($[59] !== lookups) {
    Ks = (T1) => VALIDATE_TREE_NAMESPACE.isInterruptedCall(lookups.toolResultByToolUseID.get(T1.id));
    $[59] = lookups;
    $[60] = Ks;
  } else Ks = $[60];
  let any = filtered.some(Ks);
  let li;
  if ($[61] === MEMO_CACHE_SENTINEL) {
    li = [];
    $[61] = li;
  } else li = $[61];
  let cT = li;
  if (!ue && !ye && !Je && !Ts) {
    let iu = any || Zm;
    if (!iu && is === null && cT.length === 0) {
      return null;
    }
    let Ne;
    if ($[62] !== iu) {
      Ne = iu && jsxProd_default(RejectedToolUseMessage, {});
      $[62] = iu;
      $[63] = Ne;
    } else Ne = $[63];
    let lo;
    if ($[64] !== is || $[65] !== Ne) {
      lo = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [Ne, cT, is],
      });
      $[64] = is;
      $[65] = Ne;
      $[66] = lo;
    } else lo = $[66];
    return lo;
  }
  let pi;
  if (
    $[67] !== bg ||
    $[68] !== inProgressToolUseIDs ||
    $[69] !== isActiveGroup ||
    $[70] !== lookups ||
    $[71] !== toolUseIds
  ) {
    pi = "";
    if (bg && isActiveGroup) {
      let _r;
      let ci = 0;
      if ($[73] !== inProgressToolUseIDs || $[74] !== lookups || $[75] !== toolUseIds) {
        for (const id_1 of toolUseIds) {
          if (!inProgressToolUseIDs.has(id_1)) {
            continue;
          }
          let data = lookups.progressMessagesByToolUseID.get(id_1)?.at(-1)?.data;
          if (data?.type !== "bash_progress" && data?.type !== "powershell_progress") {
            continue;
          }
          if (_r === undefined || data.elapsedTimeSeconds > _r) {
            _r = data.elapsedTimeSeconds;
            ci = data.totalLines;
          }
        }
        $[73] = inProgressToolUseIDs;
        $[74] = lookups;
        $[75] = toolUseIds;
        $[76] = _r;
        $[77] = ci;
      } else {
        _r = $[76];
        ci = $[77];
      }
      if (_r !== undefined && _r >= 2) {
        const Ne = _r * 1000;
        let lo;
        if ($[78] !== Ne) {
          lo = formatDuration(Ne);
          $[78] = Ne;
          $[79] = lo;
        } else lo = $[79];
        let _v = lo;
        pi = ci > 0 ? ` (${_v} \xB7 ${ci} ${ci === 1 ? "line" : "lines"})` : ` (${_v})`;
      }
    }
    $[67] = bg;
    $[68] = inProgressToolUseIDs;
    $[69] = isActiveGroup;
    $[70] = lookups;
    $[71] = toolUseIds;
    $[72] = pi;
  } else pi = $[72];
  let Bn = 0;
  if (isActiveGroup && bg) {
    if ($[80] !== groupMessages || $[81] !== inProgressToolUseIDs) {
      for (let idx = groupMessages.length - 1; idx >= 0 && !Bn; idx--) {
        let lu = groupMessages[idx];
        let y1 = lu.type === "grouped_tool_use" ? lu.messages : lu.type === "assistant" ? [lu] : [];
        for (const vv of y1) {
          if (vv.message.content.some((Pv) => Pv.type === "tool_use" && inProgressToolUseIDs.has(Pv.id))) {
            let timestamp = Date.parse(vv.timestamp);
            if (Number.isFinite(timestamp)) Bn = timestamp;
            break;
          }
        }
      }
      $[80] = groupMessages;
      $[81] = inProgressToolUseIDs;
      $[82] = Bn;
    } else Bn = $[82];
  }
  let fi;
  let Lt;
  let hi;
  let Mo;
  if (
    $[83] !== agentCount ||
    $[84] !== So ||
    $[85] !== lT ||
    $[86] !== editFileCount ||
    $[87] !== frameCount ||
    $[88] !== bg ||
    $[89] !== groupMessages ||
    $[90] !== Ts ||
    $[91] !== ye ||
    $[92] !== xr ||
    $[93] !== Bn ||
    $[94] !== isActiveGroup ||
    $[95] !== ko ||
    $[96] !== added ||
    $[97] !== removed ||
    $[98] !== list_3 ||
    $[99] !== appStateSlice_2 ||
    $[100] !== de ||
    $[101] !== bt ||
    $[102] !== memoryReadCount ||
    $[103] !== memorySearchCount ||
    $[104] !== memoryWriteCount ||
    $[105] !== message ||
    $[106] !== otherToolCount ||
    $[107] !== read_3 ||
    $[108] !== Me ||
    $[109] !== added_2 ||
    $[110] !== removed_2 ||
    $[111] !== scratchpadWriteCount ||
    $[112] !== search_3 ||
    $[113] !== thoughtForMs
  ) {
    Mo = [];
    let eo = function pushPart(key, verb, body) {
      let isFirst = Mo.length === 0;
      if (!isFirst)
        Mo.push(
          jsxProd_default(
            Text,
            {
              children: ", ",
            },
            `comma-${key}`,
          ),
        );
      Mo.push(
        jsxProd_default_2(
          Text,
          {
            children: [
              isFirst ? verb[0].toUpperCase() + verb.slice(1) : verb,
              body != null &&
                jsxProd_default_2(Fragment, {
                  children: [" ", body],
                }),
            ],
          },
          key,
        ),
      );
    };
    if (xr) {
      let TT = isActiveGroup ? "Thinking" : "Thought";
      let Ti;
      if (isActiveGroup && bg && !ko) {
        let lastThinkingAtMs = 0;
        if ($[118] !== groupMessages) {
          for (let idx = groupMessages.length - 1; idx >= 0; idx--) {
            let yT = groupMessages[idx];
            if (yT?.type === "assistant" && yT.message.content[0]?.type === "thinking") {
              let timestamp = Date.parse(yT.timestamp);
              if (Number.isFinite(timestamp)) lastThinkingAtMs = timestamp;
              break;
            }
          }
          $[118] = groupMessages;
          $[119] = lastThinkingAtMs;
        } else lastThinkingAtMs = $[119];
        let Ne;
        if ($[120] !== lastThinkingAtMs || $[121] !== thoughtForMs) {
          Ne = jsxProd_default(ThinkingElapsed, {
            baseMs: thoughtForMs,
            lastThinkingAtMs,
          });
          $[120] = lastThinkingAtMs;
          $[121] = thoughtForMs;
          $[122] = Ne;
        } else Ne = $[122];
        Ti = Ne;
      } else {
        const max = Math.max(1000, thoughtForMs);
        let children;
        if ($[123] !== max) {
          children = formatDuration(max);
          $[123] = max;
          $[124] = children;
        } else children = $[124];
        let ks;
        if ($[125] !== children) {
          ks = jsxProd_default(Text, {
            bold: true,
            children,
          });
          $[125] = children;
          $[126] = ks;
        } else ks = $[126];
        Ti = ks;
      }
      let Ne;
      if ($[127] !== Ti || $[128] !== TT) {
        Ne = jsxProd_default_2(
          Text,
          {
            children: [TT, " for ", Ti],
          },
          "thought",
        );
        $[127] = Ti;
        $[128] = TT;
        $[129] = Ne;
      } else Ne = $[129];
      Mo.push(Ne);
    }
    let b1 = Mo.length;
    if (editFileCount > 0)
      eo(
        "edit",
        isActiveGroup ? "editing" : "edited",
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: editFileCount,
            }),
            " ",
            editFileCount === 1 ? "file" : "files",
            " ",
            jsxProd_default(DiffStatCounts, {
              added,
              removed,
            }),
          ],
        }),
      );
    if (scratchpadWriteCount > 0)
      eo(
        "scratchpad",
        isActiveGroup ? "making" : "made",
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: scratchpadWriteCount,
            }),
            " scratchpad",
            " ",
            scratchpadWriteCount === 1 ? "edit" : "edits",
            " ",
            jsxProd_default(DiffStatCounts, {
              added: added_2,
              removed: removed_2,
            }),
          ],
        }),
      );
    if (bg && message.commits?.length) {
      let byKind = {
        committed: "committed",
        amended: "amended commit",
        "cherry-picked": "cherry-picked",
      };
      for (const bT of ["committed", "amended", "cherry-picked"]) {
        let shas = message.commits.filter((commit) => commit.kind === bT).map(commitSha);
        if (shas.length)
          eo(
            bT,
            byKind[bT],
            jsxProd_default(Text, {
              bold: true,
              children: shas.join(", "),
            }),
          );
      }
    }
    if (bg && message.pushes?.length) {
      let branches = uniq(message.pushes.map(gitBranch));
      eo(
        "push",
        "pushed to",
        jsxProd_default(Text, {
          bold: true,
          children: branches.join(", "),
        }),
      );
    }
    if (bg && message.branches?.length) {
      let byAction = {
        merged: "merged",
        rebased: "rebased onto",
      };
      for (const branch of message.branches)
        eo(
          `br-${branch.action}-${branch.ref}`,
          byAction[branch.action],
          jsxProd_default(Text, {
            bold: true,
            children: branch.ref,
          }),
        );
    }
    if (bg && message.prs?.length) {
      let C1 = {
        created: "created",
        edited: "edited",
        merged: "merged",
        commented: "commented on",
        closed: "closed",
        reopened: "reopened",
        ready: "marked ready",
        draft: "marked draft",
        "auto-merge-enabled": "enabled auto-merge on",
        "auto-merge-disabled": "disabled auto-merge on",
      };
      for (const pr of message.prs)
        eo(
          `pr-${pr.action}-${pr.number}`,
          C1[pr.action],
          pr.url && isValidPrUrl(pr.url)
            ? jsxProd_default(PrBadge, {
                number: pr.number,
                url: pr.url,
                bold: true,
                kind: isGitLabMergeRequestUrl(pr.url) ? "mr" : undefined,
              })
            : jsxProd_default_2(Text, {
                bold: true,
                children: [pr.url && isGitLabMergeRequestUrl(pr.url) ? "MR !" : "PR #", pr.number],
              }),
        );
    }
    if (frameCount > 0) eo("frame", isActiveGroup ? "publishing" : "published", null);
    if (search_3 > 0)
      eo(
        "search",
        isActiveGroup ? "searching for" : "searched for",
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: search_3,
            }),
            " ",
            search_3 === 1 ? "pattern" : "patterns",
          ],
        }),
      );
    if (read_3 > 0)
      eo(
        "read",
        isActiveGroup ? "reading" : "read",
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: read_3,
            }),
            " ",
            read_3 === 1 ? "file" : "files",
          ],
        }),
      );
    if (list_3 > 0)
      eo(
        "list",
        isActiveGroup ? "listing" : "listed",
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: list_3,
            }),
            " ",
            list_3 === 1 ? "directory" : "directories",
          ],
        }),
      );
    if (bt > 0) {
      let mcpCallLabels = message.mcpCallLabels ?? [];
      let S1 =
        (Me > 0 ? uniq([...mcpCallLabels, MEMORY]) : mcpCallLabels).map(CLAUDEAI_SERVER_PREFIX).join(", ") ||
        "MCP";
      eo(
        "mcp",
        isActiveGroup ? "calling" : "called",
        jsxProd_default_2(Text, {
          children: [
            S1,
            bt > 1 &&
              jsxProd_default_2(Text, {
                children: [
                  " ",
                  jsxProd_default(Text, {
                    bold: true,
                    children: bt,
                  }),
                  " times",
                ],
              }),
          ],
        }),
      );
    }
    if (agentCount > 0) {
      let backgroundToolUseIds = collectBackgroundToolUseIds(message.messages);
      let text = agentCount === 1 && !backgroundToolUseIds ? message.agentDescriptions?.[0] : undefined;
      let xT = text !== undefined ? inflectStatusText(text) : undefined;
      let Ov = isActiveGroup ? "running" : "ran";
      if (xT !== undefined) {
        let Bv = Mo.length === 0;
        if (!Bv) {
          let Ne;
          if ($[130] === MEMO_CACHE_SENTINEL) {
            Ne = jsxProd_default(
              Text,
              {
                children: ", ",
              },
              "comma-agent",
            );
            $[130] = Ne;
          } else Ne = $[130];
          Mo.push(Ne);
        }
        const children = jsxProd_default(Text, {
          bold: true,
          children: lowerFirstUnlessAcronym(isActiveGroup ? xT.running : xT.done, Bv),
        });
        let lo;
        if ($[131] !== children) {
          lo = jsxProd_default(
            Text,
            {
              children,
            },
            "agent",
          );
          $[131] = children;
          $[132] = lo;
        } else lo = $[132];
        Mo.push(lo);
      } else if (text !== undefined)
        eo(
          "agent",
          Ov,
          jsxProd_default_2(Text, {
            children: [
              "agent \xB7 ",
              jsxProd_default(Text, {
                bold: true,
                children: text,
              }),
            ],
          }),
        );
      else
        eo(
          "agent",
          Ov,
          jsxProd_default_2(Text, {
            children: [
              jsxProd_default(Text, {
                bold: true,
                children: agentCount,
              }),
              " ",
              agentCount === 1 ? "agent" : "agents",
            ],
          }),
        );
    }
    if (otherToolCount > 0)
      eo(
        "other",
        isActiveGroup ? "calling" : "called",
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: otherToolCount,
            }),
            " ",
            otherToolCount === 1 ? "tool" : "tools",
          ],
        }),
      );
    if (bg && So > 0)
      eo(
        "bash",
        isActiveGroup ? "running" : "ran",
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: So,
            }),
            " shell",
            " ",
            So === 1 ? "command" : "commands",
          ],
        }),
      );
    if (memoryReadCount > 0)
      eo(
        "mem-read",
        isActiveGroup ? "recalling" : "recalled",
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: memoryReadCount,
            }),
            " ",
            de,
            memoryReadCount === 1 ? "memory" : "memories",
          ],
        }),
      );
    if (memorySearchCount > 0) eo("mem-search", isActiveGroup ? "searching" : "searched", "memories");
    for (const wT of memorySavesQuietApi?.memorySaveParts(
      message.memorySaves ?? [],
      isActiveGroup === true,
    ) ?? [])
      eo(wT.key, wT.verb, wT.object);
    if (memoryWriteCount > 0)
      eo(
        "mem-write",
        isActiveGroup ? "writing" : "wrote",
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: memoryWriteCount,
            }),
            " ",
            memoryWriteCount === 1 ? "memory" : "memories",
          ],
        }),
      );
    let Fv = Ts && !ye && Mo.length === b1;
    if (Fv) eo("script", "working", null);
    let Wv = !appStateSlice_2 && Fv ? lT : undefined;
    Lt = appStateSlice_2 || Wv;
    fi = Wv === undefined ? Bn : 0;
    hi = Mo.length === 0 && (message.hookTotalMs ?? 0) > 0;
    if (hi)
      eo(
        "hooks",
        "ran",
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: message.hookCount,
            }),
            " PreToolUse",
            " ",
            message.hookCount === 1 ? "hook" : "hooks",
            " (",
            formatSecondsShort(message.hookTotalMs ?? 0),
            ")",
          ],
        }),
      );
    $[83] = agentCount;
    $[84] = So;
    $[85] = lT;
    $[86] = editFileCount;
    $[87] = frameCount;
    $[88] = bg;
    $[89] = groupMessages;
    $[90] = Ts;
    $[91] = ye;
    $[92] = xr;
    $[93] = Bn;
    $[94] = isActiveGroup;
    $[95] = ko;
    $[96] = added;
    $[97] = removed;
    $[98] = list_3;
    $[99] = appStateSlice_2;
    $[100] = de;
    $[101] = bt;
    $[102] = memoryReadCount;
    $[103] = memorySearchCount;
    $[104] = memoryWriteCount;
    $[105] = message;
    $[106] = otherToolCount;
    $[107] = read_3;
    $[108] = Me;
    $[109] = added_2;
    $[110] = removed_2;
    $[111] = scratchpadWriteCount;
    $[112] = search_3;
    $[113] = thoughtForMs;
    $[114] = fi;
    $[115] = Lt;
    $[116] = hi;
    $[117] = Mo;
  } else {
    fi = $[114];
    Lt = $[115];
    hi = $[116];
    Mo = $[117];
  }
  let yi = 0;
  let Fn = 0;
  let bi = 0;
  let vr = 0;
  let CT;
  let ST;
  let flattened = message.messages.flatMap(countToolUses);
  for (const Ys of flattened) {
    let found = Ys.message.content.find(isToolResultBlock);
    if (found?.type !== "tool_result" || (Gs !== undefined && Xh.has(found.tool_use_id))) {
      continue;
    }
    if (isAutoModeUnavailableKind(Ys.toolDenialKind, Ys.toolDenialMonitorBlocked)) bi++;
    else if (Ys.toolDenialKind === "automode-blocked") {
      yi++;
      CT = typeof found.content === "string" ? found.content : undefined;
    } else if (Ys.toolDenialMonitorBlocked === true) Fn++;
    else if (
      Ys.toolDenialKind === "permission-rule" &&
      found.is_error === true &&
      Ys.toolDenialAfterRun !== true &&
      Ys.toolDenialFromHost !== true &&
      !qs.has(found.tool_use_id)
    ) {
      vr++;
      ST = typeof found.content === "string" ? found.content : undefined;
    }
  }
  let Wn = yi + Fn;
  let pu =
    Wn === 1 && CT !== undefined
      ? cleanTaskDescription(extractClassifierDenialReason(stripAnsiPerLine(CT)) ?? undefined)
      : undefined;
  let _T = vr === 1 && ST !== undefined ? stripAnsiPerLine(ST) : undefined;
  let ki =
    _T === undefined
      ? undefined
      : (unwrapToolUseErrorText(_T) ?? _T)
          .trim()
          .replace(PERMISSION_DENIED_FOR_PATTERN, "")
          .replace(PRE_TOOL_HOOK_ERROR_PREFIX_RE, "$1");
  let cu =
    ki === undefined ||
    NON_INTERACTIVE_DENIAL_PREFIXES.some((P1) => ki.startsWith(P1)) ||
    isModelUnavailableDenial(ki)
      ? undefined
      : cleanTaskDescription(
          ki.startsWith(SAFETY_CHECK_DENIAL_PREFIX)
            ? SAFETY_CHECK_DENIAL_PREFIX
            : firstLineOf(getFirstLine(ki), DENIAL_STOP_AND_EXPLAIN_GUIDANCE),
        );
  const marginTop = k ? 1 : 0;
  let lo;
  if ($[133] !== anyError || $[134] !== isActiveGroup) {
    lo = isActiveGroup
      ? jsxProd_default(ToolUseLoader, {
          shouldAnimate: true,
          isUnresolved: true,
          isError: anyError || false,
        })
      : jsxProd_default(Box, {
          minWidth: 2,
        });
    $[133] = anyError;
    $[134] = isActiveGroup;
    $[135] = lo;
  } else lo = $[135];
  const dimColor = !isActiveGroup;
  let Sr;
  if ($[136] !== Lt || $[137] !== Mo) {
    Sr = Lt
      ? jsxProd_default(
          Text,
          {
            children: capitalize(Lt),
          },
          "task-summary",
        )
      : Mo;
    $[136] = Lt;
    $[137] = Mo;
    $[138] = Sr;
  } else Sr = $[138];
  let gu;
  if ($[139] !== Lt || $[140] !== isActiveGroup || $[141] !== message || $[142] !== Mo) {
    gu =
      !Lt &&
      TeamMemCountParts({
        message,
        isActiveGroup,
        hasPrecedingParts: Mo.length > 0,
      });
    $[139] = Lt;
    $[140] = isActiveGroup;
    $[141] = message;
    $[142] = Mo;
    $[143] = gu;
  } else gu = $[143];
  let fu;
  if ($[144] !== fi || $[145] !== ko || $[146] !== shouldAnimate) {
    fu =
      fi > 0 &&
      !ko &&
      jsxProd_default(
        ElapsedSinceAnchor,
        {
          anchorMs: fi,
          shouldAnimate,
        },
        "tool-elapsed",
      );
    $[144] = fi;
    $[145] = ko;
    $[146] = shouldAnimate;
    $[147] = fu;
  } else fu = $[147];
  let hu;
  if ($[148] !== Lt || $[149] !== isActiveGroup) {
    hu =
      isActiveGroup &&
      !Lt &&
      jsxProd_default(
        Text,
        {
          children: "\u2026",
        },
        "ellipsis",
      );
    $[148] = Lt;
    $[149] = isActiveGroup;
    $[150] = hu;
  } else hu = $[150];
  let Hv;
  if ($[151] === MEMO_CACHE_SENTINEL) {
    Hv = jsxProd_default(CtrlOToExpand, {});
    $[151] = Hv;
  } else Hv = $[151];
  let Tu;
  if ($[152] !== dimColor || $[153] !== Sr || $[154] !== gu || $[155] !== fu || $[156] !== hu) {
    Tu = jsxProd_default_2(Text, {
      dimColor,
      children: [Sr, gu, fu, hu, " ", Hv],
    });
    $[152] = dimColor;
    $[153] = Sr;
    $[154] = gu;
    $[155] = fu;
    $[156] = hu;
    $[157] = Tu;
  } else Tu = $[157];
  let Mu;
  if ($[158] !== lo || $[159] !== Tu) {
    Mu = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [lo, Tu],
    });
    $[158] = lo;
    $[159] = Tu;
    $[160] = Mu;
  } else Mu = $[160];
  let bu;
  if ($[161] !== Jh) {
    bu = Jh && jsxProd_default(RejectedToolUseMessage, {});
    $[161] = Jh;
    $[162] = bu;
  } else bu = $[162];
  let Ru;
  if (
    $[163] !== pu ||
    $[164] !== yi ||
    $[165] !== Fn ||
    $[166] !== Wn ||
    $[167] !== nT ||
    $[168] !== ko ||
    $[169] !== toolUseIds
  ) {
    Ru =
      Wn > 0 &&
      !ko &&
      jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            jsxProd_default(Text, {
              dimColor: Fn === 0,
              wrap: "wrap",
              children: jsxProd_default_2(Byline, {
                children: [
                  jsxProd_default(Text, {
                    color: Fn > 0 ? "error" : undefined,
                    children:
                      toolUseIds.length === 1
                        ? "Blocked by auto mode"
                        : `${Wn} ${plural(Wn, "action")} blocked by auto mode`,
                  }),
                  yi > 0 &&
                    nT &&
                    !isRemoteSessionAvailable() &&
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: "/permissions to review",
                    }),
                ],
              }),
            }),
            pu !== undefined &&
              jsxProd_default(DenialReasonQuote, {
                label: AUTO_MODE_PREFIX,
                reason: pu,
              }),
          ],
        }),
      });
    $[163] = pu;
    $[164] = yi;
    $[165] = Fn;
    $[166] = Wn;
    $[167] = nT;
    $[168] = ko;
    $[169] = toolUseIds;
    $[170] = Ru;
  } else Ru = $[170];
  let ku;
  if ($[171] !== ko || $[172] !== cu || $[173] !== vr || $[174] !== toolUseIds) {
    ku =
      vr > 0 &&
      !ko &&
      jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              wrap: "wrap",
              children: jsxProd_default_2(Byline, {
                children: [
                  jsxProd_default(Text, {
                    children: toolUseIds.length === 1 ? "Not run" : `${vr} ${plural(vr, "action")} not run`,
                  }),
                  jsxProd_default(Text, {
                    children: "permission denied",
                  }),
                ],
              }),
            }),
            cu !== undefined &&
              jsxProd_default(DenialReasonQuote, {
                label: "Reason: ",
                reason: cu,
              }),
          ],
        }),
      });
    $[171] = ko;
    $[172] = cu;
    $[173] = vr;
    $[174] = toolUseIds;
    $[175] = ku;
  } else ku = $[175];
  let xu;
  if ($[176] !== bi || $[177] !== ko || $[178] !== toolUseIds) {
    xu =
      bi > 0 &&
      !ko &&
      jsxProd_default(MessageResponse, {
        children: jsxProd_default(Text, {
          dimColor: true,
          wrap: "wrap",
          children: jsxProd_default(NotRunLine, {
            callCount: toolUseIds.length === 1 ? undefined : bi,
          }),
        }),
      });
    $[176] = bi;
    $[177] = ko;
    $[178] = toolUseIds;
    $[179] = xu;
  } else xu = $[179];
  let wu;
  if (
    $[180] !== columns ||
    $[181] !== ii ||
    $[182] !== isActiveGroup ||
    $[183] !== is ||
    $[184] !== pi ||
    $[185] !== su
  ) {
    wu =
      isActiveGroup &&
      is === null &&
      ii !== undefined &&
      jsxProd_default_2(Box, {
        flexDirection: "row",
        children: [
          jsxProd_default(Box, {
            width: 5,
            flexShrink: 0,
            children: jsxProd_default(Text, {
              "aria-hidden": true,
              dimColor: true,
              children: "  \u23BF  ",
            }),
          }),
          jsxProd_default(Box, {
            flexDirection: "column",
            flexGrow: 1,
            children: su
              ? jsxProd_default(MarkdownText_2, {
                  dimColor: true,
                  italic: true,
                  children: truncateToLines(ii, columns - HINT_COLUMN_RESERVE, HINT_MAX_LINES),
                })
              : ii
                  .split(
                    `
`,
                  )
                  .map((line, i, arr) =>
                    jsxProd_default_2(
                      Text,
                      {
                        dimColor: true,
                        children: [line, i === arr.length - 1 && pi],
                      },
                      `hint-${i}`,
                    ),
                  ),
          }),
        ],
      });
    $[180] = columns;
    $[181] = ii;
    $[182] = isActiveGroup;
    $[183] = is;
    $[184] = pi;
    $[185] = su;
    $[186] = wu;
  } else wu = $[186];
  let Cu;
  if ($[187] !== hi || $[188] !== message) {
    Cu =
      !hi &&
      message.hookTotalMs !== undefined &&
      message.hookTotalMs > 0 &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          jsxProd_default(Text, {
            "aria-hidden": true,
            children: "  \u23BF  ",
          }),
          "Ran ",
          message.hookCount,
          " PreToolUse",
          " ",
          message.hookCount === 1 ? "hook" : "hooks",
          " (",
          formatSecondsShort(message.hookTotalMs),
          ")",
        ],
      });
    $[187] = hi;
    $[188] = message;
    $[189] = Cu;
  } else Cu = $[189];
  let Gv;
  if (
    $[190] !== is ||
    $[191] !== marginTop ||
    $[192] !== Mu ||
    $[193] !== bu ||
    $[194] !== Ru ||
    $[195] !== ku ||
    $[196] !== xu ||
    $[197] !== wu ||
    $[198] !== Cu ||
    $[199] !== rT
  ) {
    Gv = jsxProd_default_2(Box, {
      ref: rT,
      flexDirection: "column",
      marginTop,
      children: [Mu, bu, Ru, ku, xu, cT, is, wu, Cu],
    });
    $[190] = is;
    $[191] = marginTop;
    $[192] = Mu;
    $[193] = bu;
    $[194] = Ru;
    $[195] = ku;
    $[196] = xu;
    $[197] = wu;
    $[198] = Cu;
    $[199] = rT;
    $[200] = Gv;
  } else Gv = $[200];
  return Gv;
}
export { CollapsedReadSearchContent, selectViewingAgentTaskId_2 };
