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
  Ye,
  L$t,
  createProjectChannel,
  updateChannelConfig,
  handOffToCoordinator,
  Rz,
} from "../../services/projects/channelApi.js";
import { printableName } from "../../utils/printableName.js";
import { errorMessage } from "../../utils/errors.js";
import { CONTEXT_FILE_NAME, localIsoDate } from "../../services/projects/contextFile.js";
import {
  gt,
  sendBriefMessage,
  buildContextFileContent,
  buildContinuedSection,
  mergeContinuedSection,
  ft,
  buildHandoffMessage,
} from "../../services/projects/briefText.js";
import {
  submitSetupProposal,
  droppedSourceSession,
  droppedSessions,
} from "../../services/projects/setupProposal.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { checkGithubRepoAccess, Yt } from "../../services/projects/repoContext.js";
import { Ve } from "../../services/projects/disclosure.js";
import {
  saveOrReplaceMemoryFile,
  saveMemoryFileIfAbsent,
  xe,
  readMemoryFile,
  replaceMemoryFile,
} from "../../services/projects/channelMemory.js";
import { isProposalEmpty, safeLabel } from "../../services/projects/proposalValidation.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, T, o, U, M, E, A } from "../../../vendor/zod/v4/classic/schemas.js";
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
function OWn(e) {
  return e.length <= 1 ? (e[0] ?? "") : `${e.slice(0, -1).join(", ")} and ${e.at(-1)}`;
}
//@ chunk-dz3q485w.js:58057-58105 placement
function Wn(e) {
  return e === "pane" || e === "desktop";
}
//@ chunk-dz3q485w.js:58105-58146 placement
function Le(e, n) {
  return e === "new" && Wn(n);
}
//@ chunk-dz3q485w.js:58146-58238 placement
function XOr(e, n, s) {
  if (!Le(n, s)) return e;
  let { icon: icon, color: color, instructions: instructions, ...c } = e;
  return c;
}
//@ chunk-dz3q485w.js:58238-58297 placement
function Z(e) {
  return e instanceof ChannelApiError ? e.detail : printableName(errorMessage(e), 300);
}
/**
 * 提交设置卡失败时可退回手工交接的原因。
 */
//@ chunk-dz3q485w.js:58297-58435 placement
var FALLBACK_SUBMIT_REASONS = new Set([
  "channel_session_unavailable",
  "channel_disabled",
  "not_deployed",
  "setup_submit_disabled",
  "request_failed",
  "bad_response",
]);
//@ chunk-dz3q485w.js:58435-58505 placement
function $n(e) {
  return FALLBACK_SUBMIT_REASONS.has(e) || /^status_\d{3}$/.test(e) ? e : "refused";
}
/**
 * 提交错误分类（是否可重试、是否可能已提交）。
 */
//@ chunk-dz3q485w.js:58505-58936 placement
function classifySubmitError(e) {
  if (e instanceof ChannelApiError) {
    if (e.telemetryCode === "bad_response")
      return { reason: "bad_response", retryable: !0, mayHaveLanded: !0, detail: e.detail };
    if (e.status === null) return { reason: "refused", retryable: !1, mayHaveLanded: !1, detail: e.detail };
    let n = isRetryableChannelError(e);
    return {
      reason: n ? "request_failed" : "refused",
      retryable: n,
      mayHaveLanded: n && e.status !== 429,
      detail: e.detail,
    };
  }
  return { reason: "request_failed", retryable: !0, mayHaveLanded: !Ye(e), detail: Z(e) };
}
/**
 * 带重试地向项目频道提交设置卡；可能已提交时不再交接，返回 submitted/uncertain/fallback 与说明。
 */
