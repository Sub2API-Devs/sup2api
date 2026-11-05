/**
 * services/claudeGateway/bedrockGuardrails.ts
 *
 * 2.1.316 新增：Bedrock guardrails 配置与应用
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (19)
 * attribution: placement 19
 */
import { randomBytes } from "crypto";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_node_http_handler } from "../../../vendor/@smithy/node-http-handler/dist-cjs/index.js";
import {
  isBaseModelKey,
  parseModelId,
  strip1mSuffix,
  stripAnyVersatileSuffix,
} from "../../utils/model/modelIds.js";
import {
  classifyModelListEntry,
  modelEntryMatches,
  isLatestAlias,
  parseDeniedModelEntry,
} from "../../utils/model/deniedModels.js";
import { deniedModelsEntryMatches } from "../../utils/model/modelAllowlist.js";
import { getAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { gatewayJsonLog } from "../gateway/gatewayBanner.js";
import { isPlainObject as isPlainObject_2 } from "../../utils/objectUtils.js";
import { pickByHelper } from "../../utils/git/gitSafeEnv.js";
import { pickAlias } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1hnjmk23.js:1338404-1338529 placement
/**
 * Bedrock guardrail 输入标记的四种范围。
 */
var AMAZON_BEDROCK_GUARDRAILS_GUARDCONTENT = "amazon-bedrock-guardrails-guardContent";
var GUARDRAIL_INPUT_TAGGING_MODES = [
  "last_message",
  "user_messages",
  "all_messages",
  "all_messages_and_system",
];
//@ chunk-1hnjmk23.js:1338529-1338600 placement
/**
 * 判断值是否为普通对象（非 null、非数组）。
 */
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
//@ chunk-1hnjmk23.js:1338600-1338650 placement
/**
 * 判断内容块是否属于 assistant 消息（块上有 role==="assistant"）。
 */
function isAssistantMessageBlock(message) {
  return isPlainObject(message) && message.role === "assistant";
}
//@ chunk-1hnjmk23.js:1338650-1338756 placement
/**
 * 把文本包进 Bedrock guardContent 标签（带随机后缀），空文本不包。
 */
function wrapGuardContent(counter, text) {
  if (text.trim() === "") return text;
  counter.used = true;
  return `<${AMAZON_BEDROCK_GUARDRAILS_GUARDCONTENT}_${counter.suffix}>${text}</${AMAZON_BEDROCK_GUARDRAILS_GUARDCONTENT}_${counter.suffix}>`;
}
//@ chunk-1hnjmk23.js:1338756-1338857 placement
/**
 * 包裹消息内容（字符串或内容块数组）。
 */
function wrapContent(counter, content) {
  if (typeof content === "string") return wrapGuardContent(counter, content);
  return Array.isArray(content) ? content.map((block) => wrapContentBlock(counter, block)) : content;
}
//@ chunk-1hnjmk23.js:1338857-1338927 placement
/**
 * 给消息的 content 套上 guardrail 标签（无 content 的消息原样返回）。
 */
function wrapMessageContentBlocks(counter, block) {
  return "content" in block
    ? {
        ...block,
        content: wrapContent(counter, block.content),
      }
    : block;
}
//@ chunk-1hnjmk23.js:1338927-1339334 placement
/**
 * 包裹单个内容块：文本、文档（含上下文）、工具/搜索结果。
 */
function wrapContentBlock(counter, block) {
  if (!isPlainObject(block)) return block;
  if (block.type === "text" && typeof block.text === "string")
    return {
      ...block,
      text: wrapGuardContent(counter, block.text),
    };
  if (block.type === "document" && isPlainObject(block.source)) {
    let { source, context } = block;
    return {
      ...block,
      ...(typeof context === "string" && {
        context: wrapGuardContent(counter, context),
      }),
      source:
        source.type === "text" && typeof source.data === "string"
          ? {
              ...source,
              data: wrapGuardContent(counter, source.data),
            }
          : wrapMessageContentBlocks(counter, source),
    };
  }
  return block.type === "tool_result" || block.type === "search_result" || block.type === "mcp_tool_result"
    ? wrapMessageContentBlocks(counter, block)
    : block;
}
//@ chunk-1hnjmk23.js:1339334-1339976 placement
/**
 * 按模式（最后一条/用户消息/全部/含 system）给请求加 guardContent 标签与 guardrailConfig；没有包裹任何内容时原样返回。
 */
function applyBedrockGuardrails(body, inputTagging) {
  if (!Array.isArray(body.messages)) return body;
  let messages = body.messages;
  let counter = {
    suffix: randomBytes(10).toString("hex"),
    used: false,
  };
  let lastAssistantEnd = messages.findLastIndex((message) => !isAssistantMessageBlock(message)) + 1;
  let lastAssistantStart = messages.slice(0, lastAssistantEnd).findLastIndex(isAssistantMessageBlock) + 1;
  let tagged = {
    ...body,
    ...(inputTagging === "all_messages_and_system" &&
      body.system !== undefined && {
        system: wrapContent(counter, body.system),
      }),
    messages: messages.map((message, index) =>
      isPlainObject(message) &&
      (inputTagging === "all_messages_and_system" ||
        (message.role !== "system" &&
          (inputTagging === "all_messages" ||
            (inputTagging === "user_messages"
              ? !isAssistantMessageBlock(message)
              : index >= lastAssistantStart && index < lastAssistantEnd))))
        ? {
            ...message,
            content: wrapContent(counter, message.content),
          }
        : message,
    ),
    "amazon-bedrock-guardrailConfig": {
      tagSuffix: counter.suffix,
    },
  };
  if (!counter.used && inputTagging === "last_message")
    tagged.messages = messages.map((message, index) =>
      isPlainObject(message) &&
      message.role === "system" &&
      index >= lastAssistantStart &&
      index < lastAssistantEnd
        ? {
            ...message,
            content: wrapContent(counter, message.content),
          }
        : message,
    );
  return counter.used ? tagged : body;
}
//@ chunk-1hnjmk23.js:1339976-1339994 placement
/**
 * 导入的转义正则工具模块；本文件未直接使用。
 */
var escapeRegExpModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1hnjmk23.js:1339976", () => {
  escapeRegExpModule = __toESM(require_node_http_handler(), 1);
});
//@ chunk-1hnjmk23.js:1339994-1340179 placement
/**
 * 字符串中是否以完整词出现某片段。
 */
