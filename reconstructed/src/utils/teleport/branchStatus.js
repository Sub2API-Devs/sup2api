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
  REACH_UNPLACED,
  buildScreenedGitEnv_2,
  describeGitBinaryFile,
  checkGitVersionForScreening,
  GIT_REF_MAX_BUFFER,
  GIT_REF_LIST_TIMEOUT_MS,
  GIT_REF_READ_TIMEOUT_MS,
  GIT_REF_PROBE_TIMEOUT_MS,
  MAX_REMOTE_BRANCH_CANDIDATES,
} from "./screenedGit.js";
import {
  IN_TREE_SETTINGS_UNREADABLE,
  runGitWithEnv,
  GIT_REPLACE_REFS_CONFIG_ARGS,
  GIT_READ_CONFIG_ARGS,
} from "../git/builderGit/gitEnv.js";
import { GIT_SHA_RE } from "../../remote/tools/servedOwnerSettings.js";
import { createCombinedAbortSignal } from "../combinedAbortSignal.js";
import { GIT_SAFE_GLOBAL_ARGS } from "../git/gitSafeEnv.js";
import { uniq } from "../collections.js";
import { CONVENTIONAL_DEFAULT_BRANCH_NAMES, getBranchForDir } from "../git/gitFilesystem.js";
import { GITHUB_SETUP_HINT } from "../../tasks/RemoteAgentTask/githubSetupHint.js";
import { printableText } from "../stringUtils.js";
import { isGithubDotCom } from "../git/githubUrl.js";
import { getCurrentWorktreeSession } from "../worktree.js";
import { isWorktreeCloudClaimEnabled } from "../shutdown/pendingWrites.js";
import { isSafeRefName as isSafeRefName_2 } from "../git/safeRefName.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, array, string, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { getErrnoCode, errorMessage } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { withTimeout as withTimeout_2 } from "../sleep.js";
import { deleteFile } from "../../services/api/filesApi.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-e6aww6q8.js:1923205-1926733 placement
/**
 * 检查当前分支是否已推送到远端，用于云会话启动。
 */
