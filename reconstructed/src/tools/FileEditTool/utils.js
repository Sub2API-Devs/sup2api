/**
 * tools/FileEditTool/utils.ts
 *
 * 编辑匹配与 patch 工具：弯引号与 \uXXXX 宽松匹配、反净化、应用编辑、编辑等价判断（混有若干误归声明）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/FileEditTool/utils.ts
 * pieces: chunk-9br8f9tm.js (34)
 * attribution: sole-consumer 1, placement 4, fingerprint 9, layout 14, file-local 5, callgraph-witnessed 1
 */
import { resolve, resolve as resolve_2, parse } from "path";
import { HostScoped } from "../../utils/hostScoped.js";
import { FileReadCache } from "../../utils/fileReadCache.js";
import { getRootSession } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { urlPatternToRegex, countCharInString } from "../../utils/stringUtils.js";
import { logForDebugging } from "../../utils/debug.js";
import { getPatchForDisplay, getPatchFromContents, I7n } from "../../utils/diff.js";
import { FileStateError } from "./fileStateErrors.js";
import { P3 } from "../../../vendor/diff/libesm/patch/create.js";
import { Dat } from "../FileReadTool/limits.js";
import { addLineNumbers } from "../../utils/file.js";
import { isPathAbsent, isEISDIR, errorMessage } from "../../utils/errors.js";
import { bde } from "../../utils/fileRead.js";
import { expandPath } from "../../utils/path.js";
import { Qn, gb } from "../../utils/pathClassification.js";
import { isWslUncPath, n_ } from "../../utils/networkPaths.js";
import { isPathUnder } from "../../utils/pathPrefix.js";

/**
 * FileReadCache 的惰性单例。
 */
//@ chunk-9br8f9tm.js:1515-1538 sole-consumer
var fileReadCache = new HostScoped(() => new FileReadCache());
//@ chunk-9br8f9tm.js:1538-1603 placement
function E(e) {
  let { content: content } = fileReadCache.of(getRootSession().host).readFile(e);
  return content;
}
//@ chunk-9br8f9tm.js:1645-1752 placement = getMemoryBaseDir (0.773)
function getMemoryBaseDir() {
  let CLAUDE_CODE_REMOTE_MEMORY_DIR = env.CLAUDE_CODE_REMOTE_MEMORY_DIR;
  if (!CLAUDE_CODE_REMOTE_MEMORY_DIR) return;
  let n = resolve_2(CLAUDE_CODE_REMOTE_MEMORY_DIR);
  return n === parse(n).root ? void 0 : n;
}
//@ chunk-9br8f9tm.js:1752-1797 placement
function WEt(e) {
  return /\.(md|mdx)$/i.test(e);
}
//@ chunk-9br8f9tm.js:1797-1955 placement
function stripTrailingWhitespace(str) {
  let lines = str.split(/(\r\n|\n|\r)/),
    result = "";
  for (let s = 0; s < lines.length; s++) {
    let part = lines[s];
    if (part !== void 0)
      if (s % 2 === 0) result += part.replace(/\s+$/, "");
      else result += part;
  }
  return result;
}
/**
 * API 会把部分 XML 标签与 Human/Assistant 前缀净化成短形式；这里是反净化映射（<fnr> 到 <function_results> 等）。
 */
//@ chunk-9br8f9tm.js:1955-2326 fingerprint = DESANITIZATIONS (0.979)
var DESANITIZATIONS = {
  "<fnr>": "<function_results>",
  "<n>": "<name>",
  "</n>": "</name>",
  "<o>": "<output>",
  "</o>": "</output>",
  "<e>": "<error>",
  "</e>": "</error>",
  "<s>": "<system>",
  "</s>": "</system>",
  "<r>": "<result>",
  "</r>": "</result>",
  "< META_START >": "<META_START>",
  "< META_END >": "<META_END>",
  "< EOT >": "<EOT>",
  "< META >": "<META>",
  "< SOS >": "<SOS>",
  "\n\nH:": `

Human:`,
  "\n\nA:": `

Assistant:`,
};
/**
 * 按 DESANITIZATIONS 把字符串反净化，返回结果与实际应用的替换列表。
 */
