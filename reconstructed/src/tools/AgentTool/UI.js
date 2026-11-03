/**
 * tools/AgentTool/UI.tsx
 *
 * Agent 工具的终端渲染：调用摘要、进度增量汇总、结果统计、拒绝/错误、分组显示与模型标签
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/UI.tsx
 * pieces: chunk-0tkmvwy0.js (3), chunk-8ndmcarc.js (1), chunk-ah34pb7m.js (39)
 * attribution: placement 2, fingerprint 10, file-local 3, layout 14, affinity 4, facade-exports 10
 */
import { getSlackChannelLink } from "../MCPTool/slackSend.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { Ansi } from "../../ink/components/AnsiText.js";
import { supportsHyperlinks } from "../../ink/supports-hyperlinks.js";
import { createHyperlink } from "../../utils/hyperlink.js";
import { Rh, R } from "../../../vendor/react/cjs/react.production.js";
import { MessageImpl, areMessagePropsEqual } from "../../components/Message.js";
import { getSearchOrReadFromContent, getSearchReadSummaryText } from "../../utils/collapseReadSearch.js";
import { logError } from "../../utils/log.js";
import { hasSearchOrReadActivity } from "../WebSearchTool/UI.js";
import {
  collectResolvedToolUseIds,
  markServerToolUseResolved,
  EMPTY_LOOKUPS,
  buildSubagentLookups as buildSubagentLookups_2,
  createAssistantMessage,
} from "../../utils/messages.js";
import { finalContextTokensFromLastResponse } from "../../cli/print.js";
import { totalTokensOf } from "../../utils/messages/usageAndStopReason.js";
import { MarkdownText_2 } from "../../components/pluginUi/render/MarkdownBlock.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { hasAutoModeBlockedToolResult } from "../../components/messages/teamMemCollapsed.js";
import { compareAgentsByName, fmn, resolveAgentOverrides } from "./agentDisplay.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { splitHarnessNotes } from "../WebFetchTool/harnessNotes.js";
import { renderToolUseProgressMessage as renderToolUseProgressMessage_6 } from "../WebFetchTool/UI.js";
import { formatNumber, formatDuration } from "../../utils/format.js";
import { SubAgentProvider, CtrlOToExpand, OverflowHint } from "../../components/CtrlOToExpand.js";
import { Bgs } from "../../services/oauth/oauthErrors.js";
import { WebFetchTool } from "../WebFetchTool/WebFetchTool.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, A, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { parseUserSpecifiedModel, renderModelName } from "../../utils/model/modelDisplay.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { FallbackToolUseRejectedMessage } from "../../components/FallbackToolUseRejectedMessage.js";
import { RejectedToolUseMessage } from "../../components/messages/UserToolResultMessage/RejectedToolUseMessage.js";
import { FallbackToolUseErrorMessage } from "../../components/FallbackToolUseErrorMessage.js";
import { count } from "../../utils/collections.js";
import { getAgentInputSchema } from "./agentInputSchema.js";
import { dropRelativeEffortInput } from "./agentEffort.js";
import { getAgentColor } from "./agentColorManager.js";
import { ToolUseLoader } from "../../components/ToolUseLoader.js";
import { AgentProgressLine } from "../../components/AgentProgressLine.js";
import { findToolByName, safeParseToolInput } from "../../Tool.js";
import { GENERAL_PURPOSE_AGENT } from "./built-in/generalPurposeAgent.js";
import { COORDINATOR_WORKER_AGENT_TYPE } from "../../coordinator/workerAgent.js";
import { FETCH } from "../WebFetchTool/prompt.js";

/**
 * Agent 工具调用行后的标签（如模型/链接），支持超链接。
 */
//@ chunk-ah34pb7m.js:14627-14788 fingerprint = renderToolUseTag (0.843)
function renderToolUseTag_2(input) {
  let agentModel = getSlackChannelLink(input);
  if (agentModel === null) return null;
  return e(Box, {
    flexWrap: "nowrap",
    marginLeft: 1,
    children: e(Ansi, {
      children:
        agentModel.url && supportsHyperlinks()
          ? createHyperlink(agentModel.url, agentModel.label)
          : agentModel.label,
    }),
  });
}
/**
 * AgentTool UI 的进度选择器与消息类型判断。
 */
//@ chunk-ah34pb7m.js:241692-241709 placement
var agentProgressSelector = Rh(MessageImpl, areMessagePropsEqual);
/**
 * 进度 data 是否带 message 对象。
 */
//@ chunk-ah34pb7m.js:241709-241817 fingerprint = hasProgressMessage (1)
function hasProgressMessage(data) {
  if (!("message" in data)) return !1;
  let msg = data.message;
  return msg != null && typeof msg === "object" && "type" in msg;
}
/**
 * 进度项的 data 是否带 message。
 */
//@ chunk-ah34pb7m.js:241817-241850 file-local
function isProgressWithMessage(pm_0) {
  return hasProgressMessage(pm_0.data);
}
//@ chunk-ah34pb7m.js:241850-241958 layout = countToolCallsSince (1)
function countToolCallsSince(m) {
  let d = m.data.message.message.content[0];
  return d?.type === "tool_use" || d?.type === "tool_result";
}
//@ chunk-ah34pb7m.js:241958-242220 file-local
function getProgressMessageToolUseInfo(progressMessage, tools, toolUseByID) {
  if (!hasProgressMessage(progressMessage.data)) return null;
  let message = progressMessage.data.message;
  if (message.type === "assistant") return getSearchOrReadFromContent(message.message.content[0], tools);
  if (message.type === "user") {
    let content = message.message.content[0];
    if (content?.type === "tool_result") {
      let toolUse = toolUseByID.get(content.tool_use_id);
      if (toolUse) return getSearchOrReadFromContent(toolUse, tools);
    }
  }
  return null;
}
/**
 * 创建代理进度分组的增量状态：已处理源消息数、稳定行、当前打开的分组、tool_use 索引、已解决/出错/进行中的 tool_use 集合等。
 */
