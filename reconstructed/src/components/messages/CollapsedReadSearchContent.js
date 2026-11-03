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
import { basename, basename as basename_2, basename as basename_3 } from "path";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { x6 } from "../../plugins/functionHooks/ui/index.js";
import { actionKeysNamespace } from "../pluginUi/render/actionKeys.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useHost } from "../../context/session.js";
import { rs } from "../../state/AppState.js";
import {
  I0,
  guardPrimitiveToolResult,
  O0,
  B0,
  F0,
  j0,
  W0,
  H0,
  G0,
  renderHookDurationLine,
  K0,
  V0,
} from "./toolResultRendering.js";
import { useFrameRegistry, parseRenderModeValue, useIsFullscreen } from "../../ink/renderModeContext.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { findToolByNameWithFallback } from "../../utils/collapseReadSearch.js";
import { displayOnlyMcpTool } from "../../tools/MCPTool/displayOnlyTool.js";
import { safeParseToolInput, filterToolProgressMessages, findToolByName } from "../../Tool.js";
import { hwt } from "../../utils/toolUseDisplay.js";
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
  NC,
  ElapsedSinceAnchor,
  truncateToLines,
} from "./GroupedToolUseContent.js";
import { Se, y } from "../../../vendor/react/cjs/react.production.js";
import { ZXe } from "../../bridge/inboundMessages.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { ife } from "../messageActions.js";
import { kyn } from "../../services/accountMemory/memoryContext.js";
import {
  checkHasTeamMemOps,
  isAutoModeBlockedResult,
  useThrottledValue,
  useLingeringValue,
  isModelUnavailableDenial,
  TeamMemCountParts,
  DenialReasonQuote,
} from "./teamMemCollapsed.js";
import { _O, REPL_TOOL_NAME } from "../../tools/REPLTool/constants.js";
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
import { Ige, toolRejectionKind } from "../../entrypoints/sdk/coreSchemas.js";
import { MessageResponse } from "../MessageResponse.js";
import { Byline } from "../design-system/Byline.js";
import { CtrlOToExpand } from "../CtrlOToExpand.js";
import { UserToolErrorMessage, Pa, NotRunLine } from "./UserToolResultMessage/UserToolErrorMessage.js";
import { getDisplayPath } from "../../utils/file.js";
import { a5 } from "../FreezeWhenOffscreen.js";
import { useHasAutoModeDenialFor } from "../Spinner/spinnerStatus.js";
import { vc } from "../../utils/taskDescription.js";
import { TASK_NOTIFICATION } from "../../constants/xml.js";
import { renderToolUseErrorMessage_5 } from "./UserTaskNotificationMessage.js";
import { AssistantThinkingMessage } from "./AssistantThinkingMessage.js";
import { RejectedToolUseMessage } from "./UserToolResultMessage/RejectedToolUseMessage.js";
import { formatSecondsShort, formatDuration } from "../../utils/format.js";
import { Ansi } from "../../ink/components/AnsiText.js";
import { DiffStatCounts, PrBadge } from "../PrBadge.js";
import { uniq } from "../../utils/collections.js";
import { isValidPrUrl } from "../../tools/shared/gitOperationTracking.js";
import { vhe } from "../../utils/detectRepository.js";
import { MEMORY } from "../../services/mcp/firstPartyServerIds.js";
import { CLAUDEAI_SERVER_PREFIX } from "../../services/mcp/normalization.js";
import { inflectStatusText } from "../../utils/verbInflection.js";
import { qa } from "../../utils/stripAnsi.js";
import { Dhn } from "../../utils/toolUseErrorText.js";
import { PRE_TOOL_HOOK_ERROR_PREFIX_RE } from "../../utils/hooks.js";
import { firstLineOf, getFirstLine, capitalize, plural } from "../../utils/stringUtils.js";
import { wt } from "../../remote/remoteMode.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";

