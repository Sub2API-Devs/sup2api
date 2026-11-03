/**
 * tools/BashTool/bashEditRecorder.ts
 *
 * 2.1.316 新增：记录 Bash 命令改动过的文件内容
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (17)
 * attribution: placement 17
 */
import {
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
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
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
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  realpath as realpath_10,
  realpath as realpath_11,
  realpath as realpath_12,
  realpath as realpath_13,
  realpath as realpath_14,
  realpath as realpath_15,
  realpath as realpath_16,
  realpath as realpath_17,
  realpath as realpath_18,
  realpath as realpath_19,
  realpath as realpath_20,
  realpath as realpath_21,
  realpath as realpath_22,
  realpath as realpath_23,
  realpath as realpath_24,
  realpath as realpath_25,
  realpath as realpath_26,
  realpath as realpath_27,
  realpath as realpath_28,
  realpath as realpath_29,
  realpath as realpath_30,
  realpath as realpath_31,
  realpath as realpath_32,
  realpath as realpath_33,
  realpath as realpath_34,
  realpath as realpath_35,
  realpath as realpath_36,
  realpath as realpath_37,
  realpath as realpath_38,
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
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  open as open_8,
  open as open_9,
  open as open_10,
  open as open_11,
  open as open_12,
  open as open_13,
  open as open_14,
  open as open_15,
  open as open_16,
  open as open_17,
  open as open_18,
  open as open_19,
  open as open_20,
  open as open_21,
  open as open_22,
  open as open_23,
  open as open_24,
  open as open_25,
  open as open_26,
  open as open_27,
  readlink,
  readlink as readlink_2,
  readlink as readlink_3,
  readlink as readlink_4,
  readlink as readlink_5,
  readlink as readlink_6,
  readlink as readlink_7,
  readlink as readlink_8,
  readlink as readlink_9,
  readlink as readlink_10,
  readlink as readlink_11,
  readlink as readlink_12,
} from "fs/promises";
import {
  constants,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
  constants as constants_9,
  constants as constants_10,
  constants as constants_12,
  constants as constants_13,
  constants as constants_14,
  constants as constants_15,
  constants as constants_16,
  constants as constants_17,
  constants as constants_18,
  constants as constants_19,
  constants as constants_20,
  constants as constants_21,
  constants as constants_22,
  constants as constants_23,
  constants as constants_24,
  constants as constants_25,
  constants as constants_26,
  constants as constants_27,
} from "fs";
import {
  takeOutsideWrites,
  recordersByCwd,
  dS,
  MAX_RECORDED_FILE_BYTES,
  MAX_RECORD_BATCH_BYTES,
  runSerialForRecorder,
  MAX_EXPANDED_PATHS,
  RECORDER_POLL_MS,
  MAX_GIT_OUTPUT_BYTES,
  RECORDER_GIT_TIMEOUT_MS,
  MAX_BASE_LISTING_BYTES,
  MAX_TOTAL_RECORD_BYTES,
  MAX_LAST_SEEN_BYTES,
} from "./writeObserver.js";
import {
  XDe,
  takeBashSnapshot,
  isSafeRepoPath,
  findConvertedFiles,
  runSnapshotGit,
  getSnapshotGitArgs,
  getSnapshotGitEnv,
} from "./bashEditDiff/snapshot.js";
import { count } from "../../utils/collections.js";
import { __, isFullFileView } from "../../utils/remoteFileState.js";
import { normalizeCrlf } from "../../utils/git/gitIndexReader.js";
import {
  zDe,
  isDiffSmallEnough,
  jie,
  buildSnapshotGitEnv,
  cleanupSandboxAfterGit,
} from "./bashEditDiff/gitEnv.js";
import { P3 } from "../../../vendor/diff/libesm/patch/create.js";
import { logForDebugging } from "../../utils/debug.js";
import { gitExe } from "../../utils/git.js";
import { safeSpawn } from "../../utils/safeSpawn.js";
import { getPlatform } from "../../utils/platform.js";
import { Vys } from "../../utils/fileRead.js";

/**
 * 把观察到的写入路径记录到编辑记录器：目录写入展开为其下已知文件，过滤被忽略的路径，读取文件内容（总量有上限）存入 lastSeen，溢出或异常时放弃记录。
 */
