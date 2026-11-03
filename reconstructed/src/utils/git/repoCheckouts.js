/**
 * utils/git/repoCheckouts.ts
 *
 * 2.1.316 新增：多仓库检出元数据。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6vnxsn99.js (9)
 * attribution: placement 9
 */
import { sep, sep as sep_2, sep as sep_3, sep as sep_4 } from "path";
import { jsonParse } from "../slowOperations.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { isDisklessProcess } from "../../bootstrap/state.js";
import { ao } from "../../bridge/bridgeHostState.js";
import { env } from "../env.js";
import { gl } from "../cwd.js";
import { op, kMt, rQt, resolveNetworkShareCached } from "../remoteEnvironment.js";
import {
  linkChainIsUnsafeToFollow,
  addWatchedRepo,
  onRepoBranchChange,
  getCachedBranchForRepo,
} from "./gitFilesystem.js";
import { e9 } from "../permissions/protectedDirs.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-6vnxsn99.js:1838-2082 placement
function parseEnvMap(e) {
  let n = new Map();
  if (!e) return n;
  try {
    let r = jsonParse(e);
    if (r && typeof r === "object") {
      for (let [o, s] of Object.entries(r)) if (typeof s === "string") n.set(o, s);
    }
  } catch (error) {
    logForDebugging(`[repo-checkouts] Failed to parse env map: ${errorMessage(error)}`, { level: "error" });
  }
  return n;
}
/**
 * 读取会话声明的多仓库检出（CLAUDE_CODE_REPO_CHECKOUTS，JSON 名称→绝对路径），过滤非绝对路径并缓存。
 */
//@ chunk-6vnxsn99.js:2082-2366 placement
function getRepoCheckouts() {
  if (isDisklessProcess()) return new Map();
  let repoCheckouts = ao().repoCheckouts;
  if (repoCheckouts.checkouts) return repoCheckouts.checkouts;
  let CLAUDE_CODE_REPO_CHECKOUTS = env.CLAUDE_CODE_REPO_CHECKOUTS;
  if (!CLAUDE_CODE_REPO_CHECKOUTS) {
    let r = gl();
    return ((repoCheckouts.checkouts = new Map(r === null ? [] : [["", r]])), repoCheckouts.checkouts);
  }
  if (((repoCheckouts.checkouts = parseEnvMap(CLAUDE_CODE_REPO_CHECKOUTS)), op()))
    repoCheckouts.checkouts = filterAbsoluteCheckouts(repoCheckouts.checkouts);
  return repoCheckouts.checkouts;
}
//@ chunk-6vnxsn99.js:2366-2497 placement
function resolveCheckoutPath(e) {
  if (!op()) return e;
  let n = kMt();
  if (!rQt(e, n) || linkChainIsUnsafeToFollow(e, n)) return null;
  let r = e9(e);
  return r !== null && rQt(r, resolveNetworkShareCached(n)) ? r : null;
}
//@ chunk-6vnxsn99.js:2497-2727 placement
function filterAbsoluteCheckouts(e) {
  let n = kMt(),
    r = new Map([...e].filter(([, o]) => rQt(o, n)));
  if (r.size < e.size)
    logForDebugging(
      `[repo-checkouts] ignored ${e.size - r.size} declared checkout(s) whose path is not absolute or lies on another host`,
      { level: "warn" },
    );
  return r;
}
//@ chunk-6vnxsn99.js:2727-2792 placement
function getDeclaredRepoCheckouts() {
  return env.CLAUDE_CODE_REPO_CHECKOUTS ? getRepoCheckouts() : new Map();
}
//@ chunk-6vnxsn99.js:2792-2920 placement
function getRepoBaseRefs() {
  let repoCheckouts = ao().repoCheckouts;
  if (repoCheckouts.baseRefs) return repoCheckouts.baseRefs;
  return ((repoCheckouts.baseRefs = parseEnvMap(env.CLAUDE_CODE_BASE_REFS)), repoCheckouts.baseRefs);
}
//@ chunk-6vnxsn99.js:2920-3002 placement
function checkoutNameForPath(e) {
  for (let [n, r] of getRepoCheckouts()) if (e === r || e.startsWith(r + sep)) return n;
  return;
}
//@ chunk-6vnxsn99.js:3002-3142 placement
async function watchRepoCheckouts(e) {
  ao().repoCheckouts.onMetadataChanged = e;
  for (let [, n] of getRepoCheckouts()) {
    let r = resolveCheckoutPath(n);
    if (r !== null) await addWatchedRepo(r);
  }
  onRepoBranchChange(() => void refreshCheckoutMetadata());
}
//@ chunk-6vnxsn99.js:3142-3428 placement
async function refreshCheckoutMetadata() {
  let e = getRepoCheckouts();
  if (e.size === 0) return;
  let n = {};
  for (let [o, s] of e) {
    let a = resolveCheckoutPath(s);
    if (a === null) continue;
    let u = await getCachedBranchForRepo(a);
    if (u !== void 0) n[o] = u;
  }
  let repoCheckouts = ao().repoCheckouts;
  if (En(n, repoCheckouts.lastEmittedBranches)) return;
  ((repoCheckouts.lastEmittedBranches = n), repoCheckouts.onMetadataChanged?.({ current_branches: n }));
}

export {
  refreshCheckoutMetadata,
  checkoutNameForPath,
  getDeclaredRepoCheckouts,
  getRepoCheckouts,
  resolveCheckoutPath,
  getRepoBaseRefs,
  watchRepoCheckouts,
};
