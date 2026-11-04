/**
 * tools/FileEditTool/utils.ts
 *
 * 编辑匹配与 patch 工具：弯引号与 \uXXXX 宽松匹配、反净化、应用编辑、编辑等价判断（混有若干误归声明）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/FileEditTool/utils.ts
 * pieces: chunk-9br8f9tm.js (35), chunk-e6aww6q8.js (5)
 * attribution: sole-consumer 1, placement 10, fingerprint 9, layout 14, file-local 5, callgraph-witnessed 1
 */
import { resolve, parse } from "path";
import { HostScoped } from "../../utils/hostScoped.js";
import { FileReadCache } from "../../utils/fileReadCache.js";
import { getRootSession } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { urlPatternToRegex, countCharInString } from "../../utils/stringUtils.js";
import { logForDebugging } from "../../utils/debug.js";
import { getPatchForDisplay, getPatchFromContents, DIFF_TIMEOUT_MS } from "../../utils/diff.js";
import { FileStateError } from "./fileStateErrors.js";
import { structuredPatch } from "../../../vendor/diff/libesm/patch/create.js";
import { isTabReadSeparationEnabled } from "../FileReadTool/limits.js";
import { addLineNumbers } from "../../utils/file.js";
import { isPathAbsent, isEISDIR, errorMessage } from "../../utils/errors.js";
import { isNotRegularFileError, readFileChecked } from "../../utils/fileRead.js";
import { expandPath } from "../../utils/path.js";
import { isUncOrDevicePath, isDevicePrefixPath } from "../../utils/pathClassification.js";
import { isWslUncPath, isNetworkOrSpecialPath } from "../../utils/networkPaths.js";
import { isPathUnder } from "../../utils/pathPrefix.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-9br8f9tm.js:1515-1538 sole-consumer
/**
 * FileReadCache 的惰性单例。
 */
var fileReadCache; // deferred: uses FileReadCache (../../utils/fileReadCache.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-9br8f9tm.js:1515", () => {
  fileReadCache = new HostScoped(() => new FileReadCache());
});
//@ chunk-9br8f9tm.js:1538-1603 placement
/**
 * 从文件读取缓存里取内容。
 */
function readCachedFileContent(filePath) {
  let { content } = fileReadCache.of(getRootSession().host).readFile(filePath);
  return content;
}
//@ chunk-9br8f9tm.js:1645-1752 placement (2.1.88 match: getMemoryBaseDir, 0.773)
function getMemoryBaseDir() {
  let CLAUDE_CODE_REMOTE_MEMORY_DIR = env.CLAUDE_CODE_REMOTE_MEMORY_DIR;
  if (!CLAUDE_CODE_REMOTE_MEMORY_DIR) return;
  let resolvedDir = resolve(CLAUDE_CODE_REMOTE_MEMORY_DIR);
  return resolvedDir === parse(resolvedDir).root ? undefined : resolvedDir;
}
//@ chunk-9br8f9tm.js:1752-1797 placement
/**
 * 判断路径是否为 Markdown（.md/.mdx）。
 */
function isMarkdownPath(filePath) {
  return /\.(md|mdx)$/i.test(filePath);
}
//@ chunk-9br8f9tm.js:1797-1955 placement
function stripTrailingWhitespace(str) {
  let lines = str.split(/(\r\n|\n|\r)/);
  let result = "";
  for (let i = 0; i < lines.length; i++) {
    let part = lines[i];
    if (part !== undefined)
      if (i % 2 === 0) result += part.replace(/\s+$/, "");
      else result += part;
  }
  return result;
}
//@ chunk-9br8f9tm.js:1955-2326 fingerprint (2.1.88 match: DESANITIZATIONS, 0.979)
/**
 * API 会把部分 XML 标签与 Human/Assistant 前缀净化成短形式；这里是反净化映射（<fnr> 到 <function_results> 等）。
 */
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
//@ chunk-9br8f9tm.js:2326-2487 fingerprint (2.1.88 match: desanitizeMatchString, 1)
/**
 * 按 DESANITIZATIONS 把字符串反净化，返回结果与实际应用的替换列表。
 */
