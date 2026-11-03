/**
 * utils/git/gitExclude.ts
 *
 * 2.1.316 新增。.git/info/exclude 追加。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hnzqng4j.js (3), chunk-kxdxf2f6.js (3)
 * attribution: placement 5, sole-consumer 1
 */
import { join, join as join_2, join as join_3, dirname, basename } from "path";
import {
  readFile,
  readFile as readFile_2,
  mkdir,
  mkdir as mkdir_2,
  appendFile,
  lstat,
  open,
} from "fs/promises";
import { constants, fstat, read, write, close } from "fs";
import { promisify } from "util";
import { claimOnce } from "../../services/api/verificationRequired.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { resolveGitDir, getCommonDir } from "./gitFilesystem.js";
import { getErrnoCode, isENOENT } from "../errors.js";
import { findGitRoot } from "../git.js";
import { resolveGitDirs } from "./gitDirResolution.js";
import { logForDebugging } from "../debug.js";
import { getPlatform } from "../platform.js";
import { zq } from "../platformTargets.js";
import { READ_LIMITS } from "../fsBoundRead.js";
import { realpathNativeAsync } from "../windowsUncPaths.js";
import { isSentinelInode } from "../slowOperations.js";

/**
 * Claude Code 在 .claude/ 下写入的运行时文件的 git 忽略规则、标记行与完整规则块。
 */
//@ chunk-hnzqng4j.js:1370-1732 placement
var RUNTIME_EXCLUDE_PATTERNS = [
    "**/.claude/scheduled_tasks.lock",
    "**/.claude/scheduled_tasks.json",
    "**/.claude/routines/.state/",
    "**/.claude/worktrees/",
    "**/.claude/checkpoints/",
    "**/.claude/mailbox/",
    "**/.claude/agent-registry.json",
    "**/.claude/agent-memory-local",
    "**/.claude/first-run",
    "**/.claude/assistant-daemon-state.json",
  ],
  RUNTIME_EXCLUDE_MARKER = "# claude-code-runtime",
  RUNTIME_EXCLUDE_BLOCK = [RUNTIME_EXCLUDE_MARKER, ...RUNTIME_EXCLUDE_PATTERNS, ""].join(`
`);
/**
 * 确保 Claude Code 在 .claude/ 下写的运行时文件被 git 忽略：每个目录只做一次，向公共 git 目录的 info/exclude 追加带标记的规则块（已有标记则跳过）；新路径会先确认 .git 归属与 HEAD/objects 存在，否则记录警告。
 */
//@ chunk-hnzqng4j.js:1732-2869 placement
async function ensureClaudeRuntimeFilesExcluded(cwd) {
  if (!claimOnce().claim(`claude_runtime_exclude_ensured:${cwd}`)) return;
  try {
    if (!readFlagWithOverride(TENGU_MOONLIT_LOCKET, { safe: !0 })) {
      let A = await resolveGitDir(cwd);
      if (!A) return;
      let M = (await getCommonDir(A)) ?? A,
        P = join_3(M, "info", "exclude"),
        z = "";
      try {
        if (((z = await readFile_2(P, "utf-8")), z.includes(RUNTIME_EXCLUDE_MARKER))) return;
      } catch (error) {
        if (getErrnoCode(error) !== "ENOENT") throw error;
        await mkdir_2(join_3(M, "info")).catch((O) => {
          if (getErrnoCode(O) !== "EEXIST") throw O;
        });
      }
      let J =
        z &&
        !z.endsWith(`
`)
          ? `
`
          : "";
      await appendFile(P, J + RUNTIME_EXCLUDE_BLOCK);
      return;
    }
    let s = findGitRoot(cwd);
    if (s === null) return;
    let i = resolveGitDirs(s);
    if (i === null) {
      warnExcludeSkipped(
        join_3(s, ".git", "info", "exclude"),
        "Claude Code could not confirm that this checkout\u2019s .git belongs to it (the .git holds a commondir file, is a symlink, or is a .git file whose git folder does not point back here, as with --separate-git-dir)",
      );
      return;
    }
    let commonDir = i.commonDir,
      w = join_3(commonDir, "info", "exclude"),
      h = await lstat(join_3(commonDir, "HEAD")).catch(() => null),
      d = await lstat(join_3(commonDir, "objects")).catch(() => null);
    if (!h?.isFile() || !d?.isDirectory()) {
      warnExcludeSkipped(
        w,
        "its git folder lacks a HEAD file or an objects folder of its own (a symbolic link does not count)",
      );
      return;
    }
    let v = await appendGitExclude(commonDir, (A) =>
      A.toString("utf-8").includes(RUNTIME_EXCLUDE_MARKER) ? null : RUNTIME_EXCLUDE_BLOCK,
    );
    if (v.kind === "skipped") warnExcludeSkipped(w, v.reason);
  } catch (error) {
    logForDebugging(`ensureClaudeRuntimeFilesExcluded: ${error}`);
  }
}
//@ chunk-hnzqng4j.js:2869-3042 sole-consumer
function warnExcludeSkipped(n, s) {
  logForDebugging(
    `Not adding ignore rules for the files Claude Code writes under .claude/ to ${n}: ${s}. Those files may show as untracked in git status.`,
    { level: "warn" },
  );
}
//@ chunk-kxdxf2f6.js:663-704 placement
var TENGU_MOONLIT_LOCKET = "tengu_moonlit_locket",
  H = 1048576;
