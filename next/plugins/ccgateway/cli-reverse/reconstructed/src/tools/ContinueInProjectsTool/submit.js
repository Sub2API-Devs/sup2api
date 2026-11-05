/**
 * tools/ContinueInProjectsTool/submit.ts
 *
 * 2.1.316 新增：Continue in Projects 提交
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-jndyh8cy.js (25)
 * attribution: placement 24, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  ChannelApiError,
  isRetryableChannelError,
  isNetworkOrAccessError,
  getOwnerProjectChannel,
  createProjectChannel,
  updateChannelConfig,
  handOffToCoordinator,
  CHANNEL_ID_REGEX,
} from "../../services/projects/channelApi.js";
import { printableName } from "../../utils/printableName.js";
import { errorMessage } from "../../utils/errors.js";
import { CONTEXT_FILE_NAME, localIsoDate } from "../../services/projects/contextFile.js";
import {
  waitBeforeAttempt,
  sendBriefMessage,
  buildContextFileContent,
  buildContinuedSection,
  mergeContinuedSection,
  BRIEF_SEND_RETRY_DELAYS_MS,
  buildHandoffMessage,
} from "../../services/projects/briefText.js";
import {
  submitSetupProposal,
  droppedSourceSession,
  droppedSessions,
} from "../../services/projects/setupProposal.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { checkGithubRepoAccess, githubRepoUrl } from "../../services/projects/repoContext.js";
import { projectUrl } from "../../services/projects/disclosure.js";
import {
  saveOrReplaceMemoryFile,
  saveMemoryFileIfAbsent,
  MEMORY_FILE_PATH,
  readMemoryFile,
  replaceMemoryFile,
} from "../../services/projects/channelMemory.js";
import { isProposalEmpty, safeLabel } from "../../services/projects/proposalValidation.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  literal,
  stringSchema,
  _enum,
  booleanSchema,
  numberSchema,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { isSelfAddressableSessionId, toCompatSessionId } from "../../bridge/sessionIdCompat.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../../services/analytics/growthbook.js";
import {
  getIsRemoteMode,
  getIsNonInteractiveSession,
  getPermissionPromptToolName,
  getSessionId,
} from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { isRemoteControlOfferable } from "../../bridge/bridgeGates.js";
import { hasPermissionPromptTool } from "../../utils/permissions/permissionPromptHost.js";
import {
  readHistorySuppressionFromDisk,
  isRemoteEgressSuppressedFor,
  isBridgeBindingForeign,
  pinSessionId,
} from "../../utils/sessionStorage.js";
import {
  getReplBridgeHandle,
  getSdkHostedBridgeHandle,
  getPeerBridgeIdentity,
} from "../../bridge/replBridgeHandle.js";
import { isVsCodeTopSession } from "../../utils/sessionShape.js";
import { deferInit, runDeferredInits } from "../../../runtime/deferred-init.js";

//@ chunk-jndyh8cy.js:45866-45956 placement
/**
 * 用逗号与 and 连接列表（“a, b and c”）。
 */
function joinWithAnd_2(parts) {
  return parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}
//@ chunk-jndyh8cy.js:45956-46004 placement
/**
 * 判断审批来源是否为 pane 或 desktop。
 */
function isPaneOrDesktopVia(approvedVia) {
  return approvedVia === "pane" || approvedVia === "desktop";
}
//@ chunk-jndyh8cy.js:46004-46045 placement
/**
 * 判断状态为 new 且来源为 pane/desktop。
 */
function isNewViaPaneOrDesktop(mode, approvedVia) {
  return mode === "new" && isPaneOrDesktopVia(approvedVia);
}
//@ chunk-jndyh8cy.js:46045-46137 placement (2.1.88 match: detectMagicDocHeader, 0.655)
/**
 * 去掉展示用的 icon、color、instructions 字段。
 */
function stripPresentationFields(proposal, mode, approvedVia) {
  if (!isNewViaPaneOrDesktop(mode, approvedVia)) return proposal;
  let { icon, color, instructions, ...rest } = proposal;
  return rest;
}
//@ chunk-jndyh8cy.js:46137-46196 placement
/**
 * 提取提交失败的原因文本（渠道错误用 detail，其余截断）。
 */