//@ chunk-ah34pb7m.js:242220-242581 affinity
function createProgressGroupingState() {
  return {
    processedSourceCount: 0,
    lastSourceUuid: void 0,
    tools: void 0,
    stable: [],
    stableCountableCount: 0,
    openGroup: null,
    toolUseByID: new Map(),
    toolUseCount: 0,
    latestAssistantUsage: void 0,
    resolvedToolUseIDs: new Set(),
    erroredToolUseIDs: new Set(),
    toolResultByToolUseID: new Map(),
    inProgressToolUseIDs: new Set(),
    pendingServerToolUses: [],
    lastRowAssistantMessageId: void 0,
  };
}
/**
 * 增量更新代理进度分组状态：工具列表变化或源消息被改写时整体重置，否则只处理新增的进度消息（逐条 EW 归组，异常只记录）。
 */
//@ chunk-ah34pb7m.js:242581-242920 affinity
function updateProgressGroupingState(m, d, c) {
  if (!(
    c === m.tools &&
    d.length >= m.processedSourceCount &&
    (m.processedSourceCount === 0 || d[m.processedSourceCount - 1]?.uuid === m.lastSourceUuid)
  ))
    (Object.assign(m, createProgressGroupingState()), (m.tools = c));
  for (
    let processedSourceCount = m.processedSourceCount;
    processedSourceCount < d.length;
    processedSourceCount++
  ) {
    let h = d[processedSourceCount];
    if (isProgressWithMessage(h)) {
      ((m.processedSourceCount = processedSourceCount + 1), (m.lastSourceUuid = h.uuid));
      try {
        accumulateAgentProgress(m, h, c);
      } catch (error) {
        logError(error);
      }
    }
  }
}
//@ chunk-ah34pb7m.js:242920-242988 affinity
function pushStableRow(m, d) {
  if ((m.stable.push(d), isCountableProgressRow(d))) m.stableCountableCount++;
}
//@ chunk-ah34pb7m.js:242988-243111 affinity
function isCountableProgressRow(m) {
  if (m.type === "summary") return !0;
  return m.message.data.message.message.content.some((d) => d.type === "tool_use");
}
//@ chunk-ah34pb7m.js:243164-243293 fingerprint = processProgressMessages (0.624)
function processProgressMessages(m, d) {
  return {
    type: "summary",
    searchCount: m.searchCount,
    readCount: m.readCount,
    uuid: `summary-${m.startUuid}`,
    isActive: d,
  };
}
//@ chunk-ah34pb7m.js:243293-243382 layout
function UW(m) {
  if (m.openGroup && hasSearchOrReadActivity(m.openGroup))
    pushStableRow(m, processProgressMessages(m.openGroup, !1));
  m.openGroup = null;
}
/**
 * 把一条子代理进度消息并入增量渲染状态：记录 tool_use、已解决/出错的 tool_result、服务端工具调用与最新 usage。
 */
//@ chunk-ah34pb7m.js:243382-244388 layout
function accumulateAgentProgress(m, d, c) {
  if (!isProgressWithMessage(d)) return;
  let g = d,
    message = g.data.message;
  if (message.type === "assistant") {
    if (message.isUnmetered !== !0) m.latestAssistantUsage = message.message.usage;
    m.lastRowAssistantMessageId = message.message.id;
    let M = !1;
    for (let T of message.message.content) {
      if (T.type === "tool_use") {
        if (((M = !0), m.toolUseByID.set(T.id, T), !m.resolvedToolUseIDs.has(T.id)))
          m.inProgressToolUseIDs.add(T.id);
      } else if (T.type === "server_tool_use" || T.type === "mcp_tool_use")
        m.pendingServerToolUses.push({ block: T, messageId: message.message.id });
      if (
        (collectResolvedToolUseIds(T, m.resolvedToolUseIDs, m.erroredToolUseIDs),
        "tool_use_id" in T && typeof T.tool_use_id === "string")
      )
        m.inProgressToolUseIDs.delete(T.tool_use_id);
    }
    if (M) m.toolUseCount++;
  } else if (message.type === "user") {
    m.lastRowAssistantMessageId = void 0;
    for (let M of message.message.content)
      if (M.type === "tool_result") {
        if (
          (m.resolvedToolUseIDs.add(M.tool_use_id),
          m.toolResultByToolUseID.set(M.tool_use_id, message),
          m.inProgressToolUseIDs.delete(M.tool_use_id),
          M.is_error)
        )
          m.erroredToolUseIDs.add(M.tool_use_id);
      }
  }
  if (message.type !== "user") pushStableRow(m, { type: "original", message: g });
  return;
}
//@ chunk-ah34pb7m.js:244388-244485 layout
function Q_(m, d) {
  let openGroup = m.openGroup;
  if (!openGroup || !hasSearchOrReadActivity(openGroup)) return m.stable;
  return m.stable.concat(processProgressMessages(openGroup, d));
}
//@ chunk-ah34pb7m.js:244485-244653 layout
function countStableCountableRows(m, d, c) {
  if (c <= 0) return 0;
  let stableCountableCount = m.stableCountableCount;
  if (d.length > m.stable.length) stableCountableCount++;
  for (let min = Math.min(c, d.length); min < d.length; min++)
    if (isCountableProgressRow(d[min])) stableCountableCount--;
  return stableCountableCount;
}
//@ chunk-ah34pb7m.js:244653-244751 layout
function getLatestContextTokens(m) {
  let d = m.latestAssistantUsage ? finalContextTokensFromLastResponse(m.latestAssistantUsage) : void 0;
  return d ? totalTokensOf(d) : null;
}
/**
 * 为子代理界面构建查找表：待完成的服务端工具调用等。
 */
