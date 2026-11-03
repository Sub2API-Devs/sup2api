/**
 * utils/claudeAiSync/syncOwnedRoot.ts
 *
 * 2.1.316 新增：同步所属根目录的安全检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (33)
 * attribution: placement 33
 */
import {
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
} from "path";
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  stat as stat_6,
  stat as stat_7,
  stat as stat_8,
  stat as stat_9,
  stat as stat_10,
  stat as stat_11,
  stat as stat_12,
  stat as stat_13,
  stat as stat_14,
  stat as stat_15,
  stat as stat_16,
  stat as stat_17,
  stat as stat_18,
  stat as stat_19,
  stat as stat_20,
  stat as stat_21,
  stat as stat_22,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  mkdir as mkdir_6,
  mkdir as mkdir_7,
  mkdir as mkdir_8,
  mkdir as mkdir_9,
  mkdir as mkdir_10,
  mkdir as mkdir_11,
  mkdir as mkdir_12,
  mkdir as mkdir_13,
  mkdir as mkdir_14,
  mkdir as mkdir_15,
  mkdir as mkdir_16,
  mkdir as mkdir_17,
  mkdir as mkdir_18,
  mkdir as mkdir_19,
  mkdir as mkdir_20,
  mkdir as mkdir_21,
  mkdir as mkdir_22,
  mkdir as mkdir_23,
  mkdir as mkdir_24,
  mkdir as mkdir_25,
  mkdir as mkdir_26,
  mkdtemp,
  mkdtemp as mkdtemp_2,
  mkdtemp as mkdtemp_3,
  mkdtemp as mkdtemp_4,
  mkdtemp as mkdtemp_5,
  mkdtemp as mkdtemp_6,
  mkdtemp as mkdtemp_7,
  mkdtemp as mkdtemp_8,
  rename,
  rename as rename_2,
  rename as rename_3,
  rename as rename_4,
  rename as rename_5,
  rename as rename_6,
  rename as rename_7,
  rmdir,
  rmdir as rmdir_2,
  rmdir as rmdir_3,
  rmdir as rmdir_4,
  rmdir as rmdir_5,
  rmdir as rmdir_6,
  rmdir as rmdir_7,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  writeFile as writeFile_4,
  writeFile as writeFile_5,
  writeFile as writeFile_6,
  writeFile as writeFile_7,
  writeFile as writeFile_8,
  writeFile as writeFile_9,
  writeFile as writeFile_10,
  writeFile as writeFile_11,
  writeFile as writeFile_12,
  writeFile as writeFile_13,
  writeFile as writeFile_14,
  writeFile as writeFile_15,
  writeFile as writeFile_16,
  writeFile as writeFile_17,
  writeFile as writeFile_18,
} from "fs/promises";
import {
  isENOENT,
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../errors.js";
import { syncBucketShape, Cte, FJr } from "../plugins/syncedItems.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { isValidKeySegment } from "../storage/storageSpaces.js";
import { storageErrorCode, formatStorageError, REMOTELINK } from "../storage/storageErrors.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { $Lt, queueSyncTrashTrim } from "../plugins/syncTrash.js";

//@ chunk-e6aww6q8.js:629796-629860 placement
function Zce(e, n) {
  if (!isENOENT(n)) (e.errors++, (e.failure = getErrnoCode(n) ?? "unknown"));
}
/**
 * 把路径转成 POSIX 形式的显示标签（统一斜杠，逐段替换为可读名称）。
 */
//@ chunk-e6aww6q8.js:630096-630204 placement
function toPosixLabelPath(e) {
  return e
    .split(sep_12)
    .join("/")
    .replaceAll("\\", "/")
    .split("/")
    .map((n) => syncBucketShape(n) ?? n)
    .join("/");
}
//@ chunk-e6aww6q8.js:630204-630377 placement
class SyncOwnedRootRefusedError extends Error {
  reason;
  code;
  constructor(e, n) {
    super("sync-owned root refused", { cause: n?.cause });
    ((this.name = "SyncOwnedRootRefusedError"), (this.reason = e), (this.code = n?.code));
  }
}
//@ chunk-e6aww6q8.js:630377-630416 placement
var Uho = new Map([["skills", "skills"]]);
/**
 * 存储 v5 启用时把配置目录下的路径映射为 userConfigDir 命名空间的作用域链（逐级），并给出管线目录；不在已知子目录下返回 undefined。
 */
//@ chunk-e6aww6q8.js:630416-630821 placement
function getStorageChainForPath(e, n, r) {
  if (!(isStorageV5Enabled() && r !== void 0)) return;
  let s = relative_7(n, e);
  if (s === "" || s.startsWith("..") || isAbsolute_5(s)) return;
  let [h, ...y] = s.split(sep_12).filter(Boolean);
  if (h === void 0) return;
  let S = Uho.get(h);
  if (S === void 0 || !y.every(isValidKeySegment)) return;
  let w = [{ namespace: "userConfigDir", dir: S }];
  for (let L = 1; L <= y.length; L++) w.push({ namespace: "userConfigDir", dir: S, relPath: y.slice(0, L) });
  return { storageV5: r, chain: w, pipelineFolder: join_18(n, h) };
}
//@ chunk-e6aww6q8.js:630821-630919 placement
function qfe(e) {
  let at = e.at(-1);
  if (at === void 0) throw Error("empty sync-owned scope chain");
  return at;
}
//@ chunk-e6aww6q8.js:630919-631054 placement
function unexpectedProbeAnswer(e) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `sync-owned path probe: unexpected answer ${String(e?.kind)}`,
    "sync-owned path probe: unexpected answer",
  );
}
//@ chunk-e6aww6q8.js:631054-631206 placement
function probeFailedError(e) {
  let n = storageErrorCode(e);
  return Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `sync-owned path probe failed: ${formatStorageError(e)}`,
      "sync-owned path probe failed",
    ),
    n !== void 0 ? { code: n } : {},
  );
}
/**
 * 逐级检查同步根路径：存储 v5 下按作用域链检查（第一层允许解析到目录的链接），否则逐段 lstat；返回 real、absent、redirected 或 not_a_directory。
 */
