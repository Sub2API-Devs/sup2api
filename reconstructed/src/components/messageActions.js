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
import { HOOK_RESPONSE_POLL_MS } from "../utils/hooks/hookEvents.js";
import { postSwitchSlot } from "../utils/model/modelSwitchHooks.js";
import { withDeadline } from "../utils/sleep.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, array, string } from "../../vendor/zod/v4/classic/schemas.js";
import { uniq, count } from "../utils/collections.js";
import {
  isCollapsibleToolResult,
  shouldSkipMessage,
  isTextBreaker,
  isPlaceholderAssistantMessage,
  isSignedThinkingMessage,
  memorySaveHooks,
  ARTIFACT_TOOL_NAME,
  isPublishShapedArtifactAction,
} from "../utils/collapseReadSearch.js";
import { collapsedNotificationKind } from "../utils/queuedCommandDisplay.js";
import { findToolByName } from "../Tool.js";
import { getValidHookLabel } from "../utils/collapseHookSummaries.js";
import { AGENT, TASK } from "../tools/AgentTool/constants.js";
import { truncateToLength, collapseWhitespace as collapseWhitespace_2 } from "../utils/stringUtils.js";
import { deviceToolDisplayInfo } from "../utils/toolUseDisplay.js";
import { FILE_EDITING_TOOL_NAMES, countEditLines } from "../tools/AgentTool/agentLaunch.js";
import { asSafePathKey } from "../services/api/errors.js";
import { isKnownContentBlockType } from "../services/api/requestHeaders.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL } from "../../runtime/bun-runtime.js";
import { wrapAnsi } from "../ink/wrapAnsi.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { logError } from "../utils/log.js";
import { useKeybindingContext } from "../keybindings/KeybindingContext.js";
import { y, zt, P } from "../../vendor/react/cjs/react.production.js";