//@ chunk-ah34pb7m.js:244751-245220 layout
function buildSubagentLookups(m) {
  if (m.pendingServerToolUses.length > 0) {
    let d = [];
    for (let pendingServerToolUse of m.pendingServerToolUses) {
      if (pendingServerToolUse.messageId === m.lastRowAssistantMessageId) {
        d.push(pendingServerToolUse);
        continue;
      }
      markServerToolUseResolved(pendingServerToolUse.block, m.resolvedToolUseIDs, m.erroredToolUseIDs);
    }
    m.pendingServerToolUses = d;
  }
  return {
    lookups: {
      ...EMPTY_LOOKUPS,
      toolUseByToolUseID: m.toolUseByID,
      resolvedToolUseIDs: m.resolvedToolUseIDs,
      erroredToolUseIDs: m.erroredToolUseIDs,
      toolResultByToolUseID: m.toolResultByToolUseID,
    },
    inProgressToolUseIDs: m.inProgressToolUseIDs,
  };
}
//@ chunk-ah34pb7m.js:245220-245320 fingerprint = _temp (1)
function renderResponseTextBlock(block, index) {
  return e(
    Box,
    { paddingLeft: 2, marginTop: index === 0 ? 0 : 1, children: e(MarkdownText_2, { children: block.text }) },
    index,
  );
}
//@ chunk-ah34pb7m.js:245320-245353 file-local
function e1(pm) {
  return hasProgressMessage(pm.data);
}
//@ chunk-ah34pb7m.js:245353-245382 layout
function o1(L) {
  return L.data;
}
//@ chunk-ah34pb7m.js:245382-245507 layout
function isRenderableProgressMessage(N) {
  if (!hasProgressMessage(N.data)) {
    return !1;
  }
  let message = N.data.message;
  if (message.type === "user" && message.toolUseResult === void 0) {
    return !1;
  }
  return !0;
}
//@ chunk-ah34pb7m.js:245507-245526 layout
var MAX_COLLAPSED_PROGRESS_ROWS = 3,
  ROWS_PER_AGENT = 9,
  AGENT_ROWS_OVERHEAD = 7;
/**
 * "Prompt:" 区块。
 */
//@ chunk-ah34pb7m.js:245526-245824 facade-exports = AgentPromptDisplay (0.55)
function AgentPromptDisplay(t0) {
  let g = w(3),
    { prompt: prompt, dim: t1 } = t0;
  t1 === void 0 ? !1 : t1;
  let f;
  if (g[0] === MEMO_CACHE_SENTINEL)
    ((f = e(Text, { color: "success", bold: !0, children: "Prompt:" })), (g[0] = f));
  else f = g[0];
  let h;
  if (g[1] !== prompt)
    ((h = r(Box, {
      flexDirection: "column",
      children: [f, e(Box, { paddingLeft: 2, children: e(MarkdownText_2, { children: prompt }) })],
    })),
      (g[1] = prompt),
      (g[2] = h));
  else h = g[2];
  return h;
}
/**
 * "Response:" 区块。
 */
//@ chunk-ah34pb7m.js:245824-246108 facade-exports = AgentResponseDisplay (0.399)
function AgentResponseDisplay(t0) {
  let c = w(5),
    { content: content } = t0,
    g;
  if (c[0] === MEMO_CACHE_SENTINEL)
    ((g = e(Text, { color: "success", bold: !0, children: "Response:" })), (c[0] = g));
  else g = c[0];
  let f;
  if (c[1] !== content) ((f = content.map(renderResponseTextBlock)), (c[1] = content), (c[2] = f));
  else f = c[2];
  let h;
  if (c[3] !== f) ((h = r(Box, { flexDirection: "column", children: [g, f] })), (c[3] = f), (c[4] = h));
  else h = c[4];
  return h;
}
/**
 * verbose 下的子代理完整转录。
 */