//@ chunk-dz3q485w.js:58936-60886 placement
async function submitSetupCard(e) {
  let { signal: signal, credentials: credentials, notes: notes } = e,
    a = `Check the project\u2019s setup card before you run /send-to-project again.${e.savedToMemory ? ` The brief is in project memory as ${CONTEXT_FILE_NAME}.` : ""}`,
    l = null,
    c = null,
    h = !1;
  for (let w = 0; w <= e.retryDelaysMs.length; w++) {
    if (!(await gt(e.retryDelaysMs, w, signal))) break;
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
        ((l = { dropped: y.dropped, sourceSessionSent: y.sourceSessionSent }), (c = null));
        break;
      }
      c = { reason: y.reason, retryable: y.transient, mayHaveLanded: y.mayHaveStored, detail: y.detail };
    } catch (error) {
      if (signal.aborted) {
        h = !0;
        break;
      }
      c = classifySubmitError(error);
    }
    if (((h ||= c.mayHaveLanded), !c.retryable)) break;
  }
  if (l === null) {
    if (h) {
      if (!signal.aborted) logFeatureBad("projects_setup_submit", $n(c?.reason ?? "request_failed"));
      return (
        notes.push(
          signal.aborted
            ? `Cancelled while the setup card was being posted, so it may or may not exist. ${a}`
            : `The setup card may or may not have been posted (${c?.detail ?? "no answer"}). The coordinator was not handed the brief, so that the setup card is not posted twice. ${a}`,
        ),
        { outcome: "uncertain", threadsOnCard: 0 }
      );
    }
    if (signal.aborted)
      return (
        notes.push("Cancelled before the setup card was posted."),
        { outcome: "fallback", threadsOnCard: 0 }
      );
    return (
      logFeatureSad("projects_setup_submit", $n(c?.reason ?? "refused")),
      logForDebugging(
        `send-to-project: setup card submit unavailable (${c?.detail ?? "no answer"}); handing over instead`,
      ),
      { outcome: "fallback", threadsOnCard: 0 }
    );
  }
  if ((logFeatureOk("projects_setup_submit"), !l.sourceSessionSent || droppedSourceSession(l.dropped)))
    notes.push(
      `The setup card does not say which session this work came from, because the server did not take it. The brief was posted${e.savedToMemory ? ", and project memory names the session" : ""}.`,
    );
  let b = e.proposal.sessions?.length ?? 0;
  if (b > 0 && droppedSessions(l.dropped))
    return (
      notes.push(
        `Your organization has threads on the setup card turned off, so the setup card lists none.${e.savedToMemory ? " The brief in project memory still has them." : ""}`,
      ),
      { outcome: "submitted", threadsOnCard: 0 }
    );
  return { outcome: "submitted", threadsOnCard: b };
}
/**
 * Continue in Projects 提交：创建或复用项目、上传仓库简报与记忆、返回链接。
 */