//@ chunk-e6aww6q8.js:3427430-3427980 fingerprint = copyTextOf (0.33)
async function copyTextOf(session, n = HOOK_RESPONSE_POLL_MS) {
  let r = postSwitchSlot.of(session);
  if (r.inFlight.size > 0 && r.landedOn?.sessionId === session.id)
    await withDeadline(Promise.all([...r.inFlight]), n);
  let pending = r.pending;
  r.pending = [];
  let filtered = pending.filter((w) => w.sessionId === session.id);
  let toModel = r.landedOn?.sessionId === session.id ? r.landedOn.toModel : undefined;
  let S = new Set();
  return filtered.filter((w) => {
    if (w.toModel !== toModel) return false;
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
    if (S.has(tc)) return false;
    S.add(tc);
    return true;
  });
}
//@ chunk-e6aww6q8.js:4152232-4152286 fingerprint = isApplicable (0.461)
var isApplicable = DoctorLazy(() =>
  u({
    compilerOptions: u({
      types: array(string()),
    }),
  }),
);
//@ chunk-e6aww6q8.js:4686545-4686715 file-local
function toolResultText(e, toolUseIds) {
  if (e.type !== "user") return false;
  let r = false;
  for (let s of e.message.content) {
    if (s.type !== "tool_result") continue;
    if (!toolUseIds.has(s.tool_use_id)) return false;
    r = true;
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
/**
 * 函数 collectToolUseIds（收集消息组的工具调用 id）；位于「消息操作：可导航消息判定、复制文本、工具调用/结果提取、消息操作栏与 MessageActionsKeybindings」模块。
 */
function collectToolUseIds(message) {
  let n = [];
  for (let message_2 of message.messages) n.push(...toolCallOf_3(message_2));
  return n;
}
//@ chunk-e6aww6q8.js:4687044-4687096 placement
/**
 * 函数 hasAnyToolUseId（是否有任一 id 在集合内）；位于「消息操作：可导航消息判定、复制文本、工具调用/结果提取、消息操作栏与 MessageActionsKeybindings」模块。
 */
function hasAnyToolUseId(msg, inProgressToolUseIDs) {
  return collectToolUseIds(msg).some((r) => inProgressToolUseIDs.has(r));
}
//@ chunk-e6aww6q8.js:4700121-4702980 placement
/**
 * 把一个折叠的读/搜组的各项计数（搜索、读取、记忆、MCP、Bash、编辑行数、提交、钩子、思考时长等）累加进另一个组，并追加消息。
 */
function mergeCollapsedReadSearch(target, source) {
  target.searchCount += source.searchCount;
  target.readCount += source.readCount;
  target.listCount += source.listCount;
  target.memorySearchCount += source.memorySearchCount;
  target.memoryReadCount += source.memoryReadCount;
  target.memoryWriteCount += source.memoryWriteCount;
  if (source.teamMemorySearchCount)
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
  if (source.scratchpadWriteCount) {
    target.scratchpadWriteCount = (target.scratchpadWriteCount ?? 0) + source.scratchpadWriteCount;
    target.scratchpadLinesAdded = (target.scratchpadLinesAdded ?? 0) + (source.scratchpadLinesAdded ?? 0);
    target.scratchpadLinesRemoved =
      (target.scratchpadLinesRemoved ?? 0) + (source.scratchpadLinesRemoved ?? 0);
  }
  if (source.relevantMemories?.length)
    target.relevantMemories = [...(target.relevantMemories ?? []), ...source.relevantMemories];
  if (source.memorySaves?.length) target.memorySaves = [...(target.memorySaves ?? []), ...source.memorySaves];
  if (source.mcpCallCount) {
    target.mcpCallCount = (target.mcpCallCount ?? 0) + source.mcpCallCount;
    target.mcpCallLabels = uniq([...(target.mcpCallLabels ?? []), ...(source.mcpCallLabels ?? [])]);
  }
  if (source.bashCount) target.bashCount = (target.bashCount ?? 0) + source.bashCount;
  if (source.gitOpBashCount) target.gitOpBashCount = (target.gitOpBashCount ?? 0) + source.gitOpBashCount;
  if (source.otherToolCount) target.otherToolCount = (target.otherToolCount ?? 0) + source.otherToolCount;
  if (source.agentCount) {
    target.agentCount = (target.agentCount ?? 0) + source.agentCount;
    if (source.agentDescriptions)
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
  if (source.hookCount) {
    target.hookCount = (target.hookCount ?? 0) + source.hookCount;
    target.hookTotalMs = (target.hookTotalMs ?? 0) + (source.hookTotalMs ?? 0);
    target.hookInfos = [...(target.hookInfos ?? []), ...(source.hookInfos ?? [])];
  }
  target.latestDisplayHint = source.latestDisplayHint ?? target.latestDisplayHint;
  if (source.thoughtForMs) target.thoughtForMs = (target.thoughtForMs ?? 0) + source.thoughtForMs;
  target.latestThinkingSummary = source.latestThinkingSummary ?? target.latestThinkingSummary;
  target.messages.push(...source.messages);
}
//@ chunk-e6aww6q8.js:4703309-4707177 fingerprint = isNavigableMessage (0.31)
function isNavigableMessage(collapsedBase, tools, r, isLoading = false, h = {}) {
  if (h.transcriptV2) return collapsedBase;
  let y = [];
  let S = h.keepAllText !== true;
  let w = 0;
  while (w < collapsedBase.length) {
    let L = collapsedBase[w];
    if (!isCollapsibleToolResult(L)) {
      y.push(L);
      w++;
      continue;
    }
    let G = w;
    let q = 0;
    let Z = 0;
    let Se = [];
    if (S)
      while (w < collapsedBase.length) {
        let yt = collapsedBase[w];
        if (yt.type !== "user") break;
        let gt = collapsedNotificationKind(yt);
        if (gt === null) break;
        if (gt.kind === "agent") q += gt.count;
        else Z += gt.count;
        Se.push(yt);
        w++;
      }
    if (Se.length === 0) {
      y.push(L);
      w++;
    }
    let ke = w;
    while (ke < collapsedBase.length && !isCollapsibleToolResult(collapsedBase[ke])) ke++;
    let we = isLoading && ke === collapsedBase.length;
    if (we) {
      let yt = ke - 1;
      while (yt >= w && shouldSkipMessage(collapsedBase[yt])) yt--;
      let msg = yt >= w ? collapsedBase[yt] : undefined;
      if (
        msg?.type === "assistant" &&
        msg.message.stop_reason !== null &&
        (isTextBreaker(msg) || isPlaceholderAssistantMessage(msg))
      )
        we = false;
    }
    let Ee = -1;
    if (!we) {
      for (let idx = ke - 1; idx >= w; idx--)
        if (isTextBreaker(collapsedBase[idx])) {
          Ee = idx;
          break;
        }
    }
    let Ae = new Set();
    if (h.keepAllText === true) {
      let yt = new Set();
      for (let gt = w; gt < ke; gt++) {
        let At = collapsedBase[gt];
        if (At.type !== "user") continue;
        for (let It of At.message.content)
          if (typeof It === "object" && It !== null && It.type === "tool_result" && It.is_error === true)
            yt.add(It.tool_use_id);
      }
      for (let gt = w; gt < ke; gt++) {
        let msg = collapsedBase[gt];
        if (isTextBreaker(msg)) {
          Ae.add(gt);
          continue;
        }
        if (msg.type === "assistant") {
          let It = msg.message.content[0];
          if (It?.type === "tool_use" && yt.has(It.id)) Ae.add(gt);
          continue;
        }
        if (msg.type !== "user") continue;
        for (let It of msg.message.content)
          if (
            typeof It === "object" &&
            It !== null &&
            It.type === "tool_result" &&
            It.is_error === true &&
            yt.has(It.tool_use_id)
          ) {
            Ae.add(gt);
            break;
          }
      }
    }
    let Ie = new Set();
    let Me = new Set();
    for (let idx = ke - 1; !we && idx >= w; idx--) {
      let gt = collapsedBase[idx];
      if (gt.type !== "assistant") continue;
      let At = gt.message.content[0];
      if (At?.type !== "tool_use" || Me.has(At.name)) continue;
      Me.add(At.name);
      if (findToolByName(tools, At.name)?.briefStandalone) {
        Ie.add(idx);
        for (let idx_2 = idx + 1; idx_2 < ke; idx_2++) {
          let Yt = collapsedBase[idx_2];
          if (Yt.type === "assistant") break;
          if (Yt.type !== "user") continue;
          let qt = Yt.message.content[0];
          if (qt?.type === "tool_result" && qt.tool_use_id === At.id) {
            Ie.add(idx_2);
            break;
          }
        }
      }
    }
    let target = null;
    let ze = ke;
    if (Se.length > 0) {
      target = createCollapsedReadSearchGroup(Se[0]);
      target.messages = [...Se];
      if (q > 0) target.agentCount = q;
      if (Z > 0) target.bashCount = Z;
      ze = G;
    }
    let lt = [];
    let Je = () => {
      if (target) {
        lt.push([ze, target]);
        target = null;
        ze = ke;
      }
    };
    let nt = 0;
    for (let yt = w; yt < ke; yt++) {
      if (yt === Ee || Ae.has(yt) || Ie.has(yt)) {
        if (h.keepAllText === true && (Ae.has(yt) || yt === Ee) && isTextBreaker(collapsedBase[yt])) Je();
        continue;
      }
      let message = collapsedBase[yt];
      if (message.type === "system") {
        if (message.subtype === "informational" && message.level === "info") nt++;
        else if (message.subtype === "stop_hook_summary" && getValidHookLabel(message) !== undefined);
        else Ie.add(yt);
        continue;
      }
      let source = null;
      if (message.type === "collapsed_read_search") source = message;
      else if (message.type === "grouped_tool_use")
        source = createCollapsedToolGroup(
          message,
          message.toolName,
          message.messages.map((message) => message.message.content[0]?.input),
          tools,
        );
      else if (message.type === "assistant") {
        let It = message.message.content[0];
        if (It?.type === "tool_use") source = createCollapsedToolGroup(message, It.name, [It.input], tools);
        else if (isPlaceholderAssistantMessage(message)) nt++;
        else if (
          (It?.type === "thinking" || It?.type === "redacted_thinking") &&
          !isSignedThinkingMessage(message)
        )
          nt++;
      } else if (message.type === "user") {
        if (target) {
          target.messages.push(message);
          let toolUseResult = message.toolUseResult;
          let Yt =
            toolUseResult?.toolStats ??
            (toolUseResult?.status === "async_launched" && toolUseResult.agentId
              ? r?.(toolUseResult.agentId)
              : undefined);
          if (Yt) {
            target.readCount += Yt.readCount;
            target.searchCount += Yt.searchCount;
            if (Yt.bashCount) target.bashCount = (target.bashCount ?? 0) + Yt.bashCount;
            if (Yt.editFileCount) target.editFileCount = (target.editFileCount ?? 0) + Yt.editFileCount;
            if (Yt.linesAdded) target.linesAdded = (target.linesAdded ?? 0) + Yt.linesAdded;
            if (Yt.linesRemoved) target.linesRemoved = (target.linesRemoved ?? 0) + Yt.linesRemoved;
            if (Yt.otherToolCount) target.otherToolCount = (target.otherToolCount ?? 0) + Yt.otherToolCount;
            if (Yt.frameCount) target.frameCount = (target.frameCount ?? 0) + Yt.frameCount;
          }
        }
      }
      if (message.type === "attachment") nt++;
      if (source)
        if (target) mergeCollapsedReadSearch(target, source);
        else {
          target = {
            ...source,
            messages: [...source.messages],
          };
          ze = yt;
        }
    }
    if (Ee !== -1) Ie.add(Ee);
    for (let yt of Ae) Ie.add(yt);
    let mapped = [...Ie].map((yt) => [yt, collapsedBase[yt]]);
    Je();
    for (let [yt, gt] of lt) {
      gt.uuid = `brief-${gt.uuid}`;
      if (we && h.keepAllText !== true && gt === lt.at(-1)?.[1]) gt.isLiveBriefTurn = true;
      gt.hookCount = undefined;
      gt.hookTotalMs = undefined;
      gt.hookInfos = undefined;
      mapped.push([yt, gt]);
    }
    mapped.sort((yt, gt) => yt[0] - gt[0]);
    let Et = we || h.keepAllText === true ? 0 : ke - w + Se.length - mapped.length - nt;
    for (let [, yt] of mapped)
      y.push(
        Et > 0 && yt.type === "system" && yt.subtype === "turn_duration"
          ? {
              ...yt,
              briefHiddenCount: Et,
            }
          : yt,
      );
    w = ke;
  }
  return y;
}
//@ chunk-e6aww6q8.js:4707177-4707389 affinity
function createCollapsedReadSearchGroup(message) {
  return {
    type: "collapsed_read_search",
    searchCount: 0,
    readCount: 0,
    listCount: 0,
    memorySearchCount: 0,
    memoryReadCount: 0,
    memoryWriteCount: 0,
    messages: [message],
    displayMessage: message,
    uuid: message.uuid,
    timestamp: message.timestamp,
  };
}
//@ chunk-e6aww6q8.js:4707389-4708167 sole-consumer
/**
 * 为一组同名工具调用创建折叠组并按工具类型计数：Agent/Task 记描述，MCP/记忆保存记服务器名，编辑类累加增删行，Artifact 计帧数，其他计入 otherToolCount。
 */
function createCollapsedToolGroup(message, toolName, inputs, tools) {
  let count_2 = inputs.length;
  let group = createCollapsedReadSearchGroup(message);
  if (toolName === AGENT || toolName === TASK) {
    group.agentCount = count_2;
    let flattened = inputs.flatMap((input) => {
      let description = input?.description;
      if (typeof description !== "string") return [];
      let Z = truncateToLength(collapseWhitespace_2(description), 300);
      return Z !== "" ? [Z] : [];
    });
    if (flattened.length > 0) group.agentDescriptions = flattened;
    return group;
  }
  let tool = findToolByName(tools, toolName);
  let w = tool === undefined ? deviceToolDisplayInfo(toolName) : undefined;
  if (tool?.isMcp) {
    group.mcpCallCount = count_2;
    if (tool.mcpInfo?.serverName) group.mcpCallLabels = [tool.mcpInfo.serverName];
  } else if (w !== undefined && memorySaveHooks?.isMemorySaveCall(w)) {
    group.mcpCallCount = count_2;
    group.mcpCallLabels = [w.serverName];
  } else if (FILE_EDITING_TOOL_NAMES.has(toolName)) {
    group.editFileCount = count_2;
    let L = 0;
    let G = 0;
    for (let input of inputs) {
      let Z = countEditLines(toolName, input);
      L += Z.added;
      G += Z.removed;
    }
    if (L > 0) group.linesAdded = L;
    if (G > 0) group.linesRemoved = G;
  } else if (toolName === ARTIFACT_TOOL_NAME) {
    let L = count(inputs, (G) => isPublishShapedArtifactAction?.(G) === true);
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
  return asSafePathKey(h);
}
//@ chunk-ag5x7vhf.js:175697-175824 sole-consumer = extractErrorTypeFromData (1)
function messageTypeLabel(data) {
  if (data === undefined) return "?";
  let h = typeof data === "object" && data !== null && "type" in data ? data.type : undefined;
  return isKnownContentBlockType(h) ? h : "unknown";
}
//@ chunk-0e8j1zzj.js:40067-41402 fingerprint = MessageActionsBar (0.516)
function MessageActionsBar(props) {
  let $ = w(38);
  let { keyText, contentColumns } = props;
  let m;
  let u;
  let i;
  let dimColor;
  let paddingLeft;
  let flexDirection;
  let g;
  let M;
  let children;
  let marginLeft;
  let borderStyle;
  let borderLeft;
  let borderRight;
  let borderTop;
  let borderBottom;
  let borderDimColor;
  if ($[0] !== contentColumns || $[1] !== keyText) {
    M = EARLY_RETURN_SENTINEL;
    le: {
      let E = wrapAnsi(`${keyText}:`, Math.max(10, contentColumns - 2), {
        hard: true,
        trim: false,
      });
      let index = E.indexOf(`
`);
      if (index === -1) {
        M = jsxProd_default(Text, {
          dimColor: true,
          children: E,
        });
        break le;
      }
      i = Box;
      flexDirection = "column";
      g = jsxProd_default(Text, {
        dimColor: true,
        children: E.slice(0, index),
      });
      u = Box;
      marginLeft = 2;
      borderStyle = "single";
      borderLeft = true;
      borderRight = false;
      borderTop = false;
      borderBottom = false;
      borderDimColor = true;
      paddingLeft = 1;
      m = Text;
      dimColor = true;
      children = wrapAnsi(E.slice(index + 1).replace(/\n/g, ""), Math.max(10, contentColumns - 4), {
        hard: true,
        trim: false,
      });
    }
    $[0] = contentColumns;
    $[1] = keyText;
    $[2] = m;
    $[3] = u;
    $[4] = i;
    $[5] = dimColor;
    $[6] = paddingLeft;
    $[7] = flexDirection;
    $[8] = g;
    $[9] = M;
    $[10] = children;
    $[11] = marginLeft;
    $[12] = borderStyle;
    $[13] = borderLeft;
    $[14] = borderRight;
    $[15] = borderTop;
    $[16] = borderBottom;
    $[17] = borderDimColor;
  } else {
    m = $[2];
    u = $[3];
    i = $[4];
    dimColor = $[5];
    paddingLeft = $[6];
    flexDirection = $[7];
    g = $[8];
    M = $[9];
    children = $[10];
    marginLeft = $[11];
    borderStyle = $[12];
    borderLeft = $[13];
    borderRight = $[14];
    borderTop = $[15];
    borderBottom = $[16];
    borderDimColor = $[17];
  }
  if (M !== EARLY_RETURN_SENTINEL) return M;
  let children_2;
  if ($[18] !== m || $[19] !== dimColor || $[20] !== children) {
    children_2 = jsxProd_default(m, {
      dimColor,
      children,
    });
    $[18] = m;
    $[19] = dimColor;
    $[20] = children;
    $[21] = children_2;
  } else children_2 = $[21];
  let X;
  if (
    $[22] !== u ||
    $[23] !== paddingLeft ||
    $[24] !== children_2 ||
    $[25] !== marginLeft ||
    $[26] !== borderStyle ||
    $[27] !== borderLeft ||
    $[28] !== borderRight ||
    $[29] !== borderTop ||
    $[30] !== borderBottom ||
    $[31] !== borderDimColor
  ) {
    X = jsxProd_default(u, {
      marginLeft,
      borderStyle,
      borderLeft,
      borderRight,
      borderTop,
      borderBottom,
      borderDimColor,
      paddingLeft,
      children: children_2,
    });
    $[22] = u;
    $[23] = paddingLeft;
    $[24] = children_2;
    $[25] = marginLeft;
    $[26] = borderStyle;
    $[27] = borderLeft;
    $[28] = borderRight;
    $[29] = borderTop;
    $[30] = borderBottom;
    $[31] = borderDimColor;
    $[32] = X;
  } else X = $[32];
  let Y;
  if ($[33] !== i || $[34] !== flexDirection || $[35] !== g || $[36] !== X) {
    Y = jsxProd_default_2(i, {
      flexDirection,
      children: [g, X],
    });
    $[33] = i;
    $[34] = flexDirection;
    $[35] = g;
    $[36] = X;
    $[37] = Y;
  } else Y = $[37];
  return Y;
}
//@ chunk-hyjyj8hj.js:1107-2074 fingerprint = PRIMARY_INPUT (0.377)
/**
 * 各内置工具的输入路径字段与响应中路径字段的表，供钩子输入路径处理用；同一声明派生 responseMembers 与 responseNested 集合。
 */
var HOOK_TOOL_PATH_FIELDS = {
  Read: {
    input: "file_path",
    responseNested: [
      ["file", "filePath"],
      ["file", "outputDir"],
    ],
  },
  Write: {
    input: "file_path",
    responseMembers: ["filePath"],
  },
  Edit: {
    input: "file_path",
    responseMembers: ["filePath"],
  },
  MultiEdit: {
    input: "file_path",
    responseMembers: ["filePath"],
  },
  NotebookEdit: {
    input: "notebook_path",
    responseMembers: ["notebook_path"],
  },
  Glob: {
    input: "path",
    responseArrays: ["filenames"],
  },
  Grep: {
    input: "path",
    responseArrays: ["filenames"],
  },
  LSP: {
    input: "filePath",
    responseMembers: ["filePath"],
  },
  Bash: {
    responseMembers: ["rawOutputPath", "persistedOutputPath"],
  },
  Agent: {
    input: "cwd",
    responseMembers: ["worktreePath", "outputFile"],
  },
  Workflow: {
    input: "scriptPath",
    responseMembers: ["scriptPath", "transcriptDir"],
  },
  EnterWorktree: {
    input: "path",
    responseMembers: ["worktreePath"],
  },
  ExitWorktree: {
    responseMembers: ["worktreePath", "originalCwd"],
  },
};
var HOOK_RESPONSE_PATH_MEMBERS = new Set(
  Object.values(HOOK_TOOL_PATH_FIELDS).flatMap((e) => e.responseMembers ?? []),
);
var HOOK_RESPONSE_NESTED_PATHS = new Set(
  Object.values(HOOK_TOOL_PATH_FIELDS).flatMap((e) => (e.responseNested ?? []).map(([o, n]) => `${o}/${n}`)),
);
//@ chunk-mketzrwm.js:6314-6704 fingerprint = stripSystemReminders (0.873)
function stripSystemReminders(text) {
  let i = text.trimStart();
  let s = false;
  while (i.startsWith("<system-reminder>")) {
    let end = i.indexOf("</system-reminder>");
    if (end < 0) break;
    i = i.slice(end + 18).trimStart();
    s = true;
  }
  let d = (s ? i : text).trimEnd();
  while (d.endsWith("</system-reminder>")) {
    let index = d.lastIndexOf(`
`);
    if (!(index < 0 ? d : d.slice(index + 1)).startsWith("<system-reminder>")) break;
    d = (index < 0 ? "" : d.slice(0, index)).trimEnd();
    s = true;
  }
  if (!s) return text;
  return d === "" ? text : d;
}
//@ chunk-tyg7f3ek.js:448270-448342 fingerprint = useMessageActions (0.347)
function useMessageActions(turnStartClock, n, r) {
  if (turnStartClock === undefined) return;
  try {
    turnStartClock.enter(n, r);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-yzt83vwd.js:598-940 fingerprint = MessageActionsKeybindings (0.41)
function MessageActionsKeybindings(e, t = {}) {
  let { context = "Global", isActive = true } = t;
  let keybindingContext = useKeybindingContext();
  let [s] = y(() => ({
    handlers: e,
  }));
  let joined = Object.keys(e).sort().join("|");
  zt(() => {
    s.handlers = e;
  });
  P(() => {
    if (!keybindingContext || !isActive) return;
    let mapped = Object.keys(s.handlers).map((key) =>
      keybindingContext.registerHandler({
        action: key,
        context,
        handler: () => s.handlers[key]?.(),
        singleKey: true,
      }),
    );
    return () => {
      for (let u of mapped) u();
    };
  }, [context, joined, keybindingContext, isActive, s]);
}
export {
  MessageActionsKeybindings,
  collectToolUseIds,
  MessageActionsBar,
  isNavigableMessage,
  stripSystemReminders,
  useMessageActions,
  copyTextOf,
  hasAnyToolUseId,
  NAVIGABLE_TYPES,
  isApplicable,
  toolCallOf_3,
  toolResultText,
  HOOK_RESPONSE_PATH_MEMBERS,
  HOOK_RESPONSE_NESTED_PATHS,
  HOOK_TOOL_PATH_FIELDS,
};
