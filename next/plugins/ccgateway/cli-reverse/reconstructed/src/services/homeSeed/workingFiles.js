/**
 * services/homeSeed/workingFiles.ts
 *
 * 云会话工作文件（CLAUDE.md、rules、output-styles）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ch5peek9.js (8), chunk-vb7ng9fr.js (17)
 * attribution: placement 23, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { posix, sep, isAbsolute, join, relative } from "path";
import { lstat as lstat_2, realpath, open } from "fs/promises";
import { joined_5 } from "../../utils/teleport/seedPaths.js";
import { hasWindowsUnsafeSegment } from "../../utils/windowsPathNames.js";
import { nfcLowerNfc } from "../../utils/teleport/remoteTaskLabels.js";
import { isWellFormedString, firstLineOf } from "../../utils/stringUtils.js";
import { MAX_WORKING_FILE_BYTES as MAX_WORKING_FILE_BYTES_2 } from "../syncedFiles/syncedFileSyncer.js";
import { logForDebugging } from "../../utils/debug.js";
import { hasBackslash } from "../../utils/pathClassification.js";
import { readOnlyNoFollowFlags } from "../../utils/platformTargets.js";
import { getErrnoCode } from "../../utils/errors.js";
import { lexMarkdown } from "../../utils/claudemd.js";
import { hasUnvettedInclude, escapeAtSigns, isBackslashEscaped } from "../../utils/claudemdIncludes.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ch5peek9.js:367-840 placement
/**
 * 匹配以组合符号开头的正则。
 */
var dir; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WORKING_FILES_ROOT;
var joined;
var MAX_WORKING_PATH_CHARS;
var MAX_WORKING_FILE_BYTES;
var MAX_WORKING_FILE_TOTAL_BYTES;
var MAX_WORKING_PATH_LENGTH;
var MAX_WORKING_NAME_BYTES;
var MAX_WORKING_PATH_DEPTH;
var CLAUDE_MD;
var RULES;
var OUTPUT_STYLES;
var SETTINGS_JSON;
var MARKDOWN_EXTENSION;
var UNSAFE_NAME_CHARS_RE;
var LEADING_COMBINING_MARK_RE;
deferInit("chunk-ch5peek9.js:367", () => {
  dir = posix.dirname(joined_5);
  WORKING_FILES_ROOT = "/mnt/user-data/working";
  joined = posix.join(WORKING_FILES_ROOT, joined_5);
  MAX_WORKING_PATH_CHARS = 32;
  MAX_WORKING_FILE_BYTES = 524288;
  MAX_WORKING_FILE_TOTAL_BYTES = 2097152;
  MAX_WORKING_PATH_LENGTH = 200;
  MAX_WORKING_NAME_BYTES = 237;
  MAX_WORKING_PATH_DEPTH = 4;
  CLAUDE_MD = "CLAUDE.md";
  RULES = "rules";
  OUTPUT_STYLES = "output-styles";
  SETTINGS_JSON = "settings.json";
  MARKDOWN_EXTENSION = ".md";
  UNSAFE_NAME_CHARS_RE =
    /[\p{Cc}\p{Cf}\p{Co}\p{Cn}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u2800\u{1D159}\u2024-\u2026\u2044\u2215\u2216\u2236\u2571\u2572\u27CB\u27CD\u29F5\u29F8\u29F9\u02D0\u05C3\u0589\uA789\uFE13\uFE52\uFE55\uFE68\uFF0E\uFF0F\uFF1A\uFF3C\uFF61\u3002]|(?!\u0020)\p{Zs}/u;
  LEADING_COMBINING_MARK_RE = /^\p{M}/u;
});
//@ chunk-ch5peek9.js:840-1046 placement
function isValidWorkingFileName(name) {
  return (
    name !== "" &&
    name === name.trim() &&
    Buffer.byteLength(name, "utf8") <= MAX_WORKING_NAME_BYTES &&
    !name.startsWith(".") &&
    !hasWindowsUnsafeSegment(name) &&
    !name.includes("\\") &&
    !UNSAFE_NAME_CHARS_RE.test(name) &&
    !LEADING_COMBINING_MARK_RE.test(name) &&
    !name.endsWith("~") &&
    !name.endsWith(".swp") &&
    !name.endsWith(".tmp")
  );
}
//@ chunk-ch5peek9.js:1046-1100 placement
/**
 * 判断路径是否以 .md 结尾。
 */
