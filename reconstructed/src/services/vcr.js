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
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  createHash as createHash_5,
  createHash as createHash_6,
  createHash as createHash_7,
  createHash as createHash_8,
  createHash as createHash_9,
  createHash as createHash_10,
  createHash as createHash_11,
  createHash as createHash_12,
  createHash as createHash_13,
  createHash as createHash_14,
  createHash as createHash_15,
  createHash as createHash_16,
  createHash as createHash_17,
  createHash as createHash_18,
  createHash as createHash_19,
  createHash as createHash_20,
  createHash as createHash_21,
  createHash as createHash_22,
  createHash as createHash_23,
  createHash as createHash_24,
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
} from "path";
import {
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  readFile as readFile_5,
  readFile as readFile_6,
  readFile as readFile_7,
  readFile as readFile_8,
  readFile as readFile_9,
  readFile as readFile_10,
  readFile as readFile_11,
  readFile as readFile_12,
  readFile as readFile_13,
  readFile as readFile_14,
  readFile as readFile_15,
  readFile as readFile_16,
  readFile as readFile_17,
  readFile as readFile_18,
  readFile as readFile_19,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  mkdir as mkdir_6,
  mkdir as mkdir_7,
  mkdir as mkdir_8,
  mkdir as mkdir_9,
  mkdir as mkdir_10,
  mkdir as mkdir_11,
  mkdir as mkdir_12,
  mkdir as mkdir_13,
  mkdir as mkdir_14,
  mkdir as mkdir_15,
  mkdir as mkdir_16,
  mkdir as mkdir_17,
  mkdir as mkdir_18,
  mkdir as mkdir_19,
  mkdir as mkdir_20,
  mkdir as mkdir_21,
  mkdir as mkdir_22,
  mkdir as mkdir_23,
  mkdir as mkdir_24,
  mkdir as mkdir_25,
  mkdir as mkdir_26,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  writeFile as writeFile_4,
  writeFile as writeFile_5,
  writeFile as writeFile_6,
  writeFile as writeFile_7,
  writeFile as writeFile_8,
  writeFile as writeFile_9,
  writeFile as writeFile_10,
  writeFile as writeFile_11,
  writeFile as writeFile_12,
  writeFile as writeFile_13,
  writeFile as writeFile_14,
  writeFile as writeFile_15,
  writeFile as writeFile_16,
  writeFile as writeFile_17,
  writeFile as writeFile_18,
} from "fs/promises";
import { jsonStringify, jsonParse } from "../utils/slowOperations.js";
import { env } from "../utils/env.js";
import { getCwd } from "../utils/cwd.js";
import { getErrnoCode } from "../utils/errors.js";
import { normalizeMessagesForAPI } from "../utils/messages.js";
import { calculateUSDCost } from "../utils/modelCost.js";
import { addToTotalSessionCost } from "../cost-tracker.js";
import { xr, mve } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { getClaudeConfigDir } from "../utils/envUtils.js";

/**
 * 计算 VCR 指纹时忽略的附件类型（环境、日期、模型、输出风格、会话上下文等易变内容）。
 */
//@ chunk-e6aww6q8.js:972881-973168 sole-consumer
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
/**
 * 恒返回 true。
 */
//@ chunk-e6aww6q8.js:973168-973192 sole-consumer
function alwaysTrue() {
  return !0;
}
/**
 * fixture 缺失时的提示（用 CLAUDE_CODE_TEST_ALLOW_REAL_NETWORK=1 录制）。
 */
//@ chunk-e6aww6q8.js:973192-973363 sole-consumer
function formatMissingFixtureMessage(e, n) {
  return `${e} missing: ${n}. Record it with \`CLAUDE_CODE_TEST_ALLOW_REAL_NETWORK=1 bun run test:file -- <this test file>\`, then commit the new fixture.`;
}
/**
 * 本构建恒为 false（测试专用的 VCR 被关闭）。
 */
//@ chunk-e6aww6q8.js:973363-973387 affinity
function isVcrEnabled() {
  return !1;
}
/**
 * 通用 fixture：VCR 开启时按输入哈希读写 fixtures/<名>-<hash>.json，否则直接执行。
 */
