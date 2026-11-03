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
import {
  realpath,
  realpath as realpath_2,
  readlink,
  lstat,
  lstat as lstat_2,
  stat,
  readdir,
  readdir as readdir_2,
} from "fs/promises";
import {
  relative,
  relative as relative_2,
  relative as relative_3,
  sep,
  sep as sep_2,
  sep as sep_3,
  extname,
  resolve,
  dirname,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  posix,
} from "path";
import { isDiskless } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { applyRemoteEntriesToLocal } from "../settingsSync/index.js";
import { normalizePathForCompare } from "../../utils/file.js";
import { isInstructionsMemoryType_3, MAX_INCLUDE_DEPTH } from "../../utils/claudemd.js";
import { rc, Qn } from "../../utils/pathClassification.js";
import {
  safeResolvePath,
  getFsImplementation,
  hasUntouchableRecordSpelling,
} from "../../utils/fsOperations.js";
import { j, toPosixNfcPath, MD_EXTENSION, PATH_SEPARATOR_RE } from "../../utils/posixPaths.js";
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
  Kyt,
  wln,
  uue,
  hasMarkdownLinks,
  escapeUnvettedIncludes,
  oe,
} from "./workingFiles.js";
import { getErrnoCode } from "../../utils/errors.js";
import { ai, isWslUncPath, Ya } from "../../utils/networkPaths.js";
import { isSettingsToCloudEnabled } from "../analytics/violinGates.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import {
  isClaudeMdLoadingDisabled,
  isCustomizationDisabled,
} from "../../utils/settings/customizationDisabled.js";
import { X0 } from "../../utils/abortSignalUtils.js";
import { capInventoryEntries } from "./homePack.js";
import { resolveSensitivePath, getSensitivePathReason } from "../../utils/permissions/filesystem.js";
import { Ue, buildWithheldEntry, mapSkipReasonToLeftBehind } from "./hookAndSettingsInventory.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  collectAtReferenceSpellings,
  endsInsideOpenBlock,
  mt,
  escapeAtSigns,
  extractIncludePathsFromText,
  hasUnvettedInclude,
} from "../../utils/claudemdIncludes.js";
import { expandPath } from "../../utils/path.js";
import { normalizeGitPaths } from "../../hooks/fileSuggestions.js";
import { hor } from "../../utils/permissions/sensitivePaths.js";
import { AAe } from "./portableSettings.js";
import { matchKey } from "../../components/GlobalSearchDialog.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { FRONTMATTER_REGEX } from "../../utils/frontmatterParser.js";

//@ chunk-axmbhcjg.js:7915-7933 placement
var gt = 4096,
  pe = !0;
/**
 * 从配置目录出发收集用户记忆文件及其 @include 链（按类型+路径去重，读取次数超上限返回 null）；无磁盘会话直接返回 null。
 */
//@ chunk-axmbhcjg.js:7933-8417 placement
async function collectMemoryIncludeTree(e, n) {
  if (isDiskless())
    return (
      logForDebugging("home inventory: memory files not read in a diskless session; nothing is sent"),
      null
    );
  let r = { reads: 0 },
    o = await applyRemoteEntriesToLocal(e, r, n);
  if (o === null) return null;
  let i = new Map();
  for (let s = o.pop(); s !== void 0; s = o.pop()) {
    let u = `${s.type}\x00${normalizePathForCompare(s.path)}`;
    if (i.has(u)) continue;
    if (n?.aborted) return null;
    i.set(u, s);
    let d = await isInstructionsMemoryType_3(s.path, s.type, new Set(), pe, MAX_INCLUDE_DEPTH - 2);
    if (((r.reads += d.length), r.reads > gt)) return null;
    o.push(...d.filter((f) => f.path !== s.path));
  }
  return [...i.values()];
}
//@ chunk-axmbhcjg.js:9323-9427 placement
async function realpathStrict(e) {
  if (rc(e)) throw Error("realpath would misread a backslash in the path");
  return realpath(e);
}
//@ chunk-axmbhcjg.js:9427-9511 placement
function yt(e) {
  return rc(e)
    ? { resolvedPath: e, isSymlink: !1, isCanonical: !1 }
    : safeResolvePath(getFsImplementation(), e);
}
//@ chunk-axmbhcjg.js:9511-9523 placement
var An = 4096;
//@ chunk-axmbhcjg.js:9523-9765 placement
async function locateInConfigHome(e, n, r, o) {
  let i;
  try {
    i = await realpathStrict(n);
  } catch {
    return "unresolvable";
  }
  let s = relative(e.realConfigHome, i);
  if (s === "" || j(s)) return "outside";
  let u = toPosixNfcPath(s, sep);
  return {
    realPath: i,
    nativeRel: s,
    rel: u,
    lexicalRel: r ?? u,
    rawRels: uniq([Pt(s), ...(o === null ? [] : [o])]),
  };
}
//@ chunk-axmbhcjg.js:9765-9867 placement
async function isOutsideOrUnresolvable(e, n) {
  try {
    let r = await realpathStrict(n);
    return ye(e, r) || !j(relative(e.realConfigHome, r));
  } catch {
    return !0;
  }
}
//@ chunk-axmbhcjg.js:9867-9916 placement
function ye(e, n) {
  return !j(relative(n, e.realConfigHome));
}
//@ chunk-axmbhcjg.js:9916-9969 placement
function Pt(e) {
  return sep === "/" ? e : e.split(sep).join("/");
}
//@ chunk-axmbhcjg.js:9969-10113 placement
function relativeToConfigHome(e, n) {
  let found = [e.configHome, e.realConfigHome].map((o) => relative(o, n)).find((o) => o !== "" && !j(o));
  return found === void 0 ? null : { rel: toPosixNfcPath(found, sep), raw: Pt(found) };
}
//@ chunk-axmbhcjg.js:10113-10286 placement
function isSyncableMarkdownPath(e) {
  let n = foldName(firstLineOf(e, "/"));
  return (
    isWellFormedString(e) &&
    e.includes("/") &&
    extname(e).toLowerCase() === MD_EXTENSION &&
    !shouldIgnore(e) &&
    !Un.test(e) &&
    !DIR_SYNC_EXCLUDED_DIRS.has(n) &&
    !n.startsWith("agent-memory") &&
    !getThinkbackSkillDir(e) &&
    !Et(e)
  );
}
//@ chunk-axmbhcjg.js:10286-10353 placement
function Et(e) {
  let n = foldName(firstLineOf(e, "/"));
  return n === foldName(RULES) || n === foldName(OUTPUT_STYLES);
}
//@ chunk-axmbhcjg.js:10434-10453 placement
var Un = /~\d/,
  Bn = 32;
