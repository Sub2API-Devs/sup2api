/**
 * utils/plugins/validate/helpers.ts
 *
 * 2.1.316 新增：插件目录校验辅助
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5aas12zq.js (24)
 * attribution: placement 24
 */
import * as pathModule from "path";
import { readdir, lstat } from "fs/promises";
import {
  PLUGIN_VALIDATION_ISSUES,
  LISTING_WHITESPACE_CHARS,
  MAX_SCAN_ENTRIES,
  PLUGIN_MANIFEST_PATH,
  ICON_CANDIDATES,
  MAX_REPO_ROOT_PARENTS,
} from "./validatePluginDirectory.js";
import { jsonStringify } from "../../slowOperations.js";
import { stripCombiningRepeated } from "../../sanitization.js";
import { toWellFormedString } from "../../stringUtils.js";
import { stripAnsiPerLine } from "../../stripAnsi.js";
import { readRegularFileUpTo, isDirectoryOrFalse } from "../safeFileRead.js";
import { getErrnoCode } from "../../errors.js";
import { getFsImplementation } from "../../fsOperations.js";
import { env } from "../../env.js";
import { realpathOrManual, isPathInside, getTopLevelPaths } from "./directoryName.js";

//@ chunk-5aas12zq.js:15267-15466 placement
function makeFinding(code, file, field, message) {
  let issue = PLUGIN_VALIDATION_ISSUES[code];
  return {
    code,
    title: issue.title,
    severity: issue.severity,
    blocking: issue.severity === "error" && !issue.hold,
    hold: issue.hold,
    file: extractToolInputForTelemetry(file, 300),
    field: extractToolInputForTelemetry(field, 200),
    message: extractToolInputForTelemetry(message, 1000),
    fix: issue.fix,
    rawFile: file,
  };
}
//@ chunk-5aas12zq.js:15466-15507 placement
/**
 * appendAll：把数组内容追加到目标。
 */
function appendAll(target, items) {
  for (let item of items) target.push(item);
}
//@ chunk-5aas12zq.js:15507-15657 placement
function dedupeFindings(findings) {
  let seenKeys = new Set();
  let unique = [];
  for (let { rawFile, ...finding } of findings) {
    let key = jsonStringify([finding.code, rawFile ?? finding.file, finding.field, finding.message]);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      unique.push(finding);
    }
  }
  return unique;
}
//@ chunk-5aas12zq.js:15657-15693 placement
/**
 * compareSeverity：按阻断与严重度排序。
 */
function compareSeverity(left, right) {
  return severityRank(left) - severityRank(right);
}
//@ chunk-5aas12zq.js:15693-15762 placement
function severityRank(finding) {
  if (finding.blocking) return 0;
  return finding.severity === "info" ? 2 : 1;
}
//@ chunk-5aas12zq.js:15762-15795 placement
/**
 * quotedToolInput：引号包裹的遥测工具输入。
 */