async function checkBranchPushed({
  gitRoot,
  remoteName,
  branch,
  headCommit,
  nameContaining = false,
  countAhead = false,
  sessionRoot,
  sessionReach,
  startsInProject = false,
  staleBranch,
  signal,
  deadlineMs,
  onSearchAmongAllRefs,
  withRefsAtHead = true,
  onCreation,
}) {
  try {
    let Ee =
      sessionRoot === undefined
        ? undefined
        : (sessionReach ?? (await readLaunchGitLayout(sessionRoot, signal, startsInProject)));
    if (Ee === IN_TREE_SETTINGS_UNREADABLE || Ee === REACH_UNPLACED)
      return {
        kind: "unknown",
        cause: "nothing_vouched",
      };
    if (headCommit !== undefined && !GIT_SHA_RE.test(headCommit))
      return {
        kind: "unknown",
        cause: "not_a_commit_id",
      };
    let Ae = headCommit ?? "HEAD";
    let env = buildScreenedGitEnv_2(
      {
        GIT_GRAFT_FILE: "/dev/null",
        GIT_NO_REPLACE_OBJECTS: "1",
      },
      Ee,
    );
    let Me =
      Ee === undefined
        ? describeGitBinaryFile(undefined)
        : await checkGitVersionForScreening(Ee, {
            dir: gitRoot,
            env,
            signal,
            startsInProject,
          });
    let We = async (qt, Zt) => {
      let max = Math.max(1, Math.floor(deadlineMs ?? qt));
      let combinedAbortSignal = createCombinedAbortSignal(signal, {
        timeoutMs: max,
        refTimer: true,
      });
      try {
        return await Zt((no, hn) =>
          runGitWithEnv(Me, [...GIT_SAFE_GLOBAL_ARGS, ...GIT_REPLACE_REFS_CONFIG_ARGS, ...no], {
            dir: gitRoot,
            env,
            abortSignal: combinedAbortSignal.signal,
            timeout: max,
            maxBuffer: GIT_REF_MAX_BUFFER,
            preserveOutputOnError: false,
            ...(hn === undefined
              ? {
                  stdin: "ignore",
                }
              : {
                  input: hn,
                }),
          }),
        );
      } finally {
        combinedAbortSignal.cleanup();
      }
    };
    let ze = `refs/remotes/${remoteName}/`;
    let lt = staleBranch === undefined ? null : `${ze}${staleBranch}`;
    let Je = staleBranch !== undefined && staleBranch === branch;
    let nt = (qt, pushed) =>
      findRemoteBranches(qt, {
        remoteName,
        pushed,
        staleRef: lt,
        head: Ae,
        headCommit,
        nameContaining,
      });
    let pt = await We(GIT_REF_LIST_TIMEOUT_MS, async (qt) => {
      if (branch !== "HEAD" && !Je) {
        let vn = await qt(["show-ref", "--verify", "--quiet", `${ze}${branch}`]);
        if (vn.exitCode === 0) {
          if (!countAhead)
            return {
              kind: "on_remote",
            };
          let co = await countCommitsBetween(qt, `${ze}${branch}`, Ae);
          if (
            co === null ||
            (co > 0 && (await qt(["rev-parse", "--is-shallow-repository"])).stdout.trim() !== "false")
          )
            return {
              kind: "on_remote",
            };
          return {
            kind: "on_remote",
            aheadCount: co,
          };
        }
        if (vn.exitCode !== 1)
          return {
            kind: "unknown",
            cause: "git_failed",
          };
      }
      let Zt = Je ? true : await hasStandardFetchRefspec(qt, remoteName);
      if (Zt !== true)
        return {
          kind: "unknown",
          cause: Zt === null ? "git_failed" : "refspec_not_covering",
        };
      if (branch === "HEAD")
        return {
          kind: "search_all_refs",
          defaultBranch: null,
        };
      let [rn, pn, { creationRead: no, creation: hn, refsAt: ho }] = await Promise.all([
        findDefaultBranchRefs(qt, ze).catch(() => null),
        listUpstreamRefs(qt, ze).catch(() => []),
        readBranchCreationPoint(qt, branch)
          .catch(() => "read_failed")
          .then(async (vn) => ({
            creationRead: vn,
            creation: typeof vn === "object" ? vn : null,
            refsAt: withRefsAtHead
              ? await findRefsPointingAt(qt, ze, Ae, typeof vn === "object" ? vn.commit : null).catch(() => ({
                  atHead: [],
                  atCreation: [],
                }))
              : {
                  atHead: [],
                  atCreation: [],
                },
          })),
      ]);
      let defaultBranch = rn?.name === staleBranch ? null : (rn?.name ?? null);
      let Kn = hn === null ? null : toRemoteTrackingRef(hn.from, remoteName);
      let Xn = await listLocalRefs(
        qt,
        uniq([
          ...(rn?.refs ?? []),
          ...pn,
          ...ho.atHead.filter((vn) => vn !== lt).slice(0, 1),
          ...ho.atCreation.filter((vn) => vn !== lt).slice(0, 1),
          ...(Kn === null ? [] : [Kn]),
        ]).filter((vn) => vn !== lt),
      ).catch(() => []);
      let fo =
        Xn.length === 0
          ? null
          : await nt(qt, {
              kind: "own",
              present: Xn,
            });
      if (fo?.kind !== "pushed_ancestor") {
        reportCreation(onCreation, hn === null ? creationAbsenceReason(no) : "no_first_answer");
        return {
          kind: "search_all_refs",
          defaultBranch,
        };
      }
      let To = {
        ...fo,
        fromOwnRefs: true,
      };
      let bo =
        hn !== null &&
        (hn.commit === To.commit ||
          (await qt(["merge-base", "--is-ancestor", hn.commit, To.commit])).exitCode === 0);
      reportCreation(
        onCreation,
        hn === null ? creationAbsenceReason(no) : bo ? "below_start" : "not_below_start",
      );
      return bo
        ? To
        : {
            kind: "search_all_refs",
            defaultBranch,
            orElse: To,
          };
    });
    if (pt.kind !== "search_all_refs") return pt;
    let Et = () => signal?.aborted === true;
    if (Et()) {
      if (pt.orElse !== undefined) return pt.orElse;
      return branch === "HEAD"
        ? {
            kind: "unknown",
            cause: "git_failed",
          }
        : {
            kind: "not_on_remote",
            searchFailure: "git_failed",
            defaultBranch: pt.defaultBranch,
          };
    }
    let yt = () =>
      We(GIT_REF_READ_TIMEOUT_MS, (qt) =>
        nt(qt, {
          kind: "all",
        }),
      );
    let gt = await yt();
    let At = gt.kind === "unknown" && gt.cause === "git_failed" && !Et();
    let It = At ? await yt() : gt;
    try {
      onSearchAmongAllRefs?.(At ? 2 : 1);
    } catch {}
    let orElse = pt.orElse;
    if (orElse !== undefined) return It.kind === "pushed_ancestor" ? It : orElse;
    if (Je && It.kind === "none")
      return {
        kind: "not_on_remote",
        searchFailure: "nothing_beneath",
        defaultBranch: pt.defaultBranch,
      };
    return It.kind === "unknown" && branch !== "HEAD"
      ? {
          kind: "not_on_remote",
          searchFailure: It.cause,
          defaultBranch: pt.defaultBranch,
        }
      : It;
  } catch {
    return {
      kind: "unknown",
      cause: "threw",
    };
  }
}
//@ chunk-e6aww6q8.js:1926733-1926770 placement
function reportCreation(onCreation, n) {
  try {
    onCreation?.(n);
  } catch {}
}
//@ chunk-e6aww6q8.js:1926770-1927139 placement
/**
 * 从分支 reflog 中找出分支的创建点（创建时的提交与来源）。
 */