/**
 * 沿符号链接链逐跳检查（有跳数上限）：遇到循环返回 false；链接文本非 UTF-8、先进入目录再向上越级、或指向不可触碰的拼写时视为有风险。
 */
//@ chunk-axmbhcjg.js:10453-11003 placement
async function isRiskyLinkChain(e) {
  let current = e,
    visited = new Set();
  for (let o = 0; o < Bn; o += 1) {
    if (visited.has(current)) return !1;
    visited.add(current);
    let linkBody;
    try {
      linkBody = await readlink(current);
    } catch (error) {
      return St(error);
    }
    if (linkBody.includes("\uFFFD")) throw Error("link body is not valid UTF-8");
    let target;
    try {
      target = resolve(await realpathStrict(dirname(current)), linkBody);
    } catch (error) {
      if (getErrnoCode(error) === "ENAMETOOLONG") throw error;
      return St(error);
    }
    if (linkClimbsAfterEntering(linkBody)) throw Error("link body climbs out of a directory it entered");
    if (ai(linkBody) || hasUntouchableRecordSpelling(target)) return !0;
    try {
      if (!(await lstat(target)).isSymbolicLink()) return !1;
    } catch (error) {
      if (!B(error) || (getErrnoCode(error) === "ENAMETOOLONG" && !Dn(linkBody))) throw error;
      return !1;
    }
    current = target;
  }
  throw Error("link chain too long to vet");
}
//@ chunk-axmbhcjg.js:11003-11060 placement
function St(e) {
  if (B(e) || getErrnoCode(e) === "EINVAL") return !0;
  throw e;
}
//@ chunk-axmbhcjg.js:11060-11153 placement
function B(e) {
  let n = getErrnoCode(e);
  return n === "ENOENT" || n === "ENOTDIR" || n === "ELOOP" || n === "ENAMETOOLONG";
}
//@ chunk-axmbhcjg.js:11153-11221 placement
function Dn(e) {
  return e.split(/[\\/]/).some((n) => [...n].length > 255);
}
//@ chunk-axmbhcjg.js:11221-11290 placement
async function Ft(e) {
  try {
    return (await stat(e), !1);
  } catch (error) {
    return B(error);
  }
}
//@ chunk-axmbhcjg.js:11290-11372 placement
async function Nn(e) {
  try {
    return !(await stat(e)).isDirectory();
  } catch (error) {
    return B(error);
  }
}
//@ chunk-axmbhcjg.js:11372-11486 placement
function linkClimbsAfterEntering(e) {
  let n = !1;
  for (let r of e.split(PATH_SEPARATOR_RE))
    if (r === "..") {
      if (n) return !0;
    } else if (r !== "" && r !== ".") n = !0;
  return !1;
}
//@ chunk-axmbhcjg.js:11486-11518 placement
var ue = { ok: !1, reason: "aborted" };
/**
 * 清点本机 ~/.claude 中要发往云会话的内容（CLAUDE.md、rules、output-styles 及其 @include）：检查开关与用户设置可发送性，处理顶层符号链接别名、敏感/拒读路径，按上限保留条目，返回 {entries, summary, leftBehind} 或失败原因。
 */
