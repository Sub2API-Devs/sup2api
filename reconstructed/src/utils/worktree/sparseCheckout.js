/**
 * utils/worktree/sparseCheckout.ts
 *
 * 2.1.316 新增：稀疏检出
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import {
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
  posix,
  posix as posix_2,
  posix as posix_3,
  posix as posix_4,
  posix as posix_5,
  posix as posix_6,
  posix as posix_7,
  posix as posix_8,
  posix as posix_9,
  posix as posix_10,
  posix as posix_11,
  posix as posix_12,
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
} from "path";
import {
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
  mkdtemp,
  mkdtemp as mkdtemp_2,
  mkdtemp as mkdtemp_3,
  mkdtemp as mkdtemp_4,
  mkdtemp as mkdtemp_5,
  mkdtemp as mkdtemp_6,
  mkdtemp as mkdtemp_7,
  mkdtemp as mkdtemp_8,
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
  rm as rm_6,
  rm as rm_7,
  rm as rm_8,
  rm as rm_9,
  rm as rm_10,
  rm as rm_11,
  rm as rm_12,
  rm as rm_13,
  rm as rm_14,
  rm as rm_15,
  rm as rm_16,
  rm as rm_17,
  rm as rm_18,
  rm as rm_19,
  rm as rm_20,
  rm as rm_21,
  rm as rm_22,
  rm as rm_23,
  rm as rm_24,
  rm as rm_25,
  rm as rm_26,
  rm as rm_27,
} from "fs/promises";
import {
  tmpdir as tmpdir_2,
  tmpdir as tmpdir_3,
  tmpdir as tmpdir_4,
  tmpdir as tmpdir_5,
  tmpdir as tmpdir_6,
} from "os";
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { freeze as freeze_23 } from "../git/gitSafeEnv.js";
import { buildGitEnvForRepo, resolveGitDirsOrPlaceholder } from "../git/gitDirResolution.js";
import { readPositionIsUnsafe } from "../git/gitFilesystem.js";
import { nonblockingReadFlags, readHandleUpTo } from "../fsOperations.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { pot, bIr } from "./partialClone.js";
import { truncateMiddle as truncateMiddle_2 } from "../../memdir/memoryTool.js";
import { hideUnsafeText } from "../unsafePathGlyphs.js";
import { stripProgressLines } from "./worktreeRegistrations.js";
import { firstLineOf } from "../stringUtils.js";
import { SandboxManager, getEffectiveFilesystemPolicy } from "../sandbox/sandbox-adapter.js";

//@ chunk-e6aww6q8.js:3591246-3591456 placement
async function uploadPackArgForRemote(e, n) {
  let r = await execFileNoThrowWithCwd(
      gitExe(),
      [...freeze_23, "config", "--local", "--get", `remote.${n}.uploadpack`],
      { cwd: e, env: buildGitEnvForRepo(e), stdin: "ignore" },
    ),
    trimmed = r.stdout.trim();
  return r.code === 0 && trimmed !== "" ? `--upload-pack=${trimmed}` : void 0;
}
/**
 * 根据 sparse-checkout 模式生成需要检出的 .gitattributes 路径模式。
 */
//@ chunk-e6aww6q8.js:3591456-3591870 placement
function gitattributesSparsePatterns({ text: text, cone: cone }) {
  let filtered = text
      .toString()
      .split(
        `
`,
      )
      .map((y) => y.replace(/\r$/, ""))
      .filter((y) => y !== "" && !y.startsWith("#")),
    s = /^\/\*$|^!?\/.*\/$/;
  if (!cone || filtered.some((y) => !s.test(y)))
    return `.gitattributes
`;
  let h = new Set(["/.gitattributes"]);
  for (let y of filtered) {
    let S = /^\/(.*)\/$/.exec(y)?.[1],
      w = S ? S.split("/") : [];
    for (let L = 1; L < w.length; L++) h.add(`/${w.slice(0, L).join("/")}/.gitattributes`);
  }
  return [...h, ""].join(`
`);
}
//@ chunk-e6aww6q8.js:3591870-3591886 placement
var QPn = 1048576;
//@ chunk-e6aww6q8.js:3591886-3592665 placement
async function readSparseCheckoutConfig(e) {
  let n = (L) =>
      execFileNoThrowWithCwd(gitExe(), [...freeze_23, ...L], {
        cwd: e,
        env: buildGitEnvForRepo(e),
        stdin: "ignore",
      }),
    r = await n(["config", "--type=bool", "--get-regexp", "^core\\.sparsecheckout(cone)?$"]),
    s = (L) => [...r.stdout.matchAll(new RegExp(`^core\\.${L} (\\S+)$`, "gim"))].at(-1)?.[1] === "true";
  if (r.code !== 0 || !s("sparsecheckout")) return null;
  let h = await n(["rev-parse", "--git-path", "info/sparse-checkout"]);
  if (h.code !== 0) return null;
  let y = s("sparsecheckoutcone"),
    S = y
      ? `/*
!/*/
`
      : "",
    w = resolve_38(e, h.stdout.trim());
  if (readPositionIsUnsafe(w, resolveGitDirsOrPlaceholder(e).gitDir)) return null;
  try {
    await using L = await open_18(w, nonblockingReadFlags());
    let stats = await L.stat();
    if (!stats.isFile() || stats.size > QPn) return null;
    let q = await readHandleUpTo(L, QPn, "file"),
      equals = q.subarray(0, 3).equals(Buffer.from([239, 187, 191]));
    return { text: Buffer.concat([Buffer.from(S), q.subarray(equals ? 3 : 0)]), cone: y };
  } catch {
    return null;
  }
}
/**
 * 把稀疏检出路径规范化并合并为最少的目录集合，含非法路径时返回 null。
 */
