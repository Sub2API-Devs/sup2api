/**
 * services/pluginEval/mocks/agentMockResponder.ts
 *
 * 2.1.316 新增：plugin eval 中由代理扮演 MCP 服务器的"模拟应答者"提示词与结果解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (9)
 * attribution: placement 9
 */
import { asSystemPrompt } from "../../../utils/systemPromptType.js";
import { mainAgentContext } from "../../../utils/agentContext.js";
import { queryHaiku, queryHaikuWithFallback } from "../../api/claude.js";
import { extractTextContent_2 } from "../../../utils/messages.js";
import { isSyntheticModelApiErrorMessage } from "../../../bootstrap/sessionSlices.js";
import { errorMessage } from "../../../utils/errors.js";
import { logForDebugging } from "../../../utils/debug.js";
import { MOCK_RESPONDER_FAILED_TEXT } from "../../../cli/handlers/pluginEval/mockGuards.js";
import { getTotalCostUSD } from "../../../bootstrap/state.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { truncateToLength } from "../../../utils/stringUtils.js";

//@ chunk-qchp9vrd.js:16809-16871 placement
/**
 * 回显参数的最大字符数（16384）。
 */
var MAX_STDERR_TAIL_LINES = 40;
var MAX_ARGS_ECHO_CHARS = 16384;
var MOCK_OUTPUT_MAX_CHARS = 49152;
var MOCK_HISTORY_MAX_CHARS = 240000;
var MOCK_ABORT_PREFIX = "ABORT:";
var MOCK_ERROR_PREFIX = "ERROR:";
//@ chunk-qchp9vrd.js:16871-17508 placement = getCommandPrefixImpl (0.304)
/**
 * 插件评测的模拟应答：用 Haiku/默认模型按 responder 提示生成文本并计费（切分误归）。
 */
async function runMockResponderQuery({
  server,
  tool,
  responder,
  prompt,
  input,
  history,
  model,
  credentials,
  signal,
}) {
  let startCostUsd = currentCostUsd();
  try {
    let preCheckResult = asSystemPrompt([
      buildMockResponderSystemPrompt(server, responder.abortWhen),
      prompt,
    ]);
    let userPrompt = formatEarlierMockCalls(tool, input, history);
    let queryOptions = {
      querySource: "plugin_eval_mock",
      agents: [],
      isNonInteractiveSession: true,
      hasAppendSystemPrompt: false,
      mcpTools: [],
      agentContext: mainAgentContext(),
      credentials,
    };
    let prefix = model
      ? await queryHaiku({
          systemPrompt: preCheckResult,
          userPrompt,
          signal,
          options: {
            ...queryOptions,
            model,
          },
        })
      : await queryHaikuWithFallback({
          systemPrompt: preCheckResult,
          userPrompt,
          signal,
          options: queryOptions,
        });
    let trimmed = extractTextContent_2(prefix.message.content).trim();
    if (isSyntheticModelApiErrorMessage(prefix))
      return logMockResponderFailure("model_call", trimmed, currentCostUsd() - startCostUsd);
    let mockResponderReply = parseMockResponderReply(trimmed, isNonEmptyText(responder.abortWhen));
    return {
      ...mockResponderReply,
      text: truncateWithOmittedNote(mockResponderReply.text, MOCK_OUTPUT_MAX_CHARS),
      costUsd: currentCostUsd() - startCostUsd,
    };
  } catch (error) {
    return logMockResponderFailure("exception", errorMessage(error), currentCostUsd() - startCostUsd);
  }
}
//@ chunk-qchp9vrd.js:17508-17683 placement
function logMockResponderFailure(failureKind, detail, costUsd) {
  logForDebugging(`plugin eval: agent mock responder ${failureKind}: ${detail}`, {
    level: "warn",
  });
  return {
    verdict: "tool_error",
    text: `${MOCK_RESPONDER_FAILED_TEXT} (${failureKind}) \u2014 see the eval debug log`,
    costUsd,
  };
}
//@ chunk-qchp9vrd.js:17683-17729 placement
/**
 * 取当前累计花费（出错返回 0）。
 */
