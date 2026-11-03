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
import { randomUUID } from "crypto";
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
import { BACKGROUND_TASK_TITLE, REMOTE_TASK_TITLE } from "./teleport/remoteTaskLabels.js";
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
import { GIT_SAFE_GLOBAL_ARGS, buildSafeGitEnvForRepo } from "./git/gitSafeEnv.js";
import { SAFE_UPLOAD_PACK_ARG_2 } from "./gitSafeExec.js";
import { execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { logForDebugging } from "./debug.js";
import { buildGitEnvForRepo, resolveGitDirs } from "./git/gitDirResolution.js";
import { getCwd } from "./cwd.js";
import { listChangedTrackedFiles } from "./teleport/dirSync.js";
import { fromEnum, lit as lit_2, fromEnumArr, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { truncatePathMiddle } from "./format.js";
import { replaceControlChars, err as err_2, ok as ok_2 } from "./resultError.js";
import { plural, printableText } from "./stringUtils.js";
import { markRemoteSourced } from "../tools/ArtifactTool/artifactResumeCarry.js";
import { deserializeToMessages } from "./transcript/deserialize.js";
import { hasOnlyPreservedBeforeBoundary, COMPACTED_AWAY_NOTICE } from "../services/projects/threadRows.js";
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
import { portlessHost, getGitHostKind } from "./gitHosts.js";
import { isFirstPartyProvider } from "./model/providers.js";
import { policyDeniedReason } from "../services/policyLimits/policyEvidence.js";
import { logOrgPolicyDenied } from "../services/policyLimits/orgPolicyDeniedEvent.js";
import { env } from "./env.js";
import { CLOUD_UNAVAILABLE_IN_EVAL_TEXT } from "../commands/review/ultrareviewPreconditions.js";
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
import { sanitizeMarkName } from "./startupMarks.js";
import { isGithubDotCom } from "./git/githubUrl.js";
import { getTeleportErrors } from "../components/TeleportError.js";
import {
  getCurrentProjectConfig,
  saveCurrentProjectConfig,
  getGlobalConfig,
  saveGlobalConfig,
} from "./config.js";
import { noEnvironmentOverride, acceptsMaxTurns } from "./teleport/cloudEnvironments.js";
import {
  singleTokenText,
  safeTokenText,
  cloudErrorMessage,
  printableStatusText,
  singleTokenOrPlaceholder,
  printableMultiline,
  MESSAGE_NOT_SHOWN_NOTE,
} from "./teleport/cloudErrorMessage.js";
import { isPersistentRemoteSessionEnabled, isCcrV2SendEventsEnabled } from "../bridge/bridgeGates.js";
import { checkAdminRequestEligibility } from "../services/api/adminRequests.js";
import { getSessionLogsViaOAuth } from "../services/api/sessionIngress.js";
import { isTranscriptMessage } from "./sessionStorage.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import { logError } from "./log.js";
import {
  MCP_ELICITATION_DIALOG_TOOL,
  setModeControlEvent,
  DEVICE_BINDING_CREATE_ENABLED,
  TENGU_DRIFTING_TWILIGHT,
  TENGU_BUZZING_RIVER,
  TENGU_WOVEN_HARBOR,
  buildSessionCreateBody,
  summarizeSessionCreateBody,
  projectNotFoundMessage,
  loginRejectedMessage,
  sessionIdFromCreateResponse,
  sessionTitleOf,
  noopSessionTag,
  redactSessionCreateBody,
  sessionEventsUrl,
} from "./teleport/sessionCreate.js";
import { sleep, raceWithAbortSignal } from "./sleep.js";
import { isFocusModeEnabled } from "./focusMode.js";
import { getConfiguredAdvisorModel } from "./advisor.js";
import {
  isDeduplicatedCreateResponse,
  logBuiltinToolsCreate,
  duplicateSessionMessage,
  classifyPromptSendResult,
  archiveCloudSession,
  unsupportedEnvironmentOutcome,
  isCloudLaunchError,
  CLOUD_LAUNCH_TOOL_ERRORS_2,
  CLOUD_LAUNCH_TOOL_ERRORS,
  DEVICE_BIND_REFUSAL_REASONS,
} from "./teleport/cloudLaunch.js";
import { getRemoteSessionUrl } from "../constants/product.js";
import { reportSignerLoadFailure, INTERRUPT_REMOTE_EVENT } from "./telemetry/memorySummary.js";
import {
  checkGate_CACHED_OR_BLOCKING,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  getDynamicConfig_BLOCKS_ON_INIT,
} from "../services/analytics/growthbook.js";
import {
  isCcpoolId,
  getEnvironmentSelectionInfo,
  findFirst,
  selfHostedEnvironmentKind,
} from "./teleport/environmentSelection.js";
import {
  classifyDeviceBindingBlocker,
  isProjectSessionBindable,
  emptyBindingFacts,
} from "../bridge/deviceBinding.js";
import {
  planTrustedDeviceProof,
  isTrustedDeviceProofActive,
  requestSecurityTier,
  logSecurityTierOutcome,
  securityTierOfResponse,
} from "./teleport/securityTier.js";
import {
  planTrustedRepositoriesHeader,
  requestRepositoriesTrusted,
  logTrustedRepositoriesOutcome,
} from "./teleport/repositoriesTrusted.js";
import { readFlagWithOverride } from "../services/analytics/flagOverrides.js";
import { isContainerSyncEnvironment } from "./teleport/containerSync.js";
import {
  collectLaunchRules,
  classifySyncedFileSensitivity,
  resolveUploadFilterRules,
  settingsReadErrorsSuffix,
} from "./teleport/dirSyncRules.js";
import { onceExport } from "../../vendor/lodash-es/once.js";
import { checkAndRefreshOAuthTokenIfNeeded } from "./auth.js";
import { ensureHostSessionsBearer, recoverHostSessionsBearer } from "./hostSessionsBearer.js";
import { sensitivePathGateEnabled } from "./permissions/sensitivePaths.js";
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
import {
  homeSettingsForwardingFeature,
  isForwardModeEffective,
  isRemoteHomeSettingsDisabled,
  isLaunchConsentBlocked,
} from "./teleport/homeSettingsMode.js";
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
  recordedOriginalBranch,
  branchForTeleport,
  describeBranchStartability,
  branchNotOnRemoteMessage,
  branchAheadOfRemoteMessage,
  describeNoRepositoryReason,
  discardUploadedSeedBundle,
} from "./teleport/branchStatus.js";
import { githubNotConnectedMessage } from "../services/cloudSessions/webSetup.js";
import { getMainLoopModel } from "./model/model.js";
import { getModelPickerEffortDefault } from "./effort.js";
import { isAnthropicRepo } from "./github/anthropicRepos.js";
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
    isMeta: true,
  });
}
//@ chunk-e6aww6q8.js:1941916-1941972 layout
var DEFAULT_BACKGROUND_TASK_TITLE = {
  title: BACKGROUND_TASK_TITLE,
  branchName: "claude/background-task",
};
//@ chunk-e6aww6q8.js:1941972-1942300 facade-exports = validateGitState (0.852)
/**
 * teleport 前要求工作区干净（tengu_teleport_error_git_not_clean）。
 */
async function validateGitState() {
  if (
    !(await getIsClean({
      ignoreUntracked: true,
    }))
  ) {
    logEvent("tengu_teleport_error_git_not_clean", {});
    throw new TeleportOperationError(
      "Git working directory is not clean. Please commit or stash your changes before using --teleport.",
      sequential.red(`Error: Git working directory is not clean. Please commit or stash your changes before using --teleport.
`),
    );
  }
}
//@ chunk-e6aww6q8.js:1942300-1942776 fingerprint = fetchFromOrigin (1)
async function fetchFromOrigin(branch) {
  let fetchArgs = branch
    ? [...GIT_SAFE_GLOBAL_ARGS, "fetch", SAFE_UPLOAD_PACK_ARG_2, "origin", `${branch}:${branch}`]
    : [...GIT_SAFE_GLOBAL_ARGS, "fetch", SAFE_UPLOAD_PACK_ARG_2, "origin"];
  let repoRootOrCwd = getRepoRootOrCwd();
  let s = {
    cwd: repoRootOrCwd,
    ...(await getGitSshEnv(repoRootOrCwd)),
  };
  let { code: fetchCode, stderr: fetchStderr } = await execFileNoThrowWithCwd(gitExe(), fetchArgs, s);
  if (fetchCode !== 0)
    if (branch && fetchStderr.includes("refspec")) {
      logForDebugging(`Specific branch fetch failed, trying to fetch ref: ${branch}`);
      let { code: refFetchCode, stderr: refFetchStderr } = await execFileNoThrowWithCwd(
        gitExe(),
        [...GIT_SAFE_GLOBAL_ARGS, "fetch", SAFE_UPLOAD_PACK_ARG_2, "origin", branch],
        s,
      );
      if (refFetchCode !== 0)
        logForDebugging(`Failed to fetch from remote origin: ${refFetchStderr}`, {
          level: "error",
        });
    } else
      logForDebugging(`Failed to fetch from remote origin: ${fetchStderr}`, {
        level: "error",
      });
}
//@ chunk-e6aww6q8.js:1942776-1943374 fingerprint = ensureUpstreamIsSet (1)
async function ensureUpstreamIsSet(branchName) {
  let repoRootOrCwd = getRepoRootOrCwd();
  let r = {
    cwd: repoRootOrCwd,
    env: buildGitEnvForRepo(repoRootOrCwd),
  };
  let { code: upstreamCheckCode } = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--abbrev-ref", `${branchName}@{upstream}`],
    r,
  );
  if (upstreamCheckCode === 0) {
    logForDebugging(`Branch '${branchName}' already has upstream set`);
    return;
  }
  let { code: remoteCheckCode } = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--verify", `origin/${branchName}`],
    r,
  );
  if (remoteCheckCode === 0) {
    logForDebugging(`Setting upstream for '${branchName}' to 'origin/${branchName}'`);
    let { code: setUpstreamCode, stderr: setUpstreamStderr } = await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "branch", "--set-upstream-to", `origin/${branchName}`, branchName],
      r,
    );
    if (setUpstreamCode !== 0)
      logForDebugging(`Failed to set upstream for '${branchName}': ${setUpstreamStderr}`);
    else logForDebugging(`Successfully set upstream for '${branchName}'`);
  } else logForDebugging(`Remote branch 'origin/${branchName}' does not exist, skipping upstream setup`);
}
//@ chunk-e6aww6q8.js:1943374-1943411 layout
function getRepoRootOrCwd() {
  return findGitRoot(getCwd()) ?? getCwd();
}
//@ chunk-e6aww6q8.js:1943411-1943712 facade-exports
function userCheckoutSpawnTerms() {
  let repoRootOrCwd = getRepoRootOrCwd();
  let gitDirs = resolveGitDirs(repoRootOrCwd);
  if (gitDirs === null)
    throw new TeleportOperationError(
      `Could not verify this checkout's git repository: ${repoRootOrCwd} has no .git entry that points back to it`,
      sequential.red(`Could not verify this checkout's git repository (no .git entry that points back to it)
`),
    );
  return {
    cwd: repoRootOrCwd,
    env: buildSafeGitEnvForRepo(undefined, {
      repository: gitDirs,
    }),
  };
}
//@ chunk-e6aww6q8.js:1943712-1945237 facade-exports = stashToCleanState (0.369)
/**
 * teleport 前把工作区 stash 到干净状态：先检查被 assume-unchanged/被文件夹替换的已跟踪路径（存在则拒绝，避免 stash 丢数据），再 add 未跟踪文件并 git stash push。
 */
async function stashToCleanState(e, { cwd, env }) {
  let s = await listChangedTrackedFiles(cwd, env);
  if (s.kind === "failed" || !s.isAssumeUnchangedListed) {
    let cause = s.kind === "failed" ? s.cause : "assume_unchanged_listing";
    let errno = s.kind === "failed" && s.cause === "path_read" ? s.errno : undefined;
    logForDebugging(
      s.kind === "failed"
        ? `[teleport] nothing was stashed: could not check for folders in place of tracked files (${cause}${errno === undefined ? "" : ` ${errno}`})`
        : "[teleport] the files marked assume-unchanged were not checked for folders in their place: git could not list them",
      {
        level: "error",
      },
    );
    logEvent("tengu_teleport_stash_check_failed", {
      cause: fromEnum(cause),
      ...(errno !== undefined && {
        errno,
      }),
    });
  }
  if (s.kind === "failed") return false;
  let { replaced } = s;
  if (replaced[0] !== undefined) {
    logEvent("tengu_teleport_stash_refused", {
      entries_replaced_by_folders: replaced.length,
    });
    let w = truncatePathMiddle(replaceControlChars(Buffer.from(replaced[0], "latin1").toString()), 100);
    let L = replaced.length - 1;
    let G =
      L === 0
        ? `Nothing was stashed: "${w}" is now a folder in place of a tracked file or link, and stashing could delete what's in it for good. Commit the change or move the folder somewhere else, then try again.`
        : `Nothing was stashed: "${w}" and ${L} other ${plural(L, "path")} are now folders in place of tracked files or links, and stashing could delete what's in them for good. Commit the change or move the folders somewhere else, then try again.`;
    throw new TeleportOperationError(
      G,
      sequential.red(`${G}
`),
    );
  }
  let { untracked } = await getFileStatus(cwd, env);
  if (untracked.length > 0) {
    let { code: addCode } = await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "add", "--", ...untracked],
      {
        cwd,
        preserveOutputOnError: false,
        env,
      },
    );
    if (addCode !== 0) return false;
  }
  let { code } = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "stash", "push", "--message", e],
    {
      cwd,
      preserveOutputOnError: false,
      env,
    },
  );
  return code === 0;
}
//@ chunk-e6aww6q8.js:1945237-1945804 fingerprint = checkoutBranch (1)
async function checkoutBranch(branchName, n) {
  let r = await execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "checkout", branchName, "--"], n);
  if (r.code !== 0) {
    logForDebugging(`Local checkout failed, trying to checkout from origin: ${r.stderr}`);
    r = await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "checkout", "-b", branchName, "--track", `origin/${branchName}`, "--"],
      n,
    );
  }
  if (r.code !== 0) {
    logForDebugging(`Remote checkout with -b failed, trying without -b: ${r.stderr}`);
    r = await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "checkout", "--track", `origin/${branchName}`, "--"],
      n,
    );
  }
  if (r.code !== 0) {
    logEvent("tengu_teleport_error_branch_checkout_failed", {});
    throw new TeleportOperationError(
      `Failed to checkout branch '${branchName}': ${r.stderr}`,
      sequential.red(`Failed to checkout branch '${branchName}'
`),
    );
  }
  await ensureUpstreamIsSet(branchName);
}
//@ chunk-e6aww6q8.js:1945804-1945931 fingerprint = getCurrentBranch (1)
async function getCurrentBranch() {
  let repoRootOrCwd = getRepoRootOrCwd();
  let { stdout: currentBranch } = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "branch", "--show-current"],
    {
      cwd: repoRootOrCwd,
      env: buildGitEnvForRepo(repoRootOrCwd),
    },
  );
  return currentBranch.trim();
}
//@ chunk-e6aww6q8.js:1945931-1945969 facade-exports
function deserializeRemoteSessionLog(e) {
  return markRemoteSourced(deserializeToMessages(e, true));
}
//@ chunk-e6aww6q8.js:1945969-1946379 facade-exports = processMessagesForTeleportResume (0)
function processMessagesForTeleportResume(log, branchError, environmentKind) {
  let messagesWithTeleportNotice = [
    ...deserializeRemoteSessionLog(log),
    createTeleportResumeUserMessage(),
    createTeleportResumeSystemMessage(branchError),
  ];
  if (hasOnlyPreservedBeforeBoundary(log)) {
    logFeatureSad("teleport_resume_history", "summarized_rows_absent");
    messagesWithTeleportNotice.push(createSystemMessage(COMPACTED_AWAY_NOTICE, "warning"));
  } else logFeatureOk("teleport_resume_history");
  if (environmentKind === "bridge")
    messagesWithTeleportNotice.push(
      createSystemMessage(
        "This terminal now has its own copy of the session: new work here stays local and will not appear in the Claude app. To continue on your phone later, run /remote-control in this session.",
        "warning",
      ),
    );
  return messagesWithTeleportNotice;
}
//@ chunk-e6aww6q8.js:1946379-1946895 facade-exports = checkOutTeleportedSessionBranch (0.832)
/**
 * fetch 并检出云会话所在分支，设置 upstream。
 */
