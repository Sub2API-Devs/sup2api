/**
 * utils/teleport.tsx
 *
 * Teleport（云端会话）：创建远程会话、设备绑定、git 状态打包上传、把云会话拉回本地（检出分支、校验仓库）、错误分类。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/teleport.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-e6aww6q8.js (66)
 * attribution: fingerprint 7, affinity 1, layout 40, facade-exports 19
 */
import { stripVTControlCharacters } from "util";
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { createSystemMessage, createUserMessage, extractTextContent_2 } from "./messages.js";
import {
  TeleportOperationError,
  toError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  withTelemetryMessage,
  AbortError as AbortError_2,
  errorMessage,
  isAbortError,
  isExpectedApiError,
  getErrnoCode,
} from "./errors.js";
import {
  getOriginalCwd,
  isRestrictedSession,
  getIsNonInteractiveSession,
  getSessionId,
} from "../bootstrap/state.js";
import { Xer, Jer } from "./teleport/remoteTaskLabels.js";
import {
  getIsClean,
  getGitSshEnv,
  gitExe,
  findGitRoot,
  getFileStatus,
  redactGitRemoteCredentials,
  getDefaultBranch,
  getDefaultBranchIfKnown,
} from "./git.js";
import { logEvent } from "../services/analytics/index.js";
import { sequential } from "./sequential.js";
import { freeze as freeze_23, buildSafeGitEnvForRepo } from "./git/gitSafeEnv.js";
import { SAFE_UPLOAD_PACK_ARG } from "./gitSafeExec.js";
import { execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { logForDebugging } from "./debug.js";
import { buildGitEnvForRepo, resolveGitDirs } from "./git/gitDirResolution.js";
import { getCwd } from "./cwd.js";
import { listChangedTrackedFiles } from "./teleport/dirSync.js";
import { fromEnum, lit as lit_2, fromEnumArr, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { truncatePathMiddle } from "./format.js";
import { replaceControlChars, err as err_2, ok as ok_2 } from "./resultError.js";
import { plural, wh } from "./stringUtils.js";
import { markRemoteSourced } from "../tools/ArtifactTool/artifactResumeCarry.js";
import { Mjr } from "./transcript/deserialize.js";
import { hasOnlyPreservedBeforeBoundary, uZn } from "../services/projects/threadRows.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { isSafeRefName as isSafeRefName_2 } from "./git/safeRefName.js";
import {
  detectCurrentRepositoryWithHost,
  parseGitRemote,
  parseGitHubRepository,
  resolveRemoteUrl,
  parseRepoSlug,
  resolvePushRemoteUrl,
  isNestedGitLabProject,
  resolveRemote,
  repoDetectionGuards,
} from "./detectRepository.js";
import { q1e, getGitHostKind } from "./gitHosts.js";
import { isFirstPartyProvider } from "./model/providers.js";
import { policyDeniedReason } from "../services/policyLimits/policyEvidence.js";
import { logOrgPolicyDenied } from "../services/policyLimits/orgPolicyDeniedEvent.js";
import { env } from "./env.js";
import { jvt } from "../commands/review/ultrareviewPreconditions.js";
import {
  isConsoleProfileSessionsCredential,
  sessionsApiAccessToken,
  cloudSessionsSignInRefusal,
  sessionsApiOrganizationUUID,
  fetchSession,
  trustedDeviceHeaders,
  getBranchFromSession,
  pollRemoteSessionEvents,
  MCP_QUESTION_GRACE_MS,
  archiveRemoteSession,
  sendEventToRemoteSession,
  sendControlRequestToRemoteSession,
  getAccessTokenWithCcrFallback,
  resolveConsoleProfileBearer,
  ConsoleProfileCloudSessionsError,
  resendOnHeldBearer401,
  getOAuthRequestHeaders,
  bearerToSend,
  CCR_BYOC_BETA,
  sessionsApiAccessTokenNow,
} from "./teleport/api.js";
import { ye } from "./startupMarks.js";
import { isGithubDotCom } from "./git/githubUrl.js";
import { getTeleportErrors } from "../components/TeleportError.js";
import {
  getCurrentProjectConfig,
  saveCurrentProjectConfig,
  getGlobalConfig,
  saveGlobalConfig,
} from "./config.js";
import { G3e, acceptsMaxTurns } from "./teleport/cloudEnvironments.js";
import {
  hgr,
  vPt,
  cloudErrorMessage,
  Clt,
  Gis,
  gro,
  MESSAGE_NOT_SHOWN_NOTE,
} from "./teleport/cloudErrorMessage.js";
import { isPersistentRemoteSessionEnabled, isCcrV2SendEventsEnabled } from "../bridge/bridgeGates.js";
import { checkAdminRequestEligibility } from "../services/api/adminRequests.js";
import { getSessionLogsViaOAuth } from "../services/api/sessionIngress.js";
import { isTranscriptMessage } from "./sessionStorage.js";
import { Dt } from "../../vendor/axios/dist/esm/axios.js";
import { logError } from "./log.js";
import {
  MCP_ELICITATION_DIALOG_TOOL,
  setModeControlEvent,
  i9o,
  TENGU_DRIFTING_TWILIGHT,
  TENGU_BUZZING_RIVER,
  TENGU_WOVEN_HARBOR,
  buildSessionCreateBody,
  summarizeSessionCreateBody,
  projectNotFoundMessage,
  loginRejectedMessage,
  sessionIdFromCreateResponse,
  sessionTitleOf,
  l9o,
  redactSessionCreateBody,
  sessionEventsUrl,
} from "./teleport/sessionCreate.js";
import { sleep, raceWithAbortSignal } from "./sleep.js";
import { dFe } from "./focusMode.js";
import { getConfiguredAdvisorModel } from "./advisor.js";
import {
  inn,
  logBuiltinToolsCreate,
  duplicateSessionMessage,
  classifyPromptSendResult,
  archiveCloudSession,
  unsupportedEnvironmentOutcome,
  kB,
  CLOUD_LAUNCH_TOOL_ERRORS,
  rnn,
  snn,
} from "./teleport/cloudLaunch.js";
import { getRemoteSessionUrl } from "../constants/product.js";
import { reportSignerLoadFailure, Uki } from "./telemetry/memorySummary.js";
import {
  checkGate_CACHED_OR_BLOCKING,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  getDynamicConfig_BLOCKS_ON_INIT,
} from "../services/analytics/growthbook.js";
import {
  isCcpoolId,
  getEnvironmentSelectionInfo,
  tPe,
  selfHostedEnvironmentKind,
} from "./teleport/environmentSelection.js";
import { classifyDeviceBindingBlocker, Tti, otr } from "../bridge/deviceBinding.js";
import { planTrustedDeviceProof, sti, requestSecurityTier, zqo, iti } from "./teleport/securityTier.js";
import {
  planTrustedRepositoriesHeader,
  requestRepositoriesTrusted,
  logTrustedRepositoriesOutcome,
} from "./teleport/repositoriesTrusted.js";
import { readFlagWithOverride } from "../services/analytics/flagOverrides.js";
import { O0e } from "./teleport/containerSync.js";
import {
  collectLaunchRules,
  classifySyncedFileSensitivity,
  resolveUploadFilterRules,
  cXe,
} from "./teleport/dirSyncRules.js";
import { onceExport } from "../../vendor/lodash-es/once.js";
import { checkAndRefreshOAuthTokenIfNeeded } from "./auth.js";
import { ensureHostSessionsBearer, recoverHostSessionsBearer } from "./hostSessionsBearer.js";
import { lTt } from "./permissions/sensitivePaths.js";
import { isViolinWoodEnabled } from "../services/analytics/violinGates.js";
import { settleStoredLoginRefusal } from "./auth/storedLoginRefused.js";
import { fetchReferralEligibility_2 } from "../services/api/referral.js";
import { getOauthConfig } from "../constants/oauth.js";
import {
  environmentSelector,
  fetchEnvironments,
  createDefaultCloudEnvironment,
} from "./teleport/environments.js";
import { ensureTrustedDevice, explainUntrustedDeviceRefusal } from "./teleport/trustedDevice.js";
import { jsonStringify } from "./slowOperations.js";
import { fetchSelfHostedPools } from "./teleport/selfHostedPools.js";
import { checkSessionTitlePolicyTaint } from "./teleport/sessionTitle.js";
import { pwt, isForwardModeEffective, bon, oN } from "./teleport/homeSettingsMode.js";
import { readLaunchGitLayout, screenedGitEnvForReach } from "./teleport/screenedGit.js";
import {
  checkGithubAppInstalled,
  GITHUB_APP_CHECK_TIMEOUT_MS,
  MIN_RESYNC_BUDGET_MS,
  GITHUB_PRECONDITION_ERRORS,
} from "./background/remote/preconditions.js";
import {
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
} from "./teleport/branchStatus.js";
import { githubNotConnectedMessage } from "../services/cloudSessions/webSetup.js";
import { getMainLoopModel } from "./model/model.js";
import { getModelPickerEffortDefault } from "./effort.js";
import { Hcr } from "./github/anthropicRepos.js";
import { toCompatSessionId } from "../bridge/sessionIdCompat.js";
import { getTrustedDeviceToken } from "../bridge/trustedDevice.js";
import { subscribeGithubPullRequest } from "../bridge/githubPrSubscription.js";

//@ chunk-e6aww6q8.js:1941496-1941556 affinity
var ENV_SETUP_ONBOARDING_URL = "https://claude.ai/code/onboarding?magic=env-setup";
//@ chunk-e6aww6q8.js:1941556-1941737 fingerprint = createTeleportResumeSystemMessage (1)
function createTeleportResumeSystemMessage(branchError) {
  if (branchError === null) return createSystemMessage("Session resumed", "suggestion");
  let formattedError =
    branchError instanceof TeleportOperationError ? branchError.formattedMessage : branchError.message;
  return createSystemMessage(`Session resumed without branch: ${formattedError}`, "warning");
}
//@ chunk-e6aww6q8.js:1941737-1941916 fingerprint = createTeleportResumeUserMessage (1)
function createTeleportResumeUserMessage() {
  return createUserMessage({
    content: `This session is being continued from another machine. Application state may have changed. The updated working directory is ${getOriginalCwd()}`,
    isMeta: !0,
  });
}
//@ chunk-e6aww6q8.js:1941916-1941972 layout
var DEFAULT_BACKGROUND_TASK_TITLE = { title: Xer, branchName: "claude/background-task" };
/**
 * teleport 前要求工作区干净（tengu_teleport_error_git_not_clean）。
 */
//@ chunk-e6aww6q8.js:1941972-1942300 facade-exports = validateGitState (0.852)
async function validateGitState() {
  if (!(await getIsClean({ ignoreUntracked: !0 })))
    throw (
      logEvent("tengu_teleport_error_git_not_clean", {}),
      new TeleportOperationError(
        "Git working directory is not clean. Please commit or stash your changes before using --teleport.",
        sequential.red(`Error: Git working directory is not clean. Please commit or stash your changes before using --teleport.
`),
      )
    );
}
//@ chunk-e6aww6q8.js:1942300-1942776 fingerprint = fetchFromOrigin (1)
async function fetchFromOrigin(branch) {
  let fetchArgs = branch
      ? [...freeze_23, "fetch", SAFE_UPLOAD_PACK_ARG, "origin", `${branch}:${branch}`]
      : [...freeze_23, "fetch", SAFE_UPLOAD_PACK_ARG, "origin"],
    r = getRepoRootOrCwd(),
    s = { cwd: r, ...(await getGitSshEnv(r)) },
    { code: code, stderr: stderr } = await execFileNoThrowWithCwd(gitExe(), fetchArgs, s);
  if (code !== 0)
    if (branch && stderr.includes("refspec")) {
      logForDebugging(`Specific branch fetch failed, trying to fetch ref: ${branch}`);
      let { code: code, stderr: stderr } = await execFileNoThrowWithCwd(
        gitExe(),
        [...freeze_23, "fetch", SAFE_UPLOAD_PACK_ARG, "origin", branch],
        s,
      );
      if (code !== 0) logForDebugging(`Failed to fetch from remote origin: ${stderr}`, { level: "error" });
    } else logForDebugging(`Failed to fetch from remote origin: ${stderr}`, { level: "error" });
}
//@ chunk-e6aww6q8.js:1942776-1943374 fingerprint = ensureUpstreamIsSet (1)
async function ensureUpstreamIsSet(branchName) {
  let n = getRepoRootOrCwd(),
    r = { cwd: n, env: buildGitEnvForRepo(n) },
    { code: code } = await execFileNoThrowWithCwd(
      gitExe(),
      [...freeze_23, "rev-parse", "--abbrev-ref", `${branchName}@{upstream}`],
      r,
    );
  if (code === 0) {
    logForDebugging(`Branch '${branchName}' already has upstream set`);
    return;
  }
  let { code: code_2 } = await execFileNoThrowWithCwd(
    gitExe(),
    [...freeze_23, "rev-parse", "--verify", `origin/${branchName}`],
    r,
  );
  if (code_2 === 0) {
    logForDebugging(`Setting upstream for '${branchName}' to 'origin/${branchName}'`);
    let { code: code, stderr: stderr } = await execFileNoThrowWithCwd(
      gitExe(),
      [...freeze_23, "branch", "--set-upstream-to", `origin/${branchName}`, branchName],
      r,
    );
    if (code !== 0) logForDebugging(`Failed to set upstream for '${branchName}': ${stderr}`);
    else logForDebugging(`Successfully set upstream for '${branchName}'`);
  } else logForDebugging(`Remote branch 'origin/${branchName}' does not exist, skipping upstream setup`);
}
//@ chunk-e6aww6q8.js:1943374-1943411 layout
function getRepoRootOrCwd() {
  return findGitRoot(getCwd()) ?? getCwd();
}
//@ chunk-e6aww6q8.js:1943411-1943712 facade-exports
function userCheckoutSpawnTerms() {
  let e = getRepoRootOrCwd(),
    n = resolveGitDirs(e);
  if (n === null)
    throw new TeleportOperationError(
      `Could not verify this checkout's git repository: ${e} has no .git entry that points back to it`,
      sequential.red(`Could not verify this checkout's git repository (no .git entry that points back to it)
`),
    );
  return { cwd: e, env: buildSafeGitEnvForRepo(void 0, { repository: n }) };
}
/**
 * teleport 前把工作区 stash 到干净状态：先检查被 assume-unchanged/被文件夹替换的已跟踪路径（存在则拒绝，避免 stash 丢数据），再 add 未跟踪文件并 git stash push。
 */
//@ chunk-e6aww6q8.js:1943712-1945237 facade-exports = stashToCleanState (0.369)
async function stashToCleanState(e, { cwd: cwd, env: env }) {
  let s = await listChangedTrackedFiles(cwd, env);
  if (s.kind === "failed" || !s.isAssumeUnchangedListed) {
    let w = s.kind === "failed" ? s.cause : "assume_unchanged_listing",
      L = s.kind === "failed" && s.cause === "path_read" ? s.errno : void 0;
    (logForDebugging(
      s.kind === "failed"
        ? `[teleport] nothing was stashed: could not check for folders in place of tracked files (${w}${L === void 0 ? "" : ` ${L}`})`
        : "[teleport] the files marked assume-unchanged were not checked for folders in their place: git could not list them",
      { level: "error" },
    ),
      logEvent("tengu_teleport_stash_check_failed", {
        cause: fromEnum(w),
        ...(L !== void 0 && { errno: L }),
      }));
  }
  if (s.kind === "failed") return !1;
  let { replaced: replaced } = s;
  if (replaced[0] !== void 0) {
    logEvent("tengu_teleport_stash_refused", { entries_replaced_by_folders: replaced.length });
    let w = truncatePathMiddle(replaceControlChars(Buffer.from(replaced[0], "latin1").toString()), 100),
      L = replaced.length - 1,
      G =
        L === 0
          ? `Nothing was stashed: "${w}" is now a folder in place of a tracked file or link, and stashing could delete what's in it for good. Commit the change or move the folder somewhere else, then try again.`
          : `Nothing was stashed: "${w}" and ${L} other ${plural(L, "path")} are now folders in place of tracked files or links, and stashing could delete what's in them for good. Commit the change or move the folders somewhere else, then try again.`;
    throw new TeleportOperationError(
      G,
      sequential.red(`${G}
`),
    );
  }
  let { untracked: untracked } = await getFileStatus(cwd, env);
  if (untracked.length > 0) {
    let { code: addCode } = await execFileNoThrowWithCwd(
      gitExe(),
      [...freeze_23, "add", "--", ...untracked],
      { cwd: cwd, preserveOutputOnError: !1, env: env },
    );
    if (addCode !== 0) return !1;
  }
  let { code: code } = await execFileNoThrowWithCwd(
    gitExe(),
    [...freeze_23, "stash", "push", "--message", e],
    { cwd: cwd, preserveOutputOnError: !1, env: env },
  );
  return code === 0;
}
//@ chunk-e6aww6q8.js:1945237-1945804 fingerprint = checkoutBranch (1)
async function checkoutBranch(e, n) {
  let r = await execFileNoThrowWithCwd(gitExe(), [...freeze_23, "checkout", e, "--"], n);
  if (r.code !== 0)
    (logForDebugging(`Local checkout failed, trying to checkout from origin: ${r.stderr}`),
      (r = await execFileNoThrowWithCwd(
        gitExe(),
        [...freeze_23, "checkout", "-b", e, "--track", `origin/${e}`, "--"],
        n,
      )));
  if (r.code !== 0)
    (logForDebugging(`Remote checkout with -b failed, trying without -b: ${r.stderr}`),
      (r = await execFileNoThrowWithCwd(
        gitExe(),
        [...freeze_23, "checkout", "--track", `origin/${e}`, "--"],
        n,
      )));
  if (r.code !== 0)
    throw (
      logEvent("tengu_teleport_error_branch_checkout_failed", {}),
      new TeleportOperationError(
        `Failed to checkout branch '${e}': ${r.stderr}`,
        sequential.red(`Failed to checkout branch '${e}'
`),
      )
    );
  await ensureUpstreamIsSet(e);
}
//@ chunk-e6aww6q8.js:1945804-1945931 fingerprint = getCurrentBranch (1)
async function getCurrentBranch() {
  let e = getRepoRootOrCwd(),
    { stdout: stdout } = await execFileNoThrowWithCwd(gitExe(), [...freeze_23, "branch", "--show-current"], {
      cwd: e,
      env: buildGitEnvForRepo(e),
    });
  return stdout.trim();
}
//@ chunk-e6aww6q8.js:1945931-1945969 facade-exports
function deserializeRemoteSessionLog(e) {
  return markRemoteSourced(Mjr(e, !0));
}
//@ chunk-e6aww6q8.js:1945969-1946379 facade-exports = processMessagesForTeleportResume (0)
function processMessagesForTeleportResume(e, n, r) {
  let messagesWithTeleportNotice = [
    ...deserializeRemoteSessionLog(e),
    createTeleportResumeUserMessage(),
    createTeleportResumeSystemMessage(n),
  ];
  if (hasOnlyPreservedBeforeBoundary(e))
    (logFeatureSad("teleport_resume_history", "summarized_rows_absent"),
      messagesWithTeleportNotice.push(createSystemMessage(uZn, "warning")));
  else logFeatureOk("teleport_resume_history");
  if (r === "bridge")
    messagesWithTeleportNotice.push(
      createSystemMessage(
        "This terminal now has its own copy of the session: new work here stays local and will not appear in the Claude app. To continue on your phone later, run /remote-control in this session.",
        "warning",
      ),
    );
  return messagesWithTeleportNotice;
}
/**
 * fetch 并检出云会话所在分支，设置 upstream。
 */
//@ chunk-e6aww6q8.js:1946379-1946895 facade-exports = checkOutTeleportedSessionBranch (0.832)
async function checkOutTeleportedSessionBranch(branch) {
  try {
    let currentBranch = await getCurrentBranch();
    if ((logForDebugging(`Current branch before teleport: '${currentBranch}'`), branch)) {
      if (!isSafeRefName_2(branch))
        throw new TeleportOperationError(
          `Invalid branch name from cloud session: ${branch}`,
          sequential.red(`Invalid branch name from cloud session
`),
        );
      (logForDebugging(`Switching to branch '${branch}'...`),
        userCheckoutSpawnTerms(),
        await fetchFromOrigin(branch),
        await checkoutBranch(branch, userCheckoutSpawnTerms()));
      let newBranch = await getCurrentBranch();
      logForDebugging(`Branch after checkout: '${newBranch}'`);
    } else logForDebugging("No branch specified, staying on current branch");
    return { branchName: await getCurrentBranch(), branchError: null };
  } catch (error) {
    let branchName = await getCurrentBranch(),
      branchError = toError(error);
    return { branchName: branchName, branchError: branchError };
  }
}
/**
 * 检查云会话关联的 git 仓库与当前目录是否一致（含 host），不一致返回 mismatch。
 */
//@ chunk-e6aww6q8.js:1946895-1948437 facade-exports = validateSessionRepository (0.94)
async function validateSessionRepository(sessionData) {
  let currentParsed = await detectCurrentRepositoryWithHost(),
    r = currentParsed ? `${currentParsed.owner}/${currentParsed.name}` : null,
    gitSource = sessionData.session_context.sources.find((source) => source.type === "git_repository");
  if (!gitSource?.url)
    return (
      logForDebugging(
        r
          ? "Session has no associated repository, proceeding without validation"
          : "Session has no repo requirement and not in git directory, proceeding",
      ),
      { status: "no_repo_required" }
    );
  let sessionParsed = parseGitRemote(gitSource.url),
    y = sessionParsed ? `${sessionParsed.owner}/${sessionParsed.name}` : parseGitHubRepository(gitSource.url);
  if (!y) return { status: "no_repo_required" };
  if ((logForDebugging(`Session is for repository: ${y}, current repo: ${r ?? "none"}`), !r)) {
    if (findGitRoot(getCwd())) {
      let L = await resolveRemoteUrl(getCwd()),
        G = L ? parseRepoSlug(L) : null,
        q = L
          ? stripVTControlCharacters(redactGitRemoteCredentials(L) ?? "")
              .replace(/[\r\n]+/g, " ")
              .slice(0, 200) || void 0
          : void 0;
      if (G) {
        let Z = `${G.owner}/${G.name}`;
        if (Z.toLowerCase() === y.toLowerCase())
          return {
            status: "host_unverified",
            sessionRepo: y,
            sessionHost: sessionParsed?.host,
            currentRepo: Z,
            rawRemoteUrl: q,
          };
        return {
          status: "mismatch",
          sessionRepo: y,
          currentRepo: Z,
          sessionHost: sessionParsed?.host,
          rawRemoteUrl: q,
        };
      }
      if (q)
        return {
          status: "not_in_repo",
          sessionRepo: y,
          sessionHost: sessionParsed?.host,
          currentRepo: null,
          rawRemoteUrl: q,
        };
    }
    return { status: "not_in_repo", sessionRepo: y, sessionHost: sessionParsed?.host, currentRepo: null };
  }
  let repoMatch = r.toLowerCase() === y.toLowerCase(),
    hostMatch =
      !currentParsed ||
      !sessionParsed ||
      q1e(currentParsed.host.toLowerCase()) === q1e(sessionParsed.host.toLowerCase());
  if (repoMatch && hostMatch) return { status: "match", sessionRepo: y, currentRepo: r };
  if (sessionParsed) {
    let L = await resolvePushRemoteUrl(getCwd()),
      G = L ? parseGitRemote(L) : null;
    if (
      G &&
      q1e(G.host.toLowerCase()) === q1e(sessionParsed.host.toLowerCase()) &&
      `${G.owner}/${G.name}`.toLowerCase() === y.toLowerCase()
    )
      return { status: "match", sessionRepo: y, currentRepo: `${G.owner}/${G.name}` };
  }
  return {
    status: "mismatch",
    sessionRepo: y,
    currentRepo: r,
    sessionHost: sessionParsed?.host,
    currentHost: currentParsed?.host,
  };
}
//@ chunk-e6aww6q8.js:1948437-1948699 facade-exports
function formatRepoMismatchDisplay(e) {
  let n =
    e.sessionHost && e.currentHost && q1e(e.sessionHost).toLowerCase() !== q1e(e.currentHost).toLowerCase();
  return {
    sessionDisplay: n ? `${e.sessionHost}/${e.sessionRepo}` : e.sessionRepo,
    currentDisplay: n ? `${e.currentHost}/${e.currentRepo}` : e.currentRepo,
  };
}
/**
 * 把云端会话拉回本地继续：校验仓库匹配、拉取会话日志、检出对应分支，返回消息与分支。
 */
//@ chunk-e6aww6q8.js:1948699-1950938 facade-exports = teleportResumeCodeSession (0.74)
async function teleportResumeCodeSession(sessionId, onProgress) {
  if (!isFirstPartyProvider())
    throw Error("Cloud sessions are only available on the first-party Anthropic API provider.");
  let r = policyDeniedReason("allow_remote_sessions", "Cloud sessions", "are");
  if (r)
    throw (
      logOrgPolicyDenied("allow_remote_sessions", "cloud_session"),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        r,
        "allow_remote_sessions policy denied",
      )
    );
  if (env.CLAUDE_CODE_EVAL_CONFINED)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      jvt,
      "cloud session resume refused in an evaluation run",
    );
  logForDebugging(`Resuming code session ID: ${sessionId}`);
  try {
    let s = isConsoleProfileSessionsCredential(),
      h = await sessionsApiAccessToken(s);
    if (!h)
      throw (
        logEvent("tengu_teleport_resume_error", { error_type: lit_2("no_access_token") }),
        Error(cloudSessionsSignInRefusal())
      );
    let y = await sessionsApiOrganizationUUID(s);
    if (!y)
      throw (
        logEvent("tengu_teleport_resume_error", { error_type: lit_2("no_org_uuid") }),
        Error("Unable to get organization UUID for constructing session URL")
      );
    onProgress?.("validating");
    let sessionData = await fetchSession(sessionId),
      repoValidation = await validateSessionRepository(sessionData);
    switch (repoValidation.status) {
      case "match":
      case "no_repo_required":
        break;
      case "host_unverified":
        logEvent("tengu_teleport_repo_host_unverified", { sessionId: ye(sessionId) });
        break;
      case "not_in_repo": {
        logEvent("tengu_teleport_error_repo_not_in_git_dir_sessions_api", {
          sessionId: ye(sessionId),
          stage: lit_2("resume_validate"),
        });
        let L =
            repoValidation.sessionHost && !isGithubDotCom(repoValidation.sessionHost)
              ? `${repoValidation.sessionHost}/${repoValidation.sessionRepo}`
              : repoValidation.sessionRepo,
          G = repoValidation.rawRemoteUrl
            ? `
Couldn't parse your git remote: ${repoValidation.rawRemoteUrl}`
            : "";
        throw new TeleportOperationError(
          `You must run claude --teleport ${sessionId} from a checkout of ${L}.${G}`,
          sequential.red(`You must run claude --teleport ${sessionId} from a checkout of ${sequential.bold(L)}.${G}
`),
        );
      }
      case "mismatch": {
        logEvent("tengu_teleport_error_repo_mismatch_sessions_api", {
          sessionId: ye(sessionId),
          stage: lit_2("resume_validate"),
        });
        let { sessionDisplay: sessionDisplay, currentDisplay: currentDisplay } =
          formatRepoMismatchDisplay(repoValidation);
        throw new TeleportOperationError(
          `You must run claude --teleport ${sessionId} from a checkout of ${sessionDisplay}.
This repo is ${currentDisplay}.`,
          sequential.red(`You must run claude --teleport ${sessionId} from a checkout of ${sequential.bold(sessionDisplay)}.
This repo is ${sequential.bold(currentDisplay)}.
`),
        );
      }
      case "error":
        throw new TeleportOperationError(
          repoValidation.errorMessage || "Failed to validate session repository",
          sequential.red(`Error: ${repoValidation.errorMessage || "Failed to validate session repository"}
`),
        );
      default: {
        let status = repoValidation.status;
        throw Error(`Unhandled repo validation status: ${status}`);
      }
    }
    return await teleportFromSessionsAPI(sessionId, y, h, s, onProgress, sessionData);
  } catch (error) {
    if (error instanceof TeleportOperationError) throw error;
    let err = toError(error);
    throw (
      logForDebugging(`Failed to resume teleport session ${sessionId}: ${err.message}`, { level: "error" }),
      logEvent("tengu_teleport_resume_error", { error_type: lit_2("resume_session_id_catch") }),
      new TeleportOperationError(
        err.message,
        sequential.red(`Error: ${err.message}
`),
      )
    );
  }
}
//@ chunk-e6aww6q8.js:1950938-1951179 facade-exports = handleTeleportPrerequisites (0.836)
async function handleTeleportPrerequisites(e, n, r) {
  let s = await getTeleportErrors(void 0, n);
  if (s.size > 0)
    (logEvent("tengu_teleport_errors_detected", {
      error_types: fromEnumArr([...s]),
      errors_ignored: fromEnumArr([...n]),
    }),
      await r(e, n),
      logEvent("tengu_teleport_errors_resolved", { error_types: fromEnumArr([...s]) }));
  return s.size > 0;
}
//@ chunk-e6aww6q8.js:1951179-1951567 layout
function logCloudSessionLink(e, n, r, s, h) {
  if (
    (logEvent("tengu_ccr_session_link", {
      ccr_session_id: ye(e),
      source: fromEnum(n),
      create_endpoint: fromEnum(s.endpoint),
      grouped: s.grouped,
      create_effort_level: fromEnumOpt(s.effortLevel),
    }),
    r.project && !getCurrentProjectConfig().hasUsedRemoteSession)
  )
    saveCurrentProjectConfig((y) => (y.hasUsedRemoteSession ? y : { ...y, hasUsedRemoteSession: !0 }), h);
  if (r.global && !getGlobalConfig().hasRemoteEnvironment)
    saveGlobalConfig((y) => (y.hasRemoteEnvironment ? y : { ...y, hasRemoteEnvironment: !0 }), h);
}
//@ chunk-e6aww6q8.js:1951567-1952235 facade-exports
var CREATE_SESSION_FAILURES = {
    no_session_id: {
      reason: "malformed_response",
      message: "Server returned a malformed session response (no session id)",
      telemetry: "CreateSession response missing session id",
      logLead: "No session id in response",
    },
    unusable_session_id: {
      reason: "unusable_session_id",
      message:
        "The server returned a session id that this version of Claude Code cannot use. A session may have been created: look for it at https://claude.ai/code. If this happens again, update Claude Code.",
      telemetry: "CreateSession response has an unusable session id",
      logLead: "Unusable session id in response",
    },
  },
  RESTRICTED_SESSION_CLOUD_REFUSAL =
    "Cloud sessions cannot be created from a --restricted session: they would not enforce it.";
