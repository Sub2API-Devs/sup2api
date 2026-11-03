/**
 * components/FeedbackSurvey/submitTranscriptShare.ts
 *
 * 上传分享的会话记录到 /api/claude_code_shared_session_transcripts。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FeedbackSurvey/submitTranscriptShare.ts
 * pieces: chunk-18hwfzwa.js (10)
 * attribution: placement 9, fingerprint 1
 */
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isPolicyAllowed as isPolicyAllowed_2 } from "../../services/policyLimits/policyEvidence.js";
import { logForDebugging } from "../../utils/debug.js";
import { getLastAPIRequest } from "../../bootstrap/state.js";
import {
  extractAgentIdsFromMessages,
  loadSubagentTranscripts,
  getTranscriptPath,
} from "../../utils/sessionStorage.js";
import { wt } from "../../remote/remoteMode.js";
import { getHead } from "../../utils/git.js";
import {
  getTaskOutput as getTaskOutput_2,
  BLt,
  feedbackMode,
  pickFeedbackFields,
  buildFeedbackPayload,
  dDe,
} from "../../services/feedback/submitFeedback.js";
import { lit as lit_2, fromEnum, concatSafe, fromNumber } from "../../services/analytics/safeMetadata.js";
import { normalizeMessagesForAPI } from "../../utils/messages.js";
import { withholdForExport, withholdTranscriptLine } from "../../utils/transcriptWithholding.js";
import { jbt, Uue } from "../../services/api/providerIds.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { SNn, redactFeedbackValue, writeFeedbackBundle } from "../../services/feedback/feedbackBundle.js";
import { redactSecretsDeep } from "../../services/teamMemorySync/secretScanner.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import {
  errorMessage,
  classifyAxiosError,
  sanitizedConnectionCodeLowerForTelemetry,
  getErrnoCode,
} from "../../utils/errors.js";
import { withOAuth401Retry, getUserAgent } from "../../utils/http.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { getMainLoopModel, isOpus55FamilyModel, isSonnet55FamilyModel } from "../../utils/model/model.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { TENGU_RUSSET_WHIMBREL } from "./useFeedbackSurvey.js";
import { j } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:1017029-1017106 placement
var not = new Set(["transcript"]),
  rot = new Set(["subagentTranscripts"]),
  Gfo = 1e4;