//@ chunk-9br8f9tm.js:2326-2487 fingerprint = desanitizeMatchString (1)
function desanitizeMatchString(matchString) {
  let n = matchString,
    appliedReplacements = [];
  for (let [s, o] of Object.entries(DESANITIZATIONS)) {
    let l = n;
    if (((n = n.replaceAll(s, o)), l !== n)) appliedReplacements.push({ from: s, to: o });
  }
  return { result: n, appliedReplacements: appliedReplacements };
}
//@ chunk-9br8f9tm.js:2487-2535 layout
var LEFT_SINGLE_CURLY_QUOTE = "\u2018",
  RIGHT_SINGLE_CURLY_QUOTE = "\u2019",
  LEFT_DOUBLE_CURLY_QUOTE = "\u201C",
  RIGHT_DOUBLE_CURLY_QUOTE = "\u201D";
/**
 * 把弯引号（单/双，左/右）归一为直引号，用于宽松匹配 old_string。
 */
//@ chunk-9br8f9tm.js:2535-2630 file-local
function normalizeQuotes(str) {
  return str
    .replaceAll(LEFT_SINGLE_CURLY_QUOTE, "'")
    .replaceAll(RIGHT_SINGLE_CURLY_QUOTE, "'")
    .replaceAll(LEFT_DOUBLE_CURLY_QUOTE, '"')
    .replaceAll(RIGHT_DOUBLE_CURLY_QUOTE, '"');
}
//@ chunk-9br8f9tm.js:2630-2676 layout
var UNICODE_ESCAPE_RE = /\\u[0-9a-fA-F]{4}/,
  NON_ASCII_RE = /[\u0080-\uffff]/;
//@ chunk-9br8f9tm.js:2676-2796 layout
function decodeUnicodeEscapes(e) {
  return e.replace(/(\\\\)|\\u([0-9a-fA-F]{4})/g, (n, r, s) =>
    r !== void 0 ? n : String.fromCharCode(parseInt(s, 16)),
  );
}
//@ chunk-9br8f9tm.js:2796-3000 layout
function buildEscapedFormRegexSource(e) {
  let n = "";
  for (let r = 0; r < e.length; r++) {
    let code = e.charCodeAt(r);
    if (code >= 128) {
      n += "\\\\u";
      for (let o of code.toString(16).padStart(4, "0")) n += o >= "a" ? `[${o}${o.toUpperCase()}]` : o;
    } else n += urlPatternToRegex(e[r]);
  }
  return n;
}
//@ chunk-9br8f9tm.js:3000-3097 layout
function escapedFormLength(e) {
  let n = 0;
  for (let r = 0; r < e.length; r++) if (e.charCodeAt(r) >= 128) n++;
  return e.length + 5 * n;
}
//@ chunk-9br8f9tm.js:3097-3156 layout
function countPrecedingBackslashes(e, n) {
  let r = 0;
  while (e[n - 1 - r] === "\\") r++;
  return r;
}
//@ chunk-9br8f9tm.js:3156-3672 layout
function findEscapedFormInFile(e, n) {
  if (countPrecedingBackslashes(e, e.length) % 2 === 1) return null;
  let r = e[0] === "\\" ? [0] : [],
    s = 0;
  for (let l = 0; l < e.length; l++)
    if (e.charCodeAt(l) >= 128) (r.push(s), (s += 6));
    else s += 1;
  let o = buildEscapedFormRegexSource(e);
  try {
    let regExp = new RegExp(o, "g");
    for (let match = regExp.exec(n); match !== null; match = regExp.exec(n)) {
      let index = match.index;
      if (r.every((a) => countPrecedingBackslashes(n, index + a) % 2 === 0))
        return n.indexOf(match[0]) === index ? match[0] : null;
      regExp.lastIndex = index + 1;
    }
    return null;
  } catch (error) {
    return (
      logForDebugging(
        `Edit: skipped the \\uXXXX-escape search; the regex engine refused a ${o.length}-character pattern (${error instanceof Error ? error.name : "non-Error"})`,
      ),
      null
    );
  }
}
/**
 * 字符串是否含 \uXXXX 转义或非 ASCII 字符（决定匹配失败提示里是否提到转义互换）。
 */
