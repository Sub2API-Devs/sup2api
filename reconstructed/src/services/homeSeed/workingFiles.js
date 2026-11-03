/**
 * services/homeSeed/workingFiles.ts
 *
 * 云会话工作文件（CLAUDE.md、rules、output-styles）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-axmbhcjg.js (16), chunk-wgxf9vhj.js (8)
 * attribution: placement 23, layout 1
 */
import { sep, isAbsolute, join, relative, posix } from "path";
import { lstat as lstat_2, realpath, open } from "fs/promises";
import { MAX_WORKING_FILE_BYTES as MAX_WORKING_FILE_BYTES_2 } from "../syncedFiles/syncedFileSyncer.js";
import { readJSONLFile } from "../../utils/json.js";
import { logForDebugging } from "../../utils/debug.js";
import { hasBackslash } from "../../utils/pathClassification.js";
import { readOnlyNoFollowFlags } from "../../utils/platformTargets.js";
import { getErrnoCode } from "../../utils/errors.js";
import { lexMarkdown } from "../../utils/claudemd.js";
import { hasUnvettedInclude, escapeAtSigns, isBackslashEscaped } from "../../utils/claudemdIncludes.js";
import { firstLineOf, isWellFormedString } from "../../utils/stringUtils.js";
import { joined_5 } from "../../utils/teleport/seedPaths.js";
import { hasWindowsUnsafeSegment } from "../../utils/windowsPathNames.js";
import { nfcLowerNfc } from "../../utils/teleport/remoteTaskLabels.js";

//@ chunk-axmbhcjg.js:1940-2111 placement
function getWorkingFileSkipReason(e, n = MAX_WORKING_FILE_BYTES_2) {
  if (e.isSymbolicLink()) return "symlink";
  if (!e.isFile()) return "not_regular_file";
  if (e.nlink > 1) return "hard_link";
  if (e.size > n) return "too_large";
  return null;
}
//@ chunk-axmbhcjg.js:2111-2182 placement
/**
 * 判断相对路径是否越出根目录（空、..、绝对路径）。
 */
function isOutsideRoot(e) {
  return e === "" || e === ".." || e.startsWith(`..${sep}`) || isAbsolute(e);
}
//@ chunk-axmbhcjg.js:2332-2728 placement
/**
 * 读取已打开的工作文件内容与元数据；读到的字节少于 stat 给出的大小时视为文件已变更并跳过。
 */
async function readWorkingFileContent(e, n, r) {
  let jsonlFile = await readJSONLFile(e, Number(n.size));
  if (BigInt(jsonlFile.length) < n.size) {
    logForDebugging(
      `working file ${r}: ${jsonlFile.length} of the ${n.size} bytes that its stat promised came, with no error; skipped as changed`,
    );
    return {
      kind: "skip",
      skipped: {
        path: r,
        reason: "changed",
      },
    };
  }
  return {
    kind: "read",
    content: jsonlFile,
    mode: Number(n.mode) & 511,
    dev: n.dev,
    ino: n.ino,
    mtimeMs: Number(n.mtimeNs) / 1e6,
    ctimeMs: Number(n.ctimeNs) / 1e6,
  };
}
//@ chunk-axmbhcjg.js:2728-3524 placement
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
      let stats = await handle.stat({
        bigint: true,
      });
      if (stats.dev !== lstat.dev || stats.ino !== lstat.ino)
        return {
          kind: "skip",
          skipped: {
            path: relPath,
            reason: "changed",
          },
        };
      if (stats.size > maxBytes)
        return {
          kind: "skip",
          skipped: {
            path: relPath,
            reason: "too_large",
          },
        };
      return await readWorkingFileContent(handle, stats, relPath);
    } finally {
      await handle.close();
    }
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    let d =
      errnoCode === "ELOOP" || errnoCode === "EMLINK" || errnoCode === "WORKING_PARENT_NOT_DIRECTORY"
        ? "symlink"
        : "unreadable";
    return {
      kind: "skip",
      skipped: {
        path: relPath,
        reason: d,
      },
      ...(d === "unreadable" &&
        errnoCode !== undefined && {
          errnoCode,
        }),
    };
  }
}
//@ chunk-axmbhcjg.js:3524-3728 placement
async function readWorkingFileFromDir(dirHandle, relPath, maxBytes) {
  let o = await dirHandle.open(relPath, readOnlyNoFollowFlags());
  try {
    let stats = await o.stat({
      bigint: true,
    });
    let workingFileSkipReason = getWorkingFileSkipReason(stats, maxBytes);
    if (workingFileSkipReason !== null)
      return {
        kind: "skip",
        skipped: {
          path: relPath,
          reason: workingFileSkipReason,
        },
      };
    return await readWorkingFileContent(o, stats, relPath);
  } finally {
    await o.close();
  }
}
//@ chunk-axmbhcjg.js:3728-3773 placement
/**
 * 匹配 @ 引用的正则（前置空白/方括号，后接非空白）。
 */