//@ chunk-e6aww6q8.js:1952235-1952392 facade-exports
function cloudCreateRefusal() {
  if (isRestrictedSession())
    return { message: RESTRICTED_SESSION_CLOUD_REFUSAL, reason: "restricted_session" };
  if (env.CLAUDE_CODE_EVAL_CONFINED) return { message: jvt, reason: "eval_confined" };
  return null;
}
//@ chunk-e6aww6q8.js:1952392-1952694 layout
function normalizeApiErrorType(e) {
  if (typeof e !== "string" || e === "") return;
  switch (e) {
    case "authentication_error":
    case "invalid_request_error":
    case "permission_error":
    case "api_error":
    case "not_found_error":
    case "rate_limit_error":
    case "billing_error":
    case "overloaded_error":
    case "request_too_large":
      return e;
    default:
      return "other";
  }
}
//@ chunk-e6aww6q8.js:1952694-1953275 layout
function normalizeCreateSessionError(e) {
  if (typeof e !== "string" || e === "") return;
  let n = G3e(e);
  if (n !== void 0) return n;
  switch (e) {
    case "github_repo_access_denied":
    case "environment_not_found":
    case "monorepo_source_required":
    case "monorepo_env_required":
    case "model_not_available_for_org":
    case "invalid_set_model_request":
    case "org_storage_quota_exceeded":
    case "feature_disabled":
    case "invalid_id":
    case "public_grouping_hosted_only":
    case "public_grouping_requires_agent":
    case "public_grouping_default_agent_deleted":
    case "public_grouping_default_agent_invalid":
    case "builtin_tools_unavailable":
      return e;
    default:
      return "other";
  }
}
//@ chunk-e6aww6q8.js:1953275-1953318 layout
function xon(e, n) {
  return hgr(e, "") || vPt(n);
}
//@ chunk-e6aww6q8.js:1953318-1953681 layout
function formatEnvironmentRepoMismatch(e, n, r) {
  return e
    ? `This repository needs the environment set up for it, but "${n}" was selected. Select that environment instead, or run from a different repository.`
    : `The selected environment "${n}" only accepts the repository it is set up for, but the source was ${r}. Run this from a checkout of that repository, or select a different environment.`;
}
//@ chunk-e6aww6q8.js:1953681-1955574 facade-exports
async function teleportToRemoteWithErrorHandling(e, n) {
  let s = await handleTeleportPrerequisites(e, new Set(["needsGitStash"]), n.showTeleportErrors),
    h,
    y,
    S = [],
    w,
    L = await teleportToRemote({
      initialMessage: n.description,
      initialMessageUuid: n.descriptionUuid,
      signal: n.signal,
      source: n.source,
      personAskedForSession: n.personAskedForSession,
      branchName: n.branchName,
      branchFromHead: n.branchFromHead,
      explicitRef: n.explicitRef,
      permissionMode: n.permissionMode,
      isModeFromSettings: n.isModeFromSettings,
      proactivityLevel: n.proactivityLevel,
      effort: n.effort,
      isEffortFromSettings: n.isEffortFromSettings,
      disallowedTools: n.disallowedTools,
      builtinTools: n.builtinTools,
      model: n.model,
      title: n.title,
      environmentVariables: n.environmentVariables,
      appendSystemPrompt: n.appendSystemPrompt,
      poolId: n.poolId,
      chosenEnvironment: n.chosenEnvironment,
      reuseOutcomeBranch: n.reuseOutcomeBranch,
      correlationId: n.correlationId,
      persistentVolume: n.persistentVolume,
      persistentVolumeFromSessionId: n.persistentVolumeFromSessionId,
      monorepo: n.monorepo,
      noMonorepo: n.noMonorepo,
      noMonorepoAsksTheService: n.noMonorepoAsksTheService,
      personal: n.personal,
      sessionGroupingId: n.sessionGroupingId,
      deviceBinding: n.deviceBinding,
      connectedSession: n.connectedSession,
      ...{},
      hasApprovedCopy: n.hasApprovedCopy,
      storageV5: n.storageV5,
      credentials: n.credentials,
      allowBundle: !0,
      firstUpload: n.firstUpload,
      staysAttached: n.staysAttached,
      deferInitialMessage: n.deferInitialMessage,
      forwardHomeSettings: n.forwardHomeSettings,
      ...(n.homeSettingsConsent && { homeSettingsConsent: n.homeSettingsConsent }),
      onProgress: n.onProgress,
      onBundleFail: (G, q) => {
        switch (q) {
          case "env_create":
            h = "env_create_failed";
            break;
          case "bundle":
            h = "bundle_failed";
            break;
          default: {
            let Z = q;
          }
        }
        ((y = G),
          process.stderr.write(`
${G}
`));
      },
      onBundleNotice: (G) => {
        (S.push(G),
          process.stderr.write(`
${G}
`));
      },
      onCreateFail: (G, q, Z) => {
        ((h = q),
          (y = G),
          (w = Z),
          process.stderr.write(`
${G}
`));
      },
    });
  if (L) return { ok: !0, session: L, notices: S };
  return {
    ok: !1,
    failReason: h ?? (n.signal.aborted ? "aborted" : "unknown"),
    failMessage: y,
    failDetail: w,
  };
}
/**
 * 从 Sessions API 拉取远程会话的事件日志并转换为本地消息。
 */
