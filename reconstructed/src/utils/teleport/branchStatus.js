/**
 * utils/teleport/branchStatus.ts
 *
 * 2.1.316 新增：分支状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (32)
 * attribution: placement 32
 */
import {
  readLaunchGitLayout,
  cZ,
  buildScreenedGitEnv,
  hXe,
  checkGitVersionForScreening,
  etr,
  Qer,
  Ver,
  oon,
  Zer,
} from "./screenedGit.js";
import { IN_TREE_SETTINGS_UNREADABLE, eer, dKt, mee } from "../git/builderGit/gitEnv.js";
import { vSe } from "../../remote/tools/servedOwnerSettings.js";
import { createCombinedAbortSignal } from "../combinedAbortSignal.js";
import { freeze as freeze_23 } from "../git/gitSafeEnv.js";
import { uniq } from "../collections.js";
import { CONVENTIONAL_DEFAULT_BRANCH_NAMES, getBranchForDir } from "../git/gitFilesystem.js";
import { GITHUB_SETUP_HINT } from "../../tasks/RemoteAgentTask/githubSetupHint.js";
import { wh } from "../stringUtils.js";
import { isGithubDotCom } from "../git/githubUrl.js";
import { getCurrentWorktreeSession } from "../worktree.js";
import { oRe } from "../shutdown/pendingWrites.js";
import { isSafeRefName as isSafeRefName_2 } from "../git/safeRefName.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, A, o, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { getErrnoCode, errorMessage } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { withTimeout as withTimeout_2 } from "../sleep.js";
import { deleteFile } from "../../services/api/filesApi.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";

/**
 * 检查当前分支是否已推送到远端，用于云会话启动。
 */