//@ chunk-axmbhcjg.js:11518-13602 placement
async function buildHomeInventory({
  configHome: configHome,
  isUserSettingsFileSendable: isUserSettingsFileSendable,
  readRules: readRules,
  createFilter: createFilter,
  signal: signal,
  aliasDirectories: aliasDirectories = An,
  settingsToCloud: settingsToCloud = isSettingsToCloudEnabled,
}) {
  if (isDiskless()) return { ok: !1, reason: "diskless" };
  if (!(await settingsToCloud().catch(() => !1))) return { ok: !1, reason: "flag_off" };
  try {
    if (!isUserSettingsFileSendable || !readRules.complete) return emptyInventory({ rulesUnreadable: !0 });
    if (!isSettingSourceEnabled("userSettings")) return emptyInventory({ rulesUnreadable: !1 });
    let realConfigHome;
    try {
      realConfigHome = await realpathStrict(configHome);
    } catch (error) {
      if (B(error) && (await Ft(configHome))) return emptyInventory({ rulesUnreadable: !1 });
      return { ok: !1, reason: "alias_unreadable" };
    }
    let walkState = {
      configHome: configHome,
      realConfigHome: realConfigHome,
      aliasBudget: { left: aliasDirectories },
      giveUp: null,
      topLevelLinks: [],
    };
    walkState.topLevelLinks = await listTopLevelLinks(walkState);
    let pathFilter = createFilter(configHome, { realRoot: realConfigHome, readRules: readRules }),
      heldCandidates = { held: new Map() },
      attributed = new Set(),
      seenReal = new Set(),
      refusedByPath = new Map(),
      sensitiveByPath = new Map(),
      memoryFiles = isClaudeMdLoadingDisabled()
        ? { files: [], leftBehind: [] }
        : await listMemoryFiles(walkState);
    if (walkState.giveUp === null) {
      let v = await collectMemoryIncludeTree(configHome, signal);
      if (X0(signal)) return ue;
      if (v === null) return { ok: !1, reason: "too_many_links" };
      for (let T of v) {
        if (X0(signal)) return ue;
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
    if (memoryLeftBehind === null) return ue;
    let styleFiles = isCustomizationDisabled("outputStyles")
        ? { files: [], leftBehind: [] }
        : await listDirFiles(walkState, OUTPUT_STYLES),
      styleLeftBehind = await collectOutputStyleCandidates(
        walkState,
        pathFilter,
        styleFiles.files,
        heldCandidates,
        attributed,
        seenReal,
        sensitiveByPath,
      );
    if (walkState.giveUp !== null) return { ok: !1, reason: walkState.giveUp };
    let held = [...heldCandidates.held.values()],
      failedReal = new Set(),
      resultByCandidate = new Map();
    for (let v of [
      ...held.filter((T) => T.kind === "output_style"),
      ...held.filter((T) => T.kind !== "output_style"),
    ]) {
      if (X0(signal)) return ue;
      let T = await buildInventoryEntry(walkState, pathFilter, v, sensitiveByPath, failedReal, seenReal);
      if (T.entry === null) failedReal.add(v.location.realPath);
      resultByCandidate.set(v, T);
    }
    let flattened = held.flatMap((v) => resultByCandidate.get(v) ?? []),
      { kept: kept, droppedOverCap: droppedOverCap } = capInventoryEntries(
        flattened
          .flatMap(({ entry: entry, foldedIncludes: foldedIncludes }) =>
            entry === null ? [] : [{ content: entry.content, entry: entry, foldedIncludes: foldedIncludes }],
          )
          .toSorted((v, T) => compareInventoryEntries(v.entry, T.entry)),
      ),
      mapped = [...refusedByPath]
        .filter(([v]) => !attributed.has(v) && !seenReal.has(v))
        .map(([v, T]) => sensitiveByPath.get(v) ?? T),
      leftBehind = [
        ...memoryFiles.leftBehind,
        ...memoryLeftBehind,
        ...mapped,
        ...styleFiles.leftBehind,
        ...styleLeftBehind,
        ...flattened.flatMap((v) => v.leftBehind),
        ...droppedOverCap.flatMap(({ entry: entry, foldedIncludes: foldedIncludes }) => [
          { path: entry.path, reason: "over_cap" },
          ...foldedIncludes.map((ae) => ({ path: ae, reason: "include_not_sent" })),
        ]),
      ],
      mapped_2 = kept.map(({ entry: entry }) => entry);
    return {
      ok: !0,
      inventory: {
        entries: mapped_2,
        summary: summarizeInventory(mapped_2, leftBehind),
        leftBehind: leftBehind,
      },
    };
  } catch (error) {
    if (X0(signal)) return ue;
    return (
      logForDebugging(
        `home inventory: gave the run up \u2014 ${error instanceof Error ? error.message : String(error)}`,
      ),
      { ok: !1, reason: "alias_unreadable" }
    );
  }
}
//@ chunk-axmbhcjg.js:13602-13727 placement
function emptyInventory({ rulesUnreadable: rulesUnreadable }) {
  return {
    ok: !0,
    inventory: {
      entries: [],
      summary: { ...summarizeInventory([], []), rulesUnreadable: rulesUnreadable },
      leftBehind: [],
    },
  };
}
/**
 * 汇总清点结果：各类未发送原因的计数（敏感、拒读、include 未发送、符号链接、非目的地、不可读、超限、无法去引用）以及内联与去引用的 import 数。
 */
//@ chunk-axmbhcjg.js:13727-14145 placement
function summarizeInventory(e, n) {
  return {
    withheldSensitive: J(n, "sensitive"),
    withheldReadDenied: J(n, "read_denied"),
    rulesUnreadable: !1,
    includesNotSent: J(n, "include_not_sent"),
    symlinksNotSent: J(n, "symlink_not_sent"),
    notDestinations: J(n, "not_destination"),
    unreadable: J(n, "unreadable"),
    overCap: J(n, "over_cap"),
    undefusable: J(n, "undefusable"),
    inlinedImports: e.reduce((r, o) => r + o.folded.length, 0),
    defusedImports: e.reduce((r, o) => r + o.defused, 0),
  };
}
//@ chunk-axmbhcjg.js:14145-14191 placement
function J(e, n) {
  return count(e, (r) => r.reason === n);
}
//@ chunk-axmbhcjg.js:14191-14234 placement
var _t = { claude_md: 0, rule: 1, output_style: 2 };
//@ chunk-axmbhcjg.js:14234-14353 placement
function compareInventoryEntries(e, n) {
  return (
    _t[e.kind] - _t[n.kind] ||
    e.content.length - n.content.length ||
    (e.path < n.path ? -1 : e.path > n.path ? 1 : 0)
  );
}
/**
 * 列出 CLAUDE.md 与 rules 目录下的记忆文件；CLAUDE.md 是指向非文件的符号链接时记为 symlink_not_sent，指向目录且在配置目录内时放弃。
 */
//@ chunk-axmbhcjg.js:14353-14819 placement
async function listMemoryFiles(e) {
  let n = join(e.configHome, CLAUDE_MD),
    r = await lstatOrGiveUp(e, n),
    o = await listDirFiles(e, RULES);
  if (r === null) return o;
  let i = r.isSymlink ? await statFollowingSafeLinks(e, n) : void 0;
  if (i?.isDirectory() === !0 && (await isOutsideOrUnresolvable(e, n))) e.giveUp ??= "alias_unreadable";
  if (i === null || (i !== void 0 && !i.isFile()))
    return { files: o.files, leftBehind: [{ path: CLAUDE_MD, reason: "symlink_not_sent" }, ...o.leftBehind] };
  return {
    files: [
      { path: n, lexicalRel: CLAUDE_MD, rawLexicalRel: CLAUDE_MD, viaSymlink: r.isSymlink, aliasOnly: !1 },
      ...o.files,
    ],
    leftBehind: o.leftBehind,
  };
}
/**
 * 列出配置目录下某子目录（rules、output-styles）的文件；子目录是符号链接且不指向目录时只按别名处理。
 */
//@ chunk-axmbhcjg.js:14819-15184 placement
async function listDirFiles(e, n) {
  let r = join(e.configHome, n),
    o = await lstatOrGiveUp(e, r);
  if (o === null) return { files: [], leftBehind: [] };
  if (o.isSymlink) {
    let i = await statFollowingSafeLinks(e, r);
    if (i === null || !i.isDirectory())
      return {
        files:
          i !== null && i.isFile()
            ? [{ path: r, lexicalRel: n, rawLexicalRel: n, viaSymlink: !0, aliasOnly: !0 }]
            : [],
        leftBehind: [{ path: n, reason: "symlink_not_sent" }],
      };
  }
  return walkMarkdownDir(e, r, [n], o.isSymlink, new Set());
}
/**
 * 列出配置目录顶层指向目录内部的符号链接（名字与目标相对路径）；读不了或指向别的主机时放弃。
 */
//@ chunk-axmbhcjg.js:15184-15686 placement
async function listTopLevelLinks(ctx) {
  let entries;
  try {
    entries = await readdir(ctx.configHome, { withFileTypes: !0 });
  } catch (entry) {
    if (!B(entry)) ctx.giveUp ??= "alias_unreadable";
    return [];
  }
  let aliases = [];
  for (let o of entries) {
    let entryPath = join(ctx.configHome, o.name),
      stats = await resolveDirentType(ctx, entryPath, o);
    if (stats === null || !stats.isSymbolicLink()) continue;
    if ((await statFollowingSafeLinks(ctx, entryPath)) === null) continue;
    let target;
    try {
      target = await realpathStrict(entryPath);
    } catch {
      ctx.giveUp ??= "alias_unreadable";
      continue;
    }
    if (ye(ctx, target)) {
      ctx.giveUp ??= "alias_unreadable";
      continue;
    }
    let targetRel = relative(ctx.realConfigHome, target);
    if (!j(targetRel))
      aliases.push({ name: o.name.normalize("NFC"), targetRel: toPosixNfcPath(targetRel, sep) });
  }
  return aliases;
}
//@ chunk-axmbhcjg.js:15686-15826 placement
function getAliasSpellings(e, n) {
  return e.topLevelLinks.flatMap(({ name: r, targetRel: targetRel }) =>
    n === targetRel ? [r] : n.startsWith(`${targetRel}/`) ? [`${r}/${n.slice(targetRel.length + 1)}`] : [],
  );
}
//@ chunk-axmbhcjg.js:15826-15963 placement
async function lstatOrGiveUp(e, n) {
  try {
    return { isSymlink: (await lstat(n)).isSymbolicLink() };
  } catch (error) {
    if (!B(error)) e.giveUp ??= "alias_unreadable";
    return null;
  }
}
/**
 * 递归遍历目录收集 .md 文件（经符号链接进入的子树也记录），处理循环、越界与无法读取的情况，返回 {files, leftBehind}。
 */
//@ chunk-axmbhcjg.js:15963-17111 placement
async function walkMarkdownDir(walkState, dir, segments, viaSymlink, visitedReal) {
  let normalized = segments.join("/").normalize("NFC"),
    u = { files: [], leftBehind: [{ path: normalized, reason: "symlink_not_sent" }] },
    d;
  try {
    let p = await realpathStrict(dir);
    if (visitedReal.has(p))
      return { files: await walkAliasOnlyDir(walkState, dir, segments, new Set([p])), leftBehind: [] };
    let y = relative(walkState.realConfigHome, p);
    if (ye(walkState, p)) return ((walkState.giveUp ??= "alias_unreadable"), u);
    if (j(y)) return u;
    let S = `${toPosixNfcPath(y, sep)}/x.md`;
    if (viaSymlink && classifyWorkingFile(S) === null)
      return {
        files: isSyncableMarkdownPath(S)
          ? await walkAliasOnlyDir(walkState, dir, segments, new Set([p]))
          : [],
        leftBehind: u.leftBehind,
      };
    (visitedReal.add(p), (d = await readdir(dir, { withFileTypes: !0 })));
  } catch (error) {
    if (viaSymlink || !B(error) || !(await Nn(dir))) walkState.giveUp ??= "alias_unreadable";
    return { files: [], leftBehind: [] };
  }
  let files = [],
    leftBehind = [];
  for (let p of d.toSorted(Ct)) {
    let y = join(dir, p.name),
      joined = [...segments, p.name].join("/"),
      normalized = joined.normalize("NFC"),
      L = await resolveDirentType(walkState, y, p);
    if (L === null) continue;
    let isSymbolicLink = L.isSymbolicLink(),
      endsWith = p.name.endsWith(MD_EXTENSION),
      I = isSymbolicLink ? await statFollowingSafeLinks(walkState, y) : L;
    if (I === null) {
      if (extname(p.name).toLowerCase() === MD_EXTENSION)
        leftBehind.push({ path: normalized, reason: "symlink_not_sent" });
    } else if (I.isDirectory()) {
      let h = await walkMarkdownDir(
        walkState,
        y,
        [...segments, p.name],
        viaSymlink || isSymbolicLink,
        visitedReal,
      );
      (files.push(...h.files), leftBehind.push(...h.leftBehind));
    } else if (
      I.isFile() &&
      (endsWith || isSymbolicLink || (viaSymlink && extname(p.name).toLowerCase() === MD_EXTENSION))
    )
      files.push({
        path: y,
        lexicalRel: normalized,
        rawLexicalRel: joined,
        viaSymlink: viaSymlink || isSymbolicLink,
        aliasOnly: !endsWith,
      });
  }
  return { files: files, leftBehind: leftBehind };
}
/**
 * 遍历只作为别名出现的目录，收集其中的 .md 与符号链接文件（标记 aliasOnly），子目录按别名预算继续。
 */
//@ chunk-axmbhcjg.js:17111-17679 placement
async function walkAliasOnlyDir(walkState, dir, segments, visited) {
  let i;
  try {
    i = await readdir(dir, { withFileTypes: !0 });
  } catch {
    return ((walkState.giveUp ??= "alias_unreadable"), []);
  }
  let files = [];
  for (let u of i.toSorted(Ct)) {
    let d = join(dir, u.name),
      joined = [...segments, u.name].join("/"),
      m = await resolveDirentType(walkState, d, u);
    if (m === null) continue;
    let isSymbolicLink = m.isSymbolicLink(),
      y = isSymbolicLink ? await statFollowingSafeLinks(walkState, d) : m;
    if (y === null) continue;
    if (y.isDirectory()) {
      let S = await claimAliasDir(walkState, d, visited);
      if (S !== null)
        files.push(
          ...(await walkAliasOnlyDir(walkState, d, [...segments, u.name], new Set([...visited, S]))),
        );
    } else if (y.isFile() && (isSymbolicLink || extname(u.name).toLowerCase() === MD_EXTENSION))
      files.push({
        path: d,
        lexicalRel: joined.normalize("NFC"),
        rawLexicalRel: joined,
        viaSymlink: isSymbolicLink,
        aliasOnly: !0,
      });
  }
  return files;
}
/**
 * 尝试认领一个别名（符号链接）目录：读不出、越界或已见过时放弃，不是可同步的工作文件时跳过，受别名预算限制。
 */
//@ chunk-axmbhcjg.js:17679-18043 placement
async function claimAliasDir(e, n, r) {
  let o;
  try {
    o = await realpathStrict(n);
  } catch {
    return ((e.giveUp ??= "alias_unreadable"), null);
  }
  let i = relative(e.realConfigHome, o);
  if (ye(e, o)) return ((e.giveUp ??= "alias_unreadable"), null);
  if (r.has(o) || j(i)) return null;
  let s = `${toPosixNfcPath(i, sep)}/x.md`;
  if (classifyWorkingFile(s) === null && !isSyncableMarkdownPath(s)) return null;
  if (e.aliasBudget.left <= 0) return ((e.giveUp ??= "too_many_links"), null);
  return ((e.aliasBudget.left -= 1), o);
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
    if (!B(error)) e.giveUp ??= "alias_unreadable";
    return null;
  }
}
//@ chunk-axmbhcjg.js:18280-18476 placement
async function statFollowingSafeLinks(e, n) {
  let r;
  try {
    r = await isRiskyLinkChain(n);
  } catch {
    return ((e.giveUp ??= "alias_unreadable"), null);
  }
  if (r) return null;
  try {
    return await stat(n);
  } catch (error) {
    if (!B(error)) e.giveUp ??= "alias_unreadable";
    return null;
  }
}
//@ chunk-axmbhcjg.js:18476-18535 placement
function Ct(e, n) {
  return e.name < n.name ? -1 : e.name > n.name ? 1 : 0;
}
//@ chunk-axmbhcjg.js:18535-18587 placement
function Z(e, n, r) {
  if (r !== null || !e.has(n)) e.set(n, r);
}
/**
 * 判定一个清点文件：别名只做敏感归属；无法解析或越界记为未发送；不是可同步目的地时记为不发送或拒绝；已见过的文件归属；否则返回候选条目。
 */
//@ chunk-axmbhcjg.js:18587-19522 placement
async function classifyInventoryFile(e, n, r, o, i, s) {
  let location = await locateInConfigHome(e, r.path, r.lexicalRel, r.rawLexicalRel);
  if (r.aliasOnly) {
    if (location === "unresolvable") e.giveUp ??= "alias_unreadable";
    else if (location !== "outside") {
      let m = resolveSensitivePath(e, n, location, r.lexicalRel);
      if (m !== null) Z(s, location.realPath, m);
    }
    return { kind: "attributed" };
  }
  if (location === "unresolvable") {
    if (r.viaSymlink) e.giveUp ??= "alias_unreadable";
    return Ae(r, r.viaSymlink ? "symlink_not_sent" : "unreadable");
  }
  if (location === "outside") return Ae(r, "symlink_not_sent");
  let destRel = r.viaSymlink ? location.rel : r.lexicalRel,
    destination = Kyt(destRel);
  if (destination === null) {
    let m = r.viaSymlink ? resolveSensitivePath(e, n, location, r.lexicalRel) : null;
    if (!r.viaSymlink || m !== null) Z(s, location.realPath, m);
    if (i.has(location.realPath)) return { kind: "attributed" };
    return (
      i.add(location.realPath),
      m === null ? Ae(r, r.viaSymlink ? "symlink_not_sent" : "not_destination") : { kind: "refused", left: m }
    );
  }
  if (o.has(location.realPath)) {
    let m = resolveSensitivePath(e, n, location, r.lexicalRel);
    if (m !== null) Z(s, location.realPath, m);
    return { kind: "attributed" };
  }
  return {
    kind: "candidate",
    candidate: { ...destination, location: location, imports: [], styleVia: new Map() },
  };
}
//@ chunk-axmbhcjg.js:19522-19596 placement
function Ae(e, n) {
  return { kind: "refused", left: { path: e.lexicalRel, reason: n } };
}
//@ chunk-axmbhcjg.js:19596-19692 placement
function je(e, n) {
  let r = wln(n.destination);
  if (e.held.has(r)) return null;
  return (e.held.set(r, n), n);
}
/**
 * 对每个记忆文件求候选，读取其 include 树：无 include 时检查内容可读；无可用目的地时记为不发送；否则持有候选并解析其 import。
 */
//@ chunk-axmbhcjg.js:19692-20306 placement
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
    if (X0(signal)) return null;
    let probe = await classifyInventoryFile(ctx, classify, file, claimed, budget, seen);
    if (probe.kind === "refused") leftBehind.push(probe.left);
    if (probe.kind !== "candidate") continue;
    let { candidate: candidate } = probe,
      readPath = file.lexicalRel === CLAUDE_MD ? file.path : candidate.location.realPath,
      imports = await isInstructionsMemoryType_3(readPath, "User", new Set(), !0);
    if (imports.length === 0) {
      let E = await Ue(ctx, candidate.location);
      if (E.kind === "read" && E.content.includes(0))
        leftBehind.push({ path: file.lexicalRel, reason: "unreadable" });
      continue;
    }
    if (je(destinations, candidate) === null) {
      for (let E of imports) await attributeAtReferences(ctx, classify, E, seen);
      leftBehind.push({ path: file.lexicalRel, reason: "not_destination" });
      continue;
    }
    (claimed.add(candidate.location.realPath),
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
      ));
  }
  return leftBehind;
}
//@ chunk-axmbhcjg.js:20306-20370 placement
function Me(e) {
  return e.globs === void 0 ? "" : jsonStringify(e.globs.toSorted());
}
/**
 * 解析候选文件的 include 链：每个被引用文件在目的地范围内、非敏感、作用域一致时作为内联 import，输出样式单独记录经由关系；其他按原因（越界、敏感、非目的地、include 未发送）记入未发送列表。
 */
