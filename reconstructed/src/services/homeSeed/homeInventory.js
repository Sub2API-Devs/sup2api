/**
 * services/homeSeed/homeInventory.ts
 *
 * 2.1.316 新增：本地 home 目录配置清点
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-axmbhcjg.js (58)
 * attribution: placement 58
 */
import { realpath, readlink, lstat, stat, readdir } from "fs/promises";
import { relative, sep, extname, resolve, dirname, join, posix } from "path";
import { isDiskless } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { applyRemoteEntriesToLocal } from "../settingsSync/index.js";
import { normalizePathForCompare } from "../../utils/file.js";
import {
  isInstructionsMemoryType_3,
  MAX_INCLUDE_DEPTH as MAX_INCLUDE_DEPTH_2,
} from "../../utils/claudemd.js";
import { hasBackslash, isUncOrDevicePath } from "../../utils/pathClassification.js";
import {
  safeResolvePath,
  getFsImplementation,
  hasUntouchableRecordSpelling,
} from "../../utils/fsOperations.js";
import {
  isParentOrAbsolute,
  toPosixNfcPath,
  MD_EXTENSION,
  PATH_SEPARATOR_RE,
} from "../../utils/posixPaths.js";
import { uniq, count } from "../../utils/collections.js";
import { foldName } from "../../utils/permissions/protectedDirNames.js";
import { firstLineOf, isWellFormedString, countCharInString } from "../../utils/stringUtils.js";
import { shouldIgnore } from "../syncedFiles/syncedFileSyncer.js";
import { DIR_SYNC_EXCLUDED_DIRS } from "../../utils/teleport/dirSync.js";
import { getThinkbackSkillDir } from "../../commands/thinkback/thinkback.js";
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
import { resolveSensitivePath, getSensitivePathReason } from "../../utils/permissions/filesystem.js";
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
import { normalizeGitPaths } from "../../hooks/fileSuggestions.js";
import { isSensitiveWithGitConfig } from "../../utils/permissions/sensitivePaths.js";
import { looksLikeCredentialIncludingNul } from "./portableSettings.js";
import { matchKey } from "../../components/GlobalSearchDialog.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { FRONTMATTER_REGEX } from "../../utils/frontmatterParser.js";

//@ chunk-axmbhcjg.js:7915-7933 placement
/**
 * 是否继续解析 include 的深度上限标记（true）。
 */
var MAX_INCLUDE_READS = 4096;
var MAX_INCLUDE_DEPTH = true;
//@ chunk-axmbhcjg.js:7933-8417 placement
/**
 * 从配置目录出发收集用户记忆文件及其 @include 链（按类型+路径去重，读取次数超上限返回 null）；无磁盘会话直接返回 null。
 */
async function collectMemoryIncludeTree(configHome, signal) {
  if (isDiskless()) {
    logForDebugging("home inventory: memory files not read in a diskless session; nothing is sent");
    return null;
  }
  let r = {
    reads: 0,
  };
  let o = await applyRemoteEntriesToLocal(configHome, r, signal);
  if (o === null) return null;
  let i = new Map();
  for (let s = o.pop(); s !== undefined; s = o.pop()) {
    let u = `${s.type}\x00${normalizePathForCompare(s.path)}`;
    if (i.has(u)) continue;
    if (signal?.aborted) return null;
    i.set(u, s);
    let d = await isInstructionsMemoryType_3(
      s.path,
      s.type,
      new Set(),
      MAX_INCLUDE_DEPTH,
      MAX_INCLUDE_DEPTH_2 - 2,
    );
    r.reads += d.length;
    if (r.reads > MAX_INCLUDE_READS) return null;
    o.push(...d.filter((f) => f.path !== s.path));
  }
  return [...i.values()];
}
//@ chunk-axmbhcjg.js:9323-9427 placement
async function realpathStrict(e) {
  if (hasBackslash(e)) throw Error("realpath would misread a backslash in the path");
  return realpath(e);
}
//@ chunk-axmbhcjg.js:9427-9511 placement
/**
 * 解析路径的规范形式（符号链接或安全解析）。
 */
function resolvePathInfo(e) {
  return hasBackslash(e)
    ? {
        resolvedPath: e,
        isSymlink: false,
        isCanonical: false,
      }
    : safeResolvePath(getFsImplementation(), e);
}
//@ chunk-axmbhcjg.js:9511-9523 placement
/**
 * 别名目录的数量上限（4096）。
 */
var MAX_ALIAS_DIRECTORIES = 4096;
//@ chunk-axmbhcjg.js:9523-9765 placement
async function locateInConfigHome(e, n, r, o) {
  let i;
  try {
    i = await realpathStrict(n);
  } catch {
    return "unresolvable";
  }
  let s = relative(e.realConfigHome, i);
  if (s === "" || isParentOrAbsolute(s)) return "outside";
  let posixNfcPath = toPosixNfcPath(s, sep);
  return {
    realPath: i,
    nativeRel: s,
    rel: posixNfcPath,
    lexicalRel: r ?? posixNfcPath,
    rawRels: uniq([toPosixSeparators(s), ...(o === null ? [] : [o])]),
  };
}
//@ chunk-axmbhcjg.js:9765-9867 placement
async function isOutsideOrUnresolvable(e, n) {
  try {
    let r = await realpathStrict(n);
    return isOutsideConfigHome(e, r) || !isParentOrAbsolute(relative(e.realConfigHome, r));
  } catch {
    return true;
  }
}
//@ chunk-axmbhcjg.js:9867-9916 placement
/**
 * 判断相对路径是否落在配置主目录之外。
 */
