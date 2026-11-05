/**
 * services/artifacts/comments/autoEditPatch.ts
 *
 * 2.1.316 新增：自动编辑的补丁决策解析与应用
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0df0kb9z.js (27)
 * attribution: placement 26
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { extname } from "path";
import { stat, readFile } from "fs/promises";
import { MAX_PUBLISH_EDITS, applyFindReplace } from "../../../tools/ArtifactTool/publishEdits.js";
import { isWellFormedString, normalizeFullWidthSpace } from "../../../utils/stringUtils.js";
import { jsonParse } from "../../../utils/slowOperations.js";
import {
  FILLER_CHAR_CLASS,
  confusableTagScrubPattern,
  createTagNeutralizer,
  foldConfusableCharacters,
} from "../../../utils/confusables.js";
import { isDiskless } from "../../../bootstrap/state.js";
import { extractThumbnailLinks } from "../../../tools/ArtifactTool/artifactUrls.js";
import {
  getEditPermissionVerdict,
  canWriteWithoutPrompt,
  applyFindReplaceEdits,
  recordAutoEditRead,
  matchesTagPattern,
  decodeMusicalSymbols,
  decodeHtmlEscapes,
} from "./autoEditPermissions.js";
import { readArtifactContent } from "../webfetchRead.js";
import { claudeAiEnvironment } from "../../../constants/claudeAiOrigin.js";
import { getShareEntry } from "../shareEntries.js";
import { generateAgent } from "../../../components/agents/generateAgent.js";
import { stripCombiningRepeated } from "../../../utils/sanitization.js";

//@ chunk-0df0kb9z.js:13353-13415 placement
/**
 * 自动改稿补丁的限额：最多编辑数（沿用发布上限）、替换 64 KB、新建文件 256 KB、新建合计 512 KB，以及 surrogate 转义标记。
 */
var MAX_EDITS_PER_PATCH = MAX_PUBLISH_EDITS;
var MAX_REPLACE_BYTES = 65536;
var MAX_CREATE_FILE_BYTES = 262144;
var MAX_CREATE_BYTES = 524288;
var SURROGATE_ESCAPE = "surrogate_escape";
//@ chunk-0df0kb9z.js:13415-14019 placement
function parseEditDecisionJson(text, rawText) {
  let unwrapped = unwrapCodeFence(stripBomAndTrim(text));
  let fail = (cls, key) => ({
    ok: false,
    error: {
      class: cls,
      key,
    },
  });
  if (!isWellFormedString(unwrapped.text)) return fail("not_json", "");
  let { text: text_2, preamble } = findJsonObjectStart(unwrapped.text);
  let meta = {
    fenced: unwrapped.fenced,
    preamble,
  };
  let decision;
  try {
    decision = jsonParse(text_2);
  } catch {
    return fail("not_json", "");
  }
  if (!isPlainObject(decision)) return fail("not_json", "");
  let optionalString = readOptionalString(decision, "action");
  if (!optionalString.ok || !optionalString.present) return fail("wrong_shape", "action");
  if (optionalString.value === "hand_back") {
    let optionalString = readOptionalString(decision, "reason");
    if (!optionalString.ok) return fail("wrong_shape", "reason");
    return {
      ok: true,
      decision: {
        action: "hand_back",
        reason: optionalString.present ? normalizeFullWidthSpace(optionalString.value) : "",
        ...meta,
      },
    };
  }
  if (optionalString.value !== "edit") return fail("unknown_action", "action");
  if (hasLoneSurrogateEscape(text_2)) return fail("bad_string", SURROGATE_ESCAPE);
  return validateEditDecision(decision, rawText, meta);
}
//@ chunk-0df0kb9z.js:14019-14029 placement
var MAX_JSON_START_ATTEMPTS = 64;
//@ chunk-0df0kb9z.js:14029-14210 placement
/**
 * 在模型回复里找第一个能完整解析为 JSON 的 { 起点（有尝试次数上限），返回从那里开始的文本以及前面是否有多余前言。
 */