function desanitizeMatchString(matchString) {
  let result = matchString;
  let appliedReplacements = [];
  for (let [from, to] of Object.entries(DESANITIZATIONS)) {
    let beforeReplace = result;
    result = result.replaceAll(from, to);
    if (beforeReplace !== result)
      appliedReplacements.push({
        from,
        to,
      });
  }
  return {
    result,
    appliedReplacements,
  };
}
//@ chunk-9br8f9tm.js:2487-2535 layout
var LEFT_SINGLE_CURLY_QUOTE = "\u2018";
var RIGHT_SINGLE_CURLY_QUOTE = "\u2019";
var LEFT_DOUBLE_CURLY_QUOTE = "\u201C";
var RIGHT_DOUBLE_CURLY_QUOTE = "\u201D";
//@ chunk-9br8f9tm.js:2535-2630 file-local
/**
 * 把弯引号（单/双，左/右）归一为直引号，用于宽松匹配 old_string。
 */
function normalizeQuotes(str) {
  return str
    .replaceAll(LEFT_SINGLE_CURLY_QUOTE, "'")
    .replaceAll(RIGHT_SINGLE_CURLY_QUOTE, "'")
    .replaceAll(LEFT_DOUBLE_CURLY_QUOTE, '"')
    .replaceAll(RIGHT_DOUBLE_CURLY_QUOTE, '"');
}
//@ chunk-9br8f9tm.js:2630-2676 layout
var UNICODE_ESCAPE_RE = /\\u[0-9a-fA-F]{4}/;
var NON_ASCII_RE = /[\u0080-\uffff]/;
//@ chunk-9br8f9tm.js:2676-2796 layout
function decodeUnicodeEscapes(text) {
  return text.replace(/(\\\\)|\\u([0-9a-fA-F]{4})/g, (wholeMatch, escapedBackslash, hexDigits) =>
    escapedBackslash !== undefined ? wholeMatch : String.fromCharCode(parseInt(hexDigits, 16)),
  );
}
//@ chunk-9br8f9tm.js:2796-3000 layout
function buildEscapedFormRegexSource(text) {
  let regexSource = "";
  for (let idx = 0; idx < text.length; idx++) {
    let code = text.charCodeAt(idx);
    if (code >= 128) {
      regexSource += "\\\\u";
      for (let hexDigit of code.toString(16).padStart(4, "0"))
        regexSource += hexDigit >= "a" ? `[${hexDigit}${hexDigit.toUpperCase()}]` : hexDigit;
    } else regexSource += urlPatternToRegex(text[idx]);
  }
  return regexSource;
}
//@ chunk-9br8f9tm.js:3000-3097 layout
function escapedFormLength(text) {
  let nonAsciiCount = 0;
  for (let idx = 0; idx < text.length; idx++) if (text.charCodeAt(idx) >= 128) nonAsciiCount++;
  return text.length + 5 * nonAsciiCount;
}
//@ chunk-9br8f9tm.js:3097-3156 layout
function countPrecedingBackslashes(text, index) {
  let count = 0;
  while (text[index - 1 - count] === "\\") count++;
  return count;
}
//@ chunk-9br8f9tm.js:3156-3672 layout
function findEscapedFormInFile(oldString, fileContent) {
  if (countPrecedingBackslashes(oldString, oldString.length) % 2 === 1) return null;
  let nonAsciiOffsets = oldString[0] === "\\" ? [0] : [];
  let escapedOffset = 0;
  for (let idx = 0; idx < oldString.length; idx++)
    if (oldString.charCodeAt(idx) >= 128) {
      nonAsciiOffsets.push(escapedOffset);
      escapedOffset += 6;
    } else escapedOffset += 1;
  let escapedFormRegexSource = buildEscapedFormRegexSource(oldString);
  try {
    let regExp = new RegExp(escapedFormRegexSource, "g");
    for (let match = regExp.exec(fileContent); match !== null; match = regExp.exec(fileContent)) {
      let index = match.index;
      if (nonAsciiOffsets.every((offset) => countPrecedingBackslashes(fileContent, index + offset) % 2 === 0))
        return fileContent.indexOf(match[0]) === index ? match[0] : null;
      regExp.lastIndex = index + 1;
    }
    return null;
  } catch (error) {
    logForDebugging(
      `Edit: skipped the \\uXXXX-escape search; the regex engine refused a ${escapedFormRegexSource.length}-character pattern (${error instanceof Error ? error.name : "non-Error"})`,
    );
    return null;
  }
}
//@ chunk-9br8f9tm.js:3672-3716 layout
/**
 * 字符串是否含 \uXXXX 转义或非 ASCII 字符（决定匹配失败提示里是否提到转义互换）。
 */