//@ chunk-e6aww6q8.js:4802566-4803544 placement
async function recordObservedWrites(e) {
  let n = takeOutsideWrites(e),
    r = await recordersByCwd.get(e)?.catch(() => null);
  if (!r || !n || (n.paths.length === 0 && !n.overflow)) return;
  if (n.overflow) {
    dS(e);
    return;
  }
  let filtered = n.paths.filter((path) => /[\\/]$/.test(path)),
    h = await expandDirectoryWrites(r, filtered);
  if (h === null) {
    dS(e);
    return;
  }
  for (let q of h) rememberFileContent(r, q, null);
  let y = await toRepoRelativePaths(
      r,
      n.paths.filter((path) => !/[\\/]$/.test(path)),
    ),
    S = (q) => r.lastSeen.has(q) || (r.basePaths?.has(q) ?? !1),
    filtered_2 = y.filter((q) => !S(q));
  if (filtered_2.length > 0 && !(await XDe(r.base))) {
    dS(e);
    return;
  }
  let L = filtered_2.length > 0 ? await checkIgnoredPaths(r.base, filtered_2) : new Set();
  if (L === null) {
    dS(e);
    return;
  }
  let G = 0;
  for (let q of y) {
    if (L.has(q)) continue;
    let min = Math.min(MAX_RECORDED_FILE_BYTES, MAX_RECORD_BATCH_BYTES - G),
      Se = await statForRecorder(join_128(r.realRoot, q), min);
    if (Se === "missing" || Se === "not-a-file") {
      if (S(q)) rememberFileContent(r, q, null);
    } else if (Buffer.isBuffer(Se)) ((G += Se.length), rememberFileContent(r, q, Se));
    else if (typeof Se === "object") ((G += Se.link.length), rememberFileContent(r, q, Se.link));
    else if (Se === "too-large" && min < MAX_RECORDED_FILE_BYTES) {
      dS(e);
      return;
    } else if (Se === "too-large" || Se === "unreadable")
      ((r.lastSeenBytes -= r.lastSeen.get(q)?.content?.length ?? 0), r.lastSeen.delete(q));
  }
  if (r.evicted) dS(e);
}
/**
 * 为仓库启动编辑记录器（每个 cwd 一个）：拍快照、取真实根路径与基线文件列表，失败时清除。
 */
//@ chunk-e6aww6q8.js:4803544-4803925 placement
function startEditRecorder(e) {
  let n = recordersByCwd.get(e);
  if (!n) {
    let now = Date.now(),
      s = takeBashSnapshot(e)
        .then(async (h) => {
          let y = await realpath_38(e).catch(() => null);
          return h && h !== "unavailable" && y !== null
            ? {
                base: h,
                realRoot: y,
                basePaths: await listBaseTreePaths(h),
                lastSeen: new Map(),
                lastSeenBytes: 0,
                evicted: !1,
                takenAt: now,
              }
            : null;
        })
        .catch(() => null)
        .then((h) => {
          if (h === null && recordersByCwd.get(e) === s) recordersByCwd.delete(e);
          return h;
        });
    ((n = s), recordersByCwd.set(e, s));
  }
  return n.then((r) => r !== null);
}
//@ chunk-e6aww6q8.js:4803925-4804014 placement
function VYn(e, n, r, s, h = Number.POSITIVE_INFINITY, y = !1) {
  return runSerialForRecorder(e, () => recordEditedFiles(e, n, r, s, h, y));
}
/**
 * 记录 Bash 命令改动过的文件内容（缺失、过大、不可读都单独标记）。
 */
