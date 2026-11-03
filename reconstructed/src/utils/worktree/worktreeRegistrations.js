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
import { parse, sep, normalize, dirname, join, isAbsolute, basename } from "path";
import { readlink, realpath, stat } from "fs/promises";
import { Re } from "../../../runtime/bun-runtime.js";
import { require_ignore } from "../../../vendor/ignore/index.js";
import { setRepoDetectionGuards } from "../detectRepository.js";
import { checkHasTrustDialogAccepted } from "../config.js";
import { getPlatform } from "../platform.js";
import {
  normalizePathKey,
  stripTrailingSeparators,
  hasDistinctWorktreePaths,
  findWorktreeMatchingPaths,
  symlinkVerdictForPath,
  findSamePath,
  isRemovableWorktreeDir,
  toForwardSlashesOnWindows,
  clearReparsePoints,
} from "../pathIdentity.js";
import { getErrnoCode } from "../errors.js";
import { isSameRepository, vetWorktree } from "../git/worktreeVetting.js";
import { logForDebugging } from "../debug.js";
import { deregisterWorktree } from "../git/worktreeRegistrations.js";
import { findCanonicalGitRootUncached, gitExe } from "../git.js";
import { NOT_A_GIT_REPO_PATH, resolveGitDirsOrPlaceholder } from "../git/gitDirResolution.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { isDeviceNamespacePath as isDeviceNamespacePath_2, hasDotSegment } from "../pathClassification.js";
import { hasWin32DevicePrefixSpelling } from "../fsJunctions.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { GIT_SAFE_GLOBAL_ARGS } from "../git/gitSafeEnv.js";
import { gitSupportsPartialCloneFetch } from "./partialClone.js";
import { isOnForeignMount } from "../networkPaths.js";
import { removeWorktreeSafely, worktreeRemovalText } from "../git/worktreeRemoval.js";