function quotedToolInput(text, maxChars) {
  return quoteForDisplay(extractToolInputForTelemetry(text, maxChars));
}
//@ chunk-5aas12zq.js:15795-15943 placement
var ESCAPE_SEQUENCES = {
  '"': '\\"',
  "\\": "\\\\",
  "\x07": "\\a",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t",
  "\v": "\\v",
};
var PRINTABLE_CHAR_RE = /^[\p{L}\p{M}\p{N}\p{P}\p{S} ]$/u;
//@ chunk-5aas12zq.js:15943-16165 placement
function quoteForDisplay(text) {
  let quoted = '"';
  for (let char of text) {
    let codePoint = char.codePointAt(0) ?? 0;
    let str = codePoint.toString(16);
    quoted +=
      ESCAPE_SEQUENCES[char] ??
      (PRINTABLE_CHAR_RE.test(char)
        ? char
        : codePoint < 32 || codePoint === 127
          ? `\\x${str.padStart(2, "0")}`
          : codePoint > 65535
            ? `\\U${str.padStart(8, "0")}`
            : `\\u${str.padStart(4, "0")}`);
  }
  return `${quoted}"`;
}
//@ chunk-5aas12zq.js:16165-16454 placement = extractToolInputForTelemetry (0.833)
function extractToolInputForTelemetry(text, maxChars) {
  let truncated = stripCombiningRepeated(toWellFormedString(stripAnsiPerLine(toWellFormedString(text))));
  let out = "";
  let keptCount = 0;
  let lastWasSpace = false;
  for (let char of truncated) {
    if (keptCount >= maxChars) {
      out += "\u2026[truncated]";
      break;
    }
    if (
      `
\r	\u2028\u2029`.includes(char)
    ) {
      if (!lastWasSpace) {
        out += " ";
        keptCount++;
      }
      lastWasSpace = true;
      continue;
    }
    let codePoint = char.codePointAt(0) ?? 0;
    if (codePoint < 32 || codePoint === 127 || (codePoint >= 128 && codePoint <= 159)) continue;
    lastWasSpace = char === " ";
    out += char;
    keptCount++;
  }
  return out.slice(countLeadingChars(out), trimmedEndIndex(out));
}
//@ chunk-5aas12zq.js:16454-16532 placement
function trimmedEndIndex(text) {
  let end = text.length;
  while (end > 0 && LISTING_WHITESPACE_CHARS.includes(text[end - 1] ?? "")) end--;
  return end;
}
//@ chunk-5aas12zq.js:16532-16575 placement
var HANGUL_FILLER_RE = /[\u115F\u1160\u3164\uFFA0\u2800]/g;
//@ chunk-5aas12zq.js:16575-16626 placement
/**
 * cleanDisplayName：去掉组合标记与填充符并 trim。
 */
function cleanDisplayName(name) {
  return stripCombiningRepeated(name).replace(HANGUL_FILLER_RE, " ").trim();
}
//@ chunk-5aas12zq.js:16626-16690 placement
/**
 * stringField：取字符串字段并清洗。
 */
function stringField(obj, key) {
  let value = obj[key];
  return typeof value === "string" ? cleanDisplayName(value) : "";
}
//@ chunk-5aas12zq.js:16690-16769 placement
/**
 * trimmedStringField：取字符串字段两端裁剪。
 */
function trimmedStringField(obj, key) {
  let value = obj[key];
  return typeof value === "string" ? value.slice(countLeadingChars(value), trimmedEndIndex(value)) : "";
}
//@ chunk-5aas12zq.js:16769-17481 placement
/**
 * 规范化相对路径并逐段 readdir 确认每段存在且类型正确（中间为目录、最后为文件，链接被拒）； 返回 found、读到的字节（超过上限标 tooLarge）或 refused 的段号。
 */
async function readPluginFileSafe(rootDir, relPath, maxBytes) {
  let filtered = pathModule.posix
    .normalize(relPath.split(pathModule.sep).join("/"))
    .split("/")
    .filter((segment) => segment !== "" && segment !== ".");
  if (filtered.includes(".."))
    return {
      found: false,
    };
  if (filtered.length === 0)
    return {
      found: false,
      refused: {
        segment: 0,
        isLink: false,
      },
    };
  let currentDir = rootDir;
  for (let [index, segment] of filtered.entries()) {
    let dirents = await readdir(currentDir, {
      withFileTypes: true,
    }).catch((error) => (isNotFoundErrno_4(error) ? [] : undefined));
    if (dirents === undefined)
      return {
        found: false,
        refused: {
          segment: index,
          isLink: false,
        },
      };
    let found = dirents.find((dirent) => dirent.name === segment);
    let isLastSegment = index === filtered.length - 1;
    if (found === undefined)
      return {
        found: false,
      };
    if (!(isLastSegment ? found.isFile() : found.isDirectory()))
      return {
        found: false,
        refused: {
          segment: index,
          isLink: found.isSymbolicLink(),
        },
      };
    currentDir = pathModule.join(currentDir, segment);
  }
  let readResult = await readRegularFileUpTo(pathModule.join(rootDir, ...filtered), maxBytes).catch(() => {
    return;
  });
  return {
    found: true,
    bytes: readResult?.kind === "ok" ? readResult.bytes : undefined,
    ...(readResult?.kind === "too-large" && {
      tooLarge: true,
    }),
  };
}
//@ chunk-5aas12zq.js:17481-17542 placement = isRealPathWithinTeamDir (1)
function isNotFoundErrno_4(realCandidate) {
  let code = getErrnoCode(realCandidate);
  return code === "ENOENT" || code === "ENOTDIR";
}
//@ chunk-5aas12zq.js:17542-18245 placement
/**
 * 目录只有 skills/*\/SKILL.md 而无 plugin.json/marketplace.json。
 */