function submitErrorDetail(error) {
  return error instanceof ChannelApiError ? error.detail : printableName(errorMessage(error), 300);
}
//@ chunk-jndyh8cy.js:46196-46334 placement
/**
 * 提交设置卡失败时可退回手工交接的原因。
 */
var FALLBACK_SUBMIT_REASONS = new Set([
  "channel_session_unavailable",
  "channel_disabled",
  "not_deployed",
  "setup_submit_disabled",
  "request_failed",
  "bad_response",
]);
//@ chunk-jndyh8cy.js:46334-46404 placement
/**
 * 把提交失败原因归一到已知值（status_xxx 直接保留）。
 */
function normalizeSubmitReason(reason) {
  return FALLBACK_SUBMIT_REASONS.has(reason) || /^status_\d{3}$/.test(reason) ? reason : "refused";
}
//@ chunk-jndyh8cy.js:46404-46835 placement
/**
 * 提交错误分类（是否可重试、是否可能已提交）。
 */
function classifySubmitError(error) {
  if (error instanceof ChannelApiError) {
    if (error.telemetryCode === "bad_response")
      return {
        reason: "bad_response",
        retryable: true,
        mayHaveLanded: true,
        detail: error.detail,
      };
    if (error.status === null)
      return {
        reason: "refused",
        retryable: false,
        mayHaveLanded: false,
        detail: error.detail,
      };
    let retryable = isRetryableChannelError(error);
    return {
      reason: retryable ? "request_failed" : "refused",
      retryable,
      mayHaveLanded: retryable && error.status !== 429,
      detail: error.detail,
    };
  }
  return {
    reason: "request_failed",
    retryable: true,
    mayHaveLanded: !isNetworkOrAccessError(error),
    detail: submitErrorDetail(error),
  };
}
//@ chunk-jndyh8cy.js:46835-48785 placement
/**
 * 带重试地向项目频道提交设置卡；可能已提交时不再交接，返回 submitted/uncertain/fallback 与说明。
 */
async function submitSetupCard(submitInput) {
  let { signal, credentials, notes } = submitInput;
  let settledNote = `Check the project\u2019s setup card before you run /send-to-project again.${submitInput.savedToMemory ? ` The brief is in project memory as ${CONTEXT_FILE_NAME}.` : ""}`;
  let submitted = null;
  let failure = null;
  let mayHaveLanded = false;
  for (let j = 0; j <= submitInput.retryDelaysMs.length; j++) {
    if (!(await waitBeforeAttempt(submitInput.retryDelaysMs, j, signal))) break;
    try {
      let submitResult = await submitSetupProposal(
        submitInput.channelId,
        submitInput.proposal,
        submitInput.clientRequestId,
        submitInput.sourceSessionId,
        signal,
        credentials,
      );
      if (submitResult.kind === "submitted") {
        submitted = {
          dropped: submitResult.dropped,
          sourceSessionSent: submitResult.sourceSessionSent,
        };
        failure = null;
        break;
      }
      failure = {
        reason: submitResult.reason,
        retryable: submitResult.transient,
        mayHaveLanded: submitResult.mayHaveStored,
        detail: submitResult.detail,
      };
    } catch (error) {
      if (signal.aborted) {
        mayHaveLanded = true;
        break;
      }
      failure = classifySubmitError(error);
    }
    mayHaveLanded ||= failure.mayHaveLanded;
    if (!failure.retryable) break;
  }
  if (submitted === null) {
    if (mayHaveLanded) {
      if (!signal.aborted)
        logFeatureBad("projects_setup_submit", normalizeSubmitReason(failure?.reason ?? "request_failed"));
      notes.push(
        signal.aborted
          ? `Cancelled while the setup card was being posted, so it may or may not exist. ${settledNote}`
          : `The setup card may or may not have been posted (${failure?.detail ?? "no answer"}). The coordinator was not handed the brief, so that the setup card is not posted twice. ${settledNote}`,
      );
      return {
        outcome: "uncertain",
        threadsOnCard: 0,
      };
    }
    if (signal.aborted) {
      notes.push("Cancelled before the setup card was posted.");
      return {
        outcome: "fallback",
        threadsOnCard: 0,
      };
    }
    logFeatureSad("projects_setup_submit", normalizeSubmitReason(failure?.reason ?? "refused"));
    logForDebugging(
      `send-to-project: setup card submit unavailable (${failure?.detail ?? "no answer"}); handing over instead`,
    );
    return {
      outcome: "fallback",
      threadsOnCard: 0,
    };
  }
  logFeatureOk("projects_setup_submit");
  if (!submitted.sourceSessionSent || droppedSourceSession(submitted.dropped))
    notes.push(
      `The setup card does not say which session this work came from, because the server did not take it. The brief was posted${submitInput.savedToMemory ? ", and project memory names the session" : ""}.`,
    );
  let threadCount = submitInput.proposal.sessions?.length ?? 0;
  if (threadCount > 0 && droppedSessions(submitted.dropped)) {
    notes.push(
      `Your organization has threads on the setup card turned off, so the setup card lists none.${submitInput.savedToMemory ? " The brief in project memory still has them." : ""}`,
    );
    return {
      outcome: "submitted",
      threadsOnCard: 0,
    };
  }
  return {
    outcome: "submitted",
    threadsOnCard: threadCount,
  };
}
//@ chunk-jndyh8cy.js:48785-56065 placement
/**
 * Continue in Projects 提交：创建或复用项目、上传仓库简报与记忆、返回链接。
 */
