/**
 * utils/worktreeIsolation.ts
 *
 * 2.1.316 新增：工作树隔离
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (7), chunk-s61vbvea.js (75)
 * attribution: placement 82
 */
import {
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
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  resolve,
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
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
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
} from "path";
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
} from "os";
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
} from "fs/promises";
import {
  lstatSync,
  lstatSync as lstatSync_2,
  realpathSync,
  realpathSync as realpathSync_2,
  realpathSync as realpathSync_3,
  realpathSync as realpathSync_4,
  realpathSync as realpathSync_5,
  openSync,
  openSync as openSync_2,
  fstatSync,
  readSync,
  readSync as readSync_2,
  closeSync,
  closeSync as closeSync_2,
  readdirSync,
  readdirSync as readdirSync_2,
  readdirSync as readdirSync_3,
} from "fs";
import { DoctorLazy } from "../cli/handlers/util.js";
import { A, oe } from "../../vendor/zod/v4/classic/schemas.js";
import { getPlatform as getPlatform_2 } from "./platform.js";
import {
  isSameContainmentPath,
  isOutsideContainment,
  resolveContainmentTarget,
  NW,
  describeCaseOnlyMismatch,
  Nf,
  toWin32Backslashes,
} from "./permissions/bgContainment.js";
import { safeParseJSON } from "./json.js";
import { env } from "./env.js";
import { getCurrentWorktreeSession } from "./worktree.js";
import { getOriginalCwd, getRootSession } from "../bootstrap/state.js";
import { getGitRepoCache, lde, uut } from "./git/gitRepoCache.js";
import { logForDebugging } from "./debug.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { getBgTakeover, aTi } from "./concurrentSessions.js";
import { hideUnsafePath } from "./unsafePathGlyphs.js";
import { isENOENT, getErrnoCode } from "./errors.js";
import { getRepoRootForWorktreePath, isSystemVolumePath } from "./permissions/protectedDirs.js";
import { uniq } from "./collections.js";
import { freeze as freeze_6 } from "./git/gitSafeEnv.js";
import { execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import {
  gitExe,
  findGitRootUncached,
  findCanonicalGitRootUncached,
  findCanonicalGitRoot,
  findGitRoot,
  isLinkedWorktree,
  isLinkedWorktreeUncached,
} from "./git.js";
import { getRemoteHostSessionCount } from "../commands/insights.js";
import { safeExecFileSync } from "./safeSpawn.js";
import { ai, yl, isNetworkMountPath, isWslLocalhostPath } from "./networkPaths.js";
import { HostScoped } from "./hostScoped.js";
import { getInitialSettings_2 } from "./settings/settings.js";
import { getCwd } from "./cwd.js";
import { hasWorktreeCreateHook } from "./hooks/worktreeHooks.js";
import { ENTER_WORKTREE_TOOL_NAME } from "../tools/EnterWorktreeTool/constants.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { Tm } from "./windowsUncPaths.js";

//@ chunk-s61vbvea.js:429820-429849 placement
var b0 = DoctorLazy(() => A(oe()).min(1));
//@ chunk-s61vbvea.js:429849-429968 placement
function isPathContainedIn(e, n) {
  return (getPlatform_2() === "linux" ? isSameContainmentPath : isOutsideContainment)(
    { lexical: n, canonical: n, skipped: !1 },
    { lexical: e, canonical: e, skipped: !1 },
  );
}
//@ chunk-s61vbvea.js:429968-430158 placement
function resolveFencePath(e) {
  if (typeof e !== "string" || !isAbsolute_10(e)) return { code: "not_absolute", value: e };
  let { canonical: canonical, skipped: skipped } = resolveContainmentTarget(e);
  return canonical === null
    ? { code: skipped ? "network_path" : "unresolvable_path", value: e }
    : { at: canonical };
}
//@ chunk-s61vbvea.js:430158-430705 placement
function checkWorktreeFence(e, n, r) {
  let safeParse = b0().safeParse(safeParseJSON(n, !1));
  if (!safeParse.success) return { problems: [{ code: "bad_fence", value: n }] };
  let h = resolveFencePath(e);
  if ("code" in h) return { problems: [h] };
  let y = resolveFencePath(r);
  if ("code" in y) return { problems: [y] };
  if (!isPathContainedIn(h.at, y.at)) return { problems: [{ code: "session_outside_worktree", value: r }] };
  let S = resolveContainmentTarget(homedir_4()),
    w = S.canonical ?? S.lexical,
    R = [],
    x = [];
  for (let P of safeParse.data) {
    let j = resolveFencePath(P);
    if ("code" in j) x.push(j);
    else if (isPathContainedIn(j.at, w) && !isPathContainedIn(w, j.at))
      x.push({ code: "fence_too_wide", value: P });
    else R.push(j.at);
  }
  return { answer: R.length > 0 ? { tree: h.at, fence: R } : void 0, problems: x };
}
//@ chunk-s61vbvea.js:430705-430855 placement
function hostWorktreeDeclaration() {
  let CLAUDE_CODE_HOST_WORKTREE = env.CLAUDE_CODE_HOST_WORKTREE,
    CLAUDE_CODE_HOST_WORKTREE_FENCE = env.CLAUDE_CODE_HOST_WORKTREE_FENCE;
  return CLAUDE_CODE_HOST_WORKTREE === void 0 && CLAUDE_CODE_HOST_WORKTREE_FENCE === void 0
    ? void 0
    : { declared: CLAUDE_CODE_HOST_WORKTREE, declaredFence: CLAUDE_CODE_HOST_WORKTREE_FENCE };
}
//@ chunk-s61vbvea.js:430855-431600 placement
function describeWorktreeWriteFence() {
  let e = hostWorktreeDeclaration();
  if (e === void 0) return;
  let { declared: declared, declaredFence: declaredFence } = e,
    s = getCurrentWorktreeSession()?.preEnterOriginalCwd ?? getOriginalCwd(),
    { answer: answer, problems: problems } = checkWorktreeFence(declared, declaredFence, s),
    S = `CLAUDE_CODE_HOST_WORKTREE=${declared ?? "(not set)"} CLAUDE_CODE_HOST_WORKTREE_FENCE=${declaredFence ?? "(not set)"}, session folder ${s}: ${answer === void 0 ? "ignored, so they block no file write" : `file tools may not write in ${answer.fence.join(", ")}, except inside ${answer.tree}`}${problems.map((R) => `; ${R.code}${typeof R.value === "string" ? ` ${JSON.stringify(R.value)}` : ""}`).join("")}`,
    w = getGitRepoCache();
  if (w.hostWorktreeReport !== S)
    if (
      ((w.hostWorktreeReport = S),
      logForDebugging(S, { level: problems.length > 0 ? "warn" : "debug" }),
      problems.length === 0)
    )
      logFeatureOk("worktree_host_declared");
    else if (answer === void 0) logFeatureBad("worktree_host_declared", problems[0].code);
    else logFeatureSad("worktree_host_declared", problems[0].code);
  return answer;
}
/**
 * 当前上下文的隔离 worktree：子代理自己的 worktree 优先，其次项目的 isolationRoot（非特定模式下），最后是当前 worktree 会话的路径。
 */
//@ chunk-s61vbvea.js:431600-431764 placement
function isolationWorktreeFor(e) {
  if (e.agentWorktree) return e.agentWorktree;
  if (!aqo()) {
    let n = e.session.project?.isolationRoot;
    if (n && !BNe()) return n;
  }
  return getCurrentWorktreeSession()?.worktreePath || void 0;
}
//@ chunk-s61vbvea.js:431764-431833 placement
function aqo() {
  return env.CLAUDE_CODE_SESSION_KIND === "bg" || getBgTakeover() !== null;
}
//@ chunk-s61vbvea.js:431833-431869 placement
function BNe() {
  return hostWorktreeDeclaration() !== void 0;
}
//@ chunk-s61vbvea.js:432292-432332 placement
var lei = /\p{Cc}/u,
  o4r = /[\p{Cc}\p{Cf}]/u;
//@ chunk-s61vbvea.js:432332-432383 placement = isDangerousFilePathToAutoEdit (1)
function getClaudeWorktreesDir(repoRoot) {
  return join_14(repoRoot, ".claude", "worktrees");
}
//@ chunk-s61vbvea.js:432383-432457 placement = isDangerousFilePathToAutoEdit (0.775)
function getWorktreesDirSpec(repoRoot) {
  return { dir: getClaudeWorktreesDir(repoRoot), anchor: repoRoot, below: [".claude", "worktrees"] };
}
//@ chunk-s61vbvea.js:432457-432527 placement
function s4r(e, n) {
  return { dir: join_14(n, ...e.below), anchor: n, below: e.below };
}
//@ chunk-s61vbvea.js:432527-432839 placement
function parseWorktreeAddError(e, n) {
  let parts = e.split(/[\r\n]/);
  return [
    `fatal: '${n}' is already used by worktree at `,
    `fatal: '${n}' is already checked out at `,
    `fatal: cannot force update the branch '${n}' used by worktree at `,
    `fatal: cannot force update the branch '${n}' checked out at `,
  ].some((s) => parts.some((h) => h.startsWith(s)));
}
/**
 * 给出一个路径相对仓库的安全描述：仓库外或路径段含不安全字符时只说"仓库外/内某处（不显示）"，否则显示路径。
 */
//@ chunk-s61vbvea.js:432839-433072 placement
function describeRepoRelativeLocation(e, n) {
  let r = relative_7(n, e);
  if (r === ".." || r.startsWith(`..${sep_7}`) || isAbsolute_12(r))
    return "a location outside the repository (not shown)";
  return r === "" || r.split(sep_7).every((s) => T0.test(s))
    ? hideUnsafePath(e)
    : "a location inside the repository (not shown)";
}
//@ chunk-s61vbvea.js:433072-433100 placement
var T0 = /^[a-zA-Z0-9._+-]+$/;
//@ chunk-s61vbvea.js:433100-433158 placement
function cb(e, n) {
  return `${hideUnsafePath(relative_7(e, n))} in the repository`;
}
//@ chunk-s61vbvea.js:433158-433773 placement
async function checkWorktreePath(e, n) {
  let r = [...e.below.map((s, h, y) => join_14(e.anchor, ...y.slice(0, h + 1))), n];
  for (let s of r) {
    let h;
    try {
      h = await lstat_5(s);
    } catch (error) {
      if (isENOENT(error)) continue;
      return {
        ok: !1,
        reason: "lstat_failed",
        message: `Cannot create worktree: failed to lstat ${cb(e.anchor, s)}: it could not be read${getErrnoCode(error) ? ` (${getErrnoCode(error)})` : ""}`,
      };
    }
    if (h.isSymbolicLink())
      return {
        ok: !1,
        reason: "symlink",
        message: `Cannot create worktree: ${cb(e.anchor, s)} is a symlink. A repository-committed symlink at .claude, .claude/worktrees, or .claude/worktrees/<name> could redirect worktree creation outside the repository. Remove the symlink and retry.`,
      };
  }
  return { ok: !0 };
}
//@ chunk-s61vbvea.js:433773-433803 placement
function i4r(e) {
  return getWorktreesDirSpec(e);
}
//@ chunk-s61vbvea.js:433803-433834 placement
function Xyn(e) {
  return [i4r(e)];
}
//@ chunk-s61vbvea.js:433834-433909 placement
function rie(e) {
  let n = getRepoRootForWorktreePath(e);
  return n === null ? null : { checkout: n, home: getWorktreesDirSpec(n) };
}
/**
 * 异步检查 worktree 隔离是否可靠：读取该 worktree 与候选仓库根的 git 身份，交给 checkWorktreeIsolation_2 比对（选项控制自持 pin 的见证要求）。
 */
//@ chunk-s61vbvea.js:433909-434277 placement
async function checkWorktreeIsolation(worktreePath, repoRoots, extraRoots = [], options) {
  let [h, y] = await Promise.all([db(worktreePath), D0(worktreePath)]),
    S = new Set(repoRoots),
    w = new Set(extraRoots),
    R = uniq([...repoRoots, ...extraRoots]),
    x = options?.requireWitnessForSelfOwningPins === !0,
    P = options?.declineSelfOwningPinUnderLiveRoot === !0;
  if (typeof h.ids !== "object") return checkWorktreeIsolation_3(worktreePath, h, y, R, S, w, [], x, P);
  let results = await Promise.all(
    candidateRepoRoots(worktreePath, R, h.ids).map(async (G) => ({ root: G, ...(await db(G)) })),
  );
  return checkWorktreeIsolation_3(worktreePath, h, y, R, S, w, results, x, P);
}
/**
 * checkWorktreeIsolation 的同步版本。
 */
//@ chunk-s61vbvea.js:434277-434587 placement
function checkWorktreeIsolationSync(worktreePath, repoRoots, extraRoots = [], options) {
  let h = fb(worktreePath),
    y = N0(worktreePath),
    S = new Set(repoRoots),
    w = new Set(extraRoots),
    R = uniq([...repoRoots, ...extraRoots]),
    x = options?.requireWitnessForSelfOwningPins === !0,
    P = options?.declineSelfOwningPinUnderLiveRoot === !0;
  if (typeof h.ids !== "object") return checkWorktreeIsolation_3(worktreePath, h, y, R, S, w, [], x, P);
  let mapped = candidateRepoRoots(worktreePath, R, h.ids).map((G) => ({ root: G, ...fb(G) }));
  return checkWorktreeIsolation_3(worktreePath, h, y, R, S, w, mapped, x, P);
}
/**
 * 检查工作树隔离是否可靠（符号链接、.git 条目、仓库内外位置）
 */
//@ chunk-s61vbvea.js:434587-441228 placement
function checkWorktreeIsolation_3(e, n, r, s, h, y, S, w = !1, R = !1) {
  if (r)
    return unverifiableIsolationResult(
      e,
      "it is a symbolic link, so the tree it would isolate into cannot be pinned down",
    );
  if (n.entry === "unverifiable")
    return unverifiableIsolationResult(e, "its .git entry exists but could not be examined");
  let ids = n.ids;
  if (ids === "error") return unverifiableIsolationResult(e, "git could not be run to resolve it");
  if (typeof ids === "object" && ids.isBare === !0)
    return unverifiableIsolationResult(e, "it is a bare repository, not a working tree");
  if (ids === "no-repo") {
    if (n.entry !== "absent")
      return unverifiableIsolationResult(e, "a .git entry exists there but git could not resolve it");
    for (let L of s) {
      if (!h.has(L)) continue;
      if (mayBeOutside(e, L))
        return {
          ok: !1,
          reason: "pin-is-protected-checkout",
          message: g_(
            `Refusing to use ${e} as an isolation worktree: it contains the protected checkout ${L}, so adopting it would disarm every isolation check for that checkout.`,
          ),
        };
    }
    for (let L of y)
      if (mayBeOutside(e, L))
        return {
          ok: !1,
          reason: "pin-is-own-launch-tree",
          message: g_(
            `This resume was started from inside ${e}, a non-git directory \u2014 nothing can confirm it as a separate isolation tree from there. Run the resume from the project checkout instead.`,
          ),
        };
    return { ok: !0, reason: "not-a-git-worktree" };
  }
  if (ids.symlinkedRefStore.length > 0)
    return {
      ok: !1,
      reason: "invalid-linked-worktree",
      message: g_(
        `Refusing to use ${e} as an isolation worktree: its git metadata has symbolic links in place of ${ids.symlinkedRefStore.join(", ")}, which aliases another repository's refs into this tree. Recreate the worktree with git worktree add, then retry.`,
      ),
    };
  if (ids.unexaminableRefStore.length > 0)
    return unverifiableIsolationResult(
      e,
      `its ref storage could not be fully examined (${ids.unexaminableRefStore[0]})`,
    );
  let P = R6(ids.topLevel, e);
  if (P === "indeterminate")
    return unverifiableIsolationResult(
      e,
      `its working tree resolves to a path that cannot be safely compared (${ids.topLevel})`,
    );
  if (P === "distinct")
    return {
      ok: !1,
      reason: "work-tree-elsewhere",
      message: g_(
        `Refusing to use ${e} as an isolation worktree: git resolves its working tree to ${ids.topLevel} (a core.worktree redirect, or a checkout discovered above it), so commands run there would write outside the worktree. Remove the redirect, restore the worktree's own .git, or recreate the worktree, then retry.`,
      ),
    };
  let j = R6(ids.commonDir, ids.gitDir) !== "distinct";
  for (let L of S) {
    let included = s.includes(L.root),
      Q = Ri(L.root, e);
    if (Q !== "same" && y.has(L.root) && !h.has(L.root) && mayBeOutside(e, L.root)) {
      if (!j && Sb(e, ids.commonDir)) continue;
      if (!j)
        return {
          ok: !1,
          reason: "pin-is-own-launch-tree",
          message: g_(
            `The worktree ${e} contains the directory this resume ran from, and nothing in this session vouches for its worktree registration \u2014 an isolation worktree never contains its own launch position. Run the resume from the project checkout instead.`,
          ),
        };
      return {
        ok: !1,
        reason: "pin-is-own-launch-tree",
        message: g_(
          `This resume was started from inside ${e} (or a directory it contains), which is its own repository \u2014 it cannot be confirmed as a separate isolation worktree from there. Run the resume from the project checkout instead.`,
        ),
      };
    }
    if (Q === "same") {
      if (included && h.has(L.root))
        return {
          ok: !1,
          reason: "pin-is-protected-checkout",
          message: g_(
            `Refusing to use ${e} as an isolation worktree: it is the checkout this session launched from. An honest launch-from-inside and a forged record are indistinguishable here, so both are refused \u2014 launch from the parent checkout to enter or resume this worktree.`,
          ),
        };
      if (included && j)
        return {
          ok: !1,
          reason: "pin-is-own-launch-tree",
          message: g_(
            `This resume was started from inside ${e}, which is its own repository \u2014 it cannot be confirmed as a separate isolation worktree from there. Run the resume from the project checkout instead.`,
          ),
        };
      continue;
    }
    if (L.entry === "unverifiable")
      return unverifiableIsolationResult(
        e,
        `the protected checkout ${L.root} has a .git entry that could not be examined`,
      );
    if (typeof L.ids !== "object") {
      if (L.ids === "no-repo") continue;
      return unverifiableIsolationResult(
        e,
        `the protected checkout ${L.root} has git metadata that could not be resolved`,
      );
    }
    let Z = Ri(ids.gitDir, L.ids.gitDir);
    if (Z === "indeterminate")
      return unverifiableIsolationResult(
        e,
        `its git directory (${ids.gitDir}) could not be safely compared with the protected checkout's`,
      );
    if (Z === "same")
      return {
        ok: !1,
        reason: "shared-git-dir",
        message: g_(
          `Refusing to use ${e} as an isolation worktree: its git directory is the shared checkout's own (${ids.gitDir}), so git commands there move the protected checkout's branches and refs. This usually means the worktree's .git file is stale or was rewritten \u2014 recreate the worktree, then retry.`,
        ),
      };
  }
  if (j && h.size === 0) {
    if (w)
      return {
        ok: !1,
        reason: "pin-is-own-launch-tree",
        message: g_(
          `The worktree ${e} is its own repository and nothing vouches for it from this session \u2014 it cannot be resumed or re-entered. Re-create it (a fresh isolated tree); the existing tree and its work remain on disk at ${e} for manual recovery.`,
        ),
      };
    if (R) {
      for (let L of y)
        if (Ri(L, e) !== "same" && mayBeOutside(L, e))
          return {
            ok: !1,
            reason: "pin-is-own-launch-tree",
            message: g_(
              `The worktree ${e} sits under the directory this resume ran from, and nothing else vouches for it \u2014 it cannot be resumed or re-entered. Re-create it (a fresh isolated tree); the existing tree and its work remain on disk at ${e} for manual recovery. Where it has a parent checkout, resuming from there also works.`,
            ),
          };
    }
  }
  for (let L of s) {
    if (Ri(L, e) === "same") continue;
    if (!mayBeOutside(e, L)) continue;
    if (y.has(L) && !h.has(L)) {
      if (!j && Sb(e, ids.commonDir)) continue;
      if (!j)
        return {
          ok: !1,
          reason: "pin-is-own-launch-tree",
          message: g_(
            `The worktree ${e} contains the directory this resume ran from, and nothing in this session vouches for its worktree registration \u2014 an isolation worktree never contains its own launch position. Run the resume from the project checkout instead.`,
          ),
        };
      return {
        ok: !1,
        reason: "pin-is-own-launch-tree",
        message: g_(
          `This resume was started from inside ${e} (or a directory it contains), which is its own repository \u2014 it cannot be confirmed as a separate isolation worktree from there. Run the resume from the project checkout instead.`,
        ),
      };
    }
    return {
      ok: !1,
      reason: "pin-is-protected-checkout",
      message: g_(
        `Refusing to use ${e} as an isolation worktree: it contains the protected checkout ${L}, so adopting it would disarm every isolation check for that checkout.`,
      ),
    };
  }
  let G = R6(ids.commonDir, ids.gitDir);
  if (G === "indeterminate")
    return unverifiableIsolationResult(
      e,
      `its git metadata (common dir ${ids.commonDir}) could not be safely compared`,
    );
  if (G === "distinct") {
    let L = R6(dirname_4(ids.gitDir), join_13(ids.commonDir, "worktrees")),
      q =
        ids.backPointer !== null && R6(resolve_7(ids.gitDir, ids.backPointer), join_13(e, ".git")) === "same";
    if (L !== "same" || !q)
      return {
        ok: !1,
        reason: "invalid-linked-worktree",
        message: g_(
          `Refusing to use ${e} as an isolation worktree: it uses another repository's refs (${ids.commonDir}) without being a registered worktree of it (its admin directory or back-pointer does not check out). Recreate the worktree with git worktree add, then retry.`,
        ),
      };
  }
  return { ok: !0, reason: "verified" };
}
//@ chunk-s61vbvea.js:441228-441335 placement
function candidateRepoRoots(e, n, r) {
  let s = basename_4(r.commonDir) === ".git" ? dirname_4(r.commonDir) : null;
  return uniq([...n, ...(s !== null ? [s] : [])]);
}
/**
 * 返回 {ok:false, reason:"unverifiable"}：worktree 的 git 身份无法核验，拒绝用作隔离 worktree 的说明。
 */
//@ chunk-s61vbvea.js:441335-441614 placement
function unverifiableIsolationResult(e, n) {
  return {
    ok: !1,
    reason: "unverifiable",
    message: g_(
      `Refusing to use ${e} as an isolation worktree: ${n}, so its git identity could not be verified. Isolation is refused rather than assumed \u2014 recreate the worktree (or remove the corrupt .git entry) and retry.`,
    ),
  };
}
//@ chunk-s61vbvea.js:441614-441710 placement
async function db(e) {
  let [n, r] = await Promise.all([Rb(join_13(e, ".git")), readGitDirs(e)]);
  return { entry: n, ids: r };
}
//@ chunk-s61vbvea.js:441710-441766 placement
function fb(e) {
  return { entry: xb(join_13(e, ".git")), ids: probeGitIdentitySync(e) };
}
//@ chunk-s61vbvea.js:441766-441843 placement
async function Rb(e) {
  try {
    return (await lstat_4(e), "present");
  } catch (error) {
    return er(error);
  }
}
//@ chunk-s61vbvea.js:441843-441908 placement
function xb(e) {
  try {
    return (lstatSync_2(e), "present");
  } catch (error) {
    return er(error);
  }
}
//@ chunk-s61vbvea.js:441908-441986 placement
async function D0(e) {
  try {
    return (await lstat_4(e)).isSymbolicLink();
  } catch {
    return !1;
  }
}
//@ chunk-s61vbvea.js:441986-442051 placement
function N0(e) {
  try {
    return lstatSync_2(e).isSymbolicLink();
  } catch {
    return !1;
  }
}
//@ chunk-s61vbvea.js:442051-442136 placement
function er(e) {
  let n = getErrnoCode(e);
  return n === "ENOENT" || n === "ENOTDIR" ? "absent" : "unverifiable";
}
//@ chunk-s61vbvea.js:442136-442229 placement
var Dl = 2000,
  Tb = [...freeze_6, "rev-parse", "--absolute-git-dir", "--show-toplevel", "--git-common-dir"];
//@ chunk-s61vbvea.js:442229-443089 placement
async function readGitDirs(e) {
  let n = await execFileNoThrowWithCwd(gitExe(), [...Tb], {
    cwd: e,
    env: getRemoteHostSessionCount(),
    timeout: Dl,
    useToolMemoryCgroup: !1,
    preserveOutputOnError: !0,
  });
  if (n.code !== 0) {
    if (await readDirNamesCapped(e)) return "no-repo";
    if (Ab(n.stderr)) {
      let y = await execFileNoThrowWithCwd(
        gitExe(),
        [...freeze_6, "rev-parse", "--absolute-git-dir", "--git-common-dir"],
        {
          cwd: e,
          env: getRemoteHostSessionCount(),
          timeout: Dl,
          useToolMemoryCgroup: !1,
          preserveOutputOnError: !0,
        },
      );
      if (y.code === 0) {
        let S = parseBareRevParse(e, y.stdout);
        if (S !== null) {
          let [w, R] = await Promise.all([readGitdirFile(S.gitDir), scanGitDirSymlinks(S.gitDir)]);
          return {
            ...S,
            backPointer: w,
            symlinkedRefStore: R.symlinks,
            unexaminableRefStore: R.unexaminable,
          };
        }
      }
      return "error";
    }
    if (isNotGitRepoError(n.stderr)) return "no-repo";
    if (typeof n.exitCode === "number" && (await noGitAncestorEntries(e))) return "no-repo";
    return "error";
  }
  let r = parseRevParseOutput(e, n.stdout);
  if (r === null) return "error";
  let [s, h] = await Promise.all([readGitdirFile(r.gitDir), scanGitDirSymlinks(r.gitDir)]);
  return { ...r, backPointer: s, symlinkedRefStore: h.symlinks, unexaminableRefStore: h.unexaminable };
}
/**
 * 同步运行 git rev-parse 探测目录的 git 身份：失败时区分无仓库、裸仓库（再探 absolute-git-dir / common-dir）与错误，成功时附带 git 目录的符号链接检查结果。
 */
//@ chunk-s61vbvea.js:443089-443978 placement
function probeGitIdentitySync(cwd) {
  let result;
  try {
    result = safeExecFileSync(gitExe(), [...Tb], {
      cwd: cwd,
      env: getRemoteHostSessionCount(),
      reject: !1,
      timeout: Dl,
      useToolMemoryCgroup: !1,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return "error";
  }
  if (result.exitCode !== 0) {
    if (readDirNamesCappedSync(cwd)) return "no-repo";
    if (Ab(result.stderr)) {
      let fallback;
      try {
        fallback = safeExecFileSync(
          gitExe(),
          [...freeze_6, "rev-parse", "--absolute-git-dir", "--git-common-dir"],
          {
            cwd: cwd,
            env: getRemoteHostSessionCount(),
            reject: !1,
            timeout: Dl,
            useToolMemoryCgroup: !1,
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
      } catch {
        return "error";
      }
      if (fallback.exitCode === 0) {
        let fallbackDirs = parseBareRevParse(cwd, fallback.stdout);
        if (fallbackDirs !== null) {
          let fallbackRefScan = scanGitDirSymlinksSync(fallbackDirs.gitDir);
          return {
            ...fallbackDirs,
            backPointer: readGitdirFileSync(fallbackDirs.gitDir),
            symlinkedRefStore: fallbackRefScan.symlinks,
            unexaminableRefStore: fallbackRefScan.unexaminable,
          };
        }
      }
      return "error";
    }
    if (isNotGitRepoError(result.stderr)) return "no-repo";
    if (typeof result.exitCode === "number" && result.timedOut !== !0 && $0(cwd)) return "no-repo";
    return "error";
  }
  let dirs = parseRevParseOutput(cwd, result.stdout);
  if (dirs === null) return "error";
  let refScan = scanGitDirSymlinksSync(dirs.gitDir);
  return {
    ...dirs,
    backPointer: readGitdirFileSync(dirs.gitDir),
    symlinkedRefStore: refScan.symlinks,
    unexaminableRefStore: refScan.unexaminable,
  };
}
//@ chunk-s61vbvea.js:443978-444047 placement
function g_(e) {
  return e.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
}
//@ chunk-s61vbvea.js:444047-444157 placement
function isNotGitRepoError(e) {
  return /not a git repository/i.test(e) || /gitfile does not point to a valid repository/i.test(e);
}
//@ chunk-s61vbvea.js:444157-444281 placement
async function noGitAncestorEntries(e) {
  let n = gitAncestorEntryPaths(e);
  if (n === null) return !1;
  return (await Promise.all(n.map((s) => Rb(s)))).every((s) => s === "absent");
}
//@ chunk-s61vbvea.js:444281-444356 placement
function $0(e) {
  let n = gitAncestorEntryPaths(e);
  return n !== null && n.every((r) => xb(r) === "absent");
}
/**
 * 列出路径各级祖先下的 .git 与 HEAD 路径（Windows 或无法规范化、非 UTF-8 时返回 null），用于确认祖先中没有仓库。
 */
//@ chunk-s61vbvea.js:444356-444669 placement
function gitAncestorEntryPaths(e) {
  if (getPlatform_2() === "windows") return null;
  if (resolveContainmentTarget(e).canonical === null) return null;
  let n;
  try {
    let native = realpathSync_4.native(e, { encoding: "buffer" });
    if (((n = native.toString("utf8")), !Buffer.from(n, "utf8").equals(native))) return null;
  } catch {
    return null;
  }
  let r = [];
  for (let s = n; ;) {
    r.push(join_13(s, ".git"), join_13(s, "HEAD"));
    let h = dirname_4(s);
    if (h === s) return r;
    s = h;
  }
}
//@ chunk-s61vbvea.js:444669-444772 placement = isRealPathWithinTeamDir (1)
async function readDirNamesCapped(realCandidate) {
  try {
    return (await lstat_4(realCandidate), !1);
  } catch (error) {
    let code = getErrnoCode(error);
    return code === "ENOENT" || code === "ENOTDIR";
  }
}
//@ chunk-s61vbvea.js:444772-444863 placement = isRealPathWithinTeamDir (1)
function readDirNamesCappedSync(realCandidate) {
  try {
    return (lstatSync_2(realCandidate), !1);
  } catch (error) {
    let code = getErrnoCode(error);
    return code === "ENOENT" || code === "ENOTDIR";
  }
}
//@ chunk-s61vbvea.js:444863-444941 placement
function Ab(e) {
  return e.includes("this operation must be run in a work tree");
}
//@ chunk-s61vbvea.js:444941-445174 placement
function parseBareRevParse(e, n) {
  let filtered = n
    .split(
      `
`,
    )
    .filter((h) => h.length > 0);
  if (filtered.length !== 2) return null;
  if (filtered.some((h) => /[\u0000-\u001f\u007f-\u009f]/.test(h))) return null;
  let s = filtered[1];
  return { gitDir: filtered[0], topLevel: e, commonDir: isAbsolute_11(s) ? s : join_13(e, s), isBare: !0 };
}
//@ chunk-s61vbvea.js:445174-445400 placement
function parseRevParseOutput(e, n) {
  let filtered = n
    .split(
      `
`,
    )
    .filter((h) => h.length > 0);
  if (filtered.length !== 3) return null;
  if (filtered.some((h) => /[\u0000-\u001f\u007f-\u009f]/.test(h))) return null;
  let s = filtered[2];
  return { gitDir: filtered[0], topLevel: filtered[1], commonDir: isAbsolute_11(s) ? s : resolve_7(e, s) };
}
//@ chunk-s61vbvea.js:445400-445413 placement
var qo = 65536;
//@ chunk-s61vbvea.js:445413-445711 placement
async function readGitdirFile(e) {
  try {
    if (!(await lstat_4(join_13(e, "gitdir"))).isFile()) return null;
    let r = await open_6(join_13(e, "gitdir"), "r");
    try {
      if ((await r.stat()).size > qo) return null;
      let alloc = Buffer.alloc(qo),
        { bytesRead: bytesRead } = await r.read(alloc, 0, qo, 0);
      return alloc.toString("utf-8", 0, bytesRead).trim();
    } finally {
      await r.close();
    }
  } catch {
    return null;
  }
}
//@ chunk-s61vbvea.js:445711-445948 placement
function readGitdirFileSync(e) {
  try {
    if (!lstatSync_2(join_13(e, "gitdir")).isFile()) return null;
    let n = openSync_2(join_13(e, "gitdir"), "r");
    try {
      if (fstatSync(n).size > qo) return null;
      let alloc = Buffer.alloc(qo),
        s = readSync_2(n, alloc, 0, qo, 0);
      return alloc.toString("utf-8", 0, s).trim();
    } finally {
      closeSync_2(n);
    }
  } catch {
    return null;
  }
}
//@ chunk-s61vbvea.js:445948-445966 placement
var Mb = 12,
  Nl = 4096;
/**
 * 扫描 git 目录顶层与 refs/ 下的符号链接（有条目数与深度上限），返回 {symlinks, unexaminable}。
 */
//@ chunk-s61vbvea.js:445966-446361 placement
async function scanGitDirSymlinks(e) {
  let n = [],
    r = [],
    s;
  try {
    s = await readdir_5(e);
  } catch (error) {
    if (er(error) !== "absent") r.push("(git dir unreadable)");
    s = [];
  }
  if (s.length > Nl) (r.push("(over-cap top-level entries)"), (s = []));
  return (
    await Promise.all(
      s.map(async (h) => {
        try {
          if ((await lstat_4(join_13(e, h))).isSymbolicLink()) n.push(h);
        } catch (error) {
          if (er(error) !== "absent") r.push(h);
        }
      }),
    ),
    await scanRefsSymlinks(join_13(e, "refs"), "refs", 0, n, r, { entries: Nl }),
    { symlinks: n, unexaminable: r }
  );
}
/**
 * 递归扫描 refs 目录中的符号链接，超过深度/条目上限或无法读取时记入 unexaminable。
 */
//@ chunk-s61vbvea.js:446361-446877 placement
async function scanRefsSymlinks(dir, label, depth, symlinks, unexaminable, budget) {
  if (depth > Mb) {
    unexaminable.push(`${label} (too deep to examine)`);
    return;
  }
  if (budget.entries <= 0) {
    unexaminable.push(`${label} (too many entries to examine)`);
    return;
  }
  let S;
  try {
    S = await readdir_5(dir);
  } catch (error) {
    if (er(error) !== "absent") unexaminable.push(`${label} (unreadable)`);
    return;
  }
  for (let w of S) {
    if (--budget.entries < 0) {
      unexaminable.push(`${label} (too many entries to examine)`);
      return;
    }
    let R = join_13(dir, w),
      x = `${label}/${w}`;
    try {
      let P = await lstat_4(R);
      if (P.isSymbolicLink()) symlinks.push(x);
      else if (P.isDirectory()) await scanRefsSymlinks(R, x, depth + 1, symlinks, unexaminable, budget);
    } catch (error) {
      if (er(error) !== "absent") unexaminable.push(`${x} (unreadable)`);
    }
  }
}
/**
 * 同步扫描 git 目录顶层与 refs 下的符号链接，返回符号链接列表和无法检查的项（不可读、条目超限等）。
 */
//@ chunk-s61vbvea.js:446877-447222 placement
function scanGitDirSymlinksSync(e) {
  let n = [],
    r = [],
    s;
  try {
    s = readdirSync_2(e);
  } catch (error) {
    if (er(error) !== "absent") r.push("(git dir unreadable)");
    s = [];
  }
  if (s.length > Nl) (r.push("(over-cap top-level entries)"), (s = []));
  for (let h of s)
    try {
      if (lstatSync_2(join_13(e, h)).isSymbolicLink()) n.push(h);
    } catch (error) {
      if (er(error) !== "absent") r.push(h);
    }
  return (
    scanRefsSymlinksSync(join_13(e, "refs"), "refs", 0, n, r, { entries: Nl }),
    { symlinks: n, unexaminable: r }
  );
}
/**
 * 递归扫描 refs 目录中的符号链接：受深度与总条目数限制，超限或不可读的位置记入无法检查列表。
 */
//@ chunk-s61vbvea.js:447222-447714 placement
function scanRefsSymlinksSync(e, n, r, s, h, y) {
  if (r > Mb) {
    h.push(`${n} (too deep to examine)`);
    return;
  }
  if (y.entries <= 0) {
    h.push(`${n} (too many entries to examine)`);
    return;
  }
  let S;
  try {
    S = readdirSync_2(e);
  } catch (error) {
    if (er(error) !== "absent") h.push(`${n} (unreadable)`);
    return;
  }
  for (let w of S) {
    if (--y.entries < 0) {
      h.push(`${n} (too many entries to examine)`);
      return;
    }
    let R = join_13(e, w),
      x = `${n}/${w}`;
    try {
      let P = lstatSync_2(R);
      if (P.isSymbolicLink()) s.push(x);
      else if (P.isDirectory()) scanRefsSymlinksSync(R, x, r + 1, s, h, y);
    } catch (error) {
      if (er(error) !== "absent") h.push(`${x} (unreadable)`);
    }
  }
}
//@ chunk-s61vbvea.js:447714-447878 placement
function comparePathTargets(e, n, r) {
  let s = resolveContainmentTarget(e),
    h = resolveContainmentTarget(n);
  if (NW(s) || NW(h)) return "indeterminate";
  if (s.skipped !== h.skipped) return "indeterminate";
  return r(s, h) && r(h, s) ? "same" : "distinct";
}
//@ chunk-s61vbvea.js:447878-447990 placement
function mayBeOutside(e, n) {
  let r = resolveContainmentTarget(e),
    s = resolveContainmentTarget(n);
  if (NW(r) || NW(s)) return !0;
  if (r.skipped !== s.skipped) return !0;
  return isOutsideContainment(s, r);
}
//@ chunk-s61vbvea.js:447990-448026 placement
function Ri(e, n) {
  return comparePathTargets(e, n, isOutsideContainment);
}
//@ chunk-s61vbvea.js:448026-448062 placement
function R6(e, n) {
  return comparePathTargets(e, n, isSameContainmentPath);
}
//@ chunk-s61vbvea.js:448062-448139 placement
function Sb(e, n) {
  let r = rie(e);
  return r !== null && Ri(r.checkout, dirname_4(n)) === "same";
}
/**
 * 判断 worktree 路径确属一个仓库，且该仓库与给定的某个目录的规范 git 根相同（三处 R6 身份比对都为 same）。
 */
//@ chunk-s61vbvea.js:448139-448361 placement
function isSameRepoWorktree(e, n) {
  let r = getRepoRootForWorktreePath(e);
  if (r === null) return !1;
  let s = findGitRootUncached(e);
  if (s === null || R6(s, e) !== "same") return !1;
  let h = findCanonicalGitRootUncached(e);
  if (h === null || R6(r, h) !== "same") return !1;
  return n.some((y) => {
    let S = findCanonicalGitRoot(y);
    return S !== null && R6(r, S) === "same";
  });
}
/**
 * 求路径所属的 git 根目录（普通与规范化根，加上额外候选），排除特殊路径并去重。
 */
//@ chunk-s61vbvea.js:448361-448485 placement
function gitRootsForPath(e, ...n) {
  if (ai(e) || yl(e)) return [];
  return uniq(
    [findGitRoot(e), findCanonicalGitRoot(e), ...n].filter(
      (r) => r !== null && r !== void 0 && !ai(r) && !yl(r),
    ),
  );
}
//@ chunk-s61vbvea.js:448485-449839 placement
function BLOCKED_CWD_MESSAGES(e, n) {
  {
    let r = sharedCheckoutRoots(e, n);
    if (r.escaped) {
      if (NW(r.dir))
        return `This command was blocked because its working directory is spelled in a form that cannot be safely resolved (for example through a symlink storing a raw dot segment, a network-share or device-namespace shape, or an unreadable ancestor directory). If the directory is inside the worktree ${n}, re-run the command from its direct symlink-free path.`;
      if (r.dir.skipped && !r.roots.some((root) => root.skipped || NW(root)))
        return `This command was blocked because its working directory is network-shaped (a UNC share or /net automount spelling) while the protected checkout is local. If the directory is genuinely inside the worktree ${n}, re-run the command from its local, plainly-spelled path.`;
      let { noun: noun, possessive: possessive } = isolationSubjectWords(n),
        y = BNe() ? null : linkedWorktreeRepoRoot(r);
      if (y !== null) {
        let S = g_(n);
        return `${noun} is isolated in the worktree ${S}, but this command's working directory (${g_(e)}) is in a different worktree (${g_(y)}). Refusing to run it there \u2014 ${possessive} commands must run inside its own worktree. Re-run the command from ${S}.`;
      }
      return `${noun} is isolated in the worktree ${n}, but this command's working directory resolved to the shared checkout (${e}). Refusing to run it there \u2014 ${possessive} commands must run inside its worktree. Re-run the command from ${n}.${describeCaseOnlyMismatch(r.dir.canonical, r.worktree.canonical, n)}`;
    }
  }
  return null;
}
//@ chunk-s61vbvea.js:449839-449967 placement
function linkedWorktreeRepoRoot(e) {
  let canonical = e.dir.canonical,
    canonical_2 = e.worktree.canonical;
  if (canonical === null || canonical_2 === null || Nf(canonical, canonical_2)) return null;
  return isLinkedWorktree(canonical) ? findGitRoot(canonical) : null;
}
/**
 * worktree 隔离提示中的主语：当前会话的 worktree 时称 This session，否则称 This agent。
 */
//@ chunk-s61vbvea.js:449967-450139 placement
function isolationSubjectWords(e) {
  return getCurrentWorktreeSession()?.worktreePath === e
    ? { noun: "This session", possessive: "a worktree-isolated session's" }
    : { noun: "This agent", possessive: "a worktree-isolated agent's" };
}
//@ chunk-s61vbvea.js:450139-450181 placement
function ber(e, n) {
  return sharedCheckoutRoots(e, n).escaped;
}
/**
 * 计算隔离 worktree 需要拦住的共享检出根：原始 cwd、会话启动锚点及其 git 根/规范 git 根，统一做包含判断解析。
 */
//@ chunk-s61vbvea.js:450181-450855 placement
function sharedCheckoutRoots(path, worktreePath) {
  let r = resolveContainmentTarget(path),
    s = getCurrentWorktreeSession(),
    h = null,
    y = uniq(
      (s !== null && s.worktreePath === worktreePath
        ? [s.originalCwd]
        : [getOriginalCwd(), s?.originalCwd]
      ).filter((q) => q !== void 0 && q !== ""),
    ),
    S = s?.liveLaunchAnchor !== void 0 && s.liveLaunchAnchor !== "" ? s.liveLaunchAnchor : void 0,
    w = S !== void 0 && (ai(S) || yl(S)),
    R = () => G0(worktreePath),
    x =
      S !== void 0 && !w
        ? [findGitRoot(S), findCanonicalGitRoot(S)].filter((q) => q !== null && q !== void 0)
        : [],
    P = R(),
    j = x.length > 0,
    G = [
      ...y.flatMap((q) => (ai(q) || yl(q) ? [q] : [findGitRoot(q) ?? q, findCanonicalGitRoot(q)])),
      ...x,
      ...(S !== void 0 && !j ? [S] : []),
      P,
    ],
    mapped = uniq(G.filter((q) => q !== null)).map((q) => resolveContainmentTarget(q));
  if (!mapped.some((q) => isOutsideContainment(r, q)))
    return { dir: r, worktree: h, roots: mapped, escaped: !1 };
  if (((h ??= resolveContainmentTarget(worktreePath)), isSameContainmentPath(r, h)))
    return { dir: r, worktree: h, roots: mapped, escaped: !1 };
  return { dir: r, worktree: h, roots: mapped, escaped: !0 };
}
//@ chunk-s61vbvea.js:450855-450956 placement
function canonicalRepoRootOrSentinel(e) {
  if (!isLinkedWorktree(e)) return lde;
  let n = resolveContainmentTarget(e);
  if (!detectTerminal(findGitRoot(e), n.lexical)) return lde;
  return findCanonicalGitRoot(e) ?? lde;
}
//@ chunk-s61vbvea.js:450956-451034 placement
function G0(e) {
  let n = uut(getGitRepoCache().linkedFromRootByPin, e, canonicalRepoRootOrSentinel);
  return n === lde ? null : n;
}
//@ chunk-s61vbvea.js:451034-451166 placement = detectTerminal (0.92)
function detectTerminal(e, n, r = "linux") {
  if (e === null) return !1;
  let s = r === "darwin" ? isSystemVolumePath(e) : e;
  if (r !== "win32") s = isNetworkMountPath(s, r);
  else s = toWin32Backslashes(isWslLocalhostPath(s));
  return s === n;
}
//@ chunk-s61vbvea.js:451166-451191 placement
var freeze_2 = Object.freeze({});
//@ chunk-s61vbvea.js:451191-451302 placement
class IsolationRuntimeSlot {
  #e;
  register(e) {
    this.#e ??= e;
  }
  get runtime() {
    return this.#e ?? freeze_2;
  }
  get registered() {
    return this.#e !== void 0;
  }
}
//@ chunk-s61vbvea.js:451302-451327 placement
var K0 = new HostScoped(() => new IsolationRuntimeSlot());
//@ chunk-s61vbvea.js:451327-451364 placement
function $b() {
  return K0.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:451364-451397 placement
function mei(e) {
  $b().register(e);
}
//@ chunk-s61vbvea.js:451397-451432 placement
function XVe() {
  return $b().runtime;
}
/**
 * 后台会话隔离方式：环境变量 CLAUDE_BG_ISOLATION（worktree/none）优先，其次后台接管设置，最后读 settings.worktree.bgIsolation。
 */
//@ chunk-e6aww6q8.js:1369111-1369264 placement
function getBgIsolationSetting() {
  let CLAUDE_BG_ISOLATION = env.CLAUDE_BG_ISOLATION;
  if (CLAUDE_BG_ISOLATION === "worktree" || CLAUDE_BG_ISOLATION === "none") return CLAUDE_BG_ISOLATION;
  let n = getBgTakeover();
  if (n) return n.bgIsolation;
  return getInitialSettings_2().worktree?.bgIsolation;
}
/**
 * 检查路径是否在 worktree 隔离范围内，范围外时提示改写 worktree 中的副本。
 */
//@ chunk-e6aww6q8.js:1369264-1371063 placement
function checkWorktreeIsolation_2(e, n) {
  {
    let r = isolationWorktreeFor(n);
    if (r) {
      let G = sharedCheckoutRoots(e, r);
      if (!G.escaped) return worktreeFenceWriteNotice(e, r);
      let q = pathContainmentKind(G.dir, G.roots);
      if (q === "unresolvable") return unresolvableWriteMessage(r);
      if (q === "network") return networkWriteMessage(r);
      let { noun: noun } = isolationSubjectWords(r),
        Se = BNe() ? null : linkedWorktreeRepoRoot(G);
      if (Se !== null) {
        let ke = g_(r);
        return `${noun} is isolated in the worktree ${ke}, so its writes are limited to that folder. This path is in a different worktree (${g_(Se)}). Edit the copy of this file under ${ke} instead.`;
      }
      return isolatedWorktreeEditMessage(noun, r, G.dir.canonical, G.worktree.canonical);
    }
    let s = worktreeFenceWriteNotice(e);
    if (s !== null) return s;
    if (!aqo()) return null;
    if (getBgIsolationSetting() === "none") return null;
    let h = n.agentId ? getOriginalCwd() : getCwd(),
      y = resolveContainmentTarget(e),
      S = resolveContainmentTarget(h);
    if (!isOutsideContainment(y, S)) return null;
    if (!findGitRoot(h) && (!hasWorktreeCreateHook() || aTi(h))) return null;
    if (isLinkedWorktree(h)) return null;
    if (y.canonical !== null && isLinkedWorktreeUncached(y.canonical)) return null;
    let w = pathContainmentKind(y, S);
    if (w === "unresolvable") return unresolvableWriteMessage();
    if (w === "network") return networkWriteMessage();
    let L = S.canonical !== null;
    if (n.agentId)
      return `This subagent's parent bg session hasn't isolated yet, so writes to the shared checkout are blocked. Re-spawn this agent with \`isolation: "worktree"\`${L ? `, have the parent call ${ENTER_WORKTREE_TOOL_NAME} before spawning, or make the edit inside a linked git worktree you create for this task with \`git worktree add\` \u2014 paths inside a worktree are accepted` : `, or have the parent call ${ENTER_WORKTREE_TOOL_NAME} before spawning`}. (To disable this guard for this repo, set \`"worktree": {"bgIsolation": "none"}\` in .claude/settings.json.)`;
    return `This background session hasn't isolated its changes yet. Call ${ENTER_WORKTREE_TOOL_NAME} first so edits land in a worktree instead of the shared checkout, then retry this edit using the worktree path${L ? " (a path inside a linked git worktree, including one you create with `git worktree add`, is accepted)" : ""}. (To disable this guard for this repo, set \`"worktree": {"bgIsolation": "none"}\` in .claude/settings.json.)`;
  }
  return null;
}
/**
 * 写入路径落在 worktree 围栏内的共享检出而非当前 worktree 时，返回提示"请编辑 worktree 中的副本"；在配置目录内等情况放行（返回 null）。
 */
//@ chunk-e6aww6q8.js:1371063-1371467 placement
function worktreeFenceWriteNotice(e, n) {
  let r = describeWorktreeWriteFence();
  if (r === void 0) return null;
  let canonical = resolveContainmentTarget(e).canonical,
    h = n === void 0 ? r.tree : resolveContainmentTarget(n).canonical;
  if (canonical === null || h === null) return null;
  let filtered = r.fence.filter((L) => isPathContainedIn(L, canonical));
  if (filtered.length === 0 || isPathContainedIn(r.tree, canonical) || isPathContainedIn(h, canonical))
    return null;
  let S = resolve_24(getClaudeConfigDir()),
    canonical_2 = resolveContainmentTarget(Tm(S) ?? S).canonical;
  if (
    canonical_2 !== null &&
    isPathContainedIn(canonical_2, canonical) &&
    filtered.every((L) => isPathContainedIn(L, canonical_2))
  )
    return null;
  return isolatedWorktreeEditMessage(
    n === void 0 ? "This session" : isolationSubjectWords(n).noun,
    g_(n ?? r.tree),
    canonical,
    h,
  );
}
//@ chunk-e6aww6q8.js:1371467-1371622 placement
function isolatedWorktreeEditMessage(e, n, r, s) {
  return `${e} is isolated in the worktree ${n}. Edit the worktree copy of this file instead of the shared-checkout path.${describeCaseOnlyMismatch(r, s, n)}`;
}
//@ chunk-e6aww6q8.js:1371622-1371778 placement
function pathContainmentKind(e, n) {
  if (NW(e)) return "unresolvable";
  let r = Array.isArray(n) ? n : [n];
  if (e.skipped && !r.some((s) => s.skipped || NW(s))) return "network";
  return "contained";
}
/**
 * 写入因路径无法安全解析（符号链接含原始点段、网络/设备命名空间、祖先目录不可读）被拦截时的说明，建议改用直接的普通路径（或 worktree 内的无链接路径）。
 */
//@ chunk-e6aww6q8.js:1371778-1372214 placement
function unresolvableWriteMessage(e) {
  return `This write was blocked because the path is spelled in a form that cannot be safely resolved (for example through a symlink storing a raw dot segment, a network-share or device-namespace shape, or an unreadable ancestor directory). ${e === void 0 ? "Retry the edit addressing the file by a direct, plainly-spelled path." : `If the file is inside the worktree ${e}, address it by its direct symlink-free path instead.`}`;
}
/**
 * 写入因路径是网络形态（UNC 共享或 /net 自动挂载）而本会话检出在本地被拦截时的说明，建议用本地普通路径访问。
 */
//@ chunk-e6aww6q8.js:1372214-1372627 placement
function networkWriteMessage(e) {
  return `This write was blocked because the path is network-shaped (a UNC share or /net automount spelling) while this session's checkout is local. Isolating cannot unblock it. ${e === void 0 ? "If the file is genuinely local, retry the edit addressing it by its local, plainly-spelled path." : `If the file is genuinely inside the worktree ${e}, address it by its local, plainly-spelled path instead.`}`;
}

export {
  getBgIsolationSetting,
  g_,
  checkWorktreeIsolationSync,
  gitRootsForPath,
  R6,
  rie,
  isolationWorktreeFor,
  XVe,
  isSameRepoWorktree,
  mei,
  checkWorktreeIsolation,
  checkWorktreeIsolation_2,
  isolationSubjectWords,
  ber,
  getClaudeWorktreesDir,
  checkWorktreePath,
  Xyn,
  s4r,
  parseWorktreeAddError,
  describeRepoRelativeLocation,
  i4r,
  lei,
  o4r,
  getWorktreesDirSpec,
  BNe,
  BLOCKED_CWD_MESSAGES,
};