//@ chunk-e6aww6q8.js:631206-632076 placement
async function probeSyncRootPath(e, n, r) {
  let relPath = relative_7(n, e);
  if (relPath.startsWith("..") || isAbsolute_5(relPath)) return "redirected";
  let storageChain = getStorageChainForPath(e, n, r);
  if (storageChain !== void 0) {
    for (let [S, w] of storageChain.chain.entries()) {
      let scopeKind = await storageChain.storageV5.scopeKind(w, S === 0 ? { resolveLink: !0 } : void 0);
      if (!scopeKind.ok) {
        if (S === 0 && storageErrorCode(scopeKind.error) === REMOTELINK) {
          let q = await statDirectoryKind(storageChain.pipelineFolder);
          if (q !== "directory") return q;
          continue;
        }
        throw probeFailedError(scopeKind.error);
      }
      let G = scopeKind.value;
      switch (G.kind) {
        case "directory":
          continue;
        case "absent":
          return "absent";
        case "other":
          return "not_a_directory";
        case "link":
          if (S > 0 || G.linkResolves !== !0) return "redirected";
          continue;
        default:
          throw unexpectedProbeAnswer(G);
      }
    }
    return "real";
  }
  let current = n;
  for (let [S, w] of relPath.split(sep_12).filter(Boolean).entries()) {
    current = join_18(current, w);
    let L;
    try {
      L = await lstat_8(current);
    } catch (error) {
      if (isENOENT(error)) return "absent";
      throw error;
    }
    if (L.isSymbolicLink()) {
      if (S > 0) return "redirected";
      let G = await statDirectoryKind(current);
      if (G !== "directory") return G;
      continue;
    }
    if (!L.isDirectory()) return "not_a_directory";
  }
  return "real";
}
//@ chunk-e6aww6q8.js:632076-632220 placement
async function statDirectoryKind(e) {
  let n;
  try {
    n = await stat_5(e);
  } catch (error) {
    if (isENOENT(error)) return "redirected";
    throw error;
  }
  return n.isDirectory() ? "directory" : "not_a_directory";
}
//@ chunk-e6aww6q8.js:632220-632316 placement
function GLt(e) {
  let n = join_18(e, Cte);
  return [
    [n, "staging"],
    [join_18(n, String(process.pid)), "staging_pid"],
  ];
}
/**
 * 探测路径叶子的类型（absent、directory、redirected 或 not_a_directory），可走存储 v5 的作用域查询，否则用 lstat。
 */
