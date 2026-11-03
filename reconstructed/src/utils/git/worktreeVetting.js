/**
 * utils/git/worktreeVetting.ts
 *
 * 2.1.316 新增：worktree 目录与 gitdir 校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2xm1rxms.js (34)
 * attribution: placement 34
 */
import { readlink, lstat, stat, readdir, realpath } from "fs/promises";
import { join, resolve, normalize, sep, isAbsolute, relative, dirname, parse, basename } from "path";
import { constants } from "fs";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { logForDebugging } from "../debug.js";
import { getPlatform } from "../platform.js";
import { getErrnoCode, isENOENT, errorMessage } from "../errors.js";
import {
  isWindowsShortcutAbsent,
  symlinkVerdictForPath,
  stripTrailingSeparators,
  isSafeAbsoluteWorktreePath,
  normalizePathKey,
  checkPathForSymlinks,
} from "../pathIdentity.js";
import { readFileGuarded } from "../fsSafety/guardedFileRead.js";
import { isOnForeignMount } from "../networkPaths.js";
import { GIT_SAFE_GLOBAL_ARGS } from "./gitSafeEnv.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { buildGitConfigEnv } from "./gitConfigEnv.js";
import { env } from "../env.js";
import { identity } from "../identity.js";
import { openFailureText } from "./worktreeRegistrations.js";

//@ chunk-2xm1rxms.js:1124-1168 placement
var MAX_GITDIR_FILE_BYTES = 65536;
var MAX_LINK_TEXT_BYTES = 4096;
var runGitForVetting = (e, n) => execFileNoThrowWithCwd(gitExe(), e, n);
//@ chunk-2xm1rxms.js:1168-4308 placement
/**
 * 检查目录是否为可安全操作的 worktree：.git 指针、gitdir 与 commondir 是否一致且在仓库内。
 */