//@ chunk-9br8f9tm.js:3672-3716 layout
function hasUnicodeOrEscapes(e) {
  return UNICODE_ESCAPE_RE.test(e) || NON_ASCII_RE.test(e);
}
/**
 * 若 old_string 以字符形式书写而文件里是 \uXXXX 形式（或反之），把 new_string 转成与文件一致的形式（十六进制大小写跟随文件）。
 */
//@ chunk-9br8f9tm.js:3716-4222 layout
function preserveEscapeStyle(e, n, r) {
  if (e === n) return r;
  if (NON_ASCII_RE.test(e) && escapedFormLength(e) === n.length && findEscapedFormInFile(e, n) !== null) {
    let s = new Map(),
      o = 0,
      l = 0;
    for (let c = 0, u = 0; c < e.length; c++) {
      let code = e.charCodeAt(c);
      if (code >= 128) {
        let sliced = n.slice(u + 2, u + 6);
        s.set(code, sliced);
        for (let p of sliced)
          if (p >= "a" && p <= "f") l++;
          else if (p >= "A" && p <= "F") o++;
        u += 6;
      } else u += 1;
    }
    return r.replace(/[\u0080-\uffff]/g, (c) => {
      let code = c.charCodeAt(0),
        a = s.get(code);
      if (a !== void 0) return "\\u" + a;
      let padded = code.toString(16).padStart(4, "0");
      return "\\u" + (o > l ? padded.toUpperCase() : padded);
    });
  }
  if (UNICODE_ESCAPE_RE.test(e) && decodeUnicodeEscapes(e) === n) return decodeUnicodeEscapes(r);
  return r;
}
/**
 * 在文件中定位 old_string 的实际文本：原样、弯引号归一、\uXXXX 解码、文件中的转义形式依次尝试；找不到返回 null。
 */
//@ chunk-9br8f9tm.js:4222-4485 callgraph-witnessed = findActualString (1)
function findActualString(fileContent, searchString) {
  if (fileContent.includes(searchString)) return searchString;
  let normalizedSearch = normalizeQuotes(searchString),
    index = normalizeQuotes(fileContent).indexOf(normalizedSearch);
  if (index !== -1) return fileContent.substring(index, index + searchString.length);
  if (UNICODE_ESCAPE_RE.test(searchString)) {
    let normalizedFile = decodeUnicodeEscapes(searchString);
    if (normalizedFile !== searchString && fileContent.includes(normalizedFile)) return normalizedFile;
  }
  if (NON_ASCII_RE.test(searchString)) {
    if (escapedFormLength(searchString) > fileContent.length || !fileContent.includes("\\u")) return null;
    return findEscapedFormInFile(searchString, fileContent);
  }
  return null;
}
/**
 * 实际匹配到弯引号时，把 new_string 里的直引号按上下文换成对应弯引号（开/闭判断、字母间撇号）。
 */
//@ chunk-9br8f9tm.js:4485-4649 file-local
function preserveQuoteStyle(oldString, actualOldString, newString) {
  if (oldString === actualOldString) return newString;
  let s =
      actualOldString.includes(LEFT_DOUBLE_CURLY_QUOTE) || actualOldString.includes(RIGHT_DOUBLE_CURLY_QUOTE),
    o =
      actualOldString.includes(LEFT_SINGLE_CURLY_QUOTE) || actualOldString.includes(RIGHT_SINGLE_CURLY_QUOTE);
  if (!s && !o) return newString;
  let result = newString;
  if (s) result = applyCurlyDoubleQuotes(result);
  if (o) result = applyCurlySingleQuotes(result);
  return result;
}
/**
 * 判断位置 n 处的引号是否为开引号（前一个字符是空白、括号或破折号，或在开头）。
 */
