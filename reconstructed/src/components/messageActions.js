/**
 * components/messageActions.tsx
 *
 * 消息操作：可导航消息判定、复制文本、工具调用/结果提取、消息操作栏与 MessageActionsKeybindings。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messageActions.tsx
 * pieces: chunk-0e8j1zzj.js (1), chunk-ag5x7vhf.js (2), chunk-e6aww6q8.js (10), chunk-hyjyj8hj.js (1), chunk-mketzrwm.js (1), chunk-tyg7f3ek.js (1), chunk-yzt83vwd.js (1)
 * attribution: fingerprint 9, sole-consumer 2, file-local 1, layout 1, placement 3, affinity 1
 */
import { PQs } from "../utils/hooks/hookEvents.js";
import { kxn } from "../utils/model/modelSwitchHooks.js";
import { withDeadline } from "../utils/sleep.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, A, o } from "../../vendor/zod/v4/classic/schemas.js";
import { uniq, count } from "../utils/collections.js";
import {
  isCollapsibleToolResult,
  shouldSkipMessage,
  isTextBreaker,
  isPlaceholderAssistantMessage,
  FWt,
  Cie,
  ARTIFACT_TOOL_NAME,
  isPublishShapedArtifactAction,
} from "../utils/collapseReadSearch.js";
import { collapsedNotificationKind } from "../utils/queuedCommandDisplay.js";
import { findToolByName } from "../Tool.js";
import { getValidHookLabel } from "../utils/collapseHookSummaries.js";
import { AGENT, TASK } from "../tools/AgentTool/constants.js";
import { truncateToLength, Dr } from "../utils/stringUtils.js";
import { deviceToolDisplayInfo } from "../utils/toolUseDisplay.js";
import { bKe, countEditLines } from "../tools/AgentTool/agentLaunch.js";
import { $Ys } from "../services/api/errors.js";
import { isKnownContentBlockType } from "../services/api/requestHeaders.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL } from "../../runtime/bun-runtime.js";
import { wrapAnsi } from "../ink/wrapAnsi.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { logError } from "../utils/log.js";
import { useKeybindingContext } from "../keybindings/KeybindingContext.js";
import { y, zt, P } from "../../vendor/react/cjs/react.production.js";

//@ chunk-e6aww6q8.js:3427430-3427980 fingerprint = copyTextOf (0.33)
async function copyTextOf(e, n = PQs) {
  let of = kxn.of(e);
  if (of.inFlight.size > 0 && of.landedOn?.sessionId === e.id)
    await withDeadline(Promise.all([...of.inFlight]), n);
  let pending = of.pending;
  of.pending = [];
  let filtered = pending.filter((w) => w.sessionId === e.id),
    y = of.landedOn?.sessionId === e.id ? of.landedOn.toModel : void 0,
    S = new Set();
  return filtered.filter((w) => {
    if (w.toModel !== y) return !1;
    let tc = jsonStringify([
      w.contexts,
      w.messages.map((message) =>
        message.type === "attachment"
          ? [
              message.attachment.type,
              "content" in message.attachment ? message.attachment.content : "",
              "stderr" in message.attachment ? message.attachment.stderr : "",
            ]
          : message.type,
      ),
    ]);
    if (S.has(tc)) return !1;
    return (S.add(tc), !0);
  });
}
//@ chunk-e6aww6q8.js:4152232-4152286 fingerprint = isApplicable (0.461)
var isApplicable = DoctorLazy(() => u({ compilerOptions: u({ types: A(o()) }) }));
//@ chunk-e6aww6q8.js:4686545-4686715 file-local
function toolResultText(e, n) {
  if (e.type !== "user") return !1;
  let r = !1;
  for (let s of e.message.content) {
    if (s.type !== "tool_result") continue;
    if (!n.has(s.tool_use_id)) return !1;
    r = !0;
  }
  return r;
}
//@ chunk-e6aww6q8.js:4686715-4686968 layout = toolCallOf (1)
function toolCallOf_3(msg) {
  if (msg.type === "assistant") {
    let n = msg.message.content[0];
    if (n?.type === "tool_use") return [n.id];
  }
  if (msg.type === "grouped_tool_use")
    return msg.messages
      .map((message) => {
        let r = message.message.content[0];
        return r.type === "tool_use" ? r.id : "";
      })
      .filter(Boolean);
  return [];
}
//@ chunk-e6aww6q8.js:4686968-4687044 placement
function ife(e) {
  let n = [];
  for (let message of e.messages) n.push(...toolCallOf_3(message));
  return n;
}
//@ chunk-e6aww6q8.js:4687044-4687096 placement
function Z9n(e, n) {
  return ife(e).some((r) => n.has(r));
}
/**
 * 把一个折叠的读/搜组的各项计数（搜索、读取、记忆、MCP、Bash、编辑行数、提交、钩子、思考时长等）累加进另一个组，并追加消息。
 */