//@ chunk-ah34pb7m.js:246108-246871 fingerprint = VerboseAgentTranscript (1)
function VerboseAgentTranscript(t0) {
  let f = w(15),
    { progressMessages: progressMessages, tools: tools, verbose: verbose } = t0,
    h;
  if (f[0] !== progressMessages)
    ((h = buildSubagentLookups_2(progressMessages.filter(e1).map(o1))),
      (f[0] = progressMessages),
      (f[1] = h));
  else h = f[1];
  let { lookups: agentLookups, inProgressToolUseIDs: inProgressToolUseIDs } = h,
    x;
  if (
    f[2] !== agentLookups ||
    f[3] !== inProgressToolUseIDs ||
    f[4] !== progressMessages ||
    f[5] !== tools ||
    f[6] !== verbose
  ) {
    let filteredMessages = progressMessages.filter(isRenderableProgressMessage);
    let b;
    if (f[8] !== agentLookups || f[9] !== inProgressToolUseIDs || f[10] !== tools || f[11] !== verbose)
      ((b = (progressMessage) =>
        e(
          MessageResponse,
          {
            height: hasAutoModeBlockedToolResult(progressMessage.data.message) ? void 0 : 1,
            children: e(agentProgressSelector, {
              message: progressMessage.data.message,
              lookups: agentLookups,
              addMargin: !1,
              tools: tools,
              commands: [],
              verbose: verbose,
              inProgressToolUseIDs: inProgressToolUseIDs,
              progressMessagesForMessage: [],
              shouldAnimate: !1,
              shouldShowDot: !1,
              isTranscriptMode: !1,
              isStatic: !0,
            }),
          },
          progressMessage.uuid,
        )),
        (f[8] = agentLookups),
        (f[9] = inProgressToolUseIDs),
        (f[10] = tools),
        (f[11] = verbose),
        (f[12] = b));
    else b = f[12];
    x = filteredMessages.map(b);
    ((f[2] = agentLookups),
      (f[3] = inProgressToolUseIDs),
      (f[4] = progressMessages),
      (f[5] = tools),
      (f[6] = verbose),
      (f[7] = x));
  } else x = f[7];
  let b;
  if (f[13] !== x) ((b = e(Fragment, { children: x })), (f[13] = x), (f[14] = b));
  else b = f[14];
  return b;
}
/**
 * Agent 工具结果渲染：remote_launched/async_launched/teammate_spawned 显示启动行，completed 显示统计（工具次数、token、耗时）、可选 Prompt/Response 与 verbose 转录。
 */
//@ chunk-ah34pb7m.js:246871-248983 facade-exports = renderToolResultMessage (0.769)
function renderToolResultMessage(
  data,
  progressMessagesForMessage,
  {
    tools: tools,
    verbose: verbose,
    theme: theme,
    isTranscriptMode: isTranscriptMode = !1,
    input: input,
    activeAgents: activeAgents,
  },
) {
  let internal = data;
  if (internal.status === "remote_launched")
    return e(Box, {
      flexDirection: "column",
      children: e(MessageResponse, {
        height: 1,
        children: r(Text, {
          children: [
            "Cloud agent launched",
            " ",
            r(Text, { dimColor: !0, children: ["\xB7 ", internal.taskId, " \xB7 ", internal.sessionUrl] }),
          ],
        }),
      }),
    });
  if (data.status === "async_launched") {
    let { prompt: prompt } = data;
    return r(Box, {
      flexDirection: "column",
      children: [
        e(MessageResponse, {
          height: 1,
          children: r(Text, {
            children: [
              !isTranscriptMode &&
              compareAgentsByName(progressMessagesForMessage, activeAgents, fmn(input, activeAgents))
                ? "Fetching in background"
                : "Backgrounded agent",
              !isTranscriptMode &&
                r(Text, {
                  dimColor: !0,
                  children: [
                    " (",
                    r(Byline, {
                      children: [
                        e(KeyboardShortcutHint, { chord: "down", action: "manage" }),
                        prompt &&
                          e(ConfigurableShortcutHint, {
                            action: "app:toggleTranscript",
                            context: "Global",
                            fallback: "ctrl+o",
                            description: "expand",
                          }),
                      ],
                    }),
                    ")",
                  ],
                }),
            ],
          }),
        }),
        isTranscriptMode &&
          prompt &&
          e(MessageResponse, { children: e(AgentPromptDisplay, { prompt: prompt, theme: theme }) }),
      ],
    });
  }
  if (data.status !== "completed") return null;
  if (
    !isTranscriptMode &&
    compareAgentsByName(
      progressMessagesForMessage,
      activeAgents,
      resolveAgentOverrides(data.agentType, activeAgents),
    )
  ) {
    let { report: report } = splitHarnessNotes(data.content),
      reduced = report.reduce((z, ee) => z + Buffer.byteLength(ee.text), 0),
      X = e(renderToolUseProgressMessage_6, { bytes: reduced });
    return verbose
      ? r(Box, {
          flexDirection: "column",
          children: [
            X,
            e(Box, {
              flexDirection: "column",
              children: e(Text, {
                children: report.map((z) => z.text).join(`
`),
              }),
            }),
          ],
        })
      : X;
  }
  let {
      totalDurationMs: totalDurationMs,
      totalToolUseCount: totalToolUseCount,
      totalTokens: totalTokens,
      usage: usage,
      content: content,
      prompt: prompt,
    } = data,
    completionMessage = `Done (${[totalToolUseCount === 1 ? "1 tool use" : `${totalToolUseCount} tool uses`, formatNumber(totalTokens) + " tokens", formatDuration(totalDurationMs)].join(" \xB7 ")})`,
    finalAssistantMessage = createAssistantMessage({
      content: completionMessage,
      usage: {
        ...usage,
        output_tokens_details:
          typeof usage.output_tokens_details?.thinking_tokens === "number"
            ? { thinking_tokens: usage.output_tokens_details.thinking_tokens }
            : null,
        inference_geo: null,
        iterations: null,
        speed: null,
        fallback_credit: null,
        service_tier:
          usage.service_tier === "standard" ||
          usage.service_tier === "priority" ||
          usage.service_tier === "batch"
            ? usage.service_tier
            : null,
      },
    });
  return r(Box, {
    flexDirection: "column",
    children: [
      isTranscriptMode &&
        prompt &&
        e(MessageResponse, { children: e(AgentPromptDisplay, { prompt: prompt, theme: theme }) }),
      isTranscriptMode
        ? e(SubAgentProvider, {
            children: e(VerboseAgentTranscript, {
              progressMessages: progressMessagesForMessage,
              tools: tools,
              verbose: verbose,
            }),
          })
        : null,
      isTranscriptMode &&
        content &&
        content.length > 0 &&
        e(MessageResponse, { children: e(AgentResponseDisplay, { content: content, theme: theme }) }),
      e(MessageResponse, {
        height: 1,
        children: e(agentProgressSelector, {
          message: finalAssistantMessage,
          lookups: EMPTY_LOOKUPS,
          addMargin: !1,
          tools: tools,
          commands: [],
          verbose: verbose,
          inProgressToolUseIDs: new Set(),
          progressMessagesForMessage: [],
          shouldAnimate: !1,
          shouldShowDot: !1,
          isTranscriptMode: !1,
          isStatic: !0,
        }),
      }),
      !isTranscriptMode && r(Text, { dimColor: !0, children: ["  ", e(CtrlOToExpand, {})] }),
    ],
  });
}
/**
 * Agent 调用摘要：description；web-fetch 代理改为显示 URL。
 */
