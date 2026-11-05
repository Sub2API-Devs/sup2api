/**
 * utils/github/githubAccessHints.ts
 *
 * 2.1.316 新增：GitHub 仓库访问探测与修复提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-dkwnm8vk.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-dkwnm8vk.js:516-684 placement
function connectAccountHint(hint) {
  return `To fix: ${hint.webSetupHint ? `${hint.webSetupHint}, or connect` : "connect"} an account at ${connectGithubUrl()} \u2014 ${hint.rerun} (allow a minute after connecting).`;
}
//@ chunk-dkwnm8vk.js:684-840 placement
function noAccessText(hint) {
  return `${hint.subject} with the GitHub account connected to your Claude account, and none is connected (or the connection expired). ${connectAccountHint(hint)}`;
}
//@ chunk-dkwnm8vk.js:840-1294 placement
function installAppHint(hint) {
  let apostrophe = hint.apostrophe ?? "'";
  let installHint = `install the app at ${GITHUB_APP_INSTALL_URL}`;
  let webSetupHint = hint.webSetupHint;
  let actionHint =
    webSetupHint && hint.leadWithWebSetup
      ? `${webSetupHint}, or ${installHint}`
      : `${installHint}${webSetupHint ? `, or ${webSetupHint}` : ""}`;
  return `Your connected GitHub account can${apostrophe}t see ${hint.owner}/${hint.name} \u2014 usually the Claude GitHub app isn${apostrophe}t installed on ${hint.owner} or wasn${apostrophe}t granted this repo (web-connected accounts need it for private repos), or a different GitHub account is connected. To fix: ${actionHint} \u2014 ${hint.rerun}.`;
}
//@ chunk-dkwnm8vk.js:1294-1318 placement
var PROBE_TIMEOUT_MS = 5000;
var MAX_TIMEOUT_MS = 2147483647;
//@ chunk-dkwnm8vk.js:1318-1921 placement
/**
 * 探测连接的 GitHub 账号能否访问仓库，返回结论与 HTTP 状态（非第一方或仅必要流量时直接不确定）。
 */
async function probeGithubRepoAccess(owner, name, accessProbeBudgetMs = PROBE_TIMEOUT_MS) {
  let inconclusive = {
    verdict: "inconclusive",
    httpStatus: null,
  };
  if (isEssentialTrafficOnly() || !isFirstPartyProvider()) return inconclusive;
  let budgetMs =
    Number.isSafeInteger(accessProbeBudgetMs) && accessProbeBudgetMs > 0
      ? Math.min(accessProbeBudgetMs, MAX_TIMEOUT_MS)
      : 0;
  if (budgetMs === 0) return inconclusive;
  let signal = AbortSignal.timeout(budgetMs);
  let probePromise = (async () => {
    await checkAndRefreshOAuthTokenIfNeeded();
    if (signal.aborted) return inconclusive;
    let { linkedAccountAccess, httpStatus } = await checkGithubAppInstalled(owner, name, signal, {
      resyncUndetermined: false,
    });
    return {
      verdict: linkedAccountAccess,
      httpStatus,
    };
  })();
  let probe = await raceWithAbortSignal(probePromise, signal, () => Error("budget expired")).catch(
    (error) => {
      logForDebugging(
        `linked GitHub account access probe gave up, treating as inconclusive: ${errorMessage(error)}`,
      );
      return inconclusive;
    },
  );
  logForDebugging(
    `linked GitHub account access to ${owner}/${name}: ${probe.verdict} (HTTP ${probe.httpStatus ?? "none"})`,
  );
  return probe;
}
export { probeGithubRepoAccess, noAccessText, installAppHint, connectAccountHint };
