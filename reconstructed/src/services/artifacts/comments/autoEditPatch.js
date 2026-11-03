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
import { FILLER_CHAR_CLASS } from "../../../utils/confusables.js";
import { isDiskless } from "../../../bootstrap/state.js";
import {
  containsHarnessTags,
  getEditPermissionVerdict,
  canWriteWithoutPrompt,
  applyFindReplaceEdits,
  recordAutoEditRead,
} from "./autoEditPermissions.js";
import { extractThumbnailLinks } from "../../../tools/ArtifactTool/artifactUrls.js";
import { webfetchReadFile } from "../webfetchRead.js";
import { claudeAiEnvironment } from "../../../constants/claudeAiOrigin.js";
import { getShareEntry } from "../shareEntries.js";
import { generateAgent } from "../../../components/agents/generateAgent.js";

//@ chunk-eavynfj6.js:12195-12257 placement
/**
 * 自动改稿补丁的限额：最多编辑数（沿用发布上限）、替换 64 KB、新建文件 256 KB、新建合计 512 KB，以及 surrogate 转义标记。
 */
var MAX_EDITS_PER_PATCH = MAX_PUBLISH_EDITS;
var MAX_REPLACE_BYTES = 65536;
var MAX_CREATE_FILE_BYTES = 262144;
var MAX_CREATE_BYTES = 524288;
var SURROGATE_ESCAPE = "surrogate_escape";
//@ chunk-eavynfj6.js:12257-12861 placement
function parseEditDecisionJson(text, t) {
  let o = unwrapCodeFence(stripBomAndTrim(text));
  let n = (a, key) => ({
    ok: false,
    error: {
      class: a,
      key,
    },
  });
  if (!isWellFormedString(o.text)) return n("not_json", "");
  let { text: text_2, preamble } = findJsonObjectStart(o.text);
  let s = {
    fenced: o.fenced,
    preamble,
  };
  let l;
  try {
    l = jsonParse(text_2);
  } catch {
    return n("not_json", "");
  }
  if (!isPlainObject(l)) return n("not_json", "");
  let optionalString = readOptionalString(l, "action");
  if (!optionalString.ok || !optionalString.present) return n("wrong_shape", "action");
  if (optionalString.value === "hand_back") {
    let optionalString = readOptionalString(l, "reason");
    if (!optionalString.ok) return n("wrong_shape", "reason");
    return {
      ok: true,
      decision: {
        action: "hand_back",
        reason: optionalString.present ? normalizeFullWidthSpace(optionalString.value) : "",
        ...s,
      },
    };
  }
  if (optionalString.value !== "edit") return n("unknown_action", "action");
  if (hasLoneSurrogateEscape(text_2)) return n("bad_string", SURROGATE_ESCAPE);
  return validateEditDecision(l, t, s);
}
//@ chunk-eavynfj6.js:12861-12871 placement
var MAX_JSON_START_ATTEMPTS = 64;
//@ chunk-eavynfj6.js:12871-13052 placement
/**
 * 在模型回复里找第一个能完整解析为 JSON 的 { 起点（有尝试次数上限），返回从那里开始的文本以及前面是否有多余前言。
 */
function findJsonObjectStart(text) {
  let index = text.indexOf("{");
  for (let i = 0; index >= 0 && i < MAX_JSON_START_ATTEMPTS; i++) {
    if (isParsableJsonAt(text, index))
      return {
        text: text.slice(index),
        preamble: index > 0,
      };
    let index_2 = text.indexOf("{", index + 1);
    if (index_2 < 0) break;
    index = index_2;
  }
  return {
    text,
    preamble: false,
  };
}
//@ chunk-eavynfj6.js:13052-13294 placement
/**
 * 从给定位置按括号与字符串转义配平扫描到匹配的 }，尝试 JSON 解析该片段，成功返回 true。
 */
