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
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { getHead } from "../../utils/git.js";
import {
  getTaskOutput as getTaskOutput_2,
  MAX_RAW_TRANSCRIPT_BYTES,
  feedbackMode,
  pickFeedbackFields,
  buildFeedbackPayload,
  MAX_PAYLOAD_PART_COUNT,
} from "../../services/feedback/submitFeedback.js";
import { lit as lit_2, fromEnum, concatSafe, fromNumber } from "../../services/analytics/safeMetadata.js";
import { normalizeMessagesForAPI } from "../../utils/messages.js";
import { withholdForExport, withholdTranscriptLine } from "../../utils/transcriptWithholding.js";
import { anyMessageHasProviderId, containsProviderId } from "../../services/api/providerIds.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  redactTranscript,
  redactFeedbackValue,
  writeFeedbackBundle,
} from "../../services/feedback/feedbackBundle.js";
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
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:1017029-1017106 placement
var TRANSCRIPT_TOP_LEVEL_KEYS = new Set(["transcript"]);
var SUBAGENT_TRANSCRIPT_KEYS = new Set(["subagentTranscripts"]);
var SHARE_UPLOAD_TIMEOUT_MS = 1e4;
//@ chunk-18hwfzwa.js:1017106-1017615 placement
async function transcriptSharePolicy(messages, storageV5, host) {
  try {
    if (isEssentialTrafficOnly())
      return {
        kind: "blocked",
        errorCode: "essential_traffic_only",
      };
    if (!isPolicyAllowed_2("allow_product_feedback"))
      return {
        kind: "blocked",
        errorCode: "policy_blocked",
      };
    logForDebugging("Collecting transcript for sharing", {
      level: "info",
    });
    let lastApiRequest = getLastAPIRequest();
    let agentIdsFromMessages = extractAgentIdsFromMessages(messages);
    let ke = isRemoteSessionAvailable();
    let [subagentTranscripts, Be] = await Promise.all([
      loadSubagentTranscripts(agentIdsFromMessages, storageV5),
      ke ? "" : getHead(),
    ]);
    let rawTranscriptJsonl =
      (await getTaskOutput_2(getTranscriptPath(), MAX_RAW_TRANSCRIPT_BYTES, storageV5)) ?? undefined;
    return {
      kind: "captured",
      messages,
      rawTranscriptJsonl,
      subagentTranscripts,
      headSha: Be,
      lastApiRequest,
      host,
    };
  } catch (error) {
    return {
      kind: "capture_failed",
      error,
    };
  }
}
//@ chunk-18hwfzwa.js:1017615-1017679 placement
async function collectTranscriptShareWithPolicy(h, trigger, appearanceId, storageV5, host, credentials) {
  return collectTranscriptShare(
    transcriptSharePolicy(h, storageV5, host),
    trigger,
    appearanceId,
    credentials,
  );
}
//@ chunk-18hwfzwa.js:1017679-1020352 placement
async function collectTranscriptShare(h, trigger, appearanceId, credentials) {
  if (isEssentialTrafficOnly()) return transcriptShareFailure(lit_2("essential_traffic_only"));
  if (!isPolicyAllowed_2("allow_product_feedback")) return transcriptShareFailure(lit_2("policy_blocked"));
  let ee = feedbackMode().kind === "bundle" ? "bundle" : "post";
  try {
    let ke = await h;
    if (ke.kind === "blocked") return transcriptShareFailure(fromEnum(ke.errorCode));
    if (ke.kind === "capture_failed") throw ke.error;
    let Re = normalizeMessagesForAPI(
      withholdForExport(ke.messages, {
        host: ke.host,
      }),
    );
    let { headSha, lastApiRequest } = ke;
    let We = {
      ...ke.subagentTranscripts,
    };
    let { rawTranscriptJsonl } = ke;
    if (ee === "post") {
      for (let [key, value] of Object.entries(We))
        if (anyMessageHasProviderId(value)) {
          delete We[key];
          logForDebugging(`subagent transcript ${key} withheld: contains_3p_transcript_markers`);
        }
      if (rawTranscriptJsonl !== undefined && containsProviderId(rawTranscriptJsonl)) {
        rawTranscriptJsonl = undefined;
        logForDebugging("rawTranscriptJsonl withheld from transcript share: contains_3p_transcript_markers");
      }
    }
    let Xe = xr(We, (Xt) =>
      withholdForExport(Xt, {
        host: ke.host,
      }),
    );
    let rawTranscriptJsonl_2 =
      rawTranscriptJsonl === undefined
        ? undefined
        : redactTranscript(
            withholdTranscriptLine(rawTranscriptJsonl, {
              host: ke.host,
            }).jsonl,
          );
    let kt = {
      ...redactSecretsDeep({
        trigger,
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
        lastApiRequest: lastApiRequest ? pickFeedbackFields(lastApiRequest) : undefined,
      }),
      transcript: redactFeedbackValue(Re),
      subagentTranscripts: Object.keys(Xe).length > 0 ? xr(Xe, redactFeedbackValue) : undefined,
      rawTranscriptJsonl: rawTranscriptJsonl_2,
    };
    if (ee === "bundle") {
      let feedbackPayload = buildFeedbackPayload(kt, TRANSCRIPT_TOP_LEVEL_KEYS, SUBAGENT_TRANSCRIPT_KEYS, {
        extraOuterFields: {
          appearance_id: appearanceId,
        },
      });
      let io = await writeFeedbackBundle(feedbackPayload, "transcript.json");
      if (io.success) {
        logFeatureOk("feedback_transcript_share");
        return {
          success: true,
          bundlePath: io.zipPath,
        };
      }
      return transcriptShareFailure(lit_2("bundle_write_failed"));
    }
    let {
      transcript,
      subagentTranscripts,
      lastApiRequest: lastApiRequest_2,
      rawTranscriptJsonl: rawTranscriptJsonl_3,
      ...Dt
    } = kt;
    let Lt = [
      kt,
      ...(lastApiRequest_2 !== undefined
        ? [
            {
              ...kt,
              lastApiRequest: undefined,
            },
          ]
        : []),
      ...(rawTranscriptJsonl_3?.trim()
        ? [
            {
              ...Dt,
              transcript: [],
              rawTranscriptJsonl: rawTranscriptJsonl_3,
            },
          ]
        : []),
      {
        ...Dt,
        transcript: [],
      },
    ];
    let oo = lit_2("payload_too_large_precheck");
    for (let [Xt, io] of Lt.entries()) {
      let so;
      try {
        so = buildFeedbackPayload(io, TRANSCRIPT_TOP_LEVEL_KEYS, SUBAGENT_TRANSCRIPT_KEYS, {
          extraOuterFields: {
            appearance_id: appearanceId,
          },
        });
      } catch (error) {
        if (error instanceof RangeError) {
          oo = lit_2("payload_range_error");
          continue;
        }
        throw error;
      }
      if (so.length > MAX_PAYLOAD_PART_COUNT) {
        oo = lit_2("payload_too_large_precheck");
        continue;
      }
      let po = await submitTranscriptShare(so, credentials);
      switch (po.kind) {
        case "success":
          logForDebugging("Transcript shared successfully", {
            level: "info",
          });
          if (Xt > 0) logFeatureSad("feedback_transcript_share", "payload_stripped");
          else logFeatureOk("feedback_transcript_share");
          return {
            success: true,
            transcriptId: po.transcriptId,
          };
        case "blocked":
          return transcriptShareFailure(po.errorCode);
        case "failed":
          oo = po.errorCode;
          if (!po.payloadTooLarge) return transcriptShareFailure(po.errorCode);
      }
    }
    return transcriptShareFailure(oo);
  } catch (error) {
    logForDebugging(errorMessage(error), {
      level: "error",
    });
    return transcriptShareFailure(classifyShareError(error));
  }
}
//@ chunk-18hwfzwa.js:1020352-1020432 placement
function transcriptShareFailure(h) {
  logFeatureBad("feedback_transcript_share", h);
  return {
    success: false,
    errorCode: h,
  };
}
//@ chunk-18hwfzwa.js:1020432-1021210 fingerprint = submitTranscriptShare (0.331)
async function submitTranscriptShare(h, credentials) {
  try {
    let D = await withOAuth401Retry(
      () =>
        apiClient.post("/api/claude_code_shared_session_transcripts", h, {
          timeout: SHARE_UPLOAD_TIMEOUT_MS,
          headers: {
            "Content-Type": "application/json",
            "User-Agent": getUserAgent(),
          },
          credentials,
        }),
      {
        credentials,
      },
    );
    if (!D.ok)
      switch (D.reason) {
        case "essential-traffic-only":
          return {
            kind: "blocked",
            errorCode: lit_2("essential_traffic_only"),
          };
        case "data-residency":
          return {
            kind: "blocked",
            errorCode: lit_2("data_residency"),
          };
        case "no-auth":
          return {
            kind: "blocked",
            errorCode: lit_2("auth_unavailable"),
          };
      }
    if (D.status === 200 || D.status === 201)
      return {
        kind: "success",
        transcriptId: D.data?.transcript_id,
      };
    return {
      kind: "failed",
      errorCode: isHttpErrorLabel(D.status),
      payloadTooLarge: D.status === 413,
    };
  } catch (error) {
    logForDebugging(errorMessage(error), {
      level: "error",
    });
    let transcript = classifyShareError(error);
    return {
      kind: "failed",
      errorCode: transcript,
      payloadTooLarge: transcript === "http_413" || transcript === "payload_range_error",
    };
  }
}
//@ chunk-18hwfzwa.js:1021210-1021254 placement = executePush (0.329)
function isHttpErrorLabel(status) {
  return concatSafe(lit_2("http_"), fromNumber(status));
}
//@ chunk-18hwfzwa.js:1021254-1021526 placement
function classifyShareError(error) {
  if (error instanceof RangeError) return lit_2("payload_range_error");
  let { kind, status } = classifyAxiosError(error);
  switch (kind) {
    case "timeout":
    case "network":
      return fromEnum(kind);
    case "auth":
    case "http":
      if (status !== undefined) return isHttpErrorLabel(status);
      return sanitizedConnectionCodeLowerForTelemetry(getErrnoCode(error)) ?? lit_2("no_response");
    case "other":
      return lit_2("exception");
  }
}
//@ chunk-18hwfzwa.js:1021526-1021629 placement
/**
 * 仅 Opus 5.5 / Sonnet 5.5 系模型：读特性值 TENGU_RUSSET_WHIMBREL，2→true、1→false，其余 null。
 */
function getTranscriptShareGate() {
  let mainLoopModel = getMainLoopModel();
  if (!isOpus55FamilyModel(mainLoopModel) && !isSonnet55FamilyModel(mainLoopModel)) return null;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_RUSSET_WHIMBREL, 0);
  return featureValue_CACHED_MAY_BE_STALE === 2
    ? true
    : featureValue_CACHED_MAY_BE_STALE === 1
      ? false
      : null;
}
//@ chunk-18hwfzwa.js:1021629-1021633 placement
init_react_production();
export {
  transcriptSharePolicy,
  getTranscriptShareGate,
  collectTranscriptShare,
  collectTranscriptShareWithPolicy,
};