//@ chunk-axmbhcjg.js:20370-22323 placement
async function resolveCandidateImports(e, n, r, o, i, s, u, d, f) {
  let m = [],
    found = o.find((h) => h.parent === void 0),
    filtered = o.filter((h) => h !== found),
    styleRealByInclude = new Map(),
    makeHolder = (h, g) => ({
      candidate: h,
      isStyle: h.kind === "output_style",
      withheld: getSensitivePathReason(e, n, h.location) !== null || f.get(h.location.realPath) != null,
      scope: Me(g),
    }),
    holderByPath = new Map(found === void 0 ? [] : [[found.path, makeHolder(r, found)]]),
    leftIndexByReal = new Map(),
    addLeft = (h, g) => {
      if (!u.has(h)) (u.add(h), leftIndexByReal.set(h, m.push(g) - 1));
    },
    setLeft = (h, g) => {
      let C = leftIndexByReal.get(h);
      if (C === void 0) addLeft(h, g);
      else m[C] = g;
    };
  for (let h of o) await attributeAtReferences(e, n, h, f);
  for (let h of filtered) {
    let g = holderByPath.get(h.parent ?? "");
    if (g === void 0) continue;
    let C = relativeToConfigHome(e, h.path),
      w = await locateInConfigHome(e, h.path, C?.rel ?? null, C?.raw ?? null);
    if (w === "outside" || w === "unresolvable") {
      addLeft(h.path, { path: C?.rel ?? h.path, reason: "include_not_sent" });
      continue;
    }
    if (s.has(w.realPath) || f.has(w.realPath)) {
      let A = f.get(w.realPath) ?? resolveSensitivePath(e, n, w, w.lexicalRel);
      if (A !== null) (Z(f, w.realPath, A), setLeft(w.realPath, A));
      continue;
    }
    let R = Kyt(w.rel);
    if (R !== null) {
      let A = je(i, { ...R, location: w, imports: [], styleVia: new Map() });
      if (A === null) {
        addLeft(w.realPath, { path: w.lexicalRel, reason: "not_destination" });
        continue;
      }
      if ((s.add(w.realPath), A.kind === "output_style")) {
        styleRealByInclude.set(h.path, w.realPath);
        let v = h.parent === void 0 ? void 0 : styleRealByInclude.get(h.parent);
        if (v !== void 0) g.candidate.styleVia.set(w.realPath, v);
        if (!g.withheld && !g.isStyle && g.scope === Me(h))
          g.candidate.imports.push({ location: w, via: v ?? null, asStyle: !0 });
      }
      holderByPath.set(
        h.path,
        A.kind === "output_style"
          ? { ...g, withheld: g.withheld || getSensitivePathReason(e, n, A.location) !== null }
          : makeHolder(A, h),
      );
      continue;
    }
    if (g.withheld) continue;
    let all = uniq([w.rel, w.lexicalRel, ...w.rawRels]).every(isSyncableMarkdownPath),
      U = all ? resolveSensitivePath(e, n, w, w.lexicalRel) : null,
      N = U?.reason ?? null,
      V = Et(w.rel) && extname(w.rel).toLowerCase() === MD_EXTENSION;
    if (U !== null || V) Z(f, w.realPath, U);
    if (!all || N !== null) {
      addLeft(w.realPath, { path: w.lexicalRel, reason: N ?? (V ? "not_destination" : "include_not_sent") });
      continue;
    }
    if (g.isStyle || g.scope !== Me(h)) {
      d.set(w.realPath, { path: w.lexicalRel, reason: "include_not_sent" });
      continue;
    }
    (g.candidate.imports.push({
      location: w,
      via: h.parent === void 0 ? null : (styleRealByInclude.get(h.parent) ?? null),
    }),
      styleRealByInclude.set(h.path, w.realPath),
      s.add(w.realPath),
      holderByPath.set(h.path, g));
  }
  return m;
}
/**
 * 扫描文件中的 @ 引用拼写：解析到配置目录外的路径按过滤器结果记为敏感或拒读；配置目录内的走敏感路径判定；无法审查时放弃整次清点。
 */