async function submitProjectSetup(setupInput) {
  let { detection, signal, credentials } = setupInput;
  let checkRepo = setupInput.checkRepo ?? checkGithubRepoAccess;
  let dateIso = setupInput.dateIso ?? localIsoDate(new Date());
  let mode = setupInput.existingProjectId !== undefined ? "existing" : "new";
  let notes = [];
  let environmentId = mode === "new" ? setupInput.environmentId : "";
  let repoInfo = null;
  if (mode === "new" && setupInput.attachRepo)
    if (
      detection.repo.kind === "github" &&
      setupInput.approvedOrigin !== undefined &&
      setupInput.approvedOrigin !== `${detection.repo.owner}/${detection.repo.name}`
    )
      notes.push(
        setupInput.approvedOrigin === ""
          ? `No repository was shown when you approved, so github.com/${detection.repo.owner}/${detection.repo.name} was not added. Add it from project settings.`
          : `The origin remote changed after you approved (now github.com/${detection.repo.owner}/${detection.repo.name}), so no repository was added. Add it from project settings.`,
      );
    else if (detection.repo.kind === "github") {
      let { owner, name: repoName } = detection.repo;
      let repoAccess = await checkRepo(owner, repoName, signal);
      repoInfo = {
        owner,
        name: repoName,
        appInstalled: repoAccess.appInstalled,
        appChecked: !repoAccess.transient,
        reachable: repoAccess.accessible || repoAccess.transient,
        githubNotConnected: repoAccess.githubNotConnected,
      };
    } else
      notes.push(
        "No GitHub origin remote was found, so no repository was added. Add one from project settings.",
      );
  if (signal.aborted)
    return {
      ok: false,
      reason: "Cancelled before anything was created.",
      mayExist: false,
    };
  let project;
  if (setupInput.existingProjectId !== undefined)
    try {
      project = await getOwnerProjectChannel(setupInput.existingProjectId, signal, credentials);
    } catch (error) {
      return {
        ok: false,
        reason: submitErrorDetail(error),
        mayExist: false,
      };
    }
  else {
    let isNewViaPane = isNewViaPaneOrDesktop(mode, setupInput.approvedVia);
    let createProject = (environmentId) =>
      createProjectChannel(
        {
          name: setupInput.projectName,
          ...(isNewViaPane && {
            icon: setupInput.proposal.icon ?? "Code",
            color: setupInput.proposal.color,
            instructions: setupInput.proposal.instructions,
          }),
          ...(environmentId !== "" && {
            defaultEnvironmentId: environmentId,
          }),
        },
        signal,
        credentials,
      );
    try {
      try {
        project = await createProject(environmentId);
      } catch (error) {
        if (
          environmentId !== "" &&
          error instanceof ChannelApiError &&
          error.status === 400 &&
          !signal.aborted
        ) {
          notes.push(
            `The project could not use your cloud environment (${submitErrorDetail(error)}), so it uses your organization\u2019s default. Pick one in project settings if its threads do not start.`,
          );
          environmentId = "";
          project = await createProject("");
        } else throw error;
      }
    } catch (error) {
      let mayExist =
        isRetryableChannelError(error) ||
        (error instanceof ChannelApiError && error.telemetryCode === "bad_response");
      return {
        ok: false,
        reason: submitErrorDetail(error),
        mayExist,
      };
    }
  }
  let projectUrl_2 = projectUrl(project.id);
  let projectName =
    project.name !== "" ? project.name : mode === "new" ? setupInput.projectName : "Untitled project";
  if (mode === "new" && setupInput.environmentId === "")
    notes.push(
      `${setupInput.environmentLookupFailed ? "Your cloud environments couldn\u2019t be looked up" : "No cloud environment is set"}, so the project uses your organization\u2019s default. Pick one in project settings if its threads do not start.`,
    );
  let attachedRepoUrl = null;
  if (repoInfo !== null) {
    let repoUrl = githubRepoUrl(repoInfo.owner, repoInfo.name);
    try {
      await updateChannelConfig(
        project.id,
        {
          defaultSourceUrls: [repoUrl],
        },
        signal,
        credentials,
      );
      attachedRepoUrl = repoUrl;
      if (!repoInfo.appChecked)
        notes.push(
          `Couldn\u2019t check whether the [Claude GitHub App](https://github.com/apps/claude) is installed on github.com/${repoInfo.owner}/${repoInfo.name}. Threads need it to clone the repository.`,
        );
      if (!repoInfo.reachable)
        notes.push(
          `Added github.com/${repoInfo.owner}/${repoInfo.name}, but your Claude account can\u2019t see it. Connect the GitHub account that can in claude.ai settings, under Connectors, so threads can use it.`,
        );
    } catch (error) {
      notes.push(
        signal.aborted
          ? `Cancelled before the repository was added. Add github.com/${repoInfo.owner}/${repoInfo.name} from project settings.`
          : `The repository wasn\u2019t added (${submitErrorDetail(error)}). Add github.com/${repoInfo.owner}/${repoInfo.name} from project settings.`,
      );
    }
  }
  let repoResult = {
    attachedRepo: repoInfo !== null && attachedRepoUrl !== null ? `${repoInfo.owner}/${repoInfo.name}` : null,
    appInstallPending:
      repoInfo !== null &&
      attachedRepoUrl !== null &&
      repoInfo.appChecked &&
      !repoInfo.githubNotConnected &&
      !repoInfo.appInstalled,
  };
  if (setupInput.message !== undefined) {
    let sendResult = await sendBriefMessage({
      projectId: project.id,
      message: setupInput.message,
      sourceSessionId: setupInput.sourceSessionId,
      signal,
      credentials,
      retryDelaysMs: setupInput.setupSubmitRetryDelaysMs,
    });
    let message = sendResult.outcome;
    if (sendResult.outcome !== "sent")
      notes.push(
        sendResult.failure === null
          ? "Cancelled before the message was sent."
          : `The message ${sendResult.outcome === "uncertain" ? "may not have arrived" : "was not sent"}${signal.aborted ? "" : ` (${submitErrorDetail(sendResult.failure)})`}.`,
      );
    return {
      ok: true,
      result: {
        mode,
        projectId: project.id,
        projectName,
        projectUrl: projectUrl_2,
        setupSubmitted: false,
        setupUncertain: false,
        threadsOnCard: 0,
        ...repoResult,
        savedToMemory: false,
        handedOff: false,
        message,
        notes,
      },
    };
  }
  let savedToMemory = false;
  let memoryRetryDelaysMs =
    mode === "new" && project.coordinatorSessionId !== null ? setupInput.memoryRetryDelaysMs : [];
  try {
    let memoryWriteResult = await saveOrReplaceMemoryFile(
      project.id,
      {
        path: "/" + CONTEXT_FILE_NAME,
        content: buildContextFileContent({
          approvedVia: setupInput.approvedVia,
          folderName: detection.folderName,
          projectName,
          sourceSessionId: setupInput.sourceSessionId,
          proposal: setupInput.proposal,
          toolsUsed: setupInput.toolsUsed,
          mode,
          dateIso,
        }),
      },
      signal,
      credentials,
      memoryRetryDelaysMs,
    );
    if (memoryWriteResult === null)
      notes.push(
        signal.aborted
          ? `Cancelled before ${CONTEXT_FILE_NAME} was saved to project memory.`
          : "Project memory isn\u2019t available for this project, so the brief was not saved there.",
      );
    else {
      savedToMemory = true;
      if (memoryWriteResult === "replaced")
        notes.push(`Replaced the ${CONTEXT_FILE_NAME} this project already had.`);
    }
  } catch (error) {
    notes.push(
      signal.aborted
        ? `Cancelled before ${CONTEXT_FILE_NAME} was saved to project memory.`
        : `Couldn\u2019t save the brief to project memory (${submitErrorDetail(error)}).`,
    );
  }
  let sectionWritten = false;
  if (savedToMemory) {
    let section = buildContinuedSection({
      mode,
      dateIso,
      folderName: detection.folderName,
      proposal: setupInput.proposal,
      toolsUsed: setupInput.toolsUsed,
      attachedRepoUrl,
      sourceSessionId: setupInput.sourceSessionId,
    });
    try {
      let memoryFileResult = await saveMemoryFileIfAbsent(
        project.id,
        {
          path: MEMORY_FILE_PATH,
          content: `${section}
`,
        },
        signal,
        credentials,
        [],
      );
      if (memoryFileResult === "created") sectionWritten = true;
      else if (memoryFileResult === "kept-existing") {
        let memoryFile = await readMemoryFile(project.id, MEMORY_FILE_PATH, signal, credentials);
        if (memoryFile === null) {
          if (
            (await saveMemoryFileIfAbsent(
              project.id,
              {
                path: MEMORY_FILE_PATH,
                content: `${section}
`,
              },
              signal,
              credentials,
              [],
            )) === "created"
          )
            sectionWritten = true;
          else
            notes.push(
              `Saved ${CONTEXT_FILE_NAME} to project memory, but couldn\u2019t add its section to MEMORY.md, which could not be read.`,
            );
        } else {
          let merged = mergeContinuedSection(memoryFile.content, section);
          if (merged.wrote !== "nothing" && merged.content === memoryFile.content)
            sectionWritten = merged.wrote === "section";
          else if (merged.wrote === "nothing")
            notes.push(
              `MEMORY.md is full, so it has no section about this work and no pointer to ${CONTEXT_FILE_NAME}. The brief is still in that file.`,
            );
          else {
            await replaceMemoryFile(
              project.id,
              {
                id: memoryFile.id,
                content: merged.content,
                expectedSha256: memoryFile.contentSha256,
              },
              signal,
              credentials,
            );
            sectionWritten = merged.wrote === "section";
            if (!sectionWritten)
              notes.push(
                `MEMORY.md is nearly full, so it points at ${CONTEXT_FILE_NAME} without describing this work.`,
              );
          }
        }
      } else if (memoryFileResult === null)
        notes.push(
          `Saved ${CONTEXT_FILE_NAME} to project memory, but couldn\u2019t add its section to MEMORY.md, because project memory did not answer.`,
        );
    } catch (error) {
      notes.push(
        `Saved ${CONTEXT_FILE_NAME} to project memory, but couldn\u2019t add its section to MEMORY.md (${submitErrorDetail(error)}).`,
      );
    }
  }
  let handedOff = false;
  let setupSubmitted = false;
  let setupUncertain = false;
  let threadsOnCard = 0;
  let proposalToSubmit = stripPresentationFields(setupInput.proposal, mode, setupInput.approvedVia);
  if (
    isPaneOrDesktopVia(setupInput.approvedVia) &&
    project.coordinatorSessionId !== null &&
    !isProposalEmpty(proposalToSubmit)
  ) {
    let cardResult = await submitSetupCard({
      channelId: project.id,
      proposal: proposalToSubmit,
      sourceSessionId: setupInput.sourceSessionId,
      clientRequestId: setupInput.clientRequestId,
      retryDelaysMs: setupInput.setupSubmitRetryDelaysMs ?? BRIEF_SEND_RETRY_DELAYS_MS,
      savedToMemory,
      signal,
      credentials,
      notes,
    });
    setupSubmitted = cardResult.outcome === "submitted";
    setupUncertain = cardResult.outcome === "uncertain";
    threadsOnCard = cardResult.threadsOnCard;
  }
  if (setupSubmitted || setupUncertain);
  else if (isProposalEmpty(proposalToSubmit))
    notes.push(
      isNewViaPaneOrDesktop(mode, setupInput.approvedVia)
        ? `No setup card was posted. The brief\u2019s icon, color and instructions were set on the project when it was created, and it has no summary, threads or routines.${(setupInput.proposal.name ?? "") !== "" ? ` The name it proposed, \u201C${safeLabel(setupInput.proposal.name ?? "")}\u201D, was not used. The project is named \u201C${safeLabel(setupInput.projectName)}\u201D, as you approved.` : ""}`
        : "No setup card was posted, because the brief has no summary, instructions, threads or routines.",
    );
  else if (project.coordinatorSessionId === null)
    notes.push(
      `The project has no coordinator, so the brief couldn\u2019t be handed over. ${savedToMemory ? `It is in project memory as ${CONTEXT_FILE_NAME}` : "Paste it into the project yourself"}.`,
    );
  else
    try {
      await handOffToCoordinator(
        project.coordinatorSessionId,
        buildHandoffMessage({
          approvedVia: setupInput.approvedVia,
          mode,
          projectName,
          userFirstName: setupInput.userFirstName,
          folderName: detection.folderName,
          proposal: setupInput.proposal,
          sourceSessionId: setupInput.sourceSessionId,
          toolsUsed: setupInput.toolsUsed,
          savedToMemory,
          attachedRepoUrl,
        }),
        signal,
        credentials,
      );
      handedOff = true;
      threadsOnCard = setupInput.proposal.sessions?.length ?? 0;
    } catch (error) {
      notes.push(
        `${signal.aborted ? "Cancelled before the brief was handed to the project" : `The brief wasn\u2019t handed to the project (${submitErrorDetail(error)})`}.${savedToMemory ? ` It is still in project memory as ${CONTEXT_FILE_NAME}.` : ""}`,
      );
    }
  return {
    ok: true,
    result: {
      mode,
      projectId: project.id,
      projectName,
      projectUrl: projectUrl_2,
      setupSubmitted,
      setupUncertain,
      threadsOnCard,
      ...repoResult,
      savedToMemory,
      handedOff,
      message: null,
      notes,
    },
  };
}
//@ chunk-jndyh8cy.js:56065-56111 placement
/**
 * 源会话 id 的最大长度（100）。
 */