function findJsonObjectStart(text) {
  let fromIndex = text.indexOf("{");
  for (let i = 0; fromIndex >= 0 && i < MAX_JSON_START_ATTEMPTS; i++) {
    if (isParsableJsonAt(text, fromIndex))
      return {
        text: text.slice(fromIndex),
        preamble: fromIndex > 0,
      };
    let index = text.indexOf("{", fromIndex + 1);
    if (index < 0) break;
    fromIndex = index;
  }
  return {
    text,
    preamble: false,
  };
}
//@ chunk-0df0kb9z.js:14210-14452 placement
/**
 * 从给定位置按括号与字符串转义配平扫描到匹配的 }，尝试 JSON 解析该片段，成功返回 true。
 */
function isParsableJsonAt(text, fromIndex) {
  let depth = 0;
  let inString = false;
  for (let index = fromIndex; index < text.length; index++) {
    let ch = text[index];
    if (inString) {
      if (ch === "\\") index++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0)
        try {
          jsonParse(text.slice(fromIndex, index + 1));
          return true;
        } catch {
          return false;
        }
    }
  }
  return false;
}
//@ chunk-0df0kb9z.js:14452-16153 placement
function validateEditDecision(decision, sourceHtml, options) {
  let invalid = (errorClass, key) => ({
    ok: false,
    error: {
      class: errorClass,
      key,
    },
  });
  let optionalString = readOptionalString(decision, "reply");
  if (!optionalString.ok || !optionalString.present || optionalString.value.trim() === "")
    return invalid("wrong_shape", "reply");
  let optionalString_2 = readOptionalString(decision, "confidence");
  if (!optionalString_2.ok) return invalid("wrong_shape", "confidence");
  let edits = decision.edits;
  if (!Array.isArray(edits) || edits.some((edit) => edit !== null && !isPlainObject(edit)))
    return invalid("wrong_shape", "edits");
  if (edits.length === 0) return invalid("wrong_shape", "edits");
  if (edits.length > MAX_EDITS_PER_PATCH) return invalid("limit", "MaxEdits");
  let errors = [];
  let editsApplied = 0;
  let rewriteAllowed = 0;
  for (let idx = 0; idx < edits.length; idx++) {
    let edit = edits[idx];
    let fieldPath = (field) => `edits[${idx}].${field}`;
    if (!isPlainObject(edit)) return invalid("wrong_shape", `edits[${idx}]`);
    let optionalString = readOptionalString(edit, "file");
    if (!optionalString.ok) return invalid("wrong_shape", fieldPath("file"));
    let findText = optionalString.present ? optionalString.value : "";
    if (findText.trim() === "") {
      if (sourceHtml === "") return invalid("wrong_shape", fieldPath("file"));
      findText = sourceHtml;
    }
    let hasCreate = Object.hasOwn(edit, "create");
    let hasFind = Object.hasOwn(edit, "find");
    let hasReplace = Object.hasOwn(edit, "replace");
    if (hasCreate && (hasFind || hasReplace)) return invalid("wrong_shape", `edits[${idx}]`);
    if (hasCreate) {
      let optionalString = readOptionalString(edit, "create");
      if (!optionalString.ok || !optionalString.present || optionalString.value.trim() === "")
        return invalid("wrong_shape", fieldPath("create"));
      if (optionalString.value.includes("\x00")) return invalid("bad_string", fieldPath("create"));
      let bytes = utf8Bytes(optionalString.value);
      if (bytes > MAX_CREATE_FILE_BYTES) return invalid("limit", "MaxCreateFileBytes");
      rewriteAllowed += bytes;
      if (rewriteAllowed > MAX_CREATE_BYTES) return invalid("limit", "MaxCreateBytes");
      errors.push({
        file: findText,
        create: true,
        content: optionalString.value,
      });
      continue;
    }
    if (!hasFind && !hasReplace) return invalid("wrong_shape", `edits[${idx}]`);
    let optionalString_2 = readOptionalString(edit, "find");
    if (!optionalString_2.ok || !optionalString_2.present) return invalid("wrong_shape", fieldPath("find"));
    let optionalString_3 = readOptionalString(edit, "replace");
    if (!optionalString_3.ok || !optionalString_3.present)
      return invalid("wrong_shape", fieldPath("replace"));
    if (optionalString_2.value === "") return invalid("wrong_shape", fieldPath("find"));
    if (optionalString_3.value.includes("\x00")) return invalid("bad_string", fieldPath("replace"));
    editsApplied += utf8Bytes(optionalString_2.value) + utf8Bytes(optionalString_3.value);
    if (editsApplied > MAX_REPLACE_BYTES) return invalid("limit", "MaxReplaceBytes");
    errors.push({
      file: findText,
      create: false,
      find: optionalString_2.value,
      replace: optionalString_3.value,
    });
  }
  return {
    ok: true,
    decision: {
      action: "edit",
      edits: errors,
      reply: optionalString.value,
      confidence: optionalString_2.present ? optionalString_2.value : "",
      ...options,
    },
  };
}
//@ chunk-0df0kb9z.js:16153-16223 placement
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
//@ chunk-0df0kb9z.js:16223-16373 placement
function readOptionalString(obj, key) {
  if (!Object.hasOwn(obj, key) || obj[key] === null)
    return {
      ok: true,
      present: false,
    };
  let value = obj[key];
  return typeof value === "string"
    ? {
        ok: true,
        present: true,
        value,
      }
    : {
        ok: false,
      };
}
//@ chunk-0df0kb9z.js:16373-16422 placement
function utf8Bytes(text) {
  return Buffer.byteLength(text, "utf8");
}
//@ chunk-0df0kb9z.js:16422-16506 placement
function stripBomAndTrim(text) {
  let trimmed = text.trim();
  if (trimmed.startsWith("\uFEFF")) trimmed = trimmed.slice(1).trim();
  return trimmed;
}
//@ chunk-0df0kb9z.js:16506-16810 placement (2.1.88 match: buildSearchingPastContextSection, 0.75)
function unwrapCodeFence(text) {
  if (!text.startsWith("```") || !text.endsWith("```") || text.length < 6)
    return {
      text,
      fenced: false,
    };
  let sliced = text.slice(3, text.length - 3);
  let index = sliced.indexOf(`
`);
  if (index < 0)
    return {
      text,
      fenced: false,
    };
  let trimmed = sliced.slice(0, index).trim();
  if (trimmed.length > 0 && !/^[A-Za-z0-9]+$/.test(trimmed))
    return {
      text,
      fenced: false,
    };
  return {
    text: stripBomAndTrim(sliced.slice(index + 1)),
    fenced: true,
  };
}
//@ chunk-0df0kb9z.js:16810-17140 placement
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
//@ chunk-0df0kb9z.js:17140-17255 placement
function parseHex4(text, index) {
  if (index + 4 > text.length) return;
  let sliced = text.slice(index, index + 4);
  return /^[0-9A-Fa-f]{4}$/.test(sliced) ? parseInt(sliced, 16) : undefined;
}
//@ chunk-0df0kb9z.js:17255-17752 placement
function planPatchEdits(find, rawEdits, edits) {
  if (edits.length === 0)
    return {
      ok: false,
      reason: "empty",
      edit: -1,
    };
  let editList = [];
  for (let k = 0; k < edits.length; k++) {
    let edit = edits[k];
    if (!isSafeRelativePath(edit.file))
      return {
        ok: false,
        reason: "bad_path",
        edit: k,
      };
    if (edit.create)
      return {
        ok: false,
        reason: edit.file === rawEdits ? "exists" : "create_refused",
        edit: k,
      };
    if (edit.file !== rawEdits)
      return {
        ok: false,
        reason: "unknown_file",
        edit: k,
      };
    editList.push({
      find: edit.find,
      replace: edit.replace,
    });
  }
  let patched = applyFindReplace(find, editList);
  if (patched.ok)
    return {
      ok: true,
      content: patched.content,
      ops: editList,
    };
  return patched.reason === "noop"
    ? {
        ok: false,
        reason: "noop",
        edit: -1,
      }
    : {
        ok: false,
        reason: patched.reason,
        edit: patched.op,
      };
}
//@ chunk-0df0kb9z.js:17752-17936 placement
/**
 * 判断补丁里的文件路径是否安全：非空、不超过 512 字节、不以 / 开头、无控制字符与反斜杠、各段不为空/./..。
 */