function hasUnicodeOrEscapes(oldString) {
  return UNICODE_ESCAPE_RE.test(oldString) || NON_ASCII_RE.test(oldString);
}
//@ chunk-9br8f9tm.js:3716-4222 layout
/**
 * 若 old_string 以字符形式书写而文件里是 \uXXXX 形式（或反之），把 new_string 转成与文件一致的形式（十六进制大小写跟随文件）。
 */
function preserveEscapeStyle(oldString, matchedOldString, newString) {
  if (oldString === matchedOldString) return newString;
  if (
    NON_ASCII_RE.test(oldString) &&
    escapedFormLength(oldString) === matchedOldString.length &&
    findEscapedFormInFile(oldString, matchedOldString) !== null
  ) {
    let escapeByCode = new Map();
    let upperHexCount = 0;
    let lowerHexCount = 0;
    for (let idx = 0, escapedIndex = 0; idx < oldString.length; idx++) {
      let code = oldString.charCodeAt(idx);
      if (code >= 128) {
        let sliced = matchedOldString.slice(escapedIndex + 2, escapedIndex + 6);
        escapeByCode.set(code, sliced);
        for (let hexDigit of sliced)
          if (hexDigit >= "a" && hexDigit <= "f") lowerHexCount++;
          else if (hexDigit >= "A" && hexDigit <= "F") upperHexCount++;
        escapedIndex += 6;
      } else escapedIndex += 1;
    }
    return newString.replace(/[\u0080-\uffff]/g, (char) => {
      let code = char.charCodeAt(0);
      let matchedEscape = escapeByCode.get(code);
      if (matchedEscape !== undefined) return "\\u" + matchedEscape;
      let padded = code.toString(16).padStart(4, "0");
      return "\\u" + (upperHexCount > lowerHexCount ? padded.toUpperCase() : padded);
    });
  }
  if (UNICODE_ESCAPE_RE.test(oldString) && decodeUnicodeEscapes(oldString) === matchedOldString)
    return decodeUnicodeEscapes(newString);
  return newString;
}
//@ chunk-9br8f9tm.js:4222-4485 callgraph-witnessed (2.1.88 match: findActualString, 1)
/**
 * 在文件中定位 old_string 的实际文本：原样、弯引号归一、\uXXXX 解码、文件中的转义形式依次尝试；找不到返回 null。
 */
