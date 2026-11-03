/**
 * utils/mcp/dateTimeParser.ts
 *
 * 用小模型把自然语言日期/时间解析为 ISO 8601，供 elicitation 表单的日期字段。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/mcp/dateTimeParser.ts
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { asSystemPrompt } from "../systemPromptType.js";
import { queryHaikuWithFallback } from "../../services/api/claude.js";
import { mainAgentContext } from "../agentContext.js";
import { extractTextContent_2 } from "../messages.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../log.js";

//@ chunk-18hwfzwa.js:1199300-1201454 fingerprint = parseNaturalLanguageDateTime (0.95)
/**
 * parseNaturalLanguageDateTime：用小模型（querySource mcp_datetime_parse）把自然语言日期/时间转成 ISO 8601，无法解析返回失败；用于 elicitation 表单的 date/date-time 字段。
 */
async function parseNaturalLanguageDateTime(input, format, signal, credentials) {
  let now = new Date();
  let currentDateTime = now.toISOString();
  let timezoneOffset = -now.getTimezoneOffset();
  let tzHours = Math.floor(Math.abs(timezoneOffset) / 60);
  let tzMinutes = Math.abs(timezoneOffset) % 60;
  let timezone = `${timezoneOffset >= 0 ? "+" : "-"}${String(tzHours).padStart(2, "0")}:${String(tzMinutes).padStart(2, "0")}`;
  let dayOfWeek = now.toLocaleDateString("en-US", {
    weekday: "long",
  });
  let systemPrompt = asSystemPrompt([
    "You are a date/time parser that converts natural language into ISO 8601 format.",
    "You MUST respond with ONLY the ISO 8601 formatted string, with no explanation or additional text.",
    "If the input is ambiguous, prefer future dates over past dates.",
    "For times without dates, use today's date.",
    "For dates without times, do not include a time component.",
    'If the input is incomplete or you cannot confidently parse it into a valid date, respond with exactly "INVALID" (nothing else).',
    'Examples of INVALID input: partial dates like "2025-01-", lone numbers like "13", gibberish.',
    'Examples of valid natural language: "tomorrow", "next Monday", "jan 1st 2025", "in 2 hours", "yesterday".',
  ]);
  let outputFormat =
    format === "date"
      ? "YYYY-MM-DD (date only, no time)"
      : `YYYY-MM-DDTHH:MM:SS${timezone} (full date-time with timezone)`;
  let userPrompt = `Current context:
- Current date and time: ${currentDateTime} (UTC)
- Local timezone: ${timezone}
- Day of week: ${dayOfWeek}

User input: "${input}"

Output format: ${outputFormat}

Parse the user's input into ISO 8601 format. Return ONLY the formatted string, or "INVALID" if the input is incomplete or unparseable.`;
  try {
    let result = await queryHaikuWithFallback({
      systemPrompt,
      userPrompt,
      signal,
      options: {
        querySource: "mcp_datetime_parse",
        agents: [],
        isNonInteractiveSession: false,
        hasAppendSystemPrompt: false,
        mcpTools: [],
        enablePromptCaching: false,
        agentContext: mainAgentContext(),
        credentials,
      },
    });
    let parsedText = extractTextContent_2(result.message.content).trim();
    if (!parsedText || parsedText === "INVALID") {
      logFeatureBad("mcp_elicitation_nl_datetime_parse", "parse_failed");
      return {
        success: false,
        error: "Unable to parse date/time from input",
      };
    }
    if (!/^\d{4}/.test(parsedText)) {
      logFeatureBad("mcp_elicitation_nl_datetime_parse", "parse_failed");
      return {
        success: false,
        error: "Unable to parse date/time from input",
      };
    }
    logFeatureOk("mcp_elicitation_nl_datetime_parse");
    return {
      success: true,
      value: parsedText,
    };
  } catch (error) {
    if (!signal.aborted) {
      logFeatureBad("mcp_elicitation_nl_datetime_parse", "haiku_error");
      logError(error);
    }
    return {
      success: false,
      error: "Unable to parse date/time. Please enter in ISO 8601 format manually.",
    };
  }
}
export { parseNaturalLanguageDateTime };