//@ chunk-e6aww6q8.js:1955574-1956933 facade-exports = teleportFromSessionsAPI (0.864)
async function teleportFromSessionsAPI(e, n, r, s, h, y) {
  let startTime = Date.now();
  try {
    (logForDebugging(`[teleport] Starting fetch for session: ${e}`), h?.("fetching_logs"));
    let logsStartTime = Date.now(),
      L;
    if (s) L = void 0;
    else if (isPersistentRemoteSessionEnabled()) {
      let { readStoredTrustedDeviceToken: readStoredTrustedDeviceToken } =
        await import("./chunk-3kb57csj.js");
      L = await readStoredTrustedDeviceToken();
    } else L = (await trustedDeviceHeaders())["X-Trusted-Device-Token"];
    let G = await checkAdminRequestEligibility(e, r, n, L);
    if (G === null)
      (logForDebugging("[teleport] v2 endpoint returned null, trying session-ingress"),
        (G = await getSessionLogsViaOAuth(e, r, n)));
    if ((logForDebugging(`[teleport] Session logs fetched in ${Date.now() - logsStartTime}ms`), G === null))
      throw Error("Failed to fetch session logs");
    let filterStartTime = Date.now(),
      messages = G.filter((entry) => isTranscriptMessage(entry) && !entry.isSidechain);
    (logForDebugging(
      `[teleport] Filtered ${G.length} entries to ${messages.length} messages in ${Date.now() - filterStartTime}ms`,
    ),
      h?.("fetching_branch"));
    let branch = y ? getBranchFromSession(y) : void 0;
    if (branch) logForDebugging(`[teleport] Found branch: ${branch}`);
    return (
      logForDebugging(`[teleport] Total teleportFromSessionsAPI time: ${Date.now() - startTime}ms`),
      { log: messages, branch: branch, environmentKind: y?.environment_kind }
    );
  } catch (error) {
    if (error instanceof TeleportOperationError) throw error;
    let err = toError(error);
    if (Dt.isAxiosError(error) && error.response?.status === 404)
      throw (
        logEvent("tengu_teleport_error_session_not_found_404", { sessionId: ye(e) }),
        new TeleportOperationError(
          `${e} not found.
Run /status in Claude Code to check your account.`,
          `${e} not found.
${sequential.dim("Run /status in Claude Code to check your account.")}`,
        )
      );
    throw (
      logError(withTelemetryMessage(toError(err), "Failed to fetch session from Sessions API")),
      Error(`Failed to fetch session from Sessions API: ${err.message}`)
    );
  }
}
//@ chunk-e6aww6q8.js:1956933-1959369 facade-exports
async function awaitRemoteSessionResult(e, n, r) {
  if (!isFirstPartyProvider())
    throw Error("Cloud sessions are only available on the first-party Anthropic API provider.");
  let s = 1000,
    h = 1800000,
    y = 5,
    S = 10,
    w = 3,
    L = null,
    G,
    q,
    Z = 0,
    Se = 0,
    ke = 0,
    we = 0,
    Ee,
    Ae = !1,
    now = Date.now();
  while (Date.now() - now < h) {
    if (n?.aborted) throw Error("Workflow aborted");
    let ze = await pollRemoteSessionEvents(e, L, { credentials: r });
    L = ze.lastEventId;
    for (let newEvent of ze.newEvents)
      if (newEvent.type === "assistant") {
        G = newEvent;
        for (let Je of newEvent.message.content) if (Je.type === "tool_use") Z++;
      } else if (newEvent.type === "result") q = newEvent;
    if (ze.sessionStatus === "archived") {
      Ae = !0;
      break;
    }
    if (ze.sessionStatus === "requires_action") {
      let pendingAction = ze.pendingAction,
        now = Date.now();
      if (pendingAction?.name === MCP_ELICITATION_DIALOG_TOOL) {
        if (((we = 0), Ee === void 0 || Ee.requestId !== pendingAction.request_id))
          Ee = { requestId: pendingAction.request_id, firstSeenAt: now };
        else if (now - Ee.firstSeenAt >= MCP_QUESTION_GRACE_MS)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Cloud session ${e} has shown an unanswered MCP server question for more than ${MCP_QUESTION_GRACE_MS / 60000} min, and nothing on this machine can answer it, so this run stopped waiting for it. If that server needs to ask the user things, run this agent locally rather than as a cloud session.`,
            "gave up waiting on a cloud session parked on an MCP server question",
          );
      } else {
        if (pendingAction === void 0) we++;
        if (pendingAction !== void 0 || we >= w)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Cloud session ${e} is waiting for input that nothing on this machine can give (a permission prompt, a question, or some other dialog). If it is a permission prompt, make sure the cloud agent's allowed_tools cover the tool, or use a permission mode that doesn't prompt; if it is a question, tell the agent in its prompt not to ask one.`,
            "gave up on a cloud session parked on a prompt nothing here answers",
          );
      }
    } else if (ze.sessionStatus !== void 0) ((we = 0), (Ee = void 0));
    if (ze.sessionStatus === void 0) {
      if ((ke++, ke >= S))
        throw Error(
          `Cloud session ${e}: fetchSession failed ${S} times in a row (last error: ${ze.metadataFetchError ?? "unknown"}). Bailing instead of polling to the 30-min timeout.`,
        );
    } else ke = 0;
    if (ze.sessionStatus === "idle" && ze.newEvents.length === 0) {
      if ((Se++, Se >= y)) {
        Ae = !0;
        break;
      }
    } else Se = 0;
    await sleep(s, n);
  }
  if (!Ae)
    throw Error(
      `Cloud session ${e} timed out after ${h / 60000} min` +
        (Ee !== void 0 ? ", still waiting for someone to answer an MCP server's question" : ""),
    );
  let Me =
      G && G.type === "assistant"
        ? extractTextContent_2(
            G.message.content,
            `
`,
          )
        : "",
    We = q && q.type === "result" ? q : void 0;
  return {
    text: Me,
    structuredOutput: We?.subtype === "success" ? We.structured_output : void 0,
    resultSubtype: We?.subtype,
    usage: We?.usage,
    totalCostUsd: We?.total_cost_usd,
    modelUsage: We?.modelUsage,
    numTurns: We?.num_turns,
    toolCalls: Z,
  };
}
//@ chunk-e6aww6q8.js:1959369-1960745 layout
function buildInitialControlEvents(e) {
  let n = [];
  if (e.thinking && (e.thinking.maxThinkingTokens !== void 0 || e.thinking.display !== void 0))
    n.push({
      type: "event",
      data: {
        type: "control_request",
        request_id: `set-thinking-${randomUUID_23()}`,
        request: {
          subtype: "set_max_thinking_tokens",
          ...(e.thinking.maxThinkingTokens !== void 0 && {
            max_thinking_tokens: e.thinking.maxThinkingTokens,
          }),
          ...(e.thinking.display !== void 0 && { thinking_display: e.thinking.display }),
        },
      },
    });
  if (e.proactivityLevel)
    n.push({
      type: "event",
      data: {
        type: "control_request",
        request_id: `set-level-${randomUUID_23()}`,
        request: { subtype: "set_proactivity_level", level: e.proactivityLevel, offer_bypass: !1 },
      },
    });
  if (e.permissionMode)
    n.push(
      setModeControlEvent(e.permissionMode, { ultraplan: e.ultraplan, isFromSettings: e.isModeFromSettings }),
    );
  if (!getIsNonInteractiveSession() && dFe())
    n.push({
      type: "event",
      data: {
        type: "control_request",
        request_id: `apply-flag-settings-${randomUUID_23()}`,
        request: { subtype: "apply_flag_settings", settings: { viewMode: "focus" } },
      },
    });
  let r = getConfiguredAdvisorModel();
  if (r)
    n.push({
      type: "event",
      data: {
        type: "control_request",
        request_id: `apply-flag-settings-${randomUUID_23()}`,
        request: { subtype: "apply_flag_settings", settings: { advisorModel: r } },
      },
    });
  if (e.title) n.push({ type: "event", data: buildRenameSessionRequest(e.title) });
  if (
    typeof e.initialMessage === "string" ? e.initialMessage : e.initialMessage && e.initialMessage.length > 0
  )
    n.push({
      type: "event",
      data: {
        uuid: e.initialMessageUuid ?? randomUUID_23(),
        session_id: "",
        type: "user",
        parent_tool_use_id: null,
        message: { role: "user", content: e.initialMessage },
      },
    });
  return n;
}
/**
 * 把本地选项映射为远程会话配置（custom_system_prompt、max_turns、max_budget_usd、allowed_tools、disallowed_tools、builtin_tools…）。
 */
//@ chunk-e6aww6q8.js:1960745-1961200 layout
function buildRemoteSessionConfig(e) {
  return {
    ...(e.customSystemPrompt && { custom_system_prompt: e.customSystemPrompt }),
    ...(e.maxTurns !== void 0 && { max_turns: e.maxTurns }),
    ...(e.maxBudgetUsd !== void 0 && e.maxBudgetUsd > 0 && { max_budget_usd: e.maxBudgetUsd }),
    ...(e.allowedTools && e.allowedTools.length > 0 && { allowed_tools: e.allowedTools }),
    ...(e.disallowedTools && e.disallowedTools.length > 0 && { disallowed_tools: e.disallowedTools }),
    ...(e.builtinTools && e.builtinTools.length > 0 && { builtin_tools: e.builtinTools }),
  };
}
//@ chunk-e6aww6q8.js:1961200-1961357 layout
function deferredFirstPrompt(e, n) {
  let r = e.find((s) => s.data.type === "user")?.data.uuid;
  return n !== null && typeof r === "string" ? { content: n, uuid: r, followsPermissionMode: !0 } : void 0;
}
//@ chunk-e6aww6q8.js:1961357-1961522 layout
function builtinToolsFirstPrompt(e, n) {
  let r = typeof n === "string" ? n !== "" : n !== null && n.length > 0;
  return (e.builtinTools?.length ?? 0) > 0 && r && n
    ? { content: n, uuid: e.initialMessageUuid ?? randomUUID_23() }
    : void 0;
}
//@ chunk-e6aww6q8.js:1961522-1962589 layout
async function createRemoteSession(e) {
  let {
    options: options,
    sessionId: sessionId,
    held: held,
    createEndpoint: createEndpoint,
    signal: signal,
    bound: bound,
    pool: pool,
  } = e;
  if ((options.builtinTools ?? []).length === 0) return { ok: !0, withheld: void 0 };
  if (inn(e.responseData))
    return (
      logBuiltinToolsCreate("earlier_session", pool),
      options.onCreateFail?.(
        duplicateSessionMessage({ sessionUrl: getRemoteSessionUrl(sessionId), promptHeld: held !== void 0 }),
        "builtin_tools_earlier_session",
        { endpoint: createEndpoint, sessionArchived: !1 },
      ),
      { ok: !1 }
    );
  let G = async () => ({
    archived: await archiveRemoteSession(sessionId),
    sessionUrl: getRemoteSessionUrl(sessionId),
  });
  if (held === void 0) return (logBuiltinToolsCreate("created", pool), { ok: !0, withheld: void 0 });
  if (options.deferInitialMessage === !0)
    return (
      logBuiltinToolsCreate("created", pool),
      {
        ok: !0,
        withheld: {
          ...held,
          ...((bound || e.firstPromptDeferred) && { followsPermissionMode: !0 }),
          ...(!e.followsUploads && !e.firstPromptDeferred && { heldOnlyForToolsCheck: !0 }),
        },
      }
    );
  if (signal.aborted) throw (await G(), new AbortError_2());
  let q = await raceWithAbortSignal(
      sendEventToRemoteSession(sessionId, held.content, { uuid: held.uuid }),
      signal,
      () => new AbortError_2(),
    ).catch(async (Se) => {
      throw (await G(), Se);
    }),
    Z = classifyPromptSendResult(q);
  if (Z.kind !== "sent") {
    let Se = await G();
    if (signal.aborted) throw new AbortError_2();
    return (
      logBuiltinToolsCreate(`prompt_${Z.kind}`, pool),
      options.onCreateFail?.(archiveCloudSession(Z, Se), "first_prompt_not_sent", {
        endpoint: createEndpoint,
        sessionArchived: Se.archived,
      }),
      { ok: !1 }
    );
  }
  return (logBuiltinToolsCreate("created", pool), { ok: !0, withheld: void 0 });
}
/**
 * 远程会话带内置工具时检查设备绑定前提（cnn）：不满足则记录结果、调用 onCreateFail 并返回 true（终止创建）。
 */
//@ chunk-e6aww6q8.js:1962589-1962818 layout
function refuseBuiltinToolsCreate(e, n) {
  let r =
    (e.builtinTools?.length ?? 0) > 0
      ? unsupportedEnvironmentOutcome(n, e.deviceBinding?.abandonsUnbound === !0)
      : null;
  if (r === null) return !1;
  return (
    logBuiltinToolsCreate(r.outcome, n === "self_hosted_pool"),
    e.onCreateFail?.(r.message, `builtin_tools_${r.outcome}`),
    !0
  );
}
//@ chunk-e6aww6q8.js:1962818-1962944 layout
function buildRenameSessionRequest(e) {
  return {
    type: "control_request",
    request_id: `rename-session-${randomUUID_23()}`,
    request: { subtype: "rename_session", title: e },
  };
}
/**
 * 绑定设备的远程会话创建后，用设备事件签名器发送 rename_session 控制请求固定标题，记 tengu_device_bind_title_latched。
 */
//@ chunk-e6aww6q8.js:1962944-1963280 layout
async function latchBoundSessionTitle(e, n, r, s, h) {
  let y =
      r === void 0
        ? void 0
        : import("./chunk-pesgm5d3.js").then(
            ({ deviceEventSignerFor: deviceEventSignerFor }) => deviceEventSignerFor(r, s, h),
            reportSignerLoadFailure,
          ),
    S = await sendControlRequestToRemoteSession(e, buildRenameSessionRequest(n), { eventSigner: y }).catch(
      (w) => ({ ok: !1, reason: errorMessage(w) }),
    );
  if ((logEvent("tengu_device_bind_title_latched", { success: S.ok }), !S.ok))
    logForDebugging(`[deviceBind] rename_session after bound create failed: ${S.reason}`);
}
//@ chunk-e6aww6q8.js:1963280-1963434 layout
function extractTextContent(e) {
  if (typeof e === "string") return e;
  if (!e) return "";
  return e
    .filter((n) => n.type === "text" && typeof n.text === "string")
    .map((n) => n.text)
    .join(" ");
}
//@ chunk-e6aww6q8.js:1963434-1963685 layout
async function isDriftingTwilightEnabled() {
  try {
    if (!i9o) return await checkGate_CACHED_OR_BLOCKING(TENGU_DRIFTING_TWILIGHT);
    let e = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_DRIFTING_TWILIGHT, !0);
    if (e.source !== "fallback") return e.value !== !1;
    return (await getDynamicConfig_BLOCKS_ON_INIT(TENGU_DRIFTING_TWILIGHT, !0)) !== !1;
  } catch (error) {
    return (
      logForDebugging(
        `[teleportToRemote] reading ${TENGU_DRIFTING_TWILIGHT} threw ${toError(error).name}: using the in-code default`,
      ),
      i9o
    );
  }
}
//@ chunk-e6aww6q8.js:1963685-1963707 facade-exports
function launchReadsOnlyTags() {
  return;
}
//@ chunk-e6aww6q8.js:1963707-1964119 layout
async function prepareDeviceBinding(e, n, r, s, h, y, S, w) {
  if (!e) return;
  if (n !== "v1alpha2") return skipDeviceBinding("endpoint");
  if (r && isCcpoolId(r)) return skipDeviceBinding("pool");
  if (s === "byoc" || s === "bridge") return skipDeviceBinding("environment");
  if (h) return skipDeviceBinding("correlation");
  if (w) return skipDeviceBinding("profile");
  let { prepareDeviceBinder: prepareDeviceBinder } = await import("./chunk-f13hjmxp.js");
  return prepareDeviceBinder({
    orgUuid: e.orgUuid,
    accountUuid: e.accountUuid,
    credentials: y,
    confirmReenroll: e.confirmReenroll,
    isEnabled: () => S,
  });
}
//@ chunk-e6aww6q8.js:1964119-1964192 layout
function skipDeviceBinding(e) {
  return (logEvent("tengu_device_bind_skipped", { reason: fromEnum(e) }), err_2(e));
}
//@ chunk-e6aww6q8.js:1964192-1964431 layout
function reportDeviceBindOutcome(e, n, r, s) {
  if (!e || !n) return;
  if (n.ok) e.onBound?.(n.value);
  else if ((e.onUnbound?.(n.error), classifyDeviceBindingBlocker(n.error)))
    import("./chunk-wbmm3v80.js").then(
      ({
        rememberUnboundCreate: rememberUnboundCreate,
        productionUnboundCreatesDeps: productionUnboundCreatesDeps,
      }) => rememberUnboundCreate(r, n.error, productionUnboundCreatesDeps(s)),
      () => {
        return;
      },
    );
}
//@ chunk-e6aww6q8.js:1964431-1964480 layout
function onr(e) {
  return e === 400 || e === 403 || e === 404;
}
//@ chunk-e6aww6q8.js:1964480-1964655 layout
var DEVICE_BIND_REFUSAL_REASONS = [
  "bind_attestation_stale",
  "bound_session_unattested_write",
  "untrusted_device",
  "target_device_unsupported",
  "target_device_requires_account",
  "invalid_target_device_id",
];
//@ chunk-e6aww6q8.js:1964655-1964694 layout
function isDeviceBindRefusalReason(e) {
  return DEVICE_BIND_REFUSAL_REASONS.includes(e);
}
//@ chunk-e6aww6q8.js:1964694-1964847 layout
function getDeviceBindRefusal(e) {
  let n = e?.error,
    filtered = [n?.resource, n?.reason].filter((s) => typeof s === "string" && s.length > 0);
  if (filtered.length === 0) return;
  return filtered.find(isDeviceBindRefusalReason) ?? "other";
}
//@ chunk-e6aww6q8.js:1964847-1964950 layout
function deviceBindFailureKind(e, n) {
  if (n !== void 0 && n !== "other") return n;
  return e === 404 ? "device_unknown" : "create_refused";
}
//@ chunk-e6aww6q8.js:1964950-1965052 layout
function getBoundDeviceUuid(e) {
  let r = e?.session?.bound_device_uuid;
  return typeof r === "string" ? r.toLowerCase() : void 0;
}
/**
 * 带设备绑定创建远程会话：未准备好或签名失败时按普通方式 POST；否则记丢弃的环境变量/事件、决定是否提升安全级别与推迟首条提示、
 * 准备 repositories_trusted，再交给 postBoundCreate 发送。返回 {response, bind, attested, firstPromptDeferred}。
 */
