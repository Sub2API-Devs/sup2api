/**
 * utils/worktree/worktreeRegistrations.ts
 *
 * 2.1.316 新增：工作树登记
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (13)
 * attribution: placement 13
 */
import {
  parse,
  parse as parse_2,
  parse as parse_3,
  parse as parse_4,
  parse as parse_5,
  parse as parse_6,
  parse as parse_7,
  parse as parse_8,
  parse as parse_9,
  parse as parse_10,
  parse as parse_11,
  parse as parse_12,
  parse as parse_13,
  parse as parse_14,
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
  normalize,
  normalize as normalize_2,
  normalize as normalize_3,
  normalize as normalize_4,
  normalize as normalize_5,
  normalize as normalize_6,
  normalize as normalize_7,
  normalize as normalize_8,
  normalize as normalize_9,
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
} from "fs/promises";
import { Re } from "../../../runtime/bun-runtime.js";
import { Vpe } from "../../../vendor/ignore/index.js";
import { setRepoDetectionGuards } from "../detectRepository.js";
import { checkHasTrustDialogAccepted } from "../config.js";
import { getPlatform } from "../platform.js";
import {
  normalizePathKey,
  Tc,
  hasDistinctWorktreePaths,
  findWorktreeMatchingPaths,
  P1,
  findSamePath,
  isRemovableWorktreeDir,
  KJr,
  clearReparsePoints,
} from "../pathIdentity.js";
import { getErrnoCode } from "../errors.js";
import { isSameRepository, vetWorktree } from "../git/worktreeVetting.js";
import { logForDebugging } from "../debug.js";
import { deregisterWorktree } from "../git/worktreeRegistrations.js";
import { findCanonicalGitRootUncached, gitExe } from "../git.js";
import { NOT_A_GIT_REPO_PATH, resolveGitDirsOrPlaceholder } from "../git/gitDirResolution.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { uT, cl } from "../pathClassification.js";
import { iM } from "../fsJunctions.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { freeze as freeze_23 } from "../git/gitSafeEnv.js";
import { gitSupportsPartialCloneFetch } from "./partialClone.js";
import { isOnForeignMount } from "../networkPaths.js";
import { removeWorktreeSafely, worktreeRemovalText } from "../git/worktreeRemoval.js";