//@ chunk-axmbhcjg.js:22323-23412 placement
async function attributeAtReferences(ctx, classify, memoryFile, withheld) {
  if (rc(memoryFile.path)) {
    ctx.giveUp ??= "alias_unreadable";
    return;
  }
  let baseDir = dirname(yt(memoryFile.path).resolvedPath),
    spellings = collectAtReferenceSpellings(
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
    if ((Qn(spelling) || Qn(expanded)) && j(relative(ctx.configHome, expanded))) continue;
    let pathInfo = yt(expanded);
    if (!pathInfo.isCanonical) {
      if (!pathInfo.isSymlink && !(await isMissingReference(expanded))) ctx.giveUp ??= "alias_unreadable";
      continue;
    }
    let homeRel = relativeToConfigHome(ctx, expanded);
    if (homeRel === null) {
      let resolvedPath = pathInfo.resolvedPath;
      if (withheld.get(resolvedPath) != null || j(relative(ctx.realConfigHome, resolvedPath))) continue;
      let gitRel = normalizeGitPaths(ctx.configHome, expanded);
      if (gitRel === null) {
        ctx.giveUp ??= "alias_unreadable";
        continue;
      }
      switch (hor(expanded) || hor(resolvedPath) ? "sensitive" : classify(gitRel, !0)) {
        case "sensitive":
        case "sensitive_tracked":
        case "host_config":
          Z(withheld, resolvedPath, { path: spelling, reason: "sensitive" });
          break;
        case "read_denied":
        case "rules_unreadable":
          Z(withheld, resolvedPath, { path: spelling, reason: "read_denied" });
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
    if (sensitiveReason !== null) Z(withheld, location.realPath, sensitiveReason);
  }
}
//@ chunk-axmbhcjg.js:23412-23526 placement
async function isMissingReference(e) {
  if ((Qn(e) && !isWslUncPath(e)) || Ya(e)) return !0;
  try {
    return (await realpathStrict(e), !1);
  } catch (error) {
    return B(error) && (await Ft(e));
  }
}
/**
 * 收集候选文件中被拒绝的项：拒绝项直接记录，非 output style 的符号链接与无目标位置的候选记为不发送，其余登记真实路径。
 */
//@ chunk-axmbhcjg.js:23526-23906 placement
async function collectOutputStyleCandidates(e, n, r, o, i, s, u) {
  let d = [];
  for (let f of r) {
    let m = await classifyInventoryFile(e, n, f, i, s, u);
    if (m.kind === "refused") d.push(m.left);
    else if (m.kind === "candidate")
      if (m.candidate.kind !== "output_style") d.push({ path: f.lexicalRel, reason: "symlink_not_sent" });
      else if (je(o, m.candidate) === null) d.push({ path: f.lexicalRel, reason: "not_destination" });
      else i.add(m.candidate.location.realPath);
  }
  return d;
}
/**
 * 生成一个清点条目：检查敏感、可读与大小，凭证内容拒发；非输出样式先去引用化，再按上限依次内联 import（跳过敏感、未闭合块、含链接、超限或含凭证的），必要时对合并结果再去引用；返回 {entry, foldedIncludes, leftBehind}。
 */
//@ chunk-axmbhcjg.js:24585-26856 placement
async function buildInventoryEntry(e, n, r, o, i, s) {
  let sensitive = resolveSensitivePath(e, n, r.location, r.destination),
    knownSensitive = o.get(r.location.realPath) ?? null;
  if (sensitive !== null) return buildWithheldEntry(r, sensitive.reason, s, sensitive.path);
  if (knownSensitive !== null) return buildWithheldEntry(r, knownSensitive.reason, s, knownSensitive.path);
  if (!(await isStillAtRealPath(e, r.location))) return buildWithheldEntry(r, "unreadable", s);
  let read = await Ue(e, r.location);
  if (read.kind === "skip") return buildWithheldEntry(r, mapSkipReasonToLeftBehind(read.skipped.reason), s);
  if (read.content.length > uue) return buildWithheldEntry(r, "over_cap", s);
  let str = read.content.toString("utf8");
  if (AAe(str)) {
    let R = buildWithheldEntry(r, "credential", s);
    return {
      ...R,
      leftBehind: R.leftBehind.map((M) => (M.reason === "credential" ? { ...M, ...matchKey(str, 0) } : M)),
    };
  }
  let defused =
      r.kind === "output_style"
        ? { content: read.content, defusedPaths: [] }
        : defuseIncludes(r.destination, read.content, r.imports.length > 0),
    parts = [defused.content],
    folded = [],
    foldedIncludes = [],
    totalBytes = defused.content.length,
    leftBehind = [],
    parentOpenBlock =
      r.imports.length > 0 && endsInsideOpenBlock(splitFrontmatter(defused.content.toString("utf8")).body),
    excludedReal = new Set(i);
  for (let { location: location, via: via, asStyle: asStyle } of r.imports) {
    let N = (Qt) => {
        if (!asStyle) leftBehind.push(Qt);
      },
      V = resolveSensitivePath(e, n, location, location.lexicalRel);
    if (
      V !== null ||
      o.has(location.realPath) ||
      excludedReal.has(location.realPath) ||
      (via !== null && isViaExcluded(via, excludedReal, r.styleVia)) ||
      parentOpenBlock
    ) {
      if ((excludedReal.add(location.realPath), !s.has(location.realPath)))
        (s.add(location.realPath),
          N(V ?? o.get(location.realPath) ?? { path: location.lexicalRel, reason: "include_not_sent" }));
      continue;
    }
    let A = (await isStillAtRealPath(e, location)) ? await Ue(e, location) : null;
    if (A === null || A.kind === "skip") {
      (excludedReal.add(location.realPath), N({ path: location.lexicalRel, reason: "include_not_sent" }));
      continue;
    }
    let { head: head, body: body } = splitFrontmatter(A.content.toString("utf8"));
    if (endsInsideOpenBlock(body) || hasMarkdownLinks(body)) {
      (excludedReal.add(location.realPath), N({ path: location.lexicalRel, reason: "include_not_sent" }));
      continue;
    }
    let buffer = Buffer.from(mt(location.rel) + escapeUnvettedIncludes(body));
    if (totalBytes + buffer.length > uue) {
      (excludedReal.add(location.realPath), N({ path: location.lexicalRel, reason: "over_cap" }));
      continue;
    }
    if (AAe(body)) {
      (excludedReal.add(location.realPath),
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
        }));
      continue;
    }
    if ((parts.push(buffer), folded.push(location.lexicalRel), !asStyle))
      foldedIncludes.push(location.lexicalRel);
    totalBytes += buffer.length;
  }
  let buffer = Buffer.concat(parts),
    content =
      r.kind !== "output_style" && parts.length > 1 && hasNewIncludes(defused.content, buffer, r.destination)
        ? escapeAllIncludes(buffer)
        : buffer;
  if (r.kind !== "output_style" && content !== buffer && he(content, oe))
    return buildWithheldEntry(r, "undefusable", s);
  if (!content.equals(read.content) && AAe(content.toString("utf8"))) {
    let R = buildWithheldEntry(r, "credential", s),
      M = new Set(leftBehind.map((U) => U.path));
    return { ...R, leftBehind: [...R.leftBehind.filter((U) => !M.has(U.path)), ...leftBehind] };
  }
  let C = new Set(folded),
    defusedCount = count(
      defused.defusedPaths,
      (R) => !C.has(posix.normalize(posix.join(posix.dirname(r.destination), R)).normalize("NFC")),
    );
  return {
    entry: {
      path: r.destination,
      kind: r.kind,
      content: content,
      sha256: computeContentHash(content),
      folded: folded,
      defused: defusedCount,
    },
    foldedIncludes: foldedIncludes,
    leftBehind: leftBehind,
  };
}
/**
 * 对记忆文件正文中指向非目的地的 @include 加反斜杠去引用（保留 frontmatter 与 BOM）；结果仍可能引用时退回到整体转义 @。
 */
