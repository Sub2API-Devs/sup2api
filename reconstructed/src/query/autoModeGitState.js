/**
 * query/autoModeGitState.ts
 *
 * 2.1.316 新增：收集工作目录的 git 状态（根、分支、默认分支、状态、远程可见性）；读取 git 远程配置（url、pushurl、pushdefault、分支远程）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ha3km179.js (15)
 * attribution: placement 15
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { loadBundledText } from "../utils/bundledText.js";
import { logError } from "../utils/log.js";
import { withTelemetryMessage, toError } from "../utils/errors.js";
import {
  oqe,
  effectiveVisibility,
  repoVisibilityStore,
  isRepoVisibilityCheckEnabled,
  checkCurrentRepoVisibility,
} from "../utils/github/repoVisibility.js";
import {
  runGitReadOnly,
  findGitRootRecheckingNegative,
  UUo,
  BUo,
  jUo,
  truncateLinesToChars,
  countPorcelainStatus,
} from "../utils/git.js";
import { lb } from "../utils/git/gitSafeEnv.js";
import { parseGitRemote } from "../utils/detectRepository.js";
import { s3n, JUr, S$o } from "../utils/permissions/serverClassifier/schemas.js";
import { isDiskless } from "../bootstrap/state.js";
import { ge } from "../utils/identity.js";
import { listProvidedTabs } from "../utils/claudeInChrome/tabsProvider.js";

/**
 * 从 auto mode 规则文本中读取"Scheduled-Task Fires"行（缓存）。
 */
//@ chunk-ha3km179.js:115869-116368 placement
var getScheduledTaskFiresRule = DoctorLazy(() => {
  let e;
  try {
    let n = loadBundledText(() => require("./chunk-cgwxv58n.js"))
      .replace(/<user_allow_rules_to_replace>[\s\S]*?<\/user_allow_rules_to_replace>/, "")
      .split(/\r?\n/)
      .find((r) => r.startsWith("- Scheduled-Task Fires:"))
      ?.slice(2);
    if (n !== void 0) return { rule: n };
  } catch (error) {
    e = error;
  }
  return (
    logError(
      withTelemetryMessage(
        toError(e ?? "no such line outside the allow slot"),
        'Auto mode could not read the "Scheduled-Task Fires" rule from its template, so an allow list that replaces the defaults goes to the platform without it',
      ),
    ),
    { rule: void 0 }
  );
});
//@ chunk-ha3km179.js:116368-116399 placement
function Vd() {
  return getScheduledTaskFiresRule().rule;
}
//@ chunk-ha3km179.js:116399-116434 placement
function ng(e) {
  return oqe(e) || null;
}
//@ chunk-ha3km179.js:116434-116655 placement
async function readGitStatusPair(e, n, r) {
  let s = (S) =>
      runGitReadOnly(e, ["status", "--porcelain", lb, `--untracked-files=${S}`], {
        abortSignal: r,
        userLocale: !0,
      }),
    [h, y] = await Promise.all([s("normal"), n ? s("all") : Promise.resolve(null)]);
  return { normal: h, all: y };
}
/**
 * 读取 git 远程配置（url、pushurl、pushdefault、分支远程）。
 */
//@ chunk-ha3km179.js:116655-117349 placement
async function readGitRemoteConfig(e, n) {
  let r = await runGitReadOnly(
      e,
      [
        "config",
        "-z",
        "--get-regexp",
        "^(remote\\..+\\.(url|pushurl)|remote\\.pushdefault|branch\\..+\\.remote)$",
      ],
      { abortSignal: n },
    ),
    s = { remotes: new Map(), branchRemotes: new Map(), pushDefault: void 0 };
  if (!r.ok) return r.code === 1 && !r.timedOut && !r.overflowed ? s : null;
  for (let h of r.stdout.split("\x00")) {
    let index = h.indexOf(`
`);
    if (index < 0) continue;
    let sliced = h.slice(0, index),
      sliced_2 = h.slice(index + 1);
    if (sliced === "remote.pushdefault") {
      s.pushDefault = sliced_2;
      continue;
    }
    let match = sliced.match(/^remote\.(.+)\.(url|pushurl)$/);
    if (match !== null) {
      let w = match[1],
        P = s.remotes.get(w) ?? { url: [], pushurl: [] };
      (P[match[2]].push(sliced_2), s.remotes.set(w, P));
      continue;
    }
    let match_2 = sliced.match(/^branch\.(.+)\.remote$/);
    if (match_2 !== null) s.branchRemotes.set(match_2[1], sliced_2);
  }
  return s;
}
//@ chunk-ha3km179.js:117349-117450 placement
function pushRemoteForBranch(e, n) {
  return (n !== null && n !== "HEAD" ? e.branchRemotes.get(n) : void 0) ?? e.pushDefault ?? "origin";
}
//@ chunk-ha3km179.js:117450-117514 placement
function fi(e) {
  let n = effectiveVisibility(e);
  return n === "unverified" ? "unknown" : n;
}
//@ chunk-ha3km179.js:117514-117562 placement
function Xd(e) {
  return oqe(e) === e && e !== "" ? e : null;
}
/**
 * 把远程 URL 解析为 owner/name 列表（去重）。
 */