//@ chunk-e6aww6q8.js:632316-632772 placement
async function probeLeafKind(e, n, r) {
  let s = getStorageChainForPath(e, n, r);
  if (s !== void 0) {
    let scopeKind = await s.storageV5.scopeKind(qfe(s.chain));
    if (!scopeKind.ok) throw probeFailedError(scopeKind.error);
    switch (scopeKind.value.kind) {
      case "absent":
      case "directory":
        return scopeKind.value.kind;
      case "link":
        return "redirected";
      case "other":
        return "not_a_directory";
      default:
        throw unexpectedProbeAnswer(scopeKind.value);
    }
  }
  let h;
  try {
    h = await lstat_8(e);
  } catch (error) {
    if (isENOENT(error)) return "absent";
    throw error;
  }
  if (h.isSymbolicLink()) return "redirected";
  return h.isDirectory() ? "directory" : "not_a_directory";
}
/**
 * 校验同步根：探测根路径（可选再检查暂存叶子各级），被拒或无法验证时记诊断并返回 {refused}；正常返回 real 或 absent。
 */
//@ chunk-e6aww6q8.js:632772-633369 placement
async function verifySyncRoot(e, n, r, { checkStagingLeaf: s = !1, storageV5: h } = {}) {
  let rootKind;
  try {
    if (((rootKind = await probeSyncRootPath(e, n, h)), rootKind === "real" && s))
      for (let [S, w] of GLt(e)) {
        let L = await probeLeafKind(S, n, h);
        if (L === "absent") break;
        if (L !== "directory")
          return (
            logForDiagnosticsNoPII("warn", r.event, {
              phase: r.phase,
              root: toPosixLabelPath(r.rootLabel),
              component: w,
              reason: L,
            }),
            { refused: L }
          );
      }
  } catch (error) {
    return (
      logForDiagnosticsNoPII("warn", r.event, {
        phase: r.phase,
        root: toPosixLabelPath(r.rootLabel),
        reason: "unverified",
        code: getErrnoCode(error) ?? "unknown",
      }),
      { refused: "unverified" }
    );
  }
  switch (rootKind) {
    case "real":
    case "absent":
      return rootKind;
    case "redirected":
    case "not_a_directory":
      return (
        logForDiagnosticsNoPII("warn", r.event, {
          phase: r.phase,
          root: toPosixLabelPath(r.rootLabel),
          reason: rootKind,
        }),
        { refused: rootKind }
      );
  }
}
//@ chunk-e6aww6q8.js:633369-633421 placement
function jho(e) {
  return "source_unverifiable_unknown";
}
//@ chunk-e6aww6q8.js:633421-633581 placement
async function describeVanishedSource(e) {
  try {
    return (await statDirectoryKind(e)) === "not_a_directory" ? "source_unverifiable_ENOTDIR" : "gone";
  } catch (error) {
    return `source_unverifiable_${getErrnoCode(error) ?? "unknown"}`;
  }
}
/**
 * 批处理目录消失后在存储中逐级向上判断原因：仍存在为 batch_dir_vanished，父级存在为 gone，遇到非目录、链接或错误则给出 source_unverifiable_*。
 */