//@ chunk-ah34pb7m.js:248983-249228 facade-exports
function renderToolUseMessage(m, d) {
  let { description: description, prompt: prompt, subagent_type: subagent_type } = m;
  if (!description || !prompt) return null;
  if (!d.isTranscriptMode && resolveAgentOverrides(subagent_type, d.activeAgents)) {
    let h = Bgs(prompt) ?? Bgs(description);
    if (h !== void 0) return WebFetchTool.renderToolUseMessage({ url: h }, d);
  }
  return description.replace(/\s+/g, " ").trim();
}
//@ chunk-ah34pb7m.js:249228-249348 layout
var ModelsUsedSchema = DoctorLazy(() =>
  u({
    modelsUsed: A(o()).optional(),
    resolvedModel: o().optional(),
    status: o().optional(),
    model: o().optional(),
  }),
);
//@ chunk-ah34pb7m.js:249348-249561 layout
function getModelsUsedFromResult(m) {
  let safeParse = ModelsUsedSchema().safeParse(m);
  if (!safeParse.success) return [];
  let { modelsUsed: modelsUsed, resolvedModel: resolvedModel, status: status, model: model } = safeParse.data;
  if (modelsUsed && modelsUsed.length > 0) return modelsUsed;
  if (resolvedModel) return [resolvedModel];
  if (status === "teammate_spawned" && model) return [parseUserSpecifiedModel(model)];
  return [];
}
//@ chunk-ah34pb7m.js:249561-249732 layout
function getModelsUsed(m) {
  let reduced = (m?.progressMessages ?? []).reduce(
      (g, f) => (f.data.type === "agent_progress" ? (f.data.modelsUsed ?? g) : g),
      [],
    ),
    c = getModelsUsedFromResult(m?.toolUseResult);
  return c.length > reduced.length ? c : reduced;
}
/**
 * 模型标签：子代理换过模型时显示 a → b，非默认模型时显示模型名。
 */
//@ chunk-ah34pb7m.js:249732-250146 facade-exports
function renderToolUseTag(m, d) {
  let c = [],
    g = getModelsUsed(d);
  if (g.length > 1)
    c.push(
      e(
        Box,
        {
          flexWrap: "nowrap",
          marginLeft: 1,
          children: e(Text, { dimColor: !0, children: g.map(renderModelName).join(" \u2192 ") }),
        },
        "model",
      ),
    );
  else if (m.model && m.model !== "inherit") {
    let f = g[0];
    if (f) {
      let h = getMainLoopModel(),
        M = parseUserSpecifiedModel(m.model);
      if (f !== h || M !== f)
        c.push(
          e(
            Box,
            {
              flexWrap: "nowrap",
              marginLeft: 1,
              children: e(Text, { dimColor: !0, children: renderModelName(f) }),
            },
            "model",
          ),
        );
    }
  }
  if (c.length === 0) return null;
  return e(Fragment, { children: c });
}
//@ chunk-ah34pb7m.js:250146-250174 layout = INITIALIZING_TEXT (1)
var INITIALIZING_TEXT_2 = "Initializing\u2026";
/**
 * 用户拒绝 Agent 调用时，显示已产生的子代理进度。
 */
//@ chunk-ah34pb7m.js:250174-250429 facade-exports = renderToolUseRejectedMessage (0.27)
function renderToolUseProgressMessage(
  _input,
  {
    tools: tools,
    verbose: verbose,
    terminalSize: terminalSize,
    inProgressToolCallCount: inProgressToolCallCount,
    isTranscriptMode: isTranscriptMode = !1,
    activeAgents: activeAgents,
  },
) {
  if (!isTranscriptMode && compareAgentsByName(_input, activeAgents)) return FallbackToolUseRejectedMessage();
  return e(renderToolUseProgressMessage_2, {
    progressMessages: _input,
    tools: tools,
    verbose: verbose,
    terminalSize: terminalSize,
    inProgressToolCallCount: inProgressToolCallCount,
    isTranscriptMode: isTranscriptMode,
  });
}
/**
 * Agent 工具进行中的渲染：增量汇总子代理进度（搜索/读取分组摘要、最近工具调用、Initializing…）。
 */