//@ chunk-e6aww6q8.js:3574892-3574912 placement
var pMn = Re(Vpe(), 1);
//@ chunk-e6aww6q8.js:3575265-3575301 placement
function HPn() {
  setRepoDetectionGuards({ trustProbe: checkHasTrustDialogAccepted });
}
//@ chunk-e6aww6q8.js:3575301-3575389 placement
var BPn = /^(?:remote: )?[^:'"]+:\s+\d{1,3}% \(\d+\/\d+\)(?:,[\p{L}\p{N}\p{M} .,|/]*)?$/u;
//@ chunk-e6aww6q8.js:3575389-3575616 placement
function stripProgressLines(e) {
  let n = [];
  for (let r of e.split(/\r?\n/)) {
    let parts = r.split("\r");
    if (!parts.some((y) => BPn.test(y))) {
      n.push(r);
      continue;
    }
    let filtered = parts.filter((y) => y !== "" && !BPn.test(y));
    if (filtered.length > 0) n.push(filtered.join("\r"));
  }
  return n
    .join(
      `
`,
    )
    .trim();
}
//@ chunk-e6aww6q8.js:3575616-3575640 placement
function mXn() {
  return !1;
}
//@ chunk-e6aww6q8.js:3575827-3575912 placement
function KV(e) {
  return getPlatform() === "windows" ? e.replace(/^[A-Za-z]:/, (n) => n.toLowerCase()) : e;
}
//@ chunk-e6aww6q8.js:3575912-3575923 placement
var cIr = 40;
/**
 * 逐段解析路径中的符号链接（限制跳转次数），处理 .. 与 Windows 规范化，得到真实路径；无法解析时返回 unresolvable。
 */
//@ chunk-e6aww6q8.js:3575923-3577026 placement
async function resolvePathThroughLinks(targetPath, n) {
  let root = parse_11(targetPath).root,
    filtered = targetPath.slice(root.length).split(sep_54).filter(Boolean),
    mapped = filtered.map((Se, ke) => ({ name: Se, original: ke })),
    resolved = root,
    S = -1,
    w = 0,
    L = KV(n),
    G = normalizePathKey(n),
    q = getPlatform() === "windows",
    Z = (Se) =>
      (q ? normalize_8(Se) : Se)
        .split(q ? /[\\/]/ : sep_54)
        .filter((ke) => ke !== "" && ke !== ".")
        .map((ke) => ({ name: ke, original: null }));
  while (mapped.length > 0) {
    let Se = mapped.shift();
    if (Se === void 0) break;
    if (Se.original !== null) S = Se.original;
    if (Se.name === "..") resolved = dirname_52(resolved);
    else {
      resolved = join_92(resolved, Se.name);
      let Ee = await readlink_6(resolved).then(
        (Ie) => Ie,
        (Ie) => (getErrnoCode(Ie) === "EINVAL" ? null : void 0),
      );
      if (Ee === void 0) return { kind: "unresolvable" };
      if (Ee !== null) {
        if (++w > cIr) return { kind: "unresolvable" };
        if (isAbsolute_47(Ee)) {
          let root = parse_11(Ee).root;
          ((resolved = root), mapped.unshift(...Z(Ee.slice(root.length))));
        } else ((resolved = dirname_52(resolved)), mapped.unshift(...Z(Ee)));
        continue;
      }
      let Ae = await realpath_29(resolved).catch(() => null);
      if (Ae === null) return { kind: "unresolvable" };
      resolved = Tc(normalize_8(Ae));
    }
    let ke = KV(Tc(resolved));
    if (ke === L) {
      let Ee = mapped[0];
      if (Ee !== void 0 && Ee.original === null) return { kind: "inside" };
      return { kind: "root", rootUnder: root + filtered.slice(0, S + 1).join(sep_54) };
    }
    if (ke.startsWith(L + sep_54)) return { kind: "inside" };
    let we = normalizePathKey(resolved);
    if (we === G || we.startsWith(G + sep_54)) return { kind: "inside" };
  }
  return { kind: "outside", resolved: resolved };
}
/**
 * 移除工作树后注销其在仓库中的登记，仓库不一致时保留登记并记录原因。
 */
//@ chunk-e6aww6q8.js:3577026-3577478 placement
async function deregisterRemovedWorktree(e, n, r, s) {
  let h = await isSameRepository(e, n);
  if ("refused" in h) logForDebugging(`Kept worktree registration of ${r}: ${h.refused}`, { level: "warn" });
  let y =
    "refused" in h
      ? { outcome: "kept", reason: h.refused }
      : await deregisterWorktree(
          h.gitDir,
          { worktreePath: r, repoSpelled: e },
          { locked: s === !0 ? "drop" : "keep" },
        );
  return y.outcome === "dropped"
    ? { outcome: "removed" }
    : y.outcome === "none"
      ? { outcome: "unregistered", reason: `the drop found no registration of ${r} in ${n}` }
      : { outcome: "kept", reason: y.reason };
}
//@ chunk-e6aww6q8.js:3577478-3578384 placement
async function vetWorktreeRegistration(e) {
  let n = e,
    r = await vetWorktree(e, { dotGitLink: "vet" });
  if ("skipped" in r && r.skipped === "pointer") {
    let S = findCanonicalGitRootUncached(e);
    if (S !== null && S !== e) ((n = S), (r = await vetWorktree(S, { dotGitLink: "vet" })));
  }
  if ("skipped" in r)
    return r.skipped === "gone" || r.skipped === "not-a-repository"
      ? { ok: !1, outcome: "unlisted", reason: r.why }
      : {
          ok: !1,
          outcome: "kept",
          reason: `the repository's worktree registrations cannot be vetted before git lists them (${r.why})`,
        };
  let s = r.refused.entries().next().value;
  if (s !== void 0) {
    let [S, w] = s;
    return {
      ok: !1,
      outcome: "kept",
      reason: `a registered worktree cannot be vetted before git lists them (${r.refused.size} refused; ${S}: ${w})`,
    };
  }
  let [h, y] = await Promise.all([
    stat_19(r.gitDir, { bigint: !0 }).catch(() => null),
    realpath_29(r.gitDir).catch(() => null),
  ]);
  if (h === null)
    return {
      ok: !1,
      outcome: "kept",
      reason: `${r.gitDir} could not be read after its worktree registrations were checked`,
    };
  return { ok: !0, gitDir: r.gitDir, root: n, dev: h.dev, ino: h.ino, real: y };
}
/**
 * 在运行 git 前确认仓库的 git 目录与公共目录仍是先前固定的那个（比较 dev/ino 或 realpath），否则拒绝运行。
 */
//@ chunk-e6aww6q8.js:3578384-3579236 placement
async function verifyPinnedGitDir(pinned, n) {
  if (n?.gitDir === NOT_A_GIT_REPO_PATH)
    return {
      refused: "unpinned",
      reason: "git was not run: the repository's .git could not be confirmed to lead to its git directory",
    };
  let r = pinned.dev !== 0n && pinned.ino !== 0n && pinned.ino !== -1n && pinned.ino !== 0xffffffffffffffffn,
    s = async (S) => {
      if (r)
        return stat_19(S, { bigint: !0 }).then(
          (L) => L.dev === pinned.dev && L.ino === pinned.ino,
          () => {
            return;
          },
        );
      let w = await realpath_29(S).catch(() => null);
      return w === null || pinned.real === null ? void 0 : w === pinned.real;
    },
    [h, y] = await Promise.all([s(pinned.gitDir), n === void 0 ? !0 : s(n.commonDir)]);
  if (h === void 0 || y === void 0)
    return {
      refused: "changed",
      reason:
        "git was not run: the repository's git directory could not be read right before git would have run",
    };
  if (!h || !y)
    return {
      refused: "changed",
      reason:
        "git was not run: the repository's git directory changed after its worktree registrations were checked",
    };
  return { env: getRemoteHostSessionCount({ GIT_COMMON_DIR: pinned.gitDir }, { repository: n }) };
}
/**
 * 清理与校验 worktree 登记（Windows 设备路径、. 与 .. 组件等）。
 */
//@ chunk-e6aww6q8.js:3579236-3583865 placement
async function pruneWorktreeRegistrations(e, n, r = {}) {
  let found = [n, e].find((Et) => /^[\\/]{3}/.test(Et) || uT(Et) || iM(Et));
  if (found !== void 0) {
    let Et = `${found} is spelled in a Windows device form (such as \\\\?\\C:\\) or starts with three or more separators, a form git never records a worktree in`;
    return (logForDebugging(`Kept worktree ${n}: ${Et}`, { level: "warn" }), { outcome: "kept", reason: Et });
  }
  let h = gitExe(),
    y = (Et) => (
      logForDebugging(`Kept worktree ${n}: ${Et}`, { level: "warn" }),
      { outcome: "kept", reason: Et }
    ),
    found_2 = [n, e].find(cl);
  if (found_2 !== void 0)
    return y(`${found_2 === n ? "" : "the repository root "}${found_2} holds a "." or ".." component`);
  let w = await realpath_29(e).catch(() => null),
    L = Tc(normalize_8(n)),
    G = Tc(normalize_8(e)),
    q = w === null ? null : Tc(normalize_8(w)),
    Z = KV(L).startsWith(KV(G) + sep_54) ? G : void 0,
    Se =
      Z !== void 0
        ? void 0
        : [G, ...(q === null || q === G ? [] : [q])].find(
            (Et) =>
              !KV(L).startsWith(KV(Et) + sep_54) &&
              normalizePathKey(L).startsWith(normalizePathKey(Et) + sep_54),
          );
  if (Se !== void 0)
    return y(`${n} begins with the repository root ${Se} spelled in a different case or Unicode form`);
  let ke = null;
  if (Z === void 0 && q !== null && isAbsolute_47(L)) {
    let Et = await resolvePathThroughLinks(dirname_52(L), q);
    switch (Et.kind) {
      case "root":
        Z = Et.rootUnder;
        break;
      case "inside":
        return y(`${n} is spelled outside the repository root but resolves through or under it`);
      case "outside":
        ke = Et.resolved;
        break;
      case "unresolvable":
        ke = null;
        break;
    }
  }
  let we,
    Ee,
    Ae = await vetWorktreeRegistration(e);
  if (!Ae.ok) {
    if (Ae.outcome === "kept") return y(Ae.reason);
    return (
      logForDebugging(`Worktree ${n} not listed: ${Ae.reason}`, { level: "warn" }),
      { outcome: "unlisted", reason: Ae.reason }
    );
  }
  let Ie = await isSameRepository(Ae.root, Ae.gitDir);
  if ("refused" in Ie) return y(Ie.refused);
  let Me = async (Et) => {
      let yt = await verifyPinnedGitDir(Ae, r.pinRepository ? resolveGitDirsOrPlaceholder(e) : void 0);
      return "refused" in yt ? yt : execFileNoThrowWithCwd(h, [...freeze_23, ...Et], { cwd: e, env: yt.env });
    },
    We = ["--git-dir", Ae.gitDir],
    lt = (await gitSupportsPartialCloneFetch(e))
      ? await Me([...We, "worktree", "list", "--porcelain", "-z"])
      : null;
  if (lt !== null && "refused" in lt) {
    if (lt.refused === "unpinned")
      return (
        logForDebugging(`Worktree ${n} not listed: ${lt.reason}`, { level: "warn" }),
        { outcome: "unlisted", reason: lt.reason }
      );
    return y(lt.reason);
  }
  let Je = lt;
  if (Je !== null && Je.code === 0) {
    if (!hasDistinctWorktreePaths(Je.stdout))
      return y(
        "git's worktree list holds a record git would not write (a path listed twice, or a spelling that is not absolute and plain)",
      );
    let filtered = [
        L,
        ...(Z === void 0 && ke !== null
          ? [join_92(ke, basename_52(L))]
          : Z !== void 0 && w !== null
            ? [Tc(w) + L.slice(Z.length)]
            : []),
      ].filter((It, Yt, qt) => qt.indexOf(It) === Yt),
      yt = findWorktreeMatchingPaths(Je.stdout, filtered);
    if (yt === null) {
      let It = await P1(L, Z === void 0 ? e : L.slice(0, Z.length));
      if (It === "link" || It === "unknown")
        return y(
          `git lists no worktree at ${filtered.join(" or ")}, and the path has a link in a component, or one that cannot be probed`,
        );
      let Yt = `git lists no worktree at ${filtered.join(" or ")}`;
      return (
        logForDebugging(`Unregistered worktree ${n}: ${Yt}`, { level: "warn" }),
        { outcome: "unregistered", reason: Yt }
      );
    }
    if (findSamePath(yt, [e, ...(w === null ? [] : [w])]) !== null) return y(`${yt} names the main worktree`);
    if (isOnForeignMount(yt, e)) return y(`${yt} is on another host`);
    let gt = await P1(yt, e);
    if (gt === "missing") return deregisterRemovedWorktree(Ae.root, Ae.gitDir, yt, r.forceTwice);
    if (gt !== "clear") return y(`${yt} has a link in a component, or one that cannot be probed`);
    let At = await realpath_29(yt).catch(() => null);
    if (At === null) return y(`${yt} does not resolve`);
    if (w !== null && Tc(At) === Tc(w)) return y(`${yt} resolves to the main worktree`);
    if (!(await isRemovableWorktreeDir(yt, At, e)))
      return y(`${yt} is not intact (a link may have been introduced)`);
    ((we = yt), (Ee = KJr(yt)));
  } else if (Je !== null) {
    let Et = `could not read git's worktree list: ${Je.stderr.trim()}`;
    return (
      logForDebugging(`Worktree ${n} not listed: ${Et}`, { level: "warn" }),
      { outcome: "unlisted", reason: Et }
    );
  } else {
    if (findSamePath(n, [e, ...(w === null ? [] : [w])]) !== null) return y(`${n} names the main worktree`);
    let Et, yt;
    if (Z !== void 0 && Z === G) ((Et = L), (yt = L.slice(0, Z.length)));
    else if (Z !== void 0 && w !== null) ((yt = Tc(w)), (Et = yt + L.slice(Z.length)));
    else {
      if (ke === null) return y(`${n}'s parent does not resolve`);
      ((Et = join_92(ke, basename_52(L))), (yt = ke));
    }
    let gt = await P1(Et, yt);
    if (gt === "missing") return deregisterRemovedWorktree(Ae.root, Ae.gitDir, Et, r.forceTwice);
    if (gt !== "clear") return y(`${Et} is a link, or cannot be probed`);
    let At = await realpath_29(Et).catch(() => null);
    if (At !== null && w !== null && Tc(At) === Tc(w)) return y(`${Et} resolves to the main worktree`);
    if (At === null || !(await isRemovableWorktreeDir(Et, At, yt))) return y(`${Et} is not intact`);
    ((we = Et), (Ee = Et));
  }
  if (!(await clearReparsePoints(we))) return y(`${we} holds a reparse point that could not be removed`);
  let nt = await removeWorktreeSafely(e, we, {
    forceTwice: r.forceTwice === !0,
    git: { dir: Ie.gitDir, root: Ae.root },
    deregisterIfStopped: r.deregisterIfStopped === !0,
  });
  if (nt.outcome === "removed") return { outcome: "removed" };
  if (nt.outcome === "not_registered" || nt.outcome === "refused") return y(worktreeRemovalText(nt));
  if (nt.outcome !== "unanchored")
    return { outcome: "failed", stderr: worktreeRemovalText(nt), checkout: nt.outcome };
  let pt = await Me([...We, "worktree", "remove", "--force", ...(r.forceTwice ? ["--force"] : []), Ee]);
  if ("refused" in pt) return y(pt.reason);
  return pt.code === 0 ? { outcome: "removed" } : { outcome: "failed", stderr: pt.stderr };
}
//@ chunk-e6aww6q8.js:3583865-3583881 placement
var PAe = new Map();

export {
  mXn,
  vetWorktreeRegistration,
  verifyPinnedGitDir,
  stripProgressLines,
  pMn,
  pruneWorktreeRegistrations,
  HPn,
  PAe,
};