async function readBranchCreationPoint(e, branch) {
  let r = await e([
    "-c",
    "log.showSignature=false",
    "log",
    "-g",
    "--format=%H%x00%gs",
    `refs/heads/${branch}`,
    "--",
  ]);
  if (r.exitCode !== 0) return "read_failed";
  let last = r.stdout
    .split(
      `
`,
    )
    .filter((line) => line.trim() !== "")
    .at(-1);
  let [h = "", y = ""] = (last ?? "").split("\x00");
  let S = "branch: Created from ";
  return GIT_SHA_RE.test(h) && y.startsWith(S)
    ? {
        commit: h,
        from: y.slice(S.length).trim(),
      }
    : "none";
}
//@ chunk-e6aww6q8.js:1927139-1927214 placement
function creationAbsenceReason(e) {
  return e === "read_failed" ? "read_failed" : "no_creation_entry";
}
//@ chunk-e6aww6q8.js:1927214-1927429 placement
function toRemoteTrackingRef(from, remoteName) {
  let r = `refs/remotes/${remoteName}/`;
  let s = `${remoteName}/`;
  let h = from.startsWith(r) ? from.slice(r.length) : from.startsWith(s) ? from.slice(s.length) : null;
  return h === null || h === "" || h === "HEAD" || /[\s~^:?*[\\]|\.\.|@\{/.test(h) ? null : `${r}${h}`;
}
//@ chunk-e6aww6q8.js:1927429-1927747 placement
/**
 * 列出本地分支及其上游引用。
 */
async function listUpstreamRefs(e, n) {
  let r = await e(["for-each-ref", "--format=%(refname)%00%(upstream)", "refs/heads/"]);
  if (r.exitCode !== 0) return [];
  return r.stdout
    .split(
      `
`,
    )
    .filter(Boolean)
    .flatMap((line) => {
      let [h = "", y = ""] = line.split("\x00");
      return [`${n}${h.slice(11)}`, y];
    })
    .filter((s) => s.startsWith(n) && s.length > n.length && s !== `${n}HEAD`);
}
//@ chunk-e6aww6q8.js:1927747-1928202 placement
/**
 * 列出指向给定提交的引用（可同时匹配两个提交）。
 */
async function findRefsPointingAt(e, n, r, s) {
  let h = await e([
    "for-each-ref",
    `--points-at=${r}`,
    ...(s === null ? [] : [`--points-at=${s}`]),
    "--format=%(objectname) %(refname)",
    n,
  ]);
  if (h.exitCode !== 0)
    return {
      atHead: [],
      atCreation: [],
    };
  let flattened = h.stdout
    .split(
      `
`,
    )
    .flatMap((line) => {
      let [w = "", L = ""] = line.trim().split(" ");
      return L.startsWith(n) && L !== `${n}HEAD`
        ? [
            {
              commit: w,
              ref: L,
            },
          ]
        : [];
    });
  return {
    atHead: flattened.filter((S) => S.commit !== s).map((S) => S.ref),
    atCreation: flattened.filter((S) => S.commit === s).map((S) => S.ref),
  };
}
//@ chunk-e6aww6q8.js:1928202-1928710 placement
async function listLocalRefs(e, n) {
  let reduced = await chunkArray(n, REF_BATCH_SIZE).reduce(async (acc, y) => {
    let S = await acc;
    let w = await e(["for-each-ref", "--format=%(objectname) %(refname)", ...y]);
    if (w.exitCode !== 0) throw Error("for-each-ref failed");
    let flattened = w.stdout
      .split(
        `
`,
      )
      .flatMap((line) => {
        let [q = "", Z = ""] = line.trim().split(" ");
        return GIT_SHA_RE.test(q) && y.includes(Z)
          ? [
              {
                ref: Z,
                commit: q,
              },
            ]
          : [];
      });
    S.push(flattened);
    return S;
  }, Promise.resolve([]));
  let s = new Map(reduced.flat().map(({ ref, commit }) => [ref, commit]));
  return n.flatMap((h) => {
    let y = s.get(h);
    return y === undefined
      ? []
      : [
          {
            ref: h,
            commit: y,
          },
        ];
  });
}
//@ chunk-e6aww6q8.js:1928710-1928721 placement
var REF_BATCH_SIZE = 64;
//@ chunk-e6aww6q8.js:1928721-1928817 placement
function chunkArray(e, n) {
  return Array.from(
    {
      length: Math.ceil(e.length / n),
    },
    (r, s) => e.slice(s * n, (s + 1) * n),
  );
}
//@ chunk-e6aww6q8.js:1928817-1931288 placement
/**
 * 查找对应的远端分支（for-each-ref，取最近几个）。
 */
async function findRemoteBranches(e, { remoteName, pushed, staleRef, head, headCommit, nameContaining }) {
  let w = `refs/remotes/${remoteName}/`;
  try {
    if (pushed.kind === "all") {
      let Ee = await e(["for-each-ref", "--count=3", "--format=%(refname)", w]);
      if (Ee.exitCode !== 0)
        return {
          kind: "unknown",
          cause: "git_failed",
        };
      if (
        Ee.stdout
          .split(
            `
`,
          )
          .every(
            (line) =>
              line.trim() === "" ||
              (staleRef !== null && (line.trim() === staleRef || line.trim() === `${w}HEAD`)),
          )
      )
        return {
          kind: "none",
          defaultBranch: null,
        };
    }
    let L = await e(
      [
        "--no-replace-objects",
        "rev-list",
        `--max-count=${GIT_REF_PROBE_TIMEOUT_MS + 1}`,
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
        ? undefined
        : pushed.present.map(({ commit }) => `^${commit}`).join(`
`),
    );
    if (L.exitCode !== 0)
      return {
        kind: "unknown",
        cause: "git_failed",
      };
    let filtered = L.stdout
      .split(
        `
`,
      )
      .map((line) => line.trim().split(" ").filter(Boolean))
      .filter((Ee) => Ee.length > 0);
    if (filtered.length > GIT_REF_PROBE_TIMEOUT_MS)
      return {
        kind: "none",
        defaultBranch: await getRemoteDefaultBranch(e, w),
      };
    if (filtered.some((Ee) => Ee.some((Ae) => !GIT_SHA_RE.test(Ae))))
      return {
        kind: "unknown",
        cause: "git_failed",
      };
    if (filtered.length > 0) {
      let Ee = await e(
        [
          ...GIT_READ_CONFIG_ARGS,
          "--no-replace-objects",
          "rev-list",
          "--no-walk=unsorted",
          "--parents",
          "--stdin",
        ],
        filtered.map(([Ae]) => Ae).join(`
`),
      );
      if (Ee.exitCode !== 0)
        return {
          kind: "unknown",
          cause: "git_failed",
        };
      if (Ee.stdout.trim() !== L.stdout.trim())
        return {
          kind: "unknown",
          cause: "parents_misstated",
        };
    }
    let q;
    let Z;
    if (filtered.length === 0 && headCommit !== undefined) {
      q = headCommit;
      Z = 0;
    } else if (filtered.length === 0) {
      let Ee = await e(["rev-parse", "-q", "--verify", "HEAD^{commit}"]);
      let trimmed = Ee.stdout.trim();
      if (Ee.exitCode !== 0 || !GIT_SHA_RE.test(trimmed))
        return {
          kind: "unknown",
          cause: "git_failed",
        };
      q = trimmed;
      Z = 0;
    } else {
      let Ee = new Set(filtered.map(([We]) => We));
      let sliced = uniq(filtered.flatMap(([, ...We]) => We.filter((ze) => !Ee.has(ze)))).slice(
        0,
        MAX_REMOTE_BRANCH_CANDIDATES,
      );
      let [Ie, ...Me] = sliced;
      if (Ie === undefined)
        return {
          kind: "none",
          defaultBranch: await getRemoteDefaultBranch(e, w),
        };
      if (Me.length === 0) {
        q = Ie;
        Z = filtered.length;
      } else {
        let closestCandidate = await findClosestCandidate(e, sliced, head);
        if (closestCandidate === null)
          return {
            kind: "unknown",
            cause: "git_failed",
          };
        q = closestCandidate.candidate;
        Z = Math.max(closestCandidate.beyond, filtered.length);
      }
    }
    if (pushed.kind === "all") {
      let remoteBranchPointingAt = await findRemoteBranchPointingAt(e, w, [w], q, staleRef);
      let Ae =
        nameContaining && remoteBranchPointingAt === null
          ? await findRemoteBranchContaining(e, w, [w], q, staleRef)
          : null;
      return {
        kind: "pushed_ancestor",
        commit: q,
        aheadCount: Z,
        branch: remoteBranchPointingAt,
        ...(Ae !== null && {
          containedIn: Ae,
        }),
      };
    }
    let found = pushed.present.find(({ commit }) => commit === q);
    let ke = found === undefined ? null : found.ref.slice(w.length);
    let we =
      ke ??
      (await chunkArray(
        pushed.present.map(({ ref }) => ref),
        REF_BATCH_SIZE,
      ).reduce(
        async (acc, Ae) => (await acc) ?? findRemoteBranchContaining(e, w, Ae, q, staleRef),
        Promise.resolve(null),
      ));
    return {
      kind: "pushed_ancestor",
      commit: q,
      aheadCount: Z,
      branch: ke,
      ...(nameContaining &&
        ke === null &&
        we !== null && {
          containedIn: we,
        }),
      ...(we !== null && {
        foundOn: we,
      }),
    };
  } catch {
    return {
      kind: "unknown",
      cause: "threw",
    };
  }
}
//@ chunk-e6aww6q8.js:1931288-1931468 placement
async function countCommitsBetween(e, n, r) {
  let s = await e(["rev-list", "--count", `${n}..${r}`, "--"]);
  let h = Number.parseInt(s.stdout.trim(), 10);
  return s.exitCode === 0 && Number.isSafeInteger(h) && h >= 0 ? h : null;
}
//@ chunk-e6aww6q8.js:1931468-1931676 placement
async function hasStandardFetchRefspec(e, remoteName) {
  let r = await e(["config", "--get-all", `remote.${remoteName}.fetch`]);
  if (r.exitCode === 1) return false;
  if (r.exitCode !== 0) return null;
  return isStandardFetchRefspec(
    r.stdout
      .split(
        `
`,
      )
      .map((line) => line.trim())
      .filter(Boolean),
    remoteName,
  );
}
//@ chunk-e6aww6q8.js:1931676-1931852 placement
function isStandardFetchRefspec(e, n) {
  if (e.some((r) => r.startsWith("^"))) return false;
  return e.some((r) => {
    let [s, h] = r.replace(/^\+/, "").split(":");
    return s === "refs/heads/*" && h === `refs/remotes/${n}/*`;
  });
}
//@ chunk-e6aww6q8.js:1931852-1932084 placement
async function findClosestCandidate(e, n, head) {
  let results = await Promise.all(
    n.map(async (y) => ({
      candidate: y,
      beyond: await countCommitsBetween(e, y, head),
    })),
  );
  let h = null;
  for (let { candidate, beyond } of results) {
    if (beyond === null) return null;
    if (h === null || beyond < h.beyond)
      h = {
        candidate,
        beyond,
      };
  }
  return h;
}
//@ chunk-e6aww6q8.js:1932084-1932152 placement
async function findRemoteBranchPointingAt(e, n, r, s, staleRef) {
  return findRemoteBranchFor(e, n, r, ["--points-at", s], staleRef);
}
//@ chunk-e6aww6q8.js:1932152-1932219 placement
async function findRemoteBranchContaining(e, n, r, s, staleRef) {
  return findRemoteBranchFor(e, n, r, ["--contains", s], staleRef);
}
//@ chunk-e6aww6q8.js:1932219-1932599 placement
/**
 * 查找本地分支在远端对应的分支引用。
 */
async function findRemoteBranchFor(e, n, r, s, h) {
  let [y, remoteDefaultBranch] = await Promise.all([
    e(["for-each-ref", ...s, "--format=%(refname)", ...r]),
    getRemoteDefaultBranch(e, n),
  ]);
  if (y.exitCode !== 0) return null;
  let w = (G) => (r.length === 1 && r[0] === n ? true : r.includes(G));
  let mapped = y.stdout
    .split(
      `
`,
    )
    .map((line) => line.trim())
    .filter((G) => G.startsWith(n) && G !== `${n}HEAD` && G !== h && w(G))
    .map((G) => G.slice(n.length));
  return (
    (remoteDefaultBranch !== null && mapped.includes(remoteDefaultBranch) ? remoteDefaultBranch : null) ??
    mapped[0] ??
    null
  );
}
//@ chunk-e6aww6q8.js:1932599-1932846 placement
async function getRemoteDefaultBranch(e, n) {
  let r = await e(["symbolic-ref", "-q", `${n}HEAD`]);
  let trimmed = r.stdout.trim();
  if (r.exitCode !== 0 || !trimmed.startsWith(n) || trimmed.length <= n.length) return null;
  return (await e(["show-ref", "--verify", "--quiet", trimmed])).exitCode === 0
    ? trimmed.slice(n.length)
    : null;
}
//@ chunk-e6aww6q8.js:1932846-1933181 placement
/**
 * 查找远端的默认分支引用（远端 HEAD 及常见默认分支名）。
 */
async function findDefaultBranchRefs(e, n) {
  let remoteDefaultBranch = await getRemoteDefaultBranch(e, n);
  let s = uniq([
    ...(remoteDefaultBranch === null ? [] : [remoteDefaultBranch]),
    ...CONVENTIONAL_DEFAULT_BRANCH_NAMES,
  ]);
  let h = await e(["for-each-ref", "--format=%(refname)", ...s.map((L) => `${n}${L}`)]);
  if (h.exitCode !== 0) return null;
  let mapped = h.stdout
    .split(
      `
`,
    )
    .map((line) => line.trim());
  let filtered = s.filter((L) => mapped.includes(`${n}${L}`));
  let [w] = filtered;
  return w === undefined
    ? null
    : {
        name: w,
        refs: filtered.map((L) => `${n}${L}`),
      };
}
//@ chunk-e6aww6q8.js:1933181-1933561 placement
/**
 * 生成找不到 GitHub 仓库时的原因说明（非 git 仓库、信任未确认等）。
 */
function describeNoRepositoryReason(e) {
  let r = `${
    {
      no_git: "This folder is not a git repository, so",
      trust_unconfirmed: "This folder's trust has not been confirmed, so its git remote was not read and",
      no_github_repository: "No GitHub repository was found for this folder, so",
    }[e]
  } the cloud session starts empty: nothing from this folder is copied into it.`;
  return e === "no_github_repository" ? `${r} ${GITHUB_SETUP_HINT}` : r;
}
//@ chunk-e6aww6q8.js:1933561-1933950 placement
/**
 * 生成分支不在远端时的提示，按需建议推送。
 */
function branchNotOnRemoteMessage({ branch, host, revision, advisesPush = true, goneFromGithub = false }) {
  let y = printableText(revision);
  return `Branch ${printableText(branch)} ${goneFromGithub ? "is not on GitHub" : `is not on ${isGithubDotCom(host) ? "GitHub" : host} as of the last fetch`}, so the cloud session starts from the default branch, ${y}, instead, without the commits that ${y} lacks or any uncommitted changes.${advisesPush ? " Push the branch, then start a new session to use it." : ""}`;
}
//@ chunk-e6aww6q8.js:1933950-1934335 placement
/**
 * 生成本地分支领先远端若干提交时的提示，按需建议推送。
 */
function branchAheadOfRemoteMessage({ branch, aheadCount, remoteName, advisesPush }) {
  let h = printableText(branch);
  let y = aheadCount === 1;
  return `Branch ${h} is ${y ? "1 commit" : `${aheadCount.toLocaleString("en-US")} commits`} ahead of ${remoteName}/${h} (as last fetched), so the cloud session starts without ${y ? "it" : "them"} and without any uncommitted changes.${advisesPush ? ` Push the branch and start a new session to have ${y ? "that commit" : "those commits"}.` : ""}`;
}
//@ chunk-e6aww6q8.js:1934335-1935874 placement
/**
 * 说明当前检出能否作为云会话起点（分离 HEAD、领先过多等）。
 */
function describeBranchStartability({
  branch,
  start,
  remoteName,
  host,
  byName,
  carried,
  isAheadOfRemote = false,
  advisesPush = true,
}) {
  let L = printableText(branch);
  let G = start.branch === null ? null : printableText(start.branch);
  let q = byName === null ? null : printableText(byName);
  let Z =
    branch === "HEAD"
      ? "This checkout is on a detached HEAD"
      : isAheadOfRemote
        ? `Branch ${L} is too far ahead of ${remoteName}/${L} to start from there`
        : `Branch ${L} is not on ${isGithubDotCom(host) ? "GitHub" : host}`;
  let sliced = start.commit.slice(0, 12);
  let ke = G === null ? `commit ${sliced}` : `${remoteName}/${G} (${sliced})`;
  let we = start.aheadCount === 1 ? "1 commit" : `${start.aheadCount} commits`;
  let Ee =
    start.fromOwnRefs === true && start.foundOn !== undefined && start.aheadCount > 0
      ? `${remoteName}/${printableText(start.foundOn)}`
      : null;
  let Ae = start.fromOwnRefs === true && Ee === null && start.aheadCount > 0;
  let Ie =
    start.aheadCount === 0
      ? `its own commit, which ${G === null ? "the remote has" : `${remoteName}/${G} has`} (${sliced})`
      : Ee !== null
        ? `the newest commit beneath it that ${Ee} has (${sliced}), ${we} back`
        : Ae
          ? `a pushed commit beneath it, ${ke}, ${we} back`
          : `the newest pushed commit beneath it, ${ke}, ${we} back`;
  let Me =
    q === null
      ? `the cloud session starts from ${Ie}`
      : `the cloud session starts from the tip of ${q} on ${host} instead (a host other than github.com is not asked for a commit by id)`;
  let We =
    carried || (start.aheadCount === 0 && byName === null)
      ? ""
      : `${Ee !== null ? ` Commits that ${Ee} lacks, and any uncommitted changes, stay on this machine` : Ae ? " Later commits and any uncommitted changes stay on this machine" : ` ${start.aheadCount === 0 ? "Uncommitted changes" : start.aheadCount === 1 ? "That commit and any uncommitted changes" : `Those ${start.aheadCount} commits and any uncommitted changes`} stay on this machine`}${advisesPush || start.aheadCount === 0 ? "; push the branch to start from it" : ""}.`;
  return `${Z}, so ${Me}.${We}`;
}
//@ chunk-e6aww6q8.js:1935874-1935944 placement
async function branchForTeleport(e, branchName) {
  if (getCurrentWorktreeSession() === null || !isWorktreeCloudClaimEnabled()) return branchName;
  return getBranchForDir(e);
}
//@ chunk-e6aww6q8.js:1935944-1936032 placement
function recordedOriginalBranch(branchName) {
  let originalBranch = getCurrentWorktreeSession()?.originalBranch;
  return typeof originalBranch === "string" &&
    isSafeRefName_2(originalBranch) &&
    isWorktreeCloudClaimEnabled()
    ? originalBranch
    : branchName;
}
//@ chunk-e6aww6q8.js:1936032-1936160 placement
var BATCH_BRANCH_STATUS_PATH = "/v1/code/github/get-batch-branch-status";
var batchBranchStatusSchema = DoctorLazy(() =>
  u({
    branch_statuses: array(
      u({
        repo: string(),
        branch: string(),
        branch_exists: M(),
      }),
    ),
  }),
);
//@ chunk-e6aww6q8.js:1936160-1936397 placement
function createBranchExistsLookup(body, n) {
  let r = batchBranchStatusSchema().safeParse(body);
  let s = r.success
    ? r.data.branch_statuses.filter((branchStatus) => branchStatus.repo.toLowerCase() === n.toLowerCase())
    : [];
  return (h) => {
    let found = s.find((S) => S.branch === h);
    return found === undefined ? "cannot_tell" : found.branch_exists ? "yes" : "no";
  };
}
//@ chunk-e6aww6q8.js:1936397-1937059 placement
async function askGithubBranchExists({ owner, name: n, branches, timeoutMs, signal, credentials }) {
  let S = `${owner}/${n}`;
  let now = Date.now();
  let L = await apiClient
    .post(
      BATCH_BRANCH_STATUS_PATH,
      {
        repo_branches: branches.map((branch) => ({
          repo: S,
          branch,
        })),
        include_compare: false,
        include_review_decision: false,
      },
      {
        auth: "teleport-org",
        isRouteOwned401: () => true,
        timeout: timeoutMs,
        signal,
        validateStatus: () => true,
        credentials,
      },
    )
    .then(
      (q) =>
        q.ok
          ? {
              body: q.status === 200 ? q.data : undefined,
              how: `HTTP ${q.status}`,
            }
          : {
              body: undefined,
              how: `not sent: ${q.reason}`,
            },
      (error) => ({
        body: undefined,
        how: `request failed: ${getErrnoCode(error) ?? "no code"}`,
      }),
    );
  let branchExistsLookup = createBranchExistsLookup(L.body, S);
  logForDebugging(
    `[githubBranchStatus] ${S}: ${branches.map((branch) => `does GitHub have branch ${branch}? ${branchExistsLookup(branch)}`).join("; ")} (${L.how}, ${Date.now() - now} ms)`,
  );
  return branchExistsLookup;
}
//@ chunk-e6aww6q8.js:1937059-1937662 placement
/**
 * 决定云会话的起点：先查分支状态，必要时再询问是否连接 GitHub。
 */
async function resolveStartWithGithub({ lookUp, ask }) {
  let start = await lookUp({
    remoteLacksBranch: false,
  });
  if (ask === null)
    return {
      start,
      github: "not_asked",
    };
  if (start.kind !== "on_remote" && start.kind !== "unknown" && start.kind !== "not_on_remote")
    return {
      start,
      github: "not_needed",
    };
  let github = await ask();
  if (github === null)
    return {
      start,
      github: "not_asked",
    };
  if (start.kind === "not_on_remote")
    return github === "yes"
      ? {
          start: {
            kind: "on_remote",
          },
          github,
          failedSearch: start.searchFailure,
        }
      : {
          start,
          github,
        };
  if (github !== "no")
    return {
      start,
      github,
    };
  let h = await lookUp({
    remoteLacksBranch: true,
  });
  return {
    start:
      h.kind === "unknown"
        ? {
            kind: "not_on_remote",
            searchFailure: h.cause,
            defaultBranch: null,
          }
        : h,
    github,
  };
}
//@ chunk-e6aww6q8.js:1937662-1937710 placement
var SEED_DELETE_TIMEOUT_MS = 5000;
var SEED_DELETE_TIMEOUT_TEXT = "seed bundle delete timed out";
//@ chunk-e6aww6q8.js:1937710-1938185 placement
/**
 * 删除已上传的种子 bundle 文件（限时），返回失败原因。
 */
async function discardUploadedSeedBundle(e) {
  let n;
  try {
    let r = await withTimeout_2(
      deleteFile(e.fileId, e.config, {
        timeoutMs: SEED_DELETE_TIMEOUT_MS,
      }),
      SEED_DELETE_TIMEOUT_MS,
      SEED_DELETE_TIMEOUT_TEXT,
    );
    n = r.success ? undefined : r.reason;
  } catch (error) {
    n = error instanceof Error && error.message === SEED_DELETE_TIMEOUT_TEXT ? "timeout" : "unexpected";
    logForDebugging(`[teleportToRemote] Deleting the uploaded bundle failed: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
  if (n === undefined) {
    logFeatureOk("teleport_seed_bundle_discard");
    return;
  }
  logForDebugging(`[teleportToRemote] Could not delete the uploaded bundle (${n}); its expiry removes it`, {
    level: "warn",
  });
  logFeatureSad("teleport_seed_bundle_discard", n);
}
export {
  askGithubBranchExists,
  resolveStartWithGithub,
  checkBranchPushed,
  recordedOriginalBranch,
  branchForTeleport,
  describeBranchStartability,
  branchNotOnRemoteMessage,
  branchAheadOfRemoteMessage,
  describeNoRepositoryReason,
  discardUploadedSeedBundle,
};