//@ chunk-e6aww6q8.js:3592665-3593207 placement
function minimalSparseDirs(paths) {
  let filtered = paths
    .map((S) => posix_10.normalize(S.replace(/\\/g, "/")).replace(/^\/+/, "").replace(/\/+$/, ""))
    .filter((S) => S !== "" && S !== ".");
  if (filtered.length < paths.length) return null;
  let roots = [];
  for (let S of [...filtered].sort()) if (!roots.some((w) => S === w || S.startsWith(`${w}/`))) roots.push(S);
  let s = new Set();
  for (let S of roots) {
    let parts = S.split("/");
    for (let L = 1; L < parts.length; L++) s.add(parts.slice(0, L).join("/"));
  }
  let h = (S) => S.replace(/[*?[\\]/g, "\\$&");
  return {
    text: [
      "/*",
      "!/*/",
      ...[...s].sort().flatMap((S) => [`/${h(S)}/`, `!/${h(S)}/*/`]),
      ...roots.map((S) => `/${h(S)}/`),
      "",
    ].join(`
`),
    cone: !0,
  };
}
//@ chunk-e6aww6q8.js:3593207-3593326 placement
async function hasMissingSparseObjects(e, n, r) {
  await using s = await writeSparsePatterns(e, r);
  let missing = await s.missing(n);
  return typeof missing === "string" || missing.length > 0;
}
//@ chunk-e6aww6q8.js:3593326-3594255 placement
async function writeSparsePatterns(e, n) {
  let r =
      n === null
        ? null
        : await mkdtemp_6(join_93(tmpdir_5(), "claude-sparse-")).catch(
            (h) => (
              logForDebugging(
                `[worktree] could not make a side directory for the sparse patterns (${errorMessage(h)}); listing the whole tree`,
                { level: "warn" },
              ),
              null
            ),
          ),
    s = null;
  if (r !== null && n !== null) {
    let h = await execFileNoThrowWithCwd(gitExe(), [...freeze_23, "hash-object", "-w", "--stdin"], {
      cwd: e,
      env: buildGitEnvForRepo(e, { GIT_OBJECT_DIRECTORY: r }),
      input: Buffer.concat([
        Buffer.from(n.text),
        Buffer.from(`
${gitattributesSparsePatterns(n)}# ${randomUUID_41()}
`),
      ]),
    });
    if (((s = h.code === 0 ? h.stdout.trim() : null), s === null))
      logForDebugging(
        `[worktree] could not hand git the sparse patterns (${h.stderr.trim()}); listing the whole tree`,
        { level: "warn" },
      );
  }
  return {
    async missing(h) {
      if (s !== null && r !== null) {
        let y = await listMissingObjects(e, h, { filter: s, side: r });
        if (typeof y !== "string" || y === pot) return y;
      }
      return listMissingObjects(e, h);
    },
    async [Symbol.asyncDispose]() {
      if (r !== null)
        await rm_20(r, { recursive: !0, force: !0 }).catch((h) =>
          logForDebugging(
            `[worktree] could not remove the sparse patterns' side directory ${r}: ${errorMessage(h)}`,
            { level: "warn" },
          ),
        );
    },
  };
}
/**
 * 用 rev-list --missing=print 列出提交缺失的对象，失败时返回错误说明。
 */
//@ chunk-e6aww6q8.js:3594255-3594818 placement
async function listMissingObjects(cwd, commit, sparseFilter) {
  let result = await execFileNoThrowWithCwd(
    gitExe(),
    [
      ...freeze_23,
      ...(sparseFilter ? ["-c", "core.sparseCheckoutCone=false"] : []),
      "rev-list",
      "--objects",
      "--quiet",
      "--missing=print",
      "--no-walk",
      ...(sparseFilter ? [`--filter=sparse:oid=${sparseFilter.filter}`] : []),
      commit,
      "--",
    ],
    {
      cwd: cwd,
      env: buildGitEnvForRepo(cwd, sparseFilter && { GIT_ALTERNATE_OBJECT_DIRECTORIES: sparseFilter.side }),
      stdin: "ignore",
      maxBuffer: bIr,
    },
  );
  if (result.code !== 0)
    return (
      logForDebugging(`[worktree] could not list the missing objects of ${commit}: ${result.stderr}`, {
        level: "warn",
      }),
      result.maxBufferExceeded
        ? pot
        : truncateMiddle_2(hideUnsafeText(stripProgressLines(result.stderr), "git's error"))
    );
  return result.stdout
    .split(
      `
`,
    )
    .filter((h) => h.startsWith("?"))
    .map((h) => firstLineOf(h.slice(1), " "));
}
//@ chunk-e6aww6q8.js:3594848-3594932 placement
function rMn() {
  try {
    return SandboxManager.isSandboxingEnabled() && getEffectiveFilesystemPolicy() === "strict";
  } catch {
    return !0;
  }
}

export {
  rMn,
  readSparseCheckoutConfig,
  hasMissingSparseObjects,
  minimalSparseDirs,
  writeSparsePatterns,
  uploadPackArgForRemote,
};