async function checkOutTeleportedSessionBranch(branch) {
  try {
    let currentBranch = await getCurrentBranch();
    logForDebugging(`Current branch before teleport: '${currentBranch}'`);
    if (branch) {
      if (!isSafeRefName_2(branch))
        throw new TeleportOperationError(
          `Invalid branch name from cloud session: ${branch}`,
          sequential.red(`Invalid branch name from cloud session
`),
        );
      logForDebugging(`Switching to branch '${branch}'...`);
      userCheckoutSpawnTerms();
      await fetchFromOrigin(branch);
      await checkoutBranch(branch, userCheckoutSpawnTerms());
      let newBranch = await getCurrentBranch();
      logForDebugging(`Branch after checkout: '${newBranch}'`);
    } else logForDebugging("No branch specified, staying on current branch");
    return {
      branchName: await getCurrentBranch(),
      branchError: null,
    };
  } catch (error) {
    let branchName = await getCurrentBranch();
    let branchError = toError(error);
    return {
      branchName,
      branchError,
    };
  }
}
//@ chunk-e6aww6q8.js:1946895-1948437 facade-exports = validateSessionRepository (0.94)
/**
 * 检查云会话关联的 git 仓库与当前目录是否一致（含 host），不一致返回 mismatch。
 */
async function validateSessionRepository(sessionData) {
  let currentParsed = await detectCurrentRepositoryWithHost();
  let currentRepo = currentParsed ? `${currentParsed.owner}/${currentParsed.name}` : null;
  let gitSource = sessionData.session_context.sources.find((source) => source.type === "git_repository");
  if (!gitSource?.url) {
    logForDebugging(
      currentRepo
        ? "Session has no associated repository, proceeding without validation"
        : "Session has no repo requirement and not in git directory, proceeding",
    );
    return {
      status: "no_repo_required",
    };
  }
  let sessionParsed = parseGitRemote(gitSource.url);
  let y = sessionParsed
    ? `${sessionParsed.owner}/${sessionParsed.name}`
    : parseGitHubRepository(gitSource.url);
  if (!y)
    return {
      status: "no_repo_required",
    };
  logForDebugging(`Session is for repository: ${y}, current repo: ${currentRepo ?? "none"}`);
  if (!currentRepo) {
    if (findGitRoot(getCwd())) {
      let remoteUrl = await resolveRemoteUrl(getCwd());
      let G = remoteUrl ? parseRepoSlug(remoteUrl) : null;
      let q = remoteUrl
        ? stripVTControlCharacters(redactGitRemoteCredentials(remoteUrl) ?? "")
            .replace(/[\r\n]+/g, " ")
            .slice(0, 200) || undefined
        : undefined;
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
    return {
      status: "not_in_repo",
      sessionRepo: y,
      sessionHost: sessionParsed?.host,
      currentRepo: null,
    };
  }
  let repoMatch = currentRepo.toLowerCase() === y.toLowerCase();
  let hostMatch =
    !currentParsed ||
    !sessionParsed ||
    portlessHost(currentParsed.host.toLowerCase()) === portlessHost(sessionParsed.host.toLowerCase());
  if (repoMatch && hostMatch)
    return {
      status: "match",
      sessionRepo: y,
      currentRepo,
    };
  if (sessionParsed) {
    let pushRemoteUrl = await resolvePushRemoteUrl(getCwd());
    let G = pushRemoteUrl ? parseGitRemote(pushRemoteUrl) : null;
    if (
      G &&
      portlessHost(G.host.toLowerCase()) === portlessHost(sessionParsed.host.toLowerCase()) &&
      `${G.owner}/${G.name}`.toLowerCase() === y.toLowerCase()
    )
      return {
        status: "match",
        sessionRepo: y,
        currentRepo: `${G.owner}/${G.name}`,
      };
  }
  return {
    status: "mismatch",
    sessionRepo: y,
    currentRepo,
    sessionHost: sessionParsed?.host,
    currentHost: currentParsed?.host,
  };
}
//@ chunk-e6aww6q8.js:1948437-1948699 facade-exports
function formatRepoMismatchDisplay(e) {
  let n =
    e.sessionHost &&
    e.currentHost &&
    portlessHost(e.sessionHost).toLowerCase() !== portlessHost(e.currentHost).toLowerCase();
  return {
    sessionDisplay: n ? `${e.sessionHost}/${e.sessionRepo}` : e.sessionRepo,
    currentDisplay: n ? `${e.currentHost}/${e.currentRepo}` : e.currentRepo,
  };
}
//@ chunk-e6aww6q8.js:1948699-1950938 facade-exports = teleportResumeCodeSession (0.74)
/**
 * 把云端会话拉回本地继续：校验仓库匹配、拉取会话日志、检出对应分支，返回消息与分支。
 */
async function teleportResumeCodeSession(sessionId, onProgress) {
  if (!isFirstPartyProvider())
    throw Error("Cloud sessions are only available on the first-party Anthropic API provider.");
  let r = policyDeniedReason("allow_remote_sessions", "Cloud sessions", "are");
  if (r) {
    logOrgPolicyDenied("allow_remote_sessions", "cloud_session");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      r,
      "allow_remote_sessions policy denied",
    );
  }
  if (env.CLAUDE_CODE_EVAL_CONFINED)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      CLOUD_UNAVAILABLE_IN_EVAL_TEXT,
      "cloud session resume refused in an evaluation run",
    );
  logForDebugging(`Resuming code session ID: ${sessionId}`);
  try {
    let s = isConsoleProfileSessionsCredential();
    let accessToken = await sessionsApiAccessToken(s);
    if (!accessToken) {
      logEvent("tengu_teleport_resume_error", {
        error_type: lit_2("no_access_token"),
      });
      throw Error(cloudSessionsSignInRefusal());
    }
    let orgUUID = await sessionsApiOrganizationUUID(s);
    if (!orgUUID) {
      logEvent("tengu_teleport_resume_error", {
        error_type: lit_2("no_org_uuid"),
      });
      throw Error("Unable to get organization UUID for constructing session URL");
    }
    onProgress?.("validating");
    let sessionData = await fetchSession(sessionId);
    let repoValidation = await validateSessionRepository(sessionData);
    switch (repoValidation.status) {
      case "match":
      case "no_repo_required":
        break;
      case "host_unverified":
        logEvent("tengu_teleport_repo_host_unverified", {
          sessionId: sanitizeMarkName(sessionId),
        });
        break;
      case "not_in_repo": {
        logEvent("tengu_teleport_error_repo_not_in_git_dir_sessions_api", {
          sessionId: sanitizeMarkName(sessionId),
          stage: lit_2("resume_validate"),
        });
        let notInRepoDisplay =
          repoValidation.sessionHost && !isGithubDotCom(repoValidation.sessionHost)
            ? `${repoValidation.sessionHost}/${repoValidation.sessionRepo}`
            : repoValidation.sessionRepo;
        let G = repoValidation.rawRemoteUrl
          ? `
Couldn't parse your git remote: ${repoValidation.rawRemoteUrl}`
          : "";
        throw new TeleportOperationError(
          `You must run claude --teleport ${sessionId} from a checkout of ${notInRepoDisplay}.${G}`,
          sequential.red(`You must run claude --teleport ${sessionId} from a checkout of ${sequential.bold(notInRepoDisplay)}.${G}
`),
        );
      }
      case "mismatch": {
        logEvent("tengu_teleport_error_repo_mismatch_sessions_api", {
          sessionId: sanitizeMarkName(sessionId),
          stage: lit_2("resume_validate"),
        });
        let { sessionDisplay, currentDisplay } = formatRepoMismatchDisplay(repoValidation);
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
        let _exhaustive = repoValidation.status;
        throw Error(`Unhandled repo validation status: ${_exhaustive}`);
      }
    }
    return await teleportFromSessionsAPI(sessionId, orgUUID, accessToken, s, onProgress, sessionData);
  } catch (error) {
    if (error instanceof TeleportOperationError) throw error;
    let err = toError(error);
    logForDebugging(`Failed to resume teleport session ${sessionId}: ${err.message}`, {
      level: "error",
    });
    logEvent("tengu_teleport_resume_error", {
      error_type: lit_2("resume_session_id_catch"),
    });
    throw new TeleportOperationError(
      err.message,
      sequential.red(`Error: ${err.message}
`),
    );
  }
}
//@ chunk-e6aww6q8.js:1950938-1951179 facade-exports = handleTeleportPrerequisites (0.836)
async function handleTeleportPrerequisites(e, n, r) {
  let teleportErrors = await getTeleportErrors(undefined, n);
  if (teleportErrors.size > 0) {
    logEvent("tengu_teleport_errors_detected", {
      error_types: fromEnumArr([...teleportErrors]),
      errors_ignored: fromEnumArr([...n]),
    });
    await r(e, n);
    logEvent("tengu_teleport_errors_resolved", {
      error_types: fromEnumArr([...teleportErrors]),
    });
  }
  return teleportErrors.size > 0;
}
//@ chunk-e6aww6q8.js:1951179-1951567 layout
function logCloudSessionLink(id, source, r, s, storageV5) {
  logEvent("tengu_ccr_session_link", {
    ccr_session_id: sanitizeMarkName(id),
    source: fromEnum(source),
    create_endpoint: fromEnum(s.endpoint),
    grouped: s.grouped,
    create_effort_level: fromEnumOpt(s.effortLevel),
  });
  if (r.project && !getCurrentProjectConfig().hasUsedRemoteSession)
    saveCurrentProjectConfig(
      (y) =>
        y.hasUsedRemoteSession
          ? y
          : {
              ...y,
              hasUsedRemoteSession: true,
            },
      storageV5,
    );
  if (r.global && !getGlobalConfig().hasRemoteEnvironment)
    saveGlobalConfig(
      (y) =>
        y.hasRemoteEnvironment
          ? y
          : {
              ...y,
              hasRemoteEnvironment: true,
            },
      storageV5,
    );
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
};
var RESTRICTED_SESSION_CLOUD_REFUSAL =
  "Cloud sessions cannot be created from a --restricted session: they would not enforce it.";
//@ chunk-e6aww6q8.js:1952235-1952392 facade-exports
function cloudCreateRefusal() {
  if (isRestrictedSession())
    return {
      message: RESTRICTED_SESSION_CLOUD_REFUSAL,
      reason: "restricted_session",
    };
  if (env.CLAUDE_CODE_EVAL_CONFINED)
    return {
      message: CLOUD_UNAVAILABLE_IN_EVAL_TEXT,
      reason: "eval_confined",
    };
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
function normalizeCreateSessionError(reason) {
  if (typeof reason !== "string" || reason === "") return;
  let n = noEnvironmentOverride(reason);
  if (n !== undefined) return n;
  switch (reason) {
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
      return reason;
    default:
      return "other";
  }
}
//@ chunk-e6aww6q8.js:1953275-1953318 layout
function environmentLabelOrKind(e, n) {
  return singleTokenText(e, "") || safeTokenText(n);
}
//@ chunk-e6aww6q8.js:1953318-1953681 layout
function formatEnvironmentRepoMismatch(e, n, r) {
  return e
    ? `This repository needs the environment set up for it, but "${n}" was selected. Select that environment instead, or run from a different repository.`
    : `The selected environment "${n}" only accepts the repository it is set up for, but the source was ${r}. Run this from a checkout of that repository, or select a different environment.`;
}
//@ chunk-e6aww6q8.js:1953681-1955574 facade-exports
async function teleportToRemoteWithErrorHandling(root, n) {
  let s = await handleTeleportPrerequisites(root, new Set(["needsGitStash"]), n.showTeleportErrors);
  let h;
  let y;
  let S = [];
  let failDetail;
  let L = await teleportToRemote({
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
    allowBundle: true,
    firstUpload: n.firstUpload,
    staysAttached: n.staysAttached,
    deferInitialMessage: n.deferInitialMessage,
    forwardHomeSettings: n.forwardHomeSettings,
    ...(n.homeSettingsConsent && {
      homeSettingsConsent: n.homeSettingsConsent,
    }),
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
      y = G;
      process.stderr.write(`
${G}
`);
    },
    onBundleNotice: (G) => {
      S.push(G);
      process.stderr.write(`
${G}
`);
    },
    onCreateFail: (G, q, Z) => {
      h = q;
      y = G;
      failDetail = Z;
      process.stderr.write(`
${G}
`);
    },
  });
  if (L)
    return {
      ok: true,
      session: L,
      notices: S,
    };
  return {
    ok: false,
    failReason: h ?? (n.signal.aborted ? "aborted" : "unknown"),
    failMessage: y,
    failDetail,
  };
}
//@ chunk-e6aww6q8.js:1955574-1956933 facade-exports = teleportFromSessionsAPI (0.864)
/**
 * 从 Sessions API 拉取远程会话的事件日志并转换为本地消息。
 */
