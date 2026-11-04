/**
 * utils/sideQuestion.ts
 *
 * /btw 旁路提问：在共享缓存的 fork 中无工具单轮回答，补齐进行中工具的 tool_result 占位，整理回答文本；另混入拼写检查的词定位。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sideQuestion.ts
 * pieces: chunk-pphytj9x.js (6)
 * attribution: affinity 2, facade-exports 2, layout 1, fingerprint 1
 */
import { createChildAbortController, createAbortController } from "./abortController.js";
import { matchesFabricatedMarker } from "../query/malformedToolCallRecovery.js";
import { createUserMessage, createAssistantMessage, extractTextContent_2 } from "./messages.js";
import { runForkedAgent } from "./forkedAgent.js";
import { dropRetractedOnResume } from "./conversationRecovery.js";
import { APIUserAbortError } from "../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { EMPTY_USAGE } from "../services/api/emptyUsage.js";
import { isNonConversationMessage } from "../bootstrap/sessionSlices.js";
import { API_ERROR_MESSAGE_PREFIX } from "../services/api/errors.js";

//@ chunk-pphytj9x.js:493-1043 affinity
/**
 * /btw 相关常量：触发正则、无工具提示、截断提示、进行中工具的占位 tool_result 文本。
 */
var BTW_COMMAND_RE = /^\/btw\b/gi;
var BTW_NO_TOOLS_NOTICE =
  "_/btw can't run tools: any tool calls or tool output shown above were not executed and may not reflect your actual files or data. Ask in the main conversation to check._";
var BTW_TOOL_TEXT_OMITTED =
  "(That answer wrote tool calls as text. Nothing was executed, so it is omitted here.)";
var BTW_CUT_OFF_NOTICE = "_(This answer was cut off before it finished. Ask again to retry.)_";
var BTW_CUT_OFF_OMITTED = "(That answer was cut off before it finished, so it is omitted here.)";
var TOOL_RESULT_PENDING_PLACEHOLDER =
  "[No result yet \u2014 this call is still in progress in the main conversation (running, awaiting approval, or queued)]";
//@ chunk-pphytj9x.js:1043-1186 facade-exports (2.1.88 match: findBtwTriggerPositions, 1)
/**
 * 文本中所有 /btw 触发位置。
 */