function isMarkdownPath(path) {
  return path.length > MARKDOWN_EXTENSION.length && path.endsWith(MARKDOWN_EXTENSION);
}
//@ chunk-ch5peek9.js:1100-1130 placement
/**
 * 规范化路径（NFC、小写、再 NFC）。
 */
function normalizedPath(cwd) {
  return nfcLowerNfc(cwd);
}
//@ chunk-ch5peek9.js:1130-1161 placement
/**
 * 判断规范化后的路径是否为 markdown。
 */
function isNormalizedMarkdownPath(path) {
  return isMarkdownPath(normalizedPath(path));
}
//@ chunk-ch5peek9.js:1161-1488 placement
function classifyWorkingFile(path) {
  if (path.length > MAX_WORKING_PATH_LENGTH || !isWellFormedString(path) || path.normalize("NFC") !== path)
    return null;
  let parts = path.split("/");
  if (!parts.every(isValidWorkingFileName)) return null;
  let [inputPath, ...dest] = parts;
  if (dest.length === 0) return inputPath === CLAUDE_MD ? "claude_md" : null;
  let sliced = dest.slice(0, -1);
  let path_2 = dest.at(-1) ?? "";
  if (!isMarkdownPath(path_2) || sliced.some(isNormalizedMarkdownPath)) return null;
  if (dest.length > MAX_WORKING_PATH_DEPTH) return null;
  return inputPath === RULES ? "rule" : inputPath === OUTPUT_STYLES ? "output_style" : null;
}
//@ chunk-ch5peek9.js:1488-1525 placement
/**
 * 判断路径是否属于可同步的工作文件。
 */
function isWorkingFilePath(path) {
  return classifyWorkingFile(path) !== null;
}
//@ chunk-ch5peek9.js:1525-1598 placement
/**
 * 把路径解析成工作文件目的地（不可分类返回 null）。
 */
function workingFileDestination(path) {
  let dest = classifyWorkingFile(path);
  return dest === null
    ? null
    : {
        destination: path,
        kind: dest,
      };
}
//@ chunk-vb7ng9fr.js:1974-2145 placement
function getWorkingFileSkipReason(dirent, maxBytes = MAX_WORKING_FILE_BYTES_2) {
  if (dirent.isSymbolicLink()) return "symlink";
  if (!dirent.isFile()) return "not_regular_file";
  if (dirent.nlink > 1) return "hard_link";
  if (dirent.size > maxBytes) return "too_large";
  return null;
}
//@ chunk-vb7ng9fr.js:2145-2216 placement
/**
 * 判断相对路径是否越出根目录（空、..、绝对路径）。
 */