//@ chunk-9br8f9tm.js:4649-4795 layout
function isOpeningContext(e, n) {
  if (n === 0) return !0;
  let r = e[n - 1];
  return (
    r === " " ||
    r === "\t" ||
    r ===
      `
` ||
    r === "\r" ||
    r === "(" ||
    r === "[" ||
    r === "{" ||
    r === "\u2014" ||
    r === "\u2013"
  );
}
//@ chunk-9br8f9tm.js:4795-4923 file-local
function applyCurlyDoubleQuotes(str) {
  let chars = [...str],
    result = [];
  for (let s = 0; s < chars.length; s++)
    if (chars[s] === '"')
      result.push(isOpeningContext(chars, s) ? LEFT_DOUBLE_CURLY_QUOTE : RIGHT_DOUBLE_CURLY_QUOTE);
    else result.push(chars[s]);
  return result.join("");
}
//@ chunk-9br8f9tm.js:4923-5190 file-local
function applyCurlySingleQuotes(str) {
  let chars = [...str],
    result = [];
  for (let s = 0; s < chars.length; s++)
    if (chars[s] === "'") {
      let o = s > 0 ? chars[s - 1] : void 0,
        l = s < chars.length - 1 ? chars[s + 1] : void 0,
        c = o !== void 0 && /\p{L}/u.test(o),
        u = l !== void 0 && /\p{L}/u.test(l);
      if (c && u) result.push(RIGHT_SINGLE_CURLY_QUOTE);
      else result.push(isOpeningContext(chars, s) ? LEFT_SINGLE_CURLY_QUOTE : RIGHT_SINGLE_CURLY_QUOTE);
    } else result.push(chars[s]);
  return result.join("");
}
/**
 * 对内容应用单个编辑；new_string 为空且 old_string 后紧跟换行时连同换行一起删除；replace_all 用 replaceAll。
 */
//@ chunk-9br8f9tm.js:5190-5370 file-local
function applyEditToFile(originalContent, oldString, newString, replaceAll = !1) {
  let o = replaceAll
    ? (content, search, replace) => content.replaceAll(search, () => replace)
    : (content, search, replace) => content.replace(search, () => replace);
  if (newString !== "") return o(originalContent, oldString, newString);
  return !oldString.endsWith(`
`) &&
    originalContent.includes(
      oldString +
        `
`,
    )
    ? o(
        originalContent,
        oldString +
          `
`,
        newString,
      )
    : o(originalContent, oldString, newString);
}
/**
 * 单个编辑的 patch：包成 edits 数组调用 getPatchForEdits。
 */
//@ chunk-9br8f9tm.js:5370-5578 fingerprint = getPatchForEdit (0.928)
function getPatchForEdit({
  filePath: filePath,
  fileContents: fileContents,
  oldString: oldString,
  newString: newString,
  replaceAll: replaceAll = !1,
  isForToolResult: isForToolResult,
}) {
  return getPatchForEdits({
    filePath: filePath,
    fileContents: fileContents,
    edits: [{ old_string: oldString, new_string: newString, replace_all: replaceAll }],
    isForToolResult: isForToolResult,
  });
}
/**
 * 对文件内容应用一组编辑，返回 {patch, updatedFile}；空文件加空编辑时返回空 updatedFile 与"无变化" patch。
 */
//@ chunk-9br8f9tm.js:5578-5886 fingerprint = areFileEditsEquivalent (0.713)
function getPatchForEdits({
  filePath: filePath,
  fileContents: fileContents,
  edits: edits,
  isForToolResult: isForToolResult,
}) {
  if (normalizeEdit(fileContents, edits))
    return {
      patch: getPatchForDisplay({
        filePath: filePath,
        fileContents: fileContents,
        edits: [{ old_string: fileContents, new_string: fileContents, replace_all: !1 }],
      }),
      updatedFile: "",
    };
  let o = applyEditsToContent(fileContents, edits);
  return {
    patch: getPatchFromContents({
      filePath: filePath,
      oldContent: fileContents,
      newContent: o,
      convertTabs: !0,
      isForToolResult: isForToolResult,
    }),
    updatedFile: o,
  };
}
//@ chunk-9br8f9tm.js:5886-5984 layout = normalizeEdit (1)
function normalizeEdit(fileContent, edit) {
  return (
    !fileContent &&
    edit.length === 1 &&
    edit[0] !== void 0 &&
    edit[0].old_string === "" &&
    edit[0].new_string === ""
  );
}
/**
 * 依次应用编辑；若 old_string 落在之前某个 new_string 里、某个编辑未生效或整体无变化则抛错。
 */