function isOutsideConfigHome(e, n) {
  return !isParentOrAbsolute(relative(n, e.realConfigHome));
}
//@ chunk-axmbhcjg.js:9916-9969 placement
/**
 * 把路径分隔符统一成 /。
 */
function toPosixSeparators(e) {
  return sep === "/" ? e : e.split(sep).join("/");
}
//@ chunk-axmbhcjg.js:9969-10113 placement
function relativeToConfigHome(e, n) {
  let found = [e.configHome, e.realConfigHome]
    .map((o) => relative(o, n))
    .find((o) => o !== "" && !isParentOrAbsolute(o));
  return found === undefined
    ? null
    : {
        rel: toPosixNfcPath(found, sep),
        raw: toPosixSeparators(found),
      };
}
//@ chunk-axmbhcjg.js:10113-10286 placement
function isSyncableMarkdownPath(e) {
  let n = foldName(firstLineOf(e, "/"));
  return (
    isWellFormedString(e) &&
    e.includes("/") &&
    extname(e).toLowerCase() === MD_EXTENSION &&
    !shouldIgnore(e) &&
    !TRAILING_TILDE_NUMBER_RE.test(e) &&
    !DIR_SYNC_EXCLUDED_DIRS.has(n) &&
    !n.startsWith("agent-memory") &&
    !getThinkbackSkillDir(e) &&
    !isRulesOrOutputStylePath(e)
  );
}
//@ chunk-axmbhcjg.js:10286-10353 placement
/**
 * 判断相对路径首段是否为 rules 或 output-styles。
 */
function isRulesOrOutputStylePath(e) {
  let n = foldName(firstLineOf(e, "/"));
  return n === foldName(RULES) || n === foldName(OUTPUT_STYLES);
}
//@ chunk-axmbhcjg.js:10434-10453 placement
/**
 * 跟随符号链接的最大跳数（32）。
 */
var TRAILING_TILDE_NUMBER_RE = /~\d/;
var MAX_SYMLINK_HOPS = 32;
//@ chunk-axmbhcjg.js:10453-11003 placement
/**
 * 沿符号链接链逐跳检查（有跳数上限）：遇到循环返回 false；链接文本非 UTF-8、先进入目录再向上越级、或指向不可触碰的拼写时视为有风险。
 */
