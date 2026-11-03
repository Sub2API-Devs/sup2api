/**
 * utils/teleport/gitBundleLayout.ts
 *
 * 2.1.316 新增：上传前检查检出布局（git 根位置、gitlink、不写的文件模式、伪造/别名路径）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gjx0rh1b.js (9)
 * attribution: placement 9
 */
import { lstat, lstat as lstat_2, lstat as lstat_3 } from "fs/promises";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
} from "path";
import { findGitRoot } from "../git.js";
import { getCwd } from "../cwd.js";
import { runGitForAudit, Oqr, nKt, listGitRefs } from "../git/builderGit/gitConfigAudit.js";
import { freeze, lb } from "../git/gitSafeEnv.js";
import { mee, Lnt } from "../git/builderGit/gitEnv.js";
import { splitIndexOffArgs, rKt } from "../git/builderGit/repoCopy.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { uniq } from "../collections.js";
import { _H } from "../permissions/sensitivePaths.js";
import { Ft, isSafeRepoRelativePath, hasDosShortNameSegment } from "./gitBundleVerify.js";
import { isNotPlainDirectory, lstatOrAbsent } from "./wipStash.js";
import { getErrnoCode } from "../errors.js";

/**
 * git 根位于主目录/上层检出等情况的拒绝上传说明。
 */
//@ chunk-gjx0rh1b.js:109556-110296 placement
var GIT_ROOT_REFUSALS = {
    folder_is_home:
      "Not uploading this working tree: this checkout\u2019s git root is your home directory, or a folder above it (a repository rooted there makes every folder under it part of it, so the upload would carry your tracked home files). Start from a project folder that is its own repository, or work on these files from a separate clone.",
    folder_is_root:
      "Not uploading this working tree: this checkout\u2019s git root is the filesystem root. Start from a project folder that is its own repository.",
    folder_holds_config:
      "Not uploading this working tree: this checkout\u2019s git root holds (or sits inside) Claude Code\u2019s own configuration directory. Start from a project folder that is its own repository.",
  },
  Nr = 268435456;
//@ chunk-gjx0rh1b.js:110296-111116 placement
async function checkGitRootLocation(e, n, r) {
  let o = findGitRoot(e ?? getCwd());
  if (!o) return { gitRoot: "", paths: [], added: new Set(), deleted: [], gitlinks: [], unwrittenModes: [] };
  let s = (w) =>
      runGitForAudit([...freeze, ...mee, ...splitIndexOffArgs(r), ...w], {
        cwd: o,
        abortSignal: n,
        env: { ...getRemoteHostSessionCount({ ...Lnt, ...rKt(r) }, { base: Oqr(), userLocale: !0 }), ...nKt },
        maxBuffer: Nr,
      }),
    [l, h] = await Promise.all([
      s(["rev-parse", "--verify", "--quiet", "HEAD^{commit}"]),
      listUnusualIndexModes(o, n, r),
    ]);
  if (h === null) return null;
  if (h.unwrittenModes.length > 0) return { gitRoot: o, paths: [], added: new Set(), deleted: [], ...h };
  if (l.exitCode === 1) return { gitRoot: o, paths: [], added: new Set(), deleted: [], ...h };
  let [u, p] = await Promise.all([
    s(["diff", "--name-status", "-z", "--no-renames", lb, "HEAD", "--"]),
    s(["diff", "--cached", "--name-status", "-z", "--no-renames", lb, "HEAD", "--"]),
  ]);
  if (l.code !== 0 || u.code !== 0 || p.code !== 0) return null;
  return { ...summarizeStatusEntries(parseNameStatusZ(u.stdout), parseNameStatusZ(p.stdout), o), ...h };
}
//@ chunk-gjx0rh1b.js:111116-111410 placement
function summarizeStatusEntries(e, n, r) {
  let o = (h, u) =>
      h.filter(({ status: status, path: path }) => u(status) && path !== "").map(({ path: path }) => path),
    s = uniq([...o(e, (h) => h !== "D"), ...o(n, (h) => h !== "D")]),
    l = new Set(s);
  return {
    gitRoot: r,
    paths: s,
    added: new Set(o(n, (h) => h === "A")),
    deleted: uniq([...o(e, (h) => h === "D"), ...o(n, (h) => h === "D")]).filter((h) => !l.has(h)),
  };
}
//@ chunk-gjx0rh1b.js:111410-111537 placement
function parseNameStatusZ(e) {
  let parts = e.split("\x00");
  return Array.from({ length: Math.floor(parts.length / 2) }, (r, o) => ({
    status: parts[2 * o],
    path: parts[2 * o + 1],
  }));
}
//@ chunk-gjx0rh1b.js:111537-111597 placement
var $d = new Set([33188, 33261, 40960, 57344]),
  Dd = 61440,
  Pd = 57344;