//@ chunk-e6aww6q8.js:4804014-4806455 placement
async function recordEditedFiles(e, n, r, s, h, y) {
  let w = () => (dS(e), { files: [], moreFiles: 0, unavailable: !0 });
  try {
    let L = await recordersByCwd.get(e);
    if (!L || L.takenAt > h || r || n.length > MAX_EXPANDED_PATHS) return w();
    let G = new Set(n.filter((gt) => gt.endsWith(sep_72) && gt.length > 1)),
      q = new Set(
        await toRepoRelativePaths(
          L,
          n.filter((gt) => !G.has(gt)),
        ),
      ),
      Z = await expandDirectoryWrites(L, [...G]);
    if (Z === null) return w();
    for (let gt of Z) q.add(gt);
    if (q.size > MAX_EXPANDED_PATHS) return w();
    if (q.size === 0) return null;
    let Se = new Map(),
      ke = 0,
      we = [];
    for (let gt of q) {
      let At = await statForRecorder(
        join_128(L.realRoot, gt),
        Math.min(MAX_RECORDED_FILE_BYTES, MAX_RECORD_BATCH_BYTES - ke),
      );
      if (At === "missing") Se.set(gt, null);
      else if (At === "too-large" || At === "unreadable")
        (we.push(gt), (L.lastSeenBytes -= L.lastSeen.get(gt)?.content?.length ?? 0), L.lastSeen.delete(gt));
      else if (At === "not-a-file") {
        if (L.lastSeen.has(gt) || L.basePaths === null || L.basePaths.has(gt)) Se.set(gt, null);
      } else if (Buffer.isBuffer(At)) ((ke += At.length), Se.set(gt, At));
      else Se.set(gt, At.link);
    }
    if (!(await XDe(L.base))) return w();
    let Ee = await readBlobsFromGit(L, Se, s, h);
    if (Ee === null) return w();
    let { before: before, fromHost: fromHost, converted: converted, tooLarge: tooLarge } = Ee;
    for (let gt of tooLarge) (Se.delete(gt), we.push(gt));
    let ze = (gt) => !L.lastSeen.has(gt) && (L.basePaths ? !L.basePaths.has(gt) : !0),
      filtered = [
        ...[...Se].filter(([gt, At]) => At !== null && (before.get(gt) ?? null) === null).map(([gt]) => gt),
        ...we,
      ].filter(ze),
      Je = filtered.length > 0 ? await checkIgnoredPaths(L.base, filtered) : new Set();
    if (Je === null) return w();
    let nt = count(we, (gt) => !Je.has(gt)),
      pt = [],
      Et = [],
      yt = performance.now() + RECORDER_POLL_MS;
    for (let [gt, At] of Se) {
      let It = before.get(gt) ?? null;
      if (Je.has(gt) || (It === null && At === null)) continue;
      let Yt =
          At !== null && fromHost.has(gt) && !Emt(At) ? Buffer.from(__(At.toString("utf8")), "utf8") : At,
        qt = converted.get(gt);
      if (
        qt !== void 0 &&
        At !== null &&
        It !== null &&
        !It.includes(`\r
`)
      ) {
        let pn = normalizeCrlf(At) ?? At;
        if (!pn.equals(It) || At.length === qt) Yt = pn;
      }
      if (It !== null && Yt !== null && It.equals(Yt)) {
        rememberFileContent(L, gt, At);
        continue;
      }
      rememberFileContent(L, gt, At);
      let Zt = join_128(e, gt);
      if ((Et.push(Zt), pt.length >= zDe || Emt(It) || Emt(Yt))) continue;
      let rn = P3(gt, gt, It?.toString("utf8") ?? "", Yt?.toString("utf8") ?? "", "", "", {
        context: 3,
        timeout: Math.max(1, yt - performance.now()),
      });
      if (rn === void 0 || !isDiffSmallEnough(rn.hunks)) continue;
      pt.push({
        filePath: Zt,
        hunks: rn.hunks.map((hunk) => ({ ...hunk, lines: hunk.lines.filter((line) => line !== "") })),
        ...(It === null && { created: !0 }),
        ...(Yt === null && { deleted: !0 }),
      });
    }
    if (L.evicted) dS(e);
    if (Et.length === 0 && nt === 0) return y ? { files: [], moreFiles: 0, shared: !0 } : null;
    return {
      files: pt,
      moreFiles: Et.length - pt.length + nt,
      changedFiles: [...Et, ...we.filter((gt) => !Je.has(gt)).map((gt) => join_128(e, gt))].slice(0, jie),
      ...(nt > 0 && { unavailable: !0 }),
      ...(y && { shared: !0 }),
    };
  } catch (error) {
    return (logForDebugging(`bashEditRecorder: ${String(error)}`), w());
  }
}
/**
 * 把被写入的目录展开为其下的已知文件（来自基线列表与上次见过的文件），超过上限或缺少基线时返回 null。
 */
//@ chunk-e6aww6q8.js:4806455-4806859 placement
async function expandDirectoryWrites(e, n) {
  let r = new Set();
  if (n.length > 0 && e.basePaths === null) return null;
  if (n.length === 0) return r;
  let s = await toRepoRelativePaths(
      e,
      n.map((y) => y.slice(0, -1)),
    ),
    h = [];
  for (let y of s.sort()) {
    let S = `${y}/`;
    if (!S.startsWith(h.at(-1) ?? "\x00")) h.push(S);
  }
  if (h.length === 0) return r;
  for (let y of [...(e.basePaths ?? []), ...e.lastSeen.keys()])
    if (isSafeRepoPath(y) && h.some((S) => y.startsWith(S))) {
      if ((r.add(y), r.size > MAX_EXPANDED_PATHS)) return null;
    }
  return r;
}
/**
 * 把绝对写入路径转换为仓库内的安全相对路径（解析父目录真实路径，排除嵌套仓库中的未知文件）。
 */
