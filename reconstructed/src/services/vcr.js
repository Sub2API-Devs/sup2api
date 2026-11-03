/**
 * services/vcr.ts
 *
 * 测试用 VCR：录制/回放 API 响应与 token 计数到 fixtures 文件（本构建 isVcrEnabled 恒为假，运行时直接调用真实函数），以及缓存回放时把成本计入会话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/vcr.ts
 * pieces: chunk-e6aww6q8.js (16)
 * attribution: sole-consumer 3, affinity 1, fingerprint 7, callgraph-witnessed 1, layout 2, file-local 2
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
import { xr, mve } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { getClaudeConfigDir } from "../utils/envUtils.js";

//@ chunk-e6aww6q8.js:972881-973168 sole-consumer
/**
 * 计算 VCR 指纹时忽略的附件类型（环境、日期、模型、输出风格、会话上下文等易变内容）。
 */
var VCR_IGNORED_ATTACHMENT_TYPES = new Set([
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
//@ chunk-e6aww6q8.js:973168-973192 sole-consumer
/**
 * 恒返回 true。
 */
function alwaysTrue() {
  return true;
}
//@ chunk-e6aww6q8.js:973192-973363 sole-consumer
/**
 * fixture 缺失时的提示（用 CLAUDE_CODE_TEST_ALLOW_REAL_NETWORK=1 录制）。
 */
function formatMissingFixtureMessage(e, filename) {
  return `${e} missing: ${filename}. Record it with \`CLAUDE_CODE_TEST_ALLOW_REAL_NETWORK=1 bun run test:file -- <this test file>\`, then commit the new fixture.`;
}
//@ chunk-e6aww6q8.js:973363-973387 affinity
/**
 * 本构建恒为 false（测试专用的 VCR 被关闭）。
 */
function isVcrEnabled() {
  return false;
}
//@ chunk-e6aww6q8.js:973387-973792 fingerprint = withFixture (0.771)
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
//@ chunk-e6aww6q8.js:973792-974548 fingerprint = withVCR (0.718)
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
  let dehydratedInput = mapMessages(
    messagesForAPI.map((S) => S.message.content),
    dehydrateValue,
  );
  let filename = join(
    env.CLAUDE_CODE_TEST_FIXTURES_ROOT ?? getCwd(),
    `fixtures/${dehydratedInput.map((S) => createHash("sha1").update(jsonStringify(S)).digest("hex").slice(0, 6)).join("-")}.json`,
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
//@ chunk-e6aww6q8.js:974548-974657 callgraph-witnessed = addCachedCostToTotalSessionCost (0.476)
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
//@ chunk-e6aww6q8.js:974657-975151 fingerprint = mapMessages (1)
/**
 * 遍历消息内容（字符串或块数组、tool_result 内文本）做文本替换。
 */
function mapMessages(messages, f) {
  return messages.map((message) => {
    if (typeof message === "string") return f(message);
    return message.map((s) => {
      switch (s.type) {
        case "tool_result":
          if (typeof s.content === "string")
            return {
              ...s,
              content: f(s.content),
            };
          if (Array.isArray(s.content))
            return {
              ...s,
              content: s.content.map((h) => {
                switch (h.type) {
                  case "text":
                    return {
                      ...h,
                      text: f(h.text),
                    };
                  case "image":
                    return h;
                  default:
                    return;
                }
              }),
            };
          return s;
        case "text":
          return {
            ...s,
            text: f(s.text),
          };
        case "tool_use":
          return {
            ...s,
            input: mapValuesDeep(s.input, f),
          };
        case "image":
          return redactImageData(s);
        default:
          return;
      }
    });
  });
}
//@ chunk-e6aww6q8.js:975151-975258 layout
/**
 * base64 图片数据替换成 [IMAGE_DATA]（fixture 脱敏）。
 */
function redactImageData(e) {
  if (e.source.type !== "base64") return e;
  return {
    ...e,
    source: {
      ...e.source,
      data: "[IMAGE_DATA]",
    },
  };
}
//@ chunk-e6aww6q8.js:975258-975388 file-local
/**
 * 深度遍历对象/数组，对叶子值套用映射。
 */
function mapValuesDeep(obj, f) {
  return xr(obj, (val, key) => {
    if (Array.isArray(val)) return val.map((h) => mapValuesDeep(h, f));
    if (mve(val)) return mapValuesDeep(val, f);
    return f(val, key, obj);
  });
}
//@ chunk-e6aww6q8.js:975388-976012 fingerprint = mapAssistantMessage (0.662)
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
        .map((h) => {
          switch (h.type) {
            case "text":
              return {
                ...h,
                text: f(h.text),
                citations: h.citations || [],
              };
            case "tool_use":
              return {
                ...h,
                input: mapValuesDeep(h.input, f),
              };
            default:
              return h;
          }
        })
        .filter(Boolean),
    },
    type: "assistant",
  };
}
//@ chunk-e6aww6q8.js:976012-976092 file-local
/**
 * assistant 消息走 mapAssistantMessage，其他原样。
 */
function mapMessage(message, f, index, uuid) {
  if (message.type === "assistant") return mapAssistantMessage(message, f, index, uuid);
  else return message;
}
//@ chunk-e6aww6q8.js:976092-976864 fingerprint = dehydrateValue (0.894)
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
//@ chunk-e6aww6q8.js:976864-977034 fingerprint = hydrateValue (1)
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
//@ chunk-e6aww6q8.js:977034-977439 layout
/**
 * 流式查询的 VCR：录制时把事件收集起来（fallback 的 creditCode 清空），回放时补默认 refusedEffort。
 */
async function* withStreamVCR(messages, n) {
  if (!isVcrEnabled()) return yield* n();
  let r = [];
  let cachedBuffer = await withVCR(messages, async () => {
    for await (let h of n())
      if (h.type === "fallback_request" && h.creditCode !== null)
        r.push({
          ...h,
          creditCode: null,
        });
      else r.push(h);
    return r;
  });
  if (cachedBuffer.length > 0) {
    yield* cachedBuffer.map((h) =>
      (h.type === "fallback_request" || h.type === "server_fallback") && h.refusedEffort === undefined
        ? {
            ...h,
            refusedEffort: {
              carry: null,
              withheld: "none_sent",
            },
          }
        : h,
    );
    return;
  }
  yield* r;
}
//@ chunk-e6aww6q8.js:977439-977825 fingerprint = withTokenCountVCR (1)
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
export { withStreamVCR, withVCR, withTokenCountVCR };