/**
 * 向 .git/info/exclude 追加条目（避免把 Claude 产生的文件纳入版本控制）。
 */
//@ chunk-kxdxf2f6.js:704-4708 placement
async function appendGitExclude(t, h) {
  let p = join(t, "info"),
    m = join(p, "exclude"),
    l = readFlagWithOverride(TENGU_MOONLIT_LOCKET, { safe: !0 }),
    g = getPlatform() === "windows",
    E,
    s,
    y,
    r;
  try {
    let A = constants.O_RDWR | constants.O_APPEND | zq() | READ_LIMITS,
      C = g || !l ? void 0 : globalThis.Bun?.ant?.posixFsAt,
      d =
        typeof C?.openat === "function" && typeof C.mkdirat === "function" && typeof C.lstatat === "function"
          ? C
          : void 0,
      B = constants.O_RDONLY | constants.O_DIRECTORY | zq() | READ_LIMITS,
      f,
      O = [constants.O_CREAT];
    if (d !== void 0) {
      try {
        E = await open(t, B);
      } catch (error) {
        let n = getErrnoCode(error);
        if (n === "ELOOP" || n === "ENOTDIR")
          return { kind: "skipped", reason: "the git folder is a link or not a folder" };
        throw error;
      }
      try {
        d.mkdirat(E.fd, "info");
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      }
      try {
        s = d.openat(E.fd, "info", B);
      } catch (error) {
        let n = getErrnoCode(error);
        if (n === "ELOOP" || n === "ENOTDIR")
          return { kind: "skipped", reason: "its parent folder is a link or not a folder" };
        throw error;
      }
    } else {
      let e = null;
      if (l && g) {
        let [n, u] = await Promise.all([realpathNativeAsync(t), realpathNativeAsync(dirname(t))]);
        if (u === null || !Y(n, join(u, basename(t))))
          return { kind: "skipped", reason: "the git folder is a link or could not be resolved" };
        e = n;
      }
      if (
        (await mkdir(p).catch((n) => {
          if (getErrnoCode(n) !== "EEXIST") throw n;
        }),
        (f = await lstat(p, { bigint: !0 })),
        !f.isDirectory() || (e !== null && !Y(await realpathNativeAsync(p), join(e, "info"))))
      )
        return { kind: "skipped", reason: "its parent folder is a link or not a folder" };
      if (l && isSentinelInode(f.ino))
        return {
          kind: "skipped",
          reason:
            "this drive gives folders no file id, so Claude Code cannot confirm afterwards that the info folder was not swapped",
        };
      try {
        let n = await lstat(m);
        if (!n.isFile())
          return {
            kind: "skipped",
            reason: n.isSymbolicLink() ? "it is a symlink" : "it is not a regular file",
          };
        O = [0];
      } catch (error) {
        if (!isENOENT(error))
          return {
            kind: "skipped",
            reason: `Claude Code could not check it (${getErrnoCode(error) ?? String(error)})`,
          };
        O = [constants.O_CREAT | constants.O_EXCL, 0];
      }
    }
    for (let [e, n] of O.entries())
      try {
        if (d !== void 0 && s !== void 0) r = d.openat(s, "exclude", A | n, 420);
        else ((y = await open(m, A | n, 420)), (r = y.fd));
        break;
      } catch (error) {
        let i = getErrnoCode(error);
        if (i === "EEXIST" && e < O.length - 1) continue;
        if (i === "ELOOP") return { kind: "skipped", reason: "it is a symlink" };
        if (i === "EISDIR" || i === "ENXIO") return { kind: "skipped", reason: "it is not a regular file" };
        if (i === "EEXIST" || i === "ENOENT")
          return { kind: "skipped", reason: "it was replaced or removed while Claude Code was opening it" };
        if (i === "EACCES" || i === "EPERM" || i === "EROFS") {
          let v = await open(m, constants.O_RDONLY | zq() | READ_LIMITS);
          try {
            let stats = await v.stat();
            if (!stats.isFile() || stats.nlink > 1 || stats.size > H)
              return { kind: "skipped", reason: "it cannot be written to" };
            let alloc = Buffer.alloc(stats.size),
              { bytesRead: bytesRead } = await v.read(alloc, 0, alloc.length, 0);
            return h(alloc.subarray(0, bytesRead)) === null
              ? { kind: "present" }
              : { kind: "skipped", reason: "it cannot be written to" };
          } finally {
            await v.close();
          }
        }
        throw error;
      }
    if (r === void 0)
      return { kind: "skipped", reason: "it was replaced or removed while Claude Code was opening it" };
    let o = await promisify(fstat)(r, { bigint: !0 }),
      c;
    try {
      c = d !== void 0 && s !== void 0 ? d.lstatat(s, "exclude") : await lstat(m, { bigint: !0 });
    } catch (error) {
      if (!isENOENT(error)) throw error;
      return { kind: "skipped", reason: "it was replaced or removed while Claude Code was opening it" };
    }
    if (!o.isFile() || !c.isFile()) return { kind: "skipped", reason: "it is not a regular file" };
    if (l && isSentinelInode(o.ino))
      return {
        kind: "skipped",
        reason:
          "this drive gives files no id, so Claude Code cannot confirm it is writing to the file it checked",
      };
    if ((l || g) && (c.dev !== o.dev || c.ino !== o.ino))
      return { kind: "skipped", reason: "it was replaced or removed while Claude Code was opening it" };
    if (o.nlink > 1n || c.nlink > 1n) return { kind: "skipped", reason: "it has more than one hard link" };
    if (o.size > H) return { kind: "skipped", reason: "it is larger than 1 MiB" };
    if (l && f !== void 0) {
      let e = await lstat(p, { bigint: !0 });
      if (!e.isDirectory() || e.dev !== f.dev || e.ino !== f.ino)
        return { kind: "skipped", reason: "its parent folder was replaced while Claude Code was opening it" };
    }
    let alloc = Buffer.alloc(Number(o.size)),
      { bytesRead: bytesRead } = await promisify(read)(r, alloc, 0, alloc.length, 0),
      chunk = alloc.subarray(0, bytesRead),
      X = h(chunk);
    if (X === null) return { kind: "present" };
    let K =
        chunk.length > 0 && chunk.at(-1) !== 10
          ? `
`
          : "",
      buffer = Buffer.from(K + X),
      T = g ? Number(o.size) : null,
      b = 0;
    while (b < buffer.length) {
      let { bytesWritten: bytesWritten } = await promisify(write)(r, buffer, b, buffer.length - b, T);
      if (bytesWritten <= 0) throw Error("info/exclude: the write stopped making progress");
      if (((b += bytesWritten), T !== null)) T += bytesWritten;
    }
    return { kind: "written" };
  } finally {
    await Promise.all([
      E?.close(),
      s !== void 0 ? promisify(close)(s) : void 0,
      y !== void 0 ? y.close() : r !== void 0 ? promisify(close)(r) : void 0,
    ]).catch(() => {});
  }
}
//@ chunk-kxdxf2f6.js:4708-4747 placement
function Y(t, h) {
  return t !== null && t === h;
}

export { appendGitExclude, ensureClaudeRuntimeFilesExcluded };
