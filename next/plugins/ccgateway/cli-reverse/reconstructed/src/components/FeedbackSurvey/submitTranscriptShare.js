/**
 * components/FeedbackSurvey/submitTranscriptShare.ts
 *
 * 上传分享的会话记录到 /api/claude_code_shared_session_transcripts。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FeedbackSurvey/submitTranscriptShare.ts
 * pieces: chunk-czq1j3j2.js (10)
 * attribution: placement 9, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
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
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1030403-1030407 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1030403", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1051067-1051144 placement
var TRANSCRIPT_TOP_LEVEL_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SUBAGENT_TRANSCRIPT_KEYS;
var SHARE_UPLOAD_TIMEOUT_MS;
deferInit("chunk-czq1j3j2.js:1051067", () => {
  TRANSCRIPT_TOP_LEVEL_KEYS = new Set(["transcript"]);
  SUBAGENT_TRANSCRIPT_KEYS = new Set(["subagentTranscripts"]);
  SHARE_UPLOAD_TIMEOUT_MS = 1e4;
});
//@ chunk-czq1j3j2.js:1051144-1051653 placement
async function transcriptSharePolicy(messages, storage, host) {
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
    let agentIds = extractAgentIdsFromMessages(messages);
    let remoteSession = isRemoteSessionAvailable();
    let [subagentTranscripts, headSha] = await Promise.all([
      loadSubagentTranscripts(agentIds, storage),
      remoteSession ? "" : getHead(),
    ]);
    let rawTranscriptJsonl =
      (await getTaskOutput_2(getTranscriptPath(), MAX_RAW_TRANSCRIPT_BYTES, storage)) ?? undefined;
    return {
      kind: "captured",
      messages,
      rawTranscriptJsonl,
      subagentTranscripts,
      headSha,
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
//@ chunk-czq1j3j2.js:1051653-1051717 placement
async function collectTranscriptShareWithPolicy(
  messages,
  trigger,
  appearanceId,
  storageV5,
  host,
  credentials,
) {
  return collectTranscriptShare(
    transcriptSharePolicy(messages, storageV5, host),
    trigger,
    appearanceId,
    credentials,
  );
}
//@ chunk-czq1j3j2.js:1051717-1054391 placement
async function collectTranscriptShare(policyPromise, trigger, appearanceId, credentials) {
  if (isEssentialTrafficOnly()) return transcriptShareFailure(lit_2("essential_traffic_only"));
  if (!isPolicyAllowed_2("allow_product_feedback")) return transcriptShareFailure(lit_2("policy_blocked"));
  let mode = feedbackMode().kind === "bundle" ? "bundle" : "post";
  try {
    let capture = await policyPromise;
    if (capture.kind === "blocked") return transcriptShareFailure(fromEnum(capture.errorCode));
    if (capture.kind === "capture_failed") throw capture.error;
    let transcript = normalizeMessagesForAPI(
      withholdForExport(capture.messages, {
        host: capture.host,
      }),
    );
    let { headSha, lastApiRequest } = capture;
    let subagents = {
      ...capture.subagentTranscripts,
    };
    let { rawTranscriptJsonl } = capture;
    if (mode === "post") {
      for (let [key, value] of Object.entries(subagents))
        if (anyMessageHasProviderId(value)) {
          delete subagents[key];
          logForDebugging(`subagent transcript ${key} withheld: contains_3p_transcript_markers`);
        }
      if (rawTranscriptJsonl !== undefined && containsProviderId(rawTranscriptJsonl)) {
        rawTranscriptJsonl = undefined;
        logForDebugging("rawTranscriptJsonl withheld from transcript share: contains_3p_transcript_markers");
      }
    }
    let withheldSubagents = import_mapValues(subagents, (entry) =>
      withholdForExport(entry, {
        host: capture.host,
      }),
    );
    let rawTranscriptJsonl_2 =
      rawTranscriptJsonl === undefined
        ? undefined
        : redactTranscript(
            withholdTranscriptLine(rawTranscriptJsonl, {
              host: capture.host,
            }).jsonl,
          );
    let basePayload = {
      ...redactSecretsDeep({
        trigger,
        version: {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
        platform: "linux",
        commitSha: headSha || null,
        lastApiRequest: lastApiRequest ? pickFeedbackFields(lastApiRequest) : undefined,
      }),
      transcript: redactFeedbackValue(transcript),
      subagentTranscripts:
        Object.keys(withheldSubagents).length > 0
          ? import_mapValues(withheldSubagents, redactFeedbackValue)
          : undefined,
      rawTranscriptJsonl: rawTranscriptJsonl_2,
    };
    if (mode === "bundle") {
      let text = buildFeedbackPayload(basePayload, TRANSCRIPT_TOP_LEVEL_KEYS, SUBAGENT_TRANSCRIPT_KEYS, {
        extraOuterFields: {
          appearance_id: appearanceId,
        },
      });
      let bundleResult = await writeFeedbackBundle(text, "transcript.json");
      if (bundleResult.success) {
        logFeatureOk("feedback_transcript_share");
        return {
          success: true,
          bundlePath: bundleResult.zipPath,
        };
      }
      return transcriptShareFailure(lit_2("bundle_write_failed"));
    }
    let {
      transcript: transcript_2,
      subagentTranscripts,
      lastApiRequest: lastApiRequest_2,
      rawTranscriptJsonl: rawTranscriptJsonl_3,
      ...baseFields
    } = basePayload;
    let attempts = [
      basePayload,
      ...(lastApiRequest_2 !== undefined
        ? [
            {
              ...basePayload,
              lastApiRequest: undefined,
            },
          ]
        : []),
      ...(rawTranscriptJsonl_3?.trim()
        ? [
            {
              ...baseFields,
              transcript: [],
              rawTranscriptJsonl: rawTranscriptJsonl_3,
            },
          ]
        : []),
      {
        ...baseFields,
        transcript: [],
      },
    ];
    let failureCode = lit_2("payload_too_large_precheck");
    for (let [attemptIndex, attempt] of attempts.entries()) {
      let payload;
      try {
        payload = buildFeedbackPayload(attempt, TRANSCRIPT_TOP_LEVEL_KEYS, SUBAGENT_TRANSCRIPT_KEYS, {
          extraOuterFields: {
            appearance_id: appearanceId,
          },
        });
      } catch (error) {
        if (error instanceof RangeError) {
          failureCode = lit_2("payload_range_error");
          continue;
        }
        throw error;
      }
      if (payload.length > MAX_PAYLOAD_PART_COUNT) {
        failureCode = lit_2("payload_too_large_precheck");
        continue;
      }
      let result = await submitTranscriptShare(payload, credentials);
      switch (result.kind) {
        case "success":
          logForDebugging("Transcript shared successfully", {
            level: "info",
          });
          if (attemptIndex > 0) logFeatureSad("feedback_transcript_share", "payload_stripped");
          else logFeatureOk("feedback_transcript_share");
          return {
            success: true,
            transcriptId: result.transcriptId,
          };
        case "blocked":
          return transcriptShareFailure(result.errorCode);
        case "failed":
          failureCode = result.errorCode;
          if (!result.payloadTooLarge) return transcriptShareFailure(result.errorCode);
      }
    }
    return transcriptShareFailure(failureCode);
  } catch (error) {
    logForDebugging(errorMessage(error), {
      level: "error",
    });
    return transcriptShareFailure(classifyShareError(error));
  }
}
//@ chunk-czq1j3j2.js:1054391-1054471 placement
function transcriptShareFailure(errorCode) {
  logFeatureBad("feedback_transcript_share", errorCode);
  return {
    success: false,
    errorCode,
  };
}
//@ chunk-czq1j3j2.js:1054471-1055249 fingerprint (2.1.88 match: submitTranscriptShare, 0.331)
async function submitTranscriptShare(payload, credentials) {
  try {
    let response = await withOAuth401Retry(
      () =>
        apiClient.post("/api/claude_code_shared_session_transcripts", payload, {
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
    if (!response.ok)
      switch (response.reason) {
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
    if (response.status === 200 || response.status === 201)
      return {
        kind: "success",
        transcriptId: response.data?.transcript_id,
      };
    return {
      kind: "failed",
      errorCode: isHttpErrorLabel(response.status),
      payloadTooLarge: response.status === 413,
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
//@ chunk-czq1j3j2.js:1055249-1055293 placement (2.1.88 match: executePush, 0.33)
function isHttpErrorLabel(status) {
  return concatSafe(lit_2("http_"), fromNumber(status));
}
//@ chunk-czq1j3j2.js:1055293-1055565 placement
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
//@ chunk-czq1j3j2.js:1055565-1055668 placement
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
export {
  collectTranscriptShareWithPolicy,
  transcriptSharePolicy,
  getTranscriptShareGate,
  collectTranscriptShare,
};