//@ chunk-e6aww6q8.js:1923205-1926733 placement
async function checkBranchPushed({
  gitRoot: gitRoot,
  remoteName: remoteName,
  branch: branch,
  headCommit: headCommit,
  nameContaining: nameContaining = !1,
  countAhead: countAhead = !1,
  sessionRoot: sessionRoot,
  sessionReach: sessionReach,
  startsInProject: startsInProject = !1,
  staleBranch: staleBranch,
  signal: signal,
  deadlineMs: deadlineMs,
  onSearchAmongAllRefs: onSearchAmongAllRefs,
  withRefsAtHead: withRefsAtHead = !0,
  onCreation: onCreation,
}) {
  try {
    let Ee =
      sessionRoot === void 0
        ? void 0
        : (sessionReach ?? (await readLaunchGitLayout(sessionRoot, signal, startsInProject)));
    if (Ee === IN_TREE_SETTINGS_UNREADABLE || Ee === cZ) return { kind: "unknown", cause: "nothing_vouched" };
    if (headCommit !== void 0 && !vSe.test(headCommit)) return { kind: "unknown", cause: "not_a_commit_id" };
    let Ae = headCommit ?? "HEAD",
      Ie = buildScreenedGitEnv({ GIT_GRAFT_FILE: "/dev/null", GIT_NO_REPLACE_OBJECTS: "1" }, Ee),
      Me =
        Ee === void 0
          ? hXe(void 0)
          : await checkGitVersionForScreening(Ee, {
              dir: gitRoot,
              env: Ie,
              signal: signal,
              startsInProject: startsInProject,
            }),
      We = async (qt, Zt) => {
        let max = Math.max(1, Math.floor(deadlineMs ?? qt)),
          pn = createCombinedAbortSignal(signal, { timeoutMs: max, refTimer: !0 });
        try {
          return await Zt((no, hn) =>
            eer(Me, [...freeze_23, ...dKt, ...no], {
              dir: gitRoot,
              env: Ie,
              abortSignal: pn.signal,
              timeout: max,
              maxBuffer: etr,
              preserveOutputOnError: !1,
              ...(hn === void 0 ? { stdin: "ignore" } : { input: hn }),
            }),
          );
        } finally {
          pn.cleanup();
        }
      },
      ze = `refs/remotes/${remoteName}/`,
      lt = staleBranch === void 0 ? null : `${ze}${staleBranch}`,
      Je = staleBranch !== void 0 && staleBranch === branch,
      nt = (qt, Zt) =>
        findRemoteBranches(qt, {
          remoteName: remoteName,
          pushed: Zt,
          staleRef: lt,
          head: Ae,
          headCommit: headCommit,
          nameContaining: nameContaining,
        }),
      pt = await We(Qer, async (qt) => {
        if (branch !== "HEAD" && !Je) {
          let vn = await qt(["show-ref", "--verify", "--quiet", `${ze}${branch}`]);
          if (vn.exitCode === 0) {
            if (!countAhead) return { kind: "on_remote" };
            let co = await countCommitsBetween(qt, `${ze}${branch}`, Ae);
            if (
              co === null ||
              (co > 0 && (await qt(["rev-parse", "--is-shallow-repository"])).stdout.trim() !== "false")
            )
              return { kind: "on_remote" };
            return { kind: "on_remote", aheadCount: co };
          }
          if (vn.exitCode !== 1) return { kind: "unknown", cause: "git_failed" };
        }
        let Zt = Je ? !0 : await hasStandardFetchRefspec(qt, remoteName);
        if (Zt !== !0) return { kind: "unknown", cause: Zt === null ? "git_failed" : "refspec_not_covering" };
        if (branch === "HEAD") return { kind: "search_all_refs", defaultBranch: null };
        let [rn, pn, { creationRead: no, creation: hn, refsAt: ho }] = await Promise.all([
            findDefaultBranchRefs(qt, ze).catch(() => null),
            listUpstreamRefs(qt, ze).catch(() => []),
            readBranchCreationPoint(qt, branch)
              .catch(() => "read_failed")
              .then(async (vn) => ({
                creationRead: vn,
                creation: typeof vn === "object" ? vn : null,
                refsAt: withRefsAtHead
                  ? await findRefsPointingAt(qt, ze, Ae, typeof vn === "object" ? vn.commit : null).catch(
                      () => ({ atHead: [], atCreation: [] }),
                    )
                  : { atHead: [], atCreation: [] },
              })),
          ]),
          yn = rn?.name === staleBranch ? null : (rn?.name ?? null),
          Kn = hn === null ? null : toRemoteTrackingRef(hn.from, remoteName),
          Xn = await listLocalRefs(
            qt,
            uniq([
              ...(rn?.refs ?? []),
              ...pn,
              ...ho.atHead.filter((vn) => vn !== lt).slice(0, 1),
              ...ho.atCreation.filter((vn) => vn !== lt).slice(0, 1),
              ...(Kn === null ? [] : [Kn]),
            ]).filter((vn) => vn !== lt),
          ).catch(() => []),
          fo = Xn.length === 0 ? null : await nt(qt, { kind: "own", present: Xn });
        if (fo?.kind !== "pushed_ancestor")
          return (
            ron(onCreation, hn === null ? son(no) : "no_first_answer"),
            { kind: "search_all_refs", defaultBranch: yn }
          );
        let To = { ...fo, fromOwnRefs: !0 },
          bo =
            hn !== null &&
            (hn.commit === To.commit ||
              (await qt(["merge-base", "--is-ancestor", hn.commit, To.commit])).exitCode === 0);
        return (
          ron(onCreation, hn === null ? son(no) : bo ? "below_start" : "not_below_start"),
          bo ? To : { kind: "search_all_refs", defaultBranch: yn, orElse: To }
        );
      });
    if (pt.kind !== "search_all_refs") return pt;
    let Et = () => signal?.aborted === !0;
    if (Et()) {
      if (pt.orElse !== void 0) return pt.orElse;
      return branch === "HEAD"
        ? { kind: "unknown", cause: "git_failed" }
        : { kind: "not_on_remote", searchFailure: "git_failed", defaultBranch: pt.defaultBranch };
    }
    let yt = () => We(Ver, (qt) => nt(qt, { kind: "all" })),
      gt = await yt(),
      At = gt.kind === "unknown" && gt.cause === "git_failed" && !Et(),
      It = At ? await yt() : gt;
    try {
      onSearchAmongAllRefs?.(At ? 2 : 1);
    } catch {}
    let orElse = pt.orElse;
    if (orElse !== void 0) return It.kind === "pushed_ancestor" ? It : orElse;
    if (Je && It.kind === "none")
      return { kind: "not_on_remote", searchFailure: "nothing_beneath", defaultBranch: pt.defaultBranch };
    return It.kind === "unknown" && branch !== "HEAD"
      ? { kind: "not_on_remote", searchFailure: It.cause, defaultBranch: pt.defaultBranch }
      : It;
  } catch {
    return { kind: "unknown", cause: "threw" };
  }
}
//@ chunk-e6aww6q8.js:1926733-1926770 placement
function ron(e, n) {
  try {
    e?.(n);
  } catch {}
}
/**
 * 从分支 reflog 中找出分支的创建点（创建时的提交与来源）。
 */