//@ chunk-e6aww6q8.js:633581-634281 placement
async function diagnoseVanishedBatchDir(batch) {
  let scopeKind = await batch.storageV5.scopeKind(qfe(batch.chain));
  if (!scopeKind.ok) return `source_unverifiable_${storageErrorCode(scopeKind.error) ?? "unknown"}`;
  if (scopeKind.value.kind !== "absent") return "batch_dir_vanished";
  for (let depth = batch.chain.length - 2; depth >= 0; depth--) {
    let parentScope = batch.chain[depth];
    if (parentScope === void 0) break;
    let scopeKind = await batch.storageV5.scopeKind(parentScope, depth === 0 ? { resolveLink: !0 } : void 0);
    if (!scopeKind.ok) {
      if (depth === 0 && storageErrorCode(scopeKind.error) === REMOTELINK)
        return describeVanishedSource(batch.pipelineFolder);
      return `source_unverifiable_${storageErrorCode(scopeKind.error) ?? "unknown"}`;
    }
    switch (scopeKind.value.kind) {
      case "absent":
        continue;
      case "directory":
        return "gone";
      case "other":
        return "source_unverifiable_ENOTDIR";
      case "link":
        if (depth === 0) return describeVanishedSource(batch.pipelineFolder);
        return "source_unverifiable_parent_link";
      default:
        return jho(scopeKind.value);
    }
  }
  return "gone";
}
//@ chunk-e6aww6q8.js:634281-635209 placement
async function checkSyncRoots({
  dir: dir,
  trashRoot: trashRoot,
  configHome: configHome,
  failureEvent: failureEvent,
  storageV5: storageV5,
}) {
  let y;
  try {
    let S = await probeSyncRootPath(dirname_12(dir), configHome, storageV5);
    if (S === "redirected" || S === "not_a_directory")
      return (logForDiagnosticsNoPII("warn", failureEvent, { code: `source_root_${S}` }), !1);
    let w = await probeSyncRootPath(trashRoot, configHome, storageV5);
    switch (w) {
      case "redirected":
      case "not_a_directory":
        return (logForDiagnosticsNoPII("warn", failureEvent, { code: `trash_root_${w}` }), !1);
      case "absent": {
        let L = getStorageChainForPath(trashRoot, configHome, storageV5);
        if (L !== void 0) {
          let ensureScope = await L.storageV5.ensureScope(qfe(L.chain));
          if (!ensureScope.ok) throw probeFailedError(ensureScope.error);
        } else await mkdir_9(trashRoot, { recursive: !0 });
        break;
      }
      case "real":
        break;
    }
    return (
      (y = await mkdtemp(join_18(trashRoot, $Lt(relative_7(configHome, dir))))),
      await rename_2(dir, join_18(y, basename_5(dir))),
      queueSyncTrashTrim(trashRoot, basename_5(y)),
      !0
    );
  } catch (error) {
    if (y !== void 0) await rmdir_2(y).catch(() => {});
    if (y !== void 0 && isENOENT(error)) {
      let w = "batch_dir_vanished",
        L = getStorageChainForPath(dir, configHome, storageV5);
      if (L !== void 0) {
        let G = await diagnoseVanishedBatchDir(L);
        if (G === "gone") return !0;
        w = G;
      } else
        try {
          await lstat_8(dir);
        } catch (error) {
          if (isENOENT(error)) return !0;
          w = `source_unverifiable_${getErrnoCode(error) ?? "unknown"}`;
        }
      return (logForDiagnosticsNoPII("warn", failureEvent, { code: w }), !1);
    }
    return (logForDiagnosticsNoPII("warn", failureEvent, { code: getErrnoCode(error) ?? "unknown" }), !1);
  }
}
/**
 * 检查同步根目录未被重定向、不是符号链接、父目录正常。
 */