//@ chunk-e6aww6q8.js:973387-973792 fingerprint = withFixture (0.771)
async function withFixture(input, fixtureName, f) {
  if (!isVcrEnabled()) return await f();
  let hash = createHash_9("sha1").update(jsonStringify(input)).digest("hex").slice(0, 12),
    filename = join_45(
      env.CLAUDE_CODE_TEST_FIXTURES_ROOT ?? getCwd(),
      `fixtures/${fixtureName}-${hash}.json`,
    );
  try {
    return jsonParse(await readFile_10(filename, { encoding: "utf8" }));
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT") throw error;
  }
  if (!alwaysTrue()) throw Error(formatMissingFixtureMessage("Fixture", filename));
  let result = await f();
  return (
    await mkdir_12(dirname_25(filename), { recursive: !0 }),
    await writeFile_10(filename, jsonStringify(result, null, 2), { encoding: "utf8" }),
    result
  );
}
/**
 * API 消息 VCR：过滤易变附件、规整后按内容哈希录放 assistant 消息；未开启直接执行。
 */
//@ chunk-e6aww6q8.js:973792-974548 fingerprint = withVCR (0.718)
async function withVCR(messages, f) {
  if (!isVcrEnabled()) return await f();
  let messagesForAPI = normalizeMessagesForAPI(
      messages.filter((S) => {
        if (S.type === "attachment") return !VCR_IGNORED_ATTACHMENT_TYPES.has(S.attachment.type);
        if (S.type !== "user") return !0;
        if (S.isMeta) return !1;
        return !0;
      }),
    ),
    dehydratedInput = mapMessages(
      messagesForAPI.map((S) => S.message.content),
      dehydrateValue,
    ),
    filename = join_45(
      env.CLAUDE_CODE_TEST_FIXTURES_ROOT ?? getCwd(),
      `fixtures/${dehydratedInput.map((S) => createHash_9("sha1").update(jsonStringify(S)).digest("hex").slice(0, 6)).join("-")}.json`,
    );
  try {
    let cached = jsonParse(await readFile_10(filename, { encoding: "utf8" }));
    return (
      cached.output.forEach(addCachedCostToTotalSessionCost),
      cached.output.map((message, index) => mapMessage(message, hydrateValue, index, randomUUID_13()))
    );
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT") throw error;
  }
  if (!alwaysTrue())
    throw Error(`${formatMissingFixtureMessage("Anthropic API fixture", filename)} Input messages:
${jsonStringify(dehydratedInput, null, 2)}`);
  let results = await f();
  return (
    await mkdir_12(dirname_25(filename), { recursive: !0 }),
    await writeFile_10(
      filename,
      jsonStringify(
        {
          input: dehydratedInput,
          output: results.map((message, index) => mapMessage(message, dehydrateValue, index)),
        },
        null,
        2,
      ),
      { encoding: "utf8" },
    ),
    results
  );
}
/**
 * 回放的 assistant 消息按 usage 重新计价并计入会话成本。
 */
//@ chunk-e6aww6q8.js:974548-974657 callgraph-witnessed = addCachedCostToTotalSessionCost (0.476)
function addCachedCostToTotalSessionCost(message) {
  if (message.type !== "assistant") return;
  let model = message.message.model,
    usage = message.message.usage,
    costUSD = calculateUSDCost(model, usage);
  addToTotalSessionCost(costUSD, usage, model);
}
/**
 * 遍历消息内容（字符串或块数组、tool_result 内文本）做文本替换。
 */
//@ chunk-e6aww6q8.js:974657-975151 fingerprint = mapMessages (1)
function mapMessages(messages, f) {
  return messages.map((r) => {
    if (typeof r === "string") return f(r);
    return r.map((s) => {
      switch (s.type) {
        case "tool_result":
          if (typeof s.content === "string") return { ...s, content: f(s.content) };
          if (Array.isArray(s.content))
            return {
              ...s,
              content: s.content.map((h) => {
                switch (h.type) {
                  case "text":
                    return { ...h, text: f(h.text) };
                  case "image":
                    return h;
                  default:
                    return;
                }
              }),
            };
          return s;
        case "text":
          return { ...s, text: f(s.text) };
        case "tool_use":
          return { ...s, input: mapValuesDeep(s.input, f) };
        case "image":
          return redactImageData(s);
        default:
          return;
      }
    });
  });
}
/**
 * base64 图片数据替换成 [IMAGE_DATA]（fixture 脱敏）。
 */
//@ chunk-e6aww6q8.js:975151-975258 layout
function redactImageData(e) {
  if (e.source.type !== "base64") return e;
  return { ...e, source: { ...e.source, data: "[IMAGE_DATA]" } };
}
/**
 * 深度遍历对象/数组，对叶子值套用映射。
 */
//@ chunk-e6aww6q8.js:975258-975388 file-local
function mapValuesDeep(obj, f) {
  return xr(obj, (val, key) => {
    if (Array.isArray(val)) return val.map((h) => mapValuesDeep(h, f));
    if (mve(val)) return mapValuesDeep(val, f);
    return f(val, key, obj);
  });
}
/**
 * 把 assistant 消息规整为可录制形式（固定 uuid/requestId，内容做脱敏）。
 */