async function teleportFromSessionsAPI(sessionId, orgUUID, accessToken, s, onProgress, session) {
  let startTime = Date.now();
  try {
    logForDebugging(`[teleport] Starting fetch for session: ${sessionId}`);
    onProgress?.("fetching_logs");
    let logsStartTime = Date.now();
    let L;
    if (s) L = undefined;
    else if (isPersistentRemoteSessionEnabled()) {
      let { readStoredTrustedDeviceToken } = await import("./chunk-3kb57csj.js");
      L = await readStoredTrustedDeviceToken();
    } else L = (await trustedDeviceHeaders())["X-Trusted-Device-Token"];
    let logs = await checkAdminRequestEligibility(sessionId, accessToken, orgUUID, L);
    if (logs === null) {
      logForDebugging("[teleport] v2 endpoint returned null, trying session-ingress");
      logs = await getSessionLogsViaOAuth(sessionId, accessToken, orgUUID);
    }
    logForDebugging(`[teleport] Session logs fetched in ${Date.now() - logsStartTime}ms`);
    if (logs === null) throw Error("Failed to fetch session logs");
    let filterStartTime = Date.now();
    let messages = logs.filter((entry) => isTranscriptMessage(entry) && !entry.isSidechain);
    logForDebugging(
      `[teleport] Filtered ${logs.length} entries to ${messages.length} messages in ${Date.now() - filterStartTime}ms`,
    );
    onProgress?.("fetching_branch");
    let branch = session ? getBranchFromSession(session) : undefined;
    if (branch) logForDebugging(`[teleport] Found branch: ${branch}`);
    logForDebugging(`[teleport] Total teleportFromSessionsAPI time: ${Date.now() - startTime}ms`);
    return {
      log: messages,
      branch,
      environmentKind: session?.environment_kind,
    };
  } catch (error) {
    if (error instanceof TeleportOperationError) throw error;
    let err = toError(error);
    if (axios_default.isAxiosError(error) && error.response?.status === 404) {
      logEvent("tengu_teleport_error_session_not_found_404", {
        sessionId: sanitizeMarkName(sessionId),
      });
      throw new TeleportOperationError(
        `${sessionId} not found.
Run /status in Claude Code to check your account.`,
        `${sessionId} not found.
${sequential.dim("Run /status in Claude Code to check your account.")}`,
      );
    }
    logError(withTelemetryMessage(toError(err), "Failed to fetch session from Sessions API"));
    throw Error(`Failed to fetch session from Sessions API: ${err.message}`);
  }
}
//@ chunk-e6aww6q8.js:1956933-1959369 facade-exports
async function awaitRemoteSessionResult(e, signal, credentials) {
  if (!isFirstPartyProvider())
    throw Error("Cloud sessions are only available on the first-party Anthropic API provider.");
  let s = 1000;
  let h = 1800000;
  let y = 5;
  let S = 10;
  let w = 3;
  let L = null;
  let G;
  let q;
  let Z = 0;
  let Se = 0;
  let ke = 0;
  let we = 0;
  let Ee;
  let Ae = false;
  let now = Date.now();
  while (Date.now() - now < h) {
    if (signal?.aborted) throw Error("Workflow aborted");
    let ze = await pollRemoteSessionEvents(e, L, {
      credentials,
    });
    L = ze.lastEventId;
    for (let newEvent of ze.newEvents)
      if (newEvent.type === "assistant") {
        G = newEvent;
        for (let Je of newEvent.message.content) if (Je.type === "tool_use") Z++;
      } else if (newEvent.type === "result") q = newEvent;
    if (ze.sessionStatus === "archived") {
      Ae = true;
      break;
    }
    if (ze.sessionStatus === "requires_action") {
      let pendingAction = ze.pendingAction;
      let now = Date.now();
      if (pendingAction?.name === MCP_ELICITATION_DIALOG_TOOL) {
        we = 0;
        if (Ee === undefined || Ee.requestId !== pendingAction.request_id)
          Ee = {
            requestId: pendingAction.request_id,
            firstSeenAt: now,
          };
        else if (now - Ee.firstSeenAt >= MCP_QUESTION_GRACE_MS)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Cloud session ${e} has shown an unanswered MCP server question for more than ${MCP_QUESTION_GRACE_MS / 60000} min, and nothing on this machine can answer it, so this run stopped waiting for it. If that server needs to ask the user things, run this agent locally rather than as a cloud session.`,
            "gave up waiting on a cloud session parked on an MCP server question",
          );
      } else {
        if (pendingAction === undefined) we++;
        if (pendingAction !== undefined || we >= w)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Cloud session ${e} is waiting for input that nothing on this machine can give (a permission prompt, a question, or some other dialog). If it is a permission prompt, make sure the cloud agent's allowed_tools cover the tool, or use a permission mode that doesn't prompt; if it is a question, tell the agent in its prompt not to ask one.`,
            "gave up on a cloud session parked on a prompt nothing here answers",
          );
      }
    } else if (ze.sessionStatus !== undefined) {
      we = 0;
      Ee = undefined;
    }
    if (ze.sessionStatus === undefined) {
      ke++;
      if (ke >= S)
        throw Error(
          `Cloud session ${e}: fetchSession failed ${S} times in a row (last error: ${ze.metadataFetchError ?? "unknown"}). Bailing instead of polling to the 30-min timeout.`,
        );
    } else ke = 0;
    if (ze.sessionStatus === "idle" && ze.newEvents.length === 0) {
      Se++;
      if (Se >= y) {
        Ae = true;
        break;
      }
    } else Se = 0;
    await sleep(s, signal);
  }
  if (!Ae)
    throw Error(
      `Cloud session ${e} timed out after ${h / 60000} min` +
        (Ee !== undefined ? ", still waiting for someone to answer an MCP server's question" : ""),
    );
  let text =
    G && G.type === "assistant"
      ? extractTextContent_2(
          G.message.content,
          `
`,
        )
      : "";
  let We = q && q.type === "result" ? q : undefined;
  return {
    text,
    structuredOutput: We?.subtype === "success" ? We.structured_output : undefined,
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
  if (e.thinking && (e.thinking.maxThinkingTokens !== undefined || e.thinking.display !== undefined))
    n.push({
      type: "event",
      data: {
        type: "control_request",
        request_id: `set-thinking-${randomUUID()}`,
        request: {
          subtype: "set_max_thinking_tokens",
          ...(e.thinking.maxThinkingTokens !== undefined && {
            max_thinking_tokens: e.thinking.maxThinkingTokens,
          }),
          ...(e.thinking.display !== undefined && {
            thinking_display: e.thinking.display,
          }),
        },
      },
    });
  if (e.proactivityLevel)
    n.push({
      type: "event",
      data: {
        type: "control_request",
        request_id: `set-level-${randomUUID()}`,
        request: {
          subtype: "set_proactivity_level",
          level: e.proactivityLevel,
          offer_bypass: false,
        },
      },
    });
  if (e.permissionMode)
    n.push(
      setModeControlEvent(e.permissionMode, {
        ultraplan: e.ultraplan,
        isFromSettings: e.isModeFromSettings,
      }),
    );
  if (!getIsNonInteractiveSession() && isFocusModeEnabled())
    n.push({
      type: "event",
      data: {
        type: "control_request",
        request_id: `apply-flag-settings-${randomUUID()}`,
        request: {
          subtype: "apply_flag_settings",
          settings: {
            viewMode: "focus",
          },
        },
      },
    });
  let configuredAdvisorModel = getConfiguredAdvisorModel();
  if (configuredAdvisorModel)
    n.push({
      type: "event",
      data: {
        type: "control_request",
        request_id: `apply-flag-settings-${randomUUID()}`,
        request: {
          subtype: "apply_flag_settings",
          settings: {
            advisorModel: configuredAdvisorModel,
          },
        },
      },
    });
  if (e.title)
    n.push({
      type: "event",
      data: buildRenameSessionRequest(e.title),
    });
  if (
    typeof e.initialMessage === "string" ? e.initialMessage : e.initialMessage && e.initialMessage.length > 0
  )
    n.push({
      type: "event",
      data: {
        uuid: e.initialMessageUuid ?? randomUUID(),
        session_id: "",
        type: "user",
        parent_tool_use_id: null,
        message: {
          role: "user",
          content: e.initialMessage,
        },
      },
    });
  return n;
}
//@ chunk-e6aww6q8.js:1960745-1961200 layout
/**
 * 把本地选项映射为远程会话配置（custom_system_prompt、max_turns、max_budget_usd、allowed_tools、disallowed_tools、builtin_tools…）。
 */