function currentCostUsd() {
  try {
    return getTotalCostUSD();
  } catch {
    return 0;
  }
}
//@ chunk-qchp9vrd.js:17729-18904 placement
/**
 * 生成让代理扮演指定 MCP 服务器的系统提示词（含返回工具错误、abort_when 条件的约定）。
 */
function buildMockResponderSystemPrompt(server, text) {
  let lines = [
    `You are standing in for the MCP server "${server}" inside an automated evaluation of a coding-agent plugin. Each user turn is one tool call the agent under test just made; earlier calls this run and your answers to them are listed first as history. Reply with ONLY the tool's result content, exactly as the real server would return it (JSON when the server returns JSON) \u2014 no commentary, no markdown fences unless the real result would contain them. Stay consistent with your earlier answers this run.`,
    `To return an ordinary tool ERROR the agent should handle (bad arguments, not found, rate limited), reply with a single line starting "${MOCK_ERROR_PREFIX} " followed by the error text.`,
  ];
  if (isNonEmptyText(text))
    lines.push(`The evaluation author listed conditions under which this run must be STOPPED because the agent has gone off the rails. If \u2014 and only if \u2014 the current call meets one of them, reply with a single line starting "${MOCK_ABORT_PREFIX} " followed by a short reason naming the condition. The conditions:
${text.trim()}`);
  else lines.push(`Never reply with a line starting "${MOCK_ABORT_PREFIX}".`);
  lines.push("The author's description of the server you are playing follows.");
  return lines.join(`

`);
}
//@ chunk-qchp9vrd.js:18904-19384 placement
/**
 * 列出本次运行早先的模拟调用作为上下文（超量时省略较早的）。
 */
function formatEarlierMockCalls(tool, input, history) {
  let sliced = history.slice(-MAX_STDERR_TAIL_LINES);
  let keptLines = [];
  let charCount = 0;
  for (let j = sliced.length - 1; j >= 0; j--) {
    let historyEntry = sliced[j];
    let inputJson =
      typeof historyEntry.input === "string" ? historyEntry.input : jsonStringify(historyEntry.input);
    let line = `- ${historyEntry.tool}(${inputJson}) \u2192 ${historyEntry.verdict === "ok" ? "" : `[${historyEntry.verdict}] `}${historyEntry.output}`;
    if (charCount + line.length > MOCK_HISTORY_MAX_CHARS) break;
    keptLines.unshift(line);
    charCount += line.length;
  }
  let omittedCount = history.length - keptLines.length;
  let parts = [];
  if (keptLines.length > 0)
    parts.push(`Earlier calls this run${omittedCount > 0 ? ` (${omittedCount} older omitted)` : ""}:
${keptLines.join(`
`)}`);
  parts.push(`Current call: ${tool}
Arguments:
${truncateWithOmittedNote(jsonStringify(input, null, 2) ?? "null", MAX_ARGS_ECHO_CHARS)}`);
  return parts.join(`

`);
}
//@ chunk-qchp9vrd.js:19384-19663 placement
/**
 * 解析应答者回复：普通结果、工具错误或 abort（满足 abort_when）。
 */
function parseMockResponderReply(reply, abortWhenDeclared) {
  if (reply.startsWith(MOCK_ABORT_PREFIX)) {
    let text = reply.slice(MOCK_ABORT_PREFIX.length).trim() || "abort_when condition met";
    return abortWhenDeclared
      ? {
          verdict: "abort",
          text,
        }
      : {
          verdict: "tool_error",
          text,
        };
  }
  if (reply.startsWith(MOCK_ERROR_PREFIX))
    return {
      verdict: "tool_error",
      text: reply.slice(MOCK_ERROR_PREFIX.length).trim() || "error",
    };
  return {
    verdict: "ok",
    text: reply,
  };
}
//@ chunk-qchp9vrd.js:19663-19759 placement
function truncateWithOmittedNote(text, maxChars) {
  return text.length > maxChars
    ? `${truncateToLength(text, maxChars)}\u2026 [${text.length - maxChars} more characters omitted]`
    : text;
}
//@ chunk-qchp9vrd.js:19759-19805 placement
/**
 * 判断字符串非空。
 */
function isNonEmptyText(text) {
  return text !== null && text.trim() !== "";
}
export { MOCK_OUTPUT_MAX_CHARS, runMockResponderQuery };
