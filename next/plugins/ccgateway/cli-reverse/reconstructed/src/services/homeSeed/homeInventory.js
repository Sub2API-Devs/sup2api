/**
 * services/homeSeed/homeInventory.ts
 *
 * 2.1.316 新增：本地 home 目录配置清点
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vb7ng9fr.js (60)
 * attribution: placement 58, sole-consumer 1, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { win32, relative, sep, extname, resolve, dirname, join, posix } from "path";
import { realpath, readlink, lstat, stat, readdir } from "fs/promises";
import { isDiskless } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { applyRemoteEntriesToLocal } from "../settingsSync/index.js";
import { normalizePathForCompare } from "../../utils/file.js";
import { isInstructionsMemoryType_3, MAX_INCLUDE_DEPTH } from "../../utils/claudemd.js";
import {
  platformPath,
  isParentOrAbsolute,
  toPosixNfcPath,
  MD_EXTENSION,
  PATH_SEPARATOR_RE,
} from "../../utils/posixPaths.js";
import { hasBackslash, isUncOrDevicePath } from "../../utils/pathClassification.js";
import {
  safeResolvePath,
  getFsImplementation,
  hasUntouchableRecordSpelling,
} from "../../utils/fsOperations.js";
import {
  normalizeCaseForComparison_2,
  resolveSensitivePath,
  getSensitivePathReason,
} from "../../utils/permissions/filesystem.js";
import { foldName } from "../../utils/permissions/protectedDirNames.js";
import { firstLineOf, isWellFormedString, countCharInString } from "../../utils/stringUtils.js";
import { shouldIgnore } from "../syncedFiles/syncedFileSyncer.js";
import { DIR_SYNC_EXCLUDED_DIRS } from "../../utils/teleport/dirSync.js";
import {
  RULES,
  OUTPUT_STYLES,
  CLAUDE_MD,
  classifyWorkingFile,
  workingFileDestination,
  normalizedPath,
  MAX_WORKING_FILE_BYTES as MAX_WORKING_FILE_BYTES_2_2,
  hasMarkdownLinks,
  escapeUnvettedIncludes,
  allowAllIncludes,
} from "./workingFiles.js";
import { SYNCED_DIR } from "../../utils/plugins/syncedItems.js";
import { getErrnoCode } from "../../utils/errors.js";
import { isNonWslUncPath, isWslUncPath, isNetworkMountPath } from "../../utils/networkPaths.js";
import { isSettingsToCloudEnabled } from "../analytics/violinGates.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import {
  isClaudeMdLoadingDisabled,
  isCustomizationDisabled,
} from "../../utils/settings/customizationDisabled.js";
import { isAborted } from "../../utils/abortSignalUtils.js";
import { capInventoryEntries } from "./homePack.js";
import { countWhere } from "../../utils/collections.js";
import {
  readNativeWorkingFile,
  buildWithheldEntry,
  mapSkipReasonToLeftBehind,
} from "./hookAndSettingsInventory.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  collectAtReferenceSpellings,
  endsInsideOpenBlock,
  inlinedImportMarker,
  escapeAtSigns,
  extractIncludePathsFromText,
  hasUnvettedInclude,
} from "../../utils/claudemdIncludes.js";
import { expandPath } from "../../utils/path.js";
import { isSensitiveWithGitConfig } from "../../utils/permissions/sensitivePaths.js";
import { looksLikeCredentialIncludingNul } from "./portableSettings.js";
import { matchKey } from "../../components/GlobalSearchDialog.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { FRONTMATTER_REGEX } from "../../utils/frontmatterParser.js";

//@ chunk-vb7ng9fr.js:7949-7967 placement
/**
 * 是否继续解析 include 的深度上限标记（true）。
 */
var MAX_INCLUDE_READS = 4096;
var INCLUDE_EXTERNAL = true;
//@ chunk-vb7ng9fr.js:7967-8451 placement
/**
 * 从配置目录出发收集用户记忆文件及其 @include 链（按类型+路径去重，读取次数超上限返回 null）；无磁盘会话直接返回 null。
 */
async function collectMemoryIncludeTree(configDir, signal) {
  if (isDiskless()) {
    logForDebugging("home inventory: memory files not read in a diskless session; nothing is sent");
    return null;
  }
  let budget = {
    reads: 0,
  };
  let pending = await applyRemoteEntriesToLocal(configDir, budget, signal);
  if (pending === null) return null;
  let seen = new Map();
  for (let entry = pending.pop(); entry !== undefined; entry = pending.pop()) {
    let key = `${entry.type}\x00${normalizePathForCompare(entry.path)}`;
    if (seen.has(key)) continue;
    if (signal?.aborted) return null;
    seen.set(key, entry);
    let included = await isInstructionsMemoryType_3(
      entry.path,
      entry.type,
      new Set(),
      INCLUDE_EXTERNAL,
      MAX_INCLUDE_DEPTH - 2,
    );
    budget.reads += included.length;
    if (budget.reads > MAX_INCLUDE_READS) return null;
    pending.push(...included.filter((includedEntry) => includedEntry.path !== entry.path));
  }
  return [...seen.values()];
}
//@ chunk-vb7ng9fr.js:9185-9358 sole-consumer
function relativeUnderConfigHome(configHome, expanded, pathModule = platformPath) {
  let relativePath = pathModule.relative(configHome, expanded);
  if (pathModule.isAbsolute(relativePath)) return null;
  let resolved = pathModule.resolve(configHome, relativePath);
  let resolved_2 = pathModule.resolve(expanded);
  return (
    pathModule === win32 ? resolved.toLowerCase() === resolved_2.toLowerCase() : resolved === resolved_2
  )
    ? relativePath
    : null;
}
//@ chunk-vb7ng9fr.js:9358-9462 placement
async function realpathStrict(path) {
  if (hasBackslash(path)) throw Error("realpath would misread a backslash in the path");
  return realpath(path);
}
//@ chunk-vb7ng9fr.js:9462-9546 placement
/**
 * 解析路径的规范形式（符号链接或安全解析）。
 */
function resolvePathInfo(path) {
  return hasBackslash(path)
    ? {
        resolvedPath: path,
        isSymlink: false,
        isCanonical: false,
      }
    : safeResolvePath(getFsImplementation(), path);
}
//@ chunk-vb7ng9fr.js:9546-9558 placement
/**
 * 别名目录的数量上限（4096）。
 */
var MAX_ALIAS_DIRECTORIES = 4096;
//@ chunk-vb7ng9fr.js:9558-9800 placement
async function locateInConfigHome(walkState, nativePath, lexicalRel, rawLexicalRel) {
  let realPath;
  try {
    realPath = await realpathStrict(nativePath);
  } catch {
    return "unresolvable";
  }
  let nativeRel = relative(walkState.realConfigHome, realPath);
  if (nativeRel === "" || isParentOrAbsolute(nativeRel)) return "outside";
  let posixNfcPath = toPosixNfcPath(nativeRel, sep);
  return {
    realPath,
    nativeRel,
    rel: posixNfcPath,
    lexicalRel: lexicalRel ?? posixNfcPath,
    rawRels: normalizeCaseForComparison_2([
      toPosixSeparators(nativeRel),
      ...(rawLexicalRel === null ? [] : [rawLexicalRel]),
    ]),
  };
}
//@ chunk-vb7ng9fr.js:9800-9902 placement
async function isOutsideOrUnresolvable(filePath, target) {
  try {
    let resolved = await realpathStrict(target);
    return (
      isOutsideConfigHome(filePath, resolved) ||
      !isParentOrAbsolute(relative(filePath.realConfigHome, resolved))
    );
  } catch {
    return true;
  }
}
//@ chunk-vb7ng9fr.js:9902-9951 placement
/**
 * 判断相对路径是否落在配置主目录之外。
 */