//@ chunk-e6aww6q8.js:1965052-1965967 layout
async function createWithDeviceBinding(request) {
  let {
    prepared: prepared,
    buildBody: buildBody,
    drops: drops,
    callerSendsFirstPrompt: callerSendsFirstPrompt,
    post: post,
  } = request;
  if (!prepared?.ok)
    return { response: await post(buildBody(void 0)), bind: prepared, attested: !1, firstPromptDeferred: !1 };
  let binder = prepared.value,
    attestation = await binder.sign();
  if (!attestation)
    return {
      response: await post(buildBody(void 0)),
      bind: err_2("sign"),
      attested: !1,
      firstPromptDeferred: !1,
    };
  logEvent("tengu_device_bind_prepared", {
    dropped_env_vars: drops.envVars,
    dropped_events: drops.events.length,
  });
  let L = [...(drops.envVars ? ["environment_variables"] : []), ...drops.events];
  if (L.length > 0) logForDebugging(`[deviceBind] bound create dropped ${L.join(", ")}`);
  let securityAsk = await planTrustedDeviceProof(),
    deferFirstPrompt = callerSendsFirstPrompt && sti(securityAsk);
  if (deferFirstPrompt)
    logForDebugging(
      "[deviceBind] bound create leaves the first prompt out: this client sends it signed once the permission mode it pushes has been stored",
    );
  let repoTrust = await planTrustedRepositoriesHeader(request.attaches);
  if (repoTrust.kind === "not_sent")
    logForDebugging(`[deviceBind] bound create goes without repositories_trusted (${repoTrust.why})`);
  return postBoundCreate(request, {
    ask: securityAsk,
    trust: repoTrust,
    firstPromptDeferred: deferFirstPrompt,
    attestation: attestation,
    held: binder.held,
    binder: binder,
  });
}
/**
 * 发送带 repositories_trusted 的创建请求；4xx（非可重试）时记录拒绝原因并去掉该字段重发。
 */
//@ chunk-e6aww6q8.js:1965967-1966377 layout
async function postWithRepoTrustRetry(post, buildBody, proofHeaders, trust, refusalOut) {
  if (trust.kind !== "send" || refusalOut.refusal !== void 0) return post(buildBody(), proofHeaders);
  let y = await post(buildBody(!0), { ...proofHeaders, ...trust.proofHeaders });
  if (y.status < 400 || y.status >= 500 || kB(y.data)) return y;
  let S = requestRepositoriesTrusted(y.data);
  if (S === "unnamed" && proofHeaders !== void 0 && requestSecurityTier(y.data) !== "refused") return y;
  return (
    (refusalOut.refusal = S),
    logForDebugging(
      `[deviceBind] the create that carried repositories_trusted got ${y.status} (${S}); repeating it without the field`,
    ),
    post(buildBody(), proofHeaders)
  );
}
/**
 * 发送设备绑定的创建请求：可选种子签封（TENGU_BUZZING_RIVER），请求提升安全级别被 4xx 拒绝时去掉 ask 重发；成功后记安全级别与仓库信任结果，
 * 并核对返回的绑定设备 uuid 是否与签名设备一致（不一致或失败时尝试重新注册）。
 */
//@ chunk-e6aww6q8.js:1966377-1968820 layout
async function postBoundCreate({ buildBody: buildBody, post: post }, bindState) {
  let {
      ask: ask,
      trust: trust,
      firstPromptDeferred: firstPromptDeferred,
      attestation: attestation,
      held: held,
      binder: binder,
    } = bindState,
    sealBody =
      held !== void 0 && readFlagWithOverride(TENGU_BUZZING_RIVER, { safe: !1 })
        ? await import("./chunk-j2e9tjav.js").then(
            (Ae) =>
              Ae.createSeedSealer({
                attestation: attestation,
                key: held.key,
                sample: buildBody(attestation, void 0, firstPromptDeferred),
              }),
            () => {
              logFeatureSad("create_seed_signature", "module_load_failed");
              return;
            },
          )
        : void 0,
    q = {},
    response = await postWithRepoTrustRetry(
      post,
      (Ae) => {
        let Ie = buildBody(attestation, ask.kind === "ask" ? !0 : void 0, firstPromptDeferred, Ae);
        return sealBody?.(Ie) ?? Ie;
      },
      ask.kind === "ask" ? ask.proofHeaders : void 0,
      trust,
      q,
    ),
    Se;
  if (ask.kind === "ask" && response.status >= 400 && response.status < 500 && !kB(response.data))
    ((Se = requestSecurityTier(response.data)),
      logForDebugging(
        `[deviceBind] the create that asked for the elevated tier got ${response.status} (${Se}); repeating the bound create without the ask`,
      ),
      (response = await postWithRepoTrustRetry(
        post,
        (Ae) => {
          let Ie = buildBody(attestation, void 0, firstPromptDeferred, Ae);
          return sealBody?.(Ie) ?? Ie;
        },
        void 0,
        trust,
        q,
      )));
  if (response.status === 200 || response.status === 201) {
    if (ask.kind === "no_token") zqo("skipped_no_token");
    else if (ask.kind === "ask") zqo(Se ?? (iti(response.data) === "elevated" ? "honored" : "not_honored"));
    if (trust.kind === "not_sent") logTrustedRepositoriesOutcome(trust);
    else if (trust.kind === "send") {
      let Ae =
        q.refusal === void 0
          ? { kind: "sent", covers: trust.covers }
          : { kind: "refused_then_retried", covers: trust.covers, refusal: q.refusal };
      (logTrustedRepositoriesOutcome(Ae),
        logForDebugging(
          `[deviceBind] repositories_trusted on the create that made the session: ${Ae.kind} (covers the ${trust.covers})`,
        ));
    }
    if (getBoundDeviceUuid(response.data) === attestation.deviceUUID.toLowerCase())
      return (
        logFeatureOk("device_bind_session"),
        {
          response: response,
          bind: ok_2(attestation.deviceUUID),
          ...(held !== void 0 && { held: held }),
          attested: !0,
          firstPromptDeferred: firstPromptDeferred,
        }
      );
    return (
      logEvent("tengu_device_bind_failed", {
        phase: lit_2("create"),
        status: response.status,
        reason: lit_2("silent_drop"),
      }),
      logFeatureSad("device_bind_session", "silent_drop"),
      logForDebugging(
        "[deviceBind] create returned 200 but the session is not bound to this device; continuing unbound",
      ),
      {
        response: response,
        bind: err_2("silent_drop"),
        attested: !0,
        firstPromptDeferred: firstPromptDeferred,
      }
    );
  }
  if (!onr(response.status) || kB(response.data))
    return { response: response, attested: !0, firstPromptDeferred: firstPromptDeferred };
  let ke = getDeviceBindRefusal(response.data);
  (logEvent("tengu_device_bind_failed", {
    phase: lit_2("create"),
    status: response.status,
    ...(ke !== void 0 && { reason: fromEnum(ke) }),
  }),
    logForDebugging(`[deviceBind] create refused the binding (${response.status}${ke ? ` ${ke}` : ""})`));
  let we = response.status === 404 && binder ? await reregisterDevice(binder) : void 0;
  if (we?.ok)
    return (
      logForDebugging("[deviceBind] registered again as a different device row; repeating the bound create"),
      postBoundCreate(
        { buildBody: buildBody, post: post },
        { ask: ask, trust: trust, firstPromptDeferred: firstPromptDeferred, ...we.value },
      )
    );
  logForDebugging("[deviceBind] retrying the create unbound");
  let Ee = await post(buildBody(void 0));
  if (Ee.status === 200 || Ee.status === 201)
    logFeatureSad("device_bind_session", we?.error ?? ke ?? "create_refused");
  return {
    response: Ee,
    bind: err_2(we?.error ?? deviceBindFailureKind(response.status, ke)),
    attested: !1,
    firstPromptDeferred: !1,
  };
}
/**
 * 设备绑定被拒后重新注册设备：得到同一设备行时放弃；否则签名生成证明，返回证明与持有状态。
 */
//@ chunk-e6aww6q8.js:1968820-1969140 layout
async function reregisterDevice(e) {
  let reregister = await e.reregister();
  if (!reregister.ok) return reregister;
  if (reregister.value.deviceUUID === e.deviceUUID)
    return (
      logForDebugging(
        "[deviceBind] registering again returned the same device row the create refused; nothing new to try",
      ),
      err_2(void 0)
    );
  let sign = await reregister.value.sign();
  return sign === void 0 ? err_2("sign") : ok_2({ attestation: sign, held: reregister.value.held });
}
/**
 * 创建远程会话时动态加载并运行主目录种子（runHomeSeed，trigger=create），规划失败时视为 none；出错记录日志并返回 undefined。
 */