//@ chunk-ah34pb7m.js:250429-251922 fingerprint = renderToolUseProgressMessage (0.815)
function renderToolUseProgressMessage_2({
  progressMessages: progressMessages,
  tools: tools,
  verbose: verbose,
  terminalSize: terminalSize,
  inProgressToolCallCount: inProgressToolCallCount,
  isTranscriptMode: isTranscriptMode,
}) {
  let M = R(null);
  M.current ??= createProgressGroupingState();
  let T = M.current;
  try {
    if ((updateProgressGroupingState(T, progressMessages, tools), !progressMessages.length))
      return e(MessageResponse, {
        height: 1,
        children: e(Text, { dimColor: !0, children: INITIALIZING_TEXT_2 }),
      });
    let toolToolRenderLinesEstimate = (inProgressToolCallCount ?? 1) * ROWS_PER_AGENT + AGENT_ROWS_OVERHEAD;
    if (
      !isTranscriptMode &&
      terminalSize &&
      terminalSize.rows &&
      terminalSize.rows < toolToolRenderLinesEstimate
    ) {
      let K = getLatestContextTokens(T);
      return e(MessageResponse, {
        height: 1,
        children: r(Text, {
          dimColor: !0,
          children: [
            "In progress\u2026 \xB7 ",
            e(Text, { bold: !0, children: T.toolUseCount }),
            " tool",
            " ",
            T.toolUseCount === 1 ? "use" : "uses",
            K && ` \xB7 ${formatNumber(K)} tokens`,
            " \xB7",
            " ",
            e(ConfigurableShortcutHint, {
              action: "app:toggleTranscript",
              context: "Global",
              fallback: "ctrl+o",
              description: "expand",
              parens: !0,
            }),
          ],
        }),
      });
    }
    let toolUseCount = Q_(T, !0),
      E = isTranscriptMode ? toolUseCount : toolUseCount.slice(-MAX_COLLAPSED_PROGRESS_ROWS),
      B = isTranscriptMode
        ? 0
        : countStableCountableRows(T, toolUseCount, toolUseCount.length - MAX_COLLAPSED_PROGRESS_ROWS),
      firstData = progressMessages[0]?.data,
      N = firstData && hasProgressMessage(firstData) ? firstData.prompt : void 0;
    if (E.length === 0 && !(isTranscriptMode && N))
      return e(MessageResponse, {
        height: 1,
        children: e(Text, { dimColor: !0, children: INITIALIZING_TEXT_2 }),
      });
    let { lookups: subagentLookups, inProgressToolUseIDs: collapsedInProgressIDs } = buildSubagentLookups(T);
    return e(MessageResponse, {
      children: r(Box, {
        flexDirection: "column",
        children: [
          r(SubAgentProvider, {
            children: [
              isTranscriptMode &&
                N &&
                e(Box, { marginBottom: 1, children: e(AgentPromptDisplay, { prompt: N }) }),
              E.map((pm) => {
                if (pm.type === "summary") {
                  let V = getSearchReadSummaryText(pm.searchCount, pm.readCount, pm.isActive);
                  return e(
                    Box,
                    { height: 1, overflow: "hidden", children: e(Text, { dimColor: !0, children: V }) },
                    pm.uuid,
                  );
                }
                return e(
                  agentProgressSelector,
                  {
                    message: pm.message.data.message,
                    lookups: subagentLookups,
                    addMargin: !1,
                    tools: tools,
                    commands: [],
                    verbose: verbose,
                    inProgressToolUseIDs: collapsedInProgressIDs,
                    progressMessagesForMessage: [],
                    shouldAnimate: !1,
                    shouldShowDot: !1,
                    style: "condensed",
                    isTranscriptMode: !1,
                    isStatic: !0,
                  },
                  pm.message.uuid,
                );
              }),
            ],
          }),
          e(OverflowHint, { count: B, unit: "tool use", expandable: !0 }),
        ],
      }),
    });
  } catch (error) {
    return (logError(error), null);
  }
}
/**
 * Agent 调用被拒的渲染（web-fetch 代理只显示拒绝行）。
 */
//@ chunk-ah34pb7m.js:251922-252163 facade-exports
function renderToolUseRejectedMessage(
  { subagent_type: subagent_type },
  {
    progressMessagesForMessage: progressMessagesForMessage,
    tools: tools,
    verbose: verbose,
    isTranscriptMode: isTranscriptMode,
    activeAgents: activeAgents,
  },
) {
  if (!isTranscriptMode && resolveAgentOverrides(subagent_type, activeAgents))
    return e(RejectedToolUseMessage, {});
  return r(Fragment, {
    children: [
      renderToolUseProgressMessage(progressMessagesForMessage, {
        tools: tools,
        verbose: verbose,
        isTranscriptMode: isTranscriptMode,
        activeAgents: activeAgents,
      }),
      e(RejectedToolUseMessage, {}),
    ],
  });
}
/**
 * Agent 调用出错时的渲染（附子代理进度）。
 */
//@ chunk-ah34pb7m.js:252163-252442 facade-exports = renderToolUseErrorMessage (0.863)
function renderToolUseErrorMessage(
  result,
  {
    progressMessagesForMessage: progressMessagesForMessage,
    tools: tools,
    verbose: verbose,
    isTranscriptMode: isTranscriptMode,
    input: input,
    activeAgents: activeAgents,
  },
) {
  if (
    !isTranscriptMode &&
    compareAgentsByName(progressMessagesForMessage, activeAgents, fmn(input, activeAgents))
  )
    return e(FallbackToolUseErrorMessage, { result: result, verbose: verbose });
  return r(Fragment, {
    children: [
      renderToolUseProgressMessage(progressMessagesForMessage, {
        tools: tools,
        verbose: verbose,
        isTranscriptMode: isTranscriptMode,
        activeAgents: activeAgents,
      }),
      e(FallbackToolUseErrorMessage, { result: result, verbose: verbose }),
    ],
  });
}
/**
 * 从进度消息统计子代理工具结果次数与最新上下文 token 数。
 */