async function isRiskyLinkChain(e) {
  let current = e;
  let visited = new Set();
  for (let o = 0; o < MAX_SYMLINK_HOPS; o += 1) {
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
//@ chunk-axmbhcjg.js:11003-11060 placement
/**
 * 判断是否为可忽略的查找错误（EINVAL 也算），否则抛出。
 */
function isIgnorableLookupError(error) {
  if (isMissingPathError(error) || getErrnoCode(error) === "EINVAL") return true;
  throw error;
}
//@ chunk-axmbhcjg.js:11060-11153 placement
/**
 * 判断错误码是否表示路径不存在（ENOENT/ENOTDIR/ELOOP/ENAMETOOLONG）。
 */
function isMissingPathError(error) {
  let errnoCode = getErrnoCode(error);
  return (
    errnoCode === "ENOENT" || errnoCode === "ENOTDIR" || errnoCode === "ELOOP" || errnoCode === "ENAMETOOLONG"
  );
}
//@ chunk-axmbhcjg.js:11153-11221 placement
/**
 * 判断符号链接文本里是否有超过 255 字符的段。
 */
function hasOverlongSegment(linkBody) {
  return linkBody.split(/[\\/]/).some((n) => [...n].length > 255);
}
//@ chunk-axmbhcjg.js:11221-11290 placement
/**
 * 路径缺失或不可读（stat 失败且错误可忽略）。
 */
async function missingOrUnreadable(e) {
  try {
    await stat(e);
    return false;
  } catch (error) {
    return isMissingPathError(error);
  }
}
//@ chunk-axmbhcjg.js:11290-11372 placement
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
//@ chunk-axmbhcjg.js:11372-11486 placement
function linkClimbsAfterEntering(linkBody) {
  let n = false;
  for (let r of linkBody.split(PATH_SEPARATOR_RE))
    if (r === "..") {
      if (n) return true;
    } else if (r !== "" && r !== ".") n = true;
  return false;
}
//@ chunk-axmbhcjg.js:11486-11518 placement
/**
 * 清点被中止时的统一返回值。
 */
var ABORTED_INVENTORY_RESULT = {
  ok: false,
  reason: "aborted",
};
//@ chunk-axmbhcjg.js:11518-13602 placement
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
      for (let T of memoryIncludeTree) {
        if (isAborted(signal)) return ABORTED_INVENTORY_RESULT;
        await attributeAtReferences(walkState, pathFilter, T, sensitiveByPath);
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
    for (let v of [
      ...held.filter((T) => T.kind === "output_style"),
      ...held.filter((T) => T.kind !== "output_style"),
    ]) {
      if (isAborted(signal)) return ABORTED_INVENTORY_RESULT;
      let inventoryEntry = await buildInventoryEntry(
        walkState,
        pathFilter,
        v,
        sensitiveByPath,
        failedReal,
        seenReal,
      );
      if (inventoryEntry.entry === null) failedReal.add(v.location.realPath);
      resultByCandidate.set(v, inventoryEntry);
    }
    let flattened = held.flatMap((v) => resultByCandidate.get(v) ?? []);
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
        .toSorted((v, T) => compareInventoryEntries(v.entry, T.entry)),
    );
    let mapped = [...refusedByPath]
      .filter(([v]) => !attributed.has(v) && !seenReal.has(v))
      .map(([v, T]) => sensitiveByPath.get(v) ?? T);
    let leftBehind = [
      ...memoryFiles.leftBehind,
      ...memoryLeftBehind,
      ...mapped,
      ...styleFiles.leftBehind,
      ...styleLeftBehind,
      ...flattened.flatMap((v) => v.leftBehind),
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
    let mapped_2 = kept.map(({ entry }) => entry);
    return {
      ok: true,
      inventory: {
        entries: mapped_2,
        summary: summarizeInventory(mapped_2, leftBehind),
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
//@ chunk-axmbhcjg.js:13602-13727 placement
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
//@ chunk-axmbhcjg.js:13727-14145 placement
/**
 * 汇总清点结果：各类未发送原因的计数（敏感、拒读、include 未发送、符号链接、非目的地、不可读、超限、无法去引用）以及内联与去引用的 import 数。
 */
function summarizeInventory(e, leftBehind) {
  return {
    withheldSensitive: countByReason(leftBehind, "sensitive"),
    withheldReadDenied: countByReason(leftBehind, "read_denied"),
    rulesUnreadable: false,
    includesNotSent: countByReason(leftBehind, "include_not_sent"),
    symlinksNotSent: countByReason(leftBehind, "symlink_not_sent"),
    notDestinations: countByReason(leftBehind, "not_destination"),
    unreadable: countByReason(leftBehind, "unreadable"),
    overCap: countByReason(leftBehind, "over_cap"),
    undefusable: countByReason(leftBehind, "undefusable"),
    inlinedImports: e.reduce((acc, o) => acc + o.folded.length, 0),
    defusedImports: e.reduce((acc, o) => acc + o.defused, 0),
  };
}
//@ chunk-axmbhcjg.js:14145-14191 placement
/**
 * 按未发送原因统计条目数。
 */
function countByReason(e, n) {
  return count(e, (r) => r.reason === n);
}
//@ chunk-axmbhcjg.js:14191-14234 placement
/**
 * 三类条目的排序优先级（claude_md、rule、output_style）。
 */
var KIND_SORT_ORDER = {
  claude_md: 0,
  rule: 1,
  output_style: 2,
};
//@ chunk-axmbhcjg.js:14234-14353 placement
function compareInventoryEntries(entry, entry_2) {
  return (
    KIND_SORT_ORDER[entry.kind] - KIND_SORT_ORDER[entry_2.kind] ||
    entry.content.length - entry_2.content.length ||
    (entry.path < entry_2.path ? -1 : entry.path > entry_2.path ? 1 : 0)
  );
}
//@ chunk-axmbhcjg.js:14353-14819 placement
/**
 * 列出 CLAUDE.md 与 rules 目录下的记忆文件；CLAUDE.md 是指向非文件的符号链接时记为 symlink_not_sent，指向目录且在配置目录内时放弃。
 */
async function listMemoryFiles(walkState) {
  let n = join(walkState.configHome, CLAUDE_MD);
  let r = await lstatOrGiveUp(walkState, n);
  let o = await listDirFiles(walkState, RULES);
  if (r === null) return o;
  let i = r.isSymlink ? await statFollowingSafeLinks(walkState, n) : undefined;
  if (i?.isDirectory() === true && (await isOutsideOrUnresolvable(walkState, n)))
    walkState.giveUp ??= "alias_unreadable";
  if (i === null || (i !== undefined && !i.isFile()))
    return {
      files: o.files,
      leftBehind: [
        {
          path: CLAUDE_MD,
          reason: "symlink_not_sent",
        },
        ...o.leftBehind,
      ],
    };
  return {
    files: [
      {
        path: n,
        lexicalRel: CLAUDE_MD,
        rawLexicalRel: CLAUDE_MD,
        viaSymlink: r.isSymlink,
        aliasOnly: false,
      },
      ...o.files,
    ],
    leftBehind: o.leftBehind,
  };
}
//@ chunk-axmbhcjg.js:14819-15184 placement
/**
 * 列出配置目录下某子目录（rules、output-styles）的文件；子目录是符号链接且不指向目录时只按别名处理。
 */
async function listDirFiles(walkState, n) {
  let dir = join(walkState.configHome, n);
  let o = await lstatOrGiveUp(walkState, dir);
  if (o === null)
    return {
      files: [],
      leftBehind: [],
    };
  if (o.isSymlink) {
    let i = await statFollowingSafeLinks(walkState, dir);
    if (i === null || !i.isDirectory())
      return {
        files:
          i !== null && i.isFile()
            ? [
                {
                  path: dir,
                  lexicalRel: n,
                  rawLexicalRel: n,
                  viaSymlink: true,
                  aliasOnly: true,
                },
              ]
            : [],
        leftBehind: [
          {
            path: n,
            reason: "symlink_not_sent",
          },
        ],
      };
  }
  return walkMarkdownDir(walkState, dir, [n], o.isSymlink, new Set());
}
//@ chunk-axmbhcjg.js:15184-15686 placement
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
//@ chunk-axmbhcjg.js:15686-15826 placement
function getAliasSpellings(e, n) {
  return e.topLevelLinks.flatMap(({ name: r, targetRel }) =>
    n === targetRel ? [r] : n.startsWith(`${targetRel}/`) ? [`${r}/${n.slice(targetRel.length + 1)}`] : [],
  );
}
//@ chunk-axmbhcjg.js:15826-15963 placement
async function lstatOrGiveUp(e, n) {
  try {
    return {
      isSymlink: (await lstat(n)).isSymbolicLink(),
    };
  } catch (error) {
    if (!isMissingPathError(error)) e.giveUp ??= "alias_unreadable";
    return null;
  }
}
//@ chunk-axmbhcjg.js:15963-17111 placement
/**
 * 递归遍历目录收集 .md 文件（经符号链接进入的子树也记录），处理循环、越界与无法读取的情况，返回 {files, leftBehind}。
 */
async function walkMarkdownDir(walkState, dir, segments, viaSymlink, visitedReal) {
  let path = segments.join("/").normalize("NFC");
  let u = {
    files: [],
    leftBehind: [
      {
        path,
        reason: "symlink_not_sent",
      },
    ],
  };
  let d;
  try {
    let p = await realpathStrict(dir);
    if (visitedReal.has(p))
      return {
        files: await walkAliasOnlyDir(walkState, dir, segments, new Set([p])),
        leftBehind: [],
      };
    let y = relative(walkState.realConfigHome, p);
    if (isOutsideConfigHome(walkState, p)) {
      walkState.giveUp ??= "alias_unreadable";
      return u;
    }
    if (isParentOrAbsolute(y)) return u;
    let S = `${toPosixNfcPath(y, sep)}/x.md`;
    if (viaSymlink && classifyWorkingFile(S) === null)
      return {
        files: isSyncableMarkdownPath(S)
          ? await walkAliasOnlyDir(walkState, dir, segments, new Set([p]))
          : [],
        leftBehind: u.leftBehind,
      };
    visitedReal.add(p);
    d = await readdir(dir, {
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
  for (let p of d.toSorted(compareByName)) {
    let dir_2 = join(dir, p.name);
    let joined = [...segments, p.name].join("/");
    let normalized = joined.normalize("NFC");
    let direntType = await resolveDirentType(walkState, dir_2, p);
    if (direntType === null) continue;
    let E = direntType.isSymbolicLink();
    let x = p.name.endsWith(MD_EXTENSION);
    let I = E ? await statFollowingSafeLinks(walkState, dir_2) : direntType;
    if (I === null) {
      if (extname(p.name).toLowerCase() === MD_EXTENSION)
        leftBehind.push({
          path: normalized,
          reason: "symlink_not_sent",
        });
    } else if (I.isDirectory()) {
      let h = await walkMarkdownDir(walkState, dir_2, [...segments, p.name], viaSymlink || E, visitedReal);
      files.push(...h.files);
      leftBehind.push(...h.leftBehind);
    } else if (I.isFile() && (x || E || (viaSymlink && extname(p.name).toLowerCase() === MD_EXTENSION)))
      files.push({
        path: dir_2,
        lexicalRel: normalized,
        rawLexicalRel: joined,
        viaSymlink: viaSymlink || E,
        aliasOnly: !x,
      });
  }
  return {
    files,
    leftBehind,
  };
}
//@ chunk-axmbhcjg.js:17111-17679 placement
/**
 * 遍历只作为别名出现的目录，收集其中的 .md 与符号链接文件（标记 aliasOnly），子目录按别名预算继续。
 */
async function walkAliasOnlyDir(walkState, dir, segments, visited) {
  let i;
  try {
    i = await readdir(dir, {
      withFileTypes: true,
    });
  } catch {
    walkState.giveUp ??= "alias_unreadable";
    return [];
  }
  let files = [];
  for (let u of i.toSorted(compareByName)) {
    let dir_2 = join(dir, u.name);
    let joined = [...segments, u.name].join("/");
    let direntType = await resolveDirentType(walkState, dir_2, u);
    if (direntType === null) continue;
    let p = direntType.isSymbolicLink();
    let y = p ? await statFollowingSafeLinks(walkState, dir_2) : direntType;
    if (y === null) continue;
    if (y.isDirectory()) {
      let S = await claimAliasDir(walkState, dir_2, visited);
      if (S !== null)
        files.push(
          ...(await walkAliasOnlyDir(walkState, dir_2, [...segments, u.name], new Set([...visited, S]))),
        );
    } else if (y.isFile() && (p || extname(u.name).toLowerCase() === MD_EXTENSION))
      files.push({
        path: dir_2,
        lexicalRel: joined.normalize("NFC"),
        rawLexicalRel: joined,
        viaSymlink: p,
        aliasOnly: true,
      });
  }
  return files;
}
//@ chunk-axmbhcjg.js:17679-18043 placement
/**
 * 尝试认领一个别名（符号链接）目录：读不出、越界或已见过时放弃，不是可同步的工作文件时跳过，受别名预算限制。
 */
async function claimAliasDir(walkState, n, visited) {
  let o;
  try {
    o = await realpathStrict(n);
  } catch {
    walkState.giveUp ??= "alias_unreadable";
    return null;
  }
  let i = relative(walkState.realConfigHome, o);
  if (isOutsideConfigHome(walkState, o)) {
    walkState.giveUp ??= "alias_unreadable";
    return null;
  }
  if (visited.has(o) || isParentOrAbsolute(i)) return null;
  let s = `${toPosixNfcPath(i, sep)}/x.md`;
  if (classifyWorkingFile(s) === null && !isSyncableMarkdownPath(s)) return null;
  if (walkState.aliasBudget.left <= 0) {
    walkState.giveUp ??= "too_many_links";
    return null;
  }
  walkState.aliasBudget.left -= 1;
  return o;
}
//@ chunk-axmbhcjg.js:18043-18280 placement
async function resolveDirentType(e, n, r) {
  if (
    r.isSymbolicLink() ||
    r.isFile() ||
    r.isDirectory() ||
    r.isFIFO() ||
    r.isSocket() ||
    r.isCharacterDevice() ||
    r.isBlockDevice()
  )
    return r;
  try {
    return await lstat(n);
  } catch (error) {
    if (!isMissingPathError(error)) e.giveUp ??= "alias_unreadable";
    return null;
  }
}
//@ chunk-axmbhcjg.js:18280-18476 placement
async function statFollowingSafeLinks(e, n) {
  let r;
  try {
    r = await isRiskyLinkChain(n);
  } catch {
    e.giveUp ??= "alias_unreadable";
    return null;
  }
  if (r) return null;
  try {
    return await stat(n);
  } catch (error) {
    if (!isMissingPathError(error)) e.giveUp ??= "alias_unreadable";
    return null;
  }
}
//@ chunk-axmbhcjg.js:18476-18535 placement
/**
 * 按名字排序的比较函数。
 */
function compareByName(e, n) {
  return e.name < n.name ? -1 : e.name > n.name ? 1 : 0;
}
//@ chunk-axmbhcjg.js:18535-18587 placement
/**
 * 在已见位置表里登记（已有记录时不覆盖）。
 */
function rememberLocation(e, realPath, r) {
  if (r !== null || !e.has(realPath)) e.set(realPath, r);
}
//@ chunk-axmbhcjg.js:18587-19522 placement
/**
 * 判定一个清点文件：别名只做敏感归属；无法解析或越界记为未发送；不是可同步目的地时记为不发送或拒绝；已见过的文件归属；否则返回候选条目。
 */
async function classifyInventoryFile(e, n, r, o, i, s) {
  let location = await locateInConfigHome(e, r.path, r.lexicalRel, r.rawLexicalRel);
  if (r.aliasOnly) {
    if (location === "unresolvable") e.giveUp ??= "alias_unreadable";
    else if (location !== "outside") {
      let sensitivePath = resolveSensitivePath(e, n, location, r.lexicalRel);
      if (sensitivePath !== null) rememberLocation(s, location.realPath, sensitivePath);
    }
    return {
      kind: "attributed",
    };
  }
  if (location === "unresolvable") {
    if (r.viaSymlink) e.giveUp ??= "alias_unreadable";
    return refusedLeftBehind(r, r.viaSymlink ? "symlink_not_sent" : "unreadable");
  }
  if (location === "outside") return refusedLeftBehind(r, "symlink_not_sent");
  let destRel = r.viaSymlink ? location.rel : r.lexicalRel;
  let destination = workingFileDestination(destRel);
  if (destination === null) {
    let m = r.viaSymlink ? resolveSensitivePath(e, n, location, r.lexicalRel) : null;
    if (!r.viaSymlink || m !== null) rememberLocation(s, location.realPath, m);
    if (i.has(location.realPath))
      return {
        kind: "attributed",
      };
    i.add(location.realPath);
    return m === null
      ? refusedLeftBehind(r, r.viaSymlink ? "symlink_not_sent" : "not_destination")
      : {
          kind: "refused",
          left: m,
        };
  }
  if (o.has(location.realPath)) {
    let sensitivePath = resolveSensitivePath(e, n, location, r.lexicalRel);
    if (sensitivePath !== null) rememberLocation(s, location.realPath, sensitivePath);
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
//@ chunk-axmbhcjg.js:19522-19596 placement
/**
 * 构造“未发送”条目（路径 + 原因）。
 */
function refusedLeftBehind(e, reason) {
  return {
    kind: "refused",
    left: {
      path: e.lexicalRel,
      reason,
    },
  };
}
//@ chunk-axmbhcjg.js:19596-19692 placement
/**
 * 把候选放入目的地持有表（重复时返回 null）。
 */
function holdDestination(e, candidate) {
  let r = normalizedPath(candidate.destination);
  if (e.held.has(r)) return null;
  e.held.set(r, candidate);
  return candidate;
}
//@ chunk-axmbhcjg.js:19692-20306 placement
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
      for (let E of imports) await attributeAtReferences(ctx, classify, E, seen);
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
//@ chunk-axmbhcjg.js:20306-20370 placement
/**
 * 生成 glob 作用域的键（排序后的 JSON）。
 */
function scopeKey(e) {
  return e.globs === undefined ? "" : jsonStringify(e.globs.toSorted());
}
//@ chunk-axmbhcjg.js:20370-22323 placement
/**
 * 解析候选文件的 include 链：每个被引用文件在目的地范围内、非敏感、作用域一致时作为内联 import，输出样式单独记录经由关系；其他按原因（越界、敏感、非目的地、include 未发送）记入未发送列表。
 */
async function resolveCandidateImports(
  ctx,
  classify,
  candidate,
  imports,
  destinations,
  claimed,
  budget,
  output,
  withheld,
) {
  let m = [];
  let found = imports.find((h) => h.parent === undefined);
  let filtered = imports.filter((h) => h !== found);
  let styleRealByInclude = new Map();
  let makeHolder = (h, g) => ({
    candidate: h,
    isStyle: h.kind === "output_style",
    withheld:
      getSensitivePathReason(ctx, classify, h.location) !== null || withheld.get(h.location.realPath) != null,
    scope: scopeKey(g),
  });
  let holderByPath = new Map(found === undefined ? [] : [[found.path, makeHolder(candidate, found)]]);
  let leftIndexByReal = new Map();
  let addLeft = (h, g) => {
    if (!budget.has(h)) {
      budget.add(h);
      leftIndexByReal.set(h, m.push(g) - 1);
    }
  };
  let setLeft = (realPath, g) => {
    let C = leftIndexByReal.get(realPath);
    if (C === undefined) addLeft(realPath, g);
    else m[C] = g;
  };
  for (let h of imports) await attributeAtReferences(ctx, classify, h, withheld);
  for (let h of filtered) {
    let g = holderByPath.get(h.parent ?? "");
    if (g === undefined) continue;
    let C = relativeToConfigHome(ctx, h.path);
    let w = await locateInConfigHome(ctx, h.path, C?.rel ?? null, C?.raw ?? null);
    if (w === "outside" || w === "unresolvable") {
      addLeft(h.path, {
        path: C?.rel ?? h.path,
        reason: "include_not_sent",
      });
      continue;
    }
    if (claimed.has(w.realPath) || withheld.has(w.realPath)) {
      let A = withheld.get(w.realPath) ?? resolveSensitivePath(ctx, classify, w, w.lexicalRel);
      if (A !== null) {
        rememberLocation(withheld, w.realPath, A);
        setLeft(w.realPath, A);
      }
      continue;
    }
    let R = workingFileDestination(w.rel);
    if (R !== null) {
      let A = holdDestination(destinations, {
        ...R,
        location: w,
        imports: [],
        styleVia: new Map(),
      });
      if (A === null) {
        addLeft(w.realPath, {
          path: w.lexicalRel,
          reason: "not_destination",
        });
        continue;
      }
      claimed.add(w.realPath);
      if (A.kind === "output_style") {
        styleRealByInclude.set(h.path, w.realPath);
        let v = h.parent === undefined ? undefined : styleRealByInclude.get(h.parent);
        if (v !== undefined) g.candidate.styleVia.set(w.realPath, v);
        if (!g.withheld && !g.isStyle && g.scope === scopeKey(h))
          g.candidate.imports.push({
            location: w,
            via: v ?? null,
            asStyle: true,
          });
      }
      holderByPath.set(
        h.path,
        A.kind === "output_style"
          ? {
              ...g,
              withheld: g.withheld || getSensitivePathReason(ctx, classify, A.location) !== null,
            }
          : makeHolder(A, h),
      );
      continue;
    }
    if (g.withheld) continue;
    let all = uniq([w.rel, w.lexicalRel, ...w.rawRels]).every(isSyncableMarkdownPath);
    let U = all ? resolveSensitivePath(ctx, classify, w, w.lexicalRel) : null;
    let reason = U?.reason ?? null;
    let V = isRulesOrOutputStylePath(w.rel) && extname(w.rel).toLowerCase() === MD_EXTENSION;
    if (U !== null || V) rememberLocation(withheld, w.realPath, U);
    if (!all || reason !== null) {
      addLeft(w.realPath, {
        path: w.lexicalRel,
        reason: reason ?? (V ? "not_destination" : "include_not_sent"),
      });
      continue;
    }
    if (g.isStyle || g.scope !== scopeKey(h)) {
      output.set(w.realPath, {
        path: w.lexicalRel,
        reason: "include_not_sent",
      });
      continue;
    }
    g.candidate.imports.push({
      location: w,
      via: h.parent === undefined ? null : (styleRealByInclude.get(h.parent) ?? null),
    });
    styleRealByInclude.set(h.path, w.realPath);
    claimed.add(w.realPath);
    holderByPath.set(h.path, g);
  }
  return m;
}
//@ chunk-axmbhcjg.js:22323-23412 placement
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
      let gitRel = normalizeGitPaths(ctx.configHome, expanded);
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
//@ chunk-axmbhcjg.js:23412-23526 placement
async function isMissingReference(expanded) {
  if ((isUncOrDevicePath(expanded) && !isWslUncPath(expanded)) || isNetworkMountPath(expanded)) return true;
  try {
    await realpathStrict(expanded);
    return false;
  } catch (error) {
    return isMissingPathError(error) && (await missingOrUnreadable(expanded));
  }
}
//@ chunk-axmbhcjg.js:23526-23906 placement
/**
 * 收集候选文件中被拒绝的项：拒绝项直接记录，非 output style 的符号链接与无目标位置的候选记为不发送，其余登记真实路径。
 */
async function collectOutputStyleCandidates(
  walkState,
  pathFilter,
  files,
  heldCandidates,
  attributed,
  seenReal,
  sensitiveByPath,
) {
  let d = [];
  for (let f of files) {
    let m = await classifyInventoryFile(walkState, pathFilter, f, attributed, seenReal, sensitiveByPath);
    if (m.kind === "refused") d.push(m.left);
    else if (m.kind === "candidate")
      if (m.candidate.kind !== "output_style")
        d.push({
          path: f.lexicalRel,
          reason: "symlink_not_sent",
        });
      else if (holdDestination(heldCandidates, m.candidate) === null)
        d.push({
          path: f.lexicalRel,
          reason: "not_destination",
        });
      else attributed.add(m.candidate.location.realPath);
  }
  return d;
}
//@ chunk-axmbhcjg.js:24585-26856 placement
/**
 * 生成一个清点条目：检查敏感、可读与大小，凭证内容拒发；非输出样式先去引用化，再按上限依次内联 import（跳过敏感、未闭合块、含链接、超限或含凭证的），必要时对合并结果再去引用；返回 {entry, foldedIncludes, leftBehind}。
 */
async function buildInventoryEntry(walkState, pathFilter, r, sensitiveByPath, failedReal, seenReal) {
  let sensitive = resolveSensitivePath(walkState, pathFilter, r.location, r.destination);
  let knownSensitive = sensitiveByPath.get(r.location.realPath) ?? null;
  if (sensitive !== null) return buildWithheldEntry(r, sensitive.reason, seenReal, sensitive.path);
  if (knownSensitive !== null)
    return buildWithheldEntry(r, knownSensitive.reason, seenReal, knownSensitive.path);
  if (!(await isStillAtRealPath(walkState, r.location))) return buildWithheldEntry(r, "unreadable", seenReal);
  let read = await readNativeWorkingFile(walkState, r.location);
  if (read.kind === "skip")
    return buildWithheldEntry(r, mapSkipReasonToLeftBehind(read.skipped.reason), seenReal);
  if (read.content.length > MAX_WORKING_FILE_BYTES_2_2) return buildWithheldEntry(r, "over_cap", seenReal);
  let str = read.content.toString("utf8");
  if (looksLikeCredentialIncludingNul(str)) {
    let withheldEntry = buildWithheldEntry(r, "credential", seenReal);
    return {
      ...withheldEntry,
      leftBehind: withheldEntry.leftBehind.map((M) =>
        M.reason === "credential"
          ? {
              ...M,
              ...matchKey(str, 0),
            }
          : M,
      ),
    };
  }
  let defused =
    r.kind === "output_style"
      ? {
          content: read.content,
          defusedPaths: [],
        }
      : defuseIncludes(r.destination, read.content, r.imports.length > 0);
  let parts = [defused.content];
  let folded = [];
  let foldedIncludes = [];
  let totalBytes = defused.content.length;
  let leftBehind = [];
  let parentOpenBlock =
    r.imports.length > 0 && endsInsideOpenBlock(splitFrontmatter(defused.content.toString("utf8")).body);
  let excludedReal = new Set(failedReal);
  for (let { location, via, asStyle } of r.imports) {
    let N = (Qt) => {
      if (!asStyle) leftBehind.push(Qt);
    };
    let sensitivePath = resolveSensitivePath(walkState, pathFilter, location, location.lexicalRel);
    if (
      sensitivePath !== null ||
      sensitiveByPath.has(location.realPath) ||
      excludedReal.has(location.realPath) ||
      (via !== null && isViaExcluded(via, excludedReal, r.styleVia)) ||
      parentOpenBlock
    ) {
      excludedReal.add(location.realPath);
      if (!seenReal.has(location.realPath)) {
        seenReal.add(location.realPath);
        N(
          sensitivePath ??
            sensitiveByPath.get(location.realPath) ?? {
              path: location.lexicalRel,
              reason: "include_not_sent",
            },
        );
      }
      continue;
    }
    let A = (await isStillAtRealPath(walkState, location))
      ? await readNativeWorkingFile(walkState, location)
      : null;
    if (A === null || A.kind === "skip") {
      excludedReal.add(location.realPath);
      N({
        path: location.lexicalRel,
        reason: "include_not_sent",
      });
      continue;
    }
    let { head, body } = splitFrontmatter(A.content.toString("utf8"));
    if (endsInsideOpenBlock(body) || hasMarkdownLinks(body)) {
      excludedReal.add(location.realPath);
      N({
        path: location.lexicalRel,
        reason: "include_not_sent",
      });
      continue;
    }
    let buffer = Buffer.from(inlinedImportMarker(location.rel) + escapeUnvettedIncludes(body));
    if (totalBytes + buffer.length > MAX_WORKING_FILE_BYTES_2_2) {
      excludedReal.add(location.realPath);
      N({
        path: location.lexicalRel,
        reason: "over_cap",
      });
      continue;
    }
    if (looksLikeCredentialIncludingNul(body)) {
      excludedReal.add(location.realPath);
      N({
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
    r.kind !== "output_style" && parts.length > 1 && hasNewIncludes(defused.content, buffer, r.destination)
      ? escapeAllIncludes(buffer)
      : buffer;
  if (r.kind !== "output_style" && content !== buffer && hasUnvettedIncludeIn(content, allowAllIncludes))
    return buildWithheldEntry(r, "undefusable", seenReal);
  if (!content.equals(read.content) && looksLikeCredentialIncludingNul(content.toString("utf8"))) {
    let withheldEntry = buildWithheldEntry(r, "credential", seenReal);
    let M = new Set(leftBehind.map((U) => U.path));
    return {
      ...withheldEntry,
      leftBehind: [...withheldEntry.leftBehind.filter((U) => !M.has(U.path)), ...leftBehind],
    };
  }
  let C = new Set(folded);
  let defusedCount = count(
    defused.defusedPaths,
    (R) => !C.has(posix.normalize(posix.join(posix.dirname(r.destination), R)).normalize("NFC")),
  );
  return {
    entry: {
      path: r.destination,
      kind: r.kind,
      content,
      sha256: computeContentHash(content),
      folded,
      defused: defusedCount,
    },
    foldedIncludes,
    leftBehind,
  };
}
//@ chunk-axmbhcjg.js:26856-27439 placement
/**
 * 对记忆文件正文中指向非目的地的 @include 加反斜杠去引用（保留 frontmatter 与 BOM）；结果仍可能引用时退回到整体转义 @。
 */
function defuseIncludes(destination, content, r) {
  let isDestination = (x) => isDestinationInclude(destination, x);
  let replaced = content.toString("utf8").replace(
    /\r\n?/g,
    `
`,
  );
  let split = splitFrontmatter(replaced);
  let head = split.head;
  let bom = head !== "" && replaced.startsWith("\uFEFF") ? "\uFEFF" : "";
  let leadingNewline =
    r && head === "" && /^\uFEFF?---\s*\n/.test(replaced)
      ? `
`
      : "";
  let headPart = leadingNewline + bom + head;
  let body = split.body;
  let y = [];
  let defusedBody = escapeUnvettedIncludes(body, isDestination, y);
  let result =
    defusedBody === body && leadingNewline === ""
      ? {
          content,
          defusedPaths: [],
        }
      : {
          content: Buffer.from(headPart + defusedBody),
          defusedPaths: y,
        };
  if (
    result.content !== content &&
    (splitFrontmatter(content.toString("utf8")).head === "") !== (head === "")
  )
    return {
      content: Buffer.from(escapeAtSigns(replaced)),
      defusedPaths: defusedIncludes(body, isDestination),
    };
  if (!hasUnvettedIncludeIn(result.content, isDestination)) return result;
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
//@ chunk-axmbhcjg.js:27439-27522 placement
/**
 * 找出所有未受审查的 @ 引用写法。
 */
function defusedIncludes(body, isDestination) {
  let atReferenceSpellings = collectAtReferenceSpellings(body, body);
  return atReferenceSpellings.vettable
    ? atReferenceSpellings.spellings.filter((spelling) => !isDestination(spelling))
    : [];
}
//@ chunk-axmbhcjg.js:27522-27650 placement
function hasNewIncludes(content, n, destination) {
  let o = (u) => isDestinationInclude(destination, u);
  let i = (u) => extractIncludePathsFromText(splitFrontmatter(u.toString("utf8")).body);
  let s = i(n);
  return s.some((u) => !o(u)) || count(s, o) > count(i(content), o);
}
//@ chunk-axmbhcjg.js:27650-27819 placement
function escapeAllIncludes(e) {
  let str = e.toString("utf8");
  let { head, body } = splitFrontmatter(str);
  let i = head !== "" && str.startsWith("\uFEFF") ? "\uFEFF" : "";
  let buffer = Buffer.from(i + head + escapeAtSigns(body));
  return hasUnvettedIncludeIn(buffer, allowAllIncludes) ? Buffer.from(escapeAtSigns(str)) : buffer;
}
//@ chunk-axmbhcjg.js:27819-27877 placement
/**
 * 判断内容体里是否有未受审查的 @include。
 */
function hasUnvettedIncludeIn(content, allowAllIncludes) {
  return hasUnvettedInclude(splitFrontmatter(content.toString("utf8")).body, allowAllIncludes);
}
//@ chunk-axmbhcjg.js:27877-28019 placement
function splitFrontmatter(e) {
  let n = e.startsWith("\uFEFF") ? e.slice(1) : e;
  let r = FRONTMATTER_REGEX.exec(n)?.[0];
  return r === undefined
    ? {
        head: "",
        body: e,
      }
    : {
        head: r,
        body: n.slice(r.length),
      };
}
//@ chunk-axmbhcjg.js:28019-28199 placement
function isDestinationInclude(e, n) {
  if (n.startsWith("/") || n.startsWith("~")) return false;
  let normalized = posix.normalize(posix.join(posix.dirname(e), n));
  let o = normalized.startsWith("../") ? null : classifyWorkingFile(normalized);
  return o === "claude_md" || o === "rule";
}
//@ chunk-axmbhcjg.js:28199-28317 placement
function isViaExcluded(e, excludedReal, styleVia) {
  let o = new Set();
  for (let i = e; i !== undefined && !o.has(i); i = styleVia.get(i)) {
    if (excludedReal.has(i)) return true;
    o.add(i);
  }
  return false;
}
//@ chunk-axmbhcjg.js:28317-28422 placement
async function isStillAtRealPath(e, location) {
  try {
    return (await realpathStrict(join(e.realConfigHome, location.nativeRel))) === location.realPath;
  } catch {
    return false;
  }
}
export { getAliasSpellings, MAX_INCLUDE_DEPTH, MAX_INCLUDE_READS, buildHomeInventory };