async function vetWorktree(e, { dotGitLink: n = "refuse", run: o = runGitForVetting } = {}) {
  let r = (skipped, E) => {
    logForDebugging(`Could not vet the worktree registrations of ${e}: ${E}`, {
      level: "warn",
    });
    return {
      skipped,
      why: E,
    };
  };
  let s = getPlatform() === "windows";
  let a = async (p) => {
    let E = await readlink(p).then(
      () => "link",
      (error) => (getErrnoCode(error) === "EINVAL" ? "clear" : isENOENT(error) ? "missing" : "unknown"),
    );
    if (E !== "missing") return E;
    return (await isWindowsShortcutAbsent(p)) ? "missing" : "unknown";
  };
  let l = join(e, ".git");
  let u = await symlinkVerdictForPath(l, e);
  let c;
  let w;
  if (u === "clear") {
    let [p, E] = await Promise.all([
      lstat(l).catch(() => null),
      stat(e).then(
        (v) => v,
        (error) => (isENOENT(error) ? null : undefined),
      ),
    ]);
    if (E === null) return r("gone", "the repository root is gone");
    if (E === undefined) return r("unvettable", "the repository root cannot be stat'd");
    if (p === null) return r("unvettable", ".git vanished");
    if (!p.isDirectory()) return r("pointer", ".git is not a real directory (a pointer file)");
    c = l;
    w = [p.uid, E.uid];
  } else if (u === "missing") {
    let [p, E, v] = await Promise.all([
      lstat(join(e, "HEAD")).catch(() => null),
      lstat(join(e, "objects")).catch(() => null),
      stat(e).then(
        (y) => y,
        (error) => (isENOENT(error) ? null : undefined),
      ),
    ]);
    if (v === null) return r("gone", "the repository root is gone");
    if (v === undefined) return r("unvettable", "the repository root cannot be stat'd");
    if (p === null || !p.isFile() || E === null || !E.isDirectory())
      return r("not-a-repository", "no .git, and the root is not a bare git directory");
    c = e;
    w = [v.uid];
  } else if (u === "link" && n === "vet") {
    let gitdirFile = await readGitdirFile(l, e);
    if ("refused" in gitdirFile) return r("unvettable", `.git is a link whose text ${gitdirFile.refused}`);
    let text = gitdirFile.text;
    let v = stripTrailingSeparators(resolve(e, text));
    let y = stripTrailingSeparators(normalize(e));
    if ((await symlinkVerdictForPath(v, v.startsWith(y + sep) ? y : undefined)) !== "clear")
      return r(
        "unvettable",
        ".git is a link whose target is missing, goes through another link, or cannot be probed",
      );
    let [P, G, V, j] = await Promise.all([
      lstat(v).catch(() => null),
      lstat(join(v, "HEAD")).catch(() => null),
      lstat(join(v, "objects")).catch(() => null),
      stat(e).then(
        (D) => D,
        (error) => (isENOENT(error) ? null : undefined),
      ),
    ]);
    if (j === null) return r("gone", "the repository root is gone");
    if (j === undefined) return r("unvettable", "the repository root cannot be stat'd");
    if (P === null || !P.isDirectory() || G === null || !G.isFile() || V === null || !V.isDirectory())
      return r("unvettable", ".git is a link to something other than a git directory");
    c = v;
    w = [P.uid, j.uid];
  } else return r("unvettable", ".git is a link, a mount point, or cannot be probed");
  if ((await a(join(c, "commondir"))) !== "missing")
    return r("unvettable", `${c}/commondir exists, which git never writes into a main git dir`);
  let h = s || !w.every(isTrustedOwnerUid) ? await gitConfigEnvOverrides(e, c, o) : null;
  if (h !== null) return r("unvettable", h);
  let g = join(c, "worktrees");
  let b = await symlinkVerdictForPath(g, e);
  let T = new Map();
  let m = new Map();
  if (b === "missing")
    return {
      gitDir: c,
      vetted: T,
      refused: m,
    };
  let f =
    b === "clear"
      ? await readdir(g, {
          encoding: "buffer",
        }).catch(() => null)
      : null;
  if (f === null) return r("unvettable", `${g} is a link or cannot be read`);
  for (let p of f) {
    let E = decodeSafeName(p);
    if (E === null) {
      let A = join(g, `<${p.toString("hex")}>`);
      let P = "has a name this check and git would read differently";
      m.set(A, "has a name this check and git would read differently");
      logForDebugging(
        `Refused worktree admin entry ${A}: has a name this check and git would read differently`,
        {
          level: "warn",
        },
      );
      continue;
    }
    let v = join(g, E);
    let y = await vetWorktreeLink(v, e, a, s);
    if (y === "missing") continue;
    if (y === null) continue;
    if (typeof y === "object") T.set(v, y.worktree);
    else {
      m.set(v, y);
      logForDebugging(`Refused worktree admin entry ${v}: ${y}`, {
        level: "warn",
      });
    }
  }
  return {
    gitDir: c,
    vetted: T,
    refused: m,
  };
}
//@ chunk-2xm1rxms.js:4308-4458 placement
async function looksLikeGitDir(e) {
  for (let n of ["objects", "config", "packed-refs", "hooks", "worktrees"])
    if ((await e(n).catch(() => "unchecked")) !== null) return true;
  return false;
}
//@ chunk-2xm1rxms.js:4458-6341 placement
async function vetWorktreeLink(e, n, o, r) {
  let s = await symlinkVerdictForPath(e, n);
  if (s === "missing") return "missing";
  if (s !== "clear") return "is a link, a mount point, or cannot be probed";
  let a = await lstat(e).then(
    (m) => m,
    (error) => (isENOENT(error) ? null : undefined),
  );
  if (a === undefined) return "cannot be probed";
  if (a === null) return "missing";
  if (a.isSymbolicLink()) return "became a link";
  if (!a.isDirectory()) return r ? "is not a directory" : null;
  let worktreePointer = await readWorktreePointer(e, o, r ? 1 / 0 : 1);
  if (worktreePointer !== null) return worktreePointer;
  if (
    await looksLikeGitDir((m) =>
      lstat(join(e, m)).catch((error) => {
        if (isENOENT(error)) return null;
        throw error;
      }),
    )
  )
    return "holds a git directory's own files (objects, config, packed-refs, hooks or worktrees), or could not be checked for them";
  let u = join(e, "gitdir");
  let c = await lstat(u).then(
    (m) => m,
    (error) => (isENOENT(error) ? null : undefined),
  );
  if (c === undefined) return "gitdir cannot be probed";
  if (c === null)
    return (await o(u)) === "missing"
      ? {
          worktree: null,
        }
      : "gitdir is absent to lstat but not to the probe (a shortcut beside it, or a race)";
  if (!c.isFile()) return "gitdir is not a regular file";
  if (c.size > MAX_GITDIR_FILE_BYTES) return "gitdir is larger than any git writes";
  let w = await readFileGuarded(u, MAX_GITDIR_FILE_BYTES, {
    noFollow: true,
  }).catch(() => null);
  if (w === null) return "gitdir cannot be read";
  let replaced = w.replace(/[\r\n]+$/, "");
  if (replaced === "")
    return {
      worktree: null,
    };
  let g = gitdirPathProblem(replaced, n, r);
  if (g !== null) return g;
  let b;
  let T;
  if (isAbsolute(replaced)) {
    let m = normalize(replaced);
    let f = stripTrailingSeparators(normalize(n));
    b = [m];
    let p = (y, A) => (r && A === 0 ? y.toLowerCase() : y);
    let parts = m.split(sep);
    let parts_2 = f.split(sep);
    T =
      parts.length > parts_2.length && parts_2.every((y, A) => p(y, A) === p(parts[A] ?? "", A))
        ? parts.slice(0, parts_2.length).join(sep)
        : undefined;
  } else {
    let m = await realpath(n).catch(() => null);
    if (m === null) return "the repository root does not resolve";
    T = m;
    let f = stripTrailingSeparators(normalize(n));
    let p = e.startsWith(f + sep) ? join(m, relative(n, e)) : e;
    b = [resolve(p, replaced), resolve(m, replaced)];
  }
  for (let m of b) {
    if (isOnForeignMount(m, T ?? n)) return "gitdir names another host";
    let f = await symlinkVerdictForPath(dirname(m), T);
    if (f === "link" || f === "unknown")
      return "gitdir walks through a link, or a component cannot be probed";
    if (f === "clear") {
      let p = await o(m);
      if (p === "link" || p === "unknown") return "gitdir names a link, or one that cannot be probed";
    }
  }
  return {
    worktree: b[0] ?? null,
  };
}
//@ chunk-2xm1rxms.js:6341-7138 placement
async function gitConfigEnvOverrides(e, n, o) {
  let r = {};
  for (let c of ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"]) {
    let w = process.env[c];
    if (w !== undefined) r[c] = w;
  }
  let s = await o([...GIT_SAFE_GLOBAL_ARGS, "-C", e, "rev-parse", "--git-dir"], {
    cwd: e,
    env: getRemoteHostSessionCount({
      ...r,
      ...buildGitConfigEnv(),
    }),
    timeout: 1e4,
  }).catch((error) => {
    logForDebugging(`Could not run git to check the ownership of ${n}: ${errorMessage(error)}`, {
      level: "error",
    });
    return null;
  });
  if (s === null) return `git could not be run to check the ownership of ${n}`;
  if (s.code !== 0)
    return `git's ownership check for ${n} failed (exit ${s.code}); if another user owns it, it needs a safe.directory entry`;
  let trimmed = s.stdout.trim();
  if (trimmed === "") return `git gave no answer when checking the ownership of ${n}`;
  let [l, u] = await Promise.all([
    realpath(resolve(e, trimmed)).catch(() => null),
    realpath(n).catch(() => null),
  ]);
  return l !== null && u !== null && stripTrailingSeparators(l) === stripTrailingSeparators(u)
    ? null
    : `git's ownership check did not name ${n}`;
}
//@ chunk-2xm1rxms.js:7138-7276 placement
function isTrustedOwnerUid(e) {
  let n = process.geteuid?.();
  if (n === undefined || e === n) return true;
  if (n !== 0) return false;
  let SUDO_UID = env.SUDO_UID;
  return e === 0 || (SUDO_UID !== undefined && e === SUDO_UID);
}
//@ chunk-2xm1rxms.js:7276-8027 placement
function gitdirPathProblem(e, n, o) {
  if (e.includes("\uFFFD") || /\p{Cc}/u.test(e) || /^[A-Za-z]:(?![\\/])/.test(e))
    return "gitdir holds bytes git would read differently";
  let r = o ? /[\\/]+/ : /\/+/;
  if (o && e.split(r).some((s) => s !== "." && s !== ".." && /[. ]$/.test(s)))
    return "gitdir holds a component ending in a dot or space";
  if (!isAbsolute(e)) {
    let parts = e.split(r);
    let index = parts.findIndex((u) => u !== "..");
    return (index < 0 ? [] : parts.slice(index)).some((u) => u === "" || u === "." || u === "..")
      ? "gitdir is a relative value git would not write"
      : null;
  }
  if (e.split(r).some((s) => s === "." || s === ".."))
    return "gitdir holds a dot segment git would not write";
  if (!isSafeAbsoluteWorktreePath(e)) return "gitdir is rooted without a drive or a host";
  if (isOnForeignMount(e, n)) return "gitdir names another host";
  return r.test(e.slice(-1)) ? "gitdir ends in a separator git would not write" : null;
}
//@ chunk-2xm1rxms.js:8027-8695 placement
async function readGitdirFile(e, n) {
  let o = await readlink(e, {
    encoding: "buffer",
  }).then(
    (a) => {
      let str = a.toString("utf-8");
      return str.includes("\x00") || !Buffer.from(str, "utf-8").equals(a) ? null : str;
    },
    () => null,
  );
  if (o === null)
    return {
      refused: "cannot be read",
    };
  if (/[\p{Cc}\uFFFD]/u.test(o))
    return {
      refused: "holds a control character or U+FFFD",
    };
  if (isOnForeignMount(o, n))
    return {
      refused: "names another host",
    };
  let r = getPlatform() === "windows";
  let s = r ? /[\\/]+/ : /\/+/;
  if (
    o === "" ||
    s.test(o.slice(-1)) ||
    o.split(s).some((a) => a === "." || a === "..") ||
    (isAbsolute(o) && !isSafeAbsoluteWorktreePath(o)) ||
    (r && /^[A-Za-z]:(?![\\/])/.test(o))
  )
    return {
      refused:
        "is empty, ends in a separator, holds a dot segment, or is rooted or drive-relative in a way git would read differently",
    };
  return {
    text: o,
  };
}
//@ chunk-2xm1rxms.js:8695-8860 placement
function decodeSafeName(e) {
  let str = e.toString("utf8");
  return !str.includes("\uFFFD") &&
    !/\p{Cc}/u.test(str) &&
    !(getPlatform() === "windows" && /[. ]$/.test(str)) &&
    Buffer.from(str, "utf8").equals(e)
    ? str
    : null;
}
//@ chunk-2xm1rxms.js:8860-9581 placement
async function readWorktreePointer(e, n, o) {
  let r = getPlatform() === "windows";
  let s = MAX_LINK_TEXT_BYTES;
  let a = async (l, u) => {
    let c = await readdir(l, {
      encoding: "buffer",
    }).catch(() => null);
    if (c === null) return `${l} cannot be read`;
    for (let w of c) {
      if (--s < 0) return "holds more files than any entry git writes";
      let h = decodeSafeName(w);
      if (h === null) return `${l} holds a name that is not valid UTF-8`;
      if (r && h.toLowerCase().endsWith(".lnk"))
        return `${join(l, h)} is named as a shortcut, which git never writes here`;
      let g = join(l, h);
      let b = await lstat(g).catch(() => null);
      if (b === null) return `${g} cannot be probed`;
      let T = r && b.isDirectory() ? await symlinkVerdictForPath(g, l) : await n(g);
      if (T === "link" || T === "unknown") return `${g} is a link or cannot be probed`;
      if (b.isDirectory() && u > 1) {
        let m = await a(g, u - 1);
        if (m !== null) return m;
      }
    }
    return null;
  };
  return a(e, o);
}
//@ chunk-2xm1rxms.js:9581-9695 placement
/**
 * worktree 校验读取的字节上限，以及"匹配前后"回调状态的宿主作用域存储。
 */