//@ chunk-e6aww6q8.js:975388-976012 fingerprint = mapAssistantMessage (0.662)
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
              return { ...h, text: f(h.text), citations: h.citations || [] };
            case "tool_use":
              return { ...h, input: mapValuesDeep(h.input, f) };
            default:
              return h;
          }
        })
        .filter(Boolean),
    },
    type: "assistant",
  };
}
/**
 * assistant 消息走 mapAssistantMessage，其他原样。
 */
//@ chunk-e6aww6q8.js:976012-976092 file-local
function mapMessage(message, f, index, uuid) {
  if (message.type === "assistant") return mapAssistantMessage(message, f, index, uuid);
  else return message;
}
/**
 * 录制前脱敏：文件数、耗时、成本、cwd、配置目录、UUID 等替换成占位符。
 */
//@ chunk-e6aww6q8.js:976092-976864 fingerprint = dehydrateValue (0.894)
function dehydrateValue(s_2) {
  if (typeof s_2 !== "string") return s_2;
  let cwd = getCwd(),
    configHome = getClaudeConfigDir(),
    s1 = s_2
      .replace(/num_files="\d+"/g, 'num_files="[NUM]"')
      .replace(/duration_ms="\d+"/g, 'duration_ms="[DURATION]"')
      .replace(/cost_usd="\d+"/g, 'cost_usd="[COST]"')
      .replaceAll(configHome, "[CONFIG_HOME]")
      .replaceAll(cwd, "[CWD]")
      .replace(/Available commands:.+/, "Available commands: [COMMANDS]");
  if (
    ((s1 = s1
      .replace(/\[CWD\][^\s"'<>]*/g, (match) => match.replaceAll("\\\\", "/").replaceAll("\\", "/"))
      .replace(/\[CONFIG_HOME\][^\s"'<>]*/g, (match) => match.replaceAll("\\\\", "/").replaceAll("\\", "/"))
      .replace(
        /\[CONFIG_HOME\]\/projects\/[^\s"'<>]*?\/tool-results\/mcp-([^\s"'<>/]*)-blob-\d+-[0-9a-z]+/g,
        "[CONFIG_HOME]/projects/[PROJECT]/tool-results/mcp-$1-blob-[ID]",
      )),
    s1.includes("Files modified by user:"))
  )
    return "Files modified by user: [FILES]";
  return s1;
}
/**
 * 回放时把占位符还原（[NUM]→1、[DURATION]→100、[CONFIG_HOME]、[CWD]）。
 */
//@ chunk-e6aww6q8.js:976864-977034 fingerprint = hydrateValue (1)
function hydrateValue(s) {
  if (typeof s !== "string") return s;
  return s
    .replaceAll("[NUM]", "1")
    .replaceAll("[DURATION]", "100")
    .replaceAll("[CONFIG_HOME]", getClaudeConfigDir())
    .replaceAll("[CWD]", getCwd());
}
/**
 * 流式查询的 VCR：录制时把事件收集起来（fallback 的 creditCode 清空），回放时补默认 refusedEffort。
 */
//@ chunk-e6aww6q8.js:977034-977439 layout
async function* withStreamVCR(e, n) {
  if (!isVcrEnabled()) return yield* n();
  let r = [],
    s = await withVCR(e, async () => {
      for await (let h of n())
        if (h.type === "fallback_request" && h.creditCode !== null) r.push({ ...h, creditCode: null });
        else r.push(h);
      return r;
    });
  if (s.length > 0) {
    yield* s.map((h) =>
      (h.type === "fallback_request" || h.type === "server_fallback") && h.refusedEffort === void 0
        ? { ...h, refusedEffort: { carry: null, withheld: "none_sent" } }
        : h,
    );
    return;
  }
  yield* r;
}
/**
 * token 计数请求的 VCR（按 messages+tools 脱敏哈希）。
 */
//@ chunk-e6aww6q8.js:977439-977825 fingerprint = withTokenCountVCR (1)
async function withTokenCountVCR(messages, tools, f) {
  if (!isVcrEnabled()) return await f();
  let cwdSlug = getCwd().replace(/[^a-zA-Z0-9]/g, "-"),
    dehydrated = dehydrateValue(jsonStringify({ messages: messages, tools: tools }))
      .replaceAll(cwdSlug, "[CWD_SLUG]")
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "[UUID]")
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?/g, "[TIMESTAMP]");
  return (await withFixture(dehydrated, "token-count", async () => ({ tokenCount: await f() }))).tokenCount;
}

export { withStreamVCR, withVCR, withTokenCountVCR };