//@ chunk-e6aww6q8.js:4700121-4702980 placement
function mergeCollapsedReadSearch(target, source) {
  if (
    ((target.searchCount += source.searchCount),
    (target.readCount += source.readCount),
    (target.listCount += source.listCount),
    (target.memorySearchCount += source.memorySearchCount),
    (target.memoryReadCount += source.memoryReadCount),
    (target.memoryWriteCount += source.memoryWriteCount),
    source.teamMemorySearchCount)
  )
    target.teamMemorySearchCount = (target.teamMemorySearchCount ?? 0) + source.teamMemorySearchCount;
  if (source.teamMemoryReadCount)
    target.teamMemoryReadCount = (target.teamMemoryReadCount ?? 0) + source.teamMemoryReadCount;
  if (source.teamMemoryWriteCount)
    target.teamMemoryWriteCount = (target.teamMemoryWriteCount ?? 0) + source.teamMemoryWriteCount;
  if (source.accountMemoryReadKeys?.length)
    target.accountMemoryReadKeys = uniq([
      ...(target.accountMemoryReadKeys ?? []),
      ...source.accountMemoryReadKeys,
    ]);
  if (source.accountMemorySearchCount)
    target.accountMemorySearchCount =
      (target.accountMemorySearchCount ?? 0) + source.accountMemorySearchCount;
  if (source.accountMemoryRecalls?.length)
    target.accountMemoryRecalls = [...(target.accountMemoryRecalls ?? []), ...source.accountMemoryRecalls];
  if (source.scratchpadWriteCount)
    ((target.scratchpadWriteCount = (target.scratchpadWriteCount ?? 0) + source.scratchpadWriteCount),
      (target.scratchpadLinesAdded = (target.scratchpadLinesAdded ?? 0) + (source.scratchpadLinesAdded ?? 0)),
      (target.scratchpadLinesRemoved =
        (target.scratchpadLinesRemoved ?? 0) + (source.scratchpadLinesRemoved ?? 0)));
  if (source.relevantMemories?.length)
    target.relevantMemories = [...(target.relevantMemories ?? []), ...source.relevantMemories];
  if (source.memorySaves?.length) target.memorySaves = [...(target.memorySaves ?? []), ...source.memorySaves];
  if (source.mcpCallCount)
    ((target.mcpCallCount = (target.mcpCallCount ?? 0) + source.mcpCallCount),
      (target.mcpCallLabels = uniq([...(target.mcpCallLabels ?? []), ...(source.mcpCallLabels ?? [])])));
  if (source.bashCount) target.bashCount = (target.bashCount ?? 0) + source.bashCount;
  if (source.gitOpBashCount) target.gitOpBashCount = (target.gitOpBashCount ?? 0) + source.gitOpBashCount;
  if (source.otherToolCount) target.otherToolCount = (target.otherToolCount ?? 0) + source.otherToolCount;
  if (source.agentCount) {
    if (((target.agentCount = (target.agentCount ?? 0) + source.agentCount), source.agentDescriptions))
      target.agentDescriptions = [...(target.agentDescriptions ?? []), ...source.agentDescriptions];
  }
  if (source.frameCount) target.frameCount = (target.frameCount ?? 0) + source.frameCount;
  if (source.editFileCount) target.editFileCount = (target.editFileCount ?? 0) + source.editFileCount;
  if (source.linesAdded) target.linesAdded = (target.linesAdded ?? 0) + source.linesAdded;
  if (source.linesRemoved) target.linesRemoved = (target.linesRemoved ?? 0) + source.linesRemoved;
  if (source.commits?.length) target.commits = [...(target.commits ?? []), ...source.commits];
  if (source.pushes?.length) target.pushes = [...(target.pushes ?? []), ...source.pushes];
  if (source.branches?.length) target.branches = [...(target.branches ?? []), ...source.branches];
  if (source.prs?.length) target.prs = [...(target.prs ?? []), ...source.prs];
  if (source.readFilePaths?.length)
    target.readFilePaths = [...(target.readFilePaths ?? []), ...source.readFilePaths];
  if (source.searchArgs?.length) target.searchArgs = [...(target.searchArgs ?? []), ...source.searchArgs];
  if (source.hookCount)
    ((target.hookCount = (target.hookCount ?? 0) + source.hookCount),
      (target.hookTotalMs = (target.hookTotalMs ?? 0) + (source.hookTotalMs ?? 0)),
      (target.hookInfos = [...(target.hookInfos ?? []), ...(source.hookInfos ?? [])]));
  if (
    ((target.latestDisplayHint = source.latestDisplayHint ?? target.latestDisplayHint), source.thoughtForMs)
  )
    target.thoughtForMs = (target.thoughtForMs ?? 0) + source.thoughtForMs;
  ((target.latestThinkingSummary = source.latestThinkingSummary ?? target.latestThinkingSummary),
    target.messages.push(...source.messages));
}
//@ chunk-e6aww6q8.js:4703309-4707177 fingerprint = isNavigableMessage (0.31)
function isNavigableMessage(e, n, r, s = !1, h = {}) {
  if (h.transcriptV2) return e;
  let y = [],
    S = h.keepAllText !== !0,
    w = 0;
  while (w < e.length) {
    let L = e[w];
    if (!isCollapsibleToolResult(L)) {
      (y.push(L), w++);
      continue;
    }
    let G = w,
      q = 0,
      Z = 0,
      Se = [];
    if (S)
      while (w < e.length) {
        let yt = e[w];
        if (yt.type !== "user") break;
        let gt = collapsedNotificationKind(yt);
        if (gt === null) break;
        if (gt.kind === "agent") q += gt.count;
        else Z += gt.count;
        (Se.push(yt), w++);
      }
    if (Se.length === 0) (y.push(L), w++);
    let ke = w;
    while (ke < e.length && !isCollapsibleToolResult(e[ke])) ke++;
    let we = s && ke === e.length;
    if (we) {
      let yt = ke - 1;
      while (yt >= w && shouldSkipMessage(e[yt])) yt--;
      let gt = yt >= w ? e[yt] : void 0;
      if (
        gt?.type === "assistant" &&
        gt.message.stop_reason !== null &&
        (isTextBreaker(gt) || isPlaceholderAssistantMessage(gt))
      )
        we = !1;
    }
    let Ee = -1;
    if (!we) {
      for (let yt = ke - 1; yt >= w; yt--)
        if (isTextBreaker(e[yt])) {
          Ee = yt;
          break;
        }
    }
    let Ae = new Set();
    if (h.keepAllText === !0) {
      let yt = new Set();
      for (let gt = w; gt < ke; gt++) {
        let At = e[gt];
        if (At.type !== "user") continue;
        for (let It of At.message.content)
          if (typeof It === "object" && It !== null && It.type === "tool_result" && It.is_error === !0)
            yt.add(It.tool_use_id);
      }
      for (let gt = w; gt < ke; gt++) {
        let At = e[gt];
        if (isTextBreaker(At)) {
          Ae.add(gt);
          continue;
        }
        if (At.type === "assistant") {
          let It = At.message.content[0];
          if (It?.type === "tool_use" && yt.has(It.id)) Ae.add(gt);
          continue;
        }
        if (At.type !== "user") continue;
        for (let It of At.message.content)
          if (
            typeof It === "object" &&
            It !== null &&
            It.type === "tool_result" &&
            It.is_error === !0 &&
            yt.has(It.tool_use_id)
          ) {
            Ae.add(gt);
            break;
          }
      }
    }
    let Ie = new Set(),
      Me = new Set();
    for (let yt = ke - 1; !we && yt >= w; yt--) {
      let gt = e[yt];
      if (gt.type !== "assistant") continue;
      let At = gt.message.content[0];
      if (At?.type !== "tool_use" || Me.has(At.name)) continue;
      if ((Me.add(At.name), findToolByName(n, At.name)?.briefStandalone)) {
        Ie.add(yt);
        for (let It = yt + 1; It < ke; It++) {
          let Yt = e[It];
          if (Yt.type === "assistant") break;
          if (Yt.type !== "user") continue;
          let qt = Yt.message.content[0];
          if (qt?.type === "tool_result" && qt.tool_use_id === At.id) {
            Ie.add(It);
            break;
          }
        }
      }
    }
    let We = null,
      ze = ke;
    if (Se.length > 0) {
      if (((We = createCollapsedReadSearchGroup(Se[0])), (We.messages = [...Se]), q > 0)) We.agentCount = q;
      if (Z > 0) We.bashCount = Z;
      ze = G;
    }
    let lt = [],
      Je = () => {
        if (We) (lt.push([ze, We]), (We = null), (ze = ke));
      },
      nt = 0;
    for (let yt = w; yt < ke; yt++) {
      if (yt === Ee || Ae.has(yt) || Ie.has(yt)) {
        if (h.keepAllText === !0 && (Ae.has(yt) || yt === Ee) && isTextBreaker(e[yt])) Je();
        continue;
      }
      let gt = e[yt];
      if (gt.type === "system") {
        if (gt.subtype === "informational" && gt.level === "info") nt++;
        else if (gt.subtype === "stop_hook_summary" && getValidHookLabel(gt) !== void 0);
        else Ie.add(yt);
        continue;
      }
      let At = null;
      if (gt.type === "collapsed_read_search") At = gt;
      else if (gt.type === "grouped_tool_use")
        At = createCollapsedToolGroup(
          gt,
          gt.toolName,
          gt.messages.map((message) => message.message.content[0]?.input),
          n,
        );
      else if (gt.type === "assistant") {
        let It = gt.message.content[0];
        if (It?.type === "tool_use") At = createCollapsedToolGroup(gt, It.name, [It.input], n);
        else if (isPlaceholderAssistantMessage(gt)) nt++;
        else if ((It?.type === "thinking" || It?.type === "redacted_thinking") && !FWt(gt)) nt++;
      } else if (gt.type === "user") {
        if (We) {
          We.messages.push(gt);
          let toolUseResult = gt.toolUseResult,
            Yt =
              toolUseResult?.toolStats ??
              (toolUseResult?.status === "async_launched" && toolUseResult.agentId
                ? r?.(toolUseResult.agentId)
                : void 0);
          if (Yt) {
            if (((We.readCount += Yt.readCount), (We.searchCount += Yt.searchCount), Yt.bashCount))
              We.bashCount = (We.bashCount ?? 0) + Yt.bashCount;
            if (Yt.editFileCount) We.editFileCount = (We.editFileCount ?? 0) + Yt.editFileCount;
            if (Yt.linesAdded) We.linesAdded = (We.linesAdded ?? 0) + Yt.linesAdded;
            if (Yt.linesRemoved) We.linesRemoved = (We.linesRemoved ?? 0) + Yt.linesRemoved;
            if (Yt.otherToolCount) We.otherToolCount = (We.otherToolCount ?? 0) + Yt.otherToolCount;
            if (Yt.frameCount) We.frameCount = (We.frameCount ?? 0) + Yt.frameCount;
          }
        }
      }
      if (gt.type === "attachment") nt++;
      if (At)
        if (We) mergeCollapsedReadSearch(We, At);
        else ((We = { ...At, messages: [...At.messages] }), (ze = yt));
    }
    if (Ee !== -1) Ie.add(Ee);
    for (let yt of Ae) Ie.add(yt);
    let mapped = [...Ie].map((yt) => [yt, e[yt]]);
    Je();
    for (let [yt, gt] of lt) {
      if (((gt.uuid = `brief-${gt.uuid}`), we && h.keepAllText !== !0 && gt === lt.at(-1)?.[1]))
        gt.isLiveBriefTurn = !0;
      ((gt.hookCount = void 0), (gt.hookTotalMs = void 0), (gt.hookInfos = void 0), mapped.push([yt, gt]));
    }
    mapped.sort((yt, gt) => yt[0] - gt[0]);
    let Et = we || h.keepAllText === !0 ? 0 : ke - w + Se.length - mapped.length - nt;
    for (let [, yt] of mapped)
      y.push(
        Et > 0 && yt.type === "system" && yt.subtype === "turn_duration"
          ? { ...yt, briefHiddenCount: Et }
          : yt,
      );
    w = ke;
  }
  return y;
}
//@ chunk-e6aww6q8.js:4707177-4707389 affinity
function createCollapsedReadSearchGroup(e) {
  return {
    type: "collapsed_read_search",
    searchCount: 0,
    readCount: 0,
    listCount: 0,
    memorySearchCount: 0,
    memoryReadCount: 0,
    memoryWriteCount: 0,
    messages: [e],
    displayMessage: e,
    uuid: e.uuid,
    timestamp: e.timestamp,
  };
}
/**
 * 为一组同名工具调用创建折叠组并按工具类型计数：Agent/Task 记描述，MCP/记忆保存记服务器名，编辑类累加增删行，Artifact 计帧数，其他计入 otherToolCount。
 */