//@ chunk-9br8f9tm.js:5984-6498 fingerprint = getPatchForEdits (0.75)
function applyEditsToContent(e, n) {
  if (normalizeEdit(e, n)) return "";
  let r = e,
    appliedNewStrings = [];
  for (let edit of n) {
    let oldStringToCheck = edit.old_string.replace(/\n+$/, "");
    for (let previousNewString of appliedNewStrings)
      if (oldStringToCheck !== "" && previousNewString.includes(oldStringToCheck))
        throw Error("Cannot edit file: old_string is a substring of a new_string from a previous edit.");
    let c = r;
    if (
      ((r =
        edit.old_string === ""
          ? edit.new_string
          : applyEditToFile(r, edit.old_string, edit.new_string, edit.replace_all)),
      r === c)
    )
      throw new FileStateError("String not found in file. Failed to apply edit.");
    appliedNewStrings.push(edit.new_string);
  }
  if (r === e) throw Error("Original and edited file match exactly. Failed to apply edit.");
  return r;
}
//@ chunk-9br8f9tm.js:6498-6509 layout
var DIFF_SNIPPET_MAX_BYTES = 8192;
/**
 * 两个文件内容的 diff 片段：8 行上下文、带行号、hunk 间用 "..." 分隔，超过 8192 字节时截断并附省略说明。
 */
//@ chunk-9br8f9tm.js:6509-6977 fingerprint = getSnippetForTwoFileDiff (0.887)
function getSnippetForTwoFileDiff(fileAContents, fileBContents) {
  let patch = P3("file.txt", "file.txt", fileAContents, fileBContents, void 0, void 0, {
    context: 8,
    timeout: I7n,
  });
  if (!patch) return "";
  let s = Dat(),
    joined = patch.hunks
      .map((hunk) => ({
        startLine: hunk.oldStart,
        content: hunk.lines
          .filter((line) => !line.startsWith("-") && !line.startsWith("\\"))
          .map((g) => g.slice(1)).join(`
`),
        tabAwareSeparator: s,
      }))
      .map(addLineNumbers).join(`
...
`);
  if (joined.length <= DIFF_SNIPPET_MAX_BYTES) return joined;
  let index = joined.lastIndexOf(
      `
`,
      DIFF_SNIPPET_MAX_BYTES,
    ),
    kept = index > 0 ? joined.slice(0, index) : joined.slice(0, DIFF_SNIPPET_MAX_BYTES),
    u = 1,
    a = 1,
    remaining =
      countCharInString(
        joined,
        `
`,
        kept.length + u,
      ) + a;
  return `${kept}

... [${remaining} lines truncated] ...`;
}
/**
 * 把结构化 patch 的 hunks 还原为 {old_string,new_string} 编辑列表。
 */
//@ chunk-9br8f9tm.js:6977-7267 fingerprint = getEditsForPatch (1)
function getEditsForPatch(patch) {
  return patch.map((hunk) => {
    let r = [],
      s = [];
    for (let line of hunk.lines)
      if (line.startsWith(" ")) (r.push(line.slice(1)), s.push(line.slice(1)));
      else if (line.startsWith("-")) r.push(line.slice(1));
      else if (line.startsWith("+")) s.push(line.slice(1));
    return {
      old_string: r.join(`
`),
      new_string: s.join(`
`),
      replace_all: !1,
    };
  });
}
//@ chunk-9br8f9tm.js:7267-7309 layout
function isExpectedReadError(e) {
  return isPathAbsent(e) || isEISDIR(e) || bde(e);
}
/**
 * 归一化 Edit 输入：跳过 UNC/特殊路径；记忆目录下只清洗 new_string；否则读文件，old_string 不在文件中时尝试反净化 old/new_string。
 */
