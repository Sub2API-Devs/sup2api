/**
 * utils/drafts.ts
 *
 * 2.1.316 新增：由请求提交草稿。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4dfybe1k.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isFeedbackDraftsEnabled } from "../services/feedbackDrafts.js";
import { listFeedbackDrafts, FEEDBACK_TYPES } from "../services/feedback/feedbackDrafts.js";
import { submitFeedbackDraft } from "../services/feedback/feedbackDraft.js";

//@ chunk-4dfybe1k.js:13101-13888 placement
async function submitDraftFromRequest({
  draftId,
  description,
  type: feedbackType,
  title,
  area,
  attachTranscript,
  surface,
  messages,
  storageV5,
  credentials,
  host,
}) {
  if (!isFeedbackDraftsEnabled())
    return {
      feedback_id: null,
      failure_reason: "drafts_disabled",
    };
  let { queued } = await listFeedbackDrafts(undefined, storageV5);
  let found = queued.find((draft) => draft.draft_id === draftId);
  if (!found)
    return {
      feedback_id: null,
      failure_reason: "draft_not_found",
    };
  let validType =
    feedbackType !== undefined && FEEDBACK_TYPES.includes(feedbackType) ? feedbackType : undefined;
  let draft = {
    ...found,
    ...(validType !== undefined && {
      type: validType,
    }),
    ...(title != null &&
      title !== "" && {
        title,
      }),
    ...(area != null &&
      area !== "" && {
        area,
      }),
    ...(description && {
      details: description,
    }),
  };
  let submitResult = await submitFeedbackDraft({
    draft,
    includeTranscript: attachTranscript == null ? true : attachTranscript === true,
    currentSessionMessages: messages,
    surface: surface ?? "sdk",
    storageV5,
    host,
    credentials,
  });
  if (submitResult.success)
    return {
      feedback_id: submitResult.feedbackId,
    };
  return {
    feedback_id: null,
    failure_reason: submitResult.error,
    ...(submitResult.orgRefusalReason !== undefined && {
      unavailable_reason: submitResult.orgRefusalReason,
    }),
  };
}
export { submitDraftFromRequest };