var HOST_WRITES = "host_writes";
var HOST_OUTCOME = "host_outcome";
var MAX_SESSION_ID_CHARS = 100;
//@ chunk-jndyh8cy.js:56111-56556 placement
/**
 * 项目上下文与发送结果 schema。
 */
var PROJECT_CONTEXT_SCHEMA; // deferred: uses HOST_WRITES of its import cycle while loading; runs once the cycle is complete
var SEND_RESULT_SCHEMA;
deferInit("chunk-jndyh8cy.js:56111", () => {
  PROJECT_CONTEXT_SCHEMA = DoctorLazy(() =>
    zodStrictObject({
      version: literal(1),
      source_session_id: stringSchema().max(MAX_SESSION_ID_CHARS).refine(isSelfAddressableSessionId),
      memory_file: zodStrictObject({
        path: literal(`/${CONTEXT_FILE_NAME}`),
        content: stringSchema(),
      }).optional(),
      memory_index_section: stringSchema().optional(),
      memory_omitted: literal(true).optional(),
    }),
  );
  SEND_RESULT_SCHEMA = DoctorLazy(() =>
    zodStrictObject({
      version: literal(1),
      project_id: stringSchema().regex(CHANNEL_ID_REGEX),
      project_name: stringSchema().max(1000),
      mode: _enum(["created", "existing"]),
      saved_to_memory: booleanSchema(),
      setup_submitted: booleanSchema(),
      setup_uncertain: booleanSchema(),
      threads_on_card: numberSchema().int().min(0).max(100),
      notes: array(stringSchema().max(1000)).max(50),
    }),
  );
});
//@ chunk-jndyh8cy.js:56556-56623 placement
/**
 * 是否可提供远程会话（非仅必需流量、首方、Claude.ai 订阅者、策略允许）。
 */