function isOutsideConfigHome(entry, configHome) {
  return !isParentOrAbsolute(relative(configHome, entry.realConfigHome));
}
//@ chunk-vb7ng9fr.js:9951-10004 placement
/**
 * 把路径分隔符统一成 /。
 */
function toPosixSeparators(path) {
  return sep === "/" ? path : path.split(sep).join("/");
}
//@ chunk-vb7ng9fr.js:10004-10148 placement
function relativeToConfigHome(walkState, nativePath) {
  let path = [walkState.configHome, walkState.realConfigHome]
    .map((base) => relative(base, nativePath))
    .find((candidate) => candidate !== "" && !isParentOrAbsolute(candidate));
  return path === undefined
    ? null
    : {
        rel: toPosixNfcPath(path, sep),
        raw: toPosixSeparators(path),
      };
}
//@ chunk-vb7ng9fr.js:10148-10321 placement
function isSyncableMarkdownPath(path) {
  let firstSegment = foldName(firstLineOf(path, "/"));
  return (
    isWellFormedString(path) &&
    path.includes("/") &&
    extname(path).toLowerCase() === MD_EXTENSION &&
    !shouldIgnore(path) &&
    !TRAILING_TILDE_NUMBER_RE.test(path) &&
    !DIR_SYNC_EXCLUDED_DIRS.has(firstSegment) &&
    !firstSegment.startsWith("agent-memory") &&
    !getThinkbackSkillDir(path) &&
    !isRulesOrOutputStylePath(path)
  );
}
//@ chunk-vb7ng9fr.js:10321-10388 placement
/**
 * 判断相对路径首段是否为 rules 或 output-styles。
 */
function isRulesOrOutputStylePath(path) {
  let firstSegment = foldName(firstLineOf(path, "/"));
  return firstSegment === foldName(RULES) || firstSegment === foldName(OUTPUT_STYLES);
}
//@ chunk-vb7ng9fr.js:10388-10469 layout (2.1.88 match: getThinkbackSkillDir, 1)
function getThinkbackSkillDir(pathParts) {
  let [firstSegment, secondSegment] = pathParts.split("/");
  return foldName(firstSegment ?? "") === "skills" && foldName(secondSegment ?? "") === SYNCED_DIR;
}
//@ chunk-vb7ng9fr.js:10469-10488 placement
/**
 * 跟随符号链接的最大跳数（32）。
 */
var TRAILING_TILDE_NUMBER_RE = /~\d/;
var MAX_SYMLINK_HOPS = 32;
//@ chunk-vb7ng9fr.js:10488-11038 placement
/**
 * 沿符号链接链逐跳检查（有跳数上限）：遇到循环返回 false；链接文本非 UTF-8、先进入目录再向上越级、或指向不可触碰的拼写时视为有风险。
 */
async function isRiskyLinkChain(start) {
  let current = start;
  let visited = new Set();
  for (let hop = 0; hop < MAX_SYMLINK_HOPS; hop += 1) {
    if (visited.has(current)) return false;
    visited.add(current);
    let linkBody;
    try {
      linkBody = await readlink(current);
    } catch (error) {
      return isIgnorableLookupError(error);
    }
    if (linkBody.includes("\uFFFD")) throw Error("link body is not valid UTF-8");
    let target;
    try {
      target = resolve(await realpathStrict(dirname(current)), linkBody);
    } catch (error) {
      if (getErrnoCode(error) === "ENAMETOOLONG") throw error;
      return isIgnorableLookupError(error);
    }
    if (linkClimbsAfterEntering(linkBody)) throw Error("link body climbs out of a directory it entered");
    if (isNonWslUncPath(linkBody) || hasUntouchableRecordSpelling(target)) return true;
    try {
      if (!(await lstat(target)).isSymbolicLink()) return false;
    } catch (error) {
      if (
        !isMissingPathError(error) ||
        (getErrnoCode(error) === "ENAMETOOLONG" && !hasOverlongSegment(linkBody))
      )
        throw error;
      return false;
    }
    current = target;
  }
  throw Error("link chain too long to vet");
}
//@ chunk-vb7ng9fr.js:11038-11095 placement
/**
 * 判断是否为可忽略的查找错误（EINVAL 也算），否则抛出。
 */
function isIgnorableLookupError(error) {
  if (isMissingPathError(error) || getErrnoCode(error) === "EINVAL") return true;
  throw error;
}
//@ chunk-vb7ng9fr.js:11095-11188 placement
/**
 * 判断错误码是否表示路径不存在（ENOENT/ENOTDIR/ELOOP/ENAMETOOLONG）。
 */
function isMissingPathError(error) {
  let errnoCode = getErrnoCode(error);
  return (
    errnoCode === "ENOENT" || errnoCode === "ENOTDIR" || errnoCode === "ELOOP" || errnoCode === "ENAMETOOLONG"
  );
}
//@ chunk-vb7ng9fr.js:11188-11256 placement
/**
 * 判断符号链接文本里是否有超过 255 字符的段。
 */
function hasOverlongSegment(linkBody) {
  return linkBody.split(/[\\/]/).some((segment) => [...segment].length > 255);
}
//@ chunk-vb7ng9fr.js:11256-11325 placement
/**
 * 路径缺失或不可读（stat 失败且错误可忽略）。
 */
async function missingOrUnreadable(path) {
  try {
    await stat(path);
    return false;
  } catch (error) {
    return isMissingPathError(error);
  }
}
//@ chunk-vb7ng9fr.js:11325-11407 placement
/**
 * 判断路径是否不是目录（缺失时也返回 true）。
 */
async function isNonDirectoryOrMissing(dir) {
  try {
    return !(await stat(dir)).isDirectory();
  } catch (error) {
    return isMissingPathError(error);
  }
}
//@ chunk-vb7ng9fr.js:11407-11521 placement
function linkClimbsAfterEntering(linkBody) {
  let entered = false;
  for (let segment of linkBody.split(PATH_SEPARATOR_RE))
    if (segment === "..") {
      if (entered) return true;
    } else if (segment !== "" && segment !== ".") entered = true;
  return false;
}
//@ chunk-vb7ng9fr.js:11521-11553 placement
/**
 * 清点被中止时的统一返回值。
 */
var ABORTED_INVENTORY_RESULT = {
  ok: false,
  reason: "aborted",
};
//@ chunk-vb7ng9fr.js:11553-13637 placement
/**
 * 清点本机 ~/.claude 中要发往云会话的内容（CLAUDE.md、rules、output-styles 及其 @include）：检查开关与用户设置可发送性，处理顶层符号链接别名、敏感/拒读路径，按上限保留条目，返回 {entries, summary, leftBehind} 或失败原因。
 */
