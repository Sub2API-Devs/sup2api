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
import { sep } from "path";
import { jsonParse } from "../slowOperations.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { isDisklessProcess } from "../../bootstrap/state.js";
import { bridgeHostState } from "../../bridge/bridgeHostState.js";
import { env } from "../env.js";
import { getCwdOrNull } from "../cwd.js";
import {
  isByocEnvironment,
  initialCwdKey,
  isLocalAbsolutePath,
  resolveNetworkShareCached,
} from "../remoteEnvironment.js";
import {
  linkChainIsUnsafeToFollow,
  addWatchedRepo,
  onRepoBranchChange,
  getCachedBranchForRepo,
} from "./gitFilesystem.js";
import { realpathCacheEntry } from "../permissions/protectedDirs.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-6vnxsn99.js:1838-2082 placement
function parseEnvMap(e) {
  let n = new Map();
  if (!e) return n;
  try {
    let r = jsonParse(e);
    if (r && typeof r === "object") {
      for (let [key, value] of Object.entries(r)) if (typeof value === "string") n.set(key, value);
    }
  } catch (error) {
    logForDebugging(`[repo-checkouts] Failed to parse env map: ${errorMessage(error)}`, {
      level: "error",
    });
  }
  return n;
}
//@ chunk-6vnxsn99.js:2082-2366 placement
/**
 * 读取会话声明的多仓库检出（CLAUDE_CODE_REPO_CHECKOUTS，JSON 名称→绝对路径），过滤非绝对路径并缓存。
 */
function getRepoCheckouts() {
  if (isDisklessProcess()) return new Map();
  let repoCheckouts = bridgeHostState().repoCheckouts;
  if (repoCheckouts.checkouts) return repoCheckouts.checkouts;
  let CLAUDE_CODE_REPO_CHECKOUTS = env.CLAUDE_CODE_REPO_CHECKOUTS;
  if (!CLAUDE_CODE_REPO_CHECKOUTS) {
    let cwdOrNull = getCwdOrNull();
    repoCheckouts.checkouts = new Map(cwdOrNull === null ? [] : [["", cwdOrNull]]);
    return repoCheckouts.checkouts;
  }
  repoCheckouts.checkouts = parseEnvMap(CLAUDE_CODE_REPO_CHECKOUTS);
  if (isByocEnvironment()) repoCheckouts.checkouts = filterAbsoluteCheckouts(repoCheckouts.checkouts);
  return repoCheckouts.checkouts;
}
//@ chunk-6vnxsn99.js:2366-2497 placement
function resolveCheckoutPath(e) {
  if (!isByocEnvironment()) return e;
  let n = initialCwdKey();
  if (!isLocalAbsolutePath(e, n) || linkChainIsUnsafeToFollow(e, n)) return null;
  let r = realpathCacheEntry(e);
  return r !== null && isLocalAbsolutePath(r, resolveNetworkShareCached(n)) ? r : null;
}
//@ chunk-6vnxsn99.js:2497-2727 placement
function filterAbsoluteCheckouts(checkouts) {
  let n = initialCwdKey();
  let r = new Map([...checkouts].filter(([, o]) => isLocalAbsolutePath(o, n)));
  if (r.size < checkouts.size)
    logForDebugging(
      `[repo-checkouts] ignored ${checkouts.size - r.size} declared checkout(s) whose path is not absolute or lies on another host`,
      {
        level: "warn",
      },
    );
  return r;
}
//@ chunk-6vnxsn99.js:2727-2792 placement
function getDeclaredRepoCheckouts() {
  return env.CLAUDE_CODE_REPO_CHECKOUTS ? getRepoCheckouts() : new Map();
}
//@ chunk-6vnxsn99.js:2792-2920 placement
function getRepoBaseRefs() {
  let repoCheckouts = bridgeHostState().repoCheckouts;
  if (repoCheckouts.baseRefs) return repoCheckouts.baseRefs;
  repoCheckouts.baseRefs = parseEnvMap(env.CLAUDE_CODE_BASE_REFS);
  return repoCheckouts.baseRefs;
}
//@ chunk-6vnxsn99.js:2920-3002 placement
function checkoutNameForPath(e) {
  for (let [n, r] of getRepoCheckouts()) if (e === r || e.startsWith(r + sep)) return n;
  return;
}
//@ chunk-6vnxsn99.js:3002-3142 placement
async function watchRepoCheckouts(onMetadataChanged) {
  bridgeHostState().repoCheckouts.onMetadataChanged = onMetadataChanged;
  for (let [, n] of getRepoCheckouts()) {
    let checkoutPath = resolveCheckoutPath(n);
    if (checkoutPath !== null) await addWatchedRepo(checkoutPath);
  }
  onRepoBranchChange(() => void refreshCheckoutMetadata());
}
//@ chunk-6vnxsn99.js:3142-3428 placement
async function refreshCheckoutMetadata() {
  let repoCheckouts = getRepoCheckouts();
  if (repoCheckouts.size === 0) return;
  let n = {};
  for (let [o, s] of repoCheckouts) {
    let checkoutPath = resolveCheckoutPath(s);
    if (checkoutPath === null) continue;
    let cachedBranchForRepo = await getCachedBranchForRepo(checkoutPath);
    if (cachedBranchForRepo !== undefined) n[o] = cachedBranchForRepo;
  }
  let repoCheckouts_2 = bridgeHostState().repoCheckouts;
  if (En(n, repoCheckouts_2.lastEmittedBranches)) return;
  repoCheckouts_2.lastEmittedBranches = n;
  repoCheckouts_2.onMetadataChanged?.({
    current_branches: n,
  });
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