//@ chunk-axmbhcjg.js:26856-27439 placement
function defuseIncludes(e, n, r) {
  let isDestination = (x) => isDestinationInclude(e, x),
    replaced = n.toString("utf8").replace(
      /\r\n?/g,
      `
`,
    ),
    split = splitFrontmatter(replaced),
    head = split.head,
    bom = head !== "" && replaced.startsWith("\uFEFF") ? "\uFEFF" : "",
    leadingNewline =
      r && head === "" && /^\uFEFF?---\s*\n/.test(replaced)
        ? `
`
        : "",
    headPart = leadingNewline + bom + head,
    body = split.body,
    y = [],
    defusedBody = escapeUnvettedIncludes(body, isDestination, y),
    result =
      defusedBody === body && leadingNewline === ""
        ? { content: n, defusedPaths: [] }
        : { content: Buffer.from(headPart + defusedBody), defusedPaths: y };
  if (result.content !== n && (splitFrontmatter(n.toString("utf8")).head === "") !== (head === ""))
    return { content: Buffer.from(escapeAtSigns(replaced)), defusedPaths: bt(body, isDestination) };
  if (!he(result.content, isDestination)) return result;
  let L = bt(body, isDestination),
    buffer = Buffer.from(headPart + escapeAtSigns(body));
  return he(buffer, oe)
    ? { content: Buffer.from(leadingNewline + escapeAtSigns(replaced)), defusedPaths: L }
    : { content: buffer, defusedPaths: L };
}
//@ chunk-axmbhcjg.js:27439-27522 placement
function bt(e, n) {
  let r = collectAtReferenceSpellings(e, e);
  return r.vettable ? r.spellings.filter((spelling) => !n(spelling)) : [];
}
//@ chunk-axmbhcjg.js:27522-27650 placement
function hasNewIncludes(e, n, r) {
  let o = (u) => isDestinationInclude(r, u),
    i = (u) => extractIncludePathsFromText(splitFrontmatter(u.toString("utf8")).body),
    s = i(n);
  return s.some((u) => !o(u)) || count(s, o) > count(i(e), o);
}
//@ chunk-axmbhcjg.js:27650-27819 placement
function escapeAllIncludes(e) {
  let str = e.toString("utf8"),
    { head: head, body: body } = splitFrontmatter(str),
    i = head !== "" && str.startsWith("\uFEFF") ? "\uFEFF" : "",
    buffer = Buffer.from(i + head + escapeAtSigns(body));
  return he(buffer, oe) ? Buffer.from(escapeAtSigns(str)) : buffer;
}
//@ chunk-axmbhcjg.js:27819-27877 placement
function he(e, n) {
  return hasUnvettedInclude(splitFrontmatter(e.toString("utf8")).body, n);
}
//@ chunk-axmbhcjg.js:27877-28019 placement
function splitFrontmatter(e) {
  let n = e.startsWith("\uFEFF") ? e.slice(1) : e,
    r = FRONTMATTER_REGEX.exec(n)?.[0];
  return r === void 0 ? { head: "", body: e } : { head: r, body: n.slice(r.length) };
}
//@ chunk-axmbhcjg.js:28019-28199 placement
function isDestinationInclude(e, n) {
  if (n.startsWith("/") || n.startsWith("~")) return !1;
  let normalized = posix.normalize(posix.join(posix.dirname(e), n)),
    o = normalized.startsWith("../") ? null : classifyWorkingFile(normalized);
  return o === "claude_md" || o === "rule";
}
//@ chunk-axmbhcjg.js:28199-28317 placement
function isViaExcluded(e, n, r) {
  let o = new Set();
  for (let i = e; i !== void 0 && !o.has(i); i = r.get(i)) {
    if (n.has(i)) return !0;
    o.add(i);
  }
  return !1;
}
//@ chunk-axmbhcjg.js:28317-28422 placement
async function isStillAtRealPath(e, n) {
  try {
    return (await realpathStrict(join(e.realConfigHome, n.nativeRel))) === n.realPath;
  } catch {
    return !1;
  }
}

export { getAliasSpellings, pe, gt, buildHomeInventory };
