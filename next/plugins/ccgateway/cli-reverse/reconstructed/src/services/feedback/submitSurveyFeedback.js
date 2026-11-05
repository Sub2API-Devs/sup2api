/**
 * services/feedback/submitSurveyFeedback.ts
 *
 * 2.1.316 新增：SDK 提交满意度反馈（可附带对话，仅 Pro/Max）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-85a5w51b.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { SDKSubmitSurveyFeedbackSubmitSurveyFeedbackMessageSchema } from "../../entrypoints/sdk/controlSchemas.js";
import { feedbackUnavailableReason, orgFeedbackRefusalMessage } from "./submitFeedback.js";
import { isConsumerSubscriber } from "../../utils/auth.js";
import { postFeedbackSubmission } from "./feedbackBundle.js";

//@ chunk-85a5w51b.js:13049-13836 placement
/**
 * SDK 提交满意度反馈（可附带对话，仅 Pro/Max）。
 */
async function submitSurveyFeedbackForSdk({ request, messages, storageV5, host, credentials }) {
  let parsed = SDKSubmitSurveyFeedbackSubmitSurveyFeedbackMessageSchema().safeParse({
    ...request,
    subtype: "submit_survey_feedback",
  });
  if (!parsed.success)
    return {
      feedback_id: null,
      unavailable_reason: "Malformed request.",
    };
  let parsedRequest = parsed.data;
  let unavailableReason =
    feedbackUnavailableReason() ??
    (isConsumerSubscriber()
      ? null
      : "Only Pro and Max plans can send the conversation with a rating. Nothing was sent.");
  if (unavailableReason)
    return {
      feedback_id: null,
      unavailable_reason: unavailableReason,
    };
  let result = await postFeedbackSubmission({
    messages,
    description: parsedRequest.description,
    surface: parsedRequest.surface ?? "sdk",
    surveyFeedbackSource: {
      appearanceId: parsedRequest.appearance_id,
      response: parsedRequest.survey_response,
      surveyType: parsedRequest.survey_type,
      setAt: Date.now(),
    },
    storageV5,
    host,
    credentials,
  });
  return result.success
    ? {
        feedback_id: result.feedbackId,
      }
    : {
        feedback_id: null,
        is_zdr_org: result.isZdrOrg,
        failure_reason: result.failureReason,
        status_code: result.statusCode,
        unavailable_reason: orgFeedbackRefusalMessage(result),
      };
}
export { submitSurveyFeedbackForSdk };
