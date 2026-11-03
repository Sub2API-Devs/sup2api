/**
 * utils/github/githubAccessHints.ts
 *
 * 2.1.316 新增：GitHub 仓库访问探测与修复提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ee3471fv.js (5)
 * attribution: placement 5
 */
import { connectGithubUrl } from "../../services/cloudSessions/webSetup.js";
import { GITHUB_APP_INSTALL_URL } from "../../bridge/githubPrSubscription.js";
import { isEssentialTrafficOnly } from "../privacyLevel.js";
import { isFirstPartyProvider } from "../model/providers.js";
import { checkAndRefreshOAuthTokenIfNeeded } from "../auth.js";
import { checkGithubAppInstalled } from "../background/remote/preconditions.js";
import { raceWithAbortSignal } from "../sleep.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";

//@ chunk-ee3471fv.js:516-684 placement
function connectAccountHint(e) {
  return `To fix: ${e.webSetupHint ? `${e.webSetupHint}, or connect` : "connect"} an account at ${connectGithubUrl()} \u2014 ${e.rerun} (allow a minute after connecting).`;
}
//@ chunk-ee3471fv.js:684-840 placement
function noAccessText(e) {
  return `${e.subject} with the GitHub account connected to your Claude account, and none is connected (or the connection expired). ${connectAccountHint(e)}`;
}
//@ chunk-ee3471fv.js:840-1294 placement
function installAppHint(e) {
  let apostrophe = e.apostrophe ?? "'";
  let o = `install the app at ${GITHUB_APP_INSTALL_URL}`;
  let webSetupHint = e.webSetupHint;
  let i =
    webSetupHint && e.leadWithWebSetup
      ? `${webSetupHint}, or ${o}`
      : `${o}${webSetupHint ? `, or ${webSetupHint}` : ""}`;
  return `Your connected GitHub account can${apostrophe}t see ${e.owner}/${e.name} \u2014 usually the Claude GitHub app isn${apostrophe}t installed on ${e.owner} or wasn${apostrophe}t granted this repo (web-connected accounts need it for private repos), or a different GitHub account is connected. To fix: ${i} \u2014 ${e.rerun}.`;
}
//@ chunk-ee3471fv.js:1294-1318 placement
var PROBE_TIMEOUT_MS = 5000;
var MAX_TIMEOUT_MS = 2147483647;
//@ chunk-ee3471fv.js:1318-1921 placement
/**
 * 探测连接的 GitHub 账号能否访问仓库，返回结论与 HTTP 状态（非第一方或仅必要流量时直接不确定）。
 */
async function probeGithubRepoAccess(owner, name, accessProbeBudgetMs = PROBE_TIMEOUT_MS) {
  let n = {
    verdict: "inconclusive",
    httpStatus: null,
  };
  if (isEssentialTrafficOnly() || !isFirstPartyProvider()) return n;
  let i =
    Number.isSafeInteger(accessProbeBudgetMs) && accessProbeBudgetMs > 0
      ? Math.min(accessProbeBudgetMs, MAX_TIMEOUT_MS)
      : 0;
  if (i === 0) return n;
  let c = AbortSignal.timeout(i);
  let a = (async () => {
    await checkAndRefreshOAuthTokenIfNeeded();
    if (c.aborted) return n;
    let { linkedAccountAccess, httpStatus } = await checkGithubAppInstalled(owner, name, c, {
      resyncUndetermined: false,
    });
    return {
      verdict: linkedAccountAccess,
      httpStatus,
    };
  })();
  let u = await raceWithAbortSignal(a, c, () => Error("budget expired")).catch((error) => {
    logForDebugging(
      `linked GitHub account access probe gave up, treating as inconclusive: ${errorMessage(error)}`,
    );
    return n;
  });
  logForDebugging(
    `linked GitHub account access to ${owner}/${name}: ${u.verdict} (HTTP ${u.httpStatus ?? "none"})`,
  );
  return u;
}
export { probeGithubRepoAccess, noAccessText, installAppHint, connectAccountHint };
