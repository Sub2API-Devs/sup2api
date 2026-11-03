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
import { Xq } from "../../services/api/requestFingerprint.js";
import { getLiveState } from "../../services/liveReplica/liveReplica.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { plural } from "../../utils/stringUtils.js";

/**
 * Artifact 询问相关常量：输入中的询问标记键、通用询问开头语、询问卡片事实条数与文件列举上限。
 */
//@ chunk-m79qv8gp.js:1203-1401 placement
var ARTIFACT_ASK_TAG_KEY = "__artifactAsk",
  GENERIC_ASK_LEADS = [
    "Claude wants to upload a file to this artifact.",
    "Claude wants to copy files from another artifact into this one.",
    "Claude wants to edit this artifact's data.",
  ],
  MAX_ASK_CARD_FACTS = 64,
  MAX_LISTED_ASK_FILES = 3;
//@ chunk-m79qv8gp.js:1401-1497 placement
function X(e) {
  return e.length <= 2 ? e.join(" and ") : `${e.slice(0, -1).join(", ")}, and ${e.at(-1)}`;
}
//@ chunk-m79qv8gp.js:1497-1551 placement
var F = /"[^"]*"/g,
  x = "Let Claude read the comments on ";
//@ chunk-m79qv8gp.js:1551-1610 placement
function aGs(e) {
  return `${x}${e ? `"${e}"` : "this artifact"}?`;
}
//@ chunk-m79qv8gp.js:1610-1756 placement
function questionEndIndex(e) {
  if (!e.startsWith(x)) return;
  for (let n of e.matchAll(new RegExp(`${F.source}|\\?(?=\\s)`, "g"))) if (n[0] === "?") return n.index + 1;
  return;
}
//@ chunk-m79qv8gp.js:1756-1819 placement
function P(e) {
  try {
    return e === void 0 ? void 0 : Xq(e);
  } catch {
    return;
  }
}
/**
 * 取某次工具调用缓存的询问卡片（原因与输入须与缓存时一致）。
 */
//@ chunk-m79qv8gp.js:1819-1931 placement
function askCardFor(e, n, t) {
  let s = getLiveState().askCards.get(n);
  if (s === void 0 || s.reason !== t || P(e) !== s.input) return;
  return s.card;
}
/**
 * 描述 artifact 请求的内容（请求、脚本、文档、文件）。
 */
//@ chunk-m79qv8gp.js:1931-2862 placement
function describeArtifactRequest(e, n = (t) => t) {
  let {
      request: request,
      script: script,
      text: text,
      documents: documents,
      files: files,
      file: file,
      source: source,
    } = e,
    p = [];
  if (isPlainObject(request) && typeof request.method === "string" && typeof request.path === "string") {
    let g = isPlainObject(request.query)
        ? new URLSearchParams(
            Object.entries(request.query).flatMap(([h, r]) => {
              let k = typeof r === "string" ? r : jsonStringify(r);
              return k === void 0 ? [] : [[h, k]];
            }),
          ).toString()
        : "",
      f = n(g === "" ? request.path : `${request.path}?${g}`);
    if (/^[A-Za-z]{1,16}$/.test(request.method) && /^[^\s\p{Cc}]+$/u.test(f)) {
      if ((p.push(`${request.method.toUpperCase()} ${f}`), request.body !== void 0))
        p.push(`Request body \xB7 ${N(valueWeight(request.body))}`);
    }
  }
  for (let g of [script, text])
    if (typeof g === "string" && g.trim() !== "") {
      let [f = "", ...h] = j(g.trim());
      p.push(`${N(h.length + 1)} \xB7 ${f}`);
    }
  if (documents !== void 0) p.push(`${documents} ${plural(documents, "document")}`);
  if (files !== void 0) {
    let g = files.count - files.names.length,
      mapped = files.names.map((r) => `"${r}"`),
      h = X(g > 0 ? [...mapped, `${g} more`] : mapped);
    p.push(`${files.count} ${plural(files.count, "file")} \xB7 ${h}`);
  }
  if (source !== void 0) p.push(`source: ${source}`);
  if (file !== void 0) p.push(`file: ${file}`);
  return p;
}
//@ chunk-m79qv8gp.js:2862-3109 placement
function valueWeight(e, n = new WeakSet()) {
  if (typeof e === "string") return j(e).length;
  if (typeof e !== "object" || e === null || n.has(e)) return 1;
  n.add(e);
  let t = Array.isArray(e) ? e : Object.values(e);
  return t.length === 0 ? 1 : t.reduce((s, o) => s + (typeof o === "string" ? 1 : valueWeight(o, n)), 2);
}
//@ chunk-m79qv8gp.js:3109-3165 placement
function j(e) {
  return e.split(/\r\n|[\r\n\u2028\u2029]/);
}
//@ chunk-m79qv8gp.js:3165-3216 placement
function N(e) {
  return `${e} ${e === 1 ? "line" : "lines"}`;
}
/**
 * 记录 artifact 询问卡片的用户决定。
 */