function canOfferRemoteSessions() {
  return (
    !isEssentialTrafficOnly() &&
    isFirstPartyProvider() &&
    isClaudeAISubscriber() &&
    isPolicyAllowed("allow_remote_sessions")
  );
}
//@ chunk-jndyh8cy.js:56623-56683 placement
/**
 * 读取 tengu_amber_tributary_dotterel 开关。
 */
function remoteSessionsFeatureOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_tributary_dotterel", false);
}
//@ chunk-jndyh8cy.js:56683-56745 placement
/**
 * 读取会话固定的 tengu_amber_tributary_sandpiper 开关。
 */
function sendToProjectFeatureOn() {
  return getFeatureValue_SESSION_PINNED("tengu_amber_tributary_sandpiper", false);
}
//@ chunk-jndyh8cy.js:56745-56780 placement
/**
 * “发送到项目”功能是否启用（取决于两个开关）。
 */
function sendToProjectEnabled() {
  return !alwaysFalseRemoteGate() && !sendToProjectFeatureOn();
}
//@ chunk-jndyh8cy.js:56780-56878 placement
/**
 * 是否提供“发送到项目”功能（含远程模式与 Remote Control 可用性）。
 */
function canOfferSendToProject() {
  return (
    !getIsRemoteMode() &&
    canOfferRemoteSessions() &&
    (alwaysFalseRemoteGate()
      ? false
      : !env.CLAUDE_CODE_REMOTE &&
        isRemoteControlOfferable() &&
        (!getIsNonInteractiveSession() || hasPermissionPromptTool(getPermissionPromptToolName()))) &&
    remoteSessionsFeatureOn()
  );
}
//@ chunk-jndyh8cy.js:56878-56902 placement
/**
 * 恒为 false 的开关。
 */