//@ chunk-9br8f9tm.js:7309-8243 fingerprint = normalizeFileEditInput (0.738)
function normalizeFileEditInput({ file_path: file_path, edits: edits }) {
  if (edits.length === 0) return { file_path: file_path, edits: edits };
  let r = WEt(file_path);
  try {
    let fullPath = expandPath(file_path);
    if (
      ((Qn(file_path) || Qn(fullPath)) && !(isWslUncPath(file_path) || isWslUncPath(fullPath))) ||
      gb(file_path) ||
      gb(fullPath) ||
      n_(file_path) ||
      n_(fullPath)
    )
      return { file_path: file_path, edits: edits };
    let o = getMemoryBaseDir();
    if (
      o !== void 0 &&
      isPathUnder(fullPath, o) &&
      edits.every((c) => desanitizeMatchString(c.old_string).appliedReplacements.length === 0)
    )
      return {
        file_path: file_path,
        edits: r
          ? edits
          : edits.map((c) =>
              c.old_string === "" ? c : { ...c, new_string: stripTrailingWhitespace(c.new_string) },
            ),
      };
    let fileContent = E(fullPath);
    return {
      file_path: file_path,
      edits: edits.map(({ old_string: old_string, new_string: new_string, replace_all: replace_all }) => {
        let normalizedNewString = r ? new_string : stripTrailingWhitespace(new_string);
        if (fileContent.includes(old_string))
          return { old_string: old_string, new_string: normalizedNewString, replace_all: replace_all };
        let { result: desanitizedOldString, appliedReplacements: appliedReplacements } =
          desanitizeMatchString(old_string);
        if (fileContent.includes(desanitizedOldString)) {
          let desanitizedNewString = normalizedNewString;
          for (let { from: from, to: to } of appliedReplacements)
            desanitizedNewString = desanitizedNewString.replaceAll(from, to);
          return {
            old_string: desanitizedOldString,
            new_string: desanitizedNewString,
            replace_all: replace_all,
          };
        }
        return { old_string: old_string, new_string: normalizedNewString, replace_all: replace_all };
      }),
    };
  } catch (error) {
    if (!isExpectedReadError(error))
      logForDebugging(
        `Failed to read ${file_path} for edit normalization: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      );
  }
  return { file_path: file_path, edits: edits };
}
/**
 * 两组编辑在同一原文上是否产生相同结果（都报错时比较错误文本）。
 */
//@ chunk-9br8f9tm.js:8243-8599 layout = getEditsForPatch (0.884)
function areFileEditsEquivalent(e, n, r) {
  if (
    e.length === n.length &&
    e.every((u, a) => {
      let f = n[a];
      return (
        f !== void 0 &&
        u.old_string === f.old_string &&
        u.new_string === f.new_string &&
        u.replace_all === f.replace_all
      );
    })
  )
    return !0;
  let s = null,
    o = null,
    l = null,
    c = null;
  try {
    s = applyEditsToContent(r, e);
  } catch (error) {
    o = errorMessage(error);
  }
  try {
    l = applyEditsToContent(r, n);
  } catch (error) {
    c = errorMessage(error);
  }
  if (o !== null && c !== null) return o === c;
  if (o !== null || c !== null) return !1;
  return s === l;
}
/**
 * 两个编辑输入是否逐字段完全相同（快速路径）。
 */
//@ chunk-9br8f9tm.js:8599-8832 fingerprint = areFileEditsInputsEquivalent (1)
function areFileEditInputsIdentical(input1, input2) {
  return (
    input1.file_path === input2.file_path &&
    input1.edits.length === input2.edits.length &&
    input1.edits.every((edit1, index) => {
      let edit2 = input2.edits[index];
      return (
        edit2 !== void 0 &&
        edit1.old_string === edit2.old_string &&
        edit1.new_string === edit2.new_string &&
        edit1.replace_all === edit2.replace_all
      );
    })
  );
}

export {
  findActualString,
  preserveEscapeStyle,
  preserveQuoteStyle,
  areFileEditInputsIdentical,
  E,
  isExpectedReadError,
  areFileEditsEquivalent,
  getMemoryBaseDir,
  getSnippetForTwoFileDiff,
  WEt,
  stripTrailingWhitespace,
  desanitizeMatchString,
  normalizeFileEditInput,
  getPatchForEdit,
  hasUnicodeOrEscapes,
  getEditsForPatch,
  getPatchForEdits,
};