//@ chunk-dz3q485w.js:60886-68162 placement
async function submitProjectSetup(e) {
  let { detection: detection, signal: signal, credentials: credentials } = e,
    a = e.checkRepo ?? checkGithubRepoAccess,
    l = e.dateIso ?? localIsoDate(new Date()),
    c = e.existingProjectId !== void 0 ? "existing" : "new",
    h = [],
    b = c === "new" ? e.environmentId : "",
    w = null;
  if (c === "new" && e.attachRepo)
    if (
      detection.repo.kind === "github" &&
      e.approvedOrigin !== void 0 &&
      e.approvedOrigin !== `${detection.repo.owner}/${detection.repo.name}`
    )
      h.push(
        e.approvedOrigin === ""
          ? `No repository was shown when you approved, so github.com/${detection.repo.owner}/${detection.repo.name} was not added. Add it from project settings.`
          : `The origin remote changed after you approved (now github.com/${detection.repo.owner}/${detection.repo.name}), so no repository was added. Add it from project settings.`,
      );
    else if (detection.repo.kind === "github") {
      let { owner: owner, name: D } = detection.repo,
        N = await a(owner, D, signal);
      w = {
        owner: owner,
        name: D,
        appInstalled: N.appInstalled,
        appChecked: !N.transient,
        reachable: N.accessible || N.transient,
        githubNotConnected: N.githubNotConnected,
      };
    } else
      h.push("No GitHub origin remote was found, so no repository was added. Add one from project settings.");
  if (signal.aborted) return { ok: !1, reason: "Cancelled before anything was created.", mayExist: !1 };
  let y;
  if (e.existingProjectId !== void 0)
    try {
      y = await L$t(e.existingProjectId, signal, credentials);
    } catch (error) {
      return { ok: !1, reason: Z(error), mayExist: !1 };
    }
  else {
    let x = Le(c, e.approvedVia),
      D = (N) =>
        createProjectChannel(
          {
            name: e.projectName,
            ...(x && {
              icon: e.proposal.icon ?? "Code",
              color: e.proposal.color,
              instructions: e.proposal.instructions,
            }),
            ...(N !== "" && { defaultEnvironmentId: N }),
          },
          signal,
          credentials,
        );
    try {
      try {
        y = await D(b);
      } catch (error) {
        if (b !== "" && error instanceof ChannelApiError && error.status === 400 && !signal.aborted)
          (h.push(
            `The project could not use your cloud environment (${Z(error)}), so it uses your organization\u2019s default. Pick one in project settings if its threads do not start.`,
          ),
            (b = ""),
            (y = await D("")));
        else throw error;
      }
    } catch (error) {
      let I =
        isRetryableChannelError(error) ||
        (error instanceof ChannelApiError && error.telemetryCode === "bad_response");
      return { ok: !1, reason: Z(error), mayExist: I };
    }
  }
  let j = Ve(y.id),
    S = y.name !== "" ? y.name : c === "new" ? e.projectName : "Untitled project";
  if (c === "new" && e.environmentId === "")
    h.push(
      `${e.environmentLookupFailed ? "Your cloud environments couldn\u2019t be looked up" : "No cloud environment is set"}, so the project uses your organization\u2019s default. Pick one in project settings if its threads do not start.`,
    );
  let P = null;
  if (w !== null) {
    let x = Yt(w.owner, w.name);
    try {
      if (
        (await updateChannelConfig(y.id, { defaultSourceUrls: [x] }, signal, credentials),
        (P = x),
        !w.appChecked)
      )
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
          : `The repository wasn\u2019t added (${Z(error)}). Add github.com/${w.owner}/${w.name} from project settings.`,
      );
    }
  }
  let L = {
    attachedRepo: w !== null && P !== null ? `${w.owner}/${w.name}` : null,
    appInstallPending: w !== null && P !== null && w.appChecked && !w.githubNotConnected && !w.appInstalled,
  };
  if (e.message !== void 0) {
    let x = await sendBriefMessage({
        projectId: y.id,
        message: e.message,
        sourceSessionId: e.sourceSessionId,
        signal: signal,
        credentials: credentials,
        retryDelaysMs: e.setupSubmitRetryDelaysMs,
      }),
      outcome = x.outcome;
    if (x.outcome !== "sent")
      h.push(
        x.failure === null
          ? "Cancelled before the message was sent."
          : `The message ${x.outcome === "uncertain" ? "may not have arrived" : "was not sent"}${signal.aborted ? "" : ` (${Z(x.failure)})`}.`,
      );
    return {
      ok: !0,
      result: {
        mode: c,
        projectId: y.id,
        projectName: S,
        projectUrl: j,
        setupSubmitted: !1,
        setupUncertain: !1,
        threadsOnCard: 0,
        ...L,
        savedToMemory: !1,
        handedOff: !1,
        message: outcome,
        notes: h,
      },
    };
  }
  let R = !1,
    B = c === "new" && y.coordinatorSessionId !== null ? e.memoryRetryDelaysMs : [];
  try {
    let x = await saveOrReplaceMemoryFile(
      y.id,
      {
        path: "/" + CONTEXT_FILE_NAME,
        content: buildContextFileContent({
          approvedVia: e.approvedVia,
          folderName: detection.folderName,
          projectName: S,
          sourceSessionId: e.sourceSessionId,
          proposal: e.proposal,
          toolsUsed: e.toolsUsed,
          mode: c,
          dateIso: l,
        }),
      },
      signal,
      credentials,
      B,
    );
    if (x === null)
      h.push(
        signal.aborted
          ? `Cancelled before ${CONTEXT_FILE_NAME} was saved to project memory.`
          : "Project memory isn\u2019t available for this project, so the brief was not saved there.",
      );
    else if (((R = !0), x === "replaced"))
      h.push(`Replaced the ${CONTEXT_FILE_NAME} this project already had.`);
  } catch (error) {
    h.push(
      signal.aborted
        ? `Cancelled before ${CONTEXT_FILE_NAME} was saved to project memory.`
        : `Couldn\u2019t save the brief to project memory (${Z(error)}).`,
    );
  }
  let z = !1;
  if (R) {
    let x = buildContinuedSection({
      mode: c,
      dateIso: l,
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
          path: xe,
          content: `${x}
`,
        },
        signal,
        credentials,
        [],
      );
      if (D === "created") z = !0;
      else if (D === "kept-existing") {
        let N = await readMemoryFile(y.id, xe, signal, credentials);
        if (N === null)
          if (
            (await saveMemoryFileIfAbsent(
              y.id,
              {
                path: xe,
                content: `${x}
`,
              },
              signal,
              credentials,
              [],
            )) === "created"
          )
            z = !0;
          else
            h.push(
              `Saved ${CONTEXT_FILE_NAME} to project memory, but couldn\u2019t add its section to MEMORY.md, which could not be read.`,
            );
        else {
          let I = mergeContinuedSection(N.content, x);
          if (I.wrote !== "nothing" && I.content === N.content) z = I.wrote === "section";
          else if (I.wrote === "nothing")
            h.push(
              `MEMORY.md is full, so it has no section about this work and no pointer to ${CONTEXT_FILE_NAME}. The brief is still in that file.`,
            );
          else if (
            (await replaceMemoryFile(
              y.id,
              { id: N.id, content: I.content, expectedSha256: N.contentSha256 },
              signal,
              credentials,
            ),
            (z = I.wrote === "section"),
            !z)
          )
            h.push(
              `MEMORY.md is nearly full, so it points at ${CONTEXT_FILE_NAME} without describing this work.`,
            );
        }
      } else if (D === null)
        h.push(
          `Saved ${CONTEXT_FILE_NAME} to project memory, but couldn\u2019t add its section to MEMORY.md, because project memory did not answer.`,
        );
    } catch (error) {
      h.push(
        `Saved ${CONTEXT_FILE_NAME} to project memory, but couldn\u2019t add its section to MEMORY.md (${Z(error)}).`,
      );
    }
  }
  let se = !1,
    q = !1,
    X = !1,
    re = 0,
    oe = XOr(e.proposal, c, e.approvedVia);
  if (Wn(e.approvedVia) && y.coordinatorSessionId !== null && !isProposalEmpty(oe)) {
    let x = await submitSetupCard({
      channelId: y.id,
      proposal: oe,
      sourceSessionId: e.sourceSessionId,
      clientRequestId: e.clientRequestId,
      retryDelaysMs: e.setupSubmitRetryDelaysMs ?? ft,
      savedToMemory: R,
      signal: signal,
      credentials: credentials,
      notes: h,
    });
    ((q = x.outcome === "submitted"), (X = x.outcome === "uncertain"), (re = x.threadsOnCard));
  }
  if (q || X);
  else if (isProposalEmpty(oe))
    h.push(
      Le(c, e.approvedVia)
        ? `No setup card was posted. The brief\u2019s icon, color and instructions were set on the project when it was created, and it has no summary, threads or routines.${(e.proposal.name ?? "") !== "" ? ` The name it proposed, \u201C${safeLabel(e.proposal.name ?? "")}\u201D, was not used. The project is named \u201C${safeLabel(e.projectName)}\u201D, as you approved.` : ""}`
        : "No setup card was posted, because the brief has no summary, instructions, threads or routines.",
    );
  else if (y.coordinatorSessionId === null)
    h.push(
      `The project has no coordinator, so the brief couldn\u2019t be handed over. ${R ? `It is in project memory as ${CONTEXT_FILE_NAME}` : "Paste it into the project yourself"}.`,
    );
  else
    try {
      (await handOffToCoordinator(
        y.coordinatorSessionId,
        buildHandoffMessage({
          approvedVia: e.approvedVia,
          mode: c,
          projectName: S,
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
      ),
        (se = !0),
        (re = e.proposal.sessions?.length ?? 0));
    } catch (error) {
      h.push(
        `${signal.aborted ? "Cancelled before the brief was handed to the project" : `The brief wasn\u2019t handed to the project (${Z(error)})`}.${R ? ` It is still in project memory as ${CONTEXT_FILE_NAME}.` : ""}`,
      );
    }
  return {
    ok: !0,
    result: {
      mode: c,
      projectId: y.id,
      projectName: S,
      projectUrl: j,
      setupSubmitted: q,
      setupUncertain: X,
      threadsOnCard: re,
      ...L,
      savedToMemory: R,
      handedOff: se,
      message: null,
      notes: h,
    },
  };
}
//@ chunk-dz3q485w.js:68162-68208 placement
var HOST_WRITES = "host_writes",
  HOST_OUTCOME = "host_outcome",
  wr = 100;
/**
 * 项目上下文与发送结果 schema。
 */
//@ chunk-dz3q485w.js:68208-68653 placement
var PROJECT_CONTEXT_SCHEMA = DoctorLazy(() =>
    zodStrictObject({
      version: T(1),
      source_session_id: o().max(wr).refine(isSelfAddressableSessionId),
      memory_file: zodStrictObject({ path: T(`/${CONTEXT_FILE_NAME}`), content: o() }).optional(),
      memory_index_section: o().optional(),
      memory_omitted: T(!0).optional(),
    }),
  ),
  SEND_RESULT_SCHEMA = DoctorLazy(() =>
    zodStrictObject({
      version: T(1),
      project_id: o().regex(Rz),
      project_name: o().max(1000),
      mode: U(["created", "existing"]),
      saved_to_memory: M(),
      setup_submitted: M(),
      setup_uncertain: M(),
      threads_on_card: E().int().min(0).max(100),
      notes: A(o().max(1000)).max(50),
    }),
  );
//@ chunk-dz3q485w.js:68653-68720 placement
function br() {
  return (
    !isEssentialTrafficOnly() &&
    isFirstPartyProvider() &&
    isClaudeAISubscriber() &&
    isPolicyAllowed("allow_remote_sessions")
  );
}
//@ chunk-dz3q485w.js:68720-68780 placement
function Sr() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_tributary_dotterel", !1);
}
//@ chunk-dz3q485w.js:68780-68842 placement
function De() {
  return getFeatureValue_SESSION_PINNED("tengu_amber_tributary_sandpiper", !1);
}
//@ chunk-dz3q485w.js:68842-68877 placement
function wsn() {
  return !H$t() && !De();
}
//@ chunk-dz3q485w.js:68877-68956 placement
function kht() {
  return (
    !getIsRemoteMode() && br() && (H$t() ? !1 : !env.CLAUDE_CODE_REMOTE && isRemoteControlOfferable()) && Sr()
  );
}
//@ chunk-dz3q485w.js:68956-68980 placement
function kNs() {
  return !1;
}
//@ chunk-dz3q485w.js:68980-69004 placement
function H$t() {
  return !1;
}
//@ chunk-dz3q485w.js:69004-69074 placement
async function Yn(e, n) {
  let s = await readHistorySuppressionFromDisk(n);
  return isRemoteEgressSuppressedFor(e) ? "suppressed" : s;
}
/**
 * 当前会话的 Remote Control 连接状态（none/withheld/connected）。
 */