function alwaysFalseGate() {
  return false;
}
//@ chunk-jndyh8cy.js:56902-56926 placement
/**
 * 恒为 false 的远程开关。
 */
function alwaysFalseRemoteGate() {
  return false;
}
//@ chunk-jndyh8cy.js:56926-56996 placement
/**
 * 读取当前会话的 Remote Control 连接状态（none/withheld/connected）。
 */
async function remoteControlState(sessionRoot, storage) {
  let historySuppressionFromDisk = await readHistorySuppressionFromDisk(storage);
  return isRemoteEgressSuppressedFor(sessionRoot) ? "suppressed" : historySuppressionFromDisk;
}
//@ chunk-jndyh8cy.js:56996-57331 placement
/**
 * 当前会话的 Remote Control 连接状态（none/withheld/connected）。
 */
function remoteControlLink() {
  let bridgeHandle = getReplBridgeHandle() ?? getSdkHostedBridgeHandle();
  if (bridgeHandle?.outboundOnly === true)
    return {
      kind: "none",
    };
  if (bridgeHandle?.noHistoryBackfill === true)
    return {
      kind: "withheld",
    };
  let bridgeSessionId = bridgeHandle?.bridgeSessionId ?? getPeerBridgeIdentity()?.bridgeSessionId;
  if (bridgeSessionId === undefined)
    return {
      kind: "none",
    };
  let compatSessionId = toCompatSessionId(bridgeSessionId);
  if (!isSelfAddressableSessionId(compatSessionId))
    return {
      kind: "none",
    };
  if (isBridgeBindingForeign() || isRemoteEgressSuppressedFor(pinSessionId(getSessionId())))
    return {
      kind: "withheld",
    };
  return {
    kind: "connected",
    sessionId: compatSessionId,
  };
}
//@ chunk-jndyh8cy.js:57331-57574 placement
/**
 * 检查对话能否经 Remote Control 发送给项目（含历史抑制扫描）。
 */