function isParsableJsonAt(e, t) {
  let o = 0;
  let n = false;
  for (let i = t; i < e.length; i++) {
    let r = e[i];
    if (n) {
      if (r === "\\") i++;
      else if (r === '"') n = false;
    } else if (r === '"') n = true;
    else if (r === "{") o++;
    else if (r === "}") {
      o--;
      if (o === 0)
        try {
          jsonParse(e.slice(t, i + 1));
          return true;
        } catch {
          return false;
        }
    }
  }
  return false;
}
//@ chunk-eavynfj6.js:13294-14995 placement
function validateEditDecision(e, t, o) {
  let n = (u, key) => ({
    ok: false,
    error: {
      class: u,
      key,
    },
  });
  let optionalString = readOptionalString(e, "reply");
  if (!optionalString.ok || !optionalString.present || optionalString.value.trim() === "")
    return n("wrong_shape", "reply");
  let optionalString_2 = readOptionalString(e, "confidence");
  if (!optionalString_2.ok) return n("wrong_shape", "confidence");
  let edits = e.edits;
  if (!Array.isArray(edits) || edits.some((edit) => edit !== null && !isPlainObject(edit)))
    return n("wrong_shape", "edits");
  if (edits.length === 0) return n("wrong_shape", "edits");
  if (edits.length > MAX_EDITS_PER_PATCH) return n("limit", "MaxEdits");
  let l = [];
  let f = 0;
  let a = 0;
  for (let idx = 0; idx < edits.length; idx++) {
    let d = edits[idx];
    let h = (m) => `edits[${idx}].${m}`;
    if (!isPlainObject(d)) return n("wrong_shape", `edits[${idx}]`);
    let optionalString = readOptionalString(d, "file");
    if (!optionalString.ok) return n("wrong_shape", h("file"));
    let y = optionalString.present ? optionalString.value : "";
    if (y.trim() === "") {
      if (t === "") return n("wrong_shape", h("file"));
      y = t;
    }
    let p = Object.hasOwn(d, "create");
    let C = Object.hasOwn(d, "find");
    let x = Object.hasOwn(d, "replace");
    if (p && (C || x)) return n("wrong_shape", `edits[${idx}]`);
    if (p) {
      let optionalString = readOptionalString(d, "create");
      if (!optionalString.ok || !optionalString.present || optionalString.value.trim() === "")
        return n("wrong_shape", h("create"));
      if (optionalString.value.includes("\x00")) return n("bad_string", h("create"));
      let k = utf8Bytes(optionalString.value);
      if (k > MAX_CREATE_FILE_BYTES) return n("limit", "MaxCreateFileBytes");
      a += k;
      if (a > MAX_CREATE_BYTES) return n("limit", "MaxCreateBytes");
      l.push({
        file: y,
        create: true,
        content: optionalString.value,
      });
      continue;
    }
    if (!C && !x) return n("wrong_shape", `edits[${idx}]`);
    let optionalString_2 = readOptionalString(d, "find");
    if (!optionalString_2.ok || !optionalString_2.present) return n("wrong_shape", h("find"));
    let optionalString_3 = readOptionalString(d, "replace");
    if (!optionalString_3.ok || !optionalString_3.present) return n("wrong_shape", h("replace"));
    if (optionalString_2.value === "") return n("wrong_shape", h("find"));
    if (optionalString_3.value.includes("\x00")) return n("bad_string", h("replace"));
    f += utf8Bytes(optionalString_2.value) + utf8Bytes(optionalString_3.value);
    if (f > MAX_REPLACE_BYTES) return n("limit", "MaxReplaceBytes");
    l.push({
      file: y,
      create: false,
      find: optionalString_2.value,
      replace: optionalString_3.value,
    });
  }
  return {
    ok: true,
    decision: {
      action: "edit",
      edits: l,
      reply: optionalString.value,
      confidence: optionalString_2.present ? optionalString_2.value : "",
      ...o,
    },
  };
}
//@ chunk-eavynfj6.js:14995-15065 placement
function isPlainObject(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-eavynfj6.js:15065-15215 placement
function readOptionalString(e, t) {
  if (!Object.hasOwn(e, t) || e[t] === null)
    return {
      ok: true,
      present: false,
    };
  let o = e[t];
  return typeof o === "string"
    ? {
        ok: true,
        present: true,
        value: o,
      }
    : {
        ok: false,
      };
}
//@ chunk-eavynfj6.js:15215-15264 placement
function utf8Bytes(e) {
  return Buffer.byteLength(e, "utf8");
}
//@ chunk-eavynfj6.js:15264-15348 placement
function stripBomAndTrim(e) {
  let trimmed = e.trim();
  if (trimmed.startsWith("\uFEFF")) trimmed = trimmed.slice(1).trim();
  return trimmed;
}
//@ chunk-eavynfj6.js:15348-15652 placement
function unwrapCodeFence(e) {
  if (!e.startsWith("```") || !e.endsWith("```") || e.length < 6)
    return {
      text: e,
      fenced: false,
    };
  let sliced = e.slice(3, e.length - 3);
  let index = sliced.indexOf(`
`);
  if (index < 0)
    return {
      text: e,
      fenced: false,
    };
  let trimmed = sliced.slice(0, index).trim();
  if (trimmed.length > 0 && !/^[A-Za-z0-9]+$/.test(trimmed))
    return {
      text: e,
      fenced: false,
    };
  return {
    text: stripBomAndTrim(sliced.slice(index + 1)),
    fenced: true,
  };
}
//@ chunk-eavynfj6.js:15652-15982 placement
function hasLoneSurrogateEscape(text) {
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "\\") continue;
    i++;
    if (i >= text.length || text[i] !== "u") continue;
    let hex4 = parseHex4(text, i + 1);
    if (hex4 === undefined) return true;
    i += 4;
    if (hex4 >= 56320 && hex4 <= 57343) return true;
    if (hex4 >= 55296 && hex4 <= 56319) {
      if (i + 2 >= text.length || text[i + 1] !== "\\" || text[i + 2] !== "u") return true;
      let hex4 = parseHex4(text, i + 3);
      if (hex4 === undefined || hex4 < 56320 || hex4 > 57343) return true;
      i += 6;
    }
  }
  return false;
}
//@ chunk-eavynfj6.js:15982-16097 placement
function parseHex4(e, t) {
  if (t + 4 > e.length) return;
  let sliced = e.slice(t, t + 4);
  return /^[0-9A-Fa-f]{4}$/.test(sliced) ? parseInt(sliced, 16) : undefined;
}
//@ chunk-eavynfj6.js:16097-16594 placement
function planPatchEdits(e, t, edits) {
  if (edits.length === 0)
    return {
      ok: false,
      reason: "empty",
      edit: -1,
    };
  let n = [];
  for (let k = 0; k < edits.length; k++) {
    let s = edits[k];
    if (!isSafeRelativePath(s.file))
      return {
        ok: false,
        reason: "bad_path",
        edit: k,
      };
    if (s.create)
      return {
        ok: false,
        reason: s.file === t ? "exists" : "create_refused",
        edit: k,
      };
    if (s.file !== t)
      return {
        ok: false,
        reason: "unknown_file",
        edit: k,
      };
    n.push({
      find: s.find,
      replace: s.replace,
    });
  }
  let i = applyFindReplace(e, n);
  if (i.ok)
    return {
      ok: true,
      content: i.content,
      ops: n,
    };
  return i.reason === "noop"
    ? {
        ok: false,
        reason: "noop",
        edit: -1,
      }
    : {
        ok: false,
        reason: i.reason,
        edit: i.op,
      };
}
//@ chunk-eavynfj6.js:16594-16778 placement
/**
 * 判断补丁里的文件路径是否安全：非空、不超过 512 字节、不以 / 开头、无控制字符与反斜杠、各段不为空/./..。
 */
