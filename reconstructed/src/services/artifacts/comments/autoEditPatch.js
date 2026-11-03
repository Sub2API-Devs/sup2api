/**
 * services/artifacts/comments/autoEditPatch.ts
 *
 * 2.1.316 新增：自动编辑的补丁决策解析与应用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-eavynfj6.js (26)
 * attribution: placement 26
 */
import { extname } from "path";
import { stat, readFile } from "fs/promises";
import { MAX_PUBLISH_EDITS, applyFindReplace } from "../../../tools/ArtifactTool/publishEdits.js";
import { isWellFormedString, normalizeFullWidthSpace } from "../../../utils/stringUtils.js";
import { jsonParse } from "../../../utils/slowOperations.js";
import { Bdt } from "../../../utils/confusables.js";
import { isDiskless } from "../../../bootstrap/state.js";
import {
  containsHarnessTags,
  getEditPermissionVerdict,
  canWriteWithoutPrompt,
  applyFindReplaceEdits,
  recordAutoEditRead,
} from "./autoEditPermissions.js";
import { extractThumbnailLinks } from "../../../tools/ArtifactTool/artifactUrls.js";
import { gF } from "../webfetchRead.js";
import { claudeAiEnvironment } from "../../../constants/claudeAiOrigin.js";
import { getShareEntry } from "../shareEntries.js";
import { generateAgent } from "../../../components/agents/generateAgent.js";

//@ chunk-eavynfj6.js:12195-12257 placement
var oe = MAX_PUBLISH_EDITS,
  ie = 65536,
  se = 262144,
  ae = 524288,
  SURROGATE_ESCAPE = "surrogate_escape";
//@ chunk-eavynfj6.js:12257-12861 placement
function parseEditDecisionJson(e, t) {
  let o = unwrapCodeFence(j(e)),
    n = (a, u) => ({ ok: !1, error: { class: a, key: u } });
  if (!isWellFormedString(o.text)) return n("not_json", "");
  let { text: text, preamble: preamble } = findJsonObjectStart(o.text),
    s = { fenced: o.fenced, preamble: preamble },
    l;
  try {
    l = jsonParse(text);
  } catch {
    return n("not_json", "");
  }
  if (!L(l)) return n("not_json", "");
  let f = readOptionalString(l, "action");
  if (!f.ok || !f.present) return n("wrong_shape", "action");
  if (f.value === "hand_back") {
    let a = readOptionalString(l, "reason");
    if (!a.ok) return n("wrong_shape", "reason");
    return {
      ok: !0,
      decision: { action: "hand_back", reason: a.present ? normalizeFullWidthSpace(a.value) : "", ...s },
    };
  }
  if (f.value !== "edit") return n("unknown_action", "action");
  if (hasLoneSurrogateEscape(text)) return n("bad_string", SURROGATE_ESCAPE);
  return validateEditDecision(l, t, s);
}
//@ chunk-eavynfj6.js:12861-12871 placement
var ue = 64;
/**
 * 在模型回复里找第一个能完整解析为 JSON 的 { 起点（有尝试次数上限），返回从那里开始的文本以及前面是否有多余前言。
 */
//@ chunk-eavynfj6.js:12871-13052 placement
function findJsonObjectStart(e) {
  let index = e.indexOf("{");
  for (let o = 0; index >= 0 && o < ue; o++) {
    if (isParsableJsonAt(e, index)) return { text: e.slice(index), preamble: index > 0 };
    let index_2 = e.indexOf("{", index + 1);
    if (index_2 < 0) break;
    index = index_2;
  }
  return { text: e, preamble: !1 };
}
/**
 * 从给定位置按括号与字符串转义配平扫描到匹配的 }，尝试 JSON 解析该片段，成功返回 true。
 */