function isOutsideRoot(rel) {
  return rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel);
}
//@ chunk-vb7ng9fr.js:2216-2366 layout (2.1.88 match: readJSONLFile, 1)
async function readJSONLFile(fileHandle, size) {
  let buf = Buffer.allocUnsafe(size);
  let totalRead = 0;
  while (totalRead < size) {
    let { bytesRead } = await fileHandle.read(buf, totalRead, size - totalRead, totalRead);
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  return buf.subarray(0, totalRead);
}
//@ chunk-vb7ng9fr.js:2366-2762 placement
/**
 * 读取已打开的工作文件内容与元数据；读到的字节少于 stat 给出的大小时视为文件已变更并跳过。
 */
async function readWorkingFileContent(path, state, content) {
  let jsonlFile = await readJSONLFile(path, Number(state.size));
  if (BigInt(jsonlFile.length) < state.size) {
    logForDebugging(
      `working file ${content}: ${jsonlFile.length} of the ${state.size} bytes that its stat promised came, with no error; skipped as changed`,
    );
    return {
      kind: "skip",
      skipped: {
        path: content,
        reason: "changed",
      },
    };
  }
  return {
    kind: "read",
    content: jsonlFile,
    mode: Number(state.mode) & 511,
    dev: state.dev,
    ino: state.ino,
    mtimeMs: Number(state.mtimeNs) / 1e6,
    ctimeMs: Number(state.ctimeNs) / 1e6,
  };
}
//@ chunk-vb7ng9fr.js:2762-3558 placement
/**
 * 安全读取工作文件：拒绝符号链接、非常规文件、硬链接、过大、不可读、真实路径在根外以及打开前后变更的文件；返回内容或跳过原因。
 */
async function readWorkingFile(
  baseDir,
  rootDir,
  relPath,
  dirHandle = null,
  maxBytes = MAX_WORKING_FILE_BYTES_2,
) {
  try {
    if (dirHandle !== null) return await readWorkingFileFromDir(dirHandle, relPath, maxBytes);
    let fullPath = join(baseDir, relPath);
    let lstat = await lstat_2(fullPath, {
      bigint: true,
    });
    let skipReason = getWorkingFileSkipReason(lstat, maxBytes);
    if (skipReason !== null)
      return {
        kind: "skip",
        skipped: {
          path: relPath,
          reason: skipReason,
        },
      };
    if (hasBackslash(fullPath))
      return {
        kind: "skip",
        skipped: {
          path: relPath,
          reason: "unreadable",
        },
      };
    if (isOutsideRoot(relative(rootDir, await realpath(fullPath))))
      return {
        kind: "skip",
        skipped: {
          path: relPath,
          reason: "outside_root",
        },
      };
    let handle = await open(fullPath, readOnlyNoFollowFlags());
    try {
      let state = await handle.stat({
        bigint: true,
      });
      if (state.dev !== lstat.dev || state.ino !== lstat.ino)
        return {
          kind: "skip",
          skipped: {
            path: relPath,
            reason: "changed",
          },
        };
      if (state.size > maxBytes)
        return {
          kind: "skip",
          skipped: {
            path: relPath,
            reason: "too_large",
          },
        };
      return await readWorkingFileContent(handle, state, relPath);
    } finally {
      await handle.close();
    }
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    let dirHandle =
      errnoCode === "ELOOP" || errnoCode === "EMLINK" || errnoCode === "WORKING_PARENT_NOT_DIRECTORY"
        ? "symlink"
        : "unreadable";
    return {
      kind: "skip",
      skipped: {
        path: relPath,
        reason: dirHandle,
      },
      ...(dirHandle === "unreadable" &&
        errnoCode !== undefined && {
          errnoCode,
        }),
    };
  }
}
//@ chunk-vb7ng9fr.js:3558-3762 placement
async function readWorkingFileFromDir(dirHandle, content, maxBytes) {
  let handle = await dirHandle.open(content, readOnlyNoFollowFlags());
  try {
    let stats = await handle.stat({
      bigint: true,
    });
    let workingFileSkipReason = getWorkingFileSkipReason(stats, maxBytes);
    if (workingFileSkipReason !== null)
      return {
        kind: "skip",
        skipped: {
          path: content,
          reason: workingFileSkipReason,
        },
      };
    return await readWorkingFileContent(handle, stats, content);
  } finally {
    await handle.close();
  }
}
//@ chunk-vb7ng9fr.js:3762-3807 placement
/**
 * 匹配 @ 引用的正则（前置空白/方括号，后接非空白）。
 */
var AT_REFERENCE_RE = /(^|[\s\][])@(?=((?:[^\s\\]|\\ )+))/g;
//@ chunk-vb7ng9fr.js:3807-3960 placement
function escapeUnvettedIncludes(body, isAllowed = allowAllIncludes, collector) {
  let text = body.replace(
    /\r\n?/g,
    `
`,
  );
  let isAllowed_2 =
    collector === undefined
      ? isAllowed
      : (ref) => {
          let allowed = isAllowed(ref);
          if (!allowed) collector.push(ref);
          return allowed;
        };
  let escaped = rebuildWithEscapes(text, lexMarkdown(text), escapeAtSignsOutsideFences, isAllowed_2);
  return hasUnvettedInclude(escaped, isAllowed) ? escapeAtSigns(escaped) : escaped;
}
//@ chunk-vb7ng9fr.js:3960-3974 placement
/**
 * 恒假的 include 允许判断（默认不放行任何 include）。
 */
var allowAllIncludes = () => false;
//@ chunk-vb7ng9fr.js:3974-4257 placement
function escapeTokenIncludes(token, isAllowed) {
  if (token.type === "code" || token.type === "codespan" || token.type === "escape") return token.raw;
  if (token.type === "html") return escapeHtmlCommentIncludes(token.raw, isAllowed);
  let children = [...(token.tokens ?? []), ...(token.items ?? [])];
  if (children.length === 0)
    return token.type === "text" ? escapeUnvettedAtRefs(token.raw, isAllowed) : token.raw;
  let escaped = rebuildWithEscapes(token.raw, children, (token) => token, isAllowed);
  return token.type === "text" ? escapeUnvettedAtRefs(escaped, isAllowed) : escaped;
}
//@ chunk-vb7ng9fr.js:4257-4433 placement
function rebuildWithEscapes(text, tokens, escapePlain, isAllowed) {
  let out = "";
  let cursor = 0;
  for (let token of tokens) {
    let index = text.indexOf(token.raw, cursor);
    if (index === -1) return out + escapeAtSignsOutsideFences(text.slice(cursor));
    out += escapePlain(text.slice(cursor, index)) + escapeTokenIncludes(token, isAllowed);
    cursor = index + token.raw.length;
  }
  return out + escapePlain(text.slice(cursor));
}
//@ chunk-vb7ng9fr.js:4433-4501 placement
/**
 * 把未受审查的 @ 引用在文本中转义。
 */
function escapeUnvettedAtRefs(text, isAllowed) {
  return text.replace(AT_REFERENCE_RE, (whole, atSign, refBody) =>
    isAllowed(referenceSpelling(refBody)) ? whole : `${atSign}\\@`,
  );
}
//@ chunk-vb7ng9fr.js:4501-4555 placement
/**
 * 取 @ 引用名（首行、去掉转义空格）。
 */
function referenceSpelling(path) {
  return firstLineOf(path, "#").replaceAll("\\ ", " ");
}
//@ chunk-vb7ng9fr.js:4555-5116 placement
/**
 * 在 HTML 注释残余文本中找出未审查的 @ 引用，并在原文对应位置前加反斜杠转义。
 */
function escapeHtmlCommentIncludes(text, isAllowed) {
  let trimmed = text.trimStart();
  if (!(trimmed.startsWith("<!--") && trimmed.includes("-->"))) return text;
  let segments = [];
  let residue = "";
  let rawPos = 0;
  for (let comment of text.matchAll(/<!--[\s\S]*?-->/g)) {
    segments.push({
      rawStart: rawPos,
      residueStart: residue.length,
    });
    residue += text.slice(rawPos, comment.index);
    rawPos = comment.index + comment[0].length;
  }
  segments.push({
    rawStart: rawPos,
    residueStart: residue.length,
  });
  residue += text.slice(rawPos);
  return [...residue.matchAll(AT_REFERENCE_RE)]
    .filter((match) => !isAllowed(referenceSpelling(match[2] ?? "")))
    .map((match) => {
      let residueIndex = match.index + (match[1] ?? "").length;
      let { rawStart, residueStart } = segments.findLast(
        (segment) => segment.residueStart <= residueIndex,
      ) ?? {
        rawStart: 0,
        residueStart: 0,
      };
      return rawStart + (residueIndex - residueStart);
    })
    .reduceRight((current, insertAt) => `${current.slice(0, insertAt)}\\${current.slice(insertAt)}`, text);
}
//@ chunk-vb7ng9fr.js:5116-5372 layout
function escapeAtSignsOutsideFences(text) {
  let inFence = null;
  return text
    .split(
      `
`,
    )
    .map((line) => {
      let textLine = /^[\s>]*(`{3,}|~{3,})/.exec(line)?.[1] ?? null;
      if (inFence === null) {
        if (textLine === null) return escapeStandaloneAtSigns(line);
        inFence = textLine;
        return line;
      }
      if (
        textLine !== null &&
        textLine[0] === inFence[0] &&
        textLine.length >= inFence.length &&
        /^[\s>]*[`~]+\s*$/.test(line)
      )
        inFence = null;
      return line;
    }).join(`
`);
}
//@ chunk-vb7ng9fr.js:5372-5467 placement
function escapeStandaloneAtSigns(text) {
  return text.replace(/@/g, (char, offset) =>
    isBackslashEscaped(text, offset) || /[\p{L}\p{N}]/u.test(text[offset - 1] ?? "") ? char : "\\@",
  );
}
//@ chunk-vb7ng9fr.js:5467-5524 placement
function hasMarkdownLinks(body) {
  return Object.keys(lexMarkdown(body).links).length > 0;
}
export {
  SETTINGS_JSON,
  CLAUDE_MD,
  RULES,
  MAX_WORKING_PATH_CHARS,
  MAX_WORKING_PATH_LENGTH,
  workingFileDestination,
  classifyWorkingFile,
  OUTPUT_STYLES,
  isWorkingFilePath,
  MAX_WORKING_FILE_BYTES,
  joined,
  normalizedPath,
  MAX_WORKING_FILE_TOTAL_BYTES,
  referenceSpelling,
  allowAllIncludes,
  AT_REFERENCE_RE,
  hasMarkdownLinks,
  escapeUnvettedIncludes,
  readWorkingFile,
};
