/**
 * services/vcr.ts
 *
 * 测试用 VCR：录制/回放 API 响应与 token 计数到 fixtures 文件（本构建 isVcrEnabled 恒为假，运行时直接调用真实函数），以及缓存回放时把成本计入会话。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/vcr.ts
 * pieces: chunk-5xgkngpb.js (16)
 * attribution: sole-consumer 3, affinity 1, fingerprint 6, callgraph-witnessed 1, layout 3, file-local 2
 */
import { createHash, randomUUID } from "crypto";
import { join, dirname } from "path";
import { readFile, mkdir, writeFile } from "fs/promises";
import { jsonStringify, jsonParse } from "../utils/slowOperations.js";
import { env } from "../utils/env.js";
import { getCwd } from "../utils/cwd.js";
import { getErrnoCode } from "../utils/errors.js";
import { normalizeMessagesForAPI } from "../utils/messages.js";
import { calculateUSDCost } from "../utils/modelCost.js";
import { addToTotalSessionCost } from "../cost-tracker.js";
import { import_mapValues, import_isPlainObject } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { getClaudeConfigDir } from "../utils/markdownConfigLoader.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:986198-986485 sole-consumer
/**
 * 计算 VCR 指纹时忽略的附件类型（环境、日期、模型、输出风格、会话上下文等易变内容）。
 */
var VCR_IGNORED_ATTACHMENT_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:986198", () => {
  VCR_IGNORED_ATTACHMENT_TYPES = new Set([
    "agent_listing_delta",
    "sandbox_instructions",
    "environment",
    "model",
    "output_style_instructions",
    "language",
    "session_context",
    "coordinator_context",
    "context_sections",
    "date",
    "instructions",
    "remote_session_change",
    "advisor_tool",
    "prompt_snapshot",
    "deferred_tools_record",
  ]);
});
//@ chunk-5xgkngpb.js:986485-986509 sole-consumer
/**
 * 恒返回 true。
 */
function alwaysTrue() {
  return true;
}
//@ chunk-5xgkngpb.js:986509-986680 sole-consumer
/**
 * fixture 缺失时的提示（用 CLAUDE_CODE_TEST_ALLOW_REAL_NETWORK=1 录制）。
 */
function formatMissingFixtureMessage(label, filename) {
  return `${label} missing: ${filename}. Record it with \`CLAUDE_CODE_TEST_ALLOW_REAL_NETWORK=1 bun run test:file -- <this test file>\`, then commit the new fixture.`;
}
//@ chunk-5xgkngpb.js:986680-986703 affinity
/**
 * 本构建恒为 false（测试专用的 VCR 被关闭）。
 */
function isVcrEnabled() {
  return false;
}
//@ chunk-5xgkngpb.js:986703-987107 fingerprint (2.1.88 match: withFixture, 0.771)
/**
 * 通用 fixture：VCR 开启时按输入哈希读写 fixtures/<名>-<hash>.json，否则直接执行。
 */
async function withFixture(input, fixtureName, f) {
  if (!isVcrEnabled()) return await f();
  let hash = createHash("sha1").update(jsonStringify(input)).digest("hex").slice(0, 12);
  let filename = join(env.CLAUDE_CODE_TEST_FIXTURES_ROOT ?? getCwd(), `fixtures/${fixtureName}-${hash}.json`);
  try {
    return jsonParse(
      await readFile(filename, {
        encoding: "utf8",
      }),
    );
  } catch (e) {
    if (getErrnoCode(e) !== "ENOENT") throw e;
  }
  if (!alwaysTrue()) throw Error(formatMissingFixtureMessage("Fixture", filename));
  let result = await f();
  await mkdir(dirname(filename), {
    recursive: true,
  });
  await writeFile(filename, jsonStringify(result, null, 2), {
    encoding: "utf8",
  });
  return result;
}
//@ chunk-5xgkngpb.js:987107-987862 fingerprint (2.1.88 match: withVCR, 0.718)
/**
 * API 消息 VCR：过滤易变附件、规整后按内容哈希录放 assistant 消息；未开启直接执行。
 */