//@ chunk-e6aww6q8.js:4707389-4708167 sole-consumer
function createCollapsedToolGroup(message, toolName, inputs, tools) {
  let count_2 = inputs.length,
    group = createCollapsedReadSearchGroup(message);
  if (toolName === AGENT || toolName === TASK) {
    group.agentCount = count_2;
    let flattened = inputs.flatMap((G) => {
      let q = G?.description;
      if (typeof q !== "string") return [];
      let Z = truncateToLength(Dr(q), 300);
      return Z !== "" ? [Z] : [];
    });
    if (flattened.length > 0) group.agentDescriptions = flattened;
    return group;
  }
  let tool = findToolByName(tools, toolName),
    w = tool === void 0 ? deviceToolDisplayInfo(toolName) : void 0;
  if (tool?.isMcp) {
    if (((group.mcpCallCount = count_2), tool.mcpInfo?.serverName))
      group.mcpCallLabels = [tool.mcpInfo.serverName];
  } else if (w !== void 0 && Cie?.isMemorySaveCall(w))
    ((group.mcpCallCount = count_2), (group.mcpCallLabels = [w.serverName]));
  else if (bKe.has(toolName)) {
    group.editFileCount = count_2;
    let L = 0,
      G = 0;
    for (let q of inputs) {
      let Z = countEditLines(toolName, q);
      ((L += Z.added), (G += Z.removed));
    }
    if (L > 0) group.linesAdded = L;
    if (G > 0) group.linesRemoved = G;
  } else if (toolName === ARTIFACT_TOOL_NAME) {
    let L = count(inputs, (G) => isPublishShapedArtifactAction?.(G) === !0);
    if (L > 0) group.frameCount = L;
    if (count_2 - L > 0) group.otherToolCount = (group.otherToolCount ?? 0) + (count_2 - L);
  } else group.otherToolCount = count_2;
  return group;
}
//@ chunk-ag5x7vhf.js:175325-175697 fingerprint = NAVIGABLE_TYPES (0.459)
function NAVIGABLE_TYPES(m) {
  let h;
  switch (m.type) {
    case "user":
    case "assistant":
      return `${m.type}/${messageTypeLabel(m.message.content[0])}`;
    case "system":
      h = `system/${m.subtype}`;
      break;
    case "attachment":
      h = `attachment/${m.attachment.type}`;
      break;
    case "grouped_tool_use":
    case "collapsed_read_search":
    case "work_segment":
    case "speaker_label":
    case "recap_fold":
      h = m.type;
      break;
    default:
      h = String(m.type);
  }
  return $Ys(h);
}
//@ chunk-ag5x7vhf.js:175697-175824 sole-consumer = extractErrorTypeFromData (1)
function messageTypeLabel(data) {
  if (data === void 0) return "?";
  let h = typeof data === "object" && data !== null && "type" in data ? data.type : void 0;
  return isKnownContentBlockType(h) ? h : "unknown";
}
//@ chunk-0e8j1zzj.js:40067-41402 fingerprint = MessageActionsBar (0.516)
function MessageActionsBar(t0) {
  let $ = w(38),
    { keyText: keyText, contentColumns: contentColumns } = t0,
    m,
    u,
    i,
    h,
    k,
    f,
    g,
    M,
    N,
    x,
    A,
    T,
    v,
    I,
    L,
    b;
  if ($[0] !== contentColumns || $[1] !== keyText) {
    M = EARLY_RETURN_SENTINEL;
    le: {
      let E = wrapAnsi(`${keyText}:`, Math.max(10, contentColumns - 2), { hard: !0, trim: !1 });
      let index = E.indexOf(`
`);
      if (index === -1) {
        M = e(Text, { dimColor: !0, children: E });
        break le;
      }
      i = Box;
      f = "column";
      g = e(Text, { dimColor: !0, children: E.slice(0, index) });
      u = Box;
      x = 2;
      A = "single";
      T = !0;
      v = !1;
      I = !1;
      L = !1;
      b = !0;
      k = 1;
      m = Text;
      h = !0;
      N = wrapAnsi(E.slice(index + 1).replace(/\n/g, ""), Math.max(10, contentColumns - 4), {
        hard: !0,
        trim: !1,
      });
    }
    (($[0] = contentColumns),
      ($[1] = keyText),
      ($[2] = m),
      ($[3] = u),
      ($[4] = i),
      ($[5] = h),
      ($[6] = k),
      ($[7] = f),
      ($[8] = g),
      ($[9] = M),
      ($[10] = N),
      ($[11] = x),
      ($[12] = A),
      ($[13] = T),
      ($[14] = v),
      ($[15] = I),
      ($[16] = L),
      ($[17] = b));
  } else
    ((m = $[2]),
      (u = $[3]),
      (i = $[4]),
      (h = $[5]),
      (k = $[6]),
      (f = $[7]),
      (g = $[8]),
      (M = $[9]),
      (N = $[10]),
      (x = $[11]),
      (A = $[12]),
      (T = $[13]),
      (v = $[14]),
      (I = $[15]),
      (L = $[16]),
      (b = $[17]));
  if (M !== EARLY_RETURN_SENTINEL) return M;
  let V;
  if ($[18] !== m || $[19] !== h || $[20] !== N)
    ((V = e(m, { dimColor: h, children: N })), ($[18] = m), ($[19] = h), ($[20] = N), ($[21] = V));
  else V = $[21];
  let X;
  if (
    $[22] !== u ||
    $[23] !== k ||
    $[24] !== V ||
    $[25] !== x ||
    $[26] !== A ||
    $[27] !== T ||
    $[28] !== v ||
    $[29] !== I ||
    $[30] !== L ||
    $[31] !== b
  )
    ((X = e(u, {
      marginLeft: x,
      borderStyle: A,
      borderLeft: T,
      borderRight: v,
      borderTop: I,
      borderBottom: L,
      borderDimColor: b,
      paddingLeft: k,
      children: V,
    })),
      ($[22] = u),
      ($[23] = k),
      ($[24] = V),
      ($[25] = x),
      ($[26] = A),
      ($[27] = T),
      ($[28] = v),
      ($[29] = I),
      ($[30] = L),
      ($[31] = b),
      ($[32] = X));
  else X = $[32];
  let Y;
  if ($[33] !== i || $[34] !== f || $[35] !== g || $[36] !== X)
    ((Y = r(i, { flexDirection: f, children: [g, X] })),
      ($[33] = i),
      ($[34] = f),
      ($[35] = g),
      ($[36] = X),
      ($[37] = Y));
  else Y = $[37];
  return Y;
}
/**
 * 各内置工具的输入路径字段与响应中路径字段的表，供钩子输入路径处理用；同一声明派生 responseMembers 与 responseNested 集合。
 */
