/**
 * tools/ArtifactTool/artifactAskMessages.ts
 *
 * 2.1.316 新增：记录 artifact 询问卡片的用户决定；描述 artifact 请求的内容（请求、脚本、文档、文件）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-m79qv8gp.js (16)
 * attribution: placement 16
 */
import { canonicalFingerprint } from "../../services/api/requestFingerprint.js";
import { getLiveState } from "../../services/liveReplica/liveReplica.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-m79qv8gp.js:1203-1401 placement
/**
 * Artifact 询问相关常量：输入中的询问标记键、通用询问开头语、询问卡片事实条数与文件列举上限。
 */
var ARTIFACT_ASK_TAG_KEY = "__artifactAsk";
var GENERIC_ASK_LEADS = [
  "Claude wants to upload a file to this artifact.",
  "Claude wants to copy files from another artifact into this one.",
  "Claude wants to edit this artifact's data.",
];
var MAX_ASK_CARD_FACTS = 64;
var MAX_LISTED_ASK_FILES = 3;
//@ chunk-m79qv8gp.js:1401-1497 placement
/**
 * 用 and 连接若干名字（三项以上最后加逗号）。
 */
function joinWithAnd(parts) {
  return parts.length <= 2 ? parts.join(" and ") : `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}
//@ chunk-m79qv8gp.js:1497-1551 placement
/**
 * 匹配双引号括起片段的粘性正则。
 */
var QUOTED_RUN_REGEX = /"[^"]*"/g;
var ASK_READ_COMMENTS_PREFIX = "Let Claude read the comments on ";
//@ chunk-m79qv8gp.js:1551-1610 placement
/**
 * 生成「允许 Claude 读取某 artifact 的评论吗」的问句。
 */
function askReadCommentsQuestion(title) {
  return `${ASK_READ_COMMENTS_PREFIX}${title ? `"${title}"` : "this artifact"}?`;
}
//@ chunk-m79qv8gp.js:1610-1756 placement
function questionEndIndex(question) {
  if (!question.startsWith(ASK_READ_COMMENTS_PREFIX)) return;
  for (let match of question.matchAll(new RegExp(`${QUOTED_RUN_REGEX.source}|\\?(?=\\s)`, "g")))
    if (match[0] === "?") return match.index + 1;
  return;
}
//@ chunk-m79qv8gp.js:1756-1819 placement
/**
 * 尝试计算哈希值，异常或空值返回 undefined。
 */
function hashOfIfPossible(text) {
  try {
    return text === undefined ? undefined : canonicalFingerprint(text);
  } catch {
    return;
  }
}
//@ chunk-m79qv8gp.js:1819-1931 placement
/**
 * 取某次工具调用缓存的询问卡片（原因与输入须与缓存时一致）。
 */
function askCardFor(input, toolUseId, reason) {
  let entry = getLiveState().askCards.get(toolUseId);
  if (entry === undefined || entry.reason !== reason || hashOfIfPossible(input) !== entry.input) return;
  return entry.card;
}
//@ chunk-m79qv8gp.js:1931-2862 placement
/**
 * 描述 artifact 请求的内容（请求、脚本、文档、文件）。
 */
function describeArtifactRequest(request, canonicalHandlerTarget = (path) => path) {
  let { request: request_2, script, text, documents, files, file, source } = request;
  let lines = [];
  if (
    isPlainObject(request_2) &&
    typeof request_2.method === "string" &&
    typeof request_2.path === "string"
  ) {
    let queryString = isPlainObject(request_2.query)
      ? new URLSearchParams(
          Object.entries(request_2.query).flatMap(([key, value]) => {
            let queryValue = typeof value === "string" ? value : jsonStringify(value);
            return queryValue === undefined ? [] : [[key, queryValue]];
          }),
        ).toString()
      : "";
    let targetPath = canonicalHandlerTarget(
      queryString === "" ? request_2.path : `${request_2.path}?${queryString}`,
    );
    if (/^[A-Za-z]{1,16}$/.test(request_2.method) && /^[^\s\p{Cc}]+$/u.test(targetPath)) {
      lines.push(`${request_2.method.toUpperCase()} ${targetPath}`);
      if (request_2.body !== undefined)
        lines.push(`Request body \xB7 ${linesLabel(valueWeight(request_2.body))}`);
    }
  }
  for (let body of [script, text])
    if (typeof body === "string" && body.trim() !== "") {
      let [firstLine = "", ...restLines] = splitLines(body.trim());
      lines.push(`${linesLabel(restLines.length + 1)} \xB7 ${firstLine}`);
    }
  if (documents !== undefined) lines.push(`${documents} ${plural(documents, "document")}`);
  if (files !== undefined) {
    let moreCount = files.count - files.names.length;
    let mapped = files.names.map((name) => `"${name}"`);
    let namesText = joinWithAnd(moreCount > 0 ? [...mapped, `${moreCount} more`] : mapped);
    lines.push(`${files.count} ${plural(files.count, "file")} \xB7 ${namesText}`);
  }
  if (source !== undefined) lines.push(`source: ${source}`);
  if (file !== undefined) lines.push(`file: ${file}`);
  return lines;
}
//@ chunk-m79qv8gp.js:2862-3109 placement
function valueWeight(value, seen = new WeakSet()) {
  if (typeof value === "string") return splitLines(value).length;
  if (typeof value !== "object" || value === null || seen.has(value)) return 1;
  seen.add(value);
  let items = Array.isArray(value) ? value : Object.values(value);
  return items.length === 0
    ? 1
    : items.reduce((acc, item) => acc + (typeof item === "string" ? 1 : valueWeight(item, seen)), 2);
}
//@ chunk-m79qv8gp.js:3109-3165 placement
/**
 * 按各种换行符拆行。
 */
function splitLines(text) {
  return text.split(/\r\n|[\r\n\u2028\u2029]/);
}
//@ chunk-m79qv8gp.js:3165-3216 placement
/**
 * 拼出「N lines」或「1 line」。
 */
function linesLabel(count) {
  return `${count} ${count === 1 ? "line" : "lines"}`;
}
//@ chunk-m79qv8gp.js:3216-4428 placement
/**
 * 记录 artifact 询问卡片的用户决定。
 */
function recordArtifactAskDecision(
  toolUseId,
  decision,
  input,
  facts = getLiveState().askCardFacts.get(toolUseId),
) {
  let liveState = getLiveState();
  let stampedCard = liveState.askClassCards.get(toolUseId);
  let target = facts?.target;
  let values = facts?.values ?? [];
  let audience = facts?.audience ?? "";
  liveState.askClassCards.delete(toolUseId);
  liveState.askCardFacts.delete(toolUseId);
  if (
    facts === undefined ||
    facts.generic === true ||
    decision.behavior !== "ask" ||
    (decision.decisionReason?.type !== "safetyCheck" && decision.decisionReason?.type !== "other") ||
    decision.decisionReason.reason.trim() === ""
  )
    return;
  let reason = decision.decisionReason.reason;
  let index = reason.indexOf(`

`);
  let firstLine = index === -1 ? reason : reason.slice(0, index);
  let noteLines =
    index === -1
      ? []
      : reason
          .slice(index + 2)
          .split(
            `
`,
          )
          .filter((line) => line !== "");
  let updatedInput = decision.updatedInput ?? input;
  let stamp = isPlainObject(updatedInput) ? updatedInput[ARTIFACT_ASK_TAG_KEY] : undefined;
  let parsed;
  if (stamp === undefined) {
    let leadLength =
      GENERIC_ASK_LEADS.find((lead) => firstLine.startsWith(lead))?.length ?? questionEndIndex(firstLine);
    let question = leadLength === undefined ? firstLine : firstLine.slice(0, leadLength);
    let tail = leadLength === undefined ? "" : firstLine.slice(leadLength).trim();
    let title = target?.title ?? "";
    let titleText = title !== "" ? `"${title}"` : target?.url;
    let extraLines = [];
    let appearsInLines = (suffix) => noteLines.some((line) => line.endsWith(suffix));
    if (titleText !== undefined && !question.includes(titleText) && !appearsInLines(titleText))
      extraLines.push(titleText);
    let url = target?.url;
    if (
      facts?.foreign === true &&
      url !== undefined &&
      !question.includes(url) &&
      !extraLines.includes(url) &&
      !appearsInLines(url)
    )
      extraLines.push(url);
    if (tail !== "") extraLines.push(tail);
    let audienceShown = audience === "" || firstLine.replace(QUOTED_RUN_REGEX, "").includes(audience);
    parsed = {
      question,
      lines: extraLines,
      values: [...noteLines, ...(audienceShown ? values : [...values, audience])],
    };
  } else if (
    stampedCard !== undefined &&
    stampedCard.reason === firstLine &&
    hashOfIfPossible(stamp) === stampedCard.stamp
  ) {
    let [firstPart, ...otherParts] = stampedCard.parts;
    let audienceCovered = audience === "" || stampedCard.saysPublic;
    parsed =
      firstPart === undefined
        ? undefined
        : {
            question: firstPart,
            lines: otherParts,
            values: audienceCovered ? values : [...values, audience],
          };
  }
  let line = hashOfIfPossible(updatedInput);
  if (line !== undefined && parsed !== undefined)
    setBounded(liveState.askCards, toolUseId, {
      input: line,
      card: parsed,
      reason,
    });
}
//@ chunk-m79qv8gp.js:4428-4710 placement
/**
 * 包装工具的 checkPermissions：结果为 ask 时用 n 从（可能被改写的）输入中提取询问卡片要展示的事实并按 toolUseId 记录（有上限）。
 */
function withAskCardFacts(tool, factsReader) {
  let checkPermissions = tool.checkPermissions;
  return overrideDescriptors(tool, {
    async checkPermissions(input, context) {
      let decision = await checkPermissions.call(this, input, context);
      let toolUseId = context.toolUseId;
      let facts = decision.behavior === "ask" ? (decision.updatedInput ?? input) : null;
      if (toolUseId !== undefined && isPlainObject(facts)) {
        let attachFacts;
        try {
          attachFacts = factsReader(facts, context);
        } catch {
          attachFacts = {
            values: [],
            generic: true,
          };
        }
        setBounded(getLiveState().askCardFacts, toolUseId, attachFacts);
      }
      return decision;
    },
  });
}
//@ chunk-m79qv8gp.js:4710-4974 placement
/**
 * 包装 Artifact 工具的 checkPermissions：调用前清除该调用的旧询问卡片记录，调用后按结果记录询问决定。
 */
function withAskDecisionRecording(tool) {
  let checkPermissions = tool.checkPermissions;
  return overrideDescriptors(tool, {
    async checkPermissions(input, context) {
      let toolUseId = context.toolUseId;
      if (toolUseId !== undefined) {
        let liveState = getLiveState();
        liveState.askCards.delete(toolUseId);
        liveState.askClassCards.delete(toolUseId);
        liveState.askCardFacts.delete(toolUseId);
      }
      let decision = await checkPermissions.call(this, input, context);
      if (toolUseId !== undefined) recordArtifactAskDecision(toolUseId, decision, input);
      return decision;
    },
  });
}
//@ chunk-m79qv8gp.js:4974-5085 placement
/**
 * 写入有上限的 Map（重新插入到末尾，超出上限时删除最早的一项）。
 */
function setBounded(map, toolUseId, value) {
  map.delete(toolUseId);
  map.set(toolUseId, value);
  if (map.size > MAX_ASK_CARD_FACTS) {
    let oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
}
//@ chunk-m79qv8gp.js:5085-5235 placement
/**
 * 复制对象的全部属性描述符并用另一个对象的描述符覆盖，得到新对象（保留 getter）。
 */
function overrideDescriptors(base, overrides) {
  return Object.defineProperties(
    Object.defineProperties({}, Object.getOwnPropertyDescriptors(base)),
    Object.getOwnPropertyDescriptors(overrides),
  );
}
export {
  overrideDescriptors,
  setBounded,
  askReadCommentsQuestion,
  askCardFor,
  withAskCardFacts,
  describeArtifactRequest,
  MAX_LISTED_ASK_FILES,
  withAskDecisionRecording,
  hashOfIfPossible,
};