//@ chunk-e6aww6q8.js:4806859-4807327 placement
async function toRepoRelativePaths(e, n) {
  let realRoot = e.realRoot,
    s = new Set(),
    h = new Map(),
    y = new Map();
  for (let S of n) {
    let w = resolve_60(S);
    if (
      /[\0-\x1f\x7f]/.test(S) ||
      (!w.startsWith(realRoot + sep_72) && !w.startsWith(resolve_60(e.base.repoRoot) + sep_72))
    )
      continue;
    let L = dirname_76(w),
      G = h.get(L);
    if (G === void 0) ((G = await realpathOfNearestAncestor(L)), h.set(L, G));
    if (G === null || (G !== realRoot && !G.startsWith(realRoot + sep_72))) continue;
    let joined = relative_48(realRoot, join_128(G, basename_67(w)))
      .split(sep_72)
      .join("/");
    if (!isSafeRepoPath(joined)) continue;
    if (!e.lastSeen.has(joined) && !e.basePaths?.has(joined) && (await isInsideNestedRepo(G, realRoot, y)))
      continue;
    s.add(joined);
  }
  return [...s];
}
//@ chunk-e6aww6q8.js:4807327-4807540 placement
async function isInsideNestedRepo(e, n, r) {
  let s = [],
    h = !1;
  for (let y = e; y !== n && y.startsWith(n + sep_72); y = dirname_76(y)) {
    let S = r.get(y);
    if (S !== void 0) {
      h = S;
      break;
    }
    if ((s.push(y), await looksLikeGitDir(join_128(y, ".git")))) {
      h = !0;
      break;
    }
  }
  for (let y of s) r.set(y, h);
  return h;
}
//@ chunk-e6aww6q8.js:4807540-4807826 placement
async function looksLikeGitDir(e) {
  let n = await lstat_42(e).catch(() => null);
  if (n === null) return !1;
  if (n.isDirectory())
    return lstat_42(join_128(e, "HEAD")).then(
      (s) => s.isFile(),
      () => !1,
    );
  if (!n.isFile() || n.size > 4096) return !1;
  let r = await statForRecorder(e, 4096);
  return Buffer.isBuffer(r) && r.subarray(0, 7).equals(Buffer.from("gitdir:"));
}
/**
 * 求路径最近的已存在祖先的真实路径并拼回剩余部分（最多 64 层）；出错返回 null。
 */
//@ chunk-e6aww6q8.js:4807826-4808157 placement
async function realpathOfNearestAncestor(e) {
  let n = [],
    r = e;
  for (let s = 0; s < 64; s++) {
    let h = await realpath_38(r).catch((S) =>
      typeof S === "object" && S !== null && "code" in S && (S.code === "ENOENT" || S.code === "ENOTDIR")
        ? null
        : void 0,
    );
    if (h === void 0) return null;
    if (h !== null) return n.length === 0 ? h : join_128(h, ...n.reverse());
    let y = dirname_76(r);
    if (y === r) return null;
    (n.push(basename_67(r)), (r = y));
  }
  return null;
}
/**
 * 用 git cat-file --batch 批量读取 blob 内容。
 */
