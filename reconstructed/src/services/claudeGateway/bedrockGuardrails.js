/**
 * services/claudeGateway/bedrockGuardrails.ts
 *
 * 2.1.316 新增：Bedrock guardrails 配置与应用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (19)
 * attribution: placement 19
 */
import { randomBytes } from "crypto";
import { Re } from "../../../runtime/bun-runtime.js";
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
import { vMe } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { gatewayJsonLog } from "../gateway/gatewayBanner.js";
import { isPlainObject as isPlainObject_2 } from "../../utils/objectUtils.js";
import { pickByHelper } from "../../utils/git/gitSafeEnv.js";
import { wS } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-1ny7cxrt.js:1337441-1337566 placement
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
//@ chunk-1ny7cxrt.js:1337566-1337637 placement
/**
 * 判断值是否为普通对象（非 null、非数组）。
 */
function isPlainObject(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-1ny7cxrt.js:1337637-1337687 placement
/**
 * 判断内容块是否属于 assistant 消息（块上有 role==="assistant"）。
 */
function isAssistantMessageBlock(message) {
  return isPlainObject(message) && message.role === "assistant";
}
//@ chunk-1ny7cxrt.js:1337687-1337793 placement
/**
 * 把文本包进 Bedrock guardContent 标签（带随机后缀），空文本不包。
 */
function wrapGuardContent(e, t) {
  if (t.trim() === "") return t;
  e.used = true;
  return `<${AMAZON_BEDROCK_GUARDRAILS_GUARDCONTENT}_${e.suffix}>${t}</${AMAZON_BEDROCK_GUARDRAILS_GUARDCONTENT}_${e.suffix}>`;
}
//@ chunk-1ny7cxrt.js:1337793-1337894 placement
/**
 * 包裹消息内容（字符串或内容块数组）。
 */
function wrapContent(e, content) {
  if (typeof content === "string") return wrapGuardContent(e, content);
  return Array.isArray(content) ? content.map((n) => wrapContentBlock(e, n)) : content;
}
//@ chunk-1ny7cxrt.js:1337894-1337964 placement
/**
 * 给消息的 content 套上 guardrail 标签（无 content 的消息原样返回）。
 */
function wrapMessageContentBlocks(e, t) {
  return "content" in t
    ? {
        ...t,
        content: wrapContent(e, t.content),
      }
    : t;
}
//@ chunk-1ny7cxrt.js:1337964-1338371 placement
/**
 * 包裹单个内容块：文本、文档（含上下文）、工具/搜索结果。
 */
function wrapContentBlock(e, t) {
  if (!isPlainObject(t)) return t;
  if (t.type === "text" && typeof t.text === "string")
    return {
      ...t,
      text: wrapGuardContent(e, t.text),
    };
  if (t.type === "document" && isPlainObject(t.source)) {
    let { source, context } = t;
    return {
      ...t,
      ...(typeof context === "string" && {
        context: wrapGuardContent(e, context),
      }),
      source:
        source.type === "text" && typeof source.data === "string"
          ? {
              ...source,
              data: wrapGuardContent(e, source.data),
            }
          : wrapMessageContentBlocks(e, source),
    };
  }
  return t.type === "tool_result" || t.type === "search_result" || t.type === "mcp_tool_result"
    ? wrapMessageContentBlocks(e, t)
    : t;
}
//@ chunk-1ny7cxrt.js:1338371-1339013 placement
/**
 * 按模式（最后一条/用户消息/全部/含 system）给请求加 guardContent 标签与 guardrailConfig；没有包裹任何内容时原样返回。
 */
function applyBedrockGuardrails(e, inputTagging) {
  if (!Array.isArray(e.messages)) return e;
  let messages = e.messages;
  let o = {
    suffix: randomBytes(10).toString("hex"),
    used: false,
  };
  let r = messages.findLastIndex((message) => !isAssistantMessageBlock(message)) + 1;
  let s = messages.slice(0, r).findLastIndex(isAssistantMessageBlock) + 1;
  let a = {
    ...e,
    ...(inputTagging === "all_messages_and_system" &&
      e.system !== undefined && {
        system: wrapContent(o, e.system),
      }),
    messages: messages.map((message, c) =>
      isPlainObject(message) &&
      (inputTagging === "all_messages_and_system" ||
        (message.role !== "system" &&
          (inputTagging === "all_messages" ||
            (inputTagging === "user_messages" ? !isAssistantMessageBlock(message) : c >= s && c < r))))
        ? {
            ...message,
            content: wrapContent(o, message.content),
          }
        : message,
    ),
    "amazon-bedrock-guardrailConfig": {
      tagSuffix: o.suffix,
    },
  };
  if (!o.used && inputTagging === "last_message")
    a.messages = messages.map((message, c) =>
      isPlainObject(message) && message.role === "system" && c >= s && c < r
        ? {
            ...message,
            content: wrapContent(o, message.content),
          }
        : message,
    );
  return o.used ? a : e;
}
//@ chunk-1ny7cxrt.js:1339013-1339031 placement
/**
 * 导入的转义正则工具模块；本文件未直接使用。
 */
var escapeRegExpModule = Re(require_node_http_handler(), 1);
//@ chunk-1ny7cxrt.js:1339031-1339216 placement
/**
 * 字符串中是否以完整词出现某片段。
 */
function containsWholeWord(e, t) {
  for (let index = e.indexOf(t); index !== -1; index = e.indexOf(t, index + 1)) {
    let o = index === 0 || !/[a-z0-9]/i.test(e[index - 1]);
    let r = index + t.length;
    let s = r === e.length || !/[a-z0-9]/i.test(e[r]);
    if (o && s) return true;
  }
  return false;
}
//@ chunk-1ny7cxrt.js:1339216-1339308 placement
/**
 * 判断列表里是否有以该名称开头、随后接 “-” 的更具体条目。
 */
function hasMoreSpecificNameEntry(e, t) {
  if (!e.startsWith(t)) return false;
  return e.length === t.length || e[t.length] === "-";
}
//@ chunk-1ny7cxrt.js:1339308-1339460 placement
/**
 * 列表中是否有以该名称加 “-” 开头的更具体条目。
 */
function hasLongerVariant(e, t) {
  for (let n of t) {
    if (isBaseModelKey(n)) continue;
    let index = n.indexOf(e);
    if (index === -1) continue;
    let r = index + e.length;
    if (r === n.length || n[r] === "-") return true;
  }
  return false;
}
//@ chunk-1ny7cxrt.js:1339460-1339582 placement
/**
 * exact 匹配模式下模型条目是否匹配。
 */
function matchesExactEntry(e, t) {
  let n = classifyModelListEntry(t);
  if (n.kind !== "model") return n.kind === "family";
  let modelId = parseModelId(e);
  return modelId !== null && modelEntryMatches(n, modelId, isLatestAlias(e, modelId));
}
//@ chunk-1ny7cxrt.js:1339582-1339954 placement
/**
 * 模型是否在可用模型列表中（支持别名、家族、词边界、claude- 前缀）。
 */
function isModelAvailable(e, availableModels, availableModelsMatch) {
  if (availableModels.length === 0) return false;
  let mapped = availableModels.map((s) => strip1mSuffix(s.trim().toLowerCase()));
  let r = strip1mSuffix(e.trim().toLowerCase());
  if (mapped.includes(r)) {
    if (!isBaseModelKey(r) || !hasLongerVariant(r, mapped)) return true;
  }
  for (let s of mapped)
    if (isBaseModelKey(s) && !hasLongerVariant(s, mapped) && containsWholeWord(r, s)) return true;
  for (let s of mapped) {
    if (isBaseModelKey(s)) continue;
    if (availableModelsMatch === "exact" && !matchesExactEntry(r, s)) continue;
    if (hasMoreSpecificNameEntry(r, s)) return true;
    if (!s.startsWith("claude-") && hasMoreSpecificNameEntry(r, `claude-${s}`)) return true;
  }
  return false;
}
//@ chunk-1ny7cxrt.js:1339954-1340082 placement
/**
 * 模型是否命中 deniedModels。
 */
function isModelDenied(e, deniedModels) {
  let lower = stripAnyVersatileSuffix(e.trim()).toLowerCase();
  let modelId = parseModelId(lower);
  return deniedModels.some((r) => {
    let { entry } = parseDeniedModelEntry(r);
    return entry !== null && deniedModelsEntryMatches(entry, lower, modelId);
  });
}
//@ chunk-1ny7cxrt.js:1340082-1340288 placement
/**
 * 模型限制结果：denied / unlisted / null。
 */
function modelRestriction(e, t, n) {
  let deniedModels = t.deniedModels;
  if (
    deniedModels &&
    [e, ...Object.values(n?.upstream_model ?? {})].some((s) => isModelDenied(s, deniedModels))
  )
    return "denied";
  let availableModels = t.availableModels;
  return availableModels && !isModelAvailable(e, availableModels, t.availableModelsMatch) ? "unlisted" : null;
}
//@ chunk-1ny7cxrt.js:1340288-1340653 placement
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
//@ chunk-1ny7cxrt.js:1340653-1341143 placement
/**
 * 从 Bedrock 响应中取出 guardrail trace（删除原字段），有命中或干预时上报 guardrail.trace。
 */
function reportGuardrailTrace(e, t) {
  let n = vMe(e, ["amazon-bedrock-trace"]);
  let o = vMe(e, ["type"]);
  if (n === undefined && o !== "message" && o !== "message_stop") return;
  if ("amazon-bedrock-trace" in e) delete e["amazon-bedrock-trace"];
  let r = vMe(e, ["amazon-bedrock-guardrailAction"]);
  let s = vMe(n, ["guardrail", "outputs"]);
  let a = Ji(
    [
      ...collectGuardrailFilters("input", vMe(n, ["guardrail", "input"])),
      ...(Array.isArray(s) ? s : []).flatMap((l) => collectGuardrailFilters("output", l)),
    ],
    jsonStringify,
  );
  if (a.length > 0 || r === "INTERVENED")
    gatewayJsonLog("guardrail.trace", {
      ...t,
      action: typeof r === "string" ? r : undefined,
      filters: a,
    });
}
//@ chunk-1ny7cxrt.js:1341143-1341439 placement
/**
 * 收集 trace 中检测到的过滤项（方向、guardrail、策略、动作等）。
 */
function collectGuardrailFilters(side, t) {
  let n = [];
  for (let [key, value] of Object.entries(isPlainObject_2(t) ? t : {}))
    for (let [s, a, l] of GUARDRAIL_POLICY_FIELDS) {
      let c = vMe(value, [s, a]);
      for (let u of Array.isArray(c) ? c : [])
        if (isPlainObject_2(u) && u.detected !== false)
          n.push({
            side,
            guardrail: key,
            policy: `${s}.${a}`,
            ...pickByHelper(wS(u, "action", l), (f) => typeof f === "string" || typeof f === "number"),
          });
    }
  return n;
}
export {
  modelRestriction,
  escapeRegExpModule,
  applyBedrockGuardrails,
  reportGuardrailTrace,
  GUARDRAIL_INPUT_TAGGING_MODES,
  isModelAvailable,
};