var AT_REFERENCE_RE = /(^|[\s\][])@(?=((?:[^\s\\]|\\ )+))/g;
//@ chunk-axmbhcjg.js:3773-3926 placement
function escapeUnvettedIncludes(body, isDestination = allowAllIncludes, r) {
  let replaced = body.replace(
    /\r\n?/g,
    `
`,
  );
  let i =
    r === undefined
      ? isDestination
      : (u) => {
          let d = isDestination(u);
          if (!d) r.push(u);
          return d;
        };
  let s = rebuildWithEscapes(replaced, lexMarkdown(replaced), escapeAtSignsOutsideFences, i);
  return hasUnvettedInclude(s, isDestination) ? escapeAtSigns(s) : s;
}
//@ chunk-axmbhcjg.js:3926-3940 placement
/**
 * 恒假的 include 允许判断（默认不放行任何 include）。
 */
var allowAllIncludes = () => false;
//@ chunk-axmbhcjg.js:3940-4223 placement
function escapeTokenIncludes(e, isAllowed) {
  if (e.type === "code" || e.type === "codespan" || e.type === "escape") return e.raw;
  if (e.type === "html") return escapeHtmlCommentIncludes(e.raw, isAllowed);
  let r = [...(e.tokens ?? []), ...(e.items ?? [])];
  if (r.length === 0) return e.type === "text" ? escapeUnvettedAtRefs(e.raw, isAllowed) : e.raw;
  let o = rebuildWithEscapes(e.raw, r, (i) => i, isAllowed);
  return e.type === "text" ? escapeUnvettedAtRefs(o, isAllowed) : o;
}
//@ chunk-axmbhcjg.js:4223-4399 placement
function rebuildWithEscapes(e, n, r, o) {
  let i = "";
  let s = 0;
  for (let u of n) {
    let index = e.indexOf(u.raw, s);
    if (index === -1) return i + escapeAtSignsOutsideFences(e.slice(s));
    i += r(e.slice(s, index)) + escapeTokenIncludes(u, o);
    s = index + u.raw.length;
  }
  return i + r(e.slice(s));
}
//@ chunk-axmbhcjg.js:4399-4467 placement
/**
 * 把未受审查的 @ 引用在文本中转义。
 */
function escapeUnvettedAtRefs(e, n) {
  return e.replace(AT_REFERENCE_RE, (r, o, i) => (n(referenceSpelling(i)) ? r : `${o}\\@`));
}
//@ chunk-axmbhcjg.js:4467-4521 placement
/**
 * 取 @ 引用名（首行、去掉转义空格）。
 */
function referenceSpelling(e) {
  return firstLineOf(e, "#").replaceAll("\\ ", " ");
}
//@ chunk-axmbhcjg.js:4521-5082 placement
/**
 * 在 HTML 注释残余文本中找出未审查的 @ 引用，并在原文对应位置前加反斜杠转义。
 */
function escapeHtmlCommentIncludes(text, isAllowed) {
  let r = text.trimStart();
  if (!(r.startsWith("<!--") && r.includes("-->"))) return text;
  let segments = [];
  let residue = "";
  let rawPos = 0;
  for (let d of text.matchAll(/<!--[\s\S]*?-->/g)) {
    segments.push({
      rawStart: rawPos,
      residueStart: residue.length,
    });
    residue += text.slice(rawPos, d.index);
    rawPos = d.index + d[0].length;
  }
  segments.push({
    rawStart: rawPos,
    residueStart: residue.length,
  });
  residue += text.slice(rawPos);
  return [...residue.matchAll(AT_REFERENCE_RE)]
    .filter((d) => !isAllowed(referenceSpelling(d[2] ?? "")))
    .map((d) => {
      let f = d.index + (d[1] ?? "").length;
      let { rawStart, residueStart } = segments.findLast((segment) => segment.residueStart <= f) ?? {
        rawStart: 0,
        residueStart: 0,
      };
      return rawStart + (f - residueStart);
    })
    .reduceRight((d, f) => `${d.slice(0, f)}\\${d.slice(f)}`, text);
}
//@ chunk-axmbhcjg.js:5082-5338 layout
function escapeAtSignsOutsideFences(e) {
  let n = null;
  return e
    .split(
      `
`,
    )
    .map((line) => {
      let o = /^[\s>]*(`{3,}|~{3,})/.exec(line)?.[1] ?? null;
      if (n === null) {
        if (o === null) return escapeStandaloneAtSigns(line);
        n = o;
        return line;
      }
      if (o !== null && o[0] === n[0] && o.length >= n.length && /^[\s>]*[`~]+\s*$/.test(line)) n = null;
      return line;
    }).join(`
`);
}
//@ chunk-axmbhcjg.js:5338-5433 placement
function escapeStandaloneAtSigns(line) {
  return line.replace(/@/g, (n, r) =>
    isBackslashEscaped(line, r) || /[\p{L}\p{N}]/u.test(line[r - 1] ?? "") ? n : "\\@",
  );
}
//@ chunk-axmbhcjg.js:5433-5490 placement
function hasMarkdownLinks(body) {
  return Object.keys(lexMarkdown(body).links).length > 0;
}
//@ chunk-wgxf9vhj.js:367-840 placement
/**
 * 匹配以组合符号开头的正则。
 */