function containsWholeWord(text, word) {
  for (let index = text.indexOf(word); index !== -1; index = text.indexOf(word, index + 1)) {
    let startsWord = index === 0 || !/[a-z0-9]/i.test(text[index - 1]);
    let end = index + word.length;
    let endsWord = end === text.length || !/[a-z0-9]/i.test(text[end]);
    if (startsWord && endsWord) return true;
  }
  return false;
}
//@ chunk-1hnjmk23.js:1340179-1340271 placement
/**
 * 判断列表里是否有以该名称开头、随后接 “-” 的更具体条目。
 */
function hasMoreSpecificNameEntry(name, entry) {
  if (!name.startsWith(entry)) return false;
  return name.length === entry.length || name[entry.length] === "-";
}
//@ chunk-1hnjmk23.js:1340271-1340423 placement
/**
 * 列表中是否有以该名称加 “-” 开头的更具体条目。
 */
function hasLongerVariant(modelName, names) {
  for (let candidate of names) {
    if (isBaseModelKey(candidate)) continue;
    let index = candidate.indexOf(modelName);
    if (index === -1) continue;
    let endIndex = index + modelName.length;
    if (endIndex === candidate.length || candidate[endIndex] === "-") return true;
  }
  return false;
}
//@ chunk-1hnjmk23.js:1340423-1340545 placement
/**
 * exact 匹配模式下模型条目是否匹配。
 */
function matchesExactEntry(modelName, entry) {
  let classified = classifyModelListEntry(entry);
  if (classified.kind !== "model") return classified.kind === "family";
  let modelId = parseModelId(modelName);
  return modelId !== null && modelEntryMatches(classified, modelId, isLatestAlias(modelName, modelId));
}
//@ chunk-1hnjmk23.js:1340545-1340917 placement
/**
 * 模型是否在可用模型列表中（支持别名、家族、词边界、claude- 前缀）。
 */
function isModelAvailable(model, availableModels, availableModelsMatch) {
  if (availableModels.length === 0) return false;
  let names = availableModels.map((entry) => strip1mSuffix(entry.trim().toLowerCase()));
  let normalized = strip1mSuffix(model.trim().toLowerCase());
  if (names.includes(normalized)) {
    if (!isBaseModelKey(normalized) || !hasLongerVariant(normalized, names)) return true;
  }
  for (let entry of names)
    if (isBaseModelKey(entry) && !hasLongerVariant(entry, names) && containsWholeWord(normalized, entry))
      return true;
  for (let entry of names) {
    if (isBaseModelKey(entry)) continue;
    if (availableModelsMatch === "exact" && !matchesExactEntry(normalized, entry)) continue;
    if (hasMoreSpecificNameEntry(normalized, entry)) return true;
    if (!entry.startsWith("claude-") && hasMoreSpecificNameEntry(normalized, `claude-${entry}`)) return true;
  }
  return false;
}
//@ chunk-1hnjmk23.js:1340917-1341045 placement
/**
 * 模型是否命中 deniedModels。
 */
