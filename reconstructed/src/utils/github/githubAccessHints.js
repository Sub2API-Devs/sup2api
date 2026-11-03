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
import { B4e } from "../../bridge/githubPrSubscription.js";
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
  let r = e.apostrophe ?? "'",
    o = `install the app at ${B4e}`,
    webSetupHint = e.webSetupHint,
    i =
      webSetupHint && e.leadWithWebSetup
        ? `${webSetupHint}, or ${o}`
        : `${o}${webSetupHint ? `, or ${webSetupHint}` : ""}`;
  return `Your connected GitHub account can${r}t see ${e.owner}/${e.name} \u2014 usually the Claude GitHub app isn${r}t installed on ${e.owner} or wasn${r}t granted this repo (web-connected accounts need it for private repos), or a different GitHub account is connected. To fix: ${i} \u2014 ${e.rerun}.`;
}
//@ chunk-ee3471fv.js:1294-1318 placement
var b = 5000,
  l = 2147483647;
/**
 * 探测连接的 GitHub 账号能否访问仓库，返回结论与 HTTP 状态（非第一方或仅必要流量时直接不确定）。
 */
//@ chunk-ee3471fv.js:1318-1921 placement
async function probeGithubRepoAccess(e, r, o = b) {
  let n = { verdict: "inconclusive", httpStatus: null };
  if (isEssentialTrafficOnly() || !isFirstPartyProvider()) return n;
  let i = Number.isSafeInteger(o) && o > 0 ? Math.min(o, l) : 0;
  if (i === 0) return n;
  let timeout = AbortSignal.timeout(i),
    a = (async () => {
      if ((await checkAndRefreshOAuthTokenIfNeeded(), timeout.aborted)) return n;
      let { linkedAccountAccess: linkedAccountAccess, httpStatus: httpStatus } =
        await checkGithubAppInstalled(e, r, timeout, { resyncUndetermined: !1 });
      return { verdict: linkedAccountAccess, httpStatus: httpStatus };
    })(),
    u = await raceWithAbortSignal(a, timeout, () => Error("budget expired")).catch(
      (s) => (
        logForDebugging(
          `linked GitHub account access probe gave up, treating as inconclusive: ${errorMessage(s)}`,
        ),
        n
      ),
    );
  return (
    logForDebugging(
      `linked GitHub account access to ${e}/${r}: ${u.verdict} (HTTP ${u.httpStatus ?? "none"})`,
    ),
    u
  );
}

export { probeGithubRepoAccess, noAccessText, installAppHint, connectAccountHint };