//@ chunk-ha3km179.js:117562-118044 placement
function listRemoteRepos(e) {
  let n = [];
  for (let [r, s] of e.remotes) {
    let h = Xd(r);
    if (h === null) continue;
    let y = s.pushurl.length > 0 ? s.pushurl : s.url,
      S = new Set();
    for (let M of y) {
      let R = parseGitRemote(M);
      if (R === null) continue;
      let T = `${R.owner}/${R.name}`;
      if (S.has(`${R.host}/${T}`)) continue;
      (S.add(`${R.host}/${T}`),
        n.push({
          name: h,
          host: R.host,
          remote: oqe(T),
          visibility: fi({
            slug: T,
            host: R.host,
            visibility: repoVisibilityStore.lookup(R.host, T) ?? "unknown",
          }),
        }));
    }
  }
  return (n.sort((r, s) => r.name.localeCompare(s.name) || r.remote.localeCompare(s.remote)), n);
}
//@ chunk-ha3km179.js:118044-118168 placement
function knownRemoteVisibilities() {
  return repoVisibilityStore
    .entries()
    .map((e) => ({ host: e.host, remote: oqe(e.slug), visibility: fi(e) }))
    .filter((e) => e.remote !== "");
}
/**
 * 收集工作目录的 git 状态（根、分支、默认分支、状态、远程可见性）。
 */
//@ chunk-ha3km179.js:118168-119751 placement
async function collectGitState(e, n, r) {
  let s = (() => {
      try {
        return isRepoVisibilityCheckEnabled();
      } catch {
        return !1;
      }
    })(),
    h = (y) => ({
      cwd: e,
      root: null,
      branch: null,
      default_branch: null,
      status: null,
      visibility: s
        ? {
            origin: null,
            push_remote: null,
            remotes: [],
            visibility_cache: knownRemoteVisibilities().slice(0, s3n),
          }
        : null,
      error: y,
    });
  if (e === null || isDiskless()) return h("error");
  try {
    let y = findGitRootRecheckingNegative(e);
    if (y === null) return h("not_a_repo");
    let S = {};
    if (r !== void 0 && s) r.visibility = S;
    let M = UUo(),
      R = BUo(),
      [T, w, P, Q] = await Promise.all([
        M || R ? readGitStatusPair(e, R, n) : null,
        runGitReadOnly(e, ["rev-parse", "--abbrev-ref", "HEAD"], { abortSignal: n }),
        s ? checkCurrentRepoVisibility(e, S) : null,
        s ? readGitRemoteConfig(e, n) : null,
      ]),
      D = w.ok ? w.stdout.trim() : null,
      L = D === null ? null : ng(D),
      z = Q === null ? [] : listRemoteRepos(Q),
      G = s ? knownRemoteVisibilities() : [],
      ee = z.length > JUr || G.length > s3n || L !== D,
      V = {
        cwd: e,
        root: y,
        branch: L,
        default_branch: null,
        visibility: s
          ? {
              origin: P === null ? null : { host: P.host, remote: oqe(P.slug), visibility: fi(P) },
              push_remote: Q === null ? null : Xd(pushRemoteForBranch(Q, D)),
              remotes: z.slice(0, JUr),
              visibility_cache: G.slice(0, s3n),
            }
          : null,
        ...(ee && { truncated: !0 }),
      };
    if (T === null) return { ...V, status: null };
    let { normal: normal, all: all } = T,
      Z = all?.ok ? all : normal.ok ? normal : null;
    if (Z === null)
      return {
        ...V,
        status: null,
        error:
          (!normal.ok && normal.timedOut) || (all !== null && !all.ok && all.timedOut) ? "timeout" : "error",
      };
    let filtered = Z.stdout
        .split(
          `
`,
        )
        .filter((nt) => nt.length > 0),
      joined = [
        ...filtered.filter((nt) => nt.startsWith("??")),
        ...filtered.filter((nt) => !nt.startsWith("??")),
      ].join(`
`),
      se = jUo(),
      Te = R ? truncateLinesToChars(joined, se > 0 ? Math.min(se, S$o) : S$o) : null,
      U = countPorcelainStatus(Z.stdout);
    return {
      ...V,
      status: {
        clean: filtered.length === 0,
        counts: M
          ? {
              staged: U.staged,
              modified: U.modified,
              untracked: all?.ok ? U.untracked : null,
              untracked_normal: normal.ok ? countPorcelainStatus(normal.stdout).untracked : null,
            }
          : null,
        porcelain: Te,
        truncated: Te !== null && (Z !== all || Te !== joined),
      },
    };
  } catch {
    return h("error");
  }
}
//@ chunk-ha3km179.js:119751-119823 placement
var TENGU_VELVET_MARBLE = "tengu_velvet_marble",
  ug = 300,
  eu = 128,
  tu = 32,
  cg = 300,
  mg = 2000,
  fg = 1024;
//@ chunk-ha3km179.js:119823-119971 placement
function withTimeoutDefault(e, n, r) {
  return new Promise((s, h) => {
    let y = setTimeout((S, M) => S(M), n, s, r);
    e.then(
      (S) => {
        (clearTimeout(y), s(S));
      },
      (S) => {
        (clearTimeout(y), h(S));
      },
    );
  });
}
//@ chunk-ha3km179.js:119971-120028 placement
var ou = ge({}, (e) => {
  (delete e.whole, delete e.rulesUnread);
});
//@ chunk-ha3km179.js:120028-120069 placement
function gg() {
  return withTimeoutDefault(listProvidedTabs(), cg, void 0);
}

export { TENGU_VELVET_MARBLE, Vd, gg, tu, eu, withTimeoutDefault, mg, ou, fg, collectGitState, ug };