async function isSkillsOnlyFolder(dirPath) {
  let safeReaddir = (safeReaddir) =>
    readdir(safeReaddir, {
      withFileTypes: true,
    }).catch(() => {
      return;
    });
  if (!(await isDirectoryOrFalse(dirPath))) return false;
  let rootEntries = await safeReaddir(dirPath);
  if (rootEntries === undefined || rootEntries.some((dirent) => dirent.name === "plugin.json")) return false;
  let found = rootEntries.find((pluginDirEntry) => pluginDirEntry.name === ".claude-plugin");
  if (found !== undefined) {
    let pluginDirEntries = found.isDirectory()
      ? await safeReaddir(pathModule.join(dirPath, ".claude-plugin"))
      : undefined;
    if (
      pluginDirEntries === undefined ||
      pluginDirEntries.some((dirent) => dirent.name === "plugin.json" || dirent.name === "marketplace.json")
    )
      return false;
  }
  if (!rootEntries.some((dirent) => dirent.name === "skills" && dirent.isDirectory())) return false;
  let skillEntries = ((await safeReaddir(pathModule.join(dirPath, "skills"))) ?? []).toSorted(
    (left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0),
  );
  for (let skillEntry of skillEntries.slice(0, MAX_SCAN_ENTRIES)) {
    if (!skillEntry.isDirectory()) continue;
    if (
      (await safeReaddir(pathModule.join(dirPath, "skills", skillEntry.name)))?.some(
        (dirent) => dirent.name === "SKILL.md" && dirent.isFile(),
      )
    )
      return true;
  }
  return false;
}
//@ chunk-5aas12zq.js:18245-18297 placement
var KEBAB_CASE_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
var NON_ASCII_PRINTABLE_RE = /[^\x20-\x7E]/;
//@ chunk-5aas12zq.js:18297-18521 placement
function checkNonAsciiName(name, sourceKind) {
  return typeof name === "string" && NON_ASCII_PRINTABLE_RE.test(name)
    ? [
        makeFinding(
          "IDENTIFIER_NON_ASCII",
          sourceKind === "written" ? PLUGIN_MANIFEST_PATH : "",
          sourceKind === "written" ? "name" : "",
          `Plugin name ${quoteForDisplay(name)} contains non-ASCII characters; directory names must be printable ASCII.`,
        ),
      ]
    : [];
}
//@ chunk-5aas12zq.js:18521-19090 placement
/**
 * 无 plugin.json 时用目录名作插件名，检查格式与 kebab-case。
 */