//@ chunk-m79qv8gp.js:3216-4428 placement
function recordArtifactAskDecision(e, n, t, s = getLiveState().askCardFacts.get(e)) {
  let o = getLiveState(),
    d = o.askClassCards.get(e),
    i = s?.target,
    u = s?.values ?? [],
    l = s?.audience ?? "";
  if (
    (o.askClassCards.delete(e),
    o.askCardFacts.delete(e),
    s === void 0 ||
      s.generic === !0 ||
      n.behavior !== "ask" ||
      (n.decisionReason?.type !== "safetyCheck" && n.decisionReason?.type !== "other") ||
      n.decisionReason.reason.trim() === "")
  )
    return;
  let reason = n.decisionReason.reason,
    index = reason.indexOf(`

`),
    f = index === -1 ? reason : reason.slice(0, index),
    h =
      index === -1
        ? []
        : reason
            .slice(index + 2)
            .split(
              `
`,
            )
            .filter((b) => b !== ""),
    r = n.updatedInput ?? t,
    k = isPlainObject(r) ? r[ARTIFACT_ASK_TAG_KEY] : void 0,
    y;
  if (k === void 0) {
    let C = GENERIC_ASK_LEADS.find((v) => f.startsWith(v))?.length ?? questionEndIndex(f),
      A = C === void 0 ? f : f.slice(0, C),
      U = C === void 0 ? "" : f.slice(C).trim(),
      E = i?.title ?? "",
      T = E !== "" ? `"${E}"` : i?.url,
      R = [],
      I = (v) => h.some((Y) => Y.endsWith(v));
    if (T !== void 0 && !A.includes(T) && !I(T)) R.push(T);
    let S = i?.url;
    if (s?.foreign === !0 && S !== void 0 && !A.includes(S) && !R.includes(S) && !I(S)) R.push(S);
    if (U !== "") R.push(U);
    let V = l === "" || f.replace(F, "").includes(l);
    y = { question: A, lines: R, values: [...h, ...(V ? u : [...u, l])] };
  } else if (d !== void 0 && d.reason === f && P(k) === d.stamp) {
    let [b, ...C] = d.parts,
      A = l === "" || d.saysPublic;
    y = b === void 0 ? void 0 : { question: b, lines: C, values: A ? u : [...u, l] };
  }
  let w = P(r);
  if (w !== void 0 && y !== void 0) setBounded(o.askCards, e, { input: w, card: y, reason: reason });
}
/**
 * 包装工具的 checkPermissions：结果为 ask 时用 n 从（可能被改写的）输入中提取询问卡片要展示的事实并按 toolUseId 记录（有上限）。
 */
//@ chunk-m79qv8gp.js:4428-4710 placement
function withAskCardFacts(e, n) {
  let checkPermissions = e.checkPermissions;
  return overrideDescriptors(e, {
    async checkPermissions(s, o) {
      let d = await checkPermissions.call(this, s, o),
        toolUseId = o.toolUseId,
        u = d.behavior === "ask" ? (d.updatedInput ?? s) : null;
      if (toolUseId !== void 0 && isPlainObject(u)) {
        let l;
        try {
          l = n(u, o);
        } catch {
          l = { values: [], generic: !0 };
        }
        setBounded(getLiveState().askCardFacts, toolUseId, l);
      }
      return d;
    },
  });
}
/**
 * 包装 Artifact 工具的 checkPermissions：调用前清除该调用的旧询问卡片记录，调用后按结果记录询问决定。
 */
//@ chunk-m79qv8gp.js:4710-4974 placement
function withAskDecisionRecording(e) {
  let checkPermissions = e.checkPermissions;
  return overrideDescriptors(e, {
    async checkPermissions(t, s) {
      let toolUseId = s.toolUseId;
      if (toolUseId !== void 0) {
        let i = getLiveState();
        (i.askCards.delete(toolUseId), i.askClassCards.delete(toolUseId), i.askCardFacts.delete(toolUseId));
      }
      let d = await checkPermissions.call(this, t, s);
      if (toolUseId !== void 0) recordArtifactAskDecision(toolUseId, d, t);
      return d;
    },
  });
}
/**
 * 写入有上限的 Map（重新插入到末尾，超出上限时删除最早的一项）。
 */
//@ chunk-m79qv8gp.js:4974-5085 placement
function setBounded(e, n, t) {
  if ((e.delete(n), e.set(n, t), e.size > MAX_ASK_CARD_FACTS)) {
    let s = e.keys().next().value;
    if (s !== void 0) e.delete(s);
  }
}
/**
 * 复制对象的全部属性描述符并用另一个对象的描述符覆盖，得到新对象（保留 getter）。
 */
//@ chunk-m79qv8gp.js:5085-5235 placement
function overrideDescriptors(e, n) {
  return Object.defineProperties(
    Object.defineProperties({}, Object.getOwnPropertyDescriptors(e)),
    Object.getOwnPropertyDescriptors(n),
  );
}

export {
  overrideDescriptors,
  setBounded,
  aGs,
  askCardFor,
  withAskCardFacts,
  describeArtifactRequest,
  MAX_LISTED_ASK_FILES,
  withAskDecisionRecording,
  P,
};
