/**
 * services/feedback/submitSurveyFeedback.ts
 *
 * 2.1.316 新增：SDK 提交满意度反馈（可附带对话，仅 Pro/Max）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-25hrjv6b.js (1)
 * attribution: placement 1
 */
import { SDKSubmitSurveyFeedbackSubmitSurveyFeedbackMessageSchema } from "../../entrypoints/sdk/controlSchemas.js";
import { feedbackUnavailableReason, orgFeedbackRefusalMessage } from "./submitFeedback.js";
import { isConsumerSubscriber } from "../../utils/auth.js";
import { postFeedbackSubmission } from "./feedbackBundle.js";

//@ chunk-25hrjv6b.js:11873-12660 placement
/**
 * SDK 提交满意度反馈（可附带对话，仅 Pro/Max）。
 */
async function submitSurveyFeedbackForSdk({ request, messages, storageV5, host, credentials }) {
  let r = SDKSubmitSurveyFeedbackSubmitSurveyFeedbackMessageSchema().safeParse({
    ...request,
    subtype: "submit_survey_feedback",
  });
  if (!r.success)
    return {
      feedback_id: null,
      unavailable_reason: "Malformed request.",
    };
  let s = r.data;
  let a =
    feedbackUnavailableReason() ??
    (isConsumerSubscriber()
      ? null
      : "Only Pro and Max plans can send the conversation with a rating. Nothing was sent.");
  if (a)
    return {
      feedback_id: null,
      unavailable_reason: a,
    };
  let e = await postFeedbackSubmission({
    messages,
    description: s.description,
    surface: s.surface ?? "sdk",
    surveyFeedbackSource: {
      appearanceId: s.appearance_id,
      response: s.survey_response,
      surveyType: s.survey_type,
      setAt: Date.now(),
    },
    storageV5,
    host,
    credentials,
  });
  return e.success
    ? {
        feedback_id: e.feedbackId,
      }
    : {
        feedback_id: null,
        is_zdr_org: e.isZdrOrg,
        failure_reason: e.failureReason,
        status_code: e.statusCode,
        unavailable_reason: orgFeedbackRefusalMessage(e),
      };
}