async function checkConversationSendable(storageV5) {
  let linkBefore = remoteControlLink();
  if (linkBefore.kind !== "connected") return linkBefore;
  let sessionId = getSessionId();
  let suppressionState = await remoteControlState(pinSessionId(sessionId), storageV5);
  let linkAfter = remoteControlLink();
  if (linkAfter.kind !== "connected") return linkAfter;
  if (suppressionState === "suppressed" || suppressionState === "found")
    return {
      kind: "withheld",
    };
  return suppressionState === "clean" && getSessionId() === sessionId
    ? linkAfter
    : {
        kind: "unverified",
      };
}
//@ chunk-jndyh8cy.js:57574-57749 placement
/**
 * 交接前等待 Remote Control 上传完成。
 */
async function settleBridgeUploads() {
  let bridgeHandle = getReplBridgeHandle() ?? getSdkHostedBridgeHandle();
  try {
    await bridgeHandle?.settleUploadsBeforeHandoff?.();
  } catch (error) {
    logForDebugging(`send-to-project: Remote Control upload did not settle: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-jndyh8cy.js:57749-57780 layout
function submitPlan(isInteractive) {
  return isInteractive || isVsCodeTopSession();
}
//@ chunk-jndyh8cy.js:57780-59107 placement
/**
 * Remote Control 不可用（none/withheld/unverified）的说明文本。
 */
function remoteControlRefusalText(link, isInteractive) {
  switch (link.kind) {
    case "none":
      return `This session is not connected to Remote Control, so a project would have no session to read. Turn Remote Control on${isInteractive ? " (/remote-control)" : ""}, then run /send-to-project again.`;
    case "declined":
      return "Remote Control stays off, so nothing was sent: a project reads this session through it. Run /send-to-project again to turn it on.";
    case "failed":
      return "Remote Control was turned on but could not connect, so nothing was sent. The Remote Control warning in this session says why, and /send-to-project can run again once it connects.";
    case "timed_out":
      return "Remote Control was turned on but is still connecting, so nothing was sent. Run /send-to-project again in a moment.";
    case "account_changed":
      return "The signed-in account changed while /send-to-project was asking, so Remote Control stays off and nothing was sent. Run /send-to-project again under this account.";
    case "withheld":
      return "This conversation is kept off its Remote Control session, so it cannot be sent to a project from this session. Copy what you need from here and paste it into the project yourself.";
    case "unverified":
      return "Couldn\u2019t check whether this conversation may go to its Remote Control session, so nothing was sent. Run /send-to-project again, or run it in a new session with Remote Control on.";
  }
}

// The import cycle this module closes (2 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("src/tools/ContinueInProjectsTool/submit.js");
export {
  sendToProjectEnabled,
  canOfferSendToProject,
  alwaysFalseRemoteGate,
  checkConversationSendable,
  remoteControlRefusalText,
  submitPlan,
  stripPresentationFields,
  joinWithAnd_2,
  isNewViaPaneOrDesktop,
  sendToProjectFeatureOn,
  HOST_WRITES,
  HOST_OUTCOME,
  settleBridgeUploads,
  submitProjectSetup,
  alwaysFalseGate,
};