function checkDerivedName(folderName) {
  if (folderName === "") return [];
  let findings = [];
  if (folderName.includes(" "))
    findings.push(
      makeFinding(
        "MANIFEST_NAME_FORMAT",
        "",
        "",
        `There is no plugin.json, so ${quoteForDisplay(folderName)} (the folder or repository name) stands in for the plugin name, and it is not a valid one: ${ICON_CANDIDATES}`,
      ),
    );
  else if (!KEBAB_CASE_RE.test(folderName))
    findings.push(
      makeFinding(
        "MANIFEST_NAME_NOT_KEBAB",
        "",
        "",
        `There is no plugin.json, so ${quoteForDisplay(folderName)} stands in for the plugin name, and it is not kebab-case. Claude Code accepts it, but the Claude.ai marketplace sync requires kebab-case (lowercase letters, digits, and hyphens only, e.g., "my-plugin").`,
      ),
    );
  appendAll(findings, checkNonAsciiName(folderName, "derived"));
  return findings;
}
//@ chunk-5aas12zq.js:19090-19347 placement
async function preferPwdSpelling(path, cwd = getFsImplementation().cwd(), pwdPath = env.PWD) {
  if (pwdPath === undefined || !pathModule.isAbsolute(pwdPath) || pwdPath === cwd) return path;
  let relativePath = pathModule.relative(cwd, path);
  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${pathModule.sep}`) ||
    pathModule.isAbsolute(relativePath)
  )
    return path;
  let [realPwd, realCwd] = await Promise.all([realpathOrManual(pwdPath), realpathOrManual(cwd)]);
  return realPwd !== undefined && realPwd === realCwd ? pathModule.join(pwdPath, relativePath) : path;
}
//@ chunk-5aas12zq.js:19347-19965 placement
/**
 * 找出插件所在 git 仓库：own/parent/link/unresolved/none。
 */
async function locateGitRepository(pluginDir) {
  let gitDirUpward = await findGitDirUpward(pluginDir);
  if (gitDirUpward === undefined || gitDirUpward.otherKind)
    return {
      kind: "none",
    };
  if (gitDirUpward.dir === pluginDir)
    return {
      kind: "own",
    };
  let [realPluginDir, realGitDir] = await Promise.all([
    realpathOrManual(pluginDir),
    realpathOrManual(gitDirUpward.dir),
  ]);
  if (realPluginDir === undefined || realGitDir === undefined)
    return {
      kind: "unresolved",
      dir: realPluginDir === undefined ? pluginDir : gitDirUpward.dir,
    };
  if (!isPathInside(realPluginDir, realGitDir))
    return {
      kind: "link",
      dir: await getTopLevelPaths(gitDirUpward.dir, realGitDir, pluginDir),
      repository: gitDirUpward.dir,
      realPlugin: realPluginDir,
    };
  for (let directoryPath = pathModule.dirname(gitDirUpward.dir); ;) {
    if (
      (await lstat(pathModule.join(directoryPath, ".git")).catch(() => {
        return;
      })) !== undefined
    ) {
      let realParentDir = await realpathOrManual(directoryPath);
      if (realParentDir === undefined)
        return {
          kind: "unresolved",
          dir: directoryPath,
        };
      if (!isPathInside(realGitDir, realParentDir))
        return {
          kind: "link",
          dir: await getTopLevelPaths(directoryPath, realParentDir, pluginDir),
          repository: directoryPath,
          realPlugin: realPluginDir,
        };
    }
    let dir = pathModule.dirname(directoryPath);
    if (dir === directoryPath)
      return {
        kind: "parent",
        dir: gitDirUpward.dir,
      };
    directoryPath = dir;
  }
}
//@ chunk-5aas12zq.js:19965-20183 placement
async function findGitDirUpward(startDir) {
  let currentDir = startDir;
  for (let idx = 0; idx <= MAX_REPO_ROOT_PARENTS; idx++) {
    let gitEntry = await lstat(pathModule.join(currentDir, ".git")).catch(() => {
      return;
    });
    if (gitEntry !== undefined)
      return {
        dir: currentDir,
        otherKind: !gitEntry.isDirectory() && !gitEntry.isFile(),
      };
    let dir = pathModule.dirname(currentDir);
    if (dir === currentDir) return;
    currentDir = dir;
  }
  return;
}
//@ chunk-5aas12zq.js:24938-25014 placement
function countLeadingChars(text) {
  let index = 0;
  while (index < text.length && LISTING_WHITESPACE_CHARS.includes(text[index] ?? "")) index++;
  return index;
}
export {
  readPluginFileSafe,
  preferPwdSpelling,
  locateGitRepository,
  makeFinding,
  appendAll,
  checkNonAsciiName,
  isSkillsOnlyFolder,
  quoteForDisplay,
  checkDerivedName,
  trimmedStringField,
  extractToolInputForTelemetry,
  dedupeFindings,
  compareSeverity,
  countLeadingChars,
  stringField,
  cleanDisplayName,
  quotedToolInput,
  isNotFoundErrno_4,
};
