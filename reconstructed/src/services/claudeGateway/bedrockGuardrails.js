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
import {
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
  randomBytes as randomBytes_4,
} from "crypto";
import { Re } from "../../../runtime/bun-runtime.js";
import { E$ } from "../../../vendor/@smithy/node-http-handler/dist-cjs/index.js";
import { I_, parseModelId, Lt, Bn } from "../../utils/model/modelIds.js";
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
import { isPlainObject } from "../../utils/objectUtils.js";
import { Do } from "../../utils/git/gitSafeEnv.js";
import { wS } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-1ny7cxrt.js:1337441-1337566 placement
var AMAZON_BEDROCK_GUARDRAILS_GUARDCONTENT = "amazon-bedrock-guardrails-guardContent",
  Qk = ["last_message", "user_messages", "all_messages", "all_messages_and_system"];
//@ chunk-1ny7cxrt.js:1337566-1337637 placement
function Uu(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-1ny7cxrt.js:1337637-1337687 placement
function s_(e) {
  return Uu(e) && e.role === "assistant";
}
/**
 * 把文本包进 Bedrock guardContent 标签（带随机后缀），空文本不包。
 */
//@ chunk-1ny7cxrt.js:1337687-1337793 placement
function wrapGuardContent(e, t) {
  if (t.trim() === "") return t;
  return (
    (e.used = !0),
    `<${AMAZON_BEDROCK_GUARDRAILS_GUARDCONTENT}_${e.suffix}>${t}</${AMAZON_BEDROCK_GUARDRAILS_GUARDCONTENT}_${e.suffix}>`
  );
}
/**
 * 包裹消息内容（字符串或内容块数组）。
 */
//@ chunk-1ny7cxrt.js:1337793-1337894 placement
function wrapContent(e, t) {
  if (typeof t === "string") return wrapGuardContent(e, t);
  return Array.isArray(t) ? t.map((n) => wrapContentBlock(e, n)) : t;
}
//@ chunk-1ny7cxrt.js:1337894-1337964 placement
function Xk(e, t) {
  return "content" in t ? { ...t, content: wrapContent(e, t.content) } : t;
}
/**
 * 包裹单个内容块：文本、文档（含上下文）、工具/搜索结果。
 */
//@ chunk-1ny7cxrt.js:1337964-1338371 placement
function wrapContentBlock(e, t) {
  if (!Uu(t)) return t;
  if (t.type === "text" && typeof t.text === "string") return { ...t, text: wrapGuardContent(e, t.text) };
  if (t.type === "document" && Uu(t.source)) {
    let { source: source, context: context } = t;
    return {
      ...t,
      ...(typeof context === "string" && { context: wrapGuardContent(e, context) }),
      source:
        source.type === "text" && typeof source.data === "string"
          ? { ...source, data: wrapGuardContent(e, source.data) }
          : Xk(e, source),
    };
  }
  return t.type === "tool_result" || t.type === "search_result" || t.type === "mcp_tool_result"
    ? Xk(e, t)
    : t;
}
/**
 * 按模式（最后一条/用户消息/全部/含 system）给请求加 guardContent 标签与 guardrailConfig；没有包裹任何内容时原样返回。
 */
//@ chunk-1ny7cxrt.js:1338371-1339013 placement
function applyBedrockGuardrails(e, t) {
  if (!Array.isArray(e.messages)) return e;
  let messages = e.messages,
    o = { suffix: randomBytes_4(10).toString("hex"), used: !1 },
    r = messages.findLastIndex((l) => !s_(l)) + 1,
    s = messages.slice(0, r).findLastIndex(s_) + 1,
    a = {
      ...e,
      ...(t === "all_messages_and_system" && e.system !== void 0 && { system: wrapContent(o, e.system) }),
      messages: messages.map((l, c) =>
        Uu(l) &&
        (t === "all_messages_and_system" ||
          (l.role !== "system" &&
            (t === "all_messages" || (t === "user_messages" ? !s_(l) : c >= s && c < r))))
          ? { ...l, content: wrapContent(o, l.content) }
          : l,
      ),
      "amazon-bedrock-guardrailConfig": { tagSuffix: o.suffix },
    };
  if (!o.used && t === "last_message")
    a.messages = messages.map((l, c) =>
      Uu(l) && l.role === "system" && c >= s && c < r ? { ...l, content: wrapContent(o, l.content) } : l,
    );
  return o.used ? a : e;
}
//@ chunk-1ny7cxrt.js:1339013-1339031 placement
var fE = Re(E$(), 1);
/**
 * 字符串中是否以完整词出现某片段。
 */
//@ chunk-1ny7cxrt.js:1339031-1339216 placement
function containsWholeWord(e, t) {
  for (let index = e.indexOf(t); index !== -1; index = e.indexOf(t, index + 1)) {
    let o = index === 0 || !/[a-z0-9]/i.test(e[index - 1]),
      r = index + t.length,
      s = r === e.length || !/[a-z0-9]/i.test(e[r]);
    if (o && s) return !0;
  }
  return !1;
}
//@ chunk-1ny7cxrt.js:1339216-1339308 placement
function tE(e, t) {
  if (!e.startsWith(t)) return !1;
  return e.length === t.length || e[t.length] === "-";
}
/**
 * 列表中是否有以该名称加 “-” 开头的更具体条目。
 */
//@ chunk-1ny7cxrt.js:1339308-1339460 placement
function hasLongerVariant(e, t) {
  for (let n of t) {
    if (I_(n)) continue;
    let index = n.indexOf(e);
    if (index === -1) continue;
    let r = index + e.length;
    if (r === n.length || n[r] === "-") return !0;
  }
  return !1;
}
/**
 * exact 匹配模式下模型条目是否匹配。
 */
//@ chunk-1ny7cxrt.js:1339460-1339582 placement
function matchesExactEntry(e, t) {
  let n = classifyModelListEntry(t);
  if (n.kind !== "model") return n.kind === "family";
  let o = parseModelId(e);
  return o !== null && modelEntryMatches(n, o, isLatestAlias(e, o));
}
/**
 * 模型是否在可用模型列表中（支持别名、家族、词边界、claude- 前缀）。
 */
//@ chunk-1ny7cxrt.js:1339582-1339954 placement
function isModelAvailable(e, t, n) {
  if (t.length === 0) return !1;
  let mapped = t.map((s) => Lt(s.trim().toLowerCase())),
    r = Lt(e.trim().toLowerCase());
  if (mapped.includes(r)) {
    if (!I_(r) || !hasLongerVariant(r, mapped)) return !0;
  }
  for (let s of mapped) if (I_(s) && !hasLongerVariant(s, mapped) && containsWholeWord(r, s)) return !0;
  for (let s of mapped) {
    if (I_(s)) continue;
    if (n === "exact" && !matchesExactEntry(r, s)) continue;
    if (tE(r, s)) return !0;
    if (!s.startsWith("claude-") && tE(r, `claude-${s}`)) return !0;
  }
  return !1;
}
/**
 * 模型是否命中 deniedModels。
 */
//@ chunk-1ny7cxrt.js:1339954-1340082 placement
function isModelDenied(e, t) {
  let lower = Bn(e.trim()).toLowerCase(),
    o = parseModelId(lower);
  return t.some((r) => {
    let { entry: entry } = parseDeniedModelEntry(r);
    return entry !== null && deniedModelsEntryMatches(entry, lower, o);
  });
}
/**
 * 模型限制结果：denied / unlisted / null。
 */
//@ chunk-1ny7cxrt.js:1340082-1340288 placement
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
/**
 * Bedrock guardrail trace 中各策略的列表字段与保留属性。
 */
//@ chunk-1ny7cxrt.js:1340288-1340653 placement
var GUARDRAIL_POLICY_FIELDS = [
  ["topicPolicy", "topics", ["name", "type"]],
  ["contentPolicy", "filters", ["type", "confidence", "filterStrength"]],
  ["wordPolicy", "customWords", []],
  ["wordPolicy", "managedWordLists", ["type"]],
  ["sensitiveInformationPolicy", "piiEntities", ["type"]],
  ["sensitiveInformationPolicy", "regexes", ["name"]],
  ["contextualGroundingPolicy", "filters", ["type", "score", "threshold"]],
];
/**
 * 从 Bedrock 响应中取出 guardrail trace（删除原字段），有命中或干预时上报 guardrail.trace。
 */
//@ chunk-1ny7cxrt.js:1340653-1341143 placement
function reportGuardrailTrace(e, t) {
  let n = vMe(e, ["amazon-bedrock-trace"]),
    o = vMe(e, ["type"]);
  if (n === void 0 && o !== "message" && o !== "message_stop") return;
  if ("amazon-bedrock-trace" in e) delete e["amazon-bedrock-trace"];
  let r = vMe(e, ["amazon-bedrock-guardrailAction"]),
    s = vMe(n, ["guardrail", "outputs"]),
    a = Ji(
      [
        ...collectGuardrailFilters("input", vMe(n, ["guardrail", "input"])),
        ...(Array.isArray(s) ? s : []).flatMap((l) => collectGuardrailFilters("output", l)),
      ],
      jsonStringify,
    );
  if (a.length > 0 || r === "INTERVENED")
    gatewayJsonLog("guardrail.trace", { ...t, action: typeof r === "string" ? r : void 0, filters: a });
}
/**
 * 收集 trace 中检测到的过滤项（方向、guardrail、策略、动作等）。
 */
//@ chunk-1ny7cxrt.js:1341143-1341439 placement
function collectGuardrailFilters(e, t) {
  let n = [];
  for (let [o, r] of Object.entries(isPlainObject(t) ? t : {}))
    for (let [s, a, l] of GUARDRAIL_POLICY_FIELDS) {
      let c = vMe(r, [s, a]);
      for (let u of Array.isArray(c) ? c : [])
        if (isPlainObject(u) && u.detected !== !1)
          n.push({
            side: e,
            guardrail: o,
            policy: `${s}.${a}`,
            ...Do(wS(u, "action", l), (f) => typeof f === "string" || typeof f === "number"),
          });
    }
  return n;
}

export { modelRestriction, fE, applyBedrockGuardrails, reportGuardrailTrace, Qk, isModelAvailable };