//@ chunk-e6aww6q8.js:1969140-1969577 layout
async function runCreateHomeSeed({
  sessionId: sessionId,
  planning: planning,
  boundDeviceUuid: boundDeviceUuid,
  held: held,
  launchConsent: launchConsent,
  signal: signal,
  credentials: credentials,
  storageV5: storageV5,
}) {
  try {
    let { runHomeSeed: runHomeSeed } = await import("./chunk-6qze3ysr.js");
    return runHomeSeed({
      sessionId: sessionId,
      plan: planning.then((G) => G ?? { kind: "none", reason: "failed" }),
      bound: boundDeviceUuid !== void 0,
      boundDeviceUuid: boundDeviceUuid,
      ...(held !== void 0 && { held: held }),
      trigger: "create",
      launchConsent: launchConsent,
      isProjectStillSynced: () => O0e(!0),
      signal: signal,
      credentials: credentials,
      storageV5: storageV5,
    });
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:1969577-1969671 layout
function gnr({ branch: branch, commit: commit }, r) {
  return branch !== null ? `${r}/${wh(branch)}` : `commit ${commit.slice(0, 12)}`;
}
//@ chunk-e6aww6q8.js:1969671-1969698 layout
function ynr(e, n) {
  return {};
}
/**
 * 打包上传前解析 Read 规则与沙箱设置，得出哪些文件内容需要扣留（withholdFor）、哪些永不读取（neverReadFor）；规则不可读时提示并只上传已提交内容。
 */
//@ chunk-e6aww6q8.js:1969698-1970617 layout
function resolveBundleReadRules(withholding, warn, countFromOutsideRoot) {
  let s = withholding ? collectLaunchRules() : null,
    h = s !== null && countFromOutsideRoot,
    {
      withholdFor: withholdFor,
      neverReadFor: neverReadFor,
      rulesUnreadable: rulesUnreadable,
      unreadableSettingsFiles: unreadableSettingsFiles,
    } = s
      ? classifySyncedFileSensitivity(resolveUploadFilterRules({ launchRules: s }), {
          isCredentialListCountedFromOutsideRoot: h,
          onLaunchPlaceUnknown: onceExport(() =>
            warn?.(
              "The folder Claude Code was started in cannot be reached, so uncommitted file contents stay on this machine. Restart Claude Code inside the repository to send them.",
            ),
          ),
        })
      : launchRuleSensitivity();
  if (
    (logEvent("tengu_teleport_bundle_read_rules", {
      state: lit_2(rulesUnreadable ? "unreadable" : "applied"),
      withholding: withholding,
      ...{},
    }),
    !s)
  )
    return { neverReadFor: neverReadFor };
  if (rulesUnreadable) {
    let G = cXe(unreadableSettingsFiles),
      q =
        G === ""
          ? "A settings file has errors, so your Read rules and sandbox settings could not all be read (see /status)"
          : `Your Read rules and sandbox settings could not all be read${G}`;
    warn?.(
      `${q}: uncommitted file contents are left out of this upload; the cloud session starts from what is committed.`,
    );
  }
  return {
    withholdFor: withholdFor,
    neverReadFor: classifySyncedFileSensitivity(s, { onlyAsLaunched: !0 }).neverReadFor,
  };
}
//@ chunk-e6aww6q8.js:1970617-1970795 layout
function launchRuleSensitivity(e) {
  try {
    return classifySyncedFileSensitivity(collectLaunchRules(), { onlyAsLaunched: !0 });
  } catch (error) {
    logError(error);
    let r = async () => () => !0;
    return { withholdFor: r, neverReadFor: r, rulesUnreadable: !0, unreadableSettingsFiles: [] };
  }
}
//@ chunk-e6aww6q8.js:1970795-1970855 layout
function wnr(e, n) {
  return { refusal: null, notRuledOutBy: void 0 };
}
//@ chunk-e6aww6q8.js:1970855-1973070 layout
async function uploadGitBundleForSession(e, n, r, s = null, h = "session") {
  let {
      createAndUploadGitBundle: createAndUploadGitBundle,
      explainPreviousCaptureRetired: explainPreviousCaptureRetired,
      handBackDecision: handBackDecision,
      previousCaptureServes: previousCaptureServes,
      unsupportedLayoutNotice: unsupportedLayoutNotice,
    } = await import("./chunk-g3ge6yrz.js"),
    q = wnr(n.cwd ?? getCwd(), h);
  if (q.refusal !== null) return q.refusal;
  let Z = { ...n, notRuledOutBy: q.notRuledOutBy },
    Se = await createAndUploadGitBundle(e, Z);
  if (
    Z.hardenForDeviceSessions === !0 ||
    Se.success ||
    Se.failReason !== "unsupported_layout" ||
    r === null ||
    Z.signal?.aborted
  )
    return Se;
  if (!previousCaptureServes())
    return (
      logEvent("tengu_ccr_bundle_upload", {
        outcome: lit_2("fallback_retired"),
        layout_kind: fromEnum(Se.layoutKind),
        github_start_obstacle: fromEnumOpt(s?.kind),
        ...(Se.gitFileKind !== void 0 && { git_file_kind: fromEnum(Se.gitFileKind) }),
      }),
      logFeatureBad("teleport_git_bundle_upload", "fallback_retired"),
      { success: !1, error: `${Se.error} ${explainPreviousCaptureRetired(s)}`, failReason: "refused" }
    );
  let ke = await handBackDecision(Z.cwd, Z.signal, Z.withholdFor);
  if (Z.signal?.aborted) {
    if (ke.kind === "proceed") await ke.pinnedIndex?.dispose();
    return Se;
  }
  if (ke.kind === "refused") {
    let Ee = !ke.indexCopied
      ? "fallback_refused_index_copy"
      : ke.gitlinks > 0
        ? "fallback_refused_gitlink"
        : ke.named > 0
          ? "fallback_refused_credential_named"
          : ke.unexamined > 0
            ? "fallback_refused_index_mode"
            : "fallback_refused_unlisted";
    return (
      logEvent("tengu_ccr_bundle_upload", {
        outcome: fromEnum(Ee),
        layout_kind: fromEnum(Se.layoutKind),
        legacy_bundle: !0,
        credential_named_wip: ke.named,
        credential_named_added: ke.added,
        refused_unexamined: ke.unexamined,
        registered_gitlinks: ke.gitlinks,
        ...(ke.indexCopyCause !== void 0 && { index_copy_cause: fromEnum(ke.indexCopyCause) }),
      }),
      logFeatureBad(
        "teleport_git_bundle_upload",
        Ee === "fallback_refused_credential_named" ? "uncommitted_credentials" : Ee,
      ),
      { success: !1, error: `${Se.error} ${ke.sentence}`, failReason: "uncommitted_credentials" }
    );
  }
  let we;
  try {
    (logEvent("tengu_ccr_bundle_upload", {
      outcome: lit_2("fallback_legacy_capture"),
      layout_kind: fromEnum(Se.layoutKind),
      ...(Se.gitFileKind !== void 0 && { git_file_kind: fromEnum(Se.gitFileKind) }),
      legacy_bundle: !0,
    }),
      r?.(unsupportedLayoutNotice(Se.layoutKind)),
      (we = await createAndUploadGitBundle(e, {
        ...Z,
        hardenForDeviceSessions: !1,
        refuseCredentialNamedInStash: !0,
        pinnedIndexFile: ke.pinnedIndex?.path,
      })));
  } finally {
    await ke.pinnedIndex?.dispose();
  }
  return !we.success && we.failReason === "uncommitted_credentials"
    ? {
        ...we,
        error: `${Se.error} ${we.error.replace(/^Not uploading this working tree: /, "It is not uploaded the previous way either (that way keeps nothing back): ")}`,
      }
    : we;
}
//@ chunk-e6aww6q8.js:1973070-1973156 layout
async function getCloudSessionAccessToken(e, n) {
  return (
    await checkAndRefreshOAuthTokenIfNeeded({ credentials: e, storageV5: n }),
    (await ensureHostSessionsBearer()) ?? getAccessTokenWithCcrFallback()
  );
}
//@ chunk-e6aww6q8.js:1973156-1973235 layout
async function Uon(e, n) {
  return (await recoverHostSessionsBearer(e, n ? "withheld" : "refused")) !== "not_held";
}
/**
 * 创建云端会话（Claude Code on the web）：检查第一方与策略 allow_remote_sessions、选择环境、打包/上传 git 状态、绑定设备，POST /v1/code/sessions 并发送初始消息与控制事件。
 */
//@ chunk-e6aww6q8.js:1973235-2009090 facade-exports = teleportToRemote (0.247)
async function teleportToRemote(options) {
  let { initialMessage: initialMessage, signal: signal } = options,
    s = options.cwd ?? getCwd(),
    h = !1,
    y = !1,
    S = [],
    w = S.length === 0 ? options.tags : [...(options.tags ?? []), ...S],
    L = options.connectedSession === void 0 ? void 0 : Promise.resolve(options.connectedSession),
    G = () => (L ??= lTt()),
    q,
    Z = () => (q ??= G().then((Zt) => Tti(Zt, void 0))),
    Se,
    ke = () => (Se ??= !1),
    we,
    Ee = () => {
      throw Error("unreachable");
    },
    Ae = async () => !1,
    Ie,
    Me = () =>
      (Ie ??= isViolinWoodEnabled()
        .catch(() => !1)
        .then(async (Zt) => Zt || (await G()))),
    We = async () => !0,
    ze = policyDeniedReason("allow_remote_sessions", "Cloud sessions", "are");
  if (ze)
    return (
      logOrgPolicyDenied("allow_remote_sessions", "cloud_session"),
      options.onCreateFail?.(ze, "policy_denied"),
      null
    );
  let lt = cloudCreateRefusal();
  if (lt !== null) return (options.onCreateFail?.(lt.message, lt.reason), null);
  if (options.builtinTools?.length === 0)
    return (
      logBuiltinToolsCreate("empty_list"),
      options.onCreateFail?.(CLOUD_LAUNCH_TOOL_ERRORS, "builtin_tools_empty"),
      null
    );
  if ((await settleStoredLoginRefusal({ isFilesDial: !0, signal: options.signal }), !isFirstPartyProvider()))
    return (
      options.onCreateFail?.(
        "Cloud sessions are only available on the first-party Anthropic API provider.",
        "not_first_party",
      ),
      null
    );
  let {
      deletedHereNotice: deletedHereNotice,
      leftOutNotice: leftOutNotice,
      probeRepoBundleSize: probeRepoBundleSize,
      repositorySetBundleSwitches: repositorySetBundleSwitches,
    } = await import("./chunk-g3ge6yrz.js"),
    yt = null,
    gt = null,
    At = [],
    It = !1,
    Yt = null,
    qt = !1;
  try {
    options.onProgress?.({ kind: "checking", ...(findGitRoot(s) === null && { folder: !0 }) });
    let Zt = !1,
      rn = options.poolId ?? options.chosenEnvironment?.environment_id,
      pn =
        rn !== void 0
          ? { id: rn, source: void 0, ignoredUntrustedPool: void 0 }
          : Zt
            ? { id: void 0, source: void 0, ignoredUntrustedPool: void 0 }
            : getEnvironmentSelectionInfo(),
      no = null,
      hn = null,
      ho = isCcpoolId(options.environmentId ? options.environmentId : pn.id),
      Kn =
        (Object.keys(options.environmentVariables ?? {}).length === 0 && (await G())) ||
        ((options.source === "ultrareview" || options.source === "ultraplan") &&
          (await checkGate_CACHED_OR_BLOCKING(TENGU_WOVEN_HARBOR))) ||
        (ho && (await isDriftingTwilightEnabled()))
          ? "v1alpha2"
          : "v1";
    if (options.sessionGroupingId && Kn !== "v1alpha2")
      return (
        options.onCreateFail?.(
          "--project requires the new session-create endpoint, which isn't enabled for your account yet \u2014 no session was created.",
          "project_not_enabled",
          { endpoint: Kn },
        ),
        null
      );
    if (options.agentId && Kn !== "v1alpha2")
      return (
        options.onCreateFail?.(
          "Dispatching into a Kindling project requires the new session-create endpoint, which isn't enabled for your account yet \u2014 no session was created.",
          "agent_not_enabled",
          { endpoint: Kn },
        ),
        null
      );
    if (options.deviceBinding && options.sessionGroupingId)
      return (
        options.onCreateFail?.(
          "--project cannot be combined with a device-bound session yet \u2014 no session was created.",
          "device_bind_project_unsupported",
          { endpoint: Kn },
        ),
        null
      );
    if (options.deviceBinding && options.agentId)
      return (
        options.onCreateFail?.(
          "An agent-owned session cannot be combined with a device-bound session yet \u2014 no session was created.",
          "device_bind_agent_unsupported",
          { endpoint: Kn },
        ),
        null
      );
    if (
      options.deviceBinding &&
      options.deferInitialMessage !== !0 &&
      builtinToolsFirstPrompt(options, initialMessage) !== void 0
    )
      return (
        logBuiltinToolsCreate("bound_prompt_not_deferred"),
        options.onCreateFail?.(rnn, "device_bind_tools_prompt_unsupported", { endpoint: Kn }),
        null
      );
    let Xn,
      fo,
      To = isConsoleProfileSessionsCredential();
    if (To) {
      try {
        Xn = await resolveConsoleProfileBearer({
          credentials: options.credentials,
          signIn: options.personAskedForSession === !0,
        });
      } catch (error) {
        if (!(error instanceof ConsoleProfileCloudSessionsError)) throw error;
        return (
          logForDebugging(error.message, { level: "error" }),
          options.onCreateFail?.(error.message, "console_profile_refused"),
          null
        );
      }
      fo = Xn;
    } else
      ((Xn = await getCloudSessionAccessToken(options.credentials, options.storageV5)),
        (fo = getAccessTokenWithCcrFallback()));
    let bo = !To;
    if (!Xn || !fo) {
      let ma =
        "Cloud sessions require a claude.ai login. Run /login to authenticate." +
        (env.CLAUDE_CODE_REMOTE
          ? ` (in CCR: env=${env.CLAUDE_CODE_OAUTH_TOKEN ? "set" : "unset"}, fd=${env.CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR ? "set" : "unset"})`
          : "");
      return (logError(Error(ma)), options.onCreateFail?.(ma, "no_access_token"), null);
    }
    let vn = await sessionsApiOrganizationUUID(To);
    if (!vn) {
      let ma =
        "Unable to get organization UUID for cloud session creation" +
        (env.CLAUDE_CODE_REMOTE
          ? ` (in CCR: CLAUDE_CODE_ORGANIZATION_UUID=${env.CLAUDE_CODE_ORGANIZATION_UUID ? "set" : "unset"})`
          : "");
      return (logError(Error(ma)), options.onCreateFail?.(ma, "no_org_uuid"), null);
    }
    let co = { ...options.environmentVariables };
    if (
      (delete co.CLAUDE_CODE_OAUTH_TOKEN, delete co.CLAUDE_CODE_SESSIONS_OAUTH_TOKEN, options.environmentId)
    ) {
      let ma = fetchReferralEligibility_2(
        Kn,
        Xn,
        vn,
        To,
        () => getCloudSessionAccessToken(options.credentials, options.storageV5),
        Uon,
      );
      if (refuseBuiltinToolsCreate(options, void 0)) return null;
      let qd = null,
        Gd = null;
      if (options.useBundle) {
        let Yc = await Me(),
          Zh = {
            oauthToken: fo,
            isStoredLogin: bo,
            sessionId: getSessionId(),
            baseUrl: getOauthConfig().BASE_API_URL,
          },
          vp = await uploadGitBundleForSession(
            Zh,
            {
              signal: signal,
              baseRef: options.bundleBaseRef,
              forceScope: options.bundleForceScope,
              currentBranchOnly: Yc,
              ...(Yc && { hardenForDeviceSessions: !0, startsInProject: await We() }),
              ...resolveBundleReadRules(Yc, options.onBundleNotice, Yc && (await Ae())),
            },
            options.onBundleNotice,
            null,
            options.source === "ultrareview" ? "review" : "session",
          );
        if (vp.success) Yt = { fileId: vp.fileId, config: Zh };
        if (signal.aborted) throw new AbortError_2();
        if (!vp.success) {
          if (
            (logForDebugging(`Bundle upload failed: ${vp.error}`, { level: "error" }),
            vp.failReason !== "too_large")
          )
            options.onBundleFail?.(vp.error, "bundle");
          return null;
        }
        if (((Gd = vp.fileId), vp.leftOut?.length))
          options.onBundleNotice?.(leftOutNotice(vp.leftOut, { readRules: Yc }));
        if (vp.deletedHere?.length) options.onBundleNotice?.(deletedHereNotice(vp.deletedHere));
        logEvent("tengu_teleport_bundle_mode", {
          size_bytes: vp.bundleSizeBytes,
          scope: fromEnum(vp.scope),
          has_wip: vp.hasWip,
          current_branch_only: Yc,
          reason: lit_2("explicit_env_bundle"),
        });
      } else if (options.sourceUrl)
        qd = { type: "git_repository", url: options.sourceUrl, revision: options.branchName };
      else if (!options.agentId) {
        let orgUUID = await detectCurrentRepositoryWithHost();
        if (orgUUID && !isNestedGitLabProject(orgUUID))
          qd = {
            type: "git_repository",
            url: `https://${orgUUID.host}/${orgUUID.owner}/${orgUUID.name}`,
            revision: options.branchName,
          };
      }
      let vu = options.title || options.description || Jer,
        sc = buildInitialControlEvents({
          initialMessage: initialMessage,
          initialMessageUuid: options.initialMessageUuid,
          permissionMode: options.permissionMode,
          proactivityLevel: options.proactivityLevel,
          ultraplan: options.ultraplan,
          title: options.title,
          thinking: options.thinking,
        }),
        fc = await prepareDeviceBinding(
          options.deviceBinding,
          Kn,
          options.environmentId,
          void 0,
          options.correlationId,
          options.credentials,
          G(),
          To,
        ),
        h_ = environmentSelector(options.environmentId),
        Rh = (Yc, Zh, vp) =>
          Kn === "v1alpha2"
            ? buildSessionCreateBody({
                title: vu,
                worker: h_,
                events: sc,
                sources: qd ? [qd] : [],
                outcomes: [],
                model: options.model,
                seedBundleFileId: Gd ?? void 0,
                environmentVariables: co,
                appendSystemPrompt: options.appendSystemPrompt,
                customSystemPrompt: options.customSystemPrompt,
                appendSubagentSystemPrompt: options.appendSubagentSystemPrompt,
                fallbackModel: options.fallbackModel,
                maxTurns: options.maxTurns,
                maxBudgetUsd: options.maxBudgetUsd,
                allowedTools: options.allowedTools,
                disallowedTools: options.disallowedTools,
                outputSchema: options.outputSchema,
                tags: w,
                sessionGroupingId: options.sessionGroupingId,
                agentId: options.agentId,
                correlationId: options.correlationId,
                deviceBinding: Yc,
                requestElevatedTier: Zh,
                deferFirstPrompt: vp,
              })
            : {
                title: vu,
                events: sc,
                session_context: {
                  sources: qd ? [qd] : [],
                  ...(Gd && { seed_bundle_file_id: Gd }),
                  outcomes: [],
                  environment_variables: co,
                  ...(options.model && { model: options.model }),
                  ...(options.appendSystemPrompt && { append_system_prompt: options.appendSystemPrompt }),
                  ...buildRemoteSessionConfig(options),
                  ...(options.outputSchema && { output_schema: options.outputSchema }),
                  ...(options.correlationId && { correlation_id: options.correlationId }),
                },
                ...h_,
                ...(w && { tags: w }),
              };
      if (
        (logForDebugging(
          `[teleportToRemote] explicit env ${options.environmentId}, ${Object.keys(co).length} env vars, ${Gd ? "source=bundle" : `source=${qd?.url ?? "none"}@${options.branchName ?? "default"}`}`,
        ),
        signal.aborted)
      )
        throw new AbortError_2();
      let {
        response: response,
        bind: Ah,
        held: held,
        attested: attested,
        firstPromptDeferred: firstPromptDeferred,
      } = await createWithDeviceBinding({
        prepared: fc,
        buildBody: Rh,
        drops: summarizeSessionCreateBody({ events: sc, environmentVariables: co }),
        callerSendsFirstPrompt: options.deferInitialMessage === !0,
        attaches: { anything: qd !== null || Gd !== null, launchCheckout: null },
        post: (Yc, Zh) =>
          ensureTrustedDevice(ma, Zh, (vp) =>
            Dt.post(ma.url, Yc, { headers: vp, signal: signal, validateStatus: ($T) => $T < 500 }),
          ),
      });
      if (((qt = isSuccessStatus(response.status)), response.status !== 200 && response.status !== 201)) {
        let url = `CreateSession ${response.status}: ${jsonStringify(response.data)}`,
          Zh = response.data;
        if ([401, 403, 429].includes(response.status) || Zh?.error?.reason === "github_repo_access_denied")
          logForDebugging(`[teleportToRemote] ${url}`, { level: "error" });
        else {
          let $T = (OE) => (OE && /^[a-z][a-z0-9_]*$/.test(OE) ? OE : void 0);
          logError(Error(`[type=${$T(Zh?.error?.type)},reason=${$T(Zh?.error?.reason)}] ${url}`));
        }
        let vp = cloudErrorMessage(response, Zh?.error?.message);
        return (
          options.onCreateFail?.(
            (options.sessionGroupingId && projectNotFoundMessage(options.sessionGroupingId, Zh?.error)) ||
              (await explainUntrustedDeviceRefusal(response, ma)) ||
              loginRejectedMessage(response.status, vp.message) ||
              vp.message ||
              vp.statusLine,
            "create_request_failed",
            {
              status: response.status,
              serverType: normalizeApiErrorType(Zh?.error?.type),
              serverReason: normalizeCreateSessionError(Zh?.error?.reason),
              endpoint: Kn,
              messageHidden: vp.messageHidden,
            },
          ),
          null
        );
      }
      let _S = sessionIdFromCreateResponse(Kn, response.data);
      if (!_S.ok) {
        let Yc = CREATE_SESSION_FAILURES[_S.error];
        return (
          logError(
            withTelemetryMessage(Error(`${Yc.logLead}: ${jsonStringify(response.data)}`), Yc.telemetry),
          ),
          options.onCreateFail?.(Yc.message, Yc.reason),
          null
        );
      }
      let bS = _S.value;
      if (
        (options.onProgress?.({ kind: "session_exists", sessionId: bS.id }),
        logCloudSessionLink(
          bS.id,
          options.source,
          { project: !1, global: !1 },
          { endpoint: Kn, grouped: options.sessionGroupingId != null },
          options.storageV5,
        ),
        reportDeviceBindOutcome(options.deviceBinding, Ah, bS.id, options.storageV5),
        attested && options.title)
      )
        latchBoundSessionTitle(
          bS.id,
          options.title,
          Ah?.ok ? Ah.value : void 0,
          options.credentials,
          Ah?.ok ? held : void 0,
        );
      let nk = firstPromptDeferred ? deferredFirstPrompt(sc, initialMessage) : void 0;
      return {
        id: bS.id,
        title: sessionTitleOf(bS, vu),
        ...(nk && { withheldInitialMessage: nk }),
        ...(options.maxTurns !== void 0 && { maxTurnsConfirmed: acceptsMaxTurns(Kn, bS, options.maxTurns) }),
      };
    }
    if (pn.ignoredUntrustedPool)
      logForDebugging(
        `Ignoring self-hosted environment default ${pn.ignoredUntrustedPool.id} from ${pn.ignoredUntrustedPool.source} \u2014 environment placement is only honoured from user/policy/flag settings. Run /remote-env to set your environment.`,
        { level: "warn" },
      );
    let id = pn.id,
      ko = isCcpoolId(id);
    if (ko && options.poolId === void 0)
      fetchSelfHostedPools(Xn, options.credentials).then(
        (ma) => {
          if (ma.length > 0 && !ma.some((qd) => qd.pool_id === id))
            logForDebugging(
              `Configured default environment ${id} is not in the org's environment list \u2014 sending it anyway; server validates at CreateSession`,
              { level: "warn" },
            );
        },
        (ma) => logForDebugging(`fetchSelfHostedPools rejected: ${errorMessage(ma)}`, { level: "warn" }),
      );
    let un = options.description || extractTextContent(initialMessage),
      ao = !un && (await G()),
      $o,
      yo = () =>
        ($o ??=
          options.title && options.reuseOutcomeBranch
            ? Promise.resolve({ title: options.title, branchName: options.reuseOutcomeBranch })
            : ao
              ? Promise.resolve(DEFAULT_BACKGROUND_TASK_TITLE)
              : checkSessionTitlePolicyTaint(
                  un || DEFAULT_BACKGROUND_TASK_TITLE.title,
                  signal,
                  options.credentials,
                ));
    if ((options.builtinTools?.length ?? 0) === 0) yo();
    logForDebugging("[teleport] phase: env-select");
    let Ho = ko
      ? []
      : options.chosenEnvironment !== void 0
        ? [options.chosenEnvironment]
        : await fetchEnvironments(Xn, options.storageV5, options.credentials);
    if (signal.aborted) throw new AbortError_2();
    if (!ko && Ho.length === 0 && !Zt)
      try {
        ((Ho = [await createDefaultCloudEnvironment(void 0, signal, Xn)]),
          logForDebugging("[teleportToRemote] Auto-created default cloud env"));
      } catch (error) {
        if (signal.aborted) throw new AbortError_2();
        return (
          logForDebugging(`[teleportToRemote] auto-create env failed: ${errorMessage(error)}`, {
            level: "warn",
          }),
          options.onBundleFail?.(
            `Could not create a cloud environment. Set one up at ${ENV_SETUP_ONBOARDING_URL}`,
            "env_create",
          ),
          null
        );
      }
    logForDebugging(
      `Available environments: ${Ho.map((ma) => `${ma.environment_id} (${ma.name}, ${ma.kind})`).join(", ")}`,
    );
    let rr = id,
      br = rr ? Ho.find((ma) => ma.environment_id === rr) : void 0,
      Hr = tPe(Ho, (ma) => ma.kind === "anthropic_cloud");
    if (!ko && options.useDefaultEnvironment && !br && !Hr) {
      if (
        (logForDebugging(
          `No configured default or anthropic_cloud in env list (${Ho.length} envs); retrying fetchEnvironments`,
        ),
        (Ho = await fetchEnvironments(Xn, options.storageV5, options.credentials)),
        signal.aborted)
      )
        throw new AbortError_2();
      if (
        ((br = rr ? Ho.find((ma) => ma.environment_id === rr) : void 0),
        (Hr = tPe(Ho, (ma) => ma.kind === "anthropic_cloud")),
        !br && !Hr)
      ) {
        let joined = Ho.map((Gd) => `"${xon(Gd.name, Gd.environment_id)}" (${vPt(Gd.kind)})`).join(", "),
          qd = `No configured default or anthropic_cloud environment available after retry (got: ${joined.length > 1500 ? `${Ho.length} environments` : joined}${rr ? `; configured default ${vPt(rr)} not in list` : ""})`;
        return (
          logForDebugging(
            `[teleportToRemote] ${qd}. Silent byoc fallthrough would launch into a dead env \u2014 fail fast instead. Environments as received (name, id, kind): ${jsonStringify(Ho.map((Gd) => [Gd.name, Gd.environment_id, Gd.kind]))}`,
            { level: "error" },
          ),
          options.onCreateFail?.(qd, "no_default_env"),
          null
        );
      }
    }
    let _r = ko ? void 0 : br || void 0 || Hr || Ho.find((ma) => ma.kind !== "bridge") || Ho[0];
    if (!_r && !ko)
      return (
        logError(Error("No environments available for session creation")),
        options.onCreateFail?.("No environments available for session creation", "no_environments"),
        null
      );
    if (rr && _r) {
      let ma = _r.environment_id === rr;
      logForDebugging(
        ma
          ? `Using the configured default environment: ${rr}`
          : `Configured default environment ${rr} not found, using the fallback`,
      );
    }
    let Cr = ko ? rr : _r.environment_id;
    if (
      (logForDebugging(
        _r ? `Selected environment: ${Cr} (${_r.name}, ${_r.kind})` : `Selected environment: ${Cr}`,
      ),
      refuseBuiltinToolsCreate(options, options.agentId ? void 0 : ko ? "self_hosted_pool" : _r?.kind))
    )
      return null;
    let Vr = xon(options.chosenEnvironment === void 0 ? _r?.name : void 0, Cr);
    yo();
    let Oo = null,
      jr = null,
      Or = null,
      Io = "all",
      gitSource = null,
      seedBundleFileId = null;
    if (options.sourceUrl)
      Oo = { type: "git_repository", url: options.sourceUrl, revision: options.branchName };
    logForDebugging("[teleport] phase: branch-detect");
    let Es = Oo || options.agentId || Zt ? null : await detectCurrentRepositoryWithHost(options.cwd),
      Nr = Es && isNestedGitLabProject(Es) ? null : Es;
    if (Es && !Nr)
      logForDebugging("[teleportToRemote] nested GitLab project \u2014 not sent as a git source");
    let Is = !1,
      gitSource_2 = null,
      as = !1,
      Vi = !1,
      gitOutcome = null,
      Wi = options.sourceUrl ? "explicit_source_url" : options.agentId ? "agent_defaults" : "no_git_at_all",
      ii = findGitRoot(s),
      wa = ko || _r?.kind === "byoc",
      hr = wa || !1,
      mi = wa || selfHostedEnvironmentKind({ environment_kind: _r?.kind }) !== null,
      Ha = options.reuseOutcomeBranch ? "--on-branch" : "--ref",
      $a = options.allowBundle && !hr && !options.agentId && env.CCR_FORCE_BUNDLE,
      nr =
        options.allowBundle &&
        !hr &&
        !options.agentId &&
        ii !== null &&
        (env.CCR_ENABLE_BUNDLE || (await checkGate_CACHED_OR_BLOCKING("tengu_ccr_bundle_seed_enabled"))),
      Ti = options.allowBundle && !hr && !options.agentId && ii !== null ? repositorySetBundleSwitches() : [];
    if (Ti.length > 0)
      options.onBundleNotice?.(
        `${Ti.join(", ")} in this repository\u2019s .claude/settings files ${Ti.length === 1 ? "is" : "are"} ignored there: how a cloud start is seeded from this machine is the machine owner\u2019s setting (shell environment or ~/.claude/settings.json), never a repository\u2019s.`,
      );
    let seedBundleFileId_2 = null,
      _i = {
        folderRoot: null,
        optedIn: !1,
        insideAnotherCheckout: !1,
        mayTakeFolder: !1,
        neverOfferedFolder: null,
        hasSaidFolderStartsEmpty: !1,
        isFolderQuestionSetAside: !1,
        cloudDrive: null,
        pathMisread: !1,
        noteForClaude: null,
      },
      { folderRoot: folderRoot, optedIn: optedIn } = _i,
      fi =
        options.staysAttached === !0 &&
        (await G()) &&
        options.forwardHomeSettings !== !1 &&
        !hr &&
        !options.agentId &&
        pwt(options.homeSettingsConsent).enabledNow() &&
        isForwardModeEffective(options.homeSettingsConsent),
      Ri = fi && !mi,
      Ja = Ri && bon(),
      Di = Ri && oN(options.homeSettingsConsent),
      yr =
        Ri && (!Di || optedIn || folderRoot !== null)
          ? import("./chunk-cx5g5sgv.js")
              .then(({ planHomeSeed: planHomeSeed }) =>
                planHomeSeed({
                  signal: signal,
                  storageV5: options.storageV5,
                  launchConsent: options.homeSettingsConsent,
                  withRunnerPack: Ja,
                }),
              )
              .catch(() => null)
          : null,
      Kr,
      Li = options.branchFromHead === !0 && options.branchName !== void 0 && options.explicitRef === void 0,
      Qs = ii !== null && (await Me()) ? await readLaunchGitLayout(ii, signal, await We()) : void 0;
    if (signal.aborted) throw new AbortError_2();
    let Hi = void 0,
      Xa = null,
      now = Date.now(),
      Bs =
        Nr && !$a && !wa && isGithubDotCom(Nr.host)
          ? (Xa ?? checkGithubAppInstalled(Nr.owner, Nr.name, signal))
          : null,
      Ca = (ma) => Bs !== null && !optedIn && ma !== "HEAD",
      tu = async (ma) => {
        if (!Nr || Bs === null) return null;
        let qd = await Bs;
        if (!qd.appInstalled || ma === qd.defaultBranch) return null;
        let min = Math.min(GITHUB_APP_CHECK_TIMEOUT_MS, GITHUB_APP_CHECK_TIMEOUT_MS - (Date.now() - now));
        if (min < MIN_RESYNC_BUDGET_MS)
          return (
            logForDebugging(
              `[teleportToRemote] GitHub not asked about branch ${ma}: only ${Math.max(0, min)} ms of the GitHub App preflight's 15 s was left`,
            ),
            null
          );
        let sc = (
          await askGithubBranchExists({
            owner: Nr.owner,
            name: Nr.name,
            branches: [ma],
            timeoutMs: min,
            signal: signal,
            credentials: options.credentials,
          })
        )(ma);
        if (sc === "no")
          logForDebugging(
            `[teleportToRemote] GitHub has no branch ${ma}: the start is looked up again without its remote-tracking ref, unless the search for a pushed commit had already failed`,
          );
        return sc;
      },
      pd =
        ii !== null && Nr && !wa && !$a && (optedIn || Li)
          ? await resolveRemote(
              ii,
              Qs === void 0 ? void 0 : await screenedGitEnvForReach(Qs, ii, signal, await We()),
            )
          : null,
      ga = 0,
      Hl = null,
      hd =
        Li && ii !== null && pd !== null
          ? async (ma) =>
              resolveStartWithGithub({
                lookUp: async ({ remoteLacksBranch: remoteLacksBranch }) => (
                  (Hl = null),
                  checkBranchPushed({
                    gitRoot: ii,
                    remoteName: pd.name,
                    branch: ma,
                    nameContaining: Nr ? !isGithubDotCom(Nr.host) : !1,
                    countAhead: !0,
                    sessionRoot: Qs === void 0 ? void 0 : ii,
                    sessionReach: Qs,
                    ...(Qs !== void 0 && { startsInProject: await We() }),
                    ...(remoteLacksBranch && { staleBranch: ma }),
                    signal: signal,
                    onSearchAmongAllRefs: (Gd) => {
                      ga += Gd;
                    },
                    onCreation: (Gd) => {
                      Hl = Gd;
                    },
                  })
                ),
                ask: Ca(ma) ? () => tu(ma) : null,
              })
          : null,
      Sd = (ma) =>
        ma.kind === "pushed_ancestor" &&
        (!Nr || isGithubDotCom(Nr.host) || ma.branch !== null || ma.containedIn !== void 0),
      Ld = Li && options.branchName !== void 0 && !optedIn ? mon(options.branchName) : options.branchName,
      vs =
        hd !== null && ii !== null && options.branchName !== void 0 && !optedIn
          ? await pon(ii, options.branchName)
          : Ld,
      now_2 = Date.now(),
      gd = hd !== null && vs !== void 0 && vs !== Ld ? await hd(vs) : null,
      Su = gd?.start ?? null,
      Eu = Su !== null && (Su.kind === "on_remote" || Sd(Su)),
      Uc = Eu ? vs : Ld,
      Kc = Eu ? gd : hd !== null && Ld !== void 0 ? await hd(Ld) : null,
      _s = Kc?.start ?? null,
      Qm = _s === null ? null : Date.now() - now_2,
      wr = Li && pd === null && Qs !== void 0 && !!Nr && !wa && !$a;
    if (wr)
      logForDebugging(
        "[teleportToRemote] the screened remote look-up answered nothing, so the start was not resolved. One possible cause: its git applies no personal git file, so a checkout that git takes for another account\u2019s counts as safe only when the system file says so (git config --system --add safe.directory <path>).",
        { level: "warn" },
      );
    let zs = _s !== null && Sd(_s) ? _s : null;
    if (signal.aborted) throw new AbortError_2();
    let li = null;
    if (signal.aborted) throw new AbortError_2();
    if (Nr && !$a)
      if (wa) ((Is = !0), (Wi = "byoc_env_skip_preflight"));
      else if (isGithubDotCom(Nr.host)) {
        let ma = await (Bs ?? checkGithubAppInstalled(Nr.owner, Nr.name, signal));
        ((Is = ma.appInstalled),
          (gitSource_2 = ma.defaultBranch),
          (as = ma.transient),
          (Vi = ma.linkedAccountAccess === "github_not_connected"),
          (gitOutcome = Is ? null : { ...GITHUB_PRECONDITION_ERRORS(ma), httpStatus: ma.httpStatus }),
          (Wi = Is ? "github_preflight_ok" : "github_preflight_failed"));
      } else ((Is = !0), (Wi = "ghes_optimistic"));
    else if ($a) Wi = "forced_bundle";
    else if (ii && !options.agentId) Wi = "no_github_remote";
    let nl = null;
    if (signal.aborted) throw new AbortError_2();
    if (gitOutcome !== null)
      logFeatureSad("cloud_github_preflight", `${gitOutcome.kind}_${gitOutcome.httpStatus ?? "none"}`);
    else if (Wi === "github_preflight_ok") logFeatureOk("cloud_github_preflight");
    let Tl = gitOutcome,
      kd =
        Tl === null
          ? {}
          : {
              github_preflight_failure: fromEnum(Tl.kind),
              ...(Tl.httpStatus !== null && { github_preflight_http_status: Tl.httpStatus }),
            },
      na = { engine: "none", reason: "not_opted_in" },
      em = null,
      Ac = void 0,
      tp = void 0,
      Yh = null,
      Ef = null,
      np = null,
      Rf = null,
      ap = !1,
      al = null,
      mf = null,
      rg = () => {
        let ma = mf,
          qd = np?.pinnedCommit;
        return zs !== null &&
          ma?.kind === "pushed_ancestor" &&
          ma.commit !== zs.commit &&
          (qd === void 0 || qd === ma.commit)
          ? ma
          : null;
      },
      uh = null,
      Kf = null,
      ch = (ma, qd) => {},
      uS =
        Nr && !isGithubDotCom(Nr.host)
          ? { reason: "other_host" }
          : options.explicitRef !== void 0
            ? { reason: "explicit_ref", flag: Ha }
            : null,
      Ks = async () => null;
    if (!Is && !nr && Nr) Is = !0;
    let kl = null,
      Yd = null,
      xc = null,
      Ip = Es ? getGitHostKind(Es.host) : null,
      Gc = Ip === "gitlab" ? "GitLab" : Ip === "bitbucket" ? "Bitbucket" : null,
      oc = void 0,
      hp = !1,
      Pg = "not_asked",
      Hu = (void 0)?.savedNo,
      dy = !1,
      aI = Hu !== void 0 && !0,
      uI = !1,
      cS = void 0,
      mae = null,
      Bx = !1,
      E5 = !1,
      gae = !1,
      gW = !1,
      IW = void 0,
      Tw = !0,
      XF = nr && (optedIn || !gae),
      Ux = null,
      xT = null;
    if (_s?.kind === "none" && Is && Nr && (XF || (nr && (Gc !== null || !1))) && Yh === null && em === null)
      ((Is = !1), (Wi = "branch_not_on_remote"));
    if (Is && Nr) {
      let { host: host, owner: owner, name: name } = Nr;
      Kr ??= Uc ?? (await getDefaultBranch());
      let vu = Kr;
      if (zs !== null && pd !== null) {
        let sc = rg() ?? zs,
          fc = isGithubDotCom(host) ? null : (sc.branch ?? sc.containedIn ?? null);
        ((vu = fc ?? sc.commit),
          (Yd = fc !== null ? wh(fc) : gnr(sc, pd.name)),
          (Ux = describeBranchStartability({
            branch: Kr,
            start: sc,
            remoteName: pd.name,
            host: host,
            byName: fc,
            carried: optedIn && fc === null,
            advisesPush: Tw,
          })),
          (kl = Ux),
          (xT = {
            line: describeBranchStartability({
              branch: Kr,
              start: sc,
              remoteName: pd.name,
              host: host,
              byName: fc,
              carried: !1,
              advisesPush: !1,
            }),
          }));
      } else if (
        _s?.kind === "not_on_remote" ||
        (_s?.kind === "pushed_ancestor" && zs === null && Kr !== "HEAD")
      )
        ((vu =
          gitSource_2 ??
          (_s.kind === "not_on_remote" ? _s.defaultBranch : null) ??
          (await getDefaultBranch())),
          (Yd = wh(vu)),
          (kl = branchNotOnRemoteMessage({
            branch: Kr,
            host: host,
            revision: vu,
            advisesPush: Tw,
            goneFromGithub: Kc?.github === "no",
          })),
          (xT = {
            line: branchNotOnRemoteMessage({ branch: Kr, host: host, revision: vu, advisesPush: !1 }),
          }));
      else if (_s?.kind === "none") {
        vu = gitSource_2 ?? _s.defaultBranch ?? (await getDefaultBranch());
        let sc = wh(vu);
        ((Yd = sc),
          (xc = {
            defaultBranch: sc,
            branch: Kr === "HEAD" ? null : wh(Kr),
            remote: pd === null ? null : wh(pd.name),
          }),
          (kl = `${Kr === "HEAD" ? "This detached HEAD" : `Branch ${wh(Kr)}`} shares no history with ${pd?.name ?? "the remote"} as last fetched here, so the cloud session starts from ${sc} instead; commits and changes that exist only on this machine are not in it.`));
      } else if (_s?.kind === "on_remote" && _s.aheadCount !== void 0 && _s.aheadCount > 0 && pd !== null)
        ((Ux = branchAheadOfRemoteMessage({
          branch: Kr,
          aheadCount: _s.aheadCount,
          remoteName: pd.name,
          advisesPush: Tw,
        })),
          (kl = Ux),
          (xT = {
            line: branchAheadOfRemoteMessage({
              branch: Kr,
              aheadCount: _s.aheadCount,
              remoteName: pd.name,
              advisesPush: !1,
            }),
          }));
      else if (wr && !optedIn) {
        let sc = isGithubDotCom(host) ? "GitHub" : host,
          fc = Kr === "HEAD";
        kl = `${fc ? `This checkout is on a detached HEAD, and no remote of it could be read, so its commit could not be looked for on ${sc}. The cloud session was asked to start from HEAD as ${sc} has it, its default branch.` : `Whether branch ${wh(Kr)} is on ${sc} could not be checked, because no remote of this checkout could be read. The cloud session was asked to start from it by name.`}${Tw ? ` ${fc ? "To start from your work, push it" : "If it is not there, push your work"} to a branch and start a new session from that branch.` : ""}`;
      }
      if (options.reuseOutcomeBranch) {
        let envCcrOnBranchDefaultGuard = process.env.CCR_ON_BRANCH_DEFAULT_GUARD,
          fc =
            env.CCR_ON_BRANCH_DEFAULT_GUARD ??
            (envCcrOnBranchDefaultGuard != null && String(envCcrOnBranchDefaultGuard).trim()
              ? "enforce"
              : (await checkGate_CACHED_OR_BLOCKING("tengu_on_branch_default_guard_observe").catch(() => !1))
                ? "observe"
                : "enforce");
        if (fc !== "off") {
          let h_ = gitSource_2 ?? (await getDefaultBranchIfKnown(options.cwd));
          if (h_ === null)
            logForDebugging(
              "[teleportToRemote] reuse-outcome-branch collision guard: default branch unknown (no preflight answer, origin/HEAD " +
                `unresolved) \u2014 failing open for '${options.reuseOutcomeBranch}'`,
            );
          else if (options.reuseOutcomeBranch === h_) {
            let Rh = options.explicitRef === options.reuseOutcomeBranch,
              Af = options.source === "autofix_pr";
            if (
              (logEvent("tengu_teleport_on_branch_default_guard", {
                mode: fromEnum(fc),
                source: fromEnum(options.source),
                evidence: fromEnum(gitSource_2 !== null ? "preflight" : "local_symref"),
                arm: fromEnum(wa ? "pool" : "managed"),
              }),
              wa)
            )
              logForDebugging(
                `[teleportToRemote] reuse-outcome-branch collision guard (pool arm): '${options.reuseOutcomeBranch}' is the ` +
                  "repository's default branch \u2014 allowed on self-hosted " +
                  "pools; emitted for policy telemetry only",
              );
            else if (fc === "observe")
              logForDebugging(
                `[teleportToRemote] reuse-outcome-branch collision guard (observe): '${options.reuseOutcomeBranch}' is the ` +
                  "repository's default branch \u2014 would deny; proceeding " +
                  "(CCR_ON_BRANCH_DEFAULT_GUARD=observe)",
              );
            else
              return (
                options.onCreateFail?.(
                  (Rh
                    ? `--on-branch ${Clt(options.reuseOutcomeBranch)} targets `
                    : Af
                      ? `This pull request's head branch '${hgr(options.reuseOutcomeBranch)}' is `
                      : `The requested outcome branch '${hgr(options.reuseOutcomeBranch)}' is `) +
                    "the repository's default branch, which this environment's runner cannot reuse as its work branch (its git checkout -b fails on a name the clone already has). " +
                    (Rh
                      ? `Use --ref ${Clt(options.reuseOutcomeBranch)} to base the ` +
                        "session on it and let it push to a fresh claude/\u2026 branch."
                      : Af
                        ? "Autofix can monitor this PR from a self-hosted (BYOC) default environment, whose runner tolerates reusing the default branch."
                        : "Use a non-default branch."),
                  "outcome_branch_is_default",
                ),
                null
              );
          }
        }
      }
      (logForDebugging(
        `[teleportToRemote] Git source: ${host}/${owner}/${name}, revision: ${vu ?? "none"}${Ef === null ? "" : ` pinned at ${Ef}`}`,
      ),
        (Oo = {
          type: "git_repository",
          url: `https://${host}/${owner}/${name}`,
          revision: Ef ?? vu,
          ...(options.reuseOutcomeBranch && { allow_unrestricted_git_push: !0 }),
        }),
        (jr = `${owner}/${name}`));
    }
    let cLe = null,
      MT = null,
      JF = null,
      hae = !1;
    if (!Oo && !wa && options.explicitRef) {
      let ma = $a
          ? "CCR_FORCE_BUNDLE is set"
          : Nr
            ? as
              ? "the GitHub App preflight failed transiently (network or service hiccup)"
              : "the GitHub App is not set up for this repository"
            : "no GitHub remote was detected in this directory",
        qd = XF ? "be seeded from your local working tree" : "start with an empty sandbox",
        Gd = XF ? `drop ${Ha} to seed from local HEAD` : `drop ${Ha} to start with an empty sandbox`,
        vu = `${Ha} ${Clt(options.explicitRef)} cannot be honored: `;
      return (
        options.onCreateFail?.(
          Vi
            ? `${vu}${githubNotConnectedMessage()} \u2014 or ${Gd} instead.`
            : `${vu}${ma}, so the session would ${qd} instead. ` +
                (!Es
                  ? ""
                  : as
                    ? "Retry in a moment, or "
                    : Gc
                      ? `Cloud sessions can't clone from ${Gc} yet \u2014 `
                      : "Set up the GitHub integration at https://claude.ai/code, or ") +
                `${Gd}.`,
          options.reuseOutcomeBranch ? "on_branch_no_git_source" : "explicit_ref_no_git_source",
          { preflightTransient: as },
        ),
        null
      );
    }
    if (signal.aborted) throw new AbortError_2();
    let Xh = !0;
    if (signal.aborted) throw new AbortError_2();
    let firstUpload = options.firstUpload,
      fI = !1,
      ZF = options.cwd === void 0 ? ii : null,
      CC = !Oo && nr,
      pLe = null,
      fE = null,
      e$ = null,
      _E = null,
      Sae = !1,
      mLe = null,
      R5 = null;
    if (CC) {
      (logForDebugging("[teleport] phase: bundle-upload"),
        logForDebugging(`[teleportToRemote] Bundling (reason: ${Wi})`),
        logEvent("tengu_teleport_bundle_started", { reason: fromEnum(Wi) }),
        options.onProgress?.({ kind: "bundling", rerouted: !1 }),
        (gitSource = Date.now()));
      let environments = await Me(),
        Gd = {
          oauthToken: fo,
          isStoredLogin: bo,
          sessionId: getSessionId(),
          baseUrl: getOauthConfig().BASE_API_URL,
        },
        vu = await uploadGitBundleForSession(
          Gd,
          {
            signal: signal,
            ...(ZF !== null && { cwd: ZF }),
            currentBranchOnly: environments,
            ...(environments && { hardenForDeviceSessions: !0, startsInProject: await We() }),
            ...resolveBundleReadRules(environments, options.onBundleNotice, environments && (await Ae())),
            onBundled: (sc) => options.onProgress?.({ kind: "bundled", ...sc }),
          },
          MT === null ? options.onBundleNotice : null,
          Gc ? { kind: "other_forge", forge: Gc } : $a ? { kind: "forced_bundle" } : null,
        );
      if (vu.success) Yt = { fileId: vu.fileId, config: Gd };
      if (signal.aborted) throw new AbortError_2();
      if (!vu.success) {
        let { failReason: failReason, error: error } = vu,
          h_ = "advice" in vu ? vu.advice : void 0;
        if (failReason === "uncommitted_credentials" || failReason === "git_dir_tampered")
          return (
            logForDebugging(`Bundle refused: ${error}`, { level: "error" }),
            options.onBundleFail?.(error, "bundle"),
            null
          );
        {
          logForDebugging(`Bundle upload failed: ${error}`, { level: "error" });
          let Rh = !Es
              ? ""
              : Wi === "branch_not_on_remote"
                ? `. This branch shares no history with the remote as last fetched here${Tw ? "; push it to start from GitHub instead" : ""}`
                : Vi
                  ? `. ${githubNotConnectedMessage()}`
                  : as
                    ? ". The GitHub App preflight failed transiently (network or service hiccup) \u2014 retry in a moment to start from GitHub instead"
                    : Gc
                      ? `. Cloud sessions can't clone from ${Gc} yet, so an upload is the only way to start one from this repository`
                      : ". A cloud session can start from GitHub instead if the Claude GitHub App has access to this repository: https://claude.ai/code",
            Af;
          switch (failReason) {
            case "empty_repo":
              Af = h_ === void 0 ? error : `${error}. ${h_}`;
              break;
            case "too_large":
              Af = `${error}${Rh}`;
              break;
            case "git_error":
              Af = `Failed to create git bundle (${error})${Rh}`;
              break;
            case "stash_failed":
            case "no_changes":
            case "unsupported_layout":
            case "refused":
              Af = error;
              break;
            case "not_a_repo":
              Af = error;
              break;
            case "upload_failed":
              Af = `Could not upload repo bundle (${error})${Rh}`;
              break;
            case void 0:
              Af = `Bundle upload failed: ${error}${Rh}`;
              break;
            default: {
              let Ah = failReason;
              Af = `Bundle upload failed: ${error}`;
            }
          }
          return (options.onBundleFail?.(Af, "bundle"), null);
        }
      } else {
        if (((Or = vu.fileId), (Io = vu.scope), vu.leftOut?.length))
          options.onBundleNotice?.(
            leftOutNotice(vu.leftOut, { readRules: environments, ofThisUploadOnly: !1 }),
          );
        if (vu.deletedHere?.length) options.onBundleNotice?.(deletedHereNotice(vu.deletedHere));
        logEvent("tengu_teleport_bundle_mode", {
          size_bytes: vu.bundleSizeBytes,
          scope: fromEnum(vu.scope),
          has_wip: vu.hasWip,
          current_branch_only: environments,
          ...{},
          reason: fromEnum(Wi),
        });
      }
    }
    let t$ = null,
      hI = null,
      DW = null,
      LW = DW === null ? folderRoot : null,
      HW = DW !== null && Di ? null : yr,
      C5 = fi && oN(options.homeSettingsConsent),
      AC = fi && (!C5 || optedIn || folderRoot !== null) && !(DW !== null && C5),
      wE = R5 ?? DW?.noteForClaude ?? hI ?? _i.noteForClaude,
      Gx =
        wE === null
          ? options.appendSystemPrompt
          : [options.appendSystemPrompt, wE].filter((env) => env !== void 0).join(`

`),
      EE = (li === null ? null : await li)?.verdict,
      n$ = EE?.reason === "probe_failed" && EE.storeLookAhead === "not_plain";
    if (signal.aborted) throw new AbortError_2();
    let qx = Oo !== null && Yd !== null ? Yd : Kr,
      BW = Ef !== null,
      yI = null,
      gLe = Rf,
      A5 = al,
      kae = Oo !== null && rg() !== null,
      bae = Hl,
      hLe = em ?? void 0,
      Nh = _s?.kind ?? null,
      x5 = Su?.kind ?? null,
      WW = Kc?.github ?? null,
      nP = !1,
      P5 = _s?.kind === "unknown" ? _s.cause : null,
      M5 = _s?.kind === "not_on_remote" ? _s.searchFailure : (Kc?.failedSearch ?? null),
      yLe = !1,
      PE = !1;
    logEvent("tengu_teleport_source_decision", {
      reason: fromEnum(Wi),
      ...(Wi === "github_preflight_failed" && kd),
      path: lit_2(Oo ? "github" : Or ? "bundle" : "empty"),
      ...{},
      ...{},
      ...{},
      ...{},
      ...{},
      ...{},
      ...{},
      ...{},
      ...{},
      ...{},
      ...{},
      ...{},
      ...{},
      ...(Nh !== null && { checkout_start: fromEnum(Nh) }),
      ...(WW !== null && { checkout_start_github: fromEnum(WW) }),
      ...(M5 !== null && { checkout_start_search_failure: fromEnum(M5) }),
      ...(_s?.kind === "pushed_ancestor" && _s.fromOwnRefs === !0 && { checkout_start_own_refs_only: !0 }),
      ...(kae && { checkout_start_pinned_nearer: !0 }),
      ...(Qm !== null && { checkout_start_ms: Qm }),
      ...(ga > 0 && { checkout_start_tries: ga }),
      ...(bae !== null && { checkout_start_created_from: fromEnum(bae) }),
      ...(P5 !== null && { checkout_start_unknown: fromEnum(P5) }),
      ...(wr && { checkout_start: lit_2("remote_unresolved") }),
      ...(x5 !== null && { checkout_start_own: fromEnum(x5), checkout_start_own_taken: Eu }),
      ...(Ld !== options.branchName && { launch_branch_not_as_handed: !0 }),
      ...otr(),
      ...{},
      ...(zs !== null && { checkout_start_ahead: zs.aheadCount }),
      ...(_s?.kind === "on_remote" && _s.aheadCount !== void 0 && { checkout_start_ahead: _s.aheadCount }),
      ...{},
      ...{},
      ...{},
      ...ynr(mf, uh),
      ...{},
      ...{},
      ...{},
      ...(ii !== null &&
        Oo === null &&
        Es === null &&
        repoDetectionGuards().blocked() && { trust_unconfirmed: !0 }),
      ...!1,
      ...{},
      ...{},
      ...{},
      ...{},
      ...{},
      ...{},
    });
    let O5 = !1,
      wae = !1;
    if (!Oo && !Or) {
      if (wa && !options.agentId && !O5) {
        let ma = options.explicitRef ? ` \u2014 so ${Ha} ${Clt(options.explicitRef)} cannot be honored` : "",
          Gd = `${`The selected environment "${Vr}"`} requires a git source, but no GitHub remote was detected${ma}. Check that \`git remote get-url origin\` returns a GitHub URL.`;
        return (
          logForDebugging(`[teleportToRemote] ${Gd} (byoc env, sourceReason=${Wi})`, { level: "error" }),
          options.onCreateFail?.(Gd, "byoc_no_git_source"),
          null
        );
      }
      if (yt === null && t$ === null) {
        if (
          (logForDebugging(
            "[teleportToRemote] No repository detected \u2014 session will have an empty sandbox",
          ),
          !options.agentId && !O5)
        ) {
          let ma = ii === null ? _i.mayTakeFolder : !1,
            qd = null;
          ((wae = !1),
            options.onBundleNotice?.(
              e$ ??
                _E ??
                (fE !== null && !repoDetectionGuards().blocked()
                  ? fE
                  : describeNoRepositoryReason(
                      ii === null
                        ? "no_git"
                        : repoDetectionGuards().blocked()
                          ? "trust_unconfirmed"
                          : "no_github_repository",
                    )),
              fE !== null ? "warning" : void 0,
            ));
        }
      }
    }
    logForDebugging("[teleport] phase: title-await");
    let retried = await yo();
    if (signal.aborted) throw new AbortError_2();
    let D5 = options.title || retried.title,
      Tae = options.reuseOutcomeBranch || retried.branchName,
      i$ =
        jr === null
          ? null
          : { type: "git_repository", git_info: { type: "github", repo: jr, branches: [Tae] } },
      e1 = fetchReferralEligibility_2(
        Kn,
        Xn,
        vn,
        To,
        () => getCloudSessionAccessToken(options.credentials, options.storageV5),
        Uon,
      ),
      L5 = !1;
    if (kl !== null && Oo !== null && !0) options.onBundleNotice?.(kl, nP ? "warning" : void 0);
    let Rae = L5 && Kn === "v1alpha2",
      SLe = !1,
      t1 = options.ultraplan ? `ultraplan: ${D5}` : D5,
      i1 = builtinToolsFirstPrompt(options, initialMessage),
      N5 = optedIn || LW !== null || HW !== null,
      l$ =
        i1 ??
        (options.deferInitialMessage === !0 && initialMessage !== null && N5
          ? { content: initialMessage, uuid: options.initialMessageUuid ?? randomUUID_23() }
          : void 0),
      SI = buildInitialControlEvents({
        initialMessage: l$ ? null : initialMessage,
        initialMessageUuid: options.initialMessageUuid,
        permissionMode: mi && options.isModeFromSettings === !0 ? void 0 : options.permissionMode,
        isModeFromSettings: options.isModeFromSettings,
        proactivityLevel: options.proactivityLevel,
        ultraplan: options.ultraplan,
        title: options.title,
        thinking: options.thinking,
      }),
      u$ = options.model ?? getMainLoopModel(),
      oP = getModelPickerEffortDefault(
        u$,
        mi && options.isEffortFromSettings === !0 ? void 0 : options.effort,
      ),
      a1 = getModelPickerEffortDefault(u$, options.effort);
    options.onProgress?.({ kind: "creating" });
    let Cae =
        seedBundleFileId_2 !== null
          ? seedBundleFileId_2.binder
          : await prepareDeviceBinding(
              options.deviceBinding,
              Kn,
              Cr,
              _r?.kind,
              options.correlationId,
              options.credentials,
              G(),
              To,
            ),
      persistentVolumeFromSessionId = options.persistentVolumeFromSessionId,
      EI = (ma, qd, Gd, vu) => {
        let sc = options.deviceBinding !== void 0 && ma === void 0,
          fc =
            Kn === "v1alpha2"
              ? buildSessionCreateBody({
                  title: t1,
                  worker: environmentSelector(Cr),
                  events: SI,
                  sources: Oo ? [Oo] : [],
                  outcomes: i$ ? [i$] : [],
                  model: u$,
                  effortLevel: oP,
                  seedBundleFileId: Or ?? void 0,
                  reuseOutcomeBranches: Boolean(options.reuseOutcomeBranch),
                  environmentVariables: co,
                  appendSystemPrompt: Gx,
                  customSystemPrompt: options.customSystemPrompt,
                  appendSubagentSystemPrompt: options.appendSubagentSystemPrompt,
                  fallbackModel: options.fallbackModel,
                  maxTurns: options.maxTurns,
                  maxBudgetUsd: options.maxBudgetUsd,
                  allowedTools: options.allowedTools,
                  disallowedTools: options.disallowedTools,
                  builtinTools: options.builtinTools,
                  outputSchema: options.outputSchema,
                  tags: w,
                  sessionGroupingId: options.sessionGroupingId,
                  agentId: options.agentId,
                  correlationId: options.correlationId,
                  persistentVolume: options.persistentVolume,
                  persistentVolumeFromSessionId: persistentVolumeFromSessionId,
                  deviceBinding: ma,
                  requestElevatedTier: qd,
                  deferFirstPrompt: Gd,
                  repositoriesTrusted: vu,
                })
              : {
                  title: t1,
                  events: SI,
                  session_context: {
                    sources: Oo ? [Oo] : [],
                    ...(Or && { seed_bundle_file_id: Or }),
                    outcomes: i$ ? [i$] : [],
                    model: u$,
                    ...(oP && { effort_level: oP }),
                    ...(options.reuseOutcomeBranch && { reuse_outcome_branches: !0 }),
                    ...(Object.keys(co).length > 0 && { environment_variables: co }),
                    ...(Gx && { append_system_prompt: Gx }),
                    ...buildRemoteSessionConfig(options),
                    ...(options.outputSchema && { output_schema: options.outputSchema }),
                    ...(options.correlationId && { correlation_id: options.correlationId }),
                  },
                  ...environmentSelector(Cr),
                  ...l9o(options.persistentVolume, persistentVolumeFromSessionId),
                  ...(w && { tags: w }),
                };
        return (
          logForDebugging(
            `Creating session with payload: ${jsonStringify(redactSessionCreateBody(fc), null, 2)}`,
          ),
          fc
        );
      };
    if (signal.aborted) throw new AbortError_2();
    (options.onProgress?.({ kind: "request_sent" }), logForDebugging("[teleport] phase: POST-sent"));
    let m$ = {
        prepared: Cae,
        buildBody: EI,
        drops: summarizeSessionCreateBody({ events: SI, environmentVariables: co }),
        callerSendsFirstPrompt: options.deferInitialMessage === !0,
        attaches: {
          anything: Oo !== null || Or !== null || optedIn || LW !== null,
          launchCheckout:
            ii !== null && Oo !== null && Nr !== null && Or === null
              ? { root: ii, covers: "remote" }
              : ZF !== null && Oo === null && Or !== null && !optedIn && LW === null
                ? { root: ZF, covers: "bundle" }
                : null,
        },
        post: (ma, qd) =>
          ensureTrustedDevice(e1, qd, (env) =>
            Dt.post(e1.url, ma, { headers: env, signal: signal, validateStatus: (vu) => vu < 500 }),
          ),
      },
      HS = await createWithDeviceBinding(m$),
      g$ = null;
    if (g$ !== null) {
      if ((options.onBundleNotice?.(g$), (persistentVolumeFromSessionId = void 0), signal.aborted))
        throw new AbortError_2();
      HS = await createWithDeviceBinding(m$);
    }
    let {
      response: response,
      bind: vw,
      held: held,
      attested: attested,
      firstPromptDeferred: firstPromptDeferred,
    } = HS;
    (logForDebugging(`[teleport] phase: POST-response status=${response.status}`),
      (qt = isSuccessStatus(response.status)));
    let F5 = vw?.ok === !0 ? held : void 0,
      Aae = Rae && (options.deviceBinding === void 0 || attested);
    if (!(response.status === 200 || response.status === 201)) {
      let ma = `API request failed with status ${response.status}: ${response.statusText}

Response data: ${jsonStringify(response.data, null, 2)}`,
        qd = response.data,
        Gd = qd?.error?.type,
        vu = qd?.error?.reason,
        sc = qd?.error?.message,
        fc = Oo ? parseGitRemote(Oo.url) : null,
        h_ = fc
          ? Gis(`${fc.owner}/${fc.name}`)
          : Or
            ? "a seed bundle (no git source)"
            : Oo
              ? Gis(Oo.url)
              : "no source",
        Rh = fc !== null && Hcr(fc),
        Af = normalizeCreateSessionError(vu),
        Ah = !1,
        k_ =
          (typeof sc === "string" &&
            sc.includes("source repository configuration is not permitted for this environment")) ||
          Af === "monorepo_source_required" ||
          Af === "monorepo_env_required" ||
          (response.status === 400 &&
            !vu &&
            Gd === "invalid_request_error" &&
            !wa &&
            Oo !== null &&
            !Or &&
            Rh &&
            typeof sc === "string" &&
            /^the request was invalid\.?$/i.test(sc));
      if (
        [401, 403, 429].includes(response.status) ||
        vu === "github_repo_access_denied" ||
        kB(qd) ||
        k_ ||
        !1 ||
        G3e(vu) !== void 0
      )
        logForDebugging(ma, { level: "error" });
      else {
        let Yc = (env) => (env && /^[a-z][a-z0-9_]*$/.test(env) ? env : void 0),
          Zh = "";
        logError(Error(`[type=${Yc(Gd)},reason=${Yc(vu)},isByocEnv=${wa}] ${ma}`));
      }
      let FT = cloudErrorMessage(response, sc),
        Jh =
          (await explainUntrustedDeviceRefusal(response, e1)) ||
          loginRejectedMessage(response.status, FT.message) ||
          FT.message ||
          FT.statusLine;
      if (k_) Jh = formatEnvironmentRepoMismatch(Rh, Vr, h_);
      if (_r?.kind === "bridge" && response.status === 403) {
        let { readUntrustedDeviceRefusal: readUntrustedDeviceRefusal } = await import("./chunk-g9dw262t.js");
        if (readUntrustedDeviceRefusal(response.data)?.kind === "unrecognized")
          Jh = `Choose a cloud environment with /remote-env: "${Vr}" is a Remote Control environment and refused this session. If none is listed, create one at ${ENV_SETUP_ONBOARDING_URL}.`;
      }
      let _S = options.sessionGroupingId && projectNotFoundMessage(options.sessionGroupingId, qd?.error);
      if ((options.builtinTools?.length ?? 0) > 0 && kB(qd)) logBuiltinToolsCreate("unavailable", ko);
      let bS = (kB(qd) && snn) || _S || Jh,
        nk = normalizeApiErrorType(Gd);
      return (
        options.onCreateFail?.(bS, "create_request_failed", {
          status: response.status,
          serverType: nk,
          serverReason: Af,
          endpoint: Kn,
          messageHidden: FT.messageHidden,
        }),
        null
      );
    }
    let $5 = sessionIdFromCreateResponse(Kn, response.data);
    if (!$5.ok) {
      let ma = CREATE_SESSION_FAILURES[$5.error];
      return (
        logError(
          withTelemetryMessage(
            Error(`Cannot determine session ID from API response: ${jsonStringify(response.data)}`),
            ma.telemetry,
          ),
        ),
        options.onCreateFail?.(ma.message, ma.reason),
        null
      );
    }
    let Zk = $5.value;
    options.onProgress?.({ kind: "session_exists", sessionId: Zk.id });
    let f1 = null,
      xae = Aae && !0 && !(vw !== void 0 && !vw.ok),
      Uy = null;
    if (Uy !== null) options.onBundleNotice?.(Uy);
    let p_ = SLe && attested,
      B5 = async (ma, qd = null) => {},
      U5 = (env) =>
        raceWithAbortSignal(B5(!1, env), signal, () => new AbortError_2()).catch((qd) => {
          if (!isAbortError(qd)) logError(qd);
        }),
      Al = await createRemoteSession({
        options: options,
        createEndpoint: Kn,
        responseData: response.data,
        sessionId: Zk.id,
        held: i1,
        bound: vw?.ok === !0,
        firstPromptDeferred: firstPromptDeferred,
        followsUploads: N5,
        pool: ko,
        signal: signal,
      });
    if (!Al.ok) return null;
    if ((logForDebugging(`Successfully created remote session: ${Zk.id}`), yt === null))
      options.onProgress?.({ kind: "created" });
    let j5 = () =>
      logCloudSessionLink(
        Zk.id,
        options.source,
        {
          project: Oo !== null && Wi !== "github_preflight_failed" && !0,
          global: Or === null && yt === null && fE === null && e$ === null && _E === null,
        },
        { endpoint: Kn, grouped: options.sessionGroupingId != null, effortLevel: oP },
        options.storageV5,
      );
    if (yI?.kind !== "seed" || yI.cloudCheckoutOrigin.kind !== "created_empty") j5();
    let Qh = null,
      bLe = (ma) => (Qh ??= archiveRemoteSession(Zk.id, ma));
    if (!1)
      switch (yI.kind) {
        case "seed":
          if (Rh !== null && Af !== null)
            switch (Jh.kind) {
              case "cancelled":
              case "unfilled":
              case "armed":
            }
        case "not_armed":
        default:
      }
    if (
      (reportDeviceBindOutcome(options.deviceBinding, vw, Zk.id, options.storageV5),
      attested && options.title)
    )
      latchBoundSessionTitle(Zk.id, options.title, vw?.ok ? vw.value : void 0, options.credentials, F5);
    let MI = null;
    if (MI !== null) (logFeatureSad("ccr_home_seed", MI), logFeatureSad("ccr_home_seed_create_upload", MI));
    let p1 = selfHostedEnvironmentKind(Zk),
      W5 = !1,
      OI = HW !== null && p1 !== null && !W5,
      rP = OI ? "self_hosted_runner" : MI,
      k$ = options.isModeFromSettings !== !0 ? void 0 : mi ? "not_sent" : p1 !== null ? "not_pushed" : void 0;
    if (p1 !== null && (OI || W5 || k$ === "not_pushed"))
      logEvent("tengu_settings_kept_from_runner", {
        known_by: fromEnum(p1),
        is_pack_kept: OI,
        ...!1,
        is_mode_kept: k$ === "not_pushed",
        is_effort_kept: !1,
        is_named_at_launch: !1,
      });
    if (
      mi &&
      !wa &&
      (AC || (options.isModeFromSettings === !0 && options.permissionMode !== void 0) || a1 !== oP)
    )
      logEvent("tengu_settings_kept_from_runner", {
        known_by: fromEnum("unlisted_kind"),
        is_pack_kept: AC,
        ...!1,
        is_mode_kept: options.isModeFromSettings === !0 && options.permissionMode !== void 0,
        is_effort_kept: a1 !== oP,
        is_named_at_launch: !0,
      });
    let ME = OI ? "self_hosted_runner" : MI !== null ? "no_project_files" : null,
      G5 = ME !== null ? Promise.resolve({ kind: "none", reason: ME }) : HW,
      II =
        G5 === null
          ? void 0
          : await runCreateHomeSeed({
              sessionId: Zk.id,
              planning: G5,
              boundDeviceUuid: vw?.ok ? vw.value : void 0,
              held: F5,
              launchConsent: options.homeSettingsConsent,
              signal: signal,
              credentials: options.credentials,
              storageV5: options.storageV5,
            }),
      JS = i1
        ? Al.withheld
        : firstPromptDeferred
          ? l$
            ? { ...l$, followsPermissionMode: !0 }
            : deferredFirstPrompt(SI, initialMessage)
          : l$;
    return {
      id: Zk.id,
      title: sessionTitleOf(Zk, t1),
      ...(JS && { withheldInitialMessage: JS }),
      ...(II && { homeSeed: II }),
      ...(rP !== null && { settingsPackUnsent: rP }),
      ...(options.maxTurns !== void 0 && { maxTurnsConfirmed: acceptsMaxTurns(Kn, Zk, options.maxTurns) }),
      ...(k$ !== void 0 && { settingsModeOnRunner: k$ }),
      ...(f1 !== null && { chosenEnvironmentMoved: !0 }),
      ...!1,
      ...!1,
      ...{},
      ...!1,
      ...!1,
      ...!1,
      ...(Oo === null &&
        Or === null &&
        LW === null &&
        yt === null &&
        !options.agentId && { startedEmpty: !0 }),
      ...!1,
    };
  } catch (error) {
    let err = toError(error);
    if (isAbortError(error) || Dt.isCancel(error))
      return (logForDebugging(`Remote session create aborted: ${err.message}`), null);
    let pn = isExpectedApiError(error);
    if (pn) logForDebugging(`Remote session create failed (network): ${err.message}`, { level: "error" });
    else logError(withTelemetryMessage(toError(err), "Remote session create failed"));
    let no = err.message.trimEnd() || getErrnoCode(err) || err.name,
      hn = gro(no, `the error ${MESSAGE_NOT_SHOWN_NOTE}`);
    if (hn !== no && !pn)
      logForDebugging(`Remote session create failed, not shown: ${no}`, { level: "error" });
    return (
      options.onCreateFail?.(`Cloud session create failed: ${hn}`, pn ? "network_error" : "exception"),
      null
    );
  } finally {
    if (yt !== null && !It) options.firstUpload?.discard(yt).catch((Zt) => logError(Zt));
    if (Yt !== null && !qt) await discardUploadedSeedBundle(Yt);
  }
}
//@ chunk-e6aww6q8.js:2009090-2009127 layout
function isSuccessStatus(e) {
  return e >= 200 && e < 300;
}
/**
 * 向远程会话发送 interrupt 控制请求（中断当前回合）。
 */
//@ chunk-e6aww6q8.js:2009127-2009992 facade-exports = sendEventToRemoteSession (0.362)
async function interruptRemoteSession(e, n = 1e4) {
  if (!isFirstPartyProvider())
    return (logForDebugging(`[interruptRemoteSession] ${e} skipped: non-first-party provider`), !1);
  let r = isConsoleProfileSessionsCredential(),
    s = r ? null : await ensureHostSessionsBearer(),
    h = r ? await sessionsApiAccessToken(r) : getAccessTokenWithCcrFallback();
  if (!(s ?? h)) return !1;
  try {
    let S = toCompatSessionId(e);
    if (!/^session_[A-Za-z0-9_-]+$/.test(S)) return !1;
    let w = await sessionsApiOrganizationUUID(r);
    if (!w) return !1;
    let { url: url, body: body } = sessionEventsUrl(
        getOauthConfig().BASE_API_URL,
        S,
        [{ type: "control_request", request_id: randomUUID_23(), request: Uki, uuid: randomUUID_23() }],
        isCcrV2SendEventsEnabled(),
      ),
      q = await getTrustedDeviceToken(),
      Z = await resendOnHeldBearer401(
        s,
        (Se) =>
          Dt.post(url, body, {
            headers: {
              ...getOAuthRequestHeaders(bearerToSend(Se, h)),
              "anthropic-beta": CCR_BYOC_BETA,
              "x-organization-uuid": w,
              ...(q && { "X-Trusted-Device-Token": q }),
            },
            timeout: n,
            validateStatus: (status) => status < 500,
          }),
        { waitForHost: !1 },
      );
    if (Z.status >= 200 && Z.status < 300)
      return (logForDebugging(`[interruptRemoteSession] interrupted ${e}`), !0);
    return (
      logForDebugging(`[interruptRemoteSession] ${e} failed ${Z.status}: ${jsonStringify(Z.data)}`),
      !1
    );
  } catch (error) {
    return (
      logForDebugging(`[interruptRemoteSession] ${e} failed: ${errorMessage(error)}`, { level: "error" }),
      !1
    );
  }
}
//@ chunk-e6aww6q8.js:2009992-2010166 facade-exports
function subscribeRemoteSessionToPR(e, n, r) {
  return subscribeGithubPullRequest("subscribe", {
    sessionId: e,
    repo: n,
    prNumber: r,
    baseUrl: getOauthConfig().BASE_API_URL,
    getAccessToken: () => sessionsApiAccessTokenNow(isConsoleProfileSessionsCredential()),
    getTrustedDeviceToken: getTrustedDeviceToken,
    onUnauthorized: recoverHostSessionsBearer,
  });
}
//@ chunk-18hwfzwa.js:1459225-1459274 fingerprint = teleportToRemoteWithErrorHandling (0.308)
function teleportToRemoteWithErrorHandling_2(ur) {
  return ur.initialMessage !== null;
}

export {
  teleportResumeCodeSession,
  teleportToRemote,
  cloudCreateRefusal,
  teleportToRemoteWithErrorHandling,
  checkOutTeleportedSessionBranch,
  processMessagesForTeleportResume,
  validateSessionRepository,
  formatRepoMismatchDisplay,
  handleTeleportPrerequisites,
  teleportToRemoteWithErrorHandling_2,
  awaitRemoteSessionResult,
  launchReadsOnlyTags,
  subscribeRemoteSessionToPR,
  RESTRICTED_SESSION_CLOUD_REFUSAL,
  userCheckoutSpawnTerms,
  stashToCleanState,
};