function findActualString(fileContent, searchString) {
  if (fileContent.includes(searchString)) return searchString;
  let normalizedSearch = normalizeQuotes(searchString);
  let index = normalizeQuotes(fileContent).indexOf(normalizedSearch);
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
//@ chunk-9br8f9tm.js:4485-4649 file-local
/**
 * 实际匹配到弯引号时，把 new_string 里的直引号按上下文换成对应弯引号（开/闭判断、字母间撇号）。
 */
function preserveQuoteStyle(oldString, actualOldString, newString) {
  if (oldString === actualOldString) return newString;
  let hasDoubleQuotes =
    actualOldString.includes(LEFT_DOUBLE_CURLY_QUOTE) || actualOldString.includes(RIGHT_DOUBLE_CURLY_QUOTE);
  let hasSingleQuotes =
    actualOldString.includes(LEFT_SINGLE_CURLY_QUOTE) || actualOldString.includes(RIGHT_SINGLE_CURLY_QUOTE);
  if (!hasDoubleQuotes && !hasSingleQuotes) return newString;
  let result = newString;
  if (hasDoubleQuotes) result = applyCurlyDoubleQuotes(result);
  if (hasSingleQuotes) result = applyCurlySingleQuotes(result);
  return result;
}
//@ chunk-9br8f9tm.js:4649-4795 layout
/**
 * 判断位置 n 处的引号是否为开引号（前一个字符是空白、括号或破折号，或在开头）。
 */
function isOpeningContext(chars, index) {
  if (index === 0) return true;
  let prev = chars[index - 1];
  return (
    prev === " " ||
    prev === "\t" ||
    prev ===
      `
` ||
    prev === "\r" ||
    prev === "(" ||
    prev === "[" ||
    prev === "{" ||
    prev === "\u2014" ||
    prev === "\u2013"
  );
}
//@ chunk-9br8f9tm.js:4795-4923 file-local
function applyCurlyDoubleQuotes(str) {
  let chars = [...str];
  let result = [];
  for (let i = 0; i < chars.length; i++)
    if (chars[i] === '"')
      result.push(isOpeningContext(chars, i) ? LEFT_DOUBLE_CURLY_QUOTE : RIGHT_DOUBLE_CURLY_QUOTE);
    else result.push(chars[i]);
  return result.join("");
}
//@ chunk-9br8f9tm.js:4923-5190 file-local
function applyCurlySingleQuotes(str) {
  let chars = [...str];
  let result = [];
  for (let i = 0; i < chars.length; i++)
    if (chars[i] === "'") {
      let prev = i > 0 ? chars[i - 1] : undefined;
      let next = i < chars.length - 1 ? chars[i + 1] : undefined;
      let prevIsLetter = prev !== undefined && /\p{L}/u.test(prev);
      let nextIsLetter = next !== undefined && /\p{L}/u.test(next);
      if (prevIsLetter && nextIsLetter) result.push(RIGHT_SINGLE_CURLY_QUOTE);
      else result.push(isOpeningContext(chars, i) ? LEFT_SINGLE_CURLY_QUOTE : RIGHT_SINGLE_CURLY_QUOTE);
    } else result.push(chars[i]);
  return result.join("");
}
//@ chunk-9br8f9tm.js:5190-5370 file-local
/**
 * 对内容应用单个编辑；new_string 为空且 old_string 后紧跟换行时连同换行一起删除；replace_all 用 replaceAll。
 */
function applyEditToFile(originalContent, oldString, newString, replaceAll = false) {
  let replace = replaceAll
    ? (content, search, replace) => content.replaceAll(search, () => replace)
    : (content, search, replace) => content.replace(search, () => replace);
  if (newString !== "") return replace(originalContent, oldString, newString);
  return !oldString.endsWith(`
`) &&
    originalContent.includes(
      oldString +
        `
`,
    )
    ? replace(
        originalContent,
        oldString +
          `
`,
        newString,
      )
    : replace(originalContent, oldString, newString);
}
//@ chunk-9br8f9tm.js:5370-5578 fingerprint (2.1.88 match: getPatchForEdit, 0.928)
/**
 * 单个编辑的 patch：包成 edits 数组调用 getPatchForEdits。
 */
function getPatchForEdit({
  filePath,
  fileContents,
  oldString,
  newString,
  replaceAll = false,
  isForToolResult,
}) {
  return getPatchForEdits({
    filePath,
    fileContents,
    edits: [
      {
        old_string: oldString,
        new_string: newString,
        replace_all: replaceAll,
      },
    ],
    isForToolResult,
  });
}
//@ chunk-9br8f9tm.js:5578-5886 fingerprint (2.1.88 match: areFileEditsEquivalent, 0.713)
/**
 * 对文件内容应用一组编辑，返回 {patch, updatedFile}；空文件加空编辑时返回空 updatedFile 与"无变化" patch。
 */
function getPatchForEdits({ filePath, fileContents, edits, isForToolResult }) {
  if (normalizeEdit(fileContents, edits))
    return {
      patch: getPatchForDisplay({
        filePath,
        fileContents,
        edits: [
          {
            old_string: fileContents,
            new_string: fileContents,
            replace_all: false,
          },
        ],
      }),
      updatedFile: "",
    };
  let updatedContent = applyEditsToContent(fileContents, edits);
  return {
    patch: getPatchFromContents({
      filePath,
      oldContent: fileContents,
      newContent: updatedContent,
      convertTabs: true,
      isForToolResult,
    }),
    updatedFile: updatedContent,
  };
}
//@ chunk-9br8f9tm.js:5886-5984 layout (2.1.88 match: normalizeEdit, 1)
function normalizeEdit(fileContent, edit) {
  return (
    !fileContent &&
    edit.length === 1 &&
    edit[0] !== undefined &&
    edit[0].old_string === "" &&
    edit[0].new_string === ""
  );
}
//@ chunk-9br8f9tm.js:5984-6498 fingerprint (2.1.88 match: getPatchForEdits, 0.75)
/**
 * 依次应用编辑；若 old_string 落在之前某个 new_string 里、某个编辑未生效或整体无变化则抛错。
 */
function applyEditsToContent(fileContents, edit) {
  if (normalizeEdit(fileContents, edit)) return "";
  let originalContent = fileContents;
  let appliedNewStrings = [];
  for (let edit_2 of edit) {
    let oldStringToCheck = edit_2.old_string.replace(/\n+$/, "");
    for (let previousNewString of appliedNewStrings)
      if (oldStringToCheck !== "" && previousNewString.includes(oldStringToCheck))
        throw Error("Cannot edit file: old_string is a substring of a new_string from a previous edit.");
    let previousContent = originalContent;
    originalContent =
      edit_2.old_string === ""
        ? edit_2.new_string
        : applyEditToFile(originalContent, edit_2.old_string, edit_2.new_string, edit_2.replace_all);
    if (originalContent === previousContent)
      throw new FileStateError("String not found in file. Failed to apply edit.");
    appliedNewStrings.push(edit_2.new_string);
  }
  if (originalContent === fileContents)
    throw Error("Original and edited file match exactly. Failed to apply edit.");
  return originalContent;
}
//@ chunk-9br8f9tm.js:6498-6509 layout
var DIFF_SNIPPET_MAX_BYTES = 8192;
//@ chunk-9br8f9tm.js:6509-6977 fingerprint (2.1.88 match: getSnippetForTwoFileDiff, 0.887)
/**
 * 两个文件内容的 diff 片段：8 行上下文、带行号、hunk 间用 "..." 分隔，超过 8192 字节时截断并附省略说明。
 */
function getSnippetForTwoFileDiff(fileAContents, fileBContents) {
  let patch = structuredPatch("file.txt", "file.txt", fileAContents, fileBContents, undefined, undefined, {
    context: 8,
    timeout: DIFF_TIMEOUT_MS,
  });
  if (!patch) return "";
  let tabAwareSeparator = isTabReadSeparationEnabled();
  let full = patch.hunks
    .map((hunk) => ({
      startLine: hunk.oldStart,
      content: hunk.lines
        .filter((line) => !line.startsWith("-") && !line.startsWith("\\"))
        .map((line) => line.slice(1)).join(`
`),
      tabAwareSeparator,
    }))
    .map(addLineNumbers).join(`
...
`);
  if (full.length <= DIFF_SNIPPET_MAX_BYTES) return full;
  let cutoff = full.lastIndexOf(
    `
`,
    DIFF_SNIPPET_MAX_BYTES,
  );
  let kept = cutoff > 0 ? full.slice(0, cutoff) : full.slice(0, DIFF_SNIPPET_MAX_BYTES);
  let lineNumberOffset = 1;
  let truncationSlack = 1;
  let remaining =
    countCharInString(
      full,
      `
`,
      kept.length + lineNumberOffset,
    ) + truncationSlack;
  return `${kept}

... [${remaining} lines truncated] ...`;
}
//@ chunk-9br8f9tm.js:6977-7267 fingerprint (2.1.88 match: getEditsForPatch, 1)
/**
 * 把结构化 patch 的 hunks 还原为 {old_string,new_string} 编辑列表。
 */
function getEditsForPatch(patch) {
  return patch.map((hunk) => {
    let oldLines = [];
    let newLines = [];
    for (let line of hunk.lines)
      if (line.startsWith(" ")) {
        oldLines.push(line.slice(1));
        newLines.push(line.slice(1));
      } else if (line.startsWith("-")) oldLines.push(line.slice(1));
      else if (line.startsWith("+")) newLines.push(line.slice(1));
    return {
      old_string: oldLines.join(`
`),
      new_string: newLines.join(`
`),
      replace_all: false,
    };
  });
}
//@ chunk-9br8f9tm.js:7267-7309 layout
function isExpectedReadError(error) {
  return isPathAbsent(error) || isEISDIR(error) || isNotRegularFileError(error);
}
//@ chunk-9br8f9tm.js:7309-8243 fingerprint (2.1.88 match: normalizeFileEditInput, 0.738)
/**
 * 归一化 Edit 输入：跳过 UNC/特殊路径；记忆目录下只清洗 new_string；否则读文件，old_string 不在文件中时尝试反净化 old/new_string。
 */
function normalizeFileEditInput({ file_path, edits }) {
  if (edits.length === 0)
    return {
      file_path,
      edits,
    };
  let isMarkdown = isMarkdownPath(file_path);
  try {
    let fullPath = expandPath(file_path);
    if (
      ((isUncOrDevicePath(file_path) || isUncOrDevicePath(fullPath)) &&
        !(isWslUncPath(file_path) || isWslUncPath(fullPath))) ||
      isDevicePrefixPath(file_path) ||
      isDevicePrefixPath(fullPath) ||
      isNetworkOrSpecialPath(file_path) ||
      isNetworkOrSpecialPath(fullPath)
    )
      return {
        file_path,
        edits,
      };
    let memoryBaseDir = getMemoryBaseDir();
    if (
      memoryBaseDir !== undefined &&
      isPathUnder(fullPath, memoryBaseDir) &&
      edits.every((edit) => desanitizeMatchString(edit.old_string).appliedReplacements.length === 0)
    )
      return {
        file_path,
        edits: isMarkdown
          ? edits
          : edits.map((edit) =>
              edit.old_string === ""
                ? edit
                : {
                    ...edit,
                    new_string: stripTrailingWhitespace(edit.new_string),
                  },
            ),
      };
    let fileContent = readCachedFileContent(fullPath);
    return {
      file_path,
      edits: edits.map(({ old_string, new_string, replace_all }) => {
        let normalizedNewString = isMarkdown ? new_string : stripTrailingWhitespace(new_string);
        if (fileContent.includes(old_string))
          return {
            old_string,
            new_string: normalizedNewString,
            replace_all,
          };
        let { result: desanitizedOldString, appliedReplacements } = desanitizeMatchString(old_string);
        if (fileContent.includes(desanitizedOldString)) {
          let desanitizedNewString = normalizedNewString;
          for (let { from, to } of appliedReplacements)
            desanitizedNewString = desanitizedNewString.replaceAll(from, to);
          return {
            old_string: desanitizedOldString,
            new_string: desanitizedNewString,
            replace_all,
          };
        }
        return {
          old_string,
          new_string: normalizedNewString,
          replace_all,
        };
      }),
    };
  } catch (error) {
    if (!isExpectedReadError(error))
      logForDebugging(
        `Failed to read ${file_path} for edit normalization: ${error instanceof Error ? error.message : String(error)}`,
        {
          level: "error",
        },
      );
  }
  return {
    file_path,
    edits,
  };
}
//@ chunk-9br8f9tm.js:8243-8599 layout (2.1.88 match: getEditsForPatch, 0.884)
/**
 * 两组编辑在同一原文上是否产生相同结果（都报错时比较错误文本）。
 */
function areFileEditsEquivalent(edits1, edits2, fileContents) {
  if (
    edits1.length === edits2.length &&
    edits1.every((edit1, index) => {
      let edit2 = edits2[index];
      return (
        edit2 !== undefined &&
        edit1.old_string === edit2.old_string &&
        edit1.new_string === edit2.new_string &&
        edit1.replace_all === edit2.replace_all
      );
    })
  )
    return true;
  let result1 = null;
  let error1 = null;
  let result2 = null;
  let error2 = null;
  try {
    result1 = applyEditsToContent(fileContents, edits1);
  } catch (e) {
    error1 = errorMessage(e);
  }
  try {
    result2 = applyEditsToContent(fileContents, edits2);
  } catch (e) {
    error2 = errorMessage(e);
  }
  if (error1 !== null && error2 !== null) return error1 === error2;
  if (error1 !== null || error2 !== null) return false;
  return result1 === result2;
}
//@ chunk-9br8f9tm.js:8599-8832 fingerprint (2.1.88 match: areFileEditsInputsEquivalent, 1)
/**
 * 两个编辑输入是否逐字段完全相同（快速路径）。
 */
function areFileEditInputsIdentical(input1, input2) {
  return (
    input1.file_path === input2.file_path &&
    input1.edits.length === input2.edits.length &&
    input1.edits.every((edit1, index) => {
      let edit2 = input2.edits[index];
      return (
        edit2 !== undefined &&
        edit1.old_string === edit2.old_string &&
        edit1.new_string === edit2.new_string &&
        edit1.replace_all === edit2.replace_all
      );
    })
  );
}
//@ chunk-9br8f9tm.js:8832-9089 placement
/**
 * 两个编辑输入是否等价：路径相同、字面相同，否则读当前文件比较两组编辑的应用结果（areFileEditsEquivalent）。
 */
function areFileEditsInputsEquivalent(input1, input2) {
  if (input1.file_path !== input2.file_path) return false;
  if (areFileEditInputsIdentical(input1, input2)) return true;
  let cachedContent = "";
  if (
    (!isUncOrDevicePath(input1.file_path) || isWslUncPath(input1.file_path)) &&
    !isDevicePrefixPath(input1.file_path) &&
    !isNetworkOrSpecialPath(input1.file_path) &&
    !isNetworkOrSpecialPath(resolve(input1.file_path))
  )
    try {
      cachedContent = readCachedFileContent(input1.file_path);
    } catch (error) {
      if (!isExpectedReadError(error)) throw error;
    }
  return areFileEditsEquivalent(input1.edits, input2.edits, cachedContent);
}
//@ chunk-e6aww6q8.js:4645172-4645791 placement
/**
 * 把 replace_name/path/old_str 等别名改为标准字段。
 */
function normalizeEditInputAliases(rawInput) {
  if (!isPlainObject_5(rawInput)) return null;
  let normalizedInput = {
    ...rawInput,
  };
  let appliedAliases = [];
  if ("replace_name" in normalizedInput) {
    let replaceName = normalizedInput.replace_name;
    if (!("replace_all" in normalizedInput))
      normalizedInput.replace_all = replaceName === true || replaceName === "true";
    delete normalizedInput.replace_name;
    appliedAliases.push("alias_replace_name");
  }
  if (
    "path" in normalizedInput &&
    !("file_path" in normalizedInput) &&
    typeof normalizedInput.path === "string"
  ) {
    normalizedInput.file_path = normalizedInput.path;
    delete normalizedInput.path;
    appliedAliases.push("path");
  }
  if (
    "old_str" in normalizedInput &&
    !("old_string" in normalizedInput) &&
    typeof normalizedInput.old_str === "string"
  ) {
    normalizedInput.old_string = normalizedInput.old_str;
    delete normalizedInput.old_str;
    appliedAliases.push("old_str");
  }
  if (
    "new_str" in normalizedInput &&
    !("new_string" in normalizedInput) &&
    typeof normalizedInput.new_str === "string"
  ) {
    normalizedInput.new_string = normalizedInput.new_str;
    delete normalizedInput.new_str;
    appliedAliases.push("new_str");
  }
  return appliedAliases.length
    ? {
        input: normalizedInput,
        shapeClass: appliedAliases.join(","),
      }
    : null;
}
//@ chunk-e6aww6q8.js:4647900-4647926 placement
/**
 * 记录编辑指纹时文件的大小上限（4 MiB）。
 */
var MAX_FINGERPRINT_FILE_CHARS = 4194304;
var MAX_FINGERPRINT_EDIT_CHARS = 16384;
//@ chunk-e6aww6q8.js:4647926-4648003 placement
/**
 * 开关与托管模式下记录一次编辑指纹。
 */
function maybeRecordEditFingerprint(fingerprintInput) {
  if (!isRemoteManagedEnvironment() || !getFeatureValue_CACHED_MAY_BE_STALE("tengu_patient_meteor", false))
    return;
  return recordEditFingerprint(fingerprintInput);
}
//@ chunk-e6aww6q8.js:4648003-4648565 placement
/**
 * 记录编辑结果的内容哈希（大小受限）。
 */
function recordEditFingerprint({ absoluteFilePath, output, originalFile, updatedFile, appliedNewString }) {
  if (
    originalFile.length > MAX_FINGERPRINT_FILE_CHARS ||
    updatedFile.length > MAX_FINGERPRINT_FILE_CHARS ||
    output.oldString.length + output.newString.length > MAX_FINGERPRINT_EDIT_CHARS
  )
    return;
  let contentHash = computeContentHash(
    updatedFile.replaceAll(
      `\r
`,
      `
`,
    ),
  );
  let fingerprintJson = jsonStringify({
    filePath: output.filePath,
    oldString: output.oldString,
    newString: output.newString,
    ...(appliedNewString !== output.newString && {
      appliedNewString,
    }),
    replaceAll: output.replaceAll,
    userModified: output.userModified,
    structuredPatch: output.structuredPatch,
    originalFile: null,
    originalFileSha256: computeContentHash(originalFile),
    updatedFileSha256: contentHash,
  });
  if (fingerprintJson.length > MAX_FINGERPRINT_EDIT_CHARS) return;
  return {
    subagentFrameResult: jsonParse(fingerprintJson),
    subagentFrameResultHolds: () => doesFileStillMatchHash(absoluteFilePath, contentHash),
  };
}
//@ chunk-e6aww6q8.js:4648565-4648659 placement
/**
 * 判断文件内容是否仍等于给定哈希（读不到视为不等）。
 */
async function doesFileStillMatchHash(absoluteFilePath, contentHash) {
  try {
    let { content } = await readFileChecked(absoluteFilePath, MAX_FINGERPRINT_FILE_CHARS * 4);
    return computeContentHash(content) === contentHash;
  } catch {
    return false;
  }
}
export {
  findActualString,
  preserveEscapeStyle,
  preserveQuoteStyle,
  getMemoryBaseDir,
  getSnippetForTwoFileDiff,
  isMarkdownPath,
  stripTrailingWhitespace,
  desanitizeMatchString,
  normalizeFileEditInput,
  getPatchForEdit,
  normalizeEditInputAliases,
  areFileEditInputsIdentical,
  areFileEditsInputsEquivalent,
  hasUnicodeOrEscapes,
  recordEditFingerprint,
  maybeRecordEditFingerprint,
  getEditsForPatch,
  getPatchForEdits,
};