//@ chunk-ah34pb7m.js:252442-252818 fingerprint = calculateAgentStats (0.594)
function calculateAgentStats(progressMessages) {
  let toolUseCount = count(progressMessages, (msg) => {
      if (!hasProgressMessage(msg.data)) return !1;
      let message = msg.data.message;
      return (
        message.type === "user" && message.message.content.some((content) => content.type === "tool_result")
      );
    }),
    latestAssistant = progressMessages.findLast(
      (msg) =>
        hasProgressMessage(msg.data) &&
        msg.data.message.type === "assistant" &&
        msg.data.message.isUnmetered !== !0,
    ),
    g =
      latestAssistant?.data.message.type === "assistant"
        ? finalContextTokensFromLastResponse(latestAssistant.data.message.message.usage)
        : void 0,
    f = g ? totalTokensOf(g) : null;
  return { toolUseCount: toolUseCount, tokens: f };
}
/**
 * 同一条消息里多个 Agent 调用合并渲染为一组（每个子代理一行状态）。
 */
//@ chunk-ah34pb7m.js:252818-254921 facade-exports = renderGroupedAgentToolUse (0.849)
function renderGroupedAgentToolUse(toolUses, options) {
  let {
      shouldAnimate: shouldAnimate,
      tools: tools,
      addMargin: addMargin = !0,
      activeAgents: activeAgents,
    } = options,
    agentStats = toolUses.map(
      ({
        param: param,
        isResolved: isResolved,
        isError: isError,
        progressMessages: progressMessages,
        result: K,
      }) => {
        let stats = calculateAgentStats(progressMessages),
          Y = extractLastToolInfo(progressMessages, tools, activeAgents),
          parsedInput = getAgentInputSchema().safeParse(
            dropRelativeEffortInput(param.input)?.input ?? param.input,
          ),
          isTeammateSpawn = K?.output?.status === "teammate_spawned",
          ee,
          le,
          ge,
          ae,
          pe;
        if (isTeammateSpawn && parsedInput.success && parsedInput.data.name)
          ((ee = `@${parsedInput.data.name}`),
            (le = updateAgentFile(parsedInput.data.subagent_type, activeAgents)),
            (pe = parsedInput.data.description?.replace(/\s+/g, " ").trim() || void 0),
            (ae = le ? getAgentColor(le) : void 0));
        else
          ((ee = parsedInput.success
            ? userFacingName(parsedInput.data, { activeAgents: activeAgents })
            : "Agent"),
            (le = parsedInput.success
              ? parsedInput.data.description?.replace(/\s+/g, " ").trim() || void 0
              : void 0),
            (ge = parsedInput.success
              ? userFacingNameBackgroundColor(parsedInput.data, { activeAgents: activeAgents })
              : void 0),
            (pe = void 0));
        let te =
            parsedInput.success &&
            "run_in_background" in parsedInput.data &&
            parsedInput.data.run_in_background === !0,
          outputStatus = K?.output?.status,
          J =
            te || outputStatus === "async_launched" || outputStatus === "remote_launched" || isTeammateSpawn,
          se = parsedInput.success ? parsedInput.data.name : void 0;
        return {
          id: param.id,
          agentType: ee,
          description: le,
          toolUseCount: stats.toolUseCount,
          tokens: stats.tokens,
          isResolved: isResolved,
          isError: isError,
          isAsync: J,
          color: ge,
          descriptionColor: ae,
          lastToolInfo: Y,
          taskDescription: pe,
          name: se,
        };
      },
    ),
    anyUnresolved = toolUses.some((L) => !L.isResolved),
    anyError = toolUses.some((L) => L.isError),
    allComplete = !anyUnresolved,
    b = agentStats.length > 0 && agentStats.every((stat) => stat.agentType === agentStats[0]?.agentType),
    E = b && agentStats[0]?.agentType !== "Agent" ? agentStats[0]?.agentType : null,
    allAsync = agentStats.every((stat) => stat.isAsync);
  return r(Box, {
    flexDirection: "column",
    marginTop: addMargin ? 1 : 0,
    children: [
      r(Box, {
        flexDirection: "row",
        children: [
          e(ToolUseLoader, {
            shouldAnimate: shouldAnimate && anyUnresolved,
            isUnresolved: anyUnresolved,
            isError: anyError,
          }),
          r(Text, {
            children: [
              allComplete
                ? allAsync
                  ? r(Fragment, {
                      children: [
                        e(Text, { bold: !0, children: toolUses.length }),
                        " background agents launched",
                        " ",
                        e(Text, {
                          dimColor: !0,
                          children: e(KeyboardShortcutHint, { chord: "down", action: "manage", parens: !0 }),
                        }),
                      ],
                    })
                  : r(Fragment, {
                      children: [
                        e(Text, { bold: !0, children: toolUses.length }),
                        " ",
                        E ? `${E} agents` : "agents",
                        " finished",
                      ],
                    })
                : r(Fragment, {
                    children: [
                      "Running ",
                      e(Text, { bold: !0, children: toolUses.length }),
                      " ",
                      E ? `${E} agents` : "agents",
                      "\u2026",
                    ],
                  }),
              " ",
            ],
          }),
          !allAsync && e(CtrlOToExpand, {}),
        ],
      }),
      agentStats.map((stat, index) =>
        e(
          AgentProgressLine,
          {
            agentType: stat.agentType,
            description: stat.description,
            descriptionColor: stat.descriptionColor,
            taskDescription: stat.taskDescription,
            toolUseCount: stat.toolUseCount,
            tokens: stat.tokens,
            color: stat.color,
            isLast: index === agentStats.length - 1,
            isResolved: stat.isResolved,
            isError: stat.isError,
            isAsync: stat.isAsync,
            shouldAnimate: shouldAnimate,
            lastToolInfo: stat.lastToolInfo,
            hideType: b,
            name: stat.name,
          },
          stat.id,
        ),
      ),
    ],
  });
}
/**
 * 从进度消息中取最后一次工具调用的信息与计数。
 */
