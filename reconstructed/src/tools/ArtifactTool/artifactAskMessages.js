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
function joinWithAnd(e) {
  return e.length <= 2 ? e.join(" and ") : `${e.slice(0, -1).join(", ")}, and ${e.at(-1)}`;
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
function questionEndIndex(e) {
  if (!e.startsWith(ASK_READ_COMMENTS_PREFIX)) return;
  for (let n of e.matchAll(new RegExp(`${QUOTED_RUN_REGEX.source}|\\?(?=\\s)`, "g")))
    if (n[0] === "?") return n.index + 1;
  return;
}
//@ chunk-m79qv8gp.js:1756-1819 placement
/**
 * 尝试计算哈希值，异常或空值返回 undefined。
 */
function hashOfIfPossible(e) {
  try {
    return e === undefined ? undefined : canonicalFingerprint(e);
  } catch {
    return;
  }
}
//@ chunk-m79qv8gp.js:1819-1931 placement
/**
 * 取某次工具调用缓存的询问卡片（原因与输入须与缓存时一致）。
 */
function askCardFor(e, n, t) {
  let s = getLiveState().askCards.get(n);
  if (s === undefined || s.reason !== t || hashOfIfPossible(e) !== s.input) return;
  return s.card;
}
//@ chunk-m79qv8gp.js:1931-2862 placement
/**
 * 描述 artifact 请求的内容（请求、脚本、文档、文件）。
 */
function describeArtifactRequest(e, canonicalHandlerTarget = (t) => t) {
  let { request, script, text, documents, files, file, source } = e;
  let p = [];
  if (isPlainObject(request) && typeof request.method === "string" && typeof request.path === "string") {
    let g = isPlainObject(request.query)
      ? new URLSearchParams(
          Object.entries(request.query).flatMap(([key, value]) => {
            let k = typeof value === "string" ? value : jsonStringify(value);
            return k === undefined ? [] : [[key, k]];
          }),
        ).toString()
      : "";
    let f = canonicalHandlerTarget(g === "" ? request.path : `${request.path}?${g}`);
    if (/^[A-Za-z]{1,16}$/.test(request.method) && /^[^\s\p{Cc}]+$/u.test(f)) {
      p.push(`${request.method.toUpperCase()} ${f}`);
      if (request.body !== undefined) p.push(`Request body \xB7 ${linesLabel(valueWeight(request.body))}`);
    }
  }
  for (let g of [script, text])
    if (typeof g === "string" && g.trim() !== "") {
      let [f = "", ...h] = splitLines(g.trim());
      p.push(`${linesLabel(h.length + 1)} \xB7 ${f}`);
    }
  if (documents !== undefined) p.push(`${documents} ${plural(documents, "document")}`);
  if (files !== undefined) {
    let g = files.count - files.names.length;
    let mapped = files.names.map((r) => `"${r}"`);
    let h = joinWithAnd(g > 0 ? [...mapped, `${g} more`] : mapped);
    p.push(`${files.count} ${plural(files.count, "file")} \xB7 ${h}`);
  }
  if (source !== undefined) p.push(`source: ${source}`);
  if (file !== undefined) p.push(`file: ${file}`);
  return p;
}
//@ chunk-m79qv8gp.js:2862-3109 placement
function valueWeight(e, n = new WeakSet()) {
  if (typeof e === "string") return splitLines(e).length;
  if (typeof e !== "object" || e === null || n.has(e)) return 1;
  n.add(e);
  let t = Array.isArray(e) ? e : Object.values(e);
  return t.length === 0 ? 1 : t.reduce((acc, o) => acc + (typeof o === "string" ? 1 : valueWeight(o, n)), 2);
}
//@ chunk-m79qv8gp.js:3109-3165 placement
/**
 * 按各种换行符拆行。
 */
function splitLines(e) {
  return e.split(/\r\n|[\r\n\u2028\u2029]/);
}
//@ chunk-m79qv8gp.js:3165-3216 placement
/**
 * 拼出「N lines」或「1 line」。
 */
function linesLabel(e) {
  return `${e} ${e === 1 ? "line" : "lines"}`;
}
//@ chunk-m79qv8gp.js:3216-4428 placement
/**
 * 记录 artifact 询问卡片的用户决定。
 */
function recordArtifactAskDecision(toolUseId, n, t, s = getLiveState().askCardFacts.get(toolUseId)) {
  let liveState = getLiveState();
  let d = liveState.askClassCards.get(toolUseId);
  let target = s?.target;
  let values = s?.values ?? [];
  let audience = s?.audience ?? "";
  liveState.askClassCards.delete(toolUseId);
  liveState.askCardFacts.delete(toolUseId);
  if (
    s === undefined ||
    s.generic === true ||
    n.behavior !== "ask" ||
    (n.decisionReason?.type !== "safetyCheck" && n.decisionReason?.type !== "other") ||
    n.decisionReason.reason.trim() === ""
  )
    return;
  let reason = n.decisionReason.reason;
  let index = reason.indexOf(`

`);
  let f = index === -1 ? reason : reason.slice(0, index);
  let h =
    index === -1
      ? []
      : reason
          .slice(index + 2)
          .split(
            `
`,
          )
          .filter((line) => line !== "");
  let updatedInput = n.updatedInput ?? t;
  let k = isPlainObject(updatedInput) ? updatedInput[ARTIFACT_ASK_TAG_KEY] : undefined;
  let y;
  if (k === undefined) {
    let C = GENERIC_ASK_LEADS.find((v) => f.startsWith(v))?.length ?? questionEndIndex(f);
    let A = C === undefined ? f : f.slice(0, C);
    let U = C === undefined ? "" : f.slice(C).trim();
    let title = target?.title ?? "";
    let T = title !== "" ? `"${title}"` : target?.url;
    let R = [];
    let I = (v) => h.some((Y) => Y.endsWith(v));
    if (T !== undefined && !A.includes(T) && !I(T)) R.push(T);
    let url = target?.url;
    if (s?.foreign === true && url !== undefined && !A.includes(url) && !R.includes(url) && !I(url))
      R.push(url);
    if (U !== "") R.push(U);
    let V = audience === "" || f.replace(QUOTED_RUN_REGEX, "").includes(audience);
    y = {
      question: A,
      lines: R,
      values: [...h, ...(V ? values : [...values, audience])],
    };
  } else if (d !== undefined && d.reason === f && hashOfIfPossible(k) === d.stamp) {
    let [b, ...C] = d.parts;
    let A = audience === "" || d.saysPublic;
    y =
      b === undefined
        ? undefined
        : {
            question: b,
            lines: C,
            values: A ? values : [...values, audience],
          };
  }
  let w = hashOfIfPossible(updatedInput);
  if (w !== undefined && y !== undefined)
    setBounded(liveState.askCards, toolUseId, {
      input: w,
      card: y,
      reason,
    });
}
//@ chunk-m79qv8gp.js:4428-4710 placement
/**
 * 包装工具的 checkPermissions：结果为 ask 时用 n 从（可能被改写的）输入中提取询问卡片要展示的事实并按 toolUseId 记录（有上限）。
 */
function withAskCardFacts(e, n) {
  let checkPermissions = e.checkPermissions;
  return overrideDescriptors(e, {
    async checkPermissions(s, o) {
      let d = await checkPermissions.call(this, s, o);
      let toolUseId = o.toolUseId;
      let u = d.behavior === "ask" ? (d.updatedInput ?? s) : null;
      if (toolUseId !== undefined && isPlainObject(u)) {
        let l;
        try {
          l = n(u, o);
        } catch {
          l = {
            values: [],
            generic: true,
          };
        }
        setBounded(getLiveState().askCardFacts, toolUseId, l);
      }
      return d;
    },
  });
}
//@ chunk-m79qv8gp.js:4710-4974 placement
/**
 * 包装 Artifact 工具的 checkPermissions：调用前清除该调用的旧询问卡片记录，调用后按结果记录询问决定。
 */
function withAskDecisionRecording(e) {
  let checkPermissions = e.checkPermissions;
  return overrideDescriptors(e, {
    async checkPermissions(t, s) {
      let toolUseId = s.toolUseId;
      if (toolUseId !== undefined) {
        let liveState = getLiveState();
        liveState.askCards.delete(toolUseId);
        liveState.askClassCards.delete(toolUseId);
        liveState.askCardFacts.delete(toolUseId);
      }
      let d = await checkPermissions.call(this, t, s);
      if (toolUseId !== undefined) recordArtifactAskDecision(toolUseId, d, t);
      return d;
    },
  });
}
//@ chunk-m79qv8gp.js:4974-5085 placement
/**
 * 写入有上限的 Map（重新插入到末尾，超出上限时删除最早的一项）。
 */
function setBounded(e, toolUseId, t) {
  e.delete(toolUseId);
  e.set(toolUseId, t);
  if (e.size > MAX_ASK_CARD_FACTS) {
    let s = e.keys().next().value;
    if (s !== undefined) e.delete(s);
  }
}
//@ chunk-m79qv8gp.js:5085-5235 placement
/**
 * 复制对象的全部属性描述符并用另一个对象的描述符覆盖，得到新对象（保留 getter）。
 */
function overrideDescriptors(e, n) {
  return Object.defineProperties(
    Object.defineProperties({}, Object.getOwnPropertyDescriptors(e)),
    Object.getOwnPropertyDescriptors(n),
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