function findBtwTriggerPositions(text) {
  let positions = [];
  let matches = text.matchAll(BTW_COMMAND_RE);
  for (let match of matches)
    if (match.index !== undefined)
      positions.push({
        word: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
  return positions;
}
//@ chunk-pphytj9x.js:1186-3891 facade-exports (2.1.88 match: runSideQuestion, 0.558)
/**
 * /btw 旁路提问：带上历史 btw 问答与进行中工具的占位结果，加 system-reminder 约束（无工具、单轮），fork 一次（side_question）；整理回答并写入 btwHistory。
 */
async function runSideQuestion({
  question,
  cacheSafeParams,
  parentController,
  onRetry,
  threadHistory = true,
  history,
  turnInProgress = true,
  agentId,
}) {
  let abortController = parentController
    ? createChildAbortController(parentController)
    : createAbortController();
  let btwHistory = threadHistory ? cacheSafeParams.toolUseContext.session.btwHistory : null;
  let flattened = (
    history ??
    btwHistory?.exchanges.filter((exchange) => exchange.agentId === agentId) ??
    []
  ).flatMap((exchange) => {
    let responseText = matchesFabricatedMarker(exchange.response)
      ? BTW_TOOL_TEXT_OMITTED
      : exchange.response.endsWith(BTW_CUT_OFF_NOTICE)
        ? BTW_CUT_OFF_OMITTED
        : exchange.response;
    return [
      createUserMessage({
        content: exchange.question,
      }),
      createAssistantMessage({
        content: exchange.fallbackNotice
          ? `\u26A0 ${exchange.fallbackNotice}

${responseText}`
          : responseText,
      }),
    ];
  });
  let missingToolResults = turnInProgress
    ? createMissingToolResultsMessage(cacheSafeParams.forkContextMessages)
    : undefined;
  try {
    let agentResult = await runForkedAgent({
      promptMessages: [
        ...(missingToolResults ? [missingToolResults] : []),
        ...flattened,
        createUserMessage({
          content: [
            {
              type: "text",
              text: `<system-reminder>This is a side question from the user. You must answer this question directly in a single response.

IMPORTANT CONTEXT:
- You are a separate, lightweight agent spawned to answer this one question
- The main agent is NOT interrupted - it continues working independently in the background
- You share the conversation context but are a completely separate instance
- Do NOT reference being interrupted or what you were "previously doing" - that framing is incorrect

CRITICAL CONSTRAINTS:
- You have NO tools available - you cannot read files, run commands, search, or take any actions
- Do NOT write tool calls or tool output as text (for example invoke or function_calls XML blocks) - nothing you write here is executed; if answering would need reading files, running commands, or searching, say that can't be checked from a side question and suggest asking in the main conversation
- This is a one-off response - there will be no follow-up turns
- You can ONLY provide information based on what you already know from the conversation context
- NEVER say things like "Let me try...", "I'll now...", "Let me check...", or promise to take any action
- If you don't know the answer, say so - do not offer to look it up or investigate

Simply answer the question with the information you have.</system-reminder>

`,
            },
            {
              type: "text",
              text: question,
            },
          ],
        }),
      ],
      cacheSafeParams,
      canUseTool: async () => ({
        behavior: "deny",
        message: "Side questions cannot use tools",
        decisionReason: {
          type: "other",
          reason: "side_question",
        },
      }),
      querySource: "side_question",
      forkLabel: "side_question",
      maxTurns: 1,
      skipCacheWrite: true,
      skipTranscript: true,
      overrides: {
        abortController,
      },
      onMessage: onRetry
        ? (message) => {
            if (isApiErrorSystemMessage(message))
              onRetry({
                retryAttempt: message.retryAttempt,
                maxRetries: message.maxRetries,
                retryInMs: message.retryInMs,
                status: message.error.status,
              });
          }
        : undefined,
    });
    let { live, notice } = dropRetractedOnResume(agentResult.messages);
    let { response, synthetic } = extractSideQuestionResponse(live);
    let fallback = notice && {
      originalModel: notice.originalModel,
      fallbackModel: notice.fallbackModel,
      content: notice.content,
    };
    if (btwHistory && response && !synthetic)
      btwHistory.append(question, response, fallback?.content, agentId);
    return {
      response,
      synthetic,
      usage: agentResult.totalUsage,
      ...(fallback &&
        !synthetic && {
          refusalFallback: fallback,
        }),
    };
  } catch (error) {
    if (error instanceof APIUserAbortError || abortController.signal.aborted)
      return {
        response: null,
        synthetic: false,
        usage: EMPTY_USAGE,
        aborted: true,
      };
    throw error;
  }
}
//@ chunk-pphytj9x.js:3891-4422 layout (2.1.88 match: getLastToolUseName, 0.849)
/**
 * 为最后一条 assistant 中未配对的 tool_use 合成 tool_result（isMeta 用户消息），用于中断后修复消息序列。
 */
function createMissingToolResultsMessage(message) {
  let filtered = message.filter((message) => !isNonConversationMessage(message));
  let block = filtered.findLast((message) => message.type === "assistant");
  if (!block) return;
  let answeredToolIds = new Set();
  let pendingToolIds = [];
  for (let candidate of filtered)
    if (candidate.type === "user" && Array.isArray(candidate.message.content)) {
      for (let contentBlock of candidate.message.content)
        if (contentBlock.type === "tool_result") answeredToolIds.add(contentBlock.tool_use_id);
    } else if (candidate.type === "assistant" && candidate.message.id === block.message.id) {
      for (let contentBlock of candidate.message.content)
        if (contentBlock.type === "tool_use") pendingToolIds.push(contentBlock.id);
    }
  let filtered_2 = pendingToolIds.filter((toolUseId) => !answeredToolIds.has(toolUseId));
  if (filtered_2.length === 0) return;
  return createUserMessage({
    content: filtered_2.map((toolUseId) => ({
      type: "tool_result",
      tool_use_id: toolUseId,
      content: TOOL_RESULT_PENDING_PLACEHOLDER,
    })),
    isMeta: true,
  });
}
//@ chunk-pphytj9x.js:4422-5175 fingerprint (2.1.88 match: extractSideQuestionResponse, 0.78)
/**
 * 从 fork 输出整理旁路回答：文本（必要时附无工具/截断说明）；模型改调工具或 API 错误时给出合成说明。
 */
function extractSideQuestionResponse(messages) {
  let assistantBlocks = messages.flatMap((m) =>
    m.type === "assistant" && !m.isApiErrorMessage ? m.message.content : [],
  );
  let found = messages.find((message) => message.type === "assistant" && message.isApiErrorMessage === true);
  let text = extractTextContent_2(
    assistantBlocks,
    `

`,
  ).trim();
  if (text) {
    let notices = [
      ...(matchesFabricatedMarker(text) ? [BTW_NO_TOOLS_NOTICE] : []),
      ...(found ? [BTW_CUT_OFF_NOTICE] : []),
    ];
    return {
      response: [text, ...notices].join(`

`),
      synthetic: false,
    };
  }
  let toolUse = assistantBlocks.find((assistantBlock) => assistantBlock.type === "tool_use");
  if (toolUse)
    return {
      response: `(The model tried to call ${"name" in toolUse ? toolUse.name : "a tool"} instead of answering directly. Try rephrasing or ask in the main conversation.)`,
      synthetic: true,
    };
  let toolName = found
    ? extractTextContent_2(
        found.message.content,
        `

`,
      ).trim()
    : "";
  if (toolName)
    return {
      response: `(API error: ${toolName.startsWith(`${API_ERROR_MESSAGE_PREFIX}: `) ? toolName.slice(API_ERROR_MESSAGE_PREFIX.length + 2) : toolName})`,
      synthetic: true,
    };
  let apiErr = messages.find(isApiErrorSystemMessage);
  if (apiErr)
    return {
      response: `(API error: ${apiErr.error.formatted})`,
      synthetic: true,
    };
  return {
    response: null,
    synthetic: false,
  };
}
//@ chunk-pphytj9x.js:5175-5254 affinity
/**
 * 是否为 system/api_error 消息（重试状态与错误提示用）。
 */
function isApiErrorSystemMessage(message) {
  return message.type === "system" && "subtype" in message && message.subtype === "api_error";
}
export { findBtwTriggerPositions, runSideQuestion };