//@ chunk-e6aww6q8.js:635209-636345 placement
async function checkSyncOwnedRoot({
  root: root,
  trashRoot: trashRoot,
  configHome: configHome,
  events: events,
  storageV5: storageV5,
}) {
  try {
    for (let w of new Set([dirname_12(trashRoot), dirname_12(root)])) {
      let L = await probeSyncRootPath(w, configHome, storageV5);
      if (L === "redirected" || L === "not_a_directory") {
        let G = L === "redirected" ? "parent_symlink" : "parent_not_a_directory";
        throw (
          logForDiagnosticsNoPII("warn", events.refused, {
            phase: "round_head",
            root: toPosixLabelPath(relative_7(configHome, root)),
            component: "parent",
            reason: L,
          }),
          new SyncOwnedRootRefusedError(G)
        );
      }
    }
    let y = await probeLeafKind(root, configHome, storageV5),
      S = [
        [root, "root", y],
        [trashRoot, "trash_root", await probeLeafKind(trashRoot, configHome, storageV5)],
      ];
    if (y === "directory")
      for (let [w, L] of GLt(root)) {
        let G = await probeLeafKind(w, configHome, storageV5);
        if ((S.push([w, L, G]), G !== "directory")) break;
      }
    for (let [, w, L] of S) {
      if (L === "absent") continue;
      if (L !== "directory") {
        let G = w === "staging_pid" ? "staging" : w;
        throw (
          logForDiagnosticsNoPII("warn", events.refused, {
            phase: "round_head",
            root: toPosixLabelPath(relative_7(configHome, root)),
            component: w,
            reason: L,
          }),
          new SyncOwnedRootRefusedError(L === "redirected" ? `${G}_symlink` : `${G}_not_a_directory`)
        );
      }
    }
    if (y !== "directory") {
      let w = getStorageChainForPath(root, configHome, storageV5);
      if (w !== void 0) {
        let ensureScope = await w.storageV5.ensureScope(qfe(w.chain));
        if (!ensureScope.ok) throw probeFailedError(ensureScope.error);
      } else await mkdir_9(root, { recursive: !0 });
    }
  } catch (error) {
    if (error instanceof SyncOwnedRootRefusedError) throw error;
    let S = getErrnoCode(error) ?? "unknown";
    throw (
      logForDiagnosticsNoPII("warn", events.refused, {
        phase: "round_head",
        root: toPosixLabelPath(relative_7(configHome, root)),
        reason: "unverified",
        code: S,
      }),
      new SyncOwnedRootRefusedError("unverified", { cause: error, code: S })
    );
  }
}
/**
 * 创建同步根守卫：verify 在落地前校验根（只要被拒过就一直拒绝），记录拒绝原因。
 */
//@ chunk-e6aww6q8.js:636345-636752 placement
function createSyncRootGuard({
  root: root,
  rootLabel: rootLabel,
  configHome: configHome,
  event: event,
  storageV5: storageV5,
}) {
  let y = null;
  return {
    refused() {
      return y !== null;
    },
    refusedReason() {
      return y;
    },
    async verify() {
      if (y !== null) return !1;
      let S = await verifySyncRoot(
        root(),
        configHome(),
        { event: event, phase: "landing", rootLabel: rootLabel },
        { checkStagingLeaf: !0, storageV5: storageV5 },
      );
      if (S === "real") return !0;
      if (S === "absent")
        (logForDiagnosticsNoPII("warn", event, {
          phase: "landing",
          root: toPosixLabelPath(rootLabel),
          reason: "absent",
        }),
          (y = "absent"));
      else y = S.refused;
      return !1;
    },
  };
}
//@ chunk-e6aww6q8.js:636752-636798 placement
function MUr(e) {
  return new SyncOwnedRootRefusedError(`landing_${e}`);
}
//@ chunk-e6aww6q8.js:636798-636865 placement
function DUr(e) {
  return { manifestRead: !1, guard: createSyncRootGuard(e), root: e.root() };
}
/**
 * 同步落位成功结果，以及同步根在本轮中不再通过校验时的失败结果。
 */