function buildRemoteSessionConfig(options) {
  return {
    ...(options.customSystemPrompt && {
      custom_system_prompt: options.customSystemPrompt,
    }),
    ...(options.maxTurns !== undefined && {
      max_turns: options.maxTurns,
    }),
    ...(options.maxBudgetUsd !== undefined &&
      options.maxBudgetUsd > 0 && {
        max_budget_usd: options.maxBudgetUsd,
      }),
    ...(options.allowedTools &&
      options.allowedTools.length > 0 && {
        allowed_tools: options.allowedTools,
      }),
    ...(options.disallowedTools &&
      options.disallowedTools.length > 0 && {
        disallowed_tools: options.disallowedTools,
      }),
    ...(options.builtinTools &&
      options.builtinTools.length > 0 && {
        builtin_tools: options.builtinTools,
      }),
  };
}
//@ chunk-e6aww6q8.js:1961200-1961357 layout
function deferredFirstPrompt(initialControlEvents, initialMessage) {
  let uuid = initialControlEvents.find((s) => s.data.type === "user")?.data.uuid;
  return initialMessage !== null && typeof uuid === "string"
    ? {
        content: initialMessage,
        uuid,
        followsPermissionMode: true,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:1961357-1961522 layout
function builtinToolsFirstPrompt(options, initialMessage) {
  let r =
    typeof initialMessage === "string"
      ? initialMessage !== ""
      : initialMessage !== null && initialMessage.length > 0;
  return (options.builtinTools?.length ?? 0) > 0 && r && initialMessage
    ? {
        content: initialMessage,
        uuid: options.initialMessageUuid ?? randomUUID(),
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:1961522-1962589 layout
async function createRemoteSession(e) {
  let { options, sessionId, held, createEndpoint, signal, bound, pool } = e;
  if ((options.builtinTools ?? []).length === 0)
    return {
      ok: true,
      withheld: undefined,
    };
  if (isDeduplicatedCreateResponse(e.responseData)) {
    logBuiltinToolsCreate("earlier_session", pool);
    options.onCreateFail?.(
      duplicateSessionMessage({
        sessionUrl: getRemoteSessionUrl(sessionId),
        promptHeld: held !== undefined,
      }),
      "builtin_tools_earlier_session",
      {
        endpoint: createEndpoint,
        sessionArchived: false,
      },
    );
    return {
      ok: false,
    };
  }
  let G = async () => ({
    archived: await archiveRemoteSession(sessionId),
    sessionUrl: getRemoteSessionUrl(sessionId),
  });
  if (held === undefined) {
    logBuiltinToolsCreate("created", pool);
    return {
      ok: true,
      withheld: undefined,
    };
  }
  if (options.deferInitialMessage === true) {
    logBuiltinToolsCreate("created", pool);
    return {
      ok: true,
      withheld: {
        ...held,
        ...((bound || e.firstPromptDeferred) && {
          followsPermissionMode: true,
        }),
        ...(!e.followsUploads &&
          !e.firstPromptDeferred && {
            heldOnlyForToolsCheck: true,
          }),
      },
    };
  }
  if (signal.aborted) {
    await G();
    throw new AbortError_2();
  }
  let q = await raceWithAbortSignal(
    sendEventToRemoteSession(sessionId, held.content, {
      uuid: held.uuid,
    }),
    signal,
    () => new AbortError_2(),
  ).catch(async (error) => {
    await G();
    throw error;
  });
  let Z = classifyPromptSendResult(q);
  if (Z.kind !== "sent") {
    let Se = await G();
    if (signal.aborted) throw new AbortError_2();
    logBuiltinToolsCreate(`prompt_${Z.kind}`, pool);
    options.onCreateFail?.(archiveCloudSession(Z, Se), "first_prompt_not_sent", {
      endpoint: createEndpoint,
      sessionArchived: Se.archived,
    });
    return {
      ok: false,
    };
  }
  logBuiltinToolsCreate("created", pool);
  return {
    ok: true,
    withheld: undefined,
  };
}
//@ chunk-e6aww6q8.js:1962589-1962818 layout
/**
 * 远程会话带内置工具时检查设备绑定前提（cnn）：不满足则记录结果、调用 onCreateFail 并返回 true（终止创建）。
 */
function refuseBuiltinToolsCreate(options, n) {
  let r =
    (options.builtinTools?.length ?? 0) > 0
      ? unsupportedEnvironmentOutcome(n, options.deviceBinding?.abandonsUnbound === true)
      : null;
  if (r === null) return false;
  logBuiltinToolsCreate(r.outcome, n === "self_hosted_pool");
  options.onCreateFail?.(r.message, `builtin_tools_${r.outcome}`);
  return true;
}
//@ chunk-e6aww6q8.js:1962818-1962944 layout
function buildRenameSessionRequest(title) {
  return {
    type: "control_request",
    request_id: `rename-session-${randomUUID()}`,
    request: {
      subtype: "rename_session",
      title,
    },
  };
}
//@ chunk-e6aww6q8.js:1962944-1963280 layout
/**
 * 绑定设备的远程会话创建后，用设备事件签名器发送 rename_session 控制请求固定标题，记 tengu_device_bind_title_latched。
 */
async function latchBoundSessionTitle(id, title, r, credentials, h) {
  let eventSigner =
    r === undefined
      ? undefined
      : import("./chunk-pesgm5d3.js").then(
          ({ deviceEventSignerFor }) => deviceEventSignerFor(r, credentials, h),
          reportSignerLoadFailure,
        );
  let S = await sendControlRequestToRemoteSession(id, buildRenameSessionRequest(title), {
    eventSigner,
  }).catch((error) => ({
    ok: false,
    reason: errorMessage(error),
  }));
  logEvent("tengu_device_bind_title_latched", {
    success: S.ok,
  });
  if (!S.ok) logForDebugging(`[deviceBind] rename_session after bound create failed: ${S.reason}`);
}
//@ chunk-e6aww6q8.js:1963280-1963434 layout
function extractTextContent(initialMessage) {
  if (typeof initialMessage === "string") return initialMessage;
  if (!initialMessage) return "";
  return initialMessage
    .filter((n) => n.type === "text" && typeof n.text === "string")
    .map((n) => n.text)
    .join(" ");
}
//@ chunk-e6aww6q8.js:1963434-1963685 layout
async function isDriftingTwilightEnabled() {
  try {
    if (!DEVICE_BINDING_CREATE_ENABLED) return await checkGate_CACHED_OR_BLOCKING(TENGU_DRIFTING_TWILIGHT);
    let e = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_DRIFTING_TWILIGHT, true);
    if (e.source !== "fallback") return e.value !== false;
    return (await getDynamicConfig_BLOCKS_ON_INIT(TENGU_DRIFTING_TWILIGHT, true)) !== false;
  } catch (error) {
    logForDebugging(
      `[teleportToRemote] reading ${TENGU_DRIFTING_TWILIGHT} threw ${toError(error).name}: using the in-code default`,
    );
    return DEVICE_BINDING_CREATE_ENABLED;
  }
}
//@ chunk-e6aww6q8.js:1963685-1963707 facade-exports
function launchReadsOnlyTags() {
  return;
}
//@ chunk-e6aww6q8.js:1963707-1964119 layout
async function prepareDeviceBinding(deviceBinding, n, r, s, correlationId, credentials, S, w) {
  if (!deviceBinding) return;
  if (n !== "v1alpha2") return skipDeviceBinding("endpoint");
  if (r && isCcpoolId(r)) return skipDeviceBinding("pool");
  if (s === "byoc" || s === "bridge") return skipDeviceBinding("environment");
  if (correlationId) return skipDeviceBinding("correlation");
  if (w) return skipDeviceBinding("profile");
  let { prepareDeviceBinder } = await import("./chunk-f13hjmxp.js");
  return prepareDeviceBinder({
    orgUuid: deviceBinding.orgUuid,
    accountUuid: deviceBinding.accountUuid,
    credentials,
    confirmReenroll: deviceBinding.confirmReenroll,
    isEnabled: () => S,
  });
}
//@ chunk-e6aww6q8.js:1964119-1964192 layout
function skipDeviceBinding(e) {
  logEvent("tengu_device_bind_skipped", {
    reason: fromEnum(e),
  });
  return err_2(e);
}
//@ chunk-e6aww6q8.js:1964192-1964431 layout
function reportDeviceBindOutcome(deviceBinding, n, id, storageV5) {
  if (!deviceBinding || !n) return;
  if (n.ok) deviceBinding.onBound?.(n.value);
  else {
    deviceBinding.onUnbound?.(n.error);
    if (classifyDeviceBindingBlocker(n.error))
      import("./chunk-wbmm3v80.js").then(
        ({ rememberUnboundCreate, productionUnboundCreatesDeps }) =>
          rememberUnboundCreate(id, n.error, productionUnboundCreatesDeps(storageV5)),
        () => {
          return;
        },
      );
  }
}
//@ chunk-e6aww6q8.js:1964431-1964480 layout
function isBindableStatus(status) {
  return status === 400 || status === 403 || status === 404;
}
//@ chunk-e6aww6q8.js:1964480-1964655 layout
var DEVICE_BIND_REFUSAL_REASONS_2 = [
  "bind_attestation_stale",
  "bound_session_unattested_write",
  "untrusted_device",
  "target_device_unsupported",
  "target_device_requires_account",
  "invalid_target_device_id",
];
//@ chunk-e6aww6q8.js:1964655-1964694 layout
function isDeviceBindRefusalReason(e) {
  return DEVICE_BIND_REFUSAL_REASONS_2.includes(e);
}
//@ chunk-e6aww6q8.js:1964694-1964847 layout
function getDeviceBindRefusal(e) {
  let error = e?.error;
  let filtered = [error?.resource, error?.reason].filter((s) => typeof s === "string" && s.length > 0);
  if (filtered.length === 0) return;
  return filtered.find(isDeviceBindRefusalReason) ?? "other";
}
//@ chunk-e6aww6q8.js:1964847-1964950 layout
function deviceBindFailureKind(status, deviceBindRefusal) {
  if (deviceBindRefusal !== undefined && deviceBindRefusal !== "other") return deviceBindRefusal;
  return status === 404 ? "device_unknown" : "create_refused";
}
//@ chunk-e6aww6q8.js:1964950-1965052 layout
function getBoundDeviceUuid(e) {
  let boundDeviceUuid = e?.session?.bound_device_uuid;
  return typeof boundDeviceUuid === "string" ? boundDeviceUuid.toLowerCase() : undefined;
}
//@ chunk-e6aww6q8.js:1965052-1965967 layout
/**
 * 带设备绑定创建远程会话：未准备好或签名失败时按普通方式 POST；否则记丢弃的环境变量/事件、决定是否提升安全级别与推迟首条提示、
 * 准备 repositories_trusted，再交给 postBoundCreate 发送。返回 {response, bind, attested, firstPromptDeferred}。
 */
async function createWithDeviceBinding(request) {
  let { prepared, buildBody, drops, callerSendsFirstPrompt, post } = request;
  if (!prepared?.ok)
    return {
      response: await post(buildBody(undefined)),
      bind: prepared,
      attested: false,
      firstPromptDeferred: false,
    };
  let binder = prepared.value;
  let attestation = await binder.sign();
  if (!attestation)
    return {
      response: await post(buildBody(undefined)),
      bind: err_2("sign"),
      attested: false,
      firstPromptDeferred: false,
    };
  logEvent("tengu_device_bind_prepared", {
    dropped_env_vars: drops.envVars,
    dropped_events: drops.events.length,
  });
  let L = [...(drops.envVars ? ["environment_variables"] : []), ...drops.events];
  if (L.length > 0) logForDebugging(`[deviceBind] bound create dropped ${L.join(", ")}`);
  let securityAsk = await planTrustedDeviceProof();
  let deferFirstPrompt = callerSendsFirstPrompt && isTrustedDeviceProofActive(securityAsk);
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
    attestation,
    held: binder.held,
    binder,
  });
}
//@ chunk-e6aww6q8.js:1965967-1966377 layout
/**
 * 发送带 repositories_trusted 的创建请求；4xx（非可重试）时记录拒绝原因并去掉该字段重发。
 */
async function postWithRepoTrustRetry(post, buildBody, proofHeaders, trust, refusalOut) {
  if (trust.kind !== "send" || refusalOut.refusal !== undefined) return post(buildBody(), proofHeaders);
  let y = await post(buildBody(true), {
    ...proofHeaders,
    ...trust.proofHeaders,
  });
  if (y.status < 400 || y.status >= 500 || isCloudLaunchError(y.data)) return y;
  let S = requestRepositoriesTrusted(y.data);
  if (S === "unnamed" && proofHeaders !== undefined && requestSecurityTier(y.data) !== "refused") return y;
  refusalOut.refusal = S;
  logForDebugging(
    `[deviceBind] the create that carried repositories_trusted got ${y.status} (${S}); repeating it without the field`,
  );
  return post(buildBody(), proofHeaders);
}
//@ chunk-e6aww6q8.js:1966377-1968820 layout
/**
 * 发送设备绑定的创建请求：可选种子签封（TENGU_BUZZING_RIVER），请求提升安全级别被 4xx 拒绝时去掉 ask 重发；成功后记安全级别与仓库信任结果，
 * 并核对返回的绑定设备 uuid 是否与签名设备一致（不一致或失败时尝试重新注册）。
 */
async function postBoundCreate({ buildBody, post }, bindState) {
  let { ask, trust, firstPromptDeferred, attestation, held, binder } = bindState;
  let sealBody =
    held !== undefined &&
    readFlagWithOverride(TENGU_BUZZING_RIVER, {
      safe: false,
    })
      ? await import("./chunk-j2e9tjav.js").then(
          (Ae) =>
            Ae.createSeedSealer({
              attestation,
              key: held.key,
              sample: buildBody(attestation, undefined, firstPromptDeferred),
            }),
          () => {
            logFeatureSad("create_seed_signature", "module_load_failed");
            return;
          },
        )
      : undefined;
  let refusalOut = {};
  let response = await postWithRepoTrustRetry(
    post,
    (Ae) => {
      let body = buildBody(attestation, ask.kind === "ask" ? true : undefined, firstPromptDeferred, Ae);
      return sealBody?.(body) ?? body;
    },
    ask.kind === "ask" ? ask.proofHeaders : undefined,
    trust,
    refusalOut,
  );
  let Se;
  if (
    ask.kind === "ask" &&
    response.status >= 400 &&
    response.status < 500 &&
    !isCloudLaunchError(response.data)
  ) {
    Se = requestSecurityTier(response.data);
    logForDebugging(
      `[deviceBind] the create that asked for the elevated tier got ${response.status} (${Se}); repeating the bound create without the ask`,
    );
    response = await postWithRepoTrustRetry(
      post,
      (Ae) => {
        let body = buildBody(attestation, undefined, firstPromptDeferred, Ae);
        return sealBody?.(body) ?? body;
      },
      undefined,
      trust,
      refusalOut,
    );
  }
  if (response.status === 200 || response.status === 201) {
    if (ask.kind === "no_token") logSecurityTierOutcome("skipped_no_token");
    else if (ask.kind === "ask")
      logSecurityTierOutcome(
        Se ?? (securityTierOfResponse(response.data) === "elevated" ? "honored" : "not_honored"),
      );
    if (trust.kind === "not_sent") logTrustedRepositoriesOutcome(trust);
    else if (trust.kind === "send") {
      let Ae =
        refusalOut.refusal === undefined
          ? {
              kind: "sent",
              covers: trust.covers,
            }
          : {
              kind: "refused_then_retried",
              covers: trust.covers,
              refusal: refusalOut.refusal,
            };
      logTrustedRepositoriesOutcome(Ae);
      logForDebugging(
        `[deviceBind] repositories_trusted on the create that made the session: ${Ae.kind} (covers the ${trust.covers})`,
      );
    }
    if (getBoundDeviceUuid(response.data) === attestation.deviceUUID.toLowerCase()) {
      logFeatureOk("device_bind_session");
      return {
        response,
        bind: ok_2(attestation.deviceUUID),
        ...(held !== undefined && {
          held,
        }),
        attested: true,
        firstPromptDeferred,
      };
    }
    logEvent("tengu_device_bind_failed", {
      phase: lit_2("create"),
      status: response.status,
      reason: lit_2("silent_drop"),
    });
    logFeatureSad("device_bind_session", "silent_drop");
    logForDebugging(
      "[deviceBind] create returned 200 but the session is not bound to this device; continuing unbound",
    );
    return {
      response,
      bind: err_2("silent_drop"),
      attested: true,
      firstPromptDeferred,
    };
  }
  if (!isBindableStatus(response.status) || isCloudLaunchError(response.data))
    return {
      response,
      attested: true,
      firstPromptDeferred,
    };
  let deviceBindRefusal = getDeviceBindRefusal(response.data);
  logEvent("tengu_device_bind_failed", {
    phase: lit_2("create"),
    status: response.status,
    ...(deviceBindRefusal !== undefined && {
      reason: fromEnum(deviceBindRefusal),
    }),
  });
  logForDebugging(
    `[deviceBind] create refused the binding (${response.status}${deviceBindRefusal ? ` ${deviceBindRefusal}` : ""})`,
  );
  let we = response.status === 404 && binder ? await reregisterDevice(binder) : undefined;
  if (we?.ok) {
    logForDebugging("[deviceBind] registered again as a different device row; repeating the bound create");
    return postBoundCreate(
      {
        buildBody,
        post,
      },
      {
        ask,
        trust,
        firstPromptDeferred,
        ...we.value,
      },
    );
  }
  logForDebugging("[deviceBind] retrying the create unbound");
  let Ee = await post(buildBody(undefined));
  if (Ee.status === 200 || Ee.status === 201)
    logFeatureSad("device_bind_session", we?.error ?? deviceBindRefusal ?? "create_refused");
  return {
    response: Ee,
    bind: err_2(we?.error ?? deviceBindFailureKind(response.status, deviceBindRefusal)),
    attested: false,
    firstPromptDeferred: false,
  };
}
//@ chunk-e6aww6q8.js:1968820-1969140 layout
/**
 * 设备绑定被拒后重新注册设备：得到同一设备行时放弃；否则签名生成证明，返回证明与持有状态。
 */
async function reregisterDevice(binder) {
  let n = await binder.reregister();
  if (!n.ok) return n;
  if (n.value.deviceUUID === binder.deviceUUID) {
    logForDebugging(
      "[deviceBind] registering again returned the same device row the create refused; nothing new to try",
    );
    return err_2(undefined);
  }
  let r = await n.value.sign();
  return r === undefined
    ? err_2("sign")
    : ok_2({
        attestation: r,
        held: n.value.held,
      });
}
//@ chunk-e6aww6q8.js:1969140-1969577 layout
/**
 * 创建远程会话时动态加载并运行主目录种子（runHomeSeed，trigger=create），规划失败时视为 none；出错记录日志并返回 undefined。
 */
async function runCreateHomeSeed({
  sessionId,
  planning,
  boundDeviceUuid,
  held,
  launchConsent,
  signal,
  credentials,
  storageV5,
}) {
  try {
    let { runHomeSeed } = await import("./chunk-6qze3ysr.js");
    return runHomeSeed({
      sessionId,
      plan: planning.then(
        (G) =>
          G ?? {
            kind: "none",
            reason: "failed",
          },
      ),
      bound: boundDeviceUuid !== undefined,
      boundDeviceUuid,
      ...(held !== undefined && {
        held,
      }),
      trigger: "create",
      launchConsent,
      isProjectStillSynced: () => isContainerSyncEnvironment(true),
      signal,
      credentials,
      storageV5,
    });
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:1969577-1969671 layout
function describedTarget({ branch, commit }, name) {
  return branch !== null ? `${name}/${printableText(branch)}` : `commit ${commit.slice(0, 12)}`;
}
//@ chunk-e6aww6q8.js:1969671-1969698 layout
function emptyRequestOptions(e, n) {
  return {};
}
//@ chunk-e6aww6q8.js:1969698-1970617 layout
/**
 * 打包上传前解析 Read 规则与沙箱设置，得出哪些文件内容需要扣留（withholdFor）、哪些永不读取（neverReadFor）；规则不可读时提示并只上传已提交内容。
 */
function resolveBundleReadRules(withholding, warn, countFromOutsideRoot) {
  let s = withholding ? collectLaunchRules() : null;
  let isCredentialListCountedFromOutsideRoot = s !== null && countFromOutsideRoot;
  let { withholdFor, neverReadFor, rulesUnreadable, unreadableSettingsFiles } = s
    ? classifySyncedFileSensitivity(
        resolveUploadFilterRules({
          launchRules: s,
        }),
        {
          isCredentialListCountedFromOutsideRoot,
          onLaunchPlaceUnknown: onceExport(() =>
            warn?.(
              "The folder Claude Code was started in cannot be reached, so uncommitted file contents stay on this machine. Restart Claude Code inside the repository to send them.",
            ),
          ),
        },
      )
    : launchRuleSensitivity();
  logEvent("tengu_teleport_bundle_read_rules", {
    state: lit_2(rulesUnreadable ? "unreadable" : "applied"),
    withholding,
    ...{},
  });
  if (!s)
    return {
      neverReadFor,
    };
  if (rulesUnreadable) {
    let G = settingsReadErrorsSuffix(unreadableSettingsFiles);
    let q =
      G === ""
        ? "A settings file has errors, so your Read rules and sandbox settings could not all be read (see /status)"
        : `Your Read rules and sandbox settings could not all be read${G}`;
    warn?.(
      `${q}: uncommitted file contents are left out of this upload; the cloud session starts from what is committed.`,
    );
  }
  return {
    withholdFor,
    neverReadFor: classifySyncedFileSensitivity(s, {
      onlyAsLaunched: true,
    }).neverReadFor,
  };
}
//@ chunk-e6aww6q8.js:1970617-1970795 layout
function launchRuleSensitivity(e) {
  try {
    return classifySyncedFileSensitivity(collectLaunchRules(), {
      onlyAsLaunched: true,
    });
  } catch (error) {
    logError(error);
    let r = async () => () => true;
    return {
      withholdFor: r,
      neverReadFor: r,
      rulesUnreadable: true,
      unreadableSettingsFiles: [],
    };
  }
}
//@ chunk-e6aww6q8.js:1970795-1970855 layout
function noBundleReadRefusal(e, n) {
  return {
    refusal: null,
    notRuledOutBy: undefined,
  };
}
//@ chunk-e6aww6q8.js:1970855-1973070 layout
async function uploadGitBundleForSession(e, n, r, s = null, h = "session") {
  let {
    createAndUploadGitBundle,
    explainPreviousCaptureRetired,
    handBackDecision,
    previousCaptureServes,
    unsupportedLayoutNotice,
  } = await import("./chunk-g3ge6yrz.js");
  let q = noBundleReadRefusal(n.cwd ?? getCwd(), h);
  if (q.refusal !== null) return q.refusal;
  let Z = {
    ...n,
    notRuledOutBy: q.notRuledOutBy,
  };
  let Se = await createAndUploadGitBundle(e, Z);
  if (
    Z.hardenForDeviceSessions === true ||
    Se.success ||
    Se.failReason !== "unsupported_layout" ||
    r === null ||
    Z.signal?.aborted
  )
    return Se;
  if (!previousCaptureServes()) {
    logEvent("tengu_ccr_bundle_upload", {
      outcome: lit_2("fallback_retired"),
      layout_kind: fromEnum(Se.layoutKind),
      github_start_obstacle: fromEnumOpt(s?.kind),
      ...(Se.gitFileKind !== undefined && {
        git_file_kind: fromEnum(Se.gitFileKind),
      }),
    });
    logFeatureBad("teleport_git_bundle_upload", "fallback_retired");
    return {
      success: false,
      error: `${Se.error} ${explainPreviousCaptureRetired(s)}`,
      failReason: "refused",
    };
  }
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
    logEvent("tengu_ccr_bundle_upload", {
      outcome: fromEnum(Ee),
      layout_kind: fromEnum(Se.layoutKind),
      legacy_bundle: true,
      credential_named_wip: ke.named,
      credential_named_added: ke.added,
      refused_unexamined: ke.unexamined,
      registered_gitlinks: ke.gitlinks,
      ...(ke.indexCopyCause !== undefined && {
        index_copy_cause: fromEnum(ke.indexCopyCause),
      }),
    });
    logFeatureBad(
      "teleport_git_bundle_upload",
      Ee === "fallback_refused_credential_named" ? "uncommitted_credentials" : Ee,
    );
    return {
      success: false,
      error: `${Se.error} ${ke.sentence}`,
      failReason: "uncommitted_credentials",
    };
  }
  let we;
  try {
    logEvent("tengu_ccr_bundle_upload", {
      outcome: lit_2("fallback_legacy_capture"),
      layout_kind: fromEnum(Se.layoutKind),
      ...(Se.gitFileKind !== undefined && {
        git_file_kind: fromEnum(Se.gitFileKind),
      }),
      legacy_bundle: true,
    });
    r?.(unsupportedLayoutNotice(Se.layoutKind));
    we = await createAndUploadGitBundle(e, {
      ...Z,
      hardenForDeviceSessions: false,
      refuseCredentialNamedInStash: true,
      pinnedIndexFile: ke.pinnedIndex?.path,
    });
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
async function getCloudSessionAccessToken(credentials, storageV5) {
  await checkAndRefreshOAuthTokenIfNeeded({
    credentials,
    storageV5,
  });
  return (await ensureHostSessionsBearer()) ?? getAccessTokenWithCcrFallback();
}
//@ chunk-e6aww6q8.js:1973156-1973235 layout
async function hasRecoveredBearer(e, n) {
  return (await recoverHostSessionsBearer(e, n ? "withheld" : "refused")) !== "not_held";
}
//@ chunk-e6aww6q8.js:1973235-2009090 facade-exports = teleportToRemote (0.247)
/**
 * 创建云端会话（Claude Code on the web）：检查第一方与策略 allow_remote_sessions、选择环境、打包/上传 git 状态、绑定设备，POST /v1/code/sessions 并发送初始消息与控制事件。
 */
async function teleportToRemote(options) {
  let { initialMessage, signal } = options;
  let s = options.cwd ?? getCwd();
  let h = false;
  let y = false;
  let S = [];
  let w = S.length === 0 ? options.tags : [...(options.tags ?? []), ...S];
  let L = options.connectedSession === undefined ? undefined : Promise.resolve(options.connectedSession);
  let G = () => (L ??= sensitivePathGateEnabled());
  let q;
  let Z = () => (q ??= G().then((Zt) => isProjectSessionBindable(Zt, undefined)));
  let Se;
  let ke = () => (Se ??= false);
  let we;
  let Ee = () => {
    throw Error("unreachable");
  };
  let Ae = async () => false;
  let Ie;
  let Me = () =>
    (Ie ??= isViolinWoodEnabled()
      .catch(() => false)
      .then(async (Zt) => Zt || (await G())));
  let We = async () => true;
  let ze = policyDeniedReason("allow_remote_sessions", "Cloud sessions", "are");
  if (ze) {
    logOrgPolicyDenied("allow_remote_sessions", "cloud_session");
    options.onCreateFail?.(ze, "policy_denied");
    return null;
  }
  let lt = cloudCreateRefusal();
  if (lt !== null) {
    options.onCreateFail?.(lt.message, lt.reason);
    return null;
  }
  if (options.builtinTools?.length === 0) {
    logBuiltinToolsCreate("empty_list");
    options.onCreateFail?.(CLOUD_LAUNCH_TOOL_ERRORS_2, "builtin_tools_empty");
    return null;
  }
  await settleStoredLoginRefusal({
    isFilesDial: true,
    signal: options.signal,
  });
  if (!isFirstPartyProvider()) {
    options.onCreateFail?.(
      "Cloud sessions are only available on the first-party Anthropic API provider.",
      "not_first_party",
    );
    return null;
  }
  let { deletedHereNotice, leftOutNotice, probeRepoBundleSize, repositorySetBundleSwitches } =
    await import("./chunk-g3ge6yrz.js");
  let yt = null;
  let gt = null;
  let At = [];
  let It = false;
  let Yt = null;
  let qt = false;
  try {
    options.onProgress?.({
      kind: "checking",
      ...(findGitRoot(s) === null && {
        folder: true,
      }),
    });
    let Zt = false;
    let rn = options.poolId ?? options.chosenEnvironment?.environment_id;
    let pn =
      rn !== undefined
        ? {
            id: rn,
            source: undefined,
            ignoredUntrustedPool: undefined,
          }
        : Zt
          ? {
              id: undefined,
              source: undefined,
              ignoredUntrustedPool: undefined,
            }
          : getEnvironmentSelectionInfo();
    let no = null;
    let hn = null;
    let ho = isCcpoolId(options.environmentId ? options.environmentId : pn.id);
    let Kn =
      (Object.keys(options.environmentVariables ?? {}).length === 0 && (await G())) ||
      ((options.source === "ultrareview" || options.source === "ultraplan") &&
        (await checkGate_CACHED_OR_BLOCKING(TENGU_WOVEN_HARBOR))) ||
      (ho && (await isDriftingTwilightEnabled()))
        ? "v1alpha2"
        : "v1";
    if (options.sessionGroupingId && Kn !== "v1alpha2") {
      options.onCreateFail?.(
        "--project requires the new session-create endpoint, which isn't enabled for your account yet \u2014 no session was created.",
        "project_not_enabled",
        {
          endpoint: Kn,
        },
      );
      return null;
    }
    if (options.agentId && Kn !== "v1alpha2") {
      options.onCreateFail?.(
        "Dispatching into a Kindling project requires the new session-create endpoint, which isn't enabled for your account yet \u2014 no session was created.",
        "agent_not_enabled",
        {
          endpoint: Kn,
        },
      );
      return null;
    }
    if (options.deviceBinding && options.sessionGroupingId) {
      options.onCreateFail?.(
        "--project cannot be combined with a device-bound session yet \u2014 no session was created.",
        "device_bind_project_unsupported",
        {
          endpoint: Kn,
        },
      );
      return null;
    }
    if (options.deviceBinding && options.agentId) {
      options.onCreateFail?.(
        "An agent-owned session cannot be combined with a device-bound session yet \u2014 no session was created.",
        "device_bind_agent_unsupported",
        {
          endpoint: Kn,
        },
      );
      return null;
    }
    if (
      options.deviceBinding &&
      options.deferInitialMessage !== true &&
      builtinToolsFirstPrompt(options, initialMessage) !== undefined
    ) {
      logBuiltinToolsCreate("bound_prompt_not_deferred");
      options.onCreateFail?.(CLOUD_LAUNCH_TOOL_ERRORS, "device_bind_tools_prompt_unsupported", {
        endpoint: Kn,
      });
      return null;
    }
    let Xn;
    let fo;
    let profile = isConsoleProfileSessionsCredential();
    if (profile) {
      try {
        Xn = await resolveConsoleProfileBearer({
          credentials: options.credentials,
          signIn: options.personAskedForSession === true,
        });
      } catch (error) {
        if (!(error instanceof ConsoleProfileCloudSessionsError)) throw error;
        logForDebugging(error.message, {
          level: "error",
        });
        options.onCreateFail?.(error.message, "console_profile_refused");
        return null;
      }
      fo = Xn;
    } else {
      Xn = await getCloudSessionAccessToken(options.credentials, options.storageV5);
      fo = getAccessTokenWithCcrFallback();
    }
    let isStoredLogin = !profile;
    if (!Xn || !fo) {
      let ma =
        "Cloud sessions require a claude.ai login. Run /login to authenticate." +
        (env.CLAUDE_CODE_REMOTE
          ? ` (in CCR: env=${env.CLAUDE_CODE_OAUTH_TOKEN ? "set" : "unset"}, fd=${env.CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR ? "set" : "unset"})`
          : "");
      logError(Error(ma));
      options.onCreateFail?.(ma, "no_access_token");
      return null;
    }
    let vn = await sessionsApiOrganizationUUID(profile);
    if (!vn) {
      let ma =
        "Unable to get organization UUID for cloud session creation" +
        (env.CLAUDE_CODE_REMOTE
          ? ` (in CCR: CLAUDE_CODE_ORGANIZATION_UUID=${env.CLAUDE_CODE_ORGANIZATION_UUID ? "set" : "unset"})`
          : "");
      logError(Error(ma));
      options.onCreateFail?.(ma, "no_org_uuid");
      return null;
    }
    let co = {
      ...options.environmentVariables,
    };
    delete co.CLAUDE_CODE_OAUTH_TOKEN;
    delete co.CLAUDE_CODE_SESSIONS_OAUTH_TOKEN;
    if (options.environmentId) {
      let referralEligibility = fetchReferralEligibility_2(
        Kn,
        Xn,
        vn,
        profile,
        () => getCloudSessionAccessToken(options.credentials, options.storageV5),
        hasRecoveredBearer,
      );
      if (refuseBuiltinToolsCreate(options, undefined)) return null;
      let qd = null;
      let Gd = null;
      if (options.useBundle) {
        let withholding = await Me();
        let Zh = {
          oauthToken: fo,
          isStoredLogin,
          sessionId: getSessionId(),
          baseUrl: getOauthConfig().BASE_API_URL,
        };
        let vp = await uploadGitBundleForSession(
          Zh,
          {
            signal,
            baseRef: options.bundleBaseRef,
            forceScope: options.bundleForceScope,
            currentBranchOnly: withholding,
            ...(withholding && {
              hardenForDeviceSessions: true,
              startsInProject: await We(),
            }),
            ...resolveBundleReadRules(withholding, options.onBundleNotice, withholding && (await Ae())),
          },
          options.onBundleNotice,
          null,
          options.source === "ultrareview" ? "review" : "session",
        );
        if (vp.success)
          Yt = {
            fileId: vp.fileId,
            config: Zh,
          };
        if (signal.aborted) throw new AbortError_2();
        if (!vp.success) {
          logForDebugging(`Bundle upload failed: ${vp.error}`, {
            level: "error",
          });
          if (vp.failReason !== "too_large") options.onBundleFail?.(vp.error, "bundle");
          return null;
        }
        Gd = vp.fileId;
        if (vp.leftOut?.length)
          options.onBundleNotice?.(
            leftOutNotice(vp.leftOut, {
              readRules: withholding,
            }),
          );
        if (vp.deletedHere?.length) options.onBundleNotice?.(deletedHereNotice(vp.deletedHere));
        logEvent("tengu_teleport_bundle_mode", {
          size_bytes: vp.bundleSizeBytes,
          scope: fromEnum(vp.scope),
          has_wip: vp.hasWip,
          current_branch_only: withholding,
          reason: lit_2("explicit_env_bundle"),
        });
      } else if (options.sourceUrl)
        qd = {
          type: "git_repository",
          url: options.sourceUrl,
          revision: options.branchName,
        };
      else if (!options.agentId) {
        let orgUUID = await detectCurrentRepositoryWithHost();
        if (orgUUID && !isNestedGitLabProject(orgUUID))
          qd = {
            type: "git_repository",
            url: `https://${orgUUID.host}/${orgUUID.owner}/${orgUUID.name}`,
            revision: options.branchName,
          };
      }
      let vu = options.title || options.description || REMOTE_TASK_TITLE;
      let initialControlEvents = buildInitialControlEvents({
        initialMessage,
        initialMessageUuid: options.initialMessageUuid,
        permissionMode: options.permissionMode,
        proactivityLevel: options.proactivityLevel,
        ultraplan: options.ultraplan,
        title: options.title,
        thinking: options.thinking,
      });
      let prepared = await prepareDeviceBinding(
        options.deviceBinding,
        Kn,
        options.environmentId,
        undefined,
        options.correlationId,
        options.credentials,
        G(),
        profile,
      );
      let h_ = environmentSelector(options.environmentId);
      let buildBody = (deviceBinding, requestElevatedTier, deferFirstPrompt) =>
        Kn === "v1alpha2"
          ? buildSessionCreateBody({
              title: vu,
              worker: h_,
              events: initialControlEvents,
              sources: qd ? [qd] : [],
              outcomes: [],
              model: options.model,
              seedBundleFileId: Gd ?? undefined,
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
              deviceBinding,
              requestElevatedTier,
              deferFirstPrompt,
            })
          : {
              title: vu,
              events: initialControlEvents,
              session_context: {
                sources: qd ? [qd] : [],
                ...(Gd && {
                  seed_bundle_file_id: Gd,
                }),
                outcomes: [],
                environment_variables: co,
                ...(options.model && {
                  model: options.model,
                }),
                ...(options.appendSystemPrompt && {
                  append_system_prompt: options.appendSystemPrompt,
                }),
                ...buildRemoteSessionConfig(options),
                ...(options.outputSchema && {
                  output_schema: options.outputSchema,
                }),
                ...(options.correlationId && {
                  correlation_id: options.correlationId,
                }),
              },
              ...h_,
              ...(w && {
                tags: w,
              }),
            };
      logForDebugging(
        `[teleportToRemote] explicit env ${options.environmentId}, ${Object.keys(co).length} env vars, ${Gd ? "source=bundle" : `source=${qd?.url ?? "none"}@${options.branchName ?? "default"}`}`,
      );
      if (signal.aborted) throw new AbortError_2();
      let {
        response,
        bind: Ah,
        held,
        attested,
        firstPromptDeferred,
      } = await createWithDeviceBinding({
        prepared,
        buildBody,
        drops: summarizeSessionCreateBody({
          events: initialControlEvents,
          environmentVariables: co,
        }),
        callerSendsFirstPrompt: options.deferInitialMessage === true,
        attaches: {
          anything: qd !== null || Gd !== null,
          launchCheckout: null,
        },
        post: (Yc, Zh) =>
          ensureTrustedDevice(referralEligibility, Zh, (headers) =>
            axios_default.post(referralEligibility.url, Yc, {
              headers,
              signal,
              validateStatus: ($T) => $T < 500,
            }),
          ),
      });
      qt = isSuccessStatus(response.status);
      if (response.status !== 200 && response.status !== 201) {
        let url = `CreateSession ${response.status}: ${jsonStringify(response.data)}`;
        let Zh = response.data;
        if ([401, 403, 429].includes(response.status) || Zh?.error?.reason === "github_repo_access_denied")
          logForDebugging(`[teleportToRemote] ${url}`, {
            level: "error",
          });
        else {
          let $T = (OE) => (OE && /^[a-z][a-z0-9_]*$/.test(OE) ? OE : undefined);
          logError(Error(`[type=${$T(Zh?.error?.type)},reason=${$T(Zh?.error?.reason)}] ${url}`));
        }
        let vp = cloudErrorMessage(response, Zh?.error?.message);
        options.onCreateFail?.(
          (options.sessionGroupingId && projectNotFoundMessage(options.sessionGroupingId, Zh?.error)) ||
            (await explainUntrustedDeviceRefusal(response, referralEligibility)) ||
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
        );
        return null;
      }
      let _S = sessionIdFromCreateResponse(Kn, response.data);
      if (!_S.ok) {
        let Yc = CREATE_SESSION_FAILURES[_S.error];
        logError(withTelemetryMessage(Error(`${Yc.logLead}: ${jsonStringify(response.data)}`), Yc.telemetry));
        options.onCreateFail?.(Yc.message, Yc.reason);
        return null;
      }
      let bS = _S.value;
      options.onProgress?.({
        kind: "session_exists",
        sessionId: bS.id,
      });
      logCloudSessionLink(
        bS.id,
        options.source,
        {
          project: false,
          global: false,
        },
        {
          endpoint: Kn,
          grouped: options.sessionGroupingId != null,
        },
        options.storageV5,
      );
      reportDeviceBindOutcome(options.deviceBinding, Ah, bS.id, options.storageV5);
      if (attested && options.title)
        latchBoundSessionTitle(
          bS.id,
          options.title,
          Ah?.ok ? Ah.value : undefined,
          options.credentials,
          Ah?.ok ? held : undefined,
        );
      let nk = firstPromptDeferred ? deferredFirstPrompt(initialControlEvents, initialMessage) : undefined;
      return {
        id: bS.id,
        title: sessionTitleOf(bS, vu),
        ...(nk && {
          withheldInitialMessage: nk,
        }),
        ...(options.maxTurns !== undefined && {
          maxTurnsConfirmed: acceptsMaxTurns(Kn, bS, options.maxTurns),
        }),
      };
    }
    if (pn.ignoredUntrustedPool)
      logForDebugging(
        `Ignoring self-hosted environment default ${pn.ignoredUntrustedPool.id} from ${pn.ignoredUntrustedPool.source} \u2014 environment placement is only honoured from user/policy/flag settings. Run /remote-env to set your environment.`,
        {
          level: "warn",
        },
      );
    let id = pn.id;
    let ko = isCcpoolId(id);
    if (ko && options.poolId === undefined)
      fetchSelfHostedPools(Xn, options.credentials).then(
        (selfHostedPools) => {
          if (
            selfHostedPools.length > 0 &&
            !selfHostedPools.some((selfHostedPool) => selfHostedPool.pool_id === id)
          )
            logForDebugging(
              `Configured default environment ${id} is not in the org's environment list \u2014 sending it anyway; server validates at CreateSession`,
              {
                level: "warn",
              },
            );
        },
        (error) =>
          logForDebugging(`fetchSelfHostedPools rejected: ${errorMessage(error)}`, {
            level: "warn",
          }),
      );
    let un = options.description || extractTextContent(initialMessage);
    let ao = !un && (await G());
    let $o;
    let yo = () =>
      ($o ??=
        options.title && options.reuseOutcomeBranch
          ? Promise.resolve({
              title: options.title,
              branchName: options.reuseOutcomeBranch,
            })
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
      : options.chosenEnvironment !== undefined
        ? [options.chosenEnvironment]
        : await fetchEnvironments(Xn, options.storageV5, options.credentials);
    if (signal.aborted) throw new AbortError_2();
    if (!ko && Ho.length === 0 && !Zt)
      try {
        Ho = [await createDefaultCloudEnvironment(undefined, signal, Xn)];
        logForDebugging("[teleportToRemote] Auto-created default cloud env");
      } catch (error) {
        if (signal.aborted) throw new AbortError_2();
        logForDebugging(`[teleportToRemote] auto-create env failed: ${errorMessage(error)}`, {
          level: "warn",
        });
        options.onBundleFail?.(
          `Could not create a cloud environment. Set one up at ${ENV_SETUP_ONBOARDING_URL}`,
          "env_create",
        );
        return null;
      }
    logForDebugging(
      `Available environments: ${Ho.map((ma) => `${ma.environment_id} (${ma.name}, ${ma.kind})`).join(", ")}`,
    );
    let rr = id;
    let br = rr ? Ho.find((ma) => ma.environment_id === rr) : undefined;
    let first = findFirst(Ho, (ma) => ma.kind === "anthropic_cloud");
    if (!ko && options.useDefaultEnvironment && !br && !first) {
      logForDebugging(
        `No configured default or anthropic_cloud in env list (${Ho.length} envs); retrying fetchEnvironments`,
      );
      Ho = await fetchEnvironments(Xn, options.storageV5, options.credentials);
      if (signal.aborted) throw new AbortError_2();
      br = rr ? Ho.find((ma) => ma.environment_id === rr) : undefined;
      first = findFirst(Ho, (ma) => ma.kind === "anthropic_cloud");
      if (!br && !first) {
        let joined = Ho.map(
          (Gd) => `"${environmentLabelOrKind(Gd.name, Gd.environment_id)}" (${safeTokenText(Gd.kind)})`,
        ).join(", ");
        let qd = `No configured default or anthropic_cloud environment available after retry (got: ${joined.length > 1500 ? `${Ho.length} environments` : joined}${rr ? `; configured default ${safeTokenText(rr)} not in list` : ""})`;
        logForDebugging(
          `[teleportToRemote] ${qd}. Silent byoc fallthrough would launch into a dead env \u2014 fail fast instead. Environments as received (name, id, kind): ${jsonStringify(Ho.map((Gd) => [Gd.name, Gd.environment_id, Gd.kind]))}`,
          {
            level: "error",
          },
        );
        options.onCreateFail?.(qd, "no_default_env");
        return null;
      }
    }
    let _r = ko ? undefined : br || undefined || first || Ho.find((ma) => ma.kind !== "bridge") || Ho[0];
    if (!_r && !ko) {
      logError(Error("No environments available for session creation"));
      options.onCreateFail?.("No environments available for session creation", "no_environments");
      return null;
    }
    if (rr && _r) {
      let ma = _r.environment_id === rr;
      logForDebugging(
        ma
          ? `Using the configured default environment: ${rr}`
          : `Configured default environment ${rr} not found, using the fallback`,
      );
    }
    let Cr = ko ? rr : _r.environment_id;
    logForDebugging(
      _r ? `Selected environment: ${Cr} (${_r.name}, ${_r.kind})` : `Selected environment: ${Cr}`,
    );
    if (refuseBuiltinToolsCreate(options, options.agentId ? undefined : ko ? "self_hosted_pool" : _r?.kind))
      return null;
    let Vr = environmentLabelOrKind(options.chosenEnvironment === undefined ? _r?.name : undefined, Cr);
    yo();
    let Oo = null;
    let jr = null;
    let Or = null;
    let Io = "all";
    let gitSource = null;
    let seedBundleFileId = null;
    if (options.sourceUrl)
      Oo = {
        type: "git_repository",
        url: options.sourceUrl,
        revision: options.branchName,
      };
    logForDebugging("[teleport] phase: branch-detect");
    let Es = Oo || options.agentId || Zt ? null : await detectCurrentRepositoryWithHost(options.cwd);
    let Nr = Es && isNestedGitLabProject(Es) ? null : Es;
    if (Es && !Nr)
      logForDebugging("[teleportToRemote] nested GitLab project \u2014 not sent as a git source");
    let Is = false;
    let gitSource_2 = null;
    let as = false;
    let Vi = false;
    let gitOutcome = null;
    let Wi = options.sourceUrl ? "explicit_source_url" : options.agentId ? "agent_defaults" : "no_git_at_all";
    let cwd = findGitRoot(s);
    let wa = ko || _r?.kind === "byoc";
    let hr = wa || false;
    let mi =
      wa ||
      selfHostedEnvironmentKind({
        environment_kind: _r?.kind,
      }) !== null;
    let Ha = options.reuseOutcomeBranch ? "--on-branch" : "--ref";
    let CCR_FORCE_BUNDLE = options.allowBundle && !hr && !options.agentId && env.CCR_FORCE_BUNDLE;
    let nr =
      options.allowBundle &&
      !hr &&
      !options.agentId &&
      cwd !== null &&
      (env.CCR_ENABLE_BUNDLE || (await checkGate_CACHED_OR_BLOCKING("tengu_ccr_bundle_seed_enabled")));
    let Ti =
      options.allowBundle && !hr && !options.agentId && cwd !== null ? repositorySetBundleSwitches() : [];
    if (Ti.length > 0)
      options.onBundleNotice?.(
        `${Ti.join(", ")} in this repository\u2019s .claude/settings files ${Ti.length === 1 ? "is" : "are"} ignored there: how a cloud start is seeded from this machine is the machine owner\u2019s setting (shell environment or ~/.claude/settings.json), never a repository\u2019s.`,
      );
    let seedBundleFileId_2 = null;
    let _i = {
      folderRoot: null,
      optedIn: false,
      insideAnotherCheckout: false,
      mayTakeFolder: false,
      neverOfferedFolder: null,
      hasSaidFolderStartsEmpty: false,
      isFolderQuestionSetAside: false,
      cloudDrive: null,
      pathMisread: false,
      noteForClaude: null,
    };
    let { folderRoot, optedIn } = _i;
    let fi =
      options.staysAttached === true &&
      (await G()) &&
      options.forwardHomeSettings !== false &&
      !hr &&
      !options.agentId &&
      homeSettingsForwardingFeature(options.homeSettingsConsent).enabledNow() &&
      isForwardModeEffective(options.homeSettingsConsent);
    let Ri = fi && !mi;
    let withRunnerPack = Ri && isRemoteHomeSettingsDisabled();
    let Di = Ri && isLaunchConsentBlocked(options.homeSettingsConsent);
    let yr =
      Ri && (!Di || optedIn || folderRoot !== null)
        ? import("./chunk-cx5g5sgv.js")
            .then(({ planHomeSeed }) =>
              planHomeSeed({
                signal,
                storageV5: options.storageV5,
                launchConsent: options.homeSettingsConsent,
                withRunnerPack,
              }),
            )
            .catch(() => null)
        : null;
    let Kr;
    let Li =
      options.branchFromHead === true &&
      options.branchName !== undefined &&
      options.explicitRef === undefined;
    let Qs = cwd !== null && (await Me()) ? await readLaunchGitLayout(cwd, signal, await We()) : undefined;
    if (signal.aborted) throw new AbortError_2();
    let Hi = undefined;
    let Xa = null;
    let now = Date.now();
    let Bs =
      Nr && !CCR_FORCE_BUNDLE && !wa && isGithubDotCom(Nr.host)
        ? (Xa ?? checkGithubAppInstalled(Nr.owner, Nr.name, signal))
        : null;
    let Ca = (ma) => Bs !== null && !optedIn && ma !== "HEAD";
    let tu = async (ma) => {
      if (!Nr || Bs === null) return null;
      let qd = await Bs;
      if (!qd.appInstalled || ma === qd.defaultBranch) return null;
      let min = Math.min(GITHUB_APP_CHECK_TIMEOUT_MS, GITHUB_APP_CHECK_TIMEOUT_MS - (Date.now() - now));
      if (min < MIN_RESYNC_BUDGET_MS) {
        logForDebugging(
          `[teleportToRemote] GitHub not asked about branch ${ma}: only ${Math.max(0, min)} ms of the GitHub App preflight's 15 s was left`,
        );
        return null;
      }
      let sc = (
        await askGithubBranchExists({
          owner: Nr.owner,
          name: Nr.name,
          branches: [ma],
          timeoutMs: min,
          signal,
          credentials: options.credentials,
        })
      )(ma);
      if (sc === "no")
        logForDebugging(
          `[teleportToRemote] GitHub has no branch ${ma}: the start is looked up again without its remote-tracking ref, unless the search for a pushed commit had already failed`,
        );
      return sc;
    };
    let pd =
      cwd !== null && Nr && !wa && !CCR_FORCE_BUNDLE && (optedIn || Li)
        ? await resolveRemote(
            cwd,
            Qs === undefined ? undefined : await screenedGitEnvForReach(Qs, cwd, signal, await We()),
          )
        : null;
    let ga = 0;
    let Hl = null;
    let hd =
      Li && cwd !== null && pd !== null
        ? async (ma) =>
            resolveStartWithGithub({
              lookUp: async ({ remoteLacksBranch }) => {
                Hl = null;
                return checkBranchPushed({
                  gitRoot: cwd,
                  remoteName: pd.name,
                  branch: ma,
                  nameContaining: Nr ? !isGithubDotCom(Nr.host) : false,
                  countAhead: true,
                  sessionRoot: Qs === undefined ? undefined : cwd,
                  sessionReach: Qs,
                  ...(Qs !== undefined && {
                    startsInProject: await We(),
                  }),
                  ...(remoteLacksBranch && {
                    staleBranch: ma,
                  }),
                  signal,
                  onSearchAmongAllRefs: (Gd) => {
                    ga += Gd;
                  },
                  onCreation: (Gd) => {
                    Hl = Gd;
                  },
                });
              },
              ask: Ca(ma) ? () => tu(ma) : null,
            })
        : null;
    let Sd = (start) =>
      start.kind === "pushed_ancestor" &&
      (!Nr || isGithubDotCom(Nr.host) || start.branch !== null || start.containedIn !== undefined);
    let Ld =
      Li && options.branchName !== undefined && !optedIn
        ? recordedOriginalBranch(options.branchName)
        : options.branchName;
    let vs =
      hd !== null && cwd !== null && options.branchName !== undefined && !optedIn
        ? await branchForTeleport(cwd, options.branchName)
        : Ld;
    let now_2 = Date.now();
    let gd = hd !== null && vs !== undefined && vs !== Ld ? await hd(vs) : null;
    let start = gd?.start ?? null;
    let Eu = start !== null && (start.kind === "on_remote" || Sd(start));
    let Uc = Eu ? vs : Ld;
    let Kc = Eu ? gd : hd !== null && Ld !== undefined ? await hd(Ld) : null;
    let start_2 = Kc?.start ?? null;
    let Qm = start_2 === null ? null : Date.now() - now_2;
    let wr = Li && pd === null && Qs !== undefined && !!Nr && !wa && !CCR_FORCE_BUNDLE;
    if (wr)
      logForDebugging(
        "[teleportToRemote] the screened remote look-up answered nothing, so the start was not resolved. One possible cause: its git applies no personal git file, so a checkout that git takes for another account\u2019s counts as safe only when the system file says so (git config --system --add safe.directory <path>).",
        {
          level: "warn",
        },
      );
    let zs = start_2 !== null && Sd(start_2) ? start_2 : null;
    if (signal.aborted) throw new AbortError_2();
    let li = null;
    if (signal.aborted) throw new AbortError_2();
    if (Nr && !CCR_FORCE_BUNDLE) {
      if (wa) {
        Is = true;
        Wi = "byoc_env_skip_preflight";
      } else if (isGithubDotCom(Nr.host)) {
        let ma = await (Bs ?? checkGithubAppInstalled(Nr.owner, Nr.name, signal));
        Is = ma.appInstalled;
        gitSource_2 = ma.defaultBranch;
        as = ma.transient;
        Vi = ma.linkedAccountAccess === "github_not_connected";
        gitOutcome = Is
          ? null
          : {
              ...GITHUB_PRECONDITION_ERRORS(ma),
              httpStatus: ma.httpStatus,
            };
        Wi = Is ? "github_preflight_ok" : "github_preflight_failed";
      } else {
        Is = true;
        Wi = "ghes_optimistic";
      }
    } else if (CCR_FORCE_BUNDLE) Wi = "forced_bundle";
    else if (cwd && !options.agentId) Wi = "no_github_remote";
    let nl = null;
    if (signal.aborted) throw new AbortError_2();
    if (gitOutcome !== null)
      logFeatureSad("cloud_github_preflight", `${gitOutcome.kind}_${gitOutcome.httpStatus ?? "none"}`);
    else if (Wi === "github_preflight_ok") logFeatureOk("cloud_github_preflight");
    let Tl = gitOutcome;
    let kd =
      Tl === null
        ? {}
        : {
            github_preflight_failure: fromEnum(Tl.kind),
            ...(Tl.httpStatus !== null && {
              github_preflight_http_status: Tl.httpStatus,
            }),
          };
    let na = {
      engine: "none",
      reason: "not_opted_in",
    };
    let em = null;
    let Ac = undefined;
    let tp = undefined;
    let Yh = null;
    let Ef = null;
    let np = null;
    let Rf = null;
    let ap = false;
    let al = null;
    let mf = null;
    let rg = () => {
      let ma = mf;
      let pinnedCommit = np?.pinnedCommit;
      return zs !== null &&
        ma?.kind === "pushed_ancestor" &&
        ma.commit !== zs.commit &&
        (pinnedCommit === undefined || pinnedCommit === ma.commit)
        ? ma
        : null;
    };
    let uh = null;
    let Kf = null;
    let ch = (ma, qd) => {};
    let uS =
      Nr && !isGithubDotCom(Nr.host)
        ? {
            reason: "other_host",
          }
        : options.explicitRef !== undefined
          ? {
              reason: "explicit_ref",
              flag: Ha,
            }
          : null;
    let Ks = async () => null;
    if (!Is && !nr && Nr) Is = true;
    let kl = null;
    let Yd = null;
    let xc = null;
    let Ip = Es ? getGitHostKind(Es.host) : null;
    let Gc = Ip === "gitlab" ? "GitLab" : Ip === "bitbucket" ? "Bitbucket" : null;
    let oc = undefined;
    let hp = false;
    let Pg = "not_asked";
    let savedNo = undefined?.savedNo;
    let dy = false;
    let aI = savedNo !== undefined && true;
    let uI = false;
    let cS = undefined;
    let mae = null;
    let Bx = false;
    let E5 = false;
    let gae = false;
    let gW = false;
    let IW = undefined;
    let Tw = true;
    let XF = nr && (optedIn || !gae);
    let Ux = null;
    let xT = null;
    if (
      start_2?.kind === "none" &&
      Is &&
      Nr &&
      (XF || (nr && (Gc !== null || false))) &&
      Yh === null &&
      em === null
    ) {
      Is = false;
      Wi = "branch_not_on_remote";
    }
    if (Is && Nr) {
      let { host, owner, name } = Nr;
      Kr ??= Uc ?? (await getDefaultBranch());
      let vu = Kr;
      if (zs !== null && pd !== null) {
        let sc = rg() ?? zs;
        let fc = isGithubDotCom(host) ? null : (sc.branch ?? sc.containedIn ?? null);
        vu = fc ?? sc.commit;
        Yd = fc !== null ? printableText(fc) : describedTarget(sc, pd.name);
        Ux = describeBranchStartability({
          branch: Kr,
          start: sc,
          remoteName: pd.name,
          host,
          byName: fc,
          carried: optedIn && fc === null,
          advisesPush: Tw,
        });
        kl = Ux;
        xT = {
          line: describeBranchStartability({
            branch: Kr,
            start: sc,
            remoteName: pd.name,
            host,
            byName: fc,
            carried: false,
            advisesPush: false,
          }),
        };
      } else if (
        start_2?.kind === "not_on_remote" ||
        (start_2?.kind === "pushed_ancestor" && zs === null && Kr !== "HEAD")
      ) {
        vu =
          gitSource_2 ??
          (start_2.kind === "not_on_remote" ? start_2.defaultBranch : null) ??
          (await getDefaultBranch());
        Yd = printableText(vu);
        kl = branchNotOnRemoteMessage({
          branch: Kr,
          host,
          revision: vu,
          advisesPush: Tw,
          goneFromGithub: Kc?.github === "no",
        });
        xT = {
          line: branchNotOnRemoteMessage({
            branch: Kr,
            host,
            revision: vu,
            advisesPush: false,
          }),
        };
      } else if (start_2?.kind === "none") {
        vu = gitSource_2 ?? start_2.defaultBranch ?? (await getDefaultBranch());
        let sc = printableText(vu);
        Yd = sc;
        xc = {
          defaultBranch: sc,
          branch: Kr === "HEAD" ? null : printableText(Kr),
          remote: pd === null ? null : printableText(pd.name),
        };
        kl = `${Kr === "HEAD" ? "This detached HEAD" : `Branch ${printableText(Kr)}`} shares no history with ${pd?.name ?? "the remote"} as last fetched here, so the cloud session starts from ${sc} instead; commits and changes that exist only on this machine are not in it.`;
      } else if (
        start_2?.kind === "on_remote" &&
        start_2.aheadCount !== undefined &&
        start_2.aheadCount > 0 &&
        pd !== null
      ) {
        Ux = branchAheadOfRemoteMessage({
          branch: Kr,
          aheadCount: start_2.aheadCount,
          remoteName: pd.name,
          advisesPush: Tw,
        });
        kl = Ux;
        xT = {
          line: branchAheadOfRemoteMessage({
            branch: Kr,
            aheadCount: start_2.aheadCount,
            remoteName: pd.name,
            advisesPush: false,
          }),
        };
      } else if (wr && !optedIn) {
        let sc = isGithubDotCom(host) ? "GitHub" : host;
        let fc = Kr === "HEAD";
        kl = `${fc ? `This checkout is on a detached HEAD, and no remote of it could be read, so its commit could not be looked for on ${sc}. The cloud session was asked to start from HEAD as ${sc} has it, its default branch.` : `Whether branch ${printableText(Kr)} is on ${sc} could not be checked, because no remote of this checkout could be read. The cloud session was asked to start from it by name.`}${Tw ? ` ${fc ? "To start from your work, push it" : "If it is not there, push your work"} to a branch and start a new session from that branch.` : ""}`;
      }
      if (options.reuseOutcomeBranch) {
        let envCcrOnBranchDefaultGuard = process.env.CCR_ON_BRANCH_DEFAULT_GUARD;
        let fc =
          env.CCR_ON_BRANCH_DEFAULT_GUARD ??
          (envCcrOnBranchDefaultGuard != null && String(envCcrOnBranchDefaultGuard).trim()
            ? "enforce"
            : (await checkGate_CACHED_OR_BLOCKING("tengu_on_branch_default_guard_observe").catch(() => false))
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
            let Rh = options.explicitRef === options.reuseOutcomeBranch;
            let Af = options.source === "autofix_pr";
            logEvent("tengu_teleport_on_branch_default_guard", {
              mode: fromEnum(fc),
              source: fromEnum(options.source),
              evidence: fromEnum(gitSource_2 !== null ? "preflight" : "local_symref"),
              arm: fromEnum(wa ? "pool" : "managed"),
            });
            if (wa)
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
            else {
              options.onCreateFail?.(
                (Rh
                  ? `--on-branch ${printableStatusText(options.reuseOutcomeBranch)} targets `
                  : Af
                    ? `This pull request's head branch '${singleTokenText(options.reuseOutcomeBranch)}' is `
                    : `The requested outcome branch '${singleTokenText(options.reuseOutcomeBranch)}' is `) +
                  "the repository's default branch, which this environment's runner cannot reuse as its work branch (its git checkout -b fails on a name the clone already has). " +
                  (Rh
                    ? `Use --ref ${printableStatusText(options.reuseOutcomeBranch)} to base the ` +
                      "session on it and let it push to a fresh claude/\u2026 branch."
                    : Af
                      ? "Autofix can monitor this PR from a self-hosted (BYOC) default environment, whose runner tolerates reusing the default branch."
                      : "Use a non-default branch."),
                "outcome_branch_is_default",
              );
              return null;
            }
          }
        }
      }
      logForDebugging(
        `[teleportToRemote] Git source: ${host}/${owner}/${name}, revision: ${vu ?? "none"}${Ef === null ? "" : ` pinned at ${Ef}`}`,
      );
      Oo = {
        type: "git_repository",
        url: `https://${host}/${owner}/${name}`,
        revision: Ef ?? vu,
        ...(options.reuseOutcomeBranch && {
          allow_unrestricted_git_push: true,
        }),
      };
      jr = `${owner}/${name}`;
    }
    let cLe = null;
    let MT = null;
    let JF = null;
    let hae = false;
    if (!Oo && !wa && options.explicitRef) {
      let ma = CCR_FORCE_BUNDLE
        ? "CCR_FORCE_BUNDLE is set"
        : Nr
          ? as
            ? "the GitHub App preflight failed transiently (network or service hiccup)"
            : "the GitHub App is not set up for this repository"
          : "no GitHub remote was detected in this directory";
      let qd = XF ? "be seeded from your local working tree" : "start with an empty sandbox";
      let Gd = XF ? `drop ${Ha} to seed from local HEAD` : `drop ${Ha} to start with an empty sandbox`;
      let vu = `${Ha} ${printableStatusText(options.explicitRef)} cannot be honored: `;
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
        {
          preflightTransient: as,
        },
      );
      return null;
    }
    if (signal.aborted) throw new AbortError_2();
    let Xh = true;
    if (signal.aborted) throw new AbortError_2();
    let firstUpload = options.firstUpload;
    let fI = false;
    let ZF = options.cwd === undefined ? cwd : null;
    let CC = !Oo && nr;
    let pLe = null;
    let fE = null;
    let e$ = null;
    let _E = null;
    let Sae = false;
    let mLe = null;
    let R5 = null;
    if (CC) {
      logForDebugging("[teleport] phase: bundle-upload");
      logForDebugging(`[teleportToRemote] Bundling (reason: ${Wi})`);
      logEvent("tengu_teleport_bundle_started", {
        reason: fromEnum(Wi),
      });
      options.onProgress?.({
        kind: "bundling",
        rerouted: false,
      });
      gitSource = Date.now();
      let environments = await Me();
      let Gd = {
        oauthToken: fo,
        isStoredLogin,
        sessionId: getSessionId(),
        baseUrl: getOauthConfig().BASE_API_URL,
      };
      let vu = await uploadGitBundleForSession(
        Gd,
        {
          signal,
          ...(ZF !== null && {
            cwd: ZF,
          }),
          currentBranchOnly: environments,
          ...(environments && {
            hardenForDeviceSessions: true,
            startsInProject: await We(),
          }),
          ...resolveBundleReadRules(environments, options.onBundleNotice, environments && (await Ae())),
          onBundled: (sc) =>
            options.onProgress?.({
              kind: "bundled",
              ...sc,
            }),
        },
        MT === null ? options.onBundleNotice : null,
        Gc
          ? {
              kind: "other_forge",
              forge: Gc,
            }
          : CCR_FORCE_BUNDLE
            ? {
                kind: "forced_bundle",
              }
            : null,
      );
      if (vu.success)
        Yt = {
          fileId: vu.fileId,
          config: Gd,
        };
      if (signal.aborted) throw new AbortError_2();
      if (!vu.success) {
        let { failReason, error } = vu;
        let advice = "advice" in vu ? vu.advice : undefined;
        if (failReason === "uncommitted_credentials" || failReason === "git_dir_tampered") {
          logForDebugging(`Bundle refused: ${error}`, {
            level: "error",
          });
          options.onBundleFail?.(error, "bundle");
          return null;
        }
        {
          logForDebugging(`Bundle upload failed: ${error}`, {
            level: "error",
          });
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
                    : ". A cloud session can start from GitHub instead if the Claude GitHub App has access to this repository: https://claude.ai/code";
          let Af;
          switch (failReason) {
            case "empty_repo":
              Af = advice === undefined ? error : `${error}. ${advice}`;
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
            case undefined:
              Af = `Bundle upload failed: ${error}${Rh}`;
              break;
            default: {
              let Ah = failReason;
              Af = `Bundle upload failed: ${error}`;
            }
          }
          options.onBundleFail?.(Af, "bundle");
          return null;
        }
      } else {
        Or = vu.fileId;
        Io = vu.scope;
        if (vu.leftOut?.length)
          options.onBundleNotice?.(
            leftOutNotice(vu.leftOut, {
              readRules: environments,
              ofThisUploadOnly: false,
            }),
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
    let t$ = null;
    let hI = null;
    let DW = null;
    let LW = DW === null ? folderRoot : null;
    let HW = DW !== null && Di ? null : yr;
    let C5 = fi && isLaunchConsentBlocked(options.homeSettingsConsent);
    let AC = fi && (!C5 || optedIn || folderRoot !== null) && !(DW !== null && C5);
    let wE = R5 ?? DW?.noteForClaude ?? hI ?? _i.noteForClaude;
    let Gx =
      wE === null
        ? options.appendSystemPrompt
        : [options.appendSystemPrompt, wE].filter((env) => env !== undefined).join(`

`);
    let verdict = (li === null ? null : await li)?.verdict;
    let n$ = verdict?.reason === "probe_failed" && verdict.storeLookAhead === "not_plain";
    if (signal.aborted) throw new AbortError_2();
    let qx = Oo !== null && Yd !== null ? Yd : Kr;
    let BW = Ef !== null;
    let yI = null;
    let gLe = Rf;
    let A5 = al;
    let kae = Oo !== null && rg() !== null;
    let bae = Hl;
    let hLe = em ?? undefined;
    let kind = start_2?.kind ?? null;
    let kind_2 = start?.kind ?? null;
    let github = Kc?.github ?? null;
    let nP = false;
    let cause = start_2?.kind === "unknown" ? start_2.cause : null;
    let M5 = start_2?.kind === "not_on_remote" ? start_2.searchFailure : (Kc?.failedSearch ?? null);
    let yLe = false;
    let PE = false;
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
      ...(kind !== null && {
        checkout_start: fromEnum(kind),
      }),
      ...(github !== null && {
        checkout_start_github: fromEnum(github),
      }),
      ...(M5 !== null && {
        checkout_start_search_failure: fromEnum(M5),
      }),
      ...(start_2?.kind === "pushed_ancestor" &&
        start_2.fromOwnRefs === true && {
          checkout_start_own_refs_only: true,
        }),
      ...(kae && {
        checkout_start_pinned_nearer: true,
      }),
      ...(Qm !== null && {
        checkout_start_ms: Qm,
      }),
      ...(ga > 0 && {
        checkout_start_tries: ga,
      }),
      ...(bae !== null && {
        checkout_start_created_from: fromEnum(bae),
      }),
      ...(cause !== null && {
        checkout_start_unknown: fromEnum(cause),
      }),
      ...(wr && {
        checkout_start: lit_2("remote_unresolved"),
      }),
      ...(kind_2 !== null && {
        checkout_start_own: fromEnum(kind_2),
        checkout_start_own_taken: Eu,
      }),
      ...(Ld !== options.branchName && {
        launch_branch_not_as_handed: true,
      }),
      ...emptyBindingFacts(),
      ...{},
      ...(zs !== null && {
        checkout_start_ahead: zs.aheadCount,
      }),
      ...(start_2?.kind === "on_remote" &&
        start_2.aheadCount !== undefined && {
          checkout_start_ahead: start_2.aheadCount,
        }),
      ...{},
      ...{},
      ...{},
      ...emptyRequestOptions(mf, uh),
      ...{},
      ...{},
      ...{},
      ...(cwd !== null &&
        Oo === null &&
        Es === null &&
        repoDetectionGuards().blocked() && {
          trust_unconfirmed: true,
        }),
      ...false,
      ...{},
      ...{},
      ...{},
      ...{},
      ...{},
      ...{},
    });
    let O5 = false;
    let wae = false;
    if (!Oo && !Or) {
      if (wa && !options.agentId && !O5) {
        let ma = options.explicitRef
          ? ` \u2014 so ${Ha} ${printableStatusText(options.explicitRef)} cannot be honored`
          : "";
        let Gd = `${`The selected environment "${Vr}"`} requires a git source, but no GitHub remote was detected${ma}. Check that \`git remote get-url origin\` returns a GitHub URL.`;
        logForDebugging(`[teleportToRemote] ${Gd} (byoc env, sourceReason=${Wi})`, {
          level: "error",
        });
        options.onCreateFail?.(Gd, "byoc_no_git_source");
        return null;
      }
      if (yt === null && t$ === null) {
        logForDebugging(
          "[teleportToRemote] No repository detected \u2014 session will have an empty sandbox",
        );
        if (!options.agentId && !O5) {
          let mayTakeFolder = cwd === null ? _i.mayTakeFolder : false;
          let qd = null;
          wae = false;
          options.onBundleNotice?.(
            e$ ??
              _E ??
              (fE !== null && !repoDetectionGuards().blocked()
                ? fE
                : describeNoRepositoryReason(
                    cwd === null
                      ? "no_git"
                      : repoDetectionGuards().blocked()
                        ? "trust_unconfirmed"
                        : "no_github_repository",
                  )),
            fE !== null ? "warning" : undefined,
          );
        }
      }
    }
    logForDebugging("[teleport] phase: title-await");
    let retried = await yo();
    if (signal.aborted) throw new AbortError_2();
    let title = options.title || retried.title;
    let Tae = options.reuseOutcomeBranch || retried.branchName;
    let i$ =
      jr === null
        ? null
        : {
            type: "git_repository",
            git_info: {
              type: "github",
              repo: jr,
              branches: [Tae],
            },
          };
    let referralEligibility = fetchReferralEligibility_2(
      Kn,
      Xn,
      vn,
      profile,
      () => getCloudSessionAccessToken(options.credentials, options.storageV5),
      hasRecoveredBearer,
    );
    let L5 = false;
    if (kl !== null && Oo !== null && true) options.onBundleNotice?.(kl, nP ? "warning" : undefined);
    let Rae = L5 && Kn === "v1alpha2";
    let SLe = false;
    let t1 = options.ultraplan ? `ultraplan: ${title}` : title;
    let i1 = builtinToolsFirstPrompt(options, initialMessage);
    let N5 = optedIn || LW !== null || HW !== null;
    let l$ =
      i1 ??
      (options.deferInitialMessage === true && initialMessage !== null && N5
        ? {
            content: initialMessage,
            uuid: options.initialMessageUuid ?? randomUUID(),
          }
        : undefined);
    let initialControlEvents = buildInitialControlEvents({
      initialMessage: l$ ? null : initialMessage,
      initialMessageUuid: options.initialMessageUuid,
      permissionMode: mi && options.isModeFromSettings === true ? undefined : options.permissionMode,
      isModeFromSettings: options.isModeFromSettings,
      proactivityLevel: options.proactivityLevel,
      ultraplan: options.ultraplan,
      title: options.title,
      thinking: options.thinking,
    });
    let u$ = options.model ?? getMainLoopModel();
    let modelPickerEffortDefault = getModelPickerEffortDefault(
      u$,
      mi && options.isEffortFromSettings === true ? undefined : options.effort,
    );
    let modelPickerEffortDefault_2 = getModelPickerEffortDefault(u$, options.effort);
    options.onProgress?.({
      kind: "creating",
    });
    let prepared =
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
            profile,
          );
    let persistentVolumeFromSessionId = options.persistentVolumeFromSessionId;
    let buildBody = (ma, requestElevatedTier, deferFirstPrompt, repositoriesTrusted) => {
      let sc = options.deviceBinding !== undefined && ma === undefined;
      let fc =
        Kn === "v1alpha2"
          ? buildSessionCreateBody({
              title: t1,
              worker: environmentSelector(Cr),
              events: initialControlEvents,
              sources: Oo ? [Oo] : [],
              outcomes: i$ ? [i$] : [],
              model: u$,
              effortLevel: modelPickerEffortDefault,
              seedBundleFileId: Or ?? undefined,
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
              persistentVolumeFromSessionId,
              deviceBinding: ma,
              requestElevatedTier,
              deferFirstPrompt,
              repositoriesTrusted,
            })
          : {
              title: t1,
              events: initialControlEvents,
              session_context: {
                sources: Oo ? [Oo] : [],
                ...(Or && {
                  seed_bundle_file_id: Or,
                }),
                outcomes: i$ ? [i$] : [],
                model: u$,
                ...(modelPickerEffortDefault && {
                  effort_level: modelPickerEffortDefault,
                }),
                ...(options.reuseOutcomeBranch && {
                  reuse_outcome_branches: true,
                }),
                ...(Object.keys(co).length > 0 && {
                  environment_variables: co,
                }),
                ...(Gx && {
                  append_system_prompt: Gx,
                }),
                ...buildRemoteSessionConfig(options),
                ...(options.outputSchema && {
                  output_schema: options.outputSchema,
                }),
                ...(options.correlationId && {
                  correlation_id: options.correlationId,
                }),
              },
              ...environmentSelector(Cr),
              ...noopSessionTag(options.persistentVolume, persistentVolumeFromSessionId),
              ...(w && {
                tags: w,
              }),
            };
      logForDebugging(
        `Creating session with payload: ${jsonStringify(redactSessionCreateBody(fc), null, 2)}`,
      );
      return fc;
    };
    if (signal.aborted) throw new AbortError_2();
    options.onProgress?.({
      kind: "request_sent",
    });
    logForDebugging("[teleport] phase: POST-sent");
    let request = {
      prepared,
      buildBody,
      drops: summarizeSessionCreateBody({
        events: initialControlEvents,
        environmentVariables: co,
      }),
      callerSendsFirstPrompt: options.deferInitialMessage === true,
      attaches: {
        anything: Oo !== null || Or !== null || optedIn || LW !== null,
        launchCheckout:
          cwd !== null && Oo !== null && Nr !== null && Or === null
            ? {
                root: cwd,
                covers: "remote",
              }
            : ZF !== null && Oo === null && Or !== null && !optedIn && LW === null
              ? {
                  root: ZF,
                  covers: "bundle",
                }
              : null,
      },
      post: (ma, qd) =>
        ensureTrustedDevice(referralEligibility, qd, (env) =>
          axios_default.post(referralEligibility.url, ma, {
            headers: env,
            signal,
            validateStatus: (vu) => vu < 500,
          }),
        ),
    };
    let HS = await createWithDeviceBinding(request);
    let g$ = null;
    if (g$ !== null) {
      options.onBundleNotice?.(g$);
      persistentVolumeFromSessionId = undefined;
      if (signal.aborted) throw new AbortError_2();
      HS = await createWithDeviceBinding(request);
    }
    let { response, bind: vw, held, attested, firstPromptDeferred } = HS;
    logForDebugging(`[teleport] phase: POST-response status=${response.status}`);
    qt = isSuccessStatus(response.status);
    let F5 = vw?.ok === true ? held : undefined;
    let Aae = Rae && (options.deviceBinding === undefined || attested);
    if (!(response.status === 200 || response.status === 201)) {
      let ma = `API request failed with status ${response.status}: ${response.statusText}

Response data: ${jsonStringify(response.data, null, 2)}`;
      let qd = response.data;
      let env = qd?.error?.type;
      let reason = qd?.error?.reason;
      let message = qd?.error?.message;
      let fc = Oo ? parseGitRemote(Oo.url) : null;
      let h_ = fc
        ? singleTokenOrPlaceholder(`${fc.owner}/${fc.name}`)
        : Or
          ? "a seed bundle (no git source)"
          : Oo
            ? singleTokenOrPlaceholder(Oo.url)
            : "no source";
      let Rh = fc !== null && isAnthropicRepo(fc);
      let Af = normalizeCreateSessionError(reason);
      let Ah = false;
      let k_ =
        (typeof message === "string" &&
          message.includes("source repository configuration is not permitted for this environment")) ||
        Af === "monorepo_source_required" ||
        Af === "monorepo_env_required" ||
        (response.status === 400 &&
          !reason &&
          env === "invalid_request_error" &&
          !wa &&
          Oo !== null &&
          !Or &&
          Rh &&
          typeof message === "string" &&
          /^the request was invalid\.?$/i.test(message));
      if (
        [401, 403, 429].includes(response.status) ||
        reason === "github_repo_access_denied" ||
        isCloudLaunchError(qd) ||
        k_ ||
        false ||
        noEnvironmentOverride(reason) !== undefined
      )
        logForDebugging(ma, {
          level: "error",
        });
      else {
        let Yc = (env) => (env && /^[a-z][a-z0-9_]*$/.test(env) ? env : undefined);
        let Zh = "";
        logError(Error(`[type=${Yc(env)},reason=${Yc(reason)},isByocEnv=${wa}] ${ma}`));
      }
      let FT = cloudErrorMessage(response, message);
      let Jh =
        (await explainUntrustedDeviceRefusal(response, referralEligibility)) ||
        loginRejectedMessage(response.status, FT.message) ||
        FT.message ||
        FT.statusLine;
      if (k_) Jh = formatEnvironmentRepoMismatch(Rh, Vr, h_);
      if (_r?.kind === "bridge" && response.status === 403) {
        let { readUntrustedDeviceRefusal } = await import("./chunk-g9dw262t.js");
        if (readUntrustedDeviceRefusal(response.data)?.kind === "unrecognized")
          Jh = `Choose a cloud environment with /remote-env: "${Vr}" is a Remote Control environment and refused this session. If none is listed, create one at ${ENV_SETUP_ONBOARDING_URL}.`;
      }
      let _S = options.sessionGroupingId && projectNotFoundMessage(options.sessionGroupingId, qd?.error);
      if ((options.builtinTools?.length ?? 0) > 0 && isCloudLaunchError(qd))
        logBuiltinToolsCreate("unavailable", ko);
      let bS = (isCloudLaunchError(qd) && DEVICE_BIND_REFUSAL_REASONS) || _S || Jh;
      let serverType = normalizeApiErrorType(env);
      options.onCreateFail?.(bS, "create_request_failed", {
        status: response.status,
        serverType,
        serverReason: Af,
        endpoint: Kn,
        messageHidden: FT.messageHidden,
      });
      return null;
    }
    let $5 = sessionIdFromCreateResponse(Kn, response.data);
    if (!$5.ok) {
      let ma = CREATE_SESSION_FAILURES[$5.error];
      logError(
        withTelemetryMessage(
          Error(`Cannot determine session ID from API response: ${jsonStringify(response.data)}`),
          ma.telemetry,
        ),
      );
      options.onCreateFail?.(ma.message, ma.reason);
      return null;
    }
    let Zk = $5.value;
    options.onProgress?.({
      kind: "session_exists",
      sessionId: Zk.id,
    });
    let f1 = null;
    let xae = Aae && true && !(vw !== undefined && !vw.ok);
    let Uy = null;
    if (Uy !== null) options.onBundleNotice?.(Uy);
    let p_ = SLe && attested;
    let B5 = async (ma, env = null) => {};
    let U5 = (env) =>
      raceWithAbortSignal(B5(false, env), signal, () => new AbortError_2()).catch((error) => {
        if (!isAbortError(error)) logError(error);
      });
    let remoteSession = await createRemoteSession({
      options,
      createEndpoint: Kn,
      responseData: response.data,
      sessionId: Zk.id,
      held: i1,
      bound: vw?.ok === true,
      firstPromptDeferred,
      followsUploads: N5,
      pool: ko,
      signal,
    });
    if (!remoteSession.ok) return null;
    logForDebugging(`Successfully created remote session: ${Zk.id}`);
    if (yt === null)
      options.onProgress?.({
        kind: "created",
      });
    let j5 = () =>
      logCloudSessionLink(
        Zk.id,
        options.source,
        {
          project: Oo !== null && Wi !== "github_preflight_failed" && true,
          global: Or === null && yt === null && fE === null && e$ === null && _E === null,
        },
        {
          endpoint: Kn,
          grouped: options.sessionGroupingId != null,
          effortLevel: modelPickerEffortDefault,
        },
        options.storageV5,
      );
    if (yI?.kind !== "seed" || yI.cloudCheckoutOrigin.kind !== "created_empty") j5();
    let Qh = null;
    let bLe = (ma) => (Qh ??= archiveRemoteSession(Zk.id, ma));
    if (false)
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
    reportDeviceBindOutcome(options.deviceBinding, vw, Zk.id, options.storageV5);
    if (attested && options.title)
      latchBoundSessionTitle(Zk.id, options.title, vw?.ok ? vw.value : undefined, options.credentials, F5);
    let MI = null;
    if (MI !== null) {
      logFeatureSad("ccr_home_seed", MI);
      logFeatureSad("ccr_home_seed_create_upload", MI);
    }
    let p1 = selfHostedEnvironmentKind(Zk);
    let W5 = false;
    let OI = HW !== null && p1 !== null && !W5;
    let rP = OI ? "self_hosted_runner" : MI;
    let k$ =
      options.isModeFromSettings !== true
        ? undefined
        : mi
          ? "not_sent"
          : p1 !== null
            ? "not_pushed"
            : undefined;
    if (p1 !== null && (OI || W5 || k$ === "not_pushed"))
      logEvent("tengu_settings_kept_from_runner", {
        known_by: fromEnum(p1),
        is_pack_kept: OI,
        ...false,
        is_mode_kept: k$ === "not_pushed",
        is_effort_kept: false,
        is_named_at_launch: false,
      });
    if (
      mi &&
      !wa &&
      (AC ||
        (options.isModeFromSettings === true && options.permissionMode !== undefined) ||
        modelPickerEffortDefault_2 !== modelPickerEffortDefault)
    )
      logEvent("tengu_settings_kept_from_runner", {
        known_by: fromEnum("unlisted_kind"),
        is_pack_kept: AC,
        ...false,
        is_mode_kept: options.isModeFromSettings === true && options.permissionMode !== undefined,
        is_effort_kept: modelPickerEffortDefault_2 !== modelPickerEffortDefault,
        is_named_at_launch: true,
      });
    let ME = OI ? "self_hosted_runner" : MI !== null ? "no_project_files" : null;
    let G5 =
      ME !== null
        ? Promise.resolve({
            kind: "none",
            reason: ME,
          })
        : HW;
    let II =
      G5 === null
        ? undefined
        : await runCreateHomeSeed({
            sessionId: Zk.id,
            planning: G5,
            boundDeviceUuid: vw?.ok ? vw.value : undefined,
            held: F5,
            launchConsent: options.homeSettingsConsent,
            signal,
            credentials: options.credentials,
            storageV5: options.storageV5,
          });
    let JS = i1
      ? remoteSession.withheld
      : firstPromptDeferred
        ? l$
          ? {
              ...l$,
              followsPermissionMode: true,
            }
          : deferredFirstPrompt(initialControlEvents, initialMessage)
        : l$;
    return {
      id: Zk.id,
      title: sessionTitleOf(Zk, t1),
      ...(JS && {
        withheldInitialMessage: JS,
      }),
      ...(II && {
        homeSeed: II,
      }),
      ...(rP !== null && {
        settingsPackUnsent: rP,
      }),
      ...(options.maxTurns !== undefined && {
        maxTurnsConfirmed: acceptsMaxTurns(Kn, Zk, options.maxTurns),
      }),
      ...(k$ !== undefined && {
        settingsModeOnRunner: k$,
      }),
      ...(f1 !== null && {
        chosenEnvironmentMoved: true,
      }),
      ...false,
      ...false,
      ...{},
      ...false,
      ...false,
      ...false,
      ...(Oo === null &&
        Or === null &&
        LW === null &&
        yt === null &&
        !options.agentId && {
          startedEmpty: true,
        }),
      ...false,
    };
  } catch (error) {
    let err = toError(error);
    if (isAbortError(error) || axios_default.isCancel(error)) {
      logForDebugging(`Remote session create aborted: ${err.message}`);
      return null;
    }
    let pn = isExpectedApiError(error);
    if (pn)
      logForDebugging(`Remote session create failed (network): ${err.message}`, {
        level: "error",
      });
    else logError(withTelemetryMessage(toError(err), "Remote session create failed"));
    let no = err.message.trimEnd() || getErrnoCode(err) || err.name;
    let hn = printableMultiline(no, `the error ${MESSAGE_NOT_SHOWN_NOTE}`);
    if (hn !== no && !pn)
      logForDebugging(`Remote session create failed, not shown: ${no}`, {
        level: "error",
      });
    options.onCreateFail?.(`Cloud session create failed: ${hn}`, pn ? "network_error" : "exception");
    return null;
  } finally {
    if (yt !== null && !It) options.firstUpload?.discard(yt).catch((error) => logError(error));
    if (Yt !== null && !qt) await discardUploadedSeedBundle(Yt);
  }
}
//@ chunk-e6aww6q8.js:2009090-2009127 layout
function isSuccessStatus(status) {
  return status >= 200 && status < 300;
}
//@ chunk-e6aww6q8.js:2009127-2009992 facade-exports = sendEventToRemoteSession (0.362)
/**
 * 向远程会话发送 interrupt 控制请求（中断当前回合）。
 */
async function interruptRemoteSession(e, timeout = 1e4) {
  if (!isFirstPartyProvider()) {
    logForDebugging(`[interruptRemoteSession] ${e} skipped: non-first-party provider`);
    return false;
  }
  let r = isConsoleProfileSessionsCredential();
  let s = r ? null : await ensureHostSessionsBearer();
  let h = r ? await sessionsApiAccessToken(r) : getAccessTokenWithCcrFallback();
  if (!(s ?? h)) return false;
  try {
    let compatSessionId = toCompatSessionId(e);
    if (!/^session_[A-Za-z0-9_-]+$/.test(compatSessionId)) return false;
    let w = await sessionsApiOrganizationUUID(r);
    if (!w) return false;
    let { url, body } = sessionEventsUrl(
      getOauthConfig().BASE_API_URL,
      compatSessionId,
      [
        {
          type: "control_request",
          request_id: randomUUID(),
          request: INTERRUPT_REMOTE_EVENT,
          uuid: randomUUID(),
        },
      ],
      isCcrV2SendEventsEnabled(),
    );
    let trustedDeviceToken = await getTrustedDeviceToken();
    let Z = await resendOnHeldBearer401(
      s,
      (Se) =>
        axios_default.post(url, body, {
          headers: {
            ...getOAuthRequestHeaders(bearerToSend(Se, h)),
            "anthropic-beta": CCR_BYOC_BETA,
            "x-organization-uuid": w,
            ...(trustedDeviceToken && {
              "X-Trusted-Device-Token": trustedDeviceToken,
            }),
          },
          timeout,
          validateStatus: (status) => status < 500,
        }),
      {
        waitForHost: false,
      },
    );
    if (Z.status >= 200 && Z.status < 300) {
      logForDebugging(`[interruptRemoteSession] interrupted ${e}`);
      return true;
    }
    logForDebugging(`[interruptRemoteSession] ${e} failed ${Z.status}: ${jsonStringify(Z.data)}`);
    return false;
  } catch (error) {
    logForDebugging(`[interruptRemoteSession] ${e} failed: ${errorMessage(error)}`, {
      level: "error",
    });
    return false;
  }
}
//@ chunk-e6aww6q8.js:2009992-2010166 facade-exports
function subscribeRemoteSessionToPR(sessionId, repo, prNumber) {
  return subscribeGithubPullRequest("subscribe", {
    sessionId,
    repo,
    prNumber,
    baseUrl: getOauthConfig().BASE_API_URL,
    getAccessToken: () => sessionsApiAccessTokenNow(isConsoleProfileSessionsCredential()),
    getTrustedDeviceToken,
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