//@ chunk-gjx0rh1b.js:111597-111869 placement
function classifyIndexMode(e) {
  let match = /^([0-7]{1,11}) [0-9a-f]+ \d\t(.*)$/s.exec(e);
  if (match === null) return { kind: "unwritten_mode", path: e.slice(e.indexOf("\t") + 1) };
  let int = Number.parseInt(match[1], 8),
    o = match[2];
  return (int & Dd) === Pd
    ? { kind: "gitlink", path: o }
    : { kind: $d.has(int) ? "ordinary" : "unwritten_mode", path: o };
}
//@ chunk-gjx0rh1b.js:111869-112214 placement
async function listUnusualIndexModes(e, n, r) {
  let o = await listGitRefs(e, [...mee, ...splitIndexOffArgs(r), "ls-files", "-s", "-z"], {
    hardened: !1,
    signal: n,
    env: { ...Lnt, ...rKt(r) },
    maxBuffer: Nr,
  });
  if (o.code !== 0) return null;
  let mapped = o.stdout
      .split("\x00")
      .filter((h) => h !== "")
      .map(classifyIndexMode),
    l = (h) => uniq(mapped.filter((u) => u.kind === h).map(({ path: path }) => path));
  return { gitlinks: l("gitlink"), unwrittenModes: l("unwritten_mode") };
}
//@ chunk-gjx0rh1b.js:112214-112780 placement
async function classifyPathIdentity(e, n, r, o, s = []) {
  let l = (w) => _H(w) || o?.(w) === !0,
    h = await Ft(e),
    u = async (w, _) => {
      if (!isSafeRepoRelativePath(w, h)) return { path: w, why: "forged" };
      if (hasDosShortNameSegment(w)) return { path: w, why: "alias" };
      let y = await describeUnexaminedPath(e, w);
      if (y === "linked") return { path: w, why: "hardlinked" };
      if (l(w)) {
        if (_ === "changed") return { path: w, why: r.has(w) ? "added" : "changed" };
        if (await isNotPlainDirectory(e, w)) return { path: w, why: "resurrected" };
      }
      return y === "unexamined" ? { path: w, why: "unexamined" } : null;
    };
  return (await Promise.all([...s.map((w) => u(w, "deleted")), ...n.map((w) => u(w, "changed"))]))
    .filter((w) => w !== null)
    .sort((w, _) => w.path.localeCompare(_.path));
}
//@ chunk-gjx0rh1b.js:112780-113077 placement
async function describeUnexaminedPath(e, n) {
  if (n.includes("\uFFFD")) return "unexamined";
  let r = await lstatOrAbsent(e, n);
  if (r !== "clear") return r === "symlink" ? "single" : "unexamined";
  try {
    let o = await lstat(join(e, n));
    return o.isFile() && o.nlink > 1 ? "linked" : "single";
  } catch (error) {
    let s = getErrnoCode(error);
    return s === "ENOENT" || s === "ENOTDIR" ? "single" : "unexamined";
  }
}

export {
  Nr,
  summarizeStatusEntries,
  parseNameStatusZ,
  classifyPathIdentity,
  checkGitRootLocation,
  GIT_ROOT_REFUSALS,
};
