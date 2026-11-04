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
import { reportSignerLoadFailure } from "./telemetry/clientEventUploader.js";
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
import { INTERRUPT_REMOTE_EVENT } from "./telemetry/memorySummary.js";
import { getTrustedDeviceToken } from "../bridge/trustedDevice.js";
import { subscribeGithubPullRequest } from "../bridge/githubPrSubscription.js";

//@ chunk-e6aww6q8.js:1941496-1941556 affinity
var ENV_SETUP_ONBOARDING_URL = "https://claude.ai/code/onboarding?magic=env-setup";
//@ chunk-e6aww6q8.js:1941556-1941737 fingerprint (2.1.88 match: createTeleportResumeSystemMessage, 1)
function createTeleportResumeSystemMessage(branchError) {
  if (branchError === null) return createSystemMessage("Session resumed", "suggestion");
  let formattedError =
    branchError instanceof TeleportOperationError ? branchError.formattedMessage : branchError.message;
  return createSystemMessage(`Session resumed without branch: ${formattedError}`, "warning");
}
//@ chunk-e6aww6q8.js:1941737-1941916 fingerprint (2.1.88 match: createTeleportResumeUserMessage, 1)
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
//@ chunk-e6aww6q8.js:1941972-1942300 facade-exports (2.1.88 match: validateGitState, 0.852)
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
//@ chunk-e6aww6q8.js:1942300-1942776 fingerprint (2.1.88 match: fetchFromOrigin, 1)
async function fetchFromOrigin(branch) {
  let fetchArgs = branch
    ? [...GIT_SAFE_GLOBAL_ARGS, "fetch", SAFE_UPLOAD_PACK_ARG_2, "origin", `${branch}:${branch}`]
    : [...GIT_SAFE_GLOBAL_ARGS, "fetch", SAFE_UPLOAD_PACK_ARG_2, "origin"];
  let repoRootOrCwd = getRepoRootOrCwd();
  let execOptions = {
    cwd: repoRootOrCwd,
    ...(await getGitSshEnv(repoRootOrCwd)),
  };
  let { code: fetchCode, stderr: fetchStderr } = await execFileNoThrowWithCwd(
    gitExe(),
    fetchArgs,
    execOptions,
  );
  if (fetchCode !== 0)
    if (branch && fetchStderr.includes("refspec")) {
      logForDebugging(`Specific branch fetch failed, trying to fetch ref: ${branch}`);
      let { code: refFetchCode, stderr: refFetchStderr } = await execFileNoThrowWithCwd(
        gitExe(),
        [...GIT_SAFE_GLOBAL_ARGS, "fetch", SAFE_UPLOAD_PACK_ARG_2, "origin", branch],
        execOptions,
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
//@ chunk-e6aww6q8.js:1942776-1943374 fingerprint (2.1.88 match: ensureUpstreamIsSet, 1)
async function ensureUpstreamIsSet(branchName) {
  let repoRootOrCwd = getRepoRootOrCwd();
  let execOptions = {
    cwd: repoRootOrCwd,
    env: buildGitEnvForRepo(repoRootOrCwd),
  };
  let { code: upstreamCheckCode } = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--abbrev-ref", `${branchName}@{upstream}`],
    execOptions,
  );
  if (upstreamCheckCode === 0) {
    logForDebugging(`Branch '${branchName}' already has upstream set`);
    return;
  }
  let { code: remoteCheckCode } = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--verify", `origin/${branchName}`],
    execOptions,
  );
  if (remoteCheckCode === 0) {
    logForDebugging(`Setting upstream for '${branchName}' to 'origin/${branchName}'`);
    let { code: setUpstreamCode, stderr: setUpstreamStderr } = await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "branch", "--set-upstream-to", `origin/${branchName}`, branchName],
      execOptions,
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
//@ chunk-e6aww6q8.js:1943712-1945237 facade-exports (2.1.88 match: stashToCleanState, 0.369)
/**
 * teleport 前把工作区 stash 到干净状态：先检查被 assume-unchanged/被文件夹替换的已跟踪路径（存在则拒绝，避免 stash 丢数据），再 add 未跟踪文件并 git stash push。
 */
async function stashToCleanState(options, { cwd, env }) {
  let changedFiles = await listChangedTrackedFiles(cwd, env);
  if (changedFiles.kind === "failed" || !changedFiles.isAssumeUnchangedListed) {
    let cause = changedFiles.kind === "failed" ? changedFiles.cause : "assume_unchanged_listing";
    let errno =
      changedFiles.kind === "failed" && changedFiles.cause === "path_read" ? changedFiles.errno : undefined;
    logForDebugging(
      changedFiles.kind === "failed"
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
  if (changedFiles.kind === "failed") return false;
  let { replaced } = changedFiles;
  if (replaced[0] !== undefined) {
    logEvent("tengu_teleport_stash_refused", {
      entries_replaced_by_folders: replaced.length,
    });
    let listResult = truncatePathMiddle(
      replaceControlChars(Buffer.from(replaced[0], "latin1").toString()),
      100,
    );
    let status = replaced.length - 1;
    let stashResult =
      status === 0
        ? `Nothing was stashed: "${listResult}" is now a folder in place of a tracked file or link, and stashing could delete what's in it for good. Commit the change or move the folder somewhere else, then try again.`
        : `Nothing was stashed: "${listResult}" and ${status} other ${plural(status, "path")} are now folders in place of tracked files or links, and stashing could delete what's in them for good. Commit the change or move the folders somewhere else, then try again.`;
    throw new TeleportOperationError(
      stashResult,
      sequential.red(`${stashResult}
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
    [...GIT_SAFE_GLOBAL_ARGS, "stash", "push", "--message", options],
    {
      cwd,
      preserveOutputOnError: false,
      env,
    },
  );
  return code === 0;
}
//@ chunk-e6aww6q8.js:1945237-1945804 fingerprint (2.1.88 match: checkoutBranch, 1)
async function checkoutBranch(branchName, execOptions) {
  let result = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "checkout", branchName, "--"],
    execOptions,
  );
  if (result.code !== 0) {
    logForDebugging(`Local checkout failed, trying to checkout from origin: ${result.stderr}`);
    result = await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "checkout", "-b", branchName, "--track", `origin/${branchName}`, "--"],
      execOptions,
    );
  }
  if (result.code !== 0) {
    logForDebugging(`Remote checkout with -b failed, trying without -b: ${result.stderr}`);
    result = await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "checkout", "--track", `origin/${branchName}`, "--"],
      execOptions,
    );
  }
  if (result.code !== 0) {
    logEvent("tengu_teleport_error_branch_checkout_failed", {});
    throw new TeleportOperationError(
      `Failed to checkout branch '${branchName}': ${result.stderr}`,
      sequential.red(`Failed to checkout branch '${branchName}'
`),
    );
  }
  await ensureUpstreamIsSet(branchName);
}
//@ chunk-e6aww6q8.js:1945804-1945931 fingerprint (2.1.88 match: getCurrentBranch, 1)
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
function deserializeRemoteSessionLog(log) {
  return markRemoteSourced(deserializeToMessages(log, true));
}
//@ chunk-e6aww6q8.js:1945969-1946379 facade-exports (2.1.88 match: processMessagesForTeleportResume, 0)
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
//@ chunk-e6aww6q8.js:1946379-1946895 facade-exports (2.1.88 match: checkOutTeleportedSessionBranch, 0.832)
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
//@ chunk-e6aww6q8.js:1946895-1948437 facade-exports (2.1.88 match: validateSessionRepository, 0.94)
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
  let sessionRepoSlug = sessionParsed
    ? `${sessionParsed.owner}/${sessionParsed.name}`
    : parseGitHubRepository(gitSource.url);
  if (!sessionRepoSlug)
    return {
      status: "no_repo_required",
    };
  logForDebugging(`Session is for repository: ${sessionRepoSlug}, current repo: ${currentRepo ?? "none"}`);
  if (!currentRepo) {
    if (findGitRoot(getCwd())) {
      let remoteUrl = await resolveRemoteUrl(getCwd());
      let currentRepoParsed = remoteUrl ? parseRepoSlug(remoteUrl) : null;
      let rawRemoteUrl = remoteUrl
        ? stripVTControlCharacters(redactGitRemoteCredentials(remoteUrl) ?? "")
            .replace(/[\r\n]+/g, " ")
            .slice(0, 200) || undefined
        : undefined;
      if (currentRepoParsed) {
        let currentRepoSlug = `${currentRepoParsed.owner}/${currentRepoParsed.name}`;
        if (currentRepoSlug.toLowerCase() === sessionRepoSlug.toLowerCase())
          return {
            status: "host_unverified",
            sessionRepo: sessionRepoSlug,
            sessionHost: sessionParsed?.host,
            currentRepo: currentRepoSlug,
            rawRemoteUrl,
          };
        return {
          status: "mismatch",
          sessionRepo: sessionRepoSlug,
          currentRepo: currentRepoSlug,
          sessionHost: sessionParsed?.host,
          rawRemoteUrl,
        };
      }
      if (rawRemoteUrl)
        return {
          status: "not_in_repo",
          sessionRepo: sessionRepoSlug,
          sessionHost: sessionParsed?.host,
          currentRepo: null,
          rawRemoteUrl,
        };
    }
    return {
      status: "not_in_repo",
      sessionRepo: sessionRepoSlug,
      sessionHost: sessionParsed?.host,
      currentRepo: null,
    };
  }
  let repoMatch = currentRepo.toLowerCase() === sessionRepoSlug.toLowerCase();
  let hostMatch =
    !currentParsed ||
    !sessionParsed ||
    portlessHost(currentParsed.host.toLowerCase()) === portlessHost(sessionParsed.host.toLowerCase());
  if (repoMatch && hostMatch)
    return {
      status: "match",
      sessionRepo: sessionRepoSlug,
      currentRepo,
    };
  if (sessionParsed) {
    let pushRemoteUrl = await resolvePushRemoteUrl(getCwd());
    let pushRemote = pushRemoteUrl ? parseGitRemote(pushRemoteUrl) : null;
    if (
      pushRemote &&
      portlessHost(pushRemote.host.toLowerCase()) === portlessHost(sessionParsed.host.toLowerCase()) &&
      `${pushRemote.owner}/${pushRemote.name}`.toLowerCase() === sessionRepoSlug.toLowerCase()
    )
      return {
        status: "match",
        sessionRepo: sessionRepoSlug,
        currentRepo: `${pushRemote.owner}/${pushRemote.name}`,
      };
  }
  return {
    status: "mismatch",
    sessionRepo: sessionRepoSlug,
    currentRepo,
    sessionHost: sessionParsed?.host,
    currentHost: currentParsed?.host,
  };
}
//@ chunk-e6aww6q8.js:1948437-1948699 facade-exports
function formatRepoMismatchDisplay(mismatch) {
  let hostsDiffer =
    mismatch.sessionHost &&
    mismatch.currentHost &&
    portlessHost(mismatch.sessionHost).toLowerCase() !== portlessHost(mismatch.currentHost).toLowerCase();
  return {
    sessionDisplay: hostsDiffer ? `${mismatch.sessionHost}/${mismatch.sessionRepo}` : mismatch.sessionRepo,
    currentDisplay: hostsDiffer ? `${mismatch.currentHost}/${mismatch.currentRepo}` : mismatch.currentRepo,
  };
}
//@ chunk-e6aww6q8.js:1948699-1950938 facade-exports (2.1.88 match: teleportResumeCodeSession, 0.74)
/**
 * 把云端会话拉回本地继续：校验仓库匹配、拉取会话日志、检出对应分支，返回消息与分支。
 */
async function teleportResumeCodeSession(sessionId, onProgress) {
  if (!isFirstPartyProvider())
    throw Error("Cloud sessions are only available on the first-party Anthropic API provider.");
  let deniedReason = policyDeniedReason("allow_remote_sessions", "Cloud sessions", "are");
  if (deniedReason) {
    logOrgPolicyDenied("allow_remote_sessions", "cloud_session");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      deniedReason,
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
    let result = isConsoleProfileSessionsCredential();
    let accessToken = await sessionsApiAccessToken(result);
    if (!accessToken) {
      logEvent("tengu_teleport_resume_error", {
        error_type: lit_2("no_access_token"),
      });
      throw Error(cloudSessionsSignInRefusal());
    }
    let orgUUID = await sessionsApiOrganizationUUID(result);
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
        let message = repoValidation.rawRemoteUrl
          ? `
Couldn't parse your git remote: ${repoValidation.rawRemoteUrl}`
          : "";
        throw new TeleportOperationError(
          `You must run claude --teleport ${sessionId} from a checkout of ${notInRepoDisplay}.${message}`,
          sequential.red(`You must run claude --teleport ${sessionId} from a checkout of ${sequential.bold(notInRepoDisplay)}.${message}
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
    return await teleportFromSessionsAPI(sessionId, orgUUID, accessToken, result, onProgress, sessionData);
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
//@ chunk-e6aww6q8.js:1950938-1951179 facade-exports (2.1.88 match: handleTeleportPrerequisites, 0.836)
async function handleTeleportPrerequisites(root, showErrors, options) {
  let teleportErrors = await getTeleportErrors(undefined, showErrors);
  if (teleportErrors.size > 0) {
    logEvent("tengu_teleport_errors_detected", {
      error_types: fromEnumArr([...teleportErrors]),
      errors_ignored: fromEnumArr([...showErrors]),
    });
    await options(root, showErrors);
    logEvent("tengu_teleport_errors_resolved", {
      error_types: fromEnumArr([...teleportErrors]),
    });
  }
  return teleportErrors.size > 0;
}
//@ chunk-e6aww6q8.js:1951179-1951567 layout
function logCloudSessionLink(id, source, createInfo, options, storageV5) {
  logEvent("tengu_ccr_session_link", {
    ccr_session_id: sanitizeMarkName(id),
    source: fromEnum(source),
    create_endpoint: fromEnum(options.endpoint),
    grouped: options.grouped,
    create_effort_level: fromEnumOpt(options.effortLevel),
  });
  if (createInfo.project && !getCurrentProjectConfig().hasUsedRemoteSession)
    saveCurrentProjectConfig(
      (storage) =>
        storage.hasUsedRemoteSession
          ? storage
          : {
              ...storage,
              hasUsedRemoteSession: true,
            },
      storageV5,
    );
  if (createInfo.global && !getGlobalConfig().hasRemoteEnvironment)
    saveGlobalConfig(
      (note) =>
        note.hasRemoteEnvironment
          ? note
          : {
              ...note,
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
function normalizeApiErrorType(errorType) {
  if (typeof errorType !== "string" || errorType === "") return;
  switch (errorType) {
    case "authentication_error":
    case "invalid_request_error":
    case "permission_error":
    case "api_error":
    case "not_found_error":
    case "rate_limit_error":
    case "billing_error":
    case "overloaded_error":
    case "request_too_large":
      return errorType;
    default:
      return "other";
  }
}
//@ chunk-e6aww6q8.js:1952694-1953275 layout
function normalizeCreateSessionError(request) {
  if (typeof request !== "string" || request === "") return;
  let override = noEnvironmentOverride(request);
  if (override !== undefined) return override;
  switch (request) {
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
      return request;
    default:
      return "other";
  }
}
//@ chunk-e6aww6q8.js:1953275-1953318 layout
function environmentLabelOrKind(label, fallback) {
  return singleTokenText(label, "") || safeTokenText(fallback);
}
//@ chunk-e6aww6q8.js:1953318-1953681 layout
function formatEnvironmentRepoMismatch(needsSetup, environmentName, extra) {
  return needsSetup
    ? `This repository needs the environment set up for it, but "${environmentName}" was selected. Select that environment instead, or run from a different repository.`
    : `The selected environment "${environmentName}" only accepts the repository it is set up for, but the source was ${extra}. Run this from a checkout of that repository, or select a different environment.`;
}
//@ chunk-e6aww6q8.js:1953681-1955574 facade-exports
async function teleportToRemoteWithErrorHandling(root, options) {
  let prereq = await handleTeleportPrerequisites(
    root,
    new Set(["needsGitStash"]),
    options.showTeleportErrors,
  );
  let failReason;
  let failMessage;
  let notices = [];
  let failDetail;
  let session = await teleportToRemote({
    initialMessage: options.description,
    initialMessageUuid: options.descriptionUuid,
    signal: options.signal,
    source: options.source,
    personAskedForSession: options.personAskedForSession,
    branchName: options.branchName,
    branchFromHead: options.branchFromHead,
    explicitRef: options.explicitRef,
    permissionMode: options.permissionMode,
    isModeFromSettings: options.isModeFromSettings,
    proactivityLevel: options.proactivityLevel,
    effort: options.effort,
    isEffortFromSettings: options.isEffortFromSettings,
    disallowedTools: options.disallowedTools,
    builtinTools: options.builtinTools,
    model: options.model,
    title: options.title,
    environmentVariables: options.environmentVariables,
    appendSystemPrompt: options.appendSystemPrompt,
    poolId: options.poolId,
    chosenEnvironment: options.chosenEnvironment,
    reuseOutcomeBranch: options.reuseOutcomeBranch,
    correlationId: options.correlationId,
    persistentVolume: options.persistentVolume,
    persistentVolumeFromSessionId: options.persistentVolumeFromSessionId,
    monorepo: options.monorepo,
    noMonorepo: options.noMonorepo,
    noMonorepoAsksTheService: options.noMonorepoAsksTheService,
    personal: options.personal,
    sessionGroupingId: options.sessionGroupingId,
    deviceBinding: options.deviceBinding,
    connectedSession: options.connectedSession,
    ...{},
    hasApprovedCopy: options.hasApprovedCopy,
    storageV5: options.storageV5,
    credentials: options.credentials,
    allowBundle: true,
    firstUpload: options.firstUpload,
    staysAttached: options.staysAttached,
    deferInitialMessage: options.deferInitialMessage,
    forwardHomeSettings: options.forwardHomeSettings,
    ...(options.homeSettingsConsent && {
      homeSettingsConsent: options.homeSettingsConsent,
    }),
    onProgress: options.onProgress,
    onBundleFail: (message, phase) => {
      switch (phase) {
        case "env_create":
          failReason = "env_create_failed";
          break;
        case "bundle":
          failReason = "bundle_failed";
          break;
        default: {
          let unknownPhase = phase;
        }
      }
      failMessage = message;
      process.stderr.write(`
${message}
`);
    },
    onBundleNotice: (noticeText) => {
      notices.push(noticeText);
      process.stderr.write(`
${noticeText}
`);
    },
    onCreateFail: (failureText, failureReason, failureDetail) => {
      failReason = failureReason;
      failMessage = failureText;
      failDetail = failureDetail;
      process.stderr.write(`
${failureText}
`);
    },
  });
  if (session)
    return {
      ok: true,
      session,
      notices,
    };
  return {
    ok: false,
    failReason: failReason ?? (options.signal.aborted ? "aborted" : "unknown"),
    failMessage,
    failDetail,
  };
}
//@ chunk-e6aww6q8.js:1955574-1956933 facade-exports (2.1.88 match: teleportFromSessionsAPI, 0.864)
/**
 * 从 Sessions API 拉取远程会话的事件日志并转换为本地消息。
 */
async function teleportFromSessionsAPI(sessionId, orgUUID, accessToken, options, onProgress, session) {
  let startTime = Date.now();
  try {
    logForDebugging(`[teleport] Starting fetch for session: ${sessionId}`);
    onProgress?.("fetching_logs");
    let logsStartTime = Date.now();
    let logs;
    if (options) logs = undefined;
    else if (isPersistentRemoteSessionEnabled()) {
      let { readStoredTrustedDeviceToken } = await import("../bridge/trustedDevice.js");
      logs = await readStoredTrustedDeviceToken();
    } else logs = (await trustedDeviceHeaders())["X-Trusted-Device-Token"];
    let logs_2 = await checkAdminRequestEligibility(sessionId, accessToken, orgUUID, logs);
    if (logs_2 === null) {
      logForDebugging("[teleport] v2 endpoint returned null, trying session-ingress");
      logs_2 = await getSessionLogsViaOAuth(sessionId, accessToken, orgUUID);
    }
    logForDebugging(`[teleport] Session logs fetched in ${Date.now() - logsStartTime}ms`);
    if (logs_2 === null) throw Error("Failed to fetch session logs");
    let filterStartTime = Date.now();
    let messages = logs_2.filter((entry) => isTranscriptMessage(entry) && !entry.isSidechain);
    logForDebugging(
      `[teleport] Filtered ${logs_2.length} entries to ${messages.length} messages in ${Date.now() - filterStartTime}ms`,
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
async function awaitRemoteSessionResult(options, signal, credentials) {
  if (!isFirstPartyProvider())
    throw Error("Cloud sessions are only available on the first-party Anthropic API provider.");
  let pollIntervalMs = 1000;
  let timeoutMs = 1800000;
  let maxIdlePolls = 5;
  let maxFetchFailures = 10;
  let maxUnanswerablePolls = 3;
  let lastEventId = null;
  let lastAssistantEvent;
  let resultEvent;
  let toolCallCount = 0;
  let idlePolls = 0;
  let fetchFailures = 0;
  let unanswerablePolls = 0;
  let pendingQuestion;
  let isArchived = false;
  let now = Date.now();
  while (Date.now() - now < timeoutMs) {
    if (signal?.aborted) throw Error("Workflow aborted");
    let pollResult = await pollRemoteSessionEvents(options, lastEventId, {
      credentials,
    });
    lastEventId = pollResult.lastEventId;
    for (let newEvent of pollResult.newEvents)
      if (newEvent.type === "assistant") {
        lastAssistantEvent = newEvent;
        for (let contentBlock of newEvent.message.content)
          if (contentBlock.type === "tool_use") toolCallCount++;
      } else if (newEvent.type === "result") resultEvent = newEvent;
    if (pollResult.sessionStatus === "archived") {
      isArchived = true;
      break;
    }
    if (pollResult.sessionStatus === "requires_action") {
      let pendingAction = pollResult.pendingAction;
      let now = Date.now();
      if (pendingAction?.name === MCP_ELICITATION_DIALOG_TOOL) {
        unanswerablePolls = 0;
        if (pendingQuestion === undefined || pendingQuestion.requestId !== pendingAction.request_id)
          pendingQuestion = {
            requestId: pendingAction.request_id,
            firstSeenAt: now,
          };
        else if (now - pendingQuestion.firstSeenAt >= MCP_QUESTION_GRACE_MS)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Cloud session ${options} has shown an unanswered MCP server question for more than ${MCP_QUESTION_GRACE_MS / 60000} min, and nothing on this machine can answer it, so this run stopped waiting for it. If that server needs to ask the user things, run this agent locally rather than as a cloud session.`,
            "gave up waiting on a cloud session parked on an MCP server question",
          );
      } else {
        if (pendingAction === undefined) unanswerablePolls++;
        if (pendingAction !== undefined || unanswerablePolls >= maxUnanswerablePolls)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Cloud session ${options} is waiting for input that nothing on this machine can give (a permission prompt, a question, or some other dialog). If it is a permission prompt, make sure the cloud agent's allowed_tools cover the tool, or use a permission mode that doesn't prompt; if it is a question, tell the agent in its prompt not to ask one.`,
            "gave up on a cloud session parked on a prompt nothing here answers",
          );
      }
    } else if (pollResult.sessionStatus !== undefined) {
      unanswerablePolls = 0;
      pendingQuestion = undefined;
    }
    if (pollResult.sessionStatus === undefined) {
      fetchFailures++;
      if (fetchFailures >= maxFetchFailures)
        throw Error(
          `Cloud session ${options}: fetchSession failed ${maxFetchFailures} times in a row (last error: ${pollResult.metadataFetchError ?? "unknown"}). Bailing instead of polling to the 30-min timeout.`,
        );
    } else fetchFailures = 0;
    if (pollResult.sessionStatus === "idle" && pollResult.newEvents.length === 0) {
      idlePolls++;
      if (idlePolls >= maxIdlePolls) {
        isArchived = true;
        break;
      }
    } else idlePolls = 0;
    await sleep(pollIntervalMs, signal);
  }
  if (!isArchived)
    throw Error(
      `Cloud session ${options} timed out after ${timeoutMs / 60000} min` +
        (pendingQuestion !== undefined
          ? ", still waiting for someone to answer an MCP server's question"
          : ""),
    );
  let text =
    lastAssistantEvent && lastAssistantEvent.type === "assistant"
      ? extractTextContent_2(
          lastAssistantEvent.message.content,
          `
`,
        )
      : "";
  let resultMessage = resultEvent && resultEvent.type === "result" ? resultEvent : undefined;
  return {
    text,
    structuredOutput: resultMessage?.subtype === "success" ? resultMessage.structured_output : undefined,
    resultSubtype: resultMessage?.subtype,
    usage: resultMessage?.usage,
    totalCostUsd: resultMessage?.total_cost_usd,
    modelUsage: resultMessage?.modelUsage,
    numTurns: resultMessage?.num_turns,
    toolCalls: toolCallCount,
  };
}
//@ chunk-e6aww6q8.js:1959369-1960745 layout
function buildInitialControlEvents(options) {
  let events = [];
  if (
    options.thinking &&
    (options.thinking.maxThinkingTokens !== undefined || options.thinking.display !== undefined)
  )
    events.push({
      type: "event",
      data: {
        type: "control_request",
        request_id: `set-thinking-${randomUUID()}`,
        request: {
          subtype: "set_max_thinking_tokens",
          ...(options.thinking.maxThinkingTokens !== undefined && {
            max_thinking_tokens: options.thinking.maxThinkingTokens,
          }),
          ...(options.thinking.display !== undefined && {
            thinking_display: options.thinking.display,
          }),
        },
      },
    });
  if (options.proactivityLevel)
    events.push({
      type: "event",
      data: {
        type: "control_request",
        request_id: `set-level-${randomUUID()}`,
        request: {
          subtype: "set_proactivity_level",
          level: options.proactivityLevel,
          offer_bypass: false,
        },
      },
    });
  if (options.permissionMode)
    events.push(
      setModeControlEvent(options.permissionMode, {
        ultraplan: options.ultraplan,
        isFromSettings: options.isModeFromSettings,
      }),
    );
  if (!getIsNonInteractiveSession() && isFocusModeEnabled())
    events.push({
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
    events.push({
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
  if (options.title)
    events.push({
      type: "event",
      data: buildRenameSessionRequest(options.title),
    });
  if (
    typeof options.initialMessage === "string"
      ? options.initialMessage
      : options.initialMessage && options.initialMessage.length > 0
  )
    events.push({
      type: "event",
      data: {
        uuid: options.initialMessageUuid ?? randomUUID(),
        session_id: "",
        type: "user",
        parent_tool_use_id: null,
        message: {
          role: "user",
          content: options.initialMessage,
        },
      },
    });
  return events;
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
  let uuid = initialControlEvents.find((event) => event.data.type === "user")?.data.uuid;
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
  let hasMessage =
    typeof initialMessage === "string"
      ? initialMessage !== ""
      : initialMessage !== null && initialMessage.length > 0;
  return (options.builtinTools?.length ?? 0) > 0 && hasMessage && initialMessage
    ? {
        content: initialMessage,
        uuid: options.initialMessageUuid ?? randomUUID(),
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:1961522-1962589 layout
async function createRemoteSession(request) {
  let { options, sessionId, held, createEndpoint, signal, bound, pool } = request;
  if ((options.builtinTools ?? []).length === 0)
    return {
      ok: true,
      withheld: undefined,
    };
  if (isDeduplicatedCreateResponse(request.responseData)) {
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
  let archiveAndDescribe = async () => ({
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
        ...((bound || request.firstPromptDeferred) && {
          followsPermissionMode: true,
        }),
        ...(!request.followsUploads &&
          !request.firstPromptDeferred && {
            heldOnlyForToolsCheck: true,
          }),
      },
    };
  }
  if (signal.aborted) {
    await archiveAndDescribe();
    throw new AbortError_2();
  }
  let sendResult = await raceWithAbortSignal(
    sendEventToRemoteSession(sessionId, held.content, {
      uuid: held.uuid,
    }),
    signal,
    () => new AbortError_2(),
  ).catch(async (error) => {
    await archiveAndDescribe();
    throw error;
  });
  let sendOutcome = classifyPromptSendResult(sendResult);
  if (sendOutcome.kind !== "sent") {
    let archivedSession = await archiveAndDescribe();
    if (signal.aborted) throw new AbortError_2();
    logBuiltinToolsCreate(`prompt_${sendOutcome.kind}`, pool);
    options.onCreateFail?.(archiveCloudSession(sendOutcome, archivedSession), "first_prompt_not_sent", {
      endpoint: createEndpoint,
      sessionArchived: archivedSession.archived,
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
function refuseBuiltinToolsCreate(options, environmentKind) {
  let outcome =
    (options.builtinTools?.length ?? 0) > 0
      ? unsupportedEnvironmentOutcome(environmentKind, options.deviceBinding?.abandonsUnbound === true)
      : null;
  if (outcome === null) return false;
  logBuiltinToolsCreate(outcome.outcome, environmentKind === "self_hosted_pool");
  options.onCreateFail?.(outcome.message, `builtin_tools_${outcome.outcome}`);
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
async function latchBoundSessionTitle(sessionId, title, deviceUUID, credentials, options) {
  let eventSigner =
    deviceUUID === undefined
      ? undefined
      : import("../bridge/clientEventSigner.js").then(
          ({ deviceEventSignerFor }) => deviceEventSignerFor(deviceUUID, credentials, options),
          reportSignerLoadFailure,
        );
  let result = await sendControlRequestToRemoteSession(sessionId, buildRenameSessionRequest(title), {
    eventSigner,
  }).catch((error) => ({
    ok: false,
    reason: errorMessage(error),
  }));
  logEvent("tengu_device_bind_title_latched", {
    success: result.ok,
  });
  if (!result.ok) logForDebugging(`[deviceBind] rename_session after bound create failed: ${result.reason}`);
}
//@ chunk-e6aww6q8.js:1963280-1963434 layout
function extractTextContent(initialMessage) {
  if (typeof initialMessage === "string") return initialMessage;
  if (!initialMessage) return "";
  return initialMessage
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((textBlock) => textBlock.text)
    .join(" ");
}
//@ chunk-e6aww6q8.js:1963434-1963685 layout
async function isDriftingTwilightEnabled() {
  try {
    if (!DEVICE_BINDING_CREATE_ENABLED) return await checkGate_CACHED_OR_BLOCKING(TENGU_DRIFTING_TWILIGHT);
    let gate = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_DRIFTING_TWILIGHT, true);
    if (gate.source !== "fallback") return gate.value !== false;
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
async function prepareDeviceBinding(
  deviceBinding,
  endpoint,
  poolId,
  correlationId_2,
  correlationId,
  credentials,
  gateValue,
  isConsoleProfile,
) {
  if (!deviceBinding) return;
  if (endpoint !== "v1alpha2") return skipDeviceBinding("endpoint");
  if (poolId && isCcpoolId(poolId)) return skipDeviceBinding("pool");
  if (correlationId_2 === "byoc" || correlationId_2 === "bridge") return skipDeviceBinding("environment");
  if (correlationId) return skipDeviceBinding("correlation");
  if (isConsoleProfile) return skipDeviceBinding("profile");
  let { prepareDeviceBinder } = await import("../bridge/deviceBinder.js");
  return prepareDeviceBinder({
    orgUuid: deviceBinding.orgUuid,
    accountUuid: deviceBinding.accountUuid,
    credentials,
    confirmReenroll: deviceBinding.confirmReenroll,
    isEnabled: () => gateValue,
  });
}
//@ chunk-e6aww6q8.js:1964119-1964192 layout
function skipDeviceBinding(reason) {
  logEvent("tengu_device_bind_skipped", {
    reason: fromEnum(reason),
  });
  return err_2(reason);
}
//@ chunk-e6aww6q8.js:1964192-1964431 layout
function reportDeviceBindOutcome(deviceBinding, result, id, storageV5) {
  if (!deviceBinding || !result) return;
  if (result.ok) deviceBinding.onBound?.(result.value);
  else {
    deviceBinding.onUnbound?.(result.error);
    if (classifyDeviceBindingBlocker(result.error))
      import("../bridge/deviceUnboundCreates.js").then(
        ({ rememberUnboundCreate, productionUnboundCreatesDeps }) =>
          rememberUnboundCreate(id, result.error, productionUnboundCreatesDeps(storageV5)),
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
function isDeviceBindRefusalReason(reason) {
  return DEVICE_BIND_REFUSAL_REASONS_2.includes(reason);
}
//@ chunk-e6aww6q8.js:1964694-1964847 layout
function getDeviceBindRefusal(response) {
  let error = response?.error;
  let filtered = [error?.resource, error?.reason].filter(
    (value) => typeof value === "string" && value.length > 0,
  );
  if (filtered.length === 0) return;
  return filtered.find(isDeviceBindRefusalReason) ?? "other";
}
//@ chunk-e6aww6q8.js:1964847-1964950 layout
function deviceBindFailureKind(status, deviceBindRefusal) {
  if (deviceBindRefusal !== undefined && deviceBindRefusal !== "other") return deviceBindRefusal;
  return status === 404 ? "device_unknown" : "create_refused";
}
//@ chunk-e6aww6q8.js:1964950-1965052 layout
function getBoundDeviceUuid(response) {
  let boundDeviceUuid = response?.session?.bound_device_uuid;
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
  let droppedItems = [...(drops.envVars ? ["environment_variables"] : []), ...drops.events];
  if (droppedItems.length > 0)
    logForDebugging(`[deviceBind] bound create dropped ${droppedItems.join(", ")}`);
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
  let response = await post(buildBody(true), {
    ...proofHeaders,
    ...trust.proofHeaders,
  });
  if (response.status < 400 || response.status >= 500 || isCloudLaunchError(response.data)) return response;
  let proofs = requestRepositoriesTrusted(response.data);
  if (proofs === "unnamed" && proofHeaders !== undefined && requestSecurityTier(response.data) !== "refused")
    return response;
  refusalOut.refusal = proofs;
  logForDebugging(
    `[deviceBind] the create that carried repositories_trusted got ${response.status} (${proofs}); repeating it without the field`,
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
      ? await import("./teleport/seedAttestation.js").then(
          (seedSealerModule) =>
            seedSealerModule.createSeedSealer({
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
    (includeTrust) => {
      let body = buildBody(
        attestation,
        ask.kind === "ask" ? true : undefined,
        firstPromptDeferred,
        includeTrust,
      );
      return sealBody?.(body) ?? body;
    },
    ask.kind === "ask" ? ask.proofHeaders : undefined,
    trust,
    refusalOut,
  );
  let refusalTier;
  if (
    ask.kind === "ask" &&
    response.status >= 400 &&
    response.status < 500 &&
    !isCloudLaunchError(response.data)
  ) {
    refusalTier = requestSecurityTier(response.data);
    logForDebugging(
      `[deviceBind] the create that asked for the elevated tier got ${response.status} (${refusalTier}); repeating the bound create without the ask`,
    );
    response = await postWithRepoTrustRetry(
      post,
      (includeTrust) => {
        let body = buildBody(attestation, undefined, firstPromptDeferred, includeTrust);
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
        refusalTier ?? (securityTierOfResponse(response.data) === "elevated" ? "honored" : "not_honored"),
      );
    if (trust.kind === "not_sent") logTrustedRepositoriesOutcome(trust);
    else if (trust.kind === "send") {
      let trustOutcome =
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
      logTrustedRepositoriesOutcome(trustOutcome);
      logForDebugging(
        `[deviceBind] repositories_trusted on the create that made the session: ${trustOutcome.kind} (covers the ${trust.covers})`,
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
  let reregistered = response.status === 404 && binder ? await reregisterDevice(binder) : undefined;
  if (reregistered?.ok) {
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
        ...reregistered.value,
      },
    );
  }
  logForDebugging("[deviceBind] retrying the create unbound");
  let unboundResponse = await post(buildBody(undefined));
  if (unboundResponse.status === 200 || unboundResponse.status === 201)
    logFeatureSad("device_bind_session", reregistered?.error ?? deviceBindRefusal ?? "create_refused");
  return {
    response: unboundResponse,
    bind: err_2(reregistered?.error ?? deviceBindFailureKind(response.status, deviceBindRefusal)),
    attested: false,
    firstPromptDeferred: false,
  };
}
//@ chunk-e6aww6q8.js:1968820-1969140 layout
/**
 * 设备绑定被拒后重新注册设备：得到同一设备行时放弃；否则签名生成证明，返回证明与持有状态。
 */
async function reregisterDevice(binder) {
  let result = await binder.reregister();
  if (!result.ok) return result;
  if (result.value.deviceUUID === binder.deviceUUID) {
    logForDebugging(
      "[deviceBind] registering again returned the same device row the create refused; nothing new to try",
    );
    return err_2(undefined);
  }
  let rid = await result.value.sign();
  return rid === undefined
    ? err_2("sign")
    : ok_2({
        attestation: rid,
        held: result.value.held,
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
    let { runHomeSeed } = await import("../services/homeSeed/runHomeSeed.js");
    return runHomeSeed({
      sessionId,
      plan: planning.then(
        (homeSeedPlan) =>
          homeSeedPlan ?? {
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
function emptyRequestOptions(options, extra) {
  return {};
}
//@ chunk-e6aww6q8.js:1969698-1970617 layout
/**
 * 打包上传前解析 Read 规则与沙箱设置，得出哪些文件内容需要扣留（withholdFor）、哪些永不读取（neverReadFor）；规则不可读时提示并只上传已提交内容。
 */
function resolveBundleReadRules(withholding, warn, countFromOutsideRoot) {
  let launchRules = withholding ? collectLaunchRules() : null;
  let isCredentialListCountedFromOutsideRoot = launchRules !== null && countFromOutsideRoot;
  let { withholdFor, neverReadFor, rulesUnreadable, unreadableSettingsFiles } = launchRules
    ? classifySyncedFileSensitivity(
        resolveUploadFilterRules({
          launchRules,
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
  if (!launchRules)
    return {
      neverReadFor,
    };
  if (rulesUnreadable) {
    let readErrorsSuffix = settingsReadErrorsSuffix(unreadableSettingsFiles);
    let unreadableMessage =
      readErrorsSuffix === ""
        ? "A settings file has errors, so your Read rules and sandbox settings could not all be read (see /status)"
        : `Your Read rules and sandbox settings could not all be read${readErrorsSuffix}`;
    warn?.(
      `${unreadableMessage}: uncommitted file contents are left out of this upload; the cloud session starts from what is committed.`,
    );
  }
  return {
    withholdFor,
    neverReadFor: classifySyncedFileSensitivity(launchRules, {
      onlyAsLaunched: true,
    }).neverReadFor,
  };
}
//@ chunk-e6aww6q8.js:1970617-1970795 layout
function launchRuleSensitivity(withholding) {
  try {
    return classifySyncedFileSensitivity(collectLaunchRules(), {
      onlyAsLaunched: true,
    });
  } catch (error) {
    logError(error);
    let noopFactory = async () => () => true;
    return {
      withholdFor: noopFactory,
      neverReadFor: noopFactory,
      rulesUnreadable: true,
      unreadableSettingsFiles: [],
    };
  }
}
//@ chunk-e6aww6q8.js:1970795-1970855 layout
function noBundleReadRefusal(withholding, countFromOutsideRoot) {
  return {
    refusal: null,
    notRuledOutBy: undefined,
  };
}
//@ chunk-e6aww6q8.js:1970855-1973070 layout
async function uploadGitBundleForSession(
  options,
  capability,
  rules,
  previousCapture = null,
  purpose = "session",
) {
  let {
    createAndUploadGitBundle,
    explainPreviousCaptureRetired,
    handBackDecision,
    previousCaptureServes,
    unsupportedLayoutNotice,
  } = await import("./teleport/gitBundle.js");
  let refusalCheck = noBundleReadRefusal(capability.cwd ?? getCwd(), purpose);
  if (refusalCheck.refusal !== null) return refusalCheck.refusal;
  let hardenedCapability = {
    ...capability,
    notRuledOutBy: refusalCheck.notRuledOutBy,
  };
  let bundleResult = await createAndUploadGitBundle(options, hardenedCapability);
  if (
    hardenedCapability.hardenForDeviceSessions === true ||
    bundleResult.success ||
    bundleResult.failReason !== "unsupported_layout" ||
    rules === null ||
    hardenedCapability.signal?.aborted
  )
    return bundleResult;
  if (!previousCaptureServes()) {
    logEvent("tengu_ccr_bundle_upload", {
      outcome: lit_2("fallback_retired"),
      layout_kind: fromEnum(bundleResult.layoutKind),
      github_start_obstacle: fromEnumOpt(previousCapture?.kind),
      ...(bundleResult.gitFileKind !== undefined && {
        git_file_kind: fromEnum(bundleResult.gitFileKind),
      }),
    });
    logFeatureBad("teleport_git_bundle_upload", "fallback_retired");
    return {
      success: false,
      error: `${bundleResult.error} ${explainPreviousCaptureRetired(previousCapture)}`,
      failReason: "refused",
    };
  }
  let handBack = await handBackDecision(
    hardenedCapability.cwd,
    hardenedCapability.signal,
    hardenedCapability.withholdFor,
  );
  if (hardenedCapability.signal?.aborted) {
    if (handBack.kind === "proceed") await handBack.pinnedIndex?.dispose();
    return bundleResult;
  }
  if (handBack.kind === "refused") {
    let refusalOutcome = !handBack.indexCopied
      ? "fallback_refused_index_copy"
      : handBack.gitlinks > 0
        ? "fallback_refused_gitlink"
        : handBack.named > 0
          ? "fallback_refused_credential_named"
          : handBack.unexamined > 0
            ? "fallback_refused_index_mode"
            : "fallback_refused_unlisted";
    logEvent("tengu_ccr_bundle_upload", {
      outcome: fromEnum(refusalOutcome),
      layout_kind: fromEnum(bundleResult.layoutKind),
      legacy_bundle: true,
      credential_named_wip: handBack.named,
      credential_named_added: handBack.added,
      refused_unexamined: handBack.unexamined,
      registered_gitlinks: handBack.gitlinks,
      ...(handBack.indexCopyCause !== undefined && {
        index_copy_cause: fromEnum(handBack.indexCopyCause),
      }),
    });
    logFeatureBad(
      "teleport_git_bundle_upload",
      refusalOutcome === "fallback_refused_credential_named" ? "uncommitted_credentials" : refusalOutcome,
    );
    return {
      success: false,
      error: `${bundleResult.error} ${handBack.sentence}`,
      failReason: "uncommitted_credentials",
    };
  }
  let legacyResult;
  try {
    logEvent("tengu_ccr_bundle_upload", {
      outcome: lit_2("fallback_legacy_capture"),
      layout_kind: fromEnum(bundleResult.layoutKind),
      ...(bundleResult.gitFileKind !== undefined && {
        git_file_kind: fromEnum(bundleResult.gitFileKind),
      }),
      legacy_bundle: true,
    });
    rules?.(unsupportedLayoutNotice(bundleResult.layoutKind));
    legacyResult = await createAndUploadGitBundle(options, {
      ...hardenedCapability,
      hardenForDeviceSessions: false,
      refuseCredentialNamedInStash: true,
      pinnedIndexFile: handBack.pinnedIndex?.path,
    });
  } finally {
    await handBack.pinnedIndex?.dispose();
  }
  return !legacyResult.success && legacyResult.failReason === "uncommitted_credentials"
    ? {
        ...legacyResult,
        error: `${bundleResult.error} ${legacyResult.error.replace(/^Not uploading this working tree: /, "It is not uploaded the previous way either (that way keeps nothing back): ")}`,
      }
    : legacyResult;
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
async function hasRecoveredBearer(heldToken, withheld) {
  return (await recoverHostSessionsBearer(heldToken, withheld ? "withheld" : "refused")) !== "not_held";
}
//@ chunk-e6aww6q8.js:1973235-2009090 facade-exports (2.1.88 match: teleportToRemote, 0.247)
/**
 * 创建云端会话（Claude Code on the web）：检查第一方与策略 allow_remote_sessions、选择环境、打包/上传 git 状态、绑定设备，POST /v1/code/sessions 并发送初始消息与控制事件。
 */
async function teleportToRemote(options) {
  let { initialMessage, signal } = options;
  let cwdPath = options.cwd ?? getCwd();
  let h = false;
  let y = false;
  let extraTags = [];
  let tags = extraTags.length === 0 ? options.tags : [...(options.tags ?? []), ...extraTags];
  let connectedSessionPromise =
    options.connectedSession === undefined ? undefined : Promise.resolve(options.connectedSession);
  let gatePromise = () => (connectedSessionPromise ??= sensitivePathGateEnabled());
  let bindablePromise;
  let isBindable = () =>
    (bindablePromise ??= gatePromise().then((gateValue) => isProjectSessionBindable(gateValue, undefined)));
  let seenValue;
  let alwaysFalse = () => (seenValue ??= false);
  let we;
  let unreachable = () => {
    throw Error("unreachable");
  };
  let alwaysFalseAsync = async () => false;
  let woodValue;
  let isViolinWood = () =>
    (woodValue ??= isViolinWoodEnabled()
      .catch(() => false)
      .then(async (woodZt) => woodZt || (await gatePromise())));
  let alwaysTrueAsync = async () => true;
  let policyDenied = policyDeniedReason("allow_remote_sessions", "Cloud sessions", "are");
  if (policyDenied) {
    logOrgPolicyDenied("allow_remote_sessions", "cloud_session");
    options.onCreateFail?.(policyDenied, "policy_denied");
    return null;
  }
  let cloudRefusal = cloudCreateRefusal();
  if (cloudRefusal !== null) {
    options.onCreateFail?.(cloudRefusal.message, cloudRefusal.reason);
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
    await import("./teleport/gitBundle.js");
  let uploadedBundle = null;
  let gt = null;
  let At = [];
  let bundleKept = false;
  let seedBundle = null;
  let created = false;
  try {
    options.onProgress?.({
      kind: "checking",
      ...(findGitRoot(cwdPath) === null && {
        folder: true,
      }),
    });
    let noGit = false;
    let poolId = options.poolId ?? options.chosenEnvironment?.environment_id;
    let selection =
      poolId !== undefined
        ? {
            id: poolId,
            source: undefined,
            ignoredUntrustedPool: undefined,
          }
        : noGit
          ? {
              id: undefined,
              source: undefined,
              ignoredUntrustedPool: undefined,
            }
          : getEnvironmentSelectionInfo();
    let unusedNull = null;
    let hn = null;
    let isPool = isCcpoolId(options.environmentId ? options.environmentId : selection.id);
    let endpoint =
      (Object.keys(options.environmentVariables ?? {}).length === 0 && (await gatePromise())) ||
      ((options.source === "ultrareview" || options.source === "ultraplan") &&
        (await checkGate_CACHED_OR_BLOCKING(TENGU_WOVEN_HARBOR))) ||
      (isPool && (await isDriftingTwilightEnabled()))
        ? "v1alpha2"
        : "v1";
    if (options.sessionGroupingId && endpoint !== "v1alpha2") {
      options.onCreateFail?.(
        "--project requires the new session-create endpoint, which isn't enabled for your account yet \u2014 no session was created.",
        "project_not_enabled",
        {
          endpoint,
        },
      );
      return null;
    }
    if (options.agentId && endpoint !== "v1alpha2") {
      options.onCreateFail?.(
        "Dispatching into a Kindling project requires the new session-create endpoint, which isn't enabled for your account yet \u2014 no session was created.",
        "agent_not_enabled",
        {
          endpoint,
        },
      );
      return null;
    }
    if (options.deviceBinding && options.sessionGroupingId) {
      options.onCreateFail?.(
        "--project cannot be combined with a device-bound session yet \u2014 no session was created.",
        "device_bind_project_unsupported",
        {
          endpoint,
        },
      );
      return null;
    }
    if (options.deviceBinding && options.agentId) {
      options.onCreateFail?.(
        "An agent-owned session cannot be combined with a device-bound session yet \u2014 no session was created.",
        "device_bind_agent_unsupported",
        {
          endpoint,
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
        endpoint,
      });
      return null;
    }
    let sessionToken;
    let bundleToken;
    let usesConsoleProfileCredentials = isConsoleProfileSessionsCredential();
    if (usesConsoleProfileCredentials) {
      try {
        sessionToken = await resolveConsoleProfileBearer({
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
      bundleToken = sessionToken;
    } else {
      sessionToken = await getCloudSessionAccessToken(options.credentials, options.storageV5);
      bundleToken = getAccessTokenWithCcrFallback();
    }
    let isStoredLogin = !usesConsoleProfileCredentials;
    if (!sessionToken || !bundleToken) {
      let tokenError =
        "Cloud sessions require a claude.ai login. Run /login to authenticate." +
        (env.CLAUDE_CODE_REMOTE
          ? ` (in CCR: env=${env.CLAUDE_CODE_OAUTH_TOKEN ? "set" : "unset"}, fd=${env.CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR ? "set" : "unset"})`
          : "");
      logError(Error(tokenError));
      options.onCreateFail?.(tokenError, "no_access_token");
      return null;
    }
    let orgUUID = await sessionsApiOrganizationUUID(usesConsoleProfileCredentials);
    if (!orgUUID) {
      let orgError =
        "Unable to get organization UUID for cloud session creation" +
        (env.CLAUDE_CODE_REMOTE
          ? ` (in CCR: CLAUDE_CODE_ORGANIZATION_UUID=${env.CLAUDE_CODE_ORGANIZATION_UUID ? "set" : "unset"})`
          : "");
      logError(Error(orgError));
      options.onCreateFail?.(orgError, "no_org_uuid");
      return null;
    }
    let envVars = {
      ...options.environmentVariables,
    };
    delete envVars.CLAUDE_CODE_OAUTH_TOKEN;
    delete envVars.CLAUDE_CODE_SESSIONS_OAUTH_TOKEN;
    if (options.environmentId) {
      let referralEligibility = fetchReferralEligibility_2(
        endpoint,
        sessionToken,
        orgUUID,
        usesConsoleProfileCredentials,
        () => getCloudSessionAccessToken(options.credentials, options.storageV5),
        hasRecoveredBearer,
      );
      if (refuseBuiltinToolsCreate(options, undefined)) return null;
      let source = null;
      let seedFileId = null;
      if (options.useBundle) {
        let withholding = await isViolinWood();
        let bundleConfig = {
          oauthToken: bundleToken,
          isStoredLogin,
          sessionId: getSessionId(),
          baseUrl: getOauthConfig().BASE_API_URL,
        };
        let bundleResult = await uploadGitBundleForSession(
          bundleConfig,
          {
            signal,
            baseRef: options.bundleBaseRef,
            forceScope: options.bundleForceScope,
            currentBranchOnly: withholding,
            ...(withholding && {
              hardenForDeviceSessions: true,
              startsInProject: await alwaysTrueAsync(),
            }),
            ...resolveBundleReadRules(
              withholding,
              options.onBundleNotice,
              withholding && (await alwaysFalseAsync()),
            ),
          },
          options.onBundleNotice,
          null,
          options.source === "ultrareview" ? "review" : "session",
        );
        if (bundleResult.success)
          seedBundle = {
            fileId: bundleResult.fileId,
            config: bundleConfig,
          };
        if (signal.aborted) throw new AbortError_2();
        if (!bundleResult.success) {
          logForDebugging(`Bundle upload failed: ${bundleResult.error}`, {
            level: "error",
          });
          if (bundleResult.failReason !== "too_large") options.onBundleFail?.(bundleResult.error, "bundle");
          return null;
        }
        seedFileId = bundleResult.fileId;
        if (bundleResult.leftOut?.length)
          options.onBundleNotice?.(
            leftOutNotice(bundleResult.leftOut, {
              readRules: withholding,
            }),
          );
        if (bundleResult.deletedHere?.length)
          options.onBundleNotice?.(deletedHereNotice(bundleResult.deletedHere));
        logEvent("tengu_teleport_bundle_mode", {
          size_bytes: bundleResult.bundleSizeBytes,
          scope: fromEnum(bundleResult.scope),
          has_wip: bundleResult.hasWip,
          current_branch_only: withholding,
          reason: lit_2("explicit_env_bundle"),
        });
      } else if (options.sourceUrl)
        source = {
          type: "git_repository",
          url: options.sourceUrl,
          revision: options.branchName,
        };
      else if (!options.agentId) {
        let orgUUID = await detectCurrentRepositoryWithHost();
        if (orgUUID && !isNestedGitLabProject(orgUUID))
          source = {
            type: "git_repository",
            url: `https://${orgUUID.host}/${orgUUID.owner}/${orgUUID.name}`,
            revision: options.branchName,
          };
      }
      let titleText = options.title || options.description || REMOTE_TASK_TITLE;
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
        endpoint,
        options.environmentId,
        undefined,
        options.correlationId,
        options.credentials,
        gatePromise(),
        usesConsoleProfileCredentials,
      );
      let selector = environmentSelector(options.environmentId);
      let buildBody = (deviceBinding, requestElevatedTier, deferFirstPrompt) =>
        endpoint === "v1alpha2"
          ? buildSessionCreateBody({
              title: titleText,
              worker: selector,
              events: initialControlEvents,
              sources: source ? [source] : [],
              outcomes: [],
              model: options.model,
              seedBundleFileId: seedFileId ?? undefined,
              environmentVariables: envVars,
              appendSystemPrompt: options.appendSystemPrompt,
              customSystemPrompt: options.customSystemPrompt,
              appendSubagentSystemPrompt: options.appendSubagentSystemPrompt,
              fallbackModel: options.fallbackModel,
              maxTurns: options.maxTurns,
              maxBudgetUsd: options.maxBudgetUsd,
              allowedTools: options.allowedTools,
              disallowedTools: options.disallowedTools,
              outputSchema: options.outputSchema,
              tags,
              sessionGroupingId: options.sessionGroupingId,
              agentId: options.agentId,
              correlationId: options.correlationId,
              deviceBinding,
              requestElevatedTier,
              deferFirstPrompt,
            })
          : {
              title: titleText,
              events: initialControlEvents,
              session_context: {
                sources: source ? [source] : [],
                ...(seedFileId && {
                  seed_bundle_file_id: seedFileId,
                }),
                outcomes: [],
                environment_variables: envVars,
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
              ...selector,
              ...(tags && {
                tags,
              }),
            };
      logForDebugging(
        `[teleportToRemote] explicit env ${options.environmentId}, ${Object.keys(envVars).length} env vars, ${seedFileId ? "source=bundle" : `source=${source?.url ?? "none"}@${options.branchName ?? "default"}`}`,
      );
      if (signal.aborted) throw new AbortError_2();
      let {
        response,
        bind: createResult,
        held,
        attested,
        firstPromptDeferred,
      } = await createWithDeviceBinding({
        prepared,
        buildBody,
        drops: summarizeSessionCreateBody({
          events: initialControlEvents,
          environmentVariables: envVars,
        }),
        callerSendsFirstPrompt: options.deferInitialMessage === true,
        attaches: {
          anything: source !== null || seedFileId !== null,
          launchCheckout: null,
        },
        post: (postBody, bindState) =>
          ensureTrustedDevice(referralEligibility, bindState, (headers) =>
            axios_default.post(referralEligibility.url, postBody, {
              headers,
              signal,
              validateStatus: (status) => status < 500,
            }),
          ),
      });
      created = isSuccessStatus(response.status);
      if (response.status !== 200 && response.status !== 201) {
        let url = `CreateSession ${response.status}: ${jsonStringify(response.data)}`;
        let errorData = response.data;
        if (
          [401, 403, 429].includes(response.status) ||
          errorData?.error?.reason === "github_repo_access_denied"
        )
          logForDebugging(`[teleportToRemote] ${url}`, {
            level: "error",
          });
        else {
          let token = (rawToken) => (rawToken && /^[a-z][a-z0-9_]*$/.test(rawToken) ? rawToken : undefined);
          logError(
            Error(`[type=${token(errorData?.error?.type)},reason=${token(errorData?.error?.reason)}] ${url}`),
          );
        }
        let errorText = cloudErrorMessage(response, errorData?.error?.message);
        options.onCreateFail?.(
          (options.sessionGroupingId &&
            projectNotFoundMessage(options.sessionGroupingId, errorData?.error)) ||
            (await explainUntrustedDeviceRefusal(response, referralEligibility)) ||
            loginRejectedMessage(response.status, errorText.message) ||
            errorText.message ||
            errorText.statusLine,
          "create_request_failed",
          {
            status: response.status,
            serverType: normalizeApiErrorType(errorData?.error?.type),
            serverReason: normalizeCreateSessionError(errorData?.error?.reason),
            endpoint,
            messageHidden: errorText.messageHidden,
          },
        );
        return null;
      }
      let sessionResult = sessionIdFromCreateResponse(endpoint, response.data);
      if (!sessionResult.ok) {
        let createFailure = CREATE_SESSION_FAILURES[sessionResult.error];
        logError(
          withTelemetryMessage(
            Error(`${createFailure.logLead}: ${jsonStringify(response.data)}`),
            createFailure.telemetry,
          ),
        );
        options.onCreateFail?.(createFailure.message, createFailure.reason);
        return null;
      }
      let session = sessionResult.value;
      options.onProgress?.({
        kind: "session_exists",
        sessionId: session.id,
      });
      logCloudSessionLink(
        session.id,
        options.source,
        {
          project: false,
          global: false,
        },
        {
          endpoint,
          grouped: options.sessionGroupingId != null,
        },
        options.storageV5,
      );
      reportDeviceBindOutcome(options.deviceBinding, createResult, session.id, options.storageV5);
      if (attested && options.title)
        latchBoundSessionTitle(
          session.id,
          options.title,
          createResult?.ok ? createResult.value : undefined,
          options.credentials,
          createResult?.ok ? held : undefined,
        );
      let withheldMessage = firstPromptDeferred
        ? deferredFirstPrompt(initialControlEvents, initialMessage)
        : undefined;
      return {
        id: session.id,
        title: sessionTitleOf(session, titleText),
        ...(withheldMessage && {
          withheldInitialMessage: withheldMessage,
        }),
        ...(options.maxTurns !== undefined && {
          maxTurnsConfirmed: acceptsMaxTurns(endpoint, session, options.maxTurns),
        }),
      };
    }
    if (selection.ignoredUntrustedPool)
      logForDebugging(
        `Ignoring self-hosted environment default ${selection.ignoredUntrustedPool.id} from ${selection.ignoredUntrustedPool.source} \u2014 environment placement is only honoured from user/policy/flag settings. Run /remote-env to set your environment.`,
        {
          level: "warn",
        },
      );
    let id = selection.id;
    let isPoolEnv = isCcpoolId(id);
    if (isPoolEnv && options.poolId === undefined)
      fetchSelfHostedPools(sessionToken, options.credentials).then(
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
    let promptText = options.description || extractTextContent(initialMessage);
    let needsTitlePolicy = !promptText && (await gatePromise());
    let titlePromise;
    let resolveTitle = () =>
      (titlePromise ??=
        options.title && options.reuseOutcomeBranch
          ? Promise.resolve({
              title: options.title,
              branchName: options.reuseOutcomeBranch,
            })
          : needsTitlePolicy
            ? Promise.resolve(DEFAULT_BACKGROUND_TASK_TITLE)
            : checkSessionTitlePolicyTaint(
                promptText || DEFAULT_BACKGROUND_TASK_TITLE.title,
                signal,
                options.credentials,
              ));
    if ((options.builtinTools?.length ?? 0) === 0) resolveTitle();
    logForDebugging("[teleport] phase: env-select");
    let environments = isPoolEnv
      ? []
      : options.chosenEnvironment !== undefined
        ? [options.chosenEnvironment]
        : await fetchEnvironments(sessionToken, options.storageV5, options.credentials);
    if (signal.aborted) throw new AbortError_2();
    if (!isPoolEnv && environments.length === 0 && !noGit)
      try {
        environments = [await createDefaultCloudEnvironment(undefined, signal, sessionToken)];
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
      `Available environments: ${environments.map((environment) => `${environment.environment_id} (${environment.name}, ${environment.kind})`).join(", ")}`,
    );
    let defaultEnvId = id;
    let defaultEnvironment = defaultEnvId
      ? environments.find((environment) => environment.environment_id === defaultEnvId)
      : undefined;
    let first = findFirst(environments, (environment) => environment.kind === "anthropic_cloud");
    if (!isPoolEnv && options.useDefaultEnvironment && !defaultEnvironment && !first) {
      logForDebugging(
        `No configured default or anthropic_cloud in env list (${environments.length} envs); retrying fetchEnvironments`,
      );
      environments = await fetchEnvironments(sessionToken, options.storageV5, options.credentials);
      if (signal.aborted) throw new AbortError_2();
      defaultEnvironment = defaultEnvId
        ? environments.find((environment) => environment.environment_id === defaultEnvId)
        : undefined;
      first = findFirst(environments, (environment) => environment.kind === "anthropic_cloud");
      if (!defaultEnvironment && !first) {
        let joined = environments
          .map(
            (environment) =>
              `"${environmentLabelOrKind(environment.name, environment.environment_id)}" (${safeTokenText(environment.kind)})`,
          )
          .join(", ");
        let noDefaultEnvMessage = `No configured default or anthropic_cloud environment available after retry (got: ${joined.length > 1500 ? `${environments.length} environments` : joined}${defaultEnvId ? `; configured default ${safeTokenText(defaultEnvId)} not in list` : ""})`;
        logForDebugging(
          `[teleportToRemote] ${noDefaultEnvMessage}. Silent byoc fallthrough would launch into a dead env \u2014 fail fast instead. Environments as received (name, id, kind): ${jsonStringify(environments.map((environment) => [environment.name, environment.environment_id, environment.kind]))}`,
          {
            level: "error",
          },
        );
        options.onCreateFail?.(noDefaultEnvMessage, "no_default_env");
        return null;
      }
    }
    let selectedEnvironment = isPoolEnv
      ? undefined
      : defaultEnvironment ||
        undefined ||
        first ||
        environments.find((environment) => environment.kind !== "bridge") ||
        environments[0];
    if (!selectedEnvironment && !isPoolEnv) {
      logError(Error("No environments available for session creation"));
      options.onCreateFail?.("No environments available for session creation", "no_environments");
      return null;
    }
    if (defaultEnvId && selectedEnvironment) {
      let isConfiguredDefault = selectedEnvironment.environment_id === defaultEnvId;
      logForDebugging(
        isConfiguredDefault
          ? `Using the configured default environment: ${defaultEnvId}`
          : `Configured default environment ${defaultEnvId} not found, using the fallback`,
      );
    }
    let environmentId = isPoolEnv ? defaultEnvId : selectedEnvironment.environment_id;
    logForDebugging(
      selectedEnvironment
        ? `Selected environment: ${environmentId} (${selectedEnvironment.name}, ${selectedEnvironment.kind})`
        : `Selected environment: ${environmentId}`,
    );
    if (
      refuseBuiltinToolsCreate(
        options,
        options.agentId ? undefined : isPoolEnv ? "self_hosted_pool" : selectedEnvironment?.kind,
      )
    )
      return null;
    let environmentLabel = environmentLabelOrKind(
      options.chosenEnvironment === undefined ? selectedEnvironment?.name : undefined,
      environmentId,
    );
    resolveTitle();
    let repoSource = null;
    let repoSlug = null;
    let bundleFileId = null;
    let bundleScope = "all";
    let gitSource = null;
    let seedBundleFileId = null;
    if (options.sourceUrl)
      repoSource = {
        type: "git_repository",
        url: options.sourceUrl,
        revision: options.branchName,
      };
    logForDebugging("[teleport] phase: branch-detect");
    let detectedRepo =
      repoSource || options.agentId || noGit ? null : await detectCurrentRepositoryWithHost(options.cwd);
    let repo = detectedRepo && isNestedGitLabProject(detectedRepo) ? null : detectedRepo;
    if (detectedRepo && !repo)
      logForDebugging("[teleportToRemote] nested GitLab project \u2014 not sent as a git source");
    let githubAvailable = false;
    let gitSource_2 = null;
    let transient = false;
    let notConnected = false;
    let gitOutcome = null;
    let sourceReason = options.sourceUrl
      ? "explicit_source_url"
      : options.agentId
        ? "agent_defaults"
        : "no_git_at_all";
    let gitRoot = findGitRoot(cwdPath);
    let isSelfHosted = isPoolEnv || selectedEnvironment?.kind === "byoc";
    let byocEnv = isSelfHosted || false;
    let isSelfHostedEnv =
      isSelfHosted ||
      selfHostedEnvironmentKind({
        environment_kind: selectedEnvironment?.kind,
      }) !== null;
    let refFlag = options.reuseOutcomeBranch ? "--on-branch" : "--ref";
    let CCR_FORCE_BUNDLE = options.allowBundle && !byocEnv && !options.agentId && env.CCR_FORCE_BUNDLE;
    let bundleEnabled =
      options.allowBundle &&
      !byocEnv &&
      !options.agentId &&
      gitRoot !== null &&
      (env.CCR_ENABLE_BUNDLE || (await checkGate_CACHED_OR_BLOCKING("tengu_ccr_bundle_seed_enabled")));
    let repoBundleSwitches =
      options.allowBundle && !byocEnv && !options.agentId && gitRoot !== null
        ? repositorySetBundleSwitches()
        : [];
    if (repoBundleSwitches.length > 0)
      options.onBundleNotice?.(
        `${repoBundleSwitches.join(", ")} in this repository\u2019s .claude/settings files ${repoBundleSwitches.length === 1 ? "is" : "are"} ignored there: how a cloud start is seeded from this machine is the machine owner\u2019s setting (shell environment or ~/.claude/settings.json), never a repository\u2019s.`,
      );
    let seedBundleFileId_2 = null;
    let folderPlan = {
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
    let { folderRoot, optedIn } = folderPlan;
    let forwardHomeSettings =
      options.staysAttached === true &&
      (await gatePromise()) &&
      options.forwardHomeSettings !== false &&
      !byocEnv &&
      !options.agentId &&
      homeSettingsForwardingFeature(options.homeSettingsConsent).enabledNow() &&
      isForwardModeEffective(options.homeSettingsConsent);
    let homeSeedEnabled = forwardHomeSettings && !isSelfHostedEnv;
    let withRunnerPack = homeSeedEnabled && isRemoteHomeSettingsDisabled();
    let launchConsentBlocked = homeSeedEnabled && isLaunchConsentBlocked(options.homeSettingsConsent);
    let homeSeedPlanPromise =
      homeSeedEnabled && (!launchConsentBlocked || optedIn || folderRoot !== null)
        ? import("../services/homeSeed/planHomeSeed.js")
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
    let defaultBranchName;
    let fromHeadBranch =
      options.branchFromHead === true &&
      options.branchName !== undefined &&
      options.explicitRef === undefined;
    let launchLayout =
      gitRoot !== null && (await isViolinWood())
        ? await readLaunchGitLayout(gitRoot, signal, await alwaysTrueAsync())
        : undefined;
    if (signal.aborted) throw new AbortError_2();
    let Hi = undefined;
    let pinnedAppCheck = null;
    let now = Date.now();
    let appCheckPromise =
      repo && !CCR_FORCE_BUNDLE && !isSelfHosted && isGithubDotCom(repo.host)
        ? (pinnedAppCheck ?? checkGithubAppInstalled(repo.owner, repo.name, signal))
        : null;
    let shouldAskGithub = (branch) => appCheckPromise !== null && !optedIn && branch !== "HEAD";
    let askGithubBranch = async (branch) => {
      if (!repo || appCheckPromise === null) return null;
      let appCheck = await appCheckPromise;
      if (!appCheck.appInstalled || branch === appCheck.defaultBranch) return null;
      let min = Math.min(GITHUB_APP_CHECK_TIMEOUT_MS, GITHUB_APP_CHECK_TIMEOUT_MS - (Date.now() - now));
      if (min < MIN_RESYNC_BUDGET_MS) {
        logForDebugging(
          `[teleportToRemote] GitHub not asked about branch ${branch}: only ${Math.max(0, min)} ms of the GitHub App preflight's 15 s was left`,
        );
        return null;
      }
      let lookUpBranch = (
        await askGithubBranchExists({
          owner: repo.owner,
          name: repo.name,
          branches: [branch],
          timeoutMs: min,
          signal,
          credentials: options.credentials,
        })
      )(branch);
      if (lookUpBranch === "no")
        logForDebugging(
          `[teleportToRemote] GitHub has no branch ${branch}: the start is looked up again without its remote-tracking ref, unless the search for a pushed commit had already failed`,
        );
      return lookUpBranch;
    };
    let remoteLookup =
      gitRoot !== null && repo && !isSelfHosted && !CCR_FORCE_BUNDLE && (optedIn || fromHeadBranch)
        ? await resolveRemote(
            gitRoot,
            launchLayout === undefined
              ? undefined
              : await screenedGitEnvForReach(launchLayout, gitRoot, signal, await alwaysTrueAsync()),
          )
        : null;
    let searchTries = 0;
    let createdFrom = null;
    let startResolver =
      fromHeadBranch && gitRoot !== null && remoteLookup !== null
        ? async (branch) =>
            resolveStartWithGithub({
              lookUp: async ({ remoteLacksBranch }) => {
                createdFrom = null;
                return checkBranchPushed({
                  gitRoot,
                  remoteName: remoteLookup.name,
                  branch,
                  nameContaining: repo ? !isGithubDotCom(repo.host) : false,
                  countAhead: true,
                  sessionRoot: launchLayout === undefined ? undefined : gitRoot,
                  sessionReach: launchLayout,
                  ...(launchLayout !== undefined && {
                    startsInProject: await alwaysTrueAsync(),
                  }),
                  ...(remoteLacksBranch && {
                    staleBranch: branch,
                  }),
                  signal,
                  onSearchAmongAllRefs: (count) => {
                    searchTries += count;
                  },
                  onCreation: (creation) => {
                    createdFrom = creation;
                  },
                });
              },
              ask: shouldAskGithub(branch) ? () => askGithubBranch(branch) : null,
            })
        : null;
    let isOwnStartGood = (start) =>
      start.kind === "pushed_ancestor" &&
      (!repo || isGithubDotCom(repo.host) || start.branch !== null || start.containedIn !== undefined);
    let launchBranch =
      fromHeadBranch && options.branchName !== undefined && !optedIn
        ? recordedOriginalBranch(options.branchName)
        : options.branchName;
    let branchToLookUp =
      startResolver !== null && gitRoot !== null && options.branchName !== undefined && !optedIn
        ? await branchForTeleport(gitRoot, options.branchName)
        : launchBranch;
    let now_2 = Date.now();
    let lookUpStart =
      startResolver !== null && branchToLookUp !== undefined && branchToLookUp !== launchBranch
        ? await startResolver(branchToLookUp)
        : null;
    let start = lookUpStart?.start ?? null;
    let startGood = start !== null && (start.kind === "on_remote" || isOwnStartGood(start));
    let startBranch = startGood ? branchToLookUp : launchBranch;
    let runResult = startGood
      ? lookUpStart
      : startResolver !== null && launchBranch !== undefined
        ? await startResolver(launchBranch)
        : null;
    let start_2 = runResult?.start ?? null;
    let startMs = start_2 === null ? null : Date.now() - now_2;
    let remoteUnresolved =
      fromHeadBranch &&
      remoteLookup === null &&
      launchLayout !== undefined &&
      !!repo &&
      !isSelfHosted &&
      !CCR_FORCE_BUNDLE;
    if (remoteUnresolved)
      logForDebugging(
        "[teleportToRemote] the screened remote look-up answered nothing, so the start was not resolved. One possible cause: its git applies no personal git file, so a checkout that git takes for another account\u2019s counts as safe only when the system file says so (git config --system --add safe.directory <path>).",
        {
          level: "warn",
        },
      );
    let goodStart = start_2 !== null && isOwnStartGood(start_2) ? start_2 : null;
    if (signal.aborted) throw new AbortError_2();
    let layoutPromise = null;
    if (signal.aborted) throw new AbortError_2();
    if (repo && !CCR_FORCE_BUNDLE) {
      if (isSelfHosted) {
        githubAvailable = true;
        sourceReason = "byoc_env_skip_preflight";
      } else if (isGithubDotCom(repo.host)) {
        let appCheck = await (appCheckPromise ?? checkGithubAppInstalled(repo.owner, repo.name, signal));
        githubAvailable = appCheck.appInstalled;
        gitSource_2 = appCheck.defaultBranch;
        transient = appCheck.transient;
        notConnected = appCheck.linkedAccountAccess === "github_not_connected";
        gitOutcome = githubAvailable
          ? null
          : {
              ...GITHUB_PRECONDITION_ERRORS(appCheck),
              httpStatus: appCheck.httpStatus,
            };
        sourceReason = githubAvailable ? "github_preflight_ok" : "github_preflight_failed";
      } else {
        githubAvailable = true;
        sourceReason = "ghes_optimistic";
      }
    } else if (CCR_FORCE_BUNDLE) sourceReason = "forced_bundle";
    else if (gitRoot && !options.agentId) sourceReason = "no_github_remote";
    let githubPreflight = null;
    if (signal.aborted) throw new AbortError_2();
    if (gitOutcome !== null)
      logFeatureSad("cloud_github_preflight", `${gitOutcome.kind}_${gitOutcome.httpStatus ?? "none"}`);
    else if (sourceReason === "github_preflight_ok") logFeatureOk("cloud_github_preflight");
    let preflightFailure = gitOutcome;
    let preflightFields =
      preflightFailure === null
        ? {}
        : {
            github_preflight_failure: fromEnum(preflightFailure.kind),
            ...(preflightFailure.httpStatus !== null && {
              github_preflight_http_status: preflightFailure.httpStatus,
            }),
          };
    let titlePlan = {
      engine: "none",
      reason: "not_opted_in",
    };
    let settingsPlan = null;
    let xxAc = undefined;
    let xxTp = undefined;
    let xxYh = null;
    let pinnedCommit = null;
    let xxNp = null;
    let xxRf = null;
    let xxAp = false;
    let xxAl = null;
    let bestStart = null;
    let pinnedStart = () => {
      let best = bestStart;
      let pinnedCommit = xxNp?.pinnedCommit;
      return goodStart !== null &&
        best?.kind === "pushed_ancestor" &&
        best.commit !== goodStart.commit &&
        (pinnedCommit === undefined || pinnedCommit === best.commit)
        ? best
        : null;
    };
    let xxUh = null;
    let xxKf = null;
    let noopNotify = (notice, detail) => {};
    let explicitRefBlock =
      repo && !isGithubDotCom(repo.host)
        ? {
            reason: "other_host",
          }
        : options.explicitRef !== undefined
          ? {
              reason: "explicit_ref",
              flag: refFlag,
            }
          : null;
    let noSeedPlan = async () => null;
    if (!githubAvailable && !bundleEnabled && repo) githubAvailable = true;
    let xxKl = null;
    let revisionText = null;
    let detachedInfo = null;
    let hostKind = detectedRepo ? getGitHostKind(detectedRepo.host) : null;
    let forgeName = hostKind === "gitlab" ? "GitLab" : hostKind === "bitbucket" ? "Bitbucket" : null;
    let xxOc = undefined;
    let xxHp = false;
    let githubAsked = "not_asked";
    let savedNo = undefined?.savedNo;
    let xxDy = false;
    let xxAI = savedNo !== undefined && true;
    let xxUI = false;
    let xxCS = undefined;
    let xxMae = null;
    let xxBx = false;
    let xxE5 = false;
    let xxGae = false;
    let xxGW = false;
    let xxIW = undefined;
    let advisesPush = true;
    let seedAllowed = bundleEnabled && (optedIn || !xxGae);
    let branchText = null;
    let shortStartText = null;
    if (
      start_2?.kind === "none" &&
      githubAvailable &&
      repo &&
      (seedAllowed || (bundleEnabled && (forgeName !== null || false))) &&
      xxYh === null &&
      settingsPlan === null
    ) {
      githubAvailable = false;
      sourceReason = "branch_not_on_remote";
    }
    if (githubAvailable && repo) {
      let { host, owner, name } = repo;
      defaultBranchName ??= startBranch ?? (await getDefaultBranch());
      let targetRevision = defaultBranchName;
      if (goodStart !== null && remoteLookup !== null) {
        let startPoint = pinnedStart() ?? goodStart;
        let startBranchName = isGithubDotCom(host)
          ? null
          : (startPoint.branch ?? startPoint.containedIn ?? null);
        targetRevision = startBranchName ?? startPoint.commit;
        revisionText =
          startBranchName !== null
            ? printableText(startBranchName)
            : describedTarget(startPoint, remoteLookup.name);
        branchText = describeBranchStartability({
          branch: defaultBranchName,
          start: startPoint,
          remoteName: remoteLookup.name,
          host,
          byName: startBranchName,
          carried: optedIn && startBranchName === null,
          advisesPush,
        });
        xxKl = branchText;
        shortStartText = {
          line: describeBranchStartability({
            branch: defaultBranchName,
            start: startPoint,
            remoteName: remoteLookup.name,
            host,
            byName: startBranchName,
            carried: false,
            advisesPush: false,
          }),
        };
      } else if (
        start_2?.kind === "not_on_remote" ||
        (start_2?.kind === "pushed_ancestor" && goodStart === null && defaultBranchName !== "HEAD")
      ) {
        targetRevision =
          gitSource_2 ??
          (start_2.kind === "not_on_remote" ? start_2.defaultBranch : null) ??
          (await getDefaultBranch());
        revisionText = printableText(targetRevision);
        xxKl = branchNotOnRemoteMessage({
          branch: defaultBranchName,
          host,
          revision: targetRevision,
          advisesPush,
          goneFromGithub: runResult?.github === "no",
        });
        shortStartText = {
          line: branchNotOnRemoteMessage({
            branch: defaultBranchName,
            host,
            revision: targetRevision,
            advisesPush: false,
          }),
        };
      } else if (start_2?.kind === "none") {
        targetRevision = gitSource_2 ?? start_2.defaultBranch ?? (await getDefaultBranch());
        let fallbackRevisionText = printableText(targetRevision);
        revisionText = fallbackRevisionText;
        detachedInfo = {
          defaultBranch: fallbackRevisionText,
          branch: defaultBranchName === "HEAD" ? null : printableText(defaultBranchName),
          remote: remoteLookup === null ? null : printableText(remoteLookup.name),
        };
        xxKl = `${defaultBranchName === "HEAD" ? "This detached HEAD" : `Branch ${printableText(defaultBranchName)}`} shares no history with ${remoteLookup?.name ?? "the remote"} as last fetched here, so the cloud session starts from ${fallbackRevisionText} instead; commits and changes that exist only on this machine are not in it.`;
      } else if (
        start_2?.kind === "on_remote" &&
        start_2.aheadCount !== undefined &&
        start_2.aheadCount > 0 &&
        remoteLookup !== null
      ) {
        branchText = branchAheadOfRemoteMessage({
          branch: defaultBranchName,
          aheadCount: start_2.aheadCount,
          remoteName: remoteLookup.name,
          advisesPush,
        });
        xxKl = branchText;
        shortStartText = {
          line: branchAheadOfRemoteMessage({
            branch: defaultBranchName,
            aheadCount: start_2.aheadCount,
            remoteName: remoteLookup.name,
            advisesPush: false,
          }),
        };
      } else if (remoteUnresolved && !optedIn) {
        let forgeLabel = isGithubDotCom(host) ? "GitHub" : host;
        let detachedHead = defaultBranchName === "HEAD";
        xxKl = `${detachedHead ? `This checkout is on a detached HEAD, and no remote of it could be read, so its commit could not be looked for on ${forgeLabel}. The cloud session was asked to start from HEAD as ${forgeLabel} has it, its default branch.` : `Whether branch ${printableText(defaultBranchName)} is on ${forgeLabel} could not be checked, because no remote of this checkout could be read. The cloud session was asked to start from it by name.`}${advisesPush ? ` ${detachedHead ? "To start from your work, push it" : "If it is not there, push your work"} to a branch and start a new session from that branch.` : ""}`;
      }
      if (options.reuseOutcomeBranch) {
        let envCcrOnBranchDefaultGuard = process.env.CCR_ON_BRANCH_DEFAULT_GUARD;
        let guardedMode =
          env.CCR_ON_BRANCH_DEFAULT_GUARD ??
          (envCcrOnBranchDefaultGuard != null && String(envCcrOnBranchDefaultGuard).trim()
            ? "enforce"
            : (await checkGate_CACHED_OR_BLOCKING("tengu_on_branch_default_guard_observe").catch(() => false))
              ? "observe"
              : "enforce");
        if (guardedMode !== "off") {
          let defaultBranchIfKnown = gitSource_2 ?? (await getDefaultBranchIfKnown(options.cwd));
          if (defaultBranchIfKnown === null)
            logForDebugging(
              "[teleportToRemote] reuse-outcome-branch collision guard: default branch unknown (no preflight answer, origin/HEAD " +
                `unresolved) \u2014 failing open for '${options.reuseOutcomeBranch}'`,
            );
          else if (options.reuseOutcomeBranch === defaultBranchIfKnown) {
            let explicitBranch = options.explicitRef === options.reuseOutcomeBranch;
            let isAutofix = options.source === "autofix_pr";
            logEvent("tengu_teleport_on_branch_default_guard", {
              mode: fromEnum(guardedMode),
              source: fromEnum(options.source),
              evidence: fromEnum(gitSource_2 !== null ? "preflight" : "local_symref"),
              arm: fromEnum(isSelfHosted ? "pool" : "managed"),
            });
            if (isSelfHosted)
              logForDebugging(
                `[teleportToRemote] reuse-outcome-branch collision guard (pool arm): '${options.reuseOutcomeBranch}' is the ` +
                  "repository's default branch \u2014 allowed on self-hosted " +
                  "pools; emitted for policy telemetry only",
              );
            else if (guardedMode === "observe")
              logForDebugging(
                `[teleportToRemote] reuse-outcome-branch collision guard (observe): '${options.reuseOutcomeBranch}' is the ` +
                  "repository's default branch \u2014 would deny; proceeding " +
                  "(CCR_ON_BRANCH_DEFAULT_GUARD=observe)",
              );
            else {
              options.onCreateFail?.(
                (explicitBranch
                  ? `--on-branch ${printableStatusText(options.reuseOutcomeBranch)} targets `
                  : isAutofix
                    ? `This pull request's head branch '${singleTokenText(options.reuseOutcomeBranch)}' is `
                    : `The requested outcome branch '${singleTokenText(options.reuseOutcomeBranch)}' is `) +
                  "the repository's default branch, which this environment's runner cannot reuse as its work branch (its git checkout -b fails on a name the clone already has). " +
                  (explicitBranch
                    ? `Use --ref ${printableStatusText(options.reuseOutcomeBranch)} to base the ` +
                      "session on it and let it push to a fresh claude/\u2026 branch."
                    : isAutofix
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
        `[teleportToRemote] Git source: ${host}/${owner}/${name}, revision: ${targetRevision ?? "none"}${pinnedCommit === null ? "" : ` pinned at ${pinnedCommit}`}`,
      );
      repoSource = {
        type: "git_repository",
        url: `https://${host}/${owner}/${name}`,
        revision: pinnedCommit ?? targetRevision,
        ...(options.reuseOutcomeBranch && {
          allow_unrestricted_git_push: true,
        }),
      };
      repoSlug = `${owner}/${name}`;
    }
    let xxCle = null;
    let xxMT = null;
    let xxJF = null;
    let xxHae = false;
    if (!repoSource && !isSelfHosted && options.explicitRef) {
      let noGitReason = CCR_FORCE_BUNDLE
        ? "CCR_FORCE_BUNDLE is set"
        : repo
          ? transient
            ? "the GitHub App preflight failed transiently (network or service hiccup)"
            : "the GitHub App is not set up for this repository"
          : "no GitHub remote was detected in this directory";
      let seedOrEmpty = seedAllowed
        ? "be seeded from your local working tree"
        : "start with an empty sandbox";
      let dropFlagAdvice = seedAllowed
        ? `drop ${refFlag} to seed from local HEAD`
        : `drop ${refFlag} to start with an empty sandbox`;
      let refusalPrefix = `${refFlag} ${printableStatusText(options.explicitRef)} cannot be honored: `;
      options.onCreateFail?.(
        notConnected
          ? `${refusalPrefix}${githubNotConnectedMessage()} \u2014 or ${dropFlagAdvice} instead.`
          : `${refusalPrefix}${noGitReason}, so the session would ${seedOrEmpty} instead. ` +
              (!detectedRepo
                ? ""
                : transient
                  ? "Retry in a moment, or "
                  : forgeName
                    ? `Cloud sessions can't clone from ${forgeName} yet \u2014 `
                    : "Set up the GitHub integration at https://claude.ai/code, or ") +
              `${dropFlagAdvice}.`,
        options.reuseOutcomeBranch ? "on_branch_no_git_source" : "explicit_ref_no_git_source",
        {
          preflightTransient: transient,
        },
      );
      return null;
    }
    if (signal.aborted) throw new AbortError_2();
    let firstPromptSent = true;
    if (signal.aborted) throw new AbortError_2();
    let firstUpload = options.firstUpload;
    let firstUploadDone = false;
    let bundleCwd = options.cwd === undefined ? gitRoot : null;
    let shouldBundle = !repoSource && bundleEnabled;
    let xxPLe = null;
    let xxFE = null;
    let warningText = null;
    let warningText2 = null;
    let xxSae = false;
    let bundleNotice2 = null;
    let xxR5 = null;
    if (shouldBundle) {
      logForDebugging("[teleport] phase: bundle-upload");
      logForDebugging(`[teleportToRemote] Bundling (reason: ${sourceReason})`);
      logEvent("tengu_teleport_bundle_started", {
        reason: fromEnum(sourceReason),
      });
      options.onProgress?.({
        kind: "bundling",
        rerouted: false,
      });
      gitSource = Date.now();
      let environments = await isViolinWood();
      let bundleConfig2 = {
        oauthToken: bundleToken,
        isStoredLogin,
        sessionId: getSessionId(),
        baseUrl: getOauthConfig().BASE_API_URL,
      };
      let bundleUpload = await uploadGitBundleForSession(
        bundleConfig2,
        {
          signal,
          ...(bundleCwd !== null && {
            cwd: bundleCwd,
          }),
          currentBranchOnly: environments,
          ...(environments && {
            hardenForDeviceSessions: true,
            startsInProject: await alwaysTrueAsync(),
          }),
          ...resolveBundleReadRules(
            environments,
            options.onBundleNotice,
            environments && (await alwaysFalseAsync()),
          ),
          onBundled: (onBundled) =>
            options.onProgress?.({
              kind: "bundled",
              ...onBundled,
            }),
        },
        xxMT === null ? options.onBundleNotice : null,
        forgeName
          ? {
              kind: "other_forge",
              forge: forgeName,
            }
          : CCR_FORCE_BUNDLE
            ? {
                kind: "forced_bundle",
              }
            : null,
      );
      if (bundleUpload.success)
        seedBundle = {
          fileId: bundleUpload.fileId,
          config: bundleConfig2,
        };
      if (signal.aborted) throw new AbortError_2();
      if (!bundleUpload.success) {
        let { failReason, error } = bundleUpload;
        let advice = "advice" in bundleUpload ? bundleUpload.advice : undefined;
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
          let bundleErrorText = !detectedRepo
            ? ""
            : sourceReason === "branch_not_on_remote"
              ? `. This branch shares no history with the remote as last fetched here${advisesPush ? "; push it to start from GitHub instead" : ""}`
              : notConnected
                ? `. ${githubNotConnectedMessage()}`
                : transient
                  ? ". The GitHub App preflight failed transiently (network or service hiccup) \u2014 retry in a moment to start from GitHub instead"
                  : forgeName
                    ? `. Cloud sessions can't clone from ${forgeName} yet, so an upload is the only way to start one from this repository`
                    : ". A cloud session can start from GitHub instead if the Claude GitHub App has access to this repository: https://claude.ai/code";
          let failureText;
          switch (failReason) {
            case "empty_repo":
              failureText = advice === undefined ? error : `${error}. ${advice}`;
              break;
            case "too_large":
              failureText = `${error}${bundleErrorText}`;
              break;
            case "git_error":
              failureText = `Failed to create git bundle (${error})${bundleErrorText}`;
              break;
            case "stash_failed":
            case "no_changes":
            case "unsupported_layout":
            case "refused":
              failureText = error;
              break;
            case "not_a_repo":
              failureText = error;
              break;
            case "upload_failed":
              failureText = `Could not upload repo bundle (${error})${bundleErrorText}`;
              break;
            case undefined:
              failureText = `Bundle upload failed: ${error}${bundleErrorText}`;
              break;
            default: {
              let xxAh = failReason;
              failureText = `Bundle upload failed: ${error}`;
            }
          }
          options.onBundleFail?.(failureText, "bundle");
          return null;
        }
      } else {
        bundleFileId = bundleUpload.fileId;
        bundleScope = bundleUpload.scope;
        if (bundleUpload.leftOut?.length)
          options.onBundleNotice?.(
            leftOutNotice(bundleUpload.leftOut, {
              readRules: environments,
              ofThisUploadOnly: false,
            }),
          );
        if (bundleUpload.deletedHere?.length)
          options.onBundleNotice?.(deletedHereNotice(bundleUpload.deletedHere));
        logEvent("tengu_teleport_bundle_mode", {
          size_bytes: bundleUpload.bundleSizeBytes,
          scope: fromEnum(bundleUpload.scope),
          has_wip: bundleUpload.hasWip,
          current_branch_only: environments,
          ...{},
          reason: fromEnum(sourceReason),
        });
      }
    }
    let xxT = null;
    let xxHI = null;
    let eventSeed = null;
    let folderSeed = eventSeed === null ? folderRoot : null;
    let homeSeedPlan = eventSeed !== null && launchConsentBlocked ? null : homeSeedPlanPromise;
    let consentBlocked = forwardHomeSettings && isLaunchConsentBlocked(options.homeSettingsConsent);
    let packAllowed =
      forwardHomeSettings &&
      (!consentBlocked || optedIn || folderRoot !== null) &&
      !(eventSeed !== null && consentBlocked);
    let homeNote = xxR5 ?? eventSeed?.noteForClaude ?? xxHI ?? folderPlan.noteForClaude;
    let appendedPrompt =
      homeNote === null
        ? options.appendSystemPrompt
        : [options.appendSystemPrompt, homeNote].filter((env) => env !== undefined).join(`

`);
    let verdict = (layoutPromise === null ? null : await layoutPromise)?.verdict;
    let probeStoreUnreadable = verdict?.reason === "probe_failed" && verdict.storeLookAhead === "not_plain";
    if (signal.aborted) throw new AbortError_2();
    let revisionAsked = repoSource !== null && revisionText !== null ? revisionText : defaultBranchName;
    let hasPinnedCommit = pinnedCommit !== null;
    let xxYI = null;
    let xxGLe = xxRf;
    let xxA5 = xxAl;
    let pinnedNearer = repoSource !== null && pinnedStart() !== null;
    let createdFrom2 = createdFrom;
    let planKind = settingsPlan ?? undefined;
    let kind = start_2?.kind ?? null;
    let kind_2 = start?.kind ?? null;
    let github = runResult?.github ?? null;
    let xxNP = false;
    let cause = start_2?.kind === "unknown" ? start_2.cause : null;
    let searchFailure =
      start_2?.kind === "not_on_remote" ? start_2.searchFailure : (runResult?.failedSearch ?? null);
    let xxYLE = false;
    let xxPE = false;
    logEvent("tengu_teleport_source_decision", {
      reason: fromEnum(sourceReason),
      ...(sourceReason === "github_preflight_failed" && preflightFields),
      path: lit_2(repoSource ? "github" : bundleFileId ? "bundle" : "empty"),
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
      ...(searchFailure !== null && {
        checkout_start_search_failure: fromEnum(searchFailure),
      }),
      ...(start_2?.kind === "pushed_ancestor" &&
        start_2.fromOwnRefs === true && {
          checkout_start_own_refs_only: true,
        }),
      ...(pinnedNearer && {
        checkout_start_pinned_nearer: true,
      }),
      ...(startMs !== null && {
        checkout_start_ms: startMs,
      }),
      ...(searchTries > 0 && {
        checkout_start_tries: searchTries,
      }),
      ...(createdFrom2 !== null && {
        checkout_start_created_from: fromEnum(createdFrom2),
      }),
      ...(cause !== null && {
        checkout_start_unknown: fromEnum(cause),
      }),
      ...(remoteUnresolved && {
        checkout_start: lit_2("remote_unresolved"),
      }),
      ...(kind_2 !== null && {
        checkout_start_own: fromEnum(kind_2),
        checkout_start_own_taken: startGood,
      }),
      ...(launchBranch !== options.branchName && {
        launch_branch_not_as_handed: true,
      }),
      ...emptyBindingFacts(),
      ...{},
      ...(goodStart !== null && {
        checkout_start_ahead: goodStart.aheadCount,
      }),
      ...(start_2?.kind === "on_remote" &&
        start_2.aheadCount !== undefined && {
          checkout_start_ahead: start_2.aheadCount,
        }),
      ...{},
      ...{},
      ...{},
      ...emptyRequestOptions(bestStart, xxUh),
      ...{},
      ...{},
      ...{},
      ...(gitRoot !== null &&
        repoSource === null &&
        detectedRepo === null &&
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
    let xxO5 = false;
    let xxWae = false;
    if (!repoSource && !bundleFileId) {
      if (isSelfHosted && !options.agentId && !xxO5) {
        let noticeText = options.explicitRef
          ? ` \u2014 so ${refFlag} ${printableStatusText(options.explicitRef)} cannot be honored`
          : "";
        let byocError = `${`The selected environment "${environmentLabel}"`} requires a git source, but no GitHub remote was detected${noticeText}. Check that \`git remote get-url origin\` returns a GitHub URL.`;
        logForDebugging(`[teleportToRemote] ${byocError} (byoc env, sourceReason=${sourceReason})`, {
          level: "error",
        });
        options.onCreateFail?.(byocError, "byoc_no_git_source");
        return null;
      }
      if (uploadedBundle === null && xxT === null) {
        logForDebugging(
          "[teleportToRemote] No repository detected \u2014 session will have an empty sandbox",
        );
        if (!options.agentId && !xxO5) {
          let mayTakeFolder = gitRoot === null ? folderPlan.mayTakeFolder : false;
          let xxQD = null;
          xxWae = false;
          options.onBundleNotice?.(
            warningText ??
              warningText2 ??
              (xxFE !== null && !repoDetectionGuards().blocked()
                ? xxFE
                : describeNoRepositoryReason(
                    gitRoot === null
                      ? "no_git"
                      : repoDetectionGuards().blocked()
                        ? "trust_unconfirmed"
                        : "no_github_repository",
                  )),
            xxFE !== null ? "warning" : undefined,
          );
        }
      }
    }
    logForDebugging("[teleport] phase: title-await");
    let retried = await resolveTitle();
    if (signal.aborted) throw new AbortError_2();
    let title = options.title || retried.title;
    let outcomeBranch = options.reuseOutcomeBranch || retried.branchName;
    let outcomeReference =
      repoSlug === null
        ? null
        : {
            type: "git_repository",
            git_info: {
              type: "github",
              repo: repoSlug,
              branches: [outcomeBranch],
            },
          };
    let referralEligibility = fetchReferralEligibility_2(
      endpoint,
      sessionToken,
      orgUUID,
      usesConsoleProfileCredentials,
      () => getCloudSessionAccessToken(options.credentials, options.storageV5),
      hasRecoveredBearer,
    );
    let xxL5 = false;
    if (xxKl !== null && repoSource !== null && true)
      options.onBundleNotice?.(xxKl, xxNP ? "warning" : undefined);
    let outcomeIsSeed = xxL5 && endpoint === "v1alpha2";
    let xxSLe = false;
    let titledText = options.ultraplan ? `ultraplan: ${title}` : title;
    let firstPromptParts = builtinToolsFirstPrompt(options, initialMessage);
    let attachesSeed = optedIn || folderSeed !== null || homeSeedPlan !== null;
    let deferredPrompt =
      firstPromptParts ??
      (options.deferInitialMessage === true && initialMessage !== null && attachesSeed
        ? {
            content: initialMessage,
            uuid: options.initialMessageUuid ?? randomUUID(),
          }
        : undefined);
    let initialControlEvents = buildInitialControlEvents({
      initialMessage: deferredPrompt ? null : initialMessage,
      initialMessageUuid: options.initialMessageUuid,
      permissionMode:
        isSelfHostedEnv && options.isModeFromSettings === true ? undefined : options.permissionMode,
      isModeFromSettings: options.isModeFromSettings,
      proactivityLevel: options.proactivityLevel,
      ultraplan: options.ultraplan,
      title: options.title,
      thinking: options.thinking,
    });
    let model = options.model ?? getMainLoopModel();
    let modelPickerEffortDefault = getModelPickerEffortDefault(
      model,
      isSelfHostedEnv && options.isEffortFromSettings === true ? undefined : options.effort,
    );
    let modelPickerEffortDefault_2 = getModelPickerEffortDefault(model, options.effort);
    options.onProgress?.({
      kind: "creating",
    });
    let prepared =
      seedBundleFileId_2 !== null
        ? seedBundleFileId_2.binder
        : await prepareDeviceBinding(
            options.deviceBinding,
            endpoint,
            environmentId,
            selectedEnvironment?.kind,
            options.correlationId,
            options.credentials,
            gatePromise(),
            usesConsoleProfileCredentials,
          );
    let persistentVolumeFromSessionId = options.persistentVolumeFromSessionId;
    let buildBody = (deviceBinding, requestElevatedTier, deferFirstPrompt, repositoriesTrusted) => {
      let isFreshBind = options.deviceBinding !== undefined && deviceBinding === undefined;
      let body =
        endpoint === "v1alpha2"
          ? buildSessionCreateBody({
              title: titledText,
              worker: environmentSelector(environmentId),
              events: initialControlEvents,
              sources: repoSource ? [repoSource] : [],
              outcomes: outcomeReference ? [outcomeReference] : [],
              model,
              effortLevel: modelPickerEffortDefault,
              seedBundleFileId: bundleFileId ?? undefined,
              reuseOutcomeBranches: Boolean(options.reuseOutcomeBranch),
              environmentVariables: envVars,
              appendSystemPrompt: appendedPrompt,
              customSystemPrompt: options.customSystemPrompt,
              appendSubagentSystemPrompt: options.appendSubagentSystemPrompt,
              fallbackModel: options.fallbackModel,
              maxTurns: options.maxTurns,
              maxBudgetUsd: options.maxBudgetUsd,
              allowedTools: options.allowedTools,
              disallowedTools: options.disallowedTools,
              builtinTools: options.builtinTools,
              outputSchema: options.outputSchema,
              tags,
              sessionGroupingId: options.sessionGroupingId,
              agentId: options.agentId,
              correlationId: options.correlationId,
              persistentVolume: options.persistentVolume,
              persistentVolumeFromSessionId,
              deviceBinding,
              requestElevatedTier,
              deferFirstPrompt,
              repositoriesTrusted,
            })
          : {
              title: titledText,
              events: initialControlEvents,
              session_context: {
                sources: repoSource ? [repoSource] : [],
                ...(bundleFileId && {
                  seed_bundle_file_id: bundleFileId,
                }),
                outcomes: outcomeReference ? [outcomeReference] : [],
                model,
                ...(modelPickerEffortDefault && {
                  effort_level: modelPickerEffortDefault,
                }),
                ...(options.reuseOutcomeBranch && {
                  reuse_outcome_branches: true,
                }),
                ...(Object.keys(envVars).length > 0 && {
                  environment_variables: envVars,
                }),
                ...(appendedPrompt && {
                  append_system_prompt: appendedPrompt,
                }),
                ...buildRemoteSessionConfig(options),
                ...(options.outputSchema && {
                  output_schema: options.outputSchema,
                }),
                ...(options.correlationId && {
                  correlation_id: options.correlationId,
                }),
              },
              ...environmentSelector(environmentId),
              ...noopSessionTag(options.persistentVolume, persistentVolumeFromSessionId),
              ...(tags && {
                tags,
              }),
            };
      logForDebugging(
        `Creating session with payload: ${jsonStringify(redactSessionCreateBody(body), null, 2)}`,
      );
      return body;
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
        environmentVariables: envVars,
      }),
      callerSendsFirstPrompt: options.deferInitialMessage === true,
      attaches: {
        anything: repoSource !== null || bundleFileId !== null || optedIn || folderSeed !== null,
        launchCheckout:
          gitRoot !== null && repoSource !== null && repo !== null && bundleFileId === null
            ? {
                root: gitRoot,
                covers: "remote",
              }
            : bundleCwd !== null &&
                repoSource === null &&
                bundleFileId !== null &&
                !optedIn &&
                folderSeed === null
              ? {
                  root: bundleCwd,
                  covers: "bundle",
                }
              : null,
      },
      post: (postBody, bindState) =>
        ensureTrustedDevice(referralEligibility, bindState, (env) =>
          axios_default.post(referralEligibility.url, postBody, {
            headers: env,
            signal,
            validateStatus: (status) => status < 500,
          }),
        ),
    };
    let createResult2 = await createWithDeviceBinding(request);
    let retryNotice = null;
    if (retryNotice !== null) {
      options.onBundleNotice?.(retryNotice);
      persistentVolumeFromSessionId = undefined;
      if (signal.aborted) throw new AbortError_2();
      createResult2 = await createWithDeviceBinding(request);
    }
    let { response, bind, held, attested, firstPromptDeferred } = createResult2;
    logForDebugging(`[teleport] phase: POST-response status=${response.status}`);
    created = isSuccessStatus(response.status);
    let bindToken = bind?.ok === true ? held : undefined;
    let attestationNeeded = outcomeIsSeed && (options.deviceBinding === undefined || attested);
    if (!(response.status === 200 || response.status === 201)) {
      let statusText = `API request failed with status ${response.status}: ${response.statusText}

Response data: ${jsonStringify(response.data, null, 2)}`;
      let errorData2 = response.data;
      let errorType = errorData2?.error?.type;
      let reason = errorData2?.error?.reason;
      let message = errorData2?.error?.message;
      let gitParsed = repoSource ? parseGitRemote(repoSource.url) : null;
      let sourceLabel = gitParsed
        ? singleTokenOrPlaceholder(`${gitParsed.owner}/${gitParsed.name}`)
        : bundleFileId
          ? "a seed bundle (no git source)"
          : repoSource
            ? singleTokenOrPlaceholder(repoSource.url)
            : "no source";
      let isAnthropicRepo_2 = gitParsed !== null && isAnthropicRepo(gitParsed);
      let normalizedReason = normalizeCreateSessionError(reason);
      let Ah = false;
      let repoMismatch =
        (typeof message === "string" &&
          message.includes("source repository configuration is not permitted for this environment")) ||
        normalizedReason === "monorepo_source_required" ||
        normalizedReason === "monorepo_env_required" ||
        (response.status === 400 &&
          !reason &&
          errorType === "invalid_request_error" &&
          !isSelfHosted &&
          repoSource !== null &&
          !bundleFileId &&
          isAnthropicRepo_2 &&
          typeof message === "string" &&
          /^the request was invalid\.?$/i.test(message));
      if (
        [401, 403, 429].includes(response.status) ||
        reason === "github_repo_access_denied" ||
        isCloudLaunchError(errorData2) ||
        repoMismatch ||
        false ||
        noEnvironmentOverride(reason) !== undefined
      )
        logForDebugging(statusText, {
          level: "error",
        });
      else {
        let token = (env) => (env && /^[a-z][a-z0-9_]*$/.test(env) ? env : undefined);
        let xxZh = "";
        logError(
          Error(`[type=${token(errorType)},reason=${token(reason)},isByocEnv=${isSelfHosted}] ${statusText}`),
        );
      }
      let cloudError = cloudErrorMessage(response, message);
      let refusalText =
        (await explainUntrustedDeviceRefusal(response, referralEligibility)) ||
        loginRejectedMessage(response.status, cloudError.message) ||
        cloudError.message ||
        cloudError.statusLine;
      if (repoMismatch)
        refusalText = formatEnvironmentRepoMismatch(isAnthropicRepo_2, environmentLabel, sourceLabel);
      if (selectedEnvironment?.kind === "bridge" && response.status === 403) {
        let { readUntrustedDeviceRefusal } = await import("../bridge/codeSessionApi.js");
        if (readUntrustedDeviceRefusal(response.data)?.kind === "unrecognized")
          refusalText = `Choose a cloud environment with /remote-env: "${environmentLabel}" is a Remote Control environment and refused this session. If none is listed, create one at ${ENV_SETUP_ONBOARDING_URL}.`;
      }
      let groupingMessage =
        options.sessionGroupingId && projectNotFoundMessage(options.sessionGroupingId, errorData2?.error);
      if ((options.builtinTools?.length ?? 0) > 0 && isCloudLaunchError(errorData2))
        logBuiltinToolsCreate("unavailable", isPoolEnv);
      let createFailureMessage =
        (isCloudLaunchError(errorData2) && DEVICE_BIND_REFUSAL_REASONS) || groupingMessage || refusalText;
      let serverType = normalizeApiErrorType(errorType);
      options.onCreateFail?.(createFailureMessage, "create_request_failed", {
        status: response.status,
        serverType,
        serverReason: normalizedReason,
        endpoint,
        messageHidden: cloudError.messageHidden,
      });
      return null;
    }
    let sessionIdResult = sessionIdFromCreateResponse(endpoint, response.data);
    if (!sessionIdResult.ok) {
      let createFailure2 = CREATE_SESSION_FAILURES[sessionIdResult.error];
      logError(
        withTelemetryMessage(
          Error(`Cannot determine session ID from API response: ${jsonStringify(response.data)}`),
          createFailure2.telemetry,
        ),
      );
      options.onCreateFail?.(createFailure2.message, createFailure2.reason);
      return null;
    }
    let session = sessionIdResult.value;
    options.onProgress?.({
      kind: "session_exists",
      sessionId: session.id,
    });
    let xxF1 = null;
    let canLatch = attestationNeeded && true && !(bind !== undefined && !bind.ok);
    let xxUy = null;
    if (xxUy !== null) options.onBundleNotice?.(xxUy);
    let homeSeedAttested = xxSLe && attested;
    let postSeed = async (withHomeSeed, env = null) => {};
    let seedWithAbort = (env) =>
      raceWithAbortSignal(postSeed(false, env), signal, () => new AbortError_2()).catch((error) => {
        if (!isAbortError(error)) logError(error);
      });
    let remoteSession = await createRemoteSession({
      options,
      createEndpoint: endpoint,
      responseData: response.data,
      sessionId: session.id,
      held: firstPromptParts,
      bound: bind?.ok === true,
      firstPromptDeferred,
      followsUploads: attachesSeed,
      pool: isPoolEnv,
      signal,
    });
    if (!remoteSession.ok) return null;
    logForDebugging(`Successfully created remote session: ${session.id}`);
    if (uploadedBundle === null)
      options.onProgress?.({
        kind: "created",
      });
    let logLink = () =>
      logCloudSessionLink(
        session.id,
        options.source,
        {
          project: repoSource !== null && sourceReason !== "github_preflight_failed" && true,
          global:
            bundleFileId === null &&
            uploadedBundle === null &&
            xxFE === null &&
            warningText === null &&
            warningText2 === null,
        },
        {
          endpoint,
          grouped: options.sessionGroupingId != null,
          effortLevel: modelPickerEffortDefault,
        },
        options.storageV5,
      );
    if (xxYI?.kind !== "seed" || xxYI.cloudCheckoutOrigin.kind !== "created_empty") logLink();
    let xxQh = null;
    let archiveOnce = (seedOrArchiveKind) => (xxQh ??= archiveRemoteSession(session.id, seedOrArchiveKind));
    if (false)
      switch (xxYI.kind) {
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
    reportDeviceBindOutcome(options.deviceBinding, bind, session.id, options.storageV5);
    if (attested && options.title)
      latchBoundSessionTitle(
        session.id,
        options.title,
        bind?.ok ? bind.value : undefined,
        options.credentials,
        bindToken,
      );
    let homeSeedFailure = null;
    if (homeSeedFailure !== null) {
      logFeatureSad("ccr_home_seed", homeSeedFailure);
      logFeatureSad("ccr_home_seed_create_upload", homeSeedFailure);
    }
    let envKind = selfHostedEnvironmentKind(session);
    let xxW5 = false;
    let packKept = homeSeedPlan !== null && envKind !== null && !xxW5;
    let settingsUnsent = packKept ? "self_hosted_runner" : homeSeedFailure;
    let modeKept =
      options.isModeFromSettings !== true
        ? undefined
        : isSelfHostedEnv
          ? "not_sent"
          : envKind !== null
            ? "not_pushed"
            : undefined;
    if (envKind !== null && (packKept || xxW5 || modeKept === "not_pushed"))
      logEvent("tengu_settings_kept_from_runner", {
        known_by: fromEnum(envKind),
        is_pack_kept: packKept,
        ...false,
        is_mode_kept: modeKept === "not_pushed",
        is_effort_kept: false,
        is_named_at_launch: false,
      });
    if (
      isSelfHostedEnv &&
      !isSelfHosted &&
      (packAllowed ||
        (options.isModeFromSettings === true && options.permissionMode !== undefined) ||
        modelPickerEffortDefault_2 !== modelPickerEffortDefault)
    )
      logEvent("tengu_settings_kept_from_runner", {
        known_by: fromEnum("unlisted_kind"),
        is_pack_kept: packAllowed,
        ...false,
        is_mode_kept: options.isModeFromSettings === true && options.permissionMode !== undefined,
        is_effort_kept: modelPickerEffortDefault_2 !== modelPickerEffortDefault,
        is_named_at_launch: true,
      });
    let settingsPackReason = packKept
      ? "self_hosted_runner"
      : homeSeedFailure !== null
        ? "no_project_files"
        : null;
    let homeSeedPromise =
      settingsPackReason !== null
        ? Promise.resolve({
            kind: "none",
            reason: settingsPackReason,
          })
        : homeSeedPlan;
    let homeSeedResult =
      homeSeedPromise === null
        ? undefined
        : await runCreateHomeSeed({
            sessionId: session.id,
            planning: homeSeedPromise,
            boundDeviceUuid: bind?.ok ? bind.value : undefined,
            held: bindToken,
            launchConsent: options.homeSettingsConsent,
            signal,
            credentials: options.credentials,
            storageV5: options.storageV5,
          });
    let withheldInitialMessage = firstPromptParts
      ? remoteSession.withheld
      : firstPromptDeferred
        ? deferredPrompt
          ? {
              ...deferredPrompt,
              followsPermissionMode: true,
            }
          : deferredFirstPrompt(initialControlEvents, initialMessage)
        : deferredPrompt;
    return {
      id: session.id,
      title: sessionTitleOf(session, titledText),
      ...(withheldInitialMessage && {
        withheldInitialMessage,
      }),
      ...(homeSeedResult && {
        homeSeed: homeSeedResult,
      }),
      ...(settingsUnsent !== null && {
        settingsPackUnsent: settingsUnsent,
      }),
      ...(options.maxTurns !== undefined && {
        maxTurnsConfirmed: acceptsMaxTurns(endpoint, session, options.maxTurns),
      }),
      ...(modeKept !== undefined && {
        settingsModeOnRunner: modeKept,
      }),
      ...(xxF1 !== null && {
        chosenEnvironmentMoved: true,
      }),
      ...false,
      ...false,
      ...{},
      ...false,
      ...false,
      ...false,
      ...(repoSource === null &&
        bundleFileId === null &&
        folderSeed === null &&
        uploadedBundle === null &&
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
    let xxPn = isExpectedApiError(error);
    if (xxPn)
      logForDebugging(`Remote session create failed (network): ${err.message}`, {
        level: "error",
      });
    else logError(withTelemetryMessage(toError(err), "Remote session create failed"));
    let errorText2 = err.message.trimEnd() || getErrnoCode(err) || err.name;
    let shownError = printableMultiline(errorText2, `the error ${MESSAGE_NOT_SHOWN_NOTE}`);
    if (shownError !== errorText2 && !xxPn)
      logForDebugging(`Remote session create failed, not shown: ${errorText2}`, {
        level: "error",
      });
    options.onCreateFail?.(
      `Cloud session create failed: ${shownError}`,
      xxPn ? "network_error" : "exception",
    );
    return null;
  } finally {
    if (uploadedBundle !== null && !bundleKept)
      options.firstUpload?.discard(uploadedBundle).catch((error) => logError(error));
    if (seedBundle !== null && !created) await discardUploadedSeedBundle(seedBundle);
  }
}
//@ chunk-e6aww6q8.js:2009090-2009127 layout
function isSuccessStatus(status) {
  return status >= 200 && status < 300;
}
//@ chunk-e6aww6q8.js:2009127-2009992 facade-exports (2.1.88 match: sendEventToRemoteSession, 0.362)
/**
 * 向远程会话发送 interrupt 控制请求（中断当前回合）。
 */
async function interruptRemoteSession(sessionId, timeout = 1e4) {
  if (!isFirstPartyProvider()) {
    logForDebugging(`[interruptRemoteSession] ${sessionId} skipped: non-first-party provider`);
    return false;
  }
  let isConsoleProfile = isConsoleProfileSessionsCredential();
  let hostBearer = isConsoleProfile ? null : await ensureHostSessionsBearer();
  let accessToken = isConsoleProfile
    ? await sessionsApiAccessToken(isConsoleProfile)
    : getAccessTokenWithCcrFallback();
  if (!(hostBearer ?? accessToken)) return false;
  try {
    let compatSessionId = toCompatSessionId(sessionId);
    if (!/^session_[A-Za-z0-9_-]+$/.test(compatSessionId)) return false;
    let orgUuid = await sessionsApiOrganizationUUID(isConsoleProfile);
    if (!orgUuid) return false;
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
    let response = await resendOnHeldBearer401(
      hostBearer,
      (bearer) =>
        axios_default.post(url, body, {
          headers: {
            ...getOAuthRequestHeaders(bearerToSend(bearer, accessToken)),
            "anthropic-beta": CCR_BYOC_BETA,
            "x-organization-uuid": orgUuid,
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
    if (response.status >= 200 && response.status < 300) {
      logForDebugging(`[interruptRemoteSession] interrupted ${sessionId}`);
      return true;
    }
    logForDebugging(
      `[interruptRemoteSession] ${sessionId} failed ${response.status}: ${jsonStringify(response.data)}`,
    );
    return false;
  } catch (error) {
    logForDebugging(`[interruptRemoteSession] ${sessionId} failed: ${errorMessage(error)}`, {
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
//@ chunk-18hwfzwa.js:1459225-1459274 fingerprint (2.1.88 match: teleportToRemoteWithErrorHandling, 0.308)
function teleportToRemoteWithErrorHandling_2(options) {
  return options.initialMessage !== null;
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
  deserializeRemoteSessionLog,
  interruptRemoteSession,
  teleportFromSessionsAPI,
  validateGitState,
};