//@ chunk-dz3q485w.js:69074-69409 placement
function remoteControlLink() {
  let e = getReplBridgeHandle() ?? getSdkHostedBridgeHandle();
  if (e?.outboundOnly === !0) return { kind: "none" };
  if (e?.noHistoryBackfill === !0) return { kind: "withheld" };
  let n = e?.bridgeSessionId ?? getPeerBridgeIdentity()?.bridgeSessionId;
  if (n === void 0) return { kind: "none" };
  let s = toCompatSessionId(n);
  if (!isSelfAddressableSessionId(s)) return { kind: "none" };
  if (isBridgeBindingForeign() || isRemoteEgressSuppressedFor(pinSessionId(getSessionId())))
    return { kind: "withheld" };
  return { kind: "connected", sessionId: s };
}
/**
 * 检查对话能否经 Remote Control 发送给项目（含历史抑制扫描）。
 */
//@ chunk-dz3q485w.js:69409-69652 placement
async function checkConversationSendable(e) {
  let n = remoteControlLink();
  if (n.kind !== "connected") return n;
  let s = getSessionId(),
    r = await Yn(pinSessionId(s), e),
    a = remoteControlLink();
  if (a.kind !== "connected") return a;
  if (r === "suppressed" || r === "found") return { kind: "withheld" };
  return r === "clean" && getSessionId() === s ? a : { kind: "unverified" };
}
/**
 * 交接前等待 Remote Control 上传完成。
 */
//@ chunk-dz3q485w.js:69652-69827 placement
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
/**
 * Remote Control 不可用（none/withheld/unverified）的说明文本。
 */
//@ chunk-dz3q485w.js:69827-70470 placement
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
  XOr,
  OWn,
  wsn,
  kht,
  H$t,
  checkConversationSendable,
  remoteControlRefusalText,
  De,
  HOST_WRITES,
  HOST_OUTCOME,
  settleBridgeUploads,
  submitProjectSetup,
  Le,
  kNs,
};