//@ chunk-ah34pb7m.js:254921-256016 facade-exports = extractLastToolInfo (0.804)
function extractLastToolInfo(m, d, c) {
  let toolUseByID = new Map();
  for (let pm of m) {
    if (!hasProgressMessage(pm.data)) continue;
    if (pm.data.message.type === "assistant") {
      for (let x of pm.data.message.message.content) if (x.type === "tool_use") toolUseByID.set(x.id, x);
    }
  }
  let f = 0,
    h = 0;
  for (let T = m.length - 1; T >= 0; T--) {
    let msg = m[T];
    if (!isProgressWithMessage(msg)) continue;
    if (!countToolCallsSince(msg)) continue;
    let info = getProgressMessageToolUseInfo(msg, d, toolUseByID);
    if (info && (info.isSearch || info.isRead)) {
      if (msg.data.message.type === "user") {
        if (info.isSearch) f++;
        else if (info.isRead) h++;
      }
    } else if (!info?.isREPL) break;
  }
  if (f + h >= 2) return getSearchReadSummaryText(f, h, !0);
  let lastToolResult = m.findLast((msg) => {
    if (!hasProgressMessage(msg.data)) return !1;
    let message = msg.data.message;
    if (message.type !== "user") return !1;
    let found = message.message.content.find((E) => E.type === "tool_result");
    if (found?.type !== "tool_result") return !1;
    let b = toolUseByID.get(found.tool_use_id);
    return getSearchOrReadFromContent(b, d)?.isREPL !== !0;
  });
  if (lastToolResult?.data.message.type === "user") {
    let toolResultBlock = lastToolResult.data.message.message.content.find((x) => x.type === "tool_result");
    if (toolResultBlock?.type === "tool_result") {
      let toolUseBlock = toolUseByID.get(toolResultBlock.tool_use_id);
      if (toolUseBlock) {
        let tool = findToolByName(d, toolUseBlock.name);
        if (!tool) return toolUseBlock.name;
        let input = toolUseBlock.input,
          E = safeParseToolInput(tool, input),
          B = E.success ? E.data : void 0;
        try {
          let userFacingName = tool.userFacingName(B, { activeAgents: c }),
            N = tool.getToolUseSummary?.(B);
          return N ? `${userFacingName}: ${N}` : userFacingName;
        } catch {
          return toolUseBlock.name;
        }
      }
    }
  }
  return null;
}
//@ chunk-0tkmvwy0.js:11509-11666 placement = updateAgentFile (1)
function updateAgentFile(n, e) {
  if (!n || n === GENERAL_PURPOSE_AGENT.agentType) return;
  if (n !== COORDINATOR_WORKER_AGENT_TYPE) return n;
  let s = e?.find((f) => f.agentType === COORDINATOR_WORKER_AGENT_TYPE);
  return s !== void 0 && s.source !== "built-in" ? n : void 0;
}
/**
 * Agent 工具的 userFacingName：web-fetch 代理显示为 Fetch，否则显示代理显示名或 "Agent"。
 */
//@ chunk-0tkmvwy0.js:11666-11808 fingerprint = userFacingName (0.557)
function userFacingName(n, { activeAgents: e, webFetchByAgentType: s = !1 } = {}) {
  if (!s && resolveAgentOverrides(n?.subagent_type, e)) return FETCH;
  return updateAgentFile(n?.subagent_type, e) ?? "Agent";
}
/**
 * Agent 工具名徽标背景色：按 subagent_type 取代理颜色（web-fetch 代理无色）。
 */
//@ chunk-0tkmvwy0.js:11808-11923 fingerprint = userFacingNameBackgroundColor (0.7)
function userFacingNameBackgroundColor(n, { activeAgents: e } = {}) {
  if (!n?.subagent_type || resolveAgentOverrides(n.subagent_type, e)) return;
  return getAgentColor(n.subagent_type);
}
/**
 * 另一个块中的 "Initializing…" 文本与常量 3。
 */
//@ chunk-8ndmcarc.js:16602-16633 fingerprint = INITIALIZING_TEXT (1)
var MAX_TAIL_ITEMS = 3,
  INITIALIZING_TEXT = "Initializing\u2026";

export {
  userFacingName,
  agentProgressSelector,
  renderToolUseProgressMessage,
  INITIALIZING_TEXT,
  MAX_TAIL_ITEMS,
  renderGroupedAgentToolUse,
  renderToolResultMessage,
  renderToolUseErrorMessage,
  renderToolUseRejectedMessage,
  renderToolUseTag,
  userFacingNameBackgroundColor,
  renderToolUseTag_2,
};