//@ chunk-e6aww6q8.js:4808157-4809805 placement
async function readBlobsFromGit(e, n, r, s) {
  let h = new Map(),
    y = new Set(),
    S = new Set(),
    w = [];
  for (let we of n.keys()) {
    let Ee = e.lastSeen.get(we),
      Ae = r?.get(join_128(e.base.repoRoot, we));
    if (Ae && Ae.content !== "" && isFullFileView(Ae) && Ae.timestamp < s && (!Ee || Ae.timestamp > Ee.at))
      (h.set(we, Buffer.from(Ae.content, "utf8")), y.add(we));
    else if (Ee) h.set(we, Ee.content);
    else if (e.basePaths && !e.basePaths.has(we)) h.set(we, null);
    else w.push(we);
  }
  if (w.length === 0) return { before: h, fromHost: y, converted: new Map(), tooLarge: S };
  let L = await runGitCapped(
    e.base,
    ["cat-file", "--batch-check"],
    `${w.map((we) => `${e.base.tree}:${we}`).join(`
`)}
`,
  );
  if (L === null) return null;
  let parts = L.toString("utf8").split(`
`),
    q = [[]],
    Z = 0,
    Se = 0;
  for (let [we, Ee] of w.entries()) {
    let Ae = parts[we] ?? "";
    if (Ae === "") return null;
    let parts_2 = Ae.split(" "),
      Me = Number(parts_2.at(-1));
    if (Ae.endsWith(" missing") || parts_2.at(-2) !== "blob") h.set(Ee, null);
    else if (!Number.isInteger(Me) || Me < 0) return null;
    else if (Me > MAX_RECORDED_FILE_BYTES || Se + Me > MAX_RECORD_BATCH_BYTES) S.add(Ee);
    else {
      if (((Se += Me), Z + Me + 128 > MAX_GIT_OUTPUT_BYTES - MAX_RECORDED_FILE_BYTES)) (q.push([]), (Z = 0));
      (q.at(-1).push(Ee), (Z += Me + 128));
    }
  }
  for (let we of q) {
    if (we.length === 0) continue;
    let Ee = await runGitCapped(
      e.base,
      ["cat-file", "--batch"],
      `${we.map((Ie) => `${e.base.tree}:${Ie}`).join(`
`)}
`,
    );
    if (Ee === null) return null;
    let Ae = 0;
    for (let Ie of we) {
      let index = Ee.indexOf(10, Ae);
      if (index === -1) return null;
      let str = Ee.subarray(Ae, index).toString("utf8");
      if (((Ae = index + 1), str.endsWith(" missing"))) {
        h.set(Ie, null);
        continue;
      }
      let parts = str.split(" "),
        lt = Number(parts.at(-1));
      if (!Number.isInteger(lt) || lt < 0 || Ae + lt + 1 > Ee.length) return null;
      (h.set(Ie, parts.at(-2) === "blob" ? Buffer.from(Ee.subarray(Ae, Ae + lt)) : null), (Ae += lt + 1));
    }
  }
  let ke = await findConvertedFiles(
    e.base.repoRoot,
    e.base.gitDirectory,
    w.filter((we) =>
      n.get(we)?.includes(`\r
`),
    ),
  );
  return { before: h, fromHost: y, converted: ke, tooLarge: S };
}
/**
 * 用 git check-ignore --stdin 批量检查哪些路径被忽略，返回被忽略路径集合；git 失败返回 null。
 */
//@ chunk-e6aww6q8.js:4809805-4810136 placement
async function checkIgnoredPaths(e, n) {
  let filtered = n.filter((y) => !y.startsWith(":"));
  if (filtered.length === 0) return new Set();
  let { stdout: stdout, code: code } = await runSnapshotGit(
    e.repoRoot,
    e.gitDirectory,
    ["check-ignore", "-z", "--stdin", "--no-index"],
    { timeout: RECORDER_GIT_TIMEOUT_MS, input: `${filtered.join("\x00")}\x00`, literalPathspecs: !1 },
  );
  return code === 0 || code === 1 ? new Set(stdout.split("\x00").filter((y) => y !== "")) : null;
}
//@ chunk-e6aww6q8.js:4810136-4810394 placement
async function listBaseTreePaths(e) {
  if (!(await XDe(e))) return null;
  let { stdout: stdout, code: code } = await runSnapshotGit(
    e.repoRoot,
    e.gitDirectory,
    ["ls-tree", "-r", "-z", "--name-only", e.tree],
    { timeout: RECORDER_GIT_TIMEOUT_MS, maxBuffer: MAX_BASE_LISTING_BYTES },
  );
  if (code !== 0 || stdout.length >= MAX_BASE_LISTING_BYTES) return null;
  return new Set(stdout.split("\x00").filter(isSafeRepoPath));
}
/**
 * 在快照用的隔离 git 环境中运行 git 命令（可传入标准输入、有超时），输出超过上限时强杀，返回输出或 null。
 */