function isModelDenied(modelName, deniedModels) {
  let lower = stripAnyVersatileSuffix(modelName.trim()).toLowerCase();
  let parsed = parseModelId(lower);
  return deniedModels.some((deniedEntry) => {
    let { entry } = parseDeniedModelEntry(deniedEntry);
    return entry !== null && deniedModelsEntryMatches(entry, lower, parsed);
  });
}
//@ chunk-1hnjmk23.js:1341045-1341251 placement
/**
 * 模型限制结果：denied / unlisted / null。
 */
function modelRestriction(modelName, policy, model) {
  let deniedModels = policy.deniedModels;
  if (
    deniedModels &&
    [modelName, ...Object.values(model?.upstream_model ?? {})].some((candidate) =>
      isModelDenied(candidate, deniedModels),
    )
  )
    return "denied";
  let availableModels = policy.availableModels;
  return availableModels && !isModelAvailable(modelName, availableModels, policy.availableModelsMatch)
    ? "unlisted"
    : null;
}
//@ chunk-1hnjmk23.js:1341251-1341616 placement
/**
 * Bedrock guardrail trace 中各策略的列表字段与保留属性。
 */
var GUARDRAIL_POLICY_FIELDS = [
  ["topicPolicy", "topics", ["name", "type"]],
  ["contentPolicy", "filters", ["type", "confidence", "filterStrength"]],
  ["wordPolicy", "customWords", []],
  ["wordPolicy", "managedWordLists", ["type"]],
  ["sensitiveInformationPolicy", "piiEntities", ["type"]],
  ["sensitiveInformationPolicy", "regexes", ["name"]],
  ["contextualGroundingPolicy", "filters", ["type", "score", "threshold"]],
];
//@ chunk-1hnjmk23.js:1341616-1342106 placement
/**
 * 从 Bedrock 响应中取出 guardrail trace（删除原字段），有命中或干预时上报 guardrail.trace。
 */
function reportGuardrailTrace(event, logContext) {
  let trace = getAlias(event, ["amazon-bedrock-trace"]);
  let eventType = getAlias(event, ["type"]);
  if (trace === undefined && eventType !== "message" && eventType !== "message_stop") return;
  if ("amazon-bedrock-trace" in event) delete event["amazon-bedrock-trace"];
  let guardrailAction = getAlias(event, ["amazon-bedrock-guardrailAction"]);
  let outputs = getAlias(trace, ["guardrail", "outputs"]);
  let filters = uniqByExport(
    [
      ...collectGuardrailFilters("input", getAlias(trace, ["guardrail", "input"])),
      ...(Array.isArray(outputs) ? outputs : []).flatMap((outputEntry) =>
        collectGuardrailFilters("output", outputEntry),
      ),
    ],
    jsonStringify,
  );
  if (filters.length > 0 || guardrailAction === "INTERVENED")
    gatewayJsonLog("guardrail.trace", {
      ...logContext,
      action: typeof guardrailAction === "string" ? guardrailAction : undefined,
      filters,
    });
}
//@ chunk-1hnjmk23.js:1342106-1342402 placement
/**
 * 收集 trace 中检测到的过滤项（方向、guardrail、策略、动作等）。
 */
function collectGuardrailFilters(side, guardrailOutput) {
  let findings = [];
  for (let [key, value] of Object.entries(isPlainObject_2(guardrailOutput) ? guardrailOutput : {}))
    for (let [policyName, policyField, actionField] of GUARDRAIL_POLICY_FIELDS) {
      let detections = getAlias(value, [policyName, policyField]);
      for (let detection of Array.isArray(detections) ? detections : [])
        if (isPlainObject_2(detection) && detection.detected !== false)
          findings.push({
            side,
            guardrail: key,
            policy: `${policyName}.${policyField}`,
            ...pickByHelper(
              pickAlias(detection, "action", actionField),
              (fieldValue) => typeof fieldValue === "string" || typeof fieldValue === "number",
            ),
          });
    }
  return findings;
}
export {
  modelRestriction,
  escapeRegExpModule,
  applyBedrockGuardrails,
  reportGuardrailTrace,
  GUARDRAIL_INPUT_TAGGING_MODES,
  isModelAvailable,
};