//@ chunk-18hwfzwa.js:1017106-1017615 placement
async function transcriptSharePolicy(h, x, D) {
  try {
    if (isEssentialTrafficOnly()) return { kind: "blocked", errorCode: "essential_traffic_only" };
    if (!isPolicyAllowed_2("allow_product_feedback")) return { kind: "blocked", errorCode: "policy_blocked" };
    logForDebugging("Collecting transcript for sharing", { level: "info" });
    let L = getLastAPIRequest(),
      ee = extractAgentIdsFromMessages(h),
      ke = wt(),
      [Re, Be] = await Promise.all([loadSubagentTranscripts(ee, x), ke ? "" : getHead()]),
      He = (await getTaskOutput_2(getTranscriptPath(), BLt, x)) ?? void 0;
    return {
      kind: "captured",
      messages: h,
      rawTranscriptJsonl: He,
      subagentTranscripts: Re,
      headSha: Be,
      lastApiRequest: L,
      host: D,
    };
  } catch (error) {
    return { kind: "capture_failed", error: error };
  }
}
//@ chunk-18hwfzwa.js:1017615-1017679 placement
async function yve(h, x, D, L, ee, ke) {
  return collectTranscriptShare(transcriptSharePolicy(h, L, ee), x, D, ke);
}
//@ chunk-18hwfzwa.js:1017679-1020352 placement
async function collectTranscriptShare(h, x, D, L) {
  if (isEssentialTrafficOnly()) return CR(lit_2("essential_traffic_only"));
  if (!isPolicyAllowed_2("allow_product_feedback")) return CR(lit_2("policy_blocked"));
  let ee = feedbackMode().kind === "bundle" ? "bundle" : "post";
  try {
    let ke = await h;
    if (ke.kind === "blocked") return CR(fromEnum(ke.errorCode));
    if (ke.kind === "capture_failed") throw ke.error;
    let Re = normalizeMessagesForAPI(withholdForExport(ke.messages, { host: ke.host })),
      { headSha: headSha, lastApiRequest: lastApiRequest } = ke,
      We = { ...ke.subagentTranscripts },
      { rawTranscriptJsonl: rawTranscriptJsonl } = ke;
    if (ee === "post") {
      for (let [Xt, io] of Object.entries(We))
        if (jbt(io))
          (delete We[Xt],
            logForDebugging(`subagent transcript ${Xt} withheld: contains_3p_transcript_markers`));
      if (rawTranscriptJsonl !== void 0 && Uue(rawTranscriptJsonl))
        ((rawTranscriptJsonl = void 0),
          logForDebugging(
            "rawTranscriptJsonl withheld from transcript share: contains_3p_transcript_markers",
          ));
    }
    let Xe = xr(We, (Xt) => withholdForExport(Xt, { host: ke.host })),
      rt =
        rawTranscriptJsonl === void 0
          ? void 0
          : SNn(withholdTranscriptLine(rawTranscriptJsonl, { host: ke.host }).jsonl),
      kt = {
        ...redactSecretsDeep({
          trigger: x,
          version: {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION,
          platform: "linux",
          commitSha: headSha || null,
          lastApiRequest: lastApiRequest ? pickFeedbackFields(lastApiRequest) : void 0,
        }),
        transcript: redactFeedbackValue(Re),
        subagentTranscripts: Object.keys(Xe).length > 0 ? xr(Xe, redactFeedbackValue) : void 0,
        rawTranscriptJsonl: rt,
      };
    if (ee === "bundle") {
      let Xt = buildFeedbackPayload(kt, not, rot, { extraOuterFields: { appearance_id: D } }),
        io = await writeFeedbackBundle(Xt, "transcript.json");
      if (io.success)
        return (logFeatureOk("feedback_transcript_share"), { success: !0, bundlePath: io.zipPath });
      return CR(lit_2("bundle_write_failed"));
    }
    let {
        transcript: transcript,
        subagentTranscripts: subagentTranscripts,
        lastApiRequest: lastApiRequest_2,
        rawTranscriptJsonl: rawTranscriptJsonl_2,
        ...Dt
      } = kt,
      Lt = [
        kt,
        ...(lastApiRequest_2 !== void 0 ? [{ ...kt, lastApiRequest: void 0 }] : []),
        ...(rawTranscriptJsonl_2?.trim()
          ? [{ ...Dt, transcript: [], rawTranscriptJsonl: rawTranscriptJsonl_2 }]
          : []),
        { ...Dt, transcript: [] },
      ],
      oo = lit_2("payload_too_large_precheck");
    for (let [Xt, io] of Lt.entries()) {
      let so;
      try {
        so = buildFeedbackPayload(io, not, rot, { extraOuterFields: { appearance_id: D } });
      } catch (error) {
        if (error instanceof RangeError) {
          oo = lit_2("payload_range_error");
          continue;
        }
        throw error;
      }
      if (so.length > dDe) {
        oo = lit_2("payload_too_large_precheck");
        continue;
      }
      let po = await submitTranscriptShare(so, L);
      switch (po.kind) {
        case "success":
          if ((logForDebugging("Transcript shared successfully", { level: "info" }), Xt > 0))
            logFeatureSad("feedback_transcript_share", "payload_stripped");
          else logFeatureOk("feedback_transcript_share");
          return { success: !0, transcriptId: po.transcriptId };
        case "blocked":
          return CR(po.errorCode);
        case "failed":
          if (((oo = po.errorCode), !po.payloadTooLarge)) return CR(po.errorCode);
      }
    }
    return CR(oo);
  } catch (error) {
    return (logForDebugging(errorMessage(error), { level: "error" }), CR(classifyShareError(error)));
  }
}
//@ chunk-18hwfzwa.js:1020352-1020432 placement
function CR(h) {
  return (logFeatureBad("feedback_transcript_share", h), { success: !1, errorCode: h });
}
//@ chunk-18hwfzwa.js:1020432-1021210 fingerprint = submitTranscriptShare (0.331)
async function submitTranscriptShare(h, x) {
  try {
    let D = await withOAuth401Retry(
      () =>
        apiClient.post("/api/claude_code_shared_session_transcripts", h, {
          timeout: Gfo,
          headers: { "Content-Type": "application/json", "User-Agent": getUserAgent() },
          credentials: x,
        }),
      { credentials: x },
    );
    if (!D.ok)
      switch (D.reason) {
        case "essential-traffic-only":
          return { kind: "blocked", errorCode: lit_2("essential_traffic_only") };
        case "data-residency":
          return { kind: "blocked", errorCode: lit_2("data_residency") };
        case "no-auth":
          return { kind: "blocked", errorCode: lit_2("auth_unavailable") };
      }
    if (D.status === 200 || D.status === 201) return { kind: "success", transcriptId: D.data?.transcript_id };
    return { kind: "failed", errorCode: isHttpErrorLabel(D.status), payloadTooLarge: D.status === 413 };
  } catch (error) {
    logForDebugging(errorMessage(error), { level: "error" });
    let transcript = classifyShareError(error);
    return {
      kind: "failed",
      errorCode: transcript,
      payloadTooLarge: transcript === "http_413" || transcript === "payload_range_error",
    };
  }
}
//@ chunk-18hwfzwa.js:1021210-1021254 placement = executePush (0.329)
function isHttpErrorLabel(h) {
  return concatSafe(lit_2("http_"), fromNumber(h));
}
//@ chunk-18hwfzwa.js:1021254-1021526 placement
function classifyShareError(h) {
  if (h instanceof RangeError) return lit_2("payload_range_error");
  let { kind: kind, status: status } = classifyAxiosError(h);
  switch (kind) {
    case "timeout":
    case "network":
      return fromEnum(kind);
    case "auth":
    case "http":
      if (status !== void 0) return isHttpErrorLabel(status);
      return sanitizedConnectionCodeLowerForTelemetry(getErrnoCode(h)) ?? lit_2("no_response");
    case "other":
      return lit_2("exception");
  }
}
/**
 * 仅 Opus 5.5 / Sonnet 5.5 系模型：读特性值 TENGU_RUSSET_WHIMBREL，2→true、1→false，其余 null。
 */
//@ chunk-18hwfzwa.js:1021526-1021629 placement
function getTranscriptShareGate() {
  let h = getMainLoopModel();
  if (!isOpus55FamilyModel(h) && !isSonnet55FamilyModel(h)) return null;
  let x = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_RUSSET_WHIMBREL, 0);
  return x === 2 ? !0 : x === 1 ? !1 : null;
}
//@ chunk-18hwfzwa.js:1021629-1021633 placement
j();

export { transcriptSharePolicy, getTranscriptShareGate, collectTranscriptShare, yve };