//@ chunk-hyjyj8hj.js:1107-2074 fingerprint = PRIMARY_INPUT (0.377)
var HOOK_TOOL_PATH_FIELDS = {
    Read: {
      input: "file_path",
      responseNested: [
        ["file", "filePath"],
        ["file", "outputDir"],
      ],
    },
    Write: { input: "file_path", responseMembers: ["filePath"] },
    Edit: { input: "file_path", responseMembers: ["filePath"] },
    MultiEdit: { input: "file_path", responseMembers: ["filePath"] },
    NotebookEdit: { input: "notebook_path", responseMembers: ["notebook_path"] },
    Glob: { input: "path", responseArrays: ["filenames"] },
    Grep: { input: "path", responseArrays: ["filenames"] },
    LSP: { input: "filePath", responseMembers: ["filePath"] },
    Bash: { responseMembers: ["rawOutputPath", "persistedOutputPath"] },
    Agent: { input: "cwd", responseMembers: ["worktreePath", "outputFile"] },
    Workflow: { input: "scriptPath", responseMembers: ["scriptPath", "transcriptDir"] },
    EnterWorktree: { input: "path", responseMembers: ["worktreePath"] },
    ExitWorktree: { responseMembers: ["worktreePath", "originalCwd"] },
  },
  HOOK_RESPONSE_PATH_MEMBERS = new Set(
    Object.values(HOOK_TOOL_PATH_FIELDS).flatMap((e) => e.responseMembers ?? []),
  ),
  HOOK_RESPONSE_NESTED_PATHS = new Set(
    Object.values(HOOK_TOOL_PATH_FIELDS).flatMap((e) =>
      (e.responseNested ?? []).map(([o, n]) => `${o}/${n}`),
    ),
  );
