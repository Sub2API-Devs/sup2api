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
import { Pre } from "../../../bootstrap/sessionSlices.js";
import { errorMessage } from "../../../utils/errors.js";
import { logForDebugging } from "../../../utils/debug.js";
import { iLe } from "../../../cli/handlers/pluginEval/mockGuards.js";
import { getTotalCostUSD } from "../../../bootstrap/state.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { truncateToLength } from "../../../utils/stringUtils.js";

/**
 * 插件评测模拟应答器的常量（数量/字节上限、ABORT:/ERROR: 应答前缀），误归 utils/shell/prefix。
 */
//@ chunk-qchp9vrd.js:16809-16871 placement
var Lc = 40,
  Mc = 16384,
  MOCK_OUTPUT_MAX_CHARS = 49152,
  MOCK_HISTORY_MAX_CHARS = 240000,
  MOCK_ABORT_PREFIX = "ABORT:",
  MOCK_ERROR_PREFIX = "ERROR:";
/**
 * 插件评测的模拟应答：用 Haiku/默认模型按 responder 提示生成文本并计费（切分误归）。
 */
//@ chunk-qchp9vrd.js:16871-17508 placement = getCommandPrefixImpl (0.304)
async function runMockResponderQuery({
  server: server,
  tool: tool,
  responder: responder,
  prompt: prompt,
  input: input,
  history: history,
  model: model,
  credentials: credentials,
  signal: signal,
}) {
  let R = Zr();
  try {
    let preCheckResult = asSystemPrompt([
        buildMockResponderSystemPrompt(server, responder.abortWhen),
        prompt,
      ]),
      T = formatEarlierMockCalls(tool, input, history),
      N = {
        querySource: "plugin_eval_mock",
        agents: [],
        isNonInteractiveSession: !0,
        hasAppendSystemPrompt: !1,
        mcpTools: [],
        agentContext: mainAgentContext(),
        credentials: credentials,
      },
      prefix = model
        ? await queryHaiku({
            systemPrompt: preCheckResult,
            userPrompt: T,
            signal: signal,
            options: { ...N, model: model },
          })
        : await queryHaikuWithFallback({
            systemPrompt: preCheckResult,
            userPrompt: T,
            signal: signal,
            options: N,
          }),
      trimmed = extractTextContent_2(prefix.message.content).trim();
    if (Pre(prefix)) return logMockResponderFailure("model_call", trimmed, Zr() - R);
    let K = parseMockResponderReply(trimmed, fs(responder.abortWhen));
    return { ...K, text: truncateWithOmittedNote(K.text, MOCK_OUTPUT_MAX_CHARS), costUsd: Zr() - R };
  } catch (error) {
    return logMockResponderFailure("exception", errorMessage(error), Zr() - R);
  }
}
//@ chunk-qchp9vrd.js:17508-17683 placement
function logMockResponderFailure(e, n, r) {
  return (
    logForDebugging(`plugin eval: agent mock responder ${e}: ${n}`, { level: "warn" }),
    { verdict: "tool_error", text: `${iLe} (${e}) \u2014 see the eval debug log`, costUsd: r }
  );
}
//@ chunk-qchp9vrd.js:17683-17729 placement
function Zr() {
  try {
    return getTotalCostUSD();
  } catch {
    return 0;
  }
}
/**
 * 生成让代理扮演指定 MCP 服务器的系统提示词（含返回工具错误、abort_when 条件的约定）。
 */
//@ chunk-qchp9vrd.js:17729-18904 placement
function buildMockResponderSystemPrompt(e, n) {
  let r = [
    `You are standing in for the MCP server "${e}" inside an automated evaluation of a coding-agent plugin. Each user turn is one tool call the agent under test just made; earlier calls this run and your answers to them are listed first as history. Reply with ONLY the tool's result content, exactly as the real server would return it (JSON when the server returns JSON) \u2014 no commentary, no markdown fences unless the real result would contain them. Stay consistent with your earlier answers this run.`,
    `To return an ordinary tool ERROR the agent should handle (bad arguments, not found, rate limited), reply with a single line starting "${MOCK_ERROR_PREFIX} " followed by the error text.`,
  ];
  if (fs(n))
    r.push(`The evaluation author listed conditions under which this run must be STOPPED because the agent has gone off the rails. If \u2014 and only if \u2014 the current call meets one of them, reply with a single line starting "${MOCK_ABORT_PREFIX} " followed by a short reason naming the condition. The conditions:
${n.trim()}`);
  else r.push(`Never reply with a line starting "${MOCK_ABORT_PREFIX}".`);
  return (
    r.push("The author's description of the server you are playing follows."),
    r.join(`

`)
  );
}
/**
 * 列出本次运行早先的模拟调用作为上下文（超量时省略较早的）。
 */
//@ chunk-qchp9vrd.js:18904-19384 placement
function formatEarlierMockCalls(e, n, r) {
  let sliced = r.slice(-Lc),
    s = [],
    h = 0;
  for (let y = sliced.length - 1; y >= 0; y--) {
    let R = sliced[y],
      S = typeof R.input === "string" ? R.input : jsonStringify(R.input),
      T = `- ${R.tool}(${S}) \u2192 ${R.verdict === "ok" ? "" : `[${R.verdict}] `}${R.output}`;
    if (h + T.length > MOCK_HISTORY_MAX_CHARS) break;
    (s.unshift(T), (h += T.length));
  }
  let w = r.length - s.length,
    b = [];
  if (s.length > 0)
    b.push(`Earlier calls this run${w > 0 ? ` (${w} older omitted)` : ""}:
${s.join(`
`)}`);
  return (
    b.push(`Current call: ${e}
Arguments:
${truncateWithOmittedNote(jsonStringify(n, null, 2) ?? "null", Mc)}`),
    b.join(`

`)
  );
}
/**
 * 解析应答者回复：普通结果、工具错误或 abort（满足 abort_when）。
 */
//@ chunk-qchp9vrd.js:19384-19663 placement
function parseMockResponderReply(e, n) {
  if (e.startsWith(MOCK_ABORT_PREFIX)) {
    let r = e.slice(MOCK_ABORT_PREFIX.length).trim() || "abort_when condition met";
    return n ? { verdict: "abort", text: r } : { verdict: "tool_error", text: r };
  }
  if (e.startsWith(MOCK_ERROR_PREFIX))
    return { verdict: "tool_error", text: e.slice(MOCK_ERROR_PREFIX.length).trim() || "error" };
  return { verdict: "ok", text: e };
}
//@ chunk-qchp9vrd.js:19663-19759 placement
function truncateWithOmittedNote(e, n) {
  return e.length > n ? `${truncateToLength(e, n)}\u2026 [${e.length - n} more characters omitted]` : e;
}
//@ chunk-qchp9vrd.js:19759-19805 placement
function fs(e) {
  return e !== null && e.trim() !== "";
}

export { MOCK_OUTPUT_MAX_CHARS, runMockResponderQuery };