//@ chunk-ah34pb7m.js:157480-157568 placement = countToolUses (0.815)
function countToolUses(msg) {
  return msg.type === "grouped_tool_use" ? msg.results : msg.type === "user" ? [msg] : [];
}
//@ chunk-ah34pb7m.js:157568-157615 placement
function Q0(W1) {
  return W1.type === "tool_result";
}
//@ chunk-ah34pb7m.js:157615-157658 placement = _temp2 (1)
function selectViewingAgentTaskId_2(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-ah34pb7m.js:157658-157670 placement
var gn = null;
//@ chunk-ah34pb7m.js:157670-157681 placement
var _x = 700;
//@ chunk-ah34pb7m.js:157681-157704 placement
var vx = 3000,
  Px = 5,
  Ux = 10;
/**
 * 折叠的读取/搜索工具组（进行中、出错状态）。
 */
//@ chunk-ah34pb7m.js:157704-159047 placement
function CollapsedReadSearchGroup(m) {
  let $ = w(28),
    { content: content, inProgressToolUseIDs: inProgressToolUseIDs, lookups: lookups } = m,
    h;
  if ($[0] !== content.id || $[1] !== inProgressToolUseIDs)
    ((h = inProgressToolUseIDs.has(content.id)),
      ($[0] = content.id),
      ($[1] = inProgressToolUseIDs),
      ($[2] = h));
  else h = $[2];
  let M = h,
    T;
  if ($[3] !== content.id || $[4] !== lookups.erroredToolUseIDs)
    ((T = lookups.erroredToolUseIDs.has(content.id)),
      ($[3] = content.id),
      ($[4] = lookups.erroredToolUseIDs),
      ($[5] = T));
  else T = $[5];
  let x = T,
    k,
    b;
  if ($[6] !== content.id || $[7] !== lookups.toolResultByToolUseID)
    ((k = lookups.toolResultByToolUseID.get(content.id)),
      (b = x6.isInterruptedCall(k)),
      ($[6] = content.id),
      ($[7] = lookups.toolResultByToolUseID),
      ($[8] = k),
      ($[9] = b));
  else ((k = $[8]), (b = $[9]));
  let E = b,
    B = k?.type === "user" ? k.toolUseResult : void 0,
    L;
  if (
    $[10] !== content.id ||
    $[11] !== content.input ||
    $[12] !== content.name ||
    $[13] !== x ||
    $[14] !== E ||
    $[15] !== B ||
    $[16] !== M
  )
    ((L = () => ({
      requestId: content.id,
      props: {
        tool_use_id: content.id,
        tool: content.name,
        input: content.input,
        isRunning: M,
        isErrored: x,
        isInterrupted: E,
        isExpanded: !0,
        output: B,
      },
    })),
      ($[10] = content.id),
      ($[11] = content.input),
      ($[12] = content.name),
      ($[13] = x),
      ($[14] = E),
      ($[15] = B),
      ($[16] = M),
      ($[17] = L));
  else L = $[17];
  let N;
  if ($[18] !== content || $[19] !== x || $[20] !== E || $[21] !== B || $[22] !== M)
    ((N = [content, M, x, E, B]),
      ($[18] = content),
      ($[19] = x),
      ($[20] = E),
      ($[21] = B),
      ($[22] = M),
      ($[23] = N));
  else N = $[23];
  let useRenderInput = actionKeysNamespace.useRenderInput("ToolUse", L, N),
    U;
  if ($[24] !== content || $[25] !== B || $[26] !== m)
    ((U = (K) =>
      e(VerboseToolUse, {
        ...m,
        content: K.props.input === content.input ? content : { ...content, input: K.props.input },
        toolLabel: K.props.tool === content.name ? void 0 : K.props.tool,
        outputOverride: K.props.output === B ? void 0 : { value: K.props.output },
      })),
      ($[24] = content),
      ($[25] = B),
      ($[26] = m),
      ($[27] = U));
  else U = $[27];
  return actionKeysNamespace.useRenderHook(useRenderInput, U);
}
//@ chunk-ah34pb7m.js:159047-162030 fingerprint = VerboseToolUse (0.513)
function VerboseToolUse(t0) {
  let $ = w(54),
    {
      content: content,
      tools: tools,
      lookups: lookups,
      inProgressToolUseIDs: inProgressToolUseIDs,
      shouldAnimate: shouldAnimate,
      theme: theme,
      outputOverride: outputOverride,
      toolLabel: toolLabel,
      quietWords: quietWords,
    } = t0,
    bg = useHost(),
    E = rs(I0),
    B = useFrameRegistry(),
    N,
    W,
    U,
    K,
    V,
    Y,
    X,
    z,
    ee,
    le,
    ge,
    ae;
  if (
    $[0] !== E ||
    $[1] !== content.id ||
    $[2] !== content.input ||
    $[3] !== content.name ||
    $[4] !== bg ||
    $[5] !== inProgressToolUseIDs ||
    $[6] !== lookups ||
    $[7] !== outputOverride ||
    $[8] !== quietWords ||
    $[9] !== B ||
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
      if ($[26] !== content.id || $[27] !== lookups.resolvedToolUseIDs)
        ((te = lookups.resolvedToolUseIDs.has(content.id)),
          ($[26] = content.id),
          ($[27] = lookups.resolvedToolUseIDs),
          ($[28] = te));
      else te = $[28];
      U = te;
      let de;
      if ($[29] !== content.id || $[30] !== lookups.erroredToolUseIDs)
        ((de = lookups.erroredToolUseIDs.has(content.id)),
          ($[29] = content.id),
          ($[30] = lookups.erroredToolUseIDs),
          ($[31] = de));
      else de = $[31];
      let ue = de;
      W = ue && quietWords === void 0;
      let J;
      if ($[32] !== content.id || $[33] !== inProgressToolUseIDs)
        ((J = inProgressToolUseIDs.has(content.id)),
          ($[32] = content.id),
          ($[33] = inProgressToolUseIDs),
          ($[34] = J));
      else J = $[34];
      let se = J;
      V = lookups.toolResultByToolUseID.get(content.id);
      let ye =
        outputOverride !== void 0 ? outputOverride.value : V?.type === "user" ? V.toolUseResult : void 0;
      let Te = parseRenderModeValue(B, ae.outputSchema, ye);
      let Me = Te?.success ? Te.data : void 0;
      let be = Me;
      let ve = safeParseToolInput(ae, content.input);
      let Ue = ve.success ? ve.data : void 0;
      let we = hwt(ae, Ue);
      let $e = toolLabel ?? ae.userFacingName(Ue, { activeAgents: E });
      let De;
      if ($[35] !== content.input)
        ((De = describeUnparsedInput(content.input)), ($[35] = content.input), ($[36] = De));
      else De = $[36];
      let xe = De;
      let Pe =
        xe !== null
          ? xe
          : Ue
            ? renderToolUseMessageFor(ae, Ue, {
                theme: theme,
                verbose: !0,
                isTranscriptMode: !0,
                activeAgents: E,
              })
            : null;
      K = lookups.progressMessagesByToolUseID.get(content.id) ?? [];
      let co =
        U && !ue && be !== void 0
          ? mcpRenderOverrideFor(ae, "renderToolResultMessage")?.(be, filterToolProgressMessages(K), {
              verbose: !0,
              tools: tools,
              theme: theme,
              isTranscriptMode: !0,
              input: content.input,
              activeAgents: E,
            })
          : void 0;
      let qe = $e !== "";
      if (!qe && co == null && !(U && ue && V !== void 0)) {
        ge = null;
        break pe;
      }
      N = Box;
      Y = content.id;
      X = "column";
      z = qe ? 1 : 0;
      ee =
        qe &&
        r(Box, {
          flexDirection: "row",
          children: [
            e(ToolUseLoader, { shouldAnimate: shouldAnimate && se, isUnresolved: !U, isError: W }),
            r(Text, {
              children: [
                e(Text, { bold: !0, children: $e }),
                Pe && r(Text, { children: ["(", Pe, ")"] }),
                we !== void 0 && r(Text, { dimColor: !0, children: [" \xB7 on ", we] }),
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
      le = co != null && e(Box, { children: guardPrimitiveToolResult(bg, co, ae) });
    }
    (($[0] = E),
      ($[1] = content.id),
      ($[2] = content.input),
      ($[3] = content.name),
      ($[4] = bg),
      ($[5] = inProgressToolUseIDs),
      ($[6] = lookups),
      ($[7] = outputOverride),
      ($[8] = quietWords),
      ($[9] = B),
      ($[10] = shouldAnimate),
      ($[11] = theme),
      ($[12] = toolLabel),
      ($[13] = tools),
      ($[14] = N),
      ($[15] = W),
      ($[16] = U),
      ($[17] = K),
      ($[18] = V),
      ($[19] = Y),
      ($[20] = X),
      ($[21] = z),
      ($[22] = ee),
      ($[23] = le),
      ($[24] = ge),
      ($[25] = ae));
  } else
    ((N = $[14]),
      (W = $[15]),
      (U = $[16]),
      (K = $[17]),
      (V = $[18]),
      (Y = $[19]),
      (X = $[20]),
      (z = $[21]),
      (ee = $[22]),
      (le = $[23]),
      (ge = $[24]),
      (ae = $[25]));
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
  )
    ((te =
      U &&
      W &&
      e(GroupedToolUseRow, {
        toolUseID: content.id,
        input: content.input,
        resultMsg: V,
        tool: ae,
        tools: tools,
        progressMessagesForMessage: K,
      })),
      ($[37] = content.id),
      ($[38] = content.input),
      ($[39] = W),
      ($[40] = U),
      ($[41] = K),
      ($[42] = V),
      ($[43] = ae),
      ($[44] = tools),
      ($[45] = te));
  else te = $[45];
  let de;
  if (
    $[46] !== N ||
    $[47] !== Y ||
    $[48] !== X ||
    $[49] !== z ||
    $[50] !== ee ||
    $[51] !== le ||
    $[52] !== te
  )
    ((de = r(N, { flexDirection: X, marginTop: z, children: [ee, le, !1, te] }, Y)),
      ($[46] = N),
      ($[47] = Y),
      ($[48] = X),
      ($[49] = z),
      ($[50] = ee),
      ($[51] = le),
      ($[52] = te),
      ($[53] = de));
  else de = $[53];
  return de;
}
/**
 * 折叠读/搜索组：统计 Read/Grep/Glob 等调用次数显示一行摘要（进行中显示当前目标），verbose 或 transcript 下逐个渲染 VerboseToolUse；含权限规则命中/本地错误等标记。
 */
//@ chunk-ah34pb7m.js:166083-185246 fingerprint = CollapsedReadSearchContent (0.58)
function CollapsedReadSearchContent(m) {
  let $ = w(201),
    {
      message: message,
      inProgressToolUseIDs: inProgressToolUseIDs,
      shouldAnimate: shouldAnimate,
      verbose: verbose,
      tools: tools,
      lookups: lookups,
      isActiveGroup: isActiveGroup,
      addMargin: addMargin,
    } = m,
    k = addMargin === void 0 ? !0 : addMargin,
    bg = useIsFullscreen();
  useHost();
  let E = rs(O0),
    B = Se(ZXe) !== null && E === !0,
    {
      searchCount: rawSearchCount,
      readCount: rawReadCount,
      listCount: rawListCount,
      memorySearchCount: memorySearchCount,
      memoryReadCount: memoryReadCount,
      memoryWriteCount: memoryWriteCount,
      messages: groupMessages,
    } = message,
    [X] = useTheme(),
    { columns: columns } = useTerminalSize(),
    toolUseIds = ife(message),
    le = gn?.quietMemorySaves(message.memorySaves ?? []),
    anyError = toolUseIds.some((id) => lookups.erroredToolUseIDs.has(id) && le?.has(id) !== !0),
    pe = message.accountMemoryReadKeys?.length ?? 0,
    te = message.accountMemorySearchCount ?? 0,
    de = kyn() || pe > 0 || te > 0 ? "local " : "",
    ue =
      memorySearchCount > 0 ||
      memoryReadCount > 0 ||
      memoryWriteCount > 0 ||
      pe > 0 ||
      te > 0 ||
      (message.memorySaves?.length ?? 0) > 0,
    se;
  if ($[0] !== message) ((se = checkHasTeamMemOps(message)), ($[0] = message), ($[1] = se));
  else se = $[1];
  let ye = se,
    Te;
  if ($[2] !== isActiveGroup || $[3] !== message.memorySaves)
    ((Te = gn?.memorySavesToldAsCalls(message.memorySaves ?? [], isActiveGroup === !0) ?? 0),
      ($[2] = isActiveGroup),
      ($[3] = message.memorySaves),
      ($[4] = Te));
  else Te = $[4];
  let Me = Te;
  const be = rawReadCount ?? 0,
    ve = rawSearchCount ?? 0,
    Ue = rawListCount ?? 0,
    we = message.mcpCallCount ?? 0,
    $e = message.bashCount ?? 0;
  let De;
  if ($[5] !== be || $[6] !== ve || $[7] !== Ue || $[8] !== we || $[9] !== $e)
    ((De = { read: be, search: ve, list: Ue, mcp: we, bash: $e }),
      ($[5] = be),
      ($[6] = ve),
      ($[7] = Ue),
      ($[8] = we),
      ($[9] = $e),
      ($[10] = De));
  else De = $[10];
  let xe = De,
    [Pe, co] = y(xe);
  const max = Math.max(Pe.read, xe.read),
    max_2 = Math.max(Pe.search, xe.search),
    max_3 = Math.max(Pe.list, xe.list),
    max_4 = Math.max(Pe.mcp, xe.mcp),
    max_5 = Math.max(Pe.bash, xe.bash);
  let Xe;
  if ($[11] !== max || $[12] !== max_2 || $[13] !== max_3 || $[14] !== max_4 || $[15] !== max_5)
    ((Xe = { read: max, search: max_2, list: max_3, mcp: max_4, bash: max_5 }),
      ($[11] = max),
      ($[12] = max_2),
      ($[13] = max_3),
      ($[14] = max_4),
      ($[15] = max_5),
      ($[16] = Xe));
  else Xe = $[16];
  let Ge = Xe;
  if (
    Ge.read !== Pe.read ||
    Ge.search !== Pe.search ||
    Ge.list !== Pe.list ||
    Ge.mcp !== Pe.mcp ||
    Ge.bash !== Pe.bash
  )
    co(Ge);
  let ao = message.otherToolCount ?? 0,
    uo = message.agentCount ?? 0,
    Eo = message.editFileCount ?? 0,
    It = message.frameCount ?? 0,
    Ao = message.linesAdded ?? 0,
    ht = message.linesRemoved ?? 0,
    Go = message.scratchpadWriteCount ?? 0,
    Tt = message.scratchpadLinesAdded ?? 0,
    ss = message.scratchpadLinesRemoved ?? 0,
    { read: read, search: search, list: list } = Ge,
    bt = Ge.mcp + Me,
    Do = message.gitOpBashCount ?? 0,
    So = bg ? Math.max(0, Ge.bash - Do) : 0,
    Qe = message.thoughtForMs ?? 0,
    xr = Qe > 0 || message.latestThinkingSummary !== void 0,
    Je =
      search > 0 ||
      read > 0 ||
      list > 0 ||
      bt > 0 ||
      So > 0 ||
      Do > 0 ||
      ao > 0 ||
      uo > 0 ||
      Eo > 0 ||
      Go > 0 ||
      It > 0 ||
      (message.hookTotalMs ?? 0) > 0 ||
      xr,
    No;
  if ($[17] !== isActiveGroup || $[18] !== lookups.toolResultByToolUseID || $[19] !== message || $[20] !== B)
    ((No =
      isActiveGroup === !0 && !B
        ? toolCallOf(message)
            .filter((Rt) => _O(Rt.name) && !lookups.toolResultByToolUseID.has(Rt.id))
            .map(B0)
        : []),
      ($[17] = isActiveGroup),
      ($[18] = lookups.toolResultByToolUseID),
      ($[19] = message),
      ($[20] = B),
      ($[21] = No));
  else No = $[21];
  let Dt = No,
    Lo;
  if (
    $[22] !== inProgressToolUseIDs ||
    $[23] !== isActiveGroup ||
    $[24] !== message ||
    $[25] !== Dt.length ||
    $[26] !== B
  )
    ((Lo =
      Dt.length > 0 ||
      (isActiveGroup === !0 &&
        !B &&
        toolCallOf(message).some((Nt) => _O(Nt.name) && inProgressToolUseIDs.has(Nt.id)))),
      ($[22] = inProgressToolUseIDs),
      ($[23] = isActiveGroup),
      ($[24] = message),
      ($[25] = Dt.length),
      ($[26] = B),
      ($[27] = Lo));
  else Lo = $[27];
  let Ts = Lo,
    filtered = toolCallOf(message).filter(F0),
    ns = filtered.length > 0 ? findToolByName(tools, REPL_TOOL_NAME) : void 0,
    Gs = ns && mcpRenderOverrideFor(ns, "renderToolUseErrorMessage"),
    kt;
  if ($[28] === MEMO_CACHE_SENTINEL) ((kt = []), ($[28] = kt));
  else kt = $[28];
  let Ms = kt;
  Ms.length > 0 ? findToolByName(tools, POLL) : void 0;
  let Xm;
  if ($[29] === MEMO_CACHE_SENTINEL) ((Xm = new Set([])), ($[29] = Xm));
  else Xm = $[29];
  let as = Xm,
    Qh = Gs !== void 0 && as.size > 0,
    ni;
  if ($[30] === MEMO_CACHE_SENTINEL) ((ni = new Set(Ms.map(j0))), ($[30] = ni));
  else ni = $[30];
  let qs = ni,
    Xh = new Set(filtered.map(W0)),
    Zm = !1 && !Qh && !0,
    Zh = !1 ? filtered.filter((cv) => !as.has(cv.id)) : filtered,
    Jh =
      toolUseIds.some((gv) => !qs.has(gv) && x6.isInterruptedCall(lookups.toolResultByToolUseID.get(gv))) ||
      Zm,
    eT = function eT(Jm, eu) {
      let Yo = lookups.toolResultByToolUseID.get(Jm);
      if (!Gs || Yo?.type !== "user" || !lookups.erroredToolUseIDs.has(Jm) || x6.isInterruptedCall(Yo)) {
        return null;
      }
      let found = Yo.message.content.find((fv) => fv.type === "tool_result" && fv.tool_use_id === Jm);
      if (
        found?.type !== "tool_result" ||
        (isToolDenial(found.content, Yo, Ige) &&
          typeof found.content === "string" &&
          (found.content.startsWith(REJECT_MESSAGE) ||
            found.content.startsWith(REJECT_MESSAGE_WITH_REASON_PREFIX)))
      ) {
        return null;
      }
      if (Yo.toolDenialKind === "permission-rule" && !eu) {
        return e(MessageResponse, {
          children: r(Text, {
            dimColor: !0,
            wrap: "wrap",
            children: [
              r(Byline, {
                children: [e(Text, { children: "Not run" }), e(Text, { children: "permission denied" })],
              }),
              " ",
              e(CtrlOToExpand, {}),
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
        return e(UserToolErrorMessage, {
          param: found,
          tool: ns,
          tools: tools,
          input: filtered.find((p1) => p1.id === Jm)?.input,
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
          tools: tools,
          verbose: eu,
          output: Yo.toolUseResult,
        }) ?? null
      );
    },
    { readFilePaths: readFilePaths, searchArgs: searchArgs, latestDisplayHint: latestDisplayHint } = message;
  if (latestDisplayHint === void 0) {
    let ai;
    if ($[31] !== searchArgs) ((ai = searchArgs?.at(-1)), ($[31] = searchArgs), ($[32] = ai));
    else ai = $[32];
    let hv = ai;
    let sT = hv !== void 0 ? `"${hv}"` : void 0;
    let Ks;
    if ($[33] !== sT || $[34] !== readFilePaths) {
      let lastRead = readFilePaths?.at(-1);
      Ks = lastRead !== void 0 ? getDisplayPath(lastRead) : sT;
      (($[33] = sT), ($[34] = readFilePaths), ($[35] = Ks));
    } else Ks = $[35];
    latestDisplayHint = Ks;
  }
  rs(H0);
  let [rT, nT] = a5(useHasAutoModeDenialFor(toolUseIds));
  if ((rs(G0), isActiveGroup)) {
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
          let { progress: progress, total: total, progressMessage: progressMessage } = latest;
          let tu = vc(progressMessage);
          if (progress !== void 0 && total !== void 0 && total > 0) {
            let rounded = Math.round(Math.min(1, Math.max(0, progress / total)) * 100);
            latestDisplayHint = tu ? `${tu} (${rounded}%)` : `${rounded}%`;
          } else if (tu) latestDisplayHint = tu;
          else if (progress !== void 0) latestDisplayHint = `Processing\u2026 ${progress}`;
        }
      }
      (($[36] = inProgressToolUseIDs),
        ($[37] = $[38]),
        ($[39] = lookups.progressMessagesByToolUseID),
        ($[40] = toolUseIds),
        ($[41] = latestDisplayHint));
    } else latestDisplayHint = $[41];
  }
  let g1 = useThrottledValue(latestDisplayHint, _x),
    lT,
    ko = isActiveGroup && message.isLiveBriefTurn === !0,
    displayedHint = useLingeringValue(isActiveGroup && !ko ? message.latestThinkingSummary : void 0, vx),
    su = isActiveGroup && displayedHint !== void 0,
    ii = su ? displayedHint : g1,
    parse = Date.parse(message.timestamp),
    ai;
  if ($[42] !== parse || $[43] !== isActiveGroup)
    ((ai = (ru) =>
      isActiveGroup && !ru.viewingAgentTaskId && ru.taskSummary !== null && !(ru.taskSummary.at < parse)
        ? ru.taskSummary.text
        : null),
      ($[42] = parse),
      ($[43] = isActiveGroup),
      ($[44] = ai));
  else ai = $[44];
  let nu = rs(ai);
  if (verbose) {
    let mT = [];
    for (const msg of groupMessages) {
      if (msg.type === "assistant") mT.push(msg);
      else if (msg.type === "grouped_tool_use") mT.push(...msg.messages);
    }
    new Set();
    let Ks;
    if ($[45] !== lookups)
      ((Ks = (msg_0) =>
        lookups.erroredToolUseIDs.has(msg_0.id) &&
        lookups.toolResultByToolUseID.get(msg_0.id)?.type === "user"),
        ($[45] = lookups),
        ($[46] = Ks));
    else Ks = $[46];
    let filtered = Zh.filter(Ks);
    let li;
    if ($[47] !== groupMessages || $[48] !== verbose) {
      let Ne;
      if ($[50] !== verbose)
        ((Ne = (Ln) => {
          let uT = Ln.type === "user" ? Ln.message.content[0] : null;
          if (uT?.type !== "text" || !uT.text.includes(`<${TASK_NOTIFICATION}`)) {
            return null;
          }
          return e(
            Box,
            {
              marginTop: 1,
              children: e(renderToolUseErrorMessage_5, {
                addMargin: !1,
                param: { type: "text", text: uT.text },
                messageId: Ln.uuid,
                origin: Ln.type === "user" ? Ln.origin : void 0,
                verbose: verbose,
              }),
            },
            Ln.uuid,
          );
        }),
          ($[50] = verbose),
          ($[51] = Ne));
      else Ne = $[51];
      li = groupMessages.map(Ne);
      (($[47] = groupMessages), ($[48] = verbose), ($[49] = li));
    } else li = $[49];
    const mapped = mT.map((wv) => {
      let wr = wv.message.content[0];
      if (wr?.type === "thinking" && wr.thinking) {
        return e(
          Box,
          {
            marginTop: 1,
            children: e(AssistantThinkingMessage, {
              param: wr,
              addMargin: !1,
              isTranscriptMode: !0,
              verbose: !0,
            }),
          },
          wv.uuid,
        );
      }
      if (wr?.type !== "tool_use") {
        return null;
      }
      return e(
        CollapsedReadSearchGroup,
        {
          content: wr,
          tools: tools,
          lookups: lookups,
          inProgressToolUseIDs: inProgressToolUseIDs,
          shouldAnimate: shouldAnimate,
          theme: X,
          quietWords: le?.get(wr.id),
        },
        wr.id,
      );
    });
    const mapped_2 = filtered.map((di) => {
      let Cv = lookups.toolResultByToolUseID.get(di.id);
      let On;
      if (x6.isInterruptedCall(Cv)) On = e(RejectedToolUseMessage, {});
      else if (((On = eT(di.id, !0)), On === null && ns !== void 0))
        On = e(GroupedToolUseRow, {
          toolUseID: di.id,
          input: di.input,
          resultMsg: Cv,
          tool: ns,
          tools: tools,
          progressMessagesForMessage: [],
        });
      return On === null ? null : e(Box, { children: On }, `ended-${di.id}`);
    });
    let ks;
    if ($[52] !== message.hookCount || $[53] !== message.hookInfos || $[54] !== message.hookTotalMs)
      ((ks =
        message.hookInfos &&
        message.hookInfos.length > 0 &&
        r(Fragment, {
          children: [
            r(Text, {
              dimColor: !0,
              children: [
                e(Text, { "aria-hidden": !0, children: "  \u23BF  " }),
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
        })),
        ($[52] = message.hookCount),
        ($[53] = message.hookInfos),
        ($[54] = message.hookTotalMs),
        ($[55] = ks));
    else ks = $[55];
    let Sr;
    if ($[56] !== de || $[57] !== message.relevantMemories)
      ((Sr = message.relevantMemories?.map((info, idx) =>
        r(
          Box,
          {
            flexDirection: "column",
            marginTop: idx > 0 ? 1 : 0,
            children: [
              r(Text, {
                dimColor: !0,
                children: [
                  e(Text, { "aria-hidden": !0, children: "  \u23BF  " }),
                  "Recalled ",
                  basename_2(info.path),
                  de ? " \xB7 local" : "",
                ],
              }),
              e(Box, {
                paddingLeft: 5,
                children: e(Text, { children: e(Ansi, { children: info.content }) }),
              }),
            ],
          },
          info.path,
        ),
      )),
        ($[56] = de),
        ($[57] = message.relevantMemories),
        ($[58] = Sr));
    else Sr = $[58];
    return r(Box, { flexDirection: "column", children: [li, mapped, !1, mapped_2, !1, !1, ks, Sr, !1] });
  }
  let is = void 0 !== void 0 && Zh.includes(void 0) ? eT((void 0).id, !1) : null,
    Ks;
  if ($[59] !== lookups)
    ((Ks = (T1) => x6.isInterruptedCall(lookups.toolResultByToolUseID.get(T1.id))),
      ($[59] = lookups),
      ($[60] = Ks));
  else Ks = $[60];
  let any = filtered.some(Ks),
    li;
  if ($[61] === MEMO_CACHE_SENTINEL) ((li = []), ($[61] = li));
  else li = $[61];
  let cT = li;
  if (!ue && !ye && !Je && !Ts) {
    let iu = any || Zm;
    if (!iu && is === null && cT.length === 0) {
      return null;
    }
    let Ne;
    if ($[62] !== iu) ((Ne = iu && e(RejectedToolUseMessage, {})), ($[62] = iu), ($[63] = Ne));
    else Ne = $[63];
    let lo;
    if ($[64] !== is || $[65] !== Ne)
      ((lo = r(Box, { flexDirection: "column", children: [Ne, cT, is] })),
        ($[64] = is),
        ($[65] = Ne),
        ($[66] = lo));
    else lo = $[66];
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
          if (_r === void 0 || data.elapsedTimeSeconds > _r)
            ((_r = data.elapsedTimeSeconds), (ci = data.totalLines));
        }
        (($[73] = inProgressToolUseIDs), ($[74] = lookups), ($[75] = toolUseIds), ($[76] = _r), ($[77] = ci));
      } else ((_r = $[76]), (ci = $[77]));
      if (_r !== void 0 && _r >= 2) {
        const Ne = _r * 1000;
        let lo;
        if ($[78] !== Ne) ((lo = formatDuration(Ne)), ($[78] = Ne), ($[79] = lo));
        else lo = $[79];
        let _v = lo;
        pi = ci > 0 ? ` (${_v} \xB7 ${ci} ${ci === 1 ? "line" : "lines"})` : ` (${_v})`;
      }
    }
    (($[67] = bg),
      ($[68] = inProgressToolUseIDs),
      ($[69] = isActiveGroup),
      ($[70] = lookups),
      ($[71] = toolUseIds),
      ($[72] = pi));
  } else pi = $[72];
  let Bn = 0;
  if (isActiveGroup && bg) {
    if ($[80] !== groupMessages || $[81] !== inProgressToolUseIDs) {
      for (let gT = groupMessages.length - 1; gT >= 0 && !Bn; gT--) {
        let lu = groupMessages[gT];
        let y1 = lu.type === "grouped_tool_use" ? lu.messages : lu.type === "assistant" ? [lu] : [];
        for (const vv of y1) {
          if (vv.message.content.some((Pv) => Pv.type === "tool_use" && inProgressToolUseIDs.has(Pv.id))) {
            let parse = Date.parse(vv.timestamp);
            if (Number.isFinite(parse)) Bn = parse;
            break;
          }
        }
      }
      (($[80] = groupMessages), ($[81] = inProgressToolUseIDs), ($[82] = Bn));
    } else Bn = $[82];
  }
  let fi, Lt, hi, Mo;
  if (
    $[83] !== uo ||
    $[84] !== So ||
    $[85] !== lT ||
    $[86] !== Eo ||
    $[87] !== It ||
    $[88] !== bg ||
    $[89] !== groupMessages ||
    $[90] !== Ts ||
    $[91] !== ye ||
    $[92] !== xr ||
    $[93] !== Bn ||
    $[94] !== isActiveGroup ||
    $[95] !== ko ||
    $[96] !== Ao ||
    $[97] !== ht ||
    $[98] !== list ||
    $[99] !== nu ||
    $[100] !== de ||
    $[101] !== bt ||
    $[102] !== memoryReadCount ||
    $[103] !== memorySearchCount ||
    $[104] !== memoryWriteCount ||
    $[105] !== message ||
    $[106] !== ao ||
    $[107] !== read ||
    $[108] !== Me ||
    $[109] !== Tt ||
    $[110] !== ss ||
    $[111] !== Go ||
    $[112] !== search ||
    $[113] !== Qe
  ) {
    Mo = [];
    let eo = function eo(key, verb, body) {
      let Iv = Mo.length === 0;
      if (!Iv) Mo.push(e(Text, { children: ", " }, `comma-${key}`));
      Mo.push(
        r(
          Text,
          {
            children: [
              Iv ? verb[0].toUpperCase() + verb.slice(1) : verb,
              body != null && r(Fragment, { children: [" ", body] }),
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
        let Mi = 0;
        if ($[118] !== groupMessages) {
          for (let MT = groupMessages.length - 1; MT >= 0; MT--) {
            let yT = groupMessages[MT];
            if (yT?.type === "assistant" && yT.message.content[0]?.type === "thinking") {
              let parse = Date.parse(yT.timestamp);
              if (Number.isFinite(parse)) Mi = parse;
              break;
            }
          }
          (($[118] = groupMessages), ($[119] = Mi));
        } else Mi = $[119];
        let Ne;
        if ($[120] !== Mi || $[121] !== Qe)
          ((Ne = e(ThinkingElapsed, { baseMs: Qe, lastThinkingAtMs: Mi })),
            ($[120] = Mi),
            ($[121] = Qe),
            ($[122] = Ne));
        else Ne = $[122];
        Ti = Ne;
      } else {
        const max = Math.max(1000, Qe);
        let lo;
        if ($[123] !== max) ((lo = formatDuration(max)), ($[123] = max), ($[124] = lo));
        else lo = $[124];
        let ks;
        if ($[125] !== lo) ((ks = e(Text, { bold: !0, children: lo })), ($[125] = lo), ($[126] = ks));
        else ks = $[126];
        Ti = ks;
      }
      let Ne;
      if ($[127] !== Ti || $[128] !== TT)
        ((Ne = r(Text, { children: [TT, " for ", Ti] }, "thought")),
          ($[127] = Ti),
          ($[128] = TT),
          ($[129] = Ne));
      else Ne = $[129];
      Mo.push(Ne);
    }
    let b1 = Mo.length;
    if (Eo > 0)
      eo(
        "edit",
        isActiveGroup ? "editing" : "edited",
        r(Text, {
          children: [
            e(Text, { bold: !0, children: Eo }),
            " ",
            Eo === 1 ? "file" : "files",
            " ",
            e(DiffStatCounts, { added: Ao, removed: ht }),
          ],
        }),
      );
    if (Go > 0)
      eo(
        "scratchpad",
        isActiveGroup ? "making" : "made",
        r(Text, {
          children: [
            e(Text, { bold: !0, children: Go }),
            " scratchpad",
            " ",
            Go === 1 ? "edit" : "edits",
            " ",
            e(DiffStatCounts, { added: Tt, removed: ss }),
          ],
        }),
      );
    if (bg && message.commits?.length) {
      let byKind = { committed: "committed", amended: "amended commit", "cherry-picked": "cherry-picked" };
      for (const bT of ["committed", "amended", "cherry-picked"]) {
        let shas = message.commits.filter((commit) => commit.kind === bT).map(K0);
        if (shas.length) eo(bT, byKind[bT], e(Text, { bold: !0, children: shas.join(", ") }));
      }
    }
    if (bg && message.pushes?.length) {
      let branches = uniq(message.pushes.map(V0));
      eo("push", "pushed to", e(Text, { bold: !0, children: branches.join(", ") }));
    }
    if (bg && message.branches?.length) {
      let byAction = { merged: "merged", rebased: "rebased onto" };
      for (const branche of message.branches)
        eo(
          `br-${branche.action}-${branche.ref}`,
          byAction[branche.action],
          e(Text, { bold: !0, children: branche.ref }),
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
            ? e(PrBadge, { number: pr.number, url: pr.url, bold: !0, kind: vhe(pr.url) ? "mr" : void 0 })
            : r(Text, { bold: !0, children: [pr.url && vhe(pr.url) ? "MR !" : "PR #", pr.number] }),
        );
    }
    if (It > 0) eo("frame", isActiveGroup ? "publishing" : "published", null);
    if (search > 0)
      eo(
        "search",
        isActiveGroup ? "searching for" : "searched for",
        r(Text, {
          children: [e(Text, { bold: !0, children: search }), " ", search === 1 ? "pattern" : "patterns"],
        }),
      );
    if (read > 0)
      eo(
        "read",
        isActiveGroup ? "reading" : "read",
        r(Text, { children: [e(Text, { bold: !0, children: read }), " ", read === 1 ? "file" : "files"] }),
      );
    if (list > 0)
      eo(
        "list",
        isActiveGroup ? "listing" : "listed",
        r(Text, {
          children: [e(Text, { bold: !0, children: list }), " ", list === 1 ? "directory" : "directories"],
        }),
      );
    if (bt > 0) {
      let Lv = message.mcpCallLabels ?? [];
      let S1 = (Me > 0 ? uniq([...Lv, MEMORY]) : Lv).map(CLAUDEAI_SERVER_PREFIX).join(", ") || "MCP";
      eo(
        "mcp",
        isActiveGroup ? "calling" : "called",
        r(Text, {
          children: [
            S1,
            bt > 1 && r(Text, { children: [" ", e(Text, { bold: !0, children: bt }), " times"] }),
          ],
        }),
      );
    }
    if (uo > 0) {
      let _1 = collectBackgroundToolUseIds(message.messages);
      let mu = uo === 1 && !_1 ? message.agentDescriptions?.[0] : void 0;
      let xT = mu !== void 0 ? inflectStatusText(mu) : void 0;
      let Ov = isActiveGroup ? "running" : "ran";
      if (xT !== void 0) {
        let Bv = Mo.length === 0;
        if (!Bv) {
          let Ne;
          if ($[130] === MEMO_CACHE_SENTINEL)
            ((Ne = e(Text, { children: ", " }, "comma-agent")), ($[130] = Ne));
          else Ne = $[130];
          Mo.push(Ne);
        }
        const Ne = e(Text, { bold: !0, children: NC(isActiveGroup ? xT.running : xT.done, Bv) });
        let lo;
        if ($[131] !== Ne) ((lo = e(Text, { children: Ne }, "agent")), ($[131] = Ne), ($[132] = lo));
        else lo = $[132];
        Mo.push(lo);
      } else if (mu !== void 0)
        eo("agent", Ov, r(Text, { children: ["agent \xB7 ", e(Text, { bold: !0, children: mu })] }));
      else
        eo(
          "agent",
          Ov,
          r(Text, { children: [e(Text, { bold: !0, children: uo }), " ", uo === 1 ? "agent" : "agents"] }),
        );
    }
    if (ao > 0)
      eo(
        "other",
        isActiveGroup ? "calling" : "called",
        r(Text, { children: [e(Text, { bold: !0, children: ao }), " ", ao === 1 ? "tool" : "tools"] }),
      );
    if (bg && So > 0)
      eo(
        "bash",
        isActiveGroup ? "running" : "ran",
        r(Text, {
          children: [e(Text, { bold: !0, children: So }), " shell", " ", So === 1 ? "command" : "commands"],
        }),
      );
    if (memoryReadCount > 0)
      eo(
        "mem-read",
        isActiveGroup ? "recalling" : "recalled",
        r(Text, {
          children: [
            e(Text, { bold: !0, children: memoryReadCount }),
            " ",
            de,
            memoryReadCount === 1 ? "memory" : "memories",
          ],
        }),
      );
    if (memorySearchCount > 0) eo("mem-search", isActiveGroup ? "searching" : "searched", "memories");
    for (const wT of gn?.memorySaveParts(message.memorySaves ?? [], isActiveGroup === !0) ?? [])
      eo(wT.key, wT.verb, wT.object);
    if (memoryWriteCount > 0)
      eo(
        "mem-write",
        isActiveGroup ? "writing" : "wrote",
        r(Text, {
          children: [
            e(Text, { bold: !0, children: memoryWriteCount }),
            " ",
            memoryWriteCount === 1 ? "memory" : "memories",
          ],
        }),
      );
    let Fv = Ts && !ye && Mo.length === b1;
    if (Fv) eo("script", "working", null);
    let Wv = !nu && Fv ? lT : void 0;
    Lt = nu || Wv;
    fi = Wv === void 0 ? Bn : 0;
    hi = Mo.length === 0 && (message.hookTotalMs ?? 0) > 0;
    if (hi)
      eo(
        "hooks",
        "ran",
        r(Text, {
          children: [
            e(Text, { bold: !0, children: message.hookCount }),
            " PreToolUse",
            " ",
            message.hookCount === 1 ? "hook" : "hooks",
            " (",
            formatSecondsShort(message.hookTotalMs ?? 0),
            ")",
          ],
        }),
      );
    (($[83] = uo),
      ($[84] = So),
      ($[85] = lT),
      ($[86] = Eo),
      ($[87] = It),
      ($[88] = bg),
      ($[89] = groupMessages),
      ($[90] = Ts),
      ($[91] = ye),
      ($[92] = xr),
      ($[93] = Bn),
      ($[94] = isActiveGroup),
      ($[95] = ko),
      ($[96] = Ao),
      ($[97] = ht),
      ($[98] = list),
      ($[99] = nu),
      ($[100] = de),
      ($[101] = bt),
      ($[102] = memoryReadCount),
      ($[103] = memorySearchCount),
      ($[104] = memoryWriteCount),
      ($[105] = message),
      ($[106] = ao),
      ($[107] = read),
      ($[108] = Me),
      ($[109] = Tt),
      ($[110] = ss),
      ($[111] = Go),
      ($[112] = search),
      ($[113] = Qe),
      ($[114] = fi),
      ($[115] = Lt),
      ($[116] = hi),
      ($[117] = Mo));
  } else ((fi = $[114]), (Lt = $[115]), (hi = $[116]), (Mo = $[117]));
  let yi = 0,
    Fn = 0,
    bi = 0,
    vr = 0,
    CT,
    ST,
    flattened = message.messages.flatMap(countToolUses);
  for (const Ys of flattened) {
    let found = Ys.message.content.find(Q0);
    if (found?.type !== "tool_result" || (Gs !== void 0 && Xh.has(found.tool_use_id))) {
      continue;
    }
    if (Pa(Ys.toolDenialKind, Ys.toolDenialMonitorBlocked)) bi++;
    else if (Ys.toolDenialKind === "automode-blocked")
      (yi++, (CT = typeof found.content === "string" ? found.content : void 0));
    else if (Ys.toolDenialMonitorBlocked === !0) Fn++;
    else if (
      Ys.toolDenialKind === "permission-rule" &&
      found.is_error === !0 &&
      Ys.toolDenialAfterRun !== !0 &&
      Ys.toolDenialFromHost !== !0 &&
      !qs.has(found.tool_use_id)
    )
      (vr++, (ST = typeof found.content === "string" ? found.content : void 0));
  }
  let Wn = yi + Fn,
    pu = Wn === 1 && CT !== void 0 ? vc(extractClassifierDenialReason(qa(CT)) ?? void 0) : void 0,
    _T = vr === 1 && ST !== void 0 ? qa(ST) : void 0,
    ki =
      _T === void 0
        ? void 0
        : (Dhn(_T) ?? _T)
            .trim()
            .replace(PERMISSION_DENIED_FOR_PATTERN, "")
            .replace(PRE_TOOL_HOOK_ERROR_PREFIX_RE, "$1"),
    cu =
      ki === void 0 ||
      NON_INTERACTIVE_DENIAL_PREFIXES.some((P1) => ki.startsWith(P1)) ||
      isModelUnavailableDenial(ki)
        ? void 0
        : vc(
            ki.startsWith(SAFETY_CHECK_DENIAL_PREFIX)
              ? SAFETY_CHECK_DENIAL_PREFIX
              : firstLineOf(getFirstLine(ki), DENIAL_STOP_AND_EXPLAIN_GUIDANCE),
          );
  const Ne = k ? 1 : 0;
  let lo;
  if ($[133] !== anyError || $[134] !== isActiveGroup)
    ((lo = isActiveGroup
      ? e(ToolUseLoader, { shouldAnimate: !0, isUnresolved: !0, isError: anyError || !1 })
      : e(Box, { minWidth: 2 })),
      ($[133] = anyError),
      ($[134] = isActiveGroup),
      ($[135] = lo));
  else lo = $[135];
  const ks = !isActiveGroup;
  let Sr;
  if ($[136] !== Lt || $[137] !== Mo)
    ((Sr = Lt ? e(Text, { children: capitalize(Lt) }, "task-summary") : Mo),
      ($[136] = Lt),
      ($[137] = Mo),
      ($[138] = Sr));
  else Sr = $[138];
  let gu;
  if ($[139] !== Lt || $[140] !== isActiveGroup || $[141] !== message || $[142] !== Mo)
    ((gu =
      !Lt &&
      TeamMemCountParts({
        message: message,
        isActiveGroup: isActiveGroup,
        hasPrecedingParts: Mo.length > 0,
      })),
      ($[139] = Lt),
      ($[140] = isActiveGroup),
      ($[141] = message),
      ($[142] = Mo),
      ($[143] = gu));
  else gu = $[143];
  let fu;
  if ($[144] !== fi || $[145] !== ko || $[146] !== shouldAnimate)
    ((fu =
      fi > 0 && !ko && e(ElapsedSinceAnchor, { anchorMs: fi, shouldAnimate: shouldAnimate }, "tool-elapsed")),
      ($[144] = fi),
      ($[145] = ko),
      ($[146] = shouldAnimate),
      ($[147] = fu));
  else fu = $[147];
  let hu;
  if ($[148] !== Lt || $[149] !== isActiveGroup)
    ((hu = isActiveGroup && !Lt && e(Text, { children: "\u2026" }, "ellipsis")),
      ($[148] = Lt),
      ($[149] = isActiveGroup),
      ($[150] = hu));
  else hu = $[150];
  let Hv;
  if ($[151] === MEMO_CACHE_SENTINEL) ((Hv = e(CtrlOToExpand, {})), ($[151] = Hv));
  else Hv = $[151];
  let Tu;
  if ($[152] !== ks || $[153] !== Sr || $[154] !== gu || $[155] !== fu || $[156] !== hu)
    ((Tu = r(Text, { dimColor: ks, children: [Sr, gu, fu, hu, " ", Hv] })),
      ($[152] = ks),
      ($[153] = Sr),
      ($[154] = gu),
      ($[155] = fu),
      ($[156] = hu),
      ($[157] = Tu));
  else Tu = $[157];
  let Mu;
  if ($[158] !== lo || $[159] !== Tu)
    ((Mu = r(Box, { flexDirection: "row", children: [lo, Tu] })),
      ($[158] = lo),
      ($[159] = Tu),
      ($[160] = Mu));
  else Mu = $[160];
  let bu;
  if ($[161] !== Jh) ((bu = Jh && e(RejectedToolUseMessage, {})), ($[161] = Jh), ($[162] = bu));
  else bu = $[162];
  let Ru;
  if (
    $[163] !== pu ||
    $[164] !== yi ||
    $[165] !== Fn ||
    $[166] !== Wn ||
    $[167] !== nT ||
    $[168] !== ko ||
    $[169] !== toolUseIds
  )
    ((Ru =
      Wn > 0 &&
      !ko &&
      e(MessageResponse, {
        children: r(Box, {
          flexDirection: "column",
          children: [
            e(Text, {
              dimColor: Fn === 0,
              wrap: "wrap",
              children: r(Byline, {
                children: [
                  e(Text, {
                    color: Fn > 0 ? "error" : void 0,
                    children:
                      toolUseIds.length === 1
                        ? "Blocked by auto mode"
                        : `${Wn} ${plural(Wn, "action")} blocked by auto mode`,
                  }),
                  yi > 0 && nT && !wt() && e(Text, { dimColor: !0, children: "/permissions to review" }),
                ],
              }),
            }),
            pu !== void 0 && e(DenialReasonQuote, { label: AUTO_MODE_PREFIX, reason: pu }),
          ],
        }),
      })),
      ($[163] = pu),
      ($[164] = yi),
      ($[165] = Fn),
      ($[166] = Wn),
      ($[167] = nT),
      ($[168] = ko),
      ($[169] = toolUseIds),
      ($[170] = Ru));
  else Ru = $[170];
  let ku;
  if ($[171] !== ko || $[172] !== cu || $[173] !== vr || $[174] !== toolUseIds)
    ((ku =
      vr > 0 &&
      !ko &&
      e(MessageResponse, {
        children: r(Box, {
          flexDirection: "column",
          children: [
            e(Text, {
              dimColor: !0,
              wrap: "wrap",
              children: r(Byline, {
                children: [
                  e(Text, {
                    children: toolUseIds.length === 1 ? "Not run" : `${vr} ${plural(vr, "action")} not run`,
                  }),
                  e(Text, { children: "permission denied" }),
                ],
              }),
            }),
            cu !== void 0 && e(DenialReasonQuote, { label: "Reason: ", reason: cu }),
          ],
        }),
      })),
      ($[171] = ko),
      ($[172] = cu),
      ($[173] = vr),
      ($[174] = toolUseIds),
      ($[175] = ku));
  else ku = $[175];
  let xu;
  if ($[176] !== bi || $[177] !== ko || $[178] !== toolUseIds)
    ((xu =
      bi > 0 &&
      !ko &&
      e(MessageResponse, {
        children: e(Text, {
          dimColor: !0,
          wrap: "wrap",
          children: e(NotRunLine, { callCount: toolUseIds.length === 1 ? void 0 : bi }),
        }),
      })),
      ($[176] = bi),
      ($[177] = ko),
      ($[178] = toolUseIds),
      ($[179] = xu));
  else xu = $[179];
  let wu;
  if (
    $[180] !== columns ||
    $[181] !== ii ||
    $[182] !== isActiveGroup ||
    $[183] !== is ||
    $[184] !== pi ||
    $[185] !== su
  )
    ((wu =
      isActiveGroup &&
      is === null &&
      ii !== void 0 &&
      r(Box, {
        flexDirection: "row",
        children: [
          e(Box, {
            width: 5,
            flexShrink: 0,
            children: e(Text, { "aria-hidden": !0, dimColor: !0, children: "  \u23BF  " }),
          }),
          e(Box, {
            flexDirection: "column",
            flexGrow: 1,
            children: su
              ? e(MarkdownText_2, {
                  dimColor: !0,
                  italic: !0,
                  children: truncateToLines(ii, columns - Px, Ux),
                })
              : ii
                  .split(
                    `
`,
                  )
                  .map((line, $v, arr) =>
                    r(Text, { dimColor: !0, children: [line, $v === arr.length - 1 && pi] }, `hint-${$v}`),
                  ),
          }),
        ],
      })),
      ($[180] = columns),
      ($[181] = ii),
      ($[182] = isActiveGroup),
      ($[183] = is),
      ($[184] = pi),
      ($[185] = su),
      ($[186] = wu));
  else wu = $[186];
  let Cu;
  if ($[187] !== hi || $[188] !== message)
    ((Cu =
      !hi &&
      message.hookTotalMs !== void 0 &&
      message.hookTotalMs > 0 &&
      r(Text, {
        dimColor: !0,
        children: [
          e(Text, { "aria-hidden": !0, children: "  \u23BF  " }),
          "Ran ",
          message.hookCount,
          " PreToolUse",
          " ",
          message.hookCount === 1 ? "hook" : "hooks",
          " (",
          formatSecondsShort(message.hookTotalMs),
          ")",
        ],
      })),
      ($[187] = hi),
      ($[188] = message),
      ($[189] = Cu));
  else Cu = $[189];
  let Gv;
  if (
    $[190] !== is ||
    $[191] !== Ne ||
    $[192] !== Mu ||
    $[193] !== bu ||
    $[194] !== Ru ||
    $[195] !== ku ||
    $[196] !== xu ||
    $[197] !== wu ||
    $[198] !== Cu ||
    $[199] !== rT
  )
    ((Gv = r(Box, {
      ref: rT,
      flexDirection: "column",
      marginTop: Ne,
      children: [Mu, bu, Ru, ku, xu, cT, is, wu, Cu],
    })),
      ($[190] = is),
      ($[191] = Ne),
      ($[192] = Mu),
      ($[193] = bu),
      ($[194] = Ru),
      ($[195] = ku),
      ($[196] = xu),
      ($[197] = wu),
      ($[198] = Cu),
      ($[199] = rT),
      ($[200] = Gv));
  else Gv = $[200];
  return Gv;
}

export { CollapsedReadSearchContent, selectViewingAgentTaskId_2 };