async function withVCR(messages, f) {
  if (!isVcrEnabled()) return await f();
  let messagesForAPI = normalizeMessagesForAPI(
    messages.filter((message) => {
      if (message.type === "attachment") return !VCR_IGNORED_ATTACHMENT_TYPES.has(message.attachment.type);
      if (message.type !== "user") return true;
      if (message.isMeta) return false;
      return true;
    }),
  );
  let dehydratedInput = dehydrateMessages(
    messagesForAPI.map((message) => message.message.content),
    dehydrateValue,
  );
  let filename = join(
    env.CLAUDE_CODE_TEST_FIXTURES_ROOT ?? getCwd(),
    `fixtures/${dehydratedInput.map((content) => createHash("sha1").update(jsonStringify(content)).digest("hex").slice(0, 6)).join("-")}.json`,
  );
  try {
    let cached = jsonParse(
      await readFile(filename, {
        encoding: "utf8",
      }),
    );
    cached.output.forEach(addCachedCostToTotalSessionCost);
    return cached.output.map((message, index) => mapMessage(message, hydrateValue, index, randomUUID()));
  } catch (e) {
    if (getErrnoCode(e) !== "ENOENT") throw e;
  }
  if (!alwaysTrue())
    throw Error(`${formatMissingFixtureMessage("Anthropic API fixture", filename)} Input messages:
${jsonStringify(dehydratedInput, null, 2)}`);
  let results = await f();
  await mkdir(dirname(filename), {
    recursive: true,
  });
  await writeFile(
    filename,
    jsonStringify(
      {
        input: dehydratedInput,
        output: results.map((message, index) => mapMessage(message, dehydrateValue, index)),
      },
      null,
      2,
    ),
    {
      encoding: "utf8",
    },
  );
  return results;
}
//@ chunk-5xgkngpb.js:987862-987971 callgraph-witnessed (2.1.88 match: addCachedCostToTotalSessionCost, 0.475)
/**
 * 回放的 assistant 消息按 usage 重新计价并计入会话成本。
 */
function addCachedCostToTotalSessionCost(message) {
  if (message.type !== "assistant") return;
  let model = message.message.model;
  let usage = message.message.usage;
  let costUSD = calculateUSDCost(model, usage);
  addToTotalSessionCost(costUSD, usage, model);
}
//@ chunk-5xgkngpb.js:987971-988465 layout (2.1.88 match: _temp, 1)
/**
 * 遍历消息内容（字符串或块数组、tool_result 内文本）做文本替换。
 */
function dehydrateMessages(messages, dehydrateValue) {
  return messages.map((entry) => {
    if (typeof entry === "string") return dehydrateValue(entry);
    return entry.map((block) => {
      switch (block.type) {
        case "tool_result":
          if (typeof block.content === "string")
            return {
              ...block,
              content: dehydrateValue(block.content),
            };
          if (Array.isArray(block.content))
            return {
              ...block,
              content: block.content.map((nested) => {
                switch (nested.type) {
                  case "text":
                    return {
                      ...nested,
                      text: dehydrateValue(nested.text),
                    };
                  case "image":
                    return nested;
                  default:
                    return;
                }
              }),
            };
          return block;
        case "text":
          return {
            ...block,
            text: dehydrateValue(block.text),
          };
        case "tool_use":
          return {
            ...block,
            input: mapValuesDeep(block.input, dehydrateValue),
          };
        case "image":
          return redactImageData(block);
        default:
          return;
      }
    });
  });
}
//@ chunk-5xgkngpb.js:988465-988572 layout
/**
 * base64 图片数据替换成 [IMAGE_DATA]（fixture 脱敏）。
 */
function redactImageData(block) {
  if (block.source.type !== "base64") return block;
  return {
    ...block,
    source: {
      ...block.source,
      data: "[IMAGE_DATA]",
    },
  };
}
//@ chunk-5xgkngpb.js:988572-988702 file-local
/**
 * 深度遍历对象/数组，对叶子值套用映射。
 */
function mapValuesDeep(obj, f) {
  return import_mapValues(obj, (val, key) => {
    if (Array.isArray(val)) return val.map((item) => mapValuesDeep(item, f));
    if (import_isPlainObject(val)) return mapValuesDeep(val, f);
    return f(val, key, obj);
  });
}
//@ chunk-5xgkngpb.js:988702-989326 fingerprint (2.1.88 match: mapAssistantMessage, 0.627)
/**
 * 把 assistant 消息规整为可录制形式（固定 uuid/requestId，内容做脱敏）。
 */
function mapAssistantMessage(message, f, index, uuid) {
  return {
    uuid: uuid ?? `UUID-${index}`,
    requestId: "REQUEST_ID",
    timestamp: message.timestamp,
    isApiErrorMessage: message.isApiErrorMessage,
    apiError: message.apiError,
    apiErrorParams: message.apiErrorParams,
    apiErrorCode: message.apiErrorCode,
    error: message.error,
    errorDetails: message.errorDetails,
    truncatedAfterOutput: message.truncatedAfterOutput,
    healsDistinctCarrier: message.healsDistinctCarrier,
    isAbortedMidStream: message.isAbortedMidStream,
    message: {
      ...message.message,
      content: message.message.content
        .map((block) => {
          switch (block.type) {
            case "text":
              return {
                ...block,
                text: f(block.text),
                citations: block.citations || [],
              };
            case "tool_use":
              return {
                ...block,
                input: mapValuesDeep(block.input, f),
              };
            default:
              return block;
          }
        })
        .filter(Boolean),
    },
    type: "assistant",
  };
}
//@ chunk-5xgkngpb.js:989326-989406 file-local
/**
 * assistant 消息走 mapAssistantMessage，其他原样。
 */