function isSafeRelativePath(file) {
  if (file === "" || Buffer.byteLength(file, "utf8") > 512 || file.startsWith("/")) return false;
  if (/[\x00-\x1f\x7f\\]/.test(file)) return false;
  return file.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}
//@ chunk-0df0kb9z.js:17936-20128 placement
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
//@ chunk-0df0kb9z.js:20128-20209 placement
var PAGE_HTML = "page.html";
var PAGE_HTML_DESCRIPTION = {
  page: "The artifact is a single-file web page, page.html.",
};
//@ chunk-0df0kb9z.js:20209-20379 placement
function splitPatchPrompt(prompt) {
  let index = prompt.indexOf(`

`);
  let before = index === -1 ? prompt : prompt.slice(0, index);
  let after = index === -1 ? "" : prompt.slice(index + 2);
  return {
    systemLine: before.replace(/[ \t\n]+$/, ""),
    decisionBlock: after.replace(/[ \t\n]+$/, ""),
  };
}
//@ chunk-0df0kb9z.js:20379-20410 placement
var FILE_CLOSE_TAG = "</file>";
var ESCAPED_FILE_CLOSE_TAG = "<\\/file>";
//@ chunk-0df0kb9z.js:20410-20666 placement
function buildPatchFilesPrompt(ctx, head, files) {
  let sorted = [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  let text = `${ctx.systemLine}
${PAGE_HTML_DESCRIPTION[head]}
The artifact's current files are between the fences.`;
  for (let file of sorted) {
    let replaced = file.text.replaceAll(FILE_CLOSE_TAG, ESCAPED_FILE_CLOSE_TAG);
    text += `
<file path="${file.path}">
${replaced}
${FILE_CLOSE_TAG}`;
  }
  return text;
}
//@ chunk-0df0kb9z.js:20666-20733 placement
function decisionPrompt(thread, request) {
  return `${thread.decisionBlock}

The person asks:
${request}
`;
}
//@ chunk-0df0kb9z.js:20733-21060 placement
var PATCH_FAILURE_DESCRIPTIONS = {
  not_found: 'its "find" does not occur in that file',
  ambiguous: 'its "find" occurs more than once in that file',
  no_such_file: "it names a file that does not exist",
  bad_create: "it creates a file that already exists or has a bad path",
  noop: "the patch changed nothing",
  unparseable: "the reply was not a valid decision object",
};
//@ chunk-0df0kb9z.js:21060-21273 placement
/**
 * 补丁应用失败后的重试提示：第几处编辑失败、失败原因、失败的查找文本（截断），要求重新给出决策对象。
 */
function buildPatchRetryMessage(edit, patchFailureReason, editRecord) {
  let joined = [...editRecord].slice(0, 2000).join("");
  return `
Your previous patch was not applied: edit #${edit + 1} failed because ${PATCH_FAILURE_DESCRIPTIONS[patchFailureReason]}:
<failed_find>
${joined}
</failed_find>
Respond again with one decision object.
`;
}
//@ chunk-0df0kb9z.js:21273-23273 placement
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
var EFFORT_TYPOS = ["file", "fiie", "flle"];
var TEXT_ESCAPE_RE = /[1|\u01C0\u2223\u2502\u2758\uFFE8]/g;
var ESCAPE_TARGETS_RE = /[\uFFFC\uFFFD\u2800\u115F\u1160\u3164\uFFA0\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;
var INVALID_CODE_POINT = "\uFFFD";
var MEDIUM_EFFORT = "medium";
var MAX_ENTITIES = 409600;
//@ chunk-0df0kb9z.js:23273-26706 placement
/**
 * 对本地 html artifact 文件执行一次自动编辑：读文件、调模型、解析补丁、应用并在截止时间内返回结果。
 */
async function runAutoEditForFile(abortSignal) {
  let now = abortSignal.now ?? Date.now;
  let deadlineMs = abortSignal.deadlineMs ?? AUTO_EDIT_DEADLINE_MS;
  let startedAt = now();
  let timings = {
    readMs: 0,
    callMs: 0,
    retryMs: 0,
  };
  let ineligible = (reason, pageBytes) => ({
    kind: "ineligible",
    reason,
    retried: false,
    pageBytes,
    timings,
  });
  let lower = extname(abortSignal.path).toLowerCase();
  if (lower !== ".html" && lower !== ".htm") return ineligible("not_html");
  if (isDiskless()) return ineligible("file_missing");
  let html;
  let mtime;
  try {
    let fileStat = await stat(abortSignal.path);
    if (fileStat.size > MAX_ENTITIES) return ineligible("too_large", fileStat.size);
    html = await readFile(abortSignal.path, "utf8");
    mtime = fileStat.mtimeMs;
  } catch {
    return ineligible("file_missing");
  }
  let bytes = Buffer.byteLength(html, "utf8");
  if (html.trim() === "") return ineligible("empty_file", bytes);
  if (html.includes("\r")) return ineligible("crlf", bytes);
  if (html.charCodeAt(0) === 65279) return ineligible("bom", bytes);
  if (containsHarnessTags(html)) return ineligible("fence", bytes);
  let thumbnailLinks = extractThumbnailLinks(html);
  if (
    thumbnailLinks.light !== undefined ||
    thumbnailLinks.dark !== undefined ||
    thumbnailLinks.missingHref === true ||
    thumbnailLinks.oversizeTag === true ||
    thumbnailLinks.badMedia !== undefined
  )
    return ineligible("thumbnail", bytes);
  let permissions = abortSignal.permissions();
  let editPermissionVerdict = getEditPermissionVerdict(abortSignal.path, permissions);
  if (editPermissionVerdict !== "allowed")
    return ineligible(
      editPermissionVerdict === "classify_all" ? "auto_mode_classify_all" : "edit_would_ask",
      bytes,
    );
  if (!canWriteWithoutPrompt(abortSignal.path, abortSignal.slug, permissions))
    return ineligible("publish_would_ask", bytes);
  let nowMs = now();
  let timeoutSignal = AbortSignal.timeout(Math.max(0, deadlineMs - (nowMs - startedAt)));
  let read = await readArtifactContent(
    {
      slug: abortSignal.slug,
      env: claudeAiEnvironment(),
    },
    AbortSignal.any([abortSignal.context.abortController.signal, timeoutSignal]),
    abortSignal.context.credentials,
    "artifact_patch_turn_read",
    "probe",
    undefined,
    undefined,
    true,
  ).catch(() => {
    return;
  });
  timings.readMs = now() - nowMs;
  if (abortSignal.context.abortController.signal.aborted)
    return {
      kind: "canceled",
      reason: "read",
      retried: false,
      pageBytes: bytes,
      timings,
    };
  if (read === undefined || read.err !== null)
    return timeoutSignal.aborted
      ? {
          kind: "timeout",
          reason: "read",
          retried: false,
          pageBytes: bytes,
          timings,
        }
      : {
          kind: "skipped_read",
          reason: "read_failed",
          retried: false,
          pageBytes: bytes,
          timings,
        };
  if (read.role !== "owner") return ineligible("not_owner", bytes);
  if (read.audience !== "owner") return ineligible("shared", bytes);
  if (read.typeLocked) return ineligible("type_locked", bytes);
  if (read.fileCount !== undefined && read.fileCount > 1) return ineligible("multifile", bytes);
  if (read.contentStore !== undefined) return ineligible("live_doc", bytes);
  if (
    read.readBack?.capabilities?.room !== undefined ||
    getShareEntry(abortSignal.slug)?.capabilities?.room !== undefined
  )
    return ineligible("room", bytes);
  if (read.ver !== abortSignal.observedVer) return ineligible("live_version_moved", bytes);
  let systemPrompt = splitPatchPrompt(AUTO_EDIT_SYSTEM_PROMPT);
  let userPrompt = buildPatchFilesPrompt(systemPrompt, "page", [
    {
      path: PAGE_HTML,
      text: html,
    },
  ]);
  let model = decisionPrompt(systemPrompt, abortSignal.request);
  let retried = false;
  let sideCallMessageId;
  let decision;
  for (let idx = 0; idx < 2; idx++) {
    let existingIdentifiers = deadlineMs - (now() - startedAt);
    if (idx > 0 && existingIdentifiers < MIN_REMAINING_MS) break;
    let callStart = now();
    let agent = await generateAgent(userPrompt, model, existingIdentifiers, abortSignal);
    if (idx === 0) timings.callMs = now() - callStart;
    else {
      timings.retryMs = now() - callStart;
      retried = true;
    }
    if (agent.kind !== "ok")
      return agent.kind === "error"
        ? {
            kind: "side_call_failed",
            reason: "call_error",
            retried,
            pageBytes: bytes,
            timings,
          }
        : {
            kind: agent.kind,
            reason: "call",
            retried,
            pageBytes: bytes,
            timings,
          };
    if (idx === 0) sideCallMessageId = agent.messageId;
    if (agent.stopReason !== "end_turn") {
      decision = {
        kind: "parse_failed",
        reason: agent.stopReason === "max_tokens" ? "stop_max_tokens" : "stop_other",
        retried,
        pageBytes: bytes,
        timings,
      };
      model += buildPatchRetryMessage(-1, "unparseable", "");
      continue;
    }
    let editDecisionJson = parseEditDecisionJson(agent.text, PAGE_HTML);
    if (!editDecisionJson.ok) {
      decision = {
        kind: "parse_failed",
        reason: editDecisionJson.error.class,
        retried,
        pageBytes: bytes,
        timings,
      };
      model += buildPatchRetryMessage(-1, "unparseable", "");
      continue;
    }
    let decision_2 = editDecisionJson.decision;
    if (decision_2.action === "hand_back")
      return {
        kind: "declined",
        reason: "hand_back",
        retried,
        pageBytes: bytes,
        timings,
      };
    let plan = planPatchEdits(html, PAGE_HTML, decision_2.edits);
    if (!plan.ok) {
      let failedEdit = decision_2.edits[plan.edit];
      decision = {
        kind: "apply_refused",
        reason: plan.reason,
        retried,
        pageBytes: bytes,
        timings,
        ...(plan.edit >= 0 && {
          failingEdit: plan.edit,
        }),
      };
      model += buildPatchRetryMessage(
        plan.edit,
        toPatchFailureReason(plan.reason),
        failedEdit !== undefined && !failedEdit.create ? failedEdit.find : "",
      );
      continue;
    }
    let editedHtml = applyFindReplaceEdits(html, plan.ops);
    if (editedHtml === undefined)
      return {
        ...ineligible("edit_normalization", bytes),
        retried,
      };
    let permissions = abortSignal.permissions();
    if (getEditPermissionVerdict(abortSignal.path, permissions) !== "allowed")
      return {
        ...ineligible("edit_would_ask_after_call", bytes),
        retried,
      };
    if (!canWriteWithoutPrompt(abortSignal.path, abortSignal.slug, permissions))
      return {
        ...ineligible("publish_would_ask_after_call", bytes),
        retried,
      };
    return {
      kind: "patched",
      edits: editedHtml,
      editCount: decision_2.edits.length,
      reply: decision_2.reply,
      sideCallMessageId,
      retried,
      pageBytes: bytes,
      seedReadState: () =>
        recordAutoEditRead(abortSignal.context.readFileState, abortSignal.path, html, mtime),
      timings,
    };
  }
  return {
    ...decision,
    retried,
  };
}
//@ chunk-0df0kb9z.js:26706-26980 placement
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
//@ chunk-0df0kb9z.js:28593-28884 placement (moved: shares a binding it assigns)
/**
 * 判断文本里是否藏有 harness 标签：逐轮尝试反斜杠/尖括号同形字替换、HTML 转义解码、去组合字符与同形字折叠后检测，超过轮数或膨胀过大时保守地返回结果。
 */
function containsHarnessTags(text) {
  let patternA = (UNSET_REGEX_A ??= confusableTagScrubPattern(EFFORT_TYPOS, () => ANGLE_BOUNDARY_RE));
  let patternB = (UNSET_REGEX_B ??= createTagNeutralizer([
    {
      tags: EFFORT_TYPOS,
      tail: ({ name }) => `[-_]*(?![${name}])`,
    },
  ]));
  let current = text;
  for (let round = 0; ; round++) {
    if (matchesTagPattern(current, patternA, patternB)) return true;
    if (round === MAX_HTML_ENTITY_ATTEMPTS) return false;
    let decoded = decodeMusicalSymbols(decodeHtmlEscapes(decodeMusicalSymbols(current)));
    if (decoded !== current && matchesTagPattern(decoded, patternA, patternB)) return true;
    let folded = foldConfusableCharacters(stripCombiningRepeated(decoded).replace(ESCAPE_TARGETS_RE, ""));
    if (folded === current) return false;
    if (folded.length > 2 * text.length) return true;
    current = folded;
  }
}
export {
  MEDIUM_EFFORT,
  MUSICAL_SYMBOL_RE,
  HTML_ESCAPE_RE,
  NAMED_ENTITY_MAP,
  INVALID_CODE_POINT,
  SIMPLE_ESCAPE_MAP,
  LEFT_ANGLE_VARIANTS_RE,
  RIGHT_ANGLE_VARIANTS_RE,
  TEXT_ESCAPE_RE,
  runAutoEditForFile,
};