var dir = posix.dirname(joined_5);
var WORKING_FILES_ROOT = "/mnt/user-data/working";
var joined = posix.join(WORKING_FILES_ROOT, joined_5);
var MAX_WORKING_PATH_CHARS = 32;
var MAX_WORKING_FILE_BYTES = 524288;
var MAX_WORKING_FILE_TOTAL_BYTES = 2097152;
var MAX_WORKING_PATH_LENGTH = 200;
var MAX_WORKING_NAME_BYTES = 237;
var MAX_WORKING_PATH_DEPTH = 4;
var CLAUDE_MD = "CLAUDE.md";
var RULES = "rules";
var OUTPUT_STYLES = "output-styles";
var SETTINGS_JSON = "settings.json";
var MARKDOWN_EXTENSION = ".md";
var UNSAFE_NAME_CHARS_RE =
  /[\p{Cc}\p{Cf}\p{Co}\p{Cn}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u2800\u{1D159}\u2024-\u2026\u2044\u2215\u2216\u2236\u2571\u2572\u27CB\u27CD\u29F5\u29F8\u29F9\u02D0\u05C3\u0589\uA789\uFE13\uFE52\uFE55\uFE68\uFF0E\uFF0F\uFF1A\uFF3C\uFF61\u3002]|(?!\u0020)\p{Zs}/u;
var LEADING_COMBINING_MARK_RE = /^\p{M}/u;
//@ chunk-wgxf9vhj.js:840-1046 placement
function isValidWorkingFileName(t) {
  return (
    t !== "" &&
    t === t.trim() &&
    Buffer.byteLength(t, "utf8") <= MAX_WORKING_NAME_BYTES &&
    !t.startsWith(".") &&
    !hasWindowsUnsafeSegment(t) &&
    !t.includes("\\") &&
    !UNSAFE_NAME_CHARS_RE.test(t) &&
    !LEADING_COMBINING_MARK_RE.test(t) &&
    !t.endsWith("~") &&
    !t.endsWith(".swp") &&
    !t.endsWith(".tmp")
  );
}
//@ chunk-wgxf9vhj.js:1046-1100 placement
/**
 * 判断路径是否以 .md 结尾。
 */
function isMarkdownPath(t) {
  return t.length > MARKDOWN_EXTENSION.length && t.endsWith(MARKDOWN_EXTENSION);
}
//@ chunk-wgxf9vhj.js:1100-1130 placement
/**
 * 规范化路径（NFC、小写、再 NFC）。
 */
function normalizedPath(cwd) {
  return nfcLowerNfc(cwd);
}
//@ chunk-wgxf9vhj.js:1130-1161 placement
/**
 * 判断规范化后的路径是否为 markdown。
 */
function isNormalizedMarkdownPath(t) {
  return isMarkdownPath(normalizedPath(t));
}
//@ chunk-wgxf9vhj.js:1161-1488 placement
function classifyWorkingFile(t) {
  if (t.length > MAX_WORKING_PATH_LENGTH || !isWellFormedString(t) || t.normalize("NFC") !== t) return null;
  let parts = t.split("/");
  if (!parts.every(isValidWorkingFileName)) return null;
  let [i, ...o] = parts;
  if (o.length === 0) return i === CLAUDE_MD ? "claude_md" : null;
  let sliced = o.slice(0, -1);
  let _ = o.at(-1) ?? "";
  if (!isMarkdownPath(_) || sliced.some(isNormalizedMarkdownPath)) return null;
  if (o.length > MAX_WORKING_PATH_DEPTH) return null;
  return i === RULES ? "rule" : i === OUTPUT_STYLES ? "output_style" : null;
}
//@ chunk-wgxf9vhj.js:1488-1525 placement
/**
 * 判断路径是否属于可同步的工作文件。
 */
function isWorkingFilePath(t) {
  return classifyWorkingFile(t) !== null;
}
//@ chunk-wgxf9vhj.js:1525-1598 placement
/**
 * 把路径解析成工作文件目的地（不可分类返回 null）。
 */
function workingFileDestination(t) {
  let n = classifyWorkingFile(t);
  return n === null
    ? null
    : {
        destination: t,
        kind: n,
      };
}
export {
  SETTINGS_JSON,
  CLAUDE_MD,
  RULES,
  referenceSpelling,
  allowAllIncludes,
  AT_REFERENCE_RE,
  OUTPUT_STYLES,
  classifyWorkingFile,
  workingFileDestination,
  normalizedPath,
  MAX_WORKING_FILE_BYTES,
  hasMarkdownLinks,
  escapeUnvettedIncludes,
  readWorkingFile,
  MAX_WORKING_PATH_CHARS,
  MAX_WORKING_FILE_TOTAL_BYTES,
  joined,
  isWorkingFilePath,
  MAX_WORKING_PATH_LENGTH,
};