//@ chunk-eavynfj6.js:13052-13294 placement
function isParsableJsonAt(e, t) {
  let o = 0,
    n = !1;
  for (let i = t; i < e.length; i++) {
    let r = e[i];
    if (n) {
      if (r === "\\") i++;
      else if (r === '"') n = !1;
    } else if (r === '"') n = !0;
    else if (r === "{") o++;
    else if (r === "}") {
      if ((o--, o === 0))
        try {
          return (jsonParse(e.slice(t, i + 1)), !0);
        } catch {
          return !1;
        }
    }
  }
  return !1;
}
//@ chunk-eavynfj6.js:13294-14995 placement
function validateEditDecision(e, t, o) {
  let n = (u, d) => ({ ok: !1, error: { class: u, key: d } }),
    i = readOptionalString(e, "reply");
  if (!i.ok || !i.present || i.value.trim() === "") return n("wrong_shape", "reply");
  let r = readOptionalString(e, "confidence");
  if (!r.ok) return n("wrong_shape", "confidence");
  let edits = e.edits;
  if (!Array.isArray(edits) || edits.some((u) => u !== null && !L(u))) return n("wrong_shape", "edits");
  if (edits.length === 0) return n("wrong_shape", "edits");
  if (edits.length > oe) return n("limit", "MaxEdits");
  let l = [],
    f = 0,
    a = 0;
  for (let u = 0; u < edits.length; u++) {
    let d = edits[u],
      h = (m) => `edits[${u}].${m}`;
    if (!L(d)) return n("wrong_shape", `edits[${u}]`);
    let A = readOptionalString(d, "file");
    if (!A.ok) return n("wrong_shape", h("file"));
    let y = A.present ? A.value : "";
    if (y.trim() === "") {
      if (t === "") return n("wrong_shape", h("file"));
      y = t;
    }
    let hasOwn = Object.hasOwn(d, "create"),
      hasOwn_2 = Object.hasOwn(d, "find"),
      hasOwn_3 = Object.hasOwn(d, "replace");
    if (hasOwn && (hasOwn_2 || hasOwn_3)) return n("wrong_shape", `edits[${u}]`);
    if (hasOwn) {
      let m = readOptionalString(d, "create");
      if (!m.ok || !m.present || m.value.trim() === "") return n("wrong_shape", h("create"));
      if (m.value.includes("\x00")) return n("bad_string", h("create"));
      let k = M(m.value);
      if (k > se) return n("limit", "MaxCreateFileBytes");
      if (((a += k), a > ae)) return n("limit", "MaxCreateBytes");
      l.push({ file: y, create: !0, content: m.value });
      continue;
    }
    if (!hasOwn_2 && !hasOwn_3) return n("wrong_shape", `edits[${u}]`);
    let _ = readOptionalString(d, "find");
    if (!_.ok || !_.present) return n("wrong_shape", h("find"));
    let c = readOptionalString(d, "replace");
    if (!c.ok || !c.present) return n("wrong_shape", h("replace"));
    if (_.value === "") return n("wrong_shape", h("find"));
    if (c.value.includes("\x00")) return n("bad_string", h("replace"));
    if (((f += M(_.value) + M(c.value)), f > ie)) return n("limit", "MaxReplaceBytes");
    l.push({ file: y, create: !1, find: _.value, replace: c.value });
  }
  return {
    ok: !0,
    decision: { action: "edit", edits: l, reply: i.value, confidence: r.present ? r.value : "", ...o },
  };
}
//@ chunk-eavynfj6.js:14995-15065 placement
function L(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-eavynfj6.js:15065-15215 placement
function readOptionalString(e, t) {
  if (!Object.hasOwn(e, t) || e[t] === null) return { ok: !0, present: !1 };
  let o = e[t];
  return typeof o === "string" ? { ok: !0, present: !0, value: o } : { ok: !1 };
}
//@ chunk-eavynfj6.js:15215-15264 placement
function M(e) {
  return Buffer.byteLength(e, "utf8");
}
//@ chunk-eavynfj6.js:15264-15348 placement
function j(e) {
  let trimmed = e.trim();
  if (trimmed.startsWith("\uFEFF")) trimmed = trimmed.slice(1).trim();
  return trimmed;
}
//@ chunk-eavynfj6.js:15348-15652 placement
function unwrapCodeFence(e) {
  if (!e.startsWith("```") || !e.endsWith("```") || e.length < 6) return { text: e, fenced: !1 };
  let sliced = e.slice(3, e.length - 3),
    index = sliced.indexOf(`
`);
  if (index < 0) return { text: e, fenced: !1 };
  let trimmed = sliced.slice(0, index).trim();
  if (trimmed.length > 0 && !/^[A-Za-z0-9]+$/.test(trimmed)) return { text: e, fenced: !1 };
  return { text: j(sliced.slice(index + 1)), fenced: !0 };
}
//@ chunk-eavynfj6.js:15652-15982 placement
function hasLoneSurrogateEscape(e) {
  for (let t = 0; t < e.length; t++) {
    if (e[t] !== "\\") continue;
    if ((t++, t >= e.length || e[t] !== "u")) continue;
    let o = parseHex4(e, t + 1);
    if (o === void 0) return !0;
    if (((t += 4), o >= 56320 && o <= 57343)) return !0;
    if (o >= 55296 && o <= 56319) {
      if (t + 2 >= e.length || e[t + 1] !== "\\" || e[t + 2] !== "u") return !0;
      let n = parseHex4(e, t + 3);
      if (n === void 0 || n < 56320 || n > 57343) return !0;
      t += 6;
    }
  }
  return !1;
}
//@ chunk-eavynfj6.js:15982-16097 placement
function parseHex4(e, t) {
  if (t + 4 > e.length) return;
  let sliced = e.slice(t, t + 4);
  return /^[0-9A-Fa-f]{4}$/.test(sliced) ? parseInt(sliced, 16) : void 0;
}
//@ chunk-eavynfj6.js:16097-16594 placement
function planPatchEdits(e, t, o) {
  if (o.length === 0) return { ok: !1, reason: "empty", edit: -1 };
  let n = [];
  for (let r = 0; r < o.length; r++) {
    let s = o[r];
    if (!isSafeRelativePath(s.file)) return { ok: !1, reason: "bad_path", edit: r };
    if (s.create) return { ok: !1, reason: s.file === t ? "exists" : "create_refused", edit: r };
    if (s.file !== t) return { ok: !1, reason: "unknown_file", edit: r };
    n.push({ find: s.find, replace: s.replace });
  }
  let i = applyFindReplace(e, n);
  if (i.ok) return { ok: !0, content: i.content, ops: n };
  return i.reason === "noop"
    ? { ok: !1, reason: "noop", edit: -1 }
    : { ok: !1, reason: i.reason, edit: i.op };
}
/**
 * 判断补丁里的文件路径是否安全：非空、不超过 512 字节、不以 / 开头、无控制字符与反斜杠、各段不为空/./..。
 */
//@ chunk-eavynfj6.js:16594-16778 placement
function isSafeRelativePath(e) {
  if (e === "" || Buffer.byteLength(e, "utf8") > 512 || e.startsWith("/")) return !1;
  if (/[\x00-\x1f\x7f\\]/.test(e)) return !1;
  return e.split("/").every((t) => t !== "" && t !== "." && t !== "..");
}
//@ chunk-eavynfj6.js:16778-18970 placement
var AUTO_EDIT_SYSTEM_PROMPT = `Claude composes one edit to an artifact. Claude has no tools. Claude outputs only the decision JSON object.

Claude decides on one of the following and outputs exactly that JSON object: no preamble, no code fences, nothing else.
1. Edit: a patch of exact-string replacements applied to the files, in order:
{"action":"edit","edits":[{"file":"<path>","find":"<text copied verbatim from that file>","replace":"<its replacement>"}],"reply":"<one sentence saying what changed>","confidence":"<high|medium|low>"}
An entry {"file":"<new path>","create":"<whole file content>"} in "edits" adds a new file.
"confidence" is how sure Claude is that this patch, applied as is with nobody checking it, fully does what the person wants and breaks nothing.
2. Hand-back to the main assistant:
{"action":"hand_back","reason":"<what is missing>"}
Claude hands back when doing the request properly needs something it cannot see here (earlier conversation, outside data or files, parts of the artifact it was not shown) or a decision that is the person's to make; otherwise Claude edits. A request for Claude's opinion, a recommendation, or a choice between options is a question, not an edit: hand back so the assistant answers in words.
Patch rules: each "find" must be copied character-for-character from the named file (identical whitespace, entities and attribute order) and must occur exactly once in that file at the point that edit applies (the file as already modified by preceding edits); Claude includes as much surrounding text as needed to make it unique, and no more. If any find is missing or ambiguous the whole patch is refused. Later edits apply to the result of earlier ones. An empty "replace" deletes the find text. At most 64 edits.
Edit rules: Claude sizes the change to the request: an exact request gets the smallest edit that fully satisfies it, while a vague complaint or wish gets as thorough a change as a good designer would make to really deal with it; changes only what was asked and preserves everything else; matches the artifact's existing markup, class names, design tokens and code style; the artifact must still load with no script errors; no external resources.
`;
//@ chunk-eavynfj6.js:18970-19051 placement
var PAGE_HTML = "page.html",
  he = { page: "The artifact is a single-file web page, page.html." };
//@ chunk-eavynfj6.js:19051-19221 placement
function splitPatchPrompt(e) {
  let index = e.indexOf(`

`),
    o = index === -1 ? e : e.slice(0, index),
    n = index === -1 ? "" : e.slice(index + 2);
  return { systemLine: o.replace(/[ \t\n]+$/, ""), decisionBlock: n.replace(/[ \t\n]+$/, "") };
}
//@ chunk-eavynfj6.js:19221-19252 placement
var W = "</file>",
  _e = "<\\/file>";
//@ chunk-eavynfj6.js:19252-19508 placement
function buildPatchFilesPrompt(e, t, o) {
  let sorted = [...o].sort((r, s) => (r.path < s.path ? -1 : r.path > s.path ? 1 : 0)),
    i = `${e.systemLine}
${he[t]}
The artifact's current files are between the fences.`;
  for (let r of sorted) {
    let replaced = r.text.replaceAll(W, _e);
    i += `
<file path="${r.path}">
${replaced}
${W}`;
  }
  return i;
}
//@ chunk-eavynfj6.js:19508-19575 placement
function Y(e, t) {
  return `${e.decisionBlock}

The person asks:
${t}
`;
}
//@ chunk-eavynfj6.js:19575-19902 placement
var PATCH_FAILURE_DESCRIPTIONS = {
  not_found: 'its "find" does not occur in that file',
  ambiguous: 'its "find" occurs more than once in that file',
  no_such_file: "it names a file that does not exist",
  bad_create: "it creates a file that already exists or has a bad path",
  noop: "the patch changed nothing",
  unparseable: "the reply was not a valid decision object",
};
/**
 * 补丁应用失败后的重试提示：第几处编辑失败、失败原因、失败的查找文本（截断），要求重新给出决策对象。
 */
//@ chunk-eavynfj6.js:19902-20115 placement
function buildPatchRetryMessage(e, t, o) {
  let joined = [...o].slice(0, 2000).join("");
  return `
Your previous patch was not applied: edit #${e + 1} failed because ${PATCH_FAILURE_DESCRIPTIONS[t]}:
<failed_find>
${joined}
</failed_find>
Respond again with one decision object.
`;
}
//@ chunk-eavynfj6.js:20115-22115 placement
var AUTO_EDIT_DEADLINE_MS = 45000,
  xe = 1e4,
  Ee = `(?:(?<=[${Bdt}])|(?![A-Za-z0-9]|[-_][A-Za-z0-9]))`,
  Re,
  Pe,
  we = 3,
  Se = /[\u{E0020}-\u{E007E}]/gu,
  Te = `(?![0-9${Bdt}])`,
  U = `(?![0-9a-fA-F${Bdt}])`,
  regExp = new RegExp(
    [
      "&#[xX]0*(3[cCeE]|2[fF])(?=[0-9a-fA-F])",
      `&#(\\d+)${Te};?`,
      `&#[xX]([0-9a-fA-F]+)${U};?`,
      "&([A-Za-z][A-Za-z0-9]{1,31});",
      "&(lt|gt|LT|GT|amp|AMP|laquo|raquo)",
      "\\\\u([dD][89abAB][0-9a-fA-F]{2})\\\\u([dD][c-fC-F][0-9a-fA-F]{2})",
      "\\\\u\\{0*([0-9a-fA-F]{1,6})\\}",
      "\\\\u([0-9a-fA-F]{4})",
      "\\\\U([0-9a-fA-F]{8})",
      "\\\\x([0-9a-fA-F]{2})",
      "\\\\0{0,4}(3[cCeE]|2[fF]|6[569cC]|4[569cC])(?=[0-9a-fA-F])",
      "\\\\(0?5[7]|0?7[46]|1(?:0[56]|1[14]|4[56]|5[14]))(?![0-9])",
      "\\\\([nrtv])",
      "\\\\(?:\\r?\\n|(?=[!-~])([^0-9a-fA-FuUxN]|[eEfF](?![0-9a-fA-F])))",
      `\\\\([0-9a-fA-F]{1,6})${U}(?:\\r?\\n|[ \\t])?`,
      "((?:%[0-9a-fA-F]{2})+)",
    ].join("|"),
    "gu",
  ),
  ve = new Map([
    [
      "n",
      `
`,
    ],
    ["r", "\r"],
    ["t", "\t"],
    ["v", "\v"],
  ]),
  Ie = /[\u00AB\u140A\u226A\u22B2\u22D8\u22EA\u25C0-\u25C5\u27EA\u2AA1\u2AF7\u300A]/g,
  Me = /[\u00BB\u1405\u226B\u22B3\u22D9\u22EB\u25B6-\u25BB\u27EB\u2AA2\u2AF8\u300B]/g,
  V = new Map([
    ["lt", "<"],
    ["gt", ">"],
    ["sol", "/"],
    ["bsol", "\\"],
    ["amp", "&"],
    ["lang", "\u27E8"],
    ["rang", "\u27E9"],
    ["langle", "\u27E8"],
    ["rangle", "\u27E9"],
    ["leftanglebracket", "\u27E8"],
    ["rightanglebracket", "\u27E9"],
    ["lsaquo", "\u2039"],
    ["rsaquo", "\u203A"],
    ["laquo", "\xAB"],
    ["raquo", "\xBB"],
    ["ll", "\u226A"],
    ["gg", "\u226B"],
    ["nlt", "\u226E"],
    ["notless", "\u226E"],
    ["pr", "\u227A"],
    ["prec", "\u227A"],
    ["ltdot", "\u22D6"],
    ["lessdot", "\u22D6"],
    ["vltri", "\u22B2"],
    ["lefttriangle", "\u22B2"],
    ["ltri", "\u25C3"],
    ["ltrif", "\u25C2"],
    ["nless", "\u226E"],
    ["precedes", "\u227A"],
    ["nvlt", "<"],
    ["nvgt", ">"],
    ["lessless", "\u2AA1"],
    ["lessthan", "<"],
    ["greaterthan", ">"],
    ["nestedlessless", "\u226A"],
    ["vartriangleleft", "\u22B2"],
    ["nltri", "\u22EA"],
    ["filig", "\uFB01"],
    ["imath", "\u0131"],
    ["inodot", "\u0131"],
    ["iukcy", "\u0456"],
  ]),
  K = ["file", "fiie", "flle"],
  Le = /[1|\u01C0\u2223\u2502\u2758\uFFE8]/g,
  Be = /[\uFFFC\uFFFD\u2800\u115F\u1160\u3164\uFFA0\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g,
  re = "\uFFFD",
  MEDIUM = "medium",
  Ne = 409600;
/**
 * 对本地 html artifact 文件执行一次自动编辑：读文件、调模型、解析补丁、应用并在截止时间内返回结果。
 */
//@ chunk-eavynfj6.js:22115-25548 placement
async function runAutoEditForFile(e) {
  let t = e.now ?? Date.now,
    o = e.deadlineMs ?? AUTO_EDIT_DEADLINE_MS,
    n = t(),
    i = { readMs: 0, callMs: 0, retryMs: 0 },
    r = (g, w) => ({ kind: "ineligible", reason: g, retried: !1, pageBytes: w, timings: i }),
    lower = extname(e.path).toLowerCase();
  if (lower !== ".html" && lower !== ".htm") return r("not_html");
  if (isDiskless()) return r("file_missing");
  let l, f;
  try {
    let g = await stat(e.path);
    if (g.size > Ne) return r("too_large", g.size);
    ((l = await readFile(e.path, "utf8")), (f = g.mtimeMs));
  } catch {
    return r("file_missing");
  }
  let byteLength = Buffer.byteLength(l, "utf8");
  if (l.trim() === "") return r("empty_file", byteLength);
  if (l.includes("\r")) return r("crlf", byteLength);
  if (l.charCodeAt(0) === 65279) return r("bom", byteLength);
  if (containsHarnessTags(l)) return r("fence", byteLength);
  let u = extractThumbnailLinks(l);
  if (
    u.light !== void 0 ||
    u.dark !== void 0 ||
    u.missingHref === !0 ||
    u.oversizeTag === !0 ||
    u.badMedia !== void 0
  )
    return r("thumbnail", byteLength);
  let permissions = e.permissions(),
    h = getEditPermissionVerdict(e.path, permissions);
  if (h !== "allowed")
    return r(h === "classify_all" ? "auto_mode_classify_all" : "edit_would_ask", byteLength);
  if (!canWriteWithoutPrompt(e.path, e.slug, permissions)) return r("publish_would_ask", byteLength);
  let A = t(),
    timeout = AbortSignal.timeout(Math.max(0, o - (A - n))),
    p = await gF(
      { slug: e.slug, env: claudeAiEnvironment() },
      AbortSignal.any([e.context.abortController.signal, timeout]),
      e.context.credentials,
      "artifact_patch_turn_read",
      "probe",
      void 0,
      void 0,
      !0,
    ).catch(() => {
      return;
    });
  if (((i.readMs = t() - A), e.context.abortController.signal.aborted))
    return { kind: "canceled", reason: "read", retried: !1, pageBytes: byteLength, timings: i };
  if (p === void 0 || p.err !== null)
    return timeout.aborted
      ? { kind: "timeout", reason: "read", retried: !1, pageBytes: byteLength, timings: i }
      : { kind: "skipped_read", reason: "read_failed", retried: !1, pageBytes: byteLength, timings: i };
  if (p.role !== "owner") return r("not_owner", byteLength);
  if (p.audience !== "owner") return r("shared", byteLength);
  if (p.typeLocked) return r("type_locked", byteLength);
  if (p.fileCount !== void 0 && p.fileCount > 1) return r("multifile", byteLength);
  if (p.contentStore !== void 0) return r("live_doc", byteLength);
  if (p.readBack?.capabilities?.room !== void 0 || getShareEntry(e.slug)?.capabilities?.room !== void 0)
    return r("room", byteLength);
  if (p.ver !== e.observedVer) return r("live_version_moved", byteLength);
  let C = splitPatchPrompt(AUTO_EDIT_SYSTEM_PROMPT),
    x = buildPatchFilesPrompt(C, "page", [{ path: PAGE_HTML, text: l }]),
    _ = Y(C, e.request),
    c = !1,
    m,
    k;
  for (let g = 0; g < 2; g++) {
    let w = o - (t() - n);
    if (g > 0 && w < xe) break;
    let E = t(),
      b = await generateAgent(x, _, w, e);
    if (g === 0) i.callMs = t() - E;
    else ((i.retryMs = t() - E), (c = !0));
    if (b.kind !== "ok")
      return b.kind === "error"
        ? { kind: "side_call_failed", reason: "call_error", retried: c, pageBytes: byteLength, timings: i }
        : { kind: b.kind, reason: "call", retried: c, pageBytes: byteLength, timings: i };
    if (g === 0) m = b.messageId;
    if (b.stopReason !== "end_turn") {
      ((k = {
        kind: "parse_failed",
        reason: b.stopReason === "max_tokens" ? "stop_max_tokens" : "stop_other",
        retried: c,
        pageBytes: byteLength,
        timings: i,
      }),
        (_ += buildPatchRetryMessage(-1, "unparseable", "")));
      continue;
    }
    let v = parseEditDecisionJson(b.text, PAGE_HTML);
    if (!v.ok) {
      ((k = { kind: "parse_failed", reason: v.error.class, retried: c, pageBytes: byteLength, timings: i }),
        (_ += buildPatchRetryMessage(-1, "unparseable", "")));
      continue;
    }
    let decision = v.decision;
    if (decision.action === "hand_back")
      return { kind: "declined", reason: "hand_back", retried: c, pageBytes: byteLength, timings: i };
    let R = planPatchEdits(l, PAGE_HTML, decision.edits);
    if (!R.ok) {
      let I = decision.edits[R.edit];
      ((k = {
        kind: "apply_refused",
        reason: R.reason,
        retried: c,
        pageBytes: byteLength,
        timings: i,
        ...(R.edit >= 0 && { failingEdit: R.edit }),
      }),
        (_ += buildPatchRetryMessage(
          R.edit,
          toPatchFailureReason(R.reason),
          I !== void 0 && !I.create ? I.find : "",
        )));
      continue;
    }
    let B = applyFindReplaceEdits(l, R.ops);
    if (B === void 0) return { ...r("edit_normalization", byteLength), retried: c };
    let permissions = e.permissions();
    if (getEditPermissionVerdict(e.path, permissions) !== "allowed")
      return { ...r("edit_would_ask_after_call", byteLength), retried: c };
    if (!canWriteWithoutPrompt(e.path, e.slug, permissions))
      return { ...r("publish_would_ask_after_call", byteLength), retried: c };
    return {
      kind: "patched",
      edits: B,
      editCount: decision.edits.length,
      reply: decision.reply,
      sideCallMessageId: m,
      retried: c,
      pageBytes: byteLength,
      seedReadState: () => recordAutoEditRead(e.context.readFileState, e.path, l, f),
      timings: i,
    };
  }
  return { ...k, retried: c };
}
//@ chunk-eavynfj6.js:25548-25822 placement
function toPatchFailureReason(e) {
  switch (e) {
    case "not_found":
      return "not_found";
    case "ambiguous":
      return "ambiguous";
    case "unknown_file":
      return "no_such_file";
    case "exists":
    case "create_refused":
    case "bad_path":
      return "bad_create";
    case "noop":
      return "noop";
    case "empty":
    case "malformed":
      return "unparseable";
  }
}

export { MEDIUM, Re, K, Ee, Pe, we, Be, Se, regExp, V, re, ve, Ie, Me, Le };