//@ chunk-e6aww6q8.js:4810394-4810824 placement
async function runGitCapped(e, n, r) {
  try {
    let s = await buildSnapshotGitEnv(
      [gitExe(), ...getSnapshotGitArgs(), ...n],
      getSnapshotGitEnv(e.gitDirectory, e.repoRoot),
      e.gitDirectory,
    );
    if (s === null) return null;
    try {
      let h = safeSpawn(s.file, s.args, {
          cwd: e.repoRoot,
          env: s.env,
          input: r,
          timeout: RECORDER_GIT_TIMEOUT_MS,
          stderr: "ignore",
          windowsHide: !0,
        }),
        y = [],
        S = 0;
      return (
        h.stdout?.on("data", (L) => {
          if (((S += L.length), S > MAX_GIT_OUTPUT_BYTES)) h.kill("SIGKILL");
          else y.push(L);
        }),
        (await h).exitCode === 0 && S <= MAX_GIT_OUTPUT_BYTES ? Buffer.concat(y) : null
      );
    } finally {
      cleanupSandboxAfterGit(s);
    }
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:4810824-4811789 placement
async function statForRecorder(e, n) {
  let r;
  try {
    r = await open_27(
      e,
      constants_27.O_RDONLY |
        (getPlatform() === "windows"
          ? 0
          : (getPlatform() === "macos" ? MAX_TOTAL_RECORD_BYTES : (constants_27.O_NOFOLLOW ?? 0)) |
            (constants_27.O_NONBLOCK ?? 0) |
            (constants_27.O_NOCTTY ?? 0)),
    );
  } catch (error) {
    let h = typeof error === "object" && error !== null && "code" in error ? error.code : void 0;
    if (h === "ENOENT" || h === "ENOTDIR") return "missing";
    if (h === "ELOOP")
      return readlink_12(e, { encoding: "buffer" }).then(
        (y) => (y.length > n ? "too-large" : { link: y }),
        () => "unreadable",
      );
    return h === "EISDIR" || h === "ENXIO" ? "not-a-file" : "unreadable";
  }
  try {
    let stats = await r.stat();
    if (!stats.isFile()) return "not-a-file";
    if (!(await isSameOpenFile(r.fd, e, stats)))
      return (await lstat_42(e).catch(() => null))?.isSymbolicLink() ? "not-a-file" : "unreadable";
    if (stats.size > n) return "too-large";
    let allocUnsafe = Buffer.allocUnsafe(Math.min(n, stats.size) + 1),
      y = 0;
    for (;;) {
      if (y === allocUnsafe.length) {
        if (y > n) return "too-large";
        let allocUnsafe_2 = Buffer.allocUnsafe(Math.min(n + 1, allocUnsafe.length * 2));
        (allocUnsafe.copy(allocUnsafe_2, 0, 0, y), (allocUnsafe = allocUnsafe_2));
      }
      let { bytesRead: bytesRead } = await r.read(allocUnsafe, y, allocUnsafe.length - y);
      if (bytesRead === 0) break;
      y += bytesRead;
    }
    return y > n ? "too-large" : allocUnsafe.subarray(0, y);
  } catch {
    return "unreadable";
  } finally {
    await r.close();
  }
}
//@ chunk-e6aww6q8.js:4811789-4811984 placement
async function isSameOpenFile(e, n, r) {
  if (getPlatform() === "linux") return (await readlink_12(`/proc/self/fd/${e}`).catch(() => null)) === n;
  let s = await lstat_42(n).catch(() => null);
  return s !== null && s.isFile() && s.dev === r.dev && s.ino === r.ino;
}
/**
 * 记住文件的最近内容（LRU）：替换旧记录，总字节超过上限时从最旧开始逐出并标记 evicted。
 */
//@ chunk-e6aww6q8.js:4811984-4812367 placement
function rememberFileContent(e, n, r) {
  let s = e.lastSeen.get(n);
  if (s) ((e.lastSeenBytes -= s.content?.length ?? 0), e.lastSeen.delete(n));
  let h = r?.length ?? 0;
  while (e.lastSeenBytes + h > MAX_LAST_SEEN_BYTES && e.lastSeen.size > 0) {
    let y = e.lastSeen.keys().next().value;
    if (y === void 0) break;
    ((e.lastSeenBytes -= e.lastSeen.get(y)?.content?.length ?? 0), e.lastSeen.delete(y), (e.evicted = !0));
  }
  (e.lastSeen.set(n, { content: r, at: Date.now() }), (e.lastSeenBytes += h));
}
//@ chunk-e6aww6q8.js:4812367-4812407 placement
function Emt(e) {
  return e !== null && Vys(e);
}

export { startEditRecorder, VYn, recordObservedWrites };