//@ chunk-mketzrwm.js:6314-6704 fingerprint = stripSystemReminders (0.873)
function stripSystemReminders(text) {
  let trimStart = text.trimStart(),
    s = !1;
  while (trimStart.startsWith("<system-reminder>")) {
    let index = trimStart.indexOf("</system-reminder>");
    if (index < 0) break;
    ((trimStart = trimStart.slice(index + 18).trimStart()), (s = !0));
  }
  let trimEnd = (s ? trimStart : text).trimEnd();
  while (trimEnd.endsWith("</system-reminder>")) {
    let index = trimEnd.lastIndexOf(`
`);
    if (!(index < 0 ? trimEnd : trimEnd.slice(index + 1)).startsWith("<system-reminder>")) break;
    ((trimEnd = (index < 0 ? "" : trimEnd.slice(0, index)).trimEnd()), (s = !0));
  }
  if (!s) return text;
  return trimEnd === "" ? text : trimEnd;
}
//@ chunk-tyg7f3ek.js:448270-448342 fingerprint = useMessageActions (0.347)
function useMessageActions(e, n, r) {
  if (e === void 0) return;
  try {
    e.enter(n, r);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-yzt83vwd.js:598-940 fingerprint = MessageActionsKeybindings (0.41)
function MessageActionsKeybindings(e, t = {}) {
  let { context: context = "Global", isActive: isActive = !0 } = t,
    o = useKeybindingContext(),
    [s] = y(() => ({ handlers: e })),
    joined = Object.keys(e).sort().join("|");
  (zt(() => {
    s.handlers = e;
  }),
    P(() => {
      if (!o || !isActive) return;
      let mapped = Object.keys(s.handlers).map((u) =>
        o.registerHandler({ action: u, context: context, handler: () => s.handlers[u]?.(), singleKey: !0 }),
      );
      return () => {
        for (let u of mapped) u();
      };
    }, [context, joined, o, isActive, s]));
}

export {
  MessageActionsKeybindings,
  ife,
  MessageActionsBar,
  isNavigableMessage,
  stripSystemReminders,
  useMessageActions,
  copyTextOf,
  Z9n,
  NAVIGABLE_TYPES,
  isApplicable,
  toolCallOf_3,
  toolResultText,
  HOOK_RESPONSE_PATH_MEMBERS,
  HOOK_RESPONSE_NESTED_PATHS,
  HOOK_TOOL_PATH_FIELDS,
};
