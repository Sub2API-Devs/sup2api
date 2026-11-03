/**
 * tools/ContinueInProjectsTool/submit.ts
 *
 * 2.1.316 新增：Continue in Projects 提交
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dz3q485w.js (24)
 * attribution: placement 24
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
  string,
  _enum,
  M,
  E,
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
import { getIsRemoteMode, getSessionId } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { isRemoteControlOfferable } from "../../bridge/bridgeGates.js";
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

//@ chunk-dz3q485w.js:57967-58057 placement
/**
 * 用逗号与 and 连接列表（“a, b and c”）。
 */
function joinWithAnd_2(e) {
  return e.length <= 1 ? (e[0] ?? "") : `${e.slice(0, -1).join(", ")} and ${e.at(-1)}`;
}
//@ chunk-dz3q485w.js:58057-58105 placement
/**
 * 判断审批来源是否为 pane 或 desktop。
 */
function isPaneOrDesktopVia(e) {
  return e === "pane" || e === "desktop";
}
//@ chunk-dz3q485w.js:58105-58146 placement
/**
 * 判断状态为 new 且来源为 pane/desktop。
 */
function isNewViaPaneOrDesktop(e, approvedVia) {
  return e === "new" && isPaneOrDesktopVia(approvedVia);
}
//@ chunk-dz3q485w.js:58146-58238 placement
/**
 * 去掉展示用的 icon、color、instructions 字段。
 */
function stripPresentationFields(proposal, n, approvedVia) {
  if (!isNewViaPaneOrDesktop(n, approvedVia)) return proposal;
  let { icon, color, instructions, ...c } = proposal;
  return c;
}
//@ chunk-dz3q485w.js:58238-58297 placement
/**
 * 提取提交失败的原因文本（渠道错误用 detail，其余截断）。
 */
function submitErrorDetail(error) {
  return error instanceof ChannelApiError ? error.detail : printableName(errorMessage(error), 300);
}
//@ chunk-dz3q485w.js:58297-58435 placement
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
//@ chunk-dz3q485w.js:58435-58505 placement
/**
 * 把提交失败原因归一到已知值（status_xxx 直接保留）。
 */