async function buildHomeInventory({
  configHome,
  isUserSettingsFileSendable,
  readRules,
  createFilter,
  signal,
  aliasDirectories = MAX_ALIAS_DIRECTORIES,
  settingsToCloud = isSettingsToCloudEnabled,
}) {
  if (isDiskless())
    return {
      ok: false,
      reason: "diskless",
    };
  if (!(await settingsToCloud().catch(() => false)))
    return {
      ok: false,
      reason: "flag_off",
    };
  try {
    if (!isUserSettingsFileSendable || !readRules.complete)
      return emptyInventory({
        rulesUnreadable: true,
      });
    if (!isSettingSourceEnabled("userSettings"))
      return emptyInventory({
        rulesUnreadable: false,
      });
    let realConfigHome;
    try {
      realConfigHome = await realpathStrict(configHome);
    } catch (error) {
      if (isMissingPathError(error) && (await missingOrUnreadable(configHome)))
        return emptyInventory({
          rulesUnreadable: false,
        });
      return {
        ok: false,
        reason: "alias_unreadable",
      };
    }
    let walkState = {
      configHome,
      realConfigHome,
      aliasBudget: {
        left: aliasDirectories,
      },
      giveUp: null,
      topLevelLinks: [],
    };
    walkState.topLevelLinks = await listTopLevelLinks(walkState);
    let pathFilter = createFilter(configHome, {
      realRoot: realConfigHome,
      readRules,
    });
    let heldCandidates = {
      held: new Map(),
    };
    let attributed = new Set();
    let seenReal = new Set();
    let refusedByPath = new Map();
    let sensitiveByPath = new Map();
    let memoryFiles = isClaudeMdLoadingDisabled()
      ? {
          files: [],
          leftBehind: [],
        }
      : await listMemoryFiles(walkState);
    if (walkState.giveUp === null) {
      let memoryIncludeTree = await collectMemoryIncludeTree(configHome, signal);
      if (isAborted(signal)) return ABORTED_INVENTORY_RESULT;
      if (memoryIncludeTree === null)
        return {
          ok: false,
          reason: "too_many_links",
        };
      for (let includeTree of memoryIncludeTree) {
        if (isAborted(signal)) return ABORTED_INVENTORY_RESULT;
        await attributeAtReferences(walkState, pathFilter, includeTree, sensitiveByPath);
      }
    }
    let memoryLeftBehind = await collectMemoryCandidates(
      walkState,
      pathFilter,
      memoryFiles.files,
      heldCandidates,
      attributed,
      seenReal,
      refusedByPath,
      sensitiveByPath,
      signal,
    );
    if (memoryLeftBehind === null) return ABORTED_INVENTORY_RESULT;
    let styleFiles = isCustomizationDisabled("outputStyles")
      ? {
          files: [],
          leftBehind: [],
        }
      : await listDirFiles(walkState, OUTPUT_STYLES);
    let styleLeftBehind = await collectOutputStyleCandidates(
      walkState,
      pathFilter,
      styleFiles.files,
      heldCandidates,
      attributed,
      seenReal,
      sensitiveByPath,
    );
    if (walkState.giveUp !== null)
      return {
        ok: false,
        reason: walkState.giveUp,
      };
    let held = [...heldCandidates.held.values()];
    let failedReal = new Set();
    let resultByCandidate = new Map();
    for (let candidate of [
      ...held.filter((candidate) => candidate.kind === "output_style"),
      ...held.filter((candidate) => candidate.kind !== "output_style"),
    ]) {
      if (isAborted(signal)) return ABORTED_INVENTORY_RESULT;
      let inventoryEntry = await buildInventoryEntry(
        walkState,
        pathFilter,
        candidate,
        sensitiveByPath,
        failedReal,
        seenReal,
      );
      if (inventoryEntry.entry === null) failedReal.add(candidate.location.realPath);
      resultByCandidate.set(candidate, inventoryEntry);
    }
    let flattened = held.flatMap((candidate) => resultByCandidate.get(candidate) ?? []);
    let { kept, droppedOverCap } = capInventoryEntries(
      flattened
        .flatMap(({ entry, foldedIncludes }) =>
          entry === null
            ? []
            : [
                {
                  content: entry.content,
                  entry,
                  foldedIncludes,
                },
              ],
        )
        .toSorted((left, right) => compareInventoryEntries(left.entry, right.entry)),
    );
    let mapped = [...refusedByPath]
      .filter(([path]) => !attributed.has(path) && !seenReal.has(path))
      .map(([path, leftBehindEntry]) => sensitiveByPath.get(path) ?? leftBehindEntry);
    let leftBehind = [
      ...memoryFiles.leftBehind,
      ...memoryLeftBehind,
      ...mapped,
      ...styleFiles.leftBehind,
      ...styleLeftBehind,
      ...flattened.flatMap((result) => result.leftBehind),
      ...droppedOverCap.flatMap(({ entry, foldedIncludes }) => [
        {
          path: entry.path,
          reason: "over_cap",
        },
        ...foldedIncludes.map((path) => ({
          path,
          reason: "include_not_sent",
        })),
      ]),
    ];
    let leftBehind_2 = kept.map(({ entry }) => entry);
    return {
      ok: true,
      inventory: {
        entries: leftBehind_2,
        summary: summarizeInventory(leftBehind_2, leftBehind),
        leftBehind,
      },
    };
  } catch (error) {
    if (isAborted(signal)) return ABORTED_INVENTORY_RESULT;
    logForDebugging(
      `home inventory: gave the run up \u2014 ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      ok: false,
      reason: "alias_unreadable",
    };
  }
}
//@ chunk-vb7ng9fr.js:13637-13762 placement
function emptyInventory({ rulesUnreadable }) {
  return {
    ok: true,
    inventory: {
      entries: [],
      summary: {
        ...summarizeInventory([], []),
        rulesUnreadable,
      },
      leftBehind: [],
    },
  };
}
//@ chunk-vb7ng9fr.js:13762-14180 placement
/**
 * 汇总清点结果：各类未发送原因的计数（敏感、拒读、include 未发送、符号链接、非目的地、不可读、超限、无法去引用）以及内联与去引用的 import 数。
 */
function summarizeInventory(leftBehind, leftBehind_2) {
  return {
    withheldSensitive: countByReason(leftBehind_2, "sensitive"),
    withheldReadDenied: countByReason(leftBehind_2, "read_denied"),
    rulesUnreadable: false,
    includesNotSent: countByReason(leftBehind_2, "include_not_sent"),
    symlinksNotSent: countByReason(leftBehind_2, "symlink_not_sent"),
    notDestinations: countByReason(leftBehind_2, "not_destination"),
    unreadable: countByReason(leftBehind_2, "unreadable"),
    overCap: countByReason(leftBehind_2, "over_cap"),
    undefusable: countByReason(leftBehind_2, "undefusable"),
    inlinedImports: leftBehind.reduce((acc, reason) => acc + reason.folded.length, 0),
    defusedImports: leftBehind.reduce((acc, reason) => acc + reason.defused, 0),
  };
}
//@ chunk-vb7ng9fr.js:14180-14226 placement
/**
 * 按未发送原因统计条目数。
 */
function countByReason(items, target) {
  return countWhere(items, (item) => item.reason === target);
}
//@ chunk-vb7ng9fr.js:14226-14269 placement
/**
 * 三类条目的排序优先级（claude_md、rule、output_style）。
 */
var KIND_SORT_ORDER = {
  claude_md: 0,
  rule: 1,
  output_style: 2,
};
//@ chunk-vb7ng9fr.js:14269-14388 placement
function compareInventoryEntries(entry, entry_2) {
  return (
    KIND_SORT_ORDER[entry.kind] - KIND_SORT_ORDER[entry_2.kind] ||
    entry.content.length - entry_2.content.length ||
    (entry.path < entry_2.path ? -1 : entry.path > entry_2.path ? 1 : 0)
  );
}
//@ chunk-vb7ng9fr.js:14388-14854 placement
/**
 * 列出 CLAUDE.md 与 rules 目录下的记忆文件；CLAUDE.md 是指向非文件的符号链接时记为 symlink_not_sent，指向目录且在配置目录内时放弃。
 */
async function listMemoryFiles(walkState) {
  let claudeMdPath = join(walkState.configHome, CLAUDE_MD);
  let stats = await lstatOrGiveUp(walkState, claudeMdPath);
  let ruleFiles = await listDirFiles(walkState, RULES);
  if (stats === null) return ruleFiles;
  let targetStats = stats.isSymlink ? await statFollowingSafeLinks(walkState, claudeMdPath) : undefined;
  if (targetStats?.isDirectory() === true && (await isOutsideOrUnresolvable(walkState, claudeMdPath)))
    walkState.giveUp ??= "alias_unreadable";
  if (targetStats === null || (targetStats !== undefined && !targetStats.isFile()))
    return {
      files: ruleFiles.files,
      leftBehind: [
        {
          path: CLAUDE_MD,
          reason: "symlink_not_sent",
        },
        ...ruleFiles.leftBehind,
      ],
    };
  return {
    files: [
      {
        path: claudeMdPath,
        lexicalRel: CLAUDE_MD,
        rawLexicalRel: CLAUDE_MD,
        viaSymlink: stats.isSymlink,
        aliasOnly: false,
      },
      ...ruleFiles.files,
    ],
    leftBehind: ruleFiles.leftBehind,
  };
}
//@ chunk-vb7ng9fr.js:14854-15219 placement
/**
 * 列出配置目录下某子目录（rules、output-styles）的文件；子目录是符号链接且不指向目录时只按别名处理。
 */
async function listDirFiles(walkState, relPath) {
  let dirPath = join(walkState.configHome, relPath);
  let dirPath_2 = await lstatOrGiveUp(walkState, dirPath);
  if (dirPath_2 === null)
    return {
      files: [],
      leftBehind: [],
    };
  if (dirPath_2.isSymlink) {
    let dirStat = await statFollowingSafeLinks(walkState, dirPath);
    if (dirStat === null || !dirStat.isDirectory())
      return {
        files:
          dirStat !== null && dirStat.isFile()
            ? [
                {
                  path: dirPath,
                  lexicalRel: relPath,
                  rawLexicalRel: relPath,
                  viaSymlink: true,
                  aliasOnly: true,
                },
              ]
            : [],
        leftBehind: [
          {
            path: relPath,
            reason: "symlink_not_sent",
          },
        ],
      };
  }
  return walkMarkdownDir(walkState, dirPath, [relPath], dirPath_2.isSymlink, new Set());
}
//@ chunk-vb7ng9fr.js:15219-15721 placement
/**
 * 列出配置目录顶层指向目录内部的符号链接（名字与目标相对路径）；读不了或指向别的主机时放弃。
 */
async function listTopLevelLinks(ctx) {
  let entries;
  try {
    entries = await readdir(ctx.configHome, {
      withFileTypes: true,
    });
  } catch (entry) {
    if (!isMissingPathError(entry)) ctx.giveUp ??= "alias_unreadable";
    return [];
  }
  let aliases = [];
  for (let entry of entries) {
    let entryPath = join(ctx.configHome, entry.name);
    let stats = await resolveDirentType(ctx, entryPath, entry);
    if (stats === null || !stats.isSymbolicLink()) continue;
    if ((await statFollowingSafeLinks(ctx, entryPath)) === null) continue;
    let target;
    try {
      target = await realpathStrict(entryPath);
    } catch {
      ctx.giveUp ??= "alias_unreadable";
      continue;
    }
    if (isOutsideConfigHome(ctx, target)) {
      ctx.giveUp ??= "alias_unreadable";
      continue;
    }
    let targetRel = relative(ctx.realConfigHome, target);
    if (!isParentOrAbsolute(targetRel))
      aliases.push({
        name: entry.name.normalize("NFC"),
        targetRel: toPosixNfcPath(targetRel, sep),
      });
  }
  return aliases;
}
//@ chunk-vb7ng9fr.js:15721-15861 placement
function getAliasSpellings(walkState, channel) {
  return walkState.topLevelLinks.flatMap(({ name: link, targetRel }) =>
    channel === targetRel
      ? [link]
      : channel.startsWith(`${targetRel}/`)
        ? [`${link}/${channel.slice(targetRel.length + 1)}`]
        : [],
  );
}
//@ chunk-vb7ng9fr.js:15861-15998 placement
async function lstatOrGiveUp(walkState, path) {
  try {
    return {
      isSymlink: (await lstat(path)).isSymbolicLink(),
    };
  } catch (error) {
    if (!isMissingPathError(error)) walkState.giveUp ??= "alias_unreadable";
    return null;
  }
}
//@ chunk-vb7ng9fr.js:15998-17146 placement
/**
 * 递归遍历目录收集 .md 文件（经符号链接进入的子树也记录），处理循环、越界与无法读取的情况，返回 {files, leftBehind}。
 */
async function walkMarkdownDir(walkState, dir, segments, viaSymlink, visitedReal) {
  let path = segments.join("/").normalize("NFC");
  let symlinkLeftBehind = {
    files: [],
    leftBehind: [
      {
        path,
        reason: "symlink_not_sent",
      },
    ],
  };
  let dirents;
  try {
    let realDir = await realpathStrict(dir);
    if (visitedReal.has(realDir))
      return {
        files: await walkAliasOnlyDir(walkState, dir, segments, new Set([realDir])),
        leftBehind: [],
      };
    let nativeRel = relative(walkState.realConfigHome, realDir);
    if (isOutsideConfigHome(walkState, realDir)) {
      walkState.giveUp ??= "alias_unreadable";
      return symlinkLeftBehind;
    }
    if (isParentOrAbsolute(nativeRel)) return symlinkLeftBehind;
    let probePath = `${toPosixNfcPath(nativeRel, sep)}/x.md`;
    if (viaSymlink && classifyWorkingFile(probePath) === null)
      return {
        files: isSyncableMarkdownPath(probePath)
          ? await walkAliasOnlyDir(walkState, dir, segments, new Set([realDir]))
          : [],
        leftBehind: symlinkLeftBehind.leftBehind,
      };
    visitedReal.add(realDir);
    dirents = await readdir(dir, {
      withFileTypes: true,
    });
  } catch (error) {
    if (viaSymlink || !isMissingPathError(error) || !(await isNonDirectoryOrMissing(dir)))
      walkState.giveUp ??= "alias_unreadable";
    return {
      files: [],
      leftBehind: [],
    };
  }
  let files = [];
  let leftBehind = [];
  for (let dirent of dirents.toSorted(compareByName)) {
    let childPath = join(dir, dirent.name);
    let joined = [...segments, dirent.name].join("/");
    let normalized = joined.normalize("NFC");
    let direntType = await resolveDirentType(walkState, childPath, dirent);
    if (direntType === null) continue;
    let isLink = direntType.isSymbolicLink();
    let isMarkdown = dirent.name.endsWith(MD_EXTENSION);
    let targetStats = isLink ? await statFollowingSafeLinks(walkState, childPath) : direntType;
    if (targetStats === null) {
      if (extname(dirent.name).toLowerCase() === MD_EXTENSION)
        leftBehind.push({
          path: normalized,
          reason: "symlink_not_sent",
        });
    } else if (targetStats.isDirectory()) {
      let childResult = await walkMarkdownDir(
        walkState,
        childPath,
        [...segments, dirent.name],
        viaSymlink || isLink,
        visitedReal,
      );
      files.push(...childResult.files);
      leftBehind.push(...childResult.leftBehind);
    } else if (
      targetStats.isFile() &&
      (isMarkdown || isLink || (viaSymlink && extname(dirent.name).toLowerCase() === MD_EXTENSION))
    )
      files.push({
        path: childPath,
        lexicalRel: normalized,
        rawLexicalRel: joined,
        viaSymlink: viaSymlink || isLink,
        aliasOnly: !isMarkdown,
      });
  }
  return {
    files,
    leftBehind,
  };
}
//@ chunk-vb7ng9fr.js:17146-17714 placement
/**
 * 遍历只作为别名出现的目录，收集其中的 .md 与符号链接文件（标记 aliasOnly），子目录按别名预算继续。
 */
async function walkAliasOnlyDir(walkState, dir, segments, visited) {
  let dirents;
  try {
    dirents = await readdir(dir, {
      withFileTypes: true,
    });
  } catch {
    walkState.giveUp ??= "alias_unreadable";
    return [];
  }
  let files = [];
  for (let dirent of dirents.toSorted(compareByName)) {
    let childPath = join(dir, dirent.name);
    let joined = [...segments, dirent.name].join("/");
    let direntType = await resolveDirentType(walkState, childPath, dirent);
    if (direntType === null) continue;
    let isLink = direntType.isSymbolicLink();
    let targetStats = isLink ? await statFollowingSafeLinks(walkState, childPath) : direntType;
    if (targetStats === null) continue;
    if (targetStats.isDirectory()) {
      let claimed = await claimAliasDir(walkState, childPath, visited);
      if (claimed !== null)
        files.push(
          ...(await walkAliasOnlyDir(
            walkState,
            childPath,
            [...segments, dirent.name],
            new Set([...visited, claimed]),
          )),
        );
    } else if (targetStats.isFile() && (isLink || extname(dirent.name).toLowerCase() === MD_EXTENSION))
      files.push({
        path: childPath,
        lexicalRel: joined.normalize("NFC"),
        rawLexicalRel: joined,
        viaSymlink: isLink,
        aliasOnly: true,
      });
  }
  return files;
}
//@ chunk-vb7ng9fr.js:17714-18078 placement
/**
 * 尝试认领一个别名（符号链接）目录：读不出、越界或已见过时放弃，不是可同步的工作文件时跳过，受别名预算限制。
 */
async function claimAliasDir(walkState, dir, visited) {
  let realDir;
  try {
    realDir = await realpathStrict(dir);
  } catch {
    walkState.giveUp ??= "alias_unreadable";
    return null;
  }
  let nativeRel = relative(walkState.realConfigHome, realDir);
  if (isOutsideConfigHome(walkState, realDir)) {
    walkState.giveUp ??= "alias_unreadable";
    return null;
  }
  if (visited.has(realDir) || isParentOrAbsolute(nativeRel)) return null;
  let probePath = `${toPosixNfcPath(nativeRel, sep)}/x.md`;
  if (classifyWorkingFile(probePath) === null && !isSyncableMarkdownPath(probePath)) return null;
  if (walkState.aliasBudget.left <= 0) {
    walkState.giveUp ??= "too_many_links";
    return null;
  }
  walkState.aliasBudget.left -= 1;
  return realDir;
}
//@ chunk-vb7ng9fr.js:18078-18315 placement
async function resolveDirentType(walkState, relPath, dirent) {
  if (
    dirent.isSymbolicLink() ||
    dirent.isFile() ||
    dirent.isDirectory() ||
    dirent.isFIFO() ||
    dirent.isSocket() ||
    dirent.isCharacterDevice() ||
    dirent.isBlockDevice()
  )
    return dirent;
  try {
    return await lstat(relPath);
  } catch (error) {
    if (!isMissingPathError(error)) walkState.giveUp ??= "alias_unreadable";
    return null;
  }
}
//@ chunk-vb7ng9fr.js:18315-18511 placement
async function statFollowingSafeLinks(walkState, filePath) {
  let risky;
  try {
    risky = await isRiskyLinkChain(filePath);
  } catch {
    walkState.giveUp ??= "alias_unreadable";
    return null;
  }
  if (risky) return null;
  try {
    return await stat(filePath);
  } catch (error) {
    if (!isMissingPathError(error)) walkState.giveUp ??= "alias_unreadable";
    return null;
  }
}
//@ chunk-vb7ng9fr.js:18511-18570 placement
/**
 * 按名字排序的比较函数。
 */
function compareByName(left, right) {
  return left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
}
//@ chunk-vb7ng9fr.js:18570-18622 placement
/**
 * 在已见位置表里登记（已有记录时不覆盖）。
 */
function rememberLocation(records, realPath, value) {
  if (value !== null || !records.has(realPath)) records.set(realPath, value);
}
//@ chunk-vb7ng9fr.js:18622-19557 placement
/**
 * 判定一个清点文件：别名只做敏感归属；无法解析或越界记为未发送；不是可同步目的地时记为不发送或拒绝；已见过的文件归属；否则返回候选条目。
 */
async function classifyInventoryFile(walkState, pathFilter, file, claimed, attributed, sensitiveByPath) {
  let location = await locateInConfigHome(walkState, file.path, file.lexicalRel, file.rawLexicalRel);
  if (file.aliasOnly) {
    if (location === "unresolvable") walkState.giveUp ??= "alias_unreadable";
    else if (location !== "outside") {
      let sensitivePath = resolveSensitivePath(walkState, pathFilter, location, file.lexicalRel);
      if (sensitivePath !== null) rememberLocation(sensitiveByPath, location.realPath, sensitivePath);
    }
    return {
      kind: "attributed",
    };
  }
  if (location === "unresolvable") {
    if (file.viaSymlink) walkState.giveUp ??= "alias_unreadable";
    return refusedLeftBehind(file, file.viaSymlink ? "symlink_not_sent" : "unreadable");
  }
  if (location === "outside") return refusedLeftBehind(file, "symlink_not_sent");
  let destRel = file.viaSymlink ? location.rel : file.lexicalRel;
  let destination = workingFileDestination(destRel);
  if (destination === null) {
    let sensitivePath = file.viaSymlink
      ? resolveSensitivePath(walkState, pathFilter, location, file.lexicalRel)
      : null;
    if (!file.viaSymlink || sensitivePath !== null)
      rememberLocation(sensitiveByPath, location.realPath, sensitivePath);
    if (attributed.has(location.realPath))
      return {
        kind: "attributed",
      };
    attributed.add(location.realPath);
    return sensitivePath === null
      ? refusedLeftBehind(file, file.viaSymlink ? "symlink_not_sent" : "not_destination")
      : {
          kind: "refused",
          left: sensitivePath,
        };
  }
  if (claimed.has(location.realPath)) {
    let sensitivePath = resolveSensitivePath(walkState, pathFilter, location, file.lexicalRel);
    if (sensitivePath !== null) rememberLocation(sensitiveByPath, location.realPath, sensitivePath);
    return {
      kind: "attributed",
    };
  }
  return {
    kind: "candidate",
    candidate: {
      ...destination,
      location,
      imports: [],
      styleVia: new Map(),
    },
  };
}
//@ chunk-vb7ng9fr.js:19557-19631 placement
/**
 * 构造“未发送”条目（路径 + 原因）。
 */
function refusedLeftBehind(file, reason) {
  return {
    kind: "refused",
    left: {
      path: file.lexicalRel,
      reason,
    },
  };
}
//@ chunk-vb7ng9fr.js:19631-19727 placement
/**
 * 把候选放入目的地持有表（重复时返回 null）。
 */
function holdDestination(held, candidate) {
  let key = normalizedPath(candidate.destination);
  if (held.held.has(key)) return null;
  held.held.set(key, candidate);
  return candidate;
}
//@ chunk-vb7ng9fr.js:19727-20341 placement
/**
 * 对每个记忆文件求候选，读取其 include 树：无 include 时检查内容可读；无可用目的地时记为不发送；否则持有候选并解析其 import。
 */
async function collectMemoryCandidates(
  ctx,
  classify,
  files,
  destinations,
  claimed,
  budget,
  output,
  seen,
  signal,
) {
  let leftBehind = [];
  for (let file of files) {
    if (isAborted(signal)) return null;
    let probe = await classifyInventoryFile(ctx, classify, file, claimed, budget, seen);
    if (probe.kind === "refused") leftBehind.push(probe.left);
    if (probe.kind !== "candidate") continue;
    let { candidate } = probe;
    let readPath = file.lexicalRel === CLAUDE_MD ? file.path : candidate.location.realPath;
    let imports = await isInstructionsMemoryType_3(readPath, "User", new Set(), true);
    if (imports.length === 0) {
      let nativeWorkingFile = await readNativeWorkingFile(ctx, candidate.location);
      if (nativeWorkingFile.kind === "read" && nativeWorkingFile.content.includes(0))
        leftBehind.push({
          path: file.lexicalRel,
          reason: "unreadable",
        });
      continue;
    }
    if (holdDestination(destinations, candidate) === null) {
      for (let candidates of imports) await attributeAtReferences(ctx, classify, candidates, seen);
      leftBehind.push({
        path: file.lexicalRel,
        reason: "not_destination",
      });
      continue;
    }
    claimed.add(candidate.location.realPath);
    leftBehind.push(
      ...(await resolveCandidateImports(
        ctx,
        classify,
        candidate,
        imports,
        destinations,
        claimed,
        budget,
        output,
        seen,
      )),
    );
  }
  return leftBehind;
}
//@ chunk-vb7ng9fr.js:20341-20405 placement
/**
 * 生成 glob 作用域的键（排序后的 JSON）。
 */
function scopeKey(scope) {
  return scope.globs === undefined ? "" : jsonStringify(scope.globs.toSorted());
}
//@ chunk-vb7ng9fr.js:20405-22358 placement
/**
 * 解析候选文件的 include 链：每个被引用文件在目的地范围内、非敏感、作用域一致时作为内联 import，输出样式单独记录经由关系；其他按原因（越界、敏感、非目的地、include 未发送）记入未发送列表。
 */
async function resolveCandidateImports(
  ctx,
  classify,
  candidate,
  imports,
  held,
  claimed,
  budget,
  output,
  withheld,
) {
  let left = [];
  let importEntry = imports.find((root) => root.parent === undefined);
  let filtered = imports.filter((importEntry_2) => importEntry_2 !== importEntry);
  let styleRealByInclude = new Map();
  let makeHolder = (candidate, importEntry) => ({
    candidate,
    isStyle: candidate.kind === "output_style",
    withheld:
      getSensitivePathReason(ctx, classify, candidate.location) !== null ||
      withheld.get(candidate.location.realPath) != null,
    scope: scopeKey(importEntry),
  });
  let holderByPath = new Map(
    importEntry === undefined ? [] : [[importEntry.path, makeHolder(candidate, importEntry)]],
  );
  let leftIndexByReal = new Map();
  let addLeft = (realPath, row) => {
    if (!budget.has(realPath)) {
      budget.add(realPath);
      leftIndexByReal.set(realPath, left.push(row) - 1);
    }
  };
  let setLeft = (realPath, row) => {
    let index = leftIndexByReal.get(realPath);
    if (index === undefined) addLeft(realPath, row);
    else left[index] = row;
  };
  for (let importEntry of imports) await attributeAtReferences(ctx, classify, importEntry, withheld);
  for (let importEntry of filtered) {
    let holder = holderByPath.get(importEntry.parent ?? "");
    if (holder === undefined) continue;
    let relInfo = relativeToConfigHome(ctx, importEntry.path);
    let location = await locateInConfigHome(
      ctx,
      importEntry.path,
      relInfo?.rel ?? null,
      relInfo?.raw ?? null,
    );
    if (location === "outside" || location === "unresolvable") {
      addLeft(importEntry.path, {
        path: relInfo?.rel ?? importEntry.path,
        reason: "include_not_sent",
      });
      continue;
    }
    if (claimed.has(location.realPath) || withheld.has(location.realPath)) {
      let sensitivePath =
        withheld.get(location.realPath) ?? resolveSensitivePath(ctx, classify, location, location.lexicalRel);
      if (sensitivePath !== null) {
        rememberLocation(withheld, location.realPath, sensitivePath);
        setLeft(location.realPath, sensitivePath);
      }
      continue;
    }
    let destination = workingFileDestination(location.rel);
    if (destination !== null) {
      let claimedCandidate = holdDestination(held, {
        ...destination,
        location,
        imports: [],
        styleVia: new Map(),
      });
      if (claimedCandidate === null) {
        addLeft(location.realPath, {
          path: location.lexicalRel,
          reason: "not_destination",
        });
        continue;
      }
      claimed.add(location.realPath);
      if (claimedCandidate.kind === "output_style") {
        styleRealByInclude.set(importEntry.path, location.realPath);
        let parentStyleReal =
          importEntry.parent === undefined ? undefined : styleRealByInclude.get(importEntry.parent);
        if (parentStyleReal !== undefined) holder.candidate.styleVia.set(location.realPath, parentStyleReal);
        if (!holder.withheld && !holder.isStyle && holder.scope === scopeKey(importEntry))
          holder.candidate.imports.push({
            location,
            via: parentStyleReal ?? null,
            asStyle: true,
          });
      }
      holderByPath.set(
        importEntry.path,
        claimedCandidate.kind === "output_style"
          ? {
              ...holder,
              withheld:
                holder.withheld || getSensitivePathReason(ctx, classify, claimedCandidate.location) !== null,
            }
          : makeHolder(claimedCandidate, importEntry),
      );
      continue;
    }
    if (holder.withheld) continue;
    let all = normalizeCaseForComparison_2([location.rel, location.lexicalRel, ...location.rawRels]).every(
      isSyncableMarkdownPath,
    );
    let sensitivePath = all ? resolveSensitivePath(ctx, classify, location, location.lexicalRel) : null;
    let reason = sensitivePath?.reason ?? null;
    let isRulesOrStyle =
      isRulesOrOutputStylePath(location.rel) && extname(location.rel).toLowerCase() === MD_EXTENSION;
    if (sensitivePath !== null || isRulesOrStyle)
      rememberLocation(withheld, location.realPath, sensitivePath);
    if (!all || reason !== null) {
      addLeft(location.realPath, {
        path: location.lexicalRel,
        reason: reason ?? (isRulesOrStyle ? "not_destination" : "include_not_sent"),
      });
      continue;
    }
    if (holder.isStyle || holder.scope !== scopeKey(importEntry)) {
      output.set(location.realPath, {
        path: location.lexicalRel,
        reason: "include_not_sent",
      });
      continue;
    }
    holder.candidate.imports.push({
      location,
      via: importEntry.parent === undefined ? null : (styleRealByInclude.get(importEntry.parent) ?? null),
    });
    styleRealByInclude.set(importEntry.path, location.realPath);
    claimed.add(location.realPath);
    holderByPath.set(importEntry.path, holder);
  }
  return left;
}
//@ chunk-vb7ng9fr.js:22358-23447 placement
/**
 * 扫描文件中的 @ 引用拼写：解析到配置目录外的路径按过滤器结果记为敏感或拒读；配置目录内的走敏感路径判定；无法审查时放弃整次清点。
 */
async function attributeAtReferences(ctx, classify, memoryFile, withheld) {
  if (hasBackslash(memoryFile.path)) {
    ctx.giveUp ??= "alias_unreadable";
    return;
  }
  let baseDir = dirname(resolvePathInfo(memoryFile.path).resolvedPath);
  let spellings = collectAtReferenceSpellings(
    memoryFile.content,
    splitFrontmatter(memoryFile.rawContent ?? memoryFile.content).body,
  );
  if (!spellings.vettable) {
    ctx.giveUp ??= "alias_unreadable";
    return;
  }
  for (let spelling of spellings.spellings) {
    if (spelling.includes("\x00")) continue;
    let expanded = expandPath(spelling, baseDir);
    if (
      (isUncOrDevicePath(spelling) || isUncOrDevicePath(expanded)) &&
      isParentOrAbsolute(relative(ctx.configHome, expanded))
    )
      continue;
    let pathInfo = resolvePathInfo(expanded);
    if (!pathInfo.isCanonical) {
      if (!pathInfo.isSymlink && !(await isMissingReference(expanded))) ctx.giveUp ??= "alias_unreadable";
      continue;
    }
    let homeRel = relativeToConfigHome(ctx, expanded);
    if (homeRel === null) {
      let resolvedPath = pathInfo.resolvedPath;
      if (
        withheld.get(resolvedPath) != null ||
        isParentOrAbsolute(relative(ctx.realConfigHome, resolvedPath))
      )
        continue;
      let gitRel = relativeUnderConfigHome(ctx.configHome, expanded);
      if (gitRel === null) {
        ctx.giveUp ??= "alias_unreadable";
        continue;
      }
      switch (
        isSensitiveWithGitConfig(expanded) || isSensitiveWithGitConfig(resolvedPath)
          ? "sensitive"
          : classify(gitRel, true)
      ) {
        case "sensitive":
        case "sensitive_tracked":
        case "host_config":
          rememberLocation(withheld, resolvedPath, {
            path: spelling,
            reason: "sensitive",
          });
          break;
        case "read_denied":
        case "rules_unreadable":
          rememberLocation(withheld, resolvedPath, {
            path: spelling,
            reason: "read_denied",
          });
          break;
        case "content_filter":
        case null:
          break;
      }
      continue;
    }
    let location = await locateInConfigHome(ctx, expanded, homeRel.rel, homeRel.raw);
    if (location === "unresolvable") {
      ctx.giveUp ??= "alias_unreadable";
      continue;
    }
    if (location === "outside" || withheld.get(location.realPath) != null) continue;
    let sensitiveReason = resolveSensitivePath(ctx, classify, location, location.lexicalRel);
    if (sensitiveReason !== null) rememberLocation(withheld, location.realPath, sensitiveReason);
  }
}
//@ chunk-vb7ng9fr.js:23447-23561 placement
async function isMissingReference(path) {
  if ((isUncOrDevicePath(path) && !isWslUncPath(path)) || isNetworkMountPath(path)) return true;
  try {
    await realpathStrict(path);
    return false;
  } catch (error) {
    return isMissingPathError(error) && (await missingOrUnreadable(path));
  }
}
//@ chunk-vb7ng9fr.js:23561-23941 placement
/**
 * 收集候选文件中被拒绝的项：拒绝项直接记录，非 output style 的符号链接与无目标位置的候选记为不发送，其余登记真实路径。
 */
async function collectOutputStyleCandidates(
  walkState,
  pathFilter,
  files,
  held,
  claimed,
  attributed,
  sensitiveByPath,
) {
  let path = [];
  for (let stat of files) {
    let linkBody = await classifyInventoryFile(
      walkState,
      pathFilter,
      stat,
      claimed,
      attributed,
      sensitiveByPath,
    );
    if (linkBody.kind === "refused") path.push(linkBody.left);
    else if (linkBody.kind === "candidate")
      if (linkBody.candidate.kind !== "output_style")
        path.push({
          path: stat.lexicalRel,
          reason: "symlink_not_sent",
        });
      else if (holdDestination(held, linkBody.candidate) === null)
        path.push({
          path: stat.lexicalRel,
          reason: "not_destination",
        });
      else claimed.add(linkBody.candidate.location.realPath);
  }
  return path;
}
//@ chunk-vb7ng9fr.js:24620-26891 placement
/**
 * 生成一个清点条目：检查敏感、可读与大小，凭证内容拒发；非输出样式先去引用化，再按上限依次内联 import（跳过敏感、未闭合块、含链接、超限或含凭证的），必要时对合并结果再去引用；返回 {entry, foldedIncludes, leftBehind}。
 */
async function buildInventoryEntry(walkState, pathFilter, candidate, sensitiveByPath, failedReal, seenReal) {
  let sensitive = resolveSensitivePath(walkState, pathFilter, candidate.location, candidate.destination);
  let knownSensitive = sensitiveByPath.get(candidate.location.realPath) ?? null;
  if (sensitive !== null) return buildWithheldEntry(candidate, sensitive.reason, seenReal, sensitive.path);
  if (knownSensitive !== null)
    return buildWithheldEntry(candidate, knownSensitive.reason, seenReal, knownSensitive.path);
  if (!(await isStillAtRealPath(walkState, candidate.location)))
    return buildWithheldEntry(candidate, "unreadable", seenReal);
  let read = await readNativeWorkingFile(walkState, candidate.location);
  if (read.kind === "skip")
    return buildWithheldEntry(candidate, mapSkipReasonToLeftBehind(read.skipped.reason), seenReal);
  if (read.content.length > MAX_WORKING_FILE_BYTES_2_2)
    return buildWithheldEntry(candidate, "over_cap", seenReal);
  let text = read.content.toString("utf8");
  if (looksLikeCredentialIncludingNul(text)) {
    let withheldEntry = buildWithheldEntry(candidate, "credential", seenReal);
    return {
      ...withheldEntry,
      leftBehind: withheldEntry.leftBehind.map((row) =>
        row.reason === "credential"
          ? {
              ...row,
              ...matchKey(text, 0),
            }
          : row,
      ),
    };
  }
  let defused =
    candidate.kind === "output_style"
      ? {
          content: read.content,
          defusedPaths: [],
        }
      : defuseIncludes(candidate.destination, read.content, candidate.imports.length > 0);
  let parts = [defused.content];
  let folded = [];
  let foldedIncludes = [];
  let totalBytes = defused.content.length;
  let leftBehind = [];
  let parentOpenBlock =
    candidate.imports.length > 0 &&
    endsInsideOpenBlock(splitFrontmatter(defused.content.toString("utf8")).body);
  let excludedReal = new Set(failedReal);
  for (let { location, via, asStyle } of candidate.imports) {
    let noteLeft = (row) => {
      if (!asStyle) leftBehind.push(row);
    };
    let sensitivePath = resolveSensitivePath(walkState, pathFilter, location, location.lexicalRel);
    if (
      sensitivePath !== null ||
      sensitiveByPath.has(location.realPath) ||
      excludedReal.has(location.realPath) ||
      (via !== null && isViaExcluded(via, excludedReal, candidate.styleVia)) ||
      parentOpenBlock
    ) {
      excludedReal.add(location.realPath);
      if (!seenReal.has(location.realPath)) {
        seenReal.add(location.realPath);
        noteLeft(
          sensitivePath ??
            sensitiveByPath.get(location.realPath) ?? {
              path: location.lexicalRel,
              reason: "include_not_sent",
            },
        );
      }
      continue;
    }
    let importRead = (await isStillAtRealPath(walkState, location))
      ? await readNativeWorkingFile(walkState, location)
      : null;
    if (importRead === null || importRead.kind === "skip") {
      excludedReal.add(location.realPath);
      noteLeft({
        path: location.lexicalRel,
        reason: "include_not_sent",
      });
      continue;
    }
    let { head, body } = splitFrontmatter(importRead.content.toString("utf8"));
    if (endsInsideOpenBlock(body) || hasMarkdownLinks(body)) {
      excludedReal.add(location.realPath);
      noteLeft({
        path: location.lexicalRel,
        reason: "include_not_sent",
      });
      continue;
    }
    let buffer = Buffer.from(inlinedImportMarker(location.rel) + escapeUnvettedIncludes(body));
    if (totalBytes + buffer.length > MAX_WORKING_FILE_BYTES_2_2) {
      excludedReal.add(location.realPath);
      noteLeft({
        path: location.lexicalRel,
        reason: "over_cap",
      });
      continue;
    }
    if (looksLikeCredentialIncludingNul(body)) {
      excludedReal.add(location.realPath);
      noteLeft({
        path: location.lexicalRel,
        reason: "credential",
        ...matchKey(
          body,
          countCharInString(
            head,
            `
`,
          ),
        ),
      });
      continue;
    }
    parts.push(buffer);
    folded.push(location.lexicalRel);
    if (!asStyle) foldedIncludes.push(location.lexicalRel);
    totalBytes += buffer.length;
  }
  let buffer = Buffer.concat(parts);
  let content =
    candidate.kind !== "output_style" &&
    parts.length > 1 &&
    hasNewIncludes(defused.content, buffer, candidate.destination)
      ? escapeAllIncludes(buffer)
      : buffer;
  if (
    candidate.kind !== "output_style" &&
    content !== buffer &&
    hasUnvettedIncludeIn(content, allowAllIncludes)
  )
    return buildWithheldEntry(candidate, "undefusable", seenReal);
  if (!content.equals(read.content) && looksLikeCredentialIncludingNul(content.toString("utf8"))) {
    let withheldEntry = buildWithheldEntry(candidate, "credential", seenReal);
    let leftBehindPaths = new Set(leftBehind.map((row) => row.path));
    return {
      ...withheldEntry,
      leftBehind: [
        ...withheldEntry.leftBehind.filter((row) => !leftBehindPaths.has(row.path)),
        ...leftBehind,
      ],
    };
  }
  let foldedSet = new Set(folded);
  let defusedCount = countWhere(
    defused.defusedPaths,
    (defusedPath) =>
      !foldedSet.has(
        posix.normalize(posix.join(posix.dirname(candidate.destination), defusedPath)).normalize("NFC"),
      ),
  );
  return {
    entry: {
      path: candidate.destination,
      kind: candidate.kind,
      content,
      sha256: computeContentHash(content),
      folded,
      defused: defusedCount,
    },
    foldedIncludes,
    leftBehind,
  };
}
//@ chunk-vb7ng9fr.js:26891-27474 placement
/**
 * 对记忆文件正文中指向非目的地的 @include 加反斜杠去引用（保留 frontmatter 与 BOM）；结果仍可能引用时退回到整体转义 @。
 */
function defuseIncludes(destination, content, path) {
  let isDestination = (include) => isDestinationInclude(destination, include);
  let replaced = content.toString("utf8").replace(
    /\r\n?/g,
    `
`,
  );
  let split = splitFrontmatter(replaced);
  let head = split.head;
  let bom = head !== "" && replaced.startsWith("\uFEFF") ? "\uFEFF" : "";
  let leadingNewline =
    path && head === "" && /^\uFEFF?---\s*\n/.test(replaced)
      ? `
`
      : "";
  let headPart = leadingNewline + bom + head;
  let body = split.body;
  let result = [];
  let defusedBody = escapeUnvettedIncludes(body, isDestination, result);
  let result_2 =
    defusedBody === body && leadingNewline === ""
      ? {
          content,
          defusedPaths: [],
        }
      : {
          content: Buffer.from(headPart + defusedBody),
          defusedPaths: result,
        };
  if (
    result_2.content !== content &&
    (splitFrontmatter(content.toString("utf8")).head === "") !== (head === "")
  )
    return {
      content: Buffer.from(escapeAtSigns(replaced)),
      defusedPaths: defusedIncludes(body, isDestination),
    };
  if (!hasUnvettedIncludeIn(result_2.content, isDestination)) return result_2;
  let defusedPaths = defusedIncludes(body, isDestination);
  let buffer = Buffer.from(headPart + escapeAtSigns(body));
  return hasUnvettedIncludeIn(buffer, allowAllIncludes)
    ? {
        content: Buffer.from(leadingNewline + escapeAtSigns(replaced)),
        defusedPaths,
      }
    : {
        content: buffer,
        defusedPaths,
      };
}
//@ chunk-vb7ng9fr.js:27474-27557 placement
/**
 * 找出所有未受审查的 @ 引用写法。
 */
function defusedIncludes(body, isDestination) {
  let atReferenceSpellings = collectAtReferenceSpellings(body, body);
  return atReferenceSpellings.vettable
    ? atReferenceSpellings.spellings.filter((spelling) => !isDestination(spelling))
    : [];
}
//@ chunk-vb7ng9fr.js:27557-27685 placement
function hasNewIncludes(text, mergedContent, destination) {
  let isDestination = (include) => isDestinationInclude(destination, include);
  let includedOf = (text) => extractIncludePathsFromText(splitFrontmatter(text.toString("utf8")).body);
  let nextIncludes = includedOf(mergedContent);
  return (
    nextIncludes.some((include) => !isDestination(include)) ||
    countWhere(nextIncludes, isDestination) > countWhere(includedOf(text), isDestination)
  );
}
//@ chunk-vb7ng9fr.js:27685-27854 placement
function escapeAllIncludes(content) {
  let str = content.toString("utf8");
  let { head, body } = splitFrontmatter(str);
  let inner = head !== "" && str.startsWith("\uFEFF") ? "\uFEFF" : "";
  let buffer = Buffer.from(inner + head + escapeAtSigns(body));
  return hasUnvettedIncludeIn(buffer, allowAllIncludes) ? Buffer.from(escapeAtSigns(str)) : buffer;
}
//@ chunk-vb7ng9fr.js:27854-27912 placement
/**
 * 判断内容体里是否有未受审查的 @include。
 */
function hasUnvettedIncludeIn(content, isAllowed) {
  return hasUnvettedInclude(splitFrontmatter(content.toString("utf8")).body, isAllowed);
}
//@ chunk-vb7ng9fr.js:27912-28054 placement
function splitFrontmatter(text) {
  let strippedBom = text.startsWith("\uFEFF") ? text.slice(1) : text;
  let match = FRONTMATTER_REGEX.exec(strippedBom)?.[0];
  return match === undefined
    ? {
        head: "",
        body: text,
      }
    : {
        head: match,
        body: strippedBom.slice(match.length),
      };
}
//@ chunk-vb7ng9fr.js:28054-28234 placement
function isDestinationInclude(destination, include) {
  if (include.startsWith("/") || include.startsWith("~")) return false;
  let normalized = posix.normalize(posix.join(posix.dirname(destination), include));
  let normalizedInclude = normalized.startsWith("../") ? null : classifyWorkingFile(normalized);
  return normalizedInclude === "claude_md" || normalizedInclude === "rule";
}
//@ chunk-vb7ng9fr.js:28234-28352 placement
function isViaExcluded(via, excludedReal, styleVia) {
  let seen = new Set();
  for (let part = via; part !== undefined && !seen.has(part); part = styleVia.get(part)) {
    if (excludedReal.has(part)) return true;
    seen.add(part);
  }
  return false;
}
//@ chunk-vb7ng9fr.js:28352-28457 placement
async function isStillAtRealPath(walkState, location) {
  try {
    return (await realpathStrict(join(walkState.realConfigHome, location.nativeRel))) === location.realPath;
  } catch {
    return false;
  }
}
export { getAliasSpellings, INCLUDE_EXTERNAL, MAX_INCLUDE_READS, buildHomeInventory };