//@ chunk-e6aww6q8.js:636865-636972 placement
var SYNC_OK = { ok: !0 },
  ROOT_REFUSED_RESULT = {
    ok: !1,
    cause: "root_refused",
    reason: "sync root no longer verifies (changed mid-round)",
  };
//@ chunk-e6aww6q8.js:636972-637027 placement
function W6n(e) {
  return { ok: !1, cause: "extract", reason: e };
}
//@ chunk-e6aww6q8.js:637027-637083 placement
function LUr(e) {
  return { ok: !1, cause: "download", reason: e };
}
//@ chunk-e6aww6q8.js:637083-637162 placement
var a$o = { ok: !1, cause: "deferred", reason: "another process is landing this item" };
//@ chunk-e6aww6q8.js:637162-637257 placement
function G6n(e) {
  return e === "ENOTEMPTY" || e === "EEXIST" || e === "ENOTDIR" || e === "EPERM" || e === "EACCES";
}
//@ chunk-e6aww6q8.js:637257-637355 placement
var zun = { ok: !1, cause: "local", reason: "an existing directory at the target could not be displaced" };
/**
 * 构造下载副本无法移入位置时的本地失败结果。
 */
//@ chunk-e6aww6q8.js:637355-637482 placement
function buildLocalPlacementFailure(e) {
  return {
    ok: !1,
    cause: "local",
    reason: `the downloaded copy could not be moved into place (${e ?? "unknown error"})`,
  };
}
/**
 * 把同步失败原因映射为遥测事件名（下载、根被拒、解压、本地），deferred 不上报。
 */
//@ chunk-e6aww6q8.js:637482-637685 placement
function getSyncFailureEvent(e) {
  switch (e) {
    case "download":
      return "download_failed";
    case "root_refused":
      return "root_refused";
    case "extract":
      return "extract_failed";
    case "local":
      return "local_failed";
    case "deferred":
      return null;
  }
}
/**
 * 把同步失败原因映射为给用户看的说明文字。
 */
//@ chunk-e6aww6q8.js:637685-638059 placement
function describeSyncFailure(e) {
  switch (e) {
    case "download":
      return "download failed";
    case "root_refused":
      return "sync root refused (a symlink or stray file is in the way, or it was removed mid-round)";
    case "extract":
      return "archive unusable";
    case "deferred":
      return "another process is landing this skill; retry shortly";
    case "local":
      return "a local filesystem error kept it from being placed on disk";
  }
}
//@ chunk-e6aww6q8.js:638059-638116 placement
async function E2e(e, n) {
  return (await readSyncMarker(e, n)) === "marked";
}
/**
 * 读取同步标记文件是否存在：存在为 marked，不存在为 unmarked，其他错误返回不可读代码。
 */
//@ chunk-e6aww6q8.js:638116-638263 placement
async function readSyncMarker(e, n) {
  try {
    return (await lstat_8(FJr(e, n))).isFile() ? "marked" : "unmarked";
  } catch (error) {
    return isENOENT(error) ? "unmarked" : { unreadable: getErrnoCode(error) ?? "unknown" };
  }
}
/**
 * （误归 computerUse）以 wx 模式创建空文件，已存在则忽略。
 */
//@ chunk-e6aww6q8.js:638263-638363 placement = tryCreateExclusive (1)
async function touchExclusive(e, n) {
  try {
    await writeFile_3(FJr(e, n), "", { flag: "wx" });
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") throw error;
  }
}

export {
  verifySyncRoot,
  readSyncMarker,
  checkSyncRoots,
  Zce,
  checkSyncOwnedRoot,
  toPosixLabelPath,
  SyncOwnedRootRefusedError,
  touchExclusive,
  DUr,
  ROOT_REFUSED_RESULT,
  MUr,
  LUr,
  W6n,
  G6n,
  buildLocalPlacementFailure,
  zun,
  E2e,
  a$o,
  SYNC_OK,
  getSyncFailureEvent,
  describeSyncFailure,
};