function mapMessage(message, f, index, uuid) {
  if (message.type === "assistant") return mapAssistantMessage(message, f, index, uuid);
  else return message;
}
//@ chunk-5xgkngpb.js:989406-990178 fingerprint (2.1.88 match: dehydrateValue, 0.894)
/**
 * 录制前脱敏：文件数、耗时、成本、cwd、配置目录、UUID 等替换成占位符。
 */
function dehydrateValue(s_2) {
  if (typeof s_2 !== "string") return s_2;
  let cwd = getCwd();
  let configHome = getClaudeConfigDir();
  let s1 = s_2
    .replace(/num_files="\d+"/g, 'num_files="[NUM]"')
    .replace(/duration_ms="\d+"/g, 'duration_ms="[DURATION]"')
    .replace(/cost_usd="\d+"/g, 'cost_usd="[COST]"')
    .replaceAll(configHome, "[CONFIG_HOME]")
    .replaceAll(cwd, "[CWD]")
    .replace(/Available commands:.+/, "Available commands: [COMMANDS]");
  s1 = s1
    .replace(/\[CWD\][^\s"'<>]*/g, (match) => match.replaceAll("\\\\", "/").replaceAll("\\", "/"))
    .replace(/\[CONFIG_HOME\][^\s"'<>]*/g, (match) => match.replaceAll("\\\\", "/").replaceAll("\\", "/"))
    .replace(
      /\[CONFIG_HOME\]\/projects\/[^\s"'<>]*?\/tool-results\/mcp-([^\s"'<>/]*)-blob-\d+-[0-9a-z]+/g,
      "[CONFIG_HOME]/projects/[PROJECT]/tool-results/mcp-$1-blob-[ID]",
    );
  if (s1.includes("Files modified by user:")) return "Files modified by user: [FILES]";
  return s1;
}
//@ chunk-5xgkngpb.js:990178-990348 fingerprint (2.1.88 match: hydrateValue, 1)
/**
 * 回放时把占位符还原（[NUM]→1、[DURATION]→100、[CONFIG_HOME]、[CWD]）。
 */
function hydrateValue(s) {
  if (typeof s !== "string") return s;
  return s
    .replaceAll("[NUM]", "1")
    .replaceAll("[DURATION]", "100")
    .replaceAll("[CONFIG_HOME]", getClaudeConfigDir())
    .replaceAll("[CWD]", getCwd());
}
//@ chunk-5xgkngpb.js:990348-990752 layout
/**
 * 流式查询的 VCR：录制时把事件收集起来（fallback 的 creditCode 清空），回放时补默认 refusedEffort。
 */
async function* withStreamVCR(messages, runStream) {
  if (!isVcrEnabled()) return yield* runStream();
  let collected = [];
  let cachedBuffer = await withVCR(messages, async () => {
    for await (let event of runStream())
      if (event.type === "fallback_request" && event.creditCode !== null)
        collected.push({
          ...event,
          creditCode: null,
        });
      else collected.push(event);
    return collected;
  });
  if (cachedBuffer.length > 0) {
    yield* cachedBuffer.map((event) =>
      (event.type === "fallback_request" || event.type === "server_fallback") &&
      event.refusedEffort === undefined
        ? {
            ...event,
            refusedEffort: {
              carry: null,
              withheld: "none_sent",
            },
          }
        : event,
    );
    return;
  }
  yield* collected;
}
//@ chunk-5xgkngpb.js:990752-991137 fingerprint (2.1.88 match: withTokenCountVCR, 1)
/**
 * token 计数请求的 VCR（按 messages+tools 脱敏哈希）。
 */
async function withTokenCountVCR(messages, tools, f) {
  if (!isVcrEnabled()) return await f();
  let cwdSlug = getCwd().replace(/[^a-zA-Z0-9]/g, "-");
  let dehydrated = dehydrateValue(
    jsonStringify({
      messages,
      tools,
    }),
  )
    .replaceAll(cwdSlug, "[CWD_SLUG]")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "[UUID]")
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?/g, "[TIMESTAMP]");
  return (
    await withFixture(dehydrated, "token-count", async () => ({
      tokenCount: await f(),
    }))
  ).tokenCount;
}
export { withStreamVCR, isVcrEnabled, withVCR, withTokenCountVCR };