function normalizeSubmitReason(e) {
  return FALLBACK_SUBMIT_REASONS.has(e) || /^status_\d{3}$/.test(e) ? e : "refused";
}
//@ chunk-dz3q485w.js:58505-58936 placement
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
    let n = isRetryableChannelError(error);
    return {
      reason: n ? "request_failed" : "refused",
      retryable: n,
      mayHaveLanded: n && error.status !== 429,
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
//@ chunk-dz3q485w.js:58936-60886 placement
/**
 * 带重试地向项目频道提交设置卡；可能已提交时不再交接，返回 submitted/uncertain/fallback 与说明。
 */
async function submitSetupCard(e) {
  let { signal, credentials, notes } = e;
  let a = `Check the project\u2019s setup card before you run /send-to-project again.${e.savedToMemory ? ` The brief is in project memory as ${CONTEXT_FILE_NAME}.` : ""}`;
  let l = null;
  let c = null;
  let h = false;
  for (let j = 0; j <= e.retryDelaysMs.length; j++) {
    if (!(await waitBeforeAttempt(e.retryDelaysMs, j, signal))) break;
    try {
      let y = await submitSetupProposal(
        e.channelId,
        e.proposal,
        e.clientRequestId,
        e.sourceSessionId,
        signal,
        credentials,
      );
      if (y.kind === "submitted") {
        l = {
          dropped: y.dropped,
          sourceSessionSent: y.sourceSessionSent,
        };
        c = null;
        break;
      }
      c = {
        reason: y.reason,
        retryable: y.transient,
        mayHaveLanded: y.mayHaveStored,
        detail: y.detail,
      };
    } catch (error) {
      if (signal.aborted) {
        h = true;
        break;
      }
      c = classifySubmitError(error);
    }
    h ||= c.mayHaveLanded;
    if (!c.retryable) break;
  }
  if (l === null) {
    if (h) {
      if (!signal.aborted)
        logFeatureBad("projects_setup_submit", normalizeSubmitReason(c?.reason ?? "request_failed"));
      notes.push(
        signal.aborted
          ? `Cancelled while the setup card was being posted, so it may or may not exist. ${a}`
          : `The setup card may or may not have been posted (${c?.detail ?? "no answer"}). The coordinator was not handed the brief, so that the setup card is not posted twice. ${a}`,
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
    logFeatureSad("projects_setup_submit", normalizeSubmitReason(c?.reason ?? "refused"));
    logForDebugging(
      `send-to-project: setup card submit unavailable (${c?.detail ?? "no answer"}); handing over instead`,
    );
    return {
      outcome: "fallback",
      threadsOnCard: 0,
    };
  }
  logFeatureOk("projects_setup_submit");
  if (!l.sourceSessionSent || droppedSourceSession(l.dropped))
    notes.push(
      `The setup card does not say which session this work came from, because the server did not take it. The brief was posted${e.savedToMemory ? ", and project memory names the session" : ""}.`,
    );
  let b = e.proposal.sessions?.length ?? 0;
  if (b > 0 && droppedSessions(l.dropped)) {
    notes.push(
      `Your organization has threads on the setup card turned off, so the setup card lists none.${e.savedToMemory ? " The brief in project memory still has them." : ""}`,
    );
    return {
      outcome: "submitted",
      threadsOnCard: 0,
    };
  }
  return {
    outcome: "submitted",
    threadsOnCard: b,
  };
}
//@ chunk-dz3q485w.js:60886-68162 placement
/**
 * Continue in Projects 提交：创建或复用项目、上传仓库简报与记忆、返回链接。
 */
async function submitProjectSetup(e) {
  let { detection, signal, credentials } = e;
  let checkRepo = e.checkRepo ?? checkGithubRepoAccess;
  let dateIso = e.dateIso ?? localIsoDate(new Date());
  let c = e.existingProjectId !== undefined ? "existing" : "new";
  let h = [];
  let environmentId = c === "new" ? e.environmentId : "";
  let w = null;
  if (c === "new" && e.attachRepo)
    if (
      detection.repo.kind === "github" &&
      e.approvedOrigin !== undefined &&
      e.approvedOrigin !== `${detection.repo.owner}/${detection.repo.name}`
    )
      h.push(
        e.approvedOrigin === ""
          ? `No repository was shown when you approved, so github.com/${detection.repo.owner}/${detection.repo.name} was not added. Add it from project settings.`
          : `The origin remote changed after you approved (now github.com/${detection.repo.owner}/${detection.repo.name}), so no repository was added. Add it from project settings.`,
      );
    else if (detection.repo.kind === "github") {
      let { owner, name: D } = detection.repo;
      let N = await checkRepo(owner, D, signal);
      w = {
        owner,
        name: D,
        appInstalled: N.appInstalled,
        appChecked: !N.transient,
        reachable: N.accessible || N.transient,
        githubNotConnected: N.githubNotConnected,
      };
    } else
      h.push("No GitHub origin remote was found, so no repository was added. Add one from project settings.");
  if (signal.aborted)
    return {
      ok: false,
      reason: "Cancelled before anything was created.",
      mayExist: false,
    };
  let y;
  if (e.existingProjectId !== undefined)
    try {
      y = await getOwnerProjectChannel(e.existingProjectId, signal, credentials);
    } catch (error) {
      return {
        ok: false,
        reason: submitErrorDetail(error),
        mayExist: false,
      };
    }
  else {
    let x = isNewViaPaneOrDesktop(c, e.approvedVia);
    let D = (environmentId) =>
      createProjectChannel(
        {
          name: e.projectName,
          ...(x && {
            icon: e.proposal.icon ?? "Code",
            color: e.proposal.color,
            instructions: e.proposal.instructions,
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
        y = await D(environmentId);
      } catch (error) {
        if (
          environmentId !== "" &&
          error instanceof ChannelApiError &&
          error.status === 400 &&
          !signal.aborted
        ) {
          h.push(
            `The project could not use your cloud environment (${submitErrorDetail(error)}), so it uses your organization\u2019s default. Pick one in project settings if its threads do not start.`,
          );
          environmentId = "";
          y = await D("");
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
  let projectUrl_2 = projectUrl(y.id);
  let projectName = y.name !== "" ? y.name : c === "new" ? e.projectName : "Untitled project";
  if (c === "new" && e.environmentId === "")
    h.push(
      `${e.environmentLookupFailed ? "Your cloud environments couldn\u2019t be looked up" : "No cloud environment is set"}, so the project uses your organization\u2019s default. Pick one in project settings if its threads do not start.`,
    );
  let P = null;
  if (w !== null) {
    let x = githubRepoUrl(w.owner, w.name);
    try {
      await updateChannelConfig(
        y.id,
        {
          defaultSourceUrls: [x],
        },
        signal,
        credentials,
      );
      P = x;
      if (!w.appChecked)
        h.push(
          `Couldn\u2019t check whether the [Claude GitHub App](https://github.com/apps/claude) is installed on github.com/${w.owner}/${w.name}. Threads need it to clone the repository.`,
        );
      if (!w.reachable)
        h.push(
          `Added github.com/${w.owner}/${w.name}, but your Claude account can\u2019t see it. Connect the GitHub account that can in claude.ai settings, under Connectors, so threads can use it.`,
        );
    } catch (error) {
      h.push(
        signal.aborted
          ? `Cancelled before the repository was added. Add github.com/${w.owner}/${w.name} from project settings.`
          : `The repository wasn\u2019t added (${submitErrorDetail(error)}). Add github.com/${w.owner}/${w.name} from project settings.`,
      );
    }
  }
  let L = {
    attachedRepo: w !== null && P !== null ? `${w.owner}/${w.name}` : null,
    appInstallPending: w !== null && P !== null && w.appChecked && !w.githubNotConnected && !w.appInstalled,
  };
  if (e.message !== undefined) {
    let x = await sendBriefMessage({
      projectId: y.id,
      message: e.message,
      sourceSessionId: e.sourceSessionId,
      signal,
      credentials,
      retryDelaysMs: e.setupSubmitRetryDelaysMs,
    });
    let message = x.outcome;
    if (x.outcome !== "sent")
      h.push(
        x.failure === null
          ? "Cancelled before the message was sent."
          : `The message ${x.outcome === "uncertain" ? "may not have arrived" : "was not sent"}${signal.aborted ? "" : ` (${submitErrorDetail(x.failure)})`}.`,
      );
    return {
      ok: true,
      result: {
        mode: c,
        projectId: y.id,
        projectName,
        projectUrl: projectUrl_2,
        setupSubmitted: false,
        setupUncertain: false,
        threadsOnCard: 0,
        ...L,
        savedToMemory: false,
        handedOff: false,
        message,
        notes: h,
      },
    };
  }
  let R = false;
  let memoryRetryDelaysMs = c === "new" && y.coordinatorSessionId !== null ? e.memoryRetryDelaysMs : [];
  try {
    let x = await saveOrReplaceMemoryFile(
      y.id,
      {
        path: "/" + CONTEXT_FILE_NAME,
        content: buildContextFileContent({
          approvedVia: e.approvedVia,
          folderName: detection.folderName,
          projectName,
          sourceSessionId: e.sourceSessionId,
          proposal: e.proposal,
          toolsUsed: e.toolsUsed,
          mode: c,
          dateIso,
        }),
      },
      signal,
      credentials,
      memoryRetryDelaysMs,
    );
    if (x === null)
      h.push(
        signal.aborted
          ? `Cancelled before ${CONTEXT_FILE_NAME} was saved to project memory.`
          : "Project memory isn\u2019t available for this project, so the brief was not saved there.",
      );
    else {
      R = true;
      if (x === "replaced") h.push(`Replaced the ${CONTEXT_FILE_NAME} this project already had.`);
    }
  } catch (error) {
    h.push(
      signal.aborted
        ? `Cancelled before ${CONTEXT_FILE_NAME} was saved to project memory.`
        : `Couldn\u2019t save the brief to project memory (${submitErrorDetail(error)}).`,
    );
  }
  let z = false;
  if (R) {
    let section = buildContinuedSection({
      mode: c,
      dateIso,
      folderName: detection.folderName,
      proposal: e.proposal,
      toolsUsed: e.toolsUsed,
      attachedRepoUrl: P,
      sourceSessionId: e.sourceSessionId,
    });
    try {
      let D = await saveMemoryFileIfAbsent(
        y.id,
        {
          path: MEMORY_FILE_PATH,
          content: `${section}
`,
        },
        signal,
        credentials,
        [],
      );
      if (D === "created") z = true;
      else if (D === "kept-existing") {
        let memoryFile = await readMemoryFile(y.id, MEMORY_FILE_PATH, signal, credentials);
        if (memoryFile === null) {
          if (
            (await saveMemoryFileIfAbsent(
              y.id,
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
            z = true;
          else
            h.push(
              `Saved ${CONTEXT_FILE_NAME} to project memory, but couldn\u2019t add its section to MEMORY.md, which could not be read.`,
            );
        } else {
          let I = mergeContinuedSection(memoryFile.content, section);
          if (I.wrote !== "nothing" && I.content === memoryFile.content) z = I.wrote === "section";
          else if (I.wrote === "nothing")
            h.push(
              `MEMORY.md is full, so it has no section about this work and no pointer to ${CONTEXT_FILE_NAME}. The brief is still in that file.`,
            );
          else {
            await replaceMemoryFile(
              y.id,
              {
                id: memoryFile.id,
                content: I.content,
                expectedSha256: memoryFile.contentSha256,
              },
              signal,
              credentials,
            );
            z = I.wrote === "section";
            if (!z)
              h.push(
                `MEMORY.md is nearly full, so it points at ${CONTEXT_FILE_NAME} without describing this work.`,
              );
          }
        }
      } else if (D === null)
        h.push(
          `Saved ${CONTEXT_FILE_NAME} to project memory, but couldn\u2019t add its section to MEMORY.md, because project memory did not answer.`,
        );
    } catch (error) {
      h.push(
        `Saved ${CONTEXT_FILE_NAME} to project memory, but couldn\u2019t add its section to MEMORY.md (${submitErrorDetail(error)}).`,
      );
    }
  }
  let handedOff = false;
  let q = false;
  let X = false;
  let re = 0;
  let oe = stripPresentationFields(e.proposal, c, e.approvedVia);
  if (isPaneOrDesktopVia(e.approvedVia) && y.coordinatorSessionId !== null && !isProposalEmpty(oe)) {
    let x = await submitSetupCard({
      channelId: y.id,
      proposal: oe,
      sourceSessionId: e.sourceSessionId,
      clientRequestId: e.clientRequestId,
      retryDelaysMs: e.setupSubmitRetryDelaysMs ?? BRIEF_SEND_RETRY_DELAYS_MS,
      savedToMemory: R,
      signal,
      credentials,
      notes: h,
    });
    q = x.outcome === "submitted";
    X = x.outcome === "uncertain";
    re = x.threadsOnCard;
  }
  if (q || X);
  else if (isProposalEmpty(oe))
    h.push(
      isNewViaPaneOrDesktop(c, e.approvedVia)
        ? `No setup card was posted. The brief\u2019s icon, color and instructions were set on the project when it was created, and it has no summary, threads or routines.${(e.proposal.name ?? "") !== "" ? ` The name it proposed, \u201C${safeLabel(e.proposal.name ?? "")}\u201D, was not used. The project is named \u201C${safeLabel(e.projectName)}\u201D, as you approved.` : ""}`
        : "No setup card was posted, because the brief has no summary, instructions, threads or routines.",
    );
  else if (y.coordinatorSessionId === null)
    h.push(
      `The project has no coordinator, so the brief couldn\u2019t be handed over. ${R ? `It is in project memory as ${CONTEXT_FILE_NAME}` : "Paste it into the project yourself"}.`,
    );
  else
    try {
      await handOffToCoordinator(
        y.coordinatorSessionId,
        buildHandoffMessage({
          approvedVia: e.approvedVia,
          mode: c,
          projectName,
          userFirstName: e.userFirstName,
          folderName: detection.folderName,
          proposal: e.proposal,
          sourceSessionId: e.sourceSessionId,
          toolsUsed: e.toolsUsed,
          savedToMemory: R,
          attachedRepoUrl: P,
        }),
        signal,
        credentials,
      );
      handedOff = true;
      re = e.proposal.sessions?.length ?? 0;
    } catch (error) {
      h.push(
        `${signal.aborted ? "Cancelled before the brief was handed to the project" : `The brief wasn\u2019t handed to the project (${submitErrorDetail(error)})`}.${R ? ` It is still in project memory as ${CONTEXT_FILE_NAME}.` : ""}`,
      );
    }
  return {
    ok: true,
    result: {
      mode: c,
      projectId: y.id,
      projectName,
      projectUrl: projectUrl_2,
      setupSubmitted: q,
      setupUncertain: X,
      threadsOnCard: re,
      ...L,
      savedToMemory: R,
      handedOff,
      message: null,
      notes: h,
    },
  };
}
//@ chunk-dz3q485w.js:68162-68208 placement
/**
 * 源会话 id 的最大长度（100）。
 */
var HOST_WRITES = "host_writes";
var HOST_OUTCOME = "host_outcome";
var MAX_SESSION_ID_CHARS = 100;
//@ chunk-dz3q485w.js:68208-68653 placement
/**
 * 项目上下文与发送结果 schema。
 */
var PROJECT_CONTEXT_SCHEMA = DoctorLazy(() =>
  zodStrictObject({
    version: literal(1),
    source_session_id: string().max(MAX_SESSION_ID_CHARS).refine(isSelfAddressableSessionId),
    memory_file: zodStrictObject({
      path: literal(`/${CONTEXT_FILE_NAME}`),
      content: string(),
    }).optional(),
    memory_index_section: string().optional(),
    memory_omitted: literal(true).optional(),
  }),
);
var SEND_RESULT_SCHEMA = DoctorLazy(() =>
  zodStrictObject({
    version: literal(1),
    project_id: string().regex(CHANNEL_ID_REGEX),
    project_name: string().max(1000),
    mode: _enum(["created", "existing"]),
    saved_to_memory: M(),
    setup_submitted: M(),
    setup_uncertain: M(),
    threads_on_card: E().int().min(0).max(100),
    notes: array(string().max(1000)).max(50),
  }),
);
//@ chunk-dz3q485w.js:68653-68720 placement
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
//@ chunk-dz3q485w.js:68720-68780 placement
/**
 * 读取 tengu_amber_tributary_dotterel 开关。
 */
function remoteSessionsFeatureOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_tributary_dotterel", false);
}
//@ chunk-dz3q485w.js:68780-68842 placement
/**
 * 读取会话固定的 tengu_amber_tributary_sandpiper 开关。
 */
function sendToProjectFeatureOn() {
  return getFeatureValue_SESSION_PINNED("tengu_amber_tributary_sandpiper", false);
}
//@ chunk-dz3q485w.js:68842-68877 placement
/**
 * “发送到项目”功能是否启用（取决于两个开关）。
 */
function sendToProjectEnabled() {
  return !alwaysFalseRemoteGate() && !sendToProjectFeatureOn();
}
//@ chunk-dz3q485w.js:68877-68956 placement
/**
 * 是否提供“发送到项目”功能（含远程模式与 Remote Control 可用性）。
 */
function canOfferSendToProject() {
  return (
    !getIsRemoteMode() &&
    canOfferRemoteSessions() &&
    (alwaysFalseRemoteGate() ? false : !env.CLAUDE_CODE_REMOTE && isRemoteControlOfferable()) &&
    remoteSessionsFeatureOn()
  );
}
//@ chunk-dz3q485w.js:68956-68980 placement
/**
 * 恒为 false 的开关。
 */
function alwaysFalseGate() {
  return false;
}
//@ chunk-dz3q485w.js:68980-69004 placement
/**
 * 恒为 false 的远程开关。
 */
function alwaysFalseRemoteGate() {
  return false;
}
//@ chunk-dz3q485w.js:69004-69074 placement
/**
 * 读取当前会话的 Remote Control 连接状态（none/withheld/connected）。
 */
async function remoteControlState(e, n) {
  let historySuppressionFromDisk = await readHistorySuppressionFromDisk(n);
  return isRemoteEgressSuppressedFor(e) ? "suppressed" : historySuppressionFromDisk;
}
//@ chunk-dz3q485w.js:69074-69409 placement
/**
 * 当前会话的 Remote Control 连接状态（none/withheld/connected）。
 */
function remoteControlLink() {
  let e = getReplBridgeHandle() ?? getSdkHostedBridgeHandle();
  if (e?.outboundOnly === true)
    return {
      kind: "none",
    };
  if (e?.noHistoryBackfill === true)
    return {
      kind: "withheld",
    };
  let bridgeSessionId = e?.bridgeSessionId ?? getPeerBridgeIdentity()?.bridgeSessionId;
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
//@ chunk-dz3q485w.js:69409-69652 placement
/**
 * 检查对话能否经 Remote Control 发送给项目（含历史抑制扫描）。
 */
async function checkConversationSendable(storageV5) {
  let n = remoteControlLink();
  if (n.kind !== "connected") return n;
  let sessionId = getSessionId();
  let r = await remoteControlState(pinSessionId(sessionId), storageV5);
  let a = remoteControlLink();
  if (a.kind !== "connected") return a;
  if (r === "suppressed" || r === "found")
    return {
      kind: "withheld",
    };
  return r === "clean" && getSessionId() === sessionId
    ? a
    : {
        kind: "unverified",
      };
}
//@ chunk-dz3q485w.js:69652-69827 placement
/**
 * 交接前等待 Remote Control 上传完成。
 */
async function settleBridgeUploads() {
  let e = getReplBridgeHandle() ?? getSdkHostedBridgeHandle();
  try {
    await e?.settleUploadsBeforeHandoff?.();
  } catch (error) {
    logForDebugging(`send-to-project: Remote Control upload did not settle: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-dz3q485w.js:69827-70470 placement
/**
 * Remote Control 不可用（none/withheld/unverified）的说明文本。
 */
function remoteControlRefusalText(e, n) {
  switch (e.kind) {
    case "none":
      return `This session is not connected to Remote Control, so a project would have no session to read. Turn Remote Control on${n ? " (/remote-control)" : ""}, then run /send-to-project again.`;
    case "withheld":
      return "This conversation is kept off its Remote Control session, so it cannot be sent to a project from this session. Copy what you need from here and paste it into the project yourself.";
    case "unverified":
      return "Couldn\u2019t check whether this conversation may go to its Remote Control session, so nothing was sent. Run /send-to-project again, or run it in a new session with Remote Control on.";
  }
}
export {
  stripPresentationFields,
  joinWithAnd_2,
  sendToProjectEnabled,
  canOfferSendToProject,
  alwaysFalseRemoteGate,
  checkConversationSendable,
  remoteControlRefusalText,
  sendToProjectFeatureOn,
  HOST_WRITES,
  HOST_OUTCOME,
  settleBridgeUploads,
  submitProjectSetup,
  isNewViaPaneOrDesktop,
  alwaysFalseGate,
};