function isSafeRelativePath(file) {
  if (file === "" || Buffer.byteLength(file, "utf8") > 512 || file.startsWith("/")) return false;
  if (/[\x00-\x1f\x7f\\]/.test(file)) return false;
  return file.split("/").every((t) => t !== "" && t !== "." && t !== "..");
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
var PAGE_HTML = "page.html";
var PAGE_HTML_DESCRIPTION = {
  page: "The artifact is a single-file web page, page.html.",
};
//@ chunk-eavynfj6.js:19051-19221 placement
function splitPatchPrompt(e) {
  let index = e.indexOf(`

`);
  let o = index === -1 ? e : e.slice(0, index);
  let n = index === -1 ? "" : e.slice(index + 2);
  return {
    systemLine: o.replace(/[ \t\n]+$/, ""),
    decisionBlock: n.replace(/[ \t\n]+$/, ""),
  };
}
//@ chunk-eavynfj6.js:19221-19252 placement
var FILE_CLOSE_TAG = "</file>";
var ESCAPED_FILE_CLOSE_TAG = "<\\/file>";
//@ chunk-eavynfj6.js:19252-19508 placement
function buildPatchFilesPrompt(e, t, o) {
  let sorted = [...o].sort((r, s) => (r.path < s.path ? -1 : r.path > s.path ? 1 : 0));
  let i = `${e.systemLine}
${PAGE_HTML_DESCRIPTION[t]}
The artifact's current files are between the fences.`;
  for (let r of sorted) {
    let replaced = r.text.replaceAll(FILE_CLOSE_TAG, ESCAPED_FILE_CLOSE_TAG);
    i += `
<file path="${r.path}">
${replaced}
${FILE_CLOSE_TAG}`;
  }
  return i;
}
//@ chunk-eavynfj6.js:19508-19575 placement
function decisionPrompt(e, request) {
  return `${e.decisionBlock}

The person asks:
${request}
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
//@ chunk-eavynfj6.js:19902-20115 placement
/**
 * 补丁应用失败后的重试提示：第几处编辑失败、失败原因、失败的查找文本（截断），要求重新给出决策对象。
 */
function buildPatchRetryMessage(edit, patchFailureReason, o) {
  let joined = [...o].slice(0, 2000).join("");
  return `
Your previous patch was not applied: edit #${edit + 1} failed because ${PATCH_FAILURE_DESCRIPTIONS[patchFailureReason]}:
<failed_find>
${joined}
</failed_find>
Respond again with one decision object.
`;
}
//@ chunk-eavynfj6.js:20115-22115 placement
/**
 * 自动改稿补丁的截止与转义解析常量：45 s 截止、最少 10 s 余量、最多 3 轮实体解析，以及 HTML 实体/反斜杠转义正则与实体名表。
 */
var AUTO_EDIT_DEADLINE_MS = 45000;
var MIN_REMAINING_MS = 1e4;
var ANGLE_BOUNDARY_RE = `(?:(?<=[${FILLER_CHAR_CLASS}])|(?![A-Za-z0-9]|[-_][A-Za-z0-9]))`;
var UNSET_REGEX_A;
var UNSET_REGEX_B;
var MAX_HTML_ENTITY_ATTEMPTS = 3;
var MUSICAL_SYMBOL_RE = /[\u{E0020}-\u{E007E}]/gu;
var HTML_DECIMAL_BOUNDARY = `(?![0-9${FILLER_CHAR_CLASS}])`;
var HTML_HEX_BOUNDARY = `(?![0-9a-fA-F${FILLER_CHAR_CLASS}])`;
var HTML_ESCAPE_RE = new RegExp(
  [
    "&#[xX]0*(3[cCeE]|2[fF])(?=[0-9a-fA-F])",
    `&#(\\d+)${HTML_DECIMAL_BOUNDARY};?`,
    `&#[xX]([0-9a-fA-F]+)${HTML_HEX_BOUNDARY};?`,
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
    `\\\\([0-9a-fA-F]{1,6})${HTML_HEX_BOUNDARY}(?:\\r?\\n|[ \\t])?`,
    "((?:%[0-9a-fA-F]{2})+)",
  ].join("|"),
  "gu",
);
var SIMPLE_ESCAPE_MAP = new Map([
  [
    "n",
    `
`,
  ],
  ["r", "\r"],
  ["t", "\t"],
  ["v", "\v"],
]);
var LEFT_ANGLE_VARIANTS_RE = /[\u00AB\u140A\u226A\u22B2\u22D8\u22EA\u25C0-\u25C5\u27EA\u2AA1\u2AF7\u300A]/g;
var RIGHT_ANGLE_VARIANTS_RE = /[\u00BB\u1405\u226B\u22B3\u22D9\u22EB\u25B6-\u25BB\u27EB\u2AA2\u2AF8\u300B]/g;
var NAMED_ENTITY_MAP = new Map([
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
]);
var MEDIUM_EFFORT = ["file", "fiie", "flle"];
var TEXT_ESCAPE_RE = /[1|\u01C0\u2223\u2502\u2758\uFFE8]/g;
var ESCAPE_MAX_CHARS = /[\uFFFC\uFFFD\u2800\u115F\u1160\u3164\uFFA0\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;
var INVALID_CODE_POINT = "\uFFFD";
var MEDIUM = "medium";
var MAX_ENTITIES = 409600;
//@ chunk-eavynfj6.js:22115-25548 placement
/**
 * 对本地 html artifact 文件执行一次自动编辑：读文件、调模型、解析补丁、应用并在截止时间内返回结果。
 */
async function runAutoEditForFile(abortSignal) {
  let now = abortSignal.now ?? Date.now;
  let deadlineMs = abortSignal.deadlineMs ?? AUTO_EDIT_DEADLINE_MS;
  let n = now();
  let i = {
    readMs: 0,
    callMs: 0,
    retryMs: 0,
  };
  let r = (reason, pageBytes) => ({
    kind: "ineligible",
    reason,
    retried: false,
    pageBytes,
    timings: i,
  });
  let lower = extname(abortSignal.path).toLowerCase();
  if (lower !== ".html" && lower !== ".htm") return r("not_html");
  if (isDiskless()) return r("file_missing");
  let l;
  let f;
  try {
    let g = await stat(abortSignal.path);
    if (g.size > MAX_ENTITIES) return r("too_large", g.size);
    l = await readFile(abortSignal.path, "utf8");
    f = g.mtimeMs;
  } catch {
    return r("file_missing");
  }
  let a = Buffer.byteLength(l, "utf8");
  if (l.trim() === "") return r("empty_file", a);
  if (l.includes("\r")) return r("crlf", a);
  if (l.charCodeAt(0) === 65279) return r("bom", a);
  if (containsHarnessTags(l)) return r("fence", a);
  let thumbnailLinks = extractThumbnailLinks(l);
  if (
    thumbnailLinks.light !== undefined ||
    thumbnailLinks.dark !== undefined ||
    thumbnailLinks.missingHref === true ||
    thumbnailLinks.oversizeTag === true ||
    thumbnailLinks.badMedia !== undefined
  )
    return r("thumbnail", a);
  let d = abortSignal.permissions();
  let editPermissionVerdict = getEditPermissionVerdict(abortSignal.path, d);
  if (editPermissionVerdict !== "allowed")
    return r(editPermissionVerdict === "classify_all" ? "auto_mode_classify_all" : "edit_would_ask", a);
  if (!canWriteWithoutPrompt(abortSignal.path, abortSignal.slug, d)) return r("publish_would_ask", a);
  let A = now();
  let y = AbortSignal.timeout(Math.max(0, deadlineMs - (A - n)));
  let p = await webfetchReadFile(
    {
      slug: abortSignal.slug,
      env: claudeAiEnvironment(),
    },
    AbortSignal.any([abortSignal.context.abortController.signal, y]),
    abortSignal.context.credentials,
    "artifact_patch_turn_read",
    "probe",
    undefined,
    undefined,
    true,
  ).catch(() => {
    return;
  });
  i.readMs = now() - A;
  if (abortSignal.context.abortController.signal.aborted)
    return {
      kind: "canceled",
      reason: "read",
      retried: false,
      pageBytes: a,
      timings: i,
    };
  if (p === undefined || p.err !== null)
    return y.aborted
      ? {
          kind: "timeout",
          reason: "read",
          retried: false,
          pageBytes: a,
          timings: i,
        }
      : {
          kind: "skipped_read",
          reason: "read_failed",
          retried: false,
          pageBytes: a,
          timings: i,
        };
  if (p.role !== "owner") return r("not_owner", a);
  if (p.audience !== "owner") return r("shared", a);
  if (p.typeLocked) return r("type_locked", a);
  if (p.fileCount !== undefined && p.fileCount > 1) return r("multifile", a);
  if (p.contentStore !== undefined) return r("live_doc", a);
  if (
    p.readBack?.capabilities?.room !== undefined ||
    getShareEntry(abortSignal.slug)?.capabilities?.room !== undefined
  )
    return r("room", a);
  if (p.ver !== abortSignal.observedVer) return r("live_version_moved", a);
  let C = splitPatchPrompt(AUTO_EDIT_SYSTEM_PROMPT);
  let userPrompt = buildPatchFilesPrompt(C, "page", [
    {
      path: PAGE_HTML,
      text: l,
    },
  ]);
  let model = decisionPrompt(C, abortSignal.request);
  let retried = false;
  let sideCallMessageId;
  let k;
  for (let idx = 0; idx < 2; idx++) {
    let existingIdentifiers = deadlineMs - (now() - n);
    if (idx > 0 && existingIdentifiers < MIN_REMAINING_MS) break;
    let E = now();
    let agent = await generateAgent(userPrompt, model, existingIdentifiers, abortSignal);
    if (idx === 0) i.callMs = now() - E;
    else {
      i.retryMs = now() - E;
      retried = true;
    }
    if (agent.kind !== "ok")
      return agent.kind === "error"
        ? {
            kind: "side_call_failed",
            reason: "call_error",
            retried,
            pageBytes: a,
            timings: i,
          }
        : {
            kind: agent.kind,
            reason: "call",
            retried,
            pageBytes: a,
            timings: i,
          };
    if (idx === 0) sideCallMessageId = agent.messageId;
    if (agent.stopReason !== "end_turn") {
      k = {
        kind: "parse_failed",
        reason: agent.stopReason === "max_tokens" ? "stop_max_tokens" : "stop_other",
        retried,
        pageBytes: a,
        timings: i,
      };
      model += buildPatchRetryMessage(-1, "unparseable", "");
      continue;
    }
    let editDecisionJson = parseEditDecisionJson(agent.text, PAGE_HTML);
    if (!editDecisionJson.ok) {
      k = {
        kind: "parse_failed",
        reason: editDecisionJson.error.class,
        retried,
        pageBytes: a,
        timings: i,
      };
      model += buildPatchRetryMessage(-1, "unparseable", "");
      continue;
    }
    let decision = editDecisionJson.decision;
    if (decision.action === "hand_back")
      return {
        kind: "declined",
        reason: "hand_back",
        retried,
        pageBytes: a,
        timings: i,
      };
    let R = planPatchEdits(l, PAGE_HTML, decision.edits);
    if (!R.ok) {
      let I = decision.edits[R.edit];
      k = {
        kind: "apply_refused",
        reason: R.reason,
        retried,
        pageBytes: a,
        timings: i,
        ...(R.edit >= 0 && {
          failingEdit: R.edit,
        }),
      };
      model += buildPatchRetryMessage(
        R.edit,
        toPatchFailureReason(R.reason),
        I !== undefined && !I.create ? I.find : "",
      );
      continue;
    }
    let B = applyFindReplaceEdits(l, R.ops);
    if (B === undefined)
      return {
        ...r("edit_normalization", a),
        retried,
      };
    let O = abortSignal.permissions();
    if (getEditPermissionVerdict(abortSignal.path, O) !== "allowed")
      return {
        ...r("edit_would_ask_after_call", a),
        retried,
      };
    if (!canWriteWithoutPrompt(abortSignal.path, abortSignal.slug, O))
      return {
        ...r("publish_would_ask_after_call", a),
        retried,
      };
    return {
      kind: "patched",
      edits: B,
      editCount: decision.edits.length,
      reply: decision.reply,
      sideCallMessageId,
      retried,
      pageBytes: a,
      seedReadState: () => recordAutoEditRead(abortSignal.context.readFileState, abortSignal.path, l, f),
      timings: i,
    };
  }
  return {
    ...k,
    retried,
  };
}
//@ chunk-eavynfj6.js:25548-25822 placement
function toPatchFailureReason(reason) {
  switch (reason) {
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
export {
  MEDIUM,
  UNSET_REGEX_A,
  MEDIUM_EFFORT,
  ANGLE_BOUNDARY_RE,
  UNSET_REGEX_B,
  MAX_HTML_ENTITY_ATTEMPTS,
  ESCAPE_MAX_CHARS,
  MUSICAL_SYMBOL_RE,
  HTML_ESCAPE_RE,
  NAMED_ENTITY_MAP,
  INVALID_CODE_POINT,
  SIMPLE_ESCAPE_MAP,
  LEFT_ANGLE_VARIANTS_RE,
  RIGHT_ANGLE_VARIANTS_RE,
  TEXT_ESCAPE_RE,
};