//@ chunk-e6aww6q8.js:1926770-1927139 placement
async function readBranchCreationPoint(e, n) {
  let r = await e([
    "-c",
    "log.showSignature=false",
    "log",
    "-g",
    "--format=%H%x00%gs",
    `refs/heads/${n}`,
    "--",
  ]);
  if (r.exitCode !== 0) return "read_failed";
  let at = r.stdout
      .split(
        `
`,
      )
      .filter((w) => w.trim() !== "")
      .at(-1),
    [h = "", y = ""] = (at ?? "").split("\x00"),
    S = "branch: Created from ";
  return vSe.test(h) && y.startsWith(S) ? { commit: h, from: y.slice(S.length).trim() } : "none";
}
//@ chunk-e6aww6q8.js:1927139-1927214 placement
function son(e) {
  return e === "read_failed" ? "read_failed" : "no_creation_entry";
}
//@ chunk-e6aww6q8.js:1927214-1927429 placement
function toRemoteTrackingRef(e, n) {
  let r = `refs/remotes/${n}/`,
    s = `${n}/`,
    h = e.startsWith(r) ? e.slice(r.length) : e.startsWith(s) ? e.slice(s.length) : null;
  return h === null || h === "" || h === "HEAD" || /[\s~^:?*[\\]|\.\.|@\{/.test(h) ? null : `${r}${h}`;
}
/**
 * 列出本地分支及其上游引用。
 */
//@ chunk-e6aww6q8.js:1927429-1927747 placement
async function listUpstreamRefs(e, n) {
  let r = await e(["for-each-ref", "--format=%(refname)%00%(upstream)", "refs/heads/"]);
  if (r.exitCode !== 0) return [];
  return r.stdout
    .split(
      `
`,
    )
    .filter(Boolean)
    .flatMap((s) => {
      let [h = "", y = ""] = s.split("\x00");
      return [`${n}${h.slice(11)}`, y];
    })
    .filter((s) => s.startsWith(n) && s.length > n.length && s !== `${n}HEAD`);
}
/**
 * 列出指向给定提交的引用（可同时匹配两个提交）。
 */
//@ chunk-e6aww6q8.js:1927747-1928202 placement
async function findRefsPointingAt(e, n, r, s) {
  let h = await e([
    "for-each-ref",
    `--points-at=${r}`,
    ...(s === null ? [] : [`--points-at=${s}`]),
    "--format=%(objectname) %(refname)",
    n,
  ]);
  if (h.exitCode !== 0) return { atHead: [], atCreation: [] };
  let flattened = h.stdout
    .split(
      `
`,
    )
    .flatMap((S) => {
      let [w = "", L = ""] = S.trim().split(" ");
      return L.startsWith(n) && L !== `${n}HEAD` ? [{ commit: w, ref: L }] : [];
    });
  return {
    atHead: flattened.filter((S) => S.commit !== s).map((S) => S.ref),
    atCreation: flattened.filter((S) => S.commit === s).map((S) => S.ref),
  };
}
//@ chunk-e6aww6q8.js:1928202-1928710 placement
async function listLocalRefs(e, n) {
  let reduced = await don(n, lon).reduce(async (h, y) => {
      let S = await h,
        w = await e(["for-each-ref", "--format=%(objectname) %(refname)", ...y]);
      if (w.exitCode !== 0) throw Error("for-each-ref failed");
      let flattened = w.stdout
        .split(
          `
`,
        )
        .flatMap((G) => {
          let [q = "", Z = ""] = G.trim().split(" ");
          return vSe.test(q) && y.includes(Z) ? [{ ref: Z, commit: q }] : [];
        });
      return (S.push(flattened), S);
    }, Promise.resolve([])),
    s = new Map(reduced.flat().map(({ ref: ref, commit: commit }) => [ref, commit]));
  return n.flatMap((h) => {
    let y = s.get(h);
    return y === void 0 ? [] : [{ ref: h, commit: y }];
  });
}
//@ chunk-e6aww6q8.js:1928710-1928721 placement
var lon = 64;
//@ chunk-e6aww6q8.js:1928721-1928817 placement
function don(e, n) {
  return Array.from({ length: Math.ceil(e.length / n) }, (r, s) => e.slice(s * n, (s + 1) * n));
}
/**
 * 查找对应的远端分支（for-each-ref，取最近几个）。
 */
//@ chunk-e6aww6q8.js:1928817-1931288 placement
async function findRemoteBranches(
  e,
  {
    remoteName: remoteName,
    pushed: pushed,
    staleRef: staleRef,
    head: head,
    headCommit: headCommit,
    nameContaining: nameContaining,
  },
) {
  let w = `refs/remotes/${remoteName}/`;
  try {
    if (pushed.kind === "all") {
      let Ee = await e(["for-each-ref", "--count=3", "--format=%(refname)", w]);
      if (Ee.exitCode !== 0) return { kind: "unknown", cause: "git_failed" };
      if (
        Ee.stdout
          .split(
            `
`,
          )
          .every(
            (Ae) =>
              Ae.trim() === "" || (staleRef !== null && (Ae.trim() === staleRef || Ae.trim() === `${w}HEAD`)),
          )
      )
        return { kind: "none", defaultBranch: null };
    }
    let L = await e(
      [
        "--no-replace-objects",
        "rev-list",
        `--max-count=${oon + 1}`,
        "--parents",
        head,
        ...(pushed.kind === "all"
          ? [
              "--not",
              ...(staleRef === null
                ? []
                : [`--exclude=${staleRef.slice(13)}`, `--exclude=${remoteName}/HEAD`]),
              `--remotes=${remoteName}`,
            ]
          : ["--stdin"]),
        "--",
      ],
      pushed.kind === "all"
        ? void 0
        : pushed.present.map(({ commit: commit }) => `^${commit}`).join(`
`),
    );
    if (L.exitCode !== 0) return { kind: "unknown", cause: "git_failed" };
    let filtered = L.stdout
      .split(
        `
`,
      )
      .map((Ee) => Ee.trim().split(" ").filter(Boolean))
      .filter((Ee) => Ee.length > 0);
    if (filtered.length > oon) return { kind: "none", defaultBranch: await getRemoteDefaultBranch(e, w) };
    if (filtered.some((Ee) => Ee.some((Ae) => !vSe.test(Ae))))
      return { kind: "unknown", cause: "git_failed" };
    if (filtered.length > 0) {
      let Ee = await e(
        [...mee, "--no-replace-objects", "rev-list", "--no-walk=unsorted", "--parents", "--stdin"],
        filtered.map(([Ae]) => Ae).join(`
`),
      );
      if (Ee.exitCode !== 0) return { kind: "unknown", cause: "git_failed" };
      if (Ee.stdout.trim() !== L.stdout.trim()) return { kind: "unknown", cause: "parents_misstated" };
    }
    let q, Z;
    if (filtered.length === 0 && headCommit !== void 0) ((q = headCommit), (Z = 0));
    else if (filtered.length === 0) {
      let Ee = await e(["rev-parse", "-q", "--verify", "HEAD^{commit}"]),
        trimmed = Ee.stdout.trim();
      if (Ee.exitCode !== 0 || !vSe.test(trimmed)) return { kind: "unknown", cause: "git_failed" };
      ((q = trimmed), (Z = 0));
    } else {
      let Ee = new Set(filtered.map(([We]) => We)),
        sliced = uniq(filtered.flatMap(([, ...We]) => We.filter((ze) => !Ee.has(ze)))).slice(0, Zer),
        [Ie, ...Me] = sliced;
      if (Ie === void 0) return { kind: "none", defaultBranch: await getRemoteDefaultBranch(e, w) };
      if (Me.length === 0) ((q = Ie), (Z = filtered.length));
      else {
        let We = await findClosestCandidate(e, sliced, head);
        if (We === null) return { kind: "unknown", cause: "git_failed" };
        ((q = We.candidate), (Z = Math.max(We.beyond, filtered.length)));
      }
    }
    if (pushed.kind === "all") {
      let Ee = await ytr(e, w, [w], q, staleRef),
        Ae = nameContaining && Ee === null ? await ion(e, w, [w], q, staleRef) : null;
      return {
        kind: "pushed_ancestor",
        commit: q,
        aheadCount: Z,
        branch: Ee,
        ...(Ae !== null && { containedIn: Ae }),
      };
    }
    let found = pushed.present.find(({ commit: commit }) => commit === q),
      ke = found === void 0 ? null : found.ref.slice(w.length),
      we =
        ke ??
        (await don(
          pushed.present.map(({ ref: ref }) => ref),
          lon,
        ).reduce(async (Ee, Ae) => (await Ee) ?? ion(e, w, Ae, q, staleRef), Promise.resolve(null)));
    return {
      kind: "pushed_ancestor",
      commit: q,
      aheadCount: Z,
      branch: ke,
      ...(nameContaining && ke === null && we !== null && { containedIn: we }),
      ...(we !== null && { foundOn: we }),
    };
  } catch {
    return { kind: "unknown", cause: "threw" };
  }
}
//@ chunk-e6aww6q8.js:1931288-1931468 placement
async function countCommitsBetween(e, n, r) {
  let s = await e(["rev-list", "--count", `${n}..${r}`, "--"]),
    int = Number.parseInt(s.stdout.trim(), 10);
  return s.exitCode === 0 && Number.isSafeInteger(int) && int >= 0 ? int : null;
}
//@ chunk-e6aww6q8.js:1931468-1931676 placement
async function hasStandardFetchRefspec(e, n) {
  let r = await e(["config", "--get-all", `remote.${n}.fetch`]);
  if (r.exitCode === 1) return !1;
  if (r.exitCode !== 0) return null;
  return isStandardFetchRefspec(
    r.stdout
      .split(
        `
`,
      )
      .map((s) => s.trim())
      .filter(Boolean),
    n,
  );
}
//@ chunk-e6aww6q8.js:1931676-1931852 placement
function isStandardFetchRefspec(e, n) {
  if (e.some((r) => r.startsWith("^"))) return !1;
  return e.some((r) => {
    let [s, h] = r.replace(/^\+/, "").split(":");
    return s === "refs/heads/*" && h === `refs/remotes/${n}/*`;
  });
}
//@ chunk-e6aww6q8.js:1931852-1932084 placement
async function findClosestCandidate(e, n, r) {
  let results = await Promise.all(
      n.map(async (y) => ({ candidate: y, beyond: await countCommitsBetween(e, y, r) })),
    ),
    h = null;
  for (let { candidate: candidate, beyond: beyond } of results) {
    if (beyond === null) return null;
    if (h === null || beyond < h.beyond) h = { candidate: candidate, beyond: beyond };
  }
  return h;
}
//@ chunk-e6aww6q8.js:1932084-1932152 placement
async function ytr(e, n, r, s, h) {
  return findRemoteBranchFor(e, n, r, ["--points-at", s], h);
}
//@ chunk-e6aww6q8.js:1932152-1932219 placement
async function ion(e, n, r, s, h) {
  return findRemoteBranchFor(e, n, r, ["--contains", s], h);
}
/**
 * 查找本地分支在远端对应的分支引用。
 */
//@ chunk-e6aww6q8.js:1932219-1932599 placement
async function findRemoteBranchFor(e, n, r, s, h) {
  let [y, S] = await Promise.all([
    e(["for-each-ref", ...s, "--format=%(refname)", ...r]),
    getRemoteDefaultBranch(e, n),
  ]);
  if (y.exitCode !== 0) return null;
  let w = (G) => (r.length === 1 && r[0] === n ? !0 : r.includes(G)),
    mapped = y.stdout
      .split(
        `
`,
      )
      .map((G) => G.trim())
      .filter((G) => G.startsWith(n) && G !== `${n}HEAD` && G !== h && w(G))
      .map((G) => G.slice(n.length));
  return (S !== null && mapped.includes(S) ? S : null) ?? mapped[0] ?? null;
}
//@ chunk-e6aww6q8.js:1932599-1932846 placement
async function getRemoteDefaultBranch(e, n) {
  let r = await e(["symbolic-ref", "-q", `${n}HEAD`]),
    trimmed = r.stdout.trim();
  if (r.exitCode !== 0 || !trimmed.startsWith(n) || trimmed.length <= n.length) return null;
  return (await e(["show-ref", "--verify", "--quiet", trimmed])).exitCode === 0
    ? trimmed.slice(n.length)
    : null;
}
/**
 * 查找远端的默认分支引用（远端 HEAD 及常见默认分支名）。
 */
//@ chunk-e6aww6q8.js:1932846-1933181 placement
async function findDefaultBranchRefs(e, n) {
  let r = await getRemoteDefaultBranch(e, n),
    s = uniq([...(r === null ? [] : [r]), ...CONVENTIONAL_DEFAULT_BRANCH_NAMES]),
    h = await e(["for-each-ref", "--format=%(refname)", ...s.map((L) => `${n}${L}`)]);
  if (h.exitCode !== 0) return null;
  let mapped = h.stdout
      .split(
        `
`,
      )
      .map((L) => L.trim()),
    filtered = s.filter((L) => mapped.includes(`${n}${L}`)),
    [w] = filtered;
  return w === void 0 ? null : { name: w, refs: filtered.map((L) => `${n}${L}`) };
}
/**
 * 生成找不到 GitHub 仓库时的原因说明（非 git 仓库、信任未确认等）。
 */
//@ chunk-e6aww6q8.js:1933181-1933561 placement
function describeNoRepositoryReason(e) {
  let r = `${{ no_git: "This folder is not a git repository, so", trust_unconfirmed: "This folder's trust has not been confirmed, so its git remote was not read and", no_github_repository: "No GitHub repository was found for this folder, so" }[e]} the cloud session starts empty: nothing from this folder is copied into it.`;
  return e === "no_github_repository" ? `${r} ${GITHUB_SETUP_HINT}` : r;
}
/**
 * 生成分支不在远端时的提示，按需建议推送。
 */
//@ chunk-e6aww6q8.js:1933561-1933950 placement
function branchNotOnRemoteMessage({
  branch: branch,
  host: host,
  revision: revision,
  advisesPush: advisesPush = !0,
  goneFromGithub: goneFromGithub = !1,
}) {
  let y = wh(revision);
  return `Branch ${wh(branch)} ${goneFromGithub ? "is not on GitHub" : `is not on ${isGithubDotCom(host) ? "GitHub" : host} as of the last fetch`}, so the cloud session starts from the default branch, ${y}, instead, without the commits that ${y} lacks or any uncommitted changes.${advisesPush ? " Push the branch, then start a new session to use it." : ""}`;
}
/**
 * 生成本地分支领先远端若干提交时的提示，按需建议推送。
 */
//@ chunk-e6aww6q8.js:1933950-1934335 placement
function branchAheadOfRemoteMessage({
  branch: branch,
  aheadCount: aheadCount,
  remoteName: remoteName,
  advisesPush: advisesPush,
}) {
  let h = wh(branch),
    y = aheadCount === 1;
  return `Branch ${h} is ${y ? "1 commit" : `${aheadCount.toLocaleString("en-US")} commits`} ahead of ${remoteName}/${h} (as last fetched), so the cloud session starts without ${y ? "it" : "them"} and without any uncommitted changes.${advisesPush ? ` Push the branch and start a new session to have ${y ? "that commit" : "those commits"}.` : ""}`;
}
/**
 * 说明当前检出能否作为云会话起点（分离 HEAD、领先过多等）。
 */
//@ chunk-e6aww6q8.js:1934335-1935874 placement
function describeBranchStartability({
  branch: branch,
  start: start,
  remoteName: remoteName,
  host: host,
  byName: byName,
  carried: carried,
  isAheadOfRemote: isAheadOfRemote = !1,
  advisesPush: advisesPush = !0,
}) {
  let L = wh(branch),
    G = start.branch === null ? null : wh(start.branch),
    q = byName === null ? null : wh(byName),
    Z =
      branch === "HEAD"
        ? "This checkout is on a detached HEAD"
        : isAheadOfRemote
          ? `Branch ${L} is too far ahead of ${remoteName}/${L} to start from there`
          : `Branch ${L} is not on ${isGithubDotCom(host) ? "GitHub" : host}`,
    sliced = start.commit.slice(0, 12),
    ke = G === null ? `commit ${sliced}` : `${remoteName}/${G} (${sliced})`,
    we = start.aheadCount === 1 ? "1 commit" : `${start.aheadCount} commits`,
    Ee =
      start.fromOwnRefs === !0 && start.foundOn !== void 0 && start.aheadCount > 0
        ? `${remoteName}/${wh(start.foundOn)}`
        : null,
    Ae = start.fromOwnRefs === !0 && Ee === null && start.aheadCount > 0,
    Ie =
      start.aheadCount === 0
        ? `its own commit, which ${G === null ? "the remote has" : `${remoteName}/${G} has`} (${sliced})`
        : Ee !== null
          ? `the newest commit beneath it that ${Ee} has (${sliced}), ${we} back`
          : Ae
            ? `a pushed commit beneath it, ${ke}, ${we} back`
            : `the newest pushed commit beneath it, ${ke}, ${we} back`,
    Me =
      q === null
        ? `the cloud session starts from ${Ie}`
        : `the cloud session starts from the tip of ${q} on ${host} instead (a host other than github.com is not asked for a commit by id)`,
    We =
      carried || (start.aheadCount === 0 && byName === null)
        ? ""
        : `${Ee !== null ? ` Commits that ${Ee} lacks, and any uncommitted changes, stay on this machine` : Ae ? " Later commits and any uncommitted changes stay on this machine" : ` ${start.aheadCount === 0 ? "Uncommitted changes" : start.aheadCount === 1 ? "That commit and any uncommitted changes" : `Those ${start.aheadCount} commits and any uncommitted changes`} stay on this machine`}${advisesPush || start.aheadCount === 0 ? "; push the branch to start from it" : ""}.`;
  return `${Z}, so ${Me}.${We}`;
}
//@ chunk-e6aww6q8.js:1935874-1935944 placement
async function pon(e, n) {
  if (getCurrentWorktreeSession() === null || !oRe()) return n;
  return getBranchForDir(e);
}
//@ chunk-e6aww6q8.js:1935944-1936032 placement
function mon(e) {
  let n = getCurrentWorktreeSession()?.originalBranch;
  return typeof n === "string" && isSafeRefName_2(n) && oRe() ? n : e;
}
//@ chunk-e6aww6q8.js:1936032-1936160 placement
var BATCH_BRANCH_STATUS_PATH = "/v1/code/github/get-batch-branch-status",
  batchBranchStatusSchema = DoctorLazy(() =>
    u({ branch_statuses: A(u({ repo: o(), branch: o(), branch_exists: M() })) }),
  );
//@ chunk-e6aww6q8.js:1936160-1936397 placement
function createBranchExistsLookup(e, n) {
  let safeParse = batchBranchStatusSchema().safeParse(e),
    s = safeParse.success
      ? safeParse.data.branch_statuses.filter(
          (branch_statuse) => branch_statuse.repo.toLowerCase() === n.toLowerCase(),
        )
      : [];
  return (h) => {
    let found = s.find((S) => S.branch === h);
    return found === void 0 ? "cannot_tell" : found.branch_exists ? "yes" : "no";
  };
}
//@ chunk-e6aww6q8.js:1936397-1937059 placement
async function askGithubBranchExists({
  owner: owner,
  name: n,
  branches: branches,
  timeoutMs: timeoutMs,
  signal: signal,
  credentials: credentials,
}) {
  let S = `${owner}/${n}`,
    now = Date.now(),
    L = await apiClient
      .post(
        BATCH_BRANCH_STATUS_PATH,
        {
          repo_branches: branches.map((q) => ({ repo: S, branch: q })),
          include_compare: !1,
          include_review_decision: !1,
        },
        {
          auth: "teleport-org",
          isRouteOwned401: () => !0,
          timeout: timeoutMs,
          signal: signal,
          validateStatus: () => !0,
          credentials: credentials,
        },
      )
      .then(
        (q) =>
          q.ok
            ? { body: q.status === 200 ? q.data : void 0, how: `HTTP ${q.status}` }
            : { body: void 0, how: `not sent: ${q.reason}` },
        (q) => ({ body: void 0, how: `request failed: ${getErrnoCode(q) ?? "no code"}` }),
      ),
    G = createBranchExistsLookup(L.body, S);
  return (
    logForDebugging(
      `[githubBranchStatus] ${S}: ${branches.map((q) => `does GitHub have branch ${q}? ${G(q)}`).join("; ")} (${L.how}, ${Date.now() - now} ms)`,
    ),
    G
  );
}
/**
 * 决定云会话的起点：先查分支状态，必要时再询问是否连接 GitHub。
 */
//@ chunk-e6aww6q8.js:1937059-1937662 placement
async function resolveStartWithGithub({ lookUp: lookUp, ask: ask }) {
  let start = await lookUp({ remoteLacksBranch: !1 });
  if (ask === null) return { start: start, github: "not_asked" };
  if (start.kind !== "on_remote" && start.kind !== "unknown" && start.kind !== "not_on_remote")
    return { start: start, github: "not_needed" };
  let github = await ask();
  if (github === null) return { start: start, github: "not_asked" };
  if (start.kind === "not_on_remote")
    return github === "yes"
      ? { start: { kind: "on_remote" }, github: github, failedSearch: start.searchFailure }
      : { start: start, github: github };
  if (github !== "no") return { start: start, github: github };
  let h = await lookUp({ remoteLacksBranch: !0 });
  return {
    start: h.kind === "unknown" ? { kind: "not_on_remote", searchFailure: h.cause, defaultBranch: null } : h,
    github: github,
  };
}
//@ chunk-e6aww6q8.js:1937662-1937710 placement
var yon = 5000,
  _on = "seed bundle delete timed out";
/**
 * 删除已上传的种子 bundle 文件（限时），返回失败原因。
 */
//@ chunk-e6aww6q8.js:1937710-1938185 placement
async function discardUploadedSeedBundle(e) {
  let n;
  try {
    let r = await withTimeout_2(deleteFile(e.fileId, e.config, { timeoutMs: yon }), yon, _on);
    n = r.success ? void 0 : r.reason;
  } catch (error) {
    ((n = error instanceof Error && error.message === _on ? "timeout" : "unexpected"),
      logForDebugging(`[teleportToRemote] Deleting the uploaded bundle failed: ${errorMessage(error)}`, {
        level: "warn",
      }));
  }
  if (n === void 0) {
    logFeatureOk("teleport_seed_bundle_discard");
    return;
  }
  (logForDebugging(`[teleportToRemote] Could not delete the uploaded bundle (${n}); its expiry removes it`, {
    level: "warn",
  }),
    logFeatureSad("teleport_seed_bundle_discard", n));
}

export {
  askGithubBranchExists,
  resolveStartWithGithub,
  checkBranchPushed,
  mon,
  pon,
  describeBranchStartability,
  branchNotOnRemoteMessage,
  branchAheadOfRemoteMessage,
  describeNoRepositoryReason,
  discardUploadedSeedBundle,
};