var WORKTREE_READ_LIMITS_2 = 65536;
var WORKTREE_READ_LIMITS = 65536;
var worktreeHookState = identity(
  {
    afterMatch: null,
    beforeMutation: null,
  },
  (e) => {
    e.afterMatch = null;
    e.beforeMutation = null;
  },
);
//@ chunk-2xm1rxms.js:9695-9940 placement
async function vetRepoForWorktrees(e) {
  let n = await vetWorktree(e, {
    dotGitLink: "vet",
  });
  if ("skipped" in n) return null;
  let o = await isSameRepository(e, n.gitDir);
  if ("refused" in o) {
    logForDebugging(`Could not vet the worktree registrations of ${e}: ${o.refused}`, {
      level: "warn",
    });
    return null;
  }
  return o.gitDir;
}
//@ chunk-2xm1rxms.js:9940-10483 placement
async function isSameRepository(e, gitDir) {
  let o = normalizedAbsolute(e);
  let r = normalizedAbsolute(gitDir);
  if (r === o)
    return (await lstat(join(o, ".git")).then(
      () => true,
      (error) => !isENOENT(error),
    ))
      ? {
          refused: `the repository's .git is a link to its own root, ${o}, which cannot be used as a git directory safely`,
        }
      : resolveGitDirUnder(o, "");
  if (r === normalizedAbsolute(join(e, ".git"))) return resolveGitDirUnder(o, ".git");
  let s = await locateInside(r, o);
  return s === "elsewhere"
    ? {
        gitDir: r,
      }
    : {
        refused:
          s === "inside"
            ? `the repository's .git is a link to ${r}, inside its own working tree, which cannot be opened safely`
            : `the repository's .git is a link to ${r}, which could not be checked against the working tree`,
      };
}
//@ chunk-2xm1rxms.js:10483-10611 placement
async function resolveGitDirUnder(e, n) {
  let o = await realpath(e).catch(() => null);
  return o === null
    ? {
        refused: `${e} could not be resolved`,
      }
    : {
        gitDir: join(o, n),
      };
}
//@ chunk-2xm1rxms.js:10611-10667 placement
function normalizedAbsolute(e) {
  let n = normalize(e);
  return parse(n).root === n ? n : stripTrailingSeparators(n);
}
//@ chunk-2xm1rxms.js:10667-10973 placement
async function locateInside(e, n) {
  if (isPathInsideOrEqual(normalizePathKey(e), normalizePathKey(n))) return "inside";
  let o = await stat(n, {
    bigint: true,
  }).catch(() => null);
  if (o === null) return "unknown";
  for (let r = e; ; r = dirname(r)) {
    let s = await lstat(r, {
      bigint: true,
    }).catch(() => null);
    if (s === null) return "unknown";
    if (s.dev === o.dev && s.ino === o.ino) return "inside";
    if (dirname(r) === r) return "elsewhere";
  }
}
//@ chunk-2xm1rxms.js:10973-11083 placement
async function resolveRootSpellings(e) {
  let n = normalizedAbsolute(e);
  let o = await realpath(n).catch(() => null);
  return {
    root: n,
    tops: [n, o].filter((r) => r !== null),
  };
}
//@ chunk-2xm1rxms.js:11083-11385 placement
async function collectWorktreeTops(e, repoSpelled) {
  let o = new Set();
  let r = [];
  let { root, tops } = await resolveRootSpellings(repoSpelled);
  for (let l of e) {
    let u = stripTrailingSeparators(normalize(l));
    o.add(join(u, ".git"));
    if (isOnForeignMount(u, root)) continue;
    let c = dirname(u);
    let w = await walkToCommonAncestor(c, findDeepestContainingRoot(c, tops));
    if ("refused" in w) {
      r.push(`${u}: ${w.refused}`);
      continue;
    }
    o.add(join(w.resolved, basename(u), ".git"));
  }
  return {
    gitdirs: o,
    unresolved: r,
    tops,
  };
}
//@ chunk-2xm1rxms.js:11385-11395 placement
var MAX_SYMLINK_LINKS = 16;
//@ chunk-2xm1rxms.js:11395-12028 placement
async function walkToCommonAncestor(e, deepestContainingRoot) {
  let targetPath = e;
  let stopAt = deepestContainingRoot;
  for (let j = 0; j <= MAX_SYMLINK_LINKS; j++) {
    let a =
      targetPath === stopAt
        ? {
            verdict: "clear",
            at: undefined,
          }
        : await checkPathForSymlinks(targetPath, stopAt);
    if (a.verdict === "clear" || a.verdict === "missing") {
      if (stopAt === undefined)
        return {
          resolved: targetPath,
        };
      let c = await realpath(stopAt).catch(() => null);
      return c === null
        ? {
            refused: `${stopAt} could not be resolved`,
          }
        : {
            resolved: join(c, relative(stopAt, targetPath)),
          };
    }
    if (a.verdict !== "link" || a.at === undefined)
      return {
        refused: `a component of ${targetPath} cannot be probed`,
      };
    let gitdirFile = await readGitdirFile(a.at, dirname(a.at));
    if ("refused" in gitdirFile)
      return {
        refused: `the text of the link ${a.at} ${gitdirFile.refused}`,
      };
    let u = resolve(dirname(a.at), gitdirFile.text);
    targetPath = join(u, relative(a.at, targetPath));
    if (stopAt !== undefined && !isPathInsideOrEqual(u, stopAt)) stopAt = undefined;
  }
  return {
    refused: `more than ${MAX_SYMLINK_LINKS} links lead to ${e}`,
  };
}
//@ chunk-2xm1rxms.js:12028-12095 placement
function isPathInsideOrEqual(e, n) {
  return e === n || e.startsWith(n.endsWith(sep) ? n : n + sep);
}
//@ chunk-2xm1rxms.js:12095-12269 placement
function parseGitdirLine(e, n) {
  let replaced = e.replace(/[\r\n]+$/, "");
  if (
    replaced === "" ||
    gitdirPathProblem(replaced, n, getPlatform() === "windows") !== null ||
    isOnForeignMount(replaced, n)
  )
    return null;
  let r = normalize(isAbsolute(replaced) ? replaced : resolve(n, replaced));
  return basename(r) === ".git" && isSafeAbsoluteWorktreePath(r) ? r : null;
}
//@ chunk-2xm1rxms.js:12269-12410 placement
function findDeepestContainingRoot(e, tops) {
  let o;
  for (let r of tops)
    for (let s = r; ; s = dirname(s)) {
      if (isPathInsideOrEqual(e, s)) {
        if (o === undefined || s.length > o.length) o = s;
        break;
      }
      if (dirname(s) === s) break;
    }
  return o;
}
//@ chunk-2xm1rxms.js:12410-12523 placement
async function verifyAdminEntry(e, n, worktreePaths) {
  let tops = worktreePaths?.tops ?? (await resolveRootSpellings(n.repoSpelled)).tops;
  return (await symlinkVerdictForPath(e, findDeepestContainingRoot(dirname(e), tops))) === "missing";
}
//@ chunk-2xm1rxms.js:12523-12602 placement
function isSafePathSegment(e) {
  return e !== "" && e !== "." && e !== ".." && !/[\\/\p{Cc}\uFFFD]/u.test(e);
}
//@ chunk-2xm1rxms.js:12602-12772 placement
function pathVariants(e) {
  let n = new Set();
  for (let o of e) {
    let r = basename(stripTrailingSeparators(normalize(o)));
    for (let s of [escapeDotSegments(r), r]) {
      if (s === "") continue;
      n.add(s);
      for (let j = 1; j <= 99; j++) n.add(`${s}${j}`);
    }
  }
  return [...n];
}
//@ chunk-2xm1rxms.js:12772-13055 placement
function escapeDotSegments(e) {
  let n = "";
  for (let j = 0; j < e.length; j++) {
    let r = e[j];
    let code = r.charCodeAt(0);
    if (r === "." && (j === 0 || e[j - 1] === ".")) n += j === 0 ? "-" : "";
    else if (r === "{" && e[j - 1] === "@") n += "-";
    else if (code < 32 || code === 127 || " :?[\\^~*".includes(r)) n += "-";
    else n += r;
  }
  while (n.endsWith(".lock")) n = n.slice(0, -5);
  return n;
}
//@ chunk-2xm1rxms.js:13055-13208 placement
async function loadDeviceTreeHost() {
  let [e, n] = await Promise.all([import("./chunk-ejkghqj9.js"), import("./chunk-78kn47sp.js")]);
  return {
    ...e,
    host: n.createDeviceTreeHost(),
  };
}
//@ chunk-2xm1rxms.js:13208-14073 placement
async function loadRepoLayout(e, repoSpelled) {
  let o = await loadDeviceTreeHost().catch((error) => ({
    failed: errorMessage(error),
  }));
  if ("failed" in o)
    return {
      unavailable: `its module did not load: ${o.failed}`,
      modules: null,
    };
  let r = await realpath(normalizedAbsolute(repoSpelled)).catch(() => null);
  let s = r !== null && parse(r).root !== r && e === join(r, ".git");
  let a = s ? r : e;
  let l = await (
    s || parse(e).root === e
      ? o.openTreeAnchor(o.host, {
          gitRoot: a,
          realRoot: a,
        })
      : o.openTreeAnchorAtName(o.host, e)
  ).catch((error) => ({
    unavailable: errorMessage(error),
  }));
  if ("unavailable" in l)
    return {
      unavailable: l.unavailable,
      modules: o,
    };
  if (!s) return l;
  try {
    let u = await l.anchorBeneath(".git");
    let c = await u.lstat("").catch(() => null);
    if (c === null || c.ino === 0n) {
      await u.close().catch(() => {});
      return {
        refused:
          c === null
            ? `${e}: its file id could not be read once it was opened`
            : `${e} is on a volume that reports no file ids`,
      };
    }
    return u;
  } catch (error) {
    return {
      refused: `could not open ${e} from ${a} without following a link: ${errorMessage(error)}`,
    };
  } finally {
    await l.close().catch(() => {});
  }
}
//@ chunk-2xm1rxms.js:14073-14780 placement
async function openNonBlocking(e, n, o) {
  let r = await e
    .open(n, constants.O_RDONLY | constants.O_NONBLOCK)
    .catch((error) => getErrnoCode(error) ?? "EIO");
  if (typeof r === "string") {
    if (r !== "ENOENT")
      return {
        unread: openFailureText(r),
      };
    let s = await e.lstat(n).then(
      () => "present",
      (error) => getErrnoCode(error) ?? "EIO",
    );
    return s === "ENOENT"
      ? "absent"
      : {
          unread: s === "present" ? "could not be opened where the held folder has it" : openFailureText(s),
        };
  }
  try {
    let stats = await r.stat({
      bigint: true,
    });
    if (e.backend === "darwin_at") {
      let stats_2 = await e.lstat(n);
      if (stats.dev !== stats_2.dev || stats.ino !== stats_2.ino)
        return {
          unread: "was replaced as it was opened",
        };
    }
    if (!stats.isFile())
      return {
        unread: "is not a regular file",
      };
    let upToBytes = await readUpToBytes(r, o);
    return upToBytes === null
      ? {
          unread: "is larger than git writes",
        }
      : {
          text: upToBytes,
        };
  } catch {
    return {
      unread: "could not be read",
    };
  } finally {
    await r.close().catch(() => {});
  }
}
//@ chunk-2xm1rxms.js:14780-14967 placement
async function readUpToBytes(e, n) {
  let o = Buffer.alloc(n + 1);
  let r = 0;
  for (;;) {
    let { bytesRead } = await e.read(o, r, o.length - r, r);
    if (bytesRead === 0) break;
    r += bytesRead;
    if (r > n) return null;
  }
  return o.subarray(0, r).toString("utf-8");
}
//@ chunk-2xm1rxms.js:14967-15054 placement
/**
 * worktreePath 字段统一成数组。
 */
function normalizeWorktreePaths(e) {
  return typeof e.worktreePath === "string" ? [e.worktreePath] : e.worktreePath;
}
//@ chunk-2xm1rxms.js:15054-15129 placement = WORKTREE_PATH_TAG (0.798)
/**
 * 有 worktreePath 时解析出仓库内 worktree 路径列表，否则 null。旧版名 WORKTREE_PATH_TAG 为错配。
 */
async function resolveWorktreePaths(e) {
  return "worktreePath" in e ? collectWorktreeTops(normalizeWorktreePaths(e), e.repoSpelled) : null;
}
//@ chunk-2xm1rxms.js:15129-15174 placement
function noteUnchecked(e, n) {
  e.unchecked++;
  e.kinds.add(n);
}
export {
  pathVariants,
  normalizeWorktreePaths,
  isSafePathSegment,
  noteUnchecked,
  openNonBlocking,
  WORKTREE_READ_LIMITS_2,
  parseGitdirLine,
  loadRepoLayout,
  resolveWorktreePaths,
  verifyAdminEntry,
  worktreeHookState,
  vetRepoForWorktrees,
  looksLikeGitDir,
  WORKTREE_READ_LIMITS,
  readUpToBytes,
  vetWorktree,
  isSameRepository,
};