//@ chunk-e6aww6q8.js:3574892-3574912 placement
var micromatch = Re(require_ignore(), 1);
//@ chunk-e6aww6q8.js:3575265-3575301 placement
function installRepoDetectionGuards() {
  setRepoDetectionGuards({
    trustProbe: checkHasTrustDialogAccepted,
  });
}
//@ chunk-e6aww6q8.js:3575301-3575389 placement
var GIT_PROGRESS_LINE_RE = /^(?:remote: )?[^:'"]+:\s+\d{1,3}% \(\d+\/\d+\)(?:,[\p{L}\p{N}\p{M} .,|/]*)?$/u;
//@ chunk-e6aww6q8.js:3575389-3575616 placement
function stripProgressLines(e) {
  let n = [];
  for (let line of e.split(/\r?\n/)) {
    let parts = line.split("\r");
    if (!parts.some((y) => GIT_PROGRESS_LINE_RE.test(y))) {
      n.push(line);
      continue;
    }
    let filtered = parts.filter((y) => y !== "" && !GIT_PROGRESS_LINE_RE.test(y));
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
/**
 * 外部构建恒 false 的「在别处创建」判断。
 */
function isWorktreeMadeElsewhereStub() {
  return false;
}
//@ chunk-e6aww6q8.js:3575827-3575912 placement
function normalizeDriveLetter(e) {
  return getPlatform() === "windows" ? e.replace(/^[A-Za-z]:/, (n) => n.toLowerCase()) : e;
}
//@ chunk-e6aww6q8.js:3575912-3575923 placement
var MAX_LINK_HOPS = 40;
//@ chunk-e6aww6q8.js:3575923-3577026 placement
/**
 * 逐段解析路径中的符号链接（限制跳转次数），处理 .. 与 Windows 规范化，得到真实路径；无法解析时返回 unresolvable。
 */
async function resolvePathThroughLinks(targetPath, n) {
  let root = parse(targetPath).root;
  let filtered = targetPath.slice(root.length).split(sep).filter(Boolean);
  let mapped = filtered.map((name, original) => ({
    name,
    original,
  }));
  let resolved = root;
  let S = -1;
  let w = 0;
  let L = normalizeDriveLetter(n);
  let G = normalizePathKey(n);
  let q = getPlatform() === "windows";
  let Z = (Se) =>
    (q ? normalize(Se) : Se)
      .split(q ? /[\\/]/ : sep)
      .filter((ke) => ke !== "" && ke !== ".")
      .map((name) => ({
        name,
        original: null,
      }));
  while (mapped.length > 0) {
    let Se = mapped.shift();
    if (Se === undefined) break;
    if (Se.original !== null) S = Se.original;
    if (Se.name === "..") resolved = dirname(resolved);
    else {
      resolved = join(resolved, Se.name);
      let Ee = await readlink(resolved).then(
        (Ie) => Ie,
        (error) => (getErrnoCode(error) === "EINVAL" ? null : undefined),
      );
      if (Ee === undefined)
        return {
          kind: "unresolvable",
        };
      if (Ee !== null) {
        if (++w > MAX_LINK_HOPS)
          return {
            kind: "unresolvable",
          };
        if (isAbsolute(Ee)) {
          let root = parse(Ee).root;
          resolved = root;
          mapped.unshift(...Z(Ee.slice(root.length)));
        } else {
          resolved = dirname(resolved);
          mapped.unshift(...Z(Ee));
        }
        continue;
      }
      let Ae = await realpath(resolved).catch(() => null);
      if (Ae === null)
        return {
          kind: "unresolvable",
        };
      resolved = stripTrailingSeparators(normalize(Ae));
    }
    let ke = normalizeDriveLetter(stripTrailingSeparators(resolved));
    if (ke === L) {
      let Ee = mapped[0];
      if (Ee !== undefined && Ee.original === null)
        return {
          kind: "inside",
        };
      return {
        kind: "root",
        rootUnder: root + filtered.slice(0, S + 1).join(sep),
      };
    }
    if (ke.startsWith(L + sep))
      return {
        kind: "inside",
      };
    let we = normalizePathKey(resolved);
    if (we === G || we.startsWith(G + sep))
      return {
        kind: "inside",
      };
  }
  return {
    kind: "outside",
    resolved,
  };
}
//@ chunk-e6aww6q8.js:3577026-3577478 placement
/**
 * 移除工作树后注销其在仓库中的登记，仓库不一致时保留登记并记录原因。
 */
async function deregisterRemovedWorktree(root, gitDir, r, forceTwice) {
  let h = await isSameRepository(root, gitDir);
  if ("refused" in h)
    logForDebugging(`Kept worktree registration of ${r}: ${h.refused}`, {
      level: "warn",
    });
  let y =
    "refused" in h
      ? {
          outcome: "kept",
          reason: h.refused,
        }
      : await deregisterWorktree(
          h.gitDir,
          {
            worktreePath: r,
            repoSpelled: root,
          },
          {
            locked: forceTwice === true ? "drop" : "keep",
          },
        );
  return y.outcome === "dropped"
    ? {
        outcome: "removed",
      }
    : y.outcome === "none"
      ? {
          outcome: "unregistered",
          reason: `the drop found no registration of ${r} in ${gitDir}`,
        }
      : {
          outcome: "kept",
          reason: y.reason,
        };
}
//@ chunk-e6aww6q8.js:3577478-3578384 placement
async function vetWorktreeRegistration(e) {
  let root = e;
  let r = await vetWorktree(e, {
    dotGitLink: "vet",
  });
  if ("skipped" in r && r.skipped === "pointer") {
    let canonicalGitRootUncached = findCanonicalGitRootUncached(e);
    if (canonicalGitRootUncached !== null && canonicalGitRootUncached !== e) {
      root = canonicalGitRootUncached;
      r = await vetWorktree(canonicalGitRootUncached, {
        dotGitLink: "vet",
      });
    }
  }
  if ("skipped" in r)
    return r.skipped === "gone" || r.skipped === "not-a-repository"
      ? {
          ok: false,
          outcome: "unlisted",
          reason: r.why,
        }
      : {
          ok: false,
          outcome: "kept",
          reason: `the repository's worktree registrations cannot be vetted before git lists them (${r.why})`,
        };
  let s = r.refused.entries().next().value;
  if (s !== undefined) {
    let [S, w] = s;
    return {
      ok: false,
      outcome: "kept",
      reason: `a registered worktree cannot be vetted before git lists them (${r.refused.size} refused; ${S}: ${w})`,
    };
  }
  let [h, y] = await Promise.all([
    stat(r.gitDir, {
      bigint: true,
    }).catch(() => null),
    realpath(r.gitDir).catch(() => null),
  ]);
  if (h === null)
    return {
      ok: false,
      outcome: "kept",
      reason: `${r.gitDir} could not be read after its worktree registrations were checked`,
    };
  return {
    ok: true,
    gitDir: r.gitDir,
    root,
    dev: h.dev,
    ino: h.ino,
    real: y,
  };
}
//@ chunk-e6aww6q8.js:3578384-3579236 placement
/**
 * 在运行 git 前确认仓库的 git 目录与公共目录仍是先前固定的那个（比较 dev/ino 或 realpath），否则拒绝运行。
 */
async function verifyPinnedGitDir(pinned, gitDirsOrPlaceholder) {
  if (gitDirsOrPlaceholder?.gitDir === NOT_A_GIT_REPO_PATH)
    return {
      refused: "unpinned",
      reason: "git was not run: the repository's .git could not be confirmed to lead to its git directory",
    };
  let r = pinned.dev !== 0n && pinned.ino !== 0n && pinned.ino !== -1n && pinned.ino !== 0xffffffffffffffffn;
  let s = async (S) => {
    if (r)
      return stat(S, {
        bigint: true,
      }).then(
        (L) => L.dev === pinned.dev && L.ino === pinned.ino,
        () => {
          return;
        },
      );
    let w = await realpath(S).catch(() => null);
    return w === null || pinned.real === null ? undefined : w === pinned.real;
  };
  let [h, y] = await Promise.all([
    s(pinned.gitDir),
    gitDirsOrPlaceholder === undefined ? true : s(gitDirsOrPlaceholder.commonDir),
  ]);
  if (h === undefined || y === undefined)
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
  return {
    env: getRemoteHostSessionCount(
      {
        GIT_COMMON_DIR: pinned.gitDir,
      },
      {
        repository: gitDirsOrPlaceholder,
      },
    ),
  };
}
//@ chunk-e6aww6q8.js:3579236-3583865 placement
/**
 * 清理与校验 worktree 登记（Windows 设备路径、. 与 .. 组件等）。
 */
async function pruneWorktreeRegistrations(e, n, r = {}) {
  let found = [n, e].find(
    (Et) => /^[\\/]{3}/.test(Et) || isDeviceNamespacePath_2(Et) || hasWin32DevicePrefixSpelling(Et),
  );
  if (found !== undefined) {
    let Et = `${found} is spelled in a Windows device form (such as \\\\?\\C:\\) or starts with three or more separators, a form git never records a worktree in`;
    logForDebugging(`Kept worktree ${n}: ${Et}`, {
      level: "warn",
    });
    return {
      outcome: "kept",
      reason: Et,
    };
  }
  let h = gitExe();
  let y = (reason) => {
    logForDebugging(`Kept worktree ${n}: ${reason}`, {
      level: "warn",
    });
    return {
      outcome: "kept",
      reason,
    };
  };
  let found_2 = [n, e].find(hasDotSegment);
  if (found_2 !== undefined)
    return y(`${found_2 === n ? "" : "the repository root "}${found_2} holds a "." or ".." component`);
  let w = await realpath(e).catch(() => null);
  let L = stripTrailingSeparators(normalize(n));
  let G = stripTrailingSeparators(normalize(e));
  let q = w === null ? null : stripTrailingSeparators(normalize(w));
  let Z = normalizeDriveLetter(L).startsWith(normalizeDriveLetter(G) + sep) ? G : undefined;
  let Se =
    Z !== undefined
      ? undefined
      : [G, ...(q === null || q === G ? [] : [q])].find(
          (Et) =>
            !normalizeDriveLetter(L).startsWith(normalizeDriveLetter(Et) + sep) &&
            normalizePathKey(L).startsWith(normalizePathKey(Et) + sep),
        );
  if (Se !== undefined)
    return y(`${n} begins with the repository root ${Se} spelled in a different case or Unicode form`);
  let ke = null;
  if (Z === undefined && q !== null && isAbsolute(L)) {
    let pathThroughLinks = await resolvePathThroughLinks(dirname(L), q);
    switch (pathThroughLinks.kind) {
      case "root":
        Z = pathThroughLinks.rootUnder;
        break;
      case "inside":
        return y(`${n} is spelled outside the repository root but resolves through or under it`);
      case "outside":
        ke = pathThroughLinks.resolved;
        break;
      case "unresolvable":
        ke = null;
        break;
    }
  }
  let we;
  let Ee;
  let pinned = await vetWorktreeRegistration(e);
  if (!pinned.ok) {
    if (pinned.outcome === "kept") return y(pinned.reason);
    logForDebugging(`Worktree ${n} not listed: ${pinned.reason}`, {
      level: "warn",
    });
    return {
      outcome: "unlisted",
      reason: pinned.reason,
    };
  }
  let Ie = await isSameRepository(pinned.root, pinned.gitDir);
  if ("refused" in Ie) return y(Ie.refused);
  let Me = async (Et) => {
    let yt = await verifyPinnedGitDir(pinned, r.pinRepository ? resolveGitDirsOrPlaceholder(e) : undefined);
    return "refused" in yt
      ? yt
      : execFileNoThrowWithCwd(h, [...GIT_SAFE_GLOBAL_ARGS, ...Et], {
          cwd: e,
          env: yt.env,
        });
  };
  let We = ["--git-dir", pinned.gitDir];
  let lt = (await gitSupportsPartialCloneFetch(e))
    ? await Me([...We, "worktree", "list", "--porcelain", "-z"])
    : null;
  if (lt !== null && "refused" in lt) {
    if (lt.refused === "unpinned") {
      logForDebugging(`Worktree ${n} not listed: ${lt.reason}`, {
        level: "warn",
      });
      return {
        outcome: "unlisted",
        reason: lt.reason,
      };
    }
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
      ...(Z === undefined && ke !== null
        ? [join(ke, basename(L))]
        : Z !== undefined && w !== null
          ? [stripTrailingSeparators(w) + L.slice(Z.length)]
          : []),
    ].filter((It, Yt, qt) => qt.indexOf(It) === Yt);
    let worktreeMatchingPaths = findWorktreeMatchingPaths(Je.stdout, filtered);
    if (worktreeMatchingPaths === null) {
      let It = await symlinkVerdictForPath(L, Z === undefined ? e : L.slice(0, Z.length));
      if (It === "link" || It === "unknown")
        return y(
          `git lists no worktree at ${filtered.join(" or ")}, and the path has a link in a component, or one that cannot be probed`,
        );
      let Yt = `git lists no worktree at ${filtered.join(" or ")}`;
      logForDebugging(`Unregistered worktree ${n}: ${Yt}`, {
        level: "warn",
      });
      return {
        outcome: "unregistered",
        reason: Yt,
      };
    }
    if (findSamePath(worktreeMatchingPaths, [e, ...(w === null ? [] : [w])]) !== null)
      return y(`${worktreeMatchingPaths} names the main worktree`);
    if (isOnForeignMount(worktreeMatchingPaths, e)) return y(`${worktreeMatchingPaths} is on another host`);
    let gt = await symlinkVerdictForPath(worktreeMatchingPaths, e);
    if (gt === "missing")
      return deregisterRemovedWorktree(pinned.root, pinned.gitDir, worktreeMatchingPaths, r.forceTwice);
    if (gt !== "clear")
      return y(`${worktreeMatchingPaths} has a link in a component, or one that cannot be probed`);
    let At = await realpath(worktreeMatchingPaths).catch(() => null);
    if (At === null) return y(`${worktreeMatchingPaths} does not resolve`);
    if (w !== null && stripTrailingSeparators(At) === stripTrailingSeparators(w))
      return y(`${worktreeMatchingPaths} resolves to the main worktree`);
    if (!(await isRemovableWorktreeDir(worktreeMatchingPaths, At, e)))
      return y(`${worktreeMatchingPaths} is not intact (a link may have been introduced)`);
    we = worktreeMatchingPaths;
    Ee = toForwardSlashesOnWindows(worktreeMatchingPaths);
  } else if (Je !== null) {
    let Et = `could not read git's worktree list: ${Je.stderr.trim()}`;
    logForDebugging(`Worktree ${n} not listed: ${Et}`, {
      level: "warn",
    });
    return {
      outcome: "unlisted",
      reason: Et,
    };
  } else {
    if (findSamePath(n, [e, ...(w === null ? [] : [w])]) !== null) return y(`${n} names the main worktree`);
    let Et;
    let yt;
    if (Z !== undefined && Z === G) {
      Et = L;
      yt = L.slice(0, Z.length);
    } else if (Z !== undefined && w !== null) {
      yt = stripTrailingSeparators(w);
      Et = yt + L.slice(Z.length);
    } else {
      if (ke === null) return y(`${n}'s parent does not resolve`);
      Et = join(ke, basename(L));
      yt = ke;
    }
    let gt = await symlinkVerdictForPath(Et, yt);
    if (gt === "missing") return deregisterRemovedWorktree(pinned.root, pinned.gitDir, Et, r.forceTwice);
    if (gt !== "clear") return y(`${Et} is a link, or cannot be probed`);
    let At = await realpath(Et).catch(() => null);
    if (At !== null && w !== null && stripTrailingSeparators(At) === stripTrailingSeparators(w))
      return y(`${Et} resolves to the main worktree`);
    if (At === null || !(await isRemovableWorktreeDir(Et, At, yt))) return y(`${Et} is not intact`);
    we = Et;
    Ee = Et;
  }
  if (!(await clearReparsePoints(we))) return y(`${we} holds a reparse point that could not be removed`);
  let nt = await removeWorktreeSafely(e, we, {
    forceTwice: r.forceTwice === true,
    git: {
      dir: Ie.gitDir,
      root: pinned.root,
    },
    deregisterIfStopped: r.deregisterIfStopped === true,
  });
  if (nt.outcome === "removed")
    return {
      outcome: "removed",
    };
  if (nt.outcome === "not_registered" || nt.outcome === "refused") return y(worktreeRemovalText(nt));
  if (nt.outcome !== "unanchored")
    return {
      outcome: "failed",
      stderr: worktreeRemovalText(nt),
      checkout: nt.outcome,
    };
  let pt = await Me([...We, "worktree", "remove", "--force", ...(r.forceTwice ? ["--force"] : []), Ee]);
  if ("refused" in pt) return y(pt.reason);
  return pt.code === 0
    ? {
        outcome: "removed",
      }
    : {
        outcome: "failed",
        stderr: pt.stderr,
      };
}
//@ chunk-e6aww6q8.js:3583865-3583881 placement
var partialCloneFetchCache = new Map();
export {
  isWorktreeMadeElsewhereStub,
  vetWorktreeRegistration,
  verifyPinnedGitDir,
  stripProgressLines,
  micromatch,
  pruneWorktreeRegistrations,
  installRepoDetectionGuards,
  partialCloneFetchCache,
};
